import { A as AbstractBaseAdapter } from '../base-C2iwjdJQ.cjs';
import { F as FindArgs, b as FindResult, c as FindByIDArgs, d as CreateArgs, e as UpdateArgs, D as DeleteArgs, f as FindOneArgs, g as FindVersionsArgs, h as VersionRecord, i as CreateVersionArgs } from '../types-BjivdGbU.cjs';
import { A as AuthAdapter, U as UserRole, c as AuthUser, S as Session, e as AuditLogFilter, d as AuditLog } from '../types-CpjuXbe7.cjs';
import '../types-euTszc-1.cjs';

declare class MongoDBAdapter extends AbstractBaseAdapter {
    dialect: "mongodb";
    client: any;
    db: any;
    private database;
    private connectionString?;
    constructor(options: {
        client?: any;
        database?: string;
        connectionString?: string;
    });
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private getMongoCollection;
    find<T>(args: FindArgs): Promise<FindResult<T>>;
    findByID<T>(args: FindByIDArgs): Promise<T | null>;
    create<T>(args: CreateArgs): Promise<T>;
    update<T>(args: UpdateArgs): Promise<T>;
    delete<T>(args: DeleteArgs): Promise<T>;
    count(args: {
        collection: string;
        where?: Record<string, any>;
        tenantId?: string;
    }): Promise<number>;
    findOne(args: FindOneArgs): Promise<any>;
    findVersions(args: FindVersionsArgs): Promise<FindResult<VersionRecord>>;
    findVersionByID(args: {
        collection: string;
        versionId: string;
        tenantId?: string;
    }): Promise<VersionRecord | null>;
    createVersion<T = Record<string, any>>(args: CreateVersionArgs<T>): Promise<VersionRecord<T>>;
    updateLatestVersion<T = Record<string, any>>(args: CreateVersionArgs<T>): Promise<VersionRecord<T>>;
    deleteVersions(args: {
        collection: string;
        documentId: string;
        keepLatest?: number;
        tenantId?: string;
    }): Promise<void>;
    migrate?(): Promise<void>;
    private getCollectionConfig;
    private buildFilter;
    private buildProjection;
    private processResult;
    private generateId;
}
declare function createMongoDBAdapter(options: {
    client?: any;
    database?: string;
    connectionString?: string;
}): MongoDBAdapter;

interface MongoDBAuthAdapterOptions {
    db?: any | (() => any);
    adapter?: any;
    collectionPrefix?: string;
    sessionTTL?: number;
    refreshTokenTTL?: number;
}
declare class MongoDBAuthAdapter implements AuthAdapter {
    private db;
    private adapter;
    private prefix;
    private sessionTTL;
    private refreshTokenTTL;
    private indexesEnsured;
    constructor(options: MongoDBAuthAdapterOptions);
    private getDatabase;
    private col;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private ensureIndexes;
    createUser(data: {
        email: string;
        password: string;
        name?: string;
        role?: UserRole;
        avatar?: string;
        tenantId?: string;
    }): Promise<AuthUser>;
    findUserByEmail(email: string): Promise<AuthUser | null>;
    findUserById(id: string): Promise<AuthUser | null>;
    updateUser(id: string, data: Partial<AuthUser>): Promise<AuthUser | null>;
    deleteUser(id: string): Promise<boolean>;
    verifyPassword(email: string, password: string): Promise<AuthUser | null>;
    hashPassword(password: string): Promise<string>;
    createSession(userId: string, data?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<Session>;
    findSessionByToken(token: string): Promise<Session | null>;
    findSessionByRefreshToken(refreshToken: string): Promise<Session | null>;
    deleteSession(sessionId: string): Promise<boolean>;
    deleteUserSessions(userId: string): Promise<number>;
    hasAnyUsers(): Promise<boolean>;
    addPasswordToHistory(userId: string, passwordHash: string): Promise<void>;
    getPasswordHistory(userId: string, count?: number): Promise<string[]>;
    isPasswordInHistory(password: string, userId: string, historyCount?: number): Promise<boolean>;
    findAuditLogs(filter: AuditLogFilter): Promise<{
        logs: AuditLog[];
        total: number;
    }>;
    createAuditLog(data: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog>;
    private docToAuthUser;
    private docToSession;
    createEmailVerificationToken(userId: string): Promise<{
        token: string;
        expiresAt: Date;
    }>;
    verifyEmailToken(token: string): Promise<{
        success: boolean;
        userId?: string;
        error?: string;
    }>;
    createPasswordResetToken(email: string): Promise<{
        token: string;
        expiresAt: Date;
        error?: string;
    }>;
    resetPasswordWithToken(token: string, newPassword: string): Promise<{
        success: boolean;
        error?: string;
    }>;
}

export { MongoDBAdapter, MongoDBAuthAdapter, createMongoDBAdapter };
