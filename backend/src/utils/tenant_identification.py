"""
Tenant Identification Utility

This utility provides tenant identification capabilities for multi-tenant
authentication and configuration management.
"""

from typing import Optional
from uuid import UUID
from fastapi import Request, HTTPException, status
import jwt
import logging

logger = logging.getLogger(__name__)


class TenantIdentifier:
    """Utility for identifying tenants from requests"""
    
    @staticmethod
    def extract_tenant_id(request: Request) -> Optional[UUID]:
        """
        Extract tenant ID from request using multiple methods.
        
        Priority order:
        1. X-Tenant-ID header (primary method as requested)
        2. JWT token (from Authorization header)
        3. Subdomain detection (future enhancement)
        
        Args:
            request: FastAPI request object
            
        Returns:
            Tenant UUID if found, None otherwise
        """
        
        # Method 1: X-Tenant-ID header (primary method as requested)
        tenant_header = request.headers.get("X-Tenant-ID")
        if tenant_header:
            try:
                tenant_id = UUID(tenant_header)
                logger.debug(f"Tenant ID extracted from X-Tenant-ID header: {tenant_id}")
                return tenant_id
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid tenant ID in X-Tenant-ID header: {tenant_header}, error: {e}")
        
        # Method 2: JWT token (from Authorization header)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                token = auth_header.split(" ")[1]
                # Decode without verification to get tenant_id
                payload = jwt.decode(token, options={"verify_signature": False})
                tenant_id_str = payload.get("tenant_id")
                if tenant_id_str:
                    tenant_id = UUID(tenant_id_str)
                    logger.debug(f"Tenant ID extracted from JWT token: {tenant_id}")
                    return tenant_id
            except (jwt.InvalidTokenError, ValueError, TypeError) as e:
                logger.warning(f"Failed to extract tenant ID from JWT token: {e}")
        
        # Method 3: Subdomain detection (future enhancement)
        # This could be implemented for subdomain-based tenant identification
        # For now, we'll skip this method
        
        logger.debug("No tenant ID found in request")
        return None
    
    @staticmethod
    def extract_tenant_id_or_raise(request: Request) -> UUID:
        """
        Extract tenant ID from request or raise HTTPException if not found.
        
        Args:
            request: FastAPI request object
            
        Returns:
            Tenant UUID
            
        Raises:
            HTTPException: If tenant ID cannot be determined
        """
        tenant_id = TenantIdentifier.extract_tenant_id(request)
        
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant ID is required. Please provide X-Tenant-ID header or valid JWT token."
            )
        
        return tenant_id
    
    @staticmethod
    def validate_tenant_id(tenant_id: str) -> UUID:
        """
        Validate and convert tenant ID string to UUID.
        
        Args:
            tenant_id: Tenant ID as string
            
        Returns:
            Validated tenant UUID
            
        Raises:
            HTTPException: If tenant ID is invalid
        """
        try:
            return UUID(tenant_id)
        except (ValueError, TypeError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid tenant ID format: {tenant_id}"
            )
    
    @staticmethod
    def extract_tenant_from_subdomain(request: Request) -> Optional[str]:
        """
        Extract tenant identifier from subdomain (future enhancement).
        
        Args:
            request: FastAPI request object
            
        Returns:
            Tenant identifier from subdomain if found
        """
        host = request.headers.get("host", "")
        if "." in host:
            subdomain = host.split(".")[0]
            # Filter out common subdomains
            if subdomain not in ["www", "api", "app", "admin", "staging"]:
                logger.debug(f"Tenant subdomain detected: {subdomain}")
                return subdomain
        
        return None
    
    @staticmethod
    def get_tenant_context(request: Request) -> dict:
        """
        Get comprehensive tenant context from request.
        
        Args:
            request: FastAPI request object
            
        Returns:
            Dictionary containing tenant context information
        """
        tenant_id = TenantIdentifier.extract_tenant_id(request)
        subdomain = TenantIdentifier.extract_tenant_from_subdomain(request)
        
        return {
            "tenant_id": tenant_id,
            "subdomain": subdomain,
            "has_tenant_id": tenant_id is not None,
            "has_subdomain": subdomain is not None,
            "identification_method": "header" if tenant_id and request.headers.get("X-Tenant-ID") else "jwt" if tenant_id else "none"
        }


def get_tenant_id_from_request(request: Request) -> Optional[UUID]:
    """
    Convenience function to get tenant ID from request.
    
    Args:
        request: FastAPI request object
        
    Returns:
        Tenant UUID if found, None otherwise
    """
    return TenantIdentifier.extract_tenant_id(request)


def require_tenant_id(request: Request) -> UUID:
    """
    Convenience function to require tenant ID from request.
    
    Args:
        request: FastAPI request object
        
    Returns:
        Tenant UUID
        
    Raises:
        HTTPException: If tenant ID cannot be determined
    """
    return TenantIdentifier.extract_tenant_id_or_raise(request)
