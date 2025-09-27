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
        // Ensure headers is mutable and support Axios v1 AxiosHeaders
        const headers = (config.headers ?? {}) as any;
        const set = typeof headers.set === 'function'
          ? (k: string, v: string) => headers.set(k, v)
          : (k: string, v: string) => { headers[k] = v; };

        if (this.authToken) {
          set('Authorization', `Bearer ${this.authToken}`);
        }
        if (this.tenantId) {
          set('X-Tenant-ID', this.tenantId);
        }

        config.headers = headers;
        
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
      (error) => {
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
        throw error;
      }
      
      const handled = this.handleError(error);
      (handled as any)._baseHandled = true;
      throw handled;
    }
  }

  /**
   * Handle API errors consistently - simplified version
   */
  protected handleError(error: any): Error {
    // Network error
    if (error.request && !error.response) {
      const networkError = new Error('Network error - please check your connection');
      (networkError as any).name = 'NetworkError';
      (networkError as any)._baseHandled = true;
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
      
      (apiError as any)._baseHandled = true;
      return apiError;
    }

    // Other error
    const unexpectedError = new Error(error.message || 'An unexpected error occurred');
    (unexpectedError as any)._baseHandled = true;
    return unexpectedError;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setAuthToken(token: string | null): void {
    this.authToken = token;
    const common = (this.client.defaults.headers as any).common
      || ((this.client.defaults.headers as any).common = {});
    if (token) {
      common['Authorization'] = `Bearer ${token}`;
    } else {
      delete common['Authorization'];
    }
  }

  setTenantId(tenantId: string | null): void {
    this.tenantId = tenantId;
    const common = (this.client.defaults.headers as any).common
      || ((this.client.defaults.headers as any).common = {});
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