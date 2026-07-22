---
title: Media Storage
description: Learn how to handle file uploads, configure storage providers, and use the built-in media library in Kyro CMS.
---

# Media Storage

Kyro CMS includes a robust media management system. It allows you to define collections that handle file uploads, extract metadata, and store files locally or on cloud providers.

## The Upload Field

To allow file uploads in any standard collection, use the `upload` field type:

```typescript
import { defineConfig } from "@kyro-cms/core";

export default defineConfig({
  collections: {
    documents: {
      slug: "documents",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "file", type: "upload" },
      ],
    },
  },
});
```

For managing a shared image library used across multiple collections, use a dedicated Media Collection.

## Media Collections

Kyro provides a pre-built media collection template:

```typescript
import { defineConfig, mediaCollections } from "@kyro-cms/core";

export default defineConfig({
  collections: [
    ...mediaCollections, // Injects 'media' and 'folders' collections
  ],
});
```

When you use `mediaCollections`, the Admin UI automatically gains a "Media Library" tab, and any `relationship` field pointing to `media` opens a media picker modal.

## Storage Providers

By default, files are stored on the local filesystem in `/public/uploads`. For production, you can configure cloud storage via the admin **Settings → Storage Settings** page.

### Changing the Storage Provider

1. Go to **Settings → Storage Settings** in the admin dashboard
2. Select your provider: Local, AWS S3, Cloudflare R2, Cloudinary, or FTP
3. Fill in the required credentials and configuration
4. Save — the new provider takes effect immediately

The following providers are built in:

| Provider | Type | Description |
|----------|------|-------------|
| Local | `local` | Filesystem storage (default) |
| AWS S3 | `aws` | Amazon S3-compatible object storage |
| Cloudflare R2 | `r2` | S3-compatible with Cloudflare's global network |
| Google Cloud Storage | `gcs` | GCS S3-compatible gateway |
| DigitalOcean Spaces | `digitalocean` | S3-compatible Spaces |
| Backblaze B2 | `backblaze` | S3-compatible B2 Cloud Storage |
| Wasabi | `wasabi` | S3-compatible hot cloud storage |
| Cloudinary | `cloudinary` | Cloudinary image management |
| FTP/SFTP | `ftp` | FTP and SFTP servers |

### How It Works

When a storage provider is configured:
- New uploads are streamed directly to the provider
- Existing files remain at their original location
- Public URLs are generated based on the provider's CDN or bucket URL

> [!NOTE] v0.9.3 fixed Imgix HMAC signing to use crypto.createHmac("sha256") and S3 storage to use static ESM imports.
