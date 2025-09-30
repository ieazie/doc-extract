-- Migration 017: Fix document_categories tenant isolation
-- Created: 2025-01-28
-- Description: Make tenant_id NOT NULL in document_categories to enforce tenant isolation

-- ============================================================================
-- FIX DOCUMENT_CATEGORIES TENANT ISOLATION
-- ============================================================================

-- Take a lock early to avoid concurrent writes during pre-checks and backfill.
LOCK TABLE document_categories IN SHARE ROW EXCLUSIVE MODE;

-- Pre-check: will backfill create duplicates when collapsing NULLs into the fallback tenant?
DO $$
DECLARE
  dup_cnt INT;
BEGIN
  SELECT COUNT(*) INTO dup_cnt
  FROM (
    SELECT name, COUNT(*) 
    FROM document_categories
    WHERE tenant_id IS NULL
    GROUP BY name
    HAVING COUNT(*) > 1
  ) s;
  IF dup_cnt > 0 THEN
    RAISE EXCEPTION 'Backfill would create % duplicate (tenant_id, name) rows. Resolve or de-duplicate before migration.', dup_cnt;
  END IF;
END $$;

-- Pre-check: would backfill collide with existing rows for the fallback tenant?
DO $$
DECLARE
  fallback_tenant CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
  conflict_cnt INT;
BEGIN
  SELECT COUNT(*) INTO conflict_cnt
  FROM document_categories c_null
  JOIN document_categories c_fb
    ON c_fb.tenant_id = fallback_tenant
   AND c_fb.name = c_null.name
  WHERE c_null.tenant_id IS NULL;
  IF conflict_cnt > 0 THEN
    RAISE EXCEPTION 'Backfill would collide with % existing (tenant_id, name) rows on fallback tenant %.', conflict_cnt, fallback_tenant;
  END IF;
END $$;

-- First, ensure all existing categories have a tenant_id
-- Guard: ensure the chosen fallback tenant exists to avoid FK violations.
DO $$
DECLARE
  fallback_tenant CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
  exists_fk boolean;
  null_count INTEGER;
BEGIN
  -- Check if any NULL tenant_id records exist
  SELECT COUNT(*) INTO null_count 
  FROM document_categories 
  WHERE tenant_id IS NULL;
  
  IF null_count > 0 THEN
    RAISE NOTICE 'Found % categories with NULL tenant_id. Checking fallback tenant...', null_count;
    
    -- Verify the fallback tenant exists in the tenants table
    SELECT EXISTS(SELECT 1 FROM tenants WHERE id = fallback_tenant) INTO exists_fk;
    IF NOT exists_fk THEN
      RAISE EXCEPTION 'Fallback tenant % does not exist in tenants table. Create it or pick a valid tenant before backfill.', fallback_tenant;
    END IF;
    
    RAISE NOTICE 'Fallback tenant % exists. Proceeding with backfill...', fallback_tenant;
  ELSE
    RAISE NOTICE 'No NULL tenant_id records found. Skipping backfill.';
  END IF;
END $$;

-- Ensure new inserts get a tenant_id during the window
ALTER TABLE document_categories
  ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

-- Update any NULL tenant_id records to use the default tenant (only if NULLs exist)
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

-- Drop temporary default
ALTER TABLE document_categories
  ALTER COLUMN tenant_id DROP DEFAULT;

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
        RAISE EXCEPTION 'Found % duplicate (tenant_id, name) combinations. Resolve before proceeding.', duplicate_count;
        
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
        
        -- Fail migration rather than proceed with broken state.
        -- If you intentionally allow duplicates, downgrade to WARNING and handle later.
    ELSE
        RAISE NOTICE 'No duplicate (tenant_id, name) combinations found. Unique constraint is intact.';
    END IF;
END $$;

-- Enforce uniqueness going forward
ALTER TABLE document_categories
  ADD CONSTRAINT uq_document_categories_tenant_name UNIQUE (tenant_id, name);

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
