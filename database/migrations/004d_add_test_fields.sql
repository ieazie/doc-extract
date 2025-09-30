-- Migration: Add test-related fields
-- Note: is_test_document field already exists in documents table from 002_create_documents_table.sql

-- Add test_document_id field to templates table
ALTER TABLE templates ADD COLUMN test_document_id UUID REFERENCES documents(id);

-- Add is_test_extraction field to extractions table
ALTER TABLE extractions ADD COLUMN is_test_extraction BOOLEAN DEFAULT FALSE;

-- Add indexes for better performance
-- Note: idx_documents_is_test_document already exists from 002_create_documents_table.sql
CREATE INDEX idx_templates_test_document_id ON templates(test_document_id);
CREATE INDEX idx_extractions_is_test_extraction ON extractions(is_test_extraction);

