// Adventure map artwork: one illustrated SVG scene per world (ground, landmarks,
// outlined cartoon props) plus a smooth road. Props are shared <g> defs reused with
// <use>, placed deterministically and kept clear of the road and the chests.
import { hashString } from './engine.js';

const OL = '#2b1d2e';
const O = `stroke="${OL}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const SH = (rx = 16) => `<ellipse cx="0" cy="0" rx="${rx}" ry="${rx * 0.28}" fill="rgba(0,0,0,.2)"/>`;

function starPath(r1, r2, n = 5, cy = -14) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const r = i % 2 ? r2 : r1;
    d += `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`;
  }
  return `${d}Z`;
}

/* ---------- prop artwork (base at 0,0, drawn upwards) ---------- */
const PROPS = {
  // beach
  palm: `${SH(20)}<path d="M-4 0C-2-22 3-42 9-60L15-58C9-40 6-20 5 0Z" fill="#b97a3f" ${O}/>
    <g class="sway"><path d="M12-60C0-74-16-70-26-58C-12-62-2-60 12-60Z" fill="#43c062" ${O}/>
    <path d="M12-60C24-76 40-72 48-60C34-64 24-62 12-60Z" fill="#43c062" ${O}/>
    <path d="M12-60C6-80 16-90 26-92C18-82 16-72 12-60Z" fill="#5bd477" ${O}/>
    <path d="M12-60C-4-62-14-50-14-40C-6-50 2-56 12-60Z" fill="#36a853" ${O}/>
    <path d="M12-60C28-62 36-50 34-40C28-50 20-56 12-60Z" fill="#36a853" ${O}/>
    <circle cx="9" cy="-56" r="4" fill="#7a4a22" ${O}/><circle cx="16" cy="-55" r="4" fill="#7a4a22" ${O}/></g>`,
  umbrella: `${SH(24)}<rect x="-20" y="-8" width="40" height="10" rx="3" fill="#4aa8ff" ${O}/>
    <path d="M-1-2V-50" ${O} fill="none"/>
    <path d="M-28-40Q0-66 28-40Z" fill="#fff" ${O}/>
    <path d="M-28-40Q-18-56 0-58L-9-40ZM0-58Q18-56 28-40L9-40Z" fill="#ff5d73"/>
    <path d="M-28-40Q0-66 28-40Z" fill="none" ${O}/>`,
  starfish: `${SH(12)}<path d="${starPath(14, 6)}" fill="#ff8a5c" ${O}/><circle cx="-3" cy="-17" r="1.6" fill="#fff"/><circle cx="3" cy="-12" r="1.6" fill="#fff"/>`,
  rock: `${SH(18)}<path d="M-18 0C-20-10-12-20 0-20C12-22 20-12 18 0Z" fill="#a3a1b4" ${O}/><path d="M-8-14C-4-17 2-17 6-15" stroke="#fff" stroke-width="2.5" fill="none" opacity=".6" stroke-linecap="round"/>`,
  shell: `${SH(12)}<path d="M-12 0L0-22L12 0Z" fill="#ffd0dc" ${O}/><path d="M0-22L-6 0M0-22L0 0M0-22L6 0" stroke="#ff8fab" stroke-width="2"/><path d="M-12 0L0-22L12 0Z" fill="none" ${O}/>`,
  // dunes
  cactus: `${SH(16)}<path d="M-6 0V-46C-6-54 6-54 6-46V0Z" fill="#45b863" ${O}/>
    <path d="M-6-22H-14C-18-22-18-26-18-28V-36C-18-42-10-42-10-36V-30H-6" fill="#45b863" ${O}/>
    <path d="M6-28H14V-40C14-46 22-46 22-40V-30C22-24 18-22 14-22H6" fill="#45b863" ${O}/>
    <path d="M-1-44V-6" stroke="#2f8f4a" stroke-width="2"/>`,
  barrel: `${SH(14)}<ellipse cx="0" cy="-12" rx="13" ry="12" fill="#4dbf6a" ${O}/><path d="M-6-22V-2M0-24V0M6-22V-2" stroke="#2f8f4a" stroke-width="2"/><circle cx="0" cy="-25" r="4" fill="#ff6fa2" ${O}/>`,
  pyramid: `${SH(32)}<path d="M-32 0L0-46L32 0Z" fill="#f5c76a" ${O}/><path d="M0-46L32 0H6Z" fill="#d99a3a"/><path d="M-32 0L0-46L32 0Z" fill="none" ${O}/><path d="M-20-16H20M-12-30H12" stroke="#c78a2e" stroke-width="2"/>`,
  dunerock: `${SH(20)}<path d="M-20 0C-18-12-6-16 4-14C14-12 20-6 20 0Z" fill="#c98a4a" ${O}/>`,
  // canyon
  mesa: `${SH(34)}<path d="M-34 0L-24-44H24L34 0Z" fill="#d8703c" ${O}/><path d="M-30-14H30M-27-28H27" stroke="#a84b26" stroke-width="2.5"/><path d="M-24-44H24L22-38H-22Z" fill="#f09358"/><path d="M-34 0L-24-44H24L34 0Z" fill="none" ${O}/>`,
  spire: `${SH(12)}<path d="M-12 0L-6-60L4-66L12 0Z" fill="#c45f32" ${O}/><path d="M-9-20H10M-7-40H8" stroke="#963f1d" stroke-width="2.2"/>`,
  lava: `<ellipse cx="0" cy="-6" rx="26" ry="10" fill="#5a2414" ${O}/><ellipse class="glow" cx="0" cy="-6" rx="19" ry="6" fill="#ffb03a"/><ellipse cx="-4" cy="-7" rx="8" ry="2.5" fill="#fff3a0"/>`,
  deadtree: `${SH(12)}<path d="M-3 0L-2-30L-12-44M-2-30L0-50L-4-60M0-42L10-52M-1-22L8-30" stroke="${OL}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M-3 0L-2-30L-12-44M-2-30L0-50L-4-60M0-42L10-52M-1-22L8-30" stroke="#8a5a3a" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  // reef
  seaweed: `<g class="sway"><path d="M-4 0C-12-14 4-24-4-38C-10-48 0-56-2-64" stroke="${OL}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M-4 0C-12-14 4-24-4-38C-10-48 0-56-2-64" stroke="#3fcf7a" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M6 0C0-12 12-20 6-32C2-40 8-46 8-50" stroke="${OL}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M6 0C0-12 12-20 6-32C2-40 8-46 8-50" stroke="#2fb066" stroke-width="4" fill="none" stroke-linecap="round"/></g>`,
  coral: `${SH(16)}<path d="M0 0V-24M0-16L-12-30M-12-30V-40M0-24L10-38M-6-23L-16-22M6-30L16-32" stroke="${OL}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M0 0V-24M0-16L-12-30M-12-30V-40M0-24L10-38M-6-23L-16-22M6-30L16-32" stroke="#ff7b93" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  fish: `<g class="bob"><path d="M-14-30C-6-40 10-40 14-30C10-20-6-20-14-30Z" fill="#ffc23d" ${O}/><path d="M-14-30L-24-38V-22Z" fill="#ff9a3d" ${O}/><circle cx="7" cy="-32" r="2.2" fill="${OL}"/><path d="M-2-38V-22" stroke="#ff9a3d" stroke-width="2.5"/></g>`,
  clam: `${SH(14)}<path d="M-14-4C-14-16 14-16 14-4Z" fill="#b58bff" ${O}/><circle cx="0" cy="-8" r="4" fill="#fff" ${O}/><path d="M-14-4H14L10 0H-10Z" fill="#8e65e0" ${O}/>`,
  // peaks
  mountain: `${SH(36)}<path d="M-38 0L-8-52L4-38L14-50L38 0Z" fill="#8f7ce6" ${O}/><path d="M-8-52L-18-34L-10-36L-4-30L4-38ZM14-50L8-40L14-42L20-36Z" fill="#fff"/><path d="M-38 0L-8-52L4-38L14-50L38 0Z" fill="none" ${O}/>`,
  pine: `${SH(14)}<rect x="-3" y="-10" width="6" height="10" fill="#7a4a22" ${O}/><path d="M0-58L14-36H7L18-20H9L20-8H-20L-9-20H-18L-7-36H-14Z" fill="#3e8f63" ${O}/><path d="M0-58L-4-50L4-50Z" fill="#fff"/>`,
  crystal: `${SH(14)}<path d="M-10 0L-14-18L-6-34L2-18Z" fill="#c9a6ff" ${O}/><path d="M0 0L-2-28L8-44L14-26L10 0Z" fill="#a77bff" ${O}/><path d="M8-44L4-28L-2-28" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>`,
  // glacier
  iceberg: `${SH(30)}<path d="M-30 0L-20-26L-6-34L10-48L24-24L30 0Z" fill="#f2fbff" ${O}/><path d="M10-48L4-24L24-24ZM-20-26L-6-34L-8-14Z" fill="#bfe6fb"/><path d="M-30 0L-20-26L-6-34L10-48L24-24L30 0Z" fill="none" ${O}/>`,
  penguin: `${SH(12)}<ellipse cx="0" cy="-18" rx="12" ry="18" fill="#2b2d42" ${O}/><ellipse cx="0" cy="-14" rx="7.5" ry="12" fill="#fff"/><circle cx="-4" cy="-26" r="2" fill="#fff"/><circle cx="4" cy="-26" r="2" fill="#fff"/><circle cx="-4" cy="-26" r="1" fill="${OL}"/><circle cx="4" cy="-26" r="1" fill="${OL}"/><path d="M-3-22L0-19L3-22Z" fill="#ffb02e"/><path d="M-6 0H-1M1 0H6" stroke="#ffb02e" stroke-width="3" stroke-linecap="round"/>`,
  igloo: `${SH(28)}<path d="M-28 0C-28-34 28-34 28 0Z" fill="#f4fbff" ${O}/><path d="M-26-10H26M-18-20H18M-10 0V-10M8-10V-20M16 0V-10" stroke="#bcdcf0" stroke-width="2"/><path d="M-9 0C-9-14 9-14 9 0Z" fill="#5a7c99" ${O}/>`,
  snowpile: `${SH(22)}<path d="M-22 0C-22-12-10-16-2-14C4-22 18-18 22 0Z" fill="#ffffff" ${O}/>`,
  // woods
  tree: `${SH(20)}<rect x="-4" y="-18" width="8" height="18" fill="#8a5a32" ${O}/><g class="sway"><circle cx="-10" cy="-30" r="13" fill="#3fa356" ${O}/><circle cx="10" cy="-30" r="13" fill="#3fa356" ${O}/><circle cx="0" cy="-44" r="15" fill="#4fbf63" ${O}/><circle cx="-5" cy="-48" r="4" fill="#7fe08e"/></g>`,
  mushroom: `${SH(12)}<rect x="-4" y="-14" width="8" height="14" rx="3" fill="#fff4e0" ${O}/><path d="M-16-12C-16-30 16-30 16-12Z" fill="#ff5d5d" ${O}/><circle cx="-6" cy="-20" r="3" fill="#fff"/><circle cx="6" cy="-22" r="2.5" fill="#fff"/><circle cx="1" cy="-15" r="2" fill="#fff"/>`,
  bush: `${SH(18)}<circle cx="-9" cy="-9" r="10" fill="#3c9a4e" ${O}/><circle cx="9" cy="-9" r="10" fill="#3c9a4e" ${O}/><circle cx="0" cy="-15" r="11" fill="#4cb860" ${O}/><circle cx="-4" cy="-13" r="2.5" fill="#ff6f8f"/><circle cx="6" cy="-17" r="2.5" fill="#ff6f8f"/>`,
  stump: `${SH(14)}<path d="M-12 0V-14H12V0Z" fill="#9b6a3c" ${O}/><ellipse cx="0" cy="-14" rx="12" ry="5" fill="#d9a46a" ${O}/><ellipse cx="0" cy="-14" rx="5" ry="2" fill="none" stroke="#9b6a3c" stroke-width="1.5"/>`,
  // neon
  building: `${SH(22)}<rect x="-18" y="-64" width="36" height="64" rx="3" fill="#2a2457" ${O}/>
    <path d="M-10-54h6M4-54h6M-10-42h6M4-42h6M-10-30h6M4-30h6M-10-18h6M4-18h6" stroke="#ffd36b" stroke-width="5"/>
    <path d="M-10-42h6M4-18h6" stroke="#4a4580" stroke-width="5"/><path d="M0-64V-74" stroke="${OL}" stroke-width="2.5"/><circle class="blink" cx="0" cy="-76" r="3" fill="#ff4d8d"/>`,
  sign: `${SH(16)}<path d="M-2 0V-24M10 0V-24" stroke="${OL}" stroke-width="3"/><rect x="-16" y="-48" width="38" height="24" rx="8" fill="#1b1440" stroke="#ff5dc8" stroke-width="3.5"/><rect class="blink" x="-10" y="-41" width="26" height="10" rx="5" fill="#5df2ff"/>`,
  tower: `${SH(12)}<path d="M-10 0L-3-70H3L10 0Z" fill="#3a3270" ${O}/><path d="M-7-20H7M-5-40H5M-4-56H4" stroke="#6b62b8" stroke-width="2"/><circle class="blink" cx="0" cy="-74" r="4" fill="#5df2ff" ${O}/>`,
  lamp: `${SH(10)}<path d="M0 0V-44Q0-50 8-50" stroke="${OL}" stroke-width="4" fill="none"/><path d="M0 0V-44Q0-50 8-50" stroke="#7a72c8" stroke-width="2" fill="none"/><circle cx="10" cy="-48" r="5" fill="#fff3a0" ${O}/>`,
  // gardens
  flower: `${SH(10)}<path d="M0 0V-20" stroke="${OL}" stroke-width="5"/><path d="M0 0V-20" stroke="#3fae55" stroke-width="2.5"/><g class="sway"><circle cx="-6" cy="-26" r="5" fill="#ff8fb8" ${O}/><circle cx="6" cy="-26" r="5" fill="#ff8fb8" ${O}/><circle cx="0" cy="-32" r="5" fill="#ff8fb8" ${O}/><circle cx="0" cy="-20" r="5" fill="#ff8fb8" ${O}/><circle cx="0" cy="-26" r="4" fill="#ffd34d" ${O}/></g>`,
  hedge: `${SH(14)}<path d="M-9 0L-7-10H7L9 0Z" fill="#c4683a" ${O}/><circle cx="0" cy="-24" r="15" fill="#3fae55" ${O}/><circle cx="-5" cy="-29" r="4" fill="#6fd47f"/>`,
  arrowsign: `${SH(10)}<path d="M0 0V-34" stroke="${OL}" stroke-width="6"/><path d="M0 0V-34" stroke="#a8743f" stroke-width="3"/><path d="M-14-44H8L16-36L8-28H-14Z" fill="#6fe0ff" ${O}/><path d="M-8-36H6M2-40L6-36L2-32" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  // sunset mesa
  tumbleweed: `${SH(12)}<g class="bob"><circle cx="0" cy="-12" r="12" fill="#d9a35c" ${O}/><path d="M-8-16Q0-4 8-16M-8-8Q0-20 8-8M-10-12H10" stroke="#9a6a2e" stroke-width="2" fill="none"/></g>`,
  // storm lagoon
  buoy: `<g class="bob"><path d="M-12-4Q0 4 12-4L8-24H-8Z" fill="#ff5d5d" ${O}/><path d="M-10-14H10" stroke="#fff" stroke-width="5"/><path d="M0-24V-38" stroke="${OL}" stroke-width="3"/><circle class="blink" cx="0" cy="-40" r="4" fill="#fff3a0" ${O}/></g>`,
  cloud: `<g class="bob"><path d="M-22-30C-26-40-14-48-6-42C-2-52 14-52 16-40C26-42 30-30 22-26H-18C-24-26-24-30-22-30Z" fill="#c9d4ea" ${O}/><path d="M-12-20L-16-10M0-20L-4-10M12-20L8-10" stroke="#7fb4ff" stroke-width="3" stroke-linecap="round"/></g>`,
  lighthouse: `${SH(14)}<path d="M-10 0L-6-50H6L10 0Z" fill="#fff" ${O}/><path d="M-9-12H9M-7-30H7" stroke="#ff5d5d" stroke-width="7"/><path d="M-10 0L-6-50H6L10 0Z" fill="none" ${O}/><rect x="-8" y="-62" width="16" height="12" rx="3" fill="#fff3a0" ${O}/><path d="M-10-62L0-72L10-62Z" fill="#ff5d5d" ${O}/>`,
  // starlight summit
  star: `<path class="blink" d="${starPath(10, 4, 5, -26)}" fill="#fff3a0" ${O}/>`,
  telescope: `${SH(14)}<path d="M0-20L-10 0M0-20L10 0M0-20V0" stroke="${OL}" stroke-width="3"/><g transform="rotate(-30 0 -24)"><rect x="-18" y="-30" width="36" height="12" rx="4" fill="#7a72c8" ${O}/><rect x="14" y="-32" width="8" height="16" rx="2" fill="#fff3a0" ${O}/></g>`,
  // echo valley
  arch: `${SH(32)}<path d="M-32 0V-30C-32-52 32-52 32-30V0H18V-28C18-40-18-40-18-28V0Z" fill="#b48e72" ${O}/><path d="M-26-36C-20-46 20-46 26-36" stroke="#fff" stroke-width="3" fill="none" opacity=".4" stroke-linecap="round"/>`,
  pillar: `${SH(12)}<rect x="-9" y="-46" width="18" height="46" fill="#d7cfc0" ${O}/><rect x="-13" y="-52" width="26" height="8" rx="2" fill="#e8e1d4" ${O}/><path d="M-3-42V-4M3-42V-4" stroke="#b4aa98" stroke-width="2"/>`,
  // floating isles
  island: `<g class="bob"><path d="M-28-24H28L12 4L0-2L-14 6Z" fill="#9c6b4a" ${O}/><path d="M-30-24C-30-34 30-34 30-24Z" fill="#5fcf6f" ${O}/><circle cx="10" cy="-36" r="9" fill="#3fae55" ${O}/><path d="M10-28V-24" stroke="${OL}" stroke-width="3"/></g>`,
  balloon: `<g class="bob"><path d="M0-26V-6" stroke="${OL}" stroke-width="1.5"/><ellipse cx="0" cy="-38" rx="12" ry="14" fill="#ff7bb0" ${O}/><path d="M-4-42Q-2-48 2-48" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="-5" y="-8" width="10" height="8" rx="2" fill="#a8743f" ${O}/></g>`,
  // clockwork caves
  gear: `<g class="spin"><path d="${(() => { let d = ''; for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8; const r = i % 2 ? 13 : 17; d += `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r - 20).toFixed(1)}`; } return `${d}Z`; })()}" fill="#c9a24a" ${O}/><circle cx="0" cy="-20" r="5" fill="#6b5a2e" ${O}/></g>`,
  pipe: `${SH(16)}<path d="M-16 0V-30H8V-44" stroke="${OL}" stroke-width="13" fill="none" stroke-linejoin="round"/><path d="M-16 0V-30H8V-44" stroke="#b87a3c" stroke-width="8" fill="none" stroke-linejoin="round"/><rect x="2" y="-50" width="12" height="7" rx="2" fill="#d99a52" ${O}/>`,
  lantern: `${SH(8)}<path d="M0 0V-30" stroke="${OL}" stroke-width="3"/><rect x="-7" y="-46" width="14" height="16" rx="3" fill="#ffd36b" ${O}/><circle class="blink" cx="0" cy="-38" r="9" fill="rgba(255,220,120,.35)"/>`,
  // rainbow rift
  rainbow: `${SH(30)}<path d="M-30 0A30 30 0 0 1 30 0" stroke="${OL}" stroke-width="22" fill="none"/><path d="M-27 0A27 27 0 0 1 27 0" stroke="#ff5d73" stroke-width="5" fill="none"/><path d="M-22 0A22 22 0 0 1 22 0" stroke="#ffc23d" stroke-width="5" fill="none"/><path d="M-17 0A17 17 0 0 1 17 0" stroke="#5ed36a" stroke-width="5" fill="none"/><path d="M-12 0A12 12 0 0 1 12 0" stroke="#4aa8ff" stroke-width="5" fill="none"/>`,
  lollipop: `${SH(8)}<path d="M0 0V-24" stroke="${OL}" stroke-width="5"/><path d="M0 0V-24" stroke="#fff" stroke-width="2.5"/><circle cx="0" cy="-34" r="12" fill="#ff8fb8" ${O}/><path d="M0-34m-7 0a7 7 0 1 0 7-7a4 4 0 1 1-4 4" stroke="#fff" stroke-width="2.5" fill="none"/>`,
};


