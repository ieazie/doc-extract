/**
 * Styled Components for Language Configuration
 * Following frontend styling rules with theme values
 */
import styled from 'styled-components';

export const ConfigurationContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.lg};
`;

export const SectionCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.lg};
  box-shadow: ${props => props.theme.shadows.sm};
  border: 1px solid ${props => props.theme.colors.border};
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.md};
`;

export const SectionTitle = styled.h3`
  font-size: ${props => props.theme.typography.sizes.lg};
  font-weight: ${props => props.theme.typography.weights.semibold};
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
  font-family: ${props => props.theme.typography.fonts.heading};
`;

export const FormGroup = styled.div`
  margin-bottom: ${props => props.theme.spacing.lg};
`;

export const Label = styled.label`
  display: block;
  font-weight: ${props => props.theme.typography.weights.medium};
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: ${props => props.theme.spacing.sm};
  font-size: ${props => props.theme.typography.sizes.sm};
`;

export const MultiSelectContainer = styled.div`
  position: relative;
`;

export const MultiSelectDropdown = styled.div`
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background: ${props => props.theme.colors.surface};
  min-height: 2.5rem;
  padding: ${props => props.theme.spacing.sm};
  display: flex;
  flex-wrap: wrap;
  gap: ${props => props.theme.spacing.xs};
  cursor: pointer;
  
  &:focus-within {
    outline: none;
    border-color: ${props => props.theme.colors.borderFocus};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary + '1a'};
  }
`;

export const SelectedLanguage = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  background: ${props => props.theme.colors.primary + '0f'};
  color: ${props => props.theme.colors.primary};
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.sizes.sm};
  font-weight: ${props => props.theme.typography.weights.medium};
`;

export const RemoveButton = styled.button.attrs({ type: 'button' })`
  background: none;
  border: none;
  color: ${props => props.theme.colors.text.muted};
  cursor: pointer;
  padding: 0;
  margin-left: ${props => props.theme.spacing.xs};
  transition: color ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  
  &:hover {
    color: ${props => props.theme.colors.error};
  }
`;

export const DropdownList = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-top: none;
  border-radius: 0 0 ${props => props.theme.borderRadius.md} ${props => props.theme.borderRadius.md};
  max-height: 200px;
  overflow-y: auto;
  z-index: ${props => props.theme.zIndex.dropdown};
  display: ${props => props.$isOpen ? 'block' : 'none'};
  box-shadow: ${props => props.theme.shadows.md};
`;

export const DropdownItem = styled.div<{ $isSelected: boolean }>`
  padding: ${props => props.theme.spacing.sm};
  cursor: pointer;
  background: ${props => props.$isSelected ? props.theme.colors.primary + '0f' : props.theme.colors.surface};
  color: ${props => props.$isSelected ? props.theme.colors.primary : props.theme.colors.text.primary};
  transition: background-color ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  
  &:hover {
    background: ${props => props.$isSelected ? props.theme.colors.primary + '1a' : props.theme.colors.surfaceHover};
  }
`;

export const LanguageName = styled.span`
  font-weight: ${props => props.theme.typography.weights.medium};
`;

export const LanguageCode = styled.span`
  color: ${props => props.theme.colors.text.muted};
  font-size: ${props => props.theme.typography.sizes.sm};
  margin-left: ${props => props.theme.spacing.sm};
`;

export const SelectContainer = styled.div`
  position: relative;
`;

export const Select = styled.select`
  width: 100%;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background: ${props => props.theme.colors.surface};
  font-size: ${props => props.theme.typography.sizes.sm};
  color: ${props => props.theme.colors.text.primary};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.borderFocus};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary + '1a'};
  }
`;

export const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

export const Checkbox = styled.input`
  width: 1rem;
  height: 1rem;
  accent-color: ${props => props.theme.colors.primary};
`;

export const CheckboxLabel = styled.label`
  font-size: ${props => props.theme.typography.sizes.sm};
  color: ${props => props.theme.colors.text.secondary};
  cursor: pointer;
`;

export const HelpText = styled.p`
  font-size: ${props => props.theme.typography.sizes.xs};
  color: ${props => props.theme.colors.text.muted};
  margin: ${props => props.theme.spacing.xs} 0 0 0;
  line-height: ${props => props.theme.typography.lineHeights.normal};
`;

export const TestSection = styled.div`
  border-top: 1px solid ${props => props.theme.colors.border};
  padding-top: ${props => props.theme.spacing.lg};
  margin-top: ${props => props.theme.spacing.lg};
`;

export const TestInput = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: ${props => props.theme.spacing.sm};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.sizes.sm};
  resize: vertical;
  color: ${props => props.theme.colors.text.primary};
  background: ${props => props.theme.colors.surface};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.borderFocus};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary + '1a'};
  }
`;

export const DetectionResult = styled.div<{ $confidence: number }>`
  padding: ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.md};
  background: ${props => 
    props.$confidence > 0.7 ? props.theme.colors.success + '0f' : 
    props.$confidence > 0.4 ? props.theme.colors.warning + '0f' : props.theme.colors.error + '0f'
  };
  border: 1px solid ${props => 
    props.$confidence > 0.7 ? props.theme.colors.success + '40' : 
    props.$confidence > 0.4 ? props.theme.colors.warning + '40' : props.theme.colors.error + '40'
  };
  margin-top: ${props => props.theme.spacing.sm};
`;

export const DetectionText = styled.div`
  font-size: ${props => props.theme.typography.sizes.sm};
  color: ${props => props.theme.colors.text.primary};
`;

export const ConfidenceBar = styled.div`
  width: 100%;
  height: 4px;
  background: ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  margin-top: ${props => props.theme.spacing.sm};
  overflow: hidden;
`;

export const ConfidenceFill = styled.div<{ $width: number }>`
  height: 100%;
  width: ${props => props.$width}%;
  background: ${props => 
    props.$width > 70 ? props.theme.colors.confidence.high : 
    props.$width > 40 ? props.theme.colors.confidence.medium : props.theme.colors.confidence.low
  };
  transition: width ${props => props.theme.animation.duration.normal} ${props => props.theme.animation.easing.easeInOut};
`;

export const ActionButtons = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};
  margin-top: ${props => props.theme.spacing.lg};
`;
