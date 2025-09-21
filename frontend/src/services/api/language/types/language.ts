/**
 * Language Features Types
 */
import { TenantEntity, BaseEntity } from '../../base/types/common';

// Language Configuration Types
export interface TenantLanguageConfig {
  id: string;
  tenant_id: string;
  supported_languages: string[];
  default_language: string;
  auto_detect_language: boolean;
  require_language_match: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantLanguageConfigUpdate {
  supported_languages: string[];
  default_language: string;
  auto_detect_language: boolean;
  require_language_match: boolean;
}

export interface LanguageConfigCreate {
  tenant_id: string;
  supported_languages: string[];
  default_language: string;
  auto_detect_language?: boolean;
  require_language_match?: boolean;
}

// Language Detection Types
export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  source: string;
  detected_at: string;
}

export interface LanguageDetectionRequest {
  text: string;
  options?: {
    max_length?: number;
    min_confidence?: number;
    supported_languages?: string[];
  };
}

// Language Validation Types
export interface LanguageValidationResponse {
  is_supported: boolean;
  language: string;
  confidence?: number;
  message: string;
  suggestions?: string[];
}

export interface LanguageValidationRequest {
  tenant_id: string;
  language: string;
}

// Supported Languages Types
export interface SupportedLanguage {
  code: string;
  name: string;
  native_name: string;
  bcp47_tag: string;
  is_active: boolean;
  detection_confidence_threshold: number;
}

export interface LanguageSupportInfo {
  total_languages: number;
  active_languages: number;
  default_language: string;
  auto_detection_enabled: boolean;
  language_matching_required: boolean;
}

// Language Statistics Types
export interface LanguageUsageStats {
  language: string;
  document_count: number;
  extraction_count: number;
  success_rate: number;
  avg_confidence: number;
  last_used: string;
}

export interface LanguageDetectionStats {
  total_detections: number;
  successful_detections: number;
  failed_detections: number;
  avg_confidence: number;
  most_detected_languages: Array<{
    language: string;
    count: number;
    percentage: number;
  }>;
  detection_accuracy_by_language: Record<string, {
    total: number;
    correct: number;
    accuracy: number;
  }>;
}

// Language Processing Types
export interface LanguageProcessingConfig {
  tenant_id: string;
  language: string;
  config: {
    extraction_settings: {
      confidence_threshold: number;
      max_retries: number;
      timeout_ms: number;
    };
    detection_settings: {
      min_text_length: number;
      confidence_threshold: number;
      fallback_language: string;
    };
    validation_settings: {
      strict_mode: boolean;
      allow_partial_matches: boolean;
      custom_rules: Record<string, any>;
    };
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Language API Response Types
export interface LanguageListResponse {
  languages: SupportedLanguage[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface LanguageStatsResponse {
  usage_stats: LanguageUsageStats[];
  detection_stats: LanguageDetectionStats;
  config_info: LanguageSupportInfo;
}

// Language Error Types
export interface LanguageError {
  code: string;
  message: string;
  details?: Record<string, any>;
  suggestions?: string[];
}

// Language Status Types
export type LanguageStatus = 'active' | 'inactive' | 'deprecated' | 'experimental';

export type DetectionSource = 'automatic' | 'manual' | 'fallback' | 'user_preference';

export type ValidationStatus = 'valid' | 'invalid' | 'warning' | 'unknown';

// Language Constants
export const DEFAULT_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'];

export const BCP47_LANGUAGE_MAP: Record<string, string> = {
  'en': 'en-US',
  'es': 'es-ES',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'it': 'it-IT',
  'pt': 'pt-PT',
  'ru': 'ru-RU',
  'zh': 'zh-CN',
  'ja': 'ja-JP',
  'ko': 'ko-KR'
};
