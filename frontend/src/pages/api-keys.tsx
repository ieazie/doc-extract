/**
 * API Keys Management Page
 * Allows users to manage their API keys
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styled from 'styled-components';
import { 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { SuccessMessage } from '@/components/common/SuccessMessage';
import Button from '@/components/ui/Button';
import { Table, ColumnDefinition } from '@/components/table/Table';
import { ActionButton, ActionGroup } from '@/components/table/Table.styled';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
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

const StatusBadge = styled.span<{ $status: 'active' | 'inactive' | 'expired' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${props => {
    switch (props.$status) {
      case 'active': return '#dcfce7';
      case 'inactive': return '#fef3c7';
      case 'expired': return '#fee2e2';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'active': return '#166534';
      case 'inactive': return '#92400e';
      case 'expired': return '#dc2626';
      default: return '#6b7280';
    }
  }};
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 0.5rem;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.375rem;
  
  &:hover {
    background: #f3f4f6;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

interface ApiKey {
  id: string;
  name: string;
  key: string;
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
  expires_at: string | null;
  last_used: string | null;
  permissions: string[];
}

const ApiKeysPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check permissions
  if (!hasPermission('api-keys:read')) {
    return (
      <PageContainer>
        <ErrorMessage message="You don't have permission to access API keys management." />
      </PageContainer>
    );
  }

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await apiClient.getApiKeys();
      // setApiKeys(response.data);
      
      // Mock data for now
      setApiKeys([
        {
          id: '1',
          name: 'Production API Key',
          key: 'sk-proj-1234567890abcdef',
          status: 'active',
          created_at: '2024-01-15T10:00:00Z',
          expires_at: null,
          last_used: '2024-01-20T15:30:00Z',
          permissions: ['read', 'write']
        },
        {
          id: '2',
          name: 'Development Key',
          key: 'sk-dev-abcdef1234567890',
          status: 'inactive',
          created_at: '2024-01-10T09:00:00Z',
          expires_at: '2024-12-31T23:59:59Z',
          last_used: '2024-01-18T12:00:00Z',
          permissions: ['read']
        }
      ]);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      setMessage({ type: 'error', text: 'Failed to load API keys' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      // TODO: Replace with actual API call
      // const response = await apiClient.createApiKey({
      //   name: formData.get('name') as string,
      //   description: formData.get('description') as string,
      //   permissions: (formData.get('permissions') as string).split(',').map(p => p.trim())
      // });
      
      setMessage({ type: 'success', text: 'API key created successfully' });
      setShowCreateModal(false);
      loadApiKeys();
    } catch (error) {
      console.error('Failed to create API key:', error);
      setMessage({ type: 'error', text: 'Failed to create API key' });
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      // TODO: Replace with actual API call
      // await apiClient.deleteApiKey(id);
      
      setMessage({ type: 'success', text: 'API key deleted successfully' });
      loadApiKeys();
    } catch (error) {
      console.error('Failed to delete API key:', error);
      setMessage({ type: 'error', text: 'Failed to delete API key' });
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKey(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'API key copied to clipboard' });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const columns: ColumnDefinition<ApiKey>[] = [
    {
      key: 'name',
      label: 'Name',
      width: '2fr',
      align: 'left' as const,
      render: (_, apiKey) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
            {apiKey.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            Created: {formatDate(apiKey.created_at)}
          </div>
        </div>
      )
    },
    {
      key: 'key',
      label: 'API Key',
      width: '3fr',
      align: 'left' as const,
      render: (_, apiKey) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <code style={{ 
            backgroundColor: '#f3f4f6', 
            padding: '0.25rem 0.5rem', 
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            fontFamily: 'monospace'
          }}>
            {showKey[apiKey.id] ? apiKey.key : `${apiKey.key.substring(0, 8)}...`}
          </code>
          <button
            onClick={() => toggleKeyVisibility(apiKey.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            title={showKey[apiKey.id] ? 'Hide key' : 'Show key'}
          >
            {showKey[apiKey.id] ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            onClick={() => copyToClipboard(apiKey.key)}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            title="Copy to clipboard"
          >
            <Copy size={14} />
          </button>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: '1fr',
      align: 'left' as const,
      render: (_, apiKey) => (
        <StatusBadge $status={apiKey.status}>
          {apiKey.status === 'active' && <CheckCircle size={12} />}
          {apiKey.status === 'inactive' && <AlertCircle size={12} />}
          {apiKey.status === 'expired' && <AlertCircle size={12} />}
          {apiKey.status.charAt(0).toUpperCase() + apiKey.status.slice(1)}
        </StatusBadge>
      )
    },
    {
      key: 'last_used',
      label: 'Last Used',
      width: '1fr',
      align: 'left' as const,
      render: (_, apiKey) => formatDate(apiKey.last_used)
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '1fr',
      align: 'center' as const,
      render: (_, apiKey) => (
        <ActionGroup>
          <ActionButton
            onClick={() => handleDeleteApiKey(apiKey.id)}
            title="Delete API key"
            style={{ color: '#dc2626' }}
          >
            <Trash2 size={16} />
          </ActionButton>
        </ActionGroup>
      )
    }
  ];

  if (loading) {
    return (
      <PageContainer>
        <LoadingSpinner size={48} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <Key size={24} />
          API Keys
        </PageTitle>
        <Button
          onClick={() => setShowCreateModal(true)}
          disabled={!hasPermission('api-keys:write')}
        >
          <Plus size={16} />
          Create API Key
        </Button>
      </PageHeader>

      {message && (
        <div style={{ marginBottom: '2rem' }}>
          {message.type === 'success' ? (
            <SuccessMessage message={message.text} />
          ) : (
            <ErrorMessage message={message.text} />
          )}
        </div>
      )}

      <Table
        data={apiKeys}
        columns={columns}
        loading={false}
        emptyState={{
          title: "No API keys found",
          description: "Create your first API key to get started."
        }}
      />

      {/* Create API Key Modal */}
      {showCreateModal && (
        <ModalOverlay onClick={() => setShowCreateModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Create New API Key</ModalTitle>
              <CloseButton onClick={() => setShowCreateModal(false)}>
                ×
              </CloseButton>
            </ModalHeader>
            <form onSubmit={handleCreateApiKey}>
              <FormGroup>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="e.g., Production API Key"
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="description">Description</Label>
                <TextArea
                  id="description"
                  name="description"
                  placeholder="Describe what this API key will be used for..."
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="permissions">Permissions (comma-separated)</Label>
                <Input
                  id="permissions"
                  name="permissions"
                  defaultValue="read,write"
                  placeholder="read, write, admin"
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
                <Button type="submit">
                  Create API Key
                </Button>
              </ModalActions>
            </form>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
};

export default ApiKeysPage;
