-- ============================================================================
-- CONSOLIDATED SEED DATA
-- ============================================================================
-- Generated: 2025-11-01
-- Description: Essential seed data for system initialization
-- This replaces migration 014_add_default_seed_data.sql
--
-- IMPORTANT: This seed data creates:
-- - Default tenant
-- - Default users (admin, user, system_admin)
-- - Default document types
-- - Default document categories
-- - Default templates for each document type
-- - Template examples for few-shot learning
-- - Default tenant configurations
-- ============================================================================

-- ============================================================================
-- DEFAULT TENANT
-- ============================================================================

-- Insert default tenant for system administration
-- NOTE: This UUID is centralized in backend/src/constants/tenant.py as DEFAULT_TENANT_ID
INSERT INTO tenants (id, name, slug, status, environment) VALUES 
('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'default-tenant', 'active', 'development')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEFAULT USERS
-- ============================================================================

-- Password for all default users is: 'admin123' (hashed with bcrypt)
-- Hash: $2b$12$CCrXN1QXpWFah9JVmk43Wuq.TPuOYs9bto7Taa3h0dL2wSkG7.PiS

-- Insert default tenant admin
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, tenant_id) VALUES 
('00000000-0000-0000-0000-000000000001', 'admin@docextract.com', '$2b$12$CCrXN1QXpWFah9JVmk43Wuq.TPuOYs9bto7Taa3h0dL2wSkG7.PiS', 'Admin', 'User', 'tenant_admin', 'active', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Insert regular user for testing
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, tenant_id) VALUES 
('00000000-0000-0000-0000-000000000002', 'user@docextract.com', '$2b$12$CCrXN1QXpWFah9JVmk43Wuq.TPuOYs9bto7Taa3h0dL2wSkG7.PiS', 'Test', 'User', 'user', 'active', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Insert system admin (not tied to any tenant)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, tenant_id) VALUES 
('00000000-0000-0000-0000-000000000003', 'system@docextract.com', '$2b$12$CCrXN1QXpWFah9JVmk43Wuq.TPuOYs9bto7Taa3h0dL2wSkG7.PiS', 'System', 'Admin', 'system_admin', 'active', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEFAULT DOCUMENT CATEGORIES
-- ============================================================================

-- Insert default categories for organizing documents
INSERT INTO document_categories (id, tenant_id, name, description, color) VALUES 
('99fdb6a6-ac96-4a2b-9ee5-18be1931d149', '00000000-0000-0000-0000-000000000001', 'Invoice', 'Financial invoices and billing documents', '#10b981'),
('868af35b-88d5-4045-8f21-0766e3e7b78f', '00000000-0000-0000-0000-000000000001', 'Contract', 'Legal contracts and agreements', '#3b82f6'),
('86e5a3f3-51d6-48bf-8498-2a58eaf2d080', '00000000-0000-0000-0000-000000000001', 'Insurance', 'Insurance policies and related documents', '#f59e0b'),
('7c48b3a7-98b8-434e-9c9c-3f98f2983a62', '00000000-0000-0000-0000-000000000001', 'General', 'General documents and miscellaneous files', '#6b7280'),
('376288f0-a294-4592-b6bd-866a4ec43d25', '00000000-0000-0000-0000-000000000001', 'Personal', 'Personal documents and records', '#8b5cf6'),
('7f6b6a03-7c1d-4302-983f-a1e6531a6b7a', '00000000-0000-0000-0000-000000000001', 'Legal', 'Legal documents and court papers', '#ef4444')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ============================================================================
-- DEFAULT DOCUMENT TYPES
-- ============================================================================

-- Insert default document types for the default tenant
INSERT INTO document_types (tenant_id, name, description, schema_template) VALUES 
('00000000-0000-0000-0000-000000000001', 'invoice', 'Invoice documents for billing and payment processing', '{}'),
('00000000-0000-0000-0000-000000000001', 'contract', 'Legal contracts and agreements', '{}'),
('00000000-0000-0000-0000-000000000001', 'insurance_policy', 'Insurance policy documents', '{}'),
('00000000-0000-0000-0000-000000000001', 'receipt', 'Purchase receipts and payment confirmations', '{}'),
('00000000-0000-0000-0000-000000000001', 'medical_record', 'Medical records and health documents', '{}'),
('00000000-0000-0000-0000-000000000001', 'legal_document', 'Legal documents and court papers', '{}')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ============================================================================
-- DEFAULT TEMPLATES
-- ============================================================================

-- Insert default templates for common document types
INSERT INTO templates (tenant_id, name, description, document_type_id, extraction_schema, extraction_prompt, validation_rules, is_active, version, status)
SELECT 
    '00000000-0000-0000-0000-000000000001' as tenant_id,
    'Basic ' || dt.name || ' Template' as name,
    'Default template for extracting data from ' || dt.description as description,
    dt.id as document_type_id,
    CASE dt.name
        WHEN 'invoice' THEN '{
            "fields": {
                "invoice_number": {"type": "text", "required": true, "description": "Invoice identification number"},
                "invoice_date": {"type": "date", "required": true, "description": "Date the invoice was issued"},
                "total_amount": {"type": "number", "required": true, "description": "Total amount due"},
                "vendor_name": {"type": "text", "required": false, "description": "Name of the vendor/supplier"},
                "line_items": {"type": "array", "required": false, "description": "List of invoice line items"},
                "due_date": {"type": "date", "required": false, "description": "Payment due date"},
                "tax_amount": {"type": "number", "required": false, "description": "Tax amount"}
            }
        }'::jsonb
        WHEN 'contract' THEN '{
            "fields": {
                "contract_number": {"type": "text", "required": false, "description": "Contract identification number"},
                "effective_date": {"type": "date", "required": true, "description": "Date the contract becomes effective"},
                "expiration_date": {"type": "date", "required": false, "description": "Date the contract expires"},
                "parties": {"type": "array", "required": true, "description": "Parties involved in the contract"},
                "contract_value": {"type": "number", "required": false, "description": "Total contract value"},
                "contract_type": {"type": "text", "required": false, "description": "Type of contract (service, purchase, etc.)"}
            }
        }'::jsonb
        WHEN 'insurance_policy' THEN '{
            "fields": {
                "policy_number": {"type": "text", "required": true, "description": "Insurance policy number"},
                "policy_holder": {"type": "text", "required": true, "description": "Name of the policy holder"},
                "coverage_amount": {"type": "number", "required": false, "description": "Coverage amount"},
                "premium_amount": {"type": "number", "required": false, "description": "Premium amount"},
                "effective_date": {"type": "date", "required": true, "description": "Policy effective date"},
                "expiration_date": {"type": "date", "required": true, "description": "Policy expiration date"},
                "insurance_company": {"type": "text", "required": false, "description": "Name of the insurance company"}
            }
        }'::jsonb
        WHEN 'receipt' THEN '{
            "fields": {
                "receipt_number": {"type": "text", "required": false, "description": "Receipt identification number"},
                "purchase_date": {"type": "date", "required": true, "description": "Date of purchase"},
                "total_amount": {"type": "number", "required": true, "description": "Total amount paid"},
                "merchant_name": {"type": "text", "required": false, "description": "Name of the merchant/store"},
                "items": {"type": "array", "required": false, "description": "List of purchased items"},
                "payment_method": {"type": "text", "required": false, "description": "Payment method used"}
            }
        }'::jsonb
        WHEN 'medical_record' THEN '{
            "fields": {
                "patient_name": {"type": "text", "required": true, "description": "Name of the patient"},
                "date_of_service": {"type": "date", "required": true, "description": "Date of medical service"},
                "doctor_name": {"type": "text", "required": false, "description": "Name of the attending physician"},
                "diagnosis": {"type": "text", "required": false, "description": "Medical diagnosis"},
                "treatment": {"type": "text", "required": false, "description": "Treatment provided"},
                "prescription": {"type": "array", "required": false, "description": "Prescribed medications"}
            }
        }'::jsonb
        WHEN 'legal_document' THEN '{
            "fields": {
                "document_type": {"type": "text", "required": true, "description": "Type of legal document"},
                "case_number": {"type": "text", "required": false, "description": "Case or reference number"},
                "date_issued": {"type": "date", "required": false, "description": "Date the document was issued"},
                "parties_involved": {"type": "array", "required": false, "description": "Parties involved in the legal matter"},
                "court_name": {"type": "text", "required": false, "description": "Name of the court or legal authority"},
                "legal_status": {"type": "text", "required": false, "description": "Current legal status"}
            }
        }'::jsonb
        ELSE '{}'::jsonb
    END as extraction_schema,
    jsonb_build_object(
        'system_prompt', 'You are an expert at extracting structured data from ' || dt.description || ' documents. Be precise and only extract data that is clearly visible in the document.',
        'instructions', 'Extract the specified fields from the document. Return the data in valid JSON format. If a field is not found or unclear, return null for that field.',
        'output_format', 'json',
        'confidence_threshold', 0.8
    ) as extraction_prompt,
    jsonb_build_object(
        'max_chunk_size', 4000,
        'extraction_passes', 1,
        'confidence_threshold', 0.8,
        'enable_validation', true
    ) as validation_rules,
    true as is_active,
    1 as version,
    'draft' as status
