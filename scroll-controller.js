// ─── Shared Auto-Scroll Controller ───────────────────────────────────────────
// Used by: aditya_hridayam, hanuman_chalisa, lakshmi_sahasranamam,
//          lalitha_sahasranamam, vishnu_sahasranamam
//
// Speed steps: 1.00–3.00 in 0.01 increments (201 values)
//              3.25–5.00 in 0.25 increments (8 values)  →  209 total
// Default: index 65 = 1.65×
// Slider : min="1" max="209" (1-based)
// ─────────────────────────────────────────────────────────────────────────────

const SPEED_STEPS = [
  1.0,1.01,1.02,1.03,1.04,1.05,1.06,1.07,1.08,1.09,
  1.1,1.11,1.12,1.13,1.14,1.15,1.16,1.17,1.18,1.19,
  1.2,1.21,1.22,1.23,1.24,1.25,1.26,1.27,1.28,1.29,
  1.3,1.31,1.32,1.33,1.34,1.35,1.36,1.37,1.38,1.39,
  1.4,1.41,1.42,1.43,1.44,1.45,1.46,1.47,1.48,1.49,
  1.5,1.51,1.52,1.53,1.54,1.55,1.56,1.57,1.58,1.59,
  1.6,1.61,1.62,1.63,1.64,1.65,1.66,1.67,1.68,1.69,
  1.7,1.71,1.72,1.73,1.74,1.75,1.76,1.77,1.78,1.79,
  1.8,1.81,1.82,1.83,1.84,1.85,1.86,1.87,1.88,1.89,
  1.9,1.91,1.92,1.93,1.94,1.95,1.96,1.97,1.98,1.99,
  2.0,2.01,2.02,2.03,2.04,2.05,2.06,2.07,2.08,2.09,
  2.1,2.11,2.12,2.13,2.14,2.15,2.16,2.17,2.18,2.19,
  2.2,2.21,2.22,2.23,2.24,2.25,2.26,2.27,2.28,2.29,
  2.3,2.31,2.32,2.33,2.34,2.35,2.36,2.37,2.38,2.39,
  2.4,2.41,2.42,2.43,2.44,2.45,2.46,2.47,2.48,2.49,
  2.5,2.51,2.52,2.53,2.54,2.55,2.56,2.57,2.58,2.59,
  2.6,2.61,2.62,2.63,2.64,2.65,2.66,2.67,2.68,2.69,
  2.7,2.71,2.72,2.73,2.74,2.75,2.76,2.77,2.78,2.79,
  2.8,2.81,2.82,2.83,2.84,2.85,2.86,2.87,2.88,2.89,
  2.9,2.91,2.92,2.93,2.94,2.95,2.96,2.97,2.98,2.99,
  3.0,3.25,3.5,3.75,4.0,4.25,4.5,4.75,5.0
];

let speedIdx    = 65;          // 1.65× default (index into SPEED_STEPS)
let customSpeed = null;       // non-null when user typed a value not in SPEED_STEPS
let scrollActive = false;
let scrollRAF    = null;
let lastTime     = null;

function currentSpeed() { return customSpeed !== null ? customSpeed : SPEED_STEPS[speedIdx]; }
function speedToPxPerSec(s) { return s * 18; }

// ── Scroll loop ───────────────────────────────────────────────────────────────
function scrollStep(ts) {
  if (!scrollActive) return;
  if (lastTime === null) lastTime = ts;
  const dt = Math.min(ts - lastTime, 100);
  lastTime = ts;
  window.scrollBy(0, (speedToPxPerSec(currentSpeed()) * dt) / 1000);
  const s = window.scrollY, tot = document.body.scrollHeight - window.innerHeight;
  if (s >= tot - 4) stopScroll();
  scrollRAF = requestAnimationFrame(scrollStep);
}

// ── Wake Lock: prevent screen sleep during auto-scroll ────────────────────────
let wakeLock = null;

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) { /* permission denied or not supported */ }
}

function releaseWakeLock() {
  if (wakeLock) { wakeLock.release(); wakeLock = null; }
}

// Re-acquire if page becomes visible again (e.g. tab switch)
document.addEventListener('visibilitychange', () => {
  if (scrollActive && document.visibilityState === 'visible') acquireWakeLock();
});

// ── Play / pause ──────────────────────────────────────────────────────────────
function startScroll() {
  if (scrollActive) return;
  scrollActive = true;
  lastTime = null;
  document.getElementById('scrollPlayBtn').textContent = '⏸';
  document.getElementById('scrollPlayBtn').title = 'Pause';
  acquireWakeLock();
  scrollRAF = requestAnimationFrame(scrollStep);
}

