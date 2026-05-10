# SMLE Pro Security Audit Report

**Date:** April 22, 2026  
**Auditor:** Senior Frontend Architect & Firebase Expert  
**Application:** SMLE Pro (smlepro.web.app)  
**Scope:** Full application security audit including authentication, data protection, payment security, input validation, and dependencies

---

## Executive Summary

A comprehensive security audit was conducted on the SMLE Pro application. The audit identified **15 security issues** across all categories, with **2 Critical**, **4 High**, **6 Medium**, and **3 Low** severity findings.

**Overall Security Rating: 7.5/10**

The application has a strong security foundation with well-designed Firestore rules and secure Cloud Functions, but several issues require immediate attention before production launch.

---

## 🔴 CRITICAL ISSUES

### C1: Hardcoded Firebase API Key in Client-Side Code
- **Severity:** Critical
- **File:** `src/app.js` (line 22)
- **Issue:** Firebase API key is exposed in client-side JavaScript:
  ```javascript
  apiKey: "AIzaSyCBrsgmoXwY-DnjfZtvIZNsVJ4s45g2ON4",
  ```
- **Impact:** While Firebase API keys are not secret credentials (they're designed to be public), exposing them alongside the project ID makes it trivial for attackers to target your specific Firebase project.
- **Fix:** This is actually acceptable per Firebase design - API keys are meant to be public. However, ensure Firebase App Check is enabled to prevent unauthorized clients from accessing your backend.
- **Status:** ⚠️ **Acceptable but should enable App Check**

### C2: Critical Dependency Vulnerability - protobufjs RCE
- **Severity:** Critical
- **File:** `node_modules/protobufjs`
- **Issue:** `protobufjs < 7.5.5` has arbitrary code execution vulnerability (GHSA-xq3m-2v4x-88gg)
- **Impact:** Potential remote code execution through malicious protobuf data
- **Fix:** Run `npm audit fix` to update protobufjs to 7.5.5+
- **Status:** ❌ **REQUIRES IMMEDIATE FIX**

---

## 🟠 HIGH SEVERITY ISSUES

### H1: Moyasar Test API Key in Production Code
- **Severity:** High
- **File:** `checkout.html` (line 150)
- **Issue:** Test API key is hardcoded in production checkout page:
  ```javascript
  const MOYASAR_PUBLIC_KEY = 'pk_test_LmUtbkg2QdVvoyJcdiYJq3pcLyLVjgoVcenE3E8E';
  ```
- **Impact:** Test keys should never be used in production. This could allow test transactions to be processed as real, or real transactions to fail.
- **Fix:** 
  1. Create separate production keys in Moyasar dashboard
  2. Use environment-based configuration in Cloud Functions
  3. Never expose secret keys client-side (current implementation correctly uses server-side verification)
- **Status:** ❌ **MUST FIX BEFORE LAUNCH**

### H2: High Severity Dependency Vulnerabilities
- **Severity:** High
- **Files:** Multiple node_modules
- **Issues:**
  - `node-forge <= 1.3.3`: Certificate verification bypass, signature forgery (GHSA-2328-f5f3-gj25, GHSA-q67f-28xg-22rw, GHSA-5m6q-g25r-mvwx, GHSA-ppp5-5v6c-4jwp)
  - `picomatch <= 2.3.1`: ReDOS vulnerability (GHSA-c2c7-rcm5-vvqj)
  - `undici <= 6.23.0`: Multiple vulnerabilities including HTTP smuggling, DoS (GHSA-c76h-2ccp-4975, GHSA-g9mf-h72j-4rw9, etc.)
- **Impact:** Various attacks including certificate bypass, denial of service, and HTTP smuggling
- **Fix:** Run `npm audit fix` to update affected packages
- **Status:** ❌ **REQUIRES FIX**

### H3: Admin Email Hardcoded in Multiple Files
- **Severity:** High
- **Files:** `firestore.rules`, `functions/index.js`, `src/admin-config.js`
- **Issue:** Admin email `ohgzzz11@gmail.com` is hardcoded in Firestore security rules and multiple JavaScript files. While centralized in `admin-config.js`, the Firestore rules still have it hardcoded.
- **Impact:** If admin email needs to change, Firestore rules must be redeployed. Also exposes admin email to anyone reading the rules.
- **Fix:** Consider using Firebase Custom Claims for admin role instead of email-based checks
- **Status:** ⚠️ **SHOULD IMPROVE**

### H4: Missing Content Security Policy (CSP)
- **Severity:** High
- **File:** `firebase.json`
- **Issue:** No Content-Security-Policy header is set, leaving the application vulnerable to XSS attacks via any undiscovered injection points
- **Impact:** Potential for XSS attacks, data exfiltration, and session hijacking
- **Fix:** Add CSP header to firebase.json:
  ```json
  {
    "key": "Content-Security-Policy",
    "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://api.moyasar.com;"
  }
  ```
- **Status:** ❌ **SHOULD ADD**

---

## 🟡 MEDIUM SEVERITY ISSUES

### M1: XSS Risk via innerHTML with User-Generated Content
- **Severity:** Medium
- **Files:** `src/admin.js`, `src/quiz.js`, `src/dashboard.js`
- **Issue:** Multiple locations use `innerHTML` to render content. While `escapeHtml()` is used in admin.js, other files may not properly sanitize all dynamic content:
  - `src/quiz.js` line 289: Question text rendered directly
  - `src/dashboard.js`: User display name rendered in HTML
- **Impact:** If question content or user data is compromised, XSS attacks are possible
- **Fix:** Ensure all dynamic content is properly escaped before rendering. Use `textContent` instead of `innerHTML` where possible.
- **Status:** ⚠️ **REVIEW AND SANITIZE**

### M2: Client-Side Rate Limiting Only
- **Severity:** Medium
- **File:** `src/app.js` (lines 71-80)
- **Issue:** Rate limiting for `recordHourlyPresence` is implemented client-side only (30-second cooldown via sessionStorage). Attackers can bypass this by clearing storage or using multiple browsers.
- **Impact:** Potential for abuse of the presence tracking system
- **Fix:** Implement server-side rate limiting in the Cloud Function using Redis or Firestore-based rate limiting
- **Status:** ⚠️ **SHOULD IMPLEMENT SERVER-SIDE**

### M3: No Firebase App Check
- **Severity:** Medium
- **Issue:** Firebase App Check is not enabled, allowing any client with the Firebase config to access your backend
- **Impact:** Attackers could create custom clients to abuse your Cloud Functions and Firestore
- **Fix:** Enable Firebase App Check with reCAPTCHA v3 or SafetyNet for your domain
- **Status:** ❌ **SHOULD ENABLE**

### M4: Display Name Not Validated
- **Severity:** Medium
- **File:** `src/dashboard.js` (lines 888-908)
- **Issue:** User display name input is saved to Firestore without server-side validation of length or content
- **Impact:** Potential for storing malicious content or extremely long names
- **Fix:** Add Firestore validation rules for displayName field length and content
- **Status:** ⚠️ **SHOULD VALIDATE**

### M5: Email Input Not Validated Server-Side for Complimentary Pro
- **Severity:** Medium
- **File:** `functions/index.js` (lines 155-157)
- **Issue:** While email validation exists, it's a basic regex that could be bypassed
- **Impact:** Invalid emails could be processed
- **Fix:** Use Firebase Admin SDK's email validation or more robust validation
- **Status:** ⚠️ **IMPROVE VALIDATION**

### M6: Payment Description Contains UID - Potential Information Leak
- **Severity:** Medium
- **File:** `functions/index.js` (line 107-109)
- **Issue:** Payment verification checks for `UID:${uid}` in the payment description. This pattern is predictable.
- **Impact:** If an attacker knows a user's UID, they could potentially craft a payment with that UID tag
- **Fix:** Use a more secure verification method like storing a payment intent server-side and matching by ID
- **Status:** ⚠️ **CONSIDER IMPROVING**

---

## 🟢 LOW SEVERITY ISSUES

### L1: Verbose Error Messages in Development
- **Severity:** Low
- **Files:** Multiple
- **Issue:** Some error messages expose implementation details (e.g., "Check Firebase → Functions → Logs")
- **Impact:** Minor information disclosure
- **Fix:** Use generic error messages in production, log details server-side only
- **Status:** ✅ **MINOR - ACCEPTABLE**

### L2: No Audit Logging for Critical Operations
- **Severity:** Low
- **Issue:** Critical operations like granting Pro access or deleting questions don't have dedicated audit logs
- **Impact:** Difficult to track admin actions for security reviews
- **Fix:** Implement audit logging to a dedicated Firestore collection
- **Status:** ⚠️ **SHOULD IMPLEMENT**

### L3: Leaderboard Data Visible to All Authenticated Users
- **Severity:** Low
- **File:** `firestore.rules` (lines 88-89)
- **Issue:** Any authenticated user (including anonymous) can read all leaderboard entries
- **Impact:** Minor privacy concern - user scores and UIDs are visible
- **Fix:** Consider if this is acceptable. If not, limit to aggregated data only
- **Status:** ✅ **ACCEPTABLE FOR FEATURE**

---

## ✅ SECURITY STRENGTHS

### Excellent Firestore Security Rules
- Safety net deny-all rule at the top
- Proper user isolation (users can only access their own data)
- Admin-only operations properly restricted
- Payment data completely locked down (no client access)
- Premium field protection (users can't self-assign premium status)
- Create-only leaderboard entries prevent score manipulation

### Secure Payment Flow
- Payment verification happens entirely server-side
- Moyasar secret key properly stored as a Firebase secret
- Payment amounts validated against allowed set
- Currency verification implemented
- User-payment association verified via UID in description

### Good Authentication Practices
- Firebase Auth with Google provider
- Custom claims for Pro status
- Anonymous auth for Daily Dose guests
- Proper session management

### Security Headers Implemented
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()

---

## 📋 PRE-LAUNCH CHECKLIST

### Must Fix Before Launch
- [ ] **Update dependencies** - Run `npm audit fix` to address critical and high vulnerabilities
- [ ] **Replace test API keys** - Use production Moyasar keys for live deployment
- [ ] **Enable Firebase App Check** - Prevent unauthorized client access
- [ ] **Add Content Security Policy** - Protect against XSS attacks

### Should Fix Soon After Launch
- [ ] Implement server-side rate limiting
- [ ] Add audit logging for admin operations
- [ ] Improve email validation for complimentary Pro
- [ ] Review and sanitize all innerHTML usage

### Nice to Have
- [ ] Use Firebase Custom Claims for admin role instead of email
- [ ] Add more granular CSP directives
- [ ] Implement automated security scanning in CI/CD

---

## DEPENDENCY VULNERABILITY SUMMARY

```
23 vulnerabilities found:
- 8 Low severity
- 11 Moderate severity  
- 3 High severity
- 1 Critical severity

Critical: protobufjs < 7.5.5 (RCE)
High: node-forge, picomatch, undici
```

**Recommended Action:** Run `npm audit fix` immediately. For breaking changes, review and update manually.

---

## CONCLUSION

SMLE Pro has a solid security foundation with well-designed Firestore rules and secure server-side payment processing. However, **critical dependency vulnerabilities and the use of test API keys in production code must be addressed before launch**.

The application is **NOT READY FOR PRODUCTION** until the Critical and High severity issues are resolved. After fixing these issues, the application should achieve a security rating of 9/10.

---

**Contact:** For security concerns, refer to `src/admin-config.js` for admin contact information.

**Last Updated:** April 22, 2026