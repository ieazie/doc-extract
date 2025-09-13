"""
Authentication and authorization service
"""
import logging
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from passlib.context import CryptContext
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..models.database import User, Tenant, APIKey, SessionLocal
from ..config import settings
from ..schemas.auth import UserRole, UserStatus, TenantStatus, UserCreate, TenantCreate

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
REFRESH_TOKEN_EXPIRE_DAYS = 7


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
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def create_refresh_token(self, data: dict) -> str:
        """Create a JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str, token_type: str = "access") -> Optional[dict]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != token_type:
                return None
            return payload
        except JWTError:
            return None
    
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
        user.last_login = datetime.utcnow()
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
        tenant = db.query(Tenant).filter(Tenant.name == "Default Tenant").first()
        if not tenant:
            # Create default tenant if it doesn't exist
            tenant = Tenant(
                id=UUID("00000000-0000-0000-0000-000000000001"),
                name="Default Tenant",
                settings={"max_documents": 1000, "max_templates": 50},
                status=TenantStatus.ACTIVE,
                environment="development"
            )
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
        
        return tenant.id
    
    def get_user_permissions(self, user: User) -> List[str]:
        """Get user permissions based on role"""
        permissions = {
            UserRole.ADMIN: [
                "documents:read", "documents:write", "documents:delete",
                "templates:read", "templates:write", "templates:delete",
                "extractions:read", "extractions:write", "extractions:delete",
                "categories:read", "categories:write", "categories:delete",
                "users:read", "users:write", "users:delete",
                "tenants:read", "tenants:write", "tenants:delete",
                "api-keys:read", "api-keys:write", "api-keys:delete",
                "tenant_config:read", "tenant_config:write", "tenant_config:delete",
                "analytics:read"
            ],
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
                
                # API Management
                "api-keys:read", "api-keys:write", "api-keys:delete"
            ],
            UserRole.USER: [
                "documents:read", "documents:write", "documents:delete",
                "templates:read", "templates:write", "templates:delete",
                "extractions:read", "extractions:write", "extractions:delete",
                "categories:read", "categories:write", "categories:delete",
                "tenant_config:read", "tenant_config:write",
                "analytics:read"
            ],
            UserRole.VIEWER: [
                "documents:read",
                "templates:read",
                "extractions:read",
                "categories:read",
                "analytics:read"
            ]
        }
        
        return permissions.get(user.role, [])
    
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
        api_key_record.last_used = datetime.utcnow()
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
        
        # Check if user has access to the tenant
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
        return user.role == UserRole.SYSTEM_ADMIN.value
    
    def is_tenant_admin(self, user: User) -> bool:
        """Check if user is a tenant admin (including legacy admin)"""
        return user.role in [UserRole.TENANT_ADMIN.value, UserRole.ADMIN.value]
    
    def is_admin(self, user: User) -> bool:
        """Check if user has admin privileges (system or tenant)"""
        return user.role in [UserRole.SYSTEM_ADMIN.value, UserRole.TENANT_ADMIN.value, UserRole.ADMIN.value]
    
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
        user.role = new_role
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
