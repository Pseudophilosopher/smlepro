/**
 * dashboard-widgets.mjs → renamed to .js for client compat
 *
 * Dashboard widgets: Blueprint progress, SMLE sim, weekly target, smart recs.
 */

// ── SMLE Blueprint domains ──────────────────────────────────────────────────
const BLUEPRINT = [
  { key: 'Internal Medicine', label: 'Medicine', weight: 30, color: '#11B4D4' },
  { key: 'OBGYN', label: 'OBGYN', weight: 25, color: '#D4AF37' },
  { key: 'Pediatrics', label: 'Pediatrics', weight: 25, color: '#10B981' },
  { key: 'Surgery', label: 'Surgery', weight: 20, color: '#F59E0B' },
];

const BLUEPRINT_SUBTOPICS = {
  'Internal Medicine': [
    'Cardiology', 'Pulmonology', 'Gastroenterology', 'Nephrology',
    'Endocrinology', 'Rheumatology', 'Hematology', 'Infectious Diseases',
    'Neurology', 'Psychiatry', 'Critical Care',
  ],
  'OBGYN': ['Obstetrics', 'Gynecology'],
  'Pediatrics': ['General Pediatrics', 'Neonatology', 'Pediatric ID'],
  'Surgery': ['General Surgery', 'Trauma', 'Orthopedics', 'Urology', 'ENT', 'Ophthalmology'],
};

// ── Map session topicStats keys to blueprint domains ─────────────────────────
function topicToBlueprintDomain(topic) {
  const t = (topic || '').toLowerCase();
  if (t.includes('internal medicine') || t.includes('cardiology') || t.includes('pulmonology')
    || t.includes('gastroenterology') || t.includes('nephrology') || t.includes('endocrinology')
    || t.includes('rheumatology') || t.includes('hematology') || t.includes('infectious')
    || t.includes('neurology') || t.includes('psychiatry') || t.includes('critical care')
    || t.includes('oncology') || t.includes('geriatrics') || t.includes('ethics')
    || t.includes('dermatology') || t.includes('pharmacology') || t.includes('immunology')
    || t.includes('preventive') || t.includes('safety') || t.includes('public health'))
    return 'Internal Medicine';
  if (t.includes('obstetr') || t.includes('gynaec') || t.includes('gynec') || t.includes('obgyn'))
    return 'OBGYN';
  if (t.includes('pediatric') || t.includes('neonat'))
    return 'Pediatrics';
  if (t.includes('surgery') || t.includes('ortho') || t.includes('ophthal')
    || t.includes('ent ') || t.includes('urology') || t.includes('trauma')
    || t.includes('neurosurgery') || t.includes('burn') || t.includes('hernia')
    || t.includes('anesthesia'))
    return 'Surgery';
  return 'General';
}

// ── Build blueprint progress HTML ───────────────────────────────────────────
export function buildBlueprintProgress(specialtyStats) {
  // Aggregate specialtyStats into blueprint domains
  const domainStats = {};
  BLUEPRINT.forEach(d => { domainStats[d.key] = { correct: 0, total: 0 }; });

  Object.entries(specialtyStats).forEach(([bucket, stats]) => {
    const domain = topicToBlueprintDomain(bucket);
    if (domainStats[domain]) {
      domainStats[domain].correct += stats.correct;
      domainStats[domain].total += stats.total;
    }
  });

  const hasData = Object.values(domainStats).some(d => d.total > 0);
  if (!hasData) {
    return `<section class="bg-surface-dark rounded-2xl p-5 border border-border-dark">
      <h3 class="text-xs font-black text-white uppercase tracking-widest mb-3">SMLE Blueprint Progress</h3>
      <p class="text-sm text-slate-500">Complete a practice session to see your blueprint breakdown.</p>
    </section>`;
  }

  // Overall weighted score
  let totalCorrect = 0, totalTotal = 0;
  Object.values(domainStats).forEach(d => { totalCorrect += d.correct; totalTotal += d.total; });
  const overallPct = totalTotal > 0 ? Math.round((totalCorrect / totalTotal) * 100) : 0;

  const barsHtml = BLUEPRINT.map(d => {
    const s = domainStats[d.key] || { correct: 0, total: 0 };
    const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    const barWidth = Math.max(4, pct);
    const expectedQ = Math.round((d.weight / 100) * totalTotal);
    const diff = (s.total - expectedQ);

    return `
      <div class="mb-4">
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full inline-block" style="background:${d.color}"></span>
            <span class="text-sm font-bold text-white">${d.label}</span>
            <span class="text-[10px] text-slate-500">${s.total}Q answered · ${Math.round(s.total / (totalTotal || 1) * 100)}% of your practice</span>
          </div>
          <span class="text-sm font-black" style="color:${pct >= 70 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'}">${pct}%</span>
        </div>
        <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500" style="width:${barWidth}%;background:${d.color}"></div>
        </div>
        <div class="flex justify-between mt-0.5">
          <span class="text-[9px] text-slate-600">Blueprint target: ${d.weight}% (${expectedQ}Q)</span>
          <span class="text-[9px] ${diff >= 0 ? 'text-accent-green' : 'text-slate-600'}">${diff >= 0 ? '+' : ''}${diff}Q vs target</span>
        </div>
      </div>`;
  }).join('');

  return `
    <section id="blueprint-progress" class="bg-surface-dark rounded-2xl p-5 border border-border-dark">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xs font-black text-white uppercase tracking-widest">SMLE Blueprint Progress</h3>
        <span class="text-lg font-black" style="color:${overallPct >= 70 ? '#10B981' : overallPct >= 50 ? '#F59E0B' : '#EF4444'}">${overallPct}%</span>
      </div>
      ${barsHtml}
      <div class="mt-3 pt-3 border-t border-border-dark/50">
        <p class="text-[10px] text-slate-500">Your performance weighted by the SMLE blueprint.</p>
      </div>
    </section>`;
}

// ── Build SMLE Simulation card ──────────────────────────────────────────────
export function buildSmleSimulation() {
  return `
    <section id="smle-simulation-card" class="bg-surface-dark rounded-2xl p-5 border border-accent-purple/30 shadow-depth relative overflow-hidden cursor-pointer hover:border-accent-purple/60 transition-colors"
      style="background:linear-gradient(135deg,rgba(139,92,246,0.08) 0%,rgba(10,20,30,0.6) 100%);">
      <div class="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none" style="background:radial-gradient(circle,rgba(139,92,246,0.15) 0%,transparent 70%);transform:translate(30%,-30%);"></div>
      <div class="relative flex items-start justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-xl bg-accent-purple/20 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-accent-purple text-lg">stethoscope_check</span>
          </div>
          <div>
            <h3 class="text-sm font-black text-white uppercase tracking-wider">SMLE Simulation</h3>
            <p class="text-[10px] text-slate-400 mt-0.5">200 questions · 4 hours · Blueprint-weighted</p>
          </div>
        </div>
        <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/30 uppercase shrink-0">Pro</span>
      </div>
      <div class="mt-4 grid grid-cols-4 gap-2">
        <div class="text-center p-2 rounded-lg bg-background-dark border border-border-dark">
          <p class="text-lg font-black text-white">200</p>
          <p class="text-[9px] text-slate-500">Questions</p>
        </div>
        <div class="text-center p-2 rounded-lg bg-background-dark border border-border-dark">
          <p class="text-lg font-black text-white">30%</p>
          <p class="text-[9px] text-slate-500">Medicine</p>
        </div>
        <div class="text-center p-2 rounded-lg bg-background-dark border border-border-dark">
          <p class="text-lg font-black text-white">25%</p>
          <p class="text-[9px] text-slate-500">OBGYN</p>
        </div>
        <div class="text-center p-2 rounded-lg bg-background-dark border border-border-dark">
          <p class="text-lg font-black text-white">4h</p>
          <p class="text-[9px] text-slate-500">Duration</p>
        </div>
      </div>
      <button id="start-simulation-btn" class="mt-4 w-full py-3 rounded-xl bg-accent-purple text-white font-black text-sm shadow-glow-purple hover:brightness-110 active:scale-[.98] transition-all">
        Start Full Simulation →
      </button>
    </section>`;
}

// ── Build weekly target ─────────────────────────────────────────────────────
export function buildWeeklyTarget(performanceHistory) {
  // Count questions answered this week
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  let weeklyQ = 0, weeklySessions = 0;
  (performanceHistory || []).forEach(s => {
    if (new Date(s.date) >= weekAgo) {
      weeklyQ += s.totalQuestions || 0;
      weeklySessions++;
    }
  });

  const target = 150; // 150 questions/week goal
  const pct = Math.min(100, Math.round((weeklyQ / target) * 100));

  return `
    <section class="bg-surface-dark rounded-2xl p-5 border border-border-dark">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xs font-black text-white uppercase tracking-widest">Weekly Target</h3>
        <span class="text-[10px] text-slate-500">${weeklySessions} session${weeklySessions !== 1 ? 's' : ''}</span>
      </div>
      <div class="flex items-baseline gap-2 mb-3">
        <span class="text-3xl font-black text-white">${weeklyQ}</span>
        <span class="text-sm text-slate-500">/ ${target} questions</span>
      </div>
      <div class="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
        <div class="h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-accent-green' : 'bg-primary'}" style="width:${pct}%"></div>
      </div>
      <p class="text-[10px] text-slate-500 mt-2">${pct >= 100 ? '🎉 Weekly goal achieved!' : `${target - weeklyQ} more questions to hit your weekly goal.`}</p>
    </section>`;
}

