-- Migration: Make tenant_id nullable for system admin users
-- This allows system admin users to have tenant_id = NULL, indicating system-wide access

-- Step 1: Make tenant_id column nullable
ALTER TABLE users ALTER COLUMN tenant_id DROP NOT NULL;

-- Step 2: Update the existing system admin user to have no tenant
UPDATE users 
SET tenant_id = NULL 
WHERE email = 'system@docextract.com' AND role = 'system_admin';

-- Step 3: Add a comment to document this change
COMMENT ON COLUMN users.tenant_id IS 'Tenant ID for tenant-scoped users. NULL for system admin users who have system-wide access.';
