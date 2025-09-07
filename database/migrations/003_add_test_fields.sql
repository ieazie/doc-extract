-- Migration: Add test-related fields
-- Add is_test_document field to documents table
ALTER TABLE documents ADD COLUMN is_test_document BOOLEAN DEFAULT FALSE;

-- Add test_document_id field to templates table
ALTER TABLE templates ADD COLUMN test_document_id UUID REFERENCES documents(id);

-- Add is_test_extraction field to extractions table
ALTER TABLE extractions ADD COLUMN is_test_extraction BOOLEAN DEFAULT FALSE;

-- Add indexes for better performance
CREATE INDEX idx_documents_is_test_document ON documents(is_test_document);
CREATE INDEX idx_templates_test_document_id ON templates(test_document_id);
CREATE INDEX idx_extractions_is_test_extraction ON extractions(is_test_extraction);

