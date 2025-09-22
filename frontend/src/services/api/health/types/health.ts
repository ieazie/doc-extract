/**
 * System Health Monitoring Types
 */
import { BaseEntity } from '../../base/types/common';

// Core Health Types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  timestamp: string;
  version: string;
  environment: string;
  uptime_seconds: number;
  services: ServiceHealthStatus;
  system_info: SystemInfo;
}

export interface ServiceHealthStatus {
  database: ServiceStatus;
  cache: ServiceStatus;
  storage: ServiceStatus;
  message_queue: ServiceStatus;
  llm_providers: Record<string, ServiceStatus>;
  api: ServiceStatus;
  background_workers: ServiceStatus;
}

export interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  message: string;
  last_checked: string;
  response_time_ms?: number;
  details?: Record<string, any>;
  error?: string;
}

export interface SystemInfo {
  cpu_usage_percent: number;
  memory_usage_percent: number;
  disk_usage_percent: number;
  load_average: number[];
  active_connections: number;
  total_requests: number;
  requests_per_minute: number;
  error_rate_percent: number;
}

// Detailed Health Information
export interface DetailedHealthStatus extends HealthStatus {
  database_details: DatabaseHealth;
  cache_details: CacheHealth;
  storage_details: StorageHealth;
  message_queue_details: MessageQueueHealth;
  llm_provider_details: Record<string, LLMProviderHealth>;
  api_details: APIHealth;
  background_worker_details: BackgroundWorkerHealth;
  performance_metrics: PerformanceMetrics;
  alerts: HealthAlert[];
}

export interface DatabaseHealth extends ServiceStatus {
  connection_pool: {
    active_connections: number;
    idle_connections: number;
    max_connections: number;
    connection_utilization_percent: number;
  };
  query_performance: {
    avg_query_time_ms: number;
    slow_queries_count: number;
    total_queries: number;
  };
  replication_status?: {
    is_replica: boolean;
    lag_seconds: number;
    last_sync: string;
  };
}

export interface CacheHealth extends ServiceStatus {
  memory_usage: {
    used_mb: number;
    max_mb: number;
    utilization_percent: number;
  };
  hit_rate: {
    hits: number;
    misses: number;
    hit_rate_percent: number;
  };
  eviction_stats: {
    evicted_keys: number;
    eviction_rate_per_second: number;
  };
}

export interface StorageHealth extends ServiceStatus {
  available_space: {
    total_gb: number;
    used_gb: number;
    available_gb: number;
    utilization_percent: number;
  };
  iops: {
    read_iops: number;
    write_iops: number;
    max_iops: number;
  };
  latency: {
    avg_read_latency_ms: number;
    avg_write_latency_ms: number;
  };
}

export interface MessageQueueHealth extends ServiceStatus {
  queue_stats: {
    active_queues: number;
    total_messages: number;
    pending_messages: number;
    processed_messages: number;
    failed_messages: number;
  };
  worker_stats: {
    active_workers: number;
    idle_workers: number;
    max_workers: number;
    avg_processing_time_ms: number;
  };
}

export interface LLMProviderHealth extends ServiceStatus {
  provider: string;
  model: string;
  available_models: string[];
  rate_limits: {
    requests_per_minute: number;
    tokens_per_minute: number;
    current_usage: {
      requests: number;
      tokens: number;
    };
  };
  response_times: {
    avg_response_time_ms: number;
    p95_response_time_ms: number;
    p99_response_time_ms: number;
  };
  error_rates: {
    timeout_rate_percent: number;
    error_rate_percent: number;
    quota_exceeded_rate_percent: number;
  };
}

export interface APIHealth extends ServiceStatus {
  endpoint_stats: Record<string, {
    requests_per_minute: number;
    avg_response_time_ms: number;
    error_rate_percent: number;
    last_request: string;
  }>;
  rate_limiting: {
    active_limits: number;
    blocked_requests: number;
    allowed_requests: number;
  };
}

