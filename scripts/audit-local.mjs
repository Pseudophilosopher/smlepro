/**
 * audit-local.mjs
 *
 * Local question bank health check — reads generated-final-bank.json
 * instead of Firestore. Runs the same schema/coverage/rationale/image checks.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  'none of the above', 'all of the above',
  'none of these', 'all of these', 'not listed',
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

function isGenericRationale(text) {
  if (!text || typeof text !== 'string') return true;
  const t = text.trim();
  if (t.length < 15) return true;
  return GENERIC_RATIONALE_PATTERNS.some((re) => re.test(t));
}

function auditQuestions(questions) {
  const total = questions.length;
  const schemaIssues = [];

  questions.forEach((q) => {
    const id = q.id;
    const push = (sev, code, msg) => schemaIssues.push({ id, severity: sev, code, problem: msg });

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

  const rationaleIssues = [];
  questions.forEach((q) => {
    if (isGenericRationale(q.rationale)) {
      rationaleIssues.push({ id: q.id, severity: 'Medium', code: 'generic-rationale', problem: 'Top-level rationale is generic or too short' });
    }
    if (Array.isArray(q.options)) {
      q.options.forEach((opt, idx) => {
        if (isGenericRationale(opt.rationale)) {
          rationaleIssues.push({ id: q.id, severity: 'Low', code: 'generic-option-rationale', problem: `Option ${idx} rationale is generic or missing` });
        }
      });
    }
  });

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
    if (actualPct < expectedPct * 0.5 && expectedCount > 5) {
      coverageIssues.push({
        severity: 'High', code: 'underrepresented-domain', domain,
        problem: `${domain}: ${actual} questions (${(actualPct * 100).toFixed(1)}%) vs expected ~${expectedCount} (${(expectedPct * 100).toFixed(0)}%)`,
        missing: expectedCount - actual,
      });
    } else if (actualPct < expectedPct * 0.8) {
      coverageIssues.push({
        severity: 'Medium', code: 'low-domain-coverage', domain,
        problem: `${domain}: ${actual} questions (${(actualPct * 100).toFixed(1)}%) vs expected ~${expectedCount} (${(expectedPct * 100).toFixed(0)}%)`,
        missing: expectedCount - actual,
      });
    }
  });

  const diffCounts = {};
  questions.forEach((q) => { diffCounts[q.difficulty || 'UNKNOWN'] = (diffCounts[q.difficulty || 'UNKNOWN'] || 0) + 1; });

  const yearCounts = {};
  questions.forEach((q) => { yearCounts[q.year || 'UNKNOWN'] = (yearCounts[q.year || 'UNKNOWN'] || 0) + 1; });

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
    coverage: { blueprint: SCFHS_BLUEPRINT, actualDomainCounts: domainCounts, issues: coverageIssues, unmappedTopics },
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

function main() {
  console.log('\n🔎 SMLE Pro — Local Question Bank Health Check\n');

  const filePath = join(__dirname, 'generated-final-bank.json');
  const raw = JSON.parse(readFileSync(filePath, 'utf8'));

  // Assign sequential IDs and ensure array
  const questions = (Array.isArray(raw) ? raw : [raw]).map((q, i) => ({ id: `gen-${i + 1}`, ...q }));

  console.log(`   Loaded ${questions.length} questions from generated-final-bank.json\n`);

  const report = auditQuestions(questions);

  // Save report
  const backupDir = join(__dirname, 'backups');
  mkdirSync(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = join(backupDir, `audit-local-${ts}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  // ── Print summary ──
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
    console.log(`   \u2022 ${t.padEnd(28)} ${String(c).padStart(4)}  (${pct}%)`);
  });
  console.log();

  console.log('📊 Domain Distribution:');
  report.distributions.domain.forEach(([d, c]) => {
    const expected = SCFHS_BLUEPRINT[d] ? Math.round(SCFHS_BLUEPRINT[d] * s.totalQuestions) : 'N/A';
    const pct = ((c / s.totalQuestions) * 100).toFixed(1);
    console.log(`   \u2022 ${d.padEnd(35)} ${String(c).padStart(4)}  (${pct}%)  expected:~${expected}`);
  });
  console.log();

  console.log('📊 Difficulty Distribution:');
  report.distributions.difficulty.forEach(([d, c]) => {
    const pct = ((c / s.totalQuestions) * 100).toFixed(1);
    console.log(`   \u2022 ${d.padEnd(12)} ${String(c).padStart(4)}  (${pct}%)`);
  });
  console.log();

  if (report.coverage.unmappedTopics.length) {
    console.log('⚠️  Unmapped topics (not in SCFHS_DOMAIN_MAP):');
    report.coverage.unmappedTopics.forEach((t) => console.log(`   \u2022 ${t}`));
    console.log();
  }

  if (report.issues.schema.length) {
    console.log('🔴 Critical/High Schema Issues (first 10):');
    report.issues.schema.slice(0, 10).forEach((i) => {
      console.log(`   [${i.severity}] ${i.code} \u2014 ${i.id}`);
      console.log(`      ${i.problem}`);
    });
    console.log();
  }

  if (report.issues.images.length) {
    console.log('🖼️  Image Issues (first 10):');
    report.issues.images.slice(0, 10).forEach((i) => {
      console.log(`   [${i.severity}] ${i.code} \u2014 ${i.id}`);
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
}

main();
