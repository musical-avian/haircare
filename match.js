// Ingredient matcher. Pure functions, no dependencies.
// Works in the browser (window.Matcher) and in Node (require('./match.js')).
(function (root) {
  const LEVEL_ORDER = { red: 0, amber: 1, blue: 2, green: 3 };

  // Lower-case, strip accents, join words hyphenated across line breaks,
  // and turn every list separator into a comma.
  function normalise(raw) {
    let t = raw.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    t = t.replace(/-\s*\n\s*(?=\d)/g, '-').replace(/-\s*\n\s*/g, '');
    t = t.replace(/(\d),(\d)/g, '$1-$2').replace(/[|•·;*]/g, ',').replace(/\.(\s|$)/g, ',$1').replace(/\s+/g, ' ');
    const i = t.search(/ingr[ea]dients?\s*[:/]/);
    return i >= 0 ? t.slice(t.indexOf(':', i) + 1 || i) : t;
  }

  function lev(a, b) {
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++)
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }

  // Every literal word (5+ letters) that appears in the rule patterns.
  function makeVocab(rules) {
    const v = new Set();
    for (const r of rules) for (const w of r.pattern.replace(/\\[a-z]/g, ' ').match(/[a-z]{5,}/g) || []) v.add(w);
    return v;
  }

  // Snap OCR misreads ("polysorbale", "myrlstate") onto known words.
  function fixTypos(text, vocab) {
    return text.replace(/[a-z0-9]{6,}/g, (w) => {
      if (vocab.has(w) || /\d/.test(w)) return w;
      for (const v of vocab) if (w.endsWith(v)) return w;
      const max = w.length >= 10 ? 2 : 1;
      let best = w, bestD = max + 1;
      for (const v of vocab) {
        if (Math.abs(v.length - w.length) > max) continue;
        const d = lev(w, v);
        if (d < bestD) { best = v; bestD = d; }
      }
      return best;
    });
  }

  // Returns [{level, name, why, item}] sorted worst-first.
  // Rules run in file order; the first rule to match a piece of text wins it,
  // and an ingredient (comma-separated item) is reported only once.
  function scan(raw, rules, vocab) {
    const text = fixTypos(normalise(raw), vocab || makeVocab(rules));
    const claimed = [], seenItems = new Set(), hits = [];
    for (const rule of rules) {
      for (const m of text.matchAll(new RegExp(rule.pattern, 'gi'))) {
        const s = m.index, e = s + m[0].length;
        if (!m[0].trim() || claimed.some(([a, b]) => s < b && e > a)) continue;
        const is = text.lastIndexOf(',', s - 1) + 1;
        const ie = text.indexOf(',', e) < 0 ? text.length : text.indexOf(',', e);
        const long = ie - is > 60; // commas probably lost by OCR
        if (seenItems.has(is) && !long) continue;
        claimed.push([s, e]);
        seenItems.add(is);
        hits.push({ level: rule.level, name: rule.name, why: rule.why, eu: rule.eu, item: (long ? m[0] : text.slice(is, ie)).trim(), pos: s });
      }
    }
    return hits.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.pos - b.pos);
  }

  // Open Beauty Facts products → only those without red hits, fewest amber first.
  function rank(products, rules, vocab) {
    vocab = vocab || makeVocab(rules);
    return products
      .map((p) => ({ ...p, inci: p.ingredients_text || p.ingredients_text_de || p.ingredients_text_en || '' }))
      .filter((p) => p.inci.trim())
      .map((p) => ({ ...p, hits: scan(p.inci, rules, vocab) }))
      .filter((p) => !p.hits.some((h) => h.level === 'red'))
      .map((p) => ({ ...p, amber: p.hits.filter((h) => h.level === 'amber').length, antifungal: p.hits.some((h) => h.level === 'blue') }))
      .sort((a, b) => b.antifungal - a.antifungal || a.amber - b.amber);
  }

  const api = { normalise, fixTypos, makeVocab, scan, rank };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Matcher = api;
})(this);
