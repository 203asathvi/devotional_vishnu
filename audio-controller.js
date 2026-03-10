// ─── Audio Controller ─────────────────────────────────────────────────────────
// Defines audioStop(), editAudioSpeed() as globals.
// Wires seek slider. Load BEFORE scroll-controller.js.
// ─────────────────────────────────────────────────────────────────────────────

var __audioLog = [];
window.__audioLog = __audioLog;

function _alog(level, msg, data) {
  var entry = { t: new Date().toISOString().substr(11,8), lvl: level, msg: msg, data: data || null };
  __audioLog.push(entry);
  if (__audioLog.length > 200) __audioLog.shift();
  if (level === 'ERROR') console.error('[Audio]', msg, data || '');
  else console.log('[Audio]', msg, data || '');
}

window.downloadAudioLog = function() {
  var blob = new Blob([JSON.stringify(__audioLog, null, 2)], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'audio-log-' + Date.now() + '.json';
  a.click();
};

// ── Kept as no-ops so wireAudioBtn in scroll-controller doesn't throw ─────────
function audioSkip(sec) { /* replaced by slider */ }

function audioStop() {
  var a = document.getElementById('pageAudio');
  if (!a) return;
  a.pause(); a.currentTime = 0;
  var btn = document.getElementById('audioPlayBtn');
  if (btn) { btn.textContent = '▶'; btn.disabled = false; }
  var seek = document.getElementById('audioSeek');
  if (seek) seek.value = 0;
  var cur = document.getElementById('audioTimeCur');
  if (cur) cur.textContent = '0:00';
}

// ── Speed editor — click the speed badge to change playback rate ──────────────
function editAudioSpeed(el) {
  var spanId = 'audioSpeedVal';
  var span = document.getElementById(spanId);
  if (!span || document.getElementById(spanId + '_inp')) return;
  var a = document.getElementById('pageAudio');

  var inp = document.createElement('input');
  inp.type = 'number'; inp.id = spanId + '_inp';
  inp.className = 'scroll-speed-input';
  inp.min = '0.5'; inp.max = '4'; inp.step = '0.05';
  inp.value = a ? a.playbackRate : 1;
  inp.style.cssText = 'width:52px;font-size:12px;text-align:center;';
  span.replaceWith(inp);
  inp.focus(); inp.select();

  var committed = false;
  function commit() {
    if (committed) return; committed = true;
    var v = parseFloat(inp.value);
    if (isNaN(v) || v < 0.5) v = 0.5;
    if (v > 4) v = 4;
    v = Math.round(v * 100) / 100;
    if (a) a.playbackRate = v;
    var newSpan = document.createElement('span');
    newSpan.id = spanId; newSpan.className = span.className;
    newSpan.textContent = v + '×';
    inp.replaceWith(newSpan);
    _alog('INFO', 'speed set', {rate: v});
  }
  setTimeout(function() { inp.addEventListener('blur', commit); }, 300);
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter')  { commit(); }
    if (e.key === 'Escape') { committed = true; inp.replaceWith(span); }
  });
}

// ── Seek slider + time display ────────────────────────────────────────────────
function _fmt(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
}

window.addEventListener('DOMContentLoaded', function() {
  var a    = document.getElementById('pageAudio');
  var seek = document.getElementById('audioSeek');
  var cur  = document.getElementById('audioTimeCur');
  var dur  = document.getElementById('audioTimeDur');

  _alog('INFO', 'init', {audio: !!a, seek: !!seek, src: a ? a.src : null});
  if (!a) return;

  // Log key events for debug
  ['loadedmetadata','play','playing','pause','ended','error','stalled','waiting'].forEach(function(ev) {
    a.addEventListener(ev, function() {
      var info = {readyState: a.readyState, duration: a.duration, currentTime: a.currentTime};
      if (ev === 'error' && a.error) {
        var codes = {1:'ABORTED',2:'NETWORK',3:'DECODE',4:'SRC_NOT_SUPPORTED'};
        info.errorType = codes[a.error.code] || 'UNKNOWN';
      }
      _alog(ev === 'error' ? 'ERROR' : 'INFO', 'audio:' + ev, info);
    });
  });

  // Once metadata loads — set slider range and duration display
  a.addEventListener('loadedmetadata', function() {
    if (seek) { seek.max = a.duration; seek.value = 0; }
    if (dur)  dur.textContent = _fmt(a.duration);
    if (cur)  cur.textContent = '0:00';
  });

  // While playing — update slider thumb and current time
  a.addEventListener('timeupdate', function() {
    if (seek && !seek._dragging) seek.value = a.currentTime;
    if (cur  && !seek._dragging) cur.textContent = _fmt(a.currentTime);
  });

  if (!seek) return;

  // Drag start — freeze updates while user is scrubbing
  seek._dragging = false;
  seek.addEventListener('mousedown',  function() { seek._dragging = true; });
  seek.addEventListener('touchstart', function() { seek._dragging = true; }, {passive: true});

  // While dragging — show time preview
  seek.addEventListener('input', function() {
    if (cur) cur.textContent = _fmt(+seek.value);
  });

  // Commit seek — on mouse/touch release
  function commitSeek() {
    seek._dragging = false;
    a.currentTime = +seek.value;
    _alog('INFO', 'seek committed', {to: seek.value, duration: a.duration});
  }
  seek.addEventListener('change',   commitSeek);
  seek.addEventListener('mouseup',  commitSeek);
  seek.addEventListener('touchend', commitSeek, {passive: true});
});
