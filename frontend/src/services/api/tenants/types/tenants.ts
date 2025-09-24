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

// Alias for backward compatibility
export type ApiTenant = Tenant;

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

// Tenant Configuration - Read-only (credentials excluded for security)
export interface TenantConfigurationRead {
  id: string;
  tenant_id: string;
  config_type: 'llm' | 'rate_limits' | 'storage' | 'cache' | 'message_queue';
  config_data: LLMConfig | TenantLLMConfigs | RateLimitsConfig | StorageConfigRead | CacheConfigRead | MessageQueueConfigRead;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Tenant Configuration - Write-only (includes credentials for updates)
export interface TenantConfigurationWrite {
  id: string;
  tenant_id: string;
  config_type: 'llm' | 'rate_limits' | 'storage' | 'cache' | 'message_queue';
  config_data: LLMConfig | TenantLLMConfigs | RateLimitsConfig | StorageConfigWrite | CacheConfigWrite | MessageQueueConfigWrite;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Tenant Configuration - Union type for backward compatibility
export type TenantConfiguration = TenantConfigurationRead | TenantConfigurationWrite;

export interface TenantConfigurationCreate {
  tenant_id: string;
  config_type: 'llm' | 'rate_limits' | 'storage' | 'cache' | 'message_queue';
  config_data: LLMConfig | TenantLLMConfigs | RateLimitsConfig | StorageConfigWrite | CacheConfigWrite | MessageQueueConfigWrite;
  is_active?: boolean;
}

export interface TenantConfigurationUpdate {
  config_data?: LLMConfig | TenantLLMConfigs | RateLimitsConfig | StorageConfigWrite | CacheConfigWrite | MessageQueueConfigWrite;
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

// Storage Config - Read-only (credentials excluded for security)
export interface StorageConfigRead {
  provider: 'minio' | 'aws_s3' | 'gcs';
  bucket_prefix: string;
  region: string;
  endpoint_url?: string;
  max_storage_gb: number;
  allowed_file_types: string[];
}

// Storage Config - Write-only (includes credentials for updates)
export interface StorageConfigWrite {
  provider: 'minio' | 'aws_s3' | 'gcs';
  bucket_prefix: string;
  region: string;
  endpoint_url?: string;
  max_storage_gb: number;
  allowed_file_types: string[];
  access_key_id?: string;
  secret_access_key?: string;
}

// Storage Config - Union type for backward compatibility
export type StorageConfig = StorageConfigRead | StorageConfigWrite;

// Cache Config - Read-only (password excluded for security)
export interface CacheConfigRead {
  provider: 'redis';
  host: string;
  port: number;
  database_number: string | number;
  max_memory_mb: number;
  ttl_seconds: number;
  has_secret: boolean;
  password_updated_at?: string;
}

// Cache Config - Write-only (includes password for updates)
export interface CacheConfigWrite {
  provider: 'redis';
  host: string;
  port: number;
  database_number: string | number;
  max_memory_mb: number;
  ttl_seconds: number;
  password?: string;
}

// Cache Config - Union type for backward compatibility
export type CacheConfig = CacheConfigRead | CacheConfigWrite;

// Message Queue Config - Read-only (password excluded for security)
export interface MessageQueueConfigRead {
  provider: 'redis';
  queue_prefix: string;
  broker_url: string;
  result_backend: string;
  max_workers: number;
  priority_queues: string[];
  has_secret: boolean;
  password_updated_at?: string;
}

// Message Queue Config - Write-only (includes password for updates)
export interface MessageQueueConfigWrite {
  provider: 'redis';
  queue_prefix: string;
  broker_url: string;
  result_backend: string;
  max_workers: number;
  priority_queues: string[];
  password?: string;
}

// Message Queue Config - Union type for backward compatibility
export type MessageQueueConfig = MessageQueueConfigRead | MessageQueueConfigWrite;

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

export interface InfraServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  response_time_ms?: number;
  last_checked: string;
  details?: Record<string, any>;
}

export interface InfrastructureConfig {
  environment: string;
  tenant_slug: string;
  configurations: {
    storage?: StorageConfigRead;
    cache?: CacheConfigRead;
    message_queue?: MessageQueueConfigRead;
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

// Environment Secret - Read-only (secret value excluded for security)
export interface EnvironmentSecretRead {
  id: string;
  environment: string;
  secret_name: string;
  masked_value?: string;  // ✅ SECURE: Only masked value for reads
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
}

// Environment Secret - Write-only (includes secret value for updates)
export interface EnvironmentSecretWrite {
  id: string;
  environment: string;
  secret_name: string;
  secret_value: string;   // ✅ SECURE: Only for write operations
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
}

// Environment Secret - Union type for backward compatibility
export type EnvironmentSecret = EnvironmentSecretRead | EnvironmentSecretWrite;

// Environment Secret Update - Write-only (includes secret value)
export interface EnvironmentSecretUpdate {
  secret_name: string;
  secret_value: string;   // ✅ SECURE: Only for write operations
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
