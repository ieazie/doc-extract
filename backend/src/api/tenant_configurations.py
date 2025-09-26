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
from ..services.tenant_secret_service import TenantSecretService
from ..services.tenant_infrastructure_service import TenantInfrastructureService
from ..services.tenant_utils import TenantUtils
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
    AvailableModelsResponse,
    AuthenticationConfig,
    CORSConfig,
    SecurityConfig,
    SecureAuthenticationConfig,
    SecureSecurityConfig,
    SecureLLMConfig,
    SecureTenantLLMConfigs
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
    """Get specific tenant configuration (secure - no sensitive data)"""
    if config_type not in ["llm", "rate_limits", "auth", "cors", "security"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid config type. Must be 'llm', 'rate_limits', 'auth', 'cors', or 'security'"
        )
    
    config_service = TenantConfigService(db)
    config = config_service.get_config(current_user.tenant_id, config_type)
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuration of type '{config_type}' not found"
        )
    
    # Convert to secure version (exclude sensitive data like JWT secrets, API keys, encryption keys)
    secure_config = config_service._convert_config_to_secure(config, config_type)
    return secure_config


@router.get("/configurations/{config_type}/secret")
async def get_tenant_config_secret(
    config_type: str,
    current_user: User = Depends(require_permission("tenant_config:read")),
    db: Session = Depends(get_db)
):
    """Get sensitive configuration data (JWT secret, encryption keys, API keys) for display purposes"""
    if config_type not in ["auth", "security", "llm"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid config type for secret access. Must be 'auth', 'security', or 'llm'"
        )
    
    config_service = TenantConfigService(db)
    config = config_service.get_config(current_user.tenant_id, config_type)
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuration of type '{config_type}' not found"
        )
    
    # Return only the sensitive fields for display
    config_data = config.config_data
    
    if config_type == "auth":
        return {
            "jwt_secret_key": config_data.get("jwt_secret_key", "")
        }
    elif config_type == "security":
        return {
            "encryption_key": config_data.get("encryption_key", "")
        }
    elif config_type == "llm":
        # Return API keys for both field and document extraction
        result = {}
        if "field_extraction" in config_data:
            result["field_extraction"] = {
                "api_key": config_data["field_extraction"].get("api_key", "")
            }
        if "document_extraction" in config_data:
            result["document_extraction"] = {
                "api_key": config_data["document_extraction"].get("api_key", "")
            }
        return result
    
    return {}


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
    elif config_data.config_type == "auth":
        try:
            from ..schemas.tenant_configuration import AuthenticationConfig
            AuthenticationConfig(**config_data.config_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid authentication configuration: {str(e)}"
            )
    elif config_data.config_type == "cors":
        try:
            from ..schemas.tenant_configuration import CORSConfig
            CORSConfig(**config_data.config_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid CORS configuration: {str(e)}"
            )
    elif config_data.config_type == "security":
        try:
            from ..schemas.tenant_configuration import SecurityConfig
            SecurityConfig(**config_data.config_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid security configuration: {str(e)}"
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
    if config_type not in ["llm", "rate_limits", "auth", "cors", "security"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid config type. Must be 'llm', 'rate_limits', 'auth', 'cors', or 'security'"
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
    elif config_type == "auth":
        try:
            from ..schemas.tenant_configuration import AuthenticationConfig
            AuthenticationConfig(**updated_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid authentication configuration: {str(e)}"
            )
    elif config_type == "cors":
        try:
            from ..schemas.tenant_configuration import CORSConfig
            CORSConfig(**updated_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid CORS configuration: {str(e)}"
            )
    elif config_type == "security":
        try:
            from ..schemas.tenant_configuration import SecurityConfig
            SecurityConfig(**updated_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid security configuration: {str(e)}"
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
    if config_type not in ["llm", "rate_limits", "auth", "cors", "security"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid config type. Must be 'llm', 'rate_limits', 'auth', 'cors', or 'security'"
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
    infrastructure_service = TenantInfrastructureService(db)
    llm_config = infrastructure_service.get_llm_config(current_user.tenant_id)
    
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
    infrastructure_service = TenantInfrastructureService(db)
    llm_config = infrastructure_service.get_llm_config(current_user.tenant_id)
    
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
        
        # Use minimal test data for faster response
        minimal_test_data = {
            "document_text": test_data.get("document_text", "Sample invoice: Invoice #12345, Amount: $100.00, Date: 2024-01-15"),
            "schema": test_data.get("schema", {"invoice_number": "string", "amount": "number", "date": "string"}),
            "prompt_config": test_data.get("prompt_config", {
                "system_prompt": "Extract the specified fields from the document.",
                "instructions": "Return the extracted data in JSON format."
            })
        }
        
        result = await llm_service.extract_data(
            document_text=minimal_test_data["document_text"],
            schema=minimal_test_data["schema"],
            prompt_config=minimal_test_data["prompt_config"]
        )
        
        return {
            "status": "success",
            "message": "LLM test completed successfully",
            "result": result,
            "test_data_used": minimal_test_data
        }
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


# ============================================================================
# ENVIRONMENT-AWARE INFRASTRUCTURE ENDPOINTS
# ============================================================================

@router.get("/configurations/environments")
async def get_tenant_environments(
    current_user: User = Depends(require_permission("tenant_config:read")),
    db: Session = Depends(get_db)
):
    """Get available environments for tenant"""
    config_service = TenantConfigService(db)
    environments = config_service.get_available_environments(current_user.tenant_id)
    return {"environments": environments}


@router.get("/configurations/{config_type}/{environment}")
async def get_tenant_config_by_environment(
    config_type: str,
    environment: str,
    current_user: User = Depends(require_permission("tenant_config:read")),
    db: Session = Depends(get_db)
):
    """Get tenant configuration for specific environment (secure - no sensitive data)"""
    config_service = TenantConfigService(db)
    config = config_service.get_config(current_user.tenant_id, config_type, environment)
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No {config_type} configuration found for {environment} environment"
        )
    
    # Convert to secure version (exclude sensitive data like JWT secrets, API keys, encryption keys)
    secure_config = config_service._convert_config_to_secure(config, config_type)
    if secure_config and 'environment' not in secure_config:
        secure_config['environment'] = environment
    return secure_config


@router.put("/configurations/{config_type}/{environment}")
async def update_tenant_config_by_environment(
    config_type: str,
    environment: str,
    config_data: Dict[str, Any],
    current_user: User = Depends(require_permission("tenant_config:write")),
    db: Session = Depends(get_db)
):
    """Update tenant configuration for specific environment"""
    config_service = TenantConfigService(db)
    
    config = config_service.create_or_update_config_by_environment(
        tenant_id=current_user.tenant_id,
        config_type=config_type,
        environment=environment,
        config_data=config_data
    )
    
    return config


@router.get("/secrets/{environment}")
async def get_tenant_environment_secrets(
    environment: str,
    current_user: User = Depends(require_permission("tenant_config:read")),
    db: Session = Depends(get_db)
):
    """Get secrets for tenant environment (values will be masked)"""
    secret_service = TenantSecretService(db)
    secrets = secret_service.get_environment_secrets(current_user.tenant_id, environment)
    
    return {"environment": environment, "secrets": secrets}


@router.put("/secrets/{environment}/{secret_type}")
async def update_tenant_environment_secret(
    environment: str,
    secret_type: str,
    secret_data: Dict[str, str],
    current_user: User = Depends(require_permission("tenant_config:write")),
    db: Session = Depends(get_db)
):
    """Update secret for tenant environment"""
    secret_service = TenantSecretService(db)
    
    if secret_type not in secret_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Secret value not provided"
        )
    
    secret_service.store_secret(
        tenant_id=current_user.tenant_id,
        environment=environment,
        secret_type=secret_type,
        value=secret_data[secret_type]
    )
    
    return {"message": "Secret updated successfully"}


@router.get("/infrastructure/status/{environment}")
async def get_tenant_infrastructure_status(
    environment: str,
    current_user: User = Depends(require_permission("tenant_config:read")),
    db: Session = Depends(get_db)
):
    """Get infrastructure status for tenant environment"""
    infrastructure_service = TenantInfrastructureService(db)
    
    try:
        status = infrastructure_service.get_environment_infrastructure_status(
            current_user.tenant_id, environment
        )
        return status
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get infrastructure status: {str(e)}"
        )


@router.get("/infrastructure/config/{environment}")
async def get_tenant_infrastructure_config(
    environment: str,
    current_user: User = Depends(require_permission("tenant_config:read")),
    db: Session = Depends(get_db)
):
    """Get all infrastructure configurations for tenant environment"""
    config_service = TenantConfigService(db)
    
    try:
        configs = config_service.get_environment_configs(current_user.tenant_id, environment)
        return {
            "environment": environment,
            "configurations": configs
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get infrastructure config: {str(e)}"
        )


# ============================================================================
# TENANT SLUG ENDPOINTS
# ============================================================================

@router.get("/info", response_model=Dict[str, Any])
async def get_tenant_info(
    current_user: User = Depends(require_permission("tenant_config:read")),
    db: Session = Depends(get_db)
):
    """Get current tenant information including slug"""
    try:
        infrastructure_service = TenantInfrastructureService(db)
        tenant_info = infrastructure_service.get_tenant_by_slug(current_user.tenant.slug)
        if not tenant_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        return tenant_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tenant info: {str(e)}"
        )


