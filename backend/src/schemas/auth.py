"""
Authentication and authorization schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from enum import Enum
from uuid import UUID
from datetime import datetime


class UserRole(str, Enum):
    """User roles for role-based access control"""
    SYSTEM_ADMIN = "system_admin"    # Platform-wide admin
    TENANT_ADMIN = "tenant_admin"    # Tenant admin
    USER = "user"                    # Regular user
    VIEWER = "viewer"                # Read-only user


class UserStatus(str, Enum):
    """User account status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"


class TenantStatus(str, Enum):
    """Tenant status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    TRIAL = "trial"


class UserCreate(BaseModel):
    """User creation request"""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    role: UserRole = UserRole.USER
    tenant_id: Optional[UUID] = None


class UserUpdate(BaseModel):
    """User update request"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    role: Optional[str] = None  # Changed from UserRole enum to string for database compatibility
    status: Optional[UserStatus] = None


class UserResponse(BaseModel):
    """User response model"""
    id: UUID
    email: str
    first_name: str
    last_name: str
    role: str  # Changed from UserRole enum to string for database compatibility
    status: UserStatus
    tenant_id: Optional[UUID]  # Allow NULL for system admin users
    last_login: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    """User login request"""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Authentication token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TenantCreate(BaseModel):
    """Tenant creation request"""
    name: str = Field(..., min_length=1, max_length=255)
    settings: Optional[dict] = Field(default_factory=dict)
    environment: str = Field(default="development", description="Environment: development, staging, production")


class TenantUpdate(BaseModel):
    """Tenant update request"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    settings: Optional[dict] = None
    status: Optional[TenantStatus] = None


class TenantResponse(BaseModel):
    """Tenant response model"""
    id: UUID
    name: str
    settings: dict
    status: TenantStatus
    environment: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class APIKeyCreate(BaseModel):
    """API key creation request"""
    name: str = Field(..., min_length=1, max_length=100, description="API key name for identification")
    description: Optional[str] = Field(None, max_length=500)
    permissions: List[str] = Field(default_factory=list, description="List of permissions")


class APIKeyResponse(BaseModel):
    """API key response model"""
    id: UUID
    name: str
    description: Optional[str]
    key_prefix: str  # First 8 characters for identification
    permissions: List[str]
    tenant_id: UUID
    created_at: datetime
    last_used: Optional[datetime]
    is_active: bool

    class Config:
        from_attributes = True


class APIKeyListResponse(BaseModel):
    """API key list response"""
    api_keys: List[APIKeyResponse]
    total: int


class PasswordChange(BaseModel):
    """Password change request"""
    current_password: str
    new_password: str = Field(..., min_length=8, description="New password must be at least 8 characters")


class PasswordReset(BaseModel):
    """Password reset request"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation"""
    token: str
    new_password: str = Field(..., min_length=8, description="New password must be at least 8 characters")


class TenantSwitch(BaseModel):
    """Tenant switching request"""
    tenant_id: UUID


class PermissionResponse(BaseModel):
    """User permissions response"""
    permissions: List[str]
    role: UserRole
    tenant_id: UUID
