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
  TenantConfigurationRead,
  TenantConfigurationWrite,
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
  AvailableModelsResponse,
  AuthenticationConfig,
  CORSConfig,
  SecurityConfig
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

  async getTenantConfiguration(configType: TenantConfiguration['config_type']): Promise<TenantConfigurationRead> {
    return this.get<TenantConfigurationRead>(`/api/tenant/configurations/${configType}`);
  }

  async createTenantConfiguration(config: TenantConfigurationCreate): Promise<TenantConfigurationWrite> {
    return this.post<TenantConfigurationWrite>('/api/tenant/configurations', config);
  }

  async updateTenantConfiguration(
    configType: TenantConfiguration['config_type'],
    updates: TenantConfigurationUpdate
  ): Promise<TenantConfigurationWrite> {
    return this.put<TenantConfigurationWrite>(`/api/tenant/configurations/${configType}`, updates);
  }

  async deleteTenantConfiguration(configType: TenantConfiguration['config_type']): Promise<void> {
    await this.delete<void>(`/api/tenant/configurations/${configType}`);
  }

  // New Configuration Types (Auth, CORS, Security)
  async getAuthenticationConfig(environment?: string): Promise<AuthenticationConfig | null> {
    try {
      if (environment) {
        const response = await this.get<TenantConfigurationRead>(
          `/api/tenant/configurations/auth/${environment}`
        );
        return (response?.config_data as unknown as AuthenticationConfig) ?? null;
      }

      const response = await this.get<TenantConfigurationRead>(
        '/api/tenant/configurations/auth'
      );
      return (response?.config_data as unknown as AuthenticationConfig) ?? null;
    } catch (error) {
      console.warn('No authentication config found:', error);
      return null;
    }
  }

  async updateAuthenticationConfig(
    config: AuthenticationConfig,
    environment?: string
  ): Promise<TenantConfigurationWrite> {
    if (environment) {
      return this.put<TenantConfigurationWrite>(
        `/api/tenant/configurations/auth/${environment}`,
        config
      );
    }

    return this.createTenantConfiguration({
      tenant_id: '', // Will be set by backend from JWT
      config_type: 'auth',
      config_data: config
    });
  }

  async getCORSConfig(environment?: string): Promise<CORSConfig | null> {
    try {
      if (environment) {
        const response = await this.get<TenantConfigurationRead>(
          `/api/tenant/configurations/cors/${environment}`
        );
        return (response?.config_data as unknown as CORSConfig) ?? null;
      }

      const response = await this.get<TenantConfigurationRead>(
        '/api/tenant/configurations/cors'
      );
      return (response?.config_data as unknown as CORSConfig) ?? null;
    } catch (error) {
      console.warn('No CORS config found:', error);
      return null;
    }
  }

  async updateCORSConfig(
    config: CORSConfig,
    environment?: string
  ): Promise<TenantConfigurationWrite> {
    if (environment) {
      return this.put<TenantConfigurationWrite>(
        `/api/tenant/configurations/cors/${environment}`,
        config
      );
    }

    return this.createTenantConfiguration({
      tenant_id: '', // Will be set by backend from JWT
      config_type: 'cors',
      config_data: config
    });
  }

  async getSecurityConfig(environment?: string): Promise<SecurityConfig | null> {
    try {
      if (environment) {
        const response = await this.get<TenantConfigurationRead>(
          `/api/tenant/configurations/security/${environment}`
        );
        return (response?.config_data as unknown as SecurityConfig) ?? null;
      }

      const response = await this.get<TenantConfigurationRead>(
        '/api/tenant/configurations/security'
      );
      return (response?.config_data as unknown as SecurityConfig) ?? null;
    } catch (error) {
      console.warn('No security config found:', error);
      return null;
    }
  }

  async updateSecurityConfig(
    config: SecurityConfig,
    environment?: string
  ): Promise<TenantConfigurationWrite> {
    if (environment) {
      return this.put<TenantConfigurationWrite>(
        `/api/tenant/configurations/security/${environment}`,
        config
      );
    }

    return this.createTenantConfiguration({
      tenant_id: '', // Will be set by backend from JWT
      config_type: 'security',
      config_data: config
    });
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
