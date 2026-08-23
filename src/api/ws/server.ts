import { WebSocketServer, WebSocket } from 'ws';
import type { KyroPubSub, KyroEvent } from './pubsub.js';
import { PresenceManager } from './presence.js';

// ============================================================================
// WebSocket Server
// ============================================================================

export interface WSServerOptions {
  port?: number;
  pubsub: KyroPubSub;
  maxConnections?: number;
  pingInterval?: number;
  requireAuth?: boolean;
  verifyToken?: (token: string) => Promise<any>;
}

export interface WSSubscription {
  channel: string;
  unsubscribe: () => void;
}

export interface WSClient {
  id: string;
  ws: WebSocket;
  subscriptions: Map<string, WSSubscription>;
  authenticated: boolean;
  user?: any;
  tenantId?: string;
  connectedAt: Date;
  lastActivity: Date;
  activeDocKey?: string;
}

export class KyroWSServer {
  private wss: WebSocketServer;
  private clients: Map<string, WSClient> = new Map();
  private pubsub: KyroPubSub;
  private options: WSServerOptions;
  private pingTimer?: NodeJS.Timer;
  public readonly presence: PresenceManager = new PresenceManager();

  constructor(options: WSServerOptions) {
    this.options = options;
    this.pubsub = options.pubsub;

    this.wss = new WebSocketServer({
      port: options.port || 8080,
    });

    this.setupServer();
    this.startPingInterval();
  }

  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const clientId = this.generateClientId();

      if (this.options.maxConnections && this.clients.size >= this.options.maxConnections) {
        ws.close(1013, 'Server at capacity');
        return;
      }

      const client: WSClient = {
        id: clientId,
        ws,
        subscriptions: new Map(),
        authenticated: false,
        connectedAt: new Date(),
        lastActivity: new Date(),
      };

      this.clients.set(clientId, client);


      // Send welcome message
      this.sendToClient(client, {
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString(),
      });

      // Handle messages
      ws.on('message', (data: Buffer) => {
        this.handleMessage(client, data);
      });

      // Handle errors
      ws.on('error', (error: Error) => {
        console.error(`[WS] Client error ${clientId}:`, error);
      });

      // Handle close
      ws.on('close', () => {
        this.handleDisconnect(client);
      });

