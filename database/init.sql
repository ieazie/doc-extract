-- Initial database schema for Document Extraction Platform
-- This file is executed when PostgreSQL container starts

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search

-- Create tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document types table
CREATE TABLE document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    schema_template JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, name)
);

-- Create templates table
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    document_type_id UUID REFERENCES document_types(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    version INTEGER DEFAULT 1,
    schema JSONB NOT NULL,
    prompt_config JSONB NOT NULL,
    few_shot_examples JSONB DEFAULT '[]',
    extraction_settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, name, version)
);

-- Create documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    s3_key VARCHAR(500) NOT NULL UNIQUE,
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER CHECK (file_size > 0),
    mime_type VARCHAR(100),
    document_type_id UUID REFERENCES document_types(id),
    raw_content TEXT,
    status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create extractions table
CREATE TABLE extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reviewed')),
    results JSONB,
    confidence_scores JSONB,
    processing_time INTEGER, -- in milliseconds
    error_message TEXT,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create extraction fields table for detailed field tracking
CREATE TABLE extraction_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    extraction_id UUID REFERENCES extractions(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_type VARCHAR(50),
    extracted_value JSONB,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    source_location JSONB,
    human_verified BOOLEAN DEFAULT false,
    human_corrected_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
-- Tenants
CREATE INDEX idx_tenants_name ON tenants(name);

-- Document types
CREATE INDEX idx_document_types_tenant ON document_types(tenant_id);
CREATE INDEX idx_document_types_name ON document_types(name);

-- Templates
CREATE INDEX idx_templates_tenant ON templates(tenant_id);
CREATE INDEX idx_templates_document_type ON templates(document_type_id);
CREATE INDEX idx_templates_active ON templates(is_active);
CREATE INDEX idx_templates_name ON templates(name);

-- Documents
CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_s3_key ON documents(s3_key);
CREATE INDEX idx_documents_type ON documents(document_type_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created ON documents(created_at);
CREATE INDEX idx_documents_filename ON documents(original_filename);

-- Full-text search on document content
CREATE INDEX idx_documents_content_fts ON documents USING gin(to_tsvector('english', raw_content));

-- Extractions
CREATE INDEX idx_extractions_document ON extractions(document_id);
CREATE INDEX idx_extractions_template ON extractions(template_id);
CREATE INDEX idx_extractions_status ON extractions(status);
CREATE INDEX idx_extractions_created ON extractions(created_at);

-- Extraction fields
CREATE INDEX idx_extraction_fields_extraction ON extraction_fields(extraction_id);
CREATE INDEX idx_extraction_fields_name ON extraction_fields(field_name);
CREATE INDEX idx_extraction_fields_verified ON extraction_fields(human_verified);

-- Insert default data
INSERT INTO tenants (id, name, settings) VALUES 
(uuid_generate_v4(), 'Default Tenant', '{"max_documents": 1000, "max_templates": 50}');

-- Get the default tenant ID for document types
DO $$
DECLARE
    default_tenant_id UUID;
BEGIN
    SELECT id INTO default_tenant_id FROM tenants WHERE name = 'Default Tenant';
    
    -- Insert default document types
    INSERT INTO document_types (tenant_id, name, description, schema_template) VALUES 
    (default_tenant_id, 'invoice', 'Invoice documents for billing and payment processing', '{
        "fields": {
            "invoice_number": {"type": "text", "required": true},
            "invoice_date": {"type": "date", "required": true},
            "total_amount": {"type": "number", "required": true}
        }
    }'),
    (default_tenant_id, 'contract', 'Legal contracts and agreements', '{
        "fields": {
            "contract_number": {"type": "text", "required": false},
            "effective_date": {"type": "date", "required": true},
            "parties": {"type": "array", "required": true}
        }
    }'),
    (default_tenant_id, 'insurance_policy', 'Insurance policy documents', '{
        "fields": {
            "policy_number": {"type": "text", "required": true},
            "policy_type": {"type": "text", "required": true},
            "coverage_limits": {"type": "array", "required": false}
        }
    }');
END $$;

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extractions_updated_at BEFORE UPDATE ON extractions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
CREATE VIEW document_summary AS
SELECT 
    d.id,
    d.original_filename,
    d.file_size,
    d.status,
    dt.name as document_type,
    d.created_at,
    COUNT(e.id) as extraction_count
FROM documents d
LEFT JOIN document_types dt ON d.document_type_id = dt.id
LEFT JOIN extractions e ON d.id = e.document_id
GROUP BY d.id, d.original_filename, d.file_size, d.status, dt.name, d.created_at;

CREATE VIEW extraction_summary AS
SELECT 
    e.id,
    e.status,
    e.processing_time,
    d.original_filename,
    t.name as template_name,
    e.created_at,
    COUNT(ef.id) as field_count
FROM extractions e
JOIN documents d ON e.document_id = d.id
JOIN templates t ON e.template_id = t.id
LEFT JOIN extraction_fields ef ON e.id = ef.extraction_id
GROUP BY e.id, e.status, e.processing_time, d.original_filename, t.name, e.created_at;

-- Grant permissions (adjust as needed for production)
-- These would typically be more restrictive in production
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;

