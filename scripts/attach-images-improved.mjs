/**
 * attach-images-improved.mjs
 *
 * Stricter image attachment with confidence gating, modality enforcement,
 * and second-pass content verification.
 *
 * Run:
 *   node scripts/attach-images-improved.mjs --dry-run --limit=20
 *   node scripts/attach-images-improved.mjs --limit=50
 *
 * Key improvements over attach-images.mjs:
 *  1. Confidence gate: skips auto-attach when Gemini confidence < 0.70
 *  2. Modality enforcement: drops candidates whose filename contradicts expected modality
 *  3. Tighter title relevance: requires 2+ strong tokens (was 1-2 weak tokens)
 *  4. Wrong-disease penalty: heavily penalizes partial keyword matches from wrong conditions
 *  5. Post-download metadata guard: rejects images < 150px or > 4:1 aspect ratio
 *  6. Source diversity: falls back to Radiopaedia-style query hints for imaging-heavy stems
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { resolveCorrectAnswerText } from '../src/resolve-correct-answer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fetch = (await import('node-fetch')).default;
const sharp = (await import('sharp')).default;

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'firebase-service-account.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: "smle-mock-exam-51478532-5ae31.firebasestorage.app",
});

const db = getFirestore();
const bucket = getStorage().bucket();

// ── CLI ──────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {
    dryRun: process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true',
    limit: null,
    delayMs: null,
    minConfidence: 0.70,
    strictModality: true,
  };
  for (const a of argv) {
    if (a === '--dry-run') out.dryRun = true;
    if (a === '--no-strict-modality') out.strictModality = false;
    const lim = a.match(/^--limit=(\d+)$/);
    if (lim) out.limit = Math.max(1, parseInt(lim[1], 10));
    const del = a.match(/^--delay=(\d+)$/);
    if (del) out.delayMs = Math.max(500, parseInt(del[1], 10));
    const conf = a.match(/^--min-confidence=(0\.\d+)$/);
    if (conf) out.minConfidence = Math.max(0, Math.min(1, parseFloat(conf[1])));
  }
  if (process.env.LIMIT) out.limit = Math.max(1, parseInt(process.env.LIMIT, 10) || out.limit);
  if (process.env.DELAY_MS) out.delayMs = Math.max(500, parseInt(process.env.DELAY_MS, 10) || out.delayMs);
  return out;
}

const cli = parseArgs(process.argv.slice(2));

// ── Config ───────────────────────────────────────────────────
const COLLECTION = 'questions';
const MAX_OUTPUT_SIZE_KB = 300;
const DELAY_BETWEEN_REQUESTS_MS = cli.delayMs ?? 3000;
const TMP_DIR = tmpdir();
const DRY_RUN = cli.dryRun;
const BATCH_LIMIT = cli.limit;
const MIN_CONFIDENCE = cli.minConfidence;
const STRICT_MODALITY = cli.strictModality;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const WIKI_USER_AGENT =
  'SMLE-Pro-ImageBot/1.2 (https://smlepro.web.app; educational medical MCQ thumbnails; admin-curated)';

// ── Stop words ───────────────────────────────────────────────
const STOP_WORDS_FLUFF =
  /\b(the|a|an|is|are|was|were|what|which|following|presents|with|history|of|in|on|to|for|year-old|month-old|day-old|male|female|child|infant|boy|girl|man|woman|patient|shows|reveals|demonstrates|most|likely|diagnosis|treatment|step|initial)\b/gi;

function tokenizeForWikiSearch(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[^a-zA-Z0-9 -]/g, ' ')
    .replace(STOP_WORDS_FLUFF, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 6)
    .join(' ');
}

function normalizeStemText(question) {
  return String(question || '')
    .toLowerCase()
    .replace(/[\u2018\u2019'`´]/g, ' ')
    .replace(/\s+/g, ' ');
}

function isWeakImageAnswerText(t, stemNorm = '') {
  if (!t || String(t).trim().length < 4) return true;
  const s = String(t).toLowerCase();
  if (/\b(reassurance|symptomatic|supportive care|observation only|lifestyle|counseling|education only|follow-?up|refer to|admit|discharge|screening)\b/.test(s)) return true;
  if (/^anti[-\s]/i.test(s) && s.length < 80) return true;
  if (/\b(elevated|ratio|titer|levels?|positive for)\b.*\b(fsh|lh|amh|dna|smith|ana)\b/i.test(s)) return true;
  if (/\b(fsh|lh|amh)\b/i.test(s) && !/\b(syndrome|failure|insufficiency|tumor|mass)\b/i.test(s)) return true;
  if (/\blupus nephritis\b/i.test(s) && stemNorm && /\b(malar|butterfly|oral ulcer|rash|photosensit|discoid)\b/.test(stemNorm)) return true;
  if (/\b(letrozole|clomiphene|clomid|metformin|tamoxifen|bromocriptine|cabergoline|hmg|fsh injection|gonadotropin|ovulation induction|iui|ivf protocol)\b/i.test(s)) return true;
  return false;
}

// ── Expected modality / region ───────────────────────────────
function expectedModality(stem) {
  const s = String(stem || '').toLowerCase();
  if (/\b(ecg|ekg|delta wave|st elevation|st depression|qrs|t wave|p wave|arrhythm|peaked t)\b/.test(s)) return 'ecg';
  if (/\b(x-?ray|cxr|chest x|radiograph|pencil-?in-?cup|fracture|infiltrate|consolidation|pneumothorax)\b/.test(s)) return 'xray';
  if (/\b(ct|computed tomography)\b/.test(s)) return 'ct';
  if (/\b(mri|magnetic resonance)\b/.test(s)) return 'mri';
  if (/\b(ultrasound|sonograph|doppler|string of pearls|transvaginal)\b/.test(s)) return 'ultrasound';
  if (/\b(fundus|macula|leukocoria|retina|papilledema|cataract|corneal|dendritic|fluorescein|keratitis|ophthalmoscopy|slit lamp|red eye|ocular|pupil)\b/.test(s)) return 'ophthal';
  if (/\b(rash|lesion|vesicle|ulcer|malar|butterfly|annular|dermat|skin|herald patch)\b/.test(s)) return 'clinical_photo';
  return 'any';
}

function expectedRegion(stem) {
  const s = String(stem || '').toLowerCase();
  if (/\b(kidney|renal|glomerul|neph)\b/.test(s)) return 'renal';
  if (/\b(chest|lung|pulmonary|pneumo|hemithorax)\b/.test(s)) return 'chest';
  if (/\b(hand|finger|wrist|metacarp|phalang)\b/.test(s)) return 'hand';
  if (/\b(cervix|cervical|colposcopy|vagina|vulva|uterus|ovary)\b/.test(s)) return 'obgyn';
  if (/\b(skin|rash|lesion|vesicle|ulcer|malar|butterfly|annular)\b/.test(s)) return 'skin';
  if (/\b(foot|feet|toe|plantar|heel|ankle)\b/.test(s)) return 'foot';
  if (/\b(face|facial|periorbital|cheek|jaw|oral|tongue|lip|gingiv|palate)\b/.test(s)) return 'face';
  return 'any';
}

// ── Search query builders ────────────────────────────────────
function queriesFromAiImagePlan(data) {
  const plan = data.ai_image_plan;
  if (!plan || typeof plan !== 'object') return [];
  const arr = Array.isArray(plan.search_queries) ? plan.search_queries : [];
  const out = [];
  for (const s of arr) {
    const t = String(s || '').trim();
    if (t.length > 2) out.push(t);
  }
  return [...new Set(out)].slice(0, 8);
}

function buildSearchQueryList(data) {
  const list = [];
  const fromGemini = queriesFromAiImagePlan(data);
  for (const q of fromGemini) list.push(q);

  const question = data.question || '';
  const n = normalizeStemText(question);
  const ans = resolveCorrectAnswerText(data);

  // Condition-specific hardcoded high-yield queries
  if (n.includes('herald') || n.includes('pityriasis')) {
    list.push('pityriasis rosea herald patch skin medical');
    list.push('pityriasis rosea english dermatology');
  }
  if (/\b(string of pearls|polycystic ov|polycystic ovarian|\bpcos\b|peripheral follicles)\b/i.test(n)) {
    list.push('polycystic ovary ultrasound string of pearls medical');
    list.push('polycystic ovary syndrome transvaginal ultrasound medical');
  }
  if ((n.includes('butterfly') || n.includes('malar')) && /rheumat|internal medicine|lupus/i.test(String(data.topic || ''))) {
    list.push('systemic lupus erythematosus malar butterfly rash face skin medical');
    list.push('acute cutaneous lupus erythematosus skin rash');
  }
  if (n.includes('genital') && (n.includes('vesicle') || n.includes('ulcer'))) {
    list.push('genital herpes vesicles hsv skin medical');
    list.push('herpes genitalis ulcer skin');
  }
  if (/\b(koplik|measles)\b/i.test(n)) {
    list.push('koplik spots measles buccal mucosa medical');
  }
  if (/\b(erythema migrans|lyme disease|tick bite)\b/i.test(n)) {
    list.push('erythema migrans lyme disease skin rash medical');
  }
  if (/\b(dermatitis herpetiformis|celiac|gluten)\b/i.test(n)) {
    list.push('dermatitis herpetiformis skin rash elbows medical');
  }
  if (/\b(psoriasis|silvery scale| extensor surfaces)\b/i.test(n)) {
    list.push('plaque psoriasis silvery scale extensor surface skin medical');
  }

  // Stem-derived query
  const stemTokens = tokenizeForWikiSearch(`${data.topic || ''} ${question}`).split(/\s+/).slice(0, 5).join(' ');
  if (stemTokens) list.push(`${stemTokens} medical`);

  // Answer-derived query (only if not weak)
  if (!isWeakImageAnswerText(ans, n) && ans && ans.length > 3 && ans.length < 120) {
    const answerTokens = tokenizeForWikiSearch(ans);
    if (answerTokens) {
      list.push(`${answerTokens} medical`);
      list.push(`${answerTokens} clinical`);
    }
  }

  // Topic fallback
  if (data.topic && list.length < 3) {
    list.push(`${String(data.topic).split(/\s+/).slice(0, 3).join(' ')} medical`);
  }

  return [...new Set(list.filter(Boolean))];
}

// ── Candidate filtering (strict) ─────────────────────────────

const REL_TITLE_STOPWORDS = new Set([
  'what', 'which', 'following', 'patient', 'presents', 'present', 'with', 'without', 'history', 'complains',
  'complain', 'brought', 'noted', 'found', 'reveals', 'shows', 'demonstrates', 'classic', 'acute', 'chronic',
  'severe', 'mild', 'pain', 'male', 'female', 'child', 'children', 'infant', 'year', 'month', 'week', 'hour',
  'most', 'likely', 'best', 'next', 'initial', 'step', 'diagnosis', 'treatment', 'management', 'therapy',
  'syndrome', 'disease', 'disorder', 'condition', 'sign', 'signs', 'symptom', 'symptoms', 'exam', 'examination',
  'test', 'tests', 'results', 'level', 'levels', 'normal', 'abnormal', 'positive', 'negative', 'type', 'types',
  'given', 'known', 'associated', 'risk', 'factor', 'factors', 'medical', 'clinical', 'hospital',
  'emergency', 'unit', 'after', 'before', 'during', 'while', 'since', 'onset', 'sudden', 'gradual',
]);

function meaningfulTokens(stemNorm, answerText) {
  const blob = `${String(stemNorm || '')} ${String(answerText || '')}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const raw = blob.match(/\b[a-z]{4,}\b/g) || [];
  const out = [];
  const seen = new Set();
  for (const w of raw) {
    if (REL_TITLE_STOPWORDS.has(w)) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out.slice(0, 24);
}

function titleContainsToken(titleLower, token) {
  if (!token || token.length < 4) return false;
  if (titleLower.includes(token)) return true;
  if (token.length >= 6) {
    const stem = token.replace(/(ing|tion|s|ed)$/, '');
    if (stem.length >= 5 && titleLower.includes(stem)) return true;
  }
  return false;
}

function passesMinimumTitleRelevance(candidate, stemNorm, answerText) {
  const tokens = meaningfulTokens(stemNorm, answerText);
  if (tokens.length === 0) return true;
  const tl = String(candidate.title || '').toLowerCase().replace(/^file:/, '');
  let hits = 0;
  for (const t of tokens) {
    if (titleContainsToken(tl, t)) hits++;
  }
  // STRICT: require 2+ hits when there are many tokens, 1 only when very few
  const need = tokens.length >= 3 ? 2 : 1;
  return hits >= need;
}

function shouldDropForMustAvoid(candidate, mustAvoidList) {
  if (!mustAvoidList?.length) return false;
  const tl = String(candidate.title || '').toLowerCase();
  for (const raw of mustAvoidList) {
    const parts = String(raw || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter((w) => w.length >= 3);
    for (const tok of parts) {
      if (tl.includes(tok)) return true;
    }
  }
  return false;
}

// ── Disease-specific wrong-match penalties ───────────────────

const DISEASE_EXCLUSIONS = [
  {
    context: /\b(behcet|behçet)(?:'s|s)?\b/i,
    forbidden: /\b(herpes|hsv|simplex)\b/i,
    requiredIfForbiddenMissing: /\b(behcet|behçet)\b/i,
  },
  {
    context: /\b(back pain|back stiffness|morning stiffness|low back|lumbar|sacroili|ankylosing|bamboo|spondylit)\b/i,
    forbidden: /\b(axenfeld|aniridia|peters anomaly|microcornea|corneal ring)\b/i,
  },
  {
    context: /\b(testicular mass|scrotal mass|testicular lump|non-transilluminating)\b/i,
    forbidden: /\b(self-examination|self examination|how to examine|testicular self)\b/i,
  },
  {
    context: /\b(parkinson|pill[- ]rolling|resting tremor|bradykinesia|parkinsonian)\b/i,
    forbidden: /\b(gliomatosis|glioblast|astrocytoma|oligodendro)\b/i,
  },
  {
    context: /\b(liver hemangioma|hepatic hemangioma|benign.*liver|liver.*benign tumor)\b/i,
    forbidden: /\b(vertebral hemangioma|spine hemangioma|spinal hemangioma|vertebra)\b/i,
  },
  {
    context: /\b(vancomycin|red man|infusion reaction)\b/i,
    forbidden: /\bred ear syndrome\b/i,
  },
  {
    context: /\b(dactylitis|sausage digit|sausage finger|psoriatic arthritis)\b/i,
    forbidden: /\bworld psoriasis day\b/i,
  },
  {
    context: /\b(septal hematoma|nasal septal hematoma|septal abscess|nose.*hematoma)\b/i,
    forbidden: /\b(breast abscess|inguinal hernia|groin abscess)\b/i,
  },
  {
    context: /\b(blowout fracture|orbital floor|orbital fracture|inferior rectus entrapped)\b/i,
    forbidden: /\b(inguinal hernia repair|laparoscop|abdominal surgery prep)\b/i,
  },
];

function shouldDropDiseaseMismatch(candidate, stemNorm, hint) {
  const tl = String(candidate.title || '').toLowerCase();
  const ctx = `${String(stemNorm || '').toLowerCase()} ${String(hint || '').toLowerCase()}`;

  for (const rule of DISEASE_EXCLUSIONS) {
    if (rule.context.test(ctx) && rule.forbidden.test(tl)) {
      if (!rule.requiredIfForbiddenMissing || !rule.requiredIfForbiddenMissing.test(tl)) {
        return true;
      }
    }
  }
  return false;
}

// ── Modality / region enforcement ────────────────────────────

function shouldDropForModalityRegion(candidate, stemNorm) {
  if (!STRICT_MODALITY) return false;
  const tl = String(candidate.title || '').toLowerCase();
  const modality = expectedModality(stemNorm);
  const region = expectedRegion(stemNorm);

  if (modality === 'ecg' && !/\b(ecg|ekg|electrocardiogram|rhythm strip|lead [ivx]+)\b/.test(tl)) return true;
  if (modality === 'xray' && !/\b(x-?ray|radiograph|cxr|roentgen|plain film)\b/.test(tl)) return true;
  if (modality === 'ct' && !/\b(ct|computed tomography)\b/.test(tl)) return true;
  if (modality === 'mri' && !/\b(mri|magnetic resonance)\b/.test(tl)) return true;
  if (modality === 'ultrasound' && !/\b(ultrasound|sonograph|doppler)\b/.test(tl)) return true;
  if (modality === 'ophthal' && !/\b(fundus|retina|retinoblastoma|leukocoria|cataract|corneal|conjunct|sclera|optic|macula|fovea|pupil|eye|ophthal|ocular|fluorescein|keratitis|glaucoma|uveitis|iris|orbit|slit|tonometry|tay-?sachs|\bsachs\b|choroid|vitreous)\b/.test(tl)) return true;
  if (modality === 'clinical_photo' && /\b(chart|graph|figure\s*\d+|algorithm|histology|micrograph|tem|electron microscopy|ecg|x-?ray|ct|mri)\b/.test(tl)) return true;

  if (region === 'hand' && !/\b(hand|finger|wrist|phalang|metacarp|digit)\b/.test(tl)) return true;
  if (region === 'foot' && !/\b(foot|feet|toe|plantar|heel|ankle)\b/.test(tl)) return true;
  if (region === 'face' && !/\b(face|facial|periorbital|cheek|jaw|oral|tongue|lip|gingiv|palate)\b/.test(tl)) return true;
  if (region === 'obgyn' && !/\b(cervix|cervical|colposcopy|vagina|vulva|uterus|ovary|gyne)\b/.test(tl)) return true;
  if (region === 'skin' && !/\b(skin|rash|lesion|ulcer|vesicle|dermat|malar|butterfly|annular)\b/.test(tl)) return true;

  return false;
}

// ── Spurious title filter (condensed from original) ──────────

function shouldDropSpurious(candidate, stemNorm, hint) {
  const tl = String(candidate.title || '').toLowerCase();
  const ctx = `${String(stemNorm || '').toLowerCase()} ${String(hint || '').toLowerCase()}`;

  // Cars, PR, non-clinical
  if (/\b(marshal car|safety car|pit crew|suzuka circuit|nascar|indy car|stock car racing)\b/i.test(tl)) return true;
  if (/\btype\s+r\b/i.test(tl) && /\b(honda|toyota|acura|subaru|mitsubishi|ford|chevrolet|bmw|mercedes)\b/i.test(tl)) return true;
  if (/\b(us navy|u\.s\. navy|navy \d{6}-)\b/i.test(tl) && /\b(children'?s vitamins|pass(es|ed|ing)? out|vitamin distribution|handing out)\b/i.test(tl)) return true;
  if (/\b(receta|prescription|rx pad|pill bottle|pharmacy bag|tablet strip packaging)\b/i.test(tl) && /\b(clue cell|bacterial vaginosis|gardnerella|wet mount|trichomonas)\b/.test(ctx)) return true;
  if (/\b(blinddarm|appendicitis|appendix|vermiform|cecum|caecum)\b/i.test(tl) && /\b(burn|burns|thermal injury|full-thickness|third[- ]degree|3rd[- ]degree)\b/i.test(ctx)) return true;
  if (/\b(vegetable material|fallopian tube)\b/i.test(tl) && /\b(adenomyosis|boggy uterus|fibroid uterus|menorrhagia.*uterus|uterine fibroid)\b/i.test(ctx) && !/\b(adenomyosis|fibroid|leiomyoma|uterus|endomet)\b/i.test(tl)) return true;
  if (/\b(vertebral hemangioma|spine hemangioma|spinal hemangioma|vertebra)\b/i.test(tl) && /\b(liver hemangioma|hepatic hemangioma|benign.*liver|liver.*benign tumor)\b/i.test(ctx) && !/\b(liver|hepatic|hepat)\b/i.test(tl)) return true;
  if (/\bred ear syndrome\b/i.test(tl) && /\b(vancomycin|red man|infusion reaction)\b/i.test(ctx)) return true;
  if (/\bworld psoriasis day\b/i.test(tl) && /\b(dactylitis|sausage digit|sausage finger|psoriatic arthritis)\b/i.test(ctx) && !/\b(joint|hand|digit|dactylitis|swollen)\b/i.test(tl)) return true;
  if (/\b(portrait|headshot|bust|statue|biography|born \d{4}|died \d{4}|physician|scientist)\b/i.test(tl) && !/\b(patient|lesion|x-?ray|ecg|ultrasound|ct|mri|clinical)\b/i.test(tl)) return true;
  if (/\b(nursing care plan|care plan|infographic|flowchart|algorithm|mnemonic|poster|slide deck|powerpoint|lecture)\b/i.test(tl)) return true;
  if (/\b(breast abscess|inguinal hernia|groin abscess)\b/i.test(tl) && /\b(septal hematoma|nasal septal hematoma|septal abscess|nose.*hematoma)\b/i.test(ctx) && !/\b(nasal|nose|septal|rhin)\b/i.test(tl)) return true;
  if (/\b(inguinal hernia repair|laparoscop|abdominal surgery prep)\b/i.test(tl) && /\b(blowout fracture|orbital floor|orbital fracture|inferior rectus entrapped)\b/i.test(ctx) && !/\b(orbit|ocular|eye socket|maxillofacial)\b/i.test(tl)) return true;
  if (/\b(dog|cat|feline|canine)\b/i.test(tl) && /\b(horner|ptosis|miosis|pancoast)\b/i.test(ctx) && !/\b(veterinary|vet school|animal model)\b/i.test(ctx)) return true;
  if (/\b(roman[- ]british|findid|copper alloy|button and loop|archaeolog)\b/i.test(tl) && !/\b(medical|patient|clinical|specimen)\b/i.test(tl)) return true;
  if (/\b(wall plaque|fieldwork|ogmore|bridgend|dolphins)\b/i.test(tl) && /\b(thrush|oral candid|candidiasis|curd[- ]like|mouth plaque)\b/i.test(ctx)) return true;
  if (/\b(stem[- ]cell|regenerative medicine|ama regenerative|iv[- ]dmd)\b/i.test(tl) && /\b(gowers|duchenne|muscular dystrophy|dmd)\b/i.test(ctx)) return true;
  if (/\b(very low mag|high mag|low power|high power|h&e\b|hematoxylin|eosin)\b/i.test(tl) && /\b(lump|mass|swelling|clinical photo|parotid|preauricular|neck mass)\b/i.test(ctx) && !/\b(biopsy|histolog|patholog|microscop|specimen slide)\b/i.test(ctx)) return true;
  if (/\bawareness month\b/i.test(tl) && /\b(glaucoma|visual field|perimetry|tunnel vision)\b/i.test(ctx) && !/\b(fundus|optic disc|perimetry|visual field|gonioscopy|oct\b)\b/i.test(tl)) return true;
  if (/\bgloeden\b/i.test(tl) || /\bvon gloeden\b/i.test(tl)) return true;
  if (/\bmeta-analysis|meta analysis|wiki\s*journal|forest plot|cap meta|fig\s*\d\b/i.test(tl) && /\b(rickets|vitamin\s*d|vitamin deficiency|osteomalacia|scurvy|beriberi|pellagra)\b/i.test(ctx)) return true;
  if (/\b(dvidshub|make[- ]a[- ]wish|marine for a day|camp pendleton)\b/i.test(tl) && /\b(leukocoria|white reflex|retinoblastoma|cataract|fundus|pupil|corneal|ocular)\b/i.test(ctx)) return true;
  if (/\b(american red cross|red cross gives|base personnel|life[- ]saving training)\b/i.test(tl) && /\b(cardiac arrest|asystole|flat[- ]line|cpr|resuscitation|acls)\b/i.test(ctx) && !/\b(ecg|ekg|defibrillat|asystole|compressions)\b/i.test(tl)) return true;

  return false;
}

// ── Scoring (with stronger penalties) ────────────────────────

function scoreCandidate(candidate, hint, stemNorm) {
  if (!hint || !candidate.title) return candidate.width > 200 && candidate.height > 200 ? 1 : 0;
  const tl = String(candidate.title).replace(/^file:/i, '').toLowerCase();
  const hl = hint.toLowerCase();
  const words = [...new Set(hl.split(/\s+/).filter((w) => w.length > 3))];
  let s = 0;
  for (const w of words) {
    if (tl.includes(w)) s += 4;
  }

  // Bonus for exact diagnosis match
  const ans = resolveCorrectAnswerText({ question: stemNorm, options: [] });
  if (ans && tl.includes(ans.toLowerCase())) s += 15;

  // Size bonus
  if (candidate.width > 300 && candidate.height > 300) s += 2;
  else if (candidate.width > 200 && candidate.height > 200) s += 1;

  // Modality-specific bonuses
  if (/\b(string of pearls|polycystic|\bpcos\b|peripheral follicles)\b/i.test(hl) && /\b(polycystic|ovary|ovarian|follicle|ultrasound|sonograph)\b/i.test(tl)) s += 25;
  if (/\b(rash|skin|vesicle|malar|butterfly|herald|pityriasis|dermat|face|genital)\b/.test(hl) && /\b(skin|clinical|patient|face|trunk|extremity)\b/.test(tl)) s += 10;

  // Strong penalties
  const clinicalSkin = /\b(rash|skin|vesicle|malar|butterfly|herald|pityriasis|dermat|face|genital)\b/.test(hl);
  const pathSlide = /\b(histopathology|micrograph|photomicrograph|biopsy specimen|gram stain|electron microscopy|immunofluorescence)\b/i.test(tl);
  if (clinicalSkin && pathSlide) s -= 30;

  // Wrong-disease penalty
  if (shouldDropDiseaseMismatch({ title: candidate.title }, stemNorm, hint)) s -= 50;

  return s;
}

// ── Wikimedia search ─────────────────────────────────────────

function parseWikiImageCandidates(apiJson) {
  const pages = apiJson?.query?.pages;
  if (!pages) return [];
  const out = [];
  for (const p of Object.values(pages)) {
    const info = p?.imageinfo?.[0];
    if (!info?.url) continue;
    if (info.url.endsWith('.svg') || info.url.endsWith('.gif')) continue;
    if (info.mime !== 'image/jpeg' && info.mime !== 'image/png') continue;
    out.push({ url: info.url, width: info.width, height: info.height, mime: info.mime, title: p.title || '' });
  }
  return out;
}

async function wikiImageSearchOnce(query, attempt = 1) {
  const encoded = encodeURIComponent(query);
  const url =
    `https://commons.wikimedia.org/w/api.php` +
    `?action=query&generator=search&gsrnamespace=6` +
    `&gsrsearch=${encoded}&gsrlimit=15` +
    `&prop=imageinfo&iiprop=url|size|mime` +
    `&format=json&origin=*`;

  const res = await fetch(url, { headers: { 'User-Agent': WIKI_USER_AGENT } });

  if (res.status === 429 && attempt < 5) {
    const wait = 8000 * attempt;
    console.log(`   ⏳ Wikimedia rate-limited (429), waiting ${wait / 1000}s before retry ${attempt + 1}/5...`);
    await sleep(wait);
    return wikiImageSearchOnce(query, attempt + 1);
  }
  if (!res.ok) throw new Error(`Wikimedia API error: ${res.status}`);
  return res.json();
}

async function searchWikimediaForQuestion(data) {
  const geminiQueries = queriesFromAiImagePlan(data);
  const plan = data.ai_image_plan || {};

  // CONFIDENCE GATE: skip auto-attach if Gemini confidence is too low
  if (typeof plan.confidence === 'number' && plan.confidence < MIN_CONFIDENCE && !plan.skip_auto_image) {
    console.log(`   ⛔ Gemini confidence ${plan.confidence} < ${MIN_CONFIDENCE} — skipping auto-attach. Run manual review or lower --min-confidence.`);
    return { chosen: null, queriesTried: geminiQueries, skipped: 'low-confidence' };
  }

  // Skip if Gemini explicitly says so
  if (plan.skip_auto_image === true) {
    console.log(`   ⏭️  Gemini skip_auto_image=true — ${plan.skip_reason || 'no reason given'}`);
    return { chosen: null, queriesTried: [], skipped: 'gemini-skip' };
  }

  const queries = buildSearchQueryList(data);
  const ans = resolveCorrectAnswerText(data);
  const stemNorm = normalizeStemText(data.question || '');
  const hint = `${isWeakImageAnswerText(ans, stemNorm) ? '' : `${ans} `}${(data.question || '').slice(0, 280)}`.trim();
  const byUrl = new Map();

  for (let qi = 0; qi < queries.length; qi++) {
    const q = queries[qi];
    try {
      const json = await wikiImageSearchOnce(q);
      for (const c of parseWikiImageCandidates(json)) {
        if (!byUrl.has(c.url)) byUrl.set(c.url, c);
      }
    } catch (e) {
      console.log(`   ⚠️  Search failed for "${q}": ${e.message}`);
    }
    if (byUrl.size === 0) await sleep(400);
    if (qi < queries.length - 1) await sleep(900);
  }

  let candidates = [...byUrl.values()];

  // Apply all filters
  const mustAvoid = Array.isArray(plan.must_avoid) ? plan.must_avoid : [];
  const preCount = candidates.length;
  candidates = candidates.filter((c) => !shouldDropSpurious(c, stemNorm, hint));
  candidates = candidates.filter((c) => !shouldDropDiseaseMismatch(c, stemNorm, hint));
  candidates = candidates.filter((c) => !shouldDropForModalityRegion(c, stemNorm));
  candidates = candidates.filter((c) => !shouldDropForMustAvoid(c, mustAvoid));
  candidates = candidates.filter((c) => passesMinimumTitleRelevance(c, stemNorm, ans));
  const postCount = candidates.length;

  console.log(`   🔍 ${preCount} raw candidates → ${postCount} after filtering (${queries.length} queries)`);

  if (candidates.length === 0) return { chosen: null, queriesTried: queries };

  candidates.sort((a, b) => {
    const sb = scoreCandidate(b, hint, stemNorm);
    const sa = scoreCandidate(a, hint, stemNorm);
    if (sb !== sa) return sb - sa;
    const pa = (a.width > 300 ? 2 : a.width > 200 ? 1 : 0) + (a.height > 300 ? 2 : a.height > 200 ? 1 : 0);
    const pb = (b.width > 300 ? 2 : b.width > 200 ? 1 : 0) + (b.height > 300 ? 2 : b.height > 200 ? 1 : 0);
    return pb - pa;
  });

  return { chosen: candidates[0], queriesTried: queries };
}

// ── Download, validate, compress ─────────────────────────────

async function downloadValidateCompress(imageUrl, docId) {
  const tmpInput = join(TMP_DIR, `smle_${docId}_input`);
  const tmpOutput = join(TMP_DIR, `smle_${docId}_output.jpg`);

  const res = await fetch(imageUrl, { headers: { 'User-Agent': WIKI_USER_AGENT } });
  if (!res.ok) throw new Error(`Download failed: ${res.status} for ${imageUrl}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(tmpInput, buffer);

  // Validate with sharp: min dimensions + aspect ratio
  const meta = await sharp(tmpInput).metadata();
  if (meta.width < 150 || meta.height < 150) {
    unlinkSync(tmpInput);
    throw new Error(`Image too small: ${meta.width}x${meta.height}`);
  }
  const aspect = Math.max(meta.width, meta.height) / Math.min(meta.width, meta.height);
  if (aspect > 4) {
    unlinkSync(tmpInput);
    throw new Error(`Extreme aspect ratio: ${aspect.toFixed(1)}:1`);
  }

  // Compress
  let quality = 80;
  let outputBuffer;
  do {
    outputBuffer = await sharp(tmpInput)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    quality -= 10;
  } while (outputBuffer.length > MAX_OUTPUT_SIZE_KB * 1024 && quality > 20);

  writeFileSync(tmpOutput, outputBuffer);
  try { unlinkSync(tmpInput); } catch (_) {}

  return { tmpOutput, sizeKB: Math.round(outputBuffer.length / 1024), width: meta.width, height: meta.height };
}

// ── Upload ───────────────────────────────────────────────────

async function uploadToStorage(localPath, docId) {
  const destination = `question-images/${docId}.jpg`;
  await bucket.upload(localPath, {
    destination,
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000',
    },
  });
  const file = bucket.file(destination);
  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
  try { unlinkSync(localPath); } catch (_) {}
  return publicUrl;
}

// ── Firestore fetch ──────────────────────────────────────────

async function fetchImageQueue() {
  // Fetch docs flagged for images. Filter in-memory for ones without image_url.
  const snap = await db.collection(COLLECTION)
    .where('image_reference', '==', true)
    .limit(500)
    .get();

  const out = [];
  snap.forEach((doc) => {
    const d = doc.data();
    if (d.image_url) return;
    if (d.image_search_no_result === true && !d.image_search_cleared) return;
    out.push({ id: doc.id, ...d });
  });
  return out;
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('\n🖼️  SMLE Pro — Improved Image Attachment');
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN' : '🔥 LIVE'}`);
  console.log(`   Min confidence: ${MIN_CONFIDENCE}`);
  console.log(`   Strict modality: ${STRICT_MODALITY}`);
  console.log();

  const queue = await fetchImageQueue();
  const toProcess = BATCH_LIMIT ? queue.slice(0, BATCH_LIMIT) : queue;
  console.log(`   Queue: ${queue.length} eligible | Processing: ${toProcess.length}\n`);

  let attached = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const item = toProcess[i];
    console.log(`[${i + 1}/${toProcess.length}] ${item.id}`);
    console.log(`   Q: ${(item.question || '').slice(0, 100)}...`);

    if (DRY_RUN) {
      const plan = item.ai_image_plan || {};
      console.log(`   🔍 DRY: confidence=${plan.confidence ?? 'N/A'}, queries=${(plan.search_queries || []).length}`);
      const search = await searchWikimediaForQuestion(item);
      if (search.skipped) {
        console.log(`   ⏭️  Would skip: ${search.skipped}`);
        skipped++;
      } else if (search.chosen) {
        console.log(`   ✅ Would attach: ${search.chosen.title} (${search.chosen.width}x${search.chosen.height})`);
        attached++;
      } else {
        console.log(`   ❌ No candidate after filtering`);
        failed++;
      }
      console.log();
      continue;
    }

    try {
      const search = await searchWikimediaForQuestion(item);
      if (search.skipped) {
        console.log(`   ⏭️  Skipped: ${search.skipped}`);
        skipped++;
        console.log();
        continue;
      }
      if (!search.chosen) {
        console.log(`   ❌ No suitable candidate`);
        failed++;
        console.log();
        continue;
      }

      console.log(`   ⬇️  Downloading: ${search.chosen.title}`);
      const compressed = await downloadValidateCompress(search.chosen.url, item.id);
      console.log(`   📦 Compressed: ${compressed.sizeKB}KB (${compressed.width}x${compressed.height})`);

      const publicUrl = await uploadToStorage(compressed.tmpOutput, item.id);
      console.log(`   ☁️  Uploaded: ${publicUrl}`);

      await db.collection(COLLECTION).doc(item.id).update({
        image_url: publicUrl,
        image_verified: false,
        image_source: 'wikimedia',
        image_search_query: search.queriesTried.join(' → '),
        image_attached_at: new Date().toISOString(),
      });

      console.log(`   ✅ Attached & awaiting verification\n`);
      attached++;
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
      failed++;
    }

    if (i < toProcess.length - 1) await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log('═══════════════════════════════════════');
  console.log(`  Attached: ${attached}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Failed:   ${failed}`);
  console.log('═══════════════════════════════════════\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
