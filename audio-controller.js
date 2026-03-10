// ─── Audio Controller ─────────────────────────────────────────────────────────
// Defines: toggleAudio, audioSkip, audioStop, seekAudio, editAudioSpeed,
//          hideAudioPill, showAudioPill, fmtTime
//
// Button event wiring is handled by scroll-controller.js (wireAudioBtn).
// Load this BEFORE scroll-controller.js.
// ─────────────────────────────────────────────────────────────────────────────

function aud() { return document.getElementById('pageAudio'); }

function fmtTime(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return m + ':' + String(Math.floor(s % 60)).padStart(2, '0');
}

// ── Play / Pause ──────────────────────────────────────────────────────────────
function toggleAudio() {
  const a = aud();
  const btn = document.getElementById('audioPlayBtn');
  if (!a || !btn) return;
  if (!a.paused) {
    a.pause();
    btn.textContent = '▶';
    return;
  }
  btn.textContent = '…';
  btn.disabled = true;
  if (a.readyState < 2) a.load();
  a.play()
    .then(() => { btn.textContent = '⏸'; btn.disabled = false; })
    .catch(() => {
      btn.textContent = '✕';
      btn.disabled = false;
      btn.title = 'Audio unavailable';
      setTimeout(() => { btn.textContent = '▶'; btn.title = 'Play / Pause'; }, 2500);
    });
}

// ── Skip / Stop ───────────────────────────────────────────────────────────────
function audioSkip(sec) {
  const a = aud();
  if (!a) return;
  a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + sec));
}

function audioStop() {
  const a = aud();
  if (!a) return;
  a.pause();
  a.currentTime = 0;
  const btn = document.getElementById('audioPlayBtn');
  if (btn) { btn.textContent = '▶'; btn.disabled = false; }
  const seek = document.getElementById('audioSeek');
  if (seek) seek.value = 0;
  const time = document.getElementById('audioTime');
  if (time) time.textContent = '0:00 / ' + fmtTime(a.duration || 0);
}

// ── Seek ──────────────────────────────────────────────────────────────────────
function seekAudio(v) {
  const a = aud();
  if (a) a.currentTime = parseFloat(v);
}

// ── Speed editor ──────────────────────────────────────────────────────────────
function editAudioSpeed(el) {
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.className = 'scroll-speed-input';
  inp.min = '0.5'; inp.max = '4'; inp.step = '0.05';
  inp.value = aud() ? aud().playbackRate : 1;
  el.replaceWith(inp);
  inp.focus(); inp.select();

  let committed = false;
  function commit() {
    if (committed) return;
    committed = true;
    let v = parseFloat(inp.value);
    if (isNaN(v) || v < 0.5) v = 0.5;
    if (v > 4) v = 4;
    v = Math.round(v * 100) / 100;
    if (aud()) aud().playbackRate = v;
    const span = document.createElement('span');
    span.className = 'audio-speed-val';
    span.id = 'audioSpeedVal';
    span.title = 'Click to set audio speed';
    span.onclick = function () { editAudioSpeed(this); };
    span.textContent = v + 'x';
    inp.replaceWith(span);
  }
  setTimeout(() => inp.addEventListener('blur', commit), 300);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') { committed = true; inp.replaceWith(el); }
  });
}

// ── Pill show / hide ──────────────────────────────────────────────────────────
function hideAudioPill() {
  document.getElementById('audioPill').classList.add('hidden');
  document.getElementById('audioTab').classList.remove('hidden');
}
function showAudioPill() {
  document.getElementById('audioPill').classList.remove('hidden');
  document.getElementById('audioTab').classList.add('hidden');
}

// ── Seek slider + state events wired on load ──────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const a = aud();
  if (!a) return;

  const btn  = document.getElementById('audioPlayBtn');
  const seek = document.getElementById('audioSeek');
  const time = document.getElementById('audioTime');

  // Button state events → icon sync
  a.addEventListener('waiting', () => { if (btn) btn.textContent = '…'; });
  a.addEventListener('playing', () => { if (btn) { btn.textContent = '⏸'; btn.disabled = false; } });
  a.addEventListener('pause',   () => { if (btn) btn.textContent = '▶'; });
  a.addEventListener('ended',   () => { if (btn) btn.textContent = '▶'; });
  a.addEventListener('error',   () => {
    if (!btn) return;
    btn.textContent = 'x'; btn.disabled = false;
    btn.title = 'Audio unavailable';
    setTimeout(() => { btn.textContent = '▶'; btn.title = 'Play / Pause'; }, 3000);
  });

  // Duration loaded → set seek max
  a.addEventListener('loadedmetadata', () => {
    if (seek) { seek.max = a.duration; seek.value = 0; }
    if (time) time.textContent = '0:00 / ' + fmtTime(a.duration);
  });

  // Playback progress → update seek thumb + time display
  a.addEventListener('timeupdate', () => {
    if (seek && !seek._dragging) seek.value = a.currentTime;
    if (time && !(seek && seek._dragging))
      time.textContent = fmtTime(a.currentTime) + ' / ' + fmtTime(a.duration || 0);
  });

  // Seek drag — pause live updates while dragging
  if (seek) {
    seek._dragging = false;
    seek.addEventListener('mousedown',  () => { seek._dragging = true; });
    seek.addEventListener('touchstart', () => { seek._dragging = true; }, { passive: true });
    seek.addEventListener('input', () => {
      if (time) time.textContent = fmtTime(parseFloat(seek.value)) + ' / ' + fmtTime(a.duration || 0);
    });
    const commitSeek = () => {
      seek._dragging = false;
      a.currentTime = parseFloat(seek.value);
    };
    seek.addEventListener('change',   commitSeek);
    seek.addEventListener('mouseup',  commitSeek);
    seek.addEventListener('touchend', commitSeek, { passive: true });
  }
});
