// ─── Audio Controller ──────────────────────────────────────────────────────────
// Defines audioSkip() and audioStop() as globals — called by scroll-controller.js
// wireAudioBtn() and by onclick= attributes.
// Also wires seek slider progress and diagnostic logging.
// ──────────────────────────────────────────────────────────────────────────────

// ── Diagnostic log ────────────────────────────────────────────────────────────
var __audioLog = [];
window.__audioLog = __audioLog;

function _alog(level, msg, data) {
  var entry = { t: new Date().toISOString(), lvl: level, msg: msg, data: data || null };
  __audioLog.push(entry);
  if (__audioLog.length > 200) __audioLog.shift();
  if (level === 'ERROR' || level === 'WARN') {
    console.warn('[Audio]', msg, data || '');
    _showLogBtn();
  }
}

var _logBtnShown = false;
function _showLogBtn() {
  if (_logBtnShown) return; _logBtnShown = true;
  var b = document.createElement('button');
  b.textContent = '📋 Audio Log';
  b.style.cssText = 'position:fixed;top:12px;right:12px;z-index:9999;background:#c00;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;';
  b.onclick = function() { window.downloadAudioLog(); };
  document.body.appendChild(b);
}

window.downloadAudioLog = function() {
  var blob = new Blob([JSON.stringify(__audioLog, null, 2)], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'audio-log-' + Date.now() + '.json';
  a.click();
};

// ── Core functions (globals — used by onclick= and wireAudioBtn) ───────────────
function audioSkip(sec) {
  var a = document.getElementById('pageAudio');
  if (!a) { _alog('ERROR','audioSkip: no #pageAudio'); return; }
  var before = a.currentTime;
  a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + sec));
  _alog('INFO','audioSkip',{sec:sec,before:before,after:a.currentTime});
}

function audioStop() {
  var a = document.getElementById('pageAudio');
  if (!a) { _alog('ERROR','audioStop: no #pageAudio'); return; }
  a.pause(); a.currentTime = 0;
  var btn = document.getElementById('audioPlayBtn');
  if (btn) { btn.textContent = '▶'; btn.disabled = false; }
  var seek = document.getElementById('audioSeek');
  if (seek) seek.value = 0;
  _alog('INFO','audioStop');
}

// ── Seek slider + time display ────────────────────────────────────────────────
function _fmt(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  return Math.floor(s/60) + ':' + String(Math.floor(s%60)).padStart(2,'0');
}

window.addEventListener('DOMContentLoaded', function() {
  var a    = document.getElementById('pageAudio');
  var seek = document.getElementById('audioSeek');
  var time = document.getElementById('audioTime');

  _alog('INFO','init',{audio:!!a, seek:!!seek, src: a ? a.src : null});
  if (!a) return;

  // Log key audio events for diagnosis
  ['play','playing','pause','ended','error','stalled','waiting','loadedmetadata'].forEach(function(ev) {
    a.addEventListener(ev, function() {
      var info = {readyState:a.readyState, networkState:a.networkState,
                  currentTime:a.currentTime, duration:a.duration, paused:a.paused};
      if (ev === 'error' && a.error) {
        info.code = a.error.code;
        info.msg  = a.error.message;
        var codes = {1:'ABORTED',2:'NETWORK',3:'DECODE',4:'SRC_NOT_SUPPORTED'};
        info.type = codes[a.error.code] || 'UNKNOWN';
      }
      _alog(ev === 'error' ? 'ERROR' : 'INFO', 'audio:'+ev, info);
    });
  });

  if (!seek) return;

  a.addEventListener('loadedmetadata', function() {
    seek.max = a.duration; seek.value = 0;
    if (time) time.textContent = '0:00 / ' + _fmt(a.duration);
  });

  a.addEventListener('timeupdate', function() {
    if (!seek._drag) seek.value = a.currentTime;
    if (time && !seek._drag)
      time.textContent = _fmt(a.currentTime) + ' / ' + _fmt(a.duration || 0);
  });

  seek._drag = false;
  seek.addEventListener('mousedown',  function() { seek._drag = true; });
  seek.addEventListener('touchstart', function() { seek._drag = true; }, {passive:true});
  seek.addEventListener('input', function() {
    if (time) time.textContent = _fmt(+seek.value) + ' / ' + _fmt(a.duration || 0);
  });
  var done = function() { seek._drag = false; a.currentTime = +seek.value; };
  seek.addEventListener('change',   done);
  seek.addEventListener('mouseup',  done);
  seek.addEventListener('touchend', done, {passive:true});
});
