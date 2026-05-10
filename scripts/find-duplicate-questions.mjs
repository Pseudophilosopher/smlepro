/**
 * find-duplicate-questions.mjs
 *
 * Scans Firestore `questions` and groups documents whose `question` stem matches
 * after normalization (case, punctuation, whitespace). Exact-text duplicates only;
 * near-miss wording is not detected.
 *
 * Usage:
 *   node scripts/find-duplicate-questions.mjs
 *   node scripts/find-duplicate-questions.mjs --fuzzy   # include long-prefix near-dup hints (noisy)
 *   node scripts/find-duplicate-questions.mjs --json-only
 *
 * Output:
 *   Prints groups to stdout; writes scripts/backups/duplicate-questions-<iso>.json
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(new URL('../firebase-service-account.json', import.meta.url), 'utf8'));

initializeApp({ credential: cert(sa) });
const db = getFirestore();

function normalizeStem(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d'`´""]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fingerprintPrefix(s, len = 96) {
  const n = normalizeStem(s);
  return n.length <= len ? n : n.slice(0, len);
}

async function fetchAllQuestions() {
  const out = [];
  let q = db.collection('questions').orderBy('__name__').limit(500);
  let last = null;
  while (true) {
    const snap = last ? await q.startAfter(last).get() : await q.get();
    if (snap.empty) break;
    snap.forEach((doc) => {
      const d = doc.data() || {};
      out.push({
        id: doc.id,
        topic: d.topic || '',
        question: d.question || '',
        image_reference: d.image_reference === true,
      });
    });
    last = snap.docs[snap.docs.length - 1];
    process.stdout.write(`\r   Loaded ${out.length} documents…`);
    if (snap.size < 500) break;
  }
  console.log(`\r   Loaded ${out.length} documents.`);
  return out;
}

async function main() {
  const jsonOnly = process.argv.includes('--json-only');
  const fuzzy = process.argv.includes('--fuzzy');

  if (!jsonOnly) {
    console.log('\n🔎 SMLE Pro — Duplicate question finder (normalized exact match)\n');
  }

  const rows = await fetchAllQuestions();
  const byNorm = new Map();
  for (const r of rows) {
    const key = normalizeStem(r.question);
    if (!key) continue;
    if (!byNorm.has(key)) byNorm.set(key, []);
    byNorm.get(key).push(r);
  }

  const dupGroups = [...byNorm.entries()].filter(([, list]) => list.length > 1).sort((a, b) => b[1].length - a[1].length);

  /** Long shared prefix — many MCQs share "a 50 year old man…"; use only with --fuzzy */
  let fuzzyHints = [];
  if (fuzzy) {
    const byPrefix = new Map();
    for (const r of rows) {
      const fp = fingerprintPrefix(r.question, 140);
      if (fp.length < 80) continue;
      if (!byPrefix.has(fp)) byPrefix.set(fp, []);
      byPrefix.get(fp).push(r);
    }
    fuzzyHints = [...byPrefix.entries()]
      .filter(([, list]) => list.length > 1)
      .map(([prefix, list]) => {
        const norms = new Set(list.map((x) => normalizeStem(x.question)));
        return { prefix, count: list.length, distinctStems: norms.size, ids: list.map((x) => x.id) };
      })
      .filter((x) => x.distinctStems > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 80);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totalQuestions: rows.length,
    exactDuplicateGroups: dupGroups.length,
    exactDuplicates: dupGroups.map(([norm, list]) => ({
      count: list.length,
      topic: list[0].topic,
      preview: (list[0].question || '').slice(0, 140),
      ids: list.map((x) => x.id),
    })),
    fuzzyPrefixHints: fuzzyHints,
  };

  const backupDir = join(__dirname, 'backups');
  mkdirSync(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = join(backupDir, `duplicate-questions-${ts}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  if (!jsonOnly) {
    console.log(`📌 Exact duplicate groups (same normalized stem): ${dupGroups.length}`);
    let dupDocCount = 0;
    for (const [, list] of dupGroups) dupDocCount += list.length;
    console.log(`   Documents involved: ${dupDocCount}\n`);

    const show = Math.min(25, dupGroups.length);
    for (let i = 0; i < show; i++) {
      const [, list] = dupGroups[i];
      console.log(`— Group ${i + 1} ×${list.length} — ${list[0].topic}`);
      console.log(`   ${(list[0].question || '').slice(0, 100)}${(list[0].question || '').length > 100 ? '…' : ''}`);
      console.log(`   IDs: ${list.map((x) => x.id).join(', ')}\n`);
    }
    if (dupGroups.length > show) {
      console.log(`   … and ${dupGroups.length - show} more groups in JSON.\n`);
    }

    if (fuzzy) {
      console.log(`📎 Fuzzy prefix hints (same 140-char normalized prefix): ${fuzzyHints.length} clusters`);
      if (fuzzyHints[0]) {
        console.log(`   Example: ${fuzzyHints[0].count} docs, ${fuzzyHints[0].distinctStems} distinct stems`);
        console.log(`   IDs: ${fuzzyHints[0].ids.slice(0, 6).join(', ')}${fuzzyHints[0].ids.length > 6 ? '…' : ''}\n`);
      }
    } else {
      console.log('📎 Fuzzy near-dup scan skipped (many stems share "A 50-year-old…"). Re-run with --fuzzy if needed.\n');
    }

    console.log(`📁 Full report: ${outPath}`);
    console.log('\nNext: merge or delete duplicate docs in Console; keep one canonical ID if daily_doses or bookmarks reference IDs.\n');
  } else {
    console.log(outPath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
