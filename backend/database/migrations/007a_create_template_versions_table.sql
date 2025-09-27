-- Migration 007a: Create template_versions table
-- Created: 2025-01-14
-- Description: Create template_versions table for template versioning and history

-- ============================================================================
-- CREATE TEMPLATE_VERSIONS TABLE
-- ============================================================================

-- Create template_versions table
CREATE TABLE template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    version_name VARCHAR(255),
    description TEXT,
    extraction_schema JSONB NOT NULL DEFAULT '{}',
    extraction_prompt TEXT,
    validation_rules JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_published BOOLEAN DEFAULT false NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique version per template
    CONSTRAINT unique_template_version UNIQUE (template_id, version_number),
    -- Ensure version is positive
    CONSTRAINT template_versions_version_positive CHECK (version_number > 0)
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for template_id queries (most common)
CREATE INDEX idx_template_versions_template_id ON template_versions(template_id);

-- Index for version_number queries
CREATE INDEX idx_template_versions_version_number ON template_versions(version_number);

-- Index for is_active queries
CREATE INDEX idx_template_versions_is_active ON template_versions(is_active);

-- Index for is_published queries
CREATE INDEX idx_template_versions_is_published ON template_versions(is_published);

-- Index for created_by queries
CREATE INDEX idx_template_versions_created_by ON template_versions(created_by);

-- Composite index for template + active queries
CREATE INDEX idx_template_versions_template_active ON template_versions(template_id, is_active);

-- Composite index for template + published queries
CREATE INDEX idx_template_versions_template_published ON template_versions(template_id, is_published);

-- Index for created_at (sorting)
CREATE INDEX idx_template_versions_created_at ON template_versions(created_at DESC);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE template_versions IS 'Version history for templates';
COMMENT ON COLUMN template_versions.id IS 'Primary key for the template version';
COMMENT ON COLUMN template_versions.template_id IS 'Template this version belongs to';
COMMENT ON COLUMN template_versions.version_number IS 'Version number (1, 2, 3, etc.)';
COMMENT ON COLUMN template_versions.version_name IS 'Human-readable name for this version';
COMMENT ON COLUMN template_versions.description IS 'Description of changes in this version';
COMMENT ON COLUMN template_versions.extraction_schema IS 'JSON schema for this version';
COMMENT ON COLUMN template_versions.extraction_prompt IS 'Extraction prompt for this version';
COMMENT ON COLUMN template_versions.validation_rules IS 'Validation rules for this version';
COMMENT ON COLUMN template_versions.is_active IS 'Whether this version is active';
COMMENT ON COLUMN template_versions.is_published IS 'Whether this version is published and can be used';
COMMENT ON COLUMN template_versions.created_by IS 'User who created this version';
COMMENT ON COLUMN template_versions.created_at IS 'When the version was created (UTC timestamp)';
COMMENT ON COLUMN template_versions.updated_at IS 'When the version was last updated (UTC timestamp)';
