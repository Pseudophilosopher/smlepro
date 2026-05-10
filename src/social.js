/**
 * SMLE Pro - TikTok Challenge Hook Scene Exporter
 * 
 * Renders 5 distinct scenes for the Challenge Hook format:
 * 0: Hook (black screen, timer text)
 * 1: Question (quiz card with countdown)
 * 2: Answer (correct/wrong reveal + explanation)
 * 3: Stats (topic breakdown, analytics pitch)
 * 4: CTA (call-to-action with shake/zoom effects)
 * 
 * Each scene exports as a 1080×1920 PNG for manual CapCut assembly.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCBrsgmoXwY-DnjfZtvIZNsVJ4s45g2ON4",
  authDomain: "smlepro.web.app",
  projectId: "smle-mock-exam-51478532-5ae31",
  storageBucket: "smle-mock-exam-51478532-5ae31.firebasestorage.app",
  messagingSenderId: "89644897008",
  appId: "1:89644897008:web:8f0161f217a6c8c05e72f8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');

// --- Scene constants ---
const SCENES = [
  { id: 0, name: 'Hook',      label: '🎬 Hook',         time: '0:00', duration: '2s'  },
  { id: 1, name: 'Question',  label: '❓ Question',     time: '0:02', duration: '13s' },
  { id: 2, name: 'Answer',    label: '✅ Answer',       time: '0:15', duration: '2s'  },
  { id: 3, name: 'Stats',     label: '📊 Stats',        time: '0:17', duration: '3s'  },
  { id: 4, name: 'CTA',       label: '🔗 CTA',          time: '0:20', duration: '5s'  },
];

const CANVAS_W = 1080;
const CANVAS_H = 1920;

// --- DOM refs ---
const cardPreview = document.getElementById('card-preview');
const previewContainer = document.getElementById('preview-container');
const previewLabel = document.getElementById('scene-preview-label');
const optionsFields = document.getElementById('options-fields');
const fieldQuestion = document.getElementById('field-question');
const fieldQIndex = document.getElementById('field-q-index');
const fieldTopic = document.getElementById('field-topic');
const fieldImage = document.getElementById('field-image');
const fieldDbSource = document.getElementById('field-db-source');
const fieldDbPosition = document.getElementById('field-db-position');
const positionLabel = document.getElementById('position-label');
const topicLabel = document.getElementById('topic-label');
const dbStatus = document.getElementById('db-status');
const btnLoadQuestion = document.getElementById('btn-load-question');
const sceneExportStatus = document.getElementById('scene-export-status');

// Scene-specific fields
const fieldHookText = document.getElementById('scene-field-hook-text');
const fieldHookTimer = document.getElementById('scene-field-hook-timer');
const fieldCorrectOption = document.getElementById('scene-field-correct-option');
const fieldCorrectness = document.getElementById('scene-field-correctness');
const fieldExplanation = document.getElementById('scene-field-explanation');
const fieldSocialProof = document.getElementById('scene-field-social-proof');
const fieldTopicWeakness = document.getElementById('scene-field-topic-weakness');
const fieldAnalyticsText = document.getElementById('scene-field-analytics-text');
const fieldCtaHeadline = document.getElementById('scene-field-cta-headline');
const fieldCtaSubtext = document.getElementById('scene-field-cta-subtext');

const btnExportScene = document.getElementById('btn-export-scene');
const btnExportAll = document.getElementById('btn-export-all');

const OPTION_COUNT = 5;
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];
const OPTION_PLACEHOLDERS = [
  'Option A — correct answer',
  'Option B — wrong answer',
  'Option C — wrong answer',
  'Option D — wrong answer',
  'Option E — wrong answer'
];

let currentScene = 0;
let exportBusy = false;

// --- Logo SVG ---
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <defs>
    <radialGradient id="hg" cx="38%" cy="30%" r="68%" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="#FFE566"/>
      <stop offset="45%"  stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#8B6508"/>
    </radialGradient>
    <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <path d="M50 84 C49 84 9 61 9 36.5 C9 23.5 19.2 13 32 13 C39.6 13 46.5 16.9 50 22.9 C53.5 16.9 60.4 13 68 13 C80.8 13 91 23.5 91 36.5 C91 61 51 84 50 84Z" fill="url(#hg)" filter="url(#glow)"/>
  <circle cx="66" cy="30" r="16" fill="#0B1120" fill-opacity="0.82"/>
  <circle cx="66" cy="30" r="15.5" fill="none" stroke="#D4AF37" stroke-width="1.5"/>
  <rect x="63.5" y="23"   width="5" height="14" rx="2.5" fill="white"/>
  <rect x="59.5" y="27"   width="13" height="6"  rx="3"   fill="white"/>
</svg>`;

// Create option input fields
(function buildOptionFields() {
  for (let i = 0; i < OPTION_COUNT; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center gap-3';
    wrapper.innerHTML = `
      <span class="w-7 h-7 flex-shrink-0 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center text-xs font-bold text-primary">${OPTION_LABELS[i]}</span>
      <input data-opt="${i}" type="text" placeholder="${OPTION_PLACEHOLDERS[i]}" class="flex-1 rounded-lg bg-background-dark border border-border-dark px-3 py-2 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30">
    `;
    optionsFields.appendChild(wrapper);
  }
})();

// --- Event listeners ---
btnLoadQuestion.addEventListener('click', loadFromDatabase);

// Scene tab switching
document.querySelectorAll('.scene-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const scene = parseInt(btn.dataset.scene, 10);
    switchScene(scene);
  });
});

// Live preview update on any input change
document.querySelectorAll('input, textarea, select').forEach(el => {
  el.addEventListener('input', () => renderScenePreview(currentScene));
  el.addEventListener('change', () => renderScenePreview(currentScene));
});

btnExportScene.addEventListener('click', () => downloadScenePng(currentScene));
btnExportAll.addEventListener('click', downloadAllScenes);

// DB source toggle
fieldDbSource.addEventListener('change', () => {
  const isTopic = fieldDbSource.value === 'topic';
  positionLabel.classList.toggle('hidden', isTopic);
  topicLabel.classList.toggle('hidden', !isTopic);
  fieldDbPosition.max = isTopic ? '10' : '30';
  fieldDbPosition.value = '1';
});

// --- Scene switching ---
function switchScene(scene) {
  currentScene = scene;
  
  // Update tabs
  document.querySelectorAll('.scene-tab').forEach(b => {
    b.classList.remove('active', 'bg-primary', 'text-background-dark');
    b.classList.add('border', 'border-border-dark', 'text-slate-300');
  });
  const activeTab = document.querySelector(`.scene-tab[data-scene="${scene}"]`);
  if (activeTab) {
    activeTab.classList.add('active', 'bg-primary', 'text-background-dark');
    activeTab.classList.remove('border', 'border-border-dark', 'text-slate-300');
  }
  
  // Update scene fields
  document.querySelectorAll('.scene-fields').forEach(el => {
    el.classList.add('hidden');
  });
  const targetFields = document.querySelector(`.scene-fields[data-scene="${scene}"]`);
  if (targetFields) targetFields.classList.remove('hidden');
  
  // Update preview label
  const sceneInfo = SCENES[scene];
  if (previewLabel && sceneInfo) {
    previewLabel.textContent = `${sceneInfo.label} · ${sceneInfo.time}`;
  }
  
  // Render preview
  renderScenePreview(scene);
}

// --- Helpers ---
function esc(str) {
  // Escape user-supplied text for safe insertion into HTML body
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}

/**
 * Escape a full HTML document for use inside srcdoc="...".
 * Only quotes and & need escaping — < and > must stay intact so tags render.
 */
