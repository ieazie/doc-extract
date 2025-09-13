import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/services/api';

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
  tokens: AuthTokens | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedTokens = localStorage.getItem('auth_tokens');
        const storedUser = localStorage.getItem('auth_user');
        const storedTenant = localStorage.getItem('auth_tenant');

        if (storedTokens && storedUser) {
          const parsedTokens = JSON.parse(storedTokens);
          const parsedUser = JSON.parse(storedUser);
          
          // Parse tenant data if it exists (system admin users might not have tenant data)
          let parsedTenant = null;
          if (storedTenant) {
            parsedTenant = JSON.parse(storedTenant);
          }

          // Set the token in the API client
          apiClient.setAuthToken(parsedTokens.access_token);
          
          // Set the stored data immediately
          setUser(parsedUser);
          setTenant(parsedTenant);
          setTokens(parsedTokens);
          
          // Verify token in the background (non-blocking)
          try {
            const currentUser = await apiClient.getCurrentUser();
            
            // Only fetch tenant data for non-system-admin users
            let currentTenant = null;
            if (currentUser.role !== 'system_admin' && currentUser.tenant_id) {
              try {
                currentTenant = await apiClient.getCurrentTenant();
              } catch (tenantError: any) {
                console.warn('Failed to fetch tenant data during verification:', tenantError.message);
                // Don't fail the entire verification for tenant fetch errors
              }
            }
            
            // Update with fresh data if verification succeeds
            setUser(currentUser);
            setTenant(currentTenant);
          } catch (error: any) {
            // Only clear data if it's an authentication error (401/403)
            if (error?.response?.status === 401 || error?.response?.status === 403) {
              console.warn('Stored token is invalid, clearing auth data');
              clearAuthData();
            } else {
              console.warn('Token verification failed, but keeping stored data:', error.message);
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

    // Listen for auth logout events from API client
    const handleAuthLogout = () => {
      console.log('Auth logout event received, clearing auth data');
      clearAuthData();
    };

    window.addEventListener('auth:logout', handleAuthLogout);

    initializeAuth();

    // Cleanup event listener
    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
    };
  }, []);

  const clearAuthData = () => {
    console.log('Clearing auth data');
    setUser(null);
    setTenant(null);
    setTokens(null);
    apiClient.clearAuthToken();
    localStorage.removeItem('auth_tokens');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_tenant');
  };

  const logout = () => {
    clearAuthData();
    // Don't redirect - the _app.tsx will show the login form when user is not authenticated
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      
      const response = await apiClient.login(credentials);
      
      // Set the auth token in the API client immediately
      apiClient.setAuthToken(response.access_token);
      console.log('Token set in API client:', response.access_token.substring(0, 20) + '...');
      
      // Store tokens and user data
      setTokens({
        access_token: response.access_token,
        token_type: response.token_type,
        expires_in: response.expires_in
      });
      setUser(response.user);
      
      // Get tenant information (skip for system admin users)
      let tenantData = null;
      if (response.user.role !== 'system_admin' && response.user.tenant_id) {
        try {
          tenantData = await apiClient.getCurrentTenant();
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
      
      // Store in localStorage
      localStorage.setItem('auth_tokens', JSON.stringify({
        access_token: response.access_token,
        token_type: response.token_type,
        expires_in: response.expires_in
      }));
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      if (tenantData) {
        localStorage.setItem('auth_tenant', JSON.stringify(tenantData));
      }
      
      // Redirect to dashboard after successful login
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async () => {
    // For now, we'll just re-login if the token expires
    // In a production app, you'd implement proper token refresh
    if (user) {
      throw new Error('Token expired. Please log in again.');
    }
  };

  const switchTenant = async (tenantId: string) => {
    try {
      await apiClient.switchTenant(tenantId);
      
      // Refresh user and tenant data
      const [userData, tenantData] = await Promise.all([
        apiClient.getCurrentUser(),
        apiClient.getCurrentTenant()
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
        
        // API Management
        'api-keys:read', 'api-keys:write', 'api-keys:delete'
      ],
      user: [
        'documents:read', 'documents:write', 'documents:delete',
        'templates:read', 'templates:write', 'templates:delete',
        'extractions:read', 'extractions:write', 'extractions:delete',
        'analytics:read'
      ],
      viewer: [
        'documents:read',
        'templates:read',
        'extractions:read',
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

  const isAuthenticated = !!user && !!tokens;
  
  // Debug authentication state changes
  React.useEffect(() => {
    console.log('Auth state changed:', { 
      hasUser: !!user, 
      hasTokens: !!tokens, 
      isAuthenticated,
      userEmail: user?.email 
    });
  }, [user, tokens, isAuthenticated]);

  const value: AuthContextType = {
    user,
    tenant,
    tokens,
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
