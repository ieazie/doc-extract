/**
 * Error message component
 */
import React from 'react';
import styled from 'styled-components';
import { AlertCircle } from 'lucide-react';

const ErrorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 0.375rem;
  color: #991b1b;
`;

const ErrorIcon = styled.div`
  flex-shrink: 0;
`;

const ErrorText = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
`;

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <ErrorContainer>
      <ErrorIcon>
        <AlertCircle size={20} />
      </ErrorIcon>
      <ErrorText>{message}</ErrorText>
    </ErrorContainer>
  );
};

export default ErrorMessage;

