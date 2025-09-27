-- Migration 014: Add default seed data
-- Created: 2025-01-27
-- Description: Add essential seed data for system initialization

-- ============================================================================
-- ADD DEFAULT DOCUMENT TYPES
-- ============================================================================

-- Insert default document types for the default tenant
INSERT INTO document_types (tenant_id, name, description, icon, color, is_active, sort_order) VALUES 
('00000000-0000-0000-0000-000000000001', 'invoice', 'Invoice documents for billing and payment processing', 'receipt', '#10b981', true, 1),
('00000000-0000-0000-0000-000000000001', 'contract', 'Legal contracts and agreements', 'file-text', '#3b82f6', true, 2),
('00000000-0000-0000-0000-000000000001', 'insurance_policy', 'Insurance policy documents', 'shield', '#f59e0b', true, 3),
('00000000-0000-0000-0000-000000000001', 'receipt', 'Purchase receipts and payment confirmations', 'credit-card', '#8b5cf6', true, 4),
('00000000-0000-0000-0000-000000000001', 'medical_record', 'Medical records and health documents', 'heart', '#ef4444', true, 5),
('00000000-0000-0000-0000-000000000001', 'legal_document', 'Legal documents and court papers', 'scale', '#6b7280', true, 6)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ============================================================================
-- ADD DEFAULT TEMPLATES
-- ============================================================================

-- Insert default templates for common document types
INSERT INTO templates (tenant_id, name, description, document_type_id, schema, prompt_config, extraction_settings, is_active, version)
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
    END as schema,
    jsonb_build_object(
        'system_prompt', 'You are an expert at extracting structured data from ' || dt.description || ' documents. Be precise and only extract data that is clearly visible in the document.',
        'instructions', 'Extract the specified fields from the document. Return the data in valid JSON format. If a field is not found or unclear, return null for that field.',
        'output_format', 'json',
        'confidence_threshold', 0.8
    ) as prompt_config,
    jsonb_build_object(
        'max_chunk_size', 4000,
        'extraction_passes', 1,
        'confidence_threshold', 0.8,
        'enable_validation', true
    ) as extraction_settings,
    true as is_active,
    1 as version
FROM document_types dt
WHERE dt.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ============================================================================
-- ADD DEFAULT TEMPLATE EXAMPLES
-- ============================================================================

-- Add example template examples for better extraction accuracy
INSERT INTO template_examples (template_id, name, document_snippet, expected_output, is_validated)
SELECT 
    t.id,
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
ON CONFLICT (template_id, name) DO NOTHING;

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE document_types IS 'Document type definitions with seed data for common document types';
COMMENT ON TABLE templates IS 'Template definitions with default templates for each document type';
COMMENT ON TABLE template_examples IS 'Example documents for few-shot learning in template extraction';
