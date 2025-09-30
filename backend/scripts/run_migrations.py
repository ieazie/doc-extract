#!/usr/bin/env python3
"""
Migration Runner for Document Extraction Platform

This script runs database migrations in the correct order.
It's designed to be used in Docker containers and CI/CD pipelines.
"""

import os
import sys
import time
import subprocess
import logging
from pathlib import Path
from typing import List, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_migration_files() -> List[Tuple[str, str]]:
    """
    Get migration files in the correct order.
    Returns list of (filename, full_path) tuples sorted by migration number.
    """
    # Use absolute path to avoid issues with __file__ resolution in Docker
    # Since we mount ./backend:/app, migrations are in /app/database/migrations
    migrations_dir = Path("/app/database/migrations")
    
    if not migrations_dir.exists():
        logger.error(f"Migrations directory not found: {migrations_dir}")
        sys.exit(1)
    
    # Collect files and sort by (numeric prefix, letter suffix)
    migration_files = []
    for file_path in migrations_dir.glob("*.sql"):
        filename = file_path.name
        prefix = file_path.stem.split('_', 1)[0]
        num_part = ''.join(filter(str.isdigit, prefix)) or "0"
        alpha_part = ''.join(filter(str.isalpha, prefix)).lower()
        migration_files.append((int(num_part), alpha_part, filename, str(file_path)))

    # Sort by tuple (number, suffix)
    migration_files.sort(key=lambda x: (x[0], x[1]))

    logger.info(f"Found {len(migration_files)} migration files:")
    for num, _, filename, path in migration_files:
        logger.info(f"  {num:04d}: {filename}")
    return [(filename, path) for _, _, filename, path in migration_files]

