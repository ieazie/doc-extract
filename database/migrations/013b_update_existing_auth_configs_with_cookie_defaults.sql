-- Migration: Update existing authentication configurations with cookie defaults
-- This migration adds default cookie configuration values to existing tenant auth configurations
-- that may not have these fields set, ensuring backward compatibility

-- Update existing auth configurations that don't have cookie settings
UPDATE tenant_configurations 
SET config_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            jsonb_set(
                jsonb_set(
                    config_data,
                    '{refresh_cookie_httponly}',
                    'true'::jsonb
                ),
                '{refresh_cookie_secure}',
                CASE 
                    WHEN config_data->>'environment' = 'production' THEN 'true'::jsonb
                    ELSE 'false'::jsonb
                END
            ),
            '{refresh_cookie_samesite}',
            CASE 
                WHEN config_data->>'environment' = 'production' THEN '"strict"'::jsonb
                ELSE '"lax"'::jsonb
            END
        ),
        '{refresh_cookie_path}',
        '"/api/auth/refresh"'::jsonb
    ),
    '{refresh_cookie_domain}',
    'null'::jsonb
)
WHERE config_type = 'auth' 
  AND (
    config_data ? 'refresh_cookie_httponly' = false 
    OR config_data ? 'refresh_cookie_secure' = false 
    OR config_data ? 'refresh_cookie_samesite' = false 
    OR config_data ? 'refresh_cookie_path' = false 
    OR config_data ? 'refresh_cookie_domain' = false
  );

-- Add comment for documentation
COMMENT ON TABLE tenant_configurations IS 'Updated existing auth configurations with default cookie settings for backward compatibility';
