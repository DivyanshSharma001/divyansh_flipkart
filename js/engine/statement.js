/* Agency Statement (PRD 1): Authored Life Ratio, month-on-month rules, counts fallback,
   "Other" grouping and template-only highlights (max one concern + one positive). */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;
  const L = () => A.engine.ledger;

  const AREA_ORDER = ['money', 'shopping', 'health', 'home', 'plans', 'gifts', 'messages', 'school', 'writing', 'work'];

  function base(p, key, asOf) {
    const end = Math.min(U.monthEnd(key), asOf || Infinity);
    const list = L().inMonth(p.id, key).filter((e) => e.ts <= end);
    const counted = list.filter((e) => e.meaningful && !e.routine && L().COUNTED.indexOf(e.resolution) >= 0);
    const c = { authored: 0, modified: 0, declined: 0, approved_considered: 0, approved_quick: 0, autopilot: 0 };
    counted.forEach((e) => { c[e.resolution]++; });
    const yours = c.authored + c.modified + c.declined;
    const approved = c.approved_considered + c.approved_quick;
    const total = counted.length;
    const alr = total ? Math.round(((yours + c.approved_considered) / total) * 100) : null;
    const days = new Set(list.map((e) => new Date(e.ts).getDate())).size;
    const unchecked = list.filter((e) => e.resolution === 'unchecked').length;
    const routineCount = list.filter((e) => e.routine || !e.meaningful).length;
    return { list, counted, c, yours, approved, total, alr, days, unchecked, routineCount };
  }

  function coverageDays(p, key) {
    const a = U.monthStart(key), b = U.monthEnd(key);
    const from = Math.max(a, p.connectedAt);
    return from > b ? 0 : Math.round((b - from) / U.DAY);
  }

  function compute(p, key, opts) {
    opts = opts || {};
    const asOf = opts.asOf;
    const b = base(p, key, asOf);
    const prevKey = U.prevMonthKey(key);
    const prev = base(p, prevKey);
    const partial = p.connectedAt > U.monthStart(key) && p.connectedAt <= U.monthEnd(key);
    const prevPartial = p.connectedAt > U.monthStart(prevKey);

    let mode = 'pct';
    if (b.total === 0) mode = b.unchecked > 0 && b.list.every((e) => e.resolution === 'unchecked' || e.routine) ? 'paused' : 'none';
    else if (b.total < 10) mode = 'counts';

    /* FR-AS-05 / FR-AS-15 */
    let change = null, changeReason = null;
    if (partial) changeReason = 'partial';
    else if (prev.total >= 20 && coverageDays(p, prevKey) >= 14 && !prevPartial && mode === 'pct') change = b.alr - prev.alr;
    else changeReason = 'nodata';

    /* Area bars, <3 → Other (FR-AS-07) */
    const byArea = {};
    b.counted.forEach((e) => {
      const a = byArea[e.area] = byArea[e.area] || { area: e.area, yours: 0, approved: 0, quick: 0, autopilot: 0, total: 0 };
      a.total++;
      if (L().YOURS.indexOf(e.resolution) >= 0) a.yours++;
      else if (e.resolution === 'approved_considered') a.approved++;
      else if (e.resolution === 'approved_quick') a.quick++;
      else a.autopilot++;
    });
    const areas = [];
    const other = { area: 'other', yours: 0, approved: 0, quick: 0, autopilot: 0, total: 0, members: [] };
    Object.values(byArea).sort((x, y) => AREA_ORDER.indexOf(x.area) - AREA_ORDER.indexOf(y.area)).forEach((a) => {
      if (a.total < 3) { ['yours', 'approved', 'quick', 'autopilot', 'total'].forEach((k) => { other[k] += a[k]; }); other.members.push(a.area); }
      else areas.push(a);
    });
    if (other.total) areas.push(other);

    const highlights = mode === 'pct' || mode === 'counts' ? highlightsFor(p, key, b, prev, change, asOf) : [];
    return {
      key, prevKey, mode, partial, partialFrom: partial ? p.connectedAt : null,
      total: b.total, yours: b.yours, considered: b.c.approved_considered, quick: b.c.approved_quick,
      approved: b.approved, autopilot: b.c.autopilot, alr: b.alr, prevAlr: prev.alr, change, changeReason,
      areas, highlights, unchecked: b.unchecked, routineCount: b.routineCount, agents: [p.agentName],
      reclassified: b.list.filter((e) => e.reclassified).length, counts: b.c
    };
  }

  /* ---- Highlights (PRD 1 highlight rules, FR-AS-17..20) ---- */
  function highlightsFor(p, key, b, prev, change, asOf) {
    const end = Math.min(U.monthEnd(key), asOf || Infinity);
    const concerns = [], positives = [];

    /* Concern: area on autopilot (≥4 decisions, none yours for 6+ weeks); health excluded */
    const areaCounts = {};
    b.counted.forEach((e) => { areaCounts[e.area] = (areaCounts[e.area] || 0) + 1; });
    Object.keys(areaCounts).forEach((area) => {
      if (area === 'health' || areaCounts[area] < 4) return;
      const yoursInMonth = b.counted.some((e) => e.area === area && L().YOURS.indexOf(e.resolution) >= 0);
      if (yoursInMonth) return;
      const lastYours = p.ledger.filter((e) => e.area === area && e.ts <= end && L().YOURS.indexOf(e.resolution) >= 0 && e.meaningful)
        .reduce((m, e) => Math.max(m, e.ts), 0);
      const weeks = lastYours ? Math.floor((end - lastYours) / (7 * U.DAY)) : 9;
      if (weeks >= 6) {
        const tpl = area === 'home' ? 'hl.autopilot_home' : area === 'plans' ? 'hl.autopilot_plans' : 'hl.autopilot_generic';
        concerns.push({ type: 'concern_autopilot', area, tone: 'concern', key: tpl, vars: { w: weeks, area: { en: A.t('area.' + area, null, 'en').toLowerCase(), hi: A.t('area.' + area, null, 'hi') } } });
      }
    });

    /* Concern: narrowing (Drift Index ≥ 0.3 with ≥10 decisions) — restaurants vs earliest month */
    const planRows = b.counted.filter((e) => e.area === 'plans');
    if (planRows.length >= 10) {
      const nowSet = new Set(planRows.filter((e) => e.category === 'restaurant').map((e) => e.counterparty && e.counterparty.name));
      const firstKey = U.prevMonthKey(U.prevMonthKey(key));
      const thenSet = new Set(L().inMonth(p.id, firstKey).filter((e) => e.area === 'plans' && e.category === 'restaurant').map((e) => e.counterparty && e.counterparty.name));
      if (thenSet.size && 1 - nowSet.size / thenSet.size >= 0.3) {
        concerns.push({ type: 'concern_narrowing', area: 'plans', tone: 'concern', key: 'hl.narrowing', vars: { a: nowSet.size, b: thenSet.size, month: { en: U.monthName(firstKey, 'en'), hi: U.monthName(firstKey, 'hi') } } });
      }
    }

    /* Concern: quick approvals (rubber-stamp ≥ 50% with ≥ 6 card approvals) */
    const approvals = b.c.approved_considered + b.c.approved_quick;
    if (approvals >= 6 && b.c.approved_quick / approvals >= 0.5) {
      concerns.push({ type: 'concern_quick', area: 'all', tone: 'concern', key: 'hl.quick', vars: { a: b.c.approved_quick, b: approvals } });
    }

    /* Positive: more yours (ALR up ≥5) */
    if (change != null && change >= 5) {
      const n = (b.yours + b.c.approved_considered) - (prev.yours + prev.c.approved_considered);
      positives.push({ type: 'positive_more', area: 'all', tone: 'positive', key: 'hl.more', vars: { n: Math.max(1, n) } });
    }
    /* Positive: Me-First streak (human-first ≥ 70%) */
    const stats = (p.meFirst.stats || {})[key] || {};
    Object.keys(stats).forEach((area) => {
      const s = stats[area];
      if (s.shown >= 5 && s.answered / s.shown >= 0.7) {
        positives.push({ type: 'positive_streak', area, tone: 'positive', key: 'hl.streak', vars: { a: s.answered, b: s.shown, area: { en: area === 'gifts' ? 'gifts' : A.t('area.' + area, null, 'en').toLowerCase(), hi: A.t('area.' + area, null, 'hi') } } });
      }
    });

    const last = (p.lastHighlights || {})[U.prevMonthKey(key)] || [];
    const ok = (h) => p.dismissedHighlights.indexOf(h.type) < 0 && !last.some((l) => l.type === h.type && l.area === h.area);
    const out = [];
    const c = concerns.find(ok); if (c) out.push(c);
    const pos = positives.find(ok); if (pos) out.push(pos);
    return out;
  }

  function highlightText(h, lang) {
    const vars = {};
    Object.keys(h.vars).forEach((k) => { vars[k] = typeof h.vars[k] === 'object' ? U.pick(h.vars[k], lang) : h.vars[k]; });
    return A.t(h.key, vars, lang);
  }

  /* Statement months: latest released closed month + open month */
  function latestClosed() {
    const rel = Object.keys(A.state.statements.released).sort();
    return rel[rel.length - 1];
  }
  function openMonth() { return U.monthKey(A.clock.now()); }

  /* FR-AS-02 / AS-E4: generate on the 1st at 09:00 home time, or on next app open after that */
  function releaseDue() {
    const now = new Date(A.clock.now());
    const prevKey = U.prevMonthKey(U.monthKey(now.getTime()));
    const due = now.getDate() > 1 || now.getHours() >= 9;
    if (due && !A.state.statements.released[prevKey]) {
      A.state.statements.released[prevKey] = true;
      Object.values(A.state.personas).forEach((p) => {
        const st = compute(p, prevKey);
        p.lastHighlights = p.lastHighlights || {};
        p.lastHighlights[prevKey] = st.highlights.map((h) => ({ type: h.type, area: h.area }));
        if (p.connectedAt < U.monthEnd(prevKey)) {
          A.engine.anchor.notify(p.id, { tier: 'statement', text: { en: A.t('as.ready', { month: U.monthName(prevKey, 'en') }, 'en'), hi: A.t('as.ready', { month: U.monthName(prevKey, 'hi') }, 'hi') }, tab: 'mirror' });
        }
      });
      A.engine.ledger.log('system', 'Statements generated for ' + prevKey + ' (FR-AS-02)');
      return prevKey;
    }
    return null;
  }

  function csv(p, key) {
    const rows = [['date', 'area', 'summary', 'resolution', 'agent', 'trust_label', 'amount']];
    L().inMonth(p.id, key).filter((e) => e.meaningful && !e.routine).forEach((e) => {
      rows.push([new Date(e.ts).toISOString().slice(0, 10), e.area, U.pick(e.summary, 'en'), e.resolution, e.agent, e.label || '', e.amount || '']);
    });
    return rows.map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
  }

  A.engine.statement = { compute, highlightText, latestClosed, openMonth, releaseDue, csv, AREA_ORDER };
})();
