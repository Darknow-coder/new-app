// Marbl — pure game engine (no DOM). Shared by the app, the generator and the tests.
// A level is a rectangular board with walls, coloured holes, marbles and stones.
// Tilting the board slides every piece in one direction until it hits something.
// A marble that rolls over a hole of its own colour drops in. Stones never drop.

export const DIRS = {
  up: { dx: 0, dy: -1, arrow: '⬆️', key: 'U' },
  down: { dx: 0, dy: 1, arrow: '⬇️', key: 'D' },
  left: { dx: -1, dy: 0, arrow: '⬅️', key: 'L' },
  right: { dx: 1, dy: 0, arrow: '➡️', key: 'R' },
};
export const DIR_NAMES = ['up', 'right', 'down', 'left'];
/** State value of a marble that fell into a pit. */
export const LOST = -3;
export const isDead = (state) => state.includes(LOST);
const ARROW_DIRS = [DIRS.up, DIRS.right, DIRS.down, DIRS.left];
export const COLORS = ['coral', 'teal', 'gold', 'violet'];

/* ---------- deterministic RNG ---------- */
export function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randInt = (rng, n) => Math.floor(rng() * n);

/* ---------- level helpers ---------- */
// Level shape: { w, h, walls: Uint8Array(w*h), holes: Int8Array(w*h) (-1 or colour index),
//               pieces: [{ kind: 'marble'|'stone', color: number }] , start: number[] (cell index per piece) }

export function initialState(level) {
  return level.start.slice();
}

export function isSolved(level, state) {
  for (let i = 0; i < level.pieces.length; i++) {
    if (level.pieces[i].kind === 'marble' && state[i] !== -1) return false;
  }
  return true;
}

/**
 * Apply a tilt. Returns { state, moves } where moves[i] = { from, to, sunk, dist, segs } for each
 * piece that was on the board, or null for pieces already sunk. `segs` lists the straight runs
 * of the move (more than one when the piece went through a portal). state is a new array.
 *
 * Optional level features (all may be null):
 *   sand:   Uint8Array — a piece that rolls onto sand stops there.
 *   portal: Int16Array — portal[c] is the paired cell; a piece entering c reappears there and keeps
 *           rolling (at most one teleport per tilt, so moves stay readable).
 *   gates:  Int8Array  — a crystal gate of colour k only lets marbles of colour k through.
 *   arrows: Int8Array  — an arrow tile (0 up, 1 right, 2 down, 3 left) turns a piece rolling onto it.
 *   pits:   Uint8Array — a marble rolling over a pit is lost (state LOST: the move fails);
 *                        a stone falls in and disappears.
 *   outside: Uint8Array — cells outside a shaped board (behave as walls, drawn as empty).
 */
