/**
 * Job Scheduling Service
 * Handles all job-related operations including CRUD, execution, monitoring, and statistics
 */
import { AxiosInstance } from 'axios';
import { BaseApiClient } from '../base/BaseApiClient';
import {
  Job,
  JobCreateRequest,
  JobUpdateRequest,
  JobListParams,
  JobListResponse,
  JobExecution,
  JobExecutionRequest,
  JobExecutionResponse,
  JobHistoryResponse,
  JobStatistics,
  JobMonitor,
  JobQueueStatus,
  JobTemplate,
  JobTemplateCreateRequest,
  JobValidationResult,
  DEFAULT_RETRY_POLICY,
  CRON_EXAMPLES
} from './types/jobs';

export class JobService extends BaseApiClient {
  constructor(client: AxiosInstance) {
    super(client);
  }

  // Job CRUD Operations
  async getJobs(params?: JobListParams): Promise<JobListResponse> {
    return this.get<JobListResponse>('/api/jobs', params);
  }

  async getJob(jobId: string): Promise<Job> {
    return this.get<Job>(`/api/jobs/${jobId}`);
  }

  async createJob(jobData: JobCreateRequest): Promise<Job> {
    return this.post<Job>('/api/jobs', jobData);
  }

  async updateJob(jobId: string, jobData: JobUpdateRequest): Promise<Job> {
    return this.put<Job>(`/api/jobs/${jobId}`, jobData);
  }

  async deleteJob(jobId: string): Promise<void> {
    await this.delete<void>(`/api/jobs/${jobId}`);
  }

  // Job Execution
  async executeJob(jobId: string, request?: JobExecutionRequest): Promise<JobExecutionResponse> {
    return this.post<JobExecutionResponse>(`/api/jobs/${jobId}/execute`, request || {
      triggered_by: 'manual'
    });
  }

  async cancelJobExecution(executionId: string): Promise<{
    status: string;
    message: string;
  }> {
    return this.post<{
      status: string;
      message: string;
    }>(`/api/jobs/executions/${executionId}/cancel`);
  }

  async pauseJob(jobId: string): Promise<Job> {
    return this.put<Job>(`/api/jobs/${jobId}/pause`);
  }

  async resumeJob(jobId: string): Promise<Job> {
    return this.put<Job>(`/api/jobs/${jobId}/resume`);
  }

  async stopJob(jobId: string): Promise<Job> {
    return this.put<Job>(`/api/jobs/${jobId}/stop`);
  }

