/**
 * Low Confidence Flag Component
 * Visual indicator for low-confidence fields
 */
import React from 'react';
import styled from 'styled-components';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface LowConfidenceFlagProps {
  confidence: number;
  threshold: number;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  size?: 'small' | 'medium' | 'large';
  showThreshold?: boolean;
  className?: string;
}

const FlagContainer = styled.div<{ $size: 'small' | 'medium' | 'large' }>`
  display: inline-flex;
  align-items: center;
  gap: ${props => {
    switch (props.$size) {
      case 'small': return '0.25rem';
      case 'medium': return '0.375rem';
      case 'large': return '0.5rem';
      default: return '0.375rem';
    }
  }};
  padding: ${props => {
    switch (props.$size) {
      case 'small': return '0.125rem 0.375rem';
      case 'medium': return '0.25rem 0.5rem';
      case 'large': return '0.375rem 0.75rem';
      default: return '0.25rem 0.5rem';
    }
  }};
  border-radius: ${props => {
    switch (props.$size) {
      case 'small': return '0.25rem';
      case 'medium': return '0.375rem';
      case 'large': return '0.5rem';
      default: return '0.375rem';
    }
  }};
  font-size: ${props => {
    switch (props.$size) {
      case 'small': return '0.625rem';
      case 'medium': return '0.75rem';
      case 'large': return '0.875rem';
      default: return '0.75rem';
    }
  }};
  font-weight: 600;
  letter-spacing: 0.025em;
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    background-color: #fecaca;
    border-color: #f87171;
  }
`;

const IconWrapper = styled.div<{ $size: 'small' | 'medium' | 'large' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: ${props => {
      switch (props.$size) {
        case 'small': return '12px';
        case 'medium': return '14px';
        case 'large': return '16px';
        default: return '14px';
      }
    }};
    height: ${props => {
      switch (props.$size) {
        case 'small': return '12px';
        case 'medium': return '14px';
        case 'large': return '16px';
        default: return '14px';
      }
    }};
  }
`;

const ConfidenceText = styled.span`
  white-space: nowrap;
`;

const ThresholdText = styled.span`
  opacity: 0.7;
  font-weight: 500;
`;

const VisibilityToggle = styled.button<{ $size: 'small' | 'medium' | 'large' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  padding: 0;
  margin-left: 0.25rem;
  
  svg {
    width: ${props => {
      switch (props.$size) {
        case 'small': return '10px';
        case 'medium': return '12px';
        case 'large': return '14px';
        default: return '12px';
      }
    }};
    height: ${props => {
      switch (props.$size) {
        case 'small': return '10px';
        case 'medium': return '12px';
        case 'large': return '14px';
        default: return '12px';
      }
    }};
  }
  
  &:hover {
    opacity: 0.8;
  }
`;

export const LowConfidenceFlag: React.FC<LowConfidenceFlagProps> = ({
  confidence,
  threshold,
  isVisible = true,
  onToggleVisibility,
  size = 'medium',
  showThreshold = false,
  className
}) => {
  const confidencePercent = Math.round(confidence * 100);
  const thresholdPercent = Math.round(threshold * 100);

  return (
    <FlagContainer 
      $size={size} 
      className={className}
      onClick={onToggleVisibility}
      title={`Low confidence: ${confidencePercent}% (threshold: ${thresholdPercent}%)`}
    >
      <IconWrapper $size={size}>
        <AlertTriangle />
      </IconWrapper>
      
      <ConfidenceText>
        {confidencePercent}%
        {showThreshold && (
          <ThresholdText> / {thresholdPercent}%</ThresholdText>
        )}
      </ConfidenceText>
      
      {onToggleVisibility && (
        <VisibilityToggle $size={size} onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility();
        }}>
          {isVisible ? <EyeOff /> : <Eye />}
        </VisibilityToggle>
      )}
    </FlagContainer>
  );
};

export default LowConfidenceFlag;
