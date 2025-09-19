"""
Language Service for managing tenant language configurations and document language detection
"""
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
import uuid

from ..models.database import TenantLanguageConfig, Document, Template, ExtractionLanguageValidation, Extraction
from pydantic import BaseModel, Field, validator

logger = logging.getLogger(__name__)


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class TenantLanguageConfigResponse(BaseModel):
    """Response model for tenant language configuration"""
    id: str
    tenant_id: str
    supported_languages: List[str]
    default_language: str
    auto_detect_language: bool
    require_language_match: bool
    created_at: str
    updated_at: str

class TenantLanguageConfigUpdate(BaseModel):
    """Update model for tenant language configuration"""
    supported_languages: List[str] = Field(..., min_items=1, description="List of supported language codes")
    default_language: str = Field(..., description="Default language code")
    auto_detect_language: bool = Field(default=True, description="Whether to auto-detect document language")
    require_language_match: bool = Field(default=False, description="Whether to require language match for extraction")
    
    @validator('supported_languages')
    def validate_supported_languages(cls, v):
        """Validate supported languages format"""
        valid_language_codes = [
            'en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar', 'ru', 'hi',
            'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-PT', 'zh-CN', 'ja-JP'
        ]
        
        for lang in v:
            if lang not in valid_language_codes:
                raise ValueError(f"Unsupported language code: {lang}")
        return v
    
    @validator('default_language')
    def validate_default_language(cls, v, values):
        """Validate default language is in supported languages"""
        if 'supported_languages' in values and v not in values['supported_languages']:
            raise ValueError("Default language must be in supported languages list")
        return v

class LanguageDetectionResult(BaseModel):
    """Result of language detection"""
    language: str
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0 and 1")
    source: str = Field(default="auto", description="Source of detection: auto, manual, template")

class LanguageValidationResult(BaseModel):
    """Result of language validation"""
    is_valid: bool
    template_language: str
    document_language: Optional[str]
    language_match: bool
    validation_message: Optional[str] = None

class SupportedLanguage(BaseModel):
    """Supported language information"""
    code: str
    name: str
    native_name: str


# ============================================================================
# LANGUAGE SERVICE
# ============================================================================

