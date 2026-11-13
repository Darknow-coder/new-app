// Marble artwork: one small SVG illustration per skin, drawn *inside* the glass.
//
// Every drawing uses only white / black transparencies and a few fixed accent colours,
// on top of the marble's gameplay colour, so the colour (which hole it belongs to) always
// stays readable. ViewBox 0..100, centre (50,50), radius 50 (the ball clips it round).

/* ---------- palette ---------- */
const W = (a = 1) => `rgba(255,255,255,${a})`;
const K = (a = 1) => `rgba(0,0,0,${a})`;
const GOLD = '#ffd34d';
const GOLD_D = '#d99a12';
const CREAM = '#fff4d6';
const INK = '#1d1b2e';
const PINK = '#ff9ac1';
const MINT = '#8ff0d5';
const SKY = '#9fdcff';
const LEAF = '#3fbf6a';

/* ---------- tiny helpers ---------- */
const f = (n) => Math.round(n * 10) / 10;
const rad = (d) => (d * Math.PI) / 180;
const pt = (cx, cy, r, deg) => [f(cx + r * Math.cos(rad(deg))), f(cy + r * Math.sin(rad(deg)))];
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}" ${extra}/>`;
const ring = (cx, cy, r, w, stroke, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${stroke}" stroke-width="${w}" ${extra}/>`;
const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const stroke = (d, color, w, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const poly = (pts, fill, extra = '') => `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${fill}" ${extra}/>`;
const g = (inner, attrs = '') => `<g ${attrs}>${inner}</g>`;
const rot = (deg, cx = 50, cy = 50) => `transform="rotate(${deg} ${cx} ${cy})"`;
const BLUR = (id, sd) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

function star(cx, cy, R, r, n = 5, fill = W(), turn = -90, extra = '') {
  const pts = [];
  for (let i = 0; i < n * 2; i++) pts.push(pt(cx, cy, i % 2 ? r : R, turn + (i * 180) / n));
  return poly(pts, fill, extra);
}
/** Four-point sparkle. */
const sparkle = (cx, cy, s, fill = W()) => star(cx, cy, s, s * 0.28, 4, fill, -90);
function heart(cx, cy, s, fill) {
  return path(`M${cx} ${f(cy + s * 0.9)} C${f(cx - s * 1.4)} ${f(cy + s * 0.1)} ${f(cx - s * 0.9)} ${f(cy - s)} ${cx} ${f(cy - s * 0.35)} C${f(cx + s * 0.9)} ${f(cy - s)} ${f(cx + s * 1.4)} ${f(cy + s * 0.1)} ${cx} ${f(cy + s * 0.9)}Z`, fill);
}
function petals(cx, cy, n, len, w, fill, turn = 0) {
  let s = '';
  for (let i = 0; i < n; i++) s += `<ellipse cx="${cx}" cy="${f(cy - len / 2)}" rx="${w}" ry="${f(len / 2)}" fill="${fill}" ${rot(turn + (i * 360) / n, cx, cy)}/>`;
  return s;
}
function spiral(cx, cy, turns, r0, r1, w, color, start = 0) {
  const pts = [];
  const steps = Math.round(turns * 40);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push(pt(cx, cy, r0 + (r1 - r0) * t, start + t * turns * 360));
  }
  return stroke(`M${pts.map((p) => p.join(' ')).join(' L')}`, color, w);
}
function cloud(cx, cy, s, fill) {
  return g(circle(cx - s * 0.55, cy + s * 0.1, s * 0.42, fill) + circle(cx, cy - s * 0.15, s * 0.55, fill) + circle(cx + s * 0.6, cy + s * 0.12, s * 0.38, fill) + `<rect x="${f(cx - s * 0.95)}" y="${f(cy + s * 0.05)}" width="${f(s * 1.9)}" height="${f(s * 0.45)}" rx="${f(s * 0.22)}" fill="${fill}"/>`);
}
function drop(cx, cy, s, fill) {
  return path(`M${cx} ${f(cy - s)} C${f(cx + s * 0.2)} ${f(cy - s * 0.4)} ${f(cx + s * 0.7)} ${f(cy + s * 0.05)} ${f(cx + s * 0.7)} ${f(cy + s * 0.45)} A${f(s * 0.7)} ${f(s * 0.7)} 0 0 1 ${f(cx - s * 0.7)} ${f(cy + s * 0.45)} C${f(cx - s * 0.7)} ${f(cy + s * 0.05)} ${f(cx - s * 0.2)} ${f(cy - s * 0.4)} ${cx} ${f(cy - s)}Z`, fill);
}
/** Dots on a hex grid that shrink towards the rim, so they wrap the sphere. */
function sphereDots(step, r, fill, seed = 0) {
  let s = '';
  for (let y = -step; y <= 100 + step; y += step * 0.87) {
    const row = Math.round(y / (step * 0.87));
    for (let x = -step + (row % 2 ? step / 2 : 0) + seed; x <= 100 + step; x += step) {
      const d = Math.hypot(x - 50, y - 50) / 52;
      if (d > 1) continue;
      s += circle(x, y, r * (1 - d * d * 0.55), fill);
    }
  }
  return s;
}
/** Curved band that wraps the sphere (an ellipse seen at an angle). */
const band = (cy, ry, w, color, tilt = -18) => `<ellipse cx="50" cy="${cy}" rx="64" ry="${ry}" fill="none" stroke="${color}" stroke-width="${w}" ${rot(tilt)}/>`;
function gear(cx, cy, r, teeth, fill, hole = 0.35) {
  const pts = [];
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i * 360) / (teeth * 4);
    pts.push(pt(cx, cy, i % 4 < 2 ? r : r * 0.8, a));
  }
  return poly(pts, fill) + circle(cx, cy, r * hole, K(0.0), `fill-opacity="0"`) + ring(cx, cy, r * hole * 0.75, r * 0.12, K(0.25));
}
function snowflake(cx, cy, r, color, w) {
  let s = '';
  for (let i = 0; i < 6; i++) {
    const a = i * 60 - 90;
    const [x, y] = pt(cx, cy, r, a);
    s += stroke(`M${cx} ${cy} L${x} ${y}`, color, w);
    for (const k of [0.45, 0.72]) {
      const [bx, by] = pt(cx, cy, r * k, a);
      const [l1x, l1y] = pt(bx, by, r * 0.22, a - 45);
      const [l2x, l2y] = pt(bx, by, r * 0.22, a + 45);
      s += stroke(`M${l1x} ${l1y} L${bx} ${by} L${l2x} ${l2y}`, color, w * 0.8);
    }
  }
  return s + circle(cx, cy, w * 0.9, color);
}
function speckles(n, seed, rMin, rMax, colors) {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 46;
    s += circle(50 + Math.cos(a) * d, 50 + Math.sin(a) * d, rMin + r() * (rMax - rMin), colors[i % colors.length]);
  }
  return s;
}
function sparkleField(n, seed, sMin, sMax, fill = W()) {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 42;
    s += i % 3 ? circle(50 + Math.cos(a) * d, 50 + Math.sin(a) * d, sMin * 0.6, fill) : sparkle(50 + Math.cos(a) * d, 50 + Math.sin(a) * d, sMin + r() * (sMax - sMin), fill);
  }
  return s;
}
/** Classic cat's-eye vanes twisting out of the centre. */
function vanes(n, len, w, color, twist = 40, turn = 0) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = turn + (i * 360) / n;
    const [tx, ty] = pt(50, 50, len, a + twist);
    const [c1x, c1y] = pt(50, 50, len * 0.55, a - w);
    const [c2x, c2y] = pt(50, 50, len * 0.55, a + w + twist * 0.6);
    s += path(`M50 50 Q${c1x} ${c1y} ${tx} ${ty} Q${c2x} ${c2y} 50 50Z`, color);
  }
  return s;
}
/** Simple face: eyes and a smile (cute series). */
function eyes(lx, rx, y, r, fill = INK) {
  return circle(lx, y, r, fill) + circle(rx, y, r, fill) + circle(lx + r * 0.35, y - r * 0.4, r * 0.35, W()) + circle(rx + r * 0.35, y - r * 0.4, r * 0.35, W());
}
const smile = (cx, y, w, color = INK, sw = 4) => stroke(`M${cx - w} ${y} Q${cx} ${y + w * 0.9} ${cx + w} ${y}`, color, sw);
const blush = (lx, rx, y) => `<ellipse cx="${lx}" cy="${y}" rx="7" ry="4.5" fill="${PINK}" opacity=".7"/><ellipse cx="${rx}" cy="${y}" rx="7" ry="4.5" fill="${PINK}" opacity=".7"/>`;

