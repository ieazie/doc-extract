import React from 'react';
import styled from 'styled-components';
import { GitBranch, Plus, Minus, AlertTriangle } from 'lucide-react';

const DiffContainer = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1rem;
`;

const DiffHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
`;

const DiffItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.4;
`;

const DiffItemAdded = styled(DiffItem)`
  background: ${props => props.theme.colors.successLight}20;
  border-left: 3px solid ${props => props.theme.colors.success};
`;

const DiffItemRemoved = styled(DiffItem)`
  background: ${props => props.theme.colors.errorLight}20;
  border-left: 3px solid ${props => props.theme.colors.error};
`;

const DiffItemModified = styled(DiffItem)`
  background: ${props => props.theme.colors.warningLight}20;
  border-left: 3px solid ${props => props.theme.colors.warning};
`;

const DiffIcon = styled.div<{ $type: 'add' | 'remove' | 'modify' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2px;

  ${props => {
    switch (props.$type) {
      case 'add':
        return `
          background: ${props.theme.colors.successLight};
          color: ${props.theme.colors.success};
        `;
      case 'remove':
        return `
          background: ${props.theme.colors.errorLight};
          color: ${props.theme.colors.error};
        `;
      case 'modify':
        return `
          background: ${props.theme.colors.warningLight};
          color: ${props.theme.colors.warning};
        `;
    }
  }}
`;

const DiffContent = styled.div`
  flex: 1;
`;

const DiffField = styled.div`
  font-weight: 500;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 0.25rem;
`;

const DiffValue = styled.div`
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 0.8rem;
  color: ${props => props.theme.colors.text.secondary};
  word-break: break-all;
`;

const DiffOldValue = styled.div`
  color: ${props => props.theme.colors.error};
  text-decoration: line-through;
  margin-bottom: 0.25rem;
`;

const DiffNewValue = styled.div`
  color: ${props => props.theme.colors.success};
`;

const WarningMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: ${props => props.theme.colors.warningLight}20;
  border: 1px solid ${props => props.theme.colors.warning}40;
  border-radius: 8px;
  color: ${props => props.theme.colors.warning};
  font-size: 0.875rem;
  margin-top: 1rem;
`;

interface DiffChange {
  type: 'add' | 'remove' | 'modify';
  field: string;
  oldValue?: any;
  newValue?: any;
}

interface ConfigDiffPreviewProps {
  changes: DiffChange[];
  warnings?: string[];
}

const ConfigDiffPreview: React.FC<ConfigDiffPreviewProps> = ({ changes, warnings = [] }) => {
  if (changes.length === 0) {
    return null;
  }

  const renderValue = (value: any) => {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const renderChange = (change: DiffChange, index: number) => {
    const IconComponent = change.type === 'add' ? Plus : 
                         change.type === 'remove' ? Minus : 
                         GitBranch;

    const ContainerComponent = change.type === 'add' ? DiffItemAdded :
                              change.type === 'remove' ? DiffItemRemoved :
                              DiffItemModified;

    return (
      <ContainerComponent key={index}>
        <DiffIcon $type={change.type}>
          <IconComponent size={12} />
        </DiffIcon>
        <DiffContent>
          <DiffField>{change.field}</DiffField>
          {change.type === 'modify' && change.oldValue !== undefined && (
            <DiffOldValue>{renderValue(change.oldValue)}</DiffOldValue>
          )}
          {(change.type === 'add' || change.type === 'modify') && change.newValue !== undefined && (
            <DiffNewValue>{renderValue(change.newValue)}</DiffNewValue>
          )}
          {change.type === 'remove' && change.oldValue !== undefined && (
            <DiffValue>{renderValue(change.oldValue)}</DiffValue>
          )}
        </DiffContent>
      </ContainerComponent>
    );
  };

  return (
    <DiffContainer>
      <DiffHeader>
        <GitBranch size={16} />
        Configuration Changes ({changes.length})
      </DiffHeader>
      
      {changes.map(renderChange)}
      
      {warnings.length > 0 && warnings.map((warning, index) => (
        <WarningMessage key={index}>
          <AlertTriangle size={16} />
          {warning}
        </WarningMessage>
      ))}
    </DiffContainer>
  );
};

export default ConfigDiffPreview;
