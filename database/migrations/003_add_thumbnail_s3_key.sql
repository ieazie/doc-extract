-- Migration: Add thumbnail_s3_key column to documents table
-- Description: Adds thumbnail_s3_key column to store S3 keys for document thumbnails/previews

-- Add thumbnail_s3_key column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS thumbnail_s3_key VARCHAR(500);

-- Add index for thumbnail lookups
CREATE INDEX IF NOT EXISTS idx_documents_thumbnail_s3_key 
ON documents(thumbnail_s3_key) 
WHERE thumbnail_s3_key IS NOT NULL;

-- Add comment to column
COMMENT ON COLUMN documents.thumbnail_s3_key IS 'S3 key for document thumbnail/preview image';

