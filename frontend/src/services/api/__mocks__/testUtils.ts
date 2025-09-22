/**
 * Test utilities for API service testing
 */
import { AxiosResponse } from 'axios';

/**
 * Create a mock response
 */
export const createMockResponse = <T>(data: T, status: number = 200): AxiosResponse<T> => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {
    headers: {} as any,
    method: 'GET',
    url: '',
    timeout: 0,
    transformRequest: [],
    transformResponse: [],
    validateStatus: () => true,
    maxRedirects: 5,
    maxContentLength: -1,
    maxBodyLength: -1,
    maxRate: -1,
    signal: new AbortController().signal
  } as any,
  request: {}
});

/**
 * Create a mock error
 */
export const createMockError = (status: number, message: string, data?: any) => {
  const error = new Error(message) as any;
  error.response = {
    status,
    statusText: 'Error',
    data: data || { message },
    headers: {},
    config: {}
  };
  error.request = {};
  error.isAxiosError = true;
  return error;
};

/**
 * Create a network error
 */
export const createNetworkError = () => {
  const error = new Error('Network Error') as any;
  error.request = {};
  error.isAxiosError = true;
  return error;
};

/**
 * Test data factories
 */
export const createMockUser = (overrides: any = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  tenant_id: 'tenant-123',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides
});

export const createMockDocument = (overrides: any = {}) => ({
  id: 'doc-123',
  tenant_id: 'tenant-123',
  original_filename: 'test.pdf',
  file_size: 1024,
  mime_type: 'application/pdf',
  status: 'processed',
  extraction_status: 'completed',
  has_thumbnail: true,
  is_test_document: false,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides
});

export const createMockTemplate = (overrides: any = {}) => ({
  id: 'template-123',
  tenant_id: 'tenant-123',
  name: 'Test Template',
  description: 'Test template description',
  document_type: 'invoice',
  fields: [],
  is_active: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides
});

/**
 * Wait for async operations
 */
export const waitFor = (ms: number = 0) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock console methods for testing
 * Note: Jest-specific functions will be available when testing is set up
 */
export const mockConsole = () => {
  const originalConsole = { ...console };
  
  // These will be implemented when Jest is properly configured
  // beforeEach(() => {
  //   console.error = jest.fn();
  //   console.warn = jest.fn();
  //   console.log = jest.fn();
  // });

  // afterEach(() => {
  //   Object.assign(console, originalConsole);
  // });
};
