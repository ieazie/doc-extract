import React, { useState } from 'react';
import styled from 'styled-components';
import { Info, AlertCircle } from 'lucide-react';

const TooltipContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: help;
`;

const InfoIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${props => props.theme.colors.info}20;
  color: ${props => props.theme.colors.info};
  margin-left: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.info}30;
  }
`;

const Tooltip = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: white;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-width: 240px;
  white-space: normal;
  opacity: ${props => props.$visible ? 1 : 0};
  visibility: ${props => props.$visible ? 'visible' : 'hidden'};
  transition: all 0.15s ease;
  font-size: 0.75rem;
  line-height: 1.3;
  font-weight: 400;

  &::before {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-bottom-color: #1f2937;
  }
`;

const TooltipText = styled.div`
  color: white;
  line-height: 1.3;
`;

const WarningIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${props => props.theme.colors.warning}20;
  color: ${props => props.theme.colors.warning};
  margin-left: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.warning}30;
  }
`;

interface InfoTooltipProps {
  content: string;
  type?: 'info' | 'warning';
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, type = 'info' }) => {
  const [visible, setVisible] = useState(false);

  return (
    <TooltipContainer
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {type === 'warning' ? (
        <WarningIcon>
          <AlertCircle size={12} />
        </WarningIcon>
      ) : (
        <InfoIcon>
          <Info size={12} />
        </InfoIcon>
      )}
      <Tooltip $visible={visible}>
        <TooltipText>{content}</TooltipText>
      </Tooltip>
    </TooltipContainer>
  );
};

export default InfoTooltip;
