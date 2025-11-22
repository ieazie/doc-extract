import type { AppProps } from "next/app";
import type { NextComponentType } from "next";
import React, { useState, useEffect } from "react";
import { ThemeProvider } from "styled-components";
import { QueryClient, QueryClientProvider } from "react-query";
import type { ErrorInfo } from "react";

import { GlobalStyle } from "@/styles/GlobalStyle";
import { theme } from "@/styles/theme";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useErrorState } from "@/stores/globalStore";
import ErrorBoundary from "@/components/ErrorBoundary";
import ErrorFallback from "@/components/ErrorFallback";

const renderErrorFallback = ({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
  info: React.ErrorInfo;
}) => <ErrorFallback error={error} reset={reset} />;

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
      console.log(
        "🔄 Global error handler: Authentication failed, triggering logout"
      );
      logout();
    }
  }, [errorState.hasError, errorState.errorType, logout]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <ErrorBoundary
      key={currentPath}
      onError={(error: Error, info: ErrorInfo) => {
        // Hook for observability; integrate Sentry or similar here
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.error("[App ErrorBoundary]", error, info);
        }
      }}
      fallback={renderErrorFallback}
    >
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ErrorBoundary>
  );
}

export default MyApp;
