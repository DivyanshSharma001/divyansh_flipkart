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
      id: 'S1', title: 'Insurance switch', who: 'Kavita · English', mins: 2,
      features: 'Decision Guard · Trust Check (red, Second Opinion) · modified',
      steps: [
        { label: 'Agent proposes SecureLife Plus, ₹18,000/year (commission disclosed)', run() { go('kavita', 'agent'); ag().propose('kavita', 'insurance'); } },
        { label: 'Expected: Ask card, red "skipped cheaper options", Compare first', check: true, run() { go('kavita', 'agent'); } },
        { label: 'Kavita taps Compare → Second Opinion sheet', user: true, assist() { const c = waitingCard('kavita', 'decision'); if (c) A.ui.openSecondOpinion(c.id); } },
        { label: 'She picks CareFirst Basic and authenticates', user: true, assist() { const c = waitingCard('kavita', 'decision'); if (c) A.ui.chooseAlternative(c.id, 'ins-carefirst-basic', true); } },
        { label: 'Expected: callback modified · ledger modified · History with red label', check: true, run() { A.ui.sheetClose(); go('kavita', 'guard'); A.ui.setSub('kavita', 'guard', 'history'); } }
      ]
    },
    {
      id: 'S2', title: 'Homework and gift', who: 'Vihaan, Kavita · English', mins: 3,
      features: 'Me-First (tutor, Skip once) · Learner\'s Licence · guardian view',
      steps: [
        { label: 'Vihaan asks for a physics answer → Me-First prompt (guardian-set)', run() { go('vihaan', 'agent'); ag().propose('vihaan', 'homework', 1); } },
        { label: 'He types his first step; agent replies with a hint (tutor style)', user: true, assist() { const c = waitingCard('vihaan', 'mefirst'); if (c) anchor().mfAnswer(c.id, 'At the top v is 0, so I would use v² = u² − 2gh'); } },
        { label: 'Second question → he taps Skip once (1 of 2)', run() { ag().propose('vihaan', 'homework', 2); }, assistAfter: true, assist() { const c = waitingCard('vihaan', 'mefirst'); if (c) anchor().mfSkip(c.id); } },
        { label: 'Third question → Skip once again (2 of 2)', run() { ag().propose('vihaan', 'homework', 3); }, assistAfter: true, assist() { const c = waitingCard('vihaan', 'mefirst'); if (c) anchor().mfSkip(c.id); } },
        { label: 'Fourth question → limit banner with "Ask Kavita"', run() { ag().propose('vihaan', 'homework', 4); } },
        { label: 'His agent proposes a ₹1,200 game purchase → held for Kavita (Level 2)', run() { const c = waitingCard('vihaan', 'mefirst'); if (c) anchor().mfAnswer(c.id, 'Use s = half a t squared'); ag().propose('vihaan', 'gems'); } },
        { label: 'Switch to Kavita: Family shows Vihaan\'s summary, skips and the held purchase', run() { go('kavita', 'family'); } },
        { label: 'Kavita declines the purchase', user: true, assist() { const c = P('vihaan').cards.find((x) => x.status === 'waiting' && x.approver === 'guardian'); if (c) anchor().resolve(c.id, { type: 'decline', by: 'kavita' }); } },
        { label: 'Kavita asks her agent for a gift for her mother → Me-First Gifts prompt', run() { go('kavita', 'agent'); ag().propose('kavita', 'gift'); } },
        { label: 'She answers by voice: "Something for her garden, under ₹2,000"', user: true, assist() { const c = waitingCard('kavita', 'mefirst'); if (c) anchor().mfAnswer(c.id, 'Something for her garden, under ₹2,000', true); } },
        { label: 'She picks a garden option → resolves as authored', user: true, assist() { const c = P('kavita').cards.find((x) => x.type === 'mefirst' && x.status === 'answered'); if (c) anchor().mfPick(c.id, 'own'); } }
      ]
    },
    {
      id: 'S3', title: 'Bank-officer scam', who: 'Suresh (Hindi Simple) · Kavita', mins: 3, hero: true,
      features: 'Fraud label · Speed Bump · Family alert · Hindi voice',
      steps: [
        { label: 'Suresh\'s agent proposes ₹40,000 to a fraud-listed new payee (account-block + secrecy)', run() { go('suresh', 'agent'); ag().propose('suresh', 'scam'); } },
        { label: 'Expected: hold · Speed Bump · red fraud label · Hindi warning · "Kavita has been told"', check: true, run() { go('suresh', 'agent'); } },
        { label: 'Switch to Kavita: Critical alert → she taps Call Appa (dialler opens)', run() { go('kavita', 'family'); }, user: true, assist() { const al = A.state.family.alerts.find((a) => a.status === 'open' && a.member === 'suresh'); if (al) A.engine.family.markActed(al.id, 'kavita'); A.ui.toast(A.t('fc.call', { member: 'Appa' }, 'en') + ' → tel:' + P('suresh').phone); } },
        { label: 'Back to Suresh: he says "rok do" (stop)', run() { go('suresh', 'agent'); }, user: true, assist() { const c = waitingCard('suresh', 'decision'); if (c) { anchor().resolve(c.id, { type: 'decline', by: 'suresh', viaVoice: true }); A.ui.sheetClose(); } } },
        { label: 'Expected: declined in both ledgers; Suresh\'s statement counts it as his own', check: true, run() { go('suresh', 'mirror'); } }
      ]
    },
    {
      id: 'S4', title: 'Monthly statement', who: 'Ananya · English → Hindi', mins: 2,
      features: 'Agency Statement · highlights · drill-down · reclassify',
      steps: [
        { label: 'Operator jumps the clock to 1 November, 09:00', run() { A.actions['op.clockFirst'](); go('ananya', 'mirror'); } },
        { label: 'Statement: ALR, change since last month, area bars and two highlights', check: true, run() { go('ananya', 'mirror'); A.ui.setSub('ananya', 'mirror', 'statement'); } },
        { label: 'Drill into Home and daily life; mark the routine cleaning booking "Not meaningful"', user: true, assist() {
          const key = A.engine.statement.latestClosed();
          A.ui.openArea('ananya', key, 'home');
          const e = A.engine.ledger.inMonth('ananya', key).find((x) => x.area === 'home' && x.routineCandidate && x.meaningful);
          if (e) A.ui.reclassify('ananya', e.id, false);
        } },
        { label: 'Switch language to Hindi; the statement re-renders and the spoken summary plays', run() { A.ui.sheetClose(); P('ananya').lang = 'hi'; go('ananya', 'mirror'); setTimeout(() => A.ui.speakStatement('ananya'), 300); } }
      ]
    },
    {
      id: 'S5', title: 'Resilience', who: 'Kavita', mins: 2,
      features: 'Payment splitting · Anchor killed · misbehaving agent',
      steps: [
        { label: 'Misbehaving agent ON: splits ₹60,000 into ₹10,000 payments (1–4)', run() { A.state.flags.misbehaving = true; go('kavita', 'agent'); [1, 2, 3, 4].forEach((n) => ag().propose('kavita', 'split', n, { instant: true })); } },
        { label: 'Kavita approves payments 1–4 (medium tier)', user: true, assist() { P('kavita').cards.filter((c) => c.status === 'waiting' && c.action.counterparty && c.action.counterparty.id === 'p-sharma-furniture').forEach((c) => { anchor().markShown(c.id); anchor().markDetails(c.id); anchor().resolve(c.id, { type: 'approve', by: 'kavita' }); }); } },
        { label: 'Payment 5 → running total ₹50,000 → Speed Bump (FR-DG-09)', run() { ag().propose('kavita', 'split', 5); } },
        { label: 'Operator kills Anchor; agent proposes ₹55,000 → agent holds (fallback)', run() { const c = waitingCard('kavita', 'decision'); if (c) anchor().resolve(c.id, { type: 'decline', by: 'kavita' }); anchor().kill(); ag().propose('kavita', 'builder'); } },
        { label: 'Anchor restarts → the held card appears; no action lost', run() { anchor().restart(); go('kavita', 'guard'); A.ui.setSub('kavita', 'guard', 'waiting'); } },
        { label: 'Agent skips the hook on a ₹3,000 order → protocol violation; Loyalty Score drops', run() { go('kavita', 'agent'); ag().propose('kavita', 'earbuds', null, { skipHook: true }); } },
        { label: 'Check Mirror → Agent Loyalty Score', check: true, run() { go('kavita', 'mirror'); A.ui.setSub('kavita', 'mirror', 'sofar'); } }
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
