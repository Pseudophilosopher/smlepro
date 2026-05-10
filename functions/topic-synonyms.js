/**
 * Firestore `topic` values for getQuizQuestions `in` filters.
 * Each bucket maps to all raw topic strings that should be included when a user
 * selects that specialty in the dashboard.
 *
 * IMPORTANT: Keep this in sync with src/topic-drill-buckets.js
 */

module.exports.DRILL_TOPIC_SYNONYMS = {
  'Internal Medicine': ['Internal Medicine'],
  Cardiology: [
    'Cardiology',
    'Internal Medicine – Cardiology',
    'Internal Medicine - Cardiology',
  ],
  Pulmonology: [
    'Pulmonology',
    'Internal Medicine – Pulmonology',
    'Internal Medicine - Pulmonology',
    'Pulmonary',
  ],
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
    'Medical Ethics & Professionalism',
    'Medical Ethics and Professionalism',
  ],
};
