/* Trust Check (PRD 3): five inputs → worst finding sets the colour; uncertain → grey, never a
   false green. Also Second Opinion (anonymised query) and Agent Loyalty Score. */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;

  const COMMERCIAL = ['purchase', 'subscription', 'insurance', 'booking', 'loan', 'credit', 'investment'];
  const ORDER = { red: 3, yellow: 2, green: 1, grey: 0 };

  function inScope(action) {
    if (COMMERCIAL.indexOf(action.kind) >= 0) return 'full';
    if (action.kind === 'payment') return action.counterparty && action.counterparty.type === 'business' ? 'full' : 'scam';
    return null;
  }

  /* Materially better: same group, available in city, and ≥10% cheaper, or within 5% with rating ≥ +0.5 */
  function alternatives(item, city) {
    if (!item) return { better: [], others: [], cheapestIsPick: false };
    const pool = A.data.catalogue.group(item.group).filter((i) => i.id !== item.id &&
      (i.cities.indexOf('all') >= 0 || i.cities.indexOf(city) >= 0));
    const better = pool.filter((i) => i.price <= item.price * 0.9 ||
      (Math.abs(i.price - item.price) <= item.price * 0.05 && i.rating >= item.rating + 0.5)).sort((a, b) => a.price - b.price);
    const others = pool.filter((i) => better.indexOf(i) < 0).sort((a, b) => a.price - b.price);
    const cheapestIsPick = pool.every((i) => i.price >= item.price);
    return { better, others, cheapestIsPick };
  }

  function patternFlag(p, action) {
    if (!action.merchantId || !action.category) return null;
    const t0 = A.clock.now() - 30 * U.DAY;
    const recs = p.ledger.filter((e) => e.ts >= t0 && e.category === action.category && !e.routine && e.merchantId);
    if (recs.length < 10) return null;
    const same = recs.filter((e) => e.merchantId === action.merchantId).length;
    const share = same / recs.length;
    return share >= 0.6 ? { pct: Math.round(share * 100), n: recs.length } : null;
  }

  function reason(key, vars, src, date) { return { key, vars: vars || {}, source: src || 'Anchor', date: date || A.clock.now() }; }

  function assess(p, action) {
    const scope = inScope(action);
    if (!scope) return null;
    const flags = A.state.flags;
    const reasons = [];
    let color = null, key = null;
    const bump = (c, k) => { if (color == null || ORDER[c] > ORDER[color]) { color = c; key = k; } };

    /* Counterparty risk — fraud list is cached on device, so it works offline */
    const fraud = action.counterparty && A.data.fraud.find(action.counterparty.id);
    if (fraud) {
      bump('red', 'red_fraud');
      reasons.push(reason('trust.r.fraud', { count: fraud.reports, date: U.fmtDate(fraud.lastReported) }, 'Fraud reports (1930 / NCRP)', fraud.lastReported));
    }
    if (scope === 'scam') {
      return fraud ? finish() : null;
    }
    if (action.ownBusiness) { color = 'grey'; key = 'grey_own'; return finish(); }

    if (flags.networkOff) {
      if (!fraud) { color = 'grey'; key = 'grey_offline'; reasons.push(reason('trust.r.offline', null, 'Anchor')); }
      return finish(true);
    }

    const item = action.itemId ? A.data.catalogue.byId(action.itemId) : null;
    const supported = A.data.catalogue.SUPPORTED.indexOf(action.category === 'groceries' ? 'groceries' : (item ? item.category : action.category)) >= 0;
    const provider = p.provider;
    const rel = action.merchantId && A.data.registry.find(action.merchantId, provider);
    const disc = action.disclosures; /* undefined = agent sent no field (TC-E1) */
    const disclosedKind = disc && (disc.commission ? 'commission' : disc.affiliate ? 'affiliate' : disc.sponsored ? 'sponsored' : null);

    /* Registry vs disclosure */
    if (rel && !disclosedKind) {
      bump('red', 'red_undisclosed');
      reasons.push(reason('trust.r.undisclosed', { merchant: action.counterparty ? action.counterparty.name : action.merchantId, provider }, rel.source, new Date(rel.since).getTime()));
    } else if (disclosedKind) {
      bump('yellow', 'yellow');
      reasons.push(reason('trust.r.disclosed', { kind: A.t('trust.kind.' + disclosedKind, null, 'en'), kindHi: A.t('trust.kind.' + disclosedKind, null, 'hi') }, 'Agent disclosure'));
      if (rel) reasons.push(reason('trust.r.registry', { merchant: action.counterparty ? action.counterparty.name : '', provider }, rel.source, new Date(rel.since).getTime()));
    }

    /* Alternatives check */
    let alts = { better: [], others: [], cheapestIsPick: false };
    if (!supported) {
      if (color == null) { color = 'grey'; key = 'grey_unsupported'; }
      reasons.push(reason('trust.r.unsupported', null, 'Anchor catalogue'));
    } else if (!item) {
      reasons.push(reason('trust.r.unsupported', null, 'Anchor catalogue'));
      if (color == null || color === 'green') { color = 'grey'; key = 'grey_nosimilar'; }
    } else {
      alts = alternatives(item, p.city);
      if (alts.better.length) {
        bump('red', key === 'red_fraud' ? 'red_fraud' : 'red_skipped');
        if (key !== 'red_fraud') key = 'red_skipped';
        alts.better.slice(0, 2).forEach((b) => reasons.push(reason('trust.r.cheaper', { name: b.name, pct: Math.round((1 - b.price / item.price) * 100), price: U.inr(b.price) }, b.source, A.clock.now() - b.checkedH * U.HOUR)));
      }
    }

    /* Pattern history (FR-TC-10) */
    const pat = patternFlag(p, action);
    if (pat) {
      if (color == null || ORDER[color] < ORDER.yellow) { color = 'yellow'; key = 'pattern'; }
      reasons.push(reason('trust.r.pattern', { merchant: action.counterparty ? action.counterparty.name : '', pct: pat.pct, area: action.category }, 'Your ledger'));
    }

    /* No disclosures field and registry can't vouch → grey at best (TC-E1) */
    if (disc === undefined && !rel && !A.data.registry.covers(action.merchantId) && (color == null || color === 'green')) {
      color = 'grey'; key = 'grey';
      reasons.push(reason('trust.r.nodisclosure', null, 'Sponsorship registry'));
    }

    if (color == null) {
      color = 'green'; key = 'green';
      reasons.push(reason('trust.r.clean', null, 'Registry + catalogue'));
    }
    return finish(false, item, alts);

    function finish(offline, itm, al) {
      const a = al || { better: [], others: [], cheapestIsPick: false };
      return {
        color, key, reasons, offline: !!offline,
        itemId: itm ? itm.id : action.itemId || null,
        alternatives: a.better.concat(a.others).slice(0, 3).map((i) => i.id),
        better: a.better.map((i) => i.id),
        bestPrice: !!(itm && a.cheapestIsPick && !a.better.length),
        checkedAt: A.clock.now()
      };
    }
  }

  /* FR-TC-05: query payload carries only category, spec, price band and city */
  function secondOpinionQuery(p, action) {
    const item = action.itemId ? A.data.catalogue.byId(action.itemId) : null;
    return {
      endpoint: 'POST /second-opinion/query',
      category: item ? item.category : action.category,
      specification: item ? item.spec.en : (action.spec || 'unknown'),
      price_band: U.band(action.amount || 0),
      city: p.city
    };
  }

  /* FR-TC-12 Agent Loyalty Score = green ÷ (green + yellow + red); grey excluded.
     Protocol violations and ignored takes count as red (DG-E3, MF-E5). */
  function loyalty(p, monthKey) {
    const list = A.engine.ledger.inMonth(p.id, monthKey);
    let g = 0, y = 0, r = 0, undisclosed = 0, violations = 0;
    list.forEach((e) => {
      if (e.label === 'green') g++;
      else if (e.label === 'yellow') y++;
      else if (e.label === 'red') { r++; if (e.labelKey === 'red_undisclosed') undisclosed++; }
      if (e.resolution === 'violation' || e.takeIgnored) { r++; violations++; }
    });
    const denom = g + y + r;
    return { score: denom ? Math.round((g / denom) * 100) : null, g, y, r, undisclosed, violations };
  }

  A.engine.trust = { assess, alternatives, secondOpinionQuery, loyalty, inScope, patternFlag };
})();
