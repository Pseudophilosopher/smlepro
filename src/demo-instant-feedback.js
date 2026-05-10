/**
 * Standalone “instant feedback” recording helper — same DOM/classes as the live quiz.
 * Works on phone (safe areas, large taps, clean-mode Replay FAB) and desktop (Space).
 */
import { applyInstantFeedbackToDom } from './quiz-feedback-dom.js';

/** Sample MCQ (replace copy anytime). Rationales may include simple <strong> etc. like production. */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Rotating presets for recording — each has exactly one `correct: true` option (always A) so “Wrong B” stays valid. */
const DEMO_QUESTIONS = [
    {
        id: 'demo-recording-1',
        question:
            'A 62-year-old with hypertension presents with sudden severe headache and neck stiffness. CT shows no bleed. Next best step?',
        rationale: '',
        options: [
            {
                text: 'Lumbar puncture after imaging if indicated',
                correct: true,
                rationale:
                    '<strong>Correct.</strong> Thunderclap headache with meningismus warrants ruling out SAH; if CT negative, many algorithms proceed to LP when clinical suspicion remains high.',
            },
            {
                text: 'Discharge home with analgesics and primary care follow-up in 48 hours',
                correct: false,
                rationale:
                    '<strong>Why this is risky.</strong> Red-flag headache needs urgent evaluation for SAH and other emergencies — outpatient deferral can miss time-sensitive pathology.',
            },
            {
                text: 'Start empiric antibiotics for meningitis without further workup',
                correct: false,
                rationale:
                    'Antibiotics may be appropriate after evaluation, but jumping to treatment without a coherent diagnostic plan (and often imaging/LP context) is not the best <em>next</em> step alone.',
            },
            {
                text: 'MRI brain only, no LP',
                correct: false,
                rationale:
                    'MRI has a role in some pathways, but it is not universally the immediate substitute for LP when SAH is suspected and CT is negative — follow your institutional algorithm.',
            },
        ],
    },
    {
        id: 'demo-recording-2',
        question:
            'A 19-year-old with type 1 diabetes has glucose 320 mg/dL and moderate urine ketones before dinner. They are alert and tolerating fluids. Besides correction insulin, what is most important in the next hours?',
        rationale: '',
        options: [
            {
                text: 'Hydration, ketone checks, and sick-day management with close follow-up; escalate if vomiting or altered mentation',
                correct: true,
                rationale:
                    '<strong>Correct.</strong> Alert patients with ketosis need aggressive hydration, insulin, and monitoring for evolving DKA — with clear escalation thresholds.',
            },
            {
                text: 'Hold basal insulin until ketones clear',
                correct: false,
                rationale:
                    '<strong>Incorrect.</strong> Withholding insulin worsens ketogenesis; insulin is central to reversing ketosis alongside fluids and electrolytes.',
            },
            {
                text: 'Discharge with oral fluids and clinic follow-up in one week',
                correct: false,
                rationale:
                    'Moderate ketones with hyperglycemia warrants active management and reassessment, not routine delayed outpatient follow-up.',
            },
            {
                text: 'Start empiric broad-spectrum IV antibiotics only',
                correct: false,
                rationale:
                    'Antibiotics are not the primary intervention for uncomplicated diabetic ketosis without a separate infectious source.',
            },
        ],
    },
    {
        id: 'demo-recording-3',
        question:
            'A 5-day-old breastfed infant has poor feeding and jaundice extending to the lower legs. Bilirubin is pending. While awaiting results, what is the highest-yield immediate concern to keep in mind?',
        rationale: '',
        options: [
            {
                text: 'Rule out sepsis / serious bacterial infection as part of the workup for a young infant with feeding difficulty',
                correct: true,
                rationale:
                    '<strong>Correct.</strong> Neonates with poor feeding and progressive jaundice need a broad differential that includes infection; local protocols guide labs and management.',
            },
            {
                text: 'Assume physiologic jaundice and schedule routine follow-up in 2 weeks',
                correct: false,
                rationale:
                    'Early jaundice with feeding problems in a 5-day-old is not automatically “physiologic” without assessment.',
            },
            {
                text: 'Stop breastfeeding until bilirubin normalizes',
                correct: false,
                rationale:
                    'Breastfeeding support and evaluation of causes of jaundice are preferred over blanket cessation unless specifically indicated.',
            },
            {
                text: 'Phototherapy at home without physician evaluation',
                correct: false,
                rationale:
                    'Treatment thresholds and setting depend on age, gestation, levels, and risk factors — guided by your service’s pathway.',
            },
        ],
    },
];

