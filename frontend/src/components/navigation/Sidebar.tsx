import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
// TenantSwitcher removed as per design requirements
import { 
  BarChart3, 
  Building2,
  FileText, 
  Settings, 
  Zap, 
  Users, 
  Key, 
  HelpCircle, 
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Shield,
  Menu,
  X
} from 'lucide-react';

const SidebarContainer = styled.aside<{ $isCollapsed: boolean; $isMobile: boolean }>`
  width: ${props => {
    if (props.$isMobile) {
      return props.$isCollapsed ? '0' : '322px'; // 280px + 15%
    }
    return props.$isCollapsed ? '72px' : '322px'; // 280px + 15%
  }};
  height: calc(100vh - 64px); /* Account for page header */
  background: ${props => props.theme.colors.surface};
  border-right: 1px solid ${props => props.theme.colors.border};
  display: flex;
  flex-direction: column;
  transition: width ${props => props.theme.animation.duration.normal} ${props => props.theme.animation.easing.easeInOut};
  position: fixed;
  left: 0;
  top: 64px; /* Account for page header */
  z-index: ${props => props.theme.zIndex.sticky};
  overflow: hidden;
  box-shadow: ${props => props.theme.shadows.md};
  
  ${props => props.$isMobile && `
    @media (max-width: ${props.theme.breakpoints.lg}) {
      transform: ${props.$isCollapsed ? 'translateX(-100%)' : 'translateX(0)'};
      width: 322px; // 280px + 15%
      transition: transform ${props.theme.animation.duration.normal} ${props.theme.animation.easing.easeInOut};
    }
  `}
`;

const SidebarHeader = styled.div<{ $isCollapsed: boolean }>`
  padding: ${props => props.$isCollapsed ? props.theme.spacing.sm : props.theme.spacing.md};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: ${props => props.$isCollapsed ? props.theme.spacing.xs : props.theme.spacing.xs};
  min-height: ${props => props.$isCollapsed ? '40px' : '50px'};
  position: relative;
  align-items: ${props => props.$isCollapsed ? 'center' : 'flex-start'};
`;

