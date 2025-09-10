import type { AppProps } from 'next/app';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useState } from 'react';

import { GlobalStyle } from '@/styles/GlobalStyle';
import { theme } from '@/styles/theme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { LoginForm } from '@/components/auth/LoginForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

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
          <AppContent Component={Component} pageProps={pageProps} router={router} />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AppContent({ Component, pageProps, router }: AppProps) {
  const { isAuthenticated, isLoading } = useAuth();

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

