// Adventure map artwork. Each world is a painted scene built at runtime in SVG:
// ground lighting and textures, large terrain features that hug the road, a road made of
// the world's own material, platforms under every level, depth-sorted illustrated props,
// foreground framing, atmosphere, and mist bands that stitch one world to the next.
// Cheap to render: gradients instead of filters, props reused through <use>, many small
// marks merged into single paths, and only a handful of (lite-mode aware) animations.
import { ao, between, blob, closedD, dark, def, defsFor, ellD, f, flushDefs, glow, light, lin, mix, offsetD, pick, polyD, rad, rng, roadD, sampleRoad, shade } from './map-kit.js';
import { C, E, L, P, PROP_CLIPS, PROPS1, R as RECT, ST, bloom, crown, crystal, hshade, op, rock, tuft } from './map-props.js';
import { PROPS2 } from './map-props2.js';
import { WORLD_ART } from './map-worlds.js';

export { roadD };

const PROPS = { ...PROPS1, ...PROPS2 };
const art = (w) => WORLD_ART[w % WORLD_ART.length];

/** Colours the map view needs for each world (section background, legacy road var). */
export const MAP_THEMES = WORLD_ART.map((a) => ({ g0: a.g0, g1: a.g1, road: a.path.base }));

// Clip paths some props use (registered up front so every baked picture can include them).
def('umbclip', PROP_CLIPS);

export function ensureMapDefs() {
  flushDefs();
}

/** Ambient particle kind of a world (rendered as cheap composited HTML). */
export const worldFx = (w) => art(w).fx;

/** Small emblem of a world (banner badge). */
export function worldEmblem(w) {
  const a = art(w);
  const e = a.emblem;
  const id = def(`em-${w % WORLD_ART.length}`, `<symbol id="em-${w % WORLD_ART.length}" viewBox="-24 -26 48 48"><g transform="translate(${e.x} ${e.y}) scale(${e.s})">${PROPS[e.k].draw(a.pal)}</g></symbol>`);
  flushDefs();
  return `<svg class="wh-emblem" viewBox="0 0 48 48" aria-hidden="true"><use href="#${id}" width="48" height="48"/></svg>`;
}

/* ---------------------------------------------------------------------------------- */
/* scene context: road geometry, free-space queries, layers                            */
/* ---------------------------------------------------------------------------------- */
function context(o) {
  const { w, W, H, top, road, avoid, stations } = o;
  const A = art(w);
  const S = sampleRoad(road, 6);
  const SY = S.slice().sort((a, b) => a.y - b.y);
  const ys = SY.map((p) => p.y);
  const lower = (y) => {
    let lo = 0;
    let hi = ys.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (ys[m] < y) lo = m + 1;
      else hi = m;
    }
    return lo;
  };
  const c = {
    w,
    A,
    p: A.pal,
    W,
    H,
    top,
    y0: -top,
    S,
    hw: A.path.w / 2,
    avoid,
    stations,
    R: rng(`map:v4:${w}`),
    water: [], // predicates (x, y) → true when (x, y) is water
    solid: [], // predicates (x, y) → true when land props must not go there
    placed: [], // [x, y, r]
    items: [], // { y, svg } depth-sorted props
    sprites: [], // animated props drawn live on top of the baked scene
    layers: { under: [], ground: [], marks: [], road: [], deco: [], pads: [], over: [], fg: [], air: [] },
  };
  /** Distance from (x, y) to the road centre line. */
  c.rd = (x, y, reach = 140) => {
    let best = 1e9;
    for (let i = lower(y - reach); i < SY.length && SY[i].y <= y + reach; i++) {
      const d = Math.hypot(SY[i].x - x, SY[i].y - y);
      if (d < best) best = d;
    }
    return best;
  };
  /** Road centre x at height y. */
  c.rx = (y) => {
    const i = Math.min(SY.length - 1, Math.max(1, lower(y)));
    const a = SY[i - 1];
    const b = SY[i];
    const t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y);
    return a.x + (b.x - a.x) * Math.max(0, Math.min(1, t));
  };
  c.isWater = (x, y) => c.water.some((fn) => fn(x, y));
  c.isSolid = (x, y) => c.solid.some((fn) => fn(x, y));
  /** Room left around (x, y) for something of radius r (negative = collision). */
  c.room = (x, y, r, gap = 0) => {
    let m = c.rd(x, y) - c.hw - r - 14;
    for (const [ax, ay, ar] of avoid) m = Math.min(m, Math.hypot(x - ax, y - ay) - ar - r);
    for (const [sx, sy] of stations) m = Math.min(m, Math.hypot(x - sx, y - sy) - 36 - r);
    for (const [px, py, pr] of c.placed) m = Math.min(m, Math.hypot(x - px, (y - py) * 1.3) - pr * (1 - gap) - r * (1 - gap));
    return m;
  };
  return c;
}

/** Place a prop instance (depth-sorted later). */
function put(c, kind, x, y, s = 1, opt = {}) {
  const d = PROPS[kind];
  if (!d) return;
  const key = `mp-${kind}-${c.w % WORLD_ART.length}`;
  def(key, `<g id="${key}">${d.draw(c.p)}</g>`);
  const flip = opt.flip ?? (c.R() < 0.5 ? -1 : 1);
  const r = d.r * s;
  let sh = '';
  if (d.water) sh = `<ellipse cx="${f(x)}" cy="${f(y - 1)}" rx="${f(r * 1.15)}" ry="${f(r * 0.28)}" fill="none" stroke="#ffffff" stroke-width="1.6" opacity=".45"/>`;
  else if (d.air) sh = ao(x + r * 0.2, y + 10, r * 0.8, r * 0.22, c.A.shadow, 0.22);
  else if (c.A.longShadow && !d.flat) sh = ao(x + r * 1.1, y + 1, r * 2.1, Math.max(4, r * 0.3), c.A.shadow, 0.38);
  else if (!d.flat) sh = ao(x + r * 0.22, y + 1, r * 1.1, Math.max(4, r * 0.34), c.A.shadow, 0.42);
  else sh = ao(x + 1, y + 1, r * 0.95, r * 0.3, c.A.shadow, 0.25);
  const sx = f(s * flip * 100) / 100;
  const sy = f(s * 100) / 100;
  // A few animated props per world live outside the baked picture (moved by the compositor).
  if (!opt.still && d.anim && c.sprites.length < 6) {
    c.sprites.push({ key, x: f(x), y: f(y), sx, sy, anim: d.anim, delay: f(-c.R() * 4) });
    c.items.push({ y: y + (opt.z || 0), svg: sh });
  } else {
    c.items.push({ y: y + (opt.z || 0), svg: `${sh}<use href="#${key}" transform="translate(${f(x)} ${f(y)}) scale(${sx} ${sy})"/>` });
  }
  c.placed.push([x, y - d.h * 0.25 * s, r * (opt.tight ? 0.6 : 0.85)]);
}

