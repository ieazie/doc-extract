/**
 * Table Viewer
 * Displays extraction results in a tabular format
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
  XCircle
} from 'lucide-react';

import { HierarchicalField } from './HierarchicalResultsViewer';

interface TableViewerProps {
  results: Record<string, any>;
  confidenceScores?: Record<string, number>;
  onFieldClick?: (field: HierarchicalField) => void;
  showConfidenceScores?: boolean;
  className?: string;
}

// Styled Components
const Container = styled.div`
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`;

const TableHeader = styled.thead`
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
`;

const TableHeaderCell = styled.th`
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-right: 1px solid #e5e7eb;
  
  &:last-child {
    border-right: none;
  }
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  border-bottom: 1px solid #f3f4f6;
  
  &:hover {
    background: #f9fafb;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.td`
  padding: 0.75rem 1rem;
  border-right: 1px solid #f3f4f6;
  vertical-align: top;
  
  &:last-child {
    border-right: none;
  }
`;

const FieldNameCell = styled(TableCell)`
  font-weight: 600;
  color: #1f2937;
  min-width: 150px;
`;

const FieldTypeCell = styled(TableCell)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 100px;
`;

const FieldValueCell = styled(TableCell)`
  font-family: ui-monospace, SFMono-Regular, monospace;
  word-break: break-word;
  max-width: 300px;
`;

const ConfidenceCell = styled(TableCell)`
  min-width: 100px;
`;

const TypeIcon = styled.div<{ $type: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
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

const flattenResults = (data: any, confidenceScores: Record<string, number> = {}, path: string = ''): Array<{
  name: string;
  type: string;
  value: any;
  confidence?: number;
  path: string;
}> => {
  const flattened: Array<{
    name: string;
    type: string;
    value: any;
    confidence?: number;
    path: string;
  }> = [];

  if (data === null || data === undefined) {
    return flattened;
  }

  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      const currentPath = path ? `${path}[${index}]` : `[${index}]`;
      flattened.push({
        name: `[${index}]`,
        type: 'array',
        value: item,
        confidence: confidenceScores[currentPath],
        path: currentPath
      });
      
      // Recursively flatten array items
      if (typeof item === 'object' && item !== null) {
        flattened.push(...flattenResults(item, confidenceScores, currentPath));
      }
    });
  } else if (typeof data === 'object') {
    Object.entries(data).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      const fieldType = Array.isArray(value) ? 'array' : 
                       typeof value === 'object' && value !== null ? 'object' :
                       typeof value === 'number' ? 'number' :
                       typeof value === 'boolean' ? 'boolean' :
                       typeof value === 'string' && !isNaN(Date.parse(value)) ? 'date' : 'text';

      flattened.push({
        name: key,
        type: fieldType,
        value: value,
        confidence: confidenceScores[currentPath],
        path: currentPath
      });
      
      // Recursively flatten nested objects
      if (fieldType === 'object' || fieldType === 'array') {
        flattened.push(...flattenResults(value, confidenceScores, currentPath));
      }
    });
  }

  return flattened;
};

export const TableViewer: React.FC<TableViewerProps> = ({
  results,
  confidenceScores = {},
  onFieldClick,
  showConfidenceScores = true,
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

  const flattenedData = flattenResults(results, confidenceScores);

  return (
    <Container className={className}>
      <Table>
        <TableHeader>
          <tr>
            <TableHeaderCell>Field Name</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Value</TableHeaderCell>
            {showConfidenceScores && <TableHeaderCell>Confidence</TableHeaderCell>}
          </tr>
        </TableHeader>
        <TableBody>
          {flattenedData.map((field, index) => (
            <TableRow key={`${field.path}-${index}`}>
              <FieldNameCell>
                {field.name}
              </FieldNameCell>
              <FieldTypeCell>
                <TypeIcon $type={field.type}>
                  {getFieldIcon(field.type)}
                </TypeIcon>
                <span style={{ textTransform: 'capitalize' }}>{field.type}</span>
              </FieldTypeCell>
              <FieldValueCell>
                {formatValue(field.value, field.type)}
              </FieldValueCell>
              {showConfidenceScores && (
                <ConfidenceCell>
                  {field.confidence !== undefined ? (
                    <ConfidenceIndicator $confidence={field.confidence}>
                      <ConfidenceIcon $confidence={field.confidence}>
                        {getConfidenceIcon(field.confidence)}
                      </ConfidenceIcon>
                      {Math.round(field.confidence * 100)}%
                    </ConfidenceIndicator>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>N/A</span>
                  )}
                </ConfidenceCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
};

export default TableViewer;
