// Illustrated props for the adventure map, part 2: worlds 9-16.
// Same conventions as map-props.js: drawn on (0,0) upwards, lit from the top-left.
import { ball, dark, f, glow, light, lin, rad, shade, closedD } from './map-kit.js';
import { C, E, L, P, R, ST, bloom, crown, crystal, frond, hshade, op, rock, tuft } from './map-props.js';

/* ---------- WORLD 9 — Arrow Gardens ---------- */
const pot = (c = '#d9774a') => P('M-9 0L-11 -12H11L9 0Z', hshade(c, 0.25)) + R(-12.5, -15.5, 25, 4.5, lin([light(c, 0.25), c]), 1.5) + E(3, -5, 2, 4, light(c, 0.3), op(0.25));
const topiary = (p) => pot() + L('M0 -15V-21', p.bark, 3) + crown([[0, -32, 12.5], [-7, -27, 8], [7, -27, 8]], p.leaf);
const topiary2 = (p) => pot('#c9663e') + crown([[0, -24, 9.5]], p.leaf) + crown([[0, -38, 7.5]], p.leaf) + crown([[0, -49, 5.5]], p.leaf) + C(0, -56, 2, '#ffd34d');
const flowerbed = (p) => {
  let fl = '';
  const cols = p.flower;
  const spots = [[-15, -8], [-8, -11], [0, -9], [8, -11], [15, -8], [-11, -4], [-3, -5], [5, -5], [12, -4], [-4, -13], [4, -13]];
  spots.forEach(([x, y], i) => (fl += bloom(x, y, 3.2, cols[i % cols.length], '#fff3a0')));
  return E(0, -6, 25, 10, lin(['#c98a5a', '#8a5236'])) + E(0, -7.5, 22, 7.6, lin(['#5a3a24', '#3e2618'])) + tuft(-12, -5, 6, p.leaf[0], p.leaf[1], 4) + tuft(10, -5, 6, p.leaf[0], p.leaf[1], 4) + fl;
};
const arrowpost = (p) => {
  const board = (y, dir, c) => {
    const x0 = dir > 0 ? -4 : 4;
    const x1 = x0 + dir * 24;
    return P(`M${x0} ${y - 5}H${x1}L${x1 + dir * 6} ${y}L${x1} ${y + 5}H${x0}Z`, lin([light(c, 0.2), dark(c, 0.15)])) + L(`M${x0 + dir * 4} ${y}H${x1 - dir * 2}M${x1 - dir * 6} ${y - 3}L${x1 - dir * 2} ${y}L${x1 - dir * 6} ${y + 3}`, '#ffffff', 1.8, op(0.9));
  };
  return R(-3, -52, 6, 52, hshade('#9a6a3c', 0.3), 1.5) + board(-44, 1, p.arrow[0]) + board(-31, -1, p.arrow[1]) + board(-18, 1, p.arrow[2]) + C(0, -54, 3.5, ball('#ffd34d'));
};
const bench = () =>
  L('M-18 0V-10M18 0V-10M-16 -10V-24M16 -10V-24', '#3a3a4a', 2.4) +
  R(-20, -12, 40, 4, lin(['#d9a46a', '#a8743f']), 1.5) +
  R(-19, -26, 38, 4, lin(['#d9a46a', '#a8743f']), 1.5) +
  R(-19, -20, 38, 4, lin(['#d9a46a', '#a8743f']), 1.5);
const gardenlamp = () =>
  glow(0, -48, 18, 16, '#fff3a0', 0.5) +
  L('M0 0V-40', '#2a2f3a', 3.6) +
  L('M-1 -2V-38', '#5a6070', 1, op(0.8)) +
  R(-5, -4, 10, 4, '#2a2f3a', 1.5) +
  P('M-6 -40H6L4 -54H-4Z', lin(['#fffbe0', '#ffd36b'])) +
  P('M-8 -54H8L0 -61Z', '#2a2f3a') +
  L('M-6 -40H6', '#2a2f3a', 2);
const fountain = (p) =>
  E(0, -8, 40, 14, lin(['#e6e0d4', '#a89e8e'])) +
  E(0, -11, 34, 10, lin(['#4fb8e8', '#2f86c8'])) +
  E(-10, -14, 12, 3, '#bfe9ff', op(0.7)) +
  R(-4, -34, 8, 24, hshade('#ddd6c8', 0.2), 2) +
  E(0, -34, 14, 4.6, lin(['#f2ece0', '#bdb3a2'])) +
  E(0, -35, 11, 3, '#5ec4f0') +
  `<g class="m-splash">${L('M0 -38Q-2 -52 -12 -40M0 -38Q2 -52 12 -40M0 -38V-52', '#e6f8ff', 2.4, op(0.9))}${C(-14, -30, 1.6, '#e6f8ff')}${C(15, -28, 1.6, '#e6f8ff')}${C(-22, -16, 1.4, '#e6f8ff')}${C(22, -14, 1.4, '#e6f8ff')}</g>` +
  L('M-30 -12Q-20 -17 -8 -15', '#ffffff', 1.4, op(0.7));
