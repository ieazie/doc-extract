/**
 * Modal for starting document extractions
 */
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { X, Play, FileText, Zap } from 'lucide-react';

import { apiClient } from '../../services/api';

// Styled Components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
`;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  padding: 1.5rem;
`;

const DocumentInfo = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

const DocumentName = styled.div`
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
`;

const DocumentMeta = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  display: flex;
  gap: 1rem;
`;

const TemplateSection = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1rem 0;
`;

const TemplateGrid = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const TemplateCard = styled.div<{ selected: boolean }>`
  border: 2px solid ${props => props.selected ? '#3b82f6' : '#e5e7eb'};
  border-radius: 0.375rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.selected ? '#eff6ff' : 'white'};
  
  &:hover {
    border-color: ${props => props.selected ? '#3b82f6' : '#d1d5db'};
  }
`;

const TemplateName = styled.div`
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
`;

const TemplateDescription = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
`;

const TemplateSchema = styled.div`
  font-size: 0.75rem;
  color: #9ca3af;
  font-family: monospace;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #6b7280;
`;

const ErrorState = styled.div`
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 1rem;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
  
  ${props => {
    if (props.variant === 'primary') {
      return `
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
        &:hover:not(:disabled) {
          background: #2563eb;
        }
        &:disabled {
          background: #9ca3af;
          border-color: #9ca3af;
          cursor: not-allowed;
        }
      `;
    }
    return `
      background: white;
      color: #374151;
      border-color: #d1d5db;
      &:hover {
        background: #f9fafb;
      }
    `;
  }}
`;

interface StartExtractionModalProps {
  document: {
    id: string;
    original_filename: string;
    file_size: number;
    mime_type?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const StartExtractionModal: React.FC<StartExtractionModalProps> = ({
  document,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch available templates
  const { 
    data: templatesData, 
    isLoading: templatesLoading, 
    error: templatesError 
  } = useQuery(
    ['templates', { isActive: true }],
    () => apiClient.getTemplates(1, 100, undefined, undefined, true),
    {
      enabled: isOpen
    }
  );

  // Create extraction mutation
  const createExtractionMutation = useMutation(
    (data: { document_id: string; template_id: string }) => 
      apiClient.createExtraction(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['extractions']);
        onSuccess?.();
        onClose();
      }
    }
  );

  const handleStartExtraction = () => {
    if (!selectedTemplateId) return;
    
    createExtractionMutation.mutate({
      document_id: document.id,
      template_id: selectedTemplateId
    });
  };

  const templates = templatesData?.templates || [];

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <Zap size={20} />
            Start Extraction
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <X size={16} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <DocumentInfo>
            <DocumentName>
              <FileText size={16} style={{ marginRight: '0.5rem', display: 'inline' }} />
              {document.original_filename}
            </DocumentName>
            <DocumentMeta>
              <span>Size: {apiClient.formatFileSize(document.file_size)}</span>
              <span>Type: {document.mime_type || 'Unknown'}</span>
            </DocumentMeta>
          </DocumentInfo>

          <TemplateSection>
            <SectionTitle>Select Template</SectionTitle>
            
            {templatesLoading ? (
              <LoadingState>
                <div>Loading templates...</div>
              </LoadingState>
            ) : templatesError ? (
              <ErrorState>
                Failed to load templates. Please try again.
              </ErrorState>
            ) : templates.length === 0 ? (
              <ErrorState>
                No active templates found. Please create a template first.
              </ErrorState>
            ) : (
              <TemplateGrid>
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    selected={selectedTemplateId === template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <TemplateName>{template.name}</TemplateName>
                    <TemplateDescription>
                      {template.document_type_name || 'Generic template'}
                    </TemplateDescription>
                    <TemplateSchema>
                      {Object.keys(template.schema).length} fields defined
                    </TemplateSchema>
                  </TemplateCard>
                ))}
              </TemplateGrid>
            )}
          </TemplateSection>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleStartExtraction}
            disabled={!selectedTemplateId || createExtractionMutation.isLoading}
          >
            <Play size={16} />
            {createExtractionMutation.isLoading ? 'Starting...' : 'Start Extraction'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

export default StartExtractionModal;