// ─── Audio Controller ─────────────────────────────────────────────────────────
// Defines audioSkip(), audioStop(), editAudioSkip() as globals.
// Load BEFORE scroll-controller.js.
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

// ── Skip duration state — default 30s ────────────────────────────────────────
var _skipSec = 30;

function _skipLabel(s) {
  if (s >= 60 && s % 60 === 0) return (s / 60) + 'm';
  if (s >= 60) return (s / 60).toFixed(1).replace(/\.0$/, '') + 'm';
  return s + 's';
}

// ── Editable skip span — same pattern as editAudioSpeed ──────────────────────
function editAudioSkip(el) {
  var inp = document.createElement('input');
  inp.type = 'number';
  inp.className = 'scroll-speed-input';
  inp.min = '1'; inp.max = '3600'; inp.step = '1';
  inp.value = _skipSec;
  inp.title = 'Skip duration in seconds (e.g. 600 = 10 min)';
  el.replaceWith(inp);
  inp.focus(); inp.select();

  var committed = false;
  function commit() {
    if (committed) return; committed = true;
    var v = parseInt(inp.value, 10);
    if (isNaN(v) || v < 1)    v = 1;
    if (v > 3600)              v = 3600;
    _skipSec = v;
    var span = document.createElement('span');
    span.className = 'audio-skip-val'; span.id = 'audioSkipVal';
    span.title = 'Click to set skip duration';
    span.onclick = function() { editAudioSkip(this); };
    span.textContent = _skipLabel(v);
    inp.replaceWith(span);
    // Update button tooltips
    var rew = document.getElementById('audioRewBtn');
    var fwd = document.getElementById('audioFwdBtn');
    if (rew) rew.title = 'Rewind ' + _skipLabel(v);
    if (fwd) fwd.title = 'Forward ' + _skipLabel(v);
    _alog('INFO', 'skip duration set', {sec: v, label: _skipLabel(v)});
  }
  setTimeout(function() { inp.addEventListener('blur', commit); }, 300);
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter')  { commit(); }
    if (e.key === 'Escape') { committed = true; inp.replaceWith(el); }
  });
}

// ── Skip: reads _skipSec, handles unloaded audio ──────────────────────────────
function audioSkip(sec) {
  // sec argument from wireAudioBtn is ±1 sentinel — multiply by actual skip amount
  var amount = (sec > 0 ? 1 : -1) * _skipSec;
  var a = document.getElementById('pageAudio');
  if (!a) { _alog('ERROR', 'audioSkip: no #pageAudio'); return; }

  _alog('INFO', 'audioSkip called', {
    direction: sec > 0 ? 'fwd' : 'rew',
    amount: amount,
    readyState: a.readyState,
    duration: a.duration,
    currentTime: a.currentTime
  });

  if (!isFinite(a.duration) || a.readyState < 1) {
    _alog('INFO', 'audioSkip: metadata not ready, loading first');
    a.addEventListener('loadedmetadata', function onMeta() {
      a.removeEventListener('loadedmetadata', onMeta);
      var target = Math.max(0, Math.min(a.duration, a.currentTime + amount));
      _alog('INFO', 'audioSkip: seeking after load', {target: target, duration: a.duration});
      a.currentTime = target;
    });
    a.load();
    return;
  }

  var target = Math.max(0, Math.min(a.duration, a.currentTime + amount));
  _alog('INFO', 'audioSkip: seeking', {from: a.currentTime, to: target});
  a.currentTime = target;
}

function audioStop() {
  var a = document.getElementById('pageAudio');
  if (!a) { _alog('ERROR', 'audioStop: no #pageAudio'); return; }
  a.pause(); a.currentTime = 0;
  var btn = document.getElementById('audioPlayBtn');
  if (btn) { btn.textContent = '▶'; btn.disabled = false; }
  _alog('INFO', 'audioStop');
}

// ── Time display ──────────────────────────────────────────────────────────────
function _fmt(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  return Math.floor(s/60) + ':' + String(Math.floor(s%60)).padStart(2,'0');
}

window.addEventListener('DOMContentLoaded', function() {
  var a    = document.getElementById('pageAudio');
  var time = document.getElementById('audioTime');
  if (!a) return;

  ['loadedmetadata','play','playing','pause','ended','error','stalled','waiting'].forEach(function(ev) {
    a.addEventListener(ev, function() {
      var info = {readyState:a.readyState, duration:a.duration,
                  currentTime:a.currentTime, paused:a.paused};
      if (ev === 'error' && a.error) {
        info.code = a.error.code;
        var codes = {1:'ABORTED',2:'NETWORK',3:'DECODE',4:'SRC_NOT_SUPPORTED'};
        info.type = codes[a.error.code] || 'UNKNOWN';
      }
      _alog(ev === 'error' ? 'ERROR' : 'INFO', 'audio:' + ev, info);
    });
  });

  if (time) {
    a.addEventListener('timeupdate', function() {
      time.textContent = _fmt(a.currentTime) + ' / ' + _fmt(a.duration);
    });
    a.addEventListener('loadedmetadata', function() {
      time.textContent = '0:00 / ' + _fmt(a.duration);
    });
  }
});
