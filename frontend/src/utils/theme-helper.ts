/**
 * Theme helper utilities for mapping color structures
 */

// Map old gray color structure to new theme colors
export const getThemeColor = (theme: any, colorPath: string): string => {
  // Handle gray color mappings
  if (colorPath.includes('gray')) {
    const shade = colorPath.split('[')[1]?.split(']')[0];
    
    switch (shade) {
      case '50': return '#f8fafc';
      case '100': return '#f1f5f9';
      case '200': return theme.colors.border;
      case '300': return theme.colors.borderHover;
      case '400': return theme.colors.text.muted;
      case '500': return theme.colors.neutral;
      case '600': return theme.colors.text.secondary;
      case '700': return theme.colors.secondary;
      case '800': return theme.colors.secondaryDark;
      case '900': return theme.colors.text.primary;
      default: return theme.colors.text.secondary;
    }
  }
  
  // Handle blue color mappings
  if (colorPath.includes('blue')) {
    const shade = colorPath.split('[')[1]?.split(']')[0];
    
    switch (shade) {
      case '50': return '#eff6ff';
      case '100': return '#dbeafe';
      case '200': return '#bfdbfe';
      case '300': return '#93c5fd';
      case '400': return '#60a5fa';
      case '500': return theme.colors.primary;
      case '600': return theme.colors.primary;
      case '700': return theme.colors.primaryHover;
      case '800': return theme.colors.primaryDark;
      case '900': return '#1e3a8a';
      default: return theme.colors.primary;
    }
  }
  
  // Handle green color mappings
  if (colorPath.includes('green')) {
    const shade = colorPath.split('[')[1]?.split(']')[0];
    
    switch (shade) {
      case '50': return '#ecfdf5';
      case '100': return '#d1fae5';
      case '200': return '#a7f3d0';
      case '500': return theme.colors.success;
      case '600': return theme.colors.success;
      case '700': return '#047857';
      case '800': return '#065f46';
      default: return theme.colors.success;
    }
  }
  
  // Handle red color mappings
  if (colorPath.includes('red')) {
    const shade = colorPath.split('[')[1]?.split(']')[0];
    
    switch (shade) {
      case '50': return '#fef2f2';
      case '100': return '#fee2e2';
      case '200': return '#fecaca';
      case '500': return theme.colors.error;
      case '600': return theme.colors.error;
      case '700': return '#b91c1c';
      case '800': return '#991b1b';
      default: return theme.colors.error;
    }
  }
  
  // Handle yellow color mappings
  if (colorPath.includes('yellow')) {
    const shade = colorPath.split('[')[1]?.split(']')[0];
    
    switch (shade) {
      case '50': return '#fffbeb';
      case '100': return '#fef3c7';
      case '200': return '#fde68a';
      case '500': return theme.colors.warning;
      case '600': return theme.colors.warning;
      case '700': return '#d97706';
      default: return theme.colors.warning;
    }
  }
  
  // Default fallback
  return theme.colors.text.secondary;
};

// Color palette for backward compatibility
export const colors = {
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#6b7280',
    600: '#64748b',
    700: '#475569',
    800: '#334155',
    900: '#1e293b'
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a'
  },
  green: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46'
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b'
  },
  yellow: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309'
  },
  white: '#ffffff'
};

export default { getThemeColor, colors };

