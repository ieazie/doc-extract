-- Migration 005a: Create extraction_fields table
-- Created: 2025-01-14
-- Description: Create extraction_fields table for field-level extraction data

-- ============================================================================
-- CREATE EXTRACTION_FIELDS TABLE
-- ============================================================================

-- Create extraction_fields table
CREATE TABLE extraction_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extraction_id UUID NOT NULL REFERENCES extractions(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_value TEXT,
    confidence_score DECIMAL(5,4) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)), -- 0.0000 to 1.0000
    field_type VARCHAR(50), -- text, number, date, boolean, etc.
    validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')),
    validation_message TEXT,
    is_required BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for extraction_id queries (most common)
CREATE INDEX idx_extraction_fields_extraction_id ON extraction_fields(extraction_id);

-- Index for field_name queries
CREATE INDEX idx_extraction_fields_field_name ON extraction_fields(field_name);

-- Index for confidence_score queries
CREATE INDEX idx_extraction_fields_confidence_score ON extraction_fields(confidence_score);

-- Index for validation_status queries
CREATE INDEX idx_extraction_fields_validation_status ON extraction_fields(validation_status);

-- Index for field_type queries
CREATE INDEX idx_extraction_fields_field_type ON extraction_fields(field_type);

-- Index for is_required queries
CREATE INDEX idx_extraction_fields_is_required ON extraction_fields(is_required);

-- Composite index for extraction + field_name (unique constraint support)
CREATE INDEX idx_extraction_fields_extraction_field_name ON extraction_fields(extraction_id, field_name);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE extraction_fields IS 'Field-level data extracted from documents';
COMMENT ON COLUMN extraction_fields.id IS 'Primary key for the extraction field';
COMMENT ON COLUMN extraction_fields.extraction_id IS 'Extraction this field belongs to';
COMMENT ON COLUMN extraction_fields.field_name IS 'Name of the extracted field';
COMMENT ON COLUMN extraction_fields.field_value IS 'Value extracted for this field';
COMMENT ON COLUMN extraction_fields.confidence_score IS 'Confidence score (0.0 to 1.0) for this field extraction';
COMMENT ON COLUMN extraction_fields.field_type IS 'Type of the field (text, number, date, boolean, etc.)';
COMMENT ON COLUMN extraction_fields.validation_status IS 'Status of field validation';
COMMENT ON COLUMN extraction_fields.validation_message IS 'Message from field validation';
COMMENT ON COLUMN extraction_fields.is_required IS 'Whether this field is required in the template';
COMMENT ON COLUMN extraction_fields.created_at IS 'When the field was extracted (UTC timestamp)';
COMMENT ON COLUMN extraction_fields.updated_at IS 'When the field was last updated (UTC timestamp)';
