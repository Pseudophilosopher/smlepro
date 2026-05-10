/**
 * reset-question-images.mjs
 *
 * Clears auto-attached Wikimedia metadata so you can re-run Gemini plans + attach-images.
 * Safe default: print plan only. Writes require --execute.
 *
 * Usage (preview):
 *   node scripts/reset-question-images.mjs
 *
 * Clear unverified Wikimedia images on all image_reference rows (keeps verified):
 *   node scripts/reset-question-images.mjs --execute --clear-attached
 *
 * Also clear "no result" markers so attach-images retries:
 *   node scripts/reset-question-images.mjs --execute --clear-attached --clear-no-result
 *
 * Regenerate Gemini search queries next (Admin batch); optional wipe of existing plan:
 *   node scripts/reset-question-images.mjs --execute --clear-ai-plan
 *
 * Combine (full re-pipeline for bad auto batch):
 *   node scripts/reset-question-images.mjs --execute --clear-attached --clear-no-result
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(new URL('../firebase-service-account.json', import.meta.url), 'utf8'));

initializeApp({ credential: cert(sa) });
const db = getFirestore();

function parseArgs(argv) {
  const execute = argv.includes('--execute');
  const clearAttached = argv.includes('--clear-attached');
  const clearNoResult = argv.includes('--clear-no-result');
  const clearAiPlan = argv.includes('--clear-ai-plan');
  const includeVerified = argv.includes('--include-verified');
  return { execute, clearAttached, clearNoResult, clearAiPlan, includeVerified };
}

function buildUpdatePayload(flags) {
  const u = {};
  if (flags.clearAttached) {
    u.image_url = FieldValue.delete();
    u.image_source = FieldValue.delete();
    u.image_search_query = FieldValue.delete();
    u.image_attached_at = FieldValue.delete();
    u.image_verified = false;
    u.image_rejected = FieldValue.delete();
  }
  if (flags.clearNoResult) {
    u.image_search_no_result = false;
    u.image_search_no_result_at = FieldValue.delete();
    u.image_search_query_attempted = FieldValue.delete();
  }
  if (flags.clearAiPlan) {
    u.ai_image_plan = FieldValue.delete();
    u.ai_image_plan_updated_at = FieldValue.delete();
  }
  return u;
}

async function fetchImageReferenceDocs() {
  const out = [];
  const page = () =>
    db.collection('questions').where('image_reference', '==', true).orderBy(FieldPath.documentId()).limit(500);
  let last = null;
  while (true) {
    const snap = last ? await page().startAfter(last).get() : await page().get();
    if (snap.empty) break;
    snap.forEach((doc) => out.push({ id: doc.id, ref: doc.ref, data: doc.data() || {} }));
    last = snap.docs[snap.docs.length - 1];
    process.stdout.write(`\r   Scanned ${out.length} image_reference…`);
    if (snap.size < 500) break;
  }
  console.log(`\r   Scanned ${out.length} image_reference documents.`);
  return out;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const payload = buildUpdatePayload(flags);

  if (Object.keys(payload).length === 0) {
    console.error(
      '\nSpecify at least one of:\n' +
        '  --clear-attached   Remove image_url / source / search log (reset to unverified, no image)\n' +
        '  --clear-no-result  Clear Wikimedia "no match" markers\n' +
        '  --clear-ai-plan    Remove ai_image_plan (re-run Admin → Batch Gemini after)\n'
    );
    process.exit(1);
  }

  console.log('\n🧹 SMLE Pro — Reset question image metadata\n');
  console.log(`   Mode: ${flags.execute ? 'EXECUTE (writes to Firestore)' : 'DRY RUN (no writes)'}`);
  console.log(`   clear-attached: ${flags.clearAttached}`);
  console.log(`   clear-no-result: ${flags.clearNoResult}`);
  console.log(`   clear-ai-plan: ${flags.clearAiPlan}`);
  console.log(`   include-verified (when clearing attached): ${flags.includeVerified}\n`);

  const docs = await fetchImageReferenceDocs();
  const targets = docs.filter((d) => {
    if (!flags.clearAttached) return true;
    if (flags.includeVerified) return true;
    return d.data.image_verified !== true;
  });

  let wouldClearAttached = 0;
  for (const d of targets) {
    if (flags.clearAttached && d.data.image_url) wouldClearAttached++;
  }

  console.log(`   Rows matching filters: ${targets.length}`);
  if (flags.clearAttached) console.log(`   Rows with image_url to strip: ${wouldClearAttached}`);

  if (targets.length === 0) {
    console.log('\n   Nothing to update (0 matching documents).\n');
    process.exit(0);
  }

  if (!flags.execute) {
    console.log('\n   Re-run with --execute to apply. Make a backup first: npm run backup\n');
    process.exit(0);
  }

  const BATCH = 400;
  let written = 0;
  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = db.batch();
    const slice = targets.slice(i, i + BATCH);
    for (const { ref } of slice) {
      batch.update(ref, payload);
    }
    await batch.commit();
    written += slice.length;
    console.log(`   Committed ${written} / ${targets.length}`);
  }

  console.log('\n✅ Done. Suggested order:');
  console.log('   1) Admin → Batch Gemini image plans (optionally with Force on weak plans)');
  console.log('   2) npm run attach-images:loop   (omit --mark-skip-on-no-match until you need it)\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
