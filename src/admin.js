import { navigateTo, firestore, state, functions } from './app.js';
import { ADMIN_CONFIG } from './admin-config.js';
import { initializeThemeSwitch } from './theme.js';
import { formatCorrectAnswerForAdmin } from './resolve-correct-answer.js';
import { collection, getDocs, deleteDoc, doc, addDoc, writeBatch, setDoc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

/** Browser waits longer than default (~70s) or batch runs fail with deadline-exceeded. */
const CALLABLE_BATCH_MS = 62 * 60 * 1000;
const CALLABLE_GEMINI_SINGLE_MS = 3 * 60 * 1000;

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Firebase callable errors often hide detail unless code + message are shown together. */
function formatCallableError(err) {
    if (!err) return 'Unknown error';
    const code = err.code != null ? String(err.code) : '';
    const msg = err.message != null ? String(err.message) : '';
    const details = err.details != null ? String(err.details) : '';
    const lines = [];
    if (code) lines.push(`Code: ${code}`);
    if (msg) lines.push(msg);
    if (details && details !== msg) lines.push(details);
    return lines.length ? lines.join('\n\n') : String(err);
}

export async function renderAdmin(rootElement) {
    if (!state.user || !ADMIN_CONFIG.isAdmin(state.user.email)) {
        navigateTo('dashboard');
        return;
    }

    rootElement.innerHTML = `
    <div id="loading-overlay" class="hidden fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
        <div class="bg-white dark:bg-surface-dark p-8 rounded-2xl shadow-lg flex flex-col items-center gap-4">
            <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
            <p id="loading-text" class="text-lg font-bold text-slate-800 dark:text-slate-200">Loading Admin Data...</p>
        </div>
    </div>
    <div class="max-w-[1200px] mx-auto px-4 md:px-8 w-full pb-12">
        <header class="flex items-center justify-between py-6 border-b border-slate-200 dark:border-border-dark/50 mb-8 sm:flex-row flex-col gap-4">
             <div class="flex items-center gap-3">
                <img src="/logo.svg" alt="SMLE Pro" class="w-10 h-10 drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]">
                <h2 class="text-2xl font-bold tracking-tight">SMLE Pro <span class="text-accent-red">Admin</span></h2>
            </div>
            <div class="flex items-center gap-3 flex-wrap justify-center">
                <button id="back-to-dashboard-btn" class="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200 dark:bg-surface-dark font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-opacity-80 transition-all shadow-sm">
                    <span class="material-symbols-outlined">arrow_back</span>
                    Dashboard
                </button>
                <button id="theme-toggle-btn" class="flex items-center justify-center p-2.5 rounded-xl bg-slate-200 dark:bg-surface-dark border border-slate-300 dark:border-border-dark hover:border-primary transition-all duration-300 shadow-sm">
                    <span class="material-symbols-outlined text-slate-700 dark:hidden">light_mode</span>
                    <span class="material-symbols-outlined text-slate-300 hidden dark:inline">dark_mode</span>
                </button>
            </div>
        </header>

        <main class="space-y-8 w-full">
            <div class="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-depth border border-slate-200 dark:border-border-dark w-full">
                <h3 class="text-xl font-bold mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-border-dark pb-4">
                    <span class="material-symbols-outlined text-accent-orange">report</span> Flagged Questions queue
                </h3>
                
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-100 dark:bg-background-dark/50 text-slate-600 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">
                                <th class="p-4 rounded-tl-xl border-b border-slate-200 dark:border-border-dark">Question Context</th>
                                <th class="p-4 border-b border-slate-200 dark:border-border-dark">Report Reason</th>
                                <th class="p-4 border-b border-slate-200 dark:border-border-dark">Date</th>
                                <th class="p-4 rounded-tr-xl border-b border-slate-200 dark:border-border-dark text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="reports-table-body" class="divide-y divide-slate-200 dark:divide-border-dark">
                        </tbody>
                    </table>
                </div>
            </div>

            <div
                id="admin-image-queue-hint"
                class="rounded-xl border border-primary/35 bg-primary/5 dark:bg-primary/10 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 flex gap-3 items-start"
                role="status"
            >
                <span class="material-symbols-outlined text-primary shrink-0 mt-0.5">tips_and_updates</span>
                <div class="space-y-1 leading-snug">
                    <p>
                        <strong class="text-primary">Gemini:</strong> Scroll to <strong>Image Verification Queue</strong> below.
                        If images are waiting for review, use the button inside the viewer. If the queue is empty, use
                        <strong>Question document ID</strong> in the empty-state box to run Gemini on any question.
                        For many <code class="bg-slate-200 dark:bg-surface-dark px-1 rounded text-xs">image_reference</code> items, use
                        <strong>Batch AI plans</strong> (next card).
                    </p>
                    <p class="text-slate-600 dark:text-slate-400 text-xs">
                        If you deployed Functions but not Hosting, run <code class="bg-slate-200 dark:bg-surface-dark px-1 rounded">npm run build</code> then
                        <code class="bg-slate-200 dark:bg-surface-dark px-1 rounded">firebase deploy --only hosting</code> so this page updates.
                    </p>
                </div>
            </div>

            <div class="rounded-2xl border border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark p-6 shadow-depth">
                <h3 class="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <span class="material-symbols-outlined text-primary">batch_prediction</span>
                    Batch AI image plans
                </h3>
                <p class="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-snug">
                    Calls Gemini for up to <strong>40</strong> questions per run: <code class="text-xs bg-slate-100 dark:bg-background-dark px-1 rounded">image_reference === true</code>
                    and missing <code class="text-xs bg-slate-100 dark:bg-background-dark px-1 rounded">ai_image_plan</code> (unless you force). Re-run until the summary shows no remainder.
                    Large batches can take <strong>many minutes</strong>; keep this tab open until the result appears.
                </p>
                <div class="flex flex-wrap items-end gap-3 mb-3">
                    <div>
                        <label for="admin-batch-plan-limit" class="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Per run</label>
                        <input id="admin-batch-plan-limit" type="number" min="1" max="40" value="15"
                            class="w-24 rounded-xl border border-slate-300 dark:border-border-dark bg-white dark:bg-surface-dark px-3 py-2 text-sm text-slate-900 dark:text-slate-100">
                    </div>
                    <div>
                        <label for="admin-batch-plan-delay" class="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Pause ms (between questions)</label>
                        <input id="admin-batch-plan-delay" type="number" min="500" max="20000" value="3500"
                            title="Higher = fewer Google 503 overload errors; slower batch."
                            class="w-28 rounded-xl border border-slate-300 dark:border-border-dark bg-white dark:bg-surface-dark px-3 py-2 text-sm text-slate-900 dark:text-slate-100">
                    </div>
                    <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                        <input id="admin-batch-plan-force" type="checkbox" class="rounded border-slate-300 text-primary focus:ring-primary">
                        Force (overwrite existing plans)
                    </label>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    If you see many <strong>503 / high demand</strong> errors, raise the pause (e.g. 5000–8000) or run fewer per batch; the server also retries each question automatically.
                </p>
                <button type="button" id="btn-batch-ai-image-plans"
                    class="w-full sm:w-auto py-3 px-6 rounded-xl bg-primary text-white font-bold shadow-glow-primary hover:opacity-90 transition flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined">bolt</span>
                    Run batch (Gemini)
                </button>
                <pre id="admin-batch-plan-result" class="hidden mt-4 text-xs font-mono whitespace-pre-wrap rounded-xl border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-background-dark p-4 text-slate-800 dark:text-slate-200 max-h-64 overflow-y-auto"></pre>
            </div>

            <!-- Image Verification Queue -->
            <div class="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-depth border border-slate-200 dark:border-border-dark w-full">
                <h3 class="text-xl font-bold mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-border-dark pb-4">
                    <span class="material-symbols-outlined text-primary">image</span> Image Verification Queue 
                    <span id="admin-images-count" class="text-sm bg-primary text-white px-2 py-0.5 rounded-full ml-auto">0</span>
                </h3>
                
                <div id="image-queue-loading" class="text-center py-8">
                   <div class="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-2"></div>
                   <p class="text-slate-500">Loading unverified images...</p>
                </div>

                <div id="image-queue-empty" class="hidden text-center py-12">
                   <span class="material-symbols-outlined text-6xl text-slate-300 mb-4 block">check_circle</span>
                   <h4 class="text-lg font-bold text-slate-700 dark:text-slate-300">All caught up!</h4>
                   <p class="text-slate-500">No images pending verification.</p>
                   <p class="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto mt-3 leading-relaxed">
                       This list only shows questions that already have a <strong>candidate photo</strong> and
                       <code class="text-xs bg-slate-200 dark:bg-surface-dark px-1 rounded">image_verified: false</code>.
                       Batch Gemini only saves <strong>search ideas</strong> (<code class="text-xs bg-slate-200 dark:bg-surface-dark px-1 rounded">ai_image_plan</code>) — it does not add pictures.
                       Next step: attach images (e.g. your <code class="text-xs bg-slate-200 dark:bg-surface-dark px-1 rounded">attach-images</code> script); then new items appear here for Approve / Reject.
                   </p>
                   <div class="mt-10 max-w-lg mx-auto text-start space-y-3 px-2 border-t border-slate-200 dark:border-border-dark pt-8">
                       <p class="text-sm text-slate-600 dark:text-slate-400">
                           Run Gemini on <strong>any</strong> question anyway (writes <code class="text-xs bg-slate-200 dark:bg-surface-dark px-1 rounded">ai_image_plan</code> on that doc):
                       </p>
                       <label for="admin-ai-plan-question-id" class="block text-xs font-bold uppercase tracking-wide text-slate-500">Question document ID</label>
                       <input id="admin-ai-plan-question-id" type="text" autocomplete="off"
                           class="w-full rounded-xl border border-slate-300 dark:border-border-dark bg-white dark:bg-surface-dark px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                           placeholder="Firestore ID, e.g. from Console or URL">
                       <button type="button" id="btn-ai-image-plan-by-id"
                           class="w-full py-3 rounded-xl border border-primary/50 text-primary font-bold hover:bg-primary/10 transition flex items-center justify-center gap-2">
                           <span class="material-symbols-outlined">auto_awesome</span>
                           Generate AI image plan
                       </button>
                       <div id="admin-ai-plan-by-id-result" class="hidden text-start text-sm rounded-xl border border-primary/25 bg-primary/5 dark:bg-primary/10 p-4 text-slate-800 dark:text-slate-100 space-y-2"></div>
                   </div>
                </div>

                <div id="image-queue-viewer" class="hidden flex flex-col md:flex-row gap-6 bg-slate-50 dark:bg-background-dark p-6 rounded-xl border border-slate-200 dark:border-border-dark">
                    <div class="md:w-1/2 flex items-center justify-center bg-slate-200/50 dark:bg-surface-dark rounded-lg p-4 overflow-hidden min-h-[300px] relative">
                        <img id="admin-q-image" src="" alt="Clinical" class="max-w-full max-h-[400px] rounded shadow object-contain transition-opacity">
                        <div class="absolute top-2 left-2 bg-white/90 dark:bg-black/50 px-2 py-1 rounded text-xs font-bold text-primary shadow-sm uppercase tracking-wider">
                           Source: <span id="admin-q-source">wikimedia</span>
                        </div>
                    </div>
                    <div class="md:w-1/2 flex flex-col">
                        <div class="mb-auto">
                           <span id="admin-q-topic" class="text-xs font-bold uppercase tracking-wider text-accent-purple mb-2 block">Topic</span>
                           <h4 id="admin-q-text" class="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 bg-white dark:bg-surface-dark p-3 rounded border border-slate-200 dark:border-border-dark max-h-48 overflow-y-auto">Question text...</h4>
                           
                           <div class="mb-4">
                               <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Diagnosis / Answer:</span>
                               <p id="admin-q-diag" class="font-bold text-slate-700 dark:text-slate-300 mt-1">Diagnosis</p>
                           </div>
                           <div class="mb-4">
                               <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">All options</span>
                               <div id="admin-q-options" class="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300 max-h-44 overflow-y-auto rounded-lg border border-slate-200 dark:border-border-dark p-3 bg-white dark:bg-surface-dark"></div>
                           </div>
                           
                           <div>
                               <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Search Query Used:</span>
                               <code id="admin-q-query" class="block mt-1 bg-slate-200 dark:bg-surface-dark px-2 py-1 rounded text-sm text-slate-600 dark:text-slate-400">Query</code>
                           </div>
                           <div id="admin-q-ai-plan-wrap" class="mt-4 hidden">
                               <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">AI image plan</span>
                               <div id="admin-q-ai-plan" class="mt-1 text-sm text-slate-700 dark:text-slate-300 rounded-lg border border-primary/30 bg-primary/5 dark:bg-primary/10 p-3 space-y-2 max-h-56 overflow-y-auto"></div>
                           </div>
                        </div>
                        
                         <div class="flex flex-col gap-2 mt-6">
                             <!-- Manual URL paste area -->
                             <div class="flex gap-2">
                                 <input id="admin-paste-image-url" type="text" autocomplete="off"
                                     class="flex-1 rounded-xl border border-slate-300 dark:border-border-dark bg-white dark:bg-surface-dark px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                                     placeholder="Paste a direct image URL (ends in .jpg/.png/.webp)">
                                 <button id="btn-paste-image-url"
                                     class="px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-500/20 transition flex items-center gap-1.5 text-sm shrink-0">
                                     <span class="material-symbols-outlined text-lg">add_photo_alternate</span>
                                     Attach
                                 </button>
                             </div>
                             <button type="button" id="btn-ai-image-plan" class="w-full py-3 rounded-xl border border-primary/50 text-primary font-bold hover:bg-primary/10 transition flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined">auto_awesome</span>
                                Generate AI image plan (Gemini)
                             </button>
                             <div class="flex gap-4">
                             <button id="btn-reject-img" class="flex-1 py-3 bg-red-50 dark:bg-red-900/20 text-accent-red font-bold rounded-xl border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined">delete</span> Reject
                             </button>
                             <button id="btn-approve-img" class="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-glow-primary hover:opacity-90 transition-all flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined">check_circle</span> Approve
                             </button>
                             </div>
                         </div>
                    </div>
                </div>
            </div>

        </main>
    </div>
    `;

    let loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');

    document.getElementById('back-to-dashboard-btn').addEventListener('click', () => {
        navigateTo('dashboard');
    });

    bindBatchGenerateImagePlansButton();
    await fetchAndRenderReports();
    await fetchAndRenderImageVerification();
    initializeThemeSwitch();
}

// ── IMAGE VERIFICATION LOGIC ──────────────────────────────────────
let unverifiedImagesQueue = [];
let currentImageIndex = 0;

async function fetchAndRenderImageVerification() {
    const loadingEl = document.getElementById('image-queue-loading');
    
    try {
        // We fetch the collection and filter locally to bypass any FAILED_PRECONDITION indexing or missing field permissions
        // Fetches ALL questions, filters client-side.
        // Catches both: explicit image_verified: false AND questions with image_url but no image_verified yet.
        const snapshot = await getDocs(collection(firestore, "questions"));
        unverifiedImagesQueue = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const hasUrl = !!data.image_url;
            const explicitlyUnverified = data.image_verified === false;
            const missingVerification = hasUrl && data.image_verified == null;
            if (explicitlyUnverified || missingVerification) {
                unverifiedImagesQueue.push({ id: doc.id, ...data });
            }
        });

        const btnApprove = document.getElementById('btn-approve-img');
        const btnReject = document.getElementById('btn-reject-img');
        
        // Remove old listeners by replacing elements to avoid duplicates on re-renders
        const newApprove = btnApprove.cloneNode(true);
        const newReject = btnReject.cloneNode(true);
        btnApprove.replaceWith(newApprove);
        btnReject.replaceWith(newReject);

        newApprove.addEventListener('click', () => handleImageVerification('approve', newApprove, newReject));
        newReject.addEventListener('click', () => handleImageVerification('reject', newApprove, newReject));

        bindAiImagePlanButton();
        bindAiImagePlanByIdButton();
        bindPasteImageUrlButton();

        currentImageIndex = 0;
        updateImageVerificationUI();
    } catch (err) {
        console.error("Error fetching unverified images: ", err);
        loadingEl.innerHTML = `<span class="text-accent-red font-bold">Failed to load image queue. Check console.</span>`;
    }
}

