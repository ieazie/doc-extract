/**
 * Source Location Context
 * Manages source location highlighting state across components
 */
import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  fieldName?: string;
  fieldType?: string;
}

interface SourceLocationContextType {
  // Current highlighted source location
  currentSourceLocation: SourceLocation | null;
  
  // Highlighting visibility
  isHighlightingVisible: boolean;
  
  // Actions
  setSourceLocation: (location: SourceLocation | null) => void;
  toggleHighlighting: () => void;
  clearHighlighting: () => void;
  
  // Navigation
  navigateToPage: (page: number) => void;
  currentPage: number;
}

// Create context
const SourceLocationContext = createContext<SourceLocationContextType | undefined>(undefined);

// Provider component
interface SourceLocationProviderProps {
  children: ReactNode;
  initialPage?: number;
}

export const SourceLocationProvider: React.FC<SourceLocationProviderProps> = ({
  children,
  initialPage = 1
}) => {
  const [currentSourceLocation, setCurrentSourceLocation] = useState<SourceLocation | null>(null);
  const [isHighlightingVisible, setIsHighlightingVisible] = useState(true);
  const [currentPage, setCurrentPage] = useState(initialPage);

  const setSourceLocation = (location: SourceLocation | null) => {
    setCurrentSourceLocation(location);
    
    // Auto-navigate to the page if location is set
    if (location) {
      setCurrentPage(location.page);
    }
  };

  const toggleHighlighting = () => {
    setIsHighlightingVisible(prev => !prev);
  };

  const clearHighlighting = () => {
    setCurrentSourceLocation(null);
  };

  const navigateToPage = (page: number) => {
    setCurrentPage(page);
  };

  const value: SourceLocationContextType = {
    currentSourceLocation,
    isHighlightingVisible,
    setSourceLocation,
    toggleHighlighting,
    clearHighlighting,
    navigateToPage,
    currentPage
  };

  return (
    <SourceLocationContext.Provider value={value}>
      {children}
    </SourceLocationContext.Provider>
  );
};

// Hook to use the context
export const useSourceLocation = (): SourceLocationContextType => {
  const context = useContext(SourceLocationContext);
  if (context === undefined) {
    throw new Error('useSourceLocation must be used within a SourceLocationProvider');
  }
  return context;
};

// Helper function to create source location from field data
export const createSourceLocation = (
  fieldName: string,
  fieldType: string,
  coordinates: { x: number; y: number; width: number; height: number },
  text: string,
  page: number = 1,
  confidence?: number
): SourceLocation => ({
  page,
  coordinates,
  text,
  confidence,
  fieldName,
  fieldType
});

// Helper function to convert absolute coordinates to percentages
export const convertToPercentageCoordinates = (
  absoluteCoords: { x: number; y: number; width: number; height: number },
  imageDimensions: { width: number; height: number }
): { x: number; y: number; width: number; height: number } => ({
  x: (absoluteCoords.x / imageDimensions.width) * 100,
  y: (absoluteCoords.y / imageDimensions.height) * 100,
  width: (absoluteCoords.width / imageDimensions.width) * 100,
  height: (absoluteCoords.height / imageDimensions.height) * 100
});

export default SourceLocationContext;
