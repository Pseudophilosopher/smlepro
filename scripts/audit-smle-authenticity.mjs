/**
 * audit-smle-authenticity.mjs
 *
 * Checks EVERY question for SMLE authenticity markers.
 * Non-SMLE contamination detection — flags questions that look like
 * USMLE, MRCP, PLAB, or other exam content instead of Saudi SMLE.
 *
 * Usage:
 *   node scripts/audit-smle-authenticity.mjs
 *   node scripts/audit-smle-authenticity.mjs --json-only
 *
 * What it checks:
 *   ✅ Saudi guideline references (MOH, SCFHS, الهيئة, etc.)
 *   ❌ Foreign guideline references (AHA, ACC, NICE, CDC, FDA, etc.)
 *   🟡 Generic rationales with no geographic/cultural marker
 *   🟡 Arabic script in questions (shouldn't be in English-only SMLE prep)
 *   ✅ Saudi-specific diseases & epidemiology (e.g., MERS, thalassemia)
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

// ── SMLE Authenticity Markers ───────────────────────────────────────────────

/** Saudi-specific references → SMLE-appropriate */
const SAUDI_REFERENCE_PATTERNS = [
  /Saudi\s+(MOH|Ministry of Health)/i,
  /SCFHS/i,
  /Saudi\s+Commission/i,
  /Saudi\s+Center\s+for\s+Disease\s+Prevention/i,
  /Saudi\s+Health\s+Council/i,
  /King\s+(Saud|Faisal|Fahd|Abdulaziz|Khalid|Abdullah|Salman)\s+(University|Medical\s+City|Hospital)/i,
  /KSU\s+Medical/i,
  /KFSH/i,
  /National\s+Guide\s+for\s+Clinical\s+Excellence/i,
  /Saudi\s+Clinical\s+Practice\s+Guideline/i,
  /Saudi\s+Center\s+for\s+Evidence-Based\s+Healthcare/i,
  /Saudi\s+National\s+Diabetes\s+Center/i,
  /الهيئة\s+السعودية/i,
  /وزارة\s+الصحة/i,
  /Saudi\s+Thoracic\s+Society/i,
  /Saudi\s+Oncology\s+Society/i,
  /Saudi\s+Cardiology\s+Society/i,
  /Saudi\s+Diabetes\s+Society/i,
  /Saudi\s+Stroke\s+Society/i,
  /Saudi\s+Association/i,
  /Saudi\s+Initiative/i,
  /Saudi\s+National/i,
  /Saudi\s+Arabian/i,
  /Saudi\s+Guidelines/i,
];

/** Saudi-specific topics/diseases → SMLE-appropriate */
const SAUDI_SPECIFIC_KEYWORDS = [
  /MERS[- ]?CoV/i,
  /Middle East respiratory syndrome/i,
  /thalassemia/i,
  /sickle\s+cell/i,
  /familial\s+Mediterranean\s+fever/i,
  /congenital\s+adrenal\s+hyperplasia/i,
  /Hemoglobinopathy/i,
  /G6PD\s+deficiency/i,
  /brucellosis/i,
  /visceral\s+leishmaniasis/i,
  /cutaneous\s+leishmaniasis/i,
  /schistosomiasis/i,
  /tuberculosis/i,  // Endemic in KSA
  /meningococcal\s+disease/i,  // Hajj-associated
  /Hajj/i,
  /Umrah/i,
  /Saudi/i,
  /dengue/i,
 /Chikungunya/i,
  /Crimean-Congo/i,
  /Rift\s+Valley\s+fever/i,
  /Qatar/i,  // Regional context
  /Gulf\s+States/i,
  /Arabian\s+Peninsula/i,
  /Red\s+Sea/i,
  /Arab\s+population/i,
  /consanguineous/i,
  /consanguinity/i,
];