FROM document_types dt
WHERE dt.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT ON CONSTRAINT unique_tenant_template_name_version DO NOTHING;

-- ============================================================================
-- DEFAULT TEMPLATE EXAMPLES
-- ============================================================================

-- Add example template examples for better extraction accuracy (few-shot learning)
INSERT INTO template_examples (template_id, tenant_id, name, document_snippet, expected_output, is_validated)
SELECT 
    t.id,
    '00000000-0000-0000-0000-000000000001' as tenant_id,
    'Sample ' || dt.name || ' Example',
    CASE dt.name
        WHEN 'invoice' THEN 'Invoice #INV-2024-001
Date: January 15, 2024
Bill To: ABC Company
Amount Due: $1,250.00
Due Date: February 15, 2024
Tax: $125.00'
        WHEN 'contract' THEN 'SERVICE AGREEMENT
Contract #: SA-2024-001
Effective Date: January 1, 2024
Expiration Date: December 31, 2024
Between: Company A and Company B
Value: $50,000'
        WHEN 'insurance_policy' THEN 'INSURANCE POLICY
Policy Number: POL-2024-001
Policy Holder: John Smith
Coverage: $100,000
Premium: $1,200 annually
Effective Date: January 1, 2024
Expiration Date: December 31, 2024
Insurance Company: ABC Insurance Co.'
        WHEN 'receipt' THEN 'RECEIPT
