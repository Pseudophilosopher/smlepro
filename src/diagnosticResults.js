/**
 * Diagnostic Results — Weakness Heatmap + SMLE Readiness Score.
 * Features:
 *   - Domain heatmap (2×2 grid for Medicine, OBGYN, Peds, Surgery)
 *   - Weakest domain highlighted with actionable study plan
 *   - Email gate (no signup required, just email)
 *   - Shareable text summary (viral loop)
 *   - Bridge to Daily Dose (habit formation)
 */
import { navigateTo, state, startDailyDose, firestore } from './app.js';
import { initializeThemeSwitch } from './theme.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export function renderDiagnosticResults(rootElement) {
  const session = state.diagnosticSession;
  if (!session?.results) {
    rootElement.innerHTML = `<div class="flex items-center justify-center h-screen"><p class="text-slate-400">No diagnostic results found. Take the diagnostic first.</p></div>`;
    return;
  }

  const { overallScore, totalCorrect, totalQuestions, domainPcts, smleReadiness, weakestDomain, strongestDomain, totalTime } = session.results;

  const minutes = Math.floor(totalTime / 60000);
  const seconds = Math.floor((totalTime % 60000) / 1000);

  const readinessLabel = smleReadiness >= 80 ? 'Exam Ready 🏆'
    : smleReadiness >= 60 ? 'On Track 👍'
    : smleReadiness >= 40 ? 'Needs Work ⚠️'
    : 'Critical Gaps 🚨';

  const readinessColor = smleReadiness >= 80 ? 'text-accent-green'
    : smleReadiness >= 60 ? 'text-primary'
    : smleReadiness >= 40 ? 'text-accent-orange'
    : 'text-accent-red';

  // Build domain heatmap (2×2 grid)
  const domainOrder = ['Medicine', 'OBGYN', 'Pediatrics', 'Surgery'];
  const heatmapHtml = domainOrder.map(domain => {
    const pct = domainPcts[domain] ?? 0;
    const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
    const bgOpacity = pct >= 80 ? '0.25' : pct >= 60 ? '0.15' : pct >= 40 ? '0.10' : '0.05';
    return `
      <div class="rounded-2xl border border-border-dark p-5 bg-surface-dark/80" style="border-left: 4px solid ${color};">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-bold text-white">${domain}</span>
          <span class="text-2xl font-black" style="color:${color}">${pct}%</span>
        </div>
        <div class="w-full bg-border-dark/60 rounded-full h-2.5">
          <div class="h-2.5 rounded-full transition-all duration-1000" style="width:${pct}%;background:${color};"></div>
        </div>
      </div>`;
  }).join('');

  // Weakest domain → study plan
  const studyPlanHtml = weakestDomain.name ? `
    <div class="bg-primary/10 border border-primary/30 rounded-2xl p-5 sm:p-6">
      <div class="flex items-start gap-4">
        <div class="size-12 shrink-0 rounded-xl bg-accent-orange/20 flex items-center justify-center">
          <span class="material-symbols-outlined text-accent-orange text-2xl">school</span>
        </div>
        <div class="min-w-0">
          <h3 class="text-base font-black text-white mb-1">Your Priority: <span class="text-accent-orange">${weakestDomain.name}</span></h3>
          <p class="text-sm text-slate-400 leading-relaxed mb-3">
            You scored only <strong class="text-accent-orange">${weakestDomain.score}%</strong> in ${weakestDomain.name}.
            This is your highest-yield improvement area. Here's your recommended study plan:
          </p>
          <ul class="space-y-2 text-sm text-slate-300">
            <li class="flex items-start gap-2">
              <span class="material-symbols-outlined text-accent-green text-sm mt-0.5">check_circle</span>
              <span>Review <strong>${weakestDomain.name}</strong> core concepts for 30 min/day this week</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="material-symbols-outlined text-accent-green text-sm mt-0.5">check_circle</span>
              <span>Take a daily 10-question drill focused on ${weakestDomain.name}</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="material-symbols-outlined text-accent-green text-sm mt-0.5">check_circle</span>
              <span>Re-take this diagnostic in 2 weeks to measure improvement</span>
            </li>
          </ul>
        </div>
      </div>
    </div>` : '';

  // Strongest domain
  const strengthHtml = strongestDomain.name ? `
    <div class="bg-accent-green/10 border border-accent-green/30 rounded-2xl p-5 sm:p-6 mt-4">
      <div class="flex items-start gap-4">
        <div class="size-12 shrink-0 rounded-xl bg-accent-green/20 flex items-center justify-center">
          <span class="material-symbols-outlined text-accent-green text-2xl">emoji_events</span>
        </div>
        <div>
          <h3 class="text-base font-black text-white mb-1">Your Strength: <span class="text-accent-green">${strongestDomain.name}</span></h3>
          <p class="text-sm text-slate-400">You scored <strong class="text-accent-green">${strongestDomain.score}%</strong> in ${strongestDomain.name}. Keep up the good work — maintain your momentum here while focusing on weaker areas.</p>
        </div>
      </div>
    </div>` : '';

  rootElement.innerHTML = `
  <div class="min-h-screen bg-background-dark text-slate-200">
    <!-- Result Page -->
    <main class="max-w-3xl mx-auto px-4 py-8 sm:py-12">

      <!-- Hero -->
      <div class="text-center mb-10">
        <div class="text-5xl mb-4">${overallScore >= 80 ? '🏆' : overallScore >= 60 ? '👍' : overallScore >= 40 ? '⚠️' : '🚨'}</div>
        <h1 class="text-3xl sm:text-4xl font-black text-white mb-2">Your SMLE Diagnostic Results</h1>
        <p class="text-slate-500 text-sm">${totalCorrect} of ${totalQuestions} correct · ${minutes}:${String(seconds).padStart(2, '0')} min</p>
      </div>

      <!-- 3-Card Stats -->
      <div class="grid grid-cols-3 gap-3 mb-8">
        <div class="bg-surface-dark rounded-2xl p-5 text-center border border-border-dark">
          <p class="text-3xl sm:text-4xl font-black text-white">${overallScore}%</p>
          <p class="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Overall</p>
        </div>
        <div class="bg-surface-dark rounded-2xl p-5 text-center border border-border-dark">
          <p class="text-3xl sm:text-4xl font-black ${readinessColor}">${smleReadiness}%</p>
          <p class="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">SMLE Readiness</p>
        </div>
        <div class="bg-surface-dark rounded-2xl p-5 text-center border border-border-dark">
          <p class="text-base sm:text-lg font-black ${readinessColor}">${readinessLabel}</p>
          <p class="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Status</p>
        </div>
      </div>

      <div id="diag-results-content">
        <!-- Email Gate (visible on first load, hidden after submission) -->
        <div id="diag-email-gate" class="bg-surface-dark rounded-2xl border border-primary/40 p-6 sm:p-8 mb-8 text-center">
          <div class="size-14 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-primary text-3xl">mail</span>
          </div>
          <h2 class="text-xl font-black text-white mb-2">Get Your Full Report 💪</h2>
          <p class="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
            Enter your email to unlock the breakdown below — plus we'll send you a personalized study plan in 24 hours.
            No spam, unsubscribe anytime.
          </p>
          <form id="diag-email-form" class="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input type="email" id="diag-email-input" required placeholder="your@email.com"
              class="flex-1 px-4 py-3 rounded-xl border border-border-dark bg-background-dark text-white text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              pattern="[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}$">
            <button type="submit" id="diag-email-submit-btn"
              class="px-6 py-3 rounded-xl bg-primary text-background-dark font-black text-sm hover:brightness-110 transition-all whitespace-nowrap">
              Unlock Results →
            </button>
          </form>
          <p id="diag-email-error" class="text-xs text-accent-red mt-3 hidden">Please enter a valid email address.</p>
          <p class="text-[10px] text-slate-600 mt-4">By submitting, you agree to receive study tips. Unsubscribe anytime.</p>

          <!-- Skip link for returning users (not ideal but gives an out) -->
          <button id="diag-skip-gate-btn" class="text-xs text-slate-600 hover:text-primary mt-4 transition-colors underline">
            Skip — show results anyway
          </button>
        </div>

        <!-- Results content (hidden until gate passed) -->
        <div id="diag-results-reveal" class="hidden space-y-6">
          <!-- Domain heatmap -->
          <div class="bg-surface-dark rounded-2xl p-6 border border-border-dark">
            <h2 class="text-lg font-black text-white mb-5 flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">grid_view</span> Domain Breakdown
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              ${heatmapHtml}
            </div>
          </div>

          <!-- Weighted SMLE Readiness explanation -->
          <div class="bg-surface-dark rounded-2xl p-5 border border-border-dark">
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined text-primary text-lg mt-0.5">info</span>
              <div>
                <p class="text-sm font-bold text-white mb-1">How it's calculated</p>
                <p class="text-xs text-slate-400 leading-relaxed">
                  Your SMLE Readiness Score uses the official SMLE blueprint weights:
                  Medicine (30%), OBGYN (25%), Pediatrics (25%), Surgery (20%).
                  Cross-cutting topics (Ethics, Preventive) are bonus questions.
                </p>
              </div>
            </div>
          </div>

          ${studyPlanHtml}
          ${strengthHtml}

          <!-- Action buttons -->
          <div class="flex flex-col sm:flex-row gap-3 pt-4">
            <button id="diag-start-daily-btn"
              class="flex-1 px-6 py-4 rounded-xl bg-primary text-background-dark font-black text-sm shadow-glow-primary hover:brightness-110 transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined">bolt</span> Continue with Daily Dose
            </button>
            <button id="diag-share-btn"
              class="flex-1 px-6 py-4 rounded-xl bg-accent-green/20 border border-accent-green/40 text-accent-green font-black text-sm hover:bg-accent-green/30 transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined">share</span> Share My Results
            </button>
          </div>

          <div class="flex justify-center">
            <button id="diag-back-landing-btn" class="text-xs font-semibold text-slate-500 hover:text-primary transition-colors">
              Back to Home
            </button>
          </div>
        </div>
      </div>

    </main>
  </div>`;

  // ── Email gate logic ────────────────────────────────────────────────────
  const gate = document.getElementById('diag-email-gate');
  const reveal = document.getElementById('diag-results-reveal');
  const form = document.getElementById('diag-email-form');
  const emailInput = document.getElementById('diag-email-input');
  const errorEl = document.getElementById('diag-email-error');

  // Check if already submitted (stored in sessionStorage to avoid re-gating)
  const gatePassed = sessionStorage.getItem('diag_gate_passed') === '1';

  if (gatePassed) {
    gate?.classList.add('hidden');
    reveal?.classList.remove('hidden');
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim().toLowerCase();

    // Basic validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorEl.classList.remove('hidden');
      return;
    }
    errorEl.classList.add('hidden');

    // Submit to Firestore (best-effort)
    try {
      await addDoc(collection(firestore, 'diagnostic_leads'), {
        email,
        score: overallScore,
        smleReadiness,
        weakestDomain: weakestDomain.name,
        strongestDomain: strongestDomain.name,
        domainPcts,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      // Non-blocking — still reveal results
      console.warn('[Diagnostic] Lead capture failed (non-critical):', err.message);
    }

    // Store in sessionStorage so they don't see the gate again
    try {
      sessionStorage.setItem('diag_gate_passed', '1');
    } catch { /* ignore */ }

    gate.classList.add('hidden');
    reveal.classList.remove('hidden');
  });

  // Skip gate
  document.getElementById('diag-skip-gate-btn')?.addEventListener('click', () => {
    gate.classList.add('hidden');
    reveal.classList.remove('hidden');
  });

  // ── Share button ────────────────────────────────────────────────────────
  document.getElementById('diag-share-btn')?.addEventListener('click', () => {
    const domains = ['Medicine', 'OBGYN', 'Pediatrics', 'Surgery'];
    const grid = domains.map(d => {
      const pct = domainPcts[d] ?? 0;
      return `${pct >= 70 ? '🟩' : pct >= 50 ? '🟨' : '🟥'} ${d}: ${pct}%`;
    }).join('\n');

    const shareText =
`🩺 SMLE Readiness Diagnostic

Score: ${totalCorrect}/${totalQuestions} (${overallScore}%)
Readiness: ${smleReadiness}% — ${readinessLabel}

${grid}

${weakestDomain.name ? `🎯 Weakest: ${weakestDomain.name} (${weakestDomain.score}%)` : ''}
${strongestDomain.name ? `💪 Strongest: ${strongestDomain.name} (${strongestDomain.score}%)` : ''}

Find your weak spots in 8 mins → 👇
https://smlepro.web.app/`;

    copyToClipboard(shareText);
  });

  // ── Daily Dose bridge ────────────────────────────────────────────────────
  document.getElementById('diag-start-daily-btn')?.addEventListener('click', () => {
    startDailyDose();
  });

  document.getElementById('diag-back-landing-btn')?.addEventListener('click', () => {
    navigateTo('landing');
  });

  initializeThemeSwitch();
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl font-bold text-sm z-[9999] flex items-center gap-2 animate-bounce';
      toast.innerHTML = '<span class="material-symbols-outlined text-accent-green">check_circle</span> Copied! Share your SMLE Readiness anywhere 🚀';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3500);
    })
    .catch(() => alert('Could not copy — please copy manually.'));
}