class LanguageService:
    """Service for managing tenant language configurations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_tenant_language_config(self, tenant_id: str) -> Optional[TenantLanguageConfigResponse]:
        """Get tenant's language configuration"""
        try:
            config = self.db.query(TenantLanguageConfig).filter(
                TenantLanguageConfig.tenant_id == tenant_id
            ).first()
            
            if not config:
                return None
                
            return TenantLanguageConfigResponse(
                id=str(config.id),
                tenant_id=str(config.tenant_id),
                supported_languages=config.supported_languages,
                default_language=config.default_language,
                auto_detect_language=config.auto_detect_language,
                require_language_match=config.require_language_match,
                created_at=config.created_at.isoformat(),
                updated_at=config.updated_at.isoformat()
            )
        except Exception as e:
            logger.error(f"Failed to get tenant language config for {tenant_id}: {str(e)}")
            raise
    
    def update_tenant_language_config(self, tenant_id: str, config_update: TenantLanguageConfigUpdate) -> TenantLanguageConfigResponse:
        """Update tenant's language configuration"""
        try:
            # Get existing config or create new one
            config = self.db.query(TenantLanguageConfig).filter(
                TenantLanguageConfig.tenant_id == tenant_id
            ).first()
            
            if not config:
                config = TenantLanguageConfig(
                    tenant_id=tenant_id,
                    supported_languages=config_update.supported_languages,
                    default_language=config_update.default_language,
                    auto_detect_language=config_update.auto_detect_language,
                    require_language_match=config_update.require_language_match
                )
                self.db.add(config)
            else:
                config.supported_languages = config_update.supported_languages
                config.default_language = config_update.default_language
                config.auto_detect_language = config_update.auto_detect_language
                config.require_language_match = config_update.require_language_match
            
            self.db.commit()
            self.db.refresh(config)
            
            return TenantLanguageConfigResponse(
                id=str(config.id),
                tenant_id=str(config.tenant_id),
                supported_languages=config.supported_languages,
                default_language=config.default_language,
                auto_detect_language=config.auto_detect_language,
                require_language_match=config.require_language_match,
                created_at=config.created_at.isoformat(),
                updated_at=config.updated_at.isoformat()
            )
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update tenant language config for {tenant_id}: {str(e)}")
            raise
    
    def get_supported_languages(self, tenant_id: str) -> List[str]:
        """Get list of supported languages for tenant"""
        try:
            config = self.db.query(TenantLanguageConfig).filter(
                TenantLanguageConfig.tenant_id == tenant_id
            ).first()
            
            if not config:
                return ["en"]  # Default to English
                
            return config.supported_languages
        except Exception as e:
            logger.error(f"Failed to get supported languages for tenant {tenant_id}: {str(e)}")
            return ["en"]
    
    def get_default_language(self, tenant_id: str) -> str:
        """Get tenant's default language"""
        try:
            config = self.db.query(TenantLanguageConfig).filter(
                TenantLanguageConfig.tenant_id == tenant_id
            ).first()
            
            if not config:
                return "en"  # Default to English
                
            return config.default_language
        except Exception as e:
            logger.error(f"Failed to get default language for tenant {tenant_id}: {str(e)}")
            return "en"
    
    def validate_language_support(self, tenant_id: str, language: str) -> bool:
        """Validate if language is supported by tenant"""
        try:
            supported_languages = self.get_supported_languages(tenant_id)
            return language in supported_languages
        except Exception as e:
            logger.error(f"Failed to validate language support for tenant {tenant_id}, language {language}: {str(e)}")
            return False
    
    @staticmethod
    def get_all_supported_languages() -> List[SupportedLanguage]:
        """Get list of all supported languages in the system"""
        return [
            SupportedLanguage(code="en", name="English", native_name="English"),
            SupportedLanguage(code="es", name="Spanish", native_name="Español"),
            SupportedLanguage(code="fr", name="French", native_name="Français"),
            SupportedLanguage(code="de", name="German", native_name="Deutsch"),
            SupportedLanguage(code="it", name="Italian", native_name="Italiano"),
            SupportedLanguage(code="pt", name="Portuguese", native_name="Português"),
            SupportedLanguage(code="zh", name="Chinese", native_name="中文"),
            SupportedLanguage(code="ja", name="Japanese", native_name="日本語"),
            SupportedLanguage(code="ko", name="Korean", native_name="한국어"),
            SupportedLanguage(code="ar", name="Arabic", native_name="العربية"),
            SupportedLanguage(code="ru", name="Russian", native_name="Русский"),
            SupportedLanguage(code="hi", name="Hindi", native_name="हिंदी"),
            SupportedLanguage(code="en-US", name="English (US)", native_name="English (US)"),
            SupportedLanguage(code="es-ES", name="Spanish (Spain)", native_name="Español (España)"),
            SupportedLanguage(code="fr-FR", name="French (France)", native_name="Français (France)"),
            SupportedLanguage(code="de-DE", name="German (Germany)", native_name="Deutsch (Deutschland)"),
            SupportedLanguage(code="it-IT", name="Italian (Italy)", native_name="Italiano (Italia)"),
            SupportedLanguage(code="pt-PT", name="Portuguese (Portugal)", native_name="Português (Portugal)"),
            SupportedLanguage(code="zh-CN", name="Chinese (Simplified)", native_name="中文 (简体)"),
            SupportedLanguage(code="ja-JP", name="Japanese (Japan)", native_name="日本語 (日本)"),
        ]


# ============================================================================
# DOCUMENT LANGUAGE DETECTOR
# ============================================================================

