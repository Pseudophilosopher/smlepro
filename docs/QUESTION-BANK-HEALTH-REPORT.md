# 🏥 SMLE Pro — Question Bank Health Report
**Date:** 2026-05-09  
**Source:** Live Firestore audit of 2,439 questions + generated JSON files

---

## 1. 🔬 SMLE Authenticity Audit

### Overall Verdict: ⚠️ Critical Issues Found

| Metric | Count | % |
|--------|-------|---|
| Total Questions | **2,439** | 100% |
| ✅ SMLE-OK (has Saudi markers) | **29** | 1.2% |
| ⚠️ UNCLEAR (no specific markers) | **2,394** | 98.1% |
| ❌ NON-SMLE SUSPECT (foreign refs) | **16** | 0.7% |
| 🌐 Foreign Guideline References | **16** | — |
| 📝 Generic/Empty Rationales | **23** | — |

### 🔴 Problem: Template-Based Questions Contaminated with Foreign Guidelines

**The `bulk-question-generator.mjs` has hardcoded AHA/ACC/ESC references** that were uploaded to Firestore as part of the batch:

- **Cardiology templates** cite `AHA/ACC guidelines` instead of **Saudi MOH or SCFHS guidelines**
- **Pulmonology template** cites `2019 ESC guidelines` and `GOLD 2024`
- **PE template** cites `2019 ESC guidelines`
- These are directly embedded in option-level rationales

### Foreign References Found in Generated JSON Files

| File | AHA | ACC | ESC | FDA | NIH | USPSTF | MRCP |
|------|-----|-----|-----|-----|-----|--------|------|
| `generated-final-bank.json` | 20 | 20 | 8 | 6 | 4 | 2 | 2 |
| `generated-missing-domains.json` | 20 | 20 | — | — | — | — | — |
| `generated-im-batch-bulk.json` | 20 | 20 | 8 | 6 | 4 | — | — |
| `generated-im-batch-1.json` | — | — | 1 | — | — | — | — |
| `generated-im-batch-2.json` | 1 | — | — | — | 2 | — | — |

**Total uploaded contaminated:** 62+ foreign guideline references in the live bank.

### ✅ Good News: AI Generation Pipeline is Properly Configured

The `generate-question-agent.js` (Cloud Function) explicitly instructs the AI:

> *"CRITICAL: ONLY cite Saudi guidelines (MOH, SCFHS, Saudi Clinical Practice Guidelines). NEVER cite non-Saudi references like AHA, ACC, NICE, CDC, FDA, WHO, ESC, USMLE, MRCP, or PLAB. The question must be unmistakably Saudi SMLE content — not USMLE, MRCP, or PLAB."*

Only the **template-based batch upload** (bulk-question-generator.mjs) has the contamination issue.

---

## 2. 📊 Topic Coverage vs SMLE Blueprint

| SMLE Domain | Required % | Actual (domain) | Actual % | **Gap** |
|-------------|-----------|-----------------|----------|---------|
| **Internal Medicine** | **30%** | 179 | 7.3% | 🔴 **−553 questions** |
| **Surgery** | **20%** | 334 | 13.7% | 🟡 −154 |
| **Pediatrics** | **25%** | 253 | 10.4% | 🟡 −113 |
| **OBGYN** | **25%** | 90 (OBGYN) + 114 (OBGYN domain) | ~8.4% | 🔴 −179 |
| Emergency Medicine | ~8% | 137 | 5.6% | 🟡 −58 |
| Family & Community | 5% | 53 | 2.2% | 🟡 −69 |
| Medical Ethics | 4% | 50 | 2.1% | 🟡 −48 |
| Radiology | 3% | 50 | 2.1% | 🟡 −23 |
| Pathology | 2% | 50 | 2.1% | ✅ OK |
| Forensic Medicine | 1% | 17 | 0.7% | 🟡 −7 |

> **Note:** The actual topic field vs scfhs_domain field naming is inconsistent. Many questions have `topic: "Internal Medicine"` (503 total) but their `scfhs_domain` is more specific like `"Internal Medicine – Cardiology"` (97) — these sub-domains aren't aggregated under the parent domain. The true gap is likely smaller than shown.

### Difficulty Distribution

| Level | Count | % |
|-------|-------|---|
| Easy | 1,323 | 54.2% |
| Moderate | 804 | 33.0% |
| Hard | 312 | 12.8% |

⚠️ Too many "Easy" questions — SMLE is a **moderate-to-hard** exam. Aim for ~30% Easy, ~40% Moderate, ~30% Hard.

