// Illustrated props for the adventure map, part 1: shared helpers and worlds 1-8.
// Every prop is drawn standing on (0,0), growing upwards, lit from the top-left.
// draw(p) receives the world palette; r = footprint radius, h = height (for spacing/shadow).
import { ball, dark, f, glow, light, lin, mix, polyD, rad, shade, vshade, closedD } from './map-kit.js';

/* ---------- tiny SVG helpers ---------- */
export const P = (d, fill, x = '') => `<path d="${d}" fill="${fill}"${x}/>`;
export const E = (cx, cy, rx, ry, fill, x = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${x}/>`;
export const C = (cx, cy, r, fill, x = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${x}/>`;
export const ST = (c, w = 1.5) => ` stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
export const L = (d, c, w = 1.5, x = '') => `<path d="${d}" fill="none"${ST(c, w)}${x}/>`;
export const R = (x, y, w, h, fill, rx = 0, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${rx ? ` rx="${rx}"` : ''} fill="${fill}"${extra}/>`;
/** Left-lit horizontal shading (cylinders, trunks, towers). */
export const hshade = (c, k = 0.25) => lin([light(c, k), c, dark(c, k)], 0, 0, 1, 0);
export const op = (a) => ` opacity="${a}"`;

/** Foliage: layered clumps (dark base, mid body offset to the light, highlights). */
export function crown(circles, [c0, c1, c2], outline = true) {
  const base = circles.map(([x, y, r]) => C(x, y, r, c0)).join('');
  const rim = outline ? `<g${ST(dark(c0, 0.35), 2.6)}>${base}</g>` : '';
  const mid = circles.map(([x, y, r]) => C(x - r * 0.1, y - r * 0.16, r * 0.84, c1)).join('');
  const hi = circles
    .filter((c, i) => i % 2 === 0)
    .map(([x, y, r]) => C(x - r * 0.3, y - r * 0.36, r * 0.42, c2))
    .join('');
  return rim + base + mid + hi;
}

/** A serrated leaf/frond along a quadratic curve, two-tone (lit upper half). */
export function frond(bx, by, ang, len, w, droop, cDark, cLight, serr = true) {
  const tip = [bx + Math.cos(ang) * len, by + Math.sin(ang) * len + droop];
  const ctl = [bx + Math.cos(ang) * len * 0.55, by + Math.sin(ang) * len * 0.55 - len * 0.16];
  const q = (t) => [(1 - t) * (1 - t) * bx + 2 * (1 - t) * t * ctl[0] + t * t * tip[0], (1 - t) * (1 - t) * by + 2 * (1 - t) * t * ctl[1] + t * t * tip[1]];
  const N = 10;
  const a = [];
  const b = [];
  const mid = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = q(t);
    const p1 = q(Math.max(0, t - 0.03));
    const p2 = q(Math.min(1, t + 0.03));
    let tx = p2[0] - p1[0];
    let ty = p2[1] - p1[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    const wd = w * Math.sin(Math.PI * Math.min(1, t * 1.08 + 0.02)) * (serr && i % 2 ? 0.55 : 1);
    a.push([p[0] - ty * wd, p[1] + tx * wd]);
    b.push([p[0] + ty * wd, p[1] - tx * wd]);
    mid.push(p);
  }
  // Which half faces the sky? (the side whose normal points up)
  const upA = a[N >> 1][1] < b[N >> 1][1];
  const half = (side) => polyD([...side, ...mid.slice().reverse()], true);
  return (
    P(half(upA ? b : a), cDark) +
    P(half(upA ? a : b), cLight) +
    L(polyD(mid), dark(cDark, 0.2), 1.1, op(0.55))
  );
}

/** Faceted crystal: lit left facet, dark right facet, bright edge. */
export function crystal(x, h, w, lean, c) {
  const top = [x + lean, -h];
  const d1 = `M${f(x - w)} 0L${f(x - w * 0.9)} ${f(-h * 0.62)}L${f(top[0])} ${f(top[1])}L${f(x + lean * 0.3)} 0Z`;
  const d2 = `M${f(x + lean * 0.3)} 0L${f(top[0])} ${f(top[1])}L${f(x + w * 0.95)} ${f(-h * 0.6)}L${f(x + w)} 0Z`;
  return P(d1, lin([light(c, 0.45), light(c, 0.1)])) + P(d2, lin([c, dark(c, 0.35)])) + L(`M${f(top[0])} ${f(top[1])}L${f(x + lean * 0.3)} 0`, light(c, 0.7), 1.1, op(0.8));
}

/** Smooth rock: dark base, lit body, highlight, a crack or two. */
export function rock(x, y, rx, ry, c, Rn = 0.5) {
  const pts = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / (n - 1)) * Math.PI;
    const k = 1 + Math.sin(i * 2.3 + Rn * 7) * 0.12;
    pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * 2 * k]);
  }
  pts.push([x + rx * 0.95, y + ry * 0.3], [x - rx * 0.95, y + ry * 0.3]);
  const inner = pts.map(([px, py]) => [x + (px - x) * 0.92 - rx * 0.05, y + (py - y) * 0.92 - ry * 0.14]);
  return (
    P(closedD(pts), dark(c, 0.32)) +
    P(closedD(inner), shade(c, 0.3)) +
    E(x - rx * 0.35, y - ry * 1.15, rx * 0.32, ry * 0.32, light(c, 0.55), op(0.55))
  );
}

/** Grass tuft (blades from one point). */
export function tuft(x, y, h, c1, c2, n = 5) {
  let d1 = '';
  let d2 = '';
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.32;
    const len = h * (0.65 + 0.35 * Math.cos(i * 1.7));
    const tx = x + Math.cos(a) * len;
    const ty = y + Math.sin(a) * len;
    const d = `M${f(x + (i - n / 2) * 1.2)} ${f(y)}Q${f(x + Math.cos(a) * len * 0.4)} ${f(y + Math.sin(a) * len * 0.6)} ${f(tx)} ${f(ty)}`;
    if (i % 2) d1 += d;
    else d2 += d;
  }
  return L(d1, c1, 2.2) + L(d2, c2, 2.2);
}

/** Flower head (petals around a heart). */
export function bloom(x, y, r, petal, heart = '#ffd34d', n = 5) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    s += E(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.55, r * 0.55, r * 0.45, petal);
  }
  return s + C(x, y, r * 0.38, heart) + C(x - r * 0.12, y - r * 0.14, r * 0.14, '#fff', op(0.7));
}

