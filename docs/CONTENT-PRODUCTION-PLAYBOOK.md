# SMLE Pro — Content Production Playbook

> Post-audit action plan. Your data layer is clean. This doc covers: dashboard specialty filters, content generation prompts, and weekly execution.

---

## Part 1: Fix Dashboard Specialty Filters (Do This First)

**Problem:** `src/topic-drill-buckets.js` only maps 3 topics. Your questions use raw topics like `"Internal Medicine"`, `"Surgery"`, `"Pediatrics"` — so clicking Specialty Drill cards for Cardiology/Pulmonology returns zero questions.

**Fix:** Replace `src/topic-drill-buckets.js` with this expanded map:

```javascript
export const DRILL_TOPIC_SYNONYMS = {
  'Internal Medicine': ['Internal Medicine'],
  Cardiology: ['Cardiology', 'Internal Medicine – Cardiology', 'Internal Medicine - Cardiology'],
  Pulmonology: ['Pulmonology', 'Internal Medicine – Pulmonology', 'Internal Medicine - Pulmonology', 'Pulmonary'],
  Gastroenterology: ['Gastroenterology', 'Internal Medicine – Gastroenterology', 'Surgery – Gastroenterology'],
  Nephrology: ['Nephrology', 'Renal Medicine', 'Internal Medicine – Nephrology', 'Internal Medicine – Renal Medicine'],
  Endocrinology: ['Endocrinology', 'Internal Medicine – Endocrinology'],
  Neurology: ['Neurology', 'Internal Medicine – Neurology'],
  Psychiatry: ['Psychiatry', 'Internal Medicine – Psychiatry'],
  Dermatology: ['Dermatology', 'Internal Medicine – Dermatology'],
  Hematology: ['Hematology', 'Internal Medicine – Hematology'],
  Rheumatology: ['Rheumatology', 'Internal Medicine – Rheumatology'],
  'Infectious Diseases': ['Infectious Diseases', 'Internal Medicine – Infectious Diseases'],
  Immunology: ['Immunology', 'Internal Medicine – Immunology'],
  Pharmacology: ['Pharmacology', 'Internal Medicine – Pharmacology'],
  Surgery: ['Surgery'],
  Orthopedics: ['Orthopedics', 'Surgery – Orthopedics'],
  Ophthalmology: ['Ophthalmology', 'Surgery – Ophthalmology'],
  ENT: ['ENT', 'Surgery – ENT'],
  Urology: ['Urology', 'Surgery – Urology'],
  Pediatrics: ['Pediatrics'],
  OBGYN: ['OBGYN', 'Obstetrics & Gynaecology'],
  'Emergency Medicine': ['Emergency Medicine', 'Emergency', 'Emergency Medicine – Critical Care', 'Critical Care', 'Toxicology', 'Emergency Medicine – Toxicology'],
  'Family Medicine': ['Family Medicine', 'Public Health', 'Family & Community Medicine'],
  Ethics: ['Ethics', 'Medical Ethics & Professionalism'],
};
```

Also update `src/dashboard.js` — search for the `topics` array inside `renderCategoryFilters` and ensure it includes all specialties above.

---

## Part 2: Content Generation Prompts (Production-Ready)

### Prompt A: Internal Medicine Batch Generator

Use with Kimi K2.6, Claude, or any LLM. Output is JSON-ready for `upload-questions.mjs`.

```
You are a senior Saudi medical educator writing original SMLE-style multiple-choice questions.

TASK: Generate 25 Internal Medicine questions as a JSON array.

SCHEMA per question:
{
  "question": "Clinical vignette (50-80 words). Include age, gender, key symptoms, relevant labs/imaging.",
  "topic": "Internal Medicine",
  "scfhs_domain": "Internal Medicine – [Subspecialty]",
  "difficulty": "Hard",
  "year": "2024-2025",
  "image_reference": false,
  "options": [
    {"text": "...", "correct": false, "rationale": "Why wrong + what it actually describes"},
    {"text": "...", "correct": true,  "rationale": "Why correct + guideline reference"},
    {"text": "...", "correct": false, "rationale": "Why wrong + common misconception"},
    {"text": "...", "correct": false, "rationale": "Why wrong + what it actually describes"}
  ],
  "correct_answer": "B",
  "rationale": "1-2 sentence teaching summary",
  "tags": ["internal-medicine", "[subspecialty]", "hard", "2024-2025"]
}

SUBSPECIALTY DISTRIBUTION (match SMLE IM blueprint):
- Cardiology: 6 questions (MI, HF, arrhythmias, valvular, hypertension)
- Pulmonology: 5 questions (COPD, asthma, pneumonia, TB, PE, ILD)
- Gastroenterology: 5 questions (liver disease, IBD, pancreatitis, GI bleeding, hepatitis)
- Nephrology: 4 questions (AKI, CKD, electrolytes, glomerulonephritis, nephrotic)
- Endocrinology: 3 questions (diabetes, thyroid, adrenal, pituitary)
- Hematology: 1 question (anemia, coagulopathy)
- Rheumatology: 1 question (SLE, RA, vasculitis)

RULES:
1. ALL content must be ORIGINAL. Do not copy from UWorld, AMBOSS, ExamCure, or textbooks.
2. Distractors must be PLAUSIBLE — conditions a student might confuse with the correct answer.
3. Rationales must TEACH: explain WHY the distractor is wrong and WHAT condition it actually fits.
4. Use GENERIC drug names only (metformin, not Glucophage).
5. Cite guidelines where relevant: "Per 2023 AHA/ACC...", "Per KDIGO 2022..."
6. Difficulty must be HARD: multi-step reasoning, subtle findings, or guideline nuance.
7. Vignettes must be CLINICALLY REALISTIC for Saudi practice.

OUTPUT: Valid JSON array only. No markdown, no prose.
```