export function tilt(level, state, dirName) {
  const { dx, dy } = DIRS[dirName];
  const { w, h, walls, holes, pieces } = level;
  const sand = level.sand || null;
  const portal = level.portal || null;
  const gates = level.gates || null;
  const arrows = level.arrows || null;
  const pits = level.pits || null;
  const next = state.slice();
  const moves = new Array(pieces.length).fill(null);

  // Process pieces front-to-back along the tilt direction so that leading pieces settle first.
  const order = [];
  for (let i = 0; i < pieces.length; i++) if (state[i] >= 0) order.push(i);
  const proj = (i) => {
    const c = state[i];
    return (c % w) * dx + Math.floor(c / w) * dy;
  };
  // Ties are broken by cell index (not piece index) so the result only depends on the board.
  order.sort((a, b) => proj(b) - proj(a) || state[a] - state[b]);

  const occupied = new Int16Array(w * h).fill(-1);
  for (const i of order) occupied[state[i]] = i;

  for (const i of order) {
    const from = state[i];
    occupied[from] = -1;
    const isMarble = pieces[i].kind === 'marble';
    const col = pieces[i].color;
    let x = from % w;
    let y = Math.floor(from / w);
    let dist = 0;
    let sunk = false;
    let fell = false;
    let segStart = from;
    let segDist = 0;
    let hops = 0;
    const segs = [];
    let mx = dx;
    let my = dy;
    let guard = w * h * 4;
    for (;;) {
      if (--guard < 0) break;
      const nx = x + mx;
      const ny = y + my;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) break;
      const nc = ny * w + nx;
      if (walls[nc] || occupied[nc] !== -1) break;
      if (gates && gates[nc] >= 0 && !(isMarble && gates[nc] === col)) break;
      x = nx;
      y = ny;
      dist++;
      segDist++;
      if (isMarble && holes[nc] === col) {
        sunk = true;
        break;
      }
      if (pits && pits[nc]) {
        fell = true;
        break;
      }
      if (portal && portal[nc] >= 0 && hops < 1) {
        const out = portal[nc];
        if (occupied[out] === -1) {
          segs.push({ from: segStart, to: nc, dist: segDist });
          x = out % w;
          y = Math.floor(out / w);
          segStart = out;
          segDist = 0;
          hops++;
          continue;
        }
      }
      if (sand && sand[nc]) break;
      if (arrows && arrows[nc] >= 0) {
        const a = ARROW_DIRS[arrows[nc]];
        if (a.dx !== mx || a.dy !== my) {
          segs.push({ from: segStart, to: nc, dist: segDist, turn: true });
          segStart = nc;
          segDist = 0;
          mx = a.dx;
          my = a.dy;
        }
      }
    }
    const to = y * w + x;
    segs.push({ from: segStart, to, dist: segDist });
    if (fell) {
      next[i] = isMarble ? LOST : -1;
    } else if (sunk) {
      next[i] = -1;
    } else {
      next[i] = to;
      occupied[to] = i;
    }
    moves[i] = { from, to, sunk, fell, dist, segs };
  }
  return { state: next, moves };
}

export function stateKey(state) {
  return state.join(',');
}

/**
 * Breadth-first search for the shortest solution.
 * Returns { par, path: dirName[] } or null if unsolvable within limits.
 */
export function solve(level, startState = level.start, { maxDepth = 24, maxStates = 250000, info = null } = {}) {
  const start = startState.slice();
  if (isSolved(level, start)) return { par: 0, path: [] };
  const seen = new Map();
  seen.set(stateKey(start), null);
  let frontier = [start];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const nextFrontier = [];
    for (const s of frontier) {
      const sk = stateKey(s);
      for (const d of DIR_NAMES) {
        const { state: ns } = tilt(level, s, d);
        const k = stateKey(ns);
        if (seen.has(k)) continue;
        seen.set(k, { prev: sk, dir: d });
        if (isDead(ns)) continue;
        if (isSolved(level, ns)) {
          const path = [];
          let cur = k;
          while (seen.get(cur)) {
            const e = seen.get(cur);
            path.push(e.dir);
            cur = e.prev;
          }
          path.reverse();
          return { par: path.length, path };
        }
        nextFrontier.push(ns);
        if (seen.size > maxStates) {
          if (info) info.capped = true;
          return null;
        }
      }
    }
    if (!nextFrontier.length) return null;
    frontier = nextFrontier;
  }
  return null;
}

/* ---------- generator ---------- */
export const DIFFICULTIES = {
  easy: { size: 6, marbles: 2, stones: 0, walls: [4, 7], par: [3, 5] },
  medium: { size: 6, marbles: 2, stones: 1, walls: [5, 8], par: [6, 8] },
  hard: { size: 7, marbles: 3, stones: 1, walls: [6, 10], par: [9, 12], features: { pits: [1, 1] } },
};

