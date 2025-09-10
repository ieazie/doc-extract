import React, { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// Animations
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const slideIn = keyframes`
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

// Styled Components
const Backdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${props => props.theme.zIndex.modal};
  animation: ${fadeIn} 0.2s ease-out;
`;

const Dialog = styled.div`
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  animation: ${slideIn} 0.3s ease-out;
`;

const DialogHeader = styled.div<{ $type: 'success' | 'error' | 'warning' | 'info' }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  
  ${props => {
    switch (props.$type) {
      case 'success':
        return 'background: #f0fdf4;';
      case 'error':
        return 'background: #fef2f2;';
      case 'warning':
        return 'background: #fffbeb;';
      case 'info':
        return 'background: #f0f9ff;';
    }
  }}
`;

const IconContainer = styled.div<{ $type: 'success' | 'error' | 'warning' | 'info' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  
  ${props => {
    switch (props.$type) {
      case 'success':
        return 'background: #dcfce7; color: #16a34a;';
      case 'error':
        return 'background: #fecaca; color: #dc2626;';
      case 'warning':
        return 'background: #fed7aa; color: #ea580c;';
      case 'info':
        return 'background: #dbeafe; color: #2563eb;';
    }
  }}
`;

const DialogContent = styled.div`
  padding: 1.5rem;
`;

const DialogTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
`;

const DialogMessage = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
`;

const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem 1.5rem 1.5rem;
  border-top: 1px solid #e5e7eb;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  
  ${props => props.$variant === 'primary' ? `
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
    
    &:hover {
      background: #2563eb;
      border-color: #2563eb;
    }
  ` : `
    background: #f3f4f6;
    color: #374151;
    border-color: #d1d5db;
    
    &:hover {
      background: #e5e7eb;
      border-color: #9ca3af;
    }
  `}
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
`;

// Types
export interface NotificationDialogProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const NotificationDialog: React.FC<NotificationDialogProps> = ({
  isOpen,
  type,
  title,
  message,
  onClose,
  onConfirm,
  confirmText = 'OK',
  cancelText = 'Cancel',
  autoClose = false,
  autoCloseDelay = 3000
}) => {
  // Auto-close for success messages
  useEffect(() => {
    if (isOpen && autoClose && type === 'success') {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, type, autoCloseDelay, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={24} />;
      case 'error':
        return <XCircle size={24} />;
      case 'warning':
        return <AlertTriangle size={24} />;
      case 'info':
        return <Info size={24} />;
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  return (
    <Backdrop onClick={onClose}>
      <Dialog onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>
          <X size={16} />
        </CloseButton>
        
        <DialogHeader $type={type}>
          <IconContainer $type={type}>
            {getIcon()}
          </IconContainer>
          <div>
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>
        
        <DialogContent>
          <DialogMessage>{message}</DialogMessage>
        </DialogContent>
        
        <DialogActions>
          {onConfirm && (
            <ActionButton onClick={onClose}>
              {cancelText}
            </ActionButton>
          )}
          <ActionButton 
            $variant={onConfirm ? 'primary' : 'secondary'}
            onClick={handleConfirm}
          >
            {confirmText}
          </ActionButton>
        </DialogActions>
      </Dialog>
    </Backdrop>
  );
};

export default NotificationDialog;

