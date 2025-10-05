/**
 * Data Extraction Service
 * Handles all data extraction operations including CRUD, review, and job management
 */
import { AxiosInstance } from 'axios';
import { BaseApiClient } from '../base/BaseApiClient';
import {
  Extraction,
  ExtractionListResponse,
  ExtractionListParams,
  ExtractionCreateRequest,
  ExtractionJob,
  ExtractionJobCreate,
  ExtractionJobUpdate,
  ExtractionJobListResponse,
  JobExecutionRequest,
  JobExecutionResponse,
  ExtractionReview,
  ExtractionConfidenceSummary,
  ExtractionStats
} from './types/extractions';

export class ExtractionService extends BaseApiClient {
  constructor(client: AxiosInstance) {
    super(client);
  }

  // Extraction CRUD Operations
  async createExtraction(extractionData: ExtractionCreateRequest): Promise<Extraction> {
    return this.post<Extraction>('/api/extractions', extractionData);
  }

  async getExtractions(params?: ExtractionListParams): Promise<ExtractionListResponse> {
    return this.get<ExtractionListResponse>('/api/extractions', params);
  }

  async getExtraction(extractionId: string): Promise<Extraction> {
    return this.get<Extraction>(`/api/extractions/${extractionId}`);
  }

  async deleteExtraction(extractionId: string): Promise<void> {
    await this.delete<void>(`/api/extractions/${extractionId}`);
  }

  // Extraction Processing
  async autoRouteExtraction(extractionId: string): Promise<{
    routed: boolean;
    reason: string;
    flagged_fields: string[];
    review_status?: string;
  }> {
    return this.post<{
      routed: boolean;
      reason: string;
      flagged_fields: string[];
      review_status?: string;
    }>(`/api/extractions/${extractionId}/auto-route`);
  }

  async getExtractionConfidenceSummary(extractionId: string): Promise<ExtractionConfidenceSummary> {
    return this.get<ExtractionConfidenceSummary>(`/api/extractions/${extractionId}/confidence-summary`);
  }

  // Extraction Review
  async startReview(extractionId: string, request: {
    action: 'start_review' | 'approve' | 'reject' | 'needs_correction';
    comments?: string;
    reviewer?: string;
  }): Promise<{
    extraction_id: string;
    review_status: string;
    assigned_reviewer?: string;
    review_comments?: string;
    review_completed_at?: string;
    updated_at: string;
  }> {
    return this.post<{
      extraction_id: string;
      review_status: string;
      assigned_reviewer?: string;
      review_comments?: string;
      review_completed_at?: string;
      updated_at: string;
    }>(`/api/extractions/${extractionId}/review`, request);
  }

  async getReviewQueue(params?: {
    page?: number;
    per_page?: number;
    status?: string;
    priority?: string;
  }): Promise<{
    extractions: Extraction[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    return this.get<{
      extractions: Extraction[];
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    }>('/api/extractions/review-queue', params);
  }

  async getReviewStatus(extractionId: string): Promise<ExtractionReview> {
    return this.get<ExtractionReview>(`/api/extractions/${extractionId}/review-status`);
  }

  async correctField(extractionId: string, request: {
    field_name: string;
    corrected_value: any;
    reason?: string;
  }): Promise<{
    status: string;
    message: string;
    updated_extraction: Extraction;
  }> {
    return this.post<{
      status: string;
      message: string;
      updated_extraction: Extraction;
    }>(`/api/extractions/${extractionId}/correct-field`, request);
  }

  // Extraction Job Management
  async getJobs(params?: {
    page?: number;
    per_page?: number;
    status?: string;
    template_id?: string;
  }): Promise<ExtractionJobListResponse> {
    return this.get<ExtractionJobListResponse>('/api/jobs', params);
  }

  async getJob(jobId: string): Promise<ExtractionJob> {
    return this.get<ExtractionJob>(`/api/jobs/${jobId}`);
  }

  async createJob(jobData: ExtractionJobCreate): Promise<ExtractionJob> {
    return this.post<ExtractionJob>('/api/jobs', jobData);
  }

  async updateJob(jobId: string, jobData: ExtractionJobUpdate): Promise<ExtractionJob> {
    return this.put<ExtractionJob>(`/api/jobs/${jobId}`, jobData);
  }

  async deleteJob(jobId: string): Promise<void> {
    await this.delete<void>(`/api/jobs/${jobId}`);
  }

  async executeJob(jobId: string, request?: JobExecutionRequest): Promise<JobExecutionResponse> {
    return this.post<JobExecutionResponse>(`/api/jobs/${jobId}/execute`, request || {
      triggered_by: 'manual'
    });
  }

  async getJobHistory(jobId: string, params?: {
    page?: number;
    per_page?: number;
  }): Promise<{
    executions: Array<{
      id: string;
      job_id: string;
      status: string;
      started_at: string;
      completed_at?: string;
      documents_processed: number;
      success_count: number;
      failure_count: number;
    }>;
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    return this.get<{
      executions: Array<{
        id: string;
        job_id: string;
        status: string;
        started_at: string;
        completed_at?: string;
        documents_processed: number;
        success_count: number;
        failure_count: number;
      }>;
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    }>(`/api/jobs/${jobId}/history`, params);
  }

  async getJobStatistics(jobId: string): Promise<{
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    success_rate: number;
    avg_processing_time_ms: number;
    total_documents_processed: number;
    last_execution_at?: string;
    next_execution_at?: string;
  }> {
    return this.get<{
      total_executions: number;
      successful_executions: number;
      failed_executions: number;
      success_rate: number;
      avg_processing_time_ms: number;
      total_documents_processed: number;
      last_execution_at?: string;
      next_execution_at?: string;
    }>(`/api/jobs/${jobId}/statistics`);
  }

  // Extraction Statistics
  async getExtractionStats(): Promise<ExtractionStats> {
    return this.get<ExtractionStats>('/api/extractions/statistics');
  }

  // Bulk Operations
  async bulkDeleteExtractions(extractionIds: string[]): Promise<{
    success_count: number;
    failure_count: number;
    errors: Array<{
      id: string;
      error: string;
    }>;
  }> {
    return this.post<{
      success_count: number;
      failure_count: number;
      errors: Array<{
        id: string;
        error: string;
      }>;
    }>('/api/extractions/bulk-delete', {
      extraction_ids: extractionIds
    });
  }

  async bulkApproveExtractions(extractionIds: string[]): Promise<{
    success_count: number;
    failure_count: number;
    errors: Array<{
      id: string;
      error: string;
    }>;
  }> {
    return this.post<{
      success_count: number;
      failure_count: number;
      errors: Array<{
        id: string;
        error: string;
      }>;
    }>('/api/extractions/bulk-approve', {
      extraction_ids: extractionIds
    });
  }
}
