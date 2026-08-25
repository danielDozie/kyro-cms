// ============================================================================
// Styling System Abstraction
// ============================================================================

export type StylingMode = 'css' | 'tailwind' | 'css-in-js' | 'styled-components' | 'vanilla-extract';

export interface StylingConfig {
  mode: StylingMode;
  theme?: ThemeConfig;
  customProperties?: Record<string, string>;
}

export interface ThemeConfig {
  colors?: ThemeColors;
  fonts?: ThemeFonts;
  spacing?: ThemeSpacing;
  borderRadius?: ThemeBorderRadius;
  shadows?: ThemeShadows;
  breakpoints?: Record<string, string>;
}

export interface ThemeColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  surface?: string;
  text?: string;
  textMuted?: string;
  border?: string;
  error?: string;
  warning?: string;
  success?: string;
  info?: string;
}

export interface ThemeFonts {
  sans?: string;
  serif?: string;
  mono?: string;
}

export interface ThemeSpacing {
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  '2xl'?: string;
  '3xl'?: string;
  '4xl'?: string;
}

export interface ThemeBorderRadius {
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  full?: string;
}

export interface ThemeShadows {
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
}

// ============================================================================
// CSS Generator
// ============================================================================

export class CSSGenerator {
  private css: string[] = [];

  constructor(private config: StylingConfig) {}

  addRule(selector: string, properties: Record<string, string>): this {
    const props = Object.entries(properties)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');
    this.css.push(`${selector} {\n${props}\n}`);
    return this;
  }

  addMediaQuery(breakpoint: string, rules: string[]): this {
    this.css.push(`@media (min-width: ${breakpoint}) {\n  ${rules.join('\n  ')}\n}`);
    return this;
  }

  generate(): string {
    return this.css.join('\n\n');
  }
}

// ============================================================================
// Tailwind Config Generator
// ============================================================================

export function generateTailwindConfig(theme: ThemeConfig): Record<string, any> {
  return {
    theme: {
      extend: {
        colors: theme.colors || {},
        fontFamily: theme.fonts || {},
        spacing: theme.spacing || {},
        borderRadius: theme.borderRadius || {},
        boxShadow: theme.shadows || {},
        screens: theme.breakpoints || {},
      },
    },
  };
}

// ============================================================================
// Default Themes
// ============================================================================

export const defaultLightTheme: ThemeConfig = {
  colors: {
    primary: '#3b82f6',
    secondary: '#6366f1',
    accent: '#ec4899',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#111827',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
  },
  fonts: {
    sans: 'system-ui, -apple-system, sans-serif',
    serif: 'Georgia, serif',
    mono: 'Menlo, monospace',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  borderRadius: {
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
};

export const defaultDarkTheme: ThemeConfig = {
  colors: {
    primary: '#60a5fa',
    secondary: '#818cf8',
    accent: '#f472b6',
    background: '#111827',
    surface: '#1f2937',
    text: '#f9fafb',
    textMuted: '#9ca3af',
    border: '#374151',
    error: '#f87171',
    warning: '#fbbf24',
    success: '#34d399',
    info: '#60a5fa',
  },
  fonts: defaultLightTheme.fonts,
  spacing: defaultLightTheme.spacing,
  borderRadius: defaultLightTheme.borderRadius,
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.4)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.6)',
  },
};

// ============================================================================
// E-Commerce Theme (2026 Design Engine)
// ============================================================================

export const ecommerce2026Theme: ThemeConfig = {
  colors: {
    primary: '#FF6B35',
    secondary: '#1A1A2E',
    accent: '#16C79A',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    text: '#1A1A2E',
    textMuted: '#6B7280',
    border: '#E5E7EB',
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#16C79A',
    info: '#3B82F6',
  },
  fonts: {
    sans: '"Inter", "Satoshi", system-ui, sans-serif',
    serif: '"Playfair Display", Georgia, serif',
    mono: '"JetBrains Mono", monospace',
  },
  spacing: {
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '2rem',
    '3xl': '3rem',
    '4xl': '4rem',
  },
  borderRadius: {
    sm: '0',
    md: '0',
    lg: '0',
    xl: '0',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.07)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
    xl: '0 20px 25px rgba(0,0,0,0.15)',
  },
};

