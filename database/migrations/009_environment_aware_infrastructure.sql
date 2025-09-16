-- Migration 009: Environment-Aware Infrastructure Configurations
-- Created: 2025-01-14
-- Description: Extend tenant configurations to support environment-specific infrastructure resources

-- ============================================================================
-- UPDATE EXISTING TABLES
-- ============================================================================

-- Update tenant_configurations to support new config types and environment scoping
ALTER TABLE tenant_configurations 
DROP CONSTRAINT IF EXISTS valid_config_type;

ALTER TABLE tenant_configurations 
ADD CONSTRAINT valid_config_type 
CHECK (config_type IN (
    'llm', 
    'rate_limits', 
    'storage', 
    'cache', 
    'message_queue',
    'ai_providers'
));

-- Add environment column to tenant_configurations
ALTER TABLE tenant_configurations 
ADD COLUMN environment VARCHAR(50) DEFAULT 'development';

-- Update unique constraint to include environment
ALTER TABLE tenant_configurations 
DROP CONSTRAINT IF EXISTS unique_active_config;

ALTER TABLE tenant_configurations 
ADD CONSTRAINT unique_active_config 
UNIQUE (tenant_id, config_type, environment) DEFERRABLE INITIALLY DEFERRED;

-- ============================================================================
-- NEW TABLES
-- ============================================================================

-- Environment-specific secrets table
CREATE TABLE tenant_environment_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    environment VARCHAR(50) NOT NULL,
    secret_type VARCHAR(50) NOT NULL CHECK (secret_type IN (
        'storage_access_key',
        'storage_secret_key',
        'cache_password',
        'api_key',
        'webhook_secret',
        'database_password',
        'redis_password'
    )),
    encrypted_value TEXT NOT NULL, -- AES-256 encrypted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one secret per type per tenant per environment
    CONSTRAINT unique_tenant_environment_secret 
    UNIQUE (tenant_id, environment, secret_type)
);

-- Environment-specific infrastructure usage tracking
CREATE TABLE tenant_environment_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    environment VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN (
        'storage_bytes',
        'api_requests',
        'extraction_jobs',
        'cache_operations',
        'queue_messages'
    )),
    usage_count BIGINT DEFAULT 0,
    usage_bytes BIGINT DEFAULT 0,
    billing_period_start TIMESTAMP WITH TIME ZONE DEFAULT DATE_TRUNC('month', NOW()),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per resource type per tenant per environment per billing period
    CONSTRAINT unique_tenant_environment_resource_period 
    UNIQUE (tenant_id, environment, resource_type, billing_period_start)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for tenant_configurations
CREATE INDEX idx_tenant_configurations_environment ON tenant_configurations(environment);
CREATE INDEX idx_tenant_configurations_tenant_env ON tenant_configurations(tenant_id, environment);

-- Indexes for tenant_environment_secrets
CREATE INDEX idx_tenant_environment_secrets_tenant_env ON tenant_environment_secrets(tenant_id, environment);
CREATE INDEX idx_tenant_environment_secrets_type ON tenant_environment_secrets(secret_type);
CREATE INDEX idx_tenant_environment_secrets_tenant_type ON tenant_environment_secrets(tenant_id, secret_type);

-- Indexes for tenant_environment_usage
CREATE INDEX idx_tenant_environment_usage_tenant_env ON tenant_environment_usage(tenant_id, environment);
CREATE INDEX idx_tenant_environment_usage_resource_type ON tenant_environment_usage(resource_type);
CREATE INDEX idx_tenant_environment_usage_period ON tenant_environment_usage(billing_period_start);

-- ============================================================================
-- INSERT DEFAULT CONFIGURATIONS FOR EXISTING TENANTS
-- ============================================================================

-- Development Environment - Storage Configuration
INSERT INTO tenant_configurations (id, tenant_id, config_type, environment, config_data)
SELECT 
    gen_random_uuid(),
    t.id,
    'storage',
    'development',
    jsonb_build_object(
        'provider', 'minio',
        'bucket_prefix', 'dev-tenant-' || t.id,
        'region', 'us-east-1',
        'endpoint_url', 'http://minio:9000',
        'max_storage_gb', 50,
        'allowed_file_types', '["pdf", "docx", "txt", "png", "jpg"]'
    )
FROM tenants t;

-- Development Environment - Cache Configuration
INSERT INTO tenant_configurations (id, tenant_id, config_type, environment, config_data)
SELECT 
    gen_random_uuid(),
    t.id,
    'cache',
    'development',
    jsonb_build_object(
        'provider', 'redis',
        'database_number', (EXTRACT(EPOCH FROM t.created_at)::INTEGER % 8), -- 0-7 for dev
        'host', 'redis',
        'port', 6379,
        'max_memory_mb', 256,
        'ttl_seconds', 1800
    )
FROM tenants t;

-- Development Environment - Message Queue Configuration
INSERT INTO tenant_configurations (id, tenant_id, config_type, environment, config_data)
SELECT 
    gen_random_uuid(),
    t.id,
    'message_queue',
    'development',
    jsonb_build_object(
        'provider', 'redis',
        'queue_prefix', 'dev-tenant-' || t.id,
        'broker_url', 'redis://redis:6379',
        'result_backend', 'redis://redis:6379',
        'max_workers', 1,
        'priority_queues', '["high", "normal", "low"]'
    )
FROM tenants t;

