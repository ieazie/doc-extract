/**
 * Enhanced Template Builder Component
 * Schema definition with drag-and-drop field creation
 */
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { apiClient, GeneratedField, SupportedLanguage } from '../../services/api';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  ChevronDown, 
  ChevronRight,
  Settings,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  FileText,
  Sparkles,
  FileText as FileTextIcon,
  X
} from 'lucide-react';

// Types
interface Template {
  id?: string;
  name: string;
  description: string;
  document_type: string;
  schema: {
    fields: SchemaField[];
  };
  status: 'draft' | 'published' | 'archived';
  // Language configuration
  language?: string;
  auto_detect_language?: boolean;
  require_language_match?: boolean;
  extraction_settings?: {
    confidence_threshold?: number;
  };
}

// Language-specific prompt templates for each document type
const DEFAULT_PROMPTS = {
  en: {
    invoice: "Extract invoice number, invoice date, due date, vendor name, vendor address, line items (description, quantity, unit price, total), subtotal, tax amount, total amount, payment terms, and any additional notes.",
    receipt: "Extract receipt number, transaction date, merchant name, merchant address, items purchased (description, quantity, price), subtotal, tax amount, total amount, payment method, and any loyalty information.",
    contract: "Extract contract number, contract date, effective date, parties involved, contract value, payment terms, duration, key clauses, signatures, and any special conditions.",
    insurance_policy: "Extract policy number, policy holder name, policy type, coverage amount, premium amount, effective date, expiration date, beneficiaries, and key terms and conditions.",
    other: "Extract key information from this document based on its content and structure."
  },
  de: {
    invoice: "Extrahieren Sie Rechnungsnummer, Rechnungsdatum, Fälligkeitsdatum, Lieferantennamen, Lieferantenadresse, Positionen (Beschreibung, Menge, Einzelpreis, Gesamtbetrag), Zwischensumme, Steuerbetrag, Gesamtbetrag, Zahlungsbedingungen und zusätzliche Notizen.",
    receipt: "Extrahieren Sie Quittungsnummer, Transaktionsdatum, Händlername, Händleradresse, gekaufte Artikel (Beschreibung, Menge, Preis), Zwischensumme, Steuerbetrag, Gesamtbetrag, Zahlungsmethode und Treueinformationen.",
    contract: "Extrahieren Sie Vertragsnummer, Vertragsdatum, Gültigkeitsdatum, beteiligte Parteien, Vertragswert, Zahlungsbedingungen, Laufzeit, wichtige Klauseln, Unterschriften und besondere Bedingungen.",
    insurance_policy: "Extrahieren Sie Policennummer, Versicherungsnehmer, Versicherungstyp, Deckungssumme, Prämienbetrag, Gültigkeitsdatum, Ablaufdatum, Begünstigte und wichtige Bedingungen.",
    other: "Extrahieren Sie wichtige Informationen aus diesem Dokument basierend auf seinem Inhalt und seiner Struktur."
  },
  es: {
    invoice: "Extraer número de factura, fecha de factura, fecha de vencimiento, nombre del proveedor, dirección del proveedor, artículos (descripción, cantidad, precio unitario, total), subtotal, monto de impuestos, monto total, términos de pago y notas adicionales.",
    receipt: "Extraer número de recibo, fecha de transacción, nombre del comerciante, dirección del comerciante, artículos comprados (descripción, cantidad, precio), subtotal, monto de impuestos, monto total, método de pago e información de fidelidad.",
    contract: "Extraer número de contrato, fecha de contrato, fecha efectiva, partes involucradas, valor del contrato, términos de pago, duración, cláusulas clave, firmas y condiciones especiales.",
    insurance_policy: "Extraer número de póliza, nombre del asegurado, tipo de póliza, monto de cobertura, monto de prima, fecha efectiva, fecha de vencimiento, beneficiarios y términos y condiciones clave.",
    other: "Extraer información clave de este documento basándose en su contenido y estructura."
  }
};

// Helper function to get prompt based on language and document type
const getPromptForLanguageAndType = (language: string, documentType: string): string => {
  const lang = language || 'en';
  const prompts = DEFAULT_PROMPTS[lang as keyof typeof DEFAULT_PROMPTS] || DEFAULT_PROMPTS.en;
  return prompts[documentType as keyof typeof prompts] || prompts.other;
};

interface SchemaField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  children?: SchemaField[];
  expanded?: boolean;
}

interface TemplateBuilderProps {
  templateData: Partial<Template>;
  onTemplateChange: (template: Partial<Template>) => void;
  selectedDocument?: any; // Document being previewed
  isBasicInfoComplete?: boolean; // Whether basic information is complete
}

