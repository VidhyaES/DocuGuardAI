// ─── STATE ──────────────────────────────────────────────────────────────────
let selectedFile = null;

const ALLOWED_TYPES = {
  'image/jpeg': true, 'image/jpg': true, 'image/png': true,
  'image/webp': true, 'image/bmp': true, 'image/gif': true,
};
const MAX_MB = 15;

const STEPS = [
  'Validating image type & integrity',
  'Detecting document structure',
  'Checking font & text consistency',
  'Analyzing photo integration',
  'Detecting pixel anomalies',
  'Verifying security features',
  'Assessing editing artifacts',
  'Generating fraud risk report',
];

// ─── DRAG & DROP ─────────────────────────────────────────────────────────────
const zone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');

zone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); zone.classList.add('dragover'); });
zone.addEventListener('dragleave', e => { e.stopPropagation(); zone.classList.remove('dragover'); });
zone.addEventListener('drop', e => {
  e.preventDefault(); e.stopPropagation();
  zone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

// ─── HANDLE FILE ─────────────────────────────────────────────────────────────
function handleFile(file) {
  hideError(); hideReport();
  selectedFile = file;

  const typeOk = !!ALLOWED_TYPES[file.type];
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
  const sizeOk = parseFloat(sizeMB) <= MAX_MB;

  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('previewImg').src = e.target.result;
  };
  reader.readAsDataURL(file);

  document.getElementById('fileName').textContent = file.name;
  document.getElementById('previewMeta').innerHTML = `
    <div class="meta-row"><span class="meta-label">File Name</span><span class="meta-value">${file.name}</span></div>
    <div class="meta-row"><span class="meta-label">MIME Type</span><span class="meta-value ${typeOk ? 'ok' : 'err'}">${file.type || 'Unknown'} ${typeOk ? '✓' : '✗'}</span></div>
    <div class="meta-row"><span class="meta-label">File Size</span><span class="meta-value ${sizeOk ? 'ok' : 'err'}">${sizeMB} MB ${sizeOk ? '✓' : '✗ Too large'}</span></div>
    <div class="meta-row"><span class="meta-label">Last Modified</span><span class="meta-value">${new Date(file.lastModified).toLocaleString()}</span></div>
    <div class="meta-row"><span class="meta-label">Status</span><span class="meta-value ${typeOk && sizeOk ? 'ok' : 'err'}">${typeOk && sizeOk ? '✓ READY FOR ANALYSIS' : '✗ INVALID FILE'}</span></div>
  `;

  document.getElementById('previewSection').style.display = 'block';

  if (!typeOk) { showError(`❌ Unsupported file type: <strong>${file.type}</strong>. Please upload JPG, PNG, WEBP, BMP, or GIF.`); document.getElementById('analyzeWrap').style.display = 'none'; return; }
  if (!sizeOk) { showError(`❌ File too large (${sizeMB} MB). Maximum is ${MAX_MB} MB.`); document.getElementById('analyzeWrap').style.display = 'none'; return; }

  document.getElementById('analyzeWrap').style.display = 'block';
}

// ─── RUN ANALYSIS ────────────────────────────────────────────────────────────
async function runAnalysis() {
  if (!selectedFile) return;

  document.getElementById('analyzeWrap').style.display = 'none';
  document.getElementById('previewSection').style.display = 'none';
  hideError(); hideReport();

  const loading = document.getElementById('loadingSection');
  loading.style.display = 'block';

  // Animate steps
  const stepsEl = document.getElementById('loadingSteps');
  stepsEl.innerHTML = STEPS.map((s, i) =>
    `<div class="step-item" id="step_${i}"><div class="step-dot"></div>${s}</div>`
  ).join('');

  let idx = 0;
  const timer = setInterval(() => {
    if (idx > 0) { const p = document.getElementById(`step_${idx-1}`); if (p) { p.classList.remove('active'); p.classList.add('done'); } }
    const c = document.getElementById(`step_${idx}`);
    if (c) c.classList.add('active');
    document.getElementById('loadingText').textContent = (STEPS[idx] || 'Generating report').toUpperCase() + '...';
    idx++;
    if (idx >= STEPS.length) clearInterval(timer);
  }, 700);

  try {
    const formData = new FormData();
    formData.append('file', selectedFile);

    const res = await fetch('/analyze', { method: 'POST', body: formData });

    clearInterval(timer);
    STEPS.forEach((_, i) => {
      const el = document.getElementById(`step_${i}`);
      if (el) { el.classList.remove('active'); el.classList.add('done'); }
    });
    document.getElementById('loadingText').textContent = 'REPORT GENERATED';
    await delay(500);
    loading.style.display = 'none';

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const report = await res.json();
    renderReport(report);

  } catch (err) {
    clearInterval(timer);
    loading.style.display = 'none';
    document.getElementById('analyzeWrap').style.display = 'block';
    document.getElementById('previewSection').style.display = 'block';
    showError(`⚠️ Analysis failed: ${err.message}`);
  }
}

// ─── RENDER REPORT ───────────────────────────────────────────────────────────
function renderReport(r) {
  const score = Math.max(0, Math.min(100, r.risk_score || 0));
  const riskLevel = score < 30 ? 'low' : score < 65 ? 'medium' : 'high';
  const scoreColor = score < 30 ? 'var(--safe)' : score < 65 ? 'var(--warn)' : 'var(--danger)';
  const icons = ['🔍','⚠️','🔎','📋','🧪','🔬','📌','🚨'];

  const checksHTML = (r.checks || []).map(c => `
    <div class="check-card">
      <div class="check-top">
        <span class="check-name">${c.name}</span>
        <span class="check-status ${c.status}">${c.status}</span>
      </div>
      <div class="check-detail">${c.detail || '—'}</div>
    </div>`).join('');

  const findingsHTML = (r.key_findings || []).map((f, i) => `
    <div class="finding-item">
      <span class="finding-icon">${icons[i % icons.length]}</span>
      <div class="finding-text">${f}</div>
    </div>`).join('');

  const section = document.getElementById('reportSection');
  section.innerHTML = `
    <div class="report-header">
      <div>
        <div class="report-title">Forensic Analysis Report</div>
        <div class="report-id">
          ${r.report_id} &nbsp;·&nbsp; ${new Date(r.timestamp).toLocaleString()}
          &nbsp;·&nbsp; ${r.document_type || 'Unknown'} — ${r.issuing_country || 'Unknown'}
        </div>
      </div>
      <div class="risk-badge ${r.verdict || 'UNCERTAIN'}">${(r.verdict || 'UNCERTAIN').replace('_',' ')}</div>
    </div>
    <div class="report-body">
      <div class="score-section">
        <div class="score-label">Forgery Risk Score</div>
        <div class="score-value" style="color:${scoreColor}">${score}<span style="font-size:18px;color:var(--muted)">/100</span></div>
        <div class="score-bar-track">
          <div class="score-bar-fill" id="scoreBar" style="background:linear-gradient(90deg,var(--safe),${scoreColor})"></div>
        </div>
        <div class="score-numbers"><span>0 — GENUINE</span><span>50 — SUSPICIOUS</span><span>100 — FORGED</span></div>
      </div>
      <div class="checks-section">
        <div class="section-title">Forensic Checks</div>
        <div class="checks-grid">${checksHTML}</div>
      </div>
      ${findingsHTML ? `<div class="findings-section"><div class="section-title">Key Findings</div>${findingsHTML}</div>` : ''}
      <div class="summary-section">
        <div class="section-title">Analysis Summary</div>
        <div class="summary-text">${r.summary || '—'}</div>
      </div>
      <div class="rec-section">
        <div class="section-title">Recommendation</div>
        <div class="rec-box ${riskLevel}">
          ${riskLevel === 'low' ? '✅' : riskLevel === 'medium' ? '⚠️' : '🚨'} ${r.recommendation || '—'}
        </div>
      </div>
    </div>
    <div class="report-footer">
      <span>DocuGuard AI v1.0.0 · Powered by Claude Vision · FastAPI</span>
      <span>${r.report_id} · ${r.filename} · ${r.file_size_mb} MB</span>
    </div>
  `;

  section.style.display = 'block';
  setTimeout(() => { document.getElementById('scoreBar').style.width = score + '%'; }, 100);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'reset-btn';
  resetBtn.textContent = '↺  Analyze Another Document';
  resetBtn.onclick = resetAll;
  section.appendChild(resetBtn);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function showError(msg) { const el = document.getElementById('errorBox'); el.innerHTML = msg; el.style.display = 'block'; }
function hideError() { document.getElementById('errorBox').style.display = 'none'; }
function hideReport() { document.getElementById('reportSection').style.display = 'none'; }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function resetAll() {
  selectedFile = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('previewSection').style.display = 'none';
  document.getElementById('analyzeWrap').style.display = 'none';
  document.getElementById('loadingSection').style.display = 'none';
  hideReport(); hideError();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}