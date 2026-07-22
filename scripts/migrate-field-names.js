#!/usr/bin/env node
/**
 * Migration script: Renames block field names in database JSON data
 * to match the new naming convention (industry standard).
 *
 * Renames:
 *   Column:  main_tabs -> tabs  (PostgreSQL only)
 *   JSON key: mainTabs -> tabs  (in drafts/versions)
 *   Block fields:
 *     sectionTitle    -> title
 *     sectionSubtitle -> subtitle
 *     headline        -> title
 *     subheading      -> subtitle
 *     richText        -> content
 *   NOTE: footerHeading and videoTitle were briefly renamed to 'title'
 *   (creating duplicates with sectionTitle), then corrected to
 *   footerTitle and videoTitle respectively. The duplicate key issue
 *   caused data loss during the first migration — see commit log.
 *
 * Usage:
 *   node scripts/migrate-field-names.js --dry-run    # Preview changes
 *   node scripts/migrate-field-names.js --execute     # Apply changes
 */

import postgres from 'postgres';

const DRY_RUN = process.argv.includes('--dry-run');
const EXECUTE = process.argv.includes('--execute');

if (!DRY_RUN && !EXECUTE) {
  console.error('Usage: node scripts/migrate-field-names.js [--dry-run|--execute]');
  process.exit(1);
}

const DATABASE_URL = process.argv.find(a => a.startsWith('--url='))?.split('=')[1]
  || process.env.DATABASE_URL
  || 'postgresql://ledeoya:6kg6m5xz3sjufbci@77.237.238.148:8989/ledeoya_db';

// Block field keys to rename inside JSON data
const FIELD_RENAMES = {
  sectionTitle: 'title',
  sectionSubtitle: 'subtitle',
  headline: 'title',
  subheading: 'subtitle',
  footerHeading: 'footerTitle',
  richText: 'content',
};

function renameKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(renameKeys);
  }
  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const newKey = FIELD_RENAMES[key] || key;
      result[newKey] = renameKeys(value);
    }
    return result;
  }
  return obj;
}

function findOldKeys(obj, path = '') {
  const found = [];
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      found.push(...findOldKeys(item, `${path}[${i}]`));
    });
  } else if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    for (const [key, value] of Object.entries(obj)) {
      if (FIELD_RENAMES[key]) {
        found.push({ path: `${path}.${key}`, oldKey: key, newKey: FIELD_RENAMES[key] });
      }
      found.push(...findOldKeys(value, `${path}.${key}`));
    }
  }
  return found;
}

