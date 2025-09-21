/**
 * Interceptor Guard Tests
 * Verifies that the interceptor duplication guard actually works
 */

// @ts-ignore - Jest globals
declare const describe: any, it: any, expect: any, beforeEach: any, jest: any;

import { AxiosInstance } from 'axios';
import { BaseApiClient } from '../base/BaseApiClient';

// Create a test service that extends BaseApiClient
class TestService extends BaseApiClient {
  constructor(client: AxiosInstance) {
    super(client);
  }
}

describe('Interceptor Guard Tests', () => {
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
  });

  it('should install interceptors only once when multiple services are created', () => {
    // Create multiple services with the same axios instance
    const service1 = new TestService(mockAxiosInstance);
    const service2 = new TestService(mockAxiosInstance);
    const service3 = new TestService(mockAxiosInstance);

    expect(service1).toBeDefined();
    expect(service2).toBeDefined();
    expect(service3).toBeDefined();

    // Interceptors should be called only once (not 3 times)
    expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalledTimes(1);

    // The guard flag should be set
    expect((mockAxiosInstance as any).__baseInterceptorsInstalled).toBe(true);
  });

  it('should skip interceptor installation if flag is already set', () => {
    // Manually set the flag first
    (mockAxiosInstance as any).__baseInterceptorsInstalled = true;

    // Create a service - should skip interceptor setup
    const service = new TestService(mockAxiosInstance);

    expect(service).toBeDefined();

    // Interceptors should NOT be called
    expect(mockAxiosInstance.interceptors.request.use).not.toHaveBeenCalled();
    expect(mockAxiosInstance.interceptors.response.use).not.toHaveBeenCalled();
  });

  it('should set the guard flag after first interceptor installation', () => {
    // Initially no flag
    expect((mockAxiosInstance as any).__baseInterceptorsInstalled).toBeUndefined();

    // Create first service
    const service1 = new TestService(mockAxiosInstance);
    expect(service1).toBeDefined();

    // Flag should now be set
    expect((mockAxiosInstance as any).__baseInterceptorsInstalled).toBe(true);

    // Interceptors should be called once
    expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalledTimes(1);

    // Create second service - should skip due to flag
    const service2 = new TestService(mockAxiosInstance);
    expect(service2).toBeDefined();

    // Interceptor call count should remain the same
    expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
  });

  it('should handle the guard flag safely with type casting', () => {
    // Test that the flag can be set and read safely
    const service = new TestService(mockAxiosInstance);
    
    expect(service).toBeDefined();
    
    // Verify flag is boolean
    expect(typeof (mockAxiosInstance as any).__baseInterceptorsInstalled).toBe('boolean');
    expect((mockAxiosInstance as any).__baseInterceptorsInstalled).toBe(true);
  });
});