function shuffle(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Board shapes (cells cut out of a square board). */
export const SHAPES = ['cross', 'diamond', 'ring', 'notch', 'hourglass'];
function boardShape(shape, n) {
  const out = new Uint8Array(n * n);
  const m = n - 1;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const c = y * n + x;
      const cx = Math.abs(x - m / 2);
      const cy = Math.abs(y - m / 2);
      if (shape === 'cross') out[c] = cx > 1.5 && cy > 1.5 ? 1 : 0; // corners cut
      else if (shape === 'diamond') out[c] = cx + cy > m / 2 + 1 ? 1 : 0;
      else if (shape === 'ring') out[c] = cx < 1 && cy < 1 ? 1 : 0; // hollow centre
      else if (shape === 'notch') out[c] = (x === 0 || x === m) && (y === 0 || y === m || y === Math.floor(m / 2)) ? 1 : 0;
      else if (shape === 'hourglass') out[c] = cy < 1 && cx > 1.5 ? 1 : 0; // pinched middle
    }
  }
  return out;
}

/** ASCII mask ('x' playable, anything else cut out) → outside cells. */
function maskCells(rows) {
  const out = new Uint8Array(rows.length * rows[0].length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => (out[y * r.length + x] = ch === 'x' ? 0 : 1)));
  return out;
}

function buildCandidate(rng, p) {
  const w = p.size;
  const h = p.size;
  const n = w * h;
  const walls = new Uint8Array(n);
  const holes = new Int8Array(n).fill(-1);
  const f = p.features || null;
  const wallCount = p.walls[0] + randInt(rng, p.walls[1] - p.walls[0] + 1);
  let cells = shuffle(rng, Array.from({ length: n }, (_, i) => i));
  let outside = null;
  if (f && (f.shape || f.mask)) {
    outside = f.mask ? maskCells(f.mask) : boardShape(SHAPES[randInt(rng, SHAPES.length)], w);
    for (let c = 0; c < n; c++) if (outside[c]) walls[c] = 1;
    cells = cells.filter((c) => !outside[c]);
  }
  let k = 0;
  for (let i = 0; i < wallCount; i++) walls[cells[k++]] = 1;

  const colors = shuffle(rng, COLORS.map((_, i) => i)).slice(0, p.marbles);
  const pieces = [];
  const start = [];
  for (const c of colors) holes[cells[k++]] = c;
  for (const c of colors) {
    pieces.push({ kind: 'marble', color: c });
    start.push(cells[k++]);
  }
  for (let i = 0; i < p.stones; i++) {
    pieces.push({ kind: 'stone', color: -1 });
    start.push(cells[k++]);
  }
  const level = { w, h, walls, holes, pieces, start, sand: null, portal: null, gates: null, arrows: null, pits: null, outside };
  if (f) {
    if (f.sand) {
      level.sand = new Uint8Array(n);
      const count = f.sand[0] + randInt(rng, f.sand[1] - f.sand[0] + 1);
      for (let i = 0; i < count; i++) level.sand[cells[k++]] = 1;
    }
    if (f.portals) {
      level.portal = new Int16Array(n).fill(-1);
      const a = cells[k++];
      const b = cells[k++];
      level.portal[a] = b;
      level.portal[b] = a;
    }
    if (f.pits) {
      level.pits = new Uint8Array(n);
      const count = f.pits[0] + randInt(rng, f.pits[1] - f.pits[0] + 1);
      for (let i = 0; i < count; i++) level.pits[cells[k++]] = 1;
    }
    if (f.arrows) {
      level.arrows = new Int8Array(n).fill(-1);
      const count = f.arrows[0] + randInt(rng, f.arrows[1] - f.arrows[0] + 1);
      for (let i = 0; i < count; i++) level.arrows[cells[k++]] = randInt(rng, 4);
    }
    if (f.gates) {
      level.gates = new Int8Array(n).fill(-1);
      const count = f.gates[0] + randInt(rng, f.gates[1] - f.gates[0] + 1);
      for (let i = 0; i < count; i++) level.gates[cells[k++]] = colors[randInt(rng, colors.length)];
    }
  }
  return level;
}

export function hasFeatures(level) {
  return !!(level.sand || level.portal || level.gates || level.arrows || level.pits);
}

/** True when the special tiles actually change the optimal solution (so they are not decoration). */
function featuresMatter(level, par, maxDepth) {
  if (!hasFeatures(level)) return true;
  const plain = { ...level, sand: null, portal: null, gates: null, arrows: null, pits: null };
  const sol = solve(plain, plain.start, { maxDepth, maxStates: 120000 });
  return !sol || sol.par !== par;
}

