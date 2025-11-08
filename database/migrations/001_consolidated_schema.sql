-- ============================================================================
-- CONSOLIDATED DATABASE SCHEMA
-- ============================================================================
-- Generated: 2025-11-01
-- Description: Complete database schema generated from current production state
-- This replaces all previous incremental migrations (000-026)
--
-- IMPORTANT: This is a consolidated migration that represents the final state
-- of the database schema. All previous migrations are superseded by this file.
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for setting updated_at (alias)
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate tenant slugs
CREATE OR REPLACE FUNCTION generate_tenant_slug(tenant_name text) RETURNS text AS $$
DECLARE
    base_slug text;
    final_slug text;
    counter integer := 0;
BEGIN
    -- Convert to lowercase, replace spaces/special chars with hyphens, remove duplicates
    base_slug := lower(regexp_replace(tenant_name, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    
    -- Limit to 50 characters to leave room for counter suffix
    base_slug := substring(base_slug from 1 for 50);
    
    final_slug := base_slug;
    
    -- Check for uniqueness and append counter if needed
    WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Tenants table (multi-tenancy support)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(63) UNIQUE,
    settings JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'trial')),
    environment VARCHAR(50) DEFAULT 'development',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE tenants IS 'Core tenants table for multi-tenancy support';
COMMENT ON COLUMN tenants.id IS 'Primary key for the tenant';
COMMENT ON COLUMN tenants.name IS 'Display name of the tenant organization';
COMMENT ON COLUMN tenants.slug IS 'URL-friendly unique identifier (max 63 chars for DNS compatibility)';
COMMENT ON COLUMN tenants.settings IS 'JSON configuration settings for the tenant';
COMMENT ON COLUMN tenants.status IS 'Current status of the tenant (active, inactive, suspended, trial)';
COMMENT ON COLUMN tenants.environment IS 'Deployment environment (development, staging, production)';

-- Users table (authentication and authorization)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('system_admin', 'tenant_admin', 'user', 'viewer')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE users IS 'User accounts with role-based access control';
COMMENT ON COLUMN users.tenant_id IS 'Tenant this user belongs to (NULL for system_admin)';

-- API Keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refresh Tokens table (JWT refresh token management)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jti VARCHAR(36) NOT NULL,
    family_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE refresh_tokens IS 'Refresh tokens with tenant isolation. Each token is scoped to a specific tenant for security.';
COMMENT ON COLUMN refresh_tokens.jti IS 'JWT ID - unique identifier for the token';
COMMENT ON COLUMN refresh_tokens.family_id IS 'Token family ID for rotation tracking and reuse detection';
COMMENT ON COLUMN refresh_tokens.tenant_id IS 'Tenant ID for tenant-scoped token isolation. Required for proper tenant separation in multi-tenant environments.';

-- ============================================================================
-- DOCUMENT MANAGEMENT TABLES
-- ============================================================================

-- Document Types table
CREATE TABLE document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    schema_template JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_tenant_document_type UNIQUE (tenant_id, name)
);

COMMENT ON TABLE document_types IS 'Document type definitions with seed data for common document types';

-- Document Categories table
CREATE TABLE document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6b7280',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_tenant_category UNIQUE (tenant_id, name)
);

COMMENT ON TABLE document_categories IS 'Tenant-isolated document categories for organizing documents';

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_type_id UUID REFERENCES document_types(id) ON DELETE SET NULL,
    category_id UUID REFERENCES document_categories(id),
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(500),
    s3_key VARCHAR(500) NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    upload_status VARCHAR(20) DEFAULT 'pending',
    processing_status VARCHAR(20) DEFAULT 'pending',
    extraction_status VARCHAR(20) DEFAULT 'pending',
    status VARCHAR(20) DEFAULT 'uploaded',
    page_count INTEGER,
    character_count INTEGER,
    word_count INTEGER,
    raw_content TEXT,
    detected_language VARCHAR(10),
    language_confidence NUMERIC(3,2),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    extraction_completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT documents_tenant_s3_key_unique UNIQUE (tenant_id, s3_key),
    CONSTRAINT documents_status_check CHECK (status IN ('uploaded', 'processing', 'processed', 'failed'))
);

