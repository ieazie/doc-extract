/**
 * Main navigation component
 */
import React from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Home, 
  FileText, 
  Settings, 
  Zap,
  Upload
} from 'lucide-react';

const NavContainer = styled.nav`
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 2rem;
`;

const NavContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 4rem;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
`;

const NavLinks = styled.div`
  display: flex;
  gap: 2rem;
  align-items: center;
`;

const NavLink = styled(Link)<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
  
  ${props => props.active ? `
    background: #eff6ff;
    color: #3b82f6;
  ` : `
    color: #6b7280;
    &:hover {
      background: #f9fafb;
      color: #374151;
    }
  `}
`;

const NavItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  color: #6b7280;
`;

export const Navigation: React.FC = () => {
  const router = useRouter();

  const isActive = (path: string) => {
    if (path === '/' && router.pathname === '/') return true;
    if (path !== '/' && router.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <NavContainer>
      <NavContent>
        <Logo>
          <FileText size={24} />
          DocExtract
        </Logo>
        
        <NavLinks>
          <NavLink href="/" active={isActive('/')}>
            <Home size={16} />
            Dashboard
          </NavLink>
          
          <NavLink href="/extractions" active={isActive('/extractions')}>
            <Zap size={16} />
            Extractions
          </NavLink>
          
          <NavLink href="/templates" active={isActive('/templates')}>
            <Settings size={16} />
            Templates
          </NavLink>
        </NavLinks>
      </NavContent>
    </NavContainer>
  );
};

export default Navigation;
