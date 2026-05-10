import { navigateTo, state, savePerformance, firestore, markDailyDoneToday, syncDailyDoseToFirestore, submitDailyLeaderboard, updateWrongAnswerPool, fetchQuizQuestions, auth } from './app.js';
import { applyInstantFeedbackToDom } from './quiz-feedback-dom.js';
import { signInAnonymously } from 'firebase/auth';
import { topicToDrillBucket } from './topic-drill-buckets.js';
import { initializeThemeSwitch } from './theme.js';
import { getTrustDisclaimerStripHtml } from './content-meta.js';
import { buildQuestionImageHtml } from './question-image-html.js';
import { logError, logWarn, logInfo } from './logger.js';
import { collection, getDocs, query, limit, addDoc, serverTimestamp, where, documentId, doc, getDoc } from "firebase/firestore";

let timerInterval;

// --- Seeded PRNG (mulberry32) for Wordle-style daily question selection ---
function seededRandom(seed) {
    return function () {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

// Generates a stable numeric seed from today's date (e.g. 20260322)
function getDailyDateSeed() {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    return parseInt(dateStr, 10);
}

// Fisher-Yates shuffle using a seeded PRNG
function seededShuffle(array, rng) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/** In-place shuffle of MCQ options (correct flag stays on the right object). Matches Cloud Function behavior for getQuizQuestions. */
function shuffleQuestionOptionsInPlace(options) {
    if (!Array.isArray(options) || options.length < 2) return;
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }
}

function shuffleOptionsForAllQuestions(questions) {
    if (!Array.isArray(questions)) return;
    questions.forEach((q) => shuffleQuestionOptionsInPlace(q.options));
}

/** After innerHTML swap, mobile browsers often keep the old scroll position — jump to top on question changes. */
function scrollQuizViewportToTop() {
    requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    });
}