/* ---------- WORLD 1 — Pebble Beach ---------- */
const palm = (variant) => (p) => {
  const lean = variant ? -9 : 10;
  const tr = [
    [-5, 0],
    [lean * 0.25 - 4, -20],
    [lean * 0.65 - 3, -40],
    [lean - 2.5, -58],
    [lean + 2.5, -58],
    [lean * 0.65 + 3, -40],
    [lean * 0.25 + 4.5, -20],
    [5, 0],
  ];
  let rings = '';
  for (let i = 1; i < 9; i++) {
    const t = i / 9;
    const cx = lean * t * t * 0.9 + lean * 0.1 * t;
    const y = -t * 58;
    const hw = 5 - t * 2.4;
    rings += `M${f(cx - hw)} ${f(y + 1)}Q${f(cx)} ${f(y - 2)} ${f(cx + hw)} ${f(y + 1)}`;
  }
  const top = [lean, -60];
  const angs = variant ? [-2.95, -2.35, -1.85, -1.3, -0.75, -0.2] : [-2.9, -2.4, -1.9, -1.25, -0.7, -0.15];
  const back = angs.filter((x, i) => i % 2 === 0);
  const front = angs.filter((x, i) => i % 2 === 1);
  return (
    P(closedD(tr), hshade(p.bark, 0.3)) +
    L(rings, dark(p.bark, 0.35), 1.3, op(0.55)) +
    back.map((a, i) => frond(top[0], top[1], a, 40 + i * 3, 9, 14 - Math.abs(a + 1.6) * 3, p.leaf[0], p.leaf[1])).join('') +
    C(top[0] - 4, top[1] + 3, 4.2, ball('#7a4a22')) +
    C(top[0] + 3, top[1] + 4, 4.2, ball('#6b3f1d')) +
    C(top[0] - 0.5, top[1] + 7, 3.8, ball('#83522a')) +
    front.map((a, i) => frond(top[0], top[1], a, 38 + i * 4, 10, 18 - Math.abs(a + 1.6) * 4, p.leaf[1], p.leaf[2])).join('')
  );
};

const umbrella = (v) => (p) => {
  const cols = v ? ['#ff6b81', '#ffffff'] : ['#3fb6ff', '#ffffff'];
  const dome = 'M-30 -40Q-27 -59 0 -62Q27 -59 30 -40Q25 -35 20 -40Q15 -35 10 -40Q5 -35 0 -40Q-5 -35 -10 -40Q-15 -35 -20 -40Q-25 -35 -30 -40Z';
  let wedges = '';
  for (let i = 0; i < 6; i += 2) {
    const x0 = -36 + i * 12;
    wedges += `M0 -63L${x0} -30L${x0 + 12} -30Z`;
  }
  const towel = v ? '#ffd34d' : '#ff8fb3';
  return (
    P('M-24 6L-6 -6L22 0L4 12Z', towel, ` transform="translate(${v ? 8 : -6} 0)"`) +
    L(`M${v ? -10 : -24} 4L${v ? 16 : 2} 9`, '#fff', 2.4, op(0.8)) +
    L('M1 0L-1 -46', '#7d6a5a', 3.2) +
    L('M1 0L-1 -46', '#efe6da', 1.5) +
    P(dome, cols[1]) +
    `<g clip-path="url(#umbclip)">${P(wedges, cols[0])}</g>` +
    P(dome, lin([['0', '#ffffff', 0.35], ['0.5', '#ffffff', 0], ['1', '#000000', 0.22]], 0, 0, 1, 1)) +
    C(0, -63, 2.4, '#fff')
  );
};

const pebbles = (p) => {
  const st = [
    [-11, -4, 9, 6, p.pebble[0]],
    [5, -3, 8, 5.4, p.pebble[1]],
    [-3, -9, 6.5, 4.4, p.pebble[2]],
    [13, -1, 5, 3.4, p.pebble[0]],
    [-18, 0, 4, 2.8, p.pebble[2]],
  ];
  return st.map(([x, y, rx, ry, c]) => E(x, y, rx, ry, ball(c, 0.3)) + E(x - rx * 0.35, y - ry * 0.42, rx * 0.3, ry * 0.2, '#fff', op(0.55))).join('');
};

const starfish = (p) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 5 : 13;
    pts.push([Math.cos(a) * r, -8 + Math.sin(a) * r * 0.62]);
  }
  let dots = '';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    dots += C(Math.cos(a) * 7, -8 + Math.sin(a) * 4.3, 1.1, '#fff');
  }
  return P(closedD(pts), shade(p.star || '#ff8a4c', 0.3)) + `<g${op(0.75)}>${dots}</g>` + C(0, -8, 1.6, '#fff', op(0.8));
};

const shell = (p) => {
  const fan = 'M0 0L-11 -7Q-14 -16 -6 -20Q0 -23 6 -20Q14 -16 11 -7Z';
  let ribs = '';
  for (let i = -3; i <= 3; i++) ribs += `M0 -1L${i * 3.4} ${-19 + Math.abs(i) * 1.6}`;
  return P(fan, lin(['#fff3ea', '#ffc2cf', '#f08aa3'])) + L(ribs, '#e0708c', 1, op(0.6)) + P('M-4 0L0 -3L4 0Z', '#e98aa0');
};

const sandcastle = (p) => {
  const s = p.sand2;
  const tower = (x, h, w) =>
    R(x - w, -h, w * 2, h, hshade(s, 0.22)) +
    P(`M${x - w - 1} ${-h}h${w * 2 + 2}v-4h-3v2h-3v-2h-${w * 2 - 10}v2h-3v-2h-3Z`, light(s, 0.15)) +
    R(x - 2, -h * 0.62, 4, 6, dark(s, 0.45), 2);
  return (
    E(0, -2, 46, 9, dark(s, 0.12)) +
    R(-30, -24, 60, 22, hshade(s, 0.2)) +
    P('M-30 -24h6v-4h6v4h6v-4h6v4h6v-4h6v4h6v-4h6v4h6v-4h6v4Z', light(s, 0.18)) +
    P('M-6 -2v-10a6 6 0 0 1 12 0v10Z', dark(s, 0.5)) +
    tower(-30, 40, 8) +
    tower(30, 36, 8) +
    R(-11, -56, 22, 34, hshade(s, 0.2)) +
    P('M-12 -56h24v-4h-4v2h-3v-2h-3v2h-4v-2h-3v2h-3v-2h-4Z', light(s, 0.2)) +
    L('M0 -60V-80', '#7d5a3a', 1.6) +
    P('M0 -80L14 -75L0 -70Z', p.flag || '#ff5d73') +
    C(-20, -14, 2, '#ffb3c4') +
    C(17, -10, 1.8, '#fff') +
    R(-2.5, -46, 5, 8, dark(s, 0.45), 2.5) +
    // sand texture
    L('M-24 -10h.1M-14 -18h.1M8 -16h.1M22 -8h.1M-4 -30h.1M4 -44h.1M-28 -32h.1M30 -26h.1', dark(s, 0.25), 2, op(0.5))
  );
};

