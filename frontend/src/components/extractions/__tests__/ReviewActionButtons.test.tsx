/**
 * ReviewActionButtons Component Tests
 * Tests the review action button functionality and API integration
 */

// @ts-ignore - Jest globals
declare const describe: any, it: any, expect: any, beforeEach: any, afterEach: any;
declare global {
  const jest: any;
}

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReviewActionButtons } from '../ReviewActionButtons';
import { serviceFactory } from '../../../services/api/index';

// Mock the service factory
jest.mock('../../../services/api/index', () => ({
  serviceFactory: {
    get: jest.fn()
  }
}));

// Mock the ExtractionService
const mockStartReview = jest.fn();
const mockExtractionService = {
  startReview: mockStartReview
};

// Mock the service factory to return our mock service
(serviceFactory.get as any).mockReturnValue(mockExtractionService);

describe('ReviewActionButtons', () => {
  let queryClient: QueryClient;
  const mockOnStatusChange = jest.fn();
  const mockOnStartReview = jest.fn();
  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();
  const mockOnNeedsCorrection = jest.fn();
  const mockOnDataChange = jest.fn();

  const defaultProps = {
    extractionId: 'test-extraction-id',
    currentStatus: 'pending' as const,
    onStatusChange: mockOnStatusChange,
    onStartReview: mockOnStartReview,
    onApprove: mockOnApprove,
    onReject: mockOnReject,
    onNeedsCorrection: mockOnNeedsCorrection,
    onDataChange: mockOnDataChange
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Setup mock service factory
    (serviceFactory.get as any).mockReturnValue(mockExtractionService);
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWithQueryClient = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ReviewActionButtons {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  describe('Start Review Action', () => {
    it('should call startReview with correct parameters for start_review action', async () => {
      mockStartReview.mockResolvedValueOnce({
        extraction_id: 'test-extraction-id',
        review_status: 'in_review',
        updated_at: '2024-01-01T00:00:00Z'
      });

      renderWithQueryClient({ currentStatus: 'pending' });

      // Find and click the start review button
      const startReviewButton = screen.getByTitle('Start Review');
      fireEvent.click(startReviewButton);

      // Wait for the API call to complete
      await waitFor(() => {
        expect(mockStartReview).toHaveBeenCalledWith('test-extraction-id', {
          action: 'start_review',
          comments: undefined
        });
      });

      // Verify callbacks were called
      expect(mockOnStatusChange).toHaveBeenCalledWith('in_review');
      expect(mockOnStartReview).toHaveBeenCalled();
      expect(mockOnDataChange).toHaveBeenCalled();
    });

    it('should handle start_review API errors gracefully', async () => {
      const mockError = new Error('API Error');
      mockStartReview.mockRejectedValueOnce(mockError);

      renderWithQueryClient({ currentStatus: 'pending' });

      const startReviewButton = screen.getByTitle('Start Review');
      fireEvent.click(startReviewButton);

      await waitFor(() => {
        expect(mockStartReview).toHaveBeenCalled();
      });

      // Verify error handling - callbacks should not be called on error
      expect(mockOnStatusChange).not.toHaveBeenCalled();
      expect(mockOnStartReview).not.toHaveBeenCalled();
      expect(mockOnDataChange).not.toHaveBeenCalled();
    });
  });

  describe('Approve Action', () => {
    it('should show comment modal for approve action', async () => {
      renderWithQueryClient({ currentStatus: 'in_review' });

      const approveButton = screen.getByTitle('Approve');
      fireEvent.click(approveButton);

      // Should show comment modal
      await waitFor(() => {
        expect(screen.getByText('Approve Extraction')).toBeInTheDocument();
      });
    });

    it('should call startReview with correct parameters for approve action', async () => {
      mockStartReview.mockResolvedValueOnce({
        extraction_id: 'test-extraction-id',
        review_status: 'approved',
        review_comments: 'Looks good!',
        updated_at: '2024-01-01T00:00:00Z'
      });

      renderWithQueryClient({ currentStatus: 'in_review' });

      // Click approve button to open modal
      const approveButton = screen.getByTitle('Approve');
      fireEvent.click(approveButton);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByText('Approve Extraction')).toBeInTheDocument();
      });

      // Enter comment
      const commentInput = screen.getByPlaceholderText('Add any comments about this extraction...');
      fireEvent.change(commentInput, { target: { value: 'Looks good!' } });

      // Submit the form - use getAllByText and select the modal button (last one is in modal)
      const approveButtons = screen.getAllByText('Approve');
      const modalSubmitButton = approveButtons[approveButtons.length - 1]; // Last button is in modal
      fireEvent.click(modalSubmitButton);

      // Wait for the API call
      await waitFor(() => {
        expect(mockStartReview).toHaveBeenCalledWith('test-extraction-id', {
          action: 'approve',
          comments: 'Looks good!'
        });
      });

      // Verify callbacks
      expect(mockOnStatusChange).toHaveBeenCalledWith('approved');
      expect(mockOnApprove).toHaveBeenCalled();
      expect(mockOnDataChange).toHaveBeenCalled();
    });
  });

  describe('Reject Action', () => {
    it('should call startReview with correct parameters for reject action', async () => {
      mockStartReview.mockResolvedValueOnce({
        extraction_id: 'test-extraction-id',
        review_status: 'rejected',
        review_comments: 'Needs improvement',
        updated_at: '2024-01-01T00:00:00Z'
      });

      renderWithQueryClient({ currentStatus: 'in_review' });

      // Click reject button to open modal
      const rejectButton = screen.getByTitle('Reject');
      fireEvent.click(rejectButton);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByText('Reject Extraction')).toBeInTheDocument();
      });

      // Enter comment
      const commentInput = screen.getByPlaceholderText('Add any comments about this extraction...');
      fireEvent.change(commentInput, { target: { value: 'Needs improvement' } });

      // Submit the form - use getAllByText and select the modal button (last one is in modal)
      const rejectButtons = screen.getAllByText('Reject');
      const modalSubmitButton = rejectButtons[rejectButtons.length - 1]; // Last button is in modal
      fireEvent.click(modalSubmitButton);

      // Wait for the API call
      await waitFor(() => {
        expect(mockStartReview).toHaveBeenCalledWith('test-extraction-id', {
          action: 'reject',
          comments: 'Needs improvement'
        });
      });

      // Verify callbacks
      expect(mockOnStatusChange).toHaveBeenCalledWith('rejected');
      expect(mockOnReject).toHaveBeenCalled();
      expect(mockOnDataChange).toHaveBeenCalled();
    });
  });

  describe('Needs Correction Action', () => {
    it('should call startReview with correct parameters for needs_correction action', async () => {
      mockStartReview.mockResolvedValueOnce({
        extraction_id: 'test-extraction-id',
        review_status: 'needs_correction',
        review_comments: 'Please fix these issues',
        updated_at: '2024-01-01T00:00:00Z'
      });

      renderWithQueryClient({ currentStatus: 'in_review' });

      // Click needs correction button to open modal
      const needsCorrectionButton = screen.getByTitle('Needs Correction');
      fireEvent.click(needsCorrectionButton);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByText('Mark as Needs Correction')).toBeInTheDocument();
      });

      // Enter comment
      const commentInput = screen.getByPlaceholderText('Add any comments about this extraction...');
      fireEvent.change(commentInput, { target: { value: 'Please fix these issues' } });

      // Submit the form
      const submitButton = screen.getByText('Mark for Correction');
      fireEvent.click(submitButton);

      // Wait for the API call
      await waitFor(() => {
        expect(mockStartReview).toHaveBeenCalledWith('test-extraction-id', {
          action: 'needs_correction',
          comments: 'Please fix these issues'
        });
      });

      // Verify callbacks
      expect(mockOnStatusChange).toHaveBeenCalledWith('needs_correction');
      expect(mockOnNeedsCorrection).toHaveBeenCalled();
      expect(mockOnDataChange).toHaveBeenCalled();
    });
  });

  describe('Button Visibility', () => {
    it('should show start review button for pending status', () => {
      renderWithQueryClient({ currentStatus: 'pending' });
      expect(screen.getByTitle('Start Review')).toBeInTheDocument();
    });

    it('should show approve/reject/needs correction buttons for in_review status', () => {
      renderWithQueryClient({ currentStatus: 'in_review' });
      expect(screen.getByTitle('Approve')).toBeInTheDocument();
      expect(screen.getByTitle('Reject')).toBeInTheDocument();
      expect(screen.getByTitle('Needs Correction')).toBeInTheDocument();
    });

    it('should show approve/reject buttons for needs_correction status', () => {
      renderWithQueryClient({ currentStatus: 'needs_correction' });
      expect(screen.getByTitle('Approve')).toBeInTheDocument();
      expect(screen.getByTitle('Reject')).toBeInTheDocument();
      expect(screen.queryByTitle('Needs Correction')).not.toBeInTheDocument();
    });

    it('should not show action buttons for approved status', () => {
      renderWithQueryClient({ currentStatus: 'approved' });
      expect(screen.queryByTitle('Start Review')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Approve')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Reject')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Needs Correction')).not.toBeInTheDocument();
    });

    it('should not show action buttons for rejected status', () => {
      renderWithQueryClient({ currentStatus: 'rejected' });
      expect(screen.queryByTitle('Start Review')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Approve')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Reject')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Needs Correction')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner during API calls', async () => {
      // Mock a delayed response
      mockStartReview.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          extraction_id: 'test-extraction-id',
          review_status: 'in_review',
          updated_at: '2024-01-01T00:00:00Z'
        }), 100))
      );

      renderWithQueryClient({ currentStatus: 'pending' });

      const startReviewButton = screen.getByTitle('Start Review');
      fireEvent.click(startReviewButton);

      // Should show loading spinner
      await waitFor(() => {
        expect(startReviewButton).toBeDisabled();
      });
    });
  });

  describe('Comment Modal', () => {
    it('should allow canceling comment modal', async () => {
      renderWithQueryClient({ currentStatus: 'in_review' });

      const approveButton = screen.getByTitle('Approve');
      fireEvent.click(approveButton);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByText('Approve Extraction')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByText('Approve Extraction')).not.toBeInTheDocument();
      });

      // API should not be called
      expect(mockStartReview).not.toHaveBeenCalled();
    });

    it('should allow submitting without comments', async () => {
      mockStartReview.mockResolvedValueOnce({
        extraction_id: 'test-extraction-id',
        review_status: 'approved',
        review_comments: null,
        updated_at: '2024-01-01T00:00:00Z'
      });

      renderWithQueryClient({ currentStatus: 'in_review' });

      const approveButton = screen.getByTitle('Approve');
      fireEvent.click(approveButton);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByText('Approve Extraction')).toBeInTheDocument();
      });

      // Submit without entering comments - use getAllByText and select the modal button (last one is in modal)
      const approveButtons = screen.getAllByText('Approve');
      const modalSubmitButton = approveButtons[approveButtons.length - 1]; // Last button is in modal
      fireEvent.click(modalSubmitButton);

      // Wait for the API call
      await waitFor(() => {
        expect(mockStartReview).toHaveBeenCalledWith('test-extraction-id', {
          action: 'approve',
          comments: undefined
        });
      });
    });
  });
});
