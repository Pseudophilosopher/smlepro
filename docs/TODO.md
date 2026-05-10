# SMLE Pro — TODO & Change Log

## ✅ Changes in this session (inspired by 12 open-source projects)

### 1. `functions/ai-provider.js` — NEW (ZeroClaw-inspired provider abstraction)
- Pluggable AI provider interface: add a new provider = one file
- Supports: DeepSeek, OpenAI (Gemini stub ready)
- 2-hour timeout for multi-agent pipelines
- Clean error handling, JSON mode support

### 2. `functions/generate-question-agent.js` — NEW (agency-agents + deer-flow)
- 3-agent pipeline: Writer → Reviewer → Finalizer
- Writer = Senior SCFHS Consultant (generates SMLE-format Qs)
- Reviewer = Chief Medical Editor (scores 0-10, flags issues)
- Finalizer = QA specialist (validates JSON schema)
- Auto-retry if score < 7
- Clinical scenario questions with Saudi guideline references

### 3. `functions/index.js` — MODIFIED
- Added `generateAQuestion` callable function (admin-only, DeepSeek)
- Added `checkAiProvider` smoke test function
- Imports `getProvider` and `generateQuestion`

### 4. `src/topic-graph.js` — NEW (LeanKG-inspired knowledge graph)
- Specialty relationship graph (e.g., Gastro → Internal Medicine)
- `getStudyRecommendations()` — "friend-of-friend" topic suggestions
- Zero-dependency Canvas radar chart (performance visualization)
- "Study Next" HTML card generator

### 5. `vite.config.js` — MODIFIED
- Disabled sourcemaps in dev mode to save CPU/weak laptop

### 6. `.clinerules` — UPDATED
- Added `climate.md` note about deployment
- Reference to `ai-provider.js`

## 🔑 Secrets Set
- `DEEPSEEK_API_KEY` — stored in Firebase Secret Manager

## 📋 Deploy Checklist
- [ ] Run `firebase deploy --only functions` to deploy the new functions
- [ ] Run `firebase deploy --only hosting` for the updated Vite config
- [ ] Test: call `checkAiProvider` from admin panel
- [ ] Test: generate a question via `generateAQuestion`
- [ ] Verify radar chart renders on dashboard
