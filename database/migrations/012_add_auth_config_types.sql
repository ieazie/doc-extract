-- Migration: Add authentication configuration types to tenant configurations
-- This migration extends the existing tenant_configurations table to support
-- new configuration types: 'auth', 'cors', and 'security'

-- Update the constraint to include new configuration types
ALTER TABLE tenant_configurations 
DROP CONSTRAINT IF EXISTS valid_config_type;

ALTER TABLE tenant_configurations 
ADD CONSTRAINT valid_config_type 
CHECK (config_type IN ('llm', 'rate_limits', 'auth', 'cors', 'security', 'cache', 'message_queue', 'storage'));

-- Create indexes for better performance on new configuration types
CREATE INDEX IF NOT EXISTS idx_tenant_config_auth 
ON tenant_configurations (tenant_id, config_type) 
WHERE config_type = 'auth';

CREATE INDEX IF NOT EXISTS idx_tenant_config_cors 
ON tenant_configurations (tenant_id, config_type) 
WHERE config_type = 'cors';

CREATE INDEX IF NOT EXISTS idx_tenant_config_security 
ON tenant_configurations (tenant_id, config_type) 
WHERE config_type = 'security';

-- Add a comment to document the new configuration types
COMMENT ON CONSTRAINT valid_config_type ON tenant_configurations IS 
'Validates configuration types: llm (LLM settings), rate_limits (rate limiting), auth (authentication), cors (CORS settings), security (security policies), cache, message_queue, storage (infrastructure)';
