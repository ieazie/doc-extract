-- Migration 024: Fix created_at index to be tenant-aware for multi-tenant sorting
-- Created: 2025-01-14
-- Description: Replace single-column created_at index with tenant-aware composite index for optimal multi-tenant sorting performance

-- ============================================================================
-- DROP NON-TENANT-AWARE CREATED_AT INDEX
-- ============================================================================

-- Drop the current created_at index that doesn't include tenant_id
DROP INDEX IF EXISTS idx_template_examples_created_at;

-- ============================================================================
-- CREATE TENANT-AWARE CREATED_AT INDEX
-- ============================================================================

-- Create tenant-aware created_at index for optimal sorting queries
CREATE INDEX idx_template_examples_tenant_created_at ON template_examples(tenant_id, created_at DESC);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_template_examples_tenant_created_at IS 'Optimized for tenant-scoped sorting by creation date (newest first)';

-- ============================================================================
-- VERIFY INDEX OPTIMIZATION
-- ============================================================================

-- Verify that the new index exists and is tenant-aware
DO $$
DECLARE
    index_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'template_examples' 
          AND indexname = 'idx_template_examples_tenant_created_at'
          AND indexdef LIKE '%tenant_id%'
          AND indexdef LIKE '%created_at%'
    ) INTO index_exists;
    
    IF NOT index_exists THEN
        RAISE EXCEPTION 'Migration failed: Tenant-aware created_at index was not created properly';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully: created_at index is now tenant-aware for optimal sorting performance';
END $$;
