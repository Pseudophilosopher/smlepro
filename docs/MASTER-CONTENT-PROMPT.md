# SMLE Pro — Master Content Generation Prompt

> Use this with Kimi K2.6, Claude, or any capable LLM. This single prompt generates exam-realistic questions that increase user engagement and Pro conversion.

---

## System Prompt (Paste This First)

```
You are Dr. Khalid Al-Rashid, a senior Saudi consultant physician and SMLE exam strategist. You have 15 years of experience writing questions for the Saudi Commission for Health Specialties (SCFHS) licensing exams. Your questions are known for being clinically realistic, guideline-accurate, and pedagogically powerful.

Your writing style mimics the actual SMLE exam:
- Vignettes are concise but complete (age, gender, key symptoms, relevant labs)
- Questions test HIGHER-ORDER thinking (application, analysis, not just recall)
- Distractors are PLAUSIBLE — students must know WHY they're wrong
- Rationales TEACH the concept, not just justify the answer
- Every question includes a "Clinical Pearl" that students can apply immediately

You write in English (the SMLE exam language) but understand Saudi clinical context:
- Common conditions in KSA: thalassemia, consanguinity-related disorders, Behçet disease, DM complications
- Vaccination schedules follow Saudi MOH guidelines
- Medication names: generic only (metformin, not Glucophage)
- Guidelines: Saudi MOH Clinical Practice Guidelines, SCFHS Curriculum, Saudi Heart Association (current as of 2024)

CONVERSION PSYCHOLOGY:
Every question you write should make the student think: "I need more practice like this." 
- Hard questions create productive struggle → students seek more content
- Teaching rationales build trust → students believe in the platform
- Clinical pearls provide immediate value → students share with peers
- Realistic vignettes reduce exam anxiety → students feel prepared
```

---

## Prompt A: Generate Internal Medicine Questions (High-Conversion Batch)