// Rough "interest" score: favour solutions that use many distinct directions and change direction often.
function interest(path) {
  const distinct = new Set(path).size;
  let turns = 0;
  for (let i = 1; i < path.length; i++) if (path[i] !== path[i - 1]) turns++;
  return distinct * 10 + turns;
}

/**
 * Generate a solvable level deterministically from a seed string.
 * params: a DIFFICULTIES entry (or a custom one).
 */
export function generate(seedStr, params, { attempts = 400, candidates = 6 } = {}) {
  const rng = mulberry32(hashString(seedStr));
  let best = null;
  let fallback = null;
  let found = 0;
  for (let a = 0; a < attempts && found < candidates; a++) {
    const lvl = buildCandidate(rng, params);
    const sol = solve(lvl, lvl.start, { maxDepth: params.par[1], maxStates: 120000 });
    if (!sol || sol.par === 0) continue;
    if (!fallback || sol.par > fallback.solution.par) fallback = { level: lvl, solution: sol };
    if (sol.par < params.par[0]) continue;
    // Every tilt in the first move must do something interesting: avoid levels solved by one direction spam.
    if (new Set(sol.path).size < Math.min(3, sol.par)) continue;
    if (!featuresMatter(lvl, sol.par, params.par[1] + 4)) continue;
    found++;
    const score = sol.par * 100 + interest(sol.path);
    if (!best || score > best.score) best = { level: lvl, solution: sol, score };
  }
  const pick = best || fallback;
  if (!pick) throw new Error('Could not generate a level for seed ' + seedStr);
  pick.level.par = pick.solution.par;
  pick.level.solution = pick.solution.path;
  pick.level.seed = seedStr;
  return pick.level;
}

/** Parameters for endless mode level n (1-based): gently ramps difficulty. */
export function endlessParams(n) {
  if (n <= 3) return { size: 5, marbles: 1, stones: 0, walls: [3, 5], par: [2, 2 + n] };
  if (n <= 8) return { size: 6, marbles: 2, stones: 0, walls: [4, 7], par: [3, 5] };
  if (n <= 15) return { size: 6, marbles: 2, stones: 1, walls: [5, 8], par: [6, 8] };
  if (n <= 25) return { size: 7, marbles: 2, stones: 1, walls: [6, 9], par: [7, 10] };
  if (n <= 40) return { size: 7, marbles: 3, stones: 1, walls: [6, 10], par: [8, 12] };
  return { size: 7, marbles: 3, stones: 2, walls: [6, 10], par: [10, 14] };
}

/** Star rating given moves taken and par. */
export function starsFor(moves, par) {
  if (moves <= par) return 3;
  if (moves <= par + Math.max(2, Math.ceil(par * 0.3))) return 2;
  return 1;
}

/**
 * Build a level from ASCII rows. Legend: '.' floor, '#' wall, 'a'-'d' hole of colour 0-3,
 * 'A'-'D' marble of colour 0-3, 'S' stone, '~' sand, '@' portal (exactly two),
 * 'v' 'w' 'x' 'y' crystal gate of colour 0-3.
 */
// Arrow tiles in level strings: ^ up, > right, , down, < left.
const ARROW_CH = ['^', '>', ',', '<'];

/** Inverse of parseLevel: ASCII rows for a level (every special cell is distinct, so one char per cell). */
export function encodeLevel(level) {
  const { w, h } = level;
  const grid = new Array(w * h).fill('.');
  for (let c = 0; c < w * h; c++) {
    if (level.outside?.[c]) grid[c] = '_';
    else if (level.walls[c]) grid[c] = '#';
    else if (level.pits?.[c]) grid[c] = 'O';
    else if (level.holes[c] >= 0) grid[c] = String.fromCharCode(97 + level.holes[c]);
    else if (level.sand?.[c]) grid[c] = '~';
    else if (level.portal && level.portal[c] >= 0) grid[c] = '@';
    else if (level.gates && level.gates[c] >= 0) grid[c] = String.fromCharCode(118 + level.gates[c]);
    else if (level.arrows && level.arrows[c] >= 0) grid[c] = ARROW_CH[level.arrows[c]];
  }
  level.pieces.forEach((p, i) => {
    grid[level.start[i]] = p.kind === 'stone' ? 'S' : String.fromCharCode(65 + p.color);
  });
  const rows = [];
  for (let y = 0; y < h; y++) rows.push(grid.slice(y * w, y * w + w).join(''));
  return rows;
}

