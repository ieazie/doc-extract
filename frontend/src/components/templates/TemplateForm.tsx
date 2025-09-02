import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useMutation, useQueryClient } from 'react-query';
import { apiClient } from '../../services/api';
import { TemplateFull, TemplateFormData, SchemaField } from '../../types/templates';

interface TemplateFormProps {
  template?: TemplateFull;
  onSave: () => void;
  onCancel: () => void;
}

const FormContainer = styled.div`
  padding: 2rem;
  background: #f8f9fa;
  min-height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  h1 {
    margin: 0;
    color: #2c3e50;
    font-size: 2rem;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.75rem 1.5rem;
  border: 1px solid ${props => {
    switch (props.variant) {
      case 'primary': return '#3498db';
      case 'danger': return '#e74c3c';
      default: return '#ddd';
    }
  }};
  background: ${props => {
    switch (props.variant) {
      case 'primary': return '#3498db';
      case 'danger': return '#e74c3c';
      default: return 'white';
    }
  }};
  color: ${props => props.variant === 'secondary' ? '#6c757d' : 'white'};
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => {
      switch (props.variant) {
        case 'primary': return '#2980b9';
        case 'danger': return '#c0392b';
        default: return '#f8f9fa';
      }
    }};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Form = styled.form`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
`;

const FormSection = styled.div`
  margin-bottom: 2rem;
  
  h2 {
    color: #2c3e50;
    font-size: 1.5rem;
    margin: 0 0 1rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e9ecef;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #495057;
  }
  
  input, textarea, select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s;
    
    &:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }
  }
  
  textarea {
    min-height: 100px;
    resize: vertical;
  }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SchemaBuilder = styled.div`
  border: 2px dashed #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  background: #f8f9fa;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 2fr auto auto;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  margin-bottom: 1rem;
  border: 1px solid #e9ecef;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
`;

const FieldInput = styled.input`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const FieldSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const RemoveButton = styled.button`
  background: none;
  color: #e74c3c;
  border: none;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: #fdf2f2;
    color: #c0392b;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  input[type="checkbox"] {
    margin: 0;
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
  
  label {
    margin: 0;
    font-size: 0.875rem;
    color: #2c3e50;
    cursor: pointer;
    user-select: none;
  }
`;

const AddFieldButton = styled.button`
  background: #27ae60;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  margin-top: 1rem;
  
  &:hover {
    background: #229954;
  }
`;

const ExamplesSection = styled.div`
  margin-top: 2rem;
`;

const ExampleCard = styled.div`
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  background: white;
`;

const ExampleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  
  h4 {
    margin: 0;
    color: #2c3e50;
  }
`;

const ExampleActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ExampleButton = styled.button<{ variant?: 'primary' | 'danger' }>`
  padding: 0.5rem 1rem;
  border: 1px solid ${props => props.variant === 'danger' ? '#e74c3c' : '#3498db'};
  background: ${props => props.variant === 'danger' ? '#e74c3c' : '#3498db'};
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  
  &:hover {
    background: ${props => props.variant === 'danger' ? '#c0392b' : '#2980b9'};
  }
`;

const AddExampleButton = styled.button`
  background: #9b59b6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  margin-top: 1rem;
  
  &:hover {
    background: #8e44ad;
  }
`;

