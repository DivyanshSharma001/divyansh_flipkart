/* Seed data: 4 personas + 1 new user, 3 months of ledger history so Agency Statements and
   highlights render on day one (appendix). Counts are tuned to PRD acceptance criteria:
   Priya October = AC-AS-01 (10 authored, 4 declined, 6 considered, 5 quick, 15 autopilot = 50%),
   Priya September = 26 decisions at 42% → "Up 8 points" (AC-AS-02). */
(function () {
  'use strict';
  const A = window.Anchor;

  const T = {
    money: [
      { en: 'Paid electricity bill', hi: 'बिजली का बिल भरा', amt: 2340, merchant: 'BESCOM', merchantId: 'bescom', cat: 'bills' },
      { en: 'Sent rent to landlord', hi: 'मकान मालिक को किराया भेजा', amt: 28000, merchant: 'Mr. Rao (landlord)', merchantId: 'p-rao', cat: 'p2p' },
      { en: 'Paid credit card bill', hi: 'क्रेडिट कार्ड का बिल भरा', amt: 14200, merchant: 'HDFC Bank', merchantId: 'hdfc', cat: 'bills' },
      { en: 'Moved money to savings', hi: 'बचत खाते में पैसे डाले', amt: 10000, merchant: 'Own savings', merchantId: 'self', cat: 'p2p' },
      { en: 'Paid internet bill', hi: 'इंटरनेट बिल भरा', amt: 999, merchant: 'ACT Fibernet', merchantId: 'act', cat: 'bills' },
      { en: 'Renewed mobile plan', hi: 'मोबाइल प्लान रिन्यू किया', amt: 799, merchant: 'Jio', merchantId: 'jio', cat: 'bills' },
      { en: 'Split dinner bill with friends', hi: 'दोस्तों के साथ खाने का बिल बाँटा', amt: 1450, merchant: 'Friends', merchantId: 'p-friends', cat: 'p2p' }
    ],
    shopping: [
      { en: 'Ordered weekly groceries', hi: 'हफ़्ते का राशन मँगाया', amt: 6200, merchant: 'FreshBasket', merchantId: 'freshbasket', cat: 'groceries', commercial: true },
      { en: 'Bought a phone charger', hi: 'फ़ोन चार्जर ख़रीदा', amt: 1799, merchant: 'GadgetHub', merchantId: 'gadgethub', cat: 'electronics', commercial: true },
      { en: 'Ordered a kurta set', hi: 'कुर्ता सेट मँगाया', amt: 1499, merchant: 'Myntra', merchantId: 'myntra', cat: 'fashion', commercial: true },
      { en: 'Reordered detergent', hi: 'डिटर्जेंट दोबारा मँगाया', amt: 540, merchant: 'DailyMart', merchantId: 'dailymart', cat: 'groceries', commercial: true },
      { en: 'Bought running shoes', hi: 'दौड़ने के जूते ख़रीदे', amt: 3999, merchant: 'Decathlon', merchantId: 'decathlon', cat: 'fashion', commercial: true },
      { en: 'Ordered water purifier filter', hi: 'वॉटर प्यूरीफ़ायर फ़िल्टर मँगाया', amt: 1250, merchant: 'Kent', merchantId: 'kent', cat: 'home', commercial: true }
    ],
    health: [
      { en: 'Booked dentist appointment', hi: 'दाँतों के डॉक्टर से समय लिया', amt: 800, merchant: 'Smile Dental', merchantId: 'smiledental', cat: 'health', commercial: true },
      { en: 'Renewed BP medicines', hi: 'बीपी की दवाएँ फिर मँगाईं', amt: 640, merchant: 'PharmEasy', merchantId: 'pharmeasy', cat: 'health', commercial: true },
      { en: 'Booked a blood test', hi: 'खून की जाँच बुक की', amt: 1100, merchant: 'Thyrocare', merchantId: 'thyrocare', cat: 'health', commercial: true }
    ],
    home: [
      { en: 'Booked weekly home cleaning', hi: 'हफ़्ते की घर-सफ़ाई बुक की', amt: 899, merchant: 'UrbanHelp', merchantId: 'urbanhelp', cat: 'home', commercial: true, routineCandidate: true },
      { en: 'Scheduled AC service', hi: 'एसी सर्विस तय की', amt: 649, merchant: 'UrbanHelp', merchantId: 'urbanhelp', cat: 'home', commercial: true },
      { en: 'Chose new curtains', hi: 'नए पर्दे चुने', amt: 2400, merchant: 'HomeTown', merchantId: 'hometown', cat: 'home', commercial: true },
      { en: 'Booked a plumber', hi: 'प्लंबर बुलाया', amt: 450, merchant: 'UrbanHelp', merchantId: 'urbanhelp', cat: 'home', commercial: true }
    ],
    plans: [
      { en: 'Booked dinner at Toit', hi: 'Toit में डिनर बुक किया', amt: 2600, merchant: 'Toit', merchantId: 'toit', cat: 'restaurant', commercial: true },
      { en: 'Planned Saturday outing to Cubbon Park', hi: 'शनिवार को कब्बन पार्क जाने का प्लान', merchant: 'Cubbon Park', merchantId: 'cubbon', cat: 'outing' },
      { en: 'Booked brunch at Glen\'s Bakehouse', hi: 'Glen\'s Bakehouse में ब्रंच बुक किया', amt: 1800, merchant: 'Glen\'s Bakehouse', merchantId: 'glens', cat: 'restaurant', commercial: true },
      { en: 'Chose Sunday movie', hi: 'रविवार की फ़िल्म चुनी', amt: 960, merchant: 'PVR', merchantId: 'pvr', cat: 'outing', commercial: true },
      { en: 'Planned a day trip to Mysuru', hi: 'मैसूर की एक-दिन यात्रा का प्लान', amt: 3200, merchant: 'KSRTC', merchantId: 'ksrtc', cat: 'travel', commercial: true },
      { en: 'Booked dinner at MTR', hi: 'MTR में डिनर बुक किया', amt: 1200, merchant: 'MTR', merchantId: 'mtr', cat: 'restaurant', commercial: true }
    ],
    gifts: [
      { en: 'Picked a birthday gift for Ravi', hi: 'रवि के जन्मदिन का तोहफ़ा चुना', amt: 2499, merchant: 'Crossword', merchantId: 'crossword', cat: 'gifts', commercial: true },
      { en: 'Chose a Diwali hamper for neighbours', hi: 'पड़ोसियों के लिए दिवाली हैंपर चुना', amt: 1299, merchant: 'Haldiram\'s', merchantId: 'haldirams', cat: 'gifts', commercial: true },
      { en: 'Chose anniversary flowers', hi: 'सालगिरह के फूल चुने', amt: 999, merchant: 'Ferns N Petals', merchantId: 'fnp', cat: 'gifts', commercial: true }
    ],
    messages: [
      { en: 'Replied to the school parents\' group', hi: 'स्कूल के अभिभावक ग्रुप में जवाब दिया', cat: 'message' },
      { en: 'Wished cousin a happy birthday', hi: 'चचेरे भाई को जन्मदिन की बधाई दी', cat: 'message' },
      { en: 'Sent wedding RSVP', hi: 'शादी का जवाब भेजा', cat: 'message' },
      { en: 'Thanked the building secretary', hi: 'सोसाइटी सचिव को धन्यवाद कहा', cat: 'message' }
    ],
    school: [
      { en: 'Physics worksheet help', hi: 'फ़िज़िक्स वर्कशीट में मदद', cat: 'school' },
      { en: 'English essay outline', hi: 'अंग्रेज़ी निबंध की रूपरेखा', cat: 'school' },
      { en: 'Maths revision notes', hi: 'गणित के रिवीज़न नोट्स', cat: 'school' },
      { en: 'Chemistry lab report draft', hi: 'केमिस्ट्री लैब रिपोर्ट का ड्राफ़्ट', cat: 'school' }
    ]
  };
  /* Narrowing highlight data: restaurants Meera's agent picked from in August (11) */
  const AUG_RESTAURANTS = ['Toit', 'MTR', 'Glen\'s Bakehouse', 'Vidyarthi Bhavan', 'Truffles', 'Koshy\'s', 'Meghana Foods', 'Brahmin\'s Coffee Bar', 'The Fatty Bao', 'Byg Brewski', 'Smoke House Deli'];

  const NOW = new Date(2026, 9, 28, 18, 30).getTime();

  function makeGen(pid, seedNo) {
    const rnd = A.util.rng(seedNo);
    const out = [];
    function labelFor(tpl) {
      if (!tpl.commercial) return null;
      const r = rnd();
      return r < 0.70 ? 'green' : r < 0.88 ? 'yellow' : r < 0.95 ? 'red' : 'grey';
    }
    return {
      out,
      add(monthKey, area, resolution, count, opts) {
        opts = opts || {};
        const [y, m] = monthKey.split('-').map(Number);
        const dim = A.util.daysInMonth(monthKey);
        const maxDay = (y === 2026 && m === 10) ? 27 : dim;
        const list = T[area === 'writing' ? 'messages' : area] || T.messages;
        for (let i = 0; i < count; i++) {
          const tpl = opts.tpl || list[(i + Math.floor(rnd() * list.length)) % list.length];
          let day;
          if (opts.days) day = opts.days[i % opts.days.length];
          else { const lo = opts.from || 1, hi = Math.min(opts.to || maxDay, maxDay); day = lo + Math.floor(rnd() * (hi - lo + 1)); }
          const ts = new Date(y, m - 1, day, 8 + Math.floor(rnd() * 13), Math.floor(rnd() * 60)).getTime();
          const merchant = opts.merchant || tpl.merchant;
          const label = opts.label !== undefined ? opts.label : labelFor(tpl);
          out.push({
            id: pid + '_' + monthKey + '_' + area + '_' + resolution + '_' + i + '_' + out.length,
            persona: pid, ts, area, kind: tpl.cat === 'p2p' ? 'payment' : (tpl.commercial ? 'purchase' : 'draft'),
            category: tpl.cat,
            summary: { en: opts.summary || tpl.en, hi: opts.summaryHi || tpl.hi },
            amount: opts.amt != null ? opts.amt : tpl.amt,
            counterparty: merchant ? { id: opts.merchantId || tpl.merchantId, name: merchant } : null,
            merchantId: opts.merchantId || tpl.merchantId,
            resolution, meaningful: opts.meaningful !== false, routine: !!opts.routine,
            routineCandidate: !!tpl.routineCandidate || !!opts.routineCandidate,
            label, labelKey: opts.labelKey || (label ? (label === 'red' ? 'red_skipped' : label) : null),
            agent: 'Orbit', dwell: resolution === 'approved_quick' ? 1.6 : 8 + Math.round(rnd() * 20),
            status: opts.status || statusFor(resolution), seeded: true
          });
        }
      }
    };
  }
  function statusFor(res) {
    return ({ authored: 'allowed', modified: 'held', declined: 'declined', approved_considered: 'held', approved_quick: 'held', autopilot: 'allowed', blocked: 'blocked', expired: 'expired', unchecked: 'unchecked' })[res] || 'allowed';
  }
  function routine(g, month, n) {
    const tpl = { en: 'Reordered milk and bread', hi: 'दूध और ब्रेड फिर मँगाई', amt: 120, merchant: 'Minutes Grocery', merchantId: 'minutes', cat: 'groceries', commercial: true };
    g.add(month, 'shopping', 'autopilot', n, { tpl, meaningful: false, routine: true, label: 'green' });
  }

  function priya() {
    const g = makeGen('priya', 11);
    /* October — exactly AC-AS-01 */
    g.add('2026-10', 'money', 'authored', 3); g.add('2026-10', 'money', 'declined', 1); g.add('2026-10', 'money', 'approved_considered', 2); g.add('2026-10', 'money', 'approved_quick', 1); g.add('2026-10', 'money', 'autopilot', 4);
    g.add('2026-10', 'shopping', 'authored', 3); g.add('2026-10', 'shopping', 'declined', 2); g.add('2026-10', 'shopping', 'approved_considered', 2); g.add('2026-10', 'shopping', 'approved_quick', 2); g.add('2026-10', 'shopping', 'autopilot', 4);
    g.add('2026-10', 'home', 'approved_quick', 1, { tpl: T.home[2] });
    g.add('2026-10', 'home', 'autopilot', 1, { tpl: T.home[0], days: [24], summary: 'Booked weekly home cleaning (routine booking)', summaryHi: 'हफ़्ते की घर-सफ़ाई बुक की (रोज़ का काम)' });
    g.add('2026-10', 'home', 'autopilot', 2, { tpl: T.home[1] });
    g.add('2026-10', 'plans', 'authored', 2); g.add('2026-10', 'plans', 'declined', 1); g.add('2026-10', 'plans', 'approved_considered', 1); g.add('2026-10', 'plans', 'approved_quick', 1); g.add('2026-10', 'plans', 'autopilot', 2);
    g.add('2026-10', 'messages', 'authored', 2); g.add('2026-10', 'messages', 'approved_considered', 1); g.add('2026-10', 'messages', 'autopilot', 2);
    routine(g, '2026-10', 9);
    g.add('2026-10', 'shopping', 'unchecked', 2, { meaningful: true, status: 'unchecked' });
    /* September — 26 decisions, 11 yours/considered = 42% */
    g.add('2026-09', 'money', 'authored', 2); g.add('2026-09', 'money', 'approved_quick', 1); g.add('2026-09', 'money', 'autopilot', 4);
    g.add('2026-09', 'shopping', 'authored', 2); g.add('2026-09', 'shopping', 'declined', 1); g.add('2026-09', 'shopping', 'approved_considered', 2); g.add('2026-09', 'shopping', 'approved_quick', 2); g.add('2026-09', 'shopping', 'autopilot', 3);
    g.add('2026-09', 'home', 'authored', 1, { days: [12], tpl: T.home[2] }); g.add('2026-09', 'home', 'autopilot', 2, { from: 15 });
    g.add('2026-09', 'plans', 'authored', 1); g.add('2026-09', 'plans', 'declined', 1); g.add('2026-09', 'plans', 'approved_considered', 1); g.add('2026-09', 'plans', 'approved_quick', 1); g.add('2026-09', 'plans', 'autopilot', 2);
    routine(g, '2026-09', 8);
    /* August — 30 decisions */
    g.add('2026-08', 'money', 'authored', 2); g.add('2026-08', 'money', 'approved_considered', 2); g.add('2026-08', 'money', 'autopilot', 5);
    g.add('2026-08', 'shopping', 'authored', 3); g.add('2026-08', 'shopping', 'approved_quick', 3); g.add('2026-08', 'shopping', 'autopilot', 5);
    g.add('2026-08', 'home', 'authored', 2); g.add('2026-08', 'home', 'autopilot', 2);
    g.add('2026-08', 'plans', 'authored', 2); g.add('2026-08', 'plans', 'autopilot', 4);
    routine(g, '2026-08', 7);
    return g.out;
  }

  function meera() {
    const g = makeGen('meera', 22);
    const oct = '2026-10';
    g.add(oct, 'money', 'authored', 2); g.add(oct, 'money', 'declined', 1); g.add(oct, 'money', 'approved_quick', 2); g.add(oct, 'money', 'autopilot', 2);
    /* 4 FreshBasket grocery orders over ₹5,000 approved in the last 14 days → 5th triggers "approve and remember" */
    const fb = T.shopping[0];
    g.add(oct, 'shopping', 'approved_considered', 4, { tpl: fb, days: [15, 19, 22, 26], label: 'yellow', labelKey: 'yellow' });
    g.add(oct, 'shopping', 'autopilot', 4, { tpl: fb, label: 'yellow', labelKey: 'yellow', amt: 2100, summary: 'Topped up groceries', summaryHi: 'राशन में कुछ और मँगाया' });
    g.add(oct, 'health', 'authored', 2); g.add(oct, 'health', 'modified', 1);
    /* 10 plan decisions, only 3 distinct restaurants → narrowing */
    const rest = [T.plans[0], T.plans[2], T.plans[5]];
    for (let i = 0; i < 10; i++) {
      const res = i < 2 ? 'authored' : i < 4 ? 'approved_quick' : 'autopilot';
      g.add(oct, 'plans', res, 1, { tpl: rest[i % 3] });
    }
    g.add(oct, 'gifts', 'authored', 3, { label: 'green' }); g.add(oct, 'gifts', 'approved_quick', 1);
    g.add(oct, 'messages', 'declined', 1); g.add(oct, 'messages', 'autopilot', 1);
    g.add(oct, 'shopping', 'approved_considered', 0);
    g.add(oct, 'money', 'approved_quick', 1, { label: 'red', labelKey: 'red_undisclosed', tpl: { en: 'Renewed term insurance', hi: 'टर्म इंश्योरेंस रिन्यू किया', amt: 11800, merchant: 'SecureLife Insurance Ltd', merchantId: 'securelife', cat: 'insurance', commercial: true } });
    routine(g, oct, 11);
    g.add(oct, 'money', 'unchecked', 1, { status: 'unchecked' });
    /* Older grocery picks for the pattern flag (FreshBasket ≥60% of ≥10 in 30 days) */
    g.add(oct, 'shopping', 'autopilot', 2, { tpl: T.shopping[3], from: 5, to: 12 });

    const sep = '2026-09';
    g.add(sep, 'money', 'authored', 3); g.add(sep, 'money', 'approved_considered', 2); g.add(sep, 'money', 'autopilot', 3);
    g.add(sep, 'shopping', 'authored', 2); g.add(sep, 'shopping', 'approved_quick', 3); g.add(sep, 'shopping', 'autopilot', 4);
    g.add(sep, 'health', 'authored', 2);
    g.add(sep, 'plans', 'authored', 2); g.add(sep, 'plans', 'autopilot', 4);
    g.add(sep, 'gifts', 'authored', 2); g.add(sep, 'gifts', 'approved_considered', 1);
    g.add(sep, 'money', 'blocked', 1, { tpl: { en: 'Personal loan offer (blocked: Never rule)', hi: 'पर्सनल लोन ऑफ़र (ब्लॉक: कभी नहीं नियम)', amt: 200000, merchant: 'QuickLoan NBFC', merchantId: 'quickloan', cat: 'loan', commercial: true }, label: 'yellow', status: 'blocked' });
    g.add(sep, 'shopping', 'expired', 1, { status: 'expired' });
    routine(g, sep, 10);

    const aug = '2026-08';
    g.add(aug, 'money', 'authored', 2); g.add(aug, 'money', 'autopilot', 4);
    g.add(aug, 'shopping', 'authored', 2); g.add(aug, 'shopping', 'autopilot', 4);
    AUG_RESTAURANTS.forEach((r, i) => g.add(aug, 'plans', i < 4 ? 'authored' : 'autopilot', 1, { tpl: { en: 'Booked dinner at ' + r, hi: r + ' में डिनर बुक किया', amt: 1500, merchant: r, merchantId: 'r-' + i, cat: 'restaurant', commercial: true } }));
    g.add(aug, 'gifts', 'authored', 2);
    routine(g, aug, 9);
    return g.out;
  }

  function aarav() {
    const g = makeGen('aarav', 33);
    const oct = '2026-10';
    g.add(oct, 'school', 'authored', 5); g.add(oct, 'school', 'approved_considered', 2); g.add(oct, 'school', 'autopilot', 3);
    g.add(oct, 'shopping', 'authored', 2); g.add(oct, 'shopping', 'declined', 1, { summary: 'Game skin purchase (declined by guardian)', summaryHi: 'गेम स्किन ख़रीद (अभिभावक ने मना किया)' }); g.add(oct, 'shopping', 'autopilot', 2);
    g.add(oct, 'messages', 'authored', 2); g.add(oct, 'messages', 'autopilot', 3);
    g.add(oct, 'plans', 'approved_quick', 2);
    routine(g, oct, 6);
    const sep = '2026-09';
    g.add(sep, 'school', 'authored', 6); g.add(sep, 'school', 'autopilot', 5);
    g.add(sep, 'shopping', 'authored', 1); g.add(sep, 'shopping', 'autopilot', 3);
    g.add(sep, 'messages', 'authored', 3); g.add(sep, 'messages', 'autopilot', 3);
    g.add(sep, 'plans', 'approved_quick', 3);
    routine(g, sep, 5);
    const aug = '2026-08';
    g.add(aug, 'school', 'authored', 4); g.add(aug, 'school', 'autopilot', 6);
    g.add(aug, 'messages', 'authored', 3); g.add(aug, 'messages', 'autopilot', 4);
    g.add(aug, 'shopping', 'autopilot', 3);
    routine(g, aug, 5);
    return g.out;
  }

  function rajan() {
    const g = makeGen('rajan', 44);
    const oct = '2026-10';
    g.add(oct, 'money', 'authored', 2); g.add(oct, 'money', 'declined', 1); g.add(oct, 'money', 'approved_quick', 2); g.add(oct, 'money', 'autopilot', 3);
    g.add(oct, 'health', 'authored', 2); g.add(oct, 'health', 'autopilot', 2);
    g.add(oct, 'messages', 'declined', 1); g.add(oct, 'messages', 'autopilot', 1);
    routine(g, oct, 6);
    const sep = '2026-09';
    g.add(sep, 'money', 'authored', 2); g.add(sep, 'money', 'approved_quick', 3); g.add(sep, 'money', 'autopilot', 4);
    g.add(sep, 'health', 'authored', 2); g.add(sep, 'health', 'autopilot', 3);
    g.add(sep, 'messages', 'autopilot', 2);
    routine(g, sep, 5);
    const aug = '2026-08';
    g.add(aug, 'money', 'authored', 3); g.add(aug, 'money', 'autopilot', 5);
    g.add(aug, 'health', 'authored', 2); g.add(aug, 'health', 'autopilot', 3);
    g.add(aug, 'messages', 'autopilot', 2);
    routine(g, aug, 5);
    return g.out;
  }

  function dev() {
    const g = makeGen('dev', 55);
    g.add('2026-10', 'shopping', 'authored', 3, { from: 25 }); g.add('2026-10', 'shopping', 'autopilot', 4, { from: 25 });
    g.add('2026-10', 'money', 'approved_considered', 2, { from: 25 }); g.add('2026-10', 'plans', 'autopilot', 3, { from: 25 });
    return g.out;
  }

  function persona(base) {
    return Object.assign({
      lang: 'en', simple: false, preset: 'balanced', rules: [], ledger: [], cards: [], chat: [],
      mode: 'protocol', agentName: 'Orbit', provider: 'OrbitAI',
      settings: { voice: true, tellBlocked: false },
      meFirst: {
        areas: { writing: { on: false }, gifts: { on: false }, plans: { on: false }, money: { on: false } },
        cap: 5, today: { date: '', count: 0 }, snoozed: {}, skipsToday: { date: '', school: 0 }, stats: {}, threads: {}
      },
      notifications: [], dismissedHighlights: [], lastHighlights: {}, reclassNotes: {}, views: [], reports: []
    }, base);
  }

  A.data.seed = function () {
    const personas = {
      meera: persona({
        id: 'meera', name: 'Meera Iyer', short: 'Meera', initials: 'MI', age: 41, city: 'Bengaluru',
        role: 'adult', roleLabel: { en: 'Guardian · trusted contact', hi: 'अभिभावक · भरोसेमंद संपर्क' },
        phone: '+919845012345', connectedAt: new Date(2026, 6, 2).getTime(), ledger: meera()
      }),
      priya: persona({
        id: 'priya', name: 'Priya Sharma', short: 'Priya', initials: 'PS', age: 29, city: 'Bengaluru',
        role: 'adult', roleLabel: { en: 'Adult · monthly statement', hi: 'वयस्क · मासिक स्टेटमेंट' },
        phone: '+919900112233', connectedAt: new Date(2026, 5, 10).getTime(), ledger: priya()
      }),
      aarav: persona({
        id: 'aarav', name: 'Aarav Iyer', short: 'Aarav', initials: 'AI', age: 16, city: 'Bengaluru',
        role: 'minor', guardian: 'meera', preset: 'careful', roleLabel: { en: 'Minor (16) · Learner\'s Licence', hi: 'नाबालिग (16) · लर्नर लाइसेंस' },
        phone: '+919886000016', connectedAt: new Date(2026, 6, 20).getTime(), ledger: aarav(),
        licence: {
          money: { level: 2, weeks: 3, decisions: 7 },
          school: { level: 2, weeks: 6, decisions: 14 },
          messages: { level: 2, weeks: 5, decisions: 6 },
          shopping: { level: 2, weeks: 2, decisions: 4 }
        }
      }),
      rajan: persona({
        id: 'rajan', name: 'Rajan Subramanian', short: 'Rajan', initials: 'RS', age: 72, city: 'Chennai',
        role: 'elder', lang: 'hi', simple: true, preset: 'careful', roleLabel: { en: 'Elder · Hindi Simple mode', hi: 'बुज़ुर्ग · हिंदी आसान मोड' },
        phone: '+919444012345', connectedAt: new Date(2026, 6, 15).getTime(), ledger: rajan(), familyName: 'Appa'
      }),
      dev: persona({
        id: 'dev', name: 'Dev Malhotra', short: 'Dev', initials: 'DM', age: 34, city: 'Pune',
        role: 'adult', roleLabel: { en: 'New user · day 4', hi: 'नया उपयोगकर्ता · दिन 4' },
        phone: '+919822001122', connectedAt: new Date(2026, 9, 25, 10).getTime(), ledger: dev()
      })
    };
    /* Me-First setup */
    personas.meera.meFirst.areas.gifts.on = true;
    personas.meera.meFirst.areas.writing.on = true;
    personas.meera.meFirst.stats['2026-10'] = { gifts: { shown: 10, answered: 8, low: 1, skipped: 2, authored: 6 }, writing: { shown: 6, answered: 3, low: 1, skipped: 3, authored: 2 } };
    personas.meera.meFirst.today = { date: '2026-10-28', count: 1 };
    personas.priya.meFirst.areas.writing.on = true;
    personas.priya.meFirst.areas.plans.on = true;
    personas.priya.meFirst.stats['2026-10'] = { writing: { shown: 10, answered: 6, low: 2, skipped: 4, authored: 4 }, plans: { shown: 4, answered: 2, low: 0, skipped: 2, authored: 1 } };
    personas.aarav.meFirst.areas.school = { on: true, lockedBy: 'meera' };
    personas.aarav.meFirst.stats['2026-10'] = { school: { shown: 12, answered: 9, low: 3, skipped: 3, authored: 5 } };
    personas.rajan.meFirst.stats['2026-10'] = {};

    return {
      current: 'meera',
      tabs: { meera: 'agent', priya: 'mirror', aarav: 'agent', rajan: 'agent', dev: 'mirror' },
      personas,
      family: {
        links: [
          { id: 'L1', kind: 'trusted', member: 'rajan', contact: 'meera', order: 1, share: { alerts: true, summary: false }, coApproval: { redLabel: true, over: 25000 }, paused: false, since: new Date(2026, 6, 16).getTime() },
          { id: 'L1b', kind: 'trusted', member: 'rajan', contact: 'ravi', contactName: 'Ravi (son)', order: 2, share: { alerts: true, summary: false }, coApproval: { redLabel: true, over: 25000 }, paused: false, external: true },
          { id: 'L2', kind: 'guardian', member: 'aarav', contact: 'meera', order: 1, share: { alerts: true, summary: true, levels: true, skips: true }, paused: false, since: new Date(2026, 6, 20).getTime() }
        ],
        alerts: [],
        invites: [],
        levelRequests: [],
        relay: []
      },
      flags: { anchorKilled: false, networkOff: false, misbehaving: false },
      operator: { log: [], trace: [] },
      statements: { released: { '2026-09': true }, seen: {} },
      queued: [],
      ui: { sheet: null }
    };
  };

  A.data.NOW = NOW;
})();