def wait_for_database(max_retries: int = 30, delay: int = 2) -> bool:
    """
    Wait for the database to be ready.
    """
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        return False
    
    logger.info("Waiting for database to be ready...")
    
    for attempt in range(max_retries):
        try:
            # Test database connection
            result = subprocess.run([
                'psql', database_url, '-c', 'SELECT 1;'
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                logger.info("✅ Database is ready!")
                return True
            else:
                logger.warning(f"Database not ready (attempt {attempt + 1}/{max_retries}): {result.stderr.strip()}")
                
        except subprocess.TimeoutExpired:
            logger.warning(f"Database connection timeout (attempt {attempt + 1}/{max_retries})")
        except Exception as e:
            logger.warning(f"Database connection failed (attempt {attempt + 1}/{max_retries}): {e}")
        
        if attempt < max_retries - 1:
            time.sleep(delay)
    
    logger.error("❌ Database is not ready after maximum retries")
    return False

def create_migration_tracking_table(database_url: str) -> bool:
    """
    Create the schema_migrations table if it doesn't exist.
    """
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
    );
    """
    
    try:
        result = subprocess.run([
            'psql', database_url, '-v', 'ON_ERROR_STOP=1', '-c', create_table_sql
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            logger.debug("✅ Migration tracking table ready")
            return True
        else:
            logger.error(f"❌ Failed to create migration tracking table: {result.stderr}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error creating migration tracking table: {e}")
        return False

def get_applied_migrations(database_url: str) -> set:
    """
    Get the set of already applied migration filenames.
    """
    try:
        result = subprocess.run([
            'psql', database_url, '-t', '-c', 'SELECT filename FROM schema_migrations;'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            applied_migrations = set()
            for line in result.stdout.strip().split('\n'):
                if line.strip():
                    applied_migrations.add(line.strip())
            logger.debug(f"Found {len(applied_migrations)} already applied migrations")
            return applied_migrations
        else:
            logger.warning(f"Could not query applied migrations: {result.stderr}")
            return set()
            
    except Exception as e:
        logger.warning(f"Error querying applied migrations: {e}")
        return set()

def mark_migration_applied(database_url: str, filename: str) -> bool:
    """
    Mark a migration as applied in the tracking table.
    """
    # Escape single quotes to prevent SQL injection via crafted filenames
    safe_filename = filename.replace("'", "''")
    insert_sql = f"INSERT INTO schema_migrations (filename) VALUES ('{safe_filename}');"
    
    try:
        result = subprocess.run([
            'psql', database_url, '-v', 'ON_ERROR_STOP=1', '-c', insert_sql
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            logger.debug(f"✅ Marked {filename} as applied")
            return True
        else:
            logger.error(f"❌ Failed to mark {filename} as applied: {result.stderr}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error marking {filename} as applied: {e}")
        return False

def run_migration(migration_file: str, migration_path: str) -> bool:
    """
    Run a single migration file with state tracking.
    """
    database_url = os.getenv('DATABASE_URL')
    
    logger.info(f"🔄 Running migration: {migration_file}")
    
    try:
        # Run the migration atomically with fail-fast behavior
        # We'll handle state tracking in a separate transaction to avoid conflicts
        result = subprocess.run([
            'psql', database_url, '-v', 'ON_ERROR_STOP=1', '-1', '-f', migration_path
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            # Mark migration as applied only after successful completion
            if not mark_migration_applied(database_url, migration_file):
                logger.error(f"❌ Migration succeeded but failed to mark as applied: {migration_file}")
                return False
            logger.info(f"✅ Migration completed: {migration_file}")
            return True
        else:
            logger.error(f"❌ Migration failed: {migration_file}")
            logger.error(f"Error output: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        logger.error(f"❌ Migration timeout: {migration_file}")
        return False
    except Exception as e:
        logger.error(f"❌ Migration error: {migration_file} - {e}")
        return False

def main():
    """
    Main function to run all migrations.
    """
    logger.info("🚀 Starting database migrations...")
    
    # Check environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        sys.exit(1)
    
    logger.info(f"Database URL: {database_url.split('@')[1] if '@' in database_url else 'configured'}")
    
    # Wait for database to be ready
    if not wait_for_database():
        logger.error("Failed to connect to database")
        sys.exit(1)
    
    # Create migration tracking table
    if not create_migration_tracking_table(database_url):
        logger.error("Failed to create migration tracking table")
        sys.exit(1)
    
    # Get already applied migrations
    applied_migrations = get_applied_migrations(database_url)
    
    # Get migration files in correct order
    migration_files = get_migration_files()
    
    if not migration_files:
        logger.error("No migration files found")
        sys.exit(1)
    
    # Filter out already applied migrations
    pending_migrations = []
    for filename, migration_path in migration_files:
        if filename in applied_migrations:
            logger.info(f"⏭️ Skipping already applied migration: {filename}")
        else:
            pending_migrations.append((filename, migration_path))
    
    if not pending_migrations:
        logger.info("🎉 All migrations already applied!")
        return
    
    logger.info(f"📋 Found {len(pending_migrations)} pending migrations out of {len(migration_files)} total")
    
    # Run pending migrations
    failed_migrations = []
    
    for filename, migration_path in pending_migrations:
        if not run_migration(filename, migration_path):
            failed_migrations.append(filename)
    
    # Report results
    logger.info("=" * 60)
    logger.info("📊 MIGRATION RESULTS")
    logger.info("=" * 60)
    
    already_applied = len(migration_files) - len(pending_migrations)
    successful = len(pending_migrations) - len(failed_migrations)
    
    logger.info(f"⏭️ Already applied migrations: {already_applied}")
    logger.info(f"✅ Successful migrations: {successful}")
    logger.info(f"❌ Failed migrations: {len(failed_migrations)}")
    logger.info(f"📊 Total migrations: {len(migration_files)}")
    
    if failed_migrations:
        logger.error("\n💥 FAILED MIGRATIONS:")
        for migration in failed_migrations:
            logger.error(f"  - {migration}")
        sys.exit(1)
    else:
        logger.info("\n🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!")
        
        # Verify final schema
        logger.info("\n🔍 Verifying final schema...")
        try:
            result = subprocess.run([
                'psql', database_url, '-c', '\dt'
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                table_count = len([line for line in result.stdout.split('\n') if '| table |' in line])
                logger.info(f"✅ Schema verified: {table_count} tables created")
            else:
                logger.warning("Could not verify schema")
                
        except Exception as e:
            logger.warning(f"Schema verification failed: {e}")
        
        logger.info("\n🎯 MIGRATION PROCESS COMPLETED!")

if __name__ == "__main__":
    main()