const lifeguard = (p) =>
  L('M-14 0L-10 -34M14 0L10 -34M-12 -16L12 -24M12 -16L-12 -24', '#e8eef5', 3.4) +
  L('M-14 0L-10 -34M14 0L10 -34', '#9fb3c8', 1.2, op(0.7)) +
  L('M-4 0L-7 -34M2 0L-1 -34', '#c49a6c', 2.4) +
  L('M-5 -8h6M-5.5 -15h6M-6 -22h6M-6.5 -29h6', '#c49a6c', 2) +
  R(-17, -36, 34, 5, '#c49a6c', 1.5) +
  R(-15, -58, 30, 22, hshade('#ffffff', 0.12)) +
  R(-11, -54, 22, 8, '#4aa8d8', 1.5) +
  R(-15, -44, 30, 3, '#ff5d5d') +
  P('M-20 -57L0 -70L20 -57Z', shade('#ff5d5d', 0.25)) +
  L('M0 -70V-84', '#7d6a5a', 1.6) +
  P('M0 -84L12 -80L0 -76Z', '#ffd34d');

const sailboat = (p) =>
  `<g>${E(0, -3, 30, 6, '#ffffff', op(0.35))}` +
  P('M-24 -8Q0 2 24 -8L19 -14H-19Z', lin(['#ffffff', '#d6e4f0'])) +
  P('M-22 -10Q0 -2 22 -10', 'none', ST(p.boat || '#ff5d73', 2.4)) +
  L('M0 -14V-66', '#6b5240', 2) +
  P('M1 -64L1 -17L24 -17Z', lin(['#ffffff', '#e6ecf5'], 0, 0, 1, 1)) +
  P('M-1 -58L-1 -17L-18 -17Z', lin(['#f4f7fb', '#cfd9e6'], 1, 0, 0, 1)) +
  P('M1 -40L1 -30L16 -30Z', p.boat || '#ff5d73', op(0.85)) +
  P('M0 -66L10 -63L0 -60Z', '#ffd34d') +
  '</g>';

const searock = (p) =>
  E(0, -3, 22, 6, '#ffffff', op(0.55)) + rock(0, -4, 17, 7, p.rock || '#8f98a8') + L('M-20 -2q5 -3 10 0', '#fff', 1.6, op(0.8));

const crab = () =>
  L('M-8 -4l-5 2M-8 -6l-6 -1M8 -4l5 2M8 -6l6 -1', '#c2412f', 1.6) +
  E(0, -6, 9, 5.5, ball('#ff6b4a', 0.3)) +
  C(-11, -11, 3.6, ball('#ff6b4a', 0.3)) +
  C(11, -11, 3.6, ball('#ff6b4a', 0.3)) +
  L('M-3 -10v-3M3 -10v-3', '#c2412f', 1.4) +
  C(-3, -13.5, 1.8, '#fff') +
  C(3, -13.5, 1.8, '#fff') +
  C(-3, -13.5, 0.9, '#2b1d2e') +
  C(3, -13.5, 0.9, '#2b1d2e');

const dunegrass = (p) => `<g>${tuft(0, 0, 22, p.grass[0], p.grass[1], 7)}${tuft(6, 1, 15, p.grass[1], p.grass[2], 5)}</g>`;

/* ---------- WORLD 2 — Sunny Dunes ---------- */
const saguaro = (p) => {
  const c = p.cactus;
  return (
    L('M-6 -24H-14Q-17 -24 -17 -28V-40', dark(c, 0.3), 9.5) +
    L('M-6 -24H-14Q-17 -24 -17 -28V-40', c, 7) +
    L('M6 -32H14Q17 -32 17 -36V-50', dark(c, 0.3), 9.5) +
    L('M6 -32H14Q17 -32 17 -36V-50', c, 7) +
    L('M-15.5 -27V-39M15.5 -35V-49', light(c, 0.35), 1.4, op(0.8)) +
    P('M-7 0V-56Q-7 -64 0 -64Q7 -64 7 -56V0Z', hshade(c, 0.3)) +
    L('M-3 -4V-58M2 -4V-59', dark(c, 0.25), 1.3, op(0.6)) +
    L('M-5 -6V-56', light(c, 0.4), 1.4, op(0.7)) +
    bloom(0, -63, 4, '#ff7ab0', '#ffe066') +
    L('M-9 -20l-2 -1M9 -30l2 -1M-9 -44l-2 -1M9 -12l2 -1', '#fff6d8', 1, op(0.8))
  );
};

const barrelcactus = (p) => {
  const c = p.cactus;
  return (
    E(0, -10, 12, 11, ball(c, 0.32)) +
    L('M-7 -2Q-10 -10 -6 -19M0 -1V-21M7 -2Q10 -10 6 -19', dark(c, 0.3), 1.4, op(0.6)) +
    L('M-4 -2Q-6 -10 -3 -20M4 -2Q6 -10 3 -20', light(c, 0.35), 1, op(0.6)) +
    bloom(0, -21, 4.5, '#ff5f9e', '#ffe066', 6)
  );
};

const sandstone = (p) => {
  const c = p.stone;
  // a little flat-topped outcrop: lit top, layered faces, a fallen block
  return (
    P('M-22 0L-19 -14L-12 -20H8L16 -15L20 0Z', lin([light(c, 0.12), dark(c, 0.3)], 0, 0, 1, 0)) +
    P('M8 -20L16 -15L20 0H9Z', dark(c, 0.3), op(0.55)) +
    P('M-19 -14L-12 -20H8L16 -15L4 -12H-10Z', lin([light(c, 0.45), light(c, 0.2)])) +
    L('M-20 -7H19M-17 -2H19', dark(c, 0.28), 1.3, op(0.55)) +
    L('M-12 -18H4', '#fff6dc', 1.4, op(0.7)) +
    P('M14 0L17 -6H25L27 0Z', hshade(c, 0.25))
  );
};

