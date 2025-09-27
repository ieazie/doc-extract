#!/usr/bin/env python3
"""
Migration Script: Create Default Tenant Configurations

This script creates default authentication, CORS, and security configurations
for existing tenants that don't have them yet. This is part of Phase 6 migration.

Usage:
    python create_default_tenant_configs.py [--environment=development|staging|production]
"""

import os
import sys
import secrets
import logging
from typing import List, Optional
from uuid import UUID

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.models.database import get_db, Tenant, TenantConfiguration
from src.services.tenant_config_service import TenantConfigService
from src.schemas.tenant_configuration import AuthenticationConfig, CORSConfig, SecurityConfig
from sqlalchemy.orm import Session

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def generate_secure_key(length: int = 32) -> str:
    """Generate a cryptographically secure random key"""
    return secrets.token_urlsafe(length)


def create_default_auth_config(environment: str) -> AuthenticationConfig:
    """Create default authentication configuration based on environment"""
    
    if environment == "production":
        return AuthenticationConfig(
            jwt_secret_key=generate_secure_key(64),  # Longer key for production
            access_token_expire_minutes=15,  # Shorter expiry for production
            refresh_token_expire_days=7,
            refresh_cookie_httponly=True,
            refresh_cookie_secure=True,  # HTTPS only in production
            refresh_cookie_samesite="strict",  # Strict in production
            refresh_cookie_path="/api/auth/refresh",
            max_login_attempts=5,
            lockout_duration_minutes=15,
            password_min_length=12,  # Stronger passwords in production
            require_2fa=False,  # Can be enabled per tenant
        )
    elif environment == "staging":
        return AuthenticationConfig(
            jwt_secret_key=generate_secure_key(48),
            access_token_expire_minutes=30,
            refresh_token_expire_days=7,
            refresh_cookie_httponly=True,
            refresh_cookie_secure=True,
            refresh_cookie_samesite="lax",  # More permissive for staging
            refresh_cookie_path="/api/auth/refresh",
            max_login_attempts=5,
            lockout_duration_minutes=10,
            password_min_length=10,
            require_2fa=False,
        )
    else:  # development
        return AuthenticationConfig(
            jwt_secret_key=generate_secure_key(32),
            access_token_expire_minutes=60,  # Longer for development convenience
            refresh_token_expire_days=30,  # Longer for development
            refresh_cookie_httponly=True,
            refresh_cookie_secure=False,  # HTTP allowed in development
            refresh_cookie_samesite="lax",  # More permissive for development
            refresh_cookie_path="/api/auth/refresh",
            max_login_attempts=10,  # More lenient for development
            lockout_duration_minutes=5,
            password_min_length=8,
            require_2fa=False,
        )


def create_default_cors_config(environment: str) -> CORSConfig:
    """Create default CORS configuration based on environment"""
    
    if environment == "production":
        return CORSConfig(
            allowed_origins=[],  # Should be explicitly configured per tenant
            allow_credentials=True,
            allowed_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            allowed_headers=["Content-Type", "Authorization", "X-Tenant-ID"],
            exposed_headers=[],
            max_age=3600,
        )
    elif environment == "staging":
        return CORSConfig(
            allowed_origins=["https://staging.example.com"],  # Example staging domain
            allow_credentials=True,
            allowed_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            allowed_headers=["Content-Type", "Authorization", "X-Tenant-ID"],
            exposed_headers=[],
            max_age=3600,
        )
    else:  # development
        return CORSConfig(
            allowed_origins=["http://localhost:3000", "http://localhost:3001", "*"],  # Permissive for development
            allow_credentials=True,
            allowed_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            allowed_headers=["Content-Type", "Authorization", "X-Tenant-ID"],
            exposed_headers=[],
            max_age=3600,
        )


