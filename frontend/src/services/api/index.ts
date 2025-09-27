/**
 * API Services Registry and Exports
 * Provides backward compatibility and centralized service access
 */
import axios, { AxiosInstance } from 'axios';
import { ServiceFactory } from './base/ServiceFactory';

/**
 * Transform Axios errors into proper Error objects
 */
const transformAxiosError = (error: any): Error => {
  // Network error
  if (error.request && !error.response) {
    const networkError = new Error('Network error - please check your connection');
    (networkError as any).name = 'NetworkError';
    return networkError;
  }

  // API error
  if (error.response) {
    const { status, data } = error.response;
    const message = data?.message || data?.detail || `Request failed with status ${status}`;
    const apiError = new Error(message);
    
    (apiError as any).status = status;
    (apiError as any).data = data;

    // Set error type based on status
    switch (status) {
      case 401:
        (apiError as any).name = 'AuthenticationError';
        break;
      case 403:
        (apiError as any).name = 'AuthorizationError';
        break;
      case 404:
        (apiError as any).name = 'NotFoundError';
        break;
      case 422:
        (apiError as any).name = 'ValidationError';
        break;
      default:
        (apiError as any).name = 'ApiError';
    }
    
    return apiError;
  }

  // Other error
  return new Error(error.message || 'An unexpected error occurred');
};

// Create axios instance
const createAxiosInstance = (): AxiosInstance => {
  // Determine the correct API URL based on environment
  const apiBaseUrl =
    (typeof window === 'undefined'
      ? process.env.API_BASE_URL
      : process.env.NEXT_PUBLIC_API_URL)
    || 'http://localhost:8000';
  
  const instance = axios.create({
    baseURL: apiBaseUrl,
    timeout: 30000, // 30 seconds for file uploads
    headers: { Accept: 'application/json' },
    withCredentials: true, // Enable cookie handling for refresh tokens
  });

  // Note: Authentication tokens are now handled by BaseApiClient.setAuthToken()
  // which sets them in the shared Axios defaults. The request interceptor
  // in BaseApiClient will automatically add the Authorization header.

  // Add response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // Handle 401 (Unauthorized) by dispatching logout event
      const status = error.response?.status;
      if (status === 401 && typeof window !== 'undefined') {
        // Dispatch auth logout event for graceful handling
        // The AuthContext will handle clearing all storage (sessionStorage, localStorage, cookies)
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'unauthorized' } }));
        
        console.warn('Authentication failed - logout event dispatched');
        
        // For authentication errors, return a resolved promise with null/empty data
        // This prevents UI crashes and allows components to continue normally
        // The auth context will handle the logout automatically
        return Promise.resolve({
          data: null,
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config: error.config,
          request: error.request
        });
      }
      
      // For other errors, return a resolved promise with error data
      // This prevents UI crashes and allows components to handle errors gracefully
      const transformedError = transformAxiosError(error);
      return Promise.resolve({
        data: null,
        status: error.response?.status || 500,
        statusText: transformedError.message || 'Error occurred',
        headers: {},
        config: error.config,
        request: error.request,
        error: transformedError // Include the transformed error for component handling
      });
    }
  );

  return instance;
};

// Create service factory
const axiosInstance = createAxiosInstance();
const serviceFactory = new ServiceFactory(axiosInstance);

// Register domain services as they are created
import { AuthService } from './auth/AuthService';
import { DocumentService } from './documents/DocumentService';
import { TemplateService } from './templates/TemplateService';
import { ExtractionService } from './extractions/ExtractionService';
import { TenantService } from './tenants/TenantService';
import { LanguageService } from './language/LanguageService';
import { CategoryService } from './categories/CategoryService';
import { JobService } from './jobs/JobService';
import { HealthService } from './health/HealthService';
serviceFactory.register('auth', new AuthService(axiosInstance));
serviceFactory.register('documents', new DocumentService(axiosInstance));
serviceFactory.register('templates', new TemplateService(axiosInstance));
serviceFactory.register('extractions', new ExtractionService(axiosInstance));
serviceFactory.register('tenants', new TenantService(axiosInstance));
serviceFactory.register('language', new LanguageService(axiosInstance));
serviceFactory.register('categories', new CategoryService(axiosInstance));
serviceFactory.register('jobs', new JobService(axiosInstance));
serviceFactory.register('health', new HealthService(axiosInstance));

// Note: Additional services will be registered here as they are created
// Example:
// import { CategoryService } from './categories/CategoryService';
// serviceFactory.register('categories', new CategoryService(axiosInstance));

// Export the factory for advanced usage
export { serviceFactory, axiosInstance };

// Export base class and type aliases (avoid name clashes with error classes)
export { BaseApiClient } from './base/BaseApiClient';
export type {
  ApiError as ApiErrorType,
  NetworkError as NetworkErrorType,
  ValidationError as ValidationErrorType,
  AuthenticationError as AuthenticationErrorType,
  AuthorizationError as AuthorizationErrorType,
  NotFoundError as NotFoundErrorType,
  ConflictError as ConflictErrorType,
  RateLimitError as RateLimitErrorType,
  ServerError as ServerErrorType,
} from './base/types/common';
export type {
  PaginationParams,
  PaginatedResponse,
  SortParams,
  FilterParams,
  RequestConfig,
  ResponseMetadata,
  BaseEntity,
  TenantEntity,
  Status,
  ProcessingStatus,
  DataValidationStatus,
  CreateRequest,
  UpdateRequest,
  ListParams,
  BulkOperationRequest,
  BulkOperationResponse
} from './base/types/common';

