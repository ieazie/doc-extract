import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Building2, 
  Users, 
  FileText, 
  Settings, 
  BarChart3, 
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const DashboardContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 1.1rem;
  margin: 0;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: white;
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: 1.5rem;
  box-shadow: ${props => props.theme.shadows.sm};
  border: 1px solid ${props => props.theme.colors.border};
  transition: all 0.2s ease;

  &:hover {
    box-shadow: ${props => props.theme.shadows.md};
    transform: translateY(-2px);
  }
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const StatTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
`;

const StatIcon = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${props => props.theme.borderRadius.md};
  background: ${props => props.$color}15;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color};
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 0.25rem;
`;

const StatChange = styled.div<{ $positive: boolean }>`
  font-size: 0.875rem;
  color: ${props => props.$positive ? '#10b981' : '#ef4444'};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ContentCard = styled.div`
  background: white;
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: 1.5rem;
  box-shadow: ${props => props.theme.shadows.sm};
  border: 1px solid ${props => props.theme.colors.border};
`;

const ContentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const ContentTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
`;

const ViewAllLink = styled.a`
  color: ${props => props.theme.colors.primary};
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`;

const TenantList = styled.div`
  space-y: 1rem;
`;

const TenantItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  margin-bottom: 0.75rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const TenantInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const TenantStatus = styled.span<{ $status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: ${props => props.theme.borderRadius.full};
  font-size: 0.75rem;
  font-weight: 500;
  background: ${props => {
    switch (props.$status) {
      case 'active': return '#10b98115';
      case 'suspended': return '#ef444415';
      case 'pending': return '#f59e0b15';
      default: return '#6b728015';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'active': return '#10b981';
      case 'suspended': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  }};
`;

const ActivityList = styled.div`
  space-y: 0.75rem;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const ActivityIcon = styled.div<{ $type: string }>`
  width: 32px;
  height: 32px;
  border-radius: ${props => props.theme.borderRadius.full};
  background: ${props => {
    switch (props.$type) {
      case 'user': return '#3b82f615';
      case 'document': return '#10b98115';
      case 'extraction': return '#f59e0b15';
      case 'system': return '#8b5cf615';
      default: return '#6b728015';
    }
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => {
    switch (props.$type) {
      case 'user': return '#3b82f6';
      case 'document': return '#10b981';
      case 'extraction': return '#f59e0b';
      case 'system': return '#8b5cf6';
      default: return '#6b7280';
    }
  }};
`;

const ActivityContent = styled.div`
  flex: 1;
`;

const ActivityText = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 0.25rem;
`;

const ActivityTime = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.text.secondary};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.colors.text.secondary};
`;

interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'suspended' | 'pending';
  userCount: number;
  documentCount: number;
  createdAt: string;
}

interface Activity {
  id: string;
  type: 'user' | 'document' | 'extraction' | 'system';
  message: string;
  timestamp: string;
  icon: React.ComponentType<any>;
}

const SystemAdminDashboard: React.FC = () => {
  const { user, isSystemAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalTenants: 0,
    totalUsers: 0,
    totalDocuments: 0,
    activeExtractions: 0,
    systemHealth: 'healthy'
  });
  const [recentTenants, setRecentTenants] = useState<Tenant[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  useEffect(() => {
    // TODO: Fetch real data from API
    // For now, showing empty states as requested
    setStats({
      totalTenants: 0,
      totalUsers: 0,
      totalDocuments: 0,
      activeExtractions: 0,
      systemHealth: 'unknown'
    });

    setRecentTenants([]);
    setRecentActivity([]);
  }, []);

  if (!isSystemAdmin()) {
    return (
      <DashboardContainer>
        <ContentCard>
          <h2>Access Denied</h2>
          <p>You don&apos;t have permission to access the System Admin Dashboard.</p>
        </ContentCard>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <Header>
        <Title>System Admin Dashboard</Title>
        <Subtitle>Platform overview and management</Subtitle>
      </Header>

      <StatsGrid>
        <StatCard>
          <StatHeader>
            <StatTitle>Total Tenants</StatTitle>
            <StatIcon $color="#3b82f6">
              <Building2 size={20} />
            </StatIcon>
          </StatHeader>
          <StatValue>{stats.totalTenants}</StatValue>
          {stats.totalTenants > 0 && (
            <StatChange $positive={true}>
              <TrendingUp size={14} />
              No recent changes
            </StatChange>
          )}
        </StatCard>

        <StatCard>
          <StatHeader>
            <StatTitle>Total Users</StatTitle>
            <StatIcon $color="#10b981">
              <Users size={20} />
            </StatIcon>
          </StatHeader>
          <StatValue>{stats.totalUsers}</StatValue>
          {stats.totalUsers > 0 && (
            <StatChange $positive={true}>
              <TrendingUp size={14} />
              No recent changes
            </StatChange>
          )}
        </StatCard>

        <StatCard>
          <StatHeader>
            <StatTitle>Total Documents</StatTitle>
            <StatIcon $color="#f59e0b">
              <FileText size={20} />
            </StatIcon>
          </StatHeader>
          <StatValue>{stats.totalDocuments.toLocaleString()}</StatValue>
          {stats.totalDocuments > 0 && (
            <StatChange $positive={true}>
              <TrendingUp size={14} />
              No recent changes
            </StatChange>
          )}
        </StatCard>

        <StatCard>
          <StatHeader>
            <StatTitle>Active Extractions</StatTitle>
            <StatIcon $color="#8b5cf6">
              <Activity size={20} />
            </StatIcon>
          </StatHeader>
          <StatValue>{stats.activeExtractions}</StatValue>
          {stats.activeExtractions > 0 && (
            <StatChange $positive={false}>
              <Clock size={14} />
              Processing
            </StatChange>
          )}
        </StatCard>
      </StatsGrid>

      <ContentGrid>
        <ContentCard>
          <ContentHeader>
            <ContentTitle>Recent Tenants</ContentTitle>
            <ViewAllLink href="/system/tenants">View All</ViewAllLink>
          </ContentHeader>
          <TenantList>
            {recentTenants.length > 0 ? (
              recentTenants.map((tenant) => (
                <TenantItem key={tenant.id}>
                  <TenantInfo>
                    <Building2 size={20} color="#6b7280" />
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                        {tenant.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {tenant.userCount} users • {tenant.documentCount} documents
                      </div>
                    </div>
                  </TenantInfo>
                  <TenantStatus $status={tenant.status}>
                    {tenant.status}
                  </TenantStatus>
                </TenantItem>
              ))
            ) : (
              <EmptyState>No tenants found</EmptyState>
            )}
          </TenantList>
        </ContentCard>

        <ContentCard>
          <ContentHeader>
            <ContentTitle>Recent Activity</ContentTitle>
            <ViewAllLink href="/system/analytics">View All</ViewAllLink>
          </ContentHeader>
          <ActivityList>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <ActivityItem key={activity.id}>
                  <ActivityIcon $type={activity.type}>
                    <activity.icon size={16} />
                  </ActivityIcon>
                  <ActivityContent>
                    <ActivityText>{activity.message}</ActivityText>
                    <ActivityTime>{activity.timestamp}</ActivityTime>
                  </ActivityContent>
                </ActivityItem>
              ))
            ) : (
              <EmptyState>No recent activity</EmptyState>
            )}
          </ActivityList>
        </ContentCard>
      </ContentGrid>
    </DashboardContainer>
  );
};

export default SystemAdminDashboard;
