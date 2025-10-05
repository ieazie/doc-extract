/**
 * @jest-environment jsdom
 */

// @ts-ignore - Jest globals
declare const describe: any, it: any, expect: any, beforeEach: any, jest: any;

// Mock axios at module level BEFORE importing services
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: function() {},
    post: function() {},
    put: function() {},
    patch: function() {},
    delete: function() {},
    request: function() {},
    interceptors: {
      request: { use: function() {}, eject: function() {} },
      response: { use: function() {}, eject: function() {} },
    },
    defaults: {
      headers: {
        common: {}
      }
    },
  };
  
  return {
    create: function() { return mockAxiosInstance; },
    default: {
      create: function() { return mockAxiosInstance; }
    },
    __mockAxiosInstance: mockAxiosInstance // Export for test access
  };
});

import axios from 'axios';
import { ExtractionService } from '../ExtractionService';
import { serviceFactory } from '../../index';

// Get the mock instance
const mockAxiosInstance = (axios as any).__mockAxiosInstance;

// Convert functions to Jest mocks
mockAxiosInstance.get = jest.fn();
mockAxiosInstance.post = jest.fn();
mockAxiosInstance.put = jest.fn();
mockAxiosInstance.patch = jest.fn();
mockAxiosInstance.delete = jest.fn();
mockAxiosInstance.request = jest.fn();
mockAxiosInstance.interceptors.request.use = jest.fn();
mockAxiosInstance.interceptors.request.eject = jest.fn();
mockAxiosInstance.interceptors.response.use = jest.fn();
mockAxiosInstance.interceptors.response.eject = jest.fn();

