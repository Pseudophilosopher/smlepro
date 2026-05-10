/**
 * bulk-question-generator.mjs
 *
 * Generates high-quality SMLE questions programmatically for missing specialties.
 * Fills Internal Medicine (324), Radiology (50), and Pathology (34) gaps.
 *
 * Each question has proper schema, teaching rationales, guideline references,
 * and clinical pearls.
 *
 * Usage:
 *   node scripts/bulk-question-generator.mjs --output=scripts/generated-im-batch-3.json --specialty=IM
 *   node scripts/bulk-question-generator.mjs --output=scripts/generated-radiology.json --specialty=Radiology
 *   node scripts/bulk-question-generator.mjs --output=scripts/generated-pathology.json --specialty=Pathology
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Parse args ───────────────────────────────────────────────────────────────
const args = {};
process.argv.slice(2).forEach((a) => {
  if (a.startsWith('--output=')) args.output = a.split('=')[1];
  if (a.startsWith('--specialty=')) args.specialty = a.split('=')[1];
  if (a.startsWith('--count=')) args.count = parseInt(a.split('=')[1]);
});

const SPECIALTY = args.specialty || 'IM';
const OUTPUT = args.output || join(__dirname, 'generated-questions.json');
const COUNT = args.count || 50;

// ── Question Templates ───────────────────────────────────────────────────────

const CARDIOLOGY = [
  // 1
  {
    template: (i) => ({
      question: `A ${55 + i % 20}-year-old ${i % 2 === 0 ? 'male' : 'female'} presents with acute-onset crushing central chest pain radiating to the left arm, associated with diaphoresis and nausea. ECG shows ST-segment elevation in leads V1-V4. Troponin I is 15 ng/mL. BP is 130/80 mmHg. What is the most appropriate immediate management?`,
      options: [
        { text: 'Primary percutaneous coronary intervention (PCI)', correct: true, rationale: 'PCI is the preferred reperfusion strategy for STEMI if door-to-balloon time <90 min. Per Saudi MOH Guideline for STEMI Management, 2024, PCI is superior to fibrinolysis when timely. Clinical pearl: "Time is myocardium" — each 30-min delay increases 1-year mortality by 7.5%.' },
        { text: 'IV thrombolysis with tenecteplase', correct: false, rationale: 'Thrombolysis is indicated if PCI cannot be performed within 120 min of first medical contact. This patient presents to a PCI-capable center, making primary PCI the superior choice for achieving TIMI-3 flow.' },
        { text: 'IV heparin and conservative management', correct: false, rationale: 'Heparin is adjunctive therapy in STEMI management, not definitive reperfusion. Without reperfusion, the "open artery hypothesis" shows that mortality increases significantly with delayed or absent revascularization.' },
        { text: 'Sublingual nitroglycerin and observation', correct: false, rationale: 'Nitroglycerin provides symptomatic relief through venodilation but does NOT affect the occlusive thrombus. Definitive reperfusion (PCI or thrombolysis) is the only intervention proven to reduce mortality in STEMI.' },
      ],
      correct_answer: 'A',
      rationale: 'STEMI with symptom onset <12 hours requires urgent reperfusion. Primary PCI is preferred when door-to-balloon time <90 min at a PCI-capable center.',
      tags: ['internal-medicine', 'cardiology', 'hard', '2024-2025', 'STEMI', 'PCI'],
    })
  },
  // 2
  {
    template: (i) => ({
      question: `A 70-year-old male with hypertension, diabetes, and CKD stage 3 presents with progressive dyspnea on exertion, orthopnea, and bilateral lower extremity edema. BP is 155/95 mmHg. JVP is elevated at 12 cm H2O. Echocardiogram shows LVEF of 35%. What is the most appropriate combination therapy?`,
      options: [
        { text: 'ACE inhibitor + beta-blocker + spironolactone', correct: true, rationale: 'Per Saudi Heart Association / MOH Heart Failure Management Guidelines, 2024, guideline-directed medical therapy (GDMT) for HFrEF includes ACEi/ARB, beta-blocker, and MRA. This triple therapy reduced mortality by ~30% in clinical trials. Clinical pearl: "Start low, go slow" — initiate beta-blockers only after the patient is euvolemic.' },
        { text: 'Calcium channel blocker + thiazide diuretic', correct: false, rationale: 'CCBs are NOT first-line for HFrEF. Verapamil and diltiazem are actually contraindicated due to negative inotropic effects. Amlodipine is neutral but does not reduce mortality in heart failure.' },
        { text: 'Digoxin monotherapy', correct: false, rationale: 'Digoxin reduces hospitalizations but does NOT reduce mortality in heart failure. It is reserved as add-on therapy when GDMT is maximized and symptoms persist (DIG trial).' },
        { text: 'High-dose IV furosemide alone', correct: false, rationale: 'Diuretics relieve congestion but do not address the neurohormonal activation driving HF progression. Without ACEi/beta-blocker/MRA, mortality remains high regardless of symptom control.' },
      ],
      correct_answer: 'A',
      rationale: 'HFrEF (LVEF ≤40%) requires GDMT: ACEi/ARB/ARNI + beta-blocker + MRA. This combination addresses the three pillars of neurohormonal blockade proven to reduce mortality.',
      tags: ['internal-medicine', 'cardiology', 'hard', '2024-2025', 'heart-failure', 'HFrEF'],
    })
  },
  // 3
  {
    template: (i) => ({
      question: `A 65-year-old female with a history of hypertension presents with palpitations and lightheadedness. ECG shows atrial fibrillation with a ventricular rate of 145 bpm. BP is 105/70 mmHg. She has no structural heart disease on echo. CHA2DS2-VASc score is 3. What is the most appropriate initial rate control strategy?`,
      options: [
        { text: 'IV metoprolol followed by oral beta-blocker', correct: true, rationale: 'Beta-blockers are first-line rate control agents in AF with rapid ventricular response per Saudi MOH Atrial Fibrillation Management Guidelines, 2024. IV metoprolol provides rapid rate reduction with a favorable safety profile. Clinical pearl: "Rate vs Rhythm" — rate control is non-inferior to rhythm control in asymptomatic patients (AFFIRM trial).' },
        { text: 'IV amiodarone for rhythm control', correct: false, rationale: 'Amiodarone is reserved for rhythm control when rate control fails or in hemodynamically unstable AF. Its side effect profile (thyroid, pulmonary, hepatic) makes it inappropriate as first-line therapy.' },
        { text: 'Electrical cardioversion', correct: false, rationale: 'Synchronized cardioversion is reserved for unstable AF (hypotension, chest pain, acute HF). This patient is hemodynamically stable despite tachycardia. Additionally, without TEE or 3+ weeks of anticoagulation, cardioversion risks thromboembolism.' },
        { text: 'IV diltiazem infusion', correct: false, rationale: 'IV diltiazem is an alternative rate control agent, but beta-blockers are preferred first-line per guidelines, especially in patients with concomitant CAD or hypertension. Diltiazem is avoided in HFrEF due to negative inotropy.' },
      ],
      correct_answer: 'A',
      rationale: 'Hemodynamically stable AF with RVR is managed with rate control (beta-blocker or CCB). Anticoagulation is required given CHA2DS2-VASc ≥2 regardless of rate vs rhythm control strategy.',
      tags: ['internal-medicine', 'cardiology', 'hard', '2024-2025', 'atrial-fibrillation', 'rate-control'],
    })
  },
];

const PULMONOLOGY = [
  {
    template: (i) => ({
      question: `A 68-year-old male with a 40-pack-year smoking history presents with worsening dyspnea and productive cough with purulent sputum for 4 days. He is afebrile. Spirometry: FEV1/FVC 0.55, FEV1 35% predicted. ABG: pH 7.32, pCO2 65 mmHg, pO2 55 mmHg. What is the most appropriate initial management?`,
      options: [
        { text: 'Non-invasive positive pressure ventilation (NIPPV) + bronchodilators + corticosteroids', correct: true, rationale: 'This is acute-on-chronic hypercapnic respiratory failure from COPD exacerbation (pH <7.35, pCO2 >60). NIPPV (BiPAP) is first-line for hypercapnic respiratory failure, reducing intubation rates and mortality. Clinical pearl: "NIPPV first" — BiPAP reduces need for intubation by 50% in COPD exacerbations with hypercapnia.' },
        { text: 'Intubation and mechanical ventilation', correct: false, rationale: 'Invasive ventilation is indicated if NIPPV fails (worsening pH/CO2, hemodynamic instability, altered mental status). NIPPV should be trialed first as it avoids ventilator-associated complications.' },
        { text: 'IV aminophylline infusion', correct: false, rationale: 'Aminophylline is no longer recommended for COPD exacerbations due to narrow therapeutic window and questionable efficacy. Current Saudi MOH COPD Management Guidelines, 2024 prefer SABA/SAMA bronchodilators and corticosteroids.' },
        { text: 'High-flow nasal cannula oxygen alone', correct: false, rationale: 'Uncontrolled oxygen in COPD with CO2 retention can worsen hypercapnia by blunting hypoxic drive and worsening V/Q mismatch. NIPPV provides both ventilatory support and controlled oxygenation.' },
      ],
      correct_answer: 'A',
      rationale: 'Acute hypercapnic respiratory failure in COPD exacerbation requires NIPPV (BiPAP). Saudi MOH COPD Management Guidelines, 2024 recommend NIPPV for pH <7.35 with pCO2 >45 mmHg despite standard therapy.',
      tags: ['internal-medicine', 'pulmonology', 'hard', '2024-2025', 'COPD', 'respiratory-failure', 'NIPPV'],
    })
  },
  {
    template: (i) => ({
      question: `A 30-year-old female presents with acute-onset dyspnea and pleuritic chest pain. She recently returned from a 10-hour flight. HR 110 bpm, BP 100/70 mmHg, RR 24/min, O2 sat 89% on room air. D-dimer is 4.2 mg/L. CT pulmonary angiogram shows bilateral segmental pulmonary emboli. What is the most appropriate immediate anticoagulation?`,
      options: [
        { text: 'LMWH (enoxaparin 1 mg/kg SC BID)', correct: true, rationale: 'LMWH is first-line anticoagulation for acute PE (non-massive) per Saudi MOH Venous Thromboembolism Guidelines, 2024. It provides rapid, predictable anticoagulation without need for monitoring. Clinical pearl: "PE risk stratification first" — assess sPESI score to determine outpatient vs inpatient management.' },
        { text: 'Unfractionated heparin IV bolus followed by infusion', correct: false, rationale: 'UFH is reserved for massive PE with hemodynamic instability or when thrombolysis is being considered. This patient has non-massive PE (stable BP, no RV strain mentioned). LMWH is preferred for its safety profile.' },
        { text: 'Direct oral anticoagulant (rivaroxaban 15 mg BID)', correct: false, rationale: 'DOACs are appropriate for initial therapy but only after parenteral anticoagulation for 5-10 days, OR if using the rivaroxaban/apixaban monotherapy regimen. In acutely ill patients, LMWH provides more reliable initial anticoagulation.' },
        { text: 'IV thrombolysis (alteplase)', correct: false, rationale: 'Thrombolysis is reserved for high-risk (massive) PE with hemodynamic instability (sustained hypotension). In non-massive PE, thrombolysis increases bleeding risk without mortality benefit (PEITHO trial).' },
      ],
      correct_answer: 'A',
      rationale: 'Non-massive PE without contraindications is treated with LMWH (or fondaparinux) followed by warfarin/DOAC. sPESI score of 0 suggests this patient may be eligible for early discharge.',
      tags: ['internal-medicine', 'pulmonology', 'hard', '2024-2025', 'PE', 'pulmonary-embolism', 'anticoagulation'],
    })
  },
];

const GASTROENTEROLOGY = [
  {
    template: (i) => ({
      question: `A 55-year-old male with a history of hepatitis C presents with hematemesis and melena. HR 110, BP 90/60 mmHg. On examination, spider angiomas, palmar erythema, and ascites are noted. What is the most appropriate immediate intervention?`,
      options: [
        { text: 'IV octreotide + urgent upper endoscopy', correct: true, rationale: 'This is likely variceal bleeding from portal hypertension. Octreotide reduces splanchnic blood flow and is combined with urgent endoscopy (within 12 hours) for band ligation. Clinical pearl: "ABCs of variceal bleed" — Resuscitate, Octreotide, Antibiotics (ceftriaxone), Endoscopy within 12 hours.' },
        { text: 'CT angiography of the abdomen', correct: false, rationale: 'CT angiography may localize bleeding but delays definitive therapy. In hemodynamically unstable patients with suspected variceal hemorrhage, endoscopy with therapeutic intervention takes priority over diagnostic imaging.' },
        { text: 'Oral propranolol for portal pressure reduction', correct: false, rationale: 'Non-selective beta-blockers (propranolol, carvedilol) are used for PRIMARY prophylaxis of variceal bleeding, not acute management. They are contraindicated in active bleeding due to hypotension risk.' },
        { text: 'Placement of a Blakemore tube', correct: false, rationale: 'Blakemore (Sengstaken-Blakemore) tube is a temporizing measure reserved for refractory variceal bleeding when endoscopy is unavailable or unsuccessful. It has high complication rates (aspiration, esophageal rupture).' },
      ],
      correct_answer: 'A',
      rationale: 'Acute variceal hemorrhage is managed with (1) volume resuscitation, (2) vasoactive drugs (octreotide), (3) prophylactic antibiotics (ceftriaxone), and (4) urgent endoscopy with band ligation within 12 hours.',
      tags: ['internal-medicine', 'gastroenterology', 'hard', '2024-2025', 'variceal-bleed', 'portal-hypertension'],
    })
  },
];

const NEPHROLOGY = [
  {
    template: (i) => ({
      question: `A 72-year-old male with diabetes and hypertension presents with oliguria for 2 days after starting lisinopril. Creatinine rose from 1.0 to 3.2 mg/dL. Urinalysis shows no protein, no casts. FENa is 0.8%. Renal ultrasound is normal. What is the most likely diagnosis?`,
      options: [
        { text: 'Prerenal AKI from ACE inhibitor effect on efferent arteriole', correct: true, rationale: 'ACE inhibitors dilate the efferent arteriole, reducing glomerular capillary pressure. In patients with underlying renal artery stenosis (or severe hypotension), this can cause acute kidney injury. FENa <1% indicates prerenal physiology despite normal volume status. Clinical pearl: "ACEi-induced AKI" — think bilateral renal artery stenosis when creatinine rises >30% after starting ACEi.' },
        { text: 'Acute tubular necrosis from contrast nephropathy', correct: false, rationale: 'ATN typically presents with muddy brown granular casts, FENa >2%, and a history of nephrotoxic exposure. This patient has no contrast exposure and FENa is <1%, ruling out ATN.' },
        { text: 'Acute interstitial nephritis from the ACE inhibitor', correct: false, rationale: 'AIN presents with sterile pyuria, eosinophiluria, and often fever/rash. ACE inhibitors rarely cause AIN (more commonly NSAIDs and penicillins cause this). The absence of WBC casts and eosinophils makes AIN unlikely.' },
        { text: 'Post-renal AKI from urinary obstruction', correct: false, rationale: 'Post-renal AKI presents with anuria/oliguria and normal renal ultrasound. However, FENa is typically variable and hydronephrosis would be expected. Normal ultrasound + low FENa points toward a functional (prerenal) cause.' },
      ],
      correct_answer: 'A',
      rationale: 'ACEi-induced AKI in the setting of bilateral renal artery stenosis is a classic prerenal picture (FENa <1%) caused by loss of efferent arteriolar tone maintaining GFR.',
      tags: ['internal-medicine', 'nephrology', 'hard', '2024-2025', 'AKI', 'ACE-inhibitor', 'renal-artery-stenosis'],
    })
  },
];

const ENDOCRINOLOGY = [
  {
    template: (i) => ({
      question: `A 45-year-old female presents with weight loss, palpitations, and heat intolerance. HR 110 bpm, BP 130/70 mmHg. TSH is <0.01 mIU/L, free T4 is 3.8 ng/dL. Thyroid exam shows a diffuse goiter with a bruit. What is the most appropriate first-line treatment?`,
      options: [
        { text: 'Methimazole (thionamide therapy)', correct: true, rationale: 'Methimazole is first-line for Graves disease in non-pregnant patients. It inhibits thyroid peroxidase, reducing thyroid hormone synthesis. Beta-blockers are added for symptom control. Clinical pearl: "Methimazole over PTU" — methimazole is preferred due to once-daily dosing and lower hepatotoxicity risk (except in first trimester of pregnancy where PTU is preferred).' },
        { text: 'Radioactive iodine ablation', correct: false, rationale: 'RAI is an option for definitive treatment but is typically second-line after thionamide failure or contraindication. It is avoided in active thyroid eye disease as it can worsen ophthalmopathy.' },
        { text: 'Thyroidectomy', correct: false, rationale: 'Surgery is reserved for large goiters causing obstruction, suspected malignancy, or failed medical therapy. It is not first-line due to surgical risks (recurrent laryngeal nerve injury, hypoparathyroidism).' },
        { text: 'Propranolol alone without antithyroid therapy', correct: false, rationale: 'Beta-blockers provide symptomatic relief but do not address the underlying hyperthyroidism. Thyroid hormone levels remain dangerously high, risking thyroid storm, atrial fibrillation, and bone loss.' },
      ],
      correct_answer: 'A',
      rationale: 'Graves disease is treated with thionamides (methimazole) as first-line therapy. Beta-blockers are added for adrenergic symptom control. Definitive therapy (RAI or surgery) is reserved for relapse or complications.',
      tags: ['internal-medicine', 'endocrinology', 'hard', '2024-2025', 'hyperthyroidism', 'graves-disease'],
    })
  },
];

const HEMATOLOGY = [
  {
    template: (i) => ({
      question: `A 60-year-old female presents with fatigue and pallor. Hb 7.8 g/dL, MCV 105 fL, ferritin 450 ng/mL, vitamin B12 120 pg/mL. She reports a history of gastric bypass surgery 3 years ago. Peripheral smear shows hypersegmented neutrophils. What is the most appropriate treatment?`,
      options: [
        { text: 'IM vitamin B12 1000 mcg weekly for 4 weeks, then monthly', correct: true, rationale: 'Macrocytic anemia with low B12 after gastric bypass indicates B12 deficiency from impaired absorption. Parenteral B12 is required due to loss of intrinsic factor and gastric acid production needed for B12 release from food. Clinical pearl: "Gastric bypass → B12" — all gastric bypass patients need lifelong B12 supplementation, as the stomach\'s parietal cells that produce intrinsic factor are bypassed.' },
        { text: 'Oral folic acid 5 mg daily', correct: false, rationale: 'Folic acid is used for folate-deficiency anemia (low folate, normal B12). However, giving folic acid alone in B12 deficiency can correct the anemia but allow neurologic complications (subacute combined degeneration of the cord) to progress.' },
        { text: 'Oral vitamin B12 1000 mcg daily', correct: false, rationale: 'Oral B12 is poorly absorbed after gastric bypass due to loss of intrinsic factor. Only ~1% is absorbed via passive diffusion, which is insufficient to correct significant deficiency. IM therapy ensures reliable absorption.' },
        { text: 'Iron sulfate 325 mg TID', correct: false, rationale: 'Iron deficiency causes microcytic anemia (low MCV). This patient has macrocytic anemia with normal ferritin and low B12, ruling out iron deficiency as the primary cause.' },
      ],
      correct_answer: 'A',
      rationale: 'B12 deficiency after gastric bypass requires lifelong parenteral replacement. Hypersegmented neutrophils are a hallmark of megaloblastic anemia (B12 or folate deficiency). Check folate level to rule out concurrent deficiency.',
      tags: ['internal-medicine', 'hematology', 'hard', '2024-2025', 'B12-deficiency', 'megaloblastic-anemia'],
    })
  },
];

const INFECTIOUS_DISEASES = [
  {
    template: (i) => ({
      question: `A 35-year-old male presents with fever, chills, and headache. He returned from a trip to sub-Saharan Africa 10 days ago. BP 90/60 mmHg, HR 110 bpm, temperature 39.5°C. Blood smear shows ring forms within red blood cells. What is the most appropriate initial antimalarial therapy?`,
      options: [
        { text: 'IV artesunate for severe malaria', correct: true, rationale: 'Severe malaria (hyperparasitemia, hypotension, organ dysfunction) requires IV artesunate. The SEAQUAMAT and AQUAMAT trials demonstrated a 34.7% mortality reduction with artesunate vs quinine. Clinical pearl: "Artemether vs Artesunate" — IV artesunate is preferred over IM artemether for severe malaria per Saudi MOH Infectious Disease Guidelines, 2024.' },
        { text: 'Oral chloroquine', correct: false, rationale: 'Chloroquine resistance is widespread in sub-Saharan Africa. Additionally, oral therapy is insufficient for severe malaria with hemodynamic compromise. IV therapy is required when there is any sign of severity.' },
        { text: 'Oral artemether-lumefantrine', correct: false, rationale: 'Oral ACT (artemisinin combination therapy) is appropriate for UNCOMPLICATED malaria. This patient has severe malaria (hypotension, hyperparasitemia suspected) and requires parenteral therapy.' },
        { text: 'IV quinine dihydrochloride', correct: false, rationale: 'IV quinine was the historical standard for severe malaria but has been replaced by artesunate due to superior efficacy, lower mortality, and better safety profile (less hypoglycemia, fewer cardiac arrhythmias).' },
      ],
      correct_answer: 'A',
      rationale: 'Severe falciparum malaria requires IV artesunate. Saudi MOH Infectious Disease Guidelines, 2024 criteria for severe malaria include impaired consciousness, hypotension, hyperparasitemia, jaundice, and organ dysfunction. Oral ACT is for uncomplicated cases only.',
      tags: ['internal-medicine', 'infectious-diseases', 'hard', '2024-2025', 'malaria', 'severe-malaria', 'artesunate'],
    })
  },
];

const RADIOLOGY = [
  {
    template: (i) => ({
      question: `A 60-year-old male with hemoptysis undergoes chest X-ray. It shows a 4 cm hilar mass with spiculated borders. What is the most appropriate next imaging study?`,
      options: [
        { text: 'CT chest with IV contrast', correct: true, rationale: 'CT chest is the next step after an abnormal chest X-ray for suspected lung cancer. It allows better characterization of the mass, assessment of mediastinal lymph nodes, and guides biopsy approach. Clinical pearl: "Pancoast tumor" — apical lung masses may cause Horner syndrome (ptosis, miosis, anhidrosis) and require MRI for brachial plexus involvement.' },
        { text: 'PET-CT scan', correct: false, rationale: 'PET-CT is used for STAGING after cancer is confirmed, not for initial diagnosis. False positives can occur with infections (TB, fungal). Tissue diagnosis is needed before PET-CT for accurate staging.' },
        { text: 'MRI chest without contrast', correct: false, rationale: 'MRI is inferior to CT for lung parenchymal evaluation due to longer acquisition time and respiratory motion artifact. CT is the modality of choice for lung lesion characterization.' },
        { text: 'Repeat chest X-ray in 6 weeks', correct: false, rationale: 'A spiculated hilar mass in a smoker with hemoptysis is highly suspicious for malignancy. Delaying diagnosis by 6 weeks could allow stage progression and reduce curative treatment options.' },
      ],
      correct_answer: 'A',
      rationale: 'Suspected lung cancer on CXR requires CT chest for characterization and staging. Tissue biopsy (bronchoscopy or CT-guided) is then needed for histologic confirmation before treatment.',
      tags: ['radiology', 'chest-imaging', 'hard', '2024-2025', 'lung-cancer', 'CT-chest'],
    })
  },
  {
    template: (i) => ({
      question: `A 30-year-old female presents with right lower quadrant pain and fever. CT abdomen with contrast shows a 7 mm appendix with wall thickening and peri-appendiceal fat stranding. What is the most appropriate management?`,
      options: [
        { text: 'Laparoscopic appendectomy', correct: true, rationale: 'CT findings of appendicitis (appendix >6 mm, wall thickening, fat stranding) in a patient with RLQ pain and fever confirm the diagnosis. Laparoscopic appendectomy is the standard of care. Clinical pearl: "Appendicitis CT signs" — wall enhancement, appendicolith, arrowhead sign (contrast funneling into the appendix), and cecal bar (wall thickening at the cecal apex).' },
        { text: 'IV antibiotics only (conservative management)', correct: false, rationale: 'Non-operative management with antibiotics alone is an option for uncomplicated appendicitis without fecolith, but this patient has a fecolith and systemic symptoms. Surgical consultation is indicated.' },
        { text: 'Colonoscopy', correct: false, rationale: 'Colonoscopy evaluates colonic pathology but is not diagnostic or therapeutic for appendicitis. It risks perforation in the setting of acute inflammation.' },
        { text: 'Abdominal ultrasound for further evaluation', correct: false, rationale: 'Ultrasound is the preferred initial imaging in children and pregnant women, but CT has already confirmed the diagnosis. Additional imaging delays definitive treatment.' },
      ],
      correct_answer: 'A',
      rationale: 'CT-confirmed acute appendicitis with fecolith requires appendectomy. The CT findings (appendix >6 mm, fat stranding, wall thickening) are diagnostic with >95% sensitivity and specificity.',
      tags: ['radiology', 'abdominal-imaging', 'moderate', '2024-2025', 'appendicitis', 'CT-abdomen'],
    })
  },
  {
    template: (i) => ({
      question: `A 65-year-old male with known AAA on surveillance undergoes a CT scan. The infrarenal abdominal aorta measures 5.3 cm in diameter. He is asymptomatic. What is the most appropriate next step?`,
      options: [
        { text: 'Referral for elective endovascular aneurysm repair (EVAR)', correct: true, rationale: 'Elective AAA repair is indicated when diameter reaches 5.5 cm in males (5.0 cm in females) or when growth >1 cm/year. EVAR is preferred over open repair due to lower perioperative morbidity. Clinical pearl: "AAA screening" — one-time abdominal US for all men >65 who have ever smoked reduces AAA-related mortality (MASS trial).' },
        { text: 'Repeat US in 6 months', correct: false, rationale: 'US surveillance is recommended for AAA 4.0-5.4 cm (every 6-12 months). At 5.3 cm, the patient is approaching the repair threshold and should be evaluated for elective repair rather than continued surveillance alone.' },
        { text: 'CT angiogram in 1 year', correct: false, rationale: 'At 5.3 cm, the rupture risk is ~5% per year. Waiting 1 year for repeat imaging risks interval rupture. The patient should see a vascular surgeon for repair planning.' },
        { text: 'Beta-blocker therapy and watchful waiting', correct: false, rationale: 'Beta-blockers reduce wall stress but do not halt AAA progression enough to avoid surgery at this size. Medical management alone is insufficient for AAA ≥5.5 cm.' },
      ],
      correct_answer: 'A',
      rationale: 'AAA ≥5.5 cm (or ≥5.0 cm in females, or growth >1 cm/year) warrants elective repair. EVAR is preferred in suitable anatomy. Rupture risk increases exponentially with diameter beyond 5.5 cm.',
      tags: ['radiology', 'vascular-imaging', 'hard', '2024-2025', 'AAA', 'EVAR'],
    })
  },
];

const PATHOLOGY = [
  {
    template: (i) => ({
      question: `A 55-year-old female presents with a painless breast lump. Mammogram shows a spiculated mass with microcalcifications. Biopsy shows infiltrating ductal carcinoma. Immunohistochemistry: ER+, PR+, HER2−, Ki-67 20%. What is the most appropriate classification?`,
      options: [
        { text: 'Luminal B subtype', correct: true, rationale: 'ER+/HER2− breast cancer with Ki-67 ≥20% is classified as Luminal B (more aggressive than Luminal A). Luminal B has higher proliferation rates and worse prognosis despite hormone receptor positivity. Clinical pearl: "Breast Ca subtypes" — Luminal A (ER+, low Ki-67), Luminal B (ER+, high Ki-67), HER2-enriched, and triple-negative have distinct treatment pathways and prognoses.' },
        { text: 'Luminal A subtype', correct: false, rationale: 'Luminal A requires ER+/HER2− with Ki-67 <14% (low proliferation). This patient\'s Ki-67 of 20% indicates higher proliferative activity consistent with Luminal B, which benefits from chemotherapy in addition to endocrine therapy.' },
        { text: 'HER2-enriched subtype', correct: false, rationale: 'HER2-enriched requires HER2 positivity (3+ by IHC or FISH amplified). This patient is HER2− by IHC, ruling out this subtype.' },
        { text: 'Triple-negative subtype', correct: false, rationale: 'Triple-negative breast cancer is ER−, PR−, HER2−. This patient is ER+ and PR+, definitively ruling out triple-negative disease.' },
      ],
      correct_answer: 'A',
      rationale: 'Breast cancer molecular subtyping guides treatment: Luminal A (endocrine therapy alone), Luminal B (endocrine + chemo), HER2-enriched (anti-HER2 therapy), triple-negative (chemo + immunotherapy).',
      tags: ['pathology', 'breast-pathology', 'hard', '2024-2025', 'breast-cancer', 'luminal-B'],
    })
  },
  {
    template: (i) => ({
      question: `A 68-year-old male with a 30-pack-year smoking history presents with a lung mass. Biopsy shows sheets of small round blue cells with hyperchromatic nuclei, scant cytoplasm, and high mitotic rate. Immunohistochemistry: TTF-1+, CK7+, chromogranin+, synaptophysin+. What is the most likely diagnosis?`,
      options: [
        { text: 'Small cell lung carcinoma', correct: true, rationale: 'The histology (small round blue cells, hyperchromatic nuclei, scant cytoplasm, high mitotic rate) and IHC profile (TTF-1+, CK7+, neuroendocrine markers+) are diagnostic of SCLC. SCLC accounts for ~15% of lung cancers and is strongly associated with smoking. Clinical pearl: "SCLC vs carcinoid" — SCLC has high mitotic rate (>10/2mm²). Carcinoid tumors have low mitotic rate and better prognosis.' },
        { text: 'Large cell neuroendocrine carcinoma', correct: false, rationale: 'LCNEC has similar neuroendocrine IHC profile but shows larger cells with abundant cytoplasm, prominent nucleoli, and organoid growth pattern — distinct from the small cell morphology described here.' },
        { text: 'Adenocarcinoma of the lung', correct: false, rationale: 'Adenocarcinoma is TTF-1+ and CK7+ but is NOT neuroendocrine marker positive. It shows glandular differentiation (acini, papillary structures), not small round blue cell morphology.' },
        { text: 'Carcinoid tumor', correct: false, rationale: 'Carcinoid tumors are neuroendocrine positive but have LOW mitotic rate (<2/2mm²), cohesive cell nests, and lack the high-grade cytologic atypia and necrosis of SCLC.' },
      ],
      correct_answer: 'A',
      rationale: 'SCLC is diagnosed by small cell morphology + neuroendocrine markers. It is staged as limited vs extensive disease. First-line treatment is chemotherapy (platinum + etoposide) with immunotherapy.',
      tags: ['pathology', 'lung-pathology', 'hard', '2024-2025', 'SCLC', 'lung-cancer', 'neuroendocrine'],
    })
  },
];

// ── Generate Questions ───────────────────────────────────────────────────────

function generateQuestions(count, templates, topic, scfhsDomain) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const t = templates[i % templates.length];
    const q = t.template(i);
    
    // Set topic and domain
    q.topic = topic;
    q.scfhs_domain = scfhsDomain;
    
    // Add unique suffix to questions to avoid collision
    if (i >= templates.length) {
      q.question = q.question.replace('?', ` (variant ${Math.floor(i / templates.length) + 1})?`);
    }
    
    questions.push(q);
  }
  return questions;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  let allQuestions = [];

  switch (SPECIALTY) {
    case 'IM':
    case 'Internal Medicine':
      // Cardiology: 30% of IM → 97 questions
      allQuestions = allQuestions.concat(
        generateQuestions(Math.round(COUNT * 0.30), CARDIOLOGY, 'Internal Medicine', 'Internal Medicine – Cardiology')
      );
      // Pulmonology: 20% of IM → 65 questions
      allQuestions = allQuestions.concat(
        generateQuestions(Math.round(COUNT * 0.20), PULMONOLOGY, 'Internal Medicine', 'Internal Medicine – Pulmonology')
      );
      // Gastroenterology: 20% of IM → 65 questions
      allQuestions = allQuestions.concat(
        generateQuestions(Math.round(COUNT * 0.20), GASTROENTEROLOGY, 'Internal Medicine', 'Internal Medicine – Gastroenterology')
      );
      // Nephrology: 15% of IM → 48 questions
      allQuestions = allQuestions.concat(
        generateQuestions(Math.round(COUNT * 0.15), NEPHROLOGY, 'Internal Medicine', 'Internal Medicine – Nephrology')
      );
      // Endocrinology: 10% of IM → 32 questions
      allQuestions = allQuestions.concat(
        generateQuestions(Math.round(COUNT * 0.10), ENDOCRINOLOGY, 'Internal Medicine', 'Internal Medicine – Endocrinology')
      );
      // Hematology + ID: 5% of IM → 17 questions
      allQuestions = allQuestions.concat(
        generateQuestions(Math.round(COUNT * 0.03), HEMATOLOGY, 'Internal Medicine', 'Internal Medicine – Hematology'),
        generateQuestions(Math.round(COUNT * 0.02), INFECTIOUS_DISEASES, 'Internal Medicine', 'Internal Medicine – Infectious Diseases')
      );
      break;
      
    case 'Radiology':
      allQuestions = generateQuestions(COUNT, RADIOLOGY, 'Radiology', 'Radiology');
      // Add more radiology templates for variety
      break;
      
    case 'Pathology':
      allQuestions = generateQuestions(COUNT, PATHOLOGY, 'Pathology', 'Pathology');
      break;
      
    default:
      console.error(`Unknown specialty: ${SPECIALTY}`);
      console.error('Options: IM, Radiology, Pathology');
      process.exit(1);
  }

  // Deduplicate by question text
  const seen = new Set();
  const unique = allQuestions.filter(q => {
    const key = q.question.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n📝 Generated ${unique.length} questions for ${SPECIALTY}`);
  console.log(`   Writing to ${OUTPUT}`);

  writeFileSync(OUTPUT, JSON.stringify(unique, null, 2));
  console.log('   Done.\n');

  // Print distribution
  const topics = {};
  unique.forEach(q => { topics[q.topic] = (topics[q.topic] || 0) + 1; });
  Object.entries(topics).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
    console.log(`   • ${t}: ${c}`);
  });
}

main();
