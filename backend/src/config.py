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
    
    # Database
    database_url: str = Field(
        default="postgresql://postgres:password@db:5432/docextract",
        env="DATABASE_URL"
    )
    
    # S3/MinIO Configuration
    aws_access_key_id: str = Field(default="minioadmin", env="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: str = Field(default="minioadmin", env="AWS_SECRET_ACCESS_KEY")
    aws_endpoint_url: Optional[str] = Field(default="http://minio:9000", env="AWS_ENDPOINT_URL")
    aws_region: str = Field(default="us-east-1", env="AWS_REGION")
    s3_bucket_name: str = Field(default="documents", env="S3_BUCKET_NAME")
    
    # Ollama Configuration
    ollama_url: str = Field(default="http://ollama:11434", env="OLLAMA_URL")
    ollama_model: str = Field(default="gemma3:4b", env="OLLAMA_MODEL")
    
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
    
    # CORS Settings
    cors_origins: list = Field(default=["http://localhost:3000", "http://frontend:3000"])
    
    # Redis (for future caching and background tasks)
    redis_url: Optional[str] = Field(default=None, env="REDIS_URL")
    
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


def get_s3_config() -> dict:
    """Get S3 configuration dictionary"""
    config = {
        'aws_access_key_id': settings.aws_access_key_id,
        'aws_secret_access_key': settings.aws_secret_access_key,
        'region_name': settings.aws_region
    }
    
    if settings.aws_endpoint_url:
        config['endpoint_url'] = settings.aws_endpoint_url
    
    return config


def is_production() -> bool:
    """Check if running in production environment"""
    return not settings.debug and os.getenv('ENV') == 'production'


def get_cors_origins() -> list:
    """Get CORS origins list"""
    if settings.debug:
        return ["*"]  # Allow all origins in development
    return settings.cors_origins
