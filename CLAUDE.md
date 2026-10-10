# CLAUDE.md

Scalp Scan is a static, offline-capable web app (PWA) that scans hair-care ingredient lists
(camera OCR, photo, paste, barcode) and flags ingredients that feed *Malassezia*
(seborrheic dermatitis, dandruff, Malassezia folliculitis). Audience: EU / Germany first.

## Blackboard: read `PLAN.md` first
`PLAN.md` is the shared blackboard for every session and agent working here.
- **Before a task:** read Goals, Decisions, Task board and Open questions. Don't re-decide anything already
  in Decisions unless the user asks.
- **Starting:** move the task to *Doing* with your owner tag and date.
- **Finishing:** move it to *Done*, add any research facts to *Findings* (with source link, tagged
  `published` or `community`), add new questions to *Open questions*, and append one line to *Log*.
- Edit only your own entries; append rather than rewrite. Keep it short.

## File map
| Path | Role |
|---|---|
| `ingredients.json` | Ordered rule list `{level, name, pattern, why, eu?}`. **The product's knowledge.** |
| `match.js` | Pure matcher (normalise → OCR typo fix → scan). Browser + Node. No deps. |
| `app.js`, `index.html` | UI (no framework, no build step). |
| `alternatives.json` | Hand-checked products available in Germany. |
| `sw.js`, `manifest.json`, `icon*` | Offline cache + install. |
| `vendor/` | Pinned Tesseract.js 6.0.1 / core 6.0.0 / eng data. Never load from a CDN at runtime. |
| `RESEARCH.md` | Evidence behind every rule; published sources separate from community sources. |
| `test/` | `node --test` (unit tests only; any .js/.cjs under test/ is run, so keep network scripts out) |
| `e2e/` | Playwright: `e2e-mock.cjs` (offline, mocked OBF) and `check.cjs` (live network: OBF search, barcode, links, Pages) |
| `.github/workflows/` | `test.yml` (PRs), `pages.yml` (deploy from `main`), `live-check.yml` (weekly + on demand; real network). |

## Rules
- **Minimal code, no build step, no runtime dependencies** beyond `vendor/`. External services
  (Open Beauty Facts) are optional extras; every feature must degrade gracefully offline.
- **ingredients.json:** rules run in file order and the first match claims the text, so put safe or specific
  rules before broad catch-alls (`mineral oil` before `oil`). Each new or changed rule needs a test case in
  `test/match.test.js`, and its claim needs a source in `RESEARCH.md`.
- **Any change to a cached file → bump `VERSION` in `sw.js`** (and add new files to `FILES`).
- **EU first:** note EU regulatory status (e.g. zinc pyrithione banned in EU cosmetics since 03/2022) in
  the rule's `eu` field. Don't recommend products that can't be bought in the EU.
- Health content: cite sources, label community/anecdotal claims as such, keep the "not medical advice" note.
  Never present prescription treatment as self-care.
- Curated products must pass `scan` with zero red hits (enforced by a test). Record a `checked` month.

## Commands
- Tests: `node --test`
- Local server: `python3 -m http.server 8000` → http://localhost:8000
- Live check: the sandbox blocks OBF and shop sites, so run `live-check.yml` on GitHub Actions and read the job log/summary.
- Browser check: Playwright with Chromium (`--use-fake-device-for-media-stream`); feed a label image via
  the `#file` input; mock Open Beauty Facts with `page.route` when it's blocked by the network.
