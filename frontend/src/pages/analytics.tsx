/**
 * Analytics Page
 * Shows tenant-specific analytics and usage data
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styled from 'styled-components';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users,
  FileText,
  Settings,
  Activity,
  Calendar,
  Download
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import Button from '@/components/ui/Button';

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

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  border: 1px solid #e5e7eb;
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
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
`;

const StatIcon = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 0.5rem;
  background: ${props => props.$color}15;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color};
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.25rem;
`;

const StatChange = styled.div<{ $positive: boolean }>`
  font-size: 0.875rem;
  color: ${props => props.$positive ? '#10b981' : '#ef4444'};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  border: 1px solid #e5e7eb;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ChartTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

const ChartContent = styled.div`
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-style: italic;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
`;

const EmptyIcon = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto 1rem;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
`;

const FilterSection = styled.div`
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  border: 1px solid #e5e7eb;
  margin-bottom: 2rem;
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const Select = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
  }
`;

interface AnalyticsData {
  totalUsers: number;
  totalDocuments: number;
  totalTemplates: number;
  totalExtractions: number;
  usersChange: number;
  documentsChange: number;
  templatesChange: number;
  extractionsChange: number;
  period: string;
}

const AnalyticsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');

  // Check permissions
  if (!hasPermission('analytics:read')) {
    return (
      <PageContainer>
        <ErrorMessage message="You don't have permission to access analytics." />
      </PageContainer>
    );
  }

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await apiClient.getAnalytics({ period });
      // setAnalytics(response.data);
      
      // Mock data for now
      setAnalytics({
        totalUsers: 0,
        totalDocuments: 0,
        totalTemplates: 0,
        totalExtractions: 0,
        usersChange: 0,
        documentsChange: 0,
        templatesChange: 0,
        extractionsChange: 0,
        period: period
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    // TODO: Implement data export
    console.log('Export analytics data');
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingSpinner size={48} />
      </PageContainer>
    );
  }

  if (!analytics) {
    return (
      <PageContainer>
        <ErrorMessage message="Failed to load analytics data" />
      </PageContainer>
    );
  }

  const hasData = analytics.totalUsers > 0 || analytics.totalDocuments > 0 || 
                 analytics.totalTemplates > 0 || analytics.totalExtractions > 0;

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <BarChart3 size={24} />
          Analytics
        </PageTitle>
        <Button
          onClick={exportData}
          variant="secondary"
          disabled={!hasData}
        >
          <Download size={16} />
          Export Data
        </Button>
      </PageHeader>

      {/* Filters */}
      <FilterSection>
        <FilterGroup>
          <label style={{ fontWeight: 500, color: '#374151' }}>Time Period:</label>
          <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </Select>
        </FilterGroup>
      </FilterSection>

      {!hasData ? (
        <EmptyState>
          <EmptyIcon>
            <BarChart3 size={32} />
          </EmptyIcon>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>No Analytics Data</h3>
          <p style={{ margin: 0 }}>
            No data available for the selected time period. Start using the platform to see analytics.
          </p>
        </EmptyState>
      ) : (
        <>
          {/* Key Metrics */}
          <StatsGrid>
            <StatCard>
              <StatHeader>
                <StatTitle>Total Users</StatTitle>
                <StatIcon $color="#3b82f6">
                  <Users size={20} />
                </StatIcon>
              </StatHeader>
              <StatValue>{analytics.totalUsers}</StatValue>
              {analytics.usersChange !== 0 && (
                <StatChange $positive={analytics.usersChange > 0}>
                  {analytics.usersChange > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(analytics.usersChange)}% from last period
                </StatChange>
              )}
            </StatCard>

            <StatCard>
              <StatHeader>
                <StatTitle>Total Documents</StatTitle>
                <StatIcon $color="#10b981">
                  <FileText size={20} />
                </StatIcon>
              </StatHeader>
              <StatValue>{analytics.totalDocuments}</StatValue>
              {analytics.documentsChange !== 0 && (
                <StatChange $positive={analytics.documentsChange > 0}>
                  {analytics.documentsChange > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(analytics.documentsChange)}% from last period
                </StatChange>
              )}
            </StatCard>

            <StatCard>
              <StatHeader>
                <StatTitle>Total Templates</StatTitle>
                <StatIcon $color="#f59e0b">
                  <Settings size={20} />
                </StatIcon>
              </StatHeader>
              <StatValue>{analytics.totalTemplates}</StatValue>
              {analytics.templatesChange !== 0 && (
                <StatChange $positive={analytics.templatesChange > 0}>
                  {analytics.templatesChange > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(analytics.templatesChange)}% from last period
                </StatChange>
              )}
            </StatCard>

            <StatCard>
              <StatHeader>
                <StatTitle>Total Extractions</StatTitle>
                <StatIcon $color="#8b5cf6">
                  <Activity size={20} />
                </StatIcon>
              </StatHeader>
              <StatValue>{analytics.totalExtractions}</StatValue>
              {analytics.extractionsChange !== 0 && (
                <StatChange $positive={analytics.extractionsChange > 0}>
                  {analytics.extractionsChange > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(analytics.extractionsChange)}% from last period
                </StatChange>
              )}
            </StatCard>
          </StatsGrid>

          {/* Charts */}
          <ChartsGrid>
            <ChartCard>
              <ChartHeader>
                <ChartTitle>Usage Over Time</ChartTitle>
              </ChartHeader>
              <ChartContent>
                Chart visualization would go here
                <br />
                (Integration with charting library needed)
              </ChartContent>
            </ChartCard>

            <ChartCard>
              <ChartHeader>
                <ChartTitle>Activity Breakdown</ChartTitle>
              </ChartHeader>
              <ChartContent>
                Pie chart visualization would go here
                <br />
                (Integration with charting library needed)
              </ChartContent>
            </ChartCard>
          </ChartsGrid>

          {/* Additional Analytics Cards */}
          <StatsGrid>
            <ChartCard>
              <ChartHeader>
                <ChartTitle>Top Templates</ChartTitle>
              </ChartHeader>
              <ChartContent>
                Template usage data would go here
              </ChartContent>
            </ChartCard>

            <ChartCard>
              <ChartHeader>
                <ChartTitle>Extraction Success Rate</ChartTitle>
              </ChartHeader>
              <ChartContent>
                Success rate metrics would go here
              </ChartContent>
            </ChartCard>

            <ChartCard>
              <ChartHeader>
                <ChartTitle>User Activity</ChartTitle>
              </ChartHeader>
              <ChartContent>
                User activity patterns would go here
              </ChartContent>
            </ChartCard>
          </StatsGrid>
        </>
      )}
    </PageContainer>
  );
};

export default AnalyticsPage;