Receipt #: RCP-2024-001
Date: January 15, 2024
Store: ABC Electronics
Total: $299.99
Payment: Credit Card
Items: Laptop, Mouse, Keyboard'
        WHEN 'medical_record' THEN 'MEDICAL RECORD
Patient: Jane Doe
Date of Service: January 15, 2024
Doctor: Dr. Smith
Diagnosis: Annual Checkup
Treatment: Routine physical examination
Prescription: None'
        WHEN 'legal_document' THEN 'LEGAL DOCUMENT
Document Type: Contract Agreement
Case Number: CA-2024-001
Date Issued: January 15, 2024
Parties: John Doe, ABC Corporation
Court: Superior Court of California
Status: Active'
        ELSE 'Sample document content'
    END as document_snippet,
    CASE dt.name
        WHEN 'invoice' THEN '{
            "invoice_number": "INV-2024-001",
            "invoice_date": "2024-01-15",
            "total_amount": 1250.00,
            "vendor_name": null,
            "due_date": "2024-02-15",
            "tax_amount": 125.00
        }'::jsonb
        WHEN 'contract' THEN '{
            "contract_number": "SA-2024-001",
            "effective_date": "2024-01-01",
            "expiration_date": "2024-12-31",
            "parties": ["Company A", "Company B"],
            "contract_value": 50000,
            "contract_type": "Service Agreement"
        }'::jsonb
        WHEN 'insurance_policy' THEN '{
            "policy_number": "POL-2024-001",
            "policy_holder": "John Smith",
            "coverage_amount": 100000,
            "premium_amount": 1200,
            "effective_date": "2024-01-01",
            "expiration_date": "2024-12-31",
            "insurance_company": "ABC Insurance Co."
        }'::jsonb
        WHEN 'receipt' THEN '{
            "receipt_number": "RCP-2024-001",
            "purchase_date": "2024-01-15",
            "total_amount": 299.99,
            "merchant_name": "ABC Electronics",
            "payment_method": "Credit Card"
        }'::jsonb
        WHEN 'medical_record' THEN '{
            "patient_name": "Jane Doe",
            "date_of_service": "2024-01-15",
            "doctor_name": "Dr. Smith",
            "diagnosis": "Annual Checkup",
            "treatment": "Routine physical examination",
            "prescription": null
        }'::jsonb
        WHEN 'legal_document' THEN '{
            "document_type": "Contract Agreement",
            "case_number": "CA-2024-001",
            "date_issued": "2024-01-15",
            "parties_involved": ["John Doe", "ABC Corporation"],
            "court_name": "Superior Court of California",
            "legal_status": "Active"
        }'::jsonb
        ELSE '{}'::jsonb
    END as expected_output,
    true as is_validated