async function fetchAndPrepareQuestions() {
    const numQuestions = state.quizConfig.numQuestions || 10;
    const isDailyMode = state.quizConfig.mode === 'daily';

    // --- Daily Dose: God Mode Override → Wordle Fallback ---
    if (isDailyMode) {
        const today = (() => {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })();

        // v2: cache bust so options get reshuffled (fixes letter-position bias from older builds)
        const todayKey = `dailyDose_v2_${getDailyDateSeed()}`;
        const cached = sessionStorage.getItem(todayKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                state.quizSession.questions = parsed.questions;
                if (parsed.theme) state.quizConfig.dailyTheme = parsed.theme;
                return true;
            } catch (e) { /* ignore, refetch */ }
        }

        // --- Step 1: daily_doses/{today} — primary source (1 document read) ---
        // This path is accessible to anonymous users and avoids reading the premium
        // questions collection entirely.  The admin populates this via the backend.
        try {
            const dailyRef = doc(firestore, 'daily_doses', today);
            const dailySnap = await getDoc(dailyRef);

            if (dailySnap.exists()) {
                const data = dailySnap.data();
                const questions = Array.isArray(data.questions) ? data.questions : [];

                if (questions.length > 0) {
                    const theme = typeof data.theme === 'string' ? data.theme : null;
                    state.quizSession.questions = questions.slice(0, numQuestions);
                    // Daily Dose docs are not shuffled server-side; randomize so "B" isn't always correct
                    shuffleOptionsForAllQuestions(state.quizSession.questions);
                    state.quizConfig.dailyTheme = theme;
                    sessionStorage.setItem(todayKey, JSON.stringify({ questions: state.quizSession.questions, theme }));
                    logInfo(`[Daily Dose] Loaded ${state.quizSession.questions.length} questions from daily_doses/${today}`);
                    return true;
                }
            }
        } catch (e) {
            logWarn('[Daily Dose] daily_doses fetch failed, trying fallback', e.message);
        }

        // --- Step 2: Admin Override ---
        // (Skipped for anonymous users — metadata/daily_config IDs point at the
        //  `questions` collection which requires non-anonymous auth in production rules.
        //  Once `daily_doses` documents are regularly populated this path is never reached.)
        if (state.user?.isAnonymous) {
            console.info('[Daily Dose] No daily_doses document for today — using seeded fallback.');
        } else
        try {
            const configDocRef = doc(firestore, 'metadata', 'daily_config');
            const configSnap = await getDoc(configDocRef);

            if (configSnap.exists()) {
                const data = configSnap.data();
                const todayConfig = data[today]; // Expects a field named "2026-03-22"

                if (todayConfig && Array.isArray(todayConfig.question_ids) && todayConfig.question_ids.length > 0) {
                    logInfo(`[Daily Dose] Admin override active for ${today}: "${todayConfig.theme || 'Custom Set'}"`);

                    // Fetch the specific question IDs in chunks of 10 (Firestore 'in' limit)
                    const ids = todayConfig.question_ids.slice(0, 30);
                    const chunks = [];
                    for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));

                    const overrideQuestions = [];
                    for (const chunk of chunks) {
                        const snap = await getDocs(query(collection(firestore, 'questions'), where(documentId(), 'in', chunk)));
                        snap.forEach(d => overrideQuestions.push({ id: d.id, ...d.data() }));
                    }

                    if (overrideQuestions.length > 0) {
                        const theme = todayConfig.theme || null;
                        state.quizSession.questions = overrideQuestions;
                        shuffleOptionsForAllQuestions(state.quizSession.questions);
                        state.quizConfig.dailyTheme = theme;
                        sessionStorage.setItem(todayKey, JSON.stringify({ questions: overrideQuestions, theme }));
                        return true;
                    }
                }
            }
        } catch (e) {
            // Admin config read failed — silently fall through to seeded algorithm
            logWarn('[Daily Dose] Admin config check failed, using seeded fallback', e.message);
        }

        // --- Step 3: Fallback — mulberry32 Date-Seeded Selection ---
        try {
            const poolQuery = query(collection(firestore, 'questions'), limit(150));
            const poolSnap = await getDocs(poolQuery);
            const pool = [];
            poolSnap.forEach(d => pool.push({ id: d.id, ...d.data() }));

            if (pool.length === 0) return false;

            const rng = seededRandom(getDailyDateSeed());
            const shuffled = seededShuffle(pool, rng);
            const todaysQuestions = shuffled.slice(0, Math.min(numQuestions, shuffled.length));

            state.quizSession.questions = todaysQuestions;
            shuffleOptionsForAllQuestions(state.quizSession.questions);
            state.quizConfig.dailyTheme = null;
            sessionStorage.setItem(todayKey, JSON.stringify({ questions: todaysQuestions, theme: null }));
            return true;
        } catch (error) {
            logError('[Daily Dose] Error fetching seeded questions', error);
            return false;
        }
    }

    // --- Standard mode: Check sessionStorage cache first ---
    const cachedQuestions = sessionStorage.getItem('cachedQuizSession');
    if (cachedQuestions) {
        try {
            state.quizSession.questions = JSON.parse(cachedQuestions);
            return true;
        } catch (e) {
            logError('Error parsing cached questions', e);
        }
    }

    // Standard mode — fetch via Cloud Function so server enforces tier limits.
    // Direct Firestore reads of the questions collection are now blocked in rules.
    try {
        const questions = await fetchQuizQuestions(state.quizConfig.topic, numQuestions);
        state.quizSession.questions = questions;
        sessionStorage.setItem('cachedQuizSession', JSON.stringify(questions));
        return true;
    } catch (error) {
        logError('[Quiz] Error fetching questions via Cloud Function', error);
        return false;
    }
}

