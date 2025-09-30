-- Migration 019: Make stored_filename nullable in documents table
-- Created: 2025-01-28
-- Description: The SQLAlchemy model no longer uses stored_filename, make it nullable

-- Make stored_filename nullable
ALTER TABLE documents 
ALTER COLUMN stored_filename DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN documents.stored_filename IS 'Legacy filename field - now nullable since we use s3_key';
