import React from 'react';
import styled from 'styled-components';
import { Bell, Globe, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const HeaderContainer = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  z-index: ${props => props.theme.zIndex.fixed};
  box-shadow: ${props => props.theme.shadows.sm};
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: ${props => props.theme.colors.primary};
  font-weight: ${props => props.theme.typography.weights.bold};
  font-size: ${props => props.theme.typography.sizes.lg};
  
  svg {
    width: 24px;
    height: 24px;
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
  color: ${props => props.theme.colors.text.secondary};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  
  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
    color: ${props => props.theme.colors.text.primary};
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
  color: ${props => props.theme.colors.text.secondary};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
    color: ${props => props.theme.colors.text.primary};
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: ${props => props.theme.colors.error};
  border-radius: 50%;
  border: 2px solid ${props => props.theme.colors.surface};
`;

const UserAvatar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: ${props => props.theme.colors.primary};
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 0.875rem;
`;

interface PageHeaderProps {
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ className }) => {
  const { user } = useAuth();
  
  const getUserInitials = () => {
    if (!user) return 'U';
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  };

  return (
    <HeaderContainer className={className}>
      <HeaderLeft>
        <Logo>
          <Shield size={24} />
          <span>DocExtract</span>
        </Logo>
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
        
        <UserAvatar>
          {getUserInitials()}
        </UserAvatar>
      </HeaderRight>
    </HeaderContainer>
  );
};
