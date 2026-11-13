// The adventure map scenery is baked into standalone SVG pictures: every world must
// produce well-formed markup whose references all resolve, at any phone width.
import test from 'node:test';
import assert from 'node:assert/strict';
import { worldScene } from '../js/map.js';
import { defsFor } from '../js/map-kit.js';

function sceneFor(w, W, locked = false) {
  const H = 20 * 92 + 90;
  const top = 150;
  const road = [[W / 2, -top]];
  const stations = [];
  for (let i = 0; i < 20; i++) {
    const n = w * 20 + i + 1;
    const x = ((50 + 30 * Math.sin(n * 0.8)) / 100) * W;
    const y = i * 92 + 50;
    road.push([x, y]);
    stations.push([x, y, i === 19]);
  }
  road.push([W / 2, H]);
  const avoid = [
    [0.2 * W, 6 * 92 + 96, 44],
    [0.8 * W, 13 * 92 + 96, 44],
    [W / 2, 20 * 92 + 30, 44],
  ];
  const { svg, sprites } = worldScene({ w, W, H, top, road, avoid, stations, last: w === 16, locked });
  return { doc: `<svg xmlns="http://www.w3.org/2000/svg">${defsFor(svg)}${svg}</svg>`, sprites };
}

/** Minimal XML well-formedness check: balanced tags, no repeated attribute, no NaN. */
function checkXML(doc) {
  const stack = [];
  const tag = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = tag.exec(doc))) {
    const [, close, name, attrs, self] = m;
    if (close) {
      assert.equal(stack.pop(), name, `unbalanced </${name}>`);
      continue;
    }
    const names = [...attrs.matchAll(/\s([\w:-]+)=/g)].map((a) => a[1]);
    assert.equal(new Set(names).size, names.length, `repeated attribute in <${name}${attrs.slice(0, 80)}>`);
    if (!self) stack.push(name);
  }
  assert.equal(stack.length, 0, 'unclosed tags');
  assert.ok(!/NaN|undefined|Infinity/.test(doc), 'bad number in the markup');
}

test('every world bakes into well-formed SVG with resolved references', () => {
  for (const W of [320, 390, 560]) {
    for (let w = 0; w < 17; w++) {
      const { doc, sprites } = sceneFor(w, W, w === 16);
      checkXML(doc);
      const ids = new Set([...doc.matchAll(/\sid="([\w-]+)"/g)].map((x) => x[1]));
      for (const [, ref] of doc.matchAll(/(?:url\(#|href="#)([\w-]+)/g)) assert.ok(ids.has(ref), `world ${w}: missing #${ref}`);
      assert.ok(sprites.length <= 6, 'too many live sprites');
      assert.ok(doc.length < 260000, `world ${w} scenery too heavy (${doc.length} bytes)`);
    }
  }
});

test('scenery is deterministic (same world, same picture)', () => {
  assert.equal(sceneFor(3, 390).doc, sceneFor(3, 390).doc);
});
