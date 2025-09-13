import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import styled from 'styled-components';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Users, 
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical
} from 'lucide-react';

import { apiClient } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { SuccessMessage } from '@/components/common/SuccessMessage';
import { Table, ColumnDefinition } from '@/components/table/Table';
import { ActionButton, ActionGroup } from '@/components/table/Table.styled';
import TenantConfigModal from '@/components/tenants/TenantConfigModal';

// Types
interface Tenant {
  id: string;
  name: string;
  settings: Record<string, any>;
  status: string;
  environment: string;
  created_at: string;
  updated_at: string;
}

interface CreateTenantData {
  name: string;
  settings?: Record<string, any>;
  environment?: string;
}

interface UpdateTenantData {
  name?: string;
  settings?: Record<string, any>;
  status?: string;
  environment?: string;
}

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

// Styled components for custom rendering in table cells
const TenantInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

const TenantAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: ${props => props.theme.typography.weights.medium};
`;

const TenantDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const TenantName = styled.span`
  font-weight: ${props => props.theme.typography.weights.medium};
  color: ${props => props.theme.colors.text.primary};
`;

const TenantEnvironment = styled.span`
  font-size: ${props => props.theme.typography.sizes.sm};
  color: ${props => props.theme.colors.text.secondary};
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: ${props => props.theme.typography.sizes.sm};
  font-weight: ${props => props.theme.typography.weights.medium};
  
  ${props => {
    if (props.$status === 'active') {
      return `
        background: ${props.theme.colors.success}20;
        color: ${props.theme.colors.success};
      `;
    } else {
      return `
        background: ${props.theme.colors.error}20;
        color: ${props.theme.colors.error};
      `;
    }
  }}
`;

const EnvironmentBadge = styled.span<{ $environment: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: ${props => props.theme.typography.sizes.sm};
  font-weight: ${props => props.theme.typography.weights.medium};
  background: ${props => props.theme.colors.primary}20;
  color: ${props => props.theme.colors.primary};
`;

const TenantSettings = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.xs};
`;

const SettingItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
`;

const SettingLabel = styled.span`
  font-size: ${props => props.theme.typography.sizes.sm};
  color: ${props => props.theme.colors.text.secondary};
  font-weight: ${props => props.theme.typography.weights.medium};
`;

const SettingValue = styled.span`
  font-size: ${props => props.theme.typography.sizes.sm};
  color: ${props => props.theme.colors.text.primary};
`;


// Modal Components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: ${props => props.theme.zIndex.modal};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.lg};
`;

const ModalContent = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.xl};
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const ModalTitle = styled.h2`
  font-size: ${props => props.theme.typography.sizes.lg};
  font-weight: ${props => props.theme.typography.weights.semibold};
  color: ${props => props.theme.colors.text.primary};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.text.secondary};
  cursor: pointer;
  padding: ${props => props.theme.spacing.xs};
  border-radius: ${props => props.theme.borderRadius.sm};
  
  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
  }
`;

const FormGroup = styled.div`
  margin-bottom: ${props => props.theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${props => props.theme.spacing.xs};
  font-weight: ${props => props.theme.typography.weights.medium};
  color: ${props => props.theme.colors.text.primary};
`;

const Input = styled.input`
  width: 100%;
  padding: ${props => props.theme.spacing.sm};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.primary};
  font-size: ${props => props.theme.typography.sizes.sm};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: ${props => props.theme.spacing.sm};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.primary};
  font-size: ${props => props.theme.typography.sizes.sm};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  justify-content: flex-end;
  margin-top: ${props => props.theme.spacing.lg};
