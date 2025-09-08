/**
 * Cards Viewer
 * Displays extraction results in a card-based layout
 */
import React from 'react';
import styled from 'styled-components';
import { 
  FileText, 
  Hash, 
  Calendar, 
  List, 
  Database,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye
} from 'lucide-react';

import { HierarchicalField } from './HierarchicalResultsViewer';

interface CardsViewerProps {
  results: Record<string, any>;
  confidenceScores?: Record<string, number>;
  onFieldClick?: (field: HierarchicalField) => void;
  showConfidenceScores?: boolean;
  showSourceLocations?: boolean;
  className?: string;
}

// Styled Components
const Container = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  padding: 1rem;
`;

const Card = styled.div<{ $confidence?: number }>`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  cursor: pointer;
  
  &:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
  
  ${props => props.$confidence !== undefined && `
    border-left: 4px solid ${
      props.$confidence >= 0.9 ? '#16a34a' :
      props.$confidence >= 0.7 ? '#d97706' : '#dc2626'
    };
  `}
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const FieldIcon = styled.div<{ $type: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background-color: ${props => {
    switch (props.$type) {
      case 'text': return '#dbeafe';
      case 'number': return '#dcfce7';
      case 'date': return '#fef3c7';
      case 'array': return '#e9d5ff';
      case 'object': return '#fee2e2';
      case 'boolean': return '#cffafe';
      default: return '#f3f4f6';
    }
  }};
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

const FieldInfo = styled.div`
  flex: 1;
`;

const FieldName = styled.div<{ $required?: boolean }>`
  font-weight: 600;
  color: #1f2937;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  
  ${props => props.$required && `
    &::after {
      content: ' *';
      color: #ef4444;
    }
  `}
`;

const FieldType = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const CardBody = styled.div`
  margin-bottom: 0.75rem;
`;

const FieldValue = styled.div<{ $type: string }>`
  color: #374151;
  font-size: 0.875rem;
  font-family: ${props => props.$type === 'number' ? 'ui-monospace, SFMono-Regular, monospace' : 'inherit'};
  word-break: break-word;
  line-height: 1.5;
`;

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
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
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #6b7280;
  text-align: center;
  grid-column: 1 / -1;
`;

// Helper functions
const getFieldIcon = (type: string) => {
  switch (type) {
    case 'text': return <FileText size={20} />;
    case 'number': return <Hash size={20} />;
    case 'date': return <Calendar size={20} />;
    case 'array': return <List size={20} />;
    case 'object': return <Database size={20} />;
    case 'boolean': return <CheckCircle size={20} />;
    default: return <FileText size={20} />;
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

const parseToCards = (
  data: any, 
  confidenceScores: Record<string, number> = {},
  path: string = ''
): Array<{
  name: string;
  type: string;
  value: any;
  confidence?: number;
  path: string;
  isRequired?: boolean;
  sourceLocation?: any;
}> => {
  const cards: Array<{
    name: string;
    type: string;
    value: any;
    confidence?: number;
    path: string;
    isRequired?: boolean;
    sourceLocation?: any;
  }> = [];

  if (data === null || data === undefined) {
    return cards;
  }

  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      const currentPath = path ? `${path}[${index}]` : `[${index}]`;
      cards.push({
        name: `[${index}]`,
        type: 'array',
        value: item,
        confidence: confidenceScores[currentPath],
        path: currentPath
      });
    });
  } else if (typeof data === 'object') {
    Object.entries(data).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      const fieldType = Array.isArray(value) ? 'array' : 
                       typeof value === 'object' && value !== null ? 'object' :
                       typeof value === 'number' ? 'number' :
                       typeof value === 'boolean' ? 'boolean' :
                       typeof value === 'string' && !isNaN(Date.parse(value)) ? 'date' : 'text';

      cards.push({
        name: key,
        type: fieldType,
        value: value,
        confidence: confidenceScores[currentPath],
        path: currentPath
      });
    });
  }

  return cards;
};

export const CardsViewer: React.FC<CardsViewerProps> = ({
  results,
  confidenceScores = {},
  onFieldClick,
  showConfidenceScores = true,
  showSourceLocations = false,
  className
}) => {
  if (!results || Object.keys(results).length === 0) {
    return (
      <EmptyState>
        <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <h3 style={{ margin: '0 0 0.5rem 0' }}>No Results</h3>
        <p style={{ margin: 0 }}>No extraction results to display</p>
      </EmptyState>
    );
  }

  const cardData = parseToCards(results, confidenceScores);

  return (
    <Container className={className}>
      {cardData.map((field, index) => (
        <Card 
          key={`${field.path}-${index}`}
          $confidence={field.confidence}
          onClick={() => onFieldClick && onFieldClick(field as HierarchicalField)}
        >
          <CardHeader>
            <FieldIcon $type={field.type}>
              {getFieldIcon(field.type)}
            </FieldIcon>
            <FieldInfo>
              <FieldName $required={field.isRequired}>
                {field.name}
              </FieldName>
              <FieldType>
                {field.type}
              </FieldType>
            </FieldInfo>
          </CardHeader>
          
          <CardBody>
            <FieldValue $type={field.type}>
              {formatValue(field.value, field.type)}
            </FieldValue>
          </CardBody>
          
          <CardFooter>
            {showConfidenceScores && field.confidence !== undefined && (
              <ConfidenceIndicator $confidence={field.confidence}>
                <ConfidenceIcon $confidence={field.confidence}>
                  {getConfidenceIcon(field.confidence)}
                </ConfidenceIcon>
                {Math.round(field.confidence * 100)}%
              </ConfidenceIndicator>
            )}
            
            {showSourceLocations && field.sourceLocation && (
              <SourceLocation>
                <Eye size={12} />
                Page {field.sourceLocation.page}
              </SourceLocation>
            )}
          </CardFooter>
        </Card>
      ))}
    </Container>
  );
};

export default CardsViewer;
