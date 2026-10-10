// UI glue: camera / photo → (barcode lookup | OCR) → Matcher.scan → results.
const $ = (id) => document.getElementById(id);
const video = $('video'), canvas = $('canvas'), text = $('text'), status = $('status');
const abs = (p) => new URL(p, location.href).href;
let rules = [], vocab, worker;

const rulesReady = fetch('ingredients.json').then((r) => r.json()).then((d) => {
  rules = d.rules;
  vocab = Matcher.makeVocab(rules);
  if (text.value.trim()) check();
});
// Separate fetch so a missing/broken alternatives.json can't stop the scanner.
Promise.all([rulesReady, fetch('alternatives.json').then((r) => r.json())]).then(([, alts]) => {
  for (const p of alts.products) {
    const hits = Matcher.scan(p.inci, rules, vocab);
    const worst = hits[0] ? hits[0].level : 'green';
    const flags = hits.filter((h) => h.level === 'red' || h.level === 'amber').map((h) => h.item).join(', ');
    const el = card(p.medicine && worst === 'red' ? 'blue' : worst, p.name,
      `${p.where} · ${p.note}${flags ? ' Flags: ' + flags + '.' : ''}${p.partial ? ' (Partial ingredient list.)' : ''} Checked ${p.checked}.`, p.source);
    el.onclick = (e) => e.target.tagName !== 'A' && load(p.inci);
    $('alt-curated').append(el);
  }
});

// Tabs
document.querySelectorAll('nav button').forEach((b) => (b.onclick = () => tab(b.dataset.tab)));
function tab(name) {
  document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('main > section').forEach((s) => (s.hidden = s.id !== name));
  scrollTo(0, 0);
}
function load(inci) {
  text.value = inci;
  tab('scan');
  check();
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

$('camera').onclick = async () => {
  try {
    video.srcObject = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
    await video.play();
    video.style.display = 'block';
    canvas.style.display = 'none';
    $('camera').hidden = true;
    $('snap').hidden = false;
  } catch (e) {
    say('Camera unavailable (' + e.name + '). Use “Photo…” or paste the text instead.');
  }
};

// Release the camera: Chrome keeps it on (even in a background tab) until every track is stopped.
function stopCamera() {
  video.srcObject?.getTracks().forEach((t) => t.stop());
  video.srcObject = null;
  video.style.display = 'none';
  $('camera').hidden = false;
  $('snap').hidden = true;
}
document.addEventListener('visibilitychange', () => document.hidden && stopCamera());
addEventListener('pagehide', stopCamera);

$('snap').onclick = () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  stopCamera();
  canvas.style.display = 'block';
  read();
};

$('file').onchange = async () => {
  const f = $('file').files[0];
  if (!f) return;
  const img = await createImageBitmap(f);
  const scale = Math.min(1, 2400 / Math.max(img.width, img.height));
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  canvas.style.display = 'block';
  stopCamera();
  read();
};

$('check').onclick = check;
text.oninput = check;

async function read() {
  grayscale();
  if (await fromBarcode()) return;
  say('Reading text… (first run loads the OCR engine, ~7 MB)');
  try {
    worker ??= await Tesseract.createWorker('eng', 1, {
      workerPath: abs('vendor/worker.min.js'),
      corePath: abs('vendor/core'),
      langPath: abs('vendor/lang'),
      logger: (m) => m.progress && say(`${m.status} ${Math.round(m.progress * 100)}%`),
    });
    const { data } = await worker.recognize(canvas);
    text.value = data.text;
    say('Done — fix any misread words above and tap Check if needed.');
    check();
  } catch (e) {
    say('OCR failed: ' + e.message + '. Paste the text instead.');
  }
}

