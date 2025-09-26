"""
Tenant-Aware CORS Middleware

This middleware provides dynamic CORS configuration based on tenant-specific settings.
It extracts the tenant ID from various sources (JWT token, subdomain, headers) and
applies tenant-specific CORS policies.
"""

import logging
from typing import Optional, Dict, Any
from uuid import UUID
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import jwt

from ..services.tenant_config_service import TenantConfigService
from ..utils.tenant_identification import TenantIdentifier

logger = logging.getLogger(__name__)


class TenantAwareCORSMiddleware(BaseHTTPMiddleware):
    """
    Middleware that applies tenant-specific CORS configuration
    
    This middleware:
    1. Extracts tenant ID from request (JWT, subdomain, headers)
    2. Retrieves tenant-specific CORS configuration
    3. Applies CORS headers based on tenant settings
    """
    
    def __init__(self, app, db_session_factory):
        super().__init__(app)
        self.db_session_factory = db_session_factory
        self.tenant_identifier = TenantIdentifier()
    
    async def dispatch(self, request: Request, call_next):
        """Process request and apply tenant-aware CORS"""
        
        # Extract tenant ID from request
        tenant_id = await self.extract_tenant_id(request)
        
        # Get tenant-specific CORS configuration
        cors_config = None
        if tenant_id:
            cors_config = await self.get_tenant_cors_config(tenant_id, request)
        
        # Apply CORS configuration to request scope
        if cors_config:
            request.scope["tenant_cors_config"] = cors_config
            logger.debug(f"Applied CORS config for tenant {tenant_id}: {cors_config}")
        
        # Process the request
        response = await call_next(request)
        
        # Apply CORS headers to response
        if cors_config:
            request_origin = request.headers.get("Origin")
            self.apply_cors_headers(response, cors_config, request_origin)
        
        return response
    
    async def extract_tenant_id(self, request: Request) -> Optional[UUID]:
        """
        Extract tenant ID from request using multiple methods
        
        Priority order:
        1. JWT token in Authorization header
        2. X-Tenant-ID header
        3. Subdomain detection
        4. Environment detection
        """
        
        # Method 1: From JWT token in Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                # Decode without verification to get tenant_id
                payload = jwt.decode(token, options={"verify_signature": False})
                tenant_id_str = payload.get("tenant_id")
                if tenant_id_str:
                    return UUID(tenant_id_str)
            except Exception as e:
                logger.debug(f"Failed to extract tenant from JWT: {e}")
        
        # Method 2: From X-Tenant-ID header
        tenant_header = request.headers.get("X-Tenant-ID")
        if tenant_header:
            try:
                return UUID(tenant_header)
            except Exception as e:
                logger.debug(f"Invalid X-Tenant-ID header: {e}")
        
        # Method 3: From subdomain (using tenant identifier utility)
        try:
            tenant_id = self.tenant_identifier.identify_from_subdomain(request)
            if tenant_id:
                return tenant_id
        except Exception as e:
            logger.debug(f"Failed to identify tenant from subdomain: {e}")
        
        # Method 4: From environment detection
        try:
            # This could be used for multi-tenant environments where
            # the environment determines the tenant context
            pass
        except Exception as e:
            logger.debug(f"Failed to identify tenant from environment: {e}")
        
        return None
    
    async def get_tenant_cors_config(self, tenant_id: UUID, request: Request) -> Optional[Dict[str, Any]]:
        """
        Get tenant-specific CORS configuration from database
        
        Returns the CORS configuration as a dictionary that can be applied
        to HTTP headers, or None if no configuration is found.
        """
        
        try:
            # Get database session
            db = next(self.db_session_factory())
            
            try:
                # Get tenant CORS configuration
                config_service = TenantConfigService(db)
                
                # Detect environment from request
                from ..utils.environment_detection import EnvironmentDetector
                env_detector = EnvironmentDetector()
                environment = env_detector.detect_environment(request)
                
                # Get CORS configuration for the tenant and environment
                cors_config = config_service.get_cors_config(tenant_id, environment)
                
                if cors_config:
                    # Convert Pydantic model to dictionary for header application
                    return cors_config.model_dump()
                else:
                    # Create default CORS configuration if none exists
                    logger.info(f"No CORS config found for tenant {tenant_id}, creating default")
                    default_config = config_service.create_default_cors_config(tenant_id, environment)
                    return default_config.model_dump()
                    
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Failed to get CORS config for tenant {tenant_id}: {e}")
            return None
    
    def apply_cors_headers(
        self,
        response: Response,
        cors_config: Dict[str, Any],
        request_origin: Optional[str] = None,
    ):
        """
        Apply CORS headers to the response based on tenant configuration
        
        Args:
            response: The HTTP response object
            cors_config: Tenant-specific CORS configuration dictionary
            request_origin: The origin of the requesting client
        """
        
        try:
            # Apply allowed origins (CORS spec requires single origin, not comma-separated list)
            allowed_origins = cors_config.get("allowed_origins", [])
            allow_credentials = cors_config.get("allow_credentials", False)
            
            if "*" in allowed_origins and not allow_credentials:
                # Only allow "*" when credentials are not required
                response.headers["Access-Control-Allow-Origin"] = "*"
            elif request_origin and request_origin in allowed_origins:
                # Echo the specific request origin when it's allowed
                response.headers["Access-Control-Allow-Origin"] = request_origin
            elif len(allowed_origins) == 1:
                # Single allowed origin
                response.headers["Access-Control-Allow-Origin"] = allowed_origins[0]
            # If no match and not single origin, don't set the header (browser will reject)
            
            # Apply allow credentials
            response.headers["Access-Control-Allow-Credentials"] = str(allow_credentials).lower()
            
            # Apply allowed methods
            allowed_methods = cors_config.get("allowed_methods", ["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            response.headers["Access-Control-Allow-Methods"] = ",".join(allowed_methods)
            
            # Apply allowed headers
            allowed_headers = cors_config.get("allowed_headers", [
                "Content-Type",
                "Authorization", 
                "X-Requested-With",
                "X-Tenant-ID",
                "X-Environment"
            ])
            response.headers["Access-Control-Allow-Headers"] = ",".join(allowed_headers)
            
            # Apply exposed headers
            exposed_headers = cors_config.get("exposed_headers", [])
            if exposed_headers:
                response.headers["Access-Control-Expose-Headers"] = ",".join(exposed_headers)
            
            # Apply max age for preflight requests
            max_age = cors_config.get("max_age", 3600)
            response.headers["Access-Control-Max-Age"] = str(max_age)
            
            logger.debug(f"Applied CORS headers: {dict(response.headers)}")
            
        except Exception as e:
            logger.error(f"Failed to apply CORS headers: {e}")
    
    def handle_preflight_request(self, request: Request) -> Response:
        """
        Handle CORS preflight requests (OPTIONS method)
        
        Returns a response with appropriate CORS headers for preflight requests.
        """
        
        # Get CORS config from request scope
        cors_config = request.scope.get("tenant_cors_config")
        
        if cors_config:
            # Create response with CORS headers
            response = Response(status_code=200)
            request_origin = request.headers.get("Origin")
            self.apply_cors_headers(response, cors_config, request_origin)
            return response
        else:
            # Return standard preflight response
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
                    "Access-Control-Max-Age": "3600"
                }
            )
