/**
 * Simple logging utility for SMLE Pro
 * Replaces console statements with environment-aware logging
 */

const isDev = window.location.hostname === 'localhost';

/**
 * Log error messages
 * In production, these are silently ignored to avoid exposing debug info
 */
export function logError(msg, data = null) {
    if (isDev) {
        console.error(msg, data);
    }
    // In production, we could send to analytics here
}

/**
 * Log warning messages  
 * In production, these are silently ignored
 */
export function logWarn(msg, data = null) {
    if (isDev) {
        console.warn(msg, data);
    }
}

/**
 * Log info/debug messages
 * Only shown in development
 */
export function logInfo(msg, data = null) {
    if (isDev) {
        console.log(msg, data);
    }
}

/**
 * Log analytics events (only in development for debugging)
 */
export function logAnalytics(eventName, params = {}) {
    if (isDev) {
        console.log('[Analytics]', eventName, params);
    }
}

/**
 * Log analytics events when consent is denied (only in development)
 */
export function logAnalyticsNoConsent(eventName, params = {}) {
    if (isDev) {
        console.log('[Analytics - No Consent]', eventName, params);
    }
}