/**
 * Main dashboard component with statistics, overview, and quick actions
 */
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { apiClient, ProcessingStats, Category, DocumentListResponse, HealthStatus } from '../../services/api';
import DocumentUpload from '../upload/DocumentUpload';
import DocumentList from '../documents/DocumentList';

// Styled Components
const DashboardContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
`;

const DashboardHeader = styled.div`
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.text.primary};
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 1.1rem;
  margin: 0;
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
  font-size: 0.9rem;
  color: ${props => props.theme.colors.text.secondary};
  font-weight: 500;
  margin-bottom: 0.25rem;
`;

const StatDescription = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.text.muted};
`;

const TabContainer = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  box-shadow: ${props => props.theme.shadows.sm};
  overflow: hidden;
`;

const TabHeader = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 1rem 1.5rem;
  border: none;
  background: ${props => props.active ? `${props.theme.colors.primary}15` : 'transparent'};
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.text.secondary};
  font-weight: ${props => props.active ? '600' : '500'};
  border-bottom: 2px solid ${props => props.active ? props.theme.colors.primary : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => `${props.theme.colors.primary}15`};
  }
`;

const TabContent = styled.div`
  padding: 2rem;
`;

const HealthIndicator = styled.div<{ status: 'healthy' | 'degraded' | 'unhealthy' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
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

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatusCard = styled.div<{ status: 'healthy' | 'degraded' | 'unhealthy' }>`
  background: ${props => props.theme.colors.surface};
  border-radius: 8px;
  padding: 1rem;
  border-left: 4px solid ${props => {
    switch (props.status) {
      case 'healthy': return props.theme.colors.success;
      case 'degraded': return props.theme.colors.warning;
      default: return props.theme.colors.error;
    }
  }};
  box-shadow: ${props => props.theme.shadows.sm};
`;

const StatusLabel = styled.h4`
  color: ${props => props.theme.colors.text.primary};
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
`;

const StatusMessage = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.8rem;
  margin: 0;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.colors.text.muted};
`;

// Component
export const Dashboard: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<'upload' | 'documents'>('upload');
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<DocumentListResponse | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Load dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    
    try {
      const [statsData, categoriesData, documentsData, healthData] = await Promise.all([
        apiClient.getProcessingStats().catch(() => null),
        apiClient.getCategories().catch(() => ({ categories: [], total: 0 })),
        apiClient.getDocuments({ page: 1, per_page: 5, sort_by: 'created_at', sort_order: 'desc' }).catch(() => null),
        apiClient.getDetailedHealth().catch(() => null)
      ]);

      setStats(statsData);
      setCategories(categoriesData.categories);
      setRecentDocuments(documentsData);
      setHealth(healthData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handle upload success
  const handleUploadSuccess = () => {
    loadDashboardData(); // Refresh all data
    setRefreshTrigger(prev => prev + 1); // Trigger document list refresh
    setActiveTab('documents'); // Switch to documents tab
  };

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

  if (loading) {
    return (
      <DashboardContainer>
        <LoadingState>
          <div>⏳ Loading dashboard...</div>
        </LoadingState>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <DashboardHeader>
        <Title>Document Extraction Platform</Title>
        <Subtitle>
          Upload, process, and extract structured data from your documents
        </Subtitle>
        
        <HealthIndicator status={getSystemStatus()}>
          {getStatusIcon(getSystemStatus())}
          System Status: {getSystemStatus().charAt(0).toUpperCase() + getSystemStatus().slice(1)}
        </HealthIndicator>
      </DashboardHeader>

      {/* System Status */}
      {health?.services && (
        <StatusGrid>
          <StatusCard status={health.services.database?.status === 'healthy' ? 'healthy' : 'unhealthy'}>
            <StatusLabel>Database</StatusLabel>
            <StatusMessage>{health.services.database?.message || 'Unknown'}</StatusMessage>
          </StatusCard>
          
          <StatusCard status={health.services.s3?.status === 'healthy' ? 'healthy' : 'unhealthy'}>
            <StatusLabel>Storage (S3)</StatusLabel>
            <StatusMessage>{health.services.s3?.message || 'Unknown'}</StatusMessage>
          </StatusCard>
          
          <StatusCard status={
            health.services.ollama?.status === 'healthy' ? 'healthy' : 
            health.services.ollama?.status === 'degraded' ? 'degraded' : 'unhealthy'
          }>
            <StatusLabel>AI Model (Ollama)</StatusLabel>
            <StatusMessage>{health.services.ollama?.message || 'Unknown'}</StatusMessage>
          </StatusCard>
        </StatusGrid>
      )}

      {/* Statistics */}
      <StatsGrid>
        <StatCard accent="#3b82f6">
          <StatValue>{stats?.total_documents || 0}</StatValue>
          <StatLabel>Total Documents</StatLabel>
          <StatDescription>All uploaded documents</StatDescription>
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
          <StatValue>{categories.length}</StatValue>
          <StatLabel>Categories</StatLabel>
          <StatDescription>Document categories</StatDescription>
        </StatCard>

        <StatCard accent="#06b6d4">
          <StatValue>{stats?.completion_rate || 0}%</StatValue>
          <StatLabel>Success Rate</StatLabel>
          <StatDescription>Processing success rate</StatDescription>
        </StatCard>
      </StatsGrid>

      {/* Main Content Tabs */}
      <TabContainer>
        <TabHeader>
          <Tab active={activeTab === 'upload'} onClick={() => setActiveTab('upload')}>
            📤 Upload Document
          </Tab>
          <Tab active={activeTab === 'documents'} onClick={() => setActiveTab('documents')}>
            📁 All Documents ({stats?.total_documents || 0})
          </Tab>
        </TabHeader>

        <TabContent>
          {activeTab === 'upload' ? (
            <DocumentUpload
              categories={categories}
              onUploadSuccess={handleUploadSuccess}
              onUploadError={(error) => console.error('Upload error:', error)}
            />
          ) : (
            <DocumentList
              categories={categories}
              refreshTrigger={refreshTrigger}
              onDocumentClick={(document) => {
                console.log('Document clicked:', document);
                // TODO: Navigate to document detail view
              }}
              onDocumentDelete={(documentId) => {
                console.log('Document deleted:', documentId);
                loadDashboardData(); // Refresh stats
              }}
            />
          )}
        </TabContent>
      </TabContainer>
    </DashboardContainer>
  );
};

export default Dashboard;