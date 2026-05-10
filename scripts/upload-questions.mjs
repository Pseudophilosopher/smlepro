/**
 * upload-questions.mjs
 *
 * Enriches and uploads the question bank to Firestore.
 * Adds: scfhs_domain, correct_answer, top-level rationale
 * Wipes the existing questions collection, then re-uploads cleanly.
 *
 * Usage:
 *   node scripts/upload-questions.mjs --dry-run   ← preview only, no writes
 *   node scripts/upload-questions.mjs             ← live upload (5-second safety pause)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseQuestionFile } from './normalize-question-json.mjs';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const sa         = JSON.parse(readFileSync(new URL('../firebase-service-account.json', import.meta.url)));

initializeApp({ credential: cert(sa) });
const db = getFirestore();

const DRY_RUN = process.argv.includes('--dry-run');

// ── SCFHS Blueprint Domain Mapping ───────────────────────────────────────────
// Maps your topic strings to official SCFHS blueprint categories.
// Add new topics here as your question bank grows.
const SCFHS_DOMAIN_MAP = {
    // Internal Medicine & sub-specialties
    'Internal Medicine':   'Internal Medicine',
    'Cardiology':          'Internal Medicine – Cardiology',
    'Pulmonology':         'Internal Medicine – Pulmonology',
    'Neurology':           'Internal Medicine – Neurology',
    'Psychiatry':          'Internal Medicine – Psychiatry',
    'Dermatology':         'Internal Medicine – Dermatology',
    'Endocrinology':       'Internal Medicine – Endocrinology',
    'Nephrology':          'Internal Medicine – Nephrology',
    'Renal Medicine':      'Internal Medicine – Nephrology',
    'Hematology':          'Internal Medicine – Hematology',
    'Rheumatology':        'Internal Medicine – Rheumatology',
    'Infectious Diseases': 'Internal Medicine – Infectious Diseases',
    'Immunology':          'Internal Medicine – Immunology',
    'Pharmacology':        'Internal Medicine – Pharmacology',
    // Surgery & sub-specialties
    'Surgery':             'Surgery',
    'Gastroenterology':    'Surgery – Gastroenterology',
    'Orthopedics':         'Surgery – Orthopedics',
    'Ophthalmology':       'Surgery – Ophthalmology',
    'ENT':                 'Surgery – ENT',
    'Urology':             'Surgery – Urology',
    // Other SMLE domains
    'Pediatrics':          'Pediatrics',
    'OBGYN':               'Obstetrics & Gynaecology',
    'Emergency':           'Emergency Medicine',
    'Emergency Medicine':  'Emergency Medicine',
    'Critical Care':       'Emergency Medicine – Critical Care',
    'Toxicology':          'Emergency Medicine – Toxicology',
    'Family Medicine':     'Family & Community Medicine',
    'Public Health':       'Family & Community Medicine',
    'Ethics':              'Medical Ethics & Professionalism',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Build a clean Firestore document ID from the question text.
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

// Add missing fields and normalise existing ones.
function enrichQuestion(q) {
    const correctIndex  = q.options.findIndex(opt => opt.correct === true);
    const correctAnswer = correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : '';
    const correctOpt    = q.options[correctIndex];

    return {
        question:        q.question,
        topic:           q.topic         || 'General',
        difficulty:      q.difficulty    || 'Moderate',
        year:            q.year          || '2024-2025',
        image_reference: q.image_reference === true,
        options:         q.options,
        // Derived fields
        correct_answer:  correctAnswer,
        rationale:       correctOpt?.rationale || q.rationale || '',
        scfhs_domain:    SCFHS_DOMAIN_MAP[q.topic] || q.topic || 'General',
        tags:            [],  // enrich later via AI or manual tagging
    };
}

// ── Wipe existing questions collection ───────────────────────────────────────
async function clearQuestionsCollection() {
    console.log('🗑️  Clearing existing questions collection…');
    const snap = await db.collection('questions').get();

    if (snap.empty) {
        console.log('   Already empty — nothing to delete.');
        return;
    }

    // Firestore batch max is 500 ops; use 400 to be safe
    const CHUNK = 400;
    for (let i = 0; i < snap.docs.length; i += CHUNK) {
        const batch = db.batch();
        snap.docs.slice(i, i + CHUNK).forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }

    console.log(`   Deleted ${snap.size} documents.`);
}

// ── Upload enriched questions ─────────────────────────────────────────────────
async function uploadQuestions(questions) {
    console.log(`\n📤 Uploading ${questions.length} questions…`);

    const CHUNK   = 400;
    const idSeen  = {};   // track duplicates so IDs stay unique

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

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🚀 SMLE Pro — Question Bank Upload');
    console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '🔥 LIVE'}\n`);

    // New JSON / text exports (loaded first so newer patches win on duplicate question text)
    const jsonSourceFiles = [
        '/home/phil/Downloads/11',
        '/home/phil/Downloads/13',
        '/home/phil/Downloads/14',
        '/home/phil/Downloads/15',
        '/home/phil/Downloads/16',
        '/home/phil/Downloads/18',
        '/home/phil/Downloads/19',
        '/home/phil/Downloads/20',
        '/home/phil/Downloads/22',
        '/home/phil/Downloads/ai_studio_code.txt',
        '/home/phil/Downloads/ai_studio_code (1).txt',
        '/home/phil/Downloads/ai_studio_code (2).txt',
        '/home/phil/Downloads/ai_studio_code (3).txt',
        '/home/phil/Downloads/1',
        '/home/phil/Downloads/2',
    ];

    // Legacy JS batch exports (Telegram Desktop)
    const sourceFiles = [
        '/home/phil/Downloads/Telegram Desktop/upload-batch.js',
        '/home/phil/Downloads/Telegram Desktop/upload-batch (2).js',
        '/home/phil/Downloads/Telegram Desktop/upload-batch (3).js',
        '/home/phil/Downloads/Telegram Desktop/upload-batch (4).js',
        '/home/phil/Downloads/Telegram Desktop/upload-batch (4) (2).js',
        '/home/phil/Downloads/Telegram Desktop/upload-batch (5).js',
    ];

    /**
     * Loads a batch file regardless of whether it uses `export const` or plain `const`.
     * Strips block comments, normalises the declaration, and evals via Function constructor.
     */
    function loadBatchFile(filePath) {
        const raw = readFileSync(filePath, 'utf8');
        const code = raw
            .replace(/\/\*[\s\S]*?\*\//g, '')           // strip block comments
            .replace(/export\s+const\s+batchQuestions/, 'var batchQuestions')
            .replace(/^const\s+batchQuestions/m,         'var batchQuestions');
        // eslint-disable-next-line no-new-func
        return new Function(`${code}; return batchQuestions;`)();
    }

    // Load and merge: JSON imports first, then JS batches
    let allQuestions = [];

    for (const file of jsonSourceFiles) {
        if (!existsSync(file)) {
            console.warn(`   ⚠️  Skipping missing file: ${file}`);
            continue;
        }
        const questions = parseQuestionFile(readFileSync(file, 'utf8'), file);
        console.log(`   Loaded ${String(questions.length).padStart(4)} questions from ${file.split('/').pop()} (JSON)`);
        allQuestions = allQuestions.concat(questions);
    }

    for (const file of sourceFiles) {
        if (!existsSync(file)) {
            console.warn(`   ⚠️  Skipping missing file: ${file}`);
            continue;
        }
        const questions = loadBatchFile(file);
        console.log(`   Loaded ${String(questions.length).padStart(4)} questions from ${file.split('/').pop()}`);
        allQuestions = allQuestions.concat(questions);
    }

    // Deduplicate by normalised question text (guards against cross-batch duplicates)
    const seen = new Set();
    const batchQuestions = allQuestions.filter(q => {
        const key = q.question.toLowerCase().replace(/\s+/g, ' ').trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const dupeCount = allQuestions.length - batchQuestions.length;
    console.log(`\n📚 Total loaded: ${allQuestions.length}  |  Duplicates removed: ${dupeCount}  |  Final: ${batchQuestions.length}\n`);

    // Print topic distribution
    const topicCounts = {};
    batchQuestions.forEach(q => { topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1; });
    console.log('   Topic breakdown:');
    Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([t, c]) => console.log(`   • ${t.padEnd(25)} ${c} questions  →  ${SCFHS_DOMAIN_MAP[t] || t}`));

    if (DRY_RUN) {
        console.log('\n🔍 First 2 enriched questions:\n');
        batchQuestions.slice(0, 2).forEach((q, i) => {
            const enriched = enrichQuestion(q);
            console.log(`── Question ${i + 1} ──────────────────────────`);
            console.log(`ID:            ${makeDocId(q.question)}`);
            console.log(`correct_answer:  ${enriched.correct_answer}`);
            console.log(`rationale:       ${enriched.rationale.slice(0, 80)}…`);
            console.log(`scfhs_domain:    ${enriched.scfhs_domain}`);
            console.log();
        });
        console.log('✅ Dry run complete — no data was written.');
        return;
    }

    // Safety pause before destructive operation
    console.log('\n⚠️  This will DELETE all existing questions and re-upload fresh data.');
    console.log('   Press Ctrl+C within 5 seconds to abort…\n');
    await new Promise(r => setTimeout(r, 5000));

    await clearQuestionsCollection();
    await uploadQuestions(batchQuestions);

    console.log('\n🎉 Upload complete!');
    console.log('   Run `npm run update-daily` to regenerate today\'s daily dose from the new bank.\n');
}

main().catch(err => {
    console.error('\n❌ Upload failed:', err);
    process.exit(1);
});
