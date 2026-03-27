// ─── Shared Auto-Scroll Controller ───────────────────────────────────────────
// Used by: aditya_hridayam, hanuman_chalisa, lakshmi_sahasranamam,
//          lalitha_sahasranamam, vishnu_sahasranamam
//
// Speed steps: 20 evenly-spaced steps, 0.5× to 5.0× in 0.25 increments
// Each button press = +/- 0.25× = noticeable, consistent change
// Default: index 5 = 1.75×
// ─────────────────────────────────────────────────────────────────────────────

const SPEED_STEPS = [
  0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5,
  0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0,
  1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.5,
  1.55, 1.6, 1.65, 1.7, 1.75, 1.8, 1.85, 1.9, 1.95, 2.0,
  2.05, 2.1, 2.15, 2.2, 2.25, 2.3, 2.35, 2.4, 2.45, 2.5,
  2.55, 2.6, 2.65, 2.7, 2.75, 2.8, 2.85, 2.9, 2.95, 3.0
];

let speedIdx    = 32;           // 1.65× default (index into SPEED_STEPS)
let customSpeed = null;       // non-null when user typed a value not in SPEED_STEPS
let scrollActive = false;
let scrollRAF    = null;
let lastTime     = null;
let _scrollRemainder = 0;    // sub-pixel accumulator — eliminates rounding jumps

function currentSpeed() { return customSpeed !== null ? customSpeed : SPEED_STEPS[speedIdx]; }
function speedToPxPerSec(s) { return s * 18; }

// ── Scroll loop ───────────────────────────────────────────────────────────────
function scrollStep(ts) {
  if (!scrollActive) return;
  if (lastTime === null) lastTime = ts;
  const dt = Math.min(ts - lastTime, 100);
  lastTime = ts;
  const _raw = (speedToPxPerSec(currentSpeed()) * dt) / 1000 + _scrollRemainder;
  const _px  = Math.trunc(_raw);
  _scrollRemainder = _raw - _px;
  if (_px !== 0) window.scrollBy(0, _px);
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
  _scrollRemainder = 0;
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
  const _sls=document.getElementById('speedSlider'); if(_sls){_sls.min=1;_sls.max=SPEED_STEPS.length;_sls.value=speedIdx+1;}
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

function audioSkip(sec) {
  const a = aud(); if (!a) return;
  a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + sec));
}

function audioStop() {
  const a = aud(); if (!a) return;
  a.pause();
  a.currentTime = 0;
  const btn = document.getElementById('audioPlayBtn');
  if (btn) btn.textContent = '▶';
}

// Audio playback speed steps — same 0.05 increments as editAudioSpeed range
const AUDIO_SPEED_STEPS = [0.5,0.6,0.7,0.75,0.8,0.85,0.9,0.95,1.0,1.05,1.1,1.15,1.2,1.25,1.3,1.4,1.5,1.6,1.7,1.75,1.8,2.0,2.25,2.5,3.0];

function adjustAudioSpeed(dir) {
  const a = aud(); if (!a) return;
  const cur = Math.round(a.playbackRate * 100) / 100;
  let idx = AUDIO_SPEED_STEPS.findIndex(s => Math.abs(s - cur) < 0.01);
  if (idx === -1) {
    // snap to nearest
    idx = AUDIO_SPEED_STEPS.reduce((best, s, i) =>
      Math.abs(s - cur) < Math.abs(AUDIO_SPEED_STEPS[best] - cur) ? i : best, 0);
  }
  const next = Math.max(0, Math.min(AUDIO_SPEED_STEPS.length - 1, idx + dir));
  a.playbackRate = AUDIO_SPEED_STEPS[next];
  const el = document.getElementById('audioSpeedVal');
  if (el) el.textContent = AUDIO_SPEED_STEPS[next] + '×';
}

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

  // Helper: update the two time spans (cur / dur)
  function setTime(cur, dur) {
    const elCur = document.getElementById('audioTimeCur');
    const elDur = document.getElementById('audioTimeDur');
    // Also support legacy single #audioTime element
    const elTime = document.getElementById('audioTime');
    if (elCur) elCur.textContent = fmtTime(cur);
    if (elDur) elDur.textContent = fmtTime(dur || 0);
    if (elTime) elTime.textContent = fmtTime(cur) + ' / ' + fmtTime(dur || 0);
  }

  a.addEventListener('timeupdate', () => {
    const seek = document.getElementById('audioSeek');
    if (seek && !seek._dragging) seek.value = a.currentTime;
    if (!seek || !seek._dragging) setTime(a.currentTime, a.duration);
  });
  a.addEventListener('loadedmetadata', () => {
    const seek = document.getElementById('audioSeek');
    if (seek) { seek.max = a.duration; seek.value = 0; }
    setTime(0, a.duration);
  });
  // Seek drag wiring
  (() => {
    const seek = document.getElementById('audioSeek');
    if (!seek) return;
    seek._dragging = false;
    seek.addEventListener('mousedown',  () => { seek._dragging = true; });
    seek.addEventListener('touchstart', () => { seek._dragging = true; }, {passive:true});
    seek.addEventListener('input', () => {
      setTime(parseFloat(seek.value), a.duration);
    });
    const commit = () => { seek._dragging = false; a.currentTime = parseFloat(seek.value); };
    seek.addEventListener('change',   commit);
    seek.addEventListener('mouseup',  commit);
    seek.addEventListener('touchend', commit, {passive:true});
  })();
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
  // Wire all audio control buttons with touchend + click pattern
  function wireAudioBtn(id, fn) {
    const btn = document.getElementById(id);
    if (!btn) return;
    let touched = false;
    btn.addEventListener('touchend', e => {
      e.preventDefault(); e.stopPropagation();
      touched = true;
      fn();
      setTimeout(() => { touched = false; }, 400);
    }, { passive: false });
    btn.addEventListener('click', e => {
      if (touched) { e.preventDefault(); e.stopPropagation(); return; }
      fn();
    });
  }
  wireAudioBtn('audioPlayBtn',  toggleAudio);
  wireAudioBtn('audioRewBtn',   () => audioSkip(-30));
  wireAudioBtn('audioFwdBtn',   () => audioSkip(30));
  wireAudioBtn('audioStopBtn',  audioStop);
  wireAudioBtn('audioSpeedDown', () => adjustAudioSpeed(-1));
  wireAudioBtn('audioSpeedUp',   () => adjustAudioSpeed(1));
});