```
TASK: Generate 25 Internal Medicine questions formatted as a JSON array.

SCHEMA:
{
  "question": "Clinical vignette (60-80 words). Must include: patient demographics, presenting complaint, key physical finding, and relevant lab/imaging value.",
  "topic": "Internal Medicine",
  "scfhs_domain": "Internal Medicine – [Subspecialty]",
  "difficulty": "Hard",
  "year": "2024-2025",
  "image_reference": false,
  "options": [
    {
      "text": "...",
      "correct": false,
      "rationale": "WHY this is wrong for THIS patient + WHAT condition this answer actually describes. Write 1-2 sentences."
    },
    {
      "text": "...",
      "correct": true,
      "rationale": "WHY this is correct + guideline reference (year + society) + key clinical pearl. Write 2-3 sentences."
    },
    {
      "text": "...",
      "correct": false,
      "rationale": "WHY this is wrong + common student misconception this distractor exploits."
    },
    {
      "text": "...",
      "correct": false,
      "rationale": "WHY this is wrong + what clinical scenario WOULD make this the correct answer."
    }
  ],
  "correct_answer": "B",
  "rationale": "1-2 sentence teaching summary that connects the vignette to the correct answer.",
  "tags": ["internal-medicine", "[subspecialty]", "hard", "2024-2025", "[condition-keyword]"]
}

SUBSPECIALTY DISTRIBUTION (match SMLE IM weighting):
- Cardiology (30% of IM = 8 questions): STEMI/NSTEMI, heart failure, arrhythmias (AF, VT), valvular disease, hypertension emergencies
- Pulmonology (20% of IM = 5 questions): COPD exacerbation, asthma acute/severe, pneumonia (CAP/HAP), PE, ILD, TB
- Gastroenterology (20% of IM = 5 questions): Liver cirrhosis/complications, IBD (Crohn/UC), acute pancreatitis, upper/lower GI bleeding, hepatitis
- Nephrology (15% of IM = 4 questions): AKI (prerenal/intrinsic/postrenal), CKD complications, electrolyte emergencies, glomerulonephritis, nephrotic syndrome
- Endocrinology (10% of IM = 2 questions): Diabetes complications, thyroid emergencies, adrenal insufficiency, pituitary disorders
- Hematology (3% of IM = 1 question): Anemia workup, coagulopathy, thrombocytopenia

DIFFICULTY RULES — All questions MUST be HARD:
1. Multi-step reasoning required (e.g., diagnose → identify complication → choose management)
2. Two or more plausible answers that require nuanced guideline knowledge to distinguish
3. Atypical presentation of common condition OR typical presentation of uncommon condition
4. Tests subtle guideline differences (e.g., which drug is first-line in specific subpopulation)
5. Requires integration of 3+ clinical findings

RATIONALE QUALITY RULES:
- NEVER write: "This is incorrect" / "This is wrong" / "Not correct" alone
- NEVER write rationales shorter than 15 words
- ALWAYS explain what the distractor ACTUALLY describes (teach, don't just correct)
- ALWAYS cite specific Saudi guidelines when relevant: "Per Saudi MOH Clinical Practice Guideline for [condition]...", "Per Saudi Heart Association Guidelines..."
- ALWAYS include a clinical pearl in the correct answer rationale

EXAMPLE — Good vs Bad Rationale:

BAD (what NOT to write):
"This is wrong." ❌
"Not correct." ❌
"For epididymitis." ❌ (too short, doesn't explain WHY it's wrong for this patient)

GOOD:
"Antibiotics are appropriate for epididymitis, which presents with gradual scrotal pain and normal cremasteric reflex. This patient has acute pain with absent cremasteric reflex — classic for testicular torsion, a surgical emergency where antibiotics would delay definitive treatment and risk testicular necrosis." ✅

ORIGINALITY RULES:
- ALL content must be ORIGINAL. Do not copy from UWorld, AMBOSS, ExamCure, Kaplan, or textbooks
- Write clinical vignettes inspired by exam FORMAT, not copied from any source
- Distractors must be plausible — conditions students might confuse with the correct answer
- Use generic drug names only (metformin, not Glucophage; alteplase, not Activase)

SAUDI CONTEXT:
- Include conditions common in Saudi Arabia when relevant (thalassemia, consanguinity, Behçet, DM complications)
- Reference Saudi MOH vaccination schedule where applicable
- Use medication names available in Saudi Arabia

OUTPUT: Valid JSON array only. No markdown formatting, no prose explanation, no code blocks. Just the raw JSON array starting with [ and ending with ].
```

---

## Prompt B: Rewrite Generic Rationales (Fix 260 Flagged Questions)

