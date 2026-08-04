import { B as BaseAdapter, k as User, R as Request, b as FindResult } from '../types-DOKMyC3y.cjs';
import { j as createWebhookService } from '../WebhookService-DgIx21X-.cjs';
import '../types-euTszc-1.cjs';

interface ApiKeyContext {
    userId: string;
    user: Partial<User>;
    permissions: string[];
    apiKeyId: string;
    tenantId?: string;
    role?: string;
}
interface KyroContext {
    db: BaseAdapter;
    registry: any;
    user?: User;
    tenantId?: string;
    req: Request;
    apiKey?: ApiKeyContext;
    webhookService?: ReturnType<typeof createWebhookService>;
    settings?: Record<string, any>;
    [key: string]: any;
}
declare function createContext(options: {
    db: BaseAdapter;
    registry: any;
    req: Request;
    user?: User;
    tenantId?: string;
    settings?: Record<string, any>;
}): Promise<KyroContext>;

declare function createFindProcedure(ctx: KyroContext): (input: {
    collection: string;
    where?: Record<string, any>;
    sort?: string;
    limit?: number;
    page?: number;
    depth?: number;
    select?: string[];
    draft?: boolean;
}) => Promise<FindResult<Record<string, any>>>;
declare function createFindByIDProcedure(ctx: KyroContext): (input: {
    collection: string;
    id: string;
    depth?: number;
    select?: string[];
    draft?: boolean;
}) => Promise<Record<string, any>>;
declare function createCreateProcedure(ctx: KyroContext): (input: {
    collection: string;
    data: Record<string, any>;
    depth?: number;
    select?: string[];
}) => Promise<{
    doc: Record<string, any>;
}>;
declare function createUpdateProcedure(ctx: KyroContext): (input: {
    collection: string;
    id: string;
    data: Record<string, any>;
    depth?: number;
    select?: string[];
    baseUpdatedAt?: string;
}) => Promise<{
    doc: Record<string, any> | null;
}>;
declare function createDeleteProcedure(ctx: KyroContext): (input: {
    collection: string;
    id: string;
}) => Promise<{
    doc: Record<string, any>;
    message: string;
}>;
declare function createCountProcedure(ctx: KyroContext): (input: {
    collection: string;
    where?: Record<string, any>;
}) => Promise<{
    totalDocs: number;
}>;

declare function createDynamicRouter(ctx: KyroContext): Record<string, any>;
interface KyroRouter {
    [collectionSlug: string]: {
        find: (input: {
            where?: Record<string, any>;
            sort?: string;
            limit?: number;
            page?: number;
            depth?: number;
            select?: string[];
            draft?: boolean;
        }) => Promise<{
            docs: any[];
            totalDocs: number;
            limit: number;
            totalPages: number;
            page: number;
            pagingCounter: number;
            hasPrevPage: boolean;
            hasNextPage: boolean;
            prevPage: number | null;
            nextPage: number | null;
        }>;
        findByID: (input: {
            id: string;
            depth?: number;
            select?: string[];
            draft?: boolean;
        }) => Promise<any>;
        create: (input: {
            data: Record<string, any>;
            depth?: number;
            select?: string[];
        }) => Promise<{
            doc: any;
        }>;
        update: (input: {
            id: string;
            data: Record<string, any>;
            depth?: number;
            select?: string[];
            baseUpdatedAt?: string;
        }) => Promise<{
            doc: any;
        }>;
        delete: (input: {
            id: string;
        }) => Promise<{
            doc: any;
            message: string;
        }>;
        count: (input: {
            where?: Record<string, any>;
        }) => Promise<{
            totalDocs: number;
        }>;
    };
}
declare function createKyroServer(ctx: KyroContext): KyroRouter;

export { type KyroContext, type KyroRouter, createContext, createCountProcedure, createCreateProcedure, createDeleteProcedure, createDynamicRouter, createFindByIDProcedure, createFindProcedure, createKyroServer, createUpdateProcedure };
