// Art direction of each world: palette, road material, platforms, roadside details,
// props mix and the terrain recipe (k = drawing toolkit handed over by map.js).
// Light always comes from the top-left; shadows are tinted with the world's own dark tone.

/* ---------- terrain recipes ---------- */
function beachTerrain(c, k) {
  k.sea(c, 'left', { base: c.W * 0.27, wet: '#d8a865', shallow: '#86e3d8', mid: '#3cc0cf', deep: '#1689a6' });
  k.patches(c, ['#fff4d2', '#e9bf7c'], 10, [60, 150], 0.6);
  const land = (x, y) => !c.isWater(x, y);
  k.marks(c, 'ripple', '#d6a865', 46, { a: 0.5, s: [0.6, 1.2], where: land });
  k.marks(c, 'dot', '#c89a5c', 90, { a: 0.4, w: 2.4, where: land });
  k.marks(c, 'pebble', '#c9cfda', 30, { a: 0.8, s: [0.6, 1.1], where: land });
}

function dunesTerrain(c, k) {
  const { R } = c;
  k.patches(c, ['#ffe2a6', '#e0974c'], 12, [70, 170], 0.55);
  // dunes: lit windward face, shadowed lee face, crest line
  for (let i = 0; i < 14; i++) {
    const w = k.between(R, 70, 130);
    const h = w * k.between(R, 0.3, 0.42);
    const spot = k.roomiest(c, w * 0.62, 40);
    if (!spot) continue;
    const { x, y } = spot;
    const crest = [x + w * 0.12, y - h];
    const body = `M${k.f(x - w)} ${k.f(y)}Q${k.f(x - w * 0.35)} ${k.f(y - h * 1.15)} ${k.f(crest[0])} ${k.f(crest[1])}Q${k.f(x + w * 0.6)} ${k.f(y - h * 0.8)} ${k.f(x + w)} ${k.f(y)}Q${k.f(x)} ${k.f(y + h * 0.18)} ${k.f(x - w)} ${k.f(y)}Z`;
    const lee = `M${k.f(crest[0])} ${k.f(crest[1])}Q${k.f(x + w * 0.6)} ${k.f(y - h * 0.8)} ${k.f(x + w)} ${k.f(y)}Q${k.f(x + w * 0.45)} ${k.f(y + h * 0.1)} ${k.f(x + w * 0.05)} ${k.f(y + h * 0.05)}Q${k.f(x + w * 0.2)} ${k.f(y - h * 0.5)} ${k.f(crest[0])} ${k.f(crest[1])}Z`;
    c.layers.ground.push(
      k.ao(x + 8, y + 2, w * 1.05, h * 0.35, c.A.shadow, 0.18),
      `<path d="${body}" fill="${k.lin([[0, '#ffeab8', 1], [0.6, '#f6c983', 0.95], [1, '#efb466', 0]])}"/>`,
      `<path d="${lee}" fill="${k.lin([[0, '#dc9450', 0.9], [0.75, '#cf8442', 0.7], [1, '#cf8442', 0]])}"/>`,
      `<path d="M${k.f(x - w * 0.55)} ${k.f(y - h * 0.62)}Q${k.f(x - w * 0.2)} ${k.f(y - h * 1.02)} ${k.f(crest[0])} ${k.f(crest[1])}" fill="none" stroke="#fff6dc" stroke-width="2" stroke-linecap="round" opacity=".85"/>`,
      `<path d="M${k.f(x - w * 0.7)} ${k.f(y - h * 0.25)}q${k.f(w * 0.2)} ${k.f(-h * 0.2)} ${k.f(w * 0.4)} 0M${k.f(x - w * 0.5)} ${k.f(y - h * 0.5)}q${k.f(w * 0.15)} ${k.f(-h * 0.15)} ${k.f(w * 0.3)} 0" fill="none" stroke="#e2a85e" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`,
    );
    c.placed.push([x, y - h * 0.4, w * 0.55]);
  }
  // oasis
  const o = k.roomiest(c, 58, 200);
  if (o) {
    k.pond(c, o.x, o.y, 46, 22, { shore: '#cfe39a', water: '#4fc4e0', deep: '#1f8fb8' });
    for (const [dx, dy, kind] of [
      [-46, -6, 'palm'],
      [44, 4, 'palm2'],
      [-20, 26, 'dunegrass'],
      [26, -24, 'dunegrass'],
    ])
      k.tryPut(c, kind, o.x + dx, o.y + dy, 0.9, 0.6);
  }
  k.marks(c, 'ripple', '#d99a4e', 70, { a: 0.5, s: [0.8, 1.5] });
  k.marks(c, 'dot', '#c9873e', 60, { a: 0.35, w: 2.2 });
}

function canyonTerrain(c, k) {
  const { R } = c;
  k.patches(c, ['#e88a5a', '#8e3a22'], 12, [70, 160], 0.55);
  for (const side of ['left', 'right']) {
    k.edgeMass(c, side, c.W * 0.2, 26, ({ pts, X, left }) => {
      const topD = k.polyD([[left ? -20 : c.W + 20, c.y0 - 30], ...pts.map(([x, y]) => [X(x), y]), [left ? -20 : c.W + 20, c.H + 40]], true);
      const fx = left ? 7 : -7;
      const face = k.polyD([...pts.map(([x, y]) => [X(x), y]), ...pts.slice().reverse().map(([x, y]) => [X(x) + fx, y + 16])], true);
      let strata = '';
      for (let j = 1; j < 4; j++) strata += k.polyD(pts.map(([x, y]) => [X(x) + (fx * j) / 4, y + j * 4]));
      c.layers.ground.push(
        k.ao(0, 0, 0, 0),
        `<path d="${face}" fill="${left ? '#7a2e1a' : '#c2603a'}"/>`,
        `<path d="${strata}" fill="none" stroke="${left ? '#5a1e10' : '#e08a5a'}" stroke-width="1.4" opacity=".7"/>`,
        `<path d="${topD}" fill="${k.lin(left ? ['#e3875a', '#c9653c'] : ['#c9653c', '#a84a2a'], 0, 0, 1, 0)}"/>`,
        `<path d="${k.polyD(pts.map(([x, y]) => [X(x), y]))}" fill="none" stroke="#ffb58a" stroke-width="2.2" stroke-linecap="round" opacity="${left ? 0.5 : 0.8}"/>`,
      );
    });
  }
  // lava creek in the roomiest pocket
  for (let i = 0; i < 2; i++) {
    const s = k.roomiest(c, 40, 120);
    if (!s) break;
    const d = k.blob(R, s.x, s.y, 34, 15, 9, 0.2);
    c.layers.under.push(`<path d="${d}" fill="#3a1610" transform="translate(0 2)"/>`, `<path d="${d}" fill="${k.rad([[0, '#fff3a0'], [0.4, '#ffb03a'], [1, '#e8411c']])}"/>`, k.glow(s.x, s.y, 70, 40, '#ff8a3d', 0.35));
    c.placed.push([s.x, s.y, 36]);
  }
  k.marks(c, 'crack', '#7a2a16', 50, { a: 0.6, s: [0.6, 1.3] });
  k.marks(c, 'pebble', '#8e3e24', 50, { a: 0.7 });
  k.marks(c, 'dot', '#ffb38a', 40, { a: 0.4, w: 2 });
}

