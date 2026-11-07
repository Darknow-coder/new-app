import { generate, DIFFICULTIES } from './engine.js';

// Bump GENERATOR_VERSION only together with a new EPOCH-compatible migration:
// changing it changes every daily puzzle for everyone.
export const GENERATOR_VERSION = 1;
export const EPOCH = { y: 2026, m: 11, d: 1 }; // Puzzle #1
export const DAILY_ORDER = ['easy', 'medium', 'hard'];

const pad = (n) => String(n).padStart(2, '0');

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole calendar days between two keys (b - a), DST-safe. */
export function dayDiff(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

export function addDays(key, n) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function puzzleNumber(key) {
  return dayDiff(`${EPOCH.y}-${pad(EPOCH.m)}-${pad(EPOCH.d)}`, key) + 1;
}

export function msUntilTomorrow(now = new Date()) {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return t - now;
}

const cache = new Map();
export function dailyLevel(key, diff) {
  const id = `${key}:${diff}`;
  if (!cache.has(id)) {
    cache.set(id, generate(`marbl:v${GENERATOR_VERSION}:${key}:${diff}`, DIFFICULTIES[diff]));
  }
  return cache.get(id);
}
