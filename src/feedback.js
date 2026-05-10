export function showFeedbackModal() {
    if (localStorage.getItem('hasSeenFeedback')) {
        return;
    }

    const modalHTML = `
        <div id="feedback-modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
            <div class="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-border-dark">
                <h2 class="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100">You crushed it! 🎉</h2>
                <p class="mb-6 text-slate-600 dark:text-slate-300">Your feedback is incredibly valuable. Help us make this the best SMLE prep tool ever.</p>
                <div class="flex flex-col gap-4">
                    <a href="https://tally.so/r/7RZrGZ" target="_blank" id="give-feedback-btn" class="w-full px-6 py-3 rounded-lg bg-primary text-white font-bold shadow-glow-primary hover:brightness-110 transition-transform duration-300 transform hover:scale-105">Give Feedback (1 min)</a>
                    <button id="maybe-later-btn" class="w-full px-6 py-2 rounded-lg bg-slate-200 dark:bg-surface-dark/50 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-opacity-80 transition-all">Maybe Later</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const closeModal = () => {
        localStorage.setItem('hasSeenFeedback', 'true');
        const modalOverlay = document.getElementById('feedback-modal-overlay');
        if (modalOverlay) {
            modalOverlay.remove();
        }
    };

    document.getElementById('give-feedback-btn').addEventListener('click', closeModal);
    document.getElementById('maybe-later-btn').addEventListener('click', closeModal);
}