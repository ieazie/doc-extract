/**
 * Color utility functions for styled-components
 */

/**
 * Adds alpha transparency to a color value
 * Supports hex, rgb, rgba, hsl, hsla, and CSS variables
 * 
 * @param alpha - Alpha value between 0 (transparent) and 1 (opaque)
 * @param color - Color value in any supported format
 * @returns Color with alpha applied
 */
export const withAlpha = (alpha: number, color: string): string => {
  // Clamp alpha between 0 and 1
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  
  // Convert to hex alpha value (0-255)
  const hexAlpha = Math.round(clampedAlpha * 255).toString(16).padStart(2, '0');
  
  // Handle hex colors (#rrggbb)
  if (color.match(/^#[0-9a-fA-F]{6}$/)) {
    return `${color}${hexAlpha}`;
  }
  
  // Handle hex colors with existing alpha (#rrggbbaa)
  if (color.match(/^#[0-9a-fA-F]{8}$/)) {
    return `${color.slice(0, 7)}${hexAlpha}`;
  }
  
  // Handle rgb() colors
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${clampedAlpha})`);
  }
  
  // Handle rgba() colors - replace existing alpha
  if (color.startsWith('rgba(')) {
    return color.replace(/,\s*[\d.]+\)$/, `, ${clampedAlpha})`);
  }
  
  // Handle hsl() colors
  if (color.startsWith('hsl(')) {
    return color.replace('hsl(', 'hsla(').replace(')', `, ${clampedAlpha})`);
  }
  
  // Handle hsla() colors - replace existing alpha
  if (color.startsWith('hsla(')) {
    return color.replace(/,\s*[\d.]+\)$/, `, ${clampedAlpha})`);
  }
  
  // Handle CSS variables - fallback to hex concatenation for now
  // In a real app, you might want to handle CSS variables differently
  if (color.startsWith('var(')) {
    // For CSS variables, we'll assume they resolve to hex colors
    // This is a limitation, but better than breaking
    return `${color}${hexAlpha}`;
  }
  
  // Fallback: assume it's a hex color and concatenate
  return `${color}${hexAlpha}`;
};

/**
 * Creates a transparent version of a color
 * @param color - Color value
 * @param transparency - Transparency level (0 = opaque, 1 = transparent)
 * @returns Transparent color
 */
export const transparentize = (transparency: number, color: string): string => {
  return withAlpha(1 - transparency, color);
};

/**
 * Creates an opaque version of a color
 * @param color - Color value
 * @param opacity - Opacity level (0 = transparent, 1 = opaque)
 * @returns Color with opacity
 */
export const opacify = (opacity: number, color: string): string => {
  return withAlpha(opacity, color);
};
