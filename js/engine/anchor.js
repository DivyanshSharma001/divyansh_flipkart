/* Anchor Connect orchestration: POST /anchor/hook verdicts, decision cards, resolutions,
   co-approval, expiry, notifications, restart after "kill Anchor", protocol violations.
   Anchor never initiates, edits or executes — it only allows, holds or blocks (PRD 2). */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;
  const E = A.engine;

  function P(id) { return A.state.personas[id]; }
  const RANK = () => E.policy.RANK;

  const SCAM_SIGNALS = ['account_block', 'secrecy', 'impersonation_bank', 'impersonation_police', 'digital_arrest', 'kyc_threat', 'remote_access', 'urgency'];

  function scamSignals(action) {
    const s = action.signals || [];
    const strong = s.filter((x) => SCAM_SIGNALS.indexOf(x) >= 0);
    return strong.length >= 2 || s.indexOf('digital_arrest') >= 0 || s.indexOf('remote_access') >= 0;
  }

  function ledgerBase(p, action, trust) {
    return {
      area: action.area, kind: action.kind, category: action.category, summary: action.summary,
      amount: action.amount, counterparty: action.counterparty || null, merchantId: action.merchantId,
      label: trust ? trust.color : null, labelKey: trust ? trust.key : null, trust: trust || null,
      routine: !!action.routine, meaningful: action.meaningful !== false, agent: p.agentName, actionId: action.id
    };
  }

  function declinedRecently(p, action) {
    if (!action.counterparty) return false;
    const recent = E.ledger.since(p.id, U.DAY).filter((e) => e.counterparty && e.counterparty.id === action.counterparty.id &&
      e.kind === action.kind && (e.resolution === 'declined' || e.resolution === 'contact_declined'));
    return recent.length >= 2;
  }

  /* ---------------- POST /anchor/hook ---------------- */
  function hook(pid, action) {
    const p = P(pid);
    if (A.state.flags.anchorKilled) return { verdict: 'unreachable' };
    const t0 = performance.now();
    action.id = action.id || U.uid('act');
    E.ledger.trace(pid, 'hook ← ' + (action.kind) + (action.amount ? ' ' + U.inr(action.amount) : '') + ' · ' + U.pick(action.summary, 'en'), { kind: action.kind, area: action.area, amount: action.amount, counterparty: action.counterparty && action.counterparty.name, disclosures: action.disclosures, urgency: action.urgency || 'normal' });

    /* Me-First (PRD 4) — drafts and recommendations */
    if (action.kind === 'draft' || action.kind === 'recommendation') {
      const mf = E.mefirst.shouldHold(p, { type: action.kind, area: action.area, urgency: action.urgency, tags: action.tags, threadId: action.threadId });
      E.ledger.trace(pid, 'me-first: ' + (mf.hold ? 'hold_for_user (me_first.hold)' : 'pass · ' + mf.why), {});
      if (mf.hold) {
        E.mefirst.shown(p, action.area, action.threadId);
        const card = createCard(p, action, { type: 'mefirst', tier: 'ask' });
        return { verdict: 'hold_for_user', reason: 'me_first.hold', cardId: card.id, latencyMs: Math.round(performance.now() - t0) };
      }
      if (mf.why === 'cap_reached') E.ledger.log(pid, 'me-first cap_reached · passed through (FR-MF-07)');
      return { verdict: 'allow', reason: mf.why, latencyMs: Math.round(performance.now() - t0) };
    }

    if (declinedRecently(p, action)) {
      E.ledger.add(pid, Object.assign(ledgerBase(p, action, null), { resolution: 'blocked', status: 'blocked', reasonKey: 'dg.recent_decline', meaningful: false }));
      E.ledger.trace(pid, 'block · user_declined_recently (DG-E12)', {});
      return { verdict: 'block', reason: 'user_declined_recently' };
    }

    const trust = E.trust.assess(p, action);
    if (trust) E.ledger.trace(pid, 'trust: ' + trust.color + ' (' + trust.key + ')', { reasons: trust.reasons.map((r) => r.key) });
    if (trust && !A.state.flags.networkOff && trust.itemId) E.ledger.trace(pid, 'second-opinion query →', E.trust.secondOpinionQuery(p, action));
    const pol = E.policy.evaluate(p, action);
    pol.trace.forEach((t) => E.ledger.trace(pid, 'policy: ' + t, {}));
    let tier = pol.tier, sb = pol.speedBump, critical = false;
    const reasons = [];

    if (trust && trust.key === 'red_fraud') { /* FR-TC-08 */
      if (RANK()[tier] < RANK().ask) tier = 'ask';
      sb = true; critical = true; reasons.push('fraud');
      E.ledger.trace(pid, 'fraud-list counterparty → Ask + Speed Bump regardless of tier (FR-TC-08)', {});
    }
    if (scamSignals(action)) {
      if (RANK()[tier] < RANK().ask) tier = 'ask';
      sb = true; critical = true; reasons.push('scam_signals');
      E.ledger.trace(pid, 'scam signals ' + action.signals.join(', ') + ' → Critical + Speed Bump', {});
    }
    if ((action.amount || 0) >= 50000 && tier === 'ask') sb = true;
    const latencyMs = Math.round(performance.now() - t0);
    const base = ledgerBase(p, action, trust);

    if (tier === 'auto' || tier === 'notify') {
      const e = E.ledger.add(pid, Object.assign(base, { resolution: 'autopilot', status: tier === 'notify' ? 'notified' : 'allowed', latencyMs }));
      E.ledger.trace(pid, 'verdict → allow (' + tier + ') in ' + latencyMs + ' ms', {});
      return { verdict: 'allow', tier, entryId: e.id, trust, latencyMs };
    }
    if (tier === 'never') {
      E.ledger.add(pid, Object.assign(base, { resolution: 'blocked', status: 'blocked', reasonKey: action.kind === 'loan' ? 'dg.blocked_loans' : 'dg.blocked' }));
      E.ledger.trace(pid, 'verdict → block (rule.never)', {});
      if (p.settings.tellBlocked) notify(pid, { tier: 'info', tab: 'guard', text: { en: A.t('dg.blocked', null, 'en') + ': ' + U.pick(action.summary, 'en'), hi: A.t('dg.blocked', null, 'hi') } });
      return { verdict: 'block', reason: 'rule.never', message: action.kind === 'loan' ? 'dg.blocked_loans' : 'dg.blocked' };
    }

    /* Ask */
    const card = createCard(p, action, { type: 'decision', tier, speedBump: sb, trust, approver: pol.approver, critical, total: pol.total, failSafe: pol.failSafe, reasons });
    const e = E.ledger.add(pid, Object.assign(base, { resolution: 'pending', status: 'held', cardId: card.id }));
    card.ledgerId = e.id;

    /* Co-approval and Trusted Circle alerts (PRD 5) */
    const links = E.family.linksAsMember(pid).filter((l) => l.kind === 'trusted' && !l.paused);
    const coLink = links.find((l) => l.coApproval && ((trust && trust.color === 'red') || (action.amount || 0) > l.coApproval.over));
    if (coLink && !coLink.external) card.co = { contact: coLink.contact, approvals: {} };
    const newBig = action.counterparty && !action.counterparty.known && (action.amount || 0) >= 10000 && action.kind === 'payment';
    if (links.length && (critical || newBig)) {
      const al = E.family.raiseAlert({
        member: pid, tier: 'critical', cardId: card.id, category: action.kind, band: U.band(action.amount || 0),
        why: trust && trust.key === 'red_fraud' ? 'fraud' : critical ? 'scam_signals' : 'new_payee', counterpartyType: action.counterparty && action.counterparty.known ? 'known' : 'new'
      });
      if (al) card.alertId = al.id;
    }
    if (card.approver === 'guardian') {
      notify(p.guardian, { tier: 'decision', tab: 'family', cardId: card.id, text: { en: p.short + '\'s agent needs your approval', hi: p.short + ' के एजेंट को आपकी मंज़ूरी चाहिए' } });
    }
    E.ledger.trace(pid, 'verdict → hold_for_user' + (sb ? ' + Speed Bump' : '') + (card.approver === 'guardian' ? ' (guardian approves)' : '') + (card.co ? ' (co-approval)' : ''), {});
    notify(pid, { tier: card.critical ? 'critical' : 'decision', tab: 'guard', cardId: card.id, silent: true, text: { en: A.t('set.lock_sample', null, 'en'), hi: A.t('set.lock_sample', null, 'hi') } });
    return { verdict: 'hold_for_user', cardId: card.id, trust, latencyMs };
  }

  function createCard(p, action, opts) {
    const now = A.clock.now();
    const agentExpiry = action.expiresAt || now + 48 * U.HOUR;
    const card = Object.assign({
      id: U.uid('card'), pid: p.id, action, createdAt: now, status: 'waiting',
      expiresAt: Math.min(agentExpiry, now + 24 * U.HOUR), agentExpiresAt: agentExpiry,
      shownAt: null, detailsOpened: false, approver: 'self'
    }, opts);
    p.cards.unshift(card);
    A.bus.emit('card', card);
    return card;
  }

  function findCard(cardId) {
    for (const p of Object.values(A.state.personas)) {
      const c = p.cards.find((x) => x.id === cardId);
      if (c) return c;
    }
    return null;
  }

  function markShown(cardId) { const c = findCard(cardId); if (c && !c.shownAt) c.shownAt = A.clock.now(); }
  function markDetails(cardId) { const c = findCard(cardId); if (c) c.detailsOpened = true; }

  /* ---------------- Resolution (POST /agent/callback) ---------------- */
  function resolve(cardId, decision) {
    const card = findCard(cardId);
    if (!card || card.status !== 'waiting') return { ok: false, reason: 'not_waiting' };
    const p = P(card.pid);
    const by = decision.by || card.pid;
    const isOwner = by === card.pid;

    if (card.co && decision.type === 'approve') {
      card.co.approvals[by] = 'approve';
      const need = [card.pid, card.co.contact];
      if (!need.every((id) => card.co.approvals[id] === 'approve')) {
        E.ledger.log(card.pid, 'co-approval: ' + P(by).short + ' approved; waiting for ' + need.filter((id) => card.co.approvals[id] !== 'approve').map((id) => P(id).short).join(', '));
        A.bus.emit('card', card);
        return { ok: true, partial: true };
      }
    }

    let res;
    if (decision.type === 'approve') {
      if (!isOwner && card.approver === 'guardian') res = 'guardian_approved';
      else {
        const dwell = (A.clock.now() - (card.shownAt || card.createdAt)) / 1000;
        card.dwell = dwell;
        res = dwell < 3 && !card.detailsOpened ? 'approved_quick' : 'approved_considered';
      }
    } else if (decision.type === 'modify') res = 'modified';
    else res = isOwner ? 'declined' : card.approver === 'guardian' ? 'guardian_declined' : 'contact_declined';

    card.status = 'resolved'; card.resolution = res; card.resolvedAt = A.clock.now(); card.resolvedBy = by;
    if (decision.optionId) card.chosen = decision.optionId;
    const status = decision.type === 'decline' ? 'declined' : 'held';
    const patch = { resolution: res, status, resolvedBy: by, dwell: card.dwell, detailsOpened: card.detailsOpened };
    if (decision.optionId) {
      const it = A.data.catalogue.byId(decision.optionId);
      if (it) patch.chosen = { name: it.name, price: it.price };
    }
    E.ledger.update(card.pid, card.ledgerId, patch);
    E.ledger.trace(card.pid, 'resolution → ' + res + ' by ' + P(by).short + (decision.viaVoice ? ' (voice)' : ''), {});

    if (card.alertId) {
      E.family.resolveAlert(card.alertId, res, by);
      /* Both ledgers record the outcome (PRD 5 flow 2) — not counted in the contact's own ALR */
      const al = A.state.family.alerts.find((a) => a.id === card.alertId);
      al && al.contacts.filter((c) => !c.external).forEach((c) => {
        E.ledger.add(c.id, { area: 'messages', kind: 'family', summary: { en: 'Family alert for ' + p.short + ': ' + A.t('res.' + (res === 'contact_declined' ? 'declined' : res), null, 'en'), hi: p.short + ' का पारिवारिक अलर्ट: ' + A.t('res.' + (res === 'contact_declined' ? 'declined' : res), null, 'hi') }, resolution: 'family', status: status, meaningful: false, routine: true });
      });
    }

    const verdict = decision.type === 'approve' ? 'approved' : decision.type === 'modify' ? 'modified' : 'declined';
    if (A.sim.agent) A.sim.agent.callback(card.pid, card, { verdict, optionId: decision.optionId });
    A.bus.emit('card', card);

    /* FR-DG-17 approve-and-remember suggestion */
    let suggest = null;
    if (verdict === 'approved' && isOwner) suggest = rememberSuggestion(p, card);
    return { ok: true, resolution: res, suggest };
  }

  function rememberSuggestion(p, card) {
    const a = card.action;
    if (!a.category || card.speedBump || (a.amount || 0) >= 50000) return null;
    const t0 = A.clock.now() - 14 * U.DAY;
    const same = p.ledger.filter((e) => e.ts >= t0 && e.category === a.category && e.area === a.area && (e.amount || 0) >= 5000);
    if (same.some((e) => e.resolution === 'declined')) return null;
    const approvals = same.filter((e) => e.resolution === 'approved_considered' || e.resolution === 'approved_quick');
    if (approvals.length < 5) return null;
    const max = Math.ceil(Math.max.apply(null, approvals.map((e) => e.amount)) * 1.25 / 1000) * 1000;
    const scope = { en: a.category === 'groceries' ? 'grocery orders' : a.category + ' purchases', hi: a.category === 'groceries' ? 'राशन ऑर्डर' : a.category + ' ख़रीद' };
    return { pid: p.id, area: a.area, category: a.category, max, scope };
  }

  /* ---------------- Me-First resolutions ---------------- */
  function mfAnswer(cardId, take, viaVoice) {
    const card = findCard(cardId);
    if (!card || card.status !== 'waiting') return;
    const p = P(card.pid);
    const r = E.mefirst.answered(p, card.action.area, take);
    card.status = 'answered'; card.take = take; card.lowEffort = r.low; card.answeredAt = A.clock.now();
    E.ledger.trace(card.pid, 'me-first → approved with user_take' + (r.low ? ' (low_effort, metrics only)' : '') + (viaVoice ? ' · voice' : ''), { user_take: take });
    if (A.sim.agent) A.sim.agent.callback(card.pid, card, { verdict: 'approved', user_take: take, response_style: card.action.area === 'school' ? 'tutor' : 'build_on_user' });
    A.bus.emit('card', card);
  }
  function mfPick(cardId, choice) {
    const card = findCard(cardId);
    if (!card || card.status !== 'answered') return;
    const p = P(card.pid);
    const res = choice === 'own' ? 'authored' : 'approved_considered';
    if (res === 'authored') E.mefirst.authored(p, card.action.area);
    card.status = 'resolved'; card.resolution = res; card.picked = choice;
    E.ledger.add(card.pid, { area: card.action.area, kind: card.action.kind, category: card.action.category, summary: card.action.summary, resolution: res, status: 'held', meaningful: true, label: null });
    E.ledger.trace(card.pid, 'me-first decision → ' + res + ' (FR-MF-15)', {});
    A.bus.emit('card', card);
  }
  function mfSkip(cardId, why) {
    const card = findCard(cardId);
    if (!card || card.status !== 'waiting') return { ok: false };
    const p = P(card.pid);
    if (why !== 'timeout' && why !== 'not_this') {
      const r = E.mefirst.skip(p, card.action.area);
      if (!r.ok) return { ok: false, limit: true };
    }
    card.status = 'resolved'; card.resolution = why === 'timeout' ? 'skipped_timeout' : why === 'not_this' ? 'released' : 'skipped';
    E.ledger.add(card.pid, { area: card.action.area, kind: card.action.kind, summary: card.action.summary, resolution: 'skipped', status: 'allowed', meaningful: why !== 'not_this', routine: false });
    E.ledger.trace(card.pid, 'me-first → ' + card.resolution + ' (answer released, no follow-up message)', {});
    if (A.sim.agent) A.sim.agent.callback(card.pid, card, { verdict: 'approved', skipped: true });
    A.bus.emit('card', card);
    return { ok: true };
  }
  function mfNotNow(cardId) {
    const card = findCard(cardId);
    if (!card) return;
    E.mefirst.snooze(P(card.pid), card.action.area);
    mfSkip(cardId, 'not_this');
  }

  /* ---------------- Notifications (inside Anchor only, FR-FC-12) ---------------- */
  function notify(pid, n) {
    const p = P(pid);
    if (!p) return;
    const item = Object.assign({ id: U.uid('n'), ts: A.clock.now(), read: false }, n);
    p.notifications.unshift(item);
    A.bus.emit('notify', { pid, item });
  }

  /* ---------------- Activity stream (POST /anchor/events) ---------------- */
  function event(pid, ev) {
    const p = P(pid);
    if (ev.type === 'executed' && !ev.viaHook) {
      /* G8 protocol violation: executed without asking Anchor */
      E.ledger.add(pid, { area: ev.action.area, kind: ev.action.kind, category: ev.action.category, summary: ev.action.summary, amount: ev.action.amount, counterparty: ev.action.counterparty, merchantId: ev.action.merchantId, resolution: 'violation', status: 'unchecked', label: null, violation: true });
      E.ledger.trace(pid, 'activity stream: executed without hook → protocol violation (G8)', {});
      notify(pid, { tier: 'critical', tab: 'guard', text: { en: A.t('dg.violation', null, 'en'), hi: A.t('dg.violation', null, 'hi') }, detail: ev.action.summary });
    }
  }

  /* ---------------- Clock tick: expiry, escalation, statements, Me-First timeout ---------------- */
  function tick() {
    const now = A.clock.now();
    let changed = false;
    Object.values(A.state.personas).forEach((p) => {
      p.cards.forEach((c) => {
        if (c.type === 'mefirst' && c.status === 'waiting' && now - c.createdAt > 10 * U.MIN) { mfSkip(c.id, 'timeout'); changed = true; return; }
        if (c.type !== 'decision' || c.status !== 'waiting') return;
        const high = c.speedBump || (c.action.amount || 0) >= 50000;
        if (now >= c.expiresAt && (!high || now >= c.agentExpiresAt)) {
          /* FR-DG-10: Anchor never approves on expiry */
          c.status = 'resolved'; c.resolution = 'expired'; c.resolvedAt = now;
          E.ledger.update(p.id, c.ledgerId, { resolution: 'expired', status: 'expired' });
          E.ledger.trace(p.id, 'card expired → declined with reason expired (FR-DG-10)', {});
          if (c.alertId) E.family.resolveAlert(c.alertId, 'expired', 'system');
          if (A.sim.agent) A.sim.agent.callback(p.id, c, { verdict: 'declined', reason: 'expired' });
          changed = true;
        }
      });
    });
    if (E.family.tick()) changed = true;
    if (E.statement.releaseDue()) changed = true;
    return changed;
  }

  function kill() { A.state.flags.anchorKilled = true; E.ledger.log('system', 'Anchor killed (demo)'); }
  function restart() {
    A.state.flags.anchorKilled = false;
    E.ledger.log('system', 'Anchor restarted');
    if (A.sim.agent) A.sim.agent.anchorBack();
  }

  A.engine.anchor = { hook, resolve, findCard, markShown, markDetails, mfAnswer, mfPick, mfSkip, mfNotNow, notify, event, tick, kill, restart, scamSignals, rememberSuggestion };
})();
