-- Migration: Add Extraction Jobs System
-- Phase 10.1: Database Foundation for tenant-centric job scheduling

-- ============================================================================
-- EXTRACTION JOBS TABLE
-- ============================================================================

CREATE TABLE extraction_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Basic Job Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Job Configuration
    category_id UUID NOT NULL REFERENCES document_categories(id),
    template_id UUID NOT NULL REFERENCES templates(id),
    
    -- Scheduling Configuration
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('immediate', 'scheduled', 'recurring')),
    schedule_config JSONB, -- For recurring jobs: {"cron": "0 9 * * 1-5", "timezone": "UTC"}
    run_at TIMESTAMP WITH TIME ZONE, -- For scheduled jobs (one-time execution)
    
    -- Execution Settings
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1=lowest, 10=highest
    max_concurrency INTEGER DEFAULT 5, -- Max concurrent extractions per job
    retry_policy JSONB DEFAULT '{"max_retries": 3, "retry_delay_minutes": 5}',
    
    -- Status and Control
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    
    -- Statistics
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT extraction_jobs_tenant_category_template_unique 
        UNIQUE (tenant_id, category_id, template_id, name)
);

-- ============================================================================
-- DOCUMENT EXTRACTION TRACKING TABLE
-- ============================================================================

CREATE TABLE document_extraction_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES extraction_jobs(id) ON DELETE CASCADE,
    extraction_id UUID REFERENCES extractions(id), -- Links to the actual extraction record
    
    -- Execution Details
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
    triggered_by VARCHAR(20) NOT NULL CHECK (triggered_by IN ('schedule', 'manual', 'immediate')),
    
    -- Timing Information
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_time_ms INTEGER,
    
    -- Results and Errors
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT document_extraction_tracking_unique 
        UNIQUE (document_id, job_id) -- Each document can only be processed once per job
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Extraction Jobs Indexes
CREATE INDEX idx_extraction_jobs_tenant_id ON extraction_jobs(tenant_id);
CREATE INDEX idx_extraction_jobs_category_id ON extraction_jobs(category_id);
CREATE INDEX idx_extraction_jobs_template_id ON extraction_jobs(template_id);
CREATE INDEX idx_extraction_jobs_schedule_type ON extraction_jobs(schedule_type);
CREATE INDEX idx_extraction_jobs_is_active ON extraction_jobs(is_active);
CREATE INDEX idx_extraction_jobs_next_run_at ON extraction_jobs(next_run_at) WHERE is_active = TRUE;
CREATE INDEX idx_extraction_jobs_last_run_at ON extraction_jobs(last_run_at);

-- Composite indexes for common queries
CREATE INDEX idx_extraction_jobs_tenant_active ON extraction_jobs(tenant_id, is_active);
CREATE INDEX idx_extraction_jobs_category_active ON extraction_jobs(category_id, is_active);

-- Document Extraction Tracking Indexes
CREATE INDEX idx_document_extraction_tracking_document_id ON document_extraction_tracking(document_id);
CREATE INDEX idx_document_extraction_tracking_job_id ON document_extraction_tracking(job_id);
CREATE INDEX idx_document_extraction_tracking_extraction_id ON document_extraction_tracking(extraction_id);
CREATE INDEX idx_document_extraction_tracking_status ON document_extraction_tracking(status);
CREATE INDEX idx_document_extraction_tracking_triggered_by ON document_extraction_tracking(triggered_by);

-- Composite indexes for common queries
CREATE INDEX idx_document_extraction_tracking_job_status ON document_extraction_tracking(job_id, status);
CREATE INDEX idx_document_extraction_tracking_document_job ON document_extraction_tracking(document_id, job_id);
CREATE INDEX idx_document_extraction_tracking_created_at ON document_extraction_tracking(created_at DESC);

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE extraction_jobs IS 'Tenant-specific extraction jobs that automatically process documents in categories using templates';
COMMENT ON TABLE document_extraction_tracking IS 'Tracks which documents have been processed by which jobs and their execution status';

-- Column comments for extraction_jobs
COMMENT ON COLUMN extraction_jobs.schedule_type IS 'Job execution type: immediate (run once), scheduled (run at specific time), recurring (run on schedule)';
COMMENT ON COLUMN extraction_jobs.schedule_config IS 'JSON configuration for recurring jobs: {"cron": "0 9 * * 1-5", "timezone": "UTC"}';
COMMENT ON COLUMN extraction_jobs.run_at IS 'Specific execution time for scheduled jobs';
COMMENT ON COLUMN extraction_jobs.priority IS 'Job priority 1-10 (1=lowest, 10=highest) for queue ordering';
COMMENT ON COLUMN extraction_jobs.max_concurrency IS 'Maximum number of concurrent document extractions for this job';
COMMENT ON COLUMN extraction_jobs.retry_policy IS 'JSON retry configuration: {"max_retries": 3, "retry_delay_minutes": 5}';
COMMENT ON COLUMN extraction_jobs.next_run_at IS 'Next scheduled execution time for recurring jobs';

-- Column comments for document_extraction_tracking
COMMENT ON COLUMN document_extraction_tracking.status IS 'Execution status: pending, processing, completed, failed, skipped';
COMMENT ON COLUMN document_extraction_tracking.triggered_by IS 'How the extraction was triggered: schedule, manual, immediate';
COMMENT ON COLUMN document_extraction_tracking.processing_time_ms IS 'Total processing time in milliseconds';

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update extraction_jobs.updated_at on any change
CREATE OR REPLACE FUNCTION update_extraction_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_extraction_jobs_updated_at
    BEFORE UPDATE ON extraction_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_extraction_jobs_updated_at();

-- Update document_extraction_tracking.updated_at on any change
CREATE OR REPLACE FUNCTION update_document_extraction_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_document_extraction_tracking_updated_at
    BEFORE UPDATE ON document_extraction_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_document_extraction_tracking_updated_at();
