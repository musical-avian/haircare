# Scalp Scan

Point your phone at a shampoo/conditioner ingredient list in the shop and see which ingredients
feed *Malassezia* (seborrheic dermatitis / dandruff / Malassezia folliculitis).
Why each ingredient is flagged: see [RESEARCH.md](RESEARCH.md).

- 🔴 feeds Malassezia · 🟠 debated · 🔵 helpful antifungal · 🟢 generally safe
- Three tabs: **Scan** (check a label), **Alternatives** (red-free products sold in Germany: a live
  Open Beauty Facts search plus hand-checked picks from dm, Rossmann and pharmacies), and **Toolkit** (a short routine to clear
  seb derm and rebuild the skin barrier, with sources).
- EU-aware: e.g. flags that zinc pyrithione is banned in EU cosmetics and names the EU alternatives.
- Works **offline** once loaded, installs to the Android home screen (PWA), no account, no tracking.

## How it reads the label
1. **Camera** → *Scan label*: OCR runs on the phone with [Tesseract.js](https://github.com/naptha/tesseract.js).
2. **Photo…**: take/choose a photo instead (works where live camera is blocked).
3. **Paste**: e.g. Google Lens → *Copy text* → paste. Edit any misread words; results update as you type.
4. Bonus: if a barcode is in the photo and you are online, ingredients are looked up on
   [Open Beauty Facts](https://world.openbeautyfacts.org) (Chrome on Android has the built-in `BarcodeDetector`).

## Files
| File | What |
|---|---|
| `ingredients.json` | **The rules.** Ordered list of regex patterns with level + reason. Edit this to change what's flagged. |
| `match.js` | Matching logic (normalise, OCR typo correction, scan). No dependencies. |
| `app.js`, `index.html` | UI: camera, OCR, results, tabs, alternatives search, toolkit. |
| `alternatives.json` | Hand-checked products available in Germany (INCI, source, date checked). |
| `CLAUDE.md`, `PLAN.md` | Conventions, and the shared blackboard for AI/human contributors. |
| `sw.js`, `manifest.json`, `icon*` | Offline cache + installable app. |
| `vendor/` | Pinned copies of Tesseract.js 6.0.1, tesseract.js-core 6.0.0 and English LSTM data (Apache-2.0). Kept in the repo so the app keeps working if a CDN or the project disappears. |
| `test/` | `node --test` |

## Host it
Camera access needs HTTPS (or `localhost`).

- **GitHub Pages:** served straight from the `main` branch (Settings → Pages → Deploy from branch: `main`, root).
  Every merge to `main` goes live at **https://musical-avian.github.io/haircare/**. Open it on your phone, then Chrome
  menu → *Add to Home screen / Install app*. `test.yml` runs the unit tests on every push and PR.
- **Live check:** `.github/workflows/live-check.yml` (weekly + on demand) runs the app against real Open Beauty Facts,
  checks every source link and smoke-tests the deployed site.
- **Anywhere static:** copy the folder to any web server (Netlify, Cloudflare Pages, nginx, a NAS…).
- **Local test:** `python3 -m http.server 8000` then open http://localhost:8000.

After editing any file, bump `VERSION` in `sw.js` so installed copies pick up the change.

## Updating the vendored OCR
```sh
npm pack tesseract.js@<ver> tesseract.js-core@<ver> @tesseract.js-data/eng
# copy dist/tesseract.min.js + dist/worker.min.js → vendor/
# copy tesseract-core-lstm.wasm.js + tesseract-core-simd-lstm.wasm.js → vendor/core/
# copy 4.0.0_best_int/eng.traineddata.gz → vendor/lang/
```
If OCR ever breaks entirely, the paste box still works with zero dependencies.

## Test
```sh
node --test
```

Not medical advice — patch-test new products and talk to a dermatologist about persistent symptoms.