def create_default_security_config(environment: str) -> SecurityConfig:
    """Create default security configuration based on environment"""
    
    if environment == "production":
        return SecurityConfig(
            csrf_protection_enabled=True,
            csrf_token_header="X-CSRF-Token",
            rate_limiting_enabled=True,
            rate_limit_requests_per_minute=60,
            rate_limit_burst_size=100,
            encryption_key=generate_secure_key(64),  # Longer key for production
            security_headers_enabled=True,
            content_security_policy="default-src 'self'; script-src 'self' 'unsafe-inline'",
            strict_transport_security=True,
            x_frame_options="DENY",
            x_content_type_options=True,
            referrer_policy="strict-origin-when-cross-origin",
            compromise_detection_enabled=True,
            compromise_detection_threshold=3,
            rapid_token_threshold=10,
            auto_revoke_on_compromise=True,  # Auto-revoke in production
        )
    elif environment == "staging":
        return SecurityConfig(
            csrf_protection_enabled=True,
            csrf_token_header="X-CSRF-Token",
            rate_limiting_enabled=True,
            rate_limit_requests_per_minute=120,  # More lenient for staging
            rate_limit_burst_size=200,
            encryption_key=generate_secure_key(48),
            security_headers_enabled=True,
            content_security_policy="default-src 'self'; script-src 'self' 'unsafe-inline'",
            strict_transport_security=True,
            x_frame_options="SAMEORIGIN",
            x_content_type_options=True,
            referrer_policy="strict-origin-when-cross-origin",
            compromise_detection_enabled=True,
            compromise_detection_threshold=4,  # Less aggressive for staging
            rapid_token_threshold=15,
            auto_revoke_on_compromise=False,  # Manual review in staging
        )
    else:  # development
        return SecurityConfig(
            csrf_protection_enabled=False,  # Disabled for development convenience
            csrf_token_header="X-CSRF-Token",
            rate_limiting_enabled=False,  # Disabled for development
            rate_limit_requests_per_minute=1000,  # High limit for development
            rate_limit_burst_size=1000,
            encryption_key=generate_secure_key(32),
            security_headers_enabled=False,  # Disabled for development
            content_security_policy=None,
            strict_transport_security=False,
            x_frame_options="SAMEORIGIN",
            x_content_type_options=True,
            referrer_policy="no-referrer-when-downgrade",
            compromise_detection_enabled=False,  # Disabled for development
            compromise_detection_threshold=5,
            rapid_token_threshold=20,
            auto_revoke_on_compromise=False,
        )


def get_existing_tenants(db: Session) -> List[Tenant]:
    """Get all existing tenants from the database"""
    return db.query(Tenant).filter(Tenant.status == "active").all()


def tenant_has_config(db: Session, tenant_id: UUID, config_type: str, environment: str) -> bool:
    """Check if a tenant already has a specific configuration type"""
    existing = db.query(TenantConfiguration).filter(
        TenantConfiguration.tenant_id == tenant_id,
        TenantConfiguration.config_type == config_type,
        TenantConfiguration.environment == environment
    ).first()
    return existing is not None


def create_tenant_configurations(environment: str = "development") -> None:
    """Create default configurations for all existing tenants"""
    
    logger.info(f"Starting tenant configuration migration for environment: {environment}")
    
    db = next(get_db())
    try:
        config_service = TenantConfigService(db)
        tenants = get_existing_tenants(db)
        
        logger.info(f"Found {len(tenants)} active tenants")
        
        for tenant in tenants:
            logger.info(f"Processing tenant: {tenant.name} (ID: {tenant.id})")
            
            # Create auth configuration if it doesn't exist
            if not tenant_has_config(db, tenant.id, "auth", environment):
                auth_config = create_default_auth_config(environment)
                config_service.create_or_update_config(
                    tenant.id, "auth", auth_config.model_dump(), True, environment
                )
                logger.info(f"  ✅ Created auth configuration")
            else:
                logger.info(f"  ⏭️  Auth configuration already exists")
            
            # Create CORS configuration if it doesn't exist
            if not tenant_has_config(db, tenant.id, "cors", environment):
                cors_config = create_default_cors_config(environment)
                config_service.create_or_update_config(
                    tenant.id, "cors", cors_config.model_dump(), True, environment
                )
                logger.info(f"  ✅ Created CORS configuration")
            else:
                logger.info(f"  ⏭️  CORS configuration already exists")
            
            # Create security configuration if it doesn't exist
            if not tenant_has_config(db, tenant.id, "security", environment):
                security_config = create_default_security_config(environment)
                config_service.create_or_update_config(
                    tenant.id, "security", security_config.model_dump(), True, environment
                )
                logger.info(f"  ✅ Created security configuration")
            else:
                logger.info(f"  ⏭️  Security configuration already exists")
        
        logger.info(f"✅ Migration completed for {len(tenants)} tenants in {environment} environment")
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        raise
    finally:
        db.close()


def main():
    """Main function to handle command line arguments and run migration"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Create default tenant configurations")
    parser.add_argument(
        "--environment", 
        choices=["development", "staging", "production"],
        default="development",
        help="Environment to create configurations for"
    )
    parser.add_argument(
        "--all-environments",
        action="store_true",
        help="Create configurations for all environments"
    )
    
    args = parser.parse_args()
    
    if args.all_environments:
        environments = ["development", "staging", "production"]
        logger.info("Creating configurations for all environments")
    else:
        environments = [args.environment]
    
    for env in environments:
        try:
            create_tenant_configurations(env)
        except Exception as e:
            logger.error(f"Failed to create configurations for {env}: {e}")
            sys.exit(1)
    
    logger.info("🎉 All tenant configurations created successfully!")


if __name__ == "__main__":
    main()
