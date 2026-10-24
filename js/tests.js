/* Acceptance self-tests — PRD acceptance criteria run against a fresh seed world.
   The live demo state and clock are saved and restored around the run. */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;

  function act(pid, key, arg, overrides) {
    const spec = A.sim.agent.lib[key](A.state.personas[pid], arg);
    const a = U.deepClone(spec.action);
    Object.assign(a, overrides || {});
    a.id = U.uid('t');
    return a;
  }
  function hook(pid, a) { return A.engine.anchor.hook(pid, a); }

  A.tests = {
    run() {
      const saved = { state: A.state, base: A.clock.base, realBase: A.clock.realBase, instant: A.sim.instant, sheet: A.state.ui.sheet };
      const savedCallback = A.sim.agent.callback;
      const savedToast = A.ui.toast, savedShellToast = A.ui.shellToast;
      A.ui.toast = function () {}; A.ui.shellToast = function () {}; /* test world must not notify the live demo */
      const out = [];
      const check = (id, name, fn) => {
        try { const r = fn(); out.push({ id, name, pass: r === true || (r && r.pass), detail: r && r.detail ? r.detail : (r === true ? '' : JSON.stringify(r)) }); }
        catch (e) { out.push({ id, name, pass: false, detail: 'error: ' + e.message }); }
      };
      try {
        A.state = A.app.freshState();
        A.clock.base = new Date(2026, 9, 28, 18, 30).getTime(); A.clock.realBase = Date.now();
        A.sim.instant = true;
        A.sim.agent.callback = function () {}; /* keep chat quiet during tests */
        const S = A.engine.statement;
        const P = (id) => A.state.personas[id];

        /* ---------- PRD 1 ---------- */
        check('AC-AS-01', 'Priya Oct: 40 decisions → ALR 50%, quick listed separately', () => { const s = S.compute(P('priya'), '2026-10'); return { pass: s.alr === 50 && s.total === 40 && s.quick === 5, detail: 'ALR ' + s.alr + '% of ' + s.total + ', quick ' + s.quick }; });
        check('AC-AS-02', 'Sept 26 decisions at 42% → "Up 8 points"', () => { const s = S.compute(P('priya'), '2026-10'); return { pass: s.prevAlr === 42 && s.change === 8, detail: 'prev ' + s.prevAlr + '%, change ' + s.change }; });
        check('AC-AS-03', 'Previous month < 20 decisions → not enough data to compare', () => { const s = S.compute(P('rajan'), '2026-10'); return { pass: s.change === null && s.changeReason === 'nodata', detail: 'reason ' + s.changeReason }; });
        check('AC-AS-04', 'Month with 7 decisions → counts instead of %', () => {
          const p = P('dev'); const keep = p.ledger; const saveConn = p.connectedAt;
          p.connectedAt = new Date(2026, 5, 1).getTime();
          p.ledger = keep.filter((e) => e.meaningful && !e.routine).slice(0, 7);
          const s = S.compute(p, '2026-10'); p.ledger = keep; p.connectedAt = saveConn;
          return { pass: s.mode === 'counts', detail: 'mode ' + s.mode + ', total ' + s.total };
        });
        check('AC-AS-05', 'Home area 4 decisions, none yours ≥6 weeks → autopilot highlight', () => { const s = S.compute(P('priya'), '2026-10'); const h = s.highlights.find((x) => x.type === 'concern_autopilot' && x.area === 'home'); return { pass: !!h, detail: h ? S.highlightText(h, 'en') : 'none' }; });
        check('AC-AS-06', 'Same highlight last month → different or none', () => { const p = P('priya'); p.lastHighlights['2026-09'] = [{ type: 'concern_autopilot', area: 'home' }]; const s = S.compute(p, '2026-10'); p.lastHighlights = {}; return !s.highlights.some((x) => x.type === 'concern_autopilot' && x.area === 'home'); });
        check('AC-AS-07', '"Not meaningful" recomputes ALR within 1 s, undo available', () => {
          const p = P('priya'); const e = A.engine.ledger.inMonth('priya', '2026-10').find((x) => x.routineCandidate && x.meaningful);
          const t0 = performance.now(); const undo = A.engine.ledger.reclassify('priya', e.id, false); const s = S.compute(p, '2026-10'); const ms = performance.now() - t0;
          undo(); const back = S.compute(p, '2026-10');
          return { pass: s.alr === 51 && ms < 1000 && back.alr === 50, detail: 'ALR → ' + s.alr + '% in ' + ms.toFixed(1) + ' ms; undo → ' + back.alr + '%' };
        });
        check('FR-AS-12', 'Simple mode sentence for Rajan (Hindi)', () => { const s = S.compute(P('rajan'), '2026-10'); const txt = A.t('as.simple', { a: s.yours + s.considered, b: s.total }, 'hi'); return { pass: /में से/.test(txt), detail: txt }; });

        /* ---------- PRD 2 ---------- */
        check('AC-DG-01', 'Balanced: ₹2,000 known shop → allow < 300 ms, autopilot', () => { const v = hook('meera', act('meera', 'phoneCase', null, { amount: 2000, disclosures: {} })); return { pass: v.verdict === 'allow' && v.latencyMs < 300, detail: v.verdict + ' in ' + v.latencyMs + ' ms' }; });
        check('AC-DG-02', 'Balanced: ₹18,000 insurance → hold_for_user with card', () => { const v = hook('meera', act('meera', 'insurance')); const c = A.engine.anchor.findCard(v.cardId); return { pass: v.verdict === 'hold_for_user' && !!c && !!c.trust, detail: v.verdict + ', label ' + (c && c.trust.color) }; });
        check('AC-DG-03', 'Pick alternative → modified in ledger', () => { const v = hook('meera', act('meera', 'insurance')); const r = A.engine.anchor.resolve(v.cardId, { type: 'modify', optionId: 'ins-carefirst-basic', by: 'meera' }); const c = A.engine.anchor.findCard(v.cardId); const e = A.engine.ledger.get('meera', c.ledgerId); return { pass: r.resolution === 'modified' && e.resolution === 'modified', detail: e.resolution }; });
        check('AC-DG-04', '₹60,000 to new contact → Speed Bump', () => { const v = hook('meera', act('meera', 'bigTransfer')); const c = A.engine.anchor.findCard(v.cardId); return { pass: c && c.speedBump === true, detail: 'speedBump ' + (c && c.speedBump) }; });
        check('AC-DG-05', 'Personal loan → block (rule.never), no card', () => { const v = hook('meera', act('meera', 'loan')); return { pass: v.verdict === 'block' && v.reason === 'rule.never', detail: v.verdict + ' ' + v.reason }; });
        check('AC-DG-06', 'Six ₹10,000 payments: 1–4 Ask, 5th Speed Bump', () => {
          const tiers = [];
          for (let n = 1; n <= 5; n++) { const v = hook('meera', act('meera', 'split', n)); const c = A.engine.anchor.findCard(v.cardId); tiers.push(c ? (c.speedBump ? 'SB' : 'ask') : v.verdict); }
          return { pass: tiers.slice(0, 4).every((x) => x === 'ask') && tiers[4] === 'SB', detail: tiers.join(', ') };
        });
        check('AC-DG-07', 'Vihan (floor Ask > ₹2,000) sets Auto for ₹3,000 → blocked', () => { const r = A.engine.policy.addRule(P('vihan'), { area: 'any', max: 3000, tier: 'auto' }); return { pass: !r.ok && !!r.conflict, detail: r.ok ? 'saved' : 'blocked: ' + r.conflict.tier }; });
        check('AC-DG-08', 'Medium card, 24 h no response → declined (expired)', () => { const v = hook('meera', act('meera', 'groceries')); A.clock.advance(24 * U.HOUR + U.MIN); A.engine.anchor.tick(); const c = A.engine.anchor.findCard(v.cardId); A.clock.advance(-(24 * U.HOUR + U.MIN)); return { pass: c.resolution === 'expired', detail: c.resolution }; });
        check('AC-DG-11', 'Declined twice in 24 h → third auto-declined', () => {
          for (let i = 0; i < 2; i++) { const v = hook('meera', act('meera', 'bigTransfer', null, { amount: 7000, counterparty: { id: 'p-repeat', name: 'Repeat Co', known: false, type: 'person' } })); A.engine.anchor.resolve(v.cardId, { type: 'decline', by: 'meera' }); }
          const v3 = hook('meera', act('meera', 'bigTransfer', null, { amount: 7000, counterparty: { id: 'p-repeat', name: 'Repeat Co', known: false, type: 'person' } }));
          return { pass: v3.verdict === 'block' && v3.reason === 'user_declined_recently', detail: v3.verdict + ' ' + v3.reason };
        });
        check('FR-DG-03', 'No rule matches a meaningful action → Ask (fail safe)', () => { const v = hook('meera', { kind: 'adopt_pet', area: 'home', summary: { en: 'x', hi: 'x' }, amount: 0 }); return { pass: v.verdict === 'hold_for_user', detail: v.verdict }; });

        /* ---------- PRD 3 ---------- */
        const assess = (pid, a) => A.engine.trust.assess(P(pid), a);
        check('AC-TC-01', 'No disclosures, no registry, no better alt → green', () => { const r = assess('meera', { kind: 'booking', category: 'travel', itemId: 'tr-blr-del-indigo', merchantId: 'indigo', amount: 5840, counterparty: { id: 'indigo', name: 'IndiGo' }, disclosures: {} }); return { pass: r.color === 'green', detail: r.color + ' / ' + r.key }; });
        check('AC-TC-02', 'commission: true, no better alt → yellow', () => { const r = assess('meera', { kind: 'booking', category: 'travel', itemId: 'tr-blr-del-indigo', merchantId: 'indigo', amount: 5840, counterparty: { id: 'indigo', name: 'IndiGo' }, disclosures: { commission: true } }); return { pass: r.color === 'yellow', detail: r.color }; });
        check('AC-TC-03', '₹18,000 vs ₹14,200 (21% cheaper) → red skipped', () => { const r = assess('meera', act('meera', 'insurance')); return { pass: r.color === 'red' && r.key === 'red_skipped', detail: r.key }; });
        check('AC-TC-04', '₹18,000 vs ₹17,000 (5.6%) same rating → not red on price', () => {
          const cat = A.data.catalogue.items;
          cat.push({ id: 'tst-a', name: 'Test A', merchant: 'Test', merchantId: 'tst', category: 'insurance', group: 'tst-g', price: 18000, spec: { en: 'x', hi: 'x' }, rating: 4.0, source: 't', cities: ['all'], checkedH: 1 });
          cat.push({ id: 'tst-b', name: 'Test B', merchant: 'Test', merchantId: 'tst', category: 'insurance', group: 'tst-g', price: 17000, spec: { en: 'x', hi: 'x' }, rating: 4.0, source: 't', cities: ['all'], checkedH: 1 });
          const r = assess('meera', { kind: 'insurance', category: 'insurance', itemId: 'tst-a', merchantId: 'tst', amount: 18000, counterparty: { id: 'tst', name: 'Test' }, disclosures: {} });
          cat.splice(cat.length - 2, 2);
          return { pass: r.color !== 'red', detail: r.color };
        });
        check('AC-TC-05', 'Disclosure says none, registry has partnership → red undisclosed', () => { const r = assess('meera', act('meera', 'groceries', null, { disclosures: {} })); return { pass: r.color === 'red' && r.key === 'red_undisclosed', detail: r.key }; });
        check('AC-TC-06', 'Second Opinion unreachable → grey, card still works', () => { A.state.flags.networkOff = true; const v = hook('meera', act('meera', 'insurance')); A.state.flags.networkOff = false; const c = A.engine.anchor.findCard(v.cardId); return { pass: c && c.trust.color === 'grey' && v.verdict === 'hold_for_user', detail: c && c.trust.color }; });
        check('AC-TC-07', 'Fraud-list payee on a Notify tier → Ask + Speed Bump', () => { const v = hook('rajan', act('rajan', 'scam', null, { amount: 3000, signals: [], counterparty: { id: 'acct-sbi-kyc-7781', name: 'SBI KYC Verification Desk', known: true, type: 'business' } })); const c = A.engine.anchor.findCard(v.cardId); return { pass: c && c.speedBump && c.trust.key === 'red_fraud', detail: v.verdict + ', SB ' + (c && c.speedBump) }; });
        check('AC-TC-09', 'Second Opinion payload: only category, spec, price band, city', () => { const q = A.engine.trust.secondOpinionQuery(P('meera'), act('meera', 'insurance')); const keys = Object.keys(q).filter((k) => k !== 'endpoint').sort().join(','); return { pass: keys === 'category,city,price_band,specification', detail: keys }; });
        check('TC-E1', 'No disclosures field + seller not covered → never green', () => { const r = assess('meera', { kind: 'purchase', category: 'electronics', itemId: 'fx-20', merchantId: 'unknownshop', amount: 1700, counterparty: { id: 'unknownshop', name: 'Unknown' } }); return { pass: r.color !== 'green', detail: r.color }; });
        check('TC-E15', 'Unsupported category → grey', () => { const r = assess('meera', { kind: 'purchase', category: 'jewellery-rare', merchantId: 'x', amount: 90000, counterparty: { id: 'x', name: 'X' }, disclosures: {} }); return { pass: r.color === 'grey', detail: r.key }; });

        /* ---------- PRD 4 ---------- */
        check('AC-MF-01/02/03', 'Gift → me_first.hold → user_take → authored', () => {
          const v = hook('meera', act('meera', 'gift'));
          A.engine.anchor.mfAnswer(v.cardId, 'Something for her garden, under ₹2,000');
          const c = A.engine.anchor.findCard(v.cardId);
          A.engine.anchor.mfPick(v.cardId, 'own');
          return { pass: v.reason === 'me_first.hold' && c.take && c.resolution === 'authored', detail: v.reason + ' → ' + c.resolution };
        });
        check('AC-MF-04', 'Skip once → skipped, no follow-up', () => { const v = hook('priya', act('priya', 'writing')); A.engine.anchor.mfSkip(v.cardId); return A.engine.anchor.findCard(v.cardId).resolution === 'skipped'; });
        check('AC-MF-05', 'Cap reached → passes through (cap_reached)', () => { const p = P('meera'); p.meFirst.today = { date: new Date(A.clock.now()).toISOString().slice(0, 10), count: 5 }; const v = hook('meera', act('meera', 'gift', null, { threadId: 'new-thread' })); p.meFirst.today.count = 1; return { pass: v.verdict === 'allow' && v.reason === 'cap_reached', detail: v.reason }; });
        check('AC-MF-06', 'Distress event → never held', () => { const v = hook('meera', act('meera', 'gift', null, { threadId: 'd1', tags: ['distress'] })); return { pass: v.verdict === 'allow' && v.reason === 'distress', detail: v.reason }; });
        check('AC-MF-08', 'Vihan: third schoolwork skip unavailable (Level 2)', () => {
          const r = [];
          for (let n = 1; n <= 3; n++) { const v = hook('vihan', act('vihan', 'homework', n)); r.push(A.engine.anchor.mfSkip(v.cardId).ok); }
          return { pass: r[0] && r[1] && !r[2], detail: r.join(', ') };
        });
        check('AC-MF-09', 'Device-level mode → Me-First unavailable', () => { const p = P('priya'); p.mode = 'device'; const v = hook('priya', act('priya', 'writing', null, { threadId: 'dv' })); p.mode = 'protocol'; return { pass: v.verdict === 'allow' && v.reason === 'unsupported_mode', detail: v.reason }; });

        /* ---------- PRD 5 ---------- */
        let scamCard = null;
        check('AC-FC-02', 'Rajan ₹40,000 to fraud payee → held, Meera Critical alert', () => {
          const v = hook('rajan', act('rajan', 'scam'));
          scamCard = A.engine.anchor.findCard(v.cardId);
          const al = A.state.family.alerts.find((a) => a.cardId === v.cardId);
          return { pass: v.verdict === 'hold_for_user' && scamCard.speedBump && al && al.tier === 'critical' && al.contacts[0].id === 'meera', detail: 'alert → ' + (al && al.contacts[0].name) };
        });
        check('AC-FC-04', 'No response 15 min → second contact alerted', () => { const al = A.state.family.alerts.find((a) => a.cardId === scamCard.id); A.clock.advance(15 * U.MIN + 1000); A.engine.family.tick(); A.clock.advance(-(15 * U.MIN + 1000)); return { pass: al.idx === 1, detail: 'now with ' + al.contacts[al.idx].name }; });
        check('AC-FC-05', 'Co-approval: Meera approves, Rajan declines → declined', () => { A.engine.anchor.resolve(scamCard.id, { type: 'approve', by: 'meera' }); A.engine.anchor.resolve(scamCard.id, { type: 'decline', by: 'rajan' }); return { pass: scamCard.resolution === 'declined', detail: scamCard.resolution }; });
        check('AC-FC-06', 'Vihan Money L2: ₹1,200 purchase → held for Meera', () => { const v = hook('vihan', act('vihan', 'gems')); const c = A.engine.anchor.findCard(v.cardId); return { pass: c && c.approver === 'guardian', detail: 'approver ' + (c && c.approver) }; });
        check('AC-FC-07', 'Level request approved → new limits apply', () => { const p = P('vihan'); p.licence.money.weeks = 4; p.licence.money.decisions = 10; const r = A.engine.family.requestLevel('vihan', 'money'); A.engine.family.decideLevel(r.id, true); return { pass: p.licence.money.level === 3, detail: 'level ' + p.licence.money.level }; });
        check('AC-FC-09', 'Pause sharing → linked person gets no alerts', () => { A.engine.family.pauseSharing('rajan', 'meera', true); A.engine.family.pauseSharing('rajan', 'ravi', true); const al = A.engine.family.raiseAlert({ member: 'rajan', tier: 'critical', band: 'x' }); A.engine.family.pauseSharing('rajan', 'meera', false); A.engine.family.pauseSharing('rajan', 'ravi', false); return { pass: al === null, detail: String(al) }; });
        check('AC-FC-10', 'Remove link during open Critical alert → deferred', () => { hook('rajan', act('rajan', 'scam')); const r = A.engine.family.removeLink('rajan', 'meera'); return { pass: r.deferred === true, detail: JSON.stringify(r) }; });
        check('i18n', 'Every copy key has English and Hindi', () => { const missing = Object.keys(A.i18n.STR).filter((k) => !A.i18n.STR[k][0] || !A.i18n.STR[k][1]); return { pass: !missing.length, detail: missing.length ? missing.join(', ') : Object.keys(A.i18n.STR).length + ' keys' }; });
      } finally {
        A.state = saved.state; A.clock.base = saved.base; A.clock.realBase = saved.realBase; A.sim.instant = saved.instant;
        A.sim.agent.callback = savedCallback;
        A.ui.toast = savedToast; A.ui.shellToast = savedShellToast;
      }
      console.table(out.map((r) => ({ id: r.id, pass: r.pass, detail: r.detail })));
      return out;
    }
  };
})();
