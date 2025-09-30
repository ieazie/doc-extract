-- Migration 015: Fix document_extraction_tracking tenant isolation
-- Created: 2025-01-27
-- Description: Add tenant_id column and constraints to prevent cross-tenant data leaks

-- ============================================================================
-- ADD TENANT_ID COLUMN TO DOCUMENT_EXTRACTION_TRACKING
-- ============================================================================

-- Add tenant_id column to document_extraction_tracking table
ALTER TABLE document_extraction_tracking 
    ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- ============================================================================
-- POPULATE TENANT_ID FROM EXISTING DATA
-- ============================================================================

-- Update existing records with tenant_id from documents table
UPDATE document_extraction_tracking 
SET tenant_id = d.tenant_id
FROM documents d
WHERE document_extraction_tracking.document_id = d.id;

-- ============================================================================
-- ADD CONSTRAINTS AND INDEXES
-- ============================================================================

-- Make tenant_id NOT NULL after populating data
ALTER TABLE document_extraction_tracking 
    ALTER COLUMN tenant_id SET NOT NULL;

-- Add unique constraint on extraction_jobs for tenant_id + id
ALTER TABLE extraction_jobs
    ADD CONSTRAINT extraction_jobs_tenant_job_unique 
        UNIQUE (tenant_id, id);

-- Add foreign key constraint to ensure tenant_id matches the job's tenant
ALTER TABLE document_extraction_tracking
    ADD CONSTRAINT document_extraction_tracking_job_tenant_fk
        FOREIGN KEY (tenant_id, job_id) 
        REFERENCES extraction_jobs(tenant_id, id) ON DELETE CASCADE;

-- Create index for tenant_id queries
CREATE INDEX idx_document_extraction_tracking_tenant_id
    ON document_extraction_tracking(tenant_id);

-- Create composite index for tenant + status queries
CREATE INDEX idx_document_extraction_tracking_tenant_status
    ON document_extraction_tracking(tenant_id, status);

-- Create composite index for tenant + job queries
CREATE INDEX idx_document_extraction_tracking_tenant_job
    ON document_extraction_tracking(tenant_id, job_id);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN document_extraction_tracking.tenant_id IS 'Tenant ID for tenant isolation. Prevents cross-tenant data leaks in multi-tenant system.';
COMMENT ON CONSTRAINT document_extraction_tracking_job_tenant_fk ON document_extraction_tracking IS 'Ensures tenant_id matches the job''s tenant to prevent cross-tenant data leaks.';
COMMENT ON CONSTRAINT extraction_jobs_tenant_job_unique ON extraction_jobs IS 'Ensures each job ID is unique within a tenant for proper foreign key relationships.';

-- ============================================================================
-- VERIFY DATA INTEGRITY
-- ============================================================================

-- Check that all records have tenant_id populated
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count 
    FROM document_extraction_tracking 
    WHERE tenant_id IS NULL;
    
    IF null_count > 0 THEN
        RAISE EXCEPTION 'Found % records with NULL tenant_id. Data migration failed.', null_count;
    END IF;
    
    RAISE NOTICE 'All % records in document_extraction_tracking have tenant_id populated.', 
        (SELECT COUNT(*) FROM document_extraction_tracking);
END $$;
