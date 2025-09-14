"""
Celery tasks for analytics and reporting
Phase 10.3: Queue Infrastructure
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any

from celery import shared_task
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models.database import (
    ExtractionJob, DocumentExtractionTracking, Extraction, Document,
    Tenant, SessionLocal
)

logger = logging.getLogger(__name__)


@shared_task
def generate_daily_analytics() -> Dict[str, Any]:
    """
    Generate daily analytics for all tenants
    
    Returns:
        Analytics generation statistics
    """
    db = SessionLocal()
    
    try:
        today = datetime.now(timezone.utc).date()
        yesterday = today - timedelta(days=1)
        
        tenants_processed = 0
        
        # Get all active tenants
        tenants = db.query(Tenant).filter(Tenant.status == 'active').all()
        
        for tenant in tenants:
            # Generate analytics for this tenant
            analytics = generate_tenant_analytics(db, tenant.id, yesterday)
            
            # In a real implementation, you would store these analytics
            # For now, we'll just log them
            logger.info(f"Generated analytics for tenant {tenant.id}: {analytics}")
            tenants_processed += 1
        
        return {
            "status": "completed",
            "tenants_processed": tenants_processed,
            "date": yesterday.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Daily analytics generation failed: {str(e)}")
        return {"status": "failed", "error": str(e)}
        
    finally:
        db.close()


def generate_tenant_analytics(db: Session, tenant_id: str, date: datetime.date) -> Dict[str, Any]:
    """Generate analytics for a specific tenant and date"""
    
    # Job statistics
    job_stats = db.query(
        func.count(ExtractionJob.id).label('total_jobs'),
        func.count(func.case([(ExtractionJob.is_active == True, 1)])).label('active_jobs')
    ).filter(ExtractionJob.tenant_id == tenant_id).first()
    
    # Extraction statistics for the date
    extraction_stats = db.query(
        func.count(DocumentExtractionTracking.id).label('total_extractions'),
        func.count(func.case([(DocumentExtractionTracking.status == 'completed', 1)])).label('completed'),
        func.count(func.case([(DocumentExtractionTracking.status == 'failed', 1)])).label('failed'),
        func.avg(DocumentExtractionTracking.processing_time_ms).label('avg_processing_time')
    ).join(ExtractionJob).filter(
        ExtractionJob.tenant_id == tenant_id,
        func.date(DocumentExtractionTracking.created_at) == date
    ).first()
    
    # Document statistics
    doc_stats = db.query(
        func.count(Document.id).label('total_documents')
    ).filter(
        Document.tenant_id == tenant_id,
        func.date(Document.created_at) == date
    ).first()
    
    return {
        "tenant_id": str(tenant_id),
        "date": date.isoformat(),
        "jobs": {
            "total": job_stats.total_jobs or 0,
            "active": job_stats.active_jobs or 0
        },
        "extractions": {
            "total": extraction_stats.total_extractions or 0,
            "completed": extraction_stats.completed or 0,
            "failed": extraction_stats.failed or 0,
            "success_rate": (extraction_stats.completed / extraction_stats.total_extractions * 100) 
                          if extraction_stats.total_extractions else 0,
            "avg_processing_time_ms": int(extraction_stats.avg_processing_time) 
                                    if extraction_stats.avg_processing_time else 0
        },
        "documents": {
            "uploaded": doc_stats.total_documents or 0
        }
    }


@shared_task
def generate_analytics(tenant_id: str, date_from: str, date_to: str) -> Dict[str, Any]:
    """
    Generate analytics for a specific tenant and date range
    
    Args:
        tenant_id: Tenant identifier
        date_from: Start date (YYYY-MM-DD)
        date_to: End date (YYYY-MM-DD)
        
    Returns:
        Analytics data
    """
    db = SessionLocal()
    
    try:
        from_date = datetime.fromisoformat(date_from).date()
        to_date = datetime.fromisoformat(date_to).date()
        
        analytics = []
        current_date = from_date
        
        while current_date <= to_date:
            daily_analytics = generate_tenant_analytics(db, tenant_id, current_date)
            analytics.append(daily_analytics)
            current_date += timedelta(days=1)
        
        return {
            "status": "completed",
            "analytics": analytics,
            "tenant_id": tenant_id,
            "date_range": f"{date_from} to {date_to}"
        }
        
    except Exception as e:
        logger.error(f"Analytics generation failed: {str(e)}")
        return {"status": "failed", "error": str(e)}
        
    finally:
        db.close()
