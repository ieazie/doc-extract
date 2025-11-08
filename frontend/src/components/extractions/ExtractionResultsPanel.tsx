/**
 * Extraction Results Panel
 * Reusable component for displaying extraction results with multiple view modes
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { 
  Download, 
  FileText
} from 'lucide-react';

import LoadingSpinner from '../common/LoadingSpinner';
import HierarchicalResultsViewer from './HierarchicalResultsViewer';
import TableViewer from './TableViewer';
import CardsViewer from './CardsViewer';
import ViewModeSelector, { ViewMode } from './ViewModeSelector';
import ReviewActionButtons from './ReviewActionButtons';
import { ReviewStatus } from '../../services/api/index';

// Styled Components
const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  flex-shrink: 0;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;


const ResultsContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
`;

const FormattedResults = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ResultField = styled.div`
  padding: 0.75rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
`;

const ResultFieldName = styled.div`
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
`;

const ResultFieldValue = styled.div`
  color: #374151;
  font-family: monospace;
  font-size: 0.875rem;
`;

const JsonViewer = styled.pre`
  background: #1f2937;
  color: #f9fafb;
  padding: 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-x: auto;
  margin: 0;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #6b7280;
  text-align: center;
`;

const ErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #ef4444;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 0.375rem;
  margin: 1rem;
  text-align: center;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #6b7280;
  text-align: center;
`;

const ExportButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 1rem;
  
  &:hover {
    background: #2563eb;
  }
`;

interface ExtractionResultsPanelProps {
  extractionResults?: any;
  isExtracting?: boolean;
  extractionError?: string | null;
  size?: 'small' | 'medium' | 'large';
  showExportButton?: boolean;
  onExport?: () => void;
  onRetry?: () => void;
  // Review workflow props
  extractionId?: string;
  reviewStatus?: ReviewStatus;
  showReviewActions?: boolean;
  onReviewStatusChange?: (status: ReviewStatus) => void;
  onDataChange?: () => void;
  // Field editing props
  isEditing?: boolean;
  onToggleEdit?: () => void;
  onFieldValueChange?: (fieldPath: string, newValue: any) => void;
  onFieldSave?: (fieldPath: string, newValue: any) => void;
  onFieldCancel?: (fieldPath: string) => void;
  hasPendingCorrections?: boolean;
  onSaveCorrections?: () => void;
  // Low confidence field detection props
  templateSettings?: Record<string, any>;
  showLowConfidenceFlags?: boolean;
  onLowConfidenceFieldClick?: (field: any) => void;
}

export const ExtractionResultsPanel: React.FC<ExtractionResultsPanelProps> = ({
  extractionResults,
  isExtracting = false,
  extractionError = null,
  size = 'medium',
  showExportButton = true,
  onExport,
  onRetry,
  // Review workflow props
  extractionId,
  reviewStatus = 'pending',
  showReviewActions = false,
  onReviewStatusChange,
  onDataChange,
  // Field editing props
  isEditing = false,
  onToggleEdit,
  onFieldValueChange,
  onFieldSave,
  onFieldCancel,
  hasPendingCorrections = false,
  onSaveCorrections,
  // Low confidence field detection props
  templateSettings,
  showLowConfidenceFlags = true,
  onLowConfidenceFieldClick
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchical');

  // Review action handlers
  const handleStartReview = () => {
    console.log('Starting review for extraction:', extractionId);
    // TODO: Add any additional logic for starting review
  };

  const handleApprove = () => {
    console.log('Approving extraction:', extractionId);
    // TODO: Add any additional logic for approval
  };

  const handleReject = () => {
    console.log('Rejecting extraction:', extractionId);
    // TODO: Add any additional logic for rejection
  };

  const handleNeedsCorrection = () => {
    console.log('Marking extraction as needs correction:', extractionId);
    // TODO: Add any additional logic for needs correction
  };

  const handleReviewStatusChange = (newStatus: ReviewStatus) => {
    if (onReviewStatusChange) {
      onReviewStatusChange(newStatus);
    }
  };

  const handleExportJson = () => {
    if (!extractionResults?.results) return;
    
    const dataStr = JSON.stringify(extractionResults.results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extraction-results-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    if (onExport) {
      onExport();
    }
  };

  // Loading state
  if (isExtracting) {
    return (
      <LoadingState>
        <LoadingSpinner size={32} />
        <h3 style={{ margin: '1rem 0 0.5rem 0', color: '#374151' }}>Extracting Data...</h3>
        <p style={{ margin: 0 }}>
          Processing document with AI extraction
        </p>
      </LoadingState>
    );
  }

  // Error state
  if (extractionError) {
    return (
      <ErrorState>
        <h4 style={{ margin: '0 0 0.5rem 0' }}>Extraction Failed</h4>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem' }}>{extractionError}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Try Again
          </button>
        )}
      </ErrorState>
    );
  }

  // No results state
  if (!extractionResults?.results) {
    console.log('ExtractionResultsPanel: No results found. Full extractionResults object:', extractionResults);
    return (
      <EmptyState>
        <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <h3 style={{ margin: '0 0 0.5rem 0' }}>No Extraction Results</h3>
        <p style={{ margin: 0 }}>
          Run an extraction to see results here
        </p>
        <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#6b7280' }}>
          Debug: results is {extractionResults?.results ? 'present' : 'missing'}
        </div>
      </EmptyState>
    );
  }

  // Results state
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Header>
        <HeaderLeft>
          <ViewModeSelector
            currentMode={viewMode}
            onModeChange={setViewMode}
            availableModes={['hierarchical', 'table', 'cards', 'json']}
          />
        </HeaderLeft>
        <HeaderRight>
        {showReviewActions && extractionId && (
          <ReviewActionButtons
            extractionId={extractionId}
            currentStatus={reviewStatus}
            onStatusChange={handleReviewStatusChange}
            onStartReview={handleStartReview}
            onApprove={handleApprove}
            onReject={handleReject}
            onNeedsCorrection={handleNeedsCorrection}
            isEditing={isEditing}
            onToggleEdit={onToggleEdit}
            hasPendingCorrections={hasPendingCorrections}
            onSaveCorrections={onSaveCorrections}
            onDataChange={onDataChange}
          />
        )}
        </HeaderRight>
      </Header>
      
      <ResultsContent style={{ flex: 1 }}>
        {viewMode === 'hierarchical' && (
          <HierarchicalResultsViewer
            results={extractionResults.results}
            confidenceScores={extractionResults.confidence_scores}
            showConfidenceScores={extractionResults?.confidence_scores && typeof extractionResults.confidence_scores === 'object' && Object.keys(extractionResults.confidence_scores).length > 0}
            showSourceLocations={true}
            isEditing={isEditing}
            onFieldValueChange={onFieldValueChange}
            onFieldEdit={onFieldValueChange ? (fieldPath) => console.log('Field edit:', fieldPath) : undefined}
            onFieldSave={onFieldSave}
            onFieldCancel={onFieldCancel}
            disabled={!isEditing}
            templateSettings={templateSettings}
            showLowConfidenceFlags={showLowConfidenceFlags}
            onLowConfidenceFieldClick={onLowConfidenceFieldClick}
          />
        )}
        {viewMode === 'table' && (
          <TableViewer
            results={extractionResults.results}
            confidenceScores={extractionResults.confidence_scores}
            showConfidenceScores={extractionResults?.confidence_scores && typeof extractionResults.confidence_scores === 'object' && Object.keys(extractionResults.confidence_scores).length > 0}
          />
        )}
        {viewMode === 'cards' && (
          <CardsViewer
            results={extractionResults.results}
            confidenceScores={extractionResults.confidence_scores}
            showConfidenceScores={extractionResults?.confidence_scores && typeof extractionResults.confidence_scores === 'object' && Object.keys(extractionResults.confidence_scores).length > 0}
            showSourceLocations={false}
          />
        )}
        {viewMode === 'json' && (
          <JsonViewer>
            {JSON.stringify(extractionResults.results, null, 2)}
          </JsonViewer>
        )}
      </ResultsContent>
    </div>
  );
};

export default ExtractionResultsPanel;
