import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Server, 
  Database, 
  HardDrive, 
  MessageSquare, 
  Cpu,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  apiClient, 
  InfrastructureStatus, 
  InfrastructureConfig, 
  EnvironmentSecrets,
  TenantEnvironmentInfo,
  StorageConfig,
  CacheConfig,
  MessageQueueConfig
} from '@/services/api';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorMessage from '@/components/common/ErrorMessage';
import SuccessMessage from '@/components/common/SuccessMessage';
import InfoTooltip from '@/components/common/InfoTooltip';
import EditableConfigCard from './EditableConfigCard';
import ConfigDiffPreview from './ConfigDiffPreview';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const EnvironmentSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatusCard = styled.div<{ status: 'healthy' | 'unhealthy' | 'unknown' }>`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  ${props => props.status === 'healthy' && `
    border-left: 4px solid ${props.theme.colors.success};
  `}

  ${props => props.status === 'unhealthy' && `
    border-left: 4px solid ${props.theme.colors.error};
  `}

  ${props => props.status === 'unknown' && `
    border-left: 4px solid ${props.theme.colors.warning};
  `}
`;

const StatusHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ServiceInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ServiceIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.theme.colors.surfaceHover};
  color: ${props => props.theme.colors.text.secondary};
`;

const ServiceDetails = styled.div`
  flex: 1;
`;

const ServiceName = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
`;

const ServiceDescription = styled.p`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text.secondary};
  margin: 0;
`;

