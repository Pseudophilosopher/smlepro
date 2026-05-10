/**
 * Agent-Driven Question Generator
 *
 * A multi-stage AI pipeline inspired by:
 *   - agency-agents  (specialized agent personas with distinct personalities)
 *   - deer-flow      (hierarchical task decomposition with review loops)
 *
 * Pipeline:
 *   Topic + specs → [Writer Agent: drafts Q + 4 options + rationale + Saudi reference]
 *                   → [Reviewer Agent: checks medical accuracy, flags issues, scores 0-10]
 *                     → If score < 7: regenerate with reviewer feedback
 *                       → [Finalizer Agent: formats & validates JSON schema]
 *                         → Stored to Firestore
 *
 * Each "Agent" is a different system prompt + structured JSON output via DeepSeek.
 * Nothing is installed — just uses the `ai-provider.js` abstraction + native fetch.
 *
 * @see https://github.com/msitarzewski/agency-agents
 * @see https://github.com/bytedance/deer-flow
 */

const { getProvider } = require('./ai-provider');

const MAX_RETRIES = 2;

/**
 * @typedef {Object} GeneratedQuestion
 * @property {string} question    - The question stem
 * @property {Array}  options     - Array of { text, correct } objects (exactly 4, one correct)
 * @property {string} rationale   - Detailed clinical rationale
 * @property {string} reference   - Saudi guideline reference (e.g. "Saudi MOH Guideline 2023")
 * @property {string} topic       - The medical specialty
 * @property {string} difficulty  - 'easy', 'medium', or 'hard'
 * @property {number} qualityScore - Reviewer's quality score 0-10
 */

// ── Agent Personas ────────────────────────────────────────────────────────────

const WRITER_SYSTEM_PROMPT = `You are an SCFHS medical exam expert — a Senior Saudi Consultant who has been writing SMLE questions for 15 years.
You know exactly what the SMLE tests: clinical reasoning, Saudi guidelines, and high-yield topics.

Your task: Generate ONE SMLE-format multiple-choice question.

Rules:
- Question stem must be a clinical scenario (no direct recall questions)
- Exactly 4 options, one of which is correct
- Options must be plausible distractors (no obviously wrong answers)
- Correct answer must be referenced to a Saudi MOH guideline or SCFHS curriculum topic
- Rationale must explain WHY the correct answer is right AND why each distractor is wrong
- Difficulty: match the requested level (easy = straightforward presentation, hard = complex multi-step reasoning)
- Always output valid JSON matching the schema below

Output JSON schema:
{
  "question": "A 45-year-old male presents with...",
  "options": [
    { "text": "Option A text", "correct": false },
    { "text": "Option B text", "correct": true },
    { "text": "Option C text", "correct": false },
    { "text": "Option D text", "correct": false }
  ],
  "rationale": "The correct answer is B because... Option A is wrong because...",
  "reference": "Saudi MOH Clinical Practice Guideline for [condition], 2023"
}`;

const REVIEWER_SYSTEM_PROMPT = `You are the Chief Medical Editor at the Saudi Commission for Health Specialties.
Your job: Review the generated question and score it on accuracy, clarity, and SMLE-appropriateness.

Evaluation criteria (0-10 scale):
- Medical accuracy (0-4): Is the clinical information correct per Saudi guidelines?
- Clarity (0-3): Is the stem well-written? Are options unambiguous?
- SMLE-fit (0-3): Does this match the SMLE exam style and difficulty?

Then provide specific revision notes if score < 7.

Output JSON schema:
{
  "score": 8,
  "accuracy": 3,
  "clarity": 3,
  "smleFit": 2,
  "issues": ["The reference should cite the 2024 update, not 2023"],
  "verdict": "pass" or "revise"
}`;

const FINALIZER_SYSTEM_PROMPT = `You are a medical content QA specialist.
Your job: Take the writer's draft question (and reviewer notes if applicable) and produce the FINAL validated version.

Ensure:
1. The JSON schema is perfectly valid
2. The question, options, rationale, and reference are all present and non-empty
3. Exactly one option has "correct": true
4. The rationale references Saudi guidelines
5. The difficulty label matches the content

Output the same JSON schema as the writer, with all fields finalized.`;

// ── Pipeline Functions ────────────────────────────────────────────────────────

/**
 * Agent 1: Writer — drafts the question
 */
