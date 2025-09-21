/**
 * Language Features Service
 * Handles all language-related operations including detection, validation, and configuration
 */
import { AxiosInstance } from 'axios';
import { BaseApiClient } from '../base/BaseApiClient';
import {
  SupportedLanguage,
  TenantLanguageConfig,
  TenantLanguageConfigUpdate,
  LanguageConfigCreate,
  LanguageDetectionResult,
  LanguageDetectionRequest,
  LanguageValidationResponse,
  LanguageValidationRequest,
  LanguageSupportInfo,
  LanguageUsageStats,
  LanguageDetectionStats,
  LanguageProcessingConfig,
  LanguageListResponse,
  LanguageStatsResponse,
  DEFAULT_LANGUAGES,
  BCP47_LANGUAGE_MAP
} from './types/language';

export class LanguageService extends BaseApiClient {
  constructor(client: AxiosInstance) {
    super(client);
  }

  // Language Support Operations
  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    return this.get<SupportedLanguage[]>('/api/language/supported');
  }

  async getAllSupportedLanguages(): Promise<SupportedLanguage[]> {
    return this.get<SupportedLanguage[]>('/api/language/supported/all');
  }

  async getLanguageSupportInfo(): Promise<LanguageSupportInfo> {
    return this.get<LanguageSupportInfo>('/api/language/support-info');
  }

  // Tenant Language Configuration
  async getTenantLanguageConfig(tenantId: string): Promise<TenantLanguageConfig> {
    return this.get<TenantLanguageConfig>(`/api/language/tenant/${tenantId}/config`);
  }

  async updateTenantLanguageConfig(tenantId: string, config: TenantLanguageConfigUpdate): Promise<TenantLanguageConfig> {
    return this.put<TenantLanguageConfig>(`/api/language/tenant/${tenantId}/config`, config);
  }

  async createTenantLanguageConfig(config: LanguageConfigCreate): Promise<TenantLanguageConfig> {
    return this.post<TenantLanguageConfig>('/api/language/tenant/config', config);
  }

  async deleteTenantLanguageConfig(tenantId: string): Promise<void> {
    await this.delete<void>(`/api/language/tenant/${tenantId}/config`);
  }

  // Language Detection
  async detectDocumentLanguage(text: string, options?: {
    max_length?: number;
    min_confidence?: number;
    supported_languages?: string[];
  }): Promise<LanguageDetectionResult> {
    return this.post<LanguageDetectionResult>('/api/language/detect', {
      text,
      options
    });
  }

  async detectDocumentLanguageBatch(texts: string[], options?: {
    max_length?: number;
    min_confidence?: number;
    supported_languages?: string[];
  }): Promise<LanguageDetectionResult[]> {
    return this.post<LanguageDetectionResult[]>('/api/language/detect/batch', {
      texts,
      options
    });
  }

  // Language Validation
  async validateLanguageSupport(tenantId: string, language: string): Promise<LanguageValidationResponse> {
    return this.post<LanguageValidationResponse>('/api/language/validate', {
      tenant_id: tenantId,
      language
    });
  }

  async validateLanguageBatch(tenantId: string, languages: string[]): Promise<Record<string, LanguageValidationResponse>> {
    return this.post<Record<string, LanguageValidationResponse>>('/api/language/validate/batch', {
      tenant_id: tenantId,
      languages
    });
  }

  // Tenant Language Information
  async getTenantSupportedLanguages(tenantId: string): Promise<string[]> {
    return this.get<string[]>(`/api/language/tenant/${tenantId}/supported`);
  }

  async getTenantDefaultLanguage(tenantId: string): Promise<string> {
    return this.get<string>(`/api/language/tenant/${tenantId}/default`);
  }

  async getTenantLanguageStats(tenantId: string): Promise<{
    usage_stats: LanguageUsageStats[];
    detection_stats: LanguageDetectionStats;
    config_info: LanguageSupportInfo;
  }> {
    return this.get<{
      usage_stats: LanguageUsageStats[];
      detection_stats: LanguageDetectionStats;
      config_info: LanguageSupportInfo;
    }>(`/api/language/tenant/${tenantId}/stats`);
  }

  // Language Processing Configuration
  async getLanguageProcessingConfig(tenantId: string, language: string): Promise<LanguageProcessingConfig> {
    return this.get<LanguageProcessingConfig>(`/api/language/tenant/${tenantId}/processing/${language}`);
  }

  async updateLanguageProcessingConfig(
    tenantId: string,
    language: string,
    config: Partial<LanguageProcessingConfig['config']>
  ): Promise<LanguageProcessingConfig> {
    return this.put<LanguageProcessingConfig>(`/api/language/tenant/${tenantId}/processing/${language}`, {
      config
    });
  }

  // Language Statistics
  async getLanguageUsageStats(tenantId?: string): Promise<LanguageUsageStats[]> {
    const url = tenantId 
      ? `/api/language/stats?tenant_id=${tenantId}`
      : '/api/language/stats';
    return this.get<LanguageUsageStats[]>(url);
  }

  async getLanguageDetectionStats(tenantId?: string): Promise<LanguageDetectionStats> {
    const url = tenantId 
      ? `/api/language/detection-stats?tenant_id=${tenantId}`
      : '/api/language/detection-stats';
    return this.get<LanguageDetectionStats>(url);
  }

  // Language Utilities
  async getLanguageInfo(languageCode: string): Promise<{
    code: string;
    name: string;
    native_name: string;
    bcp47_tag: string;
    is_supported: boolean;
    detection_confidence_threshold: number;
  }> {
    return this.get<{
      code: string;
      name: string;
      native_name: string;
      bcp47_tag: string;
      is_supported: boolean;
      detection_confidence_threshold: number;
    }>(`/api/language/info/${languageCode}`);
  }

  async convertToBCP47(languageCode: string): Promise<string> {
    return BCP47_LANGUAGE_MAP[languageCode] || languageCode;
  }

  async getDefaultLanguages(): Promise<string[]> {
    return Promise.resolve(DEFAULT_LANGUAGES);
  }

  // Language Health Check
  async getLanguageServiceHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      detection: 'healthy' | 'degraded' | 'unhealthy';
      validation: 'healthy' | 'degraded' | 'unhealthy';
      configuration: 'healthy' | 'degraded' | 'unhealthy';
    };
    last_checked: string;
    issues: Array<{
      service: string;
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
  }> {
    return this.get<{
      status: 'healthy' | 'degraded' | 'unhealthy';
      services: {
        detection: 'healthy' | 'degraded' | 'unhealthy';
        validation: 'healthy' | 'degraded' | 'unhealthy';
        configuration: 'healthy' | 'degraded' | 'unhealthy';
      };
      last_checked: string;
      issues: Array<{
        service: string;
        issue: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
      }>;
    }>('/api/language/health');
  }
}