const gazebo = (p) =>
  E(0, -4, 36, 11, lin(['#f2ece0', '#bdb3a2'])) +
  E(0, -7, 32, 8, '#fffaf0') +
  L('M-26 -6V-42M26 -6V-42M-12 -3V-40M12 -3V-40', '#ffffff', 4) +
  L('M-26 -6V-42M26 -6V-42M-12 -3V-40M12 -3V-40', '#c9c2b4', 1.2, op(0.7)) +
  P('M-36 -40Q0 -50 36 -40L30 -46Q0 -84 -30 -46Z', lin([light(p.roof, 0.25), p.roof, dark(p.roof, 0.2)], 0, 0, 1, 1)) +
  L('M-36 -40Q0 -50 36 -40', '#ffffff', 2.6) +
  C(0, -72, 3, '#ffd34d') +
  L('M-30 -20Q-26 -26 -22 -20M22 -20Q26 -26 30 -20', p.leaf[1], 3);
const rosebush = (p) => crown([[-8, -10, 9], [8, -10, 9], [0, -17, 10]], p.leaf) + bloom(-6, -14, 3.4, '#ff4d6d', '#ff9fb2', 6) + bloom(6, -18, 3.4, '#ff4d6d', '#ff9fb2', 6) + bloom(2, -8, 3, '#ff6b81', '#ffc2cf', 6);
const butterfly = (p) =>
  `<g>${E(-5, -30, 5, 4, p.flower[1], ' transform="rotate(-25 -5 -30)"')}${E(5, -30, 5, 4, p.flower[1], ' transform="rotate(25 5 -30)"')}${E(-4, -25, 3.4, 2.6, p.flower[0])}${E(4, -25, 3.4, 2.6, p.flower[0])}${L('M0 -32V-23', '#3a2a3a', 1.6)}</g>`;

/* ---------- WORLD 10 — Sunset Mesa ---------- */
const butte = (p) => {
  const c = p.stone;
  return (
    P('M-44 0L-34 -46H32L44 0Z', lin([light(c, 0.15), c, dark(c, 0.35)], 0, 0, 1, 0)) +
    P('M32 -46L44 0H20L24 -46Z', dark(c, 0.3), op(0.6)) +
    L('M-41 -12H42M-38 -26H39M-36 -38H35', dark(c, 0.3), 1.8, op(0.55)) +
    E(-1, -46, 33, 6, lin([light(c, 0.3), light(c, 0.1)])) +
    P('M-30 -47Q-10 -51 10 -49', 'none', ST('#fff1d0', 1.8) + op(0.7)) +
    tuft(-18, -48, 6, '#8a7a3a', '#b9a24a', 4) +
    tuft(14, -47, 5, '#8a7a3a', '#b9a24a', 4)
  );
};
const tumbleweed = () =>
  `<g>${C(0, -12, 12, 'none', ST('#a8742e', 2.4))}${L('M-9 -18Q0 -4 9 -18M-9 -6Q0 -20 9 -6M-11 -12H11M-4 -23Q4 -12 -3 -1M5 -22Q-3 -12 4 -1', '#c9963e', 1.6)}${C(0, -12, 12, 'none', ST('#e8c06a', 0.8) + op(0.6))}</g>`;
const windmill = (p) => {
  let blades = '';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    blades += `M${f(Math.cos(a) * 3)} ${f(Math.sin(a) * 3)}L${f(Math.cos(a - 0.12) * 17)} ${f(Math.sin(a - 0.12) * 17)}L${f(Math.cos(a + 0.12) * 17)} ${f(Math.sin(a + 0.12) * 17)}Z`;
  }
  return (
    L('M-12 0L-3 -62M12 0L3 -62M-9 -14H9M-7 -30H7M-5 -46H5M-10 -6L7 -24M10 -6L-7 -24M-7 -30L5 -46M7 -30L-5 -46', '#5a4636', 2.2) +
    `<g transform="translate(0 -66)"><g class="m-spin">${P(blades, lin(['#f2e6d0', '#c9b494']))}${C(0, 0, 4, '#5a4636')}</g></g>` +
    P('M2 -66L22 -70L22 -62Z', '#c94a3a')
  );
};
const fence = () =>
  L('M-22 0V-18M-7 0V-19M8 0V-18M23 0V-17', '#7a4a2a', 4) +
  L('M-22 0V-18M-7 0V-19M8 0V-18M23 0V-17', '#b07a44', 1.6, op(0.8)) +
  L('M-24 -14H25M-24 -6H25', '#8a5a32', 3) +
  L('M-24 -15H25', '#c99a5a', 1, op(0.8));