// Export error classes (avoid conflicts with common types)
export {
  ApiError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  ErrorFactory
} from './base/errors/ApiErrors';

// Export test utilities
export * from './__mocks__/testUtils';

// Export domain services as they are created
export { AuthService } from './auth/AuthService';
export { DocumentService } from './documents/DocumentService';
export { TemplateService } from './templates/TemplateService';
export { ExtractionService } from './extractions/ExtractionService';
export { TenantService } from './tenants/TenantService';
export { LanguageService } from './language/LanguageService';
export { CategoryService } from './categories/CategoryService';
export { JobService } from './jobs/JobService';
export { HealthService } from './health/HealthService';

// Export types with explicit naming to avoid conflicts
export type {
  LoginCredentials,
  LoginResponse,
  User,
  UserCreateRequest,
  UserUpdateRequest,
  UserPermissions,
  TenantSwitchRequest
} from './auth/types/auth';

export type {
  Document,
  DocumentListResponse,
  DocumentUploadParams,
  DocumentUploadResponse,
  DocumentUpdateParams,
  DocumentContent,
  DocumentPreview,
  DocumentExtractionTracking,
  DocumentWithTracking,
  DocumentStatus,
  ExtractionStatus,
  ProcessingStats
} from './documents/types/documents';

export type {
  TemplateBase,
  TemplateFull,
  TemplateListResponse,
  TemplateCreateRequest,
  TemplateUpdateRequest,
  GenerateFieldsRequest,
  GenerateFieldsResponse,
  TemplateTestResult,
  TemplateValidationResult,
  TemplateStatus,
  SchemaField
} from './templates/types/templates';

export type {
  Extraction,
  ExtractionListResponse,
  ExtractionCreateRequest,
  ExtractionJob,
  ExtractionJobCreate,
  ExtractionJobUpdate,
  ExtractionJobListResponse,
  ExtractionReview,
  ExtractionConfidenceSummary,
  ExtractionStats,
  ReviewStatus,
  ReviewActionRequest
} from './extractions/types/extractions';

export type {
  ApiTenant,
  TenantCreateRequest,
  TenantUpdateRequest,
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
  EnvironmentSecretRead,
  EnvironmentSecretWrite,
  EnvironmentSecretUpdate,
  EnvironmentConfig,
  AvailableModelsResponse,
  StorageConfig,
  StorageConfigRead,
  StorageConfigWrite,
  CacheConfig,
  CacheConfigRead,
  CacheConfigWrite,
  MessageQueueConfig,
  MessageQueueConfigRead,
  MessageQueueConfigWrite,
  LLMConfig,
  RateLimitsConfig,
  TenantLLMConfigs
} from './tenants/types/tenants';

export type {
  SupportedLanguage,
  TenantLanguageConfig,
  TenantLanguageConfigUpdate,
  LanguageDetectionResult as LanguageDetectionResultType,
  LanguageValidationResponse,
  LanguageSupportInfo,
  LanguageUsageStats,
  LanguageDetectionStats,
  LanguageProcessingConfig,
  LanguageListResponse,
  LanguageStatsResponse
} from './language/types/language';

export type {
  Category,
  CategoryCreateRequest,
  CategoryUpdateRequest,
  CategoryListResponse,
  CategoryDocumentsResponse,
  CategoryUsageStats,
  CategoryStats,
  CategoryValidationResult
} from './categories/types/categories';

export type {
  Job,
  JobCreateRequest,
  JobUpdateRequest,
  JobListResponse,
  JobExecution,
  JobsExecutionRequest,
  JobsExecutionResponse,
  JobHistoryResponse,
  JobStatistics,
  JobMonitor,
  JobQueueStatus,
  JobTemplate
} from './jobs/types/jobs';

export type {
  HealthStatus,
  DetailedHealthStatus,
  ServiceHealthStatus,
  LLMHealthCheck,
  RateLimitStatus,
  AvailableModelsResponse as HealthAvailableModelsResponse,
  HealthMonitoringConfig
} from './health/types/health';

// Note: Additional domain services will be exported here as they are created
// Example:
// export { CategoryService } from './categories/CategoryService';
// etc.

// Backward compatibility: Export a placeholder that will be replaced
// This maintains existing imports while we migrate domains
export const apiClient = {
  // This will be replaced with the actual ApiClient from services/api.ts
  // until all domains are migrated
  getAxiosInstance: () => axiosInstance,
  setAuthToken: (token: string | null) => serviceFactory.setAuthToken(token),
  // Other methods will be added as domains are migrated
};

// Service registry for easy access
export const services = {
  factory: serviceFactory,
  axios: axiosInstance,
  // Individual services
  auth: () => serviceFactory.get<AuthService>('auth'),
  documents: () => serviceFactory.get<DocumentService>('documents'),
  templates: () => serviceFactory.get<TemplateService>('templates'),
  extractions: () => serviceFactory.get<ExtractionService>('extractions'),
  tenants: () => serviceFactory.get<TenantService>('tenants'),
  language: () => serviceFactory.get<LanguageService>('language'),
  categories: () => serviceFactory.get<CategoryService>('categories'),
  jobs: () => serviceFactory.get<JobService>('jobs'),
  health: () => serviceFactory.get<HealthService>('health'),
  // Additional services will be added here as they are created
};

// Export utility functions
export { formatFileSize, formatDate } from './utils';
