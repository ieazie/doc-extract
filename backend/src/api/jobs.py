"""
Extraction Jobs API endpoints
Phase 10.2: Backend API Core
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func

from ..models.database import (
    ExtractionJob, DocumentExtractionTracking, Document, Template, 
    DocumentCategory, User, SessionLocal
)
from ..schemas.jobs import (
    ExtractionJobCreate, ExtractionJobUpdate, ExtractionJobResponse,
    ExtractionJobListResponse, JobExecutionRequest, JobExecutionResponse,
    DocumentExtractionTrackingResponse, DocumentExtractionTrackingListResponse,
    JobStatistics, JobAnalytics, ScheduleType, TriggeredBy
)
from ..services.auth_service import require_permission, get_current_user
from ..tasks.job_tasks import queue_job_execution, execute_job_immediate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_db():
    """Database dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def calculate_next_run_time(schedule_config: dict, current_time: datetime = None, db: Session = None) -> Optional[datetime]:
    """Calculate next run time for recurring jobs using proper cron parsing"""
    if not schedule_config or 'cron' not in schedule_config:
        return None
    
    try:
        from ..services.scheduling_service import SchedulingService
        
        # Create scheduling service instance
        scheduling_service = SchedulingService(db)
        
        # Get timezone from schedule config or default to UTC
        timezone_str = schedule_config.get('timezone', 'UTC')
        
        # Calculate next run time
        return scheduling_service.calculate_next_run_time(
            cron_expr=schedule_config['cron'],
            timezone_str=timezone_str,
            current_time=current_time
        )
        
    except Exception as e:
        logger.error(f"Error calculating next run time: {e}")
        return None


# ============================================================================
# JOB MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/", response_model=ExtractionJobResponse, status_code=201)
async def create_extraction_job(
    job_data: ExtractionJobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("jobs:write"))
):
    """Create a new extraction job"""
    try:
        # Validate category belongs to tenant
        category = db.query(DocumentCategory).filter(
            DocumentCategory.id == job_data.category_id,
            DocumentCategory.tenant_id == current_user.tenant_id
        ).first()
        
        if not category:
            raise HTTPException(status_code=400, detail="Invalid category")
        
        # Validate template belongs to tenant
        template = db.query(Template).filter(
            Template.id == job_data.template_id,
            Template.tenant_id == current_user.tenant_id,
            Template.is_active == True
        ).first()
        
        if not template:
            raise HTTPException(status_code=400, detail="Invalid or inactive template")
        
        # Check for duplicate job name in tenant
        existing_job = db.query(ExtractionJob).filter(
            ExtractionJob.tenant_id == current_user.tenant_id,
            ExtractionJob.name == job_data.name
        ).first()
        
        if existing_job:
            raise HTTPException(status_code=400, detail="Job name already exists")
        
        # Calculate next run time for recurring jobs
        next_run_at = None
        if job_data.schedule_type == ScheduleType.RECURRING:
            next_run_at = calculate_next_run_time(job_data.schedule_config)
        elif job_data.schedule_type == ScheduleType.SCHEDULED:
            next_run_at = job_data.run_at
        
        # Create job
        job = ExtractionJob(
            tenant_id=current_user.tenant_id,
            name=job_data.name,
            description=job_data.description,
            category_id=job_data.category_id,
            template_id=job_data.template_id,
            schedule_type=job_data.schedule_type,
            schedule_config=job_data.schedule_config,
            run_at=job_data.run_at,
            priority=job_data.priority,
            max_concurrency=job_data.max_concurrency,
            retry_policy=job_data.retry_policy,
            is_active=job_data.is_active,
            next_run_at=next_run_at
        )
        
        db.add(job)
        db.commit()
        db.refresh(job)
        
        # If immediate, queue the job right away
        if job_data.schedule_type == ScheduleType.IMMEDIATE and job_data.is_active:
            execute_job_immediate.delay(str(job.id), 'immediate')
        
        logger.info(f"Created extraction job {job.id} for tenant {current_user.tenant_id}")
        
        return ExtractionJobResponse(
            **job.__dict__,
            category_name=category.name,
            template_name=template.name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create extraction job: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create job: {str(e)}")


@router.get("/", response_model=ExtractionJobListResponse)
async def list_extraction_jobs(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search in job name and description"),
    category_id: Optional[str] = Query(None, description="Filter by category"),
    template_id: Optional[str] = Query(None, description="Filter by template"),
    schedule_type: Optional[str] = Query(None, description="Filter by schedule type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("jobs:read"))
):
    """List tenant's extraction jobs with filtering and pagination"""
    try:
        # Base query
        query = db.query(ExtractionJob).filter(
            ExtractionJob.tenant_id == current_user.tenant_id
        )
        
        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    ExtractionJob.name.ilike(search_term),
                    ExtractionJob.description.ilike(search_term)
                )
            )
        
        if category_id:
            query = query.filter(ExtractionJob.category_id == category_id)
        
        if template_id:
            query = query.filter(ExtractionJob.template_id == template_id)
        
        if schedule_type:
            query = query.filter(ExtractionJob.schedule_type == schedule_type)
        
        if is_active is not None:
            query = query.filter(ExtractionJob.is_active == is_active)
        
        # Apply sorting
        if hasattr(ExtractionJob, sort_by):
            sort_column = getattr(ExtractionJob, sort_by)
            if sort_order.lower() == "desc":
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(sort_column)
        else:
            query = query.order_by(desc(ExtractionJob.created_at))
        
        # Get total count
        total = query.count()
        
        # Apply pagination with eager loading of relationships
        from sqlalchemy.orm import joinedload
        offset = (page - 1) * per_page
        jobs = query.options(
            joinedload(ExtractionJob.category),
            joinedload(ExtractionJob.template)
        ).offset(offset).limit(per_page).all()
        
        # Calculate pages
        pages = (total + per_page - 1) // per_page
        
        # Convert to response format with relationships
        job_responses = []
        for job in jobs:
            job_data = {
                'id': job.id,
                'tenant_id': job.tenant_id,
                'name': job.name,
                'description': job.description,
                'category_id': job.category_id,
                'template_id': job.template_id,
                'schedule_type': job.schedule_type,
                'schedule_config': job.schedule_config,
                'run_at': job.run_at,
                'priority': job.priority,
                'max_concurrency': job.max_concurrency,
                'retry_policy': job.retry_policy,
                'is_active': job.is_active,
                'last_run_at': job.last_run_at,
                'next_run_at': job.next_run_at,
                'total_executions': job.total_executions,
                'successful_executions': job.successful_executions,
                'failed_executions': job.failed_executions,
                'created_at': job.created_at,
                'updated_at': job.updated_at,
                'category': {
                    'id': job.category.id,
                    'name': job.category.name,
                    'color': job.category.color
                } if job.category else None,
                'template': {
                    'id': job.template.id,
                    'name': job.template.name,
                    'description': job.template.description
                } if job.template else None
            }
            job_responses.append(ExtractionJobResponse(**job_data))
        
        return ExtractionJobListResponse(
            jobs=job_responses,
            total=total,
            page=page,
            per_page=per_page,
            pages=pages
        )
        
    except Exception as e:
        logger.error(f"Failed to list extraction jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list jobs: {str(e)}")