/* ---------- world themes ---------- */
export const MAP_THEMES = [
  { g0: '#f7e2ae', g1: '#efcf8a', road: '#fff6df', detail: '#e2b874', props: [['palm', 3], ['umbrella', 2], ['starfish', 2], ['rock', 1], ['shell', 2]], land: 'sea-left' },
  { g0: '#f6c47a', g1: '#e8a250', road: '#fff0d0', detail: '#d98a3c', props: [['cactus', 3], ['barrel', 2], ['pyramid', 1], ['dunerock', 2]], land: 'dunes' },
  { g0: '#d27447', g1: '#a94a2a', road: '#ffd9b8', detail: '#8e3a1f', props: [['mesa', 2], ['spire', 3], ['lava', 2], ['deadtree', 2], ['rock', 1]], land: 'patches' },
  { g0: '#3aa6cf', g1: '#1d6f9a', road: '#e9f7ff', detail: '#9fe3ff', props: [['seaweed', 3], ['coral', 3], ['fish', 2], ['clam', 1]], land: 'reef' },
  { g0: '#8b78e0', g1: '#5d4bb6', road: '#f1ecff', detail: '#4a3a9c', props: [['mountain', 2], ['pine', 3], ['crystal', 2], ['rock', 1]], land: 'patches' },
  { g0: '#dff3fc', g1: '#b5ddf2', road: '#ffffff', detail: '#9ccbe6', props: [['iceberg', 2], ['penguin', 2], ['igloo', 1], ['snowpile', 2], ['crystal', 1]], land: 'sea-right' },
  { g0: '#69bd62', g1: '#3f8f45', road: '#f7eccc', detail: '#2f7a37', props: [['tree', 4], ['mushroom', 2], ['bush', 2], ['stump', 1]], land: 'pond' },
  { g0: '#2c1d60', g1: '#140d36', road: '#d8d2ff', detail: '#4b3aa0', props: [['building', 3], ['sign', 2], ['tower', 2], ['lamp', 2]], land: 'grid' },
  { g0: '#9fe0a0', g1: '#6cc27a', road: '#fff8e6', detail: '#4fa65e', props: [['flower', 4], ['hedge', 2], ['arrowsign', 2], ['bush', 1]], land: 'pond' }, // 9 Arrow Gardens
  { g0: '#ffb27a', g1: '#e0705a', road: '#fff0dc', detail: '#c25a3c', props: [['mesa', 2], ['cactus', 2], ['tumbleweed', 2], ['spire', 1]], land: 'dunes' }, // 10 Sunset Mesa
  { g0: '#5f8fb0', g1: '#35607f', road: '#eef6ff', detail: '#9cc4e6', props: [['buoy', 2], ['cloud', 2], ['lighthouse', 1], ['rock', 2]], land: 'sea-left' }, // 11 Storm Lagoon
  { g0: '#2e2a66', g1: '#171440', road: '#e6e0ff', detail: '#fff3a0', props: [['star', 4], ['mountain', 2], ['telescope', 1], ['pine', 2]], land: 'patches' }, // 12 Starlight Summit
  { g0: '#e3c9a8', g1: '#c39f7a', road: '#fff8ee', detail: '#a98462', props: [['arch', 1], ['pillar', 3], ['rock', 2], ['bush', 1]], land: 'patches' }, // 13 Echo Valley
  { g0: '#a9dcff', g1: '#7cbcf0', road: '#ffffff', detail: '#ffffff', props: [['island', 3], ['balloon', 2], ['cloud', 2]], land: 'patches' }, // 14 Floating Isles
  { g0: '#5a4a3e', g1: '#3a2f27', road: '#f3e6cf', detail: '#8a7560', props: [['gear', 3], ['pipe', 2], ['lantern', 2], ['crystal', 1]], land: 'patches' }, // 15 Clockwork Caves
  { g0: '#f6c8ff', g1: '#b9a6ff', road: '#ffffff', detail: '#ffffff', props: [['rainbow', 1], ['lollipop', 3], ['crystal', 2], ['star', 2]], land: 'patches' }, // 16 Rainbow Rift
];
// Typical half-size of each prop, used for spacing.
const SIZE = { arch: 34, island: 30, rainbow: 32, lighthouse: 22, mountain: 40, mesa: 36, pyramid: 34, iceberg: 32, igloo: 30, building: 24, palm: 30, umbrella: 28, tree: 26, lava: 26 };

