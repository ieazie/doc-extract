-- Migration 021: Fix extractions table schema mismatch
-- This migration addresses mismatches between the SQLAlchemy Extraction model and the actual database schema.
-- It adds missing columns and renames columns to match the model expectations.

-- ============================================================================
-- ADD MISSING COLUMNS
-- ============================================================================

-- Add results column (renamed from extracted_data concept)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'extractions' AND column_name = 'results') THEN
        ALTER TABLE extractions ADD COLUMN results JSONB;
        -- Copy data from extracted_data if it exists
        UPDATE extractions SET results = extracted_data WHERE extracted_data IS NOT NULL;
    END IF;
END $$;

-- Add confidence_scores column (plural version)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'extractions' AND column_name = 'confidence_scores') THEN
        ALTER TABLE extractions ADD COLUMN confidence_scores JSONB;
        -- Copy data from confidence_score if it exists
        UPDATE extractions SET confidence_scores = jsonb_build_object('overall', confidence_score) WHERE confidence_score IS NOT NULL;
    END IF;
END $$;

-- Add processing_time column (milliseconds, renamed from processing_time_seconds)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'extractions' AND column_name = 'processing_time') THEN
        ALTER TABLE extractions ADD COLUMN processing_time INTEGER;
        -- Convert seconds to milliseconds if processing_time_seconds exists
        UPDATE extractions SET processing_time = processing_time_seconds * 1000 WHERE processing_time_seconds IS NOT NULL;
    END IF;
END $$;

-- Add review workflow columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'extractions' AND column_name = 'reviewed_by') THEN
        ALTER TABLE extractions ADD COLUMN reviewed_by VARCHAR(100);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'extractions' AND column_name = 'reviewed_at') THEN
        ALTER TABLE extractions ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'extractions' AND column_name = 'review_status') THEN
        ALTER TABLE extractions ADD COLUMN review_status VARCHAR(50) DEFAULT 'pending';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'extractions' AND column_name = 'assigned_reviewer') THEN
        ALTER TABLE extractions ADD COLUMN assigned_reviewer VARCHAR(100);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'extractions' AND column_name = 'review_comments') THEN
        ALTER TABLE extractions ADD COLUMN review_comments TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'extractions' AND column_name = 'review_completed_at') THEN
        ALTER TABLE extractions ADD COLUMN review_completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- ============================================================================
-- ADD CONSTRAINTS AND INDEXES
-- ============================================================================

-- Add check constraint for review_status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'extractions_review_status_check') THEN
        ALTER TABLE extractions ADD CONSTRAINT extractions_review_status_check CHECK (review_status IN ('pending', 'in_review', 'approved', 'rejected', 'needs_correction'));
    END IF;
END $$;

-- Add indexes for review workflow
CREATE INDEX IF NOT EXISTS idx_extractions_review_status ON extractions(review_status);
CREATE INDEX IF NOT EXISTS idx_extractions_assigned_reviewer ON extractions(assigned_reviewer);
CREATE INDEX IF NOT EXISTS idx_extractions_reviewed_by ON extractions(reviewed_by);
