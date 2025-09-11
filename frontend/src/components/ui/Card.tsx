import styled from 'styled-components';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'small' | 'medium' | 'large';
  shadow?: 'none' | 'small' | 'medium' | 'large';
  hover?: boolean;
}

const CardContainer = styled.div<{
  $padding: CardProps['padding'];
  $shadow: CardProps['shadow'];
  $hover: boolean;
}>`
  background-color: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.lg};
  transition: all ${props => props.theme.animation.duration.normal} ${props => props.theme.animation.easing.easeInOut};
  
  /* Padding variants */
  ${props => {
    switch (props.$padding) {
      case 'small':
        return `padding: ${props.theme.spacing.md};`;
      case 'large':
        return `padding: ${props.theme.spacing.xl};`;
      default:
        return `padding: ${props.theme.spacing.lg};`;
    }
  }}
  
  /* Shadow variants */
  ${props => {
    switch (props.$shadow) {
      case 'none':
        return 'box-shadow: none;';
      case 'small':
        return `box-shadow: ${props.theme.shadows.sm};`;
      case 'large':
        return `box-shadow: ${props.theme.shadows.lg};`;
      default:
        return `box-shadow: ${props.theme.shadows.md};`;
    }
  }}
  
  /* Hover effect */
  ${props => props.$hover && `
    cursor: pointer;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: ${props.theme.shadows.lg};
      border-color: ${props.theme.colors.borderHover};
    }
  `}
  
  /* Content styling */
  h3, h4, h5, h6 {
    margin-top: 0;
    margin-bottom: ${props => props.theme.spacing.sm};
    color: ${props => props.theme.colors.text.primary};
  }
  
  p {
    margin-bottom: ${props => props.theme.spacing.sm};
    color: ${props => props.theme.colors.text.secondary};
    line-height: ${props => props.theme.typography.lineHeights.relaxed};
    
    &:last-child {
      margin-bottom: 0;
    }
  }
`;

export const Card = ({
  children,
  className,
  padding = 'medium',
  shadow = 'medium',
  hover = false,
  ...props
}: CardProps) => {
  return (
    <CardContainer
      className={className}
      $padding={padding}
      $shadow={shadow}
      $hover={hover}
      {...props}
    >
      {children}
    </CardContainer>
  );
};

export default Card;

