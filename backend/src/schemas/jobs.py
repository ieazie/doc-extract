"""
Pydantic schemas for extraction jobs system
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID
from pydantic import BaseModel, Field, validator
from enum import Enum


class ScheduleType(str, Enum):
    """Job schedule types"""
    IMMEDIATE = "immediate"
    SCHEDULED = "scheduled"
    RECURRING = "recurring"


class JobStatus(str, Enum):
    """Job execution status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class TriggeredBy(str, Enum):
    """How the job was triggered"""
    SCHEDULE = "schedule"
    MANUAL = "manual"
    IMMEDIATE = "immediate"


# ============================================================================
# BASE SCHEMAS
# ============================================================================

class JobScheduleConfig(BaseModel):
    """Schedule configuration for jobs"""
    cron: Optional[str] = Field(None, description="Cron expression for recurring jobs")
    timezone: Optional[str] = Field("UTC", description="Timezone for scheduling")
    run_at: Optional[datetime] = Field(None, description="Specific run time for scheduled jobs")
    
    @validator('cron')
    def validate_cron(cls, v):
        if v is not None:
            # Basic cron validation - could be enhanced with croniter
            parts = v.split()
            if len(parts) != 5:
                raise ValueError('Cron expression must have 5 parts')
        return v


class JobRetryPolicy(BaseModel):
    """Retry policy configuration"""
    max_retries: int = Field(3, ge=0, le=10, description="Maximum number of retries")
    retry_delay_minutes: int = Field(5, ge=1, le=60, description="Delay between retries in minutes")


# ============================================================================
# EXTRACTION JOB SCHEMAS
# ============================================================================

class ExtractionJobBase(BaseModel):
    """Base extraction job schema"""
    name: str = Field(..., min_length=1, max_length=255, description="Job name")
    description: Optional[str] = Field(None, description="Job description")
    category_id: UUID = Field(..., description="Document category ID")
    template_id: UUID = Field(..., description="Extraction template ID")
    schedule_type: ScheduleType = Field(..., description="Job schedule type")
    schedule_config: Optional[Dict[str, Any]] = Field(None, description="Schedule configuration")
    run_at: Optional[datetime] = Field(None, description="Specific run time for scheduled jobs")
    priority: int = Field(5, ge=1, le=10, description="Job priority (1=lowest, 10=highest)")
    max_concurrency: int = Field(5, ge=1, le=20, description="Max concurrent extractions")
    retry_policy: Optional[Dict[str, Any]] = Field(
        default={"max_retries": 3, "retry_delay_minutes": 5},
        description="Retry policy configuration"
    )
    is_active: bool = Field(True, description="Whether the job is active")


class ExtractionJobCreate(ExtractionJobBase):
    """Schema for creating extraction jobs"""
    
    @validator('schedule_config')
    def validate_schedule_config(cls, v, values):
        schedule_type = values.get('schedule_type')
        
        if schedule_type == ScheduleType.RECURRING:
            if not v or 'cron' not in v:
                raise ValueError('Recurring jobs must have cron expression in schedule_config')
        elif schedule_type == ScheduleType.SCHEDULED:
            if not values.get('run_at'):
                raise ValueError('Scheduled jobs must have run_at time specified')
        
        return v


class ExtractionJobUpdate(BaseModel):
    """Schema for updating extraction jobs"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    schedule_type: Optional[ScheduleType] = None
    schedule_config: Optional[Dict[str, Any]] = None
    run_at: Optional[datetime] = None
    priority: Optional[int] = Field(None, ge=1, le=10)
    max_concurrency: Optional[int] = Field(None, ge=1, le=20)
    retry_policy: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class ExtractionJobResponse(ExtractionJobBase):
    """Schema for extraction job responses"""
    id: UUID
    tenant_id: UUID
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    total_executions: int = 0
    successful_executions: int = 0
    failed_executions: int = 0
    created_at: datetime
    updated_at: datetime
    
    # Related objects
    category_name: Optional[str] = None
    template_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# DOCUMENT EXTRACTION TRACKING SCHEMAS
# ============================================================================

class DocumentExtractionTrackingBase(BaseModel):
    """Base document extraction tracking schema"""
    document_id: UUID
    job_id: UUID
    extraction_id: Optional[UUID] = None
    status: JobStatus
    triggered_by: TriggeredBy
    error_message: Optional[str] = None
    retry_count: int = 0


class DocumentExtractionTrackingCreate(DocumentExtractionTrackingBase):
    """Schema for creating document extraction tracking records"""
    pass


class DocumentExtractionTrackingUpdate(BaseModel):
    """Schema for updating document extraction tracking records"""
    status: Optional[JobStatus] = None
    extraction_id: Optional[UUID] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    processing_time_ms: Optional[int] = None
    error_message: Optional[str] = None
    retry_count: Optional[int] = None


class DocumentExtractionTrackingResponse(DocumentExtractionTrackingBase):
    """Schema for document extraction tracking responses"""
    id: UUID
    queued_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    processing_time_ms: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    # Related objects
    document_filename: Optional[str] = None
    job_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# LIST AND PAGINATION SCHEMAS
# ============================================================================

class ExtractionJobListResponse(BaseModel):
    """Schema for job list responses"""
    jobs: List[ExtractionJobResponse]
    total: int
    page: int
    per_page: int
    pages: int


class DocumentExtractionTrackingListResponse(BaseModel):
    """Schema for document tracking list responses"""
    tracking: List[DocumentExtractionTrackingResponse]
    total: int
    page: int
    per_page: int
    pages: int


# ============================================================================
# JOB EXECUTION SCHEMAS
# ============================================================================

class JobExecutionRequest(BaseModel):
    """Schema for manual job execution requests"""
    triggered_by: TriggeredBy = TriggeredBy.MANUAL
    priority_boost: Optional[int] = Field(None, ge=0, le=5, description="Temporary priority boost")


class JobExecutionResponse(BaseModel):
    """Schema for job execution responses"""
    job_id: UUID
    execution_started: bool
    documents_queued: int
    estimated_completion: Optional[datetime] = None
    message: str


# ============================================================================
# JOB STATISTICS SCHEMAS
# ============================================================================

class JobStatistics(BaseModel):
    """Job performance statistics"""
    total_executions: int
    successful_executions: int
    failed_executions: int
    success_rate: float
    average_processing_time_ms: Optional[int] = None
    last_execution: Optional[datetime] = None
    next_execution: Optional[datetime] = None


class JobAnalytics(BaseModel):
    """Job analytics and metrics"""
    job_id: UUID
    job_name: str
    statistics: JobStatistics
    recent_executions: List[DocumentExtractionTrackingResponse]
    documents_processed_today: int
    documents_pending: int


# ============================================================================
# ERROR SCHEMAS
# ============================================================================

class JobError(BaseModel):
    """Job error details"""
    job_id: UUID
    error_type: str
    error_message: str
    occurred_at: datetime
    retry_count: int
    max_retries: int
    next_retry_at: Optional[datetime] = None
