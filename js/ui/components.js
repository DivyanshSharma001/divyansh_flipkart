/* Shared UI components — built only from the user's picks (GUARDRAILS.md §2.3, picks 2026-10-21):
   trust label = Flipkart filled rating pill (4A), panels = Flipkart login modal adapted to the phone (7B),
   confirmations = tinted notice line (9B), fingerprint = step inside the card (10B), on/off = Claude
   On/Off pills (14B), progress = Claude dots (13B), forms = Claude pills + plain field (15B). */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;
  const ic = (n, c) => A.ui.icon(n, c);
  const esc = U.esc;

  A.ui.sheets = A.ui.sheets || {};
  A.ui.sub = A.ui.sub || {};

  function lang() { return A.i18n.langOf(); }
  function t(k, v) { return A.t(k, v); }

  /* ---------- Trust label: Flipkart rating pill, recoloured (pick 4A) ---------- */
  const TRUST_ICON = { green: 'check', yellow: 'rupee', red: 'alert', grey: 'help' };
  function trustText(trust, short) {
    if (!trust) return '';
    if (short) return t('trust.chip.' + trust.color);
    const map = { red_fraud: 'trust.red_fraud', red_undisclosed: 'trust.red_undisclosed', red_skipped: 'trust.red_skipped', yellow: 'trust.yellow', pattern: 'trust.pattern', green: 'trust.green', grey: 'trust.grey', grey_offline: 'trust.grey', grey_unsupported: 'trust.grey_unsupported', grey_nosimilar: 'trust.grey', grey_own: 'trust.grey_own' };
    return t(map[trust.key] || 'trust.' + trust.color);
  }
  A.ui.trustText = trustText;
  A.ui.trustChip = function (trust, opts) {
    if (!trust) return '';
    opts = opts || {};
    const txt = trustText(trust, opts.short);
    const tag = opts.ref ? 'button' : 'span';
    const attrs = opts.ref ? ' data-action="trust.why" data-ref="' + esc(opts.ref) + '" aria-label="' + esc(t('trust.why')) + ': ' + esc(txt) + '"' : '';
    return '<' + tag + ' class="tpill is-' + trust.color + (opts.small ? ' is-small' : '') + '"' + attrs + ' data-tag="FR-TC-02">' +
      ic(TRUST_ICON[trust.color]) + '<span>' + esc(txt) + '</span></' + tag + '>';
  };

  /* Tiers and resolutions use the Flipkart tinted deal tag (2 px radius) */
  A.ui.tierPill = function (tier, sb) {
    return '<span class="dtag tier-' + tier + '">' + esc(t('dg.tier.' + tier)) + (sb ? ' · ' + esc(t('dg.speedbump')) : '') + '</span>';
  };
  const RES_TONE = { authored: 'yours', modified: 'yours', declined: 'yours', approved_considered: 'approved', approved_quick: 'quick', autopilot: 'auto', blocked: 'blocked', expired: 'muted', unchecked: 'muted', skipped: 'muted', pending: 'pending', violation: 'blocked', guardian_declined: 'blocked', guardian_approved: 'approved', contact_declined: 'yours', family: 'muted' };
  A.ui.resPill = function (res) {
    const key = res === 'contact_declined' ? 'res.declined' : res === 'family' ? 'fc.alerts' : 'res.' + res;
    return '<span class="dtag res-' + (RES_TONE[res] || 'muted') + '">' + esc(t(key)) + '</span>';
  };

  A.ui.money = function (n, period) {
    if (n == null) return '';
    return U.inr(n) + (period === 'year' ? (lang() === 'hi' ? '/साल' : '/year') : '');
  };

  /* Product image slot: coloured icon tile (pick 18A) */
  A.ui.productThumb = function (item) {
    if (item && item.img) {
      return '<div class="thumb is-photo"><img src="' + esc(item.img) + '" alt="' + esc(item.name) + '" loading="lazy" onerror="this.parentNode.classList.add(\'is-broken\');this.remove()"></div>';
    }
    const cat = item ? item.category : 'gifts';
    const icon = ({ insurance: 'guard', electronics: 'phone', groceries: 'cart', travel: 'calendar', gifts: 'gift', games: 'play', home: 'home' })[cat] || 'gift';
    return '<div class="thumb is-' + cat + '">' + ic(icon) + '</div>';
  };

  /* ---------- Panels: Flipkart login modal (pick 7B) ----------
     60% black scrim, white ✕ outside the panel, blue Flipkart band with title + line, white body.
     On the phone the blue panel sits on top (Flipkart's mobile login layout). */
  A.ui.sheetOpen = function (type, args) {
    A.state.ui.sheet = { type, args: args || {} };
    A.ui.renderLayer();
  };
  A.ui.sheetClose = function () {
    if (!A.state.ui.sheet) return;
    const s = A.state.ui.sheet;
    A.state.ui.sheet = null;
    if (A.state.ui.auth && A.state.ui.auth.target === 'sheet') A.state.ui.auth = null;
    if (s.args && s.args.onClose) { try { s.args.onClose(); } catch (e) { /* noop */ } }
    A.ui.renderLayer();
  };
  A.actions['sheet.close'] = () => A.ui.sheetClose();

  A.ui.sheetFrame = function (title, body, opts) {
    opts = opts || {};
    if (opts.full) {
      return '<section class="night-screen" role="dialog" aria-modal="true" aria-label="' + esc(title || '') + '">' + body + '</section>';
    }
    /* Device confirmation replaces the panel body in place (pick 10B) */
    const auth = A.state.ui.auth && A.state.ui.auth.target === 'sheet' ? A.ui.authStep(A.state.ui.auth.label) : null;
    return '<div class="modal-scrim" data-action="sheet.close"></div>' +
      '<section class="modal' + (opts.tall && !auth ? ' is-tall' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(title || '') + '">' +
      '<button class="modal-x" data-action="sheet.close" aria-label="' + esc(t('common.close')) + '">' + ic('close') + '</button>' +
      (title ? '<header class="modal-band' + (opts.art ? ' has-art' : '') + '"><div class="band-text"><h2>' + esc(title) + '</h2>' + (opts.sub ? '<p>' + esc(opts.sub) + '</p>' : '') + '</div>' + (opts.art || '') + '</header>' : '') +
      '<div class="modal-body">' + (auth || body) + '</div>' +
      (opts.foot && !auth ? '<footer class="modal-foot">' + opts.foot + '</footer>' : '') +
      '</section>';
  };
  /* Back-compat: older call sites pass {cls:'is-tall'} */
  const frame = A.ui.sheetFrame;
  A.ui.sheetFrame = function (title, body, opts) {
    opts = opts || {};
    if (opts.cls && opts.cls.indexOf('is-tall') >= 0) opts.tall = true;
    if (opts.cls && opts.cls.indexOf('is-full') >= 0) opts.full = true;
    return frame(title, body, opts);
  };

  /* ---------- Confirmations: tinted notice line at the top (pick 9B) ---------- */
  let toastTimer = null;
  A.ui.toast = function (text, opts) {
    opts = opts || {};
    const host = document.getElementById('phoneToast');
    if (!host) return;
    host.innerHTML = '<div class="notice' + (opts.tone ? ' is-' + opts.tone : '') + '" role="status"><span>' + esc(text) + '</span>' +
      (opts.action ? '<button data-action="' + esc(opts.action) + '"' + (opts.ref ? ' data-ref="' + esc(opts.ref) + '"' : '') + '>' + esc(opts.actionLabel || t('common.undo')) + '</button>' : '') + '</div>';
    host.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => host.classList.remove('is-on'), opts.ms || 3200);
  };
  /* Spoken caption: a quiet line (pick 19A) */
  let capTimer = null;
  A.ui.caption = function (text, lng) {
    const host = document.getElementById('phoneCaption');
    if (!host) return;
    host.innerHTML = '<div class="caption" lang="' + (lng === 'hi' ? 'hi' : 'en') + '">' + ic('volume') + '<span>' + esc(text) + '</span></div>';
    host.classList.add('is-on');
    clearTimeout(capTimer);
    capTimer = setTimeout(() => host.classList.remove('is-on'), Math.min(12000, 2500 + text.length * 55));
  };

  /* ---------- Device confirmation inside the card / panel (pick 10B) ---------- */
  A.ui.authThen = function (fn, label, target) {
    A.state.ui.auth = { fn, label, target: target || (A.state.ui.sheet ? 'sheet' : 'none') };
    if (A.state.ui.auth.target === 'none') { A.state.ui.auth = null; fn(); return; }
    A.ui.render(); A.ui.renderLayer();
  };
  A.ui.authStep = function (label) {
    return '<div class="auth-step" data-tag="FR-DG-07">' +
      '<button class="auth-finger" data-action="auth.ok" aria-label="' + esc(t('dg.auth_touch')) + '">' + ic('finger') + '</button>' +
      '<div class="auth-text"><b>' + esc(t('dg.auth_title')) + '</b><span>' + esc(t('dg.auth_touch')) + '</span>' + (label ? '<small>' + esc(label) + '</small>' : '') + '</div>' +
      '<button class="text-act" data-action="auth.cancel">' + esc(t('common.cancel')) + '</button></div>';
  };
  A.actions['auth.ok'] = function () {
    const a = A.state.ui.auth;
    if (!a) return;
    const btn = document.querySelector('.auth-finger');
    if (btn) btn.classList.add('is-ok');
    setTimeout(() => { A.state.ui.auth = null; a.fn(); A.ui.render(); A.ui.renderLayer(); }, 320);
  };
  A.actions['auth.cancel'] = function () { A.state.ui.auth = null; A.ui.render(); A.ui.renderLayer(); };

  /* ---------- Skeleton-first: static grey blocks, same layout (Flipkart screenshot 1) ---------- */
  A.ui.skeleton = function (kind) {
    const blk = (h, extra) => '<div class="sk" style="height:' + h + 'px;' + (extra || '') + '"></div>';
    const row = (n, h, r) => '<div class="sk-row">' + Array.from({ length: n }, () => blk(h, r ? 'border-radius:' + r + 'px' : '')).join('') + '</div>';
    if (kind === 'agent') return '<div class="sk-wrap">' + blk(56, 'width:72%') + blk(44, 'width:56%;margin-left:auto') + blk(220) + blk(44, 'width:64%') + '</div>';
    if (kind === 'mirror') return '<div class="sk-wrap">' + blk(180) + row(3, 80) + blk(260) + '</div>';
    if (kind === 'family') return '<div class="sk-wrap">' + blk(160) + row(2, 150) + blk(110) + '</div>';
    return '<div class="sk-wrap">' + blk(110) + row(5, 56, 18) + blk(220) + blk(220) + '</div>';
  };

  A.ui.sectionTitle = function (text, right) {
    return '<div class="sec-title"><h3>' + esc(text) + '</h3>' + (right || '') + '</div>';
  };
  /* Empty state: dashed box (reference hub-manager page) */
  A.ui.empty = function (icon, text, cta) {
    return '<div class="empty">' + ic(icon) + '<p>' + esc(text) + '</p>' + (cta || '') + '</div>';
  };

  /* ---------- On / Off pills (pick 14B) — the selected pill carries no action ---------- */
  A.ui.toggle = function (on, action, data, opts) {
    opts = opts || {};
    const ds = Object.keys(data || {}).map((k) => ' data-' + k + '="' + esc(data[k]) + '"').join('');
    const L = lang();
    const btn = (isOn, label) => {
      const active = isOn === !!on;
      return '<button class="seg-pill' + (active ? ' is-on' : '') + '" aria-pressed="' + active + '"' +
        (opts.disabled ? ' disabled aria-disabled="true"' : active ? '' : ' data-action="' + action + '"' + ds) + '>' + esc(label) + '</button>';
    };
    return '<span class="seg-toggle" role="group"' + (opts.label ? ' aria-label="' + esc(opts.label) + '"' : '') + '>' +
      btn(true, t('common.on')) + btn(false, t('common.off')) + '</span>';
  };

  /* ---------- Choice pills for forms (pick 15B) ---------- */
  A.ui.pills = function (items, value, action, extra) {
    const ds = Object.keys(extra || {}).map((k) => ' data-' + k + '="' + esc(extra[k]) + '"').join('');
    return '<div class="pill-group">' + items.map(([v, label]) => '<button class="seg-pill' + (String(v) === String(value) ? ' is-on' : '') + '" aria-pressed="' + (String(v) === String(value)) + '" data-action="' + action + '" data-v="' + esc(v) + '"' + ds + '>' + esc(label) + '</button>').join('') + '</div>';
  };

  /* ---------- Progress dots (pick 13B) ---------- */
  A.ui.dots = function (done, total, current) {
    let out = '<span class="qdots" role="img" aria-label="' + done + ' / ' + total + '">';
    for (let i = 1; i <= total; i++) out += '<i class="' + (i <= done ? 'done' : '') + (current && i === current ? ' on' : '') + '"></i>';
    return out + '</span>';
  };
})();
