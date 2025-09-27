-- Migration 004c: Create extractions table
-- Created: 2025-01-14
-- Description: Create extractions table for storing extraction results

-- ============================================================================
-- CREATE EXTRACTIONS TABLE
-- ============================================================================

-- Create extractions table
CREATE TABLE extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reviewed')),
    confidence_score DECIMAL(5,4), -- 0.0000 to 1.0000
    extracted_data JSONB DEFAULT '{}',
    raw_response TEXT,
    error_message TEXT,
    processing_time_seconds INTEGER,
    llm_model VARCHAR(100),
    llm_provider VARCHAR(50),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure one extraction per document per template
    CONSTRAINT unique_document_template_extraction UNIQUE (document_id, template_id)
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for tenant_id queries (most common)
CREATE INDEX idx_extractions_tenant_id ON extractions(tenant_id);

-- Index for document_id queries
CREATE INDEX idx_extractions_document_id ON extractions(document_id);

-- Index for template_id queries
CREATE INDEX idx_extractions_template_id ON extractions(template_id);

-- Index for status queries
CREATE INDEX idx_extractions_status ON extractions(status);

-- Index for created_by queries
CREATE INDEX idx_extractions_created_by ON extractions(created_by);

-- Composite index for tenant + status queries
CREATE INDEX idx_extractions_tenant_status ON extractions(tenant_id, status);

-- Composite index for document + template queries
CREATE INDEX idx_extractions_document_template ON extractions(document_id, template_id);

-- Index for confidence score (quality filtering)
CREATE INDEX idx_extractions_confidence_score ON extractions(confidence_score);

-- Index for created_at (sorting)
CREATE INDEX idx_extractions_created_at ON extractions(created_at DESC);

-- Index for LLM model queries
CREATE INDEX idx_extractions_llm_model ON extractions(llm_model);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE extractions IS 'Results of data extraction from documents using templates';
COMMENT ON COLUMN extractions.id IS 'Primary key for the extraction';
COMMENT ON COLUMN extractions.tenant_id IS 'Tenant this extraction belongs to';
COMMENT ON COLUMN extractions.document_id IS 'Document that was processed';
COMMENT ON COLUMN extractions.template_id IS 'Template used for extraction';
COMMENT ON COLUMN extractions.status IS 'Current status of the extraction';
COMMENT ON COLUMN extractions.confidence_score IS 'Confidence score (0.0 to 1.0) for the extraction quality';
COMMENT ON COLUMN extractions.extracted_data IS 'JSON data extracted from the document';
COMMENT ON COLUMN extractions.raw_response IS 'Raw response from the LLM';
COMMENT ON COLUMN extractions.error_message IS 'Error message if extraction failed';
COMMENT ON COLUMN extractions.processing_time_seconds IS 'Time taken to process the extraction in seconds';
COMMENT ON COLUMN extractions.llm_model IS 'LLM model used for extraction';
COMMENT ON COLUMN extractions.llm_provider IS 'LLM provider used (e.g., openai, anthropic)';
COMMENT ON COLUMN extractions.created_by IS 'User who initiated the extraction';
COMMENT ON COLUMN extractions.created_at IS 'When the extraction was created (UTC timestamp)';
COMMENT ON COLUMN extractions.updated_at IS 'When the extraction was last updated (UTC timestamp)';
COMMENT ON COLUMN extractions.completed_at IS 'When the extraction was completed (UTC timestamp)';