-- Staging Environment - Storage Configuration
INSERT INTO tenant_configurations (id, tenant_id, config_type, environment, config_data)
SELECT 
    gen_random_uuid(),
    t.id,
    'storage',
    'staging',
    jsonb_build_object(
        'provider', 'minio',
        'bucket_prefix', 'staging-tenant-' || t.id,
        'region', 'us-east-1',
        'endpoint_url', 'http://minio:9000',
        'max_storage_gb', 100,
        'allowed_file_types', '["pdf", "docx", "txt", "png", "jpg"]'
    )
FROM tenants t;

-- Staging Environment - Cache Configuration
INSERT INTO tenant_configurations (id, tenant_id, config_type, environment, config_data)
SELECT 
    gen_random_uuid(),
    t.id,
    'cache',
    'staging',
    jsonb_build_object(
        'provider', 'redis',
        'database_number', (EXTRACT(EPOCH FROM t.created_at)::INTEGER % 8) + 8, -- 8-15 for staging
        'host', 'redis',
        'port', 6379,
        'max_memory_mb', 512,
        'ttl_seconds', 3600
    )
FROM tenants t;

-- Staging Environment - Message Queue Configuration
INSERT INTO tenant_configurations (id, tenant_id, config_type, environment, config_data)
SELECT 
    gen_random_uuid(),
    t.id,
    'message_queue',
    'staging',
    jsonb_build_object(
        'provider', 'redis',
        'queue_prefix', 'staging-tenant-' || t.id,
        'broker_url', 'redis://redis:6379',
        'result_backend', 'redis://redis:6379',
        'max_workers', 2,
        'priority_queues', '["high", "normal", "low"]'
    )
FROM tenants t;

-- Production Environment - Storage Configuration (AWS S3)
INSERT INTO tenant_configurations (id, tenant_id, config_type, environment, config_data)
SELECT 
    gen_random_uuid(),
    t.id,
    'storage',
    'production',
    jsonb_build_object(
        'provider', 'aws_s3',
        'bucket_prefix', 'prod-tenant-' || t.id,
        'region', 'us-east-1',
        'endpoint_url', NULL, -- AWS S3 default
        'max_storage_gb', 1000,
        'allowed_file_types', '["pdf", "docx", "txt", "png", "jpg"]'
    )
FROM tenants t;

-- Production Environment - Cache Configuration (Redis Cloud)
INSERT INTO tenant_configurations (id, tenant_id, config_type, environment, config_data)
SELECT 
    gen_random_uuid(),
    t.id,
    'cache',
    'production',
    jsonb_build_object(
        'provider', 'redis',
        'database_number', (EXTRACT(EPOCH FROM t.created_at)::INTEGER % 16) + 16, -- 16-31 for prod
        'host', 'redis-cloud',
        'port', 6379,
        'max_memory_mb', 1024,
        'ttl_seconds', 7200
    )
FROM tenants t;

-- Production Environment - Message Queue Configuration (Redis Cloud)
INSERT INTO tenant_configurations (id, tenant_id, config_type, environment, config_data)
SELECT 
    gen_random_uuid(),
    t.id,
    'message_queue',
    'production',
    jsonb_build_object(
        'provider', 'redis',
        'queue_prefix', 'prod-tenant-' || t.id,
        'broker_url', 'redis://redis-cloud:6379',
        'result_backend', 'redis://redis-cloud:6379',
        'max_workers', 5,
        'priority_queues', '["high", "normal", "low", "scheduled"]'
    )
FROM tenants t;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Add updated_at trigger for tenant_environment_secrets
CREATE OR REPLACE FUNCTION update_tenant_environment_secrets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tenant_environment_secrets_updated_at
    BEFORE UPDATE ON tenant_environment_secrets
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_environment_secrets_updated_at();

-- Add updated_at trigger for tenant_environment_usage
CREATE OR REPLACE FUNCTION update_tenant_environment_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tenant_environment_usage_updated_at
    BEFORE UPDATE ON tenant_environment_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_environment_usage_updated_at();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE tenant_configurations IS 'Stores tenant-specific configuration settings for LLM providers, rate limits, and infrastructure resources';
COMMENT ON TABLE tenant_environment_secrets IS 'Stores encrypted secrets for tenant environments (API keys, passwords, etc.)';
COMMENT ON TABLE tenant_environment_usage IS 'Tracks resource usage for billing and monitoring per tenant per environment';

COMMENT ON COLUMN tenant_configurations.environment IS 'Environment: development, staging, production';
COMMENT ON COLUMN tenant_configurations.config_type IS 'Type of configuration: llm, rate_limits, storage, cache, message_queue, ai_providers';
COMMENT ON COLUMN tenant_configurations.config_data IS 'JSON configuration data specific to the config_type and environment';

COMMENT ON COLUMN tenant_environment_secrets.environment IS 'Environment: development, staging, production';
COMMENT ON COLUMN tenant_environment_secrets.secret_type IS 'Type of secret: storage_access_key, storage_secret_key, cache_password, api_key, webhook_secret, database_password, redis_password';
COMMENT ON COLUMN tenant_environment_secrets.encrypted_value IS 'AES-256 encrypted secret value';

COMMENT ON COLUMN tenant_environment_usage.environment IS 'Environment: development, staging, production';
COMMENT ON COLUMN tenant_environment_usage.resource_type IS 'Type of resource: storage_bytes, api_requests, extraction_jobs, cache_operations, queue_messages';
COMMENT ON COLUMN tenant_environment_usage.usage_count IS 'Current count within the billing period';
COMMENT ON COLUMN tenant_environment_usage.usage_bytes IS 'Current bytes used within the billing period';
COMMENT ON COLUMN tenant_environment_usage.billing_period_start IS 'Start time of the current billing period';