/** Try to place a prop near (x, y); returns true when placed. */
function tryPut(c, kind, x, y, s, gap = 0, opt = {}) {
  const d = PROPS[kind];
  if (!d) return false;
  const r = d.r * s;
  if (x < -r * 0.25 || x > c.W + r * 0.25 || y > c.H - 4 || y < c.y0 + 30) return false;
  const water = !!d.water;
  if (water !== c.isWater(x, y) || water !== c.isWater(x - r * 0.7, y) || water !== c.isWater(x + r * 0.7, y)) return false;
  if (!water && (c.isSolid(x, y) || c.isSolid(x - r * 0.6, y) || c.isSolid(x + r * 0.6, y))) return false;
  if (c.room(x, y - d.h * 0.25 * s, r * 0.85, gap) < 0) return false;
  // tall things must not hide the road behind them
  if (d.h * s > 40 && c.rd(x, y - d.h * 0.7 * s) < c.hw + r * 0.5) return false;
  put(c, kind, x, y, s, opt);
  return true;
}

const bag = (list) => list.flatMap(([k, n]) => Array(n).fill(k));

function populate(c) {
  const { A, R, W, H } = c;
  const mixx = A.props;
  // 1. Landmarks: one every ~420 px, each kind at most twice, never twice in a row.
  const marks = (mixx.landmarks || []).map((m) => (Array.isArray(m) ? m : [m, 1]));
  if (marks.length) {
    const n = Math.min(marks.length * 2, Math.max(2, Math.round((H + c.top) / 430)));
    for (let b = 0; b < n; b++) {
      const [kind, ks] = marks[b % marks.length];
      const d = PROPS[kind];
      let best = null;
      for (let t = 0; t < 90; t++) {
        const y = c.y0 + 90 + ((b + R()) / n) * (H + c.top - 130);
        const x = between(R, d.r * 0.7 * ks, W - d.r * 0.7 * ks);
        const water = !!d.water;
        if (water !== c.isWater(x, y)) continue;
        if (!water && (c.isSolid(x, y) || c.isSolid(x - d.r * 0.7 * ks, y) || c.isSolid(x + d.r * 0.7 * ks, y))) continue;
        const room = c.room(x, y - d.h * 0.3 * ks, d.r * ks);
        if (room > 0 && (!best || room > best.room)) best = { x, y, room };
      }
      if (best) put(c, kind, best.x, best.y, ks * Math.min(1.12, 0.95 + best.room / 220), { flip: R() < 0.5 ? -1 : 1 });
    }
  }
  // 2. Clusters of the world's signature vegetation / objects.
  const cl = bag(mixx.cluster || []);
  if (cl.length) {
    const count = Math.round(((H + c.top) / 1000) * (mixx.clusters || 7));
    for (let i = 0; i < count * 3 && i < 80; i++) {
      const cx = between(R, -10, W + 10);
      const cy = between(R, c.y0 + 60, H - 20);
      if (c.room(cx, cy, 26) < 0) continue;
      const kind = pick(R, cl);
      const m = 2 + Math.floor(R() * 4);
      let got = 0;
      for (let k = 0; k < m * 3 && got < m; k++) {
        const a = R() * Math.PI * 2;
        const dist = k ? 14 + R() * 30 : 0;
        if (tryPut(c, kind, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist * 0.6, between(R, 0.75, 1.15), 0.35, { tight: 1 })) got++;
      }
    }
  }
  // 3. Water props.
  const wa = bag(mixx.water || []);
  if (wa.length) for (let i = 0; i < 70; i++) tryPut(c, pick(R, wa), between(R, 0, W), between(R, c.y0 + 40, H - 10), between(R, 0.8, 1.1));
  // 4. Scattered smaller things.
  const sc = bag(mixx.scatter || []);
  if (sc.length) {
    const count = Math.round(((H + c.top) / 1000) * (mixx.density || 26));
    let got = 0;
    for (let i = 0; i < count * 4 && got < count; i++) {
      if (tryPut(c, pick(R, sc), between(R, 4, W - 4), between(R, c.y0 + 40, H - 8), between(R, 0.8, 1.15), 0.1)) got++;
    }
  }
}

/* ---------------------------------------------------------------------------------- */
/* ground: soft patches, marks (ripples, tufts, cracks...), light                      */
/* ---------------------------------------------------------------------------------- */
export function patches(c, colors, n = 8, size = [70, 150], alpha = 0.5) {
  const { R, W } = c;
  let s = '';
  for (let i = 0; i < n; i++) {
    const col = colors[i % colors.length];
    const x = between(R, -40, W + 40);
    const y = between(R, c.y0, c.H);
    const r = between(R, size[0], size[1]);
    s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * 0.62)}" fill="${rad([[0, col, 1], [0.6, col, 0.55], [1, col, 0]])}" opacity="${alpha}"/>`;
  }
  c.layers.ground.push(s);
}

