// Run: node --test
const test = require('node:test');
const assert = require('node:assert');
const { scan } = require('../match.js');
const { rules } = require('../ingredients.json');

const names = (text) => scan(text, rules).map((h) => `${h.level}:${h.item}`);
const has = (text, level, item) =>
  assert.ok(names(text).includes(`${level}:${item}`), `expected ${level}:${item} in ${JSON.stringify(names(text))}`);
const lacks = (text, level) =>
  assert.ok(!scan(text, rules).some((h) => h.level === level), `unexpected ${level} in ${JSON.stringify(names(text))}`);

test('ketoconazole shampoo', () => {
  const t = 'Active ingredient: Ketoconazole 1%. Inactive ingredients: Acrylic Acid Polymer, Butylated Hydroxytoluene, Cocamide MEA, FD&C Blue No. 1, Fragrance, Glycol Distearate, Polyquaternium-7, Quaternium-15, Sodium Chloride, Sodium Cocoyl Sarcosinate, Sodium Hydroxide, Sodium Laureth Sulfate, Tetrasodium EDTA, Water';
  has(t, 'blue', 'ketoconazole 1%');
  has(t, 'red', 'glycol distearate');
  has(t, 'green', 'sodium laureth sulfate');
});

test('coconut conditioner flags oils, esters, fatty alcohols', () => {
  const t = 'Ingredients: Aqua, Cetearyl Alcohol, Cocos Nucifera (Coconut) Oil, Behentrimonium Chloride, Glyceryl Stearate, Butyrospermum Parkii (Shea) Butter, Isopropyl Myristate, Polysorbate 80, Lavandula Angustifolia (Lavender) Oil, Dimethicone, Parfum.';
  has(t, 'red', 'cocos nucifera (coconut) oil');
  has(t, 'red', 'butyrospermum parkii (shea) butter');
  has(t, 'red', 'glyceryl stearate');
  has(t, 'red', 'isopropyl myristate');
  has(t, 'red', 'polysorbate 80');
  has(t, 'amber', 'cetearyl alcohol');
  has(t, 'amber', 'lavandula angustifolia (lavender) oil');
  has(t, 'green', 'dimethicone');
});

test('MCT, squalane and mineral oil are not flagged red', () => {
  const t = 'Caprylic/Capric Triglyceride, Squalane, Paraffinum Liquidum, Mineral Oil, Cyclopentasiloxane, Isododecane';
  lacks(t, 'red');
  lacks(t, 'amber');
});

test('tolerates OCR typos and lost line breaks', () => {
  const t = 'AQUA, CETYL ALCOHOL, POLYSORBALE 20, ISOPROPYL MYRlSTATE, PEG-\n40 HYDROGENATED CASTOR OIL, sorbi-\ntan oleate';
  has(t, 'red', 'polysorbate 20');
  has(t, 'red', 'isopropyl myristate');
  has(t, 'red', 'peg-40 hydrogenated castor oil');
  has(t, 'red', 'sorbitan oleate');
});

test('tea tree is helpful, not reported twice', () => {
  const r = scan('Water, Melaleuca Alternifolia (Tea Tree) Leaf Oil, Menthol', rules);
  assert.deepStrictEqual(r.map((h) => h.level), ['blue']);
});

test('EU note on zinc pyrithione', () => {
  const [h] = scan('Zinc Pyrithione', rules);
  assert.match(h.eu, /banned/i);
});

test('curated alternatives carry no red flags (medicines excepted)', () => {
  const { products } = require('../alternatives.json');
  for (const p of products) {
    for (const k of ['name', 'type', 'where', 'inci', 'source', 'checked']) assert.ok(p[k], `${p.name}: missing ${k}`);
    if (p.medicine) continue;
    const red = scan(p.inci, rules).filter((h) => h.level === 'red');
    assert.deepStrictEqual(red.map((h) => h.item), [], p.name);
  }
});

test('rank keeps only red-free products, antifungals first', () => {
  const { rank } = require('../match.js');
  const r = rank([
    { code: '1', product_name: 'Oily', ingredients_text: 'Aqua, Cocos Nucifera Oil' },
    { code: '2', product_name: 'Plain', ingredients_text: 'Aqua, Sodium Laureth Sulfate, Cetearyl Alcohol' },
    { code: '3', product_name: 'Antifungal', ingredients_text_de: 'Aqua, Piroctone Olamine' },
    { code: '4', product_name: 'No INCI' },
  ], rules);
  assert.deepStrictEqual(r.map((p) => p.code), ['3', '2']);
  assert.strictEqual(r[1].amber, 1);
});
