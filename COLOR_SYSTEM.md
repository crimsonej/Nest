# NEST Color System

## Overview
The NEST design system uses a sophisticated color system built on CSS variables, providing true theme support and easy customization. All colors are defined as CSS variables and integrated with Tailwind CSS for seamless usage.

## Color Variables

### Base Colors (:root - Light Theme)
```css
:root {
  --color-primary: #24586a;           /* Harbor Blue */
  --color-primary-hover: #1b4656;
  --color-primary-light: #e5f0f2;
  
  --color-secondary: #a95535;         /* Warm Brown */
  --color-secondary-hover: #88432c;
  
  --color-success: #28725b;           /* Green */
  --color-success-light: #e4f2eb;
  
  --color-warning: #835a18;           /* Amber */
  --color-warning-light: #f7efd9;
  
  --color-danger: #a43d48;            /* Rose */
  --color-danger-light: #f8e9e8;
  
  --color-background: #eaf1f3;        /* Page Background */
  --color-surface: #fbfdfe;           /* Card/Surface Background */
  --color-surface-hover: #e0eaed;     /* Surface Hover */
  
  --color-border: #cbd9de;            /* Border Color */
  --color-text-primary: #192a30;      /* Primary Text */
  --color-text-secondary: #465a60;    /* Secondary Text */
  --color-text-muted: #687a80;        /* Muted Text */
  
  --color-ambient-one: #6b9fa8;       /* Accent Colors */
  --color-ambient-two: #c98565;
}
```

### Dark Theme (html.dark)
```css
html.dark {
  --color-primary: #347987;
  --color-primary-hover: #286573;
  --color-primary-light: #203a40;
  
  --color-secondary: #bd704e;
  --color-secondary-hover: #a95a3a;
  
  --color-success: #64ad8c;
  --color-success-light: #1c352d;
  
  --color-warning: #d2aa60;
  --color-warning-light: #39311e;
  
  --color-danger: #dc7775;
  --color-danger-light: #3a2528;
  
  --color-background: #121b22;
  --color-surface: #1d2a32;
  --color-surface-hover: #2a3a43;
  
  --color-border: #3a4c55;
  --color-text-primary: #edf3f2;
  --color-text-secondary: #c0cecf;
  --color-text-muted: #93a5a8;
  
  --color-ambient-one: #347987;
  --color-ambient-two: #bd704e;
}
```

### Crimson Palette (html[data-palette='crimson'])
```css
html[data-palette='crimson'] {
  --color-primary: #963b4b;           /* Crimson Red */
  --color-primary-hover: #7a2e3d;
  --color-primary-light: #f5e7ea;
  
  --color-secondary: #836227;         /* Olive Brown */
  --color-secondary-hover: #6a4f20;
  
  /* Success, Warning, Danger remain consistent across palettes */
  --color-success: #28725b;
  --color-success-light: #e4f2eb;
  --color-warning: #835a18;
  --color-warning-light: #f7efd9;
  --color-danger: #a43d48;
  --color-danger-light: #f8e9e8;
  
  /* Backgrounds adjusted for crimson theme */
  --color-background: #f3e9ec;
  --color-surface: #fffafb;
  --color-surface-hover: #eddee3;
  --color-border: #dfcbd2;
  --color-text-primary: #302126;
  --color-text-secondary: #5e4b51;
  --color-text-muted: #806d73;
  
  --color-ambient-one: #b76070;
  --color-ambient-two: #c6a76a;
}
```

### Canopy Palette (html[data-palette='canopy'])
```css
html[data-palette='canopy'] {
  --color-primary: #2c6249;           /* Forest Green */
  --color-primary-hover: #214f3a;
  --color-primary-light: #e6f0e9;
  
  --color-secondary: #456b86;         /* Steel Blue */
  --color-secondary-hover: #35566d;
  
  /* Success, Warning, Danger remain consistent across palettes */
  --color-success: #28725b;
  --color-success-light: #e4f2eb;
  --color-warning: #835a18;
  --color-warning-light: #f7efd9;
  --color-danger: #a43d48;
  --color-danger-light: #f8e9e8;
  
  /* Backgrounds adjusted for canopy theme */
  --color-background: #eaf1eb;
  --color-surface: #fbfdfb;
  --color-surface-hover: #e0eae2;
  --color-border: #ccdbd0;
  --color-text-primary: #1c2b22;
  --color-text-secondary: #4a5d50;
  --color-text-muted: #6a7c70;
  
  --color-ambient-one: #5e9b75;
  --color-ambient-two: #668ca5;
}
```