FROM templates t
JOIN document_types dt ON t.document_type_id = dt.id
WHERE t.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT ON CONSTRAINT unique_template_example_name DO NOTHING;

-- ============================================================================
-- DEFAULT TENANT CONFIGURATIONS
-- ============================================================================

-- Rate Limits Configuration
INSERT INTO tenant_configurations (tenant_id, config_type, config_data, is_active, environment) VALUES 
('00000000-0000-0000-0000-000000000001', 'rate_limits', '{
    "burst_limit": 10,
    "extractions_per_hour": 20,
    "api_requests_per_hour": 1000,
    "api_requests_per_minute": 100,
    "document_uploads_per_hour": 50,
    "max_concurrent_extractions": 3
}', true, 'development')
ON CONFLICT ON CONSTRAINT unique_tenant_config_type_env DO NOTHING;

-- Storage Configuration - Development
INSERT INTO tenant_configurations (tenant_id, config_type, config_data, is_active, environment) VALUES 
('00000000-0000-0000-0000-000000000001', 'storage', '{
    "region": "us-east-1",
    "provider": "minio",
    "endpoint_url": "http://minio:9000",
    "bucket_prefix": "dev-tenant-00000000-0000-0000-0000-000000000001",
    "max_storage_gb": 50,
    "allowed_file_types": ["pdf", "docx", "txt", "png", "jpg"]
}', true, 'development')
ON CONFLICT ON CONSTRAINT unique_tenant_config_type_env DO NOTHING;

-- Storage Configuration - Staging
INSERT INTO tenant_configurations (tenant_id, config_type, config_data, is_active, environment) VALUES 
('00000000-0000-0000-0000-000000000001', 'storage', '{
    "region": "us-east-1",
    "provider": "minio",
    "endpoint_url": "http://minio:9000",
    "bucket_prefix": "staging-tenant-00000000-0000-0000-0000-000000000001",
    "max_storage_gb": 100,
    "allowed_file_types": ["pdf", "docx", "txt", "png", "jpg"]
}', true, 'staging')
ON CONFLICT ON CONSTRAINT unique_tenant_config_type_env DO NOTHING;

-- Storage Configuration - Production
INSERT INTO tenant_configurations (tenant_id, config_type, config_data, is_active, environment) VALUES 
('00000000-0000-0000-0000-000000000001', 'storage', '{
    "region": "us-east-1",
    "provider": "aws_s3",
    "endpoint_url": null,
    "bucket_prefix": "prod-tenant-00000000-0000-0000-0000-000000000001",
    "max_storage_gb": 1000,
    "allowed_file_types": ["pdf", "docx", "txt", "png", "jpg"]
}', true, 'production')
ON CONFLICT ON CONSTRAINT unique_tenant_config_type_env DO NOTHING;