// Styled Components
const BuilderContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`;

const Section = styled.div`
  margin-bottom: 0;
  border: 1px solid #e5e7eb;
  border-radius: 0;
  background: white;
  
  &:first-child {
    border-top: none;
  }
  
  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
`;

const SectionHeader = styled.div`
  padding: 1rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  
  &:hover {
    background: #f3f4f6;
  }
`;

const SectionTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SectionContent = styled.div<{ $collapsed?: boolean }>`
  padding: ${props => props.$collapsed ? '0' : '1rem'};
  max-height: ${props => props.$collapsed ? '0' : 'none'};
  overflow: hidden;
  transition: all 0.3s ease;
`;

const CollapseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
  
  &:hover {
    background: #e5e7eb;
    color: #374151;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
`;

const HelpText = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
  line-height: 1.4;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  min-height: 80px;
  resize: vertical;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const FieldMappingSuggestions = styled.div`
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  color: #64748b;
`;

const SuggestionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  cursor: pointer;
  
  &:hover {
    color: #3b82f6;
  }
`;

const SuggestionIcon = styled.div`
  width: 12px;
  height: 12px;
  background: #e2e8f0;
  border-radius: 2px;
  flex-shrink: 0;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: white;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const FieldsContainer = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
  min-height: 200px;
`;

const FieldItem = styled.div<{ $level?: number }>`
  border-bottom: 1px solid #f3f4f6;
  padding: 0.75rem ${props => (props.$level || 0) * 1.5 + 0.75}rem 0.75rem 0.75rem;
  
  &:last-child {
    border-bottom: none;
  }
`;

const FieldHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const DragHandle = styled.div`
  cursor: grab;
  color: #9ca3af;
  
  &:active {
    cursor: grabbing;
  }
`;

const FieldName = styled.div`
  flex: 1;
  font-weight: 500;
  color: #374151;
`;

const FieldType = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
`;

const FieldActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
  
  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
`;

const ExpandButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  
  &:hover {
    color: #374151;
  }
`;

const FieldDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FieldInput = styled.input`
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const FieldTextArea = styled.textarea`
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  min-height: 60px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const FieldSelect = styled.select`
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Checkbox = styled.input`
  width: 1rem;
  height: 1rem;
`;

const CheckboxLabel = styled.label`
  font-size: 0.75rem;
  color: #374151;
  cursor: pointer;
`;

const AddFieldButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  
  &:hover {
    border-color: #3b82f6;
    color: #3b82f6;
    background: #f8fafc;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #9ca3af;
  text-align: center;
`;

const EmptyIcon = styled.div`
  width: 3rem;
  height: 3rem;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
`;

const EmptyText = styled.div`
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
`;

const EmptySubtext = styled.div`
  font-size: 0.75rem;
`;

const GenerateFieldsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
`;

const GenerateButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
  
  ${props => {
    if (props.$variant === 'primary') {
      return `
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
        &:hover:not(:disabled) {
          background: #2563eb;
        }
        &:disabled {
          background: #9ca3af;
          border-color: #9ca3af;
          cursor: not-allowed;
        }
      `;
    }
    return `
      background: white;
      color: #374151;
      border-color: #d1d5db;
      &:hover:not(:disabled) {
        background: #f9fafb;
        border-color: #9ca3af;
      }
      &:disabled {
        background: #f3f4f6;
        color: #9ca3af;
        cursor: not-allowed;
      }
    `;
  }}
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ButtonLabel = styled.div`
  font-size: 0.875rem;
  color: #374151;
  font-weight: 600;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TooltipIcon = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: #6b7280;
  color: white;
  border-radius: 50%;
  font-size: 10px;
  font-weight: bold;
  cursor: help;
  
  &:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #1f2937;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    white-space: normal;
    width: 280px;
    text-align: center;
    line-height: 1.4;
    z-index: ${props => props.theme.zIndex.tooltip};
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  
  &:hover::before {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(100%);
    border: 4px solid transparent;
    border-top-color: #1f2937;
    z-index: ${props => props.theme.zIndex.tooltip};
  }
`;

const ProgressContainer = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  border-radius: 4px;
  transition: width 0.3s ease;
  width: ${props => props.$progress}%;
`;

const ProgressText = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
  margin-bottom: 0.5rem;
`;

const CancelButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin: 0 auto;
  
  &:hover {
    background: #dc2626;
  }
`;

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'text': return <Type size={12} />;
    case 'number': return <Hash size={12} />;
    case 'date': return <Calendar size={12} />;
    case 'boolean': return <ToggleLeft size={12} />;
    case 'array': return <List size={12} />;
    case 'object': return <FileText size={12} />;
    default: return <Type size={12} />;
  }
};

