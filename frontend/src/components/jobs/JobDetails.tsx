/**
 * Job Details Component - Shows detailed job information and execution history
 * Phase 10.4: Frontend Job Management
 */
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Clock, 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  Repeat
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Table, { ColumnDefinition } from '@/components/table/Table';
import { apiClient, ExtractionJob, JobStatistics, DocumentExtractionTracking } from '@/services/api';
import styled from 'styled-components';

// Styled Components
const JobDetailsContainer = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const JobHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`;

const BackButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const JobTitle = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
  flex: 1;
  margin-left: 16px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const JobInfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const InfoCard = styled(Card)`
  padding: 20px;
`;

const InfoTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0 0 16px 0;
`;

const InfoGrid = styled.div`
  display: grid;
  gap: 12px;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const InfoLabel = styled.span`
  font-size: 14px;
  color: ${props => props.theme.colors.text.secondary};
`;

const InfoValue = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme.colors.text.primary};
`;

const StatusBadge = styled.span<{ status: 'active' | 'inactive' | 'running' | 'failed' }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  
  ${props => {
    switch (props.status) {
      case 'active':
        return `
          background-color: ${props.theme.colors.successLight};
          color: ${props.theme.colors.success};
        `;
      case 'inactive':
        return `
          background-color: ${props.theme.colors.surfaceHover};
          color: ${props.theme.colors.text.secondary};
        `;
      case 'running':
        return `
          background-color: ${props.theme.colors.warningLight};
          color: ${props.theme.colors.warning};
        `;
      case 'failed':
        return `
          background-color: ${props.theme.colors.errorLight};
          color: ${props.theme.colors.error};
        `;
      default:
        return `
          background-color: ${props.theme.colors.surfaceHover};
          color: ${props.theme.colors.text.secondary};
        `;
    }
  }}
`;

const ScheduleBadge = styled.span<{ type: 'immediate' | 'scheduled' | 'recurring' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  
  ${props => {
    switch (props.type) {
      case 'immediate':
        return `
          background-color: ${props.theme.colors.primaryLight};
          color: ${props.theme.colors.primaryDark};
        `;
      case 'scheduled':
        return `
          background-color: ${props.theme.colors.info}20;
          color: ${props.theme.colors.info};
        `;
      case 'recurring':
        return `
          background-color: ${props.theme.colors.warningLight};
          color: ${props.theme.colors.warning};
        `;
      default:
        return `
          background-color: ${props.theme.colors.surfaceHover};
          color: ${props.theme.colors.text.secondary};
        `;
    }
  }}
`;

const StatisticsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled(Card)`
  padding: 20px;
  text-align: center;
`;

const StatIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: ${props => props.theme.colors.primaryLight};
  color: ${props => props.theme.colors.primary};
  margin: 0 auto 12px auto;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.text.secondary};
`;

const HistorySection = styled(Card)`
  padding: 20px;
`;

const HistoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const HistoryTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
`;

// Removed custom table components - using shared Table component instead

const StatusIcon = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  
  ${props => {
    switch (props.status) {
      case 'completed':
        return `color: ${props.theme.colors.success};`;
      case 'failed':
        return `color: ${props.theme.colors.error};`;
      case 'processing':
        return `color: ${props.theme.colors.warning};`;
      case 'pending':
        return `color: ${props.theme.colors.info};`;
      default:
        return `color: ${props.theme.colors.text.secondary};`;
    }
  }}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: ${props => props.theme.colors.text.secondary};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 40px;
  color: ${props => props.theme.colors.text.secondary};
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 40px;
  color: ${props => props.theme.colors.error};
