-- Migration 023: Optimize template_examples indexes for multi-tenant queries
-- Created: 2025-01-14
-- Description: Replace single-column indexes with tenant-aware composite indexes for optimal multi-tenant query performance

-- ============================================================================
-- DROP NON-TENANT-AWARE INDEXES
-- ============================================================================

-- Drop indexes that don't lead with tenant_id (will be replaced with tenant-aware versions)
DROP INDEX IF EXISTS idx_template_examples_template_id;
DROP INDEX IF EXISTS idx_template_examples_name;
DROP INDEX IF EXISTS idx_template_examples_is_validated;
DROP INDEX IF EXISTS idx_template_examples_source_document_id;
DROP INDEX IF EXISTS idx_template_examples_created_by_user;
DROP INDEX IF EXISTS idx_template_examples_template_name;

-- ============================================================================
-- CREATE TENANT-AWARE INDEXES
-- ============================================================================

-- Template queries (most common in multi-tenant apps)
CREATE INDEX IF NOT EXISTS idx_template_examples_tenant_template ON template_examples(tenant_id, template_id);

-- Name queries (tenant-scoped)
CREATE INDEX IF NOT EXISTS idx_template_examples_tenant_name ON template_examples(tenant_id, name);

-- Validation status queries (tenant-scoped)
CREATE INDEX IF NOT EXISTS idx_template_examples_tenant_validated ON template_examples(tenant_id, is_validated);

-- Source document queries (tenant-scoped)
CREATE INDEX IF NOT EXISTS idx_template_examples_tenant_source_doc ON template_examples(tenant_id, source_document_id);

-- Created by user queries (tenant-scoped)
CREATE INDEX IF NOT EXISTS idx_template_examples_tenant_created_by ON template_examples(tenant_id, created_by_user);

-- Template + name queries (tenant-scoped) - replaces the old template_name index
CREATE INDEX IF NOT EXISTS idx_template_examples_tenant_template_name ON template_examples(tenant_id, template_id, name);

-- ============================================================================
-- KEEP EXISTING TENANT-AWARE INDEXES
-- ============================================================================

-- These indexes are already tenant-aware and optimal:
-- - idx_template_examples_tenant_id (single tenant_id index)
-- - idx_template_examples_tenant_template (already exists)
-- - idx_template_examples_tenant_name (already exists) 
-- - idx_template_examples_tenant_validated (already exists)
-- - idx_template_examples_created_at (time-based, doesn't need tenant_id)
-- - unique_template_example_name (already includes tenant_id)

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_template_examples_tenant_template IS 'Optimized for tenant-scoped template queries';
COMMENT ON INDEX idx_template_examples_tenant_name IS 'Optimized for tenant-scoped name searches';
COMMENT ON INDEX idx_template_examples_tenant_validated IS 'Optimized for tenant-scoped validation status queries';
COMMENT ON INDEX idx_template_examples_tenant_source_doc IS 'Optimized for tenant-scoped source document queries';
COMMENT ON INDEX idx_template_examples_tenant_created_by IS 'Optimized for tenant-scoped user queries';
COMMENT ON INDEX idx_template_examples_tenant_template_name IS 'Optimized for tenant-scoped template+name queries';

-- ============================================================================
-- VERIFY INDEX OPTIMIZATION
-- ============================================================================

-- Verify that all indexes now lead with tenant_id (except time-based and primary key)
DO $$
DECLARE
    non_tenant_indexes INTEGER;
BEGIN
    SELECT COUNT(*) INTO non_tenant_indexes
    FROM pg_indexes 
    WHERE tablename = 'template_examples' 
      AND indexname NOT IN ('template_examples_pkey', 'unique_template_example_name', 'idx_template_examples_created_at')
      AND indexdef NOT LIKE '%tenant_id%';
    
    IF non_tenant_indexes > 0 THEN
        RAISE EXCEPTION 'Migration failed: % indexes still exist without tenant_id leading column', non_tenant_indexes;
    END IF;
    
    RAISE NOTICE 'Migration completed successfully: All query indexes now optimized for multi-tenant access patterns';
END $$;
