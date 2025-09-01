import styled from 'styled-components';
import Link from 'next/link';
import { ReactNode } from 'react';

const LayoutContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  box-shadow: ${props => props.theme.shadows.sm};
  position: sticky;
  top: 0;
  z-index: ${props => props.theme.zIndex.sticky};
`;

const Nav = styled.nav`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${props => props.theme.spacing.lg};
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  
  h1 {
    font-size: ${props => props.theme.typography.sizes.xl};
    font-weight: ${props => props.theme.typography.weights.bold};
    color: ${props => props.theme.colors.primary};
    margin: 0;
  }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.lg};
`;

const NavLink = styled.a<{ active?: boolean }>`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.text.secondary};
  font-weight: ${props => props.active ? props.theme.typography.weights.medium : props.theme.typography.weights.normal};
  border-radius: ${props => props.theme.borderRadius.md};
  transition: all ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  
  &:hover {
    color: ${props => props.theme.colors.primary};
    background-color: ${props => props.theme.colors.surfaceHover};
    text-decoration: none;
  }
`;

const Main = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const Footer = styled.footer`
  background-color: ${props => props.theme.colors.surface};
  border-top: 1px solid ${props => props.theme.colors.border};
  padding: ${props => props.theme.spacing.xl} 0;
  margin-top: auto;
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${props => props.theme.spacing.lg};
  text-align: center;
  color: ${props => props.theme.colors.text.muted};
`;

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <LayoutContainer>
      <Header>
        <Nav>
          <Logo>
            <Link href="/" passHref>
              <NavLink>
                <h1>DocExtract</h1>
              </NavLink>
            </Link>
          </Logo>
          
          <NavLinks>
            <Link href="/" passHref>
              <NavLink>Home</NavLink>
            </Link>
            <Link href="/documents" passHref>
              <NavLink>Documents</NavLink>
            </Link>
            <Link href="/templates" passHref>
              <NavLink>Templates</NavLink>
            </Link>
            <Link href="/extractions" passHref>
              <NavLink>Extractions</NavLink>
            </Link>
          </NavLinks>
        </Nav>
      </Header>
      
      <Main>
        {children}
      </Main>
      
      <Footer>
        <FooterContent>
          <p>&copy; 2024 Document Extraction Platform. Built with Next.js, FastAPI, and LangExtract.</p>
        </FooterContent>
      </Footer>
    </LayoutContainer>
  );
};