/* ---------- the artwork ---------- */
export const ART = {
  // ── Classiques ──────────────────────────────────────────────
  classic: '',
  stripes: band(50, 20, 10, W(0.75)) + band(24, 16, 5, W(0.45)) + band(76, 16, 5, W(0.45)),
  dots: sphereDots(25, 7.5, W(0.82)),
  glass: ring(50, 50, 30, 2.5, W(0.3)) + circle(62, 64, 8, W(0.22)) + circle(35, 62, 4, W(0.5)) + circle(68, 36, 3, W(0.55)) + circle(44, 74, 2.5, W(0.5)) + ring(38, 40, 13, 2, W(0.25)),
  swirl: vanes(4, 46, 18, W(0.82), 55) + circle(50, 50, 6, W(0.9)),
  metal: `<rect x="0" y="44" width="100" height="14" fill="${K(0.32)}"/><rect x="0" y="58" width="100" height="6" fill="${W(0.45)}"/><rect x="0" y="22" width="100" height="6" fill="${W(0.3)}"/>`,
  galaxy: `<defs>${BLUR('b', 4)}</defs><ellipse cx="50" cy="50" rx="34" ry="14" fill="${W(0.35)}" filter="url(#b)" ${rot(-25)}/>` + spiral(50, 50, 1.3, 3, 38, 4, W(0.55)) + spiral(50, 50, 1.3, 3, 38, 4, W(0.55), 180) + sparkleField(14, 7, 3, 5),
  neon: ring(50, 50, 30, 3, W(0.85)) + ring(50, 50, 22, 1.5, W(0.4)),
  gem: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => poly([[50, 50], pt(50, 50, 62, i * 45), pt(50, 50, 62, i * 45 + 45)], i % 2 ? W(0.28) : K(0.12))).join('') + poly([pt(50, 50, 22, -90), pt(50, 50, 22, -18), pt(50, 50, 22, 54), pt(50, 50, 22, 126), pt(50, 50, 22, 198)], W(0.35)) + sparkle(64, 30, 9),

  // ── Monde 1 · Plage aux galets ──────────────────────────────
  'w0-sand': speckles(60, 3, 1.2, 2.8, [CREAM, K(0.25), W(0.6)]) + path('M0 72 Q25 62 50 70 T100 66 V100 H0Z', W(0.35)),
  'w0-wave': path('M-5 62 C10 40 30 30 46 38 C58 44 56 58 46 58 C40 58 40 50 46 50 C30 46 22 60 30 70 L-5 80Z', W(0.85)) + path('M0 78 Q25 66 50 74 T100 70 V100 H0Z', W(0.45)) + circle(56, 34, 3, W(0.8)) + circle(64, 40, 2, W(0.7)),
  'w0-shell': [...Array(9)].map((_, i) => { const a = -150 + i * 15; const [x, y] = pt(50, 82, 30, a); return `<ellipse cx="${x}" cy="${y}" rx="7.5" ry="31" fill="${i % 2 ? CREAM : '#ffe2c4'}" ${rot(a + 90, x, y)}/>`; }).join('') + [...Array(9)].map((_, i) => stroke(`M50 82 L${pt(50, 82, 52, -150 + i * 15).join(' ')}`, K(0.12), 1.5)).join('') + path('M40 82 Q50 92 60 82 L56 90 Q50 93 44 90Z', '#ffe2c4'),
  'w0-ball': [0, 1, 2, 3, 4, 5].map((i) => (i % 2 ? '' : poly([[50, 50], pt(50, 50, 70, i * 60 - 90), pt(50, 50, 70, i * 60 - 30)], i === 2 ? GOLD : W(0.95)))).join('') + circle(50, 50, 9, W()),
  'w0-legend': `<defs><radialGradient id="p" cx="40%" cy="35%"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#ffe3f0"/><stop offset=".8" stop-color="#bfe8ff"/><stop offset="1" stop-color="#d9c2ff"/></radialGradient></defs>` + circle(50, 52, 24, 'url(#p)') + ring(50, 52, 24, 2, W(0.7)) + sparkle(68, 32, 8) + sparkle(30, 70, 5),

  // ── Monde 2 · Dunes dorées ──────────────────────────────────
  'w1-strata': path('M0 40 Q30 28 55 40 T100 34 V58 Q70 50 45 60 T0 56Z', W(0.3)) + path('M0 66 Q35 54 60 66 T100 62 V82 Q70 74 40 84 T0 80Z', K(0.16)) + path('M0 86 Q40 78 70 88 T100 86 V100 H0Z', W(0.35)),
  'w1-cactus': circle(72, 28, 9, GOLD) + path('M42 92 V40 a8 8 0 0 1 16 0 V92Z', LEAF) + path('M42 64 H34 a6 6 0 0 1 -6 -6 V46 a5 5 0 0 1 10 0 V54 H42Z', LEAF) + path('M58 58 H66 a6 6 0 0 0 6 -6 V44 a5 5 0 0 0 -10 0 V48 H58Z', LEAF) + stroke('M50 40 V88', K(0.2), 2),
  'w1-sun': [...Array(12)].map((_, i) => poly([pt(50, 50, 24, i * 30 - 7), pt(50, 50, 44, i * 30), pt(50, 50, 24, i * 30 + 7)], i % 2 ? W(0.7) : GOLD)).join('') + circle(50, 50, 20, GOLD) + circle(43, 47, 2.5, INK) + circle(57, 47, 2.5, INK) + smile(50, 54, 6, INK, 3),
  'w1-scarab': `<ellipse cx="50" cy="56" rx="22" ry="27" fill="${INK}"/>` + circle(50, 28, 10, INK) + stroke('M50 34 V82', GOLD, 2.5) + `<ellipse cx="50" cy="56" rx="22" ry="27" fill="none" stroke="${GOLD}" stroke-width="2.5"/>` + stroke('M30 46 L18 40 M30 60 L16 62 M70 46 L82 40 M70 60 L84 62 M44 20 L38 12 M56 20 L62 12', INK, 3) + circle(43, 50, 3, GOLD) + circle(57, 50, 3, GOLD),
  'w1-legend': poly([[50, 22], [80, 70], [20, 70]], GOLD) + poly([[50, 22], [80, 70], [50, 70]], GOLD_D) + [0, 1, 2, 3].map((i) => stroke(`M5 ${78 + i * 6} Q20 ${74 + i * 6} 35 ${78 + i * 6} T65 ${78 + i * 6} T95 ${78 + i * 6}`, W(0.55), 2.5)).join('') + circle(72, 26, 7, W(0.9)),

  // ── Monde 3 · Canyon de braise ──────────────────────────────
  'w2-ash': speckles(45, 11, 1.5, 3.5, [K(0.45), K(0.3), '#ffb35c']) + speckles(8, 5, 1.5, 2.5, ['#ffe08a']),
  'w2-strata': path('M0 46 L18 46 L22 38 L44 38 L48 30 L70 30 L74 40 L100 40 V100 H0Z', K(0.18)) + path('M0 66 L26 66 L30 58 L56 58 L60 50 L100 50 V100 H0Z', K(0.18)) + path('M0 84 H100 V100 H0Z', K(0.18)) + stroke('M0 46 L18 46 L22 38 L44 38 L48 30 L70 30 L74 40 L100 40', W(0.45), 2),
  'w2-obsidian': poly([[20, 30], [50, 18], [70, 40], [44, 56]], W(0.22)) + poly([[44, 56], [70, 40], [80, 68], [52, 82]], W(0.1)) + poly([[20, 30], [44, 56], [30, 74]], W(0.14)) + stroke('M30 74 L44 56 L70 40 M44 56 L52 82', W(0.5), 1.5),
  'w2-lava': `<defs>${BLUR('b', 2)}</defs>` + g(stroke('M10 30 L32 44 L28 62 L46 74 L70 66 L88 80 M32 44 L56 36 L74 18 M56 36 L70 66 M28 62 L12 76', '#ffd36b', 5) , 'filter="url(#b)"') + stroke('M10 30 L32 44 L28 62 L46 74 L70 66 L88 80 M32 44 L56 36 L74 18 M56 36 L70 66 M28 62 L12 76', '#fff2b0', 2),
  'w2-legend': `<defs>${BLUR('b', 3)}</defs>` + path('M50 88 C26 86 22 62 34 48 C34 60 42 62 42 62 C38 44 48 30 56 16 C58 34 76 42 72 66 C70 80 62 88 50 88Z', '#ff8a3d', 'filter="url(#b)"') + path('M50 88 C30 86 28 66 38 54 C38 64 46 66 46 66 C44 52 50 42 56 32 C58 46 70 54 68 70 C66 82 60 88 50 88Z', '#ffb84d') + path('M50 88 C40 86 38 76 44 68 C46 74 50 74 50 74 C50 66 54 60 58 56 C60 66 64 72 62 78 C60 86 56 88 50 88Z', '#fff3b0'),

  // ── Monde 4 · Récif de corail ───────────────────────────────
  'w3-scales': [...Array(6)].map((_, row) => [...Array(7)].map((__, i) => stroke(`M${f(i * 18 - 9 + (row % 2) * 9)} ${f(row * 16 + 4)} a9 9 0 0 0 18 0`, W(0.55), 3)).join('')).join(''),
  'w3-bubbles': ring(36, 62, 13, 3, W(0.8)) + circle(32, 57, 3, W(0.8)) + ring(64, 40, 9, 2.5, W(0.75)) + circle(61, 37, 2, W(0.8)) + ring(66, 70, 6, 2, W(0.7)) + ring(42, 30, 5, 2, W(0.65)) + ring(78, 54, 3.5, 1.8, W(0.6)),
  'w3-coral': stroke('M50 96 V64 M50 72 L34 54 L30 38 M34 54 L22 48 M50 64 L64 46 L60 30 M64 46 L78 40 M50 80 L68 72 L76 60', CREAM, 6) + circle(30, 36, 4, CREAM) + circle(60, 28, 4, CREAM) + circle(22, 47, 3.5, CREAM) + circle(78, 39, 3.5, CREAM) + circle(77, 58, 3.5, CREAM),
  'w3-jelly': path('M24 52 C24 26 76 26 76 52 Q70 56 63 52 Q56 57 50 52 Q44 57 37 52 Q30 56 24 52Z', W(0.82)) + [32, 42, 58, 68].map((x, i) => stroke(`M${x} 56 q${i % 2 ? 5 : -5} 8 0 16 t0 16`, W(0.65), 3)).join('') + eyes(43, 57, 42, 3) + `<ellipse cx="50" cy="50" rx="6" ry="2.5" fill="${PINK}" opacity=".7"/>`,
  'w3-legend': `<defs>${BLUR('b', 4)}</defs>` + circle(50, 50, 20, W(0.6), 'filter="url(#b)"') + [...Array(8)].map((_, i) => poly([pt(50, 50, 8, i * 45 - 8), pt(50, 50, 40, i * 45), pt(50, 50, 8, i * 45 + 8)], i % 2 ? W(0.4) : GOLD)).join('') + circle(50, 50, 11, '#fff') + circle(46, 46, 3.5, W()),

  // ── Monde 5 · Pics violets ──────────────────────────────────
  'w4-snow': poly([[0, 86], [30, 34], [56, 74], [72, 46], [100, 86]], K(0.22)) + poly([[30, 34], [38, 48], [33, 46], [27, 52], [22, 48]], W(0.95)) + poly([[72, 46], [79, 58], [74, 56], [69, 60], [65, 57]], W(0.95)),
  'w4-ridge': path('M0 60 L20 42 L36 54 L56 30 L76 50 L100 36 V100 H0Z', W(0.22)) + path('M0 76 L24 58 L44 70 L64 50 L84 66 L100 56 V100 H0Z', K(0.2)) + path('M0 90 L30 76 L54 88 L78 72 L100 84 V100 H0Z', K(0.28)),
  'w4-amethyst': poly([[50, 14], [62, 30], [62, 80], [38, 80], [38, 30]], W(0.5)) + poly([[50, 14], [62, 30], [50, 34], [38, 30]], W(0.85)) + poly([[30, 34], [38, 46], [38, 84], [24, 84], [22, 46]], W(0.32)) + poly([[72, 38], [80, 50], [78, 84], [62, 84], [64, 50]], W(0.32)) + stroke('M50 34 V80', W(0.6), 1.5),
  'w4-aurora': `<defs>${BLUR('b', 4)}</defs>` + g(path('M-5 44 C20 30 40 56 60 40 S95 30 105 40 L105 56 C80 48 64 66 42 56 S10 54 -5 62Z', '#7dffc6') + path('M-5 30 C20 18 44 40 64 26 S95 18 105 24 L105 34 C80 30 66 44 44 36 S10 36 -5 42Z', '#c08cff'), 'opacity=".75" filter="url(#b)"') + sparkleField(8, 21, 2.5, 4),
  'w4-legend': path('M22 66 L18 34 L36 50 L50 26 L64 50 L82 34 L78 66Z', GOLD) + `<rect x="22" y="66" width="56" height="9" rx="2" fill="${GOLD_D}"/>` + circle(50, 56, 5, '#ff5d73') + circle(34, 60, 3.5, MINT) + circle(66, 60, 3.5, MINT) + circle(50, 26, 3, '#fff') + circle(18, 34, 3, '#fff') + circle(82, 34, 3, '#fff'),

  // ── Monde 6 · Baie des glaciers ─────────────────────────────
  'w5-frost': [20, 140, 260].map((a) => { const base = pt(50, 50, 52, a); const tip = pt(50, 50, 6, a); let b = stroke(`M${base.join(' ')} L${tip.join(' ')}`, W(0.85), 3); for (const k of [0.2, 0.38, 0.56, 0.74]) { const [mx, my] = pt(50, 50, 52 - 46 * k, a); const L = 15 * (1 - k * 0.7); b += stroke(`M${pt(mx, my, L, a + 140).join(' ')} L${mx} ${my} L${pt(mx, my, L, a - 140).join(' ')}`, W(0.75), 2.4); } return b; }).join('') + sparkle(50, 50, 6, W(0.95)),
  'w5-crack': stroke('M20 20 L40 42 L36 60 L52 78 L48 96 M40 42 L64 36 L82 16 M64 36 L72 58 L92 64 M36 60 L16 70', W(0.85), 2.5) + poly([[24, 26], [40, 42], [34, 30]], W(0.4)),
  'w5-flake': snowflake(50, 50, 34, W(0.92), 4.5),
  'w5-glacier': path('M0 60 H100 V100 H0Z', K(0.18)) + poly([[24, 60], [38, 30], [50, 38], [62, 20], [78, 60]], W(0.92)) + poly([[30, 60], [40, 76], [62, 82], [74, 60]], W(0.4)) + stroke('M0 60 H100', W(0.7), 2),
  'w5-legend': `<defs>${BLUR('b', 3)}</defs>` + circle(50, 50, 14, W(0.7), 'filter="url(#b)"') + star(50, 50, 40, 7, 4, W(), -90) + star(50, 50, 20, 5, 4, W(0.7), -45) + sparkle(76, 24, 6) + sparkle(24, 76, 4),

  // ── Monde 7 · Bois moussu ───────────────────────────────────
  'w6-grain': [10, 18, 26, 34, 42].map((r, i) => `<ellipse cx="${46 + i}" cy="54" rx="${r}" ry="${r * 0.8}" fill="none" stroke="${i % 2 ? K(0.2) : W(0.3)}" stroke-width="3"/>`).join('') + circle(46, 54, 4, K(0.3)),
  'w6-leaf': path('M20 80 C20 40 50 18 84 18 C84 52 62 80 20 80Z', LEAF) + stroke('M22 78 L80 22', W(0.75), 2.5) + [0.3, 0.5, 0.7].map((t) => { const x = 22 + 58 * t; const y = 78 - 56 * t; return stroke(`M${x} ${y} l-6 -12 M${x} ${y} l12 6`, W(0.6), 2); }).join(''),
  'w6-shroom': circle(34, 32, 9, W(0.95)) + circle(64, 26, 7, W(0.95)) + circle(58, 56, 11, W(0.95)) + circle(28, 64, 6, W(0.95)) + circle(78, 46, 5, W(0.95)) + circle(46, 80, 6, W(0.95)) + circle(76, 74, 4, W(0.95)),
  'w6-firefly': `<defs>${BLUR('b', 3)}</defs>` + [[30, 60, 6], [64, 34, 5], [70, 70, 4], [44, 30, 3.5], [50, 50, 3]].map(([x, y, r]) => circle(x, y, r * 1.8, '#fff59a', 'filter="url(#b)"') + circle(x, y, r * 0.7, '#fffbd6')).join(''),
  'w6-legend': `<ellipse cx="50" cy="54" rx="28" ry="32" fill="${W(0.92)}"/>` + `<ellipse cx="40" cy="46" rx="5" ry="7" fill="${INK}"/><ellipse cx="60" cy="46" rx="5" ry="7" fill="${INK}"/><ellipse cx="50" cy="66" rx="4" ry="5.5" fill="${INK}"/>` + path('M50 22 C46 12 54 10 52 4', 'none', `stroke="${LEAF}" stroke-width="3"`) + `<ellipse cx="57" cy="10" rx="7" ry="4" fill="${LEAF}" ${rot(-20, 57, 10)}/>`,

  // ── Monde 8 · Ville néon ────────────────────────────────────
  'w7-grid': circle(50, 40, 18, '#ff9ad8') + `<rect x="0" y="40" width="100" height="6" fill="${K(0.35)}"/><rect x="0" y="50" width="100" height="4" fill="${K(0.35)}"/>` + path('M0 58 H100 V100 H0Z', K(0.35)) + [-60, -30, 0, 30, 60].map((dx) => stroke(`M50 58 L${50 + dx * 2.2} 100`, '#7fe7ff', 2)).join('') + [62, 70, 82].map((y) => stroke(`M0 ${y} H100`, '#7fe7ff', 2)).join(''),
  'w7-pixel': [[2, 0], [3, 0], [5, 0], [6, 0], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [3, 4], [4, 4], [5, 4], [4, 5]].map(([x, y]) => `<rect x="${14 + x * 8}" y="${28 + y * 8}" width="8.4" height="8.4" fill="${W(0.92)}"/>`).join('') + `<rect x="30" y="36" width="8" height="8" fill="${W(0.5)}"/>`,
  'w7-circuit': stroke('M10 40 H34 L44 30 H70 M30 66 H50 L60 56 H90 M50 66 V90 M70 30 V14', W(0.8), 3) + [[34, 40], [70, 30], [60, 56], [50, 90], [70, 14], [30, 66]].map(([x, y]) => circle(x, y, 4.5, W()) + circle(x, y, 2, K(0.4))).join(''),
  'w7-pulse': ring(50, 50, 32, 4, W(0.9)) + ring(50, 50, 20, 3, W(0.6)) + stroke('M14 50 H30 L36 38 L44 62 L52 30 L58 56 L62 50 H86', W(0.95), 3),
  'w7-legend': `<defs><linearGradient id="h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7ad9"/><stop offset=".5" stop-color="#7fe7ff"/><stop offset="1" stop-color="#fff07a"/></linearGradient></defs>` + poly([[50, 18], [80, 72], [20, 72]], 'url(#h)', 'opacity=".85"') + poly([[50, 36], [66, 64], [34, 64]], K(0.35)) + [30, 46, 62, 78].map((y) => `<rect x="0" y="${y}" width="100" height="2" fill="${W(0.25)}"/>`).join(''),

  // ── Monde 9 · Jardins fléchés ───────────────────────────────
  'w8-petal': petals(50, 50, 6, 38, 10, W(0.92), 30) + circle(50, 50, 10, GOLD) + circle(47, 47, 3, '#fff3b0'),
  'w8-hedge': stroke('M14 14 H86 V86 H26 V26 H74 V74 H38 V38 H62 V62 H50', K(0.32), 8) + stroke('M14 14 H86 V86 H26 V26 H74 V74 H38 V38 H62 V62 H50', LEAF, 5),
  'w8-arrow': [22, 42, 62].map((y, i) => stroke(`M26 ${y + 18} L50 ${y} L74 ${y + 18}`, W(0.95 - i * 0.2), 8)).join(''),
  'w8-tulip': stroke('M50 92 V56', LEAF, 5) + path('M50 80 C40 72 36 62 38 56 C44 60 48 68 50 80Z', LEAF) + path('M30 26 L40 38 L50 22 L60 38 L70 26 C74 46 66 60 50 60 C34 60 26 46 30 26Z', '#ff7aa8') + path('M40 38 L50 22 L60 38 C58 50 54 56 50 58 C46 56 42 50 40 38Z', '#ffb3cf'),
  'w8-legend': star(50, 50, 44, 9, 4, W(0.95), -90) + star(50, 50, 30, 7, 4, GOLD, -45) + circle(50, 50, 6, INK) + circle(50, 50, 2.5, GOLD),

  // ── Monde 10 · Mesa du couchant ─────────────────────────────
  'w9-dusk': circle(50, 70, 22, GOLD) + `<rect x="0" y="70" width="100" height="30" fill="${K(0.35)}"/>` + sparkle(24, 26, 5) + sparkle(74, 20, 4) + circle(56, 32, 1.8, W()) + circle(36, 44, 1.5, W()),
  'w9-mesa': circle(70, 34, 10, GOLD) + path('M0 76 L10 76 L14 52 L44 52 L48 76 L60 76 L64 62 L86 62 L90 76 L100 76 V100 H0Z', K(0.38)) + stroke('M14 52 L44 52 M64 62 L86 62', W(0.4), 2),
  'w9-sunset': `<defs><clipPath id="c"><circle cx="50" cy="56" r="28"/></clipPath></defs>` + g([0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="0" y="${28 + i * 9}" width="100" height="${Math.max(2, 9 - i * 1.3)}" fill="${i < 3 ? '#fff3b0' : GOLD}"/>`).join(''), 'clip-path="url(#c)"'),
  'w9-rose': spiral(50, 50, 2.6, 2, 34, 5, W(0.85)) + petals(50, 50, 5, 70, 12, W(0.18), 18),
  'w9-legend': [...Array(10)].map((_, i) => poly([[50, 74], pt(50, 74, 70, -180 + i * 20 - 4), pt(50, 74, 70, -180 + i * 20 + 4)], i % 2 ? W(0.35) : GOLD)).join('') + circle(50, 74, 18, GOLD) + circle(50, 74, 11, '#fff3b0'),

  // ── Monde 11 · Lagune d'orage ───────────────────────────────
  'w10-rain': [[30, 30], [56, 22], [70, 48], [42, 56], [24, 72], [58, 78], [80, 26]].map(([x, y], i) => drop(x, y, 7 - (i % 3), W(0.85))).join(''),
  'w10-ripple': ring(40, 46, 8, 3, W(0.85)) + ring(40, 46, 18, 3, W(0.6)) + ring(40, 46, 28, 3, W(0.35)) + ring(70, 72, 6, 2.5, W(0.7)) + ring(70, 72, 14, 2.5, W(0.4)),
  'w10-cloud': cloud(50, 40, 30, W(0.95)) + [34, 50, 66].map((x) => drop(x, 74, 5, '#bfe9ff')).join(''),
  'w10-bolt': cloud(50, 30, 26, K(0.35)) + poly([[56, 34], [36, 62], [50, 62], [42, 90], [68, 54], [54, 54], [62, 34]], GOLD) + poly([[56, 34], [44, 52], [54, 52], [62, 34]], '#fff3b0'),
  'w10-legend': spiral(50, 50, 1.6, 6, 46, 6, W(0.75)) + spiral(50, 50, 1.6, 6, 46, 6, W(0.75), 180) + circle(50, 50, 7, K(0.35)) + ring(50, 50, 7, 2, W(0.8)),

  // ── Monde 12 · Sommet étoilé ────────────────────────────────
  'w11-stardust': sparkleField(28, 33, 2.5, 4.5),
  'w11-moon': path('M58 18 A32 32 0 1 0 82 70 A26 26 0 1 1 58 18Z', CREAM) + sparkle(70, 30, 6) + sparkle(78, 48, 3.5) + circle(36, 40, 2.2, K(0.12)) + circle(40, 64, 3, K(0.12)),
  'w11-constellation': stroke('M20 66 L36 40 L56 48 L70 24 M56 48 L76 66 L60 82', W(0.55), 2) + [[20, 66, 4], [36, 40, 5], [56, 48, 4], [70, 24, 5.5], [76, 66, 4], [60, 82, 3.5]].map(([x, y, s]) => sparkle(x, y, s * 1.4)).join(''),
  'w11-nebula': `<defs>${BLUR('b', 6)}</defs>` + g(circle(36, 58, 18, '#ff7ad9') + circle(64, 40, 18, '#7fd0ff') + circle(58, 66, 12, '#c79bff'), 'opacity=".7" filter="url(#b)"') + sparkleField(10, 9, 3, 5),
  'w11-legend': `<defs>${BLUR('b', 4)}</defs>` + circle(50, 50, 18, '#fff3b0', 'filter="url(#b)"') + [...Array(16)].map((_, i) => poly([pt(50, 50, 6, i * 22.5 - 4), pt(50, 50, i % 2 ? 30 : 46, i * 22.5), pt(50, 50, 6, i * 22.5 + 4)], i % 2 ? W(0.6) : '#fff')).join('') + circle(50, 50, 8, '#fff'),

  // ── Monde 13 · Vallée des échos ─────────────────────────────
  'w12-echo': [12, 24, 36, 48].map((r, i) => stroke(`M${f(18 + r * 0.7)} ${f(50 - r * 0.7)} A${r} ${r} 0 0 1 ${f(18 + r * 0.7)} ${f(50 + r * 0.7)}`, W(0.9 - i * 0.18), 4)).join('') + circle(18, 50, 5, W()),
  'w12-pebble': `<ellipse cx="50" cy="80" rx="22" ry="9" fill="${W(0.8)}"/><ellipse cx="50" cy="64" rx="17" ry="7.5" fill="${W(0.68)}"/><ellipse cx="50" cy="50" rx="12" ry="6.5" fill="${W(0.8)}"/><ellipse cx="50" cy="38" rx="8" ry="5" fill="${W(0.68)}"/>`,
  'w12-fern': stroke('M30 88 Q50 50 74 18', W(0.85), 3) + [...Array(8)].map((_, i) => { const t = 0.15 + i * 0.1; const x = 30 + 44 * t + 6 * Math.sin(t * 3); const y = 88 - 70 * t; const L = 16 - i * 1.4; return `<ellipse cx="${f(x - L * 0.5)}" cy="${f(y - 2)}" rx="${f(L * 0.55)}" ry="3.2" fill="${W(0.8)}" ${rot(-30, x, y)}/>` + `<ellipse cx="${f(x + L * 0.5)}" cy="${f(y + 2)}" rx="${f(L * 0.55)}" ry="3.2" fill="${W(0.8)}" ${rot(-30, x, y)}/>`; }).join(''),
  'w12-wind': stroke('M8 40 H54 a10 10 0 1 0 -10 -10', W(0.85), 4) + stroke('M14 56 H70 a9 9 0 1 1 -9 9', W(0.75), 4) + stroke('M20 72 H46 a7 7 0 1 0 -7 -7', W(0.6), 3.5),
  'w12-legend': [12, 22, 32, 42].map((r, i) => ring(50, 50, r, 3, W(0.85 - i * 0.18))).join('') + poly([pt(50, 50, 9, -90), pt(50, 50, 9, 0), pt(50, 50, 9, 90), pt(50, 50, 9, 180)], '#fff'),

  // ── Monde 14 · Îles flottantes ──────────────────────────────
  'w13-sky': circle(70, 30, 9, GOLD) + cloud(34, 66, 20, W(0.95)) + cloud(70, 78, 14, W(0.85)),
  'w13-feather': path('M74 16 C40 24 26 56 28 84 C50 76 74 52 74 16Z', W(0.9)) + stroke('M74 16 Q44 52 26 92', K(0.25), 2.5) + [0.3, 0.5, 0.7].map((t) => { const x = 74 - 46 * t; const y = 16 + 72 * t; return stroke(`M${f(x)} ${f(y)} l14 -6`, K(0.15), 2); }).join(''),
  'w13-balloon': path('M50 14 C72 14 80 34 72 50 C66 60 58 64 56 70 H44 C42 64 34 60 28 50 C20 34 28 14 50 14Z', W(0.92)) + path('M50 14 C58 14 62 34 58 50 C56 60 54 64 54 70 H46 C46 64 44 60 42 50 C38 34 42 14 50 14Z', '#ff7a8a') + stroke('M44 70 L46 80 M56 70 L54 80', INK, 1.8) + `<rect x="44" y="80" width="12" height="9" rx="2" fill="${GOLD_D}"/>`,
  'w13-isle': path('M22 52 H78 L62 78 L50 88 L38 78Z', '#9b6b45') + path('M22 52 H78 C78 46 22 46 22 52Z', LEAF) + `<rect x="47" y="30" width="5" height="18" fill="#9b6b45"/>` + circle(49, 28, 11, LEAF) + circle(42, 34, 7, LEAF) + cloud(76, 24, 10, W(0.9)),
  'w13-legend': [-1, 1].map((sx) => g(path('M50 54 C44 36 30 24 12 22 C18 30 18 36 24 42 C18 42 14 46 12 50 C20 52 24 56 28 60 C24 62 22 66 22 70 C34 70 44 64 50 54Z', W(0.92)), sx < 0 ? 'transform="matrix(-1 0 0 1 100 0)"' : '')).join('') + circle(50, 56, 6, GOLD),

  // ── Monde 15 · Cavernes mécaniques ──────────────────────────
  'w14-rivet': ring(50, 50, 36, 6, K(0.22)) + [...Array(10)].map((_, i) => { const [x, y] = pt(50, 50, 36, i * 36); return circle(x, y, 4.5, W(0.9)) + circle(x + 1, y + 1, 2, K(0.25)); }).join(''),
  'w14-brass': gear(72, 72, 30, 9, GOLD_D) + gear(72, 72, 22, 9, GOLD) + `<rect x="0" y="22" width="100" height="5" fill="${K(0.2)}"/><rect x="0" y="30" width="100" height="2.5" fill="${W(0.3)}"/>`,
  'w14-gear': gear(50, 50, 38, 10, W(0.88), 0.32),
  'w14-clock': circle(50, 50, 32, CREAM) + ring(50, 50, 32, 3.5, GOLD_D) + [...Array(12)].map((_, i) => { const [x1, y1] = pt(50, 50, 26, i * 30); const [x2, y2] = pt(50, 50, i % 3 ? 29 : 23, i * 30); return stroke(`M${x1} ${y1} L${x2} ${y2}`, INK, i % 3 ? 1.8 : 3); }).join('') + stroke('M50 50 L50 30 M50 50 L62 56', INK, 3.5) + circle(50, 50, 3, GOLD_D),
  'w14-legend': gear(38, 40, 24, 8, GOLD, 0.3) + gear(68, 66, 18, 7, W(0.85), 0.3),

  // ── Monde 16 · Faille arc-en-ciel ───────────────────────────
  'w15-prism': stroke('M0 56 L42 50', W(0.9), 4) + poly([[50, 24], [72, 66], [28, 66]], W(0.5)) + ring(50, 50, 0.1, 0, 'none') + ['#ff5d73', '#ffc23d', '#5ed36a', '#4aa8ff', '#9a7bff'].map((c, i) => stroke(`M58 ${48 + i * 2.5} L100 ${36 + i * 8}`, c, 3.5)).join('') + stroke('M50 24 L72 66 L28 66Z', W(0.9), 2.5),
  'w15-candy': [...Array(8)].map((_, i) => path(`M50 50 L${pt(50, 50, 70, i * 45).join(' ')} A70 70 0 0 1 ${pt(50, 50, 70, i * 45 + 22.5).join(' ')}Z`, i % 2 ? W(0.25) : W(0.9))).join('') + circle(50, 50, 10, W()),
  'w15-lolly': spiral(50, 50, 3, 2, 40, 7, W(0.92)) + spiral(50, 50, 3, 2, 40, 4, '#ff9ac1', 60),
  'w15-opal': `<defs>${BLUR('b', 5)}</defs>` + g(circle(34, 36, 14, MINT) + circle(66, 44, 12, PINK) + circle(46, 68, 14, SKY) + circle(70, 72, 8, '#fff07a'), 'opacity=".75" filter="url(#b)"') + sparkle(60, 30, 5),
  'w15-legend': ['#ff5d73', '#ffc23d', '#5ed36a', '#4aa8ff', '#9a7bff'].map((c, i) => ring(50, 50, 40 - i * 5, 4.5, c)).join('') + circle(50, 50, 13, W(0.95)),

  // ── Mignonnes ───────────────────────────────────────────────
  'cute-smile': eyes(38, 62, 44, 5.5) + smile(50, 58, 11, INK, 4.5) + blush(28, 72, 60),
  'cute-wink': circle(38, 44, 5.5, INK) + circle(40, 42, 1.9, W()) + stroke('M56 44 Q62 38 68 44', INK, 4) + smile(50, 58, 10, INK, 4.5) + blush(28, 72, 60),
  'cute-cool': path('M20 38 H80 V44 C80 54 72 58 64 56 C58 54 55 50 54 46 H46 C45 50 42 54 36 56 C28 58 20 54 20 44Z', INK) + path('M26 42 L34 42 L28 50Z', W(0.45)) + path('M58 42 L66 42 L60 50Z', W(0.45)) + stroke('M40 68 Q52 74 62 66', INK, 4),
  'cute-cat': eyes(37, 63, 46, 5) + path('M46 58 L54 58 L50 62Z', PINK) + stroke('M50 62 Q46 68 42 65 M50 62 Q54 68 58 65', INK, 3) + stroke('M14 56 L32 58 M14 64 L32 62 M86 56 L68 58 M86 64 L68 62', INK, 2.2) + poly([[20, 26], [30, 6], [38, 24]], K(0.25)) + poly([[80, 26], [70, 6], [62, 24]], K(0.25)),

  // ── Saison ──────────────────────────────────────────────────
  'season-comet': `<defs><linearGradient id="t" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".9"/></linearGradient></defs>` + path('M12 88 L62 30 L72 40Z', 'url(#t)') + circle(66, 34, 11, '#fff') + circle(66, 34, 6, '#fff3b0') + sparkleField(6, 4, 2.5, 4),
  'season-crown': path('M18 68 L14 32 L34 50 L50 22 L66 50 L86 32 L82 68Z', GOLD) + `<rect x="18" y="68" width="64" height="11" rx="3" fill="${GOLD_D}"/>` + circle(50, 58, 6.5, '#ff5d73') + circle(32, 62, 4.5, '#4aa8ff') + circle(68, 62, 4.5, '#5ed36a') + [[14, 32], [50, 22], [86, 32]].map(([x, y]) => circle(x, y, 4, '#fff')).join(''),
  'season-rainbow': ['#ff5d73', '#ffc23d', '#5ed36a', '#4aa8ff', '#9a7bff'].map((c, i) => stroke(`M${12 + i * 6} 72 A${38 - i * 6} ${38 - i * 6} 0 0 1 ${88 - i * 6} 72`, c, 6)).join('') + cloud(20, 74, 12, '#fff') + cloud(80, 74, 12, '#fff'),
  'season-phoenix': `<defs>${BLUR('b', 2.5)}</defs>` + g(path('M50 70 C36 56 18 50 6 30 C26 36 36 34 46 44 C42 30 44 18 50 8 C56 18 58 30 54 44 C64 34 74 36 94 30 C82 50 64 56 50 70Z', '#ff8a3d'), 'filter="url(#b)"') + path('M50 70 C38 58 24 52 14 36 C30 40 38 40 46 48 C44 36 46 24 50 16 C54 24 56 36 54 48 C62 40 70 40 86 36 C76 52 62 58 50 70Z', '#ffd36b') + path('M50 70 L44 92 L50 84 L56 92Z', '#ff8a3d') + circle(50, 44, 5, '#fff3b0'),
};

/** Skins whose body is not the plain glossy colour. */
export const BODY = {
  glass: 'radial-gradient(circle at 50% 55%, color-mix(in srgb, var(--col) 40%, transparent) 0 40%, color-mix(in srgb, var(--col) 90%, transparent) 78%, var(--col))',
  metal: 'linear-gradient(170deg, color-mix(in srgb, var(--col) 35%, #fff) 0 20%, var(--col) 42%, var(--cold) 62%, color-mix(in srgb, var(--col) 60%, #fff) 74%, var(--cold) 100%)',
  galaxy: 'radial-gradient(circle at 55% 55%, var(--col) 0, var(--cold) 45%, #0b0820 92%)',
  neon: 'radial-gradient(circle, #10122a 0 54%, var(--col) 64%, color-mix(in srgb, var(--col) 45%, #fff) 72%, var(--col) 82%)',
  'w2-obsidian': 'radial-gradient(circle at 40% 35%, color-mix(in srgb, var(--col) 45%, #2a2236), #120e1a 75%)',
  'w2-lava': 'radial-gradient(circle at 45% 40%, var(--col), var(--cold) 58%, #2a0d05)',
  'w6-firefly': 'radial-gradient(circle at 45% 40%, var(--col), var(--cold) 62%, #0d1f12)',
  'w7-pulse': 'radial-gradient(circle, #10122a 0 60%, var(--col) 70%, var(--cold) 100%)',
  'w10-bolt': 'radial-gradient(circle at 45% 40%, var(--col), var(--cold) 55%, #141a33)',
  'w11-nebula': 'radial-gradient(circle at 50% 50%, var(--col) 0, var(--cold) 55%, #120c2e 95%)',
};

/** Ring of the gameplay colour for dark-bodied skins (keeps the colour obvious). */
export const RIM = new Set(['galaxy', 'neon', 'w2-obsidian', 'w2-lava', 'w6-firefly', 'w7-pulse', 'w10-bolt', 'w11-nebula']);

/** Animations of the artwork layer. */
export const ANIM = {
  'w0-legend': 'sk2-shimmer 3s ease-in-out infinite',
  'w1-legend': 'sk2-wobble 2.4s ease-in-out infinite',
  'w2-lava': 'sk2-glow 1.6s ease-in-out infinite',
  'w2-legend': 'sk2-flame 1s ease-in-out infinite',
  'w3-jelly': 'sk2-float 2.6s ease-in-out infinite',
  'w3-legend': 'sk2-pulse 1.8s ease-in-out infinite',
  'w4-aurora': 'sk2-sway 4s ease-in-out infinite alternate',
  'w4-legend': 'sk2-pulse 2.2s ease-in-out infinite',
  'w5-legend': 'sk2-twinkle 1.6s ease-in-out infinite',
  'w6-firefly': 'sk2-glow 1.3s ease-in-out infinite',
  'w6-legend': 'sk2-float 2.4s ease-in-out infinite',
  'w7-pulse': 'sk2-glow 1.2s ease-in-out infinite',
  'w7-legend': 'sk2-hue 3s linear infinite',
  'w8-legend': 'sk2-spin 9s linear infinite',
  'w9-legend': 'sk2-pulse 2.4s ease-in-out infinite',
  'w10-bolt': 'sk2-flash 2.6s ease-in-out infinite',
  'w10-legend': 'sk2-spin 3s linear infinite',
  'w11-legend': 'sk2-pulse 1.4s ease-in-out infinite',
  'w12-legend': 'sk2-pulse 1.2s ease-in-out infinite',
  'w13-legend': 'sk2-float 2.4s ease-in-out infinite',
  'w14-gear': 'sk2-spin 7s linear infinite',
  'w14-legend': 'sk2-spin 6s linear infinite',
  'w15-lolly': 'sk2-spin 6s linear infinite',
  'w15-opal': 'sk2-hue 5s linear infinite',
  'w15-legend': 'sk2-spin 4s linear infinite',
  'season-comet': 'sk2-twinkle 1.4s ease-in-out infinite',
  'season-crown': 'sk2-pulse 1.6s ease-in-out infinite',
  'season-phoenix': 'sk2-flame 1.1s ease-in-out infinite',
  galaxy: 'sk2-spin 24s linear infinite',
  neon: 'sk2-glow 1.8s ease-in-out infinite',
};

/** SVG data URI for a skin's artwork (or '' for none). */
export function artURI(id) {
  const body = ART[id];
  if (!body) return '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