@router.get("/{slug}/info", response_model=Dict[str, Any])
async def get_tenant_info_by_slug(
    slug: str,
    current_user: User = Depends(require_permission("tenant_config:read")),
    db: Session = Depends(get_db)
):
    """Get tenant information by slug"""
    try:
        infrastructure_service = TenantInfrastructureService(db)
        tenant_info = infrastructure_service.get_tenant_by_slug(slug)
        if not tenant_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        return tenant_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tenant info: {str(e)}"
        )


@router.get("/{slug}/infrastructure/status/{environment}", response_model=Dict[str, Any])
async def get_tenant_infrastructure_status_by_slug(
    slug: str,
    environment: str,
    current_user: User = Depends(require_permission("tenant_config:read")),
    db: Session = Depends(get_db)
):
    """Get infrastructure status for a tenant by slug"""
    try:
        tenant_utils = TenantUtils(db)
        tenant = tenant_utils.get_tenant_by_slug(slug)
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        infrastructure_service = TenantInfrastructureService(db)
        status = infrastructure_service.get_environment_infrastructure_status(tenant.id, environment)
        return status
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get infrastructure status: {str(e)}"
        )


@router.get("/{slug}/infrastructure/config/{environment}", response_model=Dict[str, Any])
async def get_tenant_infrastructure_config_by_slug(
    slug: str,
    environment: str,
    current_user: User = Depends(require_permission("tenant_config:read")),
    db: Session = Depends(get_db)
):
    """Get infrastructure configuration for a tenant by slug with slug-based resource naming"""
    try:
        tenant_utils = TenantUtils(db)
        tenant = tenant_utils.get_tenant_by_slug(slug)
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        infrastructure_service = TenantInfrastructureService(db)
        
        # Get processed configurations with slug-based naming
        configs = {}
        
        # Get storage config with slug-based naming
        try:
            storage_config = infrastructure_service.get_storage_config(tenant.id, environment)
            configs["storage"] = storage_config
        except Exception as e:
            configs["storage"] = {"error": f"Storage config not available: {str(e)}"}
        
        # Get cache config with slug-based naming
        try:
            cache_config = infrastructure_service.get_cache_config(tenant.id, environment)
            configs["cache"] = cache_config
        except Exception as e:
            configs["cache"] = {"error": f"Cache config not available: {str(e)}"}
        
        # Get queue config with slug-based naming
        try:
            queue_config = infrastructure_service.get_queue_config(tenant.id, environment)
            configs["message_queue"] = queue_config
        except Exception as e:
            configs["message_queue"] = {"error": f"Queue config not available: {str(e)}"}
        
        # Get LLM config
        try:
            llm_config = infrastructure_service.get_llm_config(tenant.id, environment)
            if isinstance(llm_config, TenantLLMConfigs):
                configs["llm"] = SecureTenantLLMConfigs(
                    field_extraction=SecureLLMConfig(
                        **llm_config.field_extraction.model_dump(exclude={"api_key"})
                    ) if llm_config.field_extraction else None,
                    document_extraction=SecureLLMConfig(
                        **llm_config.document_extraction.model_dump(exclude={"api_key"})
                    ) if llm_config.document_extraction else None,
                )
            elif llm_config:
                configs["llm"] = SecureLLMConfig(
                    **llm_config.model_dump(exclude={"api_key"})
                )
            else:
                configs["llm"] = None
        except Exception as e:
            configs["llm"] = {"error": f"LLM config not available: {str(e)}"}
        
        return {
            "environment": environment,
            "tenant_slug": slug,
            "configurations": configs
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get infrastructure config: {str(e)}"
        )