/** Non-Saudi/foreign references → potential contamination */
const FOREIGN_REFERENCE_PATTERNS = [
  /American\s+Heart\s+Association/i,
  /AHA\s+guideline/i,
  /American\s+College\s+of\s+Cardiology/i,
  /ACC\s+guideline/i,
  /American\s+College\s+of\s+Physicians/i,
  /ACP\s+guideline/i,
  /NICE\s+guideline/i,
  /National\s+Institute\s+(for\s+)?Health\s+(and\s+)?Care\s+Excellence/i,
  /CDC\s+guideline/i,
  /Centers\s+for\s+Disease\s+Control/i,
  /FDA/i,
  /U\.?S\.?\s+Preventive\s+Services\s+Task\s+Force/i,
  /USPSTF/i,
  /WHO\s+guideline/i,
  /World\s+Health\s+Organization/i,
  /European\s+Society\s+of\s+Cardiology/i,
  /ESC\s+guideline/i,
  /British\s+Thoracic\s+Society/i,
  /UK\s+guideline/i,
  /National\s+Comprehensive\s+Cancer\s+Network/i,
  /NCCN/i,
  /PLAB/i,
  /USMLE/i,
  /MRCP/i,
  /FRCP/i,
  /NBME/i,
  /AMC/i,
  /Australian\s+Medical\s+Council/i,
  /Canadian\s+Medical/i,
  /New\s+England\s+Journal\s+of\s+Medicine/i,  // Not wrong per se, but not SMLE-specific
  /JAMA/i,
  /Lancet/i,  // International, not Saudi-specific
  /MEDLINE/i,
  /PubMed/i,
  /NIH/i,
  /National\s+Institutes\s+of\s+Health/i,
  /Mayo\s+Clinic/i,
  /Cleveland\s+Clinic/i,
  /Johns\s+Hopkins/i,
  /Harvard\s+Medical/i,
  /Stanford\s+Medical/i,
];

// ── Fetch Functions ──────────────────────────────────────────────────────────

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

// ── Analysis Functions ──────────────────────────────────────────────────────

function checkPatterns(text, patterns) {
  if (!text || typeof text !== 'string') return [];
  return patterns.filter((re) => re.test(text)).map((re) => re.source);
}

function isGenericRationale(text) {
  if (!text || typeof text !== 'string') return true;
  const t = text.trim();
  if (t.length < 20) return true;
  const generic = [
    /^\s*correct\.?\s*$/i,
    /^\s*this is correct\.?\s*$/i,
    /^\s*this is the correct answer\.?\s*$/i,
    /^\s*the correct answer is [a-d]/i,
    /^\s*option [a-d] is correct/i,
  ];
  return generic.some((re) => re.test(t));
}

// ── Main Audit ──────────────────────────────────────────────────────────────

function audit(questions) {
  const total = questions.length;
  const results = [];

  questions.forEach((q) => {
    const id = q.id;
    const topic = q.topic || '';
    const question = q.question || '';
    const rationale = q.rationale || '';
    const reference = q.reference || '';
    const options = Array.isArray(q.options) ? q.options.map((o) => o.text || '').join(' ') : '';
    const tags = Array.isArray(q.tags) ? q.tags.join(' ') : '';

    // Combine all text fields for pattern matching
    const allText = [question, rationale, reference, options, topic, tags].join(' ');

    const saudiMatches = checkPatterns(allText, SAUDI_REFERENCE_PATTERNS);
    const sardMatches = checkPatterns(allText, SAUDI_SPECIFIC_KEYWORDS);
    const foreignMatches = checkPatterns(allText, FOREIGN_REFERENCE_PATTERNS);

    const hasGenericRationale = isGenericRationale(rationale);
    const hasArabic = /[\u0600-\u06FF\u0750-\u077F]/.test(question || '');

    // Determine SMLE authenticity score
    let smleScore = 50; // Start neutral
    if (saudiMatches.length > 0) smleScore += 25;
    if (sardMatches.length > 0) smleScore += 10;
    if (foreignMatches.length > 0) smleScore -= 30;
    if (hasGenericRationale) smleScore -= 15;
    if (hasArabic) smleScore -= 10;

    smleScore = Math.max(0, Math.min(100, smleScore));

    let verdict;
    if (smleScore >= 80) verdict = 'SMLE-OK';
    else if (smleScore >= 50) verdict = 'UNCLEAR';
    else if (foreignMatches.length > 0) verdict = 'NON-SMLE-SUSPECT';
    else verdict = 'UNCLEAR';

    if (verdict === 'SMLE-OK' &&
        foreignMatches.length === 0 &&
        saudiMatches.length === 0 &&
        sardMatches.length === 0) {
      // Has no specific markers at all — downgrade
      verdict = 'UNCLEAR';
      smleScore = 40;
    }

    if (verdict !== 'SMLE-OK' || true) {
      results.push({
        id,
        verdict,
        smleScore,
        topic,
        hasArabic,
        genericRationale: hasGenericRationale,
        saudiRefs: saudiMatches,
        saudiKeywords: sardMatches,
        foreignRefs: foreignMatches,
        questionPreview: (question || '').slice(0, 80),
        rationalePreview: hasGenericRationale ? (rationale || '').slice(0, 60) : '',
      });
    }
  });

  // ── Summary ──
  const byVerdict = {};
  results.forEach((r) => {
    byVerdict[r.verdict] = (byVerdict[r.verdict] || 0) + 1;
  });

  // Topics with most issues
  const topicCounts = {};
  results.forEach((r) => {
    if (r.verdict !== 'SMLE-OK') {
      topicCounts[r.topic] = (topicCounts[r.topic] || 0) + 1;
    }
  });
  const worstTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  // Foreign refs stats
  const foreignRefCounts = {};
  results.forEach((r) => {
    if (r.foreignRefs.length > 0) {
      r.foreignRefs.forEach((ref) => {
        foreignRefCounts[ref] = (foreignRefCounts[ref] || 0) + 1;
      });
    }
  });

  return {
    summary: {
      totalQuestions: total,
      scanned: results.length,
      byVerdict,
      smleOk: results.filter((r) => r.verdict === 'SMLE-OK').length,
      unclear: results.filter((r) => r.verdict === 'UNCLEAR').length,
      nonSmleSuspect: results.filter((r) => r.verdict === 'NON-SMLE-SUSPECT').length,
      pctSmleOk: total > 0 ? ((results.filter((r) => r.verdict === 'SMLE-OK').length / total) * 100).toFixed(1) : 0,
      pctNonSmle: total > 0 ? ((results.filter((r) => r.verdict === 'NON-SMLE-SUSPECT').length / total) * 100).toFixed(1) : 0,
      genericRationaleCount: results.filter((r) => r.genericRationale).length,
      arabicInQuestions: results.filter((r) => r.hasArabic).length,
      foreignRefTotal: results.filter((r) => r.foreignRefs.length > 0).length,
    },
    worstTopics,
    mostCommonForeignRefs: Object.entries(foreignRefCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    nonSmleQuestions: results
      .filter((r) => r.verdict === 'NON-SMLE-SUSPECT')
      .slice(0, 50),
    unclearQuestions: results
      .filter((r) => r.verdict === 'UNCLEAR')
      .slice(0, 50),
  };
}

async function main() {
  const jsonOnly = process.argv.includes('--json-only');
  if (!jsonOnly) console.log('\n🔎 SMLE Authenticity Audit — Checking for Non-Saudi Contamination\n');

  const questions = await fetchAllQuestions();
  const report = audit(questions);

  const backupDir = join(__dirname, 'backups');
  mkdirSync(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = join(backupDir, `smle-authenticity-${ts}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  if (!jsonOnly) {
    const s = report.summary;
    console.log('\n═══════════════════════════════════════════════════');
    console.log(`  Total Questions:        ${s.totalQuestions}`);
    console.log(`  ✅ SMLE-OK:             ${s.smleOk} (${s.pctSmleOk}%)`);
    console.log(`  ⚠️  UNCLEAR:            ${s.unclear}`);
    console.log(`  ❌ NON-SMLE SUSPECT:    ${s.nonSmleSuspect} (${s.pctNonSmle}%)`);
    console.log(`  📝 Generic Rationales:  ${s.genericRationaleCount}`);
    console.log(`  🆎 Arabic in Questions: ${s.arabicInQuestions}`);
    console.log(`  🌐 Foreign References:  ${s.foreignRefTotal}`);
    console.log('═══════════════════════════════════════════════════\n');

    console.log('📉 Worst Topics (most non-SMLE issues):');
    report.worstTopics.slice(0, 10).forEach(([t, c]) => console.log(`   • ${t.padEnd(30)} ${c} issues`));
    console.log();

    if (report.mostCommonForeignRefs.length > 0) {
      console.log('🌐 Most Common Foreign References Found:');
      report.mostCommonForeignRefs.forEach(([ref, count]) => {
        const short = ref.length > 60 ? ref.slice(0, 60) + '...' : ref;
        console.log(`   • ${short} (${count}x)`);
      });
      console.log();
    }

    const suspects = report.nonSmleQuestions;
    if (suspects.length > 0) {
      console.log('❌ Top NON-SMLE Suspects (first 10):');
      suspects.slice(0, 10).forEach((q) => {
        console.log(`   [Score:${q.smleScore}] ${q.id}`);
        console.log(`      Topic: ${q.topic}`);
        console.log(`      Q: ${q.questionPreview}...`);
        if (q.foreignRefs.length) console.log(`      Foreign refs: ${q.foreignRefs.join(', ')}`);
        if (q.genericRationale) console.log(`      Rationale: "${q.rationalePreview}"`);
        console.log();
      });
    }

    console.log(`📁 Full report: ${outPath}\n`);
    console.log('💡 Next step: Run with npm audit:smle to see which questions need Saudi-specific references added.\n');
  } else {
    console.log(outPath);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
