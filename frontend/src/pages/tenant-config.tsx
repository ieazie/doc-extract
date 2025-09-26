/**
 * Tenant Configuration Page
 * Allows tenant admins to configure their tenant settings
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styled from 'styled-components';
import { 
  Settings, 
  Save, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Building2,
  Cpu,
  Shield,
  XCircle,
  Play
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { SuccessMessage } from '@/components/common/SuccessMessage';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { TenantService, HealthService, serviceFactory, LLMConfig, RateLimitsConfig, TenantLLMConfigs, ApiTenant, TenantEnvironmentInfo } from '@/services/api/index';
import InfrastructureManagement from '@/components/tenants/InfrastructureManagement';
import { LanguageConfiguration } from '@/components/tenants/LanguageConfiguration';
import { AuthenticationConfigForm } from '@/components/tenants/AuthenticationConfigForm';
import { CORSConfigForm } from '@/components/tenants/CORSConfigForm';
import { SecurityConfigForm } from '@/components/tenants/SecurityConfigForm';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PageSubtitle = styled.p`
  color: #6b7280;
  margin: 0;
`;

const TabNavigation = styled.div`
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 2rem;
`;

const TabButton = styled.button<{ $isActive: boolean }>`
  padding: 0.75rem 1.5rem;
  border: none;
  background: none;
  color: ${props => props.$isActive ? '#3b82f6' : '#6b7280'};
  font-weight: ${props => props.$isActive ? '600' : '500'};
  border-bottom: 2px solid ${props => props.$isActive ? '#3b82f6' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    color: #3b82f6;
  }
`;

const TabContent = styled.div`
  background: white;
  border-radius: 0.5rem;
  padding: 2rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  border: 1px solid #e5e7eb;
`;

const EnvironmentSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-radius: 0.375rem;
  border: 1px solid #e2e8f0;
`;

const EnvironmentLabel = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
`;

const EnvironmentPills = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const EnvironmentPill = styled.button<{ $isActive: boolean }>`
  padding: 0.25rem 0.75rem;
  border: none;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  
  ${props => props.$isActive ? `
    background: #3b82f6;
    color: white;
    box-shadow: 0 1px 2px 0 rgba(59, 130, 246, 0.3);
  ` : `
    background: white;
    color: #64748b;
    border: 1px solid #cbd5e1;
    
    &:hover {
      background: #f1f5f9;
      color: #475569;
      border-color: #94a3b8;
    }
  `}
`;

const SectionCard = styled.div`
  background: #f9fafb;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid #e5e7eb;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

const SectionDescription = styled.p`
  color: #6b7280;
  margin: 0.5rem 0 1.5rem 0;
  font-size: 0.875rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
  }
`;


const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
`;

const StyledButton = styled(Button)`
  min-width: 120px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  /* Prevent button from changing size */
  flex-shrink: 0;
  
  /* Ensure consistent icon container */
  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

