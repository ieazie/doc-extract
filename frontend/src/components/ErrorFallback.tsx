import React from "react";
import styled from "styled-components";
import { Button } from "@/components/ui/Button";

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.lg};
  max-width: 640px;
  margin: ${(props) => props.theme.spacing["3xl"]} auto;
  padding: ${(props) => props.theme.spacing.lg};
`;

const ErrorTitle = styled.h1`
  margin: 0;
  font-size: ${(props) => props.theme.typography.sizes["2xl"]};
  font-weight: ${(props) => props.theme.typography.weights.bold};
  color: ${(props) => props.theme.colors.text.primary};
`;

const ErrorMessage = styled.p`
  margin: 0;
  font-size: ${(props) => props.theme.typography.sizes.base};
  color: ${(props) => props.theme.colors.text.secondary};
  line-height: ${(props) => props.theme.typography.lineHeights.relaxed};
`;

const ErrorDetails = styled.details`
  background-color: ${(props) => props.theme.colors.surfaceHover};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.borderRadius.md};
  padding: ${(props) => props.theme.spacing.md};
  white-space: pre-wrap;
  font-family: ${(props) => props.theme.typography.fonts.mono};
  font-size: ${(props) => props.theme.typography.sizes.sm};
  color: ${(props) => props.theme.colors.error};
  overflow-x: auto;

  summary {
    cursor: pointer;
    font-weight: ${(props) => props.theme.typography.weights.medium};
    color: ${(props) => props.theme.colors.text.primary};
    margin-bottom: ${(props) => props.theme.spacing.sm};

    &:hover {
      color: ${(props) => props.theme.colors.primary};
    }
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.md};
`;

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    // TODO: implement proper fallback UI
    <ErrorContainer>
      <ErrorTitle>Unexpected error</ErrorTitle>
      <ErrorMessage>
        We hit a snag rendering this part of the interface. You can retry below.
      </ErrorMessage>
      {isDevelopment && (
        <ErrorDetails>
          <summary>Stack trace</summary>
          {error.stack || String(error)}
        </ErrorDetails>
      )}
      <ButtonContainer>
        <Button onClick={resetErrorBoundary}>Retry</Button>
      </ButtonContainer>
    </ErrorContainer>
  );
};

export default ErrorFallback;
