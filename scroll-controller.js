// ─── Shared Auto-Scroll Controller ───────────────────────────────────────────
// Used by: aditya_hridayam, hanuman_chalisa, lakshmi_sahasranamam,
//          lalitha_sahasranamam, vishnu_sahasranamam
//
// Speed steps: 1.0–1.6 in 0.10 increments (7 values)
//              1.65 (1 value)
//              1.7–3.0 in 0.10 increments (14 values)
//              3.25–5.0 in 0.25 increments (8 values)  →  30 total
// Default: index 6 = 1.6×
// Slider : min="1" max="30" (1-based)
// ─────────────────────────────────────────────────────────────────────────────

const SPEED_STEPS = [
  1.00,1.10,1.20,1.30,1.40,1.50,1.60,1.65,1.70,1.80,1.90,
  2.00,2.10,2.20,2.30,2.40,2.50,2.60,2.70,2.80,2.90,
  3.00,
  3.25,3.50,3.75,4.00,4.25,4.50,4.75,5.00
];

let speedIdx   = 6;          // 1.6× default
let scrollActive = false;
let scrollRAF    = null;
let lastTime     = null;

function currentSpeed()          { return SPEED_STEPS[speedIdx]; }
function speedToPxPerSec(s)      { return s * 18; }

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
  const newIdx = Math.max(0, Math.min(SPEED_STEPS.length - 1, speedIdx + dir));
  if (SPEED_STEPS[newIdx] < 1.00) return;  // never go below 1×
  speedIdx = newIdx;
  syncSpeedUI();
}

function syncSpeedUI() {
  document.getElementById('speedVal').textContent = currentSpeed() + '×';
  document.getElementById('speedSlider').value = speedIdx + 1;
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
  const a = aud(); if (!a) return;
  a.addEventListener('timeupdate', () => {
    const seek = document.getElementById('audioSeek');
    const time = document.getElementById('audioTime');
    if (seek) seek.value = a.currentTime;
    if (time) time.textContent = fmtTime(a.currentTime) + ' / ' + fmtTime(a.duration || 0);
  });
  a.addEventListener('loadedmetadata', () => {
    const seek = document.getElementById('audioSeek');
    if (seek) seek.max = a.duration;
    const time = document.getElementById('audioTime');
    if (time) time.textContent = '0:00 / ' + fmtTime(a.duration);
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
    if (isNaN(v) || v < 0.5) v = 0.5;
    if (v > 10) v = 10;
    let closest = 0;
    SPEED_STEPS.forEach((s, i) => { if (Math.abs(s - v) < Math.abs(SPEED_STEPS[closest] - v)) closest = i; });
    if (Math.abs(SPEED_STEPS[closest] - v) < 0.01) {
      speedIdx = closest;
    } else {
      SPEED_STEPS.splice(closest + (v > SPEED_STEPS[closest] ? 1 : 0), 0, Math.round(v * 100) / 100);
      speedIdx = SPEED_STEPS.indexOf(Math.round(v * 100) / 100);
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
  // Fix mobile: touchend on both play buttons so taps fire reliably during RAF loop
  const scrollBtn = document.getElementById('scrollPlayBtn');
  if (scrollBtn) {
    scrollBtn.addEventListener('touchend', e => {
      e.preventDefault(); e.stopPropagation(); toggleScroll();
    }, { passive: false });
  }
  const audioBtn = document.getElementById('audioPlayBtn');
  if (audioBtn) {
    audioBtn.addEventListener('touchend', e => {
      e.preventDefault(); e.stopPropagation(); toggleAudio();
    }, { passive: false });
  }
});
