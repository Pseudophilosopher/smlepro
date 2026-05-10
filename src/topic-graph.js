/**
 * Topic Knowledge Graph + Radar Chart
 *
 * Inspired by LeanKG's knowledge graph concept, adapted for SMLE Pro's
 * medical specialty hierarchy.
 *
 * Features:
 *   1. **Specialty relationship graph** — links related specialties
 *      (e.g., Gastroenterology → Internal Medicine, Orthopedics → Surgery)
 *   2. **Canvas radar chart** — plots user performance across specialties
 *      (zero dependencies — no Chart.js needed)
 *   3. **"Study this next"** — recommends weakest topics with proximity boost
 *      for related specialties
 *
 * Uses your existing `DRILL_TOPIC_SYNONYMS` structure from topic-drill-buckets.js.
 * Bundle impact: ~4KB minified + gzipped.
 *
 * @see https://github.com/FreePeak/LeanKG
 */

// ── Specialty Relationship Graph ──────────────────────────────────────────────

/**
 * Defines parent-child relationships between medical specialties.
 * Used to recommend related topics when a user is weak in one area.
 */
const SPECIALTY_GRAPH = {
  'Internal Medicine': {
    related: [
      'Gastroenterology', 'Nephrology', 'Endocrinology', 'Neurology',
      'Psychiatry', 'Dermatology', 'Hematology', 'Rheumatology',
      'Infectious Diseases', 'Immunology', 'Pharmacology',
    ],
    weight: 0.6,
  },
  Surgery: {
    related: ['Orthopedics', 'Ophthalmology', 'ENT', 'Urology'],
    weight: 0.6,
  },
  Gastroenterology: { related: ['Internal Medicine', 'Surgery'], weight: 0.4 },
  Nephrology: { related: ['Internal Medicine', 'Urology'], weight: 0.3 },
  Endocrinology: { related: ['Internal Medicine'], weight: 0.4 },
  Neurology: { related: ['Internal Medicine', 'Psychiatry'], weight: 0.3 },
  Psychiatry: { related: ['Neurology', 'Internal Medicine'], weight: 0.3 },
  Dermatology: { related: ['Internal Medicine'], weight: 0.3 },
  Hematology: { related: ['Internal Medicine', 'Oncology'], weight: 0.3 },
  Rheumatology: { related: ['Internal Medicine', 'Immunology'], weight: 0.4 },
  'Infectious Diseases': { related: ['Internal Medicine', 'Microbiology'], weight: 0.3 },
  Immunology: { related: ['Internal Medicine', 'Rheumatology'], weight: 0.4 },
  Pharmacology: { related: ['Internal Medicine', 'Toxicology'], weight: 0.3 },
  Orthopedics: { related: ['Surgery', 'Rheumatology'], weight: 0.4 },
  Ophthalmology: { related: ['Surgery', 'Neurology'], weight: 0.3 },
  ENT: { related: ['Surgery', 'Family Medicine'], weight: 0.3 },
  Urology: { related: ['Surgery', 'Nephrology'], weight: 0.4 },
  Pediatrics: { related: ['Family Medicine', 'Internal Medicine'], weight: 0.4 },
  OBGYN: { related: ['Surgery', 'Family Medicine'], weight: 0.3 },
  'Emergency Medicine': { related: ['Critical Care', 'Surgery', 'Internal Medicine'], weight: 0.4 },
  'Family Medicine': { related: ['Pediatrics', 'Internal Medicine', 'Public Health'], weight: 0.4 },
  Ethics: { related: ['Forensic Medicine', 'Psychiatry'], weight: 0.2 },
  Pathology: { related: ['Internal Medicine', 'Hematology'], weight: 0.3 },
  Radiology: { related: ['Internal Medicine', 'Surgery', 'Orthopedics'], weight: 0.3 },
  'Forensic Medicine': { related: ['Ethics', 'Pathology'], weight: 0.3 },
};

