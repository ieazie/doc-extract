-- Initial database schema for Document Extraction Platform
-- This file is executed when PostgreSQL container starts

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search

-- Create tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document types table
CREATE TABLE document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    schema_template JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, name)
);

-- Create templates table
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    document_type_id UUID REFERENCES document_types(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    version INTEGER DEFAULT 1,
    schema JSONB NOT NULL,
    prompt_config JSONB NOT NULL,
    few_shot_examples JSONB DEFAULT '[]',
    extraction_settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, name, version)
);

-- Create documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    s3_key VARCHAR(500) NOT NULL UNIQUE,
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER CHECK (file_size > 0),
    mime_type VARCHAR(100),
    document_type_id UUID REFERENCES document_types(id),
    raw_content TEXT,
    status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create extractions table
CREATE TABLE extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reviewed')),
    results JSONB,
    confidence_scores JSONB,
    processing_time INTEGER, -- in milliseconds
    error_message TEXT,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create extraction fields table for detailed field tracking
CREATE TABLE extraction_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    extraction_id UUID REFERENCES extractions(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_type VARCHAR(50),
    extracted_value JSONB,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    source_location JSONB,
    human_verified BOOLEAN DEFAULT false,
    human_corrected_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
-- Tenants
CREATE INDEX idx_tenants_name ON tenants(name);

-- Document types
CREATE INDEX idx_document_types_tenant ON document_types(tenant_id);
CREATE INDEX idx_document_types_name ON document_types(name);

-- Templates
CREATE INDEX idx_templates_tenant ON templates(tenant_id);
CREATE INDEX idx_templates_document_type ON templates(document_type_id);
CREATE INDEX idx_templates_active ON templates(is_active);
CREATE INDEX idx_templates_name ON templates(name);

-- Documents
CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_s3_key ON documents(s3_key);
CREATE INDEX idx_documents_type ON documents(document_type_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created ON documents(created_at);
CREATE INDEX idx_documents_filename ON documents(original_filename);

-- Full-text search on document content
CREATE INDEX idx_documents_content_fts ON documents USING gin(to_tsvector('english', raw_content));

-- Extractions
CREATE INDEX idx_extractions_document ON extractions(document_id);
CREATE INDEX idx_extractions_template ON extractions(template_id);
CREATE INDEX idx_extractions_status ON extractions(status);
CREATE INDEX idx_extractions_created ON extractions(created_at);

-- Extraction fields
CREATE INDEX idx_extraction_fields_extraction ON extraction_fields(extraction_id);
CREATE INDEX idx_extraction_fields_name ON extraction_fields(field_name);
CREATE INDEX idx_extraction_fields_verified ON extraction_fields(human_verified);

-- Insert default data with fixed UUID
INSERT INTO tenants (id, name, settings) VALUES 
('00000000-0000-0000-0000-000000000001', 'Default Tenant', '{"max_documents": 1000, "max_templates": 50}');

-- Insert default document types using the fixed tenant ID
INSERT INTO document_types (tenant_id, name, description, schema_template) VALUES 
('00000000-0000-0000-0000-000000000001', 'invoice', 'Invoice documents for billing and payment processing', '{
    "fields": {
        "invoice_number": {"type": "text", "required": true},
        "invoice_date": {"type": "date", "required": true},
        "total_amount": {"type": "number", "required": true}
    }
}'),
('00000000-0000-0000-0000-000000000001', 'contract', 'Legal contracts and agreements', '{
    "fields": {
        "contract_number": {"type": "text", "required": false},
        "effective_date": {"type": "date", "required": true},
        "parties": {"type": "array", "required": true}
    }
}'),
('00000000-0000-0000-0000-000000000001', 'insurance_policy', 'Insurance policy documents', '{
    "fields": {
        "policy_number": {"type": "text", "required": true},
        "policy_type": {"type": "text", "required": true},
        "coverage_limits": {"type": "array", "required": false}
    }
}');

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extractions_updated_at BEFORE UPDATE ON extractions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
CREATE VIEW document_summary AS
SELECT 
    d.id,
    d.original_filename,
    d.file_size,
    d.status,
    dt.name as document_type,
    d.created_at,
    COUNT(e.id) as extraction_count
FROM documents d
LEFT JOIN document_types dt ON d.document_type_id = dt.id
LEFT JOIN extractions e ON d.id = e.document_id
GROUP BY d.id, d.original_filename, d.file_size, d.status, dt.name, d.created_at;

CREATE VIEW extraction_summary AS
SELECT 
    e.id,
    e.status,
    e.processing_time,
    d.original_filename,
    t.name as template_name,
    e.created_at,
    COUNT(ef.id) as field_count
FROM extractions e
JOIN documents d ON e.document_id = d.id
JOIN templates t ON e.template_id = t.id
LEFT JOIN extraction_fields ef ON e.id = ef.extraction_id
GROUP BY e.id, e.status, e.processing_time, d.original_filename, t.name, e.created_at;

-- Phase 2 Schema Updates: Categories, Tags, and Async Processing
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
INSERT INTO document_categories (tenant_id, name, description, color) VALUES 
('00000000-0000-0000-0000-000000000001', 'Invoice', 'Financial invoices and billing documents', '#10b981'),
('00000000-0000-0000-0000-000000000001', 'Contract', 'Legal contracts and agreements', '#3b82f6'),
('00000000-0000-0000-0000-000000000001', 'Insurance', 'Insurance policies and related documents', '#f59e0b'),
('00000000-0000-0000-0000-000000000001', 'General', 'General documents and miscellaneous files', '#6b7280'),
('00000000-0000-0000-0000-000000000001', 'Personal', 'Personal documents and records', '#8b5cf6'),
('00000000-0000-0000-0000-000000000001', 'Legal', 'Legal documents and court papers', '#ef4444');

-- Grant permissions (adjust as needed for production)
-- These would typically be more restrictive in production
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Phase 3: Template Management Foundation - Database Schema
-- This schema supports basic template management and prepares for Phase 5 advanced features

-- Templates table - core template definitions
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    document_type_id UUID REFERENCES document_types(id) ON DELETE SET NULL,
    
    -- Schema definition (JSON structure defining what to extract)
    schema_definition JSONB NOT NULL DEFAULT '{}',
    
    -- Prompt configuration for extraction
    prompt_config JSONB NOT NULL DEFAULT '{
        "system_prompt": "",
        "instructions": "",
        "output_format": "json"
    }',
    
    -- Extraction settings (for Phase 4)
    extraction_settings JSONB DEFAULT '{
        "max_chunk_size": 4000,
        "extraction_passes": 1,
        "confidence_threshold": 0.8
    }',
    
    -- Template status and versioning
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    
    -- Generation metadata (for Phase 5)
    generation_method VARCHAR(50) DEFAULT 'manual', -- manual, auto_sample, auto_description
    generation_source JSONB DEFAULT '{}', -- stores source info for auto-generation
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT templates_name_tenant_unique UNIQUE(tenant_id, name),
    CONSTRAINT templates_version_positive CHECK(version > 0)
);

