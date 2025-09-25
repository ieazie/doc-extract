"""
Language Management API endpoints
"""
import logging
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..models.database import get_db
from ..services.language_service import (
    LanguageService, 
    DocumentLanguageDetector,
    TenantLanguageConfigResponse,
    TenantLanguageConfigUpdate,
    LanguageDetectionResult,
    SupportedLanguage
)
from ..api.auth import get_current_user
from ..services.tenant_auth_service import get_tenant_auth_service
from ..models.database import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/language", tags=["language"])


class DetectRequest(BaseModel):
    """Request model for language detection"""
    text: str


class ValidateRequest(BaseModel):
    """Request model for language validation"""
    tenant_id: str
    language: str


def _ensure_tenant_access(current_user: User, tenant_id: UUID) -> None:
    """Ensure user has access to the specified tenant"""
    if not auth_service.can_access_tenant(current_user, tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: access to tenant denied"
        )


@router.get("/supported", response_model=List[SupportedLanguage])
async def get_supported_languages():
    """Get list of all supported languages in the system"""
    try:
        return LanguageService.get_all_supported_languages()
    except Exception as e:
        logger.error(f"Failed to get supported languages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve supported languages"
        )


@router.get("/tenant/{tenant_id}/config", response_model=TenantLanguageConfigResponse)
async def get_tenant_language_config(
    tenant_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tenant's language configuration"""
    try:
        # Enforce tenant access
        _ensure_tenant_access(current_user, tenant_id)
        
        language_service = LanguageService(db)
        config = language_service.get_tenant_language_config(str(tenant_id))
        
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Language configuration not found for tenant"
            )
        
        return config
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get tenant language config for {tenant_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tenant language configuration"
        )


@router.put("/tenant/{tenant_id}/config", response_model=TenantLanguageConfigResponse)
async def update_tenant_language_config(
    tenant_id: UUID,
    config_update: TenantLanguageConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update tenant's language configuration"""
    try:
        # Enforce tenant access
        _ensure_tenant_access(current_user, tenant_id)
        
        language_service = LanguageService(db)
        config = language_service.update_tenant_language_config(str(tenant_id), config_update)
        
        return config
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update tenant language config for {tenant_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update tenant language configuration"
        )


@router.post("/detect", response_model=LanguageDetectionResult)
async def detect_document_language(
    body: DetectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detect language of provided text"""
    try:
        text = body.text
        if not text or len(text.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text must be at least 10 characters long for language detection"
            )
        
        detector = DocumentLanguageDetector(db)
        result = detector.detect_language(text)
        
        return result
        
    except HTTPException:
        raise
    except Exception:
        logger.exception("Language detection failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Language detection failed"
        )


@router.get("/tenant/{tenant_id}/supported", response_model=List[str])
async def get_tenant_supported_languages(
    tenant_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of supported languages for a specific tenant"""
    try:
        # Enforce tenant access
        _ensure_tenant_access(current_user, tenant_id)
        
        language_service = LanguageService(db)
        supported_languages = language_service.get_supported_languages(str(tenant_id))
        
        return supported_languages
        
    except Exception as e:
        logger.error(f"Failed to get supported languages for tenant {tenant_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tenant supported languages"
        )


@router.get("/tenant/{tenant_id}/default", response_model=str)
async def get_tenant_default_language(
    tenant_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tenant's default language"""
    try:
        # Enforce tenant access
        _ensure_tenant_access(current_user, tenant_id)
        
        language_service = LanguageService(db)
        default_language = language_service.get_default_language(str(tenant_id))
        
        return default_language
        
    except Exception as e:
        logger.error(f"Failed to get default language for tenant {tenant_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tenant default language"
        )


@router.post("/validate")
async def validate_language_support(
    body: ValidateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Validate if a language is supported by a tenant"""
    try:
        tenant_id = UUID(body.tenant_id)
        language = body.language
        
        # Enforce tenant access
        _ensure_tenant_access(current_user, tenant_id)
        
        language_service = LanguageService(db)
        is_supported = language_service.validate_language_support(str(tenant_id), language)
        
        return {
            "tenant_id": str(tenant_id),
            "language": language,
            "is_supported": is_supported
        }
        
    except Exception:
        logger.exception("Failed to validate language support")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate language support"
        )
