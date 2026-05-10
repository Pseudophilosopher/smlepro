/**
 * Grant 30-Day Complimentary Pro to All Existing Users
 *
 * This one-time migration script updates ALL existing user docs in Firestore
 * that don't already have premium access, granting them a 30-day free Pro trial.
 *
 * Usage:  node scripts/grant-existing-pro.mjs
 * Safety: Dry-run by default. Set DRY_RUN=false to actually write.
 *
 * Environment:  GOOGLE_APPLICATION_CREDENTIALS or firebase-admin auto-config
 */

const DRY_RUN = process.env.DRY_RUN !== 'false';

console.log(`\n🔐 SMLE Pro — Grant 30-Day Pro to Existing Users`);
console.log(`   Dry run: ${DRY_RUN ? 'YES (no writes)' : 'NO (will write to Firestore)'}\n`);

let admin;
try {
  admin = await import('firebase-admin');
  admin = admin.default || admin;
} catch (e) {
  console.error('❌ firebase-admin not installed. Run: npm install firebase-admin');
  console.error('   Error:', e.message);
  process.exit(1);
}

// Initialize — use existing service account or application default
if (admin.apps.length === 0) {
  try {
    admin.initializeApp({ projectId: 'smle-mock-exam-51478532-5ae31' });
  } catch (e) {
    console.error('❌ Failed to initialize Firebase Admin:', e.message);
    process.exit(1);
  }
}

const db = admin.firestore();
const now = new Date();
const proExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

async function main() {
  console.log(`📋 Scanning Firestore 'users' collection...\n`);

  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();

  if (snapshot.empty) {
    console.log('✅ No existing users found. Nothing to migrate.');
    return;
  }

  console.log(`👥 Found ${snapshot.size} existing user docs.\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const batchSize = 500;
  let batch = db.batch();
  let ops = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const hasPremium = data.isPremium === true;

    if (hasPremium) {
      // Skip users who already have premium (whether paid or already granted)
      console.log(`   ⏭️  SKIP  ${doc.id.padEnd(32)} already has premium (isPremium=true)`);
      skipped++;
      continue;
    }

    const updateData = {
      isPremium: true,
      proExpiresAt: proExpiresAt.toISOString(),
      complimentaryPro: true,
      complimentaryGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
      displayName: data.displayName || data.email || '',
    };

    if (DRY_RUN) {
      console.log(`   📋 DRY   ${doc.id.padEnd(32)} → isPremium: true, expires: ${proExpiresAt.toISOString().slice(0, 10)}`);
    } else {
      batch.set(doc.ref, updateData, { merge: true });
      ops++;
      console.log(`   ✅ QUEUE ${doc.id.padEnd(32)} → 30-day Pro granted`);
    }

    updated++;

    // Write in batches of 500 (Firestore limit)
    if (!DRY_RUN && ops >= batchSize) {
      await batch.commit();
      console.log(`   📦 Committed batch of ${ops} writes`);
      batch = db.batch();
      ops = 0;
    }
  }

  // Final batch commit
  if (!DRY_RUN && ops > 0) {
    await batch.commit();
    console.log(`   📦 Committed final batch of ${ops} writes`);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Summary:`);
  console.log(`   Updated:  ${updated}`);
  console.log(`   Skipped:  ${skipped}`);
  console.log(`   Errors:   ${errors}`);
  console.log(`   Mode:     ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (DRY_RUN) {
    console.log(`⚠️  This was a dry run. Set DRY_RUN=false to execute:\n`);
    console.log(`   DRY_RUN=false node scripts/grant-existing-pro.mjs`);
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
