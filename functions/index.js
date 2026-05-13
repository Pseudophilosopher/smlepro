const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { DRILL_TOPIC_SYNONYMS } = require("./topic-synonyms");
const { redactQuestionList } = require("./redact-question-images");
const { generateImagePlanFromData, sleep } = require("./gemini-image-plan");
const { getProvider } = require("./ai-provider");
const { generateQuestion } = require("./generate-question-agent");
const { moyasarWebhook } = require("./webhook-handler");

admin.initializeApp();

const db = admin.firestore();

/** SMTP config for sending invoice emails — set secrets via `firebase functions:secrets:set` */
const SMTP_HOST = defineSecret("SMTP_HOST");
const SMTP_PORT = defineSecret("SMTP_PORT");
const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");
const INVOICE_FROM_EMAIL = defineSecret("INVOICE_FROM_EMAIL");
const INVOICE_FROM_NAME = "SMLE Pro";

/** Amount in halalas → plan title mapping */
const PLAN_TITLES = {
  100:   "تجربة SMLE Pro (١ ساعة)",
  14900: "شهر واحد",
  34900: "٣ أشهر",
  54900: "٦ أشهر",
  79900: "١٢ شهرًا",
};

/** YYYY-MM-DD and hour 0–23 in Asia/Riyadh (matches Daily Dose / admin charts). */
function getRiyadhDateAndHour(d = new Date()) {
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
  }).format(d);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(d);
  const hour = parseInt(parts.find((p) => p.type === "hour").value, 10);
  return { dateStr, hour };
}

/** Must match `ADMIN_EMAIL` in `src/operator-config.js` — only this account may grant complimentary Pro. */
const ADMIN_OPERATOR_EMAIL = "ohgzzz11@gmail.com";

const moyasarSecretKey = defineSecret("MOYASAR_SECRET_KEY");
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const ALLOWED_AMOUNTS = new Set([100, 14900, 34900, 54900, 79900]);
const EXPECTED_CURRENCY = "SAR";

exports.verifyMoyasarPayment = onCall(
  {
    region: "us-central1",
    secrets: [moyasarSecretKey],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const uid = request.auth.uid;
    const paymentId = request.data?.paymentId;

    if (typeof paymentId !== "string" || paymentId.trim().length < 6) {
      throw new HttpsError("invalid-argument", "Invalid paymentId.");
    }

    const normalizedPaymentId = paymentId.trim();
    const paymentRef = db.collection("payments").doc(normalizedPaymentId);
    const userRef = db.collection("users").doc(uid);

    return db.runTransaction(async (tx) => {
      const existingPayment = await tx.get(paymentRef);
      if (existingPayment.exists) {
        const data = existingPayment.data() || {};

        if (data.uid !== uid) {
          throw new HttpsError("permission-denied", "Payment already linked to another user.");
        }

        if (data.verified === true) {
          return { ok: true, reused: true };
        }
      }
      const secret = moyasarSecretKey.value();
      const credentials = Buffer.from(`${secret}:`).toString("base64");

      // Try to fetch as a payment ID first
      let payment = await fetchMoyasarPayment(normalizedPaymentId, credentials);

      // If that fails, try to fetch as an invoice ID and extract the payment
      if (!payment) {
        payment = await fetchMoyasarPaymentFromInvoice(normalizedPaymentId, credentials);
      }

      if (!payment) {
        logger.error("Moyasar verification failed — not a valid payment or invoice ID", {
          paymentId: normalizedPaymentId,
        });
        throw new HttpsError("failed-precondition", "Unable to verify payment. The payment ID may still be processing.");
      }

      if (payment.status !== "paid") {
        throw new HttpsError("failed-precondition", "Payment is not paid.");
      }

      if (!ALLOWED_AMOUNTS.has(payment.amount)) {
        throw new HttpsError("failed-precondition", "Payment amount is invalid.");
      }

      if (payment.currency !== EXPECTED_CURRENCY) {
        throw new HttpsError("failed-precondition", "Payment currency is invalid.");
      }

      const paymentDescription = typeof payment.description === "string" ? payment.description : "";
      const userTag = `UID:${uid}`;
      if (!paymentDescription.includes(userTag)) {
        throw new HttpsError("permission-denied", "Payment does not belong to this user.");
      }

      tx.set(
        paymentRef,
        {
          uid,
          verified: true,
          provider: "moyasar",
          amount: payment.amount ?? null,
          currency: payment.currency ?? null,
          status: payment.status,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Determine if this is a test plan (1 SAR = 100 halalas) — grant 1-hour access
      const isTestPlan = payment.amount === 100;
      const proExpiresAt = isTestPlan
        ? admin.firestore.Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)) // 1 hour
        : null;

      const userUpdates = {
        isPremium: true,
        moyasarPaymentId: normalizedPaymentId,
        upgradedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (isTestPlan) {
        userUpdates.proExpiresAt = proExpiresAt;
        userUpdates.testPlan = true;
      }

      tx.set(userRef, userUpdates, { merge: true });

      // Stamp a custom claim so Firestore rules & Cloud Functions can verify
      // Pro status directly from the JWT — no extra Firestore read required.
      await admin.auth().setCustomUserClaims(uid, { isPro: true });

      return { ok: true, reused: false, isTestPlan };
    });
  }
);

/**
 * Grant Pro access to a friend (no payment). Target must already have a Firebase Auth account.
 * Sets Firestore `isPremium` + custom claim `isPro` (same path as paid upgrades).
 * Admin-only; enforced by caller email on the ID token.
 */
exports.grantComplimentaryPro = onCall({ region: "us-central1" }, async (request) => {
  if (request.auth?.token?.email !== ADMIN_OPERATOR_EMAIL) {
    throw new HttpsError("permission-denied", "Admin only.");
  }

  const raw = typeof request.data?.email === "string" ? request.data.email.trim().toLowerCase() : "";
  if (!raw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    throw new HttpsError("invalid-argument", "Valid friend email required.");
  }

  const durationDays = typeof request.data?.durationDays === "number" ? request.data.durationDays : 30;
  const validDurations = [0, 7, 14, 30, 60, 90, 180, 365];
  if (!validDurations.includes(durationDays)) {
    throw new HttpsError("invalid-argument", "Invalid duration. Use 0 (forever), 7, 14, 30, 60, 90, 180, or 365 days.");
  }

  let targetUser;
  try {
    targetUser = await admin.auth().getUserByEmail(raw);
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      throw new HttpsError(
        "not-found",
        "No account with that email yet — ask them to sign up first, then grant again."
      );
    }
    logger.error("grantComplimentaryPro getUserByEmail", { message: e.message });
    throw new HttpsError("internal", "Could not look up user.");
  }

  const uid = targetUser.uid;
  const userRef = db.collection("users").doc(uid);

  const updates = {
    isPremium: true,
    complimentaryPro: true,
    complimentaryGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (durationDays > 0) {
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000));
    updates.proExpiresAt = expiresAt;
  } else {
    // Forever: clear any existing expiry
    updates.proExpiresAt = null;
  }

  await userRef.set(updates, { merge: true });

  await admin.auth().setCustomUserClaims(uid, { isPro: true });

  logger.info("Complimentary Pro granted", { 
    admin: request.auth.token.email, 
    targetUid: uid, 
    targetEmail: raw, 
    durationDays,
    expiresAt: durationDays > 0 ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() : null
  });

  return { 
    ok: true, 
    uid, 
    email: raw, 
    expiresAt: durationDays > 0 ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() : null 
  };
});

