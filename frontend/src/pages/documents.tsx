/**
 * Documents Page - Enhanced with Job Tracking
 * Phase 10.5: Document Status Tracking
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  RefreshCw, 
  Filter,
  Search,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play
} from 'lucide-react';

import { apiClient } from '../services/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { SuccessMessage } from '../components/common/SuccessMessage';
import { Table, ColumnDefinition, FilterDefinition, PaginationConfig } from '../components/table/Table';
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
  gap: 1rem;
  align-items: center;
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
    per_page: 20,
    total: 0,
    total_pages: 0
  });

  const debouncedSearch = useDebounce(searchInput, 600);

  // Load documents
  const loadDocuments = useCallback(async (params: any = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getDocuments(
        params.page || pagination.page,
        params.per_page || pagination.per_page,
        params.search,
        params.category_id,
        params.document_type_id,
        params.tags,
        params.status,
        params.extraction_status,
        params.job_status,
        params.sort_by || 'created_at',
        params.sort_order || 'desc',
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
  }, [pagination.page, pagination.per_page, includeTracking]);

  // Load documents when component mounts or dependencies change
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Update search when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== searchInput) {
      loadDocuments({ search: debouncedSearch, page: 1 });
    }
  }, [debouncedSearch, loadDocuments]);

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    loadDocuments({ [key]: value, page: 1 });
  };

  // Handle sort changes
  const handleSort = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    loadDocuments({ sort_by: sortBy, sort_order: sortOrder });
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchInput('');
    loadDocuments({ page: 1 });
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
      render: (value: string, row: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={16} color="#6b7280" />
          <span style={{ fontWeight: '500' }}>{value}</span>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      sortable: false,
      render: (value: any) => value ? (
        <StatusBadge 
          status="active" 
          style={{ 
            backgroundColor: value.color + '20', 
            color: value.color,
            border: `1px solid ${value.color}40`
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
      render: (value: string) => (
        <StatusBadge status={value}>
          {value}
        </StatusBadge>
      )
    },
    {
      key: 'extraction_status',
      label: 'Extraction Status',
      sortable: true,
      render: (value: string) => (
        <StatusBadge status={value}>
          {value}
        </StatusBadge>
      )
    },
    ...(includeTracking ? [
      {
        key: 'job_tracking',
        label: 'Job Status',
        sortable: false,
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
              <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No jobs</span>
            )}
          </div>
        )
      }
    ] : []),
    {
      key: 'created_at',
      label: 'Uploaded',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    }
  ];

  // Pagination configuration
  const paginationConfig: PaginationConfig = {
    ...pagination,
    onPageChange: (page) => loadDocuments({ page }),
    onPerPageChange: (per_page) => loadDocuments({ per_page, page: 1 }),
    mode: 'server'
  };

  // Actions render function
  const renderActions = (row: any) => (
    <ActionGroup>
      <ActionButton
        title="View Document"
        onClick={() => handleViewDocument(row.id)}
      >
        <Eye size={16} />
      </ActionButton>
      <ActionButton
        title="Download Document"
        onClick={() => handleDownloadDocument(row.id)}
      >
        <Download size={16} />
      </ActionButton>
      <ActionButton
        variant="danger"
        title="Delete Document"
        onClick={() => handleDeleteDocument(row.id)}
      >
        <Trash2 size={16} />
      </ActionButton>
    </ActionGroup>
  );

  return (
    <PageContainer>
      {successMessage && (
        <SuccessMessage
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}

      <PageHeader>
        <PageTitle>
          <FileText size={24} />
          Documents
        </PageTitle>
        <HeaderActions>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={includeTracking}
              onChange={(e) => setIncludeTracking(e.target.checked)}
            />
            Show Job Tracking
          </label>
          <RefreshButton onClick={() => loadDocuments()} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </RefreshButton>
        </HeaderActions>
      </PageHeader>

      <Table
        data={documents}
        columns={columns}
        filters={filterDefinitions}
        filterValues={{
          status: '',
          extraction_status: '',
          job_status: '',
          search: searchInput
        }}
        pagination={paginationConfig}
        loading={loading}
        error={error ? 'Failed to load documents' : undefined}
        emptyState={{
          icon: <FileText size={48} />,
          title: 'No documents found',
          description: 'Upload documents to get started with document processing.'
        }}
        actions={renderActions}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        onClearFilters={handleClearFilters}
        isSearching={loading}
        searchMinLength={2}
      />
    </PageContainer>
  );
};

export default DocumentsPage;