const pyramid = (p) => {
  const c = p.sand2;
  let blocks = '';
  for (let i = 1; i < 6; i++) {
    const y = -i * 11;
    const hw = 54 - i * 9.6;
    blocks += `M${f(-hw)} ${y}H${f(hw)}`;
  }
  return (
    P('M-56 0L0 -62L56 0Z', light(c, 0.12)) +
    P('M0 -62L56 0H8Z', lin([dark(c, 0.15), dark(c, 0.32)], 0, 0, 1, 1)) +
    P('M0 -62L-56 0H8Z', lin([light(c, 0.3), c], 0, 0, 1, 1)) +
    L(blocks, dark(c, 0.3), 1.2, op(0.5)) +
    P('M0 -62L-6 -55H6Z', '#ffd34d') +
    P('M-6 0V-12a6 6 0 0 1 12 0V0Z', dark(c, 0.55))
  );
};

const tent = (p) =>
  P('M-36 0L-10 -40L6 -40L34 0Z', lin(['#f4e2c4', '#d9b98a'], 0, 0, 1, 1)) +
  P('M-10 -40L6 -40L-2 0H-20Z', '#c8a271', op(0.6)) +
  L('M-32 -6L-10 -36M30 -6L6 -36', '#ff7a59', 4, op(0.8)) +
  P('M-8 0L-2 -26L4 0Z', '#5a3a2a') +
  L('M-10 -40L-14 -48M6 -40L10 -48', '#7a5a3a', 2) +
  P('M10 -48L22 -45L10 -42Z', '#ff5d73');

const column = (p) => {
  const c = p.ruin;
  return (
    R(-8, -34, 16, 34, hshade(c, 0.22)) +
    L('M-3 -32V-2M3 -32V-2', dark(c, 0.2), 1.3, op(0.6)) +
    P('M-11 -34h22l-2 -5H-9Z', light(c, 0.2)) +
    P('M-9 -39l3 -4l4 3l3 -5l4 4l4 -2v4Z', c) +
    P('M-12 0Q-6 -6 0 -4Q8 -7 13 0Z', p.sand2)
  );
};

/* ---------- WORLD 3 — Ember Canyon ---------- */
const hoodoo = (p) => {
  const c = p.stone;
  return (
    P('M-11 0L-8 -26L-10 -40L-6 -58L5 -60L9 -42L7 -26L12 0Z', hshade(c, 0.28)) +
    L('M-10 -12H11M-8 -24H8M-9 -36H8M-7 -48H7', dark(c, 0.3), 1.6, op(0.6)) +
    P('M-16 -60Q-2 -70 14 -60Q12 -55 0 -55Q-12 -55 -16 -60Z', shade(dark(c, 0.15), 0.25)) +
    L('M-6 -54L-4 -40', light(c, 0.4), 1.8, op(0.6))
  );
};

const lavapool = (p) =>
  E(0, -6, 26, 11, '#3a1610') +
  `<ellipse class="m-glow" cx="0" cy="-6" rx="21" ry="8" fill="${rad([[0, '#fff3a0'], [0.45, '#ffb03a'], [1, '#e8411c']])}"/>` +
  L('M-12 -8q4 -3 8 0M4 -4q4 -2 7 0', '#fff7c2', 1.6, op(0.8)) +
  E(-14, -3, 5, 2.4, '#5a2414') +
  E(15, -8, 4, 2, '#5a2414');

const volcano = (p) => {
  const c = p.stone;
  return (
    P('M-58 0L-18 -58H18L58 0Z', lin([light(c, 0.12), dark(c, 0.3)], 0, 0, 1, 0)) +
    P('M18 -58L58 0H22L8 -58Z', dark(c, 0.28), op(0.5)) +
    E(0, -58, 18, 5, '#3a1610') +
    E(0, -59, 13, 3.4, rad([[0, '#fff3a0'], [0.5, '#ffb03a'], [1, '#ff5a1f']]), ' class="m-glow"') +
    P('M-6 -56Q-12 -36 -20 -20Q-22 -12 -16 -6Q-12 -20 -2 -40Q2 -50 -6 -56Z', lin(['#ffe27a', '#ff6a1f'])) +
    P('M6 -56Q10 -40 16 -30Q20 -20 26 -18Q22 -32 12 -44Z', lin(['#ffd05a', '#ff5a1f']), op(0.9)) +
    L('M-40 -12L-30 -26M30 -8L38 -18', dark(c, 0.35), 2, op(0.5)) +
    `<g class="m-smoke">${C(-4, -72, 8, '#8a7f86', op(0.55))}${C(6, -80, 10, '#a69ca2', op(0.45))}${C(-2, -92, 12, '#c2b8bd', op(0.35))}</g>`
  );
};

const deadtree = (p) =>
  L('M-1 0L0 -26L-11 -40M0 -26L2 -46L-3 -58M1 -38L11 -50M0 -18L9 -26', '#2a1610', 6.5) +
  L('M-1 0L0 -26L-11 -40M0 -26L2 -46L-3 -58M1 -38L11 -50M0 -18L9 -26', '#5a3424', 3.6) +
  L('M-2 -4L-1 -24', '#7a4c34', 1.2, op(0.8));

const firecrystal = (p) =>
  glow(0, -10, 22, 14, '#ff8a3d', 0.45, 'glow') + crystal(-8, 22, 6, -3, '#ff6a3d') + crystal(4, 34, 7, 2, '#ffa040') + crystal(12, 16, 5, 3, '#ff5a3d');

const ventsmoke = (p) =>
  E(0, -3, 12, 4, '#2a1410') +
  E(0, -3.5, 7, 2.2, '#ff7a3a', op(0.9)) +
  `<g class="m-smoke">${C(0, -14, 6, '#9a8e92', op(0.5))}${C(4, -24, 8, '#b6aaae', op(0.4))}${C(-1, -36, 10, '#cfc4c8', op(0.3))}</g>`;

