/**
 * Flagged Field Indicator Component
 * Shows a summary of flagged fields and allows quick navigation
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { AlertTriangle, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { ConfidenceField } from '../../utils/confidenceDetection';
import LowConfidenceFlag from './LowConfidenceFlag';

interface FlaggedFieldIndicatorProps {
  flaggedFields: ConfidenceField[];
  onFieldClick?: (field: ConfidenceField) => void;
  onToggleVisibility?: (fieldPath: string) => void;
  visibleFields?: Set<string>;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  className?: string;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Header = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #fee2e2;
    border-color: #f87171;
  }
`;

const HeaderIcon = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dc2626;
  transition: transform 0.2s ease;
  transform: ${props => props.$isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'};
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
`;

const HeaderTitle = styled.div`
  font-weight: 600;
  color: #991b1b;
  font-size: 0.875rem;
`;

const HeaderCount = styled.div`
  background-color: #dc2626;
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 1.5rem;
  text-align: center;
`;

const HeaderSubtext = styled.div`
  color: #991b1b;
  font-size: 0.75rem;
  opacity: 0.8;
`;

const FieldsList = styled.div<{ $isExpanded: boolean }>`
  display: ${props => props.$isExpanded ? 'flex' : 'none'};
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background-color: #fefefe;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  max-height: 300px;
  overflow-y: auto;
`;

const FieldItem = styled.div<{ $isVisible: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: ${props => props.$isVisible ? '#fef2f2' : '#f9fafb'};
  border: 1px solid ${props => props.$isVisible ? '#fecaca' : '#e5e7eb'};
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: ${props => props.$isVisible ? 1 : 0.6};
  
  &:hover {
    background-color: ${props => props.$isVisible ? '#fee2e2' : '#f3f4f6'};
    border-color: ${props => props.$isVisible ? '#f87171' : '#d1d5db'};
  }
`;

const FieldPath = styled.div`
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.75rem;
  color: #374151;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FieldValue = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FieldActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const VisibilityButton = styled.button<{ $isVisible: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: ${props => props.$isVisible ? '#dc2626' : '#6b7280'};
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.$isVisible ? '#fee2e2' : '#f3f4f6'};
    color: ${props => props.$isVisible ? '#991b1b' : '#374151'};
  }
  
  svg {
    width: 12px;
    height: 12px;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  color: #6b7280;
  text-align: center;
  font-size: 0.875rem;
`;

export const FlaggedFieldIndicator: React.FC<FlaggedFieldIndicatorProps> = ({
  flaggedFields,
  onFieldClick,
  onToggleVisibility,
  visibleFields = new Set(),
  isExpanded = false,
  onToggleExpanded,
  className
}) => {
  const [internalExpanded, setInternalExpanded] = useState(isExpanded);
  
  const expanded = onToggleExpanded ? isExpanded : internalExpanded;
  const handleToggleExpanded = onToggleExpanded || (() => setInternalExpanded(!internalExpanded));

  const handleFieldClick = (field: ConfidenceField) => {
    onFieldClick?.(field);
  };

  const handleToggleFieldVisibility = (fieldPath: string) => {
    onToggleVisibility?.(fieldPath);
  };

  if (flaggedFields.length === 0) {
    return (
      <Container className={className}>
        <Header $isExpanded={false} onClick={handleToggleExpanded}>
          <HeaderIcon $isExpanded={false}>
            <AlertTriangle />
          </HeaderIcon>
          <HeaderContent>
            <HeaderTitle>Low Confidence Fields</HeaderTitle>
            <HeaderCount>0</HeaderCount>
            <HeaderSubtext>No fields flagged</HeaderSubtext>
          </HeaderContent>
        </Header>
      </Container>
    );
  }

  return (
    <Container className={className}>
      <Header $isExpanded={expanded} onClick={handleToggleExpanded}>
        <HeaderIcon $isExpanded={expanded}>
          <ChevronDown />
        </HeaderIcon>
        <HeaderContent>
          <HeaderTitle>Low Confidence Fields</HeaderTitle>
          <HeaderCount>{flaggedFields.length}</HeaderCount>
          <HeaderSubtext>
            {flaggedFields.length === 1 ? 'field needs review' : 'fields need review'}
          </HeaderSubtext>
        </HeaderContent>
      </Header>
      
      <FieldsList $isExpanded={expanded}>
        {flaggedFields.map((field) => {
          const isVisible = visibleFields.has(field.path);
          
          return (
            <FieldItem
              key={field.path}
              $isVisible={isVisible}
              onClick={() => handleFieldClick(field)}
            >
              <LowConfidenceFlag
                confidence={field.confidence}
                threshold={field.threshold}
                size="small"
                isVisible={isVisible}
                onToggleVisibility={() => handleToggleFieldVisibility(field.path)}
              />
              
              <FieldPath title={field.path}>
                {field.path}
              </FieldPath>
              
              <FieldValue title={String(field.value)}>
                {String(field.value).substring(0, 50)}
                {String(field.value).length > 50 ? '...' : ''}
              </FieldValue>
              
              <FieldActions>
                <VisibilityButton
                  $isVisible={isVisible}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFieldVisibility(field.path);
                  }}
                  title={isVisible ? 'Hide field' : 'Show field'}
                >
                  {isVisible ? <EyeOff /> : <Eye />}
                </VisibilityButton>
              </FieldActions>
            </FieldItem>
          );
        })}
      </FieldsList>
    </Container>
  );
};

export default FlaggedFieldIndicator;
