/* Family Circle (PRD 5): consent links, Trusted Circle alerts with escalation, co-approval,
   Learner's Licence levels, safety exit. Transparency, not surveillance. */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;

  const ESCALATE = { critical: 15 * U.MIN, decision: 2 * U.HOUR };

  function fam() { return A.state.family; }
  function P(id) { return A.state.personas[id]; }

  function linksAsMember(pid) { return fam().links.filter((l) => l.member === pid && !l.removed).sort((a, b) => a.order - b.order); }
  function linksAsContact(pid) { return fam().links.filter((l) => l.contact === pid && !l.removed); }
  function link(member, contact) { return fam().links.find((l) => l.member === member && l.contact === contact && !l.removed); }
  function contactName(l, lang) { return l.external ? l.contactName : P(l.contact).short; }

  /* What a linked person sees about the member (FR-FC-04) */
  function sees(l) {
    if (l.paused) return [];
    const items = [];
    if (l.share.alerts) items.push('alerts');
    if (l.share.summary) items.push('summary');
    if (l.share.levels) items.push('levels');
    if (l.share.skips) items.push('skips');
    return items;
  }

  /* ---------- Alerts ---------- */
  function raiseAlert(spec) {
    const contacts = linksAsMember(spec.member).filter((l) => l.share.alerts && !l.paused);
    if (!contacts.length) return null;
    const alert = Object.assign({
      id: U.uid('al'), sentAt: A.clock.now(), status: 'open', idx: 0,
      contacts: contacts.map((l) => ({ id: l.contact, name: contactName(l), external: !!l.external, alertedAt: null })),
      escalateAfter: ESCALATE[spec.tier] || ESCALATE.critical
    }, spec);
    alert.contacts[0].alertedAt = alert.sentAt;
    fam().alerts.unshift(alert);
    relay('alert', spec.member, alert.contacts[0].id, { tier: spec.tier, category: spec.category, band: spec.band, why: spec.why });
    notifyContact(alert, 0);
    A.engine.ledger.log(spec.member, 'Family alert (' + spec.tier + ') → ' + alert.contacts[0].name);
    return alert;
  }
  function notifyContact(alert, idx) {
    const c = alert.contacts[idx];
    if (c.external) return;
    A.engine.anchor.notify(c.id, { tier: alert.tier, alertId: alert.id, tab: 'family', text: { en: A.t('fc.alert_title', { member: memberLabel(alert.member, 'en') }, 'en'), hi: A.t('fc.alert_title', { member: memberLabel(alert.member, 'hi') }, 'hi') } });
  }
  function memberLabel(pid, lang) { const p = P(pid); return p.familyName && lang !== 'hi' ? p.familyName : p.familyName || p.short; }

  /* FR-FC-07 escalation, run on every clock tick */
  function tick() {
    const now = A.clock.now();
    let changed = false;
    fam().alerts.forEach((al) => {
      if (al.status !== 'open') return;
      const cur = al.contacts[al.idx];
      if (al.idx < al.contacts.length - 1 && now - cur.alertedAt >= al.escalateAfter && !al.actedBy) {
        al.idx++;
        al.contacts[al.idx].alertedAt = now;
        relay('escalate', al.member, al.contacts[al.idx].id, { tier: al.tier });
        A.engine.ledger.log(al.member, 'Alert escalated to ' + al.contacts[al.idx].name + ' (FR-FC-07)');
        notifyContact(al, al.idx);
        changed = true;
      }
    });
    return changed;
  }
  function resolveAlert(alertId, outcome, by) {
    const al = fam().alerts.find((a) => a.id === alertId);
    if (!al || al.status !== 'open') return;
    al.status = 'resolved'; al.outcome = outcome; al.resolvedBy = by; al.resolvedAt = A.clock.now();
    relay('resolved', al.member, by, { outcome });
    /* FC-E6: deferred removals take effect now */
    fam().links.forEach((l) => { if (l.member === al.member && l.removePending) { l.removed = true; l.removePending = false; } });
  }
  function alertForCard(cardId) { return fam().alerts.find((a) => a.cardId === cardId); }
  function openAlertsFor(contactId) { return fam().alerts.filter((a) => a.contacts.slice(0, a.idx + 1).some((c) => c.id === contactId)); }
  function markActed(alertId, by) { const al = fam().alerts.find((a) => a.id === alertId); if (al) al.actedBy = by; }

  function relay(type, from, to, payload) {
    fam().relay.unshift({ ts: A.clock.now(), type, from, to, payload, encrypted: true });
    A.bus.emit('relay');
  }

  /* ---------- Learner's Licence ---------- */
  const LIMITS = {
    money: [null, { auto: 0, child: 0 }, { auto: 500, child: 500 }, { auto: 2000, child: 5000 }, { auto: 0, child: Infinity, alertAt: 10000 }],
    shopping: [null, { auto: 0, child: 0 }, { auto: 0, child: 500 }, { auto: 0, child: 2000 }, { auto: 0, child: Infinity, alertAt: 5000 }]
  };
  function licenceArea(action) {
    if (action.kind === 'payment') return 'money';
    if (['purchase', 'subscription', 'booking'].indexOf(action.kind) >= 0) return 'shopping';
    if (action.kind === 'message' && action.counterparty && !action.counterparty.known) return 'messages';
    return null;
  }
  function licenceVerdict(p, action, amount) {
    if (!p.licence) return null;
    const area = licenceArea(action);
    if (!area) return null;
    const level = p.licence[area].level;
    if (area === 'messages') return { area, level, approver: level === 1 ? 'guardian' : 'auto' };
    const lim = LIMITS[area][level];
    const amt = amount || 0;
    if (amt <= lim.auto) return { area, level, approver: 'auto' };
    if (amt <= lim.child) return { area, level, approver: 'child' };
    return { area, level, approver: 'guardian' };
  }
  function criteria(p, area) {
    const l = p.licence[area];
    const weeks = Math.max(0, 4 - l.weeks), decisions = Math.max(0, 10 - l.decisions);
    return { weeks, decisions, met: weeks === 0 && decisions === 0 && l.level < 4 };
  }
  function requestLevel(pid, area) {
    const p = P(pid);
    const req = { id: U.uid('lr'), member: pid, guardian: p.guardian, area, to: p.licence[area].level + 1, status: 'open', ts: A.clock.now() };
    fam().levelRequests.unshift(req);
    relay('level_request', pid, p.guardian, { area, to: req.to });
    A.engine.anchor.notify(p.guardian, { tier: 'decision', tab: 'family', text: { en: A.t('fc.level_request', { name: p.short, area: A.t('area.' + area, null, 'en'), n: req.to }, 'en'), hi: A.t('fc.level_request', { name: p.short, area: A.t('area.' + area, null, 'hi'), n: req.to }, 'hi') } });
    return req;
  }
  function decideLevel(reqId, approve) {
    const req = fam().levelRequests.find((r) => r.id === reqId);
    if (!req || req.status !== 'open') return;
    req.status = approve ? 'approved' : 'declined';
    if (approve) setLevel(req.member, req.area, req.to);
  }
  function setLevel(pid, area, level, reason) {
    const p = P(pid);
    p.licence[area].level = level;
    p.licence[area].weeks = 0; p.licence[area].decisions = 0;
    const text = { en: A.t('fc.level_changed', { area: A.t('area.' + area, null, 'en'), n: level }, 'en'), hi: A.t('fc.level_changed', { area: A.t('area.' + area, null, 'hi'), n: level }, 'hi') };
    A.engine.anchor.notify(pid, { tier: 'decision', tab: 'family', text });
    A.engine.anchor.notify(p.guardian, { tier: 'decision', tab: 'family', text });
    A.engine.ledger.log(pid, 'Learner\'s Licence ' + area + ' → Level ' + level + (reason ? ' (' + reason + ')' : ''));
  }

  /* ---------- Links ---------- */
  function pauseSharing(member, contact, paused) {
    const l = link(member, contact);
    if (!l) return;
    l.paused = paused;
    relay(paused ? 'paused' : 'resumed', member, contact, {});
  }
  function removeLink(member, contact) {
    const l = link(member, contact);
    if (!l) return { ok: false };
    const open = fam().alerts.some((a) => a.member === member && a.status === 'open' && a.tier === 'critical');
    if (open) { l.removePending = true; return { ok: true, deferred: true }; }
    l.removed = true;
    return { ok: true };
  }
  function logView(member, viewer, what) {
    const p = P(member);
    p.views.unshift({ ts: A.clock.now(), viewer, what });
  }
  function createInvite(from, relation) {
    const code = String(100000 + Math.floor(Math.random() * 900000));
    const inv = { code, from, relation, ts: A.clock.now(), status: 'pending' };
    fam().invites.unshift(inv);
    return inv;
  }
  function join(pid, code, choices) {
    const inv = fam().invites.find((i) => i.code === code && i.status === 'pending');
    if (!inv) return { ok: false };
    inv.status = 'accepted';
    const l = { id: U.uid('L'), kind: 'trusted', member: pid, contact: inv.from, order: linksAsMember(pid).length + 1, share: { alerts: !!choices.alerts, summary: !!choices.summary }, coApproval: choices.co ? { redLabel: true, over: 25000 } : null, paused: false, since: A.clock.now() };
    fam().links.push(l);
    relay('linked', pid, inv.from, {});
    A.engine.anchor.notify(inv.from, { tier: 'decision', tab: 'family', text: { en: P(pid).short + ' accepted your invite.', hi: P(pid).short + ' ने आपका आमंत्रण स्वीकार किया।' } });
    return { ok: true, link: l };
  }

  A.engine.family = { linksAsMember, linksAsContact, link, sees, contactName, raiseAlert, tick, resolveAlert, alertForCard, openAlertsFor, markActed, relay, licenceVerdict, licenceArea, criteria, requestLevel, decideLevel, setLevel, pauseSharing, removeLink, logView, createInvite, join, memberLabel, LIMITS };
})();
