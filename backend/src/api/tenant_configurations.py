"""
Tenant Configuration API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from uuid import UUID
from datetime import datetime

from ..models.database import get_db
from ..models.database import User
from .auth import require_permission
from ..services.tenant_config_service import TenantConfigService, RateLimitService
from ..services.llm_provider_service import LLMProviderService
from ..schemas.tenant_configuration import (
    TenantConfigurationCreate,
    TenantConfigurationUpdate,
    TenantConfigurationResponse,
    TenantRateLimitResponse,
    TenantConfigSummary,
    LLMConfig,
    TenantLLMConfigs,
    RateLimitsConfig,
    AvailableModelsResponse
)

router = APIRouter()


@router.get("/configurations", response_model=List[TenantConfigurationResponse])
async def list_tenant_configurations(
    current_user: User = Depends(require_permission("tenant_config:read")),
    db: Session = Depends(get_db)
):
    """List all configurations for the current tenant"""
    config_service = TenantConfigService(db)
    return config_service.list_tenant_configs(current_user.tenant_id)


@router.get("/configurations/summary", response_model=TenantConfigSummary)
async def get_tenant_config_summary(
    current_user: User = Depends(require_permission("tenant_config:read")),
    db: Session = Depends(get_db)
):
    """Get comprehensive tenant configuration summary"""
    config_service = TenantConfigService(db)
    return config_service.get_tenant_config_summary(current_user.tenant_id)


@router.get("/configurations/{config_type}", response_model=TenantConfigurationResponse)
async def get_tenant_configuration(
    config_type: str,
    current_user: User = Depends(require_permission("tenant_config:read")),
    db: Session = Depends(get_db)
):
    """Get specific tenant configuration"""
    if config_type not in ["llm", "rate_limits"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid config type. Must be 'llm' or 'rate_limits'"
        )
    
    config_service = TenantConfigService(db)
    config = config_service.get_config(current_user.tenant_id, config_type)
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuration of type '{config_type}' not found"
        )
    
    return config


@router.post("/configurations", response_model=TenantConfigurationResponse)
async def create_tenant_configuration(
    config_data: TenantConfigurationCreate,
    current_user: User = Depends(require_permission("tenant_config:write")),
    db: Session = Depends(get_db)
):
    """Create or update tenant configuration"""
    config_service = TenantConfigService(db)
    
    # Validate configuration data based on type
    if config_data.config_type == "llm":
        try:
            # Try to validate as TenantLLMConfigs (new dual structure)
            if "field_extraction" in config_data.config_data and "document_extraction" in config_data.config_data:
                TenantLLMConfigs(**config_data.config_data)
            else:
                # Fallback to single LLMConfig (old structure)
                LLMConfig(**config_data.config_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid LLM configuration: {str(e)}"
            )
    elif config_data.config_type == "rate_limits":
        try:
            RateLimitsConfig(**config_data.config_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid rate limits configuration: {str(e)}"
            )
    
    return config_service.create_or_update_config(
        tenant_id=current_user.tenant_id,
        config_type=config_data.config_type,
        config_data=config_data.config_data,
        is_active=config_data.is_active
    )


@router.put("/configurations/{config_type}", response_model=TenantConfigurationResponse)
async def update_tenant_configuration(
    config_type: str,
    config_data: TenantConfigurationUpdate,
    current_user: User = Depends(require_permission("tenant_config:write")),
    db: Session = Depends(get_db)
):
    """Update tenant configuration"""
    if config_type not in ["llm", "rate_limits"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid config type. Must be 'llm' or 'rate_limits'"
        )
    
    config_service = TenantConfigService(db)
    
    # Get existing configuration
    existing_config = config_service.get_config(current_user.tenant_id, config_type)
    if not existing_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuration of type '{config_type}' not found"
        )
    
    # Validate updated configuration data
    updated_data = config_data.config_data or existing_config.config_data
    if config_type == "llm":
        try:
            # Try to validate as TenantLLMConfigs (new dual structure)
            if "field_extraction" in updated_data and "document_extraction" in updated_data:
                TenantLLMConfigs(**updated_data)
            else:
                # Fallback to single LLMConfig (old structure)
                LLMConfig(**updated_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid LLM configuration: {str(e)}"
            )
    elif config_type == "rate_limits":
        try:
            RateLimitsConfig(**updated_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid rate limits configuration: {str(e)}"
            )
    
    return config_service.create_or_update_config(
        tenant_id=current_user.tenant_id,
        config_type=config_type,
        config_data=updated_data,
        is_active=config_data.is_active if config_data.is_active is not None else existing_config.is_active
    )


@router.delete("/configurations/{config_type}")
async def delete_tenant_configuration(
    config_type: str,
    current_user: User = Depends(require_permission("tenant_config:write")),
    db: Session = Depends(get_db)
):
    """Delete tenant configuration"""
    if config_type not in ["llm", "rate_limits"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid config type. Must be 'llm' or 'rate_limits'"
        )
    
    config_service = TenantConfigService(db)
    success = config_service.delete_config(current_user.tenant_id, config_type)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuration of type '{config_type}' not found"
        )
    
    return {"message": f"Configuration '{config_type}' deleted successfully"}


@router.get("/rate-limits", response_model=Dict[str, TenantRateLimitResponse])
async def get_rate_limit_status(
    current_user: User = Depends(require_permission("tenant_config:read")),
    db: Session = Depends(get_db)
):
    """Get current rate limit status for all limit types"""
    rate_limit_service = RateLimitService(db)
    
    limit_types = [
        "api_requests_per_minute",
        "api_requests_per_hour", 
        "document_uploads_per_hour",
        "extractions_per_hour",
        "max_concurrent_extractions"
    ]
    
    status_dict = {}
    for limit_type in limit_types:
        status = rate_limit_service.get_rate_limit_status(current_user.tenant_id, limit_type)
        if status:
            status_dict[limit_type] = status
    
    return status_dict


@router.post("/rate-limits/reset")
async def reset_rate_limits(
    current_user: User = Depends(require_permission("tenant_config:write")),
    db: Session = Depends(get_db)
):
    """Reset all rate limits for the current tenant"""
    rate_limit_service = RateLimitService(db)
    success = rate_limit_service.reset_rate_limits(current_user.tenant_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset rate limits"
        )
    
    return {"message": "Rate limits reset successfully"}


@router.post("/llm/health-check")
async def check_llm_health(
    config_type: str = "field_extraction",
    current_user: User = Depends(require_permission("tenant_config:read")),
    db: Session = Depends(get_db)
):
    """Check the health of the configured LLM provider"""
    config_service = TenantConfigService(db)
    llm_config = config_service.get_llm_config(current_user.tenant_id)
    
    if not llm_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No LLM configuration found for tenant"
        )
    
    # Handle dual configuration structure
    config_to_check = llm_config
    if hasattr(llm_config, 'field_extraction') and hasattr(llm_config, 'document_extraction'):
        # New dual configuration structure
        if config_type == "field_extraction":
            config_to_check = llm_config.field_extraction
        elif config_type == "document_extraction":
            config_to_check = llm_config.document_extraction
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid config_type. Must be 'field_extraction' or 'document_extraction'"
            )
    
    if not config_to_check:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No {config_type} configuration found"
        )
    
    try:
        llm_service = LLMProviderService.from_config(config_to_check)
        is_healthy = await llm_service.health_check()
        
        return {
            "provider": config_to_check.provider,
            "model": config_to_check.model_name,
            "healthy": is_healthy,
            "checked_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "provider": config_to_check.provider,
            "model": config_to_check.model_name,
            "healthy": False,
            "error": str(e),
            "checked_at": datetime.utcnow().isoformat()
        }


@router.post("/llm/test-extraction")
async def test_llm_extraction(
    test_data: Dict[str, Any],
    current_user: User = Depends(require_permission("tenant_config:read")),
    db: Session = Depends(get_db)
):
    """Test LLM extraction with sample data"""
    config_service = TenantConfigService(db)
    llm_config = config_service.get_llm_config(current_user.tenant_id)
    
    if not llm_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No LLM configuration found for tenant"
        )
    
    # Validate test data
    required_fields = ["document_text", "schema", "prompt_config"]
    for field in required_fields:
        if field not in test_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required field: {field}"
            )
    
    # Handle dual configuration structure
    config_to_use = llm_config
    if hasattr(llm_config, 'field_extraction') and hasattr(llm_config, 'document_extraction'):
        # New dual configuration structure
        config_type = test_data.get("config_type", "field_extraction")
        if config_type == "field_extraction":
            config_to_use = llm_config.field_extraction
        elif config_type == "document_extraction":
            config_to_use = llm_config.document_extraction
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid config_type. Must be 'field_extraction' or 'document_extraction'"
            )
    
    if not config_to_use:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No {test_data.get('config_type', 'LLM')} configuration found"
        )
    
    try:
        llm_service = LLMProviderService.from_config(config_to_use)
        result = await llm_service.extract_data(
            document_text=test_data["document_text"],
            schema=test_data["schema"],
            prompt_config=test_data["prompt_config"]
        )
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM extraction test failed: {str(e)}"
        )


@router.get("/available-models/{provider}", response_model=AvailableModelsResponse)
async def get_available_models(
    provider: str,
    current_user: User = Depends(require_permission("tenant_config:read")),
    db: Session = Depends(get_db)
):
    """Get available models for a specific LLM provider"""
    
    try:
        service = RateLimitService(db)
        models = await service.get_available_models(provider)
        
        # Set default model based on provider
        default_model = None
        if provider == "ollama":
            default_model = "gemma2:2b"
        elif provider == "openai":
            default_model = "gpt-4o"
        elif provider == "anthropic":
            default_model = "claude-3-5-sonnet-20241022"
            
        return AvailableModelsResponse(
            provider=provider,
            models=models,
            default_model=default_model
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get available models: {str(e)}"
        )