      // Handle pong
      ws.on('pong', () => {
        client.lastActivity = new Date();
      });
    });

    this.wss.on('error', (error: Error) => {
      console.error('[WS] Server error:', error);
    });
  }

  private handleMessage(client: WSClient, data: Buffer): void {
    client.lastActivity = new Date();

    let message: any;
    try {
      message = JSON.parse(data.toString());
    } catch {
      this.sendToClient(client, {
        type: 'error',
        error: 'Invalid JSON',
      });
      return;
    }

    switch (message.type) {
      case 'authenticate':
        this.handleAuthenticate(client, message);
        break;
      case 'subscribe':
        this.handleSubscribe(client, message);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(client, message);
        break;
      case 'unsubscribeAll':
        this.handleUnsubscribeAll(client);
        break;
      case 'list':
        this.handleList(client);
        break;
      case 'ping':
        this.sendToClient(client, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      case 'presence:join':
        this.handlePresenceJoin(client, message);
        break;
      case 'presence:leave':
        this.handlePresenceLeave(client, message);
        break;
      case 'presence:cursor':
        this.handlePresenceCursor(client, message);
        break;
      case 'presence:lock':
        this.handlePresenceLock(client, message);
        break;
      case 'presence:unlock':
        this.handlePresenceUnlock(client, message);
        break;
      case 'presence:comment':
        this.handlePresenceComment(client, message);
        break;
      case 'presence:snapshot':
        this.handlePresenceSnapshot(client, message);
        break;
      default:
        this.sendToClient(client, {
          type: 'error',
          error: `Unknown message type: ${message.type}`,
        });
    }
  }

  private async handleAuthenticate(client: WSClient, message: any): Promise<void> {
    if (!this.options.requireAuth) {
      client.authenticated = true;
      this.sendToClient(client, {
        type: 'authenticated',
        success: true,
      });
      return;
    }

    if (!this.options.verifyToken) {
      client.authenticated = true;
      this.sendToClient(client, {
        type: 'authenticated',
        success: true,
      });
      return;
    }

    try {
      const user = await this.options.verifyToken(message.token);
      client.authenticated = true;
      client.user = user;
      client.tenantId = user.tenantId;
      this.sendToClient(client, {
        type: 'authenticated',
        success: true,
        user: { id: user.id, email: user.email },
      });
    } catch (error: any) {
      this.sendToClient(client, {
        type: 'authenticated',
        success: false,
        error: error.message,
      });
    }
  }

  private handleSubscribe(client: WSClient, message: any): void {
    if (this.options.requireAuth && !client.authenticated) {
      this.sendToClient(client, {
        type: 'error',
        error: 'Not authenticated',
      });
      return;
    }

    const channel = message.channel;
    if (!channel) {
      this.sendToClient(client, {
        type: 'error',
        error: 'Channel is required',
      });
      return;
    }

    // Check if already subscribed
    if (client.subscriptions.has(channel)) {
      this.sendToClient(client, {
        type: 'subscribed',
        channel,
        success: true,
        message: 'Already subscribed',
      });
      return;
    }

    // Subscribe to channel
    const unsubscribe = this.pubsub.subscribe(channel, (data: any) => {
      this.sendToClient(client, {
        type: 'event',
        channel,
        data,
        timestamp: new Date().toISOString(),
      });
    });

    client.subscriptions.set(channel, { channel, unsubscribe });

    this.sendToClient(client, {
      type: 'subscribed',
      channel,
      success: true,
    });
  }

  private handleUnsubscribe(client: WSClient, message: any): void {
    const channel = message.channel;
    if (!channel) {
      this.sendToClient(client, {
        type: 'error',
        error: 'Channel is required',
      });
      return;
    }

    const subscription = client.subscriptions.get(channel);
    if (subscription) {
      subscription.unsubscribe();
      client.subscriptions.delete(channel);
      this.sendToClient(client, {
        type: 'unsubscribed',
        channel,
        success: true,
      });
    } else {
      this.sendToClient(client, {
        type: 'unsubscribed',
        channel,
        success: false,
        message: 'Not subscribed',
      });
    }
  }

  private handleUnsubscribeAll(client: WSClient): void {
    for (const [, subscription] of client.subscriptions) {
      subscription.unsubscribe();
    }
    client.subscriptions.clear();

    this.sendToClient(client, {
      type: 'unsubscribedAll',
      success: true,
    });
  }

  private handleList(client: WSClient): void {
    const channels = this.pubsub.getChannels();
    this.sendToClient(client, {
      type: 'channels',
      channels,
      count: channels.length,
    });
  }

  private handlePresenceJoin(client: WSClient, message: any): void {
    const { docKey, user } = message;
    if (!docKey || !user || !user.id) {
      this.sendToClient(client, { type: 'error', error: 'docKey and user object with id are required for presence:join' });
      return;
    }

    client.activeDocKey = docKey;
    const users = this.presence.join(docKey, user);
    const channel = `presence:${docKey}`;

    // Auto-subscribe client to room presence channel
    if (!client.subscriptions.has(channel)) {
      const unsubscribe = this.pubsub.subscribe(channel, (data: any) => {
        this.sendToClient(client, { type: 'event', channel, data, timestamp: new Date().toISOString() });
      });
      client.subscriptions.set(channel, { channel, unsubscribe });
    }

    this.sendToClient(client, {
      type: 'presence:joined',
      docKey,
      users,
      snapshot: this.presence.getSnapshot(docKey),
    });

    // Broadcast updated presence to other participants
    this.pubsub.publish(channel, {
      type: 'presence:users_changed',
      docKey,
      users,
    });
  }

  private handlePresenceLeave(client: WSClient, message: any): void {
    const { docKey, userId } = message;
    if (!docKey || !userId) return;

    const { remainingUsers, releasedLocks } = this.presence.leave(docKey, userId);
    client.activeDocKey = undefined;

    const channel = `presence:${docKey}`;
    this.pubsub.publish(channel, {
      type: 'presence:users_changed',
      docKey,
      users: remainingUsers,
      releasedLocks,
    });

    this.sendToClient(client, { type: 'presence:left', docKey, success: true });
  }

  private handlePresenceCursor(client: WSClient, message: any): void {
    const { docKey, userId, cursor } = message;
    if (!docKey || !userId || !cursor) return;

    const cursorState = this.presence.updateCursor(docKey, userId, cursor);
    const channel = `presence:${docKey}`;
    this.pubsub.publish(channel, {
      type: 'presence:cursor_moved',
      docKey,
      cursor: cursorState,
    });
  }

  private handlePresenceLock(client: WSClient, message: any): void {
    const { docKey, fieldName, user, ttlMs } = message;
    if (!docKey || !fieldName || !user || !user.id) {
      this.sendToClient(client, { type: 'error', error: 'docKey, fieldName, and user are required to acquire lock' });
      return;
    }

    const result = this.presence.acquireLock(docKey, fieldName, user, ttlMs);
    const channel = `presence:${docKey}`;

    if (result.success) {
      this.pubsub.publish(channel, {
        type: 'presence:field_locked',
        docKey,
        lock: result.lock,
      });
      this.sendToClient(client, { type: 'presence:lock_acquired', docKey, lock: result.lock });
    } else {
      this.sendToClient(client, {
        type: 'presence:lock_rejected',
        docKey,
        fieldName,
        currentLock: result.currentLock,
      });
    }
  }

  private handlePresenceUnlock(client: WSClient, message: any): void {
    const { docKey, fieldName, userId } = message;
    if (!docKey || !fieldName || !userId) return;

    const success = this.presence.releaseLock(docKey, fieldName, userId);
    if (success) {
      const channel = `presence:${docKey}`;
      this.pubsub.publish(channel, {
        type: 'presence:field_unlocked',
        docKey,
        fieldName,
        userId,
      });
    }
    this.sendToClient(client, { type: 'presence:unlocked', docKey, fieldName, success });
  }

  private handlePresenceComment(client: WSClient, message: any): void {
    const { docKey, comment } = message;
    if (!docKey || !comment || !comment.id) {
      this.sendToClient(client, { type: 'error', error: 'docKey and comment payload are required' });
      return;
    }

    const created = this.presence.addComment(docKey, comment);
    const channel = `presence:${docKey}`;
    this.pubsub.publish(channel, {
      type: 'presence:comment_added',
      docKey,
      comment: created,
    });
    this.sendToClient(client, { type: 'presence:comment_created', docKey, comment: created });
  }

  private handlePresenceSnapshot(client: WSClient, message: any): void {
    const { docKey } = message;
    if (!docKey) {
      this.sendToClient(client, { type: 'error', error: 'docKey is required for snapshot' });
      return;
    }

    const snapshot = this.presence.getSnapshot(docKey);
    this.sendToClient(client, { type: 'presence:snapshot', docKey, snapshot });
  }

  private handleDisconnect(client: WSClient): void {
    if (client.activeDocKey && client.user?.id) {
      const { remainingUsers, releasedLocks } = this.presence.leave(client.activeDocKey, client.user.id);
      this.pubsub.publish(`presence:${client.activeDocKey}`, {
        type: 'presence:users_changed',
        docKey: client.activeDocKey,
        users: remainingUsers,
        releasedLocks,
      });
    }

    // Unsubscribe from all channels
    for (const [, subscription] of client.subscriptions) {
      subscription.unsubscribe();
    }

    this.clients.delete(client.id);
  }

  private sendToClient(client: WSClient, data: any): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }

  private generateClientId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private startPingInterval(): void {
    if (!this.options.pingInterval) return;

    this.pingTimer = setInterval(() => {
      for (const [id, client] of this.clients) {
        if (client.ws.readyState === WebSocket.OPEN) {
          // Check if client responded to last ping
          const timeSinceLastActivity = Date.now() - client.lastActivity.getTime();
          if (timeSinceLastActivity > (this.options.pingInterval! * 3)) {

            client.ws.terminate();
            this.handleDisconnect(client);
            continue;
          }
          client.ws.ping();
        }
      }
    }, this.options.pingInterval);
  }

  // ============================================================================
  // Public API
  // ============================================================================

  broadcast(channel: string, data: any): void {
    this.pubsub.publish(channel, data);
  }

  getConnectedClients(): WSClient[] {
    return Array.from(this.clients.values());
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getSubscriptionCount(): number {
    let count = 0;
    for (const client of this.clients.values()) {
      count += client.subscriptions.size;
    }
    return count;
  }

  async close(): Promise<void> {
    if (this.pingTimer) {
      clearInterval(this.pingTimer as any);
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      client.ws.close(1001, 'Server shutting down');
    }

    // Close server
    return new Promise((resolve) => {
      this.wss.close(() => {

        resolve();
      });
    });
  }

  getServer(): WebSocketServer {
    return this.wss;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createWSServer(options: WSServerOptions): KyroWSServer {
  return new KyroWSServer(options);
}
