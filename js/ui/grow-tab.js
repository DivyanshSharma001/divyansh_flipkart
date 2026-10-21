/* Grow tab — Me-First Mode settings and progress (PRD 4, FR-MF-13). */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;
  const ic = (n, c) => A.ui.icon(n, c);
  const esc = U.esc;
  const t = (k, v) => A.t(k, v);
  const MF = () => A.engine.mefirst;

  function P(id) { return A.state.personas[id]; }
  function cur() { return A.ui.cur(); }

  A.ui.tabs.grow = function (p) {
    MF().resetDaily(p);
    const lang = p.lang;
    const used = p.meFirst.today.count, cap = p.meFirst.cap;
    const unsupported = p.mode !== 'protocol';
    const areas = MF().AREAS.filter((a) => a !== 'school' || p.role === 'minor');
    const hero = '<section class="promo is-sunset" data-tag="FR-MF-13"><div class="promo-head"><h3>' + esc(t('mf.areas_title')) + '</h3>' + ic('grow', 'promo-ic') + '</div>' +
      '<p>' + esc(t('mf.intro')) + '</p>' +
      '<div class="usage">' + A.ui.dots(Math.min(used, cap), cap) + '<span>' + esc(t('mf.today', { n: used, cap })) + '</span></div></section>';
    const capBanner = used >= cap ? '<div class="note-card is-warn" data-tag="FR-MF-07">' + ic('info') + '<span>' + esc(t('mf.cap', { n: cap })) + '. ' + esc(t('mf.cap_hint')) + '</span></div>' : '';
    const unsup = unsupported ? '<div class="note-card is-warn" data-tag="FR-MF-14">' + ic('lock') + '<span>' + esc(t('mf.unsupported')) + '</span></div>' : '';
    const list = '<ul class="area-list">' + areas.map((a) => {
      const locked = a === 'school' && p.role === 'minor' && p.licence && p.licence.school.level < 4;
      const on = MF().areaOn(p, a);
      const rate = MF().rate(p, a);
      const snooze = p.meFirst.snoozed[a] && p.meFirst.snoozed[a] > A.clock.now() ? p.meFirst.snoozed[a] : null;
      const sub = locked ? '<span class="lock-line" data-tag="AC-MF-07">' + ic('lock') + esc(t('mf.set_by', { name: P(p.guardian).short })) + ' · ' + esc(t('mf.set_by_how', { name: P(p.guardian).short })) + '</span>' :
        snooze ? '<span class="lock-line">' + ic('pause') + esc(t('mf.paused_until', { t: U.fmtTime(snooze, lang) })) + '</span>' : '';
      return '<li class="area-item' + (on ? ' is-on' : '') + '"><span class="area-ic">' + ic(A.ui.areaIcon(a)) + '</span>' +
        '<div class="area-body"><b>' + esc(t('area.' + a)) + '</b><small>' + esc(t('mf.area_d.' + a)) + '</small>' + sub +
        (rate != null ? '<div class="hf"><div class="hf-bar"><i style="width:' + rate + '%"></i></div><span>' + esc(t('mf.hf_rate')) + ' ' + rate + '%</span></div>' : '') + '</div>' +
        A.ui.toggle(on, 'grow.toggle', { area: a }, { disabled: locked || unsupported, label: t('area.' + a) }) + '</li>';
    }).join('') + '</ul>';
    const capCtl = '<section class="card-sec" data-tag="FR-MF-07"><div class="set-col"><b>' + esc(t('mf.cap_label')) + '</b><small>' + esc(lang === 'hi' ? '1 से 10 के बीच' : 'Between 1 and 10') + '</small></div>' +
      A.ui.pills(Array.from({ length: 10 }, (_, i) => [i + 1, String(i + 1)]), cap, 'grow.capSet') + '</section>';
    const minor = p.role === 'minor' ? '<section class="card-sec"><div class="set-row"><div><b>' + esc(t('area.school')) + ' · ' + esc(t('fc.level', { n: p.licence.school.level })) + '</b><small>' + esc(t('fc.l.school.' + p.licence.school.level)) + '</small></div>' +
      '<span class="pill-count">' + esc(MF().skipsLeft(p, 'school') === Infinity ? '∞' : t('mf.skips_left', { n: MF().skipsLeft(p, 'school') })) + '</span></div></section>' : '';
    const privacy = '<div class="pad"><p class="muted small">' + ic('lock') + ' ' + esc(lang === 'hi' ? 'आपकी राय सिर्फ़ इस फ़ोन पर रहती है और सिर्फ़ उस काम वाले एजेंट को जाती है — परिवार को कभी नहीं।' : 'Your takes stay on this phone and go only to the agent handling that task — never to family.') + '</p></div>';
    return hero + (capBanner || unsup ? '<div class="pad">' + capBanner + unsup + '</div>' : '') + list + capCtl + minor + privacy;
  };

  A.actions['grow.toggle'] = function (d) {
    const p = cur();
    const a = d.area;
    p.meFirst.areas[a] = p.meFirst.areas[a] || { on: false };
    p.meFirst.areas[a].on = !p.meFirst.areas[a].on;
    if (!p.meFirst.areas[a].on) {
      /* MF-E12: a waiting prompt is released as skipped */
      p.cards.filter((c) => c.type === 'mefirst' && c.status === 'waiting' && c.action.area === a).forEach((c) => A.engine.anchor.mfSkip(c.id, 'not_this'));
    }
    A.engine.ledger.log(p.id, 'me-first ' + a + ' → ' + (p.meFirst.areas[a].on ? 'on' : 'off'));
    A.ui.render();
  };
  A.actions['grow.capSet'] = function (d) { const p = cur(); p.meFirst.cap = U.clamp(parseInt(d.v, 10), 1, 10); A.ui.render(); };
  A.actions['grow.cap'] = function (d) {
    const p = cur();
    p.meFirst.cap = U.clamp(p.meFirst.cap + parseInt(d.d, 10), 1, 10);
    A.ui.render();
  };
})();