function escSrcdoc(str) {
  return String(str)
    .replace(/&/g, '&')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}

function getOptionInputs() {
  return Array.from(optionsFields.querySelectorAll('input[data-opt]')).map(el => el.value.trim());
}

function getOptionHtml(options) {
  const letters = ['A', 'B', 'C', 'D', 'E'];
  return options.map((text, i) => {
    const letter = letters[i] || '•';
    return `<div style="display:flex;align-items:flex-start;gap:14px;padding:20px;border-radius:14px;border:1.5px solid #234248;background:#101f22;margin-bottom:10px">
      <div style="width:42px;height:42px;flex-shrink:0;border-radius:10px;background:#1a2e32;border:1.5px solid #234248;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;color:#cbd5e1">${letter}</div>
      <div style="font-size:18px;color:#e2e8f0;flex:1;word-break:break-word;line-height:1.5;padding-top:8px">${esc(text)}</div>
    </div>`;
  }).join('');
}

function clampInt(val, min, max, fallback) {
  const n = parseInt(String(val), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function getRiyadhDateId() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());
}

function optionCellText(opt) {
  if (opt == null) return '';
  if (typeof opt === 'string') return opt;
  if (typeof opt.text === 'string') return opt.text;
  if (typeof opt.label === 'string') return opt.label;
  return '';
}

function fillFormFromQuestion(question, meta = {}) {
  if (!question) return;
  fieldTopic.value = meta.topicLabel || question.topic || 'Daily Dose';
  fieldQuestion.value = typeof question.question === 'string' ? question.question : '';
  fieldQIndex.value = String(meta.questionNumber || 1);

  const opts = Array.isArray(question.options) ? question.options : [];
  for (let i = 0; i < OPTION_COUNT; i++) {
    const input = optionsFields.querySelector(`input[data-opt="${i}"]`);
    if (!input) continue;
    input.value = optionCellText(opts[i] || null);
  }

  if (question.image_verified === true && typeof question.image_url === 'string') {
    fieldImage.value = question.image_url.trim();
  }

  renderScenePreview(currentScene);
}

