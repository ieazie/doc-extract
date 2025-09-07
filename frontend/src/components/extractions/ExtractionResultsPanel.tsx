/**
 * Extraction Results Panel
 * Reusable component for displaying extraction results
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { 
  Download, 
  FileText, 
  Eye,
  Code
} from 'lucide-react';

import LoadingSpinner from '../common/LoadingSpinner';

// Styled Components
const ResultsTabs = styled.div`
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  flex-shrink: 0;
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  background: ${props => props.$active ? 'white' : 'transparent'};
  color: ${props => props.$active ? '#1f2937' : '#6b7280'};
  font-size: 0.875rem;
  font-weight: ${props => props.$active ? '600' : '500'};
  cursor: pointer;
  border-bottom: 2px solid ${props => props.$active ? '#3b82f6' : 'transparent'};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    background: ${props => props.$active ? 'white' : '#f3f4f6'};
  }
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
}

export const ExtractionResultsPanel: React.FC<ExtractionResultsPanelProps> = ({
  extractionResults,
  isExtracting = false,
  extractionError = null,
  size = 'medium',
  showExportButton = true,
  onExport
}) => {
  const [activeTab, setActiveTab] = useState<'formatted' | 'raw'>('formatted');

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
        <p style={{ margin: 0, fontSize: '0.875rem' }}>{extractionError}</p>
      </ErrorState>
    );
  }

  // No results state
  if (!extractionResults?.results) {
    return (
      <EmptyState>
        <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <h3 style={{ margin: '0 0 0.5rem 0' }}>No Extraction Results</h3>
        <p style={{ margin: 0 }}>
          Run an extraction to see results here
        </p>
      </EmptyState>
    );
  }

  // Results state
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {showExportButton && (
        <ExportButton onClick={handleExportJson}>
          <Download size={16} />
          Export JSON
        </ExportButton>
      )}
      
      <ResultsTabs>
        <Tab 
          $active={activeTab === 'formatted'} 
          onClick={() => setActiveTab('formatted')}
        >
          <Eye size={16} />
          Extract Result
        </Tab>
        <Tab 
          $active={activeTab === 'raw'} 
          onClick={() => setActiveTab('raw')}
        >
          <Code size={16} />
          Raw JSON Result
        </Tab>
      </ResultsTabs>
      
      <ResultsContent style={{ flex: 1 }}>
        {activeTab === 'formatted' ? (
          <FormattedResults>
            {Object.entries(extractionResults.results).map(([key, value]) => (
              <ResultField key={key}>
                <ResultFieldName>{key}</ResultFieldName>
                <ResultFieldValue>
                  {typeof value === 'object' 
                    ? JSON.stringify(value, null, 2)
                    : String(value)
                  }
                </ResultFieldValue>
              </ResultField>
            ))}
          </FormattedResults>
        ) : (
          <JsonViewer>
            {JSON.stringify(extractionResults.results, null, 2)}
          </JsonViewer>
        )}
      </ResultsContent>
    </div>
  );
};

export default ExtractionResultsPanel;
