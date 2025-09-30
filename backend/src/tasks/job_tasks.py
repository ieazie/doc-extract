"""
Celery tasks for extraction job management
Phase 10.3: Queue Infrastructure
"""
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from uuid import UUID

from celery import shared_task, group, chain
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models.database import (
    ExtractionJob, DocumentExtractionTracking, Document, Extraction,
    Template, DocumentCategory, SessionLocal
)
from ..services.extraction_service import ExtractionService, ExtractionRequest
from .document_tasks import process_document_extraction

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def queue_job_execution(self, job_id: str) -> Dict[str, Any]:
    """
    Queue an extraction job for execution
    
    Args:
        job_id: Extraction job identifier
        
    Returns:
        Execution status and statistics
    """
    db = SessionLocal()
    
    try:
        logger.info(f"Starting job execution for job {job_id}")
        
        # Get the job
        job = db.query(ExtractionJob).filter(ExtractionJob.id == uuid.UUID(job_id)).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return {"status": "failed", "error": "Job not found"}
        
        if not job.is_active:
            logger.warning(f"Job {job_id} is not active")
            return {"status": "skipped", "error": "Job is not active"}
        
        # Find documents to process
        # Exclude documents already processed by this job
        processed_by_this_job = db.query(DocumentExtractionTracking.document_id).filter(
            DocumentExtractionTracking.job_id == job.id,
            DocumentExtractionTracking.status.in_(['completed', 'processing'])
        ).subquery()
        
        # Exclude documents that already have extractions with this template
        docs_with_existing_extractions = db.query(Extraction.document_id).filter(
            Extraction.template_id == job.template_id,
            Extraction.status.in_(['completed', 'processing'])
        ).subquery()
        
        documents = db.query(Document).filter(
            Document.category_id == job.category_id,
            Document.tenant_id == job.tenant_id,
            Document.raw_content.isnot(None),  # Only documents with extracted text
            ~Document.id.in_(processed_by_this_job),  # Not processed by this job
            ~Document.id.in_(docs_with_existing_extractions)  # Not already extracted with this template
        ).all()
        
        # Log document selection details
        total_docs_in_category = db.query(Document).filter(
            Document.category_id == job.category_id,
            Document.tenant_id == job.tenant_id,
            Document.raw_content.isnot(None)
        ).count()
        
        docs_already_extracted = db.query(Extraction.document_id).filter(
            Extraction.template_id == job.template_id,
            Extraction.status.in_(['completed', 'processing'])
        ).count()
        
        logger.info(f"Job {job_id} document selection: {total_docs_in_category} total docs, "
                   f"{docs_already_extracted} already extracted, {len(documents)} new docs to process")
        
        if not documents:
            logger.info(f"No new documents to process for job {job_id} - all documents already extracted")
            return {"status": "completed", "documents_processed": 0}
        
        # Create tracking records and queue extractions
        documents_processed = 0
        extraction_tasks = []
        
        for document in documents:
            # Create tracking record
            tracking = DocumentExtractionTracking(
                document_id=document.id,
                job_id=job.id,
                status='pending',
                triggered_by='schedule'
            )
            db.add(tracking)
            db.flush()  # Get the ID
            
            # Create extraction record
            extraction = Extraction(
                tenant_id=job.tenant_id,
                document_id=document.id,
                template_id=job.template_id,
                status='pending'
            )
            db.add(extraction)
            db.flush()  # Get the ID
            
            # Update tracking with extraction ID
            tracking.extraction_id = extraction.id
            
            # Queue the extraction task
            task = process_document_extraction.delay(
                str(extraction.id),
                document.raw_content,
                job.template.schema,
                job.template.prompt_config,
                str(job.tenant_id),
                str(tracking.id)
            )
            extraction_tasks.append(task.id)
            documents_processed += 1
        
        # Update job statistics
        job.total_executions += 1
        job.last_run_at = datetime.now(timezone.utc)
        
        # Calculate next run time for recurring jobs
        if job.schedule_type == 'recurring':
            job.next_run_at = calculate_next_run_time(job.schedule_config)
        
        db.commit()
        
        # Schedule a task to update job statistics after all extractions complete
        # This will run after a reasonable delay to allow extractions to complete
        update_job_statistics.apply_async(
            args=[str(job.id)],
            countdown=300  # 5 minutes delay
        )
        
        logger.info(f"Job execution completed for job {job_id}, processed {documents_processed} documents")
        
        return {
            "status": "completed",
            "documents_processed": documents_processed,
            "next_run_at": job.next_run_at,
            "task_ids": extraction_tasks
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Job execution failed for job {job_id}: {str(e)}")
        
        # Retry if within limits
        if self.request.retries < 3:
            retry_delay = 60 * (2 ** self.request.retries)  # Exponential backoff
            raise self.retry(countdown=retry_delay)
        
        return {"status": "failed", "error": str(e)}
        
    finally:
        db.close()


@shared_task
def execute_job_immediate(job_id: str, triggered_by: str = 'manual') -> Dict[str, Any]:
    """
    Execute a job immediately with high priority
    
    Args:
        job_id: Extraction job identifier
        triggered_by: How the job was triggered ('manual', 'immediate')
        
    Returns:
        Execution status and statistics
    """
    # Queue the job execution and return the task ID
    task = queue_job_execution.delay(job_id)
    return {
        "status": "queued",
        "task_id": task.id,
        "message": "Job execution queued successfully"
    }


@shared_task
def schedule_recurring_jobs() -> Dict[str, Any]:
    """
    Celery Beat task to schedule recurring jobs
    This runs every minute to check for jobs that need to be scheduled
    Enhanced with proper cron parsing and next run time calculation
    """
    db = SessionLocal()
    
    try:
        now = datetime.now(timezone.utc)
        jobs_scheduled = 0
        jobs_updated = 0
        
        # Find jobs that need to be scheduled
        jobs = db.query(ExtractionJob).filter(
            ExtractionJob.is_active == True,
            ExtractionJob.schedule_type == 'recurring',
            ExtractionJob.next_run_at <= now
        ).all()
        
        for job in jobs:
            try:
                # Queue the job execution
                queue_job_execution.delay(str(job.id))
                jobs_scheduled += 1
                
                # Update last run time and calculate next run time
                job.last_run_at = now
                
                # Calculate next run time using the scheduling service
                if job.schedule_config and job.schedule_config.get('cron'):
                    from ..services.scheduling_service import SchedulingService
                    scheduling_service = SchedulingService(db)
                    
                    next_run = scheduling_service.calculate_next_run_time(
                        cron_expr=job.schedule_config['cron'],
                        timezone_str=job.schedule_config.get('timezone', 'UTC'),
                        current_time=now
                    )
                    
                    if next_run:
                        job.next_run_at = next_run
                        jobs_updated += 1
                        logger.info(f"Updated next run time for job {job.id} to {next_run}")
                    else:
                        logger.warning(f"Could not calculate next run time for job {job.id}")
                        # Fallback: set next run to 24 hours from now
                        job.next_run_at = now + timedelta(hours=24)
                else:
                    logger.warning(f"Job {job.id} has no valid cron configuration")
                    job.next_run_at = now + timedelta(hours=24)
                
                logger.info(f"Scheduled recurring job {job.id} for execution")
                
            except Exception as job_error:
                logger.error(f"Error processing job {job.id}: {str(job_error)}")
                continue
        
        # Commit all changes
        db.commit()
        
        return {
            "status": "completed",
            "jobs_scheduled": jobs_scheduled,
            "jobs_updated": jobs_updated,
            "checked_at": now.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to schedule recurring jobs: {str(e)}")
        db.rollback()
        return {"status": "failed", "error": str(e)}
        
    finally:
        db.close()


@shared_task
def process_scheduled_jobs() -> Dict[str, Any]:
    """
    Process scheduled (one-time) jobs that are ready to run
    """
    db = SessionLocal()
    
    try:
        now = datetime.now(timezone.utc)
        jobs_processed = 0
        
        # Find scheduled jobs that are ready to run
        jobs = db.query(ExtractionJob).filter(
            ExtractionJob.is_active == True,
            ExtractionJob.schedule_type == 'scheduled',
            ExtractionJob.run_at <= now,
            ExtractionJob.last_run_at.is_(None)  # Only jobs that haven't run yet
        ).all()
        
        for job in jobs:
            try:
                # Queue the job execution
                queue_job_execution.delay(str(job.id))
                jobs_processed += 1
                
                # Mark as executed
                job.last_run_at = now
                job.is_active = False  # One-time scheduled jobs become inactive after execution
                
                logger.info(f"Processed scheduled job {job.id}")
                
            except Exception as job_error:
                logger.error(f"Error processing scheduled job {job.id}: {str(job_error)}")
                continue
        
        # Commit all changes
        db.commit()
        
        return {
            "status": "completed",
            "jobs_processed": jobs_processed,
            "checked_at": now.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to process scheduled jobs: {str(e)}")
        db.rollback()
        return {"status": "failed", "error": str(e)}
        
    finally:
        db.close()


@shared_task(bind=True, max_retries=3)
def process_document_extraction(
    self,
    extraction_id: str,
    document_text: str,
    template_schema: dict,
    prompt_config: dict,
    tenant_id: str,
    tracking_id: str
) -> Dict[str, Any]:
    """
    Process a single document extraction as part of a job
    
    Args:
        extraction_id: Extraction record ID
        document_text: Document text content
        template_schema: Template schema for extraction
        prompt_config: Prompt configuration
        tenant_id: Tenant ID for context
        tracking_id: Tracking record ID
        
    Returns:
        Extraction result and status
    """
    db = SessionLocal()
    
    try:
        logger.info(f"Processing document extraction {extraction_id}")
        
        # Update tracking status
        tracking = db.query(DocumentExtractionTracking).filter(
            DocumentExtractionTracking.id == uuid.UUID(tracking_id)
        ).first()
        
        if not tracking:
            logger.error(f"Tracking record {tracking_id} not found")
            return {"status": "failed", "error": "Tracking record not found"}
        
        tracking.status = 'processing'
        tracking.started_at = datetime.now(timezone.utc)
        db.commit()
        
        # Get extraction record
        extraction = db.query(Extraction).filter(
            Extraction.id == uuid.UUID(extraction_id)
        ).first()
        
        if not extraction:
            tracking.status = 'failed'
            tracking.error_message = "Extraction record not found"
            tracking.completed_at = datetime.now(timezone.utc)
            db.commit()
            return {"status": "failed", "error": "Extraction record not found"}
        
        # Create extraction service
        extraction_service = ExtractionService(db)
        
        # Create extraction request
        extraction_request = ExtractionRequest(
            document_text=document_text,
            schema=template_schema,
            prompt_config=prompt_config,
            tenant_id=uuid.UUID(tenant_id)
        )
        
        # Perform extraction
        import asyncio
        result = asyncio.run(extraction_service.extract_data(extraction_request))
        
        # Update extraction record
        if result.status == "success":
            extraction.status = "completed"
            extraction.results = result.extracted_data
            extraction.confidence_scores = {"overall": result.confidence_score}
            extraction.processing_time = result.processing_time_ms
            extraction.error_message = None
            
            # Update tracking
            tracking.status = 'completed'
            tracking.completed_at = datetime.now(timezone.utc)
            tracking.processing_time_ms = result.processing_time_ms
            tracking.error_message = None
        else:
            extraction.status = "failed"
            extraction.error_message = result.error_message
            extraction.processing_time = result.processing_time_ms
            
            # Update tracking
            tracking.status = 'failed'
            tracking.completed_at = datetime.now(timezone.utc)
            tracking.processing_time_ms = result.processing_time_ms
            tracking.error_message = result.error_message
        
        db.commit()
        
        logger.info(f"Document extraction {extraction_id} completed with status: {extraction.status}")
        
        return {
            "status": extraction.status,
            "extraction_id": extraction_id,
            "processing_time_ms": result.processing_time_ms,
            "confidence_score": result.confidence_score if result.status == "success" else None,
            "error_message": result.error_message if result.status == "error" else None
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Document extraction failed for {extraction_id}: {str(e)}")
        
        # Update tracking with error
        try:
            tracking = db.query(DocumentExtractionTracking).filter(
                DocumentExtractionTracking.id == uuid.UUID(tracking_id)
            ).first()
            if tracking:
                tracking.status = 'failed'
                tracking.error_message = str(e)
                tracking.completed_at = datetime.now(timezone.utc)
                db.commit()
        except:
            pass
        
        # Retry if within limits
        if self.request.retries < 3:
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(countdown=retry_delay)
        
        return {"status": "failed", "error": str(e)}
        
    finally:
        db.close()


@shared_task
def update_job_statistics(job_id: str) -> Dict[str, Any]:
    """
    Update job statistics based on tracking record results
    This task runs after job execution to aggregate results
    """
    db = SessionLocal()
    
    try:
        job = db.query(ExtractionJob).filter(ExtractionJob.id == uuid.UUID(job_id)).first()
        
        if not job:
            logger.error(f"Job {job_id} not found for statistics update")
            return {"status": "failed", "error": "Job not found"}
        
        # Count tracking records by status for this job
        status_counts = db.query(
            DocumentExtractionTracking.status,
            func.count(DocumentExtractionTracking.id).label('count')
        ).filter(
            DocumentExtractionTracking.job_id == job.id
        ).group_by(DocumentExtractionTracking.status).all()
        
        # Update job statistics
        successful_count = 0
        failed_count = 0
        
        for status, count in status_counts:
            if status == 'completed':
                successful_count = count
            elif status == 'failed':
                failed_count = count
        
        # Update job with aggregated statistics
        job.successful_executions = successful_count
        job.failed_executions = failed_count
        
        db.commit()
        
        logger.info(f"Updated job {job_id} statistics: {successful_count} successful, {failed_count} failed")
        
        return {
            "status": "completed",
            "job_id": job_id,
            "successful_executions": successful_count,
            "failed_executions": failed_count
        }
        
    except Exception as e:
        logger.error(f"Failed to update job statistics for {job_id}: {str(e)}")
        return {"status": "failed", "error": str(e)}
        
    finally:
        db.close()


def calculate_next_run_time(schedule_config: dict, current_time: datetime = None) -> Optional[datetime]:
    """Calculate next run time for recurring jobs using proper cron parsing"""
    if not schedule_config or 'cron' not in schedule_config:
        return None
    
    try:
        from ..services.scheduling_service import SchedulingService
        
        # Create a temporary database session for the scheduling service
        db = SessionLocal()
        try:
            scheduling_service = SchedulingService(db)
            
            # Get timezone from schedule config or default to UTC
            timezone_str = schedule_config.get('timezone', 'UTC')
            
            # Calculate next run time
            return scheduling_service.calculate_next_run_time(
                cron_expr=schedule_config['cron'],
                timezone_str=timezone_str,
                current_time=current_time
            )
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error calculating next run time: {e}")
        # Fallback to simple calculation
        if current_time is None:
            current_time = datetime.now(timezone.utc)
        
        next_run = current_time.replace(hour=9, minute=0, second=0, microsecond=0)
        if next_run <= current_time:
            next_run += timedelta(days=1)
        
        return next_run
