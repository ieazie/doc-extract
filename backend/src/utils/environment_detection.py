"""
Environment Detection Utility

This utility provides environment detection capabilities for tenant-specific
configuration management.
"""

from typing import Optional
from fastapi import Request
import logging

logger = logging.getLogger(__name__)


class EnvironmentDetector:
    """Utility for detecting the current environment context"""
    
    @staticmethod
    def detect_environment(request: Request, default: str = "development") -> str:
        """
        Detect environment from request headers, host, or other indicators.
        
        Priority order:
        1. X-Environment header (for API clients)
        2. Host-based detection (for web applications)
        3. Default environment
        
        Args:
            request: FastAPI request object
            default: Default environment if detection fails
            
        Returns:
            Environment string: 'development', 'staging', or 'production'
        """
        
        # Method 1: Environment header (for API clients)
        env_header = request.headers.get("X-Environment")
        if env_header and env_header.lower() in ["development", "staging", "production"]:
            logger.debug(f"Environment detected from header: {env_header}")
            return env_header.lower()
        
        # Method 2: Host-based detection
        host = request.headers.get("host", "").lower()
        if host:
            if "localhost" in host or "127.0.0.1" in host or ":3000" in host or ":8000" in host:
                logger.debug("Environment detected as development from host")
                return "development"
            elif "staging" in host or "stg" in host:
                logger.debug("Environment detected as staging from host")
                return "staging"
            elif "app" in host or "www" in host or "prod" in host:
                logger.debug("Environment detected as production from host")
                return "production"
        
        # Method 3: Default environment
        logger.debug(f"Using default environment: {default}")
        return default
    
    @staticmethod
    def get_environment_from_tenant_config(tenant_id: str, default: str = "development") -> str:
        """
        Get environment from tenant configuration (future enhancement).
        
        Args:
            tenant_id: Tenant identifier
            default: Default environment if not configured
            
        Returns:
            Environment string
        """
        # For now, return default
        # In the future, this could query tenant configuration
        return default
    
    @staticmethod
    def is_development_environment(environment: str) -> bool:
        """Check if environment is development"""
        return environment.lower() == "development"
    
    @staticmethod
    def is_staging_environment(environment: str) -> bool:
        """Check if environment is staging"""
        return environment.lower() == "staging"
    
    @staticmethod
    def is_production_environment(environment: str) -> bool:
        """Check if environment is production"""
        return environment.lower() == "production"
    
    @staticmethod
    def get_environment_config(environment: str) -> dict:
        """
        Get environment-specific configuration defaults.
        
        Args:
            environment: Environment string
            
        Returns:
            Dictionary of environment-specific configuration
        """
        
        configs = {
            "development": {
                "debug": True,
                "log_level": "DEBUG",
                "cors_origins": [
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                    "http://frontend:3000"
                ],
                "cookie_secure": False,
                "cookie_samesite": "lax",
                "ssl_required": False,
                "rate_limiting": False,
                "csrf_protection": False,
            },
            "staging": {
                "debug": False,
                "log_level": "INFO",
                "cors_origins": [
                    "https://staging.example.com",
                    "https://staging-frontend.example.com"
                ],
                "cookie_secure": True,
                "cookie_samesite": "strict",
                "ssl_required": True,
                "rate_limiting": True,
                "csrf_protection": True,
            },
            "production": {
                "debug": False,
                "log_level": "WARNING",
                "cors_origins": [
                    "https://app.example.com",
                    "https://www.example.com"
                ],
                "cookie_secure": True,
                "cookie_samesite": "strict",
                "ssl_required": True,
                "rate_limiting": True,
                "csrf_protection": True,
                "content_security_policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
            }
        }
        
        return configs.get(environment.lower(), configs["development"])


def get_environment_from_request(request: Request) -> str:
    """
    Convenience function to get environment from request.
    
    Args:
        request: FastAPI request object
        
    Returns:
        Environment string
    """
    return EnvironmentDetector.detect_environment(request)


def is_secure_environment(environment: str) -> bool:
    """
    Check if environment requires secure settings.
    
    Args:
        environment: Environment string
        
    Returns:
        True if environment requires secure settings
    """
    return EnvironmentDetector.is_production_environment(environment) or EnvironmentDetector.is_staging_environment(environment)
