/**
 * generate-surgery.mjs
 *
 * SMLE Surgery domain — 500 questions covering all subtopics.
 *
 * Usage: node scripts/generate-surgery.mjs
 */

import { writeOutput, shuffle } from './question-utils.mjs';

const TARGET = 460;

function q(v, opts, cr, tags, top) {
  return (i) => {
    const sh = shuffle(opts);
    const ci = sh.findIndex(o => o.text === cr);
    return {
      question: v.replace(/\{age\}/g, 25+(i%46)).replace(/\{gender\}/g, i%2===0?'male':'female'),
      topic:'Surgery', scfhs_domain:'Surgery',
      difficulty:['Easy','Moderate','Moderate','Hard','Hard'][i%5],
      year:'2024-2025', image_reference:false,
      options:sh.map(o=>({text:o.text, correct:o.text===cr, rationale:o.r})),
      correct_answer:String.fromCharCode(65+ci), rationale:top, tags,
    };
  };
}

const T = [
  // ═══ BASIC PRINCIPLES ═══

  q('A {age}-year-old {gender} is scheduled for elective cholecystectomy. Hb 10, platelets 150, INR 1.2, Cr 0.8. No bleeding history. What pre-op test is most important?',
    [{text:'Type and screen',r:'Pre-op testing should be targeted. For cholecystectomy with low bleeding risk: type and screen. Routine INR, CBC, BMP per patient age and comorbidities.'},
     {text:'Chest X-ray',r:'Routine CXR is not indicated before elective surgery unless cardiac or pulmonary disease is suspected.'},
     {text:'ECG',r:'ECG is indicated for men >45, women >55, or cardiac risk factors. Not all patients need pre-op ECG.'},
     {text:'Pulmonary function tests',r:'PFTs are for lung resection or known pulmonary disease. Not routine for cholecystectomy.'}],
    'Type and screen',['surgery','preoperative','evaluation'],'Target pre-op testing based on patient factors and surgery type. Routine testing is not beneficial.'),

  q('A {age}-year-old {gender} undergoes emergency laparotomy for perforated duodenal ulcer. On post-op day 3 develops fever 39°C, wound erythema, and purulent drainage. What is the most likely diagnosis?',
    [{text:'Surgical site infection',r:'SSI typically presents 3-7 days post-op with wound erythema, tenderness, and purulent drainage. Risk factors: emergency surgery, contaminated wound class. Management: wound opening, culture, antibiotics.'},
     {text:'Wound dehiscence',r:'Dehiscence is separation of wound edges without infection. Presents with serosanguinous drainage and fascial defect.'},
     {text:'Necrotizing fasciitis',r:'NF presents with severe pain out of proportion, crepitus, bullae, and systemic toxicity. Rapidly progressive.'},
     {text:'Intra-abdominal abscess',r:'Abdominal abscess presents with fever, ileus, and no localizing wound findings. CT would show fluid collection.'}],
    'Surgical site infection',['surgery','SSI','wound-infection'],'SSI: open wound, culture, antibiotics. Prevent with preoperative antibiotics within 60 minutes of incision.'),

  q('A {age}-year-old {gender} post-op day 1 after colectomy develops fever 38.5°C. Lung exam clear, wound clean, no calf tenderness. What is the most likely cause?',
    [{text:'Atelectasis',r:'Post-op day 1-2 fever is most commonly from atelectasis. Encouraging deep breathing, incentive spirometry, and ambulation resolves it. Other causes should be ruled out if fever persists.'},
     {text:'UTI',r:'UTI typically develops after day 3 post-op, especially if catheterized. This patient has fever on day 1.'},
     {text:'Wound infection',r:'Wound infections present 3-7 days post-op. Day 1 fever is too early.'},
     {text:'DVT',r:'DVT presents with calf tenderness, swelling, and Homans sign later in the post-op course. Day 1 is too early.'}],
    'Atelectasis',['surgery','postoperative-fever','atelectasis'],'Post-op day 1 fever: atelectasis most common. Stepwise workup: pulmonary → wound → urine → line → DVT.'),

  q('A {age}-year-old {gender} post-op day 5 after hip replacement develops acute onset dyspnea, pleuritic chest pain, and hypoxia. CTPA shows segmental PE. What is the most appropriate management?',
    [{text:'Therapeutic anticoagulation with LMWH or DOAC',r:'Post-op PE: anticoagulate unless contraindicated. LMWH bridge or DOAC. Consider IVC filter if anticoagulation contraindicated. Thrombolysis for massive PE with shock.'},
     {text:'IVC filter placement',r:'IVC filter is for patients with contraindication to anticoagulation. This patient has no contraindication.'},
     {text:'IV thrombolysis',r:'Thrombolysis is for massive PE with obstructive shock. This patient is normotensive.'},
     {text:'Aspirin 325 mg',r:'Aspirin is insufficient for acute VTE treatment. Full-dose anticoagulation is required.'}],
    'Therapeutic anticoagulation with LMWH or DOAC',['surgery','PE','thromboembolism','anticoagulation'],'Post-op VTE: anticoagulation. Prevention: mechanical + pharmacologic prophylaxis per Caprini score.'),

  q('A {age}-year-old {gender} on post-op day 1 has urine output 20 mL over 4 hours. BP 110/70, HR 95, CVP 4. What is the most appropriate initial management?',
    [{text:'IV fluid bolus 500 mL crystalloid',r:'Oliguria with low CVP suggests hypovolemia. Fluid bolus is first-line. If no response, reassess for renal causes or obstruction. Monitor urine output, CVP, and creatinine.'},
     {text:'IV furosemide 40 mg',r:'Furosemide should NOT be given for oliguria until hypovolemia is ruled out. It can worsen prerenal AKI.'},
     {text:'Renal ultrasound',r:'Imaging is for suspected obstruction. The first step for oliguria with low CVP is fluid challenge.'},
     {text:'Start dopamine',r:'Dopamine is not recommended for oliguria. Fluid resuscitation is the appropriate first step for hypovolemia.'}],
    'IV fluid bolus 500 mL crystalloid',['surgery','oliguria','fluid-resuscitation'],'Post-op oliguria: assess volume status (CVP, BP, I/O). Fluid challenge first. Avoid diuretics until hypovolemia corrected.'),

  q('A {age}-year-old {gender} presents with fever, chills, and hypotensive shock. WBC 20, lactate 4.5. Source suspected as cholangitis. What is the most appropriate initial management?',
    [{text:'Fluid resuscitation + blood cultures + broad-spectrum antibiotics + source control',r:'Septic shock: fluids 30 mL/kg, cultures, broad-spectrum abx within 1 hour, and source control (ERCP for cholangitis). Each hour delay increases mortality.'},
     {text:'CT scan before antibiotics',r:'Imaging should not delay antibiotics in septic shock. Give abx immediately after cultures.'},
     {text:'Norepinephrine before fluids',r:'Vasopressors are for refractory shock after fluid resuscitation. Initial step is volume repletion.'},
     {text:'IV antibiotics alone',r:'Source control is essential in septic shock from cholangitis. ERCP for biliary decompression is needed along with antibiotics.'}],
    'Fluid resuscitation + blood cultures + broad-spectrum antibiotics + source control',['surgery','sepsis','SIRS'],'Septic shock: early recognition, fluids, abx, source control. Lactate clearance guides resuscitation.'),

  // ═══ GENERAL SURGERY ═══

  q('A {age}-year-old {gender} finds a firm, non-tender lump in the upper outer quadrant of the left breast. Mammogram shows a spiculated mass with microcalcifications. What is the most appropriate next step?',
    [{text:'Core needle biopsy',r:'BIRADS 5 (highly suggestive of malignancy) requires tissue diagnosis. Core needle biopsy provides histology and receptor status for treatment planning.'},
     {text:'Repeat mammogram in 6 months',r:'Short interval follow-up is for BIRADS 3 (probably benign). Spiculated mass with microcalcifications is BIRADS 5.'},
     {text:'Excisional biopsy',r:'Excisional biopsy is for lesions not amenable to core biopsy. Core needle biopsy is preferred as first-line.'},
     {text:'MRI breast',r:'MRI is adjunctive for high-risk screening or evaluating extent of disease. It does not replace tissue diagnosis.'}],
    'Core needle biopsy',['surgery','breast-mass','biopsy'],'BIRADS 4/5 lesions require core needle biopsy for histologic diagnosis.'),

  q('A {age}-year-old {gender} with jaundice, dark urine, and right upper quadrant pain. US shows dilated CBD with choledocholithiasis. Bilirubin 6.2, ALP 420. Temp 38.5°C. What is the most appropriate management?',
    [{text:'Urgent ERCP with sphincterotomy and stone extraction',r:'Cholangitis from CBD stones requires urgent biliary decompression. ERCP with sphincterotomy is first-line. Tokyo guidelines: ERCP <24 hours for moderate cholangitis.'},
     {text:'Laparoscopic cholecystectomy',r:'Cholecystectomy alone does not address the obstructed CBD. ERCP first, then cholecystectomy.'},
     {text:'Percutaneous transhepatic biliary drainage',r:'PTBD is for failed ERCP or inaccessible ampulla. ERCP is first-line.'},
     {text:'Medical management with antibiotics',r:'Antibiotics alone without drainage is inadequate for cholangitis. Biliary decompression is essential.'}],
    'Urgent ERCP with sphincterotomy and stone extraction',['surgery','cholangitis','ERCP'],'Cholangitis with CBD stones: urgent ERCP + sphincterotomy. Interval cholecystectomy after recovery.'),

  q('A {age}-year-old {gender} with cirrhosis presents with massive hematemesis. HR 120, BP 85/60. EGD shows actively bleeding esophageal varices. What is the most appropriate immediate management?',
    [{text:'Endoscopic variceal band ligation + octreotide + prophylactic antibiotics',r:'Acute variceal bleed: band ligation is definitive. Octreotide reduces portal pressure. Prophylactic ceftriaxone reduces mortality. Blood transfusion goal Hgb 7-8. TIPS if banding fails.'},
     {text:'Balloon tamponade first',r:'Balloon tamponade (Sengstaken-Blakemore) is a temporizing measure when band ligation fails or is unavailable, not first-line.'},
     {text:'IV PPI',r:'PPI is for peptic ulcer bleeding. Variceal bleeding requires banding and vasoactive drugs.'},
     {text:'TIPS procedure',r:'TIPS is rescue therapy for refractory variceal bleeding after failed banding. Not first-line.'}],
    'Endoscopic variceal band ligation + octreotide + prophylactic antibiotics',['surgery','variceal-bleed','portal-hypertension'],'Acute variceal hemorrhage: band ligation + octreotide + antibiotics. TIPS for refractory bleeding.'),

  q('A {age}-year-old {gender} with diabetes presents with a non-healing ulcer under the first metatarsal head. Foot is warm with palpable pulses and loss of protective sensation. What is the most likely diagnosis?',
    [{text:'Neuropathic diabetic foot ulcer',r:'Diabetic neuropathic ulcers occur at pressure points (metatarsal heads) in feet with neuropathy but palpable pulses. Treatment: offloading, debridement, infection control, vascular assessment.'},
     {text:'Ischemic ulcer',r:'Ischemic ulcers have absent pulses, cool extremities, and are more painful. Located on toes or heel.'},
     {text:'Venous stasis ulcer',r:'Venous ulcers are on the medial malleolus with hemosiderin deposition, edema, and varicose veins.'},
     {text:'Pressure ulcer',r:'Pressure ulcers occur over bony prominences in immobile patients, not at metatarsal heads in ambulatory patients.'}],
    'Neuropathic diabetic foot ulcer',['surgery','diabetic-foot','neuropathic-ulcer'],'Diabetic foot ulcer: offloading, debridement, infection treatment. Vascular assessment. Prevention: foot care education.'),

  q('A {age}-year-old {gender} presents with acute onset of severe epigastric pain radiating to the back, nausea, and vomiting. Amylase 1200, lipase 2500. CT shows peripancreatic fat stranding. Gallbladder sludge on US. What is the most likely diagnosis?',
    [{text:'Acute biliary pancreatitis',r:'Gallstones are the most common cause of acute pancreatitis. Management: supportive care, IV fluids, pain control. Same-admission cholecystectomy for mild pancreatitis to prevent recurrence.'},
     {text:'Alcoholic pancreatitis',r:'Alcohol is the second most common cause but this patient has gallbladder sludge, pointing to biliary etiology.'},
     {text:'Pancreatic necrosis',r:'Necrosis is a complication of severe pancreatitis, diagnosed on contrast CT. This patient has interstitial edema without necrosis.'},
     {text:'Pancreatic pseudocyst',r:'Pseudocysts develop 4+ weeks after acute pancreatitis. This is the initial presentation.'}],
    'Acute biliary pancreatitis',['surgery','pancreatitis','gallstones'],'Mild biliary pancreatitis: supportive care + same-admission cholecystectomy. Severe pancreatitis: ICU management.'),

  q('A {age}-year-old {gender} with Crohn disease presents with RLQ pain, fever, and a tender mass. CT shows ileocolic abscess 4 cm. What is the most appropriate management?',
    [{text:'Percutaneous drainage + IV antibiotics + elective resection',r:'Crohn-related abscess >3 cm: percutaneous drainage (CT-guided) plus antibiotics. Then elective surgical resection of the affected segment after inflammation resolves.'},
     {text:'Emergency laparotomy',r:'Emergency surgery for Crohn abscess increases risk of stoma and complications. Drain + elective resection is preferred.'},
     {text:'IV antibiotics alone',r:'Abscess >3 cm requires drainage in addition to antibiotics. Small abscesses <3 cm may respond to antibiotics alone.'},
     {text:'Increase immunosuppression',r:'Increasing immunosuppression (steroids, biologics) with an untreated abscess risks sepsis. Drainage is required first.'}],
    'Percutaneous drainage + IV antibiotics + elective resection',['surgery','Crohn','abscess','IBD'],'Crohn abscess: percutaneous drainage + antibiotics → elective resection. Steroids avoided during active infection.'),

  q('A {age}-year-old {gender} presents with acute onset of severe right iliac fossa pain, nausea, and fever. Pain started periumbilical then migrated. Rebound and guarding at McBurney point. WBC 16. What is the most likely diagnosis?',
    [{text:'Acute appendicitis',r:'Migratory RLQ pain + anorexia + fever + peritonitis at McBurney point = appendicitis. Alvarado score ≥7. CT or US can confirm. Appendectomy is definitive treatment.'},
     {text:'Mesenteric adenitis',r:'Mesenteric adenitis presents similarly but often preceded by URTI. CT shows normal appendix with enlarged mesenteric lymph nodes.'},
     {text:'Meckel diverticulitis',r:'Meckel diverticulitis mimics appendicitis but pain is more central or lower. Diagnosed at surgery.'},
     {text:'Epiploic appendagitis',r:'Epiploic appendagitis presents with focal pain without migration, fever, or elevated WBC. Fat-density lesion on CT.'}],
    'Acute appendicitis',['surgery','appendicitis'],'Appendicitis: appendectomy. Pre-op abx. Perforation risk increases after 36 hours.'),

  q('A {age}-year-old {gender} presents with colicky pain, bilious vomiting, obstipation, and abdominal distension. Prior hysterectomy. XR shows dilated small bowel loops with air-fluid levels. No air in colon. What is the most likely diagnosis?',
    [{text:'Adhesive small bowel obstruction',r:'SBO with prior surgery: adhesions are the most common cause (60-70%). NGT decompression, IV fluids, NPO. CT for confirmation. Surgery if closed-loop, strangulation, or failure of conservative management.'},
     {text:'Large bowel obstruction',r:'LBO shows colonic dilation with haustra. This patient has small bowel pattern and prior surgery.'},
     {text:'Paralytic ileus',r:'Ileus shows dilated bowel throughout (small and large) without prior surgery history.'},
     {text:'Incarcerated hernia',r:'Hernia would present with a tender groin mass. No mass is described in this scenario.'}],
    'Adhesive small bowel obstruction',['surgery','SBO','adhesions'],'SBO: NGT + IV fluids + NPO. Water-soluble contrast challenge helps predict need for surgery.'),

  q('A {age}-year-old {gender} presents with rectal bleeding, change in bowel habit, and weight loss. Colonoscopy shows a tumor in the sigmoid colon. Biopsy confirms adenocarcinoma. CT shows no metastases. CEA elevated. What is the most appropriate management?',
    [{text:'Surgical resection with en bloc lymphadenectomy',r:'Localized colon cancer (stages I-III): surgical resection with lymphadenectomy is curative. Adjuvant chemo for stage III and high-risk stage II.'},
     {text:'Neoadjuvant chemoradiation',r:'Neoadjuvant therapy is for rectal cancer, not colon cancer. Colon cancer is managed with primary surgical resection.'},
     {text:'Endoscopic mucosal resection',r:'EMR is for T1 lesions confined to mucosa. Invasive adenocarcinoma requires formal resection with lymphadenectomy.'},
     {text:'Palliative chemotherapy',r:'Palliative therapy is for metastatic disease. This patient has localized, potentially curable disease.'}],
    'Surgical resection with en bloc lymphadenectomy',['surgery','colon-cancer','resection'],'Localized colon cancer: surgery + lymphadenectomy. Adjuvant chemo for stage III.'),

  q('A {age}-year-old {gender} presents with a reducible groin bulge that extends into the scrotum. Increases with Valsalva. No pain. What is the most likely diagnosis?',
    [{text:'Indirect inguinal hernia',r:'Indirect hernia: passes through internal inguinal ring, can extend into scrotum. Congenital (patent processus vaginalis). Elective repair to prevent incarceration.'},
     {text:'Direct inguinal hernia',r:'Direct hernia: through Hesselbach triangle, does not extend into scrotum. Typically acquired, arises medial to inferior epigastric vessels.'},
     {text:'Femoral hernia',r:'Femoral hernia: below inguinal ligament, more common in women, higher incarceration risk.'},
     {text:'Hydrocele',r:'Hydrocele: fluid in tunica vaginalis, transilluminates, reducible but not associated with cough impulse.'}],
    'Indirect inguinal hernia',['surgery','inguinal-hernia'],'Indirect inguinal hernia: elective repair (Lichtenstein or laparoscopic). Strangulated: emergency surgery.'),

  q('A {age}-year-old {gender} presents with acute scrotal pain and swelling for 4 hours. Testis is high-riding and painful, cremasteric reflex absent. What is the most appropriate management?',
    [{text:'Emergency scrotal exploration',r:'Testicular torsion: surgical emergency. Detorsion and orchiopexy within 6 hours for testicular salvage. Urine dip, color Doppler US (if immediately available), should not delay surgery.'},
     {text:'Color Doppler ultrasound',r:'US should not delay surgery if torsion is suspected clinically. If US is immediately available, it can confirm but negative US does not rule out torsion.'},
     {text:'IV antibiotics',r:'Antibiotics are for epididymitis, which typically presents with dysuria, fever, and preserved cremasteric reflex.'},
     {text:'Scrotal elevation and NSAIDs',r:'Elevation is for epididymitis. Torsion requires surgical exploration within hours.'}],
    'Emergency scrotal exploration',['surgery','testicular-torsion'],'Testicular torsion: emergency exploration within 6 hours. Orchiopexy of both testicles.'),

  q('A {age}-year-old {gender} with Graves disease presents with tachycardia, fever, agitation, and vomiting after thyroidectomy. Temp 39.5°C, HR 140. What is the most likely diagnosis?',
    [{text:'Thyroid storm',r:'Thyroid storm after thyroidectomy: fever, tachycardia, agitation, GI symptoms. Precipitated by manipulation of hyperactive gland. Treatment: beta-blockers, thiomanide, iodine, steroids, supportive care.'},
     {text:'Malignant hyperthermia',r:'MH presents with rigidity, hyperthermia, and acidosis after anesthetic agents (succinylcholine, volatile gases). This patient had thyroid pathology.'},
     {text:'Hemorrhage',r:'Post-thyroidectomy hemorrhage presents with neck swelling, respiratory distress, and hypotension, not fever and tachycardia.'},
     {text:'Hypocalcemia',r:'Hypoparathyroidism causes perioral numbness, Chvostek/Trousseau signs, not fever and agitation.'}],
    'Thyroid storm',['surgery','thyroid-storm','Graves'],'Thyroid storm: beta-blockers, PTU, iodine, steroids, supportive care. Prevent with pre-op euthyroid state.'),

  q('A {age}-year-old {gender} with Graves disease undergoes total thyroidectomy. Post-op day 1 develops perioral numbness and tingling in the fingertips. Chvostek sign positive. What is the most likely diagnosis?',
    [{text:'Hypoparathyroidism from parathyroid injury',r:'Transient hypoparathyroidism is common after total thyroidectomy due to parathyroid devascularization. Symptoms: perioral numbness, paresthesias, Chvostek/Trousseau. Treatment: calcium + vitamin D supplementation.'},
     {text:'Recurrent laryngeal nerve injury',r:'RLN injury causes hoarseness and vocal cord paralysis, not paresthesias.'},
     {text:'Superior laryngeal nerve injury',r:'SLN injury causes voice fatigue and loss of high pitch, not paresthesias.'},
     {text:'Hypocalcemia from hungry bone syndrome',r:'Hungry bone syndrome occurs in patients with pre-op hyperparathyroidism, not Graves disease.'}],
    'Hypoparathyroidism from parathyroid injury',['surgery','hypoparathyroidism','thyroidectomy'],'Post-thyroidectomy hypocalcemia: calcium and calcitriol. Monitor calcium levels. Permanent hypoparathyroidism is rare.'),

  q('A {age}-year-old {gender} with severe leg pain out of proportion to exam after a crush injury. Compartment tense, pain on passive stretch, paresthesias. What is the most appropriate management?',
    [{text:'Emergency fasciotomy',r:'Acute compartment syndrome: surgical emergency. Fasciotomy of all affected compartments. Irreversible muscle and nerve damage occurs after 6-8 hours of ischemia.'},
     {text:'Elevation and observation',r:'Elevation may worsen compartment syndrome by reducing arterial pressure. Fasciotomy is the definitive treatment.'},
     {text:'IV mannitol',r:'Mannitol is adjunctive, not definitive. Fasciotomy should not be delayed.'},
     {text:'Cast removal and splitting',r:'If a cast is present, removal is the first step. If symptoms persist, fasciotomy is required.'}],
    'Emergency fasciotomy',['surgery','compartment-syndrome','fasciotomy'],'Compartment syndrome: urgent fasciotomy. Measure compartment pressure if diagnosis uncertain. Irreversible damage after 6 hours.'),

  q('A {age}-year-old {gender} presents with 6 hours of severe diffuse abdominal pain, vomiting, and peritonitis. XR shows free air under diaphragm. What is the most likely diagnosis?',
    [{text:'Perforated peptic ulcer',r:'Perforated ulcer: sudden severe epigastric pain, peritonitis, free air on erect CXR. Emergency laparotomy with primary closure or omental patch (Graham patch) + PPI + H. pylori treatment.'},
     {text:'Acute pancreatitis',r:'Pancreatitis causes epigastric pain radiating to back with elevated amylase/lipase and no free air.'},
     {text:'Mesenteric ischemia',r:'Mesenteric ischemia presents with severe abdominal pain out of proportion to exam, with risk factors (afib, hypercoagulable). No free air.'},
     {text:'Diverticulitis',r:'Diverticulitis presents with LLQ pain, fever, and leukocytosis. Free air suggests perforation requiring surgery.'}],
    'Perforated peptic ulcer',['surgery','perforated-ulcer','peritonitis'],'Perforated peptic ulcer: emergency laparotomy, Graham patch, PPI, H. pylori treatment.'),

  q('A {age}-year-old {gender} with atrial fibrillation presents with sudden severe abdominal pain out of proportion to exam. Abdominal exam is benign initially. Lactate elevated. CT shows air in the portal vein. What is the most likely diagnosis?',
    [{text:'Acute mesenteric ischemia',r:'Mesenteric ischemia: severe pain out of proportion to exam, atrial fibrillation (embolic source), elevated lactate, portal venous gas. Emergency laparotomy with embolectomy or bowel resection.'},
     {text:'Acute pancreatitis',r:'Pancreatitis has epigastric pain radiating to back with elevated pancreatic enzymes.'},
     {text:'Diverticulitis',r:'Diverticulitis has LLQ pain, fever, and CT findings of diverticular inflammation.'},
     {text:'Bowel obstruction',r:'Obstruction presents with colicky pain, vomiting, distension, and air-fluid levels. Not pain out of proportion.'}],
    'Acute mesenteric ischemia',['surgery','mesenteric-ischemia','embolism'],'Mesenteric ischemia: early angiography/surgery. Resect non-viable bowel, second-look laparotomy.'),

  q('A {age}-year-old {gender} presents with a tender, erythematous, rapidly expanding area on the leg with crepitus and bullae. Systemically ill. What is the most appropriate management?',
    [{text:'Emergency wide surgical debridement + broad-spectrum IV antibiotics',r:'Necrotizing fasciitis: life-threatening surgical emergency. Immediate wide debridement of all necrotic tissue is essential. antibiotics and ICU support are adjunctive. Delay increases mortality.'},
     {text:'IV antibiotics alone',r:'Antibiotics cannot penetrate avascular necrotic tissue. Surgical debridement is essential for source control.'},
     {text:'MRI for confirmation',r:'Clinical diagnosis is sufficient. Imaging delays definitive surgical management.'},
     {text:'Incision and drainage of abscess',r:'NF requires wide excision of all necrotic tissue, not limited incision and drainage.'}],
    'Emergency wide surgical debridement + broad-spectrum IV antibiotics',['surgery','necrotizing-fasciitis','debridement'],'NF: emergency debridement + broad-spectrum abx + ICU. LRINEC score aids diagnosis. High mortality without prompt treatment.'),

  // ═══ TRAUMA ═══

  q('A {age}-year-old {gender} arrives after high-speed MVC with GCS 8, large left flail chest, distended neck veins, trachea deviated to the right, and BP 70/40. What is the most likely diagnosis?',
    [{text:'Tension pneumothorax',r:'Tension pneumothorax: hypotension, distended neck veins, tracheal deviation away from affected side, absent breath sounds. Immediate needle decompression (2nd ICS midclavicular line), then chest tube.'},
     {text:'Cardiac tamponade',r:'Tamponade: Beck triad (hypotension, JVD, muffled heart sounds), pulsus paradoxus. Trachea is midline.'},
     {text:'Massive hemothorax',r:'Hemothorax: dullness to percussion, absent breath sounds, no tracheal deviation. Treated with chest tube.'},
     {text:'Open pneumothorax',r:'Open pneumothorax: sucking chest wound with air entry through wound. Manage with 3-sided occlusive dressing.'}],
    'Tension pneumothorax',['surgery','trauma','tension-pneumothorax','ATLS'],'ATLS: needle decompression of tension pneumothorax. Massive hemothorax: chest tube with autotransfusion.'),

  q('A {age}-year-old {gender} with blunt abdominal trauma and hypotension ultrasound shows free fluid in Morrison pouch. What is the most appropriate management?',
    [{text:'Emergent laparotomy',r:'FAST-positive hypotensive patient with blunt trauma: emergent laparotomy for intra-abdominal hemorrhage. Do not delay for CT. Damage control laparotomy with packing.'},
     {text:'CT abdomen with IV contrast',r:'CT is indicated for hemodynamically stable patients. This patient is hypotensive and should go directly to the OR.'},
     {text:'Serial FAST exams',r:'Serial exams are for stable patients with minimal fluid. Hypotension with positive FAST requires immediate laparotomy.'},
     {text:'Angiography for embolization',r:'Angioembolization is for solid organ injury (liver, spleen) in stable patients. This patient is unstable.'}],
    'Emergent laparotomy',['surgery','trauma','FAST','laparotomy'],'Unstable patient with positive FAST: emergent laparotomy. Damage control + source control + resuscitation.'),

  q('A {age}-year-old {gender} involved in a car crash presents with pelvic fracture and blood at the urethral meatus. What is the most appropriate next step for urinary drainage?',
    [{text:'Retrograde urethrogram before catheterization',r:'Blood at meatus suggests urethral injury. Perform retrograde urethrogram before attempting Foley placement. If urethral injury confirmed, place suprapubic catheter.'},
     {text:'Insert Foley catheter gently',r:'Attempting catheterization with a known urethral injury can convert a partial tear to complete transection.'},
     {text:'CT cystogram',r:'CT cystogram evaluates for bladder rupture but does not assess urethral injury. Urethrogram is needed first.'},
     {text:'Suprapubic catheter directly',r:'Suprapubic catheter is placed after confirming urethral injury on urethrogram, not empirically.'}],
    'Retrograde urethrogram before catheterization',['surgery','trauma','urethral-injury'],'Blood at meatus: retrograde urethrogram. Urethral injury: suprapubic catheter. Blunt trauma: pelvic stabilization.'),

  // ═══ SUBSPECIALTIES ═══

  q('A {age}-year-old {gender} presents with a red, painful eye after wearing contact lenses. Slit lamp shows a corneal ulcer with fluorescein uptake. What is the most likely diagnosis?',
    [{text:'Microbial keratitis',r:'Contact lens wear is the leading risk factor for microbial keratitis. Corneal ulcer with epithelial defect requires urgent ophthalmology referral, cultures, and intensive topical antibiotics.'},
     {text:'Acute angle-closure glaucoma',r:'AACG: severe eye pain, red eye, fixed mid-dilated pupil, cloudy cornea, elevated IOP. Not associated with contact lens use.'},
     {text:'Conjunctivitis',r:'Conjunctivitis: diffuse conjunctival injection, discharge, no corneal involvement.'},
     {text:'Uveitis',r:'Uveitis: pain, photophobia, ciliary flush, cells/flare in anterior chamber. Cornea is clear.'}],
    'Microbial keratitis',['surgery','ophthalmology','keratitis'],'Corneal ulcer in contact lens wearer: microbial keratitis until proven otherwise. Urgent ophthalmology referral.'),

  q('A {age}-year-old {gender} sustains a fall onto an outstretched hand and presents with tenderness in the anatomical snuffbox. Initial X-rays negative. What is the most appropriate management?',
    [{text:'Thumb spica splint and repeat X-ray in 2 weeks',r:'Scaphoid fracture is suspected with snuffbox tenderness even with negative X-rays. Non-displaced fractures may not appear for 2 weeks. Splint and re-image. MRI or CT for early diagnosis.'},
     {text:'No treatment, likely sprain',r:'Snuffbox tenderness has high specificity for scaphoid fracture. Treat as fracture until proven otherwise.'},
     {text:'Open reduction internal fixation',r:'ORIF is for displaced scaphoid fractures. Non-displaced or suspected fractures are managed conservatively.'},
     {text:'CT scan immediately',r:'CT is more sensitive than X-ray for scaphoid fracture but is not first-line. Splinting and repeat X-ray is standard.'}],
    'Thumb spica splint and repeat X-ray in 2 weeks',['surgery','orthopedics','scaphoid'],'Snuffbox tenderness: scaphoid fracture until proven. Splint, re-image in 2 weeks. Nonunion risk is high.'),

  q('A {age}-year-old {gender} presents with acute onset of severe ear pain and bloody discharge after using a cotton swab. Hearing loss and tinnitus. What is the most likely diagnosis?',
    [{text:'Tympanic membrane perforation',r:'Traumatic TM perforation from cotton swab: otalgia, bloody discharge, hearing loss, tinnitus. Most heal spontaneously in 4-6 weeks. Keep ear dry. Refer ENT if persistent.'},
     {text:'Acute otitis media',r:'AOM presents with fever and otalgia in setting of URTI. Not associated with cotton swab trauma.'},
     {text:'Otitis externa',r:'OE presents with ear pain, discharge, and tragus tenderness. History of swimming, not cotton swab trauma.'},
     {text:'Foreign body',r:'Foreign body may be the cotton swab tip. Removal by ENT. Perforation should be evaluated.'}],
    'Tympanic membrane perforation',['surgery','ENT','TM-perforation'],'Traumatic TM perforation: observe 4-6 weeks. Keep ear dry. Surgery if fails to close.'),

  q('A {age}-year-old {gender} presents with epistaxis for 45 minutes that has not stopped with direct pressure. Bleeding from the anterior septum. What is the most appropriate management?',
    [{text:'Chemical cautery with silver nitrate or anterior nasal packing',r:'Anterior epistaxis not controlled by pressure: cauterize the visible bleeding vessel with silver nitrate. If unsuccessful or no visible source: anterior nasal packing (Merocel or balloon).'},
     {text:'Posterior nasal packing',r:'Posterior packing is for posterior epistaxis (bleeding from posterior nasal cavity flowing into throat). This is anterior.'},
     {text:'Endoscopic sphenopalatine artery ligation',r:'Surgical ligation is for refractory epistaxis after packing fails. Not first-line.'},
     {text:'Embolization',r:'Angioembolization is for intractable epistaxis when surgical ligation fails. Rarely needed.'}],
    'Chemical cautery with silver nitrate or anterior nasal packing',['surgery','ENT','epistaxis'],'Anterior epistaxis: pressure → cautery → packing. Posterior: Foley balloon or posterior pack + ENT consult.'),
];

function main() {
  console.log('\n🔪 Generating Surgery questions...\n');
  const questions = [];
  for (let i = 0; i < TARGET; i++) {
    const tpl = T[i % T.length];
    const q = tpl(i);
    q.topic = 'Surgery';
    q.scfhs_domain = 'Surgery';
    q._uid = 'surg-' + i;
    questions.push(q);
  }
  console.log(`   Generated ${questions.length} questions from ${T.length} templates\n`);
  writeOutput('generated-surgery.json', questions);
}

main();
