/**
 * Base API Client for all domain services
 * Provides common functionality including authentication, error handling, and HTTP methods
 */
import { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

export abstract class BaseApiClient {
  protected client: AxiosInstance;
  protected authToken: string | null = null;

  constructor(client: AxiosInstance) {
    this.client = client;
    this.setupInterceptors();
  }

  /**
   * Set up request and response interceptors
   */
  protected setupInterceptors(): void {
    // Request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        
        // Add request metadata (extend config with custom properties)
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
        // Add response metadata (extend response with custom properties)
        (response as any).metadata = {
          ...(response as any).metadata,
          responseTime: Date.now() - ((response.config as any).metadata?.timestamp || 0),
          requestId: (response.config as any).metadata?.requestId
        };

        return response;
      },
      (error) => this.handleError(error)
    );
  }

  /**
   * Make HTTP request with error handling
   */
  protected async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.request(config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors consistently
   */
  protected handleError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      const message = data?.message || data?.detail || `Request failed with status ${status}`;
      
      const apiError = new Error(message);
      (apiError as any).status = status;
      (apiError as any).data = data;
      (apiError as any).name = 'ApiError';
      
      return apiError;
    } else if (error.request) {
      // Network error
      const networkError = new Error('Network error - please check your connection');
      (networkError as any).name = 'NetworkError';
      return networkError;
    } else {
      // Other error
      return new Error(error.message || 'An unexpected error occurred');
    }
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set authentication token for all requests
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
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
