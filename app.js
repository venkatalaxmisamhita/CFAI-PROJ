// ─────────────────────────────────────────────
//  MedAI · app.js
//  Wires the 4-step wizard → engine → results
// ─────────────────────────────────────────────

/* ── Wizard state ── */
const state = {
  currentStep: 1,
  age: 32,
  gender: null,
  preexisting: [],

  bp_mode: null,          // 'yes' | 'no'
  bp_systolic: null,
  bp_diastolic: null,
  bp_category: null,      // 'Normal'|'Elevated'|'High'|'Low'|'Unknown'
  bp_confidence: 0.70,

  chol_mode: null,        // 'yes' | 'no'
  chol_value: null,
  chol_category: null,    // 'Low'|'Normal'|'Elevated'|'High'|'Unknown'
  chol_confidence: 0.70,

  symptoms: {},           // { fever: true, cough: true, ... }
  freetext: '',
  unknown_symptom_texts: [],
  emergency_flag: false,
};

/* ══════════════════════════════════════════════
   PEAS TOGGLE
══════════════════════════════════════════════ */
function togglePeas() {
  const card = document.getElementById('peas-card');
  const btn  = document.getElementById('peas-btn');
  const open = card.style.display !== 'block';
  card.style.display = open ? 'block' : 'none';
  btn.textContent    = open ? '▲ Hide PEAS' : '▼ What is PEAS?';
}

/* ══════════════════════════════════════════════
   PROGRESS BAR
══════════════════════════════════════════════ */
function updateProgress(step) {
  for (let i = 1; i <= 4; i++) {
    const circle = document.getElementById(`step-circle-${i}`);
    const item   = document.getElementById(`step-item-${i}`);
    circle.classList.remove('active', 'done');
    item.classList.remove('active');

    if (i < step) {
      circle.classList.add('done');
      circle.textContent = '✓';
    } else if (i === step) {
      circle.classList.add('active');
      circle.textContent = i;
      item.classList.add('active');
    } else {
      circle.textContent = i;
    }
  }
  // Fill connectors
  for (let i = 1; i <= 3; i++) {
    const conn = document.getElementById(`conn-${i}-${i + 1}`);
    if (conn) conn.classList.toggle('filled', i < step);
  }
}

