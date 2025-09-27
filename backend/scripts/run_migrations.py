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
    migrations_dir = Path("/app/database/migrations")
    
    if not migrations_dir.exists():
        logger.error(f"Migrations directory not found: {migrations_dir}")
        sys.exit(1)
    
    # Get all SQL files and sort them by their numeric prefix
    migration_files = []
    for file_path in migrations_dir.glob("*.sql"):
        filename = file_path.name
        
        # Extract numeric prefix for sorting
        parts = filename.split('_', 1)
        if parts[0].isdigit():
            migration_num = int(parts[0])
            migration_files.append((migration_num, filename, str(file_path)))
        else:
            # Handle files like "001a_", "001b_" etc.
            num_part = ''.join(filter(str.isdigit, parts[0]))
            alpha_part = ''.join(filter(str.isalpha, parts[0]))
            if num_part:
                migration_num = int(num_part)
                if alpha_part:
                    migration_num += ord(alpha_part.lower()) * 0.01  # Handle a, b, c suffixes
                migration_files.append((migration_num, filename, str(file_path)))
    
    # Sort by migration number
    migration_files.sort(key=lambda x: x[0])
    
    logger.info(f"Found {len(migration_files)} migration files:")
    for num, filename, path in migration_files:
        logger.info(f"  {num:6.2f}: {filename}")
    
    return [(filename, path) for _, filename, path in migration_files]

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

def run_migration(migration_file: str, migration_path: str) -> bool:
    """
    Run a single migration file.
    """
    database_url = os.getenv('DATABASE_URL')
    
    logger.info(f"🔄 Running migration: {migration_file}")
    
    try:
        # Run the migration
        result = subprocess.run([
            'psql', database_url, '-f', migration_path
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
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
    
    # Get migration files in correct order
    migration_files = get_migration_files()
    
    if not migration_files:
        logger.error("No migration files found")
        sys.exit(1)
    
    # Run migrations
    failed_migrations = []
    
    for filename, migration_path in migration_files:
        if not run_migration(filename, migration_path):
            failed_migrations.append(filename)
    
    # Report results
    logger.info("=" * 60)
    logger.info("📊 MIGRATION RESULTS")
    logger.info("=" * 60)
    
    successful = len(migration_files) - len(failed_migrations)
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
