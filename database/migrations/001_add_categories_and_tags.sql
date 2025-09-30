-- Migration 001: Add document categories, tags, and async processing support
-- This migration adds support for document categorization and async text extraction

-- Create the update_updated_at_column function (needed for triggers)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create document categories table
CREATE TABLE document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID, -- Will add foreign key constraint after documents table is created
    tag_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(document_id, tag_name)
);

-- Note: Document extraction fields will be added in 002b_add_document_extraction_fields.sql

-- Create indexes for performance
CREATE INDEX idx_document_categories_tenant ON document_categories(tenant_id);
CREATE INDEX idx_document_categories_name ON document_categories(name);
CREATE INDEX idx_document_tags_document ON document_tags(document_id);
CREATE INDEX idx_document_tags_name ON document_tags(tag_name);
-- Note: Document indexes will be created in 002b_add_document_extraction_fields.sql

-- Create trigger for updated_at on document_categories
CREATE TRIGGER update_document_categories_updated_at 
    BEFORE UPDATE ON document_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories for the default tenant
DO $$
DECLARE
    default_tenant_id UUID;
BEGIN
    SELECT id INTO default_tenant_id FROM tenants WHERE name = 'DocExtract Demo';
    
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

-- Note: Document summary view will be created in 002b_add_document_extraction_fields.sql after documents table exists

