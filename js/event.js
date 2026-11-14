// Weekly event: 7 stages on one theme (pits, portals, mirrors...), new every Monday.
// Stages are picked from the ready-made adventure levels, then turned, mirrored and
// recoloured so they feel new; every transformed level is replayed to be sure it works.
import { encodeLevel, hashString, isDead, isSolved, mulberry32, parseLevel, tilt } from './engine.js';
import { LEVEL_DATA } from './levels-data.js';
import { loadMoreLevels } from './levels.js';
import { addDays, dayDiff, keyToDate } from './daily.js';

export const EVENT_EPOCH = '2026-11-02'; // a Monday: week #0
export const EVENT_STAGES = 7;
export const EVENT_UNLOCK = 15; // adventure level needed to take part

/** Themes: which tile must appear in every stage. 'mix' wants two kinds of tiles or more. */
export const THEMES = [
  { id: 'portals', re: /@/, hue: '#9a7bff' },
  { id: 'pits', re: /O/, hue: '#ff5d73' },
  { id: 'mirrors', re: /[kj]/, hue: '#5ec8ff' },
  { id: 'sand', re: /~/, hue: '#ffc23d' },
  { id: 'arrows', re: /[\^<>,]/, hue: '#4aa8ff' },
  { id: 'bumpers', re: /\*/, hue: '#ff8a3d' },
  { id: 'gates', re: /[v-y]/, hue: '#1fd1b9' },
  { id: 'oneway', re: /[0-3]/, hue: '#5ed36a' },
  { id: 'mix', re: null, hue: '#e86bd6' },
];
const KINDS = [/@/, /O/, /[kj]/, /~/, /[\^<>,]/, /\*/, /[v-y]/, /[0-3]/];

export const weekOf = (day) => Math.floor(dayDiff(EVENT_EPOCH, day) / 7);
export const themeOf = (week) => THEMES[((week % THEMES.length) + THEMES.length) % THEMES.length];
/** Milliseconds until the next event starts (next Monday, local midnight). */
export function msUntilNextWeek(day, now = new Date()) {
  return keyToDate(addDays(EVENT_EPOCH, (weekOf(day) + 1) * 7)) - now;
}

/* ---------- making a level look new ---------- */
const ROT = { '^': '>', '>': ',', ',': '<', '<': '^', 0: '1', 1: '2', 2: '3', 3: '0', k: 'j', j: 'k' };
const FLIP = { '>': '<', '<': '>', 1: '3', 3: '1', k: 'j', j: 'k' };
const ROT_DIR = { up: 'right', right: 'down', down: 'left', left: 'up' };
const FLIP_DIR = { up: 'up', down: 'down', left: 'right', right: 'left' };

function rotate(rows) {
  const h = rows.length;
  const w = rows[0].length;
  const out = [];
  for (let y = 0; y < w; y++) {
    let r = '';
    for (let x = 0; x < h; x++) {
      const ch = rows[h - 1 - x][y];
      r += ROT[ch] ?? ch;
    }
    out.push(r);
  }
  return out;
}
const flip = (rows) => rows.map((r) => [...r].reverse().map((ch) => FLIP[ch] ?? ch).join(''));
/** Swap colours: holes a-d, marbles A-D and gates v-y follow the same permutation. */
function recolor(rows, perm) {
  return rows.map((r) =>
    [...r]
      .map((ch) => {
        if (ch >= 'a' && ch <= 'd') return String.fromCharCode(97 + perm[ch.charCodeAt(0) - 97]);
        if (ch >= 'A' && ch <= 'D') return String.fromCharCode(65 + perm[ch.charCodeAt(0) - 65]);
        if (ch >= 'v' && ch <= 'y') return String.fromCharCode(118 + perm[ch.charCodeAt(0) - 118]);
        return ch;
      })
      .join(''),
  );
}

