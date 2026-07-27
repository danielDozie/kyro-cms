---
title: Authentication
description: How Kyro CMS handles JWT sessions, security policies, and Role-Based Access Control (RBAC).
---

# Authentication

Kyro CMS features a robust, enterprise-grade authentication system out of the box. It handles JWT generation, session invalidation, secure password hashing, rate limiting, and granular Role-Based Access Control (RBAC).

## Enabling Authentication

Authentication is enabled by defining the `auth` property in your `kyro.config.ts`. The only required property is a `secret` used to sign your JSON Web Tokens.

```typescript
import { defineConfig } from "@kyro-cms/core";
import { getAppSecret } from "./src/lib/secret.js";

export default defineConfig({
  // ...
  auth: {
    // Highly recommended to load this from an environment variable!
    secret: getAppSecret() 
  }
});
```

## Storage Adapters

Unlike simple JWT implementations that are completely stateless (which makes revocation impossible), Kyro CMS tracks active sessions in a database. This allows administrators to forcefully log out users or invalidate leaked tokens.

Kyro provides multiple storage adapters for authentication sessions:

### 1. SQLite (Default / Local Dev)

If you don't specify an auth adapter, Kyro falls back to the `SQLiteAuthAdapter` automatically for zero-config local development.

```typescript
import { SQLiteAuthAdapter } from "@kyro-cms/core";

const authAdapter = new SQLiteAuthAdapter({ path: "./data.db" });
```

### 2. Redis (Recommended for Production)

For distributed, high-performance session management across multiple servers or serverless functions, Redis is highly recommended.

```typescript
import { RedisAuthAdapter } from "@kyro-cms/core";

const authAdapter = new RedisAuthAdapter({
  url: process.env.REDIS_URL,
  tls: process.env.REDIS_TLS === "true",
});
```

### 3. PostgreSQL

If you want to keep your auth sessions in the same PostgreSQL database as your content.

```typescript
import { PostgresAuthAdapter, createDatabase } from "@kyro-cms/core";

const { db } = await createDatabase();
const authAdapter = new PostgresAuthAdapter({ db });
```

## Security Features

By default, Kyro enforces strict security policies to protect your admin dashboard:

1. **Password Policy**: Passwords must be at least 12 characters long and include a mix of uppercase, lowercase, numbers, and symbols.
2. **Account Lockout**: After 5 consecutive failed login attempts, an account is locked out for 15 minutes to prevent brute-force attacks.
3. **Rate Limiting**: API routes are protected against credential stuffing via IP-based rate limits.
4. **Audit Logging**: Successful logins, failed attempts, and password changes are logged with a 30-day retention period.

You can customize these via environment variables or explicitly in your configuration.

## Role-Based Access Control (RBAC)

Kyro CMS implements a hierarchical RBAC system. Every authenticated user is assigned a role, and roles are ranked hierarchically.

The default hierarchy is:

```
super_admin (100) > admin (90) > editor (70) > author (50) > customer (30) > guest (10)
```

### Collection-Level Access

You can restrict access to entire collections based on roles:

```typescript
{
  name: "secrets",
  access: {
    read: ["admin", "super_admin"],
    create: ["super_admin"],
    update: ["super_admin"],
    delete: ["super_admin"],
  },
  fields: [/* ... */]
}
```

### Field-Level Access

You can also restrict access to specific fields within a collection:

```typescript
{
  name: "users",
  fields: [
    { name: "name", type: "text" },
    { 
      name: "salary", 
      type: "number",
      access: {
        read: ["admin"],     // Only admins can see this field
        update: ["admin"]
      }
    }
  ]
}
```

## Authentication REST API Endpoints

