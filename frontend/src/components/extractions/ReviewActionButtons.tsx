/**
 * Review Action Buttons Component
 * Provides approve/reject/needs correction functionality for extractions
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { useQueryClient } from 'react-query';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play, 
  MessageSquare,
  Loader2,
  Save,
  Edit3
} from 'lucide-react';
import { ExtractionService, serviceFactory, ReviewStatus, ReviewActionRequest } from '../../services/api/index';
import NotificationDialog from '../common/NotificationDialog';

interface ReviewActionButtonsProps {
  extractionId: string;
  currentStatus: ReviewStatus;
  onStatusChange: (status: ReviewStatus) => void;
  onStartReview: () => void;
  onApprove: () => void;
  onReject: () => void;
  onNeedsCorrection: () => void;
  // Correction functionality
  hasPendingCorrections?: boolean;
  onSaveCorrections?: () => void;
  isEditing?: boolean;
  onToggleEdit?: () => void;
  onDataChange?: () => void;
  className?: string;
}

// Styled Components
const Container = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
`;

const Button = styled.button<{ 
  $variant: 'approve' | 'reject' | 'needs_correction' | 'start_review' | 'save_corrections' | 'edit_toggle';
  $isLoading?: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.5rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  width: 2.5rem;
  height: 2.5rem;
  position: relative;
  
  ${props => props.$isLoading && `
    cursor: not-allowed;
    opacity: 0.7;
  `}
  
  ${props => {
    switch (props.$variant) {
      case 'approve':
        return `
          background-color: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
          
          &:hover:not(:disabled) {
            background-color: #bbf7d0;
            transform: translateY(-1px);
          }
        `;
      case 'reject':
        return `
          background-color: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
          
          &:hover:not(:disabled) {
            background-color: #fecaca;
            transform: translateY(-1px);
          }
        `;
      case 'needs_correction':
        return `
          background-color: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
          
          &:hover:not(:disabled) {
            background-color: #fde68a;
            transform: translateY(-1px);
          }
        `;
      case 'start_review':
        return `
          background-color: #dbeafe;
          color: #1e40af;
          border: 1px solid #bfdbfe;
          
          &:hover:not(:disabled) {
            background-color: #bfdbfe;
            transform: translateY(-1px);
          }
        `;
      case 'save_corrections':
        return `
          background-color: #10b981;
          color: white;
          border: 1px solid #059669;
          
          &:hover:not(:disabled) {
            background-color: #059669;
            transform: translateY(-1px);
          }
        `;
      case 'edit_toggle':
        return `
          background-color: #6366f1;
          color: white;
          border: 1px solid #4f46e5;
          
          &:hover:not(:disabled) {
            background-color: #4f46e5;
            transform: translateY(-1px);
          }
        `;
      default:
        return `
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;


const LoadingSpinner = styled(Loader2)`
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const PendingChangesIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background-color: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  animation: pulse 2s infinite;
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: -2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: ${props => props.theme.zIndex.tooltip};
  
  ${Button}:hover & {
    opacity: 1;
  }
`;

const CommentInput = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Modal = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: ${props => props.theme.zIndex.tooltip};
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1rem;
`;

const CancelButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  
  &:hover {
    background-color: #f9fafb;
  }
`;

const SubmitButton = styled.button<{ $variant: 'approve' | 'reject' | 'needs_correction' }>`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  
  ${props => {
    switch (props.$variant) {
      case 'approve':
        return `
          background-color: #10b981;
          color: white;
          
          &:hover {
            background-color: #059669;
          }
        `;
      case 'reject':
        return `
          background-color: #ef4444;
          color: white;
          
          &:hover {
            background-color: #dc2626;
          }
        `;
      case 'needs_correction':
        return `
          background-color: #f59e0b;
          color: white;
          
          &:hover {
            background-color: #d97706;
          }
        `;
    }
  }}
`;

// Helper function to get status icon
const getStatusIcon = (status: ReviewStatus) => {
  switch (status) {
    case 'pending': return <AlertTriangle size={16} />;
    case 'in_review': return <Play size={16} />;
    case 'approved': return <CheckCircle size={16} />;
    case 'rejected': return <XCircle size={16} />;
    case 'needs_correction': return <AlertTriangle size={16} />;
    default: return <AlertTriangle size={16} />;
  }
};

// Helper function to get status label
const getStatusLabel = (status: ReviewStatus) => {
  switch (status) {
    case 'pending': return 'Pending Review';
    case 'in_review': return 'In Review';
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    case 'needs_correction': return 'Needs Correction';
    default: return 'Unknown';
  }
};

export const ReviewActionButtons: React.FC<ReviewActionButtonsProps> = ({
  extractionId,
  currentStatus,
  onStatusChange,
  onStartReview,
  onApprove,
  onReject,
  onNeedsCorrection,
  hasPendingCorrections = false,
  onSaveCorrections,
  isEditing = false,
  onToggleEdit,
  onDataChange,
  className
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentAction, setCommentAction] = useState<'approve' | 'reject' | 'needs_correction' | null>(null);
  const [comments, setComments] = useState('');
  const queryClient = useQueryClient();
  
  // Notification state
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const handleAction = async (action: string, requiresComment = false) => {
    if (requiresComment) {
      setCommentAction(action as 'approve' | 'reject' | 'needs_correction');
      setShowCommentModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const request = {
        action: action as 'start_review' | 'approve' | 'reject' | 'needs_correction',
        comments: comments || undefined
      };

      const extractionService = serviceFactory.get<ExtractionService>('extractions');
      const response = await extractionService.startReview(extractionId, request);
      
      // Set the appropriate status based on the action
      const nextStatusMap: Record<string, ReviewStatus> = {
        start_review: 'in_review',
        approve: 'approved',
        reject: 'rejected',
        needs_correction: 'needs_correction',
      };
      onStatusChange(nextStatusMap[action] ?? currentStatus);
      
      // Call the appropriate callback
      switch (action) {
        case 'start_review':
          onStartReview();
          break;
        case 'approve':
          onApprove();
          break;
        case 'reject':
          onReject();
          break;
        case 'needs_correction':
          onNeedsCorrection();
          break;
      }
      
      // Review action completed successfully
      
      // Invalidate queries to refresh data in the table
      queryClient.invalidateQueries(['extraction', extractionId]);
      queryClient.invalidateQueries(['extractions']);
      
      // Notify parent component of data change
      onDataChange?.();
      
      // Show success notification
      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Action Completed',
        message: `Successfully ${action.replace('_', ' ')}d the extraction.`
      });
      
    } catch (error) {
      console.error('Failed to update review status:', error);
      
      // Show error notification
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Action Failed',
        message: `Failed to ${action.replace('_', ' ')} the extraction. Please try again.`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentAction) return;
    
    setIsLoading(true);
    try {
      const request = {
        action: commentAction as 'start_review' | 'approve' | 'reject' | 'needs_correction',
        comments: comments.trim() || undefined
      };

      const extractionService = serviceFactory.get<ExtractionService>('extractions');
      const response = await extractionService.startReview(extractionId, request);
      
      // Set the appropriate status based on the action
      const nextStatusMap: Record<string, ReviewStatus> = {
        approve: 'approved',
        reject: 'rejected',
        needs_correction: 'needs_correction',
      };
      onStatusChange(nextStatusMap[commentAction] ?? currentStatus);
      
      // Call the appropriate callback
      switch (commentAction) {
        case 'approve':
          onApprove();
          break;
        case 'reject':
          onReject();
          break;
        case 'needs_correction':
          onNeedsCorrection();
          break;
      }
      
      setShowCommentModal(false);
      setComments('');
      setCommentAction(null);
      
      // Invalidate queries to refresh data in the table
      queryClient.invalidateQueries(['extraction', extractionId]);
      queryClient.invalidateQueries(['extractions']);
      
      // Notify parent component of data change
      onDataChange?.();
    } catch (error) {
      console.error('Failed to update review status:', error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelComment = () => {
    setShowCommentModal(false);
    setComments('');
    setCommentAction(null);
  };

  // Determine which buttons to show based on current status
  const showStartReview = currentStatus === 'pending';
  const showApprove = currentStatus === 'in_review' || currentStatus === 'needs_correction';
  const showReject = currentStatus === 'in_review' || currentStatus === 'needs_correction';
  const showNeedsCorrection = currentStatus === 'in_review';
  const showEditToggle = currentStatus === 'pending' || currentStatus === 'in_review' || currentStatus === 'needs_correction';
  const showSaveCorrections = hasPendingCorrections && (currentStatus === 'in_review' || currentStatus === 'needs_correction');

  return (
    <>
      <Container className={className}>
        {/* Pending Changes Indicator */}
        {hasPendingCorrections && (
          <PendingChangesIndicator>
            <AlertTriangle size={16} />
            Pending Changes
          </PendingChangesIndicator>
        )}

        {/* Action Buttons */}
        {showEditToggle && (
          <Button
            $variant="edit_toggle"
            $isLoading={isLoading}
            onClick={onToggleEdit}
            disabled={isLoading}
            title={isEditing ? 'Stop Editing' : 'Edit Fields'}
          >
            <Edit3 size={16} />
            <Tooltip>{isEditing ? 'Stop Editing' : 'Edit Fields'}</Tooltip>
          </Button>
        )}

        {showStartReview && (
          <Button
            $variant="start_review"
            $isLoading={isLoading}
            onClick={() => {
              handleAction('start_review');
            }}
            disabled={isLoading}
            title="Start Review"
          >
            {isLoading ? <LoadingSpinner size={16} /> : <Play size={16} />}
            <Tooltip>Start Review</Tooltip>
          </Button>
        )}

        {showSaveCorrections && (
          <Button
            $variant="save_corrections"
            $isLoading={isLoading}
            onClick={onSaveCorrections}
            disabled={isLoading}
            title="Save Corrections"
          >
            {isLoading ? <LoadingSpinner size={16} /> : <Save size={16} />}
            <Tooltip>Save Corrections</Tooltip>
          </Button>
        )}

        {showApprove && (
          <Button
            $variant="approve"
            $isLoading={isLoading}
            onClick={() => {
              handleAction('approve', true);
            }}
            disabled={isLoading}
            title="Approve"
          >
            {isLoading ? <LoadingSpinner size={16} /> : <CheckCircle size={16} />}
            <Tooltip>Approve</Tooltip>
          </Button>
        )}

        {showReject && (
          <Button
            $variant="reject"
            $isLoading={isLoading}
            onClick={() => handleAction('reject', true)}
            disabled={isLoading}
            title="Reject"
          >
            {isLoading ? <LoadingSpinner size={16} /> : <XCircle size={16} />}
            <Tooltip>Reject</Tooltip>
          </Button>
        )}

        {showNeedsCorrection && (
          <Button
            $variant="needs_correction"
            $isLoading={isLoading}
            onClick={() => handleAction('needs_correction', true)}
            disabled={isLoading}
            title="Needs Correction"
          >
            {isLoading ? <LoadingSpinner size={16} /> : <AlertTriangle size={16} />}
            <Tooltip>Needs Correction</Tooltip>
          </Button>
        )}
      </Container>

      {/* Comment Modal */}
      <Modal $isOpen={showCommentModal}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {commentAction === 'approve' && 'Approve Extraction'}
              {commentAction === 'reject' && 'Reject Extraction'}
              {commentAction === 'needs_correction' && 'Mark as Needs Correction'}
            </ModalTitle>
          </ModalHeader>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Comments (Optional)
            </label>
            <CommentInput
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any comments about this extraction..."
            />
          </div>
          
          <ModalActions>
            <CancelButton onClick={handleCancelComment}>
              Cancel
            </CancelButton>
            <SubmitButton
              $variant={commentAction!}
              onClick={handleCommentSubmit}
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner size={16} /> : null}
              {commentAction === 'approve' && 'Approve'}
              {commentAction === 'reject' && 'Reject'}
              {commentAction === 'needs_correction' && 'Mark for Correction'}
            </SubmitButton>
          </ModalActions>
        </ModalContent>
      </Modal>

      {/* Notification Dialog */}
      <NotificationDialog
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        autoClose={notification.type === 'success'}
        autoCloseDelay={3000}
      />
    </>
  );
};

export default ReviewActionButtons;
