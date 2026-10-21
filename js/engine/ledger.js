/* Agency ledger: every allowed, notified, held, declined, blocked, expired and unchecked action
   (FR-DG-15), with resolutions used by the Agency Statement (PRD 1). */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;

  const COUNTED = ['authored', 'modified', 'declined', 'approved_considered', 'approved_quick', 'autopilot'];
  const YOURS = ['authored', 'modified', 'declined'];

  function persona(pid) { return A.state.personas[pid]; }

  const ledger = {
    COUNTED, YOURS,
    add(pid, entry) {
      const p = persona(pid);
      const e = Object.assign({ id: U.uid('ev'), persona: pid, ts: A.clock.now(), agent: p.agentName, meaningful: true }, entry);
      p.ledger.push(e);
      ledger.log(pid, (e.status || e.resolution) + ' · ' + U.pick(e.summary, 'en') + (e.amount ? ' · ' + U.inr(e.amount) : ''));
      A.bus.emit('ledger', { pid, entry: e });
      return e;
    },
    get(pid, id) { return persona(pid).ledger.find((e) => e.id === id); },
    update(pid, id, patch) {
      const e = ledger.get(pid, id);
      if (!e) return null;
      Object.assign(e, patch);
      A.bus.emit('ledger', { pid, entry: e });
      return e;
    },
    inMonth(pid, key) {
      const a = U.monthStart(key), b = U.monthEnd(key);
      return persona(pid).ledger.filter((e) => e.ts >= a && e.ts <= b);
    },
    since(pid, ms) { const t = A.clock.now() - ms; return persona(pid).ledger.filter((e) => e.ts >= t); },
    history(pid, filter) {
      const all = persona(pid).ledger.slice().sort((x, y) => y.ts - x.ts);
      if (!filter || filter === 'all') return all;
      return all.filter((e) => e.status === filter);
    },
    /* FR-AS-08 / FR-CL-01 reclassification; returns undo fn */
    reclassify(pid, id, meaningful) {
      const e = ledger.get(pid, id);
      const prev = e.meaningful;
      e.meaningful = meaningful;
      e.reclassified = true;
      ledger.log(pid, 'reclassified ' + (meaningful ? 'meaningful' : 'not meaningful') + ' · ' + U.pick(e.summary, 'en'));
      A.bus.emit('ledger', { pid, entry: e });
      return () => { e.meaningful = prev; e.reclassified = false; A.bus.emit('ledger', { pid, entry: e }); };
    },
    /* AS-E16 "I chose this myself" */
    claim(pid, id) {
      const e = ledger.get(pid, id);
      const prev = e.resolution;
      e.resolution = 'authored'; e.corrected = prev;
      ledger.log(pid, 'resolution corrected ' + prev + ' → authored');
      A.bus.emit('ledger', { pid, entry: e });
      return () => { e.resolution = prev; delete e.corrected; A.bus.emit('ledger', { pid, entry: e }); };
    },
    log(pid, text) {
      const item = { ts: A.clock.now(), pid, text };
      A.state.operator.log.unshift(item);
      if (A.state.operator.log.length > 400) A.state.operator.log.length = 400;
      A.bus.emit('oplog', item);
    },
    trace(pid, step, data) {
      const item = { ts: A.clock.now(), pid, step, data };
      A.state.operator.trace.unshift(item);
      if (A.state.operator.trace.length > 300) A.state.operator.trace.length = 300;
      A.bus.emit('trace', item);
    }
  };

  A.engine.ledger = ledger;
})();
