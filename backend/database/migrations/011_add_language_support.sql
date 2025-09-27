-- Migration 011: Add Language Support for Templates and Tenants
-- This migration adds comprehensive language support to the document extraction platform

-- ============================================================================
-- 0. ENABLE REQUIRED EXTENSIONS
-- ============================================================================

-- Enable pgcrypto extension for gen_random_uuid() function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. TENANT LANGUAGE CONFIGURATION
-- ============================================================================

-- Create tenant language configuration table
CREATE TABLE IF NOT EXISTS tenant_language_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supported_languages JSONB NOT NULL DEFAULT '["en"]',
    default_language VARCHAR(10) NOT NULL DEFAULT 'en',
    auto_detect_language BOOLEAN DEFAULT true,
    require_language_match BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_tenant_language_config UNIQUE(tenant_id),
    CONSTRAINT valid_default_language CHECK (default_language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
    CONSTRAINT supported_languages_not_empty CHECK (jsonb_array_length(supported_languages) > 0)
);

-- Create index for tenant language lookups
CREATE INDEX IF NOT EXISTS idx_tenant_language_configs_tenant_id ON tenant_language_configs(tenant_id);

-- ============================================================================
-- 2. TEMPLATE LANGUAGE SUPPORT
-- ============================================================================

-- Add language fields to templates table
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS auto_detect_language BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS require_language_match BOOLEAN DEFAULT false;

-- Add constraints for template language (only if constraint doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_template_language' 
        AND conrelid = 'templates'::regclass
    ) THEN
        ALTER TABLE templates 
        ADD CONSTRAINT valid_template_language CHECK (language ~ '^[a-z]{2}(-[A-Z]{2})?$');
    END IF;
END $$;

-- Create index for template language queries
CREATE INDEX IF NOT EXISTS idx_templates_language ON templates(language);
CREATE INDEX IF NOT EXISTS idx_templates_tenant_language ON templates(tenant_id, language);

-- Note: Templates table doesn't have prompt_config column, language is stored directly

-- ============================================================================
-- 3. DOCUMENT LANGUAGE DETECTION
-- ============================================================================

-- Add language detection fields to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS detected_language VARCHAR(10),
ADD COLUMN IF NOT EXISTS language_confidence DECIMAL(3,2) CHECK (language_confidence >= 0 AND language_confidence <= 1),
ADD COLUMN IF NOT EXISTS language_source VARCHAR(20) DEFAULT 'auto' CHECK (language_source IN ('auto', 'manual', 'template'));

-- Create indexes for document language queries
CREATE INDEX IF NOT EXISTS idx_documents_detected_language ON documents(detected_language);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_language ON documents(tenant_id, detected_language);

-- ============================================================================
-- 4. EXTRACTION LANGUAGE VALIDATION
-- ============================================================================

-- Create extraction language validation table
CREATE TABLE IF NOT EXISTS extraction_language_validation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extraction_id UUID NOT NULL REFERENCES extractions(id) ON DELETE CASCADE,
    template_language VARCHAR(10) NOT NULL,
    document_language VARCHAR(10),
    language_match BOOLEAN,
    validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'passed', 'failed', 'ignored')),
    validation_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_template_language_code CHECK (template_language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
    CONSTRAINT valid_document_language_code CHECK (document_language IS NULL OR document_language ~ '^[a-z]{2}(-[A-Z]{2})?$')
);

-- Create indexes for extraction language validation
CREATE INDEX IF NOT EXISTS idx_extraction_language_validation_extraction_id ON extraction_language_validation(extraction_id);
CREATE INDEX IF NOT EXISTS idx_extraction_language_validation_status ON extraction_language_validation(validation_status);
CREATE INDEX IF NOT EXISTS idx_extraction_language_validation_language_match ON extraction_language_validation(language_match);

-- ============================================================================
-- 5. UPDATE TENANT CONFIGURATIONS CONSTRAINT
-- ============================================================================

-- Update tenant_configurations constraint to include language config type
ALTER TABLE tenant_configurations 
DROP CONSTRAINT IF EXISTS valid_config_type;

ALTER TABLE tenant_configurations 
ADD CONSTRAINT valid_config_type 
CHECK (config_type IN ('llm', 'rate_limits', 'storage', 'cache', 'message_queue', 'ai_providers', 'language'));

-- ============================================================================
-- 6. INITIALIZE LANGUAGE CONFIGURATIONS FOR EXISTING TENANTS
-- ============================================================================

-- Insert default language configuration for all existing tenants
INSERT INTO tenant_language_configs (tenant_id, supported_languages, default_language, auto_detect_language, require_language_match)
SELECT 
    id as tenant_id,
    '["en"]'::jsonb as supported_languages,
    'en' as default_language,
    true as auto_detect_language,
    false as require_language_match
FROM tenants 
WHERE id NOT IN (SELECT tenant_id FROM tenant_language_configs);

-- ============================================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE tenant_language_configs IS 'Stores language configuration for each tenant including supported languages and defaults';
COMMENT ON COLUMN tenant_language_configs.supported_languages IS 'JSON array of supported language codes (e.g., ["en", "es", "fr"])';
COMMENT ON COLUMN tenant_language_configs.default_language IS 'Default language code for the tenant (e.g., "en", "es-US")';
COMMENT ON COLUMN tenant_language_configs.auto_detect_language IS 'Whether to automatically detect document language';
COMMENT ON COLUMN tenant_language_configs.require_language_match IS 'Whether to require language match between template and document';

COMMENT ON COLUMN templates.language IS 'Language code for the template (e.g., "en", "es")';
COMMENT ON COLUMN templates.auto_detect_language IS 'Whether to auto-detect document language for this template';
COMMENT ON COLUMN templates.require_language_match IS 'Whether to require language match for this template';

COMMENT ON COLUMN documents.detected_language IS 'Automatically detected language code of the document';
COMMENT ON COLUMN documents.language_confidence IS 'Confidence score (0.0-1.0) for language detection';
COMMENT ON COLUMN documents.language_source IS 'Source of language information: auto, manual, or template';

COMMENT ON TABLE extraction_language_validation IS 'Tracks language validation for extractions to ensure template-document language compatibility';
COMMENT ON COLUMN extraction_language_validation.template_language IS 'Language of the template used for extraction';
COMMENT ON COLUMN extraction_language_validation.document_language IS 'Language of the document being processed';
COMMENT ON COLUMN extraction_language_validation.language_match IS 'Whether template and document languages match';
COMMENT ON COLUMN extraction_language_validation.validation_status IS 'Status of language validation: pending, passed, failed, or ignored';
