/**
 * Document Management Types
 */
import { TenantEntity, BaseEntity } from '../../base/types/common';

// Core Document Types
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
  // Language detection fields
  detected_language?: string;
  language_confidence?: number;
  language_source?: string;
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

export interface DocumentUploadResponse {
  document_id: string;
  status: string;
  message: string;
  extraction_status: string;
}

// Document Request Types
export interface DocumentListParams {
  page?: number;
  per_page?: number;
  category_id?: string;
  status?: string;
  extraction_status?: string;
  search?: string;
  tags?: string[];
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  date_from?: string;
  date_to?: string;
}

export interface DocumentUploadParams {
  file: File;
  category_id?: string;
  tags?: string[];
  is_test_document?: boolean;
  metadata?: Record<string, any>;
}

export interface DocumentUpdateParams {
  category_id?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// Document Processing Types
export interface DocumentWithTracking extends Document {
  job_tracking: DocumentExtractionTracking[];
  total_jobs_processed: number;
  successful_jobs: number;
  failed_jobs: number;
  pending_jobs: number;
}

export interface DocumentExtractionTracking {
  id: string;
  document_id: string;
  job_id: string;
  extraction_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  triggered_by: 'schedule' | 'manual' | 'immediate';
  queued_at: string;
  started_at?: string;
  completed_at?: string;
  processing_time_ms?: number;
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
  document?: Document;
}

// Document Content Types
export interface DocumentContent {
  id: string;
  document_id: string;
  content: string;
  content_type: 'text' | 'html' | 'json';
  page_number?: number;
  confidence?: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentPreview {
  id: string;
  document_id: string;
  preview_url: string;
  thumbnail_url?: string;
  page_count: number;
  format: 'pdf' | 'image' | 'text';
  created_at: string;
  updated_at: string;
}

// Document Statistics
export interface ProcessingStats {
  total_documents: number;
  status_counts: Record<string, number>;
  processing_rate: Record<string, number>;
  completion_rate: number;
}

// Document Status Types
export type DocumentStatus = 'uploaded' | 'processing' | 'processed' | 'failed' | 'archived';

export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

// Document Metadata
export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  description?: string;
  language?: string;
  created_date?: string;
  modified_date?: string;
  custom_fields?: Record<string, any>;
}
