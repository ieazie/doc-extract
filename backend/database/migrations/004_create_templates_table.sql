-- Migration 003: Create templates table
-- Created: 2025-01-14
-- Description: Create templates table for data extraction schemas and prompts

-- ============================================================================
-- CREATE TEMPLATES TABLE
-- ============================================================================

-- Create templates table
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_type_id UUID REFERENCES document_types(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_default BOOLEAN DEFAULT false NOT NULL,
    language VARCHAR(10) DEFAULT 'en' CHECK (language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
    extraction_schema JSONB NOT NULL DEFAULT '{}',
    extraction_prompt TEXT,
    validation_rules JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique name per tenant per version
    CONSTRAINT unique_tenant_template_name_version UNIQUE (tenant_id, name, version),
    -- Ensure version is positive
    CONSTRAINT templates_version_positive CHECK (version > 0)
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for tenant_id queries (most common)
CREATE INDEX idx_templates_tenant_id ON templates(tenant_id);

-- Index for document_type_id queries
CREATE INDEX idx_templates_document_type_id ON templates(document_type_id);

-- Index for active templates
CREATE INDEX idx_templates_is_active ON templates(is_active);

-- Index for default templates
CREATE INDEX idx_templates_is_default ON templates(is_default);

-- Index for created_by queries
CREATE INDEX idx_templates_created_by ON templates(created_by);

-- Composite index for tenant + active queries
CREATE INDEX idx_templates_tenant_active ON templates(tenant_id, is_active);

-- Composite index for tenant + document_type queries
CREATE INDEX idx_templates_tenant_document_type ON templates(tenant_id, document_type_id);

-- Index for language queries
CREATE INDEX idx_templates_language ON templates(language);

-- Index for created_at (sorting)
CREATE INDEX idx_templates_created_at ON templates(created_at DESC);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE templates IS 'Templates for data extraction from documents';
COMMENT ON COLUMN templates.id IS 'Primary key for the template';
COMMENT ON COLUMN templates.tenant_id IS 'Tenant this template belongs to';
COMMENT ON COLUMN templates.document_type_id IS 'Document type this template is designed for';
COMMENT ON COLUMN templates.name IS 'Name of the template';
COMMENT ON COLUMN templates.description IS 'Description of what the template extracts';
COMMENT ON COLUMN templates.version IS 'Version number of the template';
COMMENT ON COLUMN templates.is_active IS 'Whether this template is active and can be used';
COMMENT ON COLUMN templates.is_default IS 'Whether this is the default template for its document type';
COMMENT ON COLUMN templates.language IS 'Language code (ISO 639-1) for the template';
COMMENT ON COLUMN templates.extraction_schema IS 'JSON schema defining the fields to extract';
COMMENT ON COLUMN templates.extraction_prompt IS 'Prompt/instructions for the LLM extraction';
COMMENT ON COLUMN templates.validation_rules IS 'JSON rules for validating extracted data';
COMMENT ON COLUMN templates.created_by IS 'User who created this template';
COMMENT ON COLUMN templates.created_at IS 'When the template was created (UTC timestamp)';
COMMENT ON COLUMN templates.updated_at IS 'When the template was last updated (UTC timestamp)';