function reefTerrain(c, k) {
  const { R } = c;
  // sandy seabed patches with soft edges
  for (let i = 0; i < 12; i++) {
    const x = k.between(R, -30, c.W + 30);
    const y = k.between(R, c.y0, c.H);
    const r = k.between(R, 60, 120);
    c.layers.under.push(`<path d="${k.blob(R, x, y, r, r * 0.55, 10, 0.22)}" fill="${k.rad([[0, '#f0dca6', 0.95], [0.7, '#e2c88e', 0.8], [1, '#d9bd84', 0]])}"/>`);
  }
  k.patches(c, ['#7fd9f0', '#0e4f7a'], 10, [80, 160], 0.5);
  // caustics
  k.marks(c, 'ripple', '#bdf3ff', 70, { a: 0.35, s: [0.8, 1.6] });
  k.marks(c, 'pebble', '#c9a26a', 40, { a: 0.6 });
  // light rays from the surface
  let rays = '';
  for (let i = 0; i < 5; i++) {
    const x = k.between(R, -40, c.W);
    const wd = k.between(R, 20, 50);
    rays += `M${k.f(x)} ${c.y0}h${k.f(wd)}L${k.f(x + wd - 160)} ${c.H}h${k.f(-wd * 1.8)}Z`;
  }
  c.layers.air.push(`<path d="${rays}" fill="#e6fbff" opacity=".07"/>`);
}

function peaksTerrain(c, k) {
  k.patches(c, ['#b3a2f0', '#4f3a9c'], 12, [70, 160], 0.5);
  for (const side of ['left', 'right']) k.edgePeaks(c, side, { base: '#4a3d96', back: '#5a4cae', backShade: '#3a2e86', front: '#7a6ad0', frontShade: '#4f40a6', snow: '#f6f2ff', snow2: '#dcd4fa' });
  const lake = k.roomiest(c, 56, 200);
  if (lake) k.pond(c, lake.x, lake.y, 50, 24, { shore: '#cfc6f5', water: '#6fd0f0', deep: '#3a7fd0' });
  k.marks(c, 'tuft', '#5a4bb0', 60, { a: 0.6 });
  k.marks(c, 'pebble', '#7f74c4', 40, { a: 0.7 });
  k.marks(c, 'sparkle', '#ffffff', 22, { a: 0.6, w: 1.4 });
}

function glacierTerrain(c, k) {
  k.sea(c, 'right', { base: c.W * 0.24, wet: '#b4d6ee', shallow: '#7fc4e8', mid: '#3d86c0', deep: '#1d4f86' });
  k.patches(c, ['#ffffff', '#a9cfee'], 12, [70, 160], 0.6);
  const land = (x, y) => !c.isWater(x, y);
  k.marks(c, 'crack', '#9cc6e6', 40, { a: 0.7, s: [0.8, 1.6], where: land });
  k.marks(c, 'sparkle', '#ffffff', 50, { a: 0.9, w: 1.4, where: land });
  k.marks(c, 'dot', '#b4d4ec', 60, { a: 0.6, w: 2.2, where: land });
  // drifting ice floes
  const { R } = c;
  for (let i = 0; i < 14; i++) {
    const y = k.between(R, c.y0, c.H);
    const x = k.between(R, c.W - 120, c.W);
    if (!c.isWater(x - 16, y) || !c.isWater(x + 16, y)) continue;
    const r = k.between(R, 9, 18);
    const d = k.blob(R, x, y, r, r * 0.55, 7, 0.25);
    c.layers.under.push(`<path d="${d}" fill="#5a9ccc" transform="translate(1.5 2.5)"/>`, `<path d="${d}" fill="${k.lin(['#ffffff', '#d6ecfa'])}"/>`);
  }
}

function woodsTerrain(c, k) {
  const { R } = c;
  k.patches(c, ['#8fd06a', '#2c6e34', '#a9dc72'], 14, [60, 150], 0.5);
  // dappled light
  for (let i = 0; i < 10; i++) c.layers.ground.push(k.glow(k.between(R, 0, c.W), k.between(R, c.y0, c.H), k.between(R, 30, 60), k.between(R, 14, 26), '#fbffb0', 0.22));
  const lake = k.roomiest(c, 54, 200);
  if (lake) k.pond(c, lake.x, lake.y, 44, 22, { shore: '#7a6a3a', water: '#5ec4c8', deep: '#2a7f8f', lily: '#4fae4a' });
  for (const side of ['left', 'right']) k.edgeForest(c, side, ['oak', 'oak2', 'oak'], { under: '#2a6a30', depth: c.W * 0.11, s: [1.25, 1.75] });
  k.marks(c, 'tuft', '#2f7a33', 120, { a: 0.75 });
  k.marks(c, 'leaf', '#c9a23a', 26, { a: 0.7 });
  k.marks(c, 'dot', '#ffe066', 30, { a: 0.8, w: 2.4 });
}

function cityTerrain(c, k) {
  const { R } = c;
  // street grid and plazas
  let g = '';
  for (let y = c.y0 + 30; y < c.H; y += 88) g += `M0 ${k.f(y)}H${c.W}`;
  for (let x = 30; x < c.W; x += 96) g += `M${x} ${c.y0}V${c.H}`;
  c.layers.under.push(`<path d="${g}" stroke="#0c0828" stroke-width="18" opacity=".55"/>`, `<path d="${g}" stroke="#4a3a9c" stroke-width="1.2" stroke-dasharray="8 10" opacity=".7"/>`);
  for (let i = 0; i < 10; i++) {
    const col = i % 2 ? '#ff4fd8' : '#5df2ff';
    c.layers.ground.push(k.glow(k.between(R, 0, c.W), k.between(R, c.y0, c.H), k.between(R, 50, 90), k.between(R, 24, 40), col, 0.2));
  }
  k.marks(c, 'dot', '#5df2ff', 40, { a: 0.6, w: 2 });
  k.marks(c, 'dash', '#ff4fd8', 24, { a: 0.5, w: 1.6 });
}


