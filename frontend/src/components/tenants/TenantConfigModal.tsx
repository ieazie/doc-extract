import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Settings, 
  Cpu, 
  Shield, 
  CheckCircle, 
  XCircle,
  Save,
  TestTube,
  RefreshCw,
  X,
  AlertCircle
} from 'lucide-react';
import { TenantService, HealthService, serviceFactory, LLMConfig, RateLimitsConfig, TenantLLMConfigs, Tenant } from '@/services/api/index';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorMessage from '@/components/common/ErrorMessage';
import SuccessMessage from '@/components/common/SuccessMessage';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${props => props.theme.zIndex.modal};
`;

const ModalContent = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 8px;
  width: 95%;
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2rem 2rem 1rem 2rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const ModalTitle = styled.h1`
  font-size: 1.875rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.text.secondary};
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  
  &:hover {
    background: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text.primary};
  }
`;

const TabNavigation = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  margin: 0 2rem;
`;

const TabButton = styled.button<{ $isActive: boolean }>`
  background: none;
  border: none;
  padding: 1rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.$isActive ? props.theme.colors.primary : props.theme.colors.text.secondary};
  cursor: pointer;
  border-bottom: 2px solid ${props => props.$isActive ? props.theme.colors.primary : 'transparent'};
  transition: all 0.2s ease;
  
  &:hover {
    color: ${props => props.theme.colors.text.primary};
  }
`;

const ModalBody = styled.div`
  padding: 2rem;
`;

const SectionCard = styled.div`
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const InfoLabel = styled.span`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text.secondary};
  font-weight: 500;
`;

const InfoValue = styled.span`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text.primary};
  font-weight: 500;
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`;

const StatusBadge = styled.div<{ $status: 'healthy' | 'unhealthy' | 'unknown' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  
  ${props => {
    switch (props.$status) {
      case 'healthy':
        return `
          background: ${props.theme.colors.success}15;
          color: ${props.theme.colors.success};
        `;
      case 'unhealthy':
        return `
          background: ${props.theme.colors.error}15;
          color: ${props.theme.colors.error};
        `;
      default:
        return `
          background: ${props.theme.colors.warning}15;
          color: ${props.theme.colors.warning};
        `;
    }
  }}
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 500;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 0.5rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  font-size: 0.875rem;
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text.primary};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  font-size: 0.875rem;
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text.primary};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20;
  }
`;

const NumberInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  font-size: 0.875rem;
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text.primary};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

const ContextualMessage = styled.div<{ $type: 'success' | 'error' }>`
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  ${props => props.$type === 'success' ? `
    background: ${props.theme.colors.success}15;
    color: ${props.theme.colors.success};
    border: 1px solid ${props.theme.colors.success}30;
  ` : `
    background: ${props.theme.colors.error}15;
    color: ${props.theme.colors.error};
    border: 1px solid ${props.theme.colors.error}30;
  `}
`;