function renderAiPlanHtml(plan) {
    if (!plan || typeof plan !== 'object') return '';
    const q = (plan.search_queries || []).map((s) => escapeHtml(s)).join(', ');
    const avoid = (plan.must_avoid || []).map((s) => escapeHtml(s)).join(', ');
    return `
        <p><span class="font-bold text-slate-500 dark:text-slate-400">Summary:</span> ${escapeHtml(plan.visual_summary || '')}</p>
        <p><span class="font-bold text-slate-500 dark:text-slate-400">Modality:</span> ${escapeHtml(plan.modality || '')}
          ${typeof plan.confidence === 'number' ? ` · <span class="font-bold">Confidence</span> ${plan.confidence.toFixed(2)}` : ''}</p>
        <p><span class="font-bold text-slate-500 dark:text-slate-400">Queries:</span> ${q || '—'}</p>
        <p><span class="font-bold text-slate-500 dark:text-slate-400">Avoid:</span> ${avoid || '—'}</p>
        ${plan.skip_auto_image ? `<p class="text-amber-600 dark:text-amber-400 font-bold">Skip auto-image: ${escapeHtml(plan.skip_reason || '')}</p>` : ''}
        <p class="text-slate-600 dark:text-slate-400"><span class="font-bold">Rationale:</span> ${escapeHtml(plan.rationale || '')}</p>
    `;
}