export async function renderQuiz(rootElement, { scrollToTop = false } = {}) {
    if (!state.quizSession.questions || state.quizSession.questions.length === 0) {
        rootElement.innerHTML = `<div class="flex justify-center items-center h-screen w-full"><div class="text-center p-12 text-lg font-semibold text-slate-600 dark:text-slate-300">Loading questions from the cloud...</div></div>`;
        
        const success = await fetchAndPrepareQuestions();

        if (!success) {
            rootElement.innerHTML = `<div class="text-center p-12 text-lg font-semibold text-accent-red">Failed to load questions. Please check the console and try again.</div>`;
            return;
        }
    }

    const { isStrictMode } = state.quizConfig;
    const session = state.quizSession;
    const questions = session.questions;

    if (!questions || questions.length === 0) {
        rootElement.innerHTML = `
        <div class="flex flex-col items-center justify-center h-[80vh] w-full px-4 text-center">
            <div class="size-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <span class="material-symbols-outlined text-4xl text-primary">pending_actions</span>
            </div>
            <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-2">Questions Coming Soon</h2>
            <p class="text-lg text-slate-500 max-w-md mb-8">We are currently curating high-yield questions for this topic.</p>
            <button id="empty-state-dashboard-btn" class="px-8 py-4 rounded-xl bg-primary text-background-dark font-black shadow-glow-primary hover:brightness-110 transition-transform duration-300 transform hover:-translate-y-1">
                Return to Dashboard
            </button>
        </div>
        `;
        document.getElementById('empty-state-dashboard-btn').addEventListener('click', () => {
            navigateTo('dashboard');
        });
        initializeThemeSwitch();
        return;
    }

    session.startTime = session.startTime || Date.now();

    const question = questions[session.currentQuestionIndex];
    const userAnswerId = session.userAnswers[question.id];
    const isAnswered = !!userAnswerId;
    const isDailyMode = state.quizConfig.mode === 'daily';
    const showFeedback = (!isStrictMode || isDailyMode) && isAnswered;
    const questionNumber = session.currentQuestionIndex + 1;

    const imageHtml = buildQuestionImageHtml(question, questionNumber);

    let quizHtml = `
    <div class="max-w-7xl mx-auto px-4 py-12 w-full">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div class="lg:col-span-8 space-y-8">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <h1 class="text-xl font-bold flex items-center gap-2">
                        <img src="/logo.svg" alt="SMLE Pro" class="w-7 h-7 drop-shadow-[0_0_6px_rgba(212,175,55,0.5)]">
                        <span style="color:#D4AF37">SMLE Pro</span> —
                        ${isDailyMode && state.quizConfig.dailyTheme
                            ? `<span class="text-primary">${state.quizConfig.dailyTheme}</span>
                               <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40">Admin Pick 🎛️</span>`
                            : `<span class="text-primary">${state.quizConfig.topic}</span>`
                        }
                    </h1>
                    <div class="flex items-center gap-2 sm:gap-4">
                        <div class="flex items-center gap-2 text-primary font-bold">
                            <span class="material-symbols-outlined">schedule</span>
                            <span id="timer">00:00:00</span>
                        </div>
                        <button id="report-btn" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-400/10 text-yellow-500 font-semibold border border-yellow-400/50 hover:bg-yellow-400/20 transition-all">
                            <span class="material-symbols-outlined">report</span>
                            <span class="hidden sm:inline">Report</span>
                        </button>
                        <button id="flag-btn" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-red/10 text-accent-red font-semibold border border-accent-red/50 hover:bg-accent-red/20 transition-all">
                            <span class="material-symbols-outlined">flag</span>
                            <span class="hidden sm:inline">Flag</span>
                        </button>
                         <button id="save-exit-btn" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-200 dark:bg-surface-dark font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-opacity-80 transition-all">
                            <span class="material-symbols-outlined">save</span>
                            <span class="hidden sm:inline">Save & Exit</span>
                        </button>
                    </div>
                </div>

                <div class="w-full bg-slate-200 dark:bg-border-dark rounded-full h-2.5">
                    <div id="progress-bar" class="bg-primary h-2.5 rounded-full" style="width: ${((session.currentQuestionIndex + 1) / questions.length) * 100}%"></div>
                </div>

                <div class="bg-white dark:bg-surface-dark p-6 sm:p-8 rounded-2xl shadow-depth border border-slate-200 dark:border-border-dark min-w-0">
                    <p class="text-lg font-semibold mb-6 text-slate-900 dark:text-white leading-relaxed break-words">${questionNumber}. ${question.question}</p>
                    ${imageHtml}
                    <div id="options-container" class="space-y-4 w-full min-w-0">
                        ${question.options.map((option, i) => {
                            const optionId = String.fromCharCode(65 + i);
                            const canInteract = !isAnswered || (isStrictMode && !isDailyMode);
                            const cursorClass = canInteract ? 'cursor-pointer hover:bg-primary/10 hover:border-primary' : 'cursor-default pointer-events-none';

                            return `
                            <div class="option-wrapper p-4 rounded-xl border border-slate-200 dark:border-border-dark ${cursorClass} transition-all w-full min-w-0 max-w-full box-border" data-option="${optionId}">
                                <div class="flex items-start min-w-0">
                                    <div class="option-letter size-8 flex-shrink-0 rounded-md bg-slate-200 dark:bg-background-dark/80 border border-slate-300 dark:border-border-dark flex items-center justify-center font-bold text-slate-700 dark:text-slate-200">${optionId}</div>
                                    <p class="ml-4 min-w-0 flex-1 break-words text-slate-900 dark:text-slate-100 leading-snug">${option.text}</p>
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="flex justify-between mt-8">
                    <button id="prev-btn" class="px-6 py-2 rounded-lg bg-slate-200 dark:bg-surface-dark font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-opacity-80 transition-all ${session.currentQuestionIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${session.currentQuestionIndex === 0 ? 'disabled' : ''}>Previous</button>
                    <button id="next-btn" class="px-6 py-2 rounded-lg bg-primary text-background-dark font-bold shadow-glow-primary hover:brightness-110 transition-transform duration-300 transform hover:scale-105 ${!isAnswered ? 'hidden' : ''}">
                        ${session.currentQuestionIndex === questions.length - 1 ? 'Finish Exam' : 'Next'}
                    </button>
                </div>
            </div>

            <div class="lg:col-span-4">
                <div class="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-depth border border-slate-200 dark:border-border-dark/50 sticky top-12">
                    <h3 class="text-lg font-bold mb-4">Question Navigator</h3>
                    <div class="grid grid-cols-5 gap-2" id="question-grid">
                        ${questions.map((q, index) => {
                            const isQAnswered = session.userAnswers[q.id];
                            const isCurrent = index === session.currentQuestionIndex;
                            const isFlagged = session.flaggedQuestions.has(q.id);

                            let gridClass = 'bg-slate-200 dark:bg-border-dark/60 hover:bg-slate-300 dark:hover:bg-border-dark';
                            if(isQAnswered) {
                                gridClass = 'bg-primary/30 dark:bg-primary/50';
                            }
                            if(isFlagged) gridClass += ' ring-2 ring-accent-red';
                            if(isCurrent) gridClass = 'bg-primary text-white font-bold';

                            return `<button class="question-grid-item size-11 rounded-md flex items-center justify-center transition-all ${gridClass}" data-index="${index}">${index + 1}</button>`
                        }).join('')}
                    </div>
                     <button id="finish-early-btn" class="w-full mt-6 px-6 py-2 rounded-lg bg-accent-red text-white font-bold hover:bg-accent-red/90 transition-all">Finish & Submit</button>
                </div>
            </div>
        </div>
        ${getTrustDisclaimerStripHtml({ variant: 'footer' })}
    </div>
    `;
    rootElement.innerHTML = quizHtml;

    // Add ARIA live region for screen reader announcements (accessibility)
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'quiz-feedback-live';
    rootElement.prepend(liveRegion);

    if (showFeedback) {
        const answeredOptionId = session.userAnswers[question.id];
        const optionWrapper = document.querySelector(`.option-wrapper[data-option="${answeredOptionId}"]`);
        if (optionWrapper) {
            showInstantFeedback(question, optionWrapper);
        }
    }

    startTimer();
    updateFlagButton();
    document.getElementById('options-container').addEventListener('click', handleOptionSelect);
    document.getElementById('prev-btn').addEventListener('click', handlePrevQuestion);
    document.getElementById('next-btn').addEventListener('click', handleNextQuestion);
    document.getElementById('flag-btn').addEventListener('click', handleFlagQuestion);
    document.getElementById('report-btn').addEventListener('click', handleReportQuestion);
    document.getElementById('question-grid').addEventListener('click', handleGridSelect);
    document.getElementById('finish-early-btn').addEventListener('click', finishQuiz);
    document.getElementById('save-exit-btn').addEventListener('click', saveAndExit);
    initializeThemeSwitch();

    if (scrollToTop) {
        scrollQuizViewportToTop();
    }

    // ── Swipe navigation for mobile ────────────────────────────────────────
    initSwipeNavigation();
}

// ── Swipe Navigation (Mobile) ────────────────────────────────────────────────
let touchStartX = 0;
let touchEndX = 0;
const SWIPE_THRESHOLD = 50; // Minimum swipe distance in pixels

function initSwipeNavigation() {
    const quizArea = document.querySelector('.max-w-7xl.mx-auto');
    if (!quizArea) return;

    quizArea.addEventListener('touchstart', handleTouchStart, { passive: true });
    quizArea.addEventListener('touchend', handleTouchEnd, { passive: true });
}

function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}

function handleSwipe() {
    const diff = touchStartX - touchEndX;
    
    // Swipe left → Next question
    if (diff > SWIPE_THRESHOLD) {
        if (state.quizSession.currentQuestionIndex < state.quizSession.questions.length - 1) {
            handleNextQuestion();
        }
    }
    // Swipe right → Previous question
    else if (diff < -SWIPE_THRESHOLD) {
        if (state.quizSession.currentQuestionIndex > 0) {
            handlePrevQuestion();
        }
    }
}

function showInstantFeedback(question, selectedOptionWrapper) {
    const optionsContainer = document.getElementById('options-container');
    if (!optionsContainer || !selectedOptionWrapper) return;

    const correctIndex = question.options.findIndex((opt) => opt.correct === true);
    if (correctIndex === -1) {
        logWarn('[Quiz] Question has no correct option flagged', question.id);
        return;
    }

    applyInstantFeedbackToDom(optionsContainer, question, selectedOptionWrapper.dataset.option);
}

function handleOptionSelect(e) {
    const optionWrapper = e.target.closest('.option-wrapper');
    if (!optionWrapper) return;

    const question = state.quizSession.questions[state.quizSession.currentQuestionIndex];
    const isDailyMode = state.quizConfig.mode === 'daily';
    const showFeedback = !state.quizConfig.isStrictMode || isDailyMode;
    
    if (state.quizSession.userAnswers[question.id] && showFeedback) {
        return;
    }

    const selectedOptionId = optionWrapper.dataset.option;
    state.quizSession.userAnswers[question.id] = selectedOptionId;
    
    if (!showFeedback) {
        renderQuiz(document.getElementById('app-root'));
        return;
    }
    
    showInstantFeedback(question, optionWrapper);

    const currentQuestionIndex = state.quizSession.currentQuestionIndex;
    const gridItem = document.querySelector(`.question-grid-item[data-index="${currentQuestionIndex}"]`);
    if (gridItem) {
        gridItem.classList.remove('bg-slate-200', 'dark:bg-border-dark/60', 'hover:bg-slate-300', 'dark:hover:bg-border-dark');
        gridItem.classList.add('bg-primary/30', 'dark:bg-primary/50');
    }

    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
        nextBtn.classList.remove('hidden');
    }
    
    autoSaveQuizState();
}

