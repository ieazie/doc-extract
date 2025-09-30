"""
Authentication and authorization service
"""
import logging
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..models.database import User, Tenant, APIKey, RefreshToken, SessionLocal, get_db
from ..config import settings
from ..schemas.auth import UserRole, UserStatus, TenantStatus, UserCreate, TenantCreate
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings - These are now tenant-specific via TenantAuthService
# Legacy constants removed - all authentication now uses tenant-specific configurations
ALGORITHM = "HS256"  # Algorithm is still consistent across tenants

# Legacy constants are no longer used - all authentication operations
# must use TenantAuthService for tenant-specific configurations


class AuthService:
    """Authentication and authorization service"""
    
    def __init__(self):
        self.pwd_context = pwd_context
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        return self.pwd_context.hash(password)
    
    def _revoke_token_family(self, db: Session, family_id: UUID):
        """Revoke all tokens in a family (security measure for reuse detection)"""
        try:
            # Mark all tokens in the family as revoked
            db.query(RefreshToken).filter(
                RefreshToken.family_id == family_id
            ).update({
                "is_active": False,
                "revoked_at": datetime.now(timezone.utc)
            })
            db.commit()
            logger.info(f"Revoked token family {family_id}")
        except Exception as e:
            logger.error(f"Failed to revoke token family {family_id}: {e}")
            db.rollback()
    
    def revoke_user_tokens(self, db: Session, user_id: UUID):
        """Revoke all refresh tokens for a user (e.g., on logout)"""
        try:
            db.query(RefreshToken).filter(
                RefreshToken.user_id == user_id
            ).update({
                "is_active": False,
                "revoked_at": datetime.now(timezone.utc)
            })
            db.commit()
            logger.info(f"Revoked all tokens for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to revoke tokens for user {user_id}: {e}")
            db.rollback()
    
    def cleanup_expired_tokens(self, db: Session):
        """Clean up expired refresh tokens (should be run periodically)"""
        try:
            # Delete tokens that are expired and inactive
            deleted_count = db.query(RefreshToken).filter(
                and_(
                    RefreshToken.expires_at < datetime.now(timezone.utc),
                    RefreshToken.is_active == False
                )
            ).delete()
            db.commit()
            logger.info(f"Cleaned up {deleted_count} expired refresh tokens")
            return deleted_count
        except Exception as e:
            logger.error(f"Failed to cleanup expired tokens: {e}")
            db.rollback()
            return 0
    
    def authenticate_user(self, db: Session, email: str, password: str) -> Optional[User]:
        """Authenticate a user with email and password"""
        user = db.query(User).filter(
            and_(
                User.email == email,
                User.status == UserStatus.ACTIVE
            )
        ).first()
        
        if not user or not self.verify_password(password, user.password_hash):
            return None
        
        # Update last login
        user.last_login = datetime.now(timezone.utc)
        db.commit()
        
        return user
    
    def get_user_by_id(self, db: Session, user_id: UUID) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()
    
    def create_user(self, db: Session, email: str, password: str, first_name: str, 
                   last_name: str, role: UserRole = UserRole.USER, tenant_id: Optional[UUID] = None) -> User:
        """Create a new user"""
        # Check if user already exists
        existing_user = self.get_user_by_email(db, email)
        if existing_user:
            raise ValueError("User with this email already exists")
        
        # Hash password
        password_hash = self.get_password_hash(password)
        
        # Create user
        user = User(
            id=uuid4(),
            email=email,
            password_hash=password_hash,
            first_name=first_name,
            last_name=last_name,
            role=role,
            status=UserStatus.ACTIVE,
            tenant_id=tenant_id or self.get_default_tenant_id(db)
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return user
    
    def get_default_tenant_id(self, db: Session) -> UUID:
        """Get the default tenant ID"""
        tenant = db.query(Tenant).filter(Tenant.name == "DocExtract Demo").first()
        if not tenant:
            # Create default tenant if it doesn't exist
            from ..config import settings
            from ..constants.tenant import DEFAULT_TENANT_ID, DEFAULT_TENANT_NAME
            tenant = Tenant(
                id=DEFAULT_TENANT_ID,
                name=DEFAULT_TENANT_NAME,
                settings={"max_documents": 1000, "max_templates": 50},
                status=TenantStatus.ACTIVE,
                environment=settings.default_environment
            )
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
        
        return tenant.id
    
    def get_user_permissions(self, user: User) -> List[str]:
        """Get user permissions based on role"""
        permissions = {
            UserRole.SYSTEM_ADMIN: [
                # Cross-tenant Tenant Management
                "tenants:create", "tenants:read_all", "tenants:update", "tenants:delete",
                "tenants:suspend", "tenants:activate", "tenants:configure",
                
                # System Configuration
                "system:config", "system:maintenance", "system:backup",
                
                # Global Analytics
                "analytics:global", "analytics:cross_tenant", "analytics:system",
                
                # Cross-tenant User Management
                "users:create_global", "users:read_all", "users:assign_tenants",
                "users:read", "users:write", "users:delete",
                
                # All content permissions (cross-tenant)
                "documents:read", "documents:write", "documents:delete",
                "templates:read", "templates:write", "templates:delete",
                "extractions:read", "extractions:write", "extractions:delete",
                "categories:read", "categories:write", "categories:delete",
                
                # Cross-tenant Job Management
                "jobs:read", "jobs:write", "jobs:delete", "jobs:execute",
                
                # API and Configuration
                "api-keys:read", "api-keys:write", "api-keys:delete",
                "tenant_config:read", "tenant_config:write", "tenant_config:delete",
                "analytics:read"
            ],
            UserRole.TENANT_ADMIN: [
                # Tenant-scoped User Management
                "users:read", "users:write", "users:delete", "users:invite",
                
                # Tenant Management (own tenant only)
                "tenants:read",
                
                # Tenant Configuration
                "tenant:config_llm", "tenant:config_limits", "tenant:config_settings",
                "tenant_config:read", "tenant_config:write",
                
                # Tenant Analytics
                "analytics:tenant", "analytics:usage", "analytics:performance",
                "analytics:read",
                
                # Content Management (within tenant)
                "documents:read", "documents:write", "documents:delete",
                "templates:read", "templates:write", "templates:delete",
                "extractions:read", "extractions:write", "extractions:delete",
                "categories:read", "categories:write", "categories:delete",
                
                # Job Management (within tenant)
                "jobs:read", "jobs:write", "jobs:delete", "jobs:execute",
                
                # API Management
                "api-keys:read", "api-keys:write", "api-keys:delete"
            ],
            UserRole.USER: [
                "documents:read", "documents:write", "documents:delete",
                "templates:read", "templates:write", "templates:delete",
                "extractions:read", "extractions:write", "extractions:delete",
                "categories:read", "categories:write", "categories:delete",
                "jobs:read", "jobs:write", "jobs:execute",
                "tenant_config:read", "tenant_config:write",
                "analytics:read"
            ],
            UserRole.VIEWER: [
                "documents:read",
                "templates:read",
                "extractions:read",
                "categories:read",
                "jobs:read",
                "analytics:read"
            ]
        }
        
        role_key = user.role if isinstance(user.role, UserRole) else UserRole(user.role)
        return permissions.get(role_key, [])
    
    def has_permission(self, user: User, permission: str) -> bool:
        """Check if user has a specific permission"""
        permissions = self.get_user_permissions(user)
        return permission in permissions
    
    def create_api_key(self, db: Session, user_id: UUID, name: str, 
                      description: Optional[str] = None, permissions: Optional[List[str]] = None) -> APIKey:
        """Create a new API key for a user"""
        user = self.get_user_by_id(db, user_id)
        if not user:
            raise ValueError("User not found")
        
        # Generate API key
        api_key = secrets.token_urlsafe(32)
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        # Use user's permissions if not specified
        if not permissions:
            permissions = self.get_user_permissions(user)
        
        # Create API key record
        api_key_record = APIKey(
            id=uuid4(),
            user_id=user_id,
            tenant_id=user.tenant_id,
            name=name,
            description=description,
            key_hash=key_hash,
            permissions=permissions or [],
            is_active=True
        )
        
        db.add(api_key_record)
        db.commit()
        db.refresh(api_key_record)
        
        # Return the API key record with the plain key (only returned once)
        api_key_record.plain_key = api_key
        return api_key_record
    
    def authenticate_api_key(self, db: Session, api_key: str) -> Optional[User]:
        """Authenticate using API key"""
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        api_key_record = db.query(APIKey).filter(
            and_(
                APIKey.key_hash == key_hash,
                APIKey.is_active == True
            )
        ).first()
        
        if not api_key_record:
            return None
        
        # Update last used
        api_key_record.last_used = datetime.now(timezone.utc)
        db.commit()
        
        # Get the user
        user = self.get_user_by_id(db, api_key_record.user_id)
        if not user or user.status != UserStatus.ACTIVE:
            return None
        
        return user
    
    def create_tenant(self, db: Session, tenant_data: TenantCreate) -> Tenant:
        """Create a new tenant"""
        tenant = Tenant(
            name=tenant_data.name,
            settings=tenant_data.settings or {},
            status=TenantStatus.ACTIVE,
            environment=tenant_data.environment or "development"
        )
        
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
        return tenant

    def get_tenant_by_id(self, db: Session, tenant_id: UUID) -> Optional[Tenant]:
        """Get tenant by ID"""
        return db.query(Tenant).filter(Tenant.id == tenant_id).first()
    
    def get_user_tenants(self, db: Session, user_id: UUID) -> List[Tenant]:
        """Get all tenants a user has access to"""
        user = self.get_user_by_id(db, user_id)
        if not user:
            return []
        
        # For now, users only have access to their own tenant
        # In a more complex setup, this could include shared tenants
        tenant = self.get_tenant_by_id(db, user.tenant_id)
        return [tenant] if tenant else []
    
    def switch_tenant(self, db: Session, user_id: UUID, tenant_id: UUID) -> bool:
        """Switch user's current tenant (if they have access)"""
        user = self.get_user_by_id(db, user_id)
        if not user:
            return False
        
        # System admin users can switch to any tenant
        if user.role == UserRole.SYSTEM_ADMIN:
            # Verify the tenant exists
            tenant = self.get_tenant_by_id(db, tenant_id)
            if not tenant:
                return False
            
            # For system admin, we don't update their tenant_id in the database
            # Instead, we just return success - the frontend will handle the context switch
            return True
        
        # For regular users, check if they have access to the tenant
        user_tenants = self.get_user_tenants(db, user_id)
        tenant_ids = [t.id for t in user_tenants]
        
        if tenant_id not in tenant_ids:
            return False
        
        # Update user's current tenant
        user.tenant_id = tenant_id
        db.commit()
        
        return True
    
    # Enhanced methods for role-based operations
    
    def is_system_admin(self, user: User) -> bool:
        """Check if user is a system admin"""
        role = user.role if isinstance(user.role, UserRole) else UserRole(user.role)
        return role == UserRole.SYSTEM_ADMIN
    
    def is_tenant_admin(self, user: User) -> bool:
        """Check if user is a tenant admin"""
        role = user.role if isinstance(user.role, UserRole) else UserRole(user.role)
        return role == UserRole.TENANT_ADMIN
    
    def is_admin(self, user: User) -> bool:
        """Check if user has admin privileges (system or tenant)"""
        role = user.role if isinstance(user.role, UserRole) else UserRole(user.role)
        return role in (UserRole.SYSTEM_ADMIN, UserRole.TENANT_ADMIN)
    
    def can_access_tenant(self, user: User, target_tenant_id: UUID) -> bool:
        """Check if user can access a specific tenant"""
        # System admins can access any tenant
        if self.is_system_admin(user):
            return True
        
        # Other users can only access their own tenant
        return user.tenant_id == target_tenant_id
    
    def get_tenant_users(self, db: Session, tenant_id: UUID) -> List[User]:
        """Get all users in a specific tenant"""
        return db.query(User).filter(User.tenant_id == tenant_id).all()
    
    def get_all_tenants(self, db: Session) -> List[Tenant]:
        """Get all tenants (for system admin use)"""
        return db.query(Tenant).all()
    
    def update_user_role(self, db: Session, user_id: UUID, new_role: str, actor_user: User) -> bool:
        """Update user role with permission checking"""
        user = self.get_user_by_id(db, user_id)
        if not user:
            return False
        
        # Check if actor has permission to modify this user
        # System admins can modify anyone, tenant admins can only modify users in their tenant
        if not self.is_system_admin(actor_user):
            if not self.is_tenant_admin(actor_user) or user.tenant_id != actor_user.tenant_id:
                return False
        
        # Update role
        try:
            user.role = UserRole(new_role) if isinstance(new_role, str) else new_role
        except ValueError:
            return False
        db.commit()
        return True
    
    def create_user_in_tenant(self, db: Session, email: str, password: str, first_name: str, 
                             last_name: str, role: str, tenant_id: UUID, actor_user: User) -> Optional[User]:
        """Create a user in a specific tenant with permission checking"""
        # Check if actor has permission to create users in this tenant
        if not self.is_system_admin(actor_user):
            if not self.is_tenant_admin(actor_user) or tenant_id != actor_user.tenant_id:
                return None
        
        # Check if user already exists
        existing_user = self.get_user_by_email(db, email)
        if existing_user:
            return None
        
        # Create user
        return self.create_user(db, email, password, first_name, last_name, UserRole(role), tenant_id)


# Global auth service instance
auth_service = AuthService()

# FastAPI Security
security = HTTPBearer()

# FastAPI Dependencies
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token"""
    token = credentials.credentials
    
    # Verify token
    payload = auth_service.verify_token(token, "access")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user
    sub = payload.get("sub")
    try:
        user_id = UUID(sub)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = auth_service.get_user_by_id(db, user_id)
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

def require_permission(permission: str):
    """Create a dependency that requires a specific permission"""
    async def permission_dependency(current_user: User = Depends(get_current_user)) -> User:
        user_permissions = auth_service.get_user_permissions(current_user)
        if permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission} required"
            )
        return current_user
    
    return permission_dependency

def require_role(required_role: UserRole):
    """Create a dependency that requires a specific role"""
    async def role_dependency(current_user: User = Depends(get_current_user)) -> User:
        role = current_user.role if isinstance(current_user.role, UserRole) else UserRole(current_user.role)
        if role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role required: {required_role.value}"
            )
        return current_user
    
    return role_dependency

def require_admin():
    """Create a dependency that requires admin role (system or tenant)"""
    async def admin_dependency(current_user: User = Depends(get_current_user)) -> User:
        role = current_user.role if isinstance(current_user.role, UserRole) else UserRole(current_user.role)
        if role not in (UserRole.SYSTEM_ADMIN, UserRole.TENANT_ADMIN):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Role required: admin (system or tenant)"
            )
        return current_user
    
    return admin_dependency

def require_tenant_admin():
    """Create a dependency that requires tenant admin role"""
    return require_role(UserRole.TENANT_ADMIN)

def require_system_admin():
    """Create a dependency that requires system admin role"""
    return require_role(UserRole.SYSTEM_ADMIN)
