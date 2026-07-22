import crypto from "crypto";
import { getSessionConfig } from "../../lib/secret.js";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";

// Get session config from DB or defaults
const sessionConfig = getSessionConfig();

export const SESSION_CONFIG = {
  absoluteMaxAge: sessionConfig.maxAge,
  maxSessionsPerUser: sessionConfig.maxSessionsPerUser,
  refreshThreshold: 5 * 60 * 1000,
  activityDebounce: 30 * 1000,
  pollInterval: 30 * 1000,
};

const SESSION_COOKIE_NAME = "kyro-session";

export interface SessionData {
  id: string;
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
  permissions?: string[];
  createdAt: number;
  expiresAt: number;
  lastActivityAt: number;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    platform?: string;
    browser?: string;
    device?: string;
  };
  sessionName?: string;
}

export interface UserSessionInfo {
  id: string;
  sessionName: string;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    platform?: string;
    browser?: string;
    device?: string;
  };
  createdAt: number;
  lastActivityAt: number;
  currentSession: boolean;
}

let storage: any = null;

async function getStorage() {
  if (storage) return storage;

  storage = createStorage({
    driver: fsDriver({ base: ".astro/sessions" }),
  });

  return storage;
}

function generateSessionId(): string {
  return crypto.randomUUID();
}

function parseUserAgent(userAgent: string): {
  browser: string;
  device: string;
  platform: string;
} {
  let browser = "Unknown";
  let device = "Unknown";
  let platform = "Unknown";

  if (userAgent.includes("Firefox")) {
    browser = "Firefox";
  } else if (userAgent.includes("Edg/")) {
    browser = "Edge";
  } else if (userAgent.includes("Chrome")) {
    browser = "Chrome";
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    browser = "Safari";
  }

  if (userAgent.includes("iPhone")) {
    device = "iPhone";
    platform = "iOS";
  } else if (userAgent.includes("iPad")) {
    device = "iPad";
    platform = "iOS";
  } else if (userAgent.includes("Mac")) {
    device = "MacBook";
    platform = "macOS";
  } else if (userAgent.includes("Windows")) {
    device = "Windows PC";
    platform = "Windows";
  } else if (userAgent.includes("Linux")) {
    device = "Linux PC";
    platform = "Linux";
  } else if (userAgent.includes("Android")) {
    device = "Android Phone";
    platform = "Android";
  }

  return { browser, device, platform };
}

function generateSessionName(deviceInfo?: SessionData["deviceInfo"]): string {
  if (!deviceInfo?.userAgent) {
    return "Session";
  }

  const { browser, device } = parseUserAgent(deviceInfo.userAgent);
  return `${device} - ${browser}`;
}

export function getSessionIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => c.split("=")),
  );

  return cookies[SESSION_COOKIE_NAME] || null;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

export function setSessionCookie(
  response: Response,
  sessionId: string,
): Response {
  const isProd = process.env.NODE_ENV === "production";
  const secureFlag = isProd ? "Secure; " : "";
  const headers = new Headers(response.headers);
  headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${sessionId}; HttpOnly; Path=/; Max-Age=${SESSION_CONFIG.absoluteMaxAge / 1000}; SameSite=Strict; ${secureFlag}`,
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function clearSessionCookie(response: Response): Response {
  const isProd = process.env.NODE_ENV === "production";
  const secureFlag = isProd ? "Secure; " : "";
  const headers = new Headers(response.headers);
  headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; ${secureFlag}`,
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function getUserSessionList(userId: string): Promise<string[]> {
  const store = await getStorage();
  const sessions = await store.getItem(`user:${userId}`);
  return sessions || [];
}

async function setUserSessionList(
  userId: string,
  sessionIds: string[],
): Promise<void> {
  const store = await getStorage();
  if (sessionIds.length > 0) {
    await store.setItem(`user:${userId}`, sessionIds);
  } else {
    await store.removeItem(`user:${userId}`);
  }
}

export async function createSession(
  user: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
    permissions?: string[];
  },
  request?: Request,
): Promise<string> {
  const store = await getStorage();

  // Get existing sessions for user
  const existingSessions = await getUserSessionList(user.id);

  // Enforce max sessions - remove oldest if at limit
  while (existingSessions.length >= SESSION_CONFIG.maxSessionsPerUser) {
    const oldestSessionId = existingSessions.shift();
    if (oldestSessionId) {
      await store.removeItem(`session:${oldestSessionId}`);
    }
  }

  const sessionId = generateSessionId();
  const now = Date.now();

  const userAgent = request?.headers.get("user-agent");
  const clientIp = request ? getClientIp(request) : "unknown";

  const deviceInfo = userAgent
    ? {
        userAgent,
        ip: clientIp,
        ...parseUserAgent(userAgent),
      }
    : { ip: clientIp };

  const sessionData: SessionData = {
    id: sessionId,
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    permissions: user.permissions,
    createdAt: now,
    expiresAt: now + SESSION_CONFIG.absoluteMaxAge,
    lastActivityAt: now,
    deviceInfo,
    sessionName: generateSessionName(deviceInfo),
  };

  await store.setItem(
    `session:${sessionId}`,
    sessionData,
    { ttl: Math.floor(SESSION_CONFIG.absoluteMaxAge / 1000) },
  );

  // Add to user's session list
  existingSessions.push(sessionId);
  await setUserSessionList(user.id, existingSessions);

  return sessionId;
}

