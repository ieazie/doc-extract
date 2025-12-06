import React, { useState, useMemo } from 'react';
import { 
  TableContainer,
  TableHeader,
  SortableHeaderCell,
  SortIcon,
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
  pagination?: PaginationConfig;
  loading?: boolean;
  error?: string;
  emptyState?: {
    icon?: React.ReactNode;
    title: string;
    description: string;
  };
  actions?: (row: T, index: number) => React.ReactNode;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  className?: string;
}

// Default empty state
const defaultEmptyState = {
  title: 'No data found',
  description: 'There are no records to display.'
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
  pagination,
  loading = false,
  error,
  emptyState = defaultEmptyState,
  actions,
  onSort,
  className
}: TableProps<T>) => {
  const [localPagination, setLocalPagination] = useState({
    page: 1,
    perPage: 10
  });
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Determine if we're using client-side or server-side pagination
  const isClientPagination = !pagination || pagination.mode === 'client';
  const isServerPagination = pagination && pagination.mode === 'server';

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

  // Handle sorting
  const handleSort = (key: string) => {
    const column = columns.find(col => col.key === key);
    if (!column?.sortable) return;

    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }

    if (onSort) {
      onSort(key, direction);
    } else {
      setSortConfig({ key, direction });
    }
  };

  // Client-side sorting function
  const sortData = <T,>(data: T[], sortConfig: { key: string; direction: 'asc' | 'desc' } | null): T[] => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = (a as any)[sortConfig.key];
      const bValue = (b as any)[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Process data based on pagination mode
  const processedData = useMemo(() => {
    let processedData = data;

    // Apply client-side sorting if no onSort is provided
    if (!onSort && sortConfig) {
      processedData = sortData(processedData, sortConfig);
    }

    // Apply client-side pagination
    if (isClientPagination) {
      return paginateData(processedData, localPagination.page, localPagination.perPage);
    }

    return processedData;
  }, [data, localPagination, onSort, sortConfig, isClientPagination]);

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
      const totalItems = data.length;
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
  }, [isServerPagination, pagination, localPagination, data]);

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


  // Empty state - only show if not loading and no data
  if (!loading && processedData.length === 0) {
    return (
      <EmptyState>
        {emptyState.icon && <EmptyStateIcon>{emptyState.icon}</EmptyStateIcon>}
        <EmptyStateTitle>{emptyState.title}</EmptyStateTitle>
        <EmptyStateDescription>{emptyState.description}</EmptyStateDescription>
      </EmptyState>
    );
  }

  const totalColumns = columns.length + (actions ? 1 : 0);

  // Generate grid template columns based on column widths
  const getGridTemplateColumns = () => {
    const columnWidths = columns.map(col => col.width || '1fr');
    if (actions) {
      return [...columnWidths, '80px'].join(' '); // Fixed width for actions column
    }
    return columnWidths.join(' ');
  };

  return (
    <div className={className}>

      {/* Table */}
      <TableContainer>
        <TableHeader $columns={totalColumns} $gridTemplate={getGridTemplateColumns()}>
          {columns.map(column => (
            <SortableHeaderCell 
              key={column.key} 
              $sortable={column.sortable}
              onClick={() => column.sortable && handleSort(column.key)}
              style={{ 
                justifyContent: column.align === 'center' ? 'center' : 
                               column.align === 'right' ? 'flex-end' : 'flex-start',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <span>{column.label}</span>
              {column.sortable && (
                <SortIcon 
                  $active={sortConfig?.key === column.key}
                  $direction={sortConfig?.key === column.key ? sortConfig.direction : undefined}
                >
                  {sortConfig?.key === column.key ? (
                    sortConfig.direction === 'asc' ? '↑' : '↓'
                  ) : (
                    '↕'
                  )}
                </SortIcon>
              )}
            </SortableHeaderCell>
          ))}
          {actions && <TableCell style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center' }}>Actions</TableCell>}
        </TableHeader>

        {processedData.map((row, index) => (
            <TableRow key={index} $columns={totalColumns} $gridTemplate={getGridTemplateColumns()}>
              {columns.map(column => (
                <TableCell key={column.key} style={{ 
                  justifyContent: column.align === 'center' ? 'center' : 
                                 column.align === 'right' ? 'flex-end' : 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 0,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: '100%',
                    minWidth: 0,
                    overflow: 'hidden'
                  }}>
                    {renderCell(column, row, index)}
                  </div>
                </TableCell>
              ))}
              {actions && (
                <TableCell style={{ 
                  justifyContent: 'flex-start', 
                  display: 'flex', 
                  alignItems: 'center',
                  overflow: 'visible',
                  position: 'relative',
                  zIndex: 10
                }}>
                  <div style={{ display: 'flex', gap: '0.5rem', width: '100%', overflow: 'visible' }}>
                    {actions(row, index)}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
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
