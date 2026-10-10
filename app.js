// UI glue: camera / photo → (barcode lookup | OCR) → Matcher.scan → results.
const $ = (id) => document.getElementById(id);
const video = $('video'), canvas = $('canvas'), text = $('text'), status = $('status');
const abs = (p) => new URL(p, location.href).href;
let rules = [], vocab, worker;

fetch('ingredients.json').then((r) => r.json()).then((d) => {
  rules = d.rules;
  vocab = Matcher.makeVocab(rules);
  if (text.value.trim()) check();
});
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

$('snap').onclick = () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
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
  video.style.display = 'none';
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
    const el = document.createElement('div');
    el.className = 'hit ' + h.level;
    el.innerHTML = '<b></b><small></small>';
    el.firstChild.textContent = h.item;
    el.lastChild.textContent = `${h.name} — ${h.why}`;
    $('results').append(el);
  }
}

function say(msg) {
  status.textContent = msg;
}
