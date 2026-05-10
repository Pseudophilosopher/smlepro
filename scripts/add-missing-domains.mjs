/**
 * add-missing-domains.mjs
 *
 * Adds the 339 generated missing-domain questions to the LIVE Firestore DB
 * without wiping existing data. Uses the same enrich/dedup logic as fix-and-deploy.mjs.
 *
 * Usage:
 *   node scripts/add-missing-domains.mjs --dry-run    ← preview
 *   node scripts/add-missing-domains.mjs              ← live
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const saPath = resolve(__dirname, '..', 'firebase-service-account.json');
if (!existsSync(saPath)) { console.error('❌ firebase-service-account.json not found.'); process.exit(1); }
const sa = JSON.parse(readFileSync(saPath, 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const DRY_RUN = process.argv.includes('--dry-run');

// ── Topic tags for new domains ────────────────────────────────────────────────
const TOPIC_TAGS = {
  'Surgery': ['surgery', 'general-surgery'],
  'Surgery – Orthopedics': ['orthopedics', 'ortho', 'fracture'],
  'Surgery – Ophthalmology': ['ophthalmology', 'eye'],
  'Surgery – ENT': ['ent', 'otolaryngology'],
  'Surgery – Urology': ['urology', 'renal-colic'],
  'Obstetrics & Gynaecology': ['obstetrics', 'gynecology', 'obgyn'],
  'OBGYN': ['obstetrics', 'gynecology', 'obgyn'],
  'Emergency Medicine': ['emergency-medicine', 'emergency'],
  'Pediatrics': ['pediatrics', 'child-health'],
  'Family & Community Medicine': ['family-medicine', 'primary-care'],
  'Family Medicine': ['family-medicine', 'primary-care'],
  'Medical Ethics & Professionalism': ['ethics', 'professionalism'],
  'Medical Ethics': ['ethics', 'professionalism'],
  'Forensic Medicine': ['forensic', 'forensic-medicine'],
};

function makeDocId(question) {
  return question.toLowerCase().slice(0, 70)
    .replace(/[^a-z0-9\s]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-').replace(/-$/, '');
}

function enrichQuestion(q) {
  const correctIndex = q.options.findIndex(opt => opt.correct === true);
  const correctAnswer = correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : 'A';
  const correctOpt = q.options[correctIndex];
  const domain = q.scfhs_domain || q.topic || 'General';
  const topicBased = TOPIC_TAGS[domain] || TOPIC_TAGS[q.topic] || [];
  const tags = [...new Set([...topicBased, ...(q.tags || [])])];

  return {
    question: q.question,
    topic: q.topic || 'General',
    scfhs_domain: domain,
    difficulty: q.difficulty || 'Moderate',
    year: q.year || '2024-2025',
    image_reference: q.image_reference === true,
    options: q.options,
    correct_answer: correctAnswer,
    rationale: correctOpt?.rationale || q.rationale || '',
    tags,
  };
}

async function main() {
  const bankPath = resolve(__dirname, 'generated-missing-domains.json');
  if (!existsSync(bankPath)) {
    console.error('❌ generated-missing-domains.json not found. Run `node scripts/generate-missing-domains.mjs` first.');
    process.exit(1);
  }

  const questions = JSON.parse(readFileSync(bankPath, 'utf8'));
  console.log('\n' + '═'.repeat(60));
  console.log('🚀 SMLE Pro — Add Missing Domains');
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN' : '🔥 LIVE'}`);
  console.log(`   Source: ${questions.length} questions from generated-missing-domains.json`);
  console.log('═'.repeat(60));

  // Show breakdown
  const topics = {};
  questions.forEach(q => {
    const t = q.topic || 'General';
    topics[t] = (topics[t] || 0) + 1;
  });
  console.log('\n📊 Questions by domain:');
  Object.entries(topics).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
    console.log(`   ${t.padEnd(35)} ${c}`);
  });
  console.log(`   ${'─'.repeat(40)}`);
  console.log(`   TOTAL:               ${questions.length}`);

  // Check existing
  console.log('\n🔍 Checking for duplicates with existing DB…');
  const existingSnap = await db.collection('questions').get();
  const existingIds = new Set(existingSnap.docs.map(d => d.id));
  const existingCount = existingSnap.size;
  console.log(`   Existing questions:  ${existingCount}`);

  const toAdd = [];
  const idSeen = {};
  for (const q of questions) {
    const base = makeDocId(q.question);
    idSeen[base] = (idSeen[base] || 0) + 1;
    const docId = idSeen[base] > 1 ? `${base}-${idSeen[base]}` : base;
    if (existingIds.has(docId)) continue;
    toAdd.push({ docId, question: q });
  }

  console.log(`   New unique to add:   ${toAdd.length}`);
  if (toAdd.length === 0) {
    console.log('\n✅ No new questions to add. DB already has all domains covered.');
    return;
  }

  if (DRY_RUN) {
    console.log('\n🔍 Sample (first new question):');
    const e = enrichQuestion(toAdd[0].question);
    console.log(`   ID:       ${toAdd[0].docId}`);
    console.log(`   Topic:    ${e.topic}`);
    console.log(`   Domain:   ${e.scfhs_domain}`);
    console.log(`   Tags:     ${e.tags.join(', ')}`);
    console.log(`   Question: ${(e.question || '').slice(0, 80)}…`);
    console.log(`   Answer:   ${e.correct_answer}: ${(e.options[0]?.text || '').slice(0, 50)}…`);
    console.log('\n✅ Dry run complete. Run without --dry-run to upload.');
    return;
  }

  // SAVE backup first
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = join(__dirname, 'backups', `pre-add-missing-domains-${ts}.json`);
  const backupData = [];
  existingSnap.forEach(doc => backupData.push({ id: doc.id, ...doc.data() }));
  writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`\n📦 Backup saved: ${backupPath} (${existingCount} questions)`);

  console.log('\n⏳ Starting upload in 3s… (Ctrl+C to abort)');
  await new Promise(r => setTimeout(r, 3000));

  // Upload
  const CHUNK = 400;
  for (let i = 0; i < toAdd.length; i += CHUNK) {
    const batch = db.batch();
    toAdd.slice(i, i + CHUNK).forEach(({ docId, question }) => {
      batch.set(db.collection('questions').doc(docId), enrichQuestion(question));
    });
    await batch.commit();
    console.log(`   ✅ Added ${Math.min(i + CHUNK, toAdd.length)} / ${toAdd.length}`);
  }

  // Update daily dose
  const allSnap = await db.collection('questions').get();
  const finalCount = allSnap.size;
  const dailyDose = {
    enabled: true,
    title: 'Daily Dose',
    subtitle: `${finalCount} questions to master the SMLE`,
    questions: [],
    lastUpdated: new Date().toISOString(),
    updatedBy: 'add-missing-domains.mjs',
    description: 'Your daily recommended questions covering multiple specialties.',
  };
  // Pick 5 across different domains
  const domainsSeen = new Set();
  const allDocs = [];
  allSnap.forEach(doc => allDocs.push({ id: doc.id, data: doc.data() }));
  for (const d of allDocs) {
    const domain = d.data.scfhs_domain || '';
    if (!domainsSeen.has(domain) && domainsSeen.size < 5) {
      domainsSeen.add(domain);
      dailyDose.questions.push(d.id);
    }
    if (domainsSeen.size >= 5) break;
  }
  await db.collection('config').doc('daily-dose').set(dailyDose);
  console.log(`   ✅ Daily dose updated (${finalCount} total questions, ${dailyDose.questions.length} domains represented)`);

  console.log('\n' + '═'.repeat(60));
  console.log('🎉 UPGRADE COMPLETE!');
  console.log('═'.repeat(60));
  console.log(`   Before:  ${existingCount}`);
  console.log(`   Added:   ${toAdd.length}`);
  console.log(`   After:   ${finalCount}`);
  console.log('═'.repeat(60));
  console.log('\n   Deploy:  firebase deploy --only hosting');
  console.log('   Visit:   https://smlepro.web.app\n');
}

main().catch(err => {
  console.error('\n❌ Failed:', err);
  process.exit(1);
});