function stopScroll() {
  scrollActive = false;
  lastTime = null;
  if (scrollRAF) { cancelAnimationFrame(scrollRAF); scrollRAF = null; }
  document.getElementById('scrollPlayBtn').textContent = '⇓';
  document.getElementById('scrollPlayBtn').title = 'Play';
  releaseWakeLock();
}

function toggleScroll() { if (scrollActive) stopScroll(); else startScroll(); }

// ── Speed controls ────────────────────────────────────────────────────────────
function updateSpeedFromSlider(v) {
  speedIdx = parseInt(v) - 1;
  syncSpeedUI();
}

function adjustSpeed(dir) {
  // If on a custom speed, snap to nearest step in that direction first
  if (customSpeed !== null) {
    let nearest = 0;
    SPEED_STEPS.forEach((s, i) => {
      if (Math.abs(s - customSpeed) < Math.abs(SPEED_STEPS[nearest] - customSpeed)) nearest = i;
    });
    // step past the nearest in the requested direction
    const candidate = nearest + dir;
    const newIdx = Math.max(0, Math.min(SPEED_STEPS.length - 1, candidate));
    if (SPEED_STEPS[newIdx] < 1.00) return;
    customSpeed = null;
    speedIdx = newIdx;
  } else {
    const newIdx = Math.max(0, Math.min(SPEED_STEPS.length - 1, speedIdx + dir));
    if (SPEED_STEPS[newIdx] < 1.00) return;
    speedIdx = newIdx;
  }
  syncSpeedUI();
}

function syncSpeedUI() {
  const s = currentSpeed();
  document.getElementById('speedVal').textContent = s + '×';
  // Slider shows nearest step position (custom values sit between notches)
  const _sls=document.getElementById('speedSlider'); if(_sls) _sls.value=speedIdx+1;
}

function updateSpeed(v) { updateSpeedFromSlider(v); }

// ── Show / hide pills ─────────────────────────────────────────────────────────
function hideAudioPill() {
  document.getElementById('audioPill').classList.add('hidden');
  document.getElementById('audioTab').classList.remove('hidden');
}
function showAudioPill() {
  document.getElementById('audioPill').classList.remove('hidden');
  document.getElementById('audioTab').classList.add('hidden');
}
function hideScrollPill() {
  document.getElementById('scrollPill').classList.add('hidden');
  document.getElementById('scrollTab').classList.remove('hidden');
}
function showScrollPill() {
  document.getElementById('scrollPill').classList.remove('hidden');
  document.getElementById('scrollTab').classList.add('hidden');
}
// Legacy aliases
function hideScrollBar() { hideScrollPill(); }
function showScrollBar() { showScrollPill(); }

// ── Audio player ─────────────────────────────────────────────────────────────

function aud() { return document.getElementById('pageAudio'); }

function toggleAudio() {
  const a = aud(); if (!a || a.disabled) return;
  if (a.paused) {
    a.play().then(() => {
      document.getElementById('audioPlayBtn').textContent = '⏸';
    }).catch(() => {});
  } else {
    a.pause();
    document.getElementById('audioPlayBtn').textContent = '▶';
  }
}

function seekAudio(v) { const a = aud(); if (a) a.currentTime = v; }

function editAudioSpeed(el) {
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.className = 'scroll-speed-input';
  inp.min = '0.5'; inp.max = '10'; inp.step = '0.05';
  inp.value = aud() ? aud().playbackRate : 1;
  el.replaceWith(inp);
  inp.focus(); inp.select();

  let committed = false;
  function commit() {
    if (committed) return; committed = true;
    let v = parseFloat(inp.value);
    if (isNaN(v) || v < 0.5) v = 0.5;
    if (v > 10) v = 10;
    v = Math.round(v * 100) / 100;
    if (aud()) aud().playbackRate = v;
    const span = document.createElement('span');
    span.className = 'audio-speed-val'; span.id = 'audioSpeedVal';
    span.title = 'Click to set audio speed';
    span.onclick = function() { editAudioSpeed(this); };
    span.textContent = v + '×';
    inp.replaceWith(span);
  }
  // Delay blur listener so mobile keyboard open doesn't immediately dismiss
  setTimeout(() => inp.addEventListener('blur', commit), 300);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { commit(); }
    if (e.key === 'Escape') { committed = true; inp.replaceWith(el); }
  });
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  return m + ':' + String(Math.floor(s % 60)).padStart(2, '0');
}

