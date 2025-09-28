-- Migration: Update existing authentication configurations with cookie defaults
-- This migration adds default cookie configuration values to existing tenant auth configurations
-- that may not have these fields set, ensuring backward compatibility

-- Update existing auth configurations that don't have cookie settings
-- Only set missing keys to preserve existing tenant custom values (prevents data loss)
UPDATE tenant_configurations
SET config_data =
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            config_data,
            '{refresh_cookie_httponly}',
            COALESCE(config_data->'refresh_cookie_httponly', 'true'::jsonb),
            true
          ),
          '{refresh_cookie_secure}',
          COALESCE(
            config_data->'refresh_cookie_secure',
            CASE WHEN config_data->>'environment' = 'production' THEN 'true'::jsonb ELSE 'false'::jsonb END
          ),
          true
        ),
        '{refresh_cookie_samesite}',
        COALESCE(
          config_data->'refresh_cookie_samesite',
          CASE WHEN config_data->>'environment' = 'production' THEN '"strict"'::jsonb ELSE '"lax"'::jsonb END
        ),
        true
      ),
      '{refresh_cookie_path}',
      COALESCE(config_data->'refresh_cookie_path', '"/api/auth/refresh"'::jsonb),
      true
    ),
    '{refresh_cookie_domain}',
    COALESCE(config_data->'refresh_cookie_domain', 'null'::jsonb),
    true
  )
WHERE config_type = 'auth'
  AND (
    NOT (config_data ? 'refresh_cookie_httponly') OR
    NOT (config_data ? 'refresh_cookie_secure') OR
    NOT (config_data ? 'refresh_cookie_samesite') OR
    NOT (config_data ? 'refresh_cookie_path') OR
    NOT (config_data ? 'refresh_cookie_domain')
  );

-- Add comment for documentation
COMMENT ON TABLE tenant_configurations IS 'Updated existing auth configurations with default cookie settings for backward compatibility';
