import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DEFAULT_TENANT_ID, DEFAULT_TENANT_NAME } from '../constants/tenant';

export interface Tenant {
  id: string;
  name: string;
  logo?: string;
  settings: {
    theme?: {
      primaryColor?: string;
      logo?: string;
    };
    features?: {
      analytics?: boolean;
      apiKeys?: boolean;
      userManagement?: boolean;
    };
  };
  environment: 'development' | 'staging' | 'production';
  createdAt: string;
  updatedAt: string;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  setCurrentTenant: (tenant: Tenant | null) => void;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load tenant data on mount
  useEffect(() => {
    const loadTenant = async () => {
      try {
        // For now, use a mock tenant. In Phase 7.1, this will be replaced with API call
        const mockTenant: Tenant = {
          id: DEFAULT_TENANT_ID,
          name: DEFAULT_TENANT_NAME,
          logo: undefined,
          settings: {
            theme: {
              primaryColor: '#2563eb',
            },
            features: {
              analytics: true,
              apiKeys: true,
              userManagement: true,
            },
          },
          environment: 'development',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        setCurrentTenant(mockTenant);
      } catch (error) {
        console.error('Failed to load tenant:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTenant();
  }, []);

  return (
    <TenantContext.Provider value={{ currentTenant, setCurrentTenant, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