async function migratePostgres() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PostgreSQL Migration: ${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`Database: ${DATABASE_URL.replace(/:[^@]+@/, ':***@')}`);
  console.log(`${'='.repeat(60)}\n`);

  const sql = postgres(DATABASE_URL, { max: 2 });

  try {
    // ── Step 1: Rename column main_tabs -> tabs ──────────────────────
    console.log('━━━ Step 1: Rename column main_tabs -> tabs ━━━');

    const columns = await sql`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE column_name = 'main_tabs' AND table_schema = 'public'
    `;

    for (const col of columns) {
      const tableName = col.table_name;
      const newName = 'tabs';

      if (DRY_RUN) {
        console.log(`  [DRY] ALTER TABLE ${tableName} RENAME COLUMN main_tabs TO ${newName}`);
      } else {
        console.log(`  Renaming ${tableName}.main_tabs -> ${newName}...`);
        await sql.unsafe(`ALTER TABLE "${tableName}" RENAME COLUMN "main_tabs" TO "${newName}"`);
        console.log(`  ✓ Done`);
      }
    }

    if (columns.length === 0) {
      console.log('  No main_tabs columns found (already migrated or never existed)');
    }

    // ── Step 2: Rename mainTabs key in kyro_drafts.data ─────────────
    console.log('\n━━━ Step 2: Rename mainTabs -> tabs in kyro_drafts.data ━━━');

    const drafts = await sql`
      SELECT id, data FROM kyro_drafts WHERE data LIKE '%mainTabs%'
    `;
    console.log(`  Found ${drafts.length} drafts with mainTabs key`);

    let draftsUpdated = 0;
    for (const draft of drafts) {
      let parsed;
      try {
        parsed = typeof draft.data === 'string' ? JSON.parse(draft.data) : draft.data;
      } catch { continue; }

      if (!parsed.mainTabs) continue;

      const updated = { ...parsed, tabs: parsed.mainTabs };
      delete updated.mainTabs;

      // Also rename block fields inside
      const cleaned = renameKeys(updated);
      const changes = findOldKeys(parsed);

      if (DRY_RUN) {
        console.log(`  [DRY] Draft ${draft.id}: mainTabs->tabs + ${changes.length} field renames`);
      } else {
        await sql`UPDATE kyro_drafts SET data = ${JSON.stringify(cleaned)} WHERE id = ${draft.id}`;
        draftsUpdated++;
        console.log(`  ✓ Draft ${draft.id.substring(0, 20)}... migrated`);
      }
    }
    console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'} ${DRY_RUN ? drafts.length : draftsUpdated} drafts`);

    // ── Step 3: Rename mainTabs key in kyro_versions.data ───────────
    console.log('\n━━━ Step 3: Rename mainTabs -> tabs in kyro_versions.data ━━━');

    const versions = await sql`
      SELECT id, data FROM kyro_versions WHERE data::text LIKE '%mainTabs%'
    `;
    console.log(`  Found ${versions.length} versions with mainTabs key`);

    let versionsUpdated = 0;
    for (const ver of versions) {
      let parsed;
      try {
        parsed = typeof ver.data === 'string' ? JSON.parse(ver.data) : ver.data;
      } catch { continue; }

      if (!parsed.mainTabs) continue;

      const updated = { ...parsed, tabs: parsed.mainTabs };
      delete updated.mainTabs;

      const cleaned = renameKeys(updated);

      if (DRY_RUN) {
        const changes = findOldKeys(parsed);
        console.log(`  [DRY] Version ${ver.id}: mainTabs->tabs + ${changes.length} field renames`);
      } else {
        await sql`UPDATE kyro_versions SET data = ${JSON.stringify(cleaned)}::jsonb WHERE id = ${ver.id}`;
        versionsUpdated++;
        if (versionsUpdated % 50 === 0) console.log(`  ... ${versionsUpdated}/${versions.length}`);
      }
    }
    console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'} ${DRY_RUN ? versions.length : versionsUpdated} versions`);

    // ── Step 4: Rename block fields in pages (now tabs column) ──────
    console.log('\n━━━ Step 4: Rename block fields in pages.tabs ━━━');

    // Check which column name exists (main_tabs may already be renamed)
    const pageColCheck = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'pages' AND column_name IN ('tabs', 'main_tabs')
    `;
    const pageCol = pageColCheck[0]?.column_name || 'tabs';

    const pages = await sql.unsafe(`SELECT id, "${pageCol}" FROM pages WHERE "${pageCol}" IS NOT NULL`);
    console.log(`  Found ${pages.length} pages with data`);

    let pagesUpdated = 0;
    for (const page of pages) {
      const data = page[pageCol];
      if (!data) continue;

      let parsed;
      try {
        parsed = typeof data === 'string' ? JSON.parse(data) : data;
      } catch { continue; }

      const changes = findOldKeys(parsed);
      if (changes.length === 0) continue;

      const cleaned = renameKeys(parsed);

      if (DRY_RUN) {
        console.log(`  [DRY] Page ${page.id.substring(0, 20)}...: ${changes.length} field renames`);
        for (const c of changes) {
          console.log(`    ${c.path}: ${c.oldKey} -> ${c.newKey}`);
        }
      } else {
        await sql.unsafe(`UPDATE pages SET "${pageCol}" = ${JSON.stringify(cleaned)}::jsonb WHERE id = ${page.id}`);
        pagesUpdated++;
        console.log(`  ✓ Page ${page.id.substring(0, 20)}... migrated (${changes.length} fields)`);
      }
    }
    console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'} ${DRY_RUN ? pages.length : pagesUpdated} pages`);

    // ── Step 5: Rename block fields in posts (now tabs column) ──────
    console.log('\n━━━ Step 5: Rename block fields in posts.tabs ━━━');

    const postColCheck = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'posts' AND column_name IN ('tabs', 'main_tabs')
    `;
    const postCol = postColCheck[0]?.column_name || 'tabs';

    const posts = await sql.unsafe(`SELECT id, "${postCol}" FROM posts WHERE "${postCol}" IS NOT NULL`);
    console.log(`  Found ${posts.length} posts with data`);

    let postsUpdated = 0;
    for (const post of posts) {
      const data = post[postCol];
      if (!data) continue;

      let parsed;
      try {
        parsed = typeof data === 'string' ? JSON.parse(data) : data;
      } catch { continue; }

      const changes = findOldKeys(parsed);
      if (changes.length === 0) continue;

      const cleaned = renameKeys(parsed);

      if (DRY_RUN) {
        console.log(`  [DRY] Post ${post.id.substring(0, 20)}...: ${changes.length} field renames`);
      } else {
        await sql.unsafe(`UPDATE posts SET "${postCol}" = ${JSON.stringify(cleaned)}::jsonb WHERE id = ${post.id}`);
        postsUpdated++;
        console.log(`  ✓ Post ${post.id.substring(0, 20)}... migrated`);
      }
    }
    console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'} ${DRY_RUN ? posts.length : postsUpdated} posts`);

    // ── Step 6: Rename block fields in _globals_site_settings ───────
    console.log('\n━━━ Step 6: Check _globals_site_settings.header_blocks/footer_blocks ━━━');

    const globals = await sql`SELECT id, header_blocks, footer_blocks FROM _globals_site_settings`;
    let globalsUpdated = 0;
    for (const g of globals) {
      let changed = false;
      for (const col of ['header_blocks', 'footer_blocks']) {
        const data = g[col];
        if (!Array.isArray(data)) continue;

        const changes = findOldKeys(data);
        if (changes.length > 0) {
          const cleaned = renameKeys(data);
          if (DRY_RUN) {
            console.log(`  [DRY] ${col}: ${changes.length} field renames`);
          } else {
            await sql.unsafe(`UPDATE _globals_site_settings SET "${col}" = ${JSON.stringify(cleaned)}::jsonb WHERE id = ${g.id}`);
            changed = true;
            console.log(`  ✓ ${col} migrated (${changes.length} fields)`);
          }
        }
      }
      if (changed) globalsUpdated++;
    }
    if (globalsUpdated === 0) {
      console.log('  No block field renames needed in globals');
    }

    await sql.end();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`PostgreSQL migration ${DRY_RUN ? 'preview' : 'complete'}!`);
    console.log(`${'='.repeat(60)}`);
  } catch (err) {
    console.error('PostgreSQL migration failed:', err.message);
    await sql.end();
    process.exit(1);
  }
}

migratePostgres().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