/* ---------- WORLD 4 — Coral Reef ---------- */
const branchcoral = (p) => {
  const c = p.coral[0];
  const d = 'M0 0V-20M0 -12L-12 -26V-38M0 -20L10 -36V-44M-6 -19L-17 -18M6 -27L17 -30M-12 -30L-18 -36';
  return L(d, dark(c, 0.3), 8.5) + L(d, c, 6) + L(d, light(c, 0.35), 2, op(0.75)) + C(-12, -38, 3.2, light(c, 0.2)) + C(10, -44, 3.2, light(c, 0.2)) + C(17, -30, 2.8, light(c, 0.2));
};
const braincoral = (p) => {
  const c = p.coral[1];
  return E(0, -10, 16, 12, ball(c, 0.3)) + L('M-11 -8q3 -5 6 0t6 0t6 0M-9 -14q3 -4 6 0t6 0t5 0M-6 -4q3 -3 6 0t6 0', dark(c, 0.3), 1.4, op(0.65));
};
const fancoral = (p) => {
  const c = p.coral[2];
  let mesh = '';
  for (let i = -4; i <= 4; i++) mesh += `M0 -4L${i * 6} ${-30 + Math.abs(i) * 2.2}`;
  return (
    P('M0 -2L-26 -24Q-24 -40 0 -44Q24 -40 26 -24Z', lin([light(c, 0.2), c, dark(c, 0.2)], 0, 0, 0, 1), op(0.92)) +
    L(mesh, dark(c, 0.3), 1.2, op(0.55)) +
    L('M-18 -24Q0 -36 18 -24M-12 -14Q0 -22 12 -14', light(c, 0.35), 1, op(0.6)) +
    L('M0 0V-6', dark(c, 0.4), 3)
  );
};
const anemone = (p) => {
  const c = p.coral[3];
  let t = '';
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI + (i / 8) * Math.PI;
    t += `M${f(Math.cos(a) * 6)} -8Q${f(Math.cos(a) * 12)} ${f(-14 + Math.sin(a) * 6)} ${f(Math.cos(a) * 14)} ${f(-10 + Math.sin(a) * 14)}`;
  }
  return `<g>${L(t, dark(c, 0.2), 4.5)}${L(t, c, 3)}${L(t, light(c, 0.4), 1, op(0.8))}</g>` + E(0, -5, 9, 6, ball(dark(c, 0.15), 0.3));
};
const kelp = (p) => {
  const d1 = 'M-4 0C-12 -14 4 -24 -4 -38C-10 -48 0 -56 -2 -66';
  const d2 = 'M6 0C0 -12 12 -20 6 -32C2 -40 8 -46 8 -52';
  return `<g>${L(d1, dark(p.kelp, 0.35), 8)}${L(d1, p.kelp, 5.5)}${L(d1, light(p.kelp, 0.35), 1.5, op(0.7))}${L(d2, dark(p.kelp, 0.4), 7)}${L(d2, dark(p.kelp, 0.1), 4.5)}${E(-9, -30, 5, 2.4, p.kelp, ' transform="rotate(-30 -9 -30)"')}${E(10, -24, 5, 2.4, p.kelp, ' transform="rotate(30 10 -24)"')}${E(-6, -52, 4.5, 2.2, p.kelp, ' transform="rotate(-25 -6 -52)"')}</g>`;
};
const fishschool = (p) => {
  const fish = (x, y, s, c) =>
    `<g transform="translate(${x} ${y}) scale(${s})">${P('M-10 0C-5 -7 7 -7 10 0C7 7 -5 7 -10 0Z', shade(c, 0.25))}${P('M-10 0L-16 -5V5Z', dark(c, 0.15))}${C(5, -1.5, 1.6, '#fff')}${C(5.4, -1.5, 0.8, '#1d2a44')}${L('M-2 -5V5', light(c, 0.4), 1.4, op(0.7))}</g>`;
  return `<g>${fish(0, -34, 1, p.fish[0])}${fish(-16, -26, 0.75, p.fish[1])}${fish(12, -22, 0.7, p.fish[0])}</g>`;
};
const clam = (p) =>
  P('M-15 -3C-15 -18 15 -18 15 -3Z', shade('#b58bff', 0.25)) +
  L('M-8 -4L-5 -15M0 -4V-16M8 -4L5 -15', '#8e65e0', 1.2, op(0.6)) +
  C(0, -6, 3.6, ball('#ffffff', 0.25)) +
  P('M-15 -3H15L11 1H-11Z', '#7e57d6');
const turtle = (p) =>
  `<g>${E(-18, -16, 9, 4, '#5fb37a', ' transform="rotate(-30 -18 -16)"')}${E(18, -16, 9, 4, '#5fb37a', ' transform="rotate(30 18 -16)"')}${E(-14, -2, 7, 3.4, '#5fb37a', ' transform="rotate(20 -14 -2)"')}${E(14, -2, 7, 3.4, '#5fb37a', ' transform="rotate(-20 14 -2)"')}${E(0, -26, 6, 7, ball('#6cc489', 0.3))}${E(0, -10, 16, 14, ball('#3f8f5f', 0.3))}${P('M-8 -14L0 -20L8 -14L5 -5H-5Z', '#5aa874', op(0.9))}${L('M-8 -14L-14 -10M8 -14L14 -10M-5 -5L-9 0M5 -5L9 0M0 -20V-23', '#2f6e47', 1.2, op(0.7))}${C(-2.4, -29, 1.1, '#1d2a2a')}${C(2.4, -29, 1.1, '#1d2a2a')}</g>`;
const wreck = (p) =>
  P('M-46 0L-38 -18L30 -26L48 -10L40 0Z', lin(['#8a5a3a', '#4a2c1c'])) +
  L('M-38 -12L36 -18M-40 -6L42 -10', '#3a2216', 1.6, op(0.7)) +
  P('M-10 -24L-8 -60L-4 -60L-4 -25Z', '#5a3a2a') +
  P('M-6 -58L18 -50L-4 -40Z', '#d6cfc0', op(0.55)) +
  P('M16 -8L24 -14L28 -6Z', '#1d2433') +
  C(-22, -10, 3.4, '#1d2433') +
  C(-6, -12, 3.4, '#1d2433') +
  (p.coral ? `<g transform="translate(30 -4) scale(.55)"${op(0.85)}>${branchcoral(p)}</g>` : P('M34 -10L44 -16L46 -8Z', '#d6cfc0', op(0.5)));
const jelly = (p) =>
  `<g>${L('M-6 -24q-2 8 1 16M-2 -24q2 9 -1 18M2 -24q-2 8 1 15M6 -24q2 7 -1 14', p.jelly, 1.6, op(0.7))}${P('M-10 -24Q-10 -38 0 -38Q10 -38 10 -24Q5 -21 0 -24Q-5 -21 -10 -24Z', lin([light(p.jelly, 0.4), p.jelly]), op(0.85))}${E(-3, -32, 3, 2, '#fff', op(0.6))}</g>`;

