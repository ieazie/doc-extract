/**
 * Security Configuration Form
 * Functional form for editing security policies and compromise detection
 */
import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Shield, AlertTriangle, AlertCircle } from 'lucide-react';
import { SecurityConfig } from '../../services/api/tenants/types/tenants';
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
  FormTextarea,
  FormCheckbox,
  CheckboxContainer,
  CheckboxLabel,
  FormHelpText,
  FormError,
  ActionButtons,
  EnvironmentSelector,
  EnvironmentLabel,
  EnvironmentBadge,
  WarningText
} from './ConfigurationForms.styled';

interface SecurityConfigFormProps {
  tenantId: string;
  environment: 'development' | 'staging' | 'production';
  onConfigUpdated?: () => void;
}

export const SecurityConfigForm: React.FC<SecurityConfigFormProps> = ({
  tenantId,
  environment,
  onConfigUpdated
}) => {
  const [config, setConfig] = useState<SecurityConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const tenantService = serviceFactory.get<TenantService>('tenants');

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
  }, [tenantId, environment]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const securityConfig = await tenantService.getSecurityConfig(environment);
      
      if (securityConfig) {
        setConfig(securityConfig);
      } else {
        // Create default configuration based on environment
        const defaultConfig: SecurityConfig = {
          csrf_protection_enabled: environment !== 'development',
          csrf_token_header: 'X-CSRF-Token',
          rate_limiting_enabled: environment !== 'development',
          rate_limit_requests_per_minute: environment === 'production' ? 60 : 1000,
          rate_limit_burst_size: environment === 'production' ? 100 : 1000,
          encryption_key: '',
          security_headers_enabled: environment !== 'development',
          content_security_policy: environment === 'production' 
            ? "default-src 'self'; script-src 'self' 'unsafe-inline'"
            : undefined,
          strict_transport_security: environment === 'production',
          x_frame_options: environment === 'production' ? 'DENY' : 'SAMEORIGIN',
          x_content_type_options: environment !== 'development',
          referrer_policy: 'strict-origin-when-cross-origin',
          compromise_detection_enabled: environment === 'production',
          compromise_detection_threshold: 3,
          rapid_token_threshold: 10,
          auto_revoke_on_compromise: environment === 'production'
        };
        setConfig(defaultConfig);
      }
    } catch (err: any) {
      console.warn('No existing security config found, using defaults:', err);
      // Don't show error for missing configs, just use defaults
      const defaultSecurityConfig: SecurityConfig = {
        csrf_protection_enabled: environment !== 'development',
        csrf_token_header: 'X-CSRF-Token',
        rate_limiting_enabled: environment !== 'development',
        rate_limit_requests_per_minute: 60,
        rate_limit_burst_size: 100,
        encryption_key: '',
        security_headers_enabled: true,
        content_security_policy: environment === 'production' ? "default-src 'self'; script-src 'self' 'unsafe-inline'" : undefined,
        strict_transport_security: environment === 'production',
        x_frame_options: 'DENY',
        x_content_type_options: true,
        referrer_policy: 'strict-origin-when-cross-origin',
        compromise_detection_enabled: environment === 'production',
        compromise_detection_threshold: 3,
        rapid_token_threshold: 10,
        auto_revoke_on_compromise: environment === 'production',
      };
      setConfig(defaultSecurityConfig);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof SecurityConfig, value: any) => {
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
      
      await tenantService.updateSecurityConfig(config, environment);
      
      setSuccess('Security configuration saved successfully');
      setHasChanges(false);
      onConfigUpdated?.();
    } catch (err: any) {
      setError(`Failed to save security configuration: ${err.message}`);
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

  const generateEncryptionKey = () => {
    try {
      // Check if Web Crypto API is available
      const crypto = window.crypto || globalThis.crypto;
      if (!crypto || !crypto.getRandomValues) {
        throw new Error('Web Crypto API not available');
      }

      // Generate 32 bytes (256 bits) of cryptographically secure random data
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      
      // Convert to hex string
      const newKey = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      handleFieldChange('encryption_key', newKey);
    } catch (error) {
      console.error('Failed to generate secure encryption key:', error);
      setError('Failed to generate secure encryption key. Please try again.');
      setTimeout(() => setError(null), 5000);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!config) {
    return <ErrorMessage message="Failed to load security configuration" />;
  }

  return (
    <FormContainer>
      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      {/* CSRF Protection */}
      <FormSection>
        <FormSectionHeader>
          <FormSectionTitle>CSRF Protection</FormSectionTitle>
        </FormSectionHeader>
        
        <FormGrid>
          <CheckboxContainer>
            <FormCheckbox
              type="checkbox"
              id="csrf_protection_enabled"
              checked={config.csrf_protection_enabled}
              onChange={(e) => handleFieldChange('csrf_protection_enabled', e.target.checked)}
            />
            <CheckboxLabel htmlFor="csrf_protection_enabled">
              Enable CSRF Protection
            </CheckboxLabel>
          </CheckboxContainer>

          <FormGroup>
            <FormLabel>CSRF Token Header</FormLabel>
            <FormInput
              type="text"
              value={config.csrf_token_header}
              onChange={(e) => handleFieldChange('csrf_token_header', e.target.value)}
              disabled={!config.csrf_protection_enabled}
            />
            <FormHelpText>Header name for CSRF tokens</FormHelpText>
          </FormGroup>
        </FormGrid>
      </FormSection>

      {/* Rate Limiting */}
      <FormSection>
        <FormSectionHeader>
          <FormSectionTitle>Rate Limiting</FormSectionTitle>
        </FormSectionHeader>
        
        <FormGrid>
          <CheckboxContainer>
            <FormCheckbox
              type="checkbox"
              id="rate_limiting_enabled"
              checked={config.rate_limiting_enabled}
              onChange={(e) => handleFieldChange('rate_limiting_enabled', e.target.checked)}
            />
            <CheckboxLabel htmlFor="rate_limiting_enabled">
              Enable Rate Limiting
            </CheckboxLabel>
          </CheckboxContainer>

          <FormGroup>
            <FormLabel>Requests Per Minute</FormLabel>
            <FormInput
              type="number"
              min="1"
              max="1000"
              value={config.rate_limit_requests_per_minute}
              onChange={(e) => handleFieldChange('rate_limit_requests_per_minute', parseInt(e.target.value))}
              disabled={!config.rate_limiting_enabled}
            />
            <FormHelpText>Maximum requests per minute per client</FormHelpText>
          </FormGroup>

          <FormGroup>
            <FormLabel>Burst Size</FormLabel>
            <FormInput
              type="number"
              min="1"
              max="1000"
              value={config.rate_limit_burst_size}
              onChange={(e) => handleFieldChange('rate_limit_burst_size', parseInt(e.target.value))}
              disabled={!config.rate_limiting_enabled}
            />
            <FormHelpText>Maximum burst size for rate limiting</FormHelpText>
          </FormGroup>
        </FormGrid>
      </FormSection>

      {/* Security Headers */}
      <FormSection>
        <FormSectionHeader>
          <FormSectionTitle>Security Headers</FormSectionTitle>
        </FormSectionHeader>
        
        <FormGrid>
          <CheckboxContainer>
            <FormCheckbox
              type="checkbox"
              id="security_headers_enabled"
              checked={config.security_headers_enabled}
              onChange={(e) => handleFieldChange('security_headers_enabled', e.target.checked)}
            />
            <CheckboxLabel htmlFor="security_headers_enabled">
              Enable Security Headers
            </CheckboxLabel>
          </CheckboxContainer>

          <FormGroup>
            <FormLabel>X-Frame-Options</FormLabel>
            <FormSelect
              value={config.x_frame_options}
              onChange={(e) => handleFieldChange('x_frame_options', e.target.value)}
              disabled={!config.security_headers_enabled}
            >
              <option value="DENY">DENY</option>
              <option value="SAMEORIGIN">SAMEORIGIN</option>
              <option value="ALLOW-FROM">ALLOW-FROM</option>
            </FormSelect>
            <FormHelpText>Controls frame embedding</FormHelpText>
          </FormGroup>

          <FormGroup>
            <FormLabel>Referrer Policy</FormLabel>
            <FormSelect
              value={config.referrer_policy}
              onChange={(e) => handleFieldChange('referrer_policy', e.target.value)}
              disabled={!config.security_headers_enabled}
            >
              <option value="no-referrer">No Referrer</option>
              <option value="no-referrer-when-downgrade">No Referrer When Downgrade</option>
              <option value="origin">Origin</option>
              <option value="origin-when-cross-origin">Origin When Cross-Origin</option>
              <option value="same-origin">Same Origin</option>
              <option value="strict-origin">Strict Origin</option>
              <option value="strict-origin-when-cross-origin">Strict Origin When Cross-Origin</option>
              <option value="unsafe-url">Unsafe URL</option>
            </FormSelect>
            <FormHelpText>Controls referrer information</FormHelpText>
          </FormGroup>
        </FormGrid>

        <FormGrid>
          <CheckboxContainer>
            <FormCheckbox
              type="checkbox"
              id="strict_transport_security"
              checked={config.strict_transport_security}
              onChange={(e) => handleFieldChange('strict_transport_security', e.target.checked)}
              disabled={!config.security_headers_enabled}
            />
            <CheckboxLabel htmlFor="strict_transport_security">
              Strict Transport Security (HSTS)
            </CheckboxLabel>
          </CheckboxContainer>

          <CheckboxContainer>
            <FormCheckbox
              type="checkbox"
              id="x_content_type_options"
              checked={config.x_content_type_options}
              onChange={(e) => handleFieldChange('x_content_type_options', e.target.checked)}
              disabled={!config.security_headers_enabled}
            />
            <CheckboxLabel htmlFor="x_content_type_options">
              X-Content-Type-Options
            </CheckboxLabel>
          </CheckboxContainer>
        </FormGrid>

        <FormGroup>
          <FormLabel>Content Security Policy</FormLabel>
          <FormTextarea
            value={config.content_security_policy || ''}
            onChange={(e) => handleFieldChange('content_security_policy', e.target.value)}
            disabled={!config.security_headers_enabled}
            placeholder="default-src 'self'; script-src 'self' 'unsafe-inline'"
          />
          <FormHelpText>
            Content Security Policy directive. Leave empty to disable CSP.
          </FormHelpText>
        </FormGroup>
      </FormSection>

      {/* Compromise Detection */}
      <FormSection>
        <FormSectionHeader>
          <FormSectionTitle>Compromise Detection</FormSectionTitle>
        </FormSectionHeader>
        
        <FormGrid>
          <CheckboxContainer>
            <FormCheckbox
              type="checkbox"
              id="compromise_detection_enabled"
              checked={config.compromise_detection_enabled}
              onChange={(e) => handleFieldChange('compromise_detection_enabled', e.target.checked)}
            />
            <CheckboxLabel htmlFor="compromise_detection_enabled">
              Enable Compromise Detection
            </CheckboxLabel>
          </CheckboxContainer>

          <FormGroup>
            <FormLabel>Detection Threshold</FormLabel>
            <FormInput
              type="number"
              min="1"
              max="10"
              value={config.compromise_detection_threshold}
              onChange={(e) => handleFieldChange('compromise_detection_threshold', parseInt(e.target.value))}
              disabled={!config.compromise_detection_enabled}
            />
            <FormHelpText>Minimum suspicious indicators to trigger detection</FormHelpText>
          </FormGroup>

          <FormGroup>
            <FormLabel>Rapid Token Threshold</FormLabel>
            <FormInput
              type="number"
              min="5"
              max="50"
              value={config.rapid_token_threshold}
              onChange={(e) => handleFieldChange('rapid_token_threshold', parseInt(e.target.value))}
              disabled={!config.compromise_detection_enabled}
            />
            <FormHelpText>Max tokens in 5 minutes before flagging</FormHelpText>
          </FormGroup>

          <CheckboxContainer>
            <FormCheckbox
              type="checkbox"
              id="auto_revoke_on_compromise"
              checked={config.auto_revoke_on_compromise}
              onChange={(e) => handleFieldChange('auto_revoke_on_compromise', e.target.checked)}
              disabled={!config.compromise_detection_enabled}
            />
            <CheckboxLabel htmlFor="auto_revoke_on_compromise">
              Auto-revoke tokens on compromise detection
            </CheckboxLabel>
          </CheckboxContainer>
        </FormGrid>

        {config.auto_revoke_on_compromise && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '12px', 
            background: '#fef3c7', 
            border: '1px solid #f59e0b', 
            borderRadius: '6px',
            marginTop: '12px'
          }}>
            <AlertTriangle size={16} color="#d97706" />
            <span style={{ fontSize: '14px', color: '#92400e' }}>
              <strong>Warning:</strong> Auto-revoke will automatically invalidate all user sessions 
              when compromise is detected. This may disrupt legitimate users.
            </span>
          </div>
        )}
      </FormSection>

      {/* Encryption */}
      <FormSection>
        <FormSectionHeader>
          <FormSectionTitle>Encryption</FormSectionTitle>
        </FormSectionHeader>
        
        <FormGroup>
          <FormLabel>Encryption Key</FormLabel>
          <div style={{ display: 'flex', gap: '8px' }}>
            <FormInput
              type="text"
              value={config.encryption_key ? "••••••••••••••••••••••••••••••••" : ""}
              onChange={(e) => handleFieldChange('encryption_key', e.target.value)}
              placeholder={config.encryption_key ? "Key is set (hidden for security)" : "No key set - enter or generate one"}
              style={{ 
                flex: 1,
                backgroundColor: config.encryption_key ? '#f0f9ff' : '#fef2f2',
                color: config.encryption_key ? '#0369a1' : '#dc2626',
                borderColor: config.encryption_key ? '#0ea5e9' : '#f87171'
              }}
              readOnly={!!config.encryption_key}
            />
            <Button
              onClick={generateEncryptionKey}
              variant="secondary"
              size="small"
            >
              {config.encryption_key ? "Generate New" : "Generate"}
            </Button>
          </div>
          <FormHelpText>
            {config.encryption_key 
              ? "✓ Encryption Key is configured and hidden for security"
              : "⚠️ No Encryption Key set - data encryption may not work properly"
            }
          </FormHelpText>
          {config.encryption_key && (
            <WarningText>
              <AlertCircle size={16} /> Changing this key may affect encrypted data.
            </WarningText>
          )}
        </FormGroup>
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
