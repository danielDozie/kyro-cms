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
  type: 'mongodb';
  client?: any;
  database?: string;
  connectionString?: string;
  connectionOptions?: DatabaseConnectionOptions;
}

export type AdapterOptions = DrizzleAdapterOptions | MongoDBAdapterOptions;