const TemplateBuilder: React.FC<TemplateBuilderProps> = ({ 
  templateData, 
  onTemplateChange, 
  selectedDocument,
  isBasicInfoComplete = false
}) => {
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['basic']));
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [usedSuggestions, setUsedSuggestions] = useState<Set<string>>(new Set());
  
  // AI Field Generation State
  const [isGeneratingFields, setIsGeneratingFields] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lastGenerationTime, setLastGenerationTime] = useState<number>(0);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);
  const [promptWarning, setPromptWarning] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // Auth context for tenant information
  const { tenant } = useAuth();
  
  // Language configuration state
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguage[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(false);

  // Load tenant-specific supported languages on component mount
  useEffect(() => {
    const loadSupportedLanguages = async () => {
      if (!tenant?.id) return;
      
      try {
        setLoadingLanguages(true);
        
        // Get tenant-specific supported language codes
        const tenantLanguageCodes = await apiClient.getTenantSupportedLanguages(tenant.id);
        
        // Get all supported languages to get full language info (name, native_name)
        const allLanguages = await apiClient.getSupportedLanguages();
        
        // Filter to only tenant-supported languages
        const tenantLanguages = allLanguages.filter(lang => 
          tenantLanguageCodes.includes(lang.code)
        );
        
        setSupportedLanguages(tenantLanguages);
        
        // Set default language if not already set
        if (!templateData.language && tenantLanguages.length > 0) {
          // Try to get tenant's default language, fallback to English or first available
          try {
            const tenantDefaultLang = await apiClient.getTenantDefaultLanguage(tenant.id);
            const defaultLang = tenantLanguages.find(lang => lang.code === tenantDefaultLang) || 
                              tenantLanguages.find(lang => lang.code === 'en') || 
                              tenantLanguages[0];
            
            onTemplateChange({
              ...templateData,
              language: defaultLang.code,
              auto_detect_language: true,
              require_language_match: false
            });
          } catch (error) {
            console.warn('Failed to get tenant default language:', error);
            // Fallback to English or first available
            const defaultLang = tenantLanguages.find(lang => lang.code === 'en') || tenantLanguages[0];
            onTemplateChange({
              ...templateData,
              language: defaultLang.code,
              auto_detect_language: true,
              require_language_match: false
            });
          }
        }
      } catch (error) {
        console.error('Failed to load tenant supported languages:', error);
        // Fallback to loading all languages if tenant-specific loading fails
        try {
          const allLanguages = await apiClient.getSupportedLanguages();
          setSupportedLanguages(allLanguages);
        } catch (fallbackError) {
          console.error('Failed to load fallback languages:', fallbackError);
        }
      } finally {
        setLoadingLanguages(false);
      }
    };

    loadSupportedLanguages();
  }, [tenant?.id]);

  // Generate field mapping suggestions based on the document type
  const getFieldSuggestions = (fieldName: string, fieldId: string) => {
    if (!selectedDocument || activeFieldId !== fieldId) return [];
    
    const allSuggestions = [];
    const docType = templateData.document_type || 'invoice';
    
    // Common field suggestions based on the document type
    if (docType === 'invoice') {
      if (fieldName.toLowerCase().includes('number') || fieldName.toLowerCase().includes('id')) {
        allSuggestions.push('Invoice Number', 'Reference Number', 'Document ID');
      }
      if (fieldName.toLowerCase().includes('date')) {
        allSuggestions.push('Invoice Date', 'Due Date', 'Payment Date');
      }
      if (fieldName.toLowerCase().includes('amount') || fieldName.toLowerCase().includes('total')) {
        allSuggestions.push('Total Amount', 'Subtotal', 'Tax Amount');
      }
      if (fieldName.toLowerCase().includes('merchant') || fieldName.toLowerCase().includes('vendor')) {
        allSuggestions.push('Merchant Name', 'Vendor Address', 'Company Name');
      }
    }
    
    // Filter out used suggestions
    const availableSuggestions = allSuggestions.filter(suggestion => !usedSuggestions.has(suggestion));
    
    return availableSuggestions.slice(0, 3); // Limit to 3 suggestions
  };

  const handleSuggestionClick = (suggestion: string, fieldId: string) => {
    // Update the field name
    updateField(fieldId, { name: suggestion });
    
    // Mark suggestion as used
    setUsedSuggestions(prev => new Set(Array.from(prev).concat(suggestion)));
    
    // Clear active field to hide suggestions
    setActiveFieldId(null);
  };

  // Reset used suggestions when document changes
  useEffect(() => {
    setUsedSuggestions(new Set());
    setActiveFieldId(null);
  }, [selectedDocument]);

  const updateTemplate = (updates: Partial<Template>) => {
    onTemplateChange({ ...templateData, ...updates });
  };

  // Prompt vagueness detection
  const detectVaguePrompt = (prompt: string): string | null => {
    if (!prompt || prompt.length < 20) {
      return "Prompt is too short. Please provide more specific instructions.";
    }
    
    const vagueWords = ['stuff', 'things', 'information', 'data', 'details', 'content'];
    const vaguePhrases = ['extract everything', 'get all', 'find all', 'whatever', 'anything'];
    
    const lowerPrompt = prompt.toLowerCase();
    
    // Check for vague words
    const hasVagueWords = vagueWords.some(word => lowerPrompt.includes(word));
    const hasVaguePhrases = vaguePhrases.some(phrase => lowerPrompt.includes(phrase));
    
    if (hasVagueWords || hasVaguePhrases) {
      return "Prompt seems vague. Try being more specific about what fields to extract (e.g., 'Extract invoice number, date, total amount').";
    }
    
    // Check for lack of specific field names
    const fieldIndicators = ['number', 'date', 'amount', 'name', 'address', 'id', 'total', 'price', 'quantity'];
    const hasFieldIndicators = fieldIndicators.some(indicator => lowerPrompt.includes(indicator));
    
    if (!hasFieldIndicators) {
      return "Prompt lacks specific field names. Consider mentioning specific fields like 'invoice number', 'date', 'amount', etc.";
    }
    
    return null;
  };

  // Cancel generation function
  const cancelGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsGeneratingFields(false);
      setGenerationStep('');
      setGenerationProgress(0);
      setGenerationError('Generation cancelled by user');
      setTimeout(() => setGenerationError(null), 3000);
    }
  };

  const addField = (parentId?: string) => {
    const newField: SchemaField = {
      id: `field_${Date.now()}`,
      name: 'new_field',
      type: 'text',
      description: '',
      required: false,
      children: [],
      expanded: false
    };

    const fields = templateData.schema?.fields || [];
    
    if (parentId) {
      // Add as child field
      const updateFields = (fieldList: SchemaField[]): SchemaField[] => {
        return fieldList.map(field => {
          if (field.id === parentId) {
            return {
              ...field,
              children: [...(field.children || []), newField]
            };
          }
          if (field.children) {
            return {
              ...field,
              children: updateFields(field.children)
            };
          }
          return field;
        });
      };
      
      updateTemplate({
        schema: { fields: updateFields(fields) }
      });
    } else {
      // Add as top-level field
      updateTemplate({
        schema: { fields: [...fields, newField] }
      });
    }
  };

  const removeField = (fieldId: string) => {
    const fields = templateData.schema?.fields || [];
    
    const removeFieldRecursive = (fieldList: SchemaField[]): SchemaField[] => {
      return fieldList.filter(field => {
        if (field.id === fieldId) return false;
        if (field.children) {
          field.children = removeFieldRecursive(field.children);
        }
        return true;
      });
    };
    
    updateTemplate({
      schema: { fields: removeFieldRecursive(fields) }
    });
  };

  const updateField = (fieldId: string, updates: Partial<SchemaField>) => {
    const fields = templateData.schema?.fields || [];
    
    const updateFieldRecursive = (fieldList: SchemaField[]): SchemaField[] => {
      return fieldList.map(field => {
        if (field.id === fieldId) {
          return { ...field, ...updates };
        }
        if (field.children) {
          return {
            ...field,
            children: updateFieldRecursive(field.children)
          };
        }
        return field;
      });
    };
    
    updateTemplate({
      schema: { fields: updateFieldRecursive(fields) }
    });
  };

  const toggleFieldExpansion = (fieldId: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(fieldId)) {
      newExpanded.delete(fieldId);
    } else {
      newExpanded.add(fieldId);
    }
    setExpandedFields(newExpanded);
  };

  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId);
    } else {
      newCollapsed.add(sectionId);
    }
    setCollapsedSections(newCollapsed);
  };

  // AI Field Generation Functions
  const generateFieldsFromPrompt = async () => {
    if (!templateData.description) return;
    
    // Check for vague prompt
    const warning = detectVaguePrompt(templateData.description);
    if (warning) {
      setPromptWarning(warning);
      setTimeout(() => setPromptWarning(null), 8000); // Clear after 8 seconds
      // Continue with generation but show warning
    } else {
      setPromptWarning(null);
    }
    
    // Debouncing: Prevent requests within 2 seconds of each other
    const now = Date.now();
    if (now - lastGenerationTime < 2000) {
      console.log('Request debounced - too soon after last request');
      return;
    }
    
    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);
    
    setIsGeneratingFields(true);
    setGenerationError(null);
    setGenerationSuccess(null);
    setLastGenerationTime(now);
    setGenerationStep('Analyzing prompt...');
    setGenerationProgress(20);
    
    try {
      // Simulate progress updates
      setTimeout(() => {
        setGenerationStep('Generating fields with AI...');
        setGenerationProgress(60);
      }, 500);
      
      const response = await apiClient.generateFieldsFromPrompt({
        prompt: templateData.description,
        document_type: templateData.document_type || 'other'
      }, templateData.language || 'en');
      
      setGenerationStep('Processing results...');
      setGenerationProgress(90);
      
      if (response.success && response.fields.length > 0) {
        // Convert generated fields to schema format
        const newFields = response.fields.map((field: GeneratedField) => {
          const baseField = {
            id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: field.name,
            type: field.type as 'text' | 'number' | 'date' | 'boolean' | 'array' | 'object',
            description: field.description,
            required: field.required,
            children: []
          };
          
          // Add required nested properties for complex types
          if (field.type === 'array') {
            return {
              ...baseField,
              items: {
                type: 'text',
                description: 'Array item'
              }
            };
          } else if (field.type === 'object') {
            return {
              ...baseField,
              fields: {}
            };
          }
          
          return baseField;
        });
        
        // Add new fields to existing schema
        const currentFields = templateData.schema?.fields || [];
        const updatedFields = [...currentFields, ...newFields];
        
        updateTemplate({
          schema: {
            ...templateData.schema,
            fields: updatedFields
          }
        });
        
        // Success feedback
        setGenerationStep('Complete!');
        setGenerationProgress(100);
        setGenerationSuccess(`Successfully generated ${newFields.length} fields from prompt!`);
        setTimeout(() => {
          setGenerationSuccess(null);
          setGenerationStep('');
          setGenerationProgress(0);
        }, 5000); // Clear after 5 seconds
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation cancelled by user');
        return; // Don't show error for user cancellation
      }
      console.error('Error generating fields from prompt:', error);
      setGenerationError(error.response?.data?.detail || 'Failed to generate fields from prompt');
      setGenerationStep('');
      setGenerationProgress(0);
    } finally {
      setIsGeneratingFields(false);
      setAbortController(null);
    }
  };

  const generateFieldsFromDocument = async () => {
    if (!templateData.description || !selectedDocument) return;
    
    // Debouncing: Prevent requests within 2 seconds of each other
    const now = Date.now();
    if (now - lastGenerationTime < 2000) {
      console.log('Request debounced - too soon after last request');
      return;
    }
    
    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);
    
    setIsGeneratingFields(true);
    setGenerationError(null);
    setGenerationSuccess(null);
    setLastGenerationTime(now);
    setGenerationStep('Extracting document content...');
    setGenerationProgress(10);
    
    try {
      let documentContent = "";
      
      console.log('Selected document:', selectedDocument);
      console.log('Document ID:', selectedDocument.id);
      console.log('Document file:', selectedDocument.file);
      
      // Check if document is uploaded to server (has UUID) or is local file
      if (selectedDocument.id && !selectedDocument.id.startsWith('doc_')) {
        // Document is uploaded to server, fetch content via API
        setGenerationStep('Fetching document content...');
        setGenerationProgress(30);
        try {
          const contentResponse = await apiClient.getDocumentContent(selectedDocument.id);
          documentContent = contentResponse.content;
        } catch (error) {
          console.error('Failed to fetch document content:', error);
          setGenerationError('Failed to fetch document content. Please try again.');
          return;
        }
      } else if (selectedDocument.file) {
        // Document is local file, extract text directly
        try {
          if (selectedDocument.file.type === 'text/plain') {
            documentContent = await selectedDocument.file.text();
          } else if (selectedDocument.file.type === 'application/pdf') {
            // For PDF files, we need to extract text using PDF.js
            // This is a simplified approach - in production you might want to use a more robust PDF text extraction
            documentContent = "PDF content extraction not implemented for local files. Please upload the document to the server first.";
          } else {
            documentContent = "Document type not supported for local text extraction.";
          }
        } catch (error) {
          console.error('Failed to extract text from local file:', error);
          setGenerationError('Failed to extract text from document. Please try uploading the document first.');
          return;
        }
      } else {
        setGenerationError('No document content available. Please upload a document first.');
        return;
      }
      
      console.log('Extracted document content length:', documentContent.length);
      console.log('Document content preview:', documentContent.substring(0, 200) + '...');
      
      // Validate document content length
      if (documentContent.length < 50) {
        setGenerationError('Document content is too short. Please ensure the document contains sufficient text.');
        setGenerationStep('');
        setGenerationProgress(0);
        return;
      }
      
      setGenerationStep('Analyzing document with AI...');
      setGenerationProgress(60);
      
      const response = await apiClient.generateFieldsFromDocument({
        prompt: templateData.description,
        document_type: templateData.document_type || 'other',
        document_content: documentContent
      }, 
      templateData.language || 'en',
      templateData.auto_detect_language ?? true,
      templateData.require_language_match ?? false
      );
      
      setGenerationStep('Processing results...');
      setGenerationProgress(90);
      
      if (response.success && response.fields.length > 0) {
        // Convert generated fields to schema format
        const newFields = response.fields.map((field: GeneratedField) => ({
          id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: field.name,
          type: field.type as 'text' | 'number' | 'date' | 'boolean' | 'array' | 'object',
          description: field.description,
          required: field.required,
          children: []
        }));
        
        // Add new fields to existing schema
        const currentFields = templateData.schema?.fields || [];
        const updatedFields = [...currentFields, ...newFields];
        
        updateTemplate({
          schema: {
            ...templateData.schema,
            fields: updatedFields
          }
        });
        
        // Success feedback
        setGenerationStep('Complete!');
        setGenerationProgress(100);
        setGenerationSuccess(`Successfully generated ${newFields.length} fields from document!`);
        setTimeout(() => {
          setGenerationSuccess(null);
          setGenerationStep('');
          setGenerationProgress(0);
        }, 5000); // Clear after 5 seconds
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation cancelled by user');
        return; // Don't show error for user cancellation
      }
      console.error('Error generating fields from document:', error);
      setGenerationError(error.response?.data?.detail || 'Failed to generate fields from document');
      setGenerationStep('');
      setGenerationProgress(0);
    } finally {
      setIsGeneratingFields(false);
      setAbortController(null);
    }
  };

  const renderField = (field: SchemaField, level: number = 0) => {
    const isExpanded = expandedFields.has(field.id);
    const hasChildren = field.children && field.children.length > 0;

    return (
      <FieldItem key={field.id} $level={level}>
        <FieldHeader>
          {hasChildren && (
            <ExpandButton onClick={() => toggleFieldExpansion(field.id)}>
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </ExpandButton>
          )}
          
          <DragHandle>
            <GripVertical size={14} />
          </DragHandle>
          
          <FieldName>{field.name}</FieldName>
          
          <FieldType>
            {getTypeIcon(field.type)}
            {field.type}
          </FieldType>
          
          <FieldActions>
            <ActionButton onClick={() => addField(field.id)}>
              <Plus size={12} />
            </ActionButton>
            <ActionButton onClick={() => removeField(field.id)}>
              <Trash2 size={12} />
            </ActionButton>
          </FieldActions>
        </FieldHeader>
        
        <FieldDetails>
          <FieldInput
            value={field.name}
            onChange={(e) => updateField(field.id, { name: e.target.value })}
            onFocus={() => setActiveFieldId(field.id)}
            onBlur={() => {
              // Delay hiding suggestions to allow clicking on them
              setTimeout(() => setActiveFieldId(null), 200);
            }}
            placeholder="Field name"
          />
          
          {getFieldSuggestions(field.name, field.id).length > 0 && (
            <FieldMappingSuggestions>
              <div style={{ marginBottom: '0.5rem', fontWeight: '500' }}>
                💡 Suggested mappings:
              </div>
              {getFieldSuggestions(field.name, field.id).map((suggestion, index) => (
                <SuggestionItem 
                  key={index}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur
                    handleSuggestionClick(suggestion, field.id);
                  }}
                >
                  <SuggestionIcon />
                  {suggestion}
                </SuggestionItem>
              ))}
            </FieldMappingSuggestions>
          )}
          
          <FieldSelect
            value={field.type}
            onChange={(e) => updateField(field.id, { type: e.target.value as any })}
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="boolean">Boolean</option>
            <option value="array">Array</option>
            <option value="object">Object</option>
          </FieldSelect>
          
          <FieldTextArea
            value={field.description}
            onChange={(e) => updateField(field.id, { description: e.target.value })}
            placeholder="Field description"
          />
          
          <CheckboxContainer>
            <Checkbox
              type="checkbox"
              checked={field.required}
              onChange={(e) => updateField(field.id, { required: e.target.checked })}
            />
            <CheckboxLabel>Required field</CheckboxLabel>
          </CheckboxContainer>
        </FieldDetails>
        
        {isExpanded && hasChildren && (
          <div style={{ marginTop: '0.5rem' }}>
            {field.children?.map(child => renderField(child, level + 1))}
          </div>
        )}
      </FieldItem>
    );
  };

  return (
    <BuilderContainer>
      <Section>
        <SectionHeader onClick={() => toggleSection('basic')}>
          <SectionTitle>
            <Settings size={16} />
            Basic Information
            {!isBasicInfoComplete && (
              <span style={{ 
                background: '#f59e0b', 
                color: 'white', 
                borderRadius: '50%', 
                width: '20px', 
                height: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '0.75rem',
                marginLeft: '0.5rem'
              }}>
                !
              </span>
            )}
          </SectionTitle>
          <CollapseButton>
            {collapsedSections.has('basic') ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </CollapseButton>
        </SectionHeader>
        
        <SectionContent $collapsed={collapsedSections.has('basic')}>
          <FormGroup>
            <Label>Template Name</Label>
            <Input
              value={templateData.name || ''}
              onChange={(e) => updateTemplate({ name: e.target.value })}
              placeholder="Enter template name"
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Document Type</Label>
            <Select
              value={templateData.document_type || 'manual'}
              onChange={(e) => {
                const newDocumentType = e.target.value;
                updateTemplate({ 
                  document_type: newDocumentType,
                  // Auto-generate prompt when document type changes (except for manual)
                  description: newDocumentType === 'manual' ? '' : getPromptForLanguageAndType(templateData.language || 'en', newDocumentType)
                });
              }}
            >
              <option value="manual">Manual (Custom Prompt)</option>
              <option value="invoice">Invoice</option>
              <option value="contract">Contract</option>
              <option value="insurance_policy">Insurance Policy</option>
              <option value="receipt">Receipt</option>
              <option value="other">Other</option>
            </Select>
          </FormGroup>
          
          {/* Language Configuration */}
          <FormGroup>
            <Label>Template Language</Label>
            <Select
              value={templateData.language || 'en'}
              onChange={(e) => {
                const newLanguage = e.target.value;
                updateTemplate({ 
                  language: newLanguage,
                  // Update prompt to match new language if document type is not manual
                  description: templateData.document_type === 'manual' 
                    ? templateData.description 
                    : getPromptForLanguageAndType(newLanguage, templateData.document_type || 'other')
                });
              }}
              disabled={loadingLanguages}
            >
              {supportedLanguages.map(language => (
                <option key={language.code} value={language.code}>
                  {language.native_name} ({language.code})
                </option>
              ))}
            </Select>
            <HelpText>
              The language this template will use for extraction prompts and responses
            </HelpText>
          </FormGroup>
          
          <FormGroup>
            <CheckboxContainer>
              <Checkbox
                type="checkbox"
                id="auto-detect-language"
                checked={templateData.auto_detect_language ?? true}
                onChange={(e) => updateTemplate({ auto_detect_language: e.target.checked })}
              />
              <CheckboxLabel htmlFor="auto-detect-language">
                Automatically detect document language
              </CheckboxLabel>
            </CheckboxContainer>
            <HelpText>
              When enabled, the system will detect the language of uploaded documents
            </HelpText>
          </FormGroup>
          
          <FormGroup>
            <CheckboxContainer>
              <Checkbox
                type="checkbox"
                id="require-language-match"
                checked={templateData.require_language_match ?? false}
                onChange={(e) => updateTemplate({ require_language_match: e.target.checked })}
              />
              <CheckboxLabel htmlFor="require-language-match">
                Require language match for extraction
              </CheckboxLabel>
            </CheckboxContainer>
            <HelpText>
              When enabled, extraction will only proceed if the document language matches this template's language
            </HelpText>
          </FormGroup>
          
          <FormGroup>
            <Label>Extraction Prompt</Label>
            <TextArea
              value={templateData.description || ''}
              onChange={(e) => updateTemplate({ description: e.target.value })}
              placeholder="Provide instructions for the AI on what to extract from documents (e.g., 'Extract invoice number, date, total amount, and vendor information')"
              rows={4}
              disabled={templateData.document_type === 'manual'}
            />
            <HelpText>
              {templateData.document_type === 'manual' 
                ? "Select a document type above to auto-generate a prompt, or choose 'Manual' to write your own custom prompt."
                : "This prompt is auto-generated based on the document type. You can customize it after selecting a different document type."
              }
            </HelpText>
          </FormGroup>
          
          {/* Generate Fields Buttons */}
          {templateData.description && (
            <GenerateFieldsContainer>
              <ButtonGroup>
                <ButtonLabel>
                  AI-Powered Field Generation
                  <TooltipIcon data-tooltip="Generate fields based on your prompt description. Best for general document types.">
                    ?
                  </TooltipIcon>
                </ButtonLabel>
                <GenerateButton
                  onClick={generateFieldsFromPrompt}
                  disabled={isGeneratingFields}
                >
                  <Sparkles size={16} />
                  {isGeneratingFields ? 'Generating...' : 'Generate from Prompt'}
                </GenerateButton>
              </ButtonGroup>
              
              {selectedDocument && (
                <ButtonGroup>
                  <ButtonLabel>
                    Enhanced with Document
                    <TooltipIcon data-tooltip="Generate fields by analyzing both your prompt and the uploaded document content. More accurate for specific documents.">
                      ?
                    </TooltipIcon>
                  </ButtonLabel>
                  <GenerateButton
                    $variant="primary"
                    onClick={generateFieldsFromDocument}
                    disabled={isGeneratingFields}
                  >
                    <FileTextIcon size={16} />
                    {isGeneratingFields ? 'Generating...' : 'Generate from Document'}
                  </GenerateButton>
                </ButtonGroup>
              )}
              
              {generationError && (
                <div style={{ color: '#ef4444', fontSize: '14px', marginTop: '8px' }}>
                  {generationError}
                </div>
              )}
              
              {generationSuccess && (
                <div style={{ color: '#10b981', fontSize: '14px', marginTop: '8px', fontWeight: '500' }}>
                  ✅ {generationSuccess}
                </div>
              )}
              
              {promptWarning && (
                <div style={{ color: '#f59e0b', fontSize: '14px', marginTop: '8px', fontWeight: '500' }}>
                  ⚠️ {promptWarning}
                </div>
              )}
              
              {isGeneratingFields && (
                <ProgressContainer>
                  <ProgressBar>
                    <ProgressFill $progress={generationProgress} />
                  </ProgressBar>
                  <ProgressText>{generationStep}</ProgressText>
                  <CancelButton onClick={cancelGeneration}>
                    <X size={16} />
                    Cancel Generation
                  </CancelButton>
                </ProgressContainer>
              )}
            </GenerateFieldsContainer>
          )}
          
          {/* Extraction Settings */}
          <FormGroup>
            <Label>Confidence Threshold</Label>
            <Input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={templateData.extraction_settings?.confidence_threshold || 0.7}
              onChange={(e) => updateTemplate({ 
                extraction_settings: {
                  ...templateData.extraction_settings,
                  confidence_threshold: parseFloat(e.target.value) || 0.7
                }
              })}
              placeholder="0.7"
            />
            <HelpText>
              Minimum confidence score (0.0-1.0) for flagging low-confidence fields. 
              Fields below this threshold will be highlighted for review. Default: 0.7 (70%)
            </HelpText>
          </FormGroup>
        </SectionContent>
      </Section>

      <Section>
        <SectionHeader onClick={() => toggleSection('schema')}>
          <SectionTitle>
            <FileText size={16} />
            Schema Fields
            {isBasicInfoComplete ? (
              templateData.schema?.fields && templateData.schema.fields.length > 0 ? (
                <span style={{ 
                  background: '#3b82f6', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: '20px', 
                  height: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '0.75rem',
                  marginLeft: '0.5rem'
                }}>
                  {templateData.schema.fields.length}
                </span>
              ) : (
                <span style={{ 
                  background: '#f59e0b', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: '20px', 
                  height: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '0.75rem',
                  marginLeft: '0.5rem'
                }}>
                  !
                </span>
              )
            ) : (
              <span style={{ 
                background: '#9ca3af', 
                color: 'white', 
                borderRadius: '50%', 
                width: '20px', 
                height: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '0.75rem',
                marginLeft: '0.5rem'
              }}>
                ⏸
              </span>
            )}
          </SectionTitle>
          <CollapseButton>
            {collapsedSections.has('schema') ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </CollapseButton>
        </SectionHeader>
        
        <SectionContent $collapsed={collapsedSections.has('schema')}>
          {!isBasicInfoComplete ? (
            <EmptyState>
              <EmptyIcon>
                <Settings size={20} />
              </EmptyIcon>
              <EmptyText>Complete Basic Information First</EmptyText>
              <EmptySubtext>Please fill in template name, description, and document type before defining schema fields</EmptySubtext>
            </EmptyState>
          ) : (
            <FieldsContainer>
              {templateData.schema?.fields && templateData.schema.fields.length > 0 ? (
                templateData.schema.fields.map(field => renderField(field))
              ) : (
                <EmptyState>
                  <EmptyIcon>
                    <Plus size={20} />
                  </EmptyIcon>
                  <EmptyText>No fields defined</EmptyText>
                  <EmptySubtext>Add fields to define your extraction schema</EmptySubtext>
                </EmptyState>
              )}
              
              <AddFieldButton onClick={() => addField()}>
                <Plus size={16} />
                Add Field
              </AddFieldButton>
            </FieldsContainer>
          )}
        </SectionContent>
      </Section>
    </BuilderContainer>
  );
};

export default TemplateBuilder;
