/**
 * Authentication and User Management Types
 */
// Use the canonical Tenant types
import type {
  Tenant,
  TenantCreateRequest,
  TenantUpdateRequest,
} from '../../tenants/types/tenants';

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
  tenant: Tenant;
}

// User Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  tenant_id: string | null;
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

// Tenant types are imported from tenants/types/tenants

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
