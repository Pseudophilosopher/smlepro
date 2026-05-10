"use strict";

/**
 * Shallow-copy a question for learner-facing payloads.
 * Drops image URL and ingestion metadata until image_verified === true.
 * Keeps image_reference so the client can show an "under curation" state.
 */
function redactUnverifiedQuestionImages(q) {
  if (!q || typeof q !== "object") return q;
  if (q.image_verified === true) return q;
  const { image_url, image_source, image_search_query, ...rest } = q;
  return rest;
}

/** Admin / curation metadata must not ship to learners via getQuizQuestions or daily_doses. */
function stripLearnerAdminMetadata(q) {
  if (!q || typeof q !== "object") return q;
  const { ai_image_plan, ai_image_plan_updated_at, ...rest } = q;
  return rest;
}

/** @param {object[]} list */
function redactQuestionList(list) {
  if (!Array.isArray(list)) return list;
  return list.map((q) => stripLearnerAdminMetadata(redactUnverifiedQuestionImages(q)));
}

module.exports = { redactUnverifiedQuestionImages, redactQuestionList };
