# Improved Audit Prompts for SMLE Pro Question Bank

> These prompts are designed to work *after* running the automated audit script (`scripts/audit-question-bank.mjs`). They use the audit output as context, making them grounded in real data rather than asking the AI to hallucinate findings.

---

## Prompt 1: Content Quality — Action Plan from Audit Data

**Input required:** Paste the top 20 entries from `audit.json → issues.schema` and `audit.json → issues.rationales`

```
You are a medical content strategist reviewing a question bank audit report.

AUDIT CONTEXT:
- 1,676 total questions
- 1,677 schema issues (99.9% are empty tags — easy fix)
- 410 questions with generic or missing rationales
- 0 duplicate answer options within questions (clean)
- 0 "All/None of the above" phrases found (clean)
- 427 image integrity issues (mostly image_reference=true but missing image_url)

TASK:
For each question flagged below, provide ONE specific rewrite instruction that a medical writer can execute in 2 minutes. Do not write the full rewrite — write the instruction.

FORMAT per item:
- Question ID: [id]
- Issue: [one-line diagnosis]
- Fix instruction: [specific, actionable direction for a writer]
- Priority: [Must fix before launch / Fix in next sprint / Nice to have]

CONSTRAINTS:
- If the issue is "empty tags", suggest 3-5 relevant tags based on the question topic
- If the issue is "generic rationale", explain what concept the rationale should teach
- If the issue is "missing image_url", note whether the question truly needs an image or if image_reference should be set to false
- Never suggest adding "All of the above" or "None of the above"
- Use generic drug names, not brand names

---
[PASTE UP TO 20 FLAGGED QUESTIONS HERE]
```

---

## Prompt 2: Copyright & Legal Risk — Policy Review (Not Per-Question Scan)

**Input required:** Your `upload-questions.mjs` source file list and 3-5 sample questions

```
You are a healthcare legal compliance advisor reviewing a medical education platform's content sourcing policy.

PLATFORM CONTEXT:
- SMLE Pro is a Saudi medical licensing exam preparation platform
- Question bank: 1,676 questions
- Content pipeline: Mixed sources including Telegram Desktop batch exports, JSON file imports, and AI-generated rationales
- Data model has NO provenance/source field on questions
- Images are sourced via Wikimedia with attribution tracking

TASK:
1. Review the content sourcing workflow described below
2. Identify the HIGHEST-RISK gap in the current process
3. Recommend 3 concrete policy changes that can be implemented in code
4. Draft a one-paragraph content origin disclaimer for the legal page

CURRENT PIPELINE:
[PASTE THE SOURCE FILE LIST FROM upload-questions.mjs HERE]

SAMPLE QUESTIONS:
[PASTE 3-5 REPRESENTATIVE QUESTIONS HERE]

OUTPUT FORMAT:
## Risk Assessment
- [HIGHEST RISK]: [specific issue]
- [MEDIUM RISK]: [specific issue]
- [LOW RISK]: [specific issue]

## Policy Changes (Code-Implementable)
1. [Change]: [What to add to the data model or upload script]
2. [Change]: [What to add to the data model or upload script]
3. [Change]: [What to add to the data model or upload script]

## Draft Disclaimer
"[One paragraph for legal.html]"
```

---

## Prompt 3: Medical Accuracy — Triage for Expert Review

**Input required:** Paste 15-20 questions flagged with "generic-rationale" or "generic-option-rationale" from the audit

```
You are a medical educator preparing questions for physician expert review.

TASK:
For each question below, determine if it needs EXPERT MEDICAL REVIEW or if the issue is just poor writing.

Use these criteria:
REVIEW REQUIRED if:
- Mentions a drug dosage
- References a specific guideline year (e.g., "2023 AHA")
- Describes a rare condition or atypical presentation
- Involves pediatric dosing or contraindications
- References Saudi-specific practice (vaccines, endemic diseases)

WRITING FIX ONLY if:
- Rationale is too short but factually obvious
- Grammar or formatting issue
- Missing "why others are wrong" explanation

FORMAT:
| Question ID | Topic | Verdict | Reason |
|-------------|-------|---------|--------|

After the table, list:
1. Any questions where you suspect FACTUAL INACCURACY (flag with [FACT-CHECK NEEDED])
2. Common patterns in the rationales that a writer should avoid
3. A 5-point checklist for the medical reviewer to use

---
[PASTE 15-20 FLAGGED QUESTIONS HERE]
```

---

## Prompt 4: Question Bank Technical & Data Integrity — Automated Report

**DO NOT use as a prompt. Run the script instead:**

```bash
node scripts/audit-question-bank.mjs
```

This script already validates:
- ✅ Schema completeness (required fields, option counts, correct answer alignment)
- ✅ Duplicate options within questions
- ✅ "All/None of the above" detection
- ✅ Rationale quality scoring
- ✅ Image integrity (orphan URLs, missing plans)
- ✅ SCFHS blueprint coverage gaps
- ✅ Difficulty and year distribution

**Use this prompt only for interpreting the results:**

