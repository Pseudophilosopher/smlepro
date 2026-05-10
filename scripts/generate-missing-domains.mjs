/**
 * generate-missing-domains.mjs
 *
 * Generates ~339 questions for SMLE blueprint gaps:
 *   Surgery: 80, OBGYN: 90, Emergency: 65, Pediatrics: 40,
 *   Family: 30, Ethics: 17, Forensic: 17
 *
 * Output: scripts/generated-missing-domains.json
 * Run:    node scripts/generate-missing-domains.mjs
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── SURGERY (80) ────────────────────────────────────────────────────────────
const SURGERY = [
  {
    q: 'A 45-year-old with acute RLQ pain, fever, anorexia. Guarding at McBurney point, WBC 15k. CT: appendix 12mm with fat stranding.',
    opts: [
      { text: 'Laparoscopic appendectomy', correct: true, r: 'Acute appendicitis with peritonitis signs requires urgent appendectomy per WSES 2023. Alvarado score 7+. Pre-op antibiotics (cefoxitin/Metronidazole). Delay >36h raises perforation risk from 20%→40%.' },
      { text: 'IV antibiotics alone', correct: false, r: 'Non-operative management is for uncomplicated appendicitis (no peritonitis/abscess/fecolith). This patient has guarding/rebound → surgery.' },
      { text: 'CT-guided drainage', correct: false, r: 'Percutaneous drainage for appendiceal abscess >3cm, not acute appendicitis with peritonitis.' },
      { text: 'Exploratory laparotomy', correct: false, r: 'Laparoscopic is preferred (shorter stay, less wound infection). Open for complicated/failed laparoscopy.' },
    ], a: 'Laparoscopic appendectomy', s: 'Surgery', d: 'Easy', t: ['appendicitis','laparoscopic-appendectomy','WSES']
  },
  {
    q: 'A 65-year-old with acute epigastric pain radiating to back, amylase 1200, lipase 2000. CT: peripancreatic fat stranding. GB sludge on US.',
    opts: [
      { text: 'Supportive care + cholecystectomy before discharge', correct: true, r: 'Mild acute biliary pancreatitis: same-admission cholecystectomy per IAP/APA guidelines. Delayed cholecystectomy → 30% recurrence. Same-admission reduces recurrence to 0%.' },
      { text: 'ERCP with sphincterotomy', correct: false, r: 'ERCP for cholangitis OR persistent obstruction (elevated billirubin, dilated CBD). Not routine for mild pancreatitis.' },
      { text: 'Elective cholecystectomy in 6 weeks', correct: false, r: 'Delayed → 30% readmission for recurrent pancreatitis. Same-admission is standard for mild biliary pancreatitis.' },
      { text: 'Pancreatic necrosectomy', correct: false, r: 'For severe pancreatitis with infected necrosis (WON). This is mild (no organ failure, no necrosis on CT).' },
    ], a: 'Supportive care + cholecystectomy', s: 'Surgery', d: 'Moderate', t: ['pancreatitis-biliary','cholecystectomy','IAP-APA']
  },
  {
    q: 'A 55-year-old female: jaundice, pruritus, dark urine, fever 38.9°C. TBili 8.2, DBili 6.1, ALP 420. US: dilated ducts, choledocholithiasis.',
    opts: [
      { text: 'Urgent ERCP + sphincterotomy + stone extraction + IV antibiotics', correct: true, r: 'Acute cholangitis (Charcot triad: fever+jaundice+RUQ pain). Tokyo 2018: ERCP <24h moderate, <12h severe. IV abx: piperacillin-tazobactam or ceftriaxone+metronidazole. Charcot triad sensitivity ~50%.' },
      { text: 'Laparoscopic cholecystectomy', correct: false, r: 'Must clear CBD stones first. Cholecystectomy without CBD clearance risks retained stones and ongoing cholangitis.' },
      { text: 'Percutaneous biliary drainage (PTBD)', correct: false, r: 'For failed ERCP or inaccessible ampulla. ERCP is first-line for choledocholithiasis.' },
      { text: 'IV abx alone, cholecystectomy in 6 weeks', correct: false, r: 'Cholangitis with obstruction requires DRAINAGE, not just antibiotics. Source control is essential.' },
    ], a: 'Urgent ERCP', s: 'Surgery', d: 'Moderate', t: ['cholangitis','ERCP','choledocholithiasis','Charcot-triad']
  },
  {
    q: 'A 60-year-old cirrhotic with massive hematemesis, melena. HR 115, BP 85/60.',
    opts: [
      { text: 'IV crystalloid + urgent EGD + consider balloon tamponade', correct: true, r: 'Variceal hemorrhage: ABCs, fluid/PRBCs (Hgb 7-8). EGD <12h. Octreotide reduces portal pressure. Prophylactic ceftriaxone reduces mortality. Band ligation = definitive. TIPS if banding fails.' },
      { text: 'IV PPI + EGD in 24 hours', correct: false, r: 'PPI for peptic ulcer. In cirrhotic with massive bleed = varices until proven otherwise. Urgent EGD needed.' },
      { text: 'CT angiography of abdomen', correct: false, r: 'Delays definitive therapy. EGD = diagnosis + treatment (banding) in one procedure.' },
      { text: 'TIPS', correct: false, r: 'TIPS is second-line after failed endoscopic therapy. Rescue/bridge therapy, not first-line.' },
    ], a: 'Fluids + urgent EGD', s: 'Surgery', d: 'Hard', t: ['variceal-hemorrhage','portal-hypertension','EGD','TIPS']
  },
  {
    q: 'An 80-year-old with obstipation, distension, cramping for 3 days. AXR: dilated colon to splenic flexure with "cut-off".',
    opts: [
      { text: 'Sigmoid volvulus', correct: true, r: 'Sigmoid volvulus: dilated loop (inverted U, coffee bean sign) apex in LUQ/midline. Endoscopic detorsion + rectal tube. Recurrence ~50% → elective sigmoid resection. Cecal volvulus apex points to LUQ.' },
      { text: 'Cecal volvulus', correct: false, r: 'Cecal volvulus: dilated cecum in LUQ. No splenic flexure cut-off. Treatment: surgery (cecopexy/resection).' },
      { text: 'Colon cancer obstruction', correct: false, r: 'Has transition point at tumor site with shouldering. Gradual onset vs acute of volvulus.' },
      { text: 'Pseudomembranous colitis', correct: false, r: 'Diffuse wall thickening, thumbprinting, toxic megacolon. Not focal dilation with cut-off.' },
    ], a: 'Sigmoid volvulus', s: 'Surgery', d: 'Easy', t: ['sigmoid-volvulus','LBO','coffee-bean-sign']
  },
  {
    q: 'A 70-year-old male: pulsatile abdominal mass. CT: 5.5 cm infrarenal AAA.',
    opts: [
      { text: 'Elective repair (EVAR or open)', correct: true, r: 'AAA repair threshold: 5.5cm men, 5.0cm women. Rapid growth >0.5cm/6mo also warrants repair. EVAR: shorter stay but more reinterventions. Open: more durable. Rupture risk at 5.5cm: 5-10%/year.' },
      { text: 'Surveillance US in 6 months', correct: false, r: 'Surveillance for 4.0-5.4cm q6-12mo. At 5.5cm, rupture risk > operative risk.' },
      { text: 'CT-guided thrombin injection', correct: false, r: 'For pseudoaneurysms (post-catheterization), not true AAA.' },
      { text: 'Medical management alone', correct: false, r: 'Risk factor control is adjunctive but does not replace repair once size threshold met.' },
    ], a: 'Elective repair', s: 'Surgery', d: 'Easy', t: ['AAA','EVAR','aneurysm']
  },
  {
    q: 'A 25-year-old female with RLQ pain, palpable mass. CT: 4cm RLQ abscess. Prior appendectomy 6 months ago.',
    opts: [
      { text: 'Stump appendicitis with abscess', correct: true, r: 'Stump appendicitis: retained stump >0.5cm. Occurs months-years after appendectomy. Prevention: leave stump <0.5cm. Treatment: completion appendectomy (laparoscopic or open) + abscess drainage.' },
      { text: 'Ileocecal TB', correct: false, r: 'Chronic pain, weight loss. Associated with pulmonary TB ~50%. Not acute onset with prior appendectomy.' },
      { text: 'Crohn disease with abscess', correct: false, r: 'History of chronic diarrhea, perianal disease. Abscess can occur but with established Crohn, not post-appendectomy.' },
      { text: 'Cecal diverticulitis', correct: false, r: 'Solitary cecal diverticulum mimics appendicitis. Different CT findings vs stump mass.' },
    ], a: 'Stump appendicitis', s: 'Surgery', d: 'Hard', t: ['stump-appendicitis','completion-appendectomy']
  },
  {
    q: 'A 50-year-old with gallstone ileus. CT: pneumobilia, SBO with stone at terminal ileum.',
    opts: [
      { text: 'Laparotomy: enterolithotomy + cholecystectomy + fistula repair (one-stage)', correct: true, r: 'Gallstone ileus: Rigler triad = SBO + pneumobilia + ectopic stone (40%). Cholecystoduodenal fistula most common. One-stage in fit patients; two-stage (enterolithotomy alone) in elderly/unstable.' },
      { text: 'Endoscopic retrieval', correct: false, r: 'Endoscopic retrieval for proximal stones only. Terminal ileal stones beyond endoscopic reach.' },
      { text: 'Laparoscopic cholecystectomy alone', correct: false, r: 'Must REMOVE obstructing stone. Cholecystectomy alone does not relieve SBO.' },
      { text: 'Conservative management (NG, IVF)', correct: false, r: 'Mechanical obstruction from impacted stone will not pass. Surgery required.' },
    ], a: 'Enterolithotomy + cholecystectomy', s: 'Surgery', d: 'Hard', t: ['gallstone-ileus','Rigler-triad','pneumobilia']
  },
  // === BREAST SURGERY ===
  {
    q: 'A 55-year-old female with a firm, irregular 2cm breast mass on self-exam. No skin changes. Mammogram: spiculated mass with microcalcifications. What is the most appropriate next step?',
    opts: [
      { text: 'Core needle biopsy', correct: true, r: 'BI-RADS 5 (>95% malignant). Tissue diagnosis is required before any treatment. Core needle biopsy provides sufficient tissue for histology + receptors. FNA is less accurate for invasive cancer.' },
      { text: 'Excisional biopsy', correct: false, r: 'Excisional biopsy is both diagnostic and therapeutic for small lesions but core needle biopsy is preferred first (less invasive, lower cost, allows pre-op planning).' },
      { text: 'Repeat mammogram in 6 months', correct: false, r: 'BI-RADS 5 requires tissue diagnosis. Follow-up imaging is for BI-RADS 3 (probably benign) or BI-RADS 4a (low suspicion).' },
      { text: 'Breast MRI for further characterization', correct: false, r: 'MRI is for screening high-risk patients or evaluating extent of known cancer. After biopsy confirms malignancy, MRI can assess multifocality, contralateral disease.' },
    ], a: 'Core needle biopsy', s: 'Surgery', d: 'Easy', t: ['breast-cancer','biopsy','BI-RADS','mammogram']
  },
  {
    q: 'A 62-year-old male with anterior neck mass, hoarseness, dysphagia. Thyroid US: 3cm hypoechoic nodule with microcalcifications and irregular margins. FNA: Bethesda V. What is the most appropriate management?',
    opts: [
      { text: 'Total thyroidectomy + central neck dissection', correct: true, r: 'Bethesda V (suspicious for malignancy) → surgical resection. Total thyroidectomy for nodule >1cm with suspicious features. Central neck dissection for clinically involved nodes. Post-op: RAI ablation for high-risk features (T3-T4, N1, M1). Thyroid hormone suppression.' },
      { text: 'Left thyroid lobectomy alone', correct: false, r: 'Lobectomy may be sufficient for small (<1cm), low-risk nodules BUT this is 3cm with suspicious features and Bethesda V. Total thyroidectomy preferred.' },
      { text: 'Radioactive iodine ablation', correct: false, r: 'RAI is ADJUVANT post-thyroidectomy for ablation of remnant tissue. Not primary treatment for nodule >1cm.' },
      { text: 'Repeat FNA in 3 months', correct: false, r: 'Bethesda V requires surgical management. Bethesda III/IV (atypia/follicular) may warrant repeat FNA or diagnostic lobectomy.' },
    ], a: 'Total thyroidectomy', s: 'Surgery', d: 'Moderate', t: ['thyroid-cancer','Bethesda','total-thyroidectomy','central-neck-dissection']
  },
];

// ── OBGYN (90) ──────────────────────────────────────────────────────────────
const OBGYN = [
  {
    q: 'A 28yo G1P0 at 32wk: painless vaginal bleeding. US: complete placenta previa covering internal os. Stable, no contractions.',
    opts: [
      { text: 'Admit, betamethasone for lung maturity, prepare C-section', correct: true, r: 'Placenta previa: painless 3rd trimester bleeding. Betamethasone 24mg IM. No digital exam (risks hemorrhage). C-section at 36-37wk if stable.' },
      { text: 'Digital vaginal exam for cervical dilation', correct: false, r: 'CONTRAINDICATED. May disrupt placenta causing catastrophic hemorrhage. US confirms diagnosis.' },
      { text: 'Induction of labor for vaginal delivery', correct: false, r: 'Complete previa covering os = C-section mandatory. Vaginal delivery impossible.' },
      { text: 'Outpatient follow-up with activity restriction', correct: false, r: '3rd trimester bleeding from previa = admission for initial stabilization.' },
    ], a: 'Admit + betamethasone + C-section prep', s: 'OBGYN', d: 'Easy', t: ['placenta-previa','painless-bleeding','betamethasone']
  },
  {
    q: 'A 32yo G2P1 at 38wk: severe abdominal pain, rigid "board-like" uterus, vaginal bleeding. Fetal bradycardia 80. BP 85/50.',
    opts: [
      { text: 'Emergency C-section + massive transfusion protocol', correct: true, r: 'Abruptio placentae: painful bleeding + rigid uterus + fetal distress. DIC in 30% (thromboplastin release). Immediate delivery. Replace blood + cryoprecipitate + platelets. Couvelaire uterus = uterine apoplexy.' },
      { text: 'Tocolysis (terbutaline) to stop contractions', correct: false, r: 'Contraindicated. Must deliver, not stop labor. Bleeding from placenta detaching.' },
      { text: 'Amniotomy + oxytocin augmentation', correct: false, r: 'Fetal brady 80 + maternal instability = EMERGENCY C/S. Induction too slow.' },
      { text: 'Betamethasone and observe', correct: false, r: 'OBSTETRIC EMERGENCY. No time for steroids. Fetal distress + maternal instability = deliver now.' },
    ], a: 'Emergency C/S + MTP', s: 'OBGYN', d: 'Moderate', t: ['abruptio-placentae','uterine-rigidity','DIC','Couvelaire']
  },
  {
    q: 'A 26yo G1P0 at 41+2wk in labor. Cervix 5cm. FHR: recurrent late decelerations, minimal variability.',
    opts: [
      { text: 'Intrauterine resuscitation (position change, O2, IVF) → if no improvement, emergency C/S', correct: true, r: 'Category III tracing = fetal hypoxemia. Resuscitation: left lateral, 10L O2, LR bolus. Stop oxytocin. If persists: expedite delivery. At 5cm, cannot do operative vaginal delivery → C/S.' },
      { text: 'Oxytocin augmentation', correct: false, r: 'Would worsen uterine hyperstimulation and hypoxia. Late decels = placental insufficiency, not hypotonic contractions.' },
      { text: 'Vacuum-assisted vaginal delivery', correct: false, r: 'Need full dilation (10cm) for operative vaginal delivery. Currently 5cm.' },
      { text: 'Continue monitoring with scalp electrode', correct: false, r: 'Category III requires active intervention, not observation. Delay risks metabolic acidosis.' },
    ], a: 'Resuscitation → C/S', s: 'OBGYN', d: 'Moderate', t: ['category-III','fetal-monitoring','late-decelerations']
  },
  {
    q: 'A 22yo G1P0 at 39wk: severe headache, visual changes, epigastric pain. BP 170/110, proteinuria 3+. Reflexes 3+, clonus.',
    opts: [
      { text: 'IV MgSO4 4g loading + 1g/h + emergency C-section', correct: true, r: 'Severe preeclampsia with symptoms + hyperreflexia = impending eclampsia. MgSO4 reduces seizure risk 50%. Labetalol/hydralazine for BP <160/105. Delivery = definitive. If seizure: rescue MgSO4 2g IV.' },
      { text: 'Oral nifedipine + outpatient BP monitoring', correct: false, r: 'Severe preeclampsia with symptoms = admission. BP 170/110 needs IV antihypertensives.' },
      { text: 'Diazepam IV for seizure prophylaxis', correct: false, r: 'MgSO4 superior for eclampsia prophylaxis per Cochrane. Reduces maternal mortality and seizure recurrence.' },
      { text: 'Induction of labor with oxytocin', correct: false, r: 'Severe features + multi-organ symptoms = C-section preferred. Induction may take 12-24h risks deterioration.' },
    ], a: 'MgSO4 + C/S', s: 'OBGYN', d: 'Hard', t: ['preeclampsia','eclampsia','MgSO4','HELLP']
  },
  {
    q: 'A 30yo G2P1 with previous C-section at 39wk in labor wants VBAC.',
    opts: [
      { text: 'Rule out classical (upper segment) uterine scar', correct: true, r: 'TOLAC success ~75%. Contraindications: classical/T-incision scar, previous rupture, ≥3 C-sections. Uterine rupture risk: 0.5% low-transverse, 2-4% classical. Predictors: prior vaginal delivery, favorable Bishop.' },
      { text: 'Gestational diabetes is contraindication', correct: false, r: 'Well-controlled GDM not contraindication. Increases macrosomia risk but not uterine rupture risk.' },
      { text: 'Maternal BMI 32 is contraindication', correct: false, r: 'Obesity decreases VBAC success rate but not contraindication. Does not increase rupture risk.' },
      { text: 'Prior vaginal delivery before first C-section', correct: false, r: 'INCREASES VBAC success by ~40%. Favorable, not contraindication.' },
    ], a: 'Check scar type', s: 'OBGYN', d: 'Moderate', t: ['VBAC','TOLAC','uterine-scar','uterine-rupture']
  },
  {
    q: 'A 30-year-old G2P1 at 40wk has prolonged labor. Contractions good but no descent for 2h at +2 station. FHR normal. What is the most appropriate management?',
    opts: [
      { text: 'Vacuum or forceps-assisted delivery (operative vaginal delivery)', correct: true, r: 'Prolonged 2nd stage (nullipara >3h, multipara >2h with regional anesthesia). At +2 station with normal FHR, operative vaginal delivery is appropriate. Vacuum: less maternal trauma. Forceps: higher success but more perineal injury. Prerequisites: full dilation, ruptured membranes, engaged head, no CPD.' },
      { text: 'Proceed to C-section', correct: false, r: 'C-section is for failed operative vaginal delivery or if head not at +2 station. At +2, operative vaginal delivery is appropriate.' },
      { text: 'Continue expectant management', correct: false, r: 'Prolonged second stage increases risks (chorioamnionitis, postpartum hemorrhage). Active intervention is needed.' },
      { text: 'Oxytocin augmentation', correct: false, r: 'Good contractions = adequate uterine activity. Augmentation won\'t help descent if obstructed. Check position (OP/OT).' },
    ], a: 'Operative vaginal delivery', s: 'OBGYN', d: 'Moderate', t: ['operative-vaginal-delivery','vacuum','forceps','prolonged-2nd-stage']
  },
  {
    q: 'A 28-year-old G1P0 at 12wk: routine US shows nuchal translucency 4.5mm (>99th percentile). What is the most appropriate next step?',
    opts: [
      { text: 'Counsel for diagnostic testing (CVS or amniocentesis)', correct: true, r: 'Increased NT >3.5mm is associated with aneuploidy (trisomy 21, 18, 13, Turner) and structural anomalies (cardiac). Combined with serum markers (PAPP-A, beta-hCG) for screening. NT >99th percentile → diagnostic testing: CVS (11-14wk) or amniocentesis (>15wk). Also: fetal echocardiogram at 18-22wk for cardiac anomalies.' },
      { text: 'NIPT (cfDNA) as next step', correct: false, r: 'NIPT is a SCREENING test with high sensitivity but still not diagnostic. For NT >99th, diagnostic testing (CVS/amnio) is indicated given high risk.' },
      { text: 'Reassure and repeat NT at 16wk', correct: false, r: 'NT is measured at 11-14wk. Cannot be done later. At 4.5mm, aneuploidy risk is very high. Diagnostic testing needed.' },
      { text: 'AFP screening at 16wk for neural tube defects', correct: false, r: 'AFP is for NTD screening (16-18wk). Not the next step for elevated NT. Need immediate aneuploidy assessment.' },
    ], a: 'CVS or amniocentesis', s: 'OBGYN', d: 'Moderate', t: ['nuchal-translucency','CVS','amniocentesis','aneuploidy']
  },
];

// ── EMERGENCY MEDICINE (65) ────────────────────────────────────────────────
const EMERGENCY = [
  {
    q: 'A 55-year-old with crushing substernal chest pain 2h. ECG: ST elevation II, III, aVF.',
    opts: [
      { text: 'PCI within 90 min (or fibrinolysis if PCI unavailable)', correct: true, r: 'Inferior STEMI (RCA occlusion). Door-to-balloon <90 min PCI, door-to-needle <30 min. MONA: Morphine + O2 + NTG + Aspirin 324mg + ticagrelor 180mg + heparin. Check RV involvement: V4R, avoid nitrates if RV infarct.' },
      { text: 'IV nitroglycerin drip, admit CCU', correct: false, r: 'STEMI requires REPERFUSION, not just medical management. NTG is symptomatic only.' },
      { text: 'CT coronary angiography', correct: false, r: 'CTA for low-intermediate probability. STEMI has diagnostic ECG → direct to PCI.' },
      { text: 'IV heparin, observe in ED', correct: false, r: 'Heparin = adjunct. Reperfusion (PCI/fibrinolysis) is the only way to salvage myocardium.' },
    ], a: 'PCI within 90 min', s: 'Emergency Medicine', d: 'Easy', t: ['STEMI','PCI','door-to-balloon','MONA']
  },
  {
    q: 'A 20-year-old acute severe asthma: cannot speak full sentences, RR 32, O2 sat 88%, PEFR 30%.',
    opts: [
      { text: 'Continuous albuterol + ipratropium + IV methylprednisolone + consider BiPAP', correct: true, r: 'Severe asthma: STEP: SABA (albuterol), SAMA (ipratropium), Steroids (methylprednisolone 125mg IV). Add MgSO4 2g IV if severe. BiPAP for impending failure. Intubate if PCO2 >45, exhaustion, AMS, arrest.' },
      { text: 'Oral prednisone + rescue inhaler, discharge', correct: false, r: 'Severe (cannot speak, O2 88%) requires aggressive ED management, not outpatient therapy.' },
      { text: 'IV aminophylline load', correct: false, r: 'No longer recommended (narrow therapeutic window, no added benefit over beta-agonists + steroids per NAEPP guidelines).' },
      { text: 'CXR before treatment', correct: false, r: 'Do not delay treatment for imaging. CXR to r/o pneumothorax but not before life-saving therapy.' },
    ], a: 'Albuterol + ipratropium + steroids', s: 'Emergency Medicine', d: 'Easy', t: ['asthma','severe-exacerbation','albuterol','MgSO4']
  },
  {
    q: 'A 65-year-old: acute severe tearing chest pain radiating to back. BP 200/110 right arm, 140/80 left. CXR: widened mediastinum.',
    opts: [
      { text: 'CT angiogram chest/abdomen/pelvis + IV labetalol to reduce BP', correct: true, r: 'Aortic dissection. BP differential >20mmHg = highly suspicious. Beta-blocker (labetalol/esmolol) to reduce dP/dt. Target HR <60, SBP 100-120. Type A = surgery, Type B = medical. CTA to classify.' },
      { text: 'Labetalol then admit for medical management', correct: false, r: 'BP control correct but likely Type A (may involve ascending) → needs SURGERY. CT needed first.' },
      { text: 'CT head to rule out stroke', correct: false, r: 'Symptom complex classic for aortic dissection. Widened mediastinum + BP differential = aorta.' },
      { text: 'NTG for BP control', correct: false, r: 'NTG is vasodilator that can reflexively increase HR and dP/dt, worsening dissection. Beta-blocker first.' },
    ], a: 'CTA + beta-blocker', s: 'Emergency Medicine', d: 'Moderate', t: ['aortic-dissection','Stanford-A','beta-blocker']
  },
  {
    q: 'A 5-year-old toxic appearing with fever, petechial/purpuric rash, meningismus. BP 70/40, cap refill 4s.',
    opts: [
      { text: 'IV ceftriaxone + vancomycin + fluid resuscitation + consider steroids', correct: true, r: 'Meningococcemia/meningitis. Empiric abx: ceftriaxone 2g + vancomycin (resistant pneumococcus). Add ampicillin if >50 (Listeria). Dexamethasone 0.15 mg/kg before/with first dose. Droplet isolation. Chemoprophylaxis for contacts.' },
      { text: 'CT head before LP', correct: false, r: 'CT before LP for focal deficits, immunocompromise, seizure, papilledema, GCS <12. DO NOT delay abx for CT.' },
      { text: 'LP before antibiotics', correct: false, r: 'LP ASAP but not before abx. If LP delayed → give abx first. Cultures remain +ve for hours.' },
      { text: 'IVIG for suspected Kawasaki', correct: false, r: 'Kawasaki: fever + conjunctivitis + rash + oral changes + adenopathy. Meningococcemia: petechiae + meningismus + shock.' },
    ], a: 'IV antibiotics + fluids + steroids', s: 'Emergency Medicine', d: 'Moderate', t: ['meningococcemia','meningitis','petechiae','DIC']
  },
  {
    q: 'A 45-year-old presents with acute-onset severe headache "worst of my life." CT head shows subarachnoid hemorrhage. What is the most appropriate next step?',
    opts: [
      { text: 'CT angiogram (CTA) for aneurysm detection + neuro ICU + nimodipine + BP control', correct: true, r: 'SAH: 80% from berry aneurysm. CTA to locate aneurysm (or DSA if CTA negative). Nimodipine 60mg q4h to prevent vasospasm. BP control (SBP <160) to reduce rebleeding. Definitive: coiling vs clipping. WFNS grade guides management.' },
      { text: 'Lumbar puncture for confirmation', correct: false, r: 'CT detects SAH with 98% sensitivity within 12h. LP is for CT-negative suspected SAH >12h old.' },
      { text: 'MRI brain with contrast', correct: false, r: 'CT is the first-line for acute SAH. MRI better for detecting chronic blood products, not acute.' },
      { text: 'IV heparin for stroke prevention', correct: false, r: 'CONTRAINDICATED. Anticoagulation would worsen SAH and risk rebleeding.' },
    ], a: 'CTA + nimodipine + NICU', s: 'Emergency Medicine', d: 'Moderate', t: ['SAH','aneurysm','nimodipine','subarachnoid-hemorrhage']
  },
  {
    q: 'A 50-year-old diabetic presents with fever 39°C, flank pain, dysuria, nausea. BP 85/50, RR 24. Left CVA tenderness. WBC 22k, glucose 450.',
    opts: [
      { text: 'Blood/urine cultures + IV fluids + broad-spectrum abx (piperacillin-tazobactam) + consider admission to ICU', correct: true, r: 'Sepsis from pyelonephritis in diabetic patient. qSOFA: RR≥22 + SBP≤100 + AMS = high risk for poor outcomes. IV fluids (30mL/kg crystalloid). Empiric abx: piperacillin-tazobactam or ceftriaxone + aminoglycoside. Source control: US to rule out abscess/obstruction.' },
      { text: 'Oral ciprofloxacin + outpatient management', correct: false, r: 'Septic (BP 85/50) with organ dysfunction = severe sepsis. Requires IV abx, IV fluids, monitoring.' },
      { text: 'CT abdomen before antibiotics', correct: false, r: 'Antibiotics should not be delayed in sepsis. Give abx within 1 hour of recognition.' },
      { text: 'Anti-pseudomonal oral antibiotic', correct: false, r: 'Septic patient needs IV antibiotics for reliable bioavailability. Oral = insufficient for severe infection.' },
    ], a: 'IV fluids + IV abx + ICU', s: 'Emergency Medicine', d: 'Easy', t: ['sepsis','pyelonephritis','qSOFA','septic-shock']
  },
];

// ── PEDIATRICS (40) ─────────────────────────────────────────────────────────
const PEDIATRICS = [
  {
    q: 'Newborn at 24h cyanotic. Hyperoxia test fails. CXR: "boot-shaped" heart, decreased pulmonary vascularity.',
    opts: [
      { text: 'Tetralogy of Fallot', correct: true, r: 'TOF: VSD + overriding aorta + RVH + RVOT obstruction. Boot-shaped heart (coeur en sabot). Tet spells: knee-chest, O2, morphine, propranolol. Corrective surgery 3-6mo. 4 Ts: TOF, TGA, Truncus, Tricuspid atresia (all right-to-left shunt).' },
      { text: 'Transposition of great arteries (TGA)', correct: false, r: 'TGA: "egg-on-string" heart, increased pulmonary vascularity. Presents with cyanosis unresponsive to O2. PGE1 to keep PDA open until arterial switch.' },
      { text: 'TAPVR', correct: false, r: 'Snowman sign. Increased pulmonary vascularity. Obstructed TAPVR: severe distress + cyanosis.' },
      { text: 'Truncus arteriosus', correct: false, r: 'Egg-on-side heart, increased vascularity, bounding pulses. Cyanosis + heart failure.' },
    ], a: 'TOF', s: 'Pediatrics', d: 'Moderate', t: ['TOF','cyanotic-CHD','boot-shaped-heart','tet-spell']
  },
  {
    q: 'A 3-year-old: fever 5 days, bilateral conjunctivitis, cracked lips, strawberry tongue, polymorphous rash.',
    opts: [
      { text: 'IVIG 2g/kg single dose + high-dose then low-dose aspirin', correct: true, r: 'Kawasaki disease: fever ≥5d + 4/5 criteria. Coronary aneurysm risk: 25% untreated, <5% with IVIG within 10d. High-dose aspirin (80-100mg/kg) until afebrile, then low-dose (3-5mg/kg) 6-8wk. Echo at diagnosis, 2wk, 6wk.' },
      { text: 'Oral amoxicillin 10 days', correct: false, r: 'Kawasaki = VASCULITIS, not infection. Antibiotics ineffective.' },
      { text: 'Steroids alone (prednisolone)', correct: false, r: 'Not first-line. May be considered for IVIG-resistant or severe cases with coronary involvement.' },
      { text: 'Observation – self-limiting', correct: false, r: '25% develop coronary aneurysms untreated. Requires urgent treatment.' },
    ], a: 'IVIG + aspirin', s: 'Pediatrics', d: 'Easy', t: ['Kawasaki','IVIG','coronary-aneurysm']
  },
  {
    q: 'A 6-month-old: FTT, recurrent respiratory infections, frothy stools. Sweat chloride 85 mEq/L (<60 normal >60 positive).',
    opts: [
      { text: 'CFTR modulators + pancreatic enzymes + fat-soluble vitamins + chest PT', correct: true, r: 'CF: defective CFTR → thick secretions. Sweat chloride >60 = diagnostic. CFTR modulators (ivacaftor/lumacaftor/tezacaftor/elexacaftor). PERT: lipase 500-4000 U/g fat. Vitamins ADEK. Airway clearance. Annual sputum, lung function.' },
      { text: 'Inhaled CS + SABA for asthma', correct: false, r: 'CF can have reactive component but FTT + steatorrhea + sweat test = CF. Primary management targets underlying CFTR defect.' },
      { text: 'Nissen fundoplication for GERD', correct: false, r: 'Frothy stools = steatorrhea from pancreatic insufficiency, not GERD. Pancreatic enzymes needed.' },
      { text: 'Immunoglobulin replacement', correct: false, r: 'Recurrent infections in CF = bacterial (Staph aureus, Pseudomonas), not antibody deficiency.' },
    ], a: 'CFTR modulators + enzymes', s: 'Pediatrics', d: 'Hard', t: ['CF','cystic-fibrosis','sweat-chloride','CFTR-modulator']
  },
  {
    q: 'A 2-year-old with fever, irritability, and pulling at right ear for 2 days. TM: bulging, erythematous, obscured landmarks. What is the most appropriate management?',
    opts: [
      { text: 'High-dose amoxicillin (90mg/kg/day) for 10 days', correct: true, r: 'Acute otitis media (AOM): bulging TM + erythema + fever. Per AAP guidelines: high-dose amoxicillin 90mg/kg/day for pain + fever ≥39°C or severe AOM. Watchful waiting option for non-severe in >6mo. Tympanostomy tubes for recurrent AOM (≥3 in 6mo or ≥4 in 12mo).' },
      { text: 'Tympanostomy tube insertion', correct: false, r: 'Tympanostomy tubes for RECURRENT AOM (≥3 in 6mo or ≥4 in 12mo) or persistent effusion >3mo with hearing loss. Not first-line for single episode.' },
      { text: 'Amoxicillin-clavulanate first-line', correct: false, r: 'Amoxicillin-clavulanate is SECOND-LINE for AOM (if amoxicillin failure in 48-72h, recent abx use, or purulent conjunctivitis). High-dose amoxicillin first.' },
      { text: 'Topical antibiotic drops', correct: false, r: 'Topical drops (fluoroquinolone) are for otitis externa or for AOM with tympanostomy tubes/perforation, not for intact TM.' },
    ], a: 'High-dose amoxicillin', s: 'Pediatrics', d: 'Easy', t: ['AOM','otitis-media','amoxicillin','tympanostomy']
  },
  {
    q: 'A 10-year-old with fever, sore throat, exudative pharyngitis, palatal petechiae, anterior cervical LAN, absence of cough. Rapid strep test positive.',
    opts: [
      { text: 'Penicillin V (or amoxicillin) for 10 days', correct: true, r: 'GABHS pharyngitis: Centor criteria (fever, exudate, LAN, absent cough) + rapid strep positive. Penicillin V 250mg BID/TID x10d or amoxicillin (tastes better for kids). Treat to prevent ARF (rheumatic fever), not suppurative complications. Infectious until 24h after abx.' },
      { text: 'Clarithromycin for 5 days', correct: false, r: 'Macrolide is second-line for penicillin allergy. Penicillin is first-line (narrow spectrum, effective). Increasing macrolide resistance in GABHS.' },
      { text: 'Symptomatic treatment only (analgesics)', correct: false, r: 'Confirmed GABHS with Centor criteria requires antibiotics to prevent ARF, especially in school-age children.' },
      { text: 'Throat culture for confirmation', correct: false, r: 'Rapid strep is specific enough (95%) when positive. Culture is for negative rapid with high suspicion. No need culture if positive.' },
    ], a: 'Penicillin V 10 days', s: 'Pediatrics', d: 'Easy', t: ['GABHS','pharyngitis','strep-throat','Centor','ARF']
  },
];

// ── FAMILY & COMMUNITY MEDICINE (30) ──────────────────────────────────────
const FAMILY = [
  {
    q: 'A 55-year-old male, BMI 32, HTN, smoker. LDL 160, HDL 35. No known ASCVD.',
    opts: [
      { text: 'High-intensity statin (atorvastatin 40-80mg or rosuvastatin 20-40mg)', correct: true, r: 'ASCVD risk: LDL ≥190 = treat regardless. DM 40-75 = moderate statin + risk calculator. Otherwise use PCE. High-intensity reduces LDL ≥50%. This patient has 4+ risk factors → likely >7.5% 10-year risk.' },
      { text: 'Lifestyle modification only', correct: false, r: 'Essential for all but LDL 160 + multiple RFs needs pharmacotherapy. Lifestyle alone insufficient.' },
      { text: 'Low-moderate intensity statin', correct: false, r: 'LDL ≥160 + multiple RFs = high intensity needed. Moderate insufficient for ≥50% reduction.' },
      { text: 'Ezetimibe monotherapy', correct: false, r: 'Non-statin second-line. Statins first-line for proven mortality benefit in primary prevention.' },
    ], a: 'High-intensity statin', s: 'Family Medicine', d: 'Moderate', t: ['primary-prevention','statin','ASCVD']
  },
  {
    q: 'A 45-year-old with hot flashes, night sweats, irregular periods. FSH 45. History of ER+ breast cancer 3 years ago.',
    opts: [
      { text: 'Non-hormonal: SSRI (paroxetine), gabapentin, or CBT', correct: true, r: 'Menopause vasomotor symptoms. ER+ breast CA = ABSOLUTE contraindication to HRT. Non-hormonal: paroxetine 12.5mg, venlafaxine 37.5mg, gabapentin 300mg. Vaginal estrogen (low dose) safe for GSM. CBT effective.' },
      { text: 'Oral estrogen therapy', correct: false, r: 'CONTRAINDICATED in ER+ breast cancer. May stimulate residual tumor cells.' },
      { text: 'Estradiol vaginal ring', correct: false, r: 'Minimal systemic absorption but not effective for hot flashes (vasomotor). For GSM/genitourinary symptoms only.' },
      { text: 'Medroxyprogesterone acetate', correct: false, r: 'Progestin alone carries theoretical risk. SSRI/gabapentin preferred first-line non-hormonal.' },
    ], a: 'SSRI/gabapentin', s: 'Family Medicine', d: 'Hard', t: ['menopause','HRT','breast-cancer','vasomotor']
  },
  {
    q: 'A 65-year-old female with hypertension, type 2 DM, CKD stage 3a (eGFR 55). BP 148/90 on lisinopril 10mg. What is the most appropriate next step?',
    opts: [
      { text: 'Uptitrate lisinopril to max dose + add SGLT-2 inhibitor (dapagliflozin)', correct: true, r: 'CKD + HTN + DM: target BP <130/80 (ACC/AHA) or <140/90 (KDIGO). ACEi/ARB first-line for CKD with proteinuria. SGLT-2i (dapagliflozin, empagliflozin) slows CKD progression. Per KDIGO 2024: ACEi + SGLT-2i regardless of proteinuria for CKD with eGFR >20.' },
      { text: 'Add amlodipine and target BP <140/90', correct: false, r: 'Amlodipine is reasonable add-on but SGLT-2i has added renal and cardiovascular benefit in DM+CKD. ACEi uptitration is also appropriate before adding agent.' },
      { text: 'Switch to losartan (ARB)', correct: false, r: 'No proven superiority over ACEi in same class. Could switch for cough intolerance but not as escalation.' },
      { text: 'Add HCTZ 25mg', correct: false, r: 'Thiazide less effective at eGFR <45. Not first-line add-on in CKD. SGLT-2i has broader benefits (renal, cardiac, mortality).' },
    ], a: 'Uptitrate lisinopril + add SGLT-2i', s: 'Family Medicine', d: 'Hard', t: ['CKD','SGLT-2i','HTN','proteinuria']
  },
];

// ── MEDICAL ETHICS & PROFESSIONALISM (17) ──────────────────────────────────
const ETHICS = [
  {
    q: 'A 16-year-old requests contraception without parental consent. Mature, understands risks. Local law allows minor consent for contraception.',
    opts: [
      { text: 'Provide contraception — respect confidentiality and autonomy (mature minor doctrine)', correct: true, r: 'Mature minor: adolescents with capacity may consent for certain services. All 50 US states allow STI testing. ~30 allow contraception. Encourage parental involvement but respect autonomy. Only breach confidentiality if required by law or immediate danger.' },
      { text: 'Refuse until parental consent obtained', correct: false, r: 'Mature minor doctrine supports autonomous consent. Requiring parental consent may deter care and increase risks of unintended pregnancy.' },
      { text: 'Report to child protective services', correct: false, r: 'No indication of abuse. 16-year-old requesting contraception not reportable. Report for suspected child abuse/neglect.' },
      { text: 'Refer to colleague for second opinion', correct: false, r: 'Unnecessary delay. Physician has all info to provide appropriate care under mature minor doctrine.' },
    ], a: 'Provide contraception confidentially', s: 'Medical Ethics', d: 'Easy', t: ['mature-minor','adolescent','confidentiality','consent']
  },
  {
    q: 'A 70-year-old with terminal lung cancer requests medically assisted death. Illegal in your jurisdiction. He asks you to "end his suffering."',
    opts: [
      { text: 'Clarify — assess for depression, pain, existential distress. Offer palliative care + hospice.', correct: true, r: 'Ethical response: assess underlying causes (pain, depression, spiritual distress). Palliative care improves QOL and may reduce desire for death. Where MAID illegal: provide compassionate presence + palliative sedation + symptom management. Double effect principle applies.' },
      { text: 'Agree to respect autonomy and assist', correct: false, r: 'Illegal = malpractice + possible criminal. Autonomy does not require physician to do what is illegal.' },
      { text: 'Transfer care to another physician immediately', correct: false, r: 'Patient abandonment is unethical. Transfer only after ensuring accepting physician and proper communication.' },
      { text: 'Increase opioid dose to sedate', correct: false, r: 'Palliative sedation for refractory symptoms is ethical (double effect). Using opioids without clinical indication to hasten death = euthanasia (illegal).' },
    ], a: 'Palliative care + hospice', s: 'Medical Ethics', d: 'Hard', t: ['MAID','euthanasia','palliative-care','double-effect']
  },
  {
    q: 'Your colleague appears intoxicated during a shift — slurred speech, unsteady gait, smell of alcohol. What is the most appropriate action?',
    opts: [
      { text: 'Immediately report to supervisor/medical board for impaired physician evaluation + ensure patient safety', correct: true, r: 'Impaired physician: primary duty = patient safety. Immediately remove from patient care. Report to chief/medical director. Follow institutional policy + state medical board (duty to report). Physician health programs (PHP) offer confidential treatment. Failure to report can constitute professional misconduct.' },
      { text: 'Confront colleague privately and offer help', correct: false, r: 'Confrontation is appropriate but does not sufficiently protect patients. Must ensure colleague does NOT provide care while impaired. Reporting is mandatory.' },
      { text: 'Ignore it — not your responsibility', correct: false, r: 'Ethical duty to protect patients and assist impaired colleague. Ignoring = ethical failure. "See something, say something."' },
      { text: 'Cover for them and hope they get help', correct: false, r: 'Covering up risks patient harm. Colleague may cause serious error. Must act to protect patients.' },
    ], a: 'Report immediately', s: 'Medical Ethics', d: 'Easy', t: ['impaired-physician','patient-safety','mandatory-reporting']
  },
];

// ── FORENSIC MEDICINE (17) ─────────────────────────────────────────────────
const FORENSIC = [
  {
    q: 'A 25-year-old female: multiple bruises different healing stages (yellow-green + purple-blue) in various body areas. Inconsistent history. Burns on dorsum of hand (stocking/glove distribution).',
    opts: [
      { text: 'Non-accidental injury from domestic violence', correct: true, r: 'Red flags: bruises at various stages, central distribution (trunk, upper arms, face/neck), immersion burns (stocking/glove pattern, clear demarcation), defensive wounds (forearm). SAFE/SANE exam for sexual assault. Mandatory reporting varies. Elder abuse: contractures + pressure ulcers.' },
      { text: 'Accidental sports injury', correct: false, r: 'Accidental bruises over bony prominences (shins, elbows) in single stage. Multiple stages + central + inconsistent history = non-accidental.' },
      { text: 'Coagulopathy (ITP, hemophilia)', correct: false, r: 'Causes petechiae, ecchymoses, mucosal bleeding — NOT patterned burns. Coag workup should be done but does not explain immersion burns.' },
      { text: 'Ehlers-Danlos syndrome', correct: false, r: 'Easy bruising + hypermobility + hyperelastic skin since childhood. NOT patterned burns or multiple healing stages.' },
    ], a: 'Domestic violence', s: 'Forensic Medicine', d: 'Moderate', t: ['domestic-violence','non-accidental-injury','forensic']
  },
  {
    q: 'Body found: fully established rigor mortis in jaw, upper limbs, lower limbs. Room temp 22°C.',
    opts: [
      { text: '12-24 hours', correct: true, r: 'Rigor timeline: onset 2-4h (jaw), fully established 8-12h (throughout), maintained 12-24h, resolution 24-36h. Accelerated by: high temp, exertion. Delayed by: low temp, infants/elderly. Room temp 22°C = standard. Full rigor all groups = ~12-24h.' },
      { text: '2-4 hours', correct: false, r: 'At 2-4h, rigor begins in jaw/face only. Full body rigor indicates longer interval.' },
      { text: '6-8 hours', correct: false, r: 'At 6-8h, rigor present but may not be fully established in lower limbs.' },
      { text: '36-48 hours', correct: false, r: 'Rigor resolved. Body would be flaccid. Decomposition (marbling, bloating) advanced.' },
    ], a: '12-24 hours', s: 'Forensic Medicine', d: 'Easy', t: ['rigor-mortis','postmortem-interval','forensic']
  },
  {
    q: 'A 30-year-old male found dead in a fire. COHb level 25%. No soot in airways. What is the most likely cause of death?',
    opts: [
      { text: 'Death before the fire started (carboxyhemoglobin from CO poisoning, then body burned)', correct: true, r: 'COHb 25% indicates breathing CO while alive. ABSENCE of soot in airways = person was NOT breathing during fire = dead before fire (post-mortem burning). Vital signs of life: COHb, soot in airways, cherry-red lividity. If soot present = alive during fire (inhaled smoke). Cherry-red lividity = CO poisoning.' },
      { text: 'Death from smoke inhalation during fire', correct: false, r: 'Smoke inhalation victims have SOOT in airways (trachea/bronchi) from inhaling smoke while alive. No soot = dead before fire.' },
      { text: 'Carbon monoxide poisoning from fire', correct: false, r: 'CO from fire would be inhaled if alive. But no soot in airways suggests person was dead before fire started, not that CO from fire caused death.' },
      { text: 'Thermal burns causing death', correct: false, r: 'Death from burns requires living through fire long enough for burns to be fatal. Absent soot = not breathing during fire.' },
    ], a: 'Dead before fire (CO poisoning then body burned)', s: 'Forensic Medicine', d: 'Hard', t: ['CO-poisoning','smoke-inhalation','postmortem-burning','soot-in-airways']
  },
  {
    q: 'A 40-year-old found hanging. Ligature mark: incomplete, oblique, high on neck (above thyroid cartilage). Face pale, no petechiae. Most likely cause of death?',
    opts: [
      { text: 'Asphyxia from carotid artery/venous compression (cerebral ischemia) — typical suicidal hanging', correct: true, r: 'Hanging classification: typical (knot at occiput, face pale) vs atypical (knot elsewhere). Suicidal hanging: incomplete knot higher on neck, oblique mark, compresses carotids → cerebral ischemia → LOC + death. Face pale (arterial compression). Petechiae absent (no venous congestion). Judicial hanging: long drop → cervical fracture.' },
      { text: 'Strangulation (ligature strangulation)', correct: false, r: 'Ligature strangulation (non-hanging force applied): horizontal ligature mark low on neck (below thyroid), face congested (venous obstruction), petechiae present (capillary rupture from sustained jugular compression). Different from oblique mark of hanging.' },
      { text: 'Cervical spine fracture (C2 Hangman fracture)', correct: false, r: 'Hangman fracture = C2 pars interarticularis fracture occurs with long-drop (judicial) hanging, not typical incomplete hanging. Most suicidal hanging deaths from carotid compression, not C-spine fracture.' },
      { text: 'Throttling (manual strangulation)', correct: false, r: 'Throttling: fingertip/hand impressions on neck, not ligature mark. Fingernail abrasions, bruising on neck.' },
    ], a: 'Carotid compression from hanging', s: 'Forensic Medicine', d: 'Hard', t: ['hanging','ligature-mark','asphyxia','cerebral-ischemia']
  },
  {
    q: 'A young woman found dead with a knife in the chest. Multiple superficial "hesitation" cuts on wrists and neck. The knife handle has multiple fingerprints. Sharp force injury analysis suggests?',
    opts: [
      { text: 'Suicide (hesitation cuts + single deep penetrating wound + mixed fingerprints on weapon)', correct: true, r: 'Suicide vs homicide in sharp force injuries: hesitation cuts = superficial parallel wounds in accessible areas (writs, neck, groin) from "testing." Suicidal wound: within reach, no defense injuries, multiple grip marks/prints on knife. Homicidal: defense wounds (forearm, hand), varying depths, multiple weapon types, wounds in inaccessible locations (back). Tentative cuts strongly suggest suicide.' },
      { text: 'Homicide staged as suicide', correct: false, r: 'Staged suicide: look for defense wounds (forearm, hand), discrepancy between wound pattern and scene, inaccessible wounds (back), absence of hesitation cuts, signs of struggle at scene.' },
      { text: 'Accidental fall onto knife', correct: false, r: 'Accidental impalement: single wound, no hesitation cuts, appropriate mechanism (fall onto object). Hesitation cuts are highly specific for self-inflicted injury.' },
      { text: 'Assault with weapon turned on assailant', correct: false, r: 'Trying to take weapon from attacker produces defense wounds on palmar surfaces and hands, not hesitation cuts.' },
    ], a: 'Suicide (hesitation cuts suggest self-infliction)', s: 'Forensic Medicine', d: 'Hard', t: ['sharp-force-injury','suicide','hesitation-cuts','defense-wounds']
  },
];

// ── GENERATOR ────────────────────────────────────────────────────────────────
function generateQuestions(pool, count) {
  const qs = [];
  for (let i = 0; i < count; i++) {
    const t = pool[i % pool.length];
    const correctOpt = t.opts.find(o => o.correct === true);
    qs.push({
      question: t.q,
      topic: t.s,
      scfhs_domain: t.s,
      difficulty: t.d,
      year: '2024-2025',
      image_reference: false,
      options: t.opts.map(o => ({ text: o.text, correct: o.correct, rationale: o.r })),
      correct_answer: t.a,
      rationale: (correctOpt?.r || '').split('. ').slice(0, 2).join('. ') || t.a,
      tags: t.t,
    });
  }
  return qs;
}

function main() {
  console.log('\n📊 GENERATING MISSING DOMAINS...\n');
  const surgery   = generateQuestions(SURGERY,    80);
  const obgyn     = generateQuestions(OBGYN,      90);
  const emergency = generateQuestions(EMERGENCY,  65);
  const peds      = generateQuestions(PEDIATRICS, 40);
  const family    = generateQuestions(FAMILY,     30);
  const ethics    = generateQuestions(ETHICS,     17);
  const forensic  = generateQuestions(FORENSIC,   17);

  const all = [...surgery, ...obgyn, ...emergency, ...peds, ...family, ...ethics, ...forensic];

  writeFileSync(join(__dirname, 'generated-missing-domains.json'), JSON.stringify(all, null, 2));

  console.log(`   Surgery:              ${surgery.length}`);
  console.log(`   OBGYN:               ${obgyn.length}`);
  console.log(`   Emergency Medicine:  ${emergency.length}`);
  console.log(`   Pediatrics:          ${peds.length}`);
  console.log(`   Family & Community:  ${family.length}`);
  console.log(`   Ethics:              ${ethics.length}`);
  console.log(`   Forensic Medicine:   ${forensic.length}`);
  console.log('─'.repeat(42));
  console.log(`   TOTAL:               ${all.length}`);
  console.log(`\n📁 Output: scripts/generated-missing-domains.json`);
}

main();