async function ensureLoaderSession() {
  if (auth.currentUser) return auth.currentUser;
  try {
    await signInAnonymously(auth);
    return auth.currentUser;
  } catch (error) {
    throw new Error('Could not start guest session: ' + error.message);
  }
}

// --- Database Loading ---
async function loadFromDatabase() {
  if (btnLoadQuestion.disabled) return;
  btnLoadQuestion.disabled = true;

  try {
    await ensureLoaderSession();

    const source = fieldDbSource.value;
    const pos = clampInt(fieldDbPosition.value, 1, 30, 1);

    if (source === 'daily') {
      await loadDailyDoseQuestion();
    } else {
      await loadTopicQuestion(pos);
    }
  } catch (error) {
    dbStatus.innerHTML = `<span class="text-accent-red">❌ ${esc(error.message)}</span>`;
    console.error('Load error:', error);
  } finally {
    btnLoadQuestion.disabled = false;
  }
}

async function loadDailyDoseQuestion() {
  dbStatus.innerHTML = '<span class="text-slate-400">⏳ Loading from Daily Dose...</span>';

  const dateId = getRiyadhDateId();
  const docRef = doc(db, 'daily_doses', dateId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    dbStatus.innerHTML = '<span class="text-amber-400">⚠️ No Daily Dose for today yet</span>';
    return;
  }

  const data = snap.data();
  const questions = data.questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    dbStatus.innerHTML = '<span class="text-amber-400">⚠️ Daily Dose is empty</span>';
    return;
  }

  const pos = clampInt(fieldDbPosition.value, 1, questions.length, 1);
  const idx = Math.min(pos - 1, questions.length - 1);
  const question = questions[idx];

  fillFormFromQuestion(question, {
    topicLabel: data.theme || 'Daily Dose',
    questionNumber: idx + 1,
  });

  dbStatus.innerHTML = `<span class="text-emerald-400">✅ Loaded Q${idx + 1}/${questions.length} from Daily Dose</span>`;
}

async function loadTopicQuestion(pos) {
  const topic = fieldDbPosition.value.trim() || 'General';
  dbStatus.innerHTML = `<span class="text-slate-400">⏳ Loading from "${esc(topic)}"...</span>`;

  const qRef = collection(db, 'questions');
  const qSnap = await getDocs(query(qRef, orderBy('topic'), limit(50)));

  if (qSnap.empty) {
    dbStatus.innerHTML = '<span class="text-amber-400">⚠️ No questions found</span>';
    return;
  }

  const questions = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const idx = Math.min(pos - 1, questions.length - 1);
  const question = questions[idx];

  fillFormFromQuestion(question, { questionNumber: idx + 1 });
  dbStatus.innerHTML = `<span class="text-emerald-400">✅ Loaded Q${idx + 1}/${questions.length}</span>`;
}

// ===================================================================
// SCENE RENDERERS — Each returns an HTML string for a 1080×1920 frame
// ===================================================================

function renderScene0Hook() {
  const hookText = fieldHookText.value.trim() || 'SMLE Question. 60 seconds. Go.';
  const timerSec = clampInt(fieldHookTimer.value, 10, 120, 60);

  return `<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  .scene-root { 
    width: 1080px; height: 1920px; 
    background: #000; 
    font-family: 'Space Grotesk', 'Noto Sans Arabic', sans-serif;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .hook-text { 
    color: #fff; 
    font-size: 72px; 
    font-weight: 700; 
    text-align: center;
    line-height: 1.2;
    margin-bottom: 40px;
    letter-spacing: -0.5px;
  }
  .timer-display {
    font-size: 120px;
    font-weight: 700;
    color: #11b4d4;
    margin-bottom: 20px;
  }
  .timer-bar {
    width: 600px;
    height: 8px;
    background: #234248;
    border-radius: 9999px;
    overflow: hidden;
  }
  .timer-bar-fill {
    width: 100%;
    height: 100%;
    background: #11b4d4;
    border-radius: 9999px;
  }
  .unit-text {
    color: #64748b;
    font-size: 24px;
    margin-top: 16px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .logo-bottom {
    position: absolute;
    bottom: 80px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo-bottom span {
    color: #475569;
    font-size: 18px;
  }
</style>
<div class="scene-root">
  <div class="hook-text">${esc(hookText)}</div>
  <div class="timer-display">${timerSec}</div>
  <div class="timer-bar"><div class="timer-bar-fill"></div></div>
  <div class="unit-text">seconds remaining</div>
  <div class="logo-bottom">
    ${LOGO_SVG.replace('width="100%" height="100%"', 'width="24" height="24"')}
    <span>SMLE Pro</span>
  </div>
</div>`;
}

