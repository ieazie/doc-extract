-- Migration: Fix tenant_language_configs schema
-- Description: Adds require_language_match column and converts supported_languages to JSONB

-- Add missing require_language_match column
ALTER TABLE tenant_language_configs 
ADD COLUMN IF NOT EXISTS require_language_match BOOLEAN DEFAULT FALSE;

-- Drop the default before type conversion
ALTER TABLE tenant_language_configs 
ALTER COLUMN supported_languages DROP DEFAULT;

-- Convert supported_languages from text[] to JSONB
ALTER TABLE tenant_language_configs 
ALTER COLUMN supported_languages TYPE JSONB USING 
  CASE 
    WHEN supported_languages IS NULL THEN '["en"]'::jsonb
    ELSE to_jsonb(supported_languages)
  END;

-- Set new JSONB default
ALTER TABLE tenant_language_configs 
ALTER COLUMN supported_languages SET DEFAULT '["en"]'::jsonb;

-- Drop fallback_language column if it exists (not in model)
ALTER TABLE tenant_language_configs 
DROP COLUMN IF EXISTS fallback_language;

-- Add comments
COMMENT ON COLUMN tenant_language_configs.require_language_match IS 'Whether to require language match for document processing';
COMMENT ON COLUMN tenant_language_configs.supported_languages IS 'List of supported language codes in JSONB format';