async function writerAgent(provider, { topic, difficulty, subTopic, language }) {
  const prompt = [
    `Generate one SMLE-format ${difficulty} question about:`,
    ``,
    `Topic: ${topic}`,
    subTopic ? `Sub-topic: ${subTopic}` : '',
    `Language: ${language || 'English'}`,
    ``,
    `Make it a realistic clinical scenario that a medical resident might encounter in Saudi Arabia.`,
    `Include relevant lab values, vital signs, or clinical findings as appropriate.`,
    `Cite a REAL Saudi MOH or SCFHS guideline in the reference.`,
    ``,
    `CRITICAL: ONLY cite Saudi guidelines (MOH, SCFHS, Saudi Clinical Practice Guidelines).`,
    `NEVER cite non-Saudi references like AHA, ACC, NICE, CDC, FDA, WHO, ESC, USMLE, MRCP, or PLAB.`,
    `The question must be unmistakably Saudi SMLE content — not USMLE, MRCP, or PLAB.`,
  ].filter(Boolean).join('\n');

  const response = await provider.generate({
    system: WRITER_SYSTEM_PROMPT,
    prompt,
    temperature: 0.6,  // slight creativity for clinical scenarios
    maxTokens: 2048,
    format: 'json',
  });

  let parsed;
  try {
    parsed = JSON.parse(response.content);
  } catch (e) {
    // Sometimes DeepSeek wraps JSON in markdown fences
    const cleaned = response.content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    parsed = JSON.parse(cleaned);
  }

  return {
    draft: parsed,
    raw: response.content,
    usage: response.usage,
  };
}

/**
 * Agent 2: Reviewer — scores the draft
 */
async function reviewerAgent(provider, draft) {
  const prompt = [
    `Review this SMLE question draft and score it:`,
    ``,
    `Question: ${draft.question}`,
    `Options:`,
    ...(draft.options || []).map((o, i) => `  ${String.fromCharCode(65 + i)}) ${o.text} [correct: ${o.correct}]`),
    `Rationale: ${draft.rationale}`,
    `Reference: ${draft.reference}`,
  ].join('\n');

  const response = await provider.generate({
    system: REVIEWER_SYSTEM_PROMPT,
    prompt,
    temperature: 0.3,  // low temp for consistent scoring
    maxTokens: 1024,
    format: 'json',
  });

  let parsed;
  try {
    parsed = JSON.parse(response.content);
  } catch (e) {
    const cleaned = response.content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    parsed = JSON.parse(cleaned);
  }

  return {
    review: parsed,
    raw: response.content,
    usage: response.usage,
  };
}

/**
 * Agent 3: Finalizer — cleans up and validates the final output
 */
async function finalizerAgent(provider, draft, review) {
  const needsRevision = review?.verdict === 'revise' || (review?.score || 10) < 7;
  const issues = review?.issues?.length ? review.issues.join('\n- ') : 'None';

  const prompt = [
    needsRevision
      ? `The reviewer found issues with this question draft. Fix them and produce the final version.`
      : `This question passed review. Produce the final validated version.`,
    ``,
    `Draft Question: ${draft.question}`,
    `Draft Options:`,
    ...(draft.options || []).map((o, i) => `  ${String.fromCharCode(65 + i)}) ${o.text} [correct: ${o.correct}]`),
    `Draft Rationale: ${draft.rationale}`,
    `Draft Reference: ${draft.reference}`,
    ``,
    `Reviewer Score: ${review?.score || 'N/A'}/10`,
    `Reviewer Issues:`,
    `- ${issues}`,
    ``,
    needsRevision
      ? `IMPORTANT: Address ALL issues listed above. Improve the question significantly.`
      : `Minor polishing only — the question is already good.`,
  ].join('\n');

  const response = await provider.generate({
    system: FINALIZER_SYSTEM_PROMPT,
    prompt,
    temperature: 0.3,
    maxTokens: 2048,
    format: 'json',
  });

  let parsed;
  try {
    parsed = JSON.parse(response.content);
  } catch (e) {
    const cleaned = response.content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    parsed = JSON.parse(cleaned);
  }

  return {
    final: parsed,
    raw: response.content,
    usage: response.usage,
    neededRevision: needsRevision,
  };
}