function renderScene1Question() {
  const question = fieldQuestion.value.trim() || 'Enter your SMLE question here';
  const options = getOptionInputs().filter(Boolean);
  const topic = fieldTopic.value.trim() || 'Daily Dose';
  const qNum = clampInt(fieldQIndex.value, 1, 999, 1);
  const imgUrl = fieldImage.value.trim();
  
  let imageHtml = '';
  if (imgUrl) {
    try { new URL(imgUrl); imageHtml = imgUrl; } catch (_) {}
  }

  const letters = ['A', 'B', 'C', 'D', 'E'];
  const optionsHtml = options.map((text, i) => {
    const letter = letters[i] || '•';
    return `
    <div class="option-wrapper p-4 rounded-xl border border-slate-200 dark:border-border-dark transition-all w-full min-w-0 max-w-full box-border cursor-pointer" data-option="${letter}">
      <div class="flex items-start min-w-0">
        <div class="option-letter size-8 flex-shrink-0 rounded-md bg-slate-200 dark:bg-background-dark/80 border border-slate-300 dark:border-border-dark flex items-center justify-center font-bold text-slate-700 dark:text-slate-200">${letter}</div>
        <p class="ms-4 min-w-0 flex-1 break-words text-slate-900 dark:text-slate-100 leading-snug text-base sm:text-lg">${esc(text)}</p>
      </div>
    </div>`;
  }).join('');

  const imgBlock = imageHtml
    ? `<div class="mb-4"><img src="${esc(imageHtml)}" alt="" class="w-full rounded-xl border border-border-dark" style="max-height:260px;object-fit:contain"></div>`
    : '';

  // MOBILE VIEW: Full-width single column — exactly what phone users see.
  // No sidebar, no grid columns. Matches quiz.js responsive behavior < lg breakpoint.
  return `
<div class="w-full px-4 pt-4 pb-8" style="width:1080px;height:1920px;background:#101f22;font-family:'Space Grotesk','Noto Sans Arabic',sans-serif;">
  <!-- Header: brand + timer (exact classes from quiz.js) -->
  <div class="flex justify-between items-center flex-wrap gap-4 mb-4">
    <h1 class="text-xl font-bold flex items-center gap-2 text-white">
      <img src="/logo.svg" alt="SMLE Pro" class="w-7 h-7 drop-shadow-[0_0_6px_rgba(212,175,55,0.5)]">
      <span style="color:#D4AF37">SMLE Pro</span> —
      <span class="text-primary">${esc(topic)}</span>
    </h1>
    <div class="flex items-center gap-2 sm:gap-4">
      <div class="flex items-center gap-2 text-primary font-bold">
        <span class="material-symbols-outlined">schedule</span>
        <span class="text-2xl font-bold">12:45</span>
      </div>
    </div>
  </div>

  <!-- Progress bar (exact classes from quiz.js) -->
  <div class="w-full bg-border-dark rounded-full h-2.5 mb-6">
    <div class="bg-primary h-2.5 rounded-full" style="width: ${Math.min(100, Math.round((qNum / 10) * 100))}%"></div>
  </div>

  <!-- Question card — mobile full-width, no sidebar (exact Tailwind from quiz.js) -->
  <div class="bg-white dark:bg-surface-dark p-6 sm:p-8 rounded-2xl shadow-depth border border-slate-200 dark:border-border-dark">
    <p class="text-lg font-semibold mb-6 text-slate-900 dark:text-white leading-relaxed break-words">${qNum}. ${esc(question)}</p>
    ${imgBlock}
    <div id="options-container" class="space-y-4 w-full">
      ${optionsHtml}
    </div>
  </div>
</div>`;
}

