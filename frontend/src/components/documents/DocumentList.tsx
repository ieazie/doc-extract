/**
 * Simple document list component
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { apiClient, Document, DocumentListResponse, Category } from '../../services/api';


const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.text.primary};
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
`;

const SearchInput = styled.input`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  font-size: 1rem;
  min-width: 300px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}30;
  }
`;

const DocumentGrid = styled.div`
  display: grid;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const DocumentCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: ${props => props.theme.shadows.sm};
  border: 1px solid ${props => props.theme.colors.border};
  transition: all 0.2s ease;

  &:hover {
    box-shadow: ${props => props.theme.shadows.md};
    border-color: ${props => props.theme.colors.primary};
  }
`;

const DocumentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
`;

const DocumentTitle = styled.h3`
  color: ${props => props.theme.colors.text.primary};
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  flex: 1;
  word-break: break-word;
`;

const StatusBadge = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  
  ${props => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'completed': return props.theme.colors.success;
        case 'processing': return props.theme.colors.warning;
        case 'failed': return props.theme.colors.error;
        default: return props.theme.colors.neutral;
      }
    };
    
    const color = getStatusColor(props.status);
    return `
      background: ${color}15;
      color: ${color};
      border: 1px solid ${color}30;
    `;
  }}
`;

const DocumentMeta = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: ${props => props.theme.colors.text.secondary};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
`;

const CategoryBadge = styled.span<{ color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  background: ${props => `${props.color}15`};
  color: ${props => props.color};
  border: 1px solid ${props => `${props.color}30`};
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const Tag = styled.span`
  background: ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text.secondary};
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
`;

const DocumentActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.2s ease;

  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: ${props.theme.colors.primary};
          color: white;
          border-color: ${props.theme.colors.primary};
          &:hover { background: ${props.theme.colors.primaryHover}; }
        `;
      case 'danger':
        return `
          background: ${props.theme.colors.error};
          color: white;
          border-color: ${props.theme.colors.error};
          &:hover { background: ${props.theme.colors.error}dd; }
        `;
      default:
        return `
          background: ${props.theme.colors.surface};
          color: ${props.theme.colors.text.secondary};
          border-color: ${props.theme.colors.border};
          &:hover { background: ${props.theme.colors.surfaceHover}; }
        `;
    }
  }}
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${props => props.theme.colors.text.muted};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${props => props.theme.colors.text.muted};
`;

const ErrorState = styled.div`
  background: ${props => props.theme.colors.error}15;
  border: 1px solid ${props => props.theme.colors.error}30;
  color: ${props => props.theme.colors.error};
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 2rem;
`;

interface DocumentListProps {
  categories?: Category[];
  onDocumentClick?: (document: Document) => void;
  onDocumentDelete?: (documentId: string) => void;
  refreshTrigger?: number;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  categories = [],
  onDocumentClick,
  onDocumentDelete,
  refreshTrigger = 0
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');


  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params: any = {
        page: 1,
        per_page: 20,
        sort_by: 'created_at',
        sort_order: 'desc'
      };

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await apiClient.getDocuments(params);
      setDocuments(response.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      loadDocuments();
    }
  }, [refreshTrigger, loadDocuments]);

  const handleDocumentDownload = async (documentId: string) => {
    try {
      const url = await apiClient.getDocumentDownloadUrl(documentId);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleDocumentDelete = async (documentId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      await apiClient.deleteDocument(documentId);
      onDocumentDelete?.(documentId);
      loadDocuments();
    } catch (err) {
      alert('Failed to delete document');
    }
  };



  const renderStatusBadge = (status: string, extractionStatus: string) => {
    const displayStatus = extractionStatus === 'failed' ? 'failed' : 
                         extractionStatus === 'processing' ? 'processing' : 
                         extractionStatus === 'completed' ? 'completed' : status;
    
    return (
      <StatusBadge status={displayStatus}>
        {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
      </StatusBadge>
    );
  };

  return (
    <Container>
      <Header>
        <Title>Documents</Title>
        <SearchInput
          type="text"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Header>

      {error && (
        <ErrorState>
          <strong>Error:</strong> {error}
        </ErrorState>
      )}

      {loading ? (
        <LoadingState>
          <div>⏳ Loading documents...</div>
        </LoadingState>
      ) : documents.length === 0 ? (
        <EmptyState>
          <div>📄 No documents found</div>
          <p>Upload your first document to get started</p>
        </EmptyState>
      ) : (
        <DocumentGrid>
          {documents.map((document) => (
            <DocumentCard key={document.id}>
              <DocumentHeader>
                <DocumentTitle 
                  onClick={() => onDocumentClick?.(document)}
                  style={{ cursor: onDocumentClick ? 'pointer' : 'default' }}
                >
                  {document.original_filename}
                </DocumentTitle>
                {renderStatusBadge(document.status, document.extraction_status)}
              </DocumentHeader>

              <DocumentMeta>
                <div>Size: {apiClient.formatFileSize(document.file_size)}</div>
                <div>Uploaded: {apiClient.formatDate(document.created_at)}</div>
                <div>Type: {document.document_type || 'Unknown'}</div>
                {document.detected_language && (
                  <div>
                    Language: {document.detected_language}
                    {document.language_confidence && (
                      <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        {' '}({(document.language_confidence * 100).toFixed(0)}% confidence)
                      </span>
                    )}
                  </div>
                )}
              </DocumentMeta>

              {document.page_count && (
                <DocumentMeta>
                  <div>Pages: {document.page_count}</div>
                  <div>Words: {document.word_count?.toLocaleString() || 'N/A'}</div>
                  <div>Characters: {document.character_count?.toLocaleString() || 'N/A'}</div>
                </DocumentMeta>
              )}

              <div>
                {document.category && (
                  <CategoryBadge color={document.category.color}>
                    {document.category.name}
                  </CategoryBadge>
                )}

                {document.tags.length > 0 && (
                  <TagsContainer>
                    {document.tags.map((tag, index) => (
                      <Tag key={index}>{tag}</Tag>
                    ))}
                  </TagsContainer>
                )}
              </div>

              <DocumentActions>
                <ActionButton
                  onClick={() => handleDocumentDownload(document.id)}
                >
                  ⬇️ Download
                </ActionButton>
                <ActionButton
                  variant="danger"
                  onClick={() => handleDocumentDelete(document.id, document.original_filename)}
                >
                  🗑️ Delete
                </ActionButton>
              </DocumentActions>
            </DocumentCard>
          ))}
        </DocumentGrid>
      )}


    </Container>
  );
};

export default DocumentList;