import styled from 'styled-components';
import { ReactNode, useState, useEffect } from 'react';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './navigation/Sidebar';
import { PageHeader } from './navigation/PageHeader';
import LoadingWrapper from './common/LoadingWrapper';

const LayoutContainer = styled.div`
  min-height: 100vh;
  background-color: ${props => props.theme.colors.background};
`;

// Footer components removed as per user request

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const { user, tenant } = useAuth();

  useEffect(() => {
    // Small delay to ensure all contexts are properly initialized
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SidebarProvider>
      <LoadingWrapper isLoading={!isInitialized} loadingText="Initializing application...">
        <LayoutContainer>
          <PageHeader />
          <Sidebar showHeader={false}>
            {children}
          </Sidebar>
        </LayoutContainer>
      </LoadingWrapper>
    </SidebarProvider>
  );
};

export default Layout;