const drybush = (p) => L('M0 0L-8 -12L-12 -14M-8 -12L-6 -20M0 0L2 -16L-1 -22M2 -16L7 -20M0 0L10 -9L14 -10M10 -9L12 -15', p.dry, 2) + L('M0 0L-8 -12M0 0L2 -16M0 0L10 -9', light(p.dry, 0.3), 1, op(0.7));
const rockarch = (p) => {
  const c = p.stone;
  return (
    P('M-44 0Q-46 -40 -20 -56Q0 -66 22 -56Q46 -42 44 0H28Q30 -30 14 -40Q0 -46 -12 -40Q-28 -30 -26 0Z', lin([light(c, 0.15), c, dark(c, 0.3)], 0, 0, 1, 0)) +
    L('M-40 -14Q-38 -30 -30 -40M30 -40Q38 -30 40 -14M-14 -50Q0 -56 16 -50', dark(c, 0.25), 1.8, op(0.6)) +
    L('M-36 -38Q-26 -54 -6 -58', light(c, 0.4), 2.4, op(0.6))
  );
};

/* ---------- WORLD 11 — Storm Lagoon ---------- */
const lighthouse = (p) =>
  rock(-6, -2, 26, 8, '#5a6878', 0.4) +
  P('M-12 -10L-8 -66H8L12 -10Z', hshade('#ffffff', 0.15)) +
  P('M-11.4 -22H11.4L10.6 -32H-10.6ZM-9.8 -44H9.8L9.1 -54H-9.1Z', '#e8463a') +
  R(-12, -70, 24, 5, '#3a4252', 1.5) +
  R(-7, -82, 14, 12, rad([[0, '#ffffff'], [0.5, '#fff3a0'], [1, '#ffc23d']]), 2) +
  P('M-10 -82L0 -92L10 -82Z', '#e8463a') +
  `<path class="m-beam" d="M4 -76L90 -96L90 -58Z" fill="${lin([[0, '#fff3a0', 0.75], [1, '#fff3a0', 0]], 0, 0, 1, 0)}"/>` +
  glow(0, -76, 18, 16, '#fff3a0', 0.7);
const buoy = () =>
  `<g>${E(0, -2, 15, 4, '#ffffff', op(0.45))}${P('M-12 -4Q0 3 12 -4L8 -24H-8Z', shade('#ff5d5d', 0.25))}${R(-9.6, -16, 19.2, 5, '#ffffff')}${L('M0 -24V-36', '#3a3f4c', 2.4)}${C(0, -38, 3.6, '#fff3a0')}${glow(0, -38, 10, 10, '#fff3a0', 0.6)}</g>`;
const islet = (p) =>
  E(0, -2, 34, 8, '#ffffff', op(0.5)) +
  E(0, -4, 30, 9, lin(['#f2dca0', '#c9a66a'])) +
  `<g transform="translate(4 -6) scale(.6)">${frond(0, -60, -2.6, 36, 9, 12, p.leaf[0], p.leaf[1])}${P('M-4 0C-2 -20 2 -40 6 -60L10 -60C6 -40 4 -20 4 0Z', hshade('#9a6a3c', 0.3))}${frond(8, -60, -0.5, 36, 9, 12, p.leaf[1], p.leaf[2])}${frond(8, -60, -1.6, 30, 8, 6, p.leaf[1], p.leaf[2])}${frond(8, -60, -2.2, 34, 9, 14, p.leaf[0], p.leaf[1])}</g>` +
  rock(-16, -5, 8, 3.4, '#6a7888', 0.2);
const stormcloud = () =>
  `<g>${L('M-14 -28l-4 12M-4 -28l-4 14M6 -28l-4 12M16 -28l-4 10', '#a8c4e8', 1.6, op(0.75))}${P('M-26 -34C-30 -44 -18 -52 -10 -46C-6 -58 12 -58 14 -46C24 -50 32 -40 26 -32Q0 -26 -26 -34Z', lin(['#9aa6c0', '#5a6680']))}${P('M-20 -42C-16 -48 -8 -46 -8 -44C-4 -52 8 -52 10 -46', 'none', ST('#c9d2e6', 2) + op(0.7))}</g>`;
const seagull = () => `<g>${L('M-12 -40Q-6 -46 0 -40Q6 -46 12 -40', '#ffffff', 2.8)}${L('M-12 -40Q-6 -46 0 -40Q6 -46 12 -40', '#5a6070', 1, op(0.5))}</g>`;
const dockposts = () => L('M-10 0V-14M0 2V-16M10 0V-12', '#3a2a1e', 5) + L('M-10 0V-14M0 2V-16M10 0V-12', '#6a4a32', 2.4) + E(0, 0, 18, 4, '#ffffff', op(0.4));

/* ---------- WORLD 12 — Starlight Summit ---------- */
const observatory = (p) =>
  R(-26, -26, 52, 26, hshade('#c9c6e6', 0.2), 2) +
  R(-26, -28, 52, 4, '#8a86b8') +
  P('M-24 -28A24 24 0 0 1 24 -28Z', lin(['#f2f0ff', '#b9b4e0', '#8a84c4'], 0, 0, 1, 1)) +
  P('M-3 -51L3 -51L4 -28H-4Z', '#2a2a5a') +
  L('M0 -40L18 -62', '#6a6aa0', 5) +
  L('M0 -40L18 -62', '#a8a6d8', 2) +
  R(-6, -16, 12, 16, '#2a2a5a', 6) +
  R(-20, -18, 8, 7, '#ffd36b', 1.5) +
  R(12, -18, 8, 7, '#ffd36b', 1.5) +
  glow(0, -10, 40, 14, '#ffd36b', 0.25);
