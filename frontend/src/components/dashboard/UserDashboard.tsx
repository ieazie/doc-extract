import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  FileText, 
  Upload, 
  BarChart3, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

import { DocumentService, CategoryService, serviceFactory, ProcessingStats, Category, DocumentListResponse } from '../../services/api/index';
import { useAuth } from '../../contexts/AuthContext';
import DocumentUpload from '../upload/DocumentUpload';
import DocumentList from '../documents/DocumentList';

// Styled Components
const UserContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
`;

const UserHeader = styled.div`
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

const UserBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  background: ${props => props.theme.colors.primary}20;
  color: ${props => props.theme.colors.primary};
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

const LoadingState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.colors.text.muted};
`;

// Component
export const UserDashboard: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'upload' | 'documents'>('upload');
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<DocumentListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Load user dashboard data
  const loadUserData = async () => {
    setLoading(true);
    
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
      console.error('Failed to load user dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  // Handle upload success
  const handleUploadSuccess = () => {
    loadUserData(); // Refresh all data
    setRefreshTrigger(prev => prev + 1); // Trigger document list refresh
    setActiveTab('documents'); // Switch to documents tab
  };

  if (loading) {
    return (
      <UserContainer>
        <LoadingState>
          <div>⏳ Loading dashboard...</div>
        </LoadingState>
      </UserContainer>
    );
  }

  return (
    <UserContainer>
      <UserHeader>
        <Title>
          <FileText size={32} />
          Document Extraction Platform
          <UserBadge>
            <FileText size={14} />
            User
          </UserBadge>
        </Title>
        <Subtitle>
          Upload, process, and extract structured data from your documents
        </Subtitle>
      </UserHeader>

      {/* User Statistics */}
      <StatsGrid>
        <StatCard accent="#3b82f6">
          <StatValue>{stats?.total_documents || 0}</StatValue>
          <StatLabel>My Documents</StatLabel>
          <StatDescription>Documents you&apos;ve uploaded</StatDescription>
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
          <StatDescription>Your processing success rate</StatDescription>
        </StatCard>
      </StatsGrid>

      {/* Quick Actions */}
      <QuickActions>
        <QuickActionCard onClick={() => setActiveTab('upload')}>
          <QuickActionHeader>
            <Upload size={20} />
            <QuickActionTitle>Upload Document</QuickActionTitle>
          </QuickActionHeader>
          <QuickActionDescription>
            Upload a new document to extract structured data using AI-powered processing.
          </QuickActionDescription>
        </QuickActionCard>

        <QuickActionCard onClick={() => setActiveTab('documents')}>
          <QuickActionHeader>
            <FileText size={20} />
            <QuickActionTitle>View Documents</QuickActionTitle>
          </QuickActionHeader>
          <QuickActionDescription>
            Browse and manage your uploaded documents and view extraction results.
          </QuickActionDescription>
        </QuickActionCard>

        <QuickActionCard onClick={() => window.location.href = '/templates'}>
          <QuickActionHeader>
            <BarChart3 size={20} />
            <QuickActionTitle>Manage Templates</QuickActionTitle>
          </QuickActionHeader>
          <QuickActionDescription>
            Create and manage extraction templates for different document types.
          </QuickActionDescription>
        </QuickActionCard>

        <QuickActionCard onClick={() => window.location.href = '/extractions'}>
          <QuickActionHeader>
            <CheckCircle size={20} />
            <QuickActionTitle>View Extractions</QuickActionTitle>
          </QuickActionHeader>
          <QuickActionDescription>
            Review and manage your document extraction results and data.
          </QuickActionDescription>
        </QuickActionCard>
      </QuickActions>

      {/* Main Content Tabs */}
      <TabContainer>
        <TabHeader>
          <Tab active={activeTab === 'upload'} onClick={() => setActiveTab('upload')}>
            📤 Upload Document
          </Tab>
          <Tab active={activeTab === 'documents'} onClick={() => setActiveTab('documents')}>
            📁 My Documents ({stats?.total_documents || 0})
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
                loadUserData(); // Refresh stats
              }}
            />
          )}
        </TabContent>
      </TabContainer>
    </UserContainer>
  );
};

export default UserDashboard;