/* ---------- WORLD 5 — Violet Peaks ---------- */
const pine = (snow) => (p) => {
  const [c0, c1, c2] = p.pine;
  const tier = (y, w, h) => {
    const d = `M0 ${y - h}L${w} ${y}Q0 ${y + 4} ${-w} ${y}Z`;
    return P(d, dark(c0, 0.1)) + P(`M0 ${y - h}L${-w} ${y}Q${-w * 0.3} ${y + 2.5} ${w * 0.15} ${y + 2}Z`, c1) + (snow ? P(`M0 ${y - h}L${w * 0.42} ${y - h * 0.55}Q0 ${y - h * 0.4} ${-w * 0.42} ${y - h * 0.55}Z`, '#f4f6ff') : P(`M0 ${y - h}L${-w * 0.5} ${y - h * 0.4}L${-w * 0.1} ${y - h * 0.5}Z`, c2, op(0.8)));
  };
  return R(-3, -10, 6, 10, hshade(p.bark, 0.3)) + tier(-6, 18, 22) + tier(-20, 15, 20) + tier(-33, 11, 18) + tier(-45, 7, 13);
};
const amethyst = (p) =>
  glow(0, -12, 24, 14, p.gem, 0.35) + crystal(-9, 24, 7, -4, p.gem) + crystal(3, 40, 8, 1, light(p.gem, 0.1)) + crystal(13, 22, 6, 4, p.gem) + crystal(-2, 14, 5, -1, dark(p.gem, 0.1));
const boulder = (p) => rock(0, -1, 18, 8, p.rock, 0.3) + rock(14, 0, 9, 4.5, p.rock, 0.8);
const cairn = (p) => E(0, -4, 12, 5, ball(p.rock, 0.25)) + E(1, -12, 9, 4.5, ball(light(p.rock, 0.08), 0.25)) + E(0, -19, 6.5, 3.6, ball(p.rock, 0.25)) + E(1, -25, 4, 2.6, ball(light(p.rock, 0.1), 0.25));
const alpflowers = (p) => tuft(0, 0, 12, p.grass[0], p.grass[1], 6) + bloom(-5, -12, 3.4, p.flower[0]) + bloom(4, -15, 3.8, p.flower[1]) + bloom(9, -9, 3, p.flower[0]);

/* ---------- WORLD 6 — Glacier Bay ---------- */
const iceberg = (p) =>
  E(0, -2, 34, 7, '#ffffff', op(0.45)) +
  P('M-30 -2L-22 -26L-8 -34L6 -50L22 -26L30 -2Z', '#f4fbff') +
  P('M6 -50L22 -26L30 -2L8 -2L10 -24Z', lin(['#bfe6fb', '#8cc9ec'], 0, 0, 1, 1)) +
  P('M-22 -26L-8 -34L-12 -12Z', '#d6effc') +
  P('M-30 -2Q0 6 30 -2V2H-30Z', '#7cc2e8', op(0.6)) +
  L('M-8 -34L-4 -14M6 -50L4 -30', '#ffffff', 1.6, op(0.9));
const penguin = (p) =>
  E(0, -17, 11, 17, ball('#2b2d42', 0.25)) +
  E(0, -13, 7, 12, lin(['#ffffff', '#dfe6f2'])) +
  E(-10, -16, 3, 8, '#2b2d42', ' transform="rotate(15 -10 -16)"') +
  E(10, -16, 3, 8, '#2b2d42', ' transform="rotate(-15 10 -16)"') +
  C(-3.6, -26, 2, '#fff') +
  C(3.6, -26, 2, '#fff') +
  C(-3.3, -26, 1, '#1d1d28') +
  C(3.3, -26, 1, '#1d1d28') +
  P('M-3 -22L0 -19L3 -22Z', '#ffb02e') +
  L('M-6 0H-1M1 0H6', '#ffb02e', 3) +
  E(-4, -30, 3, 1.6, '#fff', op(0.35));
const igloo = (p) => {
  let bricks = '';
  for (let r = 1; r < 4; r++) bricks += `M${-30 + r * 3} ${-r * 9}H${30 - r * 3}`;
  bricks += 'M-14 0V-9M14 0V-9M-20 -9V-18M0 -9V-18M18 -9V-18M-8 -18V-26M10 -18V-26';
  return (
    P('M-32 0C-32 -42 32 -42 32 0Z', lin(['#ffffff', '#e2f1fb', '#b9dbf0'], 0.2, 0, 0.9, 1)) +
    L(bricks, '#a8cde6', 1.4, op(0.9)) +
    P('M-11 0V-10A11 11 0 0 1 11 -10V0Z', '#dcecf8') +
    P('M-7 0V-9A7 7 0 0 1 7 -9V0Z', '#3a5a7a') +
    glow(0, -4, 10, 6, '#ffcf70', 0.5)
  );
};
const icespikes = (p) => crystal(-8, 22, 6, -4, '#aee0fb') + crystal(3, 32, 7, 1, '#cdeeff') + crystal(12, 18, 5, 4, '#aee0fb');
const snowman = (p) =>
  E(0, -12, 15, 13, ball('#ffffff', 0.18)) +
  E(0, -33, 11, 10, ball('#ffffff', 0.18)) +
  E(0, -50, 8, 7.5, ball('#ffffff', 0.18)) +
  L('M-10 -34L-24 -42M10 -34L22 -44', '#7a4a2a', 2) +
  P('M-1 -51L10 -48L-1 -46Z', '#ff8a2e') +
  C(-3, -53, 1.3, '#2b2d42') +
  C(3, -53, 1.3, '#2b2d42') +
  R(-8, -64, 16, 8, '#2b2d42', 2) +
  R(-11, -58, 22, 3, '#2b2d42', 1.5) +
  P('M-9 -42Q0 -38 9 -42L8 -38Q0 -35 -8 -38Z', '#ff5d73') +
  P('M5 -40L9 -28L13 -30L8 -41Z', '#ff5d73') +
  C(0, -30, 1.4, '#2b2d42') +
  C(0, -24, 1.4, '#2b2d42');
const snowpile = () => P('M-22 0C-22 -12 -10 -16 -2 -13C4 -21 18 -17 22 0Z', lin(['#ffffff', '#d8ecf8'])) + E(-6, -10, 6, 2.6, '#fff', op(0.8));
const icehole = () => E(0, -2, 13, 5, '#cfe8f7') + E(0, -2, 10, 3.6, lin(['#1d4f7a', '#3d86b8'])) + L('M6 -3L18 -22', '#8a6a4a', 1.6) + L('M18 -22Q22 -12 4 -3', '#ffffff', 0.7, op(0.7));

/* ---------- WORLD 7 — Mossy Woods ---------- */
const oak = (v) => (p) =>
  P('M-5 0C-4 -10 -4 -18 -3 -26L3 -26C4 -18 4 -10 5 0Z', hshade(p.bark, 0.3)) +
  L('M-5 0L-9 3M5 0L9 2', p.bark, 3) +
  crown(
    v
      ? [
          [-12, -34, 13],
          [11, -32, 13],
          [0, -46, 15],
          [-6, -28, 10],
          [7, -24, 9],
        ]
      : [
          [-14, -30, 12],
          [13, -30, 12],
          [-4, -44, 14],
          [9, -46, 12],
          [0, -26, 11],
        ],
    p.leaf,
  );
