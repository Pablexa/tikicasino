/* ─── Slider fill ───────────────────────────────────────── */
document.querySelectorAll('.setting-slider').forEach(slider => {
  const update = () => {
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.setProperty('--pct', pct + '%');
    const valEl = slider.closest('.setting-right')?.querySelector('.setting-value');
    if (valEl) valEl.textContent = slider.value;
  };
  update();
  slider.addEventListener('input', update);
});

/* ─── Copy button ───────────────────────────────────────── */
document.querySelectorAll('.code-copy').forEach(btn => {
  btn.addEventListener('click', () => {
    const pre = btn.closest('.code-block')?.querySelector('pre');
    if (!pre) return;
    navigator.clipboard.writeText(pre.innerText).then(() => {
      const original = btn.innerHTML;
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied`;
      btn.classList.add('copied');
      setTimeout(() => { btn.innerHTML = original; btn.classList.remove('copied'); }, 1800);
    });
  });
});

/* ─── Download JSON ─────────────────────────────────────── */
document.getElementById('btn-download')?.addEventListener('click', () => {
  const blob = new Blob([buildConfig()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'green-preset.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ─── Build config JSON from current slider/toggle state ── */
function buildConfig() {
  const get = id => document.getElementById(id);
  return JSON.stringify({
    preset: "green",
    version: "1.0.0",
    sensitivity: {
      x: parseFloat(get('s-x')?.value ?? 0.42),
      y: parseFloat(get('s-y')?.value ?? 0.42),
      scope_x: parseFloat(get('s-sx')?.value ?? 0.28),
      scope_y: parseFloat(get('s-sy')?.value ?? 0.28),
    },
    aim: {
      smoothing:   parseFloat(get('s-smooth')?.value ?? 6),
      fov_radius:  parseFloat(get('s-fov')?.value ?? 120),
      head_offset: parseFloat(get('s-head')?.value ?? 0.18),
      target_bone: "head",
    },
    recoil: {
      compensation_x: parseFloat(get('s-rx')?.value ?? 0.0),
      compensation_y: parseFloat(get('s-ry')?.value ?? 0.62),
    },
    toggles: {
      aim_assist:    get('t-aim')?.checked    ?? true,
      recoil_ctrl:   get('t-recoil')?.checked ?? true,
      esp_visible:   get('t-esp')?.checked    ?? false,
      anti_aim:      get('t-anti')?.checked   ?? false,
    }
  }, null, 2);
}

/* ─── Live update code block on slider/toggle change ─────── */
function refreshCodeBlock() {
  const pre = document.getElementById('live-config');
  if (!pre) return;
  const cfg = JSON.parse(buildConfig());
  pre.innerHTML = renderJSON(cfg);
}

function renderJSON(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  const pad1 = '  '.repeat(indent + 1);
  if (typeof obj !== 'object' || obj === null) return fmtVal(obj);
  const entries = Object.entries(obj);
  const lines = entries.map(([k, v]) => {
    const key = `<span class="key">"${k}"</span>: `;
    if (typeof v === 'object' && v !== null) {
      return `${pad1}${key}${renderJSON(v, indent + 1)}`;
    }
    return `${pad1}${key}${fmtVal(v)}`;
  });
  return `{\n${lines.join(',\n')}\n${pad}}`;
}

function fmtVal(v) {
  if (typeof v === 'boolean')  return `<span class="bool">${v}</span>`;
  if (typeof v === 'number')   return `<span class="val">${v}</span>`;
  if (typeof v === 'string')   return `<span class="str">"${v}"</span>`;
  return String(v);
}

document.querySelectorAll('.setting-slider, .setting-toggle input').forEach(el => {
  el.addEventListener('input', refreshCodeBlock);
});
document.addEventListener('DOMContentLoaded', refreshCodeBlock);
