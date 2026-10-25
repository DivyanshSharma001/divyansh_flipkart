/* Shell + phone renderer: sidebar (role switching), phone frame, Flipkart-style header
   (tiles → context pill → ask bar → icon tabs), skeleton-first tabs, bottom nav. */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;
  const ic = (n, c) => A.ui.icon(n, c);
  const esc = U.esc;
  const t = (k, v) => A.t(k, v);

  A.ui.tabs = A.ui.tabs || {};
  const TABS = ['agent', 'mirror', 'guard', 'grow', 'family', 'settings'];
  const TAB_ICON = { agent: 'agent', mirror: 'mirror', guard: 'guard', grow: 'grow', family: 'family', settings: 'settings' };
  const SUBS = {
    mirror: [['statement', 'mirror', 'as.statement_short'], ['sofar', 'clock', 'as.so_far'], ['how', 'help', 'as.how_short']],
    guard: [['waiting', 'bell', 'dg.waiting'], ['rules', 'sliders', 'dg.rules'], ['history', 'list', 'dg.history']]
  };
  const SUB_LABEL = {
    'as.statement_short': ['Statement', 'स्टेटमेंट'], 'as.how_short': ['How it works', 'कैसे काम करता है'], 'dg.waiting': null, 'dg.rules': null, 'dg.history': null, 'as.so_far': null
  };
  function subLabel(key) {
    const row = SUB_LABEL[key];
    if (row) return A.i18n.langOf() === 'hi' ? row[1] : row[0];
    return t(key);
  }

  function P(id) { return A.state.personas[id]; }
  function cur() { return A.state.current === 'console' ? null : P(A.state.current); }
  A.ui.cur = cur;

  A.ui.getSub = function (pid, tab) {
    const s = (A.ui.sub[pid] = A.ui.sub[pid] || {});
    if (!s[tab]) s[tab] = SUBS[tab] ? SUBS[tab][0][0] : null;
    return s[tab];
  };
  A.ui.setSub = function (pid, tab, sub) {
    (A.ui.sub[pid] = A.ui.sub[pid] || {})[tab] = sub;
    A.ui.render();
  };

  /* ---------- Navigation ---------- */
  let skeletonUntil = 0;
  A.ui.goto = function (pid, tab) {
    const changedPersona = A.state.current !== pid;
    A.state.current = pid;
    if (pid !== 'console') {
      const prevTab = A.state.tabs[pid];
      if (tab) A.state.tabs[pid] = tab;
      if (changedPersona || prevTab !== A.state.tabs[pid]) skeletonUntil = performance.now() + 340;
      A.sim.agent.hello(pid);
      /* mark notifications for this tab read */
    }
    A.state.ui.sheet = null;
    A.store.set('persona', pid);
    closeOverlays();
    A.ui.render(true);
    if (skeletonUntil > performance.now()) setTimeout(() => A.ui.render(true), 360);
  };

  A.actions['nav.persona'] = (d) => A.ui.goto(d.pid);
  A.actions['nav.tab'] = (d) => { const p = cur(); if (!p) return; A.ui.goto(p.id, d.tab); };
  A.actions['nav.sub'] = (d) => { const p = cur(); if (!p) return; A.ui.setSub(p.id, d.tab, d.sub); };

  /* ---------- Render scheduling ---------- */
  let queued = false;
  A.ui.render = function (now) {
    if (now === true) { queued = false; draw(); return; }
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { if (queued) { queued = false; draw(); } });
  };

  const scrollMem = {};
  function draw() {
    renderSidebar();
    const shell = document.getElementById('shell');
    const isConsole = A.state.current === 'console';
    shell.classList.toggle('is-console', isConsole);
    document.getElementById('phone').hidden = isConsole;
    document.getElementById('console').hidden = !isConsole;
    if (isConsole) A.ui.renderConsole && A.ui.renderConsole();
    else renderPhone();
    A.ui.renderPanel && A.ui.renderPanel();
    A.ui.renderLayer();
    document.getElementById('stageTitle').textContent = isConsole ? 'Demo console' : cur().name;
  }

  /* Preserve focus + value of inputs across re-renders */
  function captureFocus() {
    const el = document.activeElement;
    if (!el || !el.id || !(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return null;
    return { id: el.id, value: el.value, start: el.selectionStart, end: el.selectionEnd };
  }
  function restoreFocus(f) {
    if (!f) return;
    const el = document.getElementById(f.id);
    if (!el) return;
    el.value = f.value;
    el.focus();
    try { el.setSelectionRange(f.start, f.end); } catch (e) { /* noop */ }
  }

  /* ---------- Sidebar ---------- */
  function renderSidebar() {
    const sb = document.getElementById('sidebar');
    const st = A.state;
    const unread = (pid) => P(pid).notifications.filter((n) => !n.read && !n.silent).length;
    const item = (pid) => {
      const p = P(pid);
      const n = unread(pid);
      return '<button class="sb-item' + (st.current === pid ? ' is-active' : '') + '" data-action="nav.persona" data-pid="' + pid + '" title="' + esc(p.name) + '">' +
        '<span class="sb-ico">' + esc(p.initials) + '</span>' + (n ? '<span class="sb-dot">' + n + '</span>' : '') +
        '<span class="sb-text"><span class="sb-name">' + esc(p.name) + '</span><span class="sb-sub">' + esc(U.pick(p.roleLabel, 'en')) + '</span></span></button>';
    };
    sb.innerHTML =
      '<div class="sb-head"><div class="wordmark"><span class="wm-mark">' + ic('anchor') + '</span><span class="wm-text">anchor</span></div>' +
      '<span class="sb-badge">PRD prototype</span>' +
      '<button class="icon-btn sb-collapse" data-action="shell.collapse" aria-label="Collapse sidebar">' + ic('collapse') + '</button></div>' +
      '<nav class="sb-nav">' +
      '<div class="sb-group-label">Personas</div>' + ['kavita', 'ananya', 'vihaan', 'suresh'].map(item).join('') +
      '<div class="sb-group-label">New user</div>' + item('dev') +
      '<div class="sb-group-label">Operator</div>' +
      '<button class="sb-item' + (st.current === 'console' ? ' is-active' : '') + '" data-action="nav.persona" data-pid="console" title="Demo console">' +
      '<span class="sb-ico">' + ic('monitor') + '</span><span class="sb-text"><span class="sb-name">Demo console</span><span class="sb-sub">Scenarios · ledger · tests</span></span></button>' +
      '</nav>' +
      '<div class="sb-foot"><label class="sb-check"><input type="checkbox" data-change="shell.tags"' + (document.body.classList.contains('show-tags') ? ' checked' : '') + '>' + ic('tag') + '<span>Show PRD tags</span></label>' +
      '<button class="btn-reset" data-action="shell.reset">' + ic('reset') + '<span>Reset demo</span></button>' +
      '<p class="sb-credit" title="Crafted with love by Divyansh Sharma"><span>Crafted with ❤️ by </span><b>Divyansh Sharma</b></p></div>';
  }

  /* ---------- Phone ---------- */
  function statusBar(p) {
    const now = A.clock.now();
    return '<span>' + new Date(now).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: false }) + '</span>' +
      '<span class="ps-right"><svg viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2" width="3" height="10" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1" opacity=".45"/></svg>' +
      '<span>' + (A.state.flags.networkOff ? 'Offline' : '4G') + '</span>' + ic('battery') + '</span>';
  }

  function header(p, tab) {
    const L = p.lang;
    const unread = p.notifications.filter((n) => !n.read && !n.silent).length;
    const st = A.engine.statement.compute(p, A.engine.statement.openMonth(), { asOf: A.clock.now() });
    const killed = A.state.flags.anchorKilled;
    if (p.simple) {
      return '<header class="app-hdr is-simple">' +
        '<div class="hdr-simple-row"><div class="hdr-hello"><span class="hello-small">' + esc(L === 'hi' ? 'नमस्ते' : 'Hello') + '</span><span class="hello-name">' + esc(p.short) + (L === 'hi' ? ' जी' : '') + '</span></div>' +
        '<button class="hdr-pill is-icon" data-action="ui.notifs" aria-label="Notifications">' + ic('bell') + (unread ? '<span class="pill-badge">' + unread + '</span>' : '') + '</button>' +
        '<button class="hdr-pill is-icon" data-action="nav.tab" data-tab="profile" aria-label="' + esc(t('pf.title')) + '">' + ic('user') + '</button></div>' +
        '<button class="ask-bar is-big" data-action="nav.tab" data-tab="agent">' + ic('mic') + '<span>' + esc(L === 'hi' ? 'बोलकर अपने एजेंट से पूछें' : 'Speak to your agent') + '</span></button>' +
        '</header>';
    }
    /* App-switcher tiles (Flipkart): the tile for the current view is yellow */
    const sub = A.ui.getSub(p.id, 'guard');
    const activeTile = tab === 'orbit' ? 'orbit' : (tab === 'guard' && sub === 'rules') ? 'preset' : 'anchor';
    const tileBtn = (k, action, extra, icon, label, inner) => '<button class="tile' + (activeTile === k ? ' is-active' : '') + '" data-action="' + action + '"' + extra + ' aria-current="' + (activeTile === k) + '">' + ic(icon) + '<span>' + esc(label) + '</span>' + (inner || '') + '</button>';
    const tiles =
      '<div class="hdr-tiles">' +
      tileBtn('anchor', 'nav.tab', ' data-tab="agent"', 'anchor', t('tile.anchor')) +
      tileBtn('orbit', 'nav.tab', ' data-tab="orbit"', 'agent', t('tile.agent'), '<i class="tile-dot' + (killed ? ' is-off' : '') + '"></i>') +
      tileBtn('preset', 'ui.gotoRules', '', 'guard', t('dg.preset.' + p.preset)) +
      '</div>';
    const pill =
      '<div class="hdr-row">' +
      '<button class="hdr-loc" data-action="nav.tab" data-tab="profile" title="' + esc(t('pf.title')) + '"><span class="loc-av">' + esc(p.initials) + '</span><span class="loc-text">' + esc(p.name) + ' · ' + esc(killed ? (L === 'hi' ? 'Anchor बंद' : 'Anchor offline') : t('hdr.connected')) + '</span>' + ic('chevDown') + '</button>' +
      '<button class="hdr-pill is-icon" data-action="ui.notifs" aria-label="Notifications">' + ic('bell') + (unread ? '<span class="pill-badge">' + unread + '</span>' : '') + '</button>' +
      '<button class="hdr-pill is-coin" data-action="nav.tab" data-tab="mirror" title="' + esc(t('as.so_far')) + '">' + ic('anchor') + '<span>' + (st.alr == null ? '—' : st.alr + '%') + '</span></button>' +
      '</div>';
    const ask =
      '<div class="hdr-search">' +
      '<button class="ask-bar" data-action="ui.focusAsk">' + ic('search') + '<span>' + esc(t('hdr.ask')) + '</span>' + ic('mic', 'ask-mic') + '</button>' +
      '<button class="scan-btn" data-action="ui.scan" aria-label="Scan family QR">' + ic('scan') + '</button></div>';

    let tabsRow = '';
    if (tab === 'agent') {
      const intents = A.ui.intentsFor(p);
      const sel = (A.ui.activeIntent || {})[p.id] || null;
      const tab = (key, action, icon, label) => '<button class="cat' + (sel === key ? ' is-active' : '') + '" role="tab" aria-selected="' + (sel === key) + '" data-action="' + action + '"' + (key ? ' data-text="' + esc(key) + '"' : '') + '>' + ic(icon) + '<span>' + esc(label) + '</span></button>';
      tabsRow = '<div class="cat-tabs" role="tablist">' + tab(null, 'agent.foryou', 'agent', L === 'hi' ? 'आपके लिए' : 'For you') +
        intents.map((it) => tab(it.key, 'agent.intent', it.icon, it.label)).join('') + '</div>';
    } else if (SUBS[tab]) {
      const active = A.ui.getSub(p.id, tab);
      const waiting = p.cards.filter((c) => c.status === 'waiting' && c.type === 'decision').length;
      tabsRow = '<div class="cat-tabs" role="tablist">' + SUBS[tab].map(([key, icon, label]) =>
        '<button class="cat' + (active === key ? ' is-active' : '') + '" role="tab" aria-selected="' + (active === key) + '" data-action="nav.sub" data-tab="' + tab + '" data-sub="' + key + '">' + ic(icon) +
        '<span>' + esc(subLabel(label)) + (key === 'waiting' && waiting ? ' (' + waiting + ')' : '') + '</span></button>').join('') + '</div>';
    }
    return '<header class="app-hdr">' + tiles + pill + ask + tabsRow + '</header>';
  }

  function nav(p, tab) {
    const waiting = p.cards.filter((c) => c.status === 'waiting' && c.type === 'decision' && c.approver !== 'guardian').length;
    const famBadge = A.state.family.alerts.filter((a) => a.status === 'open' && a.contacts.slice(0, a.idx + 1).some((c) => c.id === p.id)).length +
      Object.values(A.state.personas).reduce((s, m) => s + m.cards.filter((c) => c.status === 'waiting' && c.approver === 'guardian' && m.guardian === p.id).length, 0) +
      A.state.family.levelRequests.filter((r) => r.status === 'open' && r.guardian === p.id).length;
    const badge = { guard: waiting, family: famBadge };
    return '<nav class="app-nav" aria-label="Anchor tabs">' + TABS.map((k) =>
      '<button class="nav-item' + (tab === k ? ' is-active' : '') + '" data-action="nav.tab" data-tab="' + k + '" aria-current="' + (tab === k ? 'page' : 'false') + '">' +
      '<span class="nav-ic">' + ic(TAB_ICON[k]) + (badge[k] ? '<span class="nav-badge">' + badge[k] + '</span>' : '') + '</span>' +
      '<span class="nav-label">' + esc(t('nav.' + k)) + '</span></button>').join('') + '</nav>';
  }

  function renderPhone() {
    const p = cur();
    const tab = A.state.tabs[p.id] || 'agent';
    const phone = document.getElementById('phone');
    phone.classList.toggle('is-simple', !!p.simple);
    phone.setAttribute('lang', p.lang === 'hi' ? 'hi' : 'en');
    document.getElementById('phoneStatus').innerHTML = statusBar(p);
    const app = document.getElementById('phoneApp');
    const oldBody = app.querySelector('.app-body');
    const memKey = p.id + ':' + tab + ':' + (A.ui.getSub(p.id, tab) || '');
    if (oldBody && app.dataset.mem) scrollMem[app.dataset.mem] = oldBody.scrollTop;
    const focus = captureFocus();
    const loading = performance.now() < skeletonUntil;
    let body;
    if (loading) body = A.ui.skeleton(tab);
    else {
      try { body = A.ui.tabs[tab](p); } catch (e) { console.error('[tab]', tab, e); body = '<div class="empty">Something went wrong rendering this tab.</div>'; }
    }
    if (app.dataset.mem && app.dataset.mem.split(':').slice(0, 2).join(':') !== memKey.split(':').slice(0, 2).join(':')) A.ui.hdrCompact = false;
    app.innerHTML = header(p, tab) + '<main class="app-body tab-' + tab + (loading ? ' is-loading' : ' is-ready') + '" id="appBody">' + body + '</main>' + nav(p, tab);
    /* Re-apply the remembered compact state without replaying the collapse animation */
    const activeCat = app.querySelector('.cat-tabs .cat.is-active');
    if (activeCat) { const row = activeCat.parentElement; row.scrollLeft = Math.max(0, activeCat.offsetLeft - (row.clientWidth - activeCat.offsetWidth) / 2); }
    const newHdr = app.querySelector('.app-hdr');
    if (newHdr && A.ui.hdrCompact) { newHdr.classList.add('no-trans', 'is-compact'); requestAnimationFrame(() => newHdr.classList.remove('no-trans')); }
    app.dataset.mem = memKey;
    const nb = app.querySelector('.app-body');
    if (tab === 'agent' && !loading) {
      const stick = A.ui.stickChat !== false;
      nb.scrollTop = stick ? nb.scrollHeight : (scrollMem[memKey] || 0);
      A.ui.stickChat = true;
    } else nb.scrollTop = scrollMem[memKey] || 0;
    nb.addEventListener('scroll', onScroll, { passive: true });
    onScroll.call(nb);
    restoreFocus(focus);
    /* mark cards shown (dwell time starts when visible, FR-DG-19) */
    app.querySelectorAll('[data-card-shown]').forEach((el) => A.engine.anchor.markShown(el.getAttribute('data-card-shown')));
    if (!loading) p.notifications.forEach((n) => { if (n.tab === tab) n.read = true; });
  }
  /* Compact header on scroll, with hysteresis: collapsing the header gives the body ~110 px more room,
     which can remove the overflow that caused it — so only collapse when there is far more content than
     that, and only expand again at the very top. Otherwise the header flips every frame (flicker). */
  A.ui.hdrCompact = false;
  function onScroll() {
    if (!this.parentElement) return; /* body replaced by a re-render */
    const hdr = this.parentElement.querySelector('.app-hdr');
    const room = this.scrollHeight - this.clientHeight;
    if (hdr && !hdr.classList.contains('is-simple')) {
      if (!A.ui.hdrCompact && this.scrollTop > 60 && room > 220) A.ui.hdrCompact = true;
      else if (A.ui.hdrCompact && this.scrollTop <= 2) A.ui.hdrCompact = false;
      hdr.classList.toggle('is-compact', A.ui.hdrCompact);
    }
    if (this.classList.contains('tab-agent')) A.ui.stickChat = this.scrollHeight - this.scrollTop - this.clientHeight < 80;
  }

  /* ---------- Layer: sheets + toasts + captions ---------- */
  A.ui.renderLayer = function () {
    const layer = document.getElementById('phoneLayer');
    if (!layer.querySelector('#phoneSheet')) {
      layer.innerHTML = '<div id="phoneSheet"></div><div class="caption-host" id="phoneCaption"></div><div class="toast-host" id="phoneToast"></div>';
    }
    const host = document.getElementById('phoneSheet');
    const s = A.state.ui.sheet;
    if (!s || A.state.current === 'console') { host.innerHTML = ''; host.className = ''; return; }
    const fn = A.ui.sheets[s.type];
    if (!fn) { host.innerHTML = ''; return; }
    const keepScroll = host.querySelector('.sheet-body');
    const top = keepScroll ? keepScroll.scrollTop : 0;
    const sameType = host.dataset.type === s.type;
    const focus = captureFocus();
    try { host.innerHTML = fn(s.args); } catch (e) { console.error('[sheet]', s.type, e); host.innerHTML = ''; }
    host.dataset.type = s.type;
    host.className = 'is-open' + (sameType ? ' no-anim' : '');
    const nb = host.querySelector('.sheet-body');
    if (nb && sameType) nb.scrollTop = top;
    restoreFocus(focus);
  };

  /* ---------- Header actions ---------- */
  A.actions['ui.lang'] = function () {
    const p = cur();
    p.lang = p.lang === 'hi' ? 'en' : 'hi';
    A.engine.ledger.log(p.id, 'language → ' + p.lang);
    A.ui.render();
  };
  A.actions['ui.gotoRules'] = function () { const p = cur(); A.ui.sub[p.id] = A.ui.sub[p.id] || {}; A.ui.sub[p.id].guard = 'rules'; A.ui.goto(p.id, 'guard'); };
  A.actions['ui.focusAsk'] = function () {
    const p = cur();
    if (A.state.tabs[p.id] !== 'agent') A.ui.goto(p.id, 'agent');
    setTimeout(() => { const el = document.getElementById('chatInput'); if (el) el.focus(); }, 380);
  };
  A.actions['ui.scan'] = function () { const p = cur(); A.ui.goto(p.id, 'family'); setTimeout(() => A.ui.sheetOpen('join', {}), 380); };
  A.actions['ui.notifs'] = function () { A.ui.sheetOpen('notifs', {}); };
  A.actions['ui.settings'] = function () { const p = cur(); A.ui.goto(p.id, 'settings'); };

  A.ui.sheets.notifs = function () {
    const p = cur();
    const L = p.lang;
    const items = p.notifications.filter((n) => !n.silent).slice(0, 30);
    const body = items.length ? '<ul class="notif-list">' + items.map((n) =>
      '<li class="notif is-' + esc(n.tier) + (n.read ? '' : ' is-unread') + '"><button data-action="ui.openNotif" data-id="' + n.id + '">' +
      '<span class="notif-ic">' + ic(n.tier === 'critical' ? 'alert' : n.tier === 'statement' ? 'mirror' : 'bell') + '</span>' +
      '<span class="notif-text"><b>' + esc(U.pick(n.text, L)) + '</b><small>' + esc(U.ago(n.ts, L)) + '</small></span></button></li>').join('') + '</ul>'
      : A.ui.empty('bell', L === 'hi' ? 'कोई सूचना नहीं' : 'No notifications yet');
    const lock = '<div class="lock-sample" data-tag="Demo checklist"><div class="lock-time">' + esc(U.fmtTime(A.clock.now(), L)) + '</div><div class="lock-card">' + ic('anchor') + '<span>' + esc(t('set.lock_sample')) + '</span></div><small>' + esc(t('set.lock_note')) + '</small></div>';
    return A.ui.sheetFrame(L === 'hi' ? 'सूचनाएँ' : 'Notifications', body + lock);
  };
  A.actions['ui.openNotif'] = function (d) {
    const p = cur();
    const n = p.notifications.find((x) => x.id === d.id);
    if (!n) return;
    n.read = true;
    A.state.ui.sheet = null;
    if (n.tab === 'guard') { A.ui.sub[p.id] = A.ui.sub[p.id] || {}; A.ui.sub[p.id].guard = n.tier === 'critical' && !n.cardId ? 'history' : 'waiting'; }
    if (n.tab === 'mirror') { A.ui.sub[p.id] = A.ui.sub[p.id] || {}; A.ui.sub[p.id].mirror = 'statement'; }
    A.ui.goto(p.id, n.tab || 'agent');
  };

  A.ui.sheets.settings = function () {
    const p = cur();
    const L = p.lang;
    const row = (label, desc, control, tag) => '<div class="set-row"' + (tag ? ' data-tag="' + tag + '"' : '') + '><div><b>' + esc(label) + '</b>' + (desc ? '<small>' + esc(desc) + '</small>' : '') + '</div>' + control + '</div>';
    const seg = (name, val, opts) => A.ui.pills(opts, val, 'set.' + name);
    const body =
      '<div class="set-profile"><span class="loc-av is-lg">' + esc(p.initials) + '</span><div><b>' + esc(p.name) + '</b><small>' + esc(U.pick(p.roleLabel, L)) + ' · ' + esc(p.city) + '</small></div></div>' +
      row(t('set.language'), null, seg('lang', p.lang, [['en', 'English'], ['hi', 'हिंदी']]), 'FR-LO-02') +
      row(t('set.simple'), t('set.simple_d'), A.ui.toggle(p.simple, 'set.simple', {}), 'FR-AS-12') +
      row(t('set.voice'), null, A.ui.toggle(p.settings.voice, 'set.voice', {})) +
      row(t('set.tell_blocked'), null, A.ui.toggle(p.settings.tellBlocked, 'set.tellBlocked', {}), 'PRD2 F3') +
      '<div class="set-block"><b>' + esc(t('set.mode')) + '</b>' + A.ui.pills(['protocol', 'device', 'chokepoint'].map((m) => [m, t('set.mode.' + m)]), p.mode, 'set.mode') + '</div>' +
      row(t('set.agent'), 'Orbit · OrbitAI · ' + (L === 'hi' ? 'साझा डेमो कुंजी' : 'shared demo key'), '<span class="ok-dot">' + (A.state.flags.anchorKilled ? '—' : '●') + '</span>') +
      row(t('set.digest_time'), null, '') +
      '<button class="btn btn-ghost btn-block" data-action="ui.log">' + ic('list') + esc(t('set.log')) + '</button>';
    return A.ui.sheetFrame(t('set.title'), body);
  };
  A.actions['set.lang'] = (d) => { cur().lang = d.v; A.ui.render(); };
  A.actions['set.simple'] = () => { const p = cur(); p.simple = !p.simple; A.ui.render(); };
  A.actions['set.voice'] = () => { const p = cur(); p.settings.voice = !p.settings.voice; A.ui.render(); };
  A.actions['set.tellBlocked'] = () => { const p = cur(); p.settings.tellBlocked = !p.settings.tellBlocked; A.ui.render(); };
  A.actions['set.mode'] = (d) => { const p = cur(); p.mode = d.v; A.engine.ledger.log(p.id, 'connection mode → ' + p.mode); A.ui.render(); };
  A.actions['ui.log'] = () => A.ui.sheetOpen('log', {});
  A.ui.sheets.log = function () {
    const p = cur();
    const items = A.state.operator.log.filter((l) => l.pid === p.id).slice(0, 60);
    const views = p.views.map((v) => '<li><b>' + esc(P(v.viewer) ? P(v.viewer).short : v.viewer) + '</b> viewed ' + esc(v.what) + ' · ' + esc(U.ago(v.ts, p.lang)) + '</li>').join('');
    return A.ui.sheetFrame(t('set.log'), (views ? '<h4 class="mini-h">' + esc(t('fc.views_log')) + '</h4><ul class="log-list">' + views + '</ul>' : '') +
      '<ul class="log-list">' + items.map((l) => '<li><time>' + esc(U.fmtDateTime(l.ts, 'en')) + '</time> ' + esc(l.text) + '</li>').join('') + '</ul>');
  };

  /* ---------- Shell actions ---------- */
  function closeOverlays() {
    const s = document.getElementById('shell');
    s.classList.remove('panel-open', 'sb-expanded');
    document.getElementById('shellScrim').classList.remove('is-on');
  }
  A.actions['shell.closeOverlays'] = closeOverlays;
  A.actions['shell.collapse'] = function () {
    const s = document.getElementById('shell');
    if (window.innerWidth >= 1280) { s.classList.toggle('sb-collapsed'); A.store.set('sbCollapsed', s.classList.contains('sb-collapsed')); }
    else { s.classList.toggle('sb-expanded'); document.getElementById('shellScrim').classList.toggle('is-on', s.classList.contains('sb-expanded')); }
    setTimeout(() => A.bus.emit('fit'), 230); /* stage width changed after the sidebar transition */
  };
  A.actions['shell.openSidebar'] = function () {
    document.getElementById('shell').classList.add('sb-expanded');
    document.getElementById('shellScrim').classList.add('is-on');
  };
  A.actions['shell.openPanel'] = function () {
    document.getElementById('shell').classList.add('panel-open');
    document.getElementById('shellScrim').classList.add('is-on');
  };
  A.actions['shell.tags'] = function (d, el) {
    document.body.classList.toggle('show-tags', el.checked);
    A.store.set('tags', el.checked);
  };
  A.actions['shell.reset'] = function () { A.app.reset(); };

  A.ui.shellToast = function (text) {
    const el = document.getElementById('shellToast');
    el.textContent = text;
    el.classList.add('is-on');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('is-on'), 2600);
  };
})();
