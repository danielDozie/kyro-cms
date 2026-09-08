export type DatabaseType = 'postgres' | 'sqlite' | 'mongodb';

export interface DatabaseConnectionOptions {
  type: DatabaseType;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  url?: string;
  ssl?: boolean | Record<string, any>;
  maxConnections?: number;
  connectionTimeout?: number;
}

export interface DrizzleAdapterOptions {
  type?: 'postgres' | 'sqlite';
  client?: any;
  schema?: any;
  connectionString?: string;
  connectionOptions?: DatabaseConnectionOptions;
}

export interface MongoDBAdapterOptions {
  type?: 'mongodb';
  client?: any;
  database?: string;
  connectionString?: string;
  connectionOptions?: DatabaseConnectionOptions;

  /**
   * Maximum number of connections in the connection pool.
   * Defaults to 10 (or process.env.MONGODB_MAX_POOL_SIZE).
   * Note: Default MongoDB driver setting is 100, which can easily overwhelm
   * MongoDB Atlas free/shared tiers (e.g. M0 limit is 500 connections cluster-wide).
   */
  maxPoolSize?: number;

  /**
   * Minimum number of connections in the connection pool.
   * Defaults to 1 (or process.env.MONGODB_MIN_POOL_SIZE).
   */
  minPoolSize?: number;

  /**
   * Maximum number of milliseconds that a connection can remain idle in the pool before being removed.
   * Defaults to 30000 (30 seconds).
   */
  maxIdleTimeMS?: number;

  /**
   * How long the MongoDB driver will attempt to select a server before timing out.
   * Defaults to 5000 (5 seconds).
   */
  serverSelectionTimeoutMS?: number;

  /**
   * How long a connection attempt can take before timing out.
   * Defaults to 10000 (10 seconds).
   */
  connectTimeoutMS?: number;

  /**
   * How long a send or receive on a socket can take before timing out.
   */
  socketTimeoutMS?: number;

  /**
   * Additional raw MongoClientOptions passed directly to MongoClient.
   */
  clientOptions?: Record<string, any>;

  /**
   * Whether to disable global client caching across HMR / module reloads in development.
   * Defaults to false (caching enabled).
   */
  disableGlobalClientCache?: boolean;
}

export type AdapterOptions = DrizzleAdapterOptions | MongoDBAdapterOptions;
