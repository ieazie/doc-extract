/**
 * Job List Component - Displays and manages extraction jobs
 * Phase 10.4: Frontend Job Management
 */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Plus, Play, Pause, Edit, Trash2, Clock, BarChart3 } from 'lucide-react';
import Table, { ColumnDefinition, FilterDefinition, PaginationConfig } from '@/components/table/Table';
import { Button } from '@/components/ui/Button';
import { apiClient, ExtractionJob, Category, Template } from '@/services/api';
import styled from 'styled-components';
import { useAuth } from '@/contexts/AuthContext';

// Styled Components
const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ActionButton = styled(Button)`
  margin-left: 8px;
  
  &:first-child {
    margin-left: 0;
  }
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
          background-color: ${props.theme.colors.success.light};
          color: ${props.theme.colors.success.dark};
        `;
      case 'inactive':
        return `
          background-color: ${props.theme.colors.gray.light};
          color: ${props.theme.colors.gray.dark};
        `;
      case 'running':
        return `
          background-color: ${props.theme.colors.warning.light};
          color: ${props.theme.colors.warning.dark};
        `;
      case 'failed':
        return `
          background-color: ${props.theme.colors.error.light};
          color: ${props.theme.colors.error.dark};
        `;
      default:
        return `
          background-color: ${props.theme.colors.gray.light};
          color: ${props.theme.colors.gray.dark};
        `;
    }
  }}
`;

const ScheduleBadge = styled.span<{ type: 'immediate' | 'scheduled' | 'recurring' }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  
  ${props => {
    switch (props.type) {
      case 'immediate':
        return `
          background-color: ${props.theme.colors.primary.light};
          color: ${props.theme.colors.primary.dark};
        `;
      case 'scheduled':
        return `
          background-color: ${props.theme.colors.info.light};
          color: ${props.theme.colors.info.dark};
        `;
      case 'recurring':
        return `
          background-color: ${props.theme.colors.warning.light};
          color: ${props.theme.colors.warning.dark};
        `;
      default:
        return `
          background-color: ${props.theme.colors.gray.light};
          color: ${props.theme.colors.gray.dark};
        `;
    }
  }}
`;

const JobStats = styled.div`
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: ${props => props.theme.colors.text.secondary};
`;

const StatItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

interface JobListProps {
  onJobCreate?: () => void;
  onJobEdit?: (job: ExtractionJob) => void;
  onJobExecute?: (job: ExtractionJob) => void;
}

