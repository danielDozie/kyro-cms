import crypto from 'crypto';

const DEFAULT_ALGORITHM = 'AES-256-GCM';

export function getEncryptionOptions(secret?: string, algorithm?: string) {
  return {
    key: getEncryptionKey(secret),
    algorithm: algorithm || DEFAULT_ALGORITHM,
  };
}

export function getEncryptionKey(secret?: string): string {
  const appSecret = secret || process.env.APP_SECRET || process.env.AUTH_SECRET || 'development-secret-key';
  return crypto.createHash('sha256').update(appSecret).digest('hex');
}

export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}