const StatusIndicator = styled.div<{ status: 'healthy' | 'unhealthy' | 'unknown' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;

  ${props => props.status === 'healthy' && `
    color: ${props.theme.colors.success};
  `}

  ${props => props.status === 'unhealthy' && `
    color: ${props.theme.colors.error};
  `}

  ${props => props.status === 'unknown' && `
    color: ${props.theme.colors.warning};
  `}
`;

const ConfigSection = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 12px;
  padding: 2rem;
  margin-top: 2rem;
`;

const ConfigHeader = styled.div`
  margin-bottom: 2rem;
`;

const ConfigTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ConfigGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const ConfigCard = styled.div`
  background: ${props => props.theme.colors.surfaceHover};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary}30;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
`;

const ConfigField = styled.div`
  margin-bottom: 0.75rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const ConfigLabel = styled.label`
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const ConfigValue = styled.div`
  font-size: 0.875rem;
  color: #374151;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.75rem;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  word-break: break-all;
`;

const SecretValue = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SecretText = styled.span`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text.secondary};
  font-family: monospace;
  flex: 1;
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.text.secondary};
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
`;

interface InfrastructureManagementProps {
  tenantInfo: TenantEnvironmentInfo;
}

const InfrastructureManagement: React.FC<InfrastructureManagementProps> = ({ tenantInfo }) => {
  const [currentEnvironment, setCurrentEnvironment] = useState<string>('development');
  const [infrastructureStatus, setInfrastructureStatus] = useState<InfrastructureStatus | null>(null);
  const [infrastructureConfig, setInfrastructureConfig] = useState<InfrastructureConfig | null>(null);
  const [environmentSecrets, setEnvironmentSecrets] = useState<EnvironmentSecrets>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});

  const availableEnvironments = ['development', 'staging', 'production'];

  useEffect(() => {
    loadInfrastructureData();
  }, [currentEnvironment, tenantInfo.slug]);

  const loadInfrastructureData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading infrastructure data for:', tenantInfo.slug, currentEnvironment);
      
      const [status, config, secrets] = await Promise.all([
        apiClient.getInfrastructureStatus(tenantInfo.slug, currentEnvironment),
        apiClient.getInfrastructureConfig(tenantInfo.slug, currentEnvironment),
        apiClient.getEnvironmentSecrets(currentEnvironment)
      ]);

      console.log('Infrastructure data loaded:', { status, config, secrets });
      
      setInfrastructureStatus(status);
      setInfrastructureConfig(config);
      setEnvironmentSecrets(secrets);
    } catch (err: any) {
      console.error('Failed to load infrastructure data:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load infrastructure data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSecretVisibility = (secretKey: string) => {
    setVisibleSecrets(prev => ({
      ...prev,
      [secretKey]: !prev[secretKey]
    }));
  };

  const refreshData = () => {
    loadInfrastructureData();
  };

  const saveConfiguration = async (configType: string, values: Record<string, any>) => {
    try {
      setLoading(true);
      setError(null);
      
      await apiClient.updateEnvironmentConfig(configType, currentEnvironment, values);
      
      setSuccess(`${configType} configuration updated successfully`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Reload data to get updated configuration
      await loadInfrastructureData();
      
      // Clear pending changes for this config type
      setPendingChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[configType];
        return newChanges;
      });
      
    } catch (err: any) {
      console.error('Failed to save configuration:', err);
      setError(err.response?.data?.detail || err.message || `Failed to save ${configType} configuration`);
    } finally {
      setLoading(false);
    }
  };

  const saveSecret = async (secretType: string, value: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await apiClient.updateEnvironmentSecret(currentEnvironment, secretType, value);
      
      setSuccess(`${secretType} secret updated successfully`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Reload data to get updated secrets
      await loadInfrastructureData();
      
    } catch (err: any) {
      console.error('Failed to save secret:', err);
      setError(err.response?.data?.detail || err.message || `Failed to save ${secretType} secret`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: 'healthy' | 'unhealthy' | 'unknown') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle size={16} />;
      case 'unhealthy':
        return <XCircle size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  const getStatusText = (configured: boolean, healthy: boolean) => {
    if (!configured) return 'Not Configured';
    if (healthy) return 'Healthy';
    return 'Unhealthy';
  };

  const getStatusType = (configured: boolean, healthy: boolean): 'healthy' | 'unhealthy' | 'unknown' => {
    if (!configured) return 'unknown';
    if (healthy) return 'healthy';
    return 'unhealthy';
  };

  const renderSecretValue = (secretKey: string, value?: string) => {
    if (!value || value === '********') return <span style={{ color: '#6b7280' }}>Not set</span>;
    
    const isVisible = visibleSecrets[secretKey];
    const displayValue = isVisible ? value : '••••••••••••••••';

    return (
      <SecretValue>
        <SecretText>{displayValue}</SecretText>
        <ToggleButton onClick={() => toggleSecretVisibility(secretKey)}>
          {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
        </ToggleButton>
      </SecretValue>
    );
  };

  const createStorageFields = (config: StorageConfig) => [
    {
      key: 'provider',
      label: 'Provider',
      type: 'select' as const,
      value: config.provider,
      options: ['minio', 'aws_s3'],
      required: true,
      description: 'Storage provider to use'
    },
    {
      key: 'bucket_prefix',
      label: 'Bucket Prefix',
      type: 'text' as const,
      value: config.bucket_prefix,
      required: true,
      description: 'Prefix for bucket names (e.g., dev-tenant-123)'
    },
    {
      key: 'region',
      label: 'Region',
      type: 'text' as const,
      value: config.region,
      required: true,
      description: 'AWS region or MinIO region'
    },
    {
      key: 'endpoint_url',
      label: 'Endpoint URL',
      type: 'text' as const,
      value: config.endpoint_url || '',
      description: 'Custom endpoint URL (leave empty for AWS default)'
    },
    {
      key: 'max_storage_gb',
      label: 'Max Storage (GB)',
      type: 'number' as const,
      value: config.max_storage_gb,
      required: true,
      description: 'Maximum storage quota in gigabytes'
    }
  ];

  const createCacheFields = (config: CacheConfig) => [
    {
      key: 'provider',
      label: 'Provider',
      type: 'select' as const,
      value: config.provider,
      options: ['redis'],
      required: true,
      description: 'Cache provider (currently only Redis supported)'
    },
    {
      key: 'host',
      label: 'Host',
      type: 'text' as const,
      value: config.host,
      required: true,
      description: 'Redis server hostname'
    },
    {
      key: 'port',
      label: 'Port',
      type: 'number' as const,
      value: config.port,
      required: true,
      description: 'Redis server port'
    },
    {
      key: 'database_number',
      label: 'Database Number',
      type: 'number' as const,
      value: config.database_number,
      required: true,
      description: 'Redis database number (0-15)'
    },
    {
      key: 'max_memory_mb',
      label: 'Max Memory (MB)',
      type: 'number' as const,
      value: config.max_memory_mb,
      required: true,
      description: 'Maximum memory usage in megabytes'
    },
    {
      key: 'ttl_seconds',
      label: 'TTL (seconds)',
      type: 'number' as const,
      value: config.ttl_seconds,
      required: true,
      description: 'Default time-to-live for cached items'
    }
  ];

  const createMessageQueueFields = (config: MessageQueueConfig) => [
    {
      key: 'provider',
      label: 'Provider',
      type: 'select' as const,
      value: config.provider,
      options: ['redis'],
      required: true,
      description: 'Message queue provider (currently only Redis supported)'
    },
    {
      key: 'queue_prefix',
      label: 'Queue Prefix',
      type: 'text' as const,
      value: config.queue_prefix,
      required: true,
      description: 'Prefix for queue names (e.g., dev-tenant-123)'
    },
    {
      key: 'broker_url',
      label: 'Broker URL',
      type: 'text' as const,
      value: config.broker_url,
      required: true,
      description: 'Redis broker URL for Celery'
    },
    {
      key: 'result_backend',
      label: 'Result Backend',
      type: 'text' as const,
      value: config.result_backend,
      required: true,
      description: 'Redis result backend URL for Celery'
    },
    {
      key: 'max_workers',
      label: 'Max Workers',
      type: 'number' as const,
      value: config.max_workers,
      required: true,
      description: 'Maximum number of worker processes'
    }
  ];

  const renderConfigCard = (title: string, icon: React.ReactNode, config: any) => {
    return (
      <ConfigCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          {icon}
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#374151' }}>{title}</h4>
        </div>
        
        {Object.entries(config).map(([key, value]) => (
          <ConfigField key={key}>
            <ConfigLabel>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</ConfigLabel>
            <ConfigValue>
              {value === null || value === undefined ? 'Not set' : 
               typeof value === 'object' ? JSON.stringify(value, null, 2) : 
               String(value)}
            </ConfigValue>
          </ConfigField>
        ))}
      </ConfigCard>
    );
  };

  if (loading && !infrastructureStatus) {
    return <LoadingSpinner />;
  }

  return (
    <Container>
      <Header>
        <Title>
          <Server size={24} />
          Infrastructure Management
        </Title>
        
        <EnvironmentSelector>
          <div style={{ width: '160px' }}>
            <Dropdown
              value={currentEnvironment}
              onChange={setCurrentEnvironment}
              options={availableEnvironments.map(env => ({
                value: env,
                label: env.charAt(0).toUpperCase() + env.slice(1)
              }))}
              placeholder="Select Environment"
              size="compact"
            />
          </div>
          
          <Button
            variant="outline"
            size="small"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
        </EnvironmentSelector>
      </Header>

      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <LoadingSpinner />
        </div>
      )}

      {/* Infrastructure Status */}
      {infrastructureStatus && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <Title>
              <Server size={20} />
              Infrastructure Status
            </Title>
            <InfoTooltip 
              content="Real-time health monitoring of your infrastructure components."
            />
          </div>
          <StatusGrid>
            <StatusCard status={getStatusType(infrastructureStatus.storage.configured, infrastructureStatus.storage.healthy)}>
              <StatusHeader>
                <ServiceInfo>
                  <ServiceIcon>
                    <HardDrive size={20} />
                  </ServiceIcon>
                  <ServiceDetails>
                    <ServiceName>Storage</ServiceName>
                    <ServiceDescription>Document and file storage</ServiceDescription>
                  </ServiceDetails>
                </ServiceInfo>
                <StatusIndicator status={getStatusType(infrastructureStatus.storage.configured, infrastructureStatus.storage.healthy)}>
                  {getStatusIcon(getStatusType(infrastructureStatus.storage.configured, infrastructureStatus.storage.healthy))}
                  {getStatusText(infrastructureStatus.storage.configured, infrastructureStatus.storage.healthy)}
                </StatusIndicator>
              </StatusHeader>
            </StatusCard>

            <StatusCard status={getStatusType(infrastructureStatus.cache.configured, infrastructureStatus.cache.healthy)}>
              <StatusHeader>
                <ServiceInfo>
                  <ServiceIcon>
                    <Database size={20} />
                  </ServiceIcon>
                  <ServiceDetails>
                    <ServiceName>Cache</ServiceName>
                    <ServiceDescription>Redis caching layer</ServiceDescription>
                  </ServiceDetails>
                </ServiceInfo>
                <StatusIndicator status={getStatusType(infrastructureStatus.cache.configured, infrastructureStatus.cache.healthy)}>
                  {getStatusIcon(getStatusType(infrastructureStatus.cache.configured, infrastructureStatus.cache.healthy))}
                  {getStatusText(infrastructureStatus.cache.configured, infrastructureStatus.cache.healthy)}
                </StatusIndicator>
              </StatusHeader>
            </StatusCard>

            <StatusCard status={getStatusType(infrastructureStatus.queue.configured, infrastructureStatus.queue.healthy)}>
              <StatusHeader>
                <ServiceInfo>
                  <ServiceIcon>
                    <MessageSquare size={20} />
                  </ServiceIcon>
                  <ServiceDetails>
                    <ServiceName>Message Queue</ServiceName>
                    <ServiceDescription>Background job processing</ServiceDescription>
                  </ServiceDetails>
                </ServiceInfo>
                <StatusIndicator status={getStatusType(infrastructureStatus.queue.configured, infrastructureStatus.queue.healthy)}>
                  {getStatusIcon(getStatusType(infrastructureStatus.queue.configured, infrastructureStatus.queue.healthy))}
                  {getStatusText(infrastructureStatus.queue.configured, infrastructureStatus.queue.healthy)}
                </StatusIndicator>
              </StatusHeader>
            </StatusCard>

            <StatusCard status={getStatusType(infrastructureStatus.llm.configured, infrastructureStatus.llm.healthy)}>
              <StatusHeader>
                <ServiceInfo>
                  <ServiceIcon>
                    <Cpu size={20} />
                  </ServiceIcon>
                  <ServiceDetails>
                    <ServiceName>LLM Services</ServiceName>
                    <ServiceDescription>AI model integration</ServiceDescription>
                  </ServiceDetails>
                </ServiceInfo>
                <StatusIndicator status={getStatusType(infrastructureStatus.llm.configured, infrastructureStatus.llm.healthy)}>
                  {getStatusIcon(getStatusType(infrastructureStatus.llm.configured, infrastructureStatus.llm.healthy))}
                  {getStatusText(infrastructureStatus.llm.configured, infrastructureStatus.llm.healthy)}
                </StatusIndicator>
              </StatusHeader>
            </StatusCard>
          </StatusGrid>
        </>
      )}

      {/* Configuration Details */}
      {infrastructureConfig && (
        <ConfigSection>
          <ConfigHeader>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <ConfigTitle>
                <Settings size={20} />
                Configuration Details
              </ConfigTitle>
              <InfoTooltip 
                content="Editable infrastructure configurations. Changes are applied immediately."
              />
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.4' }}>
              Current configuration for <strong>{currentEnvironment}</strong> environment
            </div>
          </ConfigHeader>

          <ConfigGrid>
            {infrastructureConfig.configurations.storage && (
              <EditableConfigCard
                title="Storage Configuration"
                description="Configure document and file storage settings"
                fields={createStorageFields(infrastructureConfig.configurations.storage)}
                onSave={(values) => saveConfiguration('storage', values)}
                loading={loading}
              />
            )}
            
            {infrastructureConfig.configurations.cache && (
              <EditableConfigCard
                title="Cache Configuration"
                description="Configure Redis caching settings"
                fields={createCacheFields(infrastructureConfig.configurations.cache)}
                onSave={(values) => saveConfiguration('cache', values)}
                loading={loading}
              />
            )}
            
            {infrastructureConfig.configurations.message_queue && (
              <EditableConfigCard
                title="Message Queue Configuration"
                description="Configure Celery/Redis message queue settings"
                fields={createMessageQueueFields(infrastructureConfig.configurations.message_queue)}
                onSave={(values) => saveConfiguration('message_queue', values)}
                loading={loading}
              />
            )}
          </ConfigGrid>
        </ConfigSection>
      )}

      {/* Environment Secrets */}
      {Object.keys(environmentSecrets).length > 0 && (
        <ConfigSection>
          <ConfigHeader>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <ConfigTitle>
                <Settings size={20} />
                Environment Secrets
              </ConfigTitle>
              <InfoTooltip 
                content="Encrypted secrets for external service authentication."
              />
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.4' }}>
              Secrets for <strong>{currentEnvironment}</strong> environment
            </div>
          </ConfigHeader>

          <ConfigGrid>
            {Object.entries(environmentSecrets).map(([key, value]) => {
              const secretDescriptions: Record<string, string> = {
                'storage_access_key': 'Access key for storage provider (S3/MinIO)',
                'storage_secret_key': 'Secret key for storage provider (S3/MinIO)',
                'cache_password': 'Redis cache authentication password',
                'redis_password': 'Redis message queue authentication password',
                'llm_api_key': 'API key for LLM provider (OpenAI/Anthropic)',
                'llm_field_api_key': 'API key for field extraction LLM',
                'llm_document_api_key': 'API key for document extraction LLM',
                'webhook_secret': 'Secret for webhook signature validation',
                'database_password': 'Database connection password'
              };

              const createSecretFields = () => [
                {
                  key: 'value',
                  label: 'Secret Value',
                  type: 'password' as const,
                  value: '',
                  required: true,
                  description: secretDescriptions[key] || 'Secret value for authentication',
                  placeholder: 'Enter new secret value'
                }
              ];

              return (
                <EditableConfigCard
                  key={key}
                  title={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  description={secretDescriptions[key] || 'Secret value for authentication'}
                  fields={createSecretFields()}
                  onSave={(values) => saveSecret(key, values.value)}
                  loading={loading}
                />
              );
            })}
          </ConfigGrid>
        </ConfigSection>
      )}

      <ActionButtons>
        <Button
          variant="primary"
          onClick={refreshData}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh All Data
        </Button>
      </ActionButtons>
    </Container>
  );
};

export default InfrastructureManagement;
