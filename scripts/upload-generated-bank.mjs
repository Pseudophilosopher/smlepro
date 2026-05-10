/**
 * upload-generated-bank.mjs
 *
 * Consumes scripts/generated-final-bank.json and uploads it to Firestore.
 * Uses the same enrich/dedup/upload logic as upload-questions.mjs
 * but targeted at our freshly-generated bank.
 *
 * Usage:
 *   node scripts/upload-generated-bank.mjs --dry-run
 *   node scripts/upload-generated-bank.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname   = dirname(fileURLToPath(import.meta.url));
const saPath      = resolve(__dirname, '..', 'firebase-service-account.json');

if (!existsSync(saPath)) {
  console.error('❌ firebase-service-account.json not found. Run `npm run download-sa` first.');
  process.exit(1);
}

const sa = JSON.parse(readFileSync(saPath, 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const DRY_RUN = process.argv.includes('--dry-run');

// ── SCFHS Domain Map ─────────────────────────────────────────────────────────
const SCFHS_DOMAIN_MAP = {
  'Internal Medicine':   'Internal Medicine',
  'Cardiology':          'Internal Medicine – Cardiology',
  'Pulmonology':         'Internal Medicine – Pulmonology',
  'Neurology':           'Internal Medicine – Neurology',
  'Endocrinology':       'Internal Medicine – Endocrinology',
  'Nephrology':          'Internal Medicine – Nephrology',
  'Hematology':          'Internal Medicine – Hematology',
  'Rheumatology':        'Internal Medicine – Rheumatology',
  'Infectious Diseases': 'Internal Medicine – Infectious Diseases',
  'Gastroenterology':    'Surgery – Gastroenterology',
  'Surgery':             'Surgery',
  'Pediatrics':          'Pediatrics',
  'Obstetrics & Gynaecology': 'Obstetrics & Gynaecology',
  'OBGYN':               'Obstetrics & Gynaecology',
  'Radiology':           'Radiology',
  'Pathology':           'Pathology',
  'Emergency Medicine':  'Emergency Medicine',
  'Psychiatry':          'Internal Medicine – Psychiatry',
  'Dermatology':         'Internal Medicine – Dermatology',
  'Family & Community Medicine': 'Family & Community Medicine',
};

function makeDocId(question) {
  return question
    .toLowerCase()
    .slice(0, 70)
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/-$/, '');
}

function enrichQuestion(q) {
  const correctIndex  = q.options.findIndex(opt => opt.correct === true);
  const correctAnswer = correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : 'A';
  const correctOpt    = q.options[correctIndex];

  return {
    question:        q.question,
    topic:           q.topic || 'General',
    scfhs_domain:    SCFHS_DOMAIN_MAP[q.scfhs_domain || q.topic] || q.scfhs_domain || q.topic || 'General',
    difficulty:      q.difficulty || 'Moderate',
    year:            q.year || '2024-2025',
    image_reference: q.image_reference === true,
    options:         q.options,
    correct_answer:  correctAnswer,
    rationale:       correctOpt?.rationale || q.rationale || '',
    tags:            q.tags || [],
  };
}

async function clearQuestionsCollection() {
  console.log('🗑️  Clearing existing questions collection…');
  const snap = await db.collection('questions').get();
  if (snap.empty) {
    console.log('   Already empty.');
    return;
  }
  const CHUNK = 400;
  for (let i = 0; i < snap.docs.length; i += CHUNK) {
    const batch = db.batch();
    snap.docs.slice(i, i + CHUNK).forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
  console.log(`   Deleted ${snap.size} documents.`);
}

async function uploadQuestions(questions) {
  console.log(`\n📤 Uploading ${questions.length} questions…`);
  const CHUNK = 400;
  const idSeen = {};

  for (let i = 0; i < questions.length; i += CHUNK) {
    const batch = db.batch();
    questions.slice(i, i + CHUNK).forEach(q => {
      const base = makeDocId(q.question);
      idSeen[base] = (idSeen[base] || 0) + 1;
      const docId = idSeen[base] > 1 ? `${base}-${idSeen[base]}` : base;
      batch.set(db.collection('questions').doc(docId), enrichQuestion(q));
    });
    await batch.commit();
    console.log(`   ✅ Committed ${Math.min(i + CHUNK, questions.length)} / ${questions.length}`);
  }
}

function main() {
  const bankPath = resolve(__dirname, 'generated-final-bank.json');
  if (!existsSync(bankPath)) {
    console.error('❌ generated-final-bank.json not found. Run `node scripts/rebalance-and-add-rad-path.mjs` first.');
    process.exit(1);
  }

  const questions = JSON.parse(readFileSync(bankPath, 'utf8'));

  console.log('\n🚀 SMLE Pro — Generated Bank Upload');
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN' : '🔥 LIVE'}`);
  console.log(`   Loaded: ${questions.length} questions\n`);

  // Topic breakdown
  const topics = {};
  const diffs  = {};
  questions.forEach(q => {
    const d = SCFHS_DOMAIN_MAP[q.scfhs_domain || q.topic] || q.scfhs_domain || q.topic || 'General';
    topics[d] = (topics[d] || 0) + 1;
    diffs[q.difficulty] = (diffs[q.difficulty] || 0) + 1;
  });

  console.log('   By domain:');
  Object.entries(topics).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => console.log(`     ${t.padEnd(40)} ${c}`));
  
  console.log('\n   By difficulty:');
  Object.entries(diffs).sort((a, b) => b[1] - a[1]).forEach(([d, c]) => console.log(`     ${d.padEnd(15)} ${c}`));

  if (DRY_RUN) {
    console.log('\n🔍 Sample enriched question:');
    const e = enrichQuestion(questions[0]);
    console.log(`   ID:             ${makeDocId(questions[0].question)}`);
    console.log(`   correct_answer: ${e.correct_answer}`);
    console.log(`   scfhs_domain:   ${e.scfhs_domain}`);
    console.log(`   rationale:      ${(e.rationale || '').slice(0, 100)}…`);
    console.log('\n✅ Dry run complete — no data was written.');
    return;
  }

  console.log('\n⚠️  This will DELETE all existing questions and re-upload.');
  console.log('   Press Ctrl+C within 5 seconds to abort…\n');

  setTimeout(async () => {
    await clearQuestionsCollection();
    await uploadQuestions(questions);
    console.log('\n🎉 Upload complete!');
    console.log('   Visit https://smlepro.web.app to verify.\n');
  }, 5000);
}

main().catch(err => {
  console.error('\n❌ Upload failed:', err);
  process.exit(1);
});
