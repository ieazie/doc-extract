import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from 'react-query';
import styled from 'styled-components';
import { Settings, FileText, Play, Save, Eye, Upload, Download } from 'lucide-react';

// import { Template } from '../../types/templates'; // Template type not available
import { Document } from '../../services/api';
import { apiClient } from '../../services/api';
import TemplateBuilder from '../../components/templates/TemplateBuilder';
import DocumentViewer from '../../components/templates/DocumentViewer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import NotificationDialog from '../../components/common/NotificationDialog';
import ExtractionResultsPanel from '../../components/extractions/ExtractionResultsPanel';

// Default prompt templates for each document type
const DEFAULT_PROMPTS = {
  invoice: "Extract invoice number, invoice date, due date, vendor name, vendor address, line items (description, quantity, unit price, total), subtotal, tax amount, total amount, payment terms, and any additional notes.",
  receipt: "Extract receipt number, transaction date, merchant name, merchant address, items purchased (description, quantity, price), subtotal, tax amount, total amount, payment method, and any loyalty information.",
  contract: "Extract contract number, contract date, effective date, parties involved, contract value, payment terms, duration, key clauses, signatures, and any special conditions.",
  insurance_policy: "Extract policy number, policy holder name, policy type, coverage amount, premium amount, effective date, expiration date, beneficiaries, and key terms and conditions.",
  other: "Extract key information from this document based on its content and structure."
};

// Styled components
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8fafc;
`;

const TabsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 2rem;
`;

const Tabs = styled.div`
  display: flex;
  gap: 0;
`;

const TabsActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

const Tab = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border: none;
  background: none;
  color: ${props => props.$active ? '#3b82f6' : '#6b7280'};
  font-weight: ${props => props.$active ? '600' : '500'};
  cursor: pointer;
  border-bottom: 2px solid ${props => props.$active ? '#3b82f6' : 'transparent'};
  transition: all 0.2s ease;

  &:hover {
    color: ${props => props.$active ? '#3b82f6' : '#374151'};
  }
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: 1px solid ${props => props.$variant === 'primary' ? '#3b82f6' : '#d1d5db'};
  background: ${props => props.$variant === 'primary' ? '#3b82f6' : 'white'};
  color: ${props => props.$variant === 'primary' ? 'white' : '#374151'};
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.$variant === 'primary' ? '#2563eb' : '#f9fafb'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  min-height: 0;
`;

const LeftPanel = styled.div`
  width: 25%;
  background: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
`;

const MiddlePanel = styled.div<{ $hasRightPanel?: boolean }>`
  width: ${props => props.$hasRightPanel ? '50%' : '75%'};
  background: white;
  border-right: ${props => props.$hasRightPanel ? '1px solid #e5e7eb' : 'none'};
  display: flex;
  flex-direction: column;
`;

const RightPanel = styled.div`
  width: 25%;
  background: white;
  display: flex;
  flex-direction: column;
`;

const PanelHeader = styled.div`
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
`;

const PanelContent = styled.div`
  flex: 1;
  padding: 0;
  overflow: auto;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  text-align: center;
