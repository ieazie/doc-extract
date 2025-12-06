"""
Pydantic schemas for Tenant Configuration
"""
from typing import Optional, Dict, Any, Union, List
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID


class OllamaConfig(BaseModel):
    """Ollama-specific configuration"""
    host: str = Field(default="http://localhost:11434", description="Ollama server host")
    model_path: Optional[str] = Field(default=None, description="Custom model path")


class LLMConfig(BaseModel):
    """LLM Provider Configuration for specific extraction type"""
    provider: str = Field(..., description="LLM provider: ollama, openai, anthropic, custom")
    model_name: str = Field(..., description="Model name (e.g., gpt-4, claude-3, gemma-3)")
    api_key: Optional[str] = Field(default=None, description="API key (encrypted)")
    base_url: Optional[str] = Field(default=None, description="Custom endpoint URL")
    max_tokens: Optional[int] = Field(default=4000, description="Maximum tokens per request")
    temperature: Optional[float] = Field(default=0.1, description="Temperature for generation")
    ollama_config: Optional[OllamaConfig] = Field(default=None, description="Ollama-specific settings")


class TenantLLMConfigs(BaseModel):
    """Complete LLM Configuration for tenant"""
    field_extraction: LLMConfig = Field(..., description="LLM config for field extraction")
    document_extraction: LLMConfig = Field(..., description="LLM config for document extraction")


class AvailableModelsResponse(BaseModel):
    """Response for available models from LLM provider"""
    provider: str = Field(..., description="Provider name")
    models: List[str] = Field(..., description="List of available model names")
    default_model: Optional[str] = Field(default=None, description="Default recommended model")


class RateLimitsConfig(BaseModel):
    """Rate Limiting Configuration"""
    api_requests_per_minute: int = Field(default=100, description="API requests per minute")
    api_requests_per_hour: int = Field(default=1000, description="API requests per hour")
    document_uploads_per_hour: int = Field(default=50, description="Document uploads per hour")
    extractions_per_hour: int = Field(default=20, description="Extractions per hour")
    max_concurrent_extractions: int = Field(default=3, description="Max concurrent extractions")
    burst_limit: Optional[int] = Field(default=10, description="Burst limit allowance")


class TenantConfigurationCreate(BaseModel):
    """Schema for creating tenant configuration"""
    config_type: str = Field(..., description="Configuration type: llm or rate_limits")
    config_data: Dict[str, Any] = Field(..., description="Configuration data")
    is_active: bool = Field(default=True, description="Whether configuration is active")


class TenantConfigurationUpdate(BaseModel):
    """Schema for updating tenant configuration"""
    config_data: Optional[Dict[str, Any]] = Field(default=None, description="Configuration data")
    is_active: Optional[bool] = Field(default=None, description="Whether configuration is active")


class TenantConfigurationResponse(BaseModel):
    """Schema for tenant configuration response"""
    id: UUID
    tenant_id: UUID
    config_type: str
    config_data: Dict[str, Any]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TenantRateLimitResponse(BaseModel):
    """Schema for tenant rate limit response"""
    id: UUID
    tenant_id: UUID
    limit_type: str
    limit_value: int
    window_start: datetime
    window_end: datetime
    current_usage: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AuthenticationConfig(BaseModel):
    """Tenant-specific authentication configuration"""
    
    # JWT Configuration
    jwt_secret_key: str = Field(..., description="Unique JWT secret key for this tenant")
    access_token_expire_minutes: int = Field(default=30, ge=1, le=1440, description="Access token expiry in minutes")
    refresh_token_expire_days: int = Field(default=7, ge=1, le=30, description="Refresh token expiry in days")
    
    # Cookie Configuration
    refresh_cookie_httponly: bool = Field(default=True, description="HttpOnly flag for refresh token cookie")
    refresh_cookie_secure: bool = Field(default=True, description="Secure flag for refresh token cookie")
    refresh_cookie_samesite: str = Field(default="strict", description="SameSite policy for refresh token cookie")
    refresh_cookie_path: str = Field(default="/api/auth/refresh", description="Path for refresh token cookie")
    refresh_cookie_domain: Optional[str] = Field(default=None, description="Domain for refresh token cookie")
    
    # Security Policies
    max_login_attempts: int = Field(default=5, ge=1, le=20, description="Maximum login attempts before lockout")
    lockout_duration_minutes: int = Field(default=15, ge=1, le=1440, description="Lockout duration in minutes")
    password_min_length: int = Field(default=8, ge=6, le=128, description="Minimum password length")
    require_2fa: bool = Field(default=False, description="Require two-factor authentication")
    
    # Session Management
    session_timeout_minutes: int = Field(default=480, ge=1, le=1440, description="Session timeout in minutes")
    concurrent_sessions_limit: int = Field(default=5, ge=1, le=50, description="Maximum concurrent sessions per user")


