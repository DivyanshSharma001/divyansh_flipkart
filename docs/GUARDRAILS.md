# GUARDRAILS — Anchor prototype

Single source of truth for **how the prototype is presented**, **how it looks** (Flipkart design
language), **what the product must never do** (from PRD 1–5 + appendix) and **how it is built**.
Every screen, component and copy change must pass these rules. Last updated 2026-10-21.

---

## 1. Presentation guardrails (reverse-engineered from vision-builder-prototype.vercel.app)

Reference: Meesho "DICE prototype" (React + Tailwind, Vite). Visited with Playwright at
1440×900 and 390×844 on 2026-10-21.

### 1.1 Shell layout
| Part | Reference spec | Our rule |
|---|---|---|
| Root | `display:flex` row, page bg `#F5F5F7` | Same |
| Sidebar | `aside` 240 px, white, `border-right:1px #E5E7EB`, `position:sticky; height:100dvh`, collapsible via `«` button | 240 px; collapses to 64 px icon rail |
| Sidebar header | Wordmark + small tinted "DICE prototype" badge + collapse button | "anchor" wordmark + "PRD prototype" badge |
| Role groups | Uppercase 11 px muted section labels (CUSTOMER / SELLER / HUB MANAGER / RIDER), sub-groups in 11 px | PERSONAS / OPERATOR |
| Persona row | 32 px icon circle (tinted bg) + 14 px semibold name + 12 px subtitle, radius 8 px, 8 px margin | Same |
| Active row | Filled brand colour (`#5E1A47` there → Flipkart blue `#2874F0` here), white text, icon circle white/20% | Same pattern |
| Sidebar footer | "Show feature tags" checkbox + full-width outline "Reset demo" button (red text) | "Show PRD tags" + "Reset demo" |
| Stage | `flex:1; display:flex; justify-content:center; padding:24px 0` | Same, plus right demo panel ≥1280 px |

### 1.2 Phone frame (phone screen shown inside a laptop)
- `width:390px; height:min(844px, 100dvh - 48px)`
- `border:10px solid #1F1F1F; border-radius:40px; overflow:hidden`
- `box-shadow: 0 25px 50px -12px rgba(0,0,0,.25)` (Tailwind `shadow-2xl`)
- Inside: fake status bar (12 px: time left, signal bars + "4G" + battery right) → sticky app
  header → scrolling body (`flex:1; min-height:0; overflow:auto`) → bottom nav
  (`display:grid; grid-template-columns:repeat(n,1fr); border-top:1px #E5E7EB`, icon + 11–12 px label).
- **Our change (user, 2026-10-21):** the device is never squashed. It stays 390×844 and the whole
  frame is scaled to fit the stage (`zoom: var(--phone-scale)`, set by `fitPhone()` in `js/app.js`,
  min 0.5), so the full phone is always visible on short laptop screens.
- **Below 640 px the frame disappears**: no border, no radius, no shadow, `height:100dvh`, full-bleed app.

### 1.3 Role-dependent rendering ("website for different users")
- **Consumer roles → phone frame** (customer, rider in the reference; Kavita / Ananya / Vihaan / Suresh here).
- **Operator roles → full-width desktop dashboard** (hub manager in the reference): page header
  with back arrow + title + 12 px subtitle, underline tab bar (active tab = ink text + 2 px underline,
  count badges as small red circles), white cards `radius:16px`, empty states in dashed boxes.
  Here: **Demo console** (ledger, policy trace, family relay, metrics, event composer).
- Switching roles is instant (client-side route), state is shared across roles (one world) and
  "Reset demo" restores seed state.

### 1.4 Feature tags
- Global toggle pins tiny black pills (`background:#1F1F1F; color:#fff; font:700 9px; radius:4px;
  padding:1px 4px`) next to UI elements, showing the requirement ID (reference: `C2-F3`).
- Here every key element carries `data-tag="FR-DG-06"` etc.; CSS shows them only when
  `body.show-tags`.

### 1.5 Responsive rules (fixing the reference's flaw)
The reference keeps the 240 px sidebar on phones and crushes the app. We must not.
| Width | Sidebar | Phone | Demo panel |
|---|---|---|---|
| ≥1280 | 240 px (collapsible) | framed, centred | docked right, 320 px |
| 640–1279 | 64 px rail (expand on demand, overlays) | framed | slide-over drawer (button top-right) |
| <640 | hidden; hamburger opens drawer | full-bleed, no frame | floating "Demo" button → bottom sheet |
Never allow horizontal page scroll. Breakpoints: 640 / 1024 / 1280.

---

## 2. Flipkart design language (from the three app screenshots)

