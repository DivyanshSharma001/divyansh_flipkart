/* Agent tab — simulated agent chat with in-flow Anchor cards (protocol mode).
   Picks (2026-10-21): chat = Claude style (2A), composer = Flipkart search bar + send (6B),
   decision card = Flipkart "Apply offers" panel (3C) with the product-page button pair (1A),
   trust label = rating pill (4A), Me-First = Flipkart card + search field + chips (5B),
   fingerprint = step inside the card (10B), voice = Claude red recording mic (19A),
   panels = Flipkart login modal (7B), no tool-step lines (8B). */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;
  const ic = (n, c) => A.ui.icon(n, c);
  const esc = U.esc;
  const t = (k, v) => A.t(k, v);
  const E = () => A.engine;

  function P(id) { return A.state.personas[id]; }
  function cur() { return A.ui.cur(); }
  function L() { return A.i18n.langOf(); }
  const pick = (o) => U.pick(o, L());

  /* ---------- Quick intents (header icon tabs + suggestion rail) ---------- */
  const INTENTS = {
    meera: [['gift', 'gift', 'Gift for Amma', 'अम्मा का तोहफ़ा'], ['insurance', 'guard', 'Insurance', 'बीमा'], ['groceries', 'cart', 'Groceries', 'राशन'], ['phoneCase', 'phone', 'Phone case', 'फ़ोन कवर'], ['bigTransfer', 'rupee', 'Send ₹60k', '₹60 हज़ार भेजें'], ['loan', 'wallet', 'Loan', 'लोन']],
    priya: [['writing', 'pen', 'Write to landlord', 'मकान मालिक को'], ['plans', 'calendar', 'Saturday plan', 'शनिवार'], ['groceries', 'cart', 'Groceries', 'राशन'], ['phoneCase', 'phone', 'Phone case', 'फ़ोन कवर']],
    aarav: [['homework', 'school', 'Physics help', 'फ़िज़िक्स'], ['gems', 'play', 'Game gems', 'गेम जेम्स'], ['writing', 'pen', 'Write a message', 'संदेश लिखो']],
    rajan: [['scam', 'alert', 'Bank call', 'बैंक का फ़ोन'], ['phoneCase', 'phone', 'Phone cover', 'फ़ोन कवर']],
    dev: [['groceries', 'cart', 'Groceries', 'राशन'], ['phoneCase', 'phone', 'Phone case', 'फ़ोन कवर'], ['insurance', 'guard', 'Insurance', 'बीमा']]
  };
  A.ui.intentsFor = function (p) {
    return (INTENTS[p.id] || []).map(([key, icon, en, hi]) => ({ key, icon, label: p.lang === 'hi' ? hi : en, text: key }));
  };
  A.ui.hw = 0;
  A.ui.activeIntent = {};
  A.actions['agent.foryou'] = function () {
    const p = cur();
    A.ui.activeIntent[p.id] = null;
    A.ui.stickChat = true;
    if (A.state.tabs[p.id] !== 'agent') A.ui.goto(p.id, 'agent'); else A.ui.render();
  };
  A.actions['agent.intent'] = function (d) {
    const p = cur();
    const key = d.text;
    A.ui.activeIntent[p.id] = key; /* header icon tab shows what was asked */
    if (A.state.tabs[p.id] !== 'agent') A.ui.goto(p.id, 'agent');
    A.ui.stickChat = true;
    A.sim.agent.propose(p.id, key, key === 'homework' ? ++A.ui.hw : key === 'split' ? 1 : null);
  };
  /* New chat: a fresh conversation thread. Me-First treats it as a new thread (FR-MF-09);
     anything still waiting stays in Guard → Waiting (no held action is lost). */
  A.actions['chat.new'] = function () {
    const p = cur();
    p.chatSession = (p.chatSession || 0) + 1;
    p.chat = [];
    A.sim.agent.push(p.id, { from: 'agent', kind: 'text', text: { en: A.t('ag.hello', { name: p.short }, 'en'), hi: A.t('ag.hello', { name: p.short }, 'hi') } });
    A.ui.activeIntent[p.id] = null;
    A.ui.listening = null;
    A.ui.hdrCompact = false;
    A.ui.stickChat = true;
    const waiting = p.cards.filter((c) => c.status === 'waiting').length;
    E().ledger.log(p.id, 'new chat started (thread #' + p.chatSession + ')');
    A.ui.toast(waiting ? t('ag.new_chat_waiting', { n: waiting }) : t('ag.new_chat_done'), { tone: waiting ? null : 'ok' });
    A.ui.render();
  };
  A.actions['chat.send'] = function () {
    const el = document.getElementById('chatInput');
    if (!el || !el.value.trim()) return;
    const v = el.value.trim();
    el.value = '';
    A.ui.stickChat = true;
    A.ui.activeIntent[cur().id] = null;
    A.sim.agent.userSays(cur().id, v);
  };

  /* ---------- Chat (pick 2A) ---------- */
  A.ui.tabs.agent = function (p) {
    const msgs = p.chat.map((m) => msg(p, m)).join('');
    const listening = A.ui.listening && A.ui.listening.mode === 'chat';
    const rail = listening ? listenLine() :
      '<div class="sugg-rail"><button class="sugg is-new" data-action="chat.new">' + ic('plus') + esc(t('ag.new_chat')) + '</button>' + A.ui.intentsFor(p).map((it) => '<button class="sugg" data-action="agent.intent" data-text="' + esc(it.key) + '">' + ic(it.icon) + esc(it.label) + '</button>').join('') + '</div>';
    autoSpeedBump(p);
    return '<div class="thread">' + msgs + '</div>' +
      '<div class="composer-wrap">' + rail +
      '<div class="composer"><label class="fk-search">' + ic('search') +
      '<input id="chatInput" type="text" autocomplete="off" placeholder="' + esc(t('hdr.ask')) + '" data-enter="chat.send" aria-label="' + esc(t('hdr.ask')) + '">' +
      '<button class="mic' + (listening ? ' is-rec' : '') + '" data-action="' + (listening ? 'voice.stop' : 'voice.start') + '" data-mode="chat" aria-label="Voice">' + ic('mic') + '</button></label>' +
      '<button class="send-sq" data-action="chat.send" aria-label="' + esc(t('common.send')) + '">' + ic('up') + '</button></div></div>';
  };

  function avatar() { return '<span class="bot-av" aria-hidden="true">' + ic('agent') + '</span>'; }
  function stamp(ts, lang) { return '<time class="stamp">' + esc(U.fmtTime(ts, lang)) + '</time>'; }

  function msg(p, m) {
    if (m.from === 'user') return '<div class="row is-user"><div class="bubble">' + esc(pick(m.text)) + stamp(m.ts, p.lang) + '</div></div>';
    if (m.kind === 'typing') return '<div class="row is-agent">' + avatar() + '<div class="atext"><span class="dots" aria-label="' + esc(t('ag.typing')) + '"><i></i><i></i><i></i></span></div></div>';
    if (m.kind === 'card') { const c = E().anchor.findCard(m.cardId); return c ? '<div class="row is-card">' + A.ui.decisionCard(c, { ctx: 'chat' }) + '</div>' : ''; }
    if (m.kind === 'mefirst') { const c = E().anchor.findCard(m.cardId); return c ? '<div class="row is-card">' + meFirstCard(c) + '</div>' : ''; }
    if (m.kind === 'built') return '<div class="row is-card">' + builtCard(p, m) + '</div>';
    if (m.kind === 'reco') return '<div class="row is-agent">' + avatar() + '<div class="atext"><p>' + esc(pick(m.text)) + '</p>' + promo(L() === 'hi' ? 'एजेंट के सुझाव' : 'Agent\'s ideas', m.items, null) + stamp(m.ts, p.lang) + '</div></div>';
    const tone = m.kind === 'blocked' ? ' is-blocked' : m.kind === 'fallback' ? ' is-warn' : m.kind === 'done' ? ' is-done' : '';
    const icon = m.kind === 'done' ? ic('checkCircle', 'st-ic') : m.kind === 'blocked' ? ic('xCircle', 'st-ic') : m.kind === 'fallback' ? ic('alert', 'st-ic') : '';
    const chip = m.trust ? '<div class="inline-label"><small>' + esc(t('ag.label_note')) + '</small>' + A.ui.trustChip(m.trust, { ref: 'entry:' + m.entryId, small: true }) + '</div>' : '';
    return '<div class="row is-agent">' + avatar() + '<div class="atext' + tone + '">' + icon + '<span>' + esc(pick(m.text)) + '</span>' + chip + stamp(m.ts, p.lang) + '</div></div>';
  }

  /* ---------- Decision card = Flipkart "Apply offers" panel (pick 3C) ---------- */
  function highStakes(c) {
    const a = c.action;
    return c.speedBump || (a.amount || 0) >= 10000 || a.reversibility === 'irreversible' || a.reversibility === 'costly';
  }
  A.ui.highStakes = highStakes;

  function reversibility(a) {
    if (a.reversibility === 'irreversible') return '<span class="rev is-hard">' + ic('alert') + esc(t('dg.irreversible')) + '</span>';
    if (a.reversibility === 'costly') return '<span class="rev is-hard">' + ic('clock') + esc(t('dg.costly', { period: pick(a.undoPeriod) || (L() === 'hi' ? 'लंबे समय' : 'a while') })) + '</span>';
    return '<span class="rev">' + ic('reset') + esc(t('dg.reversible')) + '</span>';
  }
  function timeLeft(c) {
    const ms = Math.max(0, c.expiresAt - A.clock.now());
    const h = Math.floor(ms / U.HOUR), m = Math.floor((ms % U.HOUR) / U.MIN);
    return h ? h + 'h ' + m + 'm' : m + 'm';
  }

  A.ui.decisionCard = function (c, opts) {
    opts = opts || {};
    const viewer = cur();
    const owner = P(c.pid);
    const a = c.action;
    const isOwner = viewer.id === c.pid;
    const isGuardian = !isOwner && owner.guardian === viewer.id;
    const isContact = !isOwner && c.co && c.co.contact === viewer.id;
    const trust = c.trust;
    if (c.status !== 'waiting') return resolvedCard(c, viewer);

    const title = t('dg.card_title', { agent: owner.agentName, action: pick(a.what) || pick(a.summary) });
    const cp = a.counterparty;
    const canAct = !(isOwner && c.approver === 'guardian') && (isOwner || isGuardian || isContact);
    const authHere = A.state.ui.auth && A.state.ui.auth.target === 'card:' + c.id;
    const listening = A.ui.listening && A.ui.listening.mode === 'card' && A.ui.listening.cardId === c.id;

    /* Inner card 1: what, amount, payee, label, reason, reversibility */
    const main = '<div class="offer-in">' +
      '<div class="offer-amt"><b>' + esc(a.amount != null ? A.ui.money(a.amount, a.period) : pick(a.summary)) + '</b>' + (trust ? A.ui.trustChip(trust, { ref: 'card:' + c.id }) : '') + '</div>' +
      (cp ? '<div class="offer-line">' + esc(cp.name) + ' · <span class="' + (cp.known ? '' : 'is-new') + '">' + esc(cp.known ? t('dg.known_payee') : t('dg.new_payee')) + '</span></div>' : '') +
      (c.total && c.total !== a.amount ? '<div class="offer-line is-strong" data-tag="FR-DG-09">' + esc(t('dg.running_total', { amount: U.inr(c.total), name: cp.name })) + '</div>' : '') +
      (a.reason ? '<p class="offer-why"><span>' + esc(t('dg.why')) + ':</span> “' + esc(pick(a.reason)) + '”</p>' : '') +
      reversibility(a) + '</div>';

    /* Inner card 2: cheaper option with Flipkart's gold "best value" highlight + Compare (blue text action) */
    let alt = '';
    const better = trust && trust.better && trust.better.length ? A.data.catalogue.byId(trust.better[0]) : null;
    const canCompare = trust && trust.alternatives && trust.alternatives.length && trust.key !== 'red_fraud';
    if (canCompare) {
      const item = a.itemId && A.data.catalogue.byId(a.itemId);
      alt = '<div class="offer-in">' + (better ? '<span class="best">' + esc(L() === 'hi' ? 'बराबर कवर, कम कीमत' : 'Cheaper with equal cover') + '</span>' : '') +
        '<div class="offer-row"><div>' + (better ? '<b>' + esc(better.name) + ' ' + esc(A.ui.money(better.price, better.period)) + '</b>' + (item ? ' <span class="drop">↓' + Math.round((1 - better.price / item.price) * 100) + '%</span>' : '') : '<b>' + esc(L() === 'hi' ? 'दूसरे विकल्प देखें' : 'See other options') + '</b>') + '</div>' +
        (canAct ? '<button class="text-act" data-action="card.compare" data-id="' + c.id + '" data-tag="FR-TC-09">' + esc(t('dg.compare')) + '</button>' : '') + '</div></div>';
    }

    /* Inner card 3: Speed Bump questions */
    const sbUntil = (c.shownAt || A.clock.now()) + 10000;
    const sbActive = c.speedBump && A.clock.now() < sbUntil;
    const bump = c.speedBump && canAct ? '<div class="offer-in" data-tag="FR-DG-06"><b class="mini-h">' + esc(t('dg.speedbump')) + '</b><ol class="qs"><li>' + esc(t('dg.speed_q1')) + '</li><li>' + esc(t('dg.speed_q2')) + '</li><li>' + esc(t('dg.speed_q3')) + ' <b>' + esc(a.reversibility === 'reversible' ? t('common.yes') : t('common.no')) + '</b></li></ol></div>' : '';

    /* Notes: guardian hold, co-approval, contact told */
    let notes = '';
    if (isOwner && c.approver === 'guardian') {
      const g = P(owner.guardian);
      const lic = E().family.licenceVerdict(owner, a, a.amount);
      notes += '<div class="offer-in is-note" data-tag="FR-FC-17">' + ic('lock') + '<div><b>' + esc(t('dg.held_guardian', { name: g.short })) + '</b><span>' + esc(t('dg.held_guardian_d', { area: t('area.' + (lic ? lic.area : 'money')), n: lic ? lic.level : 2, name: g.short })) + '</span></div></div>';
    }
    if (canAct && c.co) {
      const other = isOwner ? P(c.co.contact) : owner;
      notes += '<div class="offer-in is-note" data-tag="FR-FC-09">' + ic('family') + '<div><b>' + esc(t('dg.co_needed', { name: other.short })) + '</b>' + (c.co.approvals[viewer.id] ? '<span>' + esc(L() === 'hi' ? 'आपने मंज़ूर किया' : 'You approved') + '</span>' : '') + '</div></div>';
    }
    if (isOwner && c.alertId) {
      const al = A.state.family.alerts.find((x) => x.id === c.alertId);
      if (al) notes += '<div class="offer-in is-note" data-tag="FR-FC-11">' + ic('phone') + '<div><b>' + esc(t('fc.member_told', { name: al.contacts[0].name })) + '</b></div></div>';
    }

    /* Actions: product-page pair (pick 1A) or fingerprint step (pick 10B) */
    let actions = '';
    if (canAct) {
      const by = viewer.id;
      if (authHere) actions = '<div class="offer-in">' + A.ui.authStep(A.state.ui.auth.label) + '</div>';
      else {
        actions = '<div class="btn-pair">' +
          '<button class="btn-out" data-action="card.decline" data-id="' + c.id + '" data-by="' + by + '">' + esc(t('dg.decline')) + '</button>' +
          '<button class="btn-buy" data-action="card.approve" data-id="' + c.id + '" data-by="' + by + '"' + (c.speedBump ? ' data-sb-until="' + sbUntil + '"' + (sbActive ? ' disabled aria-disabled="true"' : '') : '') + ' data-tag="' + (c.speedBump ? 'FR-DG-06' : 'FR-DG-05') + '">' +
          '<span class="btn-buy-main">' + (sbActive ? esc(t('dg.approve_in', { s: Math.ceil((sbUntil - A.clock.now()) / 1000) })) : esc(t('dg.approve'))) + '</span>' +
          (a.amount != null ? '<small>' + esc(A.ui.money(a.amount, a.period)) + '</small>' : '') + '</button></div>' +
          (listening ? listenLine() : '<div class="offer-links"><button class="text-act" data-action="card.listen" data-id="' + c.id + '">' + ic('volume') + esc(t('common.listen')) + '</button>' +
            '<button class="text-act" data-action="voice.start" data-mode="card" data-id="' + c.id + '" data-tag="DG-09">' + ic('mic') + esc(t('dg.voice_hint')) + '</button></div>');
      }
    }

    const head = c.critical ?
      '<header class="offer-head is-night"><span class="live">● ' + esc(t('fc.critical')) + '</span><span class="offer-title">' + esc(title) + '</span></header>' :
      '<header class="offer-head"><span class="anchor-mark">' + ic('anchor') + '</span><span class="offer-title">' + esc(title) + '</span><span class="offer-time" title="' + esc(t('dg.waiting')) + '">' + esc(t('dg.left', { t: timeLeft(c) })) + '</span></header>';
    return '<article class="offer" data-card-shown="' + c.id + '" data-tag="FR-DG-05">' + head +
      '<div class="offer-body">' + main + alt + bump + notes + actions + '</div></article>';
  };

  function resolvedCard(c, viewer) {
    const a = c.action;
    const res = c.resolution;
    const ok = res === 'approved_considered' || res === 'approved_quick' || res === 'guardian_approved' || res === 'modified';
    let line;
    if (res === 'modified' && c.chosen) { const it = A.data.catalogue.byId(c.chosen); line = (L() === 'hi' ? 'बदलकर ' : 'Changed to ') + (it ? it.name + ' · ' + A.ui.money(it.price, it.period) : ''); }
    else if (res === 'expired') line = t('dg.expired');
    else line = pick(a.summary) + (a.amount ? ' · ' + U.inr(a.amount) : '');
    const by = c.resolvedBy && c.resolvedBy !== viewer.id && P(c.resolvedBy) ? ' · ' + P(c.resolvedBy).short : '';
    return '<article class="offer is-done ' + (ok ? 'is-ok' : 'is-no') + '"><div class="offer-in">' +
      '<div class="res-row">' + ic(ok ? 'checkCircle' : 'xCircle') + '<div><b>' + esc(line) + '</b><span>' + A.ui.resPill(res) + esc(by) + '</span></div>' +
      (c.trust ? A.ui.trustChip(c.trust, { small: true, short: true }) : '') + '</div></div></article>';
  }

  /* ---------- Card actions ---------- */
  function finishApprove(c, by, viaVoice) {
    const r = E().anchor.resolve(c.id, { type: 'approve', by, viaVoice });
    if (!r.ok) return;
    if (r.partial) { A.ui.toast(L() === 'hi' ? 'आपकी मंज़ूरी दर्ज। दूसरे व्यक्ति का इंतज़ार।' : 'Your approval is recorded. Waiting for the other person.'); A.ui.render(); return; }
    A.ui.toast(t('dg.resolved_toast.approved'), { tone: 'ok' });
    if (r.suggest) setTimeout(() => A.ui.sheetOpen('remember', { s: r.suggest, step: 1 }), 500);
    A.ui.render();
  }
  function approveTarget(c) { return A.state.ui.sheet && A.state.ui.sheet.type === 'speedbump' ? 'sheet' : (A.state.ui.sheet && A.state.ui.sheet.type === 'review' ? 'sheet' : 'card:' + c.id); }
  A.actions['card.approve'] = function (d) {
    const c = E().anchor.findCard(d.id);
    if (!c || c.status !== 'waiting') return;
    if (c.speedBump && A.clock.now() < (c.shownAt || 0) + 10000) return;
    const by = d.by || cur().id;
    if (highStakes(c)) A.ui.authThen(() => finishApprove(c, by), pick(c.action.what), approveTarget(c));
    else finishApprove(c, by);
  };
  A.actions['card.decline'] = function (d) {
    const c = E().anchor.findCard(d.id);
    if (!c) return;
    E().anchor.resolve(c.id, { type: 'decline', by: d.by || cur().id });
    A.ui.voice.stop();
    A.ui.listening = null;
    if (A.state.ui.sheet && A.state.ui.sheet.type !== 'speedbump') A.ui.sheetClose();
    A.ui.toast(t('dg.resolved_toast.declined'));
    A.ui.render(); A.ui.renderLayer();
  };
  A.actions['card.compare'] = function (d) { E().anchor.markDetails(d.id); A.ui.openSecondOpinion(d.id); };
  A.actions['card.listen'] = function (d) { const c = E().anchor.findCard(d.id); E().anchor.markDetails(d.id); A.ui.voice.speak(cardScript(c, L()), L()); };

  /* Voice script (PRD 2) */
  function cardScript(c, lang) {
    const a = c.action;
    const hi = lang === 'hi';
    if (c.trust && c.trust.key === 'red_fraud') return fraudScript(c, lang);
    let s = (hi ? 'आपका एजेंट ' : 'Your agent wants to ') + U.pick(a.what, lang) + (hi ? ' चाहता है। ' : '. ');
    if (a.amount) s += (hi ? 'रकम ' : 'The amount is ') + U.inr(a.amount) + (a.period === 'year' ? (hi ? ' सालाना। ' : ' a year. ') : '. ');
    if (c.trust && (c.trust.color === 'yellow' || c.trust.key === 'red_skipped')) s += hi ? 'इस पर एजेंट को कमीशन मिलता है। ' : 'Your agent earns a commission on this. ';
    if (c.trust && c.trust.better && c.trust.better.length) s += hi ? 'दो सस्ते विकल्प भी हैं। ' : (c.trust.better.length === 2 ? 'Two' : c.trust.better.length) + ' cheaper options exist. ';
    s += hi ? 'हाँ, ना, या तुलना करो बोलिए।' : 'Say approve, decline, or compare.';
    return s;
  }
  function fraudScript(c, lang) {
    const al = c.alertId && A.state.family.alerts.find((x) => x.id === c.alertId);
    const contact = al ? al.contacts[0].name : '';
    const hiName = contact === 'Meera' ? 'मीरा' : contact;
    if (lang === 'hi') return 'सावधान रहिए। इस व्यक्ति के ख़िलाफ़ धोखाधड़ी की शिकायत है। मैंने भुगतान रोक दिया है' + (contact ? ' और ' + hiName + ' को बता दिया है' : '') + '। आगे बढ़ें, रोकें, या ' + (hiName || 'परिवार') + ' को फ़ोन करें, बोलिए।';
    return 'Be careful. This person has been reported for fraud. I\'ve paused the payment' + (contact ? ' and told ' + contact : '') + '. Say continue, stop, or call ' + (contact || 'family') + '.';
  }
  A.ui.cardScript = cardScript;

  /* Critical holds open the navy full screen (Flipkart Play surface) with the spoken warning (AC-TC-10) */
  function autoSpeedBump(p) {
    const c = p.cards.find((x) => x.status === 'waiting' && x.type === 'decision' && x.critical && !x.autoShown);
    if (!c || A.state.ui.sheet) return;
    c.autoShown = true;
    if (!c.shownAt) c.shownAt = A.clock.now();
    setTimeout(() => {
      A.ui.sheetOpen('speedbump', { cardId: c.id });
      if (p.settings.voice) A.ui.voice.speak(fraudScript(c, p.lang), p.lang);
    }, 60);
  }
  A.ui.sheets.speedbump = function (args) {
    const c = E().anchor.findCard(args.cardId);
    if (!c) return '';
    const p = cur();
    const isOwner = p.id === c.pid;
    const a = c.action;
    const sbUntil = (c.shownAt || A.clock.now()) + 10000;
    const active = A.clock.now() < sbUntil;
    const al = c.alertId && A.state.family.alerts.find((x) => x.id === c.alertId);
    const contact = al && P(al.contacts[0].id);
    const hi = L() === 'hi';
    if (c.status !== 'waiting') {
      const stopped = c.resolution === 'declined' || c.resolution === 'contact_declined';
      return A.ui.sheetFrame(null, '<div class="ns-wrap is-done">' + ic(stopped ? 'checkCircle' : 'info', 'ns-big') +
        '<h2>' + esc(stopped ? (hi ? 'भुगतान रोक दिया गया। आप सुरक्षित हैं।' : 'Payment stopped. You\'re safe.') : t('res.' + c.resolution)) + '</h2>' +
        '<button class="btn-buy is-block" data-action="sheet.close"><span class="btn-buy-main">' + esc(t('common.ok')) + '</span></button></div>', { full: true });
    }
    const authHere = A.state.ui.auth && A.state.ui.auth.target === 'sheet';
    const listening = A.ui.listening && A.ui.listening.mode === 'card' && A.ui.listening.cardId === c.id;
    const body = '<div class="ns-wrap" data-tag="FR-TC-08 · FR-DG-06">' +
      '<span class="live">● ' + esc(hi ? 'धोखाधड़ी का ख़तरा' : 'Fraud risk') + '</span>' +
      '<h2>' + esc(hi ? 'रुकिए। यह भुगतान रोका गया है।' : 'Wait. This payment is on hold.') + '</h2>' +
      '<div class="ns-amount">' + esc(U.inr(a.amount)) + '</div>' +
      '<div class="ns-payee">' + esc(a.counterparty.name) + ' · ' + esc(t('dg.new_payee')) + '</div>' +
      (c.trust ? A.ui.trustChip(c.trust, { ref: 'card:' + c.id }) : '') +
      (contact ? '<p class="ns-told">' + ic('phone') + esc(t('fc.member_told', { name: contact.short })) + '</p>' : '') +
      '<ol class="ns-qs"><li>' + esc(t('dg.speed_q1')) + '</li><li>' + esc(t('dg.speed_q2')) + '</li><li>' + esc(t('dg.speed_q3')) + ' <b>' + esc(t('common.no')) + '</b></li></ol>' +
      (authHere ? '<div class="ns-auth">' + A.ui.authStep(A.state.ui.auth.label) + '</div>' :
        '<div class="ns-actions">' +
        '<button class="btn-buy is-block is-stop" data-action="card.decline" data-id="' + c.id + '" data-by="' + p.id + '"><span class="btn-buy-main">' + esc(hi ? 'रोक दो' : 'Stop the payment') + '</span></button>' +
        (contact && isOwner ? '<a class="btn-out is-block is-night" href="tel:' + esc(contact.phone) + '" data-action="sb.call" data-id="' + c.id + '">' + ic('phone') + esc(t('fc.call', { member: contact.short })) + '</a>' : '') +
        '<button class="btn-out is-block is-night is-quiet" data-action="card.approve" data-id="' + c.id + '" data-by="' + p.id + '" data-sb-until="' + sbUntil + '" data-sb-label="' + esc(hi ? 'आगे बढ़ें' : 'Continue anyway') + '"' + (active ? ' disabled aria-disabled="true"' : '') + '>' +
        '<span class="btn-buy-main">' + (active ? esc(t('dg.approve_in', { s: Math.ceil((sbUntil - A.clock.now()) / 1000) })) : esc(hi ? 'आगे बढ़ें' : 'Continue anyway')) + '</span></button></div>' +
        (listening ? listenLine(true) : '<div class="ns-links"><button class="text-act is-night" data-action="voice.start" data-mode="card" data-id="' + c.id + '">' + ic('mic') + esc(hi ? 'बोलिए: "रोक दो", "आगे बढ़ो" या "फ़ोन करो"' : 'Say "stop", "continue" or "call"') + '</button>' +
          '<button class="text-act is-night" data-action="sb.replay" data-id="' + c.id + '">' + ic('volume') + esc(t('common.listen')) + '</button></div>')) +
      '</div>';
    return A.ui.sheetFrame(null, body, { full: true });
  };
  A.actions['sb.replay'] = (d) => { const c = E().anchor.findCard(d.id); A.ui.voice.speak(fraudScript(c, L()), L()); };
  A.actions['sb.call'] = (d) => { const c = E().anchor.findCard(d.id); if (c && c.alertId) E().family.markActed(c.alertId, cur().id); };

  /* ---------- Voice: Claude-style recording mic, phrases as a quiet line (pick 19A) ---------- */
  function phrases() {
    const s = A.ui.listening;
    const p = cur();
    const hi = p.lang === 'hi';
    if (!s) return [];
    if (s.mode === 'card') {
      const c = E().anchor.findCard(s.cardId);
      if (s.confirm) return [[hi ? 'मैं यह भुगतान मंज़ूर करता हूँ' : 'I approve this payment', 'confirm']];
      return c && c.critical ?
        [[hi ? 'रोक दो' : 'Stop', 'decline'], [hi ? 'आगे बढ़ो' : 'Continue', 'approve'], [hi ? 'मीरा को फ़ोन करो' : 'Call family', 'call']] :
        [[hi ? 'हाँ' : 'Approve', 'approve'], [hi ? 'ना' : 'Decline', 'decline'], [hi ? 'तुलना करो' : 'Compare', 'compare']];
    }
    if (s.mode === 'mf') {
      const c = E().anchor.findCard(s.cardId);
      const area = c ? c.action.area : 'gifts';
      return (({
        gifts: [['Something for her garden, under ₹2,000', 'take'], ['A silk saree like last year', 'take']],
        school: [['At the top v is 0, so I would use v² = u² − 2gh', 'take'], ['Use the formula for current', 'take']],
        writing: [['Tell him the tap leaks since Monday, politely', 'take']],
        plans: [['A picnic at Lalbagh, then dinner at home', 'take']],
        money: [['About ₹10,000 a month', 'take']]
      })[area] || [['My idea…', 'take']]);
    }
    return A.ui.intentsFor(p).map((it) => [it.label, 'intent:' + it.key]);
  }
  function listenLine(night) {
    const s = A.ui.listening;
    const hi = L() === 'hi';
    return '<div class="listen' + (night ? ' is-night' : '') + '" aria-live="polite"><span class="rec-dot"></span><span class="listen-label">' + esc(s && s.confirm ? t('dg.voice_confirm') : (hi ? 'सुन रहे हैं… या टैप करें' : 'Listening… or tap a phrase')) + '</span>' +
      '<div class="listen-phrases">' + phrases().map(([txt, act]) => '<button class="sugg" data-action="voice.say" data-act="' + esc(act) + '" data-text="' + esc(txt) + '">“' + esc(txt) + '”</button>').join('') +
      '<button class="text-act' + (night ? ' is-night' : '') + '" data-action="voice.stop">' + esc(t('common.cancel')) + '</button></div></div>';
  }
  A.actions['voice.start'] = function (d) {
    if (d.id) E().anchor.markDetails(d.id);
    A.ui.listening = { mode: d.mode, cardId: d.id };
    A.ui.render(); A.ui.renderLayer();
    const p = cur();
    A.ui.voice.listen(p.lang, (text) => { if (text && A.ui.listening) voiceResult(text); });
  };
  A.actions['voice.stop'] = function () { A.ui.listening = null; A.ui.render(); A.ui.renderLayer(); };
  function voiceResult(text) {
    const s = (text || '').toLowerCase();
    let act = 'unknown';
    if (/approve|haan|हाँ|yes|continue|आगे/.test(s)) act = 'approve';
    if (/decline|stop|rok|रोक|ना|no\b|cancel/.test(s)) act = 'decline';
    if (/compare|तुलना/.test(s)) act = 'compare';
    if (/call|फ़ोन|phone/.test(s)) act = 'call';
    if (/i approve this payment|मंज़ूर करता/.test(s)) act = 'confirm';
    A.actions['voice.say']({ act: A.ui.listening && A.ui.listening.mode === 'mf' ? 'take' : act, text });
  }
  A.actions['voice.say'] = function (d) {
    const s = A.ui.listening;
    if (!s) return;
    const p = cur();
    const done = () => { A.ui.listening = null; A.ui.render(); A.ui.renderLayer(); };
    if (s.mode === 'chat') {
      done();
      if (d.act && d.act.indexOf('intent:') === 0) A.actions['agent.intent']({ text: d.act.slice(7) });
      else A.sim.agent.userSays(p.id, d.text);
      return;
    }
    if (s.mode === 'mf') { done(); E().anchor.mfAnswer(s.cardId, d.text, true); A.ui.render(); return; }
    const c = E().anchor.findCard(s.cardId);
    if (!c) return done();
    if (d.act === 'decline') { A.ui.listening = null; A.actions['card.decline']({ id: c.id, by: p.id }); return; }
    if (d.act === 'compare') { done(); A.ui.openSecondOpinion(c.id); return; }
    if (d.act === 'call') {
      const al = c.alertId && A.state.family.alerts.find((x) => x.id === c.alertId);
      if (al) { E().family.markActed(al.id, p.id); const ph = P(al.contacts[0].id); if (ph) A.ui.toast(t('fc.call', { member: ph.short }) + ' · ' + ph.phone); }
      return done();
    }
    if (d.act === 'approve') {
      if (c.speedBump && A.clock.now() < (c.shownAt || 0) + 10000) { A.ui.toast(t('dg.approve_in', { s: Math.ceil(((c.shownAt || 0) + 10000 - A.clock.now()) / 1000) })); return; }
      /* AC-DG-09: high stakes need the confirmation phrase, then device authentication */
      if (highStakes(c)) { A.ui.listening = { mode: 'card', cardId: c.id, confirm: true }; A.ui.render(); A.ui.renderLayer(); return; }
      done(); finishApprove(c, p.id, true); return;
    }
    if (d.act === 'confirm') { A.ui.listening = null; A.ui.authThen(() => finishApprove(c, p.id, true), pick(c.action.what), approveTarget(c)); return; }
    A.ui.toast(p.lang === 'hi' ? 'समझ नहीं आया, एक बार और बोलिए।' : 'Didn\'t catch that — please say it once more.');
  };

  /* ---------- Why this label (modal, pick 7B) ---------- */
  function resolveRef(ref) {
    const [kind, id] = ref.split(':');
    if (kind === 'card') { const c = E().anchor.findCard(id); return c ? { trust: c.trust, card: c, action: c.action, pid: c.pid } : null; }
    for (const q of Object.values(A.state.personas)) {
      const e = q.ledger.find((x) => x.id === id);
      if (e) return { trust: e.trust || (e.label ? { color: e.label, key: e.labelKey || e.label, reasons: [], alternatives: [] } : null), entry: e, action: e, pid: q.id };
    }
    return null;
  }
  A.ui.resolveRef = resolveRef;
  A.actions['trust.why'] = function (d) {
    if (d.ref && d.ref.indexOf('card:') === 0) E().anchor.markDetails(d.ref.slice(5));
    A.ui.sheetOpen('why', { ref: d.ref });
  };
  A.ui.sheets.why = function (args) {
    const r = resolveRef(args.ref);
    if (!r || !r.trust) return '';
    const tr = r.trust;
    const lang = L();
    const reasons = (tr.reasons || []).map((x) => {
      const vars = Object.assign({}, x.vars);
      if (vars.kindHi && lang === 'hi') vars.kind = vars.kindHi;
      return '<li><p>' + esc(A.t(x.key, vars)) + '</p><small>' + esc(t('trust.source', { src: x.source, date: U.fmtDate(x.date, lang) })) + '</small></li>';
    }).join('');
    const canSecond = tr.color !== 'green' || (tr.alternatives && tr.alternatives.length);
    const body = '<div class="why">' + A.ui.trustChip(tr) +
      '<p class="mut">' + esc(lang === 'hi' ? 'सबसे गंभीर कारण रंग तय करता है:' : 'The worst finding sets the colour:') + '</p>' +
      (reasons ? '<ul class="why-list">' + reasons + '</ul>' : '<p class="mut">' + esc(t('trust.r.clean')) + '</p>') +
      (tr.bestPrice ? '<p><span class="best">' + esc(t('trust.best_price')) + '</span></p>' : '') +
      '<div class="modal-acts">' +
      (canSecond ? '<button class="btn-buy is-block" data-action="trust.second" data-ref="' + esc(args.ref) + '" data-tag="FR-TC-04"><span class="btn-buy-main">' + esc(t('trust.second')) + '</span></button>' : '') +
      '<button class="text-act" data-action="trust.report" data-ref="' + esc(args.ref) + '" data-tag="FR-TC-11">' + ic('flag') + esc(t('trust.report')) + '</button></div></div>';
    return A.ui.sheetFrame(t('trust.why'), body, { sub: A.ui.trustText(tr) });
  };
  A.actions['trust.second'] = function (d) {
    const r = resolveRef(d.ref);
    if (r && r.card) A.ui.openSecondOpinion(r.card.id);
    else A.ui.sheetOpen('second', { ref: d.ref, startedAt: Date.now() });
  };
  A.actions['trust.report'] = (d) => A.ui.sheetOpen('report', { ref: d.ref, reason: 'trust.report_r1', send: true });
  A.ui.sheets.report = function (args) {
    const reasons = [['trust.report_r1', t('trust.report_r1')], ['trust.report_r2', t('trust.report_r2')], ['trust.report_r3', t('trust.report_r3')]];
    const body = '<div class="form"><span class="flabel">' + esc(t('trust.report_q')) + '</span>' + A.ui.pills(reasons, args.reason, 'rep.reason') +
      '<div class="set-row"><span>' + esc(t('trust.report_send')) + '</span>' + A.ui.toggle(args.send, 'rep.send', {}) + '</div>' +
      '<button class="btn-buy is-block" data-action="trust.reportSave" data-ref="' + esc(args.ref) + '"><span class="btn-buy-main">' + esc(t('common.send')) + '</span></button></div>';
    return A.ui.sheetFrame(t('trust.report'), body, { sub: L() === 'hi' ? 'शिकायत सिर्फ़ इस फ़ोन पर सेव होगी' : 'Saved on this phone' });
  };
  A.actions['rep.reason'] = (d) => { A.state.ui.sheet.args.reason = d.v; A.ui.renderLayer(); };
  A.actions['rep.send'] = () => { const a = A.state.ui.sheet.args; a.send = !a.send; A.ui.renderLayer(); };
  A.actions['trust.reportSave'] = function (d) {
    const p = cur();
    const a = A.state.ui.sheet.args;
    p.reports.push({ ref: d.ref, reason: a.reason, anonymisedSend: !!a.send, ts: A.clock.now() });
    E().ledger.log(p.id, 'wrong-label report saved locally' + (a.send ? ' (anonymised copy sent)' : '') + ' · ' + a.reason);
    A.ui.sheetClose();
    A.ui.toast(t('trust.report_thanks'), { tone: 'ok' });
  };

  /* ---------- Second Opinion (modal, FR-TC-04..07) ---------- */
  A.ui.openSecondOpinion = function (cardId) {
    A.ui.sheetOpen('second', { ref: 'card:' + cardId, startedAt: Date.now() });
    const tick = (ms) => setTimeout(() => { if (A.state.ui.sheet && A.state.ui.sheet.type === 'second') A.ui.renderLayer(); }, ms);
    tick(950); tick(3100); tick(10100);
  };
  A.ui.sheets.second = function (args) {
    const r = resolveRef(args.ref);
    if (!r) return '';
    const a = r.action;
    const viewer = cur();
    const item = a.itemId ? A.data.catalogue.byId(a.itemId) : null;
    const elapsed = Date.now() - args.startedAt;
    const offline = A.state.flags.networkOff;
    const name = item ? item.name : U.pick(a.summary, viewer.lang);
    const pickRow = item ? '<div class="so-pick">' + A.ui.productThumb(item) + '<div class="so-info"><b>' + esc(item.name) + '</b><span>' + esc(U.pick(item.spec, viewer.lang)) + '</span></div><b class="so-price">' + esc(A.ui.money(item.price, item.period)) + '</b></div>' : '';
    let list;
    if (elapsed < 900 && !offline) list = '<div class="so-loading"><div class="sk" style="height:64px"></div><div class="sk" style="height:64px"></div><div class="sk" style="height:64px"></div></div>';
    else if (offline && elapsed < 10000) list = '<div class="so-loading">' + (elapsed > 3000 ? '<b>' + esc(t('trust.still')) + '</b>' : '') + '<div class="sk" style="height:64px"></div><div class="sk" style="height:64px"></div></div>';
    else if (offline) list = A.ui.empty('wifiOff', t('trust.none'));
    else {
      let alts = (r.trust && r.trust.alternatives) || [];
      if (!alts.length && item) { const al = E().trust.alternatives(item, P(r.pid).city); alts = al.better.concat(al.others).slice(0, 3).map((i) => i.id); }
      const cardWaiting = r.card && r.card.status === 'waiting' && viewer.id === r.card.pid;
      list = alts.length ? '<ul class="so-list">' + alts.map((id) => {
        const it = A.data.catalogue.byId(id);
        const pct = item ? Math.round((1 - it.price / item.price) * 100) : 0;
        const better = r.trust && r.trust.better && r.trust.better.indexOf(id) >= 0;
        return '<li class="so-row">' + A.ui.productThumb(it) +
          '<div class="so-info">' + (better ? '<span class="best">' + esc(L() === 'hi' ? 'बेहतर विकल्प' : 'Clearly better') + '</span>' : '') + '<b>' + esc(it.name) + '</b><span>' + esc(U.pick(it.spec, viewer.lang)) + '</span>' +
          '<small>' + esc(it.source) + ' · ' + esc(t('trust.checked', { ago: U.ago(A.clock.now() - it.checkedH * U.HOUR, viewer.lang) })) + '</small></div>' +
          '<div class="so-right"><b>' + esc(A.ui.money(it.price, it.period)) + '</b>' + (pct > 0 ? '<span class="drop">↓' + pct + '%</span>' : '') +
          (cardWaiting ? '<button class="text-act" data-action="so.choose" data-card="' + r.card.id + '" data-item="' + it.id + '">' + esc(t('trust.choose')) + '</button>' : '') + '</div></li>';
      }).join('') + '</ul>' : (r.trust && r.trust.bestPrice ? '<p><span class="best">' + esc(t('trust.best_price')) + '</span></p>' : A.ui.empty('search', t('trust.none')));
    }
    const foot = '<p class="so-foot" data-tag="FR-TC-07">' + ic('info') + esc(t('trust.no_earn')) + '</p><p class="so-foot" data-tag="FR-TC-05">' + ic('lock') + esc(t('trust.query_note')) + '</p>' +
      (r.card && r.card.status === 'waiting' && viewer.id === r.card.pid ? '<div class="modal-acts"><button class="btn-out is-block" data-action="sheet.close">' + esc(t('trust.keep')) + '</button></div>' : '');
    return A.ui.sheetFrame(t('trust.second'), pickRow + list + foot, { sub: t('trust.picked', { name, price: A.ui.money(a.amount, a.period) }), tall: true });
  };
  A.actions['so.choose'] = (d) => A.ui.chooseAlternative(d.card, d.item);
  A.ui.chooseAlternative = function (cardId, itemId, skipAuth) {
    const c = E().anchor.findCard(cardId);
    if (!c || c.status !== 'waiting') return;
    const done = () => {
      E().anchor.resolve(c.id, { type: 'modify', optionId: itemId, by: c.pid });
      A.state.ui.sheet = null;
      A.ui.toast(t('dg.resolved_toast.modified'), { tone: 'ok' });
      A.ui.render(); A.ui.renderLayer();
    };
    if (skipAuth) done(); else A.ui.authThen(done, A.data.catalogue.byId(itemId).name, 'sheet');
  };

  /* ---------- Approve and remember (modal, FR-DG-13/17) ---------- */
  A.ui.sheets.remember = function (args) {
    const s = args.s;
    const p = cur();
    const hi = p.lang === 'hi';
    const scope = U.pick(s.scope, p.lang);
    const ruleText = hi ? 'एजेंट को ' + U.inr(s.max) + ' तक के ' + U.pick(s.scope, 'hi') + ' करने दें' : 'Let my agent handle ' + U.pick(s.scope, 'en') + ' up to ' + U.inr(s.max);
    const body = args.step === 1 ?
      '<div class="form" data-tag="FR-DG-17"><b class="big-q">' + esc(t('dg.remember', { scope, amount: U.inr(s.max) })) + '</b>' +
      '<div class="btn-pair"><button class="btn-out" data-action="sheet.close">' + esc(hi ? 'अभी नहीं' : 'Not now') + '</button><button class="btn-buy" data-action="rem.step2"><span class="btn-buy-main">' + esc(t('common.yes')) + '</span></button></div></div>' :
      '<div class="form" data-tag="FR-DG-13"><b class="big-q">' + esc(t('dg.remember_confirm', { rule: ruleText })) + '</b>' +
      '<p class="mut">' + esc(hi ? 'यह कभी-नहीं वाले नियम या अभिभावक की सीमा को ढीला नहीं कर सकता।' : 'It can\'t loosen a Never rule, a new-payee check or a guardian floor.') + '</p>' +
      '<div class="btn-pair"><button class="btn-out" data-action="sheet.close">' + esc(t('common.cancel')) + '</button><button class="btn-buy" data-action="rem.create"><span class="btn-buy-main">' + esc(t('common.confirm')) + '</span></button></div></div>';
    return A.ui.sheetFrame(hi ? 'नियम बनाएँ?' : 'Make this a rule?', body, { sub: hi ? '14 दिनों में 5 बार मंज़ूर, कोई मना नहीं' : 'Approved 5 times in 14 days, no declines' });
  };
  A.actions['rem.step2'] = () => { A.state.ui.sheet.args.step = 2; A.ui.renderLayer(); };
  A.actions['rem.create'] = function () {
    const s = A.state.ui.sheet.args.s;
    const p = cur();
    E().policy.addRule(p, { area: s.area, category: s.category, max: s.max, tier: 'auto', kinds: ['purchase'], exception: true, label: { en: s.scope.en + ' up to ' + U.inr(s.max), hi: U.inr(s.max) + ' तक के ' + s.scope.hi } });
    E().ledger.log(p.id, 'rule created via approve-and-remember: ' + s.scope.en + ' ≤ ' + U.inr(s.max));
    A.ui.sheetClose();
    A.ui.toast(t('dg.remember_done'), { tone: 'ok' });
    A.ui.render();
  };

  /* ---------- Me-First prompt: Flipkart card + search field + chips (pick 5B) ---------- */
  function meFirstCard(c) {
    const p = P(c.pid);
    const area = c.action.area;
    const areaName = t('area.' + area);
    if (c.status === 'resolved' && (c.resolution === 'skipped' || c.resolution === 'skipped_timeout' || c.resolution === 'released')) {
      return '<p class="quiet-line">' + ic('skip') + esc(c.resolution === 'skipped_timeout' ? t('mf.timeout') : t('res.skipped')) + ' · ' + esc(areaName) + '</p>';
    }
    if (c.status !== 'waiting') return '';
    const minor = p.role === 'minor' && area === 'school';
    const left = E().mefirst.skipsLeft(p, area);
    const guardian = minor ? P(p.guardian) : null;
    const noSkip = left <= 0;
    const listening = A.ui.listening && A.ui.listening.mode === 'mf' && A.ui.listening.cardId === c.id;
    return '<article class="card mf" data-card-shown="' + c.id + '" data-tag="FR-MF-01">' +
      '<div class="mf-top"><span class="anchor-mark is-sm">' + ic('anchor') + '</span><span class="mut">' + esc(areaName) + '</span></div>' +
      (minor ? '<span class="dtag is-purple" data-tag="FR-MF-12">' + esc(t('mf.guardian_set')) + '</span>' : '') +
      '<b class="mf-title">' + esc(t('mf.prompt_title')) + '</b>' +
      '<span class="mf-q">' + esc(t('mf.q.' + area)) + '</span>' +
      '<div class="composer is-inline"><label class="fk-search">' +
      '<input id="mf_' + c.id + '" type="text" placeholder="' + esc(t('mf.placeholder')) + '" data-enter="mf.send" data-id="' + c.id + '" aria-label="' + esc(t('mf.q.' + area)) + '">' +
      '<button class="mic' + (listening ? ' is-rec' : '') + '" data-action="' + (listening ? 'voice.stop' : 'voice.start') + '" data-mode="mf" data-id="' + c.id + '" aria-label="Voice">' + ic('mic') + '</button></label>' +
      '<button class="send-sq" data-action="mf.send" data-id="' + c.id + '" aria-label="' + esc(t('common.send')) + '">' + ic('up') + '</button></div>' +
      (listening ? listenLine() : '') +
      '<div class="chips">' +
      '<button class="chip" data-action="mf.notsure" data-id="' + c.id + '">' + esc(t('mf.not_sure')) + '</button>' +
      '<button class="chip" data-action="mf.skip" data-id="' + c.id + '"' + (noSkip ? ' disabled aria-disabled="true"' : '') + ' data-tag="FR-MF-05">' + esc(t('mf.skip')) + '</button>' +
      (!minor ? '<button class="chip" data-action="mf.notnow" data-id="' + c.id + '">' + esc(t('mf.not_now')) + '</button>' : '') +
      '<button class="chip is-quiet" data-action="mf.notthis" data-id="' + c.id + '">' + esc(t('mf.not_this')) + '</button></div>' +
      (minor ? (noSkip ?
        '<div class="tint-line" data-tag="AC-MF-08"><span>' + esc(t('mf.skip_limit', { n: E().mefirst.skipAllowance(p, area) })) + '</span><button class="text-act" data-action="mf.askGuardian" data-id="' + c.id + '">' + esc(t('mf.ask_guardian', { name: guardian.short })) + '</button></div>' :
        '<small class="mut">' + esc(left === Infinity ? '' : t('mf.skips_left', { n: left })) + ' · ' + esc(t('mf.tutor_note')) + '</small>') : '') +
      '</article>';
  }
  A.actions['mf.send'] = function (d) {
    const el = document.getElementById('mf_' + d.id);
    const v = el && el.value.trim();
    if (!v) { el && el.focus(); return; }
    A.ui.stickChat = true;
    E().anchor.mfAnswer(d.id, v);
    A.ui.render();
  };
  A.actions['mf.notsure'] = (d) => { A.ui.stickChat = true; E().anchor.mfAnswer(d.id, A.t('mf.not_sure')); A.ui.render(); };
  A.actions['mf.skip'] = function (d) {
    const r = E().anchor.mfSkip(d.id);
    if (r && r.limit) A.ui.toast(A.t('mf.skip_limit', { n: 2 }));
    A.ui.stickChat = true;
    A.ui.render();
  };
  A.actions['mf.notnow'] = (d) => { E().anchor.mfNotNow(d.id); A.ui.render(); };
  A.actions['mf.notthis'] = (d) => { E().anchor.mfSkip(d.id, 'not_this'); E().ledger.log(cur().id, 'classifier feedback: not this kind of thing (FR-CL-01)'); A.ui.render(); };
  A.actions['mf.askGuardian'] = function () {
    const p = cur();
    E().anchor.notify(p.guardian, { tier: 'decision', tab: 'family', text: { en: p.short + ' asks for more schoolwork skips today', hi: p.short + ' आज पढ़ाई में और स्किप माँग रहे हैं' } });
    E().family.relay('skip_request', p.id, p.guardian, { area: 'school' });
    A.ui.toast(t('mf.asked_guardian', { name: P(p.guardian).short }), { tone: 'ok' });
  };

  /* "Your take" above "Agent's suggestion" (FR-MF-03) */
  function builtCard(p, m) {
    const c = E().anchor.findCard(m.cardId);
    if (!c) return '';
    const resolved = c.status === 'resolved';
    const hi = L() === 'hi';
    const take = '<div class="card take" data-tag="FR-MF-03"><span class="mut">' + ic('user') + esc(t('mf.your_take')) + '</span><p>' + esc(m.take) + '</p></div>';
    let sugg = '';
    const pair = (ownLabel, agentLabel) => '<div class="btn-pair"><button class="btn-out" data-action="mf.pick" data-id="' + c.id + '" data-choice="agent">' + esc(agentLabel) + '</button><button class="btn-buy" data-action="mf.pick" data-id="' + c.id + '" data-choice="own"><span class="btn-buy-main">' + esc(ownLabel) + '</span></button></div>';
    const picked = (txt) => '<p class="quiet-line is-ok">' + ic('checkCircle') + esc(txt) + '</p>';
    if (m.tutor) {
      sugg = '<div class="card"><span class="mut">' + ic('agent') + esc(t('mf.agent_suggestion')) + ' · ' + esc(t('mf.tutor_note')) + '</span><p>' + esc(pick(m.hint)) + '</p>' +
        (resolved ? picked(c.picked === 'own' ? (hi ? 'आपने ख़ुद हल किया' : 'You worked it out') : pick(m.answer)) : pair(hi ? 'समझ गया — मेरा रखें' : 'Got it — keep mine', hi ? 'पूरा हल दिखाओ' : 'Show full answer')) + '</div>';
    } else if (m.items) {
      const own = m.ownPick && A.data.catalogue.byId(m.ownPick);
      sugg = promo(t('mf.agent_suggestion') + ' · ' + (hi ? 'आपके विचार पर' : 'built on your idea'), m.items, resolved ? null : c.id) +
        (own && m.items.indexOf(own.id) < 0 && !resolved ? '<div class="card is-row"><span>' + esc(hi ? 'एजेंट का अपना सुझाव: ' : 'Agent\'s own idea: ') + '<b>' + esc(own.name) + '</b> · ' + esc(U.inr(own.price)) + '</span><button class="text-act" data-action="mf.pick" data-id="' + c.id + '" data-choice="agent">' + esc(t('mf.use_agent')) + '</button></div>' : '') +
        (resolved ? picked(c.picked === 'own' ? (hi ? 'आपकी पसंद — आपका फ़ैसला' : 'Your pick — counted as yours') : (hi ? 'एजेंट का सुझाव चुना' : 'Agent\'s idea chosen')) : '');
    } else if (m.draft) {
      sugg = '<div class="card"><span class="mut">' + ic('agent') + esc(t('mf.agent_suggestion')) + '</span><p>' + esc(pick(m.draft)) + '</p>' +
        (resolved ? picked(c.picked === 'own' ? t('mf.keep') : t('mf.use_agent')) : pair(t('mf.keep'), t('mf.use_agent'))) + '</div>';
    }
    return '<div class="built">' + take + sugg + '</div>';
  }
  A.actions['mf.pick'] = function (d) { E().anchor.mfPick(d.id, d.choice === 'own' ? 'own' : 'agent'); A.ui.render(); };

  /* Flipkart "Still looking for these?" promo card with white mini-cards */
  function promo(title, ids, cardId) {
    return '<div class="promo-card"><b class="promo-title">' + esc(title) + '</b><div class="rail">' + ids.map((id) => {
      const it = A.data.catalogue.byId(id);
      if (!it) return '';
      return '<div class="mini">' + A.ui.productThumb(it) + '<span class="mini-label">' + esc(it.name) + '</span><b class="mini-value">' + esc(U.inr(it.price)) + '</b>' +
        (cardId ? '<button class="text-act" data-action="mf.pick" data-id="' + cardId + '" data-choice="own">' + esc(t('mf.pick')) + '</button>' : '') + '</div>';
    }).join('') + '</div></div>';
  }
  A.ui.promo = promo;

  /* Speed-bump countdowns without a full re-render */
  setInterval(() => {
    const now = A.clock.now();
    document.querySelectorAll('[data-sb-until]').forEach((b) => {
      const until = +b.getAttribute('data-sb-until');
      const label = b.querySelector('.btn-buy-main') || b;
      if (now >= until) {
        if (b.disabled) { b.disabled = false; b.removeAttribute('aria-disabled'); label.textContent = b.getAttribute('data-sb-label') || t('dg.approve'); }
      } else label.textContent = t('dg.approve_in', { s: Math.ceil((until - now) / 1000) });
    });
  }, 250);
})();
