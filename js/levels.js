import { generate } from './engine.js';

// Adventure mode: an unbounded sequence of levels, grouped into worlds of 20.
// Difficulty follows a sawtooth: every world starts a little easier than the
// previous one ended, ramps up, and finishes with a tougher "boss" level.
export const LEVELS_PER_WORLD = 20;
export const LEVEL_GENERATOR_VERSION = 1;

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

const cache = new Map();
export function adventureLevel(n) {
  if (!cache.has(n)) {
    cache.set(n, generate(`marbl:level:v${LEVEL_GENERATOR_VERSION}:${n}`, levelParams(n)));
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
export const DAILY_GIFT = 25;
