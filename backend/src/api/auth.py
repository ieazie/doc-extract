"""
Authentication and authorization API endpoints
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from uuid import UUID

from ..models.database import get_db, User, Tenant, APIKey
from ..services.auth_service import auth_service
from ..schemas.auth import (
    UserCreate, UserResponse, UserLogin, TokenResponse, UserUpdate,
    TenantCreate, TenantResponse, TenantUpdate, TenantStatus,
    APIKeyCreate, APIKeyResponse, APIKeyListResponse,
    PasswordChange, PasswordReset, PasswordResetConfirm,
    TenantSwitch, PermissionResponse, UserRole, UserStatus
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()


# Dependency to get current user from JWT token
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
    user_id = UUID(payload.get("sub"))
    user = auth_service.get_user_by_id(db, user_id)
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


# Dependency to get current tenant
async def get_current_tenant(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Tenant:
    """Get current user's tenant"""
    tenant = auth_service.get_tenant_by_id(db, current_user.tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    return tenant


# Dependency to check permissions
def require_permission(permission: str):
    """Dependency factory to check user permissions"""
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if not auth_service.has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission} required"
            )
        return current_user
    return permission_checker


# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    try:
        # Create user
        user = auth_service.create_user(
            db=db,
            email=user_data.email,
            password=user_data.password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role=user_data.role,
            tenant_id=user_data.tenant_id
        )
        
        return UserResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            status=user.status,
            tenant_id=user.tenant_id,
            last_login=user.last_login,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"User registration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=TokenResponse)
async def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """Authenticate user and return access token"""
    try:
        # Authenticate user
        user = auth_service.authenticate_user(db, login_data.email, login_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create access token
        access_token = auth_service.create_access_token(
            data={"sub": str(user.id), "email": user.email, "tenant_id": str(user.tenant_id)}
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=30 * 60,  # 30 minutes
            user=UserResponse(
                id=user.id,
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                role=user.role,
                status=user.status,
                tenant_id=user.tenant_id,
                last_login=user.last_login,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User login failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role=current_user.role,
        status=current_user.status,
        tenant_id=current_user.tenant_id,
        last_login=current_user.last_login,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at
    )


@router.get("/permissions", response_model=PermissionResponse)
async def get_user_permissions(
    current_user: User = Depends(get_current_user)
):
    """Get current user permissions"""
    permissions = auth_service.get_user_permissions(current_user)
    return PermissionResponse(
        permissions=permissions,
        role=current_user.role,
        tenant_id=current_user.tenant_id
    )


# ============================================================================
# TENANT MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/tenant", response_model=TenantResponse)
async def get_current_tenant_info(
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Get current tenant information"""
    return TenantResponse(
        id=current_tenant.id,
        name=current_tenant.name,
        settings=current_tenant.settings,
        status=current_tenant.status,
        environment=current_tenant.environment,
        created_at=current_tenant.created_at,
        updated_at=current_tenant.updated_at
    )


@router.get("/tenants", response_model=List[TenantResponse])
async def get_user_tenants(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all tenants accessible to the current user"""
    tenants = auth_service.get_user_tenants(db, current_user.id)
    return [
        TenantResponse(
            id=tenant.id,
            name=tenant.name,
            settings=tenant.settings,
            status=tenant.status,
            environment=tenant.environment,
            created_at=tenant.created_at,
            updated_at=tenant.updated_at
        )
        for tenant in tenants
    ]


@router.post("/switch-tenant", response_model=dict)
async def switch_tenant(
    switch_data: TenantSwitch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Switch user's current tenant"""
    success = auth_service.switch_tenant(db, current_user.id, switch_data.tenant_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this tenant"
        )
    
    return {"message": "Tenant switched successfully", "tenant_id": str(switch_data.tenant_id)}


# ============================================================================
# API KEY MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/api-keys", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    api_key_data: APIKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new API key for the current user"""
    try:
        api_key = auth_service.create_api_key(
            db=db,
            user_id=current_user.id,
            name=api_key_data.name,
            description=api_key_data.description,
            permissions=api_key_data.permissions
        )
        
        return APIKeyResponse(
            id=api_key.id,
            name=api_key.name,
            description=api_key.description,
            key_prefix=api_key.plain_key[:8],  # First 8 characters
            permissions=api_key.permissions,
            tenant_id=api_key.tenant_id,
            created_at=api_key.created_at,
            last_used=api_key.last_used,
            is_active=api_key.is_active
        )
        
    except Exception as e:
        logger.error(f"API key creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create API key"
        )


@router.get("/api-keys", response_model=APIKeyListResponse)
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all API keys for the current user"""
    api_keys = db.query(APIKey).filter(
        APIKey.user_id == current_user.id
    ).all()
    
    return APIKeyListResponse(
        api_keys=[
            APIKeyResponse(
                id=api_key.id,
                name=api_key.name,
                description=api_key.description,
                key_prefix=f"sk-{str(api_key.id)[:8]}",  # Masked key
                permissions=api_key.permissions,
                tenant_id=api_key.tenant_id,
                created_at=api_key.created_at,
                last_used=api_key.last_used,
                is_active=api_key.is_active
            )
            for api_key in api_keys
        ],
        total=len(api_keys)
    )


@router.delete("/api-keys/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    api_key_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an API key"""
    api_key = db.query(APIKey).filter(
        APIKey.id == api_key_id,
        APIKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    db.delete(api_key)
    db.commit()


# ============================================================================
# USER MANAGEMENT ENDPOINTS (Admin only)
# ============================================================================

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(require_permission("users:read")),
    db: Session = Depends(get_db)
):
    """List all users in the current tenant (admin only)"""
    users = db.query(User).filter(User.tenant_id == current_user.tenant_id).all()
    
    return [
        UserResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            status=user.status,
            tenant_id=user.tenant_id,
            last_login=user.last_login,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
        for user in users
    ]


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    current_user: User = Depends(require_permission("users:write")),
    db: Session = Depends(get_db)
):
    """Update a user (admin only)"""
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_user.tenant_id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields
    if user_data.first_name is not None:
        user.first_name = user_data.first_name
    if user_data.last_name is not None:
        user.last_name = user_data.last_name
    if user_data.role is not None:
        user.role = user_data.role
    if user_data.status is not None:
        user.status = user_data.status
    
    db.commit()
    db.refresh(user)
    
    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        status=user.status,
        tenant_id=user.tenant_id,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at
    )
