-- Migration 001a: Create document_types table
-- Created: 2025-01-14
-- Description: Create document_types table for document categorization

-- ============================================================================
-- CREATE DOCUMENT_TYPES TABLE
-- ============================================================================

-- Create document_types table
CREATE TABLE document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    schema_template JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique name per tenant
    CONSTRAINT unique_tenant_document_type_name UNIQUE (tenant_id, name)
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for tenant_id queries (most common)
CREATE INDEX idx_document_types_tenant_id ON document_types(tenant_id);

-- Index for name queries
CREATE INDEX idx_document_types_name ON document_types(name);

-- Composite index for tenant + name queries (covers the unique constraint)
CREATE INDEX idx_document_types_tenant_name ON document_types(tenant_id, name);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE document_types IS 'Document type definitions for tenant-specific categorization';
COMMENT ON COLUMN document_types.id IS 'Primary key for the document type';
COMMENT ON COLUMN document_types.tenant_id IS 'Tenant this document type belongs to';
COMMENT ON COLUMN document_types.name IS 'Name of the document type (e.g., Invoice, Contract)';
COMMENT ON COLUMN document_types.description IS 'Description of the document type';
COMMENT ON COLUMN document_types.schema_template IS 'JSON schema template for this document type';
COMMENT ON COLUMN document_types.created_at IS 'When the document type was created (UTC timestamp)';
COMMENT ON CONSTRAINT unique_tenant_document_type_name ON document_types IS 'Ensures unique document type names per tenant';