-- Template examples - few-shot learning examples
CREATE TABLE IF NOT EXISTS template_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    
    -- Example content
    name VARCHAR(255) NOT NULL,
    document_snippet TEXT NOT NULL,
    expected_output JSONB NOT NULL,
    
    -- Validation status
    is_validated BOOLEAN DEFAULT false,
    validation_notes TEXT,
    
    -- Metadata
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_by_user VARCHAR(255), -- for future user management
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template versions - for version control (Phase 5)
CREATE TABLE IF NOT EXISTS template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    -- Versioned content (snapshot of template at this version)
    schema_definition JSONB NOT NULL,
    prompt_config JSONB NOT NULL,
    extraction_settings JSONB,
    
    -- Version metadata
    change_summary TEXT,
    created_by_user VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT template_versions_unique UNIQUE(template_id, version_number),
    CONSTRAINT template_versions_positive CHECK(version_number > 0)
);

-- Template usage tracking (for analytics in later phases)
CREATE TABLE IF NOT EXISTS template_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Usage details
    extraction_status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    processing_time_ms INTEGER,
    
    -- Results reference (for Phase 4)
    extraction_id UUID, -- will reference extractions table in Phase 4
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_tenant_id ON templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_templates_document_type ON templates(document_type_id);
CREATE INDEX IF NOT EXISTS idx_templates_active ON templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_template_examples_template_id ON template_examples(template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_template_id ON template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_document_id ON template_usage(document_id);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_examples_updated_at BEFORE UPDATE ON template_examples
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_usage_updated_at BEFORE UPDATE ON template_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default templates for common document types
INSERT INTO templates (tenant_id, name, description, document_type_id, schema_definition, prompt_config)
SELECT 
    '00000000-0000-0000-0000-000000000001' as tenant_id,
    'Basic ' || dt.name || ' Template' as name,
    'Default template for extracting data from ' || dt.description as description,
    dt.id as document_type_id,
    CASE dt.name
        WHEN 'invoice' THEN '{
            "invoice_number": {"type": "text", "required": true, "description": "Invoice identification number"},
            "invoice_date": {"type": "date", "required": true, "description": "Date the invoice was issued"},
            "total_amount": {"type": "number", "required": true, "description": "Total amount due"},
            "vendor_name": {"type": "text", "required": false, "description": "Name of the vendor/supplier"},
            "line_items": {"type": "array", "required": false, "description": "List of invoice line items"}
        }'::jsonb
        WHEN 'contract' THEN '{
            "contract_number": {"type": "text", "required": false, "description": "Contract identification number"},
            "effective_date": {"type": "date", "required": true, "description": "Date the contract becomes effective"},
            "expiration_date": {"type": "date", "required": false, "description": "Date the contract expires"},
            "parties": {"type": "array", "required": true, "description": "Parties involved in the contract"},
            "contract_value": {"type": "number", "required": false, "description": "Total contract value"}
        }'::jsonb
        WHEN 'insurance_policy' THEN '{
            "policy_number": {"type": "text", "required": true, "description": "Insurance policy number"},
            "policy_holder": {"type": "text", "required": true, "description": "Name of the policy holder"},
            "coverage_amount": {"type": "number", "required": false, "description": "Coverage amount"},
            "premium_amount": {"type": "number", "required": false, "description": "Premium amount"},
            "effective_date": {"type": "date", "required": true, "description": "Policy effective date"},
            "expiration_date": {"type": "date", "required": true, "description": "Policy expiration date"}
        }'::jsonb
        ELSE '{}'::jsonb
    END as schema_definition,
    jsonb_build_object(
        'system_prompt', 'You are an expert at extracting structured data from ' || dt.description || ' documents.',
        'instructions', 'Extract the specified fields from the document. Be precise and only extract data that is clearly visible in the document. Return the data in valid JSON format.',
        'output_format', 'json'
    ) as prompt_config
