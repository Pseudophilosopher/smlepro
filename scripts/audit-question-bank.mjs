/**
 * audit-question-bank.mjs
 *
 * Comprehensive question bank audit — schema, coverage, rationales, images.
 * Outputs a JSON report to scripts/backups/audit-<iso>.json
 *
 * Usage:
 *   node scripts/audit-question-bank.mjs
 *   node scripts/audit-question-bank.mjs --json-only
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

// ── SCFHS Blueprint (official categories) ───────────────────────────────────
const SCFHS_BLUEPRINT = {
  'Internal Medicine': 0.30,
  'Surgery': 0.20,
  'Pediatrics': 0.15,
  'Obstetrics & Gynaecology': 0.12,
  'Emergency Medicine': 0.08,
  'Family & Community Medicine': 0.05,
  'Medical Ethics & Professionalism': 0.04,
  'Radiology': 0.03,
  'Pathology': 0.02,
  'Forensic Medicine': 0.01,
};

// Topics that should map to each blueprint domain
const EXPECTED_TOPICS = {
  'Internal Medicine': ['Internal Medicine', 'Cardiology', 'Pulmonology', 'Neurology', 'Psychiatry',
    'Dermatology', 'Endocrinology', 'Nephrology', 'Renal Medicine', 'Hematology', 'Rheumatology',
    'Infectious Diseases', 'Immunology', 'Pharmacology', 'Gastroenterology'],
  'Surgery': ['Surgery', 'Orthopedics', 'Ophthalmology', 'ENT', 'Urology'],
  'Pediatrics': ['Pediatrics'],
  'Obstetrics & Gynaecology': ['OBGYN'],
  'Emergency Medicine': ['Emergency', 'Emergency Medicine', 'Critical Care', 'Toxicology'],
  'Family & Community Medicine': ['Family Medicine', 'Public Health'],
  'Medical Ethics & Professionalism': ['Ethics', 'Medical Ethics'],
  'Radiology': ['Radiology'],
  'Pathology': ['Pathology'],
  'Forensic Medicine': ['Forensic Medicine'],
};

const BAD_PHRASES = [
  'none of the above',
  'all of the above',
  'none of these',
  'all of these',
  'not listed',
];

const GENERIC_RATIONALE_PATTERNS = [
  /^\s*correct\.?\s*$/i,
  /^\s*this is correct\.?\s*$/i,
  /^\s*this is the correct answer\.?\s*$/i,
  /^\s*this is the right answer\.?\s*$/i,
  /^\s*correct answer\.?\s*$/i,
  /^\s*this option is correct\.?\s*$/i,
  /^\s*the correct answer is [a-d]\.?\s*$/i,
];

async function fetchAllQuestions() {
  const out = [];
  let q = db.collection('questions').orderBy('__name__').limit(500);
  let last = null;
  while (true) {
    const snap = last ? await q.startAfter(last).get() : await q.get();
    if (snap.empty) break;
    snap.forEach((doc) => {
      const d = doc.data() || {};
      out.push({ id: doc.id, ...d });
    });
    last = snap.docs[snap.docs.length - 1];
    process.stdout.write(`\r   Loaded ${out.length} documents…`);
    if (snap.size < 500) break;
  }
  console.log(`\r   Loaded ${out.length} documents.`);
  return out;
}

function isGenericRationale(text) {
  if (!text || typeof text !== 'string') return true;
  const t = text.trim();
  if (t.length < 15) return true;
  return GENERIC_RATIONALE_PATTERNS.some((re) => re.test(t));
}

function auditQuestions(questions) {
  const total = questions.length;
  const issues = [];

  // ── Schema validation ─────────────────────────────────────────────────────
  const schemaIssues = [];
  questions.forEach((q) => {
    const id = q.id;
    const push = (sev, code, msg, fix = '') => schemaIssues.push({ id, severity: sev, code, problem: msg, fix });

    if (!q.question || typeof q.question !== 'string') push('Critical', 'missing-stem', 'Missing or invalid question stem');
    if (!Array.isArray(q.options)) push('Critical', 'missing-options', 'Missing options array');
    else {
      if (q.options.length < 2) push('Critical', 'too-few-options', `Only ${q.options.length} options (need 4-5)`);
      if (q.options.length > 6) push('Medium', 'too-many-options', `${q.options.length} options (unusual)`);
      const correctCount = q.options.filter((o) => o.correct === true).length;
      if (correctCount === 0) push('Critical', 'no-correct-answer', 'No option marked correct');
      if (correctCount > 1) push('Critical', 'multiple-correct', `${correctCount} options marked correct`);
      q.options.forEach((opt, idx) => {
        if (!opt.text || typeof opt.text !== 'string') push('Critical', `missing-option-text-${idx}`, `Option ${idx} missing text`);
      });
      const expectedLetter = correctCount === 1 ? String.fromCharCode(65 + q.options.findIndex((o) => o.correct === true)) : '';
      if (q.correct_answer && q.correct_answer !== expectedLetter) {
        push('High', 'correct-answer-mismatch', `correct_answer="${q.correct_answer}" but computed="${expectedLetter}"`);
      }
    }
    if (!q.rationale || typeof q.rationale !== 'string' || q.rationale.trim().length < 10) {
      push('High', 'missing-rationale', 'Missing or very short top-level rationale');
    }
    if (!q.topic) push('Medium', 'missing-topic', 'Missing topic field');
    if (!q.difficulty) push('Medium', 'missing-difficulty', 'Missing difficulty field');
    if (!q.year) push('Low', 'missing-year', 'Missing year field');
    if (!Array.isArray(q.tags)) push('Low', 'missing-tags', 'Missing tags array');
    else if (q.tags.length === 0) push('Low', 'empty-tags', 'Tags array is empty');
  });

  // ── Duplicate answer options within same question ─────────────────────────
  const dupOptionIssues = [];
  questions.forEach((q) => {
    if (!Array.isArray(q.options)) return;
    const texts = q.options.map((o) => String(o.text || '').toLowerCase().trim());
    const seen = new Set();
    texts.forEach((t, i) => {
      if (seen.has(t)) dupOptionIssues.push({ id: q.id, severity: 'High', code: 'duplicate-option-text', problem: `Duplicate option text: "${q.options[i].text}"` });
      seen.add(t);
    });
  });

  // ── "All/None of the above" detection ─────────────────────────────────────
  const badOptionIssues = [];
  questions.forEach((q) => {
    if (!Array.isArray(q.options)) return;
    q.options.forEach((opt, idx) => {
      const text = String(opt.text || '').toLowerCase();
      BAD_PHRASES.forEach((phrase) => {
        if (text.includes(phrase)) {
          badOptionIssues.push({ id: q.id, severity: 'Medium', code: 'bad-option-phrase', problem: `Option ${idx} contains "${phrase}"` });
        }
      });
    });
  });

  // ── Rationale quality ─────────────────────────────────────────────────────
  const rationaleIssues = [];
  questions.forEach((q) => {
    // Top-level rationale
    if (isGenericRationale(q.rationale)) {
      rationaleIssues.push({ id: q.id, severity: 'Medium', code: 'generic-rationale', problem: 'Top-level rationale is generic or too short' });
    }
    // Per-option rationale quality
    if (Array.isArray(q.options)) {
      q.options.forEach((opt, idx) => {
        if (isGenericRationale(opt.rationale)) {
          rationaleIssues.push({ id: q.id, severity: 'Low', code: 'generic-option-rationale', problem: `Option ${idx} rationale is generic or missing` });
        }
      });
    }
  });

  // ── Image integrity ───────────────────────────────────────────────────────
  const imageIssues = [];
  questions.forEach((q) => {
    if (q.image_reference === true) {
      if (!q.image_url || typeof q.image_url !== 'string') {
        imageIssues.push({ id: q.id, severity: 'High', code: 'missing-image-url', problem: 'image_reference=true but no image_url' });
      }
      if (!q.ai_image_plan) {
        imageIssues.push({ id: q.id, severity: 'Low', code: 'missing-ai-plan', problem: 'image_reference=true but no ai_image_plan' });
      }
    }
    if (q.image_url && q.image_reference !== true) {
      imageIssues.push({ id: q.id, severity: 'Medium', code: 'orphan-image-url', problem: 'image_url exists but image_reference is not true' });
    }
  });

  // ── Topic / domain coverage ───────────────────────────────────────────────
  const topicCounts = {};
  const domainCounts = {};
  questions.forEach((q) => {
    topicCounts[q.topic || 'UNKNOWN'] = (topicCounts[q.topic || 'UNKNOWN'] || 0) + 1;
    domainCounts[q.scfhs_domain || 'UNKNOWN'] = (domainCounts[q.scfhs_domain || 'UNKNOWN'] || 0) + 1;
  });

  const coverageIssues = [];
  Object.entries(SCFHS_BLUEPRINT).forEach(([domain, expectedPct]) => {
    const actual = domainCounts[domain] || 0;
    const actualPct = actual / total;
    const expectedCount = Math.round(expectedPct * total);
    const diff = actual - expectedCount;
    if (actualPct < expectedPct * 0.5 && expectedCount > 5) {
      coverageIssues.push({
        severity: 'High',
        code: 'underrepresented-domain',
        domain,
        problem: `${domain}: ${actual} questions (${(actualPct * 100).toFixed(1)}%) vs expected ~${expectedCount} (${(expectedPct * 100).toFixed(0)}%)`,
        missing: expectedCount - actual,
      });
    } else if (actualPct < expectedPct * 0.8) {
      coverageIssues.push({
        severity: 'Medium',
        code: 'low-domain-coverage',
        domain,
        problem: `${domain}: ${actual} questions (${(actualPct * 100).toFixed(1)}%) vs expected ~${expectedCount} (${(expectedPct * 100).toFixed(0)}%)`,
        missing: expectedCount - actual,
      });
    }
  });

  // ── Difficulty distribution ───────────────────────────────────────────────
  const diffCounts = {};
  questions.forEach((q) => { diffCounts[q.difficulty || 'UNKNOWN'] = (diffCounts[q.difficulty || 'UNKNOWN'] || 0) + 1; });

  // ── Year distribution ─────────────────────────────────────────────────────
  const yearCounts = {};
  questions.forEach((q) => { yearCounts[q.year || 'UNKNOWN'] = (yearCounts[q.year || 'UNKNOWN'] || 0) + 1; });

  // ── Orphaned / unmapped topics ────────────────────────────────────────────
  const unmappedTopics = Object.keys(topicCounts).filter((t) => {
    return !Object.values(EXPECTED_TOPICS).flat().includes(t) && t !== 'UNKNOWN';
  });

  return {
    summary: {
      totalQuestions: total,
      schemaIssueCount: schemaIssues.length,
      dupOptionIssueCount: dupOptionIssues.length,
      badOptionIssueCount: badOptionIssues.length,
      rationaleIssueCount: rationaleIssues.length,
      imageIssueCount: imageIssues.length,
      coverageIssueCount: coverageIssues.length,
      criticalIssues: [...schemaIssues, ...dupOptionIssues].filter((i) => i.severity === 'Critical').length,
      highIssues: [...schemaIssues, ...dupOptionIssues, ...imageIssues, ...coverageIssues].filter((i) => i.severity === 'High').length,
    },
    distributions: {
      topic: Object.entries(topicCounts).sort((a, b) => b[1] - a[1]),
      domain: Object.entries(domainCounts).sort((a, b) => b[1] - a[1]),
      difficulty: Object.entries(diffCounts).sort((a, b) => b[1] - a[1]),
      year: Object.entries(yearCounts).sort((a, b) => b[1] - a[1]),
    },
    coverage: {
      blueprint: SCFHS_BLUEPRINT,
      actualDomainCounts: domainCounts,
      issues: coverageIssues,
      unmappedTopics,
    },
    issues: {
      schema: schemaIssues.slice(0, 50),
      schemaTruncated: schemaIssues.length > 50,
      duplicateOptions: dupOptionIssues.slice(0, 30),
      duplicateOptionsTruncated: dupOptionIssues.length > 30,
      badOptions: badOptionIssues.slice(0, 30),
      badOptionsTruncated: badOptionIssues.length > 30,
      rationales: rationaleIssues.slice(0, 50),
      rationalesTruncated: rationaleIssues.length > 50,
      images: imageIssues.slice(0, 50),
      imagesTruncated: imageIssues.length > 50,
    },
  };
}

async function main() {
  const jsonOnly = process.argv.includes('--json-only');
  if (!jsonOnly) console.log('\n🔎 SMLE Pro — Comprehensive Question Bank Audit\n');

  const questions = await fetchAllQuestions();
  const report = auditQuestions(questions);

  const backupDir = join(__dirname, 'backups');
  mkdirSync(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = join(backupDir, `audit-${ts}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  if (!jsonOnly) {
    const s = report.summary;
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Total Questions:     ${s.totalQuestions}`);
    console.log(`  Critical Issues:     ${s.criticalIssues}`);
    console.log(`  High Issues:         ${s.highIssues}`);
    console.log(`  Schema Issues:       ${s.schemaIssueCount}`);
    console.log(`  Dup Options:         ${s.dupOptionIssueCount}`);
    console.log(`  Bad Option Phrases:  ${s.badOptionIssueCount}`);
    console.log(`  Rationale Issues:    ${s.rationaleIssueCount}`);
    console.log(`  Image Issues:        ${s.imageIssueCount}`);
    console.log(`  Coverage Gaps:       ${s.coverageIssueCount}`);
    console.log('═══════════════════════════════════════════════════\n');

    console.log('📊 Topic Distribution (top 15):');
    report.distributions.topic.slice(0, 15).forEach(([t, c]) => {
      const pct = ((c / s.totalQuestions) * 100).toFixed(1);
      console.log(`   • ${t.padEnd(28)} ${String(c).padStart(4)}  (${pct}%)`);
    });
    console.log();

    console.log('📊 Domain Distribution:');
    report.distributions.domain.forEach(([d, c]) => {
      const expected = SCFHS_BLUEPRINT[d] ? Math.round(SCFHS_BLUEPRINT[d] * s.totalQuestions) : 'N/A';
      const pct = ((c / s.totalQuestions) * 100).toFixed(1);
      console.log(`   • ${d.padEnd(35)} ${String(c).padStart(4)}  (${pct}%)  expected:~${expected}`);
    });
    console.log();

    console.log('📊 Difficulty Distribution:');
    report.distributions.difficulty.forEach(([d, c]) => {
      const pct = ((c / s.totalQuestions) * 100).toFixed(1);
      console.log(`   • ${d.padEnd(12)} ${String(c).padStart(4)}  (${pct}%)`);
    });
    console.log();

    if (report.coverage.unmappedTopics.length) {
      console.log('⚠️  Unmapped topics (not in SCFHS_DOMAIN_MAP):');
      report.coverage.unmappedTopics.forEach((t) => console.log(`   • ${t}`));
      console.log();
    }

    if (report.issues.schema.length) {
      console.log('🔴 Critical/High Schema Issues (first 10):');
      report.issues.schema.slice(0, 10).forEach((i) => {
        console.log(`   [${i.severity}] ${i.code} — ${i.id}`);
        console.log(`      ${i.problem}`);
      });
      console.log();
    }

    if (report.issues.images.length) {
      console.log('🖼️  Image Issues (first 10):');
      report.issues.images.slice(0, 10).forEach((i) => {
        console.log(`   [${i.severity}] ${i.code} — ${i.id}`);
        console.log(`      ${i.problem}`);
      });
      console.log();
    }

    if (report.coverage.issues.length) {
      console.log('📉 Coverage Gaps:');
      report.coverage.issues.forEach((i) => {
        console.log(`   [${i.severity}] ${i.domain}: missing ~${i.missing} questions`);
      });
      console.log();
    }

    console.log(`📁 Full report: ${outPath}\n`);
  } else {
    console.log(outPath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
