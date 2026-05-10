import { navigateTo, checkDailyDoneToday, startDailyDose } from './app.js';
import { startDiagnostic } from './diagnostic.js';
import { CONTENT_LAST_REVIEWED_DISPLAY, CONTENT_LAST_REVIEWED_ISO } from './content-meta.js';

export function renderLandingPage(rootElement) {
    rootElement.innerHTML = `
    <div class="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200">
        <header class="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md shadow-sm border-b border-slate-200/50 dark:border-slate-800/50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-20">
                    <a href="/" class="flex items-center gap-3 group">
                        <img src="/logo.svg" alt="SMLE Pro" class="w-10 h-10 drop-shadow-[0_0_10px_rgba(212,175,55,0.55)] group-hover:drop-shadow-[0_0_16px_rgba(212,175,55,0.85)] transition-all duration-300">
                        <span class="text-xl font-bold tracking-tight">SMLE <span style="color:#D4AF37">Pro</span></span>
                    </a>
                    <div class="flex items-center gap-4">
                        <button id="login-btn-header" class="px-5 py-2 border border-slate-600 text-slate-300 font-semibold text-sm rounded-lg hover:border-primary hover:text-primary transition-all duration-200">
                            Sign in
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Sticky compliance / launch banner (below nav) -->
        <div id="landing-top-banner" class="fixed top-20 left-0 right-0 z-40 border-b border-white/15 bg-slate-950/80 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
            <div class="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <div class="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span class="material-symbols-outlined text-[#D4AF37] text-xl shrink-0 mt-0.5 sm:mt-0" aria-hidden="true">verified_user</span>
                    <p class="text-[11px] sm:text-sm text-slate-200 leading-snug">
                        <span class="font-bold text-white">Independent prep platform</span>
                        <span class="text-slate-400"> — </span>
                        SMLE Pro is not affiliated with SCFHS or any government body. Educational use only; not medical advice.
                        <a href="/legal.html#terms" class="text-primary font-semibold hover:underline ms-1">Terms</a>
                    </p>
                </div>
                <div class="flex items-center justify-end gap-2 shrink-0">
                    <a href="/legal.html#privacy" class="hidden sm:inline text-xs font-semibold text-slate-500 hover:text-primary transition-colors">Privacy</a>
                    <button type="button" id="landing-banner-dismiss" class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 transition-colors" aria-label="Dismiss banner">
                        <span class="material-symbols-outlined text-base">close</span>
                        <span class="hidden sm:inline">Dismiss</span>
                    </button>
                </div>
            </div>
        </div>

        <main>
            <!-- ── Saudi Blessing Section — first thing visitors see (extra pt when banner visible) ── -->
            <section id="saudi-blessing" class="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-32" style="background:linear-gradient(180deg,#02060c 0%,#040b13 55%,#050d18 100%);">

                <!-- Stars (JS-populated) -->
                <div id="blessing-stars-bg" class="absolute inset-0 pointer-events-none overflow-hidden"></div>

                <!-- Ambient green glow halo -->
                <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div style="width:620px;height:400px;border-radius:9999px;background:radial-gradient(ellipse,rgba(0,108,53,0.3) 0%,transparent 68%);filter:blur(50px);opacity:0.5;"></div>
                </div>

                <div class="relative z-10 w-full max-w-3xl mx-auto px-4 sm:px-6 flex flex-col items-center gap-12 py-10">

                    <!-- Flag + Pole -->
                    <div class="flex items-start">
                        <!-- Pole -->
                        <div class="flex-shrink-0 rounded-full" style="width:7px;height:310px;background:linear-gradient(180deg,#e2e8f0 0%,#475569 100%);box-shadow:1px 0 8px rgba(0,0,0,0.55);"></div>
                        <!-- Mounting ring -->
                        <div class="flex-shrink-0 rounded-full" style="width:14px;height:14px;margin-left:-3.5px;margin-top:19px;background:radial-gradient(circle at 35% 32%,#e2e8f0,#94a3b8);box-shadow:0 0 5px rgba(0,0,0,0.55);"></div>
                        <!-- Flag panel — starts collapsed, expanded on load -->
                        <div id="blessing-flag-panel" style="margin-top:23px;margin-left:-2px;transform-origin:left center;transform:scaleX(0.04);opacity:0;">
                            <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg"
                                 style="width:100%;max-width:430px;display:block;border-radius:3px;box-shadow:6px 12px 55px rgba(0,0,0,0.8),0 0 90px rgba(0,108,53,0.22);">
                                <defs>
                                    <filter id="saudi-wave" x="-6%" y="-12%" width="116%" height="124%">
                                        <feTurbulence type="turbulence" baseFrequency="0.013 0.027" numOctaves="3" seed="4" result="noise">
                                            <animate attributeName="baseFrequency"
                                                     values="0.013 0.027;0.025 0.053;0.013 0.027"
                                                     dur="4.2s" repeatCount="indefinite"/>
                                        </feTurbulence>
                                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G"/>
                                    </filter>
                                    <linearGradient id="flag-sheen-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%"   style="stop-color:rgba(255,255,255,0.07)"/>
                                        <stop offset="48%"  style="stop-color:rgba(255,255,255,0.01)"/>
                                        <stop offset="100%" style="stop-color:rgba(0,0,0,0.07)"/>
                                    </linearGradient>
                                </defs>
                                <g filter="url(#saudi-wave)">
                                    <rect width="600" height="400" fill="#006C35"/>
                                    <text x="300" y="151" text-anchor="middle" fill="white"
                                          font-family="Amiri, serif" font-size="63">لا إله إلا الله</text>
                                    <text x="300" y="227" text-anchor="middle" fill="white"
                                          font-family="Amiri, serif" font-size="63">محمد رسول الله</text>
                                    <path d="M110,302 C165,294 305,287 420,289 L420,313 C305,315 165,311 110,302 Z" fill="white"/>
                                    <rect x="420" y="276" width="11" height="52" fill="white" rx="2"/>
                                    <rect x="431" y="283" width="33" height="38" fill="white" rx="3"/>
                                    <line x1="441" y1="283" x2="441" y2="321" stroke="#006C35" stroke-width="1.5" stroke-opacity="0.28"/>
                                    <line x1="450" y1="283" x2="450" y2="321" stroke="#006C35" stroke-width="1.5" stroke-opacity="0.28"/>
                                    <line x1="459" y1="283" x2="459" y2="321" stroke="#006C35" stroke-width="1.5" stroke-opacity="0.28"/>
                                    <ellipse cx="473" cy="302" rx="11" ry="21" fill="white"/>
                                    <rect width="600" height="400" fill="url(#flag-sheen-grad)"/>
                                </g>
                            </svg>
                        </div>
                    </div>

                    <!-- Decorative divider with 8-point Islamic star -->
                    <div class="flex items-center w-full max-w-md gap-4">
                        <div class="flex-1 h-px" style="background:linear-gradient(90deg,transparent,rgba(212,175,55,0.5));"></div>
                        <svg viewBox="0 0 48 48" width="26" height="26" fill="rgba(212,175,55,0.7)" class="flex-shrink-0">
                            <path d="M24 3l3 9.5 9.5-3-5.5 8 9.5 3-9.5 3 5.5 8-9.5-3L24 45l-3-9.5-9.5 3 5.5-8-9.5-3 9.5-3-5.5-8 9.5 3z"/>
                        </svg>
                        <div class="flex-1 h-px" style="background:linear-gradient(270deg,transparent,rgba(212,175,55,0.5));"></div>
                    </div>

                    <!-- Arabic Dua text -->
                    <div class="text-center w-full" dir="rtl">
                        <p id="dua-blessing-text"
                           class="text-xl md:text-2xl lg:text-[1.9rem] leading-loose tracking-wide"
                           style="font-family:'Amiri',serif;color:#f5d973;text-shadow:0 0 20px rgba(212,175,55,0.35),0 1px 4px rgba(0,0,0,0.85);"></p>
                        <p class="mt-4 text-slate-500 text-xs md:text-sm font-light"
                           style="direction:ltr;font-family:'Space Grotesk',sans-serif;letter-spacing:0.025em;">
                            "O Allah, make this land safe, secure, generous and prosperous — and all lands of the Muslims."
                        </p>
                    </div>

                </div>

                <!-- Scroll-down indicator -->
                <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 blessing-scroll-hint">
                    <span class="text-slate-500 text-xs tracking-widest uppercase font-semibold" style="font-family:'Space Grotesk',sans-serif;">Explore</span>
                    <svg class="blessing-chevron" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="rgba(212,175,55,0.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="4 7 10 13 16 7"/>
                    </svg>
                </div>

            </section>

            <section class="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-background-dark">

                <!-- ── Medical animated background ── -->
                <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden">

                    <!-- Radial gradient orbs -->
                    <div class="absolute -top-60 -left-40 w-[700px] h-[700px] rounded-full" style="background:radial-gradient(circle,rgba(17,180,212,.12) 0%,transparent 65%);"></div>
                    <div class="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full" style="background:radial-gradient(circle,rgba(139,92,246,.08) 0%,transparent 65%);"></div>
                    <div class="absolute top-1/3 right-1/4 w-[280px] h-[280px] rounded-full" style="background:radial-gradient(circle,rgba(16,185,129,.05) 0%,transparent 65%);"></div>

                    <!-- Dot grid -->
                    <div class="absolute inset-0" style="background-image:radial-gradient(circle,rgba(17,180,212,.2) 1px,transparent 1px);background-size:32px 32px;opacity:.45;"></div>

                    <!-- Expanding pulse rings (centered) -->
                    <div class="absolute top-1/2 left-1/2">
                        <div class="ecg-ring absolute -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-primary/30" style="animation-delay:0s;"></div>
                        <div class="ecg-ring absolute -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-primary/30" style="animation-delay:1.8s;"></div>
                        <div class="ecg-ring absolute -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-primary/30" style="animation-delay:3.6s;"></div>
                    </div>

                    <!-- Floating medical cross symbols -->
                    <span class="med-float absolute top-[13%] left-[7%] text-primary/[.14] text-5xl font-black select-none leading-none" style="animation-delay:0s;">✚</span>
                    <span class="med-float absolute top-[72%] left-[5%] text-primary/[.08] text-3xl font-black select-none leading-none" style="animation-delay:2.5s;">✚</span>
                    <span class="med-float absolute top-[20%] right-[9%] text-primary/[.11] text-4xl font-black select-none leading-none" style="animation-delay:1s;">✚</span>
                    <span class="med-float absolute top-[62%] right-[6%] text-primary/[.07] text-6xl font-black select-none leading-none" style="animation-delay:3.5s;">✚</span>
                    <span class="med-float absolute top-[48%] left-[13%] text-accent-purple/[.09] text-2xl font-black select-none leading-none" style="animation-delay:5s;">✚</span>
                    <span class="med-float absolute top-[32%] right-[21%] text-primary/[.05] text-8xl font-black select-none leading-none" style="animation-delay:7s;">✚</span>

                    <!-- ECG heartbeat line -->
                    <div class="absolute bottom-0 left-0 right-0 h-24 overflow-hidden">
                        <div class="absolute inset-0 ecg-scroll-container" style="width:200%;">
                            <svg style="width:100%;height:100%;" viewBox="0 0 2400 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                                <polyline
                                    points="0,40 200,40 210,34 220,40 340,40 344,43 350,5 358,75 364,40 395,40 415,22 440,40 1200,40 1400,40 1410,34 1420,40 1540,40 1544,43 1550,5 1558,75 1564,40 1595,40 1615,22 1640,40 2400,40"
                                    stroke="#11b4d4" stroke-width="2" fill="none" stroke-opacity="0.45"/>
                            </svg>
                        </div>
                        <!-- Side fade masks -->
                        <div class="absolute inset-y-0 left-0 w-28 z-10 pointer-events-none" style="background:linear-gradient(90deg,#101f22,transparent);"></div>
                        <div class="absolute inset-y-0 right-0 w-28 z-10 pointer-events-none" style="background:linear-gradient(270deg,#101f22,transparent);"></div>
                    </div>
                </div>

                <!-- ── Hero content ── -->
                    <div class="relative z-10 max-w-4xl mx-auto px-4 text-center mt-16 pb-28">
                        <!-- Exam Countdown Timer -->
                        <div class="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm font-bold mb-6">
                            <span class="material-symbols-outlined text-base">hourglass_top</span>
                            <span>Next SMLE Exam: <span id="hero-countdown-days" class="font-black">--</span> days</span>
                        </div>

                        <!-- Trust badge -->
                        <div class="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-primary/10 border border-primary/25 text-primary text-sm font-bold mb-8">
                            <span class="w-2 h-2 rounded-full bg-primary animate-pulse inline-block shrink-0"></span>
                            Saudi Medical Licensing Exam Preparation
                        </div>

                        <!-- 🔥 URGENCY BANNER: 30-Day Free Pro → ends May 31 — CONVERSION OPTIMIZED -->
                        <div id="pro-urgency-banner"
                             class="pro-urgency-banner mx-auto mb-8 max-w-2xl rounded-2xl px-5 py-4 sm:py-5 cursor-pointer transition-all duration-500 ease-out hover:scale-[1.02] active:scale-[0.98]"
                             role="status" aria-live="polite"
                             onclick="document.getElementById('hero-upgrade-btn')?.click()"
                             style="background:linear-gradient(135deg,#dc2626 0%,#ea580c 35%,#d97706 65%,#dc2626 100%);box-shadow:0 0 50px rgba(220,38,38,0.4),0 0 100px rgba(234,88,12,0.2),inset 0 1px 0 rgba(255,255,255,0.2);border:2px solid rgba(255,200,50,0.3);animation:proUrgencyPulse 2.5s ease-in-out infinite;">
                            <div class="flex items-center gap-3 sm:gap-4">
                                <div class="size-10 sm:size-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/30 shadow-lg backdrop-blur-sm"
                                     style="box-shadow:0 0 20px rgba(255,255,255,0.2);">
                                    <span class="material-symbols-outlined text-white text-xl sm:text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]">workspace_premium</span>
                                </div>
                                <div class="flex-1 min-w-0 text-left">
                                    <p class="text-sm sm:text-lg lg:text-xl font-black text-white leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                                       style="text-shadow:0 0 30px rgba(255,255,255,0.15);">
                                        🔥 <span class="inline-block animate-bounce" style="animation-duration:1.2s;">30 Days</span> Free <span class="text-yellow-200" style="text-shadow:0 0 20px rgba(255,255,0,0.5),0 0 40px rgba(255,200,0,0.3);">Pro</span> Access
                                    </p>
                                    <p class="text-[11px] sm:text-sm font-bold text-white/90 leading-tight mt-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
                                        ⏰ Sign up closes <span class="text-yellow-200 font-black text-base sm:text-lg underline decoration-yellow-200/40 underline-offset-4 decoration-2">May 31</span>
                                        <span class="text-white/40 mx-1">·</span>
                                        <span id="urgency-countdown" class="text-yellow-200 tabular-nums font-black text-base sm:text-lg drop-shadow-[0_0_10px_rgba(255,200,0,0.5)]" style="text-shadow:0 0 15px rgba(255,200,0,0.4);">--d --h --m</span>
                                    </p>
                                </div>
                                <div class="shrink-0 flex flex-col items-center gap-1.5">
                                    <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-widest animate-pulse"
                                          style="animation-duration:1.2s;background:linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.08));color:white;border:1px solid rgba(255,255,255,0.3);box-shadow:0 0 20px rgba(255,255,255,0.2);">
                                        <span class="w-2 h-2 rounded-full bg-white animate-ping" style="animation-duration:0.8s;"></span>
                                        LIMITED
                                    </span>
                                    <span class="text-[9px] font-bold text-white/60 uppercase tracking-widest hidden sm:block">Hurry!</span>
                                </div>
                            </div>
                        </div>

                    <h1 class="text-6xl md:text-8xl font-black tracking-tighter text-white">
                        Master the <span class="text-primary">SMLE</span>
                    </h1>
                    <p class="mt-8 text-xl md:text-2xl text-slate-300 font-medium max-w-2xl mx-auto">
                        Stop guessing. Start passing. Unlock the premium mock exams and custom topics you need to secure your medical career.
                    </p>
                    <p class="mt-4 text-base md:text-lg font-semibold text-primary">
                        Pro plans from <span class="text-white">149 SAR</span> — prices in Saudi Riyal, VAT if applicable as shown at checkout.
                    </p>
                    <!-- Two CTAs: Daily Dose + Weakness Diagnostic -->
                    <div class="mt-12 flex flex-col items-center gap-4">
                        <div id="daily-dose-section"></div>

                        <!-- Diagnostic CTA — find weak spots in 8 min, no sign-up -->
                        <div class="flex items-center gap-2">
                            <span class="h-px w-12 bg-gradient-to-l from-transparent to-primary/30"></span>
                            <span class="text-[10px] text-slate-600 font-bold uppercase tracking-widest">or</span>
                            <span class="h-px w-12 bg-gradient-to-r from-transparent to-primary/30"></span>
                        </div>
                        <button id="hero-diagnostic-cta"
                            class="group flex items-center gap-3 px-6 py-3.5 font-bold rounded-xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] active:scale-[.98]"
                            style="background:linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%);box-shadow:0 0 24px rgba(139,92,246,0.35),0 4px 16px rgba(0,0,0,0.35);">
                            <span class="material-symbols-outlined text-white text-2xl group-hover:scale-110 transition-transform">psychology</span>
                            <span class="flex flex-col items-start">
                                <span class="font-black text-sm leading-tight text-white">Find Your Weak Spots</span>
                                <span class="text-[10px] font-semibold text-purple-200/80">40-question diagnostic · 8 min · free</span>
                            </span>
                        </button>

                        <div class="flex items-center gap-5 flex-wrap justify-center">
                            <button id="hero-upgrade-btn" class="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/8 backdrop-blur-md border border-white/15 text-slate-300 font-semibold text-sm hover:border-primary hover:text-primary transition-all duration-300">
                                <span class="material-symbols-outlined text-base">workspace_premium</span>
                                View Plans
                            </button>
                            <button id="login-btn-hero" class="text-sm font-semibold text-slate-500 hover:text-primary transition-colors underline-offset-4 hover:underline">
                                Already a member? Sign in
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Static dashboard preview (sample data — matches signed-in app layout) -->
            <section class="relative z-20 py-20 md:py-24 bg-background-dark border-t border-border-dark" aria-labelledby="dashboard-preview-heading">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="text-center max-w-2xl mx-auto mb-10 md:mb-12">
                        <span class="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/20 text-primary bg-primary/10 mb-4">Preview</span>
                        <h2 id="dashboard-preview-heading" class="text-3xl md:text-4xl font-black tracking-tight text-white">Your dashboard at a glance</h2>
                        <p class="mt-3 text-slate-400 text-sm md:text-base leading-relaxed">
                            Illustrative sample — after you sign in, every metric reflects <em>your</em> sessions, Daily Dose, and weak-question pool.
                        </p>
                    </div>

                    <div class="rounded-2xl border border-white/15 bg-surface-dark/80 backdrop-blur-md shadow-depth overflow-hidden">
                        <div class="pointer-events-none select-none" aria-hidden="true">
                            <div class="flex min-h-0">
                                <!-- Slim sidebar (desktop) — mirrors app shell -->
                                <aside class="hidden md:flex flex-col w-52 shrink-0 border-e border-border-dark bg-surface-dark">
                                    <div class="px-4 py-4 border-b border-border-dark/60 flex items-center gap-2">
                                        <img src="/logo.svg" alt="" class="w-9 h-9 opacity-90" width="36" height="36">
                                        <span class="text-sm font-black text-white">SMLE <span style="color:#D4AF37">Pro</span></span>
                                    </div>
                                    <nav class="flex-1 px-2 py-3">
                                        <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs">
                                            <span class="material-symbols-outlined text-base">dashboard</span> Dashboard
                                        </div>
                                    </nav>
                                    <div class="px-2 py-3 border-t border-border-dark/60">
                                        <div class="flex items-center gap-2 px-2 py-2 rounded-xl bg-background-dark/80 border border-border-dark">
                                            <div class="size-8 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center shrink-0">
                                                <span class="material-symbols-outlined text-primary text-sm">person</span>
                                            </div>
                                            <div class="min-w-0">
                                                <p class="text-[11px] font-bold text-white truncate">Dr. Sara</p>
                                                <p class="text-[9px] text-slate-500 truncate">Free Tier</p>
                                            </div>
                                        </div>
                                    </div>
                                </aside>

                                <div class="flex-1 min-w-0 bg-background-dark p-4 md:p-6 space-y-4 md:space-y-5">
                                    <!-- Welcome + readiness -->
                                    <div class="relative overflow-hidden rounded-2xl border border-border-dark bg-surface-dark p-5 md:p-6"
                                         style="background:linear-gradient(135deg,rgba(17,180,212,0.07) 0%,rgba(17,180,212,0.02) 50%,transparent 100%);">
                                        <div class="absolute inset-0 pointer-events-none" style="background-image:radial-gradient(circle,rgba(17,180,212,0.12) 1px,transparent 1px);background-size:24px 24px;opacity:0.5;"></div>
                                        <div class="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                                            <div class="min-w-0">
                                                <p class="text-xs text-slate-500 font-semibold">Good morning · Thursday, 9 April 2026</p>
                                                <h3 class="text-2xl md:text-3xl font-black text-white mt-1">Ready, <span class="text-primary">Dr. Sara</span></h3>
                                                <div class="flex items-center gap-2 mt-2 text-sm">
                                                    <span class="material-symbols-outlined text-accent-orange text-base">event_available</span>
                                                    <span class="text-slate-400">SMLE in</span>
                                                    <span class="font-black text-accent-orange">47 days</span>
                                                </div>
                                            </div>
                                            <div class="flex flex-col items-center gap-1 shrink-0 mx-auto sm:mx-0">
                                                <div class="relative w-[88px] h-[88px]">
                                                    <svg viewBox="0 0 80 80" class="absolute inset-0 w-full h-full" style="transform:rotate(-90deg)" aria-hidden="true">
                                                        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6"/>
                                                        <circle cx="40" cy="40" r="34" fill="none" stroke="#f59e0b" stroke-width="6" stroke-linecap="round"
                                                            stroke-dasharray="213.6" stroke-dashoffset="59.8"/>
                                                    </svg>
                                                    <div class="absolute inset-0 flex items-center justify-center">
                                                        <span class="text-xl font-black text-accent-orange">72%</span>
                                                    </div>
                                                </div>
                                                <p class="text-[10px] font-black uppercase tracking-widest text-accent-orange">On Track</p>
                                                <p class="text-[10px] text-slate-600">SMLE Readiness</p>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Stats strip -->
                                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3">
                                        <div class="bg-surface-dark rounded-xl px-3 py-3 border border-border-dark flex items-center gap-2.5">
                                            <span class="material-symbols-outlined text-accent-green text-lg shrink-0">analytics</span>
                                            <div>
                                                <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-0.5">Avg Score</p>
                                                <p class="text-lg font-black text-white">76%</p>
                                            </div>
                                        </div>
                                        <div class="bg-surface-dark rounded-xl px-3 py-3 border border-border-dark flex items-center gap-2.5">
                                            <span class="material-symbols-outlined text-primary text-lg shrink-0">check_circle</span>
                                            <div>
                                                <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-0.5">Answered</p>
                                                <p class="text-lg font-black text-white">1,847</p>
                                            </div>
                                        </div>
                                        <div class="bg-surface-dark rounded-xl px-3 py-3 border border-border-dark flex items-center gap-2.5 col-span-2 md:col-span-1">
                                            <span class="material-symbols-outlined text-accent-orange text-lg shrink-0">local_fire_department</span>
                                            <div>
                                                <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-0.5">Streak</p>
                                                <p class="text-lg font-black text-white">12<span class="text-xs font-bold text-slate-500 ms-1">days</span></p>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Exam mode row -->
                                    <div class="flex items-center gap-3 bg-surface-dark border border-border-dark rounded-xl px-3 py-2.5 w-fit max-w-full flex-wrap">
                                        <span class="material-symbols-outlined text-slate-500 text-base">tune</span>
                                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exam Mode</span>
                                        <div class="w-9 h-5 bg-slate-700 rounded-full relative opacity-80">
                                            <div class="absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full"></div>
                                        </div>
                                        <span class="text-[10px] font-bold text-slate-300">Instant Feedback</span>
                                    </div>

                                    <!-- Daily + Practice -->
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                        <div class="relative overflow-hidden rounded-2xl border border-primary/40 p-4 flex flex-col"
                                             style="background:linear-gradient(135deg,rgba(17,180,212,0.08) 0%,rgba(10,20,30,0.6) 100%);">
                                            <div class="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none" style="background:radial-gradient(circle,rgba(17,180,212,0.12) 0%,transparent 70%);transform:translate(30%,-30%);"></div>
                                            <div class="relative flex flex-col h-full min-h-[140px]">
                                                <div class="flex items-start justify-between mb-2">
                                                    <div class="flex items-center gap-2">
                                                        <div class="size-8 rounded-xl bg-primary/20 flex items-center justify-center">
                                                            <span class="material-symbols-outlined text-primary text-base">bolt</span>
                                                        </div>
                                                        <div>
                                                            <p class="text-[10px] font-black text-white uppercase tracking-widest">Daily Dose</p>
                                                            <p class="text-[9px] text-slate-500">30 Questions</p>
                                                        </div>
                                                    </div>
                                                    <span class="text-[9px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 uppercase">Free</span>
                                                </div>
                                                <p class="text-xs text-slate-300 flex-1">A curated set of 30 SMLE-style questions, refreshed every midnight.</p>
                                                <div class="mt-3 w-full py-2.5 rounded-xl bg-primary/20 border border-primary/25 text-primary font-black text-xs text-center">Take Today&apos;s Dose →</div>
                                            </div>
                                        </div>

                                        <div class="rounded-2xl border border-accent-orange/20 bg-surface-dark p-4 flex flex-col">
                                            <div class="flex items-center justify-between mb-3">
                                                <div class="flex items-center gap-2">
                                                    <div class="size-8 rounded-lg bg-accent-orange/20 flex items-center justify-center">
                                                        <span class="material-symbols-outlined text-accent-orange text-base">school</span>
                                                    </div>
                                                    <div>
                                                        <p class="text-[10px] font-black text-white uppercase tracking-widest">Practice Sessions</p>
                                                        <p class="text-[9px] text-slate-500">Timed · Specialty or Mixed</p>
                                                    </div>
                                                </div>
                                                <span class="text-[9px] font-black px-2 py-0.5 rounded-full bg-accent-orange/10 text-accent-orange border border-accent-orange/30 flex items-center gap-0.5 uppercase">
                                                    <span class="material-symbols-outlined text-[10px]">lock</span> Pro
                                                </span>
                                            </div>
                                            <div class="grid grid-cols-3 gap-2 flex-1">
                                                <div class="flex flex-col items-center justify-center py-4 rounded-xl bg-background-dark border border-accent-orange/20 gap-0.5 relative overflow-hidden">
                                                    <span class="text-2xl font-black text-white">10</span>
                                                    <span class="text-[9px] text-slate-600 font-bold uppercase">Q</span>
                                                    <div class="absolute inset-0 flex items-center justify-center bg-background-dark/55">
                                                        <span class="material-symbols-outlined text-accent-orange text-base">lock</span>
                                                    </div>
                                                </div>
                                                <div class="flex flex-col items-center justify-center py-4 rounded-xl bg-background-dark border border-accent-orange/20 gap-0.5 relative overflow-hidden">
                                                    <span class="text-2xl font-black text-white">40</span>
                                                    <span class="text-[9px] text-slate-600 font-bold uppercase">Q</span>
                                                    <div class="absolute inset-0 flex items-center justify-center bg-background-dark/55">
                                                        <span class="material-symbols-outlined text-accent-orange text-base">lock</span>
                                                    </div>
                                                </div>
                                                <div class="flex flex-col items-center justify-center py-4 rounded-xl bg-background-dark border border-accent-orange/20 gap-0.5 relative overflow-hidden">
                                                    <span class="text-2xl font-black text-white">100</span>
                                                    <span class="text-[9px] text-slate-600 font-bold uppercase">Q</span>
                                                    <div class="absolute inset-0 flex items-center justify-center bg-background-dark/55">
                                                        <span class="material-symbols-outlined text-accent-orange text-base">lock</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="mt-2.5 w-full py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary font-black text-[10px] text-center">Unlock Practice Sessions →</div>
                                        </div>
                                    </div>

                                    <!-- Weak questions -->
                                    <div class="rounded-2xl border border-border-dark bg-surface-dark shadow-depth p-4">
                                        <div class="flex items-start justify-between gap-3 flex-wrap">
                                            <div class="flex items-center gap-2.5">
                                                <div class="size-9 rounded-xl bg-accent-red/20 flex items-center justify-center shrink-0">
                                                    <span class="material-symbols-outlined text-accent-red text-lg">psychology_alt</span>
                                                </div>
                                                <div>
                                                    <h3 class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                                                        Weak Questions
                                                        <span class="px-2 py-0.5 rounded-full bg-accent-red/20 text-accent-red border border-accent-red/30 text-[10px] font-black">12</span>
                                                    </h3>
                                                    <p class="text-[9px] text-slate-500 mt-0.5">Missed answers from practice roll into a retake pool.</p>
                                                </div>
                                            </div>
                                            <div class="px-4 py-2 rounded-xl font-black text-xs bg-accent-orange/15 text-accent-orange border border-accent-orange/25">Drill weak spots</div>
                                        </div>
                                        <div class="flex flex-wrap gap-1.5 mt-3">
                                            <span class="text-[9px] font-bold px-2 py-0.5 rounded-md bg-background-dark border border-border-dark text-slate-400">Surgery</span>
                                            <span class="text-[9px] font-bold px-2 py-0.5 rounded-md bg-background-dark border border-border-dark text-slate-400">Pediatrics</span>
                                            <span class="text-[9px] font-bold px-2 py-0.5 rounded-md bg-background-dark border border-border-dark text-slate-400">Medicine</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p class="text-center text-[11px] text-slate-500 mt-4">Not a live account — buttons here are for display only.</p>
                    <div class="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button type="button" id="dashboard-preview-signin" class="pointer-events-auto px-6 py-3 rounded-xl bg-primary text-background-dark font-black text-sm shadow-glow-primary hover:brightness-110 active:scale-[.98] transition-all">
                            Sign in for your real dashboard
                        </button>
                        <button type="button" id="dashboard-preview-daily" class="pointer-events-auto text-sm font-semibold text-slate-400 hover:text-primary transition-colors underline-offset-4 hover:underline">
                            Try Daily Dose free first
                        </button>
                    </div>
                </div>
            </section>

            <section id="features" class="relative z-20 py-24 bg-slate-50 dark:bg-background-dark overflow-hidden border-t border-slate-200/80 dark:border-border-dark">

                <!-- Subtle background decoration -->
                <div class="absolute inset-0 pointer-events-none">
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-[0.03]" style="background:radial-gradient(ellipse,#D4AF37 0%,transparent 70%);"></div>
                    <div class="absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full opacity-[0.02]" style="background:radial-gradient(ellipse,#11b4d4 0%,transparent 70%);"></div>
                </div>

                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

                    <div class="text-center mb-16">
                        <span class="inline-block text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full border mb-5" style="color:#D4AF37;border-color:rgba(212,175,55,0.35);background:rgba(212,175,55,0.07);">Everything you need to pass</span>
                        <h2 class="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">Built for the SMLE.<br class="hidden md:inline"> Nothing else.</h2>
                        <p class="mt-5 text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">Every feature was designed around one goal — helping you clear the Saudi Medical Licensing Exam.</p>
                    </div>

                    <!-- Bento Grid Layout -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 auto-rows-[minmax(180px,auto)]">

                        <!-- Daily Dose — Hero Feature (spans 2x2) -->
                        <div class="md:col-span-2 lg:col-span-2 md:row-span-2 group relative rounded-3xl border-2 p-8 overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
                             style="border-color:rgba(212,175,55,0.6);background:linear-gradient(145deg,rgba(212,175,55,0.08) 0%,rgba(212,175,55,0.02) 50%,transparent 100%);">
                            <!-- Animated background pattern -->
                            <div class="absolute inset-0 opacity-30" style="background-image:radial-gradient(circle at 2px 2px,rgba(212,175,55,0.15) 1px,transparent 0);background-size:24px 24px;"></div>
                            <!-- Top badge -->
                            <div class="relative z-10 flex items-center justify-between mb-6">
                                <span class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest" style="background:rgba(212,175,55,0.2);color:#FFE566;border:1px solid rgba(212,175,55,0.4);">
                                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Always Free
                                </span>
                                <span class="material-symbols-outlined text-3xl" style="color:#D4AF37">bolt</span>
                            </div>
                            <h3 class="relative z-10 text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-4">Daily Dose</h3>
                            <p class="relative z-10 text-base md:text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-6">30 fresh, high-yield MCQs delivered every single day. No account needed. Resets at midnight so there's always something new waiting for you.</p>
                            <!-- Stats row -->
                            <div class="relative z-10 flex items-center gap-6 pt-4 border-t border-[#D4AF37]/20">
                                <div>
                                    <p class="text-2xl font-black text-[#D4AF37]">30</p>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Questions/day</p>
                                </div>
                                <div>
                                    <p class="text-2xl font-black text-[#D4AF37]">24h</p>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Fresh cycle</p>
                                </div>
                            </div>
                        </div>

                        <!-- Wrong-Answer Review (Pro) -->
                        <div class="group relative rounded-2xl border p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                             style="border-color:rgba(16,185,129,0.3);background:linear-gradient(145deg,rgba(16,185,129,0.05) 0%,transparent 100%);">
                            <div class="absolute top-4 right-4">
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style="background:rgba(17,180,212,0.15);color:#11b4d4;border:1px solid rgba(17,180,212,0.3);">
                                    <span class="material-symbols-outlined text-[10px]">lock</span>
                                    Pro
                                </span>
                            </div>
                            <div class="size-14 rounded-xl flex items-center justify-center mb-4" style="background:rgba(16,185,129,0.12);">
                                <span class="material-symbols-outlined text-2xl" style="color:#10b981">replay</span>
                            </div>
                            <h3 class="text-lg font-black text-slate-900 dark:text-white mb-2">Wrong-Answer Review</h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Every missed question saved to a dedicated pool. Re-drill your weak spots until they become strengths.</p>
                        </div>

                        <!-- Streak & Heatmap (Free) -->
                        <div class="group relative rounded-2xl border p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                             style="border-color:rgba(16,185,129,0.3);background:linear-gradient(145deg,rgba(16,185,129,0.05) 0%,transparent 100%);">
                            <div class="absolute top-4 right-4">
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style="background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);">
                                    <span class="material-symbols-outlined text-[10px]">check_circle</span>
                                    Free
                                </span>
                            </div>
                            <div class="size-14 rounded-xl flex items-center justify-center mb-4" style="background:rgba(245,158,11,0.12);">
                                <span class="material-symbols-outlined text-2xl" style="color:#f59e0b">local_fire_department</span>
                            </div>
                            <h3 class="text-lg font-black text-slate-900 dark:text-white mb-2">Streak & Heatmap</h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Track consecutive study days and visualize your 30-day activity on a color-coded heatmap.</p>
                        </div>

                        <!-- Readiness Meter (Free) -->
                        <div class="group relative rounded-2xl border p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                             style="border-color:rgba(16,185,129,0.3);background:linear-gradient(145deg,rgba(16,185,129,0.05) 0%,transparent 100%);">
                            <div class="absolute top-4 right-4">
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style="background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);">
                                    <span class="material-symbols-outlined text-[10px]">check_circle</span>
                                    Free
                                </span>
                            </div>
                            <div class="size-14 rounded-xl flex items-center justify-center mb-4" style="background:rgba(16,185,129,0.12);">
                                <span class="material-symbols-outlined text-2xl" style="color:#10b981">vital_signs</span>
                            </div>
                            <h3 class="text-lg font-black text-slate-900 dark:text-white mb-2">Readiness Meter</h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Your rolling average benchmarked against the SMLE pass mark in real time.</p>
                        </div>

                        <!-- Exam Countdown (Free) -->
                        <div class="group relative rounded-2xl border p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                             style="border-color:rgba(16,185,129,0.3);background:linear-gradient(145deg,rgba(16,185,129,0.05) 0%,transparent 100%);">
                            <div class="absolute top-4 right-4">
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style="background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);">
                                    <span class="material-symbols-outlined text-[10px]">check_circle</span>
                                    Free
                                </span>
                            </div>
                            <div class="size-14 rounded-xl flex items-center justify-center mb-4" style="background:rgba(17,180,212,0.12);">
                                <span class="material-symbols-outlined text-2xl" style="color:#11b4d4">hourglass_top</span>
                            </div>
                            <h3 class="text-lg font-black text-slate-900 dark:text-white mb-2">Exam Countdown</h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Set your SMLE date and a live countdown keeps it front and center on your dashboard.</p>
                        </div>

                        <!-- Instant Rationales (Free) -->
                        <div class="group relative rounded-2xl border p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                             style="border-color:rgba(16,185,129,0.3);background:linear-gradient(145deg,rgba(16,185,129,0.05) 0%,transparent 100%);">
                            <div class="absolute top-4 right-4">
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style="background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);">
                                    <span class="material-symbols-outlined text-[10px]">check_circle</span>
                                    Free
                                </span>
                            </div>
                            <div class="size-14 rounded-xl flex items-center justify-center mb-4" style="background:rgba(139,92,246,0.12);">
                                <span class="material-symbols-outlined text-2xl" style="color:#8b5cf6">menu_book</span>
                            </div>
                            <h3 class="text-lg font-black text-slate-900 dark:text-white mb-2">Instant Rationales</h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Every question ships with detailed explanations. Know not just what, but <em>why</em>.</p>
                        </div>

                        <!-- Specialty Drills (Pro) -->
                        <div class="group relative rounded-2xl border p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                             style="border-color:rgba(17,180,212,0.3);background:linear-gradient(145deg,rgba(17,180,212,0.05) 0%,transparent 100%);">
                            <div class="absolute top-4 right-4">
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style="background:rgba(17,180,212,0.15);color:#11b4d4;border:1px solid rgba(17,180,212,0.3);">
                                    <span class="material-symbols-outlined text-[10px]">lock</span>
                                    Pro
                                </span>
                            </div>
                            <div class="size-14 rounded-xl flex items-center justify-center mb-4" style="background:rgba(17,180,212,0.12);">
                                <span class="material-symbols-outlined text-2xl" style="color:#11b4d4">category</span>
                            </div>
                            <h3 class="text-lg font-black text-slate-900 dark:text-white mb-2">Specialty Drills</h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Target Surgery, Internal Medicine, Pediatrics, OB/GYN — pick your weak specialty and drill it to mastery.</p>
                        </div>

                        <!-- Timed Mock Exams (Pro) -->
                        <div class="group relative rounded-2xl border p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                             style="border-color:rgba(17,180,212,0.3);background:linear-gradient(145deg,rgba(17,180,212,0.05) 0%,transparent 100%);">
                            <div class="absolute top-4 right-4">
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style="background:rgba(17,180,212,0.15);color:#11b4d4;border:1px solid rgba(17,180,212,0.3);">
                                    <span class="material-symbols-outlined text-[10px]">lock</span>
                                    Pro
                                </span>
                            </div>
                            <div class="size-14 rounded-xl flex items-center justify-center mb-4" style="background:rgba(17,180,212,0.12);">
                                <span class="material-symbols-outlined text-2xl" style="color:#11b4d4">timer</span>
                            </div>
                            <h3 class="text-lg font-black text-slate-900 dark:text-white mb-2">Timed Mock Exams</h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Full-length timed simulations that replicate real exam pressure. Exam day will feel like practice.</p>
                        </div>

                    </div>
                </div>
            </section>

            <section id="pricing-preview" class="relative z-20 py-20 bg-white dark:bg-surface-dark border-y border-slate-200 dark:border-border-dark">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="text-center mb-12">
                        <h2 class="text-base text-primary font-bold tracking-widest uppercase">Subscription Plans</h2>
                        <p class="mt-3 text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Unlock full Pro access</p>
                        <p class="mt-4 max-w-2xl mx-auto text-slate-500 dark:text-slate-400">Click any plan to get started. Prices in SAR, VAT shown at checkout.</p>
                        <p class="mt-4 max-w-xl mx-auto text-center text-xs text-slate-500 dark:text-slate-500 leading-relaxed">
                            Subscriptions are digital access to SMLE Pro content. By paying you agree to our
                            <a href="/legal.html#terms" class="text-primary font-semibold hover:underline">Terms</a>,
                            <a href="/legal.html#refunds" class="text-primary font-semibold hover:underline">Refund Policy</a>
                            (including rules for digital goods), and
                            <a href="/legal.html#privacy" class="text-primary font-semibold hover:underline">Privacy Policy</a>.
                        </p>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 max-w-6xl mx-auto">
                        <button id="plan-card-1m" class="pricing-plan-card group rounded-2xl border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-background-dark/50 p-6 text-center cursor-pointer hover:border-primary/50 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-200">
                            <p class="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-primary transition-colors">1 month</p>
                            <p class="mt-3 text-4xl font-black text-slate-900 dark:text-white">149 <span class="text-lg font-semibold text-slate-500">SAR</span></p>
                            <p class="mt-1 text-xs text-slate-500">Monthly</p>
                            <p class="mt-3 text-[11px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">Tap to subscribe →</p>
                        </button>
                        <button id="plan-card-3m" class="pricing-plan-card group rounded-2xl border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-background-dark/50 p-6 text-center cursor-pointer hover:border-primary/50 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-200">
                            <p class="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-primary transition-colors">3 months</p>
                            <p class="mt-3 text-4xl font-black text-slate-900 dark:text-white">349 <span class="text-lg font-semibold text-slate-500">SAR</span></p>
                            <p class="mt-1 text-xs text-primary font-semibold">~116 SAR / mo</p>
                            <p class="mt-3 text-[11px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">Tap to subscribe →</p>
                        </button>
                        <button id="plan-card-6m" class="pricing-plan-card group rounded-2xl border-2 border-primary bg-primary/5 dark:bg-primary/10 p-6 text-center cursor-pointer shadow-glow-primary hover:-translate-y-1.5 hover:shadow-2xl transition-all duration-200 relative">
                            <span class="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest bg-primary text-background-dark px-3 py-1 rounded-full">Most popular</span>
                            <p class="text-xs font-bold uppercase tracking-wider text-primary mt-2">6 months</p>
                            <p class="mt-3 text-4xl font-black text-slate-900 dark:text-white">549 <span class="text-lg font-semibold text-slate-500">SAR</span></p>
                            <p class="mt-1 text-xs text-primary font-semibold">~91 SAR / mo</p>
                            <p class="mt-3 text-[11px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">Tap to subscribe →</p>
                        </button>
                        <button id="plan-card-12m" class="pricing-plan-card group rounded-2xl border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-background-dark/50 p-6 text-center cursor-pointer hover:border-yellow-500/50 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-200">
                            <p class="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">12 months</p>
                            <p class="mt-3 text-4xl font-black text-slate-900 dark:text-white">799 <span class="text-lg font-semibold text-slate-500">SAR</span></p>
                            <p class="mt-1 text-xs text-yellow-600 dark:text-yellow-500 font-semibold">~66 SAR / mo</p>
                            <p class="mt-3 text-[11px] font-bold text-yellow-600 dark:text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity">Tap to subscribe →</p>
                        </button>
                    </div>
                    <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button type="button" id="landing-pricing-cta" class="px-8 py-4 bg-primary text-background-dark font-black rounded-xl shadow-glow-primary hover:-translate-y-0.5 transition-transform">
                            View all plans & upgrade
                        </button>
                        <span class="text-sm text-slate-500 dark:text-slate-400">Free tier included — Daily Dose every day, no card required</span>
                    </div>
                </div>
            </section>

            <footer class="relative z-20 bg-slate-100 dark:bg-surface-dark border-t border-slate-200 dark:border-border-dark">

                <!-- Top footer band -->
                <div class="max-w-5xl mx-auto px-4 py-12 flex flex-col items-center gap-8">

                    <!-- Logo + tagline -->
                    <div class="flex flex-col items-center gap-3">
                        <div class="flex items-center gap-3">
                            <img src="/logo.svg" alt="SMLE Pro" class="w-10 h-10 drop-shadow-[0_0_10px_rgba(212,175,55,0.45)]">
                            <span class="text-xl font-black tracking-tight text-slate-800 dark:text-white">SMLE <span style="color:#D4AF37">Pro</span></span>
                        </div>
                        <p class="text-slate-500 dark:text-slate-400 text-sm text-center max-w-xs leading-relaxed">
                            Your daily companion for acing the Saudi Medical Licensing Exam.
                        </p>
                        <p class="text-slate-500 dark:text-slate-500 text-xs text-center">
                            Official website: <a href="https://smlepro.web.app/" class="font-semibold text-primary hover:underline">smlepro.web.app</a>
                        </p>
                    </div>

                    <!-- Social icons -->
                    <div class="flex items-center gap-4">

                        <!-- X / Twitter -->
                        <a href="https://x.com/SMLE_Pro" target="_blank" rel="noopener noreferrer"
                           aria-label="Follow us on X"
                           class="group flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-200 shadow-sm">
                            <svg class="w-4 h-4 fill-slate-500 dark:fill-slate-400 group-hover:fill-[#D4AF37] transition-colors" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </a>

                        <!-- Instagram -->
                        <a href="https://www.instagram.com/smle_pro/" target="_blank" rel="noopener noreferrer"
                           aria-label="Follow us on Instagram"
                           class="group flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-200 shadow-sm">
                            <svg class="w-4 h-4 fill-slate-500 dark:fill-slate-400 group-hover:fill-[#D4AF37] transition-colors" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                        </a>

                        <!-- TikTok -->
                        <a href="https://www.tiktok.com/@smle_pro" target="_blank" rel="noopener noreferrer"
                           aria-label="Follow us on TikTok"
                           class="group flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-200 shadow-sm">
                            <svg class="w-4 h-4 fill-slate-500 dark:fill-slate-400 group-hover:fill-[#D4AF37] transition-colors" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                            </svg>
                        </a>

                        <!-- YouTube -->
                        <a href="https://www.youtube.com/@SMLE_Pro" target="_blank" rel="noopener noreferrer"
                           aria-label="Subscribe on YouTube"
                           class="group flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-200 shadow-sm">
                            <svg class="w-5 h-5 fill-slate-500 dark:fill-slate-400 group-hover:fill-[#D4AF37] transition-colors" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                        </a>

                    </div>

                    <!-- Payment Methods -->
                    <div class="flex items-center gap-3 flex-wrap justify-center">
                      <span class="text-xs text-slate-500 dark:text-slate-400 me-2">Secure payments via Moyasar:</span>
                      <div class="bg-slate-800 rounded px-2 py-1 flex items-center justify-center" title="مدى (Mada)">
                        <span class="text-xs font-black" style="color:#6DC24B;font-family:sans-serif;">mada</span>
                      </div>
                      <div class="bg-slate-800 rounded px-2 py-1 flex items-center justify-center" title="Visa">
                        <span class="text-xs font-black" style="color:#FFFFFF;font-family:sans-serif;">VISA</span>
                      </div>
                      <div class="bg-slate-800 rounded px-2 py-1 flex items-center justify-center" title="Apple Pay">
                        <span class="text-xs font-bold" style="color:#FFFFFF;font-family:-apple-system,sans-serif;">Pay</span>
                      </div>
                      <div class="bg-slate-800 rounded px-2 py-1 flex items-center justify-center" title="Samsung Pay">
                        <span class="text-[10px] font-bold" style="color:#1428A0;font-family:sans-serif;">SAMSUNG</span>
                      </div>
                    </div>

                    <!-- Support -->
                    <div class="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 px-6 py-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm text-center sm:text-left">
                        <div class="flex items-center gap-2 shrink-0">
                            <span class="material-symbols-outlined text-base" style="color:#D4AF37">support_agent</span>
                            <span class="text-sm font-bold text-slate-700 dark:text-slate-200">Need help?</span>
                        </div>
                        <div class="hidden sm:block w-px h-5 bg-slate-200 dark:bg-white/10"></div>
                        <a href="mailto:smlepro.official@gmail.com"
                           class="flex items-center gap-1.5 text-sm font-semibold hover:underline transition-colors" style="color:#D4AF37">
                            <span class="material-symbols-outlined text-base">mail</span>
                            smlepro.official@gmail.com
                        </a>
                        <div class="hidden sm:block w-px h-5 bg-slate-200 dark:bg-white/10"></div>
                        <div class="flex items-center gap-3 text-sm">
                            <a href="https://www.instagram.com/smle_pro/" target="_blank" rel="noopener noreferrer"
                               class="font-semibold text-slate-500 dark:text-slate-400 hover:text-[#D4AF37] transition-colors">Instagram</a>
                            <span class="text-slate-300 dark:text-slate-600">·</span>
                            <a href="https://x.com/SMLE_Pro" target="_blank" rel="noopener noreferrer"
                               class="font-semibold text-slate-500 dark:text-slate-400 hover:text-[#D4AF37] transition-colors">X</a>
                        </div>
                    </div>

                </div>

                <!-- Content freshness + support SLA -->
                <div class="max-w-2xl mx-auto px-4 pb-6 text-center">
                    <p class="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 leading-relaxed">
                        Question bank last reviewed:
                        <time datetime="${CONTENT_LAST_REVIEWED_ISO}" class="font-semibold text-slate-600 dark:text-slate-400">${CONTENT_LAST_REVIEWED_DISPLAY}</time>.
                        Support: we aim to respond within <span class="font-semibold text-slate-600 dark:text-slate-400">24 business hours</span> (email &amp; social DMs).
                    </p>
                </div>

                <!-- Merchant identity block (Saudi e-commerce compliance visibility) -->
                <div class="max-w-3xl mx-auto px-4 pb-6">
                    <div class="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-background-dark/60 backdrop-blur-sm px-4 py-3 text-center">
                        <p class="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            Service Provider: <span class="font-bold text-slate-800 dark:text-slate-200">Khaled Abdullah Ibrahim Al-Netaifi</span>
                            · Freelance Document No. <span class="font-bold text-slate-800 dark:text-slate-200">FL-812107742</span>
                            · Activity: <span class="font-semibold text-slate-700 dark:text-slate-300">Sales Management &amp; Activation</span>
                            · Valid until <span class="font-semibold text-slate-700 dark:text-slate-300">2026-10-26</span>
                        </p>
                    </div>
                </div>

                <!-- Bottom bar -->
                <div class="border-t border-slate-200 dark:border-white/5 py-5">
                    <div class="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p class="text-slate-400 text-xs">&copy; 2026 SMLE Pro. All rights reserved.</p>
                        <div class="flex items-center gap-5 text-xs font-semibold">
                            <a href="/legal.html#privacy" class="text-slate-400 hover:text-[#D4AF37] transition-colors">Privacy</a>
                            <a href="/legal.html#terms"   class="text-slate-400 hover:text-[#D4AF37] transition-colors">Terms</a>
                            <a href="/legal.html#refunds" class="text-slate-400 hover:text-[#D4AF37] transition-colors">Refunds</a>
                        </div>
                    </div>
                </div>

            </footer>
        </main>
    </div>
    `;

    // Top banner: optional dismiss (persists for the browser session)
    const topBanner = document.getElementById('landing-top-banner');
    const blessingSection = document.getElementById('saudi-blessing');
    function applyLandingBannerDismissed(dismissed) {
        if (!blessingSection) return;
        if (dismissed) {
            topBanner?.classList.add('hidden');
            blessingSection.classList.remove('pt-32');
            blessingSection.classList.add('pt-20');
        } else {
            topBanner?.classList.remove('hidden');
            blessingSection.classList.remove('pt-20');
            blessingSection.classList.add('pt-32');
        }
    }
    try {
        if (sessionStorage.getItem('smle_landing_banner_dismissed') === '1') {
            applyLandingBannerDismissed(true);
        }
    } catch { /* storage unavailable */ }
    document.getElementById('landing-banner-dismiss')?.addEventListener('click', () => {
        try { sessionStorage.setItem('smle_landing_banner_dismissed', '1'); } catch { /* ignore */ }
        applyLandingBannerDismissed(true);
    });

    // Event Listeners
    document.getElementById('login-btn-header').addEventListener('click', () => {
        navigateTo('login');
    });
    
    document.getElementById('login-btn-hero').addEventListener('click', () => {
        navigateTo('login');
    });

    document.getElementById('dashboard-preview-signin')?.addEventListener('click', () => {
        navigateTo('login');
    });
    document.getElementById('dashboard-preview-daily')?.addEventListener('click', () => {
        startDailyDose();
    });

    document.getElementById('hero-diagnostic-cta')?.addEventListener('click', () => {
        startDiagnostic();
    });

    document.getElementById('hero-upgrade-btn')?.addEventListener('click', () => {
        navigateTo('pricing');
    });

    document.getElementById('landing-pricing-cta')?.addEventListener('click', () => {
        navigateTo('pricing');
    });

    // Pricing plan cards — navigate directly to checkout with plan selected
    const planConfigs = {
        'plan-card-1m': { plan: '1m', amount: '149' },
        'plan-card-3m': { plan: '3m', amount: '349' },
        'plan-card-6m': { plan: '6m', amount: '549' },
        'plan-card-12m': { plan: '12m', amount: '799' },
    };
    Object.entries(planConfigs).forEach(([id, config]) => {
        document.getElementById(id)?.addEventListener('click', () => {
            window.location.href = `/checkout.html?plan=${config.plan}&amount=${config.amount}`;
        });
    });

    // ── Daily Dose CTA logic ──────────────────────────────────────────────
    const dailySection = document.getElementById('daily-dose-section');

    function formatMsCountdown(ms) {
        const s = Math.floor(ms / 1000);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    function msUntilMidnight() {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        return midnight.getTime() - now.getTime();
    }

    const done = checkDailyDoneToday();

    if (done) {
        // Already completed today — show score + live countdown + soft upsell
        dailySection.innerHTML = `
            <div class="flex flex-col items-center gap-3">
                <div class="flex items-center gap-4 bg-surface-dark/90 backdrop-blur-md border border-border-dark rounded-2xl px-6 py-4">
                    <div class="size-10 rounded-full bg-accent-green/20 flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-accent-green">check_circle</span>
                    </div>
                    <div class="text-left">
                        <p class="font-bold text-white text-sm">
                            Today's Dose done! You scored <span class="text-primary">${done.score}%</span>
                        </p>
                        <p class="text-xs text-slate-400">
                            New questions in <span id="hero-countdown" class="text-accent-orange tabular-nums font-bold">--:--:--</span>
                        </p>
                    </div>
                </div>
                <div class="flex items-center gap-3 flex-wrap justify-center">
                    <button id="landing-daily-upsell" class="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline transition-colors">
                        <span class="material-symbols-outlined text-base">workspace_premium</span>
                        Upgrade for unlimited practice — from 149 SAR
                    </button>
                    <span class="text-slate-600 text-xs">·</span>
                    <button id="landing-daily-signin" class="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                        <span class="material-symbols-outlined text-base">login</span>
                        Sign in to track your progress
                    </button>
                </div>
            </div>`;

        // Live countdown tick
        const countdownEl = document.getElementById('hero-countdown');
        const tick = () => { if (countdownEl) countdownEl.textContent = formatMsCountdown(msUntilMidnight()); };
        tick();
        const interval = setInterval(tick, 1000);
        // Clean up when the SPA navigates away
        const cleanup = () => clearInterval(interval);
        document.addEventListener('click', cleanup, { once: true });

        document.getElementById('landing-daily-upsell')?.addEventListener('click', () => navigateTo('pricing'));
        document.getElementById('landing-daily-signin')?.addEventListener('click', () => navigateTo('login'));

    } else {
        // Not done yet — show the start button
        dailySection.innerHTML = `
            <div class="flex flex-col items-center gap-4">
                <!-- Arabic hint: arrow + glass card (above Daily Dose button) -->
                <div class="w-full max-w-lg mx-auto flex flex-col items-center gap-1" aria-label="جرب 30 سؤال، ما يحتاج تسجل، تتجدد الساعة 12 آخر الليل">
                    <div class="hero-dose-arrow-nudge flex flex-col items-center pointer-events-none select-none">
                        <svg class="w-[4.5rem] h-[3.25rem] sm:w-[5rem] sm:h-14 text-primary drop-shadow-[0_0_20px_rgba(17,180,212,0.5)]" viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <defs>
                                <linearGradient id="heroDoseArrowGrad" x1="40" y1="4" x2="40" y2="58" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#11b4d4"/>
                                    <stop offset="1" stop-color="#D4AF37"/>
                                </linearGradient>
                            </defs>
                            <!-- Hand-drawn swoosh + chevron: points at the CTA -->
                            <path d="M40 6 C18 8 10 22 14 34 C16 40 22 44 40 46" stroke="url(#heroDoseArrowGrad)" stroke-width="2.25" stroke-linecap="round" fill="none" opacity="0.9"/>
                            <path d="M40 6 C62 8 70 22 66 34 C64 40 58 44 40 46" stroke="url(#heroDoseArrowGrad)" stroke-width="2.25" stroke-linecap="round" fill="none" opacity="0.9"/>
                            <path d="M40 48 L40 58 M30 52 L40 60 L50 52" stroke="url(#heroDoseArrowGrad)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="40" cy="5" r="4" fill="url(#heroDoseArrowGrad)"/>
                        </svg>
                    </div>
                    <div class="relative w-full px-1 -mt-1">
                        <div class="hero-dose-glow-ring absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-primary/50 via-amber-400/35 to-primary/50 opacity-70 blur-[2px] pointer-events-none" aria-hidden="true"></div>
                        <div dir="rtl" lang="ar" class="relative rounded-2xl border border-white/12 bg-slate-950/75 backdrop-blur-md px-4 py-3.5 sm:px-6 sm:py-4 shadow-[0_0_0_1px_rgba(17,180,212,0.18),0_24px_60px_-20px_rgba(0,0,0,0.65)]">
                            <p class="text-center text-[0.95rem] sm:text-lg font-bold leading-[1.75] text-white/95 tracking-tight"
                               style="font-family:'Noto Sans Arabic','Space Grotesk',system-ui,sans-serif">
                                <span class="text-primary font-extrabold">جرب 30 سؤال</span>
                                <span class="mx-1 text-primary/35 font-light">،</span>
                                <span class="text-emerald-300/95">ما يحتاج تسجل</span>
                                <span class="mx-1 text-primary/35 font-light">،</span>
                                <span class="text-amber-100/90">تتجدد الساعة <span class="tabular-nums font-extrabold text-amber-200">12</span> آخر الليل</span>
                            </p>
                            <div class="mt-2 flex items-center justify-center gap-2 opacity-80" aria-hidden="true">
                                <span class="h-px w-8 bg-gradient-to-l from-transparent to-primary/50"></span>
                                <span class="text-[10px] text-primary/70">✦</span>
                                <span class="h-px w-8 bg-gradient-to-r from-transparent to-primary/50"></span>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- FREE badges row — visible above the button -->
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest"
                          style="background:rgba(212,175,55,0.18);color:#FFE566;border:1px solid rgba(212,175,55,0.4);">
                        ✦ 100% Free
                    </span>
                    <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest"
                          style="background:rgba(16,185,129,0.14);color:#6ee7b7;border:1px solid rgba(16,185,129,0.3);">
                        No sign-up needed
                    </span>
                </div>
                <button id="daily-dose-cta"
                    class="group flex items-center gap-4 px-8 py-5 font-bold rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] active:scale-[.98]"
                    style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 60%,#1e3a5f 100%);box-shadow:0 0 36px rgba(245,158,11,0.5),0 6px 24px rgba(0,0,0,0.45);">
                    <span class="material-symbols-outlined text-white text-3xl group-hover:scale-110 transition-transform drop-shadow">bolt</span>
                    <span class="font-black text-lg leading-tight text-white drop-shadow tracking-tight">Take Today's Daily Dose</span>
                </button>
            </div>`;

        document.getElementById('daily-dose-cta').addEventListener('click', () => startDailyDose());
    }

    // ── Urgency Banner Countdown (ends May 31, 2026) ───────────────────────
    function tickUrgencyCountdown() {
        const el = document.getElementById('urgency-countdown');
        if (!el) return;
        const now = new Date();
        const deadline = new Date('2026-05-31T23:59:59+03:00'); // Saudi time
        const diff = deadline.getTime() - now.getTime();
        if (diff <= 0) {
            el.textContent = '🔥 Offer ended';
            return;
        }
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        el.textContent = `${days}d ${hours}h ${mins}m`;
    }
    tickUrgencyCountdown();
    setInterval(tickUrgencyCountdown, 60 * 1000); // update every minute

    // ── Saudi Blessing Section ────────────────────────────────────────────

    // 1. Generate twinkling star particles into the background div
    const blessingStarsBg = document.getElementById('blessing-stars-bg');
    if (blessingStarsBg) {
        blessingStarsBg.innerHTML = Array.from({ length: 32 }, () => {
            const sz   = (Math.random() * 2.4 + 0.6).toFixed(1);
            const x    = (Math.random() * 100).toFixed(1);
            const y    = (Math.random() * 100).toFixed(1);
            const dur  = (Math.random() * 4 + 1.8).toFixed(1);
            const del  = (Math.random() * 7).toFixed(1);
            const base = (Math.random() * 0.45 + 0.12).toFixed(2);
            return `<div class="blessing-star" style="left:${x}%;top:${y}%;width:${sz}px;height:${sz}px;--duration:${dur}s;--delay:${del}s;--base-opacity:${base};"></div>`;
        }).join('');
    }

    // 2. Build dua text — each word is a hidden inline-block span revealed by JS
    const duaEl = document.getElementById('dua-blessing-text');
    if (duaEl) {
        const DUA = 'اللهم اجعل هذا البلد آمناً مطمئناً سخاءً رخاءً، وسائر بلاد المسلمين.';
        duaEl.innerHTML = DUA.split(' ').map(word =>
            `<span class="dua-word" style="display:inline-block;opacity:0;transform:translateY(10px);transition:opacity 0.65s ease,transform 0.65s ease;">${word}</span>`
        ).join(' ');
    }

    // 3. Trigger entrance animations on load — section is now above the fold
    function runBlessingAnimation() {
        // Unfurl the flag from the pole (scaleX 0.04 → 1)
        const flagPanel = document.getElementById('blessing-flag-panel');
        if (flagPanel) {
            flagPanel.style.transition = 'transform 0.95s cubic-bezier(0.22,1,0.36,1), opacity 0.65s ease';
            flagPanel.style.transform  = 'scaleX(1)';
            flagPanel.style.opacity    = '1';
            // Once fully unfurled, begin the perpetual gentle sway
            setTimeout(() => flagPanel.classList.add('blessing-flag-sway'), 1000);
        }

        // Reveal dua words one by one — right-to-left (natural Arabic reading order)
        const wordSpans = document.querySelectorAll('#dua-blessing-text .dua-word');
        wordSpans.forEach((span, i) => {
            setTimeout(() => {
                span.style.opacity   = '1';
                span.style.transform = 'translateY(0)';
            }, 720 + i * 145);
        });

        // After all words are visible, start the golden glow pulse
        setTimeout(() => {
            document.getElementById('dua-blessing-text')?.classList.add('dua-glow-pulse');
        }, 720 + wordSpans.length * 145 + 650);
    }

    // Small delay so the browser has painted the DOM before we start animating
    setTimeout(runBlessingAnimation, 320);

    // ── Exam Availability Info ──────────────────────────────────────────────
    // SMLE exams are available year-round (1st-24th of each month)
    // No countdown needed - just show availability info
    const countdownEl = document.getElementById('hero-countdown-days');
    if (countdownEl) {
        // Show "Available Now" instead of countdown
        countdownEl.textContent = "Now";
    }
}
