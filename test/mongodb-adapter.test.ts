import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MongoDBAdapter, createMongoDBAdapter, getMongoDb, getMongoClient } from "../src/database/mongodb/index.js";

describe("MongoDBAdapter Connection Pooling & Caching", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete (globalThis as any).__KYRO_MONGO_CLIENTS__;
    delete (globalThis as any).__KYRO_INSTANCE__;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    delete (globalThis as any).__KYRO_MONGO_CLIENTS__;
    delete (globalThis as any).__KYRO_INSTANCE__;
  });

  it("exports createMongoDBAdapter, getMongoDb, and getMongoClient", () => {
    expect(typeof createMongoDBAdapter).toBe("function");
    expect(typeof getMongoDb).toBe("function");
    expect(typeof getMongoClient).toBe("function");
  });

  it("applies default pool options (maxPoolSize: 10, minPoolSize: 1, maxIdleTimeMS: 30000)", () => {
    const adapter = new MongoDBAdapter({
      connectionString: "mongodb://localhost:27017/test_db",
    });

    const poolOpts = (adapter as any).getPoolOptions();
    expect(poolOpts.maxPoolSize).toBe(10);
    expect(poolOpts.minPoolSize).toBe(1);
    expect(poolOpts.maxIdleTimeMS).toBe(30000);
    expect(poolOpts.serverSelectionTimeoutMS).toBe(5000);
    expect(poolOpts.connectTimeoutMS).toBe(10000);
  });

  it("allows overriding pool options via constructor options", () => {
    const adapter = new MongoDBAdapter({
      connectionString: "mongodb://localhost:27017/test_db",
      maxPoolSize: 25,
      minPoolSize: 3,
      maxIdleTimeMS: 15000,
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 7000,
    });

    const poolOpts = (adapter as any).getPoolOptions();
    expect(poolOpts.maxPoolSize).toBe(25);
    expect(poolOpts.minPoolSize).toBe(3);
    expect(poolOpts.maxIdleTimeMS).toBe(15000);
    expect(poolOpts.serverSelectionTimeoutMS).toBe(3000);
    expect(poolOpts.connectTimeoutMS).toBe(7000);
  });

  it("respects MONGODB_MAX_POOL_SIZE and other environment variables", () => {
    process.env.MONGODB_MAX_POOL_SIZE = "12";
    process.env.MONGODB_MIN_POOL_SIZE = "2";
    process.env.MONGODB_MAX_IDLE_TIME_MS = "45000";

    const adapter = new MongoDBAdapter({
      connectionString: "mongodb://localhost:27017/test_db",
    });

    const poolOpts = (adapter as any).getPoolOptions();
    expect(poolOpts.maxPoolSize).toBe(12);
    expect(poolOpts.minPoolSize).toBe(2);
    expect(poolOpts.maxIdleTimeMS).toBe(45000);
  });

  it("reuses cached client from globalThis.__KYRO_MONGO_CLIENTS__ across adapter instances", async () => {
    const fakeClient = {
      connect: async () => {},
      db: (name: string) => ({ name, collection: () => ({}) }),
      close: async () => {},
    };

    // Pre-populate global cache as if previously connected
    const map = new Map();
    map.set("mongodb://localhost:27017/test_db", {
      client: fakeClient,
      connectPromise: Promise.resolve(),
    });
    (globalThis as any).__KYRO_MONGO_CLIENTS__ = map;

    const adapter1 = createMongoDBAdapter({
      connectionString: "mongodb://localhost:27017/test_db",
    });
    await adapter1.connect();

    expect(adapter1.client).toBe(fakeClient);
    expect(adapter1.db.name).toBe("test_db");

    const adapter2 = createMongoDBAdapter({
      connectionString: "mongodb://localhost:27017/test_db",
    });
    await adapter2.connect();

    expect(adapter2.client).toBe(fakeClient);
  });

  it("getDb resolves from active __KYRO_INSTANCE__ when available", async () => {
    const fakeDb = { collection: () => ({}) };
    (globalThis as any).__KYRO_INSTANCE__ = {
      db: {
        dialect: "mongodb",
        db: fakeDb,
      },
    };

    const resolved = await getMongoDb();
    expect(resolved).toBe(fakeDb);
  });
});