function updateImageVerificationUI() {
    const countEl = document.getElementById('admin-images-count');
    const loadingEl = document.getElementById('image-queue-loading');
    const emptyEl = document.getElementById('image-queue-empty');
    const viewerEl = document.getElementById('image-queue-viewer');

    countEl.textContent = unverifiedImagesQueue.length - currentImageIndex;

    if (currentImageIndex >= unverifiedImagesQueue.length) {
        loadingEl.classList.add('hidden');
        viewerEl.classList.add('hidden');
        emptyEl.classList.remove('hidden');
        return;
    }

    const currentDoc = unverifiedImagesQueue[currentImageIndex];

    loadingEl.classList.add('hidden');
    emptyEl.classList.add('hidden');
    viewerEl.classList.remove('hidden');
    viewerEl.classList.add('flex'); // restore flex display

    const imgEl = document.getElementById('admin-q-image');
    imgEl.style.opacity = 0;
    setTimeout(() => {
        imgEl.src = currentDoc.image_url || '';
        imgEl.onload = () => imgEl.style.opacity = 1;
    }, 100);

    document.getElementById('admin-q-source').textContent = currentDoc.image_source || 'Unknown';
    document.getElementById('admin-q-topic').textContent = currentDoc.topic || 'General';
    document.getElementById('admin-q-text').textContent = currentDoc.question || 'No text';
    document.getElementById('admin-q-query').textContent = currentDoc.image_search_query || 'N/A';

    document.getElementById('admin-q-diag').textContent = formatCorrectAnswerForAdmin(currentDoc);

    const optsCol = document.getElementById('admin-q-options');
    if (optsCol) {
        const opts = Array.isArray(currentDoc.options) ? currentDoc.options : [];
        optsCol.innerHTML =
            opts.length > 0
                ? opts
                      .map((o, i) => {
                          const id = String.fromCharCode(65 + i);
                          const mark = o.correct
                              ? 'font-bold text-emerald-600 dark:text-emerald-400'
                              : '';
                          return `<p class="leading-snug ${mark}"><span class="font-mono text-slate-500 dark:text-slate-400">${id}.</span> ${escapeHtml(o.text || '')}</p>`;
                      })
                      .join('')
                : '<p class="text-slate-500 text-sm">No options on document</p>';
    }

    const aiWrap = document.getElementById('admin-q-ai-plan-wrap');
    const aiBox = document.getElementById('admin-q-ai-plan');
    const plan = currentDoc.ai_image_plan;
    if (aiWrap && aiBox) {
        if (plan && typeof plan === 'object') {
            aiWrap.classList.remove('hidden');
            aiBox.innerHTML = renderAiPlanHtml(plan);
        } else {
            aiWrap.classList.add('hidden');
            aiBox.innerHTML = '';
        }
    }
}

