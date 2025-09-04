/**
 * New Template Builder Page
 * Integrated template creation with document preview and extraction testing
 */
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { useQueryClient } from 'react-query';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Play, 
  FileText, 
  Settings,
  Download,
  Upload
} from 'lucide-react';

import { apiClient } from '../../services/api';
import DocumentViewer from '../../components/templates/DocumentViewer';
import TemplateBuilder from '../../components/templates/TemplateBuilder';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorMessage } from '../../components/common/ErrorMessage';

// Styled Components
const PageContainer = styled.div`
  min-height: 100vh;
  background: #f9fafb;
`;

const Header = styled.div`
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background: #e5e7eb;
  }
`;

const HeaderTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  letter-spacing: -0.025em;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
  
  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
  
  span {
    white-space: nowrap;
  }
  
  ${props => props.$variant === 'primary' ? `
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
    
    &:hover {
      background: #2563eb;
      border-color: #2563eb;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
  ` : `
    background: white;
    color: #374151;
    
    &:hover {
      background: #f9fafb;
      border-color: #9ca3af;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
  `}
`;

const TabsContainer = styled.div`
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 2rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Tabs = styled.div`
  display: flex;
  gap: 0;
`;

const TabsActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Tab = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border: none;
  background: transparent;
  color: #6b7280;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  position: relative;
  
  ${props => props.$active && `
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  `}
  
  &:hover {
    color: #374151;
    background: #f9fafb;
  }
  
  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
  
  span {
    white-space: nowrap;
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  min-height: 0;
`;

const LeftPanel = styled.div`
  width: 400px;
  background: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
`;

const RightPanel = styled.div`
  flex: 1;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
`;

const PanelHeader = styled.div`
  padding: 1rem 1.5rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PanelTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
`;

const PanelContent = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const UploadArea = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  margin: 1rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #3b82f6;
    background: #f8fafc;
  }
`;

const UploadIcon = styled(Upload)`
  width: 3rem;
  height: 3rem;
  color: #9ca3af;
  margin-bottom: 1rem;
`;

const UploadText = styled.div`
  text-align: center;
  color: #6b7280;
  
  .primary {
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  
  .secondary {
    font-size: 0.875rem;
  }
`;

const DocumentInfo = styled.div`
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DocumentName = styled.div`
  font-weight: 500;
  color: #374151;
`;

const DocumentActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const RemoveButton = styled.button`
  padding: 0.25rem;
  border: none;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 0.25rem;
  cursor: pointer;
  
  &:hover {
    background: #fecaca;
  }
`;

const StatusBadge = styled.span<{ $status: 'draft' | 'published' | 'archived' }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  
  ${props => {
    switch (props.$status) {
      case 'draft':
        return `
          background: #fef3c7;
          color: #92400e;
        `;
      case 'published':
        return `
          background: #d1fae5;
          color: #065f46;
        `;
      case 'archived':
        return `
          background: #f3f4f6;
          color: #6b7280;
        `;
    }
  }}
`;

const ExtractResultsPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const LoadingContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 1rem;
`;

const LoadingText = styled.div`
  color: #6b7280;
  font-size: 1rem;
`;

const ErrorContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const ResultsContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ResultsTabs = styled.div`
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
`;

const ResultsTab = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 2px solid ${props => props.$active ? '#3b82f6' : 'transparent'};
  background: ${props => props.$active ? 'white' : 'transparent'};
  color: ${props => props.$active ? '#3b82f6' : '#6b7280'};
  font-weight: ${props => props.$active ? '500' : '400'};
  
  &:hover {
    background: ${props => props.$active ? 'white' : '#f3f4f6'};
  }
`;

const ResultsContent = styled.div`
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  
  pre {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    padding: 1rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    color: #334155;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
  }
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  color: #6b7280;
`;

const EmptyText = styled.div`
  font-size: 1.125rem;
  font-weight: 500;
  color: #374151;
`;

const EmptySubtext = styled.div`
  font-size: 0.875rem;
  text-align: center;
  max-width: 300px;
`;

// Types
interface SchemaField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  children?: SchemaField[];
  expanded?: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
  document_type: string;
  schema: {
    fields: SchemaField[];
  };
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

interface Document {
  id: string;
  filename: string;
  file_size: number;
  content_type: string;
  upload_date: string;
}

const NewTemplatePage: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'schema' | 'results'>('schema');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [templateData, setTemplateData] = useState<Partial<Template>>({
    name: '',
    description: '',
    document_type: 'invoice',
    schema: { fields: [] },
    status: 'draft'
  });
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [extractionResults, setExtractionResults] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Check if basic information is complete
  const isBasicInfoComplete = templateData.name && 
    templateData.description && 
    templateData.document_type;

  // Check if template is ready for draft save (requires all fields + at least one schema field)
  const isDraftReady = isBasicInfoComplete && 
    templateData.schema?.fields && 
    Array.isArray(templateData.schema.fields) &&
    templateData.schema.fields.length > 0;

  // Check if template is complete (same as draft ready for now)
  const isTemplateComplete = isDraftReady;

  // Auto-save functionality
  useEffect(() => {
    if (templateData.name || (templateData.schema?.fields && Array.isArray(templateData.schema.fields) && templateData.schema.fields.length > 0)) {
      const timeoutId = setTimeout(() => {
        handleAutoSave();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [templateData]);

  const handleAutoSave = async () => {
    if (!templateData.name && !(templateData.schema?.fields && Array.isArray(templateData.schema.fields) && templateData.schema.fields.length > 0)) return;
    
    setIsAutoSaving(true);
    try {
      // TODO: Implement auto-save API call
      console.log('Auto-saving template:', templateData);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validate file type
      if (!file.type.includes('pdf') && !file.type.includes('document') && !file.type.includes('text')) {
        alert('Please upload a PDF, DOCX, or TXT file');
        return;
      }

      // Create document object with the actual file
      const documentWithFile: Document & { file: File } = {
        id: `doc_${Date.now()}`,
        filename: file.name,
        file_size: file.size,
        content_type: file.type,
        upload_date: new Date().toISOString(),
        file: file
      };
      
      setSelectedDocument(documentWithFile);
      console.log('Document uploaded:', documentWithFile);
    } catch (error) {
      console.error('Failed to upload document:', error);
    }
  };

  const handleSaveTemplate = async (status: 'draft' | 'published' = 'draft') => {
    try {
      // Validation for Save Draft (same as Publish for now)
      if (status === 'draft') {
        if (!isTemplateComplete) {
          const missingFields = [];
          if (!templateData.name) missingFields.push('Template Name');
          if (!templateData.description) missingFields.push('Extraction Prompt');
          if (!templateData.document_type) missingFields.push('Document Type');
          if (!(templateData.schema?.fields && Array.isArray(templateData.schema.fields) && templateData.schema.fields.length > 0)) missingFields.push('Schema Fields');
          
          alert(`Cannot save as draft. Missing required fields: ${missingFields.join(', ')}`);
          return;
        }
      }
      
      // Validation for Publish
      if (status === 'published') {
        if (!isTemplateComplete) {
          const missingFields = [];
          if (!templateData.name) missingFields.push('Template Name');
          if (!templateData.description) missingFields.push('Description');
          if (!templateData.document_type) missingFields.push('Document Type');
          if (!(templateData.schema?.fields && Array.isArray(templateData.schema.fields) && templateData.schema.fields.length > 0)) missingFields.push('Schema Fields');
          
          alert(`Cannot publish template. Missing required fields: ${missingFields.join(', ')}`);
          return;
        }
      }

      // Transform frontend template data to backend API format
      // Convert SchemaField array to backend field dictionary format
      const schemaFields: Record<string, any> = {};
      
      // Ensure we have schema fields to transform
      if (!templateData.schema?.fields || !Array.isArray(templateData.schema.fields) || templateData.schema.fields.length === 0) {
        throw new Error('No schema fields found to transform');
      }
      
      templateData.schema.fields.forEach(field => {
        if (!field.name || !field.type) {
          throw new Error(`Invalid field: missing name or type for field ${JSON.stringify(field)}`);
        }
        
        // Map frontend types to backend types
        let backendType = field.type;
        if (field.type === 'string') {
          backendType = 'text';
        } else if (field.type === 'boolean') {
          // Backend doesn't support boolean, convert to text
          backendType = 'text';
        }
        
        schemaFields[field.name] = {
          type: backendType,
          required: field.required || false,
          description: field.description || '',
          validation: null,
          items: null,
          fields: null
        };
      });

      const backendTemplateData = {
        name: templateData.name,
        description: templateData.description,
        document_type_id: null, // We'll use document_type string for now
        schema: schemaFields,
        prompt_config: {
          system_prompt: `Extract data from ${templateData.document_type} documents according to the specified schema.`,
          instructions: templateData.description || 'Extract the specified fields from the document.',
          output_format: 'json'
        },
        extraction_settings: {
          max_chunk_size: 4000,
          extraction_passes: 1,
          confidence_threshold: 0.8
        },
        few_shot_examples: [],
        status: status
      };



      // Create template via API
      const createdTemplate = await apiClient.createTemplate(backendTemplateData);
      console.log('Template created successfully:', createdTemplate);
      
      // Invalidate templates cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      
      // Show success message
      alert(`Template ${status === 'draft' ? 'saved as draft' : 'published'} successfully!`);
      
      // Redirect to templates list
      router.push('/templates');
    } catch (error: any) {
      console.error('Failed to save template:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to save template. Please try again.';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleTestExtraction = async () => {
    if (!selectedDocument || !(templateData.schema?.fields && Array.isArray(templateData.schema.fields) && templateData.schema.fields.length > 0)) {
      alert('Please upload a document and define a schema first');
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);
    setExtractionResults(null);

    try {
      // TODO: Implement actual extraction API call
      // For now, create realistic mock extraction results based on schema
      const generateMockData = () => {
        const data: any = {};
        
        // Generate data based on the defined schema fields
        templateData.schema?.fields?.forEach((field: SchemaField) => {
          switch (field.name.toLowerCase()) {
            case 'invoice number':
            case 'receipt number':
            case 'document id':
              data[field.name.replace(/\s+/g, '_').toLowerCase()] = selectedDocument.filename.replace('.pdf', '').replace('.txt', '');
              break;
            case 'invoice date':
            case 'date':
              data[field.name.replace(/\s+/g, '_').toLowerCase()] = new Date().toISOString().split('T')[0];
              break;
            case 'due date':
              data[field.name.replace(/\s+/g, '_').toLowerCase()] = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              break;
            case 'total amount':
            case 'amount':
              data[field.name.replace(/\s+/g, '_').toLowerCase()] = Math.round((Math.random() * 1000 + 100) * 100) / 100;
              break;
            case 'merchant name':
            case 'vendor name':
              data[field.name.replace(/\s+/g, '_').toLowerCase()] = 'Sample Merchant Inc.';
              break;
            case 'customer name':
            case 'bill to':
              data[field.name.replace(/\s+/g, '_').toLowerCase()] = 'John Doe';
              break;
            case 'payment method':
              data[field.name.replace(/\s+/g, '_').toLowerCase()] = 'Credit Card';
              break;
            default:
              // Generate generic data based on field type
              if (field.type === 'string') {
                data[field.name.replace(/\s+/g, '_').toLowerCase()] = `Sample ${field.name}`;
              } else if (field.type === 'number') {
                data[field.name.replace(/\s+/g, '_').toLowerCase()] = Math.round(Math.random() * 1000);
              } else if (field.type === 'date') {
                data[field.name.replace(/\s+/g, '_').toLowerCase()] = new Date().toISOString().split('T')[0];
              } else if (field.type === 'boolean') {
                data[field.name.replace(/\s+/g, '_').toLowerCase()] = Math.random() > 0.5;
              }
          }
        });
        
        return data;
      };

      const mockResults = {
        run_id: `run_${Date.now()}`,
        extraction_agent_id: `agent_${Date.now()}`,
        confidence_score: Math.round((Math.random() * 0.3 + 0.7) * 100) / 100, // 70-100% confidence
        processing_time_ms: Math.round(Math.random() * 2000 + 1000), // 1-3 seconds
        data: generateMockData()
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setExtractionResults(mockResults);
      setActiveTab('results'); // Switch to results tab
      
    } catch (error) {
      console.error('Test extraction failed:', error);
      setExtractionError('Failed to extract data from document');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <PageContainer>
      <TabsContainer>
        <Tabs>
          <Tab 
            $active={activeTab === 'schema'} 
            onClick={() => setActiveTab('schema')}
          >
            <Settings size={16} />
            <span>Schema</span>
          </Tab>
          <Tab 
            $active={activeTab === 'results'} 
            onClick={() => setActiveTab('results')}
          >
            <FileText size={16} />
            <span>Extract Results</span>
          </Tab>
        </Tabs>
        
        <TabsActions>
          {isAutoSaving && (
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Auto-saving...
            </span>
          )}
          {selectedDocument && activeTab === 'schema' && (
            <ActionButton onClick={handleTestExtraction} disabled={isExtracting}>
              {isExtracting ? (
                <>
                  <LoadingSpinner size={16} text="" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Run Extract</span>
                </>
              )}
            </ActionButton>
          )}
          <ActionButton 
            onClick={() => handleSaveTemplate('draft')}
            disabled={!isDraftReady}
          >
            <Save size={16} />
            <span>Save Draft</span>
          </ActionButton>
          <ActionButton 
            $variant="primary" 
            onClick={() => handleSaveTemplate('published')}
            disabled={!isTemplateComplete}
          >
            <Eye size={16} />
            <span>Publish</span>
          </ActionButton>
        </TabsActions>
      </TabsContainer>

      <MainContent>
        {activeTab === 'schema' ? (
          <>
            <LeftPanel>
              <PanelHeader>
                <PanelTitle>Template Configuration</PanelTitle>
              </PanelHeader>
              <PanelContent>
                <TemplateBuilder
                  templateData={templateData}
                  onTemplateChange={setTemplateData}
                  selectedDocument={selectedDocument}
                  isBasicInfoComplete={isBasicInfoComplete}
                />
              </PanelContent>
            </LeftPanel>

            <RightPanel>
              <PanelHeader>
                <PanelTitle>Document Preview</PanelTitle>
              </PanelHeader>
              
              <PanelContent>
                {selectedDocument ? (
                  <>
                    <DocumentInfo>
                      <DocumentName>{selectedDocument.filename}</DocumentName>
                      <DocumentActions>
                        <RemoveButton onClick={() => setSelectedDocument(null)}>
                          ×
                        </RemoveButton>
                      </DocumentActions>
                    </DocumentInfo>
                    <DocumentViewer document={selectedDocument} />
                  </>
                ) : (
                  <UploadArea onClick={() => document.getElementById('file-upload')?.click()}>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={handleDocumentUpload}
                      style={{ display: 'none' }}
                    />
                    <UploadIcon />
                    <UploadText>
                      <div className="primary">Upload Document</div>
                      <div className="secondary">
                        Drag and drop a PDF, DOCX, or TXT file here, or click to select
                      </div>
                    </UploadText>
                  </UploadArea>
                )}
              </PanelContent>
            </RightPanel>
          </>
        ) : (
          <ExtractResultsPanel>
            <PanelHeader>
              <PanelTitle>Extract Results</PanelTitle>
              {extractionResults && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Confidence: {Math.round((extractionResults.confidence_score || 0) * 100)}% | 
                    Time: {extractionResults.processing_time_ms || 0}ms
                  </div>
                  <ActionButton onClick={() => {
                    const dataStr = JSON.stringify(extractionResults, null, 2);
                    const dataBlob = new Blob([dataStr], {type: 'application/json'});
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'extraction-results.json';
                    link.click();
                    URL.revokeObjectURL(url);
                  }}>
                    <Download size={16} />
                    <span>Export</span>
                  </ActionButton>
                </div>
              )}
            </PanelHeader>
            
            <PanelContent>
              {isExtracting ? (
                <LoadingContainer>
                  <LoadingSpinner size={32} />
                  <LoadingText>Extracting data from document...</LoadingText>
                </LoadingContainer>
              ) : extractionError ? (
                <ErrorContainer>
                  <ErrorMessage message={extractionError} />
                </ErrorContainer>
              ) : extractionResults ? (
                <ResultsContainer>
                  <ResultsTabs>
                    <ResultsTab $active={true}>
                      <FileText size={16} />
                      <span>Raw JSON Result</span>
                    </ResultsTab>
                  </ResultsTabs>
                  <ResultsContent>
                    <pre>{JSON.stringify(extractionResults, null, 2)}</pre>
                  </ResultsContent>
                </ResultsContainer>
              ) : (
                <EmptyState>
                  <FileText size={48} />
                  <EmptyText>No extraction results yet</EmptyText>
                  <EmptySubtext>Upload a document and run extraction to see results</EmptySubtext>
                </EmptyState>
              )}
            </PanelContent>
          </ExtractResultsPanel>
        )}
      </MainContent>
    </PageContainer>
  );
};

export default NewTemplatePage;