async function handleNextQuestion() {
    if (state.quizSession.currentQuestionIndex < state.quizSession.questions.length - 1) {
        state.quizSession.currentQuestionIndex++;
        autoSaveQuizState();
        await renderQuiz(document.getElementById('app-root'), { scrollToTop: true });
    } else {
        finishQuiz();
    }
}

async function handlePrevQuestion() {
    if (state.quizSession.currentQuestionIndex > 0) {
        state.quizSession.currentQuestionIndex--;
        autoSaveQuizState();
        await renderQuiz(document.getElementById('app-root'), { scrollToTop: true });
    }
}

async function handleFlagQuestion() {
    const questionId = state.quizSession.questions[state.quizSession.currentQuestionIndex].id;
    const flaggedQuestions = state.quizSession.flaggedQuestions;

    if (flaggedQuestions.has(questionId)) {
        flaggedQuestions.delete(questionId);
    } else {
        flaggedQuestions.add(questionId);
    }
    autoSaveQuizState();
    await renderQuiz(document.getElementById('app-root'));
}

async function handleReportQuestion() {
    if (!state.quizSession?.questions?.length) return;

    try {
        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }
    } catch (e) {
        logWarn('[Report] Anonymous sign-in failed', e.message);
        alert('Could not start a session to send your report. Please check your connection and try again.');
        return;
    }

    const question = state.quizSession.questions[state.quizSession.currentQuestionIndex];
    const reason = prompt("Please explain the issue with this question (e.g., 'Outdated guideline', 'Wrong answer', 'Typo'):");

    if (reason && reason.trim() !== '') {
        try {
            const reportedQuestionsCollection = collection(firestore, "reported_questions");
            const uid = auth.currentUser?.uid || null;
            const isAnon = auth.currentUser?.isAnonymous === true;
            await addDoc(reportedQuestionsCollection, {
                question_id: question.id,
                question_text: question.question,
                reason: reason.trim(),
                reported_at: serverTimestamp(),
                reporter_uid: uid,
                reporter_anonymous: isAnon,
            });
            alert("Thank you for your feedback! The question has been reported to the administrators.");
        } catch (error) {
            logError("Error reporting question", error);
            alert("Sorry, there was an error submitting your report. Please try again.");
        }
    }
}