COMMENT ON TABLE documents IS 'Uploaded documents with metadata and processing status';
COMMENT ON COLUMN documents.s3_key IS 'S3 key/path for the stored document';
COMMENT ON COLUMN documents.raw_content IS 'Raw extracted text content from the document';
COMMENT ON COLUMN documents.status IS 'Current status of the document (uploaded, processing, processed, failed)';

-- Document Tags table (many-to-many)
CREATE TABLE document_tags (
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    PRIMARY KEY (document_id, tag)
);

-- ============================================================================
-- TEMPLATE MANAGEMENT TABLES
-- ============================================================================

-- Templates table
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_type_id UUID REFERENCES document_types(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1 NOT NULL CHECK (version > 0),
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_default BOOLEAN DEFAULT false NOT NULL,
    language VARCHAR(10) DEFAULT 'en' CHECK (language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
    auto_detect_language BOOLEAN DEFAULT true,
    require_language_match BOOLEAN DEFAULT false,
    extraction_schema JSONB DEFAULT '{}' NOT NULL,
    extraction_prompt TEXT,
    validation_rules JSONB DEFAULT '{}',
    test_document_id UUID REFERENCES documents(id),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_tenant_template_name_version UNIQUE (tenant_id, name, version)
);

COMMENT ON TABLE templates IS 'Template definitions with default templates for each document type';
COMMENT ON COLUMN templates.language IS 'Primary language this template is designed for (ISO 639-1 code)';
COMMENT ON COLUMN templates.auto_detect_language IS 'Whether to automatically detect document language before extraction';
COMMENT ON COLUMN templates.require_language_match IS 'Whether to require template and document language to match';

-- Template Examples table (few-shot learning)
CREATE TABLE template_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    document_snippet TEXT NOT NULL,
    expected_output JSONB DEFAULT '{}' NOT NULL,
    is_validated BOOLEAN DEFAULT false,
    validation_notes TEXT,
    source_document_id UUID,
    created_by_user VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_template_example_name UNIQUE (template_id, name)
);

COMMENT ON TABLE template_examples IS 'Example documents for few-shot learning in template extraction';
COMMENT ON COLUMN template_examples.tenant_id IS 'Tenant this template example belongs to (inherited from template)';

-- Template Versions table
CREATE TABLE template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number > 0),
    version_name VARCHAR(255),
    description TEXT,
    extraction_schema JSONB DEFAULT '{}' NOT NULL,
    extraction_prompt TEXT,
    validation_rules JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_published BOOLEAN DEFAULT false NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_template_version UNIQUE (template_id, version_number)
);

COMMENT ON TABLE template_versions IS 'Version history for templates';

-- Template Usage table (tracking and analytics)
CREATE TABLE template_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    extraction_id UUID,
    used_by UUID REFERENCES users(id) ON DELETE SET NULL,
    usage_type VARCHAR(20) DEFAULT 'extraction' CHECK (usage_type IN ('extraction', 'test', 'preview', 'training')),
    success BOOLEAN,
    processing_time_seconds INTEGER,
    confidence_score NUMERIC(5,4) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE template_usage IS 'Usage statistics and tracking for templates';

-- ============================================================================
-- EXTRACTION TABLES
-- ============================================================================