function gardensTerrain(c, k) {
  const { R } = c;
  // mown lawn stripes
  let bands = '';
  const span = c.H - c.y0;
  for (let x = -span * 0.4; x < c.W + 60; x += 76) bands += `M${k.f(x)} ${c.y0}h38l${k.f(-span * 0.3)} ${k.f(span)}h-38Z`;
  c.layers.under.push(`<path d="${bands}" fill="#ffffff" opacity=".09"/>`);
  k.patches(c, ['#c6f0a8', '#4f9e52'], 10, [60, 140], 0.45);
  // trimmed hedge walls along both sides
  for (const side of ['left', 'right']) {
    k.edgeMass(c, side, c.W * 0.1, 30, ({ pts, X, left }) => {
      const far = left ? -20 : c.W + 20;
      const top = k.polyD([[far, c.y0 - 30], ...pts.map(([x, y]) => [X(x), y]), [far, c.H + 40]], true);
      const face = k.polyD([...pts.map(([x, y]) => [X(x), y]), ...pts.slice().reverse().map(([x, y]) => [X(x) + (left ? 3 : -3), y + 12])], true);
      c.layers.ground.push(
        `<path d="${face}" fill="#1f6a34"/>`,
        `<path d="${top}" fill="${k.lin(left ? ['#3f9a4a', '#2f8a40'] : ['#2f8a40', '#267a38'], 0, 0, 1, 0)}"/>`,
        `<path d="${k.polyD(pts.map(([x, y]) => [X(x), y]))}" fill="none" stroke="#8fe07a" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>`,
      );
      // blossoms on the hedges
      let fl = '';
      for (let i = 0; i < pts.length; i += 2) {
        const [bx, y] = pts[i];
        if (bx < 14) continue;
        fl += k.ellD(X(k.between(R, 4, bx - 6)), y + k.between(R, -6, 6), 2.4, 2.2);
      }
      c.layers.ground.push(`<path d="${fl}" fill="${left ? '#ffd1e6' : '#fff3a0'}" opacity=".9"/>`);
    });
  }
  // gravel plaza with the fountain
  const s = k.roomiest(c, 62, 220);
  if (s) {
    c.layers.under.push(`<ellipse cx="${k.f(s.x)}" cy="${k.f(s.y - 6)}" rx="58" ry="26" fill="${k.lin(['#efe2c4', '#d9c49a'])}"/>`, `<ellipse cx="${k.f(s.x)}" cy="${k.f(s.y - 6)}" rx="58" ry="26" fill="none" stroke="#bfa678" stroke-width="2" stroke-dasharray="5 4"/>`);
    k.put(c, 'fountain', s.x, s.y, 0.95, { flip: 1 });
  }
  k.marks(c, 'tuft', '#3f9a44', 70, { a: 0.6 });
  k.marks(c, 'dot', '#ffffff', 40, { a: 0.85, w: 2.6 });
  k.marks(c, 'dot', '#ffd34d', 30, { a: 0.85, w: 2.6 });
  k.marks(c, 'dot', '#ff8fb8', 30, { a: 0.85, w: 2.6 });
}

function mesaTerrain(c, k) {
  const { R } = c;
  k.patches(c, ['#ffd0a0', '#b8504a', '#ffb88a'], 12, [70, 170], 0.5);
  for (const side of ['left', 'right']) {
    k.edgeMass(c, side, c.W * 0.16, 30, ({ pts, X, left }) => {
      const far = left ? -20 : c.W + 20;
      const fx = left ? 6 : -6;
      const top = k.polyD([[far, c.y0 - 30], ...pts.map(([x, y]) => [X(x), y]), [far, c.H + 40]], true);
      const face = k.polyD([...pts.map(([x, y]) => [X(x), y]), ...pts.slice().reverse().map(([x, y]) => [X(x) + fx, y + 20])], true);
      let strata = '';
      for (let j = 1; j < 5; j++) strata += k.polyD(pts.map(([x, y]) => [X(x) + (fx * j) / 5, y + j * 4]));
      c.layers.ground.push(
        `<path d="${face}" fill="${left ? '#8a3a46' : '#e0785a'}"/>`,
        `<path d="${strata}" fill="none" stroke="${left ? '#6a2a3a' : '#ffa47a'}" stroke-width="1.5" opacity=".7"/>`,
        `<path d="${top}" fill="${k.lin(left ? ['#f29a6a', '#d9744e'] : ['#d9744e', '#b85a44'], 0, 0, 1, 0)}"/>`,
        `<path d="${k.polyD(pts.map(([x, y]) => [X(x), y]))}" fill="none" stroke="#ffd2a8" stroke-width="2" stroke-linecap="round" opacity=".8"/>`,
      );
      k.marks(c, 'tuft', '#a8743a', 14, { a: 0.7, where: (x, y) => (left ? x < X(pts[0][0]) : x > X(pts[0][0])) && c.isSolid(x, y) });
    });
  }
  // dry riverbed
  const s = k.roomiest(c, 46, 160);
  if (s) {
    const d = k.blob(R, s.x, s.y, 44, 13, 10, 0.25);
    c.layers.under.push(`<path d="${d}" fill="#c9805e" opacity=".55"/>`, `<path d="${d}" fill="none" stroke="#ffd2a8" stroke-width="1.4" stroke-dasharray="6 5" opacity=".7"/>`);
  }
  k.marks(c, 'crack', '#b0503e', 70, { a: 0.55, s: [0.6, 1.4] });
  k.marks(c, 'pebble', '#9a4a3a', 40, { a: 0.6 });
}

