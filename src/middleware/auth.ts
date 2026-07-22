import type { MiddlewareHandler } from 'astro';
import { generateSessionId } from '../lib/storage/encryption.js';

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  permissions?: string[];
  createdAt: number;
  expiresAt: number;
}

const SESSION_COOKIE_NAME = 'kyro-session';
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export const onRequest: MiddlewareHandler = async (context, next) => {
  const sessionId = context.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId && context.session) {
    try {
      const sessionData = await context.session.get<SessionData>(`session:${sessionId}`);
      
      if (sessionData) {
        if (sessionData.expiresAt < Date.now()) {
          await context.session.delete(`session:${sessionId}`);
          context.cookies.delete(SESSION_COOKIE_NAME);
        } else {
          context.locals.user = {
            id: sessionData.userId,
            email: sessionData.email,
            role: sessionData.role,
            permissions: sessionData.permissions,
          };
          context.locals.sessionId = sessionId;
        }
      }
    } catch (e) {
      console.error('Session error:', e);
    }
  }

  return next();
};

export async function createUserSession(
  context: { session: any; cookies: any },
  userData: { id: string; email: string; role: string; permissions?: string[] }
): Promise<string> {
  const sessionId = generateSessionId();
  const sessionData: SessionData = {
    userId: userData.id,
    email: userData.email,
    role: userData.role,
    permissions: userData.permissions,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL,
  };

  await context.session.set(`session:${sessionId}`, sessionData);

  context.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_TTL / 1000,
    path: '/',
  });

  return sessionId;
}

export async function destroyUserSession(context: { session: any; cookies: any }): Promise<void> {
  const sessionId = context.cookies.get(SESSION_COOKIE_NAME)?.value;
  
  if (sessionId) {
    await context.session.delete(`session:${sessionId}`);
  }

  context.cookies.delete(SESSION_COOKIE_NAME);
}

export async function refreshUserSession(
  context: { session: any; cookies: any }
): Promise<void> {
  const sessionId = context.cookies.get(SESSION_COOKIE_NAME)?.value;
  
  if (sessionId && context.session) {
    const sessionData = await context.session.get(`session:${sessionId}`);
    
    if (sessionData) {
      sessionData.expiresAt = Date.now() + SESSION_TTL;
      await context.session.set(`session:${sessionId}`, sessionData);
    }
  }
}

declare global {
  namespace App {
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
}