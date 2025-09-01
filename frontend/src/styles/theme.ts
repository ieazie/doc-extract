/**
 * Theme configuration for styled-components
 */

export const theme = {
  colors: {
    // Primary brand colors
    primary: '#2563eb',      // Blue
    primaryHover: '#1d4ed8',
    primaryLight: '#3b82f6',
    primaryDark: '#1e40af',
    
    // Secondary colors
    secondary: '#64748b',    // Slate
    secondaryHover: '#475569',
    secondaryLight: '#94a3b8',
    secondaryDark: '#334155',
    
    // Status colors
    success: '#10b981',      // Emerald
    successLight: '#34d399',
    warning: '#f59e0b',      // Amber
    warningLight: '#fbbf24',
    error: '#ef4444',        // Red
    errorLight: '#f87171',
    
    // Background colors
    background: '#f8fafc',   // Very light gray
    surface: '#ffffff',      // White
    surfaceHover: '#f1f5f9',
    
    // Border colors
    border: '#e2e8f0',       // Light gray
    borderHover: '#cbd5e1',
    borderFocus: '#3b82f6',
    
    // Text colors
    text: {
      primary: '#1e293b',    // Dark slate
      secondary: '#64748b',  // Medium slate
      muted: '#94a3b8',      // Light slate
      inverse: '#ffffff',    // White text
      accent: '#2563eb',     // Primary blue
    },
    
    // Confidence score colors
    confidence: {
      high: '#10b981',       // Green for > 0.8
      medium: '#f59e0b',     // Orange for 0.5 - 0.8
      low: '#ef4444',        // Red for < 0.5
    },
    
    // Semantic colors
    info: '#0ea5e9',         // Sky blue
    neutral: '#6b7280',      // Gray
  },
  
  typography: {
    fonts: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
      mono: "'Fira Code', 'Monaco', 'Cascadia Code', 'Consolas', monospace",
      heading: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    
    sizes: {
      xs: '0.75rem',         // 12px
      sm: '0.875rem',        // 14px
      base: '1rem',          // 16px
      lg: '1.125rem',        // 18px
      xl: '1.25rem',         // 20px
      '2xl': '1.5rem',       // 24px
      '3xl': '1.875rem',     // 30px
      '4xl': '2.25rem',      // 36px
      '5xl': '3rem',         // 48px
    },
    
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },
  
  spacing: {
    xs: '0.25rem',           // 4px
    sm: '0.5rem',            // 8px
    md: '1rem',              // 16px
    lg: '1.5rem',            // 24px
    xl: '2rem',              // 32px
    '2xl': '3rem',           // 48px
    '3xl': '4rem',           // 64px
    '4xl': '6rem',           // 96px
    '5xl': '8rem',           // 128px
  },
  
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },
  
  borderRadius: {
    none: '0',
    sm: '0.125rem',          // 2px
    md: '0.375rem',          // 6px
    lg: '0.5rem',            // 8px
    xl: '0.75rem',           // 12px
    '2xl': '1rem',           // 16px
    full: '9999px',
  },
  
  zIndex: {
    auto: 'auto',
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
    toast: 1070,
  },
  
  animation: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
    },
    
    easing: {
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
};

export type Theme = typeof theme;

// Helper functions for responsive design
export const mediaQuery = {
  sm: `@media (min-width: ${theme.breakpoints.sm})`,
  md: `@media (min-width: ${theme.breakpoints.md})`,
  lg: `@media (min-width: ${theme.breakpoints.lg})`,
  xl: `@media (min-width: ${theme.breakpoints.xl})`,
  '2xl': `@media (min-width: ${theme.breakpoints['2xl']})`,
};

// Color utilities
export const rgba = (color: string, alpha: number) => `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;

export default theme;

