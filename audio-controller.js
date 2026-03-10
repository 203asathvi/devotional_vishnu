// ─── Audio Controller ─────────────────────────────────────────────────────────
// Defines audioSkip() and audioStop() as globals.
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

// ── Skip: handles unloaded audio by forcing load then seeking ─────────────────
function audioSkip(sec) {
  var a = document.getElementById('pageAudio');
  if (!a) { _alog('ERROR', 'audioSkip: no #pageAudio'); return; }

  _alog('INFO', 'audioSkip called', {
    sec: sec,
    readyState: a.readyState,
    duration: a.duration,
    currentTime: a.currentTime,
    paused: a.paused
  });

  // readyState < 1 means metadata not loaded yet — load first, then seek
  if (!isFinite(a.duration) || a.readyState < 1) {
    _alog('INFO', 'audioSkip: metadata not ready, loading first');
    a.addEventListener('loadedmetadata', function onMeta() {
      a.removeEventListener('loadedmetadata', onMeta);
      var target = Math.max(0, Math.min(a.duration, a.currentTime + sec));
      _alog('INFO', 'audioSkip: seeking after load', {target: target, duration: a.duration});
      a.currentTime = target;
    });
    a.load();
    return;
  }

  var target = Math.max(0, Math.min(a.duration, a.currentTime + sec));
  _alog('INFO', 'audioSkip: seeking', {from: a.currentTime, to: target, duration: a.duration});
  a.currentTime = target;
}

function audioStop() {
  var a = document.getElementById('pageAudio');
  if (!a) { _alog('ERROR', 'audioStop: no #pageAudio'); return; }
  a.pause();
  a.currentTime = 0;
  var btn = document.getElementById('audioPlayBtn');
  if (btn) { btn.textContent = '▶'; btn.disabled = false; }
  _alog('INFO', 'audioStop');
}

// ── Time display update ───────────────────────────────────────────────────────
function _fmt(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  return Math.floor(s/60) + ':' + String(Math.floor(s%60)).padStart(2,'0');
}

window.addEventListener('DOMContentLoaded', function() {
  var a    = document.getElementById('pageAudio');
  var time = document.getElementById('audioTime');
  if (!a) return;

  // Log key audio events
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

  // Update time display while playing
  a.addEventListener('timeupdate', function() {
    if (time) time.textContent = _fmt(a.currentTime) + ' / ' + _fmt(a.duration);
  });
  a.addEventListener('loadedmetadata', function() {
    if (time) time.textContent = '0:00 / ' + _fmt(a.duration);
  });
});
