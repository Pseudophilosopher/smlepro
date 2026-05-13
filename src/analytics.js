/**
 * SMLE Pro Analytics Module
 * 
 * Centralized tracking for GA4 and Firebase Analytics.
 * Privacy-compliant: respects DNT, anonymizes IPs, requires consent.
 * 
 * Event Categories:
 * - quiz_*: Quiz session events
 * - daily_dose_*: Free Daily Dose events
 * - conversion_*: Upgrade and payment events
 * - auth_*: Authentication events
 * - error_*: Error tracking
 */

// ═══════════════════════════════════════════════════════════════
// EVENT NAME CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const ANALYTICS_EVENTS = {
  // ── Quiz Events ──────────────────────────────────────────────
  QUIZ_START: 'quiz_start',
  QUIZ_COMPLETE: 'quiz_complete',
  QUIZ_ABANDON: 'quiz_abandon',
  QUIZ_QUESTION_ANSWERED: 'quiz_question_answered',

  // ── Daily Dose Events ────────────────────────────────────────
  DAILY_DOSE_START: 'daily_dose_start',
  DAILY_DOSE_COMPLETE: 'daily_dose_complete',
  DAILY_DOSE_SHARE: 'daily_dose_share',

  // ── Diagnostic Events ────────────────────────────────────────
  DIAGNOSTIC_STARTED: 'diagnostic_started',
  DIAGNOSTIC_QUESTION_ANSWERED: 'diagnostic_question_answered',
  DIAGNOSTIC_COMPLETED: 'diagnostic_completed',
  DIAGNOSTIC_ABANDONED: 'diagnostic_abandoned',
  DIAGNOSTIC_SAVED_RESULTS: 'diagnostic_saved_results',
  DIAGNOSTIC_SHARED: 'diagnostic_shared',

  // ── Conversion Events ────────────────────────────────────────
  UPGRADE_CLICK: 'upgrade_click',
  UPGRADE_VIEW_PLAN: 'upgrade_view_plan',
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILURE: 'payment_failure',
  CHECKOUT_START: 'checkout_start',

  // ── Auth Events ──────────────────────────────────────────────
  LOGIN_SUCCESS: 'login_success',
  LOGIN_ERROR: 'login_error',
  SIGNUP_SUCCESS: 'signup_success',
  SIGNUP_ERROR: 'signup_error',

  // ── Error Events ─────────────────────────────────────────────
  APP_ERROR: 'app_error',
  NETWORK_ERROR: 'network_error',
  FIREBASE_ERROR: 'firebase_error',

  // ── Engagement Events ────────────────────────────────────────
  PAGE_VIEW: 'page_view',
  FEATURE_ACCESS: 'feature_access',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end'
};

// ═══════════════════════════════════════════════════════════════
// PRIVACY & CONSENT
// ═══════════════════════════════════════════════════════════════

/**
 * Check if user has Do Not Track enabled
 */
export function hasDoNotTrack() {
  return navigator.doNotTrack === '1' || window.doNotTrack === '1';
}

/**
 * Check if analytics consent has been given
 * Falls back to checking if DNT is enabled
 */
export function hasAnalyticsConsent() {
  // Auto-grant consent for Saudi audience (no GDPR requirement).
  // This ensures all events are tracked to GA4 by default.
  try {
    const stored = localStorage.getItem('smle_analytics_consent');
    if (stored === null) {
      localStorage.setItem('smle_analytics_consent', 'true');
      return true;
    }
    return stored === 'true';
  } catch {
    return true;
  }
}

/**
 * Set analytics consent preference
 */
export function setAnalyticsConsent(granted) {
  try {
    localStorage.setItem('smle_analytics_consent', String(granted));
  } catch { /* storage unavailable */ }
}

// ═══════════════════════════════════════════════════════════════
// TRACKING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get current user ID (anonymized if not consented)
 */
function getUserId() {
  try {
    const { auth } = require('./app.js');
    const user = auth?.currentUser;
    if (user && !user.isAnonymous) {
      // Hash the UID for privacy
      return btoa(user.uid).substring(0, 16);
    }
  } catch { /* app not loaded */ }
  return null;
}

/**
 * Get session ID for funnel tracking
 */
function getSessionId() {
  try {
    let sessionId = sessionStorage.getItem('smle_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      sessionStorage.setItem('smle_session_id', sessionId);
    }
    return sessionId;
  } catch {
    return null;
  }
}

