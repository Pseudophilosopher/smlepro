// AbortController ensures only one click listener exists on the toggle button,
// even when initializeThemeSwitch() is called repeatedly as the SPA re-renders pages.
let _themeController = null;

export function initializeThemeSwitch() {
    // Apply saved preference first (before attaching listener)
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
        document.documentElement.classList.add('dark');
    } else if (saved === 'light') {
        document.documentElement.classList.remove('dark');
    }

    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;

    // Abort the previous listener before adding a new one
    _themeController?.abort();
    _themeController = new AbortController();

    btn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    }, { signal: _themeController.signal });
}