`;

interface JobDetailsProps {
  jobId: string;
  onBack: () => void;
  onEdit: (job: ExtractionJob) => void;
  onDelete: (job: ExtractionJob) => void;
}

export const JobDetails: React.FC<JobDetailsProps> = ({
  jobId,
  onBack,
  onEdit,
  onDelete
}) => {
  const [job, setJob] = useState<ExtractionJob | null>(null);
  const [statistics, setStatistics] = useState<JobStatistics | null>(null);
  const [history, setHistory] = useState<DocumentExtractionTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJobDetails();
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const [jobData, statsData, historyData] = await Promise.all([
        apiClient.getJob(jobId),
        apiClient.getJobStatistics(jobId),
        apiClient.getJobHistory(jobId, 1, 50)
      ]);

      setJob(jobData);
      setStatistics(statsData);
      setHistory(historyData.tracking);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteJob = async () => {
    if (!job) return;

    try {
      await apiClient.executeJob(job.id, 'manual');
      // Reload data to update statistics
      loadJobDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute job');
    }
  };

  const handleToggleJob = async () => {
    if (!job) return;

    try {
      const updatedJob = await apiClient.updateJob(job.id, { is_active: !job.is_active });
      setJob(updatedJob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update job');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} />;
      case 'failed':
        return <XCircle size={16} />;
      case 'processing':
        return <AlertCircle size={16} />;
      case 'pending':
        return <Clock size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getScheduleIcon = (type: string) => {
    switch (type) {
      case 'immediate':
        return <Clock size={14} />;
      case 'scheduled':
        return <Calendar size={14} />;
      case 'recurring':
        return <Repeat size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  if (loading) {
    return (
      <JobDetailsContainer>
        <LoadingState>Loading job details...</LoadingState>
      </JobDetailsContainer>
    );
  }

  if (error) {
    return (
      <JobDetailsContainer>
        <ErrorState>
          <h3>Error Loading Job Details</h3>
          <p>{error}</p>
          <Button onClick={loadJobDetails}>Retry</Button>
        </ErrorState>
      </JobDetailsContainer>
    );
  }

  if (!job) {
    return (
      <JobDetailsContainer>
        <ErrorState>
          <h3>Job Not Found</h3>
          <Button onClick={onBack}>Back to Jobs</Button>
        </ErrorState>
      </JobDetailsContainer>
    );
  }

  return (
    <JobDetailsContainer>
      <JobHeader>
        <BackButton variant="outline" onClick={onBack}>
          <ArrowLeft size={16} />
          Back to Jobs
        </BackButton>
        <JobTitle>{job.name}</JobTitle>
        <ActionButtons>
          <Button
            size="small"
            variant="outline"
            onClick={handleExecuteJob}
            disabled={!job.is_active}
          >
            <Play size={14} />
            Execute
          </Button>
          <Button
            size="small"
            variant="outline"
            onClick={handleToggleJob}
          >
            {job.is_active ? <Pause size={14} /> : <Play size={14} />}
            {job.is_active ? 'Pause' : 'Activate'}
          </Button>
          <Button
            size="small"
            variant="outline"
            onClick={() => onEdit(job)}
          >
            <Edit size={14} />
            Edit
          </Button>
          <Button
            size="small"
            variant="outline"
            onClick={() => onDelete(job)}
            style={{ color: '#ef4444' }}
          >
            <Trash2 size={14} />
            Delete
          </Button>
        </ActionButtons>
      </JobHeader>

      {/* Statistics */}
      {statistics && (
        <StatisticsGrid>
          <StatCard>
            <StatIcon>
              <BarChart3 size={24} />
            </StatIcon>
            <StatValue>{statistics.total_executions}</StatValue>
            <StatLabel>Total Executions</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon>
              <CheckCircle size={24} />
            </StatIcon>
            <StatValue>{statistics.successful_executions}</StatValue>
            <StatLabel>Successful</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon>
              <XCircle size={24} />
            </StatIcon>
            <StatValue>{statistics.failed_executions}</StatValue>
            <StatLabel>Failed</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon>
              <Clock size={24} />
            </StatIcon>
            <StatValue>{Math.round(statistics.success_rate)}%</StatValue>
            <StatLabel>Success Rate</StatLabel>
          </StatCard>
        </StatisticsGrid>
      )}

      {/* Job Information */}
      <JobInfoGrid>
        <InfoCard>
          <InfoTitle>Job Configuration</InfoTitle>
          <InfoGrid>
            <InfoRow>
              <InfoLabel>Status</InfoLabel>
              <StatusBadge status={job.is_active ? 'active' : 'inactive'}>
                {job.is_active ? 'Active' : 'Inactive'}
              </StatusBadge>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Schedule Type</InfoLabel>
              <ScheduleBadge type={job.schedule_type}>
                {getScheduleIcon(job.schedule_type)}
                {job.schedule_type.charAt(0).toUpperCase() + job.schedule_type.slice(1)}
              </ScheduleBadge>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Priority</InfoLabel>
              <InfoValue>{job.priority}/10</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Max Concurrency</InfoLabel>
              <InfoValue>{job.max_concurrency}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Category</InfoLabel>
              <InfoValue>
                {job.category ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: job.category.color
                      }}
                    />
                    {job.category.name}
                  </span>
                ) : 'Unknown'}
              </InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Template</InfoLabel>
              <InfoValue>{job.template?.name || 'Unknown'}</InfoValue>
            </InfoRow>
          </InfoGrid>
        </InfoCard>

        <InfoCard>
          <InfoTitle>Schedule Information</InfoTitle>
          <InfoGrid>
            <InfoRow>
              <InfoLabel>Last Run</InfoLabel>
              <InfoValue>
                {job.last_run_at ? apiClient.formatDate(job.last_run_at) : 'Never'}
              </InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Next Run</InfoLabel>
              <InfoValue>
                {job.next_run_at ? apiClient.formatDate(job.next_run_at) : 'Not scheduled'}
              </InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Created</InfoLabel>
              <InfoValue>{apiClient.formatDate(job.created_at)}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Updated</InfoLabel>
              <InfoValue>{apiClient.formatDate(job.updated_at)}</InfoValue>
            </InfoRow>
            {job.run_at && (
              <InfoRow>
                <InfoLabel>Scheduled Time</InfoLabel>
                <InfoValue>{apiClient.formatDate(job.run_at)}</InfoValue>
              </InfoRow>
            )}
            {job.schedule_config?.cron && (
              <InfoRow>
                <InfoLabel>Cron Expression</InfoLabel>
                <InfoValue style={{ fontFamily: 'monospace' }}>
                  {job.schedule_config.cron}
                </InfoValue>
              </InfoRow>
            )}
          </InfoGrid>
        </InfoCard>
      </JobInfoGrid>

      {/* Description */}
      {job.description && (
        <InfoCard>
          <InfoTitle>Description</InfoTitle>
          <p style={{ color: '#666', margin: 0 }}>{job.description}</p>
        </InfoCard>
      )}

      {/* Execution History */}
      <HistorySection>
        <HistoryHeader>
          <HistoryTitle>Recent Executions</HistoryTitle>
          <Button variant="outline" size="small" onClick={loadJobDetails}>
            Refresh
          </Button>
        </HistoryHeader>

        <Table
          data={history}
          columns={[
            {
              key: 'document',
              label: 'Document',
              render: (value, row: DocumentExtractionTracking) => 
                row.document?.original_filename || 'Unknown Document'
            },
            {
              key: 'status',
              label: 'Status',
              render: (value, row: DocumentExtractionTracking) => (
                <StatusIcon status={row.status}>
                  {getStatusIcon(row.status)}
                  {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                </StatusIcon>
              )
            },
            {
              key: 'triggered_by',
              label: 'Triggered By',
              render: (value, row: DocumentExtractionTracking) => 
                row.triggered_by.charAt(0).toUpperCase() + row.triggered_by.slice(1)
            },
            {
              key: 'queued_at',
              label: 'Queued At',
              render: (value, row: DocumentExtractionTracking) => 
                apiClient.formatDate(row.queued_at)
            },
            {
              key: 'completed_at',
              label: 'Completed At',
              render: (value, row: DocumentExtractionTracking) => 
                row.completed_at ? apiClient.formatDate(row.completed_at) : '-'
            },
            {
              key: 'processing_time_ms',
              label: 'Processing Time',
              render: (value, row: DocumentExtractionTracking) => 
                row.processing_time_ms ? `${row.processing_time_ms}ms` : '-'
            },
            {
              key: 'retry_count',
              label: 'Retries',
              render: (value, row: DocumentExtractionTracking) => row.retry_count
            }
          ]}
          emptyState={{
            icon: <Clock size={48} />,
            title: 'No execution history',
            description: 'No execution history available yet.'
          }}
        />
      </HistorySection>
    </JobDetailsContainer>
  );
};

export default JobDetails;
