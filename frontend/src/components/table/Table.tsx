import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { 
  FilterBar, 
  FilterGroup, 
  FilterLabel, 
  FilterSelect, 
  SearchInputWrapper,
  SearchInput,
  SearchIcon,
  TableContainer,
  TableHeader,
  TableRow,
  TableCell,
  PaginationContainer,
  PaginationInfo,
  PaginationControls,
  PaginationButton,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  LoadingContainer,
  ErrorContainer
} from './Table.styled';

// Types
export interface ColumnDefinition<T = any> {
  key: string;
  label: string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface FilterDefinition {
  key: string;
  label: string;
  type: 'select' | 'search';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export interface PaginationConfig {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  mode: 'client' | 'server';
}

export interface TableProps<T = any> {
  data: T[];
  columns: ColumnDefinition<T>[];
  filters?: FilterDefinition[];
  filterValues?: Record<string, string>;
  pagination?: PaginationConfig;
  loading?: boolean;
  error?: string;
  emptyState?: {
    icon?: React.ReactNode;
    title: string;
    description: string;
  };
  actions?: (row: T, index: number) => React.ReactNode;
  onFilterChange?: (key: string, value: string) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  className?: string;
  isSearching?: boolean;
  searchMinLength?: number;
}

// Default empty state
const defaultEmptyState = {
  title: 'No data found',
  description: 'There are no records to display.'
};

// Client-side filtering function
const filterData = <T,>(data: T[], filters: Record<string, string>, columns: ColumnDefinition<T>[]): T[] => {
  return data.filter(row => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      
      const column = columns.find(col => col.key === key);
      if (!column) return true;
      
      const cellValue = (row as any)[key];
      if (cellValue === null || cellValue === undefined) return false;
      
      return String(cellValue).toLowerCase().includes(value.toLowerCase());
    });
  });
};

// Client-side pagination function
const paginateData = <T,>(data: T[], page: number, perPage: number): T[] => {
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  return data.slice(startIndex, endIndex);
};

