"""
Tenant Utility Service
"""
import re
import logging
from typing import Optional
from sqlalchemy.orm import Session
from uuid import UUID

from ..models.database import Tenant

logger = logging.getLogger(__name__)

class TenantUtils:
    """Utility functions for tenant operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_slug(self, name: str) -> str:
        """Generate a URL-safe slug from tenant name"""
        # Convert to lowercase and replace spaces/special chars with hyphens
        slug = re.sub(r'[^a-z0-9\s-]', '', name.lower())
        slug = re.sub(r'\s+', '-', slug)
        slug = re.sub(r'-+', '-', slug)
        slug = slug.strip('-')
        
        # Ensure minimum length
        if len(slug) < 3:
            slug = f"tenant-{slug}"
        
        return slug
    
    def get_unique_slug(self, name: str, exclude_tenant_id: Optional[UUID] = None) -> str:
        """Generate a unique slug for a tenant"""
        base_slug = self.generate_slug(name)
        slug = base_slug
        counter = 1
        
        while True:
            # Check if slug exists (excluding current tenant if updating)
            query = self.db.query(Tenant).filter(Tenant.slug == slug)
            if exclude_tenant_id:
                query = query.filter(Tenant.id != exclude_tenant_id)
            
            if not query.first():
                return slug
            
            # Slug exists, try with counter
            slug = f"{base_slug}-{counter}"
            counter += 1
    
    def get_tenant_by_slug(self, slug: str) -> Optional[Tenant]:
        """Get tenant by slug"""
        return self.db.query(Tenant).filter(Tenant.slug == slug).first()
    
    def get_tenant_by_id(self, tenant_id: UUID) -> Optional[Tenant]:
        """Get tenant by ID"""
        return self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
    
    def get_tenant_slug(self, tenant_id: UUID) -> Optional[str]:
        """Get tenant slug by ID"""
        tenant = self.get_tenant_by_id(tenant_id)
        return tenant.slug if tenant else None
    
    def format_resource_name(self, tenant_slug: str, environment: str, resource_type: str, suffix: str = "") -> str:
        """Format resource names using tenant slug and environment"""
        base_name = f"{tenant_slug}-{environment}"
        
        if resource_type == "s3_bucket":
            return f"{base_name}-{suffix}" if suffix else f"{base_name}-documents"
        elif resource_type == "redis_key":
            return f"{base_name}:{suffix}" if suffix else f"{base_name}:*"
        elif resource_type == "queue_name":
            return f"{base_name}-{suffix}" if suffix else f"{base_name}-queue"
        elif resource_type == "cache_db":
            # For Redis database numbers, we'll use a hash of the slug
            import hashlib
            hash_value = int(hashlib.md5(tenant_slug.encode()).hexdigest(), 16)
            return str(hash_value % 16)  # 0-15 for different environments
        else:
            return f"{base_name}-{suffix}" if suffix else base_name
