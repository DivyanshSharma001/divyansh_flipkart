/* Scenario runner (appendix: five scripted scenarios, ~12 min, S3 is the hero demo).
   Steps are either operator steps (run) or user steps (hint + optional "do it for me" assist). */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;

  const ag = () => A.sim.agent;
  const anchor = () => A.engine.anchor;
  function P(id) { return A.state.personas[id]; }
  function lastCard(pid, type) { return P(pid).cards.find((c) => (!type || c.type === type)); }
  function waitingCard(pid, type) { return P(pid).cards.find((c) => c.status === 'waiting' && (!type || c.type === type)); }
  function go(pid, tab) { A.ui.goto(pid, tab); }

  const list = [
    {
      id: 'S1', title: 'Insurance switch', who: 'Meera · English', mins: 2,
      features: 'Decision Guard · Trust Check (red, Second Opinion) · modified',
      steps: [
        { label: 'Agent proposes SecureLife Plus, ₹18,000/year (commission disclosed)', run() { go('meera', 'agent'); ag().propose('meera', 'insurance'); } },
        { label: 'Expected: Ask card, red "skipped cheaper options", Compare first', check: true, run() { go('meera', 'agent'); } },
        { label: 'Meera taps Compare → Second Opinion sheet', user: true, assist() { const c = waitingCard('meera', 'decision'); if (c) A.ui.openSecondOpinion(c.id); } },
        { label: 'She picks CareFirst Basic and authenticates', user: true, assist() { const c = waitingCard('meera', 'decision'); if (c) A.ui.chooseAlternative(c.id, 'ins-carefirst-basic', true); } },
        { label: 'Expected: callback modified · ledger modified · History with red label', check: true, run() { A.ui.sheetClose(); go('meera', 'guard'); A.ui.setSub('meera', 'guard', 'history'); } }
      ]
    },
    {
      id: 'S2', title: 'Homework and gift', who: 'Aarav, Meera · English', mins: 3,
      features: 'Me-First (tutor, Skip once) · Learner\'s Licence · guardian view',
      steps: [
        { label: 'Aarav asks for a physics answer → Me-First prompt (guardian-set)', run() { go('aarav', 'agent'); ag().propose('aarav', 'homework', 1); } },
        { label: 'He types his first step; agent replies with a hint (tutor style)', user: true, assist() { const c = waitingCard('aarav', 'mefirst'); if (c) anchor().mfAnswer(c.id, 'At the top v is 0, so I would use v² = u² − 2gh'); } },
        { label: 'Second question → he taps Skip once (1 of 2)', run() { ag().propose('aarav', 'homework', 2); }, assistAfter: true, assist() { const c = waitingCard('aarav', 'mefirst'); if (c) anchor().mfSkip(c.id); } },
        { label: 'Third question → Skip once again (2 of 2)', run() { ag().propose('aarav', 'homework', 3); }, assistAfter: true, assist() { const c = waitingCard('aarav', 'mefirst'); if (c) anchor().mfSkip(c.id); } },
        { label: 'Fourth question → limit banner with "Ask Meera"', run() { ag().propose('aarav', 'homework', 4); } },
        { label: 'His agent proposes a ₹1,200 game purchase → held for Meera (Level 2)', run() { const c = waitingCard('aarav', 'mefirst'); if (c) anchor().mfAnswer(c.id, 'Use s = half a t squared'); ag().propose('aarav', 'gems'); } },
        { label: 'Switch to Meera: Family shows Aarav\'s summary, skips and the held purchase', run() { go('meera', 'family'); } },
        { label: 'Meera declines the purchase', user: true, assist() { const c = P('aarav').cards.find((x) => x.status === 'waiting' && x.approver === 'guardian'); if (c) anchor().resolve(c.id, { type: 'decline', by: 'meera' }); } },
        { label: 'Meera asks her agent for a gift for her mother → Me-First Gifts prompt', run() { go('meera', 'agent'); ag().propose('meera', 'gift'); } },
        { label: 'She answers by voice: "Something for her garden, under ₹2,000"', user: true, assist() { const c = waitingCard('meera', 'mefirst'); if (c) anchor().mfAnswer(c.id, 'Something for her garden, under ₹2,000', true); } },
        { label: 'She picks a garden option → resolves as authored', user: true, assist() { const c = P('meera').cards.find((x) => x.type === 'mefirst' && x.status === 'answered'); if (c) anchor().mfPick(c.id, 'own'); } }
      ]
    },
    {
      id: 'S3', title: 'Bank-officer scam', who: 'Rajan (Hindi Simple) · Meera', mins: 3, hero: true,
      features: 'Fraud label · Speed Bump · Family alert · Hindi voice',
      steps: [
        { label: 'Rajan\'s agent proposes ₹40,000 to a fraud-listed new payee (account-block + secrecy)', run() { go('rajan', 'agent'); ag().propose('rajan', 'scam'); } },
        { label: 'Expected: hold · Speed Bump · red fraud label · Hindi warning · "Meera has been told"', check: true, run() { go('rajan', 'agent'); } },
        { label: 'Switch to Meera: Critical alert → she taps Call Appa (dialler opens)', run() { go('meera', 'family'); }, user: true, assist() { const al = A.state.family.alerts.find((a) => a.status === 'open' && a.member === 'rajan'); if (al) A.engine.family.markActed(al.id, 'meera'); A.ui.toast(A.t('fc.call', { member: 'Appa' }, 'en') + ' → tel:' + P('rajan').phone); } },
        { label: 'Back to Rajan: he says "rok do" (stop)', run() { go('rajan', 'agent'); }, user: true, assist() { const c = waitingCard('rajan', 'decision'); if (c) { anchor().resolve(c.id, { type: 'decline', by: 'rajan', viaVoice: true }); A.ui.sheetClose(); } } },
        { label: 'Expected: declined in both ledgers; Rajan\'s statement counts it as his own', check: true, run() { go('rajan', 'mirror'); } }
      ]
    },
    {
      id: 'S4', title: 'Monthly statement', who: 'Priya · English → Hindi', mins: 2,
      features: 'Agency Statement · highlights · drill-down · reclassify',
      steps: [
        { label: 'Operator jumps the clock to 1 November, 09:00', run() { A.actions['op.clockFirst'](); go('priya', 'mirror'); } },
        { label: 'Statement: ALR, change since last month, area bars and two highlights', check: true, run() { go('priya', 'mirror'); A.ui.setSub('priya', 'mirror', 'statement'); } },
        { label: 'Drill into Home and daily life; mark the routine cleaning booking "Not meaningful"', user: true, assist() {
          const key = A.engine.statement.latestClosed();
          A.ui.openArea('priya', key, 'home');
          const e = A.engine.ledger.inMonth('priya', key).find((x) => x.area === 'home' && x.routineCandidate && x.meaningful);
          if (e) A.ui.reclassify('priya', e.id, false);
        } },
        { label: 'Switch language to Hindi; the statement re-renders and the spoken summary plays', run() { A.ui.sheetClose(); P('priya').lang = 'hi'; go('priya', 'mirror'); setTimeout(() => A.ui.speakStatement('priya'), 300); } }
      ]
    },
    {
      id: 'S5', title: 'Resilience', who: 'Meera', mins: 2,
      features: 'Payment splitting · Anchor killed · misbehaving agent',
      steps: [
        { label: 'Misbehaving agent ON: splits ₹60,000 into ₹10,000 payments (1–4)', run() { A.state.flags.misbehaving = true; go('meera', 'agent'); [1, 2, 3, 4].forEach((n) => ag().propose('meera', 'split', n, { instant: true })); } },
        { label: 'Meera approves payments 1–4 (medium tier)', user: true, assist() { P('meera').cards.filter((c) => c.status === 'waiting' && c.action.counterparty && c.action.counterparty.id === 'p-sharma-furniture').forEach((c) => { anchor().markShown(c.id); anchor().markDetails(c.id); anchor().resolve(c.id, { type: 'approve', by: 'meera' }); }); } },
        { label: 'Payment 5 → running total ₹50,000 → Speed Bump (FR-DG-09)', run() { ag().propose('meera', 'split', 5); } },
        { label: 'Operator kills Anchor; agent proposes ₹55,000 → agent holds (fallback)', run() { const c = waitingCard('meera', 'decision'); if (c) anchor().resolve(c.id, { type: 'decline', by: 'meera' }); anchor().kill(); ag().propose('meera', 'builder'); } },
        { label: 'Anchor restarts → the held card appears; no action lost', run() { anchor().restart(); go('meera', 'guard'); A.ui.setSub('meera', 'guard', 'waiting'); } },
        { label: 'Agent skips the hook on a ₹3,000 order → protocol violation; Loyalty Score drops', run() { go('meera', 'agent'); ag().propose('meera', 'earbuds', null, { skipHook: true }); } },
        { label: 'Check Mirror → Agent Loyalty Score', check: true, run() { go('meera', 'mirror'); A.ui.setSub('meera', 'mirror', 'sofar'); } }
      ]
    }
  ];

  const runner = {
    list,
    active: null,
    idx: 0,
    start(id) { runner.active = list.find((s) => s.id === id); runner.idx = 0; A.bus.emit('scenario'); },
    current() { return runner.active ? runner.active.steps[runner.idx] : null; },
    next() {
      const s = runner.current();
      if (!s) return;
      try { if (s.run) s.run(); if (s.user && !s.run && s.assist && runner.autoAssist) s.assist(); } catch (e) { console.error('[scenario]', e); }
      if (runner.idx < runner.active.steps.length) runner.idx++;
      A.bus.emit('scenario');
      A.ui.render();
    },
    assist() {
      const prev = runner.active && runner.active.steps[runner.idx - 1];
      const s = runner.current();
      const target = s && s.user && !s.run ? s : (prev && prev.assist ? prev : s);
      if (target && target.assist) { try { target.assist(); } catch (e) { console.error('[assist]', e); } }
      if (target === s && runner.idx < runner.active.steps.length) runner.idx++;
      A.bus.emit('scenario');
      A.ui.render();
    },
    stop() { runner.active = null; runner.idx = 0; A.bus.emit('scenario'); }
  };

  A.sim.scenarios = runner;
})();
