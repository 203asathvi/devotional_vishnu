// ─── Audio Controller ─────────────────────────────────────────────────────────
// Provides the functions that scroll-controller.js calls but doesn't define:
//   audioSkip(sec), audioStop()
// Also wires the seek slider and time display.
// Load this BEFORE scroll-controller.js.
// ─────────────────────────────────────────────────────────────────────────────

function audioSkip(sec) {
  var a = document.getElementById('pageAudio');
  if (!a) return;
  a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + sec));
}

function audioStop() {
  var a = document.getElementById('pageAudio');
  if (!a) return;
  a.pause();
  a.currentTime = 0;
  var btn = document.getElementById('audioPlayBtn');
  if (btn) { btn.textContent = '▶'; btn.disabled = false; }
}

// ── Seek slider wiring ────────────────────────────────────────────────────────
function _fmtTime(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  var m = Math.floor(s / 60);
  return m + ':' + String(Math.floor(s % 60)).padStart(2, '0');
}

window.addEventListener('DOMContentLoaded', function() {
  var a    = document.getElementById('pageAudio');
  var seek = document.getElementById('audioSeek');
  var time = document.getElementById('audioTime');
  if (!a) return;

  if (seek) {
    a.addEventListener('loadedmetadata', function() {
      seek.max = a.duration; seek.value = 0;
      if (time) time.textContent = '0:00 / ' + _fmtTime(a.duration);
    });
    a.addEventListener('timeupdate', function() {
      if (!seek._drag) seek.value = a.currentTime;
      if (time && !seek._drag)
        time.textContent = _fmtTime(a.currentTime) + ' / ' + _fmtTime(a.duration || 0);
    });
    seek._drag = false;
    seek.addEventListener('mousedown',  function() { seek._drag = true; });
    seek.addEventListener('touchstart', function() { seek._drag = true; }, {passive:true});
    seek.addEventListener('input', function() {
      if (time) time.textContent = _fmtTime(+seek.value) + ' / ' + _fmtTime(a.duration || 0);
    });
    var commitSeek = function() {
      seek._drag = false;
      a.currentTime = +seek.value;
    };
    seek.addEventListener('change',   commitSeek);
    seek.addEventListener('mouseup',  commitSeek);
    seek.addEventListener('touchend', commitSeek, {passive:true});
  }
});
