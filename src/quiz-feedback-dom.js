/**
 * Instant MCQ feedback — same visuals as the live quiz (`quiz.js` formerly inlined this).
 * Keeps rationale HTML behavior identical to production (trusted admin-authored content).
 *
 * @param {HTMLElement} optionsContainer - `#options-container`
 * @param {{ options: Array<{ text: string, correct?: boolean, rationale?: string }>, rationale?: string }} question
 * @param {string} selectedOptionId - `'A' | 'B' | ...`
 */
export function applyInstantFeedbackToDom(optionsContainer, question, selectedOptionId) {
    const allOptions = Array.from(optionsContainer.querySelectorAll('.option-wrapper'));

    allOptions.forEach((opt) => {
        opt.classList.remove('cursor-pointer', 'hover:bg-primary/10', 'hover:border-primary');
        opt.classList.add('cursor-default', 'pointer-events-none');
    });

    const selectedIndex = String(selectedOptionId).trim().toUpperCase().charCodeAt(0) - 65;
    const correctIndex = question.options.findIndex((opt) => opt.correct === true);
    if (correctIndex === -1) {
        console.warn('[Quiz feedback] Question has no correct option flagged');
        return;
    }

    allOptions.forEach((opt, index) => {
        const p = opt.querySelector('p');
        const letterBox = opt.querySelector('.option-letter');
        const optionData = question.options[index];

        const oldRationale = opt.querySelector('.rationale-inject');
        if (oldRationale) oldRationale.remove();

        if (index === correctIndex) {
            opt.classList.remove('border-slate-200', 'dark:border-border-dark');
            opt.classList.add('bg-green-500', 'border-green-600');
            if (p) {
                p.classList.remove('text-slate-800', 'text-slate-900', 'dark:text-slate-200', 'dark:text-slate-100');
                p.classList.add('text-white');
            }
            if (letterBox) {
                letterBox.classList.add('bg-green-600', 'text-white', 'border-transparent');
                letterBox.classList.remove('bg-slate-200', 'text-slate-600', 'dark:bg-background-dark/80');
            }

            const rationaleText = optionData.rationale || question.rationale || 'No rationale provided.';
            const rationaleDiv = document.createElement('div');
            rationaleDiv.className =
                'rationale-inject rationale-reveal mt-4 p-3 bg-green-600 text-green-50 rounded-lg text-sm border border-green-400';
            rationaleDiv.innerHTML = rationaleText;
            opt.appendChild(rationaleDiv);
        } else if (index === selectedIndex) {
            opt.classList.remove('border-slate-200', 'dark:border-border-dark');
            opt.classList.add('bg-red-500', 'border-red-600');
            if (p) {
                p.classList.remove('text-slate-800', 'text-slate-900', 'dark:text-slate-200', 'dark:text-slate-100');
                p.classList.add('text-white');
            }
            if (letterBox) {
                letterBox.classList.add('bg-red-600', 'text-white', 'border-transparent');
                letterBox.classList.remove('bg-slate-200', 'text-slate-600', 'dark:bg-background-dark/80');
            }

            const rationaleText = optionData.rationale || question.rationale || 'No rationale provided.';
            const rationaleDiv = document.createElement('div');
            rationaleDiv.className =
                'rationale-inject rationale-reveal mt-4 p-3 bg-red-600 text-red-50 rounded-lg text-sm border border-red-400';
            rationaleDiv.innerHTML = rationaleText;
            opt.appendChild(rationaleDiv);
        } else {
            opt.classList.add('opacity-60');
            opt.classList.remove('border-slate-200', 'dark:border-border-dark');
            opt.classList.add('border-slate-100', 'dark:border-border-dark/40');
        }
    });

    // NOTE: Intentionally NOT auto-scrolling after feedback, as it interferes with
    // the user trying to scroll down to tap "Next". Users can scroll naturally.
}