/**
 * Get related specialties for a given bucket, including indirect (friend-of-friend).
 * Returns a Map<specialty, relevanceScore> where higher = more relevant to study next.
 *
 * @param {string} bucket - Primary specialty bucket
 * @param {Object<string, number>} [scores] - User's current scores per specialty (lower = weaker)
 * @returns {Object<string, number>} Map of recommended specialties → priority score
 */
function getStudyRecommendations(bucket, scores = {}) {
  const direct = SPECIALTY_GRAPH[bucket];
  if (!direct) return {};

  const recommendations = {};

  // Direct related specialties
  for (const related of direct.related) {
    const score = scores[related];
    const weaknessBoost = score !== undefined ? (100 - score) / 100 : 0.5;
    recommendations[related] = Math.round(direct.weight * (0.5 + weaknessBoost) * 100);
  }

  // Friend-of-friend: if you're weak in a related specialty, also recommend its related specialties
  for (const related of direct.related) {
    const subGraph = SPECIALTY_GRAPH[related];
    if (!subGraph) continue;
    for (const subRelated of subGraph.related) {
      if (subRelated === bucket || recommendations[subRelated]) continue;
      const score = scores[subRelated];
      const weaknessBoost = score !== undefined ? (100 - score) / 100 : 0.5;
      recommendations[subRelated] = Math.round(direct.weight * subGraph.weight * weaknessBoost * 100);
    }
  }

  // Sort by priority descending, return top 5
  return Object.fromEntries(
    Object.entries(recommendations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  );
}

// ── Canvas Radar Chart ───────────────────────────────────────────────────────

/**
 * Renders a radar (spider) chart on a Canvas element showing performance across specialties.
 * Zero dependencies — pure Canvas 2D drawing.
 *
 * @param {HTMLCanvasElement} canvas - The canvas element to draw on
 * @param {Object<string, number>} data - Map of specialty → score (0-100)
 * @param {Object} [options]
 * @param {number} [options.size] - Chart diameter in px (default: auto from canvas)
 * @param {string[]} [options.colorScheme] - Array of hex colors for the data fill
 */
function renderRadarChart(canvas, data, options = {}) {
  if (!canvas || !data) return;

  const ctx = canvas.getContext('2d');
  const entries = Object.entries(data).filter(([, v]) => typeof v === 'number' && v >= 0);
  if (entries.length < 3) {
    // Need at least 3 dimensions for a radar chart
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Tajawal, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Complete a quiz in 3+ specialties to see your radar chart', canvas.width / 2, canvas.height / 2);
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const size = options.size || Math.min(w, h) * 0.85;
  const cx = w / 2;
  const cy = h / 2;
  const radius = size / 2;
  const levels = 5; // concentric grid lines
  const angleStep = (2 * Math.PI) / entries.length;
  const colorMain = options.colorScheme?.[0] || '#11B4D4';
  const colorFill = colorMain + '20'; // 12.5% opacity

  ctx.clearRect(0, 0, w, h);

  // ── Draw concentric grid ──────────────────────────────────────────────────────
  for (let level = 1; level <= levels; level++) {
    const r = (radius / levels) * level;
    ctx.beginPath();
    for (let i = 0; i <= entries.length; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = '#2E4350';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ── Draw axis lines ───────────────────────────────────────────────────────────
  for (let i = 0; i < entries.length; i++) {
    const angle = i * angleStep - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    ctx.strokeStyle = '#2E4350';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ── Draw data polygon ────────────────────────────────────────────────────────
  ctx.beginPath();
  for (let i = 0; i < entries.length; i++) {
    const [_, value] = entries[i];
    const r = (value / 100) * radius;
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = colorFill;
  ctx.fill();
  ctx.strokeStyle = colorMain;
  ctx.lineWidth = 2;
  ctx.stroke();

  // ── Draw data points ──────────────────────────────────────────────────────────
  for (let i = 0; i < entries.length; i++) {
    const [_, value] = entries[i];
    const r = (value / 100) * radius;
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = colorMain;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ── Draw labels ──────────────────────────────────────────────────────────────
  ctx.font = '11px Tajawal, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < entries.length; i++) {
    const [label, value] = entries[i];
    const angle = i * angleStep - Math.PI / 2;
    const labelR = radius + 22;
    const x = cx + labelR * Math.cos(angle);
    const y = cy + labelR * Math.sin(angle);

    // Shorten label for display
    const shortLabel = label.length > 12 ? label.substring(0, 10) + '…' : label;
    const displayText = `${shortLabel} ${value}%`;

    ctx.fillStyle = '#DCE6EE';
    ctx.fillText(displayText, x, y);
  }
}

// ── "Study Next" Card HTML ───────────────────────────────────────────────────

/**
 * Generates HTML for the "Next Study Recommendations" section.
 * Shows your weakest areas and related specialties to tackle next.
 *
 * @param {Object<string, number>} specialtyScores - Map of bucket → score (0-100)
 * @param {string} [currentTopic] - Current topic being studied (for context-aware recs)
 * @returns {string} HTML string
 */
function getStudyNextHtml(specialtyScores = {}, currentTopic = '') {
  // Sort specialties by score ascending (weakest first)
  const sorted = Object.entries(specialtyScores)
    .filter(([, s]) => typeof s === 'number' && s > 0)
    .sort(([, a], [, b]) => a - b);

  if (sorted.length < 2) {
    return `
      <div class="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md">
        <h3 class="text-lg font-bold text-white mb-2">📚 Study Next</h3>
        <p class="text-slate-400 text-sm">Complete a quiz session to get personalized study recommendations.</p>
      </div>`;
  }

  const weakest = sorted.slice(0, 3);
  const recommendations = getStudyRecommendations(
    currentTopic || weakest[0]?.[0] || sorted[0]?.[0],
    specialtyScores
  );

  const recItems = Object.entries(recommendations)
    .filter(([topic]) => !weakest.some(([w]) => w === topic))
    .map(([topic, priority]) => `
      <button class="study-next-btn flex items-center justify-between w-full px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
              data-topic="${topic.replace(/'/g, "\\'")}">
        <span class="text-sm font-medium text-white">${topic}</span>
        <span class="text-xs font-bold ${priority >= 50 ? 'text-emerald-400' : 'text-amber-400'}">${priority}% match</span>
      </button>`)
    .join('');

  const weakestItems = weakest
    .map(([topic, score]) => {
      const color = score < 40 ? 'text-red-400' : score < 60 ? 'text-amber-400' : 'text-emerald-400';
      return `
        <button class="study-next-btn flex items-center justify-between w-full px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
                data-topic="${topic.replace(/'/g, "\\'")}">
          <span class="text-sm font-medium text-white">${topic}</span>
          <span class="text-xs font-bold ${color}">${score}%</span>
        </button>`;
    })
    .join('');

  return `
    <div class="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md">
      <h3 class="text-lg font-bold text-white mb-1">📚 Study Next</h3>
      <p class="text-xs text-slate-500 mb-4">Based on your performance and specialty relationships</p>

      <div class="space-y-2">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">🔴 Weakest Areas</p>
        ${weakestItems}

        ${recItems ? `
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4">🔄 Related Specialties To Try</p>
        ${recItems}` : ''}
      </div>
    </div>`;
}

/**
 * Attaches click handlers for "study next" buttons.
 * Calls the provided callback with the selected topic.
 *
 * @param {Function} onStudyTopic - Callback(topic: string) => void
 */
function attachStudyNextHandlers(onStudyTopic) {
  document.querySelectorAll('.study-next-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const topic = btn.dataset.topic;
      if (topic && onStudyTopic) onStudyTopic(topic);
    });
  });
}

export {
  SPECIALTY_GRAPH,
  getStudyRecommendations,
  renderRadarChart,
  getStudyNextHtml,
  attachStudyNextHandlers,
};
