// Property lookup: returns the property that best matches the given filters.
// Filters (query string or JSON body): size, price, location, bedrooms, type
// size:  "small" | "medium" | "large" or a number in sqm
// price: "budget" | "mid" | "luxury" or a number (max budget)
const PROPERTIES = [
  { id: 1, name: 'Compact City Studio', type: 'apartment', location: 'downtown', size: 'small', sizeSqm: 45, priceTier: 'budget', price: 150000, bedrooms: 1, description: 'Modern studio in the city centre, close to transport and shops.' },
  { id: 2, name: 'Family Suburban House', type: 'house', location: 'suburbs', size: 'medium', sizeSqm: 180, priceTier: 'mid', price: 450000, bedrooms: 4, description: 'Spacious family home with a garden and garage in a quiet neighbourhood.' },
  { id: 3, name: 'Luxury Beachfront Villa', type: 'villa', location: 'beach', size: 'large', sizeSqm: 350, priceTier: 'luxury', price: 1200000, bedrooms: 6, description: 'Premium villa with sea views, private pool and direct beach access.' }
];

const SIZE_WORDS = { small: 'small', compact: 'small', tiny: 'small', medium: 'medium', average: 'medium', mid: 'medium', large: 'large', big: 'large', huge: 'large' };
const PRICE_WORDS = { budget: 'budget', cheap: 'budget', low: 'budget', affordable: 'budget', mid: 'mid', medium: 'mid', moderate: 'mid', luxury: 'luxury', expensive: 'luxury', high: 'luxury', premium: 'luxury' };

const norm = (v) => (v === undefined || v === null ? '' : String(v).trim().toLowerCase());
const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.]/g, '')); return isNaN(n) ? null : n; };

function score(p, f) {
  let s = 0;
  if (f.size) {
    const w = SIZE_WORDS[f.size];
    if (w) { if (p.size === w) s += 1; }
    else if (num(f.size) !== null) { const target = num(f.size); const best = PROPERTIES.reduce((a, b) => Math.abs(b.sizeSqm - target) < Math.abs(a.sizeSqm - target) ? b : a); if (best.id === p.id) s += 1; }
  }
  if (f.price) {
    const w = PRICE_WORDS[f.price];
    if (w) { if (p.priceTier === w) s += 1; }
    else if (num(f.price) !== null) { const budget = num(f.price); const affordable = PROPERTIES.filter((x) => x.price <= budget); const best = affordable.length ? affordable.reduce((a, b) => (b.price > a.price ? b : a)) : PROPERTIES.reduce((a, b) => (b.price < a.price ? b : a)); if (best.id === p.id) s += 1; }
  }
  if (f.location && (p.location.includes(f.location) || f.location.includes(p.location))) s += 1;
  if (f.type && (p.type.includes(f.type) || f.type.includes(p.type))) s += 1;
  if (f.bedrooms && num(f.bedrooms) !== null) { const target = num(f.bedrooms); const best = PROPERTIES.reduce((a, b) => Math.abs(b.bedrooms - target) < Math.abs(a.bedrooms - target) ? b : a); if (best.id === p.id) s += 1; }
  return s;
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const src = Object.assign({}, req.query || {}, body);
  const f = { size: norm(src.size), price: norm(src.price), location: norm(src.location), type: norm(src.type), bedrooms: norm(src.bedrooms) };
  const applied = Object.keys(f).filter((k) => f[k]);

  if (!applied.length) {
    return res.status(200).json({ status: 'success', message: 'No filters provided. Use size, price, location, bedrooms or type.', filters: {}, property: null, properties: PROPERTIES });
  }

  const ranked = PROPERTIES.map((p) => ({ p, s: score(p, f) })).sort((a, b) => b.s - a.s);
  const top = ranked[0];
  if (top.s === 0) {
    return res.status(200).json({ status: 'not_found', message: 'No property matches the given filters.', filters: f, property: null, properties: [] });
  }
  const matches = ranked.filter((r) => r.s === top.s).map((r) => r.p);
  res.status(200).json({ status: 'success', filters: f, matchScore: top.s + '/' + applied.length, property: top.p, properties: matches });
};
