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
  UserPermissions,
  TenantSwitchRequest,
  TenantSwitchResponse
} from './types/auth';
import type {
  ApiTenant,
  TenantCreateRequest,
  TenantUpdateRequest
} from '../tenants/types/tenants';

export class AuthService extends BaseApiClient {
  constructor(client: AxiosInstance) {
    super(client);
  }

  // Authentication Methods
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return this.post<LoginResponse>('/api/auth/login', credentials);
  }

  async refreshToken(): Promise<LoginResponse> {
    return this.post<LoginResponse>('/api/auth/refresh');
  }

  async logout(): Promise<void> {
    await this.post<void>('/api/auth/logout');
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      return await this.get<User>('/api/auth/me');
    } catch (error: any) {
      // Handle authentication errors gracefully
      if (error?.name === 'AuthenticationError' || error?.status === 401 || error?.status === 403) {
        // Auth error was handled by global interceptor, return null
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  }

  async getCurrentTenant(): Promise<ApiTenant | null> {
    try {
      return await this.get<ApiTenant>('/api/auth/tenant');
    } catch (error: any) {
      // Handle authentication errors gracefully
      if (error?.name === 'AuthenticationError' || error?.status === 401 || error?.status === 403) {
        // Auth error was handled by global interceptor, return null
        return null;
      }
      // Re-throw other errors
      throw error;
    }
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
  async createTenant(tenantData: TenantCreateRequest): Promise<ApiTenant> {
    return this.post<ApiTenant>('/api/auth/tenants', tenantData);
  }

  async updateTenant(tenantId: string, tenantData: TenantUpdateRequest): Promise<ApiTenant> {
    return this.put<ApiTenant>(`/api/auth/tenants/${tenantId}`, tenantData);
  }

  async getUserTenants(): Promise<ApiTenant[]> {
    return this.get<ApiTenant[]>('/api/auth/tenants');
  }
}
