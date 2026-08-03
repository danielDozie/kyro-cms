import { GraphQLSchema } from 'graphql';
export { printSchema } from 'graphql';
import { B as BaseAdapter, k as User, R as Request } from '../types-CaXXmV9h.js';
import { R as Registry } from '../index-BeQtbl3z.js';
import '../types-euTszc-1.js';
import 'zod';

interface LoaderOptions {
    db: BaseAdapter;
    tenantId?: string;
    user?: User;
}
declare class RelationLoader {
    private db;
    private tenantId?;
    private user?;
    private caches;
    private pending;
    private waiting;
    private flushScheduled;
    constructor(opts: LoaderOptions);
    private getCacheKey;
    load(collection: string, id: string): Promise<any | undefined>;
    flushAll(): Promise<void>;
    resolveOne(collection: string, id: string): any | undefined;
}
interface GraphQLContext {
    db: BaseAdapter;
    registry: Registry;
    user?: User;
    req?: Request;
    tenantId?: string;
    apiKey?: any;
    relationLoader: RelationLoader;
}
declare function depthLimit(maxDepth: number): (validationContext: any) => {
    Field(): void;
    leaveField(): void;
};
interface GraphQLSchemaOptions {
    registry: Registry;
    db: BaseAdapter;
    user?: User;
    req?: Request;
    tenantId?: string;
    apiKey?: any;
    settings?: Record<string, any>;
}
declare function buildGraphQLSchema(options: GraphQLSchemaOptions): GraphQLSchema;
declare function createGraphQLSchema(registry: Registry, db: BaseAdapter, options?: {
    user?: User;
    req?: Request;
    tenantId?: string;
    apiKey?: any;
}): GraphQLSchema;

export { type GraphQLContext, type GraphQLSchemaOptions, RelationLoader, buildGraphQLSchema, createGraphQLSchema, depthLimit };
