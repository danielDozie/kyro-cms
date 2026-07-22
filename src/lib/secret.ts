// ============================================================================
// Secret Management Utility
// Reads secrets from DB (system global) with env fallback
// ============================================================================

import crypto from 'crypto';

let dbAdapter: any = null;
let cachedSecrets: {
  appSecret: string | null;
  encryptionKey: string | null;
  sessionConfig: {
    maxAge: number;
    maxSessionsPerUser: number;
  } | null;
} | null = null;

export function setDbAdapter(adapter: any) {
  dbAdapter = adapter;
}

function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function loadSecrets(): Promise<void> {
  // Try to load from DB first
  if (dbAdapter) {
    try {
      const result = await dbAdapter.findOne({
        collection: '_globals_system',
        where: {},
      });

      if (result) {
        cachedSecrets = {
          appSecret: result.appSecret || null,
          encryptionKey: result.encryptionKey || null,
          sessionConfig: result.sessionMaxAge || result.maxSessionsPerUser
            ? {
                maxAge: (result.sessionMaxAge || 7) * 24 * 60 * 60 * 1000,
                maxSessionsPerUser: result.maxSessionsPerUser || 3,
              }
            : null,
        };

        return;
      }
    } catch (e) {

    }
  }

  // Fall back to environment
  cachedSecrets = {
    appSecret: process.env.APP_SECRET || 'development-secret-key',
    encryptionKey: null, // Will be generated
    sessionConfig: null, // Will use defaults
  };
}

export function getAppSecret(): string {
  if (cachedSecrets?.appSecret) {
    return cachedSecrets.appSecret;
  }
  return process.env.APP_SECRET || 'development-secret-key';
}

export function getEncryptionKey(): string {
  if (cachedSecrets?.encryptionKey) {
    return cachedSecrets.encryptionKey;
  }
  // Derive from app secret if not in DB
  const secret = getAppSecret();
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export function getSessionConfig() {
  if (cachedSecrets?.sessionConfig) {
    return cachedSecrets.sessionConfig;
  }
  // Return defaults
  return {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    maxSessionsPerUser: 3,
  };
}

export function getDerivedEncryptionKey(secret?: string): string {
  const appSecret = secret || getAppSecret();
  return crypto.createHash('sha256').update(appSecret).digest('hex');
}