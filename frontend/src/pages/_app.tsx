import type { AppProps } from "next/app";
import type { NextComponentType } from "next";
import React, { useState, useEffect } from "react";
import styled, { ThemeProvider } from "styled-components";
import { QueryClient, QueryClientProvider } from "react-query";
import { ErrorBoundary } from "react-error-boundary";

import { GlobalStyle } from "@/styles/GlobalStyle";
import { theme } from "@/styles/theme";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useErrorState } from "@/stores/globalStore";
import ErrorFallback from "@/components/ErrorFallback";

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
`;

function MyApp({ Component, pageProps, router }: AppProps) {
  // Create a new QueryClient instance for each app instance
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <AuthProvider>
          <AppContent
            Component={Component}
            pageProps={pageProps}
            currentPath={router.asPath}
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AppContent({
  Component,
  pageProps,
  currentPath,
}: {
  readonly Component: NextComponentType<any, any, any>;
  readonly pageProps: any;
  readonly currentPath: string;
}) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const errorState = useErrorState();

  // Global error handler for authentication failures
  useEffect(() => {
    if (errorState.hasError && errorState.errorType === "auth_failed") {
      if (process.env.NODE_ENV === "development") {
        console.log(
          "Global error handler: Authentication failed, triggering logout"
        );
      }
      logout();
    }
  }, [errorState.hasError, errorState.errorType, logout]);

  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingSpinner size={48} />
      </LoadingContainer>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const content = (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );

  if (process.env.NODE_ENV === "development") {
    return content;
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset any state when error boundary resets
        globalThis.location.reload();
      }}
      onError={(error, info) => {
        // TODO: integrate Sentry or similar here
        // eslint-disable-next-line no-console
        console.error("[App ErrorBoundary]", error, info);
      }}
      resetKeys={[currentPath]}
    >
      {content}
    </ErrorBoundary>
  );
}

export default MyApp;
