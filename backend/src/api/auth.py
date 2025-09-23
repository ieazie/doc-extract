"""
Authentication and authorization API endpoints
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
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
    TenantSwitch, PermissionResponse, UserStatus
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
    sub = payload.get("sub")
    try:
        user_id = UUID(sub)  # type: ignore[arg-type]
    except (TypeError, ValueError, AttributeError):
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
def require_permission(permission: str, allow_cross_tenant: bool = False):
    """Dependency factory to check user permissions with tenant scoping"""
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        # Check basic permission
        if not auth_service.has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission} required"
            )
        
        # For cross-tenant permissions, only system admins are allowed
        if allow_cross_tenant and not auth_service.is_system_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-tenant access requires system admin privileges"
            )
        
        return current_user
    return permission_checker


# Enhanced dependency for tenant-scoped permissions
def require_tenant_permission(permission: str, target_tenant_id: Optional[UUID] = None):
    """Dependency factory to check permissions with specific tenant scoping"""
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        # Check basic permission
        if not auth_service.has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission} required"
            )
        
        # Check tenant access
        if target_tenant_id and not auth_service.can_access_tenant(current_user, target_tenant_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: Cannot access tenant {target_tenant_id}"
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
    request: Request,
    response: Response,
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
            data={"sub": str(user.id), "email": user.email, "tenant_id": str(user.tenant_id) if user.tenant_id else None}
        )
        
        # Create refresh token with family tracking
        refresh_token = auth_service.create_refresh_token(
            db=db, user_id=user.id
        )
        
        # Set refresh token in httpOnly cookie with security flags
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            max_age=7 * 24 * 60 * 60,  # 7 days
            httponly=True,
            secure=True,  # Only over HTTPS
            samesite="strict",  # CSRF protection
            path="/auth/refresh"  # Scope cookie to refresh endpoint only
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


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Refresh access token using httpOnly cookie with family tracking and reuse detection"""
    try:
        # Get refresh token from httpOnly cookie
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verify refresh token with reuse detection
        payload = auth_service.verify_refresh_token(db, refresh_token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or reused refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user from refresh token
        sub = payload.get("sub")
        family_id = payload.get("family_id")
        
        try:
            user_id = UUID(sub)  # type: ignore[arg-type]
            family_uuid = UUID(family_id)  # type: ignore[arg-type]
        except (TypeError, ValueError, AttributeError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = auth_service.get_user_by_id(db, user_id)
        if not user or user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create new access token
        access_token = auth_service.create_access_token({
            "sub": str(user.id), 
            "email": user.email, 
            "tenant_id": str(user.tenant_id) if user.tenant_id else None
        })
        
        # Create new refresh token in the same family
        new_refresh_token = auth_service.create_refresh_token(
            db=db, 
            user_id=user_id, 
            family_id=family_uuid
        )
        
        # Set new refresh token cookie with security flags
        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            max_age=7 * 24 * 60 * 60,  # 7 days
            httponly=True,
            secure=True,  # Only over HTTPS
            samesite="strict",  # CSRF protection
            path="/auth/refresh"  # Scope cookie to refresh endpoint only
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
        logger.exception("Token refresh failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        ) from e


@router.post("/logout")
async def logout_user(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Logout user, revoke all tokens, and clear refresh token cookie"""
    try:
        # Revoke all refresh tokens for the user
        auth_service.revoke_user_tokens(db, current_user.id)
        
        # Clear the refresh token cookie
        response.delete_cookie(
            key="refresh_token",
            httponly=True,
            secure=True,
            samesite="strict",
            path="/auth/refresh"  # Must match the path used in set_cookie
        )
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        logger.exception("Logout failed")
        # Even if there's an error, we should still try to clear the cookie
        response.delete_cookie(
            key="refresh_token",
            httponly=True,
            secure=True,
            samesite="strict",
            path="/auth/refresh"  # Must match the path used in set_cookie
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        ) from e


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


# ============================================================================
# TENANT MANAGEMENT ENDPOINTS (Admin only)
# ============================================================================

@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    tenant_data: TenantCreate,
    current_user: User = Depends(require_permission("tenants:create", allow_cross_tenant=True)),
    db: Session = Depends(get_db)
):
    """Create a new tenant (admin only)"""
    try:
        tenant = auth_service.create_tenant(db, tenant_data)
        
        return TenantResponse(
            id=tenant.id,
            name=tenant.name,
            settings=tenant.settings,
            status=tenant.status,
            environment=tenant.environment,
            created_at=tenant.created_at,
            updated_at=tenant.updated_at
        )
        
    except Exception as e:
        logger.error(f"Tenant creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create tenant"
        )


@router.get("/tenants/all", response_model=List[TenantResponse])
async def list_all_tenants(
    current_user: User = Depends(require_permission("tenants:read_all", allow_cross_tenant=True)),
    db: Session = Depends(get_db)
):
    """List all tenants (admin only)"""
    tenants = db.query(Tenant).all()
    
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


@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: UUID,
    current_user: User = Depends(require_permission("tenants:read")),
    db: Session = Depends(get_db)
):
    """Get tenant by ID (admin only)"""
    # Check if user can access this tenant
    if not auth_service.can_access_tenant(current_user, tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot access this tenant"
        )
    
    tenant = auth_service.get_tenant_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    return TenantResponse(
        id=tenant.id,
        name=tenant.name,
        settings=tenant.settings,
        status=tenant.status,
        environment=tenant.environment,
        created_at=tenant.created_at,
        updated_at=tenant.updated_at
    )


@router.put("/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: UUID,
    tenant_data: TenantUpdate,
    current_user: User = Depends(require_permission("tenants:update")),
    db: Session = Depends(get_db)
):
    """Update a tenant (admin only)"""
    # Check if user can access this tenant
    if not auth_service.can_access_tenant(current_user, tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot access this tenant"
        )
    
    tenant = auth_service.get_tenant_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Update fields
    if tenant_data.name is not None:
        tenant.name = tenant_data.name
    if tenant_data.settings is not None:
        tenant.settings = tenant_data.settings
    if tenant_data.status is not None:
        tenant.status = tenant_data.status
    if tenant_data.environment is not None:
        tenant.environment = tenant_data.environment
    
    db.commit()
    db.refresh(tenant)
    
    return TenantResponse(
        id=tenant.id,
        name=tenant.name,
        settings=tenant.settings,
        status=tenant.status,
        environment=tenant.environment,
        created_at=tenant.created_at,
        updated_at=tenant.updated_at
    )


@router.delete("/tenants/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(
    tenant_id: UUID,
    current_user: User = Depends(require_permission("tenants:delete")),
    db: Session = Depends(get_db)
):
    """Delete a tenant (admin only)"""
    # Check if user can access this tenant
    if not auth_service.can_access_tenant(current_user, tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot access this tenant"
        )
    
    tenant = auth_service.get_tenant_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check if tenant has users
    user_count = db.query(User).filter(User.tenant_id == tenant_id).count()
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete tenant with existing users"
        )
    
    db.delete(tenant)
    db.commit()