class DocumentLanguageDetector:
    """Service for detecting document language"""
    
    def __init__(self, db: Session):
        self.db = db
        self.language_service = LanguageService(db)
    
    def detect_language(self, text: str) -> LanguageDetectionResult:
        """Detect language of document text using enhanced heuristics"""
        try:
            if not text or len(text.strip()) < 10:
                return LanguageDetectionResult(
                    language="en",
                    confidence=0.5,
                    source="auto"
                )
            
            # Enhanced language detection with multiple approaches
            
            # 1. Character-based detection for scripts
            script_scores = self._detect_by_script(text)
            
            # 2. Word-based detection for Latin scripts
            word_scores = self._detect_by_words(text)
            
            # 3. N-gram based detection
            ngram_scores = self._detect_by_ngrams(text)
            
            # Combine scores with weights - give more weight to distinctive patterns
            combined_scores = {}
            for lang in set(list(script_scores.keys()) + list(word_scores.keys()) + list(ngram_scores.keys())):
                script_score = script_scores.get(lang, 0)
                word_score = word_scores.get(lang, 0)
                ngram_score = ngram_scores.get(lang, 0)
                
                # Weight the different approaches - prioritize distinctive features
                if script_score > 0:
                    # If we have script detection, it's very reliable
                    combined_scores[lang] = script_score * 0.8 + word_score * 0.2
                else:
                    # For Latin scripts, use a more balanced approach
                    combined_scores[lang] = (
                        word_score * 0.6 +    # Word patterns are primary
                        ngram_score * 0.4     # N-grams provide additional context
                    )
            
            # Find the language with highest score
            if not combined_scores:
                return LanguageDetectionResult(language="en", confidence=0.5, source="auto")
            
            detected_language = max(combined_scores.items(), key=lambda x: x[1])
            confidence = min(detected_language[1], 0.95)  # Cap confidence at 95%
            
            # If confidence is too low, default to English
            if confidence < 0.2:
                detected_language = ('en', 0.5)
                confidence = 0.5
            
            return LanguageDetectionResult(
                language=detected_language[0],
                confidence=confidence,
                source="auto"
            )
            
        except Exception as e:
            logger.error(f"Failed to detect language: {str(e)}")
            return LanguageDetectionResult(
                language="en",
                confidence=0.3,
                source="auto"
            )
    
    def _detect_by_script(self, text: str) -> Dict[str, float]:
        """Detect language based on script/character patterns"""
        scores = {}
        
        # Chinese characters (CJK Unified Ideographs)
        chinese_chars = sum(1 for char in text if '\u4e00' <= char <= '\u9fff')
        if chinese_chars > 0:
            scores['zh'] = min(chinese_chars / max(len(text), 1), 1.0)
        
        # Japanese characters (Hiragana + Katakana)
        japanese_chars = sum(1 for char in text if '\u3040' <= char <= '\u309f' or '\u30a0' <= char <= '\u30ff')
        if japanese_chars > 0:
            scores['ja'] = min(japanese_chars / max(len(text), 1), 1.0)
        
        # Korean characters (Hangul)
        korean_chars = sum(1 for char in text if '\uac00' <= char <= '\ud7af')
        if korean_chars > 0:
            scores['ko'] = min(korean_chars / max(len(text), 1), 1.0)
        
        # Arabic characters
        arabic_chars = sum(1 for char in text if '\u0600' <= char <= '\u06ff')
        if arabic_chars > 0:
            scores['ar'] = min(arabic_chars / max(len(text), 1), 1.0)
        
        # Cyrillic characters (Russian, etc.)
        cyrillic_chars = sum(1 for char in text if '\u0400' <= char <= '\u04ff')
        if cyrillic_chars > 0:
            scores['ru'] = min(cyrillic_chars / max(len(text), 1), 1.0)
        
        # Devanagari characters (Hindi, etc.)
        devanagari_chars = sum(1 for char in text if '\u0900' <= char <= '\u097f')
        if devanagari_chars > 0:
            scores['hi'] = min(devanagari_chars / max(len(text), 1), 1.0)
        
        return scores
    
    def _detect_by_words(self, text: str) -> Dict[str, float]:
        """Detect language based on common words and patterns"""
        text_lower = text.lower()
        words = text_lower.split()
        
        if not words:
            return {}
        
        # Enhanced word patterns with more comprehensive lists
        patterns = {
            'en': [
                'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
                'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
                'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall'
            ],
            'es': [
                'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le',
                'del', 'los', 'las', 'por', 'para', 'con', 'como', 'pero', 'más', 'muy', 'ya',
                'todo', 'también', 'después', 'antes', 'durante', 'entre', 'sobre', 'bajo',
                'está', 'están', 'hace', 'hacer', 'tiene', 'tener', 'viene', 'venir', 'puede', 'poder',
                'dice', 'decir', 'sabe', 'saber', 've', 'ver', 'va', 'ir', 'vamos', 'vamos'
            ],
            'fr': [
                'le', 'la', 'de', 'et', 'à', 'un', 'une', 'dans', 'sur', 'avec', 'pour', 'par',
                'des', 'du', 'les', 'est', 'que', 'qui', 'ce', 'son', 'ses', 'ses', 'mais',
                'aussi', 'très', 'bien', 'plus', 'tout', 'tous', 'toute', 'toutes'
            ],
            'de': [
                'der', 'die', 'das', 'und', 'in', 'zu', 'den', 'von', 'mit', 'auf', 'für', 'ist',
                'eine', 'einen', 'einem', 'einer', 'sich', 'nicht', 'auch', 'aber', 'oder',
                'wenn', 'dass', 'wie', 'als', 'noch', 'nur', 'alle', 'vom', 'zum', 'zur',
                'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'bin', 'bist', 'sind',
                'habe', 'hast', 'hat', 'haben', 'war', 'waren', 'werden', 'wird', 'kann',
                'können', 'muss', 'müssen', 'soll', 'sollen', 'darf', 'dürfen', 'will', 'wollen',
                'könnte', 'könnten', 'möchte', 'möchten', 'sollte', 'sollten', 'würde', 'würden',
                'vielleicht', 'dokumente', 'hochladen', 'geschwärzt', 'notwendigen', 'stellen'
            ],
            'it': [
                'il', 'la', 'di', 'e', 'a', 'da', 'in', 'con', 'su', 'per', 'del', 'della',
                'dei', 'delle', 'degli', 'che', 'chi', 'cui', 'quando', 'dove', 'come', 'perché',
                'anche', 'sempre', 'mai', 'tutto', 'tutti', 'tutta', 'tutte', 'molto', 'poco'
            ],
            'pt': [
                'o', 'a', 'de', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'não', 'que',
                'os', 'as', 'dos', 'das', 'pelo', 'pela', 'num', 'numa',
                'também', 'mais', 'muito', 'pouco', 'todos', 'todas', 'todo', 'toda',
                'está', 'estão', 'faz', 'fazer', 'tem', 'ter', 'vem', 'vir', 'pode', 'poder',
                'diz', 'dizer', 'sabe', 'saber', 'vê', 'ver', 'vai', 'ir', 'vamos', 'vamos'
            ]
        }
        
        scores = {}
        for lang, lang_patterns in patterns.items():
            matches = sum(1 for pattern in lang_patterns if pattern in text_lower)
            # Calculate base score as percentage of patterns found
            base_score = matches / len(lang_patterns)
            
            # Apply length normalization - more generous for short texts
            if len(words) < 10:
                length_factor = 0.8  # High confidence for short texts with clear patterns
            elif len(words) < 25:
                length_factor = 1.0  # Full confidence for medium texts
            else:
                length_factor = min(len(words) / 30, 1.0)  # Scale up for longer texts
            
            # Boost score if we have a good number of matches
            if matches >= 3:
                boost_factor = 1.2  # 20% boost for 3+ matches
            elif matches >= 2:
                boost_factor = 1.1  # 10% boost for 2+ matches
            else:
                boost_factor = 1.0
            
            scores[lang] = min(base_score * length_factor * boost_factor, 1.0)
        
        return scores
    
    def _detect_by_ngrams(self, text: str) -> Dict[str, float]:
        """Detect language based on character n-grams"""
        if len(text) < 3:
            return {}
        
        # Common character trigrams for different languages - more distinctive patterns
        trigrams = {
            'en': ['the', 'and', 'ing', 'ion', 'ent', 'her', 'for', 'tha', 'nth', 'was', 'thi', 'wit', 'hat', 'all'],
            'es': ['que', 'ent', 'ion', 'del', 'los', 'las', 'por', 'para', 'con', 'com', 'est', 'una', 'dos', 'con'],
            'fr': ['ent', 'ion', 'que', 'les', 'des', 'par', 'pour', 'dans', 'sur', 'avec', 'est', 'une', 'ces', 'ses'],
            'de': ['der', 'die', 'das', 'und', 'den', 'von', 'mit', 'auf', 'für', 'ist', 'ein', 'ich', 'wir', 'sie'],
            'it': ['che', 'del', 'della', 'con', 'per', 'tra', 'fra', 'sono', 'come', 'quando', 'una', 'degli', 'delle'],
            'pt': ['que', 'do', 'da', 'em', 'um', 'para', 'com', 'não', 'dos', 'das', 'uma', 'pelo', 'pela', 'num']
        }
        
        text_lower = text.lower()
        scores = {}
        
        for lang, lang_trigrams in trigrams.items():
            matches = sum(1 for trigram in lang_trigrams if trigram in text_lower)
            scores[lang] = matches / len(lang_trigrams)
        
        return scores
    
    def validate_language_match(self, template_language: str, document_language: Optional[str], require_match: bool) -> LanguageValidationResult:
        """Validate if template and document languages match"""
        try:
            if not document_language:
                if require_match:
                    return LanguageValidationResult(
                        is_valid=False,
                        template_language=template_language,
                        document_language=document_language,
                        language_match=False,
                        validation_message="Document language not detected but match is required"
                    )
                else:
                    return LanguageValidationResult(
                        is_valid=True,
                        template_language=template_language,
                        document_language=document_language,
                        language_match=False,
                        validation_message="Document language not detected, proceeding without match validation"
                    )
            
            # Check for exact match
            exact_match = template_language == document_language
            
            # Check for base language match (e.g., 'en' matches 'en-US')
            base_template = template_language.split('-')[0]
            base_document = document_language.split('-')[0]
            base_match = base_template == base_document
            
            language_match = exact_match or base_match
            
            if require_match and not language_match:
                return LanguageValidationResult(
                    is_valid=False,
                    template_language=template_language,
                    document_language=document_language,
                    language_match=language_match,
                    validation_message=f"Language mismatch: Template ({template_language}) vs Document ({document_language})"
                )
            
            return LanguageValidationResult(
                is_valid=True,
                template_language=template_language,
                document_language=document_language,
                language_match=language_match,
                validation_message=f"Language validation {'passed' if language_match else 'ignored'}"
            )
            
        except Exception as e:
            logger.error(f"Failed to validate language match: {str(e)}")
            return LanguageValidationResult(
                is_valid=False,
                template_language=template_language,
                document_language=document_language,
                language_match=False,
                validation_message=f"Language validation failed: {str(e)}"
            )
    
    def create_language_validation_record(self, extraction_id: str, template_language: str, document_language: Optional[str], validation_result: LanguageValidationResult) -> ExtractionLanguageValidation:
        """Create a language validation record for tracking"""
        try:
            validation_record = ExtractionLanguageValidation(
                extraction_id=extraction_id,
                template_language=template_language,
                document_language=document_language,
                language_match=validation_result.language_match,
                validation_status="passed" if validation_result.is_valid else "failed",
                validation_message=validation_result.validation_message
            )
            
            self.db.add(validation_record)
            self.db.commit()
            self.db.refresh(validation_record)
            
            return validation_record
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create language validation record: {str(e)}")
            raise
