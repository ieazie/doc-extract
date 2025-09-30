-- Migration 013: Create refresh_tokens table
-- Created: 2025-01-14
-- Description: Create refresh_tokens table for secure token family tracking with tenant isolation

-- ============================================================================
-- CREATE REFRESH_TOKENS TABLE
-- ============================================================================

-- Create refresh_tokens table with tenant isolation
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jti VARCHAR(36) NOT NULL UNIQUE,  -- JWT ID
    family_id UUID NOT NULL,  -- Token family ID for rotation tracking
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,  -- Tenant isolation
    token_hash VARCHAR(255) NOT NULL,  -- Hashed token for secure storage
    is_active BOOLEAN DEFAULT true NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,  -- When token was last used
    revoked_at TIMESTAMP WITH TIME ZONE  -- When token was revoked
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for family_id queries (token family operations)
CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens(family_id);

-- Composite index for user_id + tenant_id queries (tenant-scoped revocation)
CREATE INDEX idx_refresh_tokens_user_tenant ON refresh_tokens(user_id, tenant_id);

-- Composite index for user_id + family_id + tenant_id queries (family operations)
CREATE INDEX idx_refresh_tokens_user_family_tenant ON refresh_tokens(user_id, family_id, tenant_id);

-- Index for active/expired token queries
CREATE INDEX idx_refresh_tokens_active_expires ON refresh_tokens(is_active, expires_at);

-- Index for JTI queries (unique token lookup)
CREATE INDEX idx_refresh_tokens_jti ON refresh_tokens(jti);

-- Index for tenant_id queries (tenant-scoped operations)
CREATE INDEX idx_refresh_tokens_tenant_id ON refresh_tokens(tenant_id);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE refresh_tokens IS 'Refresh tokens with tenant isolation. Each token is scoped to a specific tenant for security.';
COMMENT ON COLUMN refresh_tokens.id IS 'Primary key for the refresh token record';
COMMENT ON COLUMN refresh_tokens.jti IS 'JWT ID - unique identifier for the token';
COMMENT ON COLUMN refresh_tokens.family_id IS 'Token family ID for rotation tracking and reuse detection';
COMMENT ON COLUMN refresh_tokens.user_id IS 'User who owns this refresh token';
COMMENT ON COLUMN refresh_tokens.tenant_id IS 'Tenant ID for tenant-scoped token isolation. Required for proper tenant separation in multi-tenant environments.';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA-256 hash of the actual token for secure storage';
COMMENT ON COLUMN refresh_tokens.is_active IS 'Whether the token is currently active (not revoked)';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'When the token expires (UTC timestamp)';
COMMENT ON COLUMN refresh_tokens.created_at IS 'When the token was created (UTC timestamp)';
COMMENT ON COLUMN refresh_tokens.used_at IS 'When the token was last used for refresh (UTC timestamp)';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'When the token was revoked (UTC timestamp)';