function bindBatchGenerateImagePlansButton() {
    const btn = document.getElementById('btn-batch-ai-image-plans');
    if (!btn) return;
    const fresh = btn.cloneNode(true);
    btn.replaceWith(fresh);
    fresh.addEventListener('click', async () => {
        const limitInput = document.getElementById('admin-batch-plan-limit');
        const delayInput = document.getElementById('admin-batch-plan-delay');
        const forceEl = document.getElementById('admin-batch-plan-force');
        const out = document.getElementById('admin-batch-plan-result');
        const limit = Math.min(40, Math.max(1, parseInt(limitInput?.value, 10) || 15));
        if (limitInput) limitInput.value = String(limit);
        const delayMs = Math.min(20000, Math.max(500, parseInt(delayInput?.value, 10) || 3500));
        if (delayInput) delayInput.value = String(delayMs);
        const force = !!(forceEl && forceEl.checked);
        fresh.disabled = true;
        const label = fresh.innerHTML;
        fresh.innerHTML = `<span class="animate-spin material-symbols-outlined">sync</span> Batch running…`;
        try {
            const batchFn = httpsCallable(functions, 'batchGenerateImagePlans', {
                timeout: CALLABLE_BATCH_MS,
            });
            const result = await batchFn({ limit, force, delayMs });
            const d = result.data || {};
            if (out) {
                out.classList.remove('hidden');
                out.textContent = JSON.stringify(
                    {
                        processed: d.processed,
                        failed: d.failed,
                        batchSize: d.batchSize,
                        remainingCandidateEstimate: d.remainingCandidateEstimate,
                        scannedImageReferenceDocs: d.scannedImageReferenceDocs,
                        candidatesNeedingPlanBeforeBatch: d.candidatesNeedingPlanBeforeBatch,
                        hint: d.hint,
                        errors: d.errors,
                    },
                    null,
                    2
                );
            }
            alert(
                `Batch finished: ${d.processed ?? 0} saved, ${d.failed ?? 0} failed. Remaining (estimate): ${d.remainingCandidateEstimate ?? '—'}`
            );
        } catch (e) {
            console.error(e);
            const msg = formatCallableError(e);
            alert(msg);
            if (out) {
                out.classList.remove('hidden');
                out.textContent = msg;
            }
        } finally {
            fresh.disabled = false;
            fresh.innerHTML = label;
        }
    });
}

