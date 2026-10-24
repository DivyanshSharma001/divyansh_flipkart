/* Demo control panel (beside the phone) + operator console (full-width desktop view, like the
   reference's hub-manager role). Appendix: scenario picker, kill Anchor, network off, clock skip,
   language switch, event composer. */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;
  const ic = (n, c) => A.ui.icon(n, c);
  const esc = U.esc;
  const R = () => A.sim.scenarios;

  function P(id) { return A.state.personas[id]; }
  A.ui.consoleTab = 'scenarios';
  const checklist = {};

  /* ---------------- Scenario runner block (shared) ---------------- */
  function runnerBlock(compact) {
    const r = R();
    const chips = '<div class="sc-chips">' + r.list.map((s) => '<button class="sc-chip' + (r.active && r.active.id === s.id ? ' is-active' : '') + '" data-action="op.start" data-id="' + s.id + '" title="' + esc(s.title) + '">' + s.id + (s.hero ? ' ' + ic('star') : '') + '</button>').join('') + '</div>';
    if (!r.active) return chips + '<p class="op-muted">Pick a scenario to play it step by step. S3 is the hero demo.</p>';
    const s = r.active;
    const prev = s.steps[r.idx - 1];
    const curStep = s.steps[r.idx];
    const canAssist = (curStep && curStep.user && !curStep.run) || (prev && prev.assist && (prev.run || !prev.user));
    const steps = '<ol class="sc-steps">' + s.steps.map((st, i) => '<li class="' + (i < r.idx ? 'is-done' : i === r.idx ? 'is-current' : '') + (st.check ? ' is-check' : '') + (st.user ? ' is-user' : '') + '">' +
      '<span class="sc-dot">' + (i < r.idx ? ic('check') : i + 1) + '</span><span>' + esc(st.label) + (st.user ? ' <em>in the phone</em>' : '') + '</span></li>').join('') + '</ol>';
    const done = r.idx >= s.steps.length;
    return chips + '<div class="sc-head"><b>' + esc(s.id + ' · ' + s.title) + '</b><small>' + esc(s.who + ' · ' + s.mins + ' min') + '</small><small>' + esc(s.features) + '</small></div>' + steps +
      '<div class="sc-actions">' + (done ? '<span class="op-ok">' + ic('checkCircle') + 'Scenario complete</span>' :
        '<button class="op-btn is-primary" data-action="op.next">' + (curStep && curStep.user && !curStep.run ? 'Mark done' : 'Run step') + ' ' + ic('chevRight') + '</button>') +
      (canAssist ? '<button class="op-btn" data-action="op.assist">' + ic('fastForward') + 'Do it for me</button>' : '') +
      '<button class="op-btn is-ghost" data-action="op.restart" title="Reset demo and restart this scenario">' + ic('reset') + '</button></div>';
  }

  function toggles() {
    const f = A.state.flags;
    const row = (key, icon, label, desc, on) => '<div class="op-toggle"><span class="op-ic">' + ic(icon) + '</span><div><b>' + esc(label) + '</b><small>' + esc(desc) + '</small></div>' + A.ui.toggle(on, 'op.flag', { k: key }) + '</div>';
    return row('anchorKilled', 'power', 'Kill Anchor', 'Agent falls back to cached thresholds', f.anchorKilled) +
      row('networkOff', 'wifiOff', 'Network off', 'Second Opinion fails → grey labels', f.networkOff) +
      row('misbehaving', 'bug', 'Misbehaving agent', 'Skips hook, hides disclosures, ignores takes', f.misbehaving);
  }

  function clock() {
    const now = A.clock.now();
    return '<div class="op-clock"><span>' + ic('clock') + esc(new Date(now).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })) + '</span>' +
      '<div class="op-row"><button class="op-btn is-sm" data-action="op.clock" data-ms="900000">+15 min</button><button class="op-btn is-sm" data-action="op.clock" data-ms="86400000">+24 h</button>' +
      '<button class="op-btn is-sm" data-action="op.clockFirst">Jump to 1st, 9:00</button></div></div>';
  }

  /* ---------------- Right panel ---------------- */
  A.ui.renderPanel = function () {
    const panel = document.getElementById('panel');
    if (A.state.current === 'console') { panel.innerHTML = ''; return; }
    const p = A.ui.cur();
    const quick = Object.keys(A.sim.agent.lib).map((k) => '<button class="op-chip" data-action="op.quick" data-k="' + k + '">' + esc(k) + '</button>').join('');
    const log = A.state.operator.log.slice(0, 7).map((l) => '<li><time>' + esc(new Date(l.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })) + '</time><b>' + esc(l.pid) + '</b> ' + esc(l.text) + '</li>').join('');
    panel.innerHTML =
      '<div class="op-head"><b>' + ic('sliders') + 'Demo control panel</b><button class="icon-btn op-close" data-action="shell.closeOverlays" aria-label="Close">' + ic('close') + '</button></div>' +
      '<div class="op-scroll">' +
      '<section class="op-sec"><h4>Scenario runner</h4>' + runnerBlock(true) + '</section>' +
      '<section class="op-sec"><h4>Simulation</h4>' + toggles() + '</section>' +
      '<section class="op-sec"><h4>Clock</h4>' + clock() + '</section>' +
      '<section class="op-sec"><h4>' + esc(p.short) + ' · language</h4>' + A.ui.pills([['en', 'English'], ['hi', 'हिंदी']], p.lang, 'op.lang') + '</section>' +
      '<section class="op-sec"><h4>Agent proposes (for ' + esc(p.short) + ')</h4><div class="op-chips">' + quick + '</div><button class="op-link" data-action="op.composer">' + ic('terminal') + 'Open event composer</button></section>' +
      '<section class="op-sec"><h4>Live Anchor log</h4><ul class="op-log">' + log + '</ul></section>' +
      '</div>';
  };

  /* ---------------- Operator console (full width) ---------------- */
  const TABS = [['scenarios', 'Scenarios'], ['composer', 'Event composer'], ['ledger', 'Ledger'], ['trace', 'Policy trace'], ['relay', 'Family relay'], ['metrics', 'Metrics'], ['tests', 'Tests']];
  A.ui.renderConsole = function () {
    const host = document.getElementById('console');
    const tab = A.ui.consoleTab;
    let body = '';
    try { body = ({ scenarios, composer, ledger, trace, relay, metrics, tests })[tab](); } catch (e) { console.error('[console]', e); body = '<div class="op-card">Error rendering</div>'; }
    const relayCount = A.state.family.relay.length;
    host.innerHTML = '<header class="op-page-head"><button class="icon-btn" data-action="nav.persona" data-pid="' + esc(A.store.get('lastPersona', 'meera')) + '" aria-label="Back to phone">' + ic('back') + '</button>' +
      '<div><h1>Demo console</h1><small>Operator · Anchor Connect simulator · ' + esc(new Date(A.clock.now()).toLocaleString('en-IN')) + '</small></div></header>' +
      '<nav class="op-tabs">' + TABS.map(([k, l]) => '<button class="' + (tab === k ? 'is-active' : '') + '" data-action="op.tab" data-k="' + k + '">' + esc(l) + (k === 'relay' && relayCount ? ' <span class="op-count">' + relayCount + '</span>' : '') + '</button>').join('') + '</nav>' +
      '<div class="op-body">' + body + '</div>';
  };

  function scenarios() {
    const cards = R().list.map((s) => '<article class="op-card sc-card' + (s.hero ? ' is-hero' : '') + '"><div class="sc-card-top"><b>' + esc(s.id) + '</b>' + (s.hero ? '<span class="op-badge">Hero demo</span>' : '') + '<small>' + s.mins + ' min</small></div>' +
      '<h3>' + esc(s.title) + '</h3><p>' + esc(s.who) + '</p><p class="op-muted">' + esc(s.features) + '</p>' +
      '<button class="op-btn is-primary" data-action="op.startGo" data-id="' + s.id + '">' + ic('play') + 'Start</button></article>').join('');
    const items = ['All five scenarios run start to finish without operator fixes.', 'Every card has English and Hindi text and voice.', 'Auto-path verdict under 300 ms on the demo phone.', 'No held action is lost in S5.', 'Rajan\'s Hindi warning plays clearly in a noisy room.', '"What they see" preview matches what Meera actually sees.', 'Anchor\'s activity log shows every action from the demo run.', 'Lock-screen notifications show no amounts or names.'];
    const check = '<article class="op-card"><h3>Demo checklist (appendix)</h3><ul class="op-check">' + items.map((it, i) => '<li><label><input type="checkbox" data-change="op.check" data-i="' + i + '"' + (checklist[i] ? ' checked' : '') + '> ' + esc(it) + '</label></li>').join('') + '</ul></article>';
    return '<div class="op-grid">' + cards + '</div><div class="op-split"><article class="op-card"><h3>Runner</h3>' + runnerBlock(false) + '</article>' + check + '</div>' +
      '<div class="op-split"><article class="op-card"><h3>Simulation</h3>' + toggles() + '</article><article class="op-card"><h3>Clock</h3>' + clock() + '</article></div>';
  }

  function composer() {
    const c = A.ui.composerState = A.ui.composerState || { pid: 'meera', kind: 'purchase', area: 'shopping', amount: 7000, cpName: 'GadgetHub', cp: 'known', cpType: 'business', item: '', fraud: '', disc: 'none_field', urgency: 'normal', rev: 'reversible', signals: [], recurring: false, routine: false, skipHook: false, category: 'electronics' };
    const sel = (id, opts, val) => '<select id="' + id + '" data-change="op.cmp" data-f="' + id + '">' + opts.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return '<option value="' + esc(v) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>';
    const items = [['', '— none (not in catalogue) —']].concat(A.data.catalogue.items.filter((i) => !i.id.startsWith('fx-')).map((i) => [i.id, i.name + ' · ' + U.inr(i.price)]));
    const fraud = [['', '— not on fraud list —']].concat(A.data.fraud.list.map((f) => [f.id, f.name]));
    const sigs = ['account_block', 'secrecy', 'impersonation_bank', 'digital_arrest', 'kyc_threat', 'remote_access', 'urgency'];
    const res = A.ui.composerResult;
    return '<div class="op-split is-wide"><article class="op-card"><h3>Event composer</h3><p class="op-muted">Craft any pre-action hook call by hand (appendix). The simulated agent sends it to POST /anchor/hook.</p>' +
      '<div class="op-form">' +
      '<label>Persona' + sel('pid', ['meera', 'priya', 'vihan', 'rajan', 'dev'], c.pid) + '</label>' +
      '<label>Event type' + sel('kind', ['purchase', 'payment', 'insurance', 'subscription', 'booking', 'loan', 'investment', 'message', 'sign', 'share_data', 'draft', 'recommendation'], c.kind) + '</label>' +
      '<label>Life area' + sel('area', ['money', 'shopping', 'health', 'home', 'plans', 'gifts', 'messages', 'writing', 'school'], c.area) + '</label>' +
      '<label>Category' + sel('category', ['electronics', 'groceries', 'insurance', 'travel', 'gifts', 'games', 'home', 'p2p', 'fashion', 'jewellery-rare'], c.category) + '</label>' +
      '<label>Amount (₹)<input id="amount" type="number" value="' + esc(c.amount) + '" data-change="op.cmp" data-f="amount"></label>' +
      '<label>Counterparty name<input id="cpName" type="text" value="' + esc(c.cpName) + '" data-change="op.cmp" data-f="cpName"></label>' +
      '<label>Counterparty' + sel('cp', [['known', 'Known'], ['new', 'New'], ['family', 'Family']], c.cp) + '</label>' +
      '<label>Counterparty type' + sel('cpType', ['business', 'person'], c.cpType) + '</label>' +
      '<label>Catalogue item' + sel('item', items, c.item) + '</label>' +
      '<label>Fraud-list payee' + sel('fraud', fraud, c.fraud) + '</label>' +
      '<label>Disclosures' + sel('disc', [['none_field', 'No disclosures field'], ['explicit_none', 'Explicitly none ({})'], ['commission', 'commission: true'], ['affiliate', 'affiliate: true'], ['sponsored', 'sponsored: true']], c.disc) + '</label>' +
      '<label>Urgency' + sel('urgency', ['normal', 'time_sensitive', 'emergency'], c.urgency) + '</label>' +
      '<label>Reversibility' + sel('rev', ['reversible', 'costly', 'irreversible'], c.rev) + '</label>' +
      '<fieldset><legend>Scam signals</legend>' + sigs.map((s) => '<label class="op-cb"><input type="checkbox" data-change="op.cmpSig" value="' + s + '"' + (c.signals.indexOf(s) >= 0 ? ' checked' : '') + '> ' + s + '</label>').join('') + '</fieldset>' +
      '<fieldset><legend>Flags</legend><label class="op-cb"><input type="checkbox" data-change="op.cmpFlag" value="recurring"' + (c.recurring ? ' checked' : '') + '> recurring</label><label class="op-cb"><input type="checkbox" data-change="op.cmpFlag" value="routine"' + (c.routine ? ' checked' : '') + '> routine</label><label class="op-cb"><input type="checkbox" data-change="op.cmpFlag" value="skipHook"' + (c.skipHook ? ' checked' : '') + '> skip hook (needs misbehaving agent)</label></fieldset>' +
      '</div><button class="op-btn is-primary" data-action="op.send">' + ic('send') + 'Send to hook</button></article>' +
      '<article class="op-card"><h3>Verdict</h3>' + (res ? '<pre class="op-pre">' + esc(JSON.stringify(res, null, 2)) + '</pre>' : '<p class="op-muted">Send an event to see the verdict, trust label and policy trace.</p>') +
      '<h3>Recent trace</h3><ul class="op-trace">' + A.state.operator.trace.slice(0, 12).map(traceRow).join('') + '</ul></article></div>';
  }

  function ledger() {
    const f = A.ui.ledgerFilter || 'all';
    const rows = [];
    Object.values(A.state.personas).forEach((p) => { if (f === 'all' || f === p.id) p.ledger.forEach((e) => rows.push(e)); });
    rows.sort((a, b) => b.ts - a.ts);
    return '<article class="op-card"><div class="op-filter">' + ['all', 'meera', 'priya', 'vihan', 'rajan', 'dev'].map((k) => '<button class="op-chip' + (f === k ? ' is-active' : '') + '" data-action="op.ledgerFilter" data-k="' + k + '">' + k + '</button>').join('') + '<span class="op-muted">' + rows.length + ' entries</span></div>' +
      '<div class="op-table-wrap"><table class="op-table"><thead><tr><th>When</th><th>Persona</th><th>Area</th><th>Summary</th><th>Amount</th><th>Status</th><th>Resolution</th><th>Label</th></tr></thead><tbody>' +
      rows.slice(0, 250).map((e) => '<tr><td>' + esc(U.fmtDateTime(e.ts, 'en')) + '</td><td>' + esc(e.persona) + '</td><td>' + esc(e.area) + '</td><td>' + esc(U.pick(e.summary, 'en')) + (e.meaningful ? '' : ' <em>(not meaningful)</em>') + '</td><td>' + (e.amount ? esc(U.inr(e.amount)) : '') + '</td><td>' + esc(e.status || '') + '</td><td>' + esc(e.resolution) + '</td><td>' + (e.label ? '<span class="op-dot is-' + e.label + '"></span>' + esc(e.labelKey || e.label) : '') + '</td></tr>').join('') +
      '</tbody></table></div></article>';
  }

  function traceRow(x) {
    return '<li><time>' + esc(new Date(x.ts).toLocaleTimeString('en-IN')) + '</time><b>' + esc(x.pid) + '</b> ' + esc(x.step) + (x.data && Object.keys(x.data).length && x.step.indexOf('query') >= 0 ? '<pre class="op-pre is-small" data-tag="AC-TC-09">' + esc(JSON.stringify(x.data, null, 1)) + '</pre>' : '') + '</li>';
  }
  function trace() { return '<article class="op-card"><h3>Policy &amp; trust trace</h3><p class="op-muted">Every hook call: rules matched, most-restrictive tier, trust inputs, Second Opinion payload (network inspector).</p><ul class="op-trace">' + A.state.operator.trace.slice(0, 150).map(traceRow).join('') + '</ul></article>'; }

  function relay() {
    const rows = A.state.family.relay;
    return '<article class="op-card"><h3>POST /family/relay</h3><p class="op-muted">Encrypted alert and summary packets (encryption stubbed with a visible label, per appendix).</p>' +
      (rows.length ? '<ul class="op-trace">' + rows.map((r) => '<li><time>' + esc(new Date(r.ts).toLocaleTimeString('en-IN')) + '</time><span class="op-badge">' + ic('lock') + 'encrypted</span> <b>' + esc(r.type) + '</b> ' + esc(r.from) + ' → ' + esc(r.to) + ' <code>' + esc(JSON.stringify(r.payload)) + '</code></li>').join('') + '</ul>' : '<div class="op-empty">Nothing relayed yet. Run S2 or S3.</div>') + '</article>';
  }

  function metrics() {
    const key = A.engine.statement.openMonth();
    const rows = Object.values(A.state.personas).map((p) => {
      const st = A.engine.statement.compute(p, key, { asOf: A.clock.now() });
      const cards = p.cards.filter((c) => c.type === 'decision');
      const resolved = cards.filter((c) => c.status === 'resolved');
      const override = resolved.length ? Math.round(resolved.filter((c) => c.resolution === 'modified' || c.resolution === 'declined').length / resolved.length * 100) : null;
      const approvals = p.ledger.filter((e) => e.resolution === 'approved_considered' || e.resolution === 'approved_quick');
      const rubber = approvals.length ? Math.round(approvals.filter((e) => e.resolution === 'approved_quick').length / approvals.length * 100) : null;
      const lost = cards.filter((c) => c.status === 'waiting' && A.clock.now() > c.agentExpiresAt).length;
      const lat = p.ledger.filter((e) => e.latencyMs != null).map((e) => e.latencyMs).sort((a, b) => a - b);
      const p95 = lat.length ? lat[Math.min(lat.length - 1, Math.floor(lat.length * 0.95))] : null;
      const loy = A.engine.trust.loyalty(p, key);
      const mf = (p.meFirst.stats[key] || {});
      const shown = Object.values(mf).reduce((s, x) => s + x.shown, 0), ans = Object.values(mf).reduce((s, x) => s + x.answered, 0);
      return '<tr><td><b>' + esc(p.short) + '</b></td><td>' + (st.alr == null ? '—' : st.alr + '%') + '</td><td>' + (override == null ? '—' : override + '%') + '</td><td>' + (rubber == null ? '—' : rubber + '%') + '</td><td>' + (shown ? Math.round(ans / shown * 100) + '%' : '—') + '</td><td>' + (loy.score == null ? '—' : loy.score + '%') + '</td><td>' + (p95 == null ? '—' : p95 + ' ms') + '</td><td class="' + (lost ? 'op-bad' : 'op-good') + '">' + lost + '</td></tr>';
    }).join('');
    return '<article class="op-card"><h3>Prototype metrics (live, ' + esc(key) + ')</h3><div class="op-table-wrap"><table class="op-table"><thead><tr><th>Persona</th><th>ALR so far</th><th>Override rate</th><th>Rubber-stamp</th><th>Human-first</th><th>Loyalty</th><th>Auto-path p95</th><th>Lost holds</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="op-muted">Targets: override 15–40%, rubber-stamp ≤ 30%, human-first ≥ 50%, auto-path ≤ 300 ms, lost holds 0.</p></article>';
  }

  function tests() {
    const res = A.ui.testResults;
    return '<article class="op-card"><h3>Acceptance self-tests</h3><p class="op-muted">Runs PRD acceptance criteria against a fresh copy of the seed world (does not touch the demo).</p>' +
      '<button class="op-btn is-primary" data-action="op.tests">' + ic('flask') + 'Run tests</button>' +
      (res ? '<p><b>' + res.filter((r) => r.pass).length + ' / ' + res.length + ' passed</b></p><div class="op-table-wrap"><table class="op-table"><thead><tr><th>ID</th><th>Check</th><th>Result</th><th>Detail</th></tr></thead><tbody>' +
        res.map((r) => '<tr><td>' + esc(r.id) + '</td><td>' + esc(r.name) + '</td><td class="' + (r.pass ? 'op-good' : 'op-bad') + '">' + (r.pass ? 'PASS' : 'FAIL') + '</td><td>' + esc(r.detail || '') + '</td></tr>').join('') + '</tbody></table></div>' : '') + '</article>';
  }

  /* ---------------- Actions ---------------- */
  A.actions['op.tab'] = (d) => { A.ui.consoleTab = d.k; A.ui.render(); };
  A.actions['op.start'] = (d) => { R().start(d.id); A.ui.render(); };
  A.actions['op.startGo'] = (d) => {
    R().start(d.id);
    const first = R().active.steps[0];
    R().next();
    if (A.state.current === 'console') A.ui.goto(A.store.get('lastPersona', 'meera'));
    void first;
  };
  A.actions['op.next'] = () => R().next();
  A.actions['op.assist'] = () => R().assist();
  A.actions['op.restart'] = () => { const id = R().active && R().active.id; A.app.reset(true); if (id) R().start(id); A.ui.render(); };
  A.actions['op.flag'] = function (d) {
    const f = A.state.flags;
    if (d.k === 'anchorKilled') { if (f.anchorKilled) A.engine.anchor.restart(); else A.engine.anchor.kill(); }
    else { f[d.k] = !f[d.k]; A.engine.ledger.log('system', d.k + ' → ' + f[d.k]); }
    A.ui.render();
  };
  A.actions['op.clock'] = (d) => { A.clock.advance(+d.ms); A.engine.anchor.tick(); A.ui.render(); };
  A.actions['op.clockFirst'] = function () {
    const d = new Date(A.clock.now());
    A.clock.set(new Date(d.getFullYear(), d.getMonth() + 1, 1, 9, 0).getTime());
    A.engine.anchor.tick();
    A.ui.shellToast('Clock → 1 ' + new Date(A.clock.now()).toLocaleString('en-IN', { month: 'long' }) + ', 9:00 am — statements generated');
    A.ui.render();
  };
  A.actions['op.lang'] = (d) => { A.ui.cur().lang = d.v; A.ui.render(); };
  A.actions['op.quick'] = function (d) {
    const p = A.ui.cur();
    if (A.state.tabs[p.id] !== 'agent') A.ui.goto(p.id, 'agent');
    A.ui.stickChat = true;
    const arg = d.k === 'homework' ? ++A.ui.hw : d.k === 'split' ? (A.ui.splitN = (A.ui.splitN || 0) + 1) : null;
    A.sim.agent.propose(p.id, d.k, arg, { skipHook: d.k === 'earbuds' && A.state.flags.misbehaving });
  };
  A.actions['op.composer'] = () => { A.store.set('lastPersona', A.state.current); A.ui.consoleTab = 'composer'; A.ui.goto('console'); };
  A.actions['op.ledgerFilter'] = (d) => { A.ui.ledgerFilter = d.k; A.ui.render(); };
  A.actions['op.check'] = (d, el) => { checklist[d.i] = el.checked; };
  A.actions['op.cmp'] = (d, el) => { A.ui.composerState[d.f] = el.type === 'number' ? +el.value : el.value; };
  A.actions['op.cmpSig'] = (d, el) => { const s = A.ui.composerState.signals; const i = s.indexOf(el.value); if (el.checked && i < 0) s.push(el.value); if (!el.checked && i >= 0) s.splice(i, 1); };
  A.actions['op.cmpFlag'] = (d, el) => { A.ui.composerState[el.value] = el.checked; };
  A.actions['op.send'] = function () {
    const c = A.ui.composerState;
    document.querySelectorAll('[data-change="op.cmp"]').forEach((el) => { c[el.dataset.f] = el.type === 'number' ? +el.value : el.value; });
    const item = c.item ? A.data.catalogue.byId(c.item) : null;
    const fraud = c.fraud ? A.data.fraud.find(c.fraud) : null;
    const disclosures = c.disc === 'none_field' ? undefined : c.disc === 'explicit_none' ? {} : { [c.disc]: true };
    const action = {
      kind: c.kind, area: c.area, category: item ? item.category : c.category, amount: item ? item.price : c.amount, period: item && item.period,
      itemId: item ? item.id : undefined, merchantId: item ? item.merchantId : (fraud ? fraud.id : c.cpName.toLowerCase().replace(/[^a-z0-9]/g, '')),
      counterparty: { id: fraud ? fraud.id : (item ? item.merchantId : c.cpName.toLowerCase().replace(/[^a-z0-9]/g, '')), name: fraud ? fraud.name : (item ? item.merchant : c.cpName), known: c.cp !== 'new', family: c.cp === 'family', type: c.cpType },
      disclosures, urgency: c.urgency === 'normal' ? undefined : c.urgency, reversibility: c.rev, signals: c.signals.slice(), recurring: c.recurring, routine: c.routine,
      what: { en: c.kind + ' · ' + (item ? item.name : c.cpName), hi: c.kind + ' · ' + (item ? item.name : c.cpName) },
      summary: { en: 'Composer: ' + c.kind + ' · ' + (item ? item.name : c.cpName), hi: 'कंपोज़र: ' + c.kind },
      reason: { en: 'Crafted in the event composer.', hi: 'इवेंट कंपोज़र से बनाया गया।' }, threadId: 'cmp-' + Date.now()
    };
    if (action.disclosures === undefined) delete action.disclosures;
    const spec = { key: 'composer', say: { en: 'Composer event: ' + U.pick(action.summary, 'en'), hi: 'कंपोज़र इवेंट' }, done: { en: 'Done.', hi: 'हो गया।' }, draft: { en: 'Here is my draft.', hi: 'यह रहा ड्राफ़्ट।' }, buildDraft: (tk) => ({ en: 'Built on: ' + tk, hi: 'आपके विचार पर: ' + tk }) };
    action.id = U.uid('act');
    A.sim.agent.specs[action.id] = spec;
    A.sim.agent.say(c.pid, spec.say);
    const v = A.sim.agent.run(c.pid, action, spec, { skipHook: c.skipHook });
    const card = v && v.cardId ? A.engine.anchor.findCard(v.cardId) : null;
    A.ui.composerResult = { verdict: v && v.verdict, reason: v && v.reason, latencyMs: v && v.latencyMs, tier: card ? card.tier : v && v.tier, speedBump: card ? card.speedBump : false, approver: card ? card.approver : undefined, trust: v && v.trust ? { color: v.trust.color, key: v.trust.key } : (card && card.trust ? { color: card.trust.color, key: card.trust.key } : null) };
    A.ui.render();
  };
  A.actions['op.tests'] = function () { A.ui.testResults = A.tests.run(); A.ui.render(); };
})();
