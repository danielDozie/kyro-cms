import { Hono } from 'hono';
import type { KyroAppOptions } from '../kyro-app.js';
import { extractDesignTokens, exportTokensAsCss, exportTokensAsTailwind } from '../../../styling/tokens.js';

export function mountDesignTokensRoutes(app: Hono, options: KyroAppOptions) {
  const { registry } = options;

  // GET /api/tokens (JSON format or Tailwind configuration)
  app.get('/api/tokens', async (c) => {
    const format = c.req.query('format');
    const brandingGlobal = registry.getGlobal('branding') || registry.getGlobal('site_settings');
    const themeConfig = brandingGlobal ? (brandingGlobal as any).theme : undefined;
    const tokens = extractDesignTokens(themeConfig);

    if (format === 'tailwind') {
      return c.json(exportTokensAsTailwind(tokens));
    }

    return c.json({ data: tokens });
  });

  // GET /api/tokens.css (Raw CSS stylesheet with custom properties)
  app.get('/api/tokens.css', async (c) => {
    const brandingGlobal = registry.getGlobal('branding') || registry.getGlobal('site_settings');
    const themeConfig = brandingGlobal ? (brandingGlobal as any).theme : undefined;
    const tokens = extractDesignTokens(themeConfig);
    const css = exportTokensAsCss(tokens);

    c.header('Content-Type', 'text/css; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=3600');
    return c.body(css);
  });
}
