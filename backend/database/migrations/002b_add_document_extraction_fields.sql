-- Migration 002b: Add extraction fields to documents table
-- This migration adds extraction-related fields to the documents table

-- Add extraction-related columns to documents table
ALTER TABLE documents 
    ADD COLUMN category_id UUID REFERENCES document_categories(id),
    ADD COLUMN thumbnail_s3_key VARCHAR(500),
    -- Note: extraction_status already exists in documents table from initial creation
    ADD COLUMN extraction_error TEXT,
    ADD COLUMN page_count INTEGER,
    ADD COLUMN character_count INTEGER,
    ADD COLUMN word_count INTEGER,
    ADD COLUMN extraction_completed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
-- Note: idx_documents_extraction_status already exists from documents table creation
CREATE INDEX IF NOT EXISTS idx_documents_extraction_completed ON documents(extraction_completed_at);

-- Add comments
COMMENT ON COLUMN documents.category_id IS 'Reference to document category';
COMMENT ON COLUMN documents.thumbnail_s3_key IS 'S3 key for document thumbnail';
COMMENT ON COLUMN documents.extraction_status IS 'Current status of text extraction';
COMMENT ON COLUMN documents.extraction_error IS 'Error message if extraction failed';
COMMENT ON COLUMN documents.page_count IS 'Number of pages in the document';
COMMENT ON COLUMN documents.character_count IS 'Number of characters extracted';
COMMENT ON COLUMN documents.word_count IS 'Number of words extracted';
COMMENT ON COLUMN documents.extraction_completed_at IS 'When extraction was completed';

-- Add foreign key constraint for document_tags table
ALTER TABLE document_tags 
ADD CONSTRAINT fk_document_tags_document_id 
FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

-- Create view for document summary with category info
CREATE VIEW document_summary_v2 AS
SELECT 
    d.id,
    d.original_filename,
    d.file_size,
    d.upload_status,
    d.processing_status,
    d.extraction_status,
    dt.name as document_type,
    dc.name as category_name,
    dc.color as category_color,
    d.page_count,
    d.character_count,
    d.word_count,
    d.created_at,
    d.extraction_completed_at,
    COUNT(DISTINCT dt_tags.tag_name) as tag_count,
    array_agg(DISTINCT dt_tags.tag_name) FILTER (WHERE dt_tags.tag_name IS NOT NULL) as tags
FROM documents d
LEFT JOIN document_types dt ON d.document_type_id = dt.id
LEFT JOIN document_categories dc ON d.category_id = dc.id
LEFT JOIN document_tags dt_tags ON d.id = dt_tags.document_id
GROUP BY d.id, d.original_filename, d.file_size, d.upload_status, d.processing_status, d.extraction_status, 
         dt.name, dc.name, dc.color, d.page_count, d.character_count, d.word_count,
         d.created_at, d.extraction_completed_at;
