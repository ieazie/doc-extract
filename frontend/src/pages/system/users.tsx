import React from 'react';
import styled from 'styled-components';
import { Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
`;

const Description = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  margin: 0;
`;

const Content = styled.div`
  background: white;
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: 2rem;
  box-shadow: ${props => props.theme.shadows.sm};
`;

const SystemUsersPage: React.FC = () => {
  const { user, isSystemAdmin } = useAuth();

  if (!isSystemAdmin()) {
    return (
      <Container>
        <Content>
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Users size={32} color="#3b82f6" />
        <div>
          <Title>All Users</Title>
          <Description>Manage users across all tenants</Description>
        </div>
      </Header>

      <Content>
        <h2>System Admin - User Management</h2>
        <p>This page will contain cross-tenant user management functionality for system administrators.</p>
        <p>Features will include:</p>
        <ul>
          <li>List all users across tenants</li>
          <li>Create users in any tenant</li>
          <li>Assign users to tenants</li>
          <li>Manage user roles globally</li>
          <li>View user activity across tenants</li>
        </ul>
      </Content>
    </Container>
  );
};

export default SystemUsersPage;
