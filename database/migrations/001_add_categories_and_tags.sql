-- Migration 001: Add document categories, tags, and async processing support
-- This migration adds support for document categorization and async text extraction

-- Create document categories table
CREATE TABLE document_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3b82f6', -- Default blue color
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, name)
);

-- Create document tags table (many-to-many relationship)
CREATE TABLE document_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    tag_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(document_id, tag_name)
);

-- Add new columns to documents table
ALTER TABLE documents 
    ADD COLUMN category_id UUID REFERENCES document_categories(id),
    ADD COLUMN thumbnail_s3_key VARCHAR(500),
    ADD COLUMN extraction_status VARCHAR(50) DEFAULT 'pending' 
        CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
    ADD COLUMN extraction_error TEXT,
    ADD COLUMN page_count INTEGER,
    ADD COLUMN character_count INTEGER,
    ADD COLUMN word_count INTEGER,
    ADD COLUMN extraction_completed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX idx_document_categories_tenant ON document_categories(tenant_id);
CREATE INDEX idx_document_categories_name ON document_categories(name);
CREATE INDEX idx_document_tags_document ON document_tags(document_id);
CREATE INDEX idx_document_tags_name ON document_tags(tag_name);
CREATE INDEX idx_documents_category ON documents(category_id);
CREATE INDEX idx_documents_extraction_status ON documents(extraction_status);
CREATE INDEX idx_documents_extraction_completed ON documents(extraction_completed_at);

-- Create trigger for updated_at on document_categories
CREATE TRIGGER update_document_categories_updated_at 
    BEFORE UPDATE ON document_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories for the default tenant
DO $$
DECLARE
    default_tenant_id UUID;
BEGIN
    SELECT id INTO default_tenant_id FROM tenants WHERE name = 'Default Tenant';
    
    IF default_tenant_id IS NOT NULL THEN
        INSERT INTO document_categories (tenant_id, name, description, color) VALUES 
        (default_tenant_id, 'Invoice', 'Financial invoices and billing documents', '#10b981'),
        (default_tenant_id, 'Contract', 'Legal contracts and agreements', '#3b82f6'),
        (default_tenant_id, 'Insurance', 'Insurance policies and related documents', '#f59e0b'),
        (default_tenant_id, 'General', 'General documents and miscellaneous files', '#6b7280'),
        (default_tenant_id, 'Personal', 'Personal documents and records', '#8b5cf6'),
        (default_tenant_id, 'Legal', 'Legal documents and court papers', '#ef4444');
    END IF;
END $$;

-- Create view for document summary with category info
CREATE VIEW document_summary_v2 AS
SELECT 
    d.id,
    d.original_filename,
    d.file_size,
    d.status,
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
GROUP BY d.id, d.original_filename, d.file_size, d.status, d.extraction_status, 
         dt.name, dc.name, dc.color, d.page_count, d.character_count, d.word_count,
         d.created_at, d.extraction_completed_at;

