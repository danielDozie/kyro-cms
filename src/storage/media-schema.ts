export const SQLITE_MEDIA_DDL = `
  CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    title TEXT,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    url TEXT NOT NULL UNIQUE,
    thumbnail_url TEXT,
    folder TEXT,
    provider TEXT NOT NULL,
    alt TEXT,
    caption TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_media_folder ON media(folder);
  CREATE INDEX IF NOT EXISTS idx_media_provider ON media(provider);
  CREATE INDEX IF NOT EXISTS idx_media_filename ON media(filename);

  CREATE TABLE IF NOT EXISTS media_folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    parent_path TEXT,
    created_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_media_folders_path ON media_folders(path);
`;

export function formatUuid(id: string): string;
export function formatUuid(id: any): any {
  if (typeof id !== "string") return id;
  const clean = id.replace(/-/g, "").toLowerCase();
  if (clean.length === 32) {
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
  }
  return id;
}
