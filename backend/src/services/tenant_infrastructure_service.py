"""
Tenant Infrastructure Service
"""
from typing import Optional, Dict, Any, Union
from sqlalchemy.orm import Session
from uuid import UUID
import logging

from .tenant_config_service import TenantConfigService
from .tenant_secret_service import TenantSecretService
from .tenant_utils import TenantUtils
from ..schemas.tenant_configuration import LLMConfig, TenantLLMConfigs
from ..config import get_platform_defaults

logger = logging.getLogger(__name__)


class TenantInfrastructureService:
    """Environment-aware infrastructure service"""
    
    def __init__(self, db: Session):
        self.db = db
        self.config_service = TenantConfigService(db)
        self.secret_service = TenantSecretService(db)
        self.tenant_utils = TenantUtils(db)
    
    def get_storage_config(self, tenant_id: UUID, environment: str = "development") -> Dict[str, Any]:
        """Get tenant environment storage configuration with slug-based resource naming"""
        config = self.config_service.get_config(tenant_id, 'storage', environment)
        platform_defaults = get_platform_defaults()
        
        # Get tenant slug for resource naming
        tenant_slug = self.tenant_utils.get_tenant_slug(tenant_id)
        if not tenant_slug:
            raise Exception(f"Tenant not found: {tenant_id}")
        
        if config:
            config_data = config.config_data.copy()
        else:
            # Use platform defaults if no tenant-specific config
            config_data = {
                'provider': 'minio',
                'region': platform_defaults['default_aws_region'],
                'endpoint_url': platform_defaults['minio_endpoint_url'],
                'max_storage_gb': 50 if environment == 'development' else 100,
                'allowed_file_types': '["pdf", "docx", "txt", "png", "jpg"]'
            }
        
        # Update resource names to use tenant slug
        config_data['bucket_prefix'] = f"{tenant_slug}-{environment}"
        
        # Add secrets to config
        access_key = self.secret_service.get_secret(tenant_id, environment, 'storage_access_key')
        secret_key = self.secret_service.get_secret(tenant_id, environment, 'storage_secret_key')
        
        if access_key:
            config_data['access_key_id'] = access_key
        if secret_key:
            config_data['secret_access_key'] = secret_key
        
        return config_data
    
    def get_cache_config(self, tenant_id: UUID, environment: str = "development") -> Dict[str, Any]:
        """Get tenant environment cache configuration with slug-based resource naming"""
        config = self.config_service.get_config(tenant_id, 'cache', environment)
        platform_defaults = get_platform_defaults()
        
        # Get tenant slug for resource naming
        tenant_slug = self.tenant_utils.get_tenant_slug(tenant_id)
        if not tenant_slug:
            raise Exception(f"Tenant not found: {tenant_id}")
        
        if config:
            config_data = config.config_data.copy()
        else:
            # Use platform defaults if no tenant-specific config
            config_data = {
                'provider': 'redis',
                'host': 'redis',
                'port': 6379,
                'max_memory_mb': 256 if environment == 'development' else 512,
                'ttl_seconds': 1800 if environment == 'development' else 3600
            }
        
        # Update database number based on tenant slug for isolation
        hash_value = hash(tenant_slug) % 16  # Use 0-15 for Redis databases
        if environment == 'staging':
            hash_value += 16  # Use 16-31 for staging
        elif environment == 'production':
            hash_value += 32  # Use 32-47 for production
        config_data['database_number'] = hash_value
        
        # Add secrets to config
        password = self.secret_service.get_secret(tenant_id, environment, 'cache_password')
        if password:
            config_data['password'] = password
        
        return config_data
    
    def get_queue_config(self, tenant_id: UUID, environment: str = "development") -> Dict[str, Any]:
        """Get tenant environment message queue configuration with slug-based resource naming"""
        config = self.config_service.get_config(tenant_id, 'message_queue', environment)
        platform_defaults = get_platform_defaults()
        
        # Get tenant slug for resource naming
        tenant_slug = self.tenant_utils.get_tenant_slug(tenant_id)
        if not tenant_slug:
            raise Exception(f"Tenant not found: {tenant_id}")
        
        if config:
            config_data = config.config_data.copy()
        else:
            # Use platform defaults if no tenant-specific config
            config_data = {
                'provider': 'redis',
                'broker_url': 'redis://redis:6379',
                'result_backend': 'redis://redis:6379',
                'max_workers': 1 if environment == 'development' else 2,
                'priority_queues': '["high", "normal", "low"]'
            }
        
        # Update resource names to use tenant slug
        config_data['queue_prefix'] = f"{tenant_slug}-{environment}"
        
        # Add secrets to config
        password = self.secret_service.get_secret(tenant_id, environment, 'redis_password')
        if password:
            config_data['password'] = password
        
        return config_data
    
    def get_llm_config(self, tenant_id: UUID, environment: str = "development") -> Optional[Union[LLMConfig, TenantLLMConfigs]]:
        """Get LLM configuration for tenant and environment, including API keys from secrets"""
        llm_config_data = self.config_service.get_llm_config(tenant_id, environment)
        if not llm_config_data:
            return None

        # If it's the new dual config structure
        if isinstance(llm_config_data, TenantLLMConfigs):
            # Handle field_extraction config
            if llm_config_data.field_extraction:
                api_key = self.secret_service.get_secret(tenant_id, environment, 'llm_field_api_key')
                if api_key:
                    llm_config_data.field_extraction.api_key = api_key
            
            # Handle document_extraction config
            if llm_config_data.document_extraction:
                api_key = self.secret_service.get_secret(tenant_id, environment, 'llm_document_api_key')
                if api_key:
                    llm_config_data.document_extraction.api_key = api_key
        else: # Old single LLMConfig structure
            api_key = self.secret_service.get_secret(tenant_id, environment, 'llm_api_key')
            if api_key:
                llm_config_data.api_key = api_key
        
        return llm_config_data
    
    def get_tenant_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        """Get tenant information by slug"""
        tenant = self.tenant_utils.get_tenant_by_slug(slug)
        if not tenant:
            return None
        
        return {
            "id": str(tenant.id),
            "name": tenant.name,
            "slug": tenant.slug,
            "status": tenant.status.value,
            "environment": tenant.environment,
            "created_at": tenant.created_at.isoformat(),
            "updated_at": tenant.updated_at.isoformat()
        }
    
    def get_environment_infrastructure_status(self, tenant_id: UUID, environment: str) -> Dict[str, Any]:
        """Get infrastructure status for a specific environment"""
        status = {
            'environment': environment,
            'storage': {'configured': False, 'healthy': False},
            'cache': {'configured': False, 'healthy': False},
            'queue': {'configured': False, 'healthy': False},
            'llm': {'configured': False, 'healthy': False}
        }
        
        try:
            # Check storage
            storage_config = self.config_service.get_config(tenant_id, 'storage', environment)
            if storage_config:
                status['storage']['configured'] = True
                # TODO: Add health check for storage
                status['storage']['healthy'] = True
        except Exception as e:
            logger.error(f"Storage check failed: {e}")
        
        try:
            # Check cache
            cache_config = self.config_service.get_config(tenant_id, 'cache', environment)
            if cache_config:
                status['cache']['configured'] = True
                # TODO: Add health check for cache
                status['cache']['healthy'] = True
        except Exception as e:
            logger.error(f"Cache check failed: {e}")
        
        try:
            # Check queue
            queue_config = self.config_service.get_config(tenant_id, 'message_queue', environment)
            if queue_config:
                status['queue']['configured'] = True
                # TODO: Add health check for queue
                status['queue']['healthy'] = True
        except Exception as e:
            logger.error(f"Queue check failed: {e}")
        
        try:
            # Check LLM
            llm_config = self.config_service.get_config(tenant_id, 'llm', environment)
            if llm_config:
                status['llm']['configured'] = True
                # TODO: Add health check for LLM
                status['llm']['healthy'] = True
        except Exception as e:
            logger.error(f"LLM check failed: {e}")
        
        return status