@router.get("/{job_id}", response_model=ExtractionJobResponse)
async def get_extraction_job(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("jobs:read"))
):
    """Get job details and status"""
    try:
        job = db.query(ExtractionJob).filter(
            ExtractionJob.id == job_id,
            ExtractionJob.tenant_id == current_user.tenant_id
        ).first()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job_dict = job.__dict__.copy()
        job_dict['category_name'] = job.category.name if job.category else None
        job_dict['template_name'] = job.template.name if job.template else None
        
        return ExtractionJobResponse(**job_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get extraction job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get job: {str(e)}")


@router.put("/{job_id}", response_model=ExtractionJobResponse)
async def update_extraction_job(
    job_id: UUID,
    job_data: ExtractionJobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("jobs:write"))
):
    """Update job configuration"""
    try:
        job = db.query(ExtractionJob).filter(
            ExtractionJob.id == job_id,
            ExtractionJob.tenant_id == current_user.tenant_id
        ).first()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Update fields
        update_data = job_data.dict(exclude_unset=True)
        
        # Validate category if being updated
        if 'category_id' in update_data:
            category = db.query(DocumentCategory).filter(
                DocumentCategory.id == update_data['category_id'],
                DocumentCategory.tenant_id == current_user.tenant_id
            ).first()
            if not category:
                raise HTTPException(status_code=400, detail="Invalid category")
        
        # Validate template if being updated
        if 'template_id' in update_data:
            template = db.query(Template).filter(
                Template.id == update_data['template_id'],
                Template.tenant_id == current_user.tenant_id,
                Template.is_active == True
            ).first()
            if not template:
                raise HTTPException(status_code=400, detail="Invalid or inactive template")
        
        # Update job
        for field, value in update_data.items():
            setattr(job, field, value)
        
        # Recalculate next run time if schedule changed
        if 'schedule_type' in update_data or 'schedule_config' in update_data:
            if job.schedule_type == ScheduleType.RECURRING:
                job.next_run_at = calculate_next_run_time(job.schedule_config)
            elif job.schedule_type == ScheduleType.SCHEDULED:
                job.next_run_at = job.run_at
            else:
                job.next_run_at = None
        
        db.commit()
        db.refresh(job)
        
        job_dict = job.__dict__.copy()
        job_dict['category_name'] = job.category.name if job.category else None
        job_dict['template_name'] = job.template.name if job.template else None
        
        logger.info(f"Updated extraction job {job_id}")
        
        return ExtractionJobResponse(**job_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update extraction job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update job: {str(e)}")


@router.delete("/{job_id}")
async def delete_extraction_job(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("jobs:delete"))
):
    """Delete a job and cancel any scheduled executions"""
    try:
        job = db.query(ExtractionJob).filter(
            ExtractionJob.id == job_id,
            ExtractionJob.tenant_id == current_user.tenant_id
        ).first()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Cancel any pending tracking records
        pending_tracking = db.query(DocumentExtractionTracking).filter(
            DocumentExtractionTracking.job_id == job_id,
            DocumentExtractionTracking.status.in_(['pending', 'processing'])
        ).all()
        
        for tracking in pending_tracking:
            tracking.status = 'skipped'
            tracking.error_message = 'Job deleted'
            tracking.completed_at = datetime.now(timezone.utc)
        
        # Delete the job (cascade will handle related records)
        db.delete(job)
        db.commit()
        
        logger.info(f"Deleted extraction job {job_id}")
        
        return {"message": "Job deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete extraction job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete job: {str(e)}")