const HeaderTop = styled.div<{ $isCollapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${props => props.$isCollapsed ? 'center' : 'flex-start'};
  gap: ${props => props.theme.spacing.sm};
  min-height: 40px;
`;

const Logo = styled.div<{ $isCollapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: ${props => props.$isCollapsed ? '0' : props.theme.spacing.sm};
  color: ${props => props.theme.colors.primary};
  font-weight: ${props => props.theme.typography.weights.bold};
  font-size: ${props => props.$isCollapsed ? props.theme.typography.sizes.base : props.theme.typography.sizes.lg};
  transition: all ${props => props.theme.animation.duration.normal} ${props => props.theme.animation.easing.easeInOut};
  
  svg {
    flex-shrink: 0;
    width: ${props => props.$isCollapsed ? '24px' : '28px'};
    height: ${props => props.$isCollapsed ? '24px' : '28px'};
  }
`;

const LogoText = styled.span<{ $isCollapsed: boolean }>`
  opacity: ${props => props.$isCollapsed ? 0 : 1};
  transition: opacity ${props => props.theme.animation.duration.normal} ${props => props.theme.animation.easing.easeInOut};
  white-space: nowrap;
  overflow: hidden;
`;



const Navigation = styled.nav`
  flex: 1;
  padding: ${props => props.theme.spacing.xl} 0 ${props => props.theme.spacing.md} 0;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.border};
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.colors.borderHover};
  }
`;

const NavSection = styled.div`
  margin-bottom: ${props => props.theme.spacing.xl};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const NavSectionTitle = styled.div<{ $isCollapsed: boolean }>`
  font-size: ${props => props.theme.typography.sizes.xs};
  font-weight: ${props => props.theme.typography.weights.semibold};
  color: ${props => props.theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: ${props => props.$isCollapsed ? '0' : `${props.theme.spacing.sm} ${props.theme.spacing.lg}`};
  margin-bottom: ${props => props.$isCollapsed ? '0' : props.theme.spacing.sm};
  display: ${props => props.$isCollapsed ? 'none' : 'block'};
`;

const NavItem = styled.a<{ $active: boolean; $isCollapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${props => props.$isCollapsed ? 'center' : 'flex-start'};
  gap: ${props => props.$isCollapsed ? '0' : props.theme.spacing.sm};
  padding: ${props => props.$isCollapsed ? props.theme.spacing.md : `${props.theme.spacing.sm} ${props.theme.spacing.lg}`};
  color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.text.secondary};
  text-decoration: none;
  font-weight: ${props => props.$active ? props.theme.typography.weights.medium : props.theme.typography.weights.normal};
  transition: all ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  position: relative;
  border-radius: ${props => props.theme.borderRadius.md};
  margin: ${props => props.$isCollapsed ? `0 ${props.theme.spacing.sm}` : '0'};
  border: none;
  outline: none;
  
  svg {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    transition: color ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  }
  
  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
    color: ${props => props.theme.colors.primary};
    transform: ${props => props.$isCollapsed ? 'scale(1.1)' : 'translateX(4px)'};
    text-decoration: none;
  }
  
  &:focus,
  &:active {
    outline: none;
    border: none;
    text-decoration: none;
  }
  
  ${props => props.$active && `
    background: ${props.theme.colors.primary}15;
    color: ${props.theme.colors.primary};
    text-decoration: none;
    
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: ${props.theme.colors.primary};
      border-radius: 0 ${props.theme.borderRadius.sm} ${props.theme.borderRadius.sm} 0;
    }
  `}
`;

const NavText = styled.span<{ $isCollapsed: boolean }>`
  opacity: ${props => props.$isCollapsed ? 0 : 1};
  transition: opacity ${props => props.theme.animation.duration.normal} ${props => props.theme.animation.easing.easeInOut};
  white-space: nowrap;
  overflow: hidden;
`;

const SidebarFooter = styled.div<{ $isCollapsed: boolean }>`
  padding: ${props => props.$isCollapsed ? props.theme.spacing.sm : props.theme.spacing.md};
  border-top: 1px solid ${props => props.theme.colors.border};
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: ${props => props.$isCollapsed ? 'center' : 'flex-end'};
  min-height: 50px;
  flex-shrink: 0; /* Prevent footer from shrinking */
`;

const ToggleButton = styled.button<{ $isCollapsed: boolean }>`
  width: 32px;
  height: 32px;
  border: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.secondary};
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  
  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
    color: ${props => props.theme.colors.text.primary};
    border-color: ${props => props.theme.colors.primary};
  }
  
  svg {
    width: 14px;
    height: 14px;
    transition: color ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  }
`;

const MainContent = styled.main<{ $isCollapsed: boolean; $isMobile: boolean }>`
  margin-left: ${props => {
    if (props.$isMobile) {
      return '0';
    }
    return props.$isCollapsed ? '72px' : '322px'; // 280px + 15%
  }};
  margin-top: 64px; /* Account for page header */
  transition: margin-left ${props => props.theme.animation.duration.normal} ${props => props.theme.animation.easing.easeInOut};
  min-height: calc(100vh - 64px);
  
  @media (max-width: ${props => props.theme.breakpoints.lg}) {
    margin-left: 0;
  }
`;

const MobileOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: ${props => props.theme.zIndex.modal - 1};
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transition: all ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  
  @media (min-width: ${props => props.theme.breakpoints.lg}) {
    display: none;
  }
`;

const MobileHeader = styled.header<{ $isMobile: boolean }>`
  display: ${props => props.$isMobile ? 'flex' : 'none'};
  align-items: center;
  justify-content: space-between;
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  background: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  position: sticky;
  top: 0;
  z-index: ${props => props.theme.zIndex.sticky};
  
  @media (min-width: ${props => props.theme.breakpoints.lg}) {
    display: none;
  }
`;

const MobileMenuButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  transition: background-color ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  
  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
  }
`;

const MobileLogo = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  color: ${props => props.theme.colors.primary};
  font-weight: ${props => props.theme.typography.weights.bold};
  font-size: ${props => props.theme.typography.sizes.lg};
`;

interface SidebarProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

interface NavigationItem {
  path: string;
  icon: React.ComponentType<any>;
  label: string;
  permission?: string;
  role?: string;
}

// Hook to detect mobile devices
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const checkIsMobile = () => {
        setIsMobile(window.innerWidth < 1024); // lg breakpoint
      };

      checkIsMobile();
      window.addEventListener('resize', checkIsMobile);
      return () => window.removeEventListener('resize', checkIsMobile);
    }
  }, [isClient]);

  return isMobile;
};

export const Sidebar: React.FC<SidebarProps> = ({ children, showHeader = false }) => {
  const router = useRouter();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { user, hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' && router.pathname === '/') return true;
    if (path !== '/' && router.pathname.startsWith(path)) return true;
    return false;
  };

  const shouldShowItem = (item: NavigationItem): boolean => {
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.role && user?.role !== item.role) return false;
    return true;
  };

  const navigationItems: NavigationItem[] = [
    { path: '/', icon: BarChart3, label: 'Dashboard', permission: 'analytics:read' },
    { path: '/extractions', icon: Zap, label: 'Extractions', permission: 'extractions:read' },
    { path: '/templates', icon: Settings, label: 'Templates', permission: 'templates:read' },
    { path: '/documents', icon: FileText, label: 'Documents', permission: 'documents:read' },
  ];

  const tenantManagementItems: NavigationItem[] = [
    { path: '/users', icon: Users, label: 'User Management', permission: 'users:read' },
    { path: '/api-keys', icon: Key, label: 'API Keys', permission: 'api-keys:read' },
    { path: '/tenant-config', icon: Settings, label: 'Tenant Settings', permission: 'tenant_config:read' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics', permission: 'analytics:read' },
  ];

  const systemAdminItems: NavigationItem[] = [
    { path: '/system/tenants', icon: Building2, label: 'Tenant Management', permission: 'tenants:read_all', role: 'system_admin' },
    { path: '/system/users', icon: Users, label: 'All Users', permission: 'users:read_all', role: 'system_admin' },
    { path: '/system/analytics', icon: BarChart3, label: 'System Analytics', permission: 'analytics:global', role: 'system_admin' },
    { path: '/system/config', icon: Settings, label: 'System Config', permission: 'system:config', role: 'system_admin' },
  ];

  // Support items removed as per design requirements

  // Remove the old isLoading calculation since we now get it from useAuth

  // Mobile handlers
  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [router.pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && isMobileMenuOpen) {
        const sidebar = document.querySelector('[data-sidebar]');
        if (sidebar && !sidebar.contains(event.target as Node)) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isMobileMenuOpen]);

  return (
    <>
      {/* Mobile Header */}
      <MobileHeader $isMobile={isMobile}>
        <MobileMenuButton onClick={handleMobileMenuToggle}>
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </MobileMenuButton>
        <MobileLogo>
          <Shield size={24} />
          DocExtract
        </MobileLogo>
        <div style={{ width: '40px' }} /> {/* Spacer for centering */}
      </MobileHeader>

      {/* Mobile Overlay */}
      <MobileOverlay $isOpen={isMobile && isMobileMenuOpen} onClick={handleMobileMenuClose} />

      <SidebarContainer 
        $isCollapsed={isMobile ? !isMobileMenuOpen : isCollapsed} 
        $isMobile={isMobile}
        data-sidebar
      >
        {showHeader && (
          <SidebarHeader $isCollapsed={isCollapsed}>
            {/* Header content can be added here when needed */}
          </SidebarHeader>
        )}

        <Navigation>
          {/* Main Navigation Items */}
          <NavSection>
            {navigationItems
              .filter(shouldShowItem)
              .map((item) => (
                <NavItem
                  key={item.path}
                  href={item.path}
                  $active={isActive(item.path)}
                  $isCollapsed={isCollapsed}
                >
                  <item.icon size={20} />
                  <NavText $isCollapsed={isCollapsed}>{item.label}</NavText>
                </NavItem>
              ))}
          </NavSection>

          {/* Tenant Management Items (for tenant admins and system admins) */}
          {tenantManagementItems.some(shouldShowItem) && (
            <NavSection>
              <NavSectionTitle $isCollapsed={isCollapsed}>
                {!isCollapsed && "Management"}
              </NavSectionTitle>
              {tenantManagementItems
                .filter(shouldShowItem)
                .map((item) => (
                  <NavItem
                    key={item.path}
                    href={item.path}
                    $active={isActive(item.path)}
                    $isCollapsed={isCollapsed}
                  >
                    <item.icon size={20} />
                    <NavText $isCollapsed={isCollapsed}>{item.label}</NavText>
                  </NavItem>
                ))}
            </NavSection>
          )}

          {/* System Admin Items (only for system admins) */}
          {user?.role === 'system_admin' && systemAdminItems.some(shouldShowItem) && (
            <NavSection>
              <NavSectionTitle $isCollapsed={isCollapsed}>
                {!isCollapsed && "System Admin"}
              </NavSectionTitle>
              {systemAdminItems
                .filter(shouldShowItem)
                .map((item) => (
                  <NavItem
                    key={item.path}
                    href={item.path}
                    $active={isActive(item.path)}
                    $isCollapsed={isCollapsed}
                  >
                    <item.icon size={20} />
                    <NavText $isCollapsed={isCollapsed}>{item.label}</NavText>
                  </NavItem>
                ))}
            </NavSection>
          )}
        </Navigation>

        <SidebarFooter $isCollapsed={isCollapsed}>
          <ToggleButton $isCollapsed={isCollapsed} onClick={toggleSidebar}>
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </ToggleButton>
        </SidebarFooter>
      </SidebarContainer>

      <MainContent $isCollapsed={isCollapsed} $isMobile={isMobile}>
        {children}
      </MainContent>
    </>
  );
};

export default Sidebar;