const ErrorMessage = styled.div`
  color: #e74c3c;
  background: #fdf2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const SuccessMessage = styled.div`
  color: #27ae60;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const TemplateForm: React.FC<TemplateFormProps> = ({ template, onSave, onCancel }) => {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    document_type_id: '',
    schema: {},
    prompt_config: {
      system_prompt: 'You are an expert at extracting structured data from documents.',
      instructions: 'Extract the specified fields from this document.',
      output_format: 'json'
    },
    extraction_settings: {
      max_chunk_size: 4000,
      extraction_passes: 1,
      confidence_threshold: 0.8
    },
    few_shot_examples: []
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (template) {
      // Convert TemplateFull to TemplateFormData
      setFormData({
        name: template.name,
        document_type_id: template.document_type_id,
        schema: template.schema,
        prompt_config: template.prompt_config as any,
        extraction_settings: template.extraction_settings as any,
        few_shot_examples: template.few_shot_examples || []
      });
    }
  }, [template]);

  const createMutation = useMutation({
    mutationFn: (data: TemplateFormData) => apiClient.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      onSave();
    },
  });

  const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<TemplateFormData> }) =>
      apiClient.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      onSave();
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePromptConfigChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      prompt_config: {
        ...prev.prompt_config,
        [field]: value
      }
    }));
  };

  const handleExtractionSettingsChange = (field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      extraction_settings: {
        ...prev.extraction_settings,
        [field]: value
      }
    }));
  };

  const addField = () => {
    const newField: SchemaField = {
      name: `field_${Object.keys(formData.schema).length + 1}`,
      type: 'text',
      required: false,
      description: ''
    };
    
    const fieldId = `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    setFormData(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        [fieldId]: newField
      }
    }));
  };

  const updateField = (fieldName: string, property: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        [fieldName]: {
          ...prev.schema[fieldName],
          [property]: value
        }
      }
    }));
  };

  const removeField = (fieldName: string) => {
    const newSchema = { ...formData.schema };
    delete newSchema[fieldName];
    setFormData(prev => ({
      ...prev,
      schema: newSchema
    }));
  };

  const addExample = () => {
    const newExample = {
      name: `Example ${formData.few_shot_examples.length + 1}`,
      document_snippet: '',
      expected_output: {}
    };
    
    setFormData(prev => ({
      ...prev,
      few_shot_examples: [...prev.few_shot_examples, newExample]
    }));
  };

  const updateExample = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      few_shot_examples: prev.few_shot_examples.map((example, i) => 
        i === index ? { ...example, [field]: value } : example
      )
    }));
  };

  const removeExample = (index: number) => {
    setFormData(prev => ({
      ...prev,
      few_shot_examples: prev.few_shot_examples.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    
    if (!formData.name.trim()) {
      newErrors.push('Template name is required');
    }
    
    if (Object.keys(formData.schema).length === 0) {
      newErrors.push('At least one schema field is required');
    }
    
    if (!formData.prompt_config.system_prompt.trim()) {
      newErrors.push('System prompt is required');
    }
    
    if (!formData.prompt_config.instructions.trim()) {
      newErrors.push('Instructions are required');
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (template?.id) {
        await updateMutation.mutateAsync({
          id: template.id,
          data: formData
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      setErrors(['Failed to save template. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormContainer>
      <Header>
        <h1>{template ? 'Edit Template' : 'Create New Template'}</h1>
        <ActionButtons>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Template'}
          </Button>
        </ActionButtons>
      </Header>

      <Form onSubmit={handleSubmit}>
        {errors.length > 0 && (
          <ErrorMessage>
            {errors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </ErrorMessage>
        )}

        <FormSection>
          <h2>Basic Information</h2>
          <Row>
            <FormGroup>
              <label>Template Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Invoice Template"
              />
            </FormGroup>
            <FormGroup>
              <label>Document Type</label>
              <select
                value={formData.document_type_id || ''}
                onChange={(e) => handleInputChange('document_type_id', e.target.value || undefined)}
              >
                <option value="">Select Document Type</option>
                <option value="invoice">Invoice</option>
                <option value="contract">Contract</option>
                <option value="insurance_policy">Insurance Policy</option>
              </select>
            </FormGroup>
          </Row>
        </FormSection>

        <FormSection>
          <h2>Schema Definition</h2>
          <SchemaBuilder>
            {Object.entries(formData.schema).map(([fieldId, fieldDef]) => (
              <FieldRow key={fieldId}>
                <FieldInput
                  type="text"
                  value={fieldDef.name || ''}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    
                    setFormData(prev => ({
                      ...prev,
                      schema: {
                        ...prev.schema,
                        [fieldId]: {
                          ...prev.schema[fieldId],
                          name: newValue
                        }
                      }
                    }));
                  }}
                  placeholder="Field name"
                />
                <FieldSelect
                  value={fieldDef.type}
                  onChange={(e) => updateField(fieldId, 'type', e.target.value)}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="array">Array</option>
                  <option value="object">Object</option>
                </FieldSelect>
                <FieldInput
                  type="text"
                  value={fieldDef.description || ''}
                  onChange={(e) => updateField(fieldId, 'description', e.target.value)}
                  placeholder="Description"
                />
                <CheckboxContainer>
                  <input
                    type="checkbox"
                    id={`required_${fieldId}`}
                    checked={fieldDef.required || false}
                    onChange={(e) => updateField(fieldId, 'required', e.target.checked)}
                  />
                  <label htmlFor={`required_${fieldId}`}>Required</label>
                </CheckboxContainer>
                <RemoveButton onClick={() => removeField(fieldId)} title="Remove field">
                  🗑️
                </RemoveButton>
              </FieldRow>
            ))}
            <AddFieldButton type="button" onClick={addField}>
              + Add Field
            </AddFieldButton>
          </SchemaBuilder>
        </FormSection>

        <FormSection>
          <h2>Prompt Configuration</h2>
          <FormGroup>
            <label>System Prompt *</label>
            <textarea
              value={formData.prompt_config.system_prompt}
              onChange={(e) => handlePromptConfigChange('system_prompt', e.target.value)}
              placeholder="Define the AI's role and expertise..."
            />
          </FormGroup>
          <FormGroup>
            <label>Extraction Instructions *</label>
            <textarea
              value={formData.prompt_config.instructions}
              onChange={(e) => handlePromptConfigChange('instructions', e.target.value)}
              placeholder="Provide specific instructions for extraction..."
            />
          </FormGroup>
          <Row>
            <FormGroup>
              <label>Output Format</label>
              <select
                value={formData.prompt_config.output_format}
                onChange={(e) => handlePromptConfigChange('output_format', e.target.value)}
              >
                <option value="json">JSON</option>
                <option value="xml">XML</option>
                <option value="csv">CSV</option>
              </select>
            </FormGroup>
          </Row>
        </FormSection>

        <FormSection>
          <h2>Extraction Settings</h2>
          <Row>
            <FormGroup>
              <label>Max Chunk Size (characters)</label>
              <input
                type="number"
                value={formData.extraction_settings.max_chunk_size}
                onChange={(e) => handleExtractionSettingsChange('max_chunk_size', parseInt(e.target.value))}
                min="1000"
                max="10000"
              />
            </FormGroup>
            <FormGroup>
              <label>Extraction Passes</label>
              <input
                type="number"
                value={formData.extraction_settings.extraction_passes}
                onChange={(e) => handleExtractionSettingsChange('extraction_passes', parseInt(e.target.value))}
                min="1"
                max="5"
              />
            </FormGroup>
          </Row>
          <Row>
            <FormGroup>
              <label>Confidence Threshold</label>
              <input
                type="number"
                value={formData.extraction_settings.confidence_threshold}
                onChange={(e) => handleExtractionSettingsChange('confidence_threshold', parseFloat(e.target.value))}
                min="0.0"
                max="1.0"
                step="0.1"
              />
            </FormGroup>
          </Row>
        </FormSection>

        <FormSection>
          <h2>Few-Shot Examples</h2>
          <ExamplesSection>
            {formData.few_shot_examples.map((example, index) => (
              <ExampleCard key={index}>
                <ExampleHeader>
                  <h4>{example.name}</h4>
                  <ExampleActions>
                    <ExampleButton 
                      variant="danger" 
                      type="button"
                      onClick={() => removeExample(index)}
                    >
                      Remove
                    </ExampleButton>
                  </ExampleActions>
                </ExampleHeader>
                <Row>
                  <FormGroup>
                    <label>Example Name</label>
                    <input
                      type="text"
                      value={example.name}
                      onChange={(e) => updateExample(index, 'name', e.target.value)}
                      placeholder="Example name"
                    />
                  </FormGroup>
                </Row>
                <FormGroup>
                  <label>Document Snippet</label>
                  <textarea
                    value={example.document_snippet}
                    onChange={(e) => updateExample(index, 'document_snippet', e.target.value)}
                    placeholder="Paste a sample document snippet..."
                  />
                </FormGroup>
                <FormGroup>
                  <label>Expected Output (JSON)</label>
                  <textarea
                    value={JSON.stringify(example.expected_output, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        updateExample(index, 'expected_output', parsed);
                      } catch (error) {
                        // Allow invalid JSON during typing
                      }
                    }}
                    placeholder='{"field1": "value1", "field2": "value2"}'
                  />
                </FormGroup>
              </ExampleCard>
            ))}
            <AddExampleButton type="button" onClick={addExample}>
              + Add Example
            </AddExampleButton>
          </ExamplesSection>
        </FormSection>
      </Form>
    </FormContainer>
  );
};

export default TemplateForm;
