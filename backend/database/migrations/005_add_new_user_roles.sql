-- Phase 7: Add new user roles (SYSTEM_ADMIN, TENANT_ADMIN)
-- This migration adds new role values while preserving existing data

-- Drop the existing role check constraint
ALTER TABLE users DROP CONSTRAINT users_role_check;

-- Add new role check constraint with expanded role options
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role::text = ANY (ARRAY[
        'admin'::character varying,           -- Legacy role (deprecated)
        'system_admin'::character varying,    -- Platform-wide admin
        'tenant_admin'::character varying,    -- Tenant admin
        'user'::character varying,            -- Regular user
        'viewer'::character varying           -- Read-only user
    ]::text[]));

-- Update any existing admin users to be tenant_admin by default
-- (This preserves functionality while allowing manual upgrade to system_admin)
UPDATE users SET role = 'tenant_admin' WHERE role = 'admin';

-- Add a comment explaining the role hierarchy
COMMENT ON TABLE users IS 'Users table with updated role hierarchy. Legacy admin users migrated to tenant_admin.';