let defsDone = false;
export function ensureMapDefs() {
  if (defsDone || typeof document === 'undefined') return;
  defsDone = true;
  const holder = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  holder.setAttribute('width', '0');
  holder.setAttribute('height', '0');
  holder.setAttribute('aria-hidden', 'true');
  holder.style.position = 'absolute';
  holder.innerHTML = `<defs>${Object.entries(PROPS)
    .map(([k, v]) => `<g id="mp-${k}">${v}</g>`)
    .join('')}</defs>`;
  document.body.appendChild(holder);
}

/* ---------- geometry helpers ---------- */
/** Smooth path through points (Catmull-Rom → cubic Bézier). */
export function roadD(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function distToSeg(px, py, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / len));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}

/** Seeded random generator for one world. */
function rng(seed) {
  let s = hashString(seed) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ---------- scene ---------- */
/**
 * Build the scenery SVG for one world.
 * W,H: pixel size of the path area; road: road points [[x,y]...] (pixels);
 * avoid: extra circles [x,y,r] to keep clear (chests); top: how far the scene extends above.
 */
export function worldScene(w, W, H, road, avoid, top) {
  const th = MAP_THEMES[w % MAP_THEMES.length];
  const r = rng(`map:${w}`);
  const parts = [];
  const y0 = -top;
  // Landmarks painted on the ground.
  if (th.land === 'sea-left' || th.land === 'sea-right') {
    const left = th.land === 'sea-left';
    const edge = W * 0.075;
    let d = left ? `M-20 ${y0}H${edge}` : `M${W + 20} ${y0}H${W - edge}`;
    for (let y = y0; y < H + 40; y += 46) {
      const x = left ? edge + 9 : W - edge - 9;
      d += `Q${x} ${y + 23} ${left ? edge : W - edge} ${y + 46}`;
    }
    d += left ? `H-20Z` : `H${W + 20}Z`;
    const sea = left ? '#3cc6e0' : '#5aaedb';
    parts.push(`<path d="${d}" fill="${sea}" stroke="#fff" stroke-width="5" opacity=".95"/>`);
    for (let i = 0; i < 6; i++) {
      const y = y0 + r() * (H + top);
      const x = left ? 6 + r() * (edge - 18) : W - edge + 8 + r() * (edge - 18);
      parts.push(`<path d="M${x.toFixed(0)} ${y.toFixed(0)}q5-5 10 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7" stroke-linecap="round"/>`);
    }
  }
  if (th.land === 'dunes' || th.land === 'patches' || th.land === 'pond' || th.land === 'reef') {
    const n = th.land === 'dunes' ? 9 : 7;
    for (let i = 0; i < n; i++) {
      const cx = r() * W;
      const cy = y0 + r() * (H + top);
      const rx = 80 + r() * 90;
      const light = i % 2 === 0;
      const col = th.land === 'reef' ? (light ? '#f0dba2' : '#2a86b3') : light ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.08)';
      if (th.land === 'dunes') {
        parts.push(`<path d="M${(cx - rx).toFixed(0)} ${cy.toFixed(0)}Q${cx.toFixed(0)} ${(cy - rx * 0.45).toFixed(0)} ${(cx + rx).toFixed(0)} ${cy.toFixed(0)}Z" fill="${light ? '#fbd38f' : '#dc9446'}" opacity=".75"/>`);
      } else {
        parts.push(`<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${(rx * 0.45).toFixed(0)}" fill="${col}" opacity="${th.land === 'reef' ? 0.35 : 1}"/>`);
      }
    }
  }
  if (th.land === 'reef') {
    for (let i = 0; i < 4; i++) {
      const x = r() * W;
      parts.push(`<path d="M${x.toFixed(0)} ${y0}L${(x + 40).toFixed(0)} ${y0}L${(x - 60).toFixed(0)} ${H}L${(x - 120).toFixed(0)} ${H}Z" fill="#fff" opacity=".06"/>`);
    }
  }
  if (th.land === 'grid') {
    let g = '';
    for (let y = y0; y < H; y += 44) g += `M0 ${y}H${W}`;
    for (let x = 0; x < W; x += 44) g += `M${x} ${y0}V${H}`;
    parts.push(`<path d="${g}" stroke="#6a4fd8" stroke-width="1" opacity=".25"/>`);
  }
  // Small ground details (sand dots, grass tufts, sparkles...).
  let det = '';
  for (let i = 0; i < 46; i++) {
    const x = r() * W;
    const y = y0 + r() * (H + top);
    if (w % 16 === 6) det += `M${x.toFixed(0)} ${y.toFixed(0)}l3-7l2 7l3-6`;
    else if (w % 16 === 5) det += `M${(x - 4).toFixed(0)} ${y.toFixed(0)}h8m-4-4v8`;
    else det += `M${x.toFixed(0)} ${y.toFixed(0)}h0.1`;
  }
  parts.push(`<path d="${det}" stroke="${th.detail}" stroke-width="${w % 16 === 6 || w % 16 === 5 ? 2 : 5}" stroke-linecap="round" fill="none" opacity=".55"/>`);
  if (th.land === 'pond') {
    // a pond in the widest free spot is placed below among props
  }

  // Props, kept away from the road, the chests and each other.
  const bag = th.props.flatMap(([k, n]) => Array(n).fill(k));
  const placed = [];
  const clearOfRoad = (x, y, rad) => {
    for (let i = 0; i < road.length - 1; i++) if (distToSeg(x, y, road[i], road[i + 1]) < rad + 40) return false;
    for (const [ax, ay, ar] of avoid) if (Math.hypot(x - ax, y - ay) < rad + ar) return false;
    for (const [px, py, pr] of placed) if (Math.hypot(x - px, y - py) < rad + pr + 6) return false;
    return true;
  };
  const items = [];
  if (th.land === 'pond') {
    for (let tries = 0; tries < 60; tries++) {
      const x = 60 + r() * (W - 120);
      const y = 80 + r() * (H - 160);
      if (clearOfRoad(x, y, 46)) {
        placed.push([x, y, 46]);
        items.push({ y, svg: `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="46" ry="22" fill="#4fb8e8" stroke="${OL}" stroke-width="2.6"/><ellipse cx="${(x - 12).toFixed(0)}" cy="${(y - 6).toFixed(0)}" rx="14" ry="4" fill="#bfe9ff"/><ellipse cx="${(x + 22).toFixed(0)}" cy="${(y + 4).toFixed(0)}" rx="7" ry="3" fill="#5fd06a" stroke="${OL}" stroke-width="2"/>` });
        break;
      }
    }
  }
  const step = 34;
  for (let y = y0 + 40; y < H - 10; y += step) {
    for (let k = 0; k < 3; k++) {
      if (r() < 0.25) continue;
      const kind = bag[Math.floor(r() * bag.length)];
      const s = 0.8 + r() * 0.45;
      const rad = (SIZE[kind] || 20) * s;
      const x = 14 + r() * (W - 28);
      const yy = y + r() * step;
      if (x - rad * 0.6 < 0 || x + rad * 0.6 > W) continue;
      if (!clearOfRoad(x, yy - rad * 0.6, rad)) continue;
      placed.push([x, yy - rad * 0.6, rad]);
      const flip = r() < 0.5 ? -1 : 1;
      items.push({ y: yy, svg: `<use href="#mp-${kind}" class="mp mp-${kind}" transform="translate(${x.toFixed(0)} ${yy.toFixed(0)}) scale(${(s * flip).toFixed(2)} ${s.toFixed(2)})" style="--d:${(-r() * 4).toFixed(1)}s"/>` });
    }
  }
  items.sort((a, b) => a.y - b.y);
  return parts.join('') + items.map((i) => i.svg).join('');
}
