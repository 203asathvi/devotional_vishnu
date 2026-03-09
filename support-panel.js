/**
 * support-panel.js
 * Shared donate + comment + security component for all devotional pages.
 *
 * USAGE — add ONE line before </body> on each page:
 *   <script src="support-panel.js" data-paypal-id="YOUR_PAYPAL_ID"></script>
 *
 * Comments are stored per-page in localStorage (no backend needed).
 * Replace YOUR_PAYPAL_ID with your PayPal.me username.
 *
 * © 2025 – All rights reserved. Personal devotional use only.
 */

(function () {
  'use strict';

  /* ── CONFIG ──────────────────────────────────────────────────── */
  const scriptEl  = document.currentScript;
  const PAYPAL_ID = (scriptEl && scriptEl.dataset.paypalId) || 'YOUR_PAYPAL_ID';
  // Comments are keyed by page so each stotram has its own thread
  const PAGE_KEY  = 'sp_comments_' + location.pathname.replace(/\W+/g, '_');

  /* ── INJECT CSS ──────────────────────────────────────────────── */
  const CSS = `
/* ── SUPPORT FAB ── */
.sp-fab{position:fixed;bottom:80px;right:16px;z-index:500;display:flex;flex-direction:column;align-items:flex-end;gap:8px;}
.sp-fab-main{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--vis,#7a2095),var(--vis2,#b060e0));border:1px solid var(--gold,#c9a84c);color:#fff;font-size:22px;cursor:pointer;box-shadow:0 4px 18px rgba(122,32,149,0.5);transition:transform .22s;display:flex;align-items:center;justify-content:center;outline:none;}
.sp-fab-main:hover{transform:scale(1.1);}
.sp-fab-main.sp-open{transform:rotate(45deg);}
.sp-fab-menu{display:flex;flex-direction:column;gap:7px;align-items:flex-end;opacity:0;pointer-events:none;transform:translateY(8px);transition:opacity .22s,transform .22s;}
.sp-fab-menu.open{opacity:1;pointer-events:all;transform:translateY(0);}
.sp-fab-item{display:flex;align-items:center;gap:8px;background:var(--card,#130f1e);border:1px solid var(--border,rgba(201,168,76,0.25));border-radius:24px;padding:7px 14px 7px 10px;cursor:pointer;color:var(--gold,#c9a84c);font-family:'Cinzel',serif;font-size:12px;letter-spacing:.5px;white-space:nowrap;box-shadow:0 2px 12px rgba(0,0,0,.4);transition:border-color .2s,background .2s;}
.sp-fab-item:hover{border-color:var(--gold,#c9a84c);background:rgba(201,168,76,0.15);}
.sp-fab-item .sp-icon{font-size:18px;}

/* ── MODAL OVERLAY ── */
.sp-panel{position:fixed;inset:0;z-index:600;display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;pointer-events:none;transition:opacity .25s;}
.sp-panel.open{opacity:1;pointer-events:all;}
.sp-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);}
.sp-box{position:relative;background:var(--card,#130f1e);border:1px solid var(--border,rgba(201,168,76,0.25));border-radius:12px;width:100%;max-width:440px;max-height:88vh;overflow-y:auto;padding:24px;box-shadow:0 8px 40px rgba(0,0,0,.6);}
.sp-close-btn{position:absolute;top:12px;right:14px;background:none;border:none;color:var(--muted,#9d8050);font-size:20px;cursor:pointer;line-height:1;transition:color .15s;}
.sp-close-btn:hover{color:var(--gold,#c9a84c);}
.sp-title{font-family:'Cinzel',serif;font-size:14px;letter-spacing:1.5px;color:var(--gold,#c9a84c);margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--border,rgba(201,168,76,0.25));}

/* ── TABS ── */
.sp-tabs{display:flex;margin-bottom:18px;border:1px solid var(--border,rgba(201,168,76,0.25));border-radius:6px;overflow:hidden;}
.sp-tab-btn{flex:1;background:transparent;border:none;color:var(--muted,#9d8050);font-family:'Cinzel',serif;font-size:12px;letter-spacing:.8px;padding:9px 8px;cursor:pointer;transition:all .2s;}
.sp-tab-btn.active{background:rgba(201,168,76,0.18);color:var(--gold,#c9a84c);}
.sp-pane{display:none;}
.sp-pane.active{display:block;}

/* ── DONATE ── */
.sp-donate-intro{font-size:15px;color:var(--muted,#9d8050);font-style:italic;margin-bottom:16px;line-height:1.6;}
.sp-amounts{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;}
.sp-amt{flex:1;min-width:60px;background:rgba(201,168,76,0.07);border:1px solid var(--border,rgba(201,168,76,0.25));color:var(--gold,#c9a84c);padding:8px 6px;border-radius:6px;font-size:13px;cursor:pointer;font-family:'Cinzel',serif;transition:all .2s;text-align:center;}
.sp-amt:hover,.sp-amt.sel{background:rgba(201,168,76,0.22);border-color:var(--gold,#c9a84c);}
.sp-custom-amt{width:100%;background:var(--bg,#0a0812);border:1px solid var(--border,rgba(201,168,76,0.25));color:var(--text,#f0e6cc);padding:9px 12px;border-radius:6px;font-size:15px;margin-bottom:14px;outline:none;font-family:'EB Garamond',serif;box-sizing:border-box;}
.sp-custom-amt:focus{border-color:var(--gold,#c9a84c);}
.sp-paypal-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:13px;background:#0070ba;border:none;border-radius:8px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;transition:background .2s;letter-spacing:.3px;}
.sp-paypal-btn:hover{background:#005ea6;}
.sp-donate-note{text-align:center;font-size:12px;color:var(--muted,#9d8050);margin-top:10px;font-style:italic;}

/* ── COMMENTS ── */
.sp-cmt-form{display:flex;flex-direction:column;gap:10px;}
.sp-cmt-form input,.sp-cmt-form textarea{background:var(--bg,#0a0812);border:1px solid var(--border,rgba(201,168,76,0.25));color:var(--text,#f0e6cc);padding:9px 12px;border-radius:6px;font-size:15px;outline:none;font-family:'EB Garamond',serif;resize:vertical;box-sizing:border-box;width:100%;}
.sp-cmt-form input:focus,.sp-cmt-form textarea:focus{border-color:var(--gold,#c9a84c);}
.sp-cmt-form textarea{min-height:90px;}
.sp-cmt-submit{background:linear-gradient(135deg,var(--vis,#7a2095),var(--vis2,#b060e0));border:1px solid var(--gold,#c9a84c);color:#fff;padding:10px;border-radius:6px;font-family:'Cinzel',serif;font-size:13px;letter-spacing:1px;cursor:pointer;transition:opacity .2s;width:100%;}
.sp-cmt-submit:hover{opacity:.88;}
.sp-cmt-list{margin-top:18px;display:flex;flex-direction:column;gap:10px;}
.sp-cmt-item{background:rgba(201,168,76,0.04);border:1px solid rgba(201,168,76,0.15);border-radius:8px;padding:11px 13px;}
.sp-cmt-author{font-family:'Cinzel',serif;font-size:11px;color:var(--gold,#c9a84c);margin-bottom:4px;}
.sp-cmt-text{font-size:14px;color:var(--text,#f0e6cc);line-height:1.55;}
.sp-cmt-date{font-size:11px;color:var(--muted,#9d8050);margin-top:4px;}
.sp-cmt-empty{font-style:italic;color:var(--muted,#9d8050);font-size:14px;text-align:center;padding:16px 0;}
.sp-success-msg{text-align:center;padding:20px 0;font-size:15px;color:var(--gold-light,#f5d78a);}
`;

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  /* ── INJECT HTML ─────────────────────────────────────────────── */
  const PAYPAL_LOGO = `<svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/></svg>`;

  const html = `
<div class="sp-fab" id="spFab">
  <div class="sp-fab-menu" id="spFabMenu">
    <div class="sp-fab-item" id="spBtnDonate"><span class="sp-icon">💛</span> Donate</div>
    <div class="sp-fab-item" id="spBtnComment"><span class="sp-icon">💬</span> Comment</div>
  </div>
  <button class="sp-fab-main" id="spFabMain" aria-label="Support & Comments">🙏</button>
</div>

<div class="sp-panel" id="spPanel" role="dialog" aria-modal="true" aria-label="Support Panel">
  <div class="sp-backdrop" id="spBackdrop"></div>
  <div class="sp-box">
    <button class="sp-close-btn" id="spCloseBtn" aria-label="Close">✕</button>
    <div class="sp-title">Support This Project</div>
    <div class="sp-tabs">
      <button class="sp-tab-btn active" data-tab="donate">💛 Donate</button>
      <button class="sp-tab-btn" data-tab="comment">💬 Comments</button>
    </div>

    <!-- DONATE -->
    <div class="sp-pane active" id="spPaneDonate">
      <p class="sp-donate-intro">This devotional resource is offered freely as a service to Lord Vishnu's devotees. If it has helped your practice, please consider a small offering.</p>
      <div class="sp-amounts">
        <div class="sp-amt" data-amt="2">$2</div>
        <div class="sp-amt sel" data-amt="5">$5</div>
        <div class="sp-amt" data-amt="10">$10</div>
        <div class="sp-amt" data-amt="25">$25</div>
      </div>
      <input class="sp-custom-amt" id="spCustomAmt" type="number" min="1" placeholder="Or enter custom amount…">
      <a class="sp-paypal-btn" id="spPaypalBtn" href="#" target="_blank" rel="noopener noreferrer">
        ${PAYPAL_LOGO} Donate via PayPal
      </a>
      <p class="sp-donate-note">Secure payment via PayPal. Any amount is deeply appreciated. 🙏</p>
    </div>

    <!-- COMMENT -->
    <div class="sp-pane" id="spPaneComment">
      <div id="spCmtFormWrap">
        <div class="sp-cmt-form">
          <input type="text" id="spCmtName" placeholder="Your name (optional)" maxlength="60">
          <textarea id="spCmtText" placeholder="Share your experience, feedback, or a prayer…" maxlength="600"></textarea>
          <button class="sp-cmt-submit" id="spCmtSubmit">Submit Comment</button>
        </div>
      </div>
      <div class="sp-cmt-list" id="spCmtList"></div>
    </div>
  </div>
</div>
`;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  /* ── STATE ───────────────────────────────────────────────────── */
  let fabOpen    = false;
  let selectedAmt = '5';

  /* ── HELPERS ─────────────────────────────────────────────────── */
  function esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function $(id){ return document.getElementById(id); }

  /* ── FAB ─────────────────────────────────────────────────────── */
  $('spFabMain').addEventListener('click', function () {
    fabOpen = !fabOpen;
    $('spFabMenu').classList.toggle('open', fabOpen);
    $('spFabMain').classList.toggle('sp-open', fabOpen);
  });

  $('spBtnDonate').addEventListener('click', function () { openPanel('donate'); });
  $('spBtnComment').addEventListener('click', function () { openPanel('comment'); });

  function openPanel(tab) {
    fabOpen = false;
    $('spFabMenu').classList.remove('open');
    $('spFabMain').classList.remove('sp-open');
    $('spPanel').classList.add('open');
    switchTab(tab);
  }

  function closePanel() {
    $('spPanel').classList.remove('open');
  }

  $('spCloseBtn').addEventListener('click', closePanel);
  $('spBackdrop').addEventListener('click', closePanel);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePanel();
  });

  /* ── TABS ────────────────────────────────────────────────────── */
  document.querySelectorAll('.sp-tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
  });

  function switchTab(tab) {
    document.querySelectorAll('.sp-tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    $('spPaneDonate').classList.toggle('active',  tab === 'donate');
    $('spPaneComment').classList.toggle('active', tab === 'comment');
    if (tab === 'comment') loadComments();
  }

  /* ── DONATION ────────────────────────────────────────────────── */
  document.querySelectorAll('.sp-amt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectedAmt = btn.dataset.amt;
      document.querySelectorAll('.sp-amt').forEach(function (b) { b.classList.remove('sel'); });
      btn.classList.add('sel');
      $('spCustomAmt').value = '';
    });
  });

  $('spCustomAmt').addEventListener('input', function () {
    selectedAmt = '';
    document.querySelectorAll('.sp-amt').forEach(function (b) { b.classList.remove('sel'); });
  });

  $('spPaypalBtn').addEventListener('click', function (e) {
    e.preventDefault();
    const custom = $('spCustomAmt').value.trim();
    const amt    = custom || selectedAmt || '5';
    const url    = 'https://www.paypal.com/paypalme/' + PAYPAL_ID + '/' + amt + 'USD';
    window.open(url, '_blank', 'noopener,noreferrer');
  });

  /* ── COMMENTS ────────────────────────────────────────────────── */
  function loadComments() {
    const list = $('spCmtList');
    let comments = [];
    try { comments = JSON.parse(localStorage.getItem(PAGE_KEY) || '[]'); } catch (e) {}

    if (!comments.length) {
      list.innerHTML = '<div class="sp-cmt-empty">No comments yet. Be the first to share!</div>';
      return;
    }

    list.innerHTML = comments.slice().reverse().map(function (c) {
      return '<div class="sp-cmt-item">' +
        '<div class="sp-cmt-author">' + esc(c.name || 'Anonymous Devotee') + '</div>' +
        '<div class="sp-cmt-text">'   + esc(c.text) + '</div>' +
        '<div class="sp-cmt-date">'   + esc(c.date) + '</div>' +
        '</div>';
    }).join('');
  }

  function resetForm() {
    $('spCmtFormWrap').innerHTML =
      '<div class="sp-cmt-form">' +
        '<input type="text" id="spCmtName" placeholder="Your name (optional)" maxlength="60">' +
        '<textarea id="spCmtText" placeholder="Share your experience, feedback, or a prayer…" maxlength="600"></textarea>' +
        '<button class="sp-cmt-submit" id="spCmtSubmit">Submit Comment</button>' +
      '</div>';
    $('spCmtSubmit').addEventListener('click', submitComment);
  }

  function submitComment() {
    const name = $('spCmtName').value.trim();
    const text = $('spCmtText').value.trim();
    if (!text) { alert('Please write a comment first.'); return; }

    let comments = [];
    try { comments = JSON.parse(localStorage.getItem(PAGE_KEY) || '[]'); } catch (e) {}
    comments.push({
      name: name,
      text: text,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    });
    localStorage.setItem(PAGE_KEY, JSON.stringify(comments));

    $('spCmtFormWrap').innerHTML = '<div class="sp-success-msg">🙏 Thank you! Your message has been saved.</div>';
    setTimeout(function () { resetForm(); }, 2500);
    loadComments();
  }

  $('spCmtSubmit').addEventListener('click', submitComment);

  /* ── SECURITY ────────────────────────────────────────────────── */
  // Disable right-click
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // Block common source-view / save shortcuts
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && ['s','u','a'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
    if (e.key === 'F12') { e.preventDefault(); }
  });

  // Console copyright watermark
  console.log('%c⚠ Copyright Notice', 'color:#c9a84c;font-size:16px;font-weight:bold;');
  console.log('%cThis page is © 2025. Unauthorised copying is prohibited. For personal devotional use only.',
    'color:#9d8050;font-size:12px;');

  // Copy event notice
  document.addEventListener('copy', function () {
    console.warn('Content copied — © Devotional Pages 2025. Personal use only.');
  });

})();
