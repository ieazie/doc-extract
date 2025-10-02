import type { AppProps } from 'next/app';
import type { NextComponentType } from 'next';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useState } from 'react';

import { GlobalStyle } from '@/styles/GlobalStyle';
import { theme } from '@/styles/theme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { LoginForm } from '@/components/auth/LoginForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useErrorState } from '@/stores/globalStore';
import { useEffect } from 'react';

function MyApp({ Component, pageProps, router }: AppProps) {
  // Create a new QueryClient instance for each app instance
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <AuthProvider>
          <AppContent Component={Component} pageProps={pageProps} />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AppContent({ Component, pageProps }: { Component: NextComponentType<any, any, any>; pageProps: any }) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const errorState = useErrorState();

  // Global error handler for authentication failures
  useEffect(() => {
    if (errorState.hasError && errorState.errorType === 'auth_failed') {
      console.log('🔄 Global error handler: Authentication failed, triggering logout');
      logout();
    }
  }, [errorState.hasError, errorState.errorType, logout]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

export default MyApp;

