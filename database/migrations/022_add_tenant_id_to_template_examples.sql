-- Migration 022: Add tenant_id to template_examples table
-- Created: 2025-01-14
-- Description: Add tenant isolation to template_examples table for proper multi-tenant security

-- ============================================================================
-- ADD TENANT_ID COLUMN TO TEMPLATE_EXAMPLES
-- ============================================================================

-- Add tenant_id column to template_examples table (nullable first)
ALTER TABLE template_examples 
ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- ============================================================================
-- POPULATE TENANT_ID FROM PARENT TEMPLATES
-- ============================================================================

-- Update existing template_examples with tenant_id from their parent templates
UPDATE template_examples 
SET tenant_id = t.tenant_id
FROM templates t
WHERE template_examples.template_id = t.id;

-- Now make tenant_id NOT NULL after populating data
ALTER TABLE template_examples 
ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================================================
-- UPDATE CONSTRAINTS AND INDEXES
-- ============================================================================

-- Drop the old unique constraint
ALTER TABLE template_examples 
DROP CONSTRAINT unique_template_example_name;

-- Add new unique constraint that includes tenant_id
ALTER TABLE template_examples 
ADD CONSTRAINT unique_template_example_name UNIQUE (tenant_id, template_id, name);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for tenant_id queries (most common for multi-tenant apps)
CREATE INDEX idx_template_examples_tenant_id ON template_examples(tenant_id);

-- Composite index for tenant_id + template_id queries
CREATE INDEX idx_template_examples_tenant_template ON template_examples(tenant_id, template_id);

-- Composite index for tenant_id + name queries
CREATE INDEX idx_template_examples_tenant_name ON template_examples(tenant_id, name);

-- Composite index for tenant_id + is_validated queries
CREATE INDEX idx_template_examples_tenant_validated ON template_examples(tenant_id, is_validated);

-- ============================================================================
-- UPDATE COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN template_examples.tenant_id IS 'Tenant this template example belongs to (inherited from template)';
COMMENT ON CONSTRAINT unique_template_example_name ON template_examples IS 'Ensures unique example names per tenant per template';

-- ============================================================================
-- VERIFY DATA INTEGRITY
-- ============================================================================

-- Verify that all template_examples now have tenant_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM template_examples WHERE tenant_id IS NULL) THEN
        RAISE EXCEPTION 'Migration failed: Some template_examples still have NULL tenant_id';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully: All template_examples now have tenant_id';
END $$;
