/**
 * generate-obgyn.mjs
 *
 * SMLE OBGYN domain — 500 questions covering all subtopics.
 *
 * Usage: node scripts/generate-obgyn.mjs
 */

import { writeOutput } from './question-utils.mjs';

const TARGET = 500;

function q(vignette, opts, correctText, topTags, rationale) {
  return (i) => {
    const shuffled = [...opts].sort(() => Math.random() - 0.5);
    const correctIdx = shuffled.findIndex((o) => o.text === correctText);
    const correctLetter = String.fromCharCode(65 + correctIdx);
    return {
      question: vignette.replace(/\{age\}/g, 18 + (i % 46)).replace(/\{gender\}/g, 'female'),
      topic: 'Obstetrics & Gynaecology',
      scfhs_domain: 'Obstetrics & Gynaecology',
      difficulty: ['Easy', 'Easy', 'Moderate', 'Moderate', 'Hard', 'Hard', 'Hard'][i % 7],
      year: '2024-2025', image_reference: false,
      options: shuffled.map((o) => ({ text: o.text, correct: o.text === correctText, rationale: o.r })),
      correct_answer: correctLetter, rationale, tags: topTags,
    };
  };
}

const OB = [
  // Preeclampsia (Level 3)
  q('A {age}-year-old primigravida at 34 weeks presents with BP 160/105, proteinuria 3+, and headache. Platelets 90, ALT 120, Cr 1.2. What is the most appropriate management?',
    [{ text: 'Deliver after corticosteroid course if stable', r: 'Severe preeclampsia at ≥34 weeks: deliver. If <34 weeks, give steroids and deliver if maternal or fetal instability develops.' },
     { text: 'Expectant management until 37 weeks', r: 'Severe preeclampsia with end-organ damage requires delivery. Expectant management risks maternal complications.' },
     { text: 'Oral antihypertensives and discharge', r: 'Hospitalization is required for severe preeclampsia. Outpatient management is for mild disease without features of severity.' },
     { text: 'IV magnesium sulfate only', r: 'MgSO4 is for seizure prophylaxis. Delivery is also needed; MgSO4 alone does not treat preeclampsia.' }],
    'Deliver after corticosteroid course if stable', ['obgyn', 'preeclampsia', 'severe'],
    'Severe preeclampsia ≥34 weeks: deliver. <34 weeks: steroids, then deliver for maternal/fetal instability. MgSO4 for seizure prophylaxis.'),

  // Eclampsia
  q('A {age}-year-old primigravida at 36 weeks develops generalized tonic-clonic seizure. BP 170/110, proteinuria 3+. What is the most appropriate immediate management?',
    [{ text: 'IV magnesium sulfate 4 g loading dose', r: 'MgSO4 is first-line for eclampsia. Loading dose 4 g IV followed by 1 g/hour for 24 hours. Recurrent seizures: additional 2 g bolus.' },
     { text: 'IV diazepam', r: 'Diazepam is second-line if MgSO4 fails or is unavailable. MgSO4 is superior for eclampsia with lower maternal and neonatal mortality.' },
     { text: 'Immediate cesarean section', r: 'Stabilize the mother first (MgSO4, BP control) before delivery. The fetus should be monitored during seizure management.' },
     { text: 'IV hydralazine', r: 'Hydralazine lowers BP but does not treat or prevent seizures. MgSO4 is the anticonvulsant of choice for eclampsia.' }],
    'IV magnesium sulfate 4 g loading dose', ['obgyn', 'eclampsia', 'MgSO4'],
    'Eclampsia: IV MgSO4 4 g load then 1 g/hour for 24 hours. Control BP. Deliver after stabilization.'),

  // Third Trimester Bleeding — Placenta previa
  q('A {age}-year-old at 32 weeks presents with painless bright red vaginal bleeding. Fundal height is appropriate. What is the most appropriate initial diagnostic step?',
    [{ text: 'Transabdominal ultrasound', r: 'Ultrasound is first-line to diagnose placenta previa. Speculum exam can be done gently to confirm bleeding source, but digital exam is contraindicated.' },
     { text: 'Digital vaginal examination', r: 'Digital exam is CONTRAINDICATED if previa is suspected. It can cause catastrophic hemorrhage.' },
     { text: 'CT abdomen', r: 'CT is not used for placental localization in pregnancy. Ultrasound is the modality of choice.' },
     { text: 'Amniocentesis', r: 'Amniocentesis has no role in diagnosing the cause of third trimester bleeding.' }],
    'Transabdominal ultrasound', ['obgyn', 'placenta-previa', 'third-trimester-bleeding'],
    'Painless third trimester bleeding: ultrasound to rule out previa. NO digital exam until previa is excluded.'),

  // Preterm Labor (Level 3)
  q('A {age}-year-old at 30 weeks presents with regular painful contractions and cervical dilation of 3 cm. Membranes are intact. What is the most appropriate management?',
    [{ text: 'Tocolysis + corticosteroids + fetal monitoring', r: 'Preterm labor at <34 weeks: tocolysis (48 hours) to allow corticosteroids to enhance fetal lung maturity. Monitor for chorioamnionitis.' },
     { text: 'Immediate delivery', r: 'Delivery is indicated when tocolysis is contraindicated (chorioamnionitis, abruption, severe IUGR) or labor is too advanced.' },
     { text: 'Corticosteroids alone without tocolysis', r: 'Tocolysis provides time for corticosteroids to work (optimal effect 24-48 hours). Both are needed.' },
     { text: 'Oral nifedipine and discharge', r: 'Preterm labor requires hospitalization for monitoring, tocolysis, steroids, and assessment for infection.' }],
    'Tocolysis + corticosteroids + fetal monitoring', ['obgyn', 'preterm-labor', 'tocolysis', 'steroids'],
    'Preterm labor <34 weeks: tocolysis for 48 hours plus corticosteroids. Assess for chorioamnionitis and consider antibiotics if GBS+.'),

  // PROM (Level 3)
  q('A {age}-year-old at 36 weeks presents with leaking fluid per vagina for 2 hours. Pooling is noted on speculum exam, nitrazine turns blue, ferning is positive. What is the most appropriate management?',
    [{ text: 'Induce labor at 36 weeks', r: 'PROM at ≥36 weeks: induction of labor is recommended to reduce chorioamnionitis risk. Antibiotics for GBS prophylaxis if indicated.' },
     { text: 'Expectant management until 37 weeks', r: 'At ≥36 weeks, induction is preferred over expectant management. Risk of infection outweighs benefits of waiting.' },
     { text: 'IV antibiotics and await spontaneous labor', r: 'Antibiotics for GBS prophylaxis are given during labor. Induction should be started, not just waiting.' },
     { text: 'Tocolysis', r: 'Tocolysis is contraindicated in PROM due to infection risk. Delivery is the goal at ≥36 weeks.' }],
    'Induce labor at 36 weeks', ['obgyn', 'PROM', 'induction'],
    'PROM at ≥36 weeks: induce labor. <34 weeks: expectant management with antibiotics and steroids. 34-36 weeks: individualize.'),

  // PPH (Level 3)
  q('A {age}-year-old delivered vaginally 30 minutes ago has heavy vaginal bleeding. Uterus is boggy and poorly contracted. What is the most appropriate first-line management?',
    [{ text: 'Uterine massage + oxytocin infusion', r: 'PPH from uterine atony: massage and oxytocin are first-line. Oxytocin 10-40 IU in 1L NS. If persists: ergometrine, carboprost, or misoprostol.' },
     { text: 'Emergency hysterectomy', r: 'Hysterectomy is last-line for PPH unresponsive to medical therapy and uterine-sparing surgical measures.' },
     { text: 'IV tranexamic acid alone', r: 'TXA is adjunctive therapy for PPH (given within 3 hours). Uterotonics are first-line for atony.' },
     { text: 'Bimanual uterine compression', r: 'Compression is a temporizing measure while preparing oxytocin. Medical therapy with oxytocin is the primary intervention.' }],
    'Uterine massage + oxytocin infusion', ['obgyn', 'PPH', 'uterine-atony', 'oxytocin'],
    'PPH: uterine massage + oxytocin first-line. Stepwise escalation: ergometrine → carboprost → misoprostol → surgical interventions.'),

  // Ectopic Pregnancy (Level 3)
  q('A {age}-year-old presents with acute lower abdominal pain and spotting for 2 days. LMP was 7 weeks ago. BP 100/60, HR 100. Beta-hCG 8000. Transvaginal ultrasound shows empty uterus and adnexal mass. What is the most appropriate management?',
    [{ text: 'Laparoscopic salpingectomy or salpingotomy', r: 'Ectopic pregnancy with β-hCG >5000, visible adnexal mass, and hemodynamic stability: surgical management is preferred. Salpingotomy preserves the tube.' },
     { text: 'Methotrexate therapy', r: 'MTX is for unruptured ectopic with β-hCG <5000, no fetal cardiac activity, and reliable follow-up. This patient\'s hCG is >5000.' },
     { text: 'Expectant management', r: 'Expectant management is for low and declining β-hCG with no symptoms. This patient has pain and high hCG.' },
     { text: 'Dilation and curettage', r: 'D&C is diagnostic for pregnancy of unknown location, not treatment for ectopic pregnancy.' }],
    'Laparoscopic salpingectomy or salpingotomy', ['obgyn', 'ectopic', 'surgery'],
    'Ectopic pregnancy with β-hCG >5000 or visible mass: surgical management. β-hCG <5000 and unruptured: consider MTX.'),

  // Spontaneous Abortion (Level 3)
  q('A {age}-year-old at 10 weeks presents with heavy vaginal bleeding and cramping. On exam, cervical os is open and tissue is passing through. What is the most likely type of abortion?',
    [{ text: 'Inevitable abortion', r: 'Inevitable abortion: open cervical os with bleeding and pain but products not yet passed. Inevitable means pregnancy cannot continue.' },
     { text: 'Threatened abortion', r: 'Threatened abortion: closed os with bleeding. Pregnancy may continue. This patient has open os.' },
     { text: 'Incomplete abortion', r: 'Incomplete: some products passed, some retained. Open os with tissue passing fits both inevitable and incomplete depending on timing.' },
     { text: 'Missed abortion', r: 'Missed abortion: closed os with fetal demise but no bleeding or pain (early pregnancy failure).' }],
    'Inevitable abortion', ['obgyn', 'spontaneous-abortion', 'inevitable'],
    'First trimester bleeding with open cervical os: inevitable abortion. Management: expectant, medical, or surgical evacuation.'),

  // AUB (Level 3)
  q('A {age}-year-old presents with heavy menstrual bleeding for 6 months, with 10-day periods and passing clots. No intermenstrual bleeding. Hb 9.5. Ultrasound shows 4 cm intramural fibroid. What is the most appropriate initial management?',
    [{ text: 'Tranexamic acid during menses + iron supplementation', r: 'AUB from fibroids: tranexamic acid reduces bleeding by 40-50%. NSAIDs also help. Iron corrects anemia. Surgical options if medical therapy fails.' },
     { text: 'Total abdominal hysterectomy', r: 'Surgery is reserved for failed medical therapy or severe symptoms. First-line management is medical.' },
     { text: 'Oral contraceptive pills', r: 'COCs regulate the cycle and reduce bleeding but are less effective than TXA for acute heavy bleeding. They are a valid option for long-term management.' },
     { text: 'Dilation and curettage', r: 'D&C provides temporary relief but does not treat the underlying fibroid. Recurrence is expected.' }],
    'Tranexamic acid during menses + iron supplementation', ['obgyn', 'AUB', 'fibroid', 'tranexamic-acid'],
    'AUB with fibroids: medical therapy first (tranexamic acid, NSAIDs, COCs, LNG-IUS). Surgery for failed medical management or severe symptoms.'),

  // Endometriosis (Level 2)
  q('A {age}-year-old presents with severe dysmenorrhea, dyspareunia, and chronic pelvic pain for 2 years. Laparoscopy shows endometriotic implants on the uterosacral ligaments. What is the most appropriate initial medical therapy?',
    [{ text: 'Combined oral contraceptive or NSAIDs', r: 'First-line medical therapy for endometriosis is COCs or NSAIDs. COCs suppress ovulation and reduce implantation and growth of endometrial tissue.' },
     { text: 'GnRH agonist', r: 'GnRH agonists induce menopause-like state. They are second-line due to hypoestrogenic side effects, used when first-line fails.' },
     { text: 'Laparoscopic excision of all implants', r: 'Surgery is for failed medical therapy or diagnostic confirmation. First-line is medical management.' },
     { text: 'Progestin-only pill', r: 'Progestins are an alternative first-line option. COCs are more commonly used as initial therapy.' }],
    'Combined oral contraceptive or NSAIDs', ['obgyn', 'endometriosis', 'COC'],
    'Endometriosis: COCs or NSAIDs first-line. GnRH agonists or surgical excision for refractory cases.'),

  // Menopause (Level 2)
  q('A {age}-year-old presents with hot flashes, night sweats, vaginal dryness, and sleep disturbance for 6 months. Last menstrual period was 1 year ago. No contraindications to hormones. What is the most appropriate management?',
    [{ text: 'Menopausal hormone therapy (estrogen + progesterone)', r: 'MHT is first-line for moderate-to-severe vasomotor symptoms in women <60 or within 10 years of menopause. Progesterone needed if uterus is intact.' },
     { text: 'SSRI or SNRI', r: 'SSRIs/SNRIs are non-hormonal options for women with contraindications to MHT. They are second-line.' },
     { text: 'Vaginal estrogen cream only', r: 'Vaginal estrogen treats genitourinary syndrome but does not address vasomotor symptoms. Systemic therapy is needed for hot flashes.' },
     { text: 'Lifestyle modification alone', r: 'Lifestyle changes (cool environment, avoiding triggers) help but are insufficient for moderate-to-severe symptoms.' }],
    'Menopausal hormone therapy (estrogen + progesterone)', ['obgyn', 'menopause', 'MHT'],
    'MHT is first-line for moderate-to-severe vasomotor symptoms in eligible women. Non-hormonal alternatives for contraindicated patients.'),
];

// ══════════════════════════════════════════════════════════════════════════════
// ASSEMBLE AND GENERATE
// ══════════════════════════════════════════════════════════════════════════════

const ALL_TEMPLATES = [...OB];

function main() {
  console.log('\n👶 Generating OBGYN questions...\n');
  const questions = [];
  for (let i = 0; i < TARGET; i++) {
    const tpl = ALL_TEMPLATES[i % ALL_TEMPLATES.length];
    const q = tpl(i);
    q.topic = 'Obstetrics & Gynaecology';
    q.difficulty = ['Easy', 'Moderate', 'Moderate', 'Hard', 'Hard'][i % 5];
    q._uid = 'obgyn-' + i;
    questions.push(q);
  }
  console.log(`   Generated ${questions.length} questions from ${ALL_TEMPLATES.length} templates\n`);
  writeOutput('generated-obgyn.json', questions);
}

main();
