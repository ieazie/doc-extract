"""
Tenant Secret Management Service
"""
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
from uuid import UUID
from datetime import datetime
import logging
from cryptography.fernet import Fernet
import base64
import os

from ..models.database import TenantEnvironmentSecret, TenantConfiguration

logger = logging.getLogger(__name__)


class TenantSecretService:
    """Service for managing tenant secrets with encryption"""
    
    def __init__(self, db: Session):
        self.db = db
        # Initialize without encryption key - will be set per tenant
        self.cipher = None
        logger.info("TenantSecretService initialized successfully")
    
    def _get_encryption_key(self, tenant_id: UUID, environment: str = "development") -> str:
        """Get encryption key from tenant security configuration"""
        try:
            # Get security config for the tenant
            config = self.db.query(TenantConfiguration).filter(
                TenantConfiguration.tenant_id == tenant_id,
                TenantConfiguration.config_type == 'security',
                TenantConfiguration.environment == environment
            ).first()
            
            if not config:
                raise Exception(f"No security configuration found for tenant {tenant_id} in {environment}")
            
            config_data = config.config_data
            if not isinstance(config_data, dict):
                raise Exception("Invalid security configuration format")
            
            encryption_key = config_data.get('encryption_key')
            if not encryption_key:
                raise Exception(f"No encryption_key found in security configuration for tenant {tenant_id}")
            
            return encryption_key
        except Exception as e:
            logger.error(f"Failed to get encryption key for tenant {tenant_id}: {e}")
            raise Exception(f"Failed to get encryption key: {e}")
    
    def _get_cipher(self, tenant_id: UUID, environment: str = "development") -> Fernet:
        """Get Fernet cipher for tenant encryption"""
        try:
            encryption_key = self._get_encryption_key(tenant_id, environment)
            
            # Generate Fernet key from the encryption key
            # Ensure the key is exactly 32 bytes for Fernet
            key_bytes = encryption_key.encode()[:32].ljust(32, b'0')
            key = base64.urlsafe_b64encode(key_bytes)
            return Fernet(key)
        except Exception as e:
            logger.error(f"Failed to create cipher for tenant {tenant_id}: {e}")
            raise Exception(f"Failed to create encryption cipher: {e}")
    
    def store_secret(self, tenant_id: UUID, environment: str, secret_type: str, value: str):
        """Store encrypted secret for tenant environment"""
        cipher = self._get_cipher(tenant_id, environment)
        encrypted_value = cipher.encrypt(value.encode()).decode()
        
        secret = self.db.query(TenantEnvironmentSecret).filter(
            TenantEnvironmentSecret.tenant_id == tenant_id,
            TenantEnvironmentSecret.environment == environment,
            TenantEnvironmentSecret.secret_type == secret_type
        ).first()
        
        if secret:
            secret.encrypted_value = encrypted_value
            secret.updated_at = datetime.utcnow()
        else:
            secret = TenantEnvironmentSecret(
                tenant_id=tenant_id,
                environment=environment,
                secret_type=secret_type,
                encrypted_value=encrypted_value
            )
            self.db.add(secret)
        
        self.db.commit()
    
    def get_secret(self, tenant_id: UUID, environment: str, secret_type: str) -> Optional[str]:
        """Get decrypted secret for tenant environment"""
        secret = self.db.query(TenantEnvironmentSecret).filter(
            TenantEnvironmentSecret.tenant_id == tenant_id,
            TenantEnvironmentSecret.environment == environment,
            TenantEnvironmentSecret.secret_type == secret_type
        ).first()
        
        if not secret:
            return None
        
        try:
            cipher = self._get_cipher(tenant_id, environment)
            decrypted_value = cipher.decrypt(secret.encrypted_value.encode()).decode()
            return decrypted_value
        except Exception as e:
            logger.error(f"Failed to decrypt secret: {e}")
            return None
    
    def get_environment_secrets(self, tenant_id: UUID, environment: str) -> Dict[str, str]:
        """Get all secrets for a specific environment (values will be masked)"""
        secrets = self.db.query(TenantEnvironmentSecret).filter(
            TenantEnvironmentSecret.tenant_id == tenant_id,
            TenantEnvironmentSecret.environment == environment
        ).all()
        
        result = {}
        for secret in secrets:
            # For API response, we only show if it's set, not the actual value
            # No need to decrypt - just indicate presence
            result[secret.secret_type] = "***" if secret.encrypted_value else None
        
        return result
    
    def delete_secret(self, tenant_id: UUID, environment: str, secret_type: str) -> bool:
        """Delete secret for tenant environment"""
        secret = self.db.query(TenantEnvironmentSecret).filter(
            TenantEnvironmentSecret.tenant_id == tenant_id,
            TenantEnvironmentSecret.environment == environment,
            TenantEnvironmentSecret.secret_type == secret_type
        ).first()
        
        if secret:
            self.db.delete(secret)
            self.db.commit()
            return True
        
        return False
    
    def list_tenant_secrets(self, tenant_id: UUID) -> Dict[str, Dict[str, str]]:
        """List all secrets for a tenant across all environments"""
        secrets = self.db.query(TenantEnvironmentSecret).filter(
            TenantEnvironmentSecret.tenant_id == tenant_id
        ).all()
        
        result = {}
        for secret in secrets:
            if secret.environment not in result:
                result[secret.environment] = {}
            
            try:
                cipher = self._get_cipher(tenant_id, secret.environment)
                decrypted_value = cipher.decrypt(secret.encrypted_value.encode()).decode()
                # Mask the value for security
                result[secret.environment][secret.secret_type] = "***" + decrypted_value[-4:] if len(decrypted_value) > 4 else "***"
            except Exception as e:
                logger.error(f"Failed to decrypt secret {secret.secret_type}: {e}")
                result[secret.environment][secret.secret_type] = None
        
        return result
