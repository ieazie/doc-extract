/**
 * Job Creation/Edit Modal Component
 * Phase 10.4: Frontend Job Management
 */
import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Repeat, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { CronBuilder } from './CronBuilder';
import { JobService, CategoryService, TemplateService, serviceFactory, Job, JobCreateRequest, JobUpdateRequest, Category } from '@/services/api/index';
import styled from 'styled-components';

// Styled Components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 0 24px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 24px;
`;

const ModalTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  
  &:hover {
    background-color: #f1f5f9;
  }
`;

const ModalBody = styled.div`
  padding: 0 24px 24px 24px;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const FormLabel = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 8px;
`;

const FormInput = styled.input`
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
  }
`;

const FormTextarea = styled.textarea`
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
  }
`;

const ScheduleSection = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
`;

const ScheduleTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ScheduleTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ScheduleTypeOption = styled.div<{ selected: boolean }>`
  padding: 16px;
  border: 2px solid ${props => props.selected ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: ${props => props.selected ? `${props.theme.colors.primaryLight}20` : 'white'};
  
  &:hover {
    border-color: #2563eb;
  }
`;

const ScheduleTypeIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-bottom: 8px;
  background-color: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
`;

const ScheduleTypeLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 4px;
`;

const ScheduleTypeDescription = styled.div`
  font-size: 12px;
  color: #64748b;
`;

const AdvancedSection = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
`;

const AdvancedTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AdvancedGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e2e8f0;
  background-color: #f1f5f9;
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
`;

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  user-select: none;
  flex: 1;
`;

const ToggleSwitch = styled.div<{ $active: boolean }>`
  position: relative;
  width: 44px;
  height: 24px;
  background: ${props => props.$active ? '#3b82f6' : '#d1d5db'};
  border-radius: 12px;
  transition: all 0.2s ease;
  cursor: pointer;
  flex-shrink: 0;
  
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${props => props.$active ? '22px' : '2px'};
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const HiddenCheckbox = styled.input`
  position: absolute;
  opacity: 0;
  pointer-events: none;
`;

const ErrorMessage = styled.div`
  background-color: #f87171;
  color: #7f1d1d;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
`;

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (job: Job) => void;
  job?: Job | null;
}

export const JobModal: React.FC<JobModalProps> = ({
  isOpen,
  onClose,
  onSave,
  job
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<JobCreateRequest>({
    name: '',
    description: '',
    job_type: 'extraction',
    schedule_type: 'immediate',
    schedule_config: {
      cron: '',
      cron_expression: '', // For UI compatibility
      timezone: 'UTC'
    },
    execution_config: {
      template_id: '',
      category_id: ''
    },
    retry_policy: {
      max_retries: 3,
      retry_delay_minutes: 5,
      backoff_multiplier: 2,
      max_retry_delay_minutes: 60,
      retry_on_failure_types: ['network_error', 'timeout', 'server_error']
    }
  });

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      const initializeModal = async () => {
        // Load categories and templates first and get the data directly
        const [categoriesResponse, templatesResponse] = await Promise.all([
          loadCategoriesAndGetData(),
          loadTemplatesAndGetData()
        ]);
        
        // Set the state for the dropdowns
        setCategories(categoriesResponse);
        setTemplates(templatesResponse);
        
        // Then set form data after data is loaded
        if (job) {
          // Edit mode - populate form with job data
          console.log('Setting form data for job:', job);
          console.log('Job execution_config:', job.execution_config);
          console.log('Job template_id:', job.template_id);
          console.log('Job category_id:', job.category_id);
          console.log('Available categories:', categoriesResponse);
          console.log('Available templates:', templatesResponse);
          
          const formDataToSet = {
            name: job.name,
            description: job.description || '',
            job_type: job.job_type,
            schedule_type: job.schedule_type,
            schedule_config: {
              cron: job.schedule_config?.cron || job.schedule_config?.cron_expression || '',
              cron_expression: job.schedule_config?.cron || job.schedule_config?.cron_expression || '', // For UI compatibility
              timezone: job.schedule_config?.timezone || 'UTC'
            },
            execution_config: {
              template_id: job.execution_config?.template_id || job.template_id || '',
              category_id: job.execution_config?.category_id || job.category_id || ''
            },
            retry_policy: job.retry_policy || {
              max_retries: 3,
              retry_delay_minutes: 5,
              backoff_multiplier: 2,
              max_retry_delay_minutes: 60,
              retry_on_failure_types: ['network_error', 'timeout', 'server_error']
            }
          };
          
          console.log('Form data being set:', formDataToSet);
          console.log('Form execution_config:', formDataToSet.execution_config);
          console.log('Form template_id:', formDataToSet.execution_config.template_id);
          console.log('Form category_id:', formDataToSet.execution_config.category_id);
          setFormData(formDataToSet);
        } else {
          // Create mode - reset form
          setFormData({
            name: '',
            description: '',
            job_type: 'extraction',
            schedule_type: 'immediate',
            schedule_config: {
              cron: '',
              cron_expression: '', // For UI compatibility
              timezone: 'UTC'
            },
            execution_config: {
              template_id: '',
              category_id: ''
            },
            retry_policy: {
              max_retries: 3,
              retry_delay_minutes: 5,
              backoff_multiplier: 2,
              max_retry_delay_minutes: 60,
              retry_on_failure_types: ['network_error', 'timeout', 'server_error']
            }
          });
        }
        setError(null);
      };
      
      initializeModal();
    }
  }, [isOpen, job]);

  const loadCategoriesAndGetData = async (): Promise<any[]> => {
    try {
      const categoryService = serviceFactory.get<CategoryService>('categories');
      const response = await categoryService.getCategories();
      console.log('Categories API response:', response);
      console.log('Categories array:', response.categories);
      return response.categories || [];
    } catch (err) {
      console.error('Failed to load categories:', err);
      return [];
    }
  };

  const loadTemplatesAndGetData = async (): Promise<any[]> => {
    try {
      const templateService = serviceFactory.get<TemplateService>('templates');
      const response = await templateService.getTemplates({ page: 1, per_page: 100 });
      console.log('Templates API response:', response);
      console.log('Templates array:', response.templates);
      return response.templates || [];
    } catch (err) {
      console.error('Failed to load templates:', err);
      return [];
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExecutionConfigChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      execution_config: {
        ...prev.execution_config,
        [field]: value
      }
    }));
  };

  const handleRetryPolicyChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      retry_policy: {
        max_retries: prev.retry_policy?.max_retries || 3,
        retry_delay_minutes: prev.retry_policy?.retry_delay_minutes || 5,
        backoff_multiplier: prev.retry_policy?.backoff_multiplier || 2,
        max_retry_delay_minutes: prev.retry_policy?.max_retry_delay_minutes || 60,
        retry_on_failure_types: prev.retry_policy?.retry_on_failure_types || ['network_error', 'timeout', 'server_error'],
        [field]: value
      }
    }));
  };

  const handleScheduleTypeChange = (scheduleType: 'immediate' | 'scheduled' | 'recurring') => {
    setFormData(prev => ({
      ...prev,
      schedule_type: scheduleType,
      schedule_config: {
        cron: scheduleType === 'recurring' ? (prev.schedule_config.cron || prev.schedule_config.cron_expression) : '',
        cron_expression: scheduleType === 'recurring' ? (prev.schedule_config.cron || prev.schedule_config.cron_expression) : '', // For UI compatibility
        timezone: prev.schedule_config.timezone || 'UTC'
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.execution_config?.template_id || !formData.execution_config?.category_id) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let savedJob: Job;
      
      if (job) {
        // Update existing job
        const updateData: JobUpdateRequest = {
          name: formData.name,
          description: formData.description,
          schedule_type: formData.schedule_type,
          schedule_config: formData.schedule_config,
          execution_config: formData.execution_config,
          retry_policy: formData.retry_policy
        };
        
        const jobService = serviceFactory.get<JobService>('jobs');
        savedJob = await jobService.updateJob(job.id, updateData);
      } else {
        // Create new job
        const jobService = serviceFactory.get<JobService>('jobs');
        savedJob = await jobService.createJob(formData);
      }

      onSave(savedJob);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save job');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            {job ? 'Edit Job' : 'Create New Job'}
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          {error && <ErrorMessage>{error}</ErrorMessage>}

          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <FormGrid>
              <FormGroup>
                <FormLabel>Job Name *</FormLabel>
                <FormInput
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter job name"
                  required
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>Category *</FormLabel>
                <Dropdown
                  value={formData.execution_config?.category_id || ''}
                  onChange={(value) => handleExecutionConfigChange('category_id', value)}
                  options={[
                    { value: '', label: 'Select category' },
                    ...categories.map(cat => ({
                      value: cat.id,
                      label: cat.name
                    }))
                  ]}
                  placeholder="Select category"
                />
              </FormGroup>
            </FormGrid>

            <FormGroup style={{ marginBottom: '24px' }}>
              <FormLabel>Description</FormLabel>
              <FormTextarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter job description"
              />
            </FormGroup>

            <FormGroup style={{ marginBottom: '24px' }}>
              <FormLabel>Template *</FormLabel>
              <Dropdown
                value={formData.execution_config?.template_id || ''}
                onChange={(value) => handleExecutionConfigChange('template_id', value)}
                options={[
                  { value: '', label: 'Select template' },
                  ...templates.map(tpl => ({
                    value: tpl.id,
                    label: tpl.name
                  }))
                ]}
                placeholder="Select template"
              />
            </FormGroup>

            {/* Schedule Configuration */}
            <ScheduleSection>
              <ScheduleTitle>
                <Clock size={20} />
                Schedule Configuration
              </ScheduleTitle>

              <ScheduleTypeGrid>
                <ScheduleTypeOption
                  selected={formData.schedule_type === 'immediate'}
                  onClick={() => handleScheduleTypeChange('immediate')}
                >
                  <ScheduleTypeIcon>
                    <Clock size={16} />
                  </ScheduleTypeIcon>
                  <ScheduleTypeLabel>Immediate</ScheduleTypeLabel>
                  <ScheduleTypeDescription>
                    Run once immediately
                  </ScheduleTypeDescription>
                </ScheduleTypeOption>

                <ScheduleTypeOption
                  selected={formData.schedule_type === 'scheduled'}
                  onClick={() => handleScheduleTypeChange('scheduled')}
                >
                  <ScheduleTypeIcon>
                    <Calendar size={16} />
                  </ScheduleTypeIcon>
                  <ScheduleTypeLabel>Scheduled</ScheduleTypeLabel>
                  <ScheduleTypeDescription>
                    Run at a specific time
                  </ScheduleTypeDescription>
                </ScheduleTypeOption>

                <ScheduleTypeOption
                  selected={formData.schedule_type === 'recurring'}
                  onClick={() => handleScheduleTypeChange('recurring')}
                >
                  <ScheduleTypeIcon>
                    <Repeat size={16} />
                  </ScheduleTypeIcon>
                  <ScheduleTypeLabel>Recurring</ScheduleTypeLabel>
                  <ScheduleTypeDescription>
                    Run on a schedule
                  </ScheduleTypeDescription>
                </ScheduleTypeOption>
              </ScheduleTypeGrid>


              {formData.schedule_type === 'recurring' && (
                <FormGroup>
                  <CronBuilder
                    value={formData.schedule_config?.cron || formData.schedule_config?.cron_expression || '0 9 * * *'}
                    onChange={(cronExpression) => handleInputChange('schedule_config', {
                      ...formData.schedule_config,
                      cron: cronExpression,
                      cron_expression: cronExpression, // Keep for UI compatibility
                      timezone: formData.schedule_config?.timezone || 'UTC'
                    })}
                  />
                </FormGroup>
              )}
            </ScheduleSection>

            {/* Advanced Settings */}
            <AdvancedSection>
              <AdvancedTitle>
                <Settings size={20} />
                Advanced Settings
              </AdvancedTitle>

              <AdvancedGrid>


                <FormGroup>
                  <FormLabel>Max Retries</FormLabel>
                  <FormInput
                    type="number"
                    min="0"
                    max="10"
                    value={formData.retry_policy?.max_retries || 0}
                    onChange={(e) => handleRetryPolicyChange('max_retries', parseInt(e.target.value))}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>Retry Delay (minutes)</FormLabel>
                  <FormInput
                    type="number"
                    min="1"
                    max="60"
                    value={formData.retry_policy?.retry_delay_minutes || 1}
                    onChange={(e) => handleRetryPolicyChange('retry_delay_minutes', parseInt(e.target.value))}
                  />
                </FormGroup>
              </AdvancedGrid>

              <FormGroup style={{ marginTop: '16px' }}>
              </FormGroup>
            </AdvancedSection>

            <ModalFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={loading}>
                {job ? 'Update Job' : 'Create Job'}
              </Button>
            </ModalFooter>
          </form>
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};

export default JobModal;