function renderScene2Answer() {
  const correctLabel = fieldCorrectOption.value || 'B';
  const isCorrect = fieldCorrectness.value === 'correct';
  const options = getOptionInputs().filter(Boolean);
  const explanation = fieldExplanation.value.trim() || 'Explanation text goes here';
  const topic = fieldTopic.value.trim() || 'Daily Dose';

  const letters = ['A', 'B', 'C', 'D', 'E'];
  // EXACT same Tailwind classes as quiz-feedback-dom.js
  const optionsHtml = options.map((text, i) => {
    const letter = letters[i] || '•';
    const isChoice = letter === correctLabel;

    if (isChoice && isCorrect) {
      // Green: correct answer selected — exact classes from quiz-feedback-dom.js
      return `
    <div class="option-wrapper p-4 rounded-xl transition-all w-full min-w-0 max-w-full box-border cursor-default pointer-events-none bg-green-500 border-green-600" data-option="${letter}">
      <div class="flex items-start min-w-0">
        <div class="option-letter size-8 flex-shrink-0 rounded-md bg-green-600 text-white border-transparent flex items-center justify-center font-bold">${letter}</div>
        <p class="ms-4 min-w-0 flex-1 break-words text-white leading-snug text-base sm:text-lg">${esc(text)}</p>
      </div>
      <div class="rationale-inject rationale-reveal mt-4 p-3 bg-green-600 text-green-50 rounded-lg text-sm border border-green-400">${esc(explanation)}</div>
    </div>`;
    } else if (isChoice && !isCorrect) {
      // Red: wrong answer selected — exact classes from quiz-feedback-dom.js
      return `
    <div class="option-wrapper p-4 rounded-xl transition-all w-full min-w-0 max-w-full box-border cursor-default pointer-events-none bg-red-500 border-red-600" data-option="${letter}">
      <div class="flex items-start min-w-0">
        <div class="option-letter size-8 flex-shrink-0 rounded-md bg-red-600 text-white border-transparent flex items-center justify-center font-bold">${letter}</div>
        <p class="ms-4 min-w-0 flex-1 break-words text-white leading-snug text-base sm:text-lg">${esc(text)}</p>
      </div>
      <div class="rationale-inject rationale-reveal mt-4 p-3 bg-red-600 text-red-50 rounded-lg text-sm border border-red-400">${esc(explanation)}</div>
    </div>`;
    } else {
      // Dimmed: unselected options — exact classes from quiz-feedback-dom.js
      return `
    <div class="option-wrapper p-4 rounded-xl transition-all w-full min-w-0 max-w-full box-border cursor-default pointer-events-none opacity-60 border-slate-100 dark:border-border-dark/40 bg-white dark:bg-surface-dark" data-option="${letter}">
      <div class="flex items-start min-w-0">
        <div class="option-letter size-8 flex-shrink-0 rounded-md bg-slate-200 dark:bg-background-dark/80 border border-slate-300 dark:border-border-dark flex items-center justify-center font-bold text-slate-700 dark:text-slate-200">${letter}</div>
        <p class="ms-4 min-w-0 flex-1 break-words text-slate-900 dark:text-slate-100 leading-snug text-base sm:text-lg">${esc(text)}</p>
      </div>
    </div>`;
    }
  }).join('');

  // MOBILE VIEW: Full-width single column — exactly what phone users see.
  return `
<div class="w-full px-4 pt-4 pb-8" style="width:1080px;height:1920px;background:#101f22;font-family:'Space Grotesk','Noto Sans Arabic',sans-serif;">
  <!-- Header: brand + timer (exact classes from quiz.js) -->
  <div class="flex justify-between items-center flex-wrap gap-4 mb-4">
    <h1 class="text-xl font-bold flex items-center gap-2 text-white">
      <img src="/logo.svg" alt="SMLE Pro" class="w-7 h-7 drop-shadow-[0_0_6px_rgba(212,175,55,0.5)]">
      <span style="color:#D4AF37">SMLE Pro</span> —
      <span class="text-primary">${esc(topic)}</span>
    </h1>
    <div class="flex items-center gap-2 sm:gap-4">
      <div class="flex items-center gap-2 text-primary font-bold">
        <span class="material-symbols-outlined">schedule</span>
        <span class="text-2xl font-bold">12:45</span>
      </div>
    </div>
  </div>

  <!-- Progress bar (exact classes from quiz.js) -->
  <div class="w-full bg-border-dark rounded-full h-2.5 mb-6">
    <div class="bg-primary h-2.5 rounded-full" style="width: 20%"></div>
  </div>

  <!-- Answer card with feedback — mobile full-width, no sidebar -->
  <div class="bg-white dark:bg-surface-dark p-6 sm:p-8 rounded-2xl shadow-depth border border-slate-200 dark:border-border-dark">
    <p class="text-lg font-semibold mb-6 text-slate-900 dark:text-white leading-relaxed break-words">${isCorrect ? '✅ Correct!' : '❌ Incorrect'}</p>
    <div id="options-container" class="space-y-4 w-full">
      ${optionsHtml}
    </div>
  </div>
</div>`;
}