const starlantern = (p) => {
  let st = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 3.4 : 8;
    st += `${i ? 'L' : 'M'}${f(Math.cos(a) * r)} ${f(-44 + Math.sin(a) * r)}`;
  }
  return glow(0, -44, 20, 18, '#fff3a0', 0.55) + L('M0 0V-34', '#3a3870', 3) + L('M0 0V-34', '#7a76c0', 1, op(0.8)) + P(`${st}Z`, rad([[0, '#ffffff'], [0.6, '#fff3a0'], [1, '#ffc23d']]));
};
const telescope = () =>
  L('M0 -20L-10 0M0 -20L10 0M0 -20V0', '#3a3870', 2.6) +
  `<g transform="rotate(-32 0 -24)">${R(-18, -30, 36, 11, lin(['#b9b4e0', '#6a66a8']), 4)}${R(14, -32, 7, 15, '#ffd36b', 2)}${R(-20, -28, 5, 7, '#3a3870', 1.5)}</g>`;
const campfire = () =>
  glow(0, -8, 36, 20, '#ffb03a', 0.5) +
  L('M-12 -2L10 -8M-10 -8L12 -2', '#5a3424', 4.4) +
  `<g class="m-flicker">${P('M-8 -6Q-10 -18 -2 -28Q0 -18 6 -22Q10 -12 6 -6Z', lin(['#fff3a0', '#ffb03a', '#ff5a1f']))}${P('M-3 -7Q-4 -14 0 -19Q2 -13 4 -14Q5 -9 3 -7Z', '#fffbe0')}</g>` +
  C(-14, -2, 3, '#8a8aa0') +
  C(14, -1, 3, '#7a7a90');
const nighttent = (p) =>
  P('M-28 0L-4 -36L24 0Z', lin(['#ff8a5c', '#c94a3a'], 0, 0, 1, 1)) +
  P('M-4 -36L24 0H8Z', '#8a2e24', op(0.6)) +
  P('M-12 0L-4 -18L4 0Z', '#ffd36b') +
  glow(-4, -4, 20, 9, '#ffd36b', 0.55) +
  L('M-4 -36L-6 -42', '#3a2a2a', 1.6);

/* ---------- WORLD 13 — Echo Valley ---------- */
const brokencolumn = (p) => {
  const c = p.ruin;
  return (
    R(-9, -40, 18, 40, hshade(c, 0.22)) +
    L('M-4 -38V-2M1 -38V-2M6 -38V-2', dark(c, 0.2), 1.2, op(0.55)) +
    P('M-9 -40L-6 -46L-1 -42L3 -49L9 -43V-40Z', c) +
    R(-12, -4, 24, 4, light(c, 0.15), 1.5) +
    P('M10 -2L22 -10L30 -4L18 4Z', hshade(c, 0.2)) +
    P('M-6 -30Q-12 -20 -8 -8', 'none', ST(p.ivy, 2.4)) +
    E(-9, -22, 3, 2, p.ivy) +
    E(-7, -12, 3, 2, p.ivy)
  );
};
const ruinarch = (p) => {
  const c = p.ruin;
  let bl = '';
  for (let i = 1; i < 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    bl += `M${f(Math.cos(a) * 34)} ${f(-36 + Math.sin(a) * 34)}L${f(Math.cos(a) * 20)} ${f(-36 + Math.sin(a) * 20)}`;
  }
  return (
    R(-34, -38, 14, 38, hshade(c, 0.22)) +
    R(20, -38, 14, 38, hshade(c, 0.22)) +
    P('M-34 -36A34 34 0 0 1 34 -36H20A20 20 0 0 0 -20 -36Z', lin([light(c, 0.2), c, dark(c, 0.25)], 0, 0, 1, 1)) +
    L(bl, dark(c, 0.3), 1.2, op(0.6)) +
    L('M-34 -12H-20M-34 -24H-20M20 -18H34M20 -30H34', dark(c, 0.25), 1.1, op(0.55)) +
    P('M-30 -50Q-20 -40 -24 -24Q-22 -14 -26 -6', 'none', ST(p.ivy, 2.6)) +
    E(-26, -40, 4, 2.6, p.ivy) +
    E(-22, -28, 3.6, 2.4, p.ivy) +
    E(-27, -16, 3.6, 2.4, p.ivy) +
    E(26, -60, 5, 3, p.ivy)
  );
};
const stonehead = (p) => {
  const c = p.ruin;
  return (
    P('M-20 0V-40Q-20 -62 0 -64Q20 -62 20 -40V0Z', lin([light(c, 0.1), dark(c, 0.15)], 0, 0, 1, 0)) +
    P('M-14 -38Q-8 -42 -3 -38M3 -38Q8 -42 14 -38', 'none', ST(dark(c, 0.45), 2.4)) +
    P('M-2 -36L-5 -22H4Z', dark(c, 0.15)) +
    P('M-8 -14Q0 -10 8 -14', 'none', ST(dark(c, 0.45), 2.2)) +
    P('M-20 -46Q-6 -60 10 -62Q-2 -54 -8 -44Z', p.ivy, op(0.9)) +
    E(-16, -30, 4, 3, p.ivy) +
    L('M14 -54Q18 -30 15 -6', light(c, 0.35), 1.6, op(0.5))
  );
};
const cypress = (p) => {
  const [c0, c1, c2] = p.leaf;
  return R(-2, -8, 4, 8, p.bark) + P('M0 -64Q12 -40 9 -16Q6 -6 0 -6Q-6 -6 -9 -16Q-12 -40 0 -64Z', c0) + P('M0 -62Q-10 -40 -7 -18Q-4 -9 1 -8Q-2 -30 0 -62Z', c1) + P('M-2 -52Q-6 -40 -5 -28', 'none', ST(c2, 2) + op(0.7));
};
const amphora = (p) => P('M-5 -30H5L4 -26Q12 -20 10 -10Q8 -2 0 0Q-8 -2 -10 -10Q-12 -20 -4 -26Z', hshade('#c9773e', 0.28)) + L('M-5 -28Q-12 -26 -9 -18M5 -28Q12 -26 9 -18', '#a8562a', 1.8) + L('M-8 -14H8', '#7a3a1e', 1.6, op(0.6)) + P('M8 -2L18 2L10 4Z', hshade('#c9773e', 0.2));
const obelisk = (p) => {
  const c = p.ruin;
  return P('M-8 0L-6 -50L0 -58L6 -50L8 0Z', lin([light(c, 0.15), dark(c, 0.2)], 0, 0, 1, 0)) + L('M-2 -44v4M-2 -34h4M-3 -26l3 3l3 -3M-2 -16v5', dark(c, 0.4), 1.4) + R(-11, -4, 22, 4, light(c, 0.1), 1);
};
const valleybush = (p) => crown([[-8, -8, 8], [8, -8, 8], [0, -14, 9]], p.leaf);

