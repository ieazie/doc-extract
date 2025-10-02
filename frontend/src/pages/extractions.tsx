/**
 * Extractions Page
 * Professional table-based interface for managing document extractions
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { 
  Play, 
  Eye, 
  Trash2, 
  Download, 
  RefreshCw, 
  Filter,
  Search,
  Calendar,
  FileText,
  Zap
} from 'lucide-react';

import { ExtractionService, serviceFactory } from '../services/api/index';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { SuccessMessage } from '../components/common/SuccessMessage';
import { ExtractionResultsModal } from '../components/extractions/ExtractionResultsModal';
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
  gap: 1rem;
  align-items: center;
`;

// Styled components for table cell content
const CellContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  width: 100%;
`;

const CellText = styled.div`
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  flex: 1;
  min-width: 0;
  max-width: 100%;
`;

const CellSubText = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.2;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  flex: 1;
  min-width: 0;
  max-width: 100%;
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

// Helper function to build API parameters
const buildApiParams = (filters: any) => {
  const apiParams: any = {
    page: filters.page,
    per_page: filters.per_page,
    sort_by: filters.sort_by,
    sort_order: filters.sort_order
  };

  // Only add parameters that have values
  if (filters.status) apiParams.status = filters.status;
  if (filters.review_status) apiParams.review_status = filters.review_status;
  if (filters.confidence_max) apiParams.confidence_max = parseFloat(filters.confidence_max);
  if (filters.date_from) apiParams.date_from = filters.date_from;
  if (filters.date_to) apiParams.date_to = filters.date_to;
  if (filters.search) apiParams.search = filters.search;

  return apiParams;
};

// Main Component
const ExtractionsPage: React.FC = () => {
  const [filters, setFilters] = useState({
    status: '',
    review_status: '',
    confidence_max: '',
    date_from: '',
    date_to: '',
    search: '',
    page: 1,
    per_page: 10,
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  const [searchInput, setSearchInput] = useState('');
  const [selectedExtractionId, setSelectedExtractionId] = useState<string | null>(null);
  const [resultsModalOpen, setResultsModalOpen] = useState<boolean>(false);
  
  // Data state
  const [extractionsData, setExtractionsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClearingFilters, setIsClearingFilters] = useState(false);
  
  // Debounce search input with 600ms delay to reduce API calls
  const debouncedSearch = useDebounce(searchInput, 600);

  // Sync debounced search with filters - simple debounced update
  useEffect(() => {
    if (debouncedSearch !== filters.search && !isClearingFilters) {
      setFilters(prev => ({
        ...prev,
        search: debouncedSearch,
        page: 1 // Reset to first page when search changes
      }));
    }
  }, [debouncedSearch, filters.search, isClearingFilters]);

  // Fetch data when filters change (including initial load)
  useEffect(() => {
    const fetchExtractions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const extractionService = serviceFactory.get<ExtractionService>('extractions');
        const data = await extractionService.getExtractions(buildApiParams(filters));
        setExtractionsData(data || { extractions: [], total: 0, page: 1, per_page: 10, total_pages: 0 });
      } catch (err) {
        setError('Failed to load extractions');
        console.error('Error fetching extractions:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExtractions();
  }, [filters.status, filters.review_status, filters.confidence_max, filters.date_from, filters.date_to, filters.search, filters.page, filters.per_page, filters.sort_by, filters.sort_order]);


  // Delete extraction function
  const deleteExtraction = async (extractionId: string) => {
    try {
      const extractionService = serviceFactory.get<ExtractionService>('extractions');
      await extractionService.deleteExtraction(extractionId);
      // Refresh the data after successful deletion
      const data = await extractionService.getExtractions(buildApiParams(filters));
      setExtractionsData(data || { extractions: [], total: 0, page: 1, per_page: 10, total_pages: 0 });
    } catch (err) {
      console.error('Error deleting extraction:', err);
      // You could add a toast notification here
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'search') {
      // For search, update the input state (debounced search will handle the actual filtering)
      setSearchInput(value);
    } else {
      // For other filters, update immediately
      setFilters(prev => ({
        ...prev,
        [key]: value,
        page: 1 // Reset to first page when filtering
      }));
    }
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handlePerPageChange = (perPage: number) => {
    setFilters(prev => ({ ...prev, per_page: perPage, page: 1 }));
  };

  const handleDeleteExtraction = (extractionId: string) => {
    if (window.confirm('Are you sure you want to delete this extraction?')) {
      deleteExtraction(extractionId);
    }
  };

  const handleViewResults = (extractionId: string) => {
    setSelectedExtractionId(extractionId);
    setResultsModalOpen(true);
  };

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setFilters(prev => ({
      ...prev,
      sort_by: key,
      sort_order: direction,
      page: 1 // Reset to first page when sorting
    }));
  };

  const handleClearFilters = () => {
    // Set clearing flag to prevent debounced search from triggering
    setIsClearingFilters(true);
    
    // Clear data immediately to show empty state with clear button
    setExtractionsData(null);
    
    // Clear both search input and filters simultaneously
    setSearchInput('');
    setFilters({
      page: 1,
      per_page: 10,
      sort_by: 'created_at',
      sort_order: 'desc',
      status: '',
      review_status: '',
      confidence_max: '',
      date_from: '',
      date_to: '',
      search: ''
    });
    
    // Reset clearing flag after a short delay
    setTimeout(() => {
      setIsClearingFilters(false);
    }, 100);
  };

  const handleCloseResultsModal = () => {
    setResultsModalOpen(false);
    setSelectedExtractionId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Column definitions for the table
  const columns: ColumnDefinition[] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: '0.8fr',
      align: 'left',
      render: (value) => (
        <span style={{ 
          fontFamily: 'monospace', 
          fontSize: '0.75rem'
        }}>
          {value.slice(0, 8)}...
        </span>
      )
    },
    {
      key: 'document_name',
      label: 'Document',
      sortable: true,
      width: '2fr',
      align: 'left',
      render: (value, row) => (
        <CellContainer>
          <CellText>
            {value}
          </CellText>
          <CellSubText>
            {row.document_id.slice(0, 8)}...
          </CellSubText>
        </CellContainer>
      )
    },
    {
      key: 'template_name',
      label: 'Template',
      sortable: true,
      width: '1.5fr',
      align: 'left',
      render: (value, row) => (
        <CellContainer>
          <CellText>
            {value}
          </CellText>
          <CellSubText>
            {row.template_id.slice(0, 8)}...
          </CellSubText>
        </CellContainer>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '0.8fr',
      align: 'left',
      render: (value) => <StatusBadge status={value}>{value}</StatusBadge>
    },
    {
      key: 'review_status',
      label: 'Review Status',
      sortable: true,
      width: '1.2fr',
      align: 'left',
      render: (value) => {
        if (!value) return <span style={{ color: '#9ca3af' }}>-</span>;
        const statusColors = {
          'pending': '#6b7280',
          'in_review': '#2563eb',
          'approved': '#059669',
          'rejected': '#dc2626',
          'needs_correction': '#d97706'
        };
        const statusLabels = {
          'pending': 'Pending Review',
          'in_review': 'In Review',
          'approved': 'Approved',
          'rejected': 'Rejected',
          'needs_correction': 'Needs Correction'
        };
        return (
          <span style={{ 
            color: statusColors[value as keyof typeof statusColors] || '#6b7280',
            fontWeight: 500
          }}>
            {statusLabels[value as keyof typeof statusLabels] || value}
          </span>
        );
      }
    },
    {
      key: 'confidence_score',
      label: 'Confidence',
      sortable: true,
      width: '0.8fr',
      align: 'left',
      render: (value) => {
        if (!value) return <span style={{ color: '#9ca3af' }}>-</span>;
        return (
          <span style={{ 
            color: value > 0.8 ? '#059669' : 
                   value > 0.6 ? '#d97706' : '#dc2626'
          }}>
            {(value * 100).toFixed(0)}%
          </span>
        );
      }
    },
    {
      key: 'created_at',
      label: 'Extracted On',
      sortable: true,
      width: '1.2fr',
      align: 'left',
      render: (value) => (
        <span style={{ 
          fontSize: '0.875rem'
        }}>
          {formatDate(value)}
        </span>
      )
    }
  ];

  // Filter definitions
  const filterDefinitions: FilterDefinition[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: '', label: 'All Statuses' },
        { value: 'pending', label: 'Pending' },
        { value: 'processing', label: 'Processing' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' }
      ]
    },
    {
      key: 'review_status',
      label: 'Review Status',
      type: 'select',
      options: [
        { value: '', label: 'All Review Statuses' },
        { value: 'pending', label: 'Pending Review' },
        { value: 'in_review', label: 'In Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'needs_correction', label: 'Needs Correction' }
      ]
    },
    {
      key: 'date_from',
      label: 'From Date',
      type: 'date'
    },
    {
      key: 'date_to',
      label: 'To Date',
      type: 'date'
    },
    {
      key: 'search',
      label: 'Search',
      type: 'search',
      placeholder: 'Search documents, templates, reviewers, comments, or results...'
    }
  ];

  // Use extractions data
  const extractions = extractionsData?.extractions || [];
  const isSearchingOrLoading = isLoading;

  // Pagination configuration
  const paginationConfig: PaginationConfig = {
    page: filters.page,
    perPage: filters.per_page,
    total: extractionsData?.total || 0,
    totalPages: extractionsData?.total_pages || 0,
    onPageChange: handlePageChange,
    onPerPageChange: handlePerPageChange,
    mode: 'server'
  };

  // Actions render function
  const renderActions = (row: any) => (
    <ActionGroup>
      <ActionButton
        title="View Results"
        onClick={() => handleViewResults(row.id)}
      >
        <Eye size={16} />
      </ActionButton>
      <ActionButton
        title="Download Results"
        onClick={() => {
          // TODO: Implement download results
          console.log('Download results for:', row.id);
        }}
      >
        <Download size={16} />
      </ActionButton>
      <ActionButton
        variant="danger"
        title="Delete Extraction"
        onClick={() => handleDeleteExtraction(row.id)}
      >
        <Trash2 size={16} />
      </ActionButton>
    </ActionGroup>
  );

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <Zap size={24} />
          Extractions
        </PageTitle>
        <HeaderActions>
          <RefreshButton onClick={async () => {
            const extractionService = serviceFactory.get<ExtractionService>('extractions');
            const data = await extractionService.getExtractions(buildApiParams(filters));
            setExtractionsData(data || { extractions: [], total: 0, page: 1, per_page: 10, total_pages: 0 });
          }} disabled={isLoading}>
            <RefreshCw size={16} />
            Refresh
          </RefreshButton>
        </HeaderActions>
      </PageHeader>

      <TableFilters
        filters={filterDefinitions}
        filterValues={{
          status: filters.status,
          review_status: filters.review_status,
          date_from: filters.date_from,
          date_to: filters.date_to,
          search: searchInput
        }}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        isSearching={isSearchingOrLoading}
        searchMinLength={2}
      />

      <Table
        data={extractions}
        columns={columns}
        pagination={paginationConfig}
        loading={isLoading}
        error={error ? 'Failed to load extractions' : undefined}
        emptyState={{
          icon: <FileText size={48} />,
          title: 'No extractions found',
          description: filters.status || (searchInput && searchInput.length >= 2)
            ? 'Try adjusting your filters to see more results.'
            : 'Upload documents and create templates to start extracting data.'
        }}
        actions={renderActions}
        onSort={handleSort}
      />
      

      {selectedExtractionId && (
        <ExtractionResultsModal
          extractionId={selectedExtractionId}
          isOpen={resultsModalOpen}
          onClose={handleCloseResultsModal}
        />
      )}
    </PageContainer>
  );
};

export default ExtractionsPage;
