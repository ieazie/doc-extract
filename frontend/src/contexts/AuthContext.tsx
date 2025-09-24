import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { AuthService, TenantService, serviceFactory } from '@/services/api/index';

// Auth Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  tenant_id: string | null;  // Allow null for system admin users
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  settings: Record<string, any>;
  status: string;
  environment: string;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthContextType {
  // State
  user: User | null;
  tenant: Tenant | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  
  // Permissions
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  
  // Role helpers
  isSystemAdmin: () => boolean;
  isTenantAdmin: () => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null); // Stored in sessionStorage for persistence
  const [isLoading, setIsLoading] = useState(true);

  // Helper functions for access token persistence
  const getStoredAccessToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('auth_access_token');
  };

  const setStoredAccessToken = (token: string | null): void => {
    if (typeof window === 'undefined') return;
    if (token) {
      sessionStorage.setItem('auth_access_token', token);
    } else {
      sessionStorage.removeItem('auth_access_token');
    }
  };

  // Simple token refresh function

  const refreshToken = async (): Promise<void> => {
    try {
      const authService = serviceFactory.get<AuthService>('auth');
      const response = await authService.refreshToken();
      
      // Update access token in memory and sessionStorage
      setAccessToken(response.access_token);
      setStoredAccessToken(response.access_token);
      serviceFactory.setAuthToken(response.access_token);
      
      // Update user data if provided
      if (response.user) {
        setUser(response.user);
        localStorage.setItem('auth_user', JSON.stringify(response.user));
      }
      
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearAuthData();
      throw error;
    }
  };


  const clearAuthData = () => {
    setUser(null);
    setTenant(null);
    setAccessToken(null);
    setStoredAccessToken(null);
    serviceFactory.setAuthToken(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_tenant');
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Restore user/tenant data from localStorage and access token from sessionStorage
        const storedUser = localStorage.getItem('auth_user');
        const storedTenant = localStorage.getItem('auth_tenant');
        const storedAccessToken = getStoredAccessToken();

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          const parsedTenant = storedTenant ? JSON.parse(storedTenant) : null;
          
          // If we have a stored access token, use it immediately
          if (storedAccessToken) {
            setUser(parsedUser);
            setTenant(parsedTenant);
            setAccessToken(storedAccessToken);
            serviceFactory.setAuthToken(storedAccessToken);
          } else {
            // No stored access token, try to refresh silently
            const authService = serviceFactory.get<AuthService>('auth');
            const refreshResult = await authService.silentRefreshToken();
            
            if (refreshResult) {
              // Valid refresh token - set user data and access token
              setUser(refreshResult.user || parsedUser);
              setTenant(parsedTenant);
              setAccessToken(refreshResult.access_token);
              setStoredAccessToken(refreshResult.access_token);
              serviceFactory.setAuthToken(refreshResult.access_token);
              
              // Update user data if provided
              if (refreshResult.user) {
                localStorage.setItem('auth_user', JSON.stringify(refreshResult.user));
              }
            } else {
              // No valid refresh token, clear auth data
              console.log('No valid refresh token available during initialization - clearing stored data');
              clearAuthData();
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth logout events from API client
    const handleAuthLogout = () => {
      clearAuthData();
    };

    window.addEventListener('auth:logout', handleAuthLogout);

    // Cleanup event listener
    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
    };
  }, []); // Run once on mount

  // Simple token refresh on 401 errors (handled by API interceptor)

  const logout = async () => {
    try {
      const authService = serviceFactory.get<AuthService>('auth');
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Continue with clearing local data even if logout fails
    } finally {
      clearAuthData();
      // Don't redirect - the _app.tsx will show the login form when user is not authenticated
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      
      const authService = serviceFactory.get<AuthService>('auth');
      const response = await authService.login(credentials);
      
      // Set the auth token in memory and sessionStorage
      setAccessToken(response.access_token);
      setStoredAccessToken(response.access_token);
      serviceFactory.setAuthToken(response.access_token);
      
      // Store user data
      setUser(response.user);
      
      // Get tenant information (skip for system admin users)
      let tenantData = null;
      if (response.user.role !== 'system_admin' && response.user.tenant_id) {
        try {
          const authService = serviceFactory.get<AuthService>('auth');
          tenantData = await authService.getCurrentTenant();
          setTenant(tenantData);
        } catch (error: any) {
          console.error('Failed to get tenant data after login:', error);
          // Don't throw here - login was successful, tenant data can be fetched later
          setTenant(null);
        }
      } else {
        // System admin users don't have a tenant
        setTenant(null);
      }
      
      // Store user and tenant data in localStorage (NO access tokens)
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      if (tenantData) {
        localStorage.setItem('auth_tenant', JSON.stringify(tenantData));
      }
      
      // Redirect to dashboard after successful login using Next.js router
      await router.push('/');
      
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };


  const switchTenant = async (tenantId: string) => {
    try {
      const authService = serviceFactory.get<AuthService>('auth');
      await authService.switchTenant(tenantId);
      
      // Refresh user and tenant data
      const [userData, tenantData] = await Promise.all([
        authService.getCurrentUser(),
        authService.getCurrentTenant()
      ]);
      
      setUser(userData);
      setTenant(tenantData);
      
      // Update localStorage
      localStorage.setItem('auth_user', JSON.stringify(userData));
      localStorage.setItem('auth_tenant', JSON.stringify(tenantData));
      
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Get user permissions based on role
    const permissions = {
      // New system admin role (platform-wide access)
      system_admin: [
        // Tenant Management (cross-tenant)
        'tenants:create', 'tenants:read_all', 'tenants:update', 'tenants:delete',
        'tenants:suspend', 'tenants:activate', 'tenants:configure',
        
        // System Configuration
        'system:config', 'system:maintenance', 'system:backup',
        
        // Global Analytics
        'analytics:global', 'analytics:cross_tenant', 'analytics:system',
        
        // Cross-tenant User Management
        'users:create_global', 'users:read_all', 'users:assign_tenants',
        'users:write', 'users:delete',
        
        // All content permissions (cross-tenant)
        'documents:read', 'documents:write', 'documents:delete',
        'templates:read', 'templates:write', 'templates:delete',
        'extractions:read', 'extractions:write', 'extractions:delete',
        
        // Job Management (cross-tenant)
        'jobs:read', 'jobs:write', 'jobs:delete', 'jobs:execute',
        
        // API and Configuration
        'api-keys:read', 'api-keys:write', 'api-keys:delete',
        'analytics:read'
      ],
      // New tenant admin role (tenant-scoped access)
      tenant_admin: [
        // Tenant-scoped User Management
        'users:read', 'users:write', 'users:delete', 'users:invite',
        
        // Tenant Configuration
        'tenant:config_llm', 'tenant:config_limits', 'tenant:config_settings',
        
        // Tenant Analytics
        'analytics:tenant', 'analytics:usage', 'analytics:performance',
        'analytics:read',
        
        // Content Management (within tenant)
        'documents:read', 'documents:write', 'documents:delete',
        'templates:read', 'templates:write', 'templates:delete',
        'extractions:read', 'extractions:write', 'extractions:delete',
        
        // Job Management
        'jobs:read', 'jobs:write', 'jobs:delete', 'jobs:execute',
        
        // API Management
        'api-keys:read', 'api-keys:write', 'api-keys:delete'
      ],
      user: [
        'documents:read', 'documents:write', 'documents:delete',
        'templates:read', 'templates:write', 'templates:delete',
        'extractions:read', 'extractions:write', 'extractions:delete',
        'jobs:read', 'jobs:write', 'jobs:execute',
        'analytics:read'
      ],
      viewer: [
        'documents:read',
        'templates:read',
        'extractions:read',
        'jobs:read',
        'analytics:read'
      ]
    };
    
    const userPermissions = permissions[user.role as keyof typeof permissions] || [];
    return userPermissions.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const isSystemAdmin = (): boolean => {
    return user?.role === 'system_admin';
  };

  const isTenantAdmin = (): boolean => {
    return user?.role === 'tenant_admin';
  };

  const isAdmin = (): boolean => {
    return user?.role === 'system_admin' || user?.role === 'tenant_admin';
  };

  const isAuthenticated = !!user && !!accessToken;
  

  const value: AuthContextType = {
    user,
    tenant,
    accessToken,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshToken,
    switchTenant,
    hasPermission,
    hasRole,
    isSystemAdmin,
    isTenantAdmin,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
