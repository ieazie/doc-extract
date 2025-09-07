/**
 * Schema Modal Component
 * Displays template schema fields in different views (Simple, Detailed, JSON)
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { X, FileText, List, Code, Eye } from 'lucide-react';

// Types
interface SchemaField {
  type: string;
  required?: boolean;
  description?: string;
  validation?: any;
  items?: any;
  fields?: any;
}

interface SchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateName: string;
  schema: Record<string, SchemaField>;
}

// Styled Components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
`;

const HeaderTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #e5e7eb;
    color: #374151;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  background: ${props => props.$active ? 'white' : 'transparent'};
  color: ${props => props.$active ? '#1f2937' : '#6b7280'};
  font-size: 0.875rem;
  font-weight: ${props => props.$active ? '600' : '500'};
  cursor: pointer;
  border-bottom: 2px solid ${props => props.$active ? '#3b82f6' : 'transparent'};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    background: ${props => props.$active ? 'white' : '#f3f4f6'};
  }
`;

const TabContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
`;

const SimpleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const FieldItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
`;

const FieldName = styled.div`
  font-weight: 600;
  color: #1f2937;
`;

const FieldType = styled.span<{ type: string }>`
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${props => {
    const colors: Record<string, string> = {
      text: '#dbeafe',
      number: '#f3e8ff',
      date: '#dcfce7',
      array: '#fef3c7',
      object: '#fce7f3',
    };
    return colors[props.type] || '#f3f4f6';
  }};
  color: ${props => {
    const colors: Record<string, string> = {
      text: '#1e40af',
      number: '#7c3aed',
      date: '#166534',
      array: '#92400e',
      object: '#be185d',
    };
    return colors[props.type] || '#374151';
  }};
`;

const RequiredBadge = styled.span`
  padding: 0.125rem 0.375rem;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  margin-left: 0.5rem;
`;

const DetailedView = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const DetailedField = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
`;

const DetailedFieldHeader = styled.div`
  background: #f9fafb;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DetailedFieldName = styled.div`
  font-weight: 600;
  color: #1f2937;
  font-size: 1rem;
`;

const DetailedFieldType = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DetailedFieldBody = styled.div`
  padding: 1rem;
`;

const FieldProperty = styled.div`
  margin-bottom: 0.75rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const PropertyLabel = styled.div`
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
`;

const PropertyValue = styled.div`
  color: #6b7280;
  font-size: 0.875rem;
  font-family: monospace;
  background: #f9fafb;
  padding: 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid #e5e7eb;
`;

const JsonViewer = styled.pre`
  background: #1f2937;
  color: #f9fafb;
  padding: 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-x: auto;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #6b7280;
  text-align: center;
`;

const EmptyIcon = styled.div`
  margin-bottom: 1rem;
  color: #9ca3af;
`;

const EmptyTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
`;

const EmptyDescription = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
`;

const SchemaModal: React.FC<SchemaModalProps> = ({
  isOpen,
  onClose,
  templateName,
  schema
}) => {
  const [activeTab, setActiveTab] = useState<'simple' | 'detailed' | 'json'>('simple');

  if (!isOpen) return null;

  const schemaEntries = Object.entries(schema || {});
  const hasSchema = schemaEntries.length > 0;

  const renderSimpleList = () => (
    <SimpleList>
      {schemaEntries.map(([fieldName, fieldDef]) => (
        <FieldItem key={fieldName}>
          <FieldName>{fieldName}</FieldName>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FieldType type={fieldDef.type}>{fieldDef.type}</FieldType>
            {fieldDef.required && (
              <RequiredBadge>Required</RequiredBadge>
            )}
          </div>
        </FieldItem>
      ))}
    </SimpleList>
  );

  const renderDetailedView = () => (
    <DetailedView>
      {schemaEntries.map(([fieldName, fieldDef]) => (
        <DetailedField key={fieldName}>
          <DetailedFieldHeader>
            <DetailedFieldName>{fieldName}</DetailedFieldName>
            <DetailedFieldType>
              <FieldType type={fieldDef.type}>{fieldDef.type}</FieldType>
              {fieldDef.required && (
                <RequiredBadge>Required</RequiredBadge>
              )}
            </DetailedFieldType>
          </DetailedFieldHeader>
          <DetailedFieldBody>
            <FieldProperty>
              <PropertyLabel>Type</PropertyLabel>
              <PropertyValue>{fieldDef.type}</PropertyValue>
            </FieldProperty>
            
            <FieldProperty>
              <PropertyLabel>Required</PropertyLabel>
              <PropertyValue>{fieldDef.required ? 'Yes' : 'No'}</PropertyValue>
            </FieldProperty>
            
            {fieldDef.description && (
              <FieldProperty>
                <PropertyLabel>Description</PropertyLabel>
                <PropertyValue>{fieldDef.description}</PropertyValue>
              </FieldProperty>
            )}
            
            {fieldDef.validation && (
              <FieldProperty>
                <PropertyLabel>Validation Rules</PropertyLabel>
                <PropertyValue>{JSON.stringify(fieldDef.validation, null, 2)}</PropertyValue>
              </FieldProperty>
            )}
            
            {fieldDef.items && (
              <FieldProperty>
                <PropertyLabel>Array Items</PropertyLabel>
                <PropertyValue>{JSON.stringify(fieldDef.items, null, 2)}</PropertyValue>
              </FieldProperty>
            )}
            
            {fieldDef.fields && (
              <FieldProperty>
                <PropertyLabel>Object Fields</PropertyLabel>
                <PropertyValue>{JSON.stringify(fieldDef.fields, null, 2)}</PropertyValue>
              </FieldProperty>
            )}
          </DetailedFieldBody>
        </DetailedField>
      ))}
    </DetailedView>
  );

  const renderJsonView = () => (
    <JsonViewer>
      {JSON.stringify(schema, null, 2)}
    </JsonViewer>
  );

  const renderContent = () => {
    if (!hasSchema) {
      return (
        <EmptyState>
          <EmptyIcon>
            <FileText size={48} />
          </EmptyIcon>
          <EmptyTitle>No Schema Fields</EmptyTitle>
          <EmptyDescription>This template doesn't have any schema fields defined.</EmptyDescription>
        </EmptyState>
      );
    }

    switch (activeTab) {
      case 'simple':
        return renderSimpleList();
      case 'detailed':
        return renderDetailedView();
      case 'json':
        return renderJsonView();
      default:
        return renderSimpleList();
    }
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <HeaderTitle>
            <FileText size={20} />
            Schema Fields - {templateName}
          </HeaderTitle>
          <CloseButton onClick={onClose}>
            <X size={16} />
          </CloseButton>
        </ModalHeader>
        
        <TabsContainer>
          <Tab 
            $active={activeTab === 'simple'} 
            onClick={() => setActiveTab('simple')}
          >
            <List size={16} />
            Simple List
          </Tab>
          <Tab 
            $active={activeTab === 'detailed'} 
            onClick={() => setActiveTab('detailed')}
          >
            <Eye size={16} />
            Detailed View
          </Tab>
          <Tab 
            $active={activeTab === 'json'} 
            onClick={() => setActiveTab('json')}
          >
            <Code size={16} />
            JSON View
          </Tab>
        </TabsContainer>
        
        <TabContent>
          {renderContent()}
        </TabContent>
      </ModalContent>
    </ModalOverlay>
  );
};

export default SchemaModal;
