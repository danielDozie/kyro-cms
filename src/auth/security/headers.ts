export const DEFAULT_SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
};

export interface SecurityHeadersConfig {
  enableHSTS?: boolean;
  hstsMaxAge?: number;
  enableCSP?: boolean;
  cspReportOnly?: boolean;
  allowedOrigins?: string[];
  enableHPKP?: boolean;
  hpkpHashes?: { sha256: string }[];
}

export class SecurityHeaders {
  private headers: Record<string, string>;
  private config: SecurityHeadersConfig;

  constructor(config: SecurityHeadersConfig = {}) {
    this.config = {
      enableHSTS: true,
      hstsMaxAge: 31536000,
      enableCSP: true,
      ...config,
    };

    this.headers = { ...DEFAULT_SECURITY_HEADERS };

    if (!this.config.enableHSTS) {
      delete this.headers["Strict-Transport-Security"];
    }

    if (!this.config.enableCSP) {
      delete this.headers["Content-Security-Policy"];
    }

    if (config.allowedOrigins && config.allowedOrigins.length > 0) {
      const origin = config.allowedOrigins.includes("*") ? "*" : config.allowedOrigins[0];
      this.headers["Access-Control-Allow-Origin"] = origin;
      this.headers["Vary"] = "Origin";
    }
  }

  getHeaders(): Record<string, string> {
    return { ...this.headers };
  }

  addHeader(name: string, value: string): void {
    this.headers[name] = value;
  }

  removeHeader(name: string): void {
    delete this.headers[name];
  }

  updateCSP(directives: Record<string, string | string[]>): void {
    const parts: string[] = [];

    for (const [directive, values] of Object.entries(directives)) {
      if (Array.isArray(values)) {
        parts.push(`${directive} ${values.join(" ")}`);
      } else {
        parts.push(`${directive} ${values}`);
      }
    }

    this.headers["Content-Security-Policy"] = parts.join("; ");
  }

  addCORSOrigin(origin: string): void {
    this.headers["Access-Control-Allow-Origin"] = origin;
  }

  apply(response: Response, req?: Request): Response {
    const newHeaders = new Headers(response.headers);

    for (const [name, value] of Object.entries(this.headers)) {
      if (!newHeaders.has(name)) {
        newHeaders.set(name, value);
      }
    }

    if (req && this.config.allowedOrigins && this.config.allowedOrigins.length > 0) {
      const incomingOrigin = req.headers.get("Origin");
      if (incomingOrigin && (this.config.allowedOrigins.includes("*") || this.config.allowedOrigins.includes(incomingOrigin))) {
        newHeaders.set("Access-Control-Allow-Origin", incomingOrigin);
        newHeaders.set("Vary", "Origin");
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  middleware() {
    return async (
      req: Request,
      next: () => Promise<Response>,
    ): Promise<Response> => {
      const response = await next();
      return this.apply(response, req);
    };
  }
}

export function getSecurityHeadersMiddleware(securityHeaders: SecurityHeaders) {
  return async (
    req: Request,
    next: () => Promise<Response>,
  ): Promise<Response> => {
    const response = await next();
    return securityHeaders.apply(response);
  };
}

export function createSecurityHeaders(
  config?: SecurityHeadersConfig,
): SecurityHeaders {
  return new SecurityHeaders(config);
}


