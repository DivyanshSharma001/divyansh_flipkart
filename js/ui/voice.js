/* Voice: Web Speech API (en-IN / hi-IN). Never fail silently and never switch language
   silently (AS-E15) — fall back to on-screen text with a retry. */
(function () {
  'use strict';
  const A = window.Anchor;

  function bcp(lang) { return (A.ai && A.ai.LANGS[lang] && A.ai.LANGS[lang].bcp) || 'en-IN'; }
  function pickVoice(lang) {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    const want = lang && lang !== 'en' ? [bcp(lang), lang] : ['en-IN', 'en-GB', 'en-US', 'en'];
    for (const w of want) {
      const v = voices.find((x) => x.lang && x.lang.toLowerCase().startsWith(w.toLowerCase()));
      if (v) return v;
    }
    return null;
  }

  const voice = {
    last: null,
    available() { return 'speechSynthesis' in window; },
    speak(text, lang, opts) {
      opts = opts || {};
      voice.last = { text, lang };
      A.ui.caption && A.ui.caption(text, lang);
      if (!voice.available()) { A.ui.toast(A.t('common.voice_unavailable', null, lang)); return false; }
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const v = pickVoice(lang);
        u.lang = bcp(lang);
        if (v) u.voice = v;
        else if (lang !== 'en' && window.speechSynthesis.getVoices().length) {
          /* AS-E15: no voice pack for this language — keep its text on screen, don't switch language */
          A.ui.toast(A.t('common.voice_unavailable', null, lang));
        }
        u.rate = opts.rate || (lang !== 'en' ? 0.92 : 1);
        window.speechSynthesis.speak(u);
        return true;
      } catch (e) {
        A.ui.toast(A.t('common.voice_unavailable', null, lang));
        return false;
      }
    },
    stop() { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* noop */ } },
    /* Speech-to-text when available; the demo always offers tappable phrases too (DG-E10 fallback) */
    listen(lang, onText) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return false;
      try {
        const r = new SR();
        r.lang = bcp(lang);
        r.interimResults = false; r.maxAlternatives = 1;
        r.onresult = (e) => { const t = e.results[0][0].transcript; onText(t, e.results[0][0].confidence); };
        r.onerror = () => onText(null);
        r.start();
        return true;
      } catch (e) { return false; }
    }
  };
  if ('speechSynthesis' in window) { try { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = () => {}; } catch (e) { /* noop */ } }
  A.ui.voice = voice;
})();
