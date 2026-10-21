/* Gemini client for the simulated agent's free-text chat and on-demand UI translation.
   The key comes from js/config.local.js or from Settings (stored on this device only).
   Every action Orbit proposes still goes through Anchor's hook — Gemini only writes replies
   and picks which demo action (if any) the user asked for. */
(function () {
  'use strict';
  const A = window.Anchor;

  const MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
  const URL = (m) => 'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent';

  const LANGS = {
    en: { name: 'English', native: 'English', bcp: 'en-IN' },
    hi: { name: 'Hindi', native: 'हिंदी', bcp: 'hi-IN' },
    bn: { name: 'Bengali', native: 'বাংলা', bcp: 'bn-IN' },
    ta: { name: 'Tamil', native: 'தமிழ்', bcp: 'ta-IN' },
    te: { name: 'Telugu', native: 'తెలుగు', bcp: 'te-IN' },
    mr: { name: 'Marathi', native: 'मराठी', bcp: 'mr-IN' },
    gu: { name: 'Gujarati', native: 'ગુજરાતી', bcp: 'gu-IN' },
    kn: { name: 'Kannada', native: 'ಕನ್ನಡ', bcp: 'kn-IN' },
    ml: { name: 'Malayalam', native: 'മലയാളം', bcp: 'ml-IN' },
    pa: { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', bcp: 'pa-IN' },
    or: { name: 'Odia', native: 'ଓଡ଼ିଆ', bcp: 'or-IN' }
  };

  function key() {
    const saved = A.store.get('geminiKey', '');
    if (saved) return saved;
    return (window.ANCHOR_CONFIG && window.ANCHOR_CONFIG.geminiKey) || '';
  }

  /* Deployed (e.g. Vercel) without a key in the page: use the same-origin proxy /api/gemini,
     which holds the key server-side. Local servers have no proxy unless config says so. */
  function proxyUrl() {
    const cfg = window.ANCHOR_CONFIG || {};
    if (cfg.proxy === false) return null;
    if (typeof cfg.proxy === 'string') return cfg.proxy;
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    return location.protocol.indexOf('http') === 0 && !local ? '/api/gemini' : null;
  }

  const ai = {
    LANGS,
    lastModel: null,
    lastError: null,
    available() { return !!key() || !!proxyUrl(); },
    keySource() { return A.store.get('geminiKey', '') ? 'device' : (window.ANCHOR_CONFIG && window.ANCHOR_CONFIG.geminiKey ? 'config' : proxyUrl() ? 'server' : 'none'); },

    /* generate(prompt, {system, json, temperature}) → text; tries each model in turn */
    async generate(prompt, opts) {
      opts = opts || {};
      const k = key();
      const proxy = k ? null : proxyUrl();
      if (!k && !proxy) throw new Error('no_key');
      const body = {
        contents: Array.isArray(prompt) ? prompt : [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: opts.temperature == null ? 0.6 : opts.temperature }
      };
      if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
      if (opts.json) { body.generationConfig.responseMimeType = 'application/json'; body.generationConfig.maxOutputTokens = 8192; }
      let lastErr;
      for (const m of MODELS) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), opts.timeout || 20000);
          const res = proxy ?
            await fetch(proxy, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: m, body }), signal: ctrl.signal }) :
            await fetch(URL(m), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k }, body: JSON.stringify(body), signal: ctrl.signal });
          clearTimeout(timer);
          if (!res.ok) { lastErr = new Error(m + ' ' + res.status); if (res.status === 400 || res.status === 401 || res.status === 403 || (proxy && (res.status === 404 || res.status === 500))) break; continue; }
          const data = await res.json();
          const text = ((((data.candidates || [])[0] || {}).content || {}).parts || []).map((p) => p.text || '').join('');
          if (!text) { lastErr = new Error(m + ' empty'); continue; }
          ai.lastModel = m; ai.lastError = null;
          return text;
        } catch (e) { lastErr = e; }
      }
      ai.lastError = lastErr ? String(lastErr.message || lastErr) : 'failed';
      throw lastErr || new Error('failed');
    },

    async json(prompt, opts) {
      const text = await ai.generate(prompt, Object.assign({}, opts, { json: true }));
      const m = text.match(/\{[\s\S]*\}/);
      return JSON.parse(m ? m[0] : text);
    },

    /* ---------- Orbit chat ---------- */
    async orbitReply(p, userText, actionKeys) {
      const langName = (LANGS[p.lang] || LANGS.en).name;
      const history = p.chat.slice(-8).filter((m) => m.kind === 'text' || m.kind === 'done' || m.kind === 'answer')
        .map((m) => (m.from === 'user' ? 'User: ' : 'Orbit: ') + A.util.pick(m.text, p.lang === 'hi' ? 'hi' : 'en')).join('\n');
      const system = [
        'You are Orbit, a friendly personal AI agent inside the "Anchor" demo app in India.',
        'User: ' + p.name + ', ' + p.age + ', ' + p.city + '. Reply in ' + langName + ' (match the user\'s script). Keep replies to 1–3 short sentences.',
        'Anchor checks every action you propose before it happens, so never say you already paid, bought or booked anything.',
        'If the user is asking you to do one of these demo actions, set "action" to its key, otherwise null:',
        actionKeys.map((a) => '- ' + a.key + ': ' + a.desc).join('\n'),
        'If they mention an amount for sending money, put it in "amount" as a number.',
        'Return only JSON: {"reply": string, "action": string|null, "amount": number|null}.'
      ].join('\n');
      const out = await ai.json((history ? 'Conversation so far:\n' + history + '\n\n' : '') + 'User: ' + userText, { system, temperature: 0.5 });
      return { reply: String(out.reply || ''), action: out.action || null, amount: typeof out.amount === 'number' ? out.amount : null };
    },

    /* ---------- One-time UI translation for regional languages ---------- */
    translations: {},
    loadCached(lang) {
      if (ai.translations[lang]) return ai.translations[lang];
      const t = A.store.get('i18n.' + lang, null);
      if (t) ai.translations[lang] = t;
      return t;
    },
    isPartial(lang) { const p = A.store.get('i18n.partial.' + lang, null); return !!(p && Object.keys(p).length); },
    translating: {},
    async translateUI(lang, onProgress) {
      if (lang === 'en' || lang === 'hi') return true;
      if (ai.loadCached(lang) && !ai.isPartial(lang)) return true;
      if (ai.translating[lang]) return ai.translating[lang];
      const run = (async () => {
        const STR = A.i18n.STR;
        const keys = Object.keys(STR);
        const out = Object.assign({}, A.store.get('i18n.partial.' + lang, {})); /* resume earlier progress */
        const todo = keys.filter((k) => !out[k]);
        const size = 40, batches = [];
        for (let i = 0; i < todo.length; i += size) batches.push(todo.slice(i, i + size));
        let done = keys.length - todo.length, failed = 0;
        if (onProgress) onProgress(done, keys.length);
        const one = async (batch) => {
          const chunk = {};
          batch.forEach((k) => { chunk[k] = STR[k][0]; });
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const res = await ai.json('Translate the JSON values from English into ' + LANGS[lang].name + ' (' + LANGS[lang].native + ') for a mobile banking-safety app UI. Keep every key, keep placeholders like {name} or {n} exactly, keep ₹ amounts and brand names (Anchor, Orbit, Flipkart) unchanged, use natural everyday wording. Return only the JSON object.\n\n' + JSON.stringify(chunk), { temperature: 0.2, timeout: 40000 });
              batch.forEach((k) => { if (typeof res[k] === 'string' && res[k]) out[k] = res[k]; });
              A.store.set('i18n.partial.' + lang, out); /* keep progress even if a later batch fails */
              done += batch.length;
              if (onProgress) onProgress(done, keys.length);
              return;
            } catch (e) { ai.lastError = ai.lastError || String(e.message || e); }
          }
          failed += batch.length;
        };
        /* 4 batches at a time */
        for (let i = 0; i < batches.length; i += 4) await Promise.all(batches.slice(i, i + 4).map(one));
        if (!Object.keys(out).length) throw new Error('translation_failed');
        ai.translations[lang] = out;
        A.store.set('i18n.' + lang, out);
        if (!failed) A.store.set('i18n.partial.' + lang, null);
        return failed ? 'partial' : true;
      })();
      ai.translating[lang] = run;
      try { return await run; } finally { delete ai.translating[lang]; }
    }
  };

  A.ai = ai;
})();
