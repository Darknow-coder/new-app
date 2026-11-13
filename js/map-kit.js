// Drawing kit for the adventure map: colours, shared SVG defs (gradients, soft shadows),
// seeded randomness and curve geometry. Everything here returns SVG markup strings.
import { hashString } from './engine.js';

export const NS = 'http://www.w3.org/2000/svg';

/* ---------- numbers & colours ---------- */
export const f = (n) => Math.round(n * 10) / 10;

export function rgb(c) {
  const n = parseInt(c.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
export function mix(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
export const light = (c, t = 0.3) => mix(c, '#ffffff', t);
export const dark = (c, t = 0.3) => mix(c, '#000000', t);

/* ---------- shared defs (one hidden <svg>, filled lazily) ---------- */
let holder = null;
const known = new Map(); // id → markup
let queue = [];

/** Register a def once; returns its id. */
export function def(id, markup) {
  if (!known.has(id)) {
    known.set(id, markup);
    queue.push(markup);
  }
  return id;
}

const REF = /(?:url\(#|href="#)([\w-]+)/g;
/** Every def a piece of markup needs (followed recursively), as one <defs> block. */
export function defsFor(markup) {
  const need = new Set();
  const visit = (m) => {
    for (const [, id] of m.matchAll(REF)) {
      if (need.has(id) || !known.has(id)) continue;
      need.add(id);
      visit(known.get(id));
    }
  };
  visit(markup);
  return `<defs>${[...need].map((id) => known.get(id)).join('')}</defs>`;
}
const idOf = (s) => `m${hashString(s).toString(36)}`;

/** Push pending defs into the document (call after building markup). */
export function flushDefs() {
  if (!queue.length || typeof document === 'undefined') return;
  if (!holder) {
    holder = document.createElementNS(NS, 'svg');
    holder.setAttribute('width', '0');
    holder.setAttribute('height', '0');
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    document.body.appendChild(holder);
  }
  const tmp = document.createElementNS(NS, 'svg');
  tmp.innerHTML = `<defs>${queue.join('')}</defs>`;
  holder.appendChild(tmp.firstChild);
  queue = [];
}

const stopsOf = (stops) =>
  stops
    .map((s, i) => {
      const [o, c, a] = Array.isArray(s) ? s : [i / (stops.length - 1), s, 1];
      return `<stop offset="${f(o * 100) / 100}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ''}/>`;
    })
    .join('');

/** Linear gradient (objectBoundingBox). stops: colours or [offset, colour, opacity]. */
export function lin(stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) {
  const body = `x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopsOf(stops)}`;
  const id = idOf(`l${body}`);
  def(id, `<linearGradient id="${id}" ${body}</linearGradient>`);
  return `url(#${id})`;
}
/** Radial gradient (objectBoundingBox). */
export function rad(stops, cx = 0.5, cy = 0.5, r = 0.5, fx = cx, fy = cy) {
  const body = `cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}">${stopsOf(stops)}`;
  const id = idOf(`r${body}`);
  def(id, `<radialGradient id="${id}" ${body}</radialGradient>`);
  return `url(#${id})`;
}
/** Volume shading: lit from the top-left, shadowed bottom-right. */
export const shade = (c, k = 0.24) => lin([light(c, k), c, dark(c, k * 0.9)], 0.1, 0, 0.9, 1);
/** Vertical shading (lit top). */
export const vshade = (c, k = 0.22) => lin([light(c, k), c, dark(c, k)]);
/** Rounded volume (sphere-like). */
export const ball = (c, k = 0.28) => rad([[0, light(c, k + 0.15)], [0.45, c], [1, dark(c, k)]], 0.4, 0.36, 0.72, 0.34, 0.28);

/** Soft contact shadow (ambient occlusion) as an ellipse. */
export function ao(x, y, rx, ry, tint = '#000000', a = 0.38) {
  const fill = rad([[0, tint, 1], [0.55, tint, 0.45], [1, tint, 0]]);
  return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" opacity="${a}"/>`;
}
/** Soft glow / light pool. */
export function glow(x, y, rx, ry, c, a = 0.6, cls = '') {
  const fill = rad([[0, c, 1], [0.4, c, 0.5], [1, c, 0]]);
  return `<ellipse${cls ? ` class="${cls}"` : ''} cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" opacity="${a}"/>`;
}

/* ---------- randomness ---------- */
export function rng(seed) {
  let s = hashString(String(seed)) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
export const between = (R, a, b) => a + R() * (b - a);

/* ---------- curves ---------- */
/** Smooth open path through points (Catmull-Rom → cubic Bézier). */
export function roadD(pts) {
  if (pts.length < 2) return '';
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}
/** Smooth closed path through points. */
export function closedD(pts) {
  const n = pts.length;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}
/** Irregular rounded blob. */
export function blob(R, cx, cy, rx, ry, n = 9, amp = 0.18, rot = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const k = 1 + (R() * 2 - 1) * amp;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return closedD(pts);
}
/** Polyline path from points. */
export const polyD = (pts, close = false) => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}${close ? 'Z' : ''}`;
/** Ellipse as path data (to merge many small shapes into one <path>). */
export const ellD = (x, y, rx, ry) => `M${f(x - rx)} ${f(y)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0`;

/**
 * Sample the smooth road at a regular arc-length step.
 * Returns [{x, y, nx, ny, s}] where (nx, ny) is the unit normal (left of travel).
 */
export function sampleRoad(pts, step = 6) {
  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    const k = Math.max(6, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2));
    for (let j = i ? 1 : 0; j <= k; j++) {
      const t = j / k;
      const u = 1 - t;
      dense.push([
        u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
        u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1],
      ]);
    }
  }
  const out = [];
  let acc = 0;
  let next = 0;
  for (let i = 0; i < dense.length; i++) {
    if (i) acc += Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]);
    if (acc >= next || i === dense.length - 1) {
      out.push({ x: dense[i][0], y: dense[i][1], s: acc });
      next = acc + step;
    }
  }
  for (let i = 0; i < out.length; i++) {
    const a = out[Math.max(0, i - 1)];
    const b = out[Math.min(out.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    out[i].tx = (b.x - a.x) / len;
    out[i].ty = (b.y - a.y) / len;
    out[i].nx = -out[i].ty;
    out[i].ny = out[i].tx;
  }
  return out;
}
/** Path parallel to the sampled road at a signed offset (positive = left of travel). */
export const offsetD = (S, off) => polyD(S.map((p) => [p.x + p.nx * off, p.y + p.ny * off]));
