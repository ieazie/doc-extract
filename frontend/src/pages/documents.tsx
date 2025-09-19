/**
 * Documents Page - Enhanced with Job Tracking
 * Phase 10.5: Document Status Tracking
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { 
  FileText, 
  RefreshCw, 
  Filter,
  Search,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

import { apiClient } from '../services/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { SuccessMessage } from '../components/common/SuccessMessage';
import { Table, TableFilters, ColumnDefinition, FilterDefinition, PaginationConfig } from '../components/table';
import { StatusBadge, ActionButton, ActionGroup } from '../components/table/Table.styled';

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

const HeaderActions = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: center;
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
`;

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  user-select: none;
`;

const ToggleSwitch = styled.div<{ $active: boolean }>`
  position: relative;
  width: 44px;
  height: 24px;
  background: ${props => props.$active ? '#3b82f6' : '#d1d5db'};
  border-radius: 12px;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${props => props.$active ? '22px' : '2px'};
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const HiddenCheckbox = styled.input`
  position: absolute;
  opacity: 0;
  pointer-events: none;
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background: #2563eb;
  }
  
  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const JobStatusBadge = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  
  ${props => {
    switch (props.status) {
      case 'completed':
        return `
          background-color: #dcfce7;
          color: #166534;
        `;
      case 'failed':
        return `
          background-color: #fef2f2;
          color: #dc2626;
        `;
      case 'processing':
        return `
          background-color: #fef3c7;
          color: #d97706;
        `;
      case 'pending':
        return `
          background-color: #f3f4f6;
          color: #6b7280;
        `;
      default:
        return `
          background-color: #f3f4f6;
          color: #6b7280;
        `;
    }
  }}
`;

const JobStatsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.875rem;
  color: #6b7280;
`;

const JobStat = styled.span<{ type: 'success' | 'failed' | 'pending' }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  ${props => {
    switch (props.type) {
      case 'success':
        return 'color: #16a34a;';
      case 'failed':
        return 'color: #dc2626;';
      case 'pending':
        return 'color: #d97706;';
      default:
        return 'color: #6b7280;';
    }
  }}
`;

// Custom hook for debounced search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Main Component
const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [includeTracking, setIncludeTracking] = useState(true);
  
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 25,
    total: 0,
    total_pages: 0
  });

  // Filter state management
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    extraction_status: '',
    job_status: ''
  });

  const debouncedSearch = useDebounce(searchInput, 600);

  // Load documents
  const loadDocuments = useCallback(async (params: any = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Merge current filters with new params
      const mergedParams = { ...filters, ...params };

      const response = await apiClient.getDocuments(
        mergedParams.page || pagination.page,
        mergedParams.per_page || pagination.per_page,
        mergedParams.search,
        mergedParams.category_id,
        mergedParams.document_type_id,
        mergedParams.tags,
        mergedParams.status,
        mergedParams.extraction_status,
        mergedParams.job_status,
        mergedParams.sort_by || 'created_at',
        mergedParams.sort_order || 'desc',
        includeTracking
      );

      setDocuments(response.documents);
      setPagination({
        page: response.page,
        per_page: response.per_page,
        total: response.total,
        total_pages: response.total_pages
      });
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.per_page, includeTracking, filters]);

  // Load documents when component mounts
  useEffect(() => {
    loadDocuments();
  }, []);

  // Update search when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      const newFilters = { ...filters, search: debouncedSearch };
      setFilters(newFilters);
    }
  }, [debouncedSearch, filters.search]);

  // Load documents when filters change (excluding search which is handled separately)
  useEffect(() => {
    if (filters.search === debouncedSearch) {
      loadDocuments({ page: 1 });
    }
  }, [filters.status, filters.extraction_status, filters.job_status, filters.search, debouncedSearch]);

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  // Handle sort changes
  const handleSort = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    loadDocuments({ sort_by: sortBy, sort_order: sortOrder });
  };

  // Handle clear filters
  const handleClearFilters = () => {
    const clearedFilters = {
      search: '',
      status: '',
      extraction_status: '',
      job_status: ''
    };
    setFilters(clearedFilters);
    setSearchInput('');
  };

  // Handle document actions
  const handleViewDocument = (documentId: string) => {
    // TODO: Implement document viewer
    console.log('View document:', documentId);
  };

  const handleDownloadDocument = (documentId: string) => {
    // TODO: Implement document download
    console.log('Download document:', documentId);
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      // TODO: Implement document deletion
      console.log('Delete document:', documentId);
      setSuccessMessage('Document deleted successfully');
      loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  // Filter definitions
  const filterDefinitions: FilterDefinition[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'uploaded', label: 'Uploaded' },
        { value: 'processing', label: 'Processing' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' }
      ]
    },
    {
      key: 'extraction_status',
      label: 'Extraction Status',
      type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'extracting', label: 'Extracting' },
        { value: 'extracted', label: 'Extracted' },
        { value: 'error', label: 'Error' }
      ]
    },
    {
      key: 'job_status',
      label: 'Job Status',
      type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'processing', label: 'Processing' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' }
      ]
    }
  ];

  // Column definitions
  const columns: ColumnDefinition[] = [
    {
      key: 'original_filename',
      label: 'Document',
      sortable: true,
      width: '2fr',
      render: (value: string, row: any) => (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          minWidth: 0,
          overflow: 'hidden'
        }}>
          <FileText size={18} color="#6b7280" style={{ flexShrink: 0 }} />
          <span 
            title={value}
            style={{ 
              fontWeight: '500',
              fontSize: '0.875rem',
              color: '#1f2937',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {value}
          </span>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      sortable: false,
      width: '120px',
      render: (value: any) => value ? (
        <StatusBadge 
          status="active" 
          style={{ 
            backgroundColor: value.color + '20', 
            color: value.color,
            border: `1px solid ${value.color}40`,
            fontSize: '0.75rem',
            padding: '0.25rem 0.5rem'
          }}
        >
          {value.name}
        </StatusBadge>
      ) : '-'
    },
    {
      key: 'status',
      label: 'Document Status',
      sortable: true,
      width: '140px',
      render: (value: string) => (
        <StatusBadge status={value} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
          {value}
        </StatusBadge>
      )
    },
    {
      key: 'extraction_status',
      label: 'Extraction Status',
      sortable: true,
      width: '140px',
      render: (value: string) => (
        <StatusBadge status={value} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
          {value}
        </StatusBadge>
      )
    },
    {
      key: 'detected_language',
      label: 'Language',
      sortable: true,
      width: '120px',
      render: (value: string, row: any) => {
        if (!value) return <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>-</span>;
        
        const confidence = row.language_confidence;
        const confidenceColor = confidence > 0.7 ? '#059669' : confidence > 0.4 ? '#d97706' : '#dc2626';
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            <span style={{ 
              fontSize: '0.75rem',
              fontWeight: '500',
              color: '#1f2937'
            }}>
              {value}
            </span>
            {confidence !== undefined && confidence !== null && (
              <span style={{ 
                fontSize: '0.625rem',
                color: confidenceColor,
                fontWeight: '500'
              }}>
                {(confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
        );
      }
    },
    ...(includeTracking ? [
      {
        key: 'job_tracking',
        label: 'Job Status',
        sortable: false,
        width: '120px',
        render: (value: any[], row: any) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {row.total_jobs_processed > 0 ? (
              <JobStatsContainer>
                {row.successful_jobs > 0 && (
                  <JobStat type="success">
                    <CheckCircle size={12} />
                    {row.successful_jobs}
                  </JobStat>
                )}
                {row.failed_jobs > 0 && (
                  <JobStat type="failed">
                    <XCircle size={12} />
                    {row.failed_jobs}
                  </JobStat>
                )}
                {row.pending_jobs > 0 && (
                  <JobStat type="pending">
                    <AlertCircle size={12} />
                    {row.pending_jobs}
                  </JobStat>
                )}
              </JobStatsContainer>
            ) : (
              <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>No jobs</span>
            )}
          </div>
        )
      }
    ] : []),
    {
      key: 'created_at',
      label: 'Uploaded',
      sortable: true,
      width: '120px',
      align: 'center',
      render: (value: string) => (
        <span style={{ 
          fontSize: '0.875rem',
          color: '#6b7280',
          fontFamily: 'monospace'
        }}>
          {new Date(value).toLocaleDateString()}
        </span>
      )
    }
  ];

  // Pagination configuration
  const paginationConfig: PaginationConfig = {
    page: pagination.page,
    perPage: pagination.per_page,
    total: pagination.total,
    totalPages: pagination.total_pages,
    onPageChange: (page) => loadDocuments({ page }),
    onPerPageChange: (per_page) => loadDocuments({ per_page, page: 1 }),
    mode: 'server'
  };

  // Removed actions column as requested - this is a processed documents log, not document management

  return (
    <PageContainer>
      {successMessage && (
        <SuccessMessage message={successMessage} />
      )}

      <PageHeader>
        <PageTitle>
          <FileText size={24} />
          Documents
        </PageTitle>
        <HeaderActions>
          <ToggleContainer>
            <ToggleLabel>
              <Settings size={16} color="#6b7280" />
              <span>Job Tracking</span>
            </ToggleLabel>
            <HiddenCheckbox
              type="checkbox"
              checked={includeTracking}
              onChange={(e) => setIncludeTracking(e.target.checked)}
            />
            <ToggleSwitch 
              $active={includeTracking}
              onClick={() => setIncludeTracking(!includeTracking)}
            />
          </ToggleContainer>
          
          <RefreshButton onClick={() => loadDocuments()} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </RefreshButton>
        </HeaderActions>
      </PageHeader>

      <TableFilters
        filters={filterDefinitions}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        isSearching={loading}
        searchMinLength={2}
      />

      <Table
        data={documents}
        columns={columns}
        pagination={paginationConfig}
        loading={loading}
        error={error ? 'Failed to load documents' : undefined}
        emptyState={{
          icon: <FileText size={48} />,
          title: 'No documents found',
          description: 'Upload documents to get started with document processing.'
        }}
        actions={undefined}
        onSort={handleSort}
      />
    </PageContainer>
  );
};

export default DocumentsPage;
