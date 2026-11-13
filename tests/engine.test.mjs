import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tilt, solve, generate, parseLevel, isSolved, starsFor, DIFFICULTIES, endlessParams } from '../js/engine.js';
import { dailyLevel, puzzleNumber, dayDiff, addDays, DAILY_ORDER } from '../js/daily.js';
import { TUTORIAL } from '../js/tutorial.js';

test('marble rolls to the edge and stops', () => {
  const l = parseLevel(['A...', '....', '....', '...a']);
  const { state, moves } = tilt(l, l.start, 'right');
  assert.equal(state[0], 3);
  assert.equal(moves[0].dist, 3);
});

test('marble drops into its own hole while passing over it', () => {
  const l = parseLevel(['A.a.', '....']);
  const { state, moves } = tilt(l, l.start, 'right');
  assert.equal(state[0], -1);
  assert.equal(moves[0].to, 2);
  assert.ok(isSolved(l, state));
});

test('marble rolls over a hole of another colour', () => {
  const l = parseLevel(['A.b.B', 'a....']);
  const { state } = tilt(l, l.start, 'right');
  // B is at the right edge already; A passes the b hole and stops next to B.
  assert.equal(state[0], 3);
});

test('pieces stack against each other, leading piece first', () => {
  const l = parseLevel(['AS..', 'a...']);
  const { state } = tilt(l, l.start, 'right');
  assert.deepEqual(state, [2, 3]);
});

test('a sinking leading marble frees the way for the one behind', () => {
  const l = parseLevel(['BA.a.', 'b....']);
  const { state } = tilt(l, l.start, 'right');
  assert.equal(state[1], -1); // A sank
  assert.equal(state[0], 4); // B rolled through to the wall
});

test('walls stop pieces', () => {
  const l = parseLevel(['A.#.', 'a...']);
  assert.equal(tilt(l, l.start, 'right').state[0], 1);
});

test('stones never sink', () => {
  const l = parseLevel(['S.a.A', '.....']);
  const { state } = tilt(l, l.start, 'right');
  assert.equal(state[0], 3);
});

test('solver finds optimal solutions', () => {
  const l = parseLevel(['a....', '.....', '..#..', '.....', '....A']);
  assert.equal(l.par, 2);
  // Replaying the solution solves the level.
  let s = l.start;
  for (const d of l.solution) s = tilt(l, s, d).state;
  assert.ok(isSolved(l, s));
});

test('tutorial levels are short and solvable', () => {
  for (const { level } of TUTORIAL) assert.ok(level.par >= 1 && level.par <= 2);
});

test('generation is deterministic', () => {
  const a = generate('seed-x', DIFFICULTIES.medium);
  const b = generate('seed-x', DIFFICULTIES.medium);
  assert.deepEqual([...a.walls], [...b.walls]);
  assert.deepEqual(a.start, b.start);
  assert.equal(a.par, b.par);
});

test('60 days of daily puzzles are valid, within par range and replayable', () => {
  let key = '2026-11-01';
  for (let i = 0; i < 60; i++) {
    for (const diff of DAILY_ORDER) {
      const l = dailyLevel(key, diff);
      const [lo, hi] = DIFFICULTIES[diff].par;
      assert.ok(l.par >= lo && l.par <= hi, `${key} ${diff} par ${l.par}`);
      let s = l.start;
      for (const d of l.solution) s = tilt(l, s, d).state;
      assert.ok(isSolved(l, s), `${key} ${diff} solution replays`);
    }
    key = addDays(key, 1);
  }
});

test('endless levels generate across the difficulty ramp', () => {
  for (const n of [1, 2, 4, 9, 16, 26, 41, 60]) {
    const l = generate(`marbl:endless:${n}`, endlessParams(n));
    assert.ok(l.par >= 1);
  }
});