/** Many tiny marks merged into one path. kind: dot | tuft | ripple | crack | sparkle | pebble | leaf | dash | star */
export function marks(c, kind, color, n, o = {}) {
  const { R, W } = c;
  let d = '';
  const width = o.w ?? (kind === 'dot' ? 3 : 1.6);
  for (let i = 0; i < n; i++) {
    const x = between(R, 0, W);
    const y = between(R, c.y0, c.H);
    if (!o.onRoad && c.rd(x, y) < c.hw + 6) continue;
    if (o.where && !o.where(x, y)) continue;
    const s = o.s ? between(R, o.s[0], o.s[1]) : 1;
    if (kind === 'dot') d += `M${f(x)} ${f(y)}h.1`;
    else if (kind === 'dash') d += `M${f(x)} ${f(y)}h${f(5 * s)}`;
    else if (kind === 'tuft') d += `M${f(x - 3 * s)} ${f(y)}q1 -4 -1 -7M${f(x)} ${f(y)}q0 -6 1 -9M${f(x + 3 * s)} ${f(y)}q0 -4 3 -6`;
    else if (kind === 'ripple') d += `M${f(x - 9 * s)} ${f(y)}q${f(4.5 * s)} ${f(-3 * s)} ${f(9 * s)} 0t${f(9 * s)} 0`;
    else if (kind === 'crack') d += `M${f(x)} ${f(y)}l${f(5 * s)} ${f(2 * s)}l${f(3 * s)} ${f(-3 * s)}l${f(6 * s)} ${f(1 * s)}m${f(-6 * s)} ${f(-1 * s)}l${f(1 * s)} ${f(-5 * s)}`;
    else if (kind === 'sparkle') d += `M${f(x - 3 * s)} ${f(y)}h${f(6 * s)}M${f(x)} ${f(y - 3 * s)}v${f(6 * s)}`;
    else if (kind === 'pebble') d += ellD(x, y, 2.6 * s, 1.7 * s);
    else if (kind === 'leaf') d += `M${f(x)} ${f(y)}q${f(3 * s)} ${f(-4 * s)} ${f(7 * s)} ${f(-1 * s)}q${f(-3 * s)} ${f(4 * s)} ${f(-7 * s)} ${f(1 * s)}`;
    else if (kind === 'star') d += `M${f(x)} ${f(y - 3.4 * s)}l${f(0.9 * s)} ${f(2.5 * s)}l${f(2.5 * s)} ${f(0.9 * s)}l${f(-2.5 * s)} ${f(0.9 * s)}l${f(-0.9 * s)} ${f(2.5 * s)}l${f(-0.9 * s)} ${f(-2.5 * s)}l${f(-2.5 * s)} ${f(-0.9 * s)}l${f(2.5 * s)} ${f(-0.9 * s)}Z`;
  }
  if (!d) return;
  const fillKinds = { pebble: 1, leaf: 1, star: 1 };
  c.layers[o.layer || 'marks'].push(
    fillKinds[kind]
      ? `<path d="${d}" fill="${color}"${o.a ? ` opacity="${o.a}"` : ''}/>`
      : `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${o.a ? ` opacity="${o.a}"` : ''}/>`,
  );
}

/** Coast along one side: the sea follows the road at a respectful distance. */
export function sea(c, side, o) {
  const { W, R } = c;
  const left = side === 'left';
  const base = o.base ?? W * 0.3;
  const ph = R() * 10;
  const coast = (y) => {
    const want = base + Math.sin(y / 140 + ph) * 26 + Math.sin(y / 53 + ph * 2) * 9;
    const rx = c.rx(y);
    let lim = left ? rx - c.hw - (o.gap ?? 34) : W - rx - c.hw - (o.gap ?? 34);
    for (const [ax, ay, ar] of c.avoid) {
      const dy = Math.abs(y - ay);
      if (dy < ar + 30 && (left ? ax < W / 2 : ax > W / 2)) lim = Math.min(lim, (left ? ax : W - ax) - Math.sqrt(Math.max(0, (ar + 30) ** 2 - dy * dy)));
    }
    return Math.max(o.min ?? 10, Math.min(want, lim));
  };
  // smooth the coast so it never jumps
  const pts = [];
  for (let y = c.y0 - 20; y <= c.H + 30; y += 14) pts.push([coast(y), y]);
  for (let k = 0; k < 3; k++) for (let i = 1; i < pts.length - 1; i++) pts[i][0] = Math.min(pts[i][0], (pts[i - 1][0] + pts[i][0] * 2 + pts[i + 1][0]) / 4);
  const X = (x) => (left ? x : W - x);
  const edge = pts.map(([x, y]) => [X(x), y]);
  const at = (y) => {
    const i = Math.max(0, Math.min(pts.length - 1, Math.round((y - (c.y0 - 20)) / 14)));
    return pts[i][0];
  };
  c.water.push((x, y) => (left ? x < at(y) - 4 : x > W - at(y) + 4));
  const far = left ? -30 : W + 30;
  const poly = (off) => polyD([[far, c.y0 - 20], ...pts.map(([x, y]) => [X(Math.max(0, x + off)), y]), [far, c.H + 30]], true);
  const g = c.layers.under;
  // wet sand, then water bands from shallow to deep
  g.push(`<path d="${poly(16)}" fill="${o.wet}" opacity=".55"/>`);
  g.push(`<path d="${poly(0)}" fill="${o.shallow}"/>`);
  g.push(`<path d="${poly(-14)}" fill="${lin(left ? [o.deep, o.mid] : [o.mid, o.deep], 0, 0, 1, 0)}"/>`);
  g.push(`<path d="${poly(-46)}" fill="${o.deep}" opacity=".55"/>`);
  // foam line along the shore, and a second fainter one
  g.push(`<path d="${polyD(edge)}" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-dasharray="26 7 12 9" opacity=".9"/>`);
  g.push(`<path d="${polyD(pts.map(([x, y]) => [X(Math.max(0, x - 9)), y + 4]))}" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-dasharray="14 18" opacity=".55"/>`);
  // wave glints
  let wv = '';
  for (let i = 0; i < 26; i++) {
    const y = between(R, c.y0, c.H);
    const cx = at(y);
    if (cx < 26) continue;
    const x = X(between(R, 6, cx - 16));
    wv += `M${f(x - 6)} ${f(y)}q3 -3 6 0t6 0`;
  }
  g.push(`<path d="${wv}" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity=".55"/>`);
  return { at, X };
}

