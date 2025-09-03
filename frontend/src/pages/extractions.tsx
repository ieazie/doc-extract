/**
 * Extractions Page
 * Professional table-based interface for managing document extractions
 */
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useQuery, useMutation, useQueryClient } from 'react-query';
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

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const FilterLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
`;

const FilterSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  font-size: 0.875rem;
  min-width: 120px;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const SearchInput = styled.input`
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  font-size: 0.875rem;
  min-width: 200px;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
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

const ExtractionsTable = styled.div`
  background: white;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr 2fr 1fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr 2fr 1fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #f3f4f6;
  align-items: center;
  transition: background-color 0.2s;
  
  &:hover {
    background: #f9fafb;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  ${props => {
    switch (props.status) {
      case 'pending':
        return `
          background: #fef3c7;
          color: #92400e;
        `;
      case 'processing':
        return `
          background: #dbeafe;
          color: #1e40af;
        `;
      case 'completed':
        return `
          background: #d1fae5;
          color: #065f46;
        `;
      case 'failed':
        return `
          background: #fee2e2;
          color: #991b1b;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
        `;
    }
  }}
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: #3b82f6;
          color: white;
          &:hover { background: #2563eb; }
        `;
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          &:hover { background: #dc2626; }
        `;
      default:
        return `
          background: #f3f4f6;
          color: #6b7280;
          &:hover { background: #e5e7eb; }
        `;
    }
  }}
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
`;

const PaginationInfo = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const PaginationControls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const PaginationButton = styled.button<{ disabled?: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
`;

const EmptyStateIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const EmptyStateTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #374151;
`;

const EmptyStateDescription = styled.p`
  font-size: 0.875rem;
  margin: 0;
`;

// Main Component
const ExtractionsPage: React.FC = () => {
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
    per_page: 10
  });
  const [selectedExtractionId, setSelectedExtractionId] = useState<string | null>(null);
  const [resultsModalOpen, setResultsModalOpen] = useState<boolean>(false);

  const queryClient = useQueryClient();

  // Fetch extractions
  const { 
    data: extractionsData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery(
    ['extractions', filters],
    () => apiClient.getExtractions(filters),
    {
      refetchInterval: 5000, // Poll every 5 seconds for status updates
      keepPreviousData: true
    }
  );

  // Delete extraction mutation
  const deleteExtractionMutation = useMutation(
    (extractionId: string) => apiClient.deleteExtraction(extractionId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['extractions']);
      }
    }
  );

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleDeleteExtraction = async (extractionId: string) => {
    if (window.confirm('Are you sure you want to delete this extraction?')) {
      try {
        await deleteExtractionMutation.mutateAsync(extractionId);
      } catch (error) {
        console.error('Failed to delete extraction:', error);
      }
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

  if (isLoading && !extractionsData) {
    return (
      <PageContainer>
        <LoadingSpinner />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorMessage message="Failed to load extractions" />
      </PageContainer>
    );
  }

  const extractions = extractionsData?.extractions || [];
  const totalPages = extractionsData?.total_pages || 0;

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <Zap size={24} />
          Extractions
        </PageTitle>
        <HeaderActions>
          <RefreshButton onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw size={16} />
            Refresh
          </RefreshButton>
        </HeaderActions>
      </PageHeader>

      <FilterBar>
        <FilterGroup>
          <FilterLabel>Status</FilterLabel>
          <FilterSelect
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </FilterSelect>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Search</FilterLabel>
          <SearchInput
            type="text"
            placeholder="Search documents or templates..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Per Page</FilterLabel>
          <FilterSelect
            value={filters.per_page}
            onChange={(e) => handleFilterChange('per_page', e.target.value)}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </FilterSelect>
        </FilterGroup>
      </FilterBar>

      {extractions.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon>
            <FileText size={48} />
          </EmptyStateIcon>
          <EmptyStateTitle>No extractions found</EmptyStateTitle>
          <EmptyStateDescription>
            {filters.status || filters.search 
              ? 'Try adjusting your filters to see more results.'
              : 'Upload documents and create templates to start extracting data.'
            }
          </EmptyStateDescription>
        </EmptyState>
      ) : (
        <>
          <ExtractionsTable>
            <TableHeader>
              <div>ID</div>
              <div>Document</div>
              <div>Template</div>
              <div>Status</div>
              <div>Confidence</div>
              <div>Duration</div>
              <div>Created</div>
              <div>Actions</div>
            </TableHeader>

            {extractions.map((extraction) => (
              <TableRow key={extraction.id}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {extraction.id.slice(0, 8)}...
                </div>
                <div>
                  <div style={{ fontWeight: 500 }}>{extraction.document_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {extraction.document_id.slice(0, 8)}...
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 500 }}>{extraction.template_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {extraction.template_id.slice(0, 8)}...
                  </div>
                </div>
                <div>
                  <StatusBadge status={extraction.status}>
                    {extraction.status}
                  </StatusBadge>
                </div>
                <div>
                  {extraction.confidence_score ? (
                    <span style={{ 
                      color: extraction.confidence_score > 0.8 ? '#059669' : 
                             extraction.confidence_score > 0.6 ? '#d97706' : '#dc2626'
                    }}>
                      {(extraction.confidence_score * 100).toFixed(0)}%
                    </span>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>-</span>
                  )}
                </div>
                <div>
                  {extraction.processing_time_ms ? (
                    formatDuration(extraction.processing_time_ms)
                  ) : (
                    <span style={{ color: '#9ca3af' }}>-</span>
                  )}
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                  {formatDate(extraction.created_at)}
                </div>
                <div>
                  <ActionGroup>
                    <ActionButton
                      title="View Results"
                      onClick={() => handleViewResults(extraction.id)}
                    >
                      <Eye size={16} />
                    </ActionButton>
                    <ActionButton
                      title="Download Results"
                      onClick={() => {
                        // TODO: Implement download results
                        console.log('Download results for:', extraction.id);
                      }}
                    >
                      <Download size={16} />
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      title="Delete Extraction"
                      onClick={() => handleDeleteExtraction(extraction.id)}
                    >
                      <Trash2 size={16} />
                    </ActionButton>
                  </ActionGroup>
                </div>
              </TableRow>
            ))}
          </ExtractionsTable>

          <PaginationContainer>
            <PaginationInfo>
              Showing {((filters.page - 1) * filters.per_page) + 1} to{' '}
              {Math.min(filters.page * filters.per_page, extractionsData?.total || 0)} of{' '}
              {extractionsData?.total || 0} extractions
            </PaginationInfo>
            
            <PaginationControls>
              <PaginationButton
                disabled={filters.page <= 1}
                onClick={() => handlePageChange(filters.page - 1)}
              >
                Previous
              </PaginationButton>
              
              <span style={{ padding: '0 1rem', fontSize: '0.875rem' }}>
                Page {filters.page} of {totalPages}
              </span>
              
              <PaginationButton
                disabled={filters.page >= totalPages}
                onClick={() => handlePageChange(filters.page + 1)}
              >
                Next
              </PaginationButton>
            </PaginationControls>
          </PaginationContainer>
        </>
      )}

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
