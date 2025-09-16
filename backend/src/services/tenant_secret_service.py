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

from ..models.database import TenantEnvironmentSecret

logger = logging.getLogger(__name__)


class TenantSecretService:
    """Service for managing tenant secrets with encryption"""
    
    def __init__(self, db: Session):
        self.db = db
        # Use environment variable for encryption key
        self.encryption_key = os.getenv('TENANT_SECRET_ENCRYPTION_KEY')
        if not self.encryption_key:
            raise Exception("TENANT_SECRET_ENCRYPTION_KEY environment variable not set")
        
        try:
            # Generate Fernet key from the environment variable
            # Ensure the key is exactly 32 bytes for Fernet
            key_bytes = self.encryption_key.encode()[:32].ljust(32, b'0')
            key = base64.urlsafe_b64encode(key_bytes)
            self.cipher = Fernet(key)
            logger.info("TenantSecretService initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize TenantSecretService: {e}")
            raise Exception(f"Failed to initialize encryption: {e}")
    
    def store_secret(self, tenant_id: UUID, environment: str, secret_type: str, value: str):
        """Store encrypted secret for tenant environment"""
        encrypted_value = self.cipher.encrypt(value.encode()).decode()
        
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
            decrypted_value = self.cipher.decrypt(secret.encrypted_value.encode()).decode()
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
                decrypted_value = self.cipher.decrypt(secret.encrypted_value.encode()).decode()
                # Mask the value for security
                result[secret.environment][secret.secret_type] = "***" + decrypted_value[-4:] if len(decrypted_value) > 4 else "***"
            except Exception as e:
                logger.error(f"Failed to decrypt secret {secret.secret_type}: {e}")
                result[secret.environment][secret.secret_type] = None
        
        return result