/** `known` ({ par, solution }) skips the solver for pre-computed levels. */
export function parseLevel(rows, known = null) {
  const h = rows.length;
  const w = rows[0].length;
  const walls = new Uint8Array(w * h);
  const holes = new Int8Array(w * h).fill(-1);
  const pieces = [];
  const start = [];
  let sand = null;
  let gates = null;
  let arrows = null;
  let pits = null;
  let outside = null;
  const portals = [];
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error('Ragged level row ' + y);
    [...row].forEach((ch, x) => {
      const c = y * w + x;
      if (ch === '#') walls[c] = 1;
      else if (ch >= 'a' && ch <= 'd') holes[c] = ch.charCodeAt(0) - 97;
      else if (ch >= 'A' && ch <= 'D') {
        pieces.push({ kind: 'marble', color: ch.charCodeAt(0) - 65 });
        start.push(c);
      } else if (ch === 'S') {
        pieces.push({ kind: 'stone', color: -1 });
        start.push(c);
      } else if (ch === '~') {
        sand = sand || new Uint8Array(w * h);
        sand[c] = 1;
      } else if (ch === '@') {
        portals.push(c);
      } else if (ch >= 'v' && ch <= 'y') {
        gates = gates || new Int8Array(w * h).fill(-1);
        gates[c] = ch.charCodeAt(0) - 118;
      } else if (ch === 'O') {
        pits = pits || new Uint8Array(w * h);
        pits[c] = 1;
      } else if (ch === '_') {
        outside = outside || new Uint8Array(w * h);
        outside[c] = 1;
        walls[c] = 1;
      } else if (ARROW_CH.includes(ch)) {
        arrows = arrows || new Int8Array(w * h).fill(-1);
        arrows[c] = ARROW_CH.indexOf(ch);
      } else if (ch !== '.') throw new Error('Unknown tile ' + ch);
    });
  });
  let portal = null;
  if (portals.length) {
    if (portals.length !== 2) throw new Error('Portals come in pairs');
    portal = new Int16Array(w * h).fill(-1);
    portal[portals[0]] = portals[1];
    portal[portals[1]] = portals[0];
  }
  const level = { w, h, walls, holes, pieces, start, sand, portal, gates, arrows, pits, outside };
  if (known) {
    level.par = known.par;
    level.solution = known.solution;
    return level;
  }
  const sol = solve(level);
  if (!sol) throw new Error('Unsolvable hand-made level');
  level.par = sol.par;
  level.solution = sol.path;
  return level;
}

/** Can some sequence of tilts (within par + slack) drop two or more marbles at once? */
export function comboReachable(level, slack = 2, maxStates = 5000) {
  if (level.pieces.filter((p) => p.kind === 'marble').length < 2) return false;
  const seen = new Set([stateKey(level.start)]);
  let frontier = [level.start];
  for (let d = 0; d < level.par + slack && frontier.length; d++) {
    const next = [];
    for (const s of frontier) {
      for (const dir of DIR_NAMES) {
        const r = tilt(level, s, dir);
        let sunk = 0;
        for (const m of r.moves) if (m && m.sunk) sunk++;
        if (sunk >= 2) return true;
        const k = stateKey(r.state);
        if (isDead(r.state)) continue;
        if (!seen.has(k)) {
          seen.add(k);
          next.push(r.state);
          if (seen.size > maxStates) return false;
        }
      }
    }
    frontier = next;
  }
  return false;
}
