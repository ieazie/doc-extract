-- Migration 010: Add Tenant Slugs
-- Created: 2025-01-14
-- Description: Add unique slug field to tenants table for better resource identification

-- ============================================================================
-- ADD SLUG COLUMN
-- ============================================================================

-- Add slug column to tenants table
ALTER TABLE tenants 
ADD COLUMN slug VARCHAR(100);

-- Add unique constraint on slug
ALTER TABLE tenants 
ADD CONSTRAINT unique_tenant_slug UNIQUE (slug);

-- Add check constraint for slug format (alphanumeric + hyphens, lowercase)
ALTER TABLE tenants 
ADD CONSTRAINT valid_tenant_slug 
CHECK (slug ~ '^[a-z0-9-]+$' AND length(slug) >= 3 AND length(slug) <= 100);

-- ============================================================================
-- GENERATE SLUGS FOR EXISTING TENANTS
-- ============================================================================

-- Function to generate slug from tenant name
CREATE OR REPLACE FUNCTION generate_tenant_slug(tenant_name TEXT) 
RETURNS TEXT AS $$
BEGIN
    -- Convert to lowercase, replace spaces and special chars with hyphens
    -- Remove multiple consecutive hyphens, trim hyphens from ends
    RETURN regexp_replace(
        regexp_replace(
            regexp_replace(
                lower(trim(tenant_name)), 
                '[^a-z0-9\s-]', '', 'g'
            ), 
            '\s+', '-', 'g'
        ), 
        '-+', '-', 'g'
    );
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing tenants
UPDATE tenants 
SET slug = generate_tenant_slug(name)
WHERE slug IS NULL;

-- Handle any potential duplicates by appending tenant ID
UPDATE tenants 
SET slug = slug || '-' || substring(id::text, 1, 8)
WHERE id IN (
    SELECT id FROM (
        SELECT id, slug, 
               ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
        FROM tenants
    ) t WHERE rn > 1
);

-- ============================================================================
-- MAKE SLUG NOT NULL
-- ============================================================================

-- Now that all tenants have slugs, make the column NOT NULL
ALTER TABLE tenants 
ALTER COLUMN slug SET NOT NULL;

-- ============================================================================
-- ADD INDEXES
-- ============================================================================

-- Index for slug lookups
CREATE INDEX idx_tenants_slug ON tenants(slug);

-- ============================================================================
-- CLEANUP
-- ============================================================================

-- Drop the helper function
DROP FUNCTION generate_tenant_slug(TEXT);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN tenants.slug IS 'Unique, URL-safe identifier for the tenant (e.g., acme-corp)';
COMMENT ON CONSTRAINT valid_tenant_slug ON tenants IS 'Ensures slug contains only lowercase letters, numbers, and hyphens, 3-100 characters';
COMMENT ON CONSTRAINT unique_tenant_slug ON tenants IS 'Ensures each tenant has a unique slug';
