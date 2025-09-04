/**
 * Enhanced Template Builder Component
 * Schema definition with drag-and-drop field creation
 */
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  ChevronDown, 
  ChevronRight,
  Settings,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  FileText
} from 'lucide-react';

// Types
interface Template {
  id?: string;
  name: string;
  description: string;
  document_type: string;
  schema: {
    fields: SchemaField[];
  };
  status: 'draft' | 'published' | 'archived';
}

interface SchemaField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  children?: SchemaField[];
  expanded?: boolean;
}

interface TemplateBuilderProps {
  templateData: Partial<Template>;
  onTemplateChange: (template: Partial<Template>) => void;
  selectedDocument?: any; // Document being previewed
  isBasicInfoComplete?: boolean; // Whether basic information is complete
}

// Styled Components
const BuilderContainer = styled.div`
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`;

const Section = styled.div`
  margin-bottom: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
`;

const SectionHeader = styled.div`
  padding: 1rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  border-radius: 0.5rem 0.5rem 0 0;
  
  &:hover {
    background: #f3f4f6;
  }
`;

const SectionTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SectionContent = styled.div<{ $collapsed?: boolean }>`
  padding: ${props => props.$collapsed ? '0' : '1rem'};
  max-height: ${props => props.$collapsed ? '0' : 'none'};
  overflow: hidden;
  transition: all 0.3s ease;
`;

const CollapseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
  
  &:hover {
    background: #e5e7eb;
    color: #374151;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
`;

const HelpText = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
  line-height: 1.4;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  min-height: 80px;
  resize: vertical;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const FieldMappingSuggestions = styled.div`
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  color: #64748b;
`;

const SuggestionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  cursor: pointer;
  
  &:hover {
    color: #3b82f6;
  }
`;

const SuggestionIcon = styled.div`
  width: 12px;
  height: 12px;
  background: #e2e8f0;
  border-radius: 2px;
  flex-shrink: 0;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: white;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const FieldsContainer = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
  min-height: 200px;
`;

const FieldItem = styled.div<{ $level?: number }>`
  border-bottom: 1px solid #f3f4f6;
  padding: 0.75rem ${props => (props.$level || 0) * 1.5 + 0.75}rem 0.75rem 0.75rem;
  
  &:last-child {
    border-bottom: none;
  }
`;

const FieldHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const DragHandle = styled.div`
  cursor: grab;
  color: #9ca3af;
  
  &:active {
    cursor: grabbing;
  }
`;

const FieldName = styled.div`
  flex: 1;
  font-weight: 500;
  color: #374151;
`;

const FieldType = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
`;

const FieldActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
  
  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
`;

const ExpandButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  
  &:hover {
    color: #374151;
  }
`;

const FieldDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FieldInput = styled.input`
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const FieldTextArea = styled.textarea`
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  min-height: 60px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const FieldSelect = styled.select`
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Checkbox = styled.input`
  width: 1rem;
  height: 1rem;
`;

const CheckboxLabel = styled.label`
  font-size: 0.75rem;
  color: #374151;
  cursor: pointer;
`;

const AddFieldButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  
  &:hover {
    border-color: #3b82f6;
    color: #3b82f6;
    background: #f8fafc;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #9ca3af;
  text-align: center;
`;

const EmptyIcon = styled.div`
  width: 3rem;
  height: 3rem;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
`;

const EmptyText = styled.div`
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
`;

const EmptySubtext = styled.div`
  font-size: 0.75rem;
`;

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'string': return <Type size={12} />;
    case 'number': return <Hash size={12} />;
    case 'date': return <Calendar size={12} />;
    case 'boolean': return <ToggleLeft size={12} />;
    case 'array': return <List size={12} />;
    case 'object': return <FileText size={12} />;
    default: return <Type size={12} />;
  }
};

const TemplateBuilder: React.FC<TemplateBuilderProps> = ({ 
  templateData, 
  onTemplateChange, 
  selectedDocument,
  isBasicInfoComplete = false
}) => {
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['basic']));
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [usedSuggestions, setUsedSuggestions] = useState<Set<string>>(new Set());

  // Generate field mapping suggestions based on the document type
  const getFieldSuggestions = (fieldName: string, fieldId: string) => {
    if (!selectedDocument || activeFieldId !== fieldId) return [];
    
    const allSuggestions = [];
    const docType = templateData.document_type || 'invoice';
    
    // Common field suggestions based on the document type
    if (docType === 'invoice') {
      if (fieldName.toLowerCase().includes('number') || fieldName.toLowerCase().includes('id')) {
        allSuggestions.push('Invoice Number', 'Reference Number', 'Document ID');
      }
      if (fieldName.toLowerCase().includes('date')) {
        allSuggestions.push('Invoice Date', 'Due Date', 'Payment Date');
      }
      if (fieldName.toLowerCase().includes('amount') || fieldName.toLowerCase().includes('total')) {
        allSuggestions.push('Total Amount', 'Subtotal', 'Tax Amount');
      }
      if (fieldName.toLowerCase().includes('merchant') || fieldName.toLowerCase().includes('vendor')) {
        allSuggestions.push('Merchant Name', 'Vendor Address', 'Company Name');
      }
    }
    
    // Filter out used suggestions
    const availableSuggestions = allSuggestions.filter(suggestion => !usedSuggestions.has(suggestion));
    
    return availableSuggestions.slice(0, 3); // Limit to 3 suggestions
  };

  const handleSuggestionClick = (suggestion: string, fieldId: string) => {
    // Update the field name
    updateField(fieldId, { name: suggestion });
    
    // Mark suggestion as used
    setUsedSuggestions(prev => new Set(Array.from(prev).concat(suggestion)));
    
    // Clear active field to hide suggestions
    setActiveFieldId(null);
  };

  // Reset used suggestions when document changes
  useEffect(() => {
    setUsedSuggestions(new Set());
    setActiveFieldId(null);
  }, [selectedDocument]);

  const updateTemplate = (updates: Partial<Template>) => {
    onTemplateChange({ ...templateData, ...updates });
  };

  const addField = (parentId?: string) => {
    const newField: SchemaField = {
      id: `field_${Date.now()}`,
      name: 'new_field',
      type: 'string',
      description: '',
      required: false,
      children: [],
      expanded: false
    };

    const fields = templateData.schema?.fields || [];
    
    if (parentId) {
      // Add as child field
      const updateFields = (fieldList: SchemaField[]): SchemaField[] => {
        return fieldList.map(field => {
          if (field.id === parentId) {
            return {
              ...field,
              children: [...(field.children || []), newField]
            };
          }
          if (field.children) {
            return {
              ...field,
              children: updateFields(field.children)
            };
          }
          return field;
        });
      };
      
      updateTemplate({
        schema: { fields: updateFields(fields) }
      });
    } else {
      // Add as top-level field
      updateTemplate({
        schema: { fields: [...fields, newField] }
      });
    }
  };

  const removeField = (fieldId: string) => {
    const fields = templateData.schema?.fields || [];
    
    const removeFieldRecursive = (fieldList: SchemaField[]): SchemaField[] => {
      return fieldList.filter(field => {
        if (field.id === fieldId) return false;
        if (field.children) {
          field.children = removeFieldRecursive(field.children);
        }
        return true;
      });
    };
    
    updateTemplate({
      schema: { fields: removeFieldRecursive(fields) }
    });
  };

  const updateField = (fieldId: string, updates: Partial<SchemaField>) => {
    const fields = templateData.schema?.fields || [];
    
    const updateFieldRecursive = (fieldList: SchemaField[]): SchemaField[] => {
      return fieldList.map(field => {
        if (field.id === fieldId) {
          return { ...field, ...updates };
        }
        if (field.children) {
          return {
            ...field,
            children: updateFieldRecursive(field.children)
          };
        }
        return field;
      });
    };
    
    updateTemplate({
      schema: { fields: updateFieldRecursive(fields) }
    });
  };

  const toggleFieldExpansion = (fieldId: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(fieldId)) {
      newExpanded.delete(fieldId);
    } else {
      newExpanded.add(fieldId);
    }
    setExpandedFields(newExpanded);
  };

  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId);
    } else {
      newCollapsed.add(sectionId);
    }
    setCollapsedSections(newCollapsed);
  };

  const renderField = (field: SchemaField, level: number = 0) => {
    const isExpanded = expandedFields.has(field.id);
    const hasChildren = field.children && field.children.length > 0;

    return (
      <FieldItem key={field.id} $level={level}>
        <FieldHeader>
          {hasChildren && (
            <ExpandButton onClick={() => toggleFieldExpansion(field.id)}>
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </ExpandButton>
          )}
          
          <DragHandle>
            <GripVertical size={14} />
          </DragHandle>
          
          <FieldName>{field.name}</FieldName>
          
          <FieldType>
            {getTypeIcon(field.type)}
            {field.type}
          </FieldType>
          
          <FieldActions>
            <ActionButton onClick={() => addField(field.id)}>
              <Plus size={12} />
            </ActionButton>
            <ActionButton onClick={() => removeField(field.id)}>
              <Trash2 size={12} />
            </ActionButton>
          </FieldActions>
        </FieldHeader>
        
        <FieldDetails>
          <FieldInput
            value={field.name}
            onChange={(e) => updateField(field.id, { name: e.target.value })}
            onFocus={() => setActiveFieldId(field.id)}
            onBlur={() => {
              // Delay hiding suggestions to allow clicking on them
              setTimeout(() => setActiveFieldId(null), 200);
            }}
            placeholder="Field name"
          />
          
          {getFieldSuggestions(field.name, field.id).length > 0 && (
            <FieldMappingSuggestions>
              <div style={{ marginBottom: '0.5rem', fontWeight: '500' }}>
                💡 Suggested mappings:
              </div>
              {getFieldSuggestions(field.name, field.id).map((suggestion, index) => (
                <SuggestionItem 
                  key={index}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur
                    handleSuggestionClick(suggestion, field.id);
                  }}
                >
                  <SuggestionIcon />
                  {suggestion}
                </SuggestionItem>
              ))}
            </FieldMappingSuggestions>
          )}
          
          <FieldSelect
            value={field.type}
            onChange={(e) => updateField(field.id, { type: e.target.value as any })}
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="boolean">Boolean</option>
            <option value="array">Array</option>
            <option value="object">Object</option>
          </FieldSelect>
          
          <FieldTextArea
            value={field.description}
            onChange={(e) => updateField(field.id, { description: e.target.value })}
            placeholder="Field description"
          />
          
          <CheckboxContainer>
            <Checkbox
              type="checkbox"
              checked={field.required}
              onChange={(e) => updateField(field.id, { required: e.target.checked })}
            />
            <CheckboxLabel>Required field</CheckboxLabel>
          </CheckboxContainer>
        </FieldDetails>
        
        {isExpanded && hasChildren && (
          <div style={{ marginTop: '0.5rem' }}>
            {field.children?.map(child => renderField(child, level + 1))}
          </div>
        )}
      </FieldItem>
    );
  };

  return (
    <BuilderContainer>
      <Section>
        <SectionHeader onClick={() => toggleSection('basic')}>
          <SectionTitle>
            <Settings size={16} />
            Basic Information
            {!isBasicInfoComplete && (
              <span style={{ 
                background: '#f59e0b', 
                color: 'white', 
                borderRadius: '50%', 
                width: '20px', 
                height: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '0.75rem',
                marginLeft: '0.5rem'
              }}>
                !
              </span>
            )}
          </SectionTitle>
          <CollapseButton>
            {collapsedSections.has('basic') ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </CollapseButton>
        </SectionHeader>
        
        <SectionContent $collapsed={collapsedSections.has('basic')}>
          <FormGroup>
            <Label>Template Name</Label>
            <Input
              value={templateData.name || ''}
              onChange={(e) => updateTemplate({ name: e.target.value })}
              placeholder="Enter template name"
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Extraction Prompt</Label>
            <TextArea
              value={templateData.description || ''}
              onChange={(e) => updateTemplate({ description: e.target.value })}
              placeholder="Provide instructions for the AI on what to extract from documents (e.g., 'Extract invoice number, date, total amount, and vendor information')"
            />
            <HelpText>
              This prompt will guide the AI extraction process. Be specific about what data to extract.
            </HelpText>
          </FormGroup>
          
          <FormGroup>
            <Label>Document Type</Label>
            <Select
              value={templateData.document_type || 'invoice'}
              onChange={(e) => updateTemplate({ document_type: e.target.value })}
            >
              <option value="invoice">Invoice</option>
              <option value="contract">Contract</option>
              <option value="insurance_policy">Insurance Policy</option>
              <option value="receipt">Receipt</option>
              <option value="other">Other</option>
            </Select>
          </FormGroup>
        </SectionContent>
      </Section>

      <Section>
        <SectionHeader onClick={() => toggleSection('schema')}>
          <SectionTitle>
            <FileText size={16} />
            Schema Fields
            {isBasicInfoComplete ? (
              templateData.schema?.fields && templateData.schema.fields.length > 0 ? (
                <span style={{ 
                  background: '#3b82f6', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: '20px', 
                  height: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '0.75rem',
                  marginLeft: '0.5rem'
                }}>
                  {templateData.schema.fields.length}
                </span>
              ) : (
                <span style={{ 
                  background: '#f59e0b', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: '20px', 
                  height: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '0.75rem',
                  marginLeft: '0.5rem'
                }}>
                  !
                </span>
              )
            ) : (
              <span style={{ 
                background: '#9ca3af', 
                color: 'white', 
                borderRadius: '50%', 
                width: '20px', 
                height: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '0.75rem',
                marginLeft: '0.5rem'
              }}>
                ⏸
              </span>
            )}
          </SectionTitle>
          <CollapseButton>
            {collapsedSections.has('schema') ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </CollapseButton>
        </SectionHeader>
        
        <SectionContent $collapsed={collapsedSections.has('schema')}>
          {!isBasicInfoComplete ? (
            <EmptyState>
              <EmptyIcon>
                <Settings size={20} />
              </EmptyIcon>
              <EmptyText>Complete Basic Information First</EmptyText>
              <EmptySubtext>Please fill in template name, description, and document type before defining schema fields</EmptySubtext>
            </EmptyState>
          ) : (
            <FieldsContainer>
              {templateData.schema?.fields && templateData.schema.fields.length > 0 ? (
                templateData.schema.fields.map(field => renderField(field))
              ) : (
                <EmptyState>
                  <EmptyIcon>
                    <Plus size={20} />
                  </EmptyIcon>
                  <EmptyText>No fields defined</EmptyText>
                  <EmptySubtext>Add fields to define your extraction schema</EmptySubtext>
                </EmptyState>
              )}
              
              <AddFieldButton onClick={() => addField()}>
                <Plus size={16} />
                Add Field
              </AddFieldButton>
            </FieldsContainer>
          )}
        </SectionContent>
      </Section>
    </BuilderContainer>
  );
};

export default TemplateBuilder;