async function handleGridSelect(e) {
    const gridItem = e.target.closest('.question-grid-item');
    if(!gridItem) return;

    const index = parseInt(gridItem.dataset.index, 10);
    state.quizSession.currentQuestionIndex = index;
    autoSaveQuizState();
    await renderQuiz(document.getElementById('app-root'), { scrollToTop: true });
}

function updateFlagButton() {
    const flagBtn = document.getElementById('flag-btn');
    if (!flagBtn) return;
    const questionId = state.quizSession.questions[state.quizSession.currentQuestionIndex].id;
    if (state.quizSession.flaggedQuestions.has(questionId)) {
        flagBtn.classList.add('bg-accent-red', 'text-white');
        flagBtn.classList.remove('bg-accent-red/10', 'text-accent-red');
    } else {
        flagBtn.classList.remove('bg-accent-red', 'text-white');
        flagBtn.classList.add('bg-accent-red/10', 'text-accent-red');
    }
}

function startTimer() {
    clearInterval(timerInterval);
    const startTime = state.quizSession.startTime;
    const timerElement = document.getElementById('timer');

    if (!timerElement) return;

    timerInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const hours = Math.floor(elapsedTime / 3600000);
        const minutes = Math.floor((elapsedTime % 3600000) / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);
        if (timerElement) {
            timerElement.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }, 1000);
}

