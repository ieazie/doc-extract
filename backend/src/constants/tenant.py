"""
Tenant-related constants for the application.

This module centralizes tenant constants to ensure consistency
across the application and make maintenance easier.
"""

from uuid import UUID

# Default tenant UUID used for system administration and fallback scenarios
# This tenant is created in migration 000_create_tenants_table.sql
DEFAULT_TENANT_ID = UUID("00000000-0000-0000-0000-000000000001")

# Default tenant name
DEFAULT_TENANT_NAME = "Default Tenant"

# Default environment for the default tenant
DEFAULT_TENANT_ENVIRONMENT = "development"