function bindAiImagePlanByIdButton() {
    const btn = document.getElementById('btn-ai-image-plan-by-id');
    if (!btn) return;
    const fresh = btn.cloneNode(true);
    btn.replaceWith(fresh);
    fresh.addEventListener('click', async () => {
        const input = document.getElementById('admin-ai-plan-question-id');
        const out = document.getElementById('admin-ai-plan-by-id-result');
        const qid = (input?.value || '').trim();
        if (!qid) {
            alert('Paste the Firestore document ID for the question (questions collection).');
            return;
        }
        fresh.disabled = true;
        const label = fresh.innerHTML;
        fresh.innerHTML = `<span class="animate-spin material-symbols-outlined">sync</span> Running Gemini…`;
        try {
            const generateImagePlan = httpsCallable(functions, 'generateImagePlan', {
                timeout: CALLABLE_GEMINI_SINGLE_MS,
            });
            const result = await generateImagePlan({ questionId: qid });
            const plan = result.data?.plan;
            if (out) {
                if (plan) {
                    out.classList.remove('hidden');
                    out.innerHTML = `<p class="text-xs font-mono text-slate-500 mb-2">Saved on: ${escapeHtml(qid)}</p>${renderAiPlanHtml(plan)}`;
                } else {
                    out.classList.remove('hidden');
                    out.textContent = 'Done — open this question in Console to see ai_image_plan.';
                }
            }
            alert('AI image plan saved on that question document.');
        } catch (e) {
            console.error(e);
            alert(formatCallableError(e));
            if (out) {
                out.classList.add('hidden');
                out.innerHTML = '';
            }
        } finally {
            fresh.disabled = false;
            fresh.innerHTML = label;
        }
    });
}