  // Job History and Statistics
  async getJobHistory(jobId: string, params?: {
    page?: number;
    per_page?: number;
    status?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<JobHistoryResponse> {
    return this.get<JobHistoryResponse>(`/api/jobs/${jobId}/history`, { params });
  }

  async getJobStatistics(jobId: string): Promise<JobStatistics> {
    return this.get<JobStatistics>(`/api/jobs/${jobId}/statistics`);
  }

  async getJobExecution(executionId: string): Promise<JobExecution> {
    return this.get<JobExecution>(`/api/jobs/executions/${executionId}`);
  }

  async getJobExecutions(params?: {
    page?: number;
    per_page?: number;
    job_id?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<{
    executions: JobExecution[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    if (!params?.job_id) {
      throw new Error('job_id is required for getJobExecutions');
    }
    return this.get<{
      executions: JobExecution[];
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    }>(`/api/jobs/${params.job_id}/execution-history`, { 
      params: {
        page: params.page,
        per_page: params.per_page,
        status: params.status,
        date_from: params.date_from,
        date_to: params.date_to
      }
    });
  }

  // Job Monitoring
  async getJobMonitor(jobId: string): Promise<JobMonitor> {
    return this.get<JobMonitor>(`/api/jobs/${jobId}/monitor`);
  }

  async getJobQueueStatus(): Promise<JobQueueStatus> {
    return this.get<JobQueueStatus>('/api/jobs/queue-status');
  }

  async getRunningJobs(): Promise<JobMonitor[]> {
    return this.get<JobMonitor[]>('/api/jobs/running');
  }

  async getJobProgress(executionId: string): Promise<{
    execution_id: string;
    status: string;
    progress_percentage: number;
    current_step: string;
    completed_steps: number;
    total_steps: number;
    estimated_completion?: string;
    started_at: string;
    duration_ms: number;
  }> {
    return this.get<{
      execution_id: string;
      status: string;
      progress_percentage: number;
      current_step: string;
      completed_steps: number;
      total_steps: number;
      estimated_completion?: string;
      started_at: string;
      duration_ms: number;
    }>(`/api/jobs/executions/${executionId}/progress`);
  }

  // Job Templates
  async getJobTemplates(): Promise<JobTemplate[]> {
    return this.get<JobTemplate[]>('/api/jobs/templates');
  }

  async getJobTemplate(templateId: string): Promise<JobTemplate> {
    return this.get<JobTemplate>(`/api/jobs/templates/${templateId}`);
  }

  async createJobTemplate(templateData: JobTemplateCreateRequest): Promise<JobTemplate> {
    return this.post<JobTemplate>('/api/jobs/templates', templateData);
  }

  async updateJobTemplate(templateId: string, templateData: Partial<JobTemplateCreateRequest>): Promise<JobTemplate> {
    return this.put<JobTemplate>(`/api/jobs/templates/${templateId}`, templateData);
  }

  async deleteJobTemplate(templateId: string): Promise<void> {
    await this.delete<void>(`/api/jobs/templates/${templateId}`);
  }

  async createJobFromTemplate(templateId: string, jobData: Partial<JobCreateRequest>): Promise<Job> {
    return this.post<Job>(`/api/jobs/templates/${templateId}/create-job`, jobData);
  }

  // Job Validation
  async validateJob(jobData: JobCreateRequest): Promise<JobValidationResult> {
    return this.post<JobValidationResult>('/api/jobs/validate', jobData);
  }

  async validateCronExpression(cronExpression: string): Promise<{
    is_valid: boolean;
    message: string;
    next_runs?: string[];
    human_readable?: string;
  }> {
    return this.post<{
      is_valid: boolean;
      message: string;
      next_runs?: string[];
      human_readable?: string;
    }>('/api/jobs/validate-cron', {
      cron_expression: cronExpression
    });
  }

  // Job Search and Filtering
  async searchJobs(query: string, filters?: Partial<JobListParams>): Promise<JobListResponse> {
    return this.get<JobListResponse>('/api/jobs/search', {
      q: query,
      ...filters
    });
  }

  async getJobsByStatus(status: string): Promise<Job[]> {
    return this.get<Job[]>(`/api/jobs/by-status/${status}`);
  }

  async getJobsByType(jobType: string): Promise<Job[]> {
    return this.get<Job[]>(`/api/jobs/by-type/${jobType}`);
  }

  async getJobsBySchedule(scheduleType: string): Promise<Job[]> {
    return this.get<Job[]>(`/api/jobs/by-schedule/${scheduleType}`);
  }

  // Job Bulk Operations
  async bulkUpdateJobs(jobIds: string[], updates: JobUpdateRequest): Promise<{
    success_count: number;
    failure_count: number;
    errors: Array<{
      job_id: string;
      error: string;
    }>;
  }> {
    return this.post<{
      success_count: number;
      failure_count: number;
      errors: Array<{
        job_id: string;
        error: string;
      }>;
    }>('/api/jobs/bulk-update', {
      job_ids: jobIds,
      updates
    });
  }

  async bulkDeleteJobs(jobIds: string[]): Promise<{
    success_count: number;
    failure_count: number;
    errors: Array<{
      job_id: string;
      error: string;
    }>;
  }> {
    return this.post<{
      success_count: number;
      failure_count: number;
      errors: Array<{
        job_id: string;
        error: string;
      }>;
    }>('/api/jobs/bulk-delete', {
      job_ids: jobIds
    });
  }

  async bulkExecuteJobs(jobIds: string[], request?: JobExecutionRequest): Promise<{
    success_count: number;
    failure_count: number;
    executions: Array<{
      job_id: string;
      execution_id?: string;
      error?: string;
    }>;
  }> {
    return this.post<{
      success_count: number;
      failure_count: number;
      executions: Array<{
        job_id: string;
        execution_id?: string;
        error?: string;
      }>;
    }>('/api/jobs/bulk-execute', {
      job_ids: jobIds,
      request
    });
  }

  // Job Analytics
  async getJobAnalytics(dateRange?: {
    start_date: string;
    end_date: string;
  }): Promise<{
    total_jobs: number;
    active_jobs: number;
    completed_jobs: number;
    failed_jobs: number;
    success_rate: number;
    avg_execution_time_ms: number;
    total_execution_time_ms: number;
    job_type_distribution: Record<string, number>;
    schedule_type_distribution: Record<string, number>;
    execution_trend: Array<{
      date: string;
      executions: number;
      success_rate: number;
    }>;
  }> {
    return this.get<{
      total_jobs: number;
      active_jobs: number;
      completed_jobs: number;
      failed_jobs: number;
      success_rate: number;
      avg_execution_time_ms: number;
      total_execution_time_ms: number;
      job_type_distribution: Record<string, number>;
      schedule_type_distribution: Record<string, number>;
      execution_trend: Array<{
        date: string;
        executions: number;
        success_rate: number;
      }>;
    }>('/api/jobs/analytics', {
      params: dateRange
    });
  }

  // Utility Methods
  async getDefaultRetryPolicy(): Promise<typeof DEFAULT_RETRY_POLICY> {
    return Promise.resolve(DEFAULT_RETRY_POLICY);
  }

  async getCronExamples(): Promise<typeof CRON_EXAMPLES> {
    return Promise.resolve(CRON_EXAMPLES);
  }

  async getJobTypes(): Promise<string[]> {
    return this.get<string[]>('/api/jobs/types');
  }

  async getScheduleTypes(): Promise<string[]> {
    return this.get<string[]>('/api/jobs/schedule-types');
  }

  async getExecutionStatuses(): Promise<string[]> {
    return this.get<string[]>('/api/jobs/execution-statuses');
  }
}