/* ---------- WORLD 14 — Floating Isles ---------- */
const isle = (v) => (p) => {
  const under = 'M-30 -18Q-26 4 -12 14Q-4 30 2 22Q8 14 16 12Q26 0 30 -18Z';
  return (
    P(under, lin(['#b08060', '#6a4a3a', '#4a3028'])) +
    L('M-20 -8Q-14 4 -8 10M8 -6Q12 4 14 8M-2 -10V16', '#4a3028', 1.4, op(0.6)) +
    E(0, -18, 31, 9, lin(['#8fe07a', '#4fae5a'])) +
    E(-6, -20, 20, 4.4, '#b6f29a', op(0.6)) +
    (v === 0
      ? `<g transform="translate(8 -20) scale(.7)">${R(-4, -18, 8, 18, hshade('#8a5a32', 0.3))}${crown([[-10, -28, 11], [10, -28, 11], [0, -40, 13]], p.leaf)}</g>`
      : `<g transform="translate(6 -20)">${R(-10, -16, 20, 16, hshade('#fff4e0', 0.15))}${P('M-13 -15L0 -26L13 -15Z', shade('#e8634a', 0.2))}${R(-3, -9, 6, 9, '#7a4a2a', 1)}</g>`) +
    (v === 0 ? L('M-24 -12Q-26 6 -22 24', '#bfe9ff', 2.6, op(0.85)) : '') +
    bloom(-16, -20, 2.4, '#ff9fc2')
  );
};
const balloon = (p) =>
  `<g>${L('M-8 -26L-5 -10M8 -26L5 -10', '#5a4636', 1.2)}${P('M0 -62C-18 -62 -20 -40 -9 -28Q-5 -24 -4 -22H4Q5 -24 9 -28C20 -40 18 -62 0 -62Z', lin([p.balloon[0], p.balloon[1]], 0, 0, 1, 0))}${P('M0 -62C-6 -56 -6 -34 -4 -22H4C6 -34 6 -56 0 -62Z', '#ffffff', op(0.85))}${E(-8, -50, 3, 6, '#ffffff', op(0.35))}${R(-6, -12, 12, 10, lin(['#c9905a', '#8a5a32']), 2)}</g>`;
const airship = (p) =>
  `<g>${E(0, -50, 46, 15, lin(['#ffe0b0', '#e8a85a', '#b06a2a']))}${L('M-30 -50H30M-36 -44H36M-34 -56H34', '#b06a2a', 1.2, op(0.5))}${E(-14, -58, 18, 4, '#ffffff', op(0.4))}${P('M40 -50L54 -62V-38Z', '#c94a3a')}${L('M-12 -36L-8 -28M12 -36L8 -28', '#5a4636', 1.4)}${R(-14, -30, 28, 9, lin(['#8a5a32', '#5a3a22']), 3)}${R(-9, -28, 4, 4, '#ffd36b', 1)}${R(-1, -28, 4, 4, '#ffd36b', 1)}${R(7, -28, 4, 4, '#ffd36b', 1)}${E(-50, -50, 2, 8, '#5a4636')}</g>`;
