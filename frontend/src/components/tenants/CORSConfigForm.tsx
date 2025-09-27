/**
 * CORS Configuration Form
 * Functional form for editing CORS policies and settings
 */
import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Plus, X } from 'lucide-react';
import { CORSConfig } from '../../services/api/tenants/types/tenants';
import { serviceFactory } from '../../services/api';
import { TenantService } from '../../services/api/tenants/TenantService';
import Button from '@/components/ui/Button';
import ErrorMessage from '@/components/common/ErrorMessage';
import SuccessMessage from '@/components/common/SuccessMessage';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  FormContainer,
  FormSection,
  FormSectionHeader,
  FormSectionTitle,
  FormGrid,
  FormGroup,
  FormLabel,
  FormInput,
  FormSelect,
  FormCheckbox,
  CheckboxContainer,
  CheckboxLabel,
  FormHelpText,
  ActionButtons,
  EnvironmentSelector,
  EnvironmentLabel,
  EnvironmentBadge,
  TagContainer,
  Tag,
  TagRemoveButton,
  TagInputContainer,
  TagInput
} from './ConfigurationForms.styled';

interface CORSConfigFormProps {
  tenantId: string;
  environment: 'development' | 'staging' | 'production';
  onConfigUpdated?: () => void;
}

export const CORSConfigForm: React.FC<CORSConfigFormProps> = ({
  tenantId,
  environment,
  onConfigUpdated
}) => {
  const [config, setConfig] = useState<CORSConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Tag input states
  const [newOrigin, setNewOrigin] = useState('');
  const [newMethod, setNewMethod] = useState('');
  const [newHeader, setNewHeader] = useState('');
  const [newExposedHeader, setNewExposedHeader] = useState('');

  const tenantService = serviceFactory.get<TenantService>('tenants');

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
  }, [tenantId, environment]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const corsConfig = await tenantService.getCORSConfig(environment);
      
      if (corsConfig) {
        setConfig(corsConfig);
      } else {
        // Create default configuration
        const defaultConfig: CORSConfig = {
          allowed_origins: environment === 'development' ? ['http://localhost:3000'] : [],
          allow_credentials: true,
          allowed_methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowed_headers: ['Authorization', 'Content-Type', 'X-Requested-With'],
          exposed_headers: [],
          max_age: 3600
        };
        setConfig(defaultConfig);
      }
    } catch (err: any) {
      console.warn('No existing CORS config found, using defaults:', err);
      // Don't show error for missing configs, just use defaults
      const defaultCORSConfig: CORSConfig = {
        allowed_origins: environment === 'development'
          ? ['http://localhost:3000', 'http://127.0.0.1:3000']
          : [],
        allow_credentials: true,
        allowed_methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowed_headers: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
        exposed_headers: [],
        max_age: 3600,
      };
      setConfig(defaultCORSConfig);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof CORSConfig, value: any) => {
    if (!config) return;
    
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    setHasChanges(true);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!config) return;
    
    try {
      setSaving(true);
      setError(null);
      
      await tenantService.updateCORSConfig(config, environment);
      
      setSuccess('CORS configuration saved successfully');
      setHasChanges(false);
      onConfigUpdated?.();
    } catch (err: any) {
      setError(`Failed to save CORS configuration: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    await loadConfiguration();
    setHasChanges(false);
    setError(null);
    setSuccess(null);
  };

  // Origin management
  const addOrigin = () => {
    if (!newOrigin.trim() || !config) return;
    
    const trimmedOrigin = newOrigin.trim();
    if (!config.allowed_origins.includes(trimmedOrigin)) {
      const newOrigins = [...config.allowed_origins, trimmedOrigin];
      handleFieldChange('allowed_origins', newOrigins);
      setNewOrigin('');
    }
  };

  const removeOrigin = (originToRemove: string) => {
    if (!config) return;
    const newOrigins = config.allowed_origins.filter(origin => origin !== originToRemove);
    handleFieldChange('allowed_origins', newOrigins);
  };

  // Method management
  const addMethod = () => {
    if (!newMethod.trim() || !config) return;
    
    const trimmedMethod = newMethod.trim().toUpperCase();
    if (!config.allowed_methods.includes(trimmedMethod)) {
      const newMethods = [...config.allowed_methods, trimmedMethod];
      handleFieldChange('allowed_methods', newMethods);
      setNewMethod('');
    }
  };

  const removeMethod = (methodToRemove: string) => {
    if (!config) return;
    const newMethods = config.allowed_methods.filter(method => method !== methodToRemove);
    handleFieldChange('allowed_methods', newMethods);
  };

  // Header management
  const addHeader = () => {
    if (!newHeader.trim() || !config) return;
    
    const trimmedHeader = newHeader.trim();
    if (!config.allowed_headers.includes(trimmedHeader)) {
      const newHeaders = [...config.allowed_headers, trimmedHeader];
      handleFieldChange('allowed_headers', newHeaders);
      setNewHeader('');
    }
  };

  const removeHeader = (headerToRemove: string) => {
    if (!config) return;
    const newHeaders = config.allowed_headers.filter(header => header !== headerToRemove);
    handleFieldChange('allowed_headers', newHeaders);
  };

  // Exposed header management
  const addExposedHeader = () => {
    if (!newExposedHeader.trim() || !config) return;
    
    const trimmedHeader = newExposedHeader.trim();
    if (!config.exposed_headers.includes(trimmedHeader)) {
      const newHeaders = [...config.exposed_headers, trimmedHeader];
      handleFieldChange('exposed_headers', newHeaders);
      setNewExposedHeader('');
    }
  };

  const removeExposedHeader = (headerToRemove: string) => {
    if (!config) return;
    const newHeaders = config.exposed_headers.filter(header => header !== headerToRemove);
    handleFieldChange('exposed_headers', newHeaders);
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!config) {
    return <ErrorMessage message="Failed to load CORS configuration" />;
  }

  return (
    <FormContainer>
      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      {/* Allowed Origins */}
      <FormSection>
        <FormSectionHeader>
          <FormSectionTitle>Allowed Origins</FormSectionTitle>
        </FormSectionHeader>
        
        <FormGroup>
          <FormLabel>Origins</FormLabel>
          <TagContainer>
            {config.allowed_origins.map((origin, index) => (
              <Tag key={index}>
                <span>{origin}</span>
                <TagRemoveButton onClick={() => removeOrigin(origin)}>
                  <X size={12} />
                </TagRemoveButton>
              </Tag>
            ))}
          </TagContainer>
          
          <TagInputContainer>
            <TagInput
              type="text"
              value={newOrigin}
              onChange={(e) => setNewOrigin(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, addOrigin)}
              placeholder="https://example.com"
            />
            <Button
              onClick={addOrigin}
              variant="secondary"
              size="small"
              disabled={!newOrigin.trim()}
            >
              <Plus size={16} />
              Add
            </Button>
          </TagInputContainer>
          <FormHelpText>
            Add allowed origins for cross-origin requests. Leave empty to deny all origins. If Allow Credentials is enabled, avoid using "*" and list explicit origins.
          </FormHelpText>
        </FormGroup>
      </FormSection>

      {/* Allowed Methods */}
      <FormSection>
        <FormSectionHeader>
          <FormSectionTitle>Allowed Methods</FormSectionTitle>
        </FormSectionHeader>
        
        <FormGroup>
          <FormLabel>HTTP Methods</FormLabel>
          <TagContainer>
            {config.allowed_methods.map((method, index) => (
              <Tag key={index}>
                <span>{method}</span>
                <TagRemoveButton onClick={() => removeMethod(method)}>
                  <X size={12} />
                </TagRemoveButton>
              </Tag>
            ))}
          </TagContainer>
          
          <TagInputContainer>
            <TagInput
              type="text"
              value={newMethod}
              onChange={(e) => setNewMethod(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, addMethod)}
              placeholder="GET, POST, PUT, etc."
            />
            <Button
              onClick={addMethod}
              variant="secondary"
              size="small"
              disabled={!newMethod.trim()}
            >
              <Plus size={16} />
              Add
            </Button>
          </TagInputContainer>
          <FormHelpText>
            HTTP methods allowed for cross-origin requests.
          </FormHelpText>
        </FormGroup>
      </FormSection>

      {/* Allowed Headers */}
      <FormSection>
        <FormSectionHeader>
          <FormSectionTitle>Allowed Headers</FormSectionTitle>
        </FormSectionHeader>
        
        <FormGroup>
          <FormLabel>Headers</FormLabel>
          <TagContainer>
            {config.allowed_headers.map((header, index) => (
              <Tag key={index}>
                <span>{header}</span>
                <TagRemoveButton onClick={() => removeHeader(header)}>
                  <X size={12} />
                </TagRemoveButton>
              </Tag>
            ))}
          </TagContainer>
          
          <TagInputContainer>
            <TagInput
              type="text"
              value={newHeader}
              onChange={(e) => setNewHeader(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, addHeader)}
              placeholder="Authorization, Content-Type, etc."
            />
            <Button
              onClick={addHeader}
              variant="secondary"
              size="small"
              disabled={!newHeader.trim()}
            >
              <Plus size={16} />
              Add
            </Button>
          </TagInputContainer>
          <FormHelpText>
            Headers allowed in cross-origin requests.
          </FormHelpText>
        </FormGroup>
      </FormSection>

      {/* Exposed Headers */}
      <FormSection>
        <FormSectionHeader>
          <FormSectionTitle>Exposed Headers</FormSectionTitle>
        </FormSectionHeader>
        
        <FormGroup>
          <FormLabel>Headers</FormLabel>
          <TagContainer>
            {config.exposed_headers.map((header, index) => (
              <Tag key={index}>
                <span>{header}</span>
                <TagRemoveButton onClick={() => removeExposedHeader(header)}>
                  <X size={12} />
                </TagRemoveButton>
              </Tag>
            ))}
          </TagContainer>
          
          <TagInputContainer>
            <TagInput
              type="text"
              value={newExposedHeader}
              onChange={(e) => setNewExposedHeader(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, addExposedHeader)}
              placeholder="X-Total-Count, X-Page-Count, etc."
            />
            <Button
              onClick={addExposedHeader}
              variant="secondary"
              size="small"
              disabled={!newExposedHeader.trim()}
            >
              <Plus size={16} />
              Add
            </Button>
          </TagInputContainer>
          <FormHelpText>
            Headers exposed to the client in cross-origin responses.
          </FormHelpText>
        </FormGroup>
      </FormSection>

      {/* Other CORS Settings */}
      <FormSection>
        <FormSectionHeader>
          <FormSectionTitle>Other CORS Settings</FormSectionTitle>
        </FormSectionHeader>
        
        <FormGrid>
          <FormGroup>
            <FormLabel>Max Age (seconds)</FormLabel>
            <FormInput
              type="number"
              min="0"
              max="86400"
              value={config.max_age}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                handleFieldChange('max_age', Number.isNaN(v) ? config.max_age : v);
              }}
            />
            <FormHelpText>How long browsers can cache preflight requests (0-86400 seconds)</FormHelpText>
          </FormGroup>

          <CheckboxContainer>
            <FormCheckbox
              type="checkbox"
              id="allow_credentials"
              checked={config.allow_credentials}
              onChange={(e) => handleFieldChange('allow_credentials', e.target.checked)}
            />
            <CheckboxLabel htmlFor="allow_credentials">
              Allow Credentials
            </CheckboxLabel>
          </CheckboxContainer>
        </FormGrid>
        <FormHelpText>
          Allow credentials (cookies, authorization headers) in cross-origin requests.
        </FormHelpText>
      </FormSection>

      <ActionButtons>
        <Button
          onClick={handleReset}
          variant="secondary"
          size="medium"
          disabled={saving || !hasChanges}
        >
          <RefreshCw size={16} />
          Reset Changes
        </Button>
        
        <Button
          onClick={handleSave}
          variant="primary"
          size="medium"
          disabled={saving || !hasChanges}
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          Save Configuration
        </Button>
      </ActionButtons>
    </FormContainer>
  );
};