-- Cache Configuration - Development
INSERT INTO tenant_configurations (tenant_id, config_type, config_data, is_active, environment) VALUES 
('00000000-0000-0000-0000-000000000001', 'cache', '{
    "host": "redis",
    "port": 6379,
    "provider": "redis",
    "ttl_seconds": 1800,
    "max_memory_mb": 256,
    "database_number": 6
}', true, 'development')
ON CONFLICT ON CONSTRAINT unique_tenant_config_type_env DO NOTHING;

-- Cache Configuration - Staging
INSERT INTO tenant_configurations (tenant_id, config_type, config_data, is_active, environment) VALUES 
('00000000-0000-0000-0000-000000000001', 'cache', '{
    "host": "redis",
    "port": 6379,
    "provider": "redis",
    "ttl_seconds": 3600,
    "max_memory_mb": 512,
    "database_number": 14
}', true, 'staging')
ON CONFLICT ON CONSTRAINT unique_tenant_config_type_env DO NOTHING;

-- Cache Configuration - Production
INSERT INTO tenant_configurations (tenant_id, config_type, config_data, is_active, environment) VALUES 
('00000000-0000-0000-0000-000000000001', 'cache', '{
    "host": "redis-cloud",
    "port": 6379,
    "provider": "redis",
    "ttl_seconds": 7200,
    "max_memory_mb": 1024,
    "database_number": 22
}', true, 'production')
ON CONFLICT ON CONSTRAINT unique_tenant_config_type_env DO NOTHING;

-- Message Queue Configuration - Development
INSERT INTO tenant_configurations (tenant_id, config_type, config_data, is_active, environment) VALUES 
('00000000-0000-0000-0000-000000000001', 'message_queue', '{
    "provider": "redis",
    "broker_url": "redis://redis:6379",
    "max_workers": 1,
    "queue_prefix": "dev-tenant-00000000-0000-0000-0000-000000000001",
    "result_backend": "redis://redis:6379",
    "priority_queues": ["high", "normal", "low"]
}', true, 'development')
ON CONFLICT ON CONSTRAINT unique_tenant_config_type_env DO NOTHING;

-- Message Queue Configuration - Staging
INSERT INTO tenant_configurations (tenant_id, config_type, config_data, is_active, environment) VALUES 
('00000000-0000-0000-0000-000000000001', 'message_queue', '{
    "provider": "redis",
    "broker_url": "redis://redis:6379",
    "max_workers": 2,
    "queue_prefix": "staging-tenant-00000000-0000-0000-0000-000000000001",
    "result_backend": "redis://redis:6379",
    "priority_queues": ["high", "normal", "low"]
}', true, 'staging')
ON CONFLICT ON CONSTRAINT unique_tenant_config_type_env DO NOTHING;

-- Message Queue Configuration - Production
INSERT INTO tenant_configurations (tenant_id, config_type, config_data, is_active, environment) VALUES 
('00000000-0000-0000-0000-000000000001', 'message_queue', '{
    "provider": "redis",
    "broker_url": "redis://redis-cloud:6379",
    "max_workers": 5,
    "queue_prefix": "prod-tenant-00000000-0000-0000-0000-000000000001",
    "result_backend": "redis://redis-cloud:6379",
    "priority_queues": ["high", "normal", "low", "scheduled"]
}', true, 'production')
ON CONFLICT ON CONSTRAINT unique_tenant_config_type_env DO NOTHING;

-- CORS Configuration - Development
INSERT INTO tenant_configurations (tenant_id, config_type, config_data, is_active, environment) VALUES 
('00000000-0000-0000-0000-000000000001', 'cors', '{
    "max_age": 3600,
    "allowed_headers": ["*"],
    "allowed_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    "allowed_origins": ["http://localhost:3000", "http://127.0.0.1:3000", "http://frontend:3000"],
    "exposed_headers": [],
    "allow_credentials": true
}', true, 'development')
ON CONFLICT ON CONSTRAINT unique_tenant_config_type_env DO NOTHING;

