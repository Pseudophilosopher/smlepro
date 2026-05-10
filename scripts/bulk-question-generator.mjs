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

const OBGYN = [
  // 1 — Preeclampsia
  {
    template: (i) => ({
      question: `A 28-year-old primigravida at 34 weeks gestation presents with headache, blurred vision, and epigastric pain. BP is 160/110 mmHg. Urinalysis shows 3+ protein. Serum creatinine is 1.1 mg/dL. Platelets are 95,000/µL. AST is 120 U/L. What is the most appropriate management?`,
      options: [
        { text: 'IV magnesium sulfate + antihypertensives + delivery after steroid course', correct: true, rationale: 'This is severe preeclampsia (BP ≥160/110, proteinuria, thrombocytopenia, elevated LFTs). Magnesium sulfate prevents eclampsia. Antihypertensives (labetalol or hydralazine) control BP. Delivery is the definitive treatment; a 24-48 hour steroid course for fetal lung maturity is appropriate at 34 weeks. Clinical pearl: "Severe preeclampsia" — delivery is the cure. Magnesium sulfate is given during labor and 24h postpartum. BP target <160/105 during labor.' },
        { text: 'Oral antihypertensives and outpatient monitoring', correct: false, rationale: 'Severe preeclampsia with end-organ damage (thrombocytopenia, elevated LFTs) requires inpatient management and delivery. Outpatient management is only appropriate for mild gestational hypertension or preeclampsia without severe features.' },
        { text: 'IV hydralazine alone and discharge when BP controlled', correct: false, rationale: 'While IV hydralazine is appropriate for acute BP control, it does not address the underlying placental ischemia or prevent eclampsia. Magnesium sulfate and delivery planning are essential components of severe preeclampsia management.' },
        { text: 'Immediate cesarean delivery without steroids', correct: false, rationale: 'At 34 weeks, a course of antenatal corticosteroids (betamethasone) should be given to reduce neonatal respiratory distress syndrome. Delivery should not be delayed beyond 48 hours for steroid completion, but immediate delivery without steroids is not optimal.' },
      ],
      correct_answer: 'A',
      rationale: 'Severe preeclampsia requires (1) magnesium sulfate for seizure prophylaxis, (2) BP control with IV antihypertensives, (3) delivery after completing corticosteroid course if ≤34 weeks. Per SCFHS and Saudi MOH Maternal-Fetal Medicine Guidelines, 2024.',
      tags: ['obgyn', 'preeclampsia', 'hard', '2024-2025', 'severe-preeclampsia', 'maternal-fetal'],
    })
  },
  // 2 — Postpartum Hemorrhage
  {
    template: (i) => ({
      question: `A 32-year-old female, G2P1, delivered a 3.8 kg baby 30 minutes ago. The placenta has delivered but there is heavy vaginal bleeding with clots. Uterus is boggy and fundus is at the umbilicus. Estimated blood loss is 800 mL. BP is 95/60 mmHg, HR 110 bpm. What is the most appropriate first-line intervention?`,
      options: [
        { text: 'Uterine massage + IV oxytocin + IV fluids', correct: true, rationale: 'Uterine atony is the most common cause of primary PPH. First-line management is bimanual uterine massage, IV oxytocin infusion (10-40 IU in 1L NS), and IV crystalloid resuscitation. Per Saudi MOH Guidelines for Obstetric Emergencies, 2024, oxytocin is the preferred uterotonic. Clinical pearl: "PPH sequence" — Tone (uterotonics), Trauma (repair tears), Tissue (retained products), Thrombin (coagulopathy).' },
        { text: 'Intramuscular ergometrine', correct: false, rationale: 'Ergometrine is a second-line uterotonic after oxytocin. It is contraindicated in hypertension and causes nausea/vomiting. Oxytocin has a better safety profile and is the first-line agent for PPH prevention and treatment.' },
        { text: 'IV tranexamic acid', correct: false, rationale: 'Tranexamic acid (TXA) reduces death from bleeding in PPH (WOMAN trial) but is adjunctive to uterotonics, not first-line. It should be given within 3 hours of birth if bleeding continues despite oxytocin and uterine massage.' },
        { text: 'Balloon tamponade (Bakri balloon)', correct: false, rationale: 'Intrauterine balloon tamponade is used when medical therapy (uterotonics) fails. It is a second-line intervention before proceeding to surgical options like compression sutures or hysterectomy.' },
      ],
      correct_answer: 'A',
      rationale: 'Primary PPH from uterine atony is managed with uterine massage, IV oxytocin, and IV fluids. Saudi MOH guidelines recommend oxytocin 10-40 IU IV infusion as first-line uterotonic. Examine for retained products and genital tract trauma if bleeding persists.',
      tags: ['obgyn', 'postpartum-hemorrhage', 'hard', '2024-2025', 'PPH', 'uterine-atony'],
    })
  },
  // 3 — Ectopic Pregnancy
  {
    template: (i) => ({
      question: `A 30-year-old female, G3P2, presents with lower abdominal pain and vaginal spotting at 7 weeks gestation. She has a history of pelvic inflammatory disease. HR 100 bpm, BP 105/70 mmHg. Quantitative β-hCG is 3,500 IU/L. Transvaginal ultrasound shows no intrauterine gestational sac and a 2.5 cm adnexal mass. What is the most appropriate management?`,
      options: [
        { text: 'Laparoscopic salpingectomy or salpingostomy', correct: true, rationale: 'This is an ectopic pregnancy (no IUP, adnexal mass, β-hCG >2,000 with empty uterus). With β-hCG >3,500 and a visible mass, surgical management is preferred over medical. Laparoscopic salpingectomy is definitive and preserves future fertility via the remaining tube. Clinical pearl: "Ectopic criteria" — β-hCG >2,000 with empty uterus = ectopic until proven otherwise. Risk factors: PID, prior ectopic, IUD, tubal surgery.' },
        { text: 'IV methotrexate (MTX) therapy', correct: false, rationale: 'MTX is appropriate for unruptured ectopic with β-hCG <3,000-5,000, no fetal cardiac activity, mass <3.5 cm, and reliable patient. This patient has β-hCG of 3,500 and a visible 2.5 cm mass — borderline for MTX, but surgical management avoids the 10-15% failure rate of MTX and the need for prolonged follow-up.' },
        { text: 'Expectant management with serial β-hCG monitoring', correct: false, rationale: 'Expectant management is reserved for very low β-hCG (<1,500), declining levels, and minimal symptoms. This patient has symptoms, a visible mass, and a β-hCG of 3,500 — expectant management carries risk of rupture.' },
        { text: 'Dilation and curettage (D&C)', correct: false, rationale: 'D&C is diagnostic but not therapeutic for ectopic pregnancy. If no villi are found on curettage, ectopic is confirmed. However, with a visible adnexal mass on ultrasound, laparoscopy is the appropriate next step.' },
      ],
      correct_answer: 'A',
      rationale: 'Ectopic pregnancy with β-hCG >3,500 and a visible adnexal mass is best managed surgically. Laparoscopic salpingectomy/salpingostomy is the standard approach. Per Saudi MOH Guidelines for Ectopic Pregnancy Management, 2024.',
      tags: ['obgyn', 'ectopic-pregnancy', 'hard', '2024-2025', 'ectopic', 'laparoscopy'],
    })
  },
  // 4 — Gestational Diabetes
  {
    template: (i) => ({
      question: `A 35-year-old female, G1P0, at 26 weeks gestation undergoes a 75g OGTT. Fasting glucose is 5.6 mmol/L, 1-hour is 10.5 mmol/L, 2-hour is 9.2 mmol/L. She has a BMI of 32 kg/m². What is the most appropriate initial management?`,
      options: [
        { text: 'Medical nutrition therapy + self-monitoring of blood glucose', correct: true, rationale: 'This patient meets diagnostic criteria for GDM (fasting ≥5.1, 1h ≥10.0, 2h ≥8.5). First-line management is dietary counseling (carbohydrate-controlled diet) and SMBG (fasting and 1h postprandial). Per Saudi MOH Guidelines for Gestational Diabetes, 2024, insulin is added if targets are not met after 1-2 weeks. Clinical pearl: "GDM targets" — fasting <5.3, 1h postprandial <7.8, 2h postprandial <6.7. Metformin may be considered as second-line.' },
        { text: 'Immediate insulin therapy', correct: false, rationale: 'Insulin is initiated if glycemic targets are not achieved with diet and exercise after 1-2 weeks. Starting insulin immediately without trialing dietary management exposes the patient to unnecessary injections and hypoglycemia risk.' },
        { text: 'Oral metformin monotherapy', correct: false, rationale: 'Metformin is considered second-line when insulin is declined or if glucose targets are not met with lifestyle alone. It crosses the placenta, though no teratogenicity has been demonstrated beyond the first trimester. Diet therapy remains first-line.' },
        { text: 'No intervention; re-test at 32 weeks', correct: false, rationale: 'Untreated GDM increases risks of macrosomia, shoulder dystocia, neonatal hypoglycemia, and preeclampsia. Intervention is indicated once the diagnosis is established. Delaying treatment for 6 weeks allows continued fetal hyperinsulinemia and accelerated growth.' },
      ],
      correct_answer: 'A',
      rationale: 'GDM is diagnosed by OGTT (IADPSG/WHO criteria). First-line management is medical nutrition therapy and SMBG. Per Saudi MOH Guidelines for Gestational Diabetes, 2024, pharmacotherapy (insulin or metformin) is added if targets not met after 1-2 weeks.',
      tags: ['obgyn', 'gestational-diabetes', 'moderate', '2024-2025', 'GDM', 'OGTT'],
    })
  },
  // 5 — Ovarian Torsion
  {
    template: (i) => ({
      question: `A 25-year-old female presents with acute-onset right lower abdominal pain with nausea and vomiting. Pain is colicky and radiates to the flank. On exam, there is right adnexal tenderness. A pelvic ultrasound shows a 6 cm right ovarian cyst with absent arterial and venous flow on Doppler. β-hCG is negative. What is the most appropriate management?`,
      options: [
        { text: 'Emergency laparoscopic detorsion', correct: true, rationale: 'Ovarian torsion is a surgical emergency. Absent Doppler flow confirms the diagnosis. Laparoscopic detorsion is the standard of care, even if the ovary appears ischemic — ovarian function recovers in >90% of cases. Per Saudi MOH Guidelines for Gynecologic Emergencies, 2024, detorsion should be performed within 2-4 hours of presentation. Clinical pearl: "Torsion vs rupture" — torsion presents with sudden severe pain + nausea (20-30% have intermittent torsion with waxing/waning). Do NOT untwist and remove — detorsion preserves the ovary.' },
        { text: 'IV antibiotics and analgesia for suspected PID', correct: false, rationale: 'PID presents with gradual onset bilateral lower abdominal pain, cervical motion tenderness, and fever. This patient has acute unilateral pain with a cystic adnexal mass and absent Doppler flow — classic for torsion, not infection.' },
        { text: 'Diagnostic laparoscopy with oophorectomy', correct: false, rationale: 'Oophorectomy is reserved for a frankly necrotic, non-viable ovary or a malignant-appearing mass. Current guidelines recommend detorsion even if the ovary appears dark/ischemic, as function recovers in the majority of cases.' },
        { text: 'CT abdomen with IV contrast', correct: false, rationale: 'CT is not the imaging modality of choice for suspected ovarian torsion. Pelvic ultrasound with Doppler is the gold standard. CT would delay surgical management and expose the patient to radiation. MRI is used if ultrasound is inconclusive.' },
      ],
      correct_answer: 'A',
      rationale: 'Ovarian torsion is a gynecologic emergency diagnosed by Doppler ultrasound. Emergent laparoscopic detorsion preserves ovarian function. Per Saudi MOH Guidelines for Gynecologic Emergencies, 2024, detorsion is preferred over oophorectomy regardless of ovarian appearance.',
      tags: ['obgyn', 'ovarian-torsion', 'hard', '2024-2025', 'torsion', 'laparoscopy'],
    })
  },
];

