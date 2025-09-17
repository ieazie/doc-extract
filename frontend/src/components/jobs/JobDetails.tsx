/**
 * Job Details Component - Professional job information and execution history
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
  Repeat,
  RefreshCw,
  Activity,
  Target,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Table, { ColumnDefinition } from '@/components/table/Table';
import { apiClient, ExtractionJob, JobStatistics, DocumentExtractionTracking } from '@/services/api';
import styled from 'styled-components';

// Professional Styled Components
const JobDetailsContainer = styled.div`
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
  background-color: #fafafa;
  min-height: 100vh;
`;

const PageHeader = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const BackButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  border-color: #e5e7eb;
  
  &:hover {
    border-color: #d1d5db;
    background-color: #f9fafb;
  }
`;

const JobTitle = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin: 0;
  flex: 1;
  margin-left: 16px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const JobStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
`;

const StatusBadge = styled.span<{ status: 'active' | 'inactive' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  
  ${props => props.status === 'active' ? `
    background-color: #dcfce7;
    color: #166534;
  ` : `
    background-color: #f3f4f6;
    color: #6b7280;
  `}
`;

const ScheduleInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 14px;
`;

const InfoPanelsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FullWidthSection = styled.div`
  width: 100%;
`;

const StatisticsCard = styled(Card)`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const StatsTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StatItem = styled.div`
  text-align: center;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const StatIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: #f3f4f6;
  color: #6b7280;
  margin: 0 auto 8px auto;
`;

const StatValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
`;

const InfoCard = styled(Card)`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const InfoTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const InfoGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
  
  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
`;

const InfoValue = styled.span`
  font-size: 14px;
  color: #111827;
  font-weight: 500;
`;

const ScheduleBadge = styled.span<{ type: 'immediate' | 'scheduled' | 'recurring' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background-color: #f3f4f6;
  color: #6b7280;
`;

const HistorySection = styled(Card)`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const HistoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const HistoryTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RefreshButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6b7280;
  border-color: #e5e7eb;
  
  &:hover {
    border-color: #d1d5db;
    background-color: #f9fafb;
  }
`;

const StatusIcon = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  
  ${props => {
    switch (props.status) {
      case 'completed':
        return `color: #059669;`;
      case 'failed':
        return `color: #dc2626;`;
      case 'processing':
        return `color: #d97706;`;
      case 'pending':
        return `color: #2563eb;`;
      default:
        return `color: #6b7280;`;
    }
  }}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #dc2626;
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
      {/* Professional Header */}
      <PageHeader>
        <HeaderTop>
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
              style={{ color: '#dc2626', borderColor: '#fecaca' }}
            >
              <Trash2 size={14} />
              Delete
            </Button>
          </ActionButtons>
        </HeaderTop>
        
        <JobStatus>
          <StatusBadge status={job.is_active ? 'active' : 'inactive'}>
            <Activity size={12} />
            {job.is_active ? 'Active' : 'Inactive'}
          </StatusBadge>
          <ScheduleInfo>
            {getScheduleIcon(job.schedule_type)}
            {job.schedule_type.charAt(0).toUpperCase() + job.schedule_type.slice(1)} Job
            {job.schedule_type === 'recurring' && job.schedule_config?.cron && (
              <> • {job.schedule_config.cron}</>
            )}
          </ScheduleInfo>
        </JobStatus>
      </PageHeader>

      {/* Information Panels */}
      <InfoPanelsGrid>
        {/* Statistics */}
        {statistics && (
          <StatisticsCard>
            <StatsTitle>
              <BarChart3 size={18} />
              Performance Metrics
            </StatsTitle>
            <StatsGrid>
              <StatItem>
                <StatIcon>
                  <Target size={18} />
                </StatIcon>
                <StatValue>{statistics.total_executions}</StatValue>
                <StatLabel>Total Executions</StatLabel>
              </StatItem>
              <StatItem>
                <StatIcon>
                  <CheckCircle size={18} />
                </StatIcon>
                <StatValue>{statistics.successful_executions}</StatValue>
                <StatLabel>Successful</StatLabel>
              </StatItem>
              <StatItem>
                <StatIcon>
                  <XCircle size={18} />
                </StatIcon>
                <StatValue>{statistics.failed_executions}</StatValue>
                <StatLabel>Failed</StatLabel>
              </StatItem>
              <StatItem>
                <StatIcon>
                  <Activity size={18} />
                </StatIcon>
                <StatValue>{Math.round(statistics.success_rate)}%</StatValue>
                <StatLabel>Success Rate</StatLabel>
              </StatItem>
            </StatsGrid>
          </StatisticsCard>
        )}

        {/* Job Configuration */}
        <InfoCard>
          <InfoTitle>
            <Settings size={16} />
            Job Configuration
          </InfoTitle>
          <InfoGrid>
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

        {/* Schedule Information */}
        <InfoCard>
          <InfoTitle>
            <Calendar size={16} />
            Schedule Information
          </InfoTitle>
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
                <InfoValue style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                  {job.schedule_config.cron}
                </InfoValue>
              </InfoRow>
            )}
          </InfoGrid>
        </InfoCard>

        {/* Description */}
        {job.description && (
          <InfoCard>
            <InfoTitle>
              <Edit size={16} />
              Description
            </InfoTitle>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
              {job.description}
            </p>
          </InfoCard>
        )}
      </InfoPanelsGrid>

      {/* Full Width Execution History */}
      <FullWidthSection>
        <HistorySection>
          <HistoryHeader>
            <HistoryTitle>
              <Clock size={18} />
              Recent Executions
            </HistoryTitle>
            <RefreshButton variant="outline" size="small" onClick={loadJobDetails}>
              <RefreshCw size={14} />
              Refresh
            </RefreshButton>
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
      </FullWidthSection>
    </JobDetailsContainer>
  );
};

export default JobDetails;
