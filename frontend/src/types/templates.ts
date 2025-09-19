// Shared template types for the Document Extraction Platform

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
