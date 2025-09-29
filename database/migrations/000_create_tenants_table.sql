-- Migration 000: Create tenants table
-- Created: 2025-01-14
-- Description: Create core tenants table for multi-tenancy support

-- ============================================================================
-- CREATE TENANTS TABLE
-- ============================================================================

-- Create tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'trial')),
    environment VARCHAR(50) DEFAULT 'development',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for name lookups (most common query)
CREATE INDEX idx_tenants_name ON tenants(name);

-- Index for status filtering
CREATE INDEX idx_tenants_status ON tenants(status);

-- Index for environment filtering
CREATE INDEX idx_tenants_environment ON tenants(environment);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE tenants IS 'Core tenants table for multi-tenancy support';
COMMENT ON COLUMN tenants.id IS 'Primary key for the tenant';
COMMENT ON COLUMN tenants.name IS 'Display name of the tenant organization';
COMMENT ON COLUMN tenants.settings IS 'JSON configuration settings for the tenant';
COMMENT ON COLUMN tenants.status IS 'Current status of the tenant (active, inactive, suspended, trial)';
COMMENT ON COLUMN tenants.environment IS 'Deployment environment (development, staging, production)';
COMMENT ON COLUMN tenants.created_at IS 'When the tenant was created (UTC timestamp)';
COMMENT ON COLUMN tenants.updated_at IS 'When the tenant was last updated (UTC timestamp)';

-- Insert default tenant for system administration
-- NOTE: This UUID is centralized in backend/src/constants/tenant.py as DEFAULT_TENANT_ID
INSERT INTO tenants (id, name, status, environment) VALUES 
('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'active', 'development');
