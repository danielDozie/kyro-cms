import type { CollectionConfig } from "../registry/types.js";

export const usersCollection: CollectionConfig = {
  slug: "users",
  label: "Users",
  auth: true,
  fields: [
    { name: "name", type: "text", label: "Name" },
    { name: "email", type: "email", required: true },
    {
      name: "passwordHash",
      type: "text",
      label: "Password Hash",
      admin: { hidden: true },
    },
    {
      name: "role",
      type: "select",
      options: [
        { label: "Super Admin", value: "super_admin" },
        { label: "Admin", value: "admin" },
        { label: "Editor", value: "editor" },
        { label: "Author", value: "author" },
        { label: "Customer", value: "customer" },
        { label: "Guest", value: "guest" },
      ],
      required: true,
    },
    { name: "avatar", type: "upload", relationTo: "media", label: "Profile Picture" },
    { name: "tenantId", type: "text", label: "Tenant" },
    { name: "emailVerified", type: "checkbox", label: "Email Verified" },
    { name: "locked", type: "checkbox" },
    {
      name: "lastLogin",
      type: "date",
      time: true,
      label: "Last Login",
      admin: { readOnly: true },
    },
    {
      name: "failedLoginAttempts",
      type: "number",
      label: "Failed Login Attempts",
      admin: { readOnly: true },
    },
    {
      name: "metadata",
      type: "json",
      label: "Metadata",
      admin: { hidden: true },
    },
  ],
  timestamps: true,
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "role", "tenantId", "lastLogin"],
  },
};

export const auditLogsCollection: CollectionConfig = {
  slug: "audit_logs",
  label: "Audit Logs",
  access: {
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: "action", type: "text", required: true },
    { name: "userId", type: "text", label: "User ID" },
    { name: "userEmail", type: "email", label: "User Email" },
    { name: "role", type: "text" },
    { name: "resource", type: "text", label: "Resource", required: true },
    { name: "resourceId", type: "text", label: "Resource ID" },
    { name: "changes", type: "json", label: "Changes" },
    { name: "ipAddress", type: "text", label: "IP Address" },
    { name: "userAgent", type: "text", label: "User Agent" },
    { name: "success", type: "checkbox" },
    { name: "error", type: "text", label: "Error" },
    { name: "metadata", type: "json", label: "Metadata" },
    {
      name: "timestamp",
      type: "date",
      time: true,
      required: true,
      admin: { readOnly: true },
    },
  ],
  admin: {
    defaultColumns: ["action", "userEmail", "resource", "success", "timestamp"],
  },
};

export const authCollections = {
  users: usersCollection,
  audit_logs: auditLogsCollection,
};
