# Anchor prototype

Clickable prototype of the five Anchor PRDs (Agency Statement, Decision Guard, Trust Check,
Me-First Mode, Family Circle) in Flipkart's design language. Pure HTML, CSS and vanilla JavaScript —
no build step. Made by Divyansh Sharma.

## What's in here

| Path | What it is |
|---|---|
| `index.html` | The app shell (sidebar, phone frame, demo panel) |
| `css/` | Design tokens and styles |
| `js/` | Engines (policy, trust, statement, Me-First, family), simulated agent, UI tabs, self-tests |
| `js/ai.js` | Gemini client (agent chat + regional-language translation) |
| `js/config.local.js` | **Your Gemini key for local use only.** Ships empty. Never deploy it with a key in it. |
| `api/gemini.js` | Vercel serverless proxy — keeps the Gemini key on the server |
| `img/` | Product photos from Wikimedia Commons (credits in `img/CREDITS.md`) |
| `serve.py` | Local server with caching turned off |
| `docs/` | Design guardrails and the design-choices board |

## Run it on your computer

1. Install Python 3 (any recent version).
2. Open a terminal in this folder and run:
   ```
   python serve.py
   ```
3. Open http://localhost:8765/index.html

For the Gemini chat locally, either paste your key into `js/config.local.js`
(`geminiKey: 'YOUR_KEY'`) or open **Settings → Agent AI → Use a different Gemini API key** in the app.
Without a key the agent uses offline replies; everything else works.

## Deploy on Vercel

The site is static, plus one serverless function (`api/gemini.js`). On Vercel the page sends Gemini
requests to `/api/gemini`, and the function adds the key from an environment variable, so the key
never reaches the browser. **Leave `js/config.local.js` empty when you deploy.**

### Option A — Vercel CLI (no GitHub needed)

1. Install Node.js LTS from https://nodejs.org
2. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```
3. Open a terminal in this folder (the one containing `index.html`) and log in:
   ```
   vercel login
   ```
4. Create the project and a preview deployment:
   ```
   vercel
   ```
   Answer the prompts: *Set up and deploy?* → **Y** · pick your account · *Link to existing project?* →
   **N** · project name → e.g. `anchor-prototype` · *In which directory is your code located?* → **./** ·
   Vercel detects **Other** (no framework); keep the default settings (no build command, no output
   directory).
5. Add your Gemini key as a server-side environment variable (paste the key when asked; tick
   Production and Preview):
   ```
   vercel env add GEMINI_API_KEY
   ```
6. Deploy to production so the variable is picked up:
   ```
   vercel --prod
   ```
7. Open the URL it prints (e.g. `https://anchor-prototype.vercel.app`).

### Option B — GitHub + Vercel dashboard

1. Put this folder in a GitHub repository (with `js/config.local.js` left empty).
2. Go to https://vercel.com → **Add New… → Project** → import the repository.
3. **Framework Preset:** Other. **Root Directory:** the folder that contains `index.html`.
   Leave Build Command and Output Directory empty.
4. Open **Environment Variables**, add `GEMINI_API_KEY` = your key (Production + Preview).
5. Click **Deploy**. Later pushes to the main branch redeploy automatically.

### Check the deployment

- Open the site → **Settings** (bottom bar) → **Agent AI** → **Test connection**. You should see
  "Gemini replied via gemini-…".
- `https://<your-site>/api/gemini` opened in a browser shows `{"error":"Use POST"}` — that means the
  function is live.
- If the test says the key is not set: add `GEMINI_API_KEY` in Vercel → Project → Settings →
  Environment Variables, then redeploy (`vercel --prod` or **Redeploy** in the dashboard).

### Before you share the link

- `/api/gemini` is public: anyone with the URL can spend your Gemini quota through it. Set a usage
  limit/budget for the key in Google AI Studio, and consider Vercel **Deployment Protection**
  (password or Vercel login) for private demos.
- If a key was ever committed or shared, rotate it in Google AI Studio.

## Self-tests

Open the app → sidebar **Demo console** → **Tests** → **Run tests** (42 PRD acceptance checks), or run
`Anchor.tests.run()` in the browser console.
