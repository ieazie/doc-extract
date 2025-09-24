/**
 * Authentication Configuration Form
 * Functional form for editing JWT, cookie, and security settings
 */
import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertCircle } from 'lucide-react';
import { AuthenticationConfig } from '../../services/api/tenants/types/tenants';
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
  FormError,
  FormHelpText,
  ActionButtons,
  EnvironmentSelector,
  EnvironmentLabel,
  EnvironmentBadge,
  WarningText
} from './ConfigurationForms.styled';

interface AuthenticationConfigFormProps {
  tenantId: string;
  environment: 'development' | 'staging' | 'production';
  onConfigUpdated?: () => void;
}

export const AuthenticationConfigForm: React.FC<AuthenticationConfigFormProps> = ({
  tenantId,
  environment,
  onConfigUpdated
}) => {
  const [config, setConfig] = useState<AuthenticationConfig | null>(null);
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
      
      const authConfig = await tenantService.getAuthenticationConfig(environment);
      
      if (authConfig) {
        setConfig(authConfig);
      } else {
        // Create default configuration
        const defaultConfig: AuthenticationConfig = {
          jwt_secret_key: '',
          access_token_expire_minutes: 30,
          refresh_token_expire_days: 7,
          refresh_cookie_httponly: true,
          refresh_cookie_secure: environment === 'production',
          refresh_cookie_samesite: environment === 'production' ? 'strict' : 'lax',
          refresh_cookie_path: '/api/auth/refresh',
          max_login_attempts: 5,
          lockout_duration_minutes: 15,
          password_min_length: 8,
          require_2fa: false
        };
        setConfig(defaultConfig);
      }
    } catch (err: any) {
      console.warn('No existing auth config found, using defaults:', err);
      // Don't show error for missing configs, just use defaults
      const defaultConfig: AuthenticationConfig = {
        jwt_secret_key: '',
        access_token_expire_minutes: 30,
        refresh_token_expire_days: 7,
        refresh_cookie_httponly: true,
        refresh_cookie_secure: environment === 'production',
        refresh_cookie_samesite: environment === 'production' ? 'strict' : 'lax',
        refresh_cookie_path: '/api/auth/refresh',
        max_login_attempts: 5,
        lockout_duration_minutes: 15,
        password_min_length: 8,
        require_2fa: false
      };
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof AuthenticationConfig, value: any) => {
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
      
      await tenantService.updateAuthenticationConfig(config, environment);
      
      setSuccess('Authentication configuration saved successfully');
      setHasChanges(false);
      onConfigUpdated?.();
    } catch (err: any) {
      setError(`Failed to save authentication configuration: ${err.message}`);
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

  const generateSecretKey = () => {
    const newKey = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    handleFieldChange('jwt_secret_key', newKey);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!config) {
    return <ErrorMessage message="Failed to load authentication configuration" />;
  }

  return (
    <FormContainer>
      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      {/* JWT Configuration */}
      <FormSection>
        <FormSectionHeader>
          <FormSectionTitle>JWT Configuration</FormSectionTitle>
        </FormSectionHeader>
        
        <FormGrid>
          <FormGroup>
            <FormLabel>Access Token Expiry (minutes)</FormLabel>
            <FormInput
              type="number"
              min="1"
              max="1440"
              value={config.access_token_expire_minutes}
              onChange={(e) => handleFieldChange('access_token_expire_minutes', parseInt(e.target.value))}
            />
            <FormHelpText>How long access tokens remain valid (1-1440 minutes)</FormHelpText>
          </FormGroup>

          <FormGroup>
            <FormLabel>Refresh Token Expiry (days)</FormLabel>
            <FormInput
              type="number"
              min="1"
              max="365"
              value={config.refresh_token_expire_days}
              onChange={(e) => handleFieldChange('refresh_token_expire_days', parseInt(e.target.value))}
            />
            <FormHelpText>How long refresh tokens remain valid (1-365 days)</FormHelpText>
          </FormGroup>
        </FormGrid>

        <FormGroup>
          <FormLabel>JWT Secret Key</FormLabel>
          <div style={{ display: 'flex', gap: '8px' }}>
            <FormInput
              type="text"
              value={config.jwt_secret_key ? "••••••••••••••••••••••••••••••••" : ""}
              onChange={(e) => handleFieldChange('jwt_secret_key', e.target.value)}
              placeholder={config.jwt_secret_key ? "Key is set (hidden for security)" : "No key set - enter or generate one"}
              style={{ 
                flex: 1,
                backgroundColor: config.jwt_secret_key ? '#f0f9ff' : '#fef2f2',
                color: config.jwt_secret_key ? '#0369a1' : '#dc2626',
                borderColor: config.jwt_secret_key ? '#0ea5e9' : '#f87171'
              }}
              readOnly={!!config.jwt_secret_key}
            />
            <Button
              onClick={generateSecretKey}
              variant="secondary"
              size="small"
            >
              {config.jwt_secret_key ? "Generate New" : "Generate"}
            </Button>
          </div>
          <FormHelpText>
            {config.jwt_secret_key 
              ? "✓ JWT Secret Key is configured and hidden for security"
              : "⚠️ No JWT Secret Key set - authentication will not work properly"
            }
          </FormHelpText>
          {config.jwt_secret_key && (
            <WarningText>
              <AlertCircle size={16} /> Changing this key will invalidate all existing tokens.
            </WarningText>
          )}
        </FormGroup>
      </FormSection>

      {/* Cookie Configuration */}
      <FormSection>
        <FormSectionHeader>
          <FormSectionTitle>Cookie Configuration</FormSectionTitle>
        </FormSectionHeader>
        
        <FormGrid>
          <FormGroup>
            <FormLabel>Cookie SameSite Policy</FormLabel>
            <FormSelect
              value={config.refresh_cookie_samesite}
              onChange={(e) => handleFieldChange('refresh_cookie_samesite', e.target.value)}
            >
              <option value="strict">Strict</option>
              <option value="lax">Lax</option>
              <option value="none">None</option>
            </FormSelect>
            <FormHelpText>Controls when cookies are sent with cross-site requests</FormHelpText>
          </FormGroup>

          <FormGroup>
            <FormLabel>Cookie Path</FormLabel>
            <FormInput
              type="text"
              value={config.refresh_cookie_path}
              onChange={(e) => handleFieldChange('refresh_cookie_path', e.target.value)}
            />
            <FormHelpText>Path where the refresh cookie is accessible</FormHelpText>
          </FormGroup>
        </FormGrid>

        <FormGrid>
          <CheckboxContainer>
            <FormCheckbox
              type="checkbox"
              id="refresh_cookie_httponly"
              checked={config.refresh_cookie_httponly}
              onChange={(e) => handleFieldChange('refresh_cookie_httponly', e.target.checked)}
            />
            <CheckboxLabel htmlFor="refresh_cookie_httponly">
              HttpOnly Cookie
            </CheckboxLabel>
          </CheckboxContainer>

          <CheckboxContainer>
            <FormCheckbox
              type="checkbox"
              id="refresh_cookie_secure"
              checked={config.refresh_cookie_secure}
              onChange={(e) => handleFieldChange('refresh_cookie_secure', e.target.checked)}
            />
            <CheckboxLabel htmlFor="refresh_cookie_secure">
              Secure Cookie
            </CheckboxLabel>
          </CheckboxContainer>
        </FormGrid>
      </FormSection>

      {/* Security Policies */}
      <FormSection>
        <FormSectionHeader>
          <FormSectionTitle>Security Policies</FormSectionTitle>
        </FormSectionHeader>
        
        <FormGrid>
          <FormGroup>
            <FormLabel>Max Login Attempts</FormLabel>
            <FormInput
              type="number"
              min="1"
              max="20"
              value={config.max_login_attempts}
              onChange={(e) => handleFieldChange('max_login_attempts', parseInt(e.target.value))}
            />
            <FormHelpText>Number of failed login attempts before lockout</FormHelpText>
          </FormGroup>

          <FormGroup>
            <FormLabel>Lockout Duration (minutes)</FormLabel>
            <FormInput
              type="number"
              min="1"
              max="1440"
              value={config.lockout_duration_minutes}
              onChange={(e) => handleFieldChange('lockout_duration_minutes', parseInt(e.target.value))}
            />
            <FormHelpText>How long accounts are locked after max attempts</FormHelpText>
          </FormGroup>

          <FormGroup>
            <FormLabel>Minimum Password Length</FormLabel>
            <FormInput
              type="number"
              min="4"
              max="128"
              value={config.password_min_length}
              onChange={(e) => handleFieldChange('password_min_length', parseInt(e.target.value))}
            />
            <FormHelpText>Minimum required password length</FormHelpText>
          </FormGroup>

          <CheckboxContainer>
            <FormCheckbox
              type="checkbox"
              id="require_2fa"
              checked={config.require_2fa}
              onChange={(e) => handleFieldChange('require_2fa', e.target.checked)}
            />
            <CheckboxLabel htmlFor="require_2fa">
              Require Two-Factor Authentication
            </CheckboxLabel>
          </CheckboxContainer>
        </FormGrid>
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
