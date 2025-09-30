-- Migration 026: Drop redundant document extraction tracking index
-- Created: 2025-01-14
-- Description: Remove redundant index that duplicates the UNIQUE constraint index on (document_id, job_id)

-- ============================================================================
-- DROP REDUNDANT INDEX
-- ============================================================================

-- Drop the redundant index that duplicates the UNIQUE constraint index
-- The UNIQUE constraint on (document_id, job_id) already creates a btree index
-- so the explicit idx_document_extraction_tracking_document_job index is redundant
DROP INDEX IF EXISTS idx_document_extraction_tracking_document_job;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

-- This migration removes the redundant index created in migration 008
-- The UNIQUE constraint on document_extraction_tracking(document_id, job_id)
-- automatically creates a btree index that serves the same purpose
