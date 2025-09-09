import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Edit2, Check, X, AlertCircle } from 'lucide-react';

const FieldContainer = styled.div<{ $isEditing: boolean; $hasError: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  background: ${props => props.$isEditing ? '#f8f9fa' : 'transparent'};
  border: ${props => props.$isEditing ? '2px solid #007bff' : props.$hasError ? '2px solid #dc3545' : '2px solid transparent'};
  transition: all 0.2s ease;
  min-height: 32px;

  &:hover {
    background: ${props => props.$isEditing ? '#f8f9fa' : '#f8f9fa'};
    border-color: ${props => props.$isEditing ? '#007bff' : '#dee2e6'};
  }
`;

const FieldValue = styled.div<{ $isEditing: boolean }>`
  flex: 1;
  font-size: 14px;
  color: #333;
  word-break: break-word;
  white-space: pre-wrap;
  min-height: 20px;
  display: ${props => props.$isEditing ? 'none' : 'block'};
`;

const FieldInput = styled.input<{ $hasError: boolean }>`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #333;
  padding: 0;
  margin: 0;
  font-family: inherit;

  &::placeholder {
    color: #6c757d;
  }

  &:focus {
    outline: none;
  }
`;

const FieldTextarea = styled.textarea<{ $hasError: boolean }>`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #333;
  padding: 0;
  margin: 0;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
  max-height: 200px;

  &::placeholder {
    color: #6c757d;
  }

  &:focus {
    outline: none;
  }
`;

const ActionButton = styled.button<{ $variant: 'edit' | 'save' | 'cancel' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: ${props => {
    switch (props.$variant) {
      case 'edit': return '#6c757d';
      case 'save': return '#28a745';
      case 'cancel': return '#dc3545';
      default: return '#6c757d';
    }
  }};
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0.8;

  &:hover {
    opacity: 1;
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ErrorMessage = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #dc3545;
  color: white;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 0 0 4px 4px;
  z-index: 10;
  margin-top: 2px;
`;

const PendingIndicator = styled.div`
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  background: #ffc107;
  border-radius: 50%;
  border: 2px solid white;
`;

export interface EditableFieldProps {
  value: any;
  fieldType: 'text' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  fieldName: string;
  isRequired?: boolean;
  isEditing?: boolean;
  onEdit?: () => void;
  onSave?: (value: any) => void;
  onCancel?: () => void;
  onValueChange?: (value: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const EditableField: React.FC<EditableFieldProps> = ({
  value,
  fieldType,
  fieldName,
  isRequired = false,
  isEditing = false,
  onEdit,
  onSave,
  onCancel,
  onValueChange,
  placeholder,
  disabled = false,
  className
}) => {
  const [editValue, setEditValue] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Initialize edit value when entering edit mode
  useEffect(() => {
    if (isEditing) {
      const stringValue = formatValueForInput(value, fieldType);
      setEditValue(stringValue);
      setError('');
      
      // Focus input after a short delay to ensure it's rendered
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (inputRef.current instanceof HTMLInputElement) {
            inputRef.current.select();
          }
        }
      }, 10);
    }
  }, [isEditing, value, fieldType]);

  const formatValueForInput = (val: any, type: string): string => {
    if (val === null || val === undefined) return '';
    
    switch (type) {
      case 'boolean':
        return val ? 'true' : 'false';
      case 'date':
        if (val instanceof Date) {
          return val.toISOString().split('T')[0];
        }
        return val;
      case 'array':
      case 'object':
        return JSON.stringify(val, null, 2);
      default:
        return String(val);
    }
  };

  const parseValueFromInput = (inputValue: string, type: string): any => {
    if (!inputValue.trim()) return null;

    try {
      switch (type) {
        case 'number':
          const num = parseFloat(inputValue);
          if (isNaN(num)) throw new Error('Invalid number');
          return num;
        case 'boolean':
          const lowerValue = inputValue.toLowerCase();
          if (lowerValue === 'true') return true;
          if (lowerValue === 'false') return false;
          throw new Error('Invalid boolean value');
        case 'date':
          const date = new Date(inputValue);
          if (isNaN(date.getTime())) throw new Error('Invalid date');
          return date.toISOString().split('T')[0];
        case 'array':
        case 'object':
          return JSON.parse(inputValue);
        default:
          return inputValue;
      }
    } catch (err) {
      throw new Error(`Invalid ${type} value`);
    }
  };

  const validateValue = (val: any, type: string): string => {
    if (isRequired && (val === null || val === undefined || val === '')) {
      return 'This field is required';
    }

    if (val === null || val === undefined || val === '') {
      return ''; // Empty values are allowed for non-required fields
    }

    try {
      parseValueFromInput(formatValueForInput(val, type), type);
      return '';
    } catch (err) {
      return err instanceof Error ? err.message : 'Invalid value';
    }
  };

  const handleSave = () => {
    if (disabled) return;

    const validationError = validateValue(editValue, fieldType);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const parsedValue = parseValueFromInput(editValue, fieldType);
      setIsPending(true);
      onValueChange?.(parsedValue);
      onSave?.(parsedValue);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid value');
    }
  };

  const handleCancel = () => {
    setEditValue(formatValueForInput(value, fieldType));
    setError('');
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleEdit = () => {
    if (disabled) return;
    onEdit?.();
  };

  const renderInput = () => {
    const commonProps = {
      ref: inputRef as any,
      value: editValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditValue(e.target.value),
      onKeyDown: handleKeyDown,
      placeholder: placeholder || `Enter ${fieldType} value...`,
      disabled: disabled,
      $hasError: !!error
    };

    if (fieldType === 'array' || fieldType === 'object') {
      return <FieldTextarea {...commonProps} />;
    }

    return <FieldInput {...commonProps} type={fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'} />;
  };

  const renderValue = () => {
    if (value === null || value === undefined) {
      return <span style={{ color: '#6c757d', fontStyle: 'italic' }}>No value</span>;
    }

    switch (fieldType) {
      case 'boolean':
        return <span style={{ color: value ? '#28a745' : '#dc3545' }}>{value ? 'Yes' : 'No'}</span>;
      case 'array':
      case 'object':
        return <pre style={{ margin: 0, fontSize: '12px', color: '#6c757d' }}>{JSON.stringify(value, null, 2)}</pre>;
      default:
        return String(value);
    }
  };

  return (
    <FieldContainer 
      $isEditing={isEditing} 
      $hasError={!!error} 
      className={className}
    >
      {isPending && <PendingIndicator />}
      
      {isEditing ? (
        <>
          {renderInput()}
          <ActionButton $variant="save" onClick={handleSave} disabled={disabled}>
            <Check size={14} />
          </ActionButton>
          <ActionButton $variant="cancel" onClick={handleCancel} disabled={disabled}>
            <X size={14} />
          </ActionButton>
        </>
      ) : (
        <>
          <FieldValue $isEditing={false}>
            {renderValue()}
          </FieldValue>
          {!disabled && (
            <ActionButton $variant="edit" onClick={handleEdit}>
              <Edit2 size={14} />
            </ActionButton>
          )}
        </>
      )}
      
      {error && (
        <ErrorMessage>
          <AlertCircle size={12} style={{ marginRight: 4 }} />
          {error}
        </ErrorMessage>
      )}
    </FieldContainer>
  );
};

export default EditableField;
