import { navigateTo, state, firestore, auth, checkDailyDoneToday, startDailyDose, loadWrongAnswerPool } from './app.js';
import { topicToDrillBucket } from './topic-drill-buckets.js';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeThemeSwitch } from './theme.js';
import { getTrustDisclaimerStripHtml } from './content-meta.js';
import { ADMIN_EMAIL } from './operator-config.js';

export { ADMIN_EMAIL };

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Sanitize user-provided text to prevent XSS when inserted into HTML.
 * Escapes HTML special characters to their entity equivalents.
 * @param {string} text - The raw text to sanitize
 * @returns {string} - The sanitized text safe for HTML insertion
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function fetchPerformanceHistory(uid) {
    try { return JSON.parse(localStorage.getItem(`performanceHistory_${uid}`)) || []; }
    catch { return []; }
}

function computeStats(performance) {
    let totalQuestions = 0, scoreSum = 0, validCount = 0;
    const activityDates = new Set();

    performance.forEach(s => {
        if (s.totalQuestions) totalQuestions += s.totalQuestions;
        // Support both field names: overallScore (current) and score (legacy cloud sync)
        const scoreVal = typeof s.overallScore === 'number' ? s.overallScore : (typeof s.score === 'number' ? s.score : null);
        if (scoreVal !== null) { scoreSum += scoreVal; validCount++; }
        if (s.date) activityDates.add(new Date(s.date).toDateString());
    });

    let streak = 0;
    for (let i = 0; i < 365; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        if (activityDates.has(d.toDateString())) streak++;
        else break;
    }

    const avgScore = validCount > 0 ? Math.round(scoreSum / validCount) : null;
    // SMLE pass mark is 65–70%. Readiness = how close you are relative to 70%.
    const readiness = avgScore !== null ? Math.min(100, Math.round((avgScore / 70) * 100)) : 0;
    return { totalQuestions, avgScore, streak, readiness };
}

function timeUntilMidnight() {
    const now = new Date();
    const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
    const ms = midnight - now;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

function getExamDate(uid) {
    try { return localStorage.getItem(`examDate_${uid}`) || ''; } catch { return ''; }
}
function setExamDate(uid, val) {
    try { localStorage.setItem(`examDate_${uid}`, val); } catch {}
}
function getDaysUntilExam(uid) {
    const d = getExamDate(uid);
    if (!d) return null;
    const diff = new Date(d) - new Date();
    return diff > 0 ? Math.ceil(diff / 86400000) : null;
}

// Build 30-day heatmap HTML
function buildHeatmap(performance) {
    const today = new Date();
    const daily = {};
    performance.forEach(s => {
        const key = new Date(s.date).toDateString();
        daily[key] = (daily[key] || 0) + (s.totalQuestions || 0);
    });

    let html = '';
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        const key = d.toDateString();
        const count = daily[key] || 0;
        const opacity = count > 0 ? Math.min(1, 0.15 + (count / 60) * 0.85) : 0;
        const bg = count > 0
            ? `background:rgba(17,180,212,${opacity.toFixed(2)})`
            : 'background:rgba(255,255,255,0.04)';
        const label = `${d.toLocaleDateString('en-SA', { month: 'short', day: 'numeric' })}: ${count}Q`;
        html += `<div class="aspect-square rounded-[3px] cursor-default" style="${bg}" title="${label}"></div>`;
    }
    return html;
}

// Mini score-trend bars (last 8 sessions)
function buildScoreBars(performance) {
    const sessions = performance.slice(-8);
    if (!sessions.length) return `<p class="text-slate-500 text-sm text-center py-6">Complete a session to see your trend.</p>`;
    return `
    <div class="flex items-end gap-1.5 h-20">
        ${sessions.map(s => {
            // Support both field names: overallScore (current) and score (legacy cloud sync)
            const pct = typeof s.overallScore === 'number' ? s.overallScore : (typeof s.score === 'number' ? s.score : 0);
            const px = Math.max(4, Math.round((pct / 100) * 80));
            const color = pct >= 70 ? 'bg-accent-green' : pct >= 50 ? 'bg-accent-orange' : 'bg-accent-red';
            return `<div class="flex-1 flex flex-col items-center justify-end gap-1" title="${Math.round(pct)}%">
                <span class="text-[8px] text-slate-500 font-bold">${Math.round(pct)}%</span>
                <div class="${color} w-full rounded-t-sm opacity-80" style="height:${px}px"></div>
            </div>`;
        }).join('')}
    </div>
    <div class="flex items-center gap-4 mt-2 border-t border-border-dark/50 pt-2">
        <span class="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
            <span class="w-2 h-2 rounded-full bg-accent-green inline-block"></span> ≥70% pass
        </span>
        <span class="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
            <span class="w-2 h-2 rounded-full bg-accent-orange inline-block"></span> 50–69%
        </span>
        <span class="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
            <span class="w-2 h-2 rounded-full bg-accent-red inline-block"></span> <50%
        </span>
    </div>`;
}

// Aggregates per-topic correct/total counts across all saved sessions
function computeSpecialtyStats(performance) {
    const stats = {};
    performance.forEach(session => {
        if (!session.topicStats || typeof session.topicStats !== 'object') return;
        Object.entries(session.topicStats).forEach(([topic, s]) => {
            const bucket = topicToDrillBucket(topic);
            if (!stats[bucket]) stats[bucket] = { correct: 0, total: 0 };
            stats[bucket].correct += (s.correct || 0);
            stats[bucket].total   += (s.total   || 0);
        });
    });
    Object.keys(stats).forEach(t => {
        const s = stats[t];
        s.pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    });
    return stats;
}

