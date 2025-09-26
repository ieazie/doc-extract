"""
Tenant Configuration Service

This service manages tenant-specific configurations including LLM settings,
rate limits, and other tenant-specific configurations.
"""

import logging
from typing import Optional, List, Dict, Any, Union
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta

from ..models.database import TenantConfiguration, TenantRateLimit
from ..schemas.tenant_configuration import (
    TenantConfigurationResponse,
    TenantRateLimitResponse,
    TenantConfigSummary,
    LLMConfig,
    TenantLLMConfigs,
    RateLimitsConfig,
    AuthenticationConfig,
    CORSConfig,
    SecurityConfig,
    SecureAuthenticationConfig,
    SecureSecurityConfig,
    SecureLLMConfig,
    SecureTenantLLMConfigs
)
from .tenant_secret_service import TenantSecretService

logger = logging.getLogger(__name__)


class TenantConfigService:
    """Service for managing tenant-specific configurations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.secret_service = TenantSecretService(db)
    
    def list_tenant_configs(self, tenant_id: UUID) -> List[TenantConfigurationResponse]:
        """List all configurations for a tenant"""
        configs = self.db.query(TenantConfiguration).filter(
            TenantConfiguration.tenant_id == tenant_id
        ).all()
        
        return [TenantConfigurationResponse.from_orm(config) for config in configs]
    
    def get_config(self, tenant_id: UUID, config_type: str, environment: Optional[str] = None) -> Optional[TenantConfigurationResponse]:
        """Get specific configuration for a tenant"""
        query = self.db.query(TenantConfiguration).filter(
            and_(
                TenantConfiguration.tenant_id == tenant_id,
                TenantConfiguration.config_type == config_type,
                TenantConfiguration.is_active == True
            )
        )
        
        # Filter by environment if provided
        if environment:
            query = query.filter(TenantConfiguration.environment == environment)
        
        config = query.first()
        if config:
            return TenantConfigurationResponse.from_orm(config)
        return None
    
    def create_or_update_config(
        self, 
        tenant_id: UUID, 
        config_type: str, 
        config_data: Dict[str, Any], 
        is_active: bool = True,
        environment: str = "development"
    ) -> TenantConfigurationResponse:
        """Create or update tenant configuration"""
        
        # Check if configuration already exists
        existing_config = self.db.query(TenantConfiguration).filter(
            and_(
                TenantConfiguration.tenant_id == tenant_id,
                TenantConfiguration.config_type == config_type,
                TenantConfiguration.environment == environment
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
                is_active=is_active,
                environment=environment
            )
            self.db.add(new_config)
            self.db.commit()
            self.db.refresh(new_config)
            return TenantConfigurationResponse.from_orm(new_config)
    
    def create_or_update_config_by_environment(
        self,
        tenant_id: UUID,
        config_type: str,
        environment: str,
        config_data: Dict[str, Any]
    ) -> TenantConfigurationResponse:
        """Create or update configuration for specific environment"""
        # For now, we'll store environment as part of config_data
        # In the future, we might want to add environment as a separate column
        env_config_data = {
            **config_data,
            "environment": environment
        }
        
        return self.create_or_update_config(
            tenant_id=tenant_id,
            config_type=config_type,
            config_data=env_config_data,
            is_active=True,
            environment=environment
        )
    
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
    
    def get_llm_config(self, tenant_id: UUID, environment: str = "development") -> Optional[Union[LLMConfig, TenantLLMConfigs]]:
        """Get LLM configuration for tenant and environment"""
        config = self.get_config(tenant_id, "llm", environment)
        if not config:
            return None
        
        config_data = config.config_data
        
        # Check if it's the new dual configuration structure
        if "field_extraction" in config_data and "document_extraction" in config_data:
            return TenantLLMConfigs(**config_data)
        else:
            return LLMConfig(**config_data)
    
    def get_rate_limits_config(self, tenant_id: UUID) -> Optional[RateLimitsConfig]:
        """Get rate limits configuration for tenant"""
        config = self.get_config(tenant_id, "rate_limits")
        if not config:
            return None
        
        return RateLimitsConfig(**config.config_data)
    
    def get_auth_config(self, tenant_id: UUID, environment: Optional[str] = None) -> Optional[AuthenticationConfig]:
        """Get authentication configuration for tenant"""
        config = self.get_config(tenant_id, "auth", environment)
        if not config:
            return None
        
        return AuthenticationConfig(**config.config_data)
    
    def get_cors_config(self, tenant_id: UUID, environment: Optional[str] = None) -> Optional[CORSConfig]:
        """Get CORS configuration for tenant"""
        config = self.get_config(tenant_id, "cors", environment)
        if not config:
            return None
        
        return CORSConfig(**config.config_data)
    
    def get_security_config(self, tenant_id: UUID, environment: Optional[str] = None) -> Optional[SecurityConfig]:
        """Get security configuration for tenant"""
        config = self.get_config(tenant_id, "security", environment)
        if not config:
            return None
        
        return SecurityConfig(**config.config_data)
    
    def create_default_auth_config(self, tenant_id: UUID, environment: str = "development") -> AuthenticationConfig:
        """Create default authentication configuration for tenant"""
        import secrets
        
        # Environment-aware defaults
        env_defaults = {
            'development': {
                'access_token_expire_minutes': 60,
                'refresh_token_expire_days': 30,
                'refresh_cookie_secure': False,
                'refresh_cookie_samesite': 'lax',
                'max_login_attempts': 10,
                'lockout_duration_minutes': 5,
            },
            'staging': {
                'access_token_expire_minutes': 30,
                'refresh_token_expire_days': 7,
                'refresh_cookie_secure': True,
                'refresh_cookie_samesite': 'strict',
                'max_login_attempts': 5,
                'lockout_duration_minutes': 15,
            },
            'production': {
                'access_token_expire_minutes': 15,
                'refresh_token_expire_days': 3,
                'refresh_cookie_secure': True,
                'refresh_cookie_samesite': 'strict',
                'max_login_attempts': 3,
                'lockout_duration_minutes': 30,
                'require_2fa': True,
            }
        }
        
        defaults = env_defaults.get(environment, env_defaults['development'])
        
        auth_config = AuthenticationConfig(
            jwt_secret_key=secrets.token_urlsafe(32),
            encryption_key=secrets.token_urlsafe(32),
            **defaults
        )
        
        # Store the configuration
        self.create_or_update_config(
            tenant_id=tenant_id,
            config_type="auth",
            config_data=auth_config.dict(),
            is_active=True,
            environment=environment
        )
        
        return auth_config
    
    def create_default_cors_config(self, tenant_id: UUID, environment: str = "development") -> CORSConfig:
        """Create default CORS configuration for tenant"""
        
        # Environment-aware defaults
        env_defaults = {
            'development': {
                'allowed_origins': [
                    'http://localhost:3000',
                    'http://127.0.0.1:3000',
                    'http://frontend:3000'
                ]
            },
            'staging': {
                'allowed_origins': [
                    'https://staging.example.com',
                    'https://staging-frontend.example.com'
                ]
            },
            'production': {
                'allowed_origins': [
                    'https://app.example.com',
                    'https://www.example.com'
                ]
            }
        }
        
        defaults = env_defaults.get(environment, env_defaults['development'])
        
        cors_config = CORSConfig(**defaults)
        
        # Store the configuration
        self.create_or_update_config(
            tenant_id=tenant_id,
            config_type="cors",
            config_data=cors_config.dict(),
            is_active=True,
            environment=environment
        )
        
        return cors_config
    
    def create_default_security_config(self, tenant_id: UUID, environment: str = "development") -> SecurityConfig:
        """Create default security configuration for tenant"""
        import secrets
        
        # Environment-aware defaults
        env_defaults = {
            'development': {
                'csrf_protection_enabled': False,
                'rate_limiting_enabled': False,
                'strict_transport_security': False,
                'compromise_detection_enabled': False,
                'auto_revoke_on_compromise': False,
            },
            'staging': {
                'csrf_protection_enabled': True,
                'rate_limiting_enabled': True,
                'strict_transport_security': True,
                'compromise_detection_enabled': True,
                'auto_revoke_on_compromise': False,  # Manual review in staging
            },
            'production': {
                'csrf_protection_enabled': True,
                'rate_limiting_enabled': True,
                'strict_transport_security': True,
                'content_security_policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
                'compromise_detection_enabled': True,
                'auto_revoke_on_compromise': True,  # Auto-revoke in production
            }
        }
        
        defaults = env_defaults.get(environment, env_defaults['development'])
        
        security_config = SecurityConfig(
            encryption_key=secrets.token_urlsafe(32),
            **defaults
        )
        
        # Store the configuration
        self.create_or_update_config(
            tenant_id=tenant_id,
            config_type="security",
            config_data=security_config.dict(),
            is_active=True,
            environment=environment
        )
        
        return security_config
    
    def get_tenant_config_summary(self, tenant_id: UUID) -> TenantConfigSummary:
        """Get comprehensive tenant configuration summary (secure version - no secrets)"""
        
        # Get LLM configuration and convert to secure version
        llm_config = self.get_llm_config(tenant_id)
        secure_llm_config = self._convert_to_secure_llm_config(llm_config) if llm_config else None
        
        # Get rate limits configuration (already safe)
        rate_limits = self.get_rate_limits_config(tenant_id)
        
        # Get authentication configuration and convert to secure version
        auth_config = self.get_auth_config(tenant_id)
        secure_auth_config = self._convert_to_secure_auth_config(auth_config) if auth_config else None
        
        # Get CORS configuration (already safe)
        cors_config = self.get_cors_config(tenant_id)
        
        # Get security configuration and convert to secure version
        security_config = self.get_security_config(tenant_id)
        secure_security_config = self._convert_to_secure_security_config(security_config) if security_config else None
        
        # Get current rate limit usage (this would be implemented in RateLimitService)
        rate_usage = None
        
        return TenantConfigSummary(
            tenant_id=tenant_id,
            llm_config=secure_llm_config,
            rate_limits=rate_limits,
            rate_usage=rate_usage,
            auth_config=secure_auth_config,
            cors_config=cors_config,
            security_config=secure_security_config
        )
    
    def _convert_to_secure_auth_config(self, auth_config: AuthenticationConfig) -> SecureAuthenticationConfig:
        """Convert AuthenticationConfig to SecureAuthenticationConfig (exclude JWT secret)"""
        from ..schemas.tenant_configuration import SecureAuthenticationConfig
        
        return SecureAuthenticationConfig(
            access_token_expire_minutes=auth_config.access_token_expire_minutes,
            refresh_token_expire_days=auth_config.refresh_token_expire_days,
            refresh_cookie_httponly=auth_config.refresh_cookie_httponly,
            refresh_cookie_secure=auth_config.refresh_cookie_secure,
            refresh_cookie_samesite=auth_config.refresh_cookie_samesite,
            refresh_cookie_path=auth_config.refresh_cookie_path,
            refresh_cookie_domain=auth_config.refresh_cookie_domain,
            max_login_attempts=auth_config.max_login_attempts,
            lockout_duration_minutes=auth_config.lockout_duration_minutes,
            password_min_length=auth_config.password_min_length,
            require_2fa=auth_config.require_2fa,
            session_timeout_minutes=getattr(auth_config, 'session_timeout_minutes', 480),
            concurrent_sessions_limit=getattr(auth_config, 'concurrent_sessions_limit', 5),
            has_jwt_secret=bool(getattr(auth_config, 'jwt_secret_key', '') and auth_config.jwt_secret_key.strip())
        )
    
    def _convert_to_secure_security_config(self, security_config: SecurityConfig) -> SecureSecurityConfig:
        """Convert SecurityConfig to SecureSecurityConfig (exclude encryption key)"""
        from ..schemas.tenant_configuration import SecureSecurityConfig
        
        return SecureSecurityConfig(
            csrf_protection_enabled=security_config.csrf_protection_enabled,
            csrf_token_header=security_config.csrf_token_header,
            rate_limiting_enabled=security_config.rate_limiting_enabled,
            rate_limit_requests_per_minute=security_config.rate_limit_requests_per_minute,
            rate_limit_burst_size=security_config.rate_limit_burst_size,
            security_headers_enabled=security_config.security_headers_enabled,
            content_security_policy=security_config.content_security_policy,
            strict_transport_security=security_config.strict_transport_security,
            x_frame_options=security_config.x_frame_options,
            x_content_type_options=security_config.x_content_type_options,
            compromise_detection_enabled=security_config.compromise_detection_enabled,
            compromise_detection_threshold=security_config.compromise_detection_threshold,
            rapid_token_threshold=security_config.rapid_token_threshold,
            auto_revoke_on_compromise=security_config.auto_revoke_on_compromise,
            referrer_policy=security_config.referrer_policy
        )
    
    def _convert_to_secure_auth_config(self, auth_config) -> SecureAuthenticationConfig:
        """Convert AuthenticationConfig to SecureAuthenticationConfig (exclude JWT secret)"""
        from ..schemas.tenant_configuration import SecureAuthenticationConfig
        
        if not auth_config:
            return None
        
        return SecureAuthenticationConfig(
            access_token_expire_minutes=auth_config.access_token_expire_minutes,
            refresh_token_expire_days=auth_config.refresh_token_expire_days,
            refresh_cookie_httponly=auth_config.refresh_cookie_httponly,
            refresh_cookie_secure=auth_config.refresh_cookie_secure,
            refresh_cookie_samesite=auth_config.refresh_cookie_samesite,
            refresh_cookie_path=auth_config.refresh_cookie_path,
            refresh_cookie_domain=auth_config.refresh_cookie_domain,
            max_login_attempts=auth_config.max_login_attempts,
            lockout_duration_minutes=auth_config.lockout_duration_minutes,
            password_min_length=auth_config.password_min_length,
            require_2fa=auth_config.require_2fa,
            session_timeout_minutes=auth_config.session_timeout_minutes,
            concurrent_sessions_limit=auth_config.concurrent_sessions_limit,
            has_jwt_secret=bool(getattr(auth_config, 'jwt_secret_key', '') and auth_config.jwt_secret_key.strip())
            # jwt_secret_key is intentionally excluded for security
        )

    def _convert_to_secure_security_config(self, security_config) -> SecureSecurityConfig:
        """Convert SecurityConfig to SecureSecurityConfig (exclude encryption key)"""
        from ..schemas.tenant_configuration import SecureSecurityConfig
        
        if not security_config:
            return None
        
        return SecureSecurityConfig(
            csrf_protection_enabled=security_config.csrf_protection_enabled,
            csrf_token_header=security_config.csrf_token_header,
            rate_limiting_enabled=security_config.rate_limiting_enabled,
            rate_limit_requests_per_minute=security_config.rate_limit_requests_per_minute,
            rate_limit_burst_size=security_config.rate_limit_burst_size,
            security_headers_enabled=security_config.security_headers_enabled,
            content_security_policy=security_config.content_security_policy,
            strict_transport_security=security_config.strict_transport_security,
            x_frame_options=security_config.x_frame_options,
            x_content_type_options=security_config.x_content_type_options,
            referrer_policy=security_config.referrer_policy,
            compromise_detection_enabled=security_config.compromise_detection_enabled,
            compromise_detection_threshold=security_config.compromise_detection_threshold,
            rapid_token_threshold=security_config.rapid_token_threshold,
            auto_revoke_on_compromise=security_config.auto_revoke_on_compromise
            # encryption_key is intentionally excluded for security
        )

    def _convert_to_secure_llm_config(self, llm_config) -> SecureTenantLLMConfigs:
        """Convert LLMConfig to SecureLLMConfig (exclude API keys)"""
        from ..schemas.tenant_configuration import SecureLLMConfig, SecureTenantLLMConfigs
        
        def convert_single_config(config):
            if not config:
                return None
            
            # Handle both dict and object inputs
            if isinstance(config, dict):
                # Convert dict to object-like access
                provider = config.get('provider', '')
                api_key = config.get('api_key', '')
                ollama_config = config.get('ollama_config')
            else:
                # Object access
                provider = config.provider
                api_key = config.api_key
                ollama_config = config.ollama_config
            
            # Convert ollama_config to dict if it's an object
            ollama_config_dict = None
            if ollama_config:
                if hasattr(ollama_config, 'model_dump'):
                    ollama_config_dict = ollama_config.model_dump()
                elif hasattr(ollama_config, '__dict__'):
                    ollama_config_dict = ollama_config.__dict__
                else:
                    ollama_config_dict = ollama_config
            
            # Check if API key exists (for providers that require it)
            has_api_key = False
            if provider in ['openai', 'anthropic']:
                has_api_key = bool(api_key and api_key.strip())
            
            return SecureLLMConfig(
                provider=provider,
                model_name=config.get('model_name', '') if isinstance(config, dict) else config.model_name,
                base_url=config.get('base_url') if isinstance(config, dict) else config.base_url,
                max_tokens=config.get('max_tokens') if isinstance(config, dict) else config.max_tokens,
                temperature=config.get('temperature') if isinstance(config, dict) else config.temperature,
                ollama_config=ollama_config_dict,
                has_api_key=has_api_key
            )
        
        # Handle both dict and object inputs
        if isinstance(llm_config, dict):
            if 'field_extraction' in llm_config and 'document_extraction' in llm_config:
                # TenantLLMConfigs (dict)
                return SecureTenantLLMConfigs(
                    field_extraction=convert_single_config(llm_config['field_extraction']),
                    document_extraction=convert_single_config(llm_config['document_extraction'])
                )
            else:
                # Single LLMConfig (dict)
                return convert_single_config(llm_config)
        else:
            # Object inputs
            if hasattr(llm_config, 'field_extraction') and hasattr(llm_config, 'document_extraction'):
                # TenantLLMConfigs (object)
                return SecureTenantLLMConfigs(
                    field_extraction=convert_single_config(llm_config.field_extraction),
                    document_extraction=convert_single_config(llm_config.document_extraction)
                )
            else:
                # Single LLMConfig (object)
                return convert_single_config(llm_config)

    def _convert_config_to_secure(self, config, config_type: str):
        """Convert configuration to secure version based on type"""
        if not config:
            return None
        
        config_data = config.config_data
        
        if config_type == "auth":
            from ..schemas.tenant_configuration import AuthenticationConfig
            auth_config = AuthenticationConfig(**config_data)
            secure_config_data = self._convert_to_secure_auth_config(auth_config)
        elif config_type == "security":
            from ..schemas.tenant_configuration import SecurityConfig
            security_config = SecurityConfig(**config_data)
            secure_config_data = self._convert_to_secure_security_config(security_config)
        elif config_type == "llm":
            llm_config = self._convert_to_secure_llm_config(config_data)
            secure_config_data = llm_config
        elif config_type in ["rate_limits", "cors"]:
            # These configs are safe to expose as-is
            secure_config_data = config_data
        else:
            # Unknown config type, return as-is (should not happen)
            secure_config_data = config_data
        
        # Build secure response - handle both database objects and response objects
        # Convert secure_config_data to dict if it's a Pydantic model
        if hasattr(secure_config_data, 'model_dump'):
            config_data_dict = secure_config_data.model_dump()
        elif hasattr(secure_config_data, 'dict'):
            config_data_dict = secure_config_data.dict()
        else:
            config_data_dict = secure_config_data
        
        result = {
            "id": config.id,
            "tenant_id": config.tenant_id,
            "config_type": config.config_type,
            "config_data": config_data_dict,
            "is_active": config.is_active,
            "created_at": config.created_at,
            "updated_at": config.updated_at
        }
        
        # Add environment field if it exists (for database objects)
        if hasattr(config, 'environment'):
            result["environment"] = config.environment
        else:
            # For response objects, we need to get environment from the method parameter
            # This will be handled by the calling method
            pass
        
        return result
    
    def get_available_environments(self, tenant_id: UUID) -> List[str]:
        """Get available environments for tenant"""
        # For now, return standard environments
        # In the future, this could be dynamic based on tenant configuration
        return ["development", "staging", "production"]
    
    def get_environment_configs(self, tenant_id: UUID, environment: str) -> Dict[str, Any]:
        """Get all configurations for a specific environment"""
        configs = {}
        
        # Get LLM config for environment
        llm_config = self.get_config(tenant_id, "llm", environment)
        if llm_config:
            configs["llm"] = llm_config.config_data
        
        # Get rate limits config for environment
        rate_limits_config = self.get_config(tenant_id, "rate_limits", environment)
        if rate_limits_config:
            configs["rate_limits"] = rate_limits_config.config_data
        
        return configs


class RateLimitService:
    """Service for managing tenant rate limits"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_rate_limit_status(self, tenant_id: UUID, limit_type: str) -> Optional[TenantRateLimitResponse]:
        """Get current rate limit status"""
        rate_limit = self.db.query(TenantRateLimit).filter(
            and_(
                TenantRateLimit.tenant_id == tenant_id,
                TenantRateLimit.limit_type == limit_type
            )
        ).first()
        
        if rate_limit:
            return TenantRateLimitResponse.from_orm(rate_limit)
        return None
    
    def check_rate_limit(self, tenant_id: UUID, limit_type: str, limit_value: int) -> bool:
        """Check if tenant has exceeded rate limit"""
        rate_limit = self.get_rate_limit_status(tenant_id, limit_type)
        
        if not rate_limit:
            # No rate limit set, allow request
            return True
        
        # Check if we're in a new time window
        from datetime import timezone
        now = datetime.now(timezone.utc)
        window_duration = self._get_window_duration(limit_type)
        
        if now - rate_limit.window_start > window_duration:
            # Reset the window
            rate_limit.current_count = 0
            rate_limit.window_start = now
            self.db.commit()
        
        # Check if limit is exceeded
        if rate_limit.current_count >= limit_value:
            return False
        
        return True
    
    def increment_rate_limit(self, tenant_id: UUID, limit_type: str) -> None:
        """Increment rate limit counter"""
        rate_limit = self.db.query(TenantRateLimit).filter(
            and_(
                TenantRateLimit.tenant_id == tenant_id,
                TenantRateLimit.limit_type == limit_type
            )
        ).first()
        
        if rate_limit:
            rate_limit.current_count += 1
        else:
            # Create new rate limit record
            from datetime import timezone
            rate_limit = TenantRateLimit(
                tenant_id=tenant_id,
                limit_type=limit_type,
                current_count=1,
                window_start=datetime.now(timezone.utc)
            )
            self.db.add(rate_limit)
        
        self.db.commit()
    
    def reset_rate_limits(self, tenant_id: UUID) -> bool:
        """Reset all rate limits for tenant"""
        try:
            rate_limits = self.db.query(TenantRateLimit).filter(
                TenantRateLimit.tenant_id == tenant_id
            ).all()
            
            for rate_limit in rate_limits:
                rate_limit.current_count = 0
                rate_limit.window_start = datetime.utcnow()
            
            self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Failed to reset rate limits for tenant {tenant_id}: {e}")
            self.db.rollback()
            return False
    
    def _get_window_duration(self, limit_type: str) -> timedelta:
        """Get time window duration for limit type"""
        if "per_minute" in limit_type:
            return timedelta(minutes=1)
        elif "per_hour" in limit_type:
            return timedelta(hours=1)
        elif "per_day" in limit_type:
            return timedelta(days=1)
        else:
            return timedelta(hours=1)  # Default to 1 hour
    
    async def get_available_models(self, provider: str) -> List[str]:
        """Get available models for a provider"""
        # This would typically call the LLM provider service
        # For now, return some default models
        default_models = {
            "ollama": ["gemma2:2b", "gemma2:9b", "llama3.2:3b", "llama3.2:8b"],
            "openai": ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
            "anthropic": ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-sonnet-20240229"]
        }
        
        return default_models.get(provider, [])
