/**
 * Source Location Highlighter
 * Highlights specific areas on document preview based on field coordinates
 */
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { MapPin, Eye, EyeOff } from 'lucide-react';

// Types
interface SourceLocation {
  page: number;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  text: string;
  confidence?: number;
}

interface SourceLocationHighlighterProps {
  documentImage: HTMLImageElement | null;
  sourceLocation: SourceLocation | null;
  isVisible: boolean;
  onToggleVisibility: () => void;
  className?: string;
}

// Styled Components
const Container = styled.div`
  position: relative;
  display: inline-block;
  max-width: 100%;
`;

const ImageContainer = styled.div`
  position: relative;
  display: inline-block;
  max-width: 100%;
`;

const DocumentImage = styled.img`
  max-width: 100%;
  height: auto;
  display: block;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  background: white;
`;

const HighlightOverlay = styled.div<{ 
  $coordinates: { x: number; y: number; width: number; height: number };
  $isVisible: boolean;
  $confidence?: number;
}>`
  position: absolute;
  left: ${props => props.$coordinates.x}%;
  top: ${props => props.$coordinates.y}%;
  width: ${props => props.$coordinates.width}%;
  height: ${props => props.$coordinates.height}%;
  background-color: ${props => {
    if (!props.$isVisible) return 'transparent';
    if (props.$confidence !== undefined) {
      if (props.$confidence >= 0.9) return 'rgba(34, 197, 94, 0.3)'; // green
      if (props.$confidence >= 0.7) return 'rgba(251, 191, 36, 0.3)'; // yellow
      return 'rgba(239, 68, 68, 0.3)'; // red
    }
    return 'rgba(59, 130, 246, 0.3)'; // blue
  }};
  border: 2px solid ${props => {
    if (!props.$isVisible) return 'transparent';
    if (props.$confidence !== undefined) {
      if (props.$confidence >= 0.9) return '#22c55e'; // green
      if (props.$confidence >= 0.7) return '#fbbf24'; // yellow
      return '#ef4444'; // red
    }
    return '#3b82f6'; // blue
  }};
  border-radius: 0.25rem;
  pointer-events: none;
  transition: all 0.3s ease;
  z-index: 10;
  
  ${props => props.$isVisible && `
    animation: highlightPulse 2s ease-in-out infinite;
  `}
  
  @keyframes highlightPulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
  }
`;

const HighlightTooltip = styled.div<{ 
  $coordinates: { x: number; y: number; width: number; height: number };
  $isVisible: boolean;
}>`
  position: absolute;
  left: ${props => props.$coordinates.x}%;
  top: ${props => props.$coordinates.y - 5}%;
  transform: translateY(-100%);
  background: #1f2937;
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  z-index: 20;
  pointer-events: none;
  opacity: ${props => props.$isVisible ? 1 : 0};
  transition: opacity 0.3s ease;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: #1f2937;
  }
`;

const Controls = styled.div`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.5rem;
  z-index: 30;
`;

const ControlButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 0.25rem;
  background: ${props => props.$active ? '#3b82f6' : 'rgba(255, 255, 255, 0.9)'};
  color: ${props => props.$active ? 'white' : '#374151'};
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  
  &:hover {
    background: ${props => props.$active ? '#2563eb' : 'white'};
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }
`;

const SourceInfo = styled.div<{ $isVisible: boolean }>`
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  right: 0.5rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 0.75rem;
  font-size: 0.75rem;
  opacity: ${props => props.$isVisible ? 1 : 0};
  transition: opacity 0.3s ease;
  z-index: 20;
`;

const SourceText = styled.div`
  color: #374151;
  margin-bottom: 0.25rem;
  font-weight: 500;
`;

const SourceDetails = styled.div`
  color: #6b7280;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ConfidenceBadge = styled.span<{ $confidence: number }>`
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 500;
  background-color: ${props => {
    if (props.$confidence >= 0.9) return '#dcfce7';
    if (props.$confidence >= 0.7) return '#fef3c7';
    return '#fee2e2';
  }};
  color: ${props => {
    if (props.$confidence >= 0.9) return '#166534';
    if (props.$confidence >= 0.7) return '#92400e';
    return '#991b1b';
  }};
`;

export const SourceLocationHighlighter: React.FC<SourceLocationHighlighterProps> = ({
  documentImage,
  sourceLocation,
  isVisible,
  onToggleVisibility,
  className
}) => {
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handleImageLoad = () => {
      if (imageRef.current) {
        setImageDimensions({
          width: imageRef.current.offsetWidth,
          height: imageRef.current.offsetHeight
        });
      }
    };

    const image = imageRef.current;
    if (image) {
      if (image.complete) {
        handleImageLoad();
      } else {
        image.addEventListener('load', handleImageLoad);
        return () => image.removeEventListener('load', handleImageLoad);
      }
    }
  }, [documentImage]);

  if (!documentImage || !sourceLocation) {
    return null;
  }

  return (
    <Container className={className}>
      <ImageContainer>
        <DocumentImage
          ref={imageRef}
          src={documentImage.src}
          alt="Document with source highlighting"
        />
        
        {sourceLocation && (
          <>
            <HighlightOverlay
              $coordinates={sourceLocation.coordinates}
              $isVisible={isVisible}
              $confidence={sourceLocation.confidence}
            />
            
            <HighlightTooltip
              $coordinates={sourceLocation.coordinates}
              $isVisible={isVisible}
            >
              {sourceLocation.text}
            </HighlightTooltip>
          </>
        )}
        
        <Controls>
          <ControlButton
            $active={isVisible}
            onClick={onToggleVisibility}
            title={isVisible ? 'Hide highlighting' : 'Show highlighting'}
          >
            {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </ControlButton>
        </Controls>
        
        {sourceLocation && (
          <SourceInfo $isVisible={isVisible}>
            <SourceText>{sourceLocation.text}</SourceText>
            <SourceDetails>
              <span>Page {sourceLocation.page}</span>
              {sourceLocation.confidence !== undefined && (
                <ConfidenceBadge $confidence={sourceLocation.confidence}>
                  {Math.round(sourceLocation.confidence * 100)}% confidence
                </ConfidenceBadge>
              )}
            </SourceDetails>
          </SourceInfo>
        )}
      </ImageContainer>
    </Container>
  );
};

export default SourceLocationHighlighter;
