-- Migration 018: Fix documents table schema mismatch
-- Created: 2025-01-28
-- Description: Add missing s3_key column and fix column mappings to match SQLAlchemy model

-- ============================================================================
-- ADD MISSING COLUMNS TO MATCH SQLALCHEMY MODEL
-- ============================================================================

-- Add s3_key column (required by SQLAlchemy model)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS s3_key VARCHAR(500);

-- Add raw_content column (required by SQLAlchemy model)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS raw_content TEXT;

-- Add status column (required by SQLAlchemy model)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'uploaded';

-- Add language detection columns if not exist
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS detected_language VARCHAR(10);

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS language_confidence NUMERIC(3,2);

-- ============================================================================
-- POPULATE s3_key FROM EXISTING DATA
-- ============================================================================

-- Copy stored_filename to s3_key for existing records
UPDATE documents 
SET s3_key = stored_filename 
WHERE s3_key IS NULL AND stored_filename IS NOT NULL;

-- Fail early if duplicates would violate uniqueness
DO $$
BEGIN
  IF EXISTS (
    SELECT s3_key
    FROM documents
    WHERE s3_key IS NOT NULL
    GROUP BY s3_key
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate s3_key values detected; dedupe before adding UNIQUE constraint';
  END IF;
END $$;

-- ============================================================================
-- ADD CONSTRAINTS AND INDEXES
-- ============================================================================

-- Replace single-column UNIQUE on s3_key with a tenant-scoped UNIQUE
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_s3_key_unique') THEN
        ALTER TABLE documents DROP CONSTRAINT documents_s3_key_unique;
    END IF;
    
    -- Add tenant-scoped unique constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_tenant_s3_key_unique') THEN
        ALTER TABLE documents ADD CONSTRAINT documents_tenant_s3_key_unique UNIQUE (tenant_id, s3_key);
    END IF;
END $$;

-- Optional (staged): enforce presence after backfill
ALTER TABLE documents
  ALTER COLUMN s3_key SET NOT NULL;

-- Add check constraint for status column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_status_check') THEN
        ALTER TABLE documents ADD CONSTRAINT documents_status_check CHECK (status IN ('uploaded', 'processing', 'processed', 'failed'));
    END IF;
END $$;

-- Add index for s3_key
CREATE INDEX IF NOT EXISTS idx_documents_s3_key ON documents(s3_key);

-- Add index for status
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Add index for detected_language
CREATE INDEX IF NOT EXISTS idx_documents_detected_language ON documents(detected_language);

-- Add composite index for tenant + language
CREATE INDEX IF NOT EXISTS idx_documents_tenant_language ON documents(tenant_id, detected_language);

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON COLUMN documents.s3_key IS 'S3 key/path for the stored document';
COMMENT ON COLUMN documents.raw_content IS 'Raw extracted text content from the document';
COMMENT ON COLUMN documents.status IS 'Current status of the document (uploaded, processing, processed, failed)';
COMMENT ON COLUMN documents.detected_language IS 'Language detected in the document';
COMMENT ON COLUMN documents.language_confidence IS 'Confidence score for language detection (0.0-1.0)';
