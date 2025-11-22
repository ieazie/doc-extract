import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: (_args: { error: Error; reset: () => void; info: React.ErrorInfo }) => React.ReactNode;
  onError?: (_error: Error, info: React.ErrorInfo) => void;
  rethrowInDev?: boolean;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public static readonly defaultProps = {
    rethrowInDev: false,
  };

  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Store errorInfo in state for fallback component
    this.setState({ errorInfo: info });

    // Report error to logging service if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, info);
      } catch (onErrorError) {
        // eslint-disable-next-line no-console
        console.error("[ErrorBoundary] Error in onError handler:", onErrorError);
      }
    }

    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary] Caught error:", error, info);
    }

    // Optionally rethrow in dev to trigger Next.js overlay
    if (process.env.NODE_ENV !== "production" && this.props.rethrowInDev) {
      throw error;
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      const info: React.ErrorInfo = errorInfo || { componentStack: "" };

      if (fallback) {
        return fallback({ error, reset: this.reset, info });
      }

      return (
        <div style={{ padding: 24 }}>
          <h2>Something went wrong.</h2>
          {process.env.NODE_ENV !== "production" && (
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {error.stack || String(error)}
            </pre>
          )}
          <button onClick={this.reset} style={{ marginTop: 12 }}>
            Try again
          </button>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
