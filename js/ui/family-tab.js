/* Family tab — Family Circle (PRD 5). Role-dependent: trusted contact / guardian (Meera),
   protected elder (Rajan), learner (Vihan), unlinked adults. Transparency, not surveillance:
   whatever a contact sees, the member sees too. */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;
  const ic = (n, c) => A.ui.icon(n, c);
  const esc = U.esc;
  const t = (k, v) => A.t(k, v);
  const F = () => A.engine.family;

  function P(id) { return A.state.personas[id]; }
  function cur() { return A.ui.cur(); }
  function label(pid) { return F().memberLabel(pid, cur().lang); }

  A.ui.tabs.family = function (p) {
    const asMember = F().linksAsMember(p.id);
    const asContact = F().linksAsContact(p.id);
    let html = '';
    if (asContact.length) html += contactView(p, asContact);
    if (p.role === 'minor') html += minorView(p, asMember);
    else if (asMember.length) html += memberView(p, asMember);
    if (!asContact.length && !asMember.length) html += emptyView(p);
    html += '<div class="pad fam-actions"><button class="btn btn-outline" data-action="fam.add">' + ic('userPlus') + esc(t('fc.add')) + '</button>' +
      '<button class="btn btn-outline" data-action="fam.join">' + ic('qr') + esc(t('fc.join')) + '</button></div>' +
      '<div class="pad"><p class="muted small">' + ic('lock') + ' ' + esc(t('fc.never_see')) + '</p><p class="muted small">' + esc(t('fc.no_alerts')) + '</p></div>';
    return html;
  };

  /* ---------------- Contact / guardian view (Meera) ---------------- */
  function contactView(p, links) {
    const lang = p.lang;
    const alerts = A.state.family.alerts.filter((a) => a.contacts.slice(0, a.idx + 1).some((c) => c.id === p.id));
    const open = alerts.filter((a) => a.status === 'open');
    const recent = alerts.filter((a) => a.status !== 'open').slice(0, 2);
    let html = '';
    if (open.length || recent.length) {
      html += '<section class="card-sec is-flat">' + A.ui.sectionTitle(t('fc.alerts')) + open.map((a) => alertCard(p, a)).join('') +
        recent.map((a) => '<div class="alert-done">' + ic('checkCircle') + '<span><b>' + esc(t('fc.alert_title', { member: label(a.member) })) + '</b><small>' + esc(t('fc.resolved')) + ' · ' + A.ui.resPill(a.outcome === 'contact_declined' ? 'declined' : a.outcome) + ' · ' + esc(a.resolvedBy && P(a.resolvedBy) ? P(a.resolvedBy).short : '') + '</small></span></div>').join('') + '</section>';
    }
    /* Guardian approvals (Learner's Licence holds) */
    const held = [];
    links.filter((l) => l.kind === 'guardian').forEach((l) => P(l.member).cards.filter((c) => c.status === 'waiting' && c.approver === 'guardian').forEach((c) => held.push(c)));
    if (held.length) html += '<section class="card-sec is-flat" data-tag="AC-FC-06">' + A.ui.sectionTitle(t('fc.held_for_you')) + held.map((c) => '<div class="held-from">' + esc(P(c.pid).short) + ' · ' + esc(t('fc.licence')) + '</div>' + A.ui.decisionCard(c, { ctx: 'family' })).join('') + '</section>';
    const reqs = A.state.family.levelRequests.filter((r) => r.guardian === p.id && r.status === 'open');
    if (reqs.length) html += '<section class="card-sec" data-tag="FR-FC-15">' + reqs.map((r) => {
      const m = P(r.member);
      const l = m.licence[r.area];
      return '<div class="level-req"><b>' + esc(t('fc.level_request', { name: m.short, area: t('area.' + r.area), n: r.to })) + '</b>' +
        '<small>' + esc(lang === 'hi' ? 'प्रगति: ' : 'Progress: ') + l.weeks + (lang === 'hi' ? ' हफ़्ते · ' : ' weeks · ') + l.decisions + (lang === 'hi' ? ' सोचे-समझे फ़ैसले' : ' considered decisions') + '</small>' +
        '<p class="muted small">' + esc(t('fc.l.' + r.area + '.' + r.to)) + '</p>' +
        '<div class="pick-row"><button class="btn btn-primary btn-sm" data-action="fam.levelApprove" data-id="' + r.id + '">' + esc(t('fc.approve_level', { n: r.to })) + '</button><button class="btn btn-outline btn-sm" data-action="fam.levelDecline" data-id="' + r.id + '">' + esc(lang === 'hi' ? 'अभी नहीं' : 'Not now') + '</button></div></div>';
    }).join('') + '</section>';

    html += '<section class="card-sec is-flat">' + A.ui.sectionTitle(t('fc.members')) + '<div class="member-rail">' + links.map((l) => memberCard(p, l)).join('') + '</div></section>';
    return html;
  }

  function alertCard(p, a) {
    const lang = p.lang;
    const card = A.engine.anchor.findCard(a.cardId);
    const m = P(a.member);
    const next = a.contacts[a.idx + 1];
    const mins = Math.max(0, Math.ceil((a.contacts[a.idx].alertedAt + a.escalateAfter - A.clock.now()) / U.MIN));
    const escalated = a.idx > 0 && a.contacts[0].id === p.id;
    const co = card && card.co && card.co.contact === p.id;
    const why = { fraud: lang === 'hi' ? 'प्राप्तकर्ता धोखाधड़ी सूची में है' : 'Payee is on a fraud list', scam_signals: lang === 'hi' ? 'धमकी और गोपनीयता के संकेत' : 'Account-block threats and secrecy', new_payee: lang === 'hi' ? 'नया प्राप्तकर्ता, बड़ी रकम' : 'New payee, large amount' }[a.why] || '';
    return '<article class="alert-card" data-tag="FR-FC-08">' +
      '<div class="alert-top"><span class="live-pill">● ' + esc(t('fc.' + (a.tier === 'critical' ? 'critical' : 'decision'))) + '</span><span class="enc">' + ic('lock') + esc(t('fc.encrypted')) + '</span></div>' +
      '<h4>' + esc(t('fc.alert_title', { member: label(a.member) })) + '</h4>' +
      '<p>' + esc(a.why === 'fraud' ? t('fc.alert_body', { member: label(a.member), band: a.band }) : (lang === 'hi' ? label(a.member) + ' के एजेंट ने ' + a.band + ' भेजने की कोशिश की।' : label(a.member) + '\'s agent tried to send ' + a.band + '.')) + '</p>' +
      '<ul class="alert-facts"><li>' + ic('rupee') + esc(a.band) + '</li><li>' + ic('user') + esc(a.counterpartyType === 'new' ? t('dg.new_payee') : t('dg.known_payee')) + '</li><li>' + ic('alert') + esc(why) + '</li></ul>' +
      (escalated ? '<p class="alert-esc">' + ic('family') + esc(t('fc.also_sent', { name: a.contacts[a.idx].name })) + '</p>' :
        next && !a.actedBy ? '<p class="alert-esc" data-tag="FR-FC-07">' + ic('clock') + esc(t('fc.escalate_in', { name: next.name, m: mins })) + '</p>' : '') +
      '<div class="alert-actions">' +
      '<a class="btn btn-yellow" href="tel:' + esc(m.phone) + '" data-action="fam.call" data-id="' + a.id + '" data-tag="FR-FC-12 · AC-FC-03">' + ic('phone') + esc(t('fc.call', { member: label(a.member) })) + '</a>' +
      '<button class="btn btn-light" data-action="fam.review" data-card="' + a.cardId + '">' + ic('eye') + esc(t('fc.review')) + '</button>' +
      (co ? '<button class="btn btn-light" data-action="card.decline" data-id="' + a.cardId + '" data-by="' + p.id + '">' + esc(t('dg.decline')) + '</button>' : '') +
      '</div><small class="alert-note">' + esc(lang === 'hi' ? 'संदेशों की सामग्री कभी नहीं दिखाई जाती।' : 'Message content is never shown.') + '</small></article>';
  }

  function memberCard(p, l) {
    const lang = p.lang;
    const m = P(l.member);
    const role = l.kind === 'guardian' ? t('fc.role.guardian') : t('fc.role.trusted');
    if (l.paused) {
      return '<article class="member-card is-paused"><div class="mc-top"><span class="loc-av">' + esc(m.initials) + '</span><div><b>' + esc(label(l.member)) + '</b><small>' + esc(role) + '</small></div></div>' +
        '<p class="paused-line" data-tag="FR-FC-06">' + ic('pause') + esc(t('fc.paused')) + '</p></article>';
    }
    const items = F().sees(l).map((k) => t('fc.see.' + k)).join(', ');
    let body = '<p class="mc-sees">' + ic('eye') + esc(t('fc.can_see', { name: lang === 'hi' ? 'आप' : 'You', items })) + '</p>';
    if (l.coApproval) body += '<p class="mc-line">' + ic('family') + esc(t('fc.co_approval')) + '</p>';
    if (l.kind === 'guardian' && m.licence) {
      body += '<div class="lv-chips">' + ['money', 'school', 'messages', 'shopping'].map((a) => '<span class="lv-chip">' + ic(A.ui.areaIcon(a === 'messages' ? 'messages' : a)) + esc(t('area.' + a).split(' ')[0]) + ' L' + m.licence[a].level + '</span>').join('') + '</div>' +
        '<p class="mc-line" data-tag="FR-FC-18">' + ic('skip') + esc(t('fc.skips_today', { n: (m.meFirst.skipsToday.school || 0) })) + '</p>';
    }
    const st = A.engine.statement.compute(m, A.engine.statement.openMonth(), { asOf: A.clock.now() });
    const summary = l.share.summary ?
      '<button class="mc-stat" data-action="fam.statement" data-member="' + m.id + '" data-tag="FR-AS-16">' + ic('mirror') + '<span><b>' + (st.alr == null ? '—' : st.alr + '%') + '</b> ' + esc(lang === 'hi' ? 'ख़ुद के फ़ैसले, इस महीने' : 'decided themselves this month') + '</span>' + ic('chevRight') + '</button>' :
      '<p class="mc-line muted" data-tag="AS-E13">' + ic('info') + esc(t('as.not_sharing', { name: m.short })) + '</p>';
    return '<article class="member-card"><div class="mc-top"><span class="loc-av">' + esc(m.initials) + '</span><div><b>' + esc(label(l.member)) + (m.familyName ? ' <small>(' + esc(m.short) + ')</small>' : '') + '</b><small>' + esc(role) + ' · ' + esc(m.city) + '</small></div>' +
      '<a class="icon-btn mc-call" href="tel:' + esc(m.phone) + '" aria-label="' + esc(t('fc.call', { member: m.short })) + '">' + ic('phone') + '</a></div>' +
      body + summary + '<p class="sees-same" data-tag="FR-FC-04">' + ic('eye') + esc(t('fc.sees_same', { member: m.short })) + '</p></article>';
  }

  /* ---------------- Member view (Rajan) ---------------- */
  function memberView(p, links) {
    const lang = p.lang;
    const openAlert = A.state.family.alerts.find((a) => a.member === p.id && a.status === 'open');
    const visible = links.filter((l) => !l.paused);
    const banner = visible.length ? '<section class="promo is-night" data-tag="FR-FC-04"><div class="promo-head"><h3>' + esc(t('fc.members')) + '</h3>' + ic('family', 'promo-ic') + '</div>' +
      visible.map((l) => '<p>' + ic('eye') + ' ' + esc(t('fc.can_see', { name: F().contactName(l), items: F().sees(l).map((k) => t('fc.see.' + k)).join(', ') })) + '</p>').join('') +
      (openAlert ? '<div class="told-note is-night">' + ic('phone') + esc(t('fc.member_told', { name: openAlert.contacts[openAlert.idx].name })) + '</div>' : '') + '</section>' : '';
    const rows = links.map((l) => {
      const name = F().contactName(l);
      return '<li class="contact-row' + (l.paused ? ' is-paused' : '') + '"><span class="order">' + l.order + '</span><div class="cr-body"><b>' + esc(name) + '</b><small>' + esc(t('fc.role.trusted')) + (l.paused ? ' · ' + esc(t('fc.paused')) : '') + (l.removePending ? ' · ' + esc(lang === 'hi' ? 'हटाना बाक़ी' : 'removal pending') : '') + '</small>' +
        '<div class="cr-acts"><button class="link-btn" data-action="fam.whatSee" data-contact="' + l.contact + '">' + ic('eye') + esc(t('fc.what_they_see')) + '</button>' +
        '<button class="link-btn" data-action="fam.pause" data-contact="' + l.contact + '" data-tag="FR-FC-06">' + ic('pause') + esc(l.paused ? t('fc.resume') : t('fc.pause_private')) + '</button>' +
        '<button class="link-btn is-danger" data-action="fam.remove" data-contact="' + l.contact + '" data-tag="FC-E6">' + ic('trash') + esc(t('fc.remove')) + '</button></div></div></li>';
    }).join('');
    const co = links.find((l) => l.coApproval);
    const coRow = co ? '<section class="card-sec"><div class="set-row" data-tag="FR-FC-03"><div><b>' + esc(t('fc.co_approval')) + '</b><small>' + esc(t('fc.co_approval_d', { amount: U.inr(co.coApproval.over), name: F().contactName(co) })) + '</small></div>' + A.ui.toggle(true, 'fam.noop', {}, { disabled: !!openAlert }) + '</div></section>' : '';
    return banner + '<section class="card-sec">' + A.ui.sectionTitle(t('fc.members')) + '<ul class="contact-list">' + rows + '</ul></section>' + coRow +
      (links.some((l) => l.paused) ? '<div class="pad"><div class="note-card">' + ic('help') + '<span>' + esc(t('fc.helpline')) + '</span></div></div>' : '');
  }

  /* ---------------- Learner view (Vihan) ---------------- */
  function minorView(p, links) {
    const lang = p.lang;
    const g = P(p.guardian);
    const areas = ['money', 'school', 'messages', 'shopping'];
    const pending = A.state.family.levelRequests.filter((r) => r.member === p.id && r.status === 'open');
    const cards = areas.map((a) => {
      const l = p.licence[a];
      const c = F().criteria(p, a);
      const req = pending.find((r) => r.area === a);
      const crit = [];
      if (c.weeks) crit.push(t('fc.weeks', { a: c.weeks }));
      if (c.decisions) crit.push(t('fc.decisions', { a: c.decisions }));
      const pct = Math.round(((Math.min(l.weeks, 4) / 4) + (Math.min(l.decisions, 10) / 10)) / 2 * 100);
      return '<article class="lic-card" data-tag="FR-FC-13"><div class="lic-top"><span class="area-ic">' + ic(A.ui.areaIcon(a)) + '</span><b>' + esc(t('area.' + a)) + '</b><span class="lic-level">' + esc(t('fc.level', { n: l.level })) + '</span></div>' +
        '<div class="lic-steps">' + A.ui.dots(l.level, 4, l.level) + '</div>' +
        '<p><small>' + esc(t('fc.can_now')) + '</small>' + esc(t('fc.l.' + a + '.' + l.level)) + '</p>' +
        (l.level < 4 ? '<div class="lic-next">' + A.ui.dots(Math.min(l.weeks, 4) + Math.min(Math.floor(l.decisions / 2.5), 4), 8) + '<small>' + esc(t('fc.level_next', { criteria: c.met ? t('fc.criteria_met') : crit.join(lang === 'hi' ? ' और ' : ' and ') })) + '</small></div>' +
          (req ? '<p class="muted small">' + ic('clock') + esc(t('fc.asked_level', { name: g.short })) + '</p>' :
            '<button class="btn btn-sm ' + (c.met ? 'btn-primary' : 'btn-outline') + '" data-action="fam.askLevel" data-area="' + a + '"' + (c.met ? '' : ' disabled aria-disabled="true"') + ' data-tag="FR-FC-15">' + esc(t('fc.ask_level', { name: g.short, n: l.level + 1 })) + '</button>') : '') +
        '</article>';
    }).join('');
    const l = links.find((x) => x.kind === 'guardian');
    const sees = l ? '<section class="card-sec" data-tag="FR-FC-18"><h3 class="h3">' + ic('eye') + ' ' + esc(t('fc.can_see', { name: g.short, items: F().sees(l).map((k) => t('fc.see.' + k)).join(', ') })) + '</h3>' +
      '<p class="muted small">' + esc(t('fc.never_see')) + '</p><button class="btn btn-outline btn-block" data-action="fam.whatSee" data-contact="' + g.id + '">' + esc(t('fc.what_they_see')) + '</button></section>' : '';
    const views = p.views.length ? '<section class="card-sec" data-tag="FR-LG-02">' + A.ui.sectionTitle(t('fc.views_log')) + '<ul class="log-list">' + p.views.slice(0, 6).map((v) => '<li>' + esc(P(v.viewer).short) + ' · ' + esc(v.what) + ' · ' + esc(U.ago(v.ts, lang)) + '</li>').join('') + '</ul></section>' : '';
    return '<section class="promo is-blue"><div class="promo-head"><h3>' + esc(t('fc.licence')) + '</h3>' + ic('school', 'promo-ic') + '</div><p>' + esc(t('fc.licence_d')) + '</p></section>' +
      '<div class="lic-grid">' + cards + '</div>' + sees + views;
  }

  function emptyView(p) {
    return '<section class="promo is-sunset"><div class="promo-head"><h3>' + esc(t('fc.members')) + '</h3>' + ic('family', 'promo-ic') + '</div><p>' +
      esc(p.lang === 'hi' ? 'माता-पिता या बच्चे को उनकी सहमति से जोड़ें, ताकि आप एक-दूसरे का ध्यान रख सकें।' : 'Link a parent or child with their consent, so you can look out for each other.') + '</p></section>';
  }

  /* ---------------- Actions ---------------- */
  A.actions['fam.call'] = function (d) { F().markActed(d.id, cur().id); A.engine.ledger.log(cur().id, 'Call from alert (dialler opened)'); };
  A.actions['fam.review'] = (d) => A.ui.sheetOpen('review', { cardId: d.card });
  A.ui.sheets.review = function (args) {
    const c = A.engine.anchor.findCard(args.cardId);
    if (!c) return '';
    return A.ui.sheetFrame(t('fc.review'), A.ui.decisionCard(c, { ctx: 'family' }) + '<p class="muted small">' + esc(t('fc.never_see')) + '</p>');
  };
  A.actions['fam.levelApprove'] = (d) => { F().decideLevel(d.id, true); A.ui.toast(cur().lang === 'hi' ? 'नया स्तर लागू।' : 'New level applies now.', { tone: 'ok' }); A.ui.render(); };
  A.actions['fam.levelDecline'] = (d) => { F().decideLevel(d.id, false); A.ui.render(); };
  A.actions['fam.askLevel'] = function (d) {
    const p = cur();
    F().requestLevel(p.id, d.area);
    A.ui.toast(t('fc.asked_level', { name: P(p.guardian).short }), { tone: 'ok' });
    A.ui.render();
  };
  A.actions['fam.noop'] = () => {};
  A.actions['fam.whatSee'] = (d) => A.ui.sheetOpen('whatSee', { member: cur().id, contact: d.contact });
  A.ui.sheets.whatSee = function (args) {
    const m = P(args.member);
    const l = F().link(args.member, args.contact);
    const name = l ? F().contactName(l) : '';
    const lang = cur().lang;
    const items = l ? F().sees(l) : [];
    const st = A.engine.statement.compute(m, A.engine.statement.openMonth(), { asOf: A.clock.now() });
    const preview = '<div class="preview-phone">' +
      (items.indexOf('alerts') >= 0 ? '<div class="pv-row">' + ic('bell') + '<span>' + esc(lang === 'hi' ? 'अलर्ट: श्रेणी, रकम का दायरा, प्राप्तकर्ता का प्रकार, कारण' : 'Alerts: category, amount band, payee type, reason') + '</span></div>' : '') +
      (items.indexOf('summary') >= 0 ? '<div class="pv-row">' + ic('mirror') + '<span>' + esc(lang === 'hi' ? 'स्टेटमेंट सारांश: ' : 'Statement summary: ') + (st.alr == null ? '—' : st.alr + '%') + (lang === 'hi' ? ', हिस्सों के बार, नोट' : ', area bars, notes') + '</span></div>' : '') +
      (items.indexOf('levels') >= 0 ? '<div class="pv-row">' + ic('school') + '<span>' + esc(lang === 'hi' ? 'लर्नर लाइसेंस के स्तर' : 'Learner\'s Licence levels') + '</span></div>' : '') +
      (items.indexOf('skips') >= 0 ? '<div class="pv-row">' + ic('skip') + '<span>' + esc(lang === 'hi' ? 'आज के स्किप की गिनती (सामग्री नहीं)' : 'Skip counts today (no content)') + '</span></div>' : '') +
      (items.length ? '' : '<div class="pv-row">' + ic('pause') + '<span>' + esc(t('fc.paused')) + '</span></div>') +
      '<div class="pv-row is-never">' + ic('lock') + '<span>' + esc(t('fc.never_see')) + '</span></div></div>';
    return A.ui.sheetFrame(t('fc.what_they_see') + ' · ' + name, '<p class="sees-same">' + ic('eye') + esc(t('fc.sees_same', { member: name })) + '</p>' + preview);
  };
  A.actions['fam.pause'] = function (d) {
    const p = cur();
    const l = F().link(p.id, d.contact);
    if (!l) return;
    F().pauseSharing(p.id, d.contact, !l.paused);
    A.ui.toast(l.paused ? t('fc.paused') : (p.lang === 'hi' ? 'शेयरिंग फिर शुरू' : 'Sharing resumed'));
    A.ui.render();
  };
  A.actions['fam.remove'] = function (d) {
    const p = cur();
    const r = F().removeLink(p.id, d.contact);
    if (r.deferred) A.ui.toast(t('fc.remove_deferred'), { ms: 6000 });
    else if (r.ok) A.ui.toast(t('fc.no_longer'));
    A.ui.render();
  };

  /* Family statement view (PRD 1 flow 5): summary only, view logged in member's log */
  A.actions['fam.statement'] = function (d) {
    const viewer = cur();
    F().logView(d.member, viewer.id, 'statement summary');
    A.engine.ledger.log(d.member, viewer.short + ' viewed statement summary (FR-LG-02)');
    A.ui.sheetOpen('famStatement', { member: d.member });
  };
  A.ui.sheets.famStatement = function (args) {
    const m = P(args.member);
    const lang = cur().lang;
    const key = A.engine.statement.latestClosed();
    const st = A.engine.statement.compute(m, key);
    const hl = st.highlights.filter((h) => h.area !== 'health'); /* AS-E11 */
    const maxTotal = Math.max.apply(null, st.areas.map((a) => a.total).concat([1]));
    const body = '<div class="banner-same" data-tag="AC-AS-08">' + ic('eye') + esc(t('as.sees_same', { member: m.short })) + '</div>' +
      '<section class="hero-statement is-compact"><span class="hero-kicker">' + esc(m.short) + ' · ' + esc(t('as.statement', { month: U.monthName(key, lang) })) + '</span>' +
      (st.mode === 'pct' ? '<div class="hero-alr">' + st.alr + '<span>%</span></div>' : '<div class="hero-counts"><b>' + (st.yours + st.considered) + '</b><span>/ ' + st.total + '</span></div>') + '</section>' +
      '<ul class="area-bars is-static">' + st.areas.map((a) => '<li><div class="area-row"><span class="area-ic">' + ic(A.ui.areaIcon(a.area)) + '</span><span class="area-name">' + esc(t('area.' + a.area)) + '</span>' +
        '<span class="area-bar"><i class="seg-yours" style="width:' + (a.yours / maxTotal * 100) + '%"></i><i class="seg-approved" style="width:' + (a.approved / maxTotal * 100) + '%"></i><i class="seg-quick" style="width:' + (a.quick / maxTotal * 100) + '%"></i><i class="seg-auto" style="width:' + (a.autopilot / maxTotal * 100) + '%"></i></span><span class="area-n">' + a.total + '</span></div></li>').join('') + '</ul>' +
      hl.map((h) => '<div class="hl-card is-' + h.tone + ' is-simple"><p>' + esc(A.engine.statement.highlightText(h, lang)) + '</p></div>').join('') +
      '<p class="muted small">' + ic('lock') + ' ' + esc(lang === 'hi' ? 'फ़ैसलों की सूची कभी शेयर नहीं होती।' : 'Decision lists are never shared.') + '</p>' +
      '<p class="muted small">' + esc(t('fc.view_logged', { name: m.short })) + '</p>';
    return A.ui.sheetFrame(t('fc.summary'), body, { cls: 'is-tall' });
  };

  /* Linking: invite code + QR (FR-FC-01) */
  A.actions['fam.add'] = () => A.ui.sheetOpen('addFamily', { step: 1 });
  A.ui.sheets.addFamily = function (args) {
    const lang = cur().lang;
    if (args.step === 1) {
      /* Choices as Flipkart category circles (reference icon row) with a one-line description */
      const icon = { parent: 'user', child: 'school', adult: 'userPlus' };
      return A.ui.sheetFrame(t('fc.add'), '<b class="who-q">' + esc(t('fc.add_who')) + '</b><div class="who-grid">' +
        ['parent', 'child', 'adult'].map((w) => '<button class="who-tile" data-action="fam.invite" data-w="' + w + '">' +
          '<span class="who-circle">' + ic(icon[w]) + '</span><b>' + esc(t('fc.who.' + w)) + '</b><small>' + esc(t('fc.who_d.' + w)) + '</small></button>').join('') + '</div>' +
        '<p class="muted small who-note">' + ic('lock') + ' ' + esc(t('fc.never_see')) + '</p>',
        { sub: t('fc.add_sub'), art: familyArt() });
    }
    const inv = args.invite;
    return A.ui.sheetFrame(t('fc.invite_code'), '<div class="invite">' + qr(inv.code) + '<div class="code">' + inv.code.slice(0, 3) + ' ' + inv.code.slice(3) + '</div><p class="muted">' + esc(t('fc.invite_hint')) + '</p>' +
      '<p class="muted small">' + ic('clock') + esc(t('fc.invite_pending', { name: lang === 'hi' ? 'उनके' : 'them' })) + '</p></div>',
      { sub: t('fc.invite_sub'), art: familyArt() });
  };
  /* Small flat illustration for the blue band, in the spirit of Flipkart's login-panel art:
     a soft circle with the family icon, a yellow tile with the anchor and a white house */
  function familyArt() {
    return '<div class="band-art" aria-hidden="true"><span class="art-sun"></span><span class="art-house">' + ic('home') + '</span>' +
      '<span class="art-circle">' + ic('family') + '</span><span class="art-tile">' + ic('anchor') + '</span></div>';
  };
  A.actions['fam.invite'] = function (d) {
    const inv = F().createInvite(cur().id, d.w);
    A.state.ui.sheet.args = { step: 2, invite: inv };
    A.ui.renderLayer();
  };
  function qr(code) {
    const rnd = U.rng(parseInt(code, 10));
    const n = 21;
    let cells = '';
    const boxes = [[0, 0], [n - 7, 0], [0, n - 7]];
    const finder = (x, y) => { for (const [bx, by] of boxes) if (x >= bx && x < bx + 7 && y >= by && y < by + 7) return [x - bx, y - by]; return null; };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const f = finder(x, y);
      const on = f ? (f[0] === 0 || f[0] === 6 || f[1] === 0 || f[1] === 6 || (f[0] >= 2 && f[0] <= 4 && f[1] >= 2 && f[1] <= 4)) : rnd() > 0.52;
      cells += '<i' + (on ? ' class="on"' : '') + '></i>';
    }
    return '<div class="qr" role="img" aria-label="QR code">' + cells + '</div>';
  }
  A.actions['fam.join'] = () => A.ui.sheetOpen('join', {});
  A.ui.sheets.join = function (args) {
    const lang = cur().lang;
    const pendingCode = (A.state.family.invites.find((i) => i.status === 'pending' && i.from !== cur().id) || {}).code;
    if (!args.code) {
      return A.ui.sheetFrame(t('fc.join'), '<label class="field"><span>' + esc(t('fc.invite_code')) + '</span><input id="joinCode" inputmode="numeric" maxlength="6" placeholder="123456" value="' + esc(args.typed || '') + '"></label>' +
        (args.error ? '<div class="form-error">' + esc(t('fc.code_wrong')) + '</div>' : '') +
        (pendingCode ? '<p class="muted small">Demo: ' + esc(lang === 'hi' ? 'अभी बना कोड' : 'latest invite code') + ' <b>' + pendingCode + '</b></p>' : '<p class="muted small">' + esc(lang === 'hi' ? 'डेमो: पहले किसी दूसरे व्यक्ति से "परिवार जोड़ें" करके कोड बनाएँ।' : 'Demo: create a code first from another persona with "Add family".') + '</p>') +
        '<button class="btn btn-primary btn-block" data-action="fam.joinCheck">' + esc(t('fc.join_cta')) + '</button>');
    }
    const inv = A.state.family.invites.find((i) => i.code === args.code);
    const from = P(inv.from);
    const ch = args.choices;
    const row = (k, lab) => '<div class="set-row"><div><b>' + esc(lab) + '</b></div>' + A.ui.toggle(ch[k], 'fam.joinToggle', { k }) + '</div>';
    return A.ui.sheetFrame(t('fc.choose_title', { name: from.short }), row('alerts', t('fc.alerts_on')) + row('summary', t('fc.statement_sharing')) + row('co', t('fc.co_approval')) +
      '<div class="preview-phone"><div class="pv-row">' + ic('eye') + '<span>' + esc(t('fc.can_see', { name: from.short, items: [ch.alerts && t('fc.see.alerts'), ch.summary && t('fc.see.summary')].filter(Boolean).join(', ') || '—' })) + '</span></div><div class="pv-row is-never">' + ic('lock') + '<span>' + esc(t('fc.never_see')) + '</span></div></div>' +
      '<button class="btn btn-primary btn-block" data-action="fam.joinAccept" data-tag="AC-FC-01">' + esc(t('fc.accept_link')) + '</button>');
  };
  A.actions['fam.joinCheck'] = function () {
    const code = (document.getElementById('joinCode').value || '').replace(/\s/g, '');
    const inv = A.state.family.invites.find((i) => i.code === code && i.status === 'pending' && i.from !== cur().id);
    if (!inv) { A.state.ui.sheet.args = { error: true, typed: code }; A.ui.renderLayer(); return; }
    A.state.ui.sheet.args = { code, choices: { alerts: true, summary: false, co: false } };
    A.ui.renderLayer();
  };
  A.actions['fam.joinToggle'] = (d) => { const c = A.state.ui.sheet.args.choices; c[d.k] = !c[d.k]; A.ui.renderLayer(); };
  A.actions['fam.joinAccept'] = function () {
    const a = A.state.ui.sheet.args;
    const r = F().join(cur().id, a.code, a.choices);
    A.ui.sheetClose();
    if (r.ok) A.ui.toast(t('fc.linked_ok'), { tone: 'ok' });
    A.ui.render();
  };
})();
