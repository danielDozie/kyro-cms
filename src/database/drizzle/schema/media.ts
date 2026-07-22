import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  text,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filename: varchar("filename", { length: 255 }).notNull().unique(),
    title: varchar("title", { length: 255 }),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    fileSize: integer("file_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    url: text("url").notNull().unique(),
    thumbnailUrl: text("thumbnail_url"),
    folder: varchar("folder", { length: 255 }),
    provider: varchar("provider", { length: 50 }).notNull(),
    alt: text("alt"),
    caption: text("caption"),
    type: varchar("type", { length: 50 }).notNull().default("other"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("media_folder_idx").on(table.folder),
    index("media_provider_idx").on(table.provider),
    index("media_filename_idx").on(table.filename),
  ],
);

export const mediaFolders = pgTable(
  "media_folders",
  {
    path: varchar("path", { length: 500 }).primaryKey(), // e.g. "documents/2024"
    name: varchar("name", { length: 255 }).notNull(),
    parentPath: varchar("parent_path", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("media_folders_parent_idx").on(table.parentPath),
  ]
);

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
