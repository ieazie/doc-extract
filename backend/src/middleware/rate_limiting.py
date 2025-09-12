"""
Rate Limiting Middleware
"""
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Callable, Optional
from uuid import UUID
import logging

from ..models.database import get_db, User
from ..services.rate_limit_service import RateLimitService
from ..services.tenant_config_service import TenantConfigService

logger = logging.getLogger(__name__)


class RateLimitMiddleware:
    """Rate limiting middleware for API endpoints"""
    
    def __init__(self):
        pass
    
    async def check_rate_limit(
        self,
        request: Request,
        limit_type: str,
        window_minutes: int = 60,
        db: Optional[Session] = None
    ) -> bool:
        """Check if request should be rate limited"""
        
        # Get user from request state (set by auth middleware)
        user: Optional[User] = getattr(request.state, 'user', None)
        if not user:
            return True  # Allow if no user (public endpoints)
        
        # Use provided db session or create new one
        if not db:
            db = next(get_db())
        
        try:
            # Get tenant's rate limits configuration
            config_service = TenantConfigService(db)
            rate_limits_config = config_service.get_rate_limits_config(user.tenant_id)
            
            if not rate_limits_config:
                logger.warning(f"No rate limits configured for tenant {user.tenant_id}")
                return True  # Allow if no rate limits configured
            
            # Get the limit value based on limit type
            limit_value = getattr(rate_limits_config, limit_type, None)
            if not limit_value:
                logger.warning(f"No limit configured for {limit_type}")
                return True  # Allow if no specific limit configured
            
            # Check rate limit
            rate_limit_service = RateLimitService(db)
            is_allowed = rate_limit_service.check_rate_limit(
                tenant_id=user.tenant_id,
                limit_type=limit_type,
                limit_value=limit_value,
                window_minutes=window_minutes
            )
            
            if not is_allowed:
                logger.warning(f"Rate limit exceeded for tenant {user.tenant_id}, type: {limit_type}")
                return False
            
            # Increment counter
            rate_limit_service.increment_rate_limit(
                tenant_id=user.tenant_id,
                limit_type=limit_type,
                window_minutes=window_minutes
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Rate limiting check failed: {str(e)}")
            return True  # Allow on error to avoid blocking legitimate requests
        finally:
            if not db:
                db.close()


# Global instance
rate_limit_middleware = RateLimitMiddleware()


def rate_limit(limit_type: str, window_minutes: int = 60):
    """Decorator for rate limiting API endpoints"""
    
    def decorator(func: Callable):
        async def wrapper(*args, **kwargs):
            # Find request object in args/kwargs
            request = None
            db = None
            
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                elif isinstance(arg, Session):
                    db = arg
            
            # Also check kwargs
            if not request:
                request = kwargs.get('request')
            if not db:
                db = kwargs.get('db')
            
            if request:
                is_allowed = await rate_limit_middleware.check_rate_limit(
                    request, limit_type, window_minutes, db
                )
                
                if not is_allowed:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Rate limit exceeded for {limit_type}. Please try again later."
                    )
            
            return await func(*args, **kwargs)
        
        return wrapper
    
    return decorator


# Predefined rate limit decorators for common use cases
def api_rate_limit(func: Callable):
    """Rate limit for general API requests"""
    return rate_limit("api_requests_per_minute", 1)(func)

def upload_rate_limit(func: Callable):
    """Rate limit for document uploads"""
    return rate_limit("document_uploads_per_hour", 60)(func)

def extraction_rate_limit(func: Callable):
    """Rate limit for document extractions"""
    return rate_limit("extractions_per_hour", 60)(func)
