/**
 * update-daily-dose.js
 *
 * Writes today's `daily_doses/{YYYY-MM-DD}` document to Firestore.
 * Each document embeds 30 full question objects so the client only needs
 * ONE document read instead of 30 individual question reads.
 *
 * Usage:
 *   node scripts/update-daily-dose.js              # today
 *   node scripts/update-daily-dose.js 2026-04-01   # specific date
 *
 * Requires: firebase-service-account.json in the project root (never commit this).
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../firebase-service-account.json');
const { redactQuestionList } = require('../functions/redact-question-images.js');

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

// Separate flags (--force) from positional args (YYYY-MM-DD date)
const args = process.argv.slice(2);
const dateArg = args.find(a => !a.startsWith('--'));
const targetDate = dateArg || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

// Validate format
if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    console.error('❌  Invalid date format. Use YYYY-MM-DD (e.g. 2026-04-01)');
    process.exit(1);
}

async function updateDailyDose() {
    console.log(`\n📅  Generating daily dose for: ${targetDate}`);

    // Check if document already exists (avoid accidental overwrite)
    const targetRef = db.collection('daily_doses').doc(targetDate);
    const existing = await targetRef.get();
    if (existing.exists) {
        console.warn(`⚠️   daily_doses/${targetDate} already exists. Pass --force to overwrite.`);
        if (!args.includes('--force')) process.exit(0);
        console.log('    --force flag detected, overwriting…');
    }

    // Fetch ALL questions (full objects, not just IDs)
    console.log('🔍  Fetching question pool from "questions" collection…');
    const snapshot = await db.collection('questions').get();

    if (snapshot.empty) {
        console.error('❌  No questions found. Aborting.');
        process.exit(1);
    }

    const allQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`    Found ${allQuestions.length} questions.`);

    if (allQuestions.length < 30) {
        console.error(`❌  Only ${allQuestions.length} questions available — need at least 30. Aborting.`);
        process.exit(1);
    }

    // Date-seeded deterministic shuffle (same algorithm as the client-side fallback)
    const seed = parseInt(targetDate.replace(/-/g, ''), 10);
    function seededRandom(seed) {
        return function () {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    const rng = seededRandom(seed);
    const shuffled = [...allQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selected = shuffled.slice(0, 30);

    // Shuffle options per question so letter position is not biased (same idea as getQuizQuestions).
    selected.forEach((q) => {
        if (!Array.isArray(q.options) || q.options.length < 2) return;
        for (let i = q.options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
        }
    });

    // Write the document — embedding learner-safe question objects (no unverified image URLs)
    await targetRef.set({
        questions: redactQuestionList(selected),
        theme: null,            // optionally set a theme string for the day
        generatedAt: FieldValue.serverTimestamp(),
        totalQuestions: selected.length,
    });

    console.log(`✅  daily_doses/${targetDate} written with ${selected.length} questions.`);
    console.log('    One document read now serves the entire Daily Dose for all users.\n');
}

updateDailyDose().catch(err => {
    console.error('❌  Script failed:', err);
    process.exit(1);
});