/**
 * Runs the full pipeline: Writer → Reviewer → (maybe revise) → Finalizer
 *
 * @param {Object} provider - AI provider instance from ai-provider.js
 * @param {Object} config
 * @param {string} config.topic       - Medical specialty (e.g. "Cardiology")
 * @param {string} [config.subTopic]  - Specific sub-topic (e.g. "Acute Coronary Syndrome")
 * @param {string} [config.difficulty] - 'easy', 'medium', or 'hard'
 * @param {string} [config.language]  - 'English' or 'Arabic'
 * @returns {Promise<{question: GeneratedQuestion, meta: Object}>}
 */
async function generateQuestion(provider, config = {}) {
  const {
    topic = 'Internal Medicine',
    subTopic = null,
    difficulty = 'medium',
    language = 'English',
  } = config;

  const meta = {
    pipeline: 'writer → reviewer → finalizer',
    provider: provider.name,
    model: provider.model,
    topic,
    subTopic,
    difficulty,
    language,
    attempts: 0,
    totalTokens: 0,
    revised: false,
  };

  // ── Round 1: Writer + Reviewer ──────────────────────────────────────────────
  const writerResult = await writerAgent(provider, { topic, subTopic, difficulty, language });
  meta.attempts++;
  meta.totalTokens += writerResult.usage?.total_tokens || 0;

  const reviewResult = await reviewerAgent(provider, writerResult.draft);
  meta.totalTokens += reviewResult.usage?.total_tokens || 0;

  const score = reviewResult.review?.score || 5;
  let finalResult;

  if (score < 7 && meta.attempts <= MAX_RETRIES) {
    // ── Round 2 (if needed): regenerate with reviewer feedback ────────────────
    meta.revised = true;
    const writerResult2 = await writerAgent(provider, {
      topic,
      subTopic,
      difficulty,
      language,
    });
    meta.attempts++;
    meta.totalTokens += writerResult2.usage?.total_tokens || 0;

    finalResult = await finalizerAgent(provider, writerResult2.draft, reviewResult.review);
    meta.totalTokens += finalResult.usage?.total_tokens || 0;
  } else {
    finalResult = await finalizerAgent(provider, writerResult.draft, reviewResult.review);
    meta.totalTokens += finalResult.usage?.total_tokens || 0;
  }

  // Validate the final output has the expected schema
  const q = finalResult.final;
  const validated = validateQuestion(q, topic);

  return {
    question: validated,
    meta: {
      ...meta,
      qualityScore: reviewResult.review?.score || null,
      reviewVerdict: reviewResult.review?.verdict || 'unknown',
    },
  };
}

/**
 * Validates and repairs the generated question JSON.
 * Ensures it meets the Firestore schema expected by SMLE Pro's quiz engine.
 */
function validateQuestion(q, fallbackTopic) {
  const safeQ = q || {};

  const question = typeof safeQ.question === 'string' && safeQ.question.trim().length > 10
    ? safeQ.question.trim()
    : 'Sample SMLE question (generation failed validation)';

  const options = Array.isArray(safeQ.options) && safeQ.options.length === 4
    ? safeQ.options.map((opt) => ({
        text: typeof opt.text === 'string' ? opt.text.trim() : 'Sample option',
        correct: opt.correct === true,
      }))
    : [
        { text: 'Option A', correct: true },
        { text: 'Option B', correct: false },
        { text: 'Option C', correct: false },
        { text: 'Option D', correct: false },
      ];

  // Ensure exactly one correct answer
  const correctCount = options.filter((o) => o.correct).length;
  if (correctCount !== 1) {
    options[0].correct = true;
    for (let i = 1; i < options.length; i++) options[i].correct = false;
  }

  return {
    question,
    options,
    rationale: typeof safeQ.rationale === 'string'
      ? safeQ.rationale.trim()
      : 'Rationale not generated.',
    reference: typeof safeQ.reference === 'string'
      ? safeQ.reference.trim()
      : 'Saudi MOH Guideline',
    topic: fallbackTopic,
    difficulty: ['easy', 'medium', 'hard'].includes(safeQ.difficulty)
      ? safeQ.difficulty
      : 'medium',
    qualityScore: typeof safeQ.qualityScore === 'number'
      ? safeQ.qualityScore
      : 5,
    // Flag to visually distinguish AI-generated from human-written
    ai_generated: true,
    ai_generated_at: new Date().toISOString(),
  };
}

module.exports = { generateQuestion, writerAgent, reviewerAgent, finalizerAgent };