/**
 * Remove complimentary Pro only (does not touch paid Moyasar upgrades).
 */
exports.revokeComplimentaryPro = onCall({ region: "us-central1" }, async (request) => {
  if (request.auth?.token?.email !== ADMIN_OPERATOR_EMAIL) {
    throw new HttpsError("permission-denied", "Admin only.");
  }

  const raw = typeof request.data?.email === "string" ? request.data.email.trim().toLowerCase() : "";
  if (!raw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    throw new HttpsError("invalid-argument", "Valid email required.");
  }

  let targetUser;
  try {
    targetUser = await admin.auth().getUserByEmail(raw);
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "No account with that email.");
    }
    throw new HttpsError("internal", "Could not look up user.");
  }

  const uid = targetUser.uid;
  const userRef = db.collection("users").doc(uid);
  const snap = await userRef.get();
  const d = snap.exists ? snap.data() || {} : {};

  if (d.complimentaryPro !== true) {
    throw new HttpsError(
      "failed-precondition",
      "This account was not granted complimentary Pro (nothing to revoke here)."
    );
  }

  if (d.moyasarPaymentId) {
    throw new HttpsError(
      "failed-precondition",
      "User has a paid upgrade on file — do not revoke via this tool. Use Firebase Console if you must adjust access."
    );
  }

  await userRef.set(
    {
      isPremium: false,
      complimentaryPro: false,
      proExpiresAt: null, // Clear expiry since Pro is revoked
      complimentaryRevokedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await admin.auth().setCustomUserClaims(uid, { isPro: false });

  logger.info("Complimentary Pro revoked", { admin: request.auth.token.email, targetUid: uid, targetEmail: raw });

  return { ok: true, uid, email: raw };
});

/**
 * Records one “active user” ping for the current hour (Asia/Riyadh) in metadata/site_stats.
 * Each user counts at most once per hour (deduped via presence_hour_marks/{uid}_{date}_{hour}).
 * Callable from the web app after sign-in — Admin Stats charts activeUsersByHourToday.
 */