function replays(level, path) {
  let s = level.start;
  for (const d of path) {
    s = tilt(level, s, d).state;
    if (isDead(s)) return false;
  }
  return isSolved(level, s);
}

/** Turn/mirror/recolour a level; falls back to the original if the result would not play the same. */
export function disguise(entry, rnd) {
  const [rowStr, par, sol] = entry.split('|');
  const rows0 = rowStr.split('/');
  const path0 = [...sol].map((c) => ({ U: 'up', D: 'down', L: 'left', R: 'right' })[c]);
  let rows = rows0;
  let path = path0;
  const turns = Math.floor(rnd() * 4);
  for (let i = 0; i < turns; i++) {
    rows = rotate(rows);
    path = path.map((d) => ROT_DIR[d]);
  }
  if (rnd() < 0.5) {
    rows = flip(rows);
    path = path.map((d) => FLIP_DIR[d]);
  }
  const perm = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  rows = recolor(rows, perm);
  try {
    const level = parseLevel(rows, { par: path.length, solution: path });
    if (replays(level, path)) return level;
  } catch {
    /* fall back below */
  }
  return parseLevel(rows0, { par: Number(par), solution: path0 });
}

/* ---------- this week's stages ---------- */
// Difficulty climbs stage after stage (par bands); newer players get gentler bands.
const BANDS = [
  [4, 6],
  [5, 7],
  [6, 8],
  [7, 9],
  [8, 10],
  [9, 11],
  [10, 13],
];

const cache = new Map();
/** Resolves the 7 stage levels of a week (needs the extra level pack for most themes). */
export async function eventStages(week, unlocked = 100) {
  const key = `${week}:${unlocked < 60 ? 'easy' : 'full'}`;
  if (cache.has(key)) return cache.get(key);
  let pool = LEVEL_DATA;
  try {
    const more = await loadMoreLevels().then(() => import('./levels-more.js'));
    pool = [...LEVEL_DATA, ...more.MORE_DATA];
  } catch {
    /* offline before the pack was cached: the first 320 levels still cover most themes */
  }
  const th = themeOf(week);
  const has = (rows) => (th.re ? th.re.test(rows) : KINDS.filter((k) => k.test(rows)).length >= 2);
  const shift = unlocked < 60 ? -2 : 0;
  const rnd = mulberry32(hashString(`event:${week}`));
  const used = new Set();
  const stages = BANDS.map(([lo, hi], i) => {
    const fits = (p) => p >= lo + shift && p <= hi + shift;
    let cands = [];
    pool.forEach((e, idx) => {
      const [rows, par] = e.split('|');
      if (!used.has(idx) && fits(Number(par)) && has(rows)) cands.push(idx);
    });
    // Not enough with the theme tile? Widen the band before giving up on the theme.
    if (cands.length < 3) pool.forEach((e, idx) => !used.has(idx) && has(e.split('|')[0]) && Math.abs(Number(e.split('|')[1]) - (lo + shift)) <= 3 && cands.push(idx));
    if (!cands.length) pool.forEach((e, idx) => !used.has(idx) && fits(Number(e.split('|')[1])) && cands.push(idx));
    const pick = cands[Math.floor(rnd() * cands.length)] ?? i;
    used.add(pick);
    return disguise(pool[pick], mulberry32(hashString(`event:${week}:${i}`)));
  });
  cache.set(key, stages);
  return stages;
}

/** The tile kinds present in a level (to show the right discovery cards). */
export function mechanicsIn(level) {
  const rows = encodeLevel(level).join('/');
  return ['pits', 'sand', 'gates', 'portals', 'arrows', 'mirrors', 'bumpers', 'oneway'].filter((m) => {
    const re = { pits: /O/, sand: /~/, gates: /[v-y]/, portals: /@/, arrows: /[\^<>,]/, mirrors: /[kj]/, bumpers: /\*/, oneway: /[0-3]/ }[m];
    return re.test(rows);
  });
}

