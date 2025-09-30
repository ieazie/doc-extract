import styled from 'styled-components';

export const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: ${props => props.theme.colors.text.primary};
`;

export const InputContainer = styled.div`
  position: relative;
`;

export const Input = styled.input<{ hasKey: boolean }>`
  width: 100%;
  padding: 0.75rem;
  padding-right: ${props => props.hasKey ? '120px' : '12px'};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.sizes.sm};
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20;
  }
`;

export const StatusIndicator = styled.div`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: ${props => props.theme.colors.success};
`;

export const HelpText = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.text.secondary};
  margin-top: 0.25rem;
`;
