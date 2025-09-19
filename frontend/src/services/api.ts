/**
 * API client for Document Extraction Platform
 * Handles all communication with the backend REST API
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// API Response Types
export interface Document {
  id: string;
  tenant_id: string;
  original_filename: string;
  file_size: number;
  mime_type?: string;
  document_type?: string;
  category?: {
    id: string;
    name: string;
    color: string;
  };
  tags: string[];
  status: string;
  extraction_status: string;
  extraction_error?: string;
  page_count?: number;
  character_count?: number;
  word_count?: number;
  has_thumbnail: boolean;
  is_test_document: boolean;
  // Language detection fields
  detected_language?: string;
  language_confidence?: number;
  language_source?: string;
  created_at: string;
  updated_at: string;
  extraction_completed_at?: string;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  color: string;
  document_count: number;
  created_at: string;
  updated_at: string;
}

// Job Management Types
export interface ExtractionJob {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  category_id: string;
  template_id: string;
  schedule_type: 'immediate' | 'scheduled' | 'recurring';
  schedule_config?: {
    cron?: string;
    timezone?: string;
  };
  run_at?: string;
  priority: number;
  max_concurrency: number;
  retry_policy: {
    max_retries: number;
    retry_delay_minutes: number;
  };
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  created_at: string;
  updated_at: string;
  category?: Category;
  template?: any;
}

export interface ExtractionJobCreate {
  name: string;
  description?: string;
  category_id: string;
  template_id: string;
  schedule_type: 'immediate' | 'scheduled' | 'recurring';
  schedule_config?: {
    cron?: string;
    timezone?: string;
  };
  run_at?: string;
  priority?: number;
  max_concurrency?: number;
  retry_policy?: {
    max_retries: number;
    retry_delay_minutes: number;
  };
  is_active?: boolean;
}

export interface ExtractionJobUpdate {
  name?: string;
  description?: string;
  schedule_type?: 'immediate' | 'scheduled' | 'recurring';
  schedule_config?: {
    cron?: string;
    timezone?: string;
  };
  run_at?: string;
  priority?: number;
  max_concurrency?: number;
  retry_policy?: {
    max_retries: number;
    retry_delay_minutes: number;
  };
  is_active?: boolean;
}

export interface ExtractionJobListResponse {
  jobs: ExtractionJob[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface JobExecutionRequest {
  triggered_by: 'manual' | 'immediate';
}

export interface JobExecutionResponse {
  job_id: string;
  execution_started: boolean;
  documents_queued: number;
  task_id?: string;
  message: string;
}

export interface DocumentExtractionTracking {
  id: string;
  document_id: string;
  job_id: string;
  extraction_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  triggered_by: 'schedule' | 'manual' | 'immediate';
  queued_at: string;
  started_at?: string;
  completed_at?: string;
  processing_time_ms?: number;
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
  document?: Document;
}

export interface DocumentWithTracking extends Document {
  job_tracking: DocumentExtractionTracking[];
  total_jobs_processed: number;
  successful_jobs: number;
  failed_jobs: number;
  pending_jobs: number;
}

export interface JobStatistics {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  avg_processing_time_ms: number;
  total_documents_processed: number;
  last_execution_at?: string;
  next_execution_at?: string;
}

export interface CategoryListResponse {
  categories: Category[];
  total: number;
}

export interface DocumentUploadResponse {
  document_id: string;
  status: string;
  message: string;
  extraction_status: string;
}

export interface ProcessingStats {
  total_documents: number;
  status_counts: Record<string, number>;
  processing_rate: Record<string, number>;
  completion_rate: number;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  service?: string;
  services?: {
    database: { status: string; message: string };
    ollama: { status: string; message: string; available_models?: string[] };
    s3: { status: string; message: string; available_buckets?: string[] };
  };
}

// AI Field Generation Types
export interface GeneratedField {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface GenerateFieldsRequest {
  prompt: string;
  document_type: string;
  document_content?: string;
}

export interface GenerateFieldsResponse {
  fields: GeneratedField[];
  success: boolean;
  message: string;
}

// Review Workflow Types
export type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'needs_correction';

export interface ReviewActionRequest {
  action: string;
  comments?: string;
  reviewer?: string;
}

export interface ReviewStatusResponse {
  extraction_id: string;
  review_status: ReviewStatus;
  assigned_reviewer?: string;
  review_comments?: string;
  review_completed_at?: string;
  updated_at: string;
}

export interface FieldCorrectionRequest {
  field_path: string;
  original_value: any;
  corrected_value: any;
  correction_reason?: string;
  corrected_by?: string;
}

export interface FieldCorrectionResponse {
  extraction_id: string;
  field_path: string;
  original_value: any;
  corrected_value: any;
  correction_reason?: string;
  corrected_by?: string;
  corrected_at: string;
  updated_at: string;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    status: string;
    tenant_id: string;
    last_login?: string;
    created_at: string;
    updated_at: string;
  };
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  tenant_id: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

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

// Tenant Configuration Types
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

export interface AvailableModelsResponse {
  provider: string;
  models: string[];
  default_model?: string;
}

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

export interface InfrastructureStatus {
  environment: string;
  storage: {
    configured: boolean;
    healthy: boolean;
    details?: string;
  };
  cache: {
    configured: boolean;
    healthy: boolean;
    details?: string;
  };
  queue: {
    configured: boolean;
    healthy: boolean;
    details?: string;
  };
  llm: {
    configured: boolean;
    healthy: boolean;
    details?: string;
  };
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

export interface EnvironmentSecrets {
  storage_access_key?: string;
  storage_secret_key?: string;
  cache_password?: string;
  redis_password?: string;
  llm_api_key?: string;
  llm_field_api_key?: string;
  llm_document_api_key?: string;
  webhook_secret?: string;
  database_password?: string;
}

// ============================================================================
// LANGUAGE MANAGEMENT TYPES
// ============================================================================

export interface SupportedLanguage {
  code: string;
  name: string;
  native_name: string;
}

export interface TenantLanguageConfig {
  id: string;
  tenant_id: string;
  supported_languages: string[];
  default_language: string;
  auto_detect_language: boolean;
  require_language_match: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantLanguageConfigUpdate {
  supported_languages: string[];
  default_language: string;
  auto_detect_language: boolean;
  require_language_match: boolean;
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  source: string;
}

export interface LanguageValidationResponse {
  tenant_id: string;
  language: string;
  is_supported: boolean;
}

export interface TenantEnvironmentInfo {
  id: string;
  name: string;
  slug: string;
  status: string;
  environment: string;
  created_at: string;
  updated_at: string;
}

export interface TenantConfiguration {
  id: string;
  tenant_id: string;
  config_type: 'llm' | 'rate_limits';
  config_data: LLMConfig | RateLimitsConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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

// API Client Class
class ApiClient {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    // Determine the correct API URL based on environment
    let apiBaseUrl;
    if (typeof window === 'undefined') {
      // Server-side (Next.js SSR) - use Docker service name
      apiBaseUrl = 'http://backend:8000';
    } else {
      // Client-side (browser) - use localhost
      apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    }
    
    this.client = axios.create({
      baseURL: apiBaseUrl,
      timeout: 30000, // 30 seconds for file uploads
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for authentication and debugging
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
          console.log(`🔑 API Request with token: ${config.method?.toUpperCase()} ${config.url}`);
        } else {
          console.log(`⚠️ API Request without token: ${config.method?.toUpperCase()} ${config.url}`);
        }
        
        console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ API Response Error:', error.response?.data || error.message);
        
        // Handle specific error cases
        if (error.response?.status === 413) {
          throw new Error('File too large. Please select a smaller file.');
        }
        
        if (error.response?.status === 400) {
          throw new Error(error.response.data?.detail || 'Invalid request');
        }
        
        if (error.response?.status === 401 || error.response?.status === 403) {
          // Clear auth data and redirect to login
          console.warn('Authentication failed, clearing auth data and redirecting to login');
          
          // Clear localStorage completely
          localStorage.removeItem('auth_tokens');
          localStorage.removeItem('auth_user');
          localStorage.removeItem('auth_tenant');
          
          // Clear API client token
          this.authToken = null;
          
          // Dispatch a custom event to notify AuthContext to clear its state
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:logout'));
          }
          
          // Don't redirect - let the _app.tsx handle showing the login form
          // when the user is not authenticated
          
          throw new Error('Authentication required');
        }
        
        if (error.response?.status === 500) {
          throw new Error('Server error. Please try again later.');
        }
        
        throw error;
      }
    );
  }

  // Authentication Methods
  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = null;
  }

  // Auth Endpoints
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await this.client.post('/api/auth/login', credentials);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get('/api/auth/me');
    return response.data;
  }

  async getCurrentTenant(): Promise<Tenant> {
    const response = await this.client.get('/api/auth/tenant');
    return response.data;
  }

  async switchTenant(tenantId: string): Promise<void> {
    await this.client.post('/api/auth/switch-tenant', { tenant_id: tenantId });
  }

  async getUserPermissions(): Promise<{ permissions: string[]; role: string; tenant_id: string }> {
    const response = await this.client.get('/api/auth/permissions');
    return response.data;
  }

  // User Management Endpoints
  async getUsers(): Promise<User[]> {
    const response = await this.client.get('/api/auth/users');
    return response.data;
  }

  async updateUser(userId: string, userData: {
    first_name?: string;
    last_name?: string;
    role?: string;
    status?: string;
  }): Promise<User> {
    const response = await this.client.put(`/api/auth/users/${userId}`, userData);
    return response.data;
  }

  async createUser(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role?: string;
  }): Promise<User> {
    const response = await this.client.post('/api/auth/register', userData);
    return response.data;
  }

  // Tenant Management Endpoints
  async getTenants(): Promise<Tenant[]> {
    const response = await this.client.get('/api/auth/tenants/all');
    return response.data;
  }

  async getTenant(tenantId: string): Promise<Tenant> {
    const response = await this.client.get(`/api/auth/tenants/${tenantId}`);
    return response.data;
  }

  async createTenant(tenantData: {
    name: string;
    settings?: Record<string, any>;
    environment?: string;
  }): Promise<Tenant> {
    const response = await this.client.post('/api/auth/tenants', tenantData);
    return response.data;
  }

  async updateTenant(tenantId: string, tenantData: {
    name?: string;
    settings?: Record<string, any>;
    status?: string;
    environment?: string;
  }): Promise<Tenant> {
    const response = await this.client.put(`/api/auth/tenants/${tenantId}`, tenantData);
    return response.data;
  }

  async deleteTenant(tenantId: string): Promise<void> {
    await this.client.delete(`/api/auth/tenants/${tenantId}`);
  }

  async getUserTenants(): Promise<Tenant[]> {
    const response = await this.client.get('/api/auth/tenants');
    return response.data;
  }

  // Tenant Configuration Endpoints
  async getTenantConfigurations(): Promise<TenantConfiguration[]> {
    const response = await this.client.get('/api/tenant/configurations');
    return response.data;
  }

  async getTenantConfigSummary(): Promise<TenantConfigSummary> {
    const response = await this.client.get('/api/tenant/configurations/summary');
    return response.data;
  }

  async getTenantConfiguration(configType: 'llm' | 'rate_limits'): Promise<TenantConfiguration> {
    const response = await this.client.get(`/api/tenant/configurations/${configType}`);
    return response.data;
  }

  async createTenantConfiguration(config: {
    config_type: 'llm' | 'rate_limits';
    config_data: LLMConfig | TenantLLMConfigs | RateLimitsConfig;
    is_active?: boolean;
  }): Promise<TenantConfiguration> {
    const response = await this.client.post('/api/tenant/configurations', config);
    return response.data;
  }

  async updateTenantConfiguration(
    configType: 'llm' | 'rate_limits',
    updates: {
      config_data?: LLMConfig | RateLimitsConfig;
      is_active?: boolean;
    }
  ): Promise<TenantConfiguration> {
    const response = await this.client.put(`/api/tenant/configurations/${configType}`, updates);
    return response.data;
  }

  async deleteTenantConfiguration(configType: 'llm' | 'rate_limits'): Promise<void> {
    await this.client.delete(`/api/tenant/configurations/${configType}`);
  }

  async getRateLimitStatus(): Promise<Record<string, TenantRateLimit>> {
    const response = await this.client.get('/api/tenant/rate-limits');
    return response.data;
  }

  async resetRateLimits(): Promise<{ message: string }> {
    const response = await this.client.post('/api/tenant/rate-limits/reset');
    return response.data;
  }

  async checkLLMHealth(configType: string = 'field_extraction'): Promise<{
    provider: string;
    model: string;
    healthy: boolean;
    checked_at: string;
    error?: string;
  }> {
    const response = await this.client.post('/api/tenant/llm/health-check', {}, {
      params: { config_type: configType }
    });
    return response.data;
  }

  async testLLMExtraction(testData: {
    config_type?: string;
    document_text: string;
    schema: Record<string, any>;
    prompt_config: Record<string, any>;
  }): Promise<any> {
    // Use a longer timeout for LLM operations (5 minutes)
    const response = await this.client.post('/api/tenant/llm/test-extraction', testData, {
      timeout: 300000 // 5 minutes for LLM operations
    });
    return response.data;
  }

  async getAvailableModels(provider: string): Promise<AvailableModelsResponse> {
    const response = await this.client.get(`/api/tenant/available-models/${provider}`);
    return response.data;
  }

  // Health Endpoints
  async getHealth(): Promise<HealthStatus> {
    const response = await this.client.get('/health/');
    return response.data;
  }

  async getDetailedHealth(): Promise<HealthStatus> {
    const response = await this.client.get('/health/detailed');
    return response.data;
  }

  // Document Endpoints (duplicate removed - using the more comprehensive version below)

  async uploadDocument(
    file: File,
    options: {
      document_type_id?: string;
      category_id?: string;
      tags?: string[];
      onUploadProgress?: (progress: number) => void;
    } = {}
  ): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.document_type_id) {
      formData.append('document_type_id', options.document_type_id);
    }
    
    if (options.category_id) {
      formData.append('category_id', options.category_id);
    }
    
    if (options.tags && options.tags.length > 0) {
      formData.append('tags', options.tags.join(','));
    }

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };

    if (options.onUploadProgress) {
      config.onUploadProgress = (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onUploadProgress!(progress);
        }
      };
    }

    const response = await this.client.post('/api/documents/upload', formData, config);
    return response.data;
  }

  async updateDocumentCategory(documentId: string, categoryId?: string): Promise<void> {
    const formData = new FormData();
    if (categoryId) {
      formData.append('category_id', categoryId);
    }
    
    await this.client.put(`/api/documents/${documentId}/category`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async updateDocumentTags(documentId: string, tags: string[]): Promise<void> {
    const formData = new FormData();
    formData.append('tags', tags.join(','));
    
    await this.client.put(`/api/documents/${documentId}/tags`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async reprocessDocument(documentId: string): Promise<void> {
    await this.client.post(`/api/documents/${documentId}/reprocess`);
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.client.delete(`/api/documents/${documentId}`);
  }

  async uploadTestDocument(
    file: File, 
    options?: { onUploadProgress?: (progress: number) => void }
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_test_document', 'true'); // Mark as test document
    
    const config: AxiosRequestConfig = {
      headers: { 'Content-Type': 'multipart/form-data' },
    };

    if (options?.onUploadProgress) {
      config.onUploadProgress = (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onUploadProgress!(progress);
        }
      };
    }

    // Upload the document
    const uploadResponse = await this.client.post('/api/documents/upload', formData, config);
    const uploadData: DocumentUploadResponse = uploadResponse.data;
    
    // Fetch the actual document data
    const document = await this.getDocument(uploadData.document_id);
    return document;
  }

  async getDocumentDownloadUrl(documentId: string): Promise<string> {
    // This endpoint redirects, so we get the redirect URL
    const response = await this.client.get(`/api/documents/${documentId}/download`, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302
    });
    return response.headers.location;
  }

  async getDocumentThumbnailUrl(documentId: string): Promise<string> {
    // This endpoint redirects, so we get the redirect URL
    const response = await this.client.get(`/api/documents/${documentId}/thumbnail`, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302
    });
    return response.headers.location;
  }



  async getProcessingStats(): Promise<ProcessingStats> {
    const response = await this.client.get('/api/documents/stats/processing');
    return response.data;
  }

  // Category Endpoints
  async getCategories(): Promise<CategoryListResponse> {
    const response = await this.client.get('/api/categories/');
    return response.data;
  }

  async getCategory(categoryId: string): Promise<Category> {
    const response = await this.client.get(`/api/categories/${categoryId}`);
    return response.data;
  }

  async createCategory(categoryData: {
    name: string;
    description?: string;
    color?: string;
  }): Promise<Category> {
    const response = await this.client.post('/api/categories/', categoryData);
    return response.data;
  }

  async updateCategory(
    categoryId: string,
    categoryData: {
      name?: string;
      description?: string;
      color?: string;
    }
  ): Promise<Category> {
    const response = await this.client.put(`/api/categories/${categoryId}`, categoryData);
    return response.data;
  }

  async deleteCategory(categoryId: string, force = false): Promise<void> {
    await this.client.delete(`/api/categories/${categoryId}`, {
      params: { force }
    });
  }

  async getCategoryDocuments(
    categoryId: string,
    page = 1,
    per_page = 20
  ): Promise<{
    category: { id: string; name: string; color: string };
    documents: Array<{
      id: string;
      original_filename: string;
      file_size: number;
      status: string;
      extraction_status: string;
      created_at: string;
    }>;
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    const response = await this.client.get(`/api/categories/${categoryId}/documents`, {
      params: { page, per_page }
    });
    return response.data;
  }

  async getCategoryUsageStats(): Promise<{
    category_stats: Array<{
      name: string;
      color: string;
      document_count: number;
      total_size: number;
      percentage: number;
    }>;
    total_categories: number;
    total_documents: number;
    uncategorized_count: number;
  }> {
    const response = await this.client.get('/api/categories/stats/usage');
    return response.data;
  }

  // Template Endpoints
  async getTemplates(
    page: number = 1,
    perPage: number = 10,
    search?: string,
    documentTypeId?: string,
    isActive?: boolean,
    status?: string,
    sortBy?: string,
    sortOrder?: string
  ): Promise<{
    templates: Array<{
      id: string;
      name: string;
      document_type_name?: string;
      schema: Record<string, any>;
      is_active: boolean;
      status?: 'draft' | 'published' | 'archived';
      version: number;
      created_at: string;
      updated_at: string;
    }>;
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });
    
    if (search) params.append('search', search);
    if (documentTypeId) params.append('document_type_id', documentTypeId);
    if (isActive !== undefined) params.append('is_active', isActive.toString());
    if (status) params.append('status', status);
    if (sortBy) params.append('sort_by', sortBy);
    if (sortOrder) params.append('sort_order', sortOrder);
    
    const response = await this.client.get(`/api/templates/?${params.toString()}`);
    return response.data;
  }

  async getTemplate(templateId: string): Promise<{
    id: string;
    name: string;
    document_type_id?: string;
    document_type_name?: string;
    schema: Record<string, any>;
    prompt_config: Record<string, any>;
    extraction_settings: Record<string, any>;
    few_shot_examples: Array<Record<string, any>>;
    is_active: boolean;
    version: number;
    created_at: string;
    updated_at: string;
  }> {
    const response = await this.client.get(`/api/templates/${templateId}`);
    return response.data;
  }

  async createTemplate(templateData: {
    name: string;
    description?: string;
    document_type_id?: string;
    schema: Record<string, any>;
    prompt_config: {
      system_prompt: string;
      instructions: string;
      output_format: string;
    };
    extraction_settings?: {
      max_chunk_size: number;
      extraction_passes: number;
      confidence_threshold: number;
    };
    few_shot_examples?: Array<Record<string, any>>;
    status?: string;
  }): Promise<{
    id: string;
    name: string;
    description?: string;
    document_type_id?: string;
    document_type_name?: string;
    schema: Record<string, any>;
    prompt_config: Record<string, any>;
    extraction_settings: Record<string, any>;
    few_shot_examples: Array<Record<string, any>>;
    is_active: boolean;
    status: string;
    version: number;
    created_at: string;
    updated_at: string;
  }> {
    const response = await this.client.post('/api/templates/', templateData);
    return response.data;
  }

  async updateTemplate(
    templateId: string,
    templateData: Partial<{
      name: string;
      document_type_id?: string;
      schema: Record<string, any>;
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
      is_active: boolean;
    }>
  ): Promise<{
    id: string;
    name: string;
    document_type_id?: string;
    document_type_name?: string;
    schema: Record<string, any>;
    prompt_config: Record<string, any>;
    extraction_settings: Record<string, any>;
    few_shot_examples: Array<Record<string, any>>;
    is_active: boolean;
    version: number;
    created_at: string;
    updated_at: string;
  }> {
    const response = await this.client.put(`/api/templates/${templateId}`, templateData);
    return response.data;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.client.delete(`/api/templates/${templateId}`);
  }

  async testTemplate(templateId: string, testDocument: string): Promise<{
    status: string;
    message: string;
    extracted_data: Record<string, any>;
    confidence_score: number;
    processing_time_ms: number;
    template_id: string;
    note: string;
  }> {
    const response = await this.client.post(`/api/templates/${templateId}/test`, {
      test_document: testDocument
    });
    return response.data;
  }

  // AI Field Generation Endpoints
  async generateFieldsFromPrompt(request: GenerateFieldsRequest, templateLanguage: string = 'en', options?: { signal?: AbortSignal }): Promise<GenerateFieldsResponse> {
    const response = await this.client.post(`/api/templates/generate-fields-from-prompt?template_language=${templateLanguage}`, request, options);
    return response.data;
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
    const response = await this.client.post(`/api/templates/generate-fields-from-document?${params}`, request, options);
    return response.data;
  }

  // Extraction Endpoints
  async createExtraction(extractionData: {
    document_id: string;
    template_id: string;
  }): Promise<{
    id: string;
    document_id: string;
    template_id: string;
    status: string;
    results?: Record<string, any>;
    confidence_score?: number;
    processing_time_ms?: number;
    error_message?: string;
    document_name?: string;
    template_name?: string;
    created_at: string;
    updated_at: string;
  }> {
    const response = await this.client.post('/api/extractions/', extractionData);
    return response.data;
  }

  async getExtractions(params: {
    page?: number;
    per_page?: number;
    status?: string;
    review_status?: string;
    document_id?: string;
    template_id?: string;
    confidence_min?: number;
    confidence_max?: number;
    date_from?: string;
    date_to?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
  } = {}): Promise<{
    extractions: Array<{
      id: string;
      document_id: string;
      template_id: string;
      status: string;
      results?: Record<string, any>;
      confidence_score?: number;
      processing_time_ms?: number;
      error_message?: string;
      document_name?: string;
      template_name?: string;
      review_status?: ReviewStatus;
      assigned_reviewer?: string;
      review_comments?: string;
      review_completed_at?: string;
      created_at: string;
      updated_at: string;
    }>;
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    const response = await this.client.get('/api/extractions/', { params });
    return response.data;
  }

  async getExtraction(extractionId: string): Promise<{
    id: string;
    document_id: string;
    template_id: string;
    status: string;
    results?: Record<string, any>;
    confidence_score?: number;
    confidence_scores?: Record<string, number>;
    processing_time_ms?: number;
    error_message?: string;
    document_name?: string;
    template_name?: string;
    review_status?: ReviewStatus;
    assigned_reviewer?: string;
    review_comments?: string;
    review_completed_at?: string;
    created_at: string;
    updated_at: string;
  }> {
    const response = await this.client.get(`/api/extractions/${extractionId}`);
    return response.data;
  }

  async deleteExtraction(extractionId: string): Promise<void> {
    await this.client.delete(`/api/extractions/${extractionId}`);
  }

  async autoRouteExtraction(extractionId: string): Promise<{
    routed: boolean;
    reason: string;
    flagged_fields: string[];
    review_status?: string;
  }> {
    const response = await this.client.post(`/api/extractions/${extractionId}/auto-route`);
    return response.data;
  }

  async getExtractionConfidenceSummary(extractionId: string): Promise<{
    overall_confidence: number;
    flagged_fields_count: number;
    total_fields: number;
    confidence_threshold: number;
    flagged_fields: Array<{
      path: string;
      name: string;
      confidence: number;
      threshold: number;
    }>;
    confidence_breakdown: Record<string, number>;
  }> {
    const response = await this.client.get(`/api/extractions/${extractionId}/confidence-summary`);
    return response.data;
  }

  // Review Workflow Endpoints
  async startReview(extractionId: string, request: ReviewActionRequest): Promise<ReviewStatusResponse> {
    const response = await this.client.post(`/api/extractions/${extractionId}/review`, request);
    return response.data;
  }

  async getReviewQueue(params: {
    page?: number;
    per_page?: number;
    review_status?: ReviewStatus;
    assigned_reviewer?: string;
  } = {}): Promise<{
    extractions: Array<{
      id: string;
      document_id: string;
      template_id: string;
      status: string;
      results?: Record<string, any>;
      confidence_score?: number;
      processing_time_ms?: number;
      error_message?: string;
      document_name?: string;
      template_name?: string;
      review_status?: ReviewStatus;
      assigned_reviewer?: string;
      review_comments?: string;
      review_completed_at?: string;
      created_at: string;
      updated_at: string;
    }>;
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    const response = await this.client.get('/api/extractions/review-queue', { params });
    return response.data;
  }

  async getReviewStatus(extractionId: string): Promise<ReviewStatusResponse> {
    const response = await this.client.get(`/api/extractions/${extractionId}/review-status`);
    return response.data;
  }

  async correctField(extractionId: string, request: FieldCorrectionRequest): Promise<FieldCorrectionResponse> {
    const response = await this.client.post(`/api/extractions/${extractionId}/correct-field`, request);
    return response.data;
  }

  // Document Content Endpoints
  async getDocumentContent(documentId: string): Promise<{
    document_id: string;
    filename: string;
    content: string;
    metadata: {
      page_count?: number;
      character_count?: number;
      word_count?: number;
      extraction_completed_at?: string;
    };
  }> {
    const response = await this.client.get(`/api/documents/content/${documentId}`);
    return response.data;
  }

  async getDocumentPreview(documentId: string): Promise<{
    document_id: string;
    filename: string;
    mime_type?: string;
    preview_url?: string;
    has_preview: boolean;
  }> {
    const response = await this.client.get(`/api/documents/preview/${documentId}`);
    return response.data;
  }

  // Job Management Endpoints
  async getJobs(
    page: number = 1,
    perPage: number = 20,
    search?: string,
    categoryId?: string,
    templateId?: string,
    scheduleType?: 'immediate' | 'scheduled' | 'recurring',
    isActive?: boolean,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<ExtractionJobListResponse> {
    const params: any = { page, per_page: perPage };
    if (search) params.search = search;
    if (categoryId) params.category_id = categoryId;
    if (templateId) params.template_id = templateId;
    if (scheduleType) params.schedule_type = scheduleType;
    if (isActive !== undefined) params.is_active = isActive;
    if (sortBy) params.sort_by = sortBy;
    if (sortOrder) params.sort_order = sortOrder;

    const response = await this.client.get('/api/jobs', { params });
    return response.data;
  }

  async getJob(jobId: string): Promise<ExtractionJob> {
    const response = await this.client.get(`/api/jobs/${jobId}`);
    return response.data;
  }

  async createJob(jobData: ExtractionJobCreate): Promise<ExtractionJob> {
    const response = await this.client.post('/api/jobs', jobData);
    return response.data;
  }

  async updateJob(jobId: string, jobData: ExtractionJobUpdate): Promise<ExtractionJob> {
    const response = await this.client.put(`/api/jobs/${jobId}`, jobData);
    return response.data;
  }

  async deleteJob(jobId: string): Promise<void> {
    await this.client.delete(`/api/jobs/${jobId}`);
  }

  async executeJob(jobId: string, triggeredBy: 'manual' | 'immediate' = 'manual'): Promise<JobExecutionResponse> {
    const response = await this.client.post(`/api/jobs/${jobId}/execute`, {
      triggered_by: triggeredBy
    });
    return response.data;
  }

  async getJobHistory(
    jobId: string,
    page: number = 1,
    perPage: number = 20,
    status?: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
  ): Promise<{
    tracking: DocumentExtractionTracking[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    const params: any = { page, per_page: perPage };
    if (status) params.status = status;

    const response = await this.client.get(`/api/jobs/${jobId}/history`, { params });
    return response.data;
  }

  async getJobStatistics(jobId: string): Promise<JobStatistics> {
    const response = await this.client.get(`/api/jobs/${jobId}/statistics`);
    return response.data;
  }

  // Utility Methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      // Document status
      'uploaded': '#3b82f6',
      'processing': '#f59e0b',
      'completed': '#10b981',
      'failed': '#ef4444',
      'deleted': '#6b7280',
      
      // Extraction status
      'pending': '#6b7280',
      'extracting': '#f59e0b',
      'extracted': '#10b981',
      'error': '#ef4444'
    };
    
    return statusColors[status] || '#6b7280';
  }

  getStatusIcon(status: string): string {
    const statusIcons: Record<string, string> = {
      // Document status
      'uploaded': '📄',
      'processing': '⏳',
      'completed': '✅',
      'failed': '❌',
      'deleted': '🗑️',
      
      // Extraction status
      'pending': '⏳',
      'extracting': '🔄',
      'extracted': '✅',
      'error': '❌'
    };
    
    return statusIcons[status] || '📄';
  }

  // Document Tracking Endpoints
  async getDocuments(
    page: number = 1,
    perPage: number = 20,
    search?: string,
    categoryId?: string,
    documentTypeId?: string,
    tags?: string,
    status?: string,
    extractionStatus?: string,
    jobStatus?: string,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    includeTracking: boolean = false
  ): Promise<DocumentListResponse> {
    const params: any = { page, per_page: perPage, sort_by: sortBy, sort_order: sortOrder };
    if (search) params.search = search;
    if (categoryId) params.category_id = categoryId;
    if (documentTypeId) params.document_type_id = documentTypeId;
    if (tags) params.tags = tags;
    if (status) params.status = status;
    if (extractionStatus) params.extraction_status = extractionStatus;
    if (jobStatus) params.job_status = jobStatus;
    if (includeTracking) params.include_tracking = includeTracking;

    const endpoint = includeTracking ? '/api/documents/with-tracking' : '/api/documents/';
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  async getDocument(documentId: string): Promise<Document> {
    const response = await this.client.get(`/api/documents/${documentId}`);
    return response.data;
  }

  async getDocumentWithTracking(documentId: string): Promise<DocumentWithTracking> {
    const response = await this.client.get(`/api/documents/${documentId}/with-tracking`);
    return response.data;
  }

  async getDocumentTracking(documentId: string): Promise<DocumentExtractionTracking[]> {
    const response = await this.client.get(`/api/documents/${documentId}/tracking`);
    return response.data;
  }

  // ============================================================================
  // INFRASTRUCTURE MANAGEMENT API METHODS
  // ============================================================================

  async getTenantInfo(): Promise<TenantEnvironmentInfo> {
    const response = await this.client.get('/api/tenant/info');
    return response.data;
  }

  async getTenantInfoBySlug(slug: string): Promise<TenantEnvironmentInfo> {
    const response = await this.client.get(`/api/tenant/${slug}/info`);
    return response.data;
  }

  async getInfrastructureStatus(tenantSlug: string, environment: string): Promise<InfrastructureStatus> {
    const response = await this.client.get(`/api/tenant/${tenantSlug}/infrastructure/status/${environment}`);
    return response.data;
  }

  async getInfrastructureConfig(tenantSlug: string, environment: string): Promise<InfrastructureConfig> {
    const response = await this.client.get(`/api/tenant/${tenantSlug}/infrastructure/config/${environment}`);
    return response.data;
  }

  async getAvailableEnvironments(): Promise<string[]> {
    const response = await this.client.get('/api/tenant/configurations/environments');
    return response.data;
  }

  async getEnvironmentSecrets(environment: string): Promise<EnvironmentSecrets> {
    const response = await this.client.get(`/api/tenant/secrets/${environment}`);
    return response.data;
  }

  async updateEnvironmentSecret(environment: string, secretType: string, value: string): Promise<void> {
    await this.client.put(`/api/tenant/secrets/${environment}/${secretType}`, { value });
  }

  async getEnvironmentConfig(configType: string, environment: string): Promise<any> {
    const response = await this.client.get(`/api/tenant/configurations/${configType}/${environment}`);
    return response.data;
  }

  async updateEnvironmentConfig(configType: string, environment: string, configData: any): Promise<void> {
    await this.client.put(`/api/tenant/configurations/${configType}/${environment}`, configData);
  }

  // ============================================================================
  // LANGUAGE MANAGEMENT API METHODS
  // ============================================================================

  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    const response = await this.client.get('/api/language/supported');
    return response.data;
  }

  async getTenantLanguageConfig(tenantId: string): Promise<TenantLanguageConfig> {
    const response = await this.client.get(`/api/language/tenant/${tenantId}/config`);
    return response.data;
  }

  async updateTenantLanguageConfig(tenantId: string, config: TenantLanguageConfigUpdate): Promise<TenantLanguageConfig> {
    const response = await this.client.put(`/api/language/tenant/${tenantId}/config`, config);
    return response.data;
  }

  async detectDocumentLanguage(text: string): Promise<LanguageDetectionResult> {
    const response = await this.client.post(`/api/language/detect?text=${encodeURIComponent(text)}`);
    return response.data;
  }

  async getTenantSupportedLanguages(tenantId: string): Promise<string[]> {
    const response = await this.client.get(`/api/language/tenant/${tenantId}/supported`);
    return response.data;
  }

  async getTenantDefaultLanguage(tenantId: string): Promise<string> {
    const response = await this.client.get(`/api/language/tenant/${tenantId}/default`);
    return response.data;
  }

  async validateLanguageSupport(tenantId: string, language: string): Promise<LanguageValidationResponse> {
    const response = await this.client.post(`/api/language/validate?tenant_id=${tenantId}&language=${encodeURIComponent(language)}`);
    return response.data;
  }

}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
