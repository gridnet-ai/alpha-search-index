#!/usr/bin/env node

/**
 * Migrate Alpha Page public_url + canonical_url to:
 *   https://alphasearch.gridnetai.com/p/{slug}
 *
 * Updates: collections `alphapages` and `alpha_pages_index`
 * (each doc must have a `slug` field).
 *
 * Run from repo root (uses `firebase-admin` from root `node_modules`; or `cd functions` and same paths):
 *   node scripts/migrate-alpha-page-urls.js --dry-run
 *   node scripts/migrate-alpha-page-urls.js --apply
 *
 * Credentials: GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default login`
 */

const admin = require('firebase-admin');

const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'alpha-search-index';
const NEW_BASE = 'https://alphasearch.gridnetai.com';

if (!admin.apps.length) {
  try {
    admin.initializeApp({ projectId });
  } catch (e) {
    console.error('Failed to initialize Firebase Admin:', e.message);
    process.exit(1);
  }
}

const db = admin.firestore();

function slugify(s) {
  return (
    String(s || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .slice(0, 60) || 'page'
  );
}

function targetUrls(slug) {
  const s = slugify(slug);
  const u = `${NEW_BASE}/p/${s}`;
  return { public_url: u, canonical_url: u };
}

async function migrateCollection(collectionId, dryRun) {
  const snap = await db.collection(collectionId).get();
  let updated = 0;
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const slug = data.slug;
    if (!slug) {
      console.warn(`[skip] ${collectionId}/${doc.id}: missing slug`);
      continue;
    }
    const next = targetUrls(slug);
    const same =
      data.public_url === next.public_url && data.canonical_url === next.canonical_url;
    if (same) continue;

    updated++;
    console.log(
      `${dryRun ? '[dry-run]' : '[apply]'} ${collectionId}/${doc.id}`,
      '\n  from:',
      { public_url: data.public_url, canonical_url: data.canonical_url },
      '\n  to:',
      next
    );

    if (!dryRun) {
      await doc.ref.set(
        { public_url: next.public_url, canonical_url: next.canonical_url },
        { merge: true }
      );
    }
  }
  return updated;
}

async function main() {
  const dryRun = !process.argv.includes('--apply');
  console.log(dryRun ? 'DRY RUN (no writes). Pass --apply to update Firestore.\n' : 'APPLYING MIGRATION...\n');

  const a = await migrateCollection('alphapages', dryRun);
  const b = await migrateCollection('alpha_pages_index', dryRun);

  console.log(`\nDone. ${dryRun ? 'Would update' : 'Updated'} ${a + b} document(s) (alphapages: ${a}, alpha_pages_index: ${b}).`);
  if (dryRun) console.log('\nRun with --apply to write changes.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