-- Extractions table
CREATE TABLE extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reviewed')),
    confidence_score NUMERIC(5,4) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
    extracted_data JSONB DEFAULT '{}',
    results JSONB,
    confidence_scores JSONB,
    raw_response TEXT,
    error_message TEXT,
    processing_time_seconds INTEGER,
    processing_time INTEGER,
    llm_model VARCHAR(100),
    llm_provider VARCHAR(50),
    is_test_extraction BOOLEAN DEFAULT false,
    review_status VARCHAR(50) DEFAULT 'pending' CHECK (review_status IN ('pending', 'in_review', 'approved', 'rejected', 'needs_correction')),
    assigned_reviewer VARCHAR(100),
    reviewed_by VARCHAR(100),
    review_comments TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE extractions IS 'Results of data extraction from documents using templates';

-- Extraction Fields table
CREATE TABLE extraction_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extraction_id UUID NOT NULL REFERENCES extractions(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_value TEXT,
    confidence_score NUMERIC(5,4) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
    field_type VARCHAR(50),
    validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')),
    validation_message TEXT,
    is_required BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE extraction_fields IS 'Field-level data extracted from documents';

-- Extraction Language Validation table
CREATE TABLE extraction_language_validation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extraction_id UUID NOT NULL REFERENCES extractions(id) ON DELETE CASCADE,
    template_language VARCHAR(10) NOT NULL CHECK (template_language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
    document_language VARCHAR(10) CHECK (document_language IS NULL OR document_language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
    language_match BOOLEAN,
    validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'passed', 'failed', 'ignored')),
    validation_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE extraction_language_validation IS 'Tracks language validation for extractions to ensure template-document language compatibility';

-- ============================================================================
-- JOB MANAGEMENT TABLES
-- ============================================================================

-- Extraction Jobs table
CREATE TABLE extraction_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID NOT NULL REFERENCES document_categories(id),
    template_id UUID NOT NULL REFERENCES templates(id),
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('immediate', 'scheduled', 'recurring')),
    schedule_config JSONB,
    run_at TIMESTAMP WITH TIME ZONE,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    max_concurrency INTEGER DEFAULT 5,
    retry_policy JSONB DEFAULT '{"max_retries": 3, "retry_delay_minutes": 5}',
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_tenant_job_name UNIQUE (tenant_id, name),
    CONSTRAINT unique_tenant_job_id UNIQUE (tenant_id, id),
    CONSTRAINT extraction_jobs_schedule_invariants_check CHECK (
        (schedule_type = 'immediate' AND run_at IS NULL AND schedule_config IS NULL) OR
        (schedule_type = 'scheduled' AND run_at IS NOT NULL AND schedule_config IS NULL) OR
        (schedule_type = 'recurring' AND schedule_config IS NOT NULL AND run_at IS NULL AND 
         schedule_config ? 'cron' AND jsonb_typeof(schedule_config->'cron') = 'string')
    )
);

COMMENT ON TABLE extraction_jobs IS 'Tenant-specific extraction jobs that automatically process documents in categories using templates';
COMMENT ON CONSTRAINT extraction_jobs_schedule_invariants_check ON extraction_jobs IS 'Enforces schedule_type invariants: immediate jobs have no config/run_at, scheduled jobs have run_at only, recurring jobs have cron config only. Prevents scheduler failures.';

-- Document Extraction Tracking table
CREATE TABLE document_extraction_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES extraction_jobs(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    extraction_id UUID REFERENCES extractions(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_tenant_job_document UNIQUE (tenant_id, job_id, document_id),
    CONSTRAINT document_extraction_tracking_job_tenant_fk FOREIGN KEY (tenant_id, job_id) 
        REFERENCES extraction_jobs(tenant_id, id) ON DELETE CASCADE
);

COMMENT ON TABLE document_extraction_tracking IS 'Tracks which documents have been processed by which extraction jobs';
COMMENT ON CONSTRAINT document_extraction_tracking_job_tenant_fk ON document_extraction_tracking IS 'Ensures tenant_id matches the job''s tenant to prevent cross-tenant data leaks.';

-- ============================================================================
-- TENANT CONFIGURATION TABLES
-- ============================================================================

-- Tenant Configurations table
CREATE TABLE tenant_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    config_type VARCHAR(50) NOT NULL CHECK (config_type IN ('storage', 'llm', 'cache', 'message_queue', 'rate_limits', 'auth', 'cors', 'security')),
    config_data JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    environment VARCHAR(50) DEFAULT 'development',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_tenant_config_type_env UNIQUE (tenant_id, config_type, environment)
);