const TestButton = styled(Button)`
  min-width: 200px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

interface TenantConfigModalProps {
  tenant: Tenant | null;
  onClose: () => void;
}

export default function TenantConfigModal({ tenant, onClose }: TenantConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'general' | 'llm' | 'rate-limits'>('overview');
  const [fieldExtractionConfig, setFieldExtractionConfig] = useState<LLMConfig | null>(null);
  const [documentExtractionConfig, setDocumentExtractionConfig] = useState<LLMConfig | null>(null);
  const [rateLimitsConfig, setRateLimitsConfig] = useState<RateLimitsConfig | null>(null);
  const [availableModels, setAvailableModels] = useState<{[provider: string]: string[]}>({});
  const [llmHealth, setLlmHealth] = useState<{ healthy: boolean; error?: string } | null>(null);
  const [documentLlmHealth, setDocumentLlmHealth] = useState<{ healthy: boolean; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingField, setTestingField] = useState(false);
  const [testingDocument, setTestingDocument] = useState(false);
  const [fieldExtractionMessage, setFieldExtractionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [documentExtractionMessage, setDocumentExtractionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Tenant editing state
  const [editingTenant, setEditingTenant] = useState<{
    name: string;
    environment: string;
    status: string;
    max_documents: number;
    max_templates: number;
  } | null>(null);

  const loadAvailableModels = async (provider: string) => {
    try {
      console.log(`Loading models for provider: ${provider}`);
      const tenantService = serviceFactory.get<TenantService>('tenants');
      const response = await tenantService.getAvailableModels();
      const providerResponse = response.find(r => r.provider === provider);
      if (!providerResponse) {
        console.warn(`No models found for provider: ${provider}`);
        return;
      }
      console.log(`Loaded models for ${provider}:`, providerResponse.models);
      
      // Clean and filter the models to ensure we have complete, valid names
      const cleanedModels = providerResponse.models
        .filter(model => model && model.trim().length > 0) // Remove empty/invalid models
        .map(model => model.trim())
        .filter((model, index, arr) => arr.indexOf(model) === index); // Remove duplicates
      
      setAvailableModels(prev => ({
        ...prev,
        [provider]: cleanedModels
      }));
      return cleanedModels;
    } catch (err) {
      console.error(`Error loading models for ${provider}:`, err);
      // Set fallback models
      const fallbackModels = getFallbackModels(provider);
      setAvailableModels(prev => ({
        ...prev,
        [provider]: fallbackModels
      }));
      return fallbackModels;
    }
  };

  const getFallbackModels = (provider: string): string[] => {
    // Simple fallback for when API fails - just return empty array
    // The API should always work now with the backend fix
    console.warn(`Using fallback models for ${provider} - API call failed`);
    return [];
  };

  const loadConfigurations = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // For now, we'll use the current user's tenant config endpoint
      // In a real implementation, you'd have admin endpoints to get config for any tenant
      const tenantService = serviceFactory.get<TenantService>('tenants');
      const summary = await tenantService.getTenantConfigSummary();
      // Handle both old single config and new dual config structure
      if (summary.llm_config) {
        if (summary.llm_config.field_extraction && summary.llm_config.document_extraction) {
          // Ensure we have proper default models if they're missing
          const fieldConfig = {
            ...summary.llm_config.field_extraction,
            model_name: summary.llm_config.field_extraction.model_name || 'gpt-4o'
          };
          const documentConfig = {
            ...summary.llm_config.document_extraction,
            model_name: summary.llm_config.document_extraction.model_name || 'gemma2:2b'
          };
          
          setFieldExtractionConfig(fieldConfig);
          setDocumentExtractionConfig(documentConfig);
          
          // Load models for existing configurations
          await loadAvailableModels(fieldConfig.provider);
          await loadAvailableModels(documentConfig.provider);
          
          
        } else {
          // Migrate old single config to new structure
          setFieldExtractionConfig({
            provider: 'openai',
            model_name: 'gpt-4o',
            max_tokens: 4000,
            temperature: 0.1,
            api_key: ''
          });
          setDocumentExtractionConfig({
            provider: 'ollama',
            model_name: 'gemma2:2b',
            max_tokens: 4000,
            temperature: 0.1,
            ollama_config: {
              host: 'http://ollama:11434'
            }
          });
          
          // Load models for migrated configurations
          await loadAvailableModels('openai');
          await loadAvailableModels('ollama');
          
        }
      } else {
          // Set default configurations - create them automatically
          const defaultFieldConfig: LLMConfig = {
            provider: 'openai',
            model_name: 'gpt-4o',
            max_tokens: 4000,
            temperature: 0.1,
            api_key: ''
          };
          
          const defaultDocumentConfig: LLMConfig = {
            provider: 'ollama',
            model_name: 'gemma2:2b',
            max_tokens: 4000,
            temperature: 0.1,
            ollama_config: {
              host: 'http://ollama:11434'
            }
          };
          
          setFieldExtractionConfig(defaultFieldConfig);
          setDocumentExtractionConfig(defaultDocumentConfig);
          
          // Load models for default configurations
          await loadAvailableModels('openai');
          await loadAvailableModels('ollama');
          
        
        // Automatically save the default configurations
        try {
          const llmConfigs: TenantLLMConfigs = {
            field_extraction: defaultFieldConfig,
            document_extraction: defaultDocumentConfig
          };
          
          const tenantService = serviceFactory.get<TenantService>('tenants');
          await tenantService.createTenantConfiguration({
            tenant_id: tenant.id,
            config_type: 'llm',
            config_data: llmConfigs,
            is_active: true
          });
          
          console.log('Default LLM configurations created and saved');
        } catch (err) {
          console.error('Failed to save default configurations:', err);
        }
      }
      setRateLimitsConfig(summary.rate_limits || null);
      
      // Check LLM health for both configurations
      if (summary.llm_config) {
        // Check Field Extraction health
        const fieldHasApiKey = summary.llm_config.field_extraction?.api_key || 
                              summary.llm_config.field_extraction?.provider === 'ollama';
        
        if (fieldHasApiKey) {
          try {
            const healthService = serviceFactory.get<HealthService>('health');
            const health = await healthService.checkLLMHealth({ config_type: 'field_extraction' });
            setLlmHealth({ healthy: health.healthy, error: health.error });
          } catch (err) {
            setLlmHealth({ healthy: false, error: 'Failed to check health' });
          }
        } else {
          setLlmHealth({ healthy: false, error: 'API key required' });
        }

        // Check Document Extraction health
        const documentHasApiKey = summary.llm_config.document_extraction?.api_key || 
                                 summary.llm_config.document_extraction?.provider === 'ollama';
        
        if (documentHasApiKey) {
          try {
            const healthService = serviceFactory.get<HealthService>('health');
            const health = await healthService.checkLLMHealth({ config_type: 'document_extraction' });
            setDocumentLlmHealth({ healthy: health.healthy, error: health.error });
          } catch (err) {
            setDocumentLlmHealth({ healthy: false, error: 'Failed to check health' });
          }
        } else {
          setDocumentLlmHealth({ healthy: false, error: 'API key required' });
        }
      }
    } catch (err) {
      setError('Failed to load configurations');
      console.error('Error loading configurations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenant) {
      loadConfigurations();
      // Initialize editing state
      setEditingTenant({
        name: tenant.name,
        environment: tenant.environment,
        status: tenant.status,
        max_documents: tenant.settings?.max_documents || 1000,
        max_templates: tenant.settings?.max_templates || 50
      });
    }
  }, [tenant]);

  // Clear messages when switching tabs
  useEffect(() => {
    setFieldExtractionMessage(null);
    setDocumentExtractionMessage(null);
    setError(null);
    setSuccess(null);
  }, [activeTab]);

  // Load models for default providers when component mounts
  useEffect(() => {
    if (tenant) {
      // Load models for all providers
      loadAvailableModels('openai');
      loadAvailableModels('ollama');
      loadAvailableModels('anthropic');
    }
  }, [tenant]);

  // Load models when field extraction provider changes
  useEffect(() => {
    if (fieldExtractionConfig?.provider) {
      loadAvailableModels(fieldExtractionConfig.provider);
    }
  }, [fieldExtractionConfig?.provider]);

  // Load models when document extraction provider changes
  useEffect(() => {
    if (documentExtractionConfig?.provider) {
      loadAvailableModels(documentExtractionConfig.provider);
    }
  }, [documentExtractionConfig?.provider]);

  const handleSaveFieldExtractionConfig = async () => {
    if (!fieldExtractionConfig) return;
    
    try {
      setSaving(true);
      setFieldExtractionMessage(null);
      
      // Get current document extraction config or create default
      const currentDocumentConfig = documentExtractionConfig || {
        provider: 'ollama' as const,
        model_name: 'gemma2:2b',
        max_tokens: 4000,
        temperature: 0.1,
        ollama_config: { host: 'http://ollama:11434' }
      };
      
      // Create the dual configuration structure
      const llmConfigs: TenantLLMConfigs = {
        field_extraction: fieldExtractionConfig,
        document_extraction: currentDocumentConfig
      };
      
      if (!tenant) {
        console.error('No tenant available');
        return;
      }
      
      const tenantService = serviceFactory.get<TenantService>('tenants');
      await tenantService.createTenantConfiguration({
        tenant_id: tenant.id,
        config_type: 'llm',
        config_data: llmConfigs,
        is_active: true
      });
      
      setFieldExtractionMessage({ type: 'success', text: 'Field Extraction configuration saved successfully' });
      
      // Check health after saving if we have API key
      if (fieldExtractionConfig.api_key || fieldExtractionConfig.provider === 'ollama') {
        try {
          const healthService = serviceFactory.get<HealthService>('health');
          const health = await healthService.checkLLMHealth({ config_type: 'field_extraction' });
          setLlmHealth({ healthy: health.healthy, error: health.error });
        } catch (err) {
          setLlmHealth({ healthy: false, error: 'Failed to check health' });
        }
      } else {
        setLlmHealth({ healthy: false, error: 'API key required' });
      }
    } catch (err) {
      setFieldExtractionMessage({ type: 'error', text: 'Failed to save Field Extraction configuration' });
      console.error('Error saving field extraction config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDocumentExtractionConfig = async () => {
    if (!documentExtractionConfig) return;
    
    try {
      setSaving(true);
      setDocumentExtractionMessage(null);
      
      // Get current field extraction config or create default
      const currentFieldConfig = fieldExtractionConfig || {
        provider: 'openai' as const,
        model_name: 'gpt-4o',
        max_tokens: 4000,
        temperature: 0.1,
        api_key: ''
      };
      
      // Create the dual configuration structure
      const llmConfigs: TenantLLMConfigs = {
        field_extraction: currentFieldConfig,
        document_extraction: documentExtractionConfig
      };
      
      if (!tenant) {
        setError('No tenant selected');
        return;
      }
      
      const tenantService = serviceFactory.get<TenantService>('tenants');
      await tenantService.createTenantConfiguration({
        tenant_id: tenant.id,
        config_type: 'llm',
        config_data: llmConfigs,
        is_active: true
      });
      
      // Check health after saving if we have API key or using Ollama
      if (documentExtractionConfig.api_key || documentExtractionConfig.provider === 'ollama') {
        try {
          const healthService = serviceFactory.get<HealthService>('health');
          const health = await healthService.checkLLMHealth({ config_type: 'document_extraction' });
          setDocumentLlmHealth({ healthy: health.healthy, error: health.error });
        } catch (err) {
          setDocumentLlmHealth({ healthy: false, error: 'Failed to check health' });
        }
      }
      
      setDocumentExtractionMessage({ type: 'success', text: 'Document Extraction configuration saved successfully' });
    } catch (err) {
      setDocumentExtractionMessage({ type: 'error', text: 'Failed to save Document Extraction configuration' });
      console.error('Error saving document extraction config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRateLimits = async () => {
    if (!rateLimitsConfig) return;
    
    try {
      setSaving(true);
      setError(null);
      
      if (!tenant) {
        setError('No tenant selected');
        return;
      }
      
      const tenantService = serviceFactory.get<TenantService>('tenants');
      await tenantService.createTenantConfiguration({
        tenant_id: tenant.id,
        config_type: 'rate_limits',
        config_data: rateLimitsConfig,
        is_active: true
      });
      
      setSuccess('Rate limits configuration saved successfully');
    } catch (err) {
      setError('Failed to save rate limits configuration');
      console.error('Error saving rate limits:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTestFieldExtractionLLM = async () => {
    if (!fieldExtractionConfig) {
      setFieldExtractionMessage({ type: 'error', text: 'No Field Extraction configuration found' });
      return;
    }
    
    // Check if API key is required but missing
    if ((fieldExtractionConfig.provider === 'openai' || fieldExtractionConfig.provider === 'anthropic') && !fieldExtractionConfig.api_key) {
      setFieldExtractionMessage({ type: 'error', text: `Field Extraction LLM test failed: API key is required for ${fieldExtractionConfig.provider} but not provided` });
      return;
    }
    
    try {
      setTestingField(true);
      setFieldExtractionMessage(null);
      
      const healthService = serviceFactory.get<HealthService>('health');
      const testResult = await healthService.testLLMExtraction({
        config_type: 'field_extraction',
        document_text: "Invoice #12345 dated 2024-01-15 for $1,500.00",
        schema: {
          invoice_number: { type: "string" },
          date: { type: "string" },
          amount: { type: "number" }
        },
        prompt_config: {
          system_prompt: `Extract structured data from the document using ${fieldExtractionConfig.provider} ${fieldExtractionConfig.model_name}.`
        }
      });
      
      setFieldExtractionMessage({ type: 'success', text: 'Field Extraction LLM test completed successfully' });
      console.log('Field extraction test result:', testResult);
    } catch (err) {
      setFieldExtractionMessage({ type: 'error', text: `Field Extraction LLM test failed: ${err}` });
      console.error('Error testing field extraction LLM:', err);
    } finally {
      setTestingField(false);
    }
  };

  const handleTestDocumentExtractionLLM = async () => {
    if (!documentExtractionConfig) {
      setDocumentExtractionMessage({ type: 'error', text: 'No Document Extraction configuration found' });
      return;
    }
    
    // Check if API key is required but missing
    if ((documentExtractionConfig.provider === 'openai' || documentExtractionConfig.provider === 'anthropic') && !documentExtractionConfig.api_key) {
      setDocumentExtractionMessage({ type: 'error', text: `Document Extraction LLM test failed: API key is required for ${documentExtractionConfig.provider} but not provided` });
      return;
    }
    
    try {
      setTestingDocument(true);
      setDocumentExtractionMessage(null);
      
      const healthService = serviceFactory.get<HealthService>('health');
      const testResult = await healthService.testLLMExtraction({
        config_type: 'document_extraction',
        document_text: "Invoice #12345 dated 2024-01-15 for $1,500.00",
        schema: {
          invoice_number: { type: "string" },
          date: { type: "string" },
          amount: { type: "number" }
        },
        prompt_config: {
          system_prompt: `Extract structured data from the document using ${documentExtractionConfig.provider} ${documentExtractionConfig.model_name}.`
        }
      });
      
      setDocumentExtractionMessage({ type: 'success', text: 'Document Extraction LLM test completed successfully' });
      console.log('Document extraction test result:', testResult);
      
      // Update health status on successful test
      setDocumentLlmHealth({ healthy: true });
    } catch (err) {
      setDocumentExtractionMessage({ type: 'error', text: `Document Extraction LLM test failed: ${err}` });
      console.error('Error testing document extraction LLM:', err);
      
      // Update health status on failed test
      setDocumentLlmHealth({ healthy: false, error: 'Test failed' });
    } finally {
      setTestingDocument(false);
    }
  };

  const handleResetRateLimits = async () => {
    try {
      const healthService = serviceFactory.get<HealthService>('health');
      await healthService.resetRateLimits();
      setSuccess('Rate limits reset successfully');
      loadConfigurations();
    } catch (err) {
      setError('Failed to reset rate limits');
      console.error('Error resetting rate limits:', err);
    }
  };

  const handleUpdateTenant = async () => {
    if (!tenant || !editingTenant) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const tenantService = serviceFactory.get<TenantService>('tenants');
      await tenantService.updateTenant(tenant.id, {
        name: editingTenant.name,
        status: editingTenant.status,
        settings: {
          max_documents: editingTenant.max_documents,
          max_templates: editingTenant.max_templates
        }
      });
      
      setSuccess('Tenant updated successfully');
      onClose(); // Close modal to refresh the table
    } catch (err) {
      setError('Failed to update tenant');
      console.error('Error updating tenant:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!tenant) return null;

  const renderOverviewTab = () => (
    <>
      <SectionCard>
        <SectionHeader>
          <SectionTitle>Tenant Information</SectionTitle>
        </SectionHeader>
        <InfoGrid>
          <InfoItem>
            <InfoLabel>Tenant Name</InfoLabel>
            <InfoValue>{tenant?.name}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Environment</InfoLabel>
            <InfoValue>{tenant?.environment}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Status</InfoLabel>
            <InfoValue>{tenant?.status}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Created</InfoLabel>
            <InfoValue>{tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString() : 'N/A'}</InfoValue>
          </InfoItem>
        </InfoGrid>
      </SectionCard>
    </>
  );

  const renderGeneralTab = () => (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>General Settings</SectionTitle>
      </SectionHeader>

      <SettingsGrid>
        <FormGroup>
          <Label>Tenant Name</Label>
          <Input
            value={editingTenant?.name || ''}
            onChange={(e) => setEditingTenant({
              ...editingTenant!,
              name: e.target.value
            })}
            placeholder="Enter tenant name"
          />
        </FormGroup>

        <FormGroup>
          <Label>Environment</Label>
          <Dropdown
            options={[
              { value: 'development', label: 'Development' },
              { value: 'staging', label: 'Staging' },
              { value: 'production', label: 'Production' }
            ]}
            value={editingTenant?.environment || 'development'}
            onChange={(environment) => {
              if (editingTenant) {
                setEditingTenant({
                  ...editingTenant,
                  environment
                });
              }
            }}
          />
        </FormGroup>

        <FormGroup>
          <Label>Status</Label>
          <Dropdown
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'suspended', label: 'Suspended' }
            ]}
            value={editingTenant?.status || 'active'}
            onChange={(status) => {
              if (editingTenant) {
                setEditingTenant({
                  ...editingTenant,
                  status
                });
              }
            }}
          />
        </FormGroup>

        <FormGroup>
          <Label>Max Documents</Label>
          <NumberInput
            type="number"
            value={editingTenant?.max_documents || 1000}
            onChange={(e) => setEditingTenant({
              ...editingTenant!,
              max_documents: parseInt(e.target.value) || 1000
            })}
            min="1"
          />
        </FormGroup>

        <FormGroup>
          <Label>Max Templates</Label>
          <NumberInput
            type="number"
            value={editingTenant?.max_templates || 50}
            onChange={(e) => setEditingTenant({
              ...editingTenant!,
              max_templates: parseInt(e.target.value) || 50
            })}
            min="1"
          />
        </FormGroup>
      </SettingsGrid>

      <ButtonGroup style={{ marginTop: '1.5rem' }}>
        <Button
          onClick={handleUpdateTenant}
          disabled={saving || !editingTenant}
          size="medium"
        >
          {saving ? <LoadingSpinner size={16} /> : <Save size={16} />}
          Save Changes
        </Button>
      </ButtonGroup>
    </SectionCard>
  );

  const renderLLMTab = () => (
    <>
      {/* Field Extraction Configuration */}
      <SectionCard>
        <SectionHeader>
          <SectionTitle>Field Extraction Configuration</SectionTitle>
          <StatusBadge $status={
            llmHealth?.healthy === true ? 'healthy' : 
            llmHealth?.error === 'API key required' ? 'unknown' : 
            'unhealthy'
          }>
            {llmHealth?.healthy === true ? <CheckCircle size={16} /> : 
             llmHealth?.error === 'API key required' ? <AlertCircle size={16} /> :
             <XCircle size={16} />}
            {llmHealth?.healthy === true ? 'Healthy' : 
             llmHealth?.error === 'API key required' ? 'API Key Required' :
             'Unhealthy'}
          </StatusBadge>
        </SectionHeader>

      <SettingsGrid>
        <FormGroup>
          <Label>Provider</Label>
          <Dropdown
            options={[
              { value: 'openai', label: 'OpenAI' },
              { value: 'anthropic', label: 'Anthropic (Claude)' },
              { value: 'ollama', label: 'Ollama (Local)' }
            ]}
            value={fieldExtractionConfig?.provider || 'openai'}
            onChange={async (provider) => {
              const newConfig: LLMConfig = {
                provider: provider as 'ollama' | 'openai' | 'anthropic' | 'custom',
                model_name: provider === 'openai' ? 'gpt-4o' : provider === 'ollama' ? 'gemma2:2b' : 'claude-3-5-sonnet-20241022',
                max_tokens: fieldExtractionConfig?.max_tokens || 4000,
                temperature: fieldExtractionConfig?.temperature || 0.1,
                api_key: provider === 'openai' || provider === 'anthropic' ? (fieldExtractionConfig?.api_key || '') : undefined,
                ollama_config: provider === 'ollama' ? (fieldExtractionConfig?.ollama_config || { host: 'http://ollama:11434' }) : undefined
              };
              
              console.log('Setting field extraction config:', newConfig);
              setFieldExtractionConfig(newConfig);
              
              // Load available models for the provider
              await loadAvailableModels(provider);
            }}
          />
        </FormGroup>

        <FormGroup>
          <Label>Model</Label>
          <Dropdown
            options={[
              ...(availableModels[fieldExtractionConfig?.provider || ''] || []).map(model => ({
                value: model,
                label: model
              }))
            ]}
            value={fieldExtractionConfig?.model_name || 'gpt-4o'}
            onChange={(modelName) => {
              const newConfig: LLMConfig = {
                provider: fieldExtractionConfig?.provider || 'openai',
                model_name: modelName,
                max_tokens: fieldExtractionConfig?.max_tokens || 4000,
                temperature: fieldExtractionConfig?.temperature || 0.1,
                api_key: fieldExtractionConfig?.api_key,
                ollama_config: fieldExtractionConfig?.ollama_config
              };
              console.log('Setting field extraction model:', modelName, newConfig);
              setFieldExtractionConfig(newConfig);
            }}
          />
        </FormGroup>

        {fieldExtractionConfig?.provider === 'openai' && (
          <FormGroup>
            <Label>API Key</Label>
            <Input
              type="password"
              value={fieldExtractionConfig?.api_key || ''}
              onChange={(e) => setFieldExtractionConfig({
                ...fieldExtractionConfig,
                api_key: e.target.value
              })}
              placeholder="sk-..."
            />
            {!fieldExtractionConfig?.api_key && (
              <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                ⚠️ API key required for OpenAI. Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: '#f59e0b', textDecoration: 'underline' }}>OpenAI Platform</a>
              </div>
            )}
          </FormGroup>
        )}

        {fieldExtractionConfig?.provider === 'anthropic' && (
          <FormGroup>
            <Label>API Key</Label>
            <Input
              type="password"
              value={fieldExtractionConfig?.api_key || ''}
              onChange={(e) => setFieldExtractionConfig({
                ...fieldExtractionConfig,
                api_key: e.target.value
              })}
              placeholder="sk-ant-..."
            />
          </FormGroup>
        )}

        {fieldExtractionConfig?.provider === 'ollama' && (
          <FormGroup>
            <Label>Host</Label>
            <Input
              value={fieldExtractionConfig?.ollama_config?.host || 'http://ollama:11434'}
              onChange={(e) => setFieldExtractionConfig({
                ...fieldExtractionConfig,
                ollama_config: {
                  ...fieldExtractionConfig?.ollama_config,
                  host: e.target.value
                }
              })}
              placeholder="http://ollama:11434"
            />
          </FormGroup>
        )}

        <FormGroup>
          <Label>Max Tokens</Label>
          <NumberInput
            type="number"
            value={fieldExtractionConfig?.max_tokens || 4000}
            onChange={(e) => setFieldExtractionConfig({
              provider: fieldExtractionConfig?.provider || 'openai',
              model_name: fieldExtractionConfig?.model_name || 'gpt-4o',
              max_tokens: parseInt(e.target.value) || 4000,
              temperature: fieldExtractionConfig?.temperature || 0.1,
              ...fieldExtractionConfig
            })}
            min="100"
            max="32000"
          />
        </FormGroup>

        <FormGroup>
          <Label>Temperature</Label>
          <NumberInput
            type="number"
            step="0.1"
            value={fieldExtractionConfig?.temperature || 0.1}
            onChange={(e) => setFieldExtractionConfig({
              provider: fieldExtractionConfig?.provider || 'openai',
              model_name: fieldExtractionConfig?.model_name || 'gpt-4o',
              max_tokens: fieldExtractionConfig?.max_tokens || 4000,
              temperature: parseFloat(e.target.value) || 0.1,
              ...fieldExtractionConfig
            })}
            min="0"
            max="2"
          />
        </FormGroup>
      </SettingsGrid>

      {fieldExtractionMessage && (
        <ContextualMessage $type={fieldExtractionMessage.type}>
          {fieldExtractionMessage.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {fieldExtractionMessage.text}
        </ContextualMessage>
      )}

      <ButtonGroup style={{ marginTop: '1rem' }}>
        <TestButton
          onClick={handleTestFieldExtractionLLM}
          disabled={testingField || !fieldExtractionConfig}
          variant="secondary"
          size="medium"
        >
          {testingField ? <LoadingSpinner size={16} /> : <TestTube size={16} />}
          Test
        </TestButton>
        
        <Button
          onClick={handleSaveFieldExtractionConfig}
          disabled={saving || !fieldExtractionConfig}
          size="medium"
        >
          {saving ? <LoadingSpinner size={16} /> : <Save size={16} />}
          Save Changes
        </Button>
      </ButtonGroup>
    </SectionCard>

    {/* Document Extraction Configuration */}
    <SectionCard style={{ marginTop: '1.5rem' }}>
      <SectionHeader>
        <SectionTitle>Document Extraction Configuration</SectionTitle>
        <StatusBadge $status={
          documentLlmHealth?.healthy === true ? 'healthy' : 
          documentLlmHealth?.error === 'API key required' ? 'unknown' : 
          'unhealthy'
        }>
          {documentLlmHealth?.healthy === true ? <CheckCircle size={16} /> : 
           documentLlmHealth?.error === 'API key required' ? <AlertCircle size={16} /> :
           <XCircle size={16} />}
          {documentLlmHealth?.healthy === true ? 'Healthy' : 
           documentLlmHealth?.error === 'API key required' ? 'Default: Ollama' :
           'Unhealthy'}
        </StatusBadge>
      </SectionHeader>

      <SettingsGrid>
        <FormGroup>
          <Label>Provider</Label>
          <Dropdown
            options={[
              { value: 'ollama', label: 'Ollama (Default)' },
              { value: 'openai', label: 'OpenAI' },
              { value: 'anthropic', label: 'Anthropic (Claude)' }
            ]}
            value={documentExtractionConfig?.provider || 'ollama'}
            onChange={async (provider) => {
              const newConfig: LLMConfig = {
                provider: provider as 'ollama' | 'openai' | 'anthropic' | 'custom',
                model_name: provider === 'ollama' ? 'gemma2:2b' : provider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022',
                max_tokens: documentExtractionConfig?.max_tokens || 4000,
                temperature: documentExtractionConfig?.temperature || 0.1,
                api_key: provider === 'openai' || provider === 'anthropic' ? (documentExtractionConfig?.api_key || '') : undefined,
                ollama_config: provider === 'ollama' ? (documentExtractionConfig?.ollama_config || { host: 'http://ollama:11434' }) : undefined
              };
              
              console.log('Setting document extraction config:', newConfig);
              setDocumentExtractionConfig(newConfig);
              
              // Load available models for the provider
              await loadAvailableModels(provider);
            }}
          />
        </FormGroup>

        <FormGroup>
          <Label>Model</Label>
          <Dropdown
            options={[
              ...(availableModels[documentExtractionConfig?.provider || ''] || []).map(model => ({
                value: model,
                label: model
              }))
            ]}
            value={documentExtractionConfig?.model_name || 'gemma2:2b'}
            onChange={(modelName) => {
              const newConfig: LLMConfig = {
                provider: documentExtractionConfig?.provider || 'ollama',
                model_name: modelName,
                max_tokens: documentExtractionConfig?.max_tokens || 4000,
                temperature: documentExtractionConfig?.temperature || 0.1,
                api_key: documentExtractionConfig?.api_key,
                ollama_config: documentExtractionConfig?.ollama_config
              };
              console.log('Setting document extraction model:', modelName, newConfig);
              setDocumentExtractionConfig(newConfig);
            }}
          />
        </FormGroup>

        {documentExtractionConfig?.provider === 'openai' && (
          <FormGroup>
            <Label>API Key</Label>
            <Input
              type="password"
              value={documentExtractionConfig?.api_key || ''}
              onChange={(e) => setDocumentExtractionConfig({
                ...documentExtractionConfig,
                api_key: e.target.value
              })}
              placeholder="sk-..."
            />
          </FormGroup>
        )}

        {documentExtractionConfig?.provider === 'anthropic' && (
          <FormGroup>
            <Label>API Key</Label>
            <Input
              type="password"
              value={documentExtractionConfig?.api_key || ''}
              onChange={(e) => setDocumentExtractionConfig({
                ...documentExtractionConfig,
                api_key: e.target.value
              })}
              placeholder="sk-ant-..."
            />
          </FormGroup>
        )}

        {documentExtractionConfig?.provider === 'ollama' && (
          <FormGroup>
            <Label>Host</Label>
            <Input
              value={documentExtractionConfig?.ollama_config?.host || 'http://ollama:11434'}
              onChange={(e) => setDocumentExtractionConfig({
                ...documentExtractionConfig,
                ollama_config: {
                  ...documentExtractionConfig?.ollama_config,
                  host: e.target.value
                }
              })}
              placeholder="http://ollama:11434"
            />
          </FormGroup>
        )}

        <FormGroup>
          <Label>Max Tokens</Label>
          <NumberInput
            type="number"
            value={documentExtractionConfig?.max_tokens || 4000}
            onChange={(e) => setDocumentExtractionConfig({
              provider: documentExtractionConfig?.provider || 'ollama',
              model_name: documentExtractionConfig?.model_name || 'gemma2:2b',
              max_tokens: parseInt(e.target.value) || 4000,
              temperature: documentExtractionConfig?.temperature || 0.1,
              ...documentExtractionConfig
            })}
            min="100"
            max="32000"
          />
        </FormGroup>

        <FormGroup>
          <Label>Temperature</Label>
          <NumberInput
            type="number"
            step="0.1"
            value={documentExtractionConfig?.temperature || 0.1}
            onChange={(e) => setDocumentExtractionConfig({
              provider: documentExtractionConfig?.provider || 'ollama',
              model_name: documentExtractionConfig?.model_name || 'gemma2:2b',
              max_tokens: documentExtractionConfig?.max_tokens || 4000,
              temperature: parseFloat(e.target.value) || 0.1,
              ...documentExtractionConfig
            })}
            min="0"
            max="2"
          />
        </FormGroup>
      </SettingsGrid>

      {documentExtractionMessage && (
        <ContextualMessage $type={documentExtractionMessage.type}>
          {documentExtractionMessage.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {documentExtractionMessage.text}
        </ContextualMessage>
      )}

      <ButtonGroup style={{ marginTop: '1rem' }}>
        <TestButton
          onClick={handleTestDocumentExtractionLLM}
          disabled={testingDocument || !documentExtractionConfig}
          variant="secondary"
          size="medium"
        >
          {testingDocument ? <LoadingSpinner size={16} /> : <TestTube size={16} />}
          Test
        </TestButton>
        
        <Button
          onClick={handleSaveDocumentExtractionConfig}
          disabled={saving || !documentExtractionConfig}
          size="medium"
        >
          {saving ? <LoadingSpinner size={16} /> : <Save size={16} />}
          Save Changes
        </Button>
      </ButtonGroup>
    </SectionCard>
    </>
  );

  const renderRateLimitsTab = () => (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>Rate Limits Configuration</SectionTitle>
      </SectionHeader>

      <SettingsGrid>
        <FormGroup>
          <Label>API Requests per Minute</Label>
          <NumberInput
            type="number"
            value={rateLimitsConfig?.api_requests_per_minute || 100}
            onChange={(e) => setRateLimitsConfig({
              api_requests_per_minute: parseInt(e.target.value) || 100,
              api_requests_per_hour: rateLimitsConfig?.api_requests_per_hour || 1000,
              document_uploads_per_hour: rateLimitsConfig?.document_uploads_per_hour || 50,
              extractions_per_hour: rateLimitsConfig?.extractions_per_hour || 20,
              max_concurrent_extractions: rateLimitsConfig?.max_concurrent_extractions || 3,
              ...rateLimitsConfig
            })}
            min="1"
            max="1000"
          />
        </FormGroup>

        <FormGroup>
          <Label>API Requests per Hour</Label>
          <NumberInput
            type="number"
            value={rateLimitsConfig?.api_requests_per_hour || 1000}
            onChange={(e) => setRateLimitsConfig({
              api_requests_per_minute: rateLimitsConfig?.api_requests_per_minute || 100,
              api_requests_per_hour: parseInt(e.target.value) || 1000,
              document_uploads_per_hour: rateLimitsConfig?.document_uploads_per_hour || 50,
              extractions_per_hour: rateLimitsConfig?.extractions_per_hour || 20,
              max_concurrent_extractions: rateLimitsConfig?.max_concurrent_extractions || 3,
              ...rateLimitsConfig
            })}
            min="1"
            max="10000"
          />
        </FormGroup>

        <FormGroup>
          <Label>Document Uploads per Hour</Label>
          <NumberInput
            type="number"
            value={rateLimitsConfig?.document_uploads_per_hour || 50}
            onChange={(e) => setRateLimitsConfig({
              api_requests_per_minute: rateLimitsConfig?.api_requests_per_minute || 100,
              api_requests_per_hour: rateLimitsConfig?.api_requests_per_hour || 1000,
              document_uploads_per_hour: parseInt(e.target.value) || 50,
              extractions_per_hour: rateLimitsConfig?.extractions_per_hour || 20,
              max_concurrent_extractions: rateLimitsConfig?.max_concurrent_extractions || 3,
              ...rateLimitsConfig
            })}
            min="1"
            max="1000"
          />
        </FormGroup>

        <FormGroup>
          <Label>Extractions per Hour</Label>
          <NumberInput
            type="number"
            value={rateLimitsConfig?.extractions_per_hour || 20}
            onChange={(e) => setRateLimitsConfig({
              api_requests_per_minute: rateLimitsConfig?.api_requests_per_minute || 100,
              api_requests_per_hour: rateLimitsConfig?.api_requests_per_hour || 1000,
              document_uploads_per_hour: rateLimitsConfig?.document_uploads_per_hour || 50,
              extractions_per_hour: parseInt(e.target.value) || 20,
              max_concurrent_extractions: rateLimitsConfig?.max_concurrent_extractions || 3,
              ...rateLimitsConfig
            })}
            min="1"
            max="500"
          />
        </FormGroup>

        <FormGroup>
          <Label>Max Concurrent Extractions</Label>
          <NumberInput
            type="number"
            value={rateLimitsConfig?.max_concurrent_extractions || 3}
            onChange={(e) => setRateLimitsConfig({
              api_requests_per_minute: rateLimitsConfig?.api_requests_per_minute || 100,
              api_requests_per_hour: rateLimitsConfig?.api_requests_per_hour || 1000,
              document_uploads_per_hour: rateLimitsConfig?.document_uploads_per_hour || 50,
              extractions_per_hour: rateLimitsConfig?.extractions_per_hour || 20,
              max_concurrent_extractions: parseInt(e.target.value) || 3,
              ...rateLimitsConfig
            })}
            min="1"
            max="20"
          />
        </FormGroup>
      </SettingsGrid>

      <ButtonGroup style={{ marginTop: '1.5rem' }}>
        <Button
          onClick={handleSaveRateLimits}
          disabled={saving || !rateLimitsConfig}
          size="medium"
        >
          {saving ? <LoadingSpinner size={16} /> : <Save size={16} />}
          Save Rate Limits
        </Button>
        
        <Button
          onClick={handleResetRateLimits}
          variant="secondary"
          size="medium"
        >
          <RefreshCw size={16} />
          Reset Usage
        </Button>
      </ButtonGroup>
    </SectionCard>
  );

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Tenant Settings</ModalTitle>
          <CloseButton onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <TabNavigation>
          <TabButton 
            $isActive={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </TabButton>
          <TabButton 
            $isActive={activeTab === 'general'} 
            onClick={() => setActiveTab('general')}
          >
            General
          </TabButton>
          <TabButton 
            $isActive={activeTab === 'llm'} 
            onClick={() => setActiveTab('llm')}
          >
            LLM Provider
          </TabButton>
          <TabButton 
            $isActive={activeTab === 'rate-limits'} 
            onClick={() => setActiveTab('rate-limits')}
          >
            Rate Limits
          </TabButton>
        </TabNavigation>

        <ModalBody>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <LoadingSpinner size={48} />
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'general' && renderGeneralTab()}
              {activeTab === 'llm' && renderLLMTab()}
              {activeTab === 'rate-limits' && renderRateLimitsTab()}
            </>
          )}
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
}
