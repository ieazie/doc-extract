/**
 * System Health Monitoring Service
 * Handles all health monitoring operations including system status, LLM health checks, and performance metrics
 */
import { AxiosInstance } from 'axios';
import { BaseApiClient } from '../base/BaseApiClient';
import {
  HealthStatus,
  DetailedHealthStatus,
  ServiceHealthStatus,
  LLMHealthCheck,
  LLMHealthCheckRequest,
  HealthTestRequest,
  HealthTestResponse,
  RateLimitStatus,
  RateLimitResetRequest,
  RateLimitResetResponse,
  AvailableModelsResponse,
  HealthMonitoringConfig,
  DEFAULT_HEALTH_THRESHOLDS
} from './types/health';

export class HealthService extends BaseApiClient {
  constructor(client: AxiosInstance) {
    super(client);
  }

  // Basic Health Checks
  async getHealth(): Promise<HealthStatus> {
    return this.get<HealthStatus>('/health');
  }

  async getDetailedHealth(): Promise<DetailedHealthStatus> {
    return this.get<DetailedHealthStatus>('/health/detailed');
  }

  async getServiceHealth(serviceName: string): Promise<{
    service: string;
    status: string;
    message: string;
    last_checked: string;
    response_time_ms?: number;
    details?: Record<string, any>;
  }> {
    return this.get<{
      service: string;
      status: string;
      message: string;
      last_checked: string;
      response_time_ms?: number;
      details?: Record<string, any>;
    }>(`/health/services/${serviceName}`);
  }

  async getAllServiceHealth(): Promise<ServiceHealthStatus> {
    return this.get<ServiceHealthStatus>('/health/services');
  }

  // LLM Health Checks
  async checkLLMHealth(request?: LLMHealthCheckRequest): Promise<LLMHealthCheck> {
    return this.post<LLMHealthCheck>('/api/tenant/llm/health-check', request || {});
  }

  async checkAllLLMProviders(): Promise<Record<string, LLMHealthCheck>> {
    return this.get<Record<string, LLMHealthCheck>>('/health/llm/all');
  }

  async testLLMExtraction(testData: {
    config_type?: string;
    document_text: string;
    schema: Record<string, any>;
    prompt_config: Record<string, any>;
  }): Promise<{
    success: boolean;
    response_time_ms: number;
    extracted_data?: Record<string, any>;
    error?: string;
    provider: string;
    model: string;
    tokens_used?: number;
  }> {
    return this.post<{
      success: boolean;
      response_time_ms: number;
      extracted_data?: Record<string, any>;
      error?: string;
      provider: string;
      model: string;
      tokens_used?: number;
    }>('/health/llm/test-extraction', testData);
  }

  // Available Models
  async getAvailableModels(): Promise<AvailableModelsResponse[]> {
    return this.get<AvailableModelsResponse[]>('/health/llm/models');
  }

  async getModelInfo(provider: string, model: string): Promise<{
    provider: string;
    model: string;
    capabilities: string[];
    limits: Record<string, any>;
    status: string;
    last_tested?: string;
  }> {
    return this.get<{
      provider: string;
      model: string;
      capabilities: string[];
      limits: Record<string, any>;
      status: string;
      last_tested?: string;
    }>(`/health/llm/models/${provider}/${model}`);
  }

  // Rate Limit Status
  async getRateLimitStatus(): Promise<RateLimitStatus[]> {
    return this.get<RateLimitStatus[]>('/health/rate-limits');
  }

  async getRateLimitStatusForEndpoint(endpoint: string): Promise<RateLimitStatus> {
    return this.get<RateLimitStatus>(`/health/rate-limits/${endpoint}`);
  }

  async resetRateLimits(request?: RateLimitResetRequest): Promise<RateLimitResetResponse> {
    return this.post<RateLimitResetResponse>('/health/rate-limits/reset', request || {});
  }

  // Health Tests
  async runHealthTest(request: HealthTestRequest): Promise<HealthTestResponse> {
    return this.post<HealthTestResponse>('/health/test', request);
  }

  async getHealthTestStatus(testId: string): Promise<HealthTestResponse> {
    return this.get<HealthTestResponse>(`/health/test/${testId}`);
  }

  async cancelHealthTest(testId: string): Promise<{
    status: string;
    message: string;
  }> {
    return this.post<{
      status: string;
      message: string;
    }>(`/health/test/${testId}/cancel`);
  }