function stormTerrain(c, k) {
  const { R } = c;
  const o = { wet: '#8f8a7a', shallow: '#78a8b8', mid: '#3f7896', deep: '#21486a', gap: 22, min: 18 };
  k.sea(c, 'left', { ...o, base: c.W * 0.3 });
  k.sea(c, 'right', { ...o, base: c.W * 0.3 });
  k.patches(c, ['#e6dcc0', '#8a8370'], 8, [50, 110], 0.5);
  const land = (x, y) => !c.isWater(x, y);
  k.marks(c, 'pebble', '#6a6a70', 40, { a: 0.7, where: land });
  k.marks(c, 'ripple', '#ffffff', 60, { a: 0.4, s: [0.7, 1.3], where: (x, y) => c.isWater(x, y) });
  // cloud shadows drifting over everything, then rain
  for (let i = 0; i < 6; i++) c.layers.air.push(k.glow(k.between(R, 0, c.W), k.between(R, c.y0, c.H), k.between(R, 90, 150), k.between(R, 40, 70), '#0a1a2a', 0.22));
  let rain = '';
  for (let i = 0; i < 160; i++) {
    const x = k.between(R, -20, c.W + 20);
    const y = k.between(R, c.y0, c.H);
    rain += `M${k.f(x)} ${k.f(y)}l-5 14`;
  }
  c.layers.air.push(`<path d="${rain}" stroke="#dbe9ff" stroke-width="1.2" stroke-linecap="round" opacity=".35"/>`);
}

function summitTerrain(c, k) {
  k.patches(c, ['#6a6ac0', '#141236', '#8a86d8'], 12, [70, 160], 0.5);
  for (const side of ['left', 'right']) k.edgePeaks(c, side, { base: '#232250', back: '#2e2d66', backShade: '#1c1b48', front: '#45448a', frontShade: '#2a2960', snow: '#e6e4ff', snow2: '#b9b6ee' });
  const lake = k.roomiest(c, 54, 200);
  if (lake) {
    k.pond(c, lake.x, lake.y, 48, 22, { shore: '#a9a6e6', water: '#9fd8ff', deep: '#5a7ad0' });
    c.layers.under.push(k.glow(lake.x + 10, lake.y - 4, 3, 3, '#ffffff', 1), k.glow(lake.x - 18, lake.y + 6, 2, 2, '#ffffff', 1));
  }
  // aurora ribbons
  for (let i = 0; i < 3; i++) {
    const y = c.y0 + ((i + 0.5) / 3) * (c.H - c.y0);
    const d = `M-40 ${k.f(y)}C${k.f(c.W * 0.3)} ${k.f(y - 120)} ${k.f(c.W * 0.6)} ${k.f(y + 90)} ${k.f(c.W + 40)} ${k.f(y - 60)}`;
    c.layers.air.push(`<path d="${d}" fill="none" stroke="${i % 2 ? '#7affc8' : '#a98bff'}" stroke-width="46" stroke-linecap="round" opacity=".1"/>`, `<path d="${d}" fill="none" stroke="#c8fff0" stroke-width="10" stroke-linecap="round" opacity=".1"/>`);
  }
  k.marks(c, 'star', '#fff6c8', 40, { a: 0.85, s: [0.6, 1.3] });
  k.marks(c, 'sparkle', '#ffffff', 40, { a: 0.7, w: 1.2 });
  k.marks(c, 'dot', '#b9b4ff', 60, { a: 0.4, w: 2.4 });
}

function echoTerrain(c, k) {
  const { R } = c;
  k.patches(c, ['#eef0b0', '#6a7a3a', '#e0d2a0', '#7f9a4a'], 16, [60, 150], 0.6);
  for (const side of ['left', 'right']) {
    k.edgeMass(c, side, c.W * 0.13, 30, ({ pts, X, left }) => {
      const far = left ? -20 : c.W + 20;
      const fx = left ? 6 : -6;
      const top = k.polyD([[far, c.y0 - 30], ...pts.map(([x, y]) => [X(x), y]), [far, c.H + 40]], true);
      const face = k.polyD([...pts.map(([x, y]) => [X(x), y]), ...pts.slice().reverse().map(([x, y]) => [X(x) + fx, y + 18])], true);
      let strata = '';
      for (let j = 1; j < 4; j++) strata += k.polyD(pts.map(([x, y]) => [X(x) + (fx * j) / 4, y + j * 4.5]));
      let ivy = '';
      for (let i = 0; i < pts.length; i += 3) ivy += `M${k.f(X(pts[i][0]))} ${k.f(pts[i][1])}q${k.f(fx * 0.5)} 6 ${k.f(fx * 0.3)} ${k.f(10 + R() * 8)}`;
      c.layers.ground.push(
        `<path d="${face}" fill="${left ? '#8a7a5a' : '#cdbb8e'}"/>`,
        `<path d="${strata}" fill="none" stroke="${left ? '#6a5a3e' : '#e6d6a8'}" stroke-width="1.4" opacity=".8"/>`,
        `<path d="${top}" fill="${k.lin(left ? ['#b4b47a', '#9aa064'] : ['#9aa064', '#8a9058'], 0, 0, 1, 0)}"/>`,
        `<path d="${ivy}" fill="none" stroke="#4f7a3a" stroke-width="2.4" stroke-linecap="round"/>`,
        `<path d="${k.polyD(pts.map(([x, y]) => [X(x), y]))}" fill="none" stroke="#e8eab8" stroke-width="2" stroke-linecap="round" opacity=".7"/>`,
      );
    });
  }
  // old paving
  for (let i = 0; i < 5; i++) {
    const s = k.roomiest(c, 30, 40);
    if (!s) break;
    let t = '';
    for (let a = -2; a <= 2; a++) for (let b = -1; b <= 1; b++) if (R() < 0.75) t += `M${k.f(s.x + a * 13 + b * 4)} ${k.f(s.y + b * 9)}l11 0l-2 7l-11 0Z`;
    c.layers.under.push(`<path d="${t}" fill="#e6dcc0" opacity=".7"/>`);
  }
  k.marks(c, 'tuft', '#6a7a3a', 80, { a: 0.7 });
  k.marks(c, 'pebble', '#bdb08a', 40, { a: 0.8 });
  k.marks(c, 'dot', '#ffffff', 26, { a: 0.8, w: 2.4 });
}

function islesTerrain(c, k) {
  const { R } = c;
  // distant clouds far below, then cloud banks on both sides
  k.patches(c, ['#ffffff', '#d6ecff'], 16, [50, 120], 0.55);
  for (const side of ['left', 'right']) {
    k.edgeMass(c, side, c.W * 0.13, 26, ({ pts, X, left }) => {
      const circles = [];
      for (let i = 0; i < pts.length; i += 2) {
        const [bx, y] = pts[i];
        if (bx < 6) continue;
        circles.push([X(bx - 8 - R() * 8), y + R() * 10, k.between(R, 16, 28)]);
      }
      const far = left ? -20 : c.W + 20;
      const fill = k.polyD([[far, c.y0 - 30], ...pts.map(([x, y]) => [X(x - 12), y]), [far, c.H + 40]], true);
      c.layers.fg.push(`<path d="${fill}" fill="#dfeefc"/>`, k.crown(circles, ['#c4daf2', '#e8f3ff', '#ffffff'], false));
    });
  }
  k.marks(c, 'sparkle', '#ffffff', 30, { a: 0.8, w: 1.4 });
}

