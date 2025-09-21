/**
 * Authentication and User Management Types
 */
import { TenantEntity } from '../../base/types/common';

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    status: string;
    tenant_id: string;
    last_login?: string;
    created_at: string;
    updated_at: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    settings: Record<string, any>;
    status: string;
    environment: string;
    created_at: string;
    updated_at: string;
  };
}

// User Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  tenant_id: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface UserCreateRequest {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: string;
  tenant_id?: string;
  status?: string;
}

export interface UserUpdateRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  password?: string;
  role?: string;
  status?: string;
}

// Tenant Types
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, any>;
  status: string;
  environment: string;
  created_at: string;
  updated_at: string;
}

export interface TenantCreateRequest {
  name: string;
  slug: string;
  environment: string;
  settings?: Record<string, any>;
}

export interface TenantUpdateRequest {
  name?: string;
  slug?: string;
  settings?: Record<string, any>;
  status?: string;
}

// Permission Types
export interface UserPermissions {
  permissions: string[];
  role: string;
  tenant_id: string;
}

// User Role Types
export type UserRole = 'system_admin' | 'tenant_admin' | 'user' | 'viewer';

export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

// Auth Token Types
export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Tenant Switch Types
export interface TenantSwitchRequest {
  tenant_id: string;
}

export interface TenantSwitchResponse {
  success: boolean;
  message: string;
  new_tenant: Tenant;
}