const cloudpuff = () =>
  `<g>${P('M-30 -10C-36 -22 -22 -32 -12 -26C-8 -40 12 -40 16 -28C26 -34 38 -24 32 -12Q0 -4 -30 -10Z', lin(['#ffffff', '#e2eefa']))}${P('M-30 -10Q0 -4 32 -12Q28 -6 18 -5Q0 -2 -22 -5Q-28 -6 -30 -10Z', '#c6daf0', op(0.8))}</g>`;
const birds = () => `<g>${L('M-10 -40q4 -4 8 0q4 -4 8 0M6 -48q3 -3 6 0q3 -3 6 0', '#5a6a8a', 1.6)}</g>`;

/* ---------- WORLD 15 — Clockwork Caves ---------- */
const gearShape = (r, teeth, c) => {
  let d = '';
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i * Math.PI) / teeth;
    const rr = i % 2 ? r * 0.78 : r;
    const a1 = a - Math.PI / teeth / 2.4;
    const a2 = a + Math.PI / teeth / 2.4;
    d += `${i ? 'L' : 'M'}${f(Math.cos(a1) * rr)} ${f(Math.sin(a1) * rr)}L${f(Math.cos(a2) * rr)} ${f(Math.sin(a2) * rr)}`;
  }
  return P(`${d}Z`, lin([light(c, 0.3), c, dark(c, 0.3)], 0, 0, 1, 1)) + C(0, 0, r * 0.55, 'none', ST(dark(c, 0.3), r * 0.12)) + C(0, 0, r * 0.22, dark(c, 0.4)) + C(-r * 0.1, -r * 0.1, r * 0.08, light(c, 0.5));
};
const gear = (p) => `<g transform="translate(0 -22)"><g class="m-spin">${gearShape(20, 10, p.brass)}</g></g>` + R(-3, -4, 6, 4, '#3a2f27');
const gears2 = (p) => `<g transform="translate(-10 -30)"><g class="m-spin">${gearShape(16, 9, p.brass)}</g></g><g transform="translate(14 -16)"><g class="m-spinr">${gearShape(11, 7, p.copper)}</g></g>`;
const pipes = (p) =>
  L('M-22 0V-30Q-22 -38 -14 -38H6Q14 -38 14 -46V-52', '#2a2018', 12) +
  L('M-22 0V-30Q-22 -38 -14 -38H6Q14 -38 14 -46V-52', p.copper, 8) +
  L('M-24 0V-30Q-24 -40 -14 -40H6', light(p.copper, 0.4), 1.6, op(0.7)) +
  R(8, -58, 12, 7, p.brass, 2) +
  `<g transform="translate(-22 -18)">${C(0, 0, 7, 'none', ST(p.brass, 2.4))}${L('M-7 0H7M0 -7V7', p.brass, 1.6)}</g>` +
  `<g class="m-smoke">${C(14, -64, 5, '#d6cfc6', op(0.5))}${C(18, -74, 7, '#e6e0d8', op(0.35))}</g>`;
const cavelantern = (p) => glow(0, -30, 22, 20, '#ffcf70', 0.55) + L('M0 0V-24', '#2a2018', 3) + R(-6, -38, 12, 14, lin(['#fff3a0', '#ffb03a']), 3) + R(-7.5, -40, 15, 3, '#2a2018', 1) + R(-7.5, -24, 15, 3, '#2a2018', 1) + L('M-6 -31H6', '#2a2018', 1, op(0.6));
const minecart = (p) =>
  L('M-30 0H30', '#3a3f4c', 2.4) +
  P('M-22 -4L-26 -24H26L22 -4Z', lin([light(p.copper, 0.15), dark(p.copper, 0.3)], 0, 0, 1, 0)) +
  L('M-25 -18H25M-23 -10H23', dark(p.copper, 0.4), 1.4, op(0.6)) +
  C(-13, -3, 5, '#2a2018') +
  C(13, -3, 5, '#2a2018') +
  C(-13, -3, 2, '#8a8a9a') +
  C(13, -3, 2, '#8a8a9a') +
  `<g transform="translate(0 -24)">${crystal(-12, 14, 5, -2, p.gem)}${crystal(2, 18, 6, 1, light(p.gem, 0.15))}${crystal(13, 12, 5, 2, p.gem)}</g>` +
  glow(0, -30, 24, 12, p.gem, 0.4);
