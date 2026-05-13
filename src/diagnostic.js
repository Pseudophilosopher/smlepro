/**
 * Diagnostic Quiz Module — 40-question SMLE weakness assessment.
 * Hardcoded data (no Cloud Function needed) so it works immediately.
 * Tracks domain-level performance for the weakness heatmap.
 *
 * Funnel: Diagnostic Quiz → Email Gate → Weakness Report → Share / Daily Dose
 */
import { navigateTo, state } from './app.js';
import { DIAGNOSTIC_QUESTIONS, DIAGNOSTIC_DOMAIN_WEIGHTS } from './diagnosticData.js';
import { initializeThemeSwitch } from './theme.js';
import { trackDiagnosticStarted, trackDiagnosticQuestionAnswered, trackDiagnosticCompleted, trackDiagnosticAbandoned } from './analytics.js';

let timerInterval;

const DIAGNOSTIC_STORAGE_KEY = 'smle_diagnostic_session';

function persistSession() {
  try {
    const { currentIndex, userAnswers, startTime, isFinished } = state.diagnosticSession || {};
    localStorage.setItem(DIAGNOSTIC_STORAGE_KEY, JSON.stringify({
      currentIndex: currentIndex ?? 0,
      userAnswers: userAnswers ?? {},
      startTime: startTime ?? null,
      isFinished: isFinished ?? false,
    }));
  } catch { /* storage blocked — non-critical */ }
}

