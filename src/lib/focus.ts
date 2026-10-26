/**
 * Focus utility functions and classes
 * Provides standardized focus ring utilities for consistent accessibility
 */

/**
 * Focus ring classes using CSS variables
 * These provide consistent focus rings that adapt to the current theme/palette
 */
 export const focusRing = {
   /** Primary focus ring - uses the primary color from the design system */
   primary: 'focus-[var(--color-primary)]/40',

   /** Secondary focus ring - uses the secondary color from the design system */
   secondary: 'focus-[var(--color-secondary)]/40',

   /** Success focus ring - uses the success color from the design system */
   success: 'focus-[var(--color-success)]/40',

   /** Warning focus ring - uses the warning color from the design system */
   warning: 'focus-[var(--color-warning)]/40',

   /** Danger focus ring - uses the danger color from the design system */
   danger: 'focus-[var(--color-danger)]/40',

   /** Light focus ring - subtle focus indication */
   light: 'focus-[var(--color-primary)]/10',

   /** None - for when no focus ring is desired */
   none: 'focus-ring-0 focus-visible:outline-none',
 };

/**
 * Focus ring intensity variants
 */
 export const focusRingIntensity = {
   /** Subtle focus ring */
   subtle: '/10',

   /** Default focus ring */
   default: '/20',

   /** Strong focus ring */
   strong: '/40',

   /** Intense focus ring */
   intense: '/60',
 };

/**
 * Create a focus ring class string with variable and intensity
 * @param variable - CSS variable (defaults to primary)
 * @param intensity - Opacity intensity (defaults to default)
 * @returns Focus ring class string
 */
 export const focusRingClass = (
   variable: keyof typeof focusRing = 'primary',
   intensity: keyof typeof focusRingIntensity = 'default'
 ): string => {
   const base = focusRing[variable];
   const intensityValue = focusRingIntensity[intensity];

   // Extract the variable part and apply the intensity
   if (base.includes('[')) {
     // Format: focus-[var(--color-primary)]/40 -> we want to replace the intensity
     return base.replace(/\/\d+$/, intensityValue);
   }

   // Fallback for other formats
   return `${base}${intensityValue}`;
 };

/**
 * Focus ring presets for common use cases
 */
 export const focusRingPresets = {
   /** Standard input focus ring */
   input: 'focus-[var(--color-primary)]/20',

   /** Button focus ring */
   button: 'focus-[var(--color-primary)]/30',

   /** Form element focus ring */
   form: 'focus-[var(--color-primary)]/20',

   /** Interactive element focus ring */
   interactive: 'focus-[var(--color-primary)]/25',
 };