COMMENT ON TABLE tenant_configurations IS 'Environment-aware tenant-specific configurations';

-- Tenant Environment Secrets table
CREATE TABLE tenant_environment_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    environment VARCHAR(50) NOT NULL,
    secret_type VARCHAR(50) NOT NULL,
    encrypted_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_tenant_env_secret_type UNIQUE (tenant_id, environment, secret_type)
);

-- Tenant Environment Usage table
CREATE TABLE tenant_environment_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    environment VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    usage_amount NUMERIC(15,2) DEFAULT 0,
    billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant Rate Limits table
CREATE TABLE tenant_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    limit_type VARCHAR(50) NOT NULL,
    limit_value INTEGER NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    current_usage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant Language Configs table
CREATE TABLE tenant_language_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    default_language VARCHAR(10) DEFAULT 'en',
    supported_languages TEXT[] DEFAULT ARRAY['en'],
    auto_detect_language BOOLEAN DEFAULT true,
    fallback_language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_tenant_language_config UNIQUE (tenant_id)
);

-- ============================================================================
-- SCHEMA MIGRATIONS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Tenants indexes
CREATE UNIQUE INDEX idx_tenants_name_unique ON tenants (LOWER(name));
CREATE INDEX idx_tenants_name ON tenants(name);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_environment ON tenants(environment);

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);

-- API Keys indexes
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);

-- Refresh Tokens indexes
CREATE INDEX idx_refresh_tokens_jti ON refresh_tokens(jti);
CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens(family_id);
CREATE INDEX idx_refresh_tokens_user_tenant ON refresh_tokens(user_id, tenant_id);
CREATE INDEX idx_refresh_tokens_user_family_tenant ON refresh_tokens(user_id, family_id, tenant_id);
CREATE INDEX idx_refresh_tokens_tenant_id ON refresh_tokens(tenant_id);
CREATE INDEX idx_refresh_tokens_active_expires ON refresh_tokens(is_active, expires_at);

-- Document Types indexes
CREATE INDEX idx_document_types_tenant_id ON document_types(tenant_id);
CREATE INDEX idx_document_types_tenant_name ON document_types(tenant_id, name);

-- Document Categories indexes
CREATE INDEX idx_document_categories_tenant_id ON document_categories(tenant_id);
CREATE INDEX idx_document_categories_tenant_name ON document_categories(tenant_id, name);

