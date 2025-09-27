-- Migration 008a: Create template_usage table
-- Created: 2025-01-14
-- Description: Create template_usage table for tracking template usage statistics

-- ============================================================================
-- CREATE TEMPLATE_USAGE TABLE
-- ============================================================================

-- Create template_usage table
CREATE TABLE template_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    extraction_id UUID REFERENCES extractions(id) ON DELETE SET NULL,
    used_by UUID REFERENCES users(id) ON DELETE SET NULL,
    usage_type VARCHAR(20) DEFAULT 'extraction' CHECK (usage_type IN ('extraction', 'test', 'preview', 'training')),
    success BOOLEAN,
    processing_time_seconds INTEGER,
    confidence_score DECIMAL(5,4), -- 0.0000 to 1.0000
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for template_id queries (most common)
CREATE INDEX idx_template_usage_template_id ON template_usage(template_id);

-- Index for document_id queries
CREATE INDEX idx_template_usage_document_id ON template_usage(document_id);

-- Index for extraction_id queries
CREATE INDEX idx_template_usage_extraction_id ON template_usage(extraction_id);

-- Index for used_by queries
CREATE INDEX idx_template_usage_used_by ON template_usage(used_by);

-- Index for usage_type queries
CREATE INDEX idx_template_usage_usage_type ON template_usage(usage_type);

-- Index for success queries
CREATE INDEX idx_template_usage_success ON template_usage(success);

-- Index for created_at (sorting and time-based queries)
CREATE INDEX idx_template_usage_created_at ON template_usage(created_at DESC);

-- Composite index for template + usage_type queries
CREATE INDEX idx_template_usage_template_type ON template_usage(template_id, usage_type);

-- Composite index for template + success queries
CREATE INDEX idx_template_usage_template_success ON template_usage(template_id, success);

-- Index for confidence_score (quality analysis)
CREATE INDEX idx_template_usage_confidence_score ON template_usage(confidence_score);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE template_usage IS 'Usage statistics and tracking for templates';
COMMENT ON COLUMN template_usage.id IS 'Primary key for the usage record';
COMMENT ON COLUMN template_usage.template_id IS 'Template that was used';
COMMENT ON COLUMN template_usage.document_id IS 'Document that was processed';
COMMENT ON COLUMN template_usage.extraction_id IS 'Extraction result (if applicable)';
COMMENT ON COLUMN template_usage.used_by IS 'User who used the template';
COMMENT ON COLUMN template_usage.usage_type IS 'Type of usage (extraction, test, preview, training)';
COMMENT ON COLUMN template_usage.success IS 'Whether the usage was successful';
COMMENT ON COLUMN template_usage.processing_time_seconds IS 'Time taken to process in seconds';
COMMENT ON COLUMN template_usage.confidence_score IS 'Confidence score of the result (0.0 to 1.0)';
COMMENT ON COLUMN template_usage.created_at IS 'When the template was used (UTC timestamp)';
