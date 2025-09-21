/**
 * Common types used across all API services
 */

// Pagination
export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Sorting
export interface SortParams {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Filtering
export interface FilterParams {
  [key: string]: any;
}

// Error handling - Import error classes from ApiErrors.ts
export type {
  ApiError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError
} from '../errors/ApiErrors';

// Request configuration
export interface RequestConfig {
  timeout?: number;
  signal?: AbortSignal;
}

// Response metadata
export interface ResponseMetadata {
  timestamp?: number;
  responseTime?: number;
  requestId?: string;
}

// Base entity
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// Tenant-aware entity
export interface TenantEntity extends BaseEntity {
  tenant_id: string;
}

// Status types
export type Status = 'active' | 'inactive' | 'pending' | 'failed' | 'completed';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type DataValidationStatus = 'pending' | 'validated' | 'rejected' | 'corrected';

// Common request/response patterns
export interface CreateRequest {
  // Base create request - can be extended by domains
}

export interface UpdateRequest {
  // Base update request - can be extended by domains
}

export interface ListParams extends PaginationParams, SortParams, FilterParams {
  // Combined list parameters
}

export interface BulkOperationRequest {
  ids: string[];
  operation: 'delete' | 'activate' | 'deactivate' | 'update';
  data?: any;
}

export interface BulkOperationResponse {
  success_count: number;
  failure_count: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}
