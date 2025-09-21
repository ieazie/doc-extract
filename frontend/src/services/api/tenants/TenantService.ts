/**
 * Tenant Management Service
 * Handles all tenant operations including CRUD, configuration, and infrastructure management
 */
import { AxiosInstance } from 'axios';
import { BaseApiClient } from '../base/BaseApiClient';
import {
  Tenant,
  TenantCreateRequest,
  TenantUpdateRequest,
  TenantListParams,
  TenantConfiguration,
  TenantConfigurationCreate,
  TenantConfigurationUpdate,
  TenantConfigSummary,
  TenantRateLimit,
  TenantInfo,
  TenantEnvironmentInfo,
  InfrastructureStatus,
  InfrastructureConfig,
  AvailableEnvironments,
  EnvironmentSecret,
  EnvironmentSecretUpdate,
  EnvironmentConfig,
  AvailableModelsResponse
} from './types/tenants';

export class TenantService extends BaseApiClient {
  constructor(client: AxiosInstance) {
    super(client);
  }

  // Tenant CRUD Operations
  async getTenants(params?: TenantListParams): Promise<Tenant[]> {
    return this.get<Tenant[]>('/api/auth/tenants/all', params);
  }

  async getTenant(tenantId: string): Promise<Tenant> {
    return this.get<Tenant>(`/api/auth/tenants/${tenantId}`);
  }

  async createTenant(tenantData: TenantCreateRequest): Promise<Tenant> {
    return this.post<Tenant>('/api/auth/tenants', tenantData);
  }

  async updateTenant(tenantId: string, tenantData: TenantUpdateRequest): Promise<Tenant> {
    return this.put<Tenant>(`/api/auth/tenants/${tenantId}`, tenantData);
  }

  async deleteTenant(tenantId: string): Promise<void> {
    await this.delete<void>(`/api/auth/tenants/${tenantId}`);
  }

  async getUserTenants(): Promise<Tenant[]> {
    return this.get<Tenant[]>('/api/auth/tenants');
  }

  // Tenant Configuration Management
  async getTenantConfigurations(): Promise<TenantConfiguration[]> {
    return this.get<TenantConfiguration[]>('/api/tenant/configurations');
  }

  async getTenantConfigSummary(): Promise<TenantConfigSummary> {
    return this.get<TenantConfigSummary>('/api/tenant/configurations/summary');
  }

  async getTenantConfiguration(configType: 'llm' | 'rate_limits'): Promise<TenantConfiguration> {
    return this.get<TenantConfiguration>(`/api/tenant/configurations/${configType}`);
  }

  async createTenantConfiguration(config: TenantConfigurationCreate): Promise<TenantConfiguration> {
    return this.post<TenantConfiguration>('/api/tenant/configurations', config);
  }

  async updateTenantConfiguration(
    configType: 'llm' | 'rate_limits',
    updates: TenantConfigurationUpdate
  ): Promise<TenantConfiguration> {
    return this.put<TenantConfiguration>(`/api/tenant/configurations/${configType}`, updates);
  }

  async deleteTenantConfiguration(configType: 'llm' | 'rate_limits'): Promise<void> {
    await this.delete<void>(`/api/tenant/configurations/${configType}`);
  }

  // Tenant Information
  async getTenantInfo(): Promise<TenantEnvironmentInfo> {
    return this.get<TenantEnvironmentInfo>('/api/tenant/info');
  }

  async getTenantInfoBySlug(slug: string): Promise<TenantEnvironmentInfo> {
    return this.get<TenantEnvironmentInfo>(`/api/tenant/${slug}/info`);
  }

  // Infrastructure Management
  async getInfrastructureStatus(tenantSlug: string, environment: string): Promise<InfrastructureStatus> {
    return this.get<InfrastructureStatus>(`/api/tenant/${tenantSlug}/infrastructure/status/${environment}`);
  }

  async getInfrastructureConfig(tenantSlug: string, environment: string): Promise<InfrastructureConfig> {
    return this.get<InfrastructureConfig>(`/api/tenant/${tenantSlug}/infrastructure/config/${environment}`);
  }

  async getAvailableEnvironments(): Promise<AvailableEnvironments> {
    return this.get<AvailableEnvironments>('/api/tenant/configurations/environments');
  }

  // Environment Secrets Management
  async getEnvironmentSecrets(environment: string): Promise<EnvironmentSecret[]> {
    return this.get<EnvironmentSecret[]>(`/api/tenant/secrets/${environment}`);
  }

  async updateEnvironmentSecret(environment: string, secretUpdate: EnvironmentSecretUpdate): Promise<EnvironmentSecret> {
    return this.put<EnvironmentSecret>(`/api/tenant/secrets/${environment}/${secretUpdate.secret_name}`, secretUpdate);
  }

  // Environment Configuration
  async getEnvironmentConfig(environment: string): Promise<EnvironmentConfig> {
    return this.get<EnvironmentConfig>(`/api/tenant/infrastructure/config/${environment}`);
  }

  async updateEnvironmentConfig(environment: string, config: Partial<EnvironmentConfig>, configType: string = 'infrastructure'): Promise<EnvironmentConfig> {
    return this.put<EnvironmentConfig>(`/api/tenant/configurations/${configType}/${environment}`, config);
  }

  // Rate Limits Management
  async getRateLimitStatus(): Promise<Record<string, TenantRateLimit>> {
    return this.get<Record<string, TenantRateLimit>>('/api/tenant/rate-limits');
  }

  async resetRateLimits(): Promise<{ message: string }> {
    return this.post<{ message: string }>('/api/tenant/rate-limits/reset');
  }

  // Available Models
  async getAvailableModels(): Promise<AvailableModelsResponse[]> {
    return this.get<AvailableModelsResponse[]>('/api/models/available');
  }

  // Tenant Statistics
  async getTenantStatistics(tenantId: string): Promise<{
    user_count: number;
    document_count: number;
    extraction_count: number;
    template_count: number;
    storage_used_gb: number;
    api_calls_last_24h: number;
    active_users_last_30d: number;
  }> {
    return this.get<{
      user_count: number;
      document_count: number;
      extraction_count: number;
      template_count: number;
      storage_used_gb: number;
      api_calls_last_24h: number;
      active_users_last_30d: number;
    }>(`/api/tenant/${tenantId}/statistics`);
  }

  // Tenant Search
  async searchTenants(query: string, filters?: Partial<TenantListParams>): Promise<Tenant[]> {
    return this.get<Tenant[]>('/api/tenant/search', {
      q: query,
      ...filters
    });
  }

  // Tenant Health Check
  async getTenantHealth(tenantId: string): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, {
      status: 'healthy' | 'degraded' | 'unhealthy';
      last_checked: string;
      details?: Record<string, any>;
    }>;
    issues: Array<{
      service: string;
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
  }> {
    return this.get<{
      status: 'healthy' | 'degraded' | 'unhealthy';
      services: Record<string, {
        status: 'healthy' | 'degraded' | 'unhealthy';
        last_checked: string;
        details?: Record<string, any>;
      }>;
      issues: Array<{
        service: string;
        issue: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
      }>;
    }>(`/api/tenant/${tenantId}/health`);
  }
}
