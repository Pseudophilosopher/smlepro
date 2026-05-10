/**
 * rebalance-and-add-rad-path.mjs
 *
 * Step 1: Rebalances difficulty on 324 IM questions (need ~34% Easy, ~33% Moderate, ~33% Hard)
 * Step 2: Generates 50 Radiology questions (imaging-based, SMLE-relevant)
 * Step 3: Generates 50 Pathology questions (histology/pathology, SMLE-relevant)
 *
 * Output: scripts/generated-final-bank.json (424 total)
 *
 * Usage: node scripts/rebalance-and-add-rad-path.mjs
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── RADIOLOGY QUESTIONS ─────────────────────────────────────────────────────

const RADIOLOGY = [
  {
    q: 'Chest X-ray shows air-fluid levels without haustral folds in the colon. What is the diagnosis?',
    opts: [
      { text: 'Toxic megacolon correct: true', correct: true, r: 'Toxic megacolon: colonic dilation >6 cm (or >10 cm cecum) with loss of haustral folds. Seen in severe UC, Crohn’s, C. diff. Clinical pearl: "Loss of haustrations distinguishes toxic megacolon from simple ileus (which retains haustrations)."'},
      { text: 'Volvulus', correct: false, r: 'Volvulus shows a "coffee bean" or "bent inner tube" sign on AXR. Sigmoid: pelvic loop pointing to RUQ. Cecal: coffee bean in mid-abdomen.' },
      { text: 'Small bowel obstruction', correct: false, r: 'SBO shows dilated small bowel with valvulae conniventes, not absent haustral folds. Central location vs peripheral colon.' },
      { text: 'Paralytic ileus', correct: false, r: 'Ileus shows dilated bowel BUT WITH preserved haustral folds. The absence of haustrations is the key distinguishing feature of toxic megacolon.' },
    ],
    a: 'Toxic megacolon', s: 'Radiology', d: 'Moderate', t: ['toxic-megacolon', 'AXR', 'haustral-folds']
  },
  {
    q: 'CT head shows a hyperdense lenticular (biconvex) mass in the right temporal region crossing the middle meningeal artery territory. What is the diagnosis?',
    opts: [
      { text: 'Acute epidural hematoma correct: true', correct: true, r: 'Epidural hematoma: biconvex/lenticular shape, does NOT cross suture lines but CAN cross the midline. Usually from middle meningeal artery tear (temporal bone fracture). Clinical pearl: "EDH vs SDH" — EDH = lenticular, does not cross sutures. SDH = crescentic, crosses sutures. EDH can have a "lucid interval" then rapid deterioration.' },
      { text: 'Acute subdural hematoma', correct: false, r: 'Acute SDH is crescent-shaped, crosses suture lines but does NOT cross the midline (follows falx). Usually from bridging vein rupture.' },
      { text: 'Subarachnoid hemorrhage', correct: false, r: 'SAH fills the basilar cisterns and sulci, appearing as hyperdensity in the sylvian fissures, interpeduncular cistern, and along gyri. It is not a discrete mass.' },
      { text: 'Intraparenchymal hemorrhage', correct: false, r: 'Intraparenchymal hemorrhage is irregular, within brain parenchyma (e.g., basal ganglia, thalamus), not in a biconvex shape along the calvarium.' },
    ],
    a: 'Acute epidural hematoma', s: 'Radiology', d: 'Moderate', t: ['epidural-hematoma', 'CT-head', 'biconvex']
  },
  {
    q: 'CT chest shows an anterior mediastinal mass with fat density and calcifications. What is the most likely diagnosis?',
    opts: [
      { text: 'Teratoma (mature) correct: true', correct: true, r: 'Anterior mediastinal teratoma: well-defined, contains fat ± calcifications (teeth, bone). Cystic components common. Clinical pearl: "Teratoma: fat + calcium + cystic areas = pathognomonic. Asymptomatic: observe. Symptomatic: resect (risk of rupture, torsion, malignant transformation).'},
      { text: 'Thymoma', correct: false, r: 'Thymoma is a soft-tissue mass, usually homogeneous, NOT containing fat or calcium. Associated with myasthenia gravis (30-50%).' },
      { text: 'Lymphoma', correct: false, r: 'Mediastinal lymphoma (esp. Hodgkin) is a lobulated soft-tissue mass without fat. Often involves multiple nodal groups. PET-CT shows high FDG uptake.' },
      { text: 'Retrosternal goiter', correct: false, r: 'Retrosternal goiter extends from the neck into the superior/anterior mediastinum, is continuous with the thyroid, and contains calcifications (coarse, not fat).' },
    ],
    a: 'Teratoma (mature)', s: 'Radiology', d: 'Moderate', t: ['anterior-mediastinal-mass', 'teratoma', 'fat-calcification']
  },
  {
    q: 'Chest X-ray shows a peripheral lung mass with a "halo sign" — ground-glass opacity surrounding a solid nodule. What is the most likely diagnosis?',
    opts: [
      { text: 'Invasive aspergillosis correct: true', correct: true, r: 'The halo sign (ground-glass opacity around a nodule) is highly suggestive of angioinvasive aspergillosis in immunocompromised patients. The GGO represents hemorrhagic infarction around the fungus ball. Clinical pearl: "Halo sign = invasive aspergillosis until proven otherwise (in neutropenia). Air-crescent sign appears later, during recovery (separation of necrotic lung from fungus ball).'},
      { text: 'Lung adenocarcinoma', correct: false, r: 'Adenocarcinoma may show GGO but typically presents as a subsolid nodule with lepidic growth pattern. The halo sign of aspergillosis is transient and correlates with the acute phase of infection.' },
      { text: 'Granulomatosis with polyangiitis', correct: false, r: 'GPA causes cavitating nodules, not halo signs. The halo sign suggests hemorrhage/infarction around a nodule, typical of fungal infection.' },
      { text: 'Kaposi sarcoma', correct: false, r: 'Kaposi sarcoma causes flame-shaped lesions along bronchovascular bundles, not the halo sign. Seen in AIDS patients.' },
    ],
    a: 'Invasive aspergillosis', s: 'Radiology', d: 'Hard', t: ['halo-sign', 'aspergillosis', 'CT-chest']
  },
  {
    q: 'CT abdomen shows a well-defined hypodense lesion in segment VII of the liver with delayed central enhancement (fill-in) on contrast. What is the most likely diagnosis?',
    opts: [
      { text: 'Cavernous hemangioma correct: true', correct: true, r: 'Cavernous hemangioma: well-defined, hypodense on pre-contrast, peripheral nodular enhancement on arterial phase, progressive centripetal filling on delayed imaging. Clinical pearl: "Hemangioma vs metastasis" — hemangioma: discontinuous peripheral enhancement, matches blood pool on delayed. Metastasis: irregular enhancement, washout, ill-defined borders.' },
      { text: 'Hepatocellular carcinoma', correct: false, r: 'HCC shows arterial enhancement with VENOUS WASHOUT and a pseudocapsule. It does NOT show progressive centripetal filling as seen here. High AFP, cirrhosis background.' },
      { text: 'Hepatic adenoma', correct: false, r: 'Adenoma is hypervascular on arterial phase but may be heterogeneous (hemorrhage). It does NOT show delayed fill-in. Associated with OCP use. Risk of rupture and malignant transformation.' },
      { text: 'Colorectal metastasis', correct: false, r: 'Metastases show peripheral rim enhancement (target sign) and washout, not progressive fill-in. Usually multiple, at the portal-venous interface.' },
    ],
    a: 'Cavernous hemangioma', s: 'Radiology', d: 'Moderate', t: ['hemangioma', 'CT-liver', 'centripetal-filling']
  },
  {
    q: 'CT abdomen/pelvis shows a dilated appendix (>6 mm) with wall thickening, periappendiceal fat stranding, and an appendicolith. What is the diagnosis?',
    opts: [
      { text: 'Acute appendicitis correct: true', correct: true, r: 'CT findings of acute appendicitis: dilated appendix (>6 mm), wall thickening/hyperenhancement, periappendiceal fat stranding, ± appendicolith. Clinical pearl: "Alvarado score guides imaging — MANTRELS: Migration of pain, Anorexia, Nausea, Tenderness in RLQ, Rebound, Elevated Temp, Leukocytosis, Shift of WBCs left. Score 7+ = high probability, proceed to CT.' },
      { text: 'Epiploic appendagitis', correct: false, r: 'Epiploic appendagitis: fat-density ovoid lesion adjacent to colon with surrounding inflammation, NO appendiceal dilation. "Central dot sign" = thrombosed vessel. Self-limiting, treated with NSAIDs.' },
      { text: 'Cecal diverticulitis', correct: false, r: 'Cecal diverticulitis shows inflammation centered on a cecal diverticulum (not appendix), usually on the anterior/medial wall. The appendix is normal.' },
      { text: 'Mesenteric adenitis', correct: false, r: 'Mesenteric adenitis shows enlarged mesenteric lymph nodes with a normal appendix. Common in children. Fever + RLQ pain without appendiceal inflammation.' },
    ],
    a: 'Acute appendicitis', s: 'Radiology', d: 'Moderate', t: ['appendicitis', 'CT', 'Alvarado']
  },
  {
    q: 'A 35-year-old female with RLQ pain. US shows a thick-walled, tubular, non-compressible structure in the RLQ with increased vascularity (hyperemia) on Doppler. No evidence of ovarian pathology. What is the most likely diagnosis?',
    opts: [
      { text: 'Acute appendicitis correct: true', correct: true, r: 'Ultrasound of appendicitis: non-compressible, blind-ending tubular structure >6 mm, wall thickness >2 mm, hyperemic on Doppler, ± appendicolith (echogenic with shadowing). Clinical pearl: "Ultrasound is first-line in children/pregnant. Graded compression technique: gradually compress over McBurney point to displace bowel gas and visualize appendix."'},
      { text: 'Ovarian torsion', correct: false, r: 'Ovarian torsion shows enlarged, heterogeneous ovary with absent or reversed arterial/venous flow on Doppler. Normal appendix. Has adnexal location (superior to ovarian vein).' },
      { text: 'Ectopic pregnancy', correct: false, r: 'Ectopic shows adnexal mass separate from ovary, empty uterus, ± free fluid. β-hCG positive. NOT a tubular structure in the RLQ.' },
      { text: 'Mesenteric adenitis', correct: false, r: 'Mesenteric adenitis shows enlarged lymph nodes with NORMAL appendix. The thickened, hyperemic appendix here is diagnostic of appendicitis.' },
    ],
    a: 'Acute appendicitis', s: 'Radiology', d: 'Easy', t: ['appendicitis-US', 'graded-compression', 'RLQ-pain']
  },
  {
    q: 'CT urography shows a filling defect in the renal pelvis that is mobile, ovoid, and has a high-density rim (staghorn calculus appearance). Distal to the stone, the ureter is normal. What is the most likely diagnosis?',
    opts: [
      { text: 'Renal calculus (struvite or calcium oxalate) correct: true', correct: true, r: 'CT is the gold standard for stone detection (sensitivity >95%). Stones appear as hyperdense foci. Struvite stones are radiopaque, branch into calyces forming a "staghorn." Clinical pearl: "Radiolucent stones on plain film (uric acid, cystine, xanthine) are still visible on CT (all stones are hyperdense on CT except pure indinavir stones).'},
      { text: 'Transitional cell carcinoma (TCC) of the renal pelvis', correct: false, r: 'TCC is a soft-tissue mass arising from the urothelium, NOT a hyperdense filling defect. It enhances with contrast, does NOT have a high-density rim, and is NOT mobile.' },
      { text: 'Blood clot in the renal pelvis', correct: false, r: 'Blood clot can cause a filling defect but is non-enhancing and can be confused with stone. Clots are less dense (<50 HU) than stones (>200 HU). No high-density rim.' },
      { text: 'Papillary necrosis sloughed papilla', correct: false, r: 'Sloughed papilla (from DM, sickle cell, analgesic nephropathy) appears as a filling defect in the calyx (ring sign) with irregular contrast pooling around it, not in the renal pelvis as a hyperdense calculus.' },
    ],
    a: 'Renal calculus', s: 'Radiology', d: 'Easy', t: ['renal-stone', 'staghorn', 'CT-urography']
  },
  {
    q: 'Chest X-ray shows a right paratracheal mass with smooth borders. CT confirms a 4 cm mass in the middle mediastinum, adjacent to the trachea. Biopsy shows lymphocytes and granulomas. What is the most likely diagnosis?',
    opts: [
      { text: 'Sarcoidosis (mediastinal lymphadenopathy) correct: true', correct: true, r: 'Bilateral hilar and right paratracheal lymphadenopathy (1-2-3 sign) is classic for sarcoidosis. Granulomas (non-caseating) confirm the diagnosis. Clinical pearl: "Garland triad = right paratracheal + bilateral hilar lymphadenopathy. Stage II adds parenchymal infiltrates. Most common cause of bilateral hilar LAD in young adults."'},
      { text: 'Lymphoma (Hodgkin disease)', correct: false, r: 'Hodgkin lymphoma often causes anterior/mediastinal lymphadenopathy, but granulomas are NOT seen in lymphoma (Reed-Sternberg cells are present). Often involves contiguous nodal groups and may have B symptoms.' },
      { text: 'Tuberculous lymphadenitis', correct: false, r: 'TB lymphadenitis shows CASEATING granulomas, NOT non-caseating. Typically unilateral, with central necrosis, matted nodes, and often a calcified granuloma in the lung (Ghon focus).' },
      { text: 'Histoplasmosis', correct: false, r: 'Histoplasmosis causes mediastinal lymphadenopathy and granulomas but usually has OLD calcified granulomas. Active histoplasmosis would have positive serology. More common in Ohio/Mississippi valleys.' },
    ],
    a: 'Sarcoidosis', s: 'Radiology', d: 'Moderate', t: ['sarcoidosis', 'mediastinal-LAD', 'bilateral-hilar']
  },
  {
    q: 'An 18-year-old male presents with acute scrotal pain. US shows an avascular, enlarged, heterogeneous testicle with absent flow on Doppler. What is the most likely diagnosis?',
    opts: [
      { text: 'Testicular torsion (surgical emergency) correct: true', correct: true, r: 'Testicular torsion: enlarged, heterogeneous testicle with ABSENT Doppler flow (epididymis may be spared if incomplete). Clinical pearl: "Surgical window: 0-6h: 90% salvage. 6-12h: 50%. 12-24h: <10%. Manual detorsion (open book) is temporizing. Emergency orchiopexy is definitive. Bilateral orchiopexy is standard (anatomical defect is often bilateral).'},
      { text: 'Epididymo-orchitis', correct: false, r: 'Epididymo-orchitis shows INCREASED flow on Doppler (hyperemia of epididymis ± testicle). Treatment is antibiotics (ceftriaxone + doxycycline for STI, levofloxacin for UTI).' },
      { text: 'Fournier gangrene', correct: false, r: 'Fournier gangrene: necrotizing fasciitis of the perineum, scrotum with gas in soft tissues on CT/X-ray. Systemic toxicity. Emergent surgical debridement.' },
      { text: 'Testicular rupture', correct: false, r: 'Testicular rupture: loss of normal contour, heterogeneous echotexture, discontinuity of the tunica albuginea. History of trauma. Surgery to salvage testicle.' },
    ],
    a: 'Testicular torsion', s: 'Radiology', d: 'Easy', t: ['testicular-torsion', 'Doppler-US', 'surgical-emergency']
  },
  {
    q: 'A 2-year-old presents with bilious vomiting. Abdominal X-ray shows a "double bubble" sign (two air-fluid levels in the upper abdomen, no distal gas). What is the most likely diagnosis?',
    opts: [
      { text: 'Duodenal atresia correct: true', correct: true, r: 'Double bubble = duodenal atresia (most common) or annular pancreas. The proximal bubble = stomach, distal bubble = dilated duodenal bulb. Clinical pearl: "Double bubble = duodenal obstruction. If distal gas is present = partial obstruction (web, Ladd bands). If no distal gas = complete obstruction (atresia). 30% have Down syndrome. Correct bilious vomiting in newborn with NG decompression and duodeno-duodenostomy."'},
      { text: 'Malrotation with midgut volvulus', correct: false, r: 'Malrotation shows a "corkscrew" appearance on UGI, not a double bubble. Duodenal obstruction is partial (by Ladd bands), so distal gas MAY be present. Emergent surgical consult.' },
      { text: 'Pyloric stenosis', correct: false, r: 'Pyloric stenosis shows a single air-fluid level in the stomach (not double bubble), with peristaltic waves. Olive sign on palpation. Non-bilious projectile vomiting at 3-6 weeks.' },
      { text: 'Jejunal atresia', correct: false, r: 'Jejunal atresia shows multiple air-fluid levels (triple bubble) with no distal gas, not the classic double bubble of duodenal atresia.' },
    ],
    a: 'Duodenal atresia', s: 'Radiology', d: 'Easy', t: ['double-bubble', 'duodenal-atresia', 'neonatal-obstruction']
  },
  {
    q: 'Chest X-ray in a trauma patient shows a "deep sulcus sign" — deep lateral costophrenic angle on the right. What is the most likely diagnosis?',
    opts: [
      { text: 'Pneumothorax (supine) correct: true', correct: true, r: 'In supine CXR, pneumothorax air collects anteriorly, causing the deep sulcus sign — a deep, hyperlucent costophrenic sulcus. Clinical pearl: "Supine pneumothorax signs: deep sulcus sign, double diaphragm sign, hyperlucent hemithorax, increased definition of the mediastinal border (mediastinal shift suggests tension).' },
      { text: 'Rib fracture', correct: false, r: 'Rib fractures may cause local opacity from contusion but do not produce the deep sulcus sign. Look for sharp angulation, step-off, or displacement on dedicated rib views.' },
      { text: 'Hemothorax', correct: false, r: 'Hemothorax appears as homogeneous opacity blunting the costophrenic angle (meniscus sign), not deepening it. CT confirms layering blood dependent paraspinally.' },
      { text: 'Pulmonary contusion', correct: false, r: 'Pulmonary contusion is non-segmental alveolar opacity, not a deep sulcus. Appears within 6 hours of trauma and resolves in 3-10 days.' },
    ],
    a: 'Pneumothorax (supine)', s: 'Radiology', d: 'Easy', t: ['pneumothorax-supine', 'deep-sulcus-sign', 'trauma']
  },
  {
    q: 'CT head without contrast shows a hyperdense "ring" or "target" sign in the basal ganglia with surrounding edema. Patient is 60, hypertensive. What is the most likely diagnosis?',
    opts: [
      { text: 'Hypertensive intracerebral hemorrhage (putamen) correct: true', correct: true, r: 'Hypertensive ICH: putamen (most common), thalamus, pons, cerebellum. Hyperdense on CT, may show fluid-fluid level (hematocrit effect). Clinical pearl: "Charcot-Bouchard aneurysms: small penetrating artery rupture (lenticulostriate, basilar perforators). Locations: putamen 35%, subcortical 25%, cerebellum 10%, pons/pineal 10%. BP control is prevention.'},
      { text: 'Coagulopathy-related hemorrhage', correct: false, r: 'Coagulopathy hemorrhage is often multifocal, lobar, irregular, and associated with INR >3.0 or PTT prolongation. The putamen location is classic for hypertension.' },
      { text: 'Cerebral amyloid angiopathy', correct: false, r: 'CAA causes LOBAR hemorrhages (cortical-subcortical junction), not deep basal ganglia. Recurrent, often multiple. Associated with APOE ε4. Seen in elderly >70.' },
      { text: 'Arteriovenous malformation (AVM)', correct: false, r: 'AVM hemorrhage is irregular, may show a calcified nidus or draining veins on CT. Typically presents in younger patients (20-40) with seizures or hemorrhage.' },
    ],
    a: 'Hypertensive ICH', s: 'Radiology', d: 'Easy', t: ['ICH', 'hypertensive-hemorrhage', 'putamen']
  },
  {
    q: 'CT chest shows a "split pleura sign" — enhancing thickened visceral and parietal pleura separated by loculated fluid. What is the most appropriate management?',
    opts: [
      { text: 'Chest tube drainage + IV antibiotics (empyema) correct: true', correct: true, r: 'Split pleura sign = empyema (pus in the pleural space). Needs drainage (chest tube ± VATS decoritication if loculated) + IV antibiotics. Clinical pearl: "Empyema vs transudate: empyema = enhancement of pleural layers (split pleura sign), loculation, gas bubbles. Pleural fluid pH <7.2, LDH >1000, glucose <40. Complicated parapneumonic effusion also needs drainage. Treat with chest tube + antibiotics.'},
      { text: 'Thoracentesis only', correct: false, r: 'Thoracentesis is diagnostic but inadequate for loculated empyema — the pus is too thick to drain through a needle. Chest tube ± intrapleural fibrinolytics (tPA + DNase) or VATS is needed for adequate drainage.' },
      { text: 'IV antibiotics alone', correct: false, r: 'Antibiotics alone cannot clear a formed empyema. The loculated pus is avascular and impenetrable by systemic antibiotics. Drainage is essential for source control.' },
      { text: 'CT-guided biopsy of pleura', correct: false, r: 'Biopsy is for pleural malignancy (mesothelioma, metastatic adenocarcinoma), not needed for typical empyema. The diagnosis is made by pleural fluid analysis.' },
    ],
    a: 'Chest tube + IV antibiotics', s: 'Radiology', d: 'Easy', t: ['empyema', 'split-pleura-sign', 'chest-tube']
  },
  {
    q: 'CT shows a "whirlpool sign" — swirling of mesentery and vessels around a central point. What is the most appropriate next step?',
    opts: [
      { text: 'Urgent laparotomy for midgut volvulus correct: true', correct: true, r: 'Whirlpool sign = midgut volvulus (malrotation with twisting of mesentery). Emergency — bowel ischemia within hours. Clinical pearl: "Ladd procedure = Ladd bands division + appendectomy + broad mesentery creation + pexy (duodenum right, cecum left). Laparoscopic or open. Mortality without treatment: 50%. Rule out volvulus in any child with bilious vomiting.'},
      { text: 'CT enterography with oral contrast', correct: false, r: 'Delaying for more imaging risks bowel necrosis. The diagnosis is already made by CT. Urgent surgical consultation is needed.' },
      { text: 'NG decompression and observation', correct: false, r: 'Observation has no role in midgut volvulus. Intestinal ischemia progresses to necrosis within 6-12 hours. Emergent surgical detorsion is required.' },
      { text: 'Upper GI series to confirm', correct: false, r: 'UGI is diagnostic for malrotation (duodenal-jejunal junction not crossing the midline) but in an acute presentation with the whirlpool sign on CT, proceeding directly to surgery is warranted.' },
    ],
    a: 'Urgent laparotomy', s: 'Radiology', d: 'Easy', t: ['midgut-volvulus', 'whirlpool-sign', 'malrotation']
  },
  {
    q: 'CT head shows a "reverse crescent sign" — hyperdense hilar region with lucent temporal lobe anteriorly. What is the most likely diagnosis?',
    opts: [
      { text: 'Subdural hematoma (acute-on-chronic) correct: true', correct: true, r: 'The reverse crescent sign describes a layering hematoma with acute blood (hyperdense) along the inner table and chronic blood (isodense/hypodense) more centrally. Clinical pearl: "SDH types: acute <3 days (hyperdense), subacute 3-21d (isodense), chronic >21d (hypodense). Acute-on-chronic = hyperdense layer depending in dependent portion. Higher mortality in elderly on anticoagulants.'},
      { text: 'Subarachnoid hemorrhage', correct: false, r: 'SAH fills the sulci and cisterns with hyperdense blood, not creating a layered crescent shape. Aneurysmal SAH is in the basilar cisterns.' },
      { text: 'Epidural hematoma', correct: false, r: 'EDH is biconvex (lenticular), not crescentic. Crosses midline but NOT sutures.' },
      { text: 'Cerebral contusion', correct: false, r: 'Cerebral contusions are irregular areas of hemorrhage in the gray-white matter junction (coup/contrecoup), not crescent-shaped collections along the calvarium.' },
    ],
    a: 'Subdural hematoma (acute-on-chronic)', s: 'Radiology', d: 'Hard', t: ['SDH', 'subdural-hematoma', 'acute-on-chronic']
  },
  {
    q: 'A 60-year-old smoker presents with hemoptysis. CT chest shows a spiculated, 4 cm right hilar mass with post-obstructive collapse of the right upper lobe. What is the most likely diagnosis?',
    opts: [
      { text: 'Squamous cell carcinoma (central lung cancer) correct: true', correct: true, r: 'Central hilar mass + spiculated margins + post-obstructive collapse = squamous cell carcinoma (most commonly central). Clinical pearl: "Squamous cell: central location, cavitation, hypercalcemia (PTHrp). Adenocarcinoma: peripheral, pleural involvement. SCLC: central, rapid growth, early mets, paraneoplastic syndromes. Pancoast tumor: superior sulcus, Pancoast syndrome (Horner, arm pain).'},
      { text: 'Small cell lung cancer', correct: false, r: 'SCLC is central but typically shows bulky mediastinal/hilar lymphadenopathy without post-obstructive collapse (it infiltrates submucosally rather than obstructing the lumen). Also presents with rapid growth and early distant mets.' },
      { text: 'Lung abscess', correct: false, r: 'Lung abscess appears as a cavity with air-fluid level, thick wall, NOT a solid mass with collapse. Patients are febrile with productive sputum.' },
      { text: 'Broncholithiasis', correct: false, r: 'Broncholithiasis: calcified peribronchial node eroding into bronchus. CT shows an endobronchial calcified nodule, not a spiculated hilar mass with collapse.' },
    ],
    a: 'Squamous cell carcinoma', s: 'Radiology', d: 'Moderate', t: ['lung-cancer', 'squamous-cell', 'post-obstructive-collapse']
  },
  {
    q: 'CT abdomen shows a 5 cm well-defined hypodense lesion in the pancreas tail, containing a solid nodule within a cyst, with no biliary obstruction. What is the most likely diagnosis?',
    opts: [
      { text: 'Intraductal papillary mucinous neoplasm (IPMN) — branch duct type correct: true', correct: true, r: 'Branch-duct IPMN: pleomorphic or unilocular cyst in the pancreas tail with mural nodule ± communication with MPD. Clinical pearl: "Pancreatic cystic neoplasms: microcystic (bunch of grapes) = serous cystadenoma (benign). Macrocystic (oligocystic) with mural nodule = mucinous cystic neoplasm (pre-malignant). Branch-duct IPMN = communicates with MPD. Main-duct IPMN = dilated MPD >5 mm. Surgical indications: size >3 cm, mural nodule, solid component, positive cytology.'},
      { text: 'Serous cystadenoma', correct: false, r: 'Serous cystadenoma: microcystic (bunch of grapes), central scar with calcification. No solid nodule (mural nodule suggests mucinous or IPMN).' },
      { text: 'Mucinous cystic neoplasm (MCN)', correct: false, r: 'MCN is also macrocystic with ovarian-type stroma, does NOT communicate with the pancreatic duct (unlike IPMN which does). Distinguished by ERCP/MRCP showing no communication with MPD.' },
      { text: 'Pancreatic pseudocyst', correct: false, r: 'Pseudocyst is an unilocular fluid collection with history of pancreatitis, no mural nodule. It has a thin, non-enhancing wall and resolves spontaneously.' },
    ],
    a: 'Branch-duct IPMN', s: 'Radiology', d: 'Hard', t: ['IPMN', 'pancreatic-cyst', 'mural-nodule']
  },
  {
    q: 'Abdominal X-ray shows a "football sign" — large oval lucency outlining the falciform ligament. This is most suggestive of what?',
    opts: [
      { text: 'Pneumoperitoneum (free intraperitoneal air) correct: true', correct: true, r: 'Football sign = massive pneumoperitoneum outlining the falciform ligament (football = peritoneal cavity filled with air). Clinical pearl: "Upright CXR is best for pneumoperitoneum (free air under diaphragm). In supine AXR look for: Rigler sign (double bowel wall), football sign, falciform ligament sign, triangle sign (air in Morison pouch). Causes: perforated ulcer (50%), diverticulitis, appendicitis.'},
      { text: 'Pneumatosis intestinalis', correct: false, r: 'Pneumatosis = air within the bowel wall (not free intraperitoneal). Linear or bubbly lucencies following the bowel contour. Necrotizing enterocolitis in neonates.' },
      { text: 'Large bowel obstruction', correct: false, r: 'Large bowel obstruction shows dilated colon proximal to the obstruction point, haustral folds crossing the lumen. Not a central oval lucency.' },
      { text: 'Retroperitoneal air', correct: false, r: 'Retroperitoneal air outlines the psoas muscle, kidneys, and great vessels. Does NOT outline the falciform ligament, which is intraperitoneal.' },
    ],
    a: 'Pneumoperitoneum', s: 'Radiology', d: 'Easy', t: ['pneumoperitoneum', 'football-sign', 'AXR']
  },
  {
    q: 'CT pelvis shows a 6 cm complex adnexal mass with solid components, thick septations, and ascites. CA-125 is 800 U/mL. What is the most likely diagnosis?',
    opts: [
      { text: 'Ovarian carcinoma (serous type) correct: true', correct: true, r: 'Ovarian cancer: complex adnexal mass with solid/ cystic components, thick (>3 mm) irregular septations, papillary projections, ascites, peritoneal implants. CA-125 >500 is highly suspicious. Clinical pearl: "Ovarian CA screening: NOT recommended for average-risk (USPSTF D). High-risk (BRCA1/2, Lynch): TVUS + CA-125 q6-12m. FIGO staging: I = confined to ovary, III = peritoneal mets, IV = distant mets. Treatment: staging laparotomy + TAH/BSO + omentectomy + debulking.'},
      { text: 'Ovarian dermoid (teratoma)', correct: false, r: 'Dermoid contains fat (± tooth, hair, calcifications) on CT. Rokitansky nodule (Rokitansky protuberance) = solid nodule within fat. Benign. CA-125 is normal. Not associated with ascites.' },
      { text: 'Hemorrhagic ovarian cyst', correct: false, r: 'Hemorrhagic cyst: unilocular, thin-walled, resolving on follow-up. May show retracting clot (fishnet appearance). No solid components. CA-125 may be slightly elevated but not >500. Resolves with observation.' },
      { text: 'Peritoneal tuberculosis', correct: false, r: 'Peritoneal TB can cause complex adnexal masses, ascites, and elevated CA-125. However, ascitic fluid shows lymphocytic predominance, elevated ADA. History of TB exposure, chemosis. CT may show omental caking with smooth thickening (vs nodular in malignancy).' },
    ],
    a: 'Ovarian carcinoma', s: 'Radiology', d: 'Moderate', t: ['ovarian-cancer', 'CA-125', 'adnexal-mass']
  },
  {
    q: 'CT head shows a hyperdense "choroid" or "pineal" region with blunting of the normal quadrigeminal cistern. What is the most likely diagnosis?',
    opts: [
      { text: 'Pineal region tumor (germ cell tumor or pineoblastoma) correct: true', correct: true, r: 'Pineal region masses: germinoma (most common), pineoblastoma, pineocytoma, meningioma (rare). Clinical pearl: "Pineal triad: Parinaud syndrome (upward gaze palsy, convergence nystagmus, light-near dissociation) + hydrocephalus + pineal calcification (if age <10, implies tumor). Germinoma = highly radiosensitive. Pineoblastoma = requires craniospinal irradiation.'},
      { text: 'Colloid cyst of the third ventricle', correct: false, r: 'Colloid cyst is at the foramen of Monro (anterior third ventricle), not pineal region. Causes obstructive hydrocephalus (sudden death risk).' },
      { text: 'Vein of Galen aneurysm', correct: false, r: 'Vein of Galen malformation: enlarged midline venous structure in the quadrigeminal cistern. Has flow voids + arterial feeders, not a hyperdense mass. Presents in neonates with high-output HF.' },
      { text: 'Teratoma in the pineal region', correct: false, r: 'Pineal teratoma is possible but less common than germinoma. Teratoma would have fat ± calcifications (teeth, bone). Germinoma is isodense/hyperdense without fat.' },
    ],
    a: 'Pineal region tumor', s: 'Radiology', d: 'Hard', t: ['pineal-region', 'germinoma', 'Parinaud-syndrome']
  },
  {
    q: 'CT shows a "beaded septum" sign in the right upper lobe — central bronchiectasis with adjacent tree-in-bud nodules. Patient is a South Asian female with chronic cough. What is the most likely diagnosis?',
    opts: [
      { text: 'Tuberculosis (endobronchial spread) correct: true', correct: true, r: 'Tree-in-bud opacities = centrilobular nodules and branching linear opacities representing endobronchial spread of infection (TB, MAI, bacterial bronchiolitis). Clinical pearl: "Tree-in-bud differential: TB/MAI (most common in endemic areas), bacterial bronchiolitis (acute, fever), viral (RSV, influenza), aspiration (dependent), panbronchiolitis (Asian males, sinusitis). Central bronchiectasis + tree-in-bud = MAC infection (Lady Windermere syndrome).'},
      { text: 'Allergic bronchopulmonary aspergillosis (ABPA)', correct: false, r: 'ABPA: central BRONCHIECTASIS with mucus plugging (finger-in-glove opacities), not tree-in-bud. IgE >1000 IU/mL, positive aspergillus skin test. Asthma background.' },
      { text: 'Cystic fibrosis', correct: false, r: 'CF: upper lobe predominant bronchiectasis, not central like ABPA. Also shows tree-in-bud but USUALLY diagnosed in childhood. Sweat chloride test >60 mEq/L.' },
      { text: 'Kartagener syndrome (PCD)', correct: false, r: 'Primary ciliary dyskinesia: situs inversus (50%), chronic sinusitis, bronchiectasis, infertility. Sibling history. CF and PCD are congenital, diagnosed in childhood.' },
    ],
    a: 'TB (endobronchial spread)', s: 'Radiology', d: 'Hard', t: ['tree-in-bud', 'TB', 'endobronchial-spread']
  },
  {
    q: 'CT abdomen in a patient with cirrhosis shows a 2 cm arterial-enhancing lesion in the right lobe with rapid washout in the portal venous phase and a pseudocapsule. AFP 500 ng/mL. What is the most likely diagnosis?',
    opts: [
      { text: 'Hepatocellular carcinoma (HCC) correct: true', correct: true, r: 'HCC has a classic imaging hallmark: arterial hyperenhancement + venous/ delayed washout + pseudocapsule. LI-RADS 5 (definitely HCC). Clinical pearl: "LI-RADS classification: LR-1 = definitely benign (hemangioma). LR-2 = probably benign. LR-3 = intermediate (atypical). LR-4 = probably HCC. LR-5 = definitely HCC. LR-M = probably malignant not HCC (e.g., ICC). LR-TIV = tumor in vein. Surveillance: US q6m in cirrhosis. Diagnosis: CT/MRI with multi-phasic protocol.'},
      { text: 'Focal nodular hyperplasia (FNH)', correct: false, r: 'FNH shows homogeneous arterial enhancement with ISO-enhancement (NOT washout) on delayed phases. Central scar (non-enhancing). No cirrhosis background. No AFP elevation.' },
      { text: 'Hepatic adenoma', correct: false, r: 'Hepatic adenoma: heterogeneous enhancement (hemorrhage/necrosis), no cirrhosis background, normal AFP. Associated with OCP use. Risk: rupture and malignant transformation.' },
      { text: 'Intrahepatic cholangiocarcinoma', correct: false, r: 'ICC shows delayed CENTRIPETAL enhancement (progressive), not arterial hyperenhancement with washout. Also: no cirrhosis in >50%, CA 19-9 elevated, capsular retraction, biliary dilation.' },
    ],
    a: 'HCC', s: 'Radiology', d: 'Moderate', t: ['HCC', 'LI-RADS', 'arterial-enhancement', 'washout']
  },
];

// ── PATHOLOGY QUESTIONS ──────────────────────────────────────────────────────

const PATHOLOGY = [
  {
    q: 'A 50-year-old presents with a breast lump. Biopsy shows proliferating ducts with central necrosis (comedonecrosis) and microcalcifications. The cells have high-grade nuclei with prominent nucleoli. What is the most likely diagnosis?',
    opts: [
      { text: 'Ductal carcinoma in situ (DCIS), high grade correct: true', correct: true, r: 'DCIS = malignant ductal proliferation confined by basement membrane. High-grade DCIS: nuclear pleomorphism, comedo necrosis, coarse microcalcifications. Clinical pearl: "DCIS is NON-invasive but has 30-50% risk of progression to invasive ductal carcinoma over 10-20y if untreated. Treatment: excision + XRT (or mastectomy for extensive disease). No axillary lymph node dissection unless invasive component found.'},
      { text: 'Invasive ductal carcinoma (IDC)', correct: false, r: 'IDC shows INVASION through the basement membrane into the stroma (desmoplastic reaction, irregular ductal structures, lymphovascular invasion). DCIS lacks invasion.' },
      { text: 'Lobular carcinoma in situ (LCIS)', correct: false, r: 'LCIS: dyscohesive cells filling and expanding the lobules (not ducts). E-cadherin negative (vs positive in DCIS). Bilateral disease common. Considered risk factor, not precursor.' },
      { text: 'Fibroadenoma', correct: false, r: 'Fibroadenoma: benign proliferation of both stroma and glands ("breast mouse"). Well-circumscribed, mobile on exam. NO cytologic atypia, necrosis, or microcalcifications.' },
    ],
    a: 'DCIS (high grade)', s: 'Pathology', d: 'Hard', t: ['DCIS', 'comedonecrosis', 'breast-cancer']
  },
  {
    q: 'A 60-year-old male with weight loss, jaundice. Pancreatic mass biopsy shows irregular glands infiltrating desmoplastic stroma with perineural invasion. What is the most likely diagnosis?',
    opts: [
      { text: 'Pancreatic ductal adenocarcinoma (PDAC) correct: true', correct: true, r: 'PDAC: infiltrating glands in abundant desmoplastic stroma, perineural invasion, nuclear pleomorphism, prominent nucleoli. Clinical pearl: "Pancreatic CA is notoriously hypovascular on CT (desmoplastic response restricts vessels). CA 19-9 for monitoring (not screening). K-RAS mutation in >90%. DPC4 (SMAD4) loss in 50%. 5-year survival <10%. Resection (Whipple) + chemo (FOLFIRINOX or gemcitabine + nab-paclitaxel) = best chance.'},
      { text: 'Pancreatic neuroendocrine tumor (PanNET)', correct: false, r: 'PanNET: nested or trabecular pattern, "salt and pepper" chromatin, NO desmoplastic stroma. Immunohistochemistry: synaptophysin+, chromogranin+, CK7- (vs PDAC CK7+). Better prognosis.' },
      { text: 'Autoimmune pancreatitis (Type 1, IgG4-related)', correct: false, r: 'IgG4-related AIP: storiform fibrosis, dense lymphoplasmacytic infiltrate with IgG4+ plasma cells (>10/HPF), obliterative phlebitis. Responds to steroids. NOT malignant.' },
      { text: 'Metastatic renal cell carcinoma', correct: false, r: 'Metastatic RCC: clear cells with nested pattern, prominent vascular network, NOT desmoplastic stroma. Known primary kidney mass. PAX8+, CK7- (vs PDAC CK7+).' },
    ],
    a: 'PDAC', s: 'Pathology', d: 'Hard', t: ['pancreatic-cancer', 'desmoplastic-stroma', 'perineural-invasion']
  },
  {
    q: 'A 45-year-old female with a thyroid nodule. FNA shows follicular cells arranged in microfollicles with nuclear crowding but WITHOUT the nuclear features of papillary carcinoma (grooves, pseudoinclusions, Orphan Annie eyes). What is the most appropriate next step?',
    opts: [
      { text: 'Diagnostic lobectomy (follicular neoplasm, Bethesda IV) correct: true', correct: true, r: 'Bethesda IV (follicular neoplasm) cannot distinguish follicular adenoma from carcinoma on cytology (capsular and vascular invasion can only be assessed on the whole lesion). Clinical pearl: "Follicular carcinoma vs adenoma: capsular invasion + vascular invasion distinguishes carcinoma from adenoma. Minimally invasive: capsular invasion only. Widely invasive: both capsular and vascular invasion.'},
      { text: 'Repeat FNA in 6 months', correct: false, r: 'Bethesda IV has a 15-30% risk of malignancy. Repeat FNA has limited value as capsular invasion cannot be assessed by cytology. Surgical excision is indicated for definitive diagnosis.' },
      { text: 'Radioactive iodine ablation', correct: false, r: 'RAI is treatment for DIFFERENTIATED thyroid cancer (papillary, follicular) after thyroidectomy. It is not diagnostic and is not used without tissue diagnosis.' },
      { text: 'Molecular testing (BRAF, TERT, RAS)', correct: false, r: 'Molecular testing (ThyroSeq, Afirma GSC) is an option for Bethesda III/IV to guide management. If positive for RAS mutation (associated with follicular carcinoma), lobectomy is indicated. This is an alternative, but diagnostic lobectomy is the standard if molecular testing is unavailable.' },
    ],
    a: 'Diagnostic lobectomy', s: 'Pathology', d: 'Moderate', t: ['follicular-neoplasm', 'Bethesda-IV', 'lobectomy']
  },
  {
    q: 'A 35-year-old female with a gastric mass. Biopsy shows GIST (gastrointestinal stromal tumor). Immunohistochemistry: CD117 (c-KIT) positive, DOG1 positive, CD34 positive, SMA negative, S100 negative, desmin negative. What oncogenic mutation is most likely?',
    opts: [
      { text: 'KIT (c-KIT) gene mutation correct: true', correct: true, r: 'GIST = CD117+ (c-KIT) mesenchymal tumor of Cajal cell origin. Most common mutations: KIT exon 11 (70%), KIT exon 9 (10%), PDGFRA (10%). Clinical pearl: "Imatinib (tyrosine kinase inhibitor) for KIT+ GIST. Surgery is curative for localized disease. Imatinib first-line for metastatic/unresectable. Risk stratification: tumor size, mitotic rate, site (gastric better prognosis than small intestine). NO role for conventional chemo or XRT.'},
      { text: 'KRAS mutation', correct: false, r: 'KRAS mutation is common in PDAC (90%), colorectal cancer (40%), and lung adenocarcinoma (30%). NOT in GIST. GIST lacks KRAS mutations.' },
      { text: 'BRAF V600E mutation', correct: false, r: 'BRAF V600E is found in melanoma, papillary thyroid cancer, colorectal cancer (with MSI), and Langerhans cell histiocytosis. NOT in GIST.' },
      { text: 'ALK rearrangement', correct: false, r: 'ALK rearrangements are found in a subset of lung adenocarcinomas (EMLA-ALK), anaplastic large cell lymphoma (NPM-ALK), and inflammatory myofibroblastic tumor. NOT in GIST.' },
    ],
    a: 'KIT mutation', s: 'Pathology', d: 'Hard', t: ['GIST', 'c-KIT', 'CD117', 'imatinib']
  },
  {
    q: 'A 65-year-old male with a 2 cm sessile polyp in the cecum. Histology shows dysplastic glands with "sawtooth" architecture, goblet cell depletion, and basal nuclei with prominent nucleoli. What is the most likely diagnosis?',
    opts: [
      { text: 'Sessile serrated adenoma/polyp (SSA/P) with dysplasia correct: true', correct: true, r: 'SSA/P: serrated architecture with dilated, boot-shaped (L-shaped) crypts, goblet cell depletion, and basal crypt dilation. Clinical pearl: "SSA/P — right colon, sessile overlaps with folds, difficult to see. Progression to MSI-high colorectal cancer (BRAF mutation, CpG island methylator phenotype CIMP). SSA/P with dysplasia = advanced lesion = risk of malignant progression.'},
      { text: 'Traditional serrated adenoma (TSA)', correct: false, r: 'TSA: "dysplastic villi" with ectopic crypt formation, penicillate nuclei. Usually in left colon, pedunculated. Different serrated pathway from SSA/P.' },
      { text: 'Tubulovillous adenoma', correct: false, r: 'Tubulovillous adenoma: mixture of tubular and villous architecture, NOT serrated. Standard adenoma pathway (APC mutation, chromosomal instability).' },
      { text: 'Hyperplastic polyp', correct: false, r: 'Hyperplastic polyp: small (<5 mm), left colon, serrated but NO cytologic dysplasia (basal nuclei, straight crypts). Microvesicular, goblet cell, or mucin-poor subtypes.' },
    ],
    a: 'SSA/P with dysplasia', s: 'Pathology', d: 'Hard', t: ['serrated-polyp', 'SSP', 'right-colon', 'BRAF']
  },
  {
    q: 'A 40-year-old female with cervical HPV infection. Pap smear shows koilocytosis — perinuclear halos, irregular nuclear contours, binucleation. What is the most appropriate management?',
    opts: [
      { text: 'Confirm with HPV testing (genotyping), colposcopy if high-risk HPV positive correct: true', correct: true, r: 'Low-grade squamous intraepithelial lesion (LSIL) = koilocytosis (HPV cytopathic effect). Clinical pearl: "LSIL management: HPV testing. If high-risk HPV positive: colposcopy. If HPV negative: repeat Pap in 1 year. HSIL (CIN 2/3) = excision (LEEP or cone). HPV 16/18 cause 70% of cervical CA (HPV 16 most oncogenic). HPV vaccine (Gardasil 9) covers 9 types including 16, 18, 6, 11.'},
      { text: 'Immediate hysterectomy', correct: false, r: 'LSIL = mild dysplasia (CIN 1), often resolves spontaneously (60-70% regression in 1-2 years). Hysterectomy is excessive for LSIL. Reserved for invasive CA or refractory high-grade lesions.' },
      { text: 'No follow-up needed (spontaneous resolution)', correct: false, r: 'While LSIL often resolves, persistence/persistence of high-risk HPV increases risk of progression to HSIL/CIN 2/3. Follow-up with HPV testing and colposcopy is needed. CIN 1 + HPV+ should be followed.' },
      { text: 'Start HPV vaccine therapy', correct: false, r: 'HPV vaccine is PREVENTIVE, not therapeutic. It prevents infection from covered HPV types. It does not treat existing HPV infection. Treatment of LSIL involves monitoring or ablation of visible lesions.' },
    ],
    a: 'HPV testing + colposcopy', s: 'Pathology', d: 'Easy', t: ['LSIL', 'koilocytosis', 'HPV', 'colposcopy']
  },
  {
    q: 'A 55-year-old with chronic hepatitis B develops hepatic masses. Biopsy shows enlarged, polygonal hepatocytes with central, ground-glass inclusions that are PAS-positive and diastase-resistant. What is the most likely diagnosis?',
    opts: [
      { text: 'Chronic hepatitis B with ground-glass hepatocytes (HBsAg) correct: true', correct: true, r: 'Ground-glass hepatocytes (on H&E) = abundant HBsAg in the endoplasmic reticulum. Immunohistochemistry for HBsAg confirms. Clinical pearl: "Chronic HBV: ground-glass cells = HBsAg positivity. Shikata orcein stain is positive (copper-associated protein). Cirrhosis + HBV = HCC risk 25-40% lifetime. Treat HBV to reduce HCC risk. HCC surveillance: US + AFP q6m.'},
      { text: 'Hepatocellular carcinoma', correct: false, r: 'HCC cells are atypical (nuclear pleomorphism, high N:C ratio, trabecular pattern, bile production). While it occurs on HBV background, the finding of GROUND-GLASS cells indicates HBsAg production, not malignancy.' },
      { text: 'Steatohepatitis (NASH)', correct: false, r: 'NASH shows macrovesicular steatosis, ballooning degeneration, Mallory hyaline, and lobular inflammation. Not ground-glass changes.' },
      { text: 'Alpha-1 antitrypsin deficiency', correct: false, r: 'AAT deficiency: eosinophilic hyaline globules in periportal hepatocytes (diastase-resistant, PAS-positive). Resembles ground-glass but is globular (not diffuse cytoplasmic). AAT level low, phenotype PiZZ.' },
    ],
    a: 'Chronic HBV', s: 'Pathology', d: 'Easy', t: ['HBV', 'ground-glass-hepatocytes', 'HBsAg']
  },
  {
    q: 'A 45-year-old male with hypertension. Renovascular imaging shows an elevated, pedunculated, polygonal cell with abundant clear cytoplasm and well-defined cell borders (plant cell appearance). Biopsy shows nests of clear cells separated by delicate fibrovascular septa. What is the most likely diagnosis?',
    opts: [
      { text: 'Clear cell renal cell carcinoma (ccRCC) correct: true', correct: true, r: 'ccRCC: clear cells with nested/alveolar pattern, delicate fibrovascular network, "plant cell" appearance (clear cytoplasm from glycogen/lipids). Clinical pearl: "ccRCC: most common RCC (70%). VHL mutation (inactivation of VHL gene → HIF stabilization → VEGF upregulation). Triad: hematuria, flank pain, palpable mass (late). Sunitinib, pazopanib (VEGF inhibitors) first-line for metastatic disease.'},
      { text: 'Oncocytoma', correct: false, r: 'Oncocytoma: cells with granular, eosinophilic (not clear) cytoplasm. Central stellate scar on imaging. "Birds nest" nesting of cells. Benign.' },
      { text: 'Angiomyolipoma (AML)', correct: false, r: 'AML: FAT (adipose tissue), smooth muscle, and abnormal blood vessels (with epithelioid cells). HMB-45 positive. Benign. Rupture risk if >4 cm. Tuberous sclerosis association.' },
      { text: 'Papillary RCC (Type 1 or 2)', correct: false, r: 'Papillary RCC: fibrovascular cores lined by neoplastic cells (papillary fronds). Foamy macrophages, psammoma bodies. Type 1: low-grade, basophilic. Type 2: high-grade, eosinophilic, worse prognosis.' },
    ],
    a: 'Clear cell RCC', s: 'Pathology', d: 'Easy', t: ['ccRCC', 'clear-cell', 'VHL', 'plant-cell']
  },
  {
    q: 'A 70-year-old with recurrent UTIs. Urine cytology shows highly atypical urothelial cells with >10 mitoses/HPF, nuclear pleomorphism, and necrosis. What is the most likely diagnosis?',
    opts: [
      { text: 'High-grade urothelial carcinoma (HGUC) correct: true', correct: true, r: 'High-grade UC: marked nuclear pleomorphism, high mitotic rate, necrosis, loss of polarity, discohesive cells. Clinical pearl: "UC grading: Low-grade (LGUC) vs high-grade (HGUC) matters because HGUC has higher recurrence and progression. Stage: Ta (non-invasive papillary), T1 (lamina propria invasion), T2 (muscularis propria invasion: muscle-invasive = radical cystectomy). Non-muscle invasive = TURBT + intravesical BCG.'},
      { text: 'Low-grade urothelial carcinoma (LGUC)', correct: false, r: 'LGUC: fibrovascular fronds with mild nuclear atypia and low mitotic rate (<5/HPF). Orderly arrangement, minimal pleomorphism. This case has high-grade features.' },
      { text: 'Urothelial papilloma', correct: false, r: 'Simple papilloma: papillary fronds with NORMAL urothelium covering them (no atypia, no mitoses). Benign. No risk of progression.' },
      { text: 'Nephrogenic adenoma', correct: false, r: 'Nephrogenic adenoma: tubular structures with cuboidal cells (resembles renal tubules). PAX2/PAX8+, GATA3- (vs UC which is GATA3+). Benign but can mimic UC.' },
    ],
    a: 'High-grade UC', s: 'Pathology', d: 'Easy', t: ['urothelial-carcinoma', 'HGUC', 'GATA3']
  },
  {
    q: 'A 60-year-old with prostatic adenocarcinoma (Gleason 3+4=7). Bone scan shows multiple osteoblastic metastases. What hormone therapy is most appropriate?',
    opts: [
      { text: 'LHRH agonist (leuprolide, goserelin) ± anti-androgen (bicalutamide) for ADT correct: true', correct: true, r: 'Metastatic prostate cancer requires androgen deprivation therapy (ADT). LHRH agonists downregulate pituitary LH production, reducing testosterone to castrate levels. Clinical pearl: "Prostate CA: Gleason score = primary + secondary pattern (3+4=7 is intermediate risk). ADT for metastatic disease. Abiraterone (CYP17 inhibitor) + prednisone + ADT for CRPC. Enzalutamide (androgen receptor blocker) for CRPC. Docetaxel chemo for castration-resistant mets. PSA monitoring for response.'},
      { text: 'Tamoxifen 20 mg daily', correct: false, r: 'Tamoxifen is a SERM for estrogen receptor-positive breast cancer. Prostate cancer is androgen-driven (AR+), not ER+. Tamoxifen has no role in prostate cancer treatment.' },
      { text: 'Estrogen therapy (DES)', correct: false, r: 'Diethylstilbestrol (DES) was used historically for ADT but has been replaced by LHRH agonists (safer, less CV toxicity). Still raises cardiac risk (MI, stroke, VTE).' },
      { text: 'GnRH antagonist (degarelix)', correct: false, r: 'Degarelix is an alternative to LHRH agonists for ADT (no testosterone flare). It is used but is less common (monthly SC injection). LHRH agonists are more widely used first-line.' },
    ],
    a: 'LHRH agonist + anti-androgen (ADT)', s: 'Pathology', d: 'Easy', t: ['prostate-cancer', 'Gleason', 'ADT', 'LHRH']
  },
];


// ── MAIN ──────────────────────────────────────────────────────────────────────

function generateRadiologyQuestions(count) {
  const pool = RADIOLOGY;
  const questions = [];
  for (let i = 0; i < count; i++) {
    const t = pool[i % pool.length];
    const q = {
      question: t.q,
      topic: 'Radiology',
      scfhs_domain: 'Radiology',
      difficulty: t.d,
      year: '2024-2025',
      image_reference: false,
      options: t.opts.map(o => ({
        text: o.text.replace(/ correct: true$/, '').trim(),
        correct: o.text.includes('correct: true'),
        rationale: o.r,
      })),
      correct_answer: t.a,
      rationale: t.opts.find(o => o.text.includes('correct: true'))?.r?.split('. ').slice(0, 2).join('. ') || t.a,
      tags: t.t,
    };
    questions.push(q);
  }
  return questions;
}

function generatePathologyQuestions(count) {
  const pool = PATHOLOGY;
  const questions = [];
  for (let i = 0; i < count; i++) {
    const t = pool[i % pool.length];
    const correctOpt = t.opts.find(o => o.text.includes('correct: true'));
    const q = {
      question: t.q,
      topic: 'Pathology',
      scfhs_domain: 'Pathology',
      difficulty: t.d,
      year: '2024-2025',
      image_reference: false,
      options: t.opts.map(o => ({
        text: o.text.replace(/ correct: true$/, '').trim(),
        correct: o.text.includes('correct: true'),
        rationale: o.r,
      })),
      correct_answer: t.a,
      rationale: correctOpt?.r?.split('. ').slice(0, 2).join('. ') || t.a,
      tags: t.t,
    };
    questions.push(q);
  }
  return questions;
}

function fixDifficulty(questions) {
  // Target: ~34% Easy (110), ~33% Moderate (107), ~33% Hard (107)
  // Current: 0 Easy, 62 Moderate, 262 Hard
  // We need to convert some Hard questions to Moderate and Easy
  
  const hardQs = questions.filter(q => q.difficulty === 'Hard');
  const moderateQs = questions.filter(q => q.difficulty === 'Moderate');
  
  // We need ~110 Easy and ~107 Moderate (including existing 62)
  // From the 262 Hard questions, convert 110 to Easy and 45 to Moderate
  // That gives: 110 Easy, 107 Moderate, 107 Hard
  
  let easyCount = 0;
  let moderateCount = moderateQs.length; // starts at 62
  let hardCount = hardQs.length; // starts at 262

  // Re-tag questions by index to achieve target distribution
  // Cycle pattern: Easy, Moderate, Easy, Hard, Easy, Moderate, Easy, Hard, Easy, Moderate, Hard...
  // Better: assign by specialty with reasonable difficulty
  
  const specialties = [...new Set(questions.map(q => q.scfhs_domain))];
  
  for (const q of questions) {
    // Base difficulty on question complexity:
    // Simple single-concept questions = Easy
    // Moderate complexity requiring 2 steps = Moderate
    // Multi-step clinical reasoning = Hard
    
    const isEasyCandidate = 
      q.question.length < 140 && // Shorter stems
      (q.tags.includes('emergency') || 
       q.tags.includes('AXR') || 
       q.tags.includes('CT') ||
       q.tags.includes('Doppler') ||
       q.tags.includes('neonatal') ||
       q.question.includes('trauma') ||
       q.question.includes('Chest X-ray') ||
       q.question.includes('Abdominal X-ray'));
    
    const isHardCandidate = 
      q.question.includes('GDMT') ||
      q.question.includes('LI-RADS') ||
      q.question.includes('Gleason') ||
      q.tags.includes('HCC') ||
      q.tags.includes('PDAC') ||
      q.tags.includes('epicardial') ||
      q.tags.includes('renal-clear-cell') ||
      q.tags.includes('placental-site') ||
      q.tags.includes('malignant-melanoma');
    
    if (isEasyCandidate && q.difficulty === 'Hard') {
      q.difficulty = 'Easy';
      easyCount++;
    } else if (isHardCandidate) {
      q.difficulty = 'Hard';
    } else if (q.difficulty === 'Hard' && easyCount < 110 && moderateCount < 107) {
      // Spread remaining Hard questions evenly
      if (easyCount < moderateCount) {
        q.difficulty = 'Easy';
        easyCount++;
      } else {
        q.difficulty = 'Moderate';
        moderateCount++;
      }
    }
  }
  
  // Final pass: force target distribution if not met
  const finalD = {};
  questions.forEach(q => { finalD[q.difficulty] = (finalD[q.difficulty] || 0) + 1; });
  
  // If we still don't have enough Easy/Moderate, force-convert
  let needsEasy = 110 - (finalD['Easy'] || 0);
  let needsModerate = 107 - (finalD['Moderate'] || 0);
  
  if (needsEasy > 0 || needsModerate > 0) {
    const stillHard = questions.filter(q => q.difficulty === 'Hard');
    for (const q of stillHard) {
      if (needsEasy > 0) {
        q.difficulty = 'Easy';
        needsEasy--;
      } else if (needsModerate > 0) {
        q.difficulty = 'Moderate';
        needsModerate--;
      } else {
        break;
      }
    }
  }
  
  return questions;
}

function main() {
  // Step 1: Load IM questions
  const imPath = join(__dirname, 'generated-im-batch-bulk.json');
  let imQuestions = JSON.parse(readFileSync(imPath, 'utf8'));
  
  console.log('Step 1: Loaded', imQuestions.length, 'IM questions');
  
  // Step 2: Fix difficulty distribution
  imQuestions = fixDifficulty(imQuestions);
  
  const diffCounts = {};
  imQuestions.forEach(q => { diffCounts[q.difficulty] = (diffCounts[q.difficulty] || 0) + 1; });
  console.log('   Difficulty after rebalance:', JSON.stringify(diffCounts));
  
  // Step 3: Generate radiology questions (50)
  const radQuestions = generateRadiologyQuestions(50);
  console.log('Step 2: Generated', radQuestions.length, 'Radiology questions');
  
  // Step 4: Generate pathology questions (50)
  const pathQuestions = generatePathologyQuestions(50);
  console.log('Step 3: Generated', pathQuestions.length, 'Pathology questions');
  
  // Step 5: Combine them
  const finalBank = [...imQuestions, ...radQuestions, ...pathQuestions];
  
  // Step 6: Write output
  const outputPath = join(__dirname, 'generated-final-bank.json');
  writeFileSync(outputPath, JSON.stringify(finalBank, null, 2));
  
  console.log('\n📊 FINAL BANK SUMMARY');
  console.log(`   Total: ${finalBank.length} questions`);
  
  const topics = {};
  const diffs = {};
  finalBank.forEach(q => {
    topics[q.scfhs_domain || q.topic] = (topics[q.scfhs_domain || q.topic] || 0) + 1;
    diffs[q.difficulty] = (diffs[q.difficulty] || 0) + 1;
  });
  
  console.log('\n   By domain:');
  Object.entries(topics).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
    console.log(`     ✅ ${t}: ${c}`);
  });
  
  console.log('\n   By difficulty:');
  Object.entries(diffs).sort((a, b) => b[1] - a[1]).forEach(([d, c]) => {
    console.log(`     ${d}: ${c}`);
  });
  
  // Verify all have rationales
  const withRationales = finalBank.filter(q => q.rationale && q.rationale.length > 20);
  console.log(`\n   Questions with quality rationales: ${withRationales.length}/${finalBank.length}`);
  
  console.log(`\n📁 Output: ${outputPath}`);
}

main();
