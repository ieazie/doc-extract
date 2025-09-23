#!/usr/bin/env python3
"""
Cleanup service for expired refresh tokens
Run this periodically (e.g., via cron job) to clean up expired tokens
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from sqlalchemy.orm import Session
from src.models.database import SessionLocal
from src.services.auth_service import AuthService
import logging

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
        logger.info("Starting expired token cleanup...")
        
        # Clean up expired tokens
        deleted_count = auth_service.cleanup_expired_tokens(db)
        
        logger.info(f"Cleanup completed. Deleted {deleted_count} expired tokens")
        return deleted_count
        
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")
        return -1
    finally:
        db.close()

if __name__ == "__main__":
    print("🧹 Starting expired token cleanup...")
    
    deleted_count = cleanup_expired_tokens()
    
    if deleted_count >= 0:
        print(f"✅ Cleanup completed. Deleted {deleted_count} expired tokens")
        sys.exit(0)
    else:
        print("❌ Cleanup failed")
        sys.exit(1)
