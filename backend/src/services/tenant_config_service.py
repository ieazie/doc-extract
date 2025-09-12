"""
Tenant Configuration Service
"""
from typing import Optional, Dict, Any, List, Union
from sqlalchemy.orm import Session
from sqlalchemy import and_
from uuid import UUID
import json
from datetime import datetime, timedelta, timezone

from ..models.database import TenantConfiguration, TenantRateLimit
from ..schemas.tenant_configuration import (
    TenantConfigurationCreate,
    TenantConfigurationUpdate,
    TenantConfigurationResponse,
    TenantRateLimitResponse,
    LLMConfig,
    TenantLLMConfigs,
    RateLimitsConfig,
    TenantConfigSummary
)
from ..services.llm_provider_service import LLMProviderFactory


class TenantConfigService:
    """Service for managing tenant configurations"""

    def __init__(self, db: Session):
        self.db = db

    def get_config(self, tenant_id: UUID, config_type: str) -> Optional[TenantConfigurationResponse]:
        """Get tenant configuration by type"""
        config = self.db.query(TenantConfiguration).filter(
            and_(
                TenantConfiguration.tenant_id == tenant_id,
                TenantConfiguration.config_type == config_type,
                TenantConfiguration.is_active == True
            )
        ).first()

        if not config:
            return None

        return TenantConfigurationResponse.from_orm(config)

    def get_llm_config(self, tenant_id: UUID) -> Optional[Union[LLMConfig, TenantLLMConfigs]]:
        """Get LLM configuration for tenant"""
        config = self.get_config(tenant_id, "llm")
        if not config:
            return None
        
        # Try to parse as TenantLLMConfigs (new dual structure)
        try:
            if "field_extraction" in config.config_data and "document_extraction" in config.config_data:
                return TenantLLMConfigs(**config.config_data)
            else:
                # Fallback to single LLMConfig (old structure)
                return LLMConfig(**config.config_data)
        except Exception:
            # If parsing fails, try single LLMConfig
            return LLMConfig(**config.config_data)

    def get_rate_limits_config(self, tenant_id: UUID) -> Optional[RateLimitsConfig]:
        """Get rate limits configuration for tenant"""
        config = self.get_config(tenant_id, "rate_limits")
        if not config:
            return None
        
        return RateLimitsConfig(**config.config_data)

    def create_or_update_config(
        self, 
        tenant_id: UUID, 
        config_type: str, 
        config_data: Dict[str, Any],
        is_active: bool = True
    ) -> TenantConfigurationResponse:
        """Create or update tenant configuration"""
        
        # Check if configuration already exists
        existing_config = self.db.query(TenantConfiguration).filter(
            and_(
                TenantConfiguration.tenant_id == tenant_id,
                TenantConfiguration.config_type == config_type
            )
        ).first()

        if existing_config:
            # Update existing configuration
            existing_config.config_data = config_data
            existing_config.is_active = is_active
            existing_config.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(existing_config)
            return TenantConfigurationResponse.from_orm(existing_config)
        else:
            # Create new configuration
            new_config = TenantConfiguration(
                tenant_id=tenant_id,
                config_type=config_type,
                config_data=config_data,
                is_active=is_active
            )
            self.db.add(new_config)
            self.db.commit()
            self.db.refresh(new_config)
            return TenantConfigurationResponse.from_orm(new_config)

    def get_tenant_config_summary(self, tenant_id: UUID) -> TenantConfigSummary:
        """Get comprehensive tenant configuration summary"""
        
        # Get LLM config
        llm_config = self.get_llm_config(tenant_id)
        
        # Get rate limits config
        rate_limits_config = self.get_rate_limits_config(tenant_id)
        
        # Get current rate limit usage
        rate_usage = self.get_rate_limit_usage(tenant_id)
        
        return TenantConfigSummary(
            tenant_id=tenant_id,
            llm_config=llm_config,
            rate_limits=rate_limits_config,
            rate_usage=rate_usage
        )

    def get_rate_limit_usage(self, tenant_id: UUID) -> Dict[str, int]:
        """Get current rate limit usage for tenant"""
        rate_limits = self.db.query(TenantRateLimit).filter(
            TenantRateLimit.tenant_id == tenant_id
        ).all()
        
        usage = {}
        for limit in rate_limits:
            usage[limit.limit_type] = limit.current_count
        
        return usage

    def delete_config(self, tenant_id: UUID, config_type: str) -> bool:
        """Delete tenant configuration"""
        config = self.db.query(TenantConfiguration).filter(
            and_(
                TenantConfiguration.tenant_id == tenant_id,
                TenantConfiguration.config_type == config_type
            )
        ).first()

        if config:
            self.db.delete(config)
            self.db.commit()
            return True
        
        return False

    def list_tenant_configs(self, tenant_id: UUID) -> List[TenantConfigurationResponse]:
        """List all configurations for a tenant"""
        configs = self.db.query(TenantConfiguration).filter(
            TenantConfiguration.tenant_id == tenant_id
        ).all()
        
        return [TenantConfigurationResponse.from_orm(config) for config in configs]


