/**
 * Extraction Results Modal
 * Three-panel layout: Schema | Document Preview | Results
 */
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useQuery } from 'react-query';
import { 
  X, 
  Download, 
  FileText, 
  Eye,
  Code,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { apiClient } from '../../services/api';

// Styled Components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 95%;
  height: 95%;
  max-width: 1400px;
  max-height: 900px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatusBadge = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  ${props => {
    switch (props.status) {
      case 'completed':
        return `
          background: #d1fae5;
          color: #065f46;
        `;
      case 'failed':
        return `
          background: #fee2e2;
          color: #991b1b;
        `;
      case 'processing':
        return `
          background: #dbeafe;
          color: #1e40af;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
        `;
    }
  }}
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
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
  
  &:hover {
    background: #2563eb;
  }
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #e5e7eb;
    color: #374151;
  }
`;

const ModalBody = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 0;
  min-height: 0;
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e5e7eb;
  min-height: 0;
  
  &:last-child {
    border-right: none;
  }
`;

const PanelHeader = styled.div`
  padding: 1rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PanelTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CollapseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 0.25rem;
  
  &:hover {
    background: #e5e7eb;
  }
`;

const PanelContent = styled.div<{ collapsed?: boolean }>`
  flex: 1;
  overflow-y: auto;
  ${props => props.collapsed && 'display: none;'}
`;

// Schema Panel Components
const SchemaSection = styled.div`
  padding: 1rem;
`;

const SchemaField = styled.div`
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  margin-bottom: 0.5rem;
  background: white;
`;

const FieldName = styled.div`
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
`;

const FieldType = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
`;

const FieldDescription = styled.div`
  font-size: 0.75rem;
  color: #9ca3af;
`;

const RequiredBadge = styled.span`
  background: #fef3c7;
  color: #92400e;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 500;
  margin-left: 0.5rem;
`;

// Document Preview Panel Components
const DocumentPreview = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const DocumentImage = styled.img`
  max-width: 100%;
  height: auto;
  min-height: 400px;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  background: white;
  display: block;
`;

const DocumentText = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 1rem;
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
  height: 100%;
  overflow-y: auto;
  word-wrap: break-word;
`;

const DocumentIcon = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #9ca3af;
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 0.375rem;
`;

// Results Panel Components
const ResultsTabs = styled.div`
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
`;

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  background: ${props => props.active ? 'white' : 'transparent'};
  color: ${props => props.active ? '#1f2937' : '#6b7280'};
  font-size: 0.875rem;
  font-weight: ${props => props.active ? '600' : '500'};
  cursor: pointer;
  border-bottom: 2px solid ${props => props.active ? '#3b82f6' : 'transparent'};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    background: ${props => props.active ? 'white' : '#f3f4f6'};
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
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #6b7280;
`;

const ErrorState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #ef4444;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 0.375rem;
  margin: 1rem;
