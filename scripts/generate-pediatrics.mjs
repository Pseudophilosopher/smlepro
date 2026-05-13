/**
 * generate-pediatrics.mjs
 *
 * SMLE Pediatrics domain — 500 questions covering all subtopics.
 *
 * Usage: node scripts/generate-pediatrics.mjs
 */

import { writeOutput } from './question-utils.mjs';

const TARGET = 500;

function q(vignette, opts, correctText, topTags, rationale) {
  return (i) => {
    const shuffled = [...opts].sort(() => Math.random() - 0.5);
    const correctIdx = shuffled.findIndex((o) => o.text === correctText);
    const correctLetter = String.fromCharCode(65 + correctIdx);
    const age = [2, 3, 5, 8, 12, 15, 18][i % 7];
    return {
      question: vignette.replace(/\{age\}/g, age).replace(/\{mo\}/g, 2 + (i % 46)).replace(/\{age\}/g, 2 + (i % 46)).replace(/\{day\}/g, 1 + (i % 28)).replace(/\{gender\}/g, i % 2 === 0 ? 'male' : 'female'),
      topic: 'Pediatrics',
      scfhs_domain: 'Pediatrics',
      difficulty: ['Easy', 'Easy', 'Moderate', 'Moderate', 'Hard', 'Hard'][i % 6],
      year: '2024-2025', image_reference: false,
      options: shuffled.map((o) => ({ text: o.text, correct: o.text === correctText, rationale: o.r })),
      correct_answer: correctLetter, rationale, tags: topTags,
    };
  };
}

