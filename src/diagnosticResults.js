/**
 * Diagnostic Results — Weakness Heatmap + SMLE Readiness Score.
 * Features:
 *   - Domain heatmap (5 domains including CrossCutting as Foundational Skills)
 *   - Results shown immediately (no gate)
 *   - Save section at bottom (email capture after value)
 *   - Previous results comparison if available
 *   - Web Share API for virality
 *   - 3-path CTA: BoardAce articles / Practice sessions / Daily Dose
 */
import { navigateTo, state, startDailyDose, firestore, auth } from './app.js';
import { initializeThemeSwitch } from './theme.js';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import { trackDiagnosticSavedResults, trackDiagnosticShared } from './analytics.js';

export function renderDiagnosticResults(rootElement) {
  const session = state.diagnosticSession;
  if (!session?.results) {
    rootElement.innerHTML = `<div class="flex items-center justify-center h-screen"><p class="text-slate-400">No diagnostic results found. Take the diagnostic first.</p></div>`;
    return;
  }

  const { overallScore, totalCorrect, totalQuestions, domainPcts, smleReadiness, weakestDomain, strongestDomain, totalTime } = session.results;

  const minutes = Math.floor(totalTime / 60000);
  const seconds = Math.floor((totalTime % 60000) / 1000);

  const readinessLabel = smleReadiness >= 80 ? 'Exam Ready'
    : smleReadiness >= 60 ? 'On Track'
    : smleReadiness >= 40 ? 'Needs Work'
    : 'Critical Gaps';

  const readinessColor = smleReadiness >= 80 ? 'text-accent-green'
    : smleReadiness >= 60 ? 'text-primary'
    : smleReadiness >= 40 ? 'text-accent-orange'
    : 'text-accent-red';

  const heroEmoji = overallScore >= 80 ? '🏆' : overallScore >= 60 ? '👍' : overallScore >= 40 ? '⚠️' : '🚨';

  // ── Build domain heatmap (5 domains) ──
  const domainOrder = ['Medicine', 'OBGYN', 'Pediatrics', 'Surgery'];
  const heatmapHtml = domainOrder.map(domain => {
    const pct = domainPcts[domain] ?? 0;
    const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
    return `
      <div class="rounded-2xl border border-border-dark p-5 bg-surface-dark/80" style="border-left: 4px solid ${color};">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-bold text-white">${domain}</span>
          <span class="text-2xl font-black" style="color:${color}">${pct}%</span>
        </div>
        <div class="w-full bg-border-dark/60 rounded-full h-2.5">
          <div class="h-2.5 rounded-full transition-all duration-1000" style="width:${Math.max(2, pct)}%;background:${color};"></div>
        </div>
      </div>`;
  }).join('');

  // CrossCutting as Foundational Skills (if it exists)
  const ccPct = domainPcts['CrossCutting'];
  const crossCuttingHtml = ccPct !== undefined ? `
    <div class="rounded-2xl border border-border-dark p-5 bg-surface-dark/80" style="border-left: 4px solid #a78bfa;">
      <div class="flex items-center justify-between mb-3">
        <div>
          <span class="text-sm font-bold text-white">Foundational Skills</span>
          <p class="text-[9px] text-slate-500">Ethics · Preventive · Patient Safety</p>
        </div>
        <span class="text-2xl font-black" style="color:#a78bfa">${ccPct}%</span>
      </div>
      <div class="w-full bg-border-dark/60 rounded-full h-2.5">
        <div class="h-2.5 rounded-full transition-all duration-1000" style="width:${Math.max(2, ccPct)}%;background:#a78bfa;"></div>
      </div>
    </div>` : '';

  // ── Weakest domain → study plan ──
  const studyPlanHtml = weakestDomain.name ? `
    <div class="bg-primary/10 border border-primary/30 rounded-2xl p-5 sm:p-6">
      <div class="flex items-start gap-4">
        <div class="size-12 shrink-0 rounded-xl bg-accent-orange/20 flex items-center justify-center">
          <span class="material-symbols-outlined text-accent-orange text-2xl">school</span>
        </div>
        <div class="min-w-0">
          <h3 class="text-base font-black text-white mb-1">Your Priority: <span class="text-accent-orange">${weakestDomain.name}</span></h3>
          <p class="text-sm text-slate-400 leading-relaxed mb-3">
            You scored <strong class="text-accent-orange">${weakestDomain.score}%</strong> in ${weakestDomain.name}.
            This is your highest-yield improvement area. Here's your plan:
          </p>
          <ul class="space-y-2 text-sm text-slate-300">
            <li class="flex items-start gap-2">
              <span class="material-symbols-outlined text-accent-green text-sm mt-0.5">check_circle</span>
              <span>Read about <a href="https://smlepro.web.app/#${weakestDomain.name.toLowerCase().replace(/\s/g, '-')}" target="_blank" class="text-primary hover:underline" id="diag-boardace-link">${weakestDomain.name} core concepts</a></span>
            </li>
            <li class="flex items-start gap-2">
              <span class="material-symbols-outlined text-accent-green text-sm mt-0.5">check_circle</span>
              <span>Try 40 practice questions on <strong>${weakestDomain.name}</strong></span>
            </li>
            <li class="flex items-start gap-2">
              <span class="material-symbols-outlined text-accent-green text-sm mt-0.5">check_circle</span>
              <span>Re-take this diagnostic in 2 weeks to track your progress</span>
            </li>
          </ul>
        </div>
      </div>
    </div>` : '';

  // ── Strongest domain ──
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

  // ── Comparison with previous diagnostic (if saved) ──
  const comparisonHtml = '<div id="diag-comparison" class="mb-6"></div>';

  // ── Render ──
  rootElement.innerHTML = `
  <div class="min-h-screen bg-background-dark text-slate-200">
    <main class="max-w-3xl mx-auto px-4 py-8 sm:py-12">

      <!-- Hero -->
      <div class="text-center mb-10">
        <div class="text-5xl mb-4">${heroEmoji}</div>
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

      ${comparisonHtml}

      <!-- Domain heatmap -->
      <div class="bg-surface-dark rounded-2xl p-6 border border-border-dark mb-6">
        <h2 class="text-lg font-black text-white mb-5 flex items-center gap-2">
          <span class="material-symbols-outlined text-primary">grid_view</span> Domain Breakdown
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${heatmapHtml}
          ${crossCuttingHtml}
        </div>
      </div>

      <!-- Weighted SMLE Readiness explanation -->
      <div class="bg-surface-dark rounded-2xl p-5 border border-border-dark mb-6">
        <div class="flex items-start gap-3">
          <span class="material-symbols-outlined text-primary text-lg mt-0.5">info</span>
          <div>
            <p class="text-sm font-bold text-white mb-1">How it's calculated</p>
            <p class="text-xs text-slate-400 leading-relaxed">
              Your SMLE Readiness Score uses the official SMLE blueprint weights:
              Medicine (30%), OBGYN (25%), Pediatrics (25%), Surgery (20%).
              Foundational Skills (Ethics, Preventive) are shown for reference.
            </p>
          </div>
        </div>
      </div>

      ${studyPlanHtml}
      ${strengthHtml}

      <!-- Save section (after value — no gate) -->
      <div id="diag-save-section" class="bg-surface-dark rounded-2xl border border-primary/40 p-6 sm:p-8 mb-6 text-center">
        <div class="size-14 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <span class="material-symbols-outlined text-primary text-3xl">save</span>
        </div>
        <h2 class="text-xl font-black text-white mb-2">Save Your Results 📊</h2>
        <p class="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
          Save your diagnostic history and track your improvement over time.
          We'll send you a comparison when you retake it.
        </p>
        <form id="diag-save-form" class="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input type="email" id="diag-email-input" required placeholder="your@email.com"
            class="flex-1 px-4 py-3 rounded-xl border border-border-dark bg-background-dark text-white text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            pattern="[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}$">
          <button type="submit" id="diag-save-submit-btn"
            class="px-6 py-3 rounded-xl bg-primary text-background-dark font-black text-sm hover:brightness-110 transition-all whitespace-nowrap">
            Save My Results →
          </button>
        </form>
        <p id="diag-save-status" class="text-xs mt-3 hidden"></p>
        <p class="text-[10px] text-slate-600 mt-4">No spam, unsubscribe anytime.</p>
      </div>

      <!-- Action buttons -->
      <div class="flex flex-col sm:flex-row gap-3 pt-4">
        <button id="diag-start-daily-btn"
          class="flex-1 px-6 py-4 rounded-xl bg-primary text-background-dark font-black text-sm shadow-glow-primary hover:brightness-110 transition-all flex items-center justify-center gap-2">
          <span class="material-symbols-outlined">bolt</span> Daily Dose (Free)
        </button>
        <button id="diag-practice-btn"
          class="flex-1 px-6 py-4 rounded-xl bg-accent-purple text-white font-black text-sm shadow-glow-purple hover:brightness-110 transition-all flex items-center justify-center gap-2">
          <span class="material-symbols-outlined">school</span> Practice Sessions
        </button>
        <button id="diag-share-btn"
          class="flex-1 px-6 py-4 rounded-xl bg-accent-green/20 border border-accent-green/40 text-accent-green font-black text-sm hover:bg-accent-green/30 transition-all flex items-center justify-center gap-2">
          <span class="material-symbols-outlined">share</span> Share
        </button>
      </div>

      <div class="flex justify-center mt-4">
        <button id="diag-back-landing-btn" class="text-xs font-semibold text-slate-500 hover:text-primary transition-colors">
          Back to Home
        </button>
      </div>

    </main>
  </div>`;

  // ── Pre-fill email from Firebase Auth ──
  if (auth?.currentUser?.email) {
    const input = document.getElementById('diag-email-input');
    if (input) {
      input.value = auth.currentUser.email;
      input.readOnly = true;
    }
  }

  // ── Try to fetch previous diagnostic results ──
  loadPreviousResults(session.results).then(prevHtml => {
    const el = document.getElementById('diag-comparison');
    if (el && prevHtml) el.innerHTML = prevHtml;
  });

  // ── Save form ──
  const saveForm = document.getElementById('diag-save-form');
  const saveStatus = document.getElementById('diag-save-status');

  saveForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('diag-email-input').value.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      saveStatus.textContent = 'Please enter a valid email.';
      saveStatus.className = 'text-xs mt-3 text-accent-red';
      saveStatus.classList.remove('hidden');
      return;
    }

    // Save to Firestore
    try {
      const uid = auth?.currentUser?.uid || null;
      const docData = {
        email,
        uid,
        score: overallScore,
        smleReadiness,
        weakestDomain: weakestDomain?.name || null,
        strongestDomain: strongestDomain?.name || null,
        domainPcts,
        createdAt: serverTimestamp(),
      };
      // If logged in, save to user's subcollection for history
      if (uid) {
        const { doc, setDoc } = await import('firebase/firestore');
        await addDoc(collection(firestore, 'users', uid, 'diagnostics'), docData);
      }
      // Also save to leads collection for email capture
      await addDoc(collection(firestore, 'diagnostic_leads'), docData);
      trackDiagnosticSavedResults(email);
      saveStatus.textContent = '✅ Results saved! Check back after your next diagnostic to see improvement.';
      saveStatus.className = 'text-xs mt-3 text-accent-green';
      saveStatus.classList.remove('hidden');
      document.getElementById('diag-save-section').querySelector('form').style.display = 'none';
    } catch (err) {
      saveStatus.textContent = 'Could not save. Try again later.';
      saveStatus.className = 'text-xs mt-3 text-accent-red';
      saveStatus.classList.remove('hidden');
    }
  });

  // ── Share button (Web Share API with clipboard fallback) ──
  document.getElementById('diag-share-btn')?.addEventListener('click', async () => {
    const domains = ['Medicine', 'OBGYN', 'Pediatrics', 'Surgery'];
    const grid = domains.map(d => {
      const pct = domainPcts[d] ?? 0;
      return `${pct >= 70 ? '✅' : pct >= 50 ? '⚠️' : '❌'} ${d}: ${pct}%`;
    }).join('\n');

    const shareText =
`🩺 SMLE Diagnostic Results
Score: ${totalCorrect}/${totalQuestions} (${overallScore}%)
Readiness: ${smleReadiness}% — ${readinessLabel}

${grid}

${weakestDomain?.name ? `Weakest: ${weakestDomain.name} (${weakestDomain.score}%)` : ''}
${strongestDomain?.name ? `Strongest: ${strongestDomain.name} (${strongestDomain.score}%)` : ''}

Find your weak spots in 8 mins:
https://smlepro.web.app/`;

    // Web Share API
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My SMLE Readiness Score', text: shareText, url: 'https://smlepro.web.app/' });
        trackDiagnosticShared();
        return;
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('Share failed:', e);
      }
    }
    // Fallback: clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      showToast('Copied! Share your SMLE Readiness anywhere 🚀');
      trackDiagnosticShared();
    } catch {
      showToast('Could not copy. Please copy manually.');
    }
  });

  // ── Action buttons ──
  document.getElementById('diag-start-daily-btn')?.addEventListener('click', () => startDailyDose());
  document.getElementById('diag-practice-btn')?.addEventListener('click', () => navigateTo('dashboard'));
  document.getElementById('diag-back-landing-btn')?.addEventListener('click', () => navigateTo('landing'));

  initializeThemeSwitch();
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl font-bold text-sm z-[9999] flex items-center gap-2 animate-bounce';
  toast.innerHTML = `<span class="material-symbols-outlined text-accent-green">check_circle</span> ${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

async function loadPreviousResults(currentResults) {
  const uid = auth?.currentUser?.uid;
  if (!uid) return '';

  try {
    const { query, where, orderBy, limit, getDocs, collection, getFirestore } = await import('firebase/firestore');
    const db = getFirestore();
    const q = query(
      collection(db, 'users', uid, 'diagnostics'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);

    if (snap.empty) return '';

    const prev = snap.docs[0].data();
    const prevOverall = prev.score || 0;
    const change = currentResults.overallScore - prevOverall;
    const changeColor = change > 0 ? 'text-accent-green' : change < 0 ? 'text-accent-red' : 'text-slate-400';
    const changeArrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';

    return `
      <div class="bg-surface-dark rounded-2xl p-5 border border-border-dark mb-6">
        <h3 class="text-sm font-black text-white flex items-center gap-2 mb-3">
          <span class="material-symbols-outlined text-accent-purple">history</span> Your Progress
        </h3>
        <div class="flex items-center justify-around text-center">
          <div>
            <p class="text-xs text-slate-500 mb-1">Previous</p>
            <p class="text-xl font-black text-white">${prevOverall}%</p>
          </div>
          <div class="text-2xl text-slate-500">→</div>
          <div>
            <p class="text-xs text-slate-500 mb-1">Today</p>
            <p class="text-xl font-black ${changeColor}">${currentResults.overallScore}%</p>
          </div>
          <div>
            <p class="text-xs text-slate-500 mb-1">Change</p>
            <p class="text-xl font-black ${changeColor}">${changeArrow} ${Math.abs(change)}%</p>
          </div>
        </div>
      </div>`;
  } catch (e) {
    console.warn('Could not load previous diagnostic:', e.message);
    return '';
  }
}