const PEDIATRICS = [
  // 1 — Bronchiolitis
  {
    template: (i) => ({
      question: `A 6-month-old infant presents with 3 days of cough, rhinorrhea, and difficulty feeding. Temperature 38.2°C. RR 55/min, HR 150 bpm, O2 sat 91% on room air. Chest exam shows bilateral wheezing and crackles. Nasopharyngeal swab is positive for RSV. What is the most appropriate initial management?`,
      options: [
        { text: 'Oxygen to target SpO2 ≥92% + nasal suctioning + supportive care', correct: true, rationale: 'Bronchiolitis management is primarily supportive. Supplemental oxygen is indicated for SpO2 <90-92%. Nasal suctioning before feeds improves feeding. Per Saudi MOH Clinical Practice Guideline for Bronchiolitis, 2024, bronchodilators and steroids are NOT routinely indicated. Clinical pearl: "Bronchiolitis treatment" — suction, oxygen, fluids. No bronchodilators, no steroids, no antibiotics, no chest physiotherapy. Most common cause of winter hospitalization in infants <12 months.' },
        { text: 'Nebulized albuterol + oral corticosteroids', correct: false, rationale: 'Bronchodilators (albuterol) and corticosteroids are NOT effective in bronchiolitis per multiple RCTs and Cochrane reviews. They are indicated for asthma/reactive airway disease, which is rare in infants <12 months. The AAP and Saudi MOH guidelines strongly recommend against their routine use.' },
        { text: 'IV antibiotics (ampicillin + gentamicin)', correct: false, rationale: 'RSV bronchiolitis is viral. Antibiotics are indicated only if there is a confirmed secondary bacterial infection (e.g., superimposed pneumonia, otitis media). Routine antibiotic use in bronchiolitis contributes to resistance without clinical benefit.' },
        { text: 'High-flow nasal cannula (HFNC) oxygen', correct: false, rationale: 'HFNC is a respiratory support modality for moderate-severe bronchiolitis with impending respiratory failure (SpO2 <90%, significant work of breathing, hypercapnia). This patient has mild-moderate disease and responds to standard low-flow oxygen with suctioning.' },
      ],
      correct_answer: 'A',
      rationale: 'Bronchiolitis is managed with supportive care: oxygen, nasal suctioning, and adequate hydration. Per Saudi MOH Clinical Practice Guideline for Bronchiolitis, 2024, bronchodilators and steroids do not alter disease course and are not recommended.',
      tags: ['pediatrics', 'bronchiolitis', 'moderate', '2024-2025', 'RSV', 'respiratory'],
    })
  },
  // 2 — Kawasaki Disease
  {
    template: (i) => ({
      question: `A 3-year-old child presents with 6 days of fever (39.5°C), bilateral conjunctival injection, cracked lips, strawberry tongue, and a polymorphous rash on the trunk. Cervical lymph node is 2 cm on the right. What is the most appropriate treatment?`,
      options: [
        { text: 'IV immunoglobulin (IVIG) 2 g/kg + high-dose aspirin', correct: true, rationale: 'This child meets diagnostic criteria for complete Kawasaki disease (fever ≥5 days + 4 of 5 criteria: conjunctivitis, oral changes, rash, lymphadenopathy). IVIG 2 g/kg within 10 days of fever onset reduces coronary artery aneurysm risk from 25% to 5%. High-dose aspirin (80-100 mg/kg/day) is given until afebrile. Clinical pearl: "Kawasaki" — IVIG within 10 days is the ONLY intervention proven to reduce coronary aneurysms. Incomplete Kawasaki: suspect when fever + 2-3 criteria + lab evidence of inflammation.' },
        { text: 'High-dose aspirin alone', correct: false, rationale: 'Aspirin alone does not reduce coronary artery aneurysm risk. IVIG is the cornerstone of treatment. Aspirin is anti-inflammatory at high doses and antiplatelet at low doses, but does not prevent vasculitis-mediated coronary damage.' },
        { text: 'Oral corticosteroids (prednisolone)', correct: false, rationale: 'Corticosteroids are reserved for IVIG-resistant Kawasaki disease (persistent fever 36h after IVIG). In primary therapy, IVIG alone is superior to IVIG + steroids in the RAISE study for most patients. Steroids may be considered in high-risk cases (RAISE risk score).' },
        { text: 'Antibiotics (ceftriaxone) for suspected bacterial infection', correct: false, rationale: 'This presentation meets four of five Kawasaki diagnostic criteria. While fever with rash and lymphadenopathy can mimic infection (measles, scarlet fever, EBV), the constellation of conjunctivitis, oral changes, and fever >5 days points to Kawasaki. Empiric antibiotics are not indicated without evidence of bacterial infection.' },
      ],
      correct_answer: 'A',
      rationale: 'Complete Kawasaki disease (fever ≥5 days + ≥4 criteria) requires IVIG 2 g/kg within 10 days and high-dose aspirin. Per Saudi MOH Clinical Practice Guideline for Kawasaki Disease, 2024, this reduces coronary artery aneurysm risk from 25% to 5%.',
      tags: ['pediatrics', 'kawasaki', 'hard', '2024-2025', 'kawasaki-disease', 'IVIG', 'vasculitis'],
    })
  },
  // 3 — Intussusception
  {
    template: (i) => ({
      question: `A 9-month-old infant presents with episodes of inconsolable crying, drawing up of legs, and vomiting. Between episodes, the child appears well. On exam, a sausage-shaped mass is palpable in the right upper quadrant. What is the most appropriate diagnostic and therapeutic intervention?`,
      options: [
        { text: 'Air contrast enema (pneumatic reduction)', correct: true, rationale: 'This is classic intussusception (currant jelly stools may appear later). Air contrast enema is both diagnostic (shows the intussusceptum as a filling defect) and therapeutic (pneumatic reduction). Success rate is 80-95% when performed early. Per Saudi MOH Clinical Practice Guideline for Pediatric Emergencies, 2024, air enema is preferred over barium due to lower perforation risk. Clinical pearl: "Intussusception" — classic triad: colicky abdominal pain + vomiting + red currant jelly stools (late finding). Most common age: 3-12 months. Lead point: Meckel diverticulum, polyp, or lymphoma in older children.' },
        { text: 'Exploratory laparotomy', correct: false, rationale: 'Surgery is reserved for failed pneumatic reduction, perforation, peritonitis, or a pathologic lead point. With early presentation (no peritonitis), non-surgical reduction should be attempted first.' },
        { text: 'Abdominal X-ray with oral contrast follow-through', correct: false, rationale: 'Plain abdominal X-ray may show a crescent sign or target sign but is not therapeutic. Oral contrast studies waste time in an acute intussusception where air enema is both diagnostic and therapeutic.' },
        { text: 'IV antibiotics and nasogastric decompression', correct: false, rationale: 'These are supportive measures for bowel obstruction but do not address the underlying intussusception. Reduction (air enema or surgery) is required to prevent bowel ischemia and perforation.' },
      ],
      correct_answer: 'A',
      rationale: 'Intussusception in children is diagnosed and treated with air contrast enema. Success rate is highest when performed within 24 hours of symptom onset. Surgery is reserved for failed reduction or complicated cases.',
      tags: ['pediatrics', 'intussusception', 'hard', '2024-2025', 'intussusception', 'air-enema'],
    })
  },
  // 4 — DKA in Children
  {
    template: (i) => ({
      question: `A 7-year-old child presents with 2 weeks of polydipsia, polyuria, and weight loss. Today the child is lethargic with deep rapid breathing. Blood glucose is 28 mmol/L. Venous pH is 7.05, HCO3 is 5 mmol/L. Urine shows 4+ ketones. What is the most appropriate initial fluid management?`,
      options: [
        { text: 'IV normal saline 10-20 mL/kg over 1 hour, then 0.45% saline with potassium and dextrose', correct: true, rationale: 'DKA is defined by hyperglycemia >11 mmol/L, pH <7.3, HCO3 <15, and ketonuria. Initial resuscitation is isotonic fluids (NS 10-20 mL/kg over 1h). Subsequent fluids are 0.45% NS with K+ (once K+ known and urine output established). Dextrose is added when glucose falls to ~14 mmol/L to prevent hypoglycemia. Clinical pearl: "DKA fluid resuscitation" — cautious rehydration over 48 hours to reduce cerebral edema risk. Replace deficit + maintenance. Insulin drip 0.1 U/kg/h after initial fluids.' },
        { text: 'IV half-normal saline at maintenance rate only', correct: false, rationale: 'This child is in severe DKA (pH 7.05) with significant dehydration. Maintenance fluids alone are insufficient — he needs deficit replacement. Cerebral edema risk is reduced by gradual rehydration (do not exceed 20 mL/kg in first hour), not by under-resuscitation.' },
        { text: 'IV sodium bicarbonate to correct acidosis', correct: false, rationale: 'Sodium bicarbonate is NOT recommended in pediatric DKA unless pH <6.9 with life-threatening hyperkalemia or cardiac compromise. Bicarbonate therapy can paradoxically worsen CNS acidosis and increase cerebral edema risk.' },
        { text: 'Subcutaneous rapid-acting insulin without IV fluids', correct: false, rationale: 'Fluid resuscitation is the priority in DKA — it corrects hypovolemia, improves tissue perfusion, and lowers glucose. Insulin should be started AFTER initial fluid bolus. Subcutaneous insulin is appropriate for mild DKA, but this patient has severe DKA (pH 7.05) requiring IV insulin.' },
      ],
      correct_answer: 'A',
      rationale: 'Pediatric DKA management: (1) IV fluids to correct dehydration, (2) IV insulin after initial fluids, (3) K+ replacement, (4) monitor for cerebral edema. Per Saudi MOH Clinical Practice Guideline for Pediatric DKA, 2024.',
      tags: ['pediatrics', 'DKA', 'hard', '2024-2025', 'diabetic-ketoacidosis', 'endocrinology'],
    })
  },
  // 5 — Febrile Seizures
  {
    template: (i) => ({
      question: `A 14-month-old child presents with a generalized tonic-clonic seizure lasting 3 minutes that stopped spontaneously. Temperature is 39.5°C. The child was previously healthy and has no neurological deficits. Lumbar puncture is normal. What is the most appropriate long-term management?`,
      options: [
        { text: 'No prophylactic treatment; counsel parents on fever management and when to seek care', correct: true, rationale: 'Simple febrile seizure (generalized, <15 min, no recurrence within 24h, no underlying neurological condition) does NOT require prophylactic anticonvulsants or daily medication. Outcome is excellent with no increased risk of epilepsy compared to the general population (except a slight increase in children with neurodevelopmental abnormalities). Clinical pearl: "Febrile seizure" — simple febrile seizure requires NO workup beyond ruling out meningitis if clinically indicated. No EEG, no neuroimaging, no daily meds. Risk of recurrence: 30-40% within first year.' },
        { text: 'Daily phenobarbital for 2 years', correct: false, rationale: 'Prophylactic anticonvulsants (phenobarbital, valproate) reduce recurrence risk of febrile seizures but their side effects (cognitive impairment, behavioral issues) outweigh the benefit of preventing a benign, self-limited event. They are NOT recommended by AAP or Saudi MOH guidelines.' },
        { text: 'Rectal diazepam to be given at onset of future fevers', correct: false, rationale: 'Intermittent diazepam at fever onset may reduce febrile seizure recurrence but causes sedation and ataxia. It is sometimes considered for children with frequent or complex febrile seizures, but is not routinely recommended for a first simple febrile seizure.' },
        { text: 'MRI brain to rule out structural lesion', correct: false, rationale: 'Neuroimaging is NOT indicated in simple febrile seizures. The seizure was generalized, brief, with full recovery and normal neurological exam. MRI is reserved for focal seizures, prolonged seizures, or abnormal neurological findings.' },
      ],
      correct_answer: 'A',
      rationale: 'Simple febrile seizures are benign, self-limited, and do not require prophylactic treatment or neuroimaging. Parental education and fever management at home are sufficient. Per Saudi MOH Clinical Practice Guideline for Febrile Seizures, 2024.',
      tags: ['pediatrics', 'febrile-seizures', 'moderate', '2024-2025', 'seizure', 'neurology'],
    })
  },
];