// Builds the wrong-answer pool card HTML
function buildWrongAnswerCard(wrongPool, isPro) {
    const count = wrongPool.length;
    const drillCount = Math.min(count, 20);

    const topicBadges = (() => {
        if (!count) return '';
        const topicCounts = {};
        wrongPool.forEach(q => { topicCounts[q.topic || 'General'] = (topicCounts[q.topic || 'General'] || 0) + 1; });
        return `<div class="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border-dark/50">
            ${Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).map(([t, c]) =>
                `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-background-dark border border-border-dark text-slate-400">${t} <span class="text-accent-red font-black">${c}</span></span>`
            ).join('')}
        </div>`;
    })();

    // Pro users get the full drill; free users see their count and a targeted upsell
    if (!isPro && count > 0) {
        return `
        <section class="bg-surface-dark rounded-2xl p-5 border border-accent-red/30 shadow-depth relative overflow-hidden">
            <!-- subtle glow hint -->
            <div class="absolute inset-0 bg-gradient-to-br from-accent-red/5 to-transparent pointer-events-none"></div>
            <div class="relative flex items-start justify-between gap-4 flex-wrap">
                <div class="flex items-center gap-3">
                    <div class="size-10 rounded-xl bg-accent-red/20 flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-accent-red text-lg">psychology_alt</span>
                    </div>
                    <div>
                        <h3 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                            Weak Questions
                            <span class="px-2 py-0.5 rounded-full bg-accent-red/20 text-accent-red border border-accent-red/30 text-xs font-black">${count}</span>
                        </h3>
                        <p class="text-[10px] text-slate-400 mt-0.5">
                            ${count} missed question${count !== 1 ? 's' : ''} from your Daily Doses — ready to drill
                        </p>
                    </div>
                </div>
                <button id="drill-wrong-btn"
                    class="shrink-0 px-5 py-2.5 rounded-xl font-black text-sm bg-accent-red/10 border border-accent-red/40 text-accent-red hover:bg-accent-red/20 active:scale-[.98] transition-all">
                    🔒 Unlock Drill — Go Pro
                </button>
            </div>
            <p class="relative text-[10px] text-slate-500 mt-3 leading-relaxed">
                Upgrade to Pro to target exactly these ${count} gaps and stop repeating the same mistakes.
            </p>
            ${topicBadges}
        </section>`;
    }

    const btnClass = count === 0
        ? 'bg-background-dark border border-border-dark text-slate-600 cursor-not-allowed'
        : 'bg-accent-red text-white hover:brightness-110';

    const btnLabel = count === 0 ? 'No questions yet' : `Drill ${drillCount} Questions →`;

    return `
    <section class="bg-surface-dark rounded-2xl p-5 border ${count > 0 ? 'border-accent-red/30' : 'border-border-dark'} shadow-depth">
        <div class="flex items-start justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-3">
                <div class="size-10 rounded-xl bg-accent-red/20 flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-accent-red text-lg">psychology_alt</span>
                </div>
                <div>
                    <h3 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        Weak Questions
                        ${count > 0 ? `<span class="px-2 py-0.5 rounded-full bg-accent-red/20 text-accent-red border border-accent-red/30 text-xs font-black">${count}</span>` : ''}
                    </h3>
                    <p class="text-[10px] text-slate-500 mt-0.5">
                        ${count > 0
                            ? `${count} question${count !== 1 ? 's' : ''} missed across all sessions, including Daily Dose`
                            : 'Missed answers from practice & Daily Dose are tracked here automatically'}
                    </p>
                </div>
            </div>
            <button id="drill-wrong-btn" ${count === 0 ? 'disabled' : ''}
                class="shrink-0 px-5 py-2.5 rounded-xl font-black text-sm active:scale-[.98] transition-all ${btnClass}">
                ${btnLabel}
            </button>
        </div>
        ${topicBadges}
    </section>`;
}

// ── Main render ────────────────────────────────────────────────────────────────

const DISPLAY_NAME_TO_BUCKET = {
  'Surgery': 'Surgery',
  'Pediatrics': 'Pediatrics',
  'OBGYN': 'OBGYN',
  'Internal Medicine': 'Internal Medicine',
  'Orthopedics': 'Orthopedics',
  'Emergency': 'Emergency Medicine',
  'Family Medicine': 'Family Medicine',
  'Medical Ethics': 'Ethics',
  'Pathology': 'Pathology',
  'Radiology': 'Radiology',
  'Forensic Medicine': 'Forensic Medicine',
};

export function renderDashboard(rootElement) {
    if (!state.user) { navigateTo('login'); return; }

    const uid        = state.user.uid;
    const firstName  = escapeHtml((state.user.name || 'Doctor').split(' ')[0]);
    const isPro      = state.user.isPro || state.user.isPremium;
    const isAdmin    = state.user.email === ADMIN_EMAIL;
    const displayName = escapeHtml(state.user.name || 'Doctor');

    const performance  = fetchPerformanceHistory(uid);
    state.performanceHistory = performance;
    const { totalQuestions, avgScore, streak, readiness } = computeStats(performance);
    const specialtyStats = computeSpecialtyStats(performance);
    const wrongPool      = loadWrongAnswerPool(uid);

    const dailyDone  = checkDailyDoneToday();
    const daysLeft   = getDaysUntilExam(uid);
    const savedJSON  = localStorage.getItem(`activeQuizSession_${uid}`);
    let   savedSession = null;
    try { savedSession = savedJSON ? JSON.parse(savedJSON) : null; } catch {}

    // ── Exam countdown banner ──────────────────────────────────────────────────
    const examBannerHtml = daysLeft !== null ? `
        <div class="flex items-center gap-2 mt-2 text-sm">
            <span class="material-symbols-outlined text-accent-orange text-base">event_available</span>
            <span class="text-slate-400">SMLE in</span>
            <span class="font-black text-accent-orange">${daysLeft} days</span>
            <button id="clear-exam-date-btn" class="text-[10px] text-slate-600 hover:text-slate-400 ml-1 underline">change</button>
        </div>` : `
        <button id="set-exam-date-btn" class="flex items-center gap-1.5 mt-2 text-xs text-slate-500 hover:text-primary transition-colors font-semibold">
            <span class="material-symbols-outlined text-base">event_available</span> Set your SMLE exam date
        </button>`;

    // ── Daily Dose card ────────────────────────────────────────────────────────
    const dailyCardHtml = dailyDone ? `
        <div class="flex flex-col h-full">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2">
                    <div class="size-9 rounded-xl bg-accent-green/20 flex items-center justify-center">
                        <span class="material-symbols-outlined text-accent-green text-lg">task_alt</span>
                    </div>
                    <div>
                        <p class="text-xs font-black text-accent-green uppercase tracking-widest">Done Today</p>
                        <p class="text-[10px] text-slate-500">Daily Dose</p>
                    </div>
                </div>
                <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-accent-green/10 text-accent-green border border-accent-green/30 uppercase">FREE</span>
            </div>
            <div class="flex-1 flex flex-col items-center justify-center py-4 gap-1">
                <p class="text-4xl font-black text-white">${dailyDone.correct ?? dailyDone.score}<span class="text-xl text-slate-500">/${dailyDone.total}</span></p>
                <p class="text-sm text-slate-400">Score · ${dailyDone.score ?? Math.round(((dailyDone.correct ?? 0)/dailyDone.total)*100)}%</p>
            </div>
            <div class="flex items-center justify-between mt-auto pt-3 border-t border-border-dark/50">
                <span class="text-[10px] text-slate-600 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[12px]">schedule</span> Resets in ${timeUntilMidnight()}
                </span>
                ${!isPro ? `<button id="upgrade-from-daily-btn" class="text-[10px] font-bold text-primary hover:underline">Unlimited access →</button>` : `<span class="text-[10px] font-bold text-primary flex items-center gap-1"><span class="material-symbols-outlined text-[11px]">workspace_premium</span>Pro</span>`}
            </div>
        </div>` : `
        <div class="flex flex-col h-full">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2">
                    <div class="size-9 rounded-xl bg-primary/20 flex items-center justify-center">
                        <span class="material-symbols-outlined text-primary text-lg">bolt</span>
                    </div>
                    <div>
                        <p class="text-xs font-black text-white uppercase tracking-widest">Daily Dose</p>
                        <p class="text-[10px] text-slate-500">30 Questions</p>
                    </div>
                </div>
                <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 uppercase">FREE</span>
            </div>
            <div class="flex-1 flex flex-col justify-center gap-1 py-2">
                <p class="text-sm text-slate-300">A curated set of 30 SMLE-style questions, refreshed every midnight.</p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="material-symbols-outlined text-accent-orange text-base">schedule</span>
                    <span class="text-xs text-slate-500">Expires in <strong class="text-slate-300">${timeUntilMidnight()}</strong></span>
                </div>
            </div>
            <button id="daily-dose-btn" class="mt-auto w-full py-3 rounded-xl bg-primary text-background-dark font-black text-sm shadow-glow-primary hover:brightness-110 active:scale-[.98] transition-all">
                Take Today's Dose →
            </button>
        </div>`;

    // ── Free-tier lock chip ────────────────────────────────────────────────────
    const lockHtml = `<span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-accent-orange/10 text-accent-orange border border-accent-orange/30 flex items-center gap-1 uppercase shrink-0"><span class="material-symbols-outlined text-[11px]">lock</span>Pro</span>`;
    const proHtml  = `<span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 uppercase shrink-0">Pro</span>`;

    // ── Readiness ring SVG ─────────────────────────────────────────────────────
    const ringCircumference = 2 * Math.PI * 34; // r=34
    const ringFill = (readiness / 100) * ringCircumference;
    const ringColor = readiness >= 85 ? '#10b981' : readiness >= 60 ? '#f59e0b' : '#ef4444';
    const ringLabel = readiness >= 85 ? 'Exam Ready' : readiness >= 60 ? 'On Track' : 'Keep Going';
    const readinessRing = `
    <svg viewBox="0 0 80 80" width="88" height="88" style="transform:rotate(-90deg)">
        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6"/>
        <circle cx="40" cy="40" r="34" fill="none"
            stroke="${ringColor}" stroke-width="6" stroke-linecap="round"
            stroke-dasharray="${ringCircumference.toFixed(1)}"
            stroke-dashoffset="${(ringCircumference - ringFill).toFixed(1)}"
            style="transition:stroke-dashoffset 1s ease"/>
    </svg>`;

    rootElement.innerHTML = `
    <!-- ── Loading overlay ── -->
    <div id="loading-overlay" class="hidden fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm">
        <div class="bg-surface-dark p-8 rounded-2xl shadow-depth border border-border-dark flex flex-col items-center gap-4">
            <div class="relative size-14">
                <div class="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                <div class="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
                <span class="absolute inset-0 flex items-center justify-center material-symbols-outlined text-primary text-xl">stethoscope</span>
            </div>
            <p class="text-base font-black text-white">Preparing Your Exam…</p>
        </div>
    </div>

    <!-- ── Mobile header ── -->
    <header class="md:hidden flex items-center justify-between px-4 py-3 bg-background-dark border-b border-border-dark sticky top-0 z-30">
        <a href="/" class="flex items-center gap-2 group">
            <img src="/logo.svg" alt="SMLE Pro" class="w-9 h-9 drop-shadow-[0_0_8px_rgba(212,175,55,0.5)] group-hover:drop-shadow-[0_0_14px_rgba(212,175,55,0.8)] transition-all duration-300">
            <span class="text-base font-black text-white">SMLE <span style="color:#D4AF37">Pro</span></span>
        </a>
        <button id="mobile-menu-btn" class="p-2 rounded-xl bg-surface-dark border border-border-dark text-slate-300">
            <span class="material-symbols-outlined">menu</span>
        </button>
    </header>

    <!-- ── Mobile drawer ── -->
    <div id="mobile-drawer" class="md:hidden fixed inset-0 z-40 hidden">
        <div id="mobile-drawer-backdrop" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <aside class="absolute right-0 top-0 h-full w-72 bg-surface-dark border-l border-border-dark flex flex-col p-5 gap-3 overflow-y-auto">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-black text-slate-500 uppercase tracking-widest">Menu</span>
                <button id="mobile-drawer-close" class="p-1.5 rounded-lg hover:bg-border-dark text-slate-500"><span class="material-symbols-outlined text-lg">close</span></button>
            </div>
                <div class="flex items-center gap-3 p-3 rounded-xl bg-background-dark border border-border-dark">
                <div class="size-9 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-primary text-base">person</span>
                </div>
                <div class="min-w-0">
                    <p class="text-sm font-bold text-white truncate">${displayName}</p>
                    <p class="text-[10px] ${isPro ? 'text-primary' : 'text-slate-500'}">${isPro ? '✦ Pro Member' : 'Free Tier'}</p>
                </div>
            </div>
            ${isAdmin ? `
            <button id="admin-stats-btn-mobile" class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-border-dark text-accent-purple font-semibold text-sm transition-colors"><span class="material-symbols-outlined text-base">bar_chart_4_bars</span>Admin Stats</button>
            <button id="admin-moderation-btn-mobile" class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-border-dark text-accent-orange font-semibold text-sm transition-colors"><span class="material-symbols-outlined text-base">flag</span>Flagged questions</button>
            ` : ''}
            <button id="account-btn-mobile" class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-border-dark text-slate-300 font-semibold text-sm transition-colors"><span class="material-symbols-outlined text-base">manage_accounts</span>Account Settings</button>
            <button id="theme-toggle-btn-mobile" class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-border-dark text-slate-300 font-semibold text-sm transition-colors">
                <span class="material-symbols-outlined text-slate-700 dark:hidden text-base">light_mode</span>
                <span class="material-symbols-outlined text-slate-300 hidden dark:inline text-base">dark_mode</span>
                <span>Toggle Theme</span>
            </button>
            <div class="mt-auto pt-3 border-t border-border-dark">
                <button id="signout-btn-mobile" class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent-red/10 text-accent-red font-semibold text-sm transition-colors w-full"><span class="material-symbols-outlined text-base">logout</span>Sign Out</button>
            </div>
        </aside>
    </div>

    <!-- ── App shell ── -->
    <div class="flex min-h-screen">

        <!-- ── Sidebar (desktop) ── -->
        <aside class="hidden md:flex flex-col w-56 shrink-0 fixed top-0 left-0 h-screen bg-surface-dark border-r border-border-dark z-30 overflow-y-auto">

            <!-- Logo -->
            <div class="px-5 py-5 border-b border-border-dark/60">
                <a href="/" class="flex items-center gap-2.5 group">
                    <img src="/logo.svg" alt="SMLE Pro" class="w-10 h-10 shrink-0 drop-shadow-[0_0_10px_rgba(212,175,55,0.5)] group-hover:drop-shadow-[0_0_18px_rgba(212,175,55,0.85)] transition-all duration-300">
                    <span class="text-lg font-black tracking-tight text-white">SMLE <span style="color:#D4AF37">Pro</span></span>
                </a>
            </div>

            <!-- Nav -->
            <nav class="flex-1 px-3 py-4 space-y-1">
                <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-sm">
                    <span class="material-symbols-outlined text-base">dashboard</span> Dashboard
                </div>
                ${isAdmin ? `
                <button id="admin-stats-btn" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-border-dark text-accent-purple font-semibold text-sm transition-colors">
                    <span class="material-symbols-outlined text-base">bar_chart_4_bars</span> Admin Stats
                </button>
                <button id="admin-moderation-btn" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-border-dark text-accent-orange font-semibold text-sm transition-colors">
                    <span class="material-symbols-outlined text-base">flag</span> Flagged questions
                </button>
                ` : ''}
            </nav>

            <!-- User block -->
            <div class="px-3 py-4 border-t border-border-dark/60 space-y-1">
                <div class="flex items-center gap-2.5 px-3 py-2 mb-1">
                    <div class="size-8 shrink-0 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center">
                        <span class="material-symbols-outlined text-primary text-sm">person</span>
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs font-bold text-white truncate">${displayName}</p>
                        <p class="text-[10px] ${isPro ? 'text-primary' : 'text-slate-500'} truncate">${isPro ? '✦ Pro' : 'Free Tier'}</p>
                    </div>
                </div>
                <button id="theme-toggle-btn" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-border-dark text-slate-400 font-semibold text-sm transition-colors">
                    <span class="material-symbols-outlined text-slate-700 dark:hidden text-base">light_mode</span>
                    <span class="material-symbols-outlined text-slate-300 hidden dark:inline text-base">dark_mode</span>
                    <span class="dark:hidden">Light Mode</span>
                    <span class="hidden dark:inline">Dark Mode</span>
                </button>
                <button id="account-btn" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-border-dark text-slate-400 font-semibold text-sm transition-colors">
                    <span class="material-symbols-outlined text-base">manage_accounts</span> Account
                </button>
                <button id="sidebar-signout-btn" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent-red/10 text-accent-red font-semibold text-sm transition-colors">
                    <span class="material-symbols-outlined text-base">logout</span> Sign Out
                </button>
            </div>
        </aside>

        <!-- ── Main content ── -->
        <div class="flex-1 md:ml-56 min-w-0">
            <main class="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-16 space-y-6">
                ${getTrustDisclaimerStripHtml()}

                <!-- ── Hero: Welcome + Readiness ── -->
                <div class="relative overflow-hidden rounded-2xl border border-border-dark bg-surface-dark p-6 md:p-8"
                     style="background:linear-gradient(135deg,rgba(17,180,212,0.07) 0%,rgba(17,180,212,0.02) 50%,transparent 100%);">
                    <!-- Subtle dot grid -->
                    <div class="absolute inset-0 pointer-events-none" style="background-image:radial-gradient(circle,rgba(17,180,212,0.12) 1px,transparent 1px);background-size:24px 24px;opacity:0.5;"></div>

                    <div class="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div class="flex-1 min-w-0">
                            <p class="text-sm text-slate-500 font-semibold">${getGreeting()} · ${new Date().toLocaleDateString('en-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <h1 class="text-3xl md:text-4xl font-black text-white mt-1">
                                Ready, <span class="text-primary">Dr. ${firstName}</span>
                            </h1>
                            ${examBannerHtml}
                            ${savedSession ? `
                            <button id="resume-quiz-btn" class="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-purple text-white font-bold shadow-glow-purple hover:brightness-110 active:scale-[.98] transition-all text-sm">
                                <span class="material-symbols-outlined text-base">play_circle</span> Resume Session
                            </button>` : ''}
                        </div>

                        <!-- Readiness ring -->
                        <div class="flex flex-col items-center gap-1 shrink-0">
                            <div class="relative">
                                ${readinessRing}
                                <div class="absolute inset-0 flex flex-col items-center justify-center" style="transform:rotate(90deg) scaleX(-1) scaleY(-1);">
                                    <span class="text-xl font-black" style="color:${ringColor}">${readiness}%</span>
                                </div>
                            </div>
                            <p class="text-[10px] font-black uppercase tracking-widest" style="color:${ringColor}">${ringLabel}</p>
                            <p class="text-[10px] text-slate-600">SMLE Readiness</p>
                        </div>
                    </div>
                </div>

                <!-- ── Stats strip ── -->
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div class="bg-surface-dark rounded-xl px-4 py-3.5 border border-border-dark flex items-center gap-3">
                        <span class="material-symbols-outlined text-accent-green text-xl shrink-0">analytics</span>
                        <div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Avg Score</p>
                            <p class="text-xl font-black text-white">${avgScore !== null ? avgScore + '%' : '—'}</p>
                        </div>
                    </div>
                    <div class="bg-surface-dark rounded-xl px-4 py-3.5 border border-border-dark flex items-center gap-3">
                        <span class="material-symbols-outlined text-primary text-xl shrink-0">check_circle</span>
                        <div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Answered</p>
                            <p class="text-xl font-black text-white">${totalQuestions.toLocaleString()}</p>
                        </div>
                    </div>
                    <div class="bg-surface-dark rounded-xl px-4 py-3.5 border border-border-dark flex items-center gap-3">
                        <span class="material-symbols-outlined text-accent-orange text-xl shrink-0">local_fire_department</span>
                        <div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Streak</p>
                            <p class="text-xl font-black text-white">${streak}<span class="text-sm font-bold text-slate-500 ml-1">day${streak !== 1 ? 's' : ''}</span></p>
                        </div>
                    </div>
                </div>

                <!-- ── Exam Mode toggle ── -->
                <div class="flex items-center gap-3 bg-surface-dark border border-border-dark rounded-xl px-4 py-3 w-fit">
                    <span class="material-symbols-outlined text-slate-500 text-base">tune</span>
                    <span class="text-xs font-black text-slate-400 uppercase tracking-widest">Exam Mode</span>
                    <label class="relative inline-flex items-center cursor-pointer shrink-0">
                        <input type="checkbox" id="strict-mode-toggle" class="sr-only peer">
                        <div class="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                    <span id="strict-mode-label" class="text-xs font-bold text-slate-300 min-w-[92px]">Instant Feedback</span>
                </div>

                <!-- ── Daily Dose + Practice ── -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <!-- Daily Dose -->
                    <div class="relative overflow-hidden rounded-2xl border ${dailyDone ? 'border-accent-green/40' : 'border-primary/40'} p-5 flex flex-col"
                         style="background:linear-gradient(135deg,${dailyDone ? 'rgba(16,185,129,0.08)' : 'rgba(17,180,212,0.08)'} 0%,rgba(10,20,30,0.6) 100%);">
                        <div class="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none" style="background:radial-gradient(circle,${dailyDone ? 'rgba(16,185,129,0.15)' : 'rgba(17,180,212,0.12)'} 0%,transparent 70%);transform:translate(30%,-30%);"></div>
                        ${dailyCardHtml}
                    </div>

                    <!-- Practice Sessions -->
                    <div class="rounded-2xl border ${isPro ? 'border-border-dark' : 'border-accent-orange/20'} bg-surface-dark p-5 flex flex-col">
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center gap-2">
                                <div class="size-8 rounded-lg bg-accent-orange/20 flex items-center justify-center">
                                    <span class="material-symbols-outlined text-accent-orange text-base">school</span>
                                </div>
                                <div>
                                    <p class="text-xs font-black text-white uppercase tracking-widest">Practice Sessions</p>
                                    <p class="text-[10px] text-slate-500">Timed · Specialty or Mixed</p>
                                </div>
                            </div>
                            ${isPro ? proHtml : lockHtml}
                        </div>

                        <div class="flex-1 grid grid-cols-3 gap-2.5">
                            <button class="session-btn group flex flex-col items-center justify-center py-5 rounded-xl bg-background-dark border ${isPro ? 'border-border-dark hover:border-primary hover:bg-primary/5' : 'border-accent-orange/20'} transition-all gap-1 relative overflow-hidden" data-length="10">
                                <span class="text-3xl font-black text-white group-hover:text-primary transition-colors">10</span>
                                <span class="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Q</span>
                                <span class="text-[9px] text-slate-600 mt-1">Mixed</span>
                                ${!isPro ? `<div class="absolute inset-0 flex items-center justify-center bg-background-dark/50"><span class="material-symbols-outlined text-accent-orange text-base">lock</span></div>` : ''}
                            </button>
                            <button class="session-btn group flex flex-col items-center justify-center py-5 rounded-xl bg-background-dark border ${isPro ? 'border-border-dark hover:border-primary hover:bg-primary/5' : 'border-accent-orange/20'} transition-all gap-1 relative overflow-hidden" data-length="40">
                                <span class="text-3xl font-black text-white group-hover:text-primary transition-colors">40</span>
                                <span class="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Q</span>
                                <span class="text-[9px] text-slate-600 mt-1">Mixed</span>
                                ${!isPro ? `<div class="absolute inset-0 flex items-center justify-center bg-background-dark/50"><span class="material-symbols-outlined text-accent-orange text-base">lock</span></div>` : ''}
                            </button>
                            <button id="start-full-exam-btn" class="group flex flex-col items-center justify-center py-5 rounded-xl bg-background-dark border ${isPro ? 'border-accent-purple/30 hover:border-accent-purple hover:bg-accent-purple/5' : 'border-accent-orange/20'} transition-all gap-1 relative overflow-hidden">
                                <span class="text-3xl font-black text-white group-hover:text-accent-purple transition-colors">100</span>
                                <span class="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Q</span>
                                <span class="text-[9px] text-slate-600 mt-1">Specialty</span>
                                ${!isPro ? `<div class="absolute inset-0 flex items-center justify-center bg-background-dark/50"><span class="material-symbols-outlined text-accent-orange text-base">lock</span></div>` : ''}
                            </button>
                        </div>

                        ${!isPro ? `
                        <button id="upgrade-pro-btn" class="mt-3 w-full py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary font-black text-sm hover:bg-primary/20 active:scale-[.98] transition-all">
                            Unlock Practice Sessions →
                        </button>` : ''}
                    </div>
                </div>

                <!-- ── Weak Questions ── -->
                ${buildWrongAnswerCard(wrongPool, isPro)}

                <!-- ── Analytics: Score Trend + Activity ── -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    <!-- Score Trend (wider) -->
                    <section class="lg:col-span-2 bg-surface-dark rounded-2xl p-5 border border-border-dark">
                        <div class="flex items-center justify-between mb-5">
                            <h3 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary text-base">show_chart</span> Score Trend
                            </h3>
                            <span class="text-[10px] text-slate-500 font-semibold">Last 8 sessions</span>
                        </div>
                        ${buildScoreBars(performance)}
                    </section>

                    <!-- Activity Heatmap (narrower) -->
                    <section class="bg-surface-dark rounded-2xl p-5 border border-border-dark">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <span class="material-symbols-outlined text-accent-orange text-base">grid_view</span> Activity
                            </h3>
                            <span class="text-[10px] text-slate-500 font-semibold">30 days</span>
                        </div>
                        <div class="heatmap-grid mb-3" id="heatmap-grid">${buildHeatmap(performance)}</div>
                        <div class="flex items-center justify-between text-[10px] text-slate-600 pt-2 border-t border-border-dark/40">
                            <span>Less</span>
                            <div class="flex gap-1">
                                ${[0.04, 0.2, 0.45, 0.7, 1].map(o =>
                                    `<div class="w-2.5 h-2.5 rounded-sm" style="background:rgba(17,180,212,${o})"></div>`
                                ).join('')}
                            </div>
                            <span>More</span>
                        </div>
                    </section>
                </div>

                <!-- ── Specialties + Upgrade ── -->
                <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">

                    <section class="lg:col-span-3 bg-surface-dark rounded-2xl p-5 border border-border-dark">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <span class="material-symbols-outlined text-accent-purple text-base">category</span> Specialty Drill
                                <span class="text-[10px] font-semibold text-slate-500 normal-case tracking-normal">10Q per specialty</span>
                            </h3>
                            ${!isPro ? lockHtml : ''}
                        </div>
                        <div id="category-selection-container" class="grid grid-cols-4 gap-2.5"></div>
                    </section>

                    <div class="lg:col-span-2 space-y-4">
                        ${!isPro ? `
                        <section class="rounded-2xl p-5 border border-primary/30 overflow-hidden relative"
                                 style="background:linear-gradient(135deg,rgba(17,180,212,0.12) 0%,rgba(139,92,246,0.08) 100%);">
                            <div class="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none" style="background:radial-gradient(circle,rgba(17,180,212,0.2) 0%,transparent 70%);transform:translate(30%,-30%);"></div>
                            <div class="flex items-center gap-3 mb-4">
                                <div class="size-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                                    <span class="material-symbols-outlined text-primary">workspace_premium</span>
                                </div>
                                <div>
                                    <p class="text-sm font-black text-white">Go Pro</p>
                                    <p class="text-[10px] text-primary">From 149 SAR / month</p>
                                </div>
                            </div>
                            <ul class="space-y-2 mb-4 text-xs text-slate-300">
                                <li class="flex items-center gap-2"><span class="material-symbols-outlined text-accent-green text-sm">check_circle</span> Full question bank access</li>
                                <li class="flex items-center gap-2"><span class="material-symbols-outlined text-accent-green text-sm">check_circle</span> 10Q, 40Q & 100Q sessions</li>
                                <li class="flex items-center gap-2"><span class="material-symbols-outlined text-accent-green text-sm">check_circle</span> Specialty drill cards</li>
                                <li class="flex items-center gap-2"><span class="material-symbols-outlined text-accent-green text-sm">check_circle</span> Weak question pool</li>
                            </ul>
                            <button id="upgrade-pro-btn" class="w-full py-3 rounded-xl bg-primary text-background-dark font-black shadow-glow-primary hover:brightness-110 active:scale-[.98] transition-all text-sm">
                                Upgrade to Pro →
                            </button>
                        </section>` : `
                        <section class="rounded-2xl p-5 border border-accent-green/20 bg-surface-dark">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="size-10 rounded-xl bg-accent-green/20 flex items-center justify-center">
                                    <span class="material-symbols-outlined text-accent-green">workspace_premium</span>
                                </div>
                                <div>
                                    <p class="text-sm font-black text-white">Pro Member</p>
                                    <p class="text-[10px] text-accent-green">Full access active</p>
                                </div>
                            </div>
                            <p class="text-xs text-slate-500">You have access to all questions, sessions, and analytics. Keep your streak going!</p>
                        </section>`}
                    </div>
                </div>

            </main>
        </div>
    </div>

    <!-- ── Account Modal ── -->
    <div id="account-modal" class="hidden fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-surface-dark w-full max-w-md rounded-2xl shadow-depth border border-border-dark overflow-hidden" role="dialog">
            <div class="p-5 border-b border-border-dark flex items-center justify-between bg-background-dark/50">
                <h3 class="text-base font-black text-white flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary">person</span> Your account
                </h3>
                <button id="account-modal-close" class="p-2 rounded-lg hover:bg-border-dark text-slate-500 transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="p-5 space-y-4">
                <div>
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</p>
                    <p id="account-modal-email" class="text-sm font-medium text-slate-200 break-all mt-1"></p>
                </div>
                <div>
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Plan</p>
                    <p class="text-sm font-bold ${isPro ? 'text-primary' : 'text-slate-400'}">${isPro ? '✦ Pro Member' : 'Free Tier'}</p>
                </div>
                <div>
                    <label for="account-display-name" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Display name</label>
                    <input id="account-display-name" type="text" maxlength="80" autocomplete="name"
                        class="mt-1 w-full px-3 py-2.5 rounded-xl border border-border-dark bg-background-dark text-white text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                </div>
                <div>
                    <label for="account-exam-date" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SMLE exam date</label>
                    <input id="account-exam-date" type="date"
                        class="mt-1 w-full px-3 py-2.5 rounded-xl border border-border-dark bg-background-dark text-white text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                    <p class="text-[10px] text-slate-500 mt-1">Shows a countdown on your dashboard.</p>
                </div>
                <div id="account-save-error" class="hidden text-sm text-accent-red font-medium"></div>
                <div class="flex flex-col sm:flex-row gap-3 pt-1">
                    <button id="account-save-btn" class="flex-1 py-3 rounded-xl bg-primary text-background-dark font-black hover:brightness-110 transition-all text-sm">Save</button>
                    <button id="account-signout-btn" class="flex-1 py-3 rounded-xl border border-accent-red/40 text-accent-red font-bold hover:bg-accent-red/10 transition-all text-sm">Log out</button>
                </div>
            </div>
        </div>
    </div>

    <!-- ── Topic Selection Modal ── -->
    <div id="topic-selection-modal" class="hidden fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-surface-dark w-full max-w-lg rounded-2xl shadow-depth overflow-hidden border border-border-dark flex flex-col">
            <div class="p-5 border-b border-border-dark flex items-center justify-between bg-background-dark/50">
                <h3 class="text-base font-black text-white flex items-center gap-3">
                    <span class="material-symbols-outlined text-accent-purple bg-accent-purple/10 p-2 rounded-lg">category</span> Choose Specialty
                </h3>
                <button class="close-modal-btn p-2 rounded-lg hover:bg-border-dark transition-colors text-slate-500">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="p-5">
                <p class="text-sm text-slate-400 mb-4">100-question SMLE simulation. Choose a specialty or take a mixed exam.</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="modal-topics-container">
                    <div class="col-span-full flex justify-center py-4">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    // ── Post-render init ──────────────────────────────────────────────────────
    renderCategoryFilters(isPro, specialtyStats);
    loadDynamicTopics();
    initializeThemeSwitch();

    // ── Event listeners ───────────────────────────────────────────────────────

    // Strict mode toggle — updates label live
    const strictToggle = document.getElementById('strict-mode-toggle');
    const strictLabel  = document.getElementById('strict-mode-label');
    function updateStrictLabel() {
        if (strictLabel) strictLabel.textContent = strictToggle?.checked ? 'Strict Mode' : 'Instant Feedback';
    }
    strictToggle?.addEventListener('change', updateStrictLabel);
    updateStrictLabel();

    // Mobile drawer
    const mobileDrawer = document.getElementById('mobile-drawer');
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => mobileDrawer?.classList.remove('hidden'));
    document.getElementById('mobile-drawer-close')?.addEventListener('click', () => mobileDrawer?.classList.add('hidden'));
    document.getElementById('mobile-drawer-backdrop')?.addEventListener('click', () => mobileDrawer?.classList.add('hidden'));
    document.getElementById('admin-stats-btn-mobile')?.addEventListener('click', () => navigateTo('admin-stats'));
    document.getElementById('admin-moderation-btn-mobile')?.addEventListener('click', () => navigateTo('admin-moderation'));
    document.getElementById('account-btn-mobile')?.addEventListener('click', () => { mobileDrawer?.classList.add('hidden'); openAccountModal(); });
    document.getElementById('theme-toggle-btn-mobile')?.addEventListener('click', () => { document.getElementById('theme-toggle-btn')?.click(); });
    document.getElementById('signout-btn-mobile')?.addEventListener('click', async () => {
        try { await signOut(auth); navigateTo('landing'); } catch {}
    });

    // Sidebar sign out
    document.getElementById('sidebar-signout-btn')?.addEventListener('click', async () => {
        try { await signOut(auth); navigateTo('landing'); } catch {}
    });

    // Add error handling for button event listeners
    try {
        document.getElementById('daily-dose-btn')?.addEventListener('click', () => startDailyDose());
    } catch (e) {
        console.error('Failed to attach daily dose button listener:', e);
    }
    
    try {
        const upgradeFromDailyBtn = document.getElementById('upgrade-from-daily-btn');
        if (upgradeFromDailyBtn) {
            upgradeFromDailyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo('pricing');
            });
        }
    } catch (e) {
        console.error('Failed to attach upgrade from daily button listener:', e);
    }
    
    try {
        const upgradeProBtns = document.querySelectorAll('#upgrade-pro-btn');
        upgradeProBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo('pricing');
            });
        });
    } catch (e) {
        console.error('Failed to attach upgrade pro button listener:', e);
    }

    document.getElementById('drill-wrong-btn')?.addEventListener('click', () => {
        if (!isPro) { navigateTo('pricing'); return; }
        const pool = loadWrongAnswerPool(uid);
        if (!pool.length) return;

        // Sort by most-missed first, cap at 20 per session
        const drillQuestions = [...pool]
            .sort((a, b) => (b.wrongCount || 1) - (a.wrongCount || 1))
            .slice(0, 20);

        state.quizConfig = {
            topic: 'Weak Questions',
            numQuestions: drillQuestions.length,
            isStrictMode: false,
            mode: 'wrong-answers',
        };
        state.quizSession = {
            currentQuestionIndex: 0,
            userAnswers: {},
            flaggedQuestions: new Set(),
            startTime: null,
            totalTime: 0,
            isFinished: false,
            questions: drillQuestions,
            analytics: null,
        };
        navigateTo('quiz');
    });
    document.getElementById('admin-stats-btn')?.addEventListener('click', () => navigateTo('admin-stats'));
    document.getElementById('admin-moderation-btn')?.addEventListener('click', () => navigateTo('admin-moderation'));

    document.getElementById('start-full-exam-btn')?.addEventListener('click', () => {
        if (!isPro) { navigateTo('pricing'); return; }
        document.getElementById('topic-selection-modal').classList.remove('hidden');
    });

    document.querySelector('.close-modal-btn')?.addEventListener('click', () => {
        document.getElementById('topic-selection-modal').classList.add('hidden');
    });

    document.getElementById('modal-topics-container').addEventListener('click', (e) => {
        const btn = e.target.closest('.topic-btn');
        if (!btn) return;
        document.getElementById('topic-selection-modal').classList.add('hidden');
        const isStrict = document.getElementById('strict-mode-toggle')?.checked ?? false;
        startQuiz(btn.dataset.topic, '100', isStrict);
    });

    document.querySelectorAll('.session-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const len = parseInt(e.currentTarget.dataset.length, 10);
            if (!isPro) { navigateTo('pricing'); return; }
            const isStrict = document.getElementById('strict-mode-toggle')?.checked ?? false;
            startQuiz('All Topics', len, isStrict);
        });
    });

    document.getElementById('category-selection-container').addEventListener('click', (e) => {
        const card = e.target.closest('.category-card');
        if (!card) return;
        if (!isPro) { navigateTo('pricing'); return; }
        const isStrict = document.getElementById('strict-mode-toggle')?.checked ?? false;
        startQuiz(card.dataset.topic, '10', isStrict);
    });

    if (savedSession) {
        document.getElementById('resume-quiz-btn')?.addEventListener('click', () => resumeQuiz(savedSession));
    }

    // Exam date shortcuts
    document.getElementById('set-exam-date-btn')?.addEventListener('click', openAccountModal);
    document.getElementById('clear-exam-date-btn')?.addEventListener('click', () => {
        setExamDate(uid, '');
        renderDashboard(rootElement);
    });

    // ── Account modal ─────────────────────────────────────────────────────────
    const accountModal = document.getElementById('account-modal');

    function openAccountModal() {
        if (!accountModal || !auth.currentUser) return;
        const errEl = document.getElementById('account-save-error');
        if (errEl) { errEl.classList.add('hidden'); errEl.textContent = ''; }
        document.getElementById('account-modal-email').textContent = auth.currentUser.email || '';
        document.getElementById('account-display-name').value = state.user?.name || auth.currentUser.displayName || '';
        document.getElementById('account-exam-date').value = getExamDate(uid);
        accountModal.classList.remove('hidden');
    }

    document.getElementById('account-btn')?.addEventListener('click', openAccountModal);
    document.getElementById('account-modal-close')?.addEventListener('click', () => accountModal.classList.add('hidden'));
    accountModal?.addEventListener('click', (e) => { if (e.target === accountModal) accountModal.classList.add('hidden'); });

    document.getElementById('account-save-btn')?.addEventListener('click', async () => {
        if (!auth.currentUser || !state.user) return;
        const errEl = document.getElementById('account-save-error');
        errEl.classList.add('hidden'); errEl.textContent = '';

        const newName = (document.getElementById('account-display-name').value || '').trim();
        const newExam = document.getElementById('account-exam-date').value || '';

        try {
            await updateProfile(auth.currentUser, { displayName: newName || null });
            await setDoc(doc(firestore, 'users', uid), { displayName: newName, profileUpdatedAt: serverTimestamp() }, { merge: true });
            state.user.name = newName || null;
            if (newExam) setExamDate(uid, newExam); else setExamDate(uid, '');
            accountModal.classList.add('hidden');
            renderDashboard(rootElement);
        } catch (err) {
            console.error('Account save failed:', err);
            errEl.textContent = 'Could not save. Please try again.';
            errEl.classList.remove('hidden');
        }
    });

    document.getElementById('account-signout-btn')?.addEventListener('click', async () => {
        try { await signOut(auth); accountModal.classList.add('hidden'); navigateTo('landing'); }
        catch (err) { console.error('Sign out failed:', err); }
    });
}

// ── Quiz starter ───────────────────────────────────────────────────────────────

async function startQuiz(topic, sessionLength, isStrictMode) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('hidden');

    localStorage.removeItem(`activeQuizSession_${state.user.uid}`);
    sessionStorage.removeItem('cachedQuizSession');

    state.quizConfig  = { topic, numQuestions: parseInt(sessionLength, 10), isStrictMode };
    state.quizSession = {
        currentQuestionIndex: 0, userAnswers: {}, flaggedQuestions: new Set(),
        startTime: null, totalTime: 0, isFinished: false, questions: [], analytics: null,
    };
    navigateTo('quiz');
}

function resumeQuiz(savedSession) {
    if (!savedSession?.quizConfig || !savedSession?.quizSession) return;
    state.quizConfig  = savedSession.quizConfig;
    state.quizSession = {
        ...savedSession.quizSession,
        flaggedQuestions: new Set(savedSession.quizSession.flaggedQuestions),
        startTime: Date.now() - savedSession.quizSession.totalTime,
    };
    navigateTo('quiz');
}

// ── Specialty filter ───────────────────────────────────────────────────────────

function renderCategoryFilters(isPro, specialtyStats = {}) {
    const container = document.getElementById('category-selection-container');
    if (!container) return;

    const topics = [
        { name: 'Surgery',           icon: 'content_cut',     color: 'accent-orange' },
        { name: 'Pediatrics',        icon: 'child_care',      color: 'accent-green'  },
        { name: 'OBGYN',             icon: 'female',          color: 'accent-purple' },
        { name: 'Internal Medicine', icon: 'stethoscope',     color: 'primary'       },
        { name: 'Orthopedics',       icon: 'skeleton',        color: 'accent-orange' },
        { name: 'Emergency',         icon: 'emergency',       color: 'accent-red'    },
        { name: 'Family Medicine',   icon: 'groups',          color: 'accent-green'  },
        { name: 'Medical Ethics',    icon: 'gavel',           color: 'accent-purple' },
        { name: 'Pathology',         icon: 'biotech',         color: 'accent-orange' },
        { name: 'Radiology',         icon: 'radiology_search', color: 'primary'       },
        { name: 'Forensic Medicine', icon: 'health_and_safety', color: 'accent-red'    },
    ];

    container.innerHTML = topics.map(t => {
        // Map display name to the bucket key used by computeSpecialtyStats
        const bucketKey = DISPLAY_NAME_TO_BUCKET[t.name] || t.name;
        const s = specialtyStats[bucketKey];
        const hasStat = s && s.total > 0;
        const pct = hasStat ? s.pct : null;
        const barColor = pct === null ? '' : pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
        const barWidth = pct !== null ? pct : 0;
        return `
        <div class="category-card group cursor-pointer p-3 rounded-xl bg-background-dark border ${isPro ? 'border-border-dark hover:border-' + t.color + '/60 hover:bg-' + t.color + '/5' : 'border-border-dark/40 opacity-50 cursor-not-allowed'} transition-all flex flex-col items-center text-center gap-2" data-topic="${t.name}">
            <div class="size-8 rounded-lg bg-${t.color}/10 flex items-center justify-center ${isPro ? 'group-hover:scale-110' : ''} transition-transform">
                <span class="material-symbols-outlined text-${t.color} text-lg">${t.icon}</span>
            </div>
            <span class="text-[10px] font-bold text-slate-400 leading-tight">${t.name.replace('Internal Medicine', 'Int. Med').replace(' Medicine', ' Med')}</span>
            ${pct !== null ? `
            <div class="w-full">
                <div class="w-full bg-border-dark rounded-full h-1">
                    <div class="h-1 rounded-full transition-all duration-700" style="width:${barWidth}%;background:${barColor}"></div>
                </div>
                <span class="text-[9px] font-black" style="color:${barColor}">${pct}%</span>
            </div>` : `<span class="text-[9px] text-slate-700">No data</span>`}
        </div>`;
    }).join('');
}

// ── Dynamic topic loader ───────────────────────────────────────────────────────

const DEFAULT_TOPICS = ['Surgery','Pediatrics','OBGYN','Internal Medicine','Orthopedics','Emergency','Family Medicine','Medical Ethics','Pathology','Radiology','Forensic Medicine'];
const ICON_MAP = {
    'Emergency Medicine': 'emergency', Emergency: 'emergency', Anesthesia: 'masks',
    'Internal Medicine': 'stethoscope', Surgery: 'content_cut', Pediatrics: 'child_care',
    OBGYN: 'female', Orthopedics: 'skeleton',
    'Family Medicine': 'groups', 'Medical Ethics': 'gavel', Pathology: 'biotech',
    Radiology: 'radiology_search', 'Forensic Medicine': 'health_and_safety',
};

async function loadDynamicTopics() {
    const container = document.getElementById('modal-topics-container');
    if (!container) return;

    function renderTopicButtons(topics) {
        container.innerHTML = topics.map(t => `
        <button class="topic-btn group p-4 rounded-xl text-left bg-background-dark border border-border-dark hover:border-primary hover:bg-primary/5 transition-all font-bold text-slate-300 flex items-center gap-3" data-topic="${t}">
            <span class="material-symbols-outlined text-slate-500 group-hover:text-primary">${ICON_MAP[t] || 'medical_services'}</span>
            ${t.replace(' Medicine', ' Med')}
        </button>`).join('') + `
        <button class="topic-btn group p-4 rounded-xl text-left bg-primary/10 border border-primary/40 hover:bg-primary/20 transition-all font-black text-primary flex items-center gap-3 sm:col-span-2" data-topic="Mixed/All">
            <span class="material-symbols-outlined">shuffle</span> Mixed / All Topics
        </button>`;
    }

    try {
        const snap = await getDoc(doc(firestore, 'metadata', 'app_config'));
        const topics = (snap.exists() && Array.isArray(snap.data().active_topics) && snap.data().active_topics.length)
            ? snap.data().active_topics
            : DEFAULT_TOPICS;
        renderTopicButtons(topics);
    } catch {
        renderTopicButtons(DEFAULT_TOPICS);
    }
}