Kyro CMS exposes ready-to-use authentication endpoints under `/api/auth/*`:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | User registration & triggers verification / welcome email |
| `POST` | `/api/auth/login` | Authenticate user & set session cookies |
| `POST` | `/api/auth/logout` | Revoke session & clear cookies |
| `POST` | `/api/auth/refresh` | Refresh current user session token |
| `GET` | `/api/auth/me` | Fetch active authenticated user profile |
| `POST` | `/api/auth/forgot-password` | Request password reset token via email |
| `POST` | `/api/auth/reset-password` | Reset password using valid reset token |
| `POST` | `/api/auth/change-password` | Update account password (requires active session) |
| `GET` | `/api/auth/verify-email` | Confirm user email address via link token |
| `GET` | `/api/auth/sessions` | List active sessions across all devices |
| `DELETE` | `/api/auth/sessions/:id` | Revoke specific session ID |
| `DELETE` | `/api/auth/sessions` | Revoke all other active sessions |

---

## User Registration & Security Controls

Kyro CMS gives administrators granular control over user self-registration and default role assignments via **System Settings** (`/admin/settings/system`).

### 1. Enabling & Disabling User Registration
Public registration can be toggled on or off directly from the admin dashboard:
- **Enabled (`enableRegistration: true`)**: Public registration is active. Users can create accounts via `/admin/register` or `POST /api/auth/register`.
- **Disabled (`enableRegistration: false`)**:
  - `POST /api/auth/register` rejects requests with `403 Forbidden` (`"User registration is currently disabled by administrator."`).
  - `/admin/register` displays a **Registration Disabled** notice card directing users to sign in.
  - The **Register** link on `/admin/login` is automatically hidden.

### 2. Configurable Default Registration Role
Administrators can configure the default role automatically assigned to newly registered users (`defaultRegistrationRole`):
- **`customer`** *(default)*: Non-administrative role with standard end-user access.
- **`author`**: Content author role (ideal for publishing platforms where registered users create articles or drafts).
- **`editor`**: Editorial role for content management across collections.
- **`admin`**: Administrative role.

### 3. Super Admin Role Enforcement
- Only **Super Admin** users (`super_admin`) can change a user's role in the admin dashboard (`/admin/users`) or via `PATCH /api/users/:id`.
- Role assignment fields are disabled for non-Super Admin users to prevent privilege escalation.

---

## Email Templates & Notifications

Kyro CMS includes an adaptive, light/dark mode compliant HTML email engine (`src/email/`) for authentication and security alerts.

### Pre-built Email Templates
- **Email Verification (`verifyEmail`)**: Sent upon user registration with a single-use confirmation token link.
- **Password Reset (`resetPassword`)**: Sent on password reset requests with a secure expiration window.
- **Welcome Email (`welcome`)**: Sent upon successful email verification or account activation.
- **Password Changed Alert (`passwordChanged`)**: Security alert sent whenever a password is modified.
- **Account Lockout Alert (`accountLocked`)**: Sent when an account is temporarily locked after consecutive failed attempts.
- **Magic Link Login (`magicLink`)**: One-time login links and passcodes.
- **Workspace Invite (`userInvite`)**: Invitation links to join a team workspace.

### Light & Dark Mode Support
All email templates automatically detect the recipient email client's theme preference using CSS `@media (prefers-color-scheme: dark)`:
- **Light Mode**: Clean `#ffffff` container, high contrast dark text (`#09090b`), and renders `logo.svg`.
- **Dark Mode**: Soft dark card background (`#121215`), white text (`#ffffff`), and automatically switches to `logo-white.svg`.

### Customizing Email Templates
You can access and override email template functions directly from `@kyro-cms/core`:

```typescript
import { getEmailTemplates } from "@kyro-cms/core";

const templates = getEmailTemplates();
const { subject, html, text } = templates.resetPassword("https://example.com/reset?token=xyz", "User Name");
```

---

## Bootstrapping the First Admin

When you deploy Kyro to a fresh database, no users exist. You can bootstrap your first `super_admin` user via the CLI:

```bash
kyro auth bootstrap -e admin@example.com -p "SecurePass123!" -r super_admin
```

Alternatively, you can provide these as environment variables during your CI/CD deployment:
- `KYRO_ADMIN_EMAIL`
- `KYRO_ADMIN_PASSWORD`

For collection-level and field-level access control, see the [Access Control](/guides/access-control) guide.