// Optional: if the photo contains a barcode and we're online, ask Open Beauty Facts.
async function fromBarcode() {
  if (!('BarcodeDetector' in window) || !navigator.onLine) return false;
  try {
    const [code] = await new BarcodeDetector().detect(canvas);
    if (!code) return false;
    say('Barcode ' + code.rawValue + ' — looking up Open Beauty Facts…');
    const r = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${code.rawValue}.json?fields=product_name,ingredients_text`);
    const p = (await r.json()).product;
    if (!p || !p.ingredients_text) return false;
    text.value = p.ingredients_text;
    say(`Found “${p.product_name || code.rawValue}” on Open Beauty Facts. Compare with the pack — formulas change.`);
    check();
    return true;
  } catch {
    return false;
  }
}

// Grayscale + contrast stretch helps OCR on glossy, coloured bottles.
function grayscale() {
  const ctx = canvas.getContext('2d');
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height), d = img.data;
  let lo = 255, hi = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
    d[i] = g;
    if (g < lo) lo = g;
    if (g > hi) hi = g;
  }
  const k = 255 / Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = (d[i] - lo) * k;
  ctx.putImageData(img, 0, 0);
}

function check() {
  const hits = Matcher.scan(text.value, rules, vocab);
  const n = (l) => hits.filter((h) => h.level === l).length;
  const v = $('verdict');
  if (!text.value.trim()) v.textContent = '';
  else if (n('red')) (v.textContent = `✗ Avoid — ${n('red')} Malassezia food${n('red') > 1 ? 's' : ''} found`), (v.style.color = 'var(--red)');
  else if (n('amber')) (v.textContent = `⚠ Caution — ${n('amber')} debated ingredient${n('amber') > 1 ? 's' : ''}`), (v.style.color = 'var(--amber)');
  else (v.textContent = '✓ No known Malassezia triggers found'), (v.style.color = 'var(--green)');
  $('results').innerHTML = '';
  for (const h of hits) {
    const el = card(h.level, h.item, `${h.name} — ${h.why}`);
    if (h.eu) el.insertAdjacentHTML('beforeend', '<span class="eu"></span>'), (el.lastChild.textContent = '🇪🇺 ' + h.eu);
    $('results').append(el);
  }
  if (n('red')) {
    const b = document.createElement('button');
    b.className = 'alt';
    b.textContent = 'Find alternatives sold in Germany →';
    b.onclick = () => tab('alts');
    $('results').append(b);
  }
}

// Open Beauty Facts names sometimes contain HTML entities (&quot;).
function decode(s) {
  return new DOMParser().parseFromString(s, 'text/html').documentElement.textContent;
}

// One result card; text is set via textContent so product data can't inject HTML.
function card(level, title, sub, link) {
  const el = document.createElement('div');
  el.className = 'hit ' + level + (link ? ' prod' : '');
  el.innerHTML = '<b></b><small></small>';
  el.firstChild.textContent = title;
  el.lastChild.textContent = sub;
  if (link) {
    const a = Object.assign(document.createElement('a'), { href: link, target: '_blank', rel: 'noopener', textContent: ' source ↗' });
    el.lastChild.append(a);
  }
  return el;
}

// Alternatives: Open Beauty Facts products sold in Germany, minus anything with a red hit.
$('alt-go').onclick = async () => {
  const out = $('alt-results'), st = $('alt-status'), type = $('alt-type').value;
  out.innerHTML = '';
  st.textContent = 'Searching Open Beauty Facts…';
  const q = new URLSearchParams({
    action: 'process', json: '1', page_size: '200', search_terms: $('alt-q').value.trim(),
    tagtype_0: 'countries', tag_contains_0: 'contains', tag_0: 'germany',
    fields: 'code,product_name,brands,ingredients_text,ingredients_text_de,ingredients_text_en',
  });
  if (type) q.append('tagtype_1', 'categories'), q.append('tag_contains_1', 'contains'), q.append('tag_1', type);
  try {
    const r = await fetch('https://world.openbeautyfacts.org/cgi/search.pl?' + q);
    const all = (await r.json()).products || [];
    const good = Matcher.rank(all, rules, vocab);
    st.textContent = `${all.length} products found, ${good.length} without red-flag ingredients.` +
      (all.length && !good.length ? ' Tip: condition only the lengths, or use pure MCT oil on the ends (see Toolkit).' : '');
    for (const p of good.slice(0, 50)) {
      const name = `${(p.brands || '').split(',')[0]} ${p.product_name || p.code}`.trim();
      const el = card(p.antifungal ? 'blue' : p.amber ? 'amber' : 'green', decode(name),
        `${p.antifungal ? 'Contains an antifungal. ' : ''}${p.amber} debated ingredient${p.amber === 1 ? '' : 's'}. Tap for details.`,
        'https://world.openbeautyfacts.org/product/' + p.code);
      el.onclick = (e) => e.target.tagName !== 'A' && load(p.inci);
      out.append(el);
    }
  } catch {
    st.textContent = 'Search needs an internet connection; the hand-checked picks below work offline.';
  }
};

function say(msg) {
  status.textContent = msg;
}
