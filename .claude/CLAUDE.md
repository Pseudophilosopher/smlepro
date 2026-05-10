# SMLE Pro - Medical Education Platform

## Critical: How to Work With Me
I am a medical student, not a professional coder. I "vibe code" — I describe what I want and the AI builds it. Previous AI tools (Cline) kept missing my intention, giving terrible output, and wasting hours. To prevent that:

1. **Before writing ANY code, restate what you think I want and ask 2-3 clarifying questions.** Never assume you understand my intent from a vague description.
2. **Show a short plan first** — outline the files you'll change, what each change does, and ask "does this match what you want?"
3. **Keep changes small and focused** — one feature at a time. No massive refactors.
4. **Explain what you're doing in simple terms** — no jargon overload. If you mention a concept, give a 1-line plain-English explanation.
5. **If a task is complex, suggest breaking it into smaller steps** and let me approve each one.
6. **Before deploying**, confirm with me. Never push to production without asking.

## Commands

```bash
# Dev
npm run dev              # start dev server with Vite

# Build
npm run build            # build for production and generate sitemap

# Preview
npm run preview          # preview production build

# Deploy
npx firebase-tools@latest deploy --only functions,hosting:smlepro
npx firebase-tools@latest deploy --only firestore:rules,firestore:indexes

# Scripts
npm run attach-images    # attach images to questions
npm run backup           # backup questions to Firestore
npm run questions:duplicates # find duplicate questions
npm run audit            # audit question bank
npm run deploy           # full deploy
```

## Architecture
- `src/` — Vanilla JS ES6 modules (no React/Vue)
- `functions/` — Firebase Cloud Functions (CommonJS)
- `public/` — Static assets, HTML pages
- `scripts/` — Node.js maintenance scripts
- Firebase v10 modular syntax on client, v9 compat in functions

## Coding Conventions
- **Vanilla JS only** — pure DOM manipulation, no frameworks
- **Tailwind CSS** with glassmorphism (`backdrop-blur`, `border-white/20`)
- **RTL/Arabic** — use logical properties (`ms-`, `pe-`, `start`, `end`), Tajawal font, `dir="auto"`
- **Firebase v10** — `import { getFirestore } from 'firebase/firestore'` (never v9 compat on client)
- Cloud Functions use `require()`, client code uses `import`
- Keep functions small, modular, well-named

## Content Generation (AI for Question Bank)
- Use DeepSeek via `generateAQuestion` cloud function
- Questions: 4 options, 1 correct, detailed rationale with Saudi guideline references
- Validate JSON schema, auto-retry if reviewer score < 7/10
- Never generate >5 questions per call

## Error Handling
- Wrap Firebase calls in try/catch with user-friendly messages
- Never expose raw Firebase errors to users
- Log to console in dev, toast notifications in production

## Security
- `payments` collection: `allow read, write: if false;` in Firestore rules
- Client cannot write `isPremium`, `moyasarPaymentId`, `upgradedAt`
- Cloud Function validates: auth UID, payment status=paid, amount in allowed set, currency=SAR, ownership match
- Never expose API keys client-side; use Firebase Secret Manager

## Domain Knowledge
- SMLE: Saudi Medical Licensing Examination
- Target users: Saudi medical students preparing for SMLE
- Payment tiers: 149/349/549/799 SAR (stored as halala: 14900/34900/54900/79900)

## Performance (Weak Laptop)
- Keep initial bundle under 500KB gzipped
- Lazy-load heavy assets (Spline 3D, images)
- Use Vite HMR for instant preview (no build needed in dev)
- `npm run build` only before deploy

## Don'ts
- Don't modify production data directly
- Don't skip image attachment validation
- Don't suggest React, Vue, or framework-specific code
- Don't expose Firebase error details to users
