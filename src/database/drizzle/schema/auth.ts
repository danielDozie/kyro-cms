import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  text,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    role: varchar("role", { length: 50 }).notNull().default("customer"),
    tenantId: uuid("tenant_id"),
    emailVerified: boolean("email_verified").default(false),
    avatar: varchar("avatar", { length: 255 }),
    locked: boolean("locked").default(false),
    lastLogin: timestamp("last_login"),
    failedLoginAttempts: integer("failed_login_attempts").default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    index("users_tenant_idx").on(table.tenantId),
    index("users_role_idx").on(table.role),
  ],
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    level: integer("level").notNull().default(0),
    inherits: text("inherits").array(),
    description: text("description"),
    permissions: jsonb("permissions").$type<string[]>().default([]),
    isSystem: boolean("is_system").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("roles_level_idx").on(table.level)],
);

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roleId: uuid("role_id").references(() => roles.id, { onDelete: "cascade" }),
    resource: varchar("resource", { length: 100 }).notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    conditions: jsonb("conditions").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("permissions_role_idx").on(table.roleId),
    index("permissions_resource_idx").on(table.resource),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 512 }).notNull().unique(),
    refreshToken: varchar("refresh_token", { length: 512 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_token_idx").on(table.token),
    index("sessions_expires_idx").on(table.expiresAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    action: varchar("action", { length: 100 }).notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    userEmail: varchar("user_email", { length: 255 }),
    role: varchar("role", { length: 50 }),
    resource: varchar("resource", { length: 100 }).notNull(),
    resourceId: varchar("resource_id", { length: 255 }),
    changes:
      jsonb("changes").$type<{ field: string; old: unknown; new: unknown }[]>(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    success: boolean("success").notNull().default(true),
    error: text("error"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_user_idx").on(table.userId),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_resource_idx").on(table.resource),
    index("audit_logs_timestamp_idx").on(table.timestamp),
  ],
);

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("tenants_slug_idx").on(table.slug)],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    key: varchar("key", { length: 64 }).notNull().unique(),
    keyPrefix: varchar("key_prefix", { length: 8 }).notNull(),
    permissions: jsonb("permissions").$type<string[]>().default([]),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("api_keys_user_idx").on(table.userId),
    index("api_keys_key_idx").on(table.key),
  ],
);

export const emailVerifications = pgTable(
  "email_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("email_verifications_token_idx").on(table.token),
    index("email_verifications_user_idx").on(table.userId),
  ],
);

export const passwordResets = pgTable(
  "password_resets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("password_resets_token_idx").on(table.token),
    index("password_resets_user_idx").on(table.userId),
  ],
);

export const passwordHistory = pgTable(
  "password_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("password_history_user_idx").on(table.userId)],
);

export const lockouts = pgTable(
  "lockouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ipAddress: varchar("ip_address", { length: 45 }),
    reason: varchar("reason", { length: 255 }),
    lockedUntil: timestamp("locked_until").notNull(),
    releasedAt: timestamp("released_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("lockouts_user_idx").on(table.userId),
    index("lockouts_ip_idx").on(table.ipAddress),
    index("lockouts_locked_until_idx").on(table.lockedUntil),
  ],
);

export type AuthUser = typeof users.$inferSelect;
export type AuthUserNew = typeof users.$inferInsert;
export type AuthRole = typeof roles.$inferSelect;
export type AuthRoleNew = typeof roles.$inferInsert;
export type AuthSession = typeof sessions.$inferSelect;
export type AuthSessionNew = typeof sessions.$inferInsert;
export type AuthAuditLog = typeof auditLogs.$inferSelect;
export type AuthAuditLogNew = typeof auditLogs.$inferInsert;
export type AuthTenant = typeof tenants.$inferSelect;
export type AuthTenantNew = typeof tenants.$inferInsert;
export type AuthApiKey = typeof apiKeys.$inferSelect;
export type AuthApiKeyNew = typeof apiKeys.$inferInsert;
export type AuthEmailVerification = typeof emailVerifications.$inferSelect;
export type AuthPasswordReset = typeof passwordResets.$inferSelect;
export type AuthPasswordHistoryEntry = typeof passwordHistory.$inferSelect;
export type AuthLockout = typeof lockouts.$inferSelect;