function bindAiImagePlanButton() {
    const btn = document.getElementById('btn-ai-image-plan');
    if (!btn) return;
    const fresh = btn.cloneNode(true);
    btn.replaceWith(fresh);
    fresh.addEventListener('click', async () => {
        const currentDoc = unverifiedImagesQueue[currentImageIndex];
        if (!currentDoc?.id) return;
        fresh.disabled = true;
        const label = fresh.innerHTML;
        fresh.innerHTML = `<span class="animate-spin material-symbols-outlined">sync</span> Running Gemini…`;
        try {
            const generateImagePlan = httpsCallable(functions, 'generateImagePlan', {
                timeout: CALLABLE_GEMINI_SINGLE_MS,
            });
            await generateImagePlan({ questionId: currentDoc.id });
            const snap = await getDoc(doc(firestore, 'questions', currentDoc.id));
            if (snap.exists()) {
                unverifiedImagesQueue[currentImageIndex] = { id: snap.id, ...snap.data() };
            }
            updateImageVerificationUI();
            alert('AI image plan saved on this question document.');
        } catch (e) {
            console.error(e);
            alert(formatCallableError(e));
        } finally {
            fresh.disabled = false;
            fresh.innerHTML = label;
        }
    });
}

function bindPasteImageUrlButton() {
    const btn = document.getElementById('btn-paste-image-url');
    if (!btn) return;
    const fresh = btn.cloneNode(true);
    btn.replaceWith(fresh);
    fresh.addEventListener('click', async () => {
        const input = document.getElementById('admin-paste-image-url');
        const url = (input?.value || '').trim();
        if (!url) { alert('Paste a direct image URL first.'); return; }
        const currentDoc = unverifiedImagesQueue[currentImageIndex];
        if (!currentDoc?.id) { alert('No question selected in the queue.'); return; }
        if (!/^https?:\/\/.+\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(url)) {
            alert('URL must end in .jpg, .png, or .webp\n\nMake sure it is a DIRECT image URL, not a page URL.');
            return;
        }
        fresh.disabled = true;
        const label = fresh.innerHTML;
        fresh.innerHTML = `<span class="animate-spin material-symbols-outlined">sync</span> Saving…`;
        try {
            const docRef = doc(firestore, "questions", currentDoc.id);
            await setDoc(docRef, {
                image_url: url,
                image_source: 'manual',
                image_verified: false,
                image_attached_at: new Date().toISOString(),
            }, { merge: true });
            // Reload the queue item with updated data
            const snap = await getDoc(doc(firestore, 'questions', currentDoc.id));
            if (snap.exists()) {
                unverifiedImagesQueue[currentImageIndex] = { id: snap.id, ...snap.data() };
            }
            updateImageVerificationUI();
            input.value = ''; // clear the input
        } catch (e) {
            console.error('Failed to attach image URL:', e);
            alert('Firestore write failed. Check console for details.');
        } finally {
            fresh.disabled = false;
            fresh.innerHTML = label;
        }
    });
}

