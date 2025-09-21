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
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Globe,
  AlertCircle
} from 'lucide-react';

import { ExtractionService, DocumentService, TemplateService, serviceFactory } from '@/services/api/index';
import { SourceLocationProvider } from './SourceLocationContext';
import { ExtractionResultsPanel } from './ExtractionResultsPanel';
import FlaggedFieldIndicator from './FlaggedFieldIndicator';
import { detectLowConfidenceFields, ConfidenceField } from '@/utils/confidenceDetection';

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
  z-index: ${props => props.theme.zIndex.modal};
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 98%;
  height: 95%;
  max-width: 1600px;
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
  grid-template-columns: 25% 35% 40%;
  gap: 0;
  min-height: 0;
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e5e7eb;
  min-height: 0;
  overflow: hidden;
  
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

const PanelHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PanelHeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

const StatusBadge = styled.div<{ status: string }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  
  ${props => {
    switch (props.status) {
      case 'pending':
        return `
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        `;
      case 'in_review':
        return `
          background-color: #dbeafe;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        `;
      case 'approved':
        return `
          background-color: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        `;
      case 'rejected':
        return `
          background-color: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        `;
      case 'needs_correction':
        return `
          background-color: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        `;
      default:
        return `
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        `;
    }
  }}
`;

const LanguageValidationInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 1rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
`;

