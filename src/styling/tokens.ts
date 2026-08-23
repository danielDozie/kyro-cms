import type { ThemeConfig } from './index.js';

export interface DesignTokens {
  colors: Record<string, string>;
  fonts: Record<string, string>;
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  custom?: Record<string, string>;
}

export function extractDesignTokens(theme?: ThemeConfig): DesignTokens {
  return {
    colors: {
      primary: theme?.colors?.primary || '#10b981',
      secondary: theme?.colors?.secondary || '#64748b',
      accent: theme?.colors?.accent || '#3b82f6',
      background: theme?.colors?.background || '#ffffff',
      surface: theme?.colors?.surface || '#f8fafc',
      text: theme?.colors?.text || '#0f172a',
      textMuted: theme?.colors?.textMuted || '#94a3b8',
      border: theme?.colors?.border || '#e2e8f0',
      error: theme?.colors?.error || '#ef4444',
      warning: theme?.colors?.warning || '#f59e0b',
      success: theme?.colors?.success || '#10b981',
      info: theme?.colors?.info || '#06b6d4',
    },
    fonts: {
      sans: theme?.fonts?.sans || 'system-ui, -apple-system, sans-serif',
      serif: theme?.fonts?.serif || 'Georgia, serif',
      mono: theme?.fonts?.mono || 'monospace',
    },
    spacing: {
      xs: theme?.spacing?.xs || '0.25rem',
      sm: theme?.spacing?.sm || '0.5rem',
      md: theme?.spacing?.md || '1rem',
      lg: theme?.spacing?.lg || '1.5rem',
      xl: theme?.spacing?.xl || '2rem',
    },
    borderRadius: {
      sm: theme?.borderRadius?.sm || '0.25rem',
      md: theme?.borderRadius?.md || '0.5rem',
      lg: theme?.borderRadius?.lg || '0.75rem',
      xl: theme?.borderRadius?.xl || '1rem',
      full: theme?.borderRadius?.full || '9999px',
    },
    shadows: {
      sm: theme?.shadows?.sm || '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: theme?.shadows?.md || '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: theme?.shadows?.lg || '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    },
  };
}

/**
 * Exports design tokens into raw CSS custom properties string (:root { ... })
 */
export function exportTokensAsCss(tokens: DesignTokens): string {
  const lines: string[] = [':root {'];

  for (const [key, val] of Object.entries(tokens.colors)) {
    lines.push(`  --kyro-color-${key}: ${val};`);
  }
  for (const [key, val] of Object.entries(tokens.fonts)) {
    lines.push(`  --kyro-font-${key}: ${val};`);
  }
  for (const [key, val] of Object.entries(tokens.spacing)) {
    lines.push(`  --kyro-spacing-${key}: ${val};`);
  }
  for (const [key, val] of Object.entries(tokens.borderRadius)) {
    lines.push(`  --kyro-radius-${key}: ${val};`);
  }
  for (const [key, val] of Object.entries(tokens.shadows)) {
    lines.push(`  --kyro-shadow-${key}: ${val};`);
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Exports design tokens as a Tailwind CSS configuration object
 */
export function exportTokensAsTailwind(tokens: DesignTokens): Record<string, any> {
  return {
    theme: {
      extend: {
        colors: {
          kyro: tokens.colors,
        },
        fontFamily: tokens.fonts,
        spacing: tokens.spacing,
        borderRadius: tokens.borderRadius,
        boxShadow: tokens.shadows,
      },
    },
  };
}
