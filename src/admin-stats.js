import { navigateTo, state, firestore, functions } from './app.js';
import { ADMIN_EMAIL } from './dashboard.js';
import { doc, getDoc, collection, getCountFromServer } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { initializeThemeSwitch } from './theme.js';

/** Firebase Console (same project as src/app.js). Deep-links for Analytics after GA is enabled. */
const FIREBASE_PROJECT_ID = 'smle-mock-exam-51478532-5ae31';
const FIREBASE_ANALYTICS_URL = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/analytics`;
const FIREBASE_DEBUGVIEW_URL = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/analytics/debugview`;
const GA4_HOME_URL = 'https://analytics.google.com/analytics/web/';

/** Only https URLs for iframe src (metadata/analytics.embedUrl). */
function safeAnalyticsEmbedUrl(raw) {
    if (typeof raw !== 'string') return '';
    const t = raw.trim();
    if (!t) return '';
    try {
        const u = new URL(t);
        return u.protocol === 'https:' ? u.href : '';
    } catch {
        return '';
    }
}

export async function renderAdminStats(rootElement) {
    if (!state.user || state.user.email !== ADMIN_EMAIL) {
        navigateTo('dashboard');
        return;
    }

    // Skeleton while loading
    rootElement.innerHTML = `
    <div class="min-h-screen bg-background-dark flex items-center justify-center">
        <div class="flex flex-col items-center gap-3">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p class="text-sm text-slate-400 font-semibold">Loading stats…</p>
        </div>
    </div>`;

    // ── Fetch data  (server-side counts + site_stats + questions) ─────────────
    let totalUsers = '—';
    let totalQuestions = '—';
    let totalProUsers = '—';
    let totalFreeUsers = '—';
    let newUsersThisWeek = '—';
    let questionsAnsweredToday = '—';
    let dailyDoseCompletionsToday = '—';
    let lastUpdated = null;
    /** Optional Looker Studio / GA embed URL from metadata/analytics (set in Console). */
    let analyticsEmbedUrl = '';
    /** Quality report */
    let qualityReport = null;

    // 1. Populate site_stats via callable (runs with Admin SDK — bypasses rules)
    try {
        const refreshFn = httpsCallable(functions, 'refreshAdminStats');
        await refreshFn();
    } catch (e) {
        console.warn('[Admin] refreshAdminStats failed (site_stats may be stale):', e.message);
    }

    // 2. Read everything from site_stats (computed server-side)
    try {
        const statsSnap = await getDoc(doc(firestore, 'metadata', 'site_stats'));
        if (statsSnap.exists()) {
            const d = statsSnap.data();
            totalUsers         = d.totalUsers?.toLocaleString() ?? '—';
            totalProUsers      = d.premiumUsers?.toLocaleString() ?? '—';
            totalFreeUsers     = d.freeUsers?.toLocaleString() ?? '—';
            newUsersThisWeek   = d.newUsersThisWeek?.toLocaleString() ?? '—';
            questionsAnsweredToday = d.questionsAnsweredToday ?? '—';
            dailyDoseCompletionsToday = d.dailyDoseCompletionsToday ?? '—';
            lastUpdated        = d.lastUpdated?.toDate?.() ?? null;
        }
    } catch (e) { console.warn('[Admin] site_stats read failed:', e.message); }

    // 3. Questions count — admin email has direct read access per security rules
    try {
        const qCount = await getCountFromServer(collection(firestore, 'questions'));
        totalQuestions = qCount.data().count.toLocaleString();
    } catch (e) { console.warn('[Admin] questions count failed:', e.message); }

    // 4. Read quality report (cached audit)
    try {
        const qSnap = await getDoc(doc(firestore, 'metadata', 'quality_report'));
        if (qSnap.exists()) qualityReport = qSnap.data();
    } catch (e) { console.warn('[Admin] quality_report read failed:', e.message); }

    // 4. Analytics embed URL (metadata/analytics)
    try {
        const analyticsSnap = await getDoc(doc(firestore, 'metadata', 'analytics'));
        if (analyticsSnap.exists()) {
            const d = analyticsSnap.data();
            analyticsEmbedUrl = safeAnalyticsEmbedUrl(d.embedUrl);
        }
    } catch (e) { console.warn('[Admin] metadata/analytics read failed:', e.message); }

    // Calculate conversion rate from actual Pro count
    const premiumCount = parseInt(String(totalProUsers).replace(/,/g, ''), 10) || 0;
    const totalUsersCount = parseInt(String(totalUsers).replace(/,/g, ''), 10) || 1;
    const conversionRate = premiumCount > 0 
        ? Math.round((premiumCount / totalUsersCount) * 100) + '%'
        : '0%';

    // ── Render ─────────────────────────────────────────────────────────────────
    rootElement.innerHTML = `
    <div class="max-w-[1200px] mx-auto px-4 md:px-8 w-full pb-16">

        <!-- Header -->
        <header class="flex items-center justify-between py-5 border-b border-border-dark/50 mb-8">
            <div class="flex items-center gap-3">
                <img src="/logo.svg" alt="SMLE Pro" class="w-10 h-10 drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]">
                <div>
                    <h2 class="text-xl font-black text-white">Admin <span class="text-accent-purple">Stats</span></h2>
                    <p class="text-[10px] text-slate-500">SMLE Pro · Operator Dashboard</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                ${lastUpdated ? `<span class="text-[10px] text-slate-500 hidden sm:inline">Updated ${lastUpdated.toLocaleDateString('en-SA', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</span>` : ''}
                <button id="theme-toggle-btn" class="p-2.5 rounded-xl bg-surface-dark border border-border-dark hover:border-primary transition-all">
                    <span class="material-symbols-outlined text-slate-300 hidden dark:inline">dark_mode</span>
                    <span class="material-symbols-outlined text-slate-700 dark:hidden">light_mode</span>
                </button>
                <button type="button" id="admin-flagged-btn" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-dark border border-accent-orange/40 text-sm font-bold text-accent-orange hover:bg-accent-orange/10 transition-all">
                    <span class="material-symbols-outlined text-base">flag</span> Flagged questions
                </button>
                <button id="back-btn" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-dark border border-border-dark text-sm font-bold text-slate-300 hover:border-primary transition-all">
                    <span class="material-symbols-outlined text-base">arrow_back</span> Dashboard
                </button>
            </div>
        </header>

        <!-- ── Top KPI grid ── -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            ${[
                { label: 'Total Users',     value: totalUsers,     icon: 'group',           color: 'primary'       },
                { label: 'Pro Members',      value: totalProUsers,  icon: 'workspace_premium', color: 'accent-orange' },
                { label: 'Conversion Rate',  value: conversionRate, icon: 'trending_up',     color: 'accent-green'  },
                { label: 'Questions in DB',  value: totalQuestions, icon: 'quiz',             color: 'accent-purple' },
            ].map(kpi => `
            <div class="bg-surface-dark rounded-2xl p-4 border border-border-dark shadow-depth">
                <div class="flex items-start justify-between mb-3">
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">${kpi.label}</p>
                    <span class="material-symbols-outlined text-${kpi.color} text-base">${kpi.icon}</span>
                </div>
                <p class="text-3xl font-black text-white">${kpi.value}</p>
            </div>`).join('')}
        </div>

        <!-- ── User breakdown & activity ── -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-surface-dark rounded-2xl p-5 border border-border-dark shadow-depth flex items-center gap-4">
                <div class="size-12 shrink-0 rounded-full bg-primary/15 flex items-center justify-center">
                    <span class="material-symbols-outlined text-primary text-2xl">person</span>
                </div>
                <div>
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Free Users</p>
                    <p class="text-2xl font-black text-white mt-0.5">${totalFreeUsers}</p>
                    <p class="text-[10px] text-slate-600 mt-0.5">Non-paying accounts</p>
                </div>
            </div>
            <div class="bg-surface-dark rounded-2xl p-5 border border-border-dark shadow-depth flex items-center gap-4">
                <div class="size-12 shrink-0 rounded-full bg-accent-green/15 flex items-center justify-center">
                    <span class="material-symbols-outlined text-accent-green text-2xl">person_add</span>
                </div>
                <div>
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">New This Week</p>
                    <p class="text-2xl font-black text-white mt-0.5">${newUsersThisWeek}</p>
                    <p class="text-[10px] text-slate-600 mt-0.5">Last 7 days signups</p>
                </div>
            </div>
            <div class="bg-surface-dark rounded-2xl p-5 border border-border-dark shadow-depth flex items-center gap-4">
                <div class="size-12 shrink-0 rounded-full bg-accent-purple/15 flex items-center justify-center">
                    <span class="material-symbols-outlined text-accent-purple text-2xl">bolt</span>
                </div>
                <div>
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Daily Dose Today</p>
                    <p class="text-2xl font-black text-white mt-0.5">${dailyDoseCompletionsToday}</p>
                    <p class="text-[10px] text-slate-600 mt-0.5">Completed doses</p>
                </div>
            </div>
        </div>

        <!-- ── Revenue estimate ── -->
        <div class="bg-surface-dark rounded-2xl p-5 border border-border-dark shadow-depth mb-6">
            <h3 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 mb-4">
                <span class="material-symbols-outlined text-accent-green text-base">payments</span> Revenue Estimate
            </h3>
            ${(() => {
                const proCount = parseInt(String(totalProUsers).replace(/,/g, ''), 10) || 0;
                if (proCount > 0) {
                    const monthly = proCount * 49;
                    const annual  = monthly * 12;
                    return `
                    <div class="space-y-3">
                        <div class="flex items-center justify-between p-3 rounded-xl bg-background-dark border border-border-dark">
                            <span class="text-sm text-slate-400">Monthly (${proCount} × 49 SAR)</span>
                            <span class="text-base font-black text-accent-green">${monthly.toLocaleString()} SAR</span>
                        </div>
                        <div class="flex items-center justify-between p-3 rounded-xl bg-background-dark border border-border-dark">
                            <span class="text-sm text-slate-400">Annual run rate</span>
                            <span class="text-base font-black text-accent-green">${annual.toLocaleString()} SAR</span>
                        </div>
                        <p class="text-[10px] text-slate-600">Based on current Pro members × 49 SAR/month.</p>
                    </div>`;
                }
                return `<p class="text-slate-500 text-sm">No Pro members yet. Revenue will appear here once users upgrade.</p>`;
            })()}
        </div>

        <!-- ── Blueprint Coverage Monitor ── -->
        <div class="bg-surface-dark rounded-2xl p-5 border border-border-dark shadow-depth mb-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-base">pie_chart</span> Blueprint Coverage
                </h3>
                <span class="text-sm font-black text-white">${totalQuestions} questions</span>
            </div>
            ${qualityReport && qualityReport.blueprint ? qualityReport.blueprint.map(d => {
                const pct = d.pct || 0;
                const offTarget = Math.abs(pct - d.weight);
                const status = offTarget <= 3 ? '✅' : '⚠️';
                const barColor = d.label === 'Medicine' ? '#11B4D4' : d.label === 'OBGYN' ? '#D4AF37' : d.label === 'Pediatrics' ? '#10B981' : '#F59E0B';
                const subHtml = (d.subtopics || []).slice(0, 5).map(s =>
                    `<div class="flex items-center justify-between text-[10px] text-slate-500 ml-4 py-0.5 border-b border-border-dark/20">
                        <span>${s.name}</span>
                        <span class="font-semibold text-slate-400">${s.count}</span>
                    </div>`
                ).join('');
                return `
                <div class="mb-4">
                    <div class="flex items-center justify-between mb-1">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${barColor}"></span>
                            <span class="text-sm font-bold text-white">${d.label}</span>
                            <span class="text-[10px] text-slate-500">${d.count} questions (${pct}%)</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-semibold ${status === '✅' ? 'text-accent-green' : 'text-accent-orange'}">${status} target ${d.weight}%</span>
                        </div>
                    </div>
                    <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-1">
                        <div class="h-full rounded-full transition-all" style="width:${Math.max(2, pct)}%;background:${barColor}"></div>
                    </div>
                    <details class="mt-1">
                        <summary class="text-[10px] text-slate-600 cursor-pointer hover:text-slate-400">${d.subtopics ? d.subtopics.length : 0} subspecialties</summary>
                        ${subHtml || '<div class="text-[10px] text-slate-600 ml-4">No subtopic data</div>'}
                    </details>
                </div>`;
            }).join('') : '<div class="text-sm text-slate-500">Run the quality audit to see blueprint coverage.</div>'}
        </div>

        <!-- ── Saudi Content Dashboard ── -->
        <div class="bg-surface-dark rounded-2xl p-5 border border-border-dark shadow-depth mb-6">
            <h3 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 mb-4">
                <span class="material-symbols-outlined text-accent-green text-base">public</span> Saudi Content
            </h3>
            ${qualityReport && qualityReport.saudi ? `
            <div class="space-y-2">
                ${qualityReport.saudi.map(s => {
                    const barW = Math.max(4, Math.round((s.count / 30) * 100));
                    return `
                    <div class="flex items-center gap-3">
                        <span class="text-xs text-slate-300 w-28 shrink-0 font-medium">${s.name}</span>
                        <div class="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                            <div class="h-full rounded-full bg-accent-green" style="width:${barW}%"></div>
                        </div>
                        <span class="text-xs font-bold text-slate-400 w-8 text-right">${s.count}</span>
                    </div>`;
                }).join('')}
                <div class="pt-3 mt-3 border-t border-border-dark/50 flex items-center justify-between">
                    <span class="text-xs text-slate-500">Total Saudi-specific questions</span>
                    <span class="text-sm font-black text-white">${qualityReport.saudi.reduce((a, s) => a + s.count, 0)}</span>
                </div>
            </div>` : '<div class="text-sm text-slate-500">Run the quality audit to see Saudi content.</div>'}
        </div>

        <!-- ── Quality Report ── -->
        <div class="bg-surface-dark rounded-2xl p-5 border border-border-dark shadow-depth mb-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span class="material-symbols-outlined text-accent-purple text-base">checklist</span> Quality Report
                </h3>
                <button id="run-quality-audit-btn" class="px-4 py-2 rounded-xl bg-accent-purple text-white font-bold text-xs hover:brightness-110 active:scale-[.98] transition-all">
                    <span class="material-symbols-outlined text-sm align-text-bottom">refresh</span> Run Audit
                </button>
            </div>
            ${qualityReport && qualityReport.quality ? `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div class="p-3 rounded-xl bg-background-dark border border-border-dark text-center">
                    <p class="text-xs text-slate-500 mb-1">Schema Issues</p>
                    <p class="text-lg font-black ${qualityReport.quality.schemaIssues === 0 ? 'text-accent-green' : 'text-accent-red'}">${qualityReport.quality.schemaIssues}</p>
                </div>
                <div class="p-3 rounded-xl bg-background-dark border border-border-dark text-center">
                    <p class="text-xs text-slate-500 mb-1">Missing Rationales</p>
                    <p class="text-lg font-black ${qualityReport.quality.missingRationale === 0 ? 'text-accent-green' : 'text-accent-red'}">${qualityReport.quality.missingRationale}</p>
                </div>
                <div class="p-3 rounded-xl bg-background-dark border border-border-dark text-center">
                    <p class="text-xs text-slate-500 mb-1">Duplicate Vignettes</p>
                    <p class="text-lg font-black ${qualityReport.quality.duplicates === 0 ? 'text-accent-green' : 'text-accent-orange'}">${qualityReport.quality.duplicates}</p>
                </div>
                <div class="p-3 rounded-xl bg-background-dark border border-border-dark text-center">
                    <p class="text-xs text-slate-500 mb-1">Answer Balance</p>
                    <p class="text-lg font-black ${qualityReport.quality.balanceOk ? 'text-accent-green' : 'text-accent-orange'}">${qualityReport.quality.balanceOk ? '✅' : '⚠️'}</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="p-3 rounded-xl bg-background-dark border border-border-dark">
                    <p class="text-[10px] text-slate-500 mb-2 font-semibold uppercase tracking-wider">Answer Distribution</p>
                    <div class="flex items-center gap-2">
                        ${['A','B','C','D'].map(l => {
                            const p = qualityReport.quality.answerBalance[l] || 0;
                            const color = p >= 20 && p <= 30 ? 'text-accent-green' : 'text-accent-red';
                            return `<div class="flex-1 text-center"><span class="text-xs font-black ${color}">${p}%</span><p class="text-[9px] text-slate-600">${l}</p></div>`;
                        }).join('')}
                    </div>
                </div>
                <div class="p-3 rounded-xl bg-background-dark border border-border-dark">
                    <p class="text-[10px] text-slate-500 mb-2 font-semibold uppercase tracking-wider">Difficulty</p>
                    <div class="flex items-center gap-2">
                        ${[['Easy','#10B981'],['Moderate','#F59E0B'],['Hard','#EF4444']].map(([label, color]) => {
                            const c = qualityReport.quality.difficulty[label] || 0;
                            return `<div class="flex-1 text-center"><span class="text-xs font-black" style="color:${color}">${c}</span><p class="text-[9px] text-slate-600">${label}</p></div>`;
                        }).join('')}
                    </div>
                </div>
            </div>
            <p class="text-[10px] text-slate-600">${qualityReport.refreshedAt ? 'Last audited: ' + new Date(qualityReport.refreshedAt.seconds * 1000).toLocaleString() : ''}</p>
            ` : '<div class="text-sm text-slate-500">No audit data yet. Click "Run Audit" to scan the question bank.</div>'}
        </div>

        <!-- ── Google Analytics (Firebase / GA4) — opens official dashboards in new tabs; optional embed ── -->
        <div class="bg-surface-dark rounded-2xl p-5 border border-border-dark shadow-depth mb-6 border-primary/20">
            <h3 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-primary text-base">monitoring</span> Google Analytics
            </h3>
            <p class="text-xs text-slate-500 mb-4 leading-relaxed">
                Visitor and event data is stored in <strong class="text-slate-400">Firebase Analytics / GA4</strong>, not in this app. Use the links below to open the same dashboards you’d use in the browser — or embed a Looker Studio report below.
            </p>
            <div class="flex flex-wrap gap-3 mb-4">
                <a href="${FIREBASE_ANALYTICS_URL}" target="_blank" rel="noopener noreferrer"
                   class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/15 border border-primary/40 text-primary font-bold text-sm hover:bg-primary/25 transition-colors">
                    <span class="material-symbols-outlined text-base">dashboard</span> Firebase Analytics
                </a>
                <a href="${GA4_HOME_URL}" target="_blank" rel="noopener noreferrer"
                   class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-dark border border-border-dark text-slate-200 font-bold text-sm hover:border-primary/50 transition-colors">
                    <span class="material-symbols-outlined text-base">analytics</span> Google Analytics (GA4)
                </a>
                <a href="${FIREBASE_DEBUGVIEW_URL}" target="_blank" rel="noopener noreferrer"
                   class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-dark border border-border-dark text-slate-200 font-bold text-sm hover:border-primary/50 transition-colors">
                    <span class="material-symbols-outlined text-base">bug_report</span> DebugView
                </a>
            </div>
            ${analyticsEmbedUrl ? `
            <div class="rounded-xl border border-white/10 bg-black/20 overflow-hidden backdrop-blur-sm">
                <p class="text-[10px] text-slate-500 px-3 py-2 border-b border-white/5">Embedded report (from <code class="text-primary">metadata/analytics.embedUrl</code>)</p>
                <iframe title="Analytics embed" src="${analyticsEmbedUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"
                    class="w-full min-h-[520px] border-0 bg-white"
                    loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade"></iframe>
            </div>` : `
            <div class="rounded-xl border border-dashed border-border-dark bg-background-dark/50 px-4 py-3 text-xs text-slate-500 leading-relaxed">
                <p class="font-semibold text-slate-400 mb-1">Optional: embed a dashboard here</p>
                <p>Create a doc <code class="text-primary bg-surface-dark px-1 rounded">metadata/analytics</code> with field <code class="text-primary bg-surface-dark px-1 rounded">embedUrl</code> (string) — e.g. a Looker Studio report <strong class="text-slate-400">Share → Embed</strong> URL. Only your admin account can read this document.</p>
            </div>`}
        </div>

        <!-- ── Complimentary Pro (friends & beta) — server-side only ── -->
        <div class="bg-surface-dark rounded-2xl p-5 border border-accent-green/25 shadow-depth mb-6">
            <h3 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-accent-green text-base">card_giftcard</span> Complimentary Pro
            </h3>
            <p class="text-xs text-slate-500 mb-4 leading-relaxed">
                Grant full Pro access by email (same as paid: Firestore <code class="text-primary bg-background-dark px-1 rounded text-[10px]">isPremium</code> + Auth claim). The person must <strong class="text-slate-400">create an account first</strong> so their email exists in Firebase Auth. They can refresh the app right after; quiz limits use Firestore immediately.
            </p>
            <div class="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div class="flex-1 min-w-0">
                    <label for="complimentary-pro-email" class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Friend's sign-in email</label>
                    <input type="email" id="complimentary-pro-email" autocomplete="off" placeholder="friend@example.com"
                        class="w-full px-4 py-2.5 rounded-xl bg-background-dark border border-border-dark text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/40">
                </div>
                <div>
                    <label for="complimentary-pro-duration" class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Duration</label>
                    <select id="complimentary-pro-duration" class="px-4 py-2.5 rounded-xl bg-background-dark border border-border-dark text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40">
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30" selected>30 days</option>
                        <option value="60">60 days</option>
                        <option value="90">90 days</option>
                        <option value="180">180 days</option>
                        <option value="365">1 year</option>
                        <option value="0">Forever (no expiry)</option>
                    </select>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" id="complimentary-pro-grant"
                        class="px-4 py-2.5 rounded-xl bg-accent-green text-background-dark font-black text-sm hover:brightness-110 active:scale-[.98] transition-all">
                        Grant Pro
                    </button>
                    <button type="button" id="complimentary-pro-revoke"
                        class="px-4 py-2.5 rounded-xl bg-surface-dark border border-accent-red/40 text-accent-red font-bold text-sm hover:bg-accent-red/10 active:scale-[.98] transition-all">
                        Revoke
                    </button>
                </div>
            </div>
            <p id="complimentary-pro-status" class="mt-3 text-xs font-semibold min-h-[1.25rem]" role="status" aria-live="polite"></p>
        </div>

        <!-- ── Setup guide ── -->
        <div class="bg-surface-dark rounded-2xl p-5 border border-border-dark shadow-depth">
            <h3 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 mb-4">
                <span class="material-symbols-outlined text-accent-orange text-base">construction</span> Stats Setup Guide
            </h3>
            <div class="space-y-3 text-sm text-slate-400">
                <p>Stats are read from <code class="text-primary bg-background-dark px-1.5 py-0.5 rounded text-xs">metadata/site_stats</code> in Firestore. Populate it using the Firebase Console or your admin script.</p>
                <div class="bg-background-dark rounded-xl p-4 border border-border-dark font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre">{
  premiumUsers: 0,
  questionsAnsweredTotal: 0,
  questionsAnsweredToday: 0,
  dailyDoseCompletionsToday: 0,
  weeklyNewUsers: [0, 0, 0, 0, 0, 0, 0],
  hourlyActivityDate: "2026-04-19",
  activeUsersByHourToday: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  lastUpdated: serverTimestamp()
}</div>
                <p><code class="text-primary bg-background-dark px-1.5 py-0.5 rounded text-xs">hourlyActivityDate</code> and <code class="text-primary bg-background-dark px-1.5 py-0.5 rounded text-xs">activeUsersByHourToday</code> (24 numbers, hours 0–23) are maintained by the <code class="text-primary bg-background-dark px-1.5 py-0.5 rounded text-xs">recordHourlyPresence</code> callable and midnight reset in <code class="text-primary bg-background-dark px-1.5 py-0.5 rounded text-xs">generateDailyDose</code> — or set manually in the Console.</p>
                <p>The <code class="text-primary bg-background-dark px-1.5 py-0.5 rounded text-xs">generateDailyDose</code> Cloud Function can be extended to reset <code class="text-primary bg-background-dark px-1.5 py-0.5 rounded text-xs">questionsAnsweredToday</code> and <code class="text-primary bg-background-dark px-1.5 py-0.5 rounded text-xs">dailyDoseCompletionsToday</code> at midnight automatically.</p>
            </div>
        </div>

    </div>`;

    initializeThemeSwitch();
    document.getElementById('back-btn')?.addEventListener('click', () => navigateTo('dashboard'));
    document.getElementById('admin-flagged-btn')?.addEventListener('click', () => navigateTo('admin-moderation'));

    // Quality audit button
    document.getElementById('run-quality-audit-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('run-quality-audit-btn');
        if (!btn) return;
        btn.disabled = true;
        btn.textContent = '⏳ Auditing...';
        try {
            const auditFn = httpsCallable(functions, 'refreshAdminQuality');
            await auditFn();
            renderAdminStats(rootElement);
        } catch (e) {
            console.error('Audit failed:', e.message);
            btn.disabled = false;
            btn.textContent = '❌ Failed';
        }
    });

    const grantFn = httpsCallable(functions, 'grantComplimentaryPro');
    const revokeFn = httpsCallable(functions, 'revokeComplimentaryPro');
    const statusEl = document.getElementById('complimentary-pro-status');
    const emailInput = document.getElementById('complimentary-pro-email');
    const durationSelect = document.getElementById('complimentary-pro-duration');

    function setComplimentaryStatus(msg, isError) {
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.className = `mt-3 text-xs font-semibold min-h-[1.25rem] ${isError ? 'text-accent-red' : 'text-accent-green'}`;
    }

    document.getElementById('complimentary-pro-grant')?.addEventListener('click', async () => {
        const email = emailInput?.value?.trim() || '';
        if (!email) {
            setComplimentaryStatus('Enter an email address.', true);
            return;
        }
        const durationDays = parseInt(durationSelect?.value || '30', 10);
        const durationLabel = durationDays === 0 ? 'forever' : `${durationDays} day${durationDays !== 1 ? 's' : ''}`;
        setComplimentaryStatus(`Granting ${durationLabel} Pro access…`, false);
        try {
            const res = await grantFn({ email, durationDays });
            const d = res.data;
            const expiryInfo = d.expiresAt ? ` (expires ${new Date(d.expiresAt).toLocaleDateString('en-SA')})` : '';
            setComplimentaryStatus(`Pro granted to ${d.email || email}${expiryInfo}. Ask them to refresh the app.`, false);
        } catch (e) {
            const msg = e?.message || 'Request failed.';
            setComplimentaryStatus(msg, true);
        }
    });

    document.getElementById('complimentary-pro-revoke')?.addEventListener('click', async () => {
        const email = emailInput?.value?.trim() || '';
        if (!email) {
            setComplimentaryStatus('Enter an email address.', true);
            return;
        }
        setComplimentaryStatus('Revoking…', false);
        try {
            const res = await revokeFn({ email });
            const d = res.data;
            setComplimentaryStatus(`Complimentary Pro removed for ${d.email || email}.`, false);
        } catch (e) {
            const msg = e?.message || 'Request failed.';
            setComplimentaryStatus(msg, true);
        }
    });
}
