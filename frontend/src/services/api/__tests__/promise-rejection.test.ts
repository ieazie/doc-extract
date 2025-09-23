/**
 * Promise Rejection Tests
 * Verifies that the response interceptor properly rejects promises instead of returning Error objects
 */

// @ts-ignore - Jest globals
declare const describe: any, it: any, expect: any, beforeEach: any, jest: any, fail: any;

import { AxiosInstance } from 'axios';
import { BaseApiClient } from '../base/BaseApiClient';

// Create a test service that extends BaseApiClient
class TestService extends BaseApiClient {
  constructor(client: AxiosInstance) {
    super(client);
  }
}

describe('Promise Rejection Tests', () => {
  let mockAxiosInstance: AxiosInstance;

  beforeEach(() => {
    // Create a fresh mock axios instance for each test
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
          eject: jest.fn(),
        },
        response: {
          use: jest.fn(),
          eject: jest.fn(),
        },
      },
      defaults: {},
    } as any;

    // Clear any existing flag
    delete (mockAxiosInstance as any).__baseInterceptorsInstalled;
    
    // Create service to set up interceptors
    new TestService(mockAxiosInstance);
  });

  it('should reject promises when response interceptor encounters errors', async () => {
    // Verify that the response interceptor was set up
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
    
    // Get the error handler function that was passed to the interceptor
    const interceptorCall = (mockAxiosInstance.interceptors.response.use as any).mock.calls[0];
    const errorHandler = interceptorCall[1]; // Second parameter is the error handler
    
    // Create a mock error
    const mockError = {
      response: {
        status: 404,
        data: { message: 'Not found' }
      }
    };

    // Call the error handler and verify it returns a rejected promise
    const result = errorHandler(mockError);
    
    // The result should be a Promise that rejects
    expect(result).toBeInstanceOf(Promise);
    
    // Verify the promise rejects with the handled error
    try {
      await result;
      fail('Expected promise to reject');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Not found');
      expect(error.name).toBe('NotFoundError');
      expect(error.status).toBe(404);
    }
  });

  it('should handle network errors correctly', async () => {
    const interceptorCall = (mockAxiosInstance.interceptors.response.use as any).mock.calls[0];
    const errorHandler = interceptorCall[1];
    
    // Create a network error
    const networkError = {
      request: {},
      message: 'Network Error'
    };

    const result = errorHandler(networkError);
    
    expect(result).toBeInstanceOf(Promise);
    
    try {
      await result;
      fail('Expected promise to reject');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Network error - please check your connection');
      expect(error.name).toBe('NetworkError');
    }
  });

  it('should handle other errors correctly', async () => {
    const interceptorCall = (mockAxiosInstance.interceptors.response.use as any).mock.calls[0];
    const errorHandler = interceptorCall[1];
    
    // Create a generic error
    const genericError = {
      message: 'Something went wrong'
    };

    const result = errorHandler(genericError);
    
    expect(result).toBeInstanceOf(Promise);
    
    try {
      await result;
      fail('Expected promise to reject');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Something went wrong');
    }
  });

  it('should have proper response metadata handling', () => {
    const interceptorCall = (mockAxiosInstance.interceptors.response.use as any).mock.calls[0];
    const successHandler = interceptorCall[0]; // First parameter is the success handler
    
    // Create a mock response
    const mockResponse = {
      data: { test: 'data' },
      status: 200,
      config: {
        metadata: {
          timestamp: Date.now() - 100, // 100ms ago
          requestId: 'test-request-123'
        }
      }
    };

    const result = successHandler(mockResponse);
    
    expect(result).toBe(mockResponse);
    expect(result.metadata).toBeDefined();
    expect(result.metadata.responseTime).toBeDefined();
    expect(typeof result.metadata.responseTime).toBe('number');
    expect(result.metadata.requestId).toBe('test-request-123');
  });

  it('should handle response metadata safely when timestamp is missing', () => {
    const interceptorCall = (mockAxiosInstance.interceptors.response.use as any).mock.calls[0];
    const successHandler = interceptorCall[0];
    
    // Create a mock response without timestamp
    const mockResponse = {
      data: { test: 'data' },
      status: 200,
      config: {
        metadata: {
          requestId: 'test-request-123'
        }
      }
    };

    const result = successHandler(mockResponse);
    
    expect(result).toBe(mockResponse);
    expect(result.metadata).toBeDefined();
    expect(result.metadata.responseTime).toBeUndefined();
    expect(result.metadata.requestId).toBe('test-request-123');
  });
});
