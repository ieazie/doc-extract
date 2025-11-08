-- Migration: Add missing document columns
-- Description: Adds extraction_error, language_source, and is_test_document columns to documents table

-- Add missing columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS extraction_error TEXT,
ADD COLUMN IF NOT EXISTS language_source VARCHAR(20) DEFAULT 'auto',
ADD COLUMN IF NOT EXISTS is_test_document BOOLEAN DEFAULT FALSE;

-- Add constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_valid_lang_confidence') THEN
        ALTER TABLE documents
        ADD CONSTRAINT documents_valid_lang_confidence 
        CHECK (language_confidence IS NULL OR (language_confidence >= 0 AND language_confidence <= 1));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_valid_lang_source') THEN
        ALTER TABLE documents
        ADD CONSTRAINT documents_valid_lang_source 
        CHECK (language_source IN ('auto', 'manual', 'template'));
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_is_test_document 
ON documents(is_test_document) 
WHERE is_test_document = TRUE;

CREATE INDEX IF NOT EXISTS idx_documents_language_source 
ON documents(language_source);

-- Add comments
COMMENT ON COLUMN documents.extraction_error IS 'Error message if extraction failed';
COMMENT ON COLUMN documents.language_source IS 'Source of language detection: auto, manual, or template';
COMMENT ON COLUMN documents.is_test_document IS 'Flag indicating if this is a test document used for template validation';

