/**
 * Base API Client for all domain services
 * Provides common functionality including authentication, error handling, and HTTP methods
 */
import { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

export abstract class BaseApiClient {
  protected client: AxiosInstance;
  protected authToken: string | null = null;
  protected tenantId: string | null = null; // Add tenant tracking

  constructor(client: AxiosInstance) {
    this.client = client;
    // Install interceptors only once per Axios instance
    const flag = '__baseInterceptorsInstalled';
    if (!(this.client as any)[flag]) {
      this.setupInterceptors();
      (this.client as any)[flag] = true;
    }
  }

  /**
   * Set up request and response interceptors
   */
  protected setupInterceptors(): void {
    // Request interceptor for auth token and tenant ID
    this.client.interceptors.request.use(
      (config) => {
        // Rely on axios merging defaults.headers.* set by setAuthToken/setTenantId
        // No per-request mutation needed here.
        
        (config as any).metadata = {
          ...(config as any).metadata,
          timestamp: Date.now(),
          requestId: this.generateRequestId()
        };
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        (response as any).metadata = {
          ...(response as any).metadata,
          responseTime: (() => {
            const start = (response.config as any).metadata?.timestamp;
            return typeof start === 'number' ? Date.now() - start : undefined;
          })(),
          requestId: (response.config as any).metadata?.requestId
        };
        return response;
      },
      async (error) => {
        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !error.config?._retry) {
          try {
            // Import service factory dynamically to avoid circular dependency
            const { serviceFactory } = await import('../index');
            const authService = serviceFactory.get<any>('auth');
            
            // Attempt silent token refresh
            const refreshResult = await authService.silentRefreshToken();
            
            if (refreshResult && refreshResult.access_token) {
              // Update token in all services
              serviceFactory.setAuthToken(refreshResult.access_token);
              
              // Update stored token
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('auth_access_token', refreshResult.access_token);
              }
              
              // Retry the original request with new token
              const retryConfig = {
                ...error.config,
                _retry: true,
                headers: {
                  ...error.config.headers,
                  'Authorization': `Bearer ${refreshResult.access_token}`
                }
              };
              
              return this.client.request(retryConfig);
            }
          } catch (refreshError) {
            console.warn('Token refresh failed:', refreshError);
            // If refresh fails, trigger logout
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth:logout'));
            }
          }
        }
        
        try {
          const handledError = this.handleError(error);
          return Promise.reject(handledError);
        } catch (e) {
          console.error('Critical error in response interceptor:', e);
          try {
            const fallbackError = new Error('Request failed');
            (fallbackError as any).status = 500;
            (fallbackError as any).name = 'ApiError';
            return Promise.reject(fallbackError);
          } catch (fallbackError) {
            console.error('Critical: Even fallback error creation failed in interceptor:', fallbackError);
            const plainError = {
              message: 'Request failed',
              name: 'ApiError',
              stack: undefined
            } as any;
            (plainError as any).status = 500;
            return Promise.reject(plainError);
          }
        }
      }
    );
  }

  /**
   * Make HTTP request with error handling
   */
  public async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.request(config);
      return response.data;
    } catch (error) {
      // Avoid double-processing handled Axios errors
      // The response interceptor already calls handleError and rejects with the transformed error
      if (error && (error as any)._baseHandled) {
        return Promise.reject(error);
      }

      const handled = this.handleError(error);
      (handled as any)._baseHandled = true;
      return Promise.reject(handled);
    }
  }

  /**
   * Handle API errors consistently - simplified version
   */
  protected handleError(error: any): Error {
    // Cancellation/abort
    if (
      error?.code === 'ERR_CANCELED' ||
      error?.name === 'CanceledError' ||
      error?.name === 'AbortError'
    ) {
      const canceled = new Error('Request cancelled');
      (canceled as any).name = 'CancelledError';
      (canceled as any)._baseHandled = true;
      (canceled as any).isAxiosError = !!error.isAxiosError;
      (canceled as any).code = error.code;
      (canceled as any).config = error.config;
      (canceled as any).request = error.request;
      (canceled as any).cause = error;
      return canceled;
    }

    // Network error
    if (error.request && !error.response) {
      const networkError = new Error('Network error - please check your connection');
      (networkError as any).name = 'NetworkError';
      (networkError as any)._baseHandled = true;
      (networkError as any).isAxiosError = !!error.isAxiosError;
      (networkError as any).code = error.code;
      (networkError as any).config = error.config;
      (networkError as any).request = error.request;
      (networkError as any).cause = error;
      return networkError;
    }

    // API error
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || data?.detail || `Request failed with status ${status}`;
      const apiError = new Error(message);
      
      (apiError as any).status = status;
      (apiError as any).data = data;
      (apiError as any).isAxiosError = !!error.isAxiosError;
      (apiError as any).code = error.code;
      (apiError as any).config = error.config;
      (apiError as any).request = error.request;
      (apiError as any).response = error.response;
      (apiError as any).cause = error;

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
      
      (apiError as any)._baseHandled = true;
      return apiError;
    }

    // Other error
    const unexpectedError = new Error(error.message || 'An unexpected error occurred');
    (unexpectedError as any)._baseHandled = true;
    (unexpectedError as any).isAxiosError = !!error.isAxiosError;
    (unexpectedError as any).code = error.code;
    (unexpectedError as any).config = error.config;
    (unexpectedError as any).request = error.request;
    (unexpectedError as any).cause = error;
    return unexpectedError;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setAuthToken(token: string | null): void {
    this.authToken = token;
    const defaults = this.client.defaults as any;
    // Ensure defaults.headers exists before accessing .common
    defaults.headers = defaults.headers || {};
    const common = defaults.headers.common || (defaults.headers.common = {});
    if (token) {
      common['Authorization'] = `Bearer ${token}`;
    } else {
      delete common['Authorization'];
    }
  }

  setTenantId(tenantId: string | null): void {
    this.tenantId = tenantId;
    const defaults = this.client.defaults as any;
    // Ensure defaults.headers exists before accessing .common
    defaults.headers = defaults.headers || {};
    const common = defaults.headers.common || (defaults.headers.common = {});
    if (tenantId) {
      common['X-Tenant-ID'] = tenantId;
    } else {
      delete common['X-Tenant-ID'];
    }
  }

  // Common HTTP methods
  protected async get<T>(url: string, params?: any): Promise<T> {
    return this.request<T>({ method: 'GET', url, params });
  }

  protected async post<T>(url: string, data?: any): Promise<T> {
    return this.request<T>({ method: 'POST', url, data });
  }

  protected async put<T>(url: string, data?: any): Promise<T> {
    return this.request<T>({ method: 'PUT', url, data });
  }

  protected async patch<T>(url: string, data?: any): Promise<T> {
    return this.request<T>({ method: 'PATCH', url, data });
  }

  protected async delete<T>(url: string): Promise<T> {
    return this.request<T>({ method: 'DELETE', url });
  }
}