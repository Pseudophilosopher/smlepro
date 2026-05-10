/**
 * fix-question-bank.mjs
 *
 * One-shot cleanup script for all audit findings:
 *   1. Auto-generate tags for all questions with empty tags
 *   2. Delete ALL existing Storage images + clear Firestore image fields
 *   3. Clear broken image_reference flags (questions with no good visual)
 *   4. Show post-fix summary
 *
 * Usage:
 *   node scripts/fix-question-bank.mjs --dry-run
 *   node scripts/fix-question-bank.mjs --delete-images
 *   node scripts/fix-question-bank.mjs --delete-images --fix-tags
 *
 *   --delete-images  : Required flag to actually purge images (safety)
 *   --fix-tags       : Generate tags for empty-tag questions
 *   --fix-broken-refs: Set image_reference=false when no image_url exists
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'firebase-service-account.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'smle-mock-exam-51478532-5ae31.firebasestorage.app',
});

const db = getFirestore();
const bucket = getStorage().bucket();

// ── CLI ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const DELETE_IMAGES = args.includes('--delete-images');
const FIX_TAGS = args.includes('--fix-tags');
const FIX_BROKEN_REFS = args.includes('--fix-broken-refs');
const FIX_ALL = args.includes('--fix-all');

if (!DRY_RUN && !DELETE_IMAGES && !FIX_TAGS && !FIX_BROKEN_REFS && !FIX_ALL) {
  console.log(`
Usage:
  node scripts/fix-question-bank.mjs --dry-run              Preview all changes
  node scripts/fix-question-bank.mjs --fix-all --dry-run    Preview full fix
  node scripts/fix-question-bank.mjs --fix-all              APPLY full fix (destructive)

Flags:
  --dry-run        Preview only, no writes
  --delete-images  Delete ALL images from Storage + clear Firestore image fields
  --fix-tags       Auto-generate tags for questions with empty/missing tags
  --fix-broken-refs  Set image_reference=false when no image_url exists
  --fix-all        Run all fixes above
`);
  process.exit(0);
}

const runDelete = FIX_ALL || DELETE_IMAGES;
const runFixTags = FIX_ALL || FIX_TAGS;
const runFixRefs = FIX_ALL || FIX_BROKEN_REFS;

// ── Helpers ──────────────────────────────────────────────────

function generateTags(data) {
  const tags = new Set();

  // Topic tag
  if (data.topic) tags.add(data.topic.toLowerCase().replace(/\s+/g, '-'));

  // SCFHS domain tag (top-level only, not sub-specialty)
  if (data.scfhs_domain) {
    const domain = data.scfhs_domain.split('–')[0].trim().toLowerCase().replace(/\s+/g, '-');
    tags.add(domain);
  }

  // Difficulty
  if (data.difficulty) tags.add(data.difficulty.toLowerCase());

  // Year
  if (data.year) tags.add(String(data.year));

  // Modality tags from stem text
  const stem = String(data.question || '').toLowerCase();
  if (/\b(rash|vesicle|ulcer|lesion|malar|butterfly|skin)\b/.test(stem)) tags.add('dermatology');
  if (/\b(x-?ray|radiograph|cxr|infiltrate|consolidation|pneumothorax)\b/.test(stem)) tags.add('radiology');
  if (/\b(ecg|ekg|st elevation|qrs|t wave|arrhythm)\b/.test(stem)) tags.add('ecg');
  if (/\b(ultrasound|sonograph|doppler)\b/.test(stem)) tags.add('ultrasound');
  if (/\b(ct scan|computed tomography)\b/.test(stem)) tags.add('ct');
  if (/\b(mri|magnetic resonance)\b/.test(stem)) tags.add('mri');
  if (/\b(fundus|retina|cataract|corneal|pupil|ocular)\b/.test(stem)) tags.add('ophthalmology');
  if (data.image_reference === true) tags.add('has-image');

  return [...tags].filter(Boolean).slice(0, 12);
}

async function fetchAllQuestions() {
  const out = [];
  let q = db.collection('questions').orderBy('__name__').limit(500);
  let last = null;
  while (true) {
    const snap = last ? await q.startAfter(last).get() : await q.get();
    if (snap.empty) break;
    snap.forEach((doc) => out.push({ id: doc.id, ...doc.data() }));
    last = snap.docs[snap.docs.length - 1];
    process.stdout.write(`\r   Loaded ${out.length} documents…`);
    if (snap.size < 500) break;
  }
  console.log(`\r   Loaded ${out.length} documents.`);
  return out;
}

// ── 1. Fix Tags ──────────────────────────────────────────────

async function fixTags(questions) {
  console.log('\n🏷️  TAG FIX\n');
  const toFix = questions.filter((q) => !Array.isArray(q.tags) || q.tags.length === 0);
  console.log(`   ${toFix.length} questions need tags`);

  if (toFix.length === 0) return { fixed: 0 };

  if (DRY_RUN) {
    toFix.slice(0, 5).forEach((q) => {
      const newTags = generateTags(q);
      console.log(`   [DRY] ${q.id}`);
      console.log(`         tags: [${newTags.join(', ')}]`);
    });
    if (toFix.length > 5) console.log(`   ... and ${toFix.length - 5} more`);
    return { fixed: toFix.length };
  }

  // Batch in chunks of 400
  const CHUNK = 400;
  let fixed = 0;
  for (let i = 0; i < toFix.length; i += CHUNK) {
    const batch = db.batch();
    toFix.slice(i, i + CHUNK).forEach((q) => {
      batch.update(db.collection('questions').doc(q.id), { tags: generateTags(q) });
    });
    await batch.commit();
    fixed += Math.min(CHUNK, toFix.length - i);
    console.log(`   ✅ Committed ${fixed}/${toFix.length}`);
  }
  return { fixed };
}

// ── 2. Delete All Images ─────────────────────────────────────

async function deleteAllImages(questions) {
  console.log('\n🗑️  IMAGE PURGE\n');

  // Find all questions with image_url
  const withImages = questions.filter((q) => q.image_url);
  console.log(`   ${withImages.length} questions have image_url`);

  if (withImages.length === 0) {
    console.log('   Nothing to delete.');
    return { storageDeleted: 0, firestoreCleared: 0 };
  }

  if (DRY_RUN) {
    withImages.slice(0, 5).forEach((q) => {
      console.log(`   [DRY] Would delete: ${q.image_url}`);
      console.log(`         Would clear fields on: ${q.id}`);
    });
    if (withImages.length > 5) console.log(`   ... and ${withImages.length - 5} more`);
    return { storageDeleted: withImages.length, firestoreCleared: withImages.length };
  }

  // Delete from Storage (best effort, don't fail on missing files)
  let storageDeleted = 0;
  for (const q of withImages) {
    try {
      const fileName = `question-images/${q.id}.jpg`;
      await bucket.file(fileName).delete();
      storageDeleted++;
    } catch (e) {
      // File may not exist; that's fine
      if (e.code !== 404) {
        console.log(`   ⚠️  Storage delete failed for ${q.id}: ${e.message}`);
      }
    }
  }
  console.log(`   ☁️  Deleted ${storageDeleted} files from Storage`);

  // Clear Firestore fields in batches
  const CHUNK = 400;
  let firestoreCleared = 0;
  for (let i = 0; i < withImages.length; i += CHUNK) {
    const batch = db.batch();
    withImages.slice(i, i + CHUNK).forEach((q) => {
      batch.update(db.collection('questions').doc(q.id), {
        image_url: null,
        image_verified: false,
        image_attached_at: null,
        image_search_query: null,
        image_source: null,
        // Keep image_reference as-is (admin decides which need visuals)
        // Keep ai_image_plan for re-attachment guidance
      });
    });
    await batch.commit();
    firestoreCleared += Math.min(CHUNK, withImages.length - i);
    console.log(`   📝 Cleared fields on ${firestoreCleared}/${withImages.length}`);
  }

  return { storageDeleted, firestoreCleared };
}

// ── 3. Fix Broken image_reference ────────────────────────────

async function fixBrokenRefs(questions) {
  console.log('\n🔧 BROKEN IMAGE REFERENCE FIX\n');

  const broken = questions.filter(
    (q) => q.image_reference === true && !q.image_url
  );
  console.log(`   ${broken.length} questions have image_reference=true but no image_url`);

  if (broken.length === 0) return { cleared: 0 };

  if (DRY_RUN) {
    broken.slice(0, 5).forEach((q) => {
      console.log(`   [DRY] Would set image_reference=false on: ${q.id}`);
      console.log(`         Q: ${(q.question || '').slice(0, 80)}...`);
    });
    if (broken.length > 5) console.log(`   ... and ${broken.length - 5} more`);
    return { cleared: broken.length };
  }

  const CHUNK = 400;
  let cleared = 0;
  for (let i = 0; i < broken.length; i += CHUNK) {
    const batch = db.batch();
    broken.slice(i, i + CHUNK).forEach((q) => {
      batch.update(db.collection('questions').doc(q.id), {
        image_reference: false,
        image_search_no_result: true, // mark so attach script skips them
      });
    });
    await batch.commit();
    cleared += Math.min(CHUNK, broken.length - i);
    console.log(`   ✅ Cleared ${cleared}/${broken.length}`);
  }
  return { cleared };
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('\n🔧 SMLE Pro — Question Bank Fix\n');
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN' : '🔥 LIVE'}`);
  console.log(`   Delete images: ${runDelete}`);
  console.log(`   Fix tags: ${runFixTags}`);
  console.log(`   Fix broken refs: ${runFixRefs}\n`);

  if (!DRY_RUN) {
    console.log('⚠️  This will modify production data. Press Ctrl+C within 5 seconds to abort...\n');
    await new Promise((r) => setTimeout(r, 5000));
  }

  const questions = await fetchAllQuestions();

  const results = {};

  if (runFixTags) {
    results.tags = await fixTags(questions);
  }

  if (runDelete) {
    results.images = await deleteAllImages(questions);
  }

  if (runFixRefs) {
    results.refs = await fixBrokenRefs(questions);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════');
  if (results.tags) console.log(`  Tags fixed:     ${results.tags.fixed}`);
  if (results.images) {
    console.log(`  Images deleted: ${results.images.storageDeleted} (Storage)`);
    console.log(`  Fields cleared: ${results.images.firestoreCleared} (Firestore)`);
  }
  if (results.refs) console.log(`  Broken refs:    ${results.refs.cleared}`);
  console.log('═══════════════════════════════════════\n');

  if (DRY_RUN) {
    console.log('This was a DRY RUN. No changes were made.');
    console.log('Run without --dry-run to apply.\n');
  } else {
    console.log('Next steps:');
    if (runDelete) {
      console.log('  1. Review which questions truly need images');
      console.log('  2. Set image_reference=true only on high-yield visual stems');
      console.log('  3. Run: node scripts/attach-images-improved.mjs --dry-run --limit=20');
    }
    console.log('\n');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
