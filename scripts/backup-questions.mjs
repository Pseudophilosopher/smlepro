/**
 * backup-questions.mjs
 *
 * Downloads every document in the `questions` collection from Firestore
 * and saves it as a timestamped JSON file in scripts/backups/.
 *
 * Usage:
 *   node scripts/backup-questions.mjs
 *
 * Output:
 *   scripts/backups/questions-2025-01-15T14-30-00.json
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join }       from 'path';
import { fileURLToPath }       from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa        = JSON.parse(readFileSync(new URL('../firebase-service-account.json', import.meta.url)));

initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function backup() {
    console.log('\n💾  SMLE Pro — Firestore Backup\n');

    // Fetch all documents in a single paginated pass
    let allDocs = [];
    let query   = db.collection('questions').orderBy('__name__').limit(500);
    let lastSnap = null;

    while (true) {
        if (lastSnap) query = query.startAfter(lastSnap);
        const snap = await query.get();
        if (snap.empty) break;

        snap.forEach(doc => allDocs.push({ _id: doc.id, ...doc.data() }));
        lastSnap = snap.docs[snap.docs.length - 1];

        process.stdout.write(`\r   Fetched ${allDocs.length} documents…`);

        if (snap.size < 500) break; // last page
    }

    console.log(`\r   ✅ Fetched ${allDocs.length} documents total.`);

    // Write to a timestamped file in scripts/backups/
    const backupDir  = join(__dirname, 'backups');
    mkdirSync(backupDir, { recursive: true });

    const timestamp  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outputPath = join(backupDir, `questions-${timestamp}.json`);

    writeFileSync(outputPath, JSON.stringify(allDocs, null, 2), 'utf8');

    console.log(`\n📁  Saved to: ${outputPath}`);
    console.log(`    Size: ${(readFileSync(outputPath).length / 1024).toFixed(1)} KB\n`);
}

backup().catch(err => {
    console.error('\n❌  Backup failed:', err.message);
    process.exit(1);
});
