/**
 * Simple document list component
 */
import React, { useState, useEffect, useCallback } from 'react';
import { DocumentService, CategoryService, serviceFactory, Document, DocumentListResponse, Category } from '../../services/api/index';
import { formatFileSize, formatDate } from '../../utils/apiUtils';
import {
  Container,
  Header,
  Title,
  SearchInput,
  DocumentGrid,
  DocumentCard,
  DocumentHeader,
  DocumentTitle,
  StatusBadge,
  DocumentMeta,
  CategoryBadge,
  TagsContainer,
  Tag,
  DocumentActions,
  ActionButton,
  LoadingState,
  EmptyState,
  ErrorState,
  LanguageConfidenceText
} from './DocumentList.styled';



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
      const documentService = serviceFactory.get<DocumentService>('documents');
      const params: any = {
        page: 1,
        per_page: 20,
        sort_by: 'created_at',
        sort_order: 'desc'
      };

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await documentService.getDocuments({ page: params.page, per_page: params.per_page, search: params.search, sort_by: params.sort_by, sort_order: params.sort_order });
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
      const documentService = serviceFactory.get<DocumentService>('documents');
      const url = await documentService.getDocumentDownloadUrl(documentId);
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
      const documentService = serviceFactory.get<DocumentService>('documents');
      await documentService.deleteDocument(documentId);
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
                <div>Size: {formatFileSize(document.file_size)}</div>
                <div>Uploaded: {formatDate(document.created_at)}</div>
                <div>Type: {document.document_type || 'Unknown'}</div>
                {document.detected_language && (
                  <div>
                    Language: {document.detected_language}
                    {document.language_confidence && (
                      <LanguageConfidenceText>
                        {' '}({(document.language_confidence * 100).toFixed(0)}% confidence)
                      </LanguageConfidenceText>
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