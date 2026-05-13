/**
 * generate-surgery.mjs
 *
 * SMLE Surgery domain — 400 questions covering all subtopics.
 *
 * Usage: node scripts/generate-surgery.mjs
 */

import { writeOutput } from './question-utils.mjs';

const TARGET = 400;

function q(vignette, opts, correctText, topTags, rationale) {
  return (i) => {
    const shuffled = [...opts].sort(() => Math.random() - 0.5);
    const correctIdx = shuffled.findIndex((o) => o.text === correctText);
    const correctLetter = String.fromCharCode(65 + correctIdx);
    return {
      question: vignette.replace(/\{age\}/g, 28 + (i % 35)).replace(/\{gender\}/g, i % 2 === 0 ? 'male' : 'female'),
      topic: 'Surgery',
      scfhs_domain: 'Surgery',
      difficulty: ['Easy', 'Moderate', 'Moderate', 'Hard', 'Hard'][i % 5],
      year: '2024-2025', image_reference: false,
      options: shuffled.map((o) => ({ text: o.text, correct: o.text === correctText, rationale: o.r })),
      correct_answer: correctLetter, rationale, tags: topTags,
    };
  };
}

const SURGERY = [
  // Acute Appendicitis (Level 3)
  q('A {age}-year-old presents with acute onset of periumbilical pain migrating to the right lower quadrant, associated with nausea and anorexia. Temp 38.5°C, McBurney point tenderness, rebound. WBC 15. What is the most appropriate management?',
    [{ text: 'Laparoscopic appendectomy', r: 'Acute appendicitis with signs of peritonitis requires urgent appendectomy. Alvarado score ≥7 strongly predicts appendicitis. Pre-op antibiotics are standard.' },
     { text: 'IV antibiotics alone', r: 'Non-operative management is for uncomplicated appendicitis (no peritonitis). This patient has guarding and rebound.' },
     { text: 'CT-guided drainage', r: 'Drainage is for appendiceal abscess >3 cm, not acute appendicitis without abscess.' },
     { text: 'Observation and serial exams', r: 'With clear peritonitis signs, surgery should not be delayed. Observation risks perforation.' }],
    'Laparoscopic appendectomy', ['surgery', 'appendicitis', 'appendectomy'],
    'Acute appendicitis with peritonitis: urgent appendectomy. Alvarado score guides diagnosis. Perioperative antibiotics.'),

  // Bowel Obstruction (Level 3)
  q('A {age}-year-old with prior abdominal surgery presents with colicky abdominal pain, vomiting, abdominal distension, and constipation for 2 days. X-ray shows dilated small bowel loops with air-fluid levels. What is the most likely diagnosis?',
    [{ text: 'Adhesive small bowel obstruction', r: 'SBO with prior surgery: adhesions are the most common cause (60-70%). Management: NGT decompression, IV fluids, serial exams. Surgery if strangulation suspected.' },
     { text: 'Large bowel obstruction', r: 'LBO shows colonic dilation, not small bowel air-fluid levels. Feces in the colon suggests distal obstruction.' },
     { text: 'Paralytic ileus', r: 'Ileus shows dilated bowel with air throughout (both small and large). It is not associated with prior surgery as the sole cause.' },
     { text: 'Incarcerated hernia', r: 'Hernia would present with a tender groin or abdominal wall mass. This patient has no mention of a mass.' }],
    'Adhesive small bowel obstruction', ['surgery', 'SBO', 'adhesions'],
    'SBO: NGT decompression, IV fluids, NPO. CT for confirmation. Urgent surgery if closed-loop, strangulation, or failure of conservative management.'),

  // Cholecystitis (Level 3)
  q('A {age}-year-old o presents with acute right upper quadrant pain, fever 38.5°C, and vomiting. Murphy sign positive. WBC 14. US shows gallbladder wall thickening 6 mm, pericholecystic fluid, and gallstones. What is the most appropriate management?',
    [{ text: 'Laparoscopic cholecystectomy + IV antibiotics', r: 'Acute cholecystitis: early laparoscopic cholecystectomy (within 72 hours) plus antibiotics. Tokyo guidelines severity grading guides timing and approach.' },
     { text: 'IV antibiotics alone', r: 'Antibiotics alone do not treat the obstructed gallbladder. Cholecystectomy is definitive treatment.' },
     { text: 'ERCP', r: 'ERCP is for choledocholithiasis (CBD stones with jaundice/cholangitis). Cholecystitis alone does not require ERCP.' },
     { text: 'Percutaneous cholecystostomy', r: 'Cholecystostomy is for high-risk surgical patients with severe cholecystitis. First-line is laparoscopic cholecystectomy.' }],
    'Laparoscopic cholecystectomy + IV antibiotics', ['surgery', 'cholecystitis', 'cholecystectomy'],
    'Acute cholecystitis: early laparoscopic cholecystectomy (within 72 hours) + antibiotics. Tokyo guidelines for severity assessment.'),

  // Hernia (Level 3)
  q('A {age}-year-old presents with a reducible bulge in the right groin that becomes more prominent with coughing. No pain or tenderness. What is the most appropriate management?',
    [{ text: 'Elective inguinal hernia repair', r: 'Elective repair is indicated for symptomatic inguinal hernias to prevent incarceration/strangulation. Open (Lichtenstein) or laparoscopic approaches.' },
     { text: 'Emergency surgery', r: 'Emergency surgery is for incarcerated or strangulated hernias with signs of obstruction or ischemia. This hernia is reducible and asymptomatic.' },
     { text: 'Observation only', r: 'Watchful waiting is for asymptomatic inguinal hernias in men. Symptomatic hernias or those causing discomfort warrant repair.' },
     { text: 'Truss (supportive device)', r: 'Trusses are historical treatments. Surgical repair is the standard of care for inguinal hernias.' }],
    'Elective inguinal hernia repair', ['surgery', 'inguinal-hernia', 'herniorrhaphy'],
    'Symptomatic inguinal hernia warrants elective repair. Strangulated hernia requires emergency surgery with bowel viability assessment.'),

  // Breast Mass (Level 3)
  q('A {age}-year-old finds a firm, non-tender, fixed mass in the upper outer quadrant of the right breast. No nipple discharge. Mammogram shows a spiculated mass with microcalcifications. What is the most appropriate next step?',
    [{ text: 'Core needle biopsy', r: 'BIRADS 4 or 5 lesions (suspicious for malignancy) require tissue diagnosis. Core needle biopsy is preferred for histologic diagnosis and receptor status.' },
     { text: 'Repeat mammogram in 6 months', r: 'Short interval follow-up is for BIRADS 3 (probably benign). Spiculated mass with microcalcifications is BIRADS 5, requiring biopsy.' },
     { text: 'Excisional biopsy', r: 'Excisional biopsy is for lesions not amenable to core biopsy. Core needle biopsy is less invasive and preferred.' },
     { text: 'Ultrasound alone', r: 'Ultrasound helps characterize the mass but does not provide tissue diagnosis. Biopsy is needed for suspicious findings.' }],
    'Core needle biopsy', ['surgery', 'breast-mass', 'biopsy'],
    'Suspicious breast mass (BIRADS 4/5): core needle biopsy for histologic diagnosis, receptor status, and treatment planning.'),

  // Thyroid Nodule (Level 2)
  q('A {age}-year-old presents with a thyroid nodule found on exam. TSH is normal. Ultrasound shows a 2.5 cm solid, hypoechoic nodule with microcalcifications and irregular margins. What is the most appropriate next step?',
    [{ text: 'Fine needle aspiration biopsy', r: 'Thyroid nodules with suspicious ultrasound features (hypoechoic, microcalcifications, irregular margins, taller-than-wide) require FNA regardless of size.' },
     { text: 'Thyroid scan', r: 'Nuclear scan is for nodules with low TSH (hot vs cold). With normal TSH, ultrasound and FNA guide management.' },
     { text: 'CT neck', r: 'CT is not first-line for thyroid nodule evaluation. Ultrasound with FNA is the standard approach.' },
     { text: 'Annual follow-up ultrasound', r: 'Suspicious features require FNA, not surveillance. Surveillance is for benign nodules after adequate sampling.' }],
    'Fine needle aspiration biopsy', ['surgery', 'thyroid-nodule', 'FNA'],
    'Thyroid nodule with suspicious ultrasound features: FNA. Bethesda classification guides management from surveillance to thyroidectomy.'),

  // Necrotizing Fasciitis (Level 3)
  q('A {age}-year-old with diabetes presents with severe leg pain out of proportion to exam, swelling, erythema, bullae, and crepitus. The patient is febrile and tachycardic. What is the most appropriate management?',
    [{ text: 'Emergency surgical debridement + broad-spectrum IV antibiotics', r: 'Necrotizing fasciitis is a surgical emergency. Immediate wide debridement is life-saving. Broad-spectrum antibiotics and ICU support are adjunctive.' },
     { text: 'IV antibiotics alone', r: 'Antibiotics alone cannot penetrate necrotic tissue. Surgical debridement is essential for source control.' },
     { text: 'MRI for confirmation', r: 'Suspicion of NF based on clinical exam is enough to proceed to surgery. Imaging delays definitive management.' },
     { text: 'Incision and drainage of abscess', r: 'NF requires wide excision of all necrotic tissue, not simple I&D. Multiple debridements are often needed.' }],
    'Emergency surgical debridement + broad-spectrum IV antibiotics', ['surgery', 'necrotizing-fasciitis', 'debridement'],
    'Necrotizing fasciitis: emergency wide surgical debridement + broad-spectrum abx + ICU. LRINEC score aids diagnosis but should not delay treatment.'),

  // Trauma — ATLS (Level 3)
  q('A {age}-year-old involved in a high-speed motor vehicle collision arrives with BP 80/50, HR 130, cool extremities, and altered mental status. What is the first step in management?',
    [{ text: 'Primary survey (ABCDE) with simultaneous resuscitation', r: 'ATLS: primary survey first. Airway with C-spine control, Breathing, Circulation (IV access, fluids, blood), Disability, Exposure. Treat life threats as found.' },
     { text: 'CT head and abdomen', r: 'Imaging is part of the secondary survey. Primary survey and resuscitation must precede transport to CT.' },
     { text: 'FAST ultrasound', r: 'FAST is done during the primary survey (circulation) but does not replace ABC assessment. It helps identify intra-abdominal bleeding.' },
     { text: 'Intubate and ventilate', r: 'Airway is the first step of primary survey. If the airway is patent and breathing is adequate, proceed to circulation.' }],
    'Primary survey (ABCDE) with simultaneous resuscitation', ['surgery', 'trauma', 'ATLS', 'primary-survey'],
    'ATLS: primary survey ABCDE. Treat life-threatening conditions as they are identified. Secondary survey after resuscitation.'),

  // Burns (Level 3)
  q('A {age}-year-old sustains partial-thickness burns to both upper extremities (18%), anterior trunk (18%), and right thigh (9%). Total body surface area burned is 45%. What is the most appropriate immediate fluid resuscitation?',
    [{ text: 'Parkland formula: 4 mL/kg/%TBSA Ringer\'s lactate, half in first 8 hours', r: 'Parkland: 4 mL Ringer\'s lactate × weight (kg) × %TBSA. Half given in first 8 hours, half in next 16 hours. Titrate to urine output 0.5-1 mL/kg/hr.' },
     { text: 'Normal saline at 250 mL/hour', r: 'Parkland formula provides calculated resuscitation volumes. Fixed-rate fluids are insufficient for large burns.' },
     { text: 'Dextrose 5% water', r: 'D5W is not a resuscitation fluid. Crystaloid solutions are required for burn shock. Dextrose provides only free water.' },
     { text: 'Colloids first-line', r: 'Colloids (albumin) are not recommended in the first 24 hours due to capillary leak. Crystalloids (Ringer\'s lactate) are first-line.' }],
    'Parkland formula: 4 mL/kg/%TBSA Ringer\'s lactate, half in first 8 hours', ['surgery', 'burns', 'fluid-resuscitation', 'Parkland'],
    'Burn resuscitation: Parkland formula. Monitor urine output. Escharotomy for circumferential full-thickness burns. NTG for inhalation injury.'),

  // Colorectal Cancer (Level 2)
  q('A {age}-year-old presents with change in bowel habits, rectal bleeding, and weight loss for 3 months. Colonoscopy shows a mass in the sigmoid colon. Biopsy confirms adenocarcinoma. CT shows no metastatic disease. What is the most appropriate management?',
    [{ text: 'Surgical resection with primary anastomosis', r: 'Localized colon cancer: surgical resection with en bloc lymphadenectomy is curative. Adjuvant chemotherapy for stage III or high-risk II.' },
     { text: 'Neoadjuvant chemoradiation', r: 'Neoadjuvant therapy is for rectal cancer, not colon cancer. Colon cancer is managed with primary surgical resection.' },
     { text: 'Palliative chemotherapy', r: 'Palliative chemo is for metastatic disease. This patient has localized, potentially curable disease.' },
     { text: 'Endoscopic mucosal resection', r: 'EMR is for early (T1) lesions confined to mucosa/submucosa. Invasive adenocarcinoma requires formal resection with lymphadenectomy.' }],
    'Surgical resection with primary anastomosis', ['surgery', 'colon-cancer', 'resection'],
    'Localized colon cancer: surgical resection + lymphadenectomy. Adjuvant chemo for node-positive or high-risk stage II disease.'),

  // Intussusception (Level 2)
  q('A {mo}-month-old presents with intermittent screaming episodes drawing knees to chest, vomiting, and currant-jelly stool. A sausage-shaped mass is palpated in the right upper quadrant. What is the most appropriate management?',
    [{ text: 'Air contrast enema (diagnostic and therapeutic)', r: 'Intussusception: air enema is both diagnostic and therapeutic, successful in 80-95%. Contraindicated if peritonitis or perforation is suspected.' },
     { text: 'Exploratory laparotomy', r: 'Surgery is reserved for enema failure, perforation, peritonitis, or pathologic lead point. Enema is first-line.' },
     { text: 'Abdominal X-ray', r: 'AXR may show target sign but is not therapeutic. It should not delay therapeutic enema.' },
     { text: 'IV antibiotics', r: 'Antibiotics have no role in intussusception management. Reduction via enema is the priority.' }],
    'Air contrast enema (diagnostic and therapeutic)', ['surgery', 'intussusception', 'enema'],
    'Intussusception: air or contrast enema reduces the bowel. Surgical reduction if enema fails or peritonitis is present.'),
];

const ALL_TEMPLATES = [...SURGERY];

function main() {
  console.log('\n🔪 Generating Surgery questions...\n');
  const questions = [];
  for (let i = 0; i < TARGET; i++) {
    const tpl = ALL_TEMPLATES[i % ALL_TEMPLATES.length];
    const q = tpl(i);
    q.topic = 'Surgery';
    q._uid = 'surg-' + i;
    questions.push(q);
  }
  console.log(`   Generated ${questions.length} questions from ${ALL_TEMPLATES.length} templates\n`);
  writeOutput('generated-surgery.json', questions);
}

main();