let demoQuestionIndex = 0;

function currentDemoQuestion() {
    return DEMO_QUESTIONS[demoQuestionIndex];
}

function updateChangeQuestionLabel() {
    const label = document.getElementById('btn-change-question-label');
    if (!label) return;
    const n = demoQuestionIndex + 1;
    const t = DEMO_QUESTIONS.length;
    label.textContent = `Change (${n}/${t})`;
}

function readUrlParams() {
    const u = new URL(window.location.href);
    const w = parseInt(u.searchParams.get('wait') || '4', 10);
    const wrong = (u.searchParams.get('wrong') || 'B').toUpperCase().charAt(0);
    return {
        waitSec: Number.isFinite(w) ? Math.min(30, Math.max(1, w)) : 4,
        wrongLetter: wrong >= 'A' && wrong <= 'Z' ? wrong : 'B',
        clean: u.searchParams.get('clean') === '1',
        manual: u.searchParams.get('manual') === '1',
        nocursor: u.searchParams.get('nocursor') === '1',
    };
}

function optionsHtmlUnanswered() {
    return currentDemoQuestion().options
        .map((option, i) => {
            const optionId = String.fromCharCode(65 + i);
            return `
            <div class="option-wrapper touch-manipulation p-4 rounded-xl border border-slate-200 dark:border-border-dark cursor-pointer hover:bg-primary/10 hover:border-primary active:bg-primary/15 transition-all" data-option="${optionId}">
                <div class="flex items-center">
                    <div class="option-letter size-8 flex-shrink-0 rounded-md bg-slate-200 dark:bg-background-dark/80 border border-slate-300 dark:border-border-dark flex items-center justify-center font-bold text-slate-700 dark:text-slate-200">${optionId}</div>
                    <p class="ml-4 text-slate-900 dark:text-slate-100 leading-snug">${escapeHtml(option.text)}</p>
                </div>
            </div>`;
        })
        .join('');
}

function renderShell(root, { progressPct = 10 } = {}) {
    root.innerHTML = `
<div id="demo-stage" class="relative isolate w-full max-w-full">
  <div class="w-full max-w-full overflow-x-hidden px-3 pt-6 pb-40 sm:px-4 sm:pt-8 sm:pb-28 space-y-6 sm:space-y-8 text-left text-slate-200">
    <div class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center sm:gap-4">
      <h1 class="text-base font-bold leading-snug sm:text-xl flex flex-wrap items-center gap-2">
        <img src="/logo.svg" alt="SMLE Pro" class="w-7 h-7 shrink-0 drop-shadow-[0_0_6px_rgba(212,175,55,0.5)]" width="28" height="28" />
        <span style="color:#D4AF37">SMLE Pro</span>
      </h1>
      <div class="flex items-center gap-2 text-primary font-bold text-sm sm:text-base shrink-0">
        <span class="material-symbols-outlined text-[22px]">schedule</span>
        <span>00:00:00</span>
      </div>
    </div>

    <div class="w-full bg-slate-200 dark:bg-border-dark rounded-full h-2.5">
      <div class="bg-primary h-2.5 rounded-full" style="width: ${progressPct}%"></div>
    </div>

    <div class="bg-white dark:bg-surface-dark p-5 sm:p-8 rounded-2xl shadow-depth border border-slate-200 dark:border-border-dark">
      <p class="text-base sm:text-lg font-semibold mb-5 sm:mb-6 text-slate-900 dark:text-white leading-relaxed">1. ${escapeHtml(currentDemoQuestion().question)}</p>
      <div id="options-container" class="space-y-3 sm:space-y-4">
        ${optionsHtmlUnanswered()}
      </div>
    </div>
  </div>

  <div id="demo-fake-cursor" class="pointer-events-none absolute left-0 top-0 z-[60] opacity-0 transition-opacity duration-200" aria-hidden="true">
    <div id="demo-fake-cursor-inner" class="will-change-transform">
      <span id="demo-fake-cursor-icon" class="material-symbols-outlined block text-[46px] sm:text-[42px] leading-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]" style="transform: rotate(-12deg);">near_me</span>
    </div>
  </div>
</div>`;
}

