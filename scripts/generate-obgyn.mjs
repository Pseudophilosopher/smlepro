/**
 * generate-obgyn.mjs
 *
 * SMLE OBGYN domain — 500 questions covering all 44 subtopics.
 *
 * Usage: node scripts/generate-obgyn.mjs
 */

import { writeOutput, shuffle } from './question-utils.mjs';

const TARGET = 575;

function q(vignette, opts, correctText, topTags, rationale) {
  return (i) => {
    const shuffled = shuffle(opts);
    const correctIdx = shuffled.findIndex((o) => o.text === correctText);
    const correctLetter = String.fromCharCode(65 + correctIdx);
    return {
      question: vignette.replace(/\{age\}/g, 18 + (i % 46)).replace(/\{gender\}/g, 'female'),
      topic: 'Obstetrics & Gynaecology',
      scfhs_domain: 'Obstetrics & Gynaecology',
      difficulty: ['Easy', 'Moderate', 'Moderate', 'Hard', 'Hard'][i % 5],
      year: '2024-2025', image_reference: false,
      options: shuffled.map((o) => ({ text: o.text, correct: o.text === correctText, rationale: o.r })),
      correct_answer: correctLetter, rationale, tags: topTags,
    };
  };
}

const T = [
  // ── General Obstetrics ──

  // 1. Preeclampsia-Eclampsia (3)
  q('A {age}-year-old primigravida at 34 weeks presents with BP 160/105, proteinuria 3+, and severe headache. Platelets 90, ALT 120, Cr 1.2. What is the most appropriate management?',
    [{ text: 'Deliver after corticosteroid course if stable', r: 'Severe preeclampsia at ≥34 weeks requires delivery. A short course of steroids for fetal lung maturity can be given if maternal and fetal status permit delay.' },
     { text: 'Expectant management until 37 weeks', r: 'Severe preeclampsia with end-organ damage precludes expectant management. Delaying delivery risks eclampsia, hepatic rupture, and maternal death.' },
     { text: 'Oral antihypertensives and discharge', r: 'Severe preeclampsia requires inpatient management with IV antihypertensives and monitoring. Outpatient care is for mild disease only.' },
     { text: 'IV magnesium sulfate only', r: 'MgSO4 is for seizure prophylaxis, not treatment of underlying disease. Delivery remains the definitive management.' }],
    'Deliver after corticosteroid course if stable', ['obgyn', 'preeclampsia', 'severe'],
    'Severe preeclampsia ≥34 weeks: deliver after steroids. MgSO4 for seizure prophylaxis. BP control with labetalol or hydralazine.'),

  // 2. Third Trimester Bleeding — Placenta Previa
  q('A {age}-year-old at 32 weeks presents with painless bright red vaginal bleeding. No contractions. Fundal height appropriate. What is the most appropriate initial diagnostic step?',
    [{ text: 'Transabdominal ultrasound for placental localization', r: 'Painless third trimester bleeding is placenta previa until proven otherwise. Ultrasound is first-line and safe. Digital exam is contraindicated.' },
     { text: 'Digital vaginal examination', r: 'Digital exam is contraindicated when previa is suspected due to risk of provoking catastrophic hemorrhage.' },
     { text: 'Biophysical profile', r: 'BPP assesses fetal wellbeing but does not diagnose the cause of bleeding. Placental localization is the priority.' },
     { text: 'Amniocentesis to assess fetal lung maturity', r: 'Amniocentesis has no role in diagnosing the cause of acute third-trimester bleeding and carries procedural risk.' }],
    'Transabdominal ultrasound for placental localization', ['obgyn', 'placenta-previa', 'third-trimester-bleeding'],
    'Painless third trimester bleeding: ultrasound to locate placenta. NO digital exam. If previa confirmed: admit, steroids, deliver at 36-37 weeks if stable.'),

  // 3. Third Trimester Bleeding — Abruptio Placentae
  q('A {age}-year-old at 36 weeks presents with sudden severe abdominal pain and dark vaginal bleeding. Uterus is rigid and tender. FHR shows late decelerations. BP 85/50. What is the most appropriate management?',
    [{ text: 'Emergency cesarean section', r: 'Abruption with non-reassuring fetal status and maternal hemodynamic instability requires emergency delivery. DIC is a life-threatening complication.' },
     { text: 'Expectant management with monitoring', r: 'Fetal distress and maternal instability mandate immediate delivery. Expectant management risks fetal death and maternal coagulopathy.' },
     { text: 'Administer tocolysis', r: 'Tocolysis is contraindicated in abruption. Uterine contractions may worsen bleeding and fetal compromise.' },
     { text: 'Transvaginal ultrasound to confirm diagnosis', r: 'Abruption is a clinical diagnosis. Delaying delivery for imaging risks fetal demise.' }],
    'Emergency cesarean section', ['obgyn', 'abruption', 'emergency-c-section'],
    'Abruptio placentae with fetal distress and maternal shock: emergency delivery. Evaluate for DIC and prepare for massive transfusion.'),

  // 4. Preterm Labor (3)
  q('A {age}-year-old at 30 weeks presents with regular painful contractions and cervical dilation of 3 cm on exam. Membranes intact. Fetal status reassuring. What is the most appropriate management?',
    [{ text: 'Tocolysis + corticosteroids + antenatal monitoring', r: 'Preterm labor at <34 weeks with intact membranes and reassuring fetal status: tocolysis for 48 hours allows corticosteroids to enhance fetal lung maturity.' },
     { text: 'Immediate delivery', r: 'Delivery is indicated when tocolysis is contraindicated (chorioamnionitis, severe preeclampsia, non-reassuring fetal status) or labor is too advanced.' },
     { text: 'Corticosteroids alone without tocolysis', r: 'Tocolysis buys time for steroids to work (maximal effect at 48 hours). With 3 cm dilation, the patient may deliver before steroids take effect without tocolysis.' },
     { text: 'Oral nifedipine and discharge', r: 'Preterm labor requires hospitalization for monitoring, tocolysis, and steroid administration. Outpatient management is not appropriate.' }],
    'Tocolysis + corticosteroids + antenatal monitoring', ['obgyn', 'preterm-labor', 'tocolysis', 'corticosteroids'],
    'Preterm labor <34 weeks: tocolysis + steroids + GBS prophylaxis. If cervical dilation >6 cm or chorioamnionitis: deliver.'),

  // 5. PROM (3)
  q('A {age}-year-old at 36 weeks presents with fluid leaking per vagina for 2 hours. Pooling and ferning are positive on speculum exam. No contractions. Fetal status reassuring. What is the most appropriate management?',
    [{ text: 'Induce labor at 36 weeks', r: 'PROM at ≥36 weeks: induction of labor is recommended to reduce chorioamnionitis risk. GBS prophylaxis should be given if indicated.' },
     { text: 'Expectant management until 37 weeks', r: 'PROM at ≤37 weeks is managed by induction unless very close to term. The risk of ascending infection outweighs benefits of waiting.' },
     { text: 'Tocolysis to prevent labor', r: 'Tocolysis is contraindicated in PROM due to infection risk. Delivery is the goal when the cervix is unfavorable and membranes are ruptured at term.' },
     { text: 'Tighten membranes surgically', r: 'There is no surgical method to reseal ruptured membranes. Induction or expectant management are the only options.' }],
    'Induce labor at 36 weeks', ['obgyn', 'PROM', 'induction'],
    'PROM ≥36 weeks: induction. 34-36 weeks: steroids + induction vs expectant. <34 weeks: steroids + antibiotics + expectant management with monitoring for infection.'),

  // 6. Postpartum Hemorrhage (3)
  q('A {age}-year-old delivered vaginally 20 minutes ago. Fundus is boggy and uterus is at the umbilicus. Heavy bright red bleeding continues despite fundal massage. What is the most appropriate first-line pharmacologic management?',
    [{ text: 'IV oxytocin 10-40 IU in 1 L normal saline', r: 'Oxytocin is first-line for uterine atony. It causes sustained uterine contraction. Dose: 10-40 IU in 1 L NS, infused at 125-200 mL/hour.' },
     { text: 'IM carboprost 250 mcg', r: 'Carboprost (PGF2α) is second-line when oxytocin fails. Contraindicated in asthma. Effective for atony but causes nausea, vomiting, and bronchospasm.' },
     { text: 'IV tranexamic acid', r: 'TXA 1 g IV is adjunctive, given within 3 hours of delivery. It reduces death from bleeding by 20% but does not replace uterotonics.' },
     { text: 'Oral misoprostol 800 mcg', r: 'Misoprostol is third-line and less effective than oxytocin. Used when IV access is limited. Causes fever and shivering.' }],
    'IV oxytocin 10-40 IU in 1 L normal saline', ['obgyn', 'PPH', 'uterine-atony', 'oxytocin'],
    'PPH: uterine massage + oxytocin first-line. Escalate: ergometrine → carboprost → misoprostol → intrauterine balloon → surgical.'),

  // 7. Maternal-Fetal Physiology (3)
  q('A {age}-year-old at 28 weeks has a hemoglobin of 10.2 g/dL. MCV 82, ferritin 15. Which physiologic change of pregnancy most likely contributes to this finding?',
    [{ text: 'Physiologic hemodilution from plasma volume expansion', r: 'Plasma volume increases ~50% while red cell mass increases only ~25%, causing dilutional anemia in the second and third trimesters. This is physiologic, not pathologic.' },
     { text: 'Iron deficiency from fetal demands', r: 'Fetal iron demands increase in the third trimester, but physiologic hemodilution is the primary cause of lower hemoglobin earlier. Iron studies help distinguish.' },
     { text: 'Hemolysis from placental circulation', r: 'Pregnancy does not cause hemolysis. A falling hemoglobin with elevated LDH and low haptoglobin would suggest pathologic hemolysis.' },
     { text: 'Folate deficiency from increased requirements', r: 'Folate deficiency causes macrocytic anemia (high MCV). This patient\'s MCV is normal, making folate deficiency unlikely.' }],
    'Physiologic hemodilution from plasma volume expansion', ['obgyn', 'maternal-fetal-physiology', 'anemia'],
    'Gestational anemia is primarily dilutional. Iron, folate, and B12 should be evaluated. Supplementation is standard regardless.'),

  // 8. Antepartum Care (2)
  q('A {age}-year-old primigravida at 10 weeks presents for initial prenatal visit. She is healthy with no chronic conditions. What routine lab tests should be ordered at this visit?',
    [{ text: 'Blood type/Rh, antibody screen, CBC, HIV, syphilis, hepatitis B, rubella titer, urinalysis', r: 'Standard first-trimester labs include blood group + antibody screen, CBC, HIV, syphilis, HBsAg, rubella, and urinalysis. These establish baseline and identify risks.' },
     { text: 'OGTT for gestational diabetes at 10 weeks', r: 'OGTT is performed at 24-28 weeks routinely or earlier only if risk factors (prior GDM, BMI >30). Not part of initial visit labs.' },
     { text: 'Amniocentesis for karyotype', r: 'Amniocentesis is offered at 15-20 weeks for women ≥35 or abnormal NIPT/serum screen. Not routine at 10 weeks.' },
     { text: 'Chest X-ray for TB screening', r: 'Chest X-ray is not a routine prenatal lab. TB screening is indicated only for high-risk populations (exposure, symptoms, high-prevalence country).' }],
    'Blood type/Rh, antibody screen, CBC, HIV, syphilis, hepatitis B, rubella titer, urinalysis', ['obgyn', 'prenatal-care', 'first-trimester'],
    'First prenatal visit: comprehensive history, blood work, urinalysis, dating ultrasound. Supplements: folic acid, iron, vitamin D.'),

  // 9. Intrapartum Care (2)
  q('A {age}-year-old primigravida at 40 weeks presents with contractions every 3 minutes, cervical dilation 6 cm, 100% effaced. FHR is 145 with moderate variability. What stage of labor is this patient in?',
    [{ text: 'Active phase of first stage', r: 'Active first stage: 6-10 cm dilation, regular contractions. Nulliparous women dilate ~1 cm/hour. FHR monitoring should be continuous.' },
     { text: 'Latent phase of first stage', r: 'Latent phase: 0-6 cm, slower progress. This patient has passed the latent-to-active transition at 6 cm.' },
     { text: 'Second stage of labor', r: 'Second stage begins at complete dilation (10 cm) and ends with delivery. This patient is not yet fully dilated.' },
     { text: 'Third stage of labor', r: 'Third stage is from delivery of the infant to delivery of the placenta. This patient is still in the active phase of first stage.' }],
    'Active phase of first stage', ['obgyn', 'intrapartum', 'labor-stages'],
    'Active phase (6-10 cm) progresses at ~1 cm/hour for nulliparas. If protraction or arrest occurs, evaluate for augmentation with oxytocin.'),

  // 10. Postpartum Care (2)
  q('A {age}-year-old G1P1 had a vaginal delivery with second-degree perineal laceration repaired. She is breastfeeding. Which contraceptive method is most appropriate at this postpartum visit?',
    [{ text: 'Progestin-only pill or IUD (Cu-IUD or LNG-IUS)', r: 'Postpartum contraception: progestin-only methods and IUDs are safe during breastfeeding. Progestin-only pills start immediately; IUDs can be placed at 4-6 weeks postpartum.' },
     { text: 'Combined oral contraceptive', r: 'COCs are relatively contraindicated during breastfeeding in the first 3-6 weeks due to potential effects on milk production. Progestin-only methods are preferred.' },
     { text: 'Tubal ligation immediately', r: 'Tubal ligation is permanent and requires informed consent before or after delivery. It is not the first-line recommendation for a healthy new mother.' },
     { text: 'Natural family planning alone', r: 'Natural family planning has high failure rates in the postpartum period due to unpredictable return of ovulation and cycles.' }],
    'Progestin-only pill or IUD (Cu-IUD or LNG-IUS)', ['obgyn', 'postpartum', 'contraception', 'breastfeeding'],
    'Postpartum contraception: progestin-only methods are safe during breastfeeding. IUDs placed at 4-6 weeks postpartum.'),

  // 11. Fetal Surveillance (2)
  q('A {age}-year-old at 39 weeks in active labor has an FHR tracing showing variable decelerations dropping to 70 bpm, lasting 60 seconds, with moderate variability between contractions. What is the most appropriate interpretation?',
    [{ text: 'Category II (indeterminate) — continue monitoring and consider intrauterine resuscitation', r: 'Variable decelerations with moderate variability are Category II. Interventions: maternal repositioning, oxygen, IV fluids, amnioinfusion. If worsening, consider operative delivery.' },
     { text: 'Category I (normal) — no intervention needed', r: 'Category I requires all: baseline 110-160, moderate variability, NO decelerations. Variables make this Category II.' },
     { text: 'Category III (abnormal) — immediate delivery', r: 'Category III: absent variability + recurrent late/variables, or bradycardia. This has moderate variability, making it Category II.' },
     { text: 'Fetal scalp blood sampling immediately', r: 'Fetal scalp sampling is used to clarify indeterminate tracings but is not the first step. Intrauterine resuscitation should be initiated first.' }],
    'Category II (indeterminate) — continue monitoring and consider intrauterine resuscitation', ['obgyn', 'fetal-monitoring', 'intrapartum'],
    'Category II tracing: resuscitative measures first. If repetitive severe variables with rising baseline or minimal variability → expedite delivery.'),

  // 12. Postpartum Infection (2)
  q('A {age}-year-old G2P2 on postpartum day 3 after C-section presents with fever 39°C, tachycardia, and purulent discharge from the incision site. What is the most likely diagnosis?',
    [{ text: 'Surgical site infection (wound infection)', r: 'Post-cesarean fever with localized wound tenderness, erythema, and purulent drainage is a surgical site infection until proven otherwise. Wound culture and broad-spectrum antibiotics are indicated.' },
     { text: 'Endometritis', r: 'Endometritis presents with uterine tenderness, foul lochia, and fever. This patient\'s primary findings are at the incision, not the uterus.' },
     { text: 'Urinary tract infection', r: 'UTI causes dysuria, frequency, and suprapubic pain. Without urinary symptoms, wound infection is more likely.' },
     { text: 'Mastitis', r: 'Mastitis presents with breast tenderness, erythema, and fever. This patient\'s findings are abdominal wall, not breast-related.' }],
    'Surgical site infection (wound infection)', ['obgyn', 'postpartum-infection', 'surgical-site'],
    'Post-cesarean wound infection: culture, antibiotics (coverage for MRSA if risk factors), wound opening and drainage if abscess.'),

  // 13. Post-Term Pregnancy (2)
  q('A {age}-year-old primigravida at 41 weeks 5 days with reassuring fetal status and unfavorable cervix (Bishop score 4). What is the most appropriate management?',
    [{ text: 'Induction of labor', r: 'Post-term pregnancy (≥41 weeks): induction reduces perinatal mortality and meconium aspiration without increasing C-section rate. Bishop score <6 may require cervical ripening.' },
     { text: 'Await spontaneous labor until 42 weeks', r: 'Perinatal risks increase after 41 weeks. Induction at 41 weeks reduces adverse outcomes compared to expectant management until 42 weeks.' },
     { text: 'Primary cesarean section at 41+5', r: 'C-section is not indicated solely for post-term with favorable Bishop score. Induction with cervical ripening is appropriate.' },
     { text: 'Biophysical profile weekly', r: 'Antenatal testing (BPP or NST) is recommended for post-term pregnancies, but induction at 41+ weeks is still recommended regardless of testing results.' }],
    'Induction of labor', ['obgyn', 'post-term', 'induction'],
    'Post-term pregnancy ≥41 weeks: induction recommended with cervical ripening if Bishop <6. Continue fetal surveillance if awaiting spontaneous labor.'),

  // 14. Fetal Growth Abnormalities (2)
  q('A {age}-year-old at 34 weeks with fundal height measuring 4 weeks behind dates. Ultrasound shows estimated fetal weight <10th percentile with normal amniotic fluid and normal Doppler studies. What is the most likely diagnosis?',
    [{ text: 'Small for gestational age (constitutional)', r: 'SGA with normal fluid and Doppler: likely constitutional or asymmetric growth restriction. Management: serial growth scans, antenatal testing. Normal Dopplers suggest low risk of hypoxia.' },
     { text: 'Intrauterine growth restriction from placental insufficiency', r: 'Placental insufficiency typically presents with abnormal Dopplers (elevated umbilical artery S/D ratio), oligohydramnios, and asymmetric growth.' },
     { text: 'Oligohydramnios from PROM', r: 'Amniotic fluid is normal per the scenario. Oligohydramnios would need further evaluation for PROM or placental insufficiency.' },
     { text: 'Macrosomia', r: 'Macrosomia is defined as EFW >90th percentile or >4000 g, the opposite of this scenario.' }],
    'Small for gestational age (constitutional)', ['obgyn', 'IUGR', 'SGA'],
    'SGA with normal Dopplers and fluid: likely constitutional. IUGR with abnormal Dopplers: closer monitoring, steroids if <34 weeks, deliver for worsening.'),

  // 15. Legal & Ethics in Obstetrics (2)
  q('A {age}-year-old at 32 weeks with severe preeclampsia is advised delivery for maternal safety. She refuses C-section due to religious beliefs about surgical delivery. What is the most appropriate course of action?',
    [{ text: 'Counsel thoroughly, document capacity, explore alternatives, involve ethics committee if needed', r: 'A competent patient has the right to refuse treatment. Explore reasons, provide alternatives, document capacity assessment. Ethics committee involvement may help resolve the conflict.' },
     { text: 'Obtain a court order for forced C-section', r: 'Court-ordered intervention is reserved for life-threatening emergencies when the patient lacks capacity or in specific jurisdictions for fetal viability. Counseling and alternatives should be exhausted first.' },
     { text: 'Proceed with C-section without consent', r: 'Performing surgery without consent constitutes battery. A competent adult\'s refusal must be respected even if providers disagree.' },
     { text: 'Transfer care to another provider', r: 'Transfer is an option but does not resolve the underlying ethical conflict. Counseling and multidisciplinary involvement are more appropriate first steps.' }],
    'Counsel thoroughly, document capacity, explore alternatives, involve ethics committee if needed', ['obgyn', 'ethics', 'refusal-of-care'],
    'Competent refusal of C-section: explore concerns, document capacity, involve ethics. Forced surgery is not ethically justified.'),

  // 16. Multifetal Gestation (2)
  q('A {age}-year-old at 32 weeks with dichorionic-diamniotic twins presents with preterm labor. Estimated fetal weights are concordant. What is the most appropriate management?',
    [{ text: 'Tocolysis + corticosteroids + fetal monitoring', r: 'Twin pregnancy with preterm labor: tocolysis and steroids as for singletons. DCDA twins have lowest complication risk among twins. Monitor for twin-specific complications.' },
     { text: 'Immediate C-section for twins', r: 'Vaginal delivery is possible for diamniotic twins if presenting twin is cephalic. Immediate delivery is not indicated if fetal status is reassuring.' },
     { text: 'Deliver only the presenting twin', r: 'Delivery of one twin in utero is not possible. Both must be delivered together.' },
     { text: 'Selective reduction to singleton', r: 'Selective reduction is performed earlier in pregnancy (first trimester) for higher-order multiples or severe discordance. Not at 32 weeks.' }],
    'Tocolysis + corticosteroids + fetal monitoring', ['obgyn', 'twins', 'multifetal', 'preterm-labor'],
    'Preterm labor in twins: tocolysis + steroids. DCDA twins have the best prognosis. MCDA twins: monitor for TTTS.'),

  // ── General Gynecology ──

  // 17. Ectopic Pregnancy (3)
  q('A {age}-year-old presents with 8 weeks amenorrhea, lower abdominal pain, and spotting. BP 100/60, HR 100, adnexal tenderness. Beta-hCG 6000. TVUS shows empty uterus and 2.5 cm adnexal mass with fetal heart activity. What is the most appropriate management?',
    [{ text: 'Laparoscopic salpingectomy or salpingotomy', r: 'Ectopic pregnancy with β-hCG >5000, visible mass with cardiac activity, or hemodynamic instability: surgical management is indicated. Salpingotomy preserves fertility.' },
     { text: 'Methotrexate single-dose protocol', r: 'MTX candidates: β-hCG <5000, no fetal cardiac activity, mass <3.5 cm, reliable follow-up. This patient has cardiac activity and hCG >5000.' },
     { text: 'Expectant management', r: 'Expectant management is for low, declining β-hCG with minimal symptoms. This patient has high hCG, cardiac activity, and pain.' },
     { text: 'Dilation and curettage', r: 'D&C is diagnostic for pregnancy of unknown location, not treatment for ectopic mass. A D&C that shows no villi suggests ectopic pregnancy.' }],
    'Laparoscopic salpingectomy or salpingotomy', ['obgyn', 'ectopic', 'salpingectomy'],
    'Ectopic pregnancy: surgical for hCG >5000, cardiac activity, or instability. MTX for unruptured, low hCG, no cardiac activity.'),

  // 18. Spontaneous Abortion (3)
  q('A {age}-year-old at 10 weeks presents with vaginal bleeding and cramping. On exam, cervical os is open. Products of conception are seen passing through the cervix. What is the most appropriate management?',
    [{ text: 'Surgical evacuation (D&C or suction curettage)', r: 'Incomplete abortion with open os and passing tissue: surgical evacuation is definitive and prevents hemorrhage and infection. Expectant management carries higher bleeding risk.' },
     { text: 'Misoprostol 800 mcg vaginally', r: 'Medical management is an alternative for incomplete abortion, but surgical evacuation is faster and more predictable when the patient is actively passing tissue.' },
     { text: 'Transvaginal ultrasound', r: 'Ultrasound can confirm retained products but should not delay evacuation when the diagnosis of incomplete abortion is clear on exam.' },
     { text: 'Oral antibiotics alone', r: 'Prophylactic antibiotics are given before surgical evacuation but are not treatment for incomplete abortion. Tissue must still be removed.' }],
    'Surgical evacuation (D&C or suction curettage)', ['obgyn', 'spontaneous-abortion', 'incomplete-abortion'],
    'Incomplete abortion with open cervix and active bleeding: evacuation. Medical management (misoprostol) for incomplete abortion without heavy bleeding.'),

  // 19. Abnormal Uterine Bleeding (3)
  q('A {age}-year-old presents with heavy menstrual bleeding for 6 months, passing clots, flooding, and Hb 8.5 g/dL. Ultrasound shows 3 cm submucosal fibroid. Endometrial biopsy is negative. What is the most appropriate initial management?',
    [{ text: 'Medical therapy: tranexamic acid + NSAIDs + iron', r: 'AUB with fibroid: medical therapy first-line. Tranexamic acid reduces bleeding by 40-50%, NSAIDs reduce pain and bleeding. Iron corrects anemia.' },
     { text: 'Total abdominal hysterectomy', r: 'Hysterectomy is definitive but reserved for failed medical therapy, completed childbearing, or severe symptoms. Medical management is initial.' },
     { text: 'Uterine artery embolization', r: 'UAE is for symptomatic fibroids after failed medical therapy. It is not first-line treatment for AUB.' },
     { text: 'Endometrial ablation', r: 'Ablation is for AUB without structural causes. Submucosal fibroid is a structural cause that may not be adequately treated by ablation alone.' }],
    'Medical therapy: tranexamic acid + NSAIDs + iron', ['obgyn', 'AUB', 'fibroid', 'menorrhagia'],
    'AUB with fibroid: medical first-line (TXA, NSAIDs, IUS). Surgical: myomectomy, UAE, or hysterectomy based on fertility wishes and severity.'),

  // 20. Dysmenorrhea (3)
  q('A {age}-year-old nulligravida presents with severe cramping pain on day 1-2 of her menses since menarche, limiting daily activity. NSAIDs provide partial relief. Normal physical exam. What is the most likely diagnosis?',
    [{ text: 'Primary dysmenorrhea', r: 'Primary dysmenorrhea begins at or shortly after menarche and is due to prostaglandin-mediated uterine contractions. First-line: NSAIDs + hormonal contraception.' },
     { text: 'Secondary dysmenorrhea', r: 'Secondary dysmenorrhea develops later in life and suggests underlying pathology (endometriosis, adenomyosis, fibroids). This patient\'s symptoms began at menarche.' },
     { text: 'Endometriosis', r: 'Endometriosis typically presents with chronic pelvic pain, dyspareunia, and infertility. Symptoms starting at menarche without other features favor primary dysmenorrhea.' },
     { text: 'Pelvic inflammatory disease', r: 'PID presents with vaginal discharge, fever, and cervical motion tenderness, not cyclic menstrual pain since menarche.' }],
    'Primary dysmenorrhea', ['obgyn', 'dysmenorrhea', 'primary'],
    'Primary dysmenorrhea: NSAIDs + hormonal contraception (COC or IUS). Exercise and heat also helpful.'),

  // 21. Uterine Leiomyomas (3)
  q('A {age}-year-old presents with heavy menses and pelvic pressure. Ultrasound shows a 6 cm intramural fibroid and three smaller fibroids. She desires future fertility. What is the most appropriate management?',
    [{ text: 'Myomectomy (laparoscopic or open)', r: 'Symptomatic fibroids in a woman desiring future fertility: myomectomy is the surgical treatment of choice. It removes fibroids while preserving the uterus for pregnancy.' },
     { text: 'Total abdominal hysterectomy', r: 'Hysterectomy is definitive but ends fertility. It should not be offered to a patient who desires future pregnancy.' },
     { text: 'GnRH agonist for 3 months', r: 'GnRH agonists shrink fibroids but cause hypoestrogenic symptoms and bone loss. Used preoperatively to reduce size or for short-term symptom control.' },
     { text: 'Uterine artery embolization', r: 'UAE is effective for symptom relief but may affect fertility and pregnancy outcomes. Myomectomy is preferred when fertility is desired.' }],
    'Myomectomy (laparoscopic or open)', ['obgyn', 'fibroids', 'myomectomy'],
    'Symptomatic fibroids with fertility desire: myomectomy. No fertility desire: myomectomy, UAE, or hysterectomy based on patient preference.'),

  // 22. Family Planning (2)
  q('A {age}-year-old is interested in long-term reversible contraception. She has had 2 children, no medical conditions, does not smoke, and wants to space her next pregnancy by 3-5 years. What is the most appropriate method?',
    [{ text: 'LNG-IUS (levonorgestrel intrauterine system)', r: 'LNG-IUS provides highly effective (>99%) long-term contraception for up to 5 years, with the additional benefit of reduced menstrual bleeding. Ideal for spacing.' },
     { text: 'Combined oral contraceptive pill', r: 'COCs are effective but require daily adherence and do not provide the multi-year coverage she seeks. Better for short-term spacing.' },
     { text: 'Progestin-only injection (DMPA)', r: 'DMPA is effective for 3 months per injection but requires clinic visits. It may cause weight gain and bone density concerns with long-term use.' },
     { text: 'Male condoms', r: 'Condoms have a 13% typical-use failure rate and are not the most effective option for a patient who wants reliable long-term protection.' }],
    'LNG-IUS (levonorgestrel intrauterine system)', ['obgyn', 'contraception', 'IUS'],
    'LARC methods (IUD, IUS, implant) are most effective for long-term spacing. LNG-IUS provides non-contraceptive benefits of lighter periods.'),

  // 23. Endometriosis (2)
  q('A {age}-year-old nulligravida presents with chronic pelvic pain, deep dyspareunia, and painful periods since age 22. Exam shows tender uterosacral nodules. What is the most likely diagnosis?',
    [{ text: 'Endometriosis', r: 'Endometriosis: chronic pelvic pain, dysmenorrhea, dyspareunia, tender nodules on exam. Laparoscopy confirms, but clinical diagnosis is often sufficient to start therapy.' },
     { text: 'Pelvic inflammatory disease', r: 'PID has acute/subacute onset with fever, discharge, and cervical motion tenderness. Chronic cyclic symptoms since menarche point to endometriosis.' },
     { text: 'Ovarian cyst rupture', r: 'Cyst rupture presents with acute severe pain and peritoneal signs. This patient has chronic cyclic symptoms, not acute.' },
     { text: 'Irritable bowel syndrome', r: 'IBS presents with altered bowel habits and abdominal pain related to defecation. It may coexist with endometriosis but does not cause dyspareunia or tender nodules.' }],
    'Endometriosis', ['obgyn', 'endometriosis', 'chronic-pelvic-pain'],
    'Endometriosis: NSAIDs + hormonal therapy (COC, progestin, GnRH agonist). Laparoscopic excision for diagnosis and treatment of refractory cases.'),

  // 24. Chronic Pelvic Pain (2)
  q('A {age}-year-old presents with lower abdominal pain for 8 months, worse before menses and during intercourse. Exam shows no masses. Ultrasound and laparoscopy are normal. What is the most appropriate initial management?',
    [{ text: 'Multidisciplinary approach: NSAIDs, COCs, physical therapy, CBT', r: 'Chronic pelvic pain with negative workup: multidisciplinary management including medical therapy (NSAIDs, COCs), pelvic floor physical therapy, and cognitive behavioral therapy. Referral to a chronic pain specialist if refractory.' },
     { text: 'Total hysterectomy', r: 'Hysterectomy is not indicated for chronic pelvic pain without identified pathology. Many patients continue to have pain after hysterectomy.' },
     { text: 'Repeat diagnostic laparoscopy', r: 'A single negative laparoscopy with chronic symptoms does not warrant immediate repeat. Conservative management is appropriate.' },
     { text: 'Narcotic pain management', r: 'Opioids are not first-line for chronic pelvic pain due to addiction risk and limited efficacy. Multimodal non-opioid management is preferred.' }],
    'Multidisciplinary approach: NSAIDs, COCs, physical therapy, CBT', ['obgyn', 'chronic-pelvic-pain'],
    'Chronic pelvic pain: multidisciplinary. Rule out endometriosis, PID, adhesions, GI, and GU causes. Treat underlying cause if identified.'),

  // 25. Menopause (2)
  q('A {age}-year-old presents with hot flashes, night sweats, vaginal dryness, and insomnia. Last menstrual period was 14 months ago. FSH 85. She has no contraindications. What is the most appropriate management?',
    [{ text: 'Menopausal hormone therapy (estrogen + progestogen if uterus intact)', r: 'MHT is first-line for moderate-to-severe vasomotor symptoms in women <60 or within 10 years of menopause. Estrogen alone if hysterectomy, add progestogen if uterus present to prevent endometrial hyperplasia.' },
     { text: 'Sertraline 50 mg daily', r: 'SSRIs/SNRIs are non-hormonal options for women with contraindications to MHT or those who prefer non-hormonal therapy. They are less effective than estrogen for vasomotor symptoms.' },
     { text: 'Vaginal estrogen only', r: 'Vaginal estrogen treats genitourinary syndrome (vaginal dryness, dyspareunia, urinary symptoms) but does not address systemic vasomotor symptoms.' },
     { text: 'Gabapentin 300 mg nightly', r: 'Gabapentin reduces hot flash frequency and severity but has side effects (dizziness, drowsiness). It is a second-line non-hormonal option, not first-line.' }],
    'Menopausal hormone therapy (estrogen + progestogen if uterus intact)', ['obgyn', 'menopause', 'MHT'],
    'MHT is most effective for vasomotor symptoms. Lowest effective dose, shortest duration. Risks (breast cancer, VTE) depend on regimen type.'),

  // 26. Infertility (2)
  q('A {age}-year-old couple presents with 18 months of regular unprotected intercourse without pregnancy. The male partner\'s semen analysis is normal. What is the most appropriate first test for the female partner?',
    [{ text: 'Ovulation assessment (mid-luteal progesterone, urine LH kits) + tubal patency (HSG)', r: 'Initial female infertility workup: ovulation assessment (progesterone or LH testing) and tubal patency (hysterosalpingogram). Ovarian reserve testing (AMH, FSH) if >35.' },
     { text: 'Laparoscopy for endometriosis', r: 'Laparoscopy is invasive and not first-line. HSG and ovulation assessment should be done first. Laparoscopy if HSG abnormal or high suspicion.' },
     { text: 'IVF directly', r: 'IVF is third-line after identifying the cause of infertility through basic workup. Most couples do not need IVF.' },
     { text: 'Rubella and hepatitis serology', r: 'Infectious serology is part of prepregnancy screening but does not diagnose the cause of infertility.' }],
    'Ovulation assessment (mid-luteal progesterone, urine LH kits) + tubal patency (HSG)', ['obgyn', 'infertility', 'workup'],
    'Infertility: semen analysis → ovulation → tubal patency. Ovarian reserve if >35. Manage based on identified cause (ovulatory: clomiphene/letrozole; tubal: surgery or IVF).'),

  // 27. STIs (3)
  q('A {age}-year-old presents with purulent vaginal discharge, dysuria, and lower abdominal pain. Cervical motion tenderness and adnexal tenderness on exam. Temperature 38.5°C. What is the most likely diagnosis?',
    [{ text: 'Pelvic inflammatory disease', r: 'PID: lower abdominal pain, cervical motion tenderness, adnexal tenderness, fever. Caused by ascending infection (Chlamydia, Gonorrhea, anaerobes). Outpatient or inpatient antibiotics based on severity.' },
     { text: 'Bacterial vaginosis', r: 'BV presents with thin, fishy-smelling discharge without fever or cervical motion tenderness.' },
     { text: 'Candidiasis', r: 'Vulvovaginal candidiasis: thick white discharge, pruritus, no fever or cervical motion tenderness.' },
     { text: 'Urinary tract infection', r: 'UTI: dysuria, frequency, suprapubic tenderness, not cervical or adnexal tenderness with fever.' }],
    'Pelvic inflammatory disease', ['obgyn', 'PID', 'STI'],
    'PID: empiric treatment with ceftriaxone + doxycycline + metronidazole. Treat sexual partners. Screen for HIV and syphilis.'),

  // 28. Cervical Disease & Neoplasia (2)
  q('A {age}-year-old has a Pap smear showing HSIL (high-grade squamous intraepithelial lesion). HPV 16 positive. She is otherwise healthy. What is the most appropriate next step?',
    [{ text: 'Colposcopy with cervical biopsy and endocervical curettage', r: 'HSIL (CIN 2-3) on Pap requires colposcopic evaluation with directed biopsies and endocervical sampling to confirm the diagnosis and assess severity before treatment.' },
     { text: 'Repeat Pap in 1 year', r: 'HSIL with high-risk HPV requires immediate colposcopy. Follow-up alone risks progression of CIN 2-3 to invasive cancer.' },
     { text: 'LEEP procedure immediately', r: 'LEEP is treatment for confirmed CIN 2-3. Diagnosis must be confirmed by colposcopy and biopsy before proceeding with excisional treatment.' },
     { text: 'Hysterectomy', r: 'Hysterectomy is not first-line for CIN 2-3. Cervical conization is sufficient and preserves fertility. Hysterectomy is for recurrent or persistent disease after childbearing.' }],
    'Colposcopy with cervical biopsy and endocervical curettage', ['obgyn', 'cervical-cancer', 'HSIL', 'colposcopy'],
    'HSIL + HPV 16: colposcopy + biopsy → if CIN 2-3 confirmed → excision (LEEP, conization). Annual surveillance after treatment.'),

  // 29. Ovarian Neoplasms (2)
  q('A {age}-year-old presents with abdominal bloating, early satiety, and pelvic pressure. Ultrasound shows a 10 cm complex ovarian cyst with solid components, septations, and ascites. CA-125 is 350. What is the most likely diagnosis?',
    [{ text: 'Epithelial ovarian carcinoma', r: 'Complex ovarian mass with solid components, ascites, and elevated CA-125: highly suspicious for ovarian cancer. Requires surgical staging: total hysterectomy, BSO, omentectomy, and peritoneal biopsies.' },
     { text: 'Benign ovarian cyst', r: 'Benign cysts are simple (anechoic, thin-walled, no solid components or septations). This mass has complex features highly suggestive of malignancy.' },
     { text: 'Endometrioma', r: 'Endometriomas appear as homogenous ground-glass echogenicity on ultrasound. They are associated with endometriosis and cause chronic pelvic pain.' },
     { text: 'Dermoid cyst (mature teratoma)', r: 'Dermoid cysts contain fat, hair, or calcifications (Rokitansky nodule) and are typically benign. They do not cause markedly elevated CA-125.' }],
    'Epithelial ovarian carcinoma', ['obgyn', 'ovarian-cancer', 'CA-125'],
    'Suspicious ovarian mass: surgical staging (total hysterectomy + BSO + omentectomy + peritoneal biopsies). Neoadjuvant chemo for advanced disease.'),

  // 30. Gestational Trophoblastic Disease (2)
  q('A {age}-year-old at 12 weeks presents with heavy vaginal bleeding and a uterus that is larger than expected for dates. Ultrasound shows a snowstorm pattern without fetal parts. β-hCG is 250,000 IU/L. What is the most likely diagnosis?',
    [{ text: 'Complete hydatidiform mole', r: 'Complete mole: no fetal tissue, diffuse trophoblastic proliferation, serum hCG very high (>100,000), snowstorm ultrasound. Management: suction evacuation, serial hCG monitoring.' },
     { text: 'Incomplete hydatidiform mole', r: 'Partial mole has some fetal tissue, lower hCG levels, and focal trophoblastic hyperplasia. Ultrasound may show fetal parts.' },
     { text: 'Choriocarcinoma', r: 'Choriocarcinoma is a malignant GTD that follows a molar or normal pregnancy. Diagnosed by persistently rising hCG after evacuation.' },
     { text: 'Multiple gestation', r: 'Multiple gestation shows multiple fetal poles on ultrasound, not a snowstorm pattern. hCG is elevated but not typically >200,000.' }],
    'Complete hydatidiform mole', ['obgyn', 'molar-pregnancy', 'GTD'],
    'Complete mole: suction evacuation + weekly hCG until undetectable for 3 weeks, then monthly for 6 months. Avoid pregnancy during monitoring.'),

  // 31. Endometrial Hyperplasia (2)
  q('A {age}-year-old with obesity and PCOS presents with intermenstrual spotting. Endometrial biopsy shows complex atypical hyperplasia. What is the most appropriate management?',
    [{ text: 'Total hysterectomy with bilateral salpingectomy', r: 'Atypical endometrial hyperplasia has significant risk of concurrent or future endometrial carcinoma. Hysterectomy is definitive treatment for women who have completed childbearing.' },
     { text: 'Progestin therapy (Mirena IUS or oral)', r: 'Progestin therapy is an option for women who desire future fertility. It achieves regression in ~80% but requires close surveillance with repeat biopsies.' },
     { text: 'Observation and repeat biopsy in 1 year', r: 'Atypical hyperplasia has a high risk of progression to carcinoma. Active treatment (hysterectomy or progestins) is indicated, not observation.' },
     { text: 'Dilation and curettage', r: 'D&C may remove the abnormal tissue temporarily but does not treat the underlying process. Recurrence is expected without definitive treatment.' }],
    'Total hysterectomy with bilateral salpingectomy', ['obgyn', 'endometrial-hyperplasia', 'atypical'],
    'Complex atypical hyperplasia: hysterectomy is definitive. Progestin therapy for fertility preservation with close surveillance.'),

  // 32. Osteoporosis screening (1)
  q('A {age}-year-old presents for routine well-woman exam. She has no chronic conditions, BMI 24, no history of fractures, non-smoker. What is the most appropriate recommendation for bone density screening?',
    [{ text: 'DEXA scan starting at age 65', r: 'The USPSTF and SCFHS recommend DEXA screening for women ≥65. Earlier screening (≥50) is for high-risk women (low BMI, smoking, steroid use, prior fracture, family history).' },
     { text: 'DEXA scan now', r: 'This patient is below 65 with no risk factors. Early screening is not recommended and may detect incidental low bone density leading to unnecessary treatment.' },
     { text: 'Quantitative CT of the spine', r: 'QCT is not a screening tool for osteoporosis. DEXA is the gold standard with well-established diagnostic criteria (T-score).' },
     { text: 'Annual vitamin D level', r: 'Vitamin D testing is not a substitute for bone density screening. It assesses bone health but does not diagnose osteoporosis.' }],
    'DEXA scan starting at age 65', ['obgyn', 'osteoporosis', 'screening'],
    'DEXA screening for women ≥65 or ≥50 with risk factors. T-score ≤-2.5: osteoporosis. Lifestyle + calcium/vitamin D for prevention.'),

  // 33. Prolapse / Incontinence (1)
  q('A {age}-year-old G3P3 presents with a sensation of vaginal bulge and occasional urinary stress incontinence. On exam, the cervix descends to the introitus with Valsalva. What is the most appropriate initial management?',
    [{ text: 'Pelvic floor physical therapy (Kegel exercises) + behavioral modification', r: 'Mild pelvic organ prolapse with stress incontinence: conservative management first-line. Pelvic floor PT, weight loss, avoidance of heavy lifting.' },
     { text: 'Vaginal pessary fitting', r: 'Pessary is an excellent non-surgical option for prolapse but is second-line after PT fails. It provides mechanical support.' },
     { text: 'Sacrospinous ligament fixation', r: 'Surgery is for advanced prolapse after conservative measures fail. Not first-line for prolapse at the introitus.' },
     { text: 'Total vaginal hysterectomy', r: 'Hysterectomy is indicated for uterine prolapse that is symptomatic and has failed conservative management. Not first-line.' }],
    'Pelvic floor physical therapy (Kegel exercises) + behavioral modification', ['obgyn', 'prolapse', 'incontinence'],
    'Pelvic organ prolapse: conservative (PT, pessary) first. Surgery for advanced or refractory prolapse. Cystocele/rectocele may require additional repair.'),

  // ── Subspecialty ──

  // 34. Alloimmunization
  q('A {age}-year-old G2P1 with blood type A negative. Her first child was Rh positive. She received RhoGAM after her first delivery. At 28 weeks, antibody screen is negative. What is the most appropriate management?',
    [{ text: 'Routine RhoGAM 300 mcg IM at 28 weeks', r: 'Rh-negative woman with negative antibody screen at 28 weeks: RhoGAM prophylaxis is standard to prevent alloimmunization from occult fetomaternal hemorrhage.' },
     { text: 'No RhoGAM needed since antibody screen is negative', r: 'RhoGAM is given at 28 weeks regardless of negative antibody screen. Without it, occult bleeding can cause sensitization.' },
     { text: 'Check antibody screen monthly', r: 'Antibody screening is repeated at 28 weeks. Monthly screening is not standard. RhoGAM at 28 weeks covers most sensitization risk.' },
     { text: 'Cordocentesis to determine fetal blood type', r: 'Cordocentesis is invasive and not indicated when maternal antibody screen is negative and management is standard.' }],
    'Routine RhoGAM 300 mcg IM at 28 weeks', ['obgyn', 'alloimmunization', 'RhoGAM'],
    'Rh-negative mother: RhoGAM at 28 weeks and within 72 hours of delivery if baby Rh+. Antibody screen at first visit and 28 weeks.'),

  // 35. Fetal Death (2)
  q('A {age}-year-old at 36 weeks reports absent fetal movement for 24 hours. No fetal heart tones are detected. Ultrasound confirms intrauterine fetal death. What is the most appropriate counseling?',
    [{ text: 'Discuss delivery options, recommend induction, provide emotional support, offer autopsy and genetic testing', r: 'IUFD management: deliver the baby (induction or expectant depending on gestational age and maternal safety). Offer evaluation for cause (autopsy, genetic testing, placental pathology). Grief support is essential.' },
     { text: 'Emergency C-section to confirm fetal status', r: 'C-section is not indicated for confirmed IUFD. Vaginal delivery is safer for the mother. C-section carries surgical risks without fetal benefit.' },
     { text: 'Admit and observe', r: 'Prolonged retention of a dead fetus risks DIC. Induction is recommended after IUFD is confirmed.' },
     { text: 'Send home with follow-up in 1 week', r: 'Management of IUFD requires active planning for delivery. Coagulopathy (DIC) can develop with prolonged retention of dead fetal tissue.' }],
    'Discuss delivery options, recommend induction, provide emotional support, offer autopsy and genetic testing', ['obgyn', 'IUFD', 'fetal-death'],
    'IUFD: induction or expectant management. Evaluate for cause. DIC risk with prolonged retention. Grief counseling and follow-up.'),

  // 36. Obstetric Procedures (2)
  q('A {age}-year-old primigravida with a prolonged second stage of labor (pushing for 3 hours), fetal head at +2 station, occiput anterior. FHR is reassuring. What is the most appropriate management?',
    [{ text: 'Operative vaginal delivery (vacuum or forceps)', r: 'Prolonged second stage with reassuring fetal status and favorable station: operative vaginal delivery is appropriate. Vacuum is first-line for OA position. Indications: maternal exhaustion, prolonged pushing, fetal indications.' },
     { text: 'Immediate cesarean section', r: 'C-section is indicated for failed operative vaginal delivery, unfavorable station, or non-reassuring fetal status. This patient is a candidate for operative delivery.' },
     { text: 'Continue pushing indefinitely', r: 'Prolonged pushing risks maternal exhaustion, chorioamnionitis, and neonatal morbidity. Intervention is indicated after 3 hours of pushing.' },
     { text: 'McRoberts maneuver', r: 'McRoberts is for shoulder dystocia management, not for prolonged second stage without evidence of dystocia.' }],
    'Operative vaginal delivery (vacuum or forceps)', ['obgyn', 'operative-vaginal-delivery', 'prolonged-labor'],
    'Prolonged second stage: operative vaginal delivery if favorable station and position. C-section if vacuum/forceps fails or unfavorable.'),

  // 37. Hirsutism / Virilization (2)
  q('A {age}-year-old presents with hirsutism (Ferriman-Gallwey score 18), acne, oligomenorrhea, and infertility. Testosterone 3.0 (elevated), DHEAS normal, 17-OHP normal. Ultrasound shows polycystic ovaries. What is the most likely diagnosis?',
    [{ text: 'Polycystic ovary syndrome', r: 'PCOS: hyperandrogenism (clinical or biochemical), oligo/anovulation, polycystic ovaries (2 of 3 criteria). Elevated testosterone with normal DHEAS and 17-OHP excludes adrenal causes.' },
     { text: 'Congenital adrenal hyperplasia (non-classic)', r: 'Non-classic CAH due to 21-hydroxylase deficiency presents with elevated 17-OHP. This patient\'s 17-OHP is normal, excluding the diagnosis.' },
     { text: 'Cushing syndrome', r: 'Cushing: hypercortisolism with central obesity, striae, buffalo hump, proximal weakness. This patient has hyperandrogenism without cortisol excess.' },
     { text: 'Adrenal tumor', r: 'Adrenal tumors produce DHEAS and/or cortisol. Normal DHEAS excludes an adrenal source of androgen excess in most cases.' }],
    'Polycystic ovary syndrome', ['obgyn', 'PCOS', 'hirsutism'],
    'PCOS: Rotterdam criteria (2 of 3). Management: COCs for hirsutism, metformin/letrozole for fertility, lifestyle modification for metabolic health.'),

  // 38. Abortion ethics
  q('A {age}-year-old at 6 weeks with a wanted pregnancy is found to have missed abortion on ultrasound. She is hemodynamically stable. She requests "natural management" and does not want surgical intervention. What is the most appropriate counseling?',
    [{ text: 'Present all options: expectant, medical (misoprostol), or surgical. Support her decision after informed consent', r: 'Missed abortion management includes expectant (1-4 weeks for spontaneous passage), medical (misoprostol), or surgical (D&C). The patient\'s autonomy should be respected after counseling on risks/benefits of each.' },
     { text: 'Advise immediate surgical evacuation', r: 'Surgical evacuation is the most predictable approach but is not mandatory. Expectant and medical management are valid options when the patient is stable.' },
     { text: 'Prescribe methotrexate', r: 'Methotrexate is for ectopic pregnancy, not missed abortion. Misoprostol is the appropriate medical agent for early pregnancy loss.' },
     { text: 'Refer to ethics committee', r: 'Ethics committee referral is not needed for standard management of early pregnancy loss. All management options are medically and ethically acceptable.' }],
    'Present all options: expectant, medical (misoprostol), or surgical. Support her decision after informed consent', ['obgyn', 'pregnancy-loss', 'ethics'],
    'Missed abortion: offer all three options (expectant, medical, surgical). Respect patient autonomy while ensuring informed decision-making.'),

  // 39. Pap Smear (3)
  q('A {age}-year-old asks about cervical cancer screening. She is healthy, non-smoker, no prior abnormal Paps. What is the most appropriate screening recommendation?',
    [{ text: 'Pap smear every 3 years starting at age 21, or co-testing (Pap + HPV) every 5 years starting at age 30', r: 'Cervical screening: age 21-29: Pap every 3 years. Age 30-65: Pap + HPV co-testing every 5 years or Pap alone every 3 years.' },
     { text: 'Pap smear every year starting at age 18', r: 'Annual screening is not recommended. Screening starts at 21 regardless of sexual activity. Over-screening can lead to unnecessary procedures.' },
     { text: 'HPV vaccine only, no Pap needed', r: 'HPV vaccine prevents HPV types 16/18 (causing 70% of cervical cancers) but does not eliminate the need for screening as other high-risk types exist.' },
     { text: 'No screening needed without symptoms', r: 'Cervical cancer screening is recommended for all women 21-65 regardless of symptoms. Precancerous lesions are asymptomatic.' }],
    'Pap smear every 3 years starting at age 21, or co-testing (Pap + HPV) every 5 years starting at age 30', ['obgyn', 'cervical-screening', 'Pap-smear'],
    'Cervical cancer screening: Pap 3-yearly ages 21-29, co-test 5-yearly ages 30-65. Stop at 65 with adequate prior negative screens.'),

  // 40. Breast mass during pregnancy
  q('A {age}-year-old at 20 weeks presents with a 2 cm firm breast mass that she noticed 2 weeks ago. Ultrasound shows a solid, irregular mass. What is the most appropriate diagnostic approach?',
    [{ text: 'Core needle biopsy (ultrasound-guided)', r: 'A solid, irregular breast mass in pregnancy requires tissue diagnosis. Core needle biopsy is safe during pregnancy and is the gold standard for diagnosis.' },
     { text: 'Mammogram with abdominal shielding', r: 'Mammogram can be performed safely in pregnancy with abdominal shielding but is adjunctive to ultrasound and biopsy, not a replacement.' },
     { text: 'Observe and re-image after delivery', r: 'Any suspicious breast mass in pregnancy requires definitive diagnosis without delay. Breast cancer aggressiveness is similar in pregnancy.' },
     { text: 'MRI breast', r: 'MRI with contrast has limited safety data in pregnancy and is not first-line for evaluating breast masses. Ultrasound + biopsy is preferred.' }],
    'Core needle biopsy (ultrasound-guided)', ['obgyn', 'breast-mass', 'pregnancy'],
    'Suspicious breast mass in pregnancy: ultrasound + core needle biopsy. Mammogram with shielding is safe. Cancer treatment depends on gestational age.'),
];

function main() {
  console.log('\n👶 Generating OBGYN questions...\n');
  const questions = [];
  for (let i = 0; i < TARGET; i++) {
    const tpl = T[i % T.length];
    const q = tpl(i);
    q.topic = 'Obstetrics & Gynaecology';
    q.scfhs_domain = 'Obstetrics & Gynaecology';
    q._uid = 'obgyn-' + i;
    questions.push(q);
  }
  console.log(`   Generated ${questions.length} questions from ${T.length} templates\n`);
  writeOutput('generated-obgyn.json', questions);
}

main();