/** A pond / lake with a shore and lily pads. */
export function pond(c, x, y, rx, ry, o) {
  const { R } = c;
  const d0 = blob(R, x, y, rx + 6, ry + 5, 10, 0.1);
  const d1 = blob(R, x, y, rx, ry, 10, 0.1);
  c.layers.under.push(`<path d="${d0}" fill="${o.shore}"/>`, `<path d="${d1}" fill="${lin([o.deep, o.water], 0, 0, 0.3, 1)}"/>`, `<ellipse cx="${f(x - rx * 0.3)}" cy="${f(y - ry * 0.35)}" rx="${f(rx * 0.35)}" ry="${f(ry * 0.14)}" fill="#ffffff" opacity=".35"/>`);
  if (o.lily) {
    for (let i = 0; i < 4; i++) {
      const a = R() * Math.PI * 2;
      const lx = x + Math.cos(a) * rx * 0.55;
      const ly = y + Math.sin(a) * ry * 0.5;
      c.layers.under.push(`<path d="M${f(lx)} ${f(ly)}m-6 0a6 3.4 0 1 0 12 0a6 3.4 0 1 0 -12 0" fill="${o.lily}"/>`);
      if (i % 2) c.layers.under.push(C(lx + 2, ly - 1.5, 1.8, '#ff9fc2'));
    }
  }
  c.water.push((px, py) => ((px - x) / rx) ** 2 + ((py - y) / ry) ** 2 < 1);
  c.placed.push([x, y, Math.max(rx, ry) * 0.9]);
}

/** Find the roomiest spot for a terrain feature of radius r (or null). */
export function roomiest(c, r, tries = 160, yr = null) {
  let best = null;
  for (let t = 0; t < tries; t++) {
    const y = yr ? between(c.R, yr[0], yr[1]) : between(c.R, c.y0 + 80, c.H - 60);
    const x = between(c.R, r * 0.6, c.W - r * 0.6);
    if (c.isWater(x, y)) continue;
    const room = c.room(x, y, r);
    if (!best || room > best.room) best = { x, y, room };
  }
  return best && best.room > 0 ? best : null;
}

/** A mass hugging one edge (forest canopy, cliffs, cave walls...). draw(d) gets the outline path. */
export function edgeMass(c, side, depth, gap, draw) {
  const { W, R } = c;
  const left = side === 'left';
  const ph = R() * 9;
  const pts = [];
  for (let y = c.y0 - 30; y <= c.H + 40; y += 16) {
    const rx = c.rx(y);
    let lim = (left ? rx : W - rx) - c.hw - gap;
    for (const [ax, ay, ar] of c.avoid) {
      const dy = Math.abs(y - ay);
      if (dy < ar + 26 && (left ? ax < W / 2 : ax > W / 2)) lim = Math.min(lim, (left ? ax : W - ax) - Math.sqrt(Math.max(0, (ar + 26) ** 2 - dy * dy)));
    }
    const want = depth + Math.sin(y / 90 + ph) * depth * 0.3 + Math.sin(y / 31 + ph) * 6;
    pts.push([Math.max(0, Math.min(want, lim)), y]);
  }
  for (let k = 0; k < 2; k++) for (let i = 1; i < pts.length - 1; i++) pts[i][0] = Math.min(pts[i][0], (pts[i - 1][0] + pts[i][0] * 2 + pts[i + 1][0]) / 4);
  const X = (x) => (left ? x : W - x);
  const at = (y) => pts[Math.max(0, Math.min(pts.length - 1, Math.round((y - (c.y0 - 30)) / 16)))][0];
  c.solid.push((x, y) => (left ? x < at(y) + 6 : x > W - at(y) - 6));
  draw({ pts, X, at, left });
  return at;
}

/** A wall of big props along one edge (forest, cotton-candy trees, pines...). */
export function edgeForest(c, side, kinds, o = {}) {
  const left = side === 'left';
  const at = edgeMass(c, side, o.depth ?? c.W * 0.12, o.gap ?? 20, ({ pts, X }) => {
    if (!o.under) return;
    const far = left ? -20 : c.W + 20;
    c.layers.ground.push(`<path d="${polyD([[far, c.y0 - 30], ...pts.map(([x, y]) => [X(Math.max(0, x - 4)), y]), [far, c.H + 40]], true)}" fill="${o.under}"/>`);
  });
  for (let y = c.y0 + 14; y < c.H + 40; y += o.step ?? 36) {
    const kind = pick(c.R, kinds);
    const d = PROPS[kind];
    const s = between(c.R, o.s?.[0] ?? 1.15, o.s?.[1] ?? 1.6);
    const r = d.r * s;
    const b = Math.min(at(y), at(y - d.h * s * 0.6), at(y - d.h * s * 0.3));
    if (b < r * 0.15) continue;
    const x = left ? b - r * 0.6 + between(c.R, -6, 3) : c.W - b + r * 0.6 + between(c.R, -3, 6);
    put(c, kind, x, y + between(c.R, -6, 6), s, { still: true, tight: 1 });
  }
  return at;
}

