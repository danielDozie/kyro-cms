import { WebSocket, WebSocketServer } from 'ws';

type EventHandler = (data: any) => void | Promise<void>;
declare class PubSub {
    private channels;
    private maxListeners;
    constructor(maxListeners?: number);
    subscribe(channel: string, handler: EventHandler): () => void;
    publish(channel: string, data: any): void;
    hasSubscribers(channel: string): boolean;
    getSubscriberCount(channel: string): number;
    getChannels(): string[];
    clear(): void;
}
interface KyroEvent {
    type: 'create' | 'update' | 'delete';
    collection: string;
    doc?: any;
    originalDoc?: any;
    id?: string;
    tenantId?: string;
    timestamp: string;
    user?: any;
}
declare class KyroPubSub extends PubSub {
    private registry;
    constructor(registry: any, maxListeners?: number);
    publishCollectionEvent(collection: string, event: KyroEvent): void;
    subscribeToCollection(collection: string, handler: EventHandler): () => void;
    subscribeToCollectionEvent(collection: string, eventType: 'create' | 'update' | 'delete', handler: EventHandler): () => void;
    subscribeToTenant(tenantId: string, handler: EventHandler): () => void;
    subscribeToTenantCollection(tenantId: string, collection: string, handler: EventHandler): () => void;
    subscribeToAllCollections(handler: EventHandler): () => void;
    createAfterChangeHook(collection: string): (args: any) => Promise<void>;
    createAfterDeleteHook(collection: string): (args: any) => Promise<void>;
    autoRegisterHooks(): void;
}

interface WSServerOptions {
    port?: number;
    pubsub: KyroPubSub;
    maxConnections?: number;
    pingInterval?: number;
    requireAuth?: boolean;
    verifyToken?: (token: string) => Promise<any>;
}
interface WSSubscription {
    channel: string;
    unsubscribe: () => void;
}
interface WSClient {
    id: string;
    ws: WebSocket;
    subscriptions: Map<string, WSSubscription>;
    authenticated: boolean;
    user?: any;
    tenantId?: string;
    connectedAt: Date;
    lastActivity: Date;
}
declare class KyroWSServer {
    private wss;
    private clients;
    private pubsub;
    private options;
    private pingTimer?;
    constructor(options: WSServerOptions);
    private setupServer;
    private handleMessage;
    private handleAuthenticate;
    private handleSubscribe;
    private handleUnsubscribe;
    private handleUnsubscribeAll;
    private handleList;
    private handleDisconnect;
    private sendToClient;
    private generateClientId;
    private startPingInterval;
    broadcast(channel: string, data: any): void;
    getConnectedClients(): WSClient[];
    getClientCount(): number;
    getSubscriptionCount(): number;
    close(): Promise<void>;
    getServer(): WebSocketServer;
}
declare function createWSServer(options: WSServerOptions): KyroWSServer;

export { type EventHandler, type KyroEvent, KyroPubSub, KyroWSServer, PubSub, type WSClient, type WSServerOptions, createWSServer };
