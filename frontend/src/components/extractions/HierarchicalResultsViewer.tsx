/**
 * Hierarchical Results Viewer
 * Displays extraction results in a tree structure with confidence indicators
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Hash, 
  Calendar, 
  List, 
  Database,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  EyeOff,
  MapPin
} from 'lucide-react';

import { useSourceLocation, createSourceLocation } from './SourceLocationContext';

// Types
export interface HierarchicalField {
  name: string;
  type: 'text' | 'number' | 'date' | 'array' | 'object' | 'boolean';
  value: any;
  confidence?: number;
  sourceLocation?: {
    page: number;
    coordinates: { x: number; y: number; width: number; height: number };
    text: string;
  };
  children?: HierarchicalField[];
  isRequired?: boolean;
  isVerified?: boolean;
  isExpanded?: boolean;
}

interface HierarchicalResultsViewerProps {
  results: Record<string, any>;
  confidenceScores?: Record<string, number>;
  onFieldClick?: (field: HierarchicalField) => void;
  showConfidenceScores?: boolean;
  showSourceLocations?: boolean;
  className?: string;
}

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const FieldContainer = styled.div<{ $depth: number }>`
  margin-left: ${props => props.$depth * 1.5}rem;
  border-left: ${props => props.$depth > 0 ? '1px solid #e5e7eb' : 'none'};
  padding-left: ${props => props.$depth > 0 ? '0.75rem' : '0'};
`;

const FieldRow = styled.div<{ $hasChildren: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  cursor: ${props => props.$hasChildren ? 'pointer' : 'default'};
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f9fafb;
  }
`;

const ExpandButton = styled.button<{ $expanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border: none;
  background: none;
  cursor: pointer;
  color: #6b7280;
  transition: transform 0.2s;
  transform: ${props => props.$expanded ? 'rotate(0deg)' : 'rotate(-90deg)'};
  
  &:hover {
    color: #374151;
  }
`;

const FieldIcon = styled.div<{ $type: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  color: ${props => {
    switch (props.$type) {
      case 'text': return '#3b82f6';
      case 'number': return '#10b981';
      case 'date': return '#f59e0b';
      case 'array': return '#8b5cf6';
      case 'object': return '#ef4444';
      case 'boolean': return '#06b6d4';
      default: return '#6b7280';
    }
  }};
`;

const FieldName = styled.div<{ $required?: boolean }>`
  font-weight: 600;
  color: #1f2937;
  font-size: 0.875rem;
  
  ${props => props.$required && `
    &::after {
      content: ' *';
      color: #ef4444;
    }
  `}
`;

const FieldValue = styled.div<{ $type: string }>`
  color: #374151;
  font-size: 0.875rem;
  font-family: ${props => props.$type === 'number' ? 'ui-monospace, SFMono-Regular, monospace' : 'inherit'};
  flex: 1;
  word-break: break-word;
`;

const ConfidenceIndicator = styled.div<{ $confidence: number }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: ${props => {
    if (props.$confidence >= 0.9) return '#dcfce7';
    if (props.$confidence >= 0.7) return '#fef3c7';
    return '#fee2e2';
  }};
  color: ${props => {
    if (props.$confidence >= 0.9) return '#166534';
    if (props.$confidence >= 0.7) return '#92400e';
    return '#991b1b';
  }};
`;

const ConfidenceIcon = styled.div<{ $confidence: number }>`
  color: ${props => {
    if (props.$confidence >= 0.9) return '#16a34a';
    if (props.$confidence >= 0.7) return '#d97706';
    return '#dc2626';
  }};
`;

const SourceLocation = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background-color: #f3f4f6;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #e5e7eb;
  }
`;

const ArrayItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  margin: 0.25rem 0;
  font-size: 0.875rem;
`;

const ArrayIndex = styled.span`
  color: #64748b;
  font-weight: 500;
  min-width: 2rem;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #6b7280;
  text-align: center;
`;

// Helper functions
const getFieldIcon = (type: string) => {
  switch (type) {
    case 'text': return <FileText size={16} />;
    case 'number': return <Hash size={16} />;
    case 'date': return <Calendar size={16} />;
    case 'array': return <List size={16} />;
    case 'object': return <Database size={16} />;
    case 'boolean': return <CheckCircle size={16} />;
    default: return <FileText size={16} />;
  }
};

const getConfidenceIcon = (confidence: number) => {
  if (confidence >= 0.9) return <CheckCircle size={12} />;
  if (confidence >= 0.7) return <AlertCircle size={12} />;
  return <XCircle size={12} />;
};

const formatValue = (value: any, type: string): string => {
  if (value === null || value === undefined) return 'null';
  
  switch (type) {
    case 'date':
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return String(value);
      }
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'array':
      return `Array (${Array.isArray(value) ? value.length : 0} items)`;
    case 'object':
      return `Object (${Object.keys(value || {}).length} properties)`;
    default:
      return String(value);
  }
};

const parseToHierarchical = (
  data: any, 
  confidenceScores: Record<string, number> = {},
  path: string = ''
): HierarchicalField[] => {
  if (data === null || data === undefined) {
    return [];
  }

  if (Array.isArray(data)) {
    return data.map((item, index) => ({
      name: `[${index}]`,
      type: 'array',
      value: item,
      confidence: confidenceScores[`${path}[${index}]`],
      children: parseToHierarchical(item, confidenceScores, `${path}[${index}]`)
    }));
  }

  if (typeof data === 'object') {
    return Object.entries(data).map(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      const fieldType = Array.isArray(value) ? 'array' : 
                       typeof value === 'object' && value !== null ? 'object' :
                       typeof value === 'number' ? 'number' :
                       typeof value === 'boolean' ? 'boolean' :
                       typeof value === 'string' && !isNaN(Date.parse(value)) ? 'date' : 'text';

      return {
        name: key,
        type: fieldType,
        value: value,
        confidence: confidenceScores[currentPath],
        children: fieldType === 'object' || fieldType === 'array' ? 
          parseToHierarchical(value, confidenceScores, currentPath) : undefined
      };
    });
  }

  return [];
};

// Main Component
export const HierarchicalResultsViewer: React.FC<HierarchicalResultsViewerProps> = ({
  results,
  confidenceScores = {},
  onFieldClick,
  showConfidenceScores = true,
  showSourceLocations = false,
  className
}) => {
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  
  // Safely use the source location context - it's optional
  let setSourceLocation: ((location: any) => void) | null = null;
  try {
    const context = useSourceLocation();
    setSourceLocation = context.setSourceLocation;
  } catch (error) {
    // Context not available - source location functionality will be disabled
    console.warn('SourceLocationContext not available - source location features disabled');
  }

  const toggleExpanded = (fieldPath: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(fieldPath)) {
      newExpanded.delete(fieldPath);
    } else {
      newExpanded.add(fieldPath);
    }
    setExpandedFields(newExpanded);
  };

  const renderField = (field: HierarchicalField, depth: number = 0, path: string = ''): React.ReactNode => {
    const currentPath = path ? `${path}.${field.name}` : field.name;
    const hasChildren = field.children && field.children.length > 0;
    const isExpanded = expandedFields.has(currentPath);

  const handleFieldClick = () => {
    if (hasChildren) {
      toggleExpanded(currentPath);
    }
    if (onFieldClick) {
      onFieldClick(field);
    }
  };

  const handleSourceLocationClick = (field: HierarchicalField) => {
    if (!setSourceLocation) {
      console.warn('Source location functionality not available');
      return;
    }
    
    // Create a mock source location for demonstration
    // In a real implementation, this would come from the extraction data
    const mockSourceLocation = createSourceLocation(
      field.name,
      field.type,
      { x: 100, y: 100, width: 200, height: 30 }, // Mock coordinates
      String(field.value),
      1, // Mock page
      field.confidence
    );
    
    setSourceLocation(mockSourceLocation);
  };

    return (
      <FieldContainer key={currentPath} $depth={depth}>
        <FieldRow $hasChildren={hasChildren} onClick={handleFieldClick}>
          {hasChildren && (
            <ExpandButton $expanded={isExpanded}>
              <ChevronRight size={16} />
            </ExpandButton>
          )}
          
          <FieldIcon $type={field.type}>
            {getFieldIcon(field.type)}
          </FieldIcon>
          
          <FieldName $required={field.isRequired}>
            {field.name}
          </FieldName>
          
          <FieldValue $type={field.type}>
            {formatValue(field.value, field.type)}
          </FieldValue>
          
          {showConfidenceScores && field.confidence !== undefined && (
            <ConfidenceIndicator $confidence={field.confidence}>
              <ConfidenceIcon $confidence={field.confidence}>
                {getConfidenceIcon(field.confidence)}
              </ConfidenceIcon>
              {Math.round(field.confidence * 100)}%
            </ConfidenceIndicator>
          )}
          
          {showSourceLocations && setSourceLocation && (
            <SourceLocation onClick={(e) => {
              e.stopPropagation();
              handleSourceLocationClick(field);
            }}>
              <MapPin size={12} />
              Show Source
            </SourceLocation>
          )}
        </FieldRow>
        
        {hasChildren && isExpanded && (
          <div>
            {field.children!.map((child, index) => 
              renderField(child, depth + 1, currentPath)
            )}
          </div>
        )}
      </FieldContainer>
    );
  };

  if (!results || Object.keys(results).length === 0) {
    return (
      <EmptyState>
        <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <h3 style={{ margin: '0 0 0.5rem 0' }}>No Results</h3>
        <p style={{ margin: 0 }}>No extraction results to display</p>
      </EmptyState>
    );
  }

  const hierarchicalFields = parseToHierarchical(results, confidenceScores);

  return (
    <Container className={className}>
      {hierarchicalFields.map((field, index) => 
        renderField(field, 0, '')
      )}
    </Container>
  );
};

export default HierarchicalResultsViewer;
