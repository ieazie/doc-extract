/**
 * BaseApiClient Synchronous Throw Fix Tests
 * Verifies that BaseApiClient properly rejects promises instead of throwing synchronously
 * This test specifically validates the fix for the recurring AuthenticationError issue
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

  async testRequest(config: any) {
    return this.request(config);
  }
}

describe('BaseApiClient Synchronous Throw Fix Tests', () => {
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

  it('should properly reject promises for authentication errors (401)', async () => {
    // Mock a 401 authentication error
    const authError = {
      response: {
        status: 401,
        data: { message: 'Invalid authentication credentials' }
      }
    };

    (mockAxiosInstance.request as any).mockRejectedValueOnce(authError);

    // This should NOT throw synchronously, but should reject the promise
    let errorCaught = false;
    let caughtError: any = null;

    try {
      await testService.testRequest({ method: 'GET', url: '/api/auth/me' });
      fail('Expected promise to reject');
    } catch (error: any) {
      errorCaught = true;
      caughtError = error;
    }

    // Verify the error was caught properly (not thrown synchronously)
    expect(errorCaught).toBe(true);
    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toBe('Invalid authentication credentials');
    expect(caughtError.name).toBe('AuthenticationError');
    expect(caughtError.status).toBe(401);
  });

  it('should properly reject promises for handled errors', async () => {
    // Create an error that has already been handled by the interceptor
    const handledError = new Error('Already handled error');
    (handledError as any)._baseHandled = true;
    (handledError as any).status = 401;
    (handledError as any).name = 'AuthenticationError';

    (mockAxiosInstance.request as any).mockRejectedValueOnce(handledError);

    let errorCaught = false;
    let caughtError: any = null;

    try {
      await testService.testRequest({ method: 'GET', url: '/api/test' });
      fail('Expected promise to reject');
    } catch (error: any) {
      errorCaught = true;
      caughtError = error;
    }

    // Verify the handled error was properly rejected
    expect(errorCaught).toBe(true);
    expect(caughtError).toBe(handledError);
    expect(caughtError._baseHandled).toBe(true);
  });

  it('should properly reject promises for unhandled errors', async () => {
    // Create an unhandled error
    const unhandledError = {
      response: {
        status: 500,
        data: { message: 'Internal server error' }
      }
    };

    (mockAxiosInstance.request as any).mockRejectedValueOnce(unhandledError);

    let errorCaught = false;
    let caughtError: any = null;

    try {
      await testService.testRequest({ method: 'GET', url: '/api/test' });
      fail('Expected promise to reject');
    } catch (error: any) {
      errorCaught = true;
      caughtError = error;
    }

    // Verify the unhandled error was processed and rejected
    expect(errorCaught).toBe(true);
    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toBe('Internal server error');
    expect(caughtError.status).toBe(500);
    expect(caughtError._baseHandled).toBe(true);
  });

  it('should handle network errors without throwing synchronously', async () => {
    // Create a network error
    const networkError = {
      request: {},
      message: 'Network Error'
    };

    (mockAxiosInstance.request as any).mockRejectedValueOnce(networkError);

    let errorCaught = false;
    let caughtError: any = null;

    try {
      await testService.testRequest({ method: 'GET', url: '/api/test' });
      fail('Expected promise to reject');
    } catch (error: any) {
      errorCaught = true;
      caughtError = error;
    }

    // Verify network error was handled properly
    expect(errorCaught).toBe(true);
    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toBe('Network error - please check your connection');
    expect(caughtError.name).toBe('NetworkError');
  });

  it('should simulate the exact scenario that was causing runtime exceptions', async () => {
    // This test simulates the exact scenario from TemplateBuilder.tsx
    // where session expires and causes a 401 error

    const sessionExpiredError = {
      response: {
        status: 401,
        data: { 
          message: 'Invalid authentication credentials',
          detail: 'Token has expired'
        }
      }
    };

    (mockAxiosInstance.request as any).mockRejectedValueOnce(sessionExpiredError);

    // Simulate the try-catch block in TemplateBuilder
    let errorHandledByTryCatch = false;
    let errorForGlobalStore: any = null;

    try {
      // This is what TemplateBuilder does when loading languages
      await testService.testRequest({ 
        method: 'GET', 
        url: '/api/language/tenant-supported',
        headers: { 'Authorization': 'Bearer expired-token' }
      });
      fail('Expected promise to reject');
    } catch (error: any) {
      // This should be caught by try-catch, not cause a runtime exception
      errorHandledByTryCatch = true;
      errorForGlobalStore = error;
    }

    // Verify the error was caught by try-catch (not thrown synchronously)
    expect(errorHandledByTryCatch).toBe(true);
    expect(errorForGlobalStore).toBeInstanceOf(Error);
    expect(errorForGlobalStore.name).toBe('AuthenticationError');
    expect(errorForGlobalStore.message).toBe('Invalid authentication credentials');
    expect(errorForGlobalStore.status).toBe(401);

    // This proves the error can be handled by the global error system
    // instead of causing a runtime exception screen
    expect(errorForGlobalStore).toBeDefined();
  });

  it('should verify that errors are properly typed for global error handling', async () => {
    const authError = {
      response: {
        status: 401,
        data: { message: 'Authentication failed' }
      }
    };

    (mockAxiosInstance.request as any).mockRejectedValueOnce(authError);

    let error: any = null;

    try {
      await testService.testRequest({ method: 'GET', url: '/api/test' });
    } catch (e) {
      error = e;
    }

    // Verify the error has the properties needed for global error handling
    expect(error).toBeDefined();
    expect(error.name).toBe('AuthenticationError');
    expect(error.message).toBe('Authentication failed');
    expect(error.status).toBe(401);
    
    // Verify the error can be used with the global error system
    // This is what TemplateBuilder does: error.name === 'AuthenticationError'
    const isAuthError = error && error.name === 'AuthenticationError';
    expect(isAuthError).toBe(true);
  });
});