const LanguageInfo = styled.div<{ $match: boolean; $warning: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: ${props => 
    props.$warning ? '#d97706' : 
    props.$match ? '#059669' : '#6b7280'
  };
`;

const LanguageCode = styled.span`
  font-weight: 600;
  text-transform: uppercase;
`;

const LanguageConfidence = styled.span`
  font-size: 0.625rem;
  color: #6b7280;
`;

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock size={12} />;
    case 'in_review':
      return <Eye size={12} />;
    case 'approved':
      return <CheckCircle size={12} />;
    case 'rejected':
      return <XCircle size={12} />;
    case 'needs_correction':
      return <AlertTriangle size={12} />;
    default:
      return <Clock size={12} />;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Pending Review';
    case 'in_review':
      return 'In Review';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'needs_correction':
      return 'Needs Correction';
    default:
      return 'Pending Review';
  }
};

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

const Tab = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>`
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

// Language Validation Info Component
const LanguageValidationInfoComponent: React.FC<{ template: any; document: any }> = ({ template, document }) => {
  if (!template || !document) return null;

  const templateLanguage = template.language || 'en';
  const documentLanguage = document.detected_language;
  const documentConfidence = document.language_confidence;
  const requireMatch = template.require_language_match;
  const autoDetect = template.auto_detect_language;

  // Check for language match
  const exactMatch = templateLanguage === documentLanguage;
  const baseMatch = templateLanguage.split('-')[0] === documentLanguage?.split('-')[0];
  const languageMatch = exactMatch || baseMatch;

  // Determine if there's a warning
  const hasWarning = requireMatch && documentLanguage && !languageMatch;

  return (
    <LanguageValidationInfo>
      <Globe size={12} />
      <LanguageInfo $match={languageMatch} $warning={hasWarning}>
        <LanguageCode>{templateLanguage}</LanguageCode>
        {documentLanguage && (
          <>
            <span>→</span>
            <LanguageCode>{documentLanguage}</LanguageCode>
            {documentConfidence && (
              <LanguageConfidence>
                ({(documentConfidence * 100).toFixed(0)}%)
              </LanguageConfidence>
            )}
          </>
        )}
        {hasWarning && <AlertCircle size={12} />}
      </LanguageInfo>
    </LanguageValidationInfo>
  );
};

const ExtractionResultsModalContent: React.FC<ExtractionResultsModalProps> = ({
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
  
  // Field editing state
  const [isEditing, setIsEditing] = useState(false);
  const [pendingCorrections, setPendingCorrections] = useState<Record<string, any>>({});
  const [hasPendingCorrections, setHasPendingCorrections] = useState(false);
  
  // Review status state - initialize from extraction data
  const [reviewStatus, setReviewStatus] = useState<'pending' | 'in_review' | 'approved' | 'rejected' | 'needs_correction'>('pending');
  
  // Flagged fields state
  const [flaggedFields, setFlaggedFields] = useState<ConfidenceField[]>([]);
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());

  // Fetch extraction details
  const { 
    data: extraction, 
    isLoading: extractionLoading, 
    error: extractionError 
  } = useQuery(
    ['extraction', extractionId],
    () => {
      console.log('Fetching extraction with ID:', extractionId);
      const extractionService = serviceFactory.get<ExtractionService>('extractions');
      return extractionService.getExtraction(extractionId);
    },
    {
      enabled: isOpen && !!extractionId,
      onSuccess: (data) => {
        console.log('Extraction loaded successfully:', data);
        console.log('Extraction results:', data?.results);
        console.log('Extraction status:', data?.status);
      },
      onError: (error) => {
        console.error('Failed to load extraction:', error);
      }
    }
  );

  // Fetch template details
  const { 
    data: template, 
    isLoading: templateLoading,
    error: templateError
  } = useQuery(
    ['template', extraction?.template_id],
    () => {
      const templateService = serviceFactory.get<TemplateService>('templates');
      return templateService.getTemplate(extraction!.template_id);
    },
    {
      enabled: isOpen && !!extraction?.template_id,
      onError: (error) => {
        console.error('Failed to load template:', error);
      }
    }
  );

  // Fetch document details (for language info)
  const { 
    data: documentData, 
    isLoading: documentLoading,
    error: documentError
  } = useQuery(
    ['document', extraction?.document_id],
    () => {
      console.log('Fetching document for ID:', extraction?.document_id);
      const documentService = serviceFactory.get<DocumentService>('documents');
      return documentService.getDocument(extraction!.document_id);
    },
    {
      enabled: isOpen && !!extraction?.document_id,
      onError: (error) => {
        console.error('Failed to load document:', error);
      }
    }
  );

  // Fetch document content
  const { 
    data: documentContent, 
    isLoading: documentContentLoading,
    error: documentContentError
  } = useQuery(
    ['document-content', extraction?.document_id],
    () => {
      const documentService = serviceFactory.get<DocumentService>('documents');
      return documentService.getDocumentContent(extraction!.document_id);
    },
    {
      enabled: isOpen && !!extraction?.document_id,
      onError: (error) => {
        console.error('Failed to load document content:', error);
      },
      // Handle 404 as success (document content might not exist)
      retry: (failureCount, error: any) => {
        if (error?.status === 404 || error?.name === 'NotFoundError') {
          return false; // Don't retry 404 errors
        }
        return failureCount < 3; // Retry other errors up to 3 times
      }
    }
  );

  // Fetch document preview
  const { 
    data: documentPreview, 
    isLoading: previewLoading,
    error: documentPreviewError
  } = useQuery(
    ['document-preview', extraction?.document_id],
    () => {
      const documentService = serviceFactory.get<DocumentService>('documents');
      return documentService.getDocumentPreview(extraction!.document_id);
    },
    {
      enabled: isOpen && !!extraction?.document_id,
      onSuccess: (data) => {
        // Document preview loaded successfully
      },
      onError: (error) => {
        console.error('Failed to load document preview:', error);
      }
    }
  );

  // Fetch document preview image as blob
  const { 
    data: previewImageUrl, 
    isLoading: imageLoading 
  } = useQuery(
    ['document-preview-image', extraction?.document_id],
    async () => {
      if (!extraction?.document_id) return null;
      
      try {
        // Fetch the image as a blob with authentication
        const response = await fetch(`http://localhost:8000/api/documents/preview-image/${extraction.document_id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_tokens') ? JSON.parse(localStorage.getItem('auth_tokens')!).access_token : ''}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch preview image');
        }
        
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      } catch (error) {
        console.error('Error fetching preview image:', error);
        return null;
      }
    },
    {
      enabled: isOpen && !!extraction?.document_id && !!documentPreview?.preview_url,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  // Update review status when extraction data loads
  useEffect(() => {
    // Note: review_status is handled separately through ExtractionReview interface
    // For now, we'll use a default status
    if (extraction) {
      setReviewStatus('pending');
    }
  }, [extraction]);

  // Detect flagged fields when extraction data changes
  useEffect(() => {
    if (extraction?.results && template) {
      // Only run confidence detection if we have actual confidence scores
      const hasConfidenceData = extraction.confidence_scores && typeof extraction.confidence_scores === 'object' && Object.keys(extraction.confidence_scores).length > 0;
      
      const confidenceThreshold = template.extraction_settings?.confidence_threshold || 0.7;
      const detection = detectLowConfidenceFields(
        extraction.results, 
        extraction.confidence_scores, 
        confidenceThreshold
      );
      setFlaggedFields(detection.flaggedFields);
      // Initialize all flagged fields as visible
      setVisibleFields(new Set(detection.flaggedFields.map(field => field.path)));
    }
  }, [extraction?.results, extraction?.confidence_scores, template]);

  const togglePanel = (panel: keyof typeof collapsedPanels) => {
    setCollapsedPanels(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }));
  };

  // Field editing handlers
  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      // Clear pending corrections when stopping edit mode
      setPendingCorrections({});
      setHasPendingCorrections(false);
    }
  };

  const handleFieldValueChange = (fieldPath: string, newValue: any) => {
    setPendingCorrections(prev => ({
      ...prev,
      [fieldPath]: newValue
    }));
    setHasPendingCorrections(true);
  };

  const handleFieldSave = async (fieldPath: string, newValue: any) => {
    if (!extractionId) return;
    
    try {
      const originalValue = getNestedValue(extraction?.results, fieldPath);
      const extractionService = serviceFactory.get<ExtractionService>('extractions');
      await extractionService.correctField(extractionId, {
        field_name: fieldPath,
        corrected_value: newValue,
        reason: 'Field correction via UI'
      });
      
      // Remove from pending corrections
      setPendingCorrections(prev => {
        const newPending = { ...prev };
        delete newPending[fieldPath];
        return newPending;
      });
      
      // Check if there are still pending corrections
      const remainingPending = Object.keys(pendingCorrections).filter(key => key !== fieldPath);
      setHasPendingCorrections(remainingPending.length > 0);
      
    } catch (error) {
      console.error('Failed to save field correction:', error);
    }
  };

  const handleFieldCancel = (fieldPath: string) => {
    setPendingCorrections(prev => {
      const newPending = { ...prev };
      delete newPending[fieldPath];
      return newPending;
    });
    
    // Check if there are still pending corrections
    const remainingPending = Object.keys(pendingCorrections).filter(key => key !== fieldPath);
    setHasPendingCorrections(remainingPending.length > 0);
  };

  const handleSaveCorrections = async () => {
    if (!extractionId) return;
    
    try {
      // Save all pending corrections
      for (const [fieldPath, newValue] of Object.entries(pendingCorrections)) {
        const originalValue = getNestedValue(extraction?.results, fieldPath);
        const extractionService = serviceFactory.get<ExtractionService>('extractions');
      await extractionService.correctField(extractionId, {
          field_name: fieldPath,
          corrected_value: newValue,
          reason: 'Bulk field correction via UI'
        });
      }
      
      // Clear pending corrections
      setPendingCorrections({});
      setHasPendingCorrections(false);
      
    } catch (error) {
      console.error('Failed to save corrections:', error);
    }
  };

  // Handle review status changes
  const handleReviewStatusChange = (status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'needs_correction') => {
    setReviewStatus(status);
    console.log('Review status changed to:', status);
  };

  // Flagged field handlers
  const handleFlaggedFieldClick = (field: ConfidenceField) => {
    console.log('Flagged field clicked:', field);
    // TODO: Implement field highlighting or navigation
  };

  const handleToggleFieldVisibility = (fieldPath: string) => {
    setVisibleFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldPath)) {
        newSet.delete(fieldPath);
      } else {
        newSet.add(fieldPath);
      }
      return newSet;
    });
  };

  // Auto-routing handler
  const handleAutoRoute = async () => {
    if (!extractionId) return;
    
    try {
      const extractionService = serviceFactory.get<ExtractionService>('extractions');
      const result = await extractionService.autoRouteExtraction(extractionId);
      console.log('Auto-routing result:', result);
      
      if (result.routed) {
        // Update review status if routed
        setReviewStatus('in_review');
        // Refresh extraction data
        window.location.reload(); // Simple refresh for now
      }
    } catch (error) {
      console.error('Failed to auto-route extraction:', error);
    }
  };

  // Helper function to get nested values
  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => {
      if (key.includes('[') && key.includes(']')) {
        const fieldName = key.split('[')[0];
        const index = parseInt(key.split('[')[1].split(']')[0]);
        return current[fieldName]?.[index];
      }
      return current?.[key];
    }, obj);
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
            {template && documentData && (
              <LanguageValidationInfoComponent template={template} document={documentData} />
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
              {documentLoading || previewLoading || imageLoading ? (
                <LoadingState>Loading document...</LoadingState>
              ) : documentPreviewError || documentContentError ? (
                <ErrorState>
                  <div>Document Preview Failed</div>
                  <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    {(documentPreviewError as any)?.message || (documentContentError as any)?.message || 'Unable to load document preview'}
                  </div>
                </ErrorState>
              ) : documentPreview?.preview_url && previewImageUrl ? (
                <DocumentPreview>
                  <DocumentImage 
                    src={previewImageUrl} 
                    alt="Document preview"
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
                      Document
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
                     Document
                  </div>
                </DocumentIcon>
              )}
            </PanelContent>
          </Panel>

          {/* Results Panel */}
          <Panel>
            <PanelHeader>
              <PanelHeaderLeft>
                <PanelTitle>
                  <Code size={16} />
                  Extract Results
                </PanelTitle>
              </PanelHeaderLeft>
              <PanelHeaderRight>
                <StatusBadge status={reviewStatus}>
                  {getStatusIcon(reviewStatus)}
                  {getStatusLabel(reviewStatus)}
                </StatusBadge>
                {flaggedFields.length > 0 && reviewStatus === 'pending' && (
                  <button
                    onClick={handleAutoRoute}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#b91c1c'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#dc2626'}
                  >
                    <AlertTriangle size={16} />
                    Auto-Route to Review
                  </button>
                )}
                <CollapseButton onClick={() => togglePanel('results')}>
                  {collapsedPanels.results ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </CollapseButton>
              </PanelHeaderRight>
            </PanelHeader>
            
            <PanelContent collapsed={collapsedPanels.results}>
              {extractionLoading ? (
                <LoadingState>Loading results...</LoadingState>
              ) : extractionError ? (
                <ErrorState>
                  <div>Failed to Load Extraction</div>
                  <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    {(extractionError as any)?.message || 'Unable to load extraction data'}
                  </div>
                </ErrorState>
              ) : extraction?.results ? (
                <>
                  {flaggedFields.length > 0 && (
                    <FlaggedFieldIndicator
                      flaggedFields={flaggedFields}
                      onFieldClick={handleFlaggedFieldClick}
                      onToggleVisibility={handleToggleFieldVisibility}
                      visibleFields={visibleFields}
                    />
                  )}
                  
                  <ExtractionResultsPanel
                    extractionResults={extraction}
                    isExtracting={false}
                    extractionError={null}
                    size="large"
                    showExportButton={true}
                    onExport={handleExportJson}
                    extractionId={extractionId}
                    reviewStatus={reviewStatus}
                    showReviewActions={true}
                    onReviewStatusChange={handleReviewStatusChange}
                    isEditing={isEditing}
                    onToggleEdit={handleToggleEdit}
                    onFieldValueChange={handleFieldValueChange}
                    onFieldSave={handleFieldSave}
                    onFieldCancel={handleFieldCancel}
                    hasPendingCorrections={hasPendingCorrections}
                    onSaveCorrections={handleSaveCorrections}
                    templateSettings={template}
                    showLowConfidenceFlags={extraction?.confidence_scores && typeof extraction.confidence_scores === 'object' && Object.keys(extraction.confidence_scores).length > 0}
                    onLowConfidenceFieldClick={(field) => {
                      console.log('Low confidence field clicked:', field);
                      // TODO: Implement field highlighting or navigation
                    }}
                  />
                </>
              ) : extraction?.error_message ? (
                <ErrorState>
                  <div>Extraction Failed</div>
                  <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    {extraction.error_message}
                  </div>
                </ErrorState>
              ) : extraction ? (
                <ErrorState>
                  <div>No Results Available</div>
                  <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    {extraction.status === 'processing' ? 'Extraction is still in progress...' :
                     extraction.status === 'failed' ? 'Extraction failed to complete' :
                     'No data was extracted from this document'}
                  </div>
                  {extraction.status && (
                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#6b7280' }}>
                      Status: {extraction.status}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#6b7280' }}>
                    Debug: results is {extraction?.results ? 'present' : 'missing'}
                  </div>
                </ErrorState>
              ) : (
                <ErrorState>
                  <div>No Extraction Data</div>
                  <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    Unable to load extraction information
                  </div>
                </ErrorState>
              )}
            </PanelContent>
          </Panel>
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};

// Wrapper component with context provider
export const ExtractionResultsModal: React.FC<ExtractionResultsModalProps> = (props) => {
  return (
    <SourceLocationProvider>
      <ExtractionResultsModalContent {...props} />
    </SourceLocationProvider>
  );
};

export default ExtractionResultsModal;
