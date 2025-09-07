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

import { apiClient } from '../services/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { SuccessMessage } from '../components/common/SuccessMessage';
import { ExtractionResultsModal } from '../components/extractions/ExtractionResultsModal';
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
const ExtractionsPage: React.FC = () => {
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
    per_page: 10
  });
  const [searchInput, setSearchInput] = useState('');
  const [selectedExtractionId, setSelectedExtractionId] = useState<string | null>(null);
  const [resultsModalOpen, setResultsModalOpen] = useState<boolean>(false);
  
  // Data state
  const [extractionsData, setExtractionsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debounce search input with 600ms delay to reduce API calls
  const debouncedSearch = useDebounce(searchInput, 600);

  // Sync debounced search with filters - simple debounced update
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters(prev => ({
        ...prev,
        search: debouncedSearch,
        page: 1 // Reset to first page when search changes
      }));
    }
  }, [debouncedSearch, filters.search]);

  // Fetch data when filters change (including initial load)
  useEffect(() => {
    const fetchExtractions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await apiClient.getExtractions(filters);
        setExtractionsData(data);
      } catch (err) {
        setError('Failed to load extractions');
        console.error('Error fetching extractions:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExtractions();
  }, [filters.status, filters.search, filters.page, filters.per_page]);


  // Delete extraction function
  const deleteExtraction = async (extractionId: string) => {
    try {
      await apiClient.deleteExtraction(extractionId);
      // Refresh the data after successful deletion
      const data = await apiClient.getExtractions(filters);
      setExtractionsData(data);
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
      render: (value) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {value.slice(0, 8)}...
        </span>
      )
    },
    {
      key: 'document_name',
      label: 'Document',
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{value}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {row.document_id.slice(0, 8)}...
          </div>
        </div>
      )
    },
    {
      key: 'template_name',
      label: 'Template',
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{value}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {row.template_id.slice(0, 8)}...
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value}>{value}</StatusBadge>
    },
    {
      key: 'confidence_score',
      label: 'Confidence',
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
      key: 'processing_time_ms',
      label: 'Duration',
      render: (value) => {
        if (!value) return <span style={{ color: '#9ca3af' }}>-</span>;
        return formatDuration(value);
      }
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (value) => (
        <span style={{ fontSize: '0.875rem' }}>
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
        { value: 'pending', label: 'Pending' },
        { value: 'processing', label: 'Processing' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' }
      ]
    },
    {
      key: 'search',
      label: 'Search',
      type: 'search',
      placeholder: 'Search documents or templates (min 2 chars)...'
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
            const data = await apiClient.getExtractions(filters);
            setExtractionsData(data);
          }} disabled={isLoading}>
            <RefreshCw size={16} />
            Refresh
          </RefreshButton>
        </HeaderActions>
      </PageHeader>

      <Table
        data={extractions}
        columns={columns}
        filters={filterDefinitions}
        filterValues={{
          status: filters.status,
          search: searchInput
        }}
        pagination={paginationConfig}
        loading={isLoading && !extractionsData}
        error={error ? 'Failed to load extractions' : undefined}
        emptyState={{
          icon: <FileText size={48} />,
          title: 'No extractions found',
          description: filters.status || (searchInput && searchInput.length >= 2)
            ? 'Try adjusting your filters to see more results.'
            : 'Upload documents and create templates to start extracting data.'
        }}
        actions={renderActions}
        onFilterChange={handleFilterChange}
        isSearching={isSearchingOrLoading}
        searchMinLength={2}
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
