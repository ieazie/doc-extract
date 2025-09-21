/**
 * Authentication and User Management Service
 * Handles all authentication, user management, and tenant operations
 */
import { AxiosInstance } from 'axios';
import { BaseApiClient } from '../base/BaseApiClient';
import {
  LoginCredentials,
  LoginResponse,
  User,
  UserCreateRequest,
  UserUpdateRequest,
  Tenant,
  TenantCreateRequest,
  TenantUpdateRequest,
  UserPermissions,
  TenantSwitchRequest,
  TenantSwitchResponse
} from './types/auth';

export class AuthService extends BaseApiClient {
  constructor(client: AxiosInstance) {
    super(client);
  }

  // Authentication Methods
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return this.post<LoginResponse>('/api/auth/login', credentials);
  }

  async getCurrentUser(): Promise<User> {
    return this.get<User>('/api/auth/me');
  }

  async getCurrentTenant(): Promise<Tenant> {
    return this.get<Tenant>('/api/auth/tenant');
  }

  async switchTenant(tenantId: string): Promise<void> {
    await this.post<void>('/api/auth/switch-tenant', { tenant_id: tenantId });
  }

  async getUserPermissions(): Promise<UserPermissions> {
    return this.get<UserPermissions>('/api/auth/permissions');
  }

  // User Management Methods
  async getUsers(): Promise<User[]> {
    return this.get<User[]>('/api/auth/users');
  }

  async updateUser(userId: string, userData: UserUpdateRequest): Promise<User> {
    return this.put<User>(`/api/auth/users/${userId}`, userData);
  }

  async createUser(userData: UserCreateRequest): Promise<User> {
    return this.post<User>('/api/auth/register', userData);
  }

  // Additional Auth Methods (if needed)
  async logout(): Promise<void> {
    await this.post<void>('/api/auth/logout');
  }

  async refreshToken(): Promise<LoginResponse> {
    return this.post<LoginResponse>('/api/auth/refresh');
  }

  async resetPassword(email: string): Promise<{ message: string }> {
    return this.post<{ message: string }>('/api/auth/reset-password', { email });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.post<{ message: string }>('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
  }

  // Tenant Management Methods (if needed)
  async createTenant(tenantData: TenantCreateRequest): Promise<Tenant> {
    return this.post<Tenant>('/api/auth/tenants', tenantData);
  }

  async updateTenant(tenantId: string, tenantData: TenantUpdateRequest): Promise<Tenant> {
    return this.put<Tenant>(`/api/auth/tenants/${tenantId}`, tenantData);
  }

  async getUserTenants(): Promise<Tenant[]> {
    return this.get<Tenant[]>('/api/auth/tenants');
  }
}