function cavesTerrain(c, k) {
  const { R } = c;
  k.patches(c, ['#8a7462', '#1d1612', '#6a5a4a'], 16, [60, 150], 0.6);
  for (const side of ['left', 'right']) {
    k.edgeMass(c, side, c.W * 0.13, 28, ({ pts, X, left }) => {
      const far = left ? -20 : c.W + 20;
      const wall = k.polyD([[far, c.y0 - 30], ...pts.map(([x, y]) => [X(x), y]), [far, c.H + 40]], true);
      let tips = '';
      for (let i = 1; i < pts.length - 1; i += 2) {
        const [bx, y] = pts[i];
        const x = X(bx);
        const h = k.between(R, 6, 14);
        tips += `M${k.f(x)} ${k.f(y - 7)}L${k.f(x + (left ? h : -h))} ${k.f(y)}L${k.f(x)} ${k.f(y + 7)}Z`;
      }
      // copper pipe along the wall
      const pipe = k.polyD(pts.map(([x, y]) => [X(Math.max(0, x - 12)), y]));
      c.layers.ground.push(
        `<path d="${wall}" fill="${k.lin(left ? ['#3a2e26', '#2a211b'] : ['#2a211b', '#201913'], 0, 0, 1, 0)}"/>`,
        `<path d="${tips}" fill="#3a2e26"/>`,
        `<path d="${k.polyD(pts.map(([x, y]) => [X(x), y]))}" fill="none" stroke="#c98a4a" stroke-width="2" opacity=".55"/>`,
        `<path d="${pipe}" fill="none" stroke="#1a130e" stroke-width="9"/>`,
        `<path d="${pipe}" fill="none" stroke="#b8743c" stroke-width="5.5"/>`,
        `<path d="${pipe}" fill="none" stroke="#f2b878" stroke-width="1.4" opacity=".7" transform="translate(-1 -1.4)"/>`,
        `<path d="${pipe}" fill="none" stroke="#d9a24a" stroke-width="10" stroke-dasharray="3 80"/>`,
      );
    });
  }
  // glowing crystal veins and lamp pools
  for (let i = 0; i < 7; i++) c.layers.ground.push(k.glow(k.between(R, 0, c.W), k.between(R, c.y0, c.H), k.between(R, 50, 80), k.between(R, 24, 36), i % 2 ? '#ffb85a' : '#3fe0d0', 0.18));
  k.marks(c, 'crack', '#3fe0d0', 26, { a: 0.6, s: [0.8, 1.5], w: 1.4 });
  k.marks(c, 'pebble', '#7a6656', 50, { a: 0.8 });
  k.marks(c, 'dot', '#d9a24a', 30, { a: 0.6, w: 2 });
}

function riftTerrain(c, k) {
  const { R } = c;
  // candy hills
  for (let i = 0; i < 12; i++) {
    const x = k.between(R, -30, c.W + 30);
    const y = k.between(R, c.y0, c.H);
    const r = k.between(R, 50, 100);
    const col = ['#ffd6f0', '#d6fff0', '#e6dcff', '#fff4c8'][i % 4];
    c.layers.under.push(`<path d="${k.blob(R, x, y, r, r * 0.5, 9, 0.2)}" fill="${k.rad([[0, col, 0.95], [0.75, col, 0.7], [1, col, 0]])}"/>`);
  }
  for (const side of ['left', 'right']) k.edgeForest(c, side, ['cottontree', 'lollipop', 'cottontree', 'lollipop2'], { under: side === 'left' ? '#f2c4ea' : '#d6c6ff', depth: c.W * 0.1, s: [1.1, 1.5] });
  // the rift: a glowing prismatic crack
  const s = k.roomiest(c, 44, 160);
  if (s) {
    const d = `M${k.f(s.x - 42)} ${k.f(s.y)}l12 -6l8 5l10 -9l9 7l11 -5l12 4l-12 5l-10 -3l-9 6l-11 -4l-8 5Z`;
    c.layers.under.push(k.glow(s.x, s.y, 70, 30, '#ffffff', 0.6), `<path d="${d}" fill="${k.lin(['#ff5d73', '#ffe066', '#7fdc7a', '#5ec8ff', '#a98bff'], 0, 0, 1, 0)}"/>`);
    c.placed.push([s.x, s.y, 44]);
  }
  // sprinkles
  for (const col of ['#ff5d73', '#ffd34d', '#5ec8ff', '#7fdc7a', '#ffffff']) k.marks(c, 'dash', col, 26, { a: 0.85, w: 2.2 });
}