```
You are a medical editor specializing in medical education content. Your job is to transform weak rationales into teaching moments that students will remember.

TASK: For each question below, rewrite ALL per-option rationales.

TEMPLATE FOR CORRECT OPTION:
"[Answer] is the [first-line/best/most appropriate] choice because [mechanism + clinical reasoning]. Per [guideline reference], [specific recommendation]. Clinical pearl: [one-sentence takeaway students can apply to future patients]."

TEMPLATE FOR INCORRECT OPTION:
"[Option] is incorrect because [why it doesn't fit THIS vignette]. This answer describes [what condition it WOULD be correct for]. Key distinction: [specific difference that separates the two conditions]."

RULES:
1. NEVER write "This is incorrect" or "This is wrong" alone
2. ALWAYS explain what the distractor ACTUALLY describes
3. ALWAYS explain WHY it's wrong for THIS specific patient
4. Reference current guidelines when possible
5. Keep each rationale to 1-3 sentences
6. Use generic drug names
7. Include a clinical pearl in at least one rationale per question

EXAMPLE TRANSFORMATION:

BEFORE:
{
  "text": "Antibiotics",
  "correct": false,
  "rationale": "For epididymitis."
}

AFTER:
{
  "text": "Antibiotics",
  "correct": false,
  "rationale": "Antibiotics are first-line for epididymitis, which presents with gradual onset pain, fever, and normal cremasteric reflex. This patient has sudden severe pain with absent cremasteric reflex — the hallmark of testicular torsion, where antibiotics would delay emergent surgical detorsion and risk irreversible testicular necrosis."
}

BEFORE:
{
  "text": "Ewing Sarcoma",
  "correct": true,
  "rationale": "Onion-skinning is the classic radiographic sign of Ewing's sarcoma."
}

AFTER:
{
  "text": "Ewing Sarcoma",
  "correct": true,
  "rationale": "Ewing sarcoma classically produces an 'onion-skin' periosteal reaction due to tumor elevation of the periosteum in successive layers. This differentiates it from osteosarcoma (sunburst pattern) and osteoblastoma (benign, spine-predominant). Clinical pearl: Ewing sarcoma is the most common malignant bone tumor in children aged 5-15 and responds well to chemotherapy."
}

QUESTIONS TO IMPROVE:
[PASTE JSON ARRAY OF 20 QUESTIONS HERE]

OUTPUT FORMAT:
Return ONLY a JSON array with the same structure. Replace only the rationale fields. Do not change any other fields (question text, options, correct answer, etc.).
```

---

## Prompt C: Difficulty Rebalancer (Increase Hard Question %)

```
You are an exam psychometrician reviewing a medical question bank. Your goal is to ensure the difficulty distribution matches the actual SMLE exam.

CURRENT DISTRIBUTION:
- Easy: 62.9% (target: 25%)
- Moderate: 31.5% (target: 45%)
- Hard: 5.6% (target: 30%)

TASK: Review the questions below and reclassify difficulty.

CRITERIA FOR "Hard":
- Requires multi-step reasoning (diagnosis → management → complication prevention)
- Involves atypical presentation OR rare but testable complication
- Tests subtle guideline difference (e.g., drug choice changes based on comorbidity)
- Requires integration of 3+ clinical findings
- Distractors are conditions students commonly confuse

CRITERIA FOR "Moderate":
- Standard presentation but requires 2-step reasoning
- Common condition with one atypical feature
- Management question with plausible distractors
- Requires knowing first-line vs second-line therapy

CRITERIA FOR "Easy":
- Classic presentation, single-step recall
- Buzzword diagnosis (e.g., "rose spots" = typhoid)
- First-line treatment for common condition without complicating factors

OUTPUT FORMAT:
For each question, provide:
| Question ID | Current | Suggested | Confidence | Reason |

Only reclassify if confidence is HIGH. Under-reclassifying is better than misleading students.

After the table, summarize:
1. How many Easy → Moderate upgrades you recommend
2. How many Moderate → Hard upgrades you recommend
3. Any Hard → Moderate downgrades (if a question is actually easier than tagged)
4. Patterns you noticed (e.g., "Many cardiology questions tagged Easy involve multi-step reasoning and should be Moderate")

QUESTIONS:
[PASTE LIST OF QUESTIONS WITH CURRENT DIFFICULTY HERE]
```

---

## Prompt D: Generate "Upgrade-Trigger" Questions (Conversion Psychology)