### Prompt B: Rationale Rewrite (Fix 410 Generic Rationales)

Feed this 20 questions at a time from `audit.json → issues.rationales`.

```
You are a medical editor improving distractor rationales for a Saudi medical exam question bank.

TASK: For each question below, rewrite the per-option rationales using this template:

CORRECT option:
"[Drug/answer] is first-line for [condition] because [mechanism + guideline reference]. Key pearl: [clinical tip]."

INCORRECT option:
"[Option] is wrong because [why it doesn't fit this vignette]. It is actually used for / characteristic of [correct condition for this option]."

RULES:
- Never write "This is incorrect" or "This is wrong" alone. Always explain WHY.
- Always explain what the distractor ACTUALLY describes (teach, don't just correct).
- Reference current guidelines when possible.
- Keep each rationale to 1-2 sentences.
- Use generic drug names.

QUESTIONS TO IMPROVE:
[PASTE JSON ARRAY OF 20 QUESTIONS HERE]

OUTPUT FORMAT:
Return ONLY a JSON array with the same structure, but with improved rationales.
```

### Prompt C: Difficulty Rebalancer

Feed this the list of Easy questions from the audit.

```
You are an exam psychometrician reviewing a medical question bank.

TASK: Review the questions below and reclassify difficulty.

CRITERIA FOR "Hard":
- Requires multi-step reasoning (diagnosis → management → complication)
- Involves atypical presentation or rare complication
- Tests subtle guideline difference (e.g., which drug is first-line in specific subpopulation)
- Requires integration of 3+ clinical findings

CRITERIA FOR "Moderate":
- Standard presentation but requires 2-step reasoning
- Common condition with one atypical feature
- Management question with plausible distractors

CRITERIA FOR "Easy":
- Classic presentation, single-step recall
- First-line treatment for common condition
- Recognizable buzzword association

TASK:
For each question, output:
| ID | Current | Suggested | Reason |

Only reclassify if you are confident. It's better to under-reclassify than mislead students.

QUESTIONS:
[PASTE LIST HERE]
```

---

## Part 3: Weekly Execution Plan

| Week | Daily Task | Output | Cumulative Total |
|------|-----------|--------|-----------------|
| 1 | Generate 50 IM questions (2 batches × 25) | 350 IM questions | 2,026 total |
| 2 | Generate 50 Surgery/OBGYN/Emergency | 350 mixed questions | 2,376 total |
| 3 | Rewrite 50 rationales/day | 350 improved rationales | 410 → 60 remaining |
| 4 | Generate Radiology/Pathology + retag difficulty | 100 niche + 200 retagged | 2,500+ total |

**IM Gap Closure Math:**
- Current IM: 179 questions
- Target IM: ~503 questions (30% of 1,676, or scale to 2,500 total → 750 IM)
- Need: 324–571 new IM questions
- At 50/day: 7–12 days of focused generation

---

## Part 4: Image Re-Attachment Strategy (Post-Nuke)

Since all images were cleared, selectively re-enable `image_reference=true` ONLY for:

| Type | Example Stems | Priority |
|------|--------------|----------|
| Dermatology rash | "sandpaper rash", "herald patch", "malar rash" | 🔴 Essential |
| Radiology/X-ray | "chest X-ray shows", "fracture on X-ray", "CT head" | 🔴 Essential |
| ECG | "ST elevation", "irregularly irregular", "delta wave" | 🔴 Essential |
| Physical exam photos | "clubbing", "koilonychia", "thyroid eye disease" | 🟡 Good |
| Fundus/eye | "leukocoria", "papilledema", "cataract" | 🟡 Good |
| Histology/pathology | "H&E shows", "electron microscopy" | ⚪ Optional |

Command after selecting stems:
```bash
node scripts/attach-images-improved.mjs --dry-run --limit=50
# Review output, then:
node scripts/attach-images-improved.mjs --limit=50
```

---

## Part 5: Quality Checklist Before Each Upload

Run before every batch upload:
```bash
node scripts/audit-question-bank.mjs
```

Ensure:
- [ ] 0 critical issues
- [ ] < 50 high issues
- [ ] No duplicate options within questions
- [ ] Difficulty tags present
- [ ] Tags array not empty
- [ ] All `image_reference=true` have `ai_image_plan` or manual review

---

## Summary

| Dimension | Current | Target | How |
|-----------|---------|--------|-----|
| Data integrity | 9/10 | 10/10 | Scripts already fixed |
| Coverage | 4/10 | 8/10 | Generate 600+ questions |
| Rationale quality | 6/10 | 9/10 | Rewrite 410 rationales |
| Difficulty balance | 5/10 | 7/10 | Retag 300 questions |
| Images | 0/10 | 6/10 | Selective re-attachment |
| **Overall** | **6.2/10** | **8/10** | **4 weeks focused work** |

You have all the tools and prompts you need. The only remaining bottleneck is execution speed.
