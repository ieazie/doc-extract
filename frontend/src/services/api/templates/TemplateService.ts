/**
 * Template Management Service
 * Handles all template operations including CRUD, testing, and field generation
 */
import { AxiosInstance } from 'axios';
import { BaseApiClient } from '../base/BaseApiClient';
import {
  TemplateBase,
  TemplateFull,
  TemplateListResponse,
  TemplateListParams,
  TemplateCreateRequest,
  TemplateUpdateRequest,
  TemplateTestResult,
  TemplateTestRequest,
  GenerateFieldsRequest,
  GenerateFieldsResponse
} from './types/templates';

export class TemplateService extends BaseApiClient {
  constructor(client: AxiosInstance) {
    super(client);
  }

  // Template CRUD Operations
  async getTemplates(params?: TemplateListParams): Promise<TemplateListResponse> {
    return this.get<TemplateListResponse>('/api/templates', params);
  }

  async getTemplate(templateId: string): Promise<TemplateFull> {
    return this.get<TemplateFull>(`/api/templates/${templateId}`);
  }

  async createTemplate(templateData: TemplateCreateRequest): Promise<TemplateBase> {
    return this.post<TemplateBase>('/api/templates', templateData);
  }

  async updateTemplate(templateId: string, templateData: TemplateUpdateRequest): Promise<TemplateBase> {
    return this.put<TemplateBase>(`/api/templates/${templateId}`, templateData);
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.delete<void>(`/api/templates/${templateId}`);
  }

  // Template Testing
  async testTemplate(templateId: string, testDocument: string): Promise<TemplateTestResult> {
    return this.post<TemplateTestResult>(`/api/templates/${templateId}/test`, {
      test_document: testDocument
    });
  }

  // Template Field Generation
  async generateFieldsFromPrompt(
    request: GenerateFieldsRequest,
    templateLanguage: string = 'en',
    options?: { signal?: AbortSignal }
  ): Promise<GenerateFieldsResponse> {
    return this.request<GenerateFieldsResponse>({
      method: 'POST',
      url: `/api/templates/generate-fields-from-prompt?template_language=${templateLanguage}`,
      data: request,
      signal: options?.signal
    });
  }

  async generateFieldsFromDocument(
    request: GenerateFieldsRequest,
    templateLanguage: string = 'en',
    autoDetectLanguage: boolean = true,
    requireLanguageMatch: boolean = false,
    options?: { signal?: AbortSignal }
  ): Promise<GenerateFieldsResponse> {
    const params = new URLSearchParams({
      template_language: templateLanguage,
      auto_detect_language: autoDetectLanguage.toString(),
      require_language_match: requireLanguageMatch.toString()
    });

    return this.request<GenerateFieldsResponse>({
      method: 'POST',
      url: `/api/templates/generate-fields-from-document?${params.toString()}`,
      data: request,
      signal: options?.signal
    });
  }

  // Template Validation
  async validateTemplate(templateData: TemplateCreateRequest): Promise<{
    is_valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }> {
    return this.post<{
      is_valid: boolean;
      errors: string[];
      warnings: string[];
      suggestions: string[];
    }>('/api/templates/validate', templateData);
  }

  // Template Statistics
  async getTemplateStats(): Promise<{
    total_templates: number;
    active_templates: number;
    draft_templates: number;
    archived_templates: number;
    total_extractions: number;
    success_rate: number;
    avg_confidence: number;
  }> {
    return this.get<{
      total_templates: number;
      active_templates: number;
      draft_templates: number;
      archived_templates: number;
      total_extractions: number;
      success_rate: number;
      avg_confidence: number;
    }>('/api/templates/stats');
  }

  // Template Search
  async searchTemplates(query: string, filters?: Partial<TemplateListParams>): Promise<TemplateListResponse> {
    return this.get<TemplateListResponse>('/api/templates/search', {
      q: query,
      ...filters
    });
  }

  // Template Duplication
  async duplicateTemplate(templateId: string, newName: string): Promise<TemplateBase> {
    return this.post<TemplateBase>(`/api/templates/${templateId}/duplicate`, {
      name: newName
    });
  }

  // Template Versioning
  async getTemplateVersions(templateId: string): Promise<TemplateBase[]> {
    return this.get<TemplateBase[]>(`/api/templates/${templateId}/versions`);
  }

  async getTemplateVersion(templateId: string, version: number): Promise<TemplateBase> {
    return this.get<TemplateBase>(`/api/templates/${templateId}/versions/${version}`);
  }

  async createTemplateVersion(templateId: string, versionData: TemplateUpdateRequest): Promise<TemplateBase> {
    return this.post<TemplateBase>(`/api/templates/${templateId}/versions`, versionData);
  }

  // Template Export/Import
  async exportTemplate(templateId: string): Promise<{
    template: TemplateFull;
    export_data: string;
    format: 'json' | 'yaml';
  }> {
    return this.get<{
      template: TemplateFull;
      export_data: string;
      format: 'json' | 'yaml';
    }>(`/api/templates/${templateId}/export`);
  }

  async importTemplate(templateData: string, format: 'json' | 'yaml'): Promise<TemplateBase> {
    return this.post<TemplateBase>('/api/templates/import', {
      template_data: templateData,
      format
    });
  }
}
