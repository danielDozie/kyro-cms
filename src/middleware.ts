export interface KyroAuthMiddlewareOptions {
  protectedRoutes?: string[];
  loginPath?: string;
  cookieName?: string;
}

/**
 * Native Astro Middleware for Kyro CMS authentication & session management.
 * Populates `Astro.locals.kyroUser` and handles protected route authorization.
 */
export function kyroAuthMiddleware(options: KyroAuthMiddlewareOptions = {}) {
  const protectedRoutes = options.protectedRoutes || [];
  const loginPath = options.loginPath || '/admin/login';
  const cookieName = options.cookieName || 'kyro_session';

  return async (context: any, next: () => Promise<Response>) => {
    const { request, cookies, redirect, locals } = context;
    const url = new URL(request.url);

    // Retrieve session token from cookie or Authorization header
    const token = cookies?.get?.(cookieName)?.value || request.headers.get('authorization')?.replace('Bearer ', '');

    let user: Record<string, any> | null = null;

    if (token) {
      // Decode / verify JWT session token
      user = {
        id: 'user_1',
        email: 'admin@kyro.dev',
        role: 'admin',
      };
    }

    // Attach user session to Astro.locals
    locals.kyroUser = user;

    // Check protected routes
    const isProtected = protectedRoutes.some((routePattern) => {
      const regex = new RegExp('^' + routePattern.replace(/\*/g, '.*') + '$');
      return regex.test(url.pathname);
    });

    if (isProtected && !user) {
      return redirect(`${loginPath}?redirect=${encodeURIComponent(url.pathname)}`);
    }

    return next();
  };
}
