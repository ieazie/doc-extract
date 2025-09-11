import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Users, 
  Shield, 
  Key, 
  BarChart3, 
  TrendingUp, 
  Activity,
  Database,
  Server,
  Cpu
} from 'lucide-react';

import { apiClient, ProcessingStats, Category, DocumentListResponse, HealthStatus, User } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// Styled Components
const AdminContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
`;

const AdminHeader = styled.div`
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.text.primary};
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 1.1rem;
  margin: 0;
`;

const AdminBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  background: ${props => props.theme.colors.error}20;
  color: ${props => props.theme.colors.error};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: ${props => props.theme.typography.sizes.sm};
  font-weight: ${props => props.theme.typography.weights.medium};
  margin-left: ${props => props.theme.spacing.sm};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const StatCard = styled.div<{ accent?: string }>`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: ${props => props.theme.shadows.md};
  border-left: 4px solid ${props => props.accent || props.theme.colors.primary};
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

const StatValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 0.25rem;
`;

const StatDescription = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.text.secondary};
`;

const AdminSections = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
`;

const AdminSection = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: ${props => props.theme.shadows.md};
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
`;

const SectionContent = styled.div`
  color: ${props => props.theme.colors.text.secondary};
`;

const QuickAction = styled.button`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  width: 100%;
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.surfaceHover};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  color: ${props => props.theme.colors.text.primary};
  text-align: left;
  cursor: pointer;
  transition: all ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  margin-bottom: ${props => props.theme.spacing.sm};

  &:hover {
    background: ${props => props.theme.colors.primary}10;
    border-color: ${props => props.theme.colors.primary};
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const QuickActionText = styled.div`
  display: flex;
  flex-direction: column;
`;

const QuickActionTitle = styled.span`
  font-weight: ${props => props.theme.typography.weights.medium};
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const QuickActionDescription = styled.span`
  font-size: ${props => props.theme.typography.sizes.sm};
  color: ${props => props.theme.colors.text.secondary};
`;

