/**
 * Data Extraction Types
 */
import { TenantEntity, BaseEntity } from '../../base/types/common';
import { 
  ScheduleType, 
  JobsExecutionRequest, 
  JobsExecutionResponse 
} from '../../jobs/types/jobs';

// Core Extraction Types
export interface Extraction {
  id: string;
  tenant_id: string;
  document_id: string;
  template_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: Record<string, any> | null;
  confidence_scores: Record<string, number>;
  processing_time_ms?: number;
  error_message?: string;
  language_detected?: string;
  language_confidence?: number;
  language_match?: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  // Additional metadata from backend
  document_name?: string;
  template_name?: string;
  // Review workflow fields
  review_status?: string;
  assigned_reviewer?: string;
  review_comments?: string;
  review_completed_at?: string;
}

export interface ExtractionListResponse {
  extractions: Extraction[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Extraction Request Types
export interface ExtractionCreateRequest {
  document_id: string;
  template_id: string;
  options?: {
    auto_detect_language?: boolean;
    require_language_match?: boolean;
    confidence_threshold?: number;
  };
}

export interface ExtractionListParams {
  page?: number;
  per_page?: number;
  document_id?: string;
  template_id?: string;
  status?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  date_from?: string;
  date_to?: string;
}

// Extraction Job Types
export interface ExtractionJob {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  category_id: string;
  template_id: string;
  schedule_type: ScheduleType;
  schedule_config?: {
    cron?: string;
    timezone?: string;
  };
  run_at?: string;
  priority: number;
  max_concurrency: number;
  retry_policy: {
    max_retries: number;
    retry_delay_minutes: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExtractionJobCreate {
  name: string;
  description?: string;
  category_id: string;
  template_id: string;
  schedule_type: ScheduleType;
  schedule_config?: {
    cron?: string;
    timezone?: string;
  };
  run_at?: string;
  priority?: number;
  max_concurrency?: number;
  retry_policy?: {
    max_retries: number;
    retry_delay_minutes: number;
  };
}

export interface ExtractionJobUpdate {
  name?: string;
  description?: string;
  schedule_type?: ScheduleType;
  schedule_config?: {
    cron?: string;
    timezone?: string;
  };
  run_at?: string;
  priority?: number;
  max_concurrency?: number;
  retry_policy?: {
    max_retries: number;
    retry_delay_minutes: number;
  };
  is_active?: boolean;
}

export interface ExtractionJobListResponse {
  jobs: ExtractionJob[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Job Execution Types (alias to canonical jobs module)
export type { 
  JobsExecutionRequest as JobExecutionRequest, 
  JobsExecutionResponse as JobExecutionResponse 
};

// Extraction Review Types
export interface ExtractionReview {
  id: string;
  extraction_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_correction';
  reviewer_id?: string;
  reviewer_notes?: string;
  corrections?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ExtractionConfidenceSummary {
  extraction_id: string;
  overall_confidence: number;
  field_confidences: Record<string, number>;
  low_confidence_fields: string[];
  recommendations: string[];
}

// Extraction Statistics
export interface ExtractionStats {
  total_extractions: number;
  successful_extractions: number;
  failed_extractions: number;
  pending_extractions: number;
  success_rate: number;
  avg_processing_time_ms: number;
  avg_confidence: number;
  status_distribution: Record<string, number>;
}

// Extraction Validation
export interface ExtractionValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  confidence_threshold_met: boolean;
}

// Status Types
export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'needs_correction' | 'in_review';

export interface ReviewActionRequest {
  action: 'approve' | 'reject' | 'start_review';
  reason?: string;
}