function renderScene3Stats() {
  const weakness = fieldTopicWeakness.value.trim() || 'Endocrinology: Weak area';
  const analyticsText = fieldAnalyticsText.value.trim() || 'SMLE Pro tracks exactly where you\'re bleeding marks.';

  return `<style>
.s3{width:1080px;height:1920px;background:#0a0a0a;font-family:'Space Grotesk','Noto Sans Arabic',sans-serif;color:#e2e8f0;display:flex;flex-direction:column;padding:40px 36px;overflow:hidden}
.s3-hdr{font-size:32px;color:#94a3b8;margin-bottom:40px;flex-shrink:0;display:flex;align-items:center;gap:16px}
.s3-hdr-bar{flex:1;height:2px;background:#234248}
.s3-card{background:linear-gradient(135deg,#1a2e32,#101f22);border-radius:28px;border:1.5px solid #234248;padding:48px 40px;margin-bottom:24px;flex-shrink:0}
.s3-label{font-size:20px;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px}
.s3-val{font-size:40px;font-weight:700;color:#fff}
.s3-bar{width:100%;height:16px;background:#234248;border-radius:9999px;margin:16px 0 8px}
.s3-bar-fill{height:16px;background:linear-gradient(90deg,#ef4444,#f59e0b,#22c55e);border-radius:9999px;width:28%}
.s3-sub{font-size:18px;color:#94a3b8}
.s3-insight{background:#1a2e32;border-radius:20px;border:1.5px solid #11b4d4;padding:36px 32px;flex-shrink:0;margin-top:8px}
.s3-insight-icon{font-size:36px;margin-bottom:12px}
.s3-insight-text{font-size:28px;line-height:1.4;color:#cbd5e1}
.s3-chart{flex:1;display:flex;align-items:center;justify-content:center;margin-top:24px}
.s3-chart-inner{display:flex;align-items:flex-end;gap:20px;height:200px}
.s3-bar-item{display:flex;flex-direction:column;align-items:center;gap:8px}
.s3-bar-v{width:60px;border-radius:8px 8px 0 0}
.s3-bar-label{font-size:14px;color:#64748b}
</style>
<div class="s3">
  <div class="s3-hdr"><span>📊 Performance Analytics</span><span class="s3-hdr-bar"></span></div>
  <div class="s3-card">
    <div class="s3-label">Topic Performance</div>
    <div class="s3-val">${esc(weakness)}</div>
    <div class="s3-bar"><div class="s3-bar-fill"></div></div>
    <div class="s3-sub">28% mastery — needs improvement</div>
  </div>
  <div class="s3-insight">
    <div class="s3-insight-icon">🎯</div>
    <div class="s3-insight-text">${esc(analyticsText)}</div>
  </div>
  <div class="s3-chart">
    <div class="s3-chart-inner">
      <div class="s3-bar-item"><div class="s3-bar-v" style="height:140px;background:#11b4d4"></div><span class="s3-bar-label">You</span></div>
      <div class="s3-bar-item"><div class="s3-bar-v" style="height:80px;background:#234248"></div><span class="s3-bar-label">Avg.</span></div>
      <div class="s3-bar-item"><div class="s3-bar-v" style="height:180px;background:#D4AF37"></div><span class="s3-bar-label">Top</span></div>
    </div>
  </div>
</div>`;
}

function renderScene4Cta() {
  const headline = fieldCtaHeadline.value.trim() || 'First 30 questions FREE';
  const subtext = fieldCtaSubtext.value.trim() || 'smlepro.web.app';

  return `<style>
.s4{width:1080px;height:1920px;background:linear-gradient(180deg,#0a0a0a 0%,#101f22 50%,#0a0a0a 100%);font-family:'Space Grotesk','Noto Sans Arabic',sans-serif;color:#e2e8f0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px;overflow:hidden}
.s4-logo{margin-bottom:40px}
.s4-logo svg{width:80px;height:80px}
.s4-hl{font-size:64px;font-weight:700;text-align:center;line-height:1.2;margin-bottom:16px;background:linear-gradient(135deg,#11b4d4,#D4AF37);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.s4-sub{font-size:36px;color:#94a3b8;text-align:center;margin-bottom:60px;letter-spacing:1px}
.s4-btn{display:inline-flex;align-items:center;gap:16px;padding:24px 48px;background:#11b4d4;color:#0a0a0a;font-size:32px;font-weight:700;border-radius:60px;box-shadow:0 0 40px rgba(17,180,212,0.3);margin-bottom:40px}
.s4-feats{display:flex;flex-direction:column;gap:16px;margin-bottom:60px}
.s4-feat{display:flex;align-items:center;gap:16px;font-size:24px;color:#cbd5e1}
.s4-feat-icon{font-size:28px}
.s4-footer{display:flex;align-items:center;gap:12px;color:#475569;font-size:20px}
.s4-footer svg{width:28px;height:28px}
</style>
<div class="s4">
  <div class="s4-logo">${LOGO_SVG.replace('width="100%" height="100%"', 'width="80" height="80"')}</div>
  <div class="s4-hl">${esc(headline)}</div>
  <div class="s4-sub">${esc(subtext)}</div>
  <div class="s4-btn"><span>🚀</span><span>Try Free Now</span></div>
  <div class="s4-feats">
    <div class="s4-feat"><span class="s4-feat-icon">📱</span> 1000+ SMLE-style questions</div>
    <div class="s4-feat"><span class="s4-feat-icon">📊</span> Performance analytics</div>
    <div class="s4-feat"><span class="s4-feat-icon">⏱️</span> Real exam simulation</div>
  </div>
  <div class="s4-footer">
    ${LOGO_SVG.replace('width="100%" height="100%"', 'width="28" height="28"')}
    <span>SMLE Pro — Independent exam prep</span>
  </div>
</div>`;
}

