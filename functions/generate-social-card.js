9/**
 * SMLE Pro - Server-side Social Card Generator
 * 
 * Uses Puppeteer/Chromium (Cloud Run) to render mobile quiz UI screenshots.
 * This produces consistent, high-quality output matching the actual mobile quiz interface.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

/** Lazy-init: call getDb() after admin.initializeApp() in index.js */
let dbInstance = null;
function getDb() {
  if (!dbInstance) {
    dbInstance = admin.firestore();
  }
  return dbInstance;
}

/**
 * Generates a mobile quiz UI screenshot matching the real SMLE Pro quiz interface.
 * Input: { question, options, topic, questionNumber, imageUrl, format, duration }
 * Output: { downloadUrl (Firebase Storage), contentType }
 */
exports.generateSocialCard = onCall(
  {
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 120,
    secrets: [],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    const uid = request.auth.uid;

    const data = request.data;
    if (!data || typeof data.question !== "string" || !data.question.trim()) {
      throw new HttpsError("invalid-argument", "Question text is required.");
    }

    const question = data.question.trim();
    const options = Array.isArray(data.options) ? data.options.filter(Boolean) : [];
    const topic = typeof data.topic === "string" ? data.topic.trim() : "Daily Dose";
    const qNum = Math.min(999, Math.max(1, parseInt(data.questionNumber, 10) || 1));
    const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl.trim() : "";

    // Check daily quota for free users
    const quotaOk = await checkUserQuota(uid);
    if (!quotaOk) {
      throw new HttpsError(
        "resource-exhausted",
        "Free tier: 10 exports/day. Upgrade to Pro for unlimited."
      );
    }

    try {
      const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2 },
      });

      const page = await browser.newPage();
      const html = buildMobileQuizHtml({ question, options, topic, qNum, imageUrl });
      await page.setContent(html, { waitUntil: "networkidle0" });
      await page.evaluate(() => document.fonts.ready);
      await new Promise(r => setTimeout(r, 800));

      const screenshotBuffer = await page.screenshot({
        type: "png",
        clip: { x: 0, y: 0, width: 390, height: 844 },
      });

      await browser.close();

      // Upload to Firebase Storage
      const bucket = admin.storage().bucket();
      const fileName = `social-cards/${uid}/${Date.now()}-q${qNum}.png`;
      const file = bucket.file(fileName);

      await file.save(screenshotBuffer, {
        metadata: {
          contentType: "image/png",
          metadata: {
            uid,
            topic,
            questionNumber: String(qNum),
            generatedAt: new Date().toISOString(),
          },
        },
      });

      await file.makePublic();
      const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      await incrementUsage(uid);

      logger.info(`Generated social card for user ${uid}: ${fileName}`);

      return { downloadUrl, contentType: "image/png", fileName };
    } catch (error) {
      logger.error("Social card generation error:", error);
      throw new HttpsError("internal", "Generation failed: " + error.message);
    }
  }
);

/**
 * Builds mobile quiz UI HTML matching the real SMLE Pro interface.
 * Uses inline styles for reliable Puppeteer rendering.
 */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="28" height="28">
  <defs>
    <radialGradient id="hg" cx="38%" cy="30%" r="68%" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="#FFE566"/>
      <stop offset="45%"  stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#8B6508"/>
    </radialGradient>
    <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <path d="M50 84 C49 84 9 61 9 36.5 C9 23.5 19.2 13 32 13 C39.6 13 46.5 16.9 50 22.9 C53.5 16.9 60.4 13 68 13 C80.8 13 91 23.5 91 36.5 C91 61 51 84 50 84Z" fill="url(#hg)" filter="url(#glow)"/>
  <circle cx="66" cy="30" r="16" fill="#0B1120" fill-opacity="0.82"/>
  <circle cx="66" cy="30" r="15.5" fill="none" stroke="#D4AF37" stroke-width="1.5"/>
  <rect x="63.5" y="23"   width="5" height="14" rx="2.5" fill="white"/>
  <rect x="59.5" y="27"   width="13" height="6"  rx="3"   fill="white"/>
