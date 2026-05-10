import { navigateTo, state, auth, startDailyDose } from './app.js';
import { GoogleAuthProvider, signInWithPopup, signInWithCredential, linkWithPopup } from 'firebase/auth';

export function renderLoginPage(rootElement) {
    // Detect whether this visitor is an anonymous guest upgrading their session
    const isUpgrade = auth.currentUser?.isAnonymous === true;
    
    // Check for redirect URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect');
    
    // If user is already authenticated and there's a redirect URL, redirect immediately
    if (auth.currentUser && !auth.currentUser.isAnonymous && redirectUrl) {
        window.location.href = decodeURIComponent(redirectUrl);
        return;
    }
    
    // Check if user came from checkout page (referrer or session storage)
    const cameFromCheckout = sessionStorage.getItem('cameFromCheckout') === 'true';

    rootElement.innerHTML = `
    <div class="min-h-screen bg-background-dark flex items-center justify-center p-4 relative overflow-hidden">

        <!-- Background texture -->
        <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div class="absolute inset-0" style="background-image:radial-gradient(circle,rgba(17,180,212,.15) 1px,transparent 1px);background-size:32px 32px;opacity:.35;"></div>
            <div class="absolute -top-40 -left-40 w-96 h-96 rounded-full" style="background:radial-gradient(circle,rgba(17,180,212,.1) 0%,transparent 65%);"></div>
            <div class="absolute -bottom-32 -right-32 w-80 h-80 rounded-full" style="background:radial-gradient(circle,rgba(139,92,246,.08) 0%,transparent 65%);"></div>
        </div>

        <div class="relative w-full max-w-sm z-10">

            <!-- Back button -->
            <button id="back-btn" class="flex items-center gap-1.5 text-slate-500 hover:text-primary transition-colors text-sm font-semibold mb-6 group">
                <span class="material-symbols-outlined text-base group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                Back
            </button>

            <!-- Logo -->
            <a href="/" class="flex items-center justify-center gap-3 mb-10 group w-fit mx-auto">
                <img src="/logo.svg" alt="SMLE Pro" class="w-12 h-12 drop-shadow-[0_0_12px_rgba(212,175,55,0.6)] group-hover:drop-shadow-[0_0_22px_rgba(212,175,55,0.9)] group-hover:scale-105 transition-all duration-300">
                <span class="text-2xl font-black tracking-tight text-white">SMLE <span style="color:#D4AF37">Pro</span></span>
            </a>

            <!-- Card -->
            <div class="bg-surface-dark border border-border-dark rounded-2xl p-8 shadow-depth">

                ${isUpgrade ? `
                <!-- Upgrade context banner -->
                <div class="flex items-center gap-3 p-3.5 rounded-xl bg-primary/10 border border-primary/25 mb-6">
                    <span class="material-symbols-outlined text-primary text-xl shrink-0">bookmark_added</span>
                    <p class="text-sm text-slate-300 leading-snug">
                        <strong class="text-white">Save your Daily Dose history.</strong>
                        Create a free account to track your performance over time and upgrade to full access later.
                    </p>
                </div>
                ` : ''}

                <h1 class="text-2xl font-black text-white tracking-tight text-center">
                    ${isUpgrade ? 'Create Your Account' : 'Welcome back'}
                </h1>
                <p class="text-slate-400 text-sm text-center mt-1.5 mb-8">
                    ${isUpgrade
                        ? 'Your Daily Dose progress will be preserved.'
                        : 'Sign in to access your dashboard and premium features.'}
                </p>

                <!-- Terms consent checkbox -->
                <label class="flex items-start gap-2 cursor-pointer mb-4">
                    <input type="checkbox" id="terms-consent" required class="mt-1 accent-primary">
                    <span class="text-xs text-slate-400 leading-relaxed">
                        أوافق على <a href="/legal.html" target="_blank" class="text-primary hover:underline">شروط الخدمة</a>
                        و <a href="/legal.html#privacy" target="_blank" class="text-primary hover:underline">سياسة الخصوصية</a>
                        / I agree to the <a href="/legal.html" target="_blank" class="text-primary hover:underline">Terms of Service</a>
                        and <a href="/legal.html#privacy" target="_blank" class="text-primary hover:underline">Privacy Policy</a>
                    </span>
                </label>

                <!-- Inline error -->
                <p id="consent-error" class="hidden mb-3 text-xs text-accent-red text-center font-semibold"></p>

                <!-- Google Sign-In button -->
                <button id="google-signin-btn" class="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-white text-slate-800 font-bold text-sm hover:bg-slate-100 active:scale-[.98] transition-all duration-200 shadow-sm">
                    <img src="/google_logo.svg" alt="Google" class="w-5 h-5 shrink-0">
                    <span id="google-btn-label">${isUpgrade ? 'Continue with Google' : 'Sign in with Google'}</span>
                </button>

                <!-- Inline error -->
                <p id="auth-error" class="hidden mt-4 text-xs text-accent-red text-center font-semibold"></p>

                <!-- Divider -->
                <div class="relative my-6 flex items-center">
                    <div class="flex-1 border-t border-border-dark"></div>
                    <span class="px-4 text-xs text-slate-500 font-semibold uppercase tracking-widest">or</span>
                    <div class="flex-1 border-t border-border-dark"></div>
                </div>

                <!-- Try Daily Dose (non-upgrade) OR Back (upgrade) -->
                ${isUpgrade ? `
                <button id="back-to-landing-btn" class="w-full py-3 rounded-xl bg-background-dark border border-border-dark text-slate-300 font-semibold text-sm hover:border-primary hover:text-primary transition-all">
                    ← Back to landing
                </button>
                ` : `
                <button id="daily-dose-login-btn" class="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-background-dark border border-primary/40 text-white font-semibold text-sm hover:border-primary hover:shadow-glow-primary transition-all">
                    <span class="material-symbols-outlined text-primary text-lg">bolt</span>
                    Try Daily Dose — free, no account needed
                </button>
                `}
            </div>

            <p class="text-center text-xs text-slate-600 mt-6">
                By continuing you agree to our
                <a href="/legal.html#terms" class="text-primary hover:underline">Terms</a> and
                <a href="/legal.html#privacy" class="text-primary hover:underline">Privacy Policy</a>.
            </p>
        </div>
    </div>
    `;

    // ── Back button ────────────────────────────────────────────────────────
    document.getElementById('back-btn')?.addEventListener('click', () => {
        // If upgrading from an anonymous session, go back to results; otherwise landing
        if (isUpgrade && state.quizSession?.isFinished) {
            navigateTo('results');
        } else if (state.user && !state.user.isAnonymous) {
            navigateTo('dashboard');
        } else {
            navigateTo('landing');
        }
    });

    // ── Helpers ────────────────────────────────────────────────────────────

    function setLoading(loading) {
        const btn   = document.getElementById('google-signin-btn');
        const label = document.getElementById('google-btn-label');
        if (!btn || !label) return;
        btn.disabled = loading;
        btn.classList.toggle('opacity-70', loading);
        btn.classList.toggle('cursor-not-allowed', loading);
        label.textContent = loading
            ? 'Connecting…'
            : (isUpgrade ? 'Continue with Google' : 'Sign in with Google');
    }

    function showError(msg) {
        const el = document.getElementById('auth-error');
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden');
        setLoading(false);
    }

    function showConsentError(msg) {
        const el = document.getElementById('consent-error');
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden');
        setLoading(false);
    }

    function hideConsentError() {
        const el = document.getElementById('consent-error');
        if (!el) return;
        el.classList.add('hidden');
    }

    // ── Google Sign-In / Account Upgrade ───────────────────────────────────

    document.getElementById('google-signin-btn').addEventListener('click', async () => {
        // Validate terms consent first
        const consentCheckbox = document.getElementById('terms-consent');
        if (!consentCheckbox?.checked) {
            showConsentError('يرجى الموافقة على شروط الخدمة وسياسة الخصوصية للمتابعة / Please agree to the Terms of Service and Privacy Policy to continue.');
            return;
        }
        hideConsentError();

        setLoading(true);
        const provider = new GoogleAuthProvider();
        const currentUser = auth.currentUser;

        try {
            if (currentUser?.isAnonymous) {
                await linkWithPopup(currentUser, provider);
            } else {
                await signInWithPopup(auth, provider);
            }
            // If there's a redirect URL, go there after successful login
            if (redirectUrl) {
                // Use setTimeout to ensure auth state is updated before redirect
                setTimeout(() => {
                    window.location.href = decodeURIComponent(redirectUrl);
                }, 500);
            } else if (cameFromCheckout) {
                // User came from checkout, redirect back with preserved plan selection
                const savedPlan = sessionStorage.getItem('selectedPlan');
                const savedAmount = sessionStorage.getItem('selectedAmount');
                setTimeout(() => {
                    if (savedPlan && savedAmount) {
                        window.location.href = `/checkout.html?plan=${encodeURIComponent(savedPlan)}&amount=${encodeURIComponent(savedAmount)}`;
                    } else {
                        // Fallback to default
                        window.location.href = '/checkout.html?plan=6+Months&amount=549';
                    }
                }, 500);
            } else {
                // onAuthStateChanged will navigate away; reset button in case of slow auth
                setLoading(false);
            }
        } catch (err) {
            console.error('[Login] Auth error:', err.code, err.message);

            if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
                // User dismissed — silent recovery
                setLoading(false);
                return;
            }

            if (err.code === 'auth/popup-blocked') {
                showError('Popup was blocked by your browser. Please allow popups for this site and try again.');
                return;
            }

            if (err.code === 'auth/unauthorized-domain') {
                showError('This domain is not authorised for sign-in. Please use the live site at smlepro.web.app.');
                return;
            }

            if (err.code === 'auth/credential-already-in-use') {
                // The Google account is already attached to a separate Firebase user.
                // Use the credential captured inside the error — no second popup needed,
                // which avoids browsers blocking a rapid second window.open call.
                try {
                    const credential = GoogleAuthProvider.credentialFromError(err);
                    if (credential) {
                        await signInWithCredential(auth, credential);
                    } else {
                        await signInWithPopup(auth, provider);
                    }
                    return;
                } catch (e2) {
                    console.error('[Login] Fallback sign-in error:', e2.code, e2.message);
                    showError(`Sign-in failed (${e2.code ?? 'unknown'}). Please try again.`);
                    return;
                }
            }

            if (err.code === 'auth/account-exists-with-different-credential') {
                showError('An account already exists with this email. Please use the original sign-in method.');
                return;
            }

            if (err.code === 'auth/operation-not-allowed') {
                showError('Google sign-in is not enabled yet. Please contact support.');
                return;
            }

            // Catch-all — show the actual Firebase code to aid debugging
            showError(`Sign-in failed (${err.code ?? 'unknown'}). Please try again.`);
        }
    });

    // ── Secondary button handlers ──────────────────────────────────────────

    document.getElementById('back-to-landing-btn')?.addEventListener('click', () => {
        navigateTo('landing');
    });

    document.getElementById('daily-dose-login-btn')?.addEventListener('click', () => {
        startDailyDose();
    });
}
