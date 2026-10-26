/**
 * Animation utility functions for handling motion preferences
 * Provides helpers for respecting user's prefers-reduced-motion setting
 */

 import { useEffect, useState } from 'react';

 /**
  * Custom hook to detect if user has requested reduced motion
  * @returns Boolean indicating if reduced motion is preferred
  */
 export const useReducedMotion = (): boolean => {
   const [reducedMotion, setReducedMotion] = useState(false);

   useEffect(() => {
     // Check if reduced motion is preferred
     const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

     // Set initial value
     setReducedMotion(mediaQuery.matches);

     // Create listener for changes
     const listener = (event: MediaQueryListEvent) => {
       setReducedMotion(event.matches);
     };

     // Add listener
     mediaQuery.addEventListener('change', listener);

     // Cleanup
     return () => {
       mediaQuery.removeEventListener('change', listener);
     };
   }, []);

   return reducedMotion;
 };

 /**
  * Get the appropriate animation configuration based on motion preferences
  * @param normalConfig - Animation config for normal motion
  * @param reducedConfig - Animation config for reduced motion (optional)
  * @returns Appropriate animation config based on user preference
  */
 export const getAnimationConfig = <T extends Record<string, any>>(
   normalConfig: T,
   reducedConfig: Partial<T> = {}
 ): T => {
   // Get reduced motion preference
   if (typeof window !== 'undefined') {
     const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
     return reducedMotion ? { ...normalConfig, ...reducedConfig } : normalConfig;
   }
   // SSR fallback
   return { ...normalConfig, ...reducedConfig };
 };

 /**
  * Animation presets that respect motion preferences
  * These can be used directly in components
  */
 export const animationPresets = {
   /** Button hover animation */
   buttonHover: {
     normal: { scale: 1.02 },
     reduced: {} // No animation when reduced motion is preferred
   },

   /** Button tap/press animation */
   buttonTap: {
     normal: { scale: 0.97 },
     reduced: {} // No animation when reduced motion is preferred
   },

   /** Card hover animation */
   cardHover: {
     normal: { y: -2 },
     reduced: {} // No animation when reduced motion is preferred
   },

   /** Card tap animation */
   cardTap: {
     normal: { scale: 0.99 },
     reduced: {} // No animation when reduced motion is preferred
   },

   /** Floating orb animation */
   floatingOrb: {
     normal: {
       animation: 'float-orb 16s ease-in-out infinite alternate'
     },
     reduced: {
       animation: 'none'
     }
   },
 };

 /**
  * Helper to conditionally apply animation based on motion preferences
  * @param reducedMotion - Boolean from useReducedMotion hook
  * @param normalProps - Animation props for normal motion
  * @param reducedProps - Animation props for reduced motion (optional)
  * @returns Appropriate animation props
  */
export const applyMotionPreference = (
   reducedMotion: boolean,
  normalProps: any,
  reducedProps: any = {}
): any => {
  return reducedMotion ? reducedProps : normalProps;
 };