-- Migration 004: Tenant Configurations and Rate Limiting
-- Created: 2024-01-XX
-- Description: Add tenant-specific configurations for LLM providers and rate limiting

-- Tenant Configuration Table
CREATE TABLE tenant_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    config_type VARCHAR(50) NOT NULL CHECK (config_type IN ('llm', 'rate_limits')),
    config_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one active config per type per tenant
    CONSTRAINT unique_active_config UNIQUE (tenant_id, config_type) DEFERRABLE INITIALLY DEFERRED
);

-- Rate Limiting Tracking Table
CREATE TABLE tenant_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    limit_type VARCHAR(50) NOT NULL CHECK (limit_type IN (
        'api_requests_per_minute',
        'api_requests_per_hour', 
        'document_uploads_per_hour',
        'extractions_per_hour',
        'max_concurrent_extractions'
    )),
    current_count INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one tracking record per limit type per tenant
    CONSTRAINT unique_tenant_limit_type UNIQUE (tenant_id, limit_type)
);

-- Indexes for performance
CREATE INDEX idx_tenant_configurations_tenant_id ON tenant_configurations(tenant_id);
CREATE INDEX idx_tenant_configurations_type ON tenant_configurations(config_type);
CREATE INDEX idx_tenant_configurations_active ON tenant_configurations(is_active);

CREATE INDEX idx_tenant_rate_limits_tenant_id ON tenant_rate_limits(tenant_id);
CREATE INDEX idx_tenant_rate_limits_type ON tenant_rate_limits(limit_type);
CREATE INDEX idx_tenant_rate_limits_window ON tenant_rate_limits(window_start);

-- Insert default configurations for existing tenants
INSERT INTO tenant_configurations (tenant_id, config_type, config_data)
SELECT 
    t.id,
    'llm',
    jsonb_build_object(
        'provider', 'ollama',
        'model_name', 'gemma-3:4b',
        'ollama_config', jsonb_build_object(
            'host', 'http://localhost:11434'
        ),
        'max_tokens', 4000,
        'temperature', 0.1
    )
FROM tenants t;

INSERT INTO tenant_configurations (tenant_id, config_type, config_data)
SELECT 
    t.id,
    'rate_limits',
    jsonb_build_object(
        'api_requests_per_minute', 100,
        'api_requests_per_hour', 1000,
        'document_uploads_per_hour', 50,
        'extractions_per_hour', 20,
        'max_concurrent_extractions', 3,
        'burst_limit', 10
    )
FROM tenants t;

-- Insert default rate limit tracking records
INSERT INTO tenant_rate_limits (tenant_id, limit_type, current_count, window_start)
SELECT 
    t.id,
    limit_type,
    0,
    NOW()
FROM tenants t
CROSS JOIN (
    VALUES 
        ('api_requests_per_minute'),
        ('api_requests_per_hour'),
        ('document_uploads_per_hour'),
        ('extractions_per_hour'),
        ('max_concurrent_extractions')
) AS limits(limit_type);

-- Add updated_at trigger for tenant_configurations
CREATE OR REPLACE FUNCTION update_tenant_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tenant_configurations_updated_at
    BEFORE UPDATE ON tenant_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_configurations_updated_at();

-- Add updated_at trigger for tenant_rate_limits
CREATE OR REPLACE FUNCTION update_tenant_rate_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tenant_rate_limits_updated_at
    BEFORE UPDATE ON tenant_rate_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_rate_limits_updated_at();

-- Comments for documentation
COMMENT ON TABLE tenant_configurations IS 'Stores tenant-specific configuration settings for LLM providers and rate limits';
COMMENT ON TABLE tenant_rate_limits IS 'Tracks current rate limit usage for each tenant';
COMMENT ON COLUMN tenant_configurations.config_type IS 'Type of configuration: llm or rate_limits';
COMMENT ON COLUMN tenant_configurations.config_data IS 'JSON configuration data specific to the config_type';
COMMENT ON COLUMN tenant_rate_limits.limit_type IS 'Type of rate limit being tracked';
COMMENT ON COLUMN tenant_rate_limits.current_count IS 'Current count within the current window';
COMMENT ON COLUMN tenant_rate_limits.window_start IS 'Start time of the current rate limit window';