```
You are a medical educator AND growth strategist. You understand that the best way to convert free users to Pro is to show them what they're missing.

TASK: Generate 10 questions specifically designed to create "productive struggle" — questions that make free-tier users realize they need more practice.

PSYCHOLOGY PRINCIPLES:
1. PRODUCTIVE STRUGGLE: Questions should be hard enough that 40-60% of students get them wrong on first attempt
2. AHA MOMENT: The rationale should make the student say "I should have known that" — close enough that they feel capable with more practice
3. PEER SHARING: Include clinical pearls so memorable that students screenshot and share
4. PROGRESS GAP: After getting it wrong, the student should see their weak topic analytics and want to drill more

QUESTION DESIGN:
- Difficulty: Hard (multi-step, subtle)
- Topics: High-yield SMLE topics (Cardiology, Pulmonology, GI, Nephrology)
- Rationales: Exceptionally detailed — the student should learn MORE from the explanation than from a textbook paragraph
- Clinical pearls: Memorable one-liners (e.g., "In STEMI, time is myocardium — door-to-balloon <90 min, door-to-needle <30 min")

EXAMPLE PEARL FORMAT:
"Clinical pearl: In a patient with CKD and hyperkalemia, calcium gluconate protects the heart membrane (minutes), insulin+glucose shifts K+ into cells (hours), and kayexalate/dialysis removes K+ from the body (days). Think: PROTECT → SHIFT → REMOVE."

OUTPUT: JSON array of 10 questions with the same schema as Prompt A, but with extra-detailed rationales and memorable clinical pearls.
```

---

## Prompt E: Generate Daily Dose Questions (Retention & Engagement)

```
You are the SMLE Pro Daily Dose curator. Each day, 1 question is sent to all users (free and Pro) to drive retention.

TASK: Generate 7 Daily Dose questions — one for each day of the week.

DAILY DOSE RULES:
1. Mix of Easy (30%) and Moderate (70%) — never Hard (would discourage free users)
2. Each question must be completable in 60 seconds
3. Include ONE memorable clinical pearl in the rationale
4. Topics rotate: Mon=Cardio, Tue=Pulm, Wed=GI, Thu=Nephro, Fri=Endo, Sat=Neuro, Sun=Mixed
5. Questions should feel "bite-sized" but valuable

RETENTION PSYCHOLOGY:
- The student should feel SMART after answering (positive reinforcement)
- The pearl should be shareable (students tell friends: "Did you know...?")
- The topic should connect to what they're studying (relevance)
- Getting it right should make them want tomorrow's question (habit formation)

EXAMPLE DAILY DOSE QUESTION:
{
  "question": "A 45-year-old male with hypertension presents with sudden severe headache and neck stiffness. CT shows subarachnoid hemorrhage. What is the most appropriate next step?",
  "topic": "Neurology",
  "difficulty": "Moderate",
  "options": [...],
  "rationale": "In suspected SAH with CT negative but high clinical suspicion, lumbar puncture showing xanthochromia confirms the diagnosis. Clinical pearl: 'Thunderclap headache' = SAH until proven otherwise. Think CT first, LP if CT negative."
}

OUTPUT: JSON array of 7 questions. Each should feel like a "microwave learning moment" — quick, satisfying, memorable.
```

---

## Execution Checklist

Before uploading any generated questions:

- [ ] Run `node scripts/audit-question-bank.mjs` — ensure 0 critical issues
- [ ] Check that all `rationale` fields are >20 words
- [ ] Verify generic drug names (no brand names)
- [ ] Ensure no "All of the above" or "None of the above" options
- [ ] Confirm difficulty tags match actual complexity
- [ ] Check that `scfhs_domain` is properly formatted
- [ ] Upload via: `node scripts/upload-questions.mjs --file=generated-im-batch-X.json`
- [ ] Re-run audit after upload to confirm clean insert

---

## Metrics to Track

| Metric | Current | Target | How to Improve |
|--------|---------|--------|---------------|
| IM coverage | 10.7% | 30% | Generate 50 IM Qs/day |
| Hard question % | 5.6% | 30% | Retag + generate Hard |
| Generic rationales | 260 | 0 | Batch rewrite 20/day |
| Daily Dose completion | ? | >60% | Better pearls + push timing |
| Free→Pro conversion | ? | >5% | Hard questions + weak topic drill |

---

> **Bottom line:** Your data layer is production-grade. Your prompts are conversion-optimized. The only remaining variable is execution speed. Generate 50 questions/day and you'll close the IM gap in 7 days.
