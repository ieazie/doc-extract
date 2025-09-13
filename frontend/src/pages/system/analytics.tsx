import React from 'react';
import styled from 'styled-components';
import { BarChart3 } from 'lucide-react';
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

const SystemAnalyticsPage: React.FC = () => {
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
        <BarChart3 size={32} color="#3b82f6" />
        <div>
          <Title>System Analytics</Title>
          <Description>Global analytics across all tenants</Description>
        </div>
      </Header>

      <Content>
        <h2>System Admin - Global Analytics</h2>
        <p>This page will contain global analytics and reporting functionality for system administrators.</p>
        <p>Features will include:</p>
        <ul>
          <li>Cross-tenant analytics</li>
          <li>System performance metrics</li>
          <li>Usage statistics across tenants</li>
          <li>Resource utilization reports</li>
          <li>Platform health monitoring</li>
        </ul>
      </Content>
    </Container>
  );
};

export default SystemAnalyticsPage;