const mushrooms = (p) => {
  const shroom = (x, s, c) =>
    `<g transform="translate(${x} 0) scale(${s})">${R(-4, -13, 8, 13, lin(['#fff8ec', '#e8d6bd'], 0, 0, 1, 0), 3)}${P('M-15 -11C-15 -29 15 -29 15 -11Q0 -7 -15 -11Z', ball(c, 0.25))}${C(-6, -19, 2.6, '#fff', op(0.95))}${C(5, -22, 2.2, '#fff', op(0.95))}${C(1, -14, 1.6, '#fff', op(0.9))}${C(9, -15, 1.4, '#fff', op(0.9))}</g>`;
  return shroom(-8, 0.75, p.shroom) + shroom(7, 1, p.shroom) + shroom(-1, 0.5, light(p.shroom, 0.1));
};
const fern = (p) => {
  let s = '';
  const angs = [-2.6, -2.1, -1.6, -1.1, -0.55];
  angs.forEach((a, i) => (s += frond(0, 0, a, 20 + (i % 2) * 6, 4, 4, p.leaf[0], p.leaf[1])));
  return `<g>${s}</g>`;
};
const stump = (p) =>
  P('M-12 0V-12H12V0Z', hshade(p.bark, 0.3)) +
  E(0, -12, 12, 5, '#d9a46a') +
  E(0, -12, 7, 2.8, 'none', ST('#b07a44', 1.1)) +
  E(0, -12, 3, 1.2, 'none', ST('#b07a44', 1.1)) +
  L('M-12 0L-17 2M12 0L16 3', p.bark, 3) +
  E(-6, -5, 4, 3, p.moss || '#6fbf5f', op(0.9));
const log = (p) =>
  P('M-24 -12H18V0H-24Z', lin([light(p.bark, 0.2), dark(p.bark, 0.25)])) +
  E(18, -6, 4.5, 6.2, '#d9a46a') +
  E(18, -6, 2.4, 3.4, 'none', ST('#b07a44', 1)) +
  P('M-22 -12Q-10 -16 4 -12Z', p.moss || '#6fbf5f') +
  C(-10, -15, 2, '#ff6b6b');
const mossrock = (p) => rock(0, -1, 16, 8, p.rock, 0.6) + P('M-14 -6Q-8 -18 2 -16Q10 -16 12 -10Q2 -12 -14 -6Z', p.moss || '#6fbf5f');
const flowers = (p) => tuft(0, 0, 10, p.grass[0], p.grass[1], 5) + bloom(-5, -10, 3.2, p.flower[0]) + bloom(5, -12, 3.6, p.flower[1]) + bloom(0, -6, 2.6, p.flower[2] || p.flower[0]);
const cabin = (p) =>
  P('M-30 0V-30H30V0Z', lin(['#b9804c', '#8a5a32'], 0, 0, 1, 0)) +
  L('M-30 -6H30M-30 -12H30M-30 -18H30M-30 -24H30', '#6b4224', 1.2, op(0.6)) +
  P('M-36 -28L0 -54L36 -28Z', shade('#a8443a', 0.25)) +
  L('M-36 -28L0 -54L36 -28', '#6e2a24', 2.2) +
  R(12, -58, 8, 14, '#7a6a66') +
  R(-6, -18, 12, 18, '#5a3a22', 1.5) +
  R(-24, -22, 12, 10, '#ffd36b', 1.5) +
  L('M-18 -22V-12M-24 -17H-12', '#8a5a32', 1.4) +
  glow(-18, -10, 18, 8, '#ffcf70', 0.35) +
  `<g class="m-smoke">${C(16, -64, 4, '#d0d0d0', op(0.5))}${C(20, -72, 5.5, '#e0e0e0', op(0.4))}</g>`;

/* ---------- WORLD 8 — Neon City ---------- */
const tower = (h, w, c) => (p) => {
  const d = 10;
  let win = '';
  for (let y = -h + 8; y < -6; y += 9) for (let x = -w + 4; x < w - 3; x += 7) win += `M${x} ${y}h3.4v4h-3.4Z`;
  let side = '';
  for (let y = -h + 8; y < -6; y += 9) side += `M${w + 2} ${y + 1}l5 -3v4l-5 3Z`;
  return (
    P(`M${-w} 0V${-h}H${w}V0Z`, lin([light(c, 0.12), c])) +
    P(`M${w} 0V${-h}L${w + d} ${-h - d * 0.6}V${-d * 0.6}Z`, dark(c, 0.35)) +
    P(`M${-w} ${-h}L${-w + d} ${-h - d * 0.6}H${w + d}L${w} ${-h}Z`, light(c, 0.25)) +
    P(win, p.win[0], op(0.95)) +
    P(side, p.win[1], op(0.7)) +
    L(`M${w * 0.3} ${-h - 3}V${-h - 16}`, '#8a86b8', 1.4) +
    C(w * 0.3, -h - 17, 2.2, p.neon[0], ' class="m-blink"')
  );
};
const neonsign = (p) =>
  L('M-8 0V-22M10 0V-22', '#3a3466', 2.6) +
  glow(1, -34, 30, 18, p.neon[1], 0.35) +
  R(-18, -46, 38, 24, '#1b1440', 7, ST(p.neon[1], 3)) +
  R(-11, -39, 24, 10, p.neon[0], 5, ' class="m-blink"') +
  R(-18, -46, 38, 24, 'none', 7, ST(light(p.neon[1], 0.5), 1));
const lamp = (p) =>
  glow(10, -2, 22, 8, '#fff3a0', 0.35) +
  L('M0 0V-44Q0 -50 8 -50', '#2a2550', 4) +
  L('M0 0V-44Q0 -50 8 -50', '#7a72c8', 1.8) +
  glow(10, -46, 12, 10, '#fff3a0', 0.6) +
  C(10, -47, 3.8, '#fffbe0');
const billboard = (p) =>
  L('M-10 0V-26M12 0V-26', '#3a3466', 3) +
  R(-24, -56, 50, 30, lin([p.neon[2], p.neon[0]], 0, 0, 1, 1), 3) +
  R(-24, -56, 50, 30, 'none', 3, ST('#1b1440', 2)) +
  C(-8, -41, 7, '#fff', op(0.85)) +
  L('M4 -48H18M4 -41H16M4 -34H12', '#ffffff', 2.4, op(0.85));
