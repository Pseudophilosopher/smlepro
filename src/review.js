import { navigateTo, state } from './app.js';
import { initializeThemeSwitch } from './theme.js';
import { buildQuestionImageHtml } from './question-image-html.js';

export function renderReview(rootElement) {
    if (!state.quizSession?.questions?.length) {
        rootElement.innerHTML = `<div class="flex items-center justify-center min-h-screen"><p class="text-slate-400">No session to review. <button id="rv-back" class="text-primary underline">Go to dashboard</button></p></div>`;
        document.getElementById('rv-back')?.addEventListener('click', () => navigateTo('dashboard'));
        return;
    }
    const { questions, userAnswers, flaggedQuestions } = state.quizSession;
    
    let reviewHtml = `
    <div class="max-w-4xl mx-auto px-4 py-12">
        <div class="flex justify-between items-center mb-8">
            <div>
                <h1 class="text-3xl font-bold">Review Answers</h1>
                <p class="text-slate-500 dark:text-slate-400">Here are the results for the ${state.quizConfig.topic} quiz.</p>
            </div>
            <button id="back-to-dashboard" class="px-6 py-2 bg-primary text-background-dark font-bold rounded-lg shadow-glow-primary hover:brightness-110 transition-transform duration-300 transform hover:scale-105">Dashboard</button>
        </div>

        <div class="space-y-6">
    `;

    questions.forEach((q, index) => {
        const userAnswer = userAnswers[q.id];
        const isCorrect = userAnswer === q.correctAnswer;
        const isFlagged = flaggedQuestions.has(q.id);
        const questionNumber = index + 1;

        let borderClass = 'border-slate-200 dark:border-border-dark';
        if (userAnswer) {
            borderClass = isCorrect ? 'border-accent-green' : 'border-accent-red';
        }
        
        const imageHtml = buildQuestionImageHtml(q, questionNumber);

        reviewHtml += `
            <div class="bg-white dark:bg-surface-dark p-6 rounded-xl border ${borderClass}">
                <div class="flex justify-between items-start mb-4">
                    <p class="font-bold text-lg">${questionNumber}. ${q.question}</p>
                    ${isFlagged ? '<span class="material-symbols-outlined text-accent-red">flag</span>' : ''}
                </div>
                
                ${imageHtml}

                <div class="space-y-3">
                    ${q.options.map((opt, i) => {
                        const optionId = String.fromCharCode(65 + i);
                        let correctnessClass = '';
                        let indicator = '';
                        
                        if (optionId === q.correctAnswer) {
                            correctnessClass = 'bg-accent-green/10 text-accent-green font-bold';
                            indicator = '<span class="material-symbols-outlined ml-auto">check_circle</span>';
                        } else if (optionId === userAnswer && !isCorrect) {
                            correctnessClass = 'bg-accent-red/10 text-accent-red font-bold';
                            indicator = '<span class="material-symbols-outlined ml-auto">cancel</span>';
                        }

                        return `<div class="flex items-center p-3 rounded-lg ${correctnessClass}">${optionId}. ${opt.text}${indicator}</div>`;
                    }).join('')}
                </div>

                ${!isCorrect && userAnswer ? (() => {
                    const correctOpt = q.options.find(o => o.correct === true);
                    const rationale = correctOpt?.rationale || q.rationale || '';
                    return rationale ? `
                    <div class="mt-4 pt-4 border-t border-slate-200 dark:border-border-dark">
                        <h4 class="font-bold text-md mb-2">Explanation:</h4>
                        <p class="text-slate-600 dark:text-slate-300">${rationale}</p>
                    </div>` : '';
                })() : ''}
            </div>
        `;
    });

    reviewHtml += `</div></div>`;
    rootElement.innerHTML = reviewHtml;

    document.getElementById('back-to-dashboard').addEventListener('click', () => navigateTo('dashboard'));
    initializeThemeSwitch();
}