-- Documents indexes
CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX idx_documents_document_type_id ON documents(document_type_id);
CREATE INDEX idx_documents_category_id ON documents(category_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_s3_key ON documents(s3_key);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_detected_language ON documents(detected_language);
CREATE INDEX idx_documents_tenant_language ON documents(tenant_id, detected_language);
CREATE INDEX idx_documents_tenant_category ON documents(tenant_id, category_id);
CREATE INDEX idx_documents_tenant_status ON documents(tenant_id, upload_status, processing_status, extraction_status);

-- Templates indexes
CREATE INDEX idx_templates_tenant_id ON templates(tenant_id);
CREATE INDEX idx_templates_document_type_id ON templates(document_type_id);
CREATE INDEX idx_templates_created_by ON templates(created_by);
CREATE INDEX idx_templates_is_active ON templates(is_active);
CREATE INDEX idx_templates_is_default ON templates(is_default);
CREATE INDEX idx_templates_status ON templates(status);
CREATE INDEX idx_templates_language ON templates(language);
CREATE INDEX idx_templates_test_document_id ON templates(test_document_id);
CREATE INDEX idx_templates_created_at ON templates(created_at DESC);
CREATE INDEX idx_templates_tenant_active ON templates(tenant_id, is_active);
CREATE INDEX idx_templates_tenant_document_type ON templates(tenant_id, document_type_id);
CREATE INDEX idx_templates_tenant_status ON templates(tenant_id, status);
CREATE INDEX idx_templates_tenant_language ON templates(tenant_id, language);

-- Template Examples indexes
CREATE INDEX idx_template_examples_tenant_id ON template_examples(tenant_id);
CREATE INDEX idx_template_examples_tenant_template ON template_examples(tenant_id, template_id);
CREATE INDEX idx_template_examples_tenant_name ON template_examples(tenant_id, name);
CREATE INDEX idx_template_examples_tenant_template_name ON template_examples(tenant_id, template_id, name);
CREATE INDEX idx_template_examples_tenant_validated ON template_examples(tenant_id, is_validated);
CREATE INDEX idx_template_examples_tenant_created_by ON template_examples(tenant_id, created_by_user);
CREATE INDEX idx_template_examples_tenant_source_doc ON template_examples(tenant_id, source_document_id);
CREATE INDEX idx_template_examples_tenant_created_at ON template_examples(tenant_id, created_at DESC);

COMMENT ON INDEX idx_template_examples_tenant_template IS 'Optimized for tenant-scoped template queries';
COMMENT ON INDEX idx_template_examples_tenant_name IS 'Optimized for tenant-scoped name searches';
COMMENT ON INDEX idx_template_examples_tenant_template_name IS 'Optimized for tenant-scoped template+name queries';
COMMENT ON INDEX idx_template_examples_tenant_validated IS 'Optimized for tenant-scoped validation status queries';
COMMENT ON INDEX idx_template_examples_tenant_created_by IS 'Optimized for tenant-scoped user queries';
COMMENT ON INDEX idx_template_examples_tenant_source_doc IS 'Optimized for tenant-scoped source document queries';
COMMENT ON INDEX idx_template_examples_tenant_created_at IS 'Optimized for tenant-scoped sorting by creation date (newest first)';

-- Template Versions indexes
CREATE INDEX idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX idx_template_versions_version_number ON template_versions(version_number);
CREATE INDEX idx_template_versions_is_active ON template_versions(is_active);
CREATE INDEX idx_template_versions_is_published ON template_versions(is_published);
CREATE INDEX idx_template_versions_created_by ON template_versions(created_by);
CREATE INDEX idx_template_versions_created_at ON template_versions(created_at DESC);
CREATE INDEX idx_template_versions_template_active ON template_versions(template_id, is_active);
CREATE INDEX idx_template_versions_template_published ON template_versions(template_id, is_published);

-- Template Usage indexes
CREATE INDEX idx_template_usage_template_id ON template_usage(template_id);
CREATE INDEX idx_template_usage_document_id ON template_usage(document_id);
CREATE INDEX idx_template_usage_extraction_id ON template_usage(extraction_id);
CREATE INDEX idx_template_usage_used_by ON template_usage(used_by);
CREATE INDEX idx_template_usage_usage_type ON template_usage(usage_type);
CREATE INDEX idx_template_usage_success ON template_usage(success);
CREATE INDEX idx_template_usage_confidence_score ON template_usage(confidence_score);
CREATE INDEX idx_template_usage_created_at ON template_usage(created_at DESC);
CREATE INDEX idx_template_usage_template_type ON template_usage(template_id, usage_type);
CREATE INDEX idx_template_usage_template_success ON template_usage(template_id, success);

-- Extractions indexes
CREATE INDEX idx_extractions_tenant_id ON extractions(tenant_id);
CREATE INDEX idx_extractions_document_id ON extractions(document_id);
CREATE INDEX idx_extractions_template_id ON extractions(template_id);
CREATE INDEX idx_extractions_created_by ON extractions(created_by);
CREATE INDEX idx_extractions_status ON extractions(status);
CREATE INDEX idx_extractions_review_status ON extractions(review_status);
CREATE INDEX idx_extractions_assigned_reviewer ON extractions(assigned_reviewer);
CREATE INDEX idx_extractions_reviewed_by ON extractions(reviewed_by);
CREATE INDEX idx_extractions_created_at ON extractions(created_at DESC);
CREATE INDEX idx_extractions_tenant_status ON extractions(tenant_id, status);
CREATE INDEX idx_extractions_tenant_document ON extractions(tenant_id, document_id);

-- Extraction Fields indexes
CREATE INDEX idx_extraction_fields_extraction_id ON extraction_fields(extraction_id);
CREATE INDEX idx_extraction_fields_field_name ON extraction_fields(field_name);
CREATE INDEX idx_extraction_fields_validation_status ON extraction_fields(validation_status);

-- Extraction Language Validation indexes
CREATE INDEX idx_extraction_language_validation_extraction_id ON extraction_language_validation(extraction_id);
CREATE INDEX idx_extraction_language_validation_status ON extraction_language_validation(validation_status);

-- Extraction Jobs indexes
CREATE INDEX idx_extraction_jobs_tenant_id ON extraction_jobs(tenant_id);
CREATE INDEX idx_extraction_jobs_category_id ON extraction_jobs(category_id);
CREATE INDEX idx_extraction_jobs_template_id ON extraction_jobs(template_id);
CREATE INDEX idx_extraction_jobs_schedule_type ON extraction_jobs(schedule_type);
CREATE INDEX idx_extraction_jobs_is_active ON extraction_jobs(is_active);
CREATE INDEX idx_extraction_jobs_next_run_at ON extraction_jobs(next_run_at);
CREATE INDEX idx_extraction_jobs_tenant_active ON extraction_jobs(tenant_id, is_active);
CREATE INDEX idx_extraction_jobs_tenant_schedule ON extraction_jobs(tenant_id, schedule_type, is_active);

-- Document Extraction Tracking indexes
CREATE INDEX idx_document_extraction_tracking_tenant_id ON document_extraction_tracking(tenant_id);
CREATE INDEX idx_document_extraction_tracking_job_id ON document_extraction_tracking(job_id);
CREATE INDEX idx_document_extraction_tracking_document_id ON document_extraction_tracking(document_id);
CREATE INDEX idx_document_extraction_tracking_extraction_id ON document_extraction_tracking(extraction_id);
CREATE INDEX idx_document_extraction_tracking_status ON document_extraction_tracking(status);
CREATE INDEX idx_document_extraction_tracking_tenant_job ON document_extraction_tracking(tenant_id, job_id);

-- Tenant Configurations indexes
CREATE INDEX idx_tenant_configurations_tenant_id ON tenant_configurations(tenant_id);
CREATE INDEX idx_tenant_configurations_type ON tenant_configurations(config_type);
CREATE INDEX idx_tenant_configurations_environment ON tenant_configurations(environment);
CREATE INDEX idx_tenant_configurations_active ON tenant_configurations(is_active);
CREATE INDEX idx_tenant_configurations_tenant_env ON tenant_configurations(tenant_id, environment);
CREATE INDEX idx_tenant_config_auth ON tenant_configurations(tenant_id, config_type) WHERE config_type = 'auth';
CREATE INDEX idx_tenant_config_cors ON tenant_configurations(tenant_id, config_type) WHERE config_type = 'cors';
CREATE INDEX idx_tenant_config_security ON tenant_configurations(tenant_id, config_type) WHERE config_type = 'security';

-- Tenant Environment Secrets indexes
CREATE INDEX idx_tenant_environment_secrets_type ON tenant_environment_secrets(secret_type);
CREATE INDEX idx_tenant_environment_secrets_tenant_env ON tenant_environment_secrets(tenant_id, environment);
CREATE INDEX idx_tenant_environment_secrets_tenant_type ON tenant_environment_secrets(tenant_id, secret_type);

-- Tenant Environment Usage indexes
CREATE INDEX idx_tenant_environment_usage_tenant_env ON tenant_environment_usage(tenant_id, environment);
CREATE INDEX idx_tenant_environment_usage_resource_type ON tenant_environment_usage(resource_type);
CREATE INDEX idx_tenant_environment_usage_period ON tenant_environment_usage(billing_period_start);

-- Tenant Rate Limits indexes
CREATE INDEX idx_tenant_rate_limits_tenant_id ON tenant_rate_limits(tenant_id);
CREATE INDEX idx_tenant_rate_limits_type ON tenant_rate_limits(limit_type);
CREATE INDEX idx_tenant_rate_limits_window ON tenant_rate_limits(window_start);

-- Tenant Language Configs indexes
CREATE INDEX idx_tenant_language_configs_tenant_id ON tenant_language_configs(tenant_id);

-- ============================================================================
-- TRIGGER FUNCTIONS (for tables that need custom trigger functions)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_extraction_jobs_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_document_extraction_tracking_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_tenant_configurations_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_tenant_environment_secrets_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_tenant_environment_usage_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_tenant_rate_limits_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Tenants triggers
CREATE TRIGGER trg_tenants_set_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Users triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- API Keys triggers
CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Document Categories triggers
CREATE TRIGGER update_document_categories_updated_at
    BEFORE UPDATE ON document_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Extraction Jobs triggers
CREATE TRIGGER trigger_extraction_jobs_updated_at
    BEFORE UPDATE ON extraction_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_extraction_jobs_updated_at();

-- Document Extraction Tracking triggers
CREATE TRIGGER trigger_document_extraction_tracking_updated_at
    BEFORE UPDATE ON document_extraction_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_document_extraction_tracking_updated_at();

-- Tenant Configurations triggers
CREATE TRIGGER trigger_update_tenant_configurations_updated_at
    BEFORE UPDATE ON tenant_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_configurations_updated_at();

-- Tenant Environment Secrets triggers
CREATE TRIGGER trigger_update_tenant_environment_secrets_updated_at
    BEFORE UPDATE ON tenant_environment_secrets
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_environment_secrets_updated_at();

-- Tenant Environment Usage triggers
CREATE TRIGGER trigger_update_tenant_environment_usage_updated_at
    BEFORE UPDATE ON tenant_environment_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_environment_usage_updated_at();

-- Tenant Rate Limits triggers
CREATE TRIGGER trigger_update_tenant_rate_limits_updated_at
    BEFORE UPDATE ON tenant_rate_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_rate_limits_updated_at();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Document details view with aggregated information
CREATE OR REPLACE VIEW document_details AS
SELECT 
    d.id,
    d.tenant_id,
    d.original_filename,
    d.file_size,
    d.upload_status,
    d.processing_status,
    d.extraction_status,
    dt.name AS document_type,
    dc.name AS category,
    dc.color AS category_color,
    d.page_count,
    d.character_count,
    d.word_count,
    d.created_at,
    d.extraction_completed_at,
    COALESCE(array_agg(DISTINCT dt_tags.tag) FILTER (WHERE dt_tags.tag IS NOT NULL), ARRAY[]::varchar[]) AS tags
FROM documents d
LEFT JOIN document_types dt ON d.document_type_id = dt.id
LEFT JOIN document_categories dc ON d.category_id = dc.id
LEFT JOIN document_tags dt_tags ON d.id = dt_tags.document_id
GROUP BY d.id, d.original_filename, d.file_size, d.upload_status, d.processing_status, 
         d.extraction_status, dt.name, dc.name, dc.color, d.page_count, d.character_count, 
         d.word_count, d.created_at, d.extraction_completed_at;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Consolidated schema migration completed successfully!';
    RAISE NOTICE 'Database: docextract';
    RAISE NOTICE 'Generated: 2025-11-01';
    RAISE NOTICE '============================================================================';
END $$;

