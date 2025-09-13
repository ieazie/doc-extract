-- Migration: Remove legacy admin role from database schema
-- This removes the deprecated 'ADMIN' role from the userroleenum

-- Step 1: Remove the legacy ADMIN value from the userroleenum
-- Note: PostgreSQL doesn't support removing enum values directly,
-- so we need to create a new enum without the legacy value
CREATE TYPE userroleenum_new AS ENUM (
    'system_admin',    -- Platform-wide admin
    'tenant_admin',    -- Tenant admin  
    'user',            -- Regular user
    'viewer'           -- Read-only user
);

-- Step 2: Update the users table to use the new enum
ALTER TABLE users ALTER COLUMN role TYPE userroleenum_new USING role::text::userroleenum_new;

-- Step 3: Drop the old enum and rename the new one
DROP TYPE userroleenum;
ALTER TYPE userroleenum_new RENAME TO userroleenum;

-- Step 4: Update the comment to reflect the clean role hierarchy
COMMENT ON COLUMN users.role IS 'User role: system_admin (platform-wide), tenant_admin (tenant-scoped), user (regular), viewer (read-only). Legacy admin role removed.';
