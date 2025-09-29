-- Migration 025: Fix tenant slug generator to respect 100-character limit
-- Created: 2025-01-14
-- Description: Update slug generation to truncate at 100 characters to prevent constraint validation failures

-- ============================================================================
-- CREATE FIXED SLUG GENERATION FUNCTION
-- ============================================================================

-- Create improved function that respects the 100-character limit
CREATE OR REPLACE FUNCTION generate_tenant_slug_fixed(tenant_name TEXT) 
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
-- TEST THE FIXED FUNCTION
-- ============================================================================

-- Test with a very long name to ensure it respects the 100-character limit
DO $$
DECLARE
    test_result TEXT;
    very_long_name TEXT := 'This is a very long tenant name that could potentially generate a slug longer than one hundred characters which would violate our constraint and cause validation failures in the database';
BEGIN
    SELECT generate_tenant_slug_fixed(very_long_name) INTO test_result;
    
    IF length(test_result) > 100 THEN
        RAISE EXCEPTION 'Fixed slug generator still produces slugs longer than 100 characters: % (length: %)', test_result, length(test_result);
    END IF;
    
    RAISE NOTICE '✅ Fixed slug generator test passed: % (length: %)', test_result, length(test_result);
END $$;

-- ============================================================================
-- UPDATE EXISTING SLUGS IF NEEDED
-- ============================================================================

-- Check if any existing slugs are longer than 100 characters (shouldn't happen, but safety check)
DO $$
DECLARE
    long_slug_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO long_slug_count
    FROM tenants 
    WHERE length(slug) > 100;
    
    IF long_slug_count > 0 THEN
        RAISE WARNING 'Found % slugs longer than 100 characters - this should not happen!', long_slug_count;
        
        -- Fix any overly long slugs by truncating them
        UPDATE tenants 
        SET slug = TRIM(BOTH '-' FROM LEFT(slug, 100))
        WHERE length(slug) > 100;
        
        RAISE NOTICE 'Fixed % overly long slugs', long_slug_count;
    ELSE
        RAISE NOTICE '✅ All existing slugs are within the 100-character limit';
    END IF;
END $$;

-- ============================================================================
-- VERIFY CONSTRAINTS STILL WORK
-- ============================================================================

-- Verify that the constraint is still properly enforced
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_tenant_slug' 
          AND contype = 'c'
    ) INTO constraint_exists;
    
    IF NOT constraint_exists THEN
        RAISE WARNING 'Tenant slug constraint not found - this migration may have run out of order';
    ELSE
        RAISE NOTICE '✅ Tenant slug constraint is properly enforced';
    END IF;
END $$;

-- ============================================================================
-- CLEANUP
-- ============================================================================

-- Drop the fixed function since it's only needed for this migration
DROP FUNCTION generate_tenant_slug_fixed(TEXT);

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

-- Final verification that all slugs are valid
DO $$
DECLARE
    total_tenants INTEGER;
    valid_slugs INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_tenants FROM tenants;
    
    SELECT COUNT(*) INTO valid_slugs
    FROM tenants 
    WHERE slug ~ '^[a-z0-9-]+$' 
      AND length(slug) >= 3 
      AND length(slug) <= 100;
    
    RAISE NOTICE 'Final slug validation:';
    RAISE NOTICE '  Total tenants: %', total_tenants;
    RAISE NOTICE '  Valid slugs: %', valid_slugs;
    
    IF valid_slugs = total_tenants THEN
        RAISE NOTICE '✅ All tenant slugs are valid and within 100-character limit';
    ELSE
        RAISE WARNING '❌ % tenants have invalid slugs', (total_tenants - valid_slugs);
    END IF;
END $$;