const stalagmite = (p) => P('M-12 0Q-8 -20 -3 -46Q0 -52 3 -44Q7 -22 12 0Z', lin([light(p.rock, 0.2), p.rock, dark(p.rock, 0.35)], 0, 0, 1, 0)) + P('M8 0Q14 -12 16 -22Q18 -12 20 0Z', hshade(p.rock, 0.25)) + L('M-3 -40Q-6 -20 -8 -4', light(p.rock, 0.35), 1.4, op(0.6));
const clocktower = (p) => {
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ticks += `M${f(Math.cos(a) * 10)} ${f(-62 + Math.sin(a) * 10)}L${f(Math.cos(a) * 12)} ${f(-62 + Math.sin(a) * 12)}`;
  }
  return (
    R(-16, -48, 32, 48, hshade('#7a6a5a', 0.25), 2) +
    R(-18, -78, 36, 32, hshade('#8a7866', 0.22), 3) +
    P('M-21 -78L0 -96L21 -78Z', shade(p.copper, 0.25)) +
    C(0, -62, 14, lin(['#fffbe0', '#f2d9a0'])) +
    C(0, -62, 14, 'none', ST(p.brass, 2.6)) +
    L(ticks, '#3a2f27', 1.4) +
    L('M0 -62V-71M0 -62L6 -59', '#3a2f27', 2) +
    R(-6, -16, 12, 16, '#2a2018', 6) +
    `<g transform="translate(-16 -30)"><g class="m-spin">${gearShape(9, 7, p.brass)}</g></g>`
  );
};
const barrel = (p) => P('M-10 0Q-13 -12 -10 -24H10Q13 -12 10 0Z', hshade('#9a6a3c', 0.3)) + L('M-11.6 -5H11.6M-12.4 -19H12.4', '#4a4a56', 2.2) + E(0, -24, 10, 3, '#7a4c28');
const tealcrystal = (p) => glow(0, -12, 24, 16, p.gem, 0.45) + crystal(-8, 22, 6, -3, p.gem) + crystal(4, 34, 7, 2, light(p.gem, 0.15)) + crystal(12, 18, 5, 4, p.gem);

/* ---------- WORLD 16 — Rainbow Rift ---------- */
const lollipop = (v) => (p) => {
  const c = p.candy[v % p.candy.length];
  return L('M0 0V-26', '#e8dcff', 3.6) + L('M0 0V-26', '#ffffff', 1.6) + C(0, -36, 13, ball(c, 0.2)) + L('M0 -36m-9 0a9 9 0 1 0 9 -9a6 6 0 1 1 -6 6a3 3 0 1 0 3 -3', '#ffffff', 2.4, op(0.85)) + E(-5, -42, 3.4, 2, '#ffffff', op(0.6));
};
const candycane = () => L('M4 0V-34Q4 -44 -4 -44Q-11 -44 -11 -37', '#ffffff', 7) + L('M4 0V-34Q4 -44 -4 -44Q-11 -44 -11 -37', '#ff4d6d', 7, ' stroke-dasharray="4 4"') + L('M2 -2V-34', '#ffffff', 1.4, op(0.7));
const gumdrops = (p) => {
  const g = (x, s, c) => `<g transform="translate(${x} 0) scale(${s})">${P('M-9 0Q-10 -14 0 -16Q10 -14 9 0Q0 3 -9 0Z', ball(c, 0.25))}${E(-3, -10, 2.4, 1.6, '#ffffff', op(0.7))}${L('M-6 -4h.1M4 -8h.1M-1 -12h.1M5 -2h.1', '#ffffff', 1.6, op(0.8))}</g>`;
  return g(-9, 0.85, p.candy[0]) + g(8, 1, p.candy[1]) + g(-1, 0.7, p.candy[2]);
};
const cupcake = (p) =>
  P('M-11 0L-13 -14H13L11 0Z', lin(['#ffd6e6', '#f2a6c2'], 0, 0, 1, 0)) +
  L('M-8 -1L-9 -13M-3 -1V-13M3 -1V-13M8 -1L9 -13', '#e88aac', 1.2) +
  P('M-15 -14Q-16 -24 -6 -26Q-2 -34 6 -30Q16 -28 15 -14Z', ball('#fff4fa', 0.15)) +
  C(1, -33, 3.4, '#ff4d6d') +
  L('M-8 -20l2 -1M2 -22l2 1M8 -18l1 -2M-3 -17l2 1', p.candy[2], 1.8);
const icecream = (p) => P('M-7 -18L0 0L7 -18Z', lin(['#f2c48a', '#c9904e'])) + L('M-5 -14L3 -4M-2 -18L5 -10M5 -16L-3 -6', '#a8743f', 1, op(0.7)) + C(0, -22, 8, ball(p.candy[1], 0.2)) + C(-3, -30, 6.4, ball(p.candy[0], 0.2)) + C(4, -31, 5.6, ball(p.candy[2], 0.2));
const prism = (p) => glow(0, -14, 26, 16, '#ffffff', 0.4) + crystal(-9, 22, 7, -3, p.candy[3]) + crystal(3, 38, 8, 1, '#ffffff') + crystal(13, 20, 6, 4, p.candy[0]);
const rainbowarch = (p) => {
  const cols = ['#ff5d73', '#ffa94d', '#ffe066', '#7fdc7a', '#5ec8ff', '#a98bff'];
  return cols.map((c, i) => `<path d="M${-46 + i * 5} 0A${46 - i * 5} ${46 - i * 5} 0 0 1 ${46 - i * 5} 0" fill="none" stroke="${c}" stroke-width="5.4"/>`).join('') + cloudpuffSmall(-44) + cloudpuffSmall(44);
};
const cloudpuffSmall = (x) => `<g transform="translate(${x} 2) scale(.55)">${P('M-30 -10C-36 -22 -22 -32 -12 -26C-8 -40 12 -40 16 -28C26 -34 38 -24 32 -12Q0 -4 -30 -10Z', lin(['#ffffff', '#f2e6ff']))}</g>`;
const cottontree = (p) => L('M0 0V-22', '#ffffff', 4) + L('M0 0V-22', '#e8b4d8', 1.6) + crown([[-10, -30, 11], [10, -30, 11], [0, -42, 13]], ['#e889c8', '#ffb3e0', '#ffe0f4']);

