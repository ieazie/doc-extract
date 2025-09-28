-- Migration 020: Make file_path nullable in documents table
-- Created: 2025-01-28
-- Description: The SQLAlchemy model no longer uses file_path, make it nullable

-- Make file_path nullable
ALTER TABLE documents 
ALTER COLUMN file_path DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN documents.file_path IS 'Legacy file path field - now nullable since we use s3_key';
