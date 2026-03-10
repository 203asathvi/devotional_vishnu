// ─── Audio Controller + Diagnostic Logger ─────────────────────────────────────
// Fixes: audioSkip(), audioStop() were undefined — causing wireAudioBtn in
//        scroll-controller.js to throw ReferenceError on touchend, which called
//        e.preventDefault() before crashing, blocking onclick too.
//
// Logging: window.__audioLog[] captures every event. To download:
//   1. Open browser console and type: downloadAudioLog()
//   OR the floating 📋 button appears after any audio error.
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  // ── Log ring buffer ───────────────────────────────────────────────────────
  var LOG = [];
  window.__audioLog = LOG;

  function log(level, msg, data) {
    var entry = {
      t:    new Date().toISOString(),
      lvl:  level,
      msg:  msg,
      data: data || null
    };
    LOG.push(entry);
    if (LOG.length > 200) LOG.shift();
    if (level === 'ERROR' || level === 'WARN') {
      console.warn('[AudioCtrl]', msg, data || '');
      showLogBtn();
    } else {
      console.log('[AudioCtrl]', msg, data || '');
    }
  }

  // ── Download log as JSON file ─────────────────────────────────────────────
  window.downloadAudioLog = function() {
    var page = location.pathname.split('/').pop().replace('.html','') || 'page';
    var blob = new Blob([JSON.stringify(LOG, null, 2)], {type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'audio-log-' + page + '-' + Date.now() + '.json';
    a.click();
    log('INFO', 'Log downloaded');
  };

  // ── Floating log button (appears on error) ────────────────────────────────
  var _logBtnShown = false;
  function showLogBtn() {
    if (_logBtnShown) return;
    _logBtnShown = true;
    var btn = document.createElement('button');
    btn.textContent = '📋 Audio Log';
    btn.title = 'Download audio diagnostic log';
    btn.style.cssText = 'position:fixed;top:12px;right:12px;z-index:9999;'
      + 'background:#c00;color:#fff;border:none;border-radius:8px;'
      + 'padding:6px 12px;font-size:12px;cursor:pointer;opacity:0.9;';
    btn.onclick = function() { window.downloadAudioLog(); };
    document.body.appendChild(btn);
  }

  // ── Core audio functions ──────────────────────────────────────────────────
  function getAudio() { return document.getElementById('pageAudio'); }

  window.audioSkip = function(sec) {
    var a = getAudio();
    if (!a) { log('ERROR', 'audioSkip: #pageAudio not found'); return; }
    var before = a.currentTime;
    a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + sec));
    log('INFO', 'audioSkip', {sec: sec, before: before, after: a.currentTime, duration: a.duration});
  };

  window.audioStop = function() {
    var a = getAudio();
    if (!a) { log('ERROR', 'audioStop: #pageAudio not found'); return; }
    a.pause();
    a.currentTime = 0;
    var btn = document.getElementById('audioPlayBtn');
    if (btn) { btn.textContent = '▶'; btn.disabled = false; }
    var seek = document.getElementById('audioSeek');
    if (seek) seek.value = 0;
    log('INFO', 'audioStop called');
  };

  // ── Seek slider + time display ────────────────────────────────────────────
  function fmt(s) {
    if (!isFinite(s) || s < 0) return '0:00';
    return Math.floor(s/60) + ':' + String(Math.floor(s%60)).padStart(2,'0');
  }

  window.addEventListener('DOMContentLoaded', function() {
    var a    = getAudio();
    var seek = document.getElementById('audioSeek');
    var time = document.getElementById('audioTime');
    var btn  = document.getElementById('audioPlayBtn');

    log('INFO', 'DOMContentLoaded', {
      audioFound: !!a,
      seekFound:  !!seek,
      timeFound:  !!time,
      btnFound:   !!btn,
      src:        a ? a.src : null
    });

    if (!a) return;

    // Log all audio element events for diagnosis
    ['loadstart','loadedmetadata','loadeddata','canplay','canplaythrough',
     'play','playing','pause','ended','waiting','stalled','suspend',
     'error','abort','emptied'].forEach(function(ev) {
      a.addEventListener(ev, function() {
        var info = {readyState: a.readyState, networkState: a.networkState,
                    currentTime: a.currentTime, duration: a.duration,
                    paused: a.paused, src: a.src};
        if (ev === 'error' && a.error) {
          info.errorCode = a.error.code;
          info.errorMsg  = a.error.message;
          // MediaError codes: 1=ABORTED 2=NETWORK 3=DECODE 4=SRC_NOT_SUPPORTED
          var codes = {1:'ABORTED',2:'NETWORK',3:'DECODE',4:'SRC_NOT_SUPPORTED'};
          info.errorType = codes[a.error.code] || 'UNKNOWN';
        }
        log(ev === 'error' ? 'ERROR' : 'INFO', 'audio:' + ev, info);
      });
    });

    // Seek slider wiring
    if (seek) {
      a.addEventListener('loadedmetadata', function() {
        seek.max = a.duration; seek.value = 0;
        if (time) time.textContent = '0:00 / ' + fmt(a.duration);
      });
      a.addEventListener('timeupdate', function() {
        if (!seek._drag) seek.value = a.currentTime;
        if (time && !seek._drag)
          time.textContent = fmt(a.currentTime) + ' / ' + fmt(a.duration || 0);
      });
      seek._drag = false;
      seek.addEventListener('mousedown',  function() { seek._drag = true; });
      seek.addEventListener('touchstart', function() { seek._drag = true; }, {passive:true});
      seek.addEventListener('input', function() {
        if (time) time.textContent = fmt(+seek.value) + ' / ' + fmt(a.duration||0);
      });
      var done = function() {
        seek._drag = false;
        a.currentTime = +seek.value;
        log('INFO', 'seek committed', {to: seek.value});
      };
      seek.addEventListener('change',   done);
      seek.addEventListener('mouseup',  done);
      seek.addEventListener('touchend', done, {passive:true});
    }

    // Log when play button is clicked (onclick= calls toggleAudio)
    if (btn) {
      btn.addEventListener('click', function() {
        var a2 = getAudio();
        log('INFO', 'play-btn click', {
          paused: a2 ? a2.paused : null,
          disabled: btn.disabled,
          readyState: a2 ? a2.readyState : null,
          networkState: a2 ? a2.networkState : null
        });
      });
    }
  });

  log('INFO', 'audio-controller.js loaded', {href: location.href});
})();
