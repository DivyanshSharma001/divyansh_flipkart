/* Vercel serverless proxy for Gemini. The API key stays on the server (env var GEMINI_API_KEY)
   and is never sent to the browser. The page calls POST /api/gemini { model, body }. */
const ALLOWED_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
const MAX_BODY_CHARS = 60000;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server' });

  const { model, body } = req.body || {};
  if (!ALLOWED_MODELS.includes(model)) return res.status(400).json({ error: 'Model not allowed' });
  const payload = JSON.stringify(body || {});
  if (payload.length > MAX_BODY_CHARS) return res.status(413).json({ error: 'Request too large' });

  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: payload
    });
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach Gemini' });
  }
};
