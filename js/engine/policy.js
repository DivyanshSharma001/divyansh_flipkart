/* Decision Guard policy engine (PRD 2): presets, rule matching, most-restrictive-wins,
   guardian floor, anti-splitting (rolling 24 h per counterparty), fail-safe Ask. */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;

  const RANK = { auto: 0, notify: 1, ask: 2, never: 3 };
  const MONEY_KINDS = ['payment', 'purchase', 'insurance', 'subscription', 'booking'];

  /* Situations × presets (PRD 2 preset table). sb = Speed Bump */
  const SITUATIONS = [
    { key: 'small_known', scope: { kinds: MONEY_KINDS, max: 4999, counterparty: 'known' }, text: { en: 'payments under ₹5,000 to shops and people you know', hi: 'जाने-पहचाने लोगों और दुकानों को ₹5,000 से कम के भुगतान' }, light: ['auto'], balanced: ['auto'], careful: ['notify'] },
    { key: 'mid', scope: { kinds: MONEY_KINDS, min: 5000, max: 49999 }, text: { en: 'payments from ₹5,000 to ₹49,999', hi: '₹5,000 से ₹49,999 तक के भुगतान' }, light: ['auto'], balanced: ['ask'], careful: ['ask'] },
    { key: 'big', scope: { kinds: MONEY_KINDS, min: 50000 }, text: { en: 'payments of ₹50,000 or more', hi: '₹50,000 या उससे ज़्यादा के भुगतान' }, light: ['ask'], balanced: ['ask', true], careful: ['ask', true] },
    { key: 'new_cp', scope: { kinds: MONEY_KINDS, counterparty: 'new' }, text: { en: 'any new payee asking for money', hi: 'पैसे माँगने वाला कोई भी नया प्राप्तकर्ता' }, light: ['ask'], balanced: ['ask'], careful: ['ask', true] },
    { key: 'recurring', scope: { kinds: ['subscription'], recurring: true }, text: { en: 'new subscriptions and recurring payments', hi: 'नई सदस्यता और बार-बार होने वाले भुगतान' }, light: ['notify'], balanced: ['ask'], careful: ['ask'] },
    { key: 'credit', scope: { kinds: ['loan', 'credit', 'investment'] }, text: { en: 'loans, credit and investments', hi: 'लोन, क्रेडिट और निवेश' }, light: ['ask', true], balanced: ['never'], careful: ['never'] },
    { key: 'family_msg', scope: { kinds: ['message'], counterparty: 'family' }, text: { en: 'messages to family and close contacts', hi: 'परिवार और क़रीबी लोगों को संदेश' }, light: ['auto'], balanced: ['notify'], careful: ['ask'] },
    { key: 'health', scope: { areas: ['health'] }, text: { en: 'health decisions', hi: 'सेहत से जुड़े फ़ैसले' }, light: ['ask'], balanced: ['ask'], careful: ['ask', true] },
    { key: 'sign', scope: { kinds: ['sign', 'share_data'] }, text: { en: 'signing documents or sharing personal data', hi: 'दस्तावेज़ पर साइन करना या निजी जानकारी देना' }, light: ['ask', true], balanced: ['ask', true], careful: ['ask', true] },
    { key: 'routine', scope: { routine: true }, text: { en: 'routine things like reorders and reminders', hi: 'रोज़ के काम जैसे दोबारा मँगाना और रिमाइंडर' }, light: ['auto'], balanced: ['auto'], careful: ['auto'] }
  ];

  const VERB = {
    auto: { en: 'Let my agent handle', hi: 'एजेंट को करने दें' },
    notify: { en: 'Do it, then tell me in the digest:', hi: 'करें, फिर सारांश में बताएँ:' },
    ask: { en: 'Ask me before', hi: 'पहले मुझसे पूछें:' },
    never: { en: 'Never allow', hi: 'कभी अनुमति नहीं:' }
  };

  function presetRules(preset) {
    return SITUATIONS.map((s) => {
      const [tier, sb] = s[preset];
      return { id: 'r_' + s.key, situation: s.key, scope: U.deepClone(s.scope), tier, speedBump: !!sb, source: 'preset', scopeText: s.text };
    });
  }

  function ruleText(rule, lang) {
    const L = lang || 'en';
    const scope = U.pick(rule.scopeText, L);
    const verb = U.pick(VERB[rule.tier], L);
    let t = verb + ' ' + scope;
    if (rule.speedBump) t += L === 'hi' ? ' (स्पीड ब्रेकर के साथ)' : ' (with a Speed Bump)';
    return t;
  }

  function cpType(action) {
    const c = action.counterparty;
    if (!c) return 'none';
    if (c.family) return 'family';
    return c.known ? 'known' : 'new';
  }

  function matches(rule, action, amount) {
    const s = rule.scope;
    if (s.routine) return !!action.routine;
    if (action.routine) return false;
    if (s.kinds && s.kinds.indexOf(action.kind) < 0) return false;
    if (s.areas && s.areas.indexOf(action.area) < 0) return false;
    if (s.min != null && !(amount >= s.min)) return false;
    if (s.max != null && !(amount <= s.max)) return false;
    if (s.counterparty) {
      const t = cpType(action);
      if (s.counterparty === 'known' && !(t === 'known' || t === 'family')) return false;
      if (s.counterparty !== 'known' && s.counterparty !== t) return false;
    }
    if (s.recurring != null && !!action.recurring !== s.recurring) return false;
    if (s.category && s.category !== action.category) return false;
    return true;
  }

  /* FR-DG-09 anti-splitting: sum per counterparty over rolling 24 h (held, approved or executed) */
  function runningTotal(p, action) {
    if (!action.counterparty || MONEY_KINDS.indexOf(action.kind) < 0) return action.amount || 0;
    const t0 = A.clock.now() - U.DAY;
    const prior = p.ledger.filter((e) => e.ts >= t0 && e.counterparty && e.counterparty.id === action.counterparty.id &&
      ['declined', 'blocked', 'expired'].indexOf(e.resolution) < 0 && e.resolution !== 'violation_ignored' && e.amount);
    return prior.reduce((s, e) => s + e.amount, 0) + (action.amount || 0);
  }

  function evaluate(p, action) {
    const trace = [];
    /* FR-DG-12 emergency in health/safety always allowed */
    if (action.urgency === 'emergency' && (action.area === 'health' || action.area === 'safety')) {
      return { tier: 'auto', speedBump: false, matched: [], emergency: true, total: action.amount || 0, trace: ['emergency → allow (FR-SF-01)'] };
    }
    const total = runningTotal(p, action);
    const amount = total;
    const rules = p.rules.concat(guardianRules(p));
    let matched = rules.filter((r) => matches(r, action, amount));
    /* "Approve and remember" exceptions replace the preset amount tiers for their exact scope only;
       they never loosen Never rules, new-payee, ₹50,000+ or guardian rules (FR-DG-13). */
    if (matched.some((r) => r.exception)) {
      matched = matched.filter((r) => !(r.source === 'preset' && (r.situation === 'mid' || r.situation === 'small_known')));
      trace.push('approve-and-remember rule applies to this exact scope');
    }
    let tier = 'auto', speedBump = false, failSafe = false;
    if (!matched.length) {
      if (action.meaningful !== false) { tier = 'ask'; failSafe = true; trace.push('no rule matched a meaningful action → Ask (FR-DG-03)'); }
    } else {
      matched.forEach((r) => { if (RANK[r.tier] > RANK[tier]) tier = r.tier; });
      speedBump = matched.some((r) => r.tier === tier && r.speedBump);
      trace.push('matched: ' + matched.map((r) => r.situation || r.id).join(', ') + ' → most restrictive = ' + tier + (speedBump ? ' + Speed Bump' : ''));
    }
    if (total !== (action.amount || 0)) trace.push('running 24 h total to payee = ' + U.inr(total) + ' (FR-DG-09)');

    /* Learner's Licence = guardian floor (FR-FC-17) */
    let approver = 'self';
    if (p.role === 'minor' && A.engine.family) {
      const lic = A.engine.family.licenceVerdict(p, action, amount);
      if (lic) {
        trace.push('Learner\'s Licence ' + lic.area + ' L' + lic.level + ' → ' + lic.approver);
        if (lic.approver === 'guardian') { approver = 'guardian'; if (RANK[tier] < RANK.ask) tier = 'ask'; }
        else if (lic.approver === 'child' && RANK[tier] < RANK.ask) tier = 'ask';
        else if (lic.approver === 'auto' && tier === 'ask' && !failSafe && !speedBump && !matched.some((r) => r.source === 'guardian' && r.tier === 'ask')) tier = 'auto';
      }
    }
    return { tier, speedBump, matched, failSafe, total, approver, trace };
  }

  /* Guardian floor rules for minors (FR-DG-02) */
  function guardianRules(p) {
    if (p.role !== 'minor') return [];
    return p.guardianRules || [];
  }

  /* DG-E5 / AC-DG-07: a minor cannot set a tier looser than the guardian's for an overlapping scope */
  function floorConflict(p, scope, tier) {
    if (p.role !== 'minor') return null;
    const g = guardianRules(p).find((r) => {
      const kOverlap = !r.scope.kinds || !scope.kinds || r.scope.kinds.some((k) => scope.kinds.indexOf(k) >= 0);
      const lo = scope.min || 0, hi = scope.max == null ? Infinity : scope.max;
      const glo = r.scope.min || 0, ghi = r.scope.max == null ? Infinity : r.scope.max;
      const aOverlap = lo <= ghi && glo <= hi;
      return kOverlap && aOverlap && RANK[r.tier] > RANK[tier];
    });
    return g || null;
  }

  function applyPreset(p, preset) {
    p.preset = preset;
    const custom = p.rules.filter((r) => r.source === 'user');
    p.rules = presetRules(preset).concat(custom);
  }

  function setTier(p, ruleId, tier, speedBump) {
    const r = p.rules.find((x) => x.id === ruleId);
    if (!r) return { ok: false };
    const conflict = floorConflict(p, r.scope, tier);
    if (conflict) return { ok: false, conflict };
    r.tier = tier; r.speedBump = !!speedBump && tier === 'ask'; r.edited = true;
    return { ok: true };
  }

  function addRule(p, { area, min, max, tier, speedBump, kinds, label, category, exception }) {
    const scope = { kinds: kinds || MONEY_KINDS };
    if (area && area !== 'any') scope.areas = [area];
    if (category) scope.category = category;
    if (min) scope.min = min;
    if (max) scope.max = max;
    const conflict = floorConflict(p, scope, tier);
    if (conflict) return { ok: false, conflict };
    const areaName = area && area !== 'any' ? A.t('area.' + area, null, 'en').toLowerCase() : null;
    const areaNameHi = area && area !== 'any' ? A.t('area.' + area, null, 'hi') : null;
    const scopeText = label || {
      en: (areaName ? areaName + ' ' : '') + 'payments' + (min ? ' over ' + U.inr(min) : '') + (max ? ' up to ' + U.inr(max) : ''),
      hi: (areaNameHi ? areaNameHi + ' के ' : '') + 'भुगतान' + (min ? ' ' + U.inr(min) + ' से ज़्यादा' : '') + (max ? ' ' + U.inr(max) + ' तक' : '')
    };
    const rule = { id: U.uid('r'), scope, tier, speedBump: !!speedBump && tier === 'ask', source: 'user', scopeText, exception: !!exception };
    p.rules.push(rule);
    return { ok: true, rule };
  }

  /* Cached thresholds the agent uses when Anchor is unreachable (GET /anchor/policy-summary) */
  function summary(p) {
    const mid = p.rules.find((r) => r.situation === 'mid');
    const askFrom = mid && mid.tier !== 'auto' ? 5000 : 50000;
    return { askFrom, never: p.rules.filter((r) => r.tier === 'never').map((r) => r.situation || r.id) };
  }

  A.engine.policy = { RANK, MONEY_KINDS, SITUATIONS, presetRules, ruleText, evaluate, runningTotal, applyPreset, setTier, addRule, floorConflict, summary, matches };
})();
