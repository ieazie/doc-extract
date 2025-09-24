"""
Tenant-Aware Authentication Service

This service extends the base authentication service to support tenant-specific
configuration management and environment-aware authentication settings.
"""

import logging
from typing import Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import Request

from .auth_service import AuthService
from .tenant_config_service import TenantConfigService
from ..utils.environment_detection import EnvironmentDetector
from ..utils.tenant_identification import TenantIdentifier
from ..schemas.tenant_configuration import AuthenticationConfig, CORSConfig, SecurityConfig
from jose import jwt

logger = logging.getLogger(__name__)


class TenantAuthService(AuthService):
    """Tenant-aware authentication service"""
    
    def __init__(self, db: Session):
        super().__init__()
        self.db = db
        self.config_service = TenantConfigService(db)
    
    def get_tenant_auth_config(self, tenant_id: UUID, environment: str = "development") -> AuthenticationConfig:
        """Get tenant-specific authentication configuration"""
        
        # Try to get existing configuration
        auth_config = self.config_service.get_auth_config(tenant_id)
        
        if not auth_config:
            # Create default configuration for the tenant
            logger.info(f"Creating default auth configuration for tenant {tenant_id}")
            auth_config = self.config_service.create_default_auth_config(tenant_id, environment)
        
        return auth_config
    
    def get_tenant_cors_config(self, tenant_id: UUID, environment: str = "development") -> CORSConfig:
        """Get tenant-specific CORS configuration"""
        
        # Try to get existing configuration
        cors_config = self.config_service.get_cors_config(tenant_id)
        
        if not cors_config:
            # Create default configuration for the tenant
            logger.info(f"Creating default CORS configuration for tenant {tenant_id}")
            cors_config = self.config_service.create_default_cors_config(tenant_id, environment)
        
        return cors_config
    
    def get_tenant_security_config(self, tenant_id: UUID, environment: str = "development") -> SecurityConfig:
        """Get tenant-specific security configuration"""
        
        # Try to get existing configuration
        security_config = self.config_service.get_security_config(tenant_id)
        
        if not security_config:
            # Create default configuration for the tenant
            logger.info(f"Creating default security configuration for tenant {tenant_id}")
            security_config = self.config_service.create_default_security_config(tenant_id, environment)
        
        return security_config
    
    def create_tenant_access_token(self, data: dict, tenant_id: UUID, environment: str = "development") -> str:
        """Create a JWT access token using tenant-specific configuration with enhanced security"""
        
        # Get tenant auth configuration
        auth_config = self.get_tenant_auth_config(tenant_id, environment)
        
        # Create token with tenant-specific expiry
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(minutes=auth_config.access_token_expire_minutes)
        
        # Add security enhancements
        to_encode.update({
            "exp": expire.timestamp(),  # Use timestamp for consistency
            "iat": datetime.now(timezone.utc).timestamp(),  # Issued at
            "jti": str(uuid4()),  # JWT ID for tracking and revocation
            "type": "access",
            "tenant_id": str(tenant_id),
            "environment": environment,
            "iss": f"tenant-{tenant_id}",  # Issuer
            "aud": f"tenant-{tenant_id}-{environment}"  # Audience
        })
        
        # Use tenant-specific JWT secret
        encoded_jwt = jwt.encode(to_encode, auth_config.jwt_secret_key, algorithm="HS256")
        
        logger.debug(f"Created tenant-specific access token for tenant {tenant_id} with JTI: {to_encode['jti']}")
        return encoded_jwt
    
    def create_tenant_refresh_token(self, user_id: UUID, tenant_id: UUID, environment: str = "development", family_id: Optional[UUID] = None) -> str:
        """Create a JWT refresh token using tenant-specific configuration"""
        
        # Get tenant auth configuration
        auth_config = self.get_tenant_auth_config(tenant_id, environment)
        
        # Create refresh token with tenant-specific settings
        return self.create_refresh_token_with_config(
            user_id=user_id,
            tenant_id=tenant_id,
            auth_config=auth_config,
            environment=environment,
            family_id=family_id
        )
    
    def create_refresh_token_with_config(
        self,
        user_id: UUID,
        tenant_id: UUID,
        auth_config: AuthenticationConfig,
        environment: str,
        family_id: Optional[UUID] = None
    ) -> str:
        """Create refresh token with specific configuration"""
        
        import uuid
        import hashlib
        
        # Generate unique JTI (JWT ID)
        jti = str(uuid.uuid4())
        
        # Create family ID if not provided
        if family_id is None:
            family_id = uuid.uuid4()
        
        # Calculate expiry using tenant-specific settings
        expire = datetime.now(timezone.utc) + timedelta(days=auth_config.refresh_token_expire_days)
        
        # Create JWT payload with enhanced security
        to_encode = {
            "sub": str(user_id),
            "jti": jti,
            "family_id": str(family_id),
            "tenant_id": str(tenant_id),
            "environment": environment,
            "exp": expire.timestamp(),  # Use timestamp for consistency
            "iat": datetime.now(timezone.utc).timestamp(),  # Issued at
            "type": "refresh",
            "iss": f"tenant-{tenant_id}",  # Issuer
            "aud": f"tenant-{tenant_id}-{environment}"  # Audience
        }
        
        # Create JWT token with tenant-specific secret
        encoded_jwt = jwt.encode(to_encode, auth_config.jwt_secret_key, algorithm="HS256")
        
        # Hash the token for secure storage
        token_hash = hashlib.sha256(encoded_jwt.encode()).hexdigest()
        
        # Store refresh token in database (using existing method)
        from ..models.database import RefreshToken
        
        refresh_token_record = RefreshToken(
            jti=jti,
            family_id=family_id,
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expire,
            is_active=True
        )
        
        self.db.add(refresh_token_record)
        self.db.commit()
        
        logger.debug(f"Created tenant-specific refresh token for tenant {tenant_id}")
        return encoded_jwt
    
    def verify_tenant_token(self, token: str, tenant_id: UUID, token_type: str = "access") -> Optional[dict]:
        """Verify token using tenant-specific configuration with enhanced security"""
        
        try:
            # Get tenant auth configuration
            auth_config = self.get_tenant_auth_config(tenant_id)
            
            # First decode without audience/issuer validation to get the environment
            temp_payload = jwt.decode(token, auth_config.jwt_secret_key, algorithms=["HS256"], options={"verify_aud": False, "verify_iss": False})
            
            # Now verify with full validation including audience and issuer
            payload = jwt.decode(
                token, 
                auth_config.jwt_secret_key, 
                algorithms=["HS256"],
                audience=f"tenant-{tenant_id}-{temp_payload.get('environment', 'development')}",
                issuer=f"tenant-{tenant_id}"
            )
            
            if payload.get("type") != token_type:
                logger.warning(f"Invalid token type: expected {token_type}, got {payload.get('type')}")
                return None
            
            # Verify tenant ID matches
            if payload.get("tenant_id") != str(tenant_id):
                logger.warning(f"Token tenant ID mismatch: expected {tenant_id}, got {payload.get('tenant_id')}")
                return None
            
            # Additional security checks
            if not self._validate_token_security(payload, tenant_id):
                return None
            
            # For refresh tokens, check database validity
            if token_type == "refresh":
                if not self._verify_refresh_token_in_db(payload):
                    return None
            
            return payload
            
        except Exception as e:
            logger.warning(f"Token verification failed for tenant {tenant_id}: {e}")
            return None
    
    def _verify_refresh_token_in_db(self, payload: dict) -> bool:
        """Verify refresh token exists and is active in database"""
        
        try:
            from ..models.database import RefreshToken
            
            jti = payload.get("jti")
            if not jti:
                return False
            
            # Check if token exists and is active in database
            refresh_token = self.db.query(RefreshToken).filter(
                RefreshToken.jti == jti,
                RefreshToken.is_active == True,
                RefreshToken.expires_at > datetime.now(timezone.utc)
            ).first()
            
            return refresh_token is not None
            
        except Exception as e:
            logger.warning(f"Database verification failed for refresh token: {e}")
            return False
    
    def _validate_token_security(self, payload: dict, tenant_id: UUID) -> bool:
        """Validate additional security requirements for tokens"""
        
        # Check if token has required fields
        required_fields = ["jti", "iat", "exp", "iss", "aud"]
        for field in required_fields:
            if field not in payload:
                logger.warning(f"Token missing required field: {field}")
                return False
        
        # Check if token is not from the future
        if payload["iat"] > datetime.now(timezone.utc).timestamp():
            logger.warning("Token issued in the future")
            return False
        
        # Check if token has not expired
        if payload["exp"] < datetime.now(timezone.utc).timestamp():
            logger.warning("Token has expired")
            return False
        
        return True
    
    def revoke_token_family(self, family_id: UUID, tenant_id: UUID) -> bool:
        """Revoke all tokens in a refresh token family"""
        
        try:
            from ..models.database import RefreshToken
            
            # Revoke all tokens in the family
            revoked_count = self.db.query(RefreshToken).filter(
                RefreshToken.family_id == family_id,
                RefreshToken.is_active == True
            ).update({
                "is_active": False,
                "revoked_at": datetime.now(timezone.utc)
            })
            
            self.db.commit()
            
            logger.info(f"Revoked {revoked_count} tokens in family {family_id} for tenant {tenant_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to revoke token family {family_id}: {e}")
            self.db.rollback()
            return False
    
    def revoke_user_tokens(self, user_id: UUID, tenant_id: UUID) -> bool:
        """Revoke all active tokens for a user in a specific tenant"""
        
        try:
            from ..models.database import RefreshToken
            
            # Revoke all active tokens for the user
            revoked_count = self.db.query(RefreshToken).filter(
                RefreshToken.user_id == user_id,
                RefreshToken.is_active == True
            ).update({
                "is_active": False,
                "revoked_at": datetime.now(timezone.utc)
            })
            
            self.db.commit()
            
            logger.info(f"Revoked {revoked_count} tokens for user {user_id} in tenant {tenant_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to revoke user tokens for user {user_id}: {e}")
            self.db.rollback()
            return False
    
    def rotate_refresh_token(self, old_token: str, tenant_id: UUID, environment: str = "development") -> Optional[str]:
        """Rotate refresh token - invalidate old token and create new one"""
        
        try:
            from ..models.database import RefreshToken
            
            # Verify the old token
            payload = self.verify_tenant_token(old_token, tenant_id, "refresh")
            if not payload:
                logger.warning("Invalid refresh token for rotation")
                return None
            
            user_id = UUID(payload["sub"])
            family_id = UUID(payload["family_id"])
            
            # Invalidate the old token
            old_jti = payload["jti"]
            self.db.query(RefreshToken).filter(
                RefreshToken.jti == old_jti
            ).update({
                "is_active": False,
                "revoked_at": datetime.now(timezone.utc)
            })
            
            # Create new refresh token in the same family
            new_token = self.create_tenant_refresh_token(
                user_id=user_id,
                tenant_id=tenant_id,
                environment=environment,
                family_id=family_id
            )
            
            self.db.commit()
            
            logger.info(f"Successfully rotated refresh token for user {user_id} in tenant {tenant_id}")
            return new_token
            
        except Exception as e:
            logger.error(f"Failed to rotate refresh token: {e}")
            self.db.rollback()
            return None
    
    def set_tenant_auth_cookie(self, response, token: str, tenant_id: UUID, environment: str = "development"):
        """Set authentication cookie with tenant-specific configuration"""
        
        # Get tenant auth configuration
        auth_config = self.get_tenant_auth_config(tenant_id, environment)
        
        # Set cookie with tenant-specific settings
        response.set_cookie(
            key="refresh_token",
            value=token,
            max_age=auth_config.refresh_token_expire_days * 24 * 60 * 60,
            httponly=auth_config.refresh_cookie_httponly,
            secure=auth_config.refresh_cookie_secure,
            samesite=auth_config.refresh_cookie_samesite,
            path=auth_config.refresh_cookie_path,
            domain=auth_config.refresh_cookie_domain
        )
        
        logger.debug(f"Set tenant-specific auth cookie for tenant {tenant_id}")
    
    def get_tenant_from_request(self, request: Request) -> Optional[UUID]:
        """Extract tenant ID from request"""
        return TenantIdentifier.extract_tenant_id(request)
    
    def get_environment_from_request(self, request: Request) -> str:
        """Extract environment from request"""
        return EnvironmentDetector.detect_environment(request)
    
    def get_tenant_context(self, request: Request) -> Dict[str, Any]:
        """Get comprehensive tenant and environment context from request"""
        
        tenant_id = self.get_tenant_from_request(request)
        environment = self.get_environment_from_request(request)
        
        context = {
            "tenant_id": tenant_id,
            "environment": environment,
            "has_tenant_id": tenant_id is not None,
            "is_secure_environment": environment in ["staging", "production"],
            "is_development": environment == "development"
        }
        
        # Add tenant-specific configurations if tenant ID is available
        if tenant_id:
            try:
                auth_config = self.get_tenant_auth_config(tenant_id, environment)
                cors_config = self.get_tenant_cors_config(tenant_id, environment)
                security_config = self.get_tenant_security_config(tenant_id, environment)
                
                context.update({
                    "auth_config": auth_config,
                    "cors_config": cors_config,
                    "security_config": security_config
                })
            except Exception as e:
                logger.warning(f"Failed to load tenant configurations for {tenant_id}: {e}")
        
        return context
    
    def validate_tenant_request(self, request: Request) -> Dict[str, Any]:
        """Validate request and return tenant context"""
        
        # Extract tenant context
        context = self.get_tenant_context(request)
        
        if not context["has_tenant_id"]:
            raise ValueError("Tenant ID is required for this operation")
        
        return context


# Global instance for dependency injection
def get_tenant_auth_service(db: Session) -> TenantAuthService:
    """Get tenant-aware authentication service instance"""
    return TenantAuthService(db)