```
You are a Firebase architect reviewing a question bank audit report.

AUDIT SUMMARY:
- Total: 1,676 questions
- Critical issues: 0
- High issues: 260 (mostly missing image URLs)
- Schema issues: 1,677 (1,676 are empty tags arrays)
- Missing domains: Radiology (0), Pathology (0), Forensic Medicine (0)
- Internal Medicine underrepresented: 10.7% vs 30% target
- Difficulty skewed: 62.9% Easy, 31.5% Moderate, 5.6% Hard

TASK:
1. Rank the top 3 data structure changes by impact/effort ratio
2. For each, write the Firestore migration strategy (batch update vs. re-upload)
3. Recommend whether to add a `provenance` field retroactively or only for new questions
4. Suggest a tagging taxonomy based on the current 1,676 empty tags arrays

OUTPUT:
## Priority 1: [Change]
- Impact: [High/Medium/Low]
- Effort: [hours]
- Migration: [strategy]
- Code snippet: [Firestore batch update or schema change]

## Priority 2: [Change]
...

## Priority 3: [Change]
...
```

---

## Prompt 5: UX & Engagement — Heuristic Review (Limited Scope)

**Input required:** Screenshot or HTML of one quiz question card + the audit coverage data

```
You are a UX researcher reviewing a medical quiz interface for Saudi medical students.

AUDIT CONTEXT:
- 1,676 questions across 22 topics
- 427 questions have image_reference=true but many lack actual images
- Difficulty is heavily skewed Easy (62.9%)
- Missing entire specialties: Radiology, Pathology, Forensic Medicine

TASK:
Evaluate the following quiz UI against these medical-student-specific heuristics:

1. TRUST: Does the interface signal medical credibility? (rationale quality, source citations)
2. EFFICIENCY: Can a student complete a 10-question drill in under 8 minutes?
3. FEEDBACK: Does incorrect feedback teach or just correct?
4. PROGRESS: Is there visible mastery tracking by SCFHS domain?
5. ANXIETY: Does the UI avoid ambiguity in high-stakes medical content?

For each heuristic, rate: PASS / NEEDS WORK / FAIL
Provide ONE specific recommendation per NEEDS WORK or FAIL.

[PASTE UI CODE OR DESCRIBE INTERFACE HERE]
```

---

## How to Use These Prompts (Revised Workflow)

| Step | Action | Tool |
|------|--------|------|
| 1 | Run automated audit | `node scripts/audit-question-bank.mjs` |
| 2 | Feed audit output → Prompt 1 (Content Quality) | AI assistant |
| 3 | Feed source pipeline → Prompt 2 (Copyright) | AI assistant |
| 4 | Feed flagged questions → Prompt 3 (Medical Accuracy) | AI assistant + human reviewer |
| 5 | Feed audit summary → Prompt 4 (Technical) | AI assistant |
| 6 | Feed UI + audit context → Prompt 5 (UX) | AI assistant |

---

## Key Differences from Original Prompts

| Original Problem | How These Fix It |
|-----------------|------------------|
| Asked AI to "check every question" | AI works on pre-filtered audit output (max 20 items) |
| Asked AI to verify medical accuracy | AI triages for human expert review instead |
| Asked AI to verify image file paths | Script validates image integrity; AI interprets results |
| Asked AI to verify copyright per-question | AI reviews content policy and pipeline instead |
| Asked AI to check Firestore scalability | Script provides data; AI recommends migrations |
| Monolithic, 500+ token prompts | Modular, context-fed prompts with explicit inputs |

---

## Appendices

### A. Quick Reference: Audit Output Structure

```
audit.json
├── summary
│   ├── totalQuestions
│   ├── criticalIssues
│   ├── highIssues
│   └── ...
├── distributions
│   ├── topic[]
│   ├── domain[]
│   ├── difficulty[]
│   └── year[]
├── coverage
│   ├── issues[]        # Underrepresented domains
│   └── unmappedTopics[]
└── issues
    ├── schema[]        # Schema validation failures
    ├── duplicateOptions[]
    ├── badOptions[]
    ├── rationales[]    # Generic/short rationales
    └── images[]        # Image integrity issues
```

### B. Commands to Generate Prompt Inputs

```bash
# Top 20 schema issues for Prompt 1
node -e "const r=require('./scripts/backups/audit-*.json'); console.log(JSON.stringify(r.issues.schema.slice(0,20),null,2))"

# Top 20 rationale issues for Prompt 1 & 3
node -e "const r=require('./scripts/backups/audit-*.json'); console.log(JSON.stringify(r.issues.rationales.slice(0,20),null,2))"

# Coverage summary for Prompt 4
node -e "const r=require('./scripts/backups/audit-*.json'); console.log(JSON.stringify(r.coverage.issues,null,2))"

# Topic distribution for Prompt 5
node -e "const r=require('./scripts/backups/audit-*.json'); r.distributions.topic.slice(0,10).forEach(([t,c])=>console.log(t+': '+c))"
```