// ===================================================================
// PREVIEW — Renders a scaled-down preview in the card-preview div
// Renders directly into main DOM (no iframe) so Tailwind CSS is available
// ===================================================================

const CAPTURE_CONTAINER_ID = 'capture-container';
const PREVIEW_SCALE = 0.26; // 1080 * 0.26 ≈ 280px wide

/**
 * Renders scene HTML into a target DOM element.
 * Returns the element so callers can manipulate it further.
 */
function renderSceneToElement(scene, targetEl) {
  let html;
  switch (scene) {
    case 0: html = renderScene0Hook(); break;
    case 1: html = renderScene1Question(); break;
    case 2: html = renderScene2Answer(); break;
    case 3: html = renderScene3Stats(); break;
    case 4: html = renderScene4Cta(); break;
    default: return null;
  }
  targetEl.innerHTML = html;
  return targetEl;
}

function renderScenePreview(scene) {
  const previewEl = document.getElementById('card-preview');
  if (!previewEl) return;

  const pw = Math.round(1080 * PREVIEW_SCALE);
  const ph = Math.round(1920 * PREVIEW_SCALE);

  // Create scaled wrapper with overflow hidden
  previewEl.innerHTML = `
    <div style="width:${pw}px;height:${ph}px;overflow:hidden;border-radius:12px;border:2px solid #234248;position:relative">
      <div class="preview-scene-content" style="width:1080px;height:1920px;transform:scale(${PREVIEW_SCALE});transform-origin:top left;overflow:hidden;background:#101f22;"></div>
    </div>
  `;

  // Render scene HTML into the inner content div
  const contentDiv = previewEl.querySelector('.preview-scene-content');
  if (contentDiv) {
    renderSceneToElement(scene, contentDiv);
  }
}

// ===================================================================
// EXPORT — Downloads scene as PNG via html2canvas
// ===================================================================

/**
 * Captures a scene by rendering into the hidden #capture-container div
 * in the main DOM (where Tailwind CSS is loaded), then using html2canvas
 * to capture the 1080×1920 container element.
 * 
 * KEY FIX: Main DOM has Tailwind CSS loaded. iframes do NOT.
 * All Tailwind classes (p-4, size-8, text-lg, etc.) will now render correctly.
 */
async function captureScene(scene) {
  const sceneName = SCENES[scene]?.name || `scene-${scene}`;
  
  // Find the hidden capture container in the main DOM
  const container = document.getElementById(CAPTURE_CONTAINER_ID);
  if (!container) {
    throw new Error('Capture container not found. Make sure #capture-container exists in the HTML.');
  }

  // Render scene into the container (main DOM = Tailwind available)
  renderSceneToElement(scene, container);

  // Wait for fonts and resources to settle
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    // Capture the container element at full 1080×1920
    // html2canvas works reliably on main-DOM elements
    const canvas = await window.html2canvas(container, {
      width: 1080,
      height: 1920,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#101f22',
      logging: false,
    });

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    return { blob, name: sceneName };
  } finally {
    // Clear container after capture to free memory
    container.innerHTML = '';
  }
}

async function downloadScenePng(scene) {
  if (exportBusy) return;
  
  const sceneName = SCENES[scene]?.name || `scene-${scene}`;
  const qNum = clampInt(fieldQIndex.value, 1, 999, 1);
  
  try {
    exportBusy = true;
    btnExportScene.disabled = true;
    sceneExportStatus.textContent = `⏳ Generating ${sceneName} scene...`;

    const { blob } = await captureScene(scene);
    
    // Trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smle-challenge-${sceneName.toLowerCase()}-q${qNum}.png`;
    a.click();
    URL.revokeObjectURL(url);

    sceneExportStatus.textContent = `✅ Downloaded: ${sceneName} scene!`;
  } catch (error) {
    sceneExportStatus.textContent = `❌ Export failed: ${error.message}. Refresh the page, make sure scene preview looks correct, and try again.`;
    console.error('Export error:', error);
  } finally {
    exportBusy = false;
    btnExportScene.disabled = false;
  }
}