`;

const TemplateBuilderPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();
  
  const isEditMode = !!id;
  
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [templateData, setTemplateData] = useState<Partial<any>>({
    name: '',
    description: '',
    document_type: 'manual',
    schema: { fields: [] },
    status: 'draft',
    extraction_settings: {
      max_chunk_size: 4000,
      extraction_passes: 1,
      confidence_threshold: 0.7
    }
  });
  
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [extractionResults, setExtractionResults] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Notification dialog state
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

  // Fetch template data in edit mode
  const { data: template, isLoading, error, refetch } = useQuery(
    ['template', id],
    () => apiClient.getTemplate(id as string),
    {
      enabled: isEditMode && !!id,
      staleTime: 0,
      refetchOnMount: true,
      retry: 3,
      retryDelay: 1000,
    }
  );

  // Update template data when template is loaded
  useEffect(() => {
    if (template && isEditMode) {
      console.log('Loading template data:', template);
      setTemplateData({
        id: template.id,
        name: template.name || '',
        description: (template as any).description || '',
        document_type: template.document_type_name || 'invoice',
        schema: { 
          fields: Object.entries(template.schema || {}).map(([name, fieldDef]) => ({
            id: `field_${Date.now()}_${Math.random()}`,
            name,
            type: fieldDef.type, // Backend now uses 'text' instead of 'string'
            required: fieldDef.required || false,
            description: fieldDef.description || ''
          }))
        },
        status: (template as any).status || 'draft'
      });
      
      // Load test document if it exists
      if ((template as any).test_document_id) {
        console.log('Template has test_document_id:', (template as any).test_document_id);
        console.log('Loading test document...');
        loadTestDocument((template as any).test_document_id);
      } else {
        console.log('Template has no test_document_id');
      }
    }
  }, [template, isEditMode]);

  // Generate prompt when document type changes (except for manual)
  useEffect(() => {
    if (templateData.document_type && templateData.document_type !== 'manual') {
      const defaultPrompt = DEFAULT_PROMPTS[templateData.document_type as keyof typeof DEFAULT_PROMPTS];
      if (defaultPrompt && !templateData.description) {
        setTemplateData(prev => ({
          ...prev,
          description: defaultPrompt
        }));
      }
    }
  }, [templateData.document_type]);

  const loadTestDocument = async (documentId: string) => {
    try {
      const document = await apiClient.getDocument(documentId);
      console.log('Loaded test document:', document);
      setSelectedDocument(document);
    } catch (error) {
      console.error('Failed to load test document:', error);
    }
  };

  // Check if basic information is complete
  const isBasicInfoComplete = !!(templateData.name && (templateData.description || templateData.document_type === 'manual'));
  
  // Check if template is complete for draft saving
  const isDraftReady = isBasicInfoComplete;
  
  // Check if template is complete for publishing
  const isTemplateComplete = isBasicInfoComplete && 
    templateData.schema?.fields && 
    Array.isArray(templateData.schema.fields) && 
    templateData.schema.fields.length > 0;

  // Validation for extraction
  const canExtract = isTemplateComplete && selectedDocument?.id;
  
  const getValidationMessage = () => {
    if (!isBasicInfoComplete) return 'Please complete basic information';
    if (!templateData.schema?.fields?.length) return 'Please define at least one schema field';
    if (!selectedDocument?.id) return 'Please upload a document';
    return null;
  };

  const handleSaveTemplate = async (status: 'draft' | 'published') => {
    if (!isDraftReady) {
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Incomplete Template',
        message: 'Please complete all required fields before saving'
      });
      return;
    }

    try {
      setIsAutoSaving(true);
      
      const schemaFields = (templateData.schema?.fields || [])
        .filter((field: any) => field.name && field.name.trim());
      
      const schema = Object.fromEntries(
        schemaFields.map((field: any) => {
          const fieldDef: any = {
            type: field.type, // AI service now returns backend-compatible types
            required: field.required || false,
            description: field.description || ''
          };
          
          // Add required nested properties for complex types
          if (field.type === 'array' && field.items) {
            fieldDef.items = field.items;
          } else if (field.type === 'object' && field.fields) {
            fieldDef.fields = field.fields;
          }
          
          return [field.name.trim(), fieldDef];
        })
      );
      
      // Ensure schema is not empty
      if (Object.keys(schema).length === 0) {
        throw new Error('Schema cannot be empty. Please add at least one field.');
      }
      
      const backendTemplateData = {
        name: templateData.name,
        description: templateData.description,
        document_type_id: undefined,
        schema: schema,
        prompt_config: {
          system_prompt: `Extract data from ${templateData.document_type} documents according to the specified schema.`,
          instructions: templateData.description || 'Extract the specified fields from the document.',
          output_format: 'json'
        },
        extraction_settings: templateData.extraction_settings || {
          max_chunk_size: 4000,
          extraction_passes: 1,
          confidence_threshold: 0.7
        },
        few_shot_examples: [],
        status: status
      };

      if (isEditMode && templateData.id) {
        // Update existing template
        await apiClient.updateTemplate(templateData.id, backendTemplateData);
        setNotification({
          isOpen: true,
          type: 'success',
          title: 'Template Updated',
          message: `Template has been ${status === 'draft' ? 'saved as draft' : 'published'} successfully`
        });
      } else {
        // Create new template
        const createdTemplate = await apiClient.createTemplate(backendTemplateData);
        setTemplateData((prev: any) => ({ ...prev, id: createdTemplate.id }));
        setNotification({
          isOpen: true,
          type: 'success',
          title: 'Template Created',
          message: `Template has been ${status === 'draft' ? 'saved as draft' : 'published'} successfully`
        });
      }

      // Invalidate templates query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      
    } catch (error: any) {
      console.error('Failed to save template:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: error?.message || 'Failed to save template. Please try again.'
      });
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleTestExtraction = async () => {
    if (!canExtract) {
      const message = getValidationMessage();
      setNotification({
        isOpen: true,
        type: 'warning',
        title: 'Cannot Extract',
        message: message || 'Please complete all requirements'
      });
      return;
    }

    if (!(templateData.schema?.fields && Array.isArray(templateData.schema.fields) && templateData.schema.fields.length > 0)) {
      setNotification({
        isOpen: true,
        type: 'warning',
        title: 'No Schema Defined',
        message: 'Please define at least one schema field before running extraction'
      });
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);
    setExtractionResults(null);

    try {
      // First, we need to save the template if it's not saved yet
      let templateId = templateData.id;
      if (!templateId) {
        // Save as draft first
        const backendTemplateData = {
          name: templateData.name,
          description: templateData.description,
          document_type_id: undefined,
          schema: Object.fromEntries(
            (templateData.schema?.fields || []).map((field: any) => [
              field.name,
              {
                type: field.type === 'string' ? 'text' : field.type,
                required: field.required || false,
                description: field.description || '',
                validation: null,
                items: null,
                fields: null
              }
            ])
          ),
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
          status: 'draft'
        };

        const createdTemplate = await apiClient.createTemplate(backendTemplateData);
        templateId = createdTemplate.id;
        
        // Update template data with the ID
        setTemplateData((prev: any) => ({ ...prev, id: templateId }));
      }

      // Debug: Check selectedDocument and templateId
      console.log('Selected Document:', selectedDocument);
      console.log('Selected Document ID:', selectedDocument?.id);
      console.log('Template ID:', templateId);
      
      if (!selectedDocument?.id) {
        setNotification({
          isOpen: true,
          type: 'error',
          title: 'No Document Selected',
          message: 'Please upload a document before running extraction'
        });
        setIsExtracting(false);
        return;
      }
      
      if (!templateId) {
        setNotification({
          isOpen: true,
          type: 'error',
          title: 'No Template ID',
          message: 'Template ID is missing. Please try again.'
        });
        setIsExtracting(false);
        return;
      }

      // Create extraction using real API
      const extraction = await apiClient.createExtraction({
        document_id: selectedDocument.id,
        template_id: templateId
      });
      
      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Extraction Started',
        message: 'Document extraction has been initiated. Results will appear shortly.'
      });

      // Poll for extraction completion
      const pollExtraction = async () => {
        try {
          const result = await apiClient.getExtraction(extraction.id);
          
          if (result.status === 'completed') {
            setExtractionResults({
              id: result.id,
              status: result.status,
              results: result.results,
              confidence_score: result.confidence_score,
              processing_time_ms: result.processing_time_ms,
              created_at: result.created_at
            });
            setIsExtracting(false);
          } else if (result.status === 'error' || result.status === 'failed') {
            const errorMsg = typeof result.error_message === 'string' 
              ? result.error_message 
              : JSON.stringify(result.error_message) || 'Extraction failed';
            setExtractionError(errorMsg);
            setIsExtracting(false);
          } else {
            // Still processing, poll again in 2 seconds
            setTimeout(pollExtraction, 2000);
          }
        } catch (error: any) {
          console.error('Failed to poll extraction:', error);
          console.log('Error type:', typeof error);
          console.log('Error structure:', error);
          const errorMsg = typeof error === 'string' 
            ? error 
            : error?.message || JSON.stringify(error) || 'Failed to get extraction results';
          setExtractionError(errorMsg);
          setIsExtracting(false);
        }
      };

      // Start polling
      setTimeout(pollExtraction, 2000);
      
    } catch (error: any) {
      console.error('Extraction failed:', error);
      console.log('Error type:', typeof error);
      console.log('Error structure:', error);
      
      let errorMessage = 'Failed to start extraction. Please try again.';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail) && detail.length > 0) {
          // Handle Pydantic validation errors
          const validationErrors = detail.map(err => {
            if (err.msg && err.loc) {
              const field = Array.isArray(err.loc) ? err.loc.join('.') : err.loc;
              return `${field}: ${err.msg}`;
            }
            return err.msg || 'Validation error';
          }).join(', ');
          errorMessage = `Validation error: ${validationErrors}`;
        } else {
          errorMessage = JSON.stringify(detail);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Extraction Failed',
        message: errorMessage
      });
      setIsExtracting(false);
    }
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validate file type
      if (!file.type.includes('pdf') && !file.type.includes('document') && !file.type.includes('text')) {
        setNotification({
          isOpen: true,
          type: 'error',
          title: 'Invalid File Type',
          message: 'Please upload a PDF, DOCX, or TXT file'
        });
        return;
      }

      // Validate file size (20MB limit)
      if (file.size > 20 * 1024 * 1024) {
        setNotification({
          isOpen: true,
          type: 'error',
          title: 'File Too Large',
          message: 'File size must be less than 20MB'
        });
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      // Upload document immediately
      console.log('=== UPLOADING DOCUMENT ===');
      console.log('File:', file);
      const uploadedDocument = await apiClient.uploadTestDocument(file, {
        onUploadProgress: (progress) => {
          setUploadProgress(progress);
        }
      });
      console.log('Upload API response:', uploadedDocument);

      // Create document object with the uploaded document data
      const documentWithFile: Document & { file: File } = {
        id: uploadedDocument.id,
        tenant_id: uploadedDocument.tenant_id,
        original_filename: uploadedDocument.original_filename,
        file_size: uploadedDocument.file_size,
        mime_type: uploadedDocument.mime_type || file.type,
        document_type: uploadedDocument.document_type,
        category: uploadedDocument.category,
        created_at: uploadedDocument.created_at,
        updated_at: uploadedDocument.updated_at,
        tags: uploadedDocument.tags || [],
        status: uploadedDocument.status || 'active',
        extraction_status: uploadedDocument.extraction_status || 'pending',
        has_thumbnail: uploadedDocument.has_thumbnail || false,
        is_test_document: uploadedDocument.is_test_document || true,
        file: file // Keep the original file for preview
      };
      console.log('Created documentWithFile:', documentWithFile);
      
      console.log('Setting selectedDocument:', documentWithFile);
      setSelectedDocument(documentWithFile);
      
      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Document Uploaded',
        message: 'Document uploaded successfully and ready for extraction'
      });
      
    } catch (error: any) {
      console.error('Failed to upload document:', error);
      
      let errorMessage = 'Failed to upload document. Please try again.';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Upload Failed',
        message: errorMessage
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Loading states
  if (isEditMode && isLoading) {
    return (
      <PageContainer>
        <LoadingContainer>
          <LoadingSpinner size={24} text="Loading template..." />
          <button 
            onClick={() => refetch()} 
            style={{ 
              marginTop: '1rem', 
              padding: '0.5rem 1rem', 
              background: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Retry Loading
          </button>
        </LoadingContainer>
      </PageContainer>
    );
  }

  if (isEditMode && error) {
    return (
      <PageContainer>
        <ErrorContainer>
          <div>
            <h3>Error Loading Template</h3>
            <p>Failed to load template. Please try again.</p>
            <p>Template ID: {id}</p>
            <p>Error: {(error as any)?.message || 'Unknown error occurred'}</p>
            <button onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </ErrorContainer>
      </PageContainer>
    );
  }

  if (isEditMode && !template) {
    return (
      <PageContainer>
        <ErrorContainer>
          <div>
            <h3>Template Not Found</h3>
            <p>The requested template could not be found.</p>
            <p>Template ID: {id}</p>
            <button onClick={() => window.location.reload()}>
              Retry
            </button>
            <button onClick={() => router.push('/templates')}>
              Back to Templates
            </button>
          </div>
        </ErrorContainer>
      </PageContainer>
    );
  }

  // Check if template data is loaded but templateData is still empty (race condition)
  if (isEditMode && template && !templateData.name) {
    return (
      <PageContainer>
        <LoadingContainer>
          <LoadingSpinner size={24} text="Loading template data..." />
        </LoadingContainer>
      </PageContainer>
    );
  }

  // Check if template is published (not editable)
  if (isEditMode && (template as any)?.status === 'published') {
    return (
      <PageContainer>
        <ErrorContainer>
          <div>
            <h3>Template Cannot Be Edited</h3>
            <p>Published templates cannot be edited to maintain data integrity.</p>
            <button onClick={() => router.push('/templates')}>
              Back to Templates
            </button>
          </div>
        </ErrorContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <TabsContainer>
        <Tabs>
          <Tab $active={true}>
            <Settings size={16} />
            <span>Template Builder</span>
          </Tab>
        </Tabs>
        
        <TabsActions>
          {isAutoSaving && (
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Auto-saving...
            </span>
          )}
          <ActionButton 
            onClick={() => {
              if (!canExtract) {
                const message = getValidationMessage();
                setNotification({
                  isOpen: true,
                  type: 'warning',
                  title: 'Cannot Extract',
                  message: message || 'Please complete all requirements'
                });
                return;
              }
              handleTestExtraction();
            }}
            disabled={isExtracting || !canExtract}
            title={!canExtract ? getValidationMessage() || 'Complete template and upload document' : 'Run extraction'}
          >
            <Play size={16} />
            <span>Run Extract</span>
          </ActionButton>
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
        <LeftPanel>
          <PanelHeader>
            <PanelTitle>Configuration</PanelTitle>
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

        <MiddlePanel $hasRightPanel={isExtracting || !!extractionResults}>
          <PanelHeader>
            <PanelTitle>Document Preview</PanelTitle>
          </PanelHeader>
              
              <PanelContent>
                {isUploading ? (
                  <div style={{ 
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '300px',
                    background: 'white',
                    margin: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <LoadingSpinner size={32} />
                    <h3 style={{ margin: '1rem 0 0.5rem 0', color: '#374151' }}>Uploading Document...</h3>
                    <p style={{ margin: '0 0 1rem 0', color: '#6b7280' }}>
                      {uploadProgress}% complete
                    </p>
                    <div style={{ 
                      width: '100%', 
                      height: '4px', 
                      background: '#e5e7eb', 
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${uploadProgress}%`, 
                        height: '100%', 
                        background: '#3b82f6',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                ) : selectedDocument ? (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    height: '100%',
                    background: 'white',
                    margin: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      padding: '1rem 1.5rem', 
                      borderBottom: '1px solid #e5e7eb',
                      background: '#f9fafb'
                    }}>
                      <div>
                        <h3 style={{ margin: '0 0 0.25rem 0', color: '#374151' }}>
                          {selectedDocument.original_filename}
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                          {selectedDocument.file_size ? `${(selectedDocument.file_size / 1024).toFixed(1)} KB` : 'Unknown size'} • {selectedDocument.mime_type || 'Unknown type'}
                        </p>
                      </div>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <DocumentViewer document={selectedDocument} />
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: '#fafafa',
                    border: '2px dashed #d1d5db',
                    borderRadius: '0.5rem',
                    margin: '1rem'
                  }}
                  onClick={() => document.getElementById('document-upload')?.click()}
                  >
                    <Upload size={48} style={{ color: '#9ca3af', marginBottom: '1rem' }} />
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>Upload Document</h3>
                    <p style={{ margin: '0 0 1rem 0', color: '#6b7280', textAlign: 'center' }}>
                      Click here or drag and drop a document to upload
                    </p>
                    <input
                      id="document-upload"
                      type="file"
                      accept=".pdf,.txt,.doc,.docx"
                      onChange={handleDocumentUpload}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}
              </PanelContent>
            </MiddlePanel>

            {(isExtracting || extractionResults) && (
              <RightPanel>
                <PanelHeader>
                  <PanelTitle>Extraction Results</PanelTitle>
                </PanelHeader>
                <PanelContent style={{ padding: 0 }}>
                  <ExtractionResultsPanel
                    extractionResults={extractionResults}
                    isExtracting={isExtracting}
                    extractionError={extractionError}
                    size="small"
                    showExportButton={false}
                  />
                </PanelContent>
              </RightPanel>
            )}

      </MainContent>
      
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
    </PageContainer>
  );
};

export default TemplateBuilderPage;
