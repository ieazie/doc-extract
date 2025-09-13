import styled from 'styled-components';

// Filter Bar Components
export const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
`;

export const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const FilterLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
`;


export const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

export const SearchInput = styled.input`
  padding: 0.5rem;
  padding-right: 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  font-size: 0.875rem;
  min-width: 200px;
  width: 200px;
  transition: width 0.3s ease, border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    width: 300px;
  }
`;

export const DateInput = styled.input`
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  font-size: 0.875rem;
  width: 140px;
  min-width: 140px;
  max-width: 140px;
  flex-shrink: 0;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

export const SearchIcon = styled.div<{ $isSearching?: boolean }>`
  position: absolute;
  right: 0.75rem;
  color: ${props => props.$isSearching ? '#3b82f6' : '#9ca3af'};
  transition: color 0.2s ease;
  
  ${props => props.$isSearching && `
    animation: spin 1s linear infinite;
  `}
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

export const ClearButton = styled.button`
  position: absolute;
  right: 2.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease, background-color 0.2s ease;
  
  &:hover {
    color: #6b7280;
    background-color: #f3f4f6;
  }
`;

// Table Components
export const TableContainer = styled.div`
  background: white;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  overflow: visible;
`;

export const TableHeader = styled.div<{ $columns: number; $gridTemplate?: string }>`
  display: grid;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
  ${props => props.$gridTemplate && `grid-template-columns: ${props.$gridTemplate};`}
`;

export const SortableHeaderCell = styled.div<{ $sortable?: boolean }>`
  display: flex;
  align-items: center;
  min-height: 1.5rem;
  height: 1.5rem;
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};
  user-select: none;
  transition: color 0.2s;
  line-height: 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  
  &:hover {
    color: ${props => props.$sortable ? '#3b82f6' : 'inherit'};
  }
`;

export const SortIcon = styled.span<{ $active?: boolean; $direction?: 'asc' | 'desc' }>`
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: ${props => props.$active ? '#3b82f6' : '#9ca3af'};
  transition: color 0.2s;
  margin-left: 0.5rem;
  
  &:hover {
    color: #3b82f6;
  }
`;

export const TableRow = styled.div<{ $columns: number; $gridTemplate?: string }>`
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #f3f4f6;
  align-items: center;
  transition: background-color 0.2s;
  ${props => props.$gridTemplate && `grid-template-columns: ${props.$gridTemplate};`}
  
  &:hover {
    background: #f9fafb;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

export const TableCell = styled.div`
  display: flex;
  align-items: center;
  min-height: 1.5rem;
  height: 1.5rem;
  line-height: 1.5rem;
  font-size: 0.875rem;
  font-weight: 400;
`;

// Status Badge Component
export const StatusBadge = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  min-width: 4rem;
  height: 1.25rem;
  
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

// Action Components
export const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
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

export const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 100%;
`;

// Pagination Components
export const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
`;

export const PaginationInfo = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

export const PaginationControls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

export const PaginationButton = styled.button<{ disabled?: boolean }>`
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

// Empty State Components
export const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
`;

export const EmptyStateIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

export const EmptyStateTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #374151;
`;

export const EmptyStateDescription = styled.p`
  font-size: 0.875rem;
  margin: 0;
`;

// Loading State
export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
`;

// Error State
export const ErrorContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  margin: 1rem 0;
`;

// Global styles for animations
export const GlobalStyles = styled.div`
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
