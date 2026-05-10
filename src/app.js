
import { renderDashboard } from './dashboard.js';
import { renderQuiz } from './quiz.js';
import { renderReview } from './review.js';
import { renderResults } from './results.js';
import { renderLandingPage } from './landing.js';
import { renderLoginPage } from './login.js';
import { renderPricingPage } from './pricing.js';
import { renderAdminStats } from './admin-stats.js';
import { renderAdmin } from './admin.js';
import { renderDiagnostic } from './diagnostic.js';
import { renderDiagnosticResults } from './diagnosticResults.js';
import { initializeThemeSwitch } from './theme.js';
import { initAnalytics, trackEvent, trackPageView, ANALYTICS_EVENTS, hasAnalyticsConsent, setAnalyticsConsent } from './analytics.js';
import { logError, logWarn, logInfo } from './logger.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, getDoc, setDoc, increment, where } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Firebase configuration for your web app
const firebaseConfig = {
    projectId: "smle-mock-exam-51478532-5ae31",
    appId: "1:742716464361:web:06dea98fe465d23af5a478",
    storageBucket: "smle-mock-exam-51478532-5ae31.firebasestorage.app",
    apiKey: "AIzaSyCBrsgmoXwY-DnjfZtvIZNsVJ4s45g2ON4",
    authDomain: "smlepro.web.app",
    messagingSenderId: "742716464361"
};

const app = initializeApp(firebaseConfig);
export { app };
export const firestore = getFirestore(app);
export const auth     = getAuth(app);
/** Must match Cloud Functions region (see functions/index.js). */
export const functions = getFunctions(app, 'us-central1');

/**
 * Fetches quiz questions via the getQuizQuestions Cloud Function.
 * The function enforces per-tier limits server-side (free: 10, Pro: 100),
 * so direct Firestore reads are no longer needed — and are now blocked.
 */
export async function fetchQuizQuestions(topic, count) {
    const fn     = httpsCallable(functions, 'getQuizQuestions');
    const result = await fn({ topic, count });
    return result.data.questions;
}

/** Session key for the current Asia/Riyadh calendar hour (matches Admin Stats hourly chart). */
function getRiyadhPresenceSlotKey() {
    const d = new Date();
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(d);
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Riyadh',
        hour: 'numeric',
        hourCycle: 'h23',
    }).formatToParts(d);
    const hour = parseInt(parts.find((p) => p.type === 'hour').value, 10);
    return `${dateStr}_${hour}`;
}

/**
 * Once per browser session per Riyadh hour: records presence for Admin Stats (activeUsersByHourToday).
 * Best-effort; fails quietly if the Cloud Function is not deployed yet.
 */
function recordHourlyPresenceOncePerSlot() {
    const user = state.user;
    if (!user?.uid) return; // Allow anonymous users to record presence
    
    const slotKey = `hourlyPresence_${getRiyadhPresenceSlotKey()}`;
    try {
        if (sessionStorage.getItem(slotKey)) return;
    } catch { /* storage blocked */ }

    // Rate limiting: prevent rapid calls from the same client
    const lastCallKey = 'lastPresenceCall';
    const now = Date.now();
    try {
        const lastCall = sessionStorage.getItem(lastCallKey);
        if (lastCall && (now - parseInt(lastCall, 10)) < 30000) { // 30 second cooldown
            return;
        }
        sessionStorage.setItem(lastCallKey, String(now));
    } catch { /* ignore */ }

    const fn = httpsCallable(functions, 'recordHourlyPresence');
    fn()
        .then(() => {
            try {
                sessionStorage.setItem(slotKey, '1');
            } catch { /* ignore */ }
        })
        .catch((e) => {
            logWarn('[Presence] recordHourlyPresence', e?.message || e);
        });
}

// ── Daily Dose localStorage helpers (guest-safe) ──────────────────────────

