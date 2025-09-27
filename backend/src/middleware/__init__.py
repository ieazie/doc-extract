"""
Middleware package for tenant-aware functionality.

This package contains middleware components that provide tenant-aware
functionality across the application, such as CORS configuration,
authentication, and request processing.

Available Middleware:
- TenantAwareCORSMiddleware: Dynamic CORS configuration based on tenant
"""

from .cors import TenantAwareCORSMiddleware

__all__ = [
    "TenantAwareCORSMiddleware",
]
