import React from 'react';
import { Search, X } from 'lucide-react';
import Dropdown from '@/components/ui/Dropdown';
import { 
  FilterBar, 
  FilterGroup, 
  FilterLabel, 
  SearchInputWrapper,
  SearchInput,
  DateInput,
  SearchIcon,
  ClearButton
} from './Table.styled';

// Types
export interface FilterDefinition {
  key: string;
  label: string;
  type: 'select' | 'search' | 'date';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export interface TableFiltersProps {
  filters: FilterDefinition[];
  filterValues: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters?: () => void;
  className?: string;
  isSearching?: boolean;
  searchMinLength?: number;
}

export const TableFilters: React.FC<TableFiltersProps> = ({
  filters,
  filterValues,
  onFilterChange,
  onClearFilters,
  className,
  isSearching = false,
  searchMinLength = 2
}) => {
  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    onFilterChange(key, value);
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(filterValues).some(value => value && value.trim() !== '');

  return (
    <div className={className}>
      <FilterBar>
        {filters.map(filter => (
          <FilterGroup key={filter.key}>
            <FilterLabel>{filter.label}</FilterLabel>
            {filter.type === 'select' ? (
              <Dropdown
                value={filterValues[filter.key] || ''}
                onChange={(value) => handleFilterChange(filter.key, value)}
                options={[
                  { value: '', label: `All ${filter.label}` },
                  ...(filter.options || [])
                ]}
                placeholder={`Select ${filter.label}`}
                size="compact"
              />
            ) : filter.type === 'date' ? (
              <DateInput
                type="date"
                value={filterValues[filter.key] || ''}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              />
            ) : (
              <SearchInputWrapper>
                <SearchIcon>
                  <Search size={16} />
                </SearchIcon>
                <SearchInput
                  type="text"
                  placeholder={filter.placeholder || `Search ${filter.label}...`}
                  value={filterValues[filter.key] || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                />
                {(filterValues[filter.key] && filterValues[filter.key].length > 0) && (
                  <ClearButton
                    onClick={() => handleFilterChange(filter.key, '')}
                    title="Clear search"
                  >
                    <X size={14} />
                  </ClearButton>
                )}
              </SearchInputWrapper>
            )}
          </FilterGroup>
        ))}
        
        {/* Clear Filters Button */}
        {hasActiveFilters && onClearFilters && (
          <div style={{ 
            marginLeft: 'auto', 
            display: 'flex', 
            alignItems: 'center' 
          }}>
            <button
              onClick={onClearFilters}
              title="Clear all filters"
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              <X size={14} />
              Clear Filters
            </button>
          </div>
        )}
      </FilterBar>
    </div>
  );
};

export default TableFilters;
