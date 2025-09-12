import React from 'react';
import styled from 'styled-components';

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: ${props => props.theme.colors.background};
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid ${props => props.theme.colors.border};
  border-top: 4px solid ${props => props.theme.colors.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  margin-top: 1rem;
  color: ${props => props.theme.colors.text.secondary};
  font-size: ${props => props.theme.typography.sizes.base};
`;

interface LoadingWrapperProps {
  children: React.ReactNode;
  isLoading: boolean;
  loadingText?: string;
}

export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({ 
  children, 
  isLoading, 
  loadingText = "Loading..." 
}) => {
  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
        <LoadingText>{loadingText}</LoadingText>
      </LoadingContainer>
    );
  }

  return <>{children}</>;
};

export default LoadingWrapper;
