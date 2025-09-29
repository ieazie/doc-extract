import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Bell, Globe, Shield, ChevronDown, Users, Settings, ExternalLink, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthService, TenantService, serviceFactory } from '@/services/api/index';
import { useErrorState, useErrorActions } from '@/stores/globalStore';

const HeaderContainer = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: #1a1a1a;
  border-bottom: 1px solid #333;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  z-index: ${props => props.theme.zIndex.fixed};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Separator = styled.div`
  width: 1px;
  height: 24px;
  background: #333;
  margin: 0 0.5rem;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: white;
  font-weight: ${props => props.theme.typography.weights.bold};
  font-size: ${props => props.theme.typography.sizes.lg};
  
  svg {
    width: 24px;
    height: 24px;
    color: white;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: #9ca3af;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
`;

const NotificationButton = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: #9ca3af;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  border: 2px solid #1a1a1a;
`;

const UserAvatar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #007AFF;
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #0056CC;
  }
`;

const UserDropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: ${props => props.theme.zIndex.dropdown};
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.$isOpen ? 'translateY(0)' : 'translateY(-8px)'};
  transition: all 0.2s ease;
  margin-top: 4px;
  overflow: hidden;
  min-width: 280px;
`;

const UserDropdownHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const UserAvatarLarge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #007AFF;
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 1rem;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const UserName = styled.div`
  font-weight: ${props => props.theme.typography.weights.medium};
  color: #1f2937;
  font-size: 0.875rem;
`;

const UserEmail = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.125rem;
`;


// Tenant Switcher Components
const TenantSwitcher = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TenantButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  min-width: 180px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const TenantInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
`;

const TenantName = styled.span`
  font-weight: ${props => props.theme.typography.weights.medium};
  color: white;
`;

const TenantEnvironment = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
`;

const EnvironmentBadge = styled.span<{ $environment: string }>`
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.625rem;
  font-weight: ${props => props.theme.typography.weights.medium};
  text-transform: uppercase;
  color: white;
  
  ${props => {
    switch (props.$environment?.toLowerCase()) {
      case 'development':
        return `background: #ff9500;`;
      case 'staging':
        return `background: #007AFF;`;
      case 'production':
        return `background: #34C759;`;
      default:
        return `background: #8E8E93;`;
    }
  }}
`;

const TenantDropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: ${props => props.theme.zIndex.dropdown};
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.$isOpen ? 'translateY(0)' : 'translateY(-8px)'};
  transition: all 0.2s ease;
  margin-top: 4px;
  overflow: hidden;
  min-width: 280px;
`;

