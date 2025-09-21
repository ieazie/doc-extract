/**
 * Tenant Management Types
 */
import { TenantEntity, BaseEntity } from '../../base/types/common';

// Core Tenant Types
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, any>;
  status: string;
  environment: string;
  created_at: string;
  updated_at: string;
}

export interface TenantCreateRequest {
  name: string;
  slug: string;
  environment: string;
  settings?: Record<string, any>;
}

export interface TenantUpdateRequest {
  name?: string;
  slug?: string;
  settings?: Record<string, any>;
  status?: string;
}

export interface TenantListParams {
  page?: number;
  per_page?: number;
  environment?: string;
  status?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Tenant Configuration Types
export interface TenantConfiguration {
  id: string;
  tenant_id: string;
  config_type: 'llm' | 'rate_limits' | 'storage' | 'cache' | 'message_queue';
  config_data: LLMConfig | RateLimitsConfig | StorageConfig | CacheConfig | MessageQueueConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantConfigurationCreate {
  tenant_id: string;
  config_type: 'llm' | 'rate_limits' | 'storage' | 'cache' | 'message_queue';
  config_data: any;
  is_active?: boolean;
}

export interface TenantConfigurationUpdate {
  config_data?: any;
  is_active?: boolean;
}

// LLM Configuration Types
export interface OllamaConfig {
  host: string;
  model_path?: string;
}

export interface LLMConfig {
  provider: 'ollama' | 'openai' | 'anthropic' | 'custom';
  model_name: string;
  api_key?: string;
  base_url?: string;
  max_tokens?: number;
  temperature?: number;
  ollama_config?: OllamaConfig;
  // Support for dual configuration structure
  field_extraction?: LLMConfig;
  document_extraction?: LLMConfig;
}

export interface TenantLLMConfigs {
  field_extraction: LLMConfig;
  document_extraction: LLMConfig;
}

// Rate Limits Configuration
export interface RateLimitsConfig {
  api_requests_per_minute: number;
  api_requests_per_hour: number;
  document_uploads_per_hour: number;
  extractions_per_hour: number;
  max_concurrent_extractions: number;
  burst_limit?: number;
}

// Infrastructure Configuration Types
export interface StorageConfig {
  provider: 'minio' | 'aws_s3' | 'gcs';
  bucket_prefix: string;
  region: string;
  endpoint_url?: string;
  max_storage_gb: number;
  allowed_file_types: string[];
  access_key_id?: string;
  secret_access_key?: string;
}

export interface CacheConfig {
  provider: 'redis';
  host: string;
  port: number;
  database_number: string | number;
  max_memory_mb: number;
  ttl_seconds: number;
  password?: string;
}

export interface MessageQueueConfig {
  provider: 'redis';
  queue_prefix: string;
  broker_url: string;
  result_backend: string;
  max_workers: number;
  priority_queues: string[];
  password?: string;
}

// Infrastructure Status Types
export interface InfrastructureStatus {
  environment: string;
  storage: {
    configured: boolean;
    healthy: boolean;
  };
  cache: {
    configured: boolean;
    healthy: boolean;
  };
  queue: {
    configured: boolean;
    healthy: boolean;
  };
  llm: {
    configured: boolean;
    healthy: boolean;
  };
}

export interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  response_time_ms?: number;
  last_checked: string;
  details?: Record<string, any>;
}

export interface InfrastructureConfig {
  environment: string;
  tenant_slug: string;
  configurations: {
    storage?: StorageConfig;
    cache?: CacheConfig;
    message_queue?: MessageQueueConfig;
    llm?: TenantLLMConfigs | LLMConfig;
  };
}

// Tenant Environment Types
export interface TenantEnvironmentInfo {
  id: string;
  name: string;
  slug: string;
  status: string;
  environment: string;
  created_at: string;
  updated_at: string;
}

export interface AvailableEnvironments {
  environments: Array<{
    name: string;
    display_name: string;
    description: string;
    is_active: boolean;
    tenant_count: number;
  }>;
}

// Environment Secrets Types
export interface EnvironmentSecret {
  id: string;
  environment: string;
  secret_name: string;
  secret_value: string;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentSecretUpdate {
  secret_name: string;
  secret_value: string;
}

export interface EnvironmentConfig {
  environment: string;
  config: {
    llm_providers: Array<{
      name: string;
      models: string[];
      default_model?: string;
    }>;
    storage_providers: string[];
    cache_providers: string[];
    message_queue_providers: string[];
  };
}

// Tenant Rate Limits
export interface TenantRateLimit {
  id: string;
  tenant_id: string;
  limit_type: string;
  current_count: number;
  window_start: string;
  created_at: string;
  updated_at: string;
}

export interface TenantConfigSummary {
  tenant_id: string;
  llm_config?: LLMConfig;
  rate_limits?: RateLimitsConfig;
  rate_usage?: Record<string, number>;
}

// Tenant Info Types
export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  environment: string;
  status: string;
  user_count: number;
  document_count: number;
  extraction_count: number;
  template_count: number;
  created_at: string;
  updated_at: string;
}

// Status Types
export type TenantStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export type ConfigType = 'llm' | 'rate_limits' | 'storage' | 'cache' | 'message_queue';

export type Environment = 'development' | 'staging' | 'production';

// Available Models Response
export interface AvailableModelsResponse {
  provider: string;
  models: string[];
  default_model?: string;
}
