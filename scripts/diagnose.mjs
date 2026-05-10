import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(join(__dirname, '..', 'firebase-service-account.json'), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const snap = await db.collection('questions').limit(10).get();
const counts = { true: 0, false: 0, null: 0, missing: 0, other: 0 };

snap.docs.forEach(d => {
  const data = d.data();
  const val = data.image_reference;
  const type = typeof val;
  
  if (val === true) counts.true++;
  else if (val === false) counts.false++;
  else if (val === null) counts.null++;
  else if (val === undefined) counts.missing++;
  else counts.other++;
  
  console.log(`ID: ${d.id.slice(0,12)}  image_reference=${JSON.stringify(val)}  (${type})  keys: ${Object.keys(data).join(', ')}`);
});

console.log('\nValue distribution in sample:', counts);
