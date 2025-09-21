/**
 * Document Management Service
 * Handles all document operations including upload, processing, and retrieval
 */
import { AxiosInstance } from 'axios';
import { BaseApiClient } from '../base/BaseApiClient';
import {
  Document,
  DocumentListResponse,
  DocumentListParams,
  DocumentUploadParams,
  DocumentUpdateParams,
  DocumentUploadResponse,
  DocumentWithTracking,
  DocumentExtractionTracking,
  DocumentContent,
  DocumentPreview,
  ProcessingStats
} from './types/documents';

export class DocumentService extends BaseApiClient {
  constructor(client: AxiosInstance) {
    super(client);
  }

  // Document CRUD Operations
  async getDocuments(params?: DocumentListParams): Promise<DocumentListResponse> {
    return this.get<DocumentListResponse>('/api/documents', params);
  }

  async getDocument(documentId: string): Promise<Document> {
    return this.get<Document>(`/api/documents/${documentId}`);
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.delete<void>(`/api/documents/${documentId}`);
  }

  // Document Upload
  async uploadDocument(
    file: File,
    options: {
      document_type_id?: string;
      category_id?: string;
      tags?: string[];
      is_test_document?: boolean;
      onUploadProgress?: (progress: number) => void;
    } = {}
  ): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    if (options.document_type_id) {
      formData.append('document_type_id', options.document_type_id);
    }
    if (options.category_id) {
      formData.append('category_id', options.category_id);
    }
    if (options.tags) {
      formData.append('tags', options.tags.join(','));
    }
    if (options.is_test_document) {
      formData.append('is_test_document', 'true');
    }

    return this.request<DocumentUploadResponse>({
      method: 'POST',
      url: '/api/documents/upload',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: options.onUploadProgress ? (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        options.onUploadProgress!(progress);
      } : undefined
    });
  }

  async uploadTestDocument(
    file: File,
    options?: { onUploadProgress?: (progress: number) => void }
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_test_document', 'true');

    return this.request<Document>({
      method: 'POST',
      url: '/api/documents/upload-test',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: options?.onUploadProgress ? (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        options.onUploadProgress!(progress);
      } : undefined
    });
  }

  // Document Updates
  async updateDocumentCategory(documentId: string, categoryId?: string): Promise<void> {
    const formData = new FormData();
    if (categoryId) {
      formData.append('category_id', categoryId);
    }

    await this.request<void>({
      method: 'PUT',
      url: `/api/documents/${documentId}/category`,
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async updateDocumentTags(documentId: string, tags: string[]): Promise<void> {
    const formData = new FormData();
    formData.append('tags', tags.join(','));

    await this.request<void>({
      method: 'PUT',
      url: `/api/documents/${documentId}/tags`,
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  // Document Processing
  async reprocessDocument(documentId: string): Promise<void> {
    await this.post<void>(`/api/documents/${documentId}/reprocess`);
  }

  // Document Content and Preview
  async getDocumentContent(documentId: string): Promise<DocumentContent | null> {
    try {
      return await this.get<DocumentContent>(`/api/documents/${documentId}/content`);
    } catch (error: any) {
      // Handle 404 gracefully - document content might not exist yet
      if (error?.status === 404 || error?.name === 'NotFoundError') {
        console.log('Document content not found for ID:', documentId);
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  }

  async getDocumentPreview(documentId: string): Promise<DocumentPreview> {
    return this.get<DocumentPreview>(`/api/documents/preview/${documentId}`);
  }

  // Document Downloads and Thumbnails
  async getDocumentDownloadUrl(documentId: string): Promise<string> {
    // Return the endpoint; let the caller navigate to it
    return `/api/documents/${documentId}/download`;
  }

  async getDocumentThumbnailUrl(documentId: string): Promise<string> {
    return `/api/documents/${documentId}/thumbnail`;
  }

  // Document Tracking
  async getDocumentWithTracking(documentId: string): Promise<DocumentWithTracking> {
    return this.get<DocumentWithTracking>(`/api/documents/${documentId}/with-tracking`);
  }

  async getDocumentTracking(documentId: string): Promise<DocumentExtractionTracking[]> {
    return this.get<DocumentExtractionTracking[]>(`/api/documents/${documentId}/tracking`);
  }

  // Document Statistics
  async getProcessingStats(): Promise<ProcessingStats> {
    return this.get<ProcessingStats>('/api/documents/stats/processing');
  }

  // Batch Operations
  async bulkUpdateDocuments(documentIds: string[], updates: DocumentUpdateParams): Promise<{ success_count: number; failure_count: number }> {
    return this.put<{ success_count: number; failure_count: number }>('/api/documents/bulk-update', {
      document_ids: documentIds,
      updates
    });
  }

  async bulkDeleteDocuments(documentIds: string[]): Promise<{ success_count: number; failure_count: number }> {
    return this.post<{ success_count: number; failure_count: number }>('/api/documents/bulk-delete', {
      document_ids: documentIds
    });
  }

  // Document Search
  async searchDocuments(query: string, filters?: Partial<DocumentListParams>): Promise<DocumentListResponse> {
    return this.get<DocumentListResponse>('/api/documents/search', {
      q: query,
      ...filters
    });
  }
}
