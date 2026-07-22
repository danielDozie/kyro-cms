import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull().unique(),
  title: text("title"),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  width: integer("width"),
  height: integer("height"),
  url: text("url").notNull().unique(),
  thumbnailUrl: text("thumbnail_url"),
  folder: text("folder"),
  provider: text("provider").notNull(),
  alt: text("alt"),
  caption: text("caption"),
  metadata: text("metadata"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const mediaFolders = sqliteTable("media_folders", {
  path: text("path").primaryKey(),
  name: text("name").notNull(),
  parentPath: text("parent_path"),
  createdAt: text("created_at").notNull(),
});

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