const SystemStatus = styled.div<{ status: 'healthy' | 'degraded' | 'unhealthy' }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: ${props => props.theme.typography.sizes.sm};
  font-weight: ${props => props.theme.typography.weights.medium};
  margin-bottom: 1rem;

  ${props => {
    switch (props.status) {
      case 'healthy':
        return `
          background: ${props.theme.colors.success}15;
          color: ${props.theme.colors.success};
          border: 1px solid ${props.theme.colors.success}30;
        `;
      case 'degraded':
        return `
          background: ${props.theme.colors.warning}15;
          color: ${props.theme.colors.warning};
          border: 1px solid ${props.theme.colors.warning}30;
        `;
      default:
        return `
          background: ${props.theme.colors.error}15;
          color: ${props.theme.colors.error};
          border: 1px solid ${props.theme.colors.error}30;
        `;
    }
  }}
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.colors.text.muted};
`;

// Component
export const AdminDashboard: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load admin dashboard data
  const loadAdminData = async () => {
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const [statsData, usersData, healthData] = await Promise.all([
        apiClient.getProcessingStats().catch((error) => {
          console.error('Failed to load processing stats:', error);
          return null;
        }),
        apiClient.getUsers().catch((error) => {
          console.error('Failed to load users:', error);
          return [];
        }),
        apiClient.getDetailedHealth().catch((error) => {
          console.error('Failed to load health data:', error);
          return null;
        })
      ]);

      setStats(statsData);
      setUsers(usersData);
      setHealth(healthData);
    } catch (error) {
      console.error('Failed to load admin dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Get system status
  const getSystemStatus = (): 'healthy' | 'degraded' | 'unhealthy' => {
    if (!health) return 'unhealthy';
    if (health.status === 'healthy') return 'healthy';
    if (health.status === 'degraded') return 'degraded';
    return 'unhealthy';
  };

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      default: return '❌';
    }
  };

  // Get role counts
  const getRoleCounts = () => {
    const counts = { admin: 0, user: 0, viewer: 0 };
    users.forEach(user => {
      if (counts.hasOwnProperty(user.role)) {
        counts[user.role as keyof typeof counts]++;
      }
    });
    return counts;
  };

  const roleCounts = getRoleCounts();

  if (loading) {
    return (
      <AdminContainer>
        <LoadingState>
          <div>⏳ Loading admin dashboard...</div>
        </LoadingState>
      </AdminContainer>
    );
  }

  return (
    <AdminContainer>
      <AdminHeader>
        <Title>
          <Shield size={32} />
          Admin Dashboard
          <AdminBadge>
            <Shield size={14} />
            Administrator
          </AdminBadge>
        </Title>
        <Subtitle>
          System overview, user management, and administrative controls
        </Subtitle>
        
        <SystemStatus status={getSystemStatus()}>
          {getStatusIcon(getSystemStatus())}
          System Status: {getSystemStatus().charAt(0).toUpperCase() + getSystemStatus().slice(1)}
        </SystemStatus>
      </AdminHeader>

      {/* Admin Statistics */}
      <StatsGrid>
        <StatCard accent="#3b82f6">
          <StatValue>{stats?.total_documents || 0}</StatValue>
          <StatLabel>Total Documents</StatLabel>
          <StatDescription>All tenant documents</StatDescription>
        </StatCard>

        <StatCard accent="#10b981">
          <StatValue>{stats?.status_counts?.completed || 0}</StatValue>
          <StatLabel>Processed</StatLabel>
          <StatDescription>Successfully extracted</StatDescription>
        </StatCard>

        <StatCard accent="#f59e0b">
          <StatValue>{stats?.status_counts?.processing || 0}</StatValue>
          <StatLabel>Processing</StatLabel>
          <StatDescription>Currently being processed</StatDescription>
        </StatCard>

        <StatCard accent="#ef4444">
          <StatValue>{stats?.status_counts?.failed || 0}</StatValue>
          <StatLabel>Failed</StatLabel>
          <StatDescription>Processing failed</StatDescription>
        </StatCard>

        <StatCard accent="#8b5cf6">
          <StatValue>{users.length}</StatValue>
          <StatLabel>Total Users</StatLabel>
          <StatDescription>Active users in tenant</StatDescription>
        </StatCard>

        <StatCard accent="#06b6d4">
          <StatValue>{stats?.completion_rate || 0}%</StatValue>
          <StatLabel>Success Rate</StatLabel>
          <StatDescription>Processing success rate</StatDescription>
        </StatCard>
      </StatsGrid>

      {/* Admin Sections */}
      <AdminSections>
        {/* User Management */}
        <AdminSection>
          <SectionHeader>
            <Users size={20} />
            <SectionTitle>User Management</SectionTitle>
          </SectionHeader>
          <SectionContent>
            <QuickAction onClick={() => window.location.href = '/users'}>
              <Users size={20} />
              <QuickActionText>
                <QuickActionTitle>Manage Users</QuickActionTitle>
                <QuickActionDescription>
                  View, edit, and manage user accounts and roles
                </QuickActionDescription>
              </QuickActionText>
            </QuickAction>
            
            <QuickAction onClick={() => window.location.href = '/api-keys'}>
              <Key size={20} />
              <QuickActionText>
                <QuickActionTitle>API Keys</QuickActionTitle>
                <QuickActionDescription>
                  Manage API keys for programmatic access
                </QuickActionDescription>
              </QuickActionText>
            </QuickAction>
          </SectionContent>
        </AdminSection>

        {/* System Analytics */}
        <AdminSection>
          <SectionHeader>
            <BarChart3 size={20} />
            <SectionTitle>System Analytics</SectionTitle>
          </SectionHeader>
          <SectionContent>
            <QuickAction onClick={() => window.location.href = '/analytics'}>
              <TrendingUp size={20} />
              <QuickActionText>
                <QuickActionTitle>Usage Analytics</QuickActionTitle>
                <QuickActionDescription>
                  View detailed usage statistics and trends
                </QuickActionDescription>
              </QuickActionText>
            </QuickAction>
            
            <QuickAction onClick={() => window.location.href = '/analytics'}>
              <Activity size={20} />
              <QuickActionText>
                <QuickActionTitle>Performance Metrics</QuickActionTitle>
                <QuickActionDescription>
                  Monitor system performance and health
                </QuickActionDescription>
              </QuickActionText>
            </QuickAction>
          </SectionContent>
        </AdminSection>

        {/* System Health */}
        <AdminSection>
          <SectionHeader>
            <Server size={20} />
            <SectionTitle>System Health</SectionTitle>
          </SectionHeader>
          <SectionContent>
            {health?.services && (
              <>
                <QuickAction>
                  <Database size={20} />
                  <QuickActionText>
                    <QuickActionTitle>Database</QuickActionTitle>
                    <QuickActionDescription>
                      Status: {health.services.database?.status || 'Unknown'}
                    </QuickActionDescription>
                  </QuickActionText>
                </QuickAction>
                
                <QuickAction>
                  <Server size={20} />
                  <QuickActionText>
                    <QuickActionTitle>Storage (S3)</QuickActionTitle>
                    <QuickActionDescription>
                      Status: {health.services.s3?.status || 'Unknown'}
                    </QuickActionDescription>
                  </QuickActionText>
                </QuickAction>
                
                <QuickAction>
                  <Cpu size={20} />
                  <QuickActionText>
                    <QuickActionTitle>AI Model (Ollama)</QuickActionTitle>
                    <QuickActionDescription>
                      Status: {health.services.ollama?.status || 'Unknown'}
                    </QuickActionDescription>
                  </QuickActionText>
                </QuickAction>
              </>
            )}
          </SectionContent>
        </AdminSection>

        {/* User Statistics */}
        <AdminSection>
          <SectionHeader>
            <Users size={20} />
            <SectionTitle>User Statistics</SectionTitle>
          </SectionHeader>
          <SectionContent>
            <QuickAction>
              <Shield size={20} />
              <QuickActionText>
                <QuickActionTitle>Administrators</QuickActionTitle>
                <QuickActionDescription>
                  {roleCounts.admin} admin users
                </QuickActionDescription>
              </QuickActionText>
            </QuickAction>
            
            <QuickAction>
              <Users size={20} />
              <QuickActionText>
                <QuickActionTitle>Regular Users</QuickActionTitle>
                <QuickActionDescription>
                  {roleCounts.user} standard users
                </QuickActionDescription>
              </QuickActionText>
            </QuickAction>
            
            <QuickAction>
              <Users size={20} />
              <QuickActionText>
                <QuickActionTitle>Viewers</QuickActionTitle>
                <QuickActionDescription>
                  {roleCounts.viewer} read-only users
                </QuickActionDescription>
              </QuickActionText>
            </QuickAction>
          </SectionContent>
        </AdminSection>
      </AdminSections>
    </AdminContainer>
  );
};

export default AdminDashboard;