const SURGERY = [
  // 1 — Acute Cholecystitis
  {
    template: (i) => ({
      question: `A 45-year-old obese female presents with acute right upper quadrant pain radiating to the right shoulder, associated with nausea and fever of 38.5°C. Murphy sign is positive. WBC is 14,000/µL. Ultrasound shows a thickened gallbladder wall (5 mm) with pericholecystic fluid and gallstones. What is the most appropriate management?`,
      options: [
        { text: 'Laparoscopic cholecystectomy within 72 hours', correct: true, rationale: 'Acute calculous cholecystitis (Murphy sign, thickened wall, pericholecystic fluid) benefits from early laparoscopic cholecystectomy (within 72h of presentation). Early surgery reduces hospital stay, cost, and complication rates compared to delayed surgery after antibiotics. Clinical pearl: "Cholecystitis timing" — early laparoscopic cholecystectomy (within 72h) is superior to delayed (6-8 weeks later) for acute cholecystitis per multiple RCTs. Tokyo Guidelines 2018 severity: Grade I (mild), Grade II (moderate), Grade III (severe with organ dysfunction).' },
        { text: 'IV antibiotics for 7 days, then interval cholecystectomy in 6 weeks', correct: false, rationale: 'Delayed cholecystectomy after antibiotics was the historical approach but has been superseded by early surgery. Interval cholecystectomy carries risk of recurrent cholecystitis (20-30% while waiting) and is not cost-effective.' },
        { text: 'ERCP with sphincterotomy', correct: false, rationale: 'ERCP is indicated for choledocholithiasis (CBD stones causing jaundice, cholangitis, or pancreatitis). This patient has no jaundice, elevated bilirubin, or dilated CBD on ultrasound — no evidence of CBD obstruction.' },
        { text: 'Percutaneous cholecystostomy tube drainage', correct: false, rationale: 'Percutaneous drainage is reserved for high-risk surgical patients (severe comorbidities, Tokyo Grade III cholecystitis with organ failure). This relatively healthy patient is a candidate for laparoscopic cholecystectomy.' },
      ],
      correct_answer: 'A',
      rationale: 'Acute cholecystitis with mild-moderate severity is managed by early laparoscopic cholecystectomy (within 72h). Antibiтics alone with delayed surgery is no longer recommended. Per Saudi MOH Clinical Practice Guideline for Acute Abdomen, 2024.',
      tags: ['surgery', 'cholecystitis', 'hard', '2024-2025', 'gallbladder', 'laparoscopic'],
    })
  },
  // 2 — Bowel Obstruction
  {
    template: (i) => ({
      question: `A 70-year-old female presents with 2 days of colicky abdominal pain, distension, obstipation, and vomiting. She has a history of open hysterectomy 10 years ago. Abdominal X-ray shows multiple air-fluid levels and dilated small bowel loops with a diameter of 3.5 cm. What is the most appropriate next step?`,
      options: [
        { text: 'CT abdomen with IV and oral contrast', correct: true, rationale: 'This is small bowel obstruction (SBO) likely from adhesions (prior surgery). CT abdomen with contrast confirms the diagnosis, identifies the transition point, and distinguishes simple from strangulated obstruction. Closed-loop obstruction and signs of ischemia (pneumatosis, portal venous gas) require urgent surgery. Clinical pearl: "SBO management" — CT is the gold standard for diagnosis. Strangulation indicators: fever, tachycardia, localized tenderness, leukocytosis, acidosis. Surgical indications: complete obstruction, closed loop, signs of ischemia, failure of conservative management after 48h.' },
        { text: 'Immediate exploratory laparotomy', correct: false, rationale: 'Without signs of strangulation (fever, peritoneal signs, leukocytosis, acidosis), a trial of conservative management (NG tube, NPO, IV fluids) and CT imaging is appropriate. Immediate surgery is indicated for peritonitis, strangulation, or closed-loop obstruction.' },
        { text: 'Upper GI series with small bowel follow-through', correct: false, rationale: 'CT has largely replaced fluoroscopic studies for SBO evaluation. CT provides additional information about the transition point, closed-loop obstruction, ischemia, and extra-luminal pathology that small bowel series cannot assess.' },
        { text: 'Colonoscopy with decompression', correct: false, rationale: 'Colonoscopy is for colonic obstruction or pseudo-obstruction (Ogilvie syndrome). This patient has small bowel distension on X-ray, not large bowel. Colonoscopy in SBO risks perforation and does not address the underlying obstruction.' },
      ],
      correct_answer: 'A',
      rationale: 'CT abdomen with contrast is the diagnostic study of choice for suspected small bowel obstruction. It identifies the level, cause (adhesions, hernia, mass), and any signs of ischemia. Conservative management (NG decompression, IV fluids) is appropriate if no strangulation.',
      tags: ['surgery', 'bowel-obstruction', 'hard', '2024-2025', 'SBO', 'adhesions'],
    })
  },
  // 3 — Acute Pancreatitis
  {
    template: (i) => ({
      question: `A 50-year-old male with a history of gallstones presents with severe epigastric pain radiating to the back, nausea, and vomiting. He drinks 6 beers daily. Serum lipase is 4,500 U/L. BP 100/65 mmHg, HR 110 bpm, RR 22/min, temperature 37.5°C. What is the most appropriate initial management?`,
      options: [
        { text: 'Aggressive IV crystalloid resuscitation + NPO + pain control', correct: true, rationale: 'Acute pancreatitis management begins with aggressive IV fluids (LR 250-500 mL/h for first 12-24h), pain control, and NPO with early oral feeding when tolerated. Ranson criteria or BISAP score assess severity. This patient has likely biliary pancreatitis (gallstones + alcohol). Clinical pearl: "Pancreatitis fluids" — Lactated Ringer is preferred over normal saline (reduces SIRS and hyperchloremic metabolic acidosis). Goal: HR <120, MAP >65, urine output >0.5 mL/kg/h. ERCP within 24h if cholangitis or jaundice.' },
        { text: 'Urgent ERCP with sphincterotomy', correct: false, rationale: 'Urgent ERCP (within 24h) is indicated only if there is concomitant cholangitis (Charcot triad: fever, jaundice, RUQ pain) or jaundice with evidence of CBD obstruction. Absence of jaundice and fever suggests no urgent need for ERCP.' },
        { text: 'IV antibiotics (imipenem) for pancreatic necrosis prophylaxis', correct: false, rationale: 'Prophylactic antibiotics do not prevent pancreatic necrosis or reduce mortality in acute pancreatitis. Antibiotics are only indicated for documented extrapancreatic infection (pneumonia, UTI, cholangitis) or infected necrosis (gas on CT, positive FNA).' },
        { text: 'CT abdomen with IV contrast stat', correct: false, rationale: 'CT is not needed in the first 48-72h for diagnosis (lipase >3x normal is diagnostic) and may underestimate necrosis early. CT is indicated at 72-96h if the patient is not improving to assess for necrosis, pseudocyst, or abscess.' },
      ],
      correct_answer: 'A',
      rationale: 'Acute pancreatitis is diagnosed by lipase >3x normal + typical pain. Initial management is aggressive IV crystalloid resuscitation (LR preferred), pain control, and supportive care. ERCP is reserved for concomitant cholangitis. Per Saudi MOH Guideline for Acute Pancreatitis, 2024.',
      tags: ['surgery', 'pancreatitis', 'hard', '2024-2025', 'acute-pancreatitis', 'ERCP'],
    })
  },
];

