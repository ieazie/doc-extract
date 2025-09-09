-- Phase 6.2A: Review Workflow Database Migration
-- Add review workflow fields to extractions table

-- Add review workflow columns to extractions table
ALTER TABLE extractions 
ADD COLUMN review_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN assigned_reviewer VARCHAR(100),
ADD COLUMN review_comments TEXT,
ADD COLUMN review_completed_at TIMESTAMP WITH TIME ZONE;

-- Add check constraint for review_status
ALTER TABLE extractions 
ADD CONSTRAINT check_review_status 
CHECK (review_status IN ('pending', 'in_review', 'approved', 'rejected', 'needs_correction'));

-- Create index for review_status for better query performance
CREATE INDEX idx_extractions_review_status ON extractions(review_status);

-- Create index for assigned_reviewer for reviewer queries
CREATE INDEX idx_extractions_assigned_reviewer ON extractions(assigned_reviewer);

-- Update existing extractions to have 'pending' review_status
UPDATE extractions SET review_status = 'pending' WHERE review_status IS NULL;

-- Add comment to the table
COMMENT ON COLUMN extractions.review_status IS 'Review workflow status: pending, in_review, approved, rejected, needs_correction';
COMMENT ON COLUMN extractions.assigned_reviewer IS 'Username or ID of the assigned reviewer';
COMMENT ON COLUMN extractions.review_comments IS 'Comments from the reviewer about the extraction';
COMMENT ON COLUMN extractions.review_completed_at IS 'Timestamp when the review was completed';