test('date helpers', () => {
  assert.equal(puzzleNumber('2026-11-01'), 1);
  assert.equal(puzzleNumber('2027-11-01'), 366);
  assert.equal(dayDiff('2027-03-27', '2027-03-29'), 2); // across a DST change
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('star rating', () => {
  assert.equal(starsFor(5, 5), 3);
  assert.equal(starsFor(4, 5), 3);
  assert.equal(starsFor(7, 5), 2);
  assert.equal(starsFor(12, 5), 1);
  assert.equal(starsFor(14, 11), 2);
  assert.equal(starsFor(15, 11), 2);
  assert.equal(starsFor(16, 11), 1);
});

import { adventureLevel, generateAdventureLevel, PRECOMPUTED_LEVELS, tierFor, levelReward, isBoss, LEVELS_PER_WORLD } from '../js/levels.js';
import { encodeLevel } from '../js/engine.js';

test('all pre-computed adventure levels replay to a win, and their par is optimal', () => {
  assert.ok(PRECOMPUTED_LEVELS >= 160, 'at least 8 worlds are pre-computed');
  for (let n = 1; n <= PRECOMPUTED_LEVELS; n++) {
    const l = adventureLevel(n);
    let s = l.start;
    for (const d of l.solution) s = tilt(l, s, d).state;
    assert.ok(isSolved(l, s), `level ${n} solution replays`);
    assert.equal(l.solution.length, l.par, `level ${n} par matches its solution`);
    if (n % 7 === 0 || n <= 25) assert.equal(solve(l).par, l.par, `level ${n} par is optimal`);
  }
});

test('pre-computed data matches the generator (no drift)', () => {
  for (const n of [1, 2, 21, 22, 41, 61, 80, 120]) {
    const a = adventureLevel(n);
    const b = generateAdventureLevel(n);
    assert.equal(a.par, b.par, `level ${n}`);
    assert.deepEqual(encodeLevel(a).join('/').length, encodeLevel(b).join('/').length);
  }
});

test('sand stops pieces', () => {
  const l = parseLevel(['.....', '..a..', '.....', 'A.~..', '.....']);
  assert.equal(tilt(l, l.start, 'right').state[0], 17);
  assert.equal(l.par, 2);
});

test('crystal gates only let their own colour through', () => {
  const l = parseLevel(['A.v.a', 'B.v.b', '.....']);
  const { state } = tilt(l, l.start, 'right');
  const ia = l.pieces.findIndex((p) => p.color === 0);
  const ib = l.pieces.findIndex((p) => p.color === 1);
  assert.equal(state[ia], -1, 'coral marble passes the coral gate and sinks');
  assert.equal(state[ib], 6, 'teal marble is stopped by the coral gate');
});

test('portals teleport and keep the momentum (one teleport per tilt)', () => {
  const l = parseLevel(['A.@..', '#####', '..@.a']);
  const { state, moves } = tilt(l, l.start, 'right');
  assert.equal(state[0], -1);
  assert.equal(moves[0].segs.length, 2);
});

test('difficulty follows a sawtooth and bosses are harder', () => {
  assert.equal(tierFor(1), 0);
  assert.ok(tierFor(20) > tierFor(19));
  assert.ok(tierFor(21) < tierFor(20)); // new world starts easier than the boss
  assert.ok(isBoss(LEVELS_PER_WORLD) && !isBoss(LEVELS_PER_WORLD + 1));
});

test('coins are only paid for new stars', () => {
  assert.equal(levelReward(0, 3), 23);
  assert.equal(levelReward(1, 3), 12);
  assert.equal(levelReward(3, 3), 0);
  assert.equal(levelReward(3, 1), 0);
});

import { rollChest } from '../js/chests.js';

test('chest rewards respect their tier', () => {
  for (let i = 0; i < 200; i++) {
    const w = rollChest('wood');
    assert.ok(w.coins >= 25 && w.coins <= 40 && w.hint + w.rewind === 1);
    const g = rollChest('gold');
    assert.ok(g.coins >= 120 && g.hint === 2 && g.rewind === 2);
    assert.ok(g.skin || g.dupe, 'gold always gives a skin (or coins once the collection is complete)');
    if (g.skin) assert.notEqual(g.skin.rarity, 'common');
  }
});

import { track, xpNeeded, quests, claimQuest, checkAchievements, claimAchievement } from '../js/progress.js';
import { store } from '../js/storage.js';

test('XP levels the player up and drops a chest in the inbox', () => {
  store.reset();
  const need = xpNeeded(1);
  let ups = [];
  for (let i = 0; i < 10 && !ups.length; i++) ups = track('levelWin', { stars: 3, first: true, newStars: 3, usedBooster: false }).ups;
  assert.deepEqual(ups, [2]);
  assert.ok(store.data.player.xp < xpNeeded(2));
  assert.equal(store.data.inbox[0].id, 'lvl-2');
  assert.ok(need > 0);
});

test('daily quests are deterministic per day and can be claimed once complete', () => {
  store.reset();
  const a = JSON.stringify(quests('2026-12-01').list.map((q) => q.id));
  store.data.quests.day = null;
  const b = JSON.stringify(quests('2026-12-01').list.map((q) => q.id));
  assert.equal(a, b);
  assert.equal(new Set(JSON.parse(a)).size, 3, 'three different quests');
  const q = quests('2026-12-01').list[0];
  assert.equal(claimQuest(0, '2026-12-01'), null, 'not claimable before completion');
  q.progress = q.target;
  const coins = store.data.coins;
  assert.ok(claimQuest(0, '2026-12-01').coins > 0);
  assert.ok(store.data.coins > coins);
  assert.equal(claimQuest(0, '2026-12-01'), null, 'only once');
});

test('achievements unlock from stats and pay out once', () => {
  store.reset();
  track('levelWin', { stars: 1, first: true, newStars: 1, usedBooster: true });
  assert.equal(store.data.ach.firstWin, 'ready');
  assert.ok(claimAchievement('firstWin').coins > 0);
  assert.equal(claimAchievement('firstWin'), null);
  assert.equal(checkAchievements().length, 0);
});

import { SKINS, pickSkin, grantSkin, setSkins } from '../js/skins.js';

test('collection: 53 unique marbles, every world series has 4 droppables + 1 legendary', () => {
  assert.equal(new Set(SKINS.map((s) => s.id)).size, SKINS.length);
  assert.ok(SKINS.length >= 50);
  for (let w = 0; w < 8; w++) {
    const set = SK.setSkins(`w${w}`);
    assert.equal(set.length, 5);
    assert.equal(set.filter((s) => s.rarity === 'legendary').length, 1);
  }
});

test('world chests drop that world\'s marbles; completing a series grants its legendary', () => {
  store.reset();
  store.data.levels.unlocked = 70; // worlds 1-4 reached
  const s = pickSkin(['common', 'rare', 'epic'], 2);
  assert.equal(s.set, 'w2');
  assert.equal(pickSkin(['common'], null) && pickSkin(['common'], null).set === 'w7', false, 'unreached worlds never drop');
  const coins = store.data.coins;
  for (const sk of setSkins('w2').filter((x) => x.rarity !== 'legendary')) grantSkin(sk.id);
  assert.ok(store.data.skins.owned.includes('w2-legend'));
  assert.ok(store.data.coins > coins);
});

import { normalize, exportProgress, importProgress, computeStats } from '../js/storage.js';

test('save data: corrupted/partial saves are repaired, never crash', () => {
  const a = normalize({ coins: 'lots', levels: { unlocked: -4 }, skins: { owned: ['w0-sand'], equipped: 'nope' }, inbox: 5 });
  assert.equal(a.coins, 100);
  assert.equal(a.levels.unlocked, 1);
  assert.ok(a.skins.owned.includes('classic'));
  assert.equal(a.skins.equipped, 'classic');
  assert.deepEqual(a.inbox, []);
  assert.equal(normalize(null).coins, 100);
});

test('save data: export / import round-trip', () => {
  store.reset();
  store.data.coins = 4321;
  store.data.levels.unlocked = 77;
  const code = exportProgress();
  assert.match(code, /^MARBL1\./);
  store.reset();
  assert.equal(importProgress('garbage'), false);
  assert.equal(importProgress(code), true);
  assert.equal(store.data.coins, 4321);
  assert.equal(store.data.levels.unlocked, 77);
});

test('pits: a marble falling in makes the state dead and the solver avoids it', () => {
  const l = parseLevel(['A.O.a', '.....', '..#..', '.....', '.....']);
  const { state } = tilt(l, l.start, 'right');
  assert.equal(state[0], -3);
  assert.ok(!l.solution.includes('right') || l.solution[0] !== 'right');
  let s = l.start;
  for (const d of l.solution) s = tilt(l, s, d).state;
  assert.ok(isSolved(l, s));
});

test('shaped boards: outside cells block like walls and survive encoding', () => {
  const l = parseLevel(['_A..a', '.....', 'S.O..']);
  assert.equal(encodeLevel(l).join('/'), '_A..a/...../S.O..');
  assert.deepEqual(tilt(l, l.start, 'right').state, [-1, -1]);
});

import { season, TIER_SP, LEVEL_SP_PER_DAY } from '../js/progress.js';

test('grinding levels cannot rush the season pass: level points are capped per day', () => {
  store.reset();
  const sp0 = season().sp;
  for (let i = 0; i < 40; i++) track('levelWin', { stars: 3, first: true, newStars: 3, usedBooster: false });
  const fromLevels = season().sp - sp0;
  assert.equal(fromLevels, LEVEL_SP_PER_DAY);
  // Daily puzzles still count on top of the cap.
  track('dailyWin', { stars: 3 });
  assert.equal(season().sp - sp0, LEVEL_SP_PER_DAY + 4);
  assert.ok(season().tier <= Math.ceil((LEVEL_SP_PER_DAY + 4) / TIER_SP));
});

test('every world breathes: it starts easier than the previous boss and is not stuck at max', () => {
  for (let w = 1; w < 16; w++) {
    const first = w * LEVELS_PER_WORLD + 2; // +2: skip a possible hand-made mechanic intro
    assert.ok(tierFor(first) < tierFor(w * LEVELS_PER_WORLD), `world ${w + 1} starts easier`);
    let run = 0;
    let maxRun = 0;
    for (let i = 1; i <= LEVELS_PER_WORLD; i++) {
      run = tierFor(w * LEVELS_PER_WORLD + i) === 9 ? run + 1 : 0;
      maxRun = Math.max(maxRun, run);
    }
    assert.ok(maxRun <= 5, `world ${w + 1}: ${maxRun} levels in a row at max tier`);
  }
});

import * as SK from '../js/skins.js';
const { pickSkin: pick2, grantSkin: grant } = SK;

test('every world has its own marble series with one legendary reward', () => {
  for (let w = 0; w < 16; w++) {
    const set = SK.setSkins(`w${w}`);
    assert.equal(set.length, 5, `world ${w + 1}`);
    assert.equal(set.filter((s) => s.rarity === 'legendary').length, 1);
  }
  assert.equal(new Set(SK.SKINS.map((s) => s.id)).size, SK.SKINS.length, 'unique ids');
});

test('late worlds drop their own series and completing it grants the legendary', () => {
  store.reset();
  store.data.levels.unlocked = 250; // world 13
  const s = pick2(['common'], 12);
  assert.equal(s.set, 'w12');
  const coins = store.data.coins;
  for (const x of SK.setSkins('w12')) if (x.rarity !== 'legendary') grant(x.id);
  assert.ok(store.data.skins.owned.includes('w12-legend'));
  assert.equal(store.data.coins, coins + 300);
});

import { readFileSync } from 'node:fs';

test('every language has every text, with the same {placeholders}', () => {
  const src = readFileSync(new URL('../js/i18n.js', import.meta.url), 'utf8');
  const S = new Function(`${src.slice(0, src.indexOf('// Language:')).replace('const STRINGS', 'var STRINGS')}; return STRINGS;`)();
  const ph = (v) => (v.match(/\{\w+\}/g) || []).sort().join();
  for (const lang of Object.keys(S)) {
    for (const k of Object.keys(S.en)) {
      assert.ok(k in S[lang], `${lang} is missing "${k}"`);
      assert.equal(ph(S[lang][k]), ph(S.en[k]), `${lang}.${k} placeholders`);
    }
  }
  assert.deepEqual(Object.keys(S).sort(), ['en', 'es', 'fr']);
});

test('streak freezes bridge missed days without adding to the streak', () => {
  store.reset();
  const done = (k) => ['easy', 'medium', 'hard'].forEach((d) => store.setDailyEntry(k, d, { done: true, moves: 3, stars: 3 }));
  ['2026-11-08', '2026-11-09', '2026-11-10'].forEach(done);
  // Missed the 11th and the 12th; one freeze is not enough for two days.
  assert.equal(store.booster('freeze'), 1);
  assert.equal(store.useStreakFreezes('2026-11-13'), 0);
  store.booster('freeze', 1);
  assert.equal(store.useStreakFreezes('2026-11-13'), 2);
  assert.equal(computeStats('2026-11-13').current, 3, 'frozen days keep the run but do not count');
  assert.equal(store.booster('freeze'), 0);
  done('2026-11-13');
  assert.equal(computeStats('2026-11-13').current, 4);
});

import { perfectRunBonus } from '../js/levels.js';
test('perfect run bonuses at 3, 5, 10, 15...', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 9, 10, 12, 15].map(perfectRunBonus), [0, 0, 15, 0, 30, 0, 60, 0, 60]);
});
