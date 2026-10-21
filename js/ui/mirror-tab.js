/* Mirror tab — Agency Statement (PRD 1) + Agent Loyalty Score (PRD 3 FR-TC-12/13). */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;
  const ic = (n, c) => A.ui.icon(n, c);
  const esc = U.esc;
  const t = (k, v) => A.t(k, v);
  const S = () => A.engine.statement;

  function P(id) { return A.state.personas[id]; }
  function cur() { return A.ui.cur(); }
  A.ui.mirrorMonth = {};

  function months(p) {
    const last = S().latestClosed();
    const out = [];
    let k = last;
    const first = U.monthKey(Math.max(p.connectedAt, new Date(2026, 7, 1).getTime()));
    while (k >= first && out.length < 24) { out.push(k); k = U.prevMonthKey(k); }
    return out;
  }

  function isBaseline(p) { return A.clock.now() - p.connectedAt < 7 * U.DAY; }

  A.ui.tabs.mirror = function (p) {
    const sub = A.ui.getSub(p.id, 'mirror');
    if (isBaseline(p)) return baseline(p);
    if (sub === 'how') return how(p);
    if (sub === 'sofar') {
      const key = S().openMonth();
      const st = S().compute(p, key, { asOf: A.clock.now() });
      return statementView(p, st, { sofar: true });
    }
    const list = months(p);
    if (!list.length) return baseline(p);
    const key = A.ui.mirrorMonth[p.id] && list.indexOf(A.ui.mirrorMonth[p.id]) >= 0 ? A.ui.mirrorMonth[p.id] : list[0];
    const st = S().compute(p, key);
    const seenKey = p.id + ':' + key;
    const isNew = key === list[0] && !A.state.statements.seen[seenKey];
    setTimeout(() => { A.state.statements.seen[seenKey] = true; }, 1500);
    const chips = '<div class="month-chips">' + list.map((k) => '<button class="chip-btn' + (k === key ? ' is-active' : '') + '" data-action="mirror.month" data-k="' + k + '">' + esc(U.monthName(k, p.lang)) + '</button>').join('') + '</div>';
    return chips + statementView(p, st, { isNew });
  };
  A.actions['mirror.month'] = (d) => { A.ui.mirrorMonth[cur().id] = d.k; A.ui.render(); };

  function baseline(p) {
    const day = Math.min(7, Math.floor((A.clock.now() - p.connectedAt) / U.DAY) + 1);
    const n = p.ledger.filter((e) => e.meaningful && !e.routine).length;
    const ready = new Date(p.connectedAt + 7 * U.DAY);
    const firstStatement = new Date(ready.getFullYear(), ready.getMonth() + 1, 1).getTime();
    return '<section class="hero-statement is-baseline" data-tag="FR-AS-01">' +
      '<span class="hero-kicker">' + esc(t('as.baseline_days', { d: day })) + '</span>' +
      '<div class="baseline-dots">' + Array.from({ length: 7 }, (_, i) => '<i class="' + (i < day ? 'is-on' : '') + '"></i>').join('') + '</div>' +
      '<h2>' + esc(t('as.baseline_count', { n })) + '</h2>' +
      '<p>' + esc(t('as.baseline', { date: U.fmtDate(firstStatement, p.lang, { day: 'numeric', month: 'long' }) })) + '</p></section>' +
      '<div class="pad"><div class="note-card">' + ic('info') + '<span>' + esc(p.lang === 'hi' ? 'पहले 7 दिनों में हम सिर्फ़ गिनते हैं — कोई प्रतिशत नहीं, कोई तुलना नहीं।' : 'For the first 7 days we only count — no percentage, no comparison.') + '</span></div>' +
      '<button class="btn btn-outline btn-block" disabled aria-disabled="true" data-tag="AS-E17">' + ic('download') + esc(t('as.no_export', { date: U.fmtDate(firstStatement, p.lang) })) + '</button></div>';
  }

  function statementView(p, st, opts) {
    opts = opts || {};
    const lang = p.lang;
    const month = U.monthName(st.key, lang);
    if (p.simple) return simpleView(p, st, opts);
    let hero;
    const kicker = opts.sofar ? t('as.so_far') : t('as.statement', { month });
    if (st.mode === 'none' || st.mode === 'paused') {
      hero = '<section class="hero-statement is-empty"><span class="hero-kicker">' + esc(kicker) + '</span><h2>' +
        esc(st.mode === 'paused' ? (lang === 'hi' ? 'इस महीने Anchor रुका रहा, इसलिए दिखाने को कुछ नहीं।' : 'Anchor was paused this month, so there\'s nothing to show.') : t('as.none')) + '</h2>' +
        '<p>' + esc((lang === 'hi' ? 'रोज़मर्रा के काम: ' : 'Routine events: ') + st.routineCount) + '</p></section>';
      return hero;
    }
    const change = st.change != null ?
      '<span class="ribbon ' + (st.change >= 0 ? 'is-up' : 'is-down') + '" data-tag="FR-AS-05">' + ic(st.change >= 0 ? 'up' : 'down') + esc(st.change === 0 ? t('as.change_same') : t(st.change > 0 ? 'as.change_up' : 'as.change_down', { x: Math.abs(st.change) })) + '</span>' :
      '<span class="ribbon is-muted">' + esc(st.changeReason === 'partial' ? t('as.partial', { date: U.fmtDate(st.partialFrom, lang) }) : t('as.no_compare')) + '</span>';
    const big = st.mode === 'counts' ?
      '<div class="hero-counts" data-tag="FR-AS-06"><b>' + (st.yours + st.considered) + '</b><span>/ ' + st.total + '</span></div><p class="hero-line">' + esc(t('as.too_few')) + '</p>' :
      '<div class="hero-alr" data-tag="FR-AS-04">' + st.alr + '<span>%</span></div><p class="hero-line">' + esc(opts.sofar ? t('as.headline_sofar', { n: st.alr }) : t('as.headline', { n: st.alr })) + '</p>';
    hero = '<section class="hero-statement">' +
      '<div class="hero-top"><span class="hero-kicker">' + esc(kicker) + '</span>' + (opts.isNew ? '<span class="new-badge">' + esc(t('as.new_badge')) + '</span>' : '') +
      '<button class="hero-listen" data-action="mirror.listen" data-tag="FR-AS-11">' + ic('volume') + esc(t('common.listen')) + '</button></div>' +
      big + change + '</section>';

    const groups = '<div class="groups" data-tag="FR-AS-04">' +
      group('yours', t('as.group_yours'), st.yours, 'checkCircle') +
      group('approved', t('as.group_approved'), st.approved, 'check', st.quick ? t('as.quick', { n: st.quick }) : '') +
      group('auto', t('as.group_autopilot'), st.autopilot, 'agent') + '</div>';

    const maxTotal = Math.max.apply(null, st.areas.map((a) => a.total).concat([1]));
    const areas = '<section class="card-sec">' + A.ui.sectionTitle(t('as.areas'), '<small class="muted">' + esc(t('as.tap_area')) + '</small>') +
      '<ul class="area-bars" data-tag="FR-AS-07 · FR-AS-08">' + st.areas.map((a) => {
        const w = (n) => (n / maxTotal * 100).toFixed(1) + '%';
        return '<li><button class="area-row" data-action="mirror.area" data-k="' + st.key + '" data-area="' + a.area + '">' +
          '<span class="area-ic">' + ic(A.ui.areaIcon(a.area)) + '</span><span class="area-name">' + esc(t('area.' + a.area)) + '</span>' +
          '<span class="area-bar"><i class="seg-yours" style="width:' + w(a.yours) + '"></i><i class="seg-approved" style="width:' + w(a.approved) + '"></i><i class="seg-quick" style="width:' + w(a.quick) + '"></i><i class="seg-auto" style="width:' + w(a.autopilot) + '"></i></span>' +
          '<span class="area-n">' + a.total + '</span>' + ic('chevRight', 'area-chev') + '</button></li>';
      }).join('') + '</ul>' +
      '<div class="legend"><span><i class="seg-yours"></i>' + esc(t('as.group_yours')) + '</span><span><i class="seg-approved"></i>' + esc(t('as.group_approved')) + '</span><span><i class="seg-quick"></i>' + esc(lang === 'hi' ? 'झटपट' : 'Quick') + '</span><span><i class="seg-auto"></i>' + esc(t('as.group_autopilot')) + '</span></div></section>';

    const hl = st.highlights.length ? '<section class="card-sec is-flat">' + A.ui.sectionTitle(t('as.highlights')) + '<div class="hl-rail" data-tag="FR-AS-17..20">' + st.highlights.map((h) =>
      '<article class="hl-card is-' + h.tone + '"><span class="hl-kicker">' + ic(h.tone === 'concern' ? 'eye' : 'sparkle') + esc(t(h.tone === 'concern' ? 'hl.concern' : 'hl.positive')) + '</span>' +
      '<p>' + esc(S().highlightText(h, lang)) + '</p>' +
      '<button class="link-btn is-light" data-action="mirror.dismiss" data-type="' + h.type + '">' + esc(t('as.dont_show')) + '</button></article>').join('') + '</div></section>' : '';

    const loy = A.engine.trust.loyalty(p, st.key);
    const loyTotal = Math.max(1, loy.g + loy.y + loy.r);
    const hrow = (cls, glyph, n) => '<div class="h-row"><span class="h-glyph">' + glyph + '</span><span class="h-track"><i class="' + cls + '" style="width:' + (n / loyTotal * 100).toFixed(1) + '%"></i></span><b>' + n + '</b></div>';
    const loyalty = loy.score != null ? '<section class="card-sec loyalty" data-tag="FR-TC-12">' +
      '<div class="loy-head"><span class="score-pill' + (loy.score < 50 ? ' is-low' : '') + '">' + loy.score + '%</span><b>' + esc(t('as.loyalty')) + ' · Orbit</b></div>' +
      '<div class="loy-text"><small>' + esc(t('as.loyalty_d')) + '</small>' +
      '<div class="histo">' + hrow('is-green', '✓', loy.g) + hrow('is-yellow', '₹', loy.y) + hrow('is-red', '!', loy.r) + '</div>' +
      (loy.undisclosed ? '<p class="loy-warn" data-tag="FR-TC-13">' + ic('alert') + esc(t('as.undisclosed', { n: loy.undisclosed })) + '</p>' : '') +
      (loy.violations ? '<p class="loy-warn" data-tag="G8">' + ic('bug') + esc(t('as.violations', { n: loy.violations })) + '</p>' : '') +
      '</div></section>' : '';

    const notes = '<div class="pad meta-notes">' +
      (st.unchecked ? '<div class="note-card">' + ic('wifiOff') + '<span>' + esc(t('as.unchecked', { n: st.unchecked })) + '</span></div>' : '') +
      (st.reclassified ? '<div class="note-card">' + ic('info') + '<span>' + esc(lang === 'hi' ? st.reclassified + ' फ़ैसले दोबारा वर्गीकृत' : st.reclassified + ' decision(s) reclassified this month') + '</span></div>' : '') +
      '<p class="muted small">' + esc(t('as.agents', { list: st.agents.join(', ') })) + '</p>' +
      '<div class="foot-actions"><button class="btn btn-ghost" data-action="nav.sub" data-tab="mirror" data-sub="how">' + ic('help') + esc(t('as.how')) + '</button>' +
      (!opts.sofar ? '<button class="btn btn-ghost" data-action="mirror.csv" data-k="' + st.key + '" data-tag="FR-AS-13">' + ic('download') + 'CSV</button><button class="btn btn-ghost" data-action="mirror.pdf">' + ic('download') + 'PDF</button>' : '') + '</div></div>';

    return hero + groups + areas + hl + loyalty + notes;
  }

  function group(cls, label, n, icon, sub) {
    return '<div class="group is-' + cls + '">' + ic(icon) + '<b>' + n + '</b><span>' + esc(label) + '</span>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
  }

  /* FR-AS-12 Simple mode: one sentence + one highlight */
  function simpleView(p, st, opts) {
    const lang = p.lang;
    const month = U.monthName(st.key, lang);
    const sentence = st.total ? t('as.simple', { a: st.yours + st.considered, b: st.total }) : t('as.none');
    const h = st.highlights[0];
    return '<section class="simple-statement" data-tag="FR-AS-12">' +
      '<span class="hero-kicker">' + esc(opts.sofar ? t('as.so_far') : t('as.statement', { month })) + '</span>' +
      '<h2>' + esc(sentence) + '</h2>' +
      (h ? '<div class="hl-card is-' + h.tone + ' is-simple"><p>' + esc(S().highlightText(h, lang)) + '</p></div>' : '') +
      '<button class="btn btn-primary btn-xl btn-block" data-action="mirror.listen">' + ic('volume') + esc(t('common.listen')) + '</button></section>';
  }

  function how(p) {
    const key = S().latestClosed();
    const st = S().compute(p, key);
    const lang = p.lang;
    const rows = [['as.group_yours', 'authored, modified, declined'], ['as.group_approved', 'approved_considered, approved_quick'], ['as.group_autopilot', 'autopilot']];
    return '<section class="card-sec" data-tag="FR-AS-10"><h3 class="h3">' + esc(t('as.how')) + '</h3><p>' + esc(t('as.how_body')) + '</p>' +
      '<div class="formula">ALR = (' + st.yours + ' + ' + st.considered + ') ÷ ' + st.total + ' = <b>' + (st.alr == null ? '—' : st.alr + '%') + '</b><small>' + esc(U.monthName(key, lang)) + '</small></div>' +
      '<table class="how-table">' + rows.map(([k, v]) => '<tr><th>' + esc(t(k)) + '</th><td>' + esc(v) + '</td></tr>').join('') +
      '<tr><th>' + esc(lang === 'hi' ? 'नहीं गिने' : 'Not counted') + '</th><td>blocked, expired, unchecked, routine</td></tr></table></section>';
  }

  /* ---------- Actions ---------- */
  A.actions['mirror.area'] = (d) => A.ui.openArea(cur().id, d.k, d.area);
  A.ui.openArea = function (pid, key, area) { A.ui.sheetOpen('area', { pid, key, area, filter: 'all' }); };
  A.actions['mirror.dismiss'] = function (d) {
    const p = cur();
    if (p.dismissedHighlights.indexOf(d.type) < 0) p.dismissedHighlights.push(d.type);
    A.ui.toast(p.lang === 'hi' ? 'ठीक है, ऐसे नोट नहीं दिखाएँगे।' : 'OK — we won\'t show this kind of note.');
    A.ui.render();
  };
  A.actions['mirror.listen'] = () => A.ui.speakStatement(cur().id);
  A.ui.speakStatement = function (pid) {
    const p = P(pid);
    const sub = A.ui.getSub(pid, 'mirror');
    const key = sub === 'sofar' ? S().openMonth() : (A.ui.mirrorMonth[pid] || S().latestClosed());
    const st = S().compute(p, key, sub === 'sofar' ? { asOf: A.clock.now() } : null);
    const lang = p.lang;
    let text;
    if (p.simple || st.mode !== 'pct') text = st.total ? A.t('as.simple', { a: st.yours + st.considered, b: st.total }, lang) : A.t('as.none', null, lang);
    else {
      text = A.t('as.headline', { n: st.alr }, lang) + '. ';
      if (st.change != null) text += A.t(st.change >= 0 ? 'as.change_up' : 'as.change_down', { x: Math.abs(st.change) }, lang) + '. ';
    }
    if (st.highlights[0]) text += ' ' + S().highlightText(st.highlights[0], lang);
    A.ui.voice.speak(text, lang);
  };
  A.actions['mirror.csv'] = function (d) {
    const p = cur();
    const blob = new Blob([S().csv(p, d.k)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'anchor-statement-' + p.id + '-' + d.k + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    A.ui.toast(p.lang === 'hi' ? 'CSV डाउनलोड हो गई' : 'CSV downloaded');
  };
  A.actions['mirror.pdf'] = () => window.print();

  /* ---------- Drill-down sheet (FR-AS-08, AS-E16) ---------- */
  A.ui.sheets.area = function (args) {
    const p = P(args.pid);
    const lang = p.lang;
    const st = S().compute(p, args.key);
    const otherMembers = (st.areas.find((a) => a.area === 'other') || {}).members || [];
    const inArea = (e) => args.area === 'other' ? otherMembers.indexOf(e.area) >= 0 : e.area === args.area;
    const rows = A.engine.ledger.inMonth(p.id, args.key).filter((e) => inArea(e) && !e.routine && (A.engine.ledger.COUNTED.indexOf(e.resolution) >= 0))
      .filter((e) => args.filter === 'all' || (args.filter === 'yours' ? A.engine.ledger.YOURS.indexOf(e.resolution) >= 0 : args.filter === 'approved' ? e.resolution.indexOf('approved') === 0 : e.resolution === 'autopilot'))
      .sort((a, b) => b.ts - a.ts);
    const filters = [['all', t('common.all')], ['yours', t('as.group_yours')], ['approved', t('as.group_approved')], ['auto', t('as.group_autopilot')]];
    const body = '<div class="chip-rail">' + filters.map(([k, l]) => '<button class="chip-btn' + (args.filter === k ? ' is-active' : '') + '" data-action="area.filter" data-f="' + k + '">' + esc(l) + '</button>').join('') + '</div>' +
      '<ul class="dec-list">' + rows.map((e) => '<li class="dec' + (e.meaningful ? '' : ' is-muted') + '">' +
        '<button class="dec-main" data-action="area.detail" data-id="' + e.id + '"><span class="dec-date">' + esc(U.fmtDate(e.ts, lang)) + '</span>' +
        '<span class="dec-sum">' + esc(U.pick(e.summary, lang)) + (e.amount ? ' · ' + esc(U.inr(e.amount)) : '') + '</span>' +
        '<span class="dec-meta">' + A.ui.resPill(e.resolution) + '<small>' + esc(e.agent) + '</small>' + (e.label ? A.ui.trustChip({ color: e.label, key: e.labelKey || e.label }, { small: true, short: true }) : '') + '</span></button>' +
        '<div class="dec-acts">' +
        '<button class="link-btn" data-action="area.reclass" data-id="' + e.id + '" data-m="' + (e.meaningful ? '0' : '1') + '" data-tag="FR-AS-08">' + esc(e.meaningful ? t('as.not_meaningful') : t('as.meaningful')) + '</button>' +
        (A.engine.ledger.YOURS.indexOf(e.resolution) < 0 && e.meaningful ? '<button class="link-btn" data-action="area.claim" data-id="' + e.id + '" data-tag="AS-E16">' + esc(t('as.chose_myself')) + '</button>' : '') +
        '</div></li>').join('') + '</ul>' + (rows.length ? '' : A.ui.empty('list', lang === 'hi' ? 'कोई फ़ैसला नहीं' : 'No decisions in this filter'));
    return A.ui.sheetFrame(t('as.decisions_in', { area: t('area.' + args.area), month: U.monthName(args.key, lang) }), body, { cls: 'is-tall' });
  };
  A.actions['area.filter'] = (d) => { A.state.ui.sheet.args.filter = d.f; A.ui.renderLayer(); };
  A.actions['area.reclass'] = (d) => A.ui.reclassify(A.state.ui.sheet ? A.state.ui.sheet.args.pid : cur().id, d.id, d.m === '1');
  A.ui.reclassify = function (pid, id, meaningful) {
    const undo = A.engine.ledger.reclassify(pid, id, meaningful);
    A.ui.undoFn = undo;
    A.ui.toast(meaningful ? (P(pid).lang === 'hi' ? 'अहम माना गया।' : 'Counted as meaningful.') : A.t('as.reclass_toast', null, P(pid).lang), { action: 'ui.undo', ms: 10000 });
    A.ui.render();
    A.ui.renderLayer();
  };
  A.actions['area.claim'] = function (d) {
    const pid = A.state.ui.sheet.args.pid;
    A.ui.undoFn = A.engine.ledger.claim(pid, d.id);
    A.ui.toast(t('as.corrected_toast'), { action: 'ui.undo', ms: 10000 });
    A.ui.render(); A.ui.renderLayer();
  };
  A.actions['ui.undo'] = function () {
    if (A.ui.undoFn) { A.ui.undoFn(); A.ui.undoFn = null; }
    document.getElementById('phoneToast').classList.remove('is-on');
    A.ui.render(); A.ui.renderLayer();
  };
  A.actions['area.detail'] = function (d) {
    const s = A.state.ui.sheet;
    A.ui.sheetOpen('decision', { pid: s ? s.args.pid : cur().id, id: d.id, back: s ? { type: s.type, args: s.args } : null });
  };

  /* Decision detail ("card history") — shared with Guard → History */
  A.ui.sheets.decision = function (args) {
    const p = P(args.pid);
    const e = p.ledger.find((x) => x.id === args.id);
    if (!e) return '';
    const lang = cur().lang;
    const card = e.cardId && A.engine.anchor.findCard(e.cardId);
    const rows = [
      [t('as.proposed'), U.pick(e.summary, lang) + (e.amount ? ' · ' + U.inr(e.amount) : '')],
      [t('dg.to'), e.counterparty ? e.counterparty.name : '—'],
      [t('as.agent'), e.agent],
      [t('as.resolved'), null],
      [lang === 'hi' ? 'समय' : 'When', U.fmtDateTime(e.ts, lang)]
    ];
    const extra = [];
    if (e.dwell != null && (e.resolution || '').indexOf('approved') === 0) extra.push((lang === 'hi' ? 'सोचने का समय: ' : 'Time spent deciding: ') + Math.round(e.dwell) + 's' + (e.detailsOpened ? (lang === 'hi' ? ' · विवरण खोला' : ' · details opened') : ''));
    if (e.chosen) extra.push((lang === 'hi' ? 'चुना: ' : 'Chosen: ') + e.chosen.name + ' · ' + U.inr(e.chosen.price));
    if (e.reasonKey) extra.push(t(e.reasonKey));
    if (e.latencyMs != null) extra.push('Auto-path verdict: ' + e.latencyMs + ' ms');
    const label = e.label ? A.ui.trustChip({ color: e.label, key: e.labelKey || e.label, reasons: e.trust ? e.trust.reasons : [] }, { ref: 'entry:' + e.id }) : '<span class="muted">' + esc(lang === 'hi' ? 'लेबल नहीं (गैर-व्यावसायिक)' : 'No label (not commercial)') + '</span>';
    const body = '<dl class="detail">' + rows.map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + (v == null ? A.ui.resPill(e.resolution) + (e.resolvedBy && e.resolvedBy !== p.id && P(e.resolvedBy) ? ' <small>' + esc(P(e.resolvedBy).short) + '</small>' : '') : esc(v)) + '</dd>').join('') +
      '<dt>' + esc(t('as.label')) + '</dt><dd>' + label + '</dd></dl>' +
      (extra.length ? '<ul class="detail-extra">' + extra.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
      ((e.label === 'yellow' || e.label === 'red' || e.label === 'grey') && !card ? '<button class="btn btn-outline btn-block" data-action="trust.second" data-ref="entry:' + e.id + '" data-tag="FR-TC-04">' + ic('list') + esc(t('trust.second')) + '</button>' : '') +
      (args.back ? '<button class="btn btn-ghost btn-block" data-action="decision.back">' + ic('back') + esc(t('common.back')) + '</button>' : '');
    return A.ui.sheetFrame(t('as.card_history'), body);
  };
  A.actions['decision.back'] = function () {
    const b = A.state.ui.sheet.args.back;
    A.state.ui.sheet = b; A.ui.renderLayer();
  };
})();
