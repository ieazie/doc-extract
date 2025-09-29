import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Eye, 
  FileText, 
  BarChart3, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock
} from 'lucide-react';

import { DocumentService, CategoryService, serviceFactory, ProcessingStats, Category, DocumentListResponse } from '../../services/api/index';
import { useAuth } from '../../contexts/AuthContext';
import { useErrorState, useErrorActions } from '@/stores/globalStore';
import DocumentList from '../documents/DocumentList';

// Styled Components
const ViewerContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
`;

const ViewerHeader = styled.div`
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

const ViewerBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  background: ${props => props.theme.colors.warning}20;
  color: ${props => props.theme.colors.warning};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: ${props => props.theme.typography.sizes.sm};
  font-weight: ${props => props.theme.typography.weights.medium};
  margin-left: ${props => props.theme.spacing.sm};
`;

const ReadOnlyNotice = styled.div`
  background: ${props => props.theme.colors.warning}15;
  border: 1px solid ${props => props.theme.colors.warning}30;
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.md};
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  color: ${props => props.theme.colors.warning};
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

const TabContainer = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  box-shadow: ${props => props.theme.shadows.md};
  overflow: hidden;
`;

const TabHeader = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const Tab = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>`
  flex: 1;
  padding: 1rem 1.5rem;
  background: ${props => props.active ? props.theme.colors.surface : 'transparent'};
  border: none;
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.text.secondary};
  font-weight: ${props => props.active ? props.theme.typography.weights.medium : props.theme.typography.weights.normal};
  cursor: pointer;
  transition: all ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  border-bottom: 2px solid ${props => props.active ? props.theme.colors.primary : 'transparent'};

  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
    color: ${props => props.theme.colors.text.primary};
  }
`;

const TabContent = styled.div`
  padding: 2rem;
`;

const QuickActions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const QuickActionCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: ${props => props.theme.shadows.md};
  border: 1px solid ${props => props.theme.colors.border};
  transition: all ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  cursor: pointer;
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.lg};
    border-color: ${props => props.theme.colors.primary};
  }
`;

const QuickActionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  margin-bottom: 1rem;
`;

const QuickActionTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
`;

const QuickActionDescription = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.5;
`;

const ReadOnlyOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  
  ${QuickActionCard}:hover & {
    opacity: 1;
  }
`;

const ReadOnlyText = styled.div`
  background: ${props => props.theme.colors.warning};
  color: white;
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: ${props => props.theme.typography.sizes.sm};
  font-weight: ${props => props.theme.typography.weights.medium};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.colors.text.muted};
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.colors.error};
  
  h3 {
    margin-bottom: 1rem;
    color: ${props => props.theme.colors.error};
  }
  
  p {
    margin-bottom: 1rem;
    color: ${props => props.theme.colors.text.muted};
  }
  
  button {
    background: ${props => props.theme.colors.primary};
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: ${props => props.theme.borderRadius.sm};
    cursor: pointer;
    
    &:hover {
      background: ${props => props.theme.colors.primaryHover};
    }
  }
`;