## Theme Mechanism

Themes are switched by changing the `data-palette` attribute on the html element:
- Default (Harbor): No `data-palette` attribute or `data-palette='harbor'`
- Crimson: `data-palette='crimson'`
- Canopy: `data-palette='canopy'`

Dark mode is automatically applied based on system preference or can be forced by adding the `dark` class to the html element.

## Usage Guidelines

### In CSS/SCSS
```css
/* Direct variable usage */
.element {
  background-color: var(--color-primary);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

/* With color mixing for shades and tints */
.element-subtle {
  background-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
}

/* For hover states */
.element:hover {
  background-color: var(--color-primary-hover);
  transform: translateY(-2px);
}
```

### In Tailwind CSS
Tailwind is configured to automatically map semantic names to CSS variables:

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: 'var(--color-primary)',
      'primary-hover': 'var(--color-primary-hover)',
      secondary: 'var(--color-secondary)',
      success: 'var(--color-success)',
      danger: 'var(--color-danger)',
      // ... etc
    }
  }
}
```

This allows usage like:
```jsx
<div className="bg-primary text-primary-hover">
  {/* Uses var(--color-primary) and var(--color-primary-hover) */}
</div>
```

### In JavaScript/TypeScript
Use the provided color utilities:

```typescript
import { colorShade, colorBlend } from '@/lib/colors';

// Create a 50% shade of primary color
const primaryShade = colorShade('--color-primary', 0.5);
// Returns: "color-mix(in srgb, var(--color-primary) 50%, transparent)"

// Blend primary and secondary colors at 30% ratio
const blended = colorBlend('--color-primary', '--color-secondary', 0.3);
// Returns: "color-mix(in srgb, var(--color-primary) 70%, var(--color-secondary) 30%)"
```

## Component Usage Examples

### Button Variants
```tsx
// Primary Button (uses CSS variables)
<button className="bg-gradient-to-r from-primary to-primary-hover">
  Primary Action
</button>

// Danger Button (updated to use CSS variables)
<button className="bg-gradient-to-r from-[var(--color-danger)] to-[var(--color-danger-light)]">
  Delete Action
</button>

// Success Button (updated to use CSS variables)
<button className="bg-gradient-to-r from-[var(--color-success)] to-[var(--color-success-light)]">
  Save Action
</button>
```

### Focus Rings
```tsx
// Standard focus ring (uses CSS variables)
<input 
  className="focus-[var(--color-primary)]/20"
  placeholder="Enter text..."
/>

// Subtle focus ring
<button 
  className="focus-[var(--color-primary)]/10"
>
  Subtle Action
</button>
```

### Gradients and Effects
```tsx
// Gradient using CSS variables
<div className="bg-gradient-to-r from-primary via-secondary to-success">
  Tri-color Gradient
</div>

// Shadow with color variable
<div className="shadow-[var(--color-primary)]/30">
  Elevated Element
</div>
```

## Best Practices

1. **Always Use CSS Variables**: Prefer `var(--color-*` over hardcoded color values
2. **Leverage Tailwind Mapping**: Use Tailwind's semantic color classes when available
3. **Use Arbitrary Variable Syntax**: For direct CSS variable use in Tailwind: `from-[var(--color-primary)]`
4. **Maintain Theme Consistency**: Ensure colors work across all themes/palettes
5. **Respect Accessibility**: Verify contrast ratios meet WCAG guidelines
6. **Use Utilities**: Leverage `colorShade` and `colorBlend` for programmatic color manipulation

## Accessibility

All color combinations in the design system have been tested for WCAG AA compliance:
- Primary text on background: 4.5:1 contrast ratio
- Secondary text on surface: 3:1 contrast ratio for large text
- Accent colors meet minimum contrast requirements when used appropriately

## Extending the System

To add new semantic colors:
1. Add the variable to `:root` in `src/styles/globals.css`
2. Add dark mode overrides in `html.dark` if needed
3. Add to Tailwind configuration in `tailwind.config.js`
4. Update any theme-specific overrides in the palette sections
5. Add corresponding utility types if needed

## Troubleshooting

### Colors Not Updating
- Ensure you're using CSS variables, not hardcoded values
- Check that the Tailwind build process is working
- Verify the html element has the correct `data-palette` attribute

### Theme Not Persisting
- Check localStorage for `nest-color-palette` key
- Ensure the PaletteInitializer provider is working correctly

### Contrast Issues
- Use the browser's accessibility tools to check contrast ratios
- Consider adjusting color values in the CSS variables if needed