export const JobList: React.FC<JobListProps> = ({
  onJobCreate,
  onJobEdit,
  onJobExecute
}) => {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const [jobs, setJobs] = useState<ExtractionJob[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0
  });

  // Load initial data
  useEffect(() => {
    loadJobs();
    loadCategories();
    loadTemplates();
  }, []);

  const loadJobs = async (params: any = {}) => {
    try {
      setLoading(true);
      const response = await apiClient.getJobs(
        params.page || pagination.page,
        params.per_page || pagination.per_page,
        params.search,
        params.category_id,
        params.template_id,
        params.schedule_type,
        params.is_active,
        params.sort_by,
        params.sort_order
      );
      
      setJobs(response.jobs);
      setPagination({
        page: response.page,
        per_page: response.per_page,
        total: response.total,
        total_pages: response.total_pages
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.getCategories();
      setCategories(response.categories);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await apiClient.getTemplates(1, 100);
      setTemplates(response.templates);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleExecuteJob = async (job: ExtractionJob) => {
    try {
      await apiClient.executeJob(job.id, 'manual');
      if (onJobExecute) {
        onJobExecute(job);
      }
      // Reload jobs to update status
      loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute job');
    }
  };

  const handleDeleteJob = async (job: ExtractionJob) => {
    if (!confirm(`Are you sure you want to delete job "${job.name}"?`)) {
      return;
    }

    try {
      await apiClient.deleteJob(job.id);
      loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete job');
    }
  };

  const handleToggleJob = async (job: ExtractionJob) => {
    try {
      await apiClient.updateJob(job.id, { is_active: !job.is_active });
      loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update job');
    }
  };

  // Column definitions
  const columns: ColumnDefinition<ExtractionJob>[] = [
    {
      key: 'name',
      label: 'Job Name',
      sortable: true,
      render: (value, job) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{value}</div>
          {job.description && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {job.description.length > 50 
                ? `${job.description.substring(0, 50)}...` 
                : job.description}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      render: (value, job) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {job.category && (
            <>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: job.category.color
                }}
              />
              <span>{job.category.name}</span>
            </>
          )}
        </div>
      )
    },
    {
      key: 'template',
      label: 'Template',
      render: (value, job) => (
        <div style={{ fontWeight: 500 }}>
          {job.template?.name || 'Unknown Template'}
        </div>
      )
    },
    {
      key: 'schedule_type',
      label: 'Schedule',
      render: (value) => (
        <ScheduleBadge type={value}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </ScheduleBadge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value, job) => {
        const status = job.is_active ? 'active' : 'inactive';
        return <StatusBadge status={status}>{status}</StatusBadge>;
      }
    },
    {
      key: 'stats',
      label: 'Statistics',
      render: (value, job) => (
        <JobStats>
          <StatItem>
            <BarChart3 size={12} />
            {job.total_executions} runs
          </StatItem>
          <StatItem>
            <Clock size={12} />
            {job.successful_executions} success
          </StatItem>
        </JobStats>
      )
    },
    {
      key: 'last_run_at',
      label: 'Last Run',
      sortable: true,
      render: (value) => value ? apiClient.formatDate(value) : 'Never'
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '200px',
      render: (value, job) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExecuteJob(job)}
            disabled={!job.is_active}
          >
            <Play size={14} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleToggleJob(job)}
          >
            {job.is_active ? <Pause size={14} /> : <Play size={14} />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onJobEdit && onJobEdit(job)}
          >
            <Edit size={14} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDeleteJob(job)}
            style={{ color: '#ef4444' }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )
    }
  ];

  // Filter definitions
  const filters: FilterDefinition[] = [
    {
      key: 'search',
      label: 'Search',
      type: 'search',
      placeholder: 'Search jobs...'
    },
    {
      key: 'category_id',
      label: 'Category',
      type: 'select',
      options: [
        { value: '', label: 'All Categories' },
        ...categories.map(cat => ({
          value: cat.id,
          label: cat.name
        }))
      ]
    },
    {
      key: 'template_id',
      label: 'Template',
      type: 'select',
      options: [
        { value: '', label: 'All Templates' },
        ...templates.map(tpl => ({
          value: tpl.id,
          label: tpl.name
        }))
      ]
    },
    {
      key: 'schedule_type',
      label: 'Schedule Type',
      type: 'select',
      options: [
        { value: '', label: 'All Types' },
        { value: 'immediate', label: 'Immediate' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'recurring', label: 'Recurring' }
      ]
    },
    {
      key: 'is_active',
      label: 'Status',
      type: 'select',
      options: [
        { value: '', label: 'All Status' },
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    }
  ];

  const paginationConfig: PaginationConfig = {
    ...pagination,
    onPageChange: (page) => loadJobs({ page }),
    onPerPageChange: (per_page) => loadJobs({ per_page, page: 1 })
  };

  if (error) {
    return (
      <PageContainer>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h3>Error Loading Jobs</h3>
          <p>{error}</p>
          <Button onClick={() => loadJobs()}>Retry</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Extraction Jobs</PageTitle>
        <ActionButton
          onClick={onJobCreate}
          disabled={!hasPermission('jobs:write')}
        >
          <Plus size={16} />
          Create Job
        </ActionButton>
      </PageHeader>

      <Table
        data={jobs}
        columns={columns}
        filters={filters}
        pagination={paginationConfig}
        loading={loading}
        onFiltersChange={loadJobs}
        onSortChange={loadJobs}
        emptyState={{
          title: 'No Jobs Found',
          description: 'Create your first extraction job to get started.',
          action: onJobCreate ? {
            label: 'Create Job',
            onClick: onJobCreate
          } : undefined
        }}
      />
    </PageContainer>
  );
};

export default JobList;
