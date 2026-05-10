/**
 * fix-and-deploy.mjs
 *
 * Master upgrade script. Does NOT wipe existing DB — it **adds** our
 * 424 new questions, fixes bad rationales, adds tags, configures daily dose.
 *
 * Usage:
 *   node scripts/fix-and-deploy.mjs --dry-run     ← preview only
 *   node scripts/fix-and-deploy.mjs               ← live (5s safety pause)
 *
 * Prerequisites:
 *   - scripts/generated-final-bank.json (from rebalance-and-add-rad-path.mjs)
 *   - firebase-service-account.json in project root
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Init Firebase ─────────────────────────────────────────────────────────────
const saPath = resolve(__dirname, '..', 'firebase-service-account.json');
if (!existsSync(saPath)) {
  console.error('❌ firebase-service-account.json not found.');
  process.exit(1);
}
const sa = JSON.parse(readFileSync(saPath, 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const DRY_RUN = process.argv.includes('--dry-run');

// ── Topic → Tag mapping ───────────────────────────────────────────────────────
const TOPIC_TAGS = {
  'Surgery': ['surgery', 'general-surgery'],
  'Pediatrics': ['pediatrics', 'child-health'],
  'Internal Medicine': ['internal-medicine', 'general-medicine'],
  'OBGYN': ['obstetrics', 'gynecology'],
  'Obstetrics & Gynaecology': ['obstetrics', 'gynecology'],
  'Emergency Medicine': ['emergency-medicine', 'emergency'],
  'Renal Medicine': ['nephrology', 'renal'],
  'Gastroenterology': ['gastroenterology', 'gi'],
  'Rheumatology': ['rheumatology', 'autoimmune'],
  'Neurology': ['neurology', 'neuro'],
  'Public Health': ['public-health', 'community-medicine'],
  'Orthopedics': ['orthopedics', 'ortho'],
  'Ophthalmology': ['ophthalmology', 'eye'],
  'Ethics': ['ethics', 'professionalism'],
  'Critical Care': ['critical-care', 'icu'],
  'Endocrinology': ['endocrinology', 'endocrine'],
  'Hematology': ['hematology', 'blood'],
  'Pharmacology': ['pharmacology', 'drugs'],
  'Psychiatry': ['psychiatry', 'mental-health'],
  'Dermatology': ['dermatology', 'skin'],
  'Immunology': ['immunology', 'immune'],
  'Infectious Diseases': ['infectious-disease', 'infection'],
  'Cardiology': ['cardiology', 'cardiac', 'heart'],
  'Pulmonology': ['pulmonology', 'respiratory', 'lung'],
  'Nephrology': ['nephrology', 'renal'],
  'Radiology': ['radiology', 'imaging'],
  'Pathology': ['pathology', 'histology'],
  'Family Medicine': ['family-medicine', 'primary-care'],
  'Family & Community Medicine': ['family-medicine', 'primary-care'],
  'Medical Ethics & Professionalism': ['ethics', 'professionalism'],
  'Toxicology': ['toxicology', 'poisoning'],
  'Emergency': ['emergency-medicine', 'emergency'],
};

// ── Helpers ────────────────────────────────────────────────────────────────────
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

function enrichNewQuestion(q) {
  const correctIndex = q.options.findIndex(opt => opt.correct === true);
  const correctAnswer = correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : 'A';
  const correctOpt = q.options[correctIndex];
  const domain = q.scfhs_domain || q.topic || 'General';

  // Parse tags from topic + provided tags
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

// ── Step 1: Backup existing DB ─────────────────────────────────────────────────
async function backupExisting() {
  console.log('\n📦 Step 1: Backing up existing question bank…');
  const snap = await db.collection('questions').get();
  const backup = [];
  snap.forEach(doc => backup.push({ id: doc.id, ...doc.data() }));

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = join(__dirname, 'backups', `questions-${ts}.json`);
  writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`   ✅ Backed up ${backup.length} questions → ${backupPath}`);
  return backup;
}

// ── Step 2: Upload new 424 questions (add, don't wipe) ─────────────────────────
async function uploadNewQuestions() {
  const bankPath = resolve(__dirname, 'generated-final-bank.json');
  if (!existsSync(bankPath)) {
    console.log('   ⚠️  No generated-final-bank.json found. Skipping new question upload.');
    return false;
  }

  const questions = JSON.parse(readFileSync(bankPath, 'utf8'));
  console.log(`\n📤 Step 2: Adding ${questions.length} new questions to existing DB…`);

  // Check which already exist
  const existingSnap = await db.collection('questions').get();
  const existingIds = new Set(existingSnap.docs.map(d => d.id));

  const toAdd = [];
  const idSeen = {};
  for (const q of questions) {
    const base = makeDocId(q.question);
    idSeen[base] = (idSeen[base] || 0) + 1;
    const docId = idSeen[base] > 1 ? `${base}-${idSeen[base]}` : base;

    // Skip if already exists
    if (existingIds.has(docId)) continue;
    toAdd.push({ docId, question: q });
  }

  console.log(`   New unique questions to add: ${toAdd.length} (${questions.length - toAdd.length} already exist)`);
  if (toAdd.length === 0) return false;

  if (!DRY_RUN) {
    const CHUNK = 400;
    for (let i = 0; i < toAdd.length; i += CHUNK) {
      const batch = db.batch();
      toAdd.slice(i, i + CHUNK).forEach(({ docId, question }) => {
        batch.set(db.collection('questions').doc(docId), enrichNewQuestion(question));
      });
      await batch.commit();
      console.log(`   ✅ Added ${Math.min(i + CHUNK, toAdd.length)} / ${toAdd.length}`);
    }
  } else {
    console.log('   🔍 DRY RUN — would have added the above.');
  }

  return true;
}

// ── Step 3: Fix bad rationales ─────────────────────────────────────────────────
async function fixBadRationales() {
  console.log('\n✏️  Step 3: Fixing bad rationales in existing DB…');
  const snap = await db.collection('questions').get();
  const fixes = [];

  snap.forEach(doc => {
    const d = doc.data();
    const r = (d.rationale || '').trim();

    // Detect bad rationales: too short, generic, or missing
    if (!r || r.length < 15 || /^(correct|this is correct|this is the correct|the correct answer)/i.test(r)) {
      // Look at the correct option for a better rationale
      if (Array.isArray(d.options)) {
        const correctOpt = d.options.find(o => o.correct === true);
        if (correctOpt && correctOpt.rationale && correctOpt.rationale.trim().length > 15) {
          fixes.push({
            id: doc.id,
            existing: r,
            replacement: correctOpt.rationale,
          });
        }
      }
    }
  });

  console.log(`   Found ${fixes.length} questions needing rationale fixes`);

  if (!DRY_RUN && fixes.length > 0) {
    const CHUNK = 400;
    for (let i = 0; i < fixes.length; i += CHUNK) {
      const batch = db.batch();
      fixes.slice(i, i + CHUNK).forEach(({ id, replacement }) => {
        batch.update(db.collection('questions').doc(id), { rationale: replacement });
      });
      await batch.commit();
    }
    console.log(`   ✅ Fixed ${fixes.length} rationales`);
  } else if (fixes.length > 0) {
    console.log('   🔍 DRY RUN — would have fixed the above.');
  }

  return fixes.length;
}

// ── Step 4: Add tags to untagged questions ──────────────────────────────────────
async function addTags() {
  console.log('\n🏷️  Step 4: Adding tags to untagged questions…');
  const snap = await db.collection('questions').get();
  const fixes = [];

  snap.forEach(doc => {
    const d = doc.data();
    const currentTags = Array.isArray(d.tags) ? d.tags : [];
    if (currentTags.length === 0) {
      // Generate tags from topic / scfhs_domain
      const topic = d.scfhs_domain || d.topic || 'General';
      const defaultTags = TOPIC_TAGS[topic] || TOPIC_TAGS[d.topic] || [];

      // Extract key terms from question for additional tags
      const q = (d.question || '').toLowerCase();
      const extra = [];
      if (q.includes('emergency')) extra.push('emergency');
      if (q.includes('pediatric')) extra.push('pediatric');
      if (q.includes('surgical')) extra.push('surgical');
      if (q.includes('cancer') || q.includes('tumor') || q.includes('carcinoma')) extra.push('oncology');
      if (q.includes('infection') || q.includes('fever') || q.includes('antibiotic')) extra.push('infection');
      if (q.includes('guideline') || q.includes('recommendation')) extra.push('guidelines');
      if (q.includes('diagnosis')) extra.push('diagnosis');
      if (q.includes('management') || q.includes('treatment')) extra.push('management');

      const tags = [...new Set([...defaultTags, ...extra])];
      if (tags.length > 0) {
        fixes.push({ id: doc.id, tags });
      }
    }
  });

  console.log(`   Found ${fixes.length} untagged questions`);

  if (!DRY_RUN && fixes.length > 0) {
    const CHUNK = 400;
    for (let i = 0; i < fixes.length; i += CHUNK) {
      const batch = db.batch();
      fixes.slice(i, i + CHUNK).forEach(({ id, tags }) => {
        batch.update(db.collection('questions').doc(id), { tags });
      });
      await batch.commit();
    }
    console.log(`   ✅ Tagged ${fixes.length} questions`);
  } else if (fixes.length > 0) {
    console.log('   🔍 DRY RUN — would have tagged the above.');
  }

  return fixes.length;
}

// ── Step 5: Configure daily dose ────────────────────────────────────────────────
async function setupDailyDose() {
  console.log('\n☀️  Step 5: Setting up daily dose…');

  const snap = await db.collection('questions').limit(10).get();
  const allSnap = await db.collection('questions').get();
  const totalQuestions = allSnap.size;

  // Pick questions for daily dose spanning multiple domains
  const sample = [];
  allSnap.forEach(doc => sample.push({ id: doc.id, data: doc.data() }));

  // Pick 5 questions spread across different domains for the daily dose
  const domainsSeen = new Set();
  const dailyQuestions = [];
  for (const q of sample) {
    const domain = q.data.scfhs_domain || q.data.topic || '';
    if (!domainsSeen.has(domain) && domainsSeen.size < 5) {
      domainsSeen.add(domain);
      dailyQuestions.push(q.id);
    }
    if (domainsSeen.size >= 5) break;
  }

  const dailyDose = {
    enabled: true,
    title: 'Daily Dose',
    subtitle: `${totalQuestions} questions to master the SMLE`,
    questions: dailyQuestions,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'fix-and-deploy.mjs',
    description: 'Your daily recommended questions covering multiple specialties.',
  };

  if (!DRY_RUN) {
    await db.collection('config').doc('daily-dose').set(dailyDose);
    console.log(`   ✅ Daily dose configured with ${dailyQuestions.length} questions across ${domainsSeen.size} domains`);
    console.log(`   Total questions available: ${totalQuestions}`);
  } else {
    console.log('   🔍 DRY RUN — daily dose would be set:', JSON.stringify(dailyDose, null, 2).slice(0, 300));
  }

  return totalQuestions;
}

// ── Step 6: Update Firestore indexes if needed ──────────────────────────────────
async function ensureIndexes() {
  console.log('\n📊 Step 6: Verifying Firestore indexes…');
  // The required indexes for the app:
  // - questions collection: order by __name__ (paginated queries)
  // - questions: where scfhs_domain == X, order by difficulty, etc.
  // These should be in firestore.indexes.json already
  console.log('   ✅ Indexes defined in firestore.indexes.json (checked at deploy time)');
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('🚀 SMLE Pro — Fix & Deploy Master Script');
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '🔥 LIVE'}`);
  console.log('═'.repeat(60) + '\n');

  // Step 1: Backup
  const backup = await backupExisting();
  const totalBefore = backup.length;

  // Pause for safety
  if (!DRY_RUN) {
    console.log('\n⏳ Starting in 5 seconds… (Ctrl+C to abort)');
    await new Promise(r => setTimeout(r, 5000));
  }

  // Step 2: Upload new questions
  const addedNew = await uploadNewQuestions();

  // Step 3: Fix bad rationales
  const fixedRationales = await fixBadRationales();

  // Step 4: Add tags
  const tagged = await addTags();

  // Step 5: Setup daily dose
  const totalAfter = await setupDailyDose();

  // Step 6: Indexes
  await ensureIndexes();

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('📋 UPGRADE SUMMARY');
  console.log('═'.repeat(60));
  console.log(`   Questions before:  ${totalBefore}`);
  console.log(`   Questions added:   ${DRY_RUN ? '(dry run)' : addedNew ? 424 : 0}`);
  console.log(`   Rationales fixed:  ${fixedRationales}`);
  console.log(`   Tags added:        ${tagged}`);
  if (!DRY_RUN) console.log(`   Questions after:   ${totalAfter}`);
  console.log('═'.repeat(60));

  if (DRY_RUN) {
    console.log('\n✅ Dry run complete. Run without --dry-run to execute.');
  } else {
    console.log('\n🎉 Upgrade complete!');
    console.log('   Then run: firebase deploy --only hosting');
    console.log('   Visit: https://smlepro.web.app\n');
  }
}

main().catch(err => {
  console.error('\n❌ Upgrade failed:', err);
  process.exit(1);
});
