import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Edit3, Save, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import InfoTooltip from '@/components/common/InfoTooltip';

const ConfigCard = styled.div<{ $isEditing: boolean }>`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.$isEditing ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    border-color: ${props => props.$isEditing ? props.theme.colors.primary : props.theme.colors.borderHover};
    box-shadow: ${props => props.$isEditing ? '0 4px 12px rgba(0, 0, 0, 0.1)' : '0 2px 8px rgba(0, 0, 0, 0.05)'};
  }
`;

const ConfigHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const ConfigTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
`;

const EditButton = styled(Button)`
  padding: 0.5rem;
  min-width: auto;
  background: transparent;
  border: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text.secondary};

  &:hover {
    background: ${props => props.theme.colors.primaryLight}20;
    border-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.primary};
  }
`;

const ConfigFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FieldLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FieldInput = styled.input<{ $hasError?: boolean }>`
  padding: 0.75rem;
  border: 1px solid ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.border};
  border-radius: 8px;
  font-size: 0.875rem;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.primary};
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? `${props.theme.colors.error}20` : `${props.theme.colors.primary}20`};
  }

  &:disabled {
    background: ${props => props.theme.colors.surfaceHover};
    color: ${props => props.theme.colors.text.secondary};
    cursor: not-allowed;
  }
`;

const FieldTextarea = styled.textarea<{ $hasError?: boolean }>`
  padding: 0.75rem;
  border: 1px solid ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.border};
  border-radius: 8px;
  font-size: 0.875rem;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.primary};
  min-height: 80px;
  resize: vertical;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? `${props.theme.colors.error}20` : `${props.theme.colors.primary}20`};
  }
`;

const FieldSelect = styled.select<{ $hasError?: boolean }>`
  padding: 0.75rem;
  border: 1px solid ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.border};
  border-radius: 8px;
  font-size: 0.875rem;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.primary};
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? `${props.theme.colors.error}20` : `${props.theme.colors.primary}20`};
  }
`;

const FieldValue = styled.div`
  padding: 0.75rem;
  background: ${props => props.theme.colors.surfaceHover};
  border-radius: 8px;
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text.primary};
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  word-break: break-all;
  min-height: 1.5rem;
  display: flex;
  align-items: center;
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${props => props.theme.colors.error};
  font-size: 0.75rem;
  margin-top: 0.25rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const SaveButton = styled(Button)`
  background: ${props => props.theme.colors.success};
  border-color: ${props => props.theme.colors.success};

  &:hover {
    background: ${props => props.theme.colors.success}dd;
  }

  &:disabled {
    background: ${props => props.theme.colors.surfaceHover};
    border-color: ${props => props.theme.colors.border};
    color: ${props => props.theme.colors.text.muted};
  }
`;

const CancelButton = styled(Button)`
  background: transparent;
  border-color: ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text.secondary};

  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
    border-color: ${props => props.theme.colors.text.secondary};
  }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${props => props.theme.colors.surface}dd;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  backdrop-filter: blur(2px);
`;

const SuccessMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${props => props.theme.colors.success};
  font-size: 0.875rem;
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: ${props => props.theme.colors.successLight}20;
  border: 1px solid ${props => props.theme.colors.success}40;
  border-radius: 8px;
