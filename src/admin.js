import { navigateTo, firestore, state } from './app.js';
import { ADMIN_CONFIG } from './admin-config.js';
import { initializeThemeSwitch } from './theme.js';
import { collection, getDocs, deleteDoc, doc, writeBatch, setDoc, getDoc } from 'firebase/firestore';

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
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



            <!-- Edit question modal -->
            <div id="edit-question-modal" class="hidden fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onclick="if(event.target===this)document.getElementById('edit-question-modal')?.classList.add('hidden')">
                <div class="bg-white dark:bg-surface-dark rounded-2xl shadow-depth border border-slate-200 dark:border-border-dark w-full max-w-2xl max-h-[90vh] flex flex-col">
                    <div class="flex items-center justify-between p-5 border-b border-slate-200 dark:border-border-dark shrink-0">
                        <h3 class="text-lg font-bold flex items-center gap-2">
                            <span class="material-symbols-outlined text-primary">edit</span>
                            Edit Question
                        </h3>
                        <button type="button" onclick="document.getElementById('edit-question-modal')?.classList.add('hidden')" class="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-border-dark transition">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div id="edit-question-body" class="p-5 overflow-y-auto space-y-4">
                        <div class="text-center text-slate-500 py-8">
                            <div class="animate-spin inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-2"></div>
                            <p>Loading question data...</p>
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

    await fetchAndRenderReports();
    initializeThemeSwitch();
}
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
                const safeQuestion = escapeHtml(r.question_text || '-');
                const safeReason = escapeHtml(r.reason || 'No reason provided');
                const safeId = escapeHtml(r.question_id || 'N/A');
                const safeReportId = escapeHtml(r.id);
                return `
                <tr class="hover:bg-slate-50 dark:hover:bg-background-dark/20 transition-colors">
                    <td class="p-4 max-w-xs">
                        <div class="text-xs font-mono text-slate-400 mb-1">ID: ${safeId}</div>
                        <div class="text-sm font-medium text-slate-800 dark:text-slate-200 truncate" title="${safeQuestion}">${safeQuestion}</div>
                    </td>
                    <td class="p-4 text-sm text-accent-red font-medium max-w-sm whitespace-normal">
                        ${safeReason}
                    </td>
                    <td class="p-4 text-sm text-slate-500">
                        ${dateStr}
                    </td>
                    <td class="p-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                            <button class="edit-report-btn flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary hover:text-white transition-all duration-300" data-qid="${safeId}">
                                <span class="material-symbols-outlined text-sm">edit</span>
                                Edit
                            </button>
                            <button class="resolve-report-btn flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-green/10 text-accent-green font-bold hover:bg-accent-green hover:text-white transition-all duration-300" data-id="${safeReportId}">
                                <span class="material-symbols-outlined text-sm">done_all</span>
                                Resolve
                            </button>
                        </div>
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

        document.querySelectorAll('.edit-report-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const qid = btn.dataset.qid;
                if (qid) openQuestionEditor(qid);
            });
        });

    } catch (error) {
        console.error("Error fetching reports: ", error);
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-accent-red font-bold">Error loading reports. Check your console.</td></tr>`;
    } finally {
        if(loadingOverlay) loadingOverlay.classList.add('hidden');
    }
}

