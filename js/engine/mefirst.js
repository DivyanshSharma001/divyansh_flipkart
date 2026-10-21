/* Me-First Mode (PRD 4): hold the agent's answer (me_first.hold) until the user gives a take or
   skips. Never in distress/urgent contexts; daily cap; snooze; minors' skip limits by level. */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;

  const AREAS = ['writing', 'gifts', 'plans', 'money', 'school'];
  const NO_HOLD_TAGS = ['support', 'distress', 'crisis'];

  function todayKey() { return new Date(A.clock.now()).toISOString().slice(0, 10); }
  function resetDaily(p) {
    const k = todayKey();
    if (p.meFirst.today.date !== k) p.meFirst.today = { date: k, count: 0 };
    if (p.meFirst.skipsToday.date !== k) p.meFirst.skipsToday = { date: k, school: 0 };
  }
  function stat(p, area) {
    const mk = U.monthKey(A.clock.now());
    p.meFirst.stats[mk] = p.meFirst.stats[mk] || {};
    return (p.meFirst.stats[mk][area] = p.meFirst.stats[mk][area] || { shown: 0, answered: 0, low: 0, skipped: 0, authored: 0 });
  }

  function areaOn(p, area) {
    const a = p.meFirst.areas[area];
    if (area === 'school' && p.role === 'minor' && p.licence) {
      if (p.licence.school.level >= 4) return !!(a && a.on && !a.lockedBy);
      return true; /* guardian floor: Levels 1–3 keep it on (FR-MF-12) */
    }
    return !!(a && a.on);
  }

  /* FR-MF-01/07/08/09/14 */
  function shouldHold(p, ev) {
    resetDaily(p);
    const area = ev.area;
    if (AREAS.indexOf(area) < 0) return { hold: false, why: 'area_not_me_first' };
    if (['draft', 'recommendation'].indexOf(ev.type) < 0) return { hold: false, why: 'event_type' };
    if (!areaOn(p, area)) return { hold: false, why: 'area_off' };
    if (p.mode !== 'protocol') return { hold: false, why: 'unsupported_mode' };
    if (ev.urgency === 'time_sensitive' || ev.urgency === 'emergency') return { hold: false, why: 'urgent' };
    if ((ev.tags || []).some((t) => NO_HOLD_TAGS.indexOf(t) >= 0)) return { hold: false, why: 'distress' };
    const snooze = p.meFirst.snoozed[area];
    if (snooze && snooze > A.clock.now()) return { hold: false, why: 'snoozed' };
    const th = ev.threadId && p.meFirst.threads[ev.threadId];
    if (th && A.clock.now() - th < 30 * U.MIN) return { hold: false, why: 'same_thread' };
    if (p.meFirst.today.count >= p.meFirst.cap) return { hold: false, why: 'cap_reached' };
    return { hold: true };
  }

  function shown(p, area, threadId) {
    resetDaily(p);
    p.meFirst.today.count++;
    if (threadId) p.meFirst.threads[threadId] = A.clock.now();
    stat(p, area).shown++;
  }

  /* FR-MF-10: under 3 words or "I don't know" → accepted, tagged low_effort (metrics only) */
  function isLowEffort(take) {
    const t = (take || '').trim().toLowerCase();
    if (!t) return true;
    if (/^(i don'?t know|idk|not sure|pata nahi|पता नहीं|अभी पक्का नहीं|i'm not sure yet)/.test(t)) return true;
    return t.split(/\s+/).length < 3;
  }

  function answered(p, area, take) {
    const s = stat(p, area);
    s.answered++;
    const low = isLowEffort(take);
    if (low) s.low++;
    return { low };
  }
  function authored(p, area) { stat(p, area).authored++; }

  /* FR-MF-12: skip limits for minors by Learner's Licence level */
  function skipAllowance(p, area) {
    if (p.role !== 'minor' || area !== 'school' || !p.licence) return Infinity;
    const lvl = p.licence.school.level;
    return lvl <= 1 ? 0 : lvl === 2 ? 2 : Infinity;
  }
  function skipsLeft(p, area) {
    resetDaily(p);
    const allow = skipAllowance(p, area);
    if (allow === Infinity) return Infinity;
    return Math.max(0, allow - (p.meFirst.skipsToday[area] || 0));
  }
  function skip(p, area) {
    resetDaily(p);
    if (skipsLeft(p, area) <= 0) return { ok: false };
    p.meFirst.skipsToday[area] = (p.meFirst.skipsToday[area] || 0) + 1;
    stat(p, area).skipped++;
    return { ok: true };
  }
  function snooze(p, area) { p.meFirst.snoozed[area] = A.clock.now() + 2 * U.HOUR; }

  function rate(p, area, key) {
    const s = ((p.meFirst.stats || {})[key || U.monthKey(A.clock.now())] || {})[area];
    if (!s || !s.shown) return null;
    return Math.round((s.answered / s.shown) * 100);
  }

  A.engine.mefirst = { AREAS, shouldHold, shown, answered, authored, isLowEffort, skip, skipsLeft, skipAllowance, snooze, rate, areaOn, resetDaily };
})();
