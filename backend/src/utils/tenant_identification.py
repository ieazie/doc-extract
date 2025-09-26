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
    def extract_tenant_id(request: Request) -> tuple[Optional[UUID], str]:
        """
        Extract tenant ID from request using multiple methods.
        
        Priority order:
        1. X-Tenant-ID header (primary method as requested)
        2. JWT token (from Authorization header)
        3. Subdomain detection
        
        Args:
            request: FastAPI request object
            
        Returns:
            Tuple of (tenant UUID if found, source method: "header"|"jwt"|"subdomain"|"none")
        """
        
        # Method 1: X-Tenant-ID header (primary method as requested)
        tenant_header = request.headers.get("X-Tenant-ID")
        if tenant_header:
            try:
                tenant_id = UUID(tenant_header)
                logger.debug(f"Tenant ID extracted from X-Tenant-ID header: {tenant_id}")
                return tenant_id, "header"
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
                    return tenant_id, "jwt"
            except (jwt.InvalidTokenError, ValueError, TypeError) as e:
                logger.warning(f"Failed to extract tenant ID from JWT token: {e}")
        
        # Method 3: Subdomain detection
        tenant_id = TenantIdentifier.identify_from_subdomain(request)
        if tenant_id:
            logger.debug(f"Tenant ID extracted from subdomain: {tenant_id}")
            return tenant_id, "subdomain"
        
        logger.debug("No tenant ID found in request")
        return None, "none"
    
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
        tenant_id, source = TenantIdentifier.extract_tenant_id(request)
        
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant ID is required. Please provide X-Tenant-ID header, valid JWT token, or subdomain."
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
        Extract tenant identifier from subdomain.
        
        Args:
            request: FastAPI request object
            
        Returns:
            Tenant identifier from subdomain if found
        """
        host = request.headers.get("host", "")
        
        # Remove port if present (e.g., "subdomain.example.com:8000")
        if ":" in host:
            host = host.split(":")[0]
        
        # Split by dots to get domain parts
        domain_parts = host.split(".")
        
        # Need at least 3 parts for a subdomain (subdomain.domain.com)
        if len(domain_parts) < 3:
            return None
        
        # First part is the subdomain
        subdomain = domain_parts[0]
        
        # Filter out common non-tenant subdomains
        skip_subdomains = ["www", "api", "app", "admin", "staging", "dev", "test", "m", "mobile"]
        if subdomain.lower() not in skip_subdomains:
            logger.debug(f"Tenant subdomain detected: {subdomain}")
            return subdomain
        
        return None
    
    @staticmethod
    def identify_from_subdomain(request: Request) -> Optional[UUID]:
        """
        Identify tenant from subdomain in the request host.
        
        This method extracts the subdomain from the request host header
        and attempts to map it to a tenant ID. This is useful for
        subdomain-based multi-tenancy (e.g., tenant1.example.com).
        
        Args:
            request: FastAPI request object
            
        Returns:
            Tenant UUID if found, None otherwise
        """
        
        # Get subdomain using existing method
        subdomain = TenantIdentifier.extract_tenant_from_subdomain(request)
        if not subdomain:
            return None
        
        # Map subdomain to tenant UUID by querying the database
        try:
            from ..models.database import get_db, Tenant, TenantStatusEnum
            from sqlalchemy.orm import Session
            
            # Get database session
            db = next(get_db())
            
            try:
                # Look up tenant by slug (assuming subdomain matches tenant slug)
                tenant = db.query(Tenant).filter(
                    Tenant.slug == subdomain,
                    Tenant.status == TenantStatusEnum.ACTIVE  # Only active tenants
                ).first()
                
                if tenant:
                    logger.debug(f"Found tenant {tenant.id} for subdomain '{subdomain}'")
                    return tenant.id
                else:
                    logger.debug(f"No tenant found for subdomain '{subdomain}'")
                    return None
                    
            finally:
                db.close()
                
        except (ImportError, AttributeError, ValueError) as e:
            logger.exception(f"Error looking up tenant for subdomain '{subdomain}': {e}")
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
        tenant_id, source = TenantIdentifier.extract_tenant_id(request)
        subdomain = TenantIdentifier.extract_tenant_from_subdomain(request)
        
        return {
            "tenant_id": tenant_id,
            "subdomain": subdomain,
            "has_tenant_id": tenant_id is not None,
            "has_subdomain": subdomain is not None,
            "identification_method": source
        }


def get_tenant_id_from_request(request: Request) -> Optional[UUID]:
    """
    Convenience function to get tenant ID from request.
    
    Args:
        request: FastAPI request object
        
    Returns:
        Tenant UUID if found, None otherwise
    """
    tenant_id, _ = TenantIdentifier.extract_tenant_id(request)
    return tenant_id


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