export async function getSession(
  sessionId: string,
): Promise<SessionData | null> {
  const store = await getStorage();
  const session = await store.getItem(`session:${sessionId}`);
  return session || null;
}

export async function validateSession(
  sessionId: string,
): Promise<{ valid: boolean; reason?: string }> {
  const session = await getSession(sessionId);

  if (!session) {
    return { valid: false, reason: "Session not found" };
  }

  // Check absolute expiration
  if (session.expiresAt < Date.now()) {
    await deleteSession(sessionId);
    return { valid: false, reason: "Session expired" };
  }

  return { valid: true };
}

export async function refreshSession(
  sessionId: string,
  request?: Request,
): Promise<SessionData | null> {
  const store = await getStorage();
  const session = await getSession(sessionId);

  if (!session) return null;

  // Update last activity and extend TTL if needed
  const now = Date.now();
  const timeRemaining = session.expiresAt - now;

  // Update device info if IP changed
  let deviceInfo = session.deviceInfo;
  if (request) {
    const newIp = getClientIp(request);
    if (newIp !== session.deviceInfo?.ip) {
      deviceInfo = { ...session.deviceInfo, ip: newIp };
    }
  }

  const updatedSession: SessionData = {
    ...session,
    lastActivityAt: now,
    expiresAt:
      timeRemaining < SESSION_CONFIG.refreshThreshold
        ? now + SESSION_CONFIG.absoluteMaxAge
        : session.expiresAt,
    deviceInfo,
  };

  const ttl =
    timeRemaining < SESSION_CONFIG.refreshThreshold
      ? SESSION_CONFIG.absoluteMaxAge
      : undefined;

  await store.setItem(
    `session:${sessionId}`,
    updatedSession,
    ttl ? { ttl: Math.floor(ttl / 1000) } : undefined,
  );

  return updatedSession;
}



export async function deleteSession(sessionId: string): Promise<void> {
  const store = await getStorage();
  const session = await getSession(sessionId);

  if (session) {
    // Remove from user's session list
    const sessions = await getUserSessionList(session.userId);
    const updatedSessions = sessions.filter((id) => id !== sessionId);
    await setUserSessionList(session.userId, updatedSessions);
  }

  await store.removeItem(`session:${sessionId}`);
  await store.removeItem(`activity:${sessionId}`);
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  const sessions = await getUserSessionList(userId);
  const store = await getStorage();

  for (const sessionId of sessions) {
    await store.removeItem(`session:${sessionId}`);
    await store.removeItem(`activity:${sessionId}`);
  }

  await setUserSessionList(userId, []);
}

export async function getUserSessions(
  userId: string,
  currentSessionId?: string,
): Promise<UserSessionInfo[]> {
  const sessionIds = await getUserSessionList(userId);
  const sessions: UserSessionInfo[] = [];

  for (const sessionId of sessionIds) {
    const session = await getSession(sessionId);
    if (session) {
      sessions.push({
        id: session.id,
        sessionName: session.sessionName || "Session",
        deviceInfo: session.deviceInfo,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
        currentSession: session.id === currentSessionId,
      });
    }
  }

  // Sort by last activity (most recent first)
  sessions.sort((a, b) => b.lastActivityAt - a.lastActivityAt);

  return sessions;
}

export async function updateSessionName(
  sessionId: string,
  name: string,
): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session) return false;

  const store = await getStorage();
  await store.setItem(`session:${sessionId}`, { ...session, sessionName: name });

  return true;
}

export async function getCurrentUser(
  request: Request,
): Promise<SessionData | null> {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return null;

  const validation = await validateSession(sessionId);
  if (!validation.valid) return null;

  const session = await getSession(sessionId);
  if (!session) return null;

  // Update activity on each request
  await refreshSession(sessionId, request);

  return session;
}