export const PROPS2 = {
  topiary: { r: 13, h: 46, draw: topiary },
  topiary2: { r: 11, h: 56, draw: topiary2 },
  flowerbed: { r: 24, h: 18, draw: flowerbed },
  arrowpost: { r: 18, h: 56, draw: arrowpost },
  bench: { r: 20, h: 26, draw: bench },
  gardenlamp: { r: 8, h: 60, draw: gardenlamp },
  fountain: { r: 40, h: 52, draw: fountain, big: 1 },
  gazebo: { r: 36, h: 76, draw: gazebo, big: 1 },
  rosebush: { r: 15, h: 26, draw: rosebush },
  butterfly: { anim: 'bob', r: 8, h: 34, draw: butterfly, air: 1 },
  butte: { r: 44, h: 52, draw: butte, big: 1 },
  tumbleweed: { anim: 'sway', r: 12, h: 24, draw: tumbleweed },
  windmill: { r: 18, h: 86, draw: windmill, big: 1 },
  fence: { r: 22, h: 20, draw: fence },
  drybush: { r: 12, h: 20, draw: drybush },
  rockarch: { r: 44, h: 64, draw: rockarch, big: 1 },
  lighthouse: { r: 26, h: 96, draw: lighthouse, big: 1 },
  buoy: { anim: 'bob', r: 12, h: 40, draw: buoy, water: 1 },
  islet: { anim: 'bob', r: 30, h: 50, draw: islet, water: 1 },
  stormcloud: { anim: 'drift', r: 26, h: 58, draw: stormcloud, air: 1 },
  seagull: { anim: 'bob', r: 10, h: 44, draw: seagull, air: 1 },
  dockposts: { r: 14, h: 16, draw: dockposts, water: 1 },
  observatory: { r: 28, h: 62, draw: observatory, big: 1 },
  starlantern: { r: 9, h: 52, draw: starlantern },
  telescope: { r: 14, h: 36, draw: telescope },
  campfire: { r: 14, h: 24, draw: campfire },
  nighttent: { r: 26, h: 38, draw: nighttent },
  brokencolumn: { r: 14, h: 48, draw: brokencolumn },
  ruinarch: { r: 36, h: 72, draw: ruinarch, big: 1 },
  stonehead: { r: 22, h: 64, draw: stonehead, big: 1 },
  cypress: { r: 11, h: 64, draw: cypress },
  amphora: { r: 10, h: 30, draw: amphora },
  obelisk: { r: 10, h: 58, draw: obelisk },
  valleybush: { r: 16, h: 22, draw: valleybush },
  isle: { anim: 'bob', r: 30, h: 50, draw: isle(0), air: 1 },
  isle2: { anim: 'bob', r: 30, h: 46, draw: isle(1), air: 1 },
  balloon: { anim: 'bob', r: 16, h: 62, draw: balloon, air: 1 },
  airship: { anim: 'bob', r: 50, h: 66, draw: airship, air: 1, big: 1 },
  cloudpuff: { anim: 'drift', r: 32, h: 36, draw: cloudpuff, air: 1 },
  birds: { anim: 'bob', r: 12, h: 48, draw: birds, air: 1 },
  gear: { r: 20, h: 42, draw: gear },
  gears2: { r: 22, h: 46, draw: gears2 },
  pipes: { r: 22, h: 58, draw: pipes },
  cavelantern: { r: 8, h: 40, draw: cavelantern },
  minecart: { r: 28, h: 44, draw: minecart, big: 1 },
  stalagmite: { r: 14, h: 46, draw: stalagmite },
  clocktower: { r: 22, h: 96, draw: clocktower, big: 1 },
  barrel: { r: 11, h: 26, draw: barrel },
  tealcrystal: { r: 16, h: 34, draw: tealcrystal },
  lollipop: { r: 13, h: 50, draw: lollipop(0) },
  lollipop2: { r: 13, h: 50, draw: lollipop(1) },
  candycane: { r: 10, h: 46, draw: candycane },
  gumdrops: { r: 16, h: 16, draw: gumdrops },
  cupcake: { r: 14, h: 36, draw: cupcake },
  icecream: { r: 10, h: 38, draw: icecream },
  prism: { r: 16, h: 40, draw: prism },
  rainbowarch: { r: 46, h: 48, draw: rainbowarch, big: 1 },
  cottontree: { anim: 'sway', r: 20, h: 56, draw: cottontree },
};
