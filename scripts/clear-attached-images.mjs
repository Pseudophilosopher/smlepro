/**
 * clear-attached-images.mjs
 *
 * Removes image_url from all questions that have unverified images
 * (image_verified === false), resetting them to a clean state.
 *
 * Usage: node scripts/clear-attached-images.mjs [--id=DOC_ID]
 *   Without --id: clears ALL unverified images (after user confirms)
 *   With --id: clears a single document
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const saPath = resolve(__dirname, '..', 'firebase-service-account.json');
if (!existsSync(saPath)) { console.error('❌ firebase-service-account.json not found.'); process.exit(1); }
const sa = JSON.parse(readFileSync(saPath, 'utf8'));
initializeApp({
  credential: cert(sa),
  storageBucket: 'smle-mock-exam-51478532-5ae31.firebasestorage.app',
});
const db = getFirestore();
const bucket = getStorage().bucket();

const SINGLE_ID = (() => {
  const m = process.argv.join(' ').match(/--id=(\S+)/);
  return m ? m[1] : null;
})();

async function clearSingle(id) {
  const ref = db.collection('questions').doc(id);
  const snap = await ref.get();
  if (!snap.exists) { console.error(`❌ Document ${id} not found.`); return; }
  const data = snap.data();
  const url = data.image_url;
  const verified = data.image_verified;

  if (!url) { console.log(`   ${id}: no image_url — nothing to clear.`); return; }
  if (verified === true) { console.log(`   ${id}: image is APPROVED — skipping.`); return; }

  // Delete from Storage
  const dest = `question-images/${id}.jpg`;
  try { await bucket.file(dest).delete(); console.log(`   🗑️  Deleted from storage: ${dest}`); } catch (_) { console.log(`   ⚠️  Storage file ${dest} not found (ok).`); }

  // Clear from Firestore
  await ref.update({
    image_url: null,
    image_source: null,
    image_title: null,
    image_width: null,
    image_height: null,
    image_size_kb: null,
    image_attached_at: null,
    image_verified: null,
  });
  console.log(`   ✅ ${id}: image cleared, ready for new attachment.`);
}

async function main() {
  if (SINGLE_ID) {
    console.log(`\n🧹 Clearing single document: ${SINGLE_ID}\n`);
    await clearSingle(SINGLE_ID);
    return;
  }

  console.log('\n🧹 Clearing ALL unverified images...\n');

  const snap = await db.collection('questions').get();
  let cleared = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.image_verified === false && data.image_url) {
      console.log(`\n[${cleared + 1}] ${docSnap.id}`);
      await clearSingle(docSnap.id);
      cleared++;
    }
  }

  console.log(`\n═══ Done: ${cleared} documents cleared ═══\n`);
}

main().catch((err) => { console.error('❌ Fatal:', err); process.exit(1); });