window.addEventListener('DOMContentLoaded', () => {
  const a    = aud();
  const seek = document.getElementById('audioSeek');
  const time = document.getElementById('audioTime');

  // Wire seek slider — must happen regardless of whether audio loaded
  if (seek) {
    seek.addEventListener('mousedown',  () => { seek._drag = true; });
    seek.addEventListener('touchstart', () => { seek._drag = true; }, { passive: true });
    seek.addEventListener('input', () => {
      // show position while dragging
      if (time && a) time.textContent = fmtTime(+seek.value) + ' / ' + fmtTime(a.duration || 0);
    });
    seek.addEventListener('change', () => {
      seek._drag = false;
      if (a) a.currentTime = +seek.value;
    });
    seek.addEventListener('mouseup', () => {
      seek._drag = false;
      if (a) a.currentTime = +seek.value;
    });
    seek.addEventListener('touchend', () => {
      seek._drag = false;
      if (a) a.currentTime = +seek.value;
    }, { passive: true });
  }

  if (!a) return;

  a.addEventListener('loadedmetadata', () => {
    if (seek) { seek.max = String(a.duration); seek.value = '0'; }
    if (time) time.textContent = '0:00 / ' + fmtTime(a.duration);
  });

  a.addEventListener('timeupdate', () => {
    if (seek && !seek._drag) seek.value = String(a.currentTime);
    if (time && !(seek && seek._drag))
      time.textContent = fmtTime(a.currentTime) + ' / ' + fmtTime(a.duration || 0);
  });

  a.addEventListener('ended', () => {
    const btn = document.getElementById('audioPlayBtn');
    if (btn) btn.textContent = '▶';
  });
});

// ── Custom speed input ────────────────────────────────────────────────────────
function editSpeed(el) {
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.className = 'scroll-speed-input';
  inp.min = '0.5'; inp.max = '10'; inp.step = '0.05';
  inp.value = currentSpeed();
  el.replaceWith(inp);
  inp.focus(); inp.select();

  let committed = false;
  function commit() {
    if (committed) return; committed = true;
    let v = parseFloat(inp.value);
    if (isNaN(v) || v < 1.00) v = 1.00;
    if (v > 10) v = 10;
    v = Math.round(v * 100) / 100;
    // Find nearest step in the ORIGINAL unmodified array
    let closest = 0;
    SPEED_STEPS.forEach((s, i) => { if (Math.abs(s - v) < Math.abs(SPEED_STEPS[closest] - v)) closest = i; });
    if (Math.abs(SPEED_STEPS[closest] - v) < 0.005) {
      customSpeed = null;   // exact match — use the step
      speedIdx = closest;
    } else {
      customSpeed = v;      // store as custom, never mutate SPEED_STEPS
      speedIdx = closest;   // slider thumb sits at nearest step
    }
    const span = document.createElement('span');
    span.className = 'scroll-speed-val'; span.id = 'speedVal';
    span.title = 'Click to enter custom speed';
    span.onclick = function(){ editSpeed(this); };
    inp.replaceWith(span);
    syncSpeedUI();
  }
  // Delay blur listener so mobile keyboard open doesn't immediately dismiss
  setTimeout(() => inp.addEventListener('blur', commit), 300);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { commit(); }
    if (e.key === 'Escape') { committed = true; inp.replaceWith(el); syncSpeedUI(); }
  });
}

// ── Init display on load ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  syncSpeedUI();

  // ── Scroll play button ────────────────────────────────────────────────────
  // touchend fires toggleScroll; a flag blocks the ghost click that follows on mobile
  const scrollBtn = document.getElementById('scrollPlayBtn');
  if (scrollBtn) {
    let scrollBtnTouched = false;
    scrollBtn.addEventListener('touchend', e => {
      e.preventDefault(); e.stopPropagation();
      scrollBtnTouched = true;
      toggleScroll();
      setTimeout(() => { scrollBtnTouched = false; }, 400);
    }, { passive: false });
    scrollBtn.addEventListener('click', e => {
      if (scrollBtnTouched) { e.preventDefault(); e.stopPropagation(); return; }
      toggleScroll();
    });
  }

  // ── Speed buttons ─────────────────────────────────────────────────────────
  // Same touch-flag pattern prevents double-fire on mobile
  function wireSpeedBtn(id, dir) {
    var btn = document.getElementById(id);
    if (!btn) return;
    let touched = false;
    btn.addEventListener('touchend', function(e) {
      e.preventDefault(); e.stopPropagation();
      touched = true;
      adjustSpeed(dir);
      setTimeout(() => { touched = false; }, 400);
    }, { passive: false });
    btn.addEventListener('click', function(e) {
      if (touched) { e.preventDefault(); e.stopPropagation(); return; }
      adjustSpeed(dir);
    });
  }
  wireSpeedBtn('speedDown', -1);
  wireSpeedBtn('speedUp',    1);

  // ── Audio play button ─────────────────────────────────────────────────────
  const audioBtn = document.getElementById('audioPlayBtn');
  if (audioBtn) {
    audioBtn.addEventListener('touchend', e => {
      e.preventDefault(); e.stopPropagation(); toggleAudio();
    }, { passive: false });
  }
});
