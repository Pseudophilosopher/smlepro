/**
 * flag-image-questions.mjs
 *
 * Flags Firestore questions that would benefit from images.
 * Sets image_reference=true on questions with explicit visual keywords.
 * Does NOT blanket-flag entire specialties — only keyword-matched.
 *
 * Usage:
 *   node scripts/flag-image-questions.mjs --dry-run
 *   node scripts/flag-image-questions.mjs
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const saPath = resolve(__dirname, '..', 'firebase-service-account.json');
if (!existsSync(saPath)) { console.error('❌ firebase-service-account.json not found.'); process.exit(1); }
const sa = JSON.parse(readFileSync(saPath, 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();
const DRY_RUN = process.argv.includes('--dry-run');

// Medical visual keywords — matching clincial findings, imaging modalities,
// procedures with visible findings, and pathological findings
const VISUAL = /\b(wound|burn|abscess|cellulitis|fracture|dislocat|ecg|ekg|ct\sscan|mri|x-?ray|radiograph|ultrasound|sonograph|doppler|histolog|biopsy|endoscop|fundus|retina|skin\s|dermato|necrosis|gangrene|tumor|mass\s|nodule|ulcer|erosion|plaque|papule|vesicle|bullae|petechiae|ecchymos|jaundice|cyanosis|clubbing|lymphaden|goiter|thyromeg|stridor|wheez|crackle|murmur|gallop|bruit|varices|fistula|hernia|stenosis|aneurysm|thrombos|embol|infarct|ischem|hemorrhag|hematom|cataract|glaucoma|keratitis|conjunctiv|macular|ascites|caput\s|spider\sangi|palmar\seryth|dupytren|koilonychia|onycholys|splinter\s|osler|janeway|erythema|purpura|urticar|erysipelas|impetigo|furuncle|carbuncle|empyema|consolidation|infiltrate|pneumothorax|obstruction|calcification|sclerosis|osteophyte|osteomyel|nevus|melanoma|carcinoma|sarcoma|lymphoma|leukemia|splenomegaly|hepatomegaly|organomegaly|cyst|polyp|dissection|rupture|perforation|swelling|edema\s|pericardial\seffusion|pleural\seffusion)/i;

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('🖼️  SMLE Pro — Flag Image Questions');
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN' : '🔥 LIVE'}`);
  console.log('═'.repeat(60));

  const allDocs = [];
  let last = null;
  let q = db.collection('questions').orderBy('__name__').limit(500);
  while (true) {
    const snap = last ? await q.startAfter(last).get() : await q.get();
    if (snap.empty) break;
    snap.forEach(doc => allDocs.push({ ref: doc.ref, id: doc.id, data: doc.data() }));
    last = snap.docs[snap.docs.length - 1];
    process.stdout.write(`\r   Loaded ${allDocs.length}…`);
    if (snap.size < 500) break;
  }
  console.log(`\r   Total: ${allDocs.length} questions.`);

  const toFlag = [];
  const modals = {};
  for (const doc of allDocs) {
    const d = doc.data;
    if (d.image_url) continue;
    if (d.image_reference === true) continue;

    const allText = ((d.question||'') + ' ' + ((d.options||[]).map(o=>o.text||'').join(' ')));
    if (!VISUAL.test(allText)) continue;

    const stem = (d.question||'').toLowerCase();
    let modal = 'other';
    if (/\b(ecg|ekg)\b/.test(stem)) modal = 'ecg';
    else if (/\b(x-?ray|cxr|radiograph)\b/.test(stem)) modal = 'xray';
    else if (/\b(ct|computed tomography)\b/.test(stem)) modal = 'ct';
    else if (/\b(mri|magnetic resonance)\b/.test(stem)) modal = 'mri';
    else if (/\b(ultrasound|sonograph|doppler)\b/.test(stem)) modal = 'ultrasound';
    else if (/\b(fundus|retina|ophthal|cataract|glaucoma|keratitis|corneal)\b/.test(stem)) modal = 'ophthal';
    else if (/\b(rash|lesion|vesicle|ulcer|skin|dermato|erythema|purpura|bullae)\b/.test(stem)) modal = 'clinical_photo';
    else if (/\b(histolog|biopsy|patholog|microscop|gram\sstain)\b/.test(stem)) modal = 'histology';

    modals[modal] = (modals[modal] || 0) + 1;
    toFlag.push({ ref: doc.ref, id: doc.id, modal, topic: d.scfhs_domain || d.topic || '' });
  }

  console.log(`\n📊 Needs image: ${toFlag.length} questions (keyword-matched)\n`);
  console.log('📊 By image type:');
  Object.entries(modals).sort((a,b)=>b[1]-a[1]).forEach(([m,c])=>console.log(`   ${m.padEnd(20)} ${c}`));

  console.log('\n📊 By specialty (top 15):');
  const sc = {};
  toFlag.forEach(d => { const t = d.topic || 'UNKNOWN'; sc[t] = (sc[t]||0)+1; });
  Object.entries(sc).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([t,c])=>console.log(`   ${t.padEnd(35)} ${c}`));

  if (DRY_RUN) {
    console.log(`\n✅ Dry run. ${toFlag.length} would be flagged.`);
    return;
  }

  console.log('\n⏳ Flagging in 3s…');
  await new Promise(r => setTimeout(r, 3000));

  const CHUNK = 400; let flagged = 0;
  for (let i = 0; i < toFlag.length; i += CHUNK) {
    const batch = db.batch();
    toFlag.slice(i, i+CHUNK).forEach(d => batch.update(d.ref, { image_reference: true, image_flagged_at: new Date().toISOString() }));
    await batch.commit();
    flagged += Math.min(CHUNK, toFlag.length - i);
    console.log(`   ✅ ${flagged} / ${toFlag.length}`);
  }
  console.log(`\n🎉 Done! ${flagged} questions flagged.`);
  console.log('\n   Run: node scripts/attach-images-improved.mjs --limit=50');
  console.log('   Or:  DRY_RUN=1 node scripts/attach-images-improved.mjs --dry-run --limit=10');
}

main().catch(err => { console.error('\n❌ Failed:', err); process.exit(1); });
