import { generate, parseLevel, hashString } from './engine.js';
import { LEVEL_DATA } from './levels-data.js';

// Adventure mode: an unbounded sequence of levels, grouped into worlds of 20.
// Difficulty follows a sawtooth: every world starts a little easier than the
// previous one ended, ramps up, and finishes with a tougher "boss" level.
export const LEVELS_PER_WORLD = 20;
export const LEVEL_GENERATOR_VERSION = 2;

const TIERS = [
  { size: 5, marbles: 1, stones: 0, walls: [3, 5], par: [2, 3] },
  { size: 5, marbles: 1, stones: 0, walls: [4, 6], par: [3, 4] },
  { size: 6, marbles: 2, stones: 0, walls: [4, 7], par: [3, 5] },
  { size: 6, marbles: 2, stones: 0, walls: [5, 8], par: [5, 6] },
  { size: 6, marbles: 2, stones: 1, walls: [5, 8], par: [5, 7] },
  { size: 6, marbles: 2, stones: 1, walls: [5, 8], par: [7, 8] },
  { size: 7, marbles: 2, stones: 1, walls: [6, 9], par: [7, 9] },
  { size: 7, marbles: 3, stones: 1, walls: [6, 10], par: [8, 10] },
  { size: 7, marbles: 3, stones: 1, walls: [6, 10], par: [10, 12] },
  { size: 7, marbles: 3, stones: 2, walls: [6, 10], par: [10, 13] },
];

// World names / colours (names are i18n keys: world0..world7, then they cycle).
export const WORLD_HUES = ['#1fd1b9', '#ffc23d', '#ff8a3d', '#ff5d73', '#9a7bff', '#4aa8ff', '#5ed36a', '#e86bd6'];
export const WORLD_COUNT_NAMED = WORLD_HUES.length;

export function worldOf(n) {
  return Math.floor((n - 1) / LEVELS_PER_WORLD);
}

export function isBoss(n) {
  return n % LEVELS_PER_WORLD === 0;
}

export function tierFor(n) {
  const world = worldOf(n);
  const idx = (n - 1) % LEVELS_PER_WORLD;
  // Very first levels are deliberately trivial so new players win fast.
  if (n <= 3) return 0;
  let tier = world + Math.floor(idx / 5);
  if (isBoss(n)) tier += 1;
  return Math.min(tier, TIERS.length - 1);
}

export function levelParams(n) {
  return TIERS[tierFor(n)];
}

// Each world brings something new. Later worlds remix everything.
const WORLD_FEATURES = [
  null, // 1 Pebble Beach — the basics
  { sand: [1, 3] }, // 2 Sunny Dunes — sand traps
  { gates: [1, 2] }, // 3 Ember Canyon — crystal gates
  { portals: 1 }, // 4 Coral Reef — portals
  { sand: [1, 2], gates: [1, 1] }, // 5 Violet Peaks
  { portals: 1, sand: [1, 2] }, // 6 Glacier Bay
  { gates: [1, 2], portals: 1 }, // 7 Mossy Woods
  { sand: [1, 2], gates: [1, 1], portals: 1 }, // 8+ Neon City and beyond
];

/** Hand-made first level of a world, so each new mechanic is discovered in a calm, obvious setting. */
export const MECHANIC_INTROS = {
  21: { mech: 'sand', rows: ['.....', '..a..', '.....', 'A.~..', '.....'] },
  41: { mech: 'gates', rows: ['.....', 'A.v.a', '.....', 'B.v..', '....b'] },
  61: { mech: 'portals', rows: ['.....', 'A.@..', '#####', '..@.a', '.....'] },
};

export function featuresFor(n) {
  const world = worldOf(n);
  const f = WORLD_FEATURES[Math.min(world, WORLD_FEATURES.length - 1)];
  if (!f) return null;
  const idx = (n - 1) % LEVELS_PER_WORLD;
  // Right after an intro, keep the new mechanic in every level; later, ~75% of levels.
  if (idx <= 5 || hashString(`feat:${n}`) % 100 < 75) return f;
  return null;
}

/** Which mechanic (if any) is introduced at level n. */
export const introAt = (n) => MECHANIC_INTROS[n]?.mech || null;

/** Build level n from scratch (used by scripts/build-levels.mjs and beyond the pre-computed range). */
export function generateAdventureLevel(n) {
  if (MECHANIC_INTROS[n]) return parseLevel(MECHANIC_INTROS[n].rows);
  return generate(`marbl:level:v${LEVEL_GENERATOR_VERSION}:${n}`, { ...levelParams(n), features: featuresFor(n) });
}

const DIR_CODE = { U: 'up', D: 'down', L: 'left', R: 'right' };
function decode(entry) {
  const [rows, par, sol] = entry.split('|');
  return parseLevel(rows.split('/'), { par: Number(par), solution: [...sol].map((c) => DIR_CODE[c]) });
}

export const PRECOMPUTED_LEVELS = LEVEL_DATA.length;

const cache = new Map();
export function adventureLevel(n) {
  if (!cache.has(n)) {
    const level = n <= LEVEL_DATA.length ? decode(LEVEL_DATA[n - 1]) : generateAdventureLevel(n);
    cache.set(n, level);
    if (cache.size > 30) cache.delete(cache.keys().next().value);
  }
  return cache.get(n);
}

/** Coins awarded when a level is completed: first-clear bonus + 10 per *new* star. */
export function levelReward(prevStars, stars) {
  const newStars = Math.max(0, stars - prevStars);
  return (prevStars === 0 ? 5 : 0) + newStars * 10;
}

/** Coins for a daily puzzle (first solve only) and for completing the whole day. */
export function dailyReward(stars) {
  return 10 + stars * 5;
}
export function dayCompleteBonus(streak) {
  return 20 + 5 * Math.min(streak, 10);
}

export const SHOP = [
  { id: 'pack', items: { hint: 3, rewind: 3 }, price: 150, tag: '-23%' },
  { id: 'hint1', items: { hint: 1 }, price: 40 },
  { id: 'hint5', items: { hint: 5 }, price: 150, tag: '-25%' },
  { id: 'rewind1', items: { rewind: 1 }, price: 25 },
  { id: 'rewind5', items: { rewind: 5 }, price: 100, tag: '-20%' },
];
export const SHOP_CHESTS = [
  { id: 'chest-wood', tier: 'wood', price: 90 },
  { id: 'chest-silver', tier: 'silver', price: 220 },
  { id: 'chest-gold', tier: 'gold', price: 520 },
];
export const SKIN_PRICES = { common: 250, rare: 600, epic: 1200 };
/** Rotating deal of the day: same for everyone on a given day, 40% off, once per day. */
export const DEALS = [
  { items: { hint: 3 }, base: 120 },
  { chest: 'silver', base: 220 },
  { items: { rewind: 4 }, base: 100 },
  { items: { hint: 2, rewind: 2 }, base: 130 },
  { chest: 'gold', base: 520 },
  { items: { hint: 5 }, base: 200 },
];
export const DEAL_OFF = 0.4;
export const DAILY_GIFT = 25;
/** Escalating login reward: day 1..7 of consecutive visits (day 7 is a silver chest), then it loops. */
export const GIFT_LADDER = [25, 30, 40, 50, 60, 80, 'chest'];