/** Returns the localStorage key for today's completion, e.g. "dailyDose_done_20260328" */
export function getDailyDoseKey() {
    const d = new Date();
    return `dailyDose_done_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** Returns stored completion data for today, or null if not yet done */
export function checkDailyDoneToday() {
    try {
        const raw = localStorage.getItem(getDailyDoseKey());
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

/** Persists completion so we can gate re-entry today.
 *  @param {number} correct  - raw correct count (e.g. 22)
 *  @param {number} total    - total questions   (e.g. 30)
 *  @param {number} percent  - overall score %   (e.g. 73)
 */
export function markDailyDoneToday(correct, total, percent) {
    try {
        localStorage.setItem(getDailyDoseKey(), JSON.stringify({
            correct,
            total,
            score: percent,      // kept for landing.js "You scored X%" display
            completedAt: Date.now(),
        }));
    } catch { /* storage unavailable — silent fail */ }
}

/**
 * Writes today's daily dose completion to Firestore for registered users.
 * This acts as the server-side source of truth — localStorage alone can be
 * cleared to bypass the once-per-day gate.
 */
export async function syncDailyDoseToFirestore(uid, correct, total, percent) {
    if (!uid) return;
    try {
        const today = getDailyDoseKey().replace('dailyDose_done_', ''); // e.g. "20260401"
        await setDoc(
            doc(firestore, 'users', uid),
            {
                lastDailyDoseDate: today,
                lastDailyDoseData: { correct, total, score: percent, completedAt: Date.now() },
            },
            { merge: true }
        );
    } catch (e) {
        logWarn('[Daily Dose] Firestore sync failed (non-critical)', e.message);
    }
}

/**
 * Called on login: checks if the user already completed today's daily dose in
 * Firestore and restores the localStorage gate if so — preventing clearStorage abuse.
 */
export function restoreDailyDoseFromProfile(profileData) {
    if (!profileData?.lastDailyDoseDate || !profileData?.lastDailyDoseData) return;
    const today = getDailyDoseKey().replace('dailyDose_done_', '');
    if (profileData.lastDailyDoseDate !== today) return;
    // Already done today on a previous session / device — re-stamp localStorage
    try {
        if (!localStorage.getItem(getDailyDoseKey())) {
            localStorage.setItem(getDailyDoseKey(), JSON.stringify(profileData.lastDailyDoseData));
        }
    } catch { /* silent */ }
}

// ── Wrong Answer Pool helpers ──────────────────────────────────────────────
// Persists a pool of question objects the user has answered incorrectly.
// Questions are removed when the user answers them correctly on a retake.
// The pool is capped at 100 entries (most-recently-missed kept on overflow).

export function loadWrongAnswerPool(uid) {
    try { return JSON.parse(localStorage.getItem(`wrongAnswerPool_${uid}`)) || []; }
    catch { return []; }
}

function saveWrongAnswerPool(uid, pool) {
    try { localStorage.setItem(`wrongAnswerPool_${uid}`, JSON.stringify(pool)); } catch {}
}

export function updateWrongAnswerPool(uid, questions, userAnswers) {
    if (!uid || !questions?.length) return;
    let pool = loadWrongAnswerPool(uid);

    questions.forEach(q => {
        const correctIndex = q.options.findIndex(opt => opt.correct === true);
        if (correctIndex === -1) return;
        const correctAnswerId = String.fromCharCode(65 + correctIndex);
        const userAnswerId = userAnswers[q.id];

        if (!userAnswerId) return; // unanswered — ignore

        if (userAnswerId === correctAnswerId) {
            // Mastered — remove from pool
            pool = pool.filter(p => p.id !== q.id);
        } else {
            // Wrong — upsert into pool
            const idx = pool.findIndex(p => p.id === q.id);
            if (idx >= 0) {
                pool[idx].wrongCount = (pool[idx].wrongCount || 1) + 1;
                pool[idx].lastWrong = Date.now();
            } else {
                pool.push({ ...q, wrongCount: 1, lastWrong: Date.now() });
            }
        }
    });

    // Cap at 100 — keep most-recently-missed
    if (pool.length > 100) {
        pool.sort((a, b) => (b.lastWrong || 0) - (a.lastWrong || 0));
        pool = pool.slice(0, 100);
    }

    saveWrongAnswerPool(uid, pool);
}

// ── Daily Leaderboard helpers ──────────────────────────────────────────────

/**
 * Writes this user's daily dose score to Firestore.
 * Document ID = uid, so calling it multiple times is idempotent (create-only rule
 * in Firestore prevents any score changes after the first submission).
 */
export async function submitDailyLeaderboard(uid, score) {
    if (!uid || typeof score !== 'number') return;
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const entryRef = doc(firestore, 'daily_scores', today, 'entries', uid);
        await setDoc(entryRef, { uid, score, submittedAt: serverTimestamp() });
    } catch (e) {
        // Silently ignore — a 'permission-denied' is expected on re-submission (update blocked)
        if (!e.message?.includes('permission-denied')) {
            logWarn('[Leaderboard] Submit failed', e.message);
        }
    }
}

/**
 * Fetches today's leaderboard entries and returns the calling user's ranking stats.
 * Returns null if there are no entries or the fetch fails.
 */
export async function fetchDailyLeaderboardStats(uid) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const snap  = await getDocs(collection(firestore, 'daily_scores', today, 'entries'));
        if (snap.empty) return null;

        const entries = [];
        snap.forEach(d => entries.push(d.data()));

        // Sort highest score first
        entries.sort((a, b) => b.score - a.score);

        const total   = entries.length;
        const avg     = Math.round(entries.reduce((s, e) => s + e.score, 0) / total);
        const rankIdx = entries.findIndex(e => e.uid === uid);
        const rank    = rankIdx >= 0 ? rankIdx + 1 : null;
        const topPct  = rank && total > 1 ? Math.round((rank / total) * 100) : null;

        return { rank, total, avg, topPct };
    } catch (e) {
        // Silently fail for leaderboard - not critical
        return null;
    }
}

/**
 * Sets up state and launches the quiz.
 * Silently signs the user in anonymously if they have no Firebase session so
 * Firestore security rules (which require auth) can be satisfied while keeping
 * the "no sign-up" UX promise.  When the user later creates a real account,
 * Firebase links the anonymous uid to their new account — history preserved.
 */
export async function startDailyDose() {
    if (!auth.currentUser) {
        try {
            await signInAnonymously(auth);
        } catch (e) {
            // Non-fatal — Firestore reads that require auth will fail gracefully
            logWarn('[Daily Dose] Anonymous sign-in failed', e.message);
        }
    }
    state.quizConfig = {
        mode: 'daily',
        topic: 'Daily Dose',
        numQuestions: 30,
        isStrictMode: true,
    };
    state.quizSession = {
        currentQuestionIndex: 0,
        userAnswers: {},
        flaggedQuestions: new Set(),
        startTime: null,
        totalTime: 0,
        isFinished: false,
        questions: [],
        analytics: null,
    };
    navigateTo('quiz');
}

export const state = {
    currentScreen: 'landing', 
    user: null, // Using null for logged-out user
    quizConfig: null,
    quizSession: null,
    performanceHistory: []
};

export function navigateTo(screen, props = {}) {
    const appRoot = document.getElementById('app-root');
    state.currentScreen = screen;
    appRoot.innerHTML = '';
    
    if (state.quizSession && state.quizSession.timerInterval && screen !== 'quiz') {
        clearInterval(state.quizSession.timerInterval);
    }

    // Clear quiz keydown listener when navigating away from the quiz screen
    if (state.quizKeyDownHandler && screen !== 'quiz') {
        document.removeEventListener('keydown', state.quizKeyDownHandler);
        state.quizKeyDownHandler = null;
    }

    switch (screen) {
        case 'landing':
            renderLandingPage(appRoot);
            break;
        case 'login':
            renderLoginPage(appRoot);
            break;
        case 'dashboard':
            renderDashboard(appRoot);
            break;
        case 'quiz':
            renderQuiz(appRoot, { scrollToTop: true });
            break;
        case 'results':
            renderResults(appRoot);
            break;
        case 'review':
            renderReview(appRoot);
            break;
        case 'pricing':
            renderPricingPage(appRoot);
            break;
        case 'admin-stats':
            renderAdminStats(appRoot);
            break;
        case 'admin-moderation':
            renderAdmin(appRoot);
            break;
        case 'diagnostic':
            renderDiagnostic(appRoot);
            break;
        case 'diagnosticResults':
            renderDiagnosticResults(appRoot);
            break;
        default:
            renderLandingPage(appRoot);
    }
}

/**
 * Shows a non-intrusive analytics consent banner at the bottom of the screen.
 * Compliant with Saudi PDPL — no tracking until explicit consent.
 */
function showAnalyticsConsentBanner() {
  // Check if already dismissed
  try {
    if (localStorage.getItem('smle_analytics_banner_dismissed') === '1') return;
  } catch { return; }

  const banner = document.createElement('div');
  banner.id = 'analytics-consent-banner';
  banner.className = 'fixed bottom-0 left-0 right-0 z-[100] bg-slate-900/95 backdrop-blur-md border-t border-white/10 px-4 py-3 sm:px-6 sm:py-4 shadow-2xl';
  banner.innerHTML = `
    <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
      <div class="flex items-center gap-2 shrink-0">
        <span class="material-symbols-outlined text-primary text-xl">privacy_tip</span>
        <span class="text-xs sm:text-sm font-bold text-white">Privacy Notice</span>
      </div>
      <p class="text-[11px] sm:text-xs text-slate-300 leading-relaxed flex-1">
        <span class="font-semibold text-white">PDPL Compliant:</span>
        We use anonymous analytics to improve your experience. No personal data is sold or shared.
        <br class="hidden sm:inline">
        <span class="text-slate-500">
          <span class="font-semibold text-slate-400">متوافق مع قانون حماية البيانات الشخصية:</span>
          نستخدم تحليلات مجهولة لتحسين تجربتك. لا يتم بيع أو مشاركة البيانات الشخصية.
        </span>
      </p>
      <div class="flex items-center gap-2 shrink-0">
        <button id="analytics-decline-btn" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 transition-colors">
          Decline
        </button>
        <button id="analytics-accept-btn" class="px-4 py-1.5 rounded-lg text-xs font-bold text-background-dark bg-primary hover:brightness-110 transition-all">
          Accept
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);

  // Handler: Accept
  document.getElementById('analytics-accept-btn').addEventListener('click', () => {
    setAnalyticsConsent(true);
    banner.remove();
    // Re-initialize with consent granted
    initAnalytics();
    trackEvent('analytics_consent_given', { source: 'banner' });
  });

  // Handler: Decline
  document.getElementById('analytics-decline-btn').addEventListener('click', () => {
    setAnalyticsConsent(false);
    try { localStorage.setItem('smle_analytics_banner_dismissed', '1'); } catch {}
    banner.remove();
  });
}