  // Performance Metrics
  async getPerformanceMetrics(dateRange?: {
    start_date: string;
    end_date: string;
  }): Promise<{
    response_times: {
      p50_ms: number;
      p95_ms: number;
      p99_ms: number;
      max_ms: number;
    };
    throughput: {
      requests_per_second: number;
      documents_per_minute: number;
      extractions_per_minute: number;
    };
    resource_utilization: {
      cpu_percent: number;
      memory_percent: number;
      disk_percent: number;
      network_io_mbps: number;
    };
    trends: Array<{
      timestamp: string;
      metrics: Record<string, number>;
    }>;
  }> {
    return this.get<{
      response_times: {
        p50_ms: number;
        p95_ms: number;
        p99_ms: number;
        max_ms: number;
      };
      throughput: {
        requests_per_second: number;
        documents_per_minute: number;
        extractions_per_minute: number;
      };
      resource_utilization: {
        cpu_percent: number;
        memory_percent: number;
        disk_percent: number;
        network_io_mbps: number;
      };
      trends: Array<{
        timestamp: string;
        metrics: Record<string, number>;
      }>;
    }>('/health/performance', {
      params: dateRange
    });
  }

  // System Alerts
  async getActiveAlerts(): Promise<Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    service: string;
    message: string;
    details: string;
    created_at: string;
    is_acknowledged: boolean;
  }>> {
    return this.get<Array<{
      id: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      service: string;
      message: string;
      details: string;
      created_at: string;
      is_acknowledged: boolean;
    }>>('/health/alerts');
  }

  async acknowledgeAlert(alertId: string): Promise<{
    status: string;
    message: string;
  }> {
    return this.post<{
      status: string;
      message: string;
    }>(`/health/alerts/${alertId}/acknowledge`);
  }

  async resolveAlert(alertId: string): Promise<{
    status: string;
    message: string;
  }> {
    return this.post<{
      status: string;
      message: string;
    }>(`/health/alerts/${alertId}/resolve`);
  }

  // Health Monitoring Configuration
  async getHealthMonitoringConfig(): Promise<HealthMonitoringConfig> {
    return this.get<HealthMonitoringConfig>('/health/config');
  }

  async updateHealthMonitoringConfig(config: Partial<HealthMonitoringConfig>): Promise<HealthMonitoringConfig> {
    return this.put<HealthMonitoringConfig>('/health/config', config);
  }

  // Health Dashboard Data
  async getHealthDashboard(): Promise<{
    overall_status: string;
    services: Record<string, {
      status: string;
      last_check: string;
      response_time_ms?: number;
    }>;
    alerts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    performance_summary: {
      avg_response_time_ms: number;
      error_rate_percent: number;
      uptime_percent: number;
    };
    recent_activity: Array<{
      timestamp: string;
      event: string;
      severity: string;
      message: string;
    }>;
  }> {
    return this.get<{
      overall_status: string;
      services: Record<string, {
        status: string;
        last_check: string;
        response_time_ms?: number;
      }>;
      alerts: {
        critical: number;
        high: number;
        medium: number;
        low: number;
      };
      performance_summary: {
        avg_response_time_ms: number;
        error_rate_percent: number;
        uptime_percent: number;
      };
      recent_activity: Array<{
        timestamp: string;
        event: string;
        severity: string;
        message: string;
      }>;
    }>('/health/dashboard');
  }

  // Health Utilities
  async getDefaultThresholds(): Promise<typeof DEFAULT_HEALTH_THRESHOLDS> {
    return Promise.resolve(DEFAULT_HEALTH_THRESHOLDS);
  }

  async validateHealthThresholds(thresholds: Record<string, number>): Promise<{
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return this.post<{
      is_valid: boolean;
      errors: string[];
      warnings: string[];
    }>('/health/validate-thresholds', thresholds);
  }

  async getHealthHistory(serviceName?: string, dateRange?: {
    start_date: string;
    end_date: string;
  }): Promise<Array<{
    timestamp: string;
    service: string;
    status: string;
    metrics: Record<string, any>;
  }>> {
    return this.get<Array<{
      timestamp: string;
      service: string;
      status: string;
      metrics: Record<string, any>;
    }>>('/health/history', {
      params: {
        service: serviceName,
        ...dateRange
      }
    });
  }

  // Emergency Operations
  async triggerEmergencyShutdown(): Promise<{
    status: string;
    message: string;
    shutdown_time: string;
  }> {
    return this.post<{
      status: string;
      message: string;
      shutdown_time: string;
    }>('/health/emergency/shutdown');
  }

  async triggerEmergencyMaintenance(): Promise<{
    status: string;
    message: string;
    maintenance_mode: boolean;
    estimated_duration_minutes: number;
  }> {
    return this.post<{
      status: string;
      message: string;
      maintenance_mode: boolean;
      estimated_duration_minutes: number;
    }>('/health/emergency/maintenance');
  }

  async clearAllCaches(): Promise<{
    status: string;
    message: string;
    cleared_caches: string[];
  }> {
    return this.post<{
      status: string;
      message: string;
      cleared_caches: string[];
    }>('/health/emergency/clear-caches');
  }
}
