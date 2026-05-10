/**
 * fix-question-bank-fast.mjs
 *
 * Fast Firestore-only cleanup. Does NOT delete Storage files (do that via
 * Firebase Console or gsutil separately if needed).
 *
 * Usage:
 *   node scripts/fix-question-bank-fast.mjs --dry-run
 *   node scripts/fix-question-bank-fast.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(join(__dirname, '..', 'firebase-service-account.json'), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const DRY_RUN = process.argv.includes('--dry-run');

async function fetchAll() {
  const out = [];
  let q = db.collection('questions').orderBy('__name__').limit(500);
  let last = null;
  while (true) {
    const snap = last ? await q.startAfter(last).get() : await q.get();
    if (snap.empty) break;
    snap.forEach((doc) => out.push({ id: doc.id, ref: doc.ref, data: doc.data() }));
    last = snap.docs[snap.docs.length - 1];
    process.stdout.write(`\r   Loaded ${out.length} docs…`);
    if (snap.size < 500) break;
  }
  console.log(`\r   Loaded ${out.length} docs.   `);
  return out;
}

async function main() {
  console.log('\n🔧 SMLE Pro — Fast Question Bank Fix\n');
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN' : '🔥 LIVE'}\n`);

  const docs = await fetchAll();

  // 1. Clear ALL image fields on every question (nuclear option for image reset)
  const withUrl = docs.filter((d) => d.data.image_url);
  console.log(`\n🗑️  ${withUrl.length} docs have image_url to clear`);

  if (!DRY_RUN && withUrl.length > 0) {
    const CHUNK = 400;
    let cleared = 0;
    for (let i = 0; i < withUrl.length; i += CHUNK) {
      const batch = db.batch();
      withUrl.slice(i, i + CHUNK).forEach((d) => {
        batch.update(d.ref, {
          image_url: null,
          image_verified: false,
          image_attached_at: null,
          image_search_query: null,
          image_source: null,
        });
      });
      await batch.commit();
      cleared += Math.min(CHUNK, withUrl.length - i);
      console.log(`   ✅ Cleared ${cleared}/${withUrl.length}`);
    }
  }

  // 2. Fix broken image_reference (ref=true but no url)
  const broken = docs.filter((d) => d.data.image_reference === true && !d.data.image_url);
  console.log(`\n🔧 ${broken.length} docs have broken image_reference`);

  if (!DRY_RUN && broken.length > 0) {
    const CHUNK = 400;
    let fixed = 0;
    for (let i = 0; i < broken.length; i += CHUNK) {
      const batch = db.batch();
      broken.slice(i, i + CHUNK).forEach((d) => {
        batch.update(d.ref, {
          image_reference: false,
          image_search_no_result: true,
        });
      });
      await batch.commit();
      fixed += Math.min(CHUNK, broken.length - i);
      console.log(`   ✅ Fixed ${fixed}/${broken.length}`);
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  DONE');
  console.log('═══════════════════════════════════════');
  console.log(`  Image fields cleared: ${withUrl.length}`);
  console.log(`  Broken refs fixed:    ${broken.length}`);
  console.log('═══════════════════════════════════════\n');

  if (DRY_RUN) {
    console.log('DRY RUN — no changes made. Run without --dry-run to apply.\n');
  } else {
    console.log('Next: Delete orphaned files from Firebase Storage if desired.');
    console.log('Then selectively re-enable image_reference on high-yield visual stems.');
    console.log('Then run: node scripts/attach-images-improved.mjs --dry-run --limit=20\n');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
