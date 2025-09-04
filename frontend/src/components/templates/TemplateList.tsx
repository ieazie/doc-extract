import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from '../../services/api';
import TemplateTester from './TemplateTester';
import { TemplateBase, TemplateListResponse } from '../../types/templates';

const TemplateListContainer = styled.div`
  padding: 2rem;
  background: #f8f9fa;
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  h1 {
    margin: 0;
    color: #2c3e50;
    font-size: 2rem;
  }
`;

const CreateButton = styled.button`
  background: #3498db;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: #2980b9;
  }
`;

const SearchAndFilters = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  min-width: 300px;
  
  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const FilterSelect = styled.select`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const TemplateCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
`;

const TemplateHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const TemplateTitle = styled.h3`
  margin: 0;
  color: #2c3e50;
  font-size: 1.25rem;
  font-weight: 600;
`;

const TemplateStatus = styled.span<{ $active: boolean }>`
  background: ${props => props.$active ? '#27ae60' : '#e74c3c'};
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const TemplateMeta = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: #6c757d;
`;

const SchemaPreview = styled.div`
  background: #f8f9fa;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
  
  h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    color: #495057;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const FieldList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const FieldTag = styled.span<{ type: string }>`
  background: ${props => {
    switch (props.type) {
      case 'text': return '#e3f2fd';
      case 'number': return '#f3e5f5';
      case 'date': return '#e8f5e8';
      case 'array': return '#fff3e0';
      case 'object': return '#fce4ec';
      default: return '#f5f5f5';
    }
  }};
  color: ${props => {
    switch (props.type) {
      case 'text': return '#1976d2';
      case 'number': return '#7b1fa2';
      case 'date': return '#388e3c';
      case 'array': return '#f57c00';
      case 'object': return '#c2185b';
      default: return '#424242';
    }
  }};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const TemplateActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.5rem 1rem;
  border: 1px solid ${props => {
    switch (props.variant) {
      case 'primary': return '#3498db';
      case 'danger': return '#e74c3c';
      default: return '#ddd';
    }
  }};
  background: ${props => {
    switch (props.variant) {
      case 'primary': return '#3498db';
      case 'danger': return '#e74c3c';
      default: return 'white';
    }
  }};
  color: ${props => props.variant === 'secondary' ? '#6c757d' : 'white'};
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => {
      switch (props.variant) {
        case 'primary': return '#2980b9';
        case 'danger': return '#c0392b';
        default: return '#f8f9fa';
      }
    }};
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 2rem;
`;

const PageButton = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  background: ${props => props.$active ? '#3498db' : 'white'};
  color: ${props => props.$active ? 'white' : '#6c757d'};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: ${props => props.$active ? '#2980b9' : '#f8f9fa'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #6c757d;
  
  h3 {
    margin: 0 0 1rem 0;
    color: #495057;
  }
  
  p {
    margin: 0 0 2rem 0;
    font-size: 1.1rem;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem;
  color: #6c757d;
`;

const StatusBadge = styled.span<{ $status: 'draft' | 'published' | 'archived' }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  
  ${props => {
    switch (props.$status) {
      case 'draft':
        return `
          background: #fef3c7;
          color: #92400e;
        `;
      case 'published':
        return `
          background: #d1fae5;
          color: #065f46;
        `;
      case 'archived':
        return `
          background: #f3f4f6;
          color: #6b7280;
        `;
    }
  }}
