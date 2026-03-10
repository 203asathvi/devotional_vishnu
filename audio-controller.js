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

// ── Skip duration state ───────────────────────────────────────────────────────
var _skipSec = 30;

function _skipLabel(s) {
  if (s >= 60 && s % 60 === 0) return (s / 60) + 'm';
  if (s >= 60) return (s / 60).toFixed(1).replace(/\.0$/, '') + 'm';
  return s + 's';
}

// ── Inline editor — replaces the num span with an input, restores on commit ──
function _inlineEdit(spanId, opts) {
  // opts: { min, max, step, getValue, onCommit(v), format(v) }
  var span = document.getElementById(spanId);
  if (!span) return;
  // If already editing, ignore
  if (document.getElementById(spanId + '_inp')) return;

  var inp = document.createElement('input');
  inp.type = 'number';
  inp.id = spanId + '_inp';
  inp.className = 'scroll-speed-input';
  inp.min = opts.min; inp.max = opts.max; inp.step = opts.step;
  inp.value = opts.getValue();
  inp.style.cssText = 'width:52px;font-size:12px;text-align:center;';
  span.replaceWith(inp);
  inp.focus(); inp.select();

  var committed = false;
  function commit() {
    if (committed) return; committed = true;
    var v = parseFloat(inp.value);
    if (isNaN(v) || v < opts.min) v = opts.min;
    if (v > opts.max) v = opts.max;
    v = opts.onCommit(v);
    var newSpan = document.createElement('span');
    newSpan.id = spanId;
    newSpan.className = span.className;
    newSpan.textContent = opts.format(v);
    inp.replaceWith(newSpan);
  }
  setTimeout(function() { inp.addEventListener('blur', commit); }, 300);
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter')  { commit(); }
    if (e.key === 'Escape') { committed = true; inp.replaceWith(span); }
  });
}

function editAudioSkip(el) {
  _inlineEdit('audioSkipVal', {
    min: 1, max: 3600, step: 1,
    getValue: function() { return _skipSec; },
    onCommit: function(v) {
      v = Math.round(v);
      _skipSec = v;
      var rew = document.getElementById('audioRewBtn');
      var fwd = document.getElementById('audioFwdBtn');
      if (rew) rew.title = 'Rewind ' + _skipLabel(v);
      if (fwd) fwd.title = 'Forward ' + _skipLabel(v);
      _alog('INFO', 'skip set', {sec: v});
      return v;
    },
    format: function(v) { return _skipLabel(v); }
  });
}

function editAudioSpeed(el) {
  var a = document.getElementById('pageAudio');
  _inlineEdit('audioSpeedVal', {
    min: 0.5, max: 4, step: 0.05,
    getValue: function() { return a ? a.playbackRate : 1; },
    onCommit: function(v) {
      v = Math.round(v * 100) / 100;
      if (a) a.playbackRate = v;
      _alog('INFO', 'speed set', {rate: v});
      return v;
    },
    format: function(v) { return v + '×'; }
  });
}

// ── Skip: reads _skipSec, sign of arg = direction ─────────────────────────────
function audioSkip(sec) {
  var amount = (sec > 0 ? 1 : -1) * _skipSec;
  var a = document.getElementById('pageAudio');
  if (!a) { _alog('ERROR', 'audioSkip: no #pageAudio'); return; }

  _alog('INFO', 'audioSkip', {
    direction: sec > 0 ? 'fwd' : 'rew', amount: amount,
    readyState: a.readyState, duration: a.duration, currentTime: a.currentTime
  });

  if (!isFinite(a.duration) || a.readyState < 1) {
    a.addEventListener('loadedmetadata', function onMeta() {
      a.removeEventListener('loadedmetadata', onMeta);
      a.currentTime = Math.max(0, Math.min(a.duration, a.currentTime + amount));
    });
    a.load();
    return;
  }

  a.currentTime = Math.max(0, Math.min(a.duration, a.currentTime + amount));
}

function audioStop() {
  var a = document.getElementById('pageAudio');
  if (!a) return;
  a.pause(); a.currentTime = 0;
  var btn = document.getElementById('audioPlayBtn');
  if (btn) { btn.textContent = '▶'; btn.disabled = false; }
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
      var info = {readyState:a.readyState, duration:a.duration, currentTime:a.currentTime};
      if (ev === 'error' && a.error) {
        var codes = {1:'ABORTED',2:'NETWORK',3:'DECODE',4:'SRC_NOT_SUPPORTED'};
        info.errorType = codes[a.error.code] || 'UNKNOWN';
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