const DropdownItem = styled.button<{ $isActive?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: none;
  background: ${props => props.$isActive ? '#EBF4FF' : 'transparent'};
  color: ${props => props.$isActive ? '#007AFF' : '#1f2937'};
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  text-align: left;
  
  &:hover {
    background: #f3f4f6;
  }
  
  &:first-child {
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
  }
  
  &:last-child {
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
  }
`;

const DropdownSeparator = styled.div`
  height: 1px;
  background: ${props => props.theme.colors.border};
  margin: 0.25rem 0;
`;

const DropdownItemText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
`;

const DropdownItemName = styled.span`
  font-weight: ${props => props.theme.typography.weights.medium};
`;

const DropdownItemEnv = styled.span`
  font-size: 0.75rem;
  color: #6b7280;
`;

const DropdownItemIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: #6b7280;
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid ${props => props.theme.colors.border};
  border-top: 2px solid ${props => props.theme.colors.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

interface PageHeaderProps {
  className?: string;
}

interface Tenant {
  id: string;
  name: string;
  environment?: string;
  status: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ className }) => {
  const { user, tenant, switchTenant, hasPermission, logout } = useAuth();
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // Global error handling
  const errorState = useErrorState();
  const { setError, clearError } = useErrorActions();

  const getUserInitials = () => {
    if (!user) return 'U';
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  };

  // Load available tenants when component mounts or user changes
  useEffect(() => {
    const loadTenants = async () => {
      if (!user) return;
      
      console.log('🔄 PageHeader: Loading tenants for user role:', user.role);
      setIsLoadingTenants(true);
      clearError(); // Clear any existing errors
      
      try {
        let tenants;
          if (user.role === 'system_admin') {
            // System admin can see all tenants
            console.log('🔄 PageHeader: Loading all tenants for system admin');
            const tenantService = serviceFactory.get<TenantService>('tenants');
            tenants = await tenantService.getTenants();
          } else {
            // Regular users see only their assigned tenants
            console.log('🔄 PageHeader: Loading user tenants for role:', user.role);
            const authService = serviceFactory.get<AuthService>('auth');
            tenants = await authService.getUserTenants();
          }
        console.log('✅ PageHeader: Loaded tenants:', tenants?.length || 0);
        setAvailableTenants(tenants || []);
      } catch (error) {
        console.error('❌ PageHeader: Failed to load tenants:', error);
        
        // Handle authentication errors through global error system
        if (error && (error as any).name === 'AuthenticationError') {
          setError('auth_failed', 'Authentication failed. Please log in again.');
        } else {
          setError('tenant_load_failed', 'Failed to load tenants. Please refresh the page.');
        }
        
        setAvailableTenants([]);
      } finally {
        setIsLoadingTenants(false);
      }
    };

    loadTenants();
  }, [user]);

  const handleTenantSwitch = async (tenantId: string) => {
    if (tenantId === tenant?.id || isSwitching) return;
    
    setIsSwitching(true);
    clearError(); // Clear any existing errors
    
    try {
      await switchTenant(tenantId);
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      
      // Handle authentication errors through global error system
      if (error && (error as any).name === 'AuthenticationError') {
        setError('auth_failed', 'Authentication failed. Please log in again.');
      } else {
        setError('tenant_switch_failed', 'Failed to switch tenant. Please try again.');
      }
    } finally {
      setIsSwitching(false);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
    setIsUserDropdownOpen(false); // Close user dropdown when tenant dropdown opens
  };

  const toggleUserDropdown = () => {
    setIsUserDropdownOpen(!isUserDropdownOpen);
    setIsDropdownOpen(false); // Close tenant dropdown when user dropdown opens
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      setError('logout_failed', 'Failed to logout. Please try again.');
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-tenant-switcher]') && !target.closest('[data-user-dropdown]')) {
        setIsDropdownOpen(false);
        setIsUserDropdownOpen(false);
      }
    };

    if (isDropdownOpen || isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen, isUserDropdownOpen]);

  return (
    <HeaderContainer className={className}>
      <HeaderLeft>
        <Logo>
          <Shield size={24} />
          <span>DocExtract</span>
        </Logo>
        
        <Separator />
        
        {/* Tenant Switcher - moved to left side */}
        {tenant && availableTenants && availableTenants.length > 0 && (
          <TenantSwitcher data-tenant-switcher>
            <TenantButton onClick={toggleDropdown} disabled={isSwitching}>
              <TenantInfo>
                <TenantName>{tenant.name}</TenantName>
                <TenantEnvironment>
                  <EnvironmentBadge $environment={tenant.environment || 'development'}>
                    {tenant.environment || 'DEVELOPMENT'}
                  </EnvironmentBadge>
                </TenantEnvironment>
              </TenantInfo>
              {isSwitching ? (
                <LoadingSpinner />
              ) : (
                <ChevronDown size={16} style={{ 
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }} />
              )}
            </TenantButton>

            <TenantDropdown $isOpen={isDropdownOpen}>
              {availableTenants && availableTenants.map((t) => (
                <DropdownItem
                  key={t.id}
                  $isActive={t.id === tenant.id}
                  onClick={() => handleTenantSwitch(t.id)}
                  disabled={isSwitching}
                >
                  <DropdownItemIcon>
                    <Users size={16} />
                  </DropdownItemIcon>
                  <DropdownItemText>
                    <DropdownItemName>{t.name}</DropdownItemName>
                    <DropdownItemEnv>
                      <EnvironmentBadge $environment={t.environment || 'development'}>
                        {t.environment || 'DEVELOPMENT'}
                      </EnvironmentBadge>
                    </DropdownItemEnv>
                  </DropdownItemText>
                </DropdownItem>
              ))}
              
              {hasPermission('tenants:read') && (
                <>
                  <DropdownSeparator />
                  <DropdownItem onClick={() => window.location.href = '/tenants'}>
                    <DropdownItemIcon>
                      <Settings size={16} />
                    </DropdownItemIcon>
                    <DropdownItemText>
                      <DropdownItemName>Tenant Settings</DropdownItemName>
                    </DropdownItemText>
                    <ExternalLink size={14} />
                  </DropdownItem>
                </>
              )}
            </TenantDropdown>
          </TenantSwitcher>
        )}
      </HeaderLeft>
      
      <HeaderRight>
        <HeaderButton>
          <Globe size={16} />
          Discuss your needs
        </HeaderButton>
        
        <HeaderButton>
          Documentation
        </HeaderButton>
        
        <NotificationButton>
          <Bell size={20} />
          <NotificationBadge />
        </NotificationButton>
        
        <div style={{ position: 'relative' }} data-user-dropdown>
          <UserAvatar onClick={toggleUserDropdown}>
            {getUserInitials()}
          </UserAvatar>
          
          <UserDropdown $isOpen={isUserDropdownOpen}>
            <UserDropdownHeader>
              <UserAvatarLarge>
                {getUserInitials()}
              </UserAvatarLarge>
              <UserInfo>
                <UserName>
                  {user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User' : 'User'}
                </UserName>
                <UserEmail>
                  {user?.email || 'user@example.com'}
                </UserEmail>
              </UserInfo>
            </UserDropdownHeader>
            
            
            <DropdownItem onClick={() => window.location.href = '/profile'}>
              <DropdownItemIcon>
                <User size={16} />
              </DropdownItemIcon>
              <DropdownItemText>
                <DropdownItemName>Your profile</DropdownItemName>
              </DropdownItemText>
            </DropdownItem>
            
            <DropdownItem onClick={handleLogout}>
              <DropdownItemIcon>
                <LogOut size={16} />
              </DropdownItemIcon>
              <DropdownItemText>
                <DropdownItemName>Log out</DropdownItemName>
              </DropdownItemText>
            </DropdownItem>
          </UserDropdown>
        </div>
      </HeaderRight>
    </HeaderContainer>
  );
};

export default PageHeader;
