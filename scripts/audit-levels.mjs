// Difficulty audit: for each level, how often does random tilting solve it within par + 3 moves?
// A high rate means the level can be solved by luck. Usage: node scripts/audit-levels.mjs
import { tilt, isSolved, DIR_NAMES } from '../js/engine.js';
import { adventureLevel, PRECOMPUTED_LEVELS, LEVELS_PER_WORLD, isBoss } from '../js/levels.js';

const TRIES = 400;
const rows = [];
for (let n = 1; n <= PRECOMPUTED_LEVELS; n++) {
  const l = adventureLevel(n);
  let ok = 0;
  let seed = n * 7919;
  const r = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let k = 0; k < TRIES; k++) {
    let s = l.start;
    for (let m = 0; m < l.par + 3; m++) {
      s = tilt(l, s, DIR_NAMES[Math.floor(r() * 4)]).state;
      if (isSolved(l, s)) {
        ok++;
        break;
      }
    }
  }
  rows.push({ n, par: l.par, luck: ok / TRIES, boss: isBoss(n) });
}
const world = (w) => rows.filter((x) => Math.ceil(x.n / LEVELS_PER_WORLD) === w);
for (let w = 1; w <= PRECOMPUTED_LEVELS / LEVELS_PER_WORLD; w++) {
  const xs = world(w);
  const avg = (f) => (xs.reduce((a, x) => a + f(x), 0) / xs.length).toFixed(2);
  const lucky = xs.filter((x) => x.luck > 0.25 && x.n > 5).map((x) => x.n);
  console.log(`World ${String(w).padStart(2)}  par ${avg((x) => x.par)}  luck ${avg((x) => x.luck)}  boss luck ${xs.find((x) => x.boss).luck.toFixed(2)}  too lucky: ${lucky.join(',') || '-'}`);
}