/**
 * Auto mode only: pointer glides from the stem to the option, tap, then `onDone` (apply feedback).
 */
function runFakeCursorClick(stage, optionLetter, onDone) {
    if (!stage || typeof onDone !== 'function') return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduceMotion) {
        onDone();
        return;
    }

    const opt = stage.querySelector(`#options-container .option-wrapper[data-option="${optionLetter}"]`);
    const inner = document.getElementById('demo-fake-cursor-inner');
    const wrap = document.getElementById('demo-fake-cursor');
    const icon = document.getElementById('demo-fake-cursor-icon');
    if (!opt || !inner || !wrap) {
        onDone();
        return;
    }

    const stageRect = stage.getBoundingClientRect();
    const optRect = opt.getBoundingClientRect();
    const stem = stage.querySelector('.rounded-2xl.shadow-depth > p');
    const stemRect = stem ? stem.getBoundingClientRect() : optRect;

    const narrow = stageRect.width < 520;
    const endX = optRect.left + optRect.width * (narrow ? 0.34 : 0.22) - stageRect.left;
    const endY = optRect.top + optRect.height * 0.5 - stageRect.top;
    let startX = stemRect.right - stageRect.left - (narrow ? 28 : 48);
    let startY = stemRect.bottom - stageRect.top + (narrow ? 16 : 24);
    if (Number.isFinite(startX) && startX < 10) startX = stemRect.left - stageRect.left + 12;
    if (Number.isFinite(startY) && startY < 10) startY = 12;

    inner.style.transition = 'none';
    inner.style.transform = `translate(${startX}px, ${startY}px)`;
    wrap.classList.remove('opacity-0');

    const finish = () => {
        if (icon) {
            icon.classList.add('demo-fake-cursor-tap');
            window.setTimeout(() => {
                icon.classList.remove('demo-fake-cursor-tap');
                wrap.classList.add('opacity-0');
                window.setTimeout(() => {
                    onDone();
                    window.setTimeout(() => {
                        inner.style.transition = 'none';
                        inner.style.transform = 'translate(0px, 0px)';
                    }, 200);
                }, 90);
            }, 145);
        } else {
            wrap.classList.add('opacity-0');
            onDone();
        }
    };

    const fallbackMs = 1200;
    let settled = false;
    const armFallback = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        inner.removeEventListener('transitionend', onMoveEnd);
        finish();
    }, fallbackMs);

    const onMoveEnd = (e) => {
        if (e.propertyName !== 'transform') return;
        if (settled) return;
        settled = true;
        window.clearTimeout(armFallback);
        inner.removeEventListener('transitionend', onMoveEnd);
        finish();
    };

    inner.addEventListener('transitionend', onMoveEnd);
    void inner.offsetWidth;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            inner.style.transition = `transform ${narrow ? 0.65 : 0.58}s cubic-bezier(0.22, 1, 0.36, 1)`;
            inner.style.transform = `translate(${endX}px, ${endY}px)`;
        });
    });
}

let playTimer = null;

function clearPlayTimer() {
    if (playTimer) {
        clearTimeout(playTimer);
        playTimer = null;
    }
}

function bindManualClicks() {
    const container = document.getElementById('options-container');
    const fc = document.getElementById('chk-fake-cursor');
    if (fc) fc.disabled = true;
    if (!container) return;

    container.querySelectorAll('.option-wrapper').forEach((el) => {
        el.addEventListener('click', onOptionClick);
    });
}

function onOptionClick(e) {
    const wrap = e.target.closest('.option-wrapper');
    if (!wrap || wrap.classList.contains('pointer-events-none')) return;
    const id = wrap.dataset.option;
    const container = document.getElementById('options-container');
    if (!container) return;
    applyInstantFeedbackToDom(container, currentDemoQuestion(), id);
}

