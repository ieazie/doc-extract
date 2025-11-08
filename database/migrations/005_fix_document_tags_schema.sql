-- Migration: Fix document_tags schema to match model
-- Description: Updates document_tags table structure to match the SQLAlchemy model

-- Drop and recreate document_tags table with correct schema
DROP TABLE IF EXISTS document_tags CASCADE;

CREATE TABLE document_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, tag_name)
);

-- Create indexes for performance
CREATE INDEX idx_document_tags_document_id ON document_tags(document_id);
CREATE INDEX idx_document_tags_tag_name ON document_tags(tag_name);

-- Add comments
COMMENT ON TABLE document_tags IS 'Tags associated with documents for categorization and search';
COMMENT ON COLUMN document_tags.id IS 'Unique identifier for the tag association';
COMMENT ON COLUMN document_tags.document_id IS 'Reference to the document';
COMMENT ON COLUMN document_tags.tag_name IS 'The tag name/label';
COMMENT ON COLUMN document_tags.created_at IS 'When the tag was added to the document';

