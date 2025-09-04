-- Add status field to templates table
-- This migration adds support for draft, published, and archived template states

-- Add status column to templates table
ALTER TABLE templates 
ADD COLUMN status VARCHAR(20) DEFAULT 'draft' 
CHECK (status IN ('draft', 'published', 'archived'));

-- Add description column to templates table
ALTER TABLE templates 
ADD COLUMN description TEXT;

-- Update existing templates to be published by default
UPDATE templates SET status = 'published' WHERE status IS NULL;

-- Create index for status field
CREATE INDEX idx_templates_status ON templates(status);

-- Create index for tenant_id and status combination
CREATE INDEX idx_templates_tenant_status ON templates(tenant_id, status);
