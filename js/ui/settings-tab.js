/* Settings (bottom-nav tab), Profile (from the name pill) and Orbit (from the Orbit tile).
   Built from the picked vocabulary: white sections, Claude pills (15B), On/Off pills (14B),
   banner (offers gradient), group tiles, rating pill + breakdown (12B), product-page buttons (1A). */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;
  const ic = (n, c) => A.ui.icon(n, c);
  const esc = U.esc;
  const t = (k, v) => A.t(k, v);

  function P(id) { return A.state.personas[id]; }
  function cur() { return A.ui.cur(); }
  A.ui.langStatus = {}; /* lang → { done, total } while translating, or 'failed' */

  const row = (label, desc, control, tag) => '<div class="set-row"' + (tag ? ' data-tag="' + tag + '"' : '') + '><div><b>' + esc(label) + '</b>' + (desc ? '<small>' + esc(desc) + '</small>' : '') + '</div>' + (control || '') + '</div>';
  const linkRow = (icon, label, sub, action, data) => '<button class="pf-row" data-action="' + action + '"' + Object.keys(data || {}).map((k) => ' data-' + k + '="' + esc(data[k]) + '"').join('') + '>' +
    '<span class="pf-ic">' + ic(icon) + '</span><span class="pf-text"><b>' + esc(label) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' + ic('chevRight', 'pf-chev') + '</button>';

  /* ---------------- Settings ---------------- */
  A.ui.tabs.settings = function (p) {
    const L = A.ai.LANGS;
    const langName = (L[p.lang] || L.en).name;
    const st = A.ui.langStatus[p.lang];
    let langLine = '';
    if (st && st.total) langLine = '<div class="note-card">' + ic('globe') + '<span>' + esc(t('set.lang_translating', { lang: langName, done: st.done, total: st.total })) + '</span></div>';
    else if (st === 'failed') langLine = '<div class="note-card is-warn">' + ic('info') + '<span>' + esc(t('set.lang_failed', { lang: langName })) + '</span></div>';
    else if (p.lang !== 'en' && p.lang !== 'hi' && !A.ai.loadCached(p.lang)) langLine = '<div class="note-card is-warn">' + ic('info') + '<span>' + esc(t('set.lang_pending', { lang: langName })) + '</span></div>';

    const aiState = A.ai.lastError ? t('set.ai_err', { err: A.ai.lastError }) : A.ai.lastModel ? t('set.ai_on', { model: A.ai.lastModel }) : A.ai.available() ? t('set.ai_ready') : t('set.ai_off');
    const lockSample = '<div class="lock-sample"><div class="lock-time">' + esc(U.fmtTime(A.clock.now(), p.lang)) + '</div><div class="lock-card">' + ic('anchor') + '<span>' + esc(t('set.lock_sample')) + '</span></div><small>' + esc(t('set.lock_note')) + '</small></div>';

    return '<section class="card-sec" data-tag="FR-LO-02">' + A.ui.sectionTitle(t('set.language')) +
      A.ui.pills(Object.keys(L).map((k) => [k, L[k].native]), p.lang, 'set.lang') +
      '<p class="muted small">' + esc(t('set.lang_note')) + '</p>' + langLine + '</section>' +

      '<section class="card-sec">' + A.ui.sectionTitle(t('set.sec.app')) +
      row(t('set.simple'), t('set.simple_d'), A.ui.toggle(p.simple, 'set.simple', {}), 'FR-AS-12') +
      row(t('set.voice'), null, A.ui.toggle(p.settings.voice, 'set.voice', {})) +
      row(t('set.tell_blocked'), null, A.ui.toggle(p.settings.tellBlocked, 'set.tellBlocked', {})) +
      row(t('set.digest_time'), null, '') +
      '<div class="set-block"><b>' + esc(t('set.mode')) + '</b>' + A.ui.pills(['protocol', 'device', 'chokepoint'].map((m) => [m, t('set.mode.' + m)]), p.mode, 'set.mode') + '</div></section>' +

      '<section class="card-sec">' + A.ui.sectionTitle(t('set.sec.ai')) +
      '<div class="ai-status' + (A.ai.lastError ? ' is-err' : A.ai.lastModel ? ' is-on' : '') + '">' + ic('agent') + '<span>' + esc(aiState) + '</span></div>' +
      '<form class="field" onsubmit="return false"><label for="aiKeyInput">' + esc(t('set.ai_key')) + '</label><input id="aiKeyInput" type="password" autocomplete="off" data-enter="ai.saveKey" placeholder="' + esc(A.ai.keySource() === 'device' ? '••••••••' : 'AIza… / AQ.…') + '"></form>' +
      '<p class="muted small">' + esc(t('set.ai_key_note')) + '</p>' +
      '<div class="btn-pair"><button class="btn-out" data-action="ai.saveKey">' + esc(t('common.save')) + '</button><button class="btn-buy" data-action="ai.test"><span class="btn-buy-main">' + esc(t('set.ai_test')) + '</span></button></div></section>' +

      '<section class="card-sec">' + A.ui.sectionTitle(t('set.sec.about')) + lockSample +
      '<button class="text-act" data-action="ui.log">' + ic('list') + esc(t('set.log')) + '</button>' +
      '<p class="muted small">' + esc(t('set.credits')) + '</p>' +
      '<p class="muted small">' + esc(t('set.made_by')) + '</p></section>';
  };

  A.actions['set.lang'] = function (d) {
    const p = cur();
    const lang = d.v;
    p.lang = lang;
    A.engine.ledger.log(p.id, 'language → ' + lang);
    A.ui.render();
    if (lang === 'en' || lang === 'hi' || (A.ai.loadCached(lang) && !A.ai.isPartial(lang))) return;
    const name = A.ai.LANGS[lang].name;
    if (!A.ai.available()) { A.ui.langStatus[lang] = 'failed'; A.ui.render(); return; }
    A.ui.langStatus[lang] = { done: 0, total: Object.keys(A.i18n.STR).length };
    A.ui.render();
    A.ai.translateUI(lang, (done, total) => { A.ui.langStatus[lang] = { done, total }; A.ui.render(); })
      .then((r) => {
        delete A.ui.langStatus[lang];
        A.ui.toast(r === 'partial' ? A.t('set.lang_partial', { lang: name }, lang) : A.t('set.lang_ready', { lang: name }, lang), { tone: r === 'partial' ? null : 'ok', ms: 5000 });
        A.ui.render();
      })
      .catch(() => { A.ui.langStatus[lang] = 'failed'; A.ui.render(); });
  };
  A.actions['ai.saveKey'] = function () {
    const el = document.getElementById('aiKeyInput');
    const v = el ? el.value.trim() : '';
    A.store.set('geminiKey', v);
    A.ai.lastModel = null; A.ai.lastError = null;
    if (el) el.value = '';
    A.ui.toast(v ? (cur().lang === 'hi' ? 'कुंजी इस डिवाइस पर सेव हुई।' : 'Key saved on this device.') : (cur().lang === 'hi' ? 'डेमो कुंजी इस्तेमाल होगी।' : 'Using the built-in demo key.'), { tone: 'ok' });
    A.ui.render();
  };
  A.actions['ai.test'] = function () {
    A.ai.generate('Reply with the single word: ok', { temperature: 0, timeout: 15000 })
      .then(() => { A.ui.toast(t('set.ai_test_ok', { model: A.ai.lastModel }), { tone: 'ok' }); A.ui.render(); })
      .catch((e) => { A.ui.toast(t('set.ai_test_bad', { err: A.ai.lastError || e.message }), { tone: 'critical', ms: 5000 }); A.ui.render(); });
  };

  /* ---------------- Profile (from the name pill) ---------------- */
  A.ui.tabs.profile = function (p) {
    const st = A.engine.statement.compute(p, A.engine.statement.openMonth(), { asOf: A.clock.now() });
    const waiting = p.cards.filter((c) => c.status === 'waiting' && c.type === 'decision').length;
    const asMember = A.engine.family.linksAsMember(p.id), asContact = A.engine.family.linksAsContact(p.id);
    const famRows = asMember.map((l) => linkRow('family', A.engine.family.contactName(l), t('fc.role.trusted') + (l.paused ? ' · ' + t('fc.paused') : ''), 'nav.tab', { tab: 'family' }))
      .concat(asContact.map((l) => linkRow(l.kind === 'guardian' ? 'school' : 'user', A.engine.family.memberLabel(l.member, p.lang), l.kind === 'guardian' ? t('fc.role.guardian') : t('fc.role.trusted'), 'nav.tab', { tab: 'family' })));
    return '<section class="hero-statement pf-hero"><div class="pf-top"><span class="loc-av is-xl">' + esc(p.initials) + '</span><div><h2>' + esc(p.name) + '</h2><p>' + esc(U.pick(p.roleLabel, p.lang)) + ' · ' + esc(p.city) + '</p></div></div></section>' +
      '<div class="groups">' +
      '<div class="group">' + ic('mirror') + '<b>' + (st.alr == null ? '—' : st.alr + '%') + '</b><span>' + esc(t('pf.this_month')) + '</span></div>' +
      '<div class="group">' + ic('guard') + '<b>' + waiting + '</b><span>' + esc(t('pf.waiting')) + '</span></div>' +
      '<div class="group">' + ic('family') + '<b>' + (asMember.length + asContact.length) + '</b><span>' + esc(t('pf.links')) + '</span></div></div>' +
      '<section class="card-sec">' + row(t('pf.phone'), null, '<span class="mono">' + esc(p.phone) + '</span>') +
      '<p class="muted small">' + esc(t('pf.since', { date: U.fmtDate(p.connectedAt, p.lang, { day: 'numeric', month: 'long', year: 'numeric' }) })) + '</p></section>' +
      '<section class="card-sec">' + A.ui.sectionTitle(t('pf.agent')) + linkRow('agent', 'Orbit · OrbitAI', A.state.flags.anchorKilled ? t('ob.status_off') : t('ob.status_on'), 'nav.tab', { tab: 'orbit' }) + '</section>' +
      (famRows.length ? '<section class="card-sec">' + A.ui.sectionTitle(t('pf.family')) + famRows.join('') + '</section>' : '') +
      '<section class="card-sec">' + linkRow('settings', t('pf.open_settings'), t('set.language') + ' · ' + t('set.simple') + ' · ' + t('set.sec.ai'), 'nav.tab', { tab: 'settings' }) +
      linkRow('list', t('set.log'), null, 'ui.log') + '</section>';
  };

  /* ---------------- Orbit (from the Orbit tile) ---------------- */
  A.ui.tabs.orbit = function (p) {
    const key = A.engine.statement.openMonth();
    const list = A.engine.ledger.inMonth(p.id, key);
    const checked = list.filter((e) => e.resolution !== 'unchecked' && e.resolution !== 'family').length;
    const held = list.filter((e) => e.status === 'held').length;
    const blocked = list.filter((e) => e.status === 'blocked').length;
    const loy = A.engine.trust.loyalty(p, key);
    const killed = A.state.flags.anchorKilled;
    const total = Math.max(1, loy.g + loy.y + loy.r);
    const hrow = (cls, glyph, n) => '<div class="h-row"><span class="h-glyph">' + glyph + '</span><span class="h-track"><i class="' + cls + '" style="width:' + (n / total * 100).toFixed(1) + '%"></i></span><b>' + n + '</b></div>';
    return '<section class="hero-statement ob-hero"><div class="pf-top"><span class="anchor-mark is-xl">' + ic('agent') + '</span><div><h2>' + esc(t('ob.title')) + '</h2><p>' + esc(t('ob.provider')) + '</p></div></div>' +
      '<span class="ribbon' + (killed ? ' is-down' : '') + '">' + ic(killed ? 'alert' : 'checkCircle') + esc(killed ? t('ob.status_off') : t('ob.status_on')) + '</span></section>' +
      '<section class="card-sec">' + A.ui.sectionTitle(t('ob.month')) +
      '<div class="groups is-4">' +
      '<div class="group"><b>' + checked + '</b><span>' + esc(t('ob.checked')) + '</span></div>' +
      '<div class="group"><b>' + held + '</b><span>' + esc(t('ob.held')) + '</span></div>' +
      '<div class="group"><b>' + blocked + '</b><span>' + esc(t('ob.blocked')) + '</span></div>' +
      '<div class="group"><b>' + loy.violations + '</b><span>' + esc(t('ob.violations')) + '</span></div></div></section>' +
      (loy.score != null ? '<section class="card-sec loyalty"><div class="loy-head"><span class="score-pill' + (loy.score < 50 ? ' is-low' : '') + '">' + loy.score + '%</span><b>' + esc(t('as.loyalty')) + '</b></div>' +
        '<div class="histo">' + hrow('is-green', '✓', loy.g) + hrow('is-yellow', '₹', loy.y) + hrow('is-red', '!', loy.r) + '</div></section>' : '') +
      '<section class="card-sec">' + row(t('set.mode'), null, '<span class="pill-count">' + esc(t('set.mode.' + p.mode)) + '</span>') +
      row(t('ob.brain'), null, '<span class="pill-count">' + esc(A.ai.available() ? t('ob.brain_on', { model: A.ai.lastModel || 'flash' }) : t('ob.brain_off')) + '</span>') +
      '<button class="btn-buy is-block" data-action="nav.tab" data-tab="agent"><span class="btn-buy-main">' + esc(t('ob.chat')) + '</span></button></section>';
  };
})();