### 2.1 Tokens
| Token | Value | Use |
|---|---|---|
| `--fk-blue` | `#2874F0` | Primary actions, active nav, links, discount ribbon |
| `--fk-blue-dark` | `#1A5DC8` | Pressed state |
| `--fk-yellow` | `#FFE11B` | Selected top tile, highlight accents, "Approve" emphasis on dark |
| `--fk-yellow-deep` | `#FFC200` | Gradient end on yellow cards |
| `--fk-festive` | `linear-gradient(180deg,#E8336A 0%,#E2264D 100%)` | Hero header surface |
| `--fk-sunset` | `linear-gradient(180deg,#F0466D 0%,#FF7A2F 55%,#FFC21A 100%)` | "Still looking for these?"-style promo cards |
| `--fk-navy` | `#0E1A3A → #05070F` | Immersive dark surface (Play) – used for Simple mode/alerts |
| `--fk-red` | `#E8273A` | LIVE pill, badges, danger |
| `--fk-green` | `#108934` | Ratings/positive |
| `--ink` / `--ink-2` / `--muted` | `#111112` / `#212121` / `#717478` | Text |
| `--line` | `#E5E7EB` | Dividers |
| `--skeleton` | `#E8E8E8` | Loading blocks |
| `--page` | `#F1F3F6` | App background (Flipkart grey) |
| Radius | 8 / 12 / 16 / 20 / 24 / pill | Tiles 16, banners 20, skeleton 24, chips pill |
| Type | Inter (Flipkart uses a geometric sans), 12 / 13 / 14 / 16 / 20 / 28 / 44 | Section titles 20 bold |
| Spacing | 4-pt grid, 16 px side gutters | |

### 2.2 Component rules
1. **Skeleton first.** Every tab renders a grey skeleton of the *same* layout (rounded 24 px blocks,
   `#E8E8E8`, subtle shimmer) for ~350 ms before content fades in. Bottom nav skeleton = circles + bars.
2. **Header stack** on a festive gradient: top tiles row (rounded 16 px white tiles, active tile
   yellow) → context pill (dark translucent, white text, chevron) → large white rounded search/ask
   bar with mic icon → horizontal icon tabs with a white 3 px underline under the active one.
3. **Banners**: rounded 20 px, full-width minus gutters, carousel with elongated active
   pagination dot (black 32×6 pill, others grey 12×6).
4. **Rails**: horizontally scrolling `scroll-snap` rows that *peek* the next card (card width
   ≈ 42% of viewport); mini-cards white, radius 12, image area top, 13 px muted label, 15 px bold value.
5. **Promo card**: gradient container radius 20 with a 20 px bold white title, white mini-cards inside.
6. **Badges**: blue corner ribbon (`↓82%` style) for deltas; red round count badge on nav icons;
   red "● LIVE" pill for live/critical states.
7. **Bottom nav**: 5 items, 24 px line icons + 12 px label, active = filled/bold icon + bold label
   (+ blue tint here), red count badge top-right.
8. **Icons**: line icons (1.75 px stroke), never emoji in chrome.
9. **Dark immersive surface** (navy) for high-attention moments: Critical alerts and Speed Bump.

### 2.3 Reference-only rule (user instruction, 2026-10-21) — binding

The two references above (§1 site, §2 Flipkart screenshots) **are** the design system. Do not use
generic or Anthropic/artifact default UI patterns. Every element must trace to the vocabulary below.
If the product needs something not listed, add it to "Pending design" and **ask the user for a
sample design** — never invent one.

**Allowed vocabulary (traceable)**
| Element | Source |
|---|---|
| Sidebar: grouped persona rows, icon circle, filled active row, tinted wordmark badge, checkbox, outline "Reset demo" button | Reference site |
| Phone frame + fake status bar; full-bleed below 640 px | Reference site |
| Black feature-tag pills | Reference site |
| Operator page: back arrow + title + subtitle, underline tabs with red count circle, white rounded card with title + description, dashed empty-state box | Reference site (hub manager) |
| App header: wordmark + tinted badge + bell icon; rounded search bar with search icon | Reference site |
| Circular category icons with label, active ring | Reference site |
| Gradient promo banner (kicker + bold title + subtitle) | Reference site ("Hi Rekha") / Flipkart banner |
| Three small white feature tiles (icon + label) | Reference site |
| Section title left + count right | Reference site ("Products for You · 24 items") |
| Product card: image, white icon pill ("Open-box"), name, bold price, struck MRP, green % off, seller line, green rating pill with star | Reference site |
| Bottom nav (icon + label, active coloured, red count badge) | Both |
| Skeleton loading blocks (static grey, rounded, same layout) | Flipkart |
| App-switcher tiles (white, active = yellow, bold italic label) | Flipkart |
| Dark translucent location pill with pin + chevron; small dark icon pills (coupon, coin "⚡0") | Flipkart |
| Large white search bar with mic + square scan button | Flipkart |
| Horizontal icon tabs with white underline | Flipkart |
| Full-width rounded banner + elongated pagination dots | Flipkart |
| Gradient "Still looking for these?" card with white mini-cards (image, muted label, bold value) and blue "↓82%" corner ribbon | Flipkart |
| Navy immersive screen: text tabs with underline, white bold section titles, red "● LIVE" pill, cards with white caption strip + title below, dark banner with text CTA ("Sign up now") | Flipkart (Play) |