describe('ExtractionService Review Actions', () => {
  let extractionService: ExtractionService;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Get service from factory
    extractionService = serviceFactory.get<ExtractionService>('extractions');
  });

  describe('startReview method', () => {
    const testExtractionId = 'test-extraction-id-123';
    const baseUrl = '/api/extractions';

    it('should send correct request for start_review action', async () => {
      // Mock successful response
      const mockResponse = {
        data: {
          extraction_id: testExtractionId,
          review_status: 'in_review',
          assigned_reviewer: 'test-reviewer',
          review_comments: null,
          review_completed_at: null,
          updated_at: '2024-01-01T00:00:00Z'
        }
      };
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      // Test data
      const request = {
        action: 'start_review' as const,
        comments: undefined,
        reviewer: 'test-reviewer'
      };

      // Call the method
      const result = await extractionService.startReview(testExtractionId, request);

      // Verify the request was made correctly
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: `${baseUrl}/${testExtractionId}/review`,
        data: request
      });

      // Verify the response
      expect(result).toEqual(mockResponse.data);
      expect(result.review_status).toBe('in_review');
    });

    it('should send correct request for approve action', async () => {
      // Mock successful response
      const mockResponse = {
        data: {
          extraction_id: testExtractionId,
          review_status: 'approved',
          assigned_reviewer: 'test-reviewer',
          review_comments: 'Looks good!',
          review_completed_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      };
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      // Test data
      const request = {
        action: 'approve' as const,
        comments: 'Looks good!',
        reviewer: 'test-reviewer'
      };

      // Call the method
      const result = await extractionService.startReview(testExtractionId, request);

      // Verify the request was made correctly
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: `${baseUrl}/${testExtractionId}/review`,
        data: request
      });

      // Verify the response
      expect(result).toEqual(mockResponse.data);
      expect(result.review_status).toBe('approved');
      expect(result.review_comments).toBe('Looks good!');
    });

    it('should send correct request for reject action', async () => {
      // Mock successful response
      const mockResponse = {
        data: {
          extraction_id: testExtractionId,
          review_status: 'rejected',
          assigned_reviewer: 'test-reviewer',
          review_comments: 'Issues found',
          review_completed_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      };
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      // Test data
      const request = {
        action: 'reject' as const,
        comments: 'Issues found',
        reviewer: 'test-reviewer'
      };

      // Call the method
      const result = await extractionService.startReview(testExtractionId, request);

      // Verify the request was made correctly
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: `${baseUrl}/${testExtractionId}/review`,
        data: request
      });

      // Verify the response
      expect(result).toEqual(mockResponse.data);
      expect(result.review_status).toBe('rejected');
      expect(result.review_comments).toBe('Issues found');
    });

    it('should send correct request for needs_correction action', async () => {
      // Mock successful response
      const mockResponse = {
        data: {
          extraction_id: testExtractionId,
          review_status: 'needs_correction',
          assigned_reviewer: 'test-reviewer',
          review_comments: 'Please fix these issues',
          review_completed_at: null,
          updated_at: '2024-01-01T00:00:00Z'
        }
      };
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      // Test data
      const request = {
        action: 'needs_correction' as const,
        comments: 'Please fix these issues',
        reviewer: 'test-reviewer'
      };

      // Call the method
      const result = await extractionService.startReview(testExtractionId, request);

      // Verify the request was made correctly
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: `${baseUrl}/${testExtractionId}/review`,
        data: request
      });

      // Verify the response
      expect(result).toEqual(mockResponse.data);
      expect(result.review_status).toBe('needs_correction');
      expect(result.review_comments).toBe('Please fix these issues');
    });

    it('should handle API errors correctly', async () => {
      // Mock error response
      const mockError = {
        response: {
          status: 400,
          data: {
            detail: 'Invalid action. Must be one of: [\'start_review\', \'approve\', \'reject\', \'needs_correction\']'
          }
        }
      };
      mockAxiosInstance.request.mockRejectedValueOnce(mockError);

      // Test data with invalid action
      const request = {
        action: 'invalid_action' as any,
        comments: 'Test comment'
      };

      // Call the method and expect it to throw
      await expect(extractionService.startReview(testExtractionId, request))
        .rejects.toThrow();

      // Verify the request was still made (error handling happens in BaseApiClient)
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: `${baseUrl}/${testExtractionId}/review`,
        data: request
      });
    });

    it('should handle network errors correctly', async () => {
      // Mock network error
      const mockError = {
        request: {},
        message: 'Network Error'
      };
      mockAxiosInstance.request.mockRejectedValueOnce(mockError);

      // Test data
      const request = {
        action: 'start_review' as const,
        comments: 'Test comment'
      };

      // Call the method and expect it to throw
      await expect(extractionService.startReview(testExtractionId, request))
        .rejects.toThrow();

      // Verify the request was made
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: `${baseUrl}/${testExtractionId}/review`,
        data: request
      });
    });
  });

  describe('Action Parameter Validation', () => {
    const testExtractionId = 'test-extraction-id-123';

    it('should accept all valid action types', () => {
      // Test that TypeScript accepts all valid action types
      const actions: Array<'start_review' | 'approve' | 'reject' | 'needs_correction'> = [
        'start_review',
        'approve',
        'reject',
        'needs_correction'
      ];

      actions.forEach(action => {
        expect(typeof action).toBe('string');
        expect(['start_review', 'approve', 'reject', 'needs_correction']).toContain(action);
      });
    });

    it('should handle optional parameters correctly', () => {
      // Test minimal request
      const minimalRequest = {
        action: 'start_review' as const
      };
      
      // Test with full request
      const fullRequest = {
        action: 'approve' as const,
        comments: 'Test comment',
        reviewer: 'test-reviewer'
      };
      
      // Both should be valid TypeScript types
      expect(minimalRequest.action).toBe('start_review');
      expect(fullRequest.action).toBe('approve');
      expect(fullRequest.comments).toBe('Test comment');
      expect(fullRequest.reviewer).toBe('test-reviewer');
    });
  });

  describe('Response Type Validation', () => {
    const testExtractionId = 'test-extraction-id-123';

    it('should return correct response type for successful requests', async () => {
      // Mock successful response with all fields
      const mockResponse = {
        data: {
          extraction_id: testExtractionId,
          review_status: 'approved',
          assigned_reviewer: 'test-reviewer',
          review_comments: 'Test comment',
          review_completed_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      };
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const request = {
        action: 'approve' as const,
        comments: 'Test comment',
        reviewer: 'test-reviewer'
      };

      const result = await extractionService.startReview(testExtractionId, request);

      // Verify response structure
      expect(result).toHaveProperty('extraction_id');
      expect(result).toHaveProperty('review_status');
      expect(result).toHaveProperty('assigned_reviewer');
      expect(result).toHaveProperty('review_comments');
      expect(result).toHaveProperty('review_completed_at');
      expect(result).toHaveProperty('updated_at');

      // Verify types
      expect(typeof result.extraction_id).toBe('string');
      expect(typeof result.review_status).toBe('string');
      expect(typeof result.updated_at).toBe('string');
    });

    it('should handle optional response fields correctly', async () => {
      // Mock response with optional fields as null/undefined
      const mockResponse = {
        data: {
          extraction_id: testExtractionId,
          review_status: 'in_review',
          assigned_reviewer: null,
          review_comments: null,
          review_completed_at: null,
          updated_at: '2024-01-01T00:00:00Z'
        }
      };
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const request = {
        action: 'start_review' as const
      };

      const result = await extractionService.startReview(testExtractionId, request);

      // Verify optional fields can be null
      expect(result.assigned_reviewer).toBeNull();
      expect(result.review_comments).toBeNull();
      expect(result.review_completed_at).toBeNull();
    });
  });
});