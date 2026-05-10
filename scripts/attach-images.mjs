/**
 * attach-images.mjs
 *
 * Attaches Wikimedia Commons images to Firestore questions.
 * Uses a CONDITION MAPPER to find relevant medical images
 * even when the answer is just a lab value like "Low C3".
 *
 * Usage:
 *   node scripts/attach-images.mjs --dry-run --limit=10
 *   node scripts/attach-images.mjs --limit=50
 *   node scripts/attach-images.mjs --limit=5 --focus=ecg
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const saPath = resolve(__dirname, '..', 'firebase-service-account.json');
if (!existsSync(saPath)) { console.error('❌ firebase-service-account.json not found.'); process.exit(1); }
const sa = JSON.parse(readFileSync(saPath, 'utf8'));
initializeApp({
  credential: cert(sa),
  storageBucket: 'smle-mock-exam-51478532-5ae31.firebasestorage.app',
});
const db = getFirestore();
const bucket = getStorage().bucket();

const fetch = (await import('node-fetch')).default;
const sharp = (await import('sharp')).default;

// ── Config ──────────────────────────────────────────────────
const WIKI_UA = 'SMLE-Pro-ImageBot/1.3 (https://smlepro.web.app; educational)';
const MAX_SIZE_KB = 300;
const TMP_DIR = tmpdir();
const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
const LIMIT = (() => {
  const m = process.argv.join(' ').match(/--limit=(\d+)/);
  return m ? parseInt(m[1], 10) : null;
})();
const FOCUS = (() => {
  const m = process.argv.join(' ').match(/--focus=(\w+)/);
  return m ? m[1] : null;
})();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Condition → Image Query Mapper ──────────────────────────
// Maps clinical phrases to specific medical image queries.
// KEY PRINCIPLE: never use raw stem words like "coca-cola" as queries.
// Instead map clinical presentations to known medical image titles on Commons.
const CONDITION_MAP = [
  // Cardiology
  { rx: /\b(st elevation|myocardial infarct|stemi|heart attack)\b/i, q: ['ecg st elevation anterior wall myocardial infarction', 'ecg st elevation medical', 'electrocardiogram myocardial infarction'] },
  { rx: /\b(angina|chest pain.*exertion|unstable angina)\b/i, q: ['ecg angina medical', 'coronary angiography medical'] },
  { rx: /\b(atrial fibrillation|irregular.*irregular|afib)\b/i, q: ['ecg atrial fibrillation medical', 'electrocardiogram atrial fibrillation'] },

  // Pulmonary
  { rx: /\b(pneumonia|bronchopneumonia|consolidation|cough.*fever.*sputum)\b/i, q: ['chest x-ray pneumonia consolidation', 'chest radiograph pneumonia medical'] },
  { rx: /\b(pneumothorax|tracheal deviation|absent.*breath)\b/i, q: ['tension pneumothorax chest x-ray', 'chest x-ray pneumothorax medical'] },
  { rx: /\b(asthma|wheez|prolonged expiration)\b/i, q: ['asthma chest x-ray hyperinflation', 'pediatric asthma medical'] },
  { rx: /\b(pancreatitis)\b/i, q: ['acute pancreatitis ct scan', 'pancreatitis medical'] },

  // Renal
  { rx: /\b(glomerulonephrit|post.?strep|periorbital edema.*urine|colored urine|coca.cola.*urine)/i, q: ['post-streptococcal glomerulonephritis histology light microscopy', 'acute glomerulonephritis kidney pathology', 'glomerulonephritis medical kidney'] },
  { rx: /\b(nephrotic|proteinuria.*edema|minimal change)\b/i, q: ['nephrotic syndrome minimal change disease', 'nephrotic syndrome edema medical'] },

  // Infectious / Immunology
  { rx: /\b(anaphylax|bee.?sting|hives.*wheez|hypotension.*urticaria|hypotension.*allerg)/i, q: ['anaphylaxis skin rash urticaria medical', 'anaphylaxis medical emergency', 'epinephrine autoinjector medical'] },
  { rx: /\b(strep.?throat|pharyngitis|streptococcal|scarlet fever|penicillin.*10 days?|tonsillitis)/i, q: ['streptococcal pharyngitis tonsils medical', 'scarlet fever rash skin medical'] },
  { rx: /\b(rheumatic fever|jones criteria|migratory polyarthritis|sydenham chorea)/i, q: ['rheumatic fever medical', 'rheumatic heart disease echocardiogram medical'] },

  { rx: /\b(meningit|nuchal rigidity|kernig|brudzinski)\b/i, q: ['bacterial meningitis petechiae', 'meningitis rash medical', 'meningococcal meningitis skin'] },
  { rx: /\b(x.?linked agammaglobulinemia|bruton.*agammaglobulin|recurrent infection.*immunoglobulin)/i, q: ['x-linked agammaglobulinemia medical', 'immunodeficiency recurrent infection medical'] },
  { rx: /\b(abscess|peritonsillar|psoas)\b/i, q: ['abscess ultrasound medical', 'skin abscess medical'] },
  { rx: /\b(cellulitis|erysipelas)\b/i, q: ['cellulitis leg skin medical', 'erysipelas face medical'] },
  { rx: /\b(osteomyel)\b/i, q: ['osteomyelitis x-ray tibia', 'osteomyelitis medical'] },
  { rx: /\b(septic arthrit|hot.*swollen.*joint|septic joint)\b/i, q: ['septic arthritis knee medical', 'septic arthritis x-ray'] },

  // GI / Surgery
  { rx: /\b(appendicit|rlq pain|right lower quadrant)\b/i, q: ['acute appendicitis ct scan', 'appendicitis ultrasound medical'] },
  { rx: /\b(cirrhosis|ascites|esophageal varices|spider angioma)\b/i, q: ['liver cirrhosis ultrasound', 'cirrhosis ascites medical', 'esophageal varices endoscopy'] },
  { rx: /\b(cholecystit|gallbladder|murphy sign)\b/i, q: ['acute cholecystitis ultrasound', 'gallbladder stones ultrasound'] },
  { rx: /\b(hemorrhoid|rectal bleeding.*fresh)\b/i, q: ['hemorrhoids medical', 'internal hemorrhoids proctoscopy'] },
  { rx: /\b(intussusception|currant jelly)\b/i, q: ['intussusception ultrasound target sign', 'intussusception pediatric medical'] },
  { rx: /\b(pyloric stenosis|projectile vomiting|olive.*mass)\b/i, q: ['pyloric stenosis ultrasound', 'pyloric stenosis pediatric medical'] },

  // Endocrine
  { rx: /\b(diabetes.*keto|kussmaul|hyperglycemi|diabetic ketoacidosis)\b/i, q: ['diabetic ketoacidosis medical', 'diabetes mellitus complications medical'] },
  { rx: /\b(graves|hyperthyroid|exophthalmos|goiter|thyrotoxic)\b/i, q: ['graves disease ophthalmopathy', 'goiter thyroid medical', 'hyperthyroidism exophthalmos'] },

  // Hematology
  { rx: /\b(thalassemi|microcytic anemia.*target)\b/i, q: ['thalassemia peripheral blood smear', 'thalassemia major medical'] },
  { rx: /\bsickle\b/i, q: ['sickle cell anemia peripheral smear', 'sickle cell disease medical'] },

  // Ortho
  { rx: /\bfracture\b/i, q: ['x-ray fracture radius medical', 'x-ray fracture femur medical'] },
  { rx: /\b(ewing|osteosarcoma|bone.*tumor)\b/i, q: ['ewing sarcoma x-ray femur', 'osteosarcoma x-ray medical'] },
  { rx: /\b(giant cell tumor|bone.*giant cell)\b/i, q: ['giant cell tumor bone x-ray', 'giant cell tumor pathology'] },

  // Neuro
  { rx: /\b(stroke|cva|hemiparesis|facial droop|aphasia|hemiplegia)\b/i, q: ['brain ct scan ischemic stroke', 'ct brain hemorrhage medical', 'mri brain stroke'] },

  // Peds
  { rx: /\b(jaundice.*newborn|neonatal.*jaundice|kernicterus)\b/i, q: ['neonatal jaundice skin medical', 'newborn jaundice medical'] },
  { rx: /\b(wilms tumor|nephroblastoma)\b/i, q: ['wilms tumor ct scan', 'wilms tumor medical'] },
  { rx: /\b(neuroblastoma)\b/i, q: ['neuroblastoma ct scan', 'neuroblastoma pediatric medical'] },

  // Ophthal
  { rx: /\b(cataract|lens opacity|blurr.*vision.*gradual)\b/i, q: ['cataract eye medical', 'cataract slit lamp'] },
  { rx: /\b(glaucoma|optic disc.*cupping|increased.*iop)\b/i, q: ['glaucoma optic disc cupping', 'glaucoma fundus medical'] },

  // Vascular
  { rx: /\b(dvt|deep vein thrombos|unilateral.*leg.*swelling)\b/i, q: ['deep vein thrombosis ultrasound', 'dvt leg medical'] },
];

// ── Modality detection ──────────────────────────────────────
const HIGH_YIELD_QUERIES = {
  ecg: ['ecg normal sinus rhythm medical', 'ecg myocardial infarction medical', 'electrocardiogram medical'],
  xray: ['chest x-ray medical normal', 'chest radiograph medical'],
  ct: ['ct scan brain medical', 'computed tomography medical'],
  ultrasound: ['ultrasound abdomen medical', 'sonography medical'],
  ophthal: ['fundus photograph retina medical', 'fundoscopy medical'],
  histology: ['histopathology medical', 'microscopic pathology medical'],
  clinical_photo: ['skin rash medical clinical', 'dermatology skin medical'],
};

function getModality(stem) {
  const s = String(stem || '').toLowerCase();
  if (/\b(ecg|ekg|st elevation|st depression|qrs|t wave|arrhythm)\b/.test(s)) return 'ecg';
  if (/\b(x-?ray|cxr|chest x|radiograph)\b/.test(s)) return 'xray';
  if (/\b(ct |computed tomography)\b/.test(s)) return 'ct';
  if (/\b(mri|magnetic resonance)\b/.test(s)) return 'mri';
  if (/\b(ultrasound|sonograph|doppler)\b/.test(s)) return 'ultrasound';
  if (/\b(fundus|retina|papilledema|cataract|corneal|ophthalmoscop|slit lamp)\b/.test(s)) return 'ophthal';
  if (/\b(histolog|biopsy|microscop|gram stain|patholog)\b/.test(s)) return 'histology';
  if (/\b(rash|lesion|vesicle|ulcer|malar|butterfly|annular|dermato|herald patch)\b/.test(s)) return 'clinical_photo';
  return null;
}

// ── Image title filters ─────────────────────────────────────
const NON_MEDICAL_TITLE_RE =
  /\b(portrait|headshot|statue|biography|born \d{4}|died \d{4}|navy|safety car|pit crew|nascar|racing|racecar|poster|infographic|food|meal|dinner|lunch|breakfast|street|building|exterior|landmark|skyline|souvenir|toy|logo|icon|flag|map|location|signage|advertisement|graph|chart|personality|actor|singer|politician|writer|artist|museum|gallery|painting|sculpture|landscape|sunset|sunrise|fashion|model|jewelry|ornament|decoration|furniture|carpet|fabric|textile|ceramic|pottery|stamp|coin|banknote|currency|drawing by|photo of|photo from|festival|carnival|parade|wedding|birthday|party|celebration|commercial|sponsor|beauty|makeup|cosmetic|hairdo|hairstyle|beverage|soda|drink|coke|coca-cola|snack|lunchroom|cafeteria|coffee|teapot|cup of|mug of)\b/i;

const HAS_MEDICAL_KEYWORD =
  /\b(medical|clinical|anatomy|pathology|disease|syndrome|symptom|diagnosis|patient|lesion|rash|ulcer|tumor|cancer|fracture|infection|inflammation|hemorrhage|surgery|histology|radiology|ecg|ekg|ultrasound|radiograph|x-?ray|ct scan|mri|fundus|retina|dermatology|cardiology|pulmonary|renal|hepatic|neurology|pediatric|obstetric|gynecologic|wound|abscess|necrosis|edema|swelling|deformity|malformation|biopsy|specimen|slide|stain|microscop|endoscop|laparoscop|kidney|heart|liver|lung|brain|bone|skin|artery|vein|muscle|nerve|cell|tissue|organ)\b/i;

// ── Condition-aware query builder ───────────────────────────
function buildQueries(data) {
  const list = [];
  const stem = String(data.question || '');
  const answer = (() => {
    const opts = data.options || [];
    const c = opts.find((o) => o.correct);
    return c?.text || (typeof data.correctIndex === 'number' ? opts[data.correctIndex]?.text : '') || '';
  })();
  const modality = getModality(stem);
  const topic = (data.topic || data.scfhs_domain || '').toLowerCase();

  // STEP 1: Try condition mapper FIRST — highest success rate
  const seenQueries = new Set();
  for (const entry of CONDITION_MAP) {
    if (entry.rx.test(stem)) {
      for (const q of entry.q) {
        const k = q.toLowerCase().trim();
        if (!seenQueries.has(k) && list.length < 5) {
          seenQueries.add(k);
          list.push(k);
        }
      }
    }
  }

  // STEP 2: If answer is a real disease name (not lab value), use it
  const cleanAnswer = answer.replace(/[\(\[].*?[\)\]]/g, '').trim();
  const isLabValue = /^(low|high|normal|elevated|decreased|increased|positive|negative|absent|present)\b/i.test(cleanAnswer);
  const isShort = cleanAnswer.length <= 3;
  if (!isLabValue && !isShort && cleanAnswer.length < 100) {
    if (list.length < 4) list.push(cleanAnswer);
    if (list.length < 5) list.push(cleanAnswer + ' medical');
  }

  // STEP 3: Modality-specific (only if no condition matched yet)
  if (!list.length && modality && HIGH_YIELD_QUERIES[modality]) {
    for (const q of HIGH_YIELD_QUERIES[modality]) {
      if (list.length < 6) list.push(q);
    }
  }

  // STEP 4: Topic fallback (only if we have nothing)
  if (list.length < 2 && topic) {
    list.push(topic.split(/\s+/).slice(0, 2).join(' ') + ' disease medical');
  }

  // Clean and dedup
  return [
    ...new Set(
      list
        .map((q) => q.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
    ),
  ].slice(0, 6);
}

// ── Wikimedia API ───────────────────────────────────────────
async function searchWiki(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=15&prop=imageinfo&iiprop=url|size|mime&format=json&origin=*`;
  const res = await fetch(url, { headers: { 'User-Agent': WIKI_UA } });
  if (res.status === 429) { await sleep(8000); return searchWiki(query); }
  if (!res.ok) return [];
  const json = await res.json();
  const pages = json?.query?.pages || {};
  const out = [];
  for (const p of Object.values(pages)) {
    const info = p?.imageinfo?.[0];
    if (!info?.url) continue;
    if (info.url.endsWith('.svg') || info.url.endsWith('.gif')) continue;
    if (info.mime !== 'image/jpeg' && info.mime !== 'image/png') continue;
    if (info.width < 200 || info.height < 200) continue;
    out.push({ url: info.url, width: info.width, height: info.height, mime: info.mime, title: p.title || '' });
  }
  return out;
}

function filterBadCandidates(candidates, queries) {
  const allWords = queries.join(' ').toLowerCase().split(/\s+/).filter((w) => w.length > 3 && w !== 'medical' && w !== 'clinical');
  return candidates.filter((c) => {
    const tl = (c.title || '').toLowerCase();
    if (NON_MEDICAL_TITLE_RE.test(tl)) return false;
    const hasMedicalKeyword = HAS_MEDICAL_KEYWORD.test(tl);
    const specificMatches = allWords.filter((w) => tl.includes(w));
    if (specificMatches.length === 0 && !hasMedicalKeyword) return false;
    return true;
  });
}

function scoreCandidate(cand, queries) {
  const tl = (cand.title || '').toLowerCase().replace(/^file:/, '');
  const allWords = queries.join(' ').toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  let score = 0;
  for (const w of allWords) {
    if (tl.includes(w)) score += 8;
  }
  if (cand.width >= 400 && cand.height >= 400) score += 3;
  else if (cand.width >= 300 && cand.height >= 300) score += 1;
  if (cand.mime === 'image/jpeg') score += 1;
  return score;
}

// ── Download, compress, upload ───────────────────────────────
async function downloadValidateCompress(url, docId) {
  const input = join(TMP_DIR, `smle_${docId}_in`);
  const output = join(TMP_DIR, `smle_${docId}_out.jpg`);
  const res = await fetch(url, { headers: { 'User-Agent': WIKI_UA } });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(input, buffer);
  const meta = await sharp(input).metadata();
  if (meta.width < 150 || meta.height < 150) { unlinkSync(input); throw new Error(`Too small: ${meta.width}x${meta.height}`); }
  let quality = 80, outBuf;
  do {
    outBuf = await sharp(input).resize({ width: 800, withoutEnlargement: true }).jpeg({ quality, mozjpeg: true }).toBuffer();
    quality -= 10;
  } while (outBuf.length > MAX_SIZE_KB * 1024 && quality > 20);
  writeFileSync(output, outBuf);
  try { unlinkSync(input); } catch (_) {}
  return { path: output, sizeKB: Math.round(outBuf.length / 1024), width: meta.width, height: meta.height };
}

async function uploadToStorage(localPath, docId) {
  const dest = `question-images/${docId}.jpg`;
  await bucket.upload(localPath, { destination: dest, metadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' } });
  await bucket.file(dest).makePublic();
  const url = `https://storage.googleapis.com/${bucket.name}/${dest}`;
  try { unlinkSync(localPath); } catch (_) {}
  return url;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('🖼️  SMLE Pro — Image Attachment');
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN' : '🔥 LIVE'}`);
  console.log(`   Limit: ${LIMIT || 'all eligible'}`);
  if (FOCUS) console.log(`   Focus: ${FOCUS}`);
  console.log('═'.repeat(60));

  const q = db.collection('questions').where('image_reference', '==', true);
  const focusMap = {
    ecg: ['ecg', 'ekg'],
    xray: ['x-?ray', 'cxr', 'radiograph'],
    ct: ['ct '],
    ultrasound: ['ultrasound', 'sonograph'],
    ophthal: ['fundus', 'retina', 'ophthal', 'cataract'],
    histology: ['histolog', 'biopsy', 'patholog'],
    clinical: ['rash', 'lesion', 'skin', 'dermato'],
  };

  const snap = await q.get();
  const all = [];
  snap.forEach((doc) => {
    const d = doc.data();
    if (d.image_url) return;
    if (d.image_search_no_result && !d.image_search_cleared) return;
    if (FOCUS && focusMap[FOCUS]) {
      if (!focusMap[FOCUS].some((p) => new RegExp(p).test(d.question || ''))) return;
    }
    all.push({ ref: doc.ref, id: doc.id, ...d });
  });

  const toProcess = LIMIT ? all.slice(0, LIMIT) : all;
  console.log(`   Queue: ${all.length} eligible | Processing: ${toProcess.length}\n`);

  let attached = 0, failed = 0, noResult = 0;
  for (let i = 0; i < toProcess.length; i++) {
    const item = toProcess[i];
    const queries = buildQueries(item);
    const stem = (item.question || '').replace(/\s+/g, ' ').trim();

    console.log(`[${i + 1}/${toProcess.length}] ${item.id.slice(0, 50)}`);
    console.log(`   Q: ${stem.slice(0, 100)}…`);
    console.log(`   🔍 Queries: ${queries.slice(0, 3).join(' | ')}`);

    let candidates = [];
    for (const query of queries) {
      try {
        candidates.push(...(await searchWiki(query)));
        if (candidates.length > 0) break;
        await sleep(500);
      } catch (_) {}
    }

    const seen = new Set();
    candidates = candidates.filter((c) => { const k = c.url; if (seen.has(k)) return false; seen.add(k); return true; });
    const filtered = filterBadCandidates(candidates, queries);
    const scored = filtered.map((c) => ({ ...c, score: scoreCandidate(c, queries) })).sort((a, b) => b.score - a.score);
    const best = scored[0];

    if (!best) {
      console.log(`   ❌ No medical image found (${queries.length} queries)`);
      noResult++;
      if (!DRY_RUN) await item.ref?.update({ image_search_no_result: true, image_search_queries: queries.slice(0, 3) }).catch(() => {});
      console.log();
      continue;
    }

    console.log(`   🔍 Best: ${(best.title || '?').slice(0, 70)} (${best.width}x${best.height}, score ${best.score})`);

    if (DRY_RUN) { attached++; console.log(); await sleep(300); continue; }

    try {
      const { path, sizeKB, width, height } = await downloadValidateCompress(best.url, item.id);
      const url = await uploadToStorage(path, item.id);
      await db.collection('questions').doc(item.id).update({
        image_url: url, image_source: best.url, image_title: best.title,
        image_width: width, image_height: height, image_size_kb: sizeKB, image_attached_at: new Date().toISOString(),
        image_verified: false, // Flag for admin verification queue
      });
      console.log(`   ✅ Attached: ${url.slice(0, 80)}… (${sizeKB}KB, ${width}x${height})`);
      attached++;
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      failed++;
    }
    console.log();
    await sleep(1000);
  }

  console.log('═'.repeat(60));
  console.log(`  ✅ Attached: ${attached}`);
  console.log(`  ❌ Failed:   ${failed}`);
  console.log(`  🔍 No img:   ${noResult}`);
  console.log('═'.repeat(60) + '\n');
}

main().catch((err) => { console.error('❌ Fatal:', err); process.exit(1); });