function finishQuiz() {
    clearInterval(timerInterval);
    state.quizSession.isFinished = true;
    state.quizSession.totalTime = Date.now() - state.quizSession.startTime;

    const topicStats = {};
    let totalCorrect = 0;

    state.quizSession.questions.forEach(q => {
        // Find the correct index based on the new object structure
        const correctIndex = q.options.findIndex(opt => opt.correct === true);
        const correctAnswerId = String.fromCharCode(65 + correctIndex);

        const userAnswerId = state.quizSession.userAnswers[q.id];
        const isCorrect = userAnswerId === correctAnswerId;
        const topic = topicToDrillBucket(q.topic || 'General');

        if (!topicStats[topic]) {
            topicStats[topic] = { correct: 0, total: 0 };
        }

        topicStats[topic].total++;
        if (isCorrect) {
            topicStats[topic].correct++;
            totalCorrect++;
        }
        q.correctAnswer = correctAnswerId;
        q.isCorrect = isCorrect;
    });

    let weakestTopic = { topic: null, score: 101 };
    for (const topic in topicStats) {
        const score = (topicStats[topic].correct / topicStats[topic].total) * 100;
        topicStats[topic].score = Math.round(score);
        if (score < weakestTopic.score) {
            weakestTopic = { topic, score };
        }
    }

    const sessionAnalytics = {
        totalCorrect,
        totalQuestions: state.quizSession.questions.length,
        overallScore: Math.round((totalCorrect / state.quizSession.questions.length) * 100),
        topicStats,
        weakestTopic: weakestTopic.topic
    };
    
    state.quizSession.analytics = sessionAnalytics;
    savePerformance(sessionAnalytics);

    // Update the persistent wrong-answer pool for all registered users.
    // Free users accumulate their daily dose mistakes here — the growing count
    // is shown on the dashboard as a conversion nudge ("🔒 Upgrade to Drill").
    // Tracking is localStorage-only so there is zero Firestore cost.
    if (state.user && !state.user.isAnonymous) {
        updateWrongAnswerPool(state.user.uid, state.quizSession.questions, state.quizSession.userAnswers);
    }

    // Guard against null user (guest daily dose flow)
    if (state.user) {
        localStorage.removeItem(`activeQuizSession_${state.user.uid}`);
    }

    // Persist daily dose completion so the landing page can gate re-entry today
    if (state.quizConfig.mode === 'daily') {
        const { totalCorrect, totalQuestions, overallScore } = sessionAnalytics;
        markDailyDoneToday(totalCorrect, totalQuestions, overallScore);
        // Sync to Firestore for registered users so clearing localStorage can't bypass the gate
        if (state.user && !state.user.isAnonymous) {
            syncDailyDoseToFirestore(state.user.uid, totalCorrect, totalQuestions, overallScore);
        }
        // Submit to daily leaderboard (all users including anonymous)
        if (state.user) {
            submitDailyLeaderboard(state.user.uid, overallScore);
        }
    }

    navigateTo('results');
}

function saveAndExit() {
    clearInterval(timerInterval);
    state.quizSession.totalTime = Date.now() - (state.quizSession.startTime || Date.now());
    const sessionToSave = {
        quizConfig: state.quizConfig,
        quizSession: {
             ...state.quizSession,
            flaggedQuestions: [...state.quizSession.flaggedQuestions]
        }
    };
    // Only persist session for registered (non-anonymous) users
    if (state.user && !state.user.isAnonymous) {
        localStorage.setItem(`activeQuizSession_${state.user.uid}`, JSON.stringify(sessionToSave));
    }
    navigateTo((state.user && !state.user.isAnonymous) ? 'dashboard' : 'landing');
}

export function autoSaveQuizState() {
    if (!state.quizSession || !state.user) return;
    const currentTime = Date.now() - state.quizSession.startTime;
    const sessionToSave = {
        quizConfig: state.quizConfig,
        quizSession: {
             ...state.quizSession,
            totalTime: currentTime,
            flaggedQuestions: [...state.quizSession.flaggedQuestions]
        }
    };
    localStorage.setItem(`activeQuizSession_${state.user.uid}`, JSON.stringify(sessionToSave));
}