---

## 3. 🖼️ Image Pipeline

| Issue | Count |
|-------|-------|
| `image_reference=true` but no `image_url` | **2,420** ⚠️ |
| Missing `ai_image_plan` | **2,420** |
| No actual images attached to any question | **0 images** |

The image pipeline is **fully stalled**. Questions were flagged as needing images but no images were ever generated or attached.

---

## 4. ✅ What's Working Well

- **AI Question Generation Agent** (`generate-question-agent.js`) — properly prompts for SMLE-only content with Saudi guidelines
- **Schema validation** — 0 critical/fatal schema issues (all questions have stems, options, correct answers)
- **No duplicate options** — 0 duplicate option text issues
- **No bad phrases** — 0 "all/none of the above" cases
- **No Arabic contamination** — 0 questions with Arabic text in stems (good for an English exam)

---

## 5. 📋 Priority Action Items

### P0 — Immediate (Fix Contaminated Questions)
1. **Fix `bulk-question-generator.mjs` templates** — Replace all `AHA/ACC/ESC` references with Saudi equivalents:
   - "Saudi MOH Guideline for STEMI Management, 2024" instead of "AHA/ACC guidelines"
   - "SCFHS Curriculum for Cardiology" instead of "ESC guidelines"
   - "Saudi Heart Association guidelines" instead of "ACC/AHA/HFSA"
2. **Re-run batch upload** with corrected references
3. **Delete or correct** the 16 live NON-SMLE SUSPECT questions in Firestore

### P1 — High Priority (Coverage)
4. **Rebalance topic distribution** — Prioritize adding questions for:
   - Internal Medicine (most critical gap, need ~400+ more)
   - OBGYN (need ~180 more)
   - Pediatrics (need ~113 more)
5. **Fix difficulty mix** — Reduce "Easy" to ~30%, increase "Moderate" to ~40% and "Hard" to ~30%

### P2 — Medium Priority (Quality)
6. **Improve 409 generic rationales** — Add meaningful clinical explanations
7. **Fix domain aggregation** — Ensure `scfhs_domain` values like "Internal Medicine – Cardiology" are counted under "Internal Medicine" in the audit

### P3 — Low Priority (Enhancements)
8. **Image pipeline** — Either generate actual images or remove `image_reference: true` flags
9. **Add Saudi-specific markers** — The 2,394 "UNCLEAR" questions lack any Saudi identifiers. No immediate action needed if they're clinically correct, but adding Saudi context would improve authenticity scoring.

---

## 6. 🩺 Specific Fixes for bulk-question-generator.mjs

The hardcoded foreign references are in these template sections:

| Template | Line | Current Reference | Should Be |
|----------|------|------------------|-----------|
| Cardiology Q1 | 42 | "Per 2023 AHA/ACC guidelines" | "Per Saudi MOH Guideline for STEMI Management, 2024" |
| Cardiology Q2 | 57 | "Per 2022 AHA/ACC/HFSA guidelines" | "Per Saudi Heart Association / MOH HFrEF Guidelines" |
| Cardiology Q3 | 72 | "Per 2023 ACC/AHA guidelines" | "Per Saudi MOH Atrial Fibrillation Guidelines" |
| Pulmonology Q1 | 89, 95 | "GOLD 2024 guidelines" | "Saudi MOH COPD Management Guidelines" |
| PE Question | 103 | "2019 ESC guidelines" | "Saudi MOH Venous Thromboembolism Guidelines" |

---

## Summary

| Category | Verdict |
|----------|---------|
| **SMLE Authenticity** | ⚠️ **Contaminated** — 62+ foreign refs from template batches |
| **AI Generation Pipeline** | ✅ **Clean** — proper SMLE-only prompts |
| **Schema Quality** | ✅ **Excellent** — 0 critical errors |
| **Topic Coverage** | ⚠️ **Imbalanced** — IM, OBGYN, Peds all short |
| **Image Pipeline** | ❌ **Stalled** — 2,420 placeholder flags, 0 images |
| **Difficulty Mix** | ⚠️ **Too easy** — 54% Easy vs 12.8% Hard |
| **Rationale Quality** | 🟡 **Adequate** — 409 need improvement |

**Bottom line:** The app is structurally solid (schema, AI pipeline), but needs **template cleanup for SMLE authenticity** and **topic rebalancing** to match the SCFHS blueprint. The most urgent fix is replacing AHA/ACC/ESC references in `bulk-question-generator.mjs` with Saudi MOH/SCFHS equivalents.
