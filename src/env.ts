export interface KyroEnvSchemaOptions {
  requireDatabase?: boolean;
}

/**
 * Type-safe environment variable schema helper for Astro 5 (`astro:env`).
 */
export function kyroEnvSchema(options: KyroEnvSchemaOptions = {}) {
  return {
    APP_SECRET: {
      context: 'server' as const,
      access: 'secret' as const,
      type: 'string' as const,
      optional: false,
    },
    DATABASE_URL: {
      context: 'server' as const,
      access: 'secret' as const,
      type: 'string' as const,
      optional: !options.requireDatabase,
    },
    PUBLIC_KYRO_URL: {
      context: 'client' as const,
      access: 'public' as const,
      type: 'string' as const,
      optional: true,
      default: 'http://localhost:4321',
    },
  };
}
