declare const __KYRO_API_PATH__: string;
declare const __KYRO_ADMIN_PATH__: string;
declare const __KYRO_ADMIN_AUTH_DISABLED__: boolean;

declare module 'astro:transitions/client' {
  export function navigate(href: string, options?: any): void;
}

declare namespace App {
  interface Locals {
    user?: {
      id: string;
      email: string;
      role: string;
      permissions?: string[];
      tenantId?: string;
    };
    sessionId?: string;
  }
}