# ============================================================================
# JOB EXECUTION ENDPOINTS
# ============================================================================

@router.post("/{job_id}/execute", response_model=JobExecutionResponse)
async def execute_job_now(
    job_id: UUID,
    execution_request: JobExecutionRequest = JobExecutionRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("jobs:write"))
):
    """Execute job immediately (override schedule)"""
    try:
        job = db.query(ExtractionJob).filter(
            ExtractionJob.id == job_id,
            ExtractionJob.tenant_id == current_user.tenant_id
        ).first()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if not job.is_active:
            raise HTTPException(status_code=400, detail="Job is not active")
        
        # Find documents to process
        processed_documents = db.query(DocumentExtractionTracking.document_id).filter(
            DocumentExtractionTracking.job_id == job.id,
            DocumentExtractionTracking.status.in_(['completed', 'processing'])
        ).subquery()
        
        documents = db.query(Document).filter(
            Document.category_id == job.category_id,
            Document.tenant_id == job.tenant_id,
            Document.raw_content.isnot(None),
            ~Document.id.in_(processed_documents)
        ).all()
        
        if not documents:
            return JobExecutionResponse(
                job_id=job_id,
                execution_started=False,
                documents_queued=0,
                message="No new documents to process"
            )
        
        # Create tracking records for all documents
        documents_queued = 0
        for document in documents:
            tracking = DocumentExtractionTracking(
                document_id=document.id,
                job_id=job.id,
                status='pending',
                triggered_by=execution_request.triggered_by
            )
            db.add(tracking)
            documents_queued += 1
        
        # Update job statistics
        job.total_executions += 1
        job.last_run_at = datetime.now(timezone.utc)
        
        db.commit()
        
        # Queue the job execution using Celery
        task = execute_job_immediate.delay(str(job.id), execution_request.triggered_by)
        logger.info(f"Queued job execution for {job_id} with {documents_queued} documents, task_id: {task.id}")
        
        return JobExecutionResponse(
            job_id=job_id,
            execution_started=True,
            documents_queued=documents_queued,
            estimated_completion=datetime.now(timezone.utc),
            message=f"Job execution queued with {documents_queued} documents"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to execute job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to execute job: {str(e)}")


# ============================================================================
# JOB TRACKING AND ANALYTICS ENDPOINTS
# ============================================================================

@router.get("/{job_id}/history", response_model=DocumentExtractionTrackingListResponse)
async def get_job_history(
    job_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("jobs:read"))
):
    """Get job execution history and document processing status"""
    try:
        # Verify job belongs to tenant
        job = db.query(ExtractionJob).filter(
            ExtractionJob.id == job_id,
            ExtractionJob.tenant_id == current_user.tenant_id
        ).first()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Query tracking records
        query = db.query(DocumentExtractionTracking).filter(
            DocumentExtractionTracking.job_id == job_id
        )
        
        if status:
            query = query.filter(DocumentExtractionTracking.status == status)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and sorting
        offset = (page - 1) * per_page
        tracking_records = query.order_by(desc(DocumentExtractionTracking.created_at)).offset(offset).limit(per_page).all()
        
        # Calculate pages
        pages = (total + per_page - 1) // per_page
        
        # Build response
        tracking_responses = []
        for tracking in tracking_records:
            tracking_dict = tracking.__dict__.copy()
            tracking_dict['document_filename'] = tracking.document.original_filename if tracking.document else None
            tracking_dict['job_name'] = tracking.job.name if tracking.job else None
            tracking_responses.append(DocumentExtractionTrackingResponse(**tracking_dict))
        
        return DocumentExtractionTrackingListResponse(
            tracking=tracking_responses,
            total=total,
            page=page,
            per_page=per_page,
            pages=pages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job history for {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get job history: {str(e)}")


@router.get("/{job_id}/statistics", response_model=JobStatistics)
async def get_job_statistics(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("jobs:read"))
):
    """Get job performance statistics"""
    try:
        job = db.query(ExtractionJob).filter(
            ExtractionJob.id == job_id,
            ExtractionJob.tenant_id == current_user.tenant_id
        ).first()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Calculate statistics from tracking records
        stats_query = db.query(
            func.count(DocumentExtractionTracking.id).label('total'),
            func.count(func.case([(DocumentExtractionTracking.status == 'completed', 1)])).label('completed'),
            func.count(func.case([(DocumentExtractionTracking.status == 'failed', 1)])).label('failed'),
            func.avg(DocumentExtractionTracking.processing_time_ms).label('avg_time'),
            func.max(DocumentExtractionTracking.completed_at).label('last_execution')
        ).filter(DocumentExtractionTracking.job_id == job_id)
        
        stats = stats_query.first()
        
        success_rate = 0.0
        if stats.total > 0:
            success_rate = (stats.completed / stats.total) * 100
        
        return JobStatistics(
            total_executions=stats.total or 0,
            successful_executions=stats.completed or 0,
            failed_executions=stats.failed or 0,
            success_rate=success_rate,
            average_processing_time_ms=int(stats.avg_time) if stats.avg_time else None,
            last_execution=stats.last_execution,
            next_execution=job.next_run_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job statistics for {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get job statistics: {str(e)}")


# ============================================================================
# SCHEDULING & VALIDATION ENDPOINTS (Phase 10.6)
# ============================================================================

@router.post("/validate-cron")
async def validate_cron_expression(
    cron_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("jobs:read"))
):
    """Validate a cron expression and get scheduling information"""
    try:
        from ..services.scheduling_service import SchedulingService
        
        cron_expr = cron_data.get('cron')
        timezone = cron_data.get('timezone', 'UTC')
        
        if not cron_expr:
            raise HTTPException(status_code=400, detail="Cron expression is required")
        
        scheduling_service = SchedulingService(db)
        
        # Validate cron expression
        validation_result = scheduling_service.validate_cron_expression(cron_expr)
        
        if validation_result['valid']:
            # Add timezone-aware next run times
            timezone_result = scheduling_service.calculate_next_run_time(
                cron_expr=cron_expr,
                timezone_str=timezone
            )
            
            if timezone_result:
                try:
                    import pytz
                    validation_result['next_run_utc'] = timezone_result.astimezone(pytz.UTC).isoformat()
                except ImportError:
                    validation_result['next_run_utc'] = timezone_result.isoformat()
                validation_result['next_run_timezone'] = timezone_result.isoformat()
                validation_result['timezone_used'] = timezone
        
        return validation_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to validate cron expression: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to validate cron expression: {str(e)}")


@router.get("/schedule-conflicts/{job_id}")
async def check_schedule_conflicts(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("jobs:read"))
):
    """Check for schedule conflicts with an existing job"""
    try:
        from ..services.scheduling_service import SchedulingService
        
        # Get the job
        job = db.query(ExtractionJob).filter(
            ExtractionJob.id == job_id,
            ExtractionJob.tenant_id == current_user.tenant_id
        ).first()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job.schedule_type != 'recurring':
            return {"conflicts": [], "message": "Only recurring jobs can have conflicts"}
        
        scheduling_service = SchedulingService(db)
        
        # Prepare job schedule data
        job_schedule = {
            'schedule_type': job.schedule_type,
            'schedule_config': job.schedule_config
        }
        
        # Check for conflicts
        conflicts = scheduling_service.detect_schedule_conflicts(
            tenant_id=str(current_user.tenant_id),
            new_job_schedule=job_schedule,
            exclude_job_id=str(job_id)
        )
        
        return {
            "job_id": str(job_id),
            "job_name": job.name,
            "conflicts": conflicts,
            "conflict_count": len(conflicts)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to check schedule conflicts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check schedule conflicts: {str(e)}")


@router.post("/schedule-conflicts")
async def check_new_job_conflicts(
    job_schedule: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("jobs:read"))
):
    """Check for schedule conflicts with a new job schedule"""
    try:
        from ..services.scheduling_service import SchedulingService
        
        scheduling_service = SchedulingService(db)
        
        # Check for conflicts
        conflicts = scheduling_service.detect_schedule_conflicts(
            tenant_id=str(current_user.tenant_id),
            new_job_schedule=job_schedule
        )
        
        return {
            "conflicts": conflicts,
            "conflict_count": len(conflicts),
            "has_conflicts": len(conflicts) > 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to check new job conflicts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check new job conflicts: {str(e)}")


@router.get("/schedule-recommendations")
async def get_schedule_recommendations(
    category_id: Optional[UUID] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("jobs:read"))
):
    """Get schedule recommendations to avoid conflicts"""
    try:
        from ..services.scheduling_service import SchedulingService
        
        scheduling_service = SchedulingService(db)
        
        # Get recommendations
        recommendations = scheduling_service.get_schedule_recommendations(
            tenant_id=str(current_user.tenant_id),
            job_category=str(category_id) if category_id else None
        )
        
        return recommendations
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get schedule recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get schedule recommendations: {str(e)}")


# ============================================================================
# JOB MONITORING & ANALYTICS ENDPOINTS (Phase 10.6)
# ============================================================================

@router.get("/{job_id}/statistics")
async def get_job_statistics(
    job_id: UUID,
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("jobs:read"))
):
    """Get comprehensive statistics for a job"""
    try:
        from ..services.job_monitoring_service import JobMonitoringService
        
        # Verify job belongs to tenant
        job = db.query(ExtractionJob).filter(
            ExtractionJob.id == job_id,
            ExtractionJob.tenant_id == current_user.tenant_id
        ).first()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        monitoring_service = JobMonitoringService(db)
        statistics = monitoring_service.get_job_statistics(str(job_id), days)
        
        if "error" in statistics:
            raise HTTPException(status_code=500, detail=statistics["error"])
        
        return statistics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get job statistics: {str(e)}")


