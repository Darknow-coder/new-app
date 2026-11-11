import { generate, parseLevel, DIFFICULTIES } from './engine.js';

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

// Generated puzzles are kept on the device (a few days' worth), so the generator runs
// once per puzzle, not at every launch.
const LS_KEY = 'marbl:daily-cache';
const LS_MAX = 40;
function lsRead() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || {};
  } catch {
    return {};
  }
}
function lsWrite(id, code) {
  try {
    const all = lsRead();
    all[id] = code;
    const ids = Object.keys(all);
    for (const old of ids.slice(0, Math.max(0, ids.length - LS_MAX))) delete all[old];
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {
    /* storage full or unavailable: just regenerate next time */
  }
}
function decode(code) {
  const [rows, par, sol] = code.split('|');
  return parseLevel(rows.split('/'), { par: Number(par), solution: sol ? sol.split(',') : [] });
}

/** Is this puzzle ready without running the generator? */
export function dailyReady(key, diff) {
  return cache.has(`${key}:${diff}`) || (typeof localStorage !== 'undefined' && !!lsRead()[`v${GENERATOR_VERSION}:${key}:${diff}`]);
}

export function dailyLevel(key, diff) {
  const id = `${key}:${diff}`;
  if (!cache.has(id)) {
    const code = typeof localStorage !== 'undefined' ? lsRead()[`v${GENERATOR_VERSION}:${id}`] : null;
    if (code) {
      try {
        cache.set(id, decode(code));
        return cache.get(id);
      } catch {
        /* corrupted entry: regenerate */
      }
    }
    cache.set(id, generate(`marbl:v${GENERATOR_VERSION}:${key}:${diff}`, DIFFICULTIES[diff]));
  }
  return cache.get(id);
}

let worker;
const waiting = new Map();
function getWorker() {
  if (worker !== undefined) return worker;
  try {
    worker = typeof Worker !== 'undefined' ? new Worker(new URL('./daily-worker.js', import.meta.url), { type: 'module' }) : null;
  } catch {
    worker = null;
  }
  if (worker) {
    worker.onmessage = (e) => {
      const { key, diff, code } = e.data;
      const id = `${key}:${diff}`;
      if (code) {
        lsWrite(`v${GENERATOR_VERSION}:${id}`, code);
        if (!cache.has(id)) cache.set(id, decode(code));
      }
      waiting.get(id)?.forEach((r) => r());
      waiting.delete(id);
    };
    worker.onerror = () => {
      // Module workers unsupported: fall back to the main thread.
      worker = null;
      for (const [id, rs] of waiting) {
        const [key, diff] = id.split(/:(?=[a-z]+$)/);
        dailyLevel(key, diff);
        rs.forEach((r) => r());
      }
      waiting.clear();
    };
  }
  return worker;
}

/** Make sure the puzzles of a day exist, building them in a worker. Resolves when ready. */
export function prefetchDaily(key) {
  return Promise.all(
    DAILY_ORDER.map((diff) => {
      const id = `${key}:${diff}`;
      if (dailyReady(key, diff)) {
        dailyLevel(key, diff);
        return null;
      }
      const w = getWorker();
      if (!w) {
        return new Promise((r) => setTimeout(() => r(dailyLevel(key, diff)), 0));
      }
      return new Promise((resolve) => {
        if (!waiting.has(id)) {
          waiting.set(id, []);
          w.postMessage({ key, diff });
        }
        waiting.get(id).push(resolve);
      });
    }),
  );
}
