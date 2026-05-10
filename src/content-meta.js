/**
 * Single source of truth for “freshness” and trust copy.
 * Bump CONTENT_LAST_REVIEWED_ISO when the question bank / rationales are materially reviewed.
 * Also update the clinical review line in legal.html (hero) to the same date.
 */
export const CONTENT_LAST_REVIEWED_ISO = '2026-04-06';
export const CONTENT_LAST_REVIEWED_DISPLAY = '6 April 2026';

/**
 * Compact strip for dashboard + quiz (same trust message as landing banner).
 * @param {{ variant?: 'default' | 'footer' }} [options] — `footer` = below main content, lighter visual weight on quiz.
 */
export function getTrustDisclaimerStripHtml({ variant = 'default' } = {}) {
    const layout =
        variant === 'footer'
            ? 'mt-6 pt-4 border-t border-slate-200/40 dark:border-border-dark/60 mb-0'
            : 'mb-4';
    return `
    <div class="trust-disclaimer-strip w-full rounded-xl border border-white/10 bg-black/30 backdrop-blur-md px-3 py-2.5 sm:px-4 text-[11px] sm:text-xs text-slate-400 leading-snug ${layout}" role="note">
        <span class="font-semibold text-slate-300">Independent prep</span>
        — Not affiliated with SCFHS or any government body. Educational use only; not medical advice.
        <a href="/legal.html#terms" class="text-primary font-semibold hover:underline ms-1">Terms</a>
    </div>`;
}