const antenna = (p) =>
  L('M-10 0L0 -64L10 0M-6 -22H6M-3.5 -42H3.5M-8 -10L6 -30M8 -10L-6 -30', '#4a4480', 2) +
  C(0, -66, 3, p.neon[1], ' class="m-blink"') +
  glow(0, -66, 10, 10, p.neon[1], 0.5, 'blink');
const planter = (p) =>
  R(-12, -10, 24, 10, lin(['#5a5296', '#3a3470']), 2) +
  crown(
    [
      [-6, -18, 8],
      [6, -18, 8],
      [0, -26, 9],
    ],
    ['#1f6e5a', '#2fa37a', '#7fe0b0'],
  );
const car = (p) =>
  E(0, -2, 20, 5, '#000', op(0.25)) +
  P('M-18 -4V-12Q-16 -16 -10 -17L-6 -24H8L14 -17Q19 -16 19 -12V-4Z', shade(p.neon[2], 0.25)) +
  P('M-5 -22H7L11 -17H-9Z', '#9ad8ff', op(0.9)) +
  C(-10, -4, 4, '#1b1440') +
  C(11, -4, 4, '#1b1440') +
  glow(-20, -10, 6, 4, '#fff3a0', 0.8) +
  glow(20, -10, 5, 3, '#ff4d6d', 0.7);

/** Prop catalogue: draw(p) plus footprint radius r and height h. */
export const PROPS1 = {
  palm: { anim: 'sway', r: 22, h: 90, draw: palm(0) },
  palm2: { anim: 'sway', r: 22, h: 90, draw: palm(1) },
  umbrella: { r: 26, h: 64, draw: umbrella(0) },
  umbrella2: { r: 26, h: 64, draw: umbrella(1) },
  pebbles: { r: 18, h: 12, draw: pebbles },
  starfish: { r: 12, h: 10, draw: starfish, flat: 1 },
  shell: { r: 10, h: 18, draw: shell, flat: 1 },
  sandcastle: { r: 44, h: 80, draw: sandcastle, big: 1 },
  lifeguard: { r: 22, h: 84, draw: lifeguard, big: 1 },
  sailboat: { anim: 'bob', r: 26, h: 66, draw: sailboat, water: 1 },
  searock: { r: 20, h: 18, draw: searock, water: 1 },
  crab: { r: 12, h: 14, draw: crab },
  dunegrass: { anim: 'sway', r: 12, h: 22, draw: dunegrass },
  saguaro: { r: 16, h: 66, draw: saguaro },
  barrelcactus: { r: 12, h: 26, draw: barrelcactus },
  sandstone: { r: 22, h: 24, draw: sandstone },
  pyramid: { r: 54, h: 62, draw: pyramid, big: 1 },
  tent: { r: 34, h: 48, draw: tent, big: 1 },
  column: { r: 12, h: 42, draw: column },
  hoodoo: { r: 14, h: 66, draw: hoodoo },
  lavapool: { r: 26, h: 12, draw: lavapool, flat: 1 },
  volcano: { r: 56, h: 96, draw: volcano, big: 1 },
  deadtree: { r: 12, h: 58, draw: deadtree },
  firecrystal: { r: 16, h: 34, draw: firecrystal },
  ventsmoke: { r: 12, h: 30, draw: ventsmoke, flat: 1 },
  branchcoral: { r: 18, h: 46, draw: branchcoral },
  braincoral: { r: 16, h: 22, draw: braincoral },
  fancoral: { r: 24, h: 44, draw: fancoral },
  anemone: { anim: 'sway', r: 14, h: 24, draw: anemone },
  kelp: { anim: 'sway', r: 10, h: 66, draw: kelp },
  fishschool: { anim: 'bob', r: 18, h: 40, draw: fishschool, air: 1 },
  clam: { r: 15, h: 16, draw: clam },
  turtle: { anim: 'bob', r: 22, h: 34, draw: turtle, air: 1, big: 1 },
  wreck: { r: 46, h: 60, draw: wreck, big: 1 },
  jelly: { anim: 'bob', r: 10, h: 38, draw: jelly, air: 1 },
  pine: { r: 16, h: 58, draw: pine(0) },
  snowpine: { r: 16, h: 58, draw: pine(1) },
  amethyst: { r: 18, h: 40, draw: amethyst },
  boulder: { r: 20, h: 18, draw: boulder },
  cairn: { r: 12, h: 28, draw: cairn },
  alpflowers: { r: 10, h: 16, draw: alpflowers },
  iceberg: { anim: 'bob', r: 30, h: 50, draw: iceberg, water: 1 },
  penguin: { r: 11, h: 34, draw: penguin },
  igloo: { r: 32, h: 34, draw: igloo, big: 1 },
  icespikes: { r: 14, h: 32, draw: icespikes },
  snowman: { r: 15, h: 64, draw: snowman, big: 1 },
  snowpile: { r: 20, h: 16, draw: snowpile },
  icehole: { r: 14, h: 22, draw: icehole, flat: 1 },
  oak: { anim: 'sway', r: 22, h: 60, draw: oak(0) },
  oak2: { anim: 'sway', r: 22, h: 60, draw: oak(1) },
  mushrooms: { r: 16, h: 24, draw: mushrooms },
  fern: { anim: 'sway', r: 14, h: 24, draw: fern },
  stump: { r: 14, h: 16, draw: stump },
  log: { r: 22, h: 14, draw: log },
  mossrock: { r: 16, h: 16, draw: mossrock },
  flowers: { r: 10, h: 14, draw: flowers },
  cabin: { r: 36, h: 64, draw: cabin, big: 1 },
  towerS: { r: 18, h: 60, draw: (p) => tower(52, 13, p.bldg[0])(p) },
  towerM: { r: 20, h: 86, draw: (p) => tower(78, 15, p.bldg[1])(p) },
  towerL: { r: 22, h: 110, draw: (p) => tower(100, 17, p.bldg[2])(p), big: 1 },
  neonsign: { r: 20, h: 46, draw: neonsign },
  lamp: { r: 10, h: 50, draw: lamp },
  billboard: { r: 24, h: 56, draw: billboard },
  antenna: { r: 10, h: 66, draw: antenna },
  planter: { r: 12, h: 30, draw: planter },
  car: { r: 20, h: 24, draw: car },
};

/** Clip paths some props need (registered once). */
export const PROP_CLIPS = `<clipPath id="umbclip"><path d="M-30 -40Q-27 -59 0 -62Q27 -59 30 -40Q25 -35 20 -40Q15 -35 10 -40Q5 -35 0 -40Q-5 -35 -10 -40Q-15 -35 -20 -40Q-25 -35 -30 -40Z"/></clipPath>`;
export { mix, vshade };