export async function savePerformance(sessionAnalytics) {
    if (!state.user || state.user.isAnonymous) return;

    const docData = { date: new Date().toISOString(), ...sessionAnalytics };

    // 1. Optimistic local save
    state.performanceHistory.push(docData);
    try {
        localStorage.setItem(`performanceHistory_${state.user.uid}`, JSON.stringify(state.performanceHistory));

        // 2. Persist to user's performance sub-collection
        const perfCol = collection(firestore, `users/${state.user.uid}/performance`);
        await addDoc(perfCol, { ...docData, timestamp: serverTimestamp() });
        logInfo('[Sync] Performance backed up to cloud');

        // 3. Increment site-wide aggregate counters (best-effort, non-blocking)
        const totalQ = sessionAnalytics.totalQuestions || 0;
        if (totalQ > 0) {
            setDoc(
                doc(firestore, 'metadata', 'site_stats'),
                {
                    questionsAnsweredTotal: increment(totalQ),
                    questionsAnsweredToday: increment(totalQ),
                    lastUpdated: serverTimestamp(),
                },
                { merge: true }
            ).catch(() => {}); // fire-and-forget
        }
    } catch (e) {
        logError('Error saving performance history', e);
    }
}

async function loadPerformanceHistory() {
    if (!state.user) return;
    
    // 1. Quick Hydration from Local Storage
    const historyJSON = localStorage.getItem(`performanceHistory_${state.user.uid}`);
    if (historyJSON) {
        try {
            const history = JSON.parse(historyJSON);
            if (Array.isArray(history)) {
                state.performanceHistory = history;
            }
        } catch (e) {
            logError("Error parsing local performance history", e);
        }
    }
    
    // 2. Background Cloud Sync (Cross-Device Recovery)
    try {
        const perfCol = collection(firestore, `users/${state.user.uid}/performance`);
        // We order by Date string since sometimes serverTimestamp is pending
        const q = query(perfCol, orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const cloudHistory = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                cloudHistory.push({
                    date: data.date,
                    totalTime: data.totalTime,
                    // overallScore is the canonical field; fall back to legacy 'score'
                    overallScore: typeof data.overallScore === 'number' ? data.overallScore : (data.score ?? null),
                    totalQuestions: data.totalQuestions,
                    topicStats: data.topicStats || {},
                    weakestTopic: data.weakestTopic || null,
                    topic: data.topic,
                    mode: data.mode
                });
            });
            state.performanceHistory = cloudHistory;
            localStorage.setItem(`performanceHistory_${state.user.uid}`, JSON.stringify(cloudHistory));
            logInfo("[Sync] Performance history synchronized from cloud");
        }
    } catch (e) {
         logError("Failed to sync cloud performance history", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Allow other pages to import firestore/auth without rendering the SPA shell.
    if (!document.getElementById('app-root')) {
        return;
    }

    // Initialize analytics
    initAnalytics();

    initializeThemeSwitch();
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // ── Anonymous guest (Daily Dose flow) ──────────────────────────
            // Give them a minimal state object so quiz/results can check isAnonymous.
            // Do NOT load a profile or redirect to the dashboard — startDailyDose()
            // handles navigation itself.
            if (user.isAnonymous) {
                state.user = {
                    uid: user.uid,
                    email: null,
                    name: null,
                    isPro: false,
                    isPremium: false,
                    isAnonymous: true,
                };
                return;
            }

            // ── Registered user ─────────────────────────────────────────────
            let isPremiumUser = false;
            let profileData = {};
            try {
                const userRef = doc(firestore, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    profileData = userSnap.data() || {};
                    isPremiumUser = profileData.isPremium === true;
                } else {
                    // ── NEW USER ──────────────────────────────────────────────
                    // First login: auto-create profile with 30-day complimentary Pro access.
                    // This gives everyone a free trial to unlock all Pro features.
                    const now = new Date();
                    const proExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
                    const newUserDoc = {
                        email: user.email || '',
                        displayName: user.displayName || '',
                        isPremium: true,
                        proExpiresAt: proExpiresAt.toISOString(),
                        complimentaryPro: true,
                        createdAt: serverTimestamp(),
                        photoURL: user.photoURL || '',
                    };
                    await setDoc(userRef, newUserDoc);
                    profileData = newUserDoc;
                    isPremiumUser = true;
                    logInfo('[Registration] New user profile created with 30-day complimentary Pro', { uid: user.uid });
                }
            } catch (e) {
                logError('Failed to load user profile', e);
            }

            // Restore daily dose gate from Firestore so clearing localStorage can't bypass it
            restoreDailyDoseFromProfile(profileData);

            const storedName = typeof profileData.displayName === 'string' ? profileData.displayName.trim() : '';
            const resolvedName = storedName || user.displayName || null;

            state.user = {
                uid: user.uid,
                email: user.email,
                name: resolvedName,
                isPro: isPremiumUser,
                isPremium: isPremiumUser,
                isAnonymous: false,
            };

            recordHourlyPresenceOncePerSlot();

            // Wait for cloud hydration before fully rendering dashboard metrics
            await loadPerformanceHistory();
            
            if (state.currentScreen === 'landing' || state.currentScreen === 'login') {
                navigateTo('dashboard');
            }
        } else {
            state.user = null;
            if (state.currentScreen !== 'landing' && state.currentScreen !== 'pricing' && state.currentScreen !== 'login') {
                 navigateTo('landing');
            }
        }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const hash = window.location.hash;

    if (mode === 'daily') {
        startDailyDose();
    } else if (hash === '#login') {
        navigateTo('login');
    } else if (hash === '#diagnostic') {
        // Deep link: smlepro.web.app/#diagnostic — routes directly to the
        // SMLE Readiness Diagnostic (the "Find Your Weak Spots" feature).
        import('./diagnostic.js').then(mod => mod.startDiagnostic());
    } else {
        navigateTo('landing');
    }
});
