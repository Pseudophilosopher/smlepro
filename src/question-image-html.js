/**
 * Builds the optional clinical-image block for quiz / review views.
 * Real URLs come from Firestore (`image_url`) after admin verification (`image_verified: true`).
 */

function sanitizeImageUrl(raw) {
    if (typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';
    try {
        const u = new URL(trimmed);
        if (u.protocol !== 'https:') return '';
        return u.href;
    } catch {
        return '';
    }
}

/**
 * @param {object} question — Firestore question payload (+ id)
 * @param {number} questionNumber — 1-based index for alt text
 * @returns {string} HTML fragment (empty string if no block)
 */
export function buildQuestionImageHtml(question, questionNumber) {
    const safeUrl = sanitizeImageUrl(question?.image_url);
    const verified = question?.image_verified === true;
    const wantsImage = question?.image_reference === true;

    if (safeUrl && verified) {
        const esc = safeUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        return `
            <div class="my-6 bg-slate-100 dark:bg-background-dark/50 rounded-lg overflow-hidden border border-slate-200 dark:border-border-dark flex justify-center items-center">
                <img src="${esc}" alt="Clinical image for question ${questionNumber}" class="object-contain max-h-[min(420px,55vh)] w-full" loading="lazy" decoding="async">
            </div>
        `;
    }

    if (wantsImage) {
        return `
            <div class="my-6 flex items-center gap-3 rounded-lg border border-dashed border-slate-300 dark:border-border-dark bg-slate-50 dark:bg-background-dark/40 px-4 py-5 text-slate-500 dark:text-slate-400">
                <span class="material-symbols-outlined shrink-0 text-2xl" aria-hidden="true">hide_image</span>
                <p class="text-sm leading-snug">Clinical image is under curation and will appear here once verified.</p>
            </div>
        `;
    }

    return '';
}
