import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import styled from 'styled-components';
import { DEFAULT_TENANT_ID, DEFAULT_TENANT_NAME } from '../constants/tenant';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  User as UserIcon, 
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle
} from 'lucide-react';

import { AuthService, serviceFactory, User } from '@/services/api/index';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { SuccessMessage } from '@/components/common/SuccessMessage';
import { Table, ColumnDefinition } from '@/components/table/Table';
import { ActionButton, ActionGroup } from '@/components/table/Table.styled';

// Types - User interface is imported from services/api

interface CreateUserData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  tenant_id?: string;
}

interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  role?: string;
  status?: string;
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
const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const UserAvatar = styled.div`
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

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const UserName = styled.span`
  font-weight: ${props => props.theme.typography.weights.medium};
  color: ${props => props.theme.colors.text.primary};
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  flex: 1;
  min-width: 0;
  max-width: 100%;
`;

const UserEmail = styled.span`
  font-size: ${props => props.theme.typography.sizes.sm};
  color: ${props => props.theme.colors.text.secondary};
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  flex: 1;
  min-width: 0;
  max-width: 100%;
`;

const RoleBadge = styled.span<{ $role: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: ${props => props.theme.typography.sizes.sm};
  font-weight: ${props => props.theme.typography.weights.medium};
  
  ${props => {
    switch (props.$role) {
      case 'admin':
        return `
          background: ${props.theme.colors.error}20;
          color: ${props.theme.colors.error};
        `;
      case 'user':
        return `
          background: ${props.theme.colors.primary}20;
          color: ${props.theme.colors.primary};
        `;
      case 'viewer':
        return `
          background: ${props.theme.colors.warning}20;
          color: ${props.theme.colors.warning};
        `;
      default:
        return `
          background: ${props.theme.colors.text.secondary}20;
          color: ${props.theme.colors.text.secondary};
        `;
    }
  }}
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
const UsersPage: React.FC = () => {
  const { user: currentUser, isSystemAdmin, isTenantAdmin, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check permission without early return to avoid conditional hooks
  const canReadUsers = hasPermission('users:read');

  // Fetch users
  const { data: users, isLoading, error } = useQuery<User[]>(
    'users',
    () => {
      const authService = serviceFactory.get<AuthService>('auth');
      return authService.getUsers();
    },
    {
      enabled: !!currentUser && canReadUsers,
    }
  );

  // Create user mutation
  const createUserMutation = useMutation(
    (userData: CreateUserData) => {
      const authService = serviceFactory.get<AuthService>('auth');
      return authService.createUser(userData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        setShowCreateModal(false);
        setMessage({ type: 'success', text: 'User created successfully' });
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to create user' });
      },
    }
  );

  // Update user mutation
  const updateUserMutation = useMutation(
    ({ userId, userData }: { userId: string; userData: UpdateUserData }) => {
      const authService = serviceFactory.get<AuthService>('auth');
      return authService.updateUser(userId, userData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        setEditingUser(null);
        setMessage({ type: 'success', text: 'User updated successfully' });
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to update user' });
      },
    }
  );

  // Handle create user
  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userData: CreateUserData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      role: formData.get('role') as string,
    };
    
    // Add tenant_id for system admins
    if (isSystemAdmin() && formData.get('tenant_id')) {
      userData.tenant_id = formData.get('tenant_id') as string;
    }
    
    createUserMutation.mutate(userData);
  };

  // Handle update user
  const handleUpdateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    
    const formData = new FormData(e.currentTarget);
    const userData: UpdateUserData = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      role: formData.get('role') as string,
      status: formData.get('status') as string,
    };
    updateUserMutation.mutate({ userId: editingUser.id, userData });
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield size={14} />;
      case 'user':
        return <UserIcon size={14} />;
      case 'viewer':
        return <Eye size={14} />;
      default:
        return <UserIcon size={14} />;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    return status === 'active' ? <CheckCircle size={14} /> : <XCircle size={14} />;
  };

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  // Get user initials
  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Column definitions for the table
  const columns: ColumnDefinition<User>[] = [
    {
      key: 'user',
      label: 'User',
      width: '3fr',
      align: 'left' as const,
      render: (_, user) => (
        <UserInfo>
          <UserAvatar style={{ flexShrink: 0 }}>
            {getUserInitials(user.first_name, user.last_name)}
          </UserAvatar>
          <UserDetails>
            <UserName title={`${user.first_name} ${user.last_name}`}>
              {user.first_name} {user.last_name}
            </UserName>
            <UserEmail title={user.email}>
              {user.email}
            </UserEmail>
          </UserDetails>
        </UserInfo>
      )
    },
    {
      key: 'role',
      label: 'Role',
      width: '1fr',
      align: 'left' as const,
      render: (_, user) => (
        <RoleBadge $role={user.role}>
          {getRoleIcon(user.role)}
          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
        </RoleBadge>
      )
    },
    ...(isSystemAdmin() ? [{
      key: 'tenant',
      label: 'Tenant',
      width: '1fr',
      align: 'left' as const,
      render: (_: any, user: User) => (
        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          {user.tenant_id || 'N/A'}
        </span>
      )
    }] : []),
    {
      key: 'status',
      label: 'Status',
      width: '1fr',
      align: 'left' as const,
      render: (_, user) => (
        <StatusBadge $status={user.status}>
          {getStatusIcon(user.status)}
          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
        </StatusBadge>
      )
    },
    {
      key: 'last_login',
      label: 'Last Login',
      width: '1fr',
      align: 'left' as const,
      render: (_, user) => formatDate(user.last_login)
    },
    {
      key: 'created_at',
      label: 'Created',
      width: '1fr',
      align: 'left' as const,
      render: (_, user) => formatDate(user.created_at)
    }
  ];

  // Actions for each row
  const renderActions = (user: User) => {
    // Check if current user can edit this user
    const canEdit = hasPermission('users:write') && (
      isSystemAdmin() || // System admins can edit anyone
      (isTenantAdmin() && user.tenant_id === currentUser?.tenant_id) // Tenant admins can only edit users in their tenant
    );

    if (!canEdit) {
      return (
        <ActionGroup>
          <ActionButton
            title="View user"
            disabled
          >
            <Eye size={16} />
          </ActionButton>
        </ActionGroup>
      );
    }

    return (
      <ActionGroup>
        <ActionButton
          onClick={() => setEditingUser(user)}
          title="Edit user"
        >
          <Edit size={16} />
        </ActionButton>
      </ActionGroup>
    );
  };

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
        <ErrorMessage message="Failed to load users" />
      </PageContainer>
    );
  }

  // Check permission after all hooks and render access denied if needed
  if (!canReadUsers) {
    return (
      <PageContainer>
        <PageHeader>
          <PageTitle>Access Denied</PageTitle>
        </PageHeader>
        <ErrorMessage message="You don't have permission to access user management." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
        <PageHeader>
          <PageTitle>
            <Users size={24} />
            User Management
          </PageTitle>
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={!hasPermission('users:write')}
          >
            <Plus size={16} />
            Add User
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
          data={users || []}
          columns={columns}
          loading={isLoading}
          error={error ? 'Failed to load users' : undefined}
          emptyState={{
            icon: <Users size={48} />,
            title: 'No users found',
            description: 'Get started by adding your first user.'
          }}
          actions={renderActions}
        />

        {/* Create User Modal */}
        {showCreateModal && (
          <ModalOverlay onClick={() => setShowCreateModal(false)}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Create New User</ModalTitle>
                <CloseButton onClick={() => setShowCreateModal(false)}>
                  <XCircle size={20} />
                </CloseButton>
              </ModalHeader>
              <form onSubmit={handleCreateUser}>
                <FormGroup>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder="user@example.com"
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    type="password"
                    id="password"
                    name="password"
                    required
                    placeholder="Enter password"
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    type="text"
                    id="first_name"
                    name="first_name"
                    required
                    placeholder="John"
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    type="text"
                    id="last_name"
                    name="last_name"
                    required
                    placeholder="Doe"
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="role">Role</Label>
                  <Select id="role" name="role" defaultValue="user">
                    {isSystemAdmin() && <option value="system_admin">System Admin</option>}
                    <option value="tenant_admin">Tenant Admin</option>
                    <option value="user">User</option>
                    <option value="viewer">Viewer</option>
                  </Select>
                </FormGroup>
                {isSystemAdmin() && (
                  <FormGroup>
                    <Label htmlFor="tenant_id">Tenant</Label>
                    <Select id="tenant_id" name="tenant_id" required>
                      <option value="">Select Tenant</option>
                      {/* TODO: Fetch tenants from API */}
                      <option value={DEFAULT_TENANT_ID}>{DEFAULT_TENANT_NAME}</option>
                    </Select>
                  </FormGroup>
                )}
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
                    disabled={createUserMutation.isLoading}
                  >
                    {createUserMutation.isLoading ? 'Creating...' : 'Create User'}
                  </Button>
                </ModalActions>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <ModalOverlay onClick={() => setEditingUser(null)}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Edit User</ModalTitle>
                <CloseButton onClick={() => setEditingUser(null)}>
                  <XCircle size={20} />
                </CloseButton>
              </ModalHeader>
              <form onSubmit={handleUpdateUser}>
                <FormGroup>
                  <Label htmlFor="edit_first_name">First Name</Label>
                  <Input
                    type="text"
                    id="edit_first_name"
                    name="first_name"
                    defaultValue={editingUser.first_name}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="edit_last_name">Last Name</Label>
                  <Input
                    type="text"
                    id="edit_last_name"
                    name="last_name"
                    defaultValue={editingUser.last_name}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="edit_role">Role</Label>
                  <Select
                    id="edit_role"
                    name="role"
                    defaultValue={editingUser.role}
                  >
                    {isSystemAdmin() && <option value="system_admin">System Admin</option>}
                    <option value="tenant_admin">Tenant Admin</option>
                    <option value="user">User</option>
                    <option value="viewer">Viewer</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="edit_status">Status</Label>
                  <Select
                    id="edit_status"
                    name="status"
                    defaultValue={editingUser.status}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </FormGroup>
                <ModalActions>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditingUser(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateUserMutation.isLoading}
                  >
                    {updateUserMutation.isLoading ? 'Updating...' : 'Update User'}
                  </Button>
                </ModalActions>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}
    </PageContainer>
  );
};

export default UsersPage;