`;

interface TemplateListProps {
  onEditTemplate: (template: TemplateBase) => void;
  onCreateTemplate: () => void;
}

const TemplateList: React.FC<TemplateListProps> = ({ onEditTemplate, onCreateTemplate }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [testingTemplate, setTestingTemplate] = useState<TemplateBase | null>(null);
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templatesData, isLoading, error } = useQuery({
    queryKey: ['templates', page, search, documentTypeFilter, statusFilter],
    queryFn: () => apiClient.getTemplates(page, 10, search, documentTypeFilter, statusFilter || undefined),
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: (templateId: string) => apiClient.deleteTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const handleDelete = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await deleteMutation.mutateAsync(templateId);
      } catch (error) {
        console.error('Failed to delete template:', error);
      }
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page when searching
  };

  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === 'documentType') {
      setDocumentTypeFilter(value);
    } else if (filterType === 'status') {
      setStatusFilter(value);
    }
    setPage(1); // Reset to first page when filtering
  };

  const getFieldTypeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      text: '#1976d2',
      number: '#7b1fa2',
      date: '#388e3c',
      array: '#f57c00',
      object: '#c2185b',
    };
    return typeColors[type] || '#424242';
  };

  if (isLoading) {
    return (
      <TemplateListContainer>
        <LoadingSpinner>Loading templates...</LoadingSpinner>
      </TemplateListContainer>
    );
  }

  if (error) {
    return (
      <TemplateListContainer>
        <div>Error loading templates: {error instanceof Error ? error.message : 'Unknown error'}</div>
      </TemplateListContainer>
    );
  }

  const templates = templatesData?.templates || [];
  const totalPages = templatesData?.total_pages || 1;

  return (
    <TemplateListContainer>
      <SearchAndFilters>
        <SearchInput
          type="text"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
        
        <FilterSelect
          value={documentTypeFilter}
          onChange={(e) => handleFilterChange('documentType', e.target.value)}
        >
          <option value="">All Document Types</option>
          <option value="invoice">Invoice</option>
          <option value="contract">Contract</option>
          <option value="insurance_policy">Insurance Policy</option>
        </FilterSelect>
        
        <FilterSelect
          value={statusFilter}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </FilterSelect>
      </SearchAndFilters>

      {templates.length === 0 ? (
        <EmptyState>
          <h3>No templates found</h3>
          <p>Create your first template to get started with document extraction</p>
          <CreateButton onClick={onCreateTemplate}>
            Create Template
          </CreateButton>
        </EmptyState>
      ) : (
        <>
          <TemplateGrid>
            {templates.map((template) => (
              <TemplateCard key={template.id}>
                <TemplateHeader>
                  <TemplateTitle>{template.name}</TemplateTitle>
                  <StatusBadge $status={(template.status as 'draft' | 'published' | 'archived') || 'draft'}>
                    {(template.status as 'draft' | 'published' | 'archived') || 'draft'}
                  </StatusBadge>
                </TemplateHeader>

                <TemplateMeta>
                  <span>Version {template.version}</span>
                  {template.document_type_name && (
                    <span>• {template.document_type_name}</span>
                  )}
                  <span>• Created {new Date(template.created_at).toLocaleDateString()}</span>
                </TemplateMeta>

                <SchemaPreview>
                  <h4>Schema Fields</h4>
                  <FieldList>
                    {Object.entries(template.schema).map(([fieldName, fieldDef]) => (
                      <FieldTag key={fieldName} type={fieldDef.type}>
                        {fieldName}: {fieldDef.type}
                      </FieldTag>
                    ))}
                  </FieldList>
                </SchemaPreview>

                <TemplateActions>
                  <ActionButton onClick={() => onEditTemplate(template)}>
                    Edit
                  </ActionButton>
                  <ActionButton variant="primary" onClick={() => setTestingTemplate(template)}>
                    Test
                  </ActionButton>
                  <ActionButton 
                    variant="danger" 
                    onClick={() => handleDelete(template.id)}
                  >
                    Delete
                  </ActionButton>
                </TemplateActions>
              </TemplateCard>
            ))}
          </TemplateGrid>

          {totalPages > 1 && (
            <Pagination>
              <PageButton
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </PageButton>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <PageButton
                  key={pageNum}
                  $active={pageNum === page}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </PageButton>
              ))}
              
              <PageButton
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </PageButton>
            </Pagination>
          )}
        </>
      )}

      {testingTemplate && (
        <TemplateTester
          templateId={testingTemplate.id}
          templateName={testingTemplate.name}
          onClose={() => setTestingTemplate(null)}
        />
      )}
    </TemplateListContainer>
  );
};

export default TemplateList;