async function openQuestionEditor(questionId) {
    const modal = document.getElementById('edit-question-modal');
    const body = document.getElementById('edit-question-body');
    if (!modal || !body) return;

    modal.classList.remove('hidden');
    body.innerHTML = `
        <div class="text-center text-slate-500 py-8">
            <div class="animate-spin inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-2"></div>
            <p>Loading question data...</p>
        </div>
    `;

    try {
        const snap = await getDoc(doc(firestore, 'questions', questionId));
        if (!snap.exists()) {
            body.innerHTML = `<p class="text-accent-red text-center py-8">Question document not found (ID: ${escapeHtml(questionId)}). It may have been deleted.</p>`;
            return;
        }
        const data = { id: snap.id, ...snap.data() };
        const opts = Array.isArray(data.options) ? data.options : [];

        body.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Question ID</label>
                    <input type="text" value="${escapeHtml(data.id)}" readonly class="w-full rounded-xl border border-slate-300 dark:border-border-dark bg-slate-100 dark:bg-background-dark px-3 py-2 text-sm text-slate-500 font-mono">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Question Stem</label>
                    <textarea id="eq-stem" rows="3" class="w-full rounded-xl border border-slate-300 dark:border-border-dark bg-white dark:bg-surface-dark px-3 py-2 text-sm text-slate-900 dark:text-slate-100">${escapeHtml(data.question || '')}</textarea>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Options</label>
                    <div class="space-y-2" id="eq-options">
                        ${['A', 'B', 'C', 'D', 'E'].map((letter, i) => {
                            const opt = opts[i] || { text: '' };
                            const checked = opt.correct === true ? 'checked' : '';
                            return `
                            <div class="flex items-center gap-2">
                                <span class="font-mono text-xs font-bold text-slate-400 w-5 shrink-0">${letter}</span>
                                <input type="radio" name="eq-correct" value="${i}" ${checked} class="rounded-full border-slate-300 text-emerald-500 focus:ring-emerald-400 shrink-0" title="Mark as correct answer">
                                <input type="text" value="${escapeHtml(opt.text || '')}" data-index="${i}" class="eq-opt-input flex-1 rounded-lg border border-slate-300 dark:border-border-dark bg-white dark:bg-surface-dark px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100">
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Rationale</label>
                    <textarea id="eq-rationale" rows="3" class="w-full rounded-xl border border-slate-300 dark:border-border-dark bg-white dark:bg-surface-dark px-3 py-2 text-sm text-slate-900 dark:text-slate-100">${escapeHtml(data.rationale || '')}</textarea>
                </div>
                <div class="flex gap-4">
                    <div class="flex-1">
                        <label class="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Topic</label>
                        <input id="eq-topic" type="text" value="${escapeHtml(data.topic || '')}" class="w-full rounded-xl border border-slate-300 dark:border-border-dark bg-white dark:bg-surface-dark px-3 py-2 text-sm text-slate-900 dark:text-slate-100">
                    </div>
                    <div class="w-32">
                        <label class="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Difficulty</label>
                        <select id="eq-difficulty" class="w-full rounded-xl border border-slate-300 dark:border-border-dark bg-white dark:bg-surface-dark px-3 py-2 text-sm text-slate-900 dark:text-slate-100">
                            ${['easy', 'medium', 'hard'].map(d => `<option value="${d}" ${(data.difficulty || '').toLowerCase() === d ? 'selected' : ''}>${d.charAt(0).toUpperCase() + d.slice(1)}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-border-dark mt-4">
                <button type="button" onclick="document.getElementById('edit-question-modal')?.classList.add('hidden')" class="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-border-dark text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-border-dark transition">
                    Cancel
                </button>
                <button type="button" id="eq-save-btn" class="px-5 py-2.5 rounded-xl bg-primary text-white font-bold shadow-glow-primary hover:opacity-90 transition flex items-center gap-2">
                    <span class="material-symbols-outlined text-sm">save</span>
                    Save Changes
                </button>
            </div>
        `;

        document.getElementById('eq-save-btn').addEventListener('click', async () => {
            const btn = document.getElementById('eq-save-btn');
            btn.disabled = true;
            const label = btn.innerHTML;
            btn.innerHTML = `<span class="animate-spin material-symbols-outlined text-sm">sync</span> Saving...`;

            try {
                const stem = document.getElementById('eq-stem')?.value?.trim() || '';
                const optInputs = document.querySelectorAll('.eq-opt-input');
                const correctRadio = document.querySelector('input[name="eq-correct"]:checked');
                const correctIndex = correctRadio ? parseInt(correctRadio.value) : -1;
                const options = Array.from(optInputs).map((inp, i) => ({
                    text: inp.value.trim(),
                    correct: i === correctIndex,
                })).filter(o => o.text);

                const rationale = document.getElementById('eq-rationale')?.value?.trim() || '';
                const topic = document.getElementById('eq-topic')?.value?.trim() || '';
                const difficulty = document.getElementById('eq-difficulty')?.value || 'medium';

                await setDoc(doc(firestore, 'questions', questionId), {
                    question: stem,
                    options,
                    rationale,
                    topic,
                    difficulty,
                    edited_at: new Date().toISOString(),
                    edited_by: 'admin',
                }, { merge: true });

                modal.classList.add('hidden');
                alert('Question updated successfully!');
            } catch (e) {
                console.error('Failed to save question:', e);
                alert('Error saving question. Check console.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = label;
            }
        });

    } catch (e) {
        console.error('Failed to load question for editing:', e);
        body.innerHTML = `<p class="text-accent-red text-center py-8">Failed to load question. Check console for details.</p>`;
    }
}