function syncControlsFromState() {
    const { waitSec, wrongLetter, clean, manual, nocursor } = readUrlParams();
    const controls = document.getElementById('demo-controls');
    if (controls) controls.style.display = clean ? 'none' : '';

    const wInp = document.getElementById('inp-wait');
    const wrongSel = document.getElementById('inp-wrong');
    const man = document.getElementById('chk-manual');
    const fakePtr = document.getElementById('chk-fake-cursor');
    const fab = document.getElementById('demo-fab-restart');
    if (wInp) wInp.value = String(waitSec);
    if (wrongSel) wrongSel.value = wrongLetter;
    if (man) man.checked = manual;
    if (fakePtr) fakePtr.checked = !nocursor;
    if (fab) {
        if (clean) {
            fab.classList.remove('hidden');
            fab.classList.add('inline-flex');
            fab.setAttribute('aria-hidden', 'false');
        } else {
            fab.classList.add('hidden');
            fab.classList.remove('inline-flex');
            fab.setAttribute('aria-hidden', 'true');
        }
    }
}

function getControlsFromForm() {
    const wInp = document.getElementById('inp-wait');
    const wrongSel = document.getElementById('inp-wrong');
    const man = document.getElementById('chk-manual');
    const fakePtr = document.getElementById('chk-fake-cursor');
    const w = parseInt(wInp?.value || '4', 10);
    return {
        waitSec: Number.isFinite(w) ? Math.min(30, Math.max(1, w)) : 4,
        wrongLetter: wrongSel?.value || 'B',
        manual: !!man?.checked,
        fakeCursor: fakePtr ? !!fakePtr.checked : true,
    };
}

export function startPlay() {
    clearPlayTimer();
    const root = document.getElementById('demo-root');
    if (!root) return;

    const { waitSec, wrongLetter, manual, fakeCursor } = getControlsFromForm();

    renderShell(root, { progressPct: 10 });
    const container = document.getElementById('options-container');
    const stage = document.getElementById('demo-stage');
    const fc = document.getElementById('chk-fake-cursor');
    if (fc) fc.disabled = manual;

    if (manual) {
        bindManualClicks();
        return;
    }

    const correctIdx = currentDemoQuestion().options.findIndex((o) => o.correct);
    const wrongIdx = Math.max(0, wrongLetter.charCodeAt(0) - 65);
    const pickWrong = wrongIdx !== correctIdx ? wrongLetter : 'B';

    playTimer = setTimeout(() => {
        const apply = () => {
            applyInstantFeedbackToDom(container, currentDemoQuestion(), pickWrong);
            playTimer = null;
        };
        if (fakeCursor) {
            runFakeCursorClick(stage, pickWrong, apply);
        } else {
            apply();
        }
    }, waitSec * 1000);
}

function showInitialFrame() {
    const root = document.getElementById('demo-root');
    if (!root) return;
    renderShell(root, { progressPct: 10 });
    const { manual } = readUrlParams();
    if (manual) {
        bindManualClicks();
    } else {
        const fc = document.getElementById('chk-fake-cursor');
        if (fc) fc.disabled = false;
    }
}

function changeDemoQuestion() {
    clearPlayTimer();
    demoQuestionIndex = (demoQuestionIndex + 1) % DEMO_QUESTIONS.length;
    window.scrollTo(0, 0);
    showInitialFrame();
    updateChangeQuestionLabel();
}

function init() {
    syncControlsFromState();
    showInitialFrame();
    updateChangeQuestionLabel();

    const restart = () => {
        clearPlayTimer();
        startPlay();
    };
    document.getElementById('btn-play')?.addEventListener('click', restart);
    document.getElementById('demo-fab-restart')?.addEventListener('click', restart);
    document.getElementById('btn-change-question')?.addEventListener('click', changeDemoQuestion);

    window.addEventListener('keydown', (e) => {
        if (e.code !== 'Space') return;
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.tagName === 'OPTION')) return;
        e.preventDefault();
        restart();
    });

    const u = new URL(window.location.href);
    if (u.searchParams.get('autostart') === '1') startPlay();
}

init();
