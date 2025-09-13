import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { ChevronDown } from 'lucide-react';

const DropdownContainer = styled.div`
  position: relative;
  width: 100%;
`;

const DropdownButton = styled.button<{ $isOpen: boolean; $hasError?: boolean }>`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.border};
  border-radius: 8px;
  background: white;
  color: ${props => props.theme.colors.text.primary};
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.primary};
  }
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20;
  }
  
  ${props => props.$isOpen && `
    border-color: ${props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props.theme.colors.primary}20;
  `}
`;

const DropdownIcon = styled(ChevronDown)<{ $isOpen: boolean }>`
  width: 16px;
  height: 16px;
  color: ${props => props.theme.colors.text.secondary};
  transition: transform 0.2s ease;
  transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const DropdownList = styled.ul<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  list-style: none;
  display: ${props => props.$isOpen ? 'block' : 'none'};
`;

const DropdownItem = styled.li<{ $isSelected?: boolean; $isDisabled?: boolean }>`
  padding: 0.75rem 1rem;
  cursor: pointer;
  color: ${props => props.$isDisabled ? props.theme.colors.text.muted : props.theme.colors.text.primary};
  background: ${props => props.$isSelected ? `${props.theme.colors.primary}10` : 'transparent'};
  transition: background-color 0.15s ease;
  
  &:hover {
    background: ${props => props.$isDisabled ? 'transparent' : props.theme.colors.surfaceHover};
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

const PlaceholderText = styled.span`
  color: ${props => props.theme.colors.text.secondary};
`;

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  placeholder = "Select an option...",
  onChange,
  disabled = false,
  hasError = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue: string) => {
    if (!disabled) {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  return (
    <DropdownContainer ref={dropdownRef} className={className}>
      <DropdownButton
        type="button"
        onClick={handleToggle}
        $isOpen={isOpen}
        $hasError={hasError}
        disabled={disabled}
      >
        {selectedOption ? (
          selectedOption.label
        ) : (
          <PlaceholderText>{placeholder}</PlaceholderText>
        )}
        <DropdownIcon $isOpen={isOpen} />
      </DropdownButton>
      
      <DropdownList $isOpen={isOpen}>
        {options.map((option) => (
          <DropdownItem
            key={option.value}
            onClick={() => handleSelect(option.value)}
            $isSelected={option.value === value}
            $isDisabled={option.disabled}
          >
            {option.label}
          </DropdownItem>
        ))}
      </DropdownList>
    </DropdownContainer>
  );
};

export default Dropdown;
