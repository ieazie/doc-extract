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
    -- IMPORTANT: Truncate to 100 chars BEFORE final trim to ensure constraint compliance
    RETURN TRIM(BOTH '-' FROM LEFT(
           regexp_replace(
             regexp_replace(
               regexp_replace(lower(trim(tenant_name)), '[^a-z0-9\s-]', '', 'g'),
               '\s+', '-', 'g'
             ),
             '-+', '-', 'g'
           ), 100
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
         ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) AS rn
  FROM tenants
  WHERE slug IS NOT NULL
)
UPDATE tenants t
SET slug = left(t.slug, 100 - 1 - 8) || '-' || substring(t.id::text, 1, 8)
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
    CHECK (
      slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      AND char_length(slug) BETWEEN 3 AND 100
    ),
  ADD CONSTRAINT unique_tenant_slug UNIQUE (slug),
  ALTER COLUMN slug SET NOT NULL;

-- ============================================================================
-- CONSTRAINT VERIFICATION
-- ============================================================================

-- Intentionally omit DML-based tests to keep migration deterministic and decoupled from other table constraints/extensions.
-- Constraint validation should be performed in separate test suites or CI jobs, not in migrations.

-- ============================================================================
-- CLEANUP
-- ============================================================================

-- Drop helper function
DROP FUNCTION IF EXISTS public.generate_tenant_slug(TEXT);

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
    
    SELECT string_agg(slug, ', ' ORDER BY id) INTO sample_slugs
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
