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
  document.getElementById('scrollPlayBtn').textContent = '▶';
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
  speedIdx = Math.max(0, Math.min(SPEED_STEPS.length - 1, speedIdx + dir));
  syncSpeedUI();
}

function syncSpeedUI() {
  document.getElementById('speedVal').textContent = currentSpeed() + '×';
  document.getElementById('speedSlider').value = speedIdx + 1;
}

function updateSpeed(v) { updateSpeedFromSlider(v); }

// ── Show / hide scroll bar ────────────────────────────────────────────────────
function hideScrollBar() {
  document.getElementById('scrollBar').classList.add('hidden');
  document.getElementById('scrollOpenBtn').classList.remove('hidden');
}

function showScrollBar() {
  document.getElementById('scrollBar').classList.remove('hidden');
  document.getElementById('scrollOpenBtn').classList.add('hidden');
}

// ── Custom speed input ────────────────────────────────────────────────────────
function editSpeed(el) {
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.className = 'scroll-speed-input';
  inp.min = '0.5'; inp.max = '10'; inp.step = '0.05';
  inp.value = currentSpeed();
  el.replaceWith(inp);
  inp.focus(); inp.select();

  function commit() {
    let v = parseFloat(inp.value);
    if (isNaN(v) || v < 0.5) v = 0.5;
    if (v > 10) v = 10;
    // find nearest step or insert custom
    let closest = 0;
    SPEED_STEPS.forEach((s, i) => { if (Math.abs(s - v) < Math.abs(SPEED_STEPS[closest] - v)) closest = i; });
    if (Math.abs(SPEED_STEPS[closest] - v) < 0.01) {
      speedIdx = closest;
    } else {
      // inject custom value temporarily
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
  inp.addEventListener('blur', commit);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') { inp.value = currentSpeed(); inp.blur(); } });
}

// ── Init display on load ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => syncSpeedUI());