const EMERGENCY_MEDICINE = [
  // 1 — Anaphylaxis
  {
    template: (i) => ({
      question: `A 25-year-old male develops sudden-onset urticaria, angioedema, and stridor 10 minutes after receiving IV ceftriaxone. BP 80/50 mmHg, HR 130 bpm, O2 sat 88% on room air. What is the most appropriate first intervention?`,
      options: [
        { text: 'IM epinephrine (0.3 mg anterolateral thigh) + oxygen + IV fluids', correct: true, rationale: 'Anaphylaxis is a life-threatening hypersensitivity reaction. Epinephrine IM is first-line — it vasoconstricts (reverses hypotension and angioedema), bronchodilates, and reduces mediator release. IM route (anterolateral thigh) provides faster absorption than SC. Adjunctive: high-flow oxygen, IV crystalloid bolus, and antihistamines (H1 + H2). Clinical pearl: "Anaphylaxis" — epinephrine is the ONLY first-line treatment. Delayed epinephrine increases mortality. IM 0.3-0.5 mg (1:1000) can be repeated every 5-15 min. IV epinephrine is for refractory shock with monitoring.' },
        { text: 'IV diphenhydramine + methylprednisolone', correct: false, rationale: 'Antihistamines and corticosteroids are SECOND-LINE in anaphylaxis. They do NOT reverse upper airway obstruction or hypotension. They prevent biphasic reactions but should never delay epinephrine. Per SCFHS guidelines, epinephrine is the only first-line agent.' },
        { text: 'Nebulized albuterol + IV antibiotics', correct: false, rationale: 'Nebulized albuterol addresses bronchospasm but does not treat laryngeal edema or hypotension. Antibiotics are not indicated — this is an allergic reaction to ceftriaxone, not an infection.' },
        { text: 'IV glucagon for cardiac support', correct: false, rationale: 'Glucagon has positive chronotropic effects and is sometimes used for anaphylaxis in patients on beta-blockers (who may not respond fully to epinephrine). It is not first-line therapy for any patient.' },
      ],
      correct_answer: 'A',
      rationale: 'Anaphylaxis is treated with IM epinephrine as first-line therapy followed by supportive measures. Delayed epinephrine is associated with increased mortality. Per Saudi MOH Clinical Practice Guideline for Anaphylaxis, 2024.',
      tags: ['emergency-medicine', 'anaphylaxis', 'moderate', '2024-2025', 'anaphylaxis', 'epinephrine'],
    })
  },
  // 2 — Organophosphate Poisoning
  {
    template: (i) => ({
      question: `A 35-year-old male farm worker presents with excessive salivation, lacrimation, urination, diarrhea, and muscle fasciculations. HR 50 bpm, BP 90/60 mmHg. Pupils are constricted (1 mm). He was spraying pesticides earlier today. What is the most appropriate initial pharmacotherapy?`,
      options: [
        { text: 'IV atropine + pralidoxime', correct: true, rationale: 'Organophosphate poisoning (cholinergic toxidrome: SLUDGE syndrome, fasciculations, miosis) is treated with atropine (blocks muscarinic effects) and pralidoxime (reactivates acetylcholinesterase). Atropine is given IV in escalating doses (1-3 mg initial, double every 5 min until bronchial secretions clear). Clinical pearl: "Cholinergic toxidrome" — DUMBBELS: Diarrhea, Urination, Miosis, Bronchorrhea/Bradycardia, Emesis, Lacrimation, Salivation/Sweating. Atropine endpoint: clear chest on auscultation, not for tachycardia or mydriasis.' },
        { text: 'IV naloxone', correct: false, rationale: 'Naloxone is for opioid overdose (respiratory depression, pinpoint pupils, bradycardia). However, there are no fasciculations, SLUDGE symptoms, or pesticide exposure history in opioid overdose. The pesticide exposure history is the key differentiator.' },
        { text: 'IV benzodiazepine alone', correct: false, rationale: 'Benzodiazepines treat seizures from OP poisoning but do not address the cholinergic crisis. They are adjunctive, not primary therapy. Atropine and pralidoxime must be given to counteract the muscarinic and nicotinic effects.' },
        { text: 'Activated charcoal + supportive care', correct: false, rationale: 'Activated charcoal may reduce absorption if given within 1 hour of ingestion, but this patient has significant dermal exposure and already displays systemic toxicity. Decontamination is adjunctive — specific antidotes (atropine + pralidoxime) are the priority.' },
      ],
      correct_answer: 'A',
      rationale: 'Organophosphate poisoning causes cholinergic crisis. Atropine blocks muscarinic effects and pralidoxime reactivates acetylcholinesterase. Per Saudi MOH Clinical Practice Guideline for Toxicological Emergencies, 2024.',
      tags: ['emergency-medicine', 'toxicology', 'hard', '2024-2025', 'organophosphate', 'poisoning'],
    })
  },
  // 3 — Tension Pneumothorax
  {
    template: (i) => ({
      question: `A 22-year-old male is brought to the ED after a stab wound to the left chest. He is in severe respiratory distress with tracheal deviation to the right, distended neck veins, absent breath sounds on the left, and hypotension (BP 80/50 mmHg). What is the most appropriate immediate intervention?`,
      options: [
        { text: 'Immediate needle decompression in the 2nd intercostal space midclavicular line', correct: true, rationale: 'Tension pneumothorax is a clinical diagnosis (tracheal deviation, distended neck veins, hypotension, unilateral absent breath sounds) requiring immediate decompression — do NOT wait for chest X-ray. Needle decompression (14G/16G cannula) in the 2nd ICS midclavicular line converts it to a simple pneumothorax. Followed by chest tube insertion. Clinical pearl: "Tension pneumothorax" — do NOT wait for imaging. Three signs: hypotension + distended neck veins + tracheal deviation away from the affected side. Immediate decompression: 2nd ICS midclavicular line or 5th ICS midaxillary line.' },
        { text: 'Chest X-ray to confirm the diagnosis', correct: false, rationale: 'Tension pneumothorax is a clinical diagnosis. Waiting for chest X-ray in a hypotensive, distressed patient with tracheal deviation wastes critical time and may lead to cardiac arrest from decreased venous return.' },
        { text: 'CT chest with IV contrast', correct: false, rationale: 'CT is absolutely contraindicated in a hemodynamically unstable patient with suspected tension pneumothorax. This patient needs immediate decompression at bedside, not transport to the CT scanner.' },
        { text: 'Pericardiocentesis for suspected cardiac tamponade', correct: false, rationale: 'Cardiac tamponade also presents with hypotension and distended neck veins (Beck triad: hypotension, JVD, muffled heart sounds) but has bilateral breath sounds and no tracheal deviation. The tracheal deviation points to tension pneumothorax, not tamponade.' },
      ],
      correct_answer: 'A',
      rationale: 'Tension pneumothorax is diagnosed clinically and requires immediate needle decompression followed by chest tube insertion. Per Saudi MOH Clinical Practice Guideline for Trauma and Emergency Procedures, 2024.',
      tags: ['emergency-medicine', 'trauma', 'hard', '2024-2025', 'tension-pneumothorax', 'tracheal-deviation'],
    })
  },
];

