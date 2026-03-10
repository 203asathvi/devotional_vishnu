/**
 * support-panel.js  v6
 * Shared donate + comment panel. Comments stored in Cloudflare D1 via Worker API.
 *
 * Add before </body> on every page:
 *   <script src="support-panel.js"
 *           data-paypal-id="YOUR_PAYPAL_ID"
 *           data-api="https://devotional-comments.YOUR_SUBDOMAIN.workers.dev">
 *   </script>
 *
 * © 2025 – All rights reserved. Personal devotional use only.
 */
(function () {
  'use strict';

  var scriptEl  = document.currentScript;
  var PAYPAL_ID = (scriptEl && scriptEl.dataset.paypalId) || 'YOUR_PAYPAL_ID';
  var API_BASE  = (scriptEl && scriptEl.dataset.api)      || '';
  // Page key derived from filename e.g. "vishnu_sahasranamam"
  var PAGE_KEY  = location.pathname.replace(/^.*\//, '').replace(/\.html$/, '') || 'index';

  /* ── CSS ── */
  var style = document.createElement('style');
  style.textContent =
    '#spFab{position:fixed;left:16px;z-index:500;display:flex;flex-direction:column;align-items:flex-start;gap:8px;bottom:20px;}' +
    /* Back-to-top position is set entirely via inline style in placeFab() */
    '#spFabBtn{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--vis,#7a2095),var(--vis2,#b060e0));border:2px solid var(--gold,#c9a84c);color:#fff;font-size:20px;cursor:pointer;box-shadow:0 4px 20px rgba(122,32,149,0.6);display:flex;align-items:center;justify-content:center;transition:transform .22s;outline:none;flex-shrink:0;}' +
    '#spFabBtn:hover{transform:scale(1.08);}' +
    '#spFabBtn.open{transform:rotate(45deg);}' +
    '#spFabMenu{display:flex;flex-direction:column;gap:7px;align-items:flex-start;opacity:0;pointer-events:none;transform:translateY(6px);transition:opacity .2s,transform .2s;}' +
    '#spFabMenu.open{opacity:1;pointer-events:all;transform:translateY(0);}' +
    '.sp-fab-item{display:flex;align-items:center;gap:8px;background:var(--card,#130f1e);border:1px solid var(--border,rgba(201,168,76,0.3));border-radius:20px;padding:8px 14px 8px 11px;cursor:pointer;color:var(--gold,#c9a84c);font-family:Cinzel,serif;font-size:12px;letter-spacing:.5px;white-space:nowrap;box-shadow:0 2px 14px rgba(0,0,0,.5);transition:all .18s;}' +
    '.sp-fab-item:hover{border-color:var(--gold,#c9a84c);background:rgba(201,168,76,0.14);}' +
    '#spPanel{position:fixed;inset:0;z-index:700;display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;pointer-events:none;transition:opacity .25s;}' +
    '#spPanel.open{opacity:1;pointer-events:all;}' +
    '#spBackdrop{position:absolute;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);}' +
    '#spBox{position:relative;background:var(--card,#130f1e);border:1px solid var(--border,rgba(201,168,76,0.3));border-radius:14px;width:100%;max-width:440px;max-height:88vh;overflow-y:auto;padding:24px;box-shadow:0 8px 40px rgba(0,0,0,.7);}' +
    '#spCloseBtn{position:absolute;top:12px;right:14px;background:none;border:none;color:var(--muted,#9d8050);font-size:22px;cursor:pointer;line-height:1;padding:0;}' +
    '#spCloseBtn:hover{color:var(--gold,#c9a84c);}' +
    '.sp-modal-title{font-family:Cinzel,serif;font-size:14px;letter-spacing:1.5px;color:var(--gold,#c9a84c);margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--border,rgba(201,168,76,0.25));}' +
    '.sp-tabs{display:flex;margin-bottom:18px;border:1px solid var(--border,rgba(201,168,76,0.25));border-radius:6px;overflow:hidden;}' +
    '.sp-tab{flex:1;background:transparent;border:none;color:var(--muted,#9d8050);font-family:Cinzel,serif;font-size:12px;letter-spacing:.8px;padding:9px 6px;cursor:pointer;transition:all .2s;}' +
    '.sp-tab.on{background:rgba(201,168,76,0.18);color:var(--gold,#c9a84c);}' +
    '.sp-pane{display:none;}' +
    '.sp-pane.on{display:block;}' +
    '.sp-intro{font-size:15px;color:var(--muted,#9d8050);font-style:italic;margin-bottom:16px;line-height:1.6;}' +
    '.sp-amts{display:flex;gap:8px;margin-bottom:14px;}' +
    '.sp-amt{flex:1;background:rgba(201,168,76,0.07);border:1px solid var(--border,rgba(201,168,76,0.25));color:var(--gold,#c9a84c);padding:9px 4px;border-radius:6px;font-size:13px;cursor:pointer;font-family:Cinzel,serif;text-align:center;transition:all .18s;}' +
    '.sp-amt:hover,.sp-amt.on{background:rgba(201,168,76,0.22);border-color:var(--gold,#c9a84c);}' +
    '.sp-custom{width:100%;background:var(--bg,#0a0812);border:1px solid var(--border,rgba(201,168,76,0.25));color:var(--text,#f0e6cc);padding:9px 12px;border-radius:6px;font-size:15px;margin-bottom:14px;outline:none;font-family:"EB Garamond",serif;box-sizing:border-box;}' +
    '.sp-custom:focus{border-color:var(--gold,#c9a84c);}' +
    '.sp-pp-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:13px;background:#0070ba;border:none;border-radius:8px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;transition:background .2s;}' +
    '.sp-pp-btn:hover{background:#005ea6;}' +
    '.sp-note{text-align:center;font-size:12px;color:var(--muted,#9d8050);margin-top:10px;font-style:italic;}' +
    '.sp-cmt-form{display:flex;flex-direction:column;gap:10px;}' +
    '.sp-cmt-form input,.sp-cmt-form textarea{background:var(--bg,#0a0812);border:1px solid var(--border,rgba(201,168,76,0.25));color:var(--text,#f0e6cc);padding:9px 12px;border-radius:6px;font-size:15px;outline:none;font-family:"EB Garamond",serif;resize:vertical;width:100%;box-sizing:border-box;}' +
    '.sp-cmt-form input:focus,.sp-cmt-form textarea:focus{border-color:var(--gold,#c9a84c);}' +
    '.sp-cmt-form textarea{min-height:90px;}' +
    '.sp-submit{background:linear-gradient(135deg,var(--vis,#7a2095),var(--vis2,#b060e0));border:1px solid var(--gold,#c9a84c);color:#fff;padding:10px;border-radius:6px;font-family:Cinzel,serif;font-size:13px;letter-spacing:1px;cursor:pointer;width:100%;transition:opacity .2s;}' +
    '.sp-submit:hover{opacity:.88;}' +
    '.sp-submit:disabled{opacity:.5;cursor:not-allowed;}' +
    '.sp-cmts{margin-top:18px;display:flex;flex-direction:column;gap:10px;}' +
    '.sp-cmt{background:rgba(201,168,76,0.04);border:1px solid rgba(201,168,76,0.15);border-radius:8px;padding:11px 13px;}' +
    '.sp-cmt-who{font-family:Cinzel,serif;font-size:11px;color:var(--gold,#c9a84c);margin-bottom:4px;}' +
    '.sp-cmt-body{font-size:14px;color:var(--text,#f0e6cc);line-height:1.55;}' +
    '.sp-cmt-when{font-size:11px;color:var(--muted,#9d8050);margin-top:4px;}' +
    '.sp-empty{font-style:italic;color:var(--muted,#9d8050);font-size:14px;text-align:center;padding:16px 0;}' +
    '.sp-loading{font-style:italic;color:var(--muted,#9d8050);font-size:13px;text-align:center;padding:12px 0;}' +
    '.sp-ok{text-align:center;padding:20px 0;font-size:15px;color:var(--gold-light,#f5d78a);}' +
    '.sp-err{text-align:center;padding:8px;font-size:13px;color:#e06060;margin-top:6px;}' +
    '#backTop{position:fixed;right:16px;bottom:20px;width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--vis,#7a2095),var(--vis2,#b060e0));border:2px solid var(--gold,#c9a84c);color:#fff;font-size:20px;cursor:pointer;box-shadow:0 4px 20px rgba(122,32,149,0.6);display:flex;align-items:center;justify-content:center;transition:transform .22s,opacity .22s;outline:none;opacity:0;pointer-events:none;z-index:500;}' +
    '#backTop.visible{opacity:1;pointer-events:all;}' +
    '#backTop:hover{transform:scale(1.08);}';
  document.head.appendChild(style);

  /* ── HTML ── */
  var PP = '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/></svg>';

  document.body.insertAdjacentHTML('beforeend',
    '<div id="spFab">' +
      '<div id="spFabMenu">' +
        '<div class="sp-fab-item" id="spBtnDonate">&#x1F49B; Donate</div>' +
        '<div class="sp-fab-item" id="spBtnComment">&#x1F4AC; Comment</div>' +
      '</div>' +
      '<button id="spFabBtn" aria-label="Donate or Comment">&#x1F64F;</button>' +
    '</div>' +
    '<div id="spPanel" role="dialog" aria-modal="true">' +
      '<div id="spBackdrop"></div>' +
      '<div id="spBox">' +
        '<button id="spCloseBtn">&#x2715;</button>' +
        '<div class="sp-modal-title">Support This Project</div>' +
        '<div class="sp-tabs">' +
          '<button class="sp-tab on" data-t="donate">&#x1F49B; Donate</button>' +
          '<button class="sp-tab" data-t="comment">&#x1F4AC; Comments</button>' +
        '</div>' +
        '<div class="sp-pane on" id="spDonate">' +
          '<p class="sp-intro">This devotional resource is offered freely as a service to the Divine. If it has helped your practice, a small offering is deeply appreciated.</p>' +
          '<div class="sp-amts">' +
            '<div class="sp-amt" data-v="2">$2</div>' +
            '<div class="sp-amt on" data-v="5">$5</div>' +
            '<div class="sp-amt" data-v="10">$10</div>' +
            '<div class="sp-amt" data-v="25">$25</div>' +
          '</div>' +
          '<input class="sp-custom" id="spAmt" type="number" min="1" placeholder="Custom amount&hellip;">' +
          '<a class="sp-pp-btn" id="spPP" href="#" target="_blank" rel="noopener">' + PP + '&nbsp;Donate via PayPal</a>' +
          '<p class="sp-note">&#x1F64F; Secure payment via PayPal. Any amount is a blessing.</p>' +
        '</div>' +
        '<div class="sp-pane" id="spComment">' +
          '<div id="spFormWrap">' +
            '<div class="sp-cmt-form">' +
              '<input type="text" id="spName" placeholder="Your name (optional)" maxlength="60">' +
              '<textarea id="spText" placeholder="Share your experience or a prayer&hellip;" maxlength="600"></textarea>' +
              '<button class="sp-submit" id="spSubmit">&#x1F64F; Submit</button>' +
              '<div id="spErr"></div>' +
            '</div>' +
          '</div>' +
          '<div class="sp-cmts" id="spCmts"></div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );

  /* ── BACK-TO-TOP BUTTON (right side) ── */
  if (!document.getElementById('backTop')) {
    var btBtn = document.createElement('button');
    btBtn.id = 'backTop';
    btBtn.setAttribute('aria-label', 'Back to top');
    btBtn.innerHTML = '&#x2191;';
    document.body.appendChild(btBtn);
    btBtn.addEventListener('click', function () { window.scrollTo({top:0,behavior:'smooth'}); });
    window.addEventListener('scroll', function () {
      btBtn.classList.toggle('visible', window.scrollY > 300);
    }, {passive:true});
  }

  /* ── POSITIONING (RAF-based, above pills/tabs) ── */
  function pillClearance(id, tabId) {
    // Returns the height to clear: full pill if visible, tab button if visible, else 0
    var pill = document.getElementById(id);
    var tab  = document.getElementById(tabId);
    if (pill && !pill.classList.contains('hidden') && pill.offsetHeight > 0)
      return pill.offsetHeight + 16;
    if (tab && !tab.classList.contains('hidden') && tab.offsetHeight > 0)
      return tab.offsetHeight + 12;
    return 0;
  }
  function placeFab() {
    var fab = document.getElementById('spFab');
    var bt  = document.getElementById('backTop') || document.querySelector('.back-top');
    if (!fab) return;
    // Left side (spFab): clear audioPill or audioTab
    fab.style.bottom = (20 + pillClearance('audioPill', 'audioTab')) + 'px';
    // Right side (backTop): clear scrollPill or scrollTab
    if (bt) bt.style.bottom = (20 + pillClearance('scrollPill', 'scrollTab')) + 'px';
  }
  requestAnimationFrame(function () { requestAnimationFrame(placeFab); });
  window.addEventListener('resize', function () { requestAnimationFrame(placeFab); });
  // Observe both pills for class changes
  ['audioPill', 'scrollPill'].forEach(function(id) {
    var pill = document.getElementById(id);
    if (pill && window.MutationObserver) {
      new MutationObserver(function () { requestAnimationFrame(placeFab); })
        .observe(pill, { attributes: true, attributeFilter: ['class', 'style'] });
    }
  });


  /* ── FAB ── */
  var isOpen = false;
  function q(id) { return document.getElementById(id); }

  q('spFabBtn').addEventListener('click', function () {
    isOpen = !isOpen;
    q('spFabMenu').classList.toggle('open', isOpen);
    q('spFabBtn').classList.toggle('open', isOpen);
  });
  q('spBtnDonate').addEventListener('click',  function () { openPanel('donate');  });
  q('spBtnComment').addEventListener('click', function () { openPanel('comment'); });

  function openPanel(t) {
    isOpen = false;
    q('spFabMenu').classList.remove('open');
    q('spFabBtn').classList.remove('open');
    q('spPanel').classList.add('open');
    showTab(t);
  }
  function closePanel() { q('spPanel').classList.remove('open'); }
  q('spCloseBtn').addEventListener('click', closePanel);
  q('spBackdrop').addEventListener('click', closePanel);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });

  /* ── TABS ── */
  document.querySelectorAll('.sp-tab').forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.dataset.t); });
  });
  function showTab(t) {
    document.querySelectorAll('.sp-tab').forEach(function (b) {
      b.classList.toggle('on', b.dataset.t === t);
    });
    q('spDonate').classList.toggle('on',  t === 'donate');
    q('spComment').classList.toggle('on', t === 'comment');
    if (t === 'comment') loadComments();
  }

  /* ── DONATE ── */
  var selAmt = '5';
  document.querySelectorAll('.sp-amt').forEach(function (b) {
    b.addEventListener('click', function () {
      selAmt = b.dataset.v;
      document.querySelectorAll('.sp-amt').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      q('spAmt').value = '';
    });
  });
  q('spAmt').addEventListener('input', function () {
    selAmt = '';
    document.querySelectorAll('.sp-amt').forEach(function (x) { x.classList.remove('on'); });
  });
  q('spPP').addEventListener('click', function (e) {
    e.preventDefault();
    var v = q('spAmt').value.trim() || selAmt || '5';
    window.open('https://www.paypal.com/paypalme/' + PAYPAL_ID + '/' + v + 'USD', '_blank', 'noopener');
  });

  /* ── COMMENTS ── */
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function loadComments() {
    var el = q('spCmts');
    if (!API_BASE) {
      el.innerHTML = '<div class="sp-empty">Comments unavailable — API not configured.</div>';
      return;
    }
    el.innerHTML = '<div class="sp-loading">Loading comments&hellip;</div>';
    fetch(API_BASE + '/api/comments?page=' + encodeURIComponent(PAGE_KEY))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var list = data.comments || [];
        if (!list.length) {
          el.innerHTML = '<div class="sp-empty">No comments yet. Be the first!</div>';
          return;
        }
        el.innerHTML = list.map(function (c) {
          return '<div class="sp-cmt">' +
            '<div class="sp-cmt-who">' + esc(c.name || 'Anonymous Devotee') + '</div>' +
            '<div class="sp-cmt-body">' + esc(c.text) + '</div>' +
            '<div class="sp-cmt-when">' + esc(c.date) + '</div>' +
            '</div>';
        }).join('');
      })
      .catch(function () {
        el.innerHTML = '<div class="sp-empty">Could not load comments.</div>';
      });
  }

  function rebuildForm() {
    var wrap = q('spFormWrap');
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="sp-cmt-form">' +
        '<input type="text" id="spName" placeholder="Your name (optional)" maxlength="60">' +
        '<textarea id="spText" placeholder="Share your experience or a prayer\u2026" maxlength="600"></textarea>' +
        '<button class="sp-submit" id="spSubmit">&#x1F64F; Submit</button>' +
        '<div id="spErr"></div>' +
      '</div>';
    q('spSubmit').addEventListener('click', doSubmit);
  }

  function doSubmit() {
    var name = q('spName').value.trim();
    var text = q('spText').value.trim();
    var err  = q('spErr');
    if (!text) { if(err) err.innerHTML = '<div class="sp-err">Please write something first.</div>'; return; }
    if (!API_BASE) { if(err) err.innerHTML = '<div class="sp-err">API not configured.</div>'; return; }

    var btn = q('spSubmit');
    btn.disabled = true;
    btn.textContent = 'Sending\u2026';

    fetch(API_BASE + '/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: PAGE_KEY, name: name, text: text })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok) {
          q('spFormWrap').innerHTML = '<div class="sp-ok">&#x1F64F; Thank you! Your comment has been saved.</div>';
          setTimeout(rebuildForm, 2500);
          loadComments();
        } else {
          btn.disabled = false;
          btn.innerHTML = '&#x1F64F; Submit';
          if (err) err.innerHTML = '<div class="sp-err">' + esc(data.error || 'Something went wrong.') + '</div>';
        }
      })
      .catch(function () {
        btn.disabled = false;
        btn.innerHTML = '&#x1F64F; Submit';
        if (err) err.innerHTML = '<div class="sp-err">Network error. Please try again.</div>';
      });
  }

  q('spSubmit').addEventListener('click', doSubmit);

  /* ── SECURITY ── */
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && 'sua'.indexOf(e.key.toLowerCase()) > -1) e.preventDefault();
    if (e.key === 'F12') e.preventDefault();
  });
  console.log('%c\u00A9 2025 Devotional Pages \u2014 All rights reserved.', 'color:#c9a84c;font-size:13px;font-weight:bold;');
  document.addEventListener('copy', function () { console.warn('\u00A9 2025 \u2014 Personal devotional use only.'); });

})();
