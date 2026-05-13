/**
 * validate-bank.mjs
 *
 * Automated validation pipeline for the SMLE question bank.
 * Checks: schema, blueprint, answer balance, difficulty, duplicates, Saudi content.
 *
 * Usage: node scripts/validate-bank.mjs
 *        node scripts/validate-bank.mjs --fix    (auto-fix where possible)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKUPS = join(__dirname, 'backups');

const BLUEPRINT_TARGET = {
  'Internal Medicine': 30,
  'Obstetrics & Gynaecology': 25,
  'Pediatrics': 25,
  'Surgery': 20,
};

const SAUDI_KEYWORDS = [
  'brucellosis', 'MERS', 'sickle cell', 'thalassemia', 'G6PD',
  'familial Mediterranean fever', 'leishmaniasis', 'dengue',
  'Hajj', 'Umrah', 'tuberculosis', 'meningococcal',
  'schistosomiasis', 'consanguine', 'Saudi', 'MOH',
];

let totalScore = 0;
const maxScore = 10;

function log(...args) { console.log(...args); }

function run(qs) {
  log('\n══════════════════════════════════════════');
  log('  SMLE Question Bank — Validation Report');
  log('══════════════════════════════════════════\n');

  const total = qs.length;
  let passCount = 0;
  let totalChecks = 0;

  // ── 1. Schema Check ──
  totalChecks++;
  let schemaIssues = 0;
  qs.forEach((q, i) => {
    if (!q.question || q.question.length < 20) schemaIssues++;
    if (!Array.isArray(q.options) || q.options.length !== 4) schemaIssues++;
    else {
      const correct = q.options.filter(o => o.correct === true).length;
      if (correct !== 1) schemaIssues++;
      q.options.forEach((o, oi) => {
        if (!o.text) schemaIssues++;
        if (!o.rationale || o.rationale.length < 10) schemaIssues++;
      });
    }
    if (!q.correct_answer || !['A', 'B', 'C', 'D'].includes(q.correct_answer)) schemaIssues++;
    if (!q.rationale || q.rationale.length < 10) schemaIssues++;
    if (!q.topic || !q.scfhs_domain || !q.difficulty) schemaIssues++;
  });
  const schemaPass = schemaIssues === 0;
  if (schemaPass) passCount++;
  log(`  ${schemaPass ? '✅' : '❌'} Schema: ${schemaIssues} issues out of ${total} questions`);

  // ── 2. Blueprint Check ──
  totalChecks++;
  const counts = {};
  qs.forEach(q => { counts[q.topic] = (counts[q.topic] || 0) + 1; });
  let blueprintIssues = 0;
  Object.entries(BLUEPRINT_TARGET).forEach(([topic, targetPct]) => {
    const actual = counts[topic] || 0;
    const actualPct = Math.round(actual / total * 100);
    const diff = Math.abs(actualPct - targetPct);
    if (diff > 3) {
      blueprintIssues++;
      log(`  ⚠️  ${topic}: ${actual} (${actualPct}%)  target: ${targetPct}% (off by ${diff}%)`);
    }
  });
  const blueprintPass = blueprintIssues === 0;
  if (blueprintPass) passCount++;
  log(`  ${blueprintPass ? '✅' : '❌'} Blueprint: ${blueprintIssues} domains off target`);

  // ── 3. Answer Balance ──
  totalChecks++;
  const caCounts = { A: 0, B: 0, C: 0, D: 0 };
  qs.forEach(q => { if (caCounts[q.correct_answer] !== undefined) caCounts[q.correct_answer]++; });
  const caPcts = {};
  let balanceIssues = 0;
  Object.entries(caCounts).forEach(([letter, count]) => {
    const pct = Math.round(count / total * 100);
    caPcts[letter] = pct;
    if (pct < 20 || pct > 30) balanceIssues++;
  });
  const balancePass = balanceIssues === 0;
  if (balancePass) passCount++;
  log(`  ${balancePass ? '✅' : '❌'} Answer balance: A=${caPcts.A}% B=${caPcts.B}% C=${caPcts.C}% D=${caPcts.D}%`);

  // ── 4. Difficulty Distribution ──
  totalChecks++;
  const diffCounts = {};
  qs.forEach(q => { diffCounts[q.difficulty] = (diffCounts[q.difficulty] || 0) + 1; });
  const diffPcts = {};
  Object.entries(diffCounts).forEach(([d, c]) => { diffPcts[d] = Math.round(c / total * 100); });
  log(`  ✅ Difficulty: Easy=${diffPcts['Easy'] || 0}% Moderate=${diffPcts['Moderate'] || 0}% Hard=${diffPcts['Hard'] || 0}%`);
  passCount++; // Informational only

  // ── 5. Duplicate Vignettes ──
  totalChecks++;
  const seen = new Set();
  let dups = 0;
  qs.forEach(q => {
    const key = q.question.toLowerCase().trim();
    if (seen.has(key)) dups++;
    else seen.add(key);
  });
  const dupPass = dups === 0;
  if (dupPass) passCount++;
  log(`  ${dupPass ? '✅' : '❌'} Duplicates: ${dups} exact duplicate vignettes`);

  // ── 6. Saudi Content ──
  totalChecks++;
  let saudiCount = 0;
  qs.forEach(q => {
    const text = (q.question + ' ' + (q.rationale || '') + ' ' + q.tags.join(' ')).toLowerCase();
    if (SAUDI_KEYWORDS.some(kw => text.includes(kw))) saudiCount++;
  });
  const saudiPass = saudiCount >= 20;
  if (saudiPass) passCount++;
  log(`  ${saudiPass ? '✅' : '❌'} Saudi content: ${saudiCount} questions with Saudi-specific keywords (target ≥20)`);

  // ── Score ──
  totalScore = Math.round(passCount / totalChecks * 100);
  log(`\n  Score: ${passCount}/${totalChecks} (${totalScore}%)`);
  log(`  Total: ${total} questions`);
  log('══════════════════════════════════════════\n');

  return {
    total, passCount, totalChecks, score: totalScore,
    schemaIssues, blueprintIssues, balanceIssues,
    duplicates: dups, saudiCount, caPcts, diffPcts,
    counts,
  };
}

// ── Main ──
function main() {
  const jsonPath = join(BACKUPS, 'generated-full-bank.json');
  try {
    const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
    const bank = Array.isArray(data) ? data : [data];
    log(`Loaded ${bank.length} questions from ${jsonPath}`);
    return run(bank);
  } catch {
    log(`❌ Could not load ${jsonPath}`);
    return null;
  }
}

main();
