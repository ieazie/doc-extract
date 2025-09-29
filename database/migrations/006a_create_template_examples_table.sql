-- Migration 006a: Create template_examples table
-- Created: 2025-01-14
-- Description: Create template_examples table for few-shot learning examples

-- ============================================================================
-- CREATE TEMPLATE_EXAMPLES TABLE
-- ============================================================================

-- Create template_examples table
CREATE TABLE template_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    document_snippet TEXT NOT NULL,
    expected_output JSONB NOT NULL DEFAULT '{}',
    is_validated BOOLEAN DEFAULT false,
    validation_notes TEXT,
    source_document_id UUID,
    created_by_user VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique name per template
    CONSTRAINT unique_template_example_name UNIQUE (template_id, name)
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for template_id queries (most common)
CREATE INDEX idx_template_examples_template_id ON template_examples(template_id);

-- Index for name queries
CREATE INDEX idx_template_examples_name ON template_examples(name);

-- Index for validated examples
CREATE INDEX idx_template_examples_is_validated ON template_examples(is_validated);

-- Index for source_document_id queries
CREATE INDEX idx_template_examples_source_document_id ON template_examples(source_document_id);

-- Index for created_by_user queries
CREATE INDEX idx_template_examples_created_by_user ON template_examples(created_by_user);

-- Note: UNIQUE constraint on (template_id, name) already creates a btree index
-- No need for explicit idx_template_examples_template_name index

-- Index for created_at (sorting)
CREATE INDEX idx_template_examples_created_at ON template_examples(created_at DESC);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE template_examples IS 'Examples for few-shot learning in templates';
COMMENT ON COLUMN template_examples.id IS 'Primary key for the template example';
COMMENT ON COLUMN template_examples.template_id IS 'Template this example belongs to';
COMMENT ON COLUMN template_examples.name IS 'Name/identifier for this example';
COMMENT ON COLUMN template_examples.document_snippet IS 'Document content snippet for this example';
COMMENT ON COLUMN template_examples.expected_output IS 'Expected JSON output for this example';
COMMENT ON COLUMN template_examples.is_validated IS 'Whether this example has been validated';
COMMENT ON COLUMN template_examples.validation_notes IS 'Notes about validation results';
COMMENT ON COLUMN template_examples.source_document_id IS 'Source document ID this example is based on';
COMMENT ON COLUMN template_examples.created_by_user IS 'User who created this example';
COMMENT ON COLUMN template_examples.created_at IS 'When the example was created (UTC timestamp)';
COMMENT ON COLUMN template_examples.updated_at IS 'When the example was last updated (UTC timestamp)';
COMMENT ON CONSTRAINT unique_template_example_name ON template_examples IS 'Ensures unique example names per template';
