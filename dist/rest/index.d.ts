import { Hono } from 'hono';
import { B as BaseAdapter, k as User } from '../types-CaXXmV9h.js';
import { R as Registry } from '../index-BeQtbl3z.js';
import { j as createWebhookService } from '../WebhookService-C19xR8qE.js';
import '../types-euTszc-1.js';
import 'zod';

interface HonoAppOptions {
    registry: Registry;
    db: BaseAdapter;
    authSecret?: string;
    authAdapter?: any;
    checkSession?: boolean;
    user?: User;
    req?: any;
    tenantId?: string;
    cors?: {
        origins?: string[];
        credentials?: boolean;
    };
    webhookService?: ReturnType<typeof createWebhookService>;
    settings?: {
        access?: {
            enablePublicAccess?: boolean;
            defaultCollectionAccess?: string;
            apiAccess?: {
                graphqlEnabled?: boolean;
                trpcEnabled?: boolean;
                websocketEnabled?: boolean;
                requireAuth?: boolean;
                cors?: {
                    allowedOrigins?: string[] | string;
                };
            };
            rateLimiting?: {
                enabled?: boolean;
                maxRequests?: number;
                windowMs?: number;
            };
        };
    };
}
declare function createHonoApp(options: HonoAppOptions): Hono;
declare function createRESTAPI(registry: Registry, db: BaseAdapter, options?: {
    authSecret?: string;
    user?: User;
    req?: Request;
    tenantId?: string;
    cors?: {
        origins?: string[];
        credentials?: boolean;
    };
    webhookService?: ReturnType<typeof createWebhookService>;
}): Hono;

export { type HonoAppOptions, createHonoApp, createRESTAPI };
