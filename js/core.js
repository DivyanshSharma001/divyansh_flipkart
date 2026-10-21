/* Core: namespace, utilities, simulated clock, event bus, storage, action delegation.
   Classic script (no modules) so the prototype runs from file:// (GUARDRAILS.md §4). */
(function () {
  'use strict';
  const A = (window.Anchor = window.Anchor || {});
  A.data = A.data || {};
  A.engine = A.engine || {};
  A.sim = A.sim || {};
  A.ui = A.ui || {};
  A.actions = A.actions || {};

  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  const LOCALE = { hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN', or: 'or-IN' };
  const loc = (lang) => LOCALE[lang] || 'en-IN';

  const util = {
    MIN, HOUR, DAY, loc,
    esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    /* Indian digit grouping: 1850000 -> 18,50,000 */
    inr(n) {
      if (n == null || isNaN(n)) return '';
      const neg = n < 0; n = Math.round(Math.abs(n));
      const s = String(n);
      let out = s;
      if (s.length > 3) {
        const last3 = s.slice(-3);
        const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
        out = rest + ',' + last3;
      }
      return (neg ? '-' : '') + '₹' + out;
    },
    /* Amount band for family alerts — never the exact amount (FR-FC-08) */
    band(n) {
      const bands = [0, 1000, 5000, 10000, 25000, 50000, 100000, 500000];
      for (let i = bands.length - 1; i >= 0; i--) {
        if (n >= bands[i]) {
          const hi = bands[i + 1];
          return hi ? util.inr(bands[i]) + '–' + util.inr(hi) : util.inr(bands[i]) + '+';
        }
      }
      return util.inr(n);
    },
    uid(prefix) { return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9); },
    clamp(n, a, b) { return Math.max(a, Math.min(b, n)); },
    pct(a, b) { return b ? Math.round((a / b) * 100) : 0; },
    monthKey(ts) { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); },
    monthStart(key) { const [y, m] = key.split('-').map(Number); return new Date(y, m - 1, 1).getTime(); },
    monthEnd(key) { const [y, m] = key.split('-').map(Number); return new Date(y, m, 1).getTime() - 1; },
    prevMonthKey(key) { const [y, m] = key.split('-').map(Number); const d = new Date(y, m - 2, 1); return util.monthKey(d.getTime()); },
    daysInMonth(key) { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate(); },
    monthName(key, lang) {
      const [y, m] = key.split('-').map(Number);
      return new Date(y, m - 1, 1).toLocaleString(loc(lang), { month: 'long' });
    },
    fmtTime(ts, lang) {
      return new Date(ts).toLocaleTimeString(loc(lang), { hour: 'numeric', minute: '2-digit' });
    },
    fmtDate(ts, lang, opts) {
      return new Date(ts).toLocaleDateString(loc(lang), opts || { day: 'numeric', month: 'short' });
    },
    fmtDateTime(ts, lang) { return util.fmtDate(ts, lang) + ', ' + util.fmtTime(ts, lang); },
    ago(ts, lang) {
      const d = A.clock.now() - ts;
      const hi = lang === 'hi';
      if (d < MIN) return hi ? 'अभी' : 'just now';
      if (d < HOUR) { const m = Math.round(d / MIN); return hi ? m + ' मिनट पहले' : m + ' min ago'; }
      if (d < DAY) { const h = Math.round(d / HOUR); return hi ? h + ' घंटे पहले' : h + (h === 1 ? ' hour ago' : ' hours ago'); }
      const dd = Math.round(d / DAY); return hi ? dd + ' दिन पहले' : dd + (dd === 1 ? ' day ago' : ' days ago');
    },
    /* Deterministic PRNG for seed data */
    rng(seed) {
      let s = seed >>> 0;
      return function () { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    },
    deepClone(o) { return JSON.parse(JSON.stringify(o)); },
    fill(str, vars) { return String(str).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m)); },
    pick(obj, lang) { if (obj == null) return ''; if (typeof obj === 'string') return obj; return obj[lang] || obj.en || ''; }
  };
  A.util = util;

  /* ---- Simulated clock: runs in real time from a settable base (demo "clock skip") ---- */
  A.clock = {
    base: new Date(2026, 9, 28, 18, 30).getTime(), /* 28 Oct 2026, 6:30 pm home time */
    realBase: Date.now(),
    now() { return this.base + (Date.now() - this.realBase); },
    set(ts) { this.base = ts; this.realBase = Date.now(); A.bus.emit('clock'); },
    advance(ms) { this.set(this.now() + ms); }
  };

  /* ---- Event bus ---- */
  const handlers = {};
  A.bus = {
    on(evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); },
    emit(evt, payload) { (handlers[evt] || []).forEach((fn) => { try { fn(payload); } catch (e) { console.error('[bus]', evt, e); } }); }
  };

  /* ---- Per-viewer conveniences only (GUARDRAILS.md §4) ---- */
  A.store = {
    get(k, d) { try { const v = localStorage.getItem('anchor.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('anchor.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };

  /* ---- Action delegation: data-action="ns.fn" with data-* args ---- */
  function dispatch(el, evt) {
    const name = el.getAttribute('data-action');
    const fn = A.actions[name];
    if (!fn) { console.warn('[action] missing', name); return; }
    try { fn(el.dataset, el, evt); } catch (e) { console.error('[action]', name, e); }
  }
  document.addEventListener('click', (evt) => {
    const el = evt.target.closest('[data-action]');
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
    if (el.tagName === 'A' && el.getAttribute('href') && el.getAttribute('href').startsWith('tel:')) { dispatch(el, evt); return; }
    evt.preventDefault();
    dispatch(el, evt);
  });
  document.addEventListener('change', (evt) => {
    const el = evt.target.closest('[data-change]');
    if (!el) return;
    const fn = A.actions[el.getAttribute('data-change')];
    if (fn) { try { fn(el.dataset, el, evt); } catch (e) { console.error('[change]', e); } }
  });
  document.addEventListener('keydown', (evt) => {
    if (evt.key === 'Enter') {
      const el = evt.target.closest('[data-enter]');
      if (el) { evt.preventDefault(); const fn = A.actions[el.getAttribute('data-enter')]; if (fn) fn(el.dataset, el, evt); }
    }
    if (evt.key === 'Escape') { A.actions['sheet.close'] && A.actions['sheet.close']({}); A.actions['shell.closeOverlays'] && A.actions['shell.closeOverlays']({}); }
  });
})();
