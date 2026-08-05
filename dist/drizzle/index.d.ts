import { A as AbstractBaseAdapter } from '../base-7vJMzr4V.js';
import { C as CollectionConfig, G as GlobalConfig, F as FindArgs, b as FindResult, c as FindByIDArgs, d as CreateArgs, e as UpdateArgs, D as DeleteArgs, f as FindOneArgs } from '../types-CYGXsNcJ.js';
import { F as Field } from '../types-euTszc-1.js';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { A as AuthAdapter, U as UserRole, c as AuthUser, S as Session, e as AuditLogFilter, d as AuditLog } from '../types-CpjuXbe7.js';

declare function fieldToDrizzleType(field: Field, dialect?: 'postgres' | 'sqlite'): string;
declare function collectionToDrizzleSchema(collection: CollectionConfig, dialect?: 'postgres' | 'sqlite'): string;
declare class DrizzleAdapter extends AbstractBaseAdapter {
    client: any;
    private schema;
    private _schemaEnsured;
    dialect: 'postgres' | 'sqlite';
    private connectionString?;
    private versionsTableReady;
    rawClient: any;
    constructor(options: {
        type?: 'postgres' | 'sqlite';
        schema?: Record<string, any>;
        client?: any;
        connectionString?: string;
    });
    protected prepareData(data: Record<string, any>, config: CollectionConfig): Record<string, any>;
    connect(): Promise<void>;
    init(collections: CollectionConfig[], globals?: GlobalConfig[]): Promise<void>;
    private createTableFromConfig;
    private ensureCollectionTables;
    private getColumnSqlDefinition;
    private columnSqlType;
    private getExpectedColumnDefs;
    private syncTableColumns;
    private generateCreateColumns;
    disconnect(): Promise<void>;
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
    findVersions(args: any): Promise<FindResult<any>>;
    findVersionByID(args: {
        collection: string;
        versionId: string;
        tenantId?: string;
    }): Promise<any>;
    createVersion(args: any): Promise<any>;
    updateLatestVersion(args: any): Promise<any>;
    deleteVersions(args: {
        collection: string;
        documentId: string;
        keepLatest?: number;
        tenantId?: string;
    }): Promise<void>;
    private getTable;
    private buildWhereClause;
    private processResult;
    private ensureVersionsTable;
    execute<T = any>(query: any): Promise<T[]>;
    private executeRaw;
}
declare function createDrizzleAdapter(options: {
    type?: 'postgres' | 'sqlite';
    client?: any;
    schema?: any;
    connectionString?: string;
}): DrizzleAdapter;

interface PostgresAuthAdapterOptions {
    db: PostgresJsDatabase;
    prefix?: string;
    sessionTTL?: number;
    refreshTokenTTL?: number;
}
declare class PostgresAuthAdapter implements AuthAdapter {
    private db;
    private prefix;
    private sessionTTL;
    private refreshTokenTTL;
    constructor(options: PostgresAuthAdapterOptions);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    createUser(data: {
        email: string;
        password: string;
        name?: string;
        role?: UserRole;
        avatar?: string;
        tenantId?: string;
        emailVerified?: boolean;
    }): Promise<AuthUser>;
    findUserByEmail(email: string): Promise<AuthUser | null>;
    findUserById(id: string): Promise<AuthUser | null>;
    updateUser(id: string, data: Partial<AuthUser>): Promise<AuthUser | null>;
    deleteUser(id: string): Promise<boolean>;
    findUsers(options?: {
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{
        users: AuthUser[];
        total: number;
    }>;
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
    addPasswordToHistory(userId: string, passwordHash: string): Promise<void>;
    getPasswordHistory(userId: string, count?: number): Promise<string[]>;
    isPasswordInHistory(password: string, userId: string, historyCount?: number): Promise<boolean>;
    isLocked(userId: string): Promise<boolean>;
    getLockout(userId: string): Promise<{
        lockedUntil: Date;
    } | null>;
    recordFailedAttempt(userId: string, ipAddress?: string): Promise<{
        attempts: number;
        locked: boolean;
    }>;
    resetAttempts(userId: string): Promise<void>;
    findAuditLogs(filter: AuditLogFilter): Promise<{
        logs: AuditLog[];
        total: number;
    }>;
    createAuditLog(data: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog>;
    private userToAuthUser;
    private sessionToSession;
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

type Dialect = "sqlite" | "postgres";
interface DatabaseResult {
    db: any;
    dialect: Dialect;
    genId: () => string;
}
declare function createDatabase(): Promise<DatabaseResult>;
declare function runMigrations(_db: any, _dialect?: Dialect): Promise<void>;
declare function seedDefaultRoles(db: any): Promise<void>;

export { type Dialect, DrizzleAdapter, PostgresAuthAdapter, collectionToDrizzleSchema, createDatabase, createDrizzleAdapter, fieldToDrizzleType, runMigrations, seedDefaultRoles };
