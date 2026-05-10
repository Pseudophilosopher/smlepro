/**
 * Maps raw Firestore question.topic strings → dashboard specialty drill card IDs.
 * The bank and SCFHS-style labels often differ from the short UI labels (e.g.
 * "Emergency Medicine" vs "Emergency").
 */

/**
 * Session / analytics bucketing only.
 * REVERSE must map each raw topic to exactly one bucket.
 * Firestore `in` query expansion lives in `functions/topic-synonyms.js`.
 */
export const DRILL_TOPIC_SYNONYMS = {
  'Internal Medicine': ['Internal Medicine'],
  Gastroenterology: [
    'Gastroenterology',
    'Internal Medicine – Gastroenterology',
    'Internal Medicine - Gastroenterology',
    'Surgery – Gastroenterology',
    'Surgery - Gastroenterology',
  ],
  Nephrology: [
    'Nephrology',
    'Renal Medicine',
    'Internal Medicine – Nephrology',
    'Internal Medicine - Nephrology',
    'Internal Medicine – Renal Medicine',
    'Internal Medicine - Renal Medicine',
  ],
  Endocrinology: [
    'Endocrinology',
    'Internal Medicine – Endocrinology',
    'Internal Medicine - Endocrinology',
  ],
  Neurology: [
    'Neurology',
    'Internal Medicine – Neurology',
    'Internal Medicine - Neurology',
  ],
  Psychiatry: [
    'Psychiatry',
    'Internal Medicine – Psychiatry',
    'Internal Medicine - Psychiatry',
  ],
  Dermatology: [
    'Dermatology',
    'Internal Medicine – Dermatology',
    'Internal Medicine - Dermatology',
  ],
  Hematology: [
    'Hematology',
    'Internal Medicine – Hematology',
    'Internal Medicine - Hematology',
  ],
  Rheumatology: [
    'Rheumatology',
    'Internal Medicine – Rheumatology',
    'Internal Medicine - Rheumatology',
  ],
  'Infectious Diseases': [
    'Infectious Diseases',
    'Internal Medicine – Infectious Diseases',
    'Internal Medicine - Infectious Diseases',
  ],
  Immunology: [
    'Immunology',
    'Internal Medicine – Immunology',
    'Internal Medicine - Immunology',
  ],
  Pharmacology: [
    'Pharmacology',
    'Internal Medicine – Pharmacology',
    'Internal Medicine - Pharmacology',
  ],
  Surgery: ['Surgery'],
  Orthopedics: [
    'Orthopedics',
    'Surgery – Orthopedics',
    'Surgery - Orthopedics',
  ],
  Ophthalmology: [
    'Ophthalmology',
    'Surgery – Ophthalmology',
    'Surgery - Ophthalmology',
  ],
  ENT: [
    'ENT',
    'Surgery – ENT',
    'Surgery - ENT',
  ],
  Urology: [
    'Urology',
    'Surgery – Urology',
    'Surgery - Urology',
  ],
  Pediatrics: ['Pediatrics'],
  OBGYN: [
    'OBGYN',
    'Obstetrics & Gynaecology',
    'Obstetrics and Gynaecology',
  ],
  'Emergency Medicine': [
    'Emergency Medicine',
    'Emergency',
    'Emergency Medicine – Critical Care',
    'Emergency Medicine - Critical Care',
    'Critical Care',
    'Toxicology',
    'Emergency Medicine – Toxicology',
    'Emergency Medicine - Toxicology',
  ],
  'Family Medicine': [
    'Family Medicine',
    'Public Health',
    'Family & Community Medicine',
    'Family and Community Medicine',
  ],
  Ethics: [
    'Ethics',
    'Medical Ethics',
    'Medical Ethics & Professionalism',
    'Medical Ethics and Professionalism',
  ],
  Pathology: ['Pathology'],
  Radiology: ['Radiology'],
  'Forensic Medicine': ['Forensic Medicine'],
};

const REVERSE = new Map();
for (const [bucket, list] of Object.entries(DRILL_TOPIC_SYNONYMS)) {
  for (const raw of list) {
    REVERSE.set(raw.trim(), bucket);
  }
}

/**
 * @param {string} [raw] - value from question.topic or session topicStats key
 * @returns {string} Dashboard drill bucket id (same as category card data-topic)
 */
export function topicToDrillBucket(raw) {
  if (!raw || typeof raw !== 'string') return 'General';
  const t = raw.trim();
  if (REVERSE.has(t)) return REVERSE.get(t);
  return t;
}
