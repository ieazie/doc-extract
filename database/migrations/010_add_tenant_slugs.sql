-- Migration 010: Add Tenant Slugs
-- Created: 2025-01-14
-- Description: Add unique slug field to tenants table for better resource identification

-- ============================================================================
-- ADD SLUG COLUMN (NO CONSTRAINTS YET)
-- ============================================================================

-- Add slug column to tenants table
ALTER TABLE tenants ADD COLUMN slug VARCHAR(100);

-- ============================================================================
-- IMPROVED SLUG GENERATION FUNCTION
-- ============================================================================

-- Create improved function to generate slug from tenant name
CREATE OR REPLACE FUNCTION generate_tenant_slug(tenant_name TEXT) 
RETURNS TEXT AS $$
BEGIN
    -- lowercase, allow a-z0-9 and hyphens, collapse spaces to hyphens, trim hyphens
    RETURN TRIM(BOTH '-' FROM regexp_replace(
           regexp_replace(
             regexp_replace(lower(trim(tenant_name)), '[^a-z0-9\s-]', '', 'g'),
             '\s+', '-', 'g'
           ),
           '-+', '-', 'g'
         ));
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- BACKFILL SLUGS WITH SAFER APPROACH
-- ============================================================================

-- Initial backfill (may produce empty/short slugs)
UPDATE tenants
SET slug = generate_tenant_slug(name)
WHERE slug IS NULL;

-- Fix empties/too short slugs
UPDATE tenants
SET slug = 'tenant-' || substring(id::text, 1, 8)
WHERE slug IS NULL OR length(slug) < 3;

-- Resolve duplicates deterministically
WITH dups AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at, id) AS rn
  FROM tenants
  WHERE slug IS NOT NULL
)
UPDATE tenants t
SET slug = t.slug || '-' || substring(t.id::text, 1, 8)
FROM dups d
WHERE t.id = d.id AND d.rn > 1;

-- ============================================================================
-- VERIFY DATA BEFORE ADDING CONSTRAINTS
-- ============================================================================

-- Verify all tenants have valid slugs before adding constraints
DO $$
DECLARE
    invalid_count INTEGER;
    duplicate_count INTEGER;
    empty_count INTEGER;
BEGIN
    -- Check for invalid format slugs
    SELECT COUNT(*) INTO invalid_count
    FROM tenants 
    WHERE slug IS NULL 
       OR slug !~ '^[a-z0-9-]+$' 
       OR length(slug) < 3 
       OR length(slug) > 100;
    
    -- Check for duplicates
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT slug, COUNT(*) as cnt
        FROM tenants 
        WHERE slug IS NOT NULL
        GROUP BY slug 
        HAVING COUNT(*) > 1
    ) dup_check;
    
    -- Check for empty slugs
    SELECT COUNT(*) INTO empty_count
    FROM tenants 
    WHERE slug IS NULL OR trim(slug) = '';
    
    RAISE NOTICE 'Slug validation results:';
    RAISE NOTICE '  Invalid format slugs: %', invalid_count;
    RAISE NOTICE '  Duplicate slugs: %', duplicate_count;
    RAISE NOTICE '  Empty slugs: %', empty_count;
    
    IF invalid_count > 0 OR duplicate_count > 0 OR empty_count > 0 THEN
        RAISE EXCEPTION 'Cannot add constraints: % invalid slugs, % duplicates, % empty slugs found', 
            invalid_count, duplicate_count, empty_count;
    ELSE
        RAISE NOTICE '✅ All slugs are valid - proceeding with constraints';
    END IF;
END $$;

-- ============================================================================
-- ADD CONSTRAINTS AFTER DATA IS VALID
-- ============================================================================

-- Add constraints after data is valid
ALTER TABLE tenants
  ADD CONSTRAINT valid_tenant_slug
    CHECK (slug ~ '^[a-z0-9-]+$' AND length(slug) >= 3 AND length(slug) <= 100),
  ADD CONSTRAINT unique_tenant_slug UNIQUE (slug),
  ALTER COLUMN slug SET NOT NULL;