function restoreSession() {
  try {
    const raw = localStorage.getItem(DIAGNOSTIC_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Only restore if the quiz wasn't finished (finished = show results, not resume)
    if (data.isFinished) return null;
    return data;
  } catch { return null; }
}

export function clearStoredDiagnostic() {
  try { localStorage.removeItem(DIAGNOSTIC_STORAGE_KEY); } catch {}
}

export function startDiagnostic() {
  // Check if there's an in-progress session to resume
  const saved = restoreSession();
  if (saved) {
    state.diagnosticSession = {
      currentIndex: saved.currentIndex ?? 0,
      userAnswers: saved.userAnswers ?? {},
      startTime: saved.startTime ? new Date(saved.startTime).getTime() : null,
      totalTime: 0,
      isFinished: false,
      results: null,
    };
    navigateTo('diagnostic');
    return;
  }

  // Fresh diagnostic
  state.diagnosticSession = {
    currentIndex: 0,
    userAnswers: {},       // { questionId: selectedOptionLetter }
    startTime: null,
    totalTime: 0,
    isFinished: false,
    results: null,         // populated on finish
  };
  clearStoredDiagnostic();
  trackDiagnosticStarted();
  navigateTo('diagnostic');
}

export function renderDiagnostic(rootElement) {
  const session = state.diagnosticSession;
  if (!session) {
    rootElement.innerHTML = `<div class="flex items-center justify-center h-screen"><p class="text-slate-400">Diagnostic not initialized.</p></div>`;
    return;
  }

  if (!session.startTime) {
    session.startTime = Date.now();
  }

  const questions = DIAGNOSTIC_QUESTIONS;
  const qIndex = session.currentIndex;
  const question = questions[qIndex];
  const answeredId = session.userAnswers[question.id];
  const isAnswered = !!answeredId;
  const total = questions.length;

  const progressPct = ((qIndex + 1) / total) * 100;

  rootElement.innerHTML = `
  <div class="min-h-screen bg-background-dark text-slate-200">
    <!-- Top nav bar -->
    <header class="sticky top-0 z-30 bg-surface-dark/90 backdrop-blur-md border-b border-border-dark">
      <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/logo.svg" alt="SMLE Pro" class="w-8 h-8 drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]">
          <div>
            <span class="text-sm font-black text-white">SMLE <span style="color:#D4AF37">Readiness Diagnostic</span></span>
            <p class="text-[10px] text-slate-500">Question ${qIndex + 1} of ${total}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5 text-primary font-bold">
            <span class="material-symbols-outlined text-lg">schedule</span>
            <span id="diag-timer" class="tabular-nums">00:00</span>
          </div>
          <button id="diag-exit-btn" class="text-xs font-semibold text-slate-500 hover:text-primary transition-colors">Exit</button>
        </div>
      </div>
      <!-- Progress bar -->
      <div class="w-full bg-border-dark/60 h-1">
        <div class="bg-primary h-1 transition-all duration-500 ease-out" style="width:${progressPct}%"></div>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 py-8">
      <!-- Domain badge -->
      <div class="flex items-center gap-2 mb-6">
        <span class="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${getDomainBadgeClass(question.domain)}">
          ${question.domain}
        </span>
        <span class="text-xs text-slate-500">${question.subtopic}</span>
      </div>

      <!-- Question card -->
      <div class="bg-surface-dark rounded-2xl border border-border-dark p-6 sm:p-8 shadow-depth">
        <p class="text-lg sm:text-xl font-bold text-white leading-relaxed mb-8">
          ${qIndex + 1}. ${question.question}
        </p>

        <div id="diag-options" class="space-y-3">
          ${question.options.map((opt, i) => {
            const optId = String.fromCharCode(65 + i);
            const selected = answeredId === optId;
            const isCorrect = opt.correct;
            const borderCls = !isAnswered
              ? 'border-border-dark hover:border-primary/50 hover:bg-primary/5'
              : selected
                ? isCorrect
                  ? 'border-accent-green bg-accent-green/10'
                  : 'border-accent-red bg-accent-red/10'
                : !selected && isCorrect && isAnswered
                  ? 'border-accent-green/50 bg-accent-green/5'
                  : 'border-border-dark/40 opacity-60';
            return `
            <div class="diag-option p-4 rounded-xl border ${borderCls} cursor-pointer transition-all" data-option="${optId}">
              <div class="flex items-start gap-3">
                <div class="size-8 shrink-0 rounded-lg bg-background-dark border border-border-dark flex items-center justify-center font-bold text-sm text-slate-400">
                  ${isAnswered && isCorrect ? '✓' : optId}
                </div>
                <p class="text-sm sm:text-base text-slate-200 leading-relaxed pt-1">${opt.text}</p>
                ${isAnswered && isCorrect ? '<span class="ml-auto shrink-0 text-accent-green material-symbols-outlined">check_circle</span>' : ''}
                ${isAnswered && selected && !isCorrect ? '<span class="ml-auto shrink-0 text-accent-red material-symbols-outlined">cancel</span>' : ''}
              </div>
            </div>`;
          }).join('')}
        </div>

        <!-- Explanation (shown after answering) -->
        ${isAnswered ? `
        <div class="mt-6 p-4 rounded-xl border ${isCorrectAnswer(question, answeredId) ? 'border-accent-green/30 bg-accent-green/5' : 'border-accent-red/30 bg-accent-red/5'}">
          <div class="flex items-center gap-2 mb-2">
            <span class="material-symbols-outlined ${isCorrectAnswer(question, answeredId) ? 'text-accent-green' : 'text-accent-red'}">${isCorrectAnswer(question, answeredId) ? 'check_circle' : 'cancel'}</span>
            <span class="text-sm font-bold ${isCorrectAnswer(question, answeredId) ? 'text-accent-green' : 'text-accent-red'}">${isCorrectAnswer(question, answeredId) ? 'Correct!' : 'Not quite — the correct answer was ' + getCorrectAnswerLetter(question)}</span>
          </div>
          <p class="text-sm text-slate-300 leading-relaxed">${question.explanation}</p>
        </div>` : ''}

        <!-- Navigation -->
        <div class="flex items-center justify-between mt-8 pt-6 border-t border-border-dark/60">
          <button id="diag-prev-btn"
            class="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${qIndex === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-white/5'}">
            ← Previous
          </button>

          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500">${isAnswered ? 'Answered' : 'Select an answer'}</span>
            <button id="diag-next-btn"
              class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all
                ${isAnswered
                  ? qIndex === total - 1
                    ? 'bg-accent-green text-white hover:brightness-110'
                    : 'bg-primary text-background-dark hover:brightness-110'
                  : 'bg-white/5 text-slate-500 cursor-not-allowed'}">
              ${qIndex === total - 1 ? 'See My Results →' : 'Next →'}
            </button>
          </div>
        </div>
      </div>

      <!-- Mini progress dots -->
      <div class="flex flex-wrap gap-1.5 mt-6 justify-center">
        ${questions.map((q, i) => {
          const ans = session.userAnswers[q.id];
          const isCur = i === qIndex;
          let cls = 'w-3 h-3 rounded-full transition-all';
          if (isCur) cls += ' bg-primary ring-2 ring-primary/40 scale-125';
          else if (ans) cls += ' bg-primary/50';
          else cls += ' bg-border-dark/60';
          return `<button class="diag-dot ${cls}" data-index="${i}" title="Go to Q${i + 1}"></button>`;
        }).join('')}
      </div>
    </main>
  </div>`;

  // ── Events ──────────────────────────────────────────────────────────────
  startTimer();

  document.getElementById('diag-options').addEventListener('click', (e) => {
    const opt = e.target.closest('.diag-option');
    if (!opt) return;
    const optId = opt.dataset.option;
    if (session.userAnswers[question.id]) return; // already answered
    session.userAnswers[question.id] = optId;
    trackDiagnosticQuestionAnswered(qIndex + 1, question.domain);
    persistSession();
    renderDiagnostic(rootElement);
  });

  document.getElementById('diag-next-btn')?.addEventListener('click', () => {
    if (!isAnswered) return;
    persistSession();
    if (qIndex === total - 1) {
      finishDiagnostic();
    } else {
      session.currentIndex++;
      renderDiagnostic(rootElement);
    }
  });

  document.getElementById('diag-prev-btn')?.addEventListener('click', () => {
    if (qIndex > 0) {
      session.currentIndex--;
      persistSession();
      renderDiagnostic(rootElement);
    }
  });

  // Dot navigation
  document.querySelectorAll('.diag-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.index, 10);
      if (idx >= 0 && idx < total) {
        session.currentIndex = idx;
        persistSession();
        renderDiagnostic(rootElement);
      }
    });
  });

  document.getElementById('diag-exit-btn')?.addEventListener('click', () => {
    clearInterval(timerInterval);
    const answeredCount = Object.keys(session.userAnswers).length;
    trackDiagnosticAbandoned(answeredCount);
    navigateTo('landing');
  });

  initializeThemeSwitch();
}

