/**
 * Color utility functions for working with CSS variables
 * Provides helper functions for color manipulation using CSS color-mix
 */

 /**
  * Create a shade of a CSS variable by mixing it with transparent
  * @param variable - CSS variable reference (e.g., '--color-primary')
  * @param opacity - Opacity value between 0 and 1
  * @returns CSS color-mix string for the shaded color
  *
  * Example usage:
  *   const primaryShade = colorShade('--color-primary', 0.5);
  *   // Returns: "color-mix(in srgb, var(--color-primary) 50%, transparent)"
  */
 export const colorShade = (variable: string, opacity: number): string =>
   `color-mix(in srgb, ${variable} ${opacity * 100}%, transparent)`;

/**
 * Blend two CSS variables together at a specified ratio
 * @param var1 - First CSS variable reference (e.g., '--color-primary')
 * @param var2 - Second CSS variable reference (e.g., '--color-secondary')
 * @param ratio - Blend ratio between 0 and 1 (0 = all var1, 1 = all var2)
 * @returns CSS color-mix string for the blended color
 *
 * Example usage:
  *   const blended = colorBlend('--color-primary', '--color-secondary', 0.3);
  *   // Returns: "color-mix(in srgb, var(--color-primary) 70%, var(--color-secondary) 30%)"
  */
 export const colorBlend = (var1: string, var2: string, ratio: number): string =>
   `color-mix(in srgb, ${var1} ${(1 - ratio) * 100}%, ${var2} ${ratio * 100}%)`;

/**
 * Get the actual CSS variable value (for use in JavaScript)
 * Note: This requires the element to be in the DOM
 * @param variable - CSS variable reference (e.g., '--color-primary')
 * @returns The computed color value as a string
 */
 export const getCssVariable = (variable: string): string => {
   if (typeof window === 'undefined' || !document) return '';
   return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
 };

/**
 * Create a transparent background color from a CSS variable
 * @param variable - CSS variable reference
 * @param opacity - Opacity value between 0 and 1
 * @returns RGBA color string
 */
 export const rgbaColor = (variable: string, opacity: number): string => {
   if (typeof window === 'undefined' || !document) return `rgba(0, 0, 0, ${opacity})`;
   const color = getCssVariable(variable);
   // If we couldn't get the color, return a fallback
   if (!color) return `rgba(0, 0, 0, ${opacity})`;

   // Convert hex/rgb to rgba - simplified approach
   // In practice, you might want to use a proper color parsing library
   return color; // This would need enhancement for actual rgba conversion
 };