/* ══════════════════════════════════════════════
   STEP NAVIGATION
══════════════════════════════════════════════ */
function goToStep(step) {
  document.getElementById(`step-${state.currentStep}`).classList.remove('active');
  state.currentStep = step;
  document.getElementById(`step-${step}`).classList.add('active');
  updateProgress(step);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════════════
   STEP 1 — PROFILE
══════════════════════════════════════════════ */

// Age slider
document.getElementById('age-slider').addEventListener('input', function () {
  state.age = parseInt(this.value, 10);
  document.getElementById('age-display').textContent = `${state.age} years`;
});

// Single-select pills (gender)
function selectSingle(groupId, btn) {
  const wrap = document.getElementById(groupId);
  wrap.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
  btn.classList.add('selected');
  if (groupId === 'gender-pills') state.gender = btn.textContent;
}

// Pre-existing conditions multi-select
function toggleCondition(btn) {
  btn.classList.toggle('selected');
  _syncConditions();
}

function toggleNone(btn) {
  const wrap = document.getElementById('conditions-pills');
  const wasSelected = btn.classList.contains('selected');
  wrap.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
  if (!wasSelected) btn.classList.add('selected');
  _syncConditions();
}

function _syncConditions() {
  const wrap = document.getElementById('conditions-pills');
  const none = wrap.querySelector('.none-pill');
  if (none && none.classList.contains('selected')) {
    state.preexisting = [];
    return;
  }
  state.preexisting = [];
  wrap.querySelectorAll('.pill:not(.none-pill)').forEach(p => {
    if (p.classList.contains('selected')) {
      state.preexisting.push(p.textContent.trim().toLowerCase().replace(/\s+/g, '_'));
    }
  });
}

/* ══════════════════════════════════════════════
   STEP 2 — BLOOD PRESSURE
══════════════════════════════════════════════ */

const BP_CLASSES = {
  Low:      { cls: 'badge-blue',   label: 'Low' },
  Normal:   { cls: 'badge-green',  label: 'Normal' },
  Elevated: { cls: 'badge-amber',  label: 'Elevated' },
  High:     { cls: 'badge-red',    label: 'High' },
  Unknown:  { cls: 'badge-muted',  label: 'Unknown' },
};

function selectBPMode(mode, card) {
  state.bp_mode = mode;
  document.querySelectorAll('#bp-has-reading .option-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');

  document.getElementById('bp-yes-section').style.display = mode === 'yes' ? 'block' : 'none';
  document.getElementById('bp-no-section').style.display  = mode === 'no'  ? 'block' : 'none';

  if (mode === 'yes') {
    state.bp_confidence = 1.0;
    _updateBPBadge();
  }
}

function selectBPDiagnosis(level, card) {
  document.querySelectorAll('#bp-no-section .option-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');

  const label = document.getElementById('bp-diag-label');
  if (level === 'low') {
    state.bp_category   = 'Low';
    state.bp_confidence = 0.85;
    label.className = 'conf-label conf-amber';
    label.textContent = 'Based on diagnosis — medium confidence';
  } else if (level === 'high') {
    state.bp_category   = 'High';
    state.bp_confidence = 0.85;
    label.className = 'conf-label conf-amber';
    label.textContent = 'Based on diagnosis — medium confidence';
  } else {
    state.bp_category   = 'Unknown';
    state.bp_confidence = 0.70;
    label.className = 'conf-label conf-muted';
    label.textContent = '⚠ BP unknown — results less precise';
  }
}

function _updateBPBadge() {
  const sys = parseInt(document.getElementById('bp-systolic').value, 10);
  const dia = parseInt(document.getElementById('bp-diastolic').value, 10);
  const badge = document.getElementById('bp-badge');
  if (!sys || !dia) { badge.innerHTML = ''; return; }

  const cat = classifyBP(sys, dia);
  state.bp_category  = cat;
  state.bp_systolic  = sys;
  state.bp_diastolic = dia;

  const { cls, label } = BP_CLASSES[cat] || BP_CLASSES.Unknown;
  badge.innerHTML = `<span class="classification-badge ${cls}">${label} (${sys}/${dia})</span>`;
}

document.getElementById('bp-systolic').addEventListener('input', _updateBPBadge);
document.getElementById('bp-diastolic').addEventListener('input', _updateBPBadge);

/* ══════════════════════════════════════════════
   STEP 3 — CHOLESTEROL
══════════════════════════════════════════════ */

const CHOL_CLASSES = {
  Low:      { cls: 'badge-blue',   label: 'Low' },
  Normal:   { cls: 'badge-green',  label: 'Normal' },
  Elevated: { cls: 'badge-amber',  label: 'Elevated' },
  High:     { cls: 'badge-red',    label: 'High' },
  Unknown:  { cls: 'badge-muted',  label: 'Unknown' },
};

function selectCholMode(mode, card) {
  state.chol_mode = mode;
  document.querySelectorAll('#chol-has-reading .option-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');

  document.getElementById('chol-yes-section').style.display = mode === 'yes' ? 'block' : 'none';
  document.getElementById('chol-no-section').style.display  = mode === 'no'  ? 'block' : 'none';

  if (mode === 'yes') {
    state.chol_confidence = 1.0;
    _updateCholBadge();
  }
}

function selectCholDiagnosis(level, card) {
  document.querySelectorAll('#chol-no-section .option-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');

  const label = document.getElementById('chol-diag-label');
  if (level === 'high') {
    state.chol_category   = 'High';
    state.chol_confidence = 0.85;
    label.className = 'conf-label conf-amber';
    label.textContent = 'Based on diagnosis — medium confidence';
  } else {
    state.chol_category   = 'Unknown';
    state.chol_confidence = 0.70;
    label.className = 'conf-label conf-muted';
    label.textContent = '⚠ Cholesterol unknown — results less precise';
  }
}

function _updateCholBadge() {
  const val = parseInt(document.getElementById('chol-value').value, 10);
  const badge = document.getElementById('chol-badge');
  if (!val) { badge.innerHTML = ''; return; }

  const cat = classifyCholesterol(val);
  state.chol_category = cat;
  state.chol_value    = val;

  const { cls, label } = CHOL_CLASSES[cat] || CHOL_CLASSES.Unknown;
  badge.innerHTML = `<span class="classification-badge ${cls}">${label} (${val} mg/dL)</span>`;
}

document.getElementById('chol-value').addEventListener('input', _updateCholBadge);

/* ══════════════════════════════════════════════
   STEP 4 — SYMPTOMS
══════════════════════════════════════════════ */

function toggleSymptom(btn) {
  btn.classList.toggle('selected');
  const key = btn.getAttribute('data-sym');
  state.symptoms[key] = btn.classList.contains('selected');
}

// Free-text live parsing
document.getElementById('freetext-input').addEventListener('input', function () {
  state.freetext = this.value;
  _parseFreetext(this.value);
});

async function _parseFreetext(text) {
  const container = document.getElementById('detected-chips');
  container.innerHTML = '';
  if (!text.trim()) return;

  // ── Call Python backend ──────────────────────────────────────────────────
  let parsed;
  try {
    const resp = await fetch('/api/parse_freetext', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    parsed = await resp.json();
  } catch (err) {
    console.error('parse_freetext API error:', err);
    return;
  }
  // ────────────────────────────────────────────────────────────────────────

  // Backend returns: { matched: {symptom: true, ...}, unknown: [...], emergency: bool }
  const matched   = Object.keys(parsed.matched || {});
  const unmatched = parsed.unknown || [];

  state.unknown_symptom_texts = unmatched;
  state.emergency_flag        = parsed.emergency || false;

  // Merge free-text matches into symptoms (don't override manual toggles)
  matched.forEach(key => {
    if (!state.symptoms[key]) state.symptoms[key] = true;
  });

  if (matched.length) {
    const label = document.createElement('span');
    label.className = 'chip-label chip-teal';
    label.textContent = 'Detected: ';
    container.appendChild(label);
    matched.forEach(key => {
      const chip = document.createElement('span');
      chip.className = 'chip chip-teal';
      chip.textContent = key.replace(/_/g, ' ');
      container.appendChild(chip);
    });
  }

  if (unmatched.length) {
    const label = document.createElement('span');
    label.className = 'chip-label chip-amber';
    label.style.marginLeft = matched.length ? '10px' : '0';
    label.textContent = 'Also noted: ';
    container.appendChild(label);
    unmatched.forEach(phrase => {
      const chip = document.createElement('span');
      chip.className = 'chip chip-amber';
      chip.textContent = `'${phrase}'`;
      container.appendChild(chip);
    });
  }
}

/* ══════════════════════════════════════════════
   RUN DIAGNOSIS
══════════════════════════════════════════════ */
async function runDiagnosis() {
  // Build inputs object (same shape as before)
  const inputs = {
    age:                  state.age,
    bp:                   state.bp_category   || 'Unknown',
    cholesterol:          state.chol_category || 'Unknown',
    bp_confidence:        state.bp_confidence,
    chol_confidence:      state.chol_confidence,
    symptoms:             Object.assign({}, state.symptoms),
    preexisting:          state.preexisting,
    unknown_symptom_count: state.unknown_symptom_texts.length,
    emergency_flag:       state.emergency_flag,
  };

  // ── Call Python backend ──────────────────────────────────────────────────
  let data;
  try {
    const resp = await fetch('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs),
    });
    data = await resp.json();
  } catch (err) {
    console.error('diagnose API error:', err);
    alert('Could not reach the diagnosis server. Is Flask running?');
    return;
  }
  const results   = data.results;
  const emergency = data.emergency;
  // ────────────────────────────────────────────────────────────────────────

  // Hide wizard, show results
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`step-${i}`).classList.remove('active');
  }
  document.querySelector('.progress-wrap').style.display = 'none';

  renderResults(results, emergency, inputs);

  document.getElementById('results-page').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════════════
   RESULTS RENDERER
══════════════════════════════════════════════ */
function renderResults(results, emergency, inputs) {
  const page = document.getElementById('results-page');

  const top5 = results.slice(0, 5);
  const top  = top5[0];

  const dangerColors = {
    low:      { bg: '#f0fdf4', border: '#86efac', text: '#166534', badge: '#dcfce7', badgeText: '#166534' },
    moderate: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', badge: '#fef3c7', badgeText: '#92400e' },
    high:     { bg: '#fff7ed', border: '#fdba74', text: '#9a3412', badge: '#ffedd5', badgeText: '#9a3412' },
    critical: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', badge: '#fee2e2', badgeText: '#991b1b' },
  };

  // ── Emergency Banner ──
  const emergencyHTML = emergency ? `
    <div class="result-emergency-banner">
      <span class="emergency-icon">🚨</span>
      <div>
        <strong>Seek Emergency Care Immediately</strong>
        <p>Your symptoms may indicate a life-threatening condition. Call emergency services (112 / 911) or go to the nearest emergency room now.</p>
      </div>
    </div>` : '';

  // ── Disclaimer ──
  const disclaimerHTML = `
    <div class="result-disclaimer">
      ⚠️ <strong>Medical Disclaimer:</strong> This tool is for educational purposes only and does not constitute medical advice. Always consult a qualified healthcare professional for diagnosis and treatment.
    </div>`;

  // ── Top Diagnoses ──
  const diagsHTML = top5.map((r, idx) => {
    const d = r.disease;
    const dc = dangerColors[d.danger_level] || dangerColors.low;
    const pct = r.probability.toFixed(1);
    const barW = Math.max(4, Math.min(100, r.probability));

    const traceRows = r.belief_trace.map(t =>
      `<tr><td>${t.label}</td><td>${t.value.toFixed(2)}%</td></tr>`
    ).join('');

    const recList = (d.recommendations || []).map(rec =>
      `<li>${rec}</li>`
    ).join('');

    const sympList = Object.keys(d.symptoms).slice(0, 6).map(s =>
      `<span class="sym-tag">${s.replace(/_/g,' ')}</span>`
    ).join('');

    return `
      <div class="diag-card" style="border-left: 4px solid ${dc.border}; background: ${idx === 0 ? dc.bg : '#fff'};">
        <div class="diag-card-header">
          <div class="diag-name-wrap">
            ${idx === 0 ? '<span class="top-badge">Top Match</span>' : ''}
            <span class="diag-name">${d.name}</span>
            <span class="danger-badge" style="background:${dc.badge}; color:${dc.badgeText};">
              ${_dangerIcon(d.danger_level)} ${d.danger_level.charAt(0).toUpperCase() + d.danger_level.slice(1)} Risk
            </span>
          </div>
          <span class="diag-prob">${pct}%</span>
        </div>

        <div class="prob-bar-track">
          <div class="prob-bar-fill" style="width:${barW}%; background:${dc.border};"></div>
        </div>

        <p class="diag-desc">${d.description || ''}</p>

        <div class="diag-tags-row">${sympList}</div>

        <details class="diag-details">
          <summary>View Bayesian trace &amp; recommendations</summary>
          <div class="diag-details-body">
            <div class="trace-wrap">
              <div class="trace-title">Belief Trace</div>
              <table class="trace-table">
                <thead><tr><th>Factor</th><th>Running Prob.</th></tr></thead>
                <tbody>${traceRows}</tbody>
              </table>
            </div>
            ${recList ? `<div class="recs-wrap"><div class="trace-title">Recommendations</div><ul class="recs-list">${recList}</ul></div>` : ''}
          </div>
        </details>
      </div>`;
  }).join('');

  // ── Input Summary ──
  const selectedSymptoms = Object.keys(inputs.symptoms).filter(k => inputs.symptoms[k]);
  const symSummary = selectedSymptoms.length
    ? selectedSymptoms.map(s => `<span class="sym-tag">${s.replace(/_/g,' ')}</span>`).join('')
    : '<span style="color:var(--muted)">None selected</span>';

  const summaryHTML = `
    <div class="result-card" style="margin-top:24px;">
      <div class="result-section-title">Your Input Summary</div>
      <div class="summary-grid">
        <div class="summary-item"><span class="summary-label">Age</span><span>${inputs.age} years</span></div>
        <div class="summary-item"><span class="summary-label">Gender</span><span>${state.gender || 'Not specified'}</span></div>
        <div class="summary-item"><span class="summary-label">Blood Pressure</span><span>${inputs.bp} <span class="conf-tiny">(conf: ${Math.round(inputs.bp_confidence * 100)}%)</span></span></div>
        <div class="summary-item"><span class="summary-label">Cholesterol</span><span>${inputs.cholesterol} <span class="conf-tiny">(conf: ${Math.round(inputs.chol_confidence * 100)}%)</span></span></div>
        <div class="summary-item" style="grid-column:1/-1;"><span class="summary-label">Pre-existing Conditions</span><span>${inputs.preexisting.length ? inputs.preexisting.join(', ') : 'None'}</span></div>
        <div class="summary-item" style="grid-column:1/-1;"><span class="summary-label">Symptoms</span><div style="margin-top:6px;">${symSummary}</div></div>
        ${state.freetext ? `<div class="summary-item" style="grid-column:1/-1;"><span class="summary-label">Free Text</span><span style="font-style:italic; color:var(--muted);">"${state.freetext}"</span></div>` : ''}
      </div>
    </div>`;

  // ── Restart button ──
  const restartHTML = `
    <div style="text-align:center; margin-top:32px; margin-bottom:48px;">
      <button class="btn btn-primary" onclick="restartWizard()" style="max-width:320px;">↩ Start Over</button>
    </div>`;

  page.innerHTML = `
    <div style="padding-top: 8px;">
      ${emergencyHTML}
      ${disclaimerHTML}
      <div class="result-card" style="margin-top:20px;">
        <div class="result-section-title" style="font-size:1.3rem; margin-bottom:4px;">Diagnostic Results</div>
        <div style="color:var(--muted); font-size:0.93rem; margin-bottom:20px;">Top ${top5.length} most probable conditions based on your inputs</div>
        ${diagsHTML}
      </div>
      ${summaryHTML}
      ${restartHTML}
    </div>`;

  _injectResultStyles();
}

function _dangerIcon(level) {
  return { low: '🟢', moderate: '🟡', high: '🟠', critical: '🔴' }[level] || '⚪';
}

/* ══════════════════════════════════════════════
   RESTART
══════════════════════════════════════════════ */
function restartWizard() {
  // Reset state
  Object.assign(state, {
    currentStep: 1,
    age: 32,
    gender: null,
    preexisting: [],
    bp_mode: null, bp_systolic: null, bp_diastolic: null,
    bp_category: null, bp_confidence: 0.70,
    chol_mode: null, chol_value: null,
    chol_category: null, chol_confidence: 0.70,
    symptoms: {},
    freetext: '',
    unknown_symptom_texts: [],
    emergency_flag: false,
  });

  // Reset UI inputs
  document.getElementById('age-slider').value = 32;
  document.getElementById('age-display').textContent = '32 years';
  document.querySelectorAll('.pill.selected').forEach(p => p.classList.remove('selected'));
  document.querySelectorAll('.option-card.selected').forEach(c => c.classList.remove('selected'));
  document.getElementById('bp-yes-section').style.display  = 'none';
  document.getElementById('bp-no-section').style.display   = 'none';
  document.getElementById('bp-badge').innerHTML            = '';
  document.getElementById('bp-diag-label').textContent     = '';
  document.getElementById('bp-systolic').value             = '';
  document.getElementById('bp-diastolic').value            = '';
  document.getElementById('chol-yes-section').style.display = 'none';
  document.getElementById('chol-no-section').style.display  = 'none';
  document.getElementById('chol-badge').innerHTML           = '';
  document.getElementById('chol-diag-label').textContent    = '';
  document.getElementById('chol-value').value               = '';
  document.getElementById('freetext-input').value           = '';
  document.getElementById('detected-chips').innerHTML       = '';

  // Hide results, show wizard
  document.getElementById('results-page').style.display = 'none';
  document.querySelector('.progress-wrap').style.display = '';
  document.getElementById('step-1').classList.add('active');
  updateProgress(1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════════════
   RESULT PAGE STYLES  (injected once)
══════════════════════════════════════════════ */
let _stylesInjected = false;
function _injectResultStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;

  const css = `
    .result-emergency-banner {
      display: flex; gap: 16px; align-items: flex-start;
      background: #fef2f2; border: 2px solid #fca5a5;
      border-radius: 12px; padding: 18px 20px; margin-bottom: 16px;
    }
    .emergency-icon { font-size: 2rem; line-height: 1; }
    .result-emergency-banner strong { color: #991b1b; font-size: 1.05rem; }
    .result-emergency-banner p { margin: 6px 0 0; color: #b91c1c; font-size: 0.92rem; }

    .result-disclaimer {
      background: #fffbeb; border: 1px solid #fcd34d;
      border-radius: 10px; padding: 12px 16px;
      font-size: 0.88rem; color: #78350f; line-height: 1.5;
    }

    .result-card {
      background: var(--surface); border-radius: 16px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.07);
      padding: 24px; margin-top: 16px;
    }
    .result-section-title {
      font-family: 'Playfair Display', serif;
      font-size: 1.15rem; font-weight: 700;
      color: var(--text); margin-bottom: 16px;
    }

    /* Diagnosis cards */
    .diag-card {
      border-radius: 12px; padding: 20px; margin-bottom: 14px;
      border: 1px solid #e2e8f0;
      transition: box-shadow 0.15s ease;
    }
    .diag-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.10); }
    .diag-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .diag-name-wrap { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .diag-name { font-family: 'Playfair Display', serif; font-size: 1.08rem; font-weight: 700; color: var(--text); }
    .diag-prob { font-size: 1.4rem; font-weight: 800; color: var(--teal); white-space: nowrap; }

    .top-badge { background: var(--teal); color: #fff; font-size: 0.72rem; font-weight: 700;
      padding: 3px 9px; border-radius: 99px; letter-spacing: 0.04em; text-transform: uppercase; }

    .danger-badge { font-size: 0.78rem; font-weight: 600; padding: 3px 10px; border-radius: 99px; }

    .prob-bar-track { height: 6px; background: #e2e8f0; border-radius: 99px; overflow: hidden; margin-bottom: 12px; }
    .prob-bar-fill  { height: 100%; border-radius: 99px; }

    .diag-desc { font-size: 0.9rem; color: var(--muted); margin: 0 0 10px; line-height: 1.55; }

    .diag-tags-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
    .sym-tag { font-size: 0.78rem; background: var(--teal-light); color: var(--teal);
      padding: 3px 10px; border-radius: 99px; font-weight: 500; }

    .diag-details summary {
      cursor: pointer; font-size: 0.85rem; color: var(--teal);
      font-weight: 600; padding: 4px 0; list-style: none;
    }
    .diag-details summary::-webkit-details-marker { display: none; }
    .diag-details[open] summary::before { content: '▾ '; }
    .diag-details:not([open]) summary::before { content: '▸ '; }
    .diag-details-body { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 14px; }

    .trace-wrap, .recs-wrap { flex: 1; min-width: 200px; }
    .trace-title { font-weight: 700; font-size: 0.85rem; color: var(--text); margin-bottom: 8px; }
    .trace-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .trace-table th { text-align: left; color: var(--muted); font-weight: 600;
      border-bottom: 1px solid #e2e8f0; padding: 4px 8px 6px; }
    .trace-table td { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; color: var(--text); }
    .trace-table tr:last-child td { font-weight: 700; color: var(--teal); }

    .recs-list { margin: 0; padding-left: 18px; }
    .recs-list li { font-size: 0.87rem; color: var(--text); margin-bottom: 6px; line-height: 1.5; }

    /* Summary grid */
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .summary-item { display: flex; flex-direction: column; gap: 3px; }
    .summary-label { font-size: 0.78rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-item > span:last-child { font-size: 0.92rem; color: var(--text); }
    .conf-tiny { font-size: 0.76rem; color: var(--muted); }

    /* Chips */
    .chip { display: inline-block; font-size: 0.8rem; padding: 3px 10px; border-radius: 99px; margin: 3px 2px; }
    .chip-label { display: inline-block; font-size: 0.8rem; font-weight: 600; margin: 3px 4px 3px 0; }
    .chip-teal { background: var(--teal-light); color: var(--teal); }
    .chip-amber { background: #fef3c7; color: #92400e; }
    .chip-label.chip-teal { color: var(--teal); }
    .chip-label.chip-amber { color: #92400e; }

    /* Classification badges */
    .classification-badge {
      display: inline-block; font-size: 0.85rem; font-weight: 600;
      padding: 5px 14px; border-radius: 99px; margin-top: 8px;
    }
    .badge-green  { background: #dcfce7; color: #166534; }
    .badge-blue   { background: #dbeafe; color: #1e40af; }
    .badge-amber  { background: #fef3c7; color: #92400e; }
    .badge-red    { background: #fee2e2; color: #991b1b; }
    .badge-muted  { background: #f1f5f9; color: var(--muted); }

    /* Progress connector fill */
    .step-connector.filled { background: var(--teal); }

    @media (max-width: 640px) {
      .summary-grid { grid-template-columns: 1fr; }
      .diag-details-body { flex-direction: column; }
    }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  updateProgress(1);
});