function startTimer() {
  clearInterval(timerInterval);
  const el = document.getElementById('diag-timer');
  if (!el) return;
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.diagnosticSession.startTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, 1000);
}

function finishDiagnostic() {
  clearInterval(timerInterval);
  const session = state.diagnosticSession;
  session.isFinished = true;
  session.totalTime = Date.now() - session.startTime;

  const questions = DIAGNOSTIC_QUESTIONS;
  const domainStats = {};
  let totalCorrect = 0;

  questions.forEach(q => {
    const correctIdx = q.options.findIndex(o => o.correct === true);
    const correctLetter = String.fromCharCode(65 + correctIdx);
    const userAns = session.userAnswers[q.id];
    const isCorrect = userAns === correctLetter;

    if (!domainStats[q.domain]) {
      domainStats[q.domain] = { correct: 0, total: 0 };
    }
    domainStats[q.domain].total++;
    if (isCorrect) totalCorrect++;
    if (isCorrect) domainStats[q.domain].correct++;
  });

  // Calculate domain percentages
  const domainPcts = {};
  Object.entries(domainStats).forEach(([domain, stats]) => {
    domainPcts[domain] = Math.round((stats.correct / stats.total) * 100);
  });

  // Weighted SMLE Readiness Score (using blueprint weights)
  let weightedScore = 0;
  let totalWeight = 0;
  Object.entries(domainPcts).forEach(([domain, pct]) => {
    const weight = DIAGNOSTIC_DOMAIN_WEIGHTS[domain] || 0.05;
    weightedScore += pct * weight;
    totalWeight += weight;
  });
  const smleReadiness = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

  // Find weakest and strongest domains
  let weakestDomain = { name: null, score: 101 };
  let strongestDomain = { name: null, score: -1 };
  Object.entries(domainPcts).forEach(([domain, pct]) => {
    // Exclude CrossCutting from weakest/strongest (only 2 questions)
    if (domain === 'CrossCutting') return;
    if (pct < weakestDomain.score) {
      weakestDomain = { name: domain, score: pct };
    }
    if (pct > strongestDomain.score) {
      strongestDomain = { name: domain, score: pct };
    }
  });

  // Clear persisted session now that we're done
  clearStoredDiagnostic();

  session.results = {
    overallScore: Math.round((totalCorrect / questions.length) * 100),
    totalCorrect,
    totalQuestions: questions.length,
    domainStats,
    domainPcts,
    smleReadiness,
    weakestDomain,
    strongestDomain,
    totalTime: session.totalTime,
  };

  navigateTo('diagnosticResults');
  trackDiagnosticCompleted(session.results.overallScore, session.results.smleReadiness, Math.round(session.totalTime / 1000));
}

function getDomainBadgeClass(domain) {
  const map = {
    Medicine: 'bg-primary/15 text-primary border border-primary/30',
    OBGYN: 'bg-accent-purple/15 text-accent-purple border border-accent-purple/30',
    Pediatrics: 'bg-accent-green/15 text-accent-green border border-accent-green/30',
    Surgery: 'bg-accent-orange/15 text-accent-orange border border-accent-orange/30',
    CrossCutting: 'bg-accent-red/15 text-accent-red border border-accent-red/30',
  };
  return map[domain] || 'bg-slate-700 text-slate-300';
}

function isCorrectAnswer(question, answeredId) {
  const correctIdx = question.options.findIndex(o => o.correct === true);
  return answeredId === String.fromCharCode(65 + correctIdx);
}

function getCorrectAnswerLetter(question) {
  const correctIdx = question.options.findIndex(o => o.correct === true);
  return String.fromCharCode(65 + correctIdx);
}
