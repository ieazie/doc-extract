/**
 * Language Configuration Component
 * Manages tenant language settings including supported languages, default language, and validation rules
 */
import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Info,
  Languages,
  Settings,
  Shield
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { SuccessMessage } from '@/components/common/SuccessMessage';
import Button from '@/components/ui/Button';
import { 
  apiClient, 
  SupportedLanguage, 
  TenantLanguageConfig, 
  TenantLanguageConfigUpdate,
  LanguageDetectionResult 
} from '@/services/api';
import {
  ConfigurationContainer,
  SectionCard,
  SectionHeader,
  SectionTitle,
  FormGroup,
  Label,
  MultiSelectContainer,
  MultiSelectDropdown,
  SelectedLanguage,
  RemoveButton,
  DropdownList,
  DropdownItem,
  LanguageName,
  LanguageCode,
  SelectContainer,
  Select,
  CheckboxContainer,
  Checkbox,
  CheckboxLabel,
  HelpText,
  TestSection,
  TestInput,
  DetectionResult,
  DetectionText,
  ConfidenceBar,
  ConfidenceFill,
  ActionButtons
} from './LanguageConfiguration.styled';


interface LanguageConfigurationProps {
  tenantId: string;
}

export const LanguageConfiguration: React.FC<LanguageConfigurationProps> = ({ tenantId }) => {
  const [config, setConfig] = useState<TenantLanguageConfig | null>(null);
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Multi-select state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Test detection state
  const [testText, setTestText] = useState('');
  const [detectionResult, setDetectionResult] = useState<LanguageDetectionResult | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadConfiguration();
  }, [tenantId]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const [configData, languagesData] = await Promise.all([
        apiClient.getTenantLanguageConfig(tenantId),
        apiClient.getSupportedLanguages()
      ]);
      
      setConfig(configData);
      setSupportedLanguages(languagesData);
    } catch (error) {
      console.error('Failed to load language configuration:', error);
      setMessage({ type: 'error', text: 'Failed to load language configuration' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    
    try {
      setSaving(true);
      setMessage(null);
      
      const updateData: TenantLanguageConfigUpdate = {
        supported_languages: config.supported_languages,
        default_language: config.default_language,
        auto_detect_language: config.auto_detect_language,
        require_language_match: config.require_language_match
      };
      
      const updatedConfig = await apiClient.updateTenantLanguageConfig(tenantId, updateData);
      setConfig(updatedConfig);
      setMessage({ type: 'success', text: 'Language configuration saved successfully' });
    } catch (error) {
      console.error('Failed to save language configuration:', error);
      setMessage({ type: 'error', text: 'Failed to save language configuration' });
    } finally {
      setSaving(false);
    }
  };

  const toggleLanguage = (languageCode: string) => {
    if (!config) return;
    
    const isSelected = config.supported_languages.includes(languageCode);
    const newLanguages = isSelected
      ? config.supported_languages.filter(lang => lang !== languageCode)
      : [...config.supported_languages, languageCode];
    
    // Prevent removing the last remaining language
    if (isSelected && config.supported_languages.length === 1) {
      return; // Can't remove the only supported language
    }
    
    setConfig({
      ...config,
      supported_languages: newLanguages,
      // Update default language if it was removed
      default_language:
        config.default_language === languageCode && isSelected
          ? newLanguages[0] // guaranteed by the guard above
          : config.default_language
    });
  };

  const handleDefaultLanguageChange = (languageCode: string) => {
    if (!config) return;
    
    // Ensure the default language is in supported languages
    const supportedLanguages = config.supported_languages.includes(languageCode)
      ? config.supported_languages
      : [...config.supported_languages, languageCode];
    
    setConfig({
      ...config,
      default_language: languageCode,
      supported_languages: supportedLanguages
    });
  };

  const testLanguageDetection = async () => {
    if (!testText.trim()) return;
    
    try {
      setTesting(true);
      const result = await apiClient.detectDocumentLanguage(testText);
      setDetectionResult(result);
    } catch (error) {
      console.error('Language detection test failed:', error);
      setDetectionResult({
        language: 'unknown',
        confidence: 0,
        source: 'error'
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!config) {
    return <ErrorMessage message="Failed to load language configuration" />;
  }

  const availableLanguages = supportedLanguages.filter(lang => 
    !config.supported_languages.includes(lang.code)
  );

  return (
    <ConfigurationContainer>
      {message && (
        message.type === 'success' ? 
          <SuccessMessage message={message.text} /> : 
          <ErrorMessage message={message.text} />
      )}

      {/* Supported Languages Configuration */}
      <SectionCard>
        <SectionHeader>
          <Languages size={20} />
          <SectionTitle>Supported Languages</SectionTitle>
        </SectionHeader>
        
        <FormGroup>
          <Label>Select Languages</Label>
          <MultiSelectContainer>
            <MultiSelectDropdown
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              aria-controls="language-dropdown"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {config.supported_languages.length === 0 ? (
                <span style={{ color: '#9ca3af' }}>Select languages...</span>
              ) : (
                config.supported_languages.map(langCode => {
                  const language = supportedLanguages.find(l => l.code === langCode);
                  return (
                    <SelectedLanguage key={langCode}>
                      {language?.native_name || language?.name || langCode}
                      <RemoveButton onClick={(e) => {
                        e.stopPropagation();
                        toggleLanguage(langCode);
                      }}>
                        ×
                      </RemoveButton>
                    </SelectedLanguage>
                  );
                })
              )}
            </MultiSelectDropdown>
            
            <DropdownList id="language-dropdown" role="listbox" $isOpen={isDropdownOpen}>
              {availableLanguages.map(language => (
                <DropdownItem
                  key={language.code}
                  $isSelected={false}
                  onClick={() => {
                    toggleLanguage(language.code);
                    setIsDropdownOpen(false);
                  }}
                >
                  <LanguageName>{language.native_name}</LanguageName>
                  <LanguageCode>({language.code})</LanguageCode>
                </DropdownItem>
              ))}
            </DropdownList>
          </MultiSelectContainer>
          <HelpText>
            Select the languages your tenant will support for document processing
          </HelpText>
        </FormGroup>

        <FormGroup>
          <Label>Default Language</Label>
          <SelectContainer>
            <Select
              value={config.default_language}
              onChange={(e) => handleDefaultLanguageChange(e.target.value)}
            >
              {config.supported_languages.map(langCode => {
                const language = supportedLanguages.find(l => l.code === langCode);
                return (
                  <option key={langCode} value={langCode}>
                    {language?.native_name || language?.name || langCode}
                  </option>
                );
              })}
            </Select>
          </SelectContainer>
          <HelpText>
            The default language used when no specific language is configured
          </HelpText>
        </FormGroup>
      </SectionCard>

      {/* Language Detection Settings */}
      <SectionCard>
        <SectionHeader>
          <Settings size={20} />
          <SectionTitle>Language Detection Settings</SectionTitle>
        </SectionHeader>
        
        <FormGroup>
          <CheckboxContainer>
            <Checkbox
              type="checkbox"
              id="auto-detect"
              checked={config.auto_detect_language}
              onChange={(e) => setConfig({
                ...config,
                auto_detect_language: e.target.checked
              })}
            />
            <CheckboxLabel htmlFor="auto-detect">
              Automatically detect document language
            </CheckboxLabel>
          </CheckboxContainer>
          <HelpText>
            When enabled, the system will automatically detect the language of uploaded documents
          </HelpText>
        </FormGroup>

        <FormGroup>
          <CheckboxContainer>
            <Checkbox
              type="checkbox"
              id="require-match"
              checked={config.require_language_match}
              onChange={(e) => setConfig({
                ...config,
                require_language_match: e.target.checked
              })}
            />
            <CheckboxLabel htmlFor="require-match">
              Require language match for extraction
            </CheckboxLabel>
          </CheckboxContainer>
          <HelpText>
            When enabled, extraction will only proceed if the document language matches the template language
          </HelpText>
        </FormGroup>
      </SectionCard>

      {/* Language Detection Test */}
      <SectionCard>
        <SectionHeader>
          <Globe size={20} />
          <SectionTitle>Test Language Detection</SectionTitle>
        </SectionHeader>
        
        <TestSection>
          <FormGroup>
            <Label>Test Text</Label>
            <TestInput
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter text in any language to test detection..."
            />
          </FormGroup>
          
          <Button
            onClick={testLanguageDetection}
            disabled={!testText.trim() || testing}
            size="small"
          >
            {testing ? <LoadingSpinner size={16} /> : <Globe size={16} />}
            {testing ? 'Detecting...' : 'Test Detection'}
          </Button>
          
          {detectionResult && (
            <DetectionResult $confidence={detectionResult.confidence}>
              <DetectionText>
                <strong>Detected Language:</strong> {detectionResult.language}
                <br />
                <strong>Confidence:</strong> {(detectionResult.confidence * 100).toFixed(1)}%
                <br />
                <strong>Source:</strong> {detectionResult.source}
              </DetectionText>
              <ConfidenceBar>
                <ConfidenceFill $width={detectionResult.confidence * 100} />
              </ConfidenceBar>
            </DetectionResult>
          )}
        </TestSection>
      </SectionCard>

      {/* Save Button */}
      <ActionButtons>
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="primary"
        >
          {saving ? <LoadingSpinner size={16} /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
        
        <Button
          onClick={loadConfiguration}
          disabled={saving}
          variant="outline"
        >
          <RefreshCw size={16} />
          Refresh
        </Button>
      </ActionButtons>
    </ConfigurationContainer>
  );
};

export default LanguageConfiguration;
