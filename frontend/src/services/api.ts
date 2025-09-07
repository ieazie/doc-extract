/**
 * API client for Document Extraction Platform
 * Handles all communication with the backend REST API
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// API Response Types
export interface Document {
  id: string;
  tenant_id: string;
  original_filename: string;
  file_size: number;
  mime_type?: string;
  document_type?: string;
  category?: {
    id: string;
    name: string;
    color: string;
  };
  tags: string[];
  status: string;
  extraction_status: string;
  extraction_error?: string;
  page_count?: number;
  character_count?: number;
  word_count?: number;
  has_thumbnail: boolean;
  is_test_document: boolean;
  created_at: string;
  updated_at: string;
  extraction_completed_at?: string;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  color: string;
  document_count: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryListResponse {
  categories: Category[];
  total: number;
}

export interface DocumentUploadResponse {
  document_id: string;
  status: string;
  message: string;
  extraction_status: string;
}

export interface ProcessingStats {
  total_documents: number;
  status_counts: Record<string, number>;
  processing_rate: Record<string, number>;
  completion_rate: number;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  service?: string;
  services?: {
    database: { status: string; message: string };
    ollama: { status: string; message: string; available_models?: string[] };
    s3: { status: string; message: string; available_buckets?: string[] };
  };
}

// API Client Class
class ApiClient {
  private client: AxiosInstance;

  constructor() {
    // Determine the correct API URL based on environment
    let apiBaseUrl;
    if (typeof window === 'undefined') {
      // Server-side (Next.js SSR) - use Docker service name
      apiBaseUrl = 'http://backend:8000';
    } else {
      // Client-side (browser) - use localhost
      apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    }
    
    this.client = axios.create({
      baseURL: apiBaseUrl,
      timeout: 30000, // 30 seconds for file uploads
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for debugging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ API Response Error:', error.response?.data || error.message);
        
        // Handle specific error cases
        if (error.response?.status === 413) {
          throw new Error('File too large. Please select a smaller file.');
        }
        
        if (error.response?.status === 400) {
          throw new Error(error.response.data?.detail || 'Invalid request');
        }
        
        if (error.response?.status === 500) {
          throw new Error('Server error. Please try again later.');
        }
        
        throw error;
      }
    );
  }

  // Health Endpoints
  async getHealth(): Promise<HealthStatus> {
    const response = await this.client.get('/health/');
    return response.data;
  }

  async getDetailedHealth(): Promise<HealthStatus> {
    const response = await this.client.get('/health/detailed');
    return response.data;
  }

  // Document Endpoints
  async getDocuments(params: {
    page?: number;
    per_page?: number;
    search?: string;
    category_id?: string;
    document_type_id?: string;
    tags?: string;
    status?: string;
    extraction_status?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  } = {}): Promise<DocumentListResponse> {
    const response = await this.client.get('/api/documents/', { params });
    return response.data;
  }

  async getDocument(documentId: string): Promise<Document> {
    const response = await this.client.get(`/api/documents/${documentId}`);
    return response.data;
  }

  async uploadDocument(
    file: File,
    options: {
      document_type_id?: string;
      category_id?: string;
      tags?: string[];
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
    
    if (options.tags && options.tags.length > 0) {
      formData.append('tags', options.tags.join(','));
    }

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };

    if (options.onUploadProgress) {
      config.onUploadProgress = (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onUploadProgress!(progress);
        }
      };
    }

    const response = await this.client.post('/api/documents/upload', formData, config);
    return response.data;
  }

  async updateDocumentCategory(documentId: string, categoryId?: string): Promise<void> {
    const formData = new FormData();
    if (categoryId) {
      formData.append('category_id', categoryId);
    }
    
    await this.client.put(`/api/documents/${documentId}/category`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async updateDocumentTags(documentId: string, tags: string[]): Promise<void> {
    const formData = new FormData();
    formData.append('tags', tags.join(','));
    
    await this.client.put(`/api/documents/${documentId}/tags`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async reprocessDocument(documentId: string): Promise<void> {
    await this.client.post(`/api/documents/${documentId}/reprocess`);
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.client.delete(`/api/documents/${documentId}`);
  }

  async uploadTestDocument(
    file: File, 
    options?: { onUploadProgress?: (progress: number) => void }
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_test_document', 'true'); // Mark as test document
    
    const config: AxiosRequestConfig = {
      headers: { 'Content-Type': 'multipart/form-data' },
    };

    if (options?.onUploadProgress) {
      config.onUploadProgress = (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onUploadProgress!(progress);
        }
      };
    }

    // Upload the document
    const uploadResponse = await this.client.post('/api/documents/upload', formData, config);
    const uploadData: DocumentUploadResponse = uploadResponse.data;
    
    // Fetch the actual document data
    const document = await this.getDocument(uploadData.document_id);
    return document;
  }

  async getDocumentDownloadUrl(documentId: string): Promise<string> {
    // This endpoint redirects, so we get the redirect URL
    const response = await this.client.get(`/api/documents/${documentId}/download`, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302
    });
    return response.headers.location;
  }

  async getDocumentThumbnailUrl(documentId: string): Promise<string> {
    // This endpoint redirects, so we get the redirect URL
    const response = await this.client.get(`/api/documents/${documentId}/thumbnail`, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302
    });
    return response.headers.location;
  }



  async getProcessingStats(): Promise<ProcessingStats> {
    const response = await this.client.get('/api/documents/stats/processing');
    return response.data;
  }

  // Category Endpoints
  async getCategories(): Promise<CategoryListResponse> {
    const response = await this.client.get('/api/categories/');
    return response.data;
  }

  async getCategory(categoryId: string): Promise<Category> {
    const response = await this.client.get(`/api/categories/${categoryId}`);
    return response.data;
  }

  async createCategory(categoryData: {
    name: string;
    description?: string;
    color?: string;
  }): Promise<Category> {
    const response = await this.client.post('/api/categories/', categoryData);
    return response.data;
  }

  async updateCategory(
    categoryId: string,
    categoryData: {
      name?: string;
      description?: string;
      color?: string;
    }
  ): Promise<Category> {
    const response = await this.client.put(`/api/categories/${categoryId}`, categoryData);
    return response.data;
  }

  async deleteCategory(categoryId: string, force = false): Promise<void> {
    await this.client.delete(`/api/categories/${categoryId}`, {
      params: { force }
    });
  }

  async getCategoryDocuments(
    categoryId: string,
    page = 1,
    per_page = 20
  ): Promise<{
    category: { id: string; name: string; color: string };
    documents: Array<{
      id: string;
      original_filename: string;
      file_size: number;
      status: string;
      extraction_status: string;
      created_at: string;
    }>;
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    const response = await this.client.get(`/api/categories/${categoryId}/documents`, {
      params: { page, per_page }
    });
    return response.data;
  }

  async getCategoryUsageStats(): Promise<{
    category_stats: Array<{
      name: string;
      color: string;
      document_count: number;
      total_size: number;
      percentage: number;
    }>;
    total_categories: number;
    total_documents: number;
    uncategorized_count: number;
  }> {
    const response = await this.client.get('/api/categories/stats/usage');
    return response.data;
  }

  // Template Endpoints
  async getTemplates(
    page: number = 1,
    perPage: number = 10,
    search?: string,
    documentTypeId?: string,
    isActive?: boolean,
    status?: string,
    sortBy?: string,
    sortOrder?: string
  ): Promise<{
    templates: Array<{
      id: string;
      name: string;
      document_type_name?: string;
      schema: Record<string, any>;
      is_active: boolean;
      status?: 'draft' | 'published' | 'archived';
      version: number;
      created_at: string;
      updated_at: string;
    }>;
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });
    
    if (search) params.append('search', search);
    if (documentTypeId) params.append('document_type_id', documentTypeId);
    if (isActive !== undefined) params.append('is_active', isActive.toString());
    if (status) params.append('status', status);
    if (sortBy) params.append('sort_by', sortBy);
    if (sortOrder) params.append('sort_order', sortOrder);
    
    const response = await this.client.get(`/api/templates/?${params.toString()}`);
    return response.data;
  }

  async getTemplate(templateId: string): Promise<{
    id: string;
    name: string;
    document_type_id?: string;
    document_type_name?: string;
    schema: Record<string, any>;
    prompt_config: Record<string, any>;
    extraction_settings: Record<string, any>;
    few_shot_examples: Array<Record<string, any>>;
    is_active: boolean;
    version: number;
    created_at: string;
    updated_at: string;
  }> {
    const response = await this.client.get(`/api/templates/${templateId}`);
    return response.data;
  }

  async createTemplate(templateData: {
    name: string;
    description?: string;
    document_type_id?: string;
    schema: Record<string, any>;
    prompt_config: {
      system_prompt: string;
      instructions: string;
      output_format: string;
    };
    extraction_settings?: {
      max_chunk_size: number;
      extraction_passes: number;
      confidence_threshold: number;
    };
    few_shot_examples?: Array<Record<string, any>>;
    status?: string;
  }): Promise<{
    id: string;
    name: string;
    description?: string;
    document_type_id?: string;
    document_type_name?: string;
    schema: Record<string, any>;
    prompt_config: Record<string, any>;
    extraction_settings: Record<string, any>;
    few_shot_examples: Array<Record<string, any>>;
    is_active: boolean;
    status: string;
    version: number;
    created_at: string;
    updated_at: string;
  }> {
    const response = await this.client.post('/api/templates/', templateData);
    return response.data;
  }

  async updateTemplate(
    templateId: string,
    templateData: Partial<{
      name: string;
      document_type_id?: string;
      schema: Record<string, any>;
      prompt_config: {
        system_prompt: string;
        instructions: string;
        output_format: string;
      };
      extraction_settings: {
        max_chunk_size: number;
        extraction_passes: number;
        confidence_threshold: number;
      };
      few_shot_examples: Array<Record<string, any>>;
      is_active: boolean;
    }>
  ): Promise<{
    id: string;
    name: string;
    document_type_id?: string;
    document_type_name?: string;
    schema: Record<string, any>;
    prompt_config: Record<string, any>;
    extraction_settings: Record<string, any>;
    few_shot_examples: Array<Record<string, any>>;
    is_active: boolean;
    version: number;
    created_at: string;
    updated_at: string;
  }> {
    const response = await this.client.put(`/api/templates/${templateId}`, templateData);
    return response.data;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.client.delete(`/api/templates/${templateId}`);
  }

  async testTemplate(templateId: string, testDocument: string): Promise<{
    status: string;
    message: string;
    extracted_data: Record<string, any>;
    confidence_score: number;
    processing_time_ms: number;
    template_id: string;
    note: string;
  }> {
    const response = await this.client.post(`/api/templates/${templateId}/test`, {
      test_document: testDocument
    });
    return response.data;
  }

  // Extraction Endpoints
  async createExtraction(extractionData: {
    document_id: string;
    template_id: string;
  }): Promise<{
    id: string;
    document_id: string;
    template_id: string;
    status: string;
    results?: Record<string, any>;
    confidence_score?: number;
    processing_time_ms?: number;
    error_message?: string;
    document_name?: string;
    template_name?: string;
    created_at: string;
    updated_at: string;
  }> {
    const response = await this.client.post('/api/extractions/', extractionData);
    return response.data;
  }

  async getExtractions(params: {
    page?: number;
    per_page?: number;
    status?: string;
    document_id?: string;
    template_id?: string;
    search?: string;
  } = {}): Promise<{
    extractions: Array<{
      id: string;
      document_id: string;
      template_id: string;
      status: string;
      results?: Record<string, any>;
      confidence_score?: number;
      processing_time_ms?: number;
      error_message?: string;
      document_name?: string;
      template_name?: string;
      created_at: string;
      updated_at: string;
    }>;
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    const response = await this.client.get('/api/extractions/', { params });
    return response.data;
  }

  async getExtraction(extractionId: string): Promise<{
    id: string;
    document_id: string;
    template_id: string;
    status: string;
    results?: Record<string, any>;
    confidence_score?: number;
    processing_time_ms?: number;
    error_message?: string;
    document_name?: string;
    template_name?: string;
    created_at: string;
    updated_at: string;
  }> {
    const response = await this.client.get(`/api/extractions/${extractionId}`);
    return response.data;
  }

  async deleteExtraction(extractionId: string): Promise<void> {
    await this.client.delete(`/api/extractions/${extractionId}`);
  }

  // Document Content Endpoints
  async getDocumentContent(documentId: string): Promise<{
    document_id: string;
    filename: string;
    content: string;
    metadata: {
      page_count?: number;
      character_count?: number;
      word_count?: number;
      extraction_completed_at?: string;
    };
  }> {
    const response = await this.client.get(`/api/documents/content/${documentId}`);
    return response.data;
  }

  async getDocumentPreview(documentId: string): Promise<{
    document_id: string;
    filename: string;
    mime_type?: string;
    preview_url?: string;
    has_preview: boolean;
  }> {
    const response = await this.client.get(`/api/documents/preview/${documentId}`);
    return response.data;
  }

  // Utility Methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      // Document status
      'uploaded': '#3b82f6',
      'processing': '#f59e0b',
      'completed': '#10b981',
      'failed': '#ef4444',
      'deleted': '#6b7280',
      
      // Extraction status
      'pending': '#6b7280',
      'extracting': '#f59e0b',
      'extracted': '#10b981',
      'error': '#ef4444'
    };
    
    return statusColors[status] || '#6b7280';
  }

  getStatusIcon(status: string): string {
    const statusIcons: Record<string, string> = {
      // Document status
      'uploaded': '📄',
      'processing': '⏳',
      'completed': '✅',
      'failed': '❌',
      'deleted': '🗑️',
      
      // Extraction status
      'pending': '⏳',
      'extracting': '🔄',
      'extracted': '✅',
      'error': '❌'
    };
    
    return statusIcons[status] || '📄';
  }

}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
