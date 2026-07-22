import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SQLiteAuthAdapter } from "../src/auth/sqlite-adapter.js";
import { Auth } from "../src/auth/index.js";

describe("SQLiteAuthAdapter", () => {
  let adapter: SQLiteAuthAdapter;

  beforeAll(async () => {
    adapter = new SQLiteAuthAdapter({ path: ":memory:" });
    await adapter.connect();
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  it("creates a user", async () => {
    const user = await adapter.createUser({
      email: "test@example.com",
      password: "password123",
      role: "admin",
    });
    expect(user).toBeDefined();
    expect(user.email).toBe("test@example.com");
    expect(user.role).toBe("admin");
  });

  it("finds user by email", async () => {
    const user = await adapter.findUserByEmail("test@example.com");
    expect(user).toBeDefined();
    expect(user?.email).toBe("test@example.com");
  });

  it("finds user by ID", async () => {
    const user = await adapter.findUserByEmail("test@example.com");
    expect(user).toBeDefined();

    const found = await adapter.findUserById(user!.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(user!.id);
  });

  it("verifies password", async () => {
    const user = await adapter.verifyPassword("test@example.com", "password123");
    expect(user).toBeDefined();
    expect(user?.email).toBe("test@example.com");
  });

  it("rejects wrong password", async () => {
    const user = await adapter.verifyPassword("test@example.com", "wrongpassword");
    expect(user).toBeNull();
  });

  it("updates user", async () => {
    const user = await adapter.findUserByEmail("test@example.com");
    expect(user).toBeDefined();

    const updated = await adapter.updateUser(user!.id, { name: "Test User" });
    expect(updated).toBeDefined();
    expect(updated?.name).toBe("Test User");
  });

  it("creates and finds session", async () => {
    const user = await adapter.findUserByEmail("test@example.com");
    expect(user).toBeDefined();

    const session = await adapter.createSession(user!.id);
    expect(session).toBeDefined();
    expect(session.token).toBeDefined();

    const found = await adapter.findSessionByToken(session.token);
    expect(found).toBeDefined();
    expect(found?.userId).toBe(user!.id);
  });

  it("deletes session", async () => {
    const user = await adapter.findUserByEmail("test@example.com");
    const session = await adapter.createSession(user!.id);

    const deleted = await adapter.deleteSession(session.id);
    expect(deleted).toBe(true);

    const found = await adapter.findSessionByToken(session.token);
    expect(found).toBeNull();
  });

  it("has any users", async () => {
    const hasUsers = await adapter.hasAnyUsers();
    expect(hasUsers).toBe(true);
  });

  it("password history works", async () => {
    const user = await adapter.findUserByEmail("test@example.com");
    expect(user).toBeDefined();

    await adapter.addPasswordToHistory!(user!.id, "old_hash_1");
    await adapter.addPasswordToHistory!(user!.id, "old_hash_2");

    const history = await adapter.getPasswordHistory!(user!.id, 5);
    expect(history.length).toBe(2);
  });
});

describe("Auth class", () => {
  let adapter: SQLiteAuthAdapter;
  let auth: Auth;

  beforeAll(async () => {
    adapter = new SQLiteAuthAdapter({ path: ":memory:" });
    await adapter.connect();
    auth = new Auth(adapter, {
      secret: "test-secret-key-for-auth-tests",
      expiresIn: "1h",
    });
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  it("registers a new user", async () => {
    const result = await auth.register({
      email: "register@example.com",
      password: "password123",
      role: "customer",
    });
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
  });

  it("prevents duplicate registration", async () => {
    const result = await auth.register({
      email: "register@example.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Email already registered");
  });

  it("logs in with correct credentials", async () => {
    const result = await auth.login({
      email: "register@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
  });

  it("rejects wrong credentials", async () => {
    const result = await auth.login({
      email: "register@example.com",
      password: "wrongpassword",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid credentials");
  });

  it("verifies token", async () => {
    const loginResult = await auth.login({
      email: "register@example.com",
      password: "password123",
    });
    expect(loginResult.success).toBe(true);

    const payload = await auth.verifyToken(loginResult.token!);
    expect(payload).toBeDefined();
    expect(payload?.email).toBe("register@example.com");
  });

  it("rejects invalid token", async () => {
    const payload = await auth.verifyToken("invalid-token");
    expect(payload).toBeNull();
  });

  it("sends email verification", async () => {
    const user = await adapter.findUserByEmail("register@example.com");
    expect(user).toBeDefined();

    const result = await auth.sendEmailVerification(user!.id);
    expect(result.success).toBe(true);
  });

  it("requests password reset", async () => {
    const result = await auth.requestPasswordReset("register@example.com");
    expect(result.success).toBe(true);
  });

  it("rejects password reset for non-existent user", async () => {
    const result = await auth.requestPasswordReset("nonexistent@example.com");
    expect(result.success).toBe(false);
    expect(result.error).toBe("User not found");
  });
});