/* ---------- worlds ---------- */
const BEACH = {
  g0: '#fbe6b6',
  g1: '#f1cd8e',
  light: '#fff6dc',
  shadow: '#6e3e1c',
  mist: '#ffffff',
  pal: { bark: '#b07a45', leaf: ['#25784a', '#3aa35a', '#86dc8e'], pebble: ['#b8c1cf', '#dccbab', '#8e98ab'], sand2: '#f4d295', grass: ['#8a9e4a', '#b4bb5e', '#dcd68a'], rock: '#94a0b0', star: '#ff8a4c', flag: '#ff5d73', boat: '#ff5d73' },
  path: { style: 'planks', w: 30, base: '#e3b97d', edge: '#6e4524', hi: '#fff0cc', a: '#d9ad72', b: '#8a5e36' },
  pad: { kind: 'wood', top: '#e8c089', side: '#94643a', rim: '#fff3d6' },
  edge: { kind: 'shells', c1: '#fff6ea', c2: '#ff9fb2', skip: 0.6, off: 5 },
  props: { landmarks: ['sandcastle', 'lifeguard'], cluster: [['palm', 3], ['palm2', 3], ['dunegrass', 2]], clusters: 6, scatter: [['pebbles', 4], ['starfish', 2], ['shell', 2], ['crab', 1], ['umbrella', 1], ['umbrella2', 1], ['dunegrass', 2]], density: 24, water: [['sailboat', 1], ['searock', 3]] },
  terrain: beachTerrain,
  emblem: { k: 'palm', s: 0.42, x: -3, y: 20 },
  fx: 'sparkle',
};
const DUNES = {
  g0: '#f8cf88',
  g1: '#e9a65a',
  light: '#fff2d2',
  shadow: '#7a3a12',
  mist: '#fff1d6',
  pal: { cactus: '#4aa85a', stone: '#d6955a', sand2: '#f2c47a', ruin: '#e8cc98', bark: '#a8743f', leaf: ['#25784a', '#3aa35a', '#86dc8e'], grass: ['#a8914a', '#ccab5c', '#e8cf8a'] },
  path: { style: 'sand', w: 30, base: '#f8dda6', edge: '#a8682e', hi: '#fff4d8', a: '#d4a35e' },
  pad: { kind: 'stone', top: '#ecc890', side: '#a86e36', rim: '#fff2d2' },
  edge: { kind: 'stones', c1: '#c08448', c2: '#f6d6a2', skip: 0.55 },
  props: { landmarks: ['pyramid', 'tent'], cluster: [['saguaro', 3], ['barrelcactus', 2], ['sandstone', 1]], clusters: 8, scatter: [['sandstone', 3], ['barrelcactus', 2], ['column', 1], ['dunegrass', 3], ['saguaro', 1]], density: 28 },
  terrain: dunesTerrain,
  emblem: { k: 'saguaro', s: 0.5, x: 0, y: 19 },
  fx: 'dust',
};
const CANYON = {
  g0: '#d9774a',
  g1: '#a5452a',
  light: '#ffd2a0',
  shadow: '#2e0c06',
  mist: '#ffb08a',
  pal: { stone: '#c45f38', rock: '#9a4a30' },
  path: { style: 'cobble', w: 30, base: '#ff7a2a', edge: '#22100c', hi: '#8a5446', a: '#4e2e28' },
  pad: { kind: 'stone', top: '#6e463c', side: '#341a14', rim: '#ffa060' },
  edge: { kind: 'stones', c1: '#6e2e1c', c2: '#c46a44', skip: 0.5 },
  props: { landmarks: ['volcano', 'butte'], cluster: [['hoodoo', 3], ['deadtree', 1], ['firecrystal', 1]], clusters: 8, scatter: [['lavapool', 2], ['firecrystal', 2], ['ventsmoke', 1], ['boulder', 3], ['deadtree', 1]], density: 26 },
  terrain: canyonTerrain,
  emblem: { k: 'volcano', s: 0.34, x: 0, y: 17 },
  fx: 'embers',
};
const REEF = {
  g0: '#37aad5',
  g1: '#1a6898',
  light: '#c6f5ff',
  shadow: '#082a48',
  mist: '#bff0ff',
  pal: { coral: ['#ff7b93', '#ffb35c', '#b07bff', '#ff8fd0'], kelp: '#3fcf7a', fish: ['#ffc23d', '#ff7b5c'], jelly: '#ffb0e0', rock: '#5d7fa0', star: '#ff8a4c' },
  path: { style: 'sand', w: 30, base: '#f3e2b8', edge: '#9a7a4a', hi: '#fff8e4', a: '#d6bd8a' },
  pad: { kind: 'stone', top: '#ead8a8', side: '#a08050', rim: '#ffffff' },
  edge: { kind: 'shells', c1: '#fff5e6', c2: '#ff9fb2', skip: 0.55 },
  props: { landmarks: ['wreck', 'turtle'], cluster: [['kelp', 3], ['branchcoral', 2], ['fancoral', 2]], clusters: 7, scatter: [['braincoral', 2], ['anemone', 2], ['clam', 1], ['fishschool', 2], ['jelly', 1], ['starfish', 1]], density: 22 },
  terrain: reefTerrain,
  emblem: { k: 'branchcoral', s: 0.5, x: 0, y: 20 },
  fx: 'bubbles',
};
const PEAKS = {
  g0: '#9886de',
  g1: '#6652bc',
  light: '#f4ecff',
  shadow: '#1e1248',
  mist: '#e6dcff',
  pal: { pine: ['#26386e', '#3a539a', '#7f9ae0'], bark: '#5a4a6a', gem: '#b88aff', rock: '#8a84b8', grass: ['#4f44a0', '#7468cc'], flower: ['#ffd1f0', '#fff3a0'] },
  path: { style: 'cobble', w: 30, base: '#3f376a', edge: '#221a48', hi: '#cfc8f2', a: '#a69ed8' },
  pad: { kind: 'stone', top: '#b6aee2', side: '#554c90', rim: '#ffffff' },
  edge: { kind: 'tufts', c1: '#4a3f92', skip: 0.45 },
  props: { landmarks: [['amethyst', 1.6], 'cabin'], cluster: [['pine', 4], ['boulder', 1]], clusters: 10, scatter: [['boulder', 2], ['cairn', 1], ['alpflowers', 3], ['amethyst', 1], ['pine', 2]], density: 24 },
  terrain: peaksTerrain,
  emblem: { k: 'amethyst', s: 0.62, x: 0, y: 14 },
  fx: 'sparkle',
};
const GLACIER = {
  g0: '#eef8fd',
  g1: '#c6e3f5',
  light: '#ffffff',
  shadow: '#2a5a8a',
  mist: '#ffffff',
  pal: { pine: ['#2a5566', '#3a7486', '#bfe4ee'], bark: '#6a5a4a', rock: '#9fb6c8' },
  path: { style: 'snow', w: 30, base: '#ffffff', edge: '#8ab8da', hi: '#ffffff', a: '#a9cbe6' },
  pad: { kind: 'stone', top: '#e2f4fd', side: '#86bce0', rim: '#ffffff' },
  edge: { kind: 'snowbank', c1: '#ffffff', c2: '#e3f1fa', skip: 0.4 },
  props: { landmarks: ['igloo', 'snowman'], cluster: [['snowpine', 3], ['icespikes', 1]], clusters: 6, scatter: [['penguin', 3], ['snowpile', 2], ['icehole', 1], ['icespikes', 1]], density: 16, water: [['iceberg', 2]] },
  terrain: glacierTerrain,
  emblem: { k: 'penguin', s: 0.62, x: 0, y: 14 },
  fx: 'snow',
};
const WOODS = {
  g0: '#6dbd5c',
  g1: '#3c8a42',
  light: '#f6ffc8',
  shadow: '#0c3418',
  mist: '#e4f5cf',
  pal: { bark: '#7a5230', leaf: ['#1f6b34', '#2f9447', '#7fd36a'], shroom: '#ff5050', rock: '#8a9a8a', moss: '#7fcf5f', grass: ['#2f7a37', '#4fae4a'], flower: ['#ffe066', '#ff9fc2', '#ffffff'] },
  path: { style: 'trail', w: 30, base: '#c99c60', edge: '#5e3e20', hi: '#ecd2a2', a: '#a87a44' },
  pad: { kind: 'stone', top: '#b9bba6', side: '#666a54', rim: '#ffffff' },
  edge: { kind: 'tufts', c1: '#2a7030', skip: 0.35 },
  props: { landmarks: ['cabin', ['oak2', 1.8]], cluster: [['oak', 2], ['oak2', 2], ['fern', 1]], clusters: 6, scatter: [['mushrooms', 2], ['stump', 1], ['log', 1], ['mossrock', 1], ['flowers', 3], ['fern', 2]], density: 22 },
  terrain: woodsTerrain,
  emblem: { k: 'mushrooms', s: 0.9, x: 0, y: 12 },
  fx: 'fireflies',
};
const NEON = {
  g0: '#2a1d5e',
  g1: '#140c36',
  light: '#ff8ae6',
  shadow: '#04020e',
  mist: '#5a3cae',
  pal: { bldg: ['#3a3170', '#2f2860', '#453a86'], win: ['#ffd36b', '#5df2ff'], neon: ['#5df2ff', '#ff4fd8', '#9a7bff'] },
  path: { style: 'neon', w: 30, base: '#251c4f', edge: '#0a0620', hi: '#4a3f8a', glow: '#5df2ff', glow2: '#ff4fd8', line: '#ffe36b' },
  pad: { kind: 'neon', top: '#2f2766', side: '#120c2c', rim: '#5df2ff', ring: '#ff4fd8' },
  edge: { kind: 'lanterns', c1: '#fff3a0', c2: '#ffffff', s1: '#4a4480', skip: 0.75, every: 6, glow: '#7af5ff' },
  props: { landmarks: ['towerL', 'billboard'], cluster: [['towerS', 2], ['towerM', 2]], clusters: 6, scatter: [['neonsign', 2], ['lamp', 2], ['billboard', 1], ['antenna', 1], ['planter', 2], ['car', 1]], density: 18 },
  terrain: cityTerrain,
  emblem: { k: 'neonsign', s: 0.55, x: 0, y: 18 },
  fx: 'neon',
};

