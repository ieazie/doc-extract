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
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    example_name VARCHAR(255),
    input_data TEXT, -- Document content or reference
    expected_output JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for template_id queries (most common)
CREATE INDEX idx_template_examples_template_id ON template_examples(template_id);

-- Index for document_id queries
CREATE INDEX idx_template_examples_document_id ON template_examples(document_id);

-- Index for is_active queries
CREATE INDEX idx_template_examples_is_active ON template_examples(is_active);

-- Index for created_by queries
CREATE INDEX idx_template_examples_created_by ON template_examples(created_by);

-- Composite index for template + active queries
CREATE INDEX idx_template_examples_template_active ON template_examples(template_id, is_active);

-- Index for sort_order queries
CREATE INDEX idx_template_examples_sort_order ON template_examples(template_id, sort_order);

-- Index for created_at (sorting)
CREATE INDEX idx_template_examples_created_at ON template_examples(created_at DESC);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE template_examples IS 'Examples for few-shot learning in templates';
COMMENT ON COLUMN template_examples.id IS 'Primary key for the template example';
COMMENT ON COLUMN template_examples.template_id IS 'Template this example belongs to';
COMMENT ON COLUMN template_examples.document_id IS 'Document used as example (if applicable)';
COMMENT ON COLUMN template_examples.example_name IS 'Name/description of the example';
COMMENT ON COLUMN template_examples.input_data IS 'Input document content or reference for the example';
COMMENT ON COLUMN template_examples.expected_output IS 'Expected JSON output for this example';
COMMENT ON COLUMN template_examples.is_active IS 'Whether this example is active and should be used';
COMMENT ON COLUMN template_examples.sort_order IS 'Sort order for displaying examples';
COMMENT ON COLUMN template_examples.created_by IS 'User who created this example';
COMMENT ON COLUMN template_examples.created_at IS 'When the example was created (UTC timestamp)';
COMMENT ON COLUMN template_examples.updated_at IS 'When the example was last updated (UTC timestamp)';
