"""
Celery tasks for cleanup and maintenance
Phase 10.3: Queue Infrastructure
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any

from celery import shared_task
from sqlalchemy.orm import Session

from ..models.database import (
    Extraction, DocumentExtractionTracking, ExtractionJob, SessionLocal
)

logger = logging.getLogger(__name__)


@shared_task
def cleanup_old_extractions(max_age_days: int = 30) -> Dict[str, Any]:
    """
    Clean up old completed extractions to free up space
    
    Args:
        max_age_days: Maximum age in days for extractions to keep
        
    Returns:
        Cleanup statistics
    """
    db = SessionLocal()
    
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=max_age_days)
        
        # Find old completed extractions
        old_extractions = db.query(Extraction).filter(
            Extraction.status == 'completed',
            Extraction.created_at < cutoff_date
        ).all()
        
        cleanup_count = 0
        for extraction in old_extractions:
            # Archive or delete the extraction
            # For now, we'll just mark them as archived
            extraction.status = 'archived'
            cleanup_count += 1
        
        db.commit()
        
        logger.info(f"Archived {cleanup_count} old extractions")
        
        return {
            "status": "completed",
            "archived_count": cleanup_count,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Cleanup failed: {str(e)}")
        return {"status": "failed", "error": str(e)}
        
    finally:
        db.close()


@shared_task
def cleanup_failed_extractions(max_age_hours: int = 24) -> Dict[str, Any]:
    """
    Reset old failed extractions for retry
    
    Args:
        max_age_hours: Maximum age in hours for failed extractions
        
    Returns:
        Reset statistics
    """
    db = SessionLocal()
    
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
        
        # Find old failed extraction tracking records
        failed_tracking = db.query(DocumentExtractionTracking).filter(
            DocumentExtractionTracking.status == 'failed',
            DocumentExtractionTracking.created_at < cutoff_date,
            DocumentExtractionTracking.retry_count < 3  # Only reset if retry count is low
        ).all()
        
        reset_count = 0
        for tracking in failed_tracking:
            # Reset to pending for retry
            tracking.status = 'pending'
            tracking.error_message = None
            tracking.retry_count += 1
            tracking.started_at = None
            tracking.completed_at = None
            reset_count += 1
        
        db.commit()
        
        logger.info(f"Reset {reset_count} failed extractions for retry")
        
        return {
            "status": "completed",
            "reset_count": reset_count,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed extraction cleanup failed: {str(e)}")
        return {"status": "failed", "error": str(e)}
        
    finally:
        db.close()


@shared_task
def cleanup_orphaned_tracking() -> Dict[str, Any]:
    """
    Clean up orphaned tracking records that have no corresponding extraction or job
    
    Returns:
        Cleanup statistics
    """
    db = SessionLocal()
    
    try:
        # Find tracking records with no corresponding extraction
        orphaned_tracking = db.query(DocumentExtractionTracking).filter(
            ~DocumentExtractionTracking.extraction_id.is_(None),
            ~db.query(Extraction).filter(
                Extraction.id == DocumentExtractionTracking.extraction_id
            ).exists()
        ).all()
        
        cleanup_count = len(orphaned_tracking)
        
        for tracking in orphaned_tracking:
            db.delete(tracking)
        
        db.commit()
        
        logger.info(f"Cleaned up {cleanup_count} orphaned tracking records")
        
        return {
            "status": "completed",
            "cleaned_count": cleanup_count
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Orphaned tracking cleanup failed: {str(e)}")
        return {"status": "failed", "error": str(e)}
        
    finally:
        db.close()