class CORSConfig(BaseModel):
    """Tenant-specific CORS configuration"""
    
    allowed_origins: List[str] = Field(default_factory=list, description="Allowed CORS origins")
    allow_credentials: bool = Field(default=True, description="Allow credentials in CORS requests")
    allowed_methods: List[str] = Field(
        default=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        description="Allowed HTTP methods"
    )
    allowed_headers: List[str] = Field(
        default=["*"],
        description="Allowed request headers"
    )
    exposed_headers: List[str] = Field(
        default_factory=list,
        description="Headers exposed to the client"
    )
    max_age: int = Field(default=3600, ge=0, le=86400, description="Preflight cache duration in seconds")


class SecurityConfig(BaseModel):
    """Tenant-specific security configuration"""
    
    # CSRF Protection
    csrf_protection_enabled: bool = Field(default=True, description="Enable CSRF protection")
    csrf_token_header: str = Field(default="X-CSRF-Token", description="CSRF token header name")
    
    # Rate Limiting
    rate_limiting_enabled: bool = Field(default=True, description="Enable rate limiting")
    rate_limit_requests_per_minute: int = Field(default=60, ge=1, le=1000, description="Requests per minute limit")
    rate_limit_burst_size: int = Field(default=100, ge=1, le=1000, description="Burst size for rate limiting")
    
    # Encryption
    encryption_key: str = Field(..., description="Tenant-specific encryption key")
    
    # Security Headers
    security_headers_enabled: bool = Field(default=True, description="Enable security headers")
    content_security_policy: Optional[str] = Field(default=None, description="Content Security Policy")
    strict_transport_security: bool = Field(default=True, description="Enable HSTS")
    x_frame_options: str = Field(default="DENY", description="X-Frame-Options header value")
    x_content_type_options: bool = Field(default=True, description="Enable X-Content-Type-Options")
    
    # Compromise Detection
    compromise_detection_enabled: bool = Field(default=False, description="Enable automatic compromise detection")
    compromise_detection_threshold: int = Field(default=3, ge=1, le=10, description="Minimum suspicious indicators to trigger")
    rapid_token_threshold: int = Field(default=10, ge=5, le=50, description="Max tokens in 5 minutes before flagging")
    auto_revoke_on_compromise: bool = Field(default=False, description="Automatically revoke tokens on compromise detection")
    referrer_policy: str = Field(default="strict-origin-when-cross-origin", description="Referrer Policy")


# Secure versions of config schemas that exclude sensitive fields
class SecureAuthenticationConfig(BaseModel):
    """Secure version of authentication configuration (no secrets)"""
    
    # JWT Configuration (non-sensitive)
    access_token_expire_minutes: int = Field(default=30, ge=1, le=1440, description="Access token expiry in minutes")
    refresh_token_expire_days: int = Field(default=7, ge=1, le=30, description="Refresh token expiry in days")
    
    # Cookie Configuration
    refresh_cookie_httponly: bool = Field(default=True, description="HttpOnly flag for refresh token cookie")
    refresh_cookie_secure: bool = Field(default=True, description="Secure flag for refresh token cookie")
    refresh_cookie_samesite: str = Field(default="strict", description="SameSite policy for refresh token cookie")
    refresh_cookie_path: str = Field(default="/api/auth/refresh", description="Path for refresh token cookie")
    refresh_cookie_domain: Optional[str] = Field(default=None, description="Domain for refresh token cookie")
    
    # Security Policies
    max_login_attempts: int = Field(default=5, ge=1, le=20, description="Maximum login attempts before lockout")
    lockout_duration_minutes: int = Field(default=15, ge=1, le=1440, description="Lockout duration in minutes")
    password_min_length: int = Field(default=8, ge=6, le=128, description="Minimum password length")
    require_2fa: bool = Field(default=False, description="Require two-factor authentication")
    
    # Additional fields
    session_timeout_minutes: int = Field(default=480, ge=1, le=1440, description="Session timeout in minutes")
    concurrent_sessions_limit: int = Field(default=5, ge=1, le=50, description="Maximum concurrent sessions")
    
    # JWT Secret Status (without exposing the actual secret)
    has_jwt_secret: bool = Field(default=False, description="Whether a JWT secret is configured (without exposing the key)")