async function handleImageVerification(action, btnApprove, btnReject) {
    const currentDoc = unverifiedImagesQueue[currentImageIndex];
    if (!currentDoc) return;

    btnApprove.disabled = true;
    btnReject.disabled = true;
    const originalTextApprove = btnApprove.innerHTML;
    const originalTextReject = btnReject.innerHTML;

    if (action === 'approve') btnApprove.innerHTML = `<span class="animate-spin material-symbols-outlined">sync</span> Saving...`;
    else btnReject.innerHTML = `<span class="animate-spin material-symbols-outlined">sync</span> Trashing...`;

    try {
        const docRef = doc(firestore, "questions", currentDoc.id);
        if (action === 'approve') {
            await setDoc(docRef, { image_verified: true }, { merge: true });
        } else {
            // Remove the image reference completely
            await setDoc(docRef, { 
                image_url: null, 
                image_verified: null, 
                image_rejected: true 
            }, { merge: true });
        }
        currentImageIndex++;
        updateImageVerificationUI();
    } catch (e) {
        console.error("Verification failed:", e);
        alert("Failed to update Firestore. Did you deploy your firestore.rules?");
    } finally {
        btnApprove.disabled = false;
        btnReject.disabled = false;
        btnApprove.innerHTML = originalTextApprove;
        btnReject.innerHTML = originalTextReject;
    }
}
// ──────────────────────────────────────────────────────────────────

