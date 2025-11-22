import React from "react";
import { Button } from "@/components/ui/Button";

interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  reset,
}) => {
  const isProd = process.env.NODE_ENV === "production";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        maxWidth: 640,
        margin: "64px auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ margin: 0 }}>Unexpected error</h1>
      <p style={{ margin: 0 }}>
        We hit a snag rendering this part of the interface. You can retry below.
      </p>
      {!isProd && (
        <details style={{ whiteSpace: "pre-wrap" }}>
          <summary>Stack trace</summary>
          {error.stack || String(error)}
        </details>
      )}
      <div style={{ display: "flex", gap: 12 }}>
        <Button onClick={reset}>Retry</Button>
      </div>
    </div>
  );
};

export default ErrorFallback;
