-- Migration 017: Fix document_categories tenant isolation
-- Created: 2025-01-28
-- Description: Make tenant_id NOT NULL in document_categories to enforce tenant isolation

-- ============================================================================
-- FIX DOCUMENT_CATEGORIES TENANT ISOLATION
-- ============================================================================

-- First, ensure all existing categories have a tenant_id
-- Update any NULL tenant_id records to use the default tenant
UPDATE document_categories 
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- Verify no NULL tenant_id records remain
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count 
    FROM document_categories 
    WHERE tenant_id IS NULL;
    
    IF null_count > 0 THEN
        RAISE EXCEPTION 'Found % categories with NULL tenant_id after update. Cannot proceed with NOT NULL constraint.', null_count;
    END IF;
    
    RAISE NOTICE 'All % categories now have tenant_id assigned.', 
        (SELECT COUNT(*) FROM document_categories);
END $$;

-- Now make tenant_id NOT NULL
ALTER TABLE document_categories 
    ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================================================
-- VERIFY UNIQUE CONSTRAINT INTEGRITY
-- ============================================================================

-- Check for any duplicate (tenant_id, name) combinations
DO $$
DECLARE
    duplicate_count INTEGER;
    duplicate_records RECORD;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT tenant_id, name, COUNT(*) as cnt
        FROM document_categories
        GROUP BY tenant_id, name
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE WARNING 'Found % duplicate (tenant_id, name) combinations:', duplicate_count;
        
        -- Show details of duplicates
        FOR duplicate_records IN
            SELECT tenant_id, name, COUNT(*) as count
            FROM document_categories
            GROUP BY tenant_id, name
            HAVING COUNT(*) > 1
            ORDER BY tenant_id, name
        LOOP
            RAISE WARNING 'Duplicate: tenant_id=%, name=%, count=%', 
                duplicate_records.tenant_id, 
                duplicate_records.name, 
                duplicate_records.count;
        END LOOP;
        
        RAISE WARNING 'The UNIQUE constraint may fail due to existing duplicates.';
    ELSE
        RAISE NOTICE 'No duplicate (tenant_id, name) combinations found. Unique constraint is intact.';
    END IF;
END $$;

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN document_categories.tenant_id IS 
'Tenant ID for tenant isolation. NOT NULL ensures every category belongs to a specific tenant, preventing cross-tenant data leaks and enabling proper unique constraint behavior.';

-- ============================================================================
-- VERIFY FINAL STATE
-- ============================================================================

-- Final verification that tenant isolation is working
DO $$
DECLARE
    category_count INTEGER;
    tenant_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM document_categories;
    SELECT COUNT(DISTINCT tenant_id) INTO tenant_count FROM document_categories;
    
    RAISE NOTICE 'Document categories tenant isolation verification:';
    RAISE NOTICE '  Total categories: %', category_count;
    RAISE NOTICE '  Distinct tenants: %', tenant_count;
    RAISE NOTICE '  Categories with tenant_id: %', 
        (SELECT COUNT(*) FROM document_categories WHERE tenant_id IS NOT NULL);
    
    IF category_count = (SELECT COUNT(*) FROM document_categories WHERE tenant_id IS NOT NULL) THEN
        RAISE NOTICE '✅ All categories have tenant_id assigned.';
    ELSE
        RAISE EXCEPTION '❌ Some categories still missing tenant_id.';
    END IF;
END $$;