**Added sources (user, 2026-10-21)**
- **flipkart.com (checked live 21 Oct 2026)**: font Inter (inter_regular / semi_bold / bold); page #F1F3F6;
  text #212121 / muted #878787; blue #2874F0, link blue #1162F2; rating pill #388E3C, 3 px radius, white
  12 px/500, padding 2px 4px 2px 6px; "% off" green #388E3C (product page #008042); struck MRP muted;
  deal tags 2 px radius, 4 px padding — purple #5209DB on #F4F2FF, green #26A541 bold on #E7F8EC; new
  rating chip #F5F5F5 radius 8 ("3.6★ | 67"); classic button 2 px radius, 13 px/500, disabled #C2C2C2;
  white outline button (#DBDBDB border, blue text); product page "Add to cart" outlined white + "Buy now"
  yellow gradient (radius 8, two-line); offers panel = blue gradient header + white cards radius 16/12;
  "Best value for you" gold gradient highlight; filter checkbox 15 px, 2 px radius, #C2C2C2 border; sort
  tabs blue text with 1.6 px blue underline; login modal = 60% black scrim, blue left panel, outlined
  field with label on the border; quantity − + stepper; specifications table.
- **Claude UX (as in BTP's chat app)** for *interaction patterns only* (themed with Flipkart tokens):
  agent text with avatar / user bubble, typing dots, timestamps, composer pill with mic + send, inline
  result card with stat grid, numbered question picker with "Something else" + Skip, questionnaire
  dots, inline form panel instead of modal, inline confirm, tool-step lines.
- Choice board for the user: `design/anchor-design-choices.html` (artifact
  https://claude.ai/artifact/KhujMeEvSMedpeKg4sGDE3). The user's picks there decide the items below.

**Picked designs (user, 2026-10-21 — "Anchor picks: 1A 2A 3C 4A 5B 6B 7B 8B 9B 10B 11A 12B 13B 14B 15B 16A 17A 18A 19A 20A")**
| # | Element | Pick | Implemented as |
|---|---|---|---|
| 1 | Approve / Decline / Compare | Flipkart product-page pair | `.btn-out` (white, #DBDBDB border, r8) + `.btn-buy` (yellow gradient, r8, second line = amount); Compare = blue `.text-act` |
| 2 | Agent chat | Claude style | agent = plain `.atext` beside `.bot-av`; user = tinted `.bubble` 18/18/4/18; `.stamp` times |
| 3 | Decision card | Flipkart "Apply offers" panel | `.offer` (blue wash, r16) + `.offer-head` gradient + white `.offer-in` cards (r12), gold `.best`, green `↓%` |
| 4 | Trust label | Rating pill | `.tpill` filled, r3, white 12px/500, icon + word |
| 5 | Me-First prompt | Flipkart card + search field + chips | `.card.mf` + `.fk-search` + `.chip` |
| 6 | Composer | Flipkart search bar + send | `.fk-search` (r8, light-blue outline) + `.send-sq` |
| 7 | Detail panels | Flipkart login modal | `.modal`: 60% scrim, white ✕ outside, blue `.modal-band` title + line, white body (phone: band on top) |
| 8 | Anchor's checks in chat | No step lines | card only; details in Why / History |
| 9 | Confirmations / Undo | Tinted notice | `.notice` (blue tint, r10) at the top |
| 10 | Fingerprint | Step inside the card | `A.ui.authStep()` replaces the card/panel actions |
| 11 | Statement areas | Ratings-breakdown bars | `.area-bar` 6px rounded track |
| 12 | Loyalty score | Rating pill + breakdown | `.score-pill` + `.histo` green/yellow/red |
| 13 | Progress | Claude dots | `A.ui.dots()` |
| 14 | On / Off | Claude seg pills | `A.ui.toggle()` |
| 15 | Forms | Claude pills + plain field | `A.ui.pills()`, `.field input` r10 |
| 16 | Invite code | QR + big code card | `.invite .qr .code` |
| 17 | Operator tables | Flipkart specifications table | `.op-table` grey label column, hairline rows |
| 18 | Product images | Coloured icon tiles | `.thumb.is-<category>` |
| 19 | Voice | Claude red recording mic | `.mic.is-rec` + phrase chips as a quiet line; caption = quiet line |
| 20 | Demo control panel | Sidebar vocabulary | `.op-sec` uppercase labels, rows with icon circles |

| 21 | New chat | "+ New chat" pill leading the suggestion rail (user, 2026-10-21) | `.sugg.is-new`; clears the thread, starts a new Me-First thread (FR-MF-09); waiting cards stay in Guard |

**Changes requested by the user, 2026-10-21 (later the same day)**
- Header tiles are now 3: Anchor (main app) · Orbit (agent page) · protection style (Guard → Rules). The tile
  for the current view is yellow. The Hindi tile is gone; language lives in Settings.
- Bottom nav has 6 items: Agent, Mirror, Guard, Grow, Family, **Settings**. The name pill opens **Profile**;
  the Orbit tile opens the **Orbit** page.
- Settings → Language offers English, हिंदी and 9 regional languages (বাংলা, தமிழ், తెలుగు, मराठी, ગુજરાતી,
  ಕನ್ನಡ, മലയാളം, ਪੰਜਾਬੀ, ଓଡ଼ିଆ). English and Hindi are hand-written; the others are translated once by
  Gemini and cached on the device. Until a translation is ready the UI says so (never silent).
  Strings written inline in code and seed data stay English for regional languages.
- Product images: real photos from Wikimedia Commons in `prototype/img/` (credits in `img/CREDITS.md`),
  overriding pick 18A where a photo exists; items without a good photo keep the icon tile.
- Agent chat uses Gemini (`js/ai.js`, models gemini-3.8-flash → 3.6-flash → 3.5-flash-lite). Gemini only
  writes Orbit's reply and picks a demo action; every action still goes through Anchor's hook. Offline
  keyword replies are the fallback. The demo key is in `js/config.local.js` — never deploy that file publicly.

Remaining "new" elements: none. Ask the user before adding any element not in §2.3 or this table.

---

## 3. Product guardrails (from PRDs 1–5 + appendix) — non-negotiable

### Decision Guard (PRD 2)
- Anchor **never initiates, edits or executes** an action; it only allows, holds or blocks.
- **Never approve on the user's behalf** — not on expiry, not on timeout, not when unsure.
- Most restrictive rule wins (Never > Ask > Notify > Auto). No matching rule for a meaningful
  action → **Ask** (fail safe). Guardian floors only tighten.
- Speed Bump: Approve disabled 10 s with three questions; **Decline is always enabled**.
- Anti-splitting: sum per counterparty over rolling 24 h.
- High stakes need (simulated) device authentication.

### Trust Check (PRD 3)
- **Worst finding wins. Never a false green.** Uncertain → grey or yellow.
- Every label = **colour + icon + word** (never colour alone).
- Second Opinion query carries only category, spec, price band, city.
- Anchor **earns nothing** from alternatives; say so on the sheet.
- Fraud-list counterparty escalates to Ask + Speed Bump regardless of tier.

### Agency Statement (PRD 1)
- Never show a misleading number: <10 decisions → counts not %; MoM only if last month had
  ≥20 decisions and ≥14 days; partial months labelled.
- No judgement of character, no leaderboards, highlights from templates only, max 1 concern +
  1 positive. Health never a concern highlight unless opted in.
- Decision lists are **never** shared with family.

### Me-First (PRD 4)
- Never prompt in distress/support/emergency/time-sensitive contexts.
- Skip once never shamed — **no follow-up message after skipping**.
- The user's take is never shared with family; low-effort tagging is metrics-only.

### Family Circle (PRD 5)
- **Transparency, not surveillance**: whatever a guardian/contact sees, the member sees too
  ("{Member} sees exactly what you see here").
- No message content, no location. Alerts only inside Anchor; "Call" opens the user's own dialler.
- An adult can pause sharing privately (safety exit); other side sees only "Sharing paused".
- Link removal during an open Critical alert is deferred.

### Language & access
- Every user-facing string exists in **English and Hindi** (`js/data/i18n.js`). Never switch
  language silently; Hindi is drafted, flagged for native review.
- Simple mode: one sentence + one highlight, ≥18 px type, big buttons, spoken warnings.
- Lock-screen style notifications show **no amounts or names**.

---

## 4. Tech guardrails
- Pure **HTML + CSS + vanilla JS**. No frameworks, no build step, **no ES modules** (classic
  scripts + one `window.Anchor` namespace) so `index.html` works from `file://`.
- Only external resource: Google Fonts (Inter); everything degrades to `system-ui`.
- All colours/radii/spacing through CSS custom properties in `css/tokens.css` — no raw hex in
  component CSS.
- `localStorage` only for per-viewer conveniences (persona, tag toggle), wrapped in try/catch.
- Accessibility: tap targets ≥44 px, AA contrast, visible focus rings, `prefers-reduced-motion`
  disables shimmer/animations, `aria-live` for toasts and card arrivals.
- Voice uses the Web Speech API (`en-IN`, `hi-IN`); if no voice is available, show the text with
  a retry, never fail silently (AS-E15).
