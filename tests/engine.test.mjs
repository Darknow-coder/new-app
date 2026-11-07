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

import { adventureLevel, tierFor, levelReward, isBoss, LEVELS_PER_WORLD } from '../js/levels.js';

test('all 160 adventure levels (8 worlds) are solvable and replay correctly', () => {
  for (let n = 1; n <= 160; n++) {
    const l = adventureLevel(n);
    let s = l.start;
    for (const d of l.solution) s = tilt(l, s, d).state;
    assert.ok(isSolved(l, s), `level ${n}`);
  }
});

test('difficulty follows a sawtooth and bosses are harder', () => {
  assert.equal(tierFor(1), 0);
  assert.ok(tierFor(20) > tierFor(19));
  assert.ok(tierFor(21) < tierFor(20)); // new world starts easier than the boss
  assert.ok(isBoss(LEVELS_PER_WORLD) && !isBoss(LEVELS_PER_WORLD + 1));
});

test('coins are only paid for new stars', () => {
  assert.equal(levelReward(0, 3), 35);
  assert.equal(levelReward(1, 3), 20);
  assert.equal(levelReward(3, 3), 0);
  assert.equal(levelReward(3, 1), 0);
});

import { rollChest } from '../js/chests.js';

test('chest rewards respect their tier', () => {
  for (let i = 0; i < 200; i++) {
    const w = rollChest('wood');
    assert.ok(w.coins >= 40 && w.coins <= 60 && w.hint + w.rewind === 1);
    const g = rollChest('gold');
    assert.ok(g.coins >= 180 && g.hint === 2 && g.rewind === 2);
    assert.ok(g.skin || g.dupe, 'gold always gives a skin (or coins once the collection is complete)');
    if (g.skin) assert.notEqual(g.skin.rarity, 'common');
  }
});