/** Two rows of mountains along one edge (back row darker), with snow caps. */
export function edgePeaks(c, side, col) {
  const { R } = c;
  return edgeMass(c, side, c.W * 0.15, 26, ({ pts, X, left }) => {
    const far = left ? -20 : c.W + 20;
    let back = '';
    let front = '';
    const peak = (x, y, w, h, body, shadow, snow) => {
      const tx = x + (left ? -w * 0.12 : w * 0.12);
      let s = `<path d="M${f(x - w)} ${f(y)}L${f(tx)} ${f(y - h)}L${f(x + w)} ${f(y)}Z" fill="${body}"/>`;
      s += `<path d="M${f(tx)} ${f(y - h)}L${f(x + w)} ${f(y)}H${f(tx + w * 0.15)}Q${f(tx + w * 0.05)} ${f(y - h * 0.4)} ${f(tx)} ${f(y - h)}Z" fill="${shadow}"/>`;
      s += `<path d="M${f(tx)} ${f(y - h)}L${f(tx - w * 0.36)} ${f(y - h * 0.62)}L${f(tx - w * 0.14)} ${f(y - h * 0.68)}L${f(tx + w * 0.02)} ${f(y - h * 0.58)}L${f(tx + w * 0.2)} ${f(y - h * 0.7)}L${f(tx + w * 0.34)} ${f(y - h * 0.64)}Z" fill="${snow}"/>`;
      return s;
    };
    for (let i = 0; i < pts.length; i += 5) {
      const [bx, y] = pts[i];
      const w = between(R, 46, 66);
      back += peak(X(Math.max(0, bx - 34)), y + 4, w, w * between(R, 1.25, 1.7), col.back, col.backShade, col.snow2);
    }
    for (let i = 2; i < pts.length; i += 4) {
      const [bx, y] = pts[i];
      const w = between(R, 26, 38);
      front += peak(X(Math.max(0, bx - 12)), y + 12, w, w * between(R, 1.1, 1.45), col.front, col.frontShade, col.snow);
    }
    const fill = polyD([[far, c.y0 - 30], ...pts.map(([x, y]) => [X(Math.max(0, x - 18)), y + 12]), [far, c.H + 40]], true);
    c.layers.ground.push(`<path d="${fill}" fill="${col.base}"/>` + back + front);
  });
}

