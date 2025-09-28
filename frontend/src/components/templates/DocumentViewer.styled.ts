import styled from 'styled-components';

export const ViewerContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
`;

export const ViewerHeader = styled.div`
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const PageControls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

export const PageButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const PageInfo = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  min-width: 80px;
  text-align: center;
`;

export const ZoomControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const ZoomButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const ZoomLevel = styled.div`
  font-size: 0.875rem;
  color: #374151;
  min-width: 60px;
  text-align: center;
`;

export const ViewerActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
  
  &:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }
`;

export const DocumentCanvas = styled.div`
  flex: 1;
  overflow: auto;
  background: #e5e7eb;
  padding: 2rem;
  position: relative;
  display: block;
`;

export const CanvasContainer = styled.div`
  background: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  overflow: visible;
  display: block;
  width: fit-content;
  margin: 0 auto;
`;

export const CanvasWrapper = styled.div`
  display: block;
  width: fit-content;
`;

export const Canvas = styled.canvas`
  display: block;
  height: auto;
`;

export const TextContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.6;
  color: #374151;
`;

export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
`;

export const LoadingText = styled.div`
  font-size: 1rem;
  color: #6b7280;
`;

export const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
`;

export const ErrorIcon = styled.div`
  font-size: 3rem;
`;

export const ErrorText = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: #dc2626;
`;

export const ErrorSubtext = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
`;