-- ============================================================================
-- VERIFY CONSTRAINTS WORK
-- ============================================================================

-- Test that constraints work by trying to insert invalid data
DO $$
BEGIN
    RAISE NOTICE 'Testing constraints...';
    
    -- This should fail due to format constraint
    BEGIN
        INSERT INTO tenants (id, name, slug, status, environment) 
        VALUES (gen_random_uuid(), 'Test Tenant', 'Invalid Slug!', 'ACTIVE', 'development');
        RAISE EXCEPTION '❌ Format constraint failed - invalid slug was accepted';
    EXCEPTION 
        WHEN check_violation THEN
            RAISE NOTICE '✅ Format constraint working - invalid slug rejected';
    END;
    
    -- This should fail due to length constraint
    BEGIN
        INSERT INTO tenants (id, name, slug, status, environment) 
        VALUES (gen_random_uuid(), 'Test Tenant', 'ab', 'ACTIVE', 'development');
        RAISE EXCEPTION '❌ Length constraint failed - too short slug was accepted';
    EXCEPTION 
        WHEN check_violation THEN
            RAISE NOTICE '✅ Length constraint working - too short slug rejected';
    END;
    
    -- This should fail due to unique constraint
    BEGIN
        INSERT INTO tenants (id, name, slug, status, environment) 
        VALUES (gen_random_uuid(), 'Test Tenant', (SELECT slug FROM tenants LIMIT 1), 'active', 'development');
        RAISE EXCEPTION '❌ Unique constraint failed - duplicate slug was accepted';
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE NOTICE '✅ Unique constraint working - duplicate slug rejected';
    END;
    
    -- This should fail due to NOT NULL constraint
    BEGIN
        INSERT INTO tenants (id, name, slug, status, environment) 
        VALUES (gen_random_uuid(), 'Test Tenant', NULL, 'active', 'development');
        RAISE EXCEPTION '❌ NOT NULL constraint failed - NULL slug was accepted';
    EXCEPTION 
        WHEN not_null_violation THEN
            RAISE NOTICE '✅ NOT NULL constraint working - NULL slug rejected';
    END;
    
    RAISE NOTICE '✅ All constraints are working correctly';
END $$;

-- ============================================================================
-- CLEANUP
-- ============================================================================

-- Drop helper function
DROP FUNCTION generate_tenant_slug(TEXT);

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

-- Show final state of tenant slugs
DO $$
DECLARE
    total_tenants INTEGER;
    valid_slugs INTEGER;
    sample_slugs TEXT;
BEGIN
    SELECT COUNT(*) INTO total_tenants FROM tenants;
    
    SELECT COUNT(*) INTO valid_slugs
    FROM tenants 
    WHERE slug ~ '^[a-z0-9-]+$' 
      AND length(slug) >= 3 
      AND length(slug) <= 100;
    
    SELECT string_agg(slug, ', ' ORDER BY created_at) INTO sample_slugs
    FROM tenants;
    
    RAISE NOTICE 'Final tenant slugs summary:';
    RAISE NOTICE '  Total tenants: %', total_tenants;
    RAISE NOTICE '  Valid slugs: %', valid_slugs;
    RAISE NOTICE '  Sample slugs: %', sample_slugs;
    
    IF valid_slugs = total_tenants THEN
        RAISE NOTICE '✅ All tenant slugs are valid';
    ELSE
        RAISE WARNING '❌ % tenants have invalid slugs', (total_tenants - valid_slugs);
    END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN tenants.slug IS 'Unique, URL-safe identifier for the tenant (e.g., acme-corp)';
COMMENT ON CONSTRAINT valid_tenant_slug ON tenants IS 'Ensures slug contains only lowercase letters, numbers, and hyphens, 3-100 characters';
COMMENT ON CONSTRAINT unique_tenant_slug ON tenants IS 'Ensures each tenant has a unique slug';
