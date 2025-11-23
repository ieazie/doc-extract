/**
 * Context Menu Component
 * Dropdown menu for table row actions
 */
import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { MoreVertical, Edit, Archive, Trash2 } from 'lucide-react';

// Types
interface ContextMenuAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  hidden?: boolean;
}

interface ContextMenuProps {
  actions: ContextMenuAction[];
  className?: string;
}

// Styled Components
const MenuButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  color: #6b7280;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MenuContainer = styled.div`
  position: relative;
  display: inline-block;
  z-index: 100;
`;

const MenuDropdown = styled.div<{ $isOpen: boolean; $position: 'top' | 'bottom' }>`
  position: absolute;
  ${props => props.$position === 'top' ? 'bottom: 100%;' : 'top: 100%;'}
  right: 0;
  z-index: 9999;
  ${props => props.$position === 'top' ? 'margin-bottom: 0.25rem;' : 'margin-top: 0.25rem;'}
  min-width: 12rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  display: ${props => props.$isOpen ? 'block' : 'none'};
  transform: ${props => {
    if (!props.$isOpen) {
      return props.$position === 'top' ? 'translateY(0.5rem)' : 'translateY(-0.5rem)';
    }
    return 'translateY(0)';
  }};
  transition: all 0.2s ease;
`;

const MenuItem = styled.button<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: ${props => props.$disabled ? '#9ca3af' : '#374151'};
  font-size: 0.875rem;
  text-align: left;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: background-color 0.2s;
  
  &:hover:not(:disabled) {
    background: #f9fafb;
  }
  
  &:first-child {
    border-radius: 0.5rem 0.5rem 0 0;
  }
  
  &:last-child {
    border-radius: 0 0 0.5rem 0.5rem;
  }
  
  &:only-child {
    border-radius: 0.5rem;
  }
  
  &:disabled {
    opacity: 0.5;
  }
`;

const MenuIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  color: inherit;
`;

const ContextMenu: React.FC<ContextMenuProps> = ({ actions, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Recalculate position on window resize
  useEffect(() => {
    const handleResize = () => {
      if (isOpen) {
        calculatePosition();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      // Calculate position before opening
      calculatePosition();
    }
    setIsOpen(!isOpen);
  };

  const calculatePosition = () => {
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Use a reasonable estimate for menu height
      const estimatedMenuHeight = 120; // Approximate height for 3 menu items
      
      // Check if there's enough space below the button
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      // If there's not enough space below but there is above, position upward
      if (spaceBelow < estimatedMenuHeight + 20 && spaceAbove > estimatedMenuHeight + 20) {
        setPosition('top');
      } else {
        setPosition('bottom');
      }
    } else {
      // Fallback to bottom if we can't measure
      setPosition('bottom');
    }
  };

  const handleActionClick = (action: ContextMenuAction) => {
    if (!action.disabled) {
      action.onClick();
      setIsOpen(false);
    }
  };

  const visibleActions = actions.filter(action => !action.hidden);

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <MenuContainer className={className}>
      <MenuButton
        ref={buttonRef}
        onClick={handleToggle}
        aria-label="Open context menu"
      >
        <MoreVertical size={16} />
      </MenuButton>
      
      <MenuDropdown ref={menuRef} $isOpen={isOpen} $position={position}>
        {visibleActions.map((action) => (
          <MenuItem
            key={action.id}
            $disabled={action.disabled}
            onClick={() => handleActionClick(action)}
          >
            <MenuIcon>{action.icon}</MenuIcon>
            {action.label}
          </MenuItem>
        ))}
      </MenuDropdown>
    </MenuContainer>
  );
};

export default ContextMenu;