export async function bulkUploadQuestions(data) {
    if (!data || !Array.isArray(data)) {
        console.error("Invalid data formatted provided for bulk upload. Must be an array.");
        alert("Bulk upload failed. Data is not an array.");
        return;
    }

    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
        if (loadingText) loadingText.textContent = `Analyzing ${data.length} questions...`;
    }

    const questionsCol = collection(firestore, "questions");
    const BATCH_SIZE = 500;
    let totalUploaded = 0;

    console.log(`[Admin] Starting batched bulk upload for ${data.length} questions...`);

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const chunk = data.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(firestore);
        
        chunk.forEach((item, index) => {
            const rawQuestion = item.question_text || item.question || '';
            const safeText = String(rawQuestion).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const slugId = safeText ? safeText.substring(0, 50) : `q-${Date.now()}-${index}`;
            const docId = slugId || `q-${Date.now()}-${index}`;
            
            const docRef = doc(questionsCol, docId);
            batch.set(docRef, {
                question: rawQuestion,
                options: Array.isArray(item.options) ? item.options : [],
                correct_answer: item.correct_answer || item.correctAnswer || '',
                rationale: item.rationale || '',
                topic: item.topic || 'General',
                difficulty: item.difficulty || 'Medium'
            }, { merge: true }); // Merge true prevents overwriting other metadata if it exists
        });

        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        try {
            await batch.commit();
            totalUploaded += chunk.length;
            console.log(`[Admin] Successfully committed batch ${batchNumber}. Progress: ${totalUploaded}/${data.length}`);
            if (loadingText) loadingText.textContent = `Uploading: ${totalUploaded}/${data.length} questions...`;
        } catch (err) {
            console.error(`[Admin] CRITICAL ERROR: Batch ${batchNumber} (indices ${i} to ${i + chunk.length - 1}) failed to commit:`, err);
            alert(`Batch ${batchNumber} failed to upload. Check the web console for details.`);
        }
    }

    console.log(`[Admin] Batched bulk upload complete! Total uploaded: ${totalUploaded}/${data.length}`);
    alert(`Success! Bulk Uploaded ${totalUploaded} questions. Dashboard topics will now update.`);
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
    
    // Automatically redirect back to dashboard to refresh dynamic topics
    navigateTo('dashboard');
}

// Ensure it's globally available for console invocation if needed
window.bulkUploadQuestions = bulkUploadQuestions;

async function fetchAndRenderReports() {
    const tbody = document.getElementById('reports-table-body');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    try {
        const reportsCol = collection(firestore, "reported_questions");
        const snapshot = await getDocs(reportsCol);
        
        let reports = [];
        snapshot.forEach(doc => {
            reports.push({ id: doc.id, ...doc.data() });
        });

        reports.sort((a, b) => {
            const timeA = a.reported_at?.toMillis ? a.reported_at.toMillis() : Date.now();
            const timeB = b.reported_at?.toMillis ? b.reported_at.toMillis() : Date.now();
            return timeB - timeA;
        });

        if (reports.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="p-8 text-center text-slate-500 font-medium">
                        No flagged questions found. You're all caught up! ✨
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = reports.map(r => {
                const dateStr = r.reported_at ? new Date(r.reported_at.toMillis()).toLocaleDateString() : 'Unknown Date';
                return `
                <tr class="hover:bg-slate-50 dark:hover:bg-background-dark/20 transition-colors">
                    <td class="p-4 max-w-xs">
                        <div class="text-xs font-mono text-slate-400 mb-1">ID: ${r.question_id || 'N/A'}</div>
                        <div class="text-sm font-medium text-slate-800 dark:text-slate-200 truncate" title="${r.question_text || ''}">${r.question_text || '-'}</div>
                    </td>
                    <td class="p-4 text-sm text-accent-red font-medium max-w-sm whitespace-normal">
                        ${r.reason || 'No reason provided'}
                    </td>
                    <td class="p-4 text-sm text-slate-500">
                        ${dateStr}
                    </td>
                    <td class="p-4 text-right">
                        <button class="resolve-report-btn flex items-center justify-end gap-2 ml-auto px-4 py-2 rounded-lg bg-accent-green/10 text-accent-green font-bold hover:bg-accent-green hover:text-white transition-all duration-300" data-id="${r.id}">
                            <span class="material-symbols-outlined text-sm">done_all</span>
                            Resolve
                        </button>
                    </td>
                </tr>
                `;
            }).join('');
        }

        document.querySelectorAll('.resolve-report-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const reportId = e.currentTarget.dataset.id;
                if(confirm('Mark as resolved and delete this report from Firestore?')) {
                    try {
                        const loadingOverlay = document.getElementById('loading-overlay');
                        if(loadingOverlay) loadingOverlay.classList.remove('hidden');
                        
                        await deleteDoc(doc(firestore, "reported_questions", reportId));
                        await fetchAndRenderReports(); 
                    } catch (err) {
                        console.error("Failed to delete report: ", err);
                        alert("Error resolving report. Check console.");
                        if(loadingOverlay) loadingOverlay.classList.add('hidden');
                    }
                }
            });
        });

    } catch (error) {
        console.error("Error fetching reports: ", error);
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-accent-red font-bold">Error loading reports. Check your console.</td></tr>`;
    } finally {
        if(loadingOverlay) loadingOverlay.classList.add('hidden');
    }
}
