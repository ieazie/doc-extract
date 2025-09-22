/**
 * Job Scheduling Types
 */
import { BaseEntity } from '../../base/types/common';

// Core Job Types
export interface Job extends BaseEntity {
  tenant_id: string;
  name: string;
  description?: string;
  job_type: 'extraction' | 'cleanup' | 'backup' | 'analytics' | 'custom';
  is_active: boolean;  // Backend uses is_active, not status
  schedule_type: 'immediate' | 'scheduled' | 'recurring' | 'manual';
  schedule_config: JobScheduleConfig;
  execution_config: JobExecutionConfig;
  retry_policy: JobRetryPolicy;
  last_run_at?: string;
  next_run_at?: string;
  created_by: string;
  // Statistics fields from backend
  total_executions?: number;
  successful_executions?: number;
  failed_executions?: number;
  // Additional fields from backend response
  category?: {
    id: string;
    name: string;
  };
  template?: {
    id: string;
    name: string;
    description?: string;
  };
  category_id?: string;
  template_id?: string;
}

export interface JobCreateRequest {
  name: string;
  description?: string;
  job_type: 'extraction' | 'cleanup' | 'backup' | 'analytics' | 'custom';
  schedule_type: 'immediate' | 'scheduled' | 'recurring' | 'manual';
  schedule_config: JobScheduleConfig;
  execution_config: JobExecutionConfig;
  retry_policy?: JobRetryPolicy;
}

export interface JobUpdateRequest {
  name?: string;
  description?: string;
  is_active?: boolean;  // Backend uses is_active, not status
  schedule_type?: 'immediate' | 'scheduled' | 'recurring' | 'manual';
  schedule_config?: JobScheduleConfig;
  execution_config?: JobExecutionConfig;
  retry_policy?: JobRetryPolicy;
}

export interface JobListParams {
  page?: number;
  per_page?: number;
  job_type?: string;
  is_active?: boolean;  // Backend uses is_active, not status
  schedule_type?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  created_by?: string;
  category_id?: string;
  template_id?: string;
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Job Schedule Configuration
export interface JobScheduleConfig {
  cron?: string;  // Backend uses 'cron', not 'cron_expression'
  cron_expression?: string;  // Keep for backward compatibility
  timezone?: string;
  run_at?: string;
  interval_minutes?: number;
  days_of_week?: number[];
  days_of_month?: number[];
  start_date?: string;
  end_date?: string;
  max_runs?: number;
  max_runtime_hours?: number;
}

// Job Execution Configuration
export interface JobExecutionConfig {
  template_id?: string;
  category_id?: string;
  document_filters?: Record<string, any>;
  extraction_settings?: Record<string, any>;
  cleanup_settings?: {
    older_than_days: number;
    keep_successful: boolean;
    keep_failed: boolean;
  };
  backup_settings?: {
    include_documents: boolean;
    include_extractions: boolean;
    include_templates: boolean;
    compression: boolean;
  };
  analytics_settings?: {
    metrics: string[];
    date_range: {
      start: string;
      end: string;
    };
  };
  custom_settings?: Record<string, any>;
}

// Job Retry Policy
export interface JobRetryPolicy {
  max_retries: number;
  retry_delay_minutes: number;
  backoff_multiplier: number;
  max_retry_delay_minutes: number;
  retry_on_failure_types: string[];
}

// Job Execution
export interface JobExecution extends BaseEntity {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  progress_percentage: number;
  result_data?: Record<string, any>;
  error_message?: string;
  retry_count: number;
  triggered_by: 'schedule' | 'manual' | 'api';
  triggered_by_user?: string;
}

export interface JobsExecutionRequest {
  triggered_by: 'manual' | 'api';
  parameters?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface JobsExecutionResponse {
  execution_id: string;
  job_id: string;
  status: string;
  message: string;
  estimated_duration_ms?: number;
  queue_position?: number;
}

// Job History and Statistics
export interface JobHistoryResponse {
  executions: JobExecution[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface JobStatistics {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  cancelled_executions: number;
  timeout_executions: number;
  success_rate: number;
  avg_execution_time_ms: number;
  total_execution_time_ms: number;
  last_execution_at?: string;
  next_execution_at?: string;
  execution_trend: Array<{
    date: string;
    executions: number;
    success_rate: number;
    avg_duration_ms: number;
  }>;
}

// Job Monitoring
export interface JobMonitor {
  job_id: string;
  status: 'running' | 'paused' | 'stopped';
  current_execution?: JobExecution;
  queue_position: number;
  estimated_start_time?: string;
  resource_usage: {
    cpu_percent: number;
    memory_mb: number;
    disk_io_mb: number;
  };
  progress: {
    completed_steps: number;
    total_steps: number;
    current_step: string;
    estimated_completion?: string;
  };
}

export interface JobQueueStatus {
  total_jobs: number;
  running_jobs: number;
  queued_jobs: number;
  failed_jobs: number;
  avg_queue_time_ms: number;
  estimated_completion_time?: string;
  system_load: {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
  };
}

// Job Templates
export interface JobTemplate {
  id: string;
  name: string;
  description: string;
  job_type: string;
  default_schedule_config: JobScheduleConfig;
  default_execution_config: JobExecutionConfig;
  default_retry_policy: JobRetryPolicy;
  is_system_template: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface JobTemplateCreateRequest {
  name: string;
  description: string;
  job_type: string;
  default_schedule_config: JobScheduleConfig;
  default_execution_config: JobExecutionConfig;
  default_retry_policy: JobRetryPolicy;
}

// Job Validation
export interface JobValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Job Status Types
export type JobStatus = 'active' | 'inactive' | 'paused' | 'completed' | 'failed';

export type JobType = 'extraction' | 'cleanup' | 'backup' | 'analytics' | 'custom';

export type ScheduleType = 'immediate' | 'scheduled' | 'recurring' | 'manual';

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';

export type TriggerType = 'schedule' | 'manual' | 'api';

export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';

// Job Constants
export const DEFAULT_RETRY_POLICY: JobRetryPolicy = {
  max_retries: 3,
  retry_delay_minutes: 5,
  backoff_multiplier: 2,
  max_retry_delay_minutes: 60,
  retry_on_failure_types: ['timeout', 'network_error', 'temporary_failure'],
};

export const JOB_TYPES: JobType[] = ['extraction', 'cleanup', 'backup', 'analytics', 'custom'];

export const SCHEDULE_TYPES: ScheduleType[] = ['immediate', 'scheduled', 'recurring', 'manual'];

export const EXECUTION_STATUSES: ExecutionStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'];

export const JOB_PRIORITIES: JobPriority[] = ['low', 'normal', 'high', 'urgent'];

// Cron Expression Examples
export const CRON_EXAMPLES = {
  'Every minute': '*/1 * * * *',
  'Every 5 minutes': '*/5 * * * *',
  'Every hour': '0 * * * *',
  'Every day at midnight': '0 0 * * *',
  'Every weekday at 9 AM': '0 9 * * 1-5',
  'Every Sunday at 2 AM': '0 2 * * 0',
  'Every month on the 1st': '0 0 1 * *',
  'Every quarter': '0 0 1 1,4,7,10 *',
  'Every year on January 1st': '0 0 1 1 *',
};
