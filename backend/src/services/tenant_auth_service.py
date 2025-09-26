"""
Tenant-Aware Authentication Service

This service extends the base authentication service to support tenant-specific
configuration management and environment-aware authentication settings.
"""

import logging
from typing import Optional, Dict, Any, List
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
        auth_config = self.config_service.get_auth_config(tenant_id, environment)
        
        if not auth_config:
            # Create default configuration for the tenant
            logger.info(f"Creating default auth configuration for tenant {tenant_id}")
            auth_config = self.config_service.create_default_auth_config(tenant_id, environment)
        
        return auth_config
    
    def get_tenant_cors_config(self, tenant_id: UUID, environment: str = "development") -> CORSConfig:
        """Get tenant-specific CORS configuration"""
        
        # Try to get existing configuration
        cors_config = self.config_service.get_cors_config(tenant_id, environment)
        
        if not cors_config:
            # Create default configuration for the tenant
            logger.info(f"Creating default CORS configuration for tenant {tenant_id}")
            cors_config = self.config_service.create_default_cors_config(tenant_id, environment)
        
        return cors_config
    
    def get_tenant_security_config(self, tenant_id: UUID, environment: str = "development") -> SecurityConfig:
        """Get tenant-specific security configuration"""
        
        # Try to get existing configuration
        security_config = self.config_service.get_security_config(tenant_id, environment)
        
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
    
    def verify_tenant_token(self, token: str, tenant_id: UUID, token_type: str = "access", environment: Optional[str] = None) -> Optional[dict]:
        """Verify token using tenant-specific configuration with enhanced security"""
        
        try:
            # Get environment from unverified claims first
            unverified = jwt.get_unverified_claims(token)
            env = unverified.get("environment", "development")
            
            # Fetch env-scoped auth config to obtain the correct secret
            auth_config = self.get_tenant_auth_config(tenant_id, env)
            
            # Verify with full validation including audience and issuer
            payload = jwt.decode(
                token,
                auth_config.jwt_secret_key,
                algorithms=["HS256"],
                audience=f"tenant-{tenant_id}-{env}",
                issuer=f"tenant-{tenant_id}",
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
        """Verify refresh token exists and is active in database with reuse detection"""
        
        try:
            from ..models.database import RefreshToken
            from sqlalchemy import and_
            
            jti = payload.get("jti")
            family_id = payload.get("family_id")
            
            if not jti or not family_id:
                return False
            
            # Check if token exists and is active in database (with row lock to prevent race conditions)
            refresh_token = self.db.query(RefreshToken).with_for_update().filter(
                and_(
                    RefreshToken.jti == jti,
                    RefreshToken.is_active == True,
                    RefreshToken.expires_at > datetime.now(timezone.utc)
                )
            ).first()
            
            if not refresh_token:
                # Token doesn't exist or is inactive - check for reuse detection
                self._detect_token_reuse(jti, family_id, payload)
                return False
            
            # Check if this token has been used before (reuse detection)
            if refresh_token.used_at is not None:
                # Token has been used before - this is a reuse attempt
                logger.warning(f"Refresh token reuse detected for JTI: {jti}")
                self._handle_token_reuse(family_id, payload)
                return False
            
            # Mark token as used (this happens during the refresh process)
            refresh_token.used_at = datetime.now(timezone.utc)
            self.db.commit()
            
            return True
            
        except Exception as e:
            logger.warning(f"Database verification failed for refresh token: {e}")
            self.db.rollback()
            return False
    
    def _detect_token_reuse(self, jti: str, family_id: str, payload: dict) -> None:
        """Detect if a token reuse attempt is happening"""
        
        try:
            from ..models.database import RefreshToken
            from sqlalchemy import and_
            
            # Check if this JTI was ever created (even if now inactive)
            token_record = self.db.query(RefreshToken).filter(
                RefreshToken.jti == jti
            ).first()
            
            if token_record:
                # This JTI was used before - this is a reuse attempt
                logger.warning(f"Refresh token reuse detected for JTI: {jti} (token was previously created)")
                self._handle_token_reuse(family_id, payload)
            else:
                # This JTI was never created - might be a forged token
                logger.warning(f"Unknown refresh token JTI detected: {jti}")
                
        except Exception as e:
            logger.error(f"Error during reuse detection: {e}")
    
    def _handle_token_reuse(self, family_id: str, payload: dict) -> None:
        """Handle token reuse by revoking the entire family and logging the event"""
        
        try:
            from ..models.database import RefreshToken
            
            # Revoke entire token family
            revoked_count = self.db.query(RefreshToken).filter(
                RefreshToken.family_id == family_id,
                RefreshToken.is_active == True
            ).update({
                "is_active": False,
                "revoked_at": datetime.now(timezone.utc)
            })
            
            self.db.commit()
            
            # Log security event
            logger.critical(
                f"SECURITY ALERT: Token reuse detected for family {family_id}. "
                f"Revoked {revoked_count} tokens. "
                f"User: {payload.get('sub')}, "
                f"Tenant: {payload.get('tenant_id')}, "
                f"Environment: {payload.get('environment')}"
            )
            
            # TODO: In a production system, you might want to:
            # 1. Send alerts to security team
            # 2. Force user to re-authenticate
            # 3. Log to security monitoring system
            # 4. Potentially lock the user account temporarily
            
        except Exception as e:
            logger.error(f"Error handling token reuse: {e}")
            self.db.rollback()
    
    def is_compromise_detection_enabled(self, tenant_id: UUID, environment: str = "development") -> bool:
        """Check if compromise detection is enabled for a tenant"""
        
        try:
            # Get tenant security configuration
            security_config = self.get_tenant_security_config(tenant_id, environment)
            
            # Check if compromise detection is enabled
            return getattr(security_config, "compromise_detection_enabled", False)
            
        except Exception as e:
            logger.warning(f"Error checking compromise detection config: {e}")
            return False  # Default to disabled if config unavailable
    
    def detect_compromised_sessions(self, user_id: UUID, tenant_id: UUID, enabled: bool = None) -> List[dict]:
        """Detect potentially compromised sessions for a user"""
        
        try:
            # Use tenant configuration if not explicitly specified
            if enabled is None:
                enabled = self.is_compromise_detection_enabled(tenant_id)
            
            # Skip detection if disabled (for testing or configuration)
            if not enabled:
                return []
            
            from ..models.database import RefreshToken
            from sqlalchemy import and_
            
            # Get all active tokens for the user
            active_tokens = self.db.query(RefreshToken).filter(
                and_(
                    RefreshToken.user_id == user_id,
                    RefreshToken.is_active == True,
                    RefreshToken.expires_at > datetime.now(timezone.utc)
                )
            ).all()
            
            # Skip if user has very few tokens (likely normal usage)
            if len(active_tokens) < 3:
                return []
            
            compromised_sessions = []
            
            for token in active_tokens:
                # Check for suspicious patterns
                session_info = {
                    "family_id": str(token.family_id),
                    "created_at": token.created_at,
                    "last_used": token.used_at,
                    "suspicious_indicators": []
                }
                
                # Check for multiple active tokens in same family (potential compromise)
                # Note: In normal operation, each token creation creates a new family
                # So multiple tokens in same family indicates potential compromise
                family_tokens = [t for t in active_tokens if t.family_id == token.family_id]
                if len(family_tokens) > 1:
                    session_info["suspicious_indicators"].append("multiple_active_tokens_in_family")
                
                # Check for tokens created far apart in time (potential replay attack)
                if token.used_at and token.created_at:
                    time_diff = (token.used_at - token.created_at).total_seconds()
                    if time_diff > 86400:  # More than 24 hours
                        session_info["suspicious_indicators"].append("long_time_between_creation_and_use")
                
                # Check for rapid successive token creation (potential brute force)
                recent_tokens = [t for t in active_tokens 
                               if t.created_at > datetime.now(timezone.utc) - timedelta(minutes=5)]
                if len(recent_tokens) > 10:  # More than 10 tokens in 5 minutes is very suspicious
                    session_info["suspicious_indicators"].append("rapid_token_creation")
                
                if session_info["suspicious_indicators"]:
                    compromised_sessions.append(session_info)
            
            return compromised_sessions
            
        except Exception as e:
            logger.error(f"Error detecting compromised sessions: {e}")
            return []
    
    def revoke_compromised_sessions(self, user_id: UUID, tenant_id: UUID, environment: str = "development") -> int:
        """Revoke all potentially compromised sessions for a user"""
        
        try:
            from ..models.database import RefreshToken
            from sqlalchemy import and_
            
            # Check if auto-revoke is enabled for this tenant
            security_config = self.get_tenant_security_config(tenant_id, environment)
            auto_revoke_enabled = getattr(security_config, "auto_revoke_on_compromise", False)
            
            if not auto_revoke_enabled:
                logger.info(f"Auto-revoke disabled for tenant {tenant_id}, skipping automatic revocation")
                return 0
            
            # Get compromised sessions
            compromised_sessions = self.detect_compromised_sessions(user_id, tenant_id)
            
            if not compromised_sessions:
                logger.info(f"No compromised sessions detected for user {user_id}")
                return 0
            
            # Get threshold from tenant config
            detection_threshold = getattr(security_config, "compromise_detection_threshold", 2)
            
            # Check if we have strong evidence of compromise
            high_risk_sessions = [
                session for session in compromised_sessions 
                if len(session["suspicious_indicators"]) >= detection_threshold
            ]
            
            if not high_risk_sessions:
                logger.warning(
                    f"Low-risk compromise indicators detected for user {user_id}, "
                    f"but not enough evidence for automatic revocation (threshold: {detection_threshold})"
                )
                return 0
            
            # Revoke all active tokens for the user
            revoked_count = self.db.query(RefreshToken).filter(
                and_(
                    RefreshToken.user_id == user_id,
                    RefreshToken.is_active == True
                )
            ).update({
                "is_active": False,
                "revoked_at": datetime.now(timezone.utc)
            })
            
            self.db.commit()
            
            # Log security event
            logger.critical(
                f"SECURITY ALERT: Compromised sessions detected for user {user_id} in tenant {tenant_id}. "
                f"Revoked {revoked_count} tokens. "
                f"Compromised sessions: {len(compromised_sessions)}"
            )
            
            return revoked_count
            
        except Exception as e:
            logger.error(f"Error revoking compromised sessions: {e}")
            self.db.rollback()
            return 0
    
    def check_for_compromise(self, user_id: UUID, tenant_id: UUID) -> dict:
        """Check for compromise indicators without automatically revoking tokens"""
        
        try:
            compromised_sessions = self.detect_compromised_sessions(user_id, tenant_id)
            
            if not compromised_sessions:
                return {
                    "is_compromised": False,
                    "risk_level": "low",
                    "indicators": [],
                    "recommendation": "No suspicious activity detected"
                }
            
            # Calculate risk level based on indicators
            total_indicators = sum(len(session["suspicious_indicators"]) for session in compromised_sessions)
            
            if total_indicators >= 3:
                risk_level = "high"
                recommendation = "Consider manual token revocation"
            elif total_indicators >= 2:
                risk_level = "medium"
                recommendation = "Monitor user activity closely"
            else:
                risk_level = "low"
                recommendation = "Normal activity, no action needed"
            
            return {
                "is_compromised": risk_level in ["medium", "high"],
                "risk_level": risk_level,
                "indicators": [session["suspicious_indicators"] for session in compromised_sessions],
                "recommendation": recommendation,
                "session_count": len(compromised_sessions)
            }
            
        except Exception as e:
            logger.error(f"Error checking for compromise: {e}")
            return {
                "is_compromised": False,
                "risk_level": "unknown",
                "indicators": [],
                "recommendation": "Error occurred during check"
            }
    
    def get_security_events(self, tenant_id: UUID, limit: int = 100) -> List[dict]:
        """Get recent security events for a tenant"""
        
        try:
            from ..models.database import RefreshToken, User
            from sqlalchemy import and_, desc, join
            
            # Get recently revoked tokens for users in the tenant
            recent_events = self.db.query(RefreshToken).join(User).filter(
                and_(
                    User.tenant_id == tenant_id,
                    RefreshToken.is_active == False,
                    RefreshToken.revoked_at.isnot(None),
                    RefreshToken.revoked_at > datetime.now(timezone.utc) - timedelta(days=30)
                )
            ).order_by(desc(RefreshToken.revoked_at)).limit(limit).all()
            
            events = []
            for token in recent_events:
                # Infer reason from context - if used_at is set, it was likely a reuse
                reason = "token_reuse_detected" if token.used_at else "manual_revocation"
                
                events.append({
                    "timestamp": token.revoked_at,
                    "user_id": str(token.user_id),
                    "family_id": str(token.family_id),
                    "reason": reason,
                    "jti": token.jti
                })
            
            return events
            
        except Exception as e:
            logger.error(f"Error getting security events: {e}")
            return []
    
    def check_rate_limit(self, user_id: UUID, tenant_id: UUID, operation: str) -> bool:
        """Check if user has exceeded rate limits for token operations"""
        
        try:
            from ..models.database import RefreshToken
            from sqlalchemy import and_
            
            # Get tenant auth configuration for rate limiting
            auth_config = self.get_tenant_auth_config(tenant_id)
            
            # Define rate limits based on operation
            rate_limits = {
                "token_refresh": {"window_minutes": 5, "max_attempts": 10},
                "login_attempt": {"window_minutes": 15, "max_attempts": 5},
                "token_creation": {"window_minutes": 1, "max_attempts": 2}  # Lowered for testing
            }
            
            if operation not in rate_limits:
                return True  # No rate limit for unknown operations
            
            limit_config = rate_limits[operation]
            window_start = datetime.now(timezone.utc) - timedelta(minutes=limit_config["window_minutes"])
            
            # Count recent operations for the specific operation type
            # For token_creation, count all recent tokens
            # For token_refresh, count recent used tokens
            if operation == "token_creation":
                recent_count = self.db.query(RefreshToken).filter(
                    and_(
                        RefreshToken.user_id == user_id,
                        RefreshToken.created_at > window_start
                    )
                ).count()
            elif operation == "token_refresh":
                recent_count = self.db.query(RefreshToken).filter(
                    and_(
                        RefreshToken.user_id == user_id,
                        RefreshToken.used_at > window_start
                    )
                ).count()
            else:
                recent_count = 0
            
            # Also check for recent failed attempts (inactive tokens)
            recent_failed = self.db.query(RefreshToken).filter(
                and_(
                    RefreshToken.user_id == user_id,
                    RefreshToken.is_active == False,
                    RefreshToken.created_at > window_start
                )
            ).count()
            
            total_attempts = recent_count + recent_failed
            
            if total_attempts >= limit_config["max_attempts"]:
                logger.warning(
                    f"Rate limit exceeded for user {user_id} in tenant {tenant_id}. "
                    f"Operation: {operation}, Attempts: {total_attempts}, Limit: {limit_config['max_attempts']}"
                )
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking rate limit: {e}")
            return True  # Allow operation if rate limit check fails
    
    def cleanup_expired_tokens(self, tenant_id: Optional[UUID] = None) -> int:
        """Clean up expired and inactive tokens"""
        
        try:
            from ..models.database import RefreshToken, User
            from sqlalchemy import and_
            
            # Clean up tokens that are expired and inactive for more than 30 days
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
            
            if tenant_id:
                # Get user IDs for the tenant first, then delete tokens
                user_ids = [user.id for user in self.db.query(User).filter(User.tenant_id == tenant_id).all()]
                
                if not user_ids:
                    return 0
                
                deleted_count = self.db.query(RefreshToken).filter(
                    and_(
                        RefreshToken.user_id.in_(user_ids),
                        RefreshToken.is_active == False,
                        RefreshToken.expires_at < cutoff_date
                    )
                ).delete()
            else:
                # Clean up all expired tokens
                deleted_count = self.db.query(RefreshToken).filter(
                    and_(
                        RefreshToken.is_active == False,
                        RefreshToken.expires_at < cutoff_date
                    )
                ).delete()
            
            self.db.commit()
            
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} expired tokens for tenant {tenant_id or 'all'}")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up expired tokens: {e}")
            self.db.rollback()
            return 0
    
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
        tenant_id, _ = TenantIdentifier.extract_tenant_id(request)
        return tenant_id
    
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
    
    # Override base AuthService methods to use tenant-specific configurations
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Override base method to use tenant-specific configuration"""
        # This method should not be used directly - use create_tenant_access_token instead
        # But we provide a fallback that tries to extract tenant info from data
        tenant_id = data.get("tenant_id")
        if tenant_id:
            return self.create_tenant_access_token(data, UUID(tenant_id))
        else:
            # Fallback to legacy method with warning
            logger.warning("Using legacy create_access_token - consider using create_tenant_access_token")
            return super().create_access_token(data, expires_delta)
    
    def create_refresh_token(self, db: Session, user_id: UUID, family_id: Optional[UUID] = None) -> str:
        """Override base method to use tenant-specific configuration"""
        # Get user to find their tenant
        user = self.get_user_by_id(db, user_id)
        if user and user.tenant_id:
            return self.create_tenant_refresh_token(user_id, user.tenant_id, family_id=family_id)
        else:
            # Fallback to legacy method with warning
            logger.warning("Using legacy create_refresh_token - consider using create_tenant_refresh_token")
            return super().create_refresh_token(db, user_id, family_id)
    
    def verify_token(self, token: str, token_type: str = "access") -> Optional[dict]:
        """Override base method to use tenant-specific verification"""
        # This method should not be used directly - use verify_tenant_token instead
        # But we provide a fallback that tries to extract tenant info from token
        try:
            # Decode token without verification to get tenant_id
            unverified_payload = jwt.get_unverified_claims(token)
            tenant_id = unverified_payload.get("tenant_id")
            
            if tenant_id:
                return self.verify_tenant_token(token, UUID(tenant_id), token_type)
            else:
                # Fallback to legacy method with warning
                logger.warning("Using legacy verify_token - consider using verify_tenant_token")
                return super().verify_token(token, token_type)
        except Exception:
            # Fallback to legacy method
            return super().verify_token(token, token_type)

    def get_user_tenants(self, db: Session, user_id: UUID) -> List['Tenant']:
        """Get all tenants accessible to a user"""
        from ..models.database import Tenant, TenantStatusEnum, User
        
        # Get user's primary tenant
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return []
        
        # For now, return only the user's primary tenant
        # In a multi-tenant system, this could be expanded to include
        # tenants the user has access to through roles/permissions
        tenant = db.query(Tenant).filter(
            Tenant.id == user.tenant_id,
            Tenant.status == TenantStatusEnum.ACTIVE
        ).first()
        
        if tenant:
            return [tenant]
        
        return []


# Global instance for dependency injection
def get_tenant_auth_service(db: Session) -> TenantAuthService:
    """Get tenant-aware authentication service instance"""
    return TenantAuthService(db)
