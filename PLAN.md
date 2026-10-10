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
| 2026-10-10 | Deploy via GitHub Actions to Pages from `main`, changes arrive by PR | User choice |
| 2026-10-10 | Alternatives = live Open Beauty Facts search (DE) + short curated list | User choice; OBF coverage patchy |
| 2026-10-10 | Toolkit is an offline tab inside the app | User choice |
| 2026-10-10 | Zinc pyrithione flagged as EU-banned in cosmetics (since 2022-03-01) | Reg. (EU) 2021/1902 |

## Task board
### Todo
- [ ] EU notes on rules (`eu` field) + EU/Germany section in RESEARCH.md
- [ ] Alternatives tab: OBF search filtered by `Matcher.scan`, curated `alternatives.json` + test
- [ ] Toolkit tab (clear → maintain → barrier repair → see a doctor), with sources
- [ ] Community resources (Reddit, SSS, Sezia, Folliculitis Scout, INCIDecoder, CodeCheck, haut.de)
- [ ] Playwright e2e for tabs + mocked OBF
### Doing
- [ ] (claude, 2026-10-10) GitHub Pages workflow + CLAUDE.md + PLAN.md → PR to `main`
### Done
- [x] (claude, 2026-10-10) v1: scanner, OCR, matcher, rules, research write-up, offline SW

## Findings
- `published` *M. globosa* lacks fatty-acid synthase; secretes lipases — doi:10.1073/pnas.0706756104
- `published` Oleic acid (Malassezia metabolite) alone induces flaking in susceptible people — doi:10.1111/j.1087-0024.2005.10119.x
- `published` Lab media use Tweens / glyceryl esters as lipid source — doi:10.1128/jcm.25.10.2017-2019.1987
- `published` MF review & treatments — doi:10.1111/jdv.16253
- `regulatory` ZPT banned in EU cosmetics from 2022-03-01 (CMR 1B, Reg. (EU) 2021/1902)
- `infra` openbeautyfacts.org is blocked from the dev sandbox proxy → mock it in tests

## Open questions
- OTC vs prescription status in Germany for ketoconazole / ciclopirox shampoos (verify).
- Should "debated" (amber) be configurable per user (strict / relaxed mode)?

## Log
- 2026-10-10 claude: v1 pushed to `claude/malassezia-ingredient-detector-toldfa`.
- 2026-10-10 claude: v2 planned (Pages, EU, alternatives, toolkit, community, blackboard).