class RateLimitService:
    """Service for managing rate limiting"""

    def __init__(self, db: Session):
        self.db = db

    def check_rate_limit(
        self, 
        tenant_id: UUID, 
        limit_type: str, 
        limit_value: int, 
        window_minutes: int = 60
    ) -> bool:
        """Check if tenant has exceeded rate limit"""
        
        # Get or create rate limit record
        rate_limit = self.db.query(TenantRateLimit).filter(
            and_(
                TenantRateLimit.tenant_id == tenant_id,
                TenantRateLimit.limit_type == limit_type
            )
        ).first()

        if not rate_limit:
            # Create new rate limit record
            rate_limit = TenantRateLimit(
                tenant_id=tenant_id,
                limit_type=limit_type,
                current_count=0,
                window_start=datetime.now(timezone.utc)
            )
            self.db.add(rate_limit)
            self.db.commit()
            self.db.refresh(rate_limit)

        # Check if window has expired
        window_end = rate_limit.window_start + timedelta(minutes=window_minutes)
        now = datetime.now(timezone.utc)
        
        if now > window_end:
            # Reset window
            rate_limit.current_count = 0
            rate_limit.window_start = now
            self.db.commit()

        # Check if limit exceeded
        if rate_limit.current_count >= limit_value:
            return False  # Rate limit exceeded

        return True  # Within rate limit

    def increment_rate_limit(
        self, 
        tenant_id: UUID, 
        limit_type: str, 
        window_minutes: int = 60
    ) -> bool:
        """Increment rate limit counter"""
        
        # Get or create rate limit record
        rate_limit = self.db.query(TenantRateLimit).filter(
            and_(
                TenantRateLimit.tenant_id == tenant_id,
                TenantRateLimit.limit_type == limit_type
            )
        ).first()

        if not rate_limit:
            # Create new rate limit record
            rate_limit = TenantRateLimit(
                tenant_id=tenant_id,
                limit_type=limit_type,
                current_count=1,
                window_start=datetime.now(timezone.utc)
            )
            self.db.add(rate_limit)
            self.db.commit()
            return True

        # Check if window has expired
        window_end = rate_limit.window_start + timedelta(minutes=window_minutes)
        now = datetime.now(timezone.utc)
        
        if now > window_end:
            # Reset window
            rate_limit.current_count = 1
            rate_limit.window_start = now
        else:
            # Increment counter
            rate_limit.current_count += 1

        rate_limit.updated_at = now
        self.db.commit()
        return True

    def reset_rate_limits(self, tenant_id: UUID) -> bool:
        """Reset all rate limits for a tenant"""
        rate_limits = self.db.query(TenantRateLimit).filter(
            TenantRateLimit.tenant_id == tenant_id
        ).all()

        for rate_limit in rate_limits:
            rate_limit.current_count = 0
            rate_limit.window_start = datetime.now(timezone.utc)
            rate_limit.updated_at = datetime.now(timezone.utc)

        self.db.commit()
        return True

    def get_rate_limit_status(self, tenant_id: UUID, limit_type: str) -> Optional[TenantRateLimitResponse]:
        """Get current rate limit status"""
        rate_limit = self.db.query(TenantRateLimit).filter(
            and_(
                TenantRateLimit.tenant_id == tenant_id,
                TenantRateLimit.limit_type == limit_type
            )
        ).first()

        if not rate_limit:
            return None

        return TenantRateLimitResponse.from_orm(rate_limit)

    async def get_available_models(self, provider: str) -> List[str]:
        """Get available models for a specific provider"""
        try:
            # Create a minimal config for the provider
            if provider == "ollama":
                config = LLMConfig(
                    provider="ollama",
                    model_name="gemma2:2b",
                    ollama_config={"host": "http://ollama:11434"}
                )
            elif provider == "openai":
                config = LLMConfig(
                    provider="openai",
                    model_name="gpt-4o",
                    api_key="dummy"  # Will be ignored for model listing
                )
            elif provider == "anthropic":
                config = LLMConfig(
                    provider="anthropic",
                    model_name="claude-3-5-sonnet-20241022",
                    api_key="dummy"  # Will be ignored for model listing
                )
            else:
                return self._get_fallback_models(provider)
            
            # Create provider and get models
            provider_instance = LLMProviderFactory.create_provider(config)
            models = await provider_instance.get_available_models()
            
            # If API call failed, return fallback models
            if not models:
                return self._get_fallback_models(provider)
            
            return models
            
        except Exception as e:
            print(f"Error getting available models for {provider}: {e}")
            return self._get_fallback_models(provider)
    
    def _get_fallback_models(self, provider: str) -> List[str]:
        """Get fallback models when API calls fail"""
        if provider == "ollama":
            return [
                "gemma2:2b",
                "gemma3:4b",
                "llama3.1:8b",
                "llama3.1:70b",
                "mistral:7b",
                "codellama:7b",
                "phi3:3.8b"
            ]
        elif provider == "openai":
            return [
                "gpt-4o",
                "gpt-4o-mini",
                "gpt-4-turbo",
                "gpt-4",
                "gpt-3.5-turbo"
            ]
        elif provider == "anthropic":
            return [
                "claude-3-5-sonnet-20241022",
                "claude-3-5-haiku-20241022",
                "claude-3-opus-20240229",
                "claude-3-sonnet-20240229",
                "claude-3-haiku-20240307"
            ]
        else:
            return []
