"""
Enhanced Extraction Service with Tenant-Specific LLM Providers
"""
import json
import logging
import time
from typing import Dict, Any, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from ..models.database import get_db
from ..services.tenant_config_service import TenantConfigService, RateLimitService
from ..services.llm_provider_service import LLMProviderService
from ..schemas.tenant_configuration import LLMConfig

logger = logging.getLogger(__name__)


class ExtractionRequest:
    """Request model for extraction"""
    def __init__(
        self,
        document_text: str,
        schema: Dict[str, Any],
        prompt_config: Dict[str, Any],
        tenant_id: UUID
    ):
        self.document_text = document_text
        self.schema = schema
        self.prompt_config = prompt_config
        self.tenant_id = tenant_id


class ExtractionResult:
    """Result model for extraction"""
    def __init__(
        self,
        extracted_data: Dict[str, Any],
        confidence_score: float,
        processing_time_ms: int,
        provider: str,
        model: str,
        status: str = "success",
        error_message: Optional[str] = None
    ):
        self.extracted_data = extracted_data
        self.confidence_score = confidence_score
        self.processing_time_ms = processing_time_ms
        self.provider = provider
        self.model = model
        self.status = status
        self.error_message = error_message


class ExtractionService:
    """Enhanced extraction service with tenant-specific LLM providers and rate limiting"""
    
    def __init__(self, db: Session):
        self.db = db
        self.config_service = TenantConfigService(db)
        self.rate_limit_service = RateLimitService(db)
    
    def extract_data(self, request: ExtractionRequest) -> ExtractionResult:
        """Extract structured data using tenant-specific LLM provider with rate limiting"""
        
        start_time = time.time()
        
        try:
            # Check rate limits
            self._check_rate_limits(request.tenant_id)
            
            # Perform language validation
            language_validation_result = self._validate_language(request)
            if not language_validation_result["is_valid"]:
                raise Exception(f"Language validation failed: {language_validation_result['validation_message']}")
            
            # Get tenant's LLM configuration
            llm_config = self.config_service.get_llm_config(request.tenant_id)
            if not llm_config:
                raise Exception("No LLM configuration found for tenant")
            
            # Handle dual configuration structure - use Document Extraction config for extraction
            config_to_use = llm_config
            if hasattr(llm_config, 'document_extraction') and llm_config.document_extraction:
                config_to_use = llm_config.document_extraction
            elif hasattr(llm_config, 'field_extraction') and llm_config.field_extraction:
                # Fallback to Field Extraction if Document Extraction not available
                config_to_use = llm_config.field_extraction
            
            # Create LLM provider service
            llm_service = LLMProviderService.from_config(config_to_use)
            
            # Perform extraction with language support
            template_language = request.prompt_config.get("language", "en")
            result = llm_service.extract_data(
                document_text=request.document_text,
                schema=request.schema,
                prompt_config=request.prompt_config,
                language=template_language
            )
            
            # Increment rate limit counters
            self._increment_rate_limits(request.tenant_id)
            
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            return ExtractionResult(
                extracted_data=result.get("data", {}),
                confidence_score=result.get("confidence", 0.0),
                processing_time_ms=processing_time_ms,
                provider=result.get("provider", "unknown"),
                model=result.get("model", "unknown"),
                status="success"
            )
            
        except Exception as e:
            logger.error(f"Extraction failed for tenant {request.tenant_id}: {str(e)}")
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            return ExtractionResult(
                extracted_data={},
                confidence_score=0.0,
                processing_time_ms=processing_time_ms,
                provider="unknown",
                model="unknown",
                status="error",
                error_message=str(e)
            )
    
    def _check_rate_limits(self, tenant_id: UUID) -> None:
        """Check if tenant has exceeded rate limits"""
        
        # Get rate limits configuration
        rate_limits_config = self.config_service.get_rate_limits_config(tenant_id)
        if not rate_limits_config:
            logger.warning(f"No rate limits configured for tenant {tenant_id}")
            return
        
        # Check extraction rate limit (per hour)
        if not self.rate_limit_service.check_rate_limit(
            tenant_id=tenant_id,
            limit_type="extractions_per_hour",
            limit_value=rate_limits_config.extractions_per_hour,
            window_minutes=60
        ):
            raise Exception(f"Rate limit exceeded: {rate_limits_config.extractions_per_hour} extractions per hour")
        
        # Check concurrent extractions
        # Note: This would require a more sophisticated tracking system in production
        # For now, we'll skip this check
        pass
    
    def _increment_rate_limits(self, tenant_id: UUID) -> None:
        """Increment rate limit counters"""
        
        # Increment extraction counter
        self.rate_limit_service.increment_rate_limit(
            tenant_id=tenant_id,
            limit_type="extractions_per_hour",
            window_minutes=60
        )
    
    def health_check(self, tenant_id: UUID) -> Dict[str, Any]:
        """Check the health of the tenant's LLM provider"""
        
        try:
            # Get tenant's LLM configuration
            llm_config = self.config_service.get_llm_config(tenant_id)
            if not llm_config:
                return {
                    "status": "unhealthy",
                    "message": "No LLM configuration found",
                    "provider": "unknown",
                    "model": "unknown"
                }
            
            # Handle dual configuration structure - use Document Extraction config for health check
            config_to_use = llm_config
            if hasattr(llm_config, 'document_extraction') and llm_config.document_extraction:
                config_to_use = llm_config.document_extraction
            elif hasattr(llm_config, 'field_extraction') and llm_config.field_extraction:
                # Fallback to Field Extraction if Document Extraction not available
                config_to_use = llm_config.field_extraction
            
            # Create LLM provider service and check health
            llm_service = LLMProviderService.from_config(config_to_use)
            is_healthy = llm_service.health_check()
            
            return {
                "status": "healthy" if is_healthy else "unhealthy",
                "message": "LLM provider is healthy" if is_healthy else "LLM provider is unhealthy",
                "provider": config_to_use.provider,
                "model": config_to_use.model_name
            }
            
        except Exception as e:
            logger.error(f"Health check failed for tenant {tenant_id}: {str(e)}")
            return {
                "status": "unhealthy",
                "message": f"Health check failed: {str(e)}",
                "provider": "unknown",
                "model": "unknown"
            }
    
    def get_tenant_config_summary(self, tenant_id: UUID) -> Dict[str, Any]:
        """Get tenant configuration summary"""
        
        summary = self.config_service.get_tenant_config_summary(tenant_id)
        
        return {
            "tenant_id": str(summary.tenant_id),
            "llm_config": summary.llm_config.dict() if summary.llm_config else None,
            "rate_limits": summary.rate_limits.dict() if summary.rate_limits else None,
            "rate_usage": summary.rate_usage
        }
    
    def _validate_language(self, request: ExtractionRequest) -> Dict[str, Any]:
        """Validate language compatibility between template and document"""
        
        try:
            # Import language service
            from ..services.language_service import DocumentLanguageDetector
            
            # Get template language from prompt config
            template_language = request.prompt_config.get("language", "en")
            auto_detect = request.prompt_config.get("auto_detect_language", True)
            require_match = request.prompt_config.get("require_language_match", False)
            
            # Create language detector
            detector = DocumentLanguageDetector(self.db)
            
            # Detect document language if auto-detect is enabled
            document_language = None
            if auto_detect:
                detection_result = detector.detect_language(request.document_text)
                document_language = detection_result.language
            
            # Validate language match
            validation_result = detector.validate_language_match(
                template_language=template_language,
                document_language=document_language,
                require_match=require_match
            )
            
            return {
                "is_valid": validation_result.is_valid,
                "template_language": template_language,
                "document_language": document_language,
                "language_match": validation_result.language_match,
                "validation_message": validation_result.validation_message
            }
            
        except Exception as e:
            logger.error(f"Language validation failed: {str(e)}")
            return {
                "is_valid": False,
                "template_language": template_language if 'template_language' in locals() else "en",
                "document_language": None,
                "language_match": False,
                "validation_message": f"Language validation error: {str(e)}"
            }


# Factory function to create extraction service
def create_extraction_service() -> ExtractionService:
    """Create extraction service with database session"""
    db = next(get_db())
    return ExtractionService(db)