/**
 * Fallback capture: renders HTML into a full-size iframe offscreen, then uses 
 * the browser's built-in image rendering via a second canvas approach.
 * This is more reliable across browsers than the SVG foreignObject approach.
 */
async function captureSceneFallback(scene) {
  let html;
  const sceneName = SCENES[scene]?.name || `scene-${scene}`;
  
  switch (scene) {
    case 0: html = renderScene0Hook(); break;
    case 1: html = renderScene1Question(); break;
    case 2: html = renderScene2Answer(); break;
    case 3: html = renderScene3Stats(); break;
    case 4: html = renderScene4Cta(); break;
    default: throw new Error('Invalid scene index');
  }

  // Create offscreen iframe
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1080px;height:1920px;border:none;z-index:-1;';
  document.body.appendChild(iframe);
  
  return new Promise((resolve, reject) => {
    iframe.onload = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();

        // Wait for fonts and images to load
        setTimeout(async () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = CANVAS_W;
            canvas.height = CANVAS_H;
            const ctx = canvas.getContext('2d');
            
            // Draw iframe content to canvas via html-to-image or manual rasterization
            // Use the iframe's body as the source
            const bodyEl = iframeDoc.body;
            
            // Serialize iframe body to SVG foreignObject blob
            const fbSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            fbSvg.setAttribute('width', CANVAS_W);
            fbSvg.setAttribute('height', CANVAS_H);
            
            // Use bodyEl.innerHTML directly (it's a live DOM node's HTML)
            const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="' + CANVAS_W + '" height="' + CANVAS_H + '">' +
              '<foreignObject width="' + CANVAS_W + '" height="' + CANVAS_H + '">' +
              '<div xmlns="http://www.w3.org/1999/xhtml">' +
              bodyEl.innerHTML +
              '</div></foreignObject></svg>';
            
            const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
            const fbImg = await createImageBitmap(svgBlob);
            ctx.drawImage(fbImg, 0, 0, CANVAS_W, CANVAS_H);
            canvas.toBlob(blob => {
              document.body.removeChild(iframe);
              resolve({ blob, name: sceneName });
            }, 'image/png');
          } catch (e) {
            document.body.removeChild(iframe);
            reject(e);
          }
        }, 500);
      } catch (e) {
        document.body.removeChild(iframe);
        reject(e);
      }
    };
    iframe.onerror = () => {
      document.body.removeChild(iframe);
      reject(new Error('Iframe load failed'));
    };
    iframe.src = 'about:blank';
  });
}

async function downloadAllScenes() {
  if (exportBusy) return;
  
  try {
    exportBusy = true;
    btnExportAll.disabled = true;
    sceneExportStatus.textContent = '⏳ Generating all 5 scenes...';

    for (let i = 0; i < 5; i++) {
      const sceneName = SCENES[i].name;
      sceneExportStatus.textContent = `⏳ Generating scene ${i + 1}/5: ${sceneName}...`;
      
      try {
        const { blob } = await captureScene(i);
        const qNum = clampInt(fieldQIndex.value, 1, 999, 1);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smle-challenge-${sceneName.toLowerCase()}-q${qNum}.png`;
        a.click();
        URL.revokeObjectURL(url);
        // Small delay between downloads
        await new Promise(r => setTimeout(r, 300));
      } catch (sceneError) {
        console.error(`Scene ${i} failed:`, sceneError);
        sceneExportStatus.textContent = `⚠️ Scene ${i + 1} (${sceneName}) failed: ${sceneError.message}. Trying fallback...`;
        try {
          const { blob } = await captureSceneFallback(i);
          const qNum = clampInt(fieldQIndex.value, 1, 999, 1);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `smle-challenge-${sceneName.toLowerCase()}-q${qNum}.png`;
          a.click();
          URL.revokeObjectURL(url);
        } catch (fallbackError) {
          sceneExportStatus.textContent = `❌ Scene ${i + 1} (${sceneName}) failed completely. Try manual screenshot.`;
        }
      }
    }

    sceneExportStatus.textContent = '✅ All 5 scenes downloaded! Import into CapCut and assemble.';
  } catch (error) {
    sceneExportStatus.textContent = `❌ Error: ${error.message}`;
    console.error('Batch export error:', error);
  } finally {
    exportBusy = false;
    btnExportAll.disabled = false;
  }
}

// --- Initial render ---
switchScene(0);

// Expose for debugging
window.__socialDebug = { renderScenePreview, renderScene0Hook, renderScene1Question, renderScene2Answer, renderScene3Stats, renderScene4Cta, captureScene, SCENES };
