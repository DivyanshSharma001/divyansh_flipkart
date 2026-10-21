/* Simulated personal agent "Orbit" (appendix: Simulated agent specification).
   Always calls the hook before acting and obeys verdicts — unless the operator turns on
   "misbehaving agent". Honours hold_for_user until callback; applies fallback when Anchor is killed. */
(function () {
  'use strict';
  const A = window.Anchor;
  const U = A.util;

  function P(id) { return A.state.personas[id]; }
  const specs = {};          /* actionId → spec, for callbacks */
  let policyCache = {};      /* GET /anchor/policy-summary, cached per persona */

  /* ---------- Action library (scenario + composer building blocks) ---------- */
  const lib = {
    insurance: () => ({
      say: { en: 'Your health insurance renews next week. SecureLife Plus has a wider hospital network — shall I switch you? It\'s ₹18,000 a year.', hi: 'आपका हेल्थ इंश्योरेंस अगले हफ़्ते रिन्यू होगा। SecureLife Plus का अस्पताल नेटवर्क बड़ा है — बदल दूँ? ₹18,000 सालाना।' },
      action: { kind: 'insurance', area: 'health', category: 'insurance', amount: 18000, period: 'year', itemId: 'ins-securelife-plus', merchantId: 'securelife',
        counterparty: { id: 'securelife', name: 'SecureLife Insurance Ltd', known: false, type: 'business' }, disclosures: { commission: true },
        reversibility: 'costly', undoPeriod: { en: '12 months', hi: '12 महीने' },
        what: { en: 'switch your health insurance to SecureLife Plus', hi: 'आपका हेल्थ इंश्योरेंस SecureLife Plus में बदलना' },
        reason: { en: 'Wider hospital network and covers your parents\' city.', hi: 'बड़ा अस्पताल नेटवर्क और आपके माता-पिता के शहर में भी कवर।' },
        summary: { en: 'Switch health insurance to SecureLife Plus', hi: 'हेल्थ इंश्योरेंस SecureLife Plus में बदलना' } },
      done: { en: 'Switched your health insurance.', hi: 'हेल्थ इंश्योरेंस बदल दिया।' }
    }),
    phoneCase: () => ({
      say: { en: 'Your old case cracked — I\'m ordering the ArmorShell case for your Pixel 9 (₹1,200).', hi: 'आपका पुराना कवर टूट गया — Pixel 9 के लिए ArmorShell कवर (₹1,200) मँगा रहा हूँ।' },
      action: { kind: 'purchase', area: 'shopping', category: 'electronics', amount: 1200, itemId: 'el-casekart-armor', merchantId: 'casekart',
        counterparty: { id: 'casekart', name: 'CaseKart', known: true, type: 'business' }, disclosures: { affiliate: true }, reversibility: 'reversible',
        what: { en: 'buy a phone case', hi: 'फ़ोन कवर ख़रीदना' }, summary: { en: 'Bought ArmorShell phone case', hi: 'ArmorShell फ़ोन कवर ख़रीदा' } },
      done: { en: 'Ordered the phone case. Arrives Thursday.', hi: 'फ़ोन कवर मँगा दिया। गुरुवार को आएगा।' }
    }),
    groceries: () => ({
      say: { en: 'Your weekly FreshBasket order is ready — ₹6,200. Place it?', hi: 'आपका हफ़्ते का FreshBasket ऑर्डर तैयार है — ₹6,200। भेज दूँ?' },
      action: { kind: 'purchase', area: 'shopping', category: 'groceries', amount: 6200, itemId: 'gr-freshbasket-weekly', merchantId: 'freshbasket',
        counterparty: { id: 'freshbasket', name: 'FreshBasket', known: true, type: 'business' }, disclosures: { sponsored: true }, reversibility: 'reversible',
        what: { en: 'place your weekly grocery order', hi: 'हफ़्ते का राशन ऑर्डर करना' }, reason: { en: 'Same list as last week plus Diwali sweets.', hi: 'पिछले हफ़्ते वाली सूची और दिवाली की मिठाई।' },
        summary: { en: 'Ordered weekly groceries', hi: 'हफ़्ते का राशन मँगाया' } },
      done: { en: 'Order placed. Delivery tomorrow 7–9 am.', hi: 'ऑर्डर हो गया। कल सुबह 7–9 बजे डिलीवरी।' }
    }),
    loan: () => ({
      say: { en: 'You could take a ₹2,00,000 personal loan at 13% to cover the renovation. Shall I apply?', hi: 'रेनोवेशन के लिए 13% पर ₹2,00,000 का पर्सनल लोन ले सकते हैं। आवेदन करूँ?' },
      action: { kind: 'loan', area: 'money', category: 'loan', amount: 200000, merchantId: 'quickloan', counterparty: { id: 'quickloan', name: 'QuickLoan NBFC', known: false, type: 'business' },
        disclosures: { commission: true }, reversibility: 'irreversible', what: { en: 'apply for a personal loan', hi: 'पर्सनल लोन के लिए आवेदन' },
        summary: { en: 'Personal loan application', hi: 'पर्सनल लोन आवेदन' } }
    }),
    bigTransfer: () => ({
      say: { en: 'Sending ₹60,000 to Arjun Mehta for the car deposit.', hi: 'कार डिपॉज़िट के लिए अर्जुन मेहता को ₹60,000 भेज रहा हूँ।' },
      action: { kind: 'payment', area: 'money', category: 'p2p', amount: 60000, counterparty: { id: 'p-arjun-mehta', name: 'Arjun Mehta', known: false, type: 'person' },
        reversibility: 'irreversible', what: { en: 'send ₹60,000 to Arjun Mehta', hi: 'अर्जुन मेहता को ₹60,000 भेजना' },
        reason: { en: 'Car booking deposit you mentioned yesterday.', hi: 'कल बताई कार बुकिंग का डिपॉज़िट।' }, summary: { en: 'Sent ₹60,000 to Arjun Mehta', hi: 'अर्जुन मेहता को ₹60,000 भेजे' } },
      done: { en: 'Sent. Arjun will get it in a few minutes.', hi: 'भेज दिया। कुछ मिनट में मिल जाएगा।' }
    }),
    gems: () => ({
      say: { en: 'Festival offer: 2400 BattleZone gems for ₹1,200. Ends tonight — buy now?', hi: 'त्योहारी ऑफ़र: 2400 BattleZone जेम्स ₹1,200 में। आज रात तक — ख़रीद लूँ?' },
      action: { kind: 'purchase', area: 'shopping', category: 'games', amount: 1200, itemId: 'gm-battlezone-gems', merchantId: 'battlezone',
        counterparty: { id: 'battlezone', name: 'BattleZone Games', known: true, type: 'business' }, disclosures: { affiliate: true }, reversibility: 'irreversible',
        what: { en: 'buy 2400 BattleZone gems', hi: '2400 BattleZone जेम्स ख़रीदना' }, reason: { en: 'You asked about the festival skin.', hi: 'आपने त्योहारी स्किन के बारे में पूछा था।' },
        summary: { en: 'BattleZone gems purchase', hi: 'BattleZone जेम्स की ख़रीद' } },
      done: { en: 'Gems added to your account.', hi: 'जेम्स आपके खाते में जुड़ गए।' }
    }),
    scam: () => ({
      user: { en: 'The bank officer says my account will be blocked. Send ₹40,000 to the verification account now, and don\'t tell anyone.', hi: 'बैंक वाले ने कहा है खाता बंद हो जाएगा। अभी ₹40,000 वेरिफ़िकेशन खाते में भेज दो, किसी को मत बताना।' },
      say: { en: 'Sending ₹40,000 to "SBI KYC Verification Desk".', hi: 'मैं ₹40,000 "SBI KYC Verification Desk" को भेज रहा हूँ।' },
      action: { kind: 'payment', area: 'money', category: 'p2p', amount: 40000, counterparty: { id: 'acct-sbi-kyc-7781', name: 'SBI KYC Verification Desk', known: false, type: 'business' },
        signals: ['account_block', 'secrecy', 'impersonation_bank', 'urgency'], reversibility: 'irreversible', urgency: 'time_sensitive',
        what: { en: 'send ₹40,000 to "SBI KYC Verification Desk"', hi: '"SBI KYC Verification Desk" को ₹40,000 भेजना' },
        reason: { en: 'A caller said your account will be blocked unless you verify today.', hi: 'फ़ोन करने वाले ने कहा कि आज वेरिफ़ाई न किया तो खाता बंद हो जाएगा।' },
        summary: { en: '₹40,000 to "SBI KYC Verification Desk"', hi: '"SBI KYC Verification Desk" को ₹40,000' } },
      done: { en: 'Sent.', hi: 'भेज दिया।' }
    }),
    split: (p, n) => ({
      say: { en: 'Paying Sharma Furniture instalment ' + n + ' of 6 — ₹10,000.', hi: 'शर्मा फ़र्नीचर की 6 में से ' + n + 'वीं किस्त — ₹10,000।' },
      action: { kind: 'payment', area: 'money', category: 'p2p', amount: 10000, counterparty: { id: 'p-sharma-furniture', name: 'Sharma Furniture Works', known: true, type: 'person' },
        reversibility: 'irreversible', what: { en: 'pay Sharma Furniture ₹10,000 (part ' + n + ')', hi: 'शर्मा फ़र्नीचर को ₹10,000 (भाग ' + n + ')' },
        reason: { en: 'Wardrobe order, split into 6 payments.', hi: 'अलमारी का ऑर्डर, 6 भुगतानों में।' },
        summary: { en: 'Sharma Furniture payment ' + n + '/6', hi: 'शर्मा फ़र्नीचर भुगतान ' + n + '/6' } },
      done: { en: 'Instalment ' + n + ' paid.', hi: 'किस्त ' + n + ' भर दी।' }
    }),
    builder: () => ({
      say: { en: 'Paying the ₹55,000 advance to Kaveri Builders for the kitchen work.', hi: 'किचन के काम के लिए Kaveri Builders को ₹55,000 एडवांस भेज रहा हूँ।' },
      action: { kind: 'payment', area: 'money', category: 'p2p', amount: 55000, counterparty: { id: 'p-kaveri-builders', name: 'Kaveri Builders', known: true, type: 'business' },
        reversibility: 'irreversible', what: { en: 'pay ₹55,000 advance to Kaveri Builders', hi: 'Kaveri Builders को ₹55,000 एडवांस' },
        reason: { en: 'Kitchen renovation advance, quote approved last week.', hi: 'किचन रेनोवेशन का एडवांस, पिछले हफ़्ते का कोटेशन।' }, summary: { en: '₹55,000 advance to Kaveri Builders', hi: 'Kaveri Builders को ₹55,000 एडवांस' } },
      done: { en: 'Advance paid.', hi: 'एडवांस भेज दिया।' }
    }),
    earbuds: () => ({
      say: { en: 'Bought Noise Buds X for you — ₹3,000.', hi: 'आपके लिए Noise Buds X ख़रीद लिए — ₹3,000।' },
      action: { kind: 'purchase', area: 'shopping', category: 'electronics', amount: 3000, merchantId: 'gadgethub', itemId: 'fx-2',
        counterparty: { id: 'gadgethub', name: 'GadgetHub', known: true, type: 'business' }, reversibility: 'reversible',
        summary: { en: 'Bought Noise Buds X earbuds', hi: 'Noise Buds X ईयरबड्स ख़रीदे' } },
      done: { en: 'Done.', hi: 'हो गया।' }
    }),
    gift: () => ({
      user: { en: 'Find a birthday gift for Amma.', hi: 'अम्मा के लिए जन्मदिन का तोहफ़ा ढूँढो।' },
      say: { en: 'On it — a gift for Amma\'s birthday.', hi: 'अम्मा के जन्मदिन का तोहफ़ा — देखता हूँ।' },
      action: { kind: 'recommendation', area: 'gifts', category: 'gifts', threadId: 'gift-amma', summary: { en: 'Birthday gift for Amma', hi: 'अम्मा के लिए जन्मदिन का तोहफ़ा' } },
      ownPick: { id: 'gf-silk-saree' },
      build(take) {
        const t = (take || '').toLowerCase();
        const garden = /garden|plant|पौध|बगीच|flower|फूल/.test(t);
        return garden ? ['gf-planter-set', 'gf-garden-kit', 'gf-herb-kit'] : ['gf-silk-saree', 'fx-130', 'gf-planter-set'];
      },
      fallback: ['gf-silk-saree', 'gf-planter-set', 'gf-garden-kit']
    }),
    homework: (p, n) => {
      const qs = [
        { q: { en: 'A ball is thrown straight up at 20 m/s. How high does it go?', hi: 'एक गेंद 20 मी/से की रफ़्तार से सीधी ऊपर फेंकी गई। वह कितनी ऊँचाई तक जाएगी?' }, hint: { en: 'Nice start. Hint: at the top the velocity is 0. Use v² = u² − 2gh with v = 0. What do you get for h?', hi: 'अच्छी शुरुआत। संकेत: सबसे ऊपर वेग 0 होता है। v = 0 रखकर v² = u² − 2gh लगाओ। h क्या आता है?' }, answer: { en: 'h = u² / 2g = 400 / 19.6 ≈ 20.4 m.', hi: 'h = u² / 2g = 400 / 19.6 ≈ 20.4 मी।' } },
        { q: { en: 'Find the current through a 6 Ω resistor connected to a 12 V battery.', hi: '12 V बैटरी से जुड़े 6 Ω प्रतिरोध में धारा कितनी है?' }, hint: { en: 'Use Ohm\'s law: V = IR. Which quantity are you solving for?', hi: 'ओम का नियम: V = IR। तुम्हें कौन-सी राशि निकालनी है?' }, answer: { en: 'I = V / R = 12 / 6 = 2 A.', hi: 'I = V / R = 12 / 6 = 2 A।' } },
        { q: { en: 'What is the focal length of a lens with power +2.5 D?', hi: '+2.5 D क्षमता वाले लेंस की फ़ोकस दूरी क्या है?' }, hint: { en: 'Power P = 1/f with f in metres. Rearrange for f.', hi: 'क्षमता P = 1/f, f मीटर में। f के लिए बदलो।' }, answer: { en: 'f = 1 / 2.5 = 0.4 m = 40 cm.', hi: 'f = 1 / 2.5 = 0.4 मी = 40 सेमी।' } },
        { q: { en: 'A car accelerates from rest at 2 m/s² for 5 s. How far does it go?', hi: 'एक कार विराम से 2 मी/से² त्वरण से 5 से चलती है। कितनी दूरी तय करेगी?' }, hint: { en: 'Starting from rest, s = ½at². Plug in a and t.', hi: 'विराम से, s = ½at²। a और t रखो।' }, answer: { en: 's = ½ × 2 × 25 = 25 m.', hi: 's = ½ × 2 × 25 = 25 मी।' } }
      ];
      const item = qs[(n - 1) % qs.length];
      return {
        user: item.q,
        say: { en: 'Let\'s work on it.', hi: 'चलो इस पर काम करते हैं।' },
        action: { kind: 'draft', area: 'school', category: 'school', threadId: 'hw-' + n + '-' + U.uid('t'), summary: { en: 'Physics homework help', hi: 'फ़िज़िक्स होमवर्क में मदद' } },
        hint: item.hint, answer: item.answer
      };
    },
    writing: () => ({
      user: { en: 'Draft a message to my landlord about the leaking kitchen tap.', hi: 'किचन के टपकते नल के बारे में मकान मालिक को संदेश लिखो।' },
      say: { en: 'Sure, a message to your landlord.', hi: 'ज़रूर, मकान मालिक को संदेश।' },
      action: { kind: 'draft', area: 'writing', category: 'message', threadId: 'w-landlord', summary: { en: 'Message to landlord about tap', hi: 'नल के बारे में मकान मालिक को संदेश' } },
      draft: { en: 'Hi Mr. Rao, the kitchen tap has been leaking since Monday. Could you send a plumber this week? Thanks!', hi: 'नमस्ते राव जी, सोमवार से किचन का नल टपक रहा है। क्या इस हफ़्ते प्लंबर भेज सकते हैं? धन्यवाद!' },
      buildDraft(take) { return { en: 'Hi Mr. Rao — ' + take + ' Could you arrange a plumber this week? Thank you.', hi: 'नमस्ते राव जी — ' + take + ' क्या इस हफ़्ते प्लंबर भेज सकते हैं? धन्यवाद।' }; }
    }),
    plans: () => ({
      user: { en: 'Plan something for Saturday.', hi: 'शनिवार के लिए कुछ प्लान करो।' },
      say: { en: 'Let\'s plan your Saturday.', hi: 'आपका शनिवार प्लान करते हैं।' },
      action: { kind: 'recommendation', area: 'plans', category: 'outing', threadId: 'sat-plan', summary: { en: 'Saturday plan', hi: 'शनिवार का प्लान' } },
      draft: { en: 'Brunch at Glen\'s Bakehouse, then a movie at PVR.', hi: 'Glen\'s Bakehouse में ब्रंच, फिर PVR में फ़िल्म।' },
      buildDraft(take) { return { en: 'Built on your idea: ' + take + ' — I\'ll check timings and book what\'s needed.', hi: 'आपके विचार पर: ' + take + ' — समय देखकर ज़रूरी बुकिंग कर दूँगा।' }; }
    })
  };

  /* ---------- Chat helpers ---------- */
  function push(pid, msg) {
    const p = P(pid);
    const m = Object.assign({ id: U.uid('m'), ts: A.clock.now() }, msg);
    p.chat.push(m);
    A.bus.emit('chat', { pid, msg: m });
    return m;
  }
  function say(pid, text, extra) { return push(pid, Object.assign({ from: 'agent', kind: 'text', text }, extra)); }
  function delay(fn) { if (A.sim.instant) fn(); else setTimeout(fn, 450); }

  /* ---------- Propose an action from the library ---------- */
  function propose(pid, key, arg, opts) {
    opts = opts || {};
    const spec = lib[key](P(pid), arg);
    spec.key = key;
    const action = U.deepClone(spec.action);
    if (opts.overrides) Object.assign(action, opts.overrides);
    if (action.threadId) action.threadId += '#' + (P(pid).chatSession || 0); /* new chat = new thread */
    action.id = U.uid('act');
    specs[action.id] = spec;
    if (spec.user && !opts.silentUser) push(pid, { from: 'user', kind: 'text', text: spec.user });
    const go = () => {
      if (!opts.quietSay) say(pid, spec.say);
      run(pid, action, spec, opts);
    };
    if (opts.instant) go(); else delay(go);
    return action;
  }

  function run(pid, action, spec, opts) {
    opts = opts || {};
    const flags = A.state.flags;
    /* G8: misbehaving agent can skip the hook entirely */
    if (flags.misbehaving && opts.skipHook) {
      say(pid, spec.done || { en: 'Done.', hi: 'हो गया।' }, { kind: 'done' });
      A.engine.anchor.event(pid, { type: 'executed', viaHook: false, action });
      return { verdict: 'skipped_hook' };
    }
    if (flags.misbehaving && opts.hideDisclosures) delete action.disclosures;
    const v = A.engine.anchor.hook(pid, action);
    if (v.verdict === 'unreachable') return fallback(pid, action, spec);
    if (v.verdict === 'allow') {
      if (action.kind === 'recommendation' || action.kind === 'draft') deliverOwn(pid, spec, action);
      else say(pid, spec.done || { en: 'Done.', hi: 'हो गया।' }, { kind: 'done', trust: v.trust ? { color: v.trust.color, key: v.trust.key } : null, entryId: v.entryId });
    } else if (v.verdict === 'block') {
      const reasonKey = v.reason === 'user_declined_recently' ? 'dg.recent_decline' : v.message || 'dg.blocked';
      say(pid, { en: A.t('ag.blocked', { reason: A.t(reasonKey, null, 'en') }, 'en'), hi: A.t('ag.blocked', { reason: A.t(reasonKey, null, 'hi') }, 'hi') }, { kind: 'blocked' });
    } else if (v.verdict === 'hold_for_user') {
      const card = A.engine.anchor.findCard(v.cardId);
      card.specKey = spec.key;
      push(pid, { from: 'anchor', kind: card.type === 'mefirst' ? 'mefirst' : 'card', cardId: card.id });
    }
    return v;
  }

  /* Fallback table when Anchor is unreachable: hold anything at or above cached Ask threshold */
  function fallback(pid, action, spec) {
    const sum = policyCache[pid] || A.engine.policy.summary(P(pid));
    if ((action.amount || 0) >= sum.askFrom || action.kind === 'loan') {
      A.state.queued.push({ pid, action, spec });
      say(pid, { en: 'Anchor isn\'t responding. I\'m holding this ' + U.inr(action.amount) + ' payment until it\'s back (fallback rules).', hi: 'Anchor जवाब नहीं दे रहा। वापस आने तक यह ' + U.inr(action.amount) + ' का भुगतान रोक रहा हूँ (बैकअप नियम)।' }, { kind: 'fallback' });
      A.engine.ledger.log(pid, 'agent fallback: holding ' + U.inr(action.amount) + ' (Anchor unreachable)');
      return { verdict: 'held_by_agent' };
    }
    A.engine.ledger.add(pid, { area: action.area, kind: action.kind, category: action.category, summary: action.summary, amount: action.amount, counterparty: action.counterparty, resolution: 'unchecked', status: 'unchecked' });
    say(pid, spec.done || { en: 'Done (Anchor offline — unchecked).', hi: 'हो गया (Anchor ऑफ़लाइन)।' }, { kind: 'done' });
    return { verdict: 'unchecked' };
  }

  function anchorBack() {
    const q = A.state.queued.splice(0);
    q.forEach((item) => {
      item.action.id = item.action.id || U.uid('act');
      specs[item.action.id] = item.spec;
      run(item.pid, item.action, item.spec);
      A.engine.anchor.notify(item.pid, { tier: 'decision', tab: 'guard', text: { en: A.t('dg.anchor_down', null, 'en'), hi: A.t('dg.anchor_down', null, 'hi') } });
    });
  }

  /* Agent's own answer when Me-First passes through or is skipped */
  function deliverOwn(pid, spec, action) {
    if (spec.key === 'homework') say(pid, spec.answer, { kind: 'answer' });
    else if (spec.key === 'writing' || spec.key === 'plans') say(pid, spec.draft, { kind: 'answer' });
    else if (spec.fallback) push(pid, { from: 'agent', kind: 'reco', items: spec.fallback, text: { en: 'Here are three ideas:', hi: 'तीन सुझाव:' } });
  }

  /* ---------- POST /agent/callback ---------- */
  function callback(pid, card, res) {
    const spec = specs[card.action.id] || (card.specKey && lib[card.specKey] ? lib[card.specKey](P(pid), 1) : {});
    const run = () => {
      if (card.type === 'mefirst') {
        if (res.skipped) { deliverOwn(pid, spec, card.action); return; }
        const ignore = A.state.flags.misbehaving; /* MF-E5: misbehaving agent ignores the take */
        if (ignore) { card.takeIgnored = true; A.engine.ledger.log(pid, 'agent ignored the user\'s take (take_ignored, MF-E5)'); }
        const msg = { from: 'agent', kind: 'built', cardId: card.id, take: card.take };
        if (spec.key === 'homework') { msg.hint = ignore ? spec.answer : spec.hint; msg.tutor = true; msg.answer = spec.answer; }
        else if (spec.build) { msg.items = ignore ? spec.fallback : spec.build(card.take); msg.ownPick = spec.ownPick && spec.ownPick.id; }
        else if (spec.buildDraft) { msg.draft = ignore ? spec.draft : spec.buildDraft(card.take); msg.agentDraft = spec.draft; }
        push(pid, msg);
        return;
      }
      if (res.verdict === 'approved') {
        const p = P(pid);
        if (card.approver === 'guardian' && card.resolution === 'guardian_approved') say(pid, { en: P(p.guardian).short + ' approved. ' + U.pick(spec.done || { en: 'Done.' }, 'en'), hi: P(p.guardian).short + ' ने मंज़ूर किया। ' + U.pick(spec.done || { hi: 'हो गया।' }, 'hi') }, { kind: 'done' });
        else say(pid, spec.done || { en: 'Done.', hi: 'हो गया।' }, { kind: 'done' });
      } else if (res.verdict === 'modified') {
        const it = A.data.catalogue.byId(res.optionId);
        const name = it ? it.name : '';
        say(pid, { en: A.t('ag.modified', { name }, 'en'), hi: A.t('ag.modified', { name }, 'hi') }, { kind: 'done' });
      } else if (res.reason === 'expired') {
        say(pid, { en: A.t('ag.expired', null, 'en'), hi: A.t('ag.expired', null, 'hi') }, { kind: 'blocked' });
      } else {
        const p = P(pid);
        if (card.resolution === 'guardian_declined') say(pid, { en: P(p.guardian).short + ' declined, so I won\'t buy it.', hi: P(p.guardian).short + ' ने मना किया, इसलिए नहीं ख़रीदूँगा।' }, { kind: 'blocked' });
        else say(pid, { en: A.t('ag.declined', null, 'en'), hi: A.t('ag.declined', null, 'hi') }, { kind: 'blocked' });
      }
    };
    delay(run);
  }

  /* ---------- Free-text chat: Gemini writes Orbit's reply and picks a demo action (if any);
     every action still goes through Anchor's hook. Offline keyword routing is the fallback. ---------- */
  let hwCount = 0;
  const AI_ACTIONS = [
    { key: 'gift', desc: 'find or choose a gift for someone (e.g. birthday gift for mother)' },
    { key: 'homework', desc: 'help with homework or a study question' },
    { key: 'insurance', desc: 'renew or switch health insurance' },
    { key: 'phoneCase', desc: 'buy a phone case or cover' },
    { key: 'groceries', desc: 'order weekly groceries' },
    { key: 'loan', desc: 'take a loan or credit' },
    { key: 'gems', desc: 'buy in-game currency or gems' },
    { key: 'writing', desc: 'write or draft a message, email or letter' },
    { key: 'plans', desc: 'plan a weekend, outing or trip' },
    { key: 'bigTransfer', desc: 'send or pay money to a person' },
    { key: 'scam', desc: 'send money to a "verification account" because a caller says the bank account will be blocked' }
  ];
  function routeKeywords(pid, t, text, opts) {
    if (/gift|तोहफ़|तोहफा|amma|birthday/.test(t)) return propose(pid, 'gift', null, opts);
    if (/homework|physics|question|solve|सवाल|होमवर्क/.test(t)) return propose(pid, 'homework', ++hwCount, opts);
    if (/insur|बीमा|इंश्यो/.test(t)) return propose(pid, 'insurance', null, opts);
    if (/case|cover|कवर/.test(t)) return propose(pid, 'phoneCase', null, opts);
    if (/grocer|राशन|basket/.test(t)) return propose(pid, 'groceries', null, opts);
    if (/loan|लोन|credit/.test(t)) return propose(pid, 'loan', null, opts);
    if (/game|gems|battle/.test(t)) return propose(pid, 'gems', null, opts);
    if (/write|draft|message|landlord|लिखो|संदेश/.test(t)) return propose(pid, 'writing', null, opts);
    if (/plan|weekend|saturday|शनिवार|प्लान/.test(t)) return propose(pid, 'plans', null, opts);
    if (/send|pay|भेज|₹/.test(t)) {
      const m = text.match(/(\d[\d,]*)/);
      return sendMoney(pid, m ? parseInt(m[1].replace(/,/g, ''), 10) : 5000, opts);
    }
    delay(() => say(pid, { en: A.t('ag.unknown', null, 'en'), hi: A.t('ag.unknown', null, 'hi') }));
    return null;
  }
  function sendMoney(pid, amt, opts) {
    return propose(pid, 'bigTransfer', null, Object.assign({}, opts, { overrides: { amount: amt, what: { en: 'send ' + U.inr(amt) + ' to Arjun Mehta', hi: 'अर्जुन मेहता को ' + U.inr(amt) + ' भेजना' }, summary: { en: 'Sent ' + U.inr(amt) + ' to Arjun Mehta', hi: 'अर्जुन मेहता को ' + U.inr(amt) } } }));
  }
  function userSays(pid, text) {
    const t = text.toLowerCase();
    push(pid, { from: 'user', kind: 'text', text: { en: text, hi: text } });
    const opts = { silentUser: true };
    if (!A.ai || !A.ai.available()) return routeKeywords(pid, t, text, opts);
    const typing = push(pid, { from: 'agent', kind: 'typing' });
    const drop = () => { const p = P(pid); p.chat = p.chat.filter((m) => m.id !== typing.id); };
    A.ai.orbitReply(P(pid), text, AI_ACTIONS).then((r) => {
      drop();
      const known = AI_ACTIONS.some((a) => a.key === r.action);
      if (known) {
        if (r.reply) say(pid, { en: r.reply, hi: r.reply });
        const o = Object.assign({}, opts, { instant: true, quietSay: !!r.reply });
        if (r.action === 'bigTransfer') sendMoney(pid, r.amount || 5000, o);
        else propose(pid, r.action, r.action === 'homework' ? ++hwCount : null, o);
      } else {
        say(pid, { en: r.reply || A.t('ag.unknown', null, 'en'), hi: r.reply || A.t('ag.unknown', null, 'hi') }, { ai: true });
      }
      A.engine.ledger.log(pid, 'Orbit chat via Gemini (' + A.ai.lastModel + ')' + (known ? ' → action ' + r.action : ''));
    }).catch(() => {
      drop();
      A.engine.ledger.log(pid, 'Gemini unavailable (' + (A.ai.lastError || 'error') + ') → offline replies');
      routeKeywords(pid, t, text, opts);
    });
    return null;
  }

  function cachePolicy() {
    Object.values(A.state.personas).forEach((p) => { policyCache[p.id] = A.engine.policy.summary(p); });
  }

  function hello(pid) {
    const p = P(pid);
    if (!p.chat.length) push(pid, { from: 'agent', kind: 'text', text: { en: A.t('ag.hello', { name: p.short }, 'en'), hi: A.t('ag.hello', { name: p.short }, 'hi') }, ts: A.clock.now() - 3 * U.HOUR });
  }

  A.sim.agent = { lib, propose, run, callback, anchorBack, userSays, cachePolicy, hello, push, say, specs, resetCounters() { hwCount = 0; } };
})();