`;

// Main Component
const TenantsPage: React.FC = () => {
  const { user: currentUser, isSystemAdmin, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch tenants
  const { data: tenants, isLoading, error } = useQuery<Tenant[]>(
    'tenants',
    () => apiClient.getTenants(),
    {
      enabled: !!currentUser && currentUser.role === 'admin',
    }
  );

  // Create tenant mutation
  const createTenantMutation = useMutation(
    (tenantData: CreateTenantData) => apiClient.createTenant(tenantData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tenants');
        setShowCreateModal(false);
        setMessage({ type: 'success', text: 'Tenant created successfully' });
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to create tenant' });
      },
    }
  );

  // Update tenant mutation
  const updateTenantMutation = useMutation(
    ({ tenantId, tenantData }: { tenantId: string; tenantData: UpdateTenantData }) =>
      apiClient.updateTenant(tenantId, tenantData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tenants');
        setSelectedTenant(null);
        setMessage({ type: 'success', text: 'Tenant updated successfully' });
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to update tenant' });
      },
    }
  );

  // Delete tenant mutation
  const deleteTenantMutation = useMutation(
    (tenantId: string) => apiClient.deleteTenant(tenantId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tenants');
        setMessage({ type: 'success', text: 'Tenant deleted successfully' });
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to delete tenant' });
      },
    }
  );

  // Handle create tenant
  const handleCreateTenant = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tenantData: CreateTenantData = {
      name: formData.get('name') as string,
      environment: formData.get('environment') as string,
      settings: {
        max_documents: parseInt(formData.get('max_documents') as string) || 1000,
        max_templates: parseInt(formData.get('max_templates') as string) || 50,
      },
    };
    createTenantMutation.mutate(tenantData);
  };

  // Handle update tenant
  const handleUpdateTenant = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTenant) return;
    
    const formData = new FormData(e.currentTarget);
    const tenantData: UpdateTenantData = {
      name: formData.get('name') as string,
      environment: formData.get('environment') as string,
      status: formData.get('status') as string,
      settings: {
        max_documents: parseInt(formData.get('max_documents') as string) || 1000,
        max_templates: parseInt(formData.get('max_templates') as string) || 50,
      },
    };
    updateTenantMutation.mutate({ tenantId: selectedTenant.id, tenantData });
  };

  // Handle delete tenant
  const handleDeleteTenant = (tenantId: string) => {
    if (window.confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      deleteTenantMutation.mutate(tenantId);
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    return status === 'active' ? <CheckCircle size={14} /> : <XCircle size={14} />;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Get tenant initials
  const getTenantInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  // Column definitions for the table
  const columns: ColumnDefinition<Tenant>[] = [
    {
      key: 'tenant',
      label: 'Tenant',
      width: '2fr',
      align: 'left',
      render: (_, tenant) => (
        <TenantInfo>
          <TenantAvatar>
            {getTenantInitials(tenant.name)}
          </TenantAvatar>
          <TenantDetails>
            <TenantName>{tenant.name}</TenantName>
            <TenantEnvironment>ID: {tenant.id.slice(0, 8)}...</TenantEnvironment>
          </TenantDetails>
        </TenantInfo>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: '1fr',
      align: 'left',
      render: (_, tenant) => (
        <StatusBadge $status={tenant.status}>
          {getStatusIcon(tenant.status)}
          {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
        </StatusBadge>
      )
    },
    {
      key: 'environment',
      label: 'Environment',
      width: '1fr',
      align: 'left',
      render: (_, tenant) => (
        <EnvironmentBadge $environment={tenant.environment}>
          {tenant.environment.charAt(0).toUpperCase() + tenant.environment.slice(1)}
        </EnvironmentBadge>
      )
    },
    {
      key: 'settings',
      label: 'Settings',
      width: '1.5fr',
      align: 'left',
      render: (_, tenant) => (
        <TenantSettings>
          <SettingItem>
            <SettingLabel>Max Docs:</SettingLabel>
            <SettingValue>{tenant.settings?.max_documents || 'Unlimited'}</SettingValue>
          </SettingItem>
          <SettingItem>
            <SettingLabel>Max Templates:</SettingLabel>
            <SettingValue>{tenant.settings?.max_templates || 'Unlimited'}</SettingValue>
          </SettingItem>
        </TenantSettings>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      width: '1fr',
      align: 'left',
      render: (_, tenant) => formatDate(tenant.created_at)
    }
  ];

  // Actions for each row
  const renderActions = (tenant: Tenant) => (
    <ActionGroup>
      <ActionButton
        onClick={() => setSelectedTenant(tenant)}
        title="Manage tenant"
      >
        <Settings size={16} />
      </ActionButton>
      <ActionButton
        onClick={() => handleDeleteTenant(tenant.id)}
        title="Delete tenant"
      >
        <Trash2 size={16} />
      </ActionButton>
    </ActionGroup>
  );

  // Check if user has permission to access tenant management
  if (!hasPermission('tenants:read_all')) {
    return (
      <PageContainer>
        <ErrorMessage message="Access denied. System admin privileges required." />
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingSpinner size={48} />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorMessage message="Failed to load tenants" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
        <PageHeader>
          <PageTitle>
            <Building2 size={24} />
            Tenant Management
          </PageTitle>
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={!hasPermission('tenants:create')}
          >
            <Plus size={16} />
            Add Tenant
          </Button>
        </PageHeader>

        {message && (
          <div style={{ marginBottom: '1rem' }}>
            {message.type === 'success' ? (
              <SuccessMessage message={message.text} />
            ) : (
              <ErrorMessage message={message.text} />
            )}
          </div>
        )}

        <Table
          data={tenants || []}
          columns={columns}
          loading={isLoading}
          error={error ? 'Failed to load tenants' : undefined}
          emptyState={{
            icon: <Building2 size={48} />,
            title: 'No tenants found',
            description: 'Get started by adding your first tenant.'
          }}
          actions={renderActions}
        />

        {/* Create Tenant Modal */}
        {showCreateModal && (
          <ModalOverlay onClick={() => setShowCreateModal(false)}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Create New Tenant</ModalTitle>
                <CloseButton onClick={() => setShowCreateModal(false)}>
                  <XCircle size={20} />
                </CloseButton>
              </ModalHeader>
              <form onSubmit={handleCreateTenant}>
                <FormGroup>
                  <Label htmlFor="name">Tenant Name</Label>
                  <Input
                    type="text"
                    id="name"
                    name="name"
                    required
                    placeholder="Acme Corporation"
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="environment">Environment</Label>
                  <Select id="environment" name="environment" defaultValue="development">
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="max_documents">Max Documents</Label>
                  <Input
                    type="number"
                    id="max_documents"
                    name="max_documents"
                    defaultValue="1000"
                    min="1"
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="max_templates">Max Templates</Label>
                  <Input
                    type="number"
                    id="max_templates"
                    name="max_templates"
                    defaultValue="50"
                    min="1"
                  />
                </FormGroup>
                <ModalActions>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTenantMutation.isLoading}
                  >
                    {createTenantMutation.isLoading ? 'Creating...' : 'Create Tenant'}
                  </Button>
                </ModalActions>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* Tenant Management Modal */}
        <TenantConfigModal
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
        />
    </PageContainer>
  );
};

export default TenantsPage;
