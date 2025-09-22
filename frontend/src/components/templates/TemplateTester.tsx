import React, { useState } from 'react';
import styled from 'styled-components';
import { useMutation } from 'react-query';
import { TemplateService, DocumentService, serviceFactory } from '../../services/api/index';

interface TemplateTesterProps {
  templateId: string;
  templateName: string;
  onClose: () => void;
}

const TesterOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: ${props => props.theme.zIndex.modal};
`;

const TesterModal = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e9ecef;
  
  h2 {
    margin: 0;
    color: #2c3e50;
    font-size: 1.5rem;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6c757d;
  padding: 0.5rem;
  border-radius: 4px;
  
  &:hover {
    background: #f8f9fa;
    color: #495057;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #495057;
  }
  
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
    min-height: 150px;
    resize: vertical;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    
    &:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }
  }
`;

const TestButton = styled.button`
  background: #3498db;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 1.5rem;
  
  &:hover {
    background: #2980b9;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ResultsSection = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
`;

const ResultsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  
  h3 {
    margin: 0;
    color: #2c3e50;
    font-size: 1.25rem;
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  background: ${props => {
    switch (props.status) {
      case 'success': return '#d4edda';
      case 'error': return '#f8d7da';
      default: return '#fff3cd';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'success': return '#155724';
      case 'error': return '#721c24';
      default: return '#856404';
    }
  }};
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
`;

const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ResultCard = styled.div`
  background: white;
  border-radius: 6px;
  padding: 1rem;
  border: 1px solid #e9ecef;
  
  h4 {
    margin: 0 0 0.5rem 0;
    color: #495057;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const ResultValue = styled.div`
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  color: #2c3e50;
  word-break: break-all;
`;

const ExtractedData = styled.div`
  background: white;
  border-radius: 6px;
  padding: 1rem;
  border: 1px solid #e9ecef;
  margin-top: 1rem;
  
  h4 {
    margin: 0 0 0.5rem 0;
    color: #495057;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const DataItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f3f4;
  
  &:last-child {
    border-bottom: none;
  }
  
  .field-name {
    font-weight: 600;
    color: #495057;
  }
  
  .field-value {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
    color: #2c3e50;
    max-width: 60%;
    word-break: break-all;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem;
  color: #6c757d;
`;

const ErrorMessage = styled.div`
  color: #e74c3c;
  background: #fdf2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const TemplateTester: React.FC<TemplateTesterProps> = ({ templateId, templateName, onClose }) => {
  const [testDocument, setTestDocument] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testMutation = useMutation({
    mutationFn: (documentText: string) => {
      const templateService = serviceFactory.get<TemplateService>('templates');
      return templateService.testTemplate(templateId, documentText);
    },
    onSuccess: (data) => {
      setTestResults(data);
      setError(null);
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to test template');
      setTestResults(null);
    },
  });

  const handleTest = async () => {
    if (!testDocument.trim()) {
      setError('Please enter some test document content');
      return;
    }

    setIsTesting(true);
    setError(null);
    
    try {
      await testMutation.mutateAsync(testDocument);
    } finally {
      setIsTesting(false);
    }
  };

  const handleClose = () => {
    setTestDocument('');
    setTestResults(null);
    setError(null);
    onClose();
  };

  return (
    <TesterOverlay onClick={handleClose}>
      <TesterModal onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h2>Test Template: {templateName}</h2>
          <CloseButton onClick={handleClose}>&times;</CloseButton>
        </ModalHeader>

        <FormGroup>
          <label>Test Document Content</label>
          <textarea
            value={testDocument}
            onChange={(e) => setTestDocument(e.target.value)}
            placeholder="Paste or type sample document content to test the template..."
          />
        </FormGroup>

        <TestButton onClick={handleTest} disabled={isTesting || !testDocument.trim()}>
          {isTesting ? 'Testing...' : 'Test Template'}
        </TestButton>

        {error && (
          <ErrorMessage>{error}</ErrorMessage>
        )}

        {isTesting && (
          <LoadingSpinner>Testing template with AI...</LoadingSpinner>
        )}

        {testResults && (
          <ResultsSection>
            <ResultsHeader>
              <h3>Test Results</h3>
              <StatusBadge status={testResults.status}>
                {testResults.status === 'success' ? 'Success' : 'Completed'}
              </StatusBadge>
            </ResultsHeader>

            <ResultsGrid>
              <ResultCard>
                <h4>Confidence Score</h4>
                <ResultValue>{(testResults.confidence_score * 100).toFixed(1)}%</ResultValue>
              </ResultCard>
              
              <ResultCard>
                <h4>Processing Time</h4>
                <ResultValue>{testResults.processing_time_ms}ms</ResultValue>
              </ResultCard>
              
              <ResultCard>
                <h4>Message</h4>
                <ResultValue>{testResults.message}</ResultValue>
              </ResultCard>
              
              <ResultCard>
                <h4>Note</h4>
                <ResultValue>{testResults.note}</ResultValue>
              </ResultCard>
            </ResultsGrid>

            {testResults.extracted_data && Object.keys(testResults.extracted_data).length > 0 && (
              <ExtractedData>
                <h4>Extracted Data</h4>
                {Object.entries(testResults.extracted_data).map(([fieldName, fieldValue]) => (
                  <DataItem key={fieldName}>
                    <span className="field-name">{fieldName}</span>
                    <span className="field-value">
                      {typeof fieldValue === 'object' 
                        ? JSON.stringify(fieldValue, null, 2)
                        : String(fieldValue)
                      }
                    </span>
                  </DataItem>
                ))}
              </ExtractedData>
            )}
          </ResultsSection>
        )}
      </TesterModal>
    </TesterOverlay>
  );
};

export default TemplateTester;

