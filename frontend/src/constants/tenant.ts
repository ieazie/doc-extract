/**
 * Tenant-related constants for the frontend application.
 * 
 * This module centralizes tenant constants to ensure consistency
 * across the frontend application and make maintenance easier.
 */

// Default tenant UUID used for system administration and fallback scenarios
// This tenant is created in migration 000_create_tenants_table.sql
export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Default tenant name
export const DEFAULT_TENANT_NAME = 'DocExtract Demo';

// Default environment for the default tenant
export const DEFAULT_TENANT_ENVIRONMENT = 'development';
