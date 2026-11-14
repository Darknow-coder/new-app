// Weekly event: every week yields 7 playable stages on its theme, the same for everyone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_STAGES, disguise, eventStages, mechanicsIn, msUntilNextWeek, themeOf, weekOf } from '../js/event.js';
import { isSolved, mulberry32, tilt } from '../js/engine.js';
import { LEVEL_DATA } from '../js/levels-data.js';

const replays = (l) => {
  let s = l.start;
  for (const d of l.solution) s = tilt(l, s, d).state;
  return isSolved(l, s);
};

test('weeks start on Monday and count from the event epoch', () => {
  assert.equal(weekOf('2026-11-02'), 0);
  assert.equal(weekOf('2026-11-08'), 0);
  assert.equal(weekOf('2026-11-09'), 1);
  assert.ok(msUntilNextWeek('2026-11-14', new Date(2026, 10, 14, 12)) > 0);
});

test('a disguised level still plays (turned, mirrored, recoloured)', () => {
  for (let i = 0; i < 320; i += 7) {
    const l = disguise(LEVEL_DATA[i], mulberry32(i + 1));
    assert.ok(replays(l), `level ${i + 1}`);
  }
});

test('every week of the theme cycle gives 7 solvable stages, deterministically', async () => {
  for (let w = 0; w < 9; w++) {
    const stages = await eventStages(w, 120);
    assert.equal(stages.length, EVENT_STAGES);
    const th = themeOf(w).id;
    let themed = 0;
    for (const l of stages) {
      assert.ok(replays(l), `week ${w}`);
      const m = mechanicsIn(l);
      if (th === 'mix' ? m.length >= 2 : m.includes(th)) themed++;
    }
    assert.ok(themed >= 5, `week ${w} (${th}): only ${themed} themed stages`);
  }
  const a = (await eventStages(4, 120)).map((l) => l.solution.join(''));
  const b = (await eventStages(4, 120)).map((l) => l.solution.join(''));
  assert.deepEqual(a, b);
});
