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
          // Handle authentication errors gracefully
          if (error.response?.status === 401 || error.response?.status === 403) {
            // Clear tokens and dispatch logout event
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth_tokens');
              window.dispatchEvent(new CustomEvent('auth:logout'));
              console.warn('Authentication failed - tokens cleared and logout event dispatched');
            }
            
            // Don't throw exception for auth errors - return a resolved promise with error info
            return Promise.resolve({
              data: null,
              status: error.response?.status || 401,
              statusText: 'Authentication Required',
              headers: {},
              config: error.config,
              isAuthError: true
            });
          }
          
          // Handle 404 errors gracefully - let services handle them
          if (error.response?.status === 404) {
            // Don't throw exception for 404 errors - let services handle them gracefully
            return Promise.resolve({
              data: null,
              status: 404,
              statusText: 'Not Found',
              headers: {},
              config: error.config,
              isNotFoundError: true
            });
          }
          
          // For other errors, handle normally
          const handledError = this.handleError(error);
          return Promise.reject(handledError);
        } catch (e) {
          console.error('Critical error in response interceptor:', e);
          // Fallback: return a safe error
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
      
      // Check if this is an auth error response (from global interceptor)
      if ((response as any).isAuthError) {
        // Auth error was handled gracefully by global interceptor
        // The AuthContext will handle the logout event and redirect to login
        // Return null to indicate no data available due to auth error
        return null as T;
      }
      
      // Check if this is a 404 error response (from global interceptor)
      if ((response as any).isNotFoundError) {
        // 404 error was handled gracefully by global interceptor
        // Services can handle this by returning null or appropriate defaults
        return null as T;
      }
      
      return response.data;
    } catch (error) {
      // Error is already handled by the response interceptor
      // Just re-throw it as-is
      throw error;
    }
  }

  /**
   * Handle API errors consistently
   */
  protected handleError(error: any): Error {
    try {

      // Defensive programming: ensure error is an object
      if (!error || typeof error !== 'object') {
        try {
          return new Error('An unexpected error occurred');
        } catch (e) {
          return {
            message: 'An unexpected error occurred',
            name: 'Error',
            stack: undefined
          } as any;
        }
      }

    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      let message = data?.message || data?.detail || `Request failed with status ${status}`;

      // Handle specific authentication error messages
      if (message === 'Not authenticated' || message.includes('authentication')) {
        message = 'Authentication required. Please log in.';
      }

      
      // Ensure message is a valid string with ultra-robust validation
      let safeMessage = 'Request failed';
      try {
        if (message && typeof message === 'string') {
          const trimmed = message.trim();
          if (trimmed.length > 0 && trimmed.length < 10000) {
            safeMessage = trimmed;
          }
        }
      } catch (e) {
        console.warn('Failed to process error message:', e);
        safeMessage = 'Request failed';
      }
      
      let apiError: Error;
      try {
        // Ultra-defensive programming: ensure safeMessage is a valid string
        let finalMessage = 'Request failed';
        
        // Multiple layers of validation
        try {
          if (safeMessage && typeof safeMessage === 'string') {
            const trimmed = safeMessage.trim();
            if (trimmed.length > 0 && trimmed.length < 1000) {
              // Additional validation: check for problematic characters
              const cleanMessage = trimmed.replace(/[^\x20-\x7E]/g, ''); // Only printable ASCII
              if (cleanMessage.length > 0) {
                finalMessage = cleanMessage;
              }
            }
          }
        } catch (e) {
          console.warn('Failed to process safeMessage:', e, { safeMessage });
          finalMessage = 'Request failed';
        }
        
        // Final conversion with error handling
        const validatedMessage = String(finalMessage);
        
        try {
          apiError = new Error(validatedMessage);
        } catch (errorCreationError) {
          // Create a custom error object that behaves like an Error
          apiError = {
            message: validatedMessage,
            name: 'Error',
            stack: undefined,
            toString: () => `Error: ${validatedMessage}`,
            // Make it behave like an Error for instanceof checks
            constructor: Error
          } as any;
        }
        (apiError as any).status = status;
        (apiError as any).data = data;
        
        // Set appropriate error name based on status code
        if (status === 401) {
          (apiError as any).name = 'AuthenticationError';
        } else if (status === 403) {
          (apiError as any).name = 'AuthorizationError';
        } else if (status === 404) {
          (apiError as any).name = 'NotFoundError';
        } else if (status === 422) {
          (apiError as any).name = 'ValidationError';
        } else {
          (apiError as any).name = 'ApiError';
        }
      } catch (e) {
        console.error('Failed to create API error:', e);
        try {
          apiError = new Error('Request failed');
          (apiError as any).status = status || 500;
          (apiError as any).data = data;
          (apiError as any).name = 'ApiError';
        } catch (fallbackError) {
          console.error('Critical: Even fallback error creation failed:', fallbackError);
          apiError = {
            message: 'Request failed',
            name: 'ApiError',
            stack: undefined
          } as any;
          (apiError as any).status = status || 500;
          (apiError as any).data = data;
        }
      }

      return apiError;
    } else if (error.request) {
      // Network error
      let networkError: Error;
      try {
        networkError = new Error('Network error - please check your connection');
        (networkError as any).name = 'NetworkError';
      } catch (e) {
        console.error('Failed to create network error:', e);
        try {
          networkError = new Error('Network error - please check your connection');
          (networkError as any).name = 'NetworkError';
        } catch (fallbackError) {
          console.error('Critical: Even fallback network error creation failed:', fallbackError);
          networkError = {
            message: 'Network error - please check your connection',
            name: 'NetworkError',
            stack: undefined
          } as any;
        }
      }
      return networkError;
    } else {
      // Other error - handle edge cases
      let errorMessage = 'An unexpected error occurred';
      
      try {
        if (error?.message && typeof error.message === 'string') {
          errorMessage = error.message;
        } else if (error?.toString && typeof error.toString === 'function') {
          const stringified = error.toString();
          // Ensure stringified is actually a string, not a Symbol or other type
          if (stringified && typeof stringified === 'string' && stringified !== '[object Object]') {
            errorMessage = stringified;
          }
        }
      } catch (e) {
        console.warn('Failed to extract error message:', e);
        errorMessage = 'An unexpected error occurred';
      }
      
      
      // Ensure we always return a valid Error object
      try {
        // Final safety check: ensure errorMessage is a valid string
        let safeErrorMessage = 'An unexpected error occurred';
        
        if (typeof errorMessage === 'string') {
          // Additional safety: ensure the string is not empty and doesn't contain problematic characters
          const trimmed = errorMessage.trim();
          if (trimmed.length > 0 && trimmed.length < 10000) { // Reasonable length limit
            safeErrorMessage = trimmed;
          }
        }
        
        // Try to create the error with the safe message
        // Use String() constructor to ensure we have a valid string
        const finalMessage = String(safeErrorMessage);
        return new Error(finalMessage);
      } catch (e) {
        console.error('Failed to create Error object:', e, { errorMessage });
        // Last resort: create a completely safe error
        try {
          return new Error('An unexpected error occurred');
        } catch (fallbackError) {
          // If even this fails, return a plain object that can be used as an error
          console.error('Critical: Even fallback error creation failed:', fallbackError);
          return {
            message: 'An unexpected error occurred',
            name: 'Error',
            stack: undefined
          } as any;
        }
      }
    }
    } catch (e) {
      console.error('Critical error in handleError method:', e);
      // Return a safe error object
      try {
        return new Error('An unexpected error occurred');
      } catch (fallbackError) {
        // If even creating an Error fails, return a plain object that can be used as an error
        const plainError = {
          message: 'An unexpected error occurred',
          name: 'Error',
          stack: undefined
        };
        return plainError as any;
      }
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
