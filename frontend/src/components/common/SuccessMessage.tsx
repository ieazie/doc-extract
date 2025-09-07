/**
 * Success message component
 */
import React from 'react';
import styled from 'styled-components';
import { CheckCircle } from 'lucide-react';

const SuccessContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #d1fae5;
  border: 1px solid #a7f3d0;
  border-radius: 0.375rem;
  color: #065f46;
`;

const SuccessIcon = styled.div`
  flex-shrink: 0;
`;

const SuccessText = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
`;

interface SuccessMessageProps {
  message: string;
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({ message }) => {
  return (
    <SuccessContainer>
      <SuccessIcon>
        <CheckCircle size={20} />
      </SuccessIcon>
      <SuccessText>{message}</SuccessText>
    </SuccessContainer>
  );
};

export default SuccessMessage;