export const Table = <T extends Record<string, any>>({
  data,
  columns,
  filters = [],
  filterValues = {},
  pagination,
  loading = false,
  error,
  emptyState = defaultEmptyState,
  actions,
  onFilterChange,
  onSort,
  className,
  isSearching = false,
  searchMinLength = 2
}: TableProps<T>) => {
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({});
  const [localPagination, setLocalPagination] = useState({
    page: 1,
    perPage: 10
  });

  // Determine if we're using client-side or server-side pagination
  const isClientPagination = !pagination || pagination.mode === 'client';
  const isServerPagination = pagination && pagination.mode === 'server';

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    if (onFilterChange) {
      onFilterChange(key, value);
    } else {
      setLocalFilters(prev => ({ ...prev, [key]: value }));
    }
    
    // Reset to first page when filtering
    if (isClientPagination) {
      setLocalPagination(prev => ({ ...prev, page: 1 }));
    }
  };

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    if (isServerPagination && pagination) {
      pagination.onPageChange(page);
    } else {
      setLocalPagination(prev => ({ ...prev, page }));
    }
  };

  const handlePerPageChange = (perPage: number) => {
    if (isServerPagination && pagination) {
      pagination.onPerPageChange(perPage);
    } else {
      setLocalPagination(prev => ({ ...prev, perPage, page: 1 }));
    }
  };

  // Process data based on pagination mode
  const processedData = useMemo(() => {
    let filteredData = data;

    // Apply client-side filtering if no onFilterChange is provided
    if (!onFilterChange && filters.length > 0) {
      filteredData = filterData(data, localFilters, columns);
    }

    // Apply client-side pagination
    if (isClientPagination) {
      return paginateData(filteredData, localPagination.page, localPagination.perPage);
    }

    return filteredData;
  }, [data, localFilters, localPagination, filters, columns, onFilterChange, isClientPagination]);

  // Calculate pagination info
  const paginationInfo = useMemo(() => {
    if (isServerPagination && pagination) {
      return {
        currentPage: pagination.page,
        totalPages: pagination.totalPages,
        totalItems: pagination.total,
        startItem: ((pagination.page - 1) * pagination.perPage) + 1,
        endItem: Math.min(pagination.page * pagination.perPage, pagination.total),
        perPage: pagination.perPage
      };
    } else {
      const totalItems = onFilterChange ? data.length : filterData(data, localFilters, columns).length;
      const totalPages = Math.ceil(totalItems / localPagination.perPage);
      return {
        currentPage: localPagination.page,
        totalPages,
        totalItems,
        startItem: ((localPagination.page - 1) * localPagination.perPage) + 1,
        endItem: Math.min(localPagination.page * localPagination.perPage, totalItems),
        perPage: localPagination.perPage
      };
    }
  }, [isServerPagination, pagination, localPagination, data, localFilters, columns, onFilterChange]);

  // Render cell content
  const renderCell = (column: ColumnDefinition<T>, row: T, index: number) => {
    const value = (row as any)[column.key];
    
    if (column.render) {
      return column.render(value, row, index);
    }
    
    return value;
  };

  // Loading state
  if (loading) {
    return (
      <LoadingContainer>
        <div>Loading...</div>
      </LoadingContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorContainer>
        <div>{error}</div>
      </ErrorContainer>
    );
  }

  // Empty state - only show if not loading, not searching, and no data
  if (!loading && !isSearching && processedData.length === 0) {
    return (
      <EmptyState>
        {emptyState.icon && <EmptyStateIcon>{emptyState.icon}</EmptyStateIcon>}
        <EmptyStateTitle>{emptyState.title}</EmptyStateTitle>
        <EmptyStateDescription>{emptyState.description}</EmptyStateDescription>
      </EmptyState>
    );
  }

  const totalColumns = columns.length + (actions ? 1 : 0);

  return (
    <div className={className}>
      {/* Filters */}
      {filters.length > 0 && (
        <FilterBar>
          {filters.map(filter => (
            <FilterGroup key={filter.key}>
              <FilterLabel>{filter.label}</FilterLabel>
              {filter.type === 'select' ? (
                <FilterSelect
                  value={onFilterChange ? (filterValues[filter.key] || '') : localFilters[filter.key] || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                >
                  <option value="">All {filter.label}</option>
                  {filter.options?.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </FilterSelect>
              ) : (
                <SearchInputWrapper>
                  <SearchInput
                    type="text"
                    placeholder={filter.placeholder || `Search ${filter.label.toLowerCase()}...`}
                    value={onFilterChange ? (filterValues[filter.key] || '') : localFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  />
                  <SearchIcon $isSearching={isSearching}>
                    <Search size={16} />
                  </SearchIcon>
                </SearchInputWrapper>
              )}
            </FilterGroup>
          ))}
          
          {/* Per Page Selector */}
          {(pagination || isClientPagination) && (
            <FilterGroup>
              <FilterLabel>Per Page</FilterLabel>
              <FilterSelect
                value={isServerPagination ? pagination?.perPage : localPagination.perPage}
                onChange={(e) => handlePerPageChange(Number(e.target.value))}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </FilterSelect>
            </FilterGroup>
          )}
        </FilterBar>
      )}

      {/* Table */}
      <TableContainer>
        <TableHeader $columns={totalColumns}>
          {columns.map(column => (
            <div key={column.key} style={{ textAlign: column.align || 'left' }}>
              {column.label}
            </div>
          ))}
          {actions && <div>Actions</div>}
        </TableHeader>

        {isSearching ? (
          <TableRow $columns={totalColumns}>
            <TableCell style={{ textAlign: 'center', gridColumn: `1 / ${totalColumns + 1}` }}>
              <div style={{ padding: '2rem', color: '#6b7280' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    border: '2px solid #e5e7eb',
                    borderTop: '2px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Searching...
                </div>
              </div>
            </TableCell>
          </TableRow>
        ) : processedData.length === 0 && filters.some(f => f.type === 'search' && filterValues[f.key] && filterValues[f.key].length > 0 && filterValues[f.key].length < searchMinLength) ? (
          <TableRow $columns={totalColumns}>
            <TableCell style={{ textAlign: 'center', gridColumn: `1 / ${totalColumns + 1}` }}>
              <div style={{ padding: '2rem', color: '#6b7280' }}>
                <div>Type at least {searchMinLength} characters to search</div>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          processedData.map((row, index) => (
            <TableRow key={index} $columns={totalColumns}>
              {columns.map(column => (
                <TableCell key={column.key} style={{ textAlign: column.align || 'left' }}>
                  {renderCell(column, row, index)}
                </TableCell>
              ))}
              {actions && (
                <TableCell>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {actions(row, index)}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableContainer>

      {/* Pagination */}
      {(pagination || isClientPagination) && paginationInfo.totalPages > 1 && (
        <PaginationContainer>
          <PaginationInfo>
            Showing {paginationInfo.startItem} to {paginationInfo.endItem} of{' '}
            {paginationInfo.totalItems} items
          </PaginationInfo>
          
          <PaginationControls>
            <PaginationButton
              disabled={paginationInfo.currentPage <= 1}
              onClick={() => handlePageChange(paginationInfo.currentPage - 1)}
            >
              Previous
            </PaginationButton>
            
            <span style={{ padding: '0 1rem', fontSize: '0.875rem' }}>
              Page {paginationInfo.currentPage} of {paginationInfo.totalPages}
            </span>
            
            <PaginationButton
              disabled={paginationInfo.currentPage >= paginationInfo.totalPages}
              onClick={() => handlePageChange(paginationInfo.currentPage + 1)}
            >
              Next
            </PaginationButton>
          </PaginationControls>
        </PaginationContainer>
      )}
    </div>
  );
};

export default Table;