@router.get("/{job_id}/execution-history")
async def get_job_execution_history(
    job_id: UUID,
    limit: int = Query(50, ge=1, le=200, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("jobs:read"))
):
    """Get detailed execution history for a job"""
    try:
        from ..services.job_monitoring_service import JobMonitoringService
        
        # Verify job belongs to tenant
        job = db.query(ExtractionJob).filter(
            ExtractionJob.id == job_id,
            ExtractionJob.tenant_id == current_user.tenant_id
        ).first()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        monitoring_service = JobMonitoringService(db)
        history = monitoring_service.get_execution_history(
            str(job_id), limit, offset, status
        )
        
        if "error" in history:
            raise HTTPException(status_code=500, detail=history["error"])
        
        return history
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get execution history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get execution history: {str(e)}")


@router.get("/tenant/overview")
async def get_tenant_job_overview(
    days: int = Query(7, ge=1, le=30, description="Number of days to look back"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("jobs:read"))
):
    """Get overview of all jobs for the current tenant"""
    try:
        from ..services.job_monitoring_service import JobMonitoringService
        
        monitoring_service = JobMonitoringService(db)
        overview = monitoring_service.get_tenant_job_overview(str(current_user.tenant_id), days)
        
        if "error" in overview:
            raise HTTPException(status_code=500, detail=overview["error"])
        
        return overview
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get tenant job overview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get tenant job overview: {str(e)}")


@router.get("/alerts/performance")
async def get_performance_alerts(
    threshold_minutes: int = Query(10, ge=1, le=60, description="Alert threshold in minutes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("jobs:read"))
):
    """Get performance alerts for jobs"""
    try:
        from ..services.job_monitoring_service import JobMonitoringService
        
        monitoring_service = JobMonitoringService(db)
        alerts = monitoring_service.get_performance_alerts(str(current_user.tenant_id), threshold_minutes)
        
        return {
            "tenant_id": str(current_user.tenant_id),
            "threshold_minutes": threshold_minutes,
            "alerts": alerts,
            "alert_count": len(alerts)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get performance alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get performance alerts: {str(e)}")
