/**
 * Template Management Types
 */
import { TenantEntity, BaseEntity } from '../../base/types/common';

// Template Core Types
export interface SchemaField {
  name: string;
  type: 'text' | 'number' | 'date' | 'array' | 'object';
  required: boolean;
  description?: string;
}

export interface LanguageConfig {
  // Language configuration
  language?: string;
  auto_detect_language?: boolean;
  require_language_match?: boolean;
}

export interface TemplateBase extends LanguageConfig {
  id: string;
  name: string;
  document_type_name?: string;
  schema: Record<string, SchemaField>;
  is_active: boolean;
  status?: 'draft' | 'published' | 'archived';
  version: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateFull extends TemplateBase {
  document_type_id?: string;
  prompt_config: Record<string, any>;
  extraction_settings: Record<string, any>;
  few_shot_examples: Array<Record<string, any>>;
}

export interface TemplateListResponse {
  templates: TemplateBase[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Template Request Types
export interface TemplateFormData extends LanguageConfig {
  name: string;
  document_type_id?: string;
  schema: Record<string, SchemaField>;
  prompt_config: {
    system_prompt: string;
    instructions: string;
    output_format: string;
  };
  extraction_settings: {
    max_chunk_size: number;
    extraction_passes: number;
    confidence_threshold: number;
  };
  few_shot_examples: Array<Record<string, any>>;
}

export interface TemplateCreateRequest extends TemplateFormData {
  // Additional fields for creation if needed
}

export interface TemplateUpdateRequest extends Partial<TemplateFormData> {
  // Partial update fields
}

export interface TemplateListParams {
  page?: number;
  per_page?: number;
  document_type_id?: string;
  status?: string;
  is_active?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Template Testing Types
export interface TemplateTestResult {
  status: string;
  message: string;
  extracted_data: Record<string, any>;
  confidence_score: number;
  processing_time_ms: number;
  errors?: string[];
  warnings?: string[];
}

export interface TemplateTestRequest {
  template_id: string;
  test_document: string;
  options?: {
    use_few_shot_examples?: boolean;
    confidence_threshold?: number;
  };
}

// Template Field Generation Types
export interface GenerateFieldsRequest {
  document_type: string;
  prompt: string;
  language?: string;
  document_content?: string;
  existing_fields?: Record<string, SchemaField>;
}

export interface GenerateFieldsResponse {
  fields: Record<string, SchemaField>;
  confidence_score: number;
  suggestions: string[];
  warnings?: string[];
}

// Template Status Types
export type TemplateStatus = 'draft' | 'published' | 'archived';

// Template Validation Types
export interface TemplateValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Template Statistics
export interface TemplateStats {
  total_templates: number;
  active_templates: number;
  draft_templates: number;
  archived_templates: number;
  total_extractions: number;
  success_rate: number;
  avg_confidence: number;
}
