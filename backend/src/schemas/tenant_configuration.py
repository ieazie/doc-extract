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
    current_count: int
    window_start: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TenantConfigSummary(BaseModel):
    """Summary of tenant configuration"""
    tenant_id: UUID
    llm_config: Optional[Union[LLMConfig, TenantLLMConfigs]] = None
    rate_limits: Optional[RateLimitsConfig] = None
    rate_usage: Optional[Dict[str, int]] = None