class SecureSecurityConfig(BaseModel):
    """Secure version of security configuration (no secrets)"""
    
    # CSRF Protection
    csrf_protection_enabled: bool = Field(default=True, description="Enable CSRF protection")
    csrf_token_header: str = Field(default="X-CSRF-Token", description="CSRF token header name")
    
    # Rate Limiting
    rate_limiting_enabled: bool = Field(default=True, description="Enable rate limiting")
    rate_limit_requests_per_minute: int = Field(default=60, ge=1, le=1000, description="Requests per minute limit")
    rate_limit_burst_size: int = Field(default=100, ge=1, le=1000, description="Burst size for rate limiting")
    
    # Encryption
    has_encryption_key: bool = Field(default=False, description="Whether an encryption key is configured (without exposing the key)")
    
    # Security Headers
    security_headers_enabled: bool = Field(default=True, description="Enable security headers")
    content_security_policy: Optional[str] = Field(default=None, description="Content Security Policy")
    strict_transport_security: bool = Field(default=True, description="Enable HSTS")
    x_frame_options: str = Field(default="DENY", description="X-Frame-Options header value")
    x_content_type_options: bool = Field(default=True, description="Enable X-Content-Type-Options")
    
    # Compromise Detection
    compromise_detection_enabled: bool = Field(default=False, description="Enable automatic compromise detection")
    compromise_detection_threshold: int = Field(default=3, ge=1, le=10, description="Minimum suspicious indicators to trigger")
    rapid_token_threshold: int = Field(default=10, ge=5, le=50, description="Max tokens in 5 minutes before flagging")
    auto_revoke_on_compromise: bool = Field(default=False, description="Automatically revoke tokens on compromise detection")
    referrer_policy: str = Field(default="strict-origin-when-cross-origin", description="Referrer Policy")


class SecureLLMConfig(BaseModel):
    """Secure version of LLM configuration (no API keys)"""
    
    provider: str = Field(..., description="LLM provider (openai, ollama, etc.)")
    model_name: str = Field(..., description="Model name to use")
    base_url: Optional[str] = Field(default=None, description="Custom base URL for the API")
    max_tokens: int = Field(default=2000, ge=1, le=32000, description="Maximum tokens to generate")
    temperature: float = Field(default=0.3, ge=0.0, le=2.0, description="Sampling temperature")
    ollama_config: Optional[Dict[str, Any]] = Field(default=None, description="Ollama-specific configuration")
    has_api_key: bool = Field(default=False, description="Whether an API key is configured (without exposing the key)")


class SecureTenantLLMConfigs(BaseModel):
    """Secure version of tenant LLM configurations (no API keys)"""
    
    field_extraction: Optional[SecureLLMConfig] = None
    document_extraction: Optional[SecureLLMConfig] = None


# Removed duplicate secure schema redefinitions; retain single canonical definitions above

class TenantConfigSummary(BaseModel):
    """Summary of tenant configuration (secure version - no secrets exposed)"""
    tenant_id: UUID
    llm_config: Optional[Union[SecureLLMConfig, SecureTenantLLMConfigs]] = None
    rate_limits: Optional[RateLimitsConfig] = None
    rate_usage: Optional[Dict[str, int]] = None
    auth_config: Optional[SecureAuthenticationConfig] = None
    cors_config: Optional[CORSConfig] = None  # CORS config is safe to expose
    security_config: Optional[SecureSecurityConfig] = None

class SecureTenantConfigurationResponse(BaseModel):
    """Secure response for individual tenant configuration (no sensitive data)"""
    id: UUID
    tenant_id: UUID
    config_type: str
    config_data: Union[SecureAuthenticationConfig, SecureSecurityConfig, SecureLLMConfig, SecureTenantLLMConfigs, RateLimitsConfig, CORSConfig]
    environment: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