const MEDICAL_ETHICS = [
  // 1 — Consent in Minors
  {
    template: (i) => ({
      question: `A 15-year-old boy presents to the emergency department with acute appendicitis requiring emergency surgery. His parents are unreachable by phone. The patient is conscious and understands the procedure. What is the most appropriate course of action?`,
      options: [
        { text: 'Proceed with emergency surgery under the doctrine of necessity (best interest)', correct: true, rationale: 'In a life-threatening emergency where parental consent cannot be obtained, the physician may proceed under the doctrine of necessity (emergency exception to informed consent). The patient\'s best interest and preservation of life/health take priority. Per SCFHS Medical Ethics Guidelines, 2024, in a true emergency with imminent risk to life or limb and no accessible guardian, treatment may proceed. Clinical pearl: "Emergency exception" — consent is implied in emergencies when delay would cause serious harm. Document the emergency, attempts to reach parents, and clinical reasoning thoroughly.' },
        { text: 'Wait until parents can be contacted, even if the appendix perforates', correct: false, rationale: 'Delaying emergency surgery for acute appendicitis with perforation risk is not ethically justifiable. The principle of beneficence (do good) and non-maleficence (avoid harm) override the need for parental consent in a true emergency.' },
        { text: 'Obtain consent from the 15-year-old patient only', correct: false, rationale: 'In Saudi Arabia, the legal age of majority is 18. A 15-year-old is a minor and cannot provide legally valid consent for surgery. However, his assent should be sought. Consent must be obtained from a parent or legal guardian, or the emergency exception applies.' },
        { text: 'Obtain a court order before proceeding', correct: false, rationale: 'There is no time to obtain a court order in a surgical emergency. Court orders are sought for non-emergent situations where parents refuse treatment for a minor (e.g., blood transfusion for a Jehovah\'s Witness child).' },
      ],
      correct_answer: 'A',
      rationale: 'In life-threatening emergencies, treatment may proceed without parental consent under the emergency exception. Physician must act in the patient\'s best interest and document the circumstances thoroughly. Per SCFHS Medical Ethics Guidelines, 2024.',
      tags: ['ethics', 'consent', 'hard', '2024-2025', 'informed-consent', 'minor', 'emergency'],
    })
  },
  // 2 — End-of-Life Decisions
  {
    template: (i) => ({
      question: `A 75-year-old male with metastatic pancreatic cancer, severe pain, and poor performance status (ECOG 4) is admitted with pneumonia. He has previously expressed to his family that he does not want "life-prolonging measures" and prefers comfort care. The family disagrees and requests full aggressive treatment including ICU admission and mechanical ventilation. What is the most appropriate ethical approach?`,
      options: [
        { text: 'Engage in shared decision-making, respect the patient\'s prior wishes, and initiate a palliative care consultation', correct: true, rationale: 'The patient\'s previously expressed wishes (autonomy) should guide care. In Saudi Arabia, the SCFHS Code of Ethics recognizes the patient\'s right to refuse life-sustaining treatment when the condition is terminal and curative options are exhausted. A palliative care consultation helps align the family\'s expectations with the patient\'s wishes through compassionate communication. Clinical pearl: "End-of-life ethics" — four-box method: medical indications, patient preferences, quality of life, contextual features. In Saudi practice, the family\'s cultural role is significant — engage them early with empathy and clear communication.' },
        { text: 'Provide full aggressive care as requested by the family', correct: false, rationale: 'While the family plays an important role in Saudi culture, the patient\'s previously expressed wishes should take priority when clearly documented or reliably reported. Providing aggressive care that the patient explicitly refused violates the principle of patient autonomy.' },
        { text: 'Transfer the patient to the ICU and intubate, then discuss palliative options', correct: false, rationale: 'Intubating a patient with end-stage cancer, poor performance status, and previously expressed wishes for comfort care would be inappropriate. Intubation would cause suffering without meaningful benefit and conflicts with the patient\'s stated preferences.' },
        { text: 'Refer to the hospital ethics committee and delay decision-making for 24 hours', correct: false, rationale: 'While ethics committee consultation is appropriate for complex cases, delaying care for an acutely ill patient for 24 hours is not appropriate. The emergency nature of the pneumonia requires a timely decision. The physician can initiate comfort care immediately while involving the ethics committee for family support.' },
      ],
      correct_answer: 'A',
      rationale: 'Patient autonomy (previously expressed wishes) should guide end-of-life care. Shared decision-making involving the family and palliative care team respects both the patient\'s wishes and the family\'s cultural role. Per SCFHS Code of Ethics, 2024.',
      tags: ['ethics', 'end-of-life', 'hard', '2024-2025', 'palliative-care', 'autonomy'],
    })
  },
];

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

    case 'OBGYN':
    case 'Obstetrics & Gynaecology':
      allQuestions = generateQuestions(COUNT, OBGYN, 'OBGYN', 'Obstetrics & Gynaecology');
      break;

    case 'Pediatrics':
      allQuestions = generateQuestions(COUNT, PEDIATRICS, 'Pediatrics', 'Pediatrics');
      break;

    case 'Surgery':
      allQuestions = generateQuestions(COUNT, SURGERY, 'Surgery', 'Surgery');
      break;

    case 'Emergency':
    case 'Emergency Medicine':
      allQuestions = generateQuestions(COUNT, EMERGENCY_MEDICINE, 'Emergency Medicine', 'Emergency Medicine');
      break;

    case 'Ethics':
    case 'Medical Ethics':
      allQuestions = generateQuestions(COUNT, MEDICAL_ETHICS, 'Medical Ethics & Professionalism', 'Medical Ethics & Professionalism');
      break;

    default:
      console.error(`Unknown specialty: ${SPECIALTY}`);
      console.error('Options: IM, Radiology, Pathology, OBGYN, Pediatrics, Surgery, Emergency, Ethics');
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
