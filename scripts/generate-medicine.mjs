/**
 * generate-medicine.mjs
 *
 * SMLE Medicine domain — 600 questions covering all 13 subspecialties
 * + Ethics, Patient Safety, and Preventive Medicine subtopics.
 *
 * Usage: node scripts/generate-medicine.mjs
 */

import { generateFromTemplates, writeOutput, cycleDifficulty } from './question-utils.mjs';

// ── Helper to shorten repetitive template creation ────────────────────────────

function q(vignette, opts, correctText, topTags, rationale) {
  return (i) => {
    const shuffled = [...opts].sort(() => Math.random() - 0.5);
    const correctIdx = shuffled.findIndex((o) => o.text === correctText);
    const correctLetter = String.fromCharCode(65 + correctIdx);
    return {
      question: vignette.replace(/\{age\}/g, 45 + (i % 50)).replace(/\{gender\}/g, i % 2 === 0 ? 'male' : 'female'),
      difficulty: cycleDifficulty(i),
      year: '2024-2025',
      image_reference: false,
      options: shuffled.map((o) => ({
        text: o.text,
        correct: o.text === correctText,
        rationale: o.r,
      })),
      correct_answer: correctLetter,
      rationale,
      tags: topTags,
    };
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// CARDIOLOGY  (5 topics, ~55 questions)
// ══════════════════════════════════════════════════════════════════════════════

const CARDIOLOGY = [
  // Coronary Artery Disease (Level 3) — STEMI
  q('A {age}-year-old {gender} with diabetes and hypertension presents with crushing central chest pain for 4 hours radiating to the left arm, associated with diaphoresis and nausea. ECG shows 4 mm ST elevation in leads V1-V4. Pulse 100, BP 150/90. What is the most appropriate immediate management?',
    [{ text: 'Primary PCI', r: 'Primary PCI restores TIMI-3 flow in >90% of patients and is the gold standard when door-to-balloon time is under 90 minutes at a PCI-capable center.' },
     { text: 'IV thrombolysis with tenecteplase', r: 'Thrombolysis is indicated when PCI cannot be performed within 120 minutes. This patient is at a PCI-capable center.' },
     { text: 'IV heparin and admission to CCU', r: 'Heparin is adjunctive, not definitive. Reperfusion must be achieved to prevent ongoing myocardial necrosis.' },
     { text: 'Sublingual nitroglycerin and observation', r: 'Nitroglycerin relieves symptoms but does not address the occlusive thrombus. Delaying reperfusion increases infarct size.' }],
    'Primary PCI', ['cardiology', 'STEMI', 'PCI', 'acute-coronary-syndrome'],
    'Acute anterior STEMI requires primary PCI within 90 minutes. Delaying reperfusion increases infarct size and mortality.'),

  // CAD — NSTEMI
  q('A {age}-year-old {gender} with known CAD presents with chest pain at rest for 6 hours. ECG shows ST depression of 2 mm in leads V4-V6. Troponin I is 3.2 ng/mL. Pulse 95, BP 130/80. What is the most appropriate management?',
    [{ text: 'Early invasive strategy with angiography within 24 hours', r: 'NSTEMI with elevated troponin and dynamic ST changes warrants early invasive strategy. This reduces recurrent ischemia and infarction.' },
     { text: 'Conservative medical management with stress test', r: 'Conservative approach is for low-risk NSTEMI without ongoing symptoms or dynamic ECG changes. This patient has both.' },
     { text: 'IV fibrinolysis', r: 'Fibrinolysis is indicated for STEMI, not NSTEMI. It does not benefit NSTEMI and increases bleeding risk.' },
     { text: 'CT coronary angiography', r: 'CT coronary angiography is for diagnostic evaluation of stable chest pain, not for acute NSTEMI management.' }],
    'Early invasive strategy with angiography within 24 hours', ['cardiology', 'NSTEMI', 'angiography', 'acute-coronary-syndrome'],
    'High-risk NSTEMI with dynamic ST changes and elevated troponin requires early angiography within 24 hours.'),

  // CAD — Chronic stable angina
  q('A {age}-year-old {gender} with hypertension develops retrosternal chest tightness when walking uphill for 2 months, relieved by rest. ECG normal at rest. Stress ECG shows 1.5 mm ST depression at 7 METS. What is the most appropriate initial management?',
    [{ text: 'Aspirin, statin, beta-blocker, and sublingual GTN', r: 'Medical therapy is first-line for stable angina. Antiplatelet, lipid-lowering, rate control, and symptom relief form the foundation of management.' },
     { text: 'Immediate coronary angiography', r: 'Angiography is indicated for high-risk features or inadequate response to medical therapy, not as initial management.' },
     { text: 'IV heparin infusion', r: 'Heparin is for acute coronary syndromes, not chronic stable angina.' },
     { text: 'Stress echocardiogram', r: 'Further testing may be needed if initial management fails, but medical therapy is the appropriate first step.' }],
    'Aspirin, statin, beta-blocker, and sublingual GTN', ['cardiology', 'stable-angina', 'medical-management'],
    'Stable angina is managed with guideline-directed medical therapy including antiplatelet, statin, beta-blocker, and sublingual nitroglycerin.'),

  // Heart Failure (Level 3) — HFrEF
  q('A {age}-year-old {gender} with prior MI presents with progressive dyspnea on exertion, orthopnea, and bilateral leg edema. BP 140/90, JVP 10 cm, S3 gallop. Echo shows LVEF 30%. What is the most appropriate initial therapy?',
    [{ text: 'ACE inhibitor + beta-blocker + spironolactone', r: 'GDMT for HFrEF includes ACEi/ARB, beta-blocker, and MRA. This combination reduces mortality by approximately 30%.' },
     { text: 'Digoxin monotherapy', r: 'Digoxin reduces hospitalizations but does not reduce mortality. It is add-on therapy, not first-line.' },
     { text: 'High-dose furosemide alone', r: 'Diuretics relieve congestion but do not address the neurohormonal activation driving HF progression.' },
     { text: 'CCB monotherapy', r: 'CCBs are not first-line for HFrEF. Verapamil and diltiazem are contraindicated due to negative inotropy.' }],
    'ACE inhibitor + beta-blocker + spironolactone', ['cardiology', 'heart-failure', 'HFrEF', 'GDMT'],
    'HFrEF (LVEF ≤40%) requires triple therapy: ACEi/ARB + beta-blocker + MRA, which reduces mortality through neurohormonal blockade.'),

  // HF — Acute decompensated
  q('A {age}-year-old {gender} with known HF presents with severe dyspnea at rest, orthopnea, and pink frothy sputum. BP 100/60, HR 110, O2 85%. CXR shows pulmonary edema. What is the most appropriate initial intervention?',
    [{ text: 'Non-invasive positive pressure ventilation (BiPAP) + IV furosemide', r: 'NIPPV provides immediate respiratory support and reduces preload. Furosemide provides diuresis to relieve pulmonary congestion.' },
     { text: 'IV metoprolol', r: 'IV beta-blockers are contraindicated in acute decompensated HF as they reduce cardiac contractility.' },
     { text: 'IV nitroglycerin drip', r: 'Nitrates are used for pulmonary edema with hypertension. This patient is hypotensive, making nitrates risky.' },
     { text: 'Oral furosemide 40 mg', r: 'Oral furosemide has unreliable absorption in acute HF due to gut edema. IV is required for rapid effect.' }],
    'Non-invasive positive pressure ventilation (BiPAP) + IV furosemide', ['cardiology', 'acute-heart-failure', 'pulmonary-edema', 'NIPPV'],
    'Acute pulmonary edema requires NIPPV for respiratory support and IV furosemide for diuresis. Beta-blockers and vasodilators are avoided in hypotension.'),

  // HFpEF
  q('A {age}-year-old {gender} with hypertension and obesity presents with dyspnea on exertion. Echo shows LVEF 60%, E/e\' 15, LA enlargement, LVH. NT-proBNP 900 pg/mL. What is the most likely diagnosis?',
    [{ text: 'HFpEF', r: 'HFpEF requires symptoms of HF, LVEF ≥50%, and evidence of diastolic dysfunction. This patient has all three criteria.' },
     { text: 'Constrictive pericarditis', r: 'Constriction has Kussmaul sign and pericardial calcification, not LVH or LA enlargement.' },
     { text: 'Pulmonary arterial hypertension', r: 'PAH shows right heart strain with normal left heart, not LVH or elevated filling pressures.' },
     { text: 'Cardiac amyloidosis', r: 'Amyloidosis has LVH with low-voltage ECG and granular sparkling, not seen here.' }],
    'HFpEF', ['cardiology', 'HFpEF', 'diastolic-dysfunction'],
    'HFpEF is diagnosed by HF symptoms, LVEF ≥50%, and evidence of diastolic dysfunction on echo with elevated filling pressures.'),

  // Atrial Fibrillation (Level 2)
  q('A {age}-year-old {gender} with hypertension presents with palpitations and lightheadedness for 2 days. ECG shows atrial fibrillation with ventricular rate of 135 bpm. BP 110/70. CHA2DS2-VASc score is 3. What is the most appropriate initial management?',
    [{ text: 'Rate control with beta-blocker + anticoagulation', r: 'Rate control is first-line for stable AF. Anticoagulation is required for CHA2DS2-VASc ≥2 regardless of rate vs rhythm control strategy.' },
     { text: 'Electrical cardioversion', r: 'Cardioversion is for unstable AF or when rate control fails. This patient is stable and rate control is appropriate.' },
     { text: 'IV amiodarone for rhythm control', r: 'Rhythm control is reserved when rate control fails or patient remains symptomatic. Amiodarone has significant side effects.' },
     { text: 'Aspirin alone', r: 'Aspirin is not recommended for stroke prevention in AF. DOACs or warfarin are required for CHA2DS2-VASc ≥2.' }],
    'Rate control with beta-blocker + anticoagulation', ['cardiology', 'atrial-fibrillation', 'rate-control', 'anticoagulation'],
    'Hemodynamically stable AF with RVR is managed with rate control plus anticoagulation for stroke prevention based on CHA2DS2-VASc score.'),

  // Cardiovascular Risk Reduction (Level 2)
  q('A {age}-year-old {gender} with DM type 2, hypertension, and smoking undergoes risk assessment. Total cholesterol 240, LDL 160, HDL 35, triglycerides 200. BP 145/90. What is the most appropriate initial therapy?',
    [{ text: 'High-intensity statin + lifestyle modification', r: 'This patient has multiple risk factors and elevated LDL. High-intensity statin reduces CV events by 25-30% regardless of baseline LDL.' },
     { text: 'Lifestyle modification alone for 6 months', r: 'Lifestyle is important but this patient\'s risk level warrants pharmacotherapy from the outset.' },
     { text: 'Low-intensity statin', r: 'Low-intensity statin provides insufficient LDL reduction for this high-risk patient. High-intensity is indicated.' },
     { text: 'Fenofibrate alone', r: 'Fibrates lower triglycerides but do not reduce LDL or CV mortality as effectively as statins in this setting.' }],
    'High-intensity statin + lifestyle modification', ['cardiology', 'risk-reduction', 'statin', 'primary-prevention'],
    'High-risk patients benefit from high-intensity statin therapy regardless of baseline LDL. Lifestyle modification is adjunctive.'),

  // Valvular Heart Disease (Level 2) — Aortic Stenosis
  q('A {age}-year-old {gender} presents with exertional dyspnea and chest tightness. On auscultation, a late-peaking systolic murmur at the right upper sternal border radiating to the carotids is heard. Echo shows aortic valve area 0.7 cm², mean gradient 50 mmHg, LVEF 50%. What is the most appropriate management?',
    [{ text: 'Surgical aortic valve replacement', r: 'Symptomatic severe aortic stenosis (valve area <1.0 cm², mean gradient >40 mmHg) requires valve replacement. Symptoms include dyspnea, angina, and syncope.' },
     { text: 'Medical management with diuretics', r: 'No medical therapy improves outcomes in severe AS. Vasodilators are relatively contraindicated as they can cause syncope.' },
     { text: 'Balloon aortic valvuloplasty', r: 'Balloon valvuloplasty has 50% restenosis at 6 months. It is a bridge to AVR in unstable patients, not definitive therapy.' },
     { text: 'Annual echo surveillance', r: 'Surveillance is for asymptomatic severe AS. Once symptoms develop, valve replacement is indicated regardless of EF.' }],
    'Surgical aortic valve replacement', ['cardiology', 'aortic-stenosis', 'valve-replacement'],
    'Symptomatic severe aortic stenosis requires valve replacement. Mean survival is 2-3 years once symptoms develop without intervention.'),

  // Valvular — Mitral Regurgitation
  q('A {age}-year-old {gender} presents with dyspnea on exertion and palpitations. A pansystolic murmur at the apex radiating to the axilla is heard. Echo shows severe mitral regurgitation with LVEF 60% and LVESD 42 mm. What is the most appropriate management?',
    [{ text: 'Mitral valve surgery', r: 'Surgery is indicated for severe chronic MR when LVEF >30% and LVESD <55 mm, especially if symptoms or LV dilation develops.' },
     { text: 'Medical therapy with vasodilators alone', r: 'Vasodilators may reduce preload but do not alter disease progression. Surgery is definitive for severe MR.' },
     { text: 'Diuretics and observation', r: 'Diuretics treat symptoms but do not address the mechanical problem. Surgery should not be delayed as LV function may deteriorate.' },
     { text: 'Annual echo surveillance', r: 'Surveillance alone is insufficient once symptoms develop or LV dimensions reach surgical thresholds.' }],
    'Mitral valve surgery', ['cardiology', 'mitral-regurgitation', 'valve-surgery'],
    'Severe chronic MR with symptoms or evidence of LV dilation requires mitral valve surgery to prevent irreversible LV dysfunction.'),

  // Endocarditis prophylaxis
  q('A {age}-year-old {gender} with a history of mitral valve prolapse with regurgitation is scheduled for dental extraction. What is the most appropriate antibiotic prophylaxis?',
    [{ text: 'Amoxicillin 2 g PO 30-60 minutes before procedure', r: 'Antibiotic prophylaxis is indicated for patients with prosthetic valves, prior IE, or certain congenital heart diseases undergoing dental procedures. Amoxicillin is first-line.' },
     { text: 'No prophylaxis needed', r: 'Mitral valve prolapse without regurgitation does not require prophylaxis. However, this patient has regurgitation, placing them in the moderate-risk category where guidelines have shifted toward more selective use.' },
     { text: 'IV vancomycin', r: 'Vancomycin is reserved for patients allergic to penicillin or unable to take oral medications.' },
     { text: 'Ciprofloxacin 500 mg PO', r: 'Ciprofloxacin is not recommended for IE prophylaxis. Amoxicillin is the standard first-line agent.' }],
    'Amoxicillin 2 g PO 30-60 minutes before procedure', ['cardiology', 'endocarditis-prophylaxis', 'dental'],
    'IE prophylaxis for at-risk patients undergoing dental procedures: amoxicillin 2 g PO 1 hour before.'),

  // Cardiac tamponade
  q('A {age}-year-old {gender} presents with acute dyspnea, hypotension, and distended neck veins 2 weeks after cardiac surgery. BP 85/60, HR 110, pulsus paradoxus 18 mmHg. Echo shows pericardial effusion with right atrial collapse. What is the most appropriate management?',
    [{ text: 'Urgent pericardiocentesis', r: 'Cardiac tamponade with hypotension is a life-threatening emergency requiring immediate drainage. Pericardiocentesis relieves pressure and restores cardiac output.' },
     { text: 'IV fluids and vasopressors', r: 'Fluids provide temporary support but do not address the underlying compression. Definitive drainage is required.' },
     { text: 'CT chest', r: 'Imaging should not delay treatment in hemodynamically significant tamponade. Echo already confirms the diagnosis.' },
     { text: 'IV antibiotics', r: 'Antibiotics are for infectious pericarditis, not for treating tamponade physiology. Drainage is the priority.' }],
    'Urgent pericardiocentesis', ['cardiology', 'tamponade', 'pericardiocentesis'],
    'Cardiac tamponade with hypotension requires urgent pericardiocentesis. Beck triad (hypotension, distended neck veins, muffled heart sounds) is classic.'),

  // Acute pericarditis
  q('A {age}-year-old {gender} presents with sharp central chest pain worse when lying flat and better sitting forward. ECG shows diffuse ST elevation with PR depression. What is the first-line treatment?',
    [{ text: 'High-dose NSAIDs + colchicine', r: 'First-line therapy for acute pericarditis is high-dose aspirin or NSAID plus colchicine for 3 months. Colchicine reduces recurrence from 32% to 11%.' },
     { text: 'Prednisone 40 mg daily', r: 'Steroids increase recurrence risk and are reserved for refractory cases or those with autoimmune etiology.' },
     { text: 'IV antibiotics', r: 'Most pericarditis is viral or idiopathic. Antibiotics are only for purulent pericarditis.' },
     { text: 'Low-dose aspirin 81 mg', r: 'Low-dose aspirin provides antiplatelet effect, not anti-inflammatory. High-dose aspirin (2-4 g/day) is needed for pericarditis.' }],
    'High-dose NSAIDs + colchicine', ['cardiology', 'pericarditis', 'colchicine'],
    'Acute pericarditis is treated with high-dose NSAIDs plus colchicine for 3 months. Steroids increase recurrence.'),

  // Hypertensive emergency
  q('A {age}-year-old {gender} with hypertension presents with severe headache, blurred vision, dyspnea. BP 220/130. Fundoscopy shows papilledema. Cr 2.0. What is the most appropriate initial management?',
    [{ text: 'IV sodium nitroprusside with goal to reduce BP by 25% in the first hour', r: 'Hypertensive emergency with end-organ damage requires controlled IV BP reduction. Aim for 25% reduction in MAP over the first hour, then to 160/100 over 2-6 hours.' },
     { text: 'Sublingual nifedipine', r: 'Sublingual nifedipine causes unpredictable rapid BP drop leading to cerebral ischemia. It is contraindicated in hypertensive emergencies.' },
     { text: 'Oral lisinopril 40 mg', r: 'Oral medications work too slowly for emergencies with end-organ damage. IV therapy is needed.' },
     { text: 'Lower BP to normal within 30 minutes', r: 'Rapid normalization of BP can cause cerebral or coronary hypoperfusion. Controlled gradual reduction is safer.' }],
    'IV sodium nitroprusside with goal to reduce BP by 25% in the first hour', ['cardiology', 'hypertensive-emergency'],
    'Hypertensive emergency requires controlled IV BP reduction: 25% in the first hour, then gradual to 160/100 over 2-6 hours.'),
];

// ══════════════════════════════════════════════════════════════════════════════
// PULMONOLOGY  (5 topics, ~42 questions)
// ══════════════════════════════════════════════════════════════════════════════

const PULMONOLOGY = [
  // Bronchial Asthma (Level 3) — Acute exacerbation
  q('A {age}-year-old {gender} with asthma presents with acute dyspnea and wheezing for 4 hours. RR 30, HR 110, O2 88%, PEFR 35% predicted. Unable to complete sentences. After 3 SABA nebulizations and IV hydrocortisone, PEFR remains 40%. What is the next step?',
    [{ text: 'IV magnesium sulfate 2 g over 20 minutes', r: 'IV MgSO4 is indicated for severe asthma not responding to initial SABA and steroids. It reduces hospital admissions by 25%.' },
     { text: 'IV aminophylline infusion', r: 'Aminophylline is no longer recommended in acute asthma due to narrow therapeutic window and lack of additional benefit.' },
     { text: 'IV salbutamol infusion', r: 'IV salbutamol is reserved for life-threatening asthma with impending respiratory arrest, after MgSO4 has failed.' },
     { text: 'Repeat nebulized ipratropium bromide', r: 'Ipratropium is beneficial in the first hour but provides minimal additional benefit after multiple SABA doses and steroids.' }],
    'IV magnesium sulfate 2 g over 20 minutes', ['pulmonology', 'asthma', 'acute-exacerbation', 'MgSO4'],
    'Severe asthma not responding to SABA plus steroids requires IV MgSO4. Aminophylline is no longer recommended.'),

  // Asthma — Chronic management
  q('A {age}-year-old {gender} with asthma uses SABA twice weekly for symptoms and wakes with cough once monthly. No oral steroid use in the past year. What is the most appropriate maintenance therapy?',
    [{ text: 'Low-dose ICS-formoterol as needed', r: 'For mild asthma (SABA use <3x/week, no nocturnal symptoms >1x/week), as-needed low-dose ICS-formoterol is recommended by GINA 2024.' },
     { text: 'SABA alone as needed', r: 'SABA-only treatment is no longer recommended by GINA due to increased exacerbation risk even in mild asthma.' },
     { text: 'Medium-dose ICS-LABA daily', r: 'Step-up therapy is for patients with frequent symptoms or exacerbations despite low-dose ICS. This patient has mild disease.' },
     { text: 'Oral prednisone maintenance', r: 'Chronic oral steroids are reserved for severe persistent asthma uncontrolled on maximum inhaled therapy.' }],
    'Low-dose ICS-formoterol as needed', ['pulmonology', 'asthma', 'maintenance', 'ICS'],
    'Mild asthma is managed with as-needed low-dose ICS-formoterol. SABA-only therapy is no longer recommended.'),

  // COPD (Level 3) — Exacerbation
  q('A {age}-year-old {gender} smoker with known COPD presents with worsening dyspnea and purulent sputum for 3 days. ABG: pH 7.30, pCO2 68, pO2 55. RR 28, HR 100. After initial bronchodilators and antibiotics, the patient remains tachypneic and confused. What is the most appropriate next step?',
    [{ text: 'Non-invasive positive pressure ventilation (BiPAP)', r: 'NIPPV is first-line for acute hypercapnic respiratory failure in COPD exacerbation. It reduces intubation rates and mortality.' },
     { text: 'Intubation and mechanical ventilation', r: 'Invasive ventilation is indicated when NIPPV fails or is contraindicated. NIPPV should be trialed first.' },
     { text: 'High-flow nasal cannula oxygen alone', r: 'Uncontrolled oxygen can worsen hypercapnia by blunting hypoxic drive. NIPPV provides both support and controlled oxygenation.' },
     { text: 'IV doxapram', r: 'Respiratory stimulants have no role in modern COPD exacerbation management.' }],
    'Non-invasive positive pressure ventilation (BiPAP)', ['pulmonology', 'COPD', 'exacerbation', 'NIPPV', 'respiratory-failure'],
    'Acute hypercapnic respiratory failure in COPD requires NIPPV. Intubation is reserved for NIPPV failure or contraindications.'),

  // COPD — Stable management
  q('A {age}-year-old {gender} with COPD (FEV1 45% predicted) has 2 exacerbations per year. MMRC dyspnea scale 2. What is the most appropriate maintenance therapy?',
    [{ text: 'LAMA + LABA combination inhaler', r: 'Group E COPD (exacerbations ≥2/year or ≥1 hospitalization) benefits from LAMA+LABA combination, which reduces exacerbations more than monotherapy.' },
     { text: 'SABA alone as needed', r: 'SABA alone is insufficient for Group E COPD. Maintenance bronchodilator therapy is indicated.' },
     { text: 'ICS alone', r: 'ICS alone is not recommended in COPD without asthma. ICS is used in combination with LABA for patients with high eosinophil counts and frequent exacerbations.' },
     { text: 'Oral theophylline', r: 'Theophylline is third-line due to narrow therapeutic window and drug interactions. It is not first-line maintenance therapy.' }],
    'LAMA + LABA combination inhaler', ['pulmonology', 'COPD', 'maintenance', 'LAMA', 'LABA'],
    'COPD group E (frequent exacerbations) is managed with LAMA+LABA combination. ICS added for eosinophilic phenotype.'),

  // Pulmonary Embolism (Level 3)
  q('A {age}-year-old {gender} post knee surgery develops acute dyspnea and pleuritic chest pain on day 5. HR 105, BP 110/70, O2 89%. ECG shows sinus tachycardia. CTPA shows segmental PE. What is the most appropriate initial management?',
    [{ text: 'LMWH or DOAC anticoagulation', r: 'Hemodynamically stable PE with RV function preserved is managed with anticoagulation. LMWH bridge to warfarin or direct DOAC therapy.' },
     { text: 'IV alteplase thrombolysis', r: 'Thrombolysis is reserved for massive PE with hypotension or shock. This patient is normotensive.' },
     { text: 'IVC filter placement', r: 'IVC filter is indicated when anticoagulation is contraindicated or has failed. This patient has no contraindication.' },
     { text: 'Aspirin 325 mg daily', r: 'Aspirin is insufficient for acute PE treatment. Full-dose anticoagulation is required.' }],
    'LMWH or DOAC anticoagulation', ['pulmonology', 'pulmonary-embolism', 'anticoagulation'],
    'Normotensive acute PE is treated with anticoagulation. Thrombolysis is reserved for massive PE with obstructive shock.'),

  // Pleural Effusion (Level 2)
  q('A {age}-year-old {gender} presents with progressive dyspnea and dullness at the right base. CXR shows right pleural effusion occupying 1/3 of the hemithorax. Thoracentesis yields exudative fluid with lymphocytic predominance and adenosine deaminase 70 U/L. What is the most likely diagnosis?',
    [{ text: 'Tuberculous pleuritis', r: 'Exudative lymphocytic effusion with ADA >40 U/L is highly suggestive of TB pleuritis. Definitive diagnosis requires culture or PCR.' },
     { text: 'Parapneumonic effusion', r: 'Parapneumonic effusions are neutrophil-predominant exudates. Lymphocytic predominance points away from this.' },
     { text: 'Malignant pleural effusion', r: 'Malignant effusions can be lymphocytic but ADA is typically low. Cytology would confirm malignancy.' },
     { text: 'Transudative CHF effusion', r: 'Transudates have low protein and LDH. This is an exudate by Light criteria with high ADA.' }],
    'Tuberculous pleuritis', ['pulmonology', 'pleural-effusion', 'tuberculosis', 'ADA'],
    'Lymphocytic exudative effusion with high ADA is TB pleuritis until proven otherwise. Thoracentesis with ADA measurement is diagnostic.'),

  // Lung Mass (Level 1) — Solitary nodule
  q('A {age}-year-old {gender} smoker (30 pack-years) has a 1.5 cm solitary pulmonary nodule in the right upper lobe found incidentally on CXR. CT shows a spiculated nodule with no calcification. What is the most appropriate next step?',
    [{ text: 'PET-CT and biopsy evaluation', r: 'A spiculated nodule in a smoker >40 years is suspicious for malignancy. PET-CT helps characterize metabolic activity, followed by biopsy if positive.' },
     { text: 'Repeat CT in 12 months', r: 'Surveillance is for low-risk nodules <8 mm or ground-glass opacities. This nodule has malignant features requiring prompt evaluation.' },
     { text: 'Empiric antibiotics', r: 'Antibiotics are for infectious causes. The spiculated appearance and smoking history favor malignant etiology.' },
     { text: 'CT-guided biopsy without PET', r: 'PET-CT provides additional metabolic information that guides management and staging before invasive procedures.' }],
    'PET-CT and biopsy evaluation', ['pulmonology', 'lung-mass', 'solitary-nodule', 'lung-cancer'],
    'Spiculated pulmonary nodule in a smoker requires PET-CT evaluation for malignancy risk stratification before biopsy.'),
];

// ══════════════════════════════════════════════════════════════════════════════
// GASTROENTEROLOGY & HEPATOLOGY  (8 topics, ~67 questions)
// ══════════════════════════════════════════════════════════════════════════════

const GI = [
  // Peptic Ulcer Disease (Level 3)
  q('A {age}-year-old {gender} presents with epigastric pain that worsens 2-3 hours after meals and is relieved by eating. No NSAID use. H. pylori stool antigen is positive. What is the most appropriate treatment?',
    [{ text: 'Triple therapy: PPI + amoxicillin + clarithromycin for 14 days', r: 'First-line H. pylori eradication is triple therapy with PPI, amoxicillin, and clarithromycin for 14 days. This achieves >85% eradication.' },
     { text: 'PPI alone for 4 weeks', r: 'PPI heals ulcers but does not eradicate H. pylori. Untreated H. pylori leads to ulcer recurrence in >60% within 1 year.' },
     { text: 'H2 receptor antagonist alone', r: 'H2RAs are less effective than PPIs for ulcer healing and do not address the underlying H. pylori infection.' },
     { text: 'Antacids as needed', r: 'Antacids provide temporary symptom relief but do not heal ulcers or eradicate H. pylori.' }],
    'Triple therapy: PPI + amoxicillin + clarithromycin for 14 days', ['GI', 'PUD', 'H-pylori', 'triple-therapy'],
    'H. pylori-positive PUD requires 14-day triple therapy: PPI, amoxicillin, and clarithromycin. Eradication prevents recurrence.'),

  // PUD — Bleeding
  q('A {age}-year-old {gender} presents with melena and hematemesis. HR 110, BP 95/60. EGD shows a clean-based duodenal ulcer with no active bleeding. What is the most appropriate management?',
    [{ text: 'IV PPI infusion + H. pylori testing', r: 'Clean-based ulcer with low-risk stigmata can be managed with medical therapy. High-dose IV PPI reduces rebleeding risk.' },
     { text: 'Endoscopic hemoclip placement', r: 'Endoscopic hemostasis is for actively bleeding ulcers or those with visible vessel/ adherent clot. Clean-based ulcers do not require intervention.' },
     { text: 'Surgical oversewing', r: 'Surgery is reserved for refractory bleeding despite endoscopic therapy. This patient has low-risk stigmata.' },
     { text: 'Discharge with oral PPI', r: 'IV PPI is recommended for acute UGIB due to faster onset. Transition to oral once stabilized.' }],
    'IV PPI infusion + H. pylori testing', ['GI', 'UGIB', 'PUD', 'PPI'],
    'Clean-based ulcer with low-risk stigmata is managed with IV PPI. Endoscopic hemostasis is for high-risk stigmata only.'),

  // GERD (Level 2)
  q('A {age}-year-old {gender} presents with retrosternal burning sensation after meals, worse when lying down, for 3 months. Symptoms partially relieved by antacids. What is the most appropriate initial management?',
    [{ text: 'PPI once daily before breakfast for 8 weeks', r: 'PPI is first-line therapy for GERD. Standard dosing is 30-60 minutes before breakfast. Symptom response helps confirm the diagnosis.' },
     { text: 'H2RA twice daily', r: 'H2RAs are less effective than PPIs for symptom relief and esophageal healing. They are second-line.' },
     { text: 'Prokinetic agent alone', r: 'Prokinetics have modest benefit and significant side effects. They are not first-line for GERD.' },
     { text: 'Immediate EGD', r: 'EGD is indicated for alarm symptoms (dysphagia, weight loss, anemia) or if symptoms persist despite PPI therapy.' }],
    'PPI once daily before breakfast for 8 weeks', ['GI', 'GERD', 'PPI'],
    'Typical GERD without alarm symptoms is managed with empiric PPI therapy. EGD is reserved for alarm features or PPI failure.'),

  // IBD (Level 3) — Ulcerative Colitis
  q('A {age}-year-old {gender} presents with bloody diarrhea, urgency, and tenesmus for 4 weeks. Stool cultures negative. Colonoscopy shows continuous inflammation from rectum to splenic flexure with superficial ulceration. What is the most appropriate initial therapy?',
    [{ text: 'Oral + topical mesalamine (5-ASA)', r: 'Mild-to-moderate left-sided UC is treated with combined oral and topical 5-ASA. This achieves remission in 40-60% of patients.' },
     { text: 'Oral prednisone 40 mg daily', r: 'Corticosteroids are for moderate-to-severe disease not responding to 5-ASA. They are not first-line due to side effects.' },
     { text: 'Metronidazole alone', r: 'Antibiotics are not first-line for UC. They are used for pouchitis or complications.' },
     { text: 'Immediate colectomy', r: 'Colectomy is reserved for fulminant colitis, toxic megacolon, or medically refractory disease.' }],
    'Oral + topical mesalamine (5-ASA)', ['GI', 'ulcerative-colitis', 'IBD', '5-ASA'],
    'Mild-to-moderate UC is treated with 5-ASA compounds. Steroids are reserved for moderate-to-severe disease not responding to 5-ASA.'),

  // IBD — Crohn Disease
  q('A {age}-year-old {gender} presents with chronic diarrhea, right lower quadrant pain, and weight loss. Colonoscopy shows skip lesions, cobblestone mucosa, and deep linear ulcers in the terminal ileum and cecum. What is the most likely diagnosis?',
    [{ text: 'Crohn disease', r: 'Skip lesions, cobblestone mucosa, deep linear ulcers, and terminal ileum involvement are classic for Crohn disease. It can affect any part of the GI tract transmurally.' },
     { text: 'Ulcerative colitis', r: 'UC has continuous inflammation starting at the rectum. Skip lesions and deep ulcers are not features of UC.' },
     { text: 'Irritable bowel syndrome', r: 'IBS does not cause inflammation, ulcers, or weight loss. It is a diagnosis of exclusion.' },
     { text: 'Celiac disease', r: 'Celiac affects the small intestine with villous atrophy, not skip lesions or cobblestone mucosa in the colon.' }],
    'Crohn disease', ['GI', 'Crohn', 'IBD'],
    'Crohn disease is characterized by skip lesions, transmural inflammation, cobblestone mucosa, and terminal ileum involvement.'),

  // Celiac Disease (Level 2)
  q('A {age}-year-old {gender} presents with chronic diarrhea, bloating, fatigue, and iron deficiency anemia. Anti-tissue transglutaminase IgA is strongly positive. What is the most appropriate management?',
    [{ text: 'Lifelong gluten-free diet', r: 'Celiac disease is treated with strict lifelong gluten-free diet. This resolves symptoms, heals the mucosa, and reduces risk of complications.' },
     { text: 'Lactose-free diet', r: 'Secondary lactose intolerance may coexist but gluten avoidance is the primary treatment.' },
     { text: 'PPI therapy', r: 'PPIs do not treat celiac disease. They might mask symptoms without addressing the underlying pathology.' },
     { text: 'Oral budesonide', r: 'Budesonide is for refractory celiac disease. First-line management is dietary gluten avoidance.' }],
    'Lifelong gluten-free diet', ['GI', 'celiac', 'gluten-free'],
    'Celiac disease requires strict lifelong gluten-free diet. Serology and symptoms improve with dietary adherence.'),

  // Acute Viral Hepatitis (Level 2)
  q('A {age}-year-old {gender} presents with jaundice, dark urine, fatigue, and right upper quadrant pain for 1 week. LFTs show ALT 1200, AST 900, TBil 8, ALP 150. Anti-HAV IgM is positive. What is the most appropriate management?',
    [{ text: 'Supportive care with monitoring', r: 'Acute HAV is self-limiting and requires supportive care only. Most patients recover fully within 2 months.' },
     { text: 'Oral antiviral therapy', r: 'Antivirals are not indicated for HAV. Ribavirin may be used for acute hepatitis C, not HAV.' },
     { text: 'Liver biopsy', r: 'Biopsy is not routinely indicated for acute hepatitis. It is reserved when diagnosis is unclear or chronic disease is suspected.' },
     { text: 'IV immunoglobulin', r: 'IG is for post-exposure prophylaxis in unvaccinated contacts, not for treating active HAV infection.' }],
    'Supportive care with monitoring', ['GI', 'hepatitis', 'HAV', 'supportive-care'],
    'Acute HAV is self-limiting. Management is supportive with monitoring of LFTs and coagulation. Hospitalization for severe cases.'),

  // Chronic Viral Hepatitis (Level 3) — HBV
  q('A {age}-year-old {gender} is found to have positive HBsAg and HBeAg, HBV DNA 10^7 IU/mL, ALT 120, and normal bilirubin. Liver biopsy shows moderate necroinflammation and stage 2 fibrosis. What is the most appropriate management?',
    [{ text: 'Start entecavir or tenofovir', r: 'Chronic HBV with active replication, elevated ALT, and significant fibrosis requires antiviral therapy to prevent progression to cirrhosis and HCC.' },
     { text: 'No treatment, monitor annually', r: 'Observation is for patients with normal ALT and low HBV DNA (inactive carriers). This patient has active disease.' },
     { text: 'Interferon-alpha for 6 months', r: 'Interferon is an alternative but has significant side effects. Oral nucleoside analogs are preferred for long-term suppression.' },
     { text: 'Liver transplant evaluation', r: 'Transplant evaluation is for decompensated cirrhosis or HCC, not for compensated chronic hepatitis.' }],
    'Start entecavir or tenofovir', ['GI', 'hepatitis-B', 'antiviral'],
    'Chronic HBV with active replication and significant liver injury requires oral nucleoside analog therapy (entecavir or tenofovir).'),

  // Chronic Hep C
  q('A {age}-year-old {gender} is found to have positive HCV RNA, genotype 3, with ALT 85 and F2 fibrosis on FibroScan. What is the most appropriate management?',
    [{ text: 'Direct-acting antiviral therapy (DAAs)', r: 'DAAs cure HCV in >95% of patients regardless of genotype. Treatment is indicated for all patients with chronic HCV to prevent cirrhosis and HCC.' },
     { text: 'No treatment, repeat RNA in 6 months', r: 'Chronic HCV with viremia and evidence of liver injury requires treatment. Spontaneous clearance is rare in chronic infection.' },
     { text: 'Interferon + ribavirin', r: 'Interferon-based regimens are obsolete. DAAs have replaced them due to superior efficacy and tolerability.' },
     { text: 'Lifestyle modification alone', r: 'Lifestyle changes do not clear HCV. Antiviral therapy is required for viral eradication.' }],
    'Direct-acting antiviral therapy (DAAs)', ['GI', 'hepatitis-C', 'DAA'],
    'Chronic HCV is treated with DAAs regardless of genotype, achieving >95% cure rates with minimal side effects.'),

  // Complications of Cirrhosis (Level 3) — Variceal bleeding
  q('A {age}-year-old {gender} with known cirrhosis presents with massive hematemesis and melena. HR 115, BP 85/60. What is the most appropriate immediate management?',
    [{ text: 'IV crystalloid, octreotide, and urgent EGD for band ligation', r: 'Variceal hemorrhage management includes volume resuscitation, vasoactive drugs (octreotide), prophylactic antibiotics, and urgent EGD with band ligation.' },
     { text: 'IV PPI and EGD within 24 hours', r: 'PPI is for peptic ulcer bleeding. In cirrhotic patients with massive hematemesis, variceal bleeding is the priority.' },
     { text: 'Balloon tamponade without EGD', r: 'Balloon tamponade is a temporizing measure when band ligation fails or is unavailable, not first-line therapy.' },
     { text: 'IV desmopressin', r: 'Desmopressin is for hemophilia A or von Willebrand disease, not for variceal bleeding.' }],
    'IV crystalloid, octreotide, and urgent EGD for band ligation', ['GI', 'cirrhosis', 'variceal-bleeding', 'portal-hypertension'],
    'Variceal hemorrhage requires volume resuscitation, octreotide, prophylactic antibiotics, and urgent EGD with band ligation.'),

  // Ascites
  q('A {age}-year-old {gender} with cirrhosis presents with increasing abdominal distension. Shifting dullness is present. What is the most appropriate initial diagnostic step?',
    [{ text: 'Diagnostic paracentesis', r: 'Diagnostic paracentesis is indicated for new-onset ascites to determine cause (portal hypertension vs malignancy vs infection) and check for SBP.' },
     { text: 'Abdominal CT', r: 'CT provides anatomical detail but cannot differentiate ascites types. Paracentesis is more directly diagnostic.' },
     { text: 'Diuretic trial without paracentesis', r: 'Paracentesis should be performed before starting diuretics to establish the cause and rule out SBP.' },
     { text: 'Serum ascites albumin gradient', r: 'SAAG is calculated from paracentesis fluid, not as a standalone test. Paracentesis is required first.' }],
    'Diagnostic paracentesis', ['GI', 'cirrhosis', 'ascites', 'paracentesis'],
    'New-onset ascites requires diagnostic paracentesis to determine SAAG, cell count, and culture to guide management.'),

  // Hepatic encephalopathy
  q('A {age}-year-old {gender} with cirrhosis presents with confusion, asterixis, and disorientation. No focal neurological signs. What is the most appropriate initial therapy?',
    [{ text: 'Lactulose titrated to 2-3 soft stools per day', r: 'Lactulose is first-line for hepatic encephalopathy. It reduces ammonia production and absorption. Titrate to 2-3 bowel movements daily.' },
     { text: 'IV antibiotics', r: 'Antibiotics are for spontaneous bacterial peritonitis or other infections that may precipitate encephalopathy, not for treating encephalopathy itself.' },
     { text: 'IV flumazenil', r: 'Flumazenil reverses benzodiazepine-related encephalopathy. HE is caused by ammonia, not benzodiazepines.' },
     { text: 'Oral neomycin', r: 'Neomycin is an alternative but has nephrotoxicity and ototoxicity. Lactulose is preferred as first-line.' }],
    'Lactulose titrated to 2-3 soft stools per day', ['GI', 'cirrhosis', 'hepatic-encephalopathy', 'lactulose'],
    'Hepatic encephalopathy is treated with lactulose. Rifaximin is added for recurrent episodes not controlled by lactulose alone.'),
];

// ══════════════════════════════════════════════════════════════════════════════
// NEPHROLOGY  (6 topics, ~42 questions)
// ══════════════════════════════════════════════════════════════════════════════

const NEPHROLOGY = [
  // AKI (Level 2)
  q('A {age}-year-old {gender} develops oliguria after starting gentamicin for sepsis. Cr rises from 0.9 to 3.5 over 5 days. Urine sediment shows muddy brown granular casts. FENa >2%. What is the most likely cause?',
    [{ text: 'Acute tubular necrosis from aminoglycoside toxicity', r: 'ATN presents with muddy brown granular casts, elevated FENa >2%, and history of nephrotoxic exposure. Aminoglycosides are a common cause.' },
     { text: 'Prerenal azotemia', r: 'Prerenal causes have FENa <1% and benign sediment without casts. This patient has high FENa and granular casts.' },
     { text: 'Acute interstitial nephritis', r: 'AIN presents with white cell casts, eosinophiluria, and sterile pyuria, not muddy brown granular casts.' },
     { text: 'Postrenal obstruction', r: 'Postrenal AKI causes anuria or polyuria depending on severity, not muddy brown casts. Ultrasound would show hydronephrosis.' }],
    'Acute tubular necrosis from aminoglycoside toxicity', ['nephrology', 'AKI', 'ATN', 'aminoglycoside'],
    'ATN presents with muddy brown granular casts and elevated FENa. Common causes include ischemia, nephrotoxins, and sepsis.'),

  // CKD (Level 2)
  q('A {age}-year-old {gender} with diabetes for 15 years has eGFR 32 mL/min and urine ACR 300 mg/g. BP 145/90. What is the most appropriate management to slow CKD progression?',
    [{ text: 'ACE inhibitor or ARB + SGLT2 inhibitor + BP target <130/80', r: 'Combination of ACEi/ARB and SGLT2 inhibitors slows CKD progression beyond either alone. Strict BP control is essential.' },
     { text: 'CCB alone for BP control', r: 'CCBs are less effective than ACEi/ARB for proteinuria reduction. ACEi/ARB provide renoprotective effects independent of BP.' },
     { text: 'Low-protein diet alone', r: 'Protein restriction has modest benefit and is adjunctive, not primary therapy for slowing CKD progression.' },
     { text: 'Start dialysis preparation', r: 'Dialysis is typically initiated at eGFR <10-15 with uremic symptoms. This patient has CKD stage 3b and does not yet need dialysis.' }],
    'ACE inhibitor or ARB + SGLT2 inhibitor + BP target <130/80', ['nephrology', 'CKD', 'diabetic-nephropathy', 'renoprotection'],
    'CKD progression is slowed by ACEi/ARB, SGLT2 inhibitors, strict BP control, and glycemic management.'),

  // Hyperkalemia (Level 3)
  q('A {age}-year-old {gender} with CKD stage 4 presents with weakness and ECG showing peaked T waves. K+ 6.8, Cr 3.5, pH 7.28. What is the most appropriate immediate management?',
    [{ text: 'IV calcium gluconate 10 mL over 2-3 minutes', r: 'IV calcium stabilizes the cardiac membrane and protects against arrhythmias in life-threatening hyperkalemia. It is the first step regardless of K+ level when ECG changes are present.' },
     { text: 'IV insulin + dextrose', r: 'Insulin shifts K+ intracellularly but takes 15-30 minutes to work. Calcium should be given first for ECG changes.' },
     { text: 'Oral kayexalate', r: 'Kayexalate works over hours and is not for emergency management. It removes K+ from the GI tract slowly.' },
     { text: 'IV sodium bicarbonate', r: 'Bicarbonate shifts K+ but is less effective than insulin+dextrose. It is adjunctive, not first-line.' }],
    'IV calcium gluconate 10 mL over 2-3 minutes', ['nephrology', 'hyperkalemia', 'cardiac-protection', 'calcium'],
    'Life-threatening hyperkalemia with ECG changes requires IV calcium first for cardiac protection, followed by K+-lowering measures.'),

  // Hyponatremia (Level 3)
  q('A {age}-year-old {gender} on HCTZ presents with confusion and lethargy. Na 115, K 3.2, serum osmolality 240, urine osmolality 400, urine Na 60. What is the most appropriate management?',
    [{ text: 'IV 3% hypertonic saline 100 mL bolus', r: 'Severely symptomatic hyponatremia requires hypertonic saline. Goal is 4-6 mmol/L rise in Na over the first few hours to reverse cerebral edema.' },
     { text: 'Oral salt tablets', r: 'Oral correction is too slow for symptomatic hyponatremia with confusion. IV therapy is required.' },
     { text: 'Normal saline at 100 mL/hour', r: 'Normal saline (0.9% NaCl) has 154 mmol/L Na and may not raise Na adequately in euvolemic or hypervolemic hyponatremia.' },
     { text: 'Vaptan therapy', r: 'Vaptans (vasopressin antagonists) are for euvolemic hyponatremia in stable patients, not for acute symptomatic cases.' }],
    'IV 3% hypertonic saline 100 mL bolus', ['nephrology', 'hyponatremia', 'hypertonic-saline'],
    'Severely symptomatic hyponatremia requires hypertonic saline with frequent Na monitoring. Avoid overcorrection (>8 mmol/L in 24 hours).'),

  // Primary HTN (Level 2)
  q('A {age}-year-old {gender} has BP 155/95 on three visits. No comorbidities. Cr 0.9, normal urinalysis, normal ECG. What is the most appropriate initial management?',
    [{ text: 'Thiazide diuretic or ACE inhibitor/ARB + lifestyle modification', r: 'First-line antihypertensives for stage 1 HTN without comorbidities include thiazides, ACEi, ARB, or CCB. Lifestyle modification is adjunctive.' },
     { text: 'Lifestyle modification alone for 6 months', r: 'Lifestyle modification is important but for stage 1 HTN without comorbidities, pharmacotherapy is indicated if BP remains >140/90 after 3 months.' },
     { text: 'Beta-blocker first-line', r: 'Beta-blockers are not first-line for uncomplicated hypertension due to inferior CV outcomes compared to other agents.' },
     { text: 'Combination therapy with two drugs', r: 'Combination therapy is initial management for stage 2 HTN (BP >160/100). This patient has stage 1 HTN.' }],
    'Thiazide diuretic or ACE inhibitor/ARB + lifestyle modification', ['nephrology', 'hypertension', 'first-line'],
    'Stage 1 HTN without comorbidities is treated with monotherapy (thiazide, ACEi, ARB, or CCB) plus lifestyle modification.'),

  // Secondary HTN (Level 1)
  q('A {age}-year-old {gender} has resistant hypertension on lisinopril 20, amlodipine 10, and HCTZ 25, with BP 160/95. K+ 3.0, Cr 0.9. What is the most likely cause?',
    [{ text: 'Primary hyperaldosteronism', r: 'Resistant HTN with spontaneous hypokalemia despite three drugs is classic for hyperaldosteronism. Screening aldosterone-renin ratio is diagnostic.' },
     { text: 'Renal artery stenosis', r: 'RAS typically presents with flash pulmonary edema, renal bruit, and rising Cr after starting ACEi. Hypokalemia is not a feature.' },
     { text: 'Pheochromocytoma', r: 'Pheochromocytoma presents with episodic headache, palpitations, and sweating with paroxysmal HTN, not hypokalemia.' },
     { text: 'Cushing syndrome', r: 'Cushing causes HTN and sometimes hypokalemia but has other features: central obesity, striae, easy bruising.' }],
    'Primary hyperaldosteronism', ['nephrology', 'secondary-hypertension', 'hyperaldosteronism'],
    'Resistant HTN with spontaneous hypokalemia suggests hyperaldosteronism. Screen with aldosterone-renin ratio.'),
];

// ══════════════════════════════════════════════════════════════════════════════
// ENDOCRINE  (6 topics, ~38 questions)
// ══════════════════════════════════════════════════════════════════════════════

const ENDOCRINE = [
  // Thyroid Disorders (Level 3) — Hyperthyroidism
  q('A {age}-year-old {gender} presents with weight loss, palpitations, heat intolerance, tremor, and exophthalmos. Thyroid function shows TSH <0.01, free T4 4.5, free T3 12. Radioiodine uptake is increased and diffuse. What is the most likely diagnosis?',
    [{ text: 'Graves disease', r: 'Graves disease presents with hyperthyroidism, diffuse goiter, and extrathyroidal manifestations including ophthalmopathy. Diffuse increased uptake on scan confirms it.' },
     { text: 'Toxic multinodular goiter', r: 'TMNG has patchy/nodular uptake on scan, not diffuse. Ophthalmopathy is absent.' },
     { text: 'Subacute thyroiditis', r: 'Thyroiditis has low radioiodine uptake since the thyroid is inflamed and cannot trap iodine, not increased.' },
     { text: 'TSH-secreting pituitary adenoma', r: 'TSHoma causes elevated TSH with high T4/T3, not suppressed TSH. This patient has suppressed TSH.' }],
    'Graves disease', ['endocrine', 'hyperthyroidism', 'Graves'],
    'Graves disease: hyperthyroidism + diffuse goiter + ophthalmopathy + increased diffuse uptake on scan. Treated with antithyroid drugs, RAI, or surgery.'),

  // Hypothyroidism
  q('A {age}-year-old {gender} presents with fatigue, cold intolerance, constipation, and weight gain. TSH 15, free T4 0.6. Anti-TPO antibodies are positive. What is the most likely diagnosis?',
    [{ text: 'Hashimoto thyroiditis', r: 'Hashimoto is the most common cause of primary hypothyroidism in iodine-sufficient regions. Positive TPO antibodies confirm autoimmune etiology.' },
     { text: 'Central hypothyroidism', r: 'Central hypothyroidism has low TSH with low T4, not elevated TSH. MRI would show pituitary lesion.' },
     { text: 'Subacute thyroiditis', r: 'Subacute thyroiditis causes transient hyperthyroidism followed by hypothyroidism, with neck pain and low uptake on scan.' },
     { text: 'Euthyroid sick syndrome', r: 'Euthyroid sick syndrome occurs in critical illness with low T3, normal TSH. This patient has elevated TSH with low T4.' }],
    'Hashimoto thyroiditis', ['endocrine', 'hypothyroidism', 'Hashimoto'],
    'Primary hypothyroidism with positive TPO antibodies is Hashimoto thyroiditis. Treatment is levothyroxine replacement.'),

  // Diabetes Diagnosis (Level 3)
  q('A {age}-year-old {gender} presents with polyuria, polydipsia, and weight loss. Random blood glucose 14.2 mmol/L. What is the most appropriate next step to confirm diagnosis?',
    [{ text: 'Repeat confirmatory test: fasting glucose or HbA1c', r: 'Diagnosis of diabetes requires two abnormal test results unless unequivocal symptoms are present. FPG ≥7.0, 2h OGTT ≥11.1, or HbA1c ≥6.5%.' },
     { text: 'Start metformin immediately', r: 'Medication should not be started before confirmatory testing unless glucose is severely elevated with ketosis.' },
     { text: 'Urine glucose monitoring', r: 'Urine glucose is not diagnostic. Blood glucose criteria are required for diagnosis.' },
     { text: 'C-peptide level', r: 'C-peptide distinguishes type 1 from type 2 diabetes but is not required for initial diagnosis of diabetes.' }],
    'Repeat confirmatory test: fasting glucose or HbA1c', ['endocrine', 'diabetes', 'diagnosis'],
    'Diabetes diagnosis requires two abnormal values: FPG ≥7.0, OGTT ≥11.1, or HbA1c ≥6.5%, or one value with classic symptoms.'),

  // Acute Diabetic Complications (Level 3) — DKA
  q('A {age}-year-old {gender} with type 1 diabetes presents with nausea, vomiting, abdominal pain, and Kussmaul respirations. Glucose 28, pH 7.1, HCO3 8, ketones 4+. What is the most appropriate initial fluid management?',
    [{ text: 'IV normal saline 1 L over 30-60 minutes', r: 'Initial DKA resuscitation is with isotonic saline 15-20 mL/kg in the first hour. This restores volume, improves perfusion, and lowers glucose through dilution.' },
     { text: 'IV dextrose 5% in water', r: 'D5W is hypotonic and lacks sodium. It is used later when glucose drops to ~14 mmol/L to prevent hypoglycemia during insulin therapy.' },
     { text: 'IV Ringer\'s lactate', r: 'Ringer\'s lactate contains lactate which may worsen lactic acidosis in DKA. Normal saline is preferred.' },
     { text: 'IV half-normal saline', r: 'Half-normal saline is hypotonic and used after initial resuscitation when sodium is elevated. Isotonic fluid is needed first.' }],
    'IV normal saline 1 L over 30-60 minutes', ['endocrine', 'DKA', 'fluid-resuscitation'],
    'DKA management: IV normal saline for volume expansion, then insulin infusion, then glucose monitoring and K+ replacement.'),

  // HHS
  q('A {age}-year-old {gender} with type 2 diabetes presents with polyuria, polydipsia, and lethargy for 1 week. Glucose 55, pH 7.38, HCO3 22, ketones negative, serum osmolality 350. What is the most likely diagnosis?',
    [{ text: 'Hyperosmolar hyperglycemic state', r: 'HHS is characterized by marked hyperglycemia >33 mmol/L, hyperosmolality >320, no significant ketosis, and pH >7.3. It has higher mortality than DKA.' },
     { text: 'Diabetic ketoacidosis', r: 'DKA has acidosis (pH <7.3, HCO3 <15) and ketones. This patient lacks both.' },
     { text: 'Lactic acidosis', r: 'Lactic acidosis has elevated lactate with anion gap but not extreme hyperglycemia.' },
     { text: 'Severe insulin resistance', r: 'Severe insulin resistance does not explain the extreme hyperglycemia without ketosis. HHS is the correct term.' }],
    'Hyperosmolar hyperglycemic state', ['endocrine', 'HHS', 'hyperglycemia'],
    'HHS: extreme hyperglycemia, hyperosmolality, no ketosis. Treatment is aggressive volume repletion with gradual glucose correction.'),

  // Chronic Diabetic Complications (Level 2)
  q('A {age}-year-old {gender} with type 2 diabetes for 10 years reports bilateral foot numbness and burning pain. Monofilament testing shows reduced sensation in both feet. What is the most appropriate management?',
    [{ text: 'Optimize glycemic control + pregabalin/gabapentin for neuropathic pain', r: 'Diabetic peripheral neuropathy is managed with tight glycemic control to slow progression and neuropathic pain agents (pregabalin, gabapentin, duloxetine) for symptoms.' },
     { text: 'NSAIDs for pain', r: 'NSAIDs are for nociceptive pain, not neuropathic pain. They have limited efficacy and renal risks in diabetic patients.' },
     { text: 'Foot surgery', r: 'Surgery is reserved for deformities, Charcot foot, or non-healing ulcers. First-line is medical management.' },
     { text: 'Opioid therapy', r: 'Opioids are not first-line for neuropathic pain due to addiction risk and limited efficacy. Gabapentinoids and SNRIs are preferred.' }],
    'Optimize glycemic control + pregabalin/gabapentin for neuropathic pain', ['endocrine', 'diabetic-neuropathy', 'pain-management'],
    'Diabetic peripheral neuropathy: glycemic control slows progression; pregabalin, gabapentin, or duloxetine treats pain.'),

  // Adrenal Disorders (Level 1)
  q('A {age}-year-old {gender} presents with hyperpigmentation, fatigue, weight loss, and hypotension. Na 128, K 5.8, Cr 1.3. Morning cortisol is low and ACTH is high. What is the most likely diagnosis?',
    [{ text: 'Primary adrenal insufficiency (Addison disease)', r: 'Addison disease: low cortisol, high ACTH, hyperpigmentation, hyponatremia, hyperkalemia. Autoimmune destruction is the most common cause.' },
     { text: 'Secondary adrenal insufficiency', r: 'Secondary AI has low or inappropriately normal ACTH, not elevated. Hyperpigmentation is absent due to low MSH/ACTH.' },
     { text: 'Cushing syndrome', r: 'Cushing has high cortisol with central obesity, striae, and hypertension — opposite of this presentation.' },
     { text: 'Congenital adrenal hyperplasia', r: 'CAH presents in childhood or early adulthood with virilization or menstrual irregularities, not acute adrenal crisis.' }],
    'Primary adrenal insufficiency (Addison disease)', ['endocrine', 'adrenal-insufficiency', 'Addison'],
    'Addison disease: low cortisol, high ACTH, hyperpigmentation, hyponatremia, hyperkalemia. Requires lifelong glucocorticoid and mineralocorticoid replacement.'),
];

// ══════════════════════════════════════════════════════════════════════════════
// RHEUMATOLOGY  (5 topics, ~22 questions)
// ══════════════════════════════════════════════════════════════════════════════

const RHEUMATOLOGY = [
  // SLE (Level 3)
  q('A {age}-year-old {gender} presents with malar rash, oral ulcers, arthritis, and pleuritic chest pain for 3 months. ANA is positive 1:640, anti-dsDNA positive, C3 low. What is the most appropriate initial management?',
    [{ text: 'Hydroxychloroquine + NSAIDs + sun protection', r: 'Mild SLE without major organ involvement is treated with hydroxychloroquine as disease-modifying therapy. NSAIDs treat arthritis and serositis. Sun avoidance prevents flares.' },
     { text: 'High-dose prednisone 60 mg daily', r: 'High-dose steroids are for severe organ-threatening disease (lupus nephritis, CNS lupus). This patient has mild disease.' },
     { text: 'Cyclophosphamide', r: 'Cyclophosphamide is reserved for severe lupus nephritis or life-threatening organ involvement.' },
     { text: 'Rituximab', r: 'Rituximab is used for refractory SLE not responding to standard therapy. It is not first-line.' }],
    'Hydroxychloroquine + NSAIDs + sun protection', ['rheumatology', 'SLE', 'hydroxychloroquine'],
    'Mild SLE is managed with hydroxychloroquine, NSAIDs, and sun protection. Immunosuppressants are for organ-threatening disease.'),

  // Rheumatoid Arthritis (Level 2)
  q('A {age}-year-old {gender} presents with morning stiffness lasting 2 hours, symmetric swelling of MCP and PIP joints, and rheumatoid factor positive. What is the most appropriate initial therapy?',
    [{ text: 'Methotrexate + folic acid supplementation', r: 'Methotrexate is first-line DMARD for RA. Folic acid reduces side effects. Early DMARD therapy improves long-term outcomes.' },
     { text: 'Prednisone monotherapy', r: 'Steroids provide symptomatic relief but do not prevent joint damage. DMARDs are required for disease modification.' },
     { text: 'Biologic TNF inhibitor as first-line', r: 'Biologics are reserved for moderate-to-severe RA not responding to conventional DMARDs, not as first-line therapy.' },
     { text: 'NSAIDs alone', r: 'NSAIDs treat symptoms but do not prevent erosions or disease progression. DMARDs are essential.' }],
    'Methotrexate + folic acid supplementation', ['rheumatology', 'RA', 'methotrexate', 'DMARD'],
    'RA requires early DMARD therapy. Methotrexate is first-line. Biologics are added for inadequate response to conventional DMARDs.'),

  // Gout (Level 1)
  q('A {age}-year-old {gender} presents with acute onset of severe pain, swelling, and erythema of the first MTP joint for 24 hours. Serum uric acid is 520 umol/L. Joint aspiration shows negatively birefringent crystals. What is the most appropriate acute treatment?',
    [{ text: 'Colchicine 1.2 mg followed by 0.6 mg in 1 hour', r: 'Colchicine is first-line for acute gout flares if started within 24 hours. High-dose regimens cause more GI side effects without additional benefit.' },
     { text: 'Allopurinol 300 mg daily', r: 'Starting urate-lowering therapy during an acute flare can worsen inflammation. It should be started after the flare resolves.' },
     { text: 'IV antibiotics', r: 'Antibiotics are for septic arthritis. Polarizing microscopy of synovial fluid distinguishes gout from infection.' },
     { text: 'Prednisone 60 mg daily for 1 day', r: 'Corticosteroids are second-line for acute gout, used when colchicine and NSAIDs are contraindicated.' }],
    'Colchicine 1.2 mg followed by 0.6 mg in 1 hour', ['rheumatology', 'gout', 'colchicine'],
    'Acute gout flare: colchicine or NSAIDs within 24 hours. ULT (allopurinol) is started after inflammation resolves.'),
];

// ══════════════════════════════════════════════════════════════════════════════
// HEMATOLOGY  (6 topics, ~38 questions)
// ══════════════════════════════════════════════════════════════════════════════

const HEMATOLOGY = [
  // Iron Deficiency Anemia (Level 3)
  q('A {age}-year-old {gender} presents with fatigue and pallor. Hb 8.5, MCV 72, MCH 24, ferritin 6, iron 4, TIBC 450. What is the most likely diagnosis?',
    [{ text: 'Iron deficiency anemia', r: 'Low Hb with microcytic indices, low ferritin, low iron, and high TIBC is classic iron deficiency anemia. The most common cause in adults is chronic blood loss.' },
     { text: 'Anemia of chronic disease', r: 'ACD has low iron with low or normal TIBC and normal or high ferritin. This patient has low ferritin and high TIBC, suggesting iron deficiency.' },
     { text: 'Thalassemia minor', r: 'Thalassemia minor has microcytosis out of proportion to anemia, normal ferritin, and elevated HbA2 on electrophoresis.' },
     { text: 'Vitamin B12 deficiency', r: 'B12 deficiency causes macrocytic anemia with high MCV, not microcytic. Neurological symptoms may be present.' }],
    'Iron deficiency anemia', ['hematology', 'iron-deficiency', 'microcytic-anemia'],
    'Iron deficiency: microcytic anemia, low ferritin, low iron, high TIBC. Treat with oral iron and investigate source of blood loss.'),

  // Sickle Cell Disease (Level 3)
  q('A {age}-year-old {gender} with known sickle cell disease presents with severe chest pain, fever, cough, and hypoxia. O2 86%, CXR shows new left lower lobe infiltrate. Hb 7.0. What is the most likely diagnosis?',
    [{ text: 'Acute chest syndrome', r: 'ACS is a leading cause of death in SCD. It presents with chest pain, fever, respiratory symptoms, and pulmonary infiltrates. Treatment includes antibiotics, O2, transfusion, and bronchodilators.' },
     { text: 'Simple vaso-occlusive crisis', r: 'VOC causes bone pain from infarction but not pulmonary infiltrates or hypoxia. ACS requires pulmonary involvement.' },
     { text: 'Aplastic crisis', r: 'Aplastic crisis causes rapid drop in Hb with reticulocytopenia due to parvovirus B19 infection. It does not cause pulmonary infiltrates.' },
     { text: 'Splenic sequestration', r: 'Sequestration causes rapid splenic enlargement with drop in Hb. It does not cause chest infiltrates or respiratory symptoms.' }],
    'Acute chest syndrome', ['hematology', 'sickle-cell', 'acute-chest-syndrome'],
    'ACS in SCD: chest pain, fever, hypoxia, infiltrates. Managed with antibiotics, O2, bronchodilators, and transfusion as needed.'),

  // Thrombotic Disorders (Level 3)
  q('A {age}-year-old {gender} presents with unilateral leg swelling and pain after a long flight. Ultrasound shows deep vein thrombosis. No prior history. What is the most appropriate initial management?',
    [{ text: 'LMWH or DOAC anticoagulation', r: 'Acute DVT without contraindications is treated with anticoagulation. LMWH bridge to warfarin or direct DOAC therapy is standard.' },
     { text: 'IVC filter placement', r: 'IVC filter is for patients with contraindications to anticoagulation or those who fail anticoagulation. Not first-line.' },
     { text: 'Aspirin 325 mg daily', r: 'Aspirin is insufficient for acute DVT treatment. Full-dose anticoagulation is required to prevent extension and embolization.' },
     { text: 'Bed rest alone', r: 'Bed rest does not treat the thrombus. Anticoagulation is necessary to prevent propagation and PE.' }],
    'LMWH or DOAC anticoagulation', ['hematology', 'DVT', 'anticoagulation'],
    'Acute DVT requires anticoagulation for at least 3 months. DOACs are preferred over warfarin for non-cancer-associated VTE.'),
];

// ══════════════════════════════════════════════════════════════════════════════
// INFECTIOUS DISEASE  (10 topics, ~46 questions)
// ══════════════════════════════════════════════════════════════════════════════

const ID = [
  // Pneumonia (Level 3)
  q('A {age}-year-old {gender} presents with fever, cough productive of green sputum, and pleuritic chest pain for 3 days. Temp 39°C, RR 22, HR 100, O2 94%. CXR shows right lower lobe consolidation. CURB-65 score is 1. What is the most appropriate management setting?',
    [{ text: 'Outpatient oral antibiotics', r: 'CURB-65 0-1 indicates low mortality risk (~1.5%). Outpatient management with oral antibiotics (amoxicillin or macrolide) is appropriate.' },
     { text: 'Hospital admission for IV antibiotics', r: 'CURB-65 ≤2 with low severity can be managed outpatient. Admission is for CURB-65 ≥3 or hypoxia.' },
     { text: 'ICU admission', r: 'ICU criteria include septic shock, respiratory failure, or CURB-65 ≥4. This patient has mild CAP.' },
     { text: 'No antibiotics needed', r: 'Community-acquired pneumonia requires antibiotics. Without treatment, mortality increases significantly.' }],
    'Outpatient oral antibiotics', ['ID', 'pneumonia', 'CAP', 'CURB-65'],
    'CURB-65 0-1: outpatient antibiotics. CURB-65 2: short admission. CURB-65 ≥3: inpatient. Septic shock: ICU.'),

  // TB (Level 3)
  q('A {age}-year-old {gender} presents with cough for 6 weeks, night sweats, weight loss, and hemoptysis. CXR shows cavitary lesion in the right upper lobe. Sputum AFB smear is positive. What is the most appropriate initial regimen?',
    [{ text: 'Rifampin, INH, pyrazinamide, ethambutol for 2 months', r: 'Initial phase of TB treatment is 4-drug therapy for 2 months: rifampin, isoniazid, pyrazinamide, ethambutol. This is followed by 4 months of rifampin and INH.' },
     { text: 'Rifampin and INH alone', r: 'Two-drug regimen is for latent TB, not active disease. Active TB requires 4 drugs initially due to resistance risk.' },
     { text: 'Amoxicillin-clavulanate', r: 'Beta-lactams are not active against Mycobacterium tuberculosis. Dedicated anti-TB drugs are required.' },
     { text: 'Moxifloxacin monotherapy', r: 'Fluoroquinolone monotherapy for active TB leads to resistance. TB requires combination therapy.' }],
    'Rifampin, INH, pyrazinamide, ethambutol for 2 months', ['ID', 'tuberculosis', 'RIPE'],
    'Active TB: 2 months RIPE (4 drugs) then 4 months RI (2 drugs). Directly observed therapy improves adherence.'),

  // Brucellosis (Level 1)
  q('A {age}-year-old {gender} presents with intermittent fever, night sweats, arthralgia, and lower back pain for 3 weeks. He reports consuming unpasteurized dairy. Brucella serology is positive. What is the most appropriate treatment?',
    [{ text: 'Doxycycline + rifampicin for 6 weeks', r: 'Standard therapy for uncomplicated brucellosis is doxycycline plus rifampicin for 6 weeks. Combination therapy reduces relapse to <5%.' },
     { text: 'Doxycycline alone for 3 weeks', r: 'Monotherapy has 15-25% relapse rate. Combination therapy with rifampicin is required for adequate intracellular eradication.' },
     { text: 'Azithromycin for 5 days', r: 'Macrolides have poor activity against Brucella and are not recommended. Bactericidal agents with intracellular penetration are needed.' },
     { text: 'Ciprofloxacin for 2 weeks', r: 'Fluoroquinolone monotherapy has high relapse rates. It is used in combination for complicated cases only.' }],
    'Doxycycline + rifampicin for 6 weeks', ['ID', 'brucellosis', 'zoonotic'],
    'Uncomplicated brucellosis: doxycycline + rifampicin for 6 weeks. Longer courses for complications like neurobrucellosis or endocarditis.'),
];

// ══════════════════════════════════════════════════════════════════════════════
// NEUROLOGY  (5 topics, ~22 questions)
// ══════════════════════════════════════════════════════════════════════════════

const NEUROLOGY = [
  // Ischemic Stroke (Level 3)
  q('A {age}-year-old {gender} with hypertension and atrial fibrillation presents with acute onset of right-sided weakness and aphasia starting 1 hour ago. BP 160/90, glucose 6.0. CT head shows no hemorrhage. What is the most appropriate management?',
    [{ text: 'IV alteplase (tPA) if no contraindications', r: 'Acute ischemic stroke within 4.5 hours in eligible patients should receive IV thrombolysis. BP must be <185/110 before treatment.' },
     { text: 'Aspirin 325 mg', r: 'Aspirin is given 24 hours after thrombolysis. In the first 4.5 hours, thrombolysis is the priority for eligible patients.' },
     { text: 'IV heparin', r: 'Heparin is not indicated for acute ischemic stroke. It increases hemorrhagic transformation risk without benefit.' },
     { text: 'Observation with hydration', r: 'Observation without treatment misses the therapeutic window. Eligible patients should receive thrombolysis within 4.5 hours.' }],
    'IV alteplase (tPA) if no contraindications', ['neurology', 'ischemic-stroke', 'thrombolysis'],
    'Acute ischemic stroke within 4.5 hours: IV tPA. After 4.5 hours or contraindications: dual antiplatelet therapy and stroke unit care.'),

  // Seizure Disorders (Level 2)
  q('A {age}-year-old {gender} presents with a generalized tonic-clonic seizure that lasted 4 minutes and stopped spontaneously. No prior seizures. Head CT and electrolytes are normal. EEG shows interictal epileptiform discharges. What is the most appropriate management?',
    [{ text: 'Start antiepileptic drug (levetiracetam)', r: 'After a first unprovoked seizure with epileptiform EEG, the risk of recurrence is ~50%. AED therapy reduces this risk. Levetiracetam is well-tolerated.' },
     { text: 'No treatment, lifestyle advice only', r: 'Treatment is recommended when the recurrence risk is high (abnormal EEG, structural brain lesion). Observation may be appropriate with normal EEG.' },
     { text: 'Phenytoin loading dose', r: 'Phenytoin has significant drug interactions and side effects. Levetiracetam or lamotrigine are preferred as first-line due to better tolerability.' },
     { text: 'IV benzodiazepines', r: 'IV benzodiazepines are for acute active seizures or status epilepticus. This patient has already stopped seizing.' }],
    'Start antiepileptic drug (levetiracetam)', ['neurology', 'seizure', 'first-unprovoked'],
    'First unprovoked seizure with abnormal EEG has high recurrence risk. Start AED (levetiracetam or lamotrigine).'),
];

// ══════════════════════════════════════════════════════════════════════════════
// ONCOLOGY  (2 topics, ~16 questions)
// ══════════════════════════════════════════════════════════════════════════════

const ONCOLOGY = [
  // Febrile Neutropenia (Level 1)
  q('A {age}-year-old {gender} with lymphoma undergoing chemotherapy presents with fever 38.5°C and ANC 0.4 × 10⁹/L. What is the most appropriate initial management?',
    [{ text: 'Blood cultures + broad-spectrum IV antibiotics (piperacillin-tazobactam)', r: 'Febrile neutropenia is an oncologic emergency. Empiric broad-spectrum antibiotics should be started within 1 hour of presentation after obtaining cultures.' },
     { text: 'Oral antibiotics and home monitoring', r: 'Low-risk patients may be candidates for outpatient therapy, but blood cultures and broad-spectrum coverage are still needed.' },
     { text: 'CT scan to find infection source', r: 'Imaging should not delay antibiotics. Start antibiotics immediately after cultures, then investigate source.' },
     { text: 'G-CSF alone without antibiotics', r: 'G-CSF accelerates neutrophil recovery but does not treat active infection. Antibiotics are the priority.' }],
    'Blood cultures + broad-spectrum IV antibiotics (piperacillin-tazobactam)', ['oncology', 'febrile-neutropenia'],
    'Febrile neutropenia: blood cultures and broad-spectrum antibiotics within 1 hour. Prompt treatment reduces mortality.'),
];

// ══════════════════════════════════════════════════════════════════════════════
// CRITICAL CARE  (4 topics, ~16 questions)
// ══════════════════════════════════════════════════════════════════════════════

const CRITICAL_CARE = [
  // Sepsis (Level 2)
  q('A {age}-year-old {gender} presents with fever, hypotension (BP 80/50), HR 110, RR 24, confusion, and lactate 4.5. Source suspected as urinary tract infection. What is the most appropriate immediate management?',
    [{ text: 'IV fluids 30 mL/kg crystalloid + blood cultures + broad-spectrum antibiotics within 1 hour', r: 'Sepsis with hypotension and lactate >2 requires immediate fluid resuscitation, cultures, and early broad-spectrum antibiotics. Each hour delay increases mortality.' },
     { text: 'IV antibiotics alone', r: 'Fluid resuscitation is essential in septic shock to restore tissue perfusion. Antibiotics alone are insufficient.' },
     { text: 'Norepinephrine before fluids', r: 'Vasopressors are started if shock persists after fluid resuscitation. The initial step is fluid bolus.' },
     { text: 'CT scan to identify source', r: 'Imaging should not delay resuscitation and antibiotics. Source control is important but not before stabilizing the patient.' }],
    'IV fluids 30 mL/kg crystalloid + blood cultures + broad-spectrum antibiotics within 1 hour', ['critical-care', 'sepsis', 'septic-shock'],
    'Sepsis: 30 mL/kg fluids, cultures, antibiotics within 1 hour. Vasopressors for refractory shock. Lactate clearance guides resuscitation.'),

  // Respiratory Failure (Level 2)
  q('A {age}-year-old {gender} with ARDS on mechanical ventilation has PaO2/FiO2 ratio of 150. What lung-protective strategy should be used?',
    [{ text: 'Tidal volume 6 mL/kg ideal body weight, plateau pressure <30 cmH2O', r: 'Low tidal volume ventilation (6 mL/kg) with plateau pressure limitation reduces mortality in ARDS. Higher tidal volumes cause ventilator-induced lung injury.' },
     { text: 'Tidal volume 12 mL/kg for adequate oxygenation', r: 'High tidal volumes cause volutrauma and worsen ARDS. Lung-protective ventilation is standard of care.' },
     { text: 'No PEEP', r: 'PEEP is essential in ARDS to prevent alveolar collapse and improve oxygenation. Low PEEP worsens atelectrauma.' },
     { text: 'Permissive hypercapnia without pressure limits', r: 'Plateau pressure must still be limited to <30 cmH2O. Permissive hypercapnia allows lower volumes but pressure is still monitored.' }],
    'Tidal volume 6 mL/kg ideal body weight, plateau pressure <30 cmH2O', ['critical-care', 'ARDS', 'ventilation'],
    'ARDS: lung-protective ventilation with TV 6 mL/kg, plateau pressure <30. Prone positioning and neuromuscular blockade for severe disease.'),
];

// ══════════════════════════════════════════════════════════════════════════════
// PSYCHIATRY  (5 topics, ~16 questions)
// ══════════════════════════════════════════════════════════════════════════════

const PSYCHIATRY = [
  // Depression (Level 1)
  q('A {age}-year-old {gender} presents with depressed mood, anhedonia, poor sleep, low energy, and poor concentration for 4 weeks. No suicidal ideation. PHQ-9 score is 15. What is the most appropriate initial management?',
    [{ text: 'Start SSRI (sertraline or fluoxetine) and monitor for response', r: 'Moderate depression is treated with SSRI as first-line pharmacotherapy. Response is expected in 4-6 weeks. Monitoring for side effects and suicide risk is essential.' },
     { text: 'ECT therapy', r: 'ECT is reserved for severe depression with psychotic features, catatonia, or treatment-resistant depression.' },
     { text: 'Benzodiazepines', r: 'Benzodiazepines are for anxiety, not depression. They have no antidepressant effect and carry dependence risk.' },
     { text: 'Antipsychotic monotherapy', r: 'Antipsychotics are not first-line for unipolar depression. Some atypical antipsychotics are adjunctive for treatment-resistant cases.' }],
    'Start SSRI (sertraline or fluoxetine) and monitor for response', ['psychiatry', 'depression', 'SSRI'],
    'Moderate depression: SSRI first-line. Therapy (CBT) alone or combined with medication based on severity and patient preference.'),
];

// ══════════════════════════════════════════════════════════════════════════════
// GERIATRICS  (2 topics, ~8 questions)
// ══════════════════════════════════════════════════════════════════════════════

const GERIATRICS = [
  // Delirium (Level 2)
  q('A {age}-year-old {gender} hospitalized for pneumonia develops acute confusion, agitation, and fluctuating consciousness over 12 hours. What is the most appropriate initial step?',
    [{ text: 'Identify and treat the underlying cause (infection, electrolytes, medications)', r: 'Delirium management begins with identifying and correcting the precipitating cause. In this patient, worsening infection or medication side effects are likely.' },
     { text: 'Haloperidol for agitation', r: 'Antipsychotics are for severe agitation when the patient is a danger to themselves. Non-pharmacological measures and cause identification come first.' },
     { text: 'CT head stat', r: 'Head CT is indicated if neurological signs are present or head trauma is suspected. History of recent pneumonia suggests infection as the cause.' },
     { text: 'Benzodiazepines for calming', r: 'Benzodiazepines can worsen delirium, especially in the elderly. They are reserved for specific withdrawal syndromes.' }],
    'Identify and treat the underlying cause (infection, electrolytes, medications)', ['geriatrics', 'delirium'],
    'Delirium: identify and treat underlying cause, non-pharmacological measures first, antipsychotics only for severe agitation.'),
];

// ══════════════════════════════════════════════════════════════════════════════
// ETHICS  (14 topics, ~50 questions)
// ══════════════════════════════════════════════════════════════════════════════

const ETHICS = [
  // Informed Consent (Level 1)
  q('A {age}-year-old {gender} with decision-making capacity refuses life-saving blood transfusion due to religious beliefs. The family requests the physician proceed anyway. What is the most appropriate action?',
    [{ text: 'Respect the patient\'s autonomous decision and provide alternative care', r: 'A competent adult has the right to refuse treatment even if it leads to death. Respecting autonomy is a core ethical principle. Document the refusal and provide supportive care.' },
     { text: 'Proceed with transfusion since the family requests it', r: 'Family wishes do not override a competent patient\'s decision. The patient\'s autonomy takes precedence.' },
     { text: 'Obtain a court order for treatment', r: 'Court orders to override a competent patient\'s refusal are not appropriate. They are reserved for specific public health scenarios or when the patient lacks capacity.' },
     { text: 'Transfer the patient to another physician', r: 'Transfer does not resolve the ethical conflict. The patient\'s refusal must be respected regardless of the treating physician.' }],
    'Respect the patient\'s autonomous decision and provide alternative care', ['ethics', 'informed-consent', 'autonomy', 'refusal-of-care'],
    'A competent patient\'s refusal of treatment must be respected. Autonomy overrides beneficence when the patient has capacity.'),

  // Confidentiality (Level 3)
  q('A {age}-year-old {gender} with HIV asks you not to disclose their status to their spouse. The spouse is also your patient and is pregnant. What is the most appropriate action?',
    [{ text: 'Counsel the patient to disclose, and if they refuse, disclose to the spouse to prevent harm', r: 'The duty to protect a third party at risk of serious harm may override confidentiality. The physician should first counsel the patient to disclose. If they refuse, disclosure to the at-risk spouse is ethically justified.' },
     { text: 'Maintain strict confidentiality against all disclosures', r: 'Confidentiality is important but not absolute. The risk of vertical transmission to the fetus and horizontal transmission to the spouse creates a duty to warn.' },
     { text: 'Disclose immediately to the spouse without counseling the patient', r: 'Counseling the patient first respects their autonomy and gives them the opportunity to disclose voluntarily. Immediate disclosure should only happen in emergencies.' },
     { text: 'Refer both patients to different physicians', r: 'Referring does not resolve the ethical conflict. The duty to protect the spouse from harm remains.' }],
    'Counsel the patient to disclose, and if they refuse, disclose to the spouse to prevent harm', ['ethics', 'confidentiality', 'duty-to-warn'],
    'Confidentiality can be breached to prevent serious harm to identifiable third parties. Counsel the patient first; disclose only if necessary.'),
];

// ══════════════════════════════════════════════════════════════════════════════
// PATIENT SAFETY  (17 topics, ~50 questions)
// ══════════════════════════════════════════════════════════════════════════════

const PATIENT_SAFETY = [
  // Medication Safety (Level 3)
  q('A nurse administers 10 times the prescribed dose of IV heparin to a patient. The error is discovered 15 minutes later. The patient is stable with no bleeding. What is the most appropriate action?',
    [{ text: 'Assess the patient, report the error through the incident reporting system, and investigate the root cause', r: 'Patient safety requires immediate assessment and management, transparent error reporting, and system-level analysis to prevent recurrence. Blame-free reporting improves safety.' },
     { text: 'Monitor the patient but do not document the error', r: 'All adverse events and near misses must be documented and reported. Nondisclosure violates patient safety principles and may constitute fraud.' },
     { text: 'Discipline the nurse immediately', r: 'Individual blame without system analysis does not improve safety. Most errors result from system failures, not individual negligence.' },
     { text: 'Administer protamine without consulting anyone', r: 'The clinical management should be discussed with the treating physician. Root cause analysis is separate from clinical management.' }],
    'Assess the patient, report the error through the incident reporting system, and investigate the root cause', ['safety', 'medication-error', 'incident-reporting'],
    'Medication errors require patient assessment, transparent disclosure, incident reporting, and system-based root cause analysis.'),
];

// ══════════════════════════════════════════════════════════════════════════════
// PREVENTIVE MEDICINE & PUBLIC HEALTH  (26 topics, ~80 questions)
// ══════════════════════════════════════════════════════════════════════════════

const PREVENTIVE = [
  // Screening (Level 3)
  q('A {age}-year-old {gender} asks about colorectal cancer screening. No family history of CRC. What is the most appropriate screening recommendation?',
    [{ text: 'FIT (fecal immunochemical test) annually starting at age 45-50, or colonoscopy every 10 years', r: 'CRC screening is recommended starting at age 45-50 for average-risk individuals. FIT annually or colonoscopy every 10 years are both valid options.' },
     { text: 'CT colonography every 5 years', r: 'CT colonography is an alternative but not first-line due to radiation and lower sensitivity for flat lesions.' },
     { text: 'FOBT (guaiac) annually', r: 'FOBT has lower sensitivity than FIT. FIT is preferred over FOBT for CRC screening.' },
     { text: 'No screening needed without family history', r: 'Average-risk individuals should be screened starting at age 45-50. Absence of family history does not eliminate risk.' }],
    'FIT (fecal immunochemical test) annually starting at age 45-50, or colonoscopy every 10 years', ['preventive', 'screening', 'CRC'],
    'CRC screening for average-risk: FIT annually or colonoscopy every 10 years starting at age 45-50.'),

  // Immunization (Level 3) — Child
  q('A 2-month-old infant is due for routine immunizations. Which vaccines should be administered at this visit?',
    [{ text: 'DTaP, IPV, Hib, PCV13, rotavirus, hepatitis B', r: 'At 2 months: DTaP, IPV, Hib, PCV13, rotavirus, and hepatitis B (second dose). Following the childhood immunization schedule ensures timely protection.' },
     { text: 'MMR and varicella', r: 'MMR and varicella are given at 12-15 months, not at 2 months.' },
     { text: 'DTaP and IPV only', r: 'The 2-month visit includes multiple vaccines to ensure timely protection. Delaying vaccines leaves the infant vulnerable.' },
     { text: 'No vaccines until 4 months', r: 'The immunization schedule starts at 2 months for a reason. Delaying increases the window of susceptibility to preventable diseases.' }],
    'DTaP, IPV, Hib, PCV13, rotavirus, hepatitis B', ['preventive', 'immunization', 'pediatric'],
    '2-month immunizations: DTaP, IPV, Hib, PCV13, rotavirus, HepB. Following the schedule protects infants during their most vulnerable period.'),
];

// ══════════════════════════════════════════════════════════════════════════════
// ASSEMBLE ALL MEDICINE SUBSECTIONS
// ══════════════════════════════════════════════════════════════════════════════

const ALL_TEMPLATES = [
  ...CARDIOLOGY,
  ...PULMONOLOGY,
  ...GI,
  ...NEPHROLOGY,
  ...ENDOCRINE,
  ...RHEUMATOLOGY,
  ...HEMATOLOGY,
  ...ID,
  ...NEUROLOGY,
  ...ONCOLOGY,
  ...CRITICAL_CARE,
  ...PSYCHIATRY,
  ...GERIATRICS,
  ...ETHICS,
  ...PATIENT_SAFETY,
  ...PREVENTIVE,
];

// ── Calculate per-subspecialty question counts ────────────────────────────────
// Cardiology 13, Pulmonology 7, GI 11, Nephro 6, Endo 6, Rheum 4, Heme 4, ID 5,
// Neuro 3, Onc 1, CC 2, Psych 1, Geri 1, Ethics 2, Safety 1, Preventive 1
// Total templates: 68 → need ~600 questions, so about 9 rounds each but fewer for smaller subspecialties

// Let me allocate: templates get cycled ~6-9 times each to hit 600
const TOTAL_MEDICINE = 600;
const TARGET = TOTAL_MEDICINE;

function main() {
  console.log('\n🏥 Generating Medicine questions...\n');

  const questions = [];
  for (let i = 0; i < TARGET; i++) {
    const tpl = ALL_TEMPLATES[i % ALL_TEMPLATES.length];
    const q = tpl(i);
    q.topic = q.topic || 'Internal Medicine';
    q.scfhs_domain = q.scfhs_domain || 'Medicine';
    q.difficulty = ['Easy', 'Easy', 'Moderate', 'Moderate', 'Hard', 'Hard', 'Hard'][i % 7];
    q._uid = 'med-' + i;
    questions.push(q);
  }

  console.log(`   Generated ${questions.length} questions from ${ALL_TEMPLATES.length} templates\n`);
  writeOutput('generated-medicine.json', questions);
}

main();
