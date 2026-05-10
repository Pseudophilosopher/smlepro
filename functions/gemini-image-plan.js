"use strict";

const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("firebase-functions/logger");

// Google removes older model IDs from the API; use a current stable Flash (see ai.google.dev/gemini-api/docs/models).
const GEMINI_MODEL_ID = "gemini-2.5-flash";
/** When 2.5-flash is overloaded (503), same API key often succeeds on flash-lite (separate capacity). */
const GEMINI_FALLBACK_MODEL_ID = "gemini-2.5-flash-lite";

/** Retries for 503 / 429 / overloaded — common during API demand spikes. */
const MAX_GEMINI_ATTEMPTS = 6;
const MAX_FALLBACK_ATTEMPTS = 5;
const INITIAL_BACKOFF_MS = 2500;
const INITIAL_FALLBACK_BACKOFF_MS = 4000;
const MAX_BACKOFF_MS = 45000;

function isTransientGeminiError(err) {
  const msg = String(err?.message || err || "");
  if (/\b503\b/.test(msg)) return true;
  if (/\b429\b/.test(msg)) return true;
  if (/UNAVAILABLE/i.test(msg)) return true;
  if (/RESOURCE_EXHAUSTED/i.test(msg)) return true;
  if (/Service Unavailable/i.test(msg)) return true;
  if (/high demand/i.test(msg)) return true;
  if (/overloaded/i.test(msg)) return true;
  if (/try again later/i.test(msg)) return true;
  if (/ECONNRESET|ETIMEDOUT|socket hang up/i.test(msg)) return true;
  const status = err?.status ?? err?.statusCode;
  if (status === 503 || status === 429) return true;
  return false;
}

function buildImagePlanPrompt(data) {
  const options = Array.isArray(data.options) ? data.options : [];
  const optsText = options
    .map((o, i) => {
      const letter = String.fromCharCode(65 + i);
      const mark = o.correct ? " (CORRECT)" : "";
      return `${letter}. ${(o.text || "").slice(0, 400)}${mark}`;
    })
    .join("\n");

  return `You help curate bedside-style educational images for a medical multiple-choice question bank (SMLE-style).

Return ONLY valid JSON (no markdown) with this shape:
{
  "visual_summary": "one or two sentences: what the learner should SEE",
  "modality": "one of: clinical_photo | derm_closeup | ecg | cxr | ct_mri | ultrasound | histology | diagram | none",
  "search_queries": ["3-6 short English phrases suitable for Wikimedia Commons image search"],
  "must_avoid": ["filename tokens to avoid, e.g. TEM, histopathology, White House, chart"],
  "confidence": 0.0,
  "skip_auto_image": false,
  "skip_reason": "",
  "rationale": "brief note for human reviewers (why this visual)"
}

Rules:
- Prefer CLINICAL photographs for rash, vesicles, face findings; avoid electron microscopy unless modality is explicitly microscopy.
- If the stem is mainly labs, drugs, or protocols with no meaningful photo, set skip_auto_image true and explain in skip_reason.
- search_queries must be concrete (e.g. "pityriasis rosea herald patch skin" not "skin rash").

Topic: ${data.topic || "General"}
image_reference flag on doc: ${data.image_reference === true}

STEM:
${String(data.question || "").slice(0, 4000)}

OPTIONS:
${optsText || "(none)"}
`;
}

/** Gemini sometimes wraps JSON in markdown fences or adds prose — extract object. */
function tryParseModelJson(text) {
  const raw = String(text || "").trim();
  try {
    return JSON.parse(raw);
  } catch (_) {
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      try {
        return JSON.parse(fence[1].trim());
      } catch {
        /* fall through */
      }
    }
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new SyntaxError("Model did not return parseable JSON");
  }
}

function normalizePlan(parsed, geminiModelId) {
  return {
    visual_summary: String(parsed.visual_summary || "").slice(0, 1200),
    modality: String(parsed.modality || "none").slice(0, 80),
    search_queries: Array.isArray(parsed.search_queries)
      ? parsed.search_queries.map((s) => String(s).slice(0, 200)).filter(Boolean).slice(0, 8)
      : [],
    must_avoid: Array.isArray(parsed.must_avoid)
      ? parsed.must_avoid.map((s) => String(s).slice(0, 120)).filter(Boolean).slice(0, 20)
      : [],
    confidence:
      typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0,
    skip_auto_image: parsed.skip_auto_image === true,
    skip_reason: String(parsed.skip_reason || "").slice(0, 800),
    rationale: String(parsed.rationale || "").slice(0, 2000),
    model: geminiModelId,
  };
}

/**
 * @param {*} genAI GoogleGenerativeAI instance
 * @param {string} modelId
 * @param {string} prompt
 * @param {string} questionId
 * @param {number} maxAttempts
 * @param {{ initialBackoffMs?: number, label?: string }} [opts]
 */
async function generatePlanWithModel(genAI, modelId, prompt, questionId, maxAttempts, opts = {}) {
  const initialMs = opts.initialBackoffMs ?? INITIAL_BACKOFF_MS;
  const label = opts.label || modelId;
  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      let text;
      try {
        text = result.response.text();
      } catch (respErr) {
        throw new Error(
          `Gemini empty or blocked response: ${String(respErr?.message || respErr)}`
        );
      }
      if (!String(text).trim()) {
        throw new Error("Gemini returned empty text (try again or shorten prompt)");
      }
      const parsed = tryParseModelJson(text);
      return normalizePlan(parsed, modelId);
    } catch (e) {
      lastErr = e;
      const transient = isTransientGeminiError(e);
      const willRetry = transient && attempt < maxAttempts - 1;
      if (!willRetry) {
        logger.error("Gemini image plan failed", {
          questionId,
          model: label,
          attempt: attempt + 1,
          transient,
          err: String(e.message),
        });
        throw e;
      }
      const backoff = Math.min(
        MAX_BACKOFF_MS,
        initialMs * 2 ** attempt + Math.floor(Math.random() * 1200)
      );
      logger.warn("Gemini transient error, backing off", {
        questionId,
        model: label,
        attempt: attempt + 1,
        nextWaitMs: backoff,
        err: String(e.message).slice(0, 160),
      });
      await sleep(backoff);
    }
  }
  throw lastErr;
}

/**
 * @param {string} apiKey
 * @param {FirebaseFirestore.DocumentData} data
 * @param {string} questionId for logging
 */
async function generateImagePlanFromData(apiKey, data, questionId) {
  const prompt = buildImagePlanPrompt(data);
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    return await generatePlanWithModel(genAI, GEMINI_MODEL_ID, prompt, questionId, MAX_GEMINI_ATTEMPTS, {
      label: GEMINI_MODEL_ID,
    });
  } catch (e) {
    if (!isTransientGeminiError(e)) throw e;
    logger.warn("Gemini primary exhausted after retries; trying fallback model", {
      questionId,
      primary: GEMINI_MODEL_ID,
      fallback: GEMINI_FALLBACK_MODEL_ID,
    });
    return await generatePlanWithModel(
      genAI,
      GEMINI_FALLBACK_MODEL_ID,
      prompt,
      questionId,
      MAX_FALLBACK_ATTEMPTS,
      {
        initialBackoffMs: INITIAL_FALLBACK_BACKOFF_MS,
        label: GEMINI_FALLBACK_MODEL_ID,
      }
    );
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = {
  GEMINI_MODEL_ID,
  GEMINI_FALLBACK_MODEL_ID,
  generateImagePlanFromData,
  sleep,
};
