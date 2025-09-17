/**
 * Job List Component - Displays and manages extraction jobs
 * Phase 10.4: Frontend Job Management
 */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Plus, Play, Pause, Edit, Trash2, Clock, BarChart3, Eye } from 'lucide-react';
import { Table, TableFilters, ColumnDefinition, FilterDefinition, PaginationConfig } from '@/components/table';
import { Button } from '@/components/ui/Button';
import { apiClient, ExtractionJob, Category } from '@/services/api';
import styled from 'styled-components';
import { useAuth } from '@/contexts/AuthContext';

// Utility function to validate UUID
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

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
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border: 1px solid transparent;
  line-height: 1;
  
  ${props => {
    switch (props.status) {
      case 'active':
        return `
          background-color: #dcfce7;
          color: #166534;
          border-color: #bbf7d0;
        `;
      case 'inactive':
        return `
          background-color: #f3f4f6;
          color: #6b7280;
          border-color: #e5e7eb;
        `;
      case 'running':
        return `
          background-color: #fef3c7;
          color: #92400e;
          border-color: #fde68a;
        `;
      case 'failed':
        return `
          background-color: #fee2e2;
          color: #dc2626;
          border-color: #fecaca;
        `;
      default:
        return `
          background-color: #f3f4f6;
          color: #6b7280;
          border-color: #e5e7eb;
        `;
    }
  }}
`;

const ScheduleBadge = styled.span<{ type: 'immediate' | 'scheduled' | 'recurring' }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border: 1px solid transparent;
  line-height: 1;
  
  ${props => {
    switch (props.type) {
      case 'immediate':
        return `
          background-color: #dbeafe;
          color: #1e40af;
          border-color: #bfdbfe;
        `;
      case 'scheduled':
        return `
          background-color: #e0e7ff;
          color: #3730a3;
          border-color: #c7d2fe;
        `;
      case 'recurring':
        return `
          background-color: #fef3c7;
          color: #92400e;
          border-color: #fde68a;
        `;
      default:
        return `
          background-color: #f3f4f6;
          color: #6b7280;
          border-color: #e5e7eb;
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
  onJobDetails?: (job: ExtractionJob) => void;
}