export interface BackgroundWorkerHealth extends ServiceStatus {
  worker_stats: {
    active_workers: number;
    idle_workers: number;
    busy_workers: number;
    failed_workers: number;
  };
  task_stats: {
    queued_tasks: number;
    running_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    avg_task_duration_ms: number;
  };
}

export interface PerformanceMetrics {
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
}

export interface HealthAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  service: string;
  message: string;
  details: string;
  created_at: string;
  resolved_at?: string;
  is_resolved: boolean;
}

// LLM Health Check
export interface LLMHealthCheck {
  provider: string;
  model: string;
  healthy: boolean;
  checked_at: string;
  response_time_ms?: number;
  error?: string;
  details?: {
    available_models: string[];
    rate_limits: Record<string, any>;
    quota_usage: Record<string, any>;
  };
}

export interface LLMHealthCheckRequest {
  config_type?: 'field_extraction' | 'document_extraction';
  provider?: string;
  model?: string;
  test_prompt?: string;
}

// Health Test Operations
export interface HealthTestRequest {
  test_type: 'full' | 'quick' | 'service' | 'custom';
  services?: string[];
  include_performance?: boolean;
  include_detailed_metrics?: boolean;
}

export interface HealthTestResponse {
  test_id: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  results?: DetailedHealthStatus;
  error?: string;
}

// Rate Limit Status
export interface RateLimitStatus {
  endpoint: string;
  limit_type: string;
  current_count: number;
  limit: number;
  reset_time: string;
  window_start: string;
  remaining_requests: number;
  is_exceeded: boolean;
}

export interface RateLimitResetRequest {
  endpoint?: string;
  limit_type?: string;
  reset_all?: boolean;
}

export interface RateLimitResetResponse {
  reset_count: number;
  reset_endpoints: string[];
  message: string;
}

// Model Info for individual model details
export interface ModelInfo {
  provider: string;
  model: string;
  capabilities: {
    field_extraction: boolean;
    document_extraction: boolean;
    language_detection: boolean;
    summarization: boolean;
  };
  limits: {
    max_tokens: number;
    max_input_length: number;
    requests_per_minute: number;
    tokens_per_minute: number;
  };
  status: string;
  last_tested?: string;
}

// Available Models
export interface AvailableModelsResponse {
  provider: string;
  models: string[];
  default_model?: string;
  capabilities: {
    field_extraction: boolean;
    document_extraction: boolean;
    language_detection: boolean;
    summarization: boolean;
  };
  limits: {
    max_tokens: number;
    max_input_length: number;
    requests_per_minute: number;
    tokens_per_minute: number;
  };
}

// Health Monitoring Configuration
export interface HealthMonitoringConfig {
  check_interval_seconds: number;
  alert_thresholds: {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
    response_time_ms: number;
    error_rate_percent: number;
  };
  enabled_checks: string[];
  notification_settings: {
    enabled: boolean;
    webhook_url?: string;
    email_recipients?: string[];
    slack_webhook?: string;
  };
}

// Health Status Types
export type HealthLevel = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export type ServiceName = 'database' | 'cache' | 'storage' | 'message_queue' | 'llm_providers' | 'api' | 'background_workers';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type TestType = 'full' | 'quick' | 'service' | 'custom';

// Health Constants
export const HEALTH_LEVELS: HealthLevel[] = ['healthy', 'degraded', 'unhealthy', 'unknown'];

export const SERVICE_NAMES: ServiceName[] = ['database', 'cache', 'storage', 'message_queue', 'llm_providers', 'api', 'background_workers'];

export const ALERT_SEVERITIES: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];

export const TEST_TYPES: TestType[] = ['full', 'quick', 'service', 'custom'];

// Default Health Thresholds
export const DEFAULT_HEALTH_THRESHOLDS = {
  cpu_percent: 80,
  memory_percent: 85,
  disk_percent: 90,
  response_time_ms: 5000,
  error_rate_percent: 5,
  database_connection_utilization: 90,
  cache_hit_rate_percent: 80,
  storage_utilization_percent: 85,
  queue_length: 1000,
  worker_utilization_percent: 95,
};