-- Auth Configuration - Development
INSERT INTO tenant_configurations (tenant_id, config_type, config_data, is_active, environment) VALUES 
('00000000-0000-0000-0000-000000000001', 'auth', '{
    "require_2fa": false,
    "jwt_secret_key": "sS1wLEWQ6Gp6RZXbI2qtNW1xmLk8brx4lXDOw9M1vdk",
    "max_login_attempts": 10,
    "password_min_length": 8,
    "refresh_cookie_path": "/api/auth/refresh",
    "refresh_cookie_domain": null,
    "refresh_cookie_secure": false,
    "refresh_cookie_httponly": true,
    "refresh_cookie_samesite": "lax",
    "session_timeout_minutes": 480,
    "lockout_duration_minutes": 5,
    "concurrent_sessions_limit": 5,
    "refresh_token_expire_days": 30,
    "access_token_expire_minutes": 60
}', true, 'development')
ON CONFLICT ON CONSTRAINT unique_tenant_config_type_env DO NOTHING;

-- Security Configuration - Development
INSERT INTO tenant_configurations (tenant_id, config_type, config_data, is_active, environment) VALUES 
('00000000-0000-0000-0000-000000000001', 'security', '{
    "encryption_key": "54cbKofeQ0Jdgp6e6IUtb0tMV1qs0PYn25tFutXHTas",
    "referrer_policy": "strict-origin-when-cross-origin",
    "x_frame_options": "DENY",
    "csrf_token_header": "X-CSRF-Token",
    "rapid_token_threshold": 10,
    "rate_limit_burst_size": 100,
    "rate_limiting_enabled": false,
    "x_content_type_options": true,
    "content_security_policy": null,
    "csrf_protection_enabled": false,
    "security_headers_enabled": true,
    "auto_revoke_on_compromise": false,
    "strict_transport_security": false,
    "compromise_detection_enabled": false,
    "compromise_detection_threshold": 3,
    "rate_limit_requests_per_minute": 60
}', true, 'development')
ON CONFLICT ON CONSTRAINT unique_tenant_config_type_env DO NOTHING;

-- LLM Configuration - Development
-- NOTE: Replace with your actual API keys in production
INSERT INTO tenant_configurations (tenant_id, config_type, config_data, is_active, environment) VALUES 
('00000000-0000-0000-0000-000000000001', 'llm', '{
    "field_extraction": {
        "provider": "openai",
        "model_name": "gpt-4",
        "base_url": null,
        "api_key": null,
        "has_api_key": false,
        "max_tokens": 4000,
        "temperature": 0.1,
        "ollama_config": null
    },
    "document_extraction": {
        "provider": "openai",
        "model_name": "gpt-4",
        "base_url": null,
        "api_key": null,
        "has_api_key": false,
        "max_tokens": 4000,
        "temperature": 0.1,
        "ollama_config": {
            "host": "http://localhost:11434",
            "model_path": null
        }
    }
}', true, 'development')
ON CONFLICT ON CONSTRAINT unique_tenant_config_type_env DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Seed data migration completed successfully!';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - 1 default tenant';
    RAISE NOTICE '  - 3 default users (admin, user, system_admin)';
    RAISE NOTICE '  - 6 document categories';
    RAISE NOTICE '  - 6 document types';
    RAISE NOTICE '  - 6 default templates';
    RAISE NOTICE '  - 6 template examples';
    RAISE NOTICE '  - 12 tenant configurations (across 3 environments)';
    RAISE NOTICE '';
    RAISE NOTICE 'Default credentials:';
    RAISE NOTICE '  Email: admin@docextract.com';
    RAISE NOTICE '  Password: admin123';
    RAISE NOTICE '============================================================================';
END $$;