const StatusBadge = styled.span<{ $status: 'healthy' | 'unhealthy' | 'unknown' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${props => {
    switch (props.$status) {
      case 'healthy': return '#dcfce7';
      case 'unhealthy': return '#fee2e2';
      case 'unknown': return '#fef3c7';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'healthy': return '#166534';
      case 'unhealthy': return '#dc2626';
      case 'unknown': return '#92400e';
      default: return '#6b7280';
    }
  }};
`;

const ConfigRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ContextualMessage = styled.div<{ $type: 'success' | 'error' }>`
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  ${props => props.$type === 'success' ? `
    background: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
  ` : `
    background: #fee2e2;
    color: #dc2626;
    border: 1px solid #fecaca;
  `}
`;

const TenantConfigPage: React.FC = () => {
  const { user, tenant, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'llm' | 'infrastructure' | 'language' | 'auth' | 'cors' | 'security'>('overview');
  const [activeEnvironment, setActiveEnvironment] = useState<'development' | 'staging' | 'production'>('development');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Cache configurations to prevent unnecessary API calls
  const [configCache, setConfigCache] = useState<{
    [key: string]: {
      auth?: any;
      cors?: any;
      security?: any;
    }
  }>({});

  // Function to handle configuration updates and cache invalidation
  const handleConfigUpdated = (configType: 'auth' | 'cors' | 'security') => {
    const cacheKey = `${activeEnvironment}`;
    setConfigCache(prev => ({
      ...prev,
      [cacheKey]: {
        ...prev[cacheKey],
        [configType]: undefined // Invalidate cache for this config type
      }
    }));
  };
  const [fieldExtractionMessage, setFieldExtractionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [documentExtractionMessage, setDocumentExtractionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Tenant configuration state
  const [tenantConfig, setTenantConfig] = useState<TenantLLMConfigs | null>(null);
  const [fieldLlmHealth, setFieldLlmHealth] = useState<'healthy' | 'unhealthy' | 'unknown'>('unknown');
  const [documentLlmHealth, setDocumentLlmHealth] = useState<'healthy' | 'unhealthy' | 'unknown'>('unknown');
  const [testingField, setTestingField] = useState(false);
  const [testingDocument, setTestingDocument] = useState(false);

  // Check permissions - tenant admin should have tenant config permissions
  if (!hasPermission('tenant:config_settings') && !hasPermission('tenant:config_llm') && !hasPermission('tenant:config_limits')) {
    return (
      <PageContainer>
        <ErrorMessage message="You don't have permission to access tenant configuration." />
      </PageContainer>
    );
  }

  useEffect(() => {
    if (tenant) {
      loadConfigurations();
    }
  }, [tenant]);

  // Clear messages when switching tabs
  useEffect(() => {
    setFieldExtractionMessage(null);
    setDocumentExtractionMessage(null);
  }, [activeTab]);

  const loadConfigurations = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      const tenantService = serviceFactory.get<TenantService>('tenants');
      const summary = await tenantService.getTenantConfigSummary();
      
      // Check if summary is null (happens when session expires)
      if (!summary) {
        console.warn('Tenant configuration summary is null - likely due to session expiry');
        // Initialize with default config when summary is null
        const defaultConfig: TenantLLMConfigs = {
          field_extraction: {
            provider: 'openai',
            base_url: '',
            model_name: 'gpt-4',
            has_api_key: false
          },
          document_extraction: {
            provider: 'ollama',
            base_url: '',
            model_name: 'gemma2:2b',
            has_api_key: false
          }
        };
        setTenantConfig(defaultConfig);
        setLoading(false);
        return;
      }
      
      // Initialize config structure
      const config: TenantLLMConfigs = {
      field_extraction: {
        provider: 'openai',
        base_url: '',
        model_name: 'gpt-4',
        has_api_key: false
      },
      document_extraction: {
        provider: 'ollama',
        base_url: '',
        model_name: 'gemma2:2b',
        has_api_key: false
      }
      };
      
      // Load existing configurations if available
      if (summary.llm_config) {
        if (summary.llm_config.field_extraction) {
          config.field_extraction = summary.llm_config.field_extraction;
        }
        if (summary.llm_config.document_extraction) {
          config.document_extraction = summary.llm_config.document_extraction;
        }
      }
      
      setTenantConfig(config);
      
      // Test health of both configurations
      try {
        const health = await serviceFactory.get<HealthService>('health').checkLLMHealth({ config_type: 'field_extraction' });
        setFieldLlmHealth(health.healthy ? 'healthy' : 'unhealthy');
      } catch {
        setFieldLlmHealth('unhealthy');
      }
      
      try {
        const health = await serviceFactory.get<HealthService>('health').checkLLMHealth({ config_type: 'document_extraction' });
        setDocumentLlmHealth(health.healthy ? 'healthy' : 'unhealthy');
      } catch {
        setDocumentLlmHealth('unhealthy');
      }
    } catch (error) {
      console.error('Failed to load tenant configurations:', error);
      setFieldExtractionMessage({ type: 'error', text: 'Failed to load tenant configurations' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFieldExtractionConfig = async () => {
    if (!tenant || !tenantConfig?.field_extraction) return;
    
    try {
      setSaving(true);
      setFieldExtractionMessage(null);
      
      const llmConfigs = {
        field_extraction: tenantConfig.field_extraction,
        document_extraction: tenantConfig.document_extraction
      };
      
      await serviceFactory.get<TenantService>('tenants').createTenantConfiguration({
        tenant_id: tenant.id,
        config_type: 'llm',
        config_data: llmConfigs,
      });
      
      setFieldExtractionMessage({ type: 'success', text: 'Field Extraction configuration saved successfully' });
      
      // Check health after saving if we have API key or using Ollama
      if (tenantConfig.field_extraction.has_api_key || tenantConfig.field_extraction.provider === 'ollama') {
        try {
          const health = await serviceFactory.get<HealthService>('health').checkLLMHealth({ config_type: 'field_extraction' });
          setFieldLlmHealth(health.healthy ? 'healthy' : 'unhealthy');
        } catch {
          setFieldLlmHealth('unhealthy');
        }
      }
    } catch (error) {
      console.error('Failed to save field extraction config:', error);
      setFieldExtractionMessage({ type: 'error', text: 'Failed to save Field Extraction configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDocumentExtractionConfig = async () => {
    if (!tenant || !tenantConfig?.document_extraction) return;
    
    try {
      setSaving(true);
      setDocumentExtractionMessage(null);
      
      const llmConfigs = {
        field_extraction: tenantConfig.field_extraction,
        document_extraction: tenantConfig.document_extraction
      };
      
      await serviceFactory.get<TenantService>('tenants').createTenantConfiguration({
        tenant_id: tenant.id,
        config_type: 'llm',
        config_data: llmConfigs,
      });
      
      setDocumentExtractionMessage({ type: 'success', text: 'Document Extraction configuration saved successfully' });
      
      // Check health after saving if we have API key or using Ollama
      if (tenantConfig.document_extraction.has_api_key || tenantConfig.document_extraction.provider === 'ollama') {
        try {
          const health = await serviceFactory.get<HealthService>('health').checkLLMHealth({ config_type: 'document_extraction' });
          setDocumentLlmHealth(health.healthy ? 'healthy' : 'unhealthy');
        } catch {
          setDocumentLlmHealth('unhealthy');
        }
      }
    } catch (error) {
      console.error('Failed to save document extraction config:', error);
      setDocumentExtractionMessage({ type: 'error', text: 'Failed to save Document Extraction configuration' });
    } finally {
      setSaving(false);
    }
  };

  // Helper function to handle LLM test responses
  const handleLLMTestResponse = (
    response: any,
    testType: 'Field Extraction' | 'Document Extraction',
    setMessage: (message: { type: 'success' | 'error'; text: string } | null) => void,
    setHealth: (health: 'healthy' | 'unhealthy') => void
  ) => {
    // Check for HTTP errors first (status >= 400)
    if (
      !response ||
      (typeof response === 'object' && 'status' in response && (response as any).status >= 400)
    ) {
      const errorMessage =
        (response as any)?.error?.message ||
        (response as any)?.statusText ||
        'Unknown error occurred';
      setMessage({ type: 'error', text: `${testType} LLM test failed: ${errorMessage}` });
      setHealth('unhealthy');
      return;
    }

    // Check for API-level failures (success: false in response payload)
    if ('success' in response && response.success === false) {
      const errorMessage = response.error || 'LLM test reported failure';
      setMessage({ type: 'error', text: `${testType} LLM test failed: ${errorMessage}` });
      setHealth('unhealthy');
      return;
    }

    // Success case
    setMessage({ type: 'success', text: `${testType} LLM test completed successfully` });
    setHealth('healthy');
  };

  const handleTestFieldExtractionLLM = async () => {
    if (!tenantConfig?.field_extraction) {
      setFieldExtractionMessage({ type: 'error', text: 'No Field Extraction configuration found' });
      return;
    }

    setTestingField(true);
    setFieldExtractionMessage(null);
    
    const response = await serviceFactory.get<HealthService>('health').testLLMExtraction({
      config_type: 'field_extraction',
      document_text: "Invoice #12345 dated 2024-01-15 for $1,500.00",
      schema: { 
        invoice_number: "string",
        date: "string", 
        amount: "number" 
      },
      prompt_config: {}
    });
    
    handleLLMTestResponse(
      response,
      'Field Extraction',
      setFieldExtractionMessage,
      setFieldLlmHealth
    );
    
    setTestingField(false);
  };

  const handleTestDocumentExtractionLLM = async () => {
    if (!tenantConfig?.document_extraction) {
      setDocumentExtractionMessage({ type: 'error', text: 'No Document Extraction configuration found' });
      return;
    }

    setTestingDocument(true);
    setDocumentExtractionMessage(null);
    
    const response = await serviceFactory.get<HealthService>('health').testLLMExtraction({
      config_type: 'document_extraction',
      document_text: "Invoice #12345 dated 2024-01-15 for $1,500.00",
      schema: { 
        invoice_number: "string",
        date: "string", 
        amount: "number" 
      },
      prompt_config: {}
    });
    
    handleLLMTestResponse(
      response,
      'Document Extraction',
      setDocumentExtractionMessage,
      setDocumentLlmHealth
    );
    
    setTestingDocument(false);
  };

  const renderOverviewTab = () => (
    <SectionCard>
      <SectionHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={20} />
          <SectionTitle>Tenant Overview</SectionTitle>
        </div>
      </SectionHeader>
      <SectionDescription>
        Basic information about your tenant
      </SectionDescription>
      
      <ConfigRow>
        <div>
          <Label>Tenant Name</Label>
          <Input value={tenant?.name || ''} disabled />
        </div>
        <div>
          <Label>Tenant ID</Label>
          <Input value={tenant?.id || ''} disabled />
        </div>
      </ConfigRow>
      
      <ConfigRow>
        <div>
          <Label>Environment</Label>
          <Input value={tenant?.environment || 'production'} disabled />
        </div>
        <div>
          <Label>Status</Label>
          <Input value={tenant?.status || 'active'} disabled />
        </div>
      </ConfigRow>
    </SectionCard>
  );


  const renderLLMTab = () => (
    <>
      {/* Field Extraction Configuration */}
      <SectionCard>
        <SectionHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={20} />
            <SectionTitle>Field Extraction Configuration</SectionTitle>
          </div>
          <StatusBadge $status={fieldLlmHealth}>
            {fieldLlmHealth === 'healthy' && <CheckCircle size={12} />}
            {fieldLlmHealth === 'unhealthy' && <XCircle size={12} />}
            {fieldLlmHealth === 'unknown' && <AlertCircle size={12} />}
            {fieldLlmHealth.charAt(0).toUpperCase() + fieldLlmHealth.slice(1)}
          </StatusBadge>
        </SectionHeader>
        <SectionDescription>
          Configure LLM settings for field extraction tasks
        </SectionDescription>
        
        <ConfigRow>
          <div>
            <Label>LLM Provider</Label>
            <Dropdown
              value={tenantConfig?.field_extraction?.provider || 'openai'}
              onChange={(value: string) => setTenantConfig((prev: TenantLLMConfigs | null) => prev ? {
                ...prev,
                field_extraction: {
                  ...prev.field_extraction!,
                  provider: value as any
                }
              } : null)}
              options={[
                { value: 'openai', label: 'OpenAI' },
                { value: 'ollama', label: 'Ollama' },
                { value: 'anthropic', label: 'Anthropic' }
              ]}
              placeholder="Select LLM Provider"
            />
          </div>
          <div>
            <Label>Model</Label>
            <Input 
              value={tenantConfig?.field_extraction?.model_name || ''}
              onChange={(e) => setTenantConfig((prev: TenantLLMConfigs | null) => prev ? {
                ...prev,
                field_extraction: {
                  ...prev.field_extraction!,
                  model_name: e.target.value
                }
              } : null)}
              placeholder="e.g., gpt-4, llama2"
            />
          </div>
        </ConfigRow>
        
        {tenantConfig?.field_extraction?.provider === 'openai' && (
          <FormGroup>
            <Label>API Key</Label>
            <Input 
              type="password"
              value={tenantConfig?.field_extraction?.has_api_key ? "••••••••••••••••••••••••••••••••" : ''}
              onChange={(e) => setTenantConfig((prev: TenantLLMConfigs | null) => prev ? {
                ...prev,
                field_extraction: {
                  ...prev.field_extraction!,
                  api_key: e.target.value
                }
              } : null)}
              placeholder={tenantConfig?.field_extraction?.has_api_key ? "Key is set (hidden for security)" : "No key set - enter one"}
              readOnly={!!tenantConfig?.field_extraction?.has_api_key}
            />
            {tenantConfig?.field_extraction?.has_api_key ? (
              <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>
                ✓ API key is configured and hidden for security
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                ⚠️ No API key set - authentication will not work properly
              </div>
            )}
          </FormGroup>
        )}

        {tenantConfig?.field_extraction?.provider === 'anthropic' && (
          <FormGroup>
            <Label>API Key</Label>
            <Input 
              type="password"
              value={tenantConfig?.field_extraction?.has_api_key ? "••••••••••••••••••••••••••••••••" : ''}
              onChange={(e) => setTenantConfig((prev: TenantLLMConfigs | null) => prev ? {
                ...prev,
                field_extraction: {
                  ...prev.field_extraction!,
                  api_key: e.target.value
                }
              } : null)}
              placeholder={tenantConfig?.field_extraction?.has_api_key ? "Key is set (hidden for security)" : "No key set - enter one"}
              readOnly={!!tenantConfig?.field_extraction?.has_api_key}
            />
            {tenantConfig?.field_extraction?.has_api_key ? (
              <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>
                ✓ API key is configured and hidden for security
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                ⚠️ No API key set - authentication will not work properly
              </div>
            )}
          </FormGroup>
        )}
        
        <ButtonGroup>
          <StyledButton onClick={handleSaveFieldExtractionConfig} disabled={saving}>
            {saving ? <LoadingSpinner size={16} /> : <Save size={16} />}
            Save
          </StyledButton>
          <StyledButton 
            variant="secondary" 
            onClick={handleTestFieldExtractionLLM} 
            disabled={testingField}
          >
            {testingField ? <LoadingSpinner size={16} /> : <Play size={16} />}
            Test
          </StyledButton>
        </ButtonGroup>

        {fieldExtractionMessage && (
          <ContextualMessage $type={fieldExtractionMessage.type}>
            {fieldExtractionMessage.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {fieldExtractionMessage.text}
          </ContextualMessage>
        )}
      </SectionCard>

      {/* Document Extraction Configuration */}
      <SectionCard>
        <SectionHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={20} />
            <SectionTitle>Document Extraction Configuration</SectionTitle>
          </div>
          <StatusBadge $status={documentLlmHealth}>
            {documentLlmHealth === 'healthy' && <CheckCircle size={12} />}
            {documentLlmHealth === 'unhealthy' && <XCircle size={12} />}
            {documentLlmHealth === 'unknown' && <AlertCircle size={12} />}
            {documentLlmHealth.charAt(0).toUpperCase() + documentLlmHealth.slice(1)}
          </StatusBadge>
        </SectionHeader>
        <SectionDescription>
          Configure LLM settings for document extraction tasks
        </SectionDescription>
        
        <ConfigRow>
          <div>
            <Label>LLM Provider</Label>
            <Dropdown
              value={tenantConfig?.document_extraction?.provider || 'ollama'}
              onChange={(value: string) => setTenantConfig((prev: TenantLLMConfigs | null) => prev ? {
                ...prev,
                document_extraction: {
                  ...prev.document_extraction!,
                  provider: value as any
                }
              } : null)}
              options={[
                { value: 'openai', label: 'OpenAI' },
                { value: 'ollama', label: 'Ollama' },
                { value: 'anthropic', label: 'Anthropic' }
              ]}
              placeholder="Select LLM Provider"
            />
          </div>
          <div>
            <Label>Model</Label>
            <Input 
              value={tenantConfig?.document_extraction?.model_name || ''}
              onChange={(e) => setTenantConfig((prev: TenantLLMConfigs | null) => prev ? {
                ...prev,
                document_extraction: {
                  ...prev.document_extraction!,
                  model_name: e.target.value
                }
              } : null)}
              placeholder="e.g., gpt-4, llama2"
            />
          </div>
        </ConfigRow>
        
        {tenantConfig?.document_extraction?.provider === 'openai' && (
          <FormGroup>
            <Label>API Key</Label>
            <Input 
              type="password"
              value={tenantConfig?.document_extraction?.has_api_key ? "••••••••••••••••••••••••••••••••" : ''}
              onChange={(e) => setTenantConfig((prev: TenantLLMConfigs | null) => prev ? {
                ...prev,
                document_extraction: {
                  ...prev.document_extraction!,
                  api_key: e.target.value
                }
              } : null)}
              placeholder={tenantConfig?.document_extraction?.has_api_key ? "Key is set (hidden for security)" : "No key set - enter one"}
              readOnly={!!tenantConfig?.document_extraction?.has_api_key}
            />
            {tenantConfig?.document_extraction?.has_api_key ? (
              <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>
                ✓ API key is configured and hidden for security
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                ⚠️ No API key set - authentication will not work properly
              </div>
            )}
          </FormGroup>
        )}

        {tenantConfig?.document_extraction?.provider === 'anthropic' && (
          <FormGroup>
            <Label>API Key</Label>
            <Input 
              type="password"
              value={tenantConfig?.document_extraction?.has_api_key ? "••••••••••••••••••••••••••••••••" : ''}
              onChange={(e) => setTenantConfig((prev: TenantLLMConfigs | null) => prev ? {
                ...prev,
                document_extraction: {
                  ...prev.document_extraction!,
                  api_key: e.target.value
                }
              } : null)}
              placeholder={tenantConfig?.document_extraction?.has_api_key ? "Key is set (hidden for security)" : "No key set - enter one"}
              readOnly={!!tenantConfig?.document_extraction?.has_api_key}
            />
            {tenantConfig?.document_extraction?.has_api_key ? (
              <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>
                ✓ API key is configured and hidden for security
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                ⚠️ No API key set - authentication will not work properly
              </div>
            )}
          </FormGroup>
        )}
        
        <ButtonGroup>
          <StyledButton onClick={handleSaveDocumentExtractionConfig} disabled={saving}>
            {saving ? <LoadingSpinner size={16} /> : <Save size={16} />}
            Save
          </StyledButton>
          <StyledButton 
            variant="secondary" 
            onClick={handleTestDocumentExtractionLLM} 
            disabled={testingDocument}
          >
            {testingDocument ? <LoadingSpinner size={16} /> : <Play size={16} />}
            Test
          </StyledButton>
        </ButtonGroup>

        {documentExtractionMessage && (
          <ContextualMessage $type={documentExtractionMessage.type}>
            {documentExtractionMessage.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {documentExtractionMessage.text}
          </ContextualMessage>
        )}
      </SectionCard>
    </>
  );

  const renderInfrastructureTab = () => {
    if (!tenant) return null;
    
    // Use the actual slug from the tenant if available, otherwise generate one
    const tenantSlug = (tenant as any).slug || tenant.name.toLowerCase().replace(/\s+/g, '-');
    
    const tenantInfo: TenantEnvironmentInfo = {
      id: tenant.id,
      name: tenant.name,
      slug: tenantSlug,
      status: tenant.status,
      environment: tenant.environment,
      created_at: tenant.created_at,
      updated_at: tenant.updated_at
    };

    return <InfrastructureManagement tenantInfo={tenantInfo} />;
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingSpinner size={48} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <Settings size={24} />
          Tenant Settings
        </PageTitle>
        <PageSubtitle>
          Configure settings for <strong>{tenant?.name || 'your tenant'}</strong>
        </PageSubtitle>
      </PageHeader>


      <TabNavigation>
        <TabButton 
          $isActive={activeTab === 'overview'} 
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </TabButton>
        <TabButton 
          $isActive={activeTab === 'llm'} 
          onClick={() => setActiveTab('llm')}
        >
          LLM Provider
        </TabButton>
        <TabButton 
          $isActive={activeTab === 'infrastructure'} 
          onClick={() => setActiveTab('infrastructure')}
        >
          Infrastructure
        </TabButton>
        <TabButton 
          $isActive={activeTab === 'language'} 
          onClick={() => setActiveTab('language')}
        >
          Language
        </TabButton>
        <TabButton 
          $isActive={activeTab === 'auth'} 
          onClick={() => setActiveTab('auth')}
        >
          Authentication
        </TabButton>
        <TabButton 
          $isActive={activeTab === 'cors'} 
          onClick={() => setActiveTab('cors')}
        >
          CORS
        </TabButton>
        <TabButton 
          $isActive={activeTab === 'security'} 
          onClick={() => setActiveTab('security')}
        >
          Security
        </TabButton>
      </TabNavigation>

      <TabContent>
        {/* Environment Selector - Show for configuration tabs only */}
        {(activeTab === 'auth' || activeTab === 'cors' || activeTab === 'security') && (
          <EnvironmentSelector>
            <EnvironmentLabel>Environment:</EnvironmentLabel>
            <EnvironmentPills>
              <EnvironmentPill 
                $isActive={activeEnvironment === 'development'} 
                onClick={() => setActiveEnvironment('development')}
              >
                Development
              </EnvironmentPill>
              <EnvironmentPill 
                $isActive={activeEnvironment === 'staging'} 
                onClick={() => setActiveEnvironment('staging')}
              >
                Staging
              </EnvironmentPill>
              <EnvironmentPill 
                $isActive={activeEnvironment === 'production'} 
                onClick={() => setActiveEnvironment('production')}
              >
                Production
              </EnvironmentPill>
            </EnvironmentPills>
          </EnvironmentSelector>
        )}

        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'llm' && renderLLMTab()}
        {activeTab === 'infrastructure' && tenant && renderInfrastructureTab()}
        {activeTab === 'language' && tenant && <LanguageConfiguration tenantId={tenant.id} />}
        {activeTab === 'auth' && tenant && (
          <AuthenticationConfigForm 
            tenantId={tenant.id} 
            environment={activeEnvironment}
            onConfigUpdated={() => handleConfigUpdated('auth')}
          />
        )}
        {activeTab === 'cors' && tenant && (
          <CORSConfigForm 
            tenantId={tenant.id} 
            environment={activeEnvironment}
            onConfigUpdated={() => handleConfigUpdated('cors')}
          />
        )}
        {activeTab === 'security' && tenant && (
          <SecurityConfigForm 
            tenantId={tenant.id} 
            environment={activeEnvironment}
            onConfigUpdated={() => handleConfigUpdated('security')}
          />
        )}
      </TabContent>
    </PageContainer>
  );
};

export default TenantConfigPage;