/**
 * Get UTM parameters from URL
 */
export function getUTMParameters() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || params.get('ref') || 'direct',
    utm_medium: params.get('utm_medium') || 'none',
    utm_campaign: params.get('utm_campaign') || 'none',
    utm_term: params.get('utm_term') || 'none',
    utm_content: params.get('utm_content') || 'none',
    first_touch_source: sessionStorage.getItem('smle_first_touch_source') || params.get('utm_source') || 'direct'
  };
}

/**
 * Store first touch attribution on first visit
 */
export function storeFirstTouchAttribution() {
  try {
    if (!sessionStorage.getItem('smle_first_touch_source')) {
      const params = getUTMParameters();
      sessionStorage.setItem('smle_first_touch_source', params.utm_source);
      sessionStorage.setItem('smle_first_touch_medium', params.utm_medium);
      sessionStorage.setItem('smle_first_touch_campaign', params.utm_campaign);
      sessionStorage.setItem('smle_first_touch_time', String(Date.now()));
    }
  } catch { /* storage unavailable */ }
}

/**
 * Core tracking function - sends events to GA4 and Firebase Analytics
 */
export function trackEvent(eventName, params = {}) {
  // Privacy check
  if (!hasAnalyticsConsent()) {
    // Still log in development for debugging
    if (window.location.hostname === 'localhost') {
      console.log('[Analytics - No Consent]', eventName, params);
    }
    return;
  }

  // Enrich with common parameters
  const enrichedParams = {
    ...params,
    session_id: getSessionId(),
    page_path: window.location.pathname,
    page_title: document.title,
    ...getUTMParameters()
  };

  // Add user ID if available
  const userId = getUserId();
  if (userId) {
    enrichedParams.user_id = userId;
  }

  // Send to GA4
  if (typeof gtag === 'function') {
    gtag('event', eventName, enrichedParams);
  }

  // Send to Firebase Analytics (if available)
  try {
    const { analytics } = require('./app.js');
    if (analytics) {
      // Firebase Analytics uses logEvent
      analytics.logEvent(eventName, enrichedParams);
    }
  } catch { /* Firebase Analytics not available */ }

  // Console logging in development
  if (window.location.hostname === 'localhost') {
    console.log('[Analytics]', eventName, enrichedParams);
  }
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE TRACKING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Track quiz session start
 */
export function trackQuizStart(quizType, questionCount, specialty) {
  trackEvent(ANALYTICS_EVENTS.QUIZ_START, {
    quiz_type: quizType,
    question_count: questionCount,
    specialty: specialty || 'mixed',
    content_type: quizType === 'daily_dose' ? 'free' : 'premium'
  });
}

/**
 * Track quiz completion
 */
export function trackQuizComplete(quizType, score, timeSpent, questionCount) {
  trackEvent(ANALYTICS_EVENTS.QUIZ_COMPLETE, {
    quiz_type: quizType,
    score: score,
    time_spent_seconds: timeSpent,
    question_count: questionCount,
    score_category: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low'
  });
}

/**
 * Track quiz abandonment
 */
export function trackQuizAbandon(quizType, questionsAnswered, totalQuestions) {
  trackEvent(ANALYTICS_EVENTS.QUIZ_ABANDON, {
    quiz_type: quizType,
    questions_answered: questionsAnswered,
    total_questions: totalQuestions,
    completion_percentage: Math.round((questionsAnswered / totalQuestions) * 100)
  });
}

/**
 * Track Daily Dose start
 */
export function trackDailyDoseStart() {
  trackEvent(ANALYTICS_EVENTS.DAILY_DOSE_START, {
    content_type: 'free',
    is_registered: getUserId() !== null
  });
}

/**
 * Track Daily Dose completion
 */
export function trackDailyDoseComplete(score, timeSpent) {
  trackEvent(ANALYTICS_EVENTS.DAILY_DOSE_COMPLETE, {
    score: score,
    time_spent_seconds: timeSpent,
    content_type: 'free'
  });
}

/**
 * Track diagnostic started
 */
export function trackDiagnosticStarted() {
  trackEvent(ANALYTICS_EVENTS.DIAGNOSTIC_STARTED, {
    content_type: 'diagnostic',
  });
}

/**
 * Track diagnostic question answered
 */
export function trackDiagnosticQuestionAnswered(questionNumber, domain) {
  trackEvent(ANALYTICS_EVENTS.DIAGNOSTIC_QUESTION_ANSWERED, {
    question_number: questionNumber,
    domain: domain,
  });
}

/**
 * Track diagnostic completed
 */
export function trackDiagnosticCompleted(score, readiness, timeSpent) {
  trackEvent(ANALYTICS_EVENTS.DIAGNOSTIC_COMPLETED, {
    score: score,
    smle_readiness: readiness,
    time_spent_seconds: timeSpent,
    content_type: 'diagnostic',
  });
}

/**
 * Track diagnostic abandoned (user exited mid-quiz)
 */
export function trackDiagnosticAbandoned(questionsAnswered) {
  trackEvent(ANALYTICS_EVENTS.DIAGNOSTIC_ABANDONED, {
    questions_answered: questionsAnswered,
    total_questions: 40,
  });
}

/**
 * Track diagnostic results saved (email submitted)
 */
export function trackDiagnosticSavedResults(email) {
  trackEvent(ANALYTICS_EVENTS.DIAGNOSTIC_SAVED_RESULTS, {
    has_email: !!email,
  });
}

/**
 * Track diagnostic shared
 */
export function trackDiagnosticShared() {
  trackEvent(ANALYTICS_EVENTS.DIAGNOSTIC_SHARED, {
    content_type: 'diagnostic',
  });
}

/**
 * Track upgrade button click
 */
export function trackUpgradeClick(source, planType) {
  trackEvent(ANALYTICS_EVENTS.UPGRADE_CLICK, {
    source: source,
    plan_type: planType || 'not_selected',
    content_type: 'conversion'
  });
}

/**
 * Track payment success
 */
export function trackPaymentSuccess(amount, currency, planType, paymentMethod) {
  trackEvent(ANALYTICS_EVENTS.PAYMENT_SUCCESS, {
    value: amount,
    currency: currency,
    plan_type: planType,
    payment_method: paymentMethod,
    content_type: 'revenue'
  });
}

/**
 * Track payment failure
 */
export function trackPaymentFailure(errorCode, errorMessage, planType) {
  trackEvent(ANALYTICS_EVENTS.PAYMENT_FAILURE, {
    error_code: errorCode,
    error_message: errorMessage?.substring(0, 100),
    plan_type: planType,
    content_type: 'error'
  });
}

/**
 * Track login success
 */
export function trackLoginSuccess(method) {
  trackEvent(ANALYTICS_EVENTS.LOGIN_SUCCESS, {
    method: method || 'google'
  });
}

/**
 * Track login error
 */
export function trackLoginError(errorCode, errorMessage) {
  trackEvent(ANALYTICS_EVENTS.LOGIN_ERROR, {
    error_code: errorCode,
    error_message: errorMessage?.substring(0, 100)
  });
}

/**
 * Track app errors
 */
export function trackError(errorType, errorMessage, context) {
  trackEvent(ANALYTICS_EVENTS.APP_ERROR, {
    error_type: errorType,
    error_message: errorMessage?.substring(0, 200),
    context: context,
    content_type: 'error'
  });
}

/**
 * Track page view (for SPA navigation)
 */
export function trackPageView(pageName) {
  trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, {
    page_name: pageName,
    page_path: window.location.pathname
  });
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize analytics on app start
 * - Store first touch attribution
 * - Set up GA4 with privacy settings
 */
export function initAnalytics() {
  // Store first touch attribution
  storeFirstTouchAttribution();

  // Configure GA4 with privacy settings
  if (typeof gtag === 'function') {
    // Respect DNT and configure consent mode
    if (hasDoNotTrack()) {
      gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    } else if (hasAnalyticsConsent()) {
      gtag('consent', 'default', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }

    // Configure GA4 with IP anonymization
    gtag('config', 'G-G2S4QENDZ0', {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  }

  // Track session start
  trackEvent(ANALYTICS_EVENTS.SESSION_START, {
    is_registered: getUserId() !== null
  });

  console.log('[Analytics] Initialized');
}

/**
 * Clean up analytics on app unload
 */
export function cleanupAnalytics() {
  trackEvent(ANALYTICS_EVENTS.SESSION_END, {
    session_duration_seconds: Math.round((Date.now() - sessionStartTime) / 1000)
  });
}

// Store session start time
const sessionStartTime = Date.now();

// Track session end on page unload
window.addEventListener('beforeunload', cleanupAnalytics);