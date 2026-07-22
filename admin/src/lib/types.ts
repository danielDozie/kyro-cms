import type { CollectionConfig, GlobalConfig } from "@kyro-cms/core/client";

export interface KyroAdminConfig {
  collections?: CollectionConfig[] | Record<string, CollectionConfig>;
  globals?: GlobalConfig[] | Record<string, GlobalConfig>;
  adapter?: unknown;
  name?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  status?: "active" | "locked";
  locked?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  tenantId?: string;
  emailVerified?: boolean;
  failedLoginAttempts?: number;
}

export interface MediaItem {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  alt?: string;
  title?: string;
  description?: string;
  folder?: string;
  type?: string;
  caption?: string;
  originalName?: string;
  thumbnailUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}
