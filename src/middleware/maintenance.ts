import type { MiddlewareHandler } from 'astro';
// @ts-ignore
import projectConfig from 'kyro:config';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { url, cookies } = context;

  // Skip maintenance check for admin and api routes
  // We want the admin to always be accessible so you can turn maintenance OFF
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api')) {
    return next();
  }

  const config = projectConfig.default || projectConfig;
  const db = config.adapter;
  if (!db) return next();

  try {
    const siteSettings = await db.findOne({
      collection: '_globals_site-settings',
      where: {},
      draft: false,
    });

    if (siteSettings?.maintenanceEnabled) {
      const bypassToken = siteSettings.maintenance?.bypassToken;
      const urlToken = url.searchParams.get('bypass');
      const cookieToken = cookies.get('kyro-maintenance-bypass')?.value;

      // Check for bypass token in URL
      if (urlToken === bypassToken && bypassToken) {
        cookies.set('kyro-maintenance-bypass', bypassToken, {
          path: '/',
          maxAge: 60 * 60 * 24 // 24 hours
        });
        return next();
      }

      // Check for bypass token in cookie
      if (cookieToken === bypassToken && bypassToken) {
        return next();
      }

      // Serve Maintenance Page
      return new Response(
        `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Maintenance - ${siteSettings.siteName || 'Site'}</title>
          <style>
            :root { --primary: #6366f1; --bg: #f9fafb; --text: #1f2937; --text-muted: #6b7280; }
            body { 
              font-family: 'Inter', -apple-system, sans-serif; 
              background: var(--bg); 
              color: var(--text); 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0;
            }
            .card { 
              background: white; 
              padding: 3rem; 
              border-radius: 1.5rem; 
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); 
              max-width: 400px; 
              width: 90%;
              text-align: center;
            }
            h1 { font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem; }
            p { line-height: 1.6; color: var(--text-muted); margin-bottom: 2rem; }
            .badge { 
              display: inline-block; 
              padding: 0.25rem 0.75rem; 
              background: #fee2e2; 
              color: #b91c1c; 
              border-radius: 9999px; 
              font-size: 0.75rem; 
              font-weight: 700; 
              text-transform: ; 
              margin-bottom: 1.5rem;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Offline</div>
            <h1>Maintenance in Progress</h1>
            <p>${siteSettings.maintenance?.message || "We're currently performing scheduled maintenance. Please check back soon!"}</p>
            <div style="font-size: 0.7rem; opacity: 0.5;">
              &copy; ${new Date().getFullYear()} ${siteSettings.siteName || 'Kyro CMS'}
            </div>
          </div>
        </body>
        </html>`,
        {
          status: 503,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }
  } catch (e) {
    console.error('[Maintenance Middleware] Error:', e);
  }

  return next();
};