export const JobList: React.FC<JobListProps> = ({
  onJobCreate,
  onJobEdit,
  onJobExecute,
  onJobDetails
}) => {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const [jobs, setJobs] = useState<ExtractionJob[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0
  });

  // Filter state management
  const [filterValues, setFilterValues] = useState({
    search: '',
    category_id: '',
    template_id: '',
    schedule_type: '',
    is_active: ''
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
      
      // Merge current filters with new params
      const mergedParams = { ...filterValues, ...params };
      
      // Convert string values to proper types for API - only send defined values
      const apiParams: any = {
        page: mergedParams.page || pagination.page,
        perPage: mergedParams.per_page || pagination.per_page,
      };
      
      // Only add parameters if they have valid values
      if (mergedParams.search && mergedParams.search.trim() !== '') {
        apiParams.search = mergedParams.search.trim();
      }
      if (mergedParams.category_id && mergedParams.category_id.trim() !== '' && isValidUUID(mergedParams.category_id.trim())) {
        apiParams.categoryId = mergedParams.category_id.trim();
      }
      if (mergedParams.template_id && mergedParams.template_id.trim() !== '' && isValidUUID(mergedParams.template_id.trim())) {
        apiParams.templateId = mergedParams.template_id.trim();
      }
      if (mergedParams.schedule_type && mergedParams.schedule_type.trim() !== '') {
        const validScheduleTypes = ['immediate', 'scheduled', 'recurring'];
        if (validScheduleTypes.includes(mergedParams.schedule_type)) {
          apiParams.scheduleType = mergedParams.schedule_type;
        }
      }
      if (mergedParams.is_active && mergedParams.is_active !== '') {
        apiParams.isActive = mergedParams.is_active === 'true';
      }
      if (mergedParams.sort_by && mergedParams.sort_by.trim() !== '') {
        apiParams.sortBy = mergedParams.sort_by.trim();
      }
      if (mergedParams.sort_order && ['asc', 'desc'].includes(mergedParams.sort_order)) {
        apiParams.sortOrder = mergedParams.sort_order;
      }
      
      const response = await apiClient.getJobs(
        apiParams.page,
        apiParams.perPage,
        apiParams.search,
        apiParams.categoryId,
        apiParams.templateId,
        apiParams.scheduleType,
        apiParams.isActive,
        apiParams.sortBy,
        apiParams.sortOrder
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

  // Load jobs when filter values change
  useEffect(() => {
    loadJobs({ page: 1 });
  }, [filterValues.search, filterValues.category_id, filterValues.template_id, filterValues.schedule_type, filterValues.is_active]);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filterValues, [key]: value };
    setFilterValues(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      search: '',
      category_id: '',
      template_id: '',
      schedule_type: '',
      is_active: ''
    };
    setFilterValues(clearedFilters);
  };

  // Column definitions
  const columns: ColumnDefinition<ExtractionJob>[] = [
    {
      key: 'name',
      label: 'Job Name',
      sortable: true,
      width: '300px', // Increased width for better readability
      render: (value, job) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: '14px' }}>{value}</div>
          {job.description && (
            <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.4' }}>
              {job.description.length > 80 
                ? `${job.description.substring(0, 80)}...` 
                : job.description}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      width: '100px',
      render: (value, job) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {job.category && (
            <>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: job.category.color
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#374151' }}>
                {job.category.name}
              </span>
            </>
          )}
        </div>
      )
    },
    {
      key: 'template',
      label: 'Template',
      width: '160px',
      render: (value, job) => (
        <div style={{ fontWeight: 500, color: '#374151', fontSize: '12px' }}>
          {job.template?.name || 'Unknown Template'}
        </div>
      )
    },
    {
      key: 'schedule_type',
      label: 'Schedule',
      width: '90px',
      render: (value) => (
        <ScheduleBadge type={value}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </ScheduleBadge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: '80px',
      render: (value, job) => {
        const status = job.is_active ? 'active' : 'inactive';
        return <StatusBadge status={status}>{status}</StatusBadge>;
      }
    },
    {
      key: 'stats',
      label: 'Statistics',
      width: '140px',
      render: (value, job) => {
        const total = job.total_executions;
        const successful = job.successful_executions;
        const failed = job.failed_executions;
        const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;
        
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 2,
            alignItems: 'flex-start'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4, 
              fontSize: '11px',
              lineHeight: '1.2'
            }}>
              <BarChart3 size={10} color="#6b7280" />
              <span style={{ color: '#374151', fontWeight: 500 }}>{total}</span>
              <span style={{ color: '#6b7280' }}>runs</span>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4, 
              fontSize: '11px',
              lineHeight: '1.2'
            }}>
              <Clock size={10} color="#059669" />
              <span style={{ color: '#059669', fontWeight: 500 }}>{successful}</span>
              <span style={{ color: '#6b7280' }}>success</span>
              {total > 0 && (
                <span style={{ 
                  color: successRate >= 80 ? '#059669' : successRate >= 60 ? '#f59e0b' : '#dc2626',
                  fontSize: '10px',
                  fontWeight: 600,
                  marginLeft: '2px'
                }}>
                  ({successRate}%)
                </span>
              )}
            </div>
            {failed > 0 && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 4, 
                fontSize: '11px',
                lineHeight: '1.2'
              }}>
                <Clock size={10} color="#dc2626" />
                <span style={{ color: '#dc2626', fontWeight: 500 }}>{failed}</span>
                <span style={{ color: '#6b7280' }}>failed</span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'last_run_at',
      label: 'Last Run',
      sortable: true,
      width: '120px',
      render: (value, job) => {
        if (!value) {
          return <span style={{ color: '#9ca3af', fontSize: '11px' }}>Never</span>;
        }
        
        const lastRun = new Date(value);
        const now = new Date();
        const diffMs = now.getTime() - lastRun.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        let timeAgo = '';
        if (diffDays > 0) {
          timeAgo = `${diffDays}d ago`;
        } else if (diffHours > 0) {
          timeAgo = `${diffHours}h ago`;
        } else {
          timeAgo = 'Just now';
        }
        
        return (
          <div style={{ fontSize: '11px', lineHeight: '1.2' }}>
            <div style={{ fontWeight: 500, color: '#374151' }}>
              {lastRun.toLocaleDateString()}
            </div>
            <div style={{ color: '#6b7280', fontSize: '10px' }}>
              {timeAgo}
            </div>
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '180px',
      render: (value, job) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            size="small"
            variant="outline"
            onClick={() => handleExecuteJob(job)}
            disabled={!job.is_active}
            title={job.is_active ? "Execute job now" : "Job is inactive"}
            style={{ 
              padding: '6px',
              borderColor: job.is_active ? '#3b82f6' : '#d1d5db',
              color: job.is_active ? '#3b82f6' : '#9ca3af'
            }}
          >
            <Play size={14} />
          </Button>
          <Button
            size="small"
            variant="outline"
            onClick={() => onJobDetails && onJobDetails(job)}
            title="View job details"
            style={{ 
              padding: '6px',
              borderColor: '#2563eb',
              color: '#2563eb'
            }}
          >
            <Eye size={14} />
          </Button>
          <Button
            size="small"
            variant="outline"
            onClick={() => handleToggleJob(job)}
            title={job.is_active ? "Pause job" : "Activate job"}
            style={{ 
              padding: '6px',
              borderColor: job.is_active ? '#f59e0b' : '#10b981',
              color: job.is_active ? '#f59e0b' : '#10b981'
            }}
          >
            {job.is_active ? <Pause size={14} /> : <Play size={14} />}
          </Button>
          <Button
            size="small"
            variant="outline"
            onClick={() => onJobEdit && onJobEdit(job)}
            title="Edit job"
            style={{ 
              padding: '6px',
              borderColor: '#6b7280',
              color: '#6b7280'
            }}
          >
            <Edit size={14} />
          </Button>
          <Button
            size="small"
            variant="outline"
            onClick={() => handleDeleteJob(job)}
            title="Delete job"
            style={{ 
              padding: '6px',
              borderColor: '#ef4444',
              color: '#ef4444'
            }}
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
    page: pagination.page,
    perPage: pagination.per_page,
    total: pagination.total,
    totalPages: pagination.total_pages,
    onPageChange: (page) => loadJobs({ page }),
    onPerPageChange: (per_page) => loadJobs({ per_page, page: 1 }),
    mode: 'server'
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

      <TableFilters
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      <Table
        data={jobs}
        columns={columns}
        pagination={paginationConfig}
        loading={loading}
        onSort={(key, direction) => loadJobs({ sort_by: key, sort_order: direction })}
        emptyState={{
          title: 'No Jobs Found',
          description: 'Create your first extraction job to get started.'
        }}
      />
    </PageContainer>
  );
};

export default JobList;
