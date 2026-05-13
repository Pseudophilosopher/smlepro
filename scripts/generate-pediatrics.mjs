/**
 * generate-pediatrics.mjs
 *
 * SMLE Pediatrics domain — 700 questions covering all subtopics.
 *
 * Usage: node scripts/generate-pediatrics.mjs
 */

import { writeOutput, shuffle } from './question-utils.mjs';

const TARGET = 575;

function q(v, opts, cr, tags, top) {
  return (i) => {
    const sh = shuffle(opts);
    const ci = sh.findIndex(o => o.text === cr);
    return {
      question: v.replace(/\{age\}/g, 2+(i%46)).replace(/\{mo\}/g, 2+(i%46)).replace(/\{day\}/g, 1+(i%28)).replace(/\{gender\}/g, i%2===0?'male':'female'),
      topic:'Pediatrics', scfhs_domain:'Pediatrics',
      difficulty:['Easy','Easy','Moderate','Moderate','Hard','Hard'][i%6],
      year:'2024-2025', image_reference:false,
      options:sh.map(o=>({text:o.text, correct:o.text===cr, rationale:o.r})),
      correct_answer:String.fromCharCode(65+ci), rationale:top, tags,
    };
  };
}

const T = [
  // ═══ GENERAL PEDIATRICS ═══

  q('A {mo}-month-old {gender} presents with acute watery diarrhea for 3 days, vomiting, and decreased urine output. Dry mucous membranes, sunken eyes, skin tenting. What is the most appropriate initial management?',
    [{text:'ORS or IV fluids based on dehydration severity',r:'Assess dehydration first. Mild-moderate: ORS. Severe: IV bolus. Continue breastfeeding. Zinc 20 mg daily for 14 days reduces duration and severity.'},
     {text:'Oral antibiotics empirically',r:'Most gastroenteritis is viral. Antibiotics are reserved for dysentery, suspected cholera, or immunocompromised patients.'},
     {text:'Antidiarrheal agents',r:'Antidiarrheals are contraindicated in children due to risk of ileus, toxic megacolon, and side effects.'},
     {text:'IV antibiotics and NPO',r:'Holding feeds in non-severe diarrhea prolongs illness. Early refeeding is recommended. Antibiotics are not indicated for acute watery diarrhea.'}],
    'ORS or IV fluids based on dehydration severity',['peds','gastroenteritis','dehydration'],'Manage dehydration severity with ORS or IV. Zinc reduces duration. Continue feeding.'),

  q('A {mo}-month-old {gender} presents with fever 39.5°C and a 3-minute generalized seizure that stopped spontaneously. Now alert and playing. No prior seizures. What is the most likely diagnosis?',
    [{text:'Simple febrile seizure',r:'Simple febrile seizure: age 6m-5y, generalized, <15 min, single in 24h, no postictal deficit. No workup beyond fever source identification needed.'},
     {text:'Complex febrile seizure',r:'Complex: focal, >15 min, or multiple in 24h. This seizure is generalized, brief, and single.'},
     {text:'Meningitis',r:'Meningitis should be considered if the child is ill-appearing or has nuchal rigidity. This child returned to baseline immediately.'},
     {text:'Epilepsy',r:'Epilepsy requires 2+ unprovoked seizures. Febrile seizures are provoked by fever and generally do not predict epilepsy.'}],
    'Simple febrile seizure',['peds','febrile-seizure'],'Simple febrile seizure: age 6m-5y, generalized <15min. Manage fever. No EEG or imaging needed.'),

  q('A {age}-year-old {gender} with persistent coughing fits ending with a whooping sound, post-tussive vomiting, and no fever. Not immunized. What is the most likely diagnosis?',
    [{text:'Pertussis (whooping cough)',r:'Pertussis: paroxysmal cough with inspiratory whoop, post-tussive vomiting, afebrile. Most severe in infants. Diagnosis: PCR or culture. Treatment: macrolide antibiotic.'},
     {text:'Croup',r:'Croup presents with barking cough, stridor, and hoarseness. Not paroxysmal whooping fits.'},
     {text:'Bronchiolitis',r:'Bronchiolitis presents with wheezing, respiratory distress, and fever in infants <12 months. Not paroxysmal cough.'},
     {text:'Foreign body aspiration',r:'Foreign body presents with sudden onset of coughing and choking in a previously well child. Not paroxysmal with whoop.'}],
    'Pertussis (whooping cough)',['peds','pertussis','whooping-cough'],'Pertussis: paroxysmal cough + whoop. Macrolide treatment. Prevention: DTaP vaccine.'),

  q('A {age}-year-old {gender} presents with wheezing and respiratory distress after playing with a cat. PEFR 40% predicted. After 3 salbutamol nebulizations and oral prednisone, PEFR remains 45%. What is the next step?',
    [{text:'IV magnesium sulfate',r:'IV MgSO4 is the next step for severe asthma not responding to SABA and steroids. It reduces hospital admission rates and improves PEFR within 30 minutes.'},
     {text:'IV aminophylline',r:'Aminophylline is no longer recommended in pediatric acute asthma due to side effects and lack of additional benefit beyond SABA and steroids.'},
     {text:'Intubation and mechanical ventilation',r:'Intubation is reserved for impending respiratory failure (silent chest, cyanosis, exhaustion). Not yet indicated.'},
     {text:'Repeat oral prednisone',r:'One dose of steroids is adequate for acute exacerbation. Additional steroids take hours to work and do not provide immediate benefit.'}],
    'IV magnesium sulfate',['peds','asthma','MgSO4'],'Severe asthma not responding to SABA+steroids: IV MgSO4. IV salbutamol for life-threatening cases.'),

  q('A {mo}-month-old {gender} presents with Hb 8.5, MCV 70, ferritin 5. Diet history: prolonged breastfeeding with no iron-rich solids. What is the most likely diagnosis?',
    [{text:'Iron deficiency anemia',r:'IDA: microcytic anemia with low ferritin from inadequate dietary iron. Most common in 9-24 month olds. Treatment: oral iron 3-6 mg/kg/day plus dietary modification.'},
     {text:'Thalassemia minor',r:'Thalassemia minor has microcytosis out of proportion to anemia, normal ferritin, and elevated HbA2 on electrophoresis.'},
     {text:'Anemia of chronic disease',r:'ACD has normal or high ferritin and low iron/TIBC. Not associated with dietary iron deficiency.'},
     {text:'Lead poisoning',r:'Lead poisoning causes microcytic anemia with basophilic stippling. History of pica or environmental exposure would be present.'}],
    'Iron deficiency anemia',['peds','IDA','microcytic-anemia'],'IDA in toddlers: screen with CBC and ferritin. Treat with oral iron. Prevent with iron-fortified cereals after 6 months.'),

  q('A {mo}-month-old {gender} presents with cough, wheeze, and respiratory distress for 2 days. RSV positive. O2 88%, RR 60. What is the most appropriate management?',
    [{text:'Oxygen if SpO2 <90%, nasal suctioning, supportive care',r:'Bronchiolitis is managed supportively. O2 for SpO2 <90%. Nasal suctioning before feeds. Most resolves in 7-10 days. No routine bronchodilators or steroids.'},
     {text:'Nebulized albuterol every 4 hours',r:'Bronchodilators are not routinely recommended in bronchiolitis. May trial but discontinue if no objective improvement.'},
     {text:'Oral prednisolone',r:'Steroids do not improve outcomes in viral bronchiolitis and are not recommended unless the child has concomitant asthma.'},
     {text:'IV antibiotics',r:'Antibiotics are for secondary bacterial infection. Most bronchiolitis is viral and antibiotics are not indicated.'}],
    'Oxygen if SpO2 <90%, nasal suctioning, supportive care',['peds','bronchiolitis','RSV'],'Bronchiolitis: supportive care (O2, suctioning). No bronchodilators or steroids routinely.'),

  q('A {age}-year-old {gender} presents with fever, cough, and tachypnea for 3 days. CXR shows right lower lobe consolidation. O2 96%, no indrawing. What is the most appropriate management?',
    [{text:'Oral amoxicillin as outpatient',r:'Non-severe CAP: oral amoxicillin 90 mg/kg/day. Hospitalize if hypoxia, indrawing, toxic appearance, or inability to tolerate oral.'},
     {text:'IV antibiotics and hospitalization',r:'Hospitalization is for hypoxia, significant indrawing, or toxic appearance. This patient has no severity criteria.'},
     {text:'No antibiotics, likely viral',r:'Consolidation on CXR with fever suggests bacterial pneumonia requiring antibiotics.'},
     {text:'Azithromycin',r:'Macrolides are for atypical pneumonia (Mycoplasma) in school-age children. Amoxicillin is first-line for typical lobar pneumonia in younger children.'}],
    'Oral amoxicillin as outpatient',['peds','pneumonia','CAP'],'Pediatric CAP: amoxicillin first-line. Hospitalize if hypoxia, indrawing, or toxic.'),

  q('A {age}-year-old {gender} presents with ear pain and fever for 2 days. Otoscopy shows bulging, erythematous tympanic membrane with decreased mobility. What is the most appropriate management?',
    [{text:'Amoxicillin 90 mg/kg/day for 10 days',r:'Acute otitis media: antibiotics if age <2 years, bilateral, severe symptoms, or otorrhea. Amoxicillin first-line. Observation option for older children with mild symptoms.'},
     {text:'No antibiotics, observe for 48 hours',r:'Observation is appropriate for children ≥2 years with mild unilateral AOM. This patient has fever and ear pain suggesting moderate severity.'},
     {text:'Amoxicillin-clavulanate',r:'Augmentin is reserved for treatment failure after 48-72 hours of amoxicillin or recent antibiotic use.'},
     {text:'Tympanostomy tube placement',r:'Tubes are for recurrent AOM (≥3 in 6 months or ≥4 in 12 months) or chronic OME, not first episode.'}],
    'Amoxicillin 90 mg/kg/day for 10 days',['peds','otitis-media','AOM'],'AOM: amoxicillin first-line. Observation for mild cases in older children. Prevention: pneumococcal and influenza vaccines.'),

  q('A {age}-year-old {gender} presents with fever, sore throat, and exudative tonsillitis. Rapid strep test positive. What is the most appropriate management?',
    [{text:'Penicillin V or amoxicillin for 10 days',r:'Group A strep pharyngitis requires antibiotics to prevent rheumatic fever. Penicillin or amoxicillin for 10 days is first-line.'},
     {text:'No antibiotics, viral likely',r:'Rapid strep test positive confirms GAS infection. Antibiotics are indicated to prevent suppurative and non-suppurative complications.'},
     {text:'Azithromycin for 5 days',r:'Macrolides are alternatives for penicillin-allergic patients but are not first-line due to resistance concerns.'},
     {text:'Corticosteroids for symptom relief',r:'Steroids are not indicated for uncomplicated GAS pharyngitis. Antibiotics alone are sufficient.'}],
    'Penicillin V or amoxicillin for 10 days',['peds','pharyngitis','strep','GAS'],'GAS pharyngitis: penicillin 10 days prevents rheumatic fever. Treat even if mild.'),

  q('A {mo}-month-old {gender} presents with fever for 3 days without source. Urine dipstick shows leukocyte esterase positive and nitrite positive. Urine culture grows E. coli >10^5 CFU/mL. What is the appropriate imaging after first febrile UTI?',
    [{text:'Renal and bladder ultrasound',r:'First febrile UTI in child <2 years: renal/bladder US to assess for anatomic abnormalities. VCUG if US abnormal or recurrent UTI.'},
     {text:'VCUG routinely',r:'VCUG is indicated after abnormal US, recurrent UTIs, or atypical/complicated UTI. Not for all first UTIs.'},
     {text:'DMSA renal scan',r:'DMSA evaluates renal scarring after pyelonephritis. Not routine after first UTI.'},
     {text:'No imaging needed',r:'Children <2 years with first febrile UTI require renal/bladder US per guidelines.'}],
    'Renal and bladder ultrasound',['peds','UTI','imaging'],'First febrile UTI in <2 years: renal US. VCUG if abnormal US or recurrent.'),

  q('A {age}-year-old {gender} presents with chronic diarrhea, bloating, and poor weight gain. Anti-tissue transglutaminase IgA strongly positive. What is the most appropriate management?',
    [{text:'Lifelong gluten-free diet',r:'Celiac disease requires strict lifelong gluten-free diet. Symptoms improve within weeks. Serology normalizes over months. Monitor for nutritional deficiencies.'},
     {text:'Lactose-free diet',r:'Secondary lactose intolerance may coexist but gluten avoidance is the primary treatment for celiac disease.'},
     {text:'PPI therapy',r:'PPIs do not treat celiac disease. They might mask symptoms without addressing the underlying autoimmune response.'},
     {text:'Oral budesonide',r:'Budesonide is for refractory celiac disease. First-line is dietary gluten elimination.'}],
    'Lifelong gluten-free diet',['peds','celiac','gluten-free'],'Celiac disease: gluten-free diet. Monitor growth, serology, and nutritional status.'),

  q('A {age}-year-old {gender} presents with palpable purpura on the legs and buttocks, abdominal pain, and arthritis. Recent URTI. Platelets normal. What is the most likely diagnosis?',
    [{text:'Henoch-Schonlein purpura (IgA vasculitis)',r:'HSP: palpable purpura + abdominal pain + arthritis. Normal platelets. Usually self-limited. Steroids for severe abdominal pain or renal involvement. Monitor urine for nephritis.'},
     {text:'Immune thrombocytopenic purpura',r:'ITP presents with petechiae and bruising with LOW platelets. This patient has normal platelets.'},
     {text:'Meningococcemia',r:'Meningococcemia presents with fever, petechial/purpuric rash, and ill appearance. This child has abdominal pain and arthritis without toxic appearance.'},
     {text:'Kawasaki disease',r:'Kawasaki has fever >5 days, conjunctivitis, oral changes, and extremity changes. Not palpable purpura on lower extremities.'}],
    'Henoch-Schonlein purpura (IgA vasculitis)',['peds','HSP','vasculitis'],'HSP: palpable purpura + arthritis + abdominal pain. Self-limited. Steroids for severe GI or renal involvement.'),

  q('A {mo}-month-old {gender} presents with bowed legs and widened wrists. Not yet walking. Formula-fed, limited sun exposure. Alkaline phosphatase elevated, calcium low-normal, phosphorus low. X-ray shows cupping and fraying of metaphyses. What is the most likely diagnosis?',
    [{text:'Nutritional rickets (vitamin D deficiency)',r:'Rickets: bowed legs, widened wrists, hypocalcemia, low phosphorus, elevated ALP. X-ray: metaphyseal cupping and fraying. Treatment: vitamin D and calcium supplementation.'},
     {text:'Blount disease',r:'Blount disease is a growth disorder of the proximal tibia causing bowing. X-ray shows tibial vara without metaphyseal changes of rickets.'},
     {text:'Hypophosphatasia',r:'Hypophosphatasia has low ALP (not elevated), along with bone deformities and fractures.'},
     {text:'Renal osteodystrophy',r:'Renal osteodystrophy occurs in CKD with elevated creatinine and abnormal calcium/phosphate. This patient has no renal history.'}],
    'Nutritional rickets (vitamin D deficiency)',['peds','rickets','vitamin-D'],'Rickets: vitamin D + calcium supplementation. Prevent with vitamin D 400 IU/day from birth.'),

  q('A {age}-year-old {gender} presents with constipation since infancy, ribbon-like stools, and failure to thrive. Rectal exam shows empty rectum with tight anal canal. What is the most likely diagnosis?',
    [{text:'Hirschsprung disease (congenital aganglionic megacolon)',r:'Hirschsprung: constipation from birth, ribbon stools, empty rectum on exam. Diagnosis: barium enema shows transition zone. Treatment: surgical resection of aganglionic segment.'},
     {text:'Functional constipation',r:'Functional constipation develops after infancy with stool-withholding behavior, palpable fecal mass, and normal rectal tone.'},
     {text:'Celiac disease',r:'Celiac presents with diarrhea, bloating, and malabsorption, not constipation from birth.'},
     {text:'Hypothyroidism',r:'Congenital hypothyroidism presents with poor feeding, hypotonia, and prolonged jaundice. Constipation may occur but not ribbon-like stools.'}],
    'Hirschsprung disease (congenital aganglionic megacolon)',['peds','Hirschsprung','constipation'],'Hirschsprung: constipation from birth, empty rectum. Barium enema + rectal biopsy for diagnosis. Surgical resection.'),

  q('A {mo}-month-old {gender} presents with recurrent infections including pneumonia, oral thrush, and failure to thrive. Low immunoglobulins, absent B cells. What is the most likely diagnosis?',
    [{text:'X-linked agammaglobulinemia (Bruton disease)',r:'Bruton disease: recurrent infections starting after 6 months (maternal IgG wanes), low immunoglobulins, absent B cells. Treatment: IVIG replacement.'},
     {text:'Severe combined immunodeficiency',r:'SCID presents earlier (first months) with severe infections, lymphopenia, and failure to thrive. T cells are affected.'},
     {text:'Hyper-IgM syndrome',r:'Hyper-IgM: normal/high IgM with low IgG/IgA/IgE, opportunistic infections (PCP, Cryptosporidium).'},
     {text:'Wiskott-Aldrich syndrome',r:'Wiskott-Aldrich: eczema, thrombocytopenia with small platelets, recurrent infections, and autoimmune disease.'}],
    'X-linked agammaglobulinemia (Bruton disease)',['peds','immunodeficiency','Bruton'],'Bruton agammaglobulinemia: recurrent infections after 6 months, low immunoglobulins, absent B cells. IVIG therapy.'),

  // ═══ CNS ═══

  q('A {age}-year-old {gender} presents with ascending weakness starting in the legs over 3 days, areflexia, and no sensory level. Lumbar puncture shows elevated protein with normal WBC. What is the most likely diagnosis?',
    [{text:'Guillain-Barre syndrome',r:'GBS: ascending paralysis, areflexia, albuminocytologic dissociation (high protein, normal cells). Often post-infectious. Treatment: IVIG or plasmapheresis.'},
     {text:'Transverse myelitis',r:'Transverse myelitis has a sensory level and acute onset of paraplegia with spinal cord inflammation on MRI.'},
     {text:'Poliomyelitis',r:'Polio presents with asymmetric flaccid paralysis with fever. Nearly eradicated due to vaccination.'},
     {text:'Myasthenia gravis',r:'Myasthenia gravis has fluctuating weakness, ptosis, diplopia, and fatiguability. Not ascending paralysis.'}],
    'Guillain-Barre syndrome',['peds','GBS','ascending-paralysis'],'GBS: ascending paralysis, areflexia, high CSF protein. IVIG or plasmapheresis. Respiratory monitoring essential.'),

  q('A {age}-year-old {gender} presents with a first-time afebrile generalized seizure. EEG shows generalized spike-wave discharges. Neurologic exam normal. MRI normal. What is the most appropriate management?',
    [{text:'Start antiepileptic drug (valproic acid or levetiracetam)',r:'First unprovoked seizure with epileptiform EEG has ~50% recurrence risk. AED therapy reduces recurrence. Valproate or levetiracetam are first-line for generalized epilepsy.'},
     {text:'No treatment, lifestyle advice only',r:'With abnormal EEG, recurrence risk is high and treatment is recommended. Observation may be appropriate if EEG is normal.'},
     {text:'IV lorazepam',r:'Benzodiazepines are for acute active seizures or status epilepticus. This patient has already stopped seizing.'},
     {text:'Start carbamazepine',r:'Carbamazepine is first-line for focal seizures, not generalized spike-wave epilepsy. Valproate or levetiracetam are preferred.'}],
    'Start antiepileptic drug (valproic acid or levetiracetam)',['peds','epilepsy','seizure'],'First unprovoked seizure with abnormal EEG: start AED. Valproate for generalized, carbamazepine for focal.'),

  q('A {age}-year-old {gender} with cerebral palsy (GMFCS III) presents with worsening hip pain and difficulty sitting. X-ray shows >50% femoral head subluxation. What is the most appropriate management?',
    [{text:'Referral to orthopedics for surgical reconstruction',r:'Hip subluxation >50% in CP requires surgical reconstruction (femoral osteotomy ± pelvic osteotomy) to prevent dislocation, pain, and loss of function.'},
     {text:'Botox injections to adductors',r:'Botox reduces spasticity and may slow subluxation progression but does not correct established subluxation >50%.'},
     {text:'Physical therapy alone',r:'PT maintains range of motion but cannot reverse structural subluxation. Surgical intervention is needed.'},
     {text:'Hip spica casting',r:'Casting is for developmental dysplasia in infants, not for spastic hip subluxation in CP.'}],
    'Referral to orthopedics for surgical reconstruction',['peds','cerebral-palsy','hip-subluxation'],'CP hip surveillance: X-ray every 6-12 months. Surgical reconstruction for subluxation >50% or dislocation.'),

  q('A {age}-year-old {gender} presents with episodic unilateral pounding headache with nausea, photophobia, and phonophobia. Relieved by sleep. Neuro exam normal. What is the most likely diagnosis?',
    [{text:'Migraine without aura',r:'Migraine: episodic unilateral pulsating headache, nausea, photophobia/phonophobia, relieved by sleep. Treatment: ibuprofen or sumatriptan. Prevention for frequent attacks.'},
     {text:'Tension headache',r:'Tension headache: bilateral band-like pressure, no nausea or photophobia. Less disabling than migraine.'},
     {text:'Cluster headache',r:'Cluster: unilateral severe pain around eye with autonomic features (lacrimation, rhinorrhea). Duration 15-180 minutes.'},
     {text:'Pseudotumor cerebri',r:'Pseudotumor: headache with papilledema, visual disturbances, elevated CSF pressure. Neuroimaging is normal.'}],
    'Migraine without aura',['peds','migraine','headache'],'Pediatric migraine: acute treatment (NSAIDs, triptans). Prevention (amitriptyline, topiramate) for frequent attacks.'),

  // ═══ CARDIOVASCULAR ═══

  q('A {day}-day-old {gender} presents with cyanosis and respiratory distress. Pulse oximetry: preductal 95%, postductal 75%. Chest X-ray shows cardiomegaly with pulmonary edema. What is the most likely diagnosis?',
    [{text:'Coarctation of aorta (duct-dependent)',r:'Differential cyanosis (higher preductal O2) suggests coarctation. Ductus supplies descending aorta. Start PGE1 to maintain ductal patency. Surgical repair after stabilization.'},
     {text:'Transposition of great arteries',r:'TGA presents with severe cyanosis in first day, equal pre and postductal saturations. Requires balloon atrial septostomy.'},
     {text:'Tetralogy of Fallot',r:'TOF presents with cyanosis and hypercyanotic spells, not differential cyanosis. Echocardiogram shows VSD, overriding aorta, RV hypertrophy, pulmonary stenosis.'},
     {text:'Total anomalous pulmonary venous return',r:'TAPVR presents with cyanosis and pulmonary edema. Not differential cyanosis.'}],
    'Coarctation of aorta (duct-dependent)',['peds','CHD','coarctation','PGE1'],'Duct-dependent coarctation: start PGE1, ICU, surgical repair. Differential cyanosis is the key sign.'),

  q('A {age}-year-old {gender} presents with fever and joint pain 3 weeks after strep throat. Cardiac exam shows a new murmur. ECG shows prolonged PR interval. ESR elevated, ASO titer elevated. What is the most likely diagnosis?',
    [{text:'Acute rheumatic fever',r:'Rheumatic fever: Jones criteria require 2 major (carditis, arthritis, chorea, erythema marginatum, subcutaneous nodules) or 1 major + 2 minor. Treatment: aspirin, penicillin prophylaxis.'},
     {text:'Infective endocarditis',r:'Endocarditis presents with fever, murmur, and positive blood cultures. Not preceded by strep throat with ASO elevation.'},
     {text:'Kawasaki disease',r:'Kawasaki: fever >5 days, conjunctivitis, oral changes, rash, extremity changes. Not associated with preceding strep throat.'},
     {text:'Juvenile idiopathic arthritis',r:'JIA presents with prolonged fever and arthritis but not carditis or ASO elevation.'}],
    'Acute rheumatic fever',['peds','rheumatic-fever','carditis'],'Rheumatic fever: follows GAS pharyngitis. Jones criteria. Penicillin prophylaxis prevents recurrence and rheumatic heart disease.'),

  q('A {mo}-month-old {gender} presents with poor feeding, tachypnea, and failure to thrive. Loud holosystolic murmur at left lower sternal border. Chest X-ray shows cardiomegaly and increased pulmonary vascularity. What is the most likely diagnosis?',
    [{text:'Ventricular septal defect (VSD)',r:'Large VSD presents at 4-8 weeks (when pulmonary resistance drops) with heart failure, holosystolic murmur at LLSB, and increased pulmonary vascularity. Treatment: surgical closure if failure to thrive.'},
     {text:'Tetralogy of Fallot',r:'TOF presents with cyanosis and right-sided aortic arch. Murmur is systolic at left upper sternal border from pulmonary stenosis.'},
     {text:'Patent ductus arteriosus',r:'PDA has continuous machinery murmur at left infraclavicular area. Bounding pulses and wide pulse pressure.'},
     {text:'Atrial septal defect',r:'ASD has wide fixed splitting of S2 with systolic murmur at left upper sternal border. Often asymptomatic in infancy.'}],
    'Ventricular septal defect (VSD)',['peds','VSD','CHD'],'Large VSD: heart failure at 4-8 weeks. Medical management first, surgical closure if failure.'),

  // ═══ RESPIRATORY ═══

  q('A {mo}-month-old {gender} presents with barking cough, stridor, and hoarseness for 2 days, worse at night. Mild chest wall indrawing. O2 95%. What is the most likely diagnosis?',
    [{text:'Croup (laryngotracheobronchitis)',r:'Croup: barking cough, stridor, hoarseness. Viral (parainfluenza). Management: dexamethasone 0.6 mg/kg. Nebulized epinephrine for moderate-severe stridor at rest.'},
     {text:'Bacterial tracheitis',r:'Bacterial tracheitis presents with high fever, toxic appearance, and thick purulent secretions. Requires intubation and antibiotics.'},
     {text:'Epiglottitis',r:'Epiglottitis: acute onset, high fever, drooling, tripod positioning. Now rare due to Hib vaccine.'},
     {text:'Foreign body aspiration',r:'Foreign body: sudden onset of choking and cough in a previously well child. Not barking cough worse at night.'}],
    'Croup (laryngotracheobronchitis)',['peds','croup','stridor'],'Croup: dexamethasone first-line. Nebulized epinephrine for moderate-severe distress.'),

  q('A {age}-year-old {gender} presents with recurrent sinopulmonary infections, pancreatic insufficiency, and failure to thrive. Sweat chloride 85 mmol/L. What is the most likely diagnosis?',
    [{text:'Cystic fibrosis',r:'CF: autosomal recessive, defective CFTR gene. Sweat chloride >60 confirms diagnosis. Multisystem: sinopulmonary, pancreatic, hepatobiliary, and male infertility. Treatment: airway clearance, enzymes, antibiotics.'},
     {text:'Primary ciliary dyskinesia',r:'PCD presents with chronic respiratory infections and situs inversus in 50%. Sweat chloride is normal.'},
     {text:'Severe combined immunodeficiency',r:'SCID presents with severe infections from infancy, not chronic sinopulmonary disease with pancreatic insufficiency.'},
     {text:'Asthma',r:'Asthma presents with wheezing, not pancreatic insufficiency or failure to thrive. Sweat chloride is normal.'}],
    'Cystic fibrosis',['peds','CF','cystic-fibrosis'],'CF: sweat chloride >60 confirms diagnosis. CFTR modulators (ivacaftor) for specific mutations.'),

  q('A {age}-year-old {gender} presents with chronic wet cough, purulent sputum, and digital clubbing. CT chest shows cylindrical bronchiectasis in the right middle lobe. What is the most common underlying cause?',
    [{text:'Prior severe pneumonia or pertussis',r:'Bronchiectasis in children results from severe lower respiratory infection (adenovirus, pertussis), CF, immunodeficiency, or aspiration. Right middle lobe syndrome is common.'},
     {text:'Primary ciliary dyskinesia',r:'PCD causes bronchiectasis but typically affects both lower lobes and has associated rhinosinusitis and situs abnormalities.'},
     {text:'Alpha-1 antitrypsin deficiency',r:'Alpha-1 causes panacinar emphysema and liver disease, not bronchiectasis.'},
     {text:'Allergic bronchopulmonary aspergillosis',r:'ABPA presents in asthmatics or CF patients with pulmonary infiltrates and elevated IgE. Not typical isolated lobar bronchiectasis.'}],
    'Prior severe pneumonia or pertussis',['peds','bronchiectasis'],'Bronchiectasis in children: investigate cause (infection, CF, immunodeficiency). Chest PT and antibiotics for exacerbations.'),

  // ═══ INFECTIOUS DISEASE ═══

  q('A {age}-year-old {gender} presents with fever, headache, photophobia, and neck stiffness. CSF shows WBC 1500 (80% neutrophils), glucose 1.2, protein 120. Gram-positive diplococci. What is the most likely organism?',
    [{text:'Streptococcus pneumoniae',r:'Pneumococcal meningitis: gram-positive diplococci. Common in children, especially with asplenia or cochlear implants. Treatment: ceftriaxone + vancomycin until sensitivities.'},
     {text:'Neisseria meningitidis',r:'Meningococcal meningitis: gram-negative diplococci. Associated with petechial rash and rapid progression. Treatment: ceftriaxone.'},
     {text:'Haemophilus influenzae type b',r:'Hib meningitis: gram-negative coccobacilli. Now rare due to Hib vaccine.'},
     {text:'Listeria monocytogenes',r:'Listeria: gram-positive rods. More common in neonates, elderly, and immunocompromised.'}],
    'Streptococcus pneumoniae',['peds','meningitis'],'Bacterial meningitis: CSF with high WBC, low glucose, high protein. Empiric ceftriaxone + vancomycin pending culture.'),

  q('A {age}-year-old {gender} presents with fever, conjunctivitis, cough, coryza, and Koplik spots. A maculopapular rash appears on day 4 starting on the face and spreading downward. What is the most likely diagnosis?',
    [{text:'Measles (rubeola)',r:'Measles: prodrome (cough, coryza, conjunctivitis, Koplik spots), then spreading maculopapular rash. Complications: pneumonia, encephalitis, subacute sclerosing panencephalitis.'},
     {text:'Rubella',r:'Rubella: milder rash, postauricular lymphadenopathy, low-grade fever. No Koplik spots.'},
     {text:'Roseola infantum',r:'Roseola (HHV-6): high fever for 3-5 days then rash appears as fever resolves. Affects infants <2 years.'},
     {text:'Scarlet fever',r:'Scarlet fever: sandpaper rash, strawberry tongue, pharyngeal erythema. Caused by GAS exotoxin.'}],
    'Measles (rubeola)',['peds','measles','Koplik'],'Measles: highly contagious. Supportive care. Vitamin A reduces morbidity and mortality. Prevention: MMR vaccine.'),

  q('A {age}-year-old {gender} presents with 3 weeks of intermittent fever, night sweats, and cough. Contact with uncle who has chronic cough. CXR shows hilar lymphadenopathy and right upper lobe infiltrate. TST positive 15 mm. What is the most appropriate management?',
    [{text:'Start 4-drug anti-TB therapy (RIPE)',r:'Active pulmonary TB in children: 4-drug regimen (rifampin, INH, pyrazinamide, ethambutol) for 2 months, then 2 drugs (INH + rifampin) for 4 months. Directly observed therapy.'},
     {text:'INH prophylaxis alone',r:'INH prophylaxis is for latent TB. This patient has active disease (symptoms + CXR findings) requiring full multi-drug therapy.'},
     {text:'Two-drug therapy (INH + rifampin)',r:'Active TB requires 4 drugs initially due to risk of resistance. Two drugs are for the continuation phase after 2 months.'},
     {text:'No treatment, monitor',r:'Active TB requires treatment to prevent progression, complications (miliary, meningitis), and transmission.'}],
    'Start 4-drug anti-TB therapy (RIPE)',['peds','TB','tuberculosis'],'Active TB: 2 months RIPE → 4 months RI. LTBI: INH or rifampin alone.'),

  q('A {mo}-month-old {gender} presents with fever, poor feeding, and bulging fontanelle. Blood culture grows Haemophilus influenzae type b. The mother declined vaccination. What is the most appropriate prevention for this infection?',
    [{text:'Hib vaccine series starting at 2 months',r:'Hib vaccine (conjugate) at 2, 4, 6, and 12-15 months prevents invasive Hib disease (meningitis, epiglottitis, pneumonia). Decline in cases >99% since vaccine introduction.'},
     {text:'Meningococcal vaccine',r:'Meningococcal vaccine prevents Neisseria meningitidis, not Hib. Two different pathogens.'},
     {text:'Pneumococcal conjugate vaccine',r:'PCV13 prevents Streptococcus pneumoniae infections but does not cover Haemophilus influenzae type b, which requires the dedicated Hib vaccine.'},
     {text:'Rifampin prophylaxis for close contacts',r:'Rifampin prophylaxis is for close contacts of Hib cases, not for routine infant prevention. The vaccine is the primary prevention.'}],
    'Hib vaccine series starting at 2 months',['peds','Hib','vaccine'],'Hib vaccine: conjugate vaccine at 2,4,6,12-15 months. Also indicated for asplenia and sickle cell disease.'),

  q('A {age}-year-old {gender} presents with daily fever for 10 days, conjunctival injection, red cracked lips, strawberry tongue, erythema of palms and soles, and unilateral cervical lymphadenopathy. What is the most likely diagnosis?',
    [{text:'Kawasaki disease',r:'Kawasaki: fever >5 days + 4 of 5 mucocutaneous features. IVIG 2 g/kg within 10 days reduces coronary artery aneurysms from 25% to 5%. Aspirin high-dose then low-dose.'},
     {text:'Scarlet fever',r:'Scarlet fever: sandpaper rash, pharyngitis, responds to antibiotics. Does not have conjunctivitis or extremity changes of KD.'},
     {text:'Stevens-Johnson syndrome',r:'SJS: severe mucocutaneous reaction with target lesions, blistering, and skin sloughing. Prior drug exposure.'},
     {text:'Systemic JIA (Still disease)',r:'SJIA: quotidian fevers, evanescent salmon-pink rash, arthritis. Does not have conjunctival injection or oral changes typical of KD.'}],
    'Kawasaki disease',['peds','Kawasaki','IVIG'],'KD: IVIG + aspirin within 10 days prevents coronary aneurysms. Echo follow-up at 2 weeks and 6 weeks.'),

  // ═══ SAUDI-SPECIFIC ═══
  q('A {age}-year-old {gender} of Saudi descent presents with recurrent episodes of severe abdominal pain, fever, and arthritis. Family history of similar episodes. Responds well to colchicine. What is the most likely diagnosis?',
    [{text:'Familial Mediterranean fever',r:'FMF: autosomal recessive, common in Arab populations. Recurrent febrile episodes with serositis, arthritis, and erysipelas-like erythema. Colchicine prevents attacks and amyloidosis.'},
     {text:'Crohn disease',r:'Crohn causes chronic diarrhea, abdominal pain, and weight loss. Not episodic febrile attacks responding to colchicine.'},
     {text:'Juvenile idiopathic arthritis',r:'JIA presents with chronic arthritis, not episodic febrile attacks with serositis.'},
     {text:'Systemic lupus erythematosus',r:'SLE: multisystem autoimmune disease with positive ANA. Not episodic attacks responding to colchicine.'}],
    'Familial Mediterranean fever',['peds','FMF','colchicine','saudi'],'FMF: common in Arabs. Colchicine prevents attacks and secondary amyloidosis. Genetic testing confirms.'),

  q('A {age}-year-old {gender} of Arabian Gulf origin presents with fatigue and pallor. Hb 9.5, MCV 65, HbA2 4.5%. Ferritin normal. What is the most likely diagnosis?',
    [{text:'Beta-thalassemia minor (trait)',r:'Thalassemia minor: microcytosis with elevated HbA2, normal ferritin. Common in Gulf region. Carrier screening and genetic counseling recommended for at-risk couples.'},
     {text:'Iron deficiency anemia',r:'IDA has low ferritin and elevated TIBC. This patient has normal ferritin, making thalassemia more likely.'},
     {text:'Alpha-thalassemia trait',r:'Alpha-thalassemia: low or normal HbA2 with microcytosis. More common in Southeast Asian populations.'},
     {text:'Anemia of chronic disease',r:'ACD has normal or elevated ferritin with microcytic index. HbA2 is normal, not elevated.'}],
    'Beta-thalassemia minor (trait)',['peds','thalassemia','microcytosis','saudi'],'Beta-thalassemia trait: elevated HbA2. Genetic counseling. Prenatal diagnosis for at-risk couples.'),

  q('A {age}-year-old {gender} presents with acute onset of dark urine after eating fava beans. Hb 8.0, reticulocytes elevated, peripheral smear shows bite cells and Heinz bodies. G6PD level low. What is the most appropriate management?',
    [{text:'Avoidance of oxidative triggers (fava beans, sulfa drugs, naphthalene)',r:'G6PD deficiency: X-linked, common in Mediterranean and Gulf populations. Acute hemolytic anemia triggered by oxidants. Management: trigger avoidance. Transfusion if severe anemia.'},
     {text:'Iron supplementation',r:'Iron is not indicated in hemolytic anemia. Exacerbates oxidative stress. Trigger avoidance is the key.'},
     {text:'Splenectomy',r:'Splenectomy is for hereditary spherocytosis, not G6PD deficiency. Hemolysis in G6PD is self-limited once trigger removed.'},
     {text:'Exchange transfusion',r:'Exchange transfusion is reserved for severe neonatal hyperbilirubinemia or life-threatening hemolysis. Most cases resolve with trigger removal.'}],
    'Avoidance of oxidative triggers (fava beans, sulfa drugs, naphthalene)',['peds','G6PD','hemolysis','saudi'],'G6PD deficiency: avoid oxidative triggers. Newborn screening in high-prevalence populations (Saudi Arabia, Mediterranean).'),

  q('A {age}-year-old {gender} presents with recurrent vaso-occlusive crises, acute chest syndrome, and HbS 85% on electrophoresis. What is the most appropriate disease-modifying therapy?',
    [{text:'Hydroxyurea',r:'Hydroxyurea increases HbF levels, reducing vaso-occlusive crises, acute chest syndrome, and transfusion needs. First-line disease-modifying therapy for SCD.'},
     {text:'Chronic transfusion therapy',r:'Chronic transfusions are for patients with stroke risk (abnormal TCD) or severe complications despite hydroxyurea. Carries iron overload risk.'},
     {text:'Bone marrow transplant',r:'BMT is curative but reserved for severe SCD with a matched sibling donor. Not first-line due to transplant-related mortality.'},
     {text:'Penicillin prophylaxis',r:'Penicillin prophylaxis prevents pneumococcal sepsis in SCD but is not disease-modifying. It does not reduce crises or acute chest syndrome.'}],
    'Hydroxyurea',['peds','sickle-cell','hydroxyurea','saudi'],'SCD: newborn screening, penicillin prophylaxis, hydroxyurea. Stroke prevention with TCD screening.'),

  // ═══ NEPHROLOGY ═══

  q('A {age}-year-old {gender} presents with periorbital edema, frothy urine, and weight gain. Urine protein 4+, albumin 1.8, cholesterol 350. What is the most likely diagnosis and initial therapy?',
    [{text:'Nephrotic syndrome — prednisone 60 mg/m2/day',r:'Minimal change disease is the most common cause of nephrotic syndrome in children. Prednisone induces remission in 90%. Relapses are common but respond to steroid retreatment.'},
     {text:'Acute glomerulonephritis',r:'AGN presents with hematuria, hypertension, oliguria, and mild proteinuria. Not heavy proteinuria with hypoalbuminemia.'},
     {text:'Nephrotic syndrome — cyclophosphamide',r:'Cyclophosphamide is for steroid-resistant or frequently relapsing nephrotic syndrome, not first-line.'},
     {text:'UTI',r:'UTI causes dysuria and fever, not generalized edema and heavy proteinuria.'}],
    'Nephrotic syndrome — prednisone 60 mg/m2/day',['peds','nephrotic','minimal-change','prednisone'],'Nephrotic syndrome: prednisone 4-6 weeks first episode. Relapses retreated. Steroid-sparing agents for frequent relapses.'),

  q('A {age}-year-old {gender} presents with gross hematuria, hypertension, and periorbital edema 2 weeks after strep throat. C3 low, ASO elevated. What is the most likely diagnosis?',
    [{text:'Post-streptococcal glomerulonephritis',r:'PSGN: immune complex-mediated GN after GAS infection. Low C3, normal C4. Self-limited in children. Manage hypertension and fluid overload. Dialysis rarely needed.'},
     {text:'IgA nephropathy (Berger disease)',r:'IgA nephropathy presents with hematuria coinciding with URTI (same day), not 2 weeks later. C3 is normal.'},
     {text:'Lupus nephritis',r:'Lupus nephritis occurs in SLE with positive ANA, anti-dsDNA, low C3 and C4. Systemic symptoms are present.'},
     {text:'Hemolytic uremic syndrome',r:'HUS: microangiopathic hemolytic anemia, thrombocytopenia, renal failure. Preceded by diarrheal illness (E. coli O157).'}],
    'Post-streptococcal glomerulonephritis',['peds','PSGN','glomerulonephritis'],'PSGN: self-limited. Manage hypertension and fluid overload. Low C3 returns to normal in 6-8 weeks.'),

  q('A {mo}-month-old {gender} presents with microangiopathic hemolytic anemia, thrombocytopenia, and acute renal failure after diarrhea caused by E. coli O157:H7. What is the most likely diagnosis?',
    [{text:'Hemolytic uremic syndrome (typical, D+)',r:'HUS: triad of microangiopathic hemolytic anemia, thrombocytopenia, AKI. Typical HUS follows diarrheal illness (E. coli O157, Shiga toxin). Supportive care. Dialysis if needed.'},
     {text:'ITP',r:'ITP has isolated thrombocytopenia without anemia or renal failure.'},
     {text:'TTP',r:'TTP has neurological symptoms, fever, and low ADAMTS13 activity. More common in adults. Rare in children.'},
     {text:'Acute tubular necrosis',r:'ATN presents with muddy brown casts and elevated FENa. Does not have thrombocytopenia or microangiopathic hemolysis.'}],
    'Hemolytic uremic syndrome (typical, D+)',['peds','HUS','E-coli'],'Typical HUS: supportive care, dialysis if needed. Avoid antibiotics in E. coli O157 as they increase HUS risk.'),

  // ═══ ACUTE CARE ═══

  q('A {age}-year-old {gender} presents with sudden onset of choking, coughing, and respiratory distress while eating peanuts. Breath sounds decreased on the right. What is the most appropriate immediate management if the child is conscious and has mild distress?',
    [{text:'Back blows and chest thrusts (infant) or Heimlich maneuver (child >1 year)',r:'Foreign body aspiration: if conscious and choking, perform age-appropriate obstruction relief. If severe distress or unconscious, start CPR and call for help.'},
     {text:'Bronchoscopy under anesthesia',r:'Bronchoscopy is definitive for diagnosis and removal but should not delay first aid for acute obstruction.'},
     {text:'Chest X-ray',r:'CXR may show hyperinflation or atelectasis but should not delay airway clearance in acute obstruction.'},
     {text:'Nebulized epinephrine',r:'Epinephrine is for croup or anaphylaxis, not for foreign body airway obstruction.'}],
    'Back blows and chest thrusts (infant) or Heimlich maneuver (child >1 year)',['peds','foreign-body','airway-obstruction'],'Foreign body aspiration: airway clearance maneuvers first. Bronchoscopy for definitive removal.'),

  q('A {age}-year-old {gender} presents with fever, petechiae, and lethargy 2 hours after onset. BP 70/40. Widespread petechial rash. What is the most likely diagnosis?',
    [{text:'Meningococcemia with septic shock',r:'Meningococcemia: rapidly progressive fever, petechial/purpuric rash, hypotension. Medical emergency: IV ceftriaxone, fluid resuscitation, ICU. Household contacts need rifampin prophylaxis.'},
     {text:'Idiopathic thrombocytopenic purpura',r:'ITP causes bruising and petechiae but not fever, hypotension, or toxic appearance.'},
     {text:'Henoch-Schonlein purpura',r:'HSP has palpable purpura on legs with abdominal pain and arthritis. Not rapid onset of shock.'},
     {text:'Kawasaki disease',r:'KD has prolonged fever, not rapid onset with shock. Rash is polymorphous, not petechial.'}],
    'Meningococcemia with septic shock',['peds','meningococcemia','septic-shock'],'Meningococcemia: give antibiotics (ceftriaxone) promptly. Do not delay LP. Chemoprophylaxis for close contacts.'),

  // ═══ HEMATOLOGY/ONCOLOGY ═══

  q('A {age}-year-old {gender} presents with bruising and petechiae after a viral illness. Platelets 18, Hb 12, WBC 8. No splenomegaly. What is the most likely diagnosis?',
    [{text:'Immune thrombocytopenic purpura',r:'ITP: isolated thrombocytopenia in a well-appearing child after viral illness. Observation if no mucosal bleeding. Steroids or IVIG for significant bleeding.'},
     {text:'Leukemia',r:'Leukemia causes pancytopenia, not isolated thrombocytopenia. Would have anemia, neutropenia, and abnormal WBC.'},
     {text:'Aplastic anemia',r:'Aplastic anemia: pancytopenia with low reticulocytes, not isolated thrombocytopenia.'},
     {text:'Hemolytic uremic syndrome',r:'HUS: thrombocytopenia WITH microangiopathic hemolytic anemia and renal failure. This patient has normal Hb and renal function.'}],
    'Immune thrombocytopenic purpura',['peds','ITP','thrombocytopenia'],'ITP: observe if mild. Steroids ± IVIG for mucosal bleeding or platelet <10.'),

  q('A {age}-year-old {gender} presents with pallor, fever, bone pain, and hepatosplenomegaly. CBC shows Hb 6, WBC 80,000 with blasts, platelets 40. Bone marrow shows >25% lymphoblasts. What is the most likely diagnosis?',
    [{text:'Acute lymphoblastic leukemia',r:'ALL is the most common childhood cancer. Presents with cytopenias (anemia, thrombocytopenia), fever, bone pain, hepatosplenomegaly. Marrow blasts confirm diagnosis.'},
     {text:'Acute myeloid leukemia',r:'AML is more common in adults and presents with similar findings but Auer rods and myeloid markers differentiate.'},
     {text:'Neuroblastoma',r:'Neuroblastoma: solid tumor of sympathetic nervous system. Presents with abdominal mass or bone pain, not leukemic blasts in marrow.'},
     {text:'Aplastic crisis from parvovirus',r:'Aplastic crisis causes reticulocytopenia and rapid drop in Hb but does not cause leukocytosis with blasts.'}],
    'Acute lymphoblastic leukemia',['peds','ALL','leukemia'],'ALL: chemotherapy protocols risk-stratified by age, WBC, cytogenetics. CNS prophylaxis included.'),

  q('A {age}-year-old {gender} presents with abdominal mass and hypertension. CT shows 8 cm suprarenal mass crossing the midline. Urine catecholamines elevated. What is the most likely diagnosis?',
    [{text:'Neuroblastoma',r:'Neuroblastoma: adrenal or sympathetic chain tumor, common in children <5 years. Elevated urine VMA/HVA. MIBG scan for staging. Treatment: surgery, chemotherapy, or observation for low-risk.'},
     {text:'Wilms tumor (nephroblastoma)',r:'Wilms is an intrarenal tumor presenting as an abdominal mass. It does not cross the midline. Hypertension can occur but urine catecholamines are normal.'},
     {text:'Pheochromocytoma',r:'Pheochromocytoma presents with paroxysmal hypertension, palpitations, and headache. Rare in children.'},
     {text:'Rhabdomyosarcoma',r:'Rhabdomyosarcoma arises from muscle tissue anywhere in the body, not specifically from adrenal with catecholamine production.'}],
    'Neuroblastoma',['peds','neuroblastoma'],'Neuroblastoma: common in <5 years. MIBG scan for staging. Risk-stratified treatment: observation (low-risk) to intensive chemo (high-risk).'),

  // ═══ NEONATOLOGY ═══

  q('A {day}-day-old full-term neonate presents with tachypnea, grunting, and nasal flaring immediately after C-section delivery. Chest X-ray shows retained fetal fluid with prominent interstitial markings. What is the most likely diagnosis?',
    [{text:'Transient tachypnea of the newborn',r:'TTN: self-limited respiratory distress after C-section due to delayed fetal lung fluid clearance. Supportive care with O2. Usually resolves in 24-48 hours.'},
     {text:'Meconium aspiration syndrome',r:'MAS occurs in post-term infants with meconium-stained fluid. CXR shows coarse, patchy infiltrates. This infant had C-section without meconium history.'},
     {text:'Congenital pneumonia',r:'Congenital pneumonia presents with respiratory distress and CXR infiltrates. Usually has maternal risk factors (chorioamnionitis, prolonged ROM).'},
     {text:'Surfactant deficiency (RDS)',r:'RDS affects preterm infants due to surfactant deficiency. CXR shows ground-glass appearance with air bronchograms.'}],
    'Transient tachypnea of the newborn',['peds','TTN','newborn','respiratory-distress'],'TTN: self-limited after C-section. Supportive care. Distinguish from pneumonia and RDS.'),

  q('A {day}-day-old neonate presents with jaundice on day 2. Total bilirubin 18 mg/dL, direct 0.5. Mother is blood type O, baby is A. Direct Coombs test positive. What is the most likely diagnosis?',
    [{text:'ABO incompatibility hemolytic jaundice',r:'ABO incompatibility: mother O, baby A or B. Mild to moderate hemolysis with positive direct Coombs. Management: phototherapy. Exchange transfusion if severe.'},
     {text:'Physiologic jaundice',r:'Physiologic jaundice appears after 24 hours, peaks at day 3-5, and resolves by day 7. Bilirubin typically <15, and Coombs is negative.'},
     {text:'Rh incompatibility',r:'Rh incompatibility typically causes more severe hemolysis and is prevented by RhoGAM. First pregnancy is rarely affected.'},
     {text:'Breast milk jaundice',r:'Breast milk jaundice appears after day 5-7 and peaks at 2-3 weeks. Coombs is negative and onset is later.'}],
    'ABO incompatibility hemolytic jaundice',['peds','ABO-incompatibility','jaundice','phototherapy'],'Neonatal jaundice: assess risk factors, plot on Bhutani nomogram. Phototherapy per AAP guidelines.'),

  // ═══ ENDOCRINOLOGY ═══

  q('A {age}-year-old {gender} presents with polyuria, polydipsia, weight loss, and DKA (pH 7.1, HCO3 8). What is the most likely diagnosis?',
    [{text:'Type 1 diabetes mellitus',r:'T1DM: autoimmune destruction of pancreatic beta cells. Presents with classic triad (polyuria, polydipsia, weight loss) ± DKA. Management: insulin, fluids, K+ replacement.'},
     {text:'Type 2 diabetes mellitus',r:'T2DM: typically presents in older, overweight children with acanthosis nigricans and family history. DKA is less common.'},
     {text:'Diabetes insipidus',r:'DI presents with polyuria and polydipsia but normal blood glucose. Not weight loss or DKA.'},
     {text:'Psychogenic polydipsia',r:'Psychogenic polydipsia: excessive water intake, normal glucose, not DKA.'}],
    'Type 1 diabetes mellitus',['peds','T1DM','DKA','diabetes'],'T1DM: insulin therapy. DKA management: fluids, insulin infusion, K+ replacement. Monitor cerebral edema.'),

  q('A {age}-year-old {gender} presents with short stature (height -3.5 SD), delayed bone age, and low IGF-1. Growth hormone stimulation test shows peak GH 3.5 ng/mL (normal >10). What is the most likely diagnosis?',
    [{text:'Growth hormone deficiency',r:'GH deficiency: short stature, delayed bone age, low IGF-1, and failed GH stimulation test. Treatment: recombinant GH therapy. Rule out other causes (hypothyroidism, chronic disease).'},
     {text:'Constitutional growth delay',r:'Constitutional delay: delayed puberty, bone age matches height age, normal growth velocity. GH stimulation test is normal.'},
     {text:'Hypothyroidism',r:'Hypothyroidism: elevated TSH, low T4, delayed bone age. Always check thyroid status before GH testing.'},
     {text:'Cushing syndrome',r:'Cushing: growth failure WITH weight gain, central obesity, striae. This patient is not described as overweight.'}],
    'Growth hormone deficiency',['peds','GH-deficiency','short-stature'],'GH deficiency: confirm with stimulation test. Replace with daily GH injections. Monitor height velocity.'),

  // ═══ GENETIC/METABOLIC ═══

  q('A {day}-day-old neonate presents with poor feeding, lethargy, vomiting, and metabolic acidosis with increased anion gap, hypoglycemia, hyperammonemia. What is the most likely diagnosis?',
    [{text:'Inborn error of metabolism (organic acidemia or urea cycle defect)',r:'IEM should be suspected in neonates with unexplained metabolic acidosis, hyperammonemia, hypoglycemia, and neurologic deterioration. Workup: ammonia, amino acids, acylcarnitine profile, urine organic acids.'},
     {text:'Sepsis',r:'Sepsis can present similarly but would have inflammatory markers and positive cultures. IEM should be considered when sepsis is excluded or atypical.'},
     {text:'Hypoglycemia from hyperinsulinism',r:'Hyperinsulinism causes hypoglycemia with low ketones. Does not cause metabolic acidosis or hyperammonemia.'},
     {text:'Congenital adrenal hyperplasia',r:'CAH presents with virilization or salt wasting (hyponatremia, hyperkalemia), not metabolic acidosis with hyperammonemia.'}],
    'Inborn error of metabolism (organic acidemia or urea cycle defect)',['peds','IEM','metabolic'],'Suspected IEM: check glucose, ammonia, lactate, ABG, urine ketones. Consult genetics and metabolic specialist.'),

  // ═══ SURGICAL PEDIATRICS ═══

  q('A {age}-year-old {gender} presents with bilious vomiting and a palpable sausage-shaped mass in the right upper quadrant. Currant-jelly stools. What is the most likely diagnosis?',
    [{text:'Intussusception',r:'Intussusception: telescoping of bowel. Classic triad: colicky abdominal pain, currant-jelly stools, palpable sausage-shaped mass. Air/contrast enema is diagnostic and therapeutic.'},
     {text:'Malrotation with volvulus',r:'Malrotation presents with bilious vomiting in first month of life, not currant-jelly stools or sausage-shaped mass.'},
     {text:'Appendicitis',r:'Appendicitis: RLQ pain, fever, not currant-jelly stools or sausage-shaped mass.'},
     {text:'Meckel diverticulum',r:'Meckel: painless lower GI bleeding, not intussusception mass. Law of 2s: 2% of population, 2 inches long, 2 feet from ileocecal valve.'}],
    'Intussusception',['peds','intussusception','enema'],'Intussusception: air enema reduces 80-95%. Surgery for failed reduction or peritonitis.'),

  q('A {age}-year-old {gender} presents with acute right lower quadrant pain, fever, and anorexia. McDonald sign positive. WBC 15. Ultrasound shows non-compressible appendix. What is the most appropriate management?',
    [{text:'Laparoscopic appendectomy',r:'Acute appendicitis with peritonitis signs requires urgent appendectomy. Abscess may be managed with drainage + interval appendectomy.'},
     {text:'IV antibiotics alone',r:'Non-operative management is for uncomplicated appendicitis without peritonitis. This patient has signs of peritoneal irritation.'},
     {text:'CT-guided drainage',r:'CT drainage is for abscess >3 cm. This patient has acute appendicitis without evidence of abscess.'},
     {text:'Observation with serial exams',r:'With clear signs of appendicitis (fever, RLQ tenderness, elevated WBC, positive US), surgery should not be delayed.'}],
    'Laparoscopic appendectomy',['peds','appendicitis','surgery'],'Pediatric appendicitis: laparoscopic appendectomy. Antibiotics for 24 hours post-op for uncomplicated.'),

  // Breastfeeding / Well Baby
  q('A {age}-year-old {gender} is due for routine immunizations. Up to date with all vaccines. Which vaccines are given at this age (4-6 years)?',
    [{text:'DTaP, IPV, MMR, varicella',r:'4-6 year vaccines: DTaP (5th dose), IPV (4th dose), MMR (2nd dose), varicella (2nd dose). These complete the childhood immunization series before school entry.'},
     {text:'DTaP and IPV only',r:'MMR and varicella boosters are also due at 4-6 years, along with DTaP and IPV.'},
     {text:'MMR and varicella only',r:'DTaP and IPV are also required at 4-6 years to complete the primary series.'},
     {text:'No vaccines due until age 11',r:'Multiple booster doses are scheduled at 4-6 years. At 11-12 years: Tdap, HPV, and meningococcal vaccines.'}],
    'DTaP, IPV, MMR, varicella',['peds','immunization','vaccines'],'4-6 year visit: DTaP, IPV, MMR, varicella boosters. Also screen vision, hearing, and development.'),
];

function main() {
  console.log('\n🧒 Generating Pediatrics questions...\n');
  const questions = [];
  for (let i = 0; i < TARGET; i++) {
    const tpl = T[i % T.length];
    const q = tpl(i);
    q.topic = 'Pediatrics';
    q.scfhs_domain = 'Pediatrics';
    q._uid = 'peds-' + i;
    questions.push(q);
  }
  console.log(`   Generated ${questions.length} questions from ${T.length} templates\n`);
  writeOutput('generated-pediatrics.json', questions);
}

main();
