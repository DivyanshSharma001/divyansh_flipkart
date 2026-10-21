/* Boot: build the world from seed, apply presets and guardian floors, wire the bus to the
   renderer, run the engine tick, restore per-viewer conveniences. */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;

  function freshState() {
    const st = A.data.seed();
    Object.values(st.personas).forEach((p) => A.engine.policy.applyPreset(p, p.preset));
    st.personas.aarav.guardianRules = [{
      id: 'g_money_2000', scope: { kinds: A.engine.policy.MONEY_KINDS, min: 2000 }, tier: 'ask', speedBump: false, source: 'guardian',
      scopeText: { en: 'payments over ₹2,000', hi: '₹2,000 से ज़्यादा के भुगतान' }
    }];
    return st;
  }

  function boot() {
    document.querySelector('.stage-menu').innerHTML = A.ui.icon('menu');
    document.querySelector('.stage-demo-btn').innerHTML = A.ui.icon('sliders') + '<span>Demo</span>';
    A.state = freshState();
    A.sim.agent.cachePolicy();
    const saved = A.store.get('persona', 'meera');
    A.state.current = A.state.personas[saved] || saved === 'console' ? saved : 'meera';
    if (A.store.get('tags', false)) document.body.classList.add('show-tags');
    if (A.store.get('sbCollapsed', false)) document.getElementById('shell').classList.add('sb-collapsed');
    Object.keys(A.state.personas).forEach((pid) => A.sim.agent.hello(pid));
    A.ui.goto(A.state.current);
    fitPhone();
  }

  function reset(quiet) {
    A.voice && A.voice.stop && A.voice.stop();
    A.ui.voice.stop();
    A.clock.base = new Date(2026, 9, 28, 18, 30).getTime();
    A.clock.realBase = Date.now();
    const current = A.state.current;
    A.state = freshState();
    A.state.current = current;
    A.ui.sub = {}; A.ui.mirrorMonth = {}; A.ui.activeIntent = {}; A.ui.hdrCompact = false; A.ui.historyFilter = {}; A.ui.hw = 0; A.ui.splitN = 0;
    A.ui.composerResult = null; A.ui.testResults = null;
    A.sim.agent.resetCounters();
    A.sim.agent.cachePolicy();
    if (!quiet) A.sim.scenarios.stop();
    Object.keys(A.state.personas).forEach((pid) => A.sim.agent.hello(pid));
    A.ui.goto(current === 'console' ? 'console' : current);
    A.ui.shellToast('Demo reset to seed data');
  }

  A.app = { freshState, reset };

  /* Bus → renderer (rAF-batched) */
  ['ledger', 'card', 'chat', 'relay', 'scenario', 'clock'].forEach((evt) => A.bus.on(evt, () => A.ui.render()));
  A.bus.on('notify', ({ pid, item }) => {
    A.ui.render();
    if (item.silent) return;
    const p = A.state.personas[pid];
    if (pid === A.state.current) A.ui.toast(U.pick(item.text, p.lang), { tone: item.tier === 'critical' ? 'critical' : null });
    else A.ui.shellToast(p.short + ': ' + U.pick(item.text, 'en'));
  });

  /* Engine tick: expiry, escalation, statement release, Me-First timeouts */
  setInterval(() => {
    if (!A.state) return;
    if (A.engine.anchor.tick()) A.ui.render();
    const ps = document.getElementById('phoneStatus');
    if (ps && A.state.current !== 'console') {
      const span = ps.querySelector('span');
      if (span) span.textContent = new Date(A.clock.now()).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: false });
    }
  }, 1000);

  /* Remember last persona when jumping to the console */
  const origGoto = A.ui.goto;
  A.ui.goto = function (pid, tab) {
    if (pid === 'console' && A.state && A.state.current !== 'console') A.store.set('lastPersona', A.state.current);
    return origGoto(pid, tab);
  };

  /* Show the whole 390×844 device: scale it down to the stage instead of squashing its height.
     Below 640 px the app is full-bleed and unscaled (GUARDRAILS.md §1.5). */
  function fitPhone() {
    const stage = document.getElementById('stage');
    const phone = document.getElementById('phone');
    if (!stage || !phone) return;
    if (window.innerWidth < 640) { phone.style.removeProperty('--phone-scale'); return; }
    const cs = getComputedStyle(stage);
    const availH = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const availW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const scale = Math.min(1, availH / 844, availW / 390);
    phone.style.setProperty('--phone-scale', Math.max(0.5, scale).toFixed(3));
  }
  A.ui.fitPhone = fitPhone;
  window.addEventListener('resize', fitPhone);
  A.bus.on('fit', fitPhone);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