exports.recordHourlyPresence = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  if (request.auth.token.firebase?.sign_in_provider === "anonymous") {
    throw new HttpsError("permission-denied", "Registered accounts only.");
  }

  const uid = request.auth.uid;
  const { dateStr, hour } = getRiyadhDateAndHour();
  const markId = `${uid}_${dateStr}_${hour}`;
  const markRef = db.collection("presence_hour_marks").doc(markId);
  const statsRef = db.collection("metadata").doc("site_stats");

  await db.runTransaction(async (tx) => {
    const markSnap = await tx.get(markRef);
    if (markSnap.exists) {
      return;
    }

    const statsSnap = await tx.get(statsRef);
    const prev = statsSnap.exists ? statsSnap.data() || {} : {};

    let arr =
      Array.isArray(prev.activeUsersByHourToday) && prev.hourlyActivityDate === dateStr
        ? [...prev.activeUsersByHourToday]
        : Array(24).fill(0);
    if (arr.length !== 24) {
      arr = Array(24).fill(0);
    }
    arr[hour] = (Number(arr[hour]) || 0) + 1;

    tx.set(markRef, {
      uid,
      hourlyActivityDate: dateStr,
      hour,
      at: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(
      statsRef,
      {
        hourlyActivityDate: dateStr,
        activeUsersByHourToday: arr,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  return { ok: true, date: dateStr, hour };
});

// ── Daily Dose Generator — runs every night at midnight Riyadh time ─────────
// Uses the same date-seeded deterministic shuffle as the client-side fallback
// so results are consistent whether this runs automatically or the admin script runs manually.
exports.generateDailyDose = onSchedule(
  {
    schedule: "every day 00:00",
    timeZone: "Asia/Riyadh",
    region: "us-central1",
  },
  async () => {
    const db = admin.firestore();

    // Get today's date in YYYY-MM-DD based on Riyadh time
    const targetDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
    }).format(new Date());

    logger.info(`[Daily Dose] Generating for ${targetDate}`);

    // Roll daily counters, hourly buckets, and weekly-new-user window at midnight.
    const statsRef = db.collection("metadata").doc("site_stats");
    const prevStats = await statsRef.get();
    let weeklyNewUsers = Array(7).fill(0);
    if (prevStats.exists) {
      const prev = prevStats.data() || {};
      if (Array.isArray(prev.weeklyNewUsers) && prev.weeklyNewUsers.length === 7) {
        weeklyNewUsers = [...prev.weeklyNewUsers.slice(1), 0];
      }
    }
    await statsRef.set(
      {
        hourlyActivityDate: targetDate,
        activeUsersByHourToday: Array(24).fill(0),
        questionsAnsweredToday: 0,
        dailyDoseCompletionsToday: 0,
        weeklyNewUsers,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    logger.info(`[Daily Dose] Daily counters and hourly buckets reset for ${targetDate}.`);

    // Avoid overwriting an existing document (e.g. admin manually ran the script)
    const docRef = db.collection("daily_doses").doc(targetDate);
    const existing = await docRef.get();
    if (existing.exists) {
      logger.info(`[Daily Dose] ${targetDate} already exists — skipping.`);
      return;
    }

    // Fetch full question pool
    const snapshot = await db.collection("questions").get();
    if (snapshot.empty) {
      logger.error("[Daily Dose] No questions found — aborting.");
      return;
    }
    const allQuestions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (allQuestions.length < 30) {
      logger.error(`[Daily Dose] Only ${allQuestions.length} questions — need at least 30.`);
      return;
    }

    // Date-seeded deterministic shuffle (mulberry32 — matches client + admin script)
    const seed = parseInt(targetDate.replace(/-/g, ""), 10);
    function seededRandom(s) {
      return function () {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    const rng = seededRandom(seed);
    const shuffled = [...allQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selected = shuffled.slice(0, 30);

    // Shuffle MCQ options within each question (bank data often marks index 1 as correct).
    selected.forEach((q) => {
      if (!Array.isArray(q.options) || q.options.length < 2) return;
      for (let i = q.options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
      }
    });

    await docRef.set({
      questions: redactQuestionList(selected),
      theme: null,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      totalQuestions: selected.length,
    });

    logger.info(`[Daily Dose] ✅ Written ${selected.length} questions for ${targetDate}.`);
  }
);

// ── Question fetcher — enforces per-tier limits server-side ──────────────────
// Replaces direct client Firestore reads so the questions collection can be
// locked to write-only from the client, eliminating bulk-scraping via SDK.
//
// Free tier  : max 10 questions per call
// Pro tier   : max 100 questions per call
// Anonymous  : blocked (daily dose uses daily_doses collection instead)
exports.getQuizQuestions = onCall(
  { region: "us-central1" },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const uid        = request.auth.uid;
    const isAnon     = request.auth.token.firebase?.sign_in_provider === "anonymous";

    if (isAnon) {
      throw new HttpsError("permission-denied", "Create a free account to access the question bank.");
    }

    const { topic, count } = request.data || {};
    const requested = Math.max(1, parseInt(count) || 10);

    // Check custom claim first (fast JWT check), fall back to Firestore for
    // users who upgraded before custom claims were introduced.
    let isPro = request.auth.token.isPro === true;
    if (!isPro) {
      const userSnap = await db.collection("users").doc(uid).get();
      isPro = userSnap.exists && userSnap.data()?.isPremium === true;
      // Backfill missing custom claim silently
      if (isPro) {
        admin.auth().setCustomUserClaims(uid, { isPro: true }).catch(() => {});
      }
    }

    // Hard server-side cap — client-side UI limits are just UX, not security
    const maxAllowed = isPro ? 100 : 10;
    const safeCount  = Math.min(requested, maxAllowed);

    // Fetch a wider pool then shuffle so users don't always get the same Qs
    const fetchLimit  = Math.min(safeCount * 4, 400);
    const cleanTopic  = typeof topic === "string" ? topic.trim() : "";
    const useFilter   = cleanTopic && cleanTopic !== "Mixed/All" && cleanTopic !== "All Topics";

    /** Same topic bucket as dashboard drill cards (see src/topic-drill-buckets.js). */
    const topicVariants = useFilter && DRILL_TOPIC_SYNONYMS[cleanTopic]
      ? DRILL_TOPIC_SYNONYMS[cleanTopic]
      : useFilter
        ? [cleanTopic]
        : [];

    const snap = await (!useFilter
      ? db.collection("questions").limit(fetchLimit).get()
      : topicVariants.length === 1
        ? db.collection("questions").where("topic", "==", topicVariants[0]).limit(fetchLimit).get()
        : db.collection("questions").where("topic", "in", topicVariants).limit(fetchLimit).get());

    if (snap.empty) {
      throw new HttpsError("not-found", "No questions found for the requested topic.");
    }

    const pool = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Fisher-Yates server-side shuffle of questions
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Shuffle options within each question so the correct answer isn't
    // always in the same position (AI generators tend to favour option B).
    // Safe because the correct answer is identified by opt.correct === true,
    // not by array index.
    pool.forEach(q => {
      if (!Array.isArray(q.options) || q.options.length < 2) return;
      for (let i = q.options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
      }
    });

    return { questions: redactQuestionList(pool.slice(0, safeCount)) };
  }
);

// ── AI image plan (Gemini) — admin only; writes `ai_image_plan` on `questions/{id}` ──
// Set secret once:  firebase functions:secrets:set GEMINI_API_KEY
exports.generateImagePlan = onCall(
  {
    region: "us-central1",
    secrets: [geminiApiKey],
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async (request) => {
    const email = (request.auth?.token?.email || "").trim().toLowerCase();
    if (!request.auth?.uid || email !== ADMIN_OPERATOR_EMAIL.toLowerCase()) {
      throw new HttpsError("permission-denied", "Admin only.");
    }

    const questionId =
      typeof request.data?.questionId === "string" ? request.data.questionId.trim() : "";
    if (!questionId) {
      throw new HttpsError("invalid-argument", "questionId is required.");
    }

    const ref = db.collection("questions").doc(questionId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Question not found.");
    }
    const data = snap.data() || {};

    let plan;
    try {
      plan = await generateImagePlanFromData(geminiApiKey.value(), data, questionId);
    } catch (e) {
      const detail = String(e?.message || e).slice(0, 220);
      logger.error("generateImagePlan failed", { questionId, detail });
      throw new HttpsError(
        "internal",
        `Gemini failed: ${detail}. Open Firebase → Functions → Logs for this function if it keeps happening.`
      );
    }

    await ref.set(
      {
        ai_image_plan: plan,
        ai_image_plan_updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { ok: true, plan };
  }
);

/**
 * Batch Gemini plans for `image_reference` questions missing `ai_image_plan`.
 * Call repeatedly from Admin (e.g. limit 20) until `remainingCandidateEstimate` is 0.
 */
exports.batchGenerateImagePlans = onCall(
  {
    region: "us-central1",
    secrets: [geminiApiKey],
    memory: "512MiB",
    // Many Gemini calls in one invocation; default 360s kills the run → client sees deadline-exceeded.
    timeoutSeconds: 3600,
  },
  async (request) => {
    try {
      const email = (request.auth?.token?.email || "").trim().toLowerCase();
      if (!request.auth?.uid || email !== ADMIN_OPERATOR_EMAIL.toLowerCase()) {
        throw new HttpsError("permission-denied", "Admin only.");
      }

      const limit = Math.min(40, Math.max(1, parseInt(request.data?.limit, 10) || 15));
      const force = request.data?.force === true;
      // Space out calls — reduces 503 "high demand" when batching many questions.
      const delayMs = Math.min(20000, Math.max(500, parseInt(request.data?.delayMs, 10) || 2800));
      const topicFilter =
        typeof request.data?.topic === "string" ? request.data.topic.trim().toLowerCase() : "";

      const snap = await db.collection("questions").where("image_reference", "==", true).limit(500).get();

      const candidates = [];
      snap.forEach((doc) => {
        const d = doc.data() || {};
        if (topicFilter && String(d.topic || "").toLowerCase() !== topicFilter) return;
        if (!force && d.ai_image_plan && typeof d.ai_image_plan === "object" && d.ai_image_plan.visual_summary) {
          return;
        }
        candidates.push(doc);
      });

      const slice = candidates.slice(0, limit);
      let key;
      try {
        key = geminiApiKey.value();
      } catch (secErr) {
        logger.error("batchGenerateImagePlans: GEMINI_API_KEY secret", String(secErr?.message || secErr));
        throw new HttpsError(
          "failed-precondition",
          "Gemini API key secret is missing or not available on this function. Redeploy with: firebase deploy --only functions"
        );
      }
      let processed = 0;
      let failed = 0;
      const errors = [];

      for (let i = 0; i < slice.length; i++) {
        const doc = slice[i];
        const id = doc.id;
        const data = doc.data() || {};
        try {
          const plan = await generateImagePlanFromData(key, data, id);
          await db
            .collection("questions")
            .doc(id)
            .set(
              {
                ai_image_plan: plan,
                ai_image_plan_updated_at: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          processed++;
          logger.info("batchGenerateImagePlans: saved", { id, index: i + 1, of: slice.length });
        } catch (e) {
          failed++;
          errors.push({ id, message: String(e.message || e).slice(0, 240) });
          logger.warn("batchGenerateImagePlans: failed", { id, err: String(e.message) });
        }
        if (i < slice.length - 1) await sleep(delayMs);
      }

      const remaining = Math.max(0, candidates.length - slice.length);
      let hint;
      if (slice.length === 0) {
        hint = force
          ? "No image_reference questions matched this query (try clearing topic filter)."
          : "No image_reference questions missing an AI plan in the latest 500-doc window. Enable Force to overwrite existing plans.";
      } else if (remaining > 0) {
        hint = `More in queue (${remaining} not run this call). Run batch again with the same settings.`;
      } else if (snap.size >= 500) {
        hint =
          "Remaining is 0 for this list: every question that still needed a plan here got one. This function only loads up to 500 image_reference documents per run. If your project has more than 500 of those rows, run batch again so another 500 can be scanned; repeat until a run shows 0 processed and few scanned docs.";
      } else {
        hint =
          "All image_reference questions returned by this query now have an AI plan. You are likely done until you add or import more questions.";
      }

      return {
        ok: true,
        processed,
        failed,
        errors,
        batchSize: slice.length,
        remainingCandidateEstimate: remaining,
        scannedImageReferenceDocs: snap.size,
        candidatesNeedingPlanBeforeBatch: candidates.length,
        hint,
      };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      const detail = String(e?.message || e).slice(0, 240);
      logger.error("batchGenerateImagePlans: fatal", detail);
      throw new HttpsError(
        "internal",
        `Batch could not finish: ${detail}. Check Firebase Functions logs, or try a smaller "Per run" limit.`
      );
    }
  }
);



/**
 * Create a Moyasar Invoice (Payment Link) and return the hosted payment page URL.
 * Uses Moyasar's Invoice API which generates secure payment links without requiring
 * the embedded form CDN or direct card processing.
 *
 * @see https://docs.moyasar.com/invoice-api
 */
exports.createPayment = onRequest(
  {
    region: "us-central1",
    secrets: [moyasarSecretKey],
    cors: true,
  },
  async (req, res) => {
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Handle preflight
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      // Parse JSON body if needed (req.body may be a string or already parsed)
      let body;
      if (typeof req.body === "string") {
        try {
          body = JSON.parse(req.body);
        } catch (parseError) {
          logger.error("Failed to parse request body", { body: req.body });
          res.status(400).json({ error: "Invalid JSON body" });
          return;
        }
      } else {
        body = req.body;
      }

      const { amount, currency, description, userId, returnUrl } = body;

      // Debug logging
      logger.info("createPayment request received", { 
        body: req.body, 
        amount, 
        currency, 
        description, 
        userId, 
        returnUrl 
      });

      // Validate required fields
      if (!amount || !currency || !description || !userId) {
        logger.warn("Missing required fields", { 
          hasAmount: !!amount, 
          hasCurrency: !!currency, 
          hasDescription: !!description, 
          hasUserId: !!userId 
        });
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      // Convert amount to integer (handles floating-point from JSON serialization)
      const amountInt = Math.round(Number(amount));
      
      // Validate amount is in allowed set
      logger.info("Validating amount", { amount, amountInt, amountType: typeof amount, allowedAmounts: Array.from(ALLOWED_AMOUNTS) });
      if (!ALLOWED_AMOUNTS.has(amountInt)) {
        logger.warn("Amount validation failed", { amount, amountInt, amountType: typeof amount, allowedAmounts: Array.from(ALLOWED_AMOUNTS) });
        res.status(400).json({ error: "Invalid amount" });
        return;
      }

      if (currency !== EXPECTED_CURRENCY) {
        res.status(400).json({ error: "Invalid currency" });
        return;
      }

      // Get Moyasar secret key
      const secret = moyasarSecretKey.value();
      // Moyasar uses Basic auth with secret key as username and empty password
      const credentials = Buffer.from(`${secret}:`).toString("base64");

      // Use Moyasar Invoice API to create a payment link
      // This generates a secure hosted payment page URL
      const callbackUrl = returnUrl || "https://smlepro.web.app/success.html";

      logger.info("Creating Moyasar invoice", {
        amount,
        currency,
        description,
        userId,
        returnUrl,
      });

      const response = await fetch("https://api.moyasar.com/v1/invoices", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency,
          description,
          // callback_url: Where user is redirected after payment completion
          // Moyasar replaces {status} and {id} with actual values
          callback_url: `${callbackUrl}?status={status}&id={id}`,
          metadata: {
            userId,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Moyasar invoice creation failed", {
          status: response.status,
          body: errorText,
        });
        res.status(response.status).json({ error: "Failed to create payment link" });
        return;
      }

      const invoice = await response.json();

      // Log the invoice creation for tracking
      logger.info("Moyasar invoice created", {
        invoiceId: invoice.id,
        amount,
        currency,
        userId,
        status: invoice.status,
        url: invoice.url,
      });

      // Return the invoice URL for redirect
      if (invoice.url) {
        res.json({ url: invoice.url, paymentId: invoice.id });
      } else {
        logger.error("Invoice created but no URL returned", { invoice });
        res.status(500).json({ error: "Invoice created but no payment URL received" });
      }
    } catch (error) {
      logger.error("createPayment error", { message: error.message });
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * Daily scheduled function to expire complimentary Pro access that has passed its duration.
 * Runs at 02:00 AM Asia/Riyadh to catch expired accounts.
 */
exports.expireComplimentaryPro = onSchedule(
  {
    schedule: "0 2 * * *", // 02:00 AM daily
    timeZone: "Asia/Riyadh",
    region: "us-central1",
  },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const usersRef = db.collection("users");
    
    // Query for users with proExpiresAt in the past (handles both complimentaryPro AND testPlan)
    const expiredQuery = usersRef
      .where("proExpiresAt", "<", now);

    const snapshot = await expiredQuery.get();
    
    if (snapshot.empty) {
      logger.info("[Expire Pro] No expired accounts found.");
      return;
    }

    let expiredCount = 0;
    let skippedCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Double-check expiry to handle race conditions
      if (!data.proExpiresAt || data.proExpiresAt.toDate() > new Date()) {
        skippedCount++;
        continue;
      }

      // Only revoke if they don't have a paid upgrade (real payment = no expiry)
      if (data.moyasarPaymentId && !data.testPlan) {
        skippedCount++;
        logger.info("Skipping expiry for user with paid upgrade", { uid: doc.id });
        continue;
      }

      try {
        const updates = {
          isPremium: false,
          proExpiresAt: null,
          expiredAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (data.complimentaryPro) {
          updates.complimentaryPro = false;
          updates.complimentaryExpiredAt = admin.firestore.FieldValue.serverTimestamp();
        }

        if (data.testPlan) {
          updates.testPlan = false;
          updates.testPlanExpiredAt = admin.firestore.FieldValue.serverTimestamp();
        }

        await doc.ref.update(updates);

        // Remove custom claim
        await admin.auth().setCustomUserClaims(doc.id, { isPro: false });

        expiredCount++;
        logger.info("Expired Pro access", { 
          uid: doc.id, 
          expiresAt: data.proExpiresAt.toDate(),
          type: data.testPlan ? "testPlan" : data.complimentaryPro ? "complimentary" : "other"
        });
      } catch (e) {
        logger.error("Failed to expire Pro", { uid: doc.id, error: e.message });
      }
    }

    logger.info(`[Expire Pro] Completed: ${expiredCount} expired, ${skippedCount} skipped.`);
  }
);



/**
 * Build and send a professional invoice email to the payer after successful payment.
 * Uses SMTP credentials from Firebase Secrets.
 */
async function sendInvoiceEmail(userId, paymentId, payment) {
  try {
    // Get user email from Firebase Auth
    const userRecord = await admin.auth().getUser(userId);
    const userEmail = userRecord.email;
    if (!userEmail) {
      logger.warn("Cannot send invoice — user has no email", { userId });
      return;
    }

    // Resolve plan title from amount
    const planTitle = PLAN_TITLES[payment.amount] || `اشتراك SMLE Pro (${payment.amount / 100} SAR)`;
    
    // Format amounts
    const amountSar = (payment.amount / 100).toFixed(2);
    const paidAt = new Date().toLocaleDateString("ar-SA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Build bilingual HTML invoice
    const html = `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Tajawal', 'Noto Sans Arabic', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 32px 24px; }
    .header { text-align: center; padding: 32px 0; }
    .header h1 { font-size: 24px; font-weight: 900; color: #0f172a; margin: 0; }
    .header h1 span { color: #D4AF37; }
    .card { background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); margin-bottom: 24px; }
    .card h2 { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 2px solid #f1f5f9; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; }
    .row .label { color: #64748b; font-size: 14px; }
    .row .value { color: #0f172a; font-weight: 600; font-size: 14px; text-align: left; }
    .total { display: flex; justify-content: space-between; padding: 12px 0 0; margin-top: 12px; border-top: 2px solid #e2e8f0; }
    .total .label { font-size: 16px; font-weight: 700; color: #0f172a; }
    .total .value { font-size: 20px; font-weight: 900; color: #D4AF37; }
    .badge { display: inline-block; background: #dcfce7; color: #166534; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
    .footer { text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.6; }
    .footer a { color: #D4AF37; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SMLE <span>Pro</span></h1>
      <p style="color:#64748b;font-size:14px;margin:4px 0 0">منصة الاستعداد للامتحان المهني</p>
    </div>

    <div class="card">
      <h2>📄 فاتورة الدفع / Payment Invoice</h2>
      
      <div class="row">
        <span class="label">رقم الفاتورة / Invoice #</span>
        <span class="value" dir="ltr">${paymentId.substring(0, 12)}...</span>
      </div>
      <div class="row">
        <span class="label">تاريخ الدفع / Payment Date</span>
        <span class="value">${paidAt}</span>
      </div>
      <div class="row">
        <span class="label">الحالة / Status</span>
        <span class="value"><span class="badge">✅ مدفوع / Paid</span></span>
      </div>
      <div class="row">
        <span class="label">طريقة الدفع / Payment Method</span>
        <span class="value">${payment.source?.type || "بطاقة / Card"}</span>
      </div>

      <div class="row" style="margin-top:12px">
        <span class="label">الخطة / Plan</span>
        <span class="value">${planTitle}</span>
      </div>
      <div class="row">
        <span class="label">الحساب / Account</span>
        <span class="value" dir="ltr">${userEmail}</span>
      </div>

      <div class="total">
        <span class="label">المجموع / Total</span>
        <span class="value">${amountSar} SAR</span>
      </div>
    </div>

    ${payment.amount === 100 ? `
    <div class="card" style="background:#fff7ed;border:1px solid #fed7aa">
      <p style="margin:0;font-size:14px;color:#9a3412">
        ⏱ هذا اشتراك تجريبي لمدّة ساعة واحدة — سينتهي صلاحية الوصول المميز تلقائيًا بعد ساعة.<br>
        <span style="font-size:12px">This is a 1-hour trial — Pro access will expire automatically after one hour.</span>
      </p>
    </div>` : `
    <div class="card" style="background:#f0f9ff;border:1px solid #bae6fd">
      <p style="margin:0;font-size:14px;color:#075985">
        🚀 تم تفعيل الوصول المميز! يمكنك الآن الاستمتاع بجميع ميزات SMLE Pro.<br>
        <span style="font-size:12px">Your Pro access is now active! Enjoy all SMLE Pro features.</span>
      </p>
    </div>`}

    <div class="footer">
      <p>SMLE Pro — الاستعداد للامتحان المهني<br>
      غير تابع لأي جهة حكومية • Not affiliated with any government body</p>
      <p style="margin-top:12px">
        <a href="https://smlepro.web.app">smlepro.web.app</a> &nbsp;|&nbsp; 
        <a href="mailto:support@smlepro.web.app">support@smlepro.web.app</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST.value(),
      port: parseInt(SMTP_PORT.value() || "587", 10),
      secure: parseInt(SMTP_PORT.value() || "587", 10) === 465,
      auth: {
        user: SMTP_USER.value(),
        pass: SMTP_PASS.value(),
      },
    });

    const fromName = INVOICE_FROM_NAME;
    const fromEmail = INVOICE_FROM_EMAIL.value();

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: userEmail,
      subject: `✅ تم الدفع — SMLE Pro ${planTitle}`,
      html,
    });

    logger.info("Invoice email sent successfully", { userId, paymentId, email: userEmail });
  } catch (emailError) {
    // Never let email failure break the payment flow
    logger.error("Failed to send invoice email", { 
      userId, 
      paymentId, 
      error: emailError.message 
    });
  }
}

/**
 * AI Question Generator — Callable Cloud Function
 * 
 * Invokes the multi-agent pipeline (Writer → Reviewer → Finalizer) using DeepSeek.
 * Admin-only for quality control.
 * 
 * @param {Object} data
 * @param {string} data.topic       - Medical specialty (e.g. "Cardiology")
 * @param {string} [data.subTopic]  - Specific sub-topic (e.g. "Acute Coronary Syndrome")
 * @param {string} [data.difficulty] - 'easy', 'medium', or 'hard'
 * @param {string} [data.language]  - 'English' or 'Arabic'
 * @param {number} [data.count]     - Number of questions to generate (1-5, default 1)
 * @returns {Object} { questions: Array, meta: Object }
 */
/**
 * DeepSeek API key — read from Firebase Secret Manager or fall back to env.
 * Set via: firebase functions:secrets:set DEEPSEEK_API_KEY
 * Or paste key in Firebase Console → Functions → Config
 */
const deepseekApiKey = defineSecret("DEEPSEEK_API_KEY");

exports.generateAQuestion = onCall(
  {
    region: "us-central1",
    secrets: [deepseekApiKey],
    memory: "256MiB",
    timeoutSeconds: 120,
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    // Admin-only for now (quality control on AI output)
    const email = (request.auth?.token?.email || "").trim().toLowerCase();
    if (email !== ADMIN_OPERATOR_EMAIL.toLowerCase()) {
      throw new HttpsError("permission-denied", "Admin only. AI question generation is limited during beta.");
    }

    const data = request.data || {};
    const topic = typeof data.topic === "string" ? data.topic.trim() : "Internal Medicine";
    const subTopic = typeof data.subTopic === "string" ? data.subTopic.trim() : null;
    const difficulty = ["easy", "medium", "hard"].includes(data.difficulty) ? data.difficulty : "medium";
    const language = data.language === "Arabic" ? "Arabic" : "English";
    const count = Math.min(5, Math.max(1, parseInt(data.count, 10) || 1));

    // Get DeepSeek API key — try Secret Manager first, then env var
    let deepSeekKey;
    try {
      deepSeekKey = deepseekApiKey.value();
    } catch (_) {
      deepSeekKey = process.env.DEEPSEEK_API_KEY || "";
    }
    if (!deepSeekKey) {
      throw new HttpsError(
        "failed-precondition",
        "DeepSeek API key not configured. Go to Firebase Console → Functions → Secrets → add DEEPSEEK_API_KEY"
      );
    }

    const provider = getProvider("deepseek", deepSeekKey);
    const questions = [];
    const allMeta = [];

    for (let i = 0; i < count; i++) {
      try {
        const result = await generateQuestion(provider, {
          topic,
          subTopic,
          difficulty,
          language,
        });

        // Store to Firestore
        const docRef = await db.collection("questions").add({
          ...result.question,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          generatedBy: request.auth.uid,
          batchId: `ai-batch-${Date.now()}`,
          pipelineMeta: result.meta,
        });

        questions.push({
          id: docRef.id,
          ...result.question,
        });
        allMeta.push(result.meta);
      } catch (err) {
        logger.error("generateAQuestion: question failed", {
          index: i,
          error: err.message,
        });
        // Don't stop the batch — continue generating remaining questions
      }
    }

    // Aggregate meta
    const totalTokens = allMeta.reduce((sum, m) => sum + (m.totalTokens || 0), 0);
    const avgScore = allMeta.length > 0
      ? Math.round(allMeta.reduce((sum, m) => sum + (m.qualityScore || 0), 0) / allMeta.length)
      : 0;

    return {
      ok: true,
      questions,
      meta: {
        count: questions.length,
        requested: count,
        totalTokens,
        avgQualityScore: avgScore,
        revised: allMeta.some((m) => m.revised),
        provider: "deepseek",
        model: provider.model,
      },
    };
  }
);

/**
 * AI Provider Test — quick smoke test to verify the AI pipeline works.
 * Returns the provider status without generating any questions.
 */
exports.checkAiProvider = onCall(
  {
    region: "us-central1",
    secrets: [deepseekApiKey],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const email = (request.auth?.token?.email || "").trim().toLowerCase();
    if (email !== ADMIN_OPERATOR_EMAIL.toLowerCase()) {
      throw new HttpsError("permission-denied", "Admin only.");
    }

    let deepSeekKey;
    try {
      deepSeekKey = deepseekApiKey.value();
    } catch (_) {
      deepSeekKey = process.env.DEEPSEEK_API_KEY || "";
    }
    const openAiKey = process.env.OPENAI_API_KEY || "";

    return {
      ok: true,
      providers: {
        deepseek: {
          configured: !!deepSeekKey,
          keyPrefix: deepSeekKey ? deepSeekKey.substring(0, 8) + "..." : null,
        },
        openai: {
          configured: !!openAiKey,
          keyPrefix: openAiKey ? openAiKey.substring(0, 8) + "..." : null,
        },
      },
    };
  }
);

// Moyasar payment webhook handler (defined in webhook-handler.js)
exports.moyasarWebhook = moyasarWebhook;

/**
 * Refreshes metadata/site_stats with accurate user counts computed server-side.
 * Admin-only; reads the entire users collection with Admin SDK privileges
 * so it bypasses Firestore security rules that block client-side aggregation.
 */
exports.refreshAdminStats = onCall({ region: "us-central1" }, async (request) => {
  if (request.auth?.token?.email !== ADMIN_OPERATOR_EMAIL) {
    throw new HttpsError("permission-denied", "Admin only.");
  }

  const db = admin.firestore();
  const usersSnap = await db.collection("users").get();
  const totalUsers = usersSnap.size;

  let premiumUsers = 0;
  let freeUsers = 0;
  let newUsersThisWeek = 0;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weeklyBuckets = Array(7).fill(0); // index 0 = oldest, 6 = today

  usersSnap.forEach((doc) => {
    const data = doc.data();
    if (data.isPremium === true) premiumUsers++;
    else freeUsers++;

    const createdAt = data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : null);
    if (createdAt && createdAt >= sevenDaysAgo) {
      newUsersThisWeek++;
      const dayDiff = Math.floor((now - createdAt) / (24 * 60 * 60 * 1000));
      if (dayDiff >= 0 && dayDiff < 7) {
        weeklyBuckets[6 - dayDiff]++;
      }
    }
  });

  // Preserve existing counters that only the client can increment
  const statsRef = db.collection("metadata").doc("site_stats");
  const existingSnap = await statsRef.get();
  const existing = existingSnap.exists ? existingSnap.data() : {};

  await statsRef.set(
    {
      totalUsers,
      premiumUsers,
      freeUsers,
      newUsersThisWeek,
      weeklyNewUsers: weeklyBuckets,
      questionsAnsweredTotal: existing.questionsAnsweredTotal ?? 0,
      questionsAnsweredToday: existing.questionsAnsweredToday ?? 0,
      dailyDoseCompletionsToday: existing.dailyDoseCompletionsToday ?? 0,
      hourlyActivityDate: existing.hourlyActivityDate ?? null,
      activeUsersByHourToday: existing.activeUsersByHourToday ?? Array(24).fill(0),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ok: true };
});

/**
 * Admin: Revoke Pro from any user by email. Call from browser console.
 */
exports.adminRevokePro = onCall({ region: "us-central1" }, async (request) => {
  if (request.auth?.token?.email !== ADMIN_OPERATOR_EMAIL) {
    throw new HttpsError("permission-denied", "Admin only.");
  }
  const raw = typeof request.data?.email === "string" ? request.data.email.trim().toLowerCase() : "";
  if (!raw) throw new HttpsError("invalid-argument", "Email required.");
  let targetUser;
  try {
    targetUser = await admin.auth().getUserByEmail(raw);
  } catch (e) {
    throw new HttpsError("not-found", "No account with that email.");
  }
  const uid = targetUser.uid;
  await db.collection("users").doc(uid).set({
    isPremium: false,
    proExpiresAt: null,
    upgradedAt: null,
    upgradeSource: null,
    moyasarPaymentId: null,
    complimentaryPro: false,
    testPlan: false,
  }, { merge: true });
  await admin.auth().setCustomUserClaims(uid, { isPro: false });
  return { ok: true, uid, email: raw };
});

// ── Admin: Refresh Quality Report ────────────────────────────────────────────
const SAUDI_KEYWORDS = [
  'brucellosis', 'sickle cell', 'thalassemia', 'G6PD',
  'familial Mediterranean', 'FMF', 'MERS', 'consanguine',
  'Hajj', 'dengue', 'leishmaniasis', 'tuberculosis',
];

exports.refreshAdminQuality = onCall({ region: "us-central1" }, async (request) => {
  if (request.auth?.token?.email !== ADMIN_OPERATOR_EMAIL) {
    throw new HttpsError("permission-denied", "Admin only.");
  }

  const db = admin.firestore();
  const snap = await db.collection("questions").get();
  const total = snap.size;
  const questions = [];
  snap.forEach((doc) => questions.push({ id: doc.id, ...doc.data() }));

  // 1. Blueprint breakdown
  const topicCounts = {};
  const tagCounts = {};
  questions.forEach((q) => {
    const t = q.topic || "UNKNOWN";
    topicCounts[t] = (topicCounts[t] || 0) + 1;
    if (Array.isArray(q.tags) && q.tags.length > 0) {
      const sub = q.tags[0];
      if (!tagCounts[t]) tagCounts[t] = {};
      tagCounts[t][sub] = (tagCounts[t][sub] || 0) + 1;
    }
  });

  const blueprint = [];
  const DOMAIN_ORDER = [
    { key: "Internal Medicine", label: "Medicine", weight: 30 },
    { key: "Obstetrics & Gynaecology", label: "OBGYN", weight: 25 },
    { key: "Pediatrics", label: "Pediatrics", weight: 25 },
    { key: "Surgery", label: "Surgery", weight: 20 },
  ];
  DOMAIN_ORDER.forEach((d) => {
    const count = topicCounts[d.key] || 0;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const subtopics = Object.entries(tagCounts[d.key] || {})
      .sort((a, b) => b[1] - a[1])
      .map(([name, c]) => ({ name, count: c }));
    blueprint.push({ ...d, count, pct, subtopics });
  });

  // 2. Saudi content
  const saudi = {};
  questions.forEach((q) => {
    const text = (q.question + " " + (q.rationale || "")).toLowerCase();
    SAUDI_KEYWORDS.forEach((kw) => {
      if (text.includes(kw)) {
        saudi[kw] = (saudi[kw] || 0) + 1;
      }
    });
  });

  // 3. Schema validation
  let schemaIssues = 0, missingRationale = 0, wrongOptionCount = 0, dupOptions = 0;
  questions.forEach((q) => {
    if (!q.question || q.question.length < 20) schemaIssues++;
    if (!Array.isArray(q.options)) { schemaIssues++; return; }
    if (q.options.length !== 4) wrongOptionCount++;
    if (q.options.filter((o) => o.correct).length !== 1) schemaIssues++;
    q.options.forEach((o) => {
      if (!o.rationale || o.rationale.length < 10) missingRationale++;
      if (!o.text) schemaIssues++;
    });
    const texts = q.options.map((o) => (o.text || "").toLowerCase().trim());
    if (new Set(texts).size !== texts.length) dupOptions++;
  });

  // 4. Answer balance
  const ca = { A: 0, B: 0, C: 0, D: 0 };
  questions.forEach((q) => { if (ca[q.correct_answer] !== undefined) ca[q.correct_answer]++; });
  const caPcts = {};
  Object.entries(ca).forEach(([l, c]) => { caPcts[l] = total > 0 ? Math.round((c / total) * 100) : 0; });
  const balanceOk = Object.values(caPcts).every((p) => p >= 20 && p <= 30);

  // 5. Difficulty
  const diff = { Easy: 0, Moderate: 0, Hard: 0 };
  questions.forEach((q) => { const d = q.difficulty || "Moderate"; diff[d] = (diff[d] || 0) + 1; });

  // 6. Duplicate check
  const seen = new Set();
  let duplicates = 0;
  questions.forEach((q) => {
    const k = (q.question || "").toLowerCase().trim();
    if (seen.has(k)) duplicates++;
    else seen.add(k);
  });

  const report = {
    refreshedAt: admin.firestore.FieldValue.serverTimestamp(),
    total, blueprint,
    saudi: Object.entries(saudi).sort((a, b) => b[1] - a[1]).map(([n, c]) => ({ name: n, count: c })),
    quality: {
      schemaIssues, missingRationale, wrongOptionCount, dupOptions,
      answerBalance: caPcts, balanceOk, difficulty: diff, duplicates,
    },
  };

  await db.collection("metadata").doc("quality_report").set(report);
  return report;
});