/* ---------------------------------------------------------------------------------- */
/* road                                                                                */
/* ---------------------------------------------------------------------------------- */
function buildRoad(c, d) {
  const { A, S } = c;
  const r = A.path;
  const w = r.w;
  const out = [];
  const g = (s) => out.push(s);
  const stroke = (col, width, extra = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${f(width)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
  const flat = (col, width, dash, extra = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${f(width)}" stroke-dasharray="${dash}"${extra}/>`;
  const side = (off, col, width, extra = '') => `<path d="${offsetD(S, off)}" fill="none" stroke="${col}" stroke-width="${f(width)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
  // soft shadow, dark edge (bottom-right), lit rim (top-left), body
  g(stroke(A.shadow, w + 18, ` opacity=".16" transform="translate(4 8)"`));
  if (r.style !== 'rope') {
    g(stroke(r.edge, w + 7, ' transform="translate(1.2 2.4)"'));
    g(stroke(r.hi, w + 1, ' transform="translate(-1 -1.6)"'));
    g(stroke(r.base, w - 1));
  }
  const st = r.style;
  if (st === 'planks' || st === 'pier') {
    g(flat(r.a, w - 3, '9 1.8'));
    g(flat(r.b, w - 3, '1.8 9', ' opacity=".9"'));
    g(flat(dark(r.base, 0.12), w - 3, '10.8 32.4', ' opacity=".35"'));
    g(side(w / 2 - 4, r.b, 2, ' stroke-dasharray="0.1 10.8" opacity=".9"'));
    g(side(-w / 2 + 4, r.b, 2, ' stroke-dasharray="0.1 10.8" opacity=".9"'));
    if (st === 'pier') {
      g(side(w / 2 + 2, r.post, 6, ' stroke-dasharray="0.1 54"'));
      g(side(-w / 2 - 2, r.post, 6, ' stroke-dasharray="0.1 54"'));
    }
  } else if (st === 'rope') {
    g(flat(r.edge, w - 2, '7 4', ' transform="translate(1 2)"'));
    g(flat(r.base, w - 4, '7 4'));
    g(flat(r.hi, w - 4, '2 9', ' opacity=".5"'));
    for (const s of [1, -1]) {
      g(side(s * (w / 2 - 1), dark(r.rope, 0.35), 3.6));
      g(side(s * (w / 2 - 1), r.rope, 2));
      g(side(s * (w / 2 + 1), r.post, 6, ' stroke-dasharray="0.1 64"'));
    }
  } else if (st === 'cobble' || st === 'stairs') {
    for (const [off, dash] of [
      [w / 4, '6 4.2'],
      [-w / 4, '3 4.2 6 4.2'],
    ]) {
      g(side(off, r.a, w / 2 - 4, ` stroke-dasharray="${dash}"`));
      g(side(off - 0.6, r.hi, w / 2 - 9, ` stroke-dasharray="${dash}" opacity=".55"`));
    }
  } else if (st === 'slabs') {
    g(flat(r.a, w - 3, '1.6 15 1.6 21 1.6 12'));
    g(side(0, r.a, 1.4, ' stroke-dasharray="15 9 21 6" opacity=".8"'));
    g(stroke(r.hi, 2, ' opacity=".35" transform="translate(-4 -2)"'));
  } else if (st === 'bricks') {
    g(flat(r.a, w - 3, '1.4 6.6'));
    g(side(0, r.a, 1.4));
    g(side(w / 4, r.base, w / 2 - 3, ' stroke-dasharray="4 4" opacity=".55"'));
  } else if (st === 'rails') {
    g(flat(r.tie, w + 2, '5 6'));
    g(flat(light(r.tie, 0.25), 1.6, '5 6', ' transform="translate(-0.5 -1)"'));
    for (const s of [1, -1]) {
      g(side(s * w * 0.27, '#3a3f4c', 4.2));
      g(side(s * w * 0.27 - 0.7, '#d9dde8', 1.4));
    }
  } else if (st === 'rainbow') {
    r.bands.forEach((col, i) => g(stroke(col, w - 1 - i * ((w - 6) / r.bands.length))));
    g(stroke('#ffffff', 2, ' stroke-dasharray="0.1 17" opacity=".9"'));
  } else if (st === 'neon') {
    g(side(w / 2 - 3, r.glow, 7, ' opacity=".25"'));
    g(side(-w / 2 + 3, r.glow, 7, ' opacity=".25"'));
    g(side(w / 2 - 3, r.glow, 2));
    g(side(-w / 2 + 3, r.glow2, 2));
    g(stroke(r.line, 2.2, ' stroke-dasharray="9 9"'));
  } else if (st === 'snow' || st === 'trail' || st === 'sand') {
    // footprints / speckles
    let pr = '';
    S.forEach((p, i) => {
      if (i % 3) return;
      const o = (i % 6 ? 1 : -1) * 4;
      pr += ellD(p.x + p.nx * o, p.y + p.ny * o, 2.2, 1.6);
    });
    g(`<path d="${pr}" fill="${r.a}" opacity="${st === 'snow' ? 0.55 : 0.4}"/>`);
    g(stroke(r.hi, 3, ' opacity=".45" transform="translate(-5 -3)"'));
  } else if (st === 'ice') {
    g(side(w / 5, '#ffffff', 2.4, ' stroke-dasharray="22 14 6 18" opacity=".8"'));
    g(side(-w / 4, '#ffffff', 1.4, ' stroke-dasharray="10 30" opacity=".6"'));
    g(flat(r.a, w - 6, '1 23', ' opacity=".45"'));
  }
  return out.join('');
}

/** Small things along both road sides (posts, pebbles, tufts, lanterns...). */
function roadsideDeco(c) {
  const { A, S, R } = c;
  const e = A.edge;
  if (!e) return;
  const near = (x, y) => c.stations.some(([sx, sy]) => Math.hypot(x - sx, y - sy) < 40) || c.avoid.some(([ax, ay, ar]) => Math.hypot(x - ax, y - ay) < ar + 6);
  let fill = '';
  let fill2 = '';
  let strk = '';
  let strk2 = '';
  const glows = [];
  for (let i = 4; i < S.length - 2; i += e.every || 4) {
    const p = S[i];
    if (p.y < c.y0 + 20) continue;
    for (const sd of [1, -1]) {
      if (R() < (e.skip ?? 0.35)) continue;
      const off = sd * (c.hw + (e.off ?? 6) + R() * (e.jitter ?? 6));
      const x = p.x + p.nx * off;
      const y = p.y + p.ny * off;
      if (near(x, y) || c.isWater(x, y)) continue;
      const s = between(R, 0.8, 1.2);
      if (e.kind === 'pebbles') {
        fill += ellD(x, y, 3.2 * s, 2.2 * s);
        fill2 += ellD(x - 0.9 * s, y - 0.8 * s, 1.3 * s, 0.8 * s);
      } else if (e.kind === 'tufts') {
        strk += `M${f(x - 3)} ${f(y)}q1 -5 -2 -8M${f(x)} ${f(y)}q0 -7 1 -10M${f(x + 3)} ${f(y)}q0 -5 3 -7`;
        if (R() < 0.3) fill += ellD(x + 2, y - 9, 2.2, 2.2);
      } else if (e.kind === 'stones') {
        fill += ellD(x, y, 4.4 * s, 3 * s);
        fill2 += ellD(x - 1.2, y - 1.1, 2 * s, 1.2 * s);
      } else if (e.kind === 'posts') {
        strk += `M${f(x)} ${f(y)}v${f(-10 * s)}`;
        fill2 += ellD(x, y - 10 * s, 2.2, 1.4);
      } else if (e.kind === 'lanterns') {
        strk += `M${f(x)} ${f(y)}v-13`;
        fill += ellD(x, y - 15, 3, 3.6);
        glows.push(glow(x, y - 15, 13, 13, e.glow, 0.55));
      } else if (e.kind === 'crystals') {
        fill += `M${f(x - 3)} ${f(y)}l1 -9l2 -3l2 3l1 9Z`;
        fill2 += `M${f(x - 1)} ${f(y - 2)}l.6 -8l1.4 -2v10Z`;
      } else if (e.kind === 'flowers') {
        strk += `M${f(x)} ${f(y)}v-6`;
        fill += ellD(x, y - 7, 2.6, 2.4);
        fill2 += ellD(x, y - 7, 1, 1);
      } else if (e.kind === 'snowbank') {
        fill += ellD(x, y - 1, 7 * s, 3.4 * s);
        fill2 += ellD(x - 1.6, y - 2.2, 3.4 * s, 1.4 * s);
      } else if (e.kind === 'shells') {
        fill += ellD(x, y, 2.4 * s, 1.8 * s);
        if (R() < 0.4) fill2 += ellD(x + 4, y + 1, 1.6, 1.2);
      }
    }
  }
  const o = [];
  if (fill) o.push(`<path d="${fill}" fill="${e.c1}"/>`);
  if (fill2) o.push(`<path d="${fill2}" fill="${e.c2}"${e.a2 ? ` opacity="${e.a2}"` : ''}/>`);
  if (strk) o.push(`<path d="${strk}" fill="none" stroke="${e.s1 || e.c1}" stroke-width="${e.sw || 2}" stroke-linecap="round"/>`);
  if (strk2) o.push(`<path d="${strk2}" fill="none" stroke="${e.c2}" stroke-width="1.4" stroke-linecap="round"/>`);
  c.layers.deco.push(o.join('') + glows.join(''));
}

/* ---------------------------------------------------------------------------------- */
/* platforms under levels and chests                                                   */
/* ---------------------------------------------------------------------------------- */
/** Boss arena: a crimson glow and two pennants framing the platform. */
function bossArena(c, x, y) {
  const flag = (fx, dir) =>
    `<path d="M${f(fx)} ${f(y + 22)}V${f(y - 26)}" stroke="#3a2a2a" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M${f(fx)} ${f(y - 26)}l${dir * 20} 6l${dir * -20} 7Z" fill="${lin(['#ff6b81', '#c81e3e'])}"/>` +
    `<circle cx="${f(fx)}" cy="${f(y - 27)}" r="2.6" fill="#ffd34d"/>`;
  return glow(x, y + 18, 74, 34, '#ff3d5a', 0.32) + ao(x - 50, y + 23, 8, 3, c.A.shadow, 0.4) + ao(x + 50, y + 23, 8, 3, c.A.shadow, 0.4) + flag(x - 52, -1) + flag(x + 52, 1);
}

function pad(c, x, y, rx, big = false) {
  const k = c.A.pad;
  const ry = rx * 0.4;
  const cy = y + (big ? 20 : 15);
  const t = k.depth ?? 7;
  const sideD = `M${f(x - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 0 0 ${f(x + rx)} ${f(cy)}V${f(cy + t)}A${f(rx)} ${f(ry)} 0 0 1 ${f(x - rx)} ${f(cy + t)}Z`;
  if (k.kind === 'isle') {
    // a little floating island: rocky underside hanging below the grass top
    const under = `M${f(x - rx)} ${f(cy)}Q${f(x - rx * 0.7)} ${f(cy + ry * 2.2)} ${f(x - rx * 0.2)} ${f(cy + ry * 2.6)}L${f(x + rx * 0.05)} ${f(cy + ry * 3.6)}L${f(x + rx * 0.3)} ${f(cy + ry * 2.4)}Q${f(x + rx * 0.8)} ${f(cy + ry * 2)} ${f(x + rx)} ${f(cy)}Z`;
    return (
      ao(x + 14, cy + 40, rx * 0.9, ry * 0.7, c.A.shadow, 0.18) +
      `<path d="${under}" fill="${lin(['#b08060', '#6a4a3a', '#4a3028'])}"/>` +
      `<ellipse cx="${f(x)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${lin(['#a6ec8a', '#5fbf5a'])}"/>` +
      `<ellipse cx="${f(x)}" cy="${f(cy + 2)}" rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="#3f8a3a" stroke-width="2" stroke-dasharray="${f(rx * 1.6)} ${f(rx * 9)}" stroke-dashoffset="${f(-rx * 0.2)}"/>`
    );
  }
  let s = ao(x + 5, cy + t + 3, rx * 1.18, ry * 1.25, c.A.shadow, 0.5);
  s += `<path d="${sideD}" fill="${lin([k.side, dark(k.side, 0.3)], 0, 0, 1, 0)}"/>`;
  if (k.kind === 'candy') {
    let drips = '';
    for (let i = -3; i <= 3; i++) drips += ellD(x + i * rx * 0.27, cy + ry * 0.9 + (i % 2 ? 5 : 3), 3.4, i % 2 ? 6 : 4);
    s += `<path d="${drips}" fill="${k.top}"/>`;
  }
  s += `<ellipse cx="${f(x)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${shade(k.top, 0.18)}"/>`;
  if (k.kind === 'wood') {
    let pl = '';
    for (let i = -2; i <= 2; i++) pl += `M${f(x + i * rx * 0.36 - rx * 0.05)} ${f(cy - ry * 0.95)}L${f(x + i * rx * 0.36 + rx * 0.05)} ${f(cy + ry * 0.95)}`;
    s += `<path d="${pl}" stroke="${dark(k.top, 0.3)}" stroke-width="1.2" opacity=".55" clip-path="none"/>`;
  } else if (k.kind === 'stone') {
    s += `<path d="M${f(x - rx * 0.5)} ${f(cy - ry * 0.4)}l${f(rx * 0.25)} ${f(ry * 0.3)}l${f(rx * 0.2)} ${f(-ry * 0.1)}M${f(x + rx * 0.2)} ${f(cy + ry * 0.4)}l${f(rx * 0.3)} ${f(-ry * 0.3)}" fill="none" stroke="${dark(k.top, 0.3)}" stroke-width="1.3" opacity=".6"/>`;
  } else if (k.kind === 'neon') {
    s += `<ellipse cx="${f(x)}" cy="${f(cy)}" rx="${f(rx - 3)}" ry="${f(ry - 2)}" fill="none" stroke="${k.ring}" stroke-width="2.4" opacity=".9"/>`;
  } else if (k.kind === 'grass') {
    s += `<ellipse cx="${f(x)}" cy="${f(cy)}" rx="${f(rx - 4)}" ry="${f(ry - 2.5)}" fill="none" stroke="${light(k.top, 0.25)}" stroke-width="1.6" stroke-dasharray="3 4" opacity=".8"/>`;
  } else if (k.kind === 'gear') {
    s += `<ellipse cx="${f(x)}" cy="${f(cy)}" rx="${f(rx + 2)}" ry="${f(ry + 1)}" fill="none" stroke="${dark(k.side, 0.2)}" stroke-width="3" stroke-dasharray="4 4"/>`;
  }
  s += `<ellipse cx="${f(x)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="${k.rim}" stroke-width="1.6" opacity=".75" stroke-dasharray="${f(rx * 1.6)} ${f(rx * 9)}" stroke-dashoffset="${f(rx * 2.4)}"/>`;
  return s;
}

/* ---------------------------------------------------------------------------------- */
/* atmosphere & world-to-world mist                                                    */
/* ---------------------------------------------------------------------------------- */
function mistBand(seed, W, y, color, alpha = 0.92) {
  const R = rng(`mist:${seed}`);
  const soft = rad([[0, color, 1], [0.5, color, 0.75], [1, color, 0]]);
  let s = `<rect x="-20" y="${f(y - 34)}" width="${W + 40}" height="68" fill="${lin([[0, color, 0], [0.5, color, alpha * 0.85], [1, color, 0]])}"/>`;
  const n = Math.ceil(W / 46) + 2;
  for (let i = 0; i < n; i++) {
    const x = -30 + (i + R() * 0.6) * ((W + 60) / n);
    const r = 34 + R() * 30;
    s += `<ellipse cx="${f(x)}" cy="${f(y + (R() - 0.5) * 30)}" rx="${f(r * 1.3)}" ry="${f(r * 0.75)}" fill="${soft}" opacity="${f(alpha * 100) / 100}"/>`;
  }
  return s;
}

/** Locked worlds sleep under a bank of clouds. */
function cloudCover(c) {
  const R = rng(`cover:${c.w}`);
  const tint = mix(c.A.mist, '#ffffff', 0.55);
  const soft = rad([[0, '#ffffff', 1], [0.55, tint, 0.85], [1, tint, 0]]);
  const h = c.H - c.y0;
  let s = `<rect x="-20" y="${f(c.y0 + 160)}" width="${c.W + 40}" height="${f(h)}" fill="${lin([[0, tint, 0], [0.12, tint, 0.9], [1, mix(tint, '#b9bce0', 0.35), 0.96]])}"/>`;
  for (let i = 0; i < 40; i++) {
    const y = c.y0 + 70 + (i / 40) * (h - 70);
    const r = between(R, 46, 90);
    s += `<ellipse cx="${f(between(R, -30, c.W + 30))}" cy="${f(y)}" rx="${f(r * 1.45)}" ry="${f(r * 0.72)}" fill="${soft}" opacity="${f(Math.min(1, 0.55 + (i / 40) * 0.8) * 100) / 100}"/>`;
  }
  return s;
}

function atmosphere(c) {
  const { A, W, H, y0 } = c;
  const h = H - y0;
  // light from the left, shade on the right, framed edges
  c.layers.air.push(
    `<rect x="0" y="${y0}" width="${W}" height="${h}" fill="${lin([[0, A.light, 0.32], [0.38, A.light, 0], [0.7, A.shadow, 0], [1, A.shadow, 0.2]], 0, 0, 1, 0)}" pointer-events="none"/>`,
    `<rect x="0" y="${y0}" width="${W}" height="${h}" fill="${lin([[0, A.shadow, 0.28], [0.08, A.shadow, 0], [0.92, A.shadow, 0], [1, A.shadow, 0.32]], 0, 0, 1, 0)}"/>`,
  );
}

/* ---------------------------------------------------------------------------------- */
/* the scene                                                                           */
/* ---------------------------------------------------------------------------------- */
/**
 * Build one world's static scenery.
 * o = { w, W, H, top, road: [[x,y]...] px, avoid: [[x,y,r]] chests,
 *       stations: [[x,y,boss]] level points, last, locked }
 * Returns { svg (markup in path coordinates), sprites }.
 */
export function worldScene(o) {
  const c = context(o);
  const { A, W, H, y0 } = c;
  // 1. ground
  c.layers.under.push(`<rect x="-20" y="${y0}" width="${W + 40}" height="${H - y0}" fill="${lin([A.g0, A.g1])}"/>`);
  A.terrain(c, { patches, marks, sea, pond, roomiest, edgeMass, edgeForest, edgePeaks, put, tryPut, mix, light, dark, lin, rad, glow, ao, blob, closedD, polyD, ellD, f, between, pick, C, E, L, P, RECT, ST, bloom, crown, crystal, hshade, op, rock, tuft, shade });
  // 2. road
  c.layers.road.push(buildRoad(c, roadD(o.road)));
  roadsideDeco(c);
  // 3. platforms
  for (const [x, y, boss] of o.stations) c.layers.pads.push((boss ? bossArena(c, x, y) : '') + pad(c, x, y, boss ? 46 : 40));
  for (const [x, y] of o.avoid) c.layers.pads.push(pad(c, x, y, 44, true));
  // 4. props
  populate(c);
  c.items.sort((a, b) => a.y - b.y);
  // 5. atmosphere, mist bands shared with the neighbours
  atmosphere(c);
  if (o.locked) c.layers.air.push(cloudCover(c));
  const mistTop = o.w ? mistBand(`${o.w - 1}|${o.w}`, W, y0, mix(art(o.w - 1).mist, A.mist, 0.5)) : '';
  const mistBottom = o.last ? '' : mistBand(`${o.w}|${o.w + 1}`, W, H, mix(A.mist, art(o.w + 1).mist, 0.5));
  const L_ = c.layers;
  const svg =
    L_.under.join('') +
    L_.ground.join('') +
    L_.marks.join('') +
    L_.road.join('') +
    L_.deco.join('') +
    L_.pads.join('') +
    L_.over.join('') +
    c.items.map((i) => i.svg).join('') +
    L_.fg.join('') +
    L_.air.join('') +
    mistTop +
    mistBottom;
  return { svg, sprites: c.sprites };
}

/** The golden "travelled" ribbon, drawn live over the baked scene (animated on unlock). */
export function litRoad(road, litN) {
  const d = litN > 1 ? roadD(road.slice(0, litN)) : '';
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path class="road-lit-edge" d="${d}" stroke="#7a4300" stroke-opacity=".9" stroke-width="13"/>
    <path class="road-lit" d="${d}" stroke="#ffc93a" stroke-width="8.5"/>
    <path class="road-lit-hi" d="${d}" stroke="#fff3b0" stroke-width="2.2" transform="translate(-1 -1.4)"/>
    <path class="road-dots" d="${d}" stroke="#ffffff" stroke-width="3.4" stroke-dasharray="0.1 16"/></g>`;
}

/* Baked scenes: one standalone SVG picture per world, cached as a blob URL so the browser
   paints it like any image (no thousands of live elements to style, paint and layerize). */
const baked = new Map();
export function bakeWorld(o) {
  const key = `${o.w}|${o.W}|${o.H}|${o.top}|${o.last ? 1 : 0}|${o.locked ? 1 : 0}|${o.avoid.map((a) => a.map(Math.round).join(',')).join(';')}`;
  let b = baked.get(key);
  if (!b) {
    const { svg, sprites } = worldScene(o);
    const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${o.W}" height="${o.H + o.top}" viewBox="0 ${-o.top} ${o.W} ${o.H + o.top}">${defsFor(svg)}${svg}</svg>`;
    const url = typeof URL !== 'undefined' && URL.createObjectURL && typeof Blob !== 'undefined' ? URL.createObjectURL(new Blob([doc], { type: 'image/svg+xml' })) : '';
    b = { url, sprites, size: doc.length };
    baked.set(key, b);
    flushDefs(); // the live sprites use the shared defs
  }
  return b;
}

/** Markup of the live animated sprites (inline SVG, positioned in path coordinates). */
export const spritesHTML = (sprites) =>
  sprites.map((p) => `<svg class="map-sprite a-${p.anim}" style="left:${p.x}px;top:${p.y}px;animation-delay:${p.delay}s" width="1" height="1" overflow="visible" aria-hidden="true"><use href="#${p.key}" transform="scale(${p.sx} ${p.sy})"/></svg>`).join('');
