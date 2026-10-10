# PLAN.md — blackboard

Shared state for all sessions/agents. Protocol in `CLAUDE.md`. Append; don't rewrite others' entries.

## Goals
1. Detect Malassezia-feeding ingredients in hair care quickly while shopping (phone camera, offline).
2. EU / German market focus: correct regulatory info and locally available alternatives.
3. Explain the evidence: SD ↔ Malassezia ↔ folliculitis, ingredient classes, publications + community.
4. A minimal "toolkit": routine to clear SD and rebuild the skin barrier.
5. Minimal code; keep working if any external library/service disappears.

## Decisions
| Date | Decision | Why |
|---|---|---|
| 2026-10-10 | Static PWA (HTML/JS, no build), installable on Android | Website + app in one, least code |
| 2026-10-10 | Tesseract.js vendored in `vendor/` | Offline; survives CDN/project disappearing |
| 2026-10-10 | Rules as ordered regex list in `ingredients.json`, first match wins | Editable without code; specific before generic |
| 2026-10-10 | Levels red / amber / blue / green | Community lists disagree → amber for debated |
| 2026-10-10 | Pages deploys from branch `main` (owner setting); changes arrive by PR | Owner enabled branch deploy; Actions deploy removed |
| 2026-10-10 | Alternatives = live Open Beauty Facts search (DE) + short curated list | User choice; OBF coverage patchy |
| 2026-10-10 | Toolkit is an offline tab inside the app | User choice |
| 2026-10-10 | Zinc pyrithione flagged as EU-banned in cosmetics (since 2022-03-01) | Reg. (EU) 2021/1902 |

## Task board
### Todo
- [ ] Verify partial INCI lists (Terzolin, Vichy Dercos) against the pack / Beipackzettel; drop `partial`
- [ ] Find a red-free conditioner sold in Germany for `alternatives.json`
- [ ] Owner: set default branch = main (currently the claude/ branch)
### Doing
### Done
- [x] (claude, 2026-10-10) Merged PR #1; live check (`e2e/check.cjs`, `live-check.yml`) runs the app against real OBF + links on GitHub Actions
- [x] (claude, 2026-10-10) EU notes on rules (`eu` field) + EU/Germany section in RESEARCH.md
- [x] (claude, 2026-10-10) Alternatives tab: OBF search via `Matcher.rank`, curated `alternatives.json` + tests
- [x] (claude, 2026-10-10) Toolkit tab (clear → stop feeding → barrier → maintain → doctor)
- [x] (claude, 2026-10-10) Community resources section in RESEARCH.md
- [x] (claude, 2026-10-10) GitHub Pages workflow + CLAUDE.md + PLAN.md → PR #1 to `main`
- [x] (claude, 2026-10-10) v1: scanner, OCR, matcher, rules, research write-up, offline SW

## Findings
- `published` *M. globosa* lacks fatty-acid synthase; secretes lipases — doi:10.1073/pnas.0706756104
- `published` Oleic acid (Malassezia metabolite) alone induces flaking in susceptible people — doi:10.1111/j.1087-0024.2005.10119.x
- `published` Lab media use Tweens / glyceryl esters as lipid source — doi:10.1128/jcm.25.10.2017-2019.1987
- `published` MF review & treatments — doi:10.1111/jdv.16253
- `regulatory` ZPT banned in EU cosmetics from 2022-03-01 (CMR 1B, Reg. (EU) 2021/1902)
- `published` Ketoconazole 2% ≈ steroids for SD clearance with 44% fewer side effects; ≈ ciclopirox — doi:10.1002/14651858.CD008138.pub3
- `published` Mild steroids ≈ strong steroids for SD; calcineurin inhibitors comparable — doi:10.1002/14651858.CD009446.pub2
- `regulatory` Climbazole ≤2% in rinse-off anti-dandruff shampoo (Reg. (EU) 2019/698); Terzolin 2% is sold only in pharmacies, no prescription needed
- `market` Most EU anti-dandruff shampoos contain one red ingredient (glycol distearate, glyceryl oleate, PEG-40 HCO); sebamed Anti-Schuppen Plus has none
- `community` r/SebDerm: contact time 3–5+ min is the #1 tip; rotating actives is common
- `infra` openbeautyfacts.org, dm.de and INCI sites are blocked from the dev sandbox (org network policy) → mock OBF in tests; gather INCI via WebSearch
- `infra` Live (Actions) run: OBF search + barcode work from the browser (CORS OK). DE: shampoos 100 found / 15 red-free, shower gels 97 / 19, conditioners 10 / 0
- `infra` Publisher DOIs (Wiley, PNAS, ASM) and sezia, skinsort, sunday.de, folliculitisscout return 403 to Node fetch (bot protection); recheck in Chromium
- `infra` Pages live at musical-avian.github.io/haircare (branch deploy from main). The 8 publisher DOIs return 403 even to Chromium (bot protection); all shop/source links return 200 in Chromium

## Open questions
- Ciclopirox shampoo availability/status in Germany (ketoconazole answered: sold only in pharmacies, no prescription needed).
- Should "debated" (amber) be configurable per user (strict / relaxed mode)?

## Log
- 2026-10-10 claude: v1 pushed to `claude/malassezia-ingredient-detector-toldfa`.
- 2026-10-10 claude: v2 planned (Pages, EU, alternatives, toolkit, community, blackboard).
- 2026-10-10 claude: Pages workflow, CLAUDE.md, PLAN.md committed; created `main` from the v1 commit; opened PR #1.
- 2026-10-10 claude: v2: EU notes, Alternatives tab, Toolkit tab, community + treatment evidence in RESEARCH.md; 8 tests + browser check pass.
- 2026-10-10 claude: merged PR #1. Pages deploy failed: Pages not enabled (owner setting). Live check added; fixed entity decoding, duplicated brands, empty-conditioner tip; moved e2e scripts out of test/.
- 2026-10-10 claude: 2nd live run: links OK in browser, Pages 200. Fixed scanner/alternatives load coupling, check races; removed pages.yml (conflicts with branch deploy).