</svg>`;

function buildMobileQuizHtml({ question, options, topic, qNum, imageUrl }) {
  const pct = Math.min(100, Math.max(0, (qNum / 10) * 100));
  const optionLetters = ["A", "B", "C", "D", "E"];

  const optionsHtml = options
    .map((text, i) => {
      const letter = optionLetters[i] || "•";
      return `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:16px;border-radius:12px;border:1px solid #234248;background:#101f22;margin-bottom:12px">
        <div style="width:36px;height:36px;flex-shrink:0;border-radius:10px;background:#1a2e32;border:1px solid #234248;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#cbd5e1">${letter}</div>
        <div style="font-size:15px;color:#e2e8f0;flex:1;word-break:break-word;line-height:1.5;padding-top:6px">${esc(text)}</div>
      </div>`;
    })
    .join("");

  let imageHtml = "";
  if (imageUrl) {
    try {
      new URL(imageUrl);
      imageHtml = `
      <div style="margin:0 0 16px 0;border-radius:12px;overflow:hidden;border:1px solid #234248">
        <img src="${esc(imageUrl)}" alt="" style="width:100%;object-fit:contain;max-height:240px;display:block">
      </div>`;
    } catch (_) {}
  }

  const totalQuestions = 10;

  // No status bar, no tab bar — full focus on the question content
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=390, initial-scale=1, maximum-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#101f22;font-family:'Space Grotesk','Noto Sans Arabic',sans-serif;-webkit-font-smoothing:antialiased;color:#e2e8f0;width:390px;height:844px;overflow:hidden;display:flex;flex-direction:column">

  <!-- Padding Top -->
  <div style="flex:0 0 24px;background:#101f22"></div>

  <!-- Main Content -->
  <div style="flex:1;display:flex;flex-direction:column;padding:0 20px;overflow:hidden">

    <!-- Header with Logo -->
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;flex-shrink:0">
      ${LOGO_SVG}
      <span style="font-weight:700;color:#fff;font-size:15px">SMLE Pro</span>
      <span style="color:#64748b;font-size:12px">—</span>
      <span style="color:#11b4d4;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(topic)}</span>
    </div>

    <!-- Progress -->
    <div style="width:100%;background:#234248;border-radius:9999px;height:6px;margin-bottom:16px;flex-shrink:0">
      <div style="background:#11b4d4;height:6px;border-radius:9999px;width:${pct}%"></div>
    </div>

    <!-- Question Card -->
    <div style="background:#1a2e32;border-radius:12px;border:1px solid #234248;padding:20px;flex:1;display:flex;flex-direction:column;overflow:hidden">

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-shrink:0">
        <span style="font-size:12px;color:#94a3b8">Question ${qNum} of ${totalQuestions}</span>
      </div>

      <div style="overflow-y:auto;flex-shrink:0;margin-bottom:12px">
        <p style="font-size:16px;font-weight:600;margin:0;color:#fff;line-height:1.65">${qNum}. ${esc(question).replace(/\n/g, "<br>")}</p>
      </div>

      ${imageHtml}

      <div style="flex:1;overflow-y:auto;margin-top:4px">
        ${optionsHtml}
      </div>
    </div>
  </div>

  <!-- Footer with logo -->
  <div style="flex:0 0 28px;background:#101f22;display:flex;align-items:center;justify-content:center;gap:4px">
    ${LOGO_SVG.replace('width="28" height="28"', 'width="14" height="14"')}
    <span style="font-size:8px;color:#64748b">SMLE Pro — Independent exam prep</span>
  </div>

  <!-- Padding Bottom -->
  <div style="flex:0 0 24px;background:#101f22"></div>

</body>
</html>`;
}

function esc(str) {
  return String(str)
    .replace(/&/g, "\x26\x61\x6d\x70\x3b")
    .replace(/</g, "\x26\x6c\x74\x3b")
    .replace(/>/g, "\x26\x67\x74\x3b")
    .replace(/"/g, "\x26\x71\x75\x6f\x74\x3b");
}

async function checkUserQuota(uid) {
  try {
    const db = getDb();
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) return false;
    const userData = userDoc.data();
    if (userData.subscriptionStatus === "active" || userData.subscriptionTier === "pro") {
      return true;
    }
    const today = new Date().toISOString().split("T")[0];
    const usageRef = db.collection("social_card_usage").doc(uid + "_" + today);
    const usageDoc = await usageRef.get();
    const count = usageDoc.exists ? (usageDoc.data().count || 0) : 0;
    return count < 10;
  } catch (error) {
    logger.error("Quota check error:", error);
    return false;
  }
}

async function incrementUsage(uid) {
  try {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];
    const usageRef = db.collection("social_card_usage").doc(uid + "_" + today);
    await usageRef.set(
      { uid, date: today, count: admin.firestore.FieldValue.increment(1) },
      { merge: true }
    );
  } catch (error) {
    logger.error("Usage increment error:", error);
  }
}
