"""
Configuration management for the Document Extraction Platform
"""
from pydantic import Field
from pydantic_settings import BaseSettings
from typing import Set, Optional
import os


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Application
    app_name: str = Field(default="Document Extraction Platform", env="APP_NAME")
    debug: bool = Field(default=False, env="DEBUG")
    version: str = Field(default="1.0.0", env="APP_VERSION")
    default_environment: str = Field(default="development", env="DEFAULT_ENVIRONMENT")
    
    # Database
    database_url: str = Field(
        default="postgresql://postgres:password@db:5432/docextract",
        env="DATABASE_URL"
    )
    
    # External Service Endpoints (tenant-agnostic)
    minio_endpoint_url: str = Field(default="http://minio:9000", env="MINIO_ENDPOINT_URL")
    ollama_endpoint_url: str = Field(default="http://ollama:11434", env="OLLAMA_ENDPOINT_URL")
    
    # Global Defaults (can be overridden per tenant)
    default_aws_region: str = Field(default="us-east-1", env="DEFAULT_AWS_REGION")
    default_ollama_model: str = Field(default="gemma3:4b", env="DEFAULT_OLLAMA_MODEL")
    default_openai_model: str = Field(default="gpt-4", env="DEFAULT_OPENAI_MODEL")
    default_openai_max_tokens: int = Field(default=2000, env="DEFAULT_OPENAI_MAX_TOKENS")
    default_openai_temperature: float = Field(default=0.3, env="DEFAULT_OPENAI_TEMPERATURE")
    
    # File Upload Settings
    max_file_size: int = Field(default=20971520, env="MAX_FILE_SIZE")  # 20MB
    allowed_file_types: Set[str] = {
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
    }
    
    # Security
    secret_key: str = Field(default="dev-secret-key-change-in-production", env="SECRET_KEY")
    jwt_secret: str = Field(default="dev-jwt-secret-change-in-production", env="JWT_SECRET")
    access_token_expire_minutes: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    tenant_secret_encryption_key: str = Field(
        default="dev-tenant-secret-encryption-key-change-in-production", 
        env="TENANT_SECRET_ENCRYPTION_KEY"
    )
    
    # CORS Settings
    cors_origins: list = Field(default=["http://localhost:3000", "http://frontend:3000"])
    
    # Redis and Celery Configuration
    redis_url: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    celery_broker_url: str = Field(default="redis://localhost:6379/0", env="CELERY_BROKER_URL")
    celery_result_backend: str = Field(default="redis://localhost:6379/0", env="CELERY_RESULT_BACKEND")
    
    # Monitoring
    sentry_dsn: Optional[str] = Field(default=None, env="SENTRY_DSN")
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # LangExtract Settings
    langextract_max_char_buffer: int = Field(default=8000, env="LANGEXTRACT_MAX_CHAR_BUFFER")
    langextract_extraction_passes: int = Field(default=2, env="LANGEXTRACT_EXTRACTION_PASSES")
    langextract_max_workers: int = Field(default=1, env="LANGEXTRACT_MAX_WORKERS")
    
    # OpenAI Configuration
    openai_api_key: str = Field(default="", env="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4", env="OPENAI_MODEL")
    openai_max_tokens: int = Field(default=2000, env="OPENAI_MAX_TOKENS")
    openai_temperature: float = Field(default=0.3, env="OPENAI_TEMPERATURE")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()


def get_database_url() -> str:
    """Get database URL for SQLAlchemy"""
    return settings.database_url


def get_platform_defaults() -> dict:
    """Get platform-level default configurations"""
    return {
        'minio_endpoint_url': settings.minio_endpoint_url,
        'ollama_endpoint_url': settings.ollama_endpoint_url,
        'default_aws_region': settings.default_aws_region,
        'default_ollama_model': settings.default_ollama_model,
        'default_openai_model': settings.default_openai_model,
        'default_openai_max_tokens': settings.default_openai_max_tokens,
        'default_openai_temperature': settings.default_openai_temperature,
    }


def is_production() -> bool:
    """Check if running in production environment"""
    return not settings.debug and os.getenv('ENV') == 'production'


def get_cors_origins() -> list:
    """Get CORS origins list"""
    if settings.debug:
        return ["*"]  # Allow all origins in development
    return settings.cors_origins
