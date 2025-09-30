import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown, Check, Building2 } from 'lucide-react';
import { DEFAULT_TENANT_ID, DEFAULT_TENANT_NAME } from '../../constants/tenant';

const SwitcherContainer = styled.div`
  position: relative;
`;

const SwitcherButton = styled.button<{ $isOpen: boolean }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  padding: ${props => props.theme.spacing.xs};
  border-radius: ${props => props.theme.borderRadius.sm};
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  width: 100%;
  
  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
  }
  
  svg:last-child {
    transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
    transition: transform ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  }
`;

const SwitcherText = styled.span`
  font-size: ${props => props.theme.typography.sizes.xs};
  color: ${props => props.theme.colors.text.secondary};
  font-weight: ${props => props.theme.typography.weights.medium};
`;

const Dropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  box-shadow: ${props => props.theme.shadows.lg};
  z-index: ${props => props.theme.zIndex.dropdown};
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.$isOpen ? 'translateY(0)' : 'translateY(-8px)'};
  transition: all ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  margin-top: ${props => props.theme.spacing.xs};
`;

const DropdownItem = styled.button<{ $isSelected: boolean }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.sm};
  width: 100%;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  text-align: left;
  
  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
  }
  
  ${props => props.$isSelected && `
    background: ${props.theme.colors.primary}15;
    color: ${props.theme.colors.primary};
  `}
`;

const TenantIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: ${props => props.theme.colors.text.secondary};
`;

const TenantInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.xs};
  flex: 1;
`;

const TenantName = styled.div`
  font-size: ${props => props.theme.typography.sizes.sm};
  font-weight: ${props => props.theme.typography.weights.medium};
  color: ${props => props.theme.colors.text.primary};
`;

const TenantEnvironment = styled.div`
  font-size: ${props => props.theme.typography.sizes.xs};
  color: ${props => props.theme.colors.text.secondary};
`;

const CheckIcon = styled.div<{ $isSelected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: ${props => props.theme.colors.primary};
  opacity: ${props => props.$isSelected ? 1 : 0};
  transition: opacity ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
`;

const AddTenantButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.sm};
  width: 100%;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  text-align: left;
  border-top: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text.secondary};
  
  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
    color: ${props => props.theme.colors.primary};
  }
`;

interface TenantSwitcherProps {
  isCollapsed: boolean;
}

export const TenantSwitcher: React.FC<TenantSwitcherProps> = ({ isCollapsed }) => {
  const { tenant, switchTenant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Mock tenants for demonstration
  const availableTenants = [
    {
      id: DEFAULT_TENANT_ID,
      name: DEFAULT_TENANT_NAME,
      environment: 'development' as const,
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Acme Corp',
      environment: 'production' as const,
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Beta Testing',
      environment: 'staging' as const,
    },
  ];

  const handleTenantSelect = async (selectedTenant: typeof availableTenants[0]) => {
    try {
      await switchTenant(selectedTenant.id);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch tenant:', error);
    }
  };

  if (isCollapsed) {
    return null;
  }

  return (
    <SwitcherContainer>
      <SwitcherButton $isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
        <SwitcherText>Switch Tenant</SwitcherText>
        <ChevronDown size={12} />
      </SwitcherButton>
      
      <Dropdown $isOpen={isOpen}>
        {availableTenants.map((availableTenant) => (
          <DropdownItem
            key={availableTenant.id}
            $isSelected={tenant?.id === availableTenant.id}
            onClick={() => handleTenantSelect(availableTenant)}
          >
            <TenantIcon>
              <Building2 size={16} />
            </TenantIcon>
            <TenantInfo>
              <TenantName>{availableTenant.name}</TenantName>
              <TenantEnvironment>{availableTenant.environment}</TenantEnvironment>
            </TenantInfo>
            <CheckIcon $isSelected={tenant?.id === availableTenant.id}>
              <Check size={12} />
            </CheckIcon>
          </DropdownItem>
        ))}
        
        <AddTenantButton>
          <TenantIcon>
            <Building2 size={16} />
          </TenantIcon>
          <TenantInfo>
            <TenantName>Add New Tenant</TenantName>
            <TenantEnvironment>Create or join a tenant</TenantEnvironment>
          </TenantInfo>
        </AddTenantButton>
      </Dropdown>
    </SwitcherContainer>
  );
};

export default TenantSwitcher;