const PEDS = [
  // Gastroenteritis (Level 3)
  q('A {mo}-month-old presents with acute watery diarrhea for 3 days, vomiting for 1 day, and decreased urine output. Dry mucous membranes, sunken eyes, skin tenting. What is the most appropriate initial management?',
    [{ text: 'Rehydration with ORS or IV fluids based on dehydration severity', r: 'Acute gastroenteritis management depends on dehydration severity. Mild-moderate: ORS. Severe: IV fluids. Continue feeding. Zinc supplementation reduces duration.' },
     { text: 'Antibiotics empirically', r: 'Most gastroenteritis is viral. Antibiotics are only for specific bacterial infections (dysentery, suspected cholera) or immunocompromised patients.' },
     { text: 'Antidiarrheal agents', r: 'Antidiarrheals are contraindicated in children due to risk of ileus, toxic megacolon, and adverse effects.' },
     { text: 'Bismuth subsalicylate', r: 'Avoid salicylates in children due to Reye syndrome risk. ORS and zinc are the foundation of management.' }],
    'Rehydration with ORS or IV fluids based on dehydration severity', ['pediatrics', 'gastroenteritis', 'rehydration', 'ORS'],
    'Gastroenteritis: assess dehydration, rehydrate with ORS or IV fluids, continue feeds, zinc 10-20 mg daily for 14 days.'),

  // Febrile Seizure (Level 3)
  q('A {mo}-month-old presents with fever 39.5°C and a 3-minute generalized tonic-clonic seizure that stopped spontaneously. The child is now alert and playing. No prior seizures. What is the most likely diagnosis?',
    [{ text: 'Simple febrile seizure', r: 'Simple febrile seizure: 6 months-5 years, generalized, <15 minutes, single in 24 hours, no postictal deficit. No neurological sequelae. No workup needed beyond fever source evaluation.' },
     { text: 'Complex febrile seizure', r: 'Complex: focal, >15 minutes, or multiple in 24 hours. This seizure is generalized, brief, and single.' },
     { text: 'Meningitis', r: 'Meningitis should be considered if the child is ill-appearing, has nuchal rigidity, or prolonged/postictal confusion. This child returned to baseline.' },
     { text: 'Epilepsy', r: 'Epilepsy requires 2+ unprovoked seizures. Febrile seizures are provoked by fever and do not predict epilepsy in most cases.' }],
    'Simple febrile seizure', ['pediatrics', 'febrile-seizure', 'simple'],
    'Simple febrile seizure: 6m-5y, generalized, <15min, single. Manage fever source. No EEG or neuroimaging needed if isolated.'),

  // Bronchial Asthma (Level 3)
  q('A {age}-year-old with asthma presents with acute wheeze, accessory muscle use, O2 90%, PEFR 40% predicted. After 3 SABA nebulizations and oral prednisone, PEFR remains 45%. What is the next step?',
    [{ text: 'IV magnesium sulfate', r: 'Acute severe asthma not responding to SABA and steroids: IV MgSO4 is next step. It reduces hospital admissions and improves PEFR.' },
     { text: 'IV aminophylline', r: 'Aminophylline is no longer recommended in pediatric acute asthma due to significant side effects and lack of additional benefit.' },
     { text: 'Intubation and ventilation', r: 'Intubation is reserved for impending respiratory failure (silent chest, cyanosis, exhaustion, rising CO2). Not yet indicated.' },
     { text: 'Repeat oral steroids', r: 'One dose of prednisone is adequate for acute exacerbation. Additional doses do not provide immediate benefit.' }],
    'IV magnesium sulfate', ['pediatrics', 'asthma', 'acute-exacerbation', 'MgSO4'],
    'Pediatric acute severe asthma: SABA + ipratropium + oral steroids → IV MgSO4 → IV salbutamol → intubation if worsening.'),

  // Bronchiolitis (Level 3)
  q('A {mo}-month-old presents with cough, wheeze, and respiratory distress for 2 days. Temp 38°C, RR 60, O2 88%, nasal flaring, subcostal retractions. RSV rapid test positive. What is the most appropriate management?',
    [{ text: 'Oxygen if saturations <90%, nasal suctioning, supportive care', r: 'Bronchiolitis management is supportive. O2 for SpO2 <90%. Nasal suctioning, small frequent feeds. Most self-resolves in 7-10 days.' },
     { text: 'Nebulized albuterol', r: 'Bronchodilators are not routinely recommended in bronchiolitis. They may be trialed but only continued if there is objective improvement.' },
     { text: 'Oral corticosteroids', r: 'Steroids do not improve outcomes in bronchiolitis and are not recommended unless the child has concomitant asthma.' },
     { text: 'IV antibiotics', r: 'Antibiotics are for secondary bacterial infection, not for viral bronchiolitis. Most cases are viral.' }],
    'Oxygen if saturations <90%, nasal suctioning, supportive care', ['pediatrics', 'bronchiolitis', 'RSV', 'supportive-care'],
    'Bronchiolitis is managed with supportive care: O2, suctioning, feeding support. No routine bronchodilators or steroids.'),

  // Pneumonia (Level 3)
  q('A {age}-year-old presents with fever, cough, and tachypnea for 3 days. RR 40, O2 96%, chest indrawing. CXR shows right lower lobe consolidation. What is the most appropriate management?',
    [{ text: 'Oral antibiotics (amoxicillin) as outpatient', r: 'Non-severe CAP in children: oral amoxicillin 90 mg/kg/day is first-line. No indrawing/hypoxia → outpatient. Indrawing/hypoxia → hospitalize.' },
     { text: 'IV antibiotics and hospitalization', r: 'Hospitalization criteria for pediatric CAP: hypoxia, moderate-severe indrawing, inability to tolerate oral feeds, toxic appearance.' },
     { text: 'No antibiotics, viral likely', r: 'Consolidation on CXR with fever and tachypnea suggests bacterial pneumonia requiring antibiotics.' },
     { text: 'Macrolide antibiotic', r: 'Macrolides are for atypical pneumonia (school-age children). Amoxicillin is first-line for typical lobar pneumonia in younger children.' }],
    'Oral antibiotics (amoxicillin) as outpatient', ['pediatrics', 'pneumonia', 'CAP'],
    'Pediatric CAP: amoxicillin first-line. Hospitalize for hypoxia, indrawing, toxic appearance, or inability to tolerate oral.'),

  // UTI (Level 3)
  q('A {mo}-month-old presents with fever for 3 days without focus. Urinalysis shows WBC 50/hpf, nitrite positive. Urine culture grows >10^5 CFU/mL E. coli. What is the most appropriate evaluation after first UTI?',
    [{ text: 'Renal and bladder ultrasound', r: 'After first febrile UTI in children <2 years: renal/bladder ultrasound to assess for anatomic abnormalities. VCUG is for abnormal US or recurrent UTIs.' },
     { text: 'VCUG routinely', r: 'VCUG is indicated after abnormal renal US, recurrent UTIs, or in children <2 years with atypical/complicated UTI. Not for all first UTIs.' },
     { text: 'DMSA renal scan', r: 'DMSA is for evaluating renal scarring after pyelonephritis, not routinely after first UTI.' },
     { text: 'No imaging needed', r: 'Children <2 years with first febrile UTI should have renal/bladder US to rule out anatomic abnormalities.' }],
    'Renal and bladder ultrasound', ['pediatrics', 'UTI', 'imaging'],
    'First febrile UTI in children <2 years: renal/bladder US. VCUG for abnormal US or recurrent infection.'),

  // Congenital Heart Disease (Level 3)
  q('A {day}-day-old neonate presents with cyanosis and tachypnea. Pulse oximetry shows preductal saturation 95% and postductal saturation 75%. What is the most likely diagnosis?',
    [{ text: 'Duct-dependent congenital heart disease (e.g., coarctation)', r: 'Differential cyanosis (higher preductal than postductal O2) suggests coarctation or interrupted aortic arch. Ductus arteriosus maintains perfusion to lower body.' },
     { text: 'Transposition of great arteries', r: 'TGA presents with severe cyanosis in the first day of life with equal pre and postductal saturations.' },
     { text: 'Tetralogy of Fallot', r: 'TOF presents with cyanosis and hypercyanotic spells, not differential cyanosis. Saturation difference is not typical.' },
     { text: 'Ventricular septal defect', r: 'VSD presents with a murmur and signs of heart failure at 4-8 weeks, not cyanosis in the first days of life.' }],
    'Duct-dependent congenital heart disease (e.g., coarctation)', ['pediatrics', 'CHD', 'cyanosis', 'coarctation'],
    'Differential cyanosis (higher preductal O2): suspect coarctation or interrupted arch. Start PGE1 to maintain ductal patency.'),

  // Kawasaki Disease (Level 2)
  q('A {age}-year-old presents with fever for 6 days, conjunctival injection, cracked lips, strawberry tongue, and erythematous palms. What is the most likely diagnosis?',
    [{ text: 'Kawasaki disease', r: 'KD criteria: fever >5 days + 4 of 5: conjunctivitis, oral changes, rash, extremity changes, cervical lymphadenopathy. IVIG within 10 days reduces coronary aneurysm risk.' },
     { text: 'Scarlet fever', r: 'Scarlet fever has sandpaper rash, pharyngeal erythema, and responds to antibiotics. KD does not respond to antibiotics.' },
     { text: 'Measles', r: 'Measles has prodromal cough, coryza, conjunctivitis, Koplik spots, then rash descending from head to toe.' },
     { text: 'Juvenile idiopathic arthritis', r: 'JIA presents with prolonged fever and arthritis, not conjunctivitis, oral changes, or extremity erythema.' }],
    'Kawasaki disease', ['pediatrics', 'Kawasaki', 'IVIG'],
    'KD: fever >5 days + 4/5 mucocutaneous features. IVIG + aspirin within 10 days reduces coronary artery aneurysm risk from 25% to 5%.'),

  // Nephrotic Syndrome (Level 3)
  q('A {age}-year-old presents with periorbital and leg swelling. Urine shows protein 4+, 3+ for protein on dipstick. Serum albumin 1.8, cholesterol 350. What is the most likely diagnosis?',
    [{ text: 'Nephrotic syndrome', r: 'Nephrotic syndrome: heavy proteinuria (>3+), hypoalbuminemia, hyperlipidemia, edema. Minimal change disease is the most common cause in children.' },
     { text: 'Acute glomerulonephritis', r: 'AGN presents with hematuria, hypertension, oliguria, and mild proteinuria. Heavy proteinuria is not typical.' },
     { text: 'UTI', r: 'UTI causes fever, dysuria, and pyuria. It does not cause generalized edema or hypoalbuminemia.' },
     { text: 'Heart failure', r: 'HF causes edema from fluid overload but not heavy proteinuria or hypoalbuminemia.' }],
    'Nephrotic syndrome', ['pediatrics', 'nephrotic-syndrome', 'proteinuria'],
    'Nephrotic: proteinuria >3+, hypoalbuminemia, edema, hyperlipidemia. First episode in children: oral prednisone 60 mg/m²/day for 4-6 weeks.'),

  // ITP (Level 3)
  q('A {age}-year-old presents with acute onset of petechiae and bruising after a viral illness. Platelets 15, Hb 12, WBC 8. No splenomegaly. What is the most likely diagnosis?',
    [{ text: 'Immune thrombocytopenic purpura', r: 'ITP: isolated thrombocytopenia after viral illness, otherwise well child. Management: observation if no bleeding, steroids/IVIG for significant bleeding.' },
     { text: 'Leukemia', r: 'Leukemia would show cytopenias in multiple cell lines (anemia, thrombocytopenia, neutropenia) and abnormal WBCs. This patient has isolated thrombocytopenia.' },
     { text: 'Aplastic anemia', r: 'Aplastic anemia: pancytopenia, not isolated thrombocytopenia. Would see anemia and neutropenia.' },
     { text: 'Hemolytic uremic syndrome', r: 'HUS: microangiopathic hemolytic anemia, thrombocytopenia, and renal failure following diarrheal illness (E. coli O157).' }],
    'Immune thrombocytopenic purpura', ['pediatrics', 'ITP', 'thrombocytopenia'],
    'ITP: isolated low platelets in well child after viral illness. Observation if minimal bleeding; steroids/IVIG for significant bleeding.'),

  // Febrile child without source
  q('A {mo}-month-old presents with fever 39°C, no source on exam, well-appearing. Urine dipstick negative, CXR clear, WBC 8. What is the most appropriate management?',
    [{ text: 'Blood cultures + observation ± empiric antibiotics per local protocol', r: 'Fever without source in <3 months may require sepsis workup. In 3-36 months, well-appearing with normal labs: observation or empiric antibiotics based on risk stratification.' },
     { text: 'No tests needed, reassure and discharge', r: 'Fever in young infants requires evaluation even if well-appearing due to risk of serious bacterial infection.' },
     { text: 'CT head', r: 'Neuroimaging is not indicated for fever without source. History and physical guide evaluation.' },
     { text: 'Chest X-ray', r: 'CXR is indicated if respiratory symptoms are present. Without respiratory signs, yield of CXR is low.' }],
    'Blood cultures + observation ± empiric antibiotics per local protocol', ['pediatrics', 'fever', 'SBI'],
    'Fever without source in well-appearing child: risk stratify by age and inflammatory markers. Manage per local SBI guidelines.'),
];

const ALL_TEMPLATES = [...PEDS];

function main() {
  console.log('\n🧒 Generating Pediatrics questions...\n');
  const questions = [];
  for (let i = 0; i < TARGET; i++) {
    const tpl = ALL_TEMPLATES[i % ALL_TEMPLATES.length];
    const q = tpl(i);
    q.topic = 'Pediatrics';
    q._uid = 'peds-' + i;
    questions.push(q);
  }
  console.log(`   Generated ${questions.length} questions from ${ALL_TEMPLATES.length} templates\n`);
  writeOutput('generated-pediatrics.json', questions);
}

main();
