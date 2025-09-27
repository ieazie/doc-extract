-- Migration 002: Create documents table
-- Created: 2025-01-14
-- Description: Create documents table for document storage and management

-- ============================================================================
-- CREATE DOCUMENTS TABLE
-- ============================================================================

-- Create documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_type_id UUID REFERENCES document_types(id) ON DELETE SET NULL,
    original_filename VARCHAR(500) NOT NULL,
    stored_filename VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(255),
    file_hash VARCHAR(64), -- SHA-256 hash for deduplication
    upload_status VARCHAR(20) DEFAULT 'uploaded' CHECK (upload_status IN ('uploading', 'uploaded', 'processing', 'processed', 'failed')),
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
    extraction_status VARCHAR(20) DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
    is_test_document BOOLEAN DEFAULT false NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for tenant_id queries (most common)
CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);

-- Index for document_type_id queries
CREATE INDEX idx_documents_document_type_id ON documents(document_type_id);

-- Index for upload status
CREATE INDEX idx_documents_upload_status ON documents(upload_status);

-- Index for processing status
CREATE INDEX idx_documents_processing_status ON documents(processing_status);

-- Index for extraction status
CREATE INDEX idx_documents_extraction_status ON documents(extraction_status);

-- Index for test documents
CREATE INDEX idx_documents_is_test_document ON documents(is_test_document);

-- Index for file hash (deduplication)
CREATE INDEX idx_documents_file_hash ON documents(file_hash);

-- Composite index for tenant + status queries
CREATE INDEX idx_documents_tenant_processing_status ON documents(tenant_id, processing_status);

-- Index for created_at (sorting)
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE documents IS 'Documents uploaded and processed by the system';
COMMENT ON COLUMN documents.id IS 'Primary key for the document';
COMMENT ON COLUMN documents.tenant_id IS 'Tenant this document belongs to';
COMMENT ON COLUMN documents.document_type_id IS 'Type/category of the document';
COMMENT ON COLUMN documents.original_filename IS 'Original filename when uploaded';
COMMENT ON COLUMN documents.stored_filename IS 'Filename used for storage (may be different for security)';
COMMENT ON COLUMN documents.file_path IS 'Path to the stored file';
COMMENT ON COLUMN documents.file_size IS 'Size of the file in bytes';
COMMENT ON COLUMN documents.mime_type IS 'MIME type of the file';
COMMENT ON COLUMN documents.file_hash IS 'SHA-256 hash of the file for deduplication';
COMMENT ON COLUMN documents.upload_status IS 'Status of the upload process';
COMMENT ON COLUMN documents.processing_status IS 'Status of document processing (OCR, parsing, etc.)';
COMMENT ON COLUMN documents.extraction_status IS 'Status of data extraction';
COMMENT ON COLUMN documents.is_test_document IS 'Whether this is a test document';
COMMENT ON COLUMN documents.metadata IS 'Additional metadata about the document';
COMMENT ON COLUMN documents.created_at IS 'When the document was uploaded (UTC timestamp)';
COMMENT ON COLUMN documents.updated_at IS 'When the document was last updated (UTC timestamp)';
COMMENT ON COLUMN documents.processed_at IS 'When the document processing was completed (UTC timestamp)';