`;

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'password';
  value: any;
  options?: string[];
  placeholder?: string;
  description?: string;
  required?: boolean;
  validation?: (value: any) => string | null;
}

interface EditableConfigCardProps {
  title: string;
  description?: string;
  fields: ConfigField[];
  onSave: (values: Record<string, any>) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

const EditableConfigCard: React.FC<EditableConfigCardProps> = ({
  title,
  description,
  fields,
  onSave,
  loading = false,
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const initialValues: Record<string, any> = {};
    fields.forEach(field => {
      initialValues[field.key] = field.value;
    });
    setValues(initialValues);
  }, [fields]);

  const handleEdit = () => {
    setIsEditing(true);
    setErrors({});
    setSuccess(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
    setSuccess(false);
    // Reset values to original
    const originalValues: Record<string, any> = {};
    fields.forEach(field => {
      originalValues[field.key] = field.value;
    });
    setValues(originalValues);
  };

  const handleFieldChange = (key: string, value: any) => {
    setValues(prev => ({ ...prev, [key]: value }));
    
    // Clear error for this field
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }

    // Validate field if validation function exists
    const field = fields.find(f => f.key === key);
    if (field?.validation) {
      const error = field.validation(value);
      if (error) {
        setErrors(prev => ({ ...prev, [key]: error }));
      }
    }
  };

  const validateAllFields = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    fields.forEach(field => {
      if (field.required && (!values[field.key] || values[field.key].toString().trim() === '')) {
        newErrors[field.key] = `${field.label} is required`;
        isValid = false;
      } else if (field.validation) {
        const error = field.validation(values[field.key]);
        if (error) {
          newErrors[field.key] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateAllFields()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(values);
      setIsEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Save failed:', error);
      // Error handling will be done by parent component
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    return fields.some(field => values[field.key] !== field.value);
  };

  const renderField = (field: ConfigField) => {
    const hasError = !!errors[field.key];
    const fieldValue = values[field.key];

    if (!isEditing) {
      return (
        <FieldGroup key={field.key}>
          <FieldLabel>
            {field.label}
            {field.description && <InfoTooltip content={field.description} />}
          </FieldLabel>
          <FieldValue>
            {field.type === 'password' ? '••••••••' : 
             typeof fieldValue === 'object' ? JSON.stringify(fieldValue, null, 2) :
             String(fieldValue || '')}
          </FieldValue>
        </FieldGroup>
      );
    }

    switch (field.type) {
      case 'textarea':
        return (
          <FieldGroup key={field.key}>
            <FieldLabel>
              {field.label}
              {field.required && <span style={{ color: 'red' }}>*</span>}
              {field.description && <InfoTooltip content={field.description} />}
            </FieldLabel>
            <FieldTextarea
              value={fieldValue || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              $hasError={hasError}
              disabled={disabled}
            />
            {hasError && (
              <ErrorMessage>
                <AlertCircle size={14} />
                {errors[field.key]}
              </ErrorMessage>
            )}
          </FieldGroup>
        );

      case 'select':
        return (
          <FieldGroup key={field.key}>
            <FieldLabel>
              {field.label}
              {field.required && <span style={{ color: 'red' }}>*</span>}
              {field.description && <InfoTooltip content={field.description} />}
            </FieldLabel>
            <FieldSelect
              value={fieldValue || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              $hasError={hasError}
              disabled={disabled}
            >
              <option value="">Select {field.label}</option>
              {field.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </FieldSelect>
            {hasError && (
              <ErrorMessage>
                <AlertCircle size={14} />
                {errors[field.key]}
              </ErrorMessage>
            )}
          </FieldGroup>
        );

      case 'number':
        return (
          <FieldGroup key={field.key}>
            <FieldLabel>
              {field.label}
              {field.required && <span style={{ color: 'red' }}>*</span>}
              {field.description && <InfoTooltip content={field.description} />}
            </FieldLabel>
            <FieldInput
              type="number"
              value={fieldValue || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value ? Number(e.target.value) : '')}
              placeholder={field.placeholder}
              $hasError={hasError}
              disabled={disabled}
            />
            {hasError && (
              <ErrorMessage>
                <AlertCircle size={14} />
                {errors[field.key]}
              </ErrorMessage>
            )}
          </FieldGroup>
        );

      default:
        return (
          <FieldGroup key={field.key}>
            <FieldLabel>
              {field.label}
              {field.required && <span style={{ color: 'red' }}>*</span>}
              {field.description && <InfoTooltip content={field.description} />}
            </FieldLabel>
            <FieldInput
              type={field.type}
              value={fieldValue || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              $hasError={hasError}
              disabled={disabled}
            />
            {hasError && (
              <ErrorMessage>
                <AlertCircle size={14} />
                {errors[field.key]}
              </ErrorMessage>
            )}
          </FieldGroup>
        );
    }
  };

  return (
    <ConfigCard $isEditing={isEditing}>
      <ConfigHeader>
        <ConfigTitle>
          {title}
          {description && <InfoTooltip content={description} />}
        </ConfigTitle>
        {!isEditing && !disabled && (
          <EditButton onClick={handleEdit} disabled={loading}>
            <Edit3 size={16} />
          </EditButton>
        )}
      </ConfigHeader>

      <ConfigFields>
        {fields.map(renderField)}
      </ConfigFields>

      {isEditing && (
        <ActionButtons>
          <SaveButton
            onClick={handleSave}
            disabled={saving || !hasChanges() || Object.keys(errors).length > 0}
            size="small"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </SaveButton>
          <CancelButton onClick={handleCancel} disabled={saving} size="small">
            Cancel
          </CancelButton>
        </ActionButtons>
      )}

      {success && (
        <SuccessMessage>
          <CheckCircle size={16} />
          Configuration updated successfully
        </SuccessMessage>
      )}

      {(loading || saving) && (
        <LoadingOverlay>
          <div>Loading...</div>
        </LoadingOverlay>
      )}
    </ConfigCard>
  );
};

export default EditableConfigCard;
