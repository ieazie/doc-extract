import styled, { css } from 'styled-components';
import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const ButtonBase = styled.button<{
  $variant: ButtonProps['variant'];
  $size: ButtonProps['size'];
  $isLoading: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.md};
  font-family: ${props => props.theme.typography.fonts.sans};
  font-weight: ${props => props.theme.typography.weights.medium};
  text-decoration: none;
  cursor: pointer;
  transition: all ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  border: 1px solid transparent;
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}40;
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  ${props => props.$isLoading && css`
    cursor: wait;
    pointer-events: none;
  `}
  
  /* Size variants */
  ${props => props.$size === 'small' && css`
    padding: ${props.theme.spacing.xs} ${props.theme.spacing.sm};
    font-size: ${props.theme.typography.sizes.sm};
    min-height: 32px;
  `}
  
  ${props => props.$size === 'medium' && css`
    padding: ${props.theme.spacing.sm} ${props.theme.spacing.md};
    font-size: ${props.theme.typography.sizes.base};
    min-height: 40px;
  `}
  
  ${props => props.$size === 'large' && css`
    padding: ${props.theme.spacing.md} ${props.theme.spacing.lg};
    font-size: ${props.theme.typography.sizes.lg};
    min-height: 48px;
  `}
  
  /* Color variants */
  ${props => props.$variant === 'primary' && css`
    background-color: ${props.theme.colors.primary};
    color: ${props.theme.colors.text.inverse};
    
    &:hover:not(:disabled) {
      background-color: ${props.theme.colors.primaryHover};
    }
  `}
  
  ${props => props.$variant === 'secondary' && css`
    background-color: ${props.theme.colors.secondary};
    color: ${props.theme.colors.text.inverse};
    
    &:hover:not(:disabled) {
      background-color: ${props.theme.colors.secondaryHover};
    }
  `}
  
  ${props => props.$variant === 'outline' && css`
    background-color: transparent;
    color: ${props.theme.colors.primary};
    border-color: ${props.theme.colors.border};
    
    &:hover:not(:disabled) {
      background-color: ${props.theme.colors.primary}10;
      border-color: ${props.theme.colors.primary};
    }
  `}
  
  ${props => props.$variant === 'ghost' && css`
    background-color: transparent;
    color: ${props.theme.colors.text.secondary};
    
    &:hover:not(:disabled) {
      background-color: ${props.theme.colors.surfaceHover};
      color: ${props.theme.colors.text.primary};
    }
  `}
  
  ${props => props.$variant === 'danger' && css`
    background-color: ${props.theme.colors.error};
    color: ${props.theme.colors.text.inverse};
    
    &:hover:not(:disabled) {
      background-color: ${props.theme.colors.error};
      filter: brightness(0.9);
    }
  `}
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps) => {
  return (
    <ButtonBase
      $variant={variant}
      $size={size}
      $isLoading={isLoading}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </ButtonBase>
  );
};

export default Button;

