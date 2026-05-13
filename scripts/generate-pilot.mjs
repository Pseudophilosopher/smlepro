/**
 * generate-pilot.mjs
 *
 * Pilot question generator — 5 sample questions to demonstrate format and quality.
 *
 * Each question:
 *   - Is an original clinical vignette (no leaked/recalled content)
 *   - References Saudi guidelines (MOH, SCFHS) + official SCFHS textbooks
 *   - Has rationale for EACH of the 4 options (why right OR why wrong)
 *   - Follows the SMLE blueprint topic outline with correct mastery level
 *
 * Usage:
 *   node scripts/generate-pilot.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Helper: Build a question ─────────────────────────────────────────────────
function makeQuestion({ vignette, topic, domain, difficulty, tags, options, topRationale }) {
  // Shuffle options so correct answer isn't always A
  const shuffled = options
    .map((o, i) => ({ ...o, origIdx: i }))
    .sort(() => Math.random() - 0.5);

  const correctIdx = shuffled.findIndex((o) => o.correct);
  const correctLetter = String.fromCharCode(65 + correctIdx);

  return {
    question: vignette,
    topic,
    scfhs_domain: domain,
    difficulty,
    year: '2024-2025',
    image_reference: false,
    options: shuffled.map((o) => ({
      text: o.text,
      correct: o.correct,
      rationale: o.rationale,
    })),
    correct_answer: correctLetter,
    rationale: topRationale,
    tags,
  };
}

// ── Question Templates ───────────────────────────────────────────────────────

const PILOT_QUESTIONS = [
  // ────────── 1. Cardiology – STEMI (Mastery 3) ──────────
  () => makeQuestion({
    vignette:
      'A 52-year-old male with a 15-year history of type 2 diabetes and hypertension presents to the emergency department with retrosternal chest pressure that started 3 hours ago, radiating to the left shoulder, associated with diaphoresis and nausea. ECG shows 3 mm ST-segment elevation in leads V1–V4 with reciprocal ST depression in II, III, aVF. Pulse is 98/min, BP 145/90 mmHg, O₂ saturation 97% on room air. What is the most appropriate immediate management?',
    topic: 'Internal Medicine',
    domain: 'Medicine – Cardiology',
    difficulty: 'Hard',
    tags: ['cardiology', 'STEMI', 'PCI', 'acute-coronary-syndrome'],
    topRationale:
      'This patient presents with acute anterior STEMI (ST elevation in V1–V4, symptom onset <12 hours). Per the Saudi MOH Guideline for Management of Acute STEMI, 2024, primary PCI is the gold-standard reperfusion strategy when door-to-balloon time is expected to be <90 minutes at a PCI-capable center. Delaying reperfusion increases infarct size and mortality: each 30-minute delay raises 1-year mortality by approximately 7.5%.',
    options: [
      {
        text: 'Emergency primary PCI',
        correct: true,
        rationale:
          'Primary PCI within 90 minutes of first medical contact is the recommended reperfusion strategy for STEMI. The Saudi MOH STEMI Guideline, 2024, endorses PCI over fibrinolysis for its superior TIMI-3 flow rates (90% vs 60%), lower re-infarction risk, and reduced intracranial hemorrhage risk. This patient is within the therapeutic window and at a PCI-capable center.',
      },
      {
        text: 'IV thrombolysis with tenecteplase',
        correct: false,
        rationale:
          'Fibrinolysis is indicated only when primary PCI cannot be performed within 120 minutes of first medical contact. This patient is in a hospital with PCI capability and door-to-balloon time can be kept under 90 minutes. Tenecteplase increases bleeding risk and achieves lower rates of complete reperfusion compared to PCI. Per Toronto Notes 2024, PCI is the preferred strategy.',
      },
      {
        text: 'IV heparin infusion and admission to the ward',
        correct: false,
        rationale:
          'Unfractionated heparin is adjunctive therapy in STEMI, not definitive treatment. The "open-artery hypothesis" proves that mechanical reperfusion (PCI) is required to restore TIMI-3 flow and reduce mortality. Heparin alone does not dissolve the occlusive thrombus and does not prevent myocardial necrosis progression.',
      },
      {
        text: 'Sublingual nitroglycerin and observation for 6 hours',
        correct: false,
        rationale:
          'Nitroglycerin provides symptomatic relief through venodilation, reducing preload and myocardial oxygen demand. However, it has no effect on the occlusive coronary thrombus. Delaying definitive reperfusion for observation is dangerous and violates the "time is myocardium" principle; viable myocardium is lost with every passing minute.',
      },
    ],
  }),

  // ────────── 2. Pulmonary – Bronchial Asthma, acute exacerbation (Mastery 3) ──────────
  () => makeQuestion({
    vignette:
      'A 26-year-old female with known bronchial asthma presents to the ER with worsening dyspnea and wheezing over 6 hours, triggered by upper respiratory tract infection. She uses inhaled salbutamol PRN and has had one ER visit last year. On examination: respiratory rate 30/min, pulse 110/min, O₂ saturation 89% on room air, unable to complete full sentences, accessory muscle use, expiratory wheeze throughout both lung fields. Peak expiratory flow rate is 35% of predicted. After 3 salbutamol nebulizations and IV hydrocortisone 200 mg, her PEFR remains 40% predicted. What is the most appropriate next step in management?',
    topic: 'Internal Medicine',
    domain: 'Medicine – Pulmonology',
    difficulty: 'Hard',
    tags: ['pulmonology', 'asthma', 'acute-exacerbation', 'MgSO4'],
    topRationale:
      'This patient has a severe acute asthma exacerbation (PEFR <50%, unable to complete sentences, accessory muscle use) that is not adequately responding to initial inhaled beta-agonists and systemic corticosteroids. Per the Saudi Initiative for Asthma (SINA) 2024 guidelines, the next step is IV magnesium sulfate. This is a safe, effective bronchodilator that reduces hospital admission rates in acute severe asthma.',
    options: [
      {
        text: 'IV magnesium sulfate 2 g over 20 minutes',
        correct: true,
        rationale:
          'IV magnesium sulfate is recommended by SINA 2024 as the next step for acute severe asthma not responding to initial inhaled SABA and IV steroids. Magnesium acts as a smooth-muscle relaxant by inhibiting calcium influx. A 2 g infusion over 20 minutes reduces hospital admission rates by 25% and improves PEFR within 30 minutes.',
      },
      {
        text: 'IV aminophylline infusion',
        correct: false,
        rationale:
          'Aminophylline is no longer recommended in acute asthma exacerbations per both SINA 2024 and GINA 2024 guidelines. It has a narrow therapeutic window, causes significant side effects (nausea, arrhythmias, seizures), and meta-analyses have shown no additional benefit over standard therapy with SABA and corticosteroids.',
      },
      {
        text: 'Start IV salbutamol infusion',
        correct: false,
        rationale:
          'IV salbutamol is reserved for life-threatening asthma with impending respiratory arrest (silent chest, cyanosis, bradycardia). It should be used only after MgSO4 has failed, as it carries higher risk of cardiac arrhythmias, hypokalemia, and lactic acidosis. This patient does not yet meet criteria for life-threatening asthma.',
      },
      {
        text: 'Repeat nebulized ipratropium bromide',
        correct: false,
        rationale:
          'Ipratropium should have been given early in the exacerbation (first 60 minutes) along with SABA. While adding ipratropium in the first hour reduces admission rates, repeating it after multiple SABA nebulizations and steroids provides minimal additional bronchodilation. The patient now requires escalation to IV therapy.',
      },
    ],
  }),

  // ────────── 3. Endocrinology – Diabetic Ketoacidosis (Mastery 3) ──────────
  () => makeQuestion({
    vignette:
      'A 19-year-old male with no known prior medical history presents with a 3-day history of polyuria, polydipsia, weight loss, and fatigue. Today he developed nausea, vomiting, and abdominal pain. On examination: BP 95/60 mmHg, pulse 115/min, respiratory rate 28/min (deep sighing respirations), temperature 37.1°C, dry mucous membranes, poor skin turgor. Capillary blood glucose is 28 mmol/L. Urine dipstick shows 4+ glucose and 3+ ketones. Arterial blood gas: pH 7.15, pCO₂ 18 mmHg, HCO₃ 6 mmol/L, pO₂ 100 mmHg. What is the most appropriate fluid resuscitation?',
    topic: 'Internal Medicine',
    domain: 'Medicine – Endocrinology',
    difficulty: 'Moderate',
    tags: ['endocrinology', 'DKA', 'diabetes', 'fluid-resuscitation'],
    topRationale:
      'This patient presents with classic DKA: hyperglycemia, metabolic acidosis with compensatory respiratory alkalosis, and ketonuria. The most critical initial intervention is fluid resuscitation. Per the Saudi MOH Diabetes Management Guidelines 2024 and Davidson\u2019s Principles & Practice of Medicine 22nd ed., the first step is to restore circulating volume with isotonic crystalloid to improve tissue perfusion and lower blood glucose through dilution and increased renal perfusion.',
    options: [
      {
        text: 'IV normal saline 0.9% 1 liter over 30–60 minutes, then reassess',
        correct: true,
        rationale:
          'Isotonic normal saline (0.9% NaCl) is the recommended initial fluid in DKA. The Saudi MOH DKA Protocol 2024 recommends 15–20 mL/kg in the first hour (typically 1 liter in adults). This restores intravascular volume, improves tissue perfusion, lowers blood glucose by dilution and increased renal excretion, and is essential before initiating insulin therapy to prevent vascular collapse.',
      },
      {
        text: 'IV dextrose 5% in water (D5W) 500 mL over 1 hour',
        correct: false,
        rationale:
          'D5W provides free water without sodium and is hypotonic. It is contraindicated in initial DKA resuscitation because patients are often hyponatremic from hyperglycemia-driven water shift, and D5W would worsen this. Dextrose is only added to fluids later (when blood glucose drops to ~14 mmol/L) to prevent hypoglycemia during insulin therapy.',
      },
      {
        text: 'IV Ringer\'s lactate (Hartmann\'s solution) 1 liter over 30 minutes',
        correct: false,
        rationale:
          'Ringer\'s lactate contains lactate (28 mmol/L), which the liver converts to bicarbonate. In DKA, the liver is already metabolically stressed and lactate metabolism may be impaired. The additional lactate load could theoretically worsen lactic acidosis. Normal saline remains the standard of care for DKA resuscitation per current Saudi MOH guidelines.',
      },
      {
        text: 'IV half-normal saline (0.45% NaCl) 1 liter over 2 hours',
        correct: false,
        rationale:
          'Half-normal saline is hypotonic and is used only after the initial resuscitation phase when serum sodium is elevated and the patient is hemodynamically stable. In the first hour of DKA treatment, isotonic fluids are required to correct hypovolemia. Half-normal saline does not provide sufficient volume expansion in a patient with frank hypovolemic shock.',
      },
    ],
  }),

  // ────────── 4. Infectious Disease – Brucellosis (Mastery 1, Saudi-endemic) ──────────
  () => makeQuestion({
    vignette:
      'A 35-year-old Saudi male from Al-Qassim region presents with a 3-week history of intermittent fever (evening spikes up to 39.5°C), profuse sweating, fatigue, and lower back pain. He works as a shepherd and reports consuming unpasteurized camel milk. On examination: temperature 38.8°C, no focal neurological signs, no organomegaly. CBC shows hemoglobin 12 g/dL, WBC 4.5 × 10⁹/L, platelets 180 × 10⁹/L. ESR is 65 mm/hr. Brucella serology (Rose Bengal test) is positive. What is the most appropriate treatment regimen?',
    topic: 'Internal Medicine',
    domain: 'Medicine – Infectious Diseases',
    difficulty: 'Moderate',
    tags: ['infectious-disease', 'brucellosis', 'zoonotic', 'saudi-endemic'],
    topRationale:
      'Brucellosis is a zoonotic infection endemic to Saudi Arabia, particularly acquired through unpasteurized dairy products. The Saudi MOH Brucellosis Management Guidelines (2023) recommend a combination regimen of doxycycline plus rifampicin for 6 weeks for uncomplicated brucellosis in adults. This dual therapy reduces the relapse rate significantly compared to monotherapy.',
    options: [
      {
        text: 'Doxycycline 100 mg PO BID + rifampicin 600 mg PO daily for 6 weeks',
        correct: true,
        rationale:
          'This is the standard first-line regimen for uncomplicated brucellosis in adults per the Saudi MOH Brucellosis Protocol 2023 and WHO guidelines. Doxycycline and rifampicin act synergistically against intracellular Brucella. Six weeks of therapy is required because Brucella organisms survive within macrophages, and shorter courses lead to relapse rates exceeding 20%.',
      },
      {
        text: 'Ciprofloxacin 500 mg PO BID for 2 weeks',
        correct: false,
        rationale:
          'Fluoroquinolone monotherapy is not recommended for brucellosis due to high relapse rates (up to 30% with 2-week courses) and the development of resistance. Brucella requires prolonged therapy with agents that have good intracellular penetration. Ciprofloxacin may be used as a second-line agent in combination for complicated cases with neurobrucellosis.',
      },
      {
        text: 'Doxycycline 100 mg PO BID for 3 weeks alone',
        correct: false,
        rationale:
          'Doxycycline monotherapy has a relapse rate of approximately 15–25%, which is unacceptably high. The addition of rifampicin reduces relapse to <5%. The recommended minimum treatment duration is 6 weeks, not 3. Shorter courses do not adequately eradicate intracellular organisms and lead to clinical recurrence.',
      },
      {
        text: 'Azithromycin 500 mg PO daily for 5 days',
        correct: false,
        rationale:
          'Azithromycin has poor activity against Brucella species and is not included in any treatment guidelines for brucellosis. Brucellosis requires bactericidal agents with good intracellular penetration (doxycycline, rifampicin, streptomycin, gentamicin). Macrolides alone are inadequate and associated with treatment failure and relapse.',
      },
    ],
  }),

  // ────────── 5. Ethics – Informed Consent (Mastery 1) ──────────
  () => makeQuestion({
    vignette:
      'A 72-year-old male with advanced COPD (FEV1 28% predicted), on home oxygen, is admitted with acute-on-chronic respiratory failure. His condition deteriorates despite NIPPV. The medical team believes he will require intubation and mechanical ventilation. His advance directive states he wishes "no life support measures." His daughter, who is the legal guardian, requests "everything possible" including intubation. The patient is currently awake, alert, and oriented. What is the most appropriate ethical and legal course of action?',
    topic: 'Internal Medicine',
    domain: 'Medicine – Medical Ethics & Professionalism',
    difficulty: 'Easy',
    tags: ['ethics', 'informed-consent', 'advance-directive', 'autonomy'],
    topRationale:
      'In Saudi medical ethics, the SCFHS Professionalism and Ethics Handbook for Residents emphasizes that a patient with decision-making capacity has the right to accept or refuse treatment, even if family members disagree. When the patient is competent and has expressed their wishes, those wishes take precedence. The physician\'s duty is to respect patient autonomy.',
    options: [
      {
        text: 'Discuss with the patient directly and respect his decision, supporting the advance directive',
        correct: true,
        rationale:
          'A competent adult patient has both the legal and ethical right to refuse life-sustaining treatment. The SCFHS Professionalism and Ethics Handbook for Residents (2015) states that "a competent patient\'s decision must be respected even if it contradicts family wishes or leads to death." The advance directive represents the patient\'s autonomous choice. The physician should confirm the patient\'s current wishes, document them, and provide comfort measures and palliation.',
      },
      {
        text: 'Honor the daughter\'s request as legal guardian and proceed with intubation',
        correct: false,
        rationale:
          'Although the daughter is the legal guardian, guardianship rights apply when the patient lacks decision-making capacity. Since this patient is awake, alert, and oriented, he has capacity and the right to make his own medical decisions. In Saudi Arabia, the Islamic principle of the patient\'s right to refuse treatment when competent is recognized by the SCFHS ethics framework.',
      },
      {
        text: 'Obtain a court order to overrule the advance directive',
        correct: false,
        rationale:
          'A court order to override a competent patient\'s refusal of treatment would be legally and ethically inappropriate. This would violate the principle of patient autonomy and the patient\'s right to bodily integrity. Court orders for treatment against a patient\'s will are reserved for specific public health scenarios (e.g., certain contagious diseases) or when a patient lacks capacity.',
      },
      {
        text: 'Intubate and consult the hospital ethics committee afterward',
        correct: false,
        rationale:
          'Proceeding with intubation against a competent patient\'s explicit wishes constitutes battery (unlawful touching) and violates medical ethics principles. The ethics committee should be consulted before proceeding, not after an actionable decision. If the patient has capacity and refuses, the team must respect that decision and provide palliative support.',
      },
    ],
  }),
];

// ── Main ─────────────────────────────────────────────────────────────────────
function main() {
  console.log('\n🔬 SMLE Pro — Pilot Question Generator\n');

  const questions = PILOT_QUESTIONS.map((fn) => fn());

  const backupDir = join(__dirname, 'backups');
  mkdirSync(backupDir, { recursive: true });
  const outPath = join(backupDir, 'generated-pilot.json');
  writeFileSync(outPath, JSON.stringify(questions, null, 2));

  console.log(`   Generated ${questions.length} pilot questions.\n`);

  questions.forEach((q, i) => {
    console.log(`─── Question ${i + 1} ───`);
    console.log(`  Domain:    ${q.scfhs_domain}`);
    console.log(`  Difficulty: ${q.difficulty}`);
    console.log(`  Topic:     ${q.topic}`);
    console.log(`  Correct:   ${q.correct_answer}`);
    console.log(`  Vignette:  ${q.question.slice(0, 120)}...`);
    console.log();
  });

  console.log(`📁 Output: ${outPath}\n`);
}

main();
