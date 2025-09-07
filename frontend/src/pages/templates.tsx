import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { Plus, FileText, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from '../services/api';
import { Table, ColumnDefinition, FilterDefinition, PaginationConfig } from '../components/table/Table';
import SchemaModal from '../components/templates/SchemaModal';
import ContextMenu from '../components/common/ContextMenu';
import { TemplateBase } from '../types/templates';
import { useDebounce } from '../hooks/useDebounce';

const TemplatesPageContainer = styled.div`
  min-height: 100vh;
  background: #f8f9fa;
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

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background: #2563eb;
  }
`;

const TemplatesPage: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // State
  const [filters, setFilters] = useState({
    search: '',
    documentType: '',
    status: '',
    page: 1,
    per_page: 10
  });
  const [searchInput, setSearchInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateBase | null>(null);
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);
  
  // Debounce search input
  const debouncedSearch = useDebounce(searchInput, 600);

  // Sync debounced search with filters
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters(prev => ({
        ...prev,
        search: debouncedSearch,
        page: 1 // Reset to first page when searching
      }));
    }
  }, [debouncedSearch, filters.search]);

  // Fetch templates
  const { data: templatesData, isLoading, error } = useQuery({
    queryKey: ['templates', filters.page, filters.per_page, filters.search, filters.documentType, filters.status],
    queryFn: () => apiClient.getTemplates(
      filters.page, 
      filters.per_page, 
      filters.search || undefined, 
      filters.documentType || undefined, 
      undefined, // isActive - not used for now
      filters.status || undefined,
      'created_at', // sortBy - default to created_at
      'desc' // sortOrder - default to desc
    ),
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: (templateId: string) => apiClient.deleteTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  // Data transformation
  const templates = useMemo(() => {
    return templatesData?.templates || [];
  }, [templatesData]);

  // Filter definitions
  const filterDefinitions: FilterDefinition[] = [
    {
      key: 'search',
      label: 'Search templates',
      type: 'search',
      placeholder: 'Search templates...'
    },
    {
      key: 'documentType',
      label: 'Document Type',
      type: 'select',
      options: [
        { value: '', label: 'All Document Types' },
        { value: 'invoice', label: 'Invoice' },
        { value: 'receipt', label: 'Receipt' },
        { value: 'contract', label: 'Contract' },
        { value: 'other', label: 'Other' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: '', label: 'All Status' },
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
        { value: 'archived', label: 'Archived' }
      ]
    }
  ];

  // Column definitions
  const columns: ColumnDefinition<TemplateBase>[] = [
    {
      key: 'name',
      label: 'Name',
      width: '38%',
      sortable: true,
      render: (value, row) => (
        <div style={{ fontWeight: 600, color: '#1f2937' }}>
          {value}
        </div>
      )
    },
    {
      key: 'document_type_name',
      label: 'Document Type',
      width: '15%',
      sortable: true,
      render: (value) => (
        <div style={{ color: '#6b7280' }}>
          {value || 'Not specified'}
        </div>
      )
    },
    {
      key: 'schema',
      label: 'Schema Fields',
      width: '12%',
      render: (value) => {
        const fieldCount = Object.keys(value || {}).length;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#6b7280' }}>{fieldCount} fields</span>
            <button
              onClick={() => {
                const template = templates.find(t => t.schema === value);
                if (template) {
                  setSelectedTemplate(template);
                  setSchemaModalOpen(true);
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '0.25rem',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Eye size={14} />
            </button>
          </div>
        );
      }
    },
    {
      key: 'version',
      label: 'Version',
      width: '6%',
      sortable: true,
      render: (value) => (
        <div style={{ color: '#6b7280', fontFamily: 'monospace' }}>
          v{value}
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Created Date',
      width: '12%',
      sortable: true,
      render: (value) => {
        const date = new Date(value);
        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'long' });
        const year = date.getFullYear();
        return (
          <div style={{ color: '#6b7280' }}>
            {day} {month} {year}
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      width: '5%',
      sortable: true,
      render: (value) => {
        const statusColors = {
          draft: { bg: '#fef3c7', text: '#92400e' },
          published: { bg: '#d1fae5', text: '#065f46' },
          archived: { bg: '#f3f4f6', text: '#374151' }
        };
        const colors = statusColors[value as keyof typeof statusColors] || statusColors.draft;
        
        return (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: 500,
            backgroundColor: colors.bg,
            color: colors.text,
            textTransform: 'capitalize'
          }}>
            {value}
          </div>
        );
      }
    }
  ];

  // Pagination config
  const paginationConfig: PaginationConfig = {
    page: filters.page,
    perPage: filters.per_page,
    total: templatesData?.total || 0,
    totalPages: templatesData?.total_pages || 0,
    onPageChange: (page) => setFilters(prev => ({ ...prev, page })),
    onPerPageChange: (perPage) => setFilters(prev => ({ ...prev, per_page: perPage, page: 1 })),
    mode: 'server'
  };

  // Event handlers
  const handleCreateTemplate = () => {
    router.push('/templates/new');
  };

  const handleEditTemplate = (template: TemplateBase) => {
    router.push(`/templates/builder?id=${template.id}`);
  };

  const handleArchiveTemplate = (template: TemplateBase) => {
    // TODO: Implement archive functionality
    console.log('Archive template:', template.id);
  };

  const handleDeleteTemplate = (template: TemplateBase) => {
    // TODO: Implement delete functionality
    console.log('Delete template:', template.id);
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'search') {
      // For search, update the searchInput state which will be debounced
      setSearchInput(value);
    } else {
      // For other filters, update filters directly
      setFilters(prev => ({
        ...prev,
        [key]: value,
        page: 1 // Reset to first page when filtering
      }));
    }
  };

  // Context menu actions
  const getContextMenuActions = (template: TemplateBase) => [
    {
      id: 'edit',
      label: 'Edit',
      icon: <FileText size={16} />,
      onClick: () => handleEditTemplate(template),
      hidden: template.status === 'published' // Hide edit for published templates
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: <FileText size={16} />,
      onClick: () => handleArchiveTemplate(template),
      hidden: template.status !== 'published', // Only show for published templates
      disabled: true // Disabled for now
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <FileText size={16} />,
      onClick: () => handleDeleteTemplate(template),
      disabled: true // Always disabled for now
    }
  ];

  return (
    <TemplatesPageContainer>
      <PageHeader>
        <PageTitle>Templates</PageTitle>
        <CreateButton onClick={handleCreateTemplate}>
          <Plus size={16} />
          Create New Template
        </CreateButton>
      </PageHeader>
      
      <Table
        data={templates}
        columns={columns}
        filters={filterDefinitions}
        filterValues={{
          documentType: filters.documentType,
          status: filters.status,
          search: searchInput
        }}
        pagination={paginationConfig}
        loading={isLoading}
        error={error ? 'Failed to load templates' : undefined}
        emptyState={{
          icon: <FileText size={48} />,
          title: 'No templates found',
          description: 'Create your first template to get started with document extraction.'
        }}
        actions={(row) => <ContextMenu actions={getContextMenuActions(row)} />}
        onFilterChange={handleFilterChange}
        isSearching={isLoading}
        searchMinLength={0}
      />
      
      {selectedTemplate && (
        <SchemaModal
          isOpen={schemaModalOpen}
          onClose={() => {
            setSchemaModalOpen(false);
            setSelectedTemplate(null);
          }}
          templateName={selectedTemplate.name}
          schema={selectedTemplate.schema}
        />
      )}
    </TemplatesPageContainer>
  );
};

export default TemplatesPage;
