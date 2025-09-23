#!/usr/bin/env python3
"""
Cleanup job for expired refresh tokens

This job should be run periodically (e.g., daily via cron) to clean up expired tokens
and maintain database performance.

Usage:
    python cleanup_expired_tokens.py
    
Environment Variables:
    DATABASE_URL: Database connection string (optional, uses default if not set)
    
Cron Example:
    0 2 * * * cd /app && python scripts/jobs/cleanup_expired_tokens.py >> /var/log/cleanup_tokens.log 2>&1
"""
import sys
import os
import logging
from pathlib import Path

# Add the backend src directory to Python path
backend_root = Path(__file__).parent.parent.parent
src_path = str(backend_root / 'src')
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from sqlalchemy.orm import Session
from models.database import SessionLocal
from services.auth_service import AuthService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def cleanup_expired_tokens():
    """Clean up expired refresh tokens"""
    db: Session = SessionLocal()
    auth_service = AuthService()
    
    try:
        logger.info("Starting expired token cleanup job...")
        
        # Clean up expired tokens
        deleted_count = auth_service.cleanup_expired_tokens(db)
        
        logger.info(f"Cleanup job completed successfully. Deleted {deleted_count} expired tokens")
        return deleted_count
        
    except Exception as e:
        logger.error(f"Cleanup job failed: {e}")
        return -1
    finally:
        db.close()

if __name__ == "__main__":
    print("🧹 Starting expired token cleanup job...")
    
    deleted_count = cleanup_expired_tokens()
    
    if deleted_count >= 0:
        print(f"✅ Cleanup job completed successfully. Deleted {deleted_count} expired tokens")
        sys.exit(0)
    else:
        print("❌ Cleanup job failed")
        sys.exit(1)