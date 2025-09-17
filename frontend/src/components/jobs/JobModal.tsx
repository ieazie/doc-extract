/**
 * Job Creation/Edit Modal Component
 * Phase 10.4: Frontend Job Management
 */
import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Repeat, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { CronBuilder } from './CronBuilder';
import { apiClient, ExtractionJob, ExtractionJobCreate, ExtractionJobUpdate, Category } from '@/services/api';
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
  onSave: (job: ExtractionJob) => void;
  job?: ExtractionJob | null;
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
  const [formData, setFormData] = useState<ExtractionJobCreate>({
    name: '',
    description: '',
    category_id: '',
    template_id: '',
    schedule_type: 'immediate',
    priority: 5,
    max_concurrency: 5,
    retry_policy: {
      max_retries: 3,
      retry_delay_minutes: 5
    },
    is_active: true
  });

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCategories();
      loadTemplates();
      
      if (job) {
        // Edit mode - populate form with job data
        setFormData({
          name: job.name,
          description: job.description || '',
          category_id: job.category_id,
          template_id: job.template_id,
          schedule_type: job.schedule_type,
          run_at: job.run_at || undefined,
          schedule_config: job.schedule_config || undefined,
          priority: job.priority,
          max_concurrency: job.max_concurrency,
          retry_policy: job.retry_policy,
          is_active: job.is_active
        });
      } else {
        // Create mode - reset form
        setFormData({
          name: '',
          description: '',
          category_id: '',
          template_id: '',
          schedule_type: 'immediate',
          priority: 5,
          max_concurrency: 5,
          retry_policy: {
            max_retries: 3,
            retry_delay_minutes: 5
          },
          is_active: true
        });
      }
      setError(null);
    }
  }, [isOpen, job]);

  const loadCategories = async () => {
    try {
      const response = await apiClient.getCategories();
      setCategories(response.categories);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await apiClient.getTemplates(1, 100);
      setTemplates(response.templates);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleScheduleTypeChange = (scheduleType: 'immediate' | 'scheduled' | 'recurring') => {
    setFormData(prev => ({
      ...prev,
      schedule_type: scheduleType,
      run_at: scheduleType === 'scheduled' ? prev.run_at : undefined,
      schedule_config: scheduleType === 'recurring' ? prev.schedule_config : undefined
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.category_id || !formData.template_id) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let savedJob: ExtractionJob;
      
      if (job) {
        // Update existing job
        const updateData: ExtractionJobUpdate = {
          name: formData.name,
          description: formData.description,
          schedule_type: formData.schedule_type,
          run_at: formData.run_at,
          schedule_config: formData.schedule_config,
          priority: formData.priority,
          max_concurrency: formData.max_concurrency,
          retry_policy: formData.retry_policy,
          is_active: formData.is_active
        };
        
        savedJob = await apiClient.updateJob(job.id, updateData);
      } else {
        // Create new job
        savedJob = await apiClient.createJob(formData);
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
                  value={formData.category_id}
                  onChange={(value) => handleInputChange('category_id', value)}
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
                value={formData.template_id}
                onChange={(value) => handleInputChange('template_id', value)}
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

              {formData.schedule_type === 'scheduled' && (
                <FormGroup>
                  <FormLabel>Run At</FormLabel>
                  <FormInput
                    type="datetime-local"
                    value={formData.run_at ? new Date(formData.run_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => handleInputChange('run_at', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                  />
                </FormGroup>
              )}

              {formData.schedule_type === 'recurring' && (
                <FormGroup>
                  <CronBuilder
                    value={formData.schedule_config?.cron || '0 9 * * *'}
                    onChange={(cronExpression) => handleInputChange('schedule_config', {
                      ...formData.schedule_config,
                      cron: cronExpression,
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
                  <FormLabel>Priority (1-10)</FormLabel>
                  <FormInput
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority || 5}
                    onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>Max Concurrency</FormLabel>
                  <FormInput
                    type="number"
                    min="1"
                    max="20"
                    value={formData.max_concurrency || 5}
                    onChange={(e) => handleInputChange('max_concurrency', parseInt(e.target.value))}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>Max Retries</FormLabel>
                  <FormInput
                    type="number"
                    min="0"
                    max="10"
                    value={formData.retry_policy?.max_retries || 0}
                    onChange={(e) => handleInputChange('retry_policy', {
                      ...formData.retry_policy,
                      max_retries: parseInt(e.target.value)
                    })}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>Retry Delay (minutes)</FormLabel>
                  <FormInput
                    type="number"
                    min="1"
                    max="60"
                    value={formData.retry_policy?.retry_delay_minutes || 1}
                    onChange={(e) => handleInputChange('retry_policy', {
                      ...formData.retry_policy,
                      retry_delay_minutes: parseInt(e.target.value)
                    })}
                  />
                </FormGroup>
              </AdvancedGrid>

              <FormGroup style={{ marginTop: '16px' }}>
                <ToggleContainer>
                  <ToggleLabel>
                    <Settings size={16} color="#6b7280" />
                    <span>Active (job will be scheduled and can be executed)</span>
                  </ToggleLabel>
                  <HiddenCheckbox
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  />
                  <ToggleSwitch 
                    $active={!!formData.is_active}
                    onClick={() => handleInputChange('is_active', !formData.is_active)}
                  />
                </ToggleContainer>
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
