/**
 * View Mode Selector
 * Allows users to switch between different result display modes
 */
import React from 'react';
import styled from 'styled-components';
import { 
  TreePine, 
  Table, 
  Grid3X3, 
  Code, 
  GitCompare
} from 'lucide-react';

export type ViewMode = 'hierarchical' | 'table' | 'cards' | 'json' | 'comparison';

interface ViewModeSelectorProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  availableModes?: ViewMode[];
  className?: string;
}

const Container = styled.div`
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  background: #f3f4f6;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
`;

const ModeButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 0.375rem;
  background: ${props => props.$active ? 'white' : 'transparent'};
  color: ${props => props.$active ? '#1f2937' : '#6b7280'};
  font-size: 0.875rem;
  font-weight: ${props => props.$active ? '600' : '500'};
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: ${props => props.$active ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'};
  
  &:hover {
    background: ${props => props.$active ? 'white' : '#e5e7eb'};
    color: #1f2937;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ModeIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const modeConfig = {
  hierarchical: {
    icon: TreePine,
    label: 'Tree',
    description: 'Hierarchical tree view'
  },
  table: {
    icon: Table,
    label: 'Table',
    description: 'Tabular view'
  },
  cards: {
    icon: Grid3X3,
    label: 'Cards',
    description: 'Card-based layout'
  },
  json: {
    icon: Code,
    label: 'JSON',
    description: 'Raw JSON view'
  },
  comparison: {
    icon: GitCompare,
    label: 'Compare',
    description: 'Compare extractions'
  }
};

export const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
  currentMode,
  onModeChange,
  availableModes = ['hierarchical', 'table', 'cards', 'json'],
  className
}) => {
  return (
    <Container className={className}>
      {availableModes.map((mode) => {
        const config = modeConfig[mode];
        const Icon = config.icon;
        
        return (
          <ModeButton
            key={mode}
            $active={currentMode === mode}
            onClick={() => onModeChange(mode)}
            title={config.description}
          >
            <ModeIcon>
              <Icon size={16} />
            </ModeIcon>
            {config.label}
          </ModeButton>
        );
      })}
    </Container>
  );
};

export default ViewModeSelector;
