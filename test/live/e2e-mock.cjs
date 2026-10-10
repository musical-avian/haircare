const { chromium } = require('playwright');
// Mocked end-to-end check (works offline / in the sandbox): tabs, curated list, OBF search via page.route.
// Usage: python3 -m http.server 8765 & node test/live/e2e-mock.cjs
const S = require('os').tmpdir();
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.route('https://world.openbeautyfacts.org/**', (r) => { console.log('OBF URL:', r.request().url().slice(0, 200)); r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ products: [
    { code: '111', brands: 'Balea', product_name: 'Oil Repair', ingredients_text: 'Aqua, Argania Spinosa Kernel Oil, Cetearyl Alcohol' },
    { code: '222', brands: 'Isana', product_name: 'Anti-Schuppen', ingredients_text: 'Aqua, Sodium Laureth Sulfate, Piroctone Olamine, Laureth-4' },
    { code: '333', brands: 'alverde', product_name: 'Mild', ingredients_text: 'Aqua, Coco-Glucoside, Glycerin' } ] }) }); });
  await p.goto('http://localhost:8765/');
  await p.fill('#text', 'Aqua, Zinc Pyrithione, Glycol Distearate');
  console.log('EU note:', await p.textContent('.eu'));
  await p.click('text=Find alternatives');
  await p.waitForTimeout(300);
  console.log('curated:', (await p.$$eval('#alt-curated .hit', (e) => e.map((x) => x.className.split(' ')[1] + ':' + x.querySelector('b').textContent))).join(' | '));
  await p.click('#alt-go');
  await p.waitForSelector('#alt-results .hit');
  console.log(await p.textContent('#alt-status'));
  console.log('live:', (await p.$$eval('#alt-results .hit b', (e) => e.map((x) => x.textContent))).join(' | '));
  await p.screenshot({ path: `${S}/alts.png`, fullPage: true });
  await p.click('#alt-results .hit');
  console.log('loaded into scan:', await p.inputValue('#text'), '→', await p.textContent('#verdict'));
  await p.click('nav button[data-tab=toolkit]');
  console.log('toolkit visible:', await p.isVisible('#toolkit h2'));
  await p.screenshot({ path: `${S}/toolkit.png`, fullPage: true });
  await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForTimeout(800);
  await ctx.setOffline(true); await p.reload();
  console.log('offline curated count:', await p.$$eval('#alt-curated .hit', (e) => e.length));
  console.log('errors:', errs);
  await b.close();
  if (errs.length) process.exit(1);
})();