`;

interface ExtractionResultsModalProps {
  extractionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ExtractionResultsModal: React.FC<ExtractionResultsModalProps> = ({
  extractionId,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'formatted' | 'raw'>('raw');
  const [collapsedPanels, setCollapsedPanels] = useState<{
    schema: boolean;
    document: boolean;
    results: boolean;
  }>({
    schema: false,
    document: false,
    results: false
  });

  // Fetch extraction details
  const { 
    data: extraction, 
    isLoading: extractionLoading, 
    error: extractionError 
  } = useQuery(
    ['extraction', extractionId],
    () => apiClient.getExtraction(extractionId),
    {
      enabled: isOpen && !!extractionId
    }
  );

  // Fetch template details
  const { 
    data: template, 
    isLoading: templateLoading 
  } = useQuery(
    ['template', extraction?.template_id],
    () => apiClient.getTemplate(extraction!.template_id),
    {
      enabled: isOpen && !!extraction?.template_id
    }
  );

  // Fetch document content
  const { 
    data: documentContent, 
    isLoading: documentLoading 
  } = useQuery(
    ['document-content', extraction?.document_id],
    () => apiClient.getDocumentContent(extraction!.document_id),
    {
      enabled: isOpen && !!extraction?.document_id
    }
  );

  // Fetch document preview
  const { 
    data: documentPreview, 
    isLoading: previewLoading 
  } = useQuery(
    ['document-preview', extraction?.document_id],
    () => apiClient.getDocumentPreview(extraction!.document_id),
    {
      enabled: isOpen && !!extraction?.document_id
    }
  );

  const togglePanel = (panel: keyof typeof collapsedPanels) => {
    setCollapsedPanels(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }));
  };

  const handleExportJson = () => {
    if (!extraction?.results) return;
    
    const dataStr = JSON.stringify(extraction.results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extraction-${extractionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <HeaderLeft>
            <HeaderTitle>
              <Eye size={20} />
              Extraction Results
            </HeaderTitle>
            {extraction && (
              <StatusBadge status={extraction.status}>
                {extraction.status}
              </StatusBadge>
            )}
          </HeaderLeft>
          
          <HeaderRight>
            {extraction?.results && (
              <ExportButton onClick={handleExportJson}>
                <Download size={16} />
                Export JSON
              </ExportButton>
            )}
            <CloseButton onClick={onClose}>
              <X size={16} />
            </CloseButton>
          </HeaderRight>
        </ModalHeader>

        <ModalBody>
          {/* Schema Panel */}
          <Panel>
            <PanelHeader>
              <PanelTitle>
                <Settings size={16} />
                Schema
              </PanelTitle>
              <CollapseButton onClick={() => togglePanel('schema')}>
                {collapsedPanels.schema ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </CollapseButton>
            </PanelHeader>
            
            <PanelContent collapsed={collapsedPanels.schema}>
              {templateLoading ? (
                <LoadingState>Loading schema...</LoadingState>
              ) : template?.schema ? (
                <SchemaSection>
                  {Object.entries(template.schema).map(([fieldId, fieldDef]: [string, any]) => (
                    <SchemaField key={fieldId}>
                      <FieldName>
                        {fieldDef.name || fieldId}
                        {fieldDef.required && <RequiredBadge>Required</RequiredBadge>}
                      </FieldName>
                      <FieldType>Type: {fieldDef.type || 'text'}</FieldType>
                      {fieldDef.description && (
                        <FieldDescription>{fieldDef.description}</FieldDescription>
                      )}
                    </SchemaField>
                  ))}
                </SchemaSection>
              ) : (
                <ErrorState>No schema available</ErrorState>
              )}
            </PanelContent>
          </Panel>

          {/* Document Preview Panel */}
          <Panel>
            <PanelHeader>
              <PanelTitle>
                <FileText size={16} />
                Document Preview
              </PanelTitle>
              <CollapseButton onClick={() => togglePanel('document')}>
                {collapsedPanels.document ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </CollapseButton>
            </PanelHeader>
            
            <PanelContent collapsed={collapsedPanels.document}>
              {documentLoading || previewLoading ? (
                <LoadingState>Loading document...</LoadingState>
              ) : documentPreview?.has_preview && documentPreview.preview_url ? (
                <DocumentPreview>
                  <DocumentImage 
                    src={documentPreview.preview_url} 
                    alt={`Preview of ${documentPreview.filename}`}
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                      if (nextElement) {
                        nextElement.style.display = 'flex';
                      }
                    }}
                  />
                  <DocumentIcon style={{ display: 'none' }}>
                    <FileText size={48} />
                    <div>Preview Unavailable</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                      {documentPreview.filename}
                    </div>
                  </DocumentIcon>
                </DocumentPreview>
              ) : documentContent ? (
                <DocumentPreview>
                  <DocumentText>{documentContent.content}</DocumentText>
                </DocumentPreview>
              ) : (
                <DocumentIcon>
                  <FileText size={48} />
                  <div>Preview Unavailable</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    {documentPreview?.filename || 'Document'}
                  </div>
                </DocumentIcon>
              )}
            </PanelContent>
          </Panel>

          {/* Results Panel */}
          <Panel>
            <PanelHeader>
              <PanelTitle>
                <Code size={16} />
                Extract Results
              </PanelTitle>
              <CollapseButton onClick={() => togglePanel('results')}>
                {collapsedPanels.results ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </CollapseButton>
            </PanelHeader>
            
            <PanelContent collapsed={collapsedPanels.results}>
              {extractionLoading ? (
                <LoadingState>Loading results...</LoadingState>
              ) : extraction?.results ? (
                <>
                  <ResultsTabs>
                    <Tab 
                      active={activeTab === 'formatted'} 
                      onClick={() => setActiveTab('formatted')}
                    >
                      <Eye size={16} />
                      Extract Result
                    </Tab>
                    <Tab 
                      active={activeTab === 'raw'} 
                      onClick={() => setActiveTab('raw')}
                    >
                      <Code size={16} />
                      Raw JSON Result
                    </Tab>
                  </ResultsTabs>
                  
                  <ResultsContent>
                    {activeTab === 'formatted' ? (
                      <FormattedResults>
                        {Object.entries(extraction.results).map(([key, value]) => (
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
                        {JSON.stringify(extraction.results, null, 2)}
                      </JsonViewer>
                    )}
                  </ResultsContent>
                </>
              ) : extraction?.error_message ? (
                <ErrorState>
                  <div>Extraction Failed</div>
                  <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    {extraction.error_message}
                  </div>
                </ErrorState>
              ) : (
                <ErrorState>No results available</ErrorState>
              )}
            </PanelContent>
          </Panel>
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};

export default ExtractionResultsModal;