// Component
export const ViewerDashboard: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'documents' | 'extractions'>('documents');
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<DocumentListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Global error handling
  const errorState = useErrorState();
  const { setError, clearError } = useErrorActions();

  // Load viewer dashboard data
  const loadViewerData = async () => {
    setLoading(true);
    clearError(); // Clear any existing errors
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const documentService = serviceFactory.get<DocumentService>('documents');
      const categoryService = serviceFactory.get<CategoryService>('categories');

      const [statsData, categoriesData, documentsData] = await Promise.all([
        // Get accurate processing stats from dedicated endpoint
        documentService.getProcessingStats().catch((error) => {
          console.error('Failed to load processing stats:', error);
          return null;
        }),
        categoryService.getCategories().catch((error) => {
          console.error('Failed to load categories:', error);
          return { categories: [], total: 0 };
        }),
        documentService.getDocuments({ page: 1, per_page: 5, sort_by: 'created_at', sort_order: 'desc' }).catch((error) => {
          console.error('Failed to load documents:', error);
          return null;
        })
      ]);

      setStats(statsData);
      setCategories(categoriesData.categories);
      setRecentDocuments(documentsData);
    } catch (error) {
      console.error('Failed to load viewer dashboard data:', error);
      
      // Handle authentication errors through global error system
      if (error && (error as any).name === 'AuthenticationError') {
        setError('auth_failed', 'Authentication failed. Please log in again.');
      } else {
        setError('dashboard_load_failed', 'Failed to load dashboard data. Please refresh the page.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadViewerData();
  }, []);

  if (loading) {
    return (
      <ViewerContainer>
        <LoadingState>
          <div>⏳ Loading dashboard...</div>
        </LoadingState>
      </ViewerContainer>
    );
  }

  if (errorState.hasError) {
    return (
      <ViewerContainer>
        <ErrorState>
          <h3>Error Loading Dashboard</h3>
          <p>{errorState.errorMessage || 'An error occurred'}</p>
          <button onClick={() => loadViewerData()}>Retry</button>
        </ErrorState>
      </ViewerContainer>
    );
  }

  return (
    <ViewerContainer>
      <ViewerHeader>
        <Title>
          <Eye size={32} />
          Document Extraction Platform
          <ViewerBadge>
            <Eye size={14} />
            Viewer
          </ViewerBadge>
        </Title>
        <Subtitle>
          View and analyze document extraction results (Read-only access)
        </Subtitle>
      </ViewerHeader>

      <ReadOnlyNotice>
        <Lock size={20} />
        <div>
          <strong>Read-Only Access:</strong> You can view documents and extraction results, but cannot upload, edit, or delete content.
        </div>
      </ReadOnlyNotice>

      {/* Viewer Statistics */}
      <StatsGrid>
        <StatCard accent="#3b82f6">
          <StatValue>{stats?.total_documents || 0}</StatValue>
          <StatLabel>Total Documents</StatLabel>
          <StatDescription>Documents in the system</StatDescription>
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
          <StatDescription>Available document categories</StatDescription>
        </StatCard>

        <StatCard accent="#06b6d4">
          <StatValue>{stats?.completion_rate || 0}%</StatValue>
          <StatLabel>Success Rate</StatLabel>
          <StatDescription>Overall processing success rate</StatDescription>
        </StatCard>
      </StatsGrid>

      {/* Quick Actions (Read-only) */}
      <QuickActions>
        <QuickActionCard onClick={() => setActiveTab('documents')}>
          <QuickActionHeader>
            <FileText size={20} />
            <QuickActionTitle>View Documents</QuickActionTitle>
          </QuickActionHeader>
          <QuickActionDescription>
            Browse and view documents and their extraction results.
          </QuickActionDescription>
          <ReadOnlyOverlay>
            <ReadOnlyText>
              <Eye size={14} />
              View Only
            </ReadOnlyText>
          </ReadOnlyOverlay>
        </QuickActionCard>

        <QuickActionCard onClick={() => setActiveTab('extractions')}>
          <QuickActionHeader>
            <BarChart3 size={20} />
            <QuickActionTitle>View Extractions</QuickActionTitle>
          </QuickActionHeader>
          <QuickActionDescription>
            Review extraction results and structured data from documents.
          </QuickActionDescription>
          <ReadOnlyOverlay>
            <ReadOnlyText>
              <Eye size={14} />
              View Only
            </ReadOnlyText>
          </ReadOnlyOverlay>
        </QuickActionCard>

        <QuickActionCard onClick={() => window.location.href = '/templates'}>
          <QuickActionHeader>
            <BarChart3 size={20} />
            <QuickActionTitle>View Templates</QuickActionTitle>
          </QuickActionHeader>
          <QuickActionDescription>
            View available extraction templates for different document types.
          </QuickActionDescription>
          <ReadOnlyOverlay>
            <ReadOnlyText>
              <Eye size={14} />
              View Only
            </ReadOnlyText>
          </ReadOnlyOverlay>
        </QuickActionCard>

        <QuickActionCard onClick={() => window.location.href = '/extractions'}>
          <QuickActionHeader>
            <CheckCircle size={20} />
            <QuickActionTitle>View Analytics</QuickActionTitle>
          </QuickActionHeader>
          <QuickActionDescription>
            View analytics and reports on document processing and extraction results.
          </QuickActionDescription>
          <ReadOnlyOverlay>
            <ReadOnlyText>
              <Eye size={14} />
              View Only
            </ReadOnlyText>
          </ReadOnlyOverlay>
        </QuickActionCard>
      </QuickActions>

      {/* Main Content Tabs */}
      <TabContainer>
        <TabHeader>
          <Tab active={activeTab === 'documents'} onClick={() => setActiveTab('documents')}>
            📁 View Documents ({stats?.total_documents || 0})
          </Tab>
          <Tab active={activeTab === 'extractions'} onClick={() => setActiveTab('extractions')}>
            📊 View Extractions
          </Tab>
        </TabHeader>

        <TabContent>
          {activeTab === 'documents' ? (
            <DocumentList
              categories={categories}
              refreshTrigger={refreshTrigger}
              onDocumentClick={(document) => {
                console.log('Document clicked:', document);
                // TODO: Navigate to document detail view
              }}
              onDocumentDelete={() => {
                // Viewers cannot delete documents
                console.log('Delete action blocked for viewers');
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              <BarChart3 size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h3>Extraction Results</h3>
              <p>View detailed extraction results and analytics here.</p>
              <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
                <strong>Note:</strong> This is a read-only view. You cannot modify extraction results.
              </p>
            </div>
          )}
        </TabContent>
      </TabContainer>
    </ViewerContainer>
  );
};

export default ViewerDashboard;
