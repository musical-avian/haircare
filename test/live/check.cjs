// Live check: run the app against the real network (no mocks) and check every external link.
// Meant for GitHub Actions (the dev sandbox blocks these hosts). Not part of `node --test`.
// Usage: node test/live/check.cjs [appUrl]   (default http://localhost:8765/)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP = process.argv[2] || 'http://localhost:8765/';
const PAGES = 'https://musical-avian.github.io/haircare/';
const ROOT = path.join(__dirname, '..', '..');
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const out = [];
let failed = false;
const log = (s) => (out.push(s), console.log(s));
const fail = (s) => ((failed = true), log('❌ ' + s));

async function status(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const r = await fetch(url, { method, redirect: 'follow', headers: { 'user-agent': UA, 'accept-language': 'de-DE,de;q=0.9' }, signal: AbortSignal.timeout(20000) });
      if (r.ok || method === 'GET') return r.status;
    } catch (e) {
      if (method === 'GET') return 'ERR ' + (e.cause?.code || e.name);
    }
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 412, height: 900 }, userAgent: UA });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // 1. Alternatives search, real Open Beauty Facts
  log('## Open Beauty Facts search (app, live)\n\n| Type | Status | Top results |\n|---|---|---|');
  await page.goto(APP);
  await page.click('nav button[data-tab=alts]');
  let total = 0, firstCode;
  for (const type of ['shampoos', 'hair-conditioners', 'shower-gels']) {
    await page.selectOption('#alt-type', type);
    const resp = page.waitForResponse((r) => r.url().includes('openbeautyfacts.org'), { timeout: 60000 }).catch((e) => e);
    await page.click('#alt-go');
    const r = await resp;
    await page.waitForFunction(() => !/Searching/.test(document.getElementById('alt-status').textContent), null, { timeout: 60000 }).catch(() => {});
    const st = await page.textContent('#alt-status');
    const names = await page.$$eval('#alt-results .hit b', (e) => e.slice(0, 5).map((x) => x.textContent));
    log(`| ${type} | ${r instanceof Error ? 'ERR ' + r.message : r.status()}: ${st} | ${names.join('; ')} |`);
    const m = st.match(/^(\d+) products/);
    if (m) total += +m[1];
    if (!firstCode) firstCode = await page.$eval('#alt-results .hit a', (a) => a.href.split('/').pop()).catch(() => null);
  }
  if (!total) fail('OBF search returned no products for any type');

  // 2. Tap a live result → Scan tab verdict
  if (await page.$('#alt-results .hit')) {
    await page.click('#alt-results .hit b');
    log(`\nTap result → Scan verdict: "${await page.textContent('#verdict')}"`);
  }

  // 3. Barcode lookup URL used by app.js
  const code = firstCode || '4066447785425';
  const bc = await page.evaluate(async (c) => {
    const r = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${c}.json?fields=product_name,ingredients_text`);
    const j = await r.json();
    return `${r.status} ${j.product ? (j.product.product_name || '?') + ' — INCI ' + (j.product.ingredients_text ? 'yes' : 'no') : 'no product'}`;
  }, code).catch((e) => 'ERR ' + e.message);
  log(`\nBarcode lookup ${code} (from browser, CORS): ${bc}`);
  if (bc.startsWith('ERR')) fail('barcode lookup failed');

  // 4. External links
  const files = ['alternatives.json', 'RESEARCH.md', 'README.md', 'index.html'];
  const urls = new Set();
  for (const f of files) for (const u of fs.readFileSync(path.join(ROOT, f), 'utf8').match(/https?:\/\/[^\s)"'<>\]]+/g) || []) urls.add(u.replace(/[.,;]+$/, ''));
  log('\n## Links\n\n| Status | URL |\n|---|---|');
  for (const u of [...urls].filter((u) => !u.includes('localhost')).sort()) {
    const s = await status(u);
    const ok = typeof s === 'number' && s < 400;
    log(`| ${ok ? '✅' : '⚠️'} ${s} | ${u} |`);
  }

  // 5. Deployed site smoke test
  const ps = await status(PAGES);
  log(`\n## Deployed site ${PAGES}: ${ps}`);
  if (ps === 200) {
    await page.goto(PAGES);
    await page.fill('#text', 'Aqua, Polysorbate 80, Squalane');
    log(`Pages scan verdict: "${await page.textContent('#verdict')}"`);
  }

  if (errors.length) fail('page errors: ' + errors.join(' | '));
  await browser.close();
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out.join('\n') + '\n');
  process.exit(failed ? 1 : 0);
})();
