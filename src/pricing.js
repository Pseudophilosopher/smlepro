import { navigateTo, state, auth } from './app.js';
import { signOut } from 'firebase/auth';
import { initializeThemeSwitch } from './theme.js';

export function renderPricingPage(rootElement) {
    rootElement.innerHTML = `
    <div class="min-h-screen bg-background-light dark:bg-background-dark py-12 px-4 sm:px-6 lg:px-8">
        <header class="flex items-center justify-between py-6 max-w-[1400px] mx-auto border-b border-slate-200 dark:border-border-dark/50 mb-12">
            <div class="flex items-center gap-3 cursor-pointer" id="back-to-dashboard-btn">
                <div class="bg-primary p-2 rounded-lg text-background-dark shadow-glow-primary flex items-center justify-center">
                    <span class="material-symbols-outlined font-bold">arrow_back</span>
                </div>
                <h2 class="text-2xl font-bold tracking-tight">SMLE <span class="text-primary">Pro</span></h2>
            </div>
            <div class="flex items-center gap-2">
                ${state.user ? `
                <div class="hidden sm:flex flex-col items-end text-right min-w-0 max-w-[200px] mr-1">
                    <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate w-full" title="${String(state.user.name || '').replace(/"/g, '&quot;')}">${state.user.name || 'Account'}</span>
                    <span class="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full" title="${String(state.user.email || '').replace(/"/g, '&quot;')}">${state.user.email || ''}</span>
                </div>
                <button type="button" id="pricing-logout-btn" class="text-xs font-bold px-3 py-2 rounded-xl bg-slate-200 dark:bg-surface-dark border border-slate-300 dark:border-border-dark text-slate-800 dark:text-slate-100 hover:border-primary transition-colors shrink-0">Log out</button>
                ` : ''}
                <button id="theme-toggle-btn" class="flex items-center justify-center p-2.5 rounded-xl bg-slate-200 dark:bg-surface-dark border border-slate-300 dark:border-border-dark hover:border-primary transition-all duration-300">
                    <span class="material-symbols-outlined text-slate-700 dark:hidden">light_mode</span>
                    <span class="material-symbols-outlined text-slate-300 hidden dark:inline">dark_mode</span>
                </button>
            </div>
        </header>

        <div class="max-w-[1400px] mx-auto pb-24">
            <div class="text-center mb-16">
                <h2 class="text-base text-primary font-bold tracking-widest uppercase">Pricing Options</h2>
                <p class="mt-3 text-4xl font-extrabold text-slate-900 dark:text-white sm:text-5xl lg:text-5xl tracking-tight">Invest in Your Medical Career</p>
                <p class="max-w-2xl mt-5 mx-auto text-lg text-slate-500 dark:text-slate-400">Unlock custom topics, unlimited mock exams, and full access to everything you need to pass the SMLE confidently.</p>
            </div>

            <!-- Basic Plan compact banner -->
            <div class="mb-16 max-w-4xl mx-auto bg-slate-100 dark:bg-surface-dark/40 border border-slate-200 dark:border-border-dark rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between shadow-sm">
                <div class="flex items-center gap-4">
                    <div class="size-12 rounded-full bg-slate-200 dark:bg-border-dark flex items-center justify-center hidden sm:flex">
                        <span class="material-symbols-outlined text-slate-500">face</span>
                    </div>
                    <div>
                        <div class="flex items-center gap-3">
                            <h3 class="text-xl font-bold text-slate-900 dark:text-white">Basic</h3>
                            <span class="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-border-dark text-xs font-bold text-slate-500">Free</span>
                        </div>
                        <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">Includes Daily Dose (30 Qs), Quick 10 Practice, and Basic Stats.</p>
                    </div>
                </div>
                <button disabled class="mt-4 sm:mt-0 w-full sm:w-auto bg-slate-200 dark:bg-background-dark text-slate-400 dark:text-slate-500 font-bold py-3 px-8 rounded-xl border border-slate-300 dark:border-border-dark cursor-not-allowed">
                    Current Plan
                </button>
            </div>

            <!-- Pro Tier Grid - Single Row -->
            <div class="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 max-w-6xl mx-auto items-stretch">

                <!-- 1 Month -->
                <div class="relative p-8 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-sm hover:border-primary/50 transition-colors flex flex-col justify-between">
                    <div>
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider text-center">1 Month</h3>
                        <div class="mt-4 text-center">
                            <span class="text-5xl font-black text-slate-900 dark:text-white tracking-tight">149</span>
                            <span class="text-lg font-semibold text-slate-500">SAR</span>
                        </div>
                        <p class="text-center text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">Billed monthly</p>
                        
                        <div class="w-full h-px bg-slate-200 dark:bg-border-dark my-6"></div>
                        
                        <p class="text-sm text-slate-600 dark:text-slate-300 font-medium mb-4 text-center">Standard Pro Access</p>
                    </div>
                    <button class="upgrade-now-btn w-full mt-6 bg-slate-100 dark:bg-background-dark text-slate-900 dark:text-white border border-slate-300 dark:border-border-dark font-bold hover:bg-slate-200 dark:hover:bg-border-dark hover:border-primary transition-all py-3 px-6 rounded-xl">
                        Upgrade Now
                    </button>
                </div>

                <!-- 3 Months -->
                <div class="relative p-8 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-sm hover:border-primary/50 transition-colors flex flex-col justify-between">
                    <div>
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider text-center">3 Months</h3>
                        <div class="mt-4 text-center">
                            <span class="text-5xl font-black text-slate-900 dark:text-white tracking-tight">349</span>
                            <span class="text-lg font-semibold text-slate-500">SAR</span>
                        </div>
                        <div class="flex flex-col items-center justify-center mt-2 gap-1">
                            <span class="text-primary font-bold bg-primary/10 px-2 rounded-md text-sm">~116 SAR / mo</span>
                            <p class="text-center text-xs text-slate-500 dark:text-slate-400 font-medium">Billed quarterly</p>
                        </div>
                        
                        <div class="w-full h-px bg-slate-200 dark:bg-border-dark my-6"></div>
                        
                        <p class="text-sm text-slate-600 dark:text-slate-300 font-medium mb-4 text-center">Medium Term Prep</p>
                    </div>
                    <button class="upgrade-now-btn w-full mt-6 bg-slate-100 dark:bg-background-dark text-slate-900 dark:text-white border border-slate-300 dark:border-border-dark font-bold hover:bg-slate-200 dark:hover:bg-border-dark hover:border-primary transition-all py-3 px-6 rounded-xl">
                        Upgrade Now
                    </button>
                </div>

                <!-- 6 Months -->
                <div class="relative p-8 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-sm hover:border-primary/50 transition-colors flex flex-col justify-between">
                    <div>
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider text-center">6 Months</h3>
                        <div class="mt-4 text-center">
                            <span class="text-6xl font-black text-slate-900 dark:text-white tracking-tight">549</span>
                            <span class="text-lg font-semibold text-slate-500">SAR</span>
                        </div>
                        <div class="flex flex-col items-center mt-3 gap-1">
                            <span class="text-primary font-black bg-primary/20 px-3 py-1 rounded-md text-sm shadow-sm ring-1 ring-primary/30">~91 SAR / mo</span>
                            <p class="text-center text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Billed semi-annually</p>
                        </div>
                        
                        <div class="w-full h-px bg-slate-200 dark:bg-border-dark my-6"></div>
                        
                        <p class="text-sm text-slate-600 dark:text-slate-300 font-medium mb-4 text-center">Ideal Study Timeline</p>
                    </div>
                    <button class="upgrade-now-btn w-full mt-6 bg-slate-100 dark:bg-background-dark text-slate-900 dark:text-white border border-slate-300 dark:border-border-dark font-bold hover:bg-slate-200 dark:hover:bg-border-dark hover:border-primary transition-all py-3 px-6 rounded-xl">
                        Upgrade Now
                    </button>
                </div>

                <!-- 12 Months -->
                <div class="relative p-8 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-sm hover:border-primary/50 transition-colors flex flex-col justify-between">
                    <div class="absolute top-4 right-4">
                        <span class="material-symbols-outlined text-yellow-500 text-3xl" title="Best Value">workspace_premium</span>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider text-center">12 Months</h3>
                        <div class="mt-4 text-center">
                            <span class="text-5xl font-black text-slate-900 dark:text-white tracking-tight">799</span>
                            <span class="text-lg font-semibold text-slate-500">SAR</span>
                        </div>
                        <div class="flex flex-col items-center mt-2 gap-1">
                            <span class="text-yellow-600 dark:text-yellow-500 font-bold bg-yellow-400/10 border border-yellow-400/30 px-2 rounded-md text-sm">~66 SAR / mo</span>
                            <p class="text-center text-xs text-slate-500 dark:text-slate-400 font-medium">Billed annually</p>
                        </div>
                        
                        <div class="w-full h-px bg-slate-200 dark:bg-border-dark my-6"></div>
                        
                        <p class="text-sm text-yellow-600 dark:text-yellow-500 font-bold mb-4 text-center uppercase tracking-wide">Best Value</p>
                    </div>
                    <button class="upgrade-now-btn w-full mt-6 bg-slate-100 dark:bg-background-dark text-slate-900 dark:text-white border border-slate-300 dark:border-border-dark font-bold hover:bg-slate-200 dark:hover:bg-border-dark hover:border-primary transition-all py-3 px-6 rounded-xl">
                        Upgrade Now
                    </button>
                </div>

            </div>

            <p class="mt-12 text-center text-sm font-medium text-slate-500 dark:text-slate-400">All Pro plans include Full Access, Custom Topics, Unlimited Mock Exams, and Priority Support. Safe & secure payment.</p>

            <!-- Payment Methods -->
            <div class="mt-8">
              <p class="text-center text-xs text-slate-500 dark:text-slate-400 mb-4">Supported Payment Methods via Moyasar</p>
              <div class="flex items-center justify-center gap-3 flex-wrap">
                <!-- Mada -->
                <div class="bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 flex items-center justify-center" title="مدى (Mada)">
                  <span class="text-sm font-black" style="color:#6DC24B;font-family:sans-serif;">mada</span>
                </div>
                <!-- Visa -->
                <div class="bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 flex items-center justify-center" title="Visa">
                  <span class="text-sm font-black" style="color:#1A1F71;font-family:sans-serif;">VISA</span>
                </div>
                <!-- Apple Pay -->
                <div class="bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 flex items-center justify-center" title="Apple Pay">
                  <span class="text-sm font-bold" style="color:#000000;font-family:-apple-system,sans-serif;">Pay</span>
                </div>
                <!-- Samsung Pay -->
                <div class="bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 flex items-center justify-center" title="Samsung Pay">
                  <span class="text-xs font-bold" style="color:#1428A0;font-family:sans-serif;">SAMSUNG Pay</span>
                </div>
              </div>
            </div>

            <!-- 1 SAR Trial -->
            <div class="mt-12 max-w-lg mx-auto">
                <div class="p-5 bg-amber-900/10 dark:bg-amber-900/20 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 class="text-lg font-bold text-amber-600 dark:text-amber-400">Try Pro — 1 SAR for 1 Hour</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400">Full Pro access. Test with a real payment. No commitment.</p>
                    </div>
                    <button class="upgrade-trial-btn w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-8 rounded-xl transition-all whitespace-nowrap">
                        1 SAR — Start Trial
                    </button>
                </div>
            </div>

            <footer class="mt-8 pt-8 border-t border-slate-200 dark:border-border-dark text-center text-sm space-y-3">
                <p class="text-slate-500 dark:text-slate-400">By upgrading you acknowledge our policies.</p>
                <div class="flex flex-wrap justify-center gap-x-6 gap-y-2 font-semibold">
                    <a href="/legal.html#privacy" class="text-primary hover:underline">Privacy</a>
                    <a href="/legal.html#terms" class="text-primary hover:underline">Terms</a>
                    <a href="/legal.html#refunds" class="text-primary hover:underline">Refunds</a>
                </div>
            </footer>

        </div>
    </div>
    `;

    document.getElementById('back-to-dashboard-btn').addEventListener('click', () => {
        navigateTo(state.user ? 'dashboard' : 'landing');
    });

    document.getElementById('pricing-logout-btn')?.addEventListener('click', async () => {
        try {
            await signOut(auth);
            navigateTo('landing');
        } catch (e) {
            console.error('Sign out failed:', e);
            alert('Could not log out. Please try again.');
        }
    });

    document.querySelectorAll('.upgrade-now-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const card = btn.closest('div[class*="rounded-2xl"]');
            const priceText = card?.querySelector('span.text-5xl, span.text-6xl')?.textContent?.trim() || '549';
            const planTitle = card?.querySelector('h3')?.textContent?.trim() || '6 Months';

            // Save plan selection for redirect after login
            sessionStorage.setItem('selectedPlan', planTitle);
            sessionStorage.setItem('selectedAmount', priceText);
            sessionStorage.setItem('cameFromCheckout', 'true');

            // If user is not logged in, redirect to login first
            if (!state.user || state.user.isAnonymous) {
                navigateTo('login');
            } else {
                // Move from pricing screen to standalone checkout page.
                window.location.href = `/checkout.html?plan=${encodeURIComponent(planTitle)}&amount=${encodeURIComponent(priceText)}`;
            }
        });
    });

    document.querySelector('.upgrade-trial-btn').addEventListener('click', () => {
        if (!state.user || state.user.isAnonymous) {
            navigateTo('login');
        } else {
            window.location.href = '/checkout.html?plan=1+Hour+Trial&amount=1';
        }
    });

    initializeThemeSwitch();
}