const GARDENS = {
  g0: '#a6df8c',
  g1: '#69bf74',
  light: '#fbffd6',
  shadow: '#123a1c',
  mist: '#efffe0',
  pal: { bark: '#7a5230', leaf: ['#1f6e3a', '#34a04e', '#8ee07a'], flower: ['#ff8fb8', '#ffd34d', '#b48bff', '#ff6b6b'], arrow: ['#3fb6ff', '#ff8a3d', '#7a5cff'], roof: '#5fbf8a', grass: ['#2f8a40', '#5ec85a'] },
  path: { style: 'bricks', w: 30, base: '#d9895a', edge: '#7a3a22', hi: '#ffc9a0', a: '#a8542e' },
  pad: { kind: 'grass', top: '#8fd67a', side: '#4f8a3a', rim: '#efffd6' },
  edge: { kind: 'flowers', c1: '#ff8fb8', c2: '#fff3a0', s1: '#3f9a44', skip: 0.45 },
  props: { landmarks: ['gazebo', ['arrowpost', 1.3]], cluster: [['topiary', 2], ['topiary2', 2], ['rosebush', 2]], clusters: 6, scatter: [['flowerbed', 2], ['arrowpost', 2], ['bench', 1], ['gardenlamp', 2], ['rosebush', 1], ['butterfly', 2]], density: 18 },
  terrain: gardensTerrain,
  emblem: { k: 'arrowpost', s: 0.62, x: 0, y: 20 },
  fx: 'petals',
};
const MESA = {
  g0: '#ffb27c',
  g1: '#de6e5a',
  light: '#ffe6b0',
  shadow: '#3a0e2a',
  mist: '#ffd0b0',
  longShadow: 1,
  pal: { stone: '#d9744e', cactus: '#3f8a52', dry: '#8a5a2e' },
  path: { style: 'trail', w: 30, base: '#e89a6a', edge: '#7a2e2a', hi: '#ffd0a8', a: '#b85a40' },
  pad: { kind: 'stone', top: '#f2a678', side: '#9a4a3a', rim: '#ffe0c0' },
  edge: { kind: 'stones', c1: '#a84a3a', c2: '#ffb88a', skip: 0.5 },
  props: { landmarks: ['windmill', 'rockarch', 'butte'], cluster: [['saguaro', 3], ['drybush', 1], ['sandstone', 1]], clusters: 7, scatter: [['tumbleweed', 2], ['fence', 2], ['drybush', 3], ['sandstone', 2], ['barrelcactus', 1]], density: 26 },
  terrain: mesaTerrain,
  emblem: { k: 'windmill', s: 0.42, x: 0, y: 19 },
  fx: 'dust',
};
const STORM = {
  g0: '#c9c0a6',
  g1: '#a39a84',
  light: '#e6f0ff',
  shadow: '#0e1c2c',
  mist: '#c6d6e6',
  pal: { leaf: ['#2a6a4a', '#3a8a5a', '#7fc88a'], rock: '#6a7888', grass: ['#6a7a4a', '#8a9a5a', '#b4bc84'], pebble: ['#8a929e', '#b4ac98', '#6a727e'] },
  path: { style: 'pier', w: 30, base: '#7a6a5a', edge: '#2a221c', hi: '#b8a890', a: '#6a5a4a', b: '#3a2e24', post: '#2e241c' },
  pad: { kind: 'wood', top: '#8a7a66', side: '#4a3e32', rim: '#d6ccb8' },
  edge: { kind: 'pebbles', c1: '#6a6a70', c2: '#c9cdd6', skip: 0.6 },
  props: { landmarks: ['lighthouse', 'wreck'], cluster: [['dunegrass', 2]], clusters: 3, scatter: [['seagull', 2], ['stormcloud', 2], ['pebbles', 2], ['dunegrass', 1]], density: 12, water: [['islet', 1], ['buoy', 2], ['searock', 3], ['dockposts', 1]] },
  terrain: stormTerrain,
  emblem: { k: 'lighthouse', s: 0.38, x: -4, y: 19 },
  fx: 'rain',
};
const SUMMIT = {
  g0: '#3d3c80',
  g1: '#1c1a4a',
  light: '#b9c4ff',
  shadow: '#05041a',
  mist: '#5a58a8',
  pal: { pine: ['#152040', '#24345e', '#d6dcff'], bark: '#3a3050', gem: '#7af0ff', rock: '#5a5890' },
  path: { style: 'snow', w: 30, base: '#e6e8ff', edge: '#4a4a8a', hi: '#ffffff', a: '#a9aee6' },
  pad: { kind: 'stone', top: '#d6d8fa', side: '#5a5a9a', rim: '#ffffff' },
  edge: { kind: 'lanterns', c1: '#fff3a0', c2: '#ffffff', s1: '#3a3870', skip: 0.7, every: 6, glow: '#fff3a0' },
  props: { landmarks: ['observatory', 'nighttent'], cluster: [['snowpine', 4]], clusters: 6, scatter: [['starlantern', 2], ['telescope', 1], ['campfire', 1], ['amethyst', 1], ['snowpile', 2]], density: 16 },
  terrain: summitTerrain,
  emblem: { k: 'starlantern', s: 0.62, x: 0, y: 26 },
  fx: 'twinkle',
};
const ECHO = {
  g0: '#c9d08e',
  g1: '#97a35e',
  light: '#fff6d0',
  shadow: '#2a2a0e',
  mist: '#f4f0d0',
  pal: { ruin: '#ddd2b8', ivy: '#4f8a3a', leaf: ['#2f5a2a', '#4a7a3a', '#9ac470'], bark: '#6a4a2a', grass: ['#5a7a3a', '#7a9a4a'], flower: ['#ffffff', '#ffd34d'] },
  path: { style: 'slabs', w: 30, base: '#e6dcc4', edge: '#7a6a4a', hi: '#fffaf0', a: '#a89a78' },
  pad: { kind: 'stone', top: '#ece4cf', side: '#9a8c6c', rim: '#ffffff' },
  edge: { kind: 'tufts', c1: '#5a7a3a', skip: 0.4 },
  props: { landmarks: ['ruinarch', 'stonehead'], cluster: [['cypress', 3], ['valleybush', 2], ['brokencolumn', 1]], clusters: 9, scatter: [['brokencolumn', 2], ['amphora', 2], ['obelisk', 1], ['valleybush', 3], ['alpflowers', 3]], density: 28 },
  terrain: echoTerrain,
  emblem: { k: 'brokencolumn', s: 0.62, x: -2, y: 20 },
  fx: 'motes',
};
const ISLES = {
  g0: '#acdcff',
  g1: '#79b8ee',
  light: '#ffffff',
  shadow: '#1a3a6a',
  mist: '#ffffff',
  pal: { leaf: ['#25784a', '#3aa35a', '#86dc8e'], balloon: ['#ff7bb0', '#ffb34d'] },
  path: { style: 'rope', w: 28, base: '#d9a86a', edge: '#6a4422', hi: '#ffe0b0', rope: '#c9965a', post: '#7a4c28' },
  pad: { kind: 'isle', top: '#8fe07a', side: '#8a5e44', rim: '#d6ffc8' },
  edge: null,
  props: { landmarks: ['airship', 'isle2'], cluster: [['isle', 2], ['isle2', 1]], clusters: 4, scatter: [['balloon', 2], ['cloudpuff', 3], ['birds', 2], ['isle', 1]], density: 14 },
  terrain: islesTerrain,
  emblem: { k: 'isle', s: 0.55, x: 0, y: 10 },
  fx: 'clouds',
};
const CAVES = {
  g0: '#5a4a3e',
  g1: '#2e251f',
  light: '#ffcf8a',
  shadow: '#080503',
  mist: '#8a7058',
  pal: { brass: '#d9a24a', copper: '#c97a3c', gem: '#3fe0d0', rock: '#6a5646' },
  path: { style: 'rails', w: 28, base: '#4a3e34', edge: '#1a130e', hi: '#7a6656', tie: '#7a5232' },
  pad: { kind: 'gear', top: '#c9963e', side: '#6a4a22', rim: '#ffe0a0' },
  edge: { kind: 'crystals', c1: '#3fe0d0', c2: '#c8fff8', skip: 0.75 },
  props: { landmarks: ['clocktower', 'minecart'], cluster: [['stalagmite', 2], ['tealcrystal', 2], ['barrel', 1]], clusters: 8, scatter: [['gear', 2], ['gears2', 1], ['pipes', 1], ['cavelantern', 2], ['barrel', 2], ['tealcrystal', 2], ['stalagmite', 1]], density: 28 },
  terrain: cavesTerrain,
  emblem: { k: 'gear', s: 0.85, x: 0, y: 18 },
  fx: 'sparks',
};
const RIFT = {
  g0: '#f6d0ff',
  g1: '#b9a8ff',
  light: '#ffffff',
  shadow: '#3a1a6a',
  mist: '#ffe6ff',
  pal: { candy: ['#ff6fa8', '#5ec8ff', '#ffd34d', '#b48bff'] },
  path: { style: 'rainbow', w: 30, base: '#ffffff', edge: '#8a5ad0', hi: '#ffffff', bands: ['#ff5d73', '#ffa94d', '#ffe066', '#7fdc7a', '#5ec8ff', '#a98bff'] },
  pad: { kind: 'candy', top: '#fff0fa', side: '#ff8fc8', rim: '#ffffff' },
  edge: { kind: 'flowers', c1: '#ff8fd0', c2: '#ffffff', s1: '#b48bff', skip: 0.55 },
  props: { landmarks: ['rainbowarch', ['prism', 1.7]], cluster: [['lollipop', 2], ['lollipop2', 2], ['cottontree', 2]], clusters: 6, scatter: [['candycane', 2], ['gumdrops', 2], ['cupcake', 1], ['icecream', 1], ['prism', 1]], density: 20 },
  terrain: riftTerrain,
  emblem: { k: 'lollipop', s: 0.62, x: 0, y: 22 },
  fx: 'sparkle',
};

export const WORLD_ART = [BEACH, DUNES, CANYON, REEF, PEAKS, GLACIER, WOODS, NEON, GARDENS, MESA, STORM, SUMMIT, ECHO, ISLES, CAVES, RIFT];
