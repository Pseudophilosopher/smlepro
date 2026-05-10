import { navigateTo, state, fetchDailyLeaderboardStats } from './app.js';
import { initializeThemeSwitch } from './theme.js';

// --- Emoji grid for sharing (Wordle-style) ---
function generateShareGrid(questions) {
    return questions
        .map(q => (q.isCorrect ? '🟩' : '🟥'))
        .reduce((acc, emoji, i) => {
            if (i > 0 && i % 5 === 0) return acc + '\n' + emoji;
            return acc + emoji;
        }, '');
}

// --- Countdown to midnight (for "Come back tomorrow") ---
function getMsUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
}

function formatCountdown(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function renderResults(rootElement) {
    const { analytics, totalTime, questions } = state.quizSession;
    const { topicStats, weakestTopic, overallScore, totalCorrect, totalQuestions } = analytics;
    // totalTime is elapsed milliseconds — convert to HH:MM:SS directly (not epoch)
    const _tSec = Math.floor((totalTime || 0) / 1000);
    const timeTaken = [
        Math.floor(_tSec / 3600),
        Math.floor((_tSec % 3600) / 60),
        _tSec % 60,
    ].map(n => String(n).padStart(2, '0')).join(':');

    const topicEntries = Object.entries(topicStats);
    const isAllTopicsMode = state.quizConfig.topic === 'All Topics';
    const isDailyMode = state.quizConfig.mode === 'daily';

    // Score-based emoji medal
    const medal = overallScore >= 80 ? '🏆' : overallScore >= 60 ? '🥈' : '💪';

    // Scorecard color
    const scoreColor = overallScore >= 80
        ? 'text-accent-green'
        : overallScore >= 60 ? 'text-accent-orange' : 'text-accent-red';

    // Build topic breakdown
    let topicBreakdownHtml = '';
    if (isAllTopicsMode && topicEntries.length > 1) {
        topicBreakdownHtml = `
        <div class="bg-white dark:bg-surface-dark rounded-2xl p-8 shadow-depth border border-slate-200 dark:border-border-dark/50 mb-8">
            <h2 class="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">analytics</span> Topic Breakdown
            </h2>
            <div class="space-y-4">
                ${topicEntries.map(([topic, stats]) => `
                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <span class="font-semibold text-slate-600 dark:text-slate-300">${topic}</span>
                            <span class="font-bold text-slate-800 dark:text-white">${stats.correct}/${stats.total} (${stats.score}%)</span>
                        </div>
                        <div class="w-full bg-slate-200 dark:bg-border-dark/60 rounded-full h-2.5">
                            <div class="bg-primary h-2.5 rounded-full transition-all duration-700" style="width: ${stats.score}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
    }

    // --- Daily Dose exclusive UI blocks ---
    const dailyUpsellHtml = isDailyMode ? `
        <!-- Leaderboard Card — populated async after render -->
        <div id="leaderboard-card" class="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-depth border border-slate-200 dark:border-border-dark/50 mb-8">
            <div class="flex items-center gap-3 animate-pulse">
                <div class="size-10 rounded-full bg-slate-200 dark:bg-border-dark shrink-0"></div>
                <div class="flex-1 space-y-2">
                    <div class="h-3 bg-slate-200 dark:bg-border-dark rounded w-1/2"></div>
                    <div class="h-2 bg-slate-200 dark:bg-border-dark rounded w-1/3"></div>
                </div>
            </div>
        </div>

        <!-- Conversion Upsell Card -->
        <div class="relative overflow-hidden bg-gradient-to-br from-primary/20 via-accent-purple/10 to-transparent border border-primary/40 rounded-2xl p-8 mb-8 text-center">
            <div class="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none"></div>
            <span class="material-symbols-outlined text-primary text-5xl mb-3 block">workspace_premium</span>
            <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-2">Want to go deeper?</h3>
            <p class="text-slate-600 dark:text-slate-300 max-w-md mx-auto mb-6">
                You just finished today's Daily Dose.                 Get access to the <strong>full question bank</strong>, specialty-focused exams,
                and <strong>detailed performance analytics</strong> to find every weak spot.
            </p>
            <button id="upsell-upgrade-btn" class="px-10 py-4 rounded-xl bg-primary text-background-dark font-black shadow-glow-primary hover:brightness-110 transition-transform duration-300 transform hover:-translate-y-1 text-lg">
                🚀 Upgrade to Pro — Start for Free
            </button>
        </div>

        <!-- Return Tomorrow Countdown -->
        <div class="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-depth border border-slate-200 dark:border-border-dark/50 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-3">
                <div class="size-12 rounded-full bg-accent-orange/20 text-accent-orange flex items-center justify-center">
                    <span class="material-symbols-outlined text-2xl">alarm</span>
                </div>
                <div>
                    <p class="font-black text-slate-900 dark:text-white">New questions tomorrow!</p>
                    <p class="text-sm text-slate-500 dark:text-slate-400">A fresh Daily Dose drops at midnight. Come back!</p>
                </div>
            </div>
            <div class="flex flex-col items-center">
                <span class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Next Dose In</span>
                <span id="daily-countdown" class="text-3xl font-black text-accent-orange tabular-nums tracking-tight">--:--:--</span>
            </div>
        </div>` : '';

    // --- Action buttons ---
    const backLabel = (isDailyMode && !state.user) ? 'Back to Home' : 'Dashboard';
    let actionButtonsHtml;
    if (isDailyMode) {
        actionButtonsHtml = `
            <button id="share-daily-btn" class="px-8 py-3 rounded-lg bg-green-500 text-white font-bold shadow-lg hover:bg-green-600 transition-all transform hover:scale-105 flex items-center justify-center gap-2">
                <span class="material-symbols-outlined">share</span> Share My Score
            </button>
            <button id="back-to-dashboard" class="px-8 py-3 rounded-lg bg-slate-200 dark:bg-surface-dark font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-opacity-80 transition-all">${backLabel}</button>
        `;
    } else {
        actionButtonsHtml = `
            <button id="retake-quiz-btn" class="px-8 py-3 rounded-lg bg-slate-200 dark:bg-surface-dark font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-all flex items-center gap-2">
                <span class="material-symbols-outlined">replay</span> Retake
            </button>
            <button id="back-to-dashboard" class="px-8 py-3 rounded-lg bg-slate-200 dark:bg-surface-dark font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-opacity-80 transition-all">Dashboard</button>
            <button id="review-answers-btn" class="px-8 py-3 rounded-lg bg-primary text-background-dark font-bold shadow-glow-primary hover:brightness-110 transition-transform duration-300 transform hover:scale-105">Review Answers</button>
        `;
    }

    rootElement.innerHTML = `
    <div class="max-w-3xl mx-auto px-4 py-12">

        <!-- Score Hero -->
        <div class="text-center mb-10">
            <div class="text-6xl mb-3">${medal}</div>
            <h1 class="text-4xl md:text-5xl font-black text-slate-800 dark:text-white mb-2">
                ${isDailyMode ? 'Daily Dose Complete!' : 'Quiz Complete!'}
            </h1>
            <p class="text-lg text-slate-500 dark:text-slate-400">${state.quizConfig.topic} — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>

        <!-- 3-Card Stats -->
        <div class="grid grid-cols-3 gap-4 mb-8 text-center">
            <div class="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-depth border border-slate-200 dark:border-border-dark/50 flex flex-col items-center justify-center">
                <span class="text-4xl md:text-5xl font-black ${scoreColor}">${overallScore}%</span>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 font-bold uppercase tracking-widest">Score</p>
            </div>
            <div class="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-depth border border-slate-200 dark:border-border-dark/50 flex flex-col items-center justify-center">
                <span class="text-4xl md:text-5xl font-black text-primary">${totalCorrect}<span class="text-2xl text-slate-400">/${totalQuestions}</span></span>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 font-bold uppercase tracking-widest">Correct</p>
            </div>
            <div class="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-depth border border-slate-200 dark:border-border-dark/50 flex flex-col items-center justify-center">
                <span class="text-2xl md:text-3xl font-black text-accent-orange">${timeTaken}</span>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 font-bold uppercase tracking-widest">Time</p>
            </div>
        </div>

        ${isAllTopicsMode && weakestTopic ? `
            <div class="bg-primary/10 dark:bg-primary/20 border border-primary/50 rounded-2xl p-6 mb-8 flex items-center gap-4">
                <span class="material-symbols-outlined text-primary text-3xl flex-shrink-0">school</span>
                <div>
                    <h3 class="font-bold text-primary mb-1">Focus Area Identified</h3>
                    <p class="text-slate-700 dark:text-slate-200 text-sm">Prioritise revising <strong>${weakestTopic}</strong> — you scored only ${topicStats[weakestTopic].score}% there.</p>
                </div>
            </div>
        ` : ''}

        ${topicBreakdownHtml}
        ${dailyUpsellHtml}

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row justify-center gap-4 mt-4">
            ${actionButtonsHtml}
        </div>
    </div>`;

    // --- Event listeners ---
    document.getElementById('back-to-dashboard').addEventListener('click', () => {
        navigateTo((isDailyMode && !state.user) ? 'landing' : 'dashboard');
    });

    if (isDailyMode) {
        // Populate leaderboard card async — extracted so it can be called on refresh too
        function renderLeaderboard(stats) {
            const card = document.getElementById('leaderboard-card');
            if (!card) return;

            if (!stats || stats.total < 2) {
                card.innerHTML = `
                <div class="flex items-center justify-between gap-3 flex-wrap">
                    <div class="flex items-center gap-3">
                        <div class="size-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-primary text-lg">leaderboard</span>
                        </div>
                        <div>
                            <p class="font-bold text-slate-900 dark:text-white text-sm">You're the first one today!</p>
                            <p class="text-xs text-slate-500 mt-0.5">Check back once others have completed the dose.</p>
                        </div>
                    </div>
                    <button id="leaderboard-refresh-btn" class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/20 transition-all shrink-0">
                        <span class="material-symbols-outlined text-sm">refresh</span> Check again
                    </button>
                </div>`;

                document.getElementById('leaderboard-refresh-btn')?.addEventListener('click', () => {
                    card.innerHTML = `<div class="flex items-center gap-3 animate-pulse"><div class="size-10 rounded-full bg-border-dark shrink-0"></div><div class="flex-1 space-y-2"><div class="h-3 bg-border-dark rounded w-1/2"></div><div class="h-2 bg-border-dark rounded w-1/3"></div></div></div>`;
                    fetchDailyLeaderboardStats(state.user.uid).then(renderLeaderboard);
                });
                return;
            }

            const { rank, total, avg, topPct } = stats;
            const rankColor  = topPct <= 10 ? 'text-accent-green' : topPct <= 33 ? 'text-primary' : topPct <= 60 ? 'text-accent-orange' : 'text-slate-400';
            const medal      = topPct <= 10 ? '🏆' : topPct <= 33 ? '🥈' : topPct <= 60 ? '🥉' : '💪';
            const barWidth   = Math.round((overallScore / 100) * 100);
            const avgBarWidth = Math.round((avg / 100) * 100);
            const rankLabel  = rank ? `#${rank} out of ${total}` : `${total} participants`;

            card.innerHTML = `
            <div class="flex items-center gap-3 mb-4">
                <div class="size-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xl">${medal}</div>
                <div>
                    <p class="font-black text-slate-900 dark:text-white">
                        You ranked <span class="${rankColor}">${rankLabel}</span> today
                    </p>
                    <p class="text-xs text-slate-500 mt-0.5">${topPct !== null ? `Top ${topPct}% of all participants` : `${total} people completed today's dose`}</p>
                </div>
            </div>
            <div class="space-y-2.5">
                <div>
                    <div class="flex justify-between text-xs font-bold text-slate-500 mb-1">
                        <span>Your score</span><span class="${rankColor}">${overallScore}%</span>
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-border-dark rounded-full h-2">
                        <div class="h-2 rounded-full bg-primary transition-all duration-700" style="width:${barWidth}%"></div>
                    </div>
                </div>
                <div>
                    <div class="flex justify-between text-xs font-bold text-slate-500 mb-1">
                        <span>Today's average</span><span>${avg}%</span>
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-border-dark rounded-full h-2">
                        <div class="h-2 rounded-full bg-slate-400 dark:bg-slate-500 transition-all duration-700" style="width:${avgBarWidth}%"></div>
                    </div>
                </div>
            </div>`;
        }

        if (state.user) {
            fetchDailyLeaderboardStats(state.user.uid).then(renderLeaderboard);
        } else {
            const card = document.getElementById('leaderboard-card');
            if (card) card.remove();
        }

        // Countdown timer
        const countdownEl = document.getElementById('daily-countdown');
        if (countdownEl) {
            const tick = () => {
                const ms = getMsUntilMidnight();
                countdownEl.textContent = formatCountdown(ms);
            };
            tick();
            const countdownInterval = setInterval(() => {
                // Self-cleaning: if the element leaves the DOM (SPA navigation), stop the timer
                if (!document.contains(countdownEl)) { clearInterval(countdownInterval); return; }
                tick();
            }, 1000);
        }

        // Enhanced viral share
        document.getElementById('share-daily-btn').addEventListener('click', () => {
            const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const grid = generateShareGrid(questions);
            const shareText =
`🩺 SMLE Daily Dose — ${today}
Score: ${totalCorrect}/${totalQuestions} (${overallScore}%) ${medal}

${grid}

Can you beat my score?
👉 https://smlepro.web.app/?mode=daily`;

            if (navigator.share) {
                // Native share sheet on mobile (iOS, Android)
                navigator.share({ title: 'SMLE Daily Dose', text: shareText })
                    .catch(() => copyToClipboard(shareText));
            } else {
                copyToClipboard(shareText);
            }
        });

        // Upsell button — send guests to login, authenticated users to pricing
        document.getElementById('upsell-upgrade-btn')?.addEventListener('click', () => {
            navigateTo(state.user ? 'pricing' : 'login');
        });

    } else {
        // Retake same topic
        document.getElementById('retake-quiz-btn')?.addEventListener('click', () => {
            const { topic, numQuestions, isStrictMode } = state.quizConfig;
            sessionStorage.removeItem('cachedQuizSession');
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
        });

        document.getElementById('review-answers-btn').addEventListener('click', () => navigateTo('review'));
    }

    // Scroll to top of page so the user sees the score hero and stats immediately
    requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    });

    initializeThemeSwitch();
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            // Show in-page toast instead of ugly alert
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl font-bold text-sm z-[9999] flex items-center gap-2 animate-bounce';
            toast.innerHTML = '<span class="material-symbols-outlined text-accent-green">check_circle</span> Copied to clipboard! Paste it anywhere 🚀';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3500);
        })
        .catch(() => alert('Could not copy — please copy manually.'));
}