FROM document_types dt
WHERE dt.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Add some example template examples
INSERT INTO template_examples (template_id, name, document_snippet, expected_output, is_validated)
SELECT 
    t.id,
    'Sample ' || dt.name || ' Example',
    CASE dt.name
        WHEN 'invoice' THEN 'Invoice #INV-2024-001
Date: January 15, 2024
Bill To: ABC Company
Amount Due: $1,250.00'
        WHEN 'contract' THEN 'SERVICE AGREEMENT
Contract #: SA-2024-001
Effective Date: January 1, 2024
Between: Company A and Company B'
        WHEN 'insurance_policy' THEN 'INSURANCE POLICY
Policy Number: POL-2024-001
Policy Holder: John Smith
Coverage: $100,000
Premium: $1,200 annually'
        ELSE 'Sample document content'
    END as document_snippet,
    CASE dt.name
        WHEN 'invoice' THEN '{
            "invoice_number": "INV-2024-001",
            "invoice_date": "2024-01-15",
            "total_amount": 1250.00,
            "vendor_name": null
        }'::jsonb
        WHEN 'contract' THEN '{
            "contract_number": "SA-2024-001",
            "effective_date": "2024-01-01",
            "parties": ["Company A", "Company B"]
        }'::jsonb
        WHEN 'insurance_policy' THEN '{
            "policy_number": "POL-2024-001",
            "policy_holder": "John Smith",
            "coverage_amount": 100000,
            "premium_amount": 1200
        }'::jsonb
        ELSE '{}'::jsonb
    END as expected_output,
    true as is_validated
FROM templates t
JOIN document_types dt ON t.document_type_id = dt.id
WHERE t.tenant_id = '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- MIGRATION 010: ADD TENANT SLUGS
-- ============================================================================
-- Add unique slug field to tenants table for better resource identification

-- Add slug column to tenants table
ALTER TABLE tenants 
ADD COLUMN slug VARCHAR(100);

-- Add unique constraint on slug
ALTER TABLE tenants 
ADD CONSTRAINT unique_tenant_slug UNIQUE (slug);

-- Add check constraint for slug format (alphanumeric + hyphens, lowercase)
ALTER TABLE tenants 
ADD CONSTRAINT valid_tenant_slug 
CHECK (slug ~ '^[a-z0-9-]+$' AND length(slug) >= 3 AND length(slug) <= 100);

-- Function to generate slug from tenant name
CREATE OR REPLACE FUNCTION generate_tenant_slug(tenant_name TEXT) 
RETURNS TEXT AS $$
BEGIN
    -- Convert to lowercase, replace spaces and special chars with hyphens
    -- Remove multiple consecutive hyphens, trim hyphens from ends
    RETURN regexp_replace(
        regexp_replace(
            regexp_replace(
                lower(trim(tenant_name)), 
                '[^a-z0-9\s-]', '', 'g'
            ), 
            '\s+', '-', 'g'
        ), 
        '-+', '-', 'g'
    );
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing tenants
UPDATE tenants 
SET slug = generate_tenant_slug(name)
WHERE slug IS NULL;

-- Handle any potential duplicates by appending tenant ID
UPDATE tenants 
SET slug = slug || '-' || substring(id::text, 1, 8)
WHERE id IN (
    SELECT id FROM (
        SELECT id, slug, 
               ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
        FROM tenants
    ) t WHERE rn > 1
);

-- Now that all tenants have slugs, make the column NOT NULL
ALTER TABLE tenants 
ALTER COLUMN slug SET NOT NULL;

-- Index for slug lookups
CREATE INDEX idx_tenants_slug ON tenants(slug);

-- Drop the helper function
DROP FUNCTION generate_tenant_slug(TEXT);

-- Add comments
COMMENT ON COLUMN tenants.slug IS 'Unique, URL-safe identifier for the tenant (e.g., acme-corp)';
COMMENT ON CONSTRAINT valid_tenant_slug ON tenants IS 'Ensures slug contains only lowercase letters, numbers, and hyphens, 3-100 characters';
COMMENT ON CONSTRAINT unique_tenant_slug ON tenants IS 'Ensures each tenant has a unique slug';