// ── Build smart recommendations ─────────────────────────────────────────────
export function buildSmartRecommendations(specialtyStats, wrongPool) {
  // Find weakest domain
  const domainScores = {};
  Object.entries(specialtyStats).forEach(([bucket, stats]) => {
    const domain = topicToBlueprintDomain(bucket);
    if (!domainScores[domain]) domainScores[domain] = { correct: 0, total: 0 };
    domainScores[domain].correct += stats.correct;
    domainScores[domain].total += stats.total;
  });

  let weakest = null, weakestPct = 100;
  Object.entries(domainScores).forEach(([domain, s]) => {
    if (s.total > 0) {
      const pct = (s.correct / s.total) * 100;
      if (pct < weakestPct) { weakestPct = pct; weakest = domain; }
    }
  });

  const wCount = wrongPool ? wrongPool.length : 0;
  const hasData = Object.keys(domainScores).length > 0 && Object.values(domainScores).some(s => s.total > 0);

  if (!hasData) {
    return `<section class="bg-surface-dark rounded-2xl p-5 border border-border-dark">
      <h3 class="text-xs font-black text-white uppercase tracking-widest mb-3">Smart Recommendations</h3>
      <p class="text-sm text-slate-500">Questions will appear after your first practice session.</p>
    </section>`;
  }

  const recs = [];
  if (weakest && weakestPct < 70) {
    recs.push(`🔍 Focus on <strong>${weakest}</strong> — your score is ${Math.round(weakestPct)}%. Try a specialty session.`);
  }
  if (wCount > 0) {
    recs.push(`📝 You have <strong>${wCount} weak question${wCount > 1 ? 's' : ''}</strong> to review. Use the Weak Questions drill.`);
  }
  if (recs.length === 0) {
    recs.push('🎯 Great work! Keep consistent with your Daily Dose to maintain your streak.');
  }

  return `
    <section class="bg-surface-dark rounded-2xl p-5 border border-border-dark">
      <h3 class="text-xs font-black text-white uppercase tracking-widest mb-3">Smart Recommendations</h3>
      <ul class="space-y-2">
        ${recs.map(r => `<li class="flex items-start gap-2 text-sm text-slate-300"><span class="mt-0.5 shrink-0">•</span> ${r}</li>`).join('')}
      </ul>
    </section>`;
}

// ── Build domain sparklines (mini score trends per domain) ──────────────────
export function buildDomainSparklines(performanceHistory) {
  // Group sessions by date, track per-domain scores
  if (!performanceHistory || performanceHistory.length < 2) return '';

  // Get last 7 days of sessions per domain
  const domains = {};
  (performanceHistory || []).slice(-20).forEach(s => {
    if (!s.topicStats) return;
    Object.entries(s.topicStats).forEach(([topic, stats]) => {
      const domain = topicToBlueprintDomain(topic);
      if (!domains[domain]) domains[domain] = [];
      domains[domain].push(Math.round((stats.correct / stats.total) * 100));
    });
  });

  const sparkHtml = Object.entries(domains).slice(0, 4).map(([domain, scores]) => {
    const recent = scores.slice(-7);
    const avg = recent.length > 0 ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : 0;
    const trend = recent.length >= 2 ? (recent[recent.length - 1] - recent[0]) : 0;

    // Simple sparkline using unicode blocks
    const max = Math.max(...recent, 1);
    const bars = recent.map(v => {
      const h = Math.max(1, Math.round((v / max) * 16));
      const color = v >= 70 ? '#10B981' : v >= 50 ? '#F59E0B' : '#EF4444';
      return `<div class="w-3 rounded-sm" style="height:${h}px;background:${color}"></div>`;
    }).join('');

    return `
      <div class="flex items-center justify-between py-1.5">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-sm font-bold text-white truncate">${domain}</span>
          <span class="text-xs font-black ${avg >= 70 ? 'text-accent-green' : avg >= 50 ? 'text-accent-orange' : 'text-accent-red'}">${avg}%</span>
        </div>
        <div class="flex items-end gap-0.5 h-4">${bars}</div>
        <span class="text-[10px] w-6 text-right ${trend > 0 ? 'text-accent-green' : trend < 0 ? 'text-accent-red' : 'text-slate-500'}">${trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}</span>
      </div>`;
  }).join('');

  if (!sparkHtml) return '';

  return `
    <section class="bg-surface-dark rounded-2xl p-5 border border-border-dark">
      <h3 class="text-xs font-black text-white uppercase tracking-widest mb-3">Domain Trends (Last 7 Sessions)</h3>
      <div class="space-y-1">${sparkHtml}</div>
    </section>`;
}
