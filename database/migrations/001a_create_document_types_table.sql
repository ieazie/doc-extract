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
    icon VARCHAR(100),
    color VARCHAR(7), -- Hex color code
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique name per tenant
    CONSTRAINT unique_tenant_document_type_name UNIQUE (tenant_id, name)
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for tenant_id queries (most common)
CREATE INDEX idx_document_types_tenant_id ON document_types(tenant_id);

-- Index for active document types
CREATE INDEX idx_document_types_active ON document_types(is_active);

-- Composite index for tenant + active queries
CREATE INDEX idx_document_types_tenant_active ON document_types(tenant_id, is_active);

-- Index for sort order
CREATE INDEX idx_document_types_sort_order ON document_types(tenant_id, sort_order);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE document_types IS 'Document type definitions for tenant-specific categorization';
COMMENT ON COLUMN document_types.id IS 'Primary key for the document type';
COMMENT ON COLUMN document_types.tenant_id IS 'Tenant this document type belongs to';
COMMENT ON COLUMN document_types.name IS 'Name of the document type (e.g., Invoice, Contract)';
COMMENT ON COLUMN document_types.description IS 'Description of the document type';
COMMENT ON COLUMN document_types.icon IS 'Icon identifier for UI display';
COMMENT ON COLUMN document_types.color IS 'Hex color code for UI display';
COMMENT ON COLUMN document_types.is_active IS 'Whether this document type is active';
COMMENT ON COLUMN document_types.sort_order IS 'Sort order for UI display';
COMMENT ON COLUMN document_types.created_at IS 'When the document type was created (UTC timestamp)';
COMMENT ON COLUMN document_types.updated_at IS 'When the document type was last updated (UTC timestamp)';
