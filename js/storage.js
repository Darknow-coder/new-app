import { DAILY_ORDER, dayDiff, addDays } from './daily.js';

const KEY = 'marbl:v1';
const BACKUP = 'marbl:v1:bak';
export const SAVE_VERSION = 2;

const defaults = () => ({
  tutorialDone: false,
  settings: { sound: true, haptics: true },
  daily: {}, // { 'YYYY-MM-DD': { easy: { moves, stars, done, path:[...]} , ... } }
  endless: { level: 1, best: {} }, // legacy (pre-adventure); migrated into `levels`
  levels: { unlocked: 1, best: {} }, // best: { [level]: stars }
  coins: 100,
  boosters: { hint: 3, rewind: 3 },
  giftDay: null,
  rewardedDays: {}, // days whose completion bonus was paid
  chests: { opened: {} },
  skins: { owned: ['classic'], equipped: 'classic', seen: ['classic'] },
  seenMech: {},
  season: null,
  player: { level: 1, xp: 0 },
  inbox: [], // chests waiting to be opened: { id, tier, reason, n? }
  quests: { day: null, list: [], bonus: false },
  ach: {}, // achievement id -> 'ready' | 'claimed'
  stats: { levelsWon: 0, perfects: 0, chestsOpened: 0, combos: 0, maxCombo: 0, boosterFree: 0, dailySolved: 0 },
  settings2: { music: true },
});

let data = load();

function readRaw() {
  // Main save first, then the daily backup if the main one is missing or corrupted.
  for (const k of [KEY, BACKUP]) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      /* try the next one */
    }
  }
  return null;
}

/** Turn any (possibly older or partial) save object into a complete, current one. */
export function normalize(parsed) {
  if (!parsed) return defaults();
  {
    const d = defaults();
    const merged = {
      ...d,
      ...parsed,
      settings: { ...d.settings, ...(parsed.settings || {}) },
      endless: { ...d.endless, ...(parsed.endless || {}) },
      levels: { ...d.levels, ...(parsed.levels || {}) },
      boosters: { ...d.boosters, ...(parsed.boosters || {}) },
      chests: { opened: { ...((parsed.chests || {}).opened || {}) } },
      skins: { ...d.skins, ...(parsed.skins || {}), seen: (parsed.skins || {}).seen || [...((parsed.skins || {}).owned || ['classic'])] },
      seenMech: { ...(parsed.seenMech || {}) },
      player: { ...d.player, ...(parsed.player || {}) },
      quests: { ...d.quests, ...(parsed.quests || {}) },
      ach: { ...(parsed.ach || {}) },
      stats: { ...d.stats, ...(parsed.stats || {}) },
      settings2: { ...d.settings2, ...(parsed.settings2 || {}) },
    };
    // Migration: existing players get credit for the levels they already won.
    if (!parsed.stats && parsed.levels?.best) merged.stats.levelsWon = Object.keys(parsed.levels.best).length;
    // Migration: players of the old Endless mode keep the level they reached.
    if (!parsed.levels && merged.endless.level > 1) merged.levels.unlocked = merged.endless.level;
    // Sanity: never trust numbers blindly (a truncated or hand-edited save must not break the game).
    merged.coins = Number.isFinite(merged.coins) ? Math.max(0, Math.floor(merged.coins)) : 100;
    merged.levels.unlocked = Math.max(1, Math.floor(merged.levels.unlocked) || 1);
    for (const b of ['hint', 'rewind']) merged.boosters[b] = Math.max(0, Math.floor(merged.boosters[b]) || 0);
    if (!Array.isArray(merged.skins.owned)) merged.skins.owned = ['classic'];
    if (!merged.skins.owned.includes('classic')) merged.skins.owned.unshift('classic');
    if (!merged.skins.owned.includes(merged.skins.equipped)) merged.skins.equipped = 'classic';
    if (!Array.isArray(merged.inbox)) merged.inbox = [];
    merged.version = SAVE_VERSION;
    return merged;
  }
}

function load() {
  try {
    return normalize(readRaw());
  } catch {
    return defaults();
  }
}

let lastBackupDay = null;
export function save() {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(KEY, json);
    // Once a day, keep a second copy: protects against a corrupted main save.
    const day = new Date().toDateString();
    if (day !== lastBackupDay) {
      localStorage.setItem(BACKUP, json);
      lastBackupDay = day;
    }
  } catch {
    /* private mode / quota: the game still works for this session */
  }
}

/** Progress as a portable code (to move to another phone or keep it safe). */
export function exportProgress() {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return `MARBL1.${btoa(bin)}`;
}

/** Restore a code made by exportProgress. Returns true on success. */
export function importProgress(code) {
  try {
    const m = String(code).replace(/\s+/g, '').match(/^MARBL1\.([A-Za-z0-9+/=]+)$/);
    if (!m) return false;
    const bin = atob(m[1]);
    const parsed = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    if (!parsed || typeof parsed !== 'object' || !parsed.levels) return false;
    data = normalize(parsed);
    save();
    return true;
  } catch {
    return false;
  }
}

export const store = {
  get data() {
    return data;
  },
  dailyEntry(key, diff) {
    return data.daily[key]?.[diff] || null;
  },
  setDailyEntry(key, diff, entry) {
    data.daily[key] = data.daily[key] || {};
    data.daily[key][diff] = entry;
    save();
  },
  dayComplete(key) {
    const day = data.daily[key];
    return !!day && DAILY_ORDER.every((d) => day[d]?.done);
  },
  setting(name, value) {
    if (value === undefined) return data.settings[name];
    data.settings[name] = value;
    save();
  },
  addCoins(n) {
    data.coins = Math.max(0, data.coins + n);
    save();
    return data.coins;
  },
  spendCoins(n) {
    if (data.coins < n) return false;
    data.coins -= n;
    save();
    return true;
  },
  booster(id, delta = 0) {
    if (delta) {
      data.boosters[id] = Math.max(0, (data.boosters[id] || 0) + delta);
      save();
    }
    return data.boosters[id] || 0;
  },
  levelStars(n) {
    return data.levels.best[n] || 0;
  },
  /** Record a level result; returns the previous best star count. */
  recordLevel(n, stars) {
    const prev = data.levels.best[n] || 0;
    data.levels.best[n] = Math.max(prev, stars);
    if (n >= data.levels.unlocked) data.levels.unlocked = n + 1;
    save();
    return prev;
  },
  reset() {
    data = defaults();
    save();
  },
};

/** Stats derived from history (never stored, so they can't drift out of sync). */
export function computeStats(today) {
  const keys = Object.keys(data.daily).sort();
  const complete = keys.filter((k) => store.dayComplete(k));
  let best = 0;
  let run = 0;
  let prev = null;
  for (const k of complete) {
    run = prev && dayDiff(prev, k) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  // Current streak: alive if today or yesterday is complete.
  let current = 0;
  let cursor = store.dayComplete(today) ? today : addDays(today, -1);
  while (store.dayComplete(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  let stars = 0;
  let perfectDays = 0;
  for (const k of keys) {
    const day = data.daily[k];
    let dayStars = 0;
    for (const d of DAILY_ORDER) if (day[d]?.done) dayStars += day[d].stars;
    stars += dayStars;
    if (dayStars === 9) perfectDays++;
  }
  const levelStars = Object.values(data.levels.best).reduce((a, b) => a + b, 0);
  return {
    played: complete.length,
    current,
    best,
    stars,
    perfectDays,
    levelReached: data.levels.unlocked,
    levelStars,
  };
}
