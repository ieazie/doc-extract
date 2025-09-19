/**
 * Styled Components for Document List
 * Following frontend styling rules with theme values
 */
import styled from 'styled-components';

export const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const Title = styled.h1`
  color: ${props => props.theme.colors.text.primary};
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
`;

export const SearchInput = styled.input`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  font-size: 1rem;
  min-width: 300px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}30;
  }
`;

export const DocumentGrid = styled.div`
  display: grid;
  gap: 1rem;
  margin-bottom: 2rem;
`;

export const DocumentCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: ${props => props.theme.shadows.sm};
  border: 1px solid ${props => props.theme.colors.border};
  transition: all 0.2s ease;

  &:hover {
    box-shadow: ${props => props.theme.shadows.md};
    border-color: ${props => props.theme.colors.primary};
  }
`;

export const DocumentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
`;

export const DocumentTitle = styled.h3`
  color: ${props => props.theme.colors.text.primary};
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  flex: 1;
  word-break: break-word;
`;

export const StatusBadge = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  
  ${props => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'completed': return props.theme.colors.success;
        case 'processing': return props.theme.colors.warning;
        case 'failed': return props.theme.colors.error;
        default: return props.theme.colors.neutral;
      }
    };
    
    const color = getStatusColor(props.status);
    return `
      background: ${color}15;
      color: ${color};
      border: 1px solid ${color}30;
    `;
  }}
`;

export const DocumentMeta = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: ${props => props.theme.colors.text.secondary};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
`;

export const CategoryBadge = styled.span<{ color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  background: ${props => `${props.color}15`};
  color: ${props => props.color};
  border: 1px solid ${props => `${props.color}30`};
`;

export const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

export const Tag = styled.span`
  background: ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text.secondary};
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
`;

export const DocumentActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
`;

export const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.2s ease;

  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: ${props.theme.colors.primary};
          color: white;
          border-color: ${props.theme.colors.primary};
          &:hover { background: ${props.theme.colors.primaryHover}; }
        `;
      case 'danger':
        return `
          background: ${props.theme.colors.error};
          color: white;
          border-color: ${props.theme.colors.error};
          &:hover { background: ${props.theme.colors.error}dd; }
        `;
      default:
        return `
          background: ${props.theme.colors.surface};
          color: ${props.theme.colors.text.secondary};
          border-color: ${props.theme.colors.border};
          &:hover { background: ${props.theme.colors.surfaceHover}; }
        `;
    }
  }}
`;

export const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${props => props.theme.colors.text.muted};
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${props => props.theme.colors.text.muted};
`;

export const ErrorState = styled.div`
  background: ${props => props.theme.colors.error}15;
  border: 1px solid ${props => props.theme.colors.error}30;
  color: ${props => props.theme.colors.error};
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 2rem;
`;

export const LanguageConfidenceText = styled.span`
  color: ${props => props.theme.colors.text.muted};
  font-size: ${props => props.theme.typography.sizes.sm};
`;
