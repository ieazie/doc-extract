/**
 * Error Handling Tests
 * Verifies that the BaseApiClient properly handles different types of errors
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

describe('Error Handling Tests', () => {
  let mockAxiosInstance: AxiosInstance;
  let testService: TestService;

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
    
    testService = new TestService(mockAxiosInstance);
  });

  it('should properly handle 401 authentication errors', async () => {
    // Mock a 401 response - with current global interceptor, 401s are resolved with null data
    const mockResponse = {
      data: null,
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: {},
      request: {}
    };

    // Mock the request to return the resolved response (global interceptor behavior)
    (mockAxiosInstance.request as any).mockResolvedValueOnce(mockResponse);

    // Call a service method - should return null data instead of throwing
    const result = await testService.request({ method: 'GET', url: '/test' });
    expect(result).toBeNull();
  });

  it('should properly handle 403 authorization errors', async () => {
    const error403 = {
      response: {
        status: 403,
        data: { message: 'Forbidden' }
      }
    };

    (mockAxiosInstance.request as any).mockRejectedValueOnce(error403);

    try {
      await testService.request({ method: 'GET', url: '/test' });
      fail('Expected promise to reject');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Forbidden');
      expect(error.name).toBe('AuthorizationError');
      expect(error.status).toBe(403);
    }
  });

  it('should properly handle 404 not found errors', async () => {
    const error404 = {
      response: {
        status: 404,
        data: { message: 'Not Found' }
      }
    };

    (mockAxiosInstance.request as any).mockRejectedValueOnce(error404);

    try {
      await testService.request({ method: 'GET', url: '/test' });
      fail('Expected promise to reject');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Not Found');
      expect(error.name).toBe('NotFoundError');
      expect(error.status).toBe(404);
    }
  });

  it('should properly handle 422 validation errors', async () => {
    const error422 = {
      response: {
        status: 422,
        data: { message: 'Validation failed' }
      }
    };

    (mockAxiosInstance.request as any).mockRejectedValueOnce(error422);

    try {
      await testService.request({ method: 'GET', url: '/test' });
      fail('Expected promise to reject');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Validation failed');
      expect(error.name).toBe('ValidationError');
      expect(error.status).toBe(422);
    }
  });

  it('should properly handle network errors', async () => {
    const networkError = {
      request: {},
      message: 'Network Error'
    };

    (mockAxiosInstance.request as any).mockRejectedValueOnce(networkError);

    try {
      await testService.request({ method: 'GET', url: '/test' });
      fail('Expected promise to reject');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Network error - please check your connection');
      expect(error.name).toBe('NetworkError');
    }
  });

  it('should properly handle generic errors', async () => {
    const genericError = {
      message: 'Something went wrong'
    };

    (mockAxiosInstance.request as any).mockRejectedValueOnce(genericError);

    try {
      await testService.request({ method: 'GET', url: '/test' });
      fail('Expected promise to reject');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Something went wrong');
    }
  });

  it('should properly handle errors without message', async () => {
    const errorWithoutMessage = {};

    (mockAxiosInstance.request as any).mockRejectedValueOnce(errorWithoutMessage);

    try {
      await testService.request({ method: 'GET', url: '/test' });
      fail('Expected promise to reject');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('An unexpected error occurred');
    }
  });
});
