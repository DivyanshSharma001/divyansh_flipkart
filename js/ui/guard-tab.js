/* Guard tab — Decision Guard (PRD 2): Waiting for you, Rules, History. */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;
  const ic = (n, c) => A.ui.icon(n, c);
  const esc = U.esc;
  const t = (k, v) => A.t(k, v);
  const POL = () => A.engine.policy;

  function P(id) { return A.state.personas[id]; }
  function cur() { return A.ui.cur(); }
  A.ui.historyFilter = {};

  A.ui.tabs.guard = function (p) {
    const sub = A.ui.getSub(p.id, 'guard');
    if (sub === 'rules') return rules(p);
    if (sub === 'history') return history(p);
    return waiting(p);
  };

  function waiting(p) {
    const cards = p.cards.filter((c) => c.type === 'decision' && c.status === 'waiting')
      .sort((a, b) => (b.critical - a.critical) || ((b.action.urgency === 'time_sensitive') - (a.action.urgency === 'time_sensitive')) || (b.createdAt - a.createdAt));
    const lang = p.lang;
    const today = new Date(A.clock.now()).toDateString();
    const digest = p.ledger.filter((e) => e.status === 'notified' && new Date(e.ts).toDateString() === today);
    const head = '<section class="promo is-blue"><div class="promo-head"><h3>' + esc(t('dg.waiting')) + '</h3><span class="promo-count">' + cards.length + '</span></div>' +
      '<p>' + esc(lang === 'hi' ? 'कोई बड़ा या वापस न होने वाला काम आपकी मंज़ूरी के बिना नहीं होगा।' : 'Nothing big or irreversible happens without your say.') + '</p>' +
      '<div class="promo-tiles"><span>' + ic('guard') + esc(t('dg.preset.' + p.preset)) + '</span><span>' + ic('list') + p.rules.length + ' ' + esc(t('dg.rules').toLowerCase()) + '</span></div></section>';
    const list = cards.length ? '<div class="card-stack">' + cards.map((c) => A.ui.decisionCard(c, { ctx: 'guard' })).join('') + '</div>' : '<div class="pad">' + A.ui.empty('checkCircle', t('dg.empty_waiting')) + '</div>';
    const dig = '<section class="card-sec" data-tag="FR-DG-16">' + A.ui.sectionTitle(t('dg.digest'), '<small class="muted">' + esc(t('set.digest_time')) + '</small>') +
      '<p class="muted small">' + esc(t('dg.digest_sub')) + '</p>' +
      (digest.length ? '<ul class="hist-list">' + digest.map(histRow).join('') + '</ul>' : '<p class="muted small">' + esc(lang === 'hi' ? 'आज अभी तक कुछ नहीं।' : 'Nothing yet today.') + '</p>') + '</section>';
    return head + list + dig;
  }

  /* ---------- Rules ---------- */
  function rules(p) {
    const lang = p.lang;
    const presets = ['light', 'balanced', 'careful'];
    const tiles = '<div class="preset-tiles" data-tag="DG-01">' + presets.map((k) =>
      '<button class="ptile' + (p.preset === k ? ' is-active' : '') + '" data-action="rules.preset" data-k="' + k + '"' + (p.role === 'minor' ? '' : '') + '>' +
      ic(k === 'light' ? 'sparkle' : k === 'balanced' ? 'guard' : 'lock') + '<span>' + esc(t('dg.preset.' + k)) + '</span></button>').join('') + '</div>';
    const g = p.role === 'minor' ? (p.guardianRules || []) : [];
    const gBlock = g.length ? '<section class="card-sec" data-tag="FR-DG-02">' + A.ui.sectionTitle(lang === 'hi' ? 'अभिभावक की न्यूनतम सीमा' : 'Guardian floor') +
      '<ul class="rule-list">' + g.map((r) => '<li class="rule is-locked">' + A.ui.tierPill(r.tier, r.speedBump) + '<span class="rule-text">' + esc(POL().ruleText(r, lang)) + '</span><span class="rule-lock">' + ic('lock') + esc(t('mf.set_by', { name: P(p.guardian).short })) + '</span></li>').join('') + '</ul></section>' : '';
    const list = '<section class="card-sec" data-tag="FR-DG-14">' + A.ui.sectionTitle(t('dg.rules'), '<button class="link-btn" data-action="rules.reset">' + ic('reset') + esc(t('dg.reset_preset')) + '</button>') +
      '<ul class="rule-list">' + p.rules.map((r) => '<li><button class="rule" data-action="rules.edit" data-id="' + r.id + '">' + A.ui.tierPill(r.tier, r.speedBump) +
        '<span class="rule-text">' + esc(POL().ruleText(r, lang)) + (r.source === 'user' ? ' <em class="mine">' + esc(lang === 'hi' ? 'आपका नियम' : 'Your rule') + '</em>' : '') + '</span>' + ic('chevRight', 'rule-chev') + '</button></li>').join('') + '</ul>' +
      '<button class="btn btn-outline btn-block" data-action="rules.add">' + ic('plus') + esc(t('dg.add_rule')) + '</button></section>';
    const blocked = '<section class="card-sec"><div class="set-row"><div><b>' + esc(t('set.tell_blocked')) + '</b><small>' + esc(lang === 'hi' ? 'वरना ब्लॉक काम सिर्फ़ इतिहास में दिखेंगे।' : 'Otherwise blocked actions only appear in History.') + '</small></div>' + A.ui.toggle(p.settings.tellBlocked, 'set.tellBlocked', {}) + '</div></section>';
    return '<section class="card-sec is-flat">' + A.ui.sectionTitle(t('dg.preset')) + tiles + '<p class="muted small pad-x">' + esc(presetBlurb(p.preset, lang)) + '</p></section>' + gBlock + list + blocked;
  }
  function presetBlurb(k, lang) {
    const en = { light: 'Your agent handles most things; asks for big amounts and new payees.', balanced: 'Asks from ₹5,000, pauses before ₹50,000+, never takes loans. (Default)', careful: 'Tells you about small payments, asks for most things, extra pauses.' };
    const hi = { light: 'एजेंट ज़्यादातर काम करेगा; बड़ी रकम और नए लोगों पर पूछेगा।', balanced: '₹5,000 से पूछेगा, ₹50,000+ पर रुकेगा, कभी लोन नहीं। (डिफ़ॉल्ट)', careful: 'छोटे भुगतान भी बताएगा, ज़्यादातर पूछेगा, ज़्यादा ठहराव।' };
    return (lang === 'hi' ? hi : en)[k];
  }
  A.actions['rules.preset'] = function (d) {
    const p = cur();
    POL().applyPreset(p, d.k);
    A.engine.ledger.log(p.id, 'preset → ' + d.k + ' (applies to new proposals only, DG-E20)');
    A.ui.toast(p.lang === 'hi' ? 'नई सेटिंग नए प्रस्तावों पर लागू होगी।' : 'Applies to new proposals. Waiting cards keep their rules.');
    A.ui.render();
  };
  A.actions['rules.reset'] = function () { const p = cur(); p.rules = POL().presetRules(p.preset); A.ui.toast(p.lang === 'hi' ? 'प्रीसेट पर लौट आए।' : 'Back to the preset.'); A.ui.render(); };
  A.actions['rules.edit'] = (d) => A.ui.sheetOpen('rule', { id: d.id });
  A.actions['rules.add'] = () => A.ui.sheetOpen('addRule', { tier: 'ask', area: 'any', min: 5000 });

  A.ui.sheets.rule = function (args) {
    const p = cur();
    const r = p.rules.find((x) => x.id === args.id);
    if (!r) return '';
    const tier = args.tier || r.tier;
    const sb = args.sb != null ? args.sb : r.speedBump;
    const body = '<p class="rule-scope">' + esc(U.pick(r.scopeText, p.lang)) + '</p>' +
      '<div class="tier-options">' + ['auto', 'notify', 'ask', 'never'].map((k) =>
        '<button class="tier-opt' + (tier === k ? ' is-active' : '') + '" data-action="rule.tier" data-k="' + k + '">' + A.ui.tierPill(k) + '<span>' + esc(t('dg.tier.' + k + '_d')) + '</span></button>').join('') + '</div>' +
      (tier === 'ask' ? '<div class="set-row"><div><b>' + esc(t('dg.speedbump')) + '</b><small>' + esc(t('dg.speedbump_d')) + '</small></div>' + A.ui.toggle(sb, 'rule.sb', {}) + '</div>' : '') +
      (args.error ? '<div class="form-error" role="alert" data-tag="AC-DG-07">' + ic('lock') + esc(args.error) + '</div>' : '') +
      '<button class="btn btn-primary btn-block" data-action="rule.save">' + esc(t('common.save')) + '</button>' +
      (r.source === 'user' ? '<button class="btn btn-ghost btn-block is-danger" data-action="rule.delete">' + ic('trash') + esc(t('dg.delete_rule')) + '</button>' : '');
    return A.ui.sheetFrame(t('dg.edit_rule'), body);
  };
  A.actions['rule.tier'] = (d) => { A.state.ui.sheet.args.tier = d.k; A.state.ui.sheet.args.error = null; A.ui.renderLayer(); };
  A.actions['rule.sb'] = () => { const a = A.state.ui.sheet.args; const r = cur().rules.find((x) => x.id === a.id); a.sb = !(a.sb != null ? a.sb : r.speedBump); A.ui.renderLayer(); };
  A.actions['rule.save'] = function () {
    const p = cur();
    const a = A.state.ui.sheet.args;
    const r = p.rules.find((x) => x.id === a.id);
    const res = POL().setTier(p, a.id, a.tier || r.tier, a.sb != null ? a.sb : r.speedBump);
    if (!res.ok) { a.error = t('dg.guardian_floor', { tier: t('dg.tier.' + res.conflict.tier) }); A.ui.renderLayer(); return; }
    A.engine.ledger.log(p.id, 'rule edited: ' + POL().ruleText(r, 'en'));
    A.ui.sheetClose(); A.ui.render();
  };
  A.actions['rule.delete'] = function () {
    const p = cur();
    const a = A.state.ui.sheet.args;
    p.rules = p.rules.filter((x) => x.id !== a.id);
    A.ui.sheetClose(); A.ui.render();
  };

  A.ui.sheets.addRule = function (args) {
    const p = cur();
    const areas = ['any', 'money', 'shopping', 'health', 'home', 'plans', 'gifts'];
    const body = '<div class="field"><span>' + esc(p.lang === 'hi' ? 'किस हिस्से में' : 'Life area') + '</span>' + A.ui.pills(areas.map((a) => [a, a === 'any' ? (p.lang === 'hi' ? 'कोई भी' : 'Any area') : t('area.' + a)]), args.area, 'ar.area') + '</div>' +
      '<label class="field"><span>' + esc(p.lang === 'hi' ? 'कितनी रकम से ऊपर (₹)' : 'Payments over (₹)') + '</span><input id="arMin" type="number" min="0" step="500" value="' + esc(args.min) + '"></label>' +
      '<label class="field"><span>' + esc(p.lang === 'hi' ? 'कितनी रकम तक (₹, ख़ाली = कोई सीमा नहीं)' : 'Up to (₹, empty = no limit)') + '</span><input id="arMax" type="number" min="0" step="500" value="' + esc(args.max || '') + '"></label>' +
      '<div class="tier-options is-row">' + ['auto', 'notify', 'ask', 'never'].map((k) => '<button class="tier-opt' + (args.tier === k ? ' is-active' : '') + '" data-action="ar.tier" data-k="' + k + '">' + A.ui.tierPill(k) + '</button>').join('') + '</div>' +
      (args.error ? '<div class="form-error" role="alert" data-tag="DG-E5">' + ic('lock') + esc(args.error) + '</div>' : '') +
      '<button class="btn btn-primary btn-block" data-action="ar.save">' + esc(t('dg.add_rule')) + '</button>';
    return A.ui.sheetFrame(t('dg.add_rule'), body);
  };
  function arKeep(a) { a.min = document.getElementById('arMin').value; a.max = document.getElementById('arMax').value; }
  A.actions['ar.area'] = function (d) { const a = A.state.ui.sheet.args; arKeep(a); a.area = d.v; a.error = null; A.ui.renderLayer(); };
  A.actions['ar.tier'] = function (d) {
    const a = A.state.ui.sheet.args;
    arKeep(a);
    a.tier = d.k; a.error = null; A.ui.renderLayer();
  };
  A.actions['ar.save'] = function () {
    const p = cur();
    const a = A.state.ui.sheet.args;
    const area = a.area || 'any';
    const min = parseInt(document.getElementById('arMin').value, 10) || 0;
    const max = parseInt(document.getElementById('arMax').value, 10) || null;
    const res = POL().addRule(p, { area, min, max, tier: a.tier });
    if (!res.ok) { Object.assign(a, { area, min, max, error: t('dg.guardian_floor', { tier: t('dg.tier.' + res.conflict.tier) }) }); A.ui.renderLayer(); return; }
    A.engine.ledger.log(p.id, 'rule added: ' + POL().ruleText(res.rule, 'en'));
    A.ui.sheetClose(); A.ui.render();
  };

  /* ---------- History (FR-DG-15) ---------- */
  function histRow(e) {
    const lang = cur().lang;
    const statusIcon = { allowed: 'checkCircle', notified: 'bell', held: 'clock', declined: 'xCircle', blocked: 'minusCircle', expired: 'clock', unchecked: 'wifiOff' }[e.status] || 'info';
    return '<li><button class="hist" data-action="hist.open" data-id="' + e.id + '">' +
      '<span class="hist-ic is-' + esc(e.status) + '">' + ic(A.ui.areaIcon(e.area)) + '</span>' +
      '<span class="hist-main"><b>' + esc(U.pick(e.summary, lang)) + '</b><small>' + ic(statusIcon) + esc(t('dg.filter.' + (e.status === 'notified' ? 'allowed' : e.status)) || e.status) + ' · ' + esc(U.fmtDateTime(e.ts, lang)) + '</small></span>' +
      '<span class="hist-right">' + (e.amount ? '<b>' + esc(U.inr(e.amount)) + '</b>' : '') + (e.label ? A.ui.trustChip({ color: e.label, key: e.labelKey || e.label }, { small: true, short: true }) : '') + '</span></button></li>';
  }
  function history(p) {
    const f = A.ui.historyFilter[p.id] || 'all';
    const filters = ['all', 'allowed', 'held', 'declined', 'blocked', 'expired', 'unchecked'];
    const rows = A.engine.ledger.history(p.id, f === 'allowed' ? null : f).filter((e) => f !== 'allowed' || e.status === 'allowed' || e.status === 'notified').slice(0, 80);
    return '<div class="chip-rail is-sticky" data-tag="FR-DG-15">' + filters.map((k) => '<button class="chip-btn' + (f === k ? ' is-active' : '') + '" data-action="hist.filter" data-f="' + k + '">' + esc(k === 'all' ? t('common.all') : t('dg.filter.' + k)) + '</button>').join('') + '</div>' +
      (rows.length ? '<ul class="hist-list">' + rows.map(histRow).join('') + '</ul>' : '<div class="pad">' + A.ui.empty('list', p.lang === 'hi' ? 'इस फ़िल्टर में कुछ नहीं' : 'Nothing in this filter') + '</div>');
  }
  A.actions['hist.filter'] = (d) => { A.ui.historyFilter[cur().id] = d.f; A.ui.render(); };
  A.actions['hist.open'] = (d) => A.ui.sheetOpen('decision', { pid: cur().id, id: d.id });
})();