// ============================================================================
// CSS Variables Generator
// ============================================================================

export function generateCSSVariables(theme: ThemeConfig): string {
  const variables: string[] = [];

  // Colors
  if (theme.colors) {
    for (const [key, value] of Object.entries(theme.colors)) {
      variables.push(`  --color-${key}: ${value};`);
    }
  }

  // Fonts
  if (theme.fonts) {
    for (const [key, value] of Object.entries(theme.fonts)) {
      variables.push(`  --font-${key}: ${value};`);
    }
  }

  // Spacing
  if (theme.spacing) {
    for (const [key, value] of Object.entries(theme.spacing)) {
      variables.push(`  --spacing-${key}: ${value};`);
    }
  }

  // Border Radius
  if (theme.borderRadius) {
    for (const [key, value] of Object.entries(theme.borderRadius)) {
      variables.push(`  --radius-${key}: ${value};`);
    }
  }

  // Shadows
  if (theme.shadows) {
    for (const [key, value] of Object.entries(theme.shadows)) {
      variables.push(`  --shadow-${key}: ${value};`);
    }
  }

  return `:root {\n${variables.join('\n')}\n}`;
}

// ============================================================================
// Admin Styling Config
// ============================================================================

export interface AdminStylingConfig {
  mode: StylingMode;
  theme?: ThemeConfig;
  customStyles?: string;
  componentOverrides?: Record<string, Record<string, string>>;
}

export function createAdminStyling(config: AdminStylingConfig): string {
  const cssVars = generateCSSVariables(config.theme || defaultLightTheme);
  const componentStyles: string[] = [];

  // Generate component overrides
  if (config.componentOverrides) {
    for (const [selector, styles] of Object.entries(config.componentOverrides)) {
      const props = Object.entries(styles)
        .map(([k, v]) => `  ${k}: ${v};`)
        .join('\n');
      componentStyles.push(`${selector} {\n${props}\n}`);
    }
  }

  return `
    ${cssVars}
    ${config.customStyles || ''}
    ${componentStyles.join('\n')}
  `;
}

// ============================================================================
// Field Styling
// ============================================================================

export interface FieldStyling {
  wrapper?: Record<string, string>;
  label?: Record<string, string>;
  input?: Record<string, string>;
  error?: Record<string, string>;
  description?: Record<string, string>;
}

export const defaultFieldStyling: Record<string, FieldStyling> = {
  text: {
    wrapper: { marginBottom: 'var(--spacing-md)' },
    label: { 
      display: 'block', 
      marginBottom: 'var(--spacing-xs)',
      fontWeight: '500',
      color: 'var(--color-text)',
    },
    input: {
      width: '100%',
      padding: 'var(--spacing-sm) var(--spacing-md)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      fontSize: '0.875rem',
    },
    error: {
      color: 'var(--color-error)',
      fontSize: '0.75rem',
      marginTop: 'var(--spacing-xs)',
    },
  },
  number: {
    wrapper: { marginBottom: 'var(--spacing-md)' },
    label: { display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: '500' },
    input: {
      width: '100%',
      padding: 'var(--spacing-sm) var(--spacing-md)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
    },
  },
  checkbox: {
    wrapper: { display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' },
    input: { width: '1rem', height: '1rem' },
    label: { cursor: 'pointer' },
  },
  select: {
    wrapper: { marginBottom: 'var(--spacing-md)' },
    input: {
      width: '100%',
      padding: 'var(--spacing-sm) var(--spacing-md)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'white',
    },
  },
};

export * from './tokens.js';

