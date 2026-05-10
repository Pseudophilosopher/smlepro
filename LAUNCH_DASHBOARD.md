# SMLE Pro Master Launch Dashboard

Last updated: 2026-03-24 (checklist §12–14, legal footers mirrored)
Owner: MAGHA.NET
Launch target: Production web app (`smlepro.web.app`)

Use this dashboard to track findings from multiple AI audits, convert them into verified fixes, and decide launch readiness with confidence.

---

## 1) Audit Intake Board

| Audit ID | Source AI | Focus Area | Date | Severity | Status | Link/Notes |
|---|---|---|---|---|---|---|
| A-001 | Google AI Studio | Security + Deployment | 2026-03-24 | P0/P1 | Addressed | Premium hydration, SPA rewrite, Spline lazy load |
| A-002 | ChatGPT | Security + Deploy | 2026-03-24 | P0/P1 | Addressed | Amount/currency/ownership checks added |
| A-003 | z.ai | Preliminary | 2026-03-24 | Mixed | N/A | Requested direct file content |

> Rule: every external AI suggestion must be recorded here before any code change.

---

## 2) Security Track (Pentest)

### Objective
Prevent unauthorized premium upgrades, data leaks, admin spoofing, and replay abuse.

### Checklist
- [x] `payments` collection is backend-only in `firestore.rules` (`allow read, write: if false;`)
- [x] Client cannot set premium fields (`isPremium`, `moyasarPaymentId`, `upgradedAt`) in `users/{uid}`
- [x] Cloud Function requires authenticated user (`request.auth.uid`)
- [x] Cloud Function validates payment status is `paid`
- [x] Cloud Function validates amount is in allowed plan set (`14900, 34900, 54900, 79900`)
- [x] Cloud Function validates currency is `SAR`
- [x] Cloud Function validates payment ownership via UID tag in payment description
- [x] Transaction prevents payment re-claim by another UID
- [ ] Optional hardening: move admin authorization checks from email to UID/custom claim
- [ ] Optional hardening: add App Check enforcement strategy review

### Evidence
- Files reviewed: `functions/index.js`, `firestore.rules`, `src/checkout.js`
- Deploy evidence: `firestore.rules` and indexes deployed successfully

---

## 3) Performance & UX Track

### Objective
Ensure stable experience on mid-range mobile devices and variable network conditions.

### Checklist
- [x] Spline viewer set to lazy loading (`loading="lazy"`)
- [x] Spline pointer interactions disabled to avoid scroll trap risk
- [ ] Run Lighthouse (mobile) and record: LCP, CLS, TBT, INP
- [ ] Evaluate code-splitting for large app bundle warning (`dist/assets/app-*.js > 500 KB`)
- [ ] Verify hero section performance on Android mid-range device
- [ ] Confirm no visible layout shift during 3D scene load
- [ ] Validate fallback behavior if Spline script fails to load

### Evidence
- Build output warning: chunk size > 500 KB
- File reviewed: `src/landing.js`

---

## 4) DevOps & Scalability Track

### Objective
Ensure production routing, rules deploy consistency, and growth-safe data access patterns.

### Checklist
- [x] SPA rewrite configured in `firebase.json` (`** -> /index.html`)
- [x] Firestore config added in `firebase.json` (`rules` + `indexes`)
- [x] Firestore rules deployed explicitly
- [x] Firestore indexes deployed explicitly
- [ ] Verify hosting rollback strategy (previous version fallback)
- [ ] Review performance history query costs at scale (10k+ records/user)
- [ ] Add pagination or query windowing strategy for long histories
- [ ] Document incident runbook for Moyasar outage

### Evidence
- Deploy output confirmed success:
  - Hosting release complete
  - Function update complete
  - Firestore rules/indexes release complete

---

## 5) Reliability & Edge Cases

### Checklist
- [ ] Payment failure UX: clear retry path from `success`/checkout flow
- [ ] Auth redirect races: verify quiz/deep-link paths are not hijacked by auth redirect
- [ ] Browser back/forward behavior validated across landing/login/dashboard/quiz
- [ ] Service worker update behavior tested after new deploy
- [ ] Offline test: simulate signal loss during quiz attempt

### Notes
- `public/sw.js` exists and is registered in `index.html`.
- Still validate runtime behavior on real mobile network.

---

## 6) Patch Log (Change Control)

| Patch ID | Date | Files | Why | Risk | Verification |
|---|---|---|---|---|---|
| P-001 | 2026-03-24 | `firebase.json` | Fix SPA refresh 404 via rewrites | P0 | Hosting deploy success |
| P-002 | 2026-03-24 | `src/app.js` | Hydrate premium status from Firestore on auth | P0 | Build + manual QA pending |
| P-003 | 2026-03-24 | `src/landing.js` | Lazy-load Spline to reduce load pressure | P1 | Build success |
| P-004 | 2026-03-24 | `functions/index.js`, `src/checkout.js` | Enforce amount/currency/ownership payment validation | P0 | Function deploy success |
| P-005 | 2026-03-24 | `firebase.json` | Add firestore rules/indexes config | P0 | Rules/indexes deploy success |

---

## 7) AI Suggestion Triage Template

Copy this section for every new AI recommendation before applying it:

### Suggestion Card
- Source AI:
- Claim:
- Affected files:
- Claimed severity: P0 / P1 / P2
- Potential conflict with current architecture:
- Decision: Accept / Reject / Defer
- Reason:
- Implemented by:
- Verification test:
- Final status:

---

## 8) Final Go/No-Go Gate

Launch is **GO** only if all items below are checked:

- [x] Security P0 items fixed in code
- [x] Security policies deployed (Firestore rules active)
- [x] Function deploy successful
- [x] Hosting deploy successful
- [ ] End-to-end payment test (test card) passes
- [ ] Premium persists after logout/login
- [ ] Deep-link refresh test passes (`/pricing`, `/dashboard`, `/quiz`)
- [ ] Mobile smoke test passes (scroll, load, no severe jank)
- [ ] Critical console errors absent in production

### Current Gate Status
**Conditional GO** (pending final manual QA checks above).

---

## 9) Quick Command Block

```powershell
# Build
npm run build

# Deploy app + backend
npx -y firebase-tools@latest deploy --only functions,hosting:smlepro

# Deploy security rules and indexes
npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes
```

---

## 10) 10-Minute Production Smoke Test (~5 steps)

Run on **production**: [https://smlepro.web.app](https://smlepro.web.app)

Record pass/fail and the browser (Chrome/Safari) + device in the notes column.

| Step | Action | Expected result | Pass? | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Direct / deep link** | Open `https://smlepro.web.app/pricing` | Pricing loads without 404 (SPA rewrites). | [ ] | |
| **1b** | **Refresh** | On `/pricing`, press browser **Refresh** | Same page reloads (no 404). | [ ] | |
| **2** | **Auth** | Sign in/up with a **new** test account | You reach the **Dashboard**; user shows **free** tier if that is your default UI. | [ ] | |
| **3** | **Checkout** | Pricing → **Upgrade** → Moyasar (**test** keys / test card) | Redirect to **success** page (or your defined return URL), no stuck spinner. | [ ] | |
| **4** | **Immediate premium** | Open **Dashboard** right after success | Premium / Pro state visible **without** manual hard-refresh if your success flow calls verify. | [ ] | |
| **5** | **Persistence** | **Log out**, then **log back in** | Account remains **Premium** (Firestore profile read path works). | [ ] | |

Optional **Step 6 — Mobile scroll**: On a phone, scroll through the landing hero; no scroll lock / “trapped thumb” on the 3D background.

---

## 11) Performance query note (history limit)

If you add Firestore `limit(N)` to performance history:

- With `orderBy("date", "asc")` + `limit(20)`, you load the **oldest** 20 sessions — usually **not** what you want for a dashboard “recent activity” view.
- For **most recent** 20, use `orderBy("date", "desc")` + `limit(20)` (and add/review a composite index in `firestore.indexes.json` if the Firebase console requests one).

---

## 12) Recurring web essentials checklist (pre-release)

Run before every meaningful deploy (especially if you changed pricing, auth, checkout, or rules).

| Category | Checkpoint | Pass? |
| :--- | :--- | :---: |
| **Trust** | Landing pricing snapshot matches `src/pricing.js` / `src/checkout.js` amounts (149 / 349 / 549 / 799 SAR) and matches `functions/index.js` `ALLOWED_AMOUNTS` (halalas). | [ ] |
| **Trust** | Legal links (Privacy / Terms / Refunds) visible on **Landing**, **Pricing**, **Checkout**, and **Success** (`/legal.html#…`). | [ ] |
| **Lifecycle** | Logout works; user lands on landing; no stale premium UI from `localStorage` confusion. | [ ] |
| **Lifecycle** | Premium survives **hard refresh** and **logout → login**. | [ ] |
| **Technical** | `npm run build` completes with **0 errors** (Tailwind/chunk *warnings* are OK if documented). | [ ] |
| **Technical** | Direct URL or refresh on `/pricing`, `/dashboard`, `/quiz` returns the app (no Hosting 404). | [ ] |
| **Mobile** | Landing hero scrolls smoothly; 3D does not trap touches. | [ ] |
| **Security** | `firebase.json` includes `firestore` block; `firestore.rules` deployed; client cannot write `isPremium` / payment fields. | [ ] |
| **Payments** | Test card path: success URL → verify function → dashboard shows Pro. | [ ] |

---

## 13) Competitor quick-pass (template)

Spend ~10 minutes per site; fill in real names and notes. Goal: spot **positioning and trust** gaps, not feature parity.

| Competitor | Landing hook | Pricing strategy | Notable gap vs us |
| :--- | :--- | :--- | :--- |
| *(e.g. Comp A)* | | | |
| *(e.g. Comp B)* | | | |
| **SMLE Pro** | Modern, fast, interactive prep | Tiered SAR (149–799) | *(your edge)* |

---

## 14) Optional: purchase notifications (e.g. Telegram)

Not required for launch. If you want “ping me when someone pays”:

1. Create a Telegram bot (BotFather) and a private channel or chat; note **chat id**.
2. Add a **callable or Firestore-triggered** Cloud Function on successful verification (after `isPremium` is set) that `fetch()`es the Telegram `sendMessage` API with a **bot token** stored in **Secret Manager** (never in client code).
3. Log failures only in Functions logs; do not block the user upgrade on notification failure.

Add this when support volume justifies it.

