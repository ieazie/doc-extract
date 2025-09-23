#!/usr/bin/env python3
"""
Cleanup job for expired refresh tokens

This job should be run periodically (e.g., daily via cron) to clean up expired tokens
and maintain database performance.

Usage:
    python cleanup_expired_tokens.py
    
Cron Example:
    0 2 * * * cd /app && python cleanup_expired_tokens.py >> /var/log/cleanup_tokens.log 2>&1
"""
import sys
import os

# Add the backend src directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'src')))

from services.auth_service import AuthService
from models.database import SessionLocal

def cleanup_expired_tokens():
    """Clean up expired refresh tokens"""
    print("🧹 Starting expired token cleanup job...")
    
    db = SessionLocal()
    auth_service = AuthService()
    
    try:
        deleted_count = auth_service.cleanup_expired_tokens(db)
        print(f"✅ Cleanup job completed successfully. Deleted {deleted_count} expired tokens")
        return deleted_count
    except Exception as e:
        print(f"❌ Cleanup job failed: {e}")
        return -1
    finally:
        db.close()

if __name__ == "__main__":
    result = cleanup_expired_tokens()
    sys.exit(0 if result >= 0 else 1)