/**
 * question-utils.mjs
 *
 * Shared utilities for SMLE question generators.
 * Provides: shuffle, write, variation helpers.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Shuffle array (Fisher-Yates) ──────────────────────────────────────────────
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Build a question from template parts ──────────────────────────────────────
export function makeQuestion({ vignette, topic, domain, difficulty, tags, options, topRationale, year }) {
  const shuffled = shuffle(options);
  const correctIdx = shuffled.findIndex((o) => o.correct);
  const correctLetter = String.fromCharCode(65 + correctIdx);

  return {
    question: vignette,
    topic,
    scfhs_domain: domain,
    difficulty,
    year: year || '2024-2025',
    image_reference: false,
    options: shuffled.map((o) => ({
      text: o.text,
      correct: o.correct,
      rationale: o.rationale,
    })),
    correct_answer: correctLetter,
    rationale: topRationale,
    tags,
  };
}

// ── Age/gender variation helpers ──────────────────────────────────────────────
export function varyAge(base, range) {
  return base + (Math.floor(Math.random() * (range + 1)) - Math.floor(range / 2));
}

export function varyGender(i) {
  return i % 2 === 0 ? 'male' : 'female';
}

// ── Write output JSON ─────────────────────────────────────────────────────────
export function writeOutput(filename, questions) {
  const backupDir = join(__dirname, 'backups');
  mkdirSync(backupDir, { recursive: true });
  const outPath = join(backupDir, filename);
  writeFileSync(outPath, JSON.stringify(questions, null, 2));
  console.log(`  ✅ ${filename} — ${questions.length} questions`);
  return outPath;
}

// ── Generate questions from template array ────────────────────────────────────
export function generateFromTemplates(templates, count, topic, domain) {
  const result = [];
  for (let i = 0; i < count; i++) {
    const tpl = templates[i % templates.length];
    const q = tpl(i);
    result.push({
      ...q,
      topic: q.topic || topic,
      scfhs_domain: q.scfhs_domain || domain,
    });
  }
  return result;
}

// ── Difficulty distribution helper ────────────────────────────────────────────
export function cycleDifficulty(i) {
  const cycle = ['Easy', 'Easy', 'Moderate', 'Moderate', 'Hard', 'Hard', 'Hard'];
  return cycle[i % cycle.length];
}
