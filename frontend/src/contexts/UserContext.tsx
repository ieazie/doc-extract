import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'admin' | 'user' | 'viewer';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

// Define permissions for each role
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'documents:read',
    'documents:write',
    'documents:delete',
    'templates:read',
    'templates:write',
    'templates:delete',
    'extractions:read',
    'extractions:write',
    'extractions:delete',
    'users:read',
    'users:write',
    'users:delete',
    'api-keys:read',
    'api-keys:write',
    'api-keys:delete',
    'analytics:read',
    'settings:read',
    'settings:write',
  ],
  user: [
    'documents:read',
    'documents:write',
    'templates:read',
    'templates:write',
    'extractions:read',
    'extractions:write',
    'analytics:read',
  ],
  viewer: [
    'documents:read',
    'templates:read',
    'extractions:read',
    'analytics:read',
  ],
};

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        // For now, use a mock user. In Phase 7.2, this will be replaced with API call
        const mockUser: User = {
          id: 'user-123',
          email: 'admin@docextract.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          isActive: true,
          lastLoginAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        setCurrentUser(mockUser);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    const userPermissions = ROLE_PERMISSIONS[currentUser.role] || [];
    return userPermissions.includes(permission);
  };

  const hasRole = (role: UserRole): boolean => {
    if (!currentUser) return false;
    return currentUser.role === role;
  };

  return (
    <UserContext.Provider value={{ 
      currentUser, 
      setCurrentUser, 
      isLoading, 
      hasPermission, 
      hasRole 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
