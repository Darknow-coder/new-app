// Marble collection: 97 skins in 19 series (one per world) that follow the player through the game.
//
// A skin only changes the *pattern* of a marble: every design is painted over the
// gameplay colour (var(--col) / var(--cold)), so puzzles stay readable whatever the skin.
// Designs are data: each new skin is a list of CSS background layers (+ optional extras)
// turned into a stylesheet at start-up.
import { store, save, computeStats } from './storage.js';
import { LANG } from './i18n.js';
import { worldOf } from './levels.js';
import { dateKey } from './daily.js';

/* ---------- reusable layers ---------- */
const HL = 'radial-gradient(circle at 34% 28%, #fff 0 6%, transparent 14%)';
const SHADE = 'radial-gradient(circle at 50% 45%, transparent 55%, rgba(0,0,0,.28) 100%)';
const BASE = 'radial-gradient(circle at 40% 35%, color-mix(in srgb, var(--col) 72%, #fff), var(--col) 50%, var(--cold))';
const W = (a) => `rgba(255,255,255,${a})`;
const K = (a) => `rgba(0,0,0,${a})`;
const L = (...layers) => [HL, ...layers, SHADE, BASE].join(',');

/* ---------- series ---------- */
export const SETS = [
  { id: 'classic', world: -1 },
  ...Array.from({ length: 16 }, (_, w) => ({ id: `w${w}`, world: w })),
  { id: 'cute', world: -2 },
  { id: 'season', world: -3 },
];
export const LEGEND_BONUS = 300;

/**
 * Skins. `bg` = background layers, `css` = extra declarations on .ball,
 * `before` / `after` = pseudo-element declarations, `fx` = extra class on the preview wrapper.
 * Classic skins keep their hand-written CSS (bg omitted).
 */
export const SKINS = [
  // ── Classiques (starter series) ─────────────────────────────────────────
  { id: 'classic', set: 'classic', rarity: 'common', n: ['Classic', 'Classique'] },
  { id: 'stripes', set: 'classic', rarity: 'common', n: ['Striped', 'Rayée'] },
  { id: 'dots', set: 'classic', rarity: 'common', n: ['Polka', 'À pois'] },
  { id: 'glass', set: 'classic', rarity: 'rare', n: ['Glass', 'Verre'] },
  { id: 'swirl', set: 'classic', rarity: 'rare', n: ['Swirl', 'Tourbillon'] },
  { id: 'metal', set: 'classic', rarity: 'rare', n: ['Chrome', 'Chrome'] },
  { id: 'galaxy', set: 'classic', rarity: 'epic', n: ['Galaxy', 'Galaxie'] },
  { id: 'neon', set: 'classic', rarity: 'epic', n: ['Neon', 'Néon'] },
  { id: 'gem', set: 'classic', rarity: 'epic', n: ['Diamond', 'Diamant'] },

  // ── Monde 1 · Plage aux galets ───────────────────────────────────────────
  { id: 'w0-sand', set: 'w0', rarity: 'common', n: ['Sandy', 'Sablée'],
    bg: L(`radial-gradient(circle, ${W(0.6)} 0 7%, transparent 9%) 0 0/22% 22%`, `radial-gradient(circle, ${K(0.18)} 0 6%, transparent 8%) 11% 13%/27% 27%`) },
  { id: 'w0-wave', set: 'w0', rarity: 'common', n: ['Wave', 'Vague'],
    bg: L(`repeating-radial-gradient(circle at 50% 135%, transparent 0 9%, ${W(0.5)} 9% 13%)`) },
  { id: 'w0-shell', set: 'w0', rarity: 'rare', n: ['Seashell', 'Coquillage'],
    bg: L(`repeating-conic-gradient(from 270deg at 50% 100%, ${W(0.45)} 0 6deg, transparent 6deg 15deg)`) },
  { id: 'w0-ball', set: 'w0', rarity: 'epic', n: ['Beach ball', 'Ballon de plage'],
    bg: [HL, `radial-gradient(circle, #fff 0 9%, transparent 10%)`, SHADE, `conic-gradient(var(--col) 0 60deg, #fff 0 120deg, var(--col) 0 180deg, #fff 0 240deg, var(--col) 0 300deg, #fff 0)`].join(',') },
  { id: 'w0-legend', set: 'w0', rarity: 'legendary', n: ['Tide Pearl', 'Perle des marées'],
    bg: L(`linear-gradient(115deg, transparent 30%, ${W(0.75)} 45%, transparent 60%) 0 0/300% 100%`, `radial-gradient(circle at 60% 70%, ${W(0.35)}, transparent 50%)`),
    css: 'animation: sk-sheen 2.8s linear infinite;' },

  // ── Monde 2 · Dunes dorées ───────────────────────────────────────────────
  { id: 'w1-strata', set: 'w1', rarity: 'common', n: ['Sandstone', 'Grès'],
    bg: L(`repeating-linear-gradient(170deg, ${W(0.3)} 0 7%, transparent 7% 16%, ${K(0.14)} 16% 20%, transparent 20% 28%)`) },
  { id: 'w1-cactus', set: 'w1', rarity: 'common', n: ['Cactus', 'Cactus'],
    bg: L(`radial-gradient(circle, #fff 0 9%, transparent 11%) 0 0/25% 25%`, `repeating-linear-gradient(90deg, ${K(0.16)} 0 4%, transparent 4% 16%)`) },
  { id: 'w1-sun', set: 'w1', rarity: 'rare', n: ['Sunburst', 'Soleil'],
    bg: L(`radial-gradient(circle, ${W(0.8)} 0 15%, transparent 17%)`, `repeating-conic-gradient(${W(0.5)} 0 5deg, transparent 5deg 22deg)`) },
  { id: 'w1-scarab', set: 'w1', rarity: 'epic', n: ['Scarab', 'Scarabée'],
    bg: [HL, `linear-gradient(135deg, transparent 15%, rgba(60,255,190,.45) 38%, rgba(140,90,255,.45) 62%, transparent 85%)`, `linear-gradient(165deg, color-mix(in srgb, var(--col) 30%, #fff), var(--col) 35%, var(--cold) 55%, var(--col) 75%)`].join(','),
    css: 'box-shadow: inset 0 0 0 2px rgba(255,255,255,.4), 0 5px 10px rgba(0,0,0,.35);' },
  { id: 'w1-legend', set: 'w1', rarity: 'legendary', n: ['Mirage', 'Mirage'],
    bg: L(`repeating-linear-gradient(0deg, ${W(0.32)} 0 3%, transparent 3% 9%) 0 0/100% 200%`),
    css: 'animation: sk-rise 1.6s linear infinite;' },

  // ── Monde 3 · Canyon de braise ───────────────────────────────────────────
  { id: 'w2-ash', set: 'w2', rarity: 'common', n: ['Ash', 'Cendre'],
    bg: L(`radial-gradient(circle, ${K(0.35)} 0 8%, transparent 10%) 0 0/20% 20%`, `radial-gradient(circle, ${W(0.35)} 0 5%, transparent 7%) 9% 9%/24% 24%`) },
  { id: 'w2-strata', set: 'w2', rarity: 'common', n: ['Canyon', 'Canyon'],
    bg: L(`repeating-linear-gradient(20deg, ${K(0.2)} 0 6%, transparent 6% 14%, ${W(0.25)} 14% 18%, transparent 18% 26%)`) },
  { id: 'w2-obsidian', set: 'w2', rarity: 'rare', n: ['Obsidian', 'Obsidienne'],
    bg: [HL, `radial-gradient(circle at 65% 70%, color-mix(in srgb, var(--col) 70%, transparent) 0 12%, transparent 30%)`, `radial-gradient(circle at 40% 35%, #43384f, #120e1a 70%)`].join(','),
    css: 'box-shadow: inset 0 0 0 3px var(--col), 0 0 10px color-mix(in srgb, var(--col) 60%, transparent), 0 5px 10px rgba(0,0,0,.35);' },
  { id: 'w2-lava', set: 'w2', rarity: 'epic', n: ['Lava', 'Lave'],
    bg: [HL, `repeating-conic-gradient(from 10deg, rgba(255,235,140,.85) 0 2.5deg, transparent 2.5deg 38deg)`, `radial-gradient(circle, rgba(255,220,120,.55), transparent 60%)`, `radial-gradient(circle at 40% 35%, var(--col), var(--cold) 60%, #2a0d05)`].join(','),
    css: 'animation: sk-glow 1.4s ease-in-out infinite;' },
  { id: 'w2-legend', set: 'w2', rarity: 'legendary', n: ['Ember Heart', 'Cœur de braise'],
    bg: L(`radial-gradient(circle at 50% 55%, rgba(255,240,170,.9) 0 12%, rgba(255,150,60,.6) 25%, transparent 45%)`),
    css: 'animation: sk-flame 1s ease-in-out infinite;' },

  // ── Monde 4 · Récif de corail ────────────────────────────────────────────
  { id: 'w3-scales', set: 'w3', rarity: 'common', n: ['Scales', 'Écailles'],
    bg: L(`radial-gradient(circle at 50% 0, transparent 40%, ${W(0.4)} 42% 50%, transparent 52%) 0 0/25% 22%`) },
  { id: 'w3-bubbles', set: 'w3', rarity: 'common', n: ['Bubbles', 'Bulles'],
    bg: L(`radial-gradient(circle at 30% 65%, transparent 8%, ${W(0.7)} 9% 11%, transparent 12%)`, `radial-gradient(circle at 62% 40%, transparent 5%, ${W(0.7)} 6% 8%, transparent 9%)`, `radial-gradient(circle at 70% 75%, transparent 3%, ${W(0.7)} 4% 6%, transparent 7%)`) },
  { id: 'w3-coral', set: 'w3', rarity: 'rare', n: ['Coral', 'Corail'],
    bg: L(`radial-gradient(circle at 30% 70%, color-mix(in srgb, var(--col) 40%, #fff) 0 12%, transparent 14%)`, `radial-gradient(circle at 68% 60%, color-mix(in srgb, var(--col) 40%, #fff) 0 9%, transparent 11%)`, `radial-gradient(circle at 55% 30%, color-mix(in srgb, var(--col) 40%, #fff) 0 7%, transparent 9%)`) },
  { id: 'w3-jelly', set: 'w3', rarity: 'epic', n: ['Jellyfish', 'Méduse'],
    bg: [HL, `repeating-linear-gradient(90deg, transparent 0 9%, ${W(0.5)} 9% 11%) 0 60%/100% 45% no-repeat`, `radial-gradient(ellipse 60% 45% at 50% 35%, ${W(0.45)}, transparent 70%)`, `radial-gradient(circle, color-mix(in srgb, var(--col) 50%, transparent) 30%, var(--col) 75%)`].join(','),
    css: 'animation: sk-glow 2.4s ease-in-out infinite;' },
  { id: 'w3-legend', set: 'w3', rarity: 'legendary', n: ['Abyss Treasure', 'Trésor des abysses'],
    bg: L(`radial-gradient(circle at 50% 50%, #fff 0 10%, color-mix(in srgb, var(--col) 30%, #fff) 14%, transparent 26%)`, `repeating-radial-gradient(circle, transparent 0 18%, ${W(0.3)} 18% 21%)`),
    css: 'animation: sk-pulse 1.8s ease-in-out infinite;' },

  // ── Monde 5 · Pics violets ───────────────────────────────────────────────
  { id: 'w4-snow', set: 'w4', rarity: 'common', n: ['Snowcap', 'Sommet enneigé'],
    bg: L(`linear-gradient(to bottom, ${W(0.85)} 0 26%, transparent 32%)`) },
  { id: 'w4-ridge', set: 'w4', rarity: 'common', n: ['Ridges', 'Crêtes'],
    bg: L(`repeating-linear-gradient(45deg, ${W(0.3)} 0 5%, transparent 5% 14%)`, `repeating-linear-gradient(-45deg, ${K(0.12)} 0 5%, transparent 5% 14%)`) },
  { id: 'w4-amethyst', set: 'w4', rarity: 'rare', n: ['Amethyst', 'Améthyste'],
    bg: [HL, `conic-gradient(from 30deg, ${W(0.5)} 0 15%, transparent 0 30%, ${K(0.15)} 0 45%, transparent 0 60%, ${W(0.35)} 0 75%, ${K(0.1)} 0 90%, transparent 0)`, BASE].join(','),
    css: 'box-shadow: inset 0 0 0 2px rgba(255,255,255,.55), 0 5px 10px rgba(0,0,0,.3);' },
  { id: 'w4-aurora', set: 'w4', rarity: 'epic', n: ['Aurora', 'Aurore'],
    bg: L(`linear-gradient(160deg, transparent 20%, rgba(120,255,200,.55) 35%, transparent 45%, rgba(170,120,255,.5) 60%, transparent 72%) 0 0/250% 250%`),
    css: 'animation: sk-aurora 4s ease-in-out infinite alternate;' },
  { id: 'w4-legend', set: 'w4', rarity: 'legendary', n: ['Peak Crown', 'Couronne des cimes'],
    bg: L(`conic-gradient(from 180deg at 50% 38%, transparent 0 140deg, #ffd34d 140deg 150deg, transparent 150deg 175deg, #ffd34d 175deg 185deg, transparent 185deg 210deg, #ffd34d 210deg 220deg, transparent 220deg)`),
    css: 'animation: sk-pulse 2s ease-in-out infinite;' },

  // ── Monde 6 · Baie des glaciers ──────────────────────────────────────────
  { id: 'w5-frost', set: 'w5', rarity: 'common', n: ['Frost', 'Givre'],
    bg: L(`radial-gradient(circle, transparent 48%, ${W(0.65)} 78%)`) },
  { id: 'w5-crack', set: 'w5', rarity: 'common', n: ['Cracked ice', 'Glace fêlée'],
    bg: L(`linear-gradient(32deg, transparent 47%, ${W(0.8)} 48% 50%, transparent 51%)`, `linear-gradient(115deg, transparent 58%, ${W(0.7)} 59% 61%, transparent 62%)`, `linear-gradient(75deg, transparent 30%, ${W(0.6)} 31% 32.5%, transparent 33.5%)`) },
  { id: 'w5-flake', set: 'w5', rarity: 'rare', n: ['Snowflake', 'Flocon'],
    bg: L(`radial-gradient(circle, transparent 0 8%, transparent 46%)`, `repeating-conic-gradient(${W(0.85)} 0 3deg, transparent 3deg 60deg)`),
    css: '-webkit-mask: radial-gradient(circle, #000 69%, transparent 70%); mask: radial-gradient(circle, #000 69%, transparent 70%);' },
  { id: 'w5-glacier', set: 'w5', rarity: 'epic', n: ['Glacier', 'Glacier'],
    bg: [HL, `linear-gradient(130deg, transparent 40%, ${W(0.8)} 41% 43%, transparent 44%)`, `radial-gradient(circle at 50% 55%, color-mix(in srgb, var(--col) 35%, transparent) 0 40%, var(--col) 80%)`, `linear-gradient(#dff4ff, #9fd6ff)`].join(','),
    css: 'box-shadow: inset 0 0 0 2px #fff, 0 0 12px rgba(160,220,255,.7), 0 5px 10px rgba(0,0,0,.3); animation: sk-glow 3s ease-in-out infinite;' },
  { id: 'w5-legend', set: 'w5', rarity: 'legendary', n: ['North Star', 'Étoile polaire'],
    bg: L(`conic-gradient(from 45deg, transparent 0 40deg, ${W(0.95)} 44deg 46deg, transparent 50deg 130deg, ${W(0.95)} 134deg 136deg, transparent 140deg 220deg, ${W(0.95)} 224deg 226deg, transparent 230deg 310deg, ${W(0.95)} 314deg 316deg, transparent 320deg)`, `radial-gradient(circle, #fff 0 9%, transparent 14%)`),
    css: 'animation: sk-twinkle 1.6s ease-in-out infinite;' },

  // ── Monde 7 · Bois moussu ────────────────────────────────────────────────
  { id: 'w6-grain', set: 'w6', rarity: 'common', n: ['Wood grain', 'Bois'],
    bg: L(`repeating-radial-gradient(ellipse at 30% 40%, ${K(0.15)} 0 3%, transparent 3% 8%)`) },
  { id: 'w6-leaf', set: 'w6', rarity: 'common', n: ['Leaf', 'Feuille'],
    bg: L(`linear-gradient(135deg, transparent 49%, ${W(0.7)} 49.5% 51%, transparent 51.5%)`, `repeating-linear-gradient(45deg, transparent 0 12%, ${W(0.35)} 12% 13.5%)`) },
  { id: 'w6-shroom', set: 'w6', rarity: 'rare', n: ['Toadstool', 'Champignon'],
    bg: L(`radial-gradient(circle at 30% 35%, #fff 0 10%, transparent 11%)`, `radial-gradient(circle at 66% 28%, #fff 0 8%, transparent 9%)`, `radial-gradient(circle at 60% 62%, #fff 0 11%, transparent 12%)`, `radial-gradient(circle at 26% 70%, #fff 0 6%, transparent 7%)`) },
  { id: 'w6-firefly', set: 'w6', rarity: 'epic', n: ['Fireflies', 'Lucioles'],
    bg: [HL, `radial-gradient(circle at 30% 60%, #fff9b0 0 5%, transparent 12%)`, `radial-gradient(circle at 65% 35%, #fff9b0 0 4%, transparent 10%)`, `radial-gradient(circle at 70% 72%, #fff9b0 0 3%, transparent 9%)`, `radial-gradient(circle at 40% 35%, var(--col), var(--cold) 65%, #0d1f12)`].join(','),
    css: 'animation: sk-twinkle 1.3s ease-in-out infinite;' },
  { id: 'w6-legend', set: 'w6', rarity: 'legendary', n: ['Forest Spirit', 'Esprit de la forêt'],
    bg: L(`radial-gradient(circle at 50% 50%, ${W(0.7)} 0 8%, transparent 30%)`, `repeating-conic-gradient(from 0deg, ${W(0.3)} 0 10deg, transparent 10deg 30deg)`),
    css: 'animation: sk-aura 2.2s ease-in-out infinite;' },

  // ── Monde 8 · Ville néon ─────────────────────────────────────────────────
  { id: 'w7-grid', set: 'w7', rarity: 'common', n: ['Grid', 'Grille'],
    bg: L(`linear-gradient(${W(0.45)} 1.5px, transparent 1.5px) 0 0/22% 22%`, `linear-gradient(90deg, ${W(0.45)} 1.5px, transparent 1.5px) 0 0/22% 22%`) },
  { id: 'w7-pixel', set: 'w7', rarity: 'common', n: ['Pixel', 'Pixel'],
    bg: L(`conic-gradient(${W(0.3)} 25%, transparent 0 50%, ${W(0.3)} 0 75%, transparent 0) 0 0/25% 25%`) },
  { id: 'w7-circuit', set: 'w7', rarity: 'rare', n: ['Circuit', 'Circuit'],
    bg: L(`radial-gradient(circle at 30% 40%, #fff 0 5%, transparent 6%)`, `radial-gradient(circle at 70% 65%, #fff 0 5%, transparent 6%)`, `linear-gradient(90deg, transparent 30%, ${W(0.7)} 30% 70%, transparent 70%) 0 40%/100% 4% no-repeat`, `linear-gradient(transparent 40%, ${W(0.7)} 40% 65%, transparent 65%) 70% 0/4% 100% no-repeat`) },
  { id: 'w7-pulse', set: 'w7', rarity: 'epic', n: ['Pulse', 'Pulsation'],
    bg: [HL, `radial-gradient(circle, #10122a 0 30%, var(--col) 36%, transparent 40%, transparent 52%, var(--col) 56%, transparent 60%)`, `radial-gradient(circle, #10122a 60%, var(--col) 72%)`].join(','),
    css: 'animation: sk-neon 1.2s ease-in-out infinite;' },
  { id: 'w7-legend', set: 'w7', rarity: 'legendary', n: ['Hologram', 'Hologramme'],
    bg: L(`linear-gradient(120deg, rgba(255,80,200,.4), rgba(80,220,255,.4), rgba(255,240,80,.4), rgba(255,80,200,.4)) 0 0/300% 300%`, `repeating-linear-gradient(0deg, ${W(0.2)} 0 2%, transparent 2% 5%)`),
    css: 'animation: sk-holo 3s linear infinite;' },

  // ── Monde 9 · Jardins fléchés ───────────────────────────────────────────
  { id: 'w8-petal', set: 'w8', rarity: 'common', n: ['Petals', 'Pétales'],
    bg: L(`repeating-conic-gradient(from 15deg, ${W(0.42)} 0 18deg, transparent 18deg 45deg)`, `radial-gradient(circle, #fff6a8 0 12%, transparent 14%)`) },
  { id: 'w8-hedge', set: 'w8', rarity: 'common', n: ['Hedge maze', 'Labyrinthe'],
    bg: L(`linear-gradient(90deg, ${K(0.18)} 0 12%, transparent 12%) 0 0/33% 33%`, `linear-gradient(${K(0.18)} 0 12%, transparent 12%) 0 0/33% 33%`) },
  { id: 'w8-arrow', set: 'w8', rarity: 'rare', n: ['Chevron', 'Chevron'],
    bg: L(`linear-gradient(135deg, ${W(0.55)} 25%, transparent 25%) -10% 0/28% 28%`, `linear-gradient(225deg, ${W(0.55)} 25%, transparent 25%) -10% 0/28% 28%`) },
  { id: 'w8-tulip', set: 'w8', rarity: 'epic', n: ['Tulip', 'Tulipe'],
    bg: L(`radial-gradient(ellipse 22% 34% at 50% 40%, ${W(0.85)} 0 60%, transparent 64%)`, `radial-gradient(ellipse 18% 30% at 34% 46%, ${W(0.55)} 0 60%, transparent 64%)`, `radial-gradient(ellipse 18% 30% at 66% 46%, ${W(0.55)} 0 60%, transparent 64%)`, `linear-gradient(transparent 62%, #5ed36a 62% 70%, transparent 70%) 50% 0/6% 100% no-repeat`),
    css: 'animation: sk-glow 2.6s ease-in-out infinite;' },
  { id: 'w8-legend', set: 'w8', rarity: 'legendary', n: ['Compass Rose', 'Rose des vents'],
    before: `inset: 6%; border-radius: 50%; background: conic-gradient(from -22.5deg, ${W(0.9)} 0 8deg, transparent 8deg 37deg, ${W(0.5)} 37deg 53deg, transparent 53deg 82deg, ${W(0.9)} 82deg 98deg, transparent 98deg 127deg, ${W(0.5)} 127deg 143deg, transparent 143deg 172deg, ${W(0.9)} 172deg 188deg, transparent 188deg 217deg, ${W(0.5)} 217deg 233deg, transparent 233deg 262deg, ${W(0.9)} 262deg 278deg, transparent 278deg 307deg, ${W(0.5)} 307deg 323deg, transparent 323deg 352deg, ${W(0.9)} 352deg); animation: sk-spin 9s linear infinite;`,
    after: `background: ${HL};` },

  // ── Monde 10 · Mesa du couchant ─────────────────────────────────────────
  { id: 'w9-dusk', set: 'w9', rarity: 'common', n: ['Dusk', 'Crépuscule'],
    bg: L(`radial-gradient(circle at 68% 30%, #fff 0 4%, transparent 6%)`, `linear-gradient(transparent 58%, ${K(0.3)} 58% 64%, transparent 64% 72%, ${K(0.4)} 72%)`, `linear-gradient(${W(0.45)}, transparent 50%)`) },
  { id: 'w9-mesa', set: 'w9', rarity: 'common', n: ['Mesa', 'Mesa'],
    bg: L(`linear-gradient(transparent 55%, ${K(0.22)} 55% 63%, transparent 63% 70%, ${K(0.3)} 70%)`, `linear-gradient(90deg, transparent 20%, ${K(0.2)} 20% 45%, transparent 45%) 0 48%/100% 10% no-repeat`) },
  { id: 'w9-sunset', set: 'w9', rarity: 'rare', n: ['Sunset', 'Couchant'],
    bg: L(`radial-gradient(circle at 50% 62%, #fff3b0 0 16%, transparent 18%)`, `linear-gradient(transparent 62%, ${K(0.35)} 62%)`, `repeating-linear-gradient(transparent 0 6%, ${W(0.18)} 6% 8%)`) },
  { id: 'w9-rose', set: 'w9', rarity: 'epic', n: ['Desert Rose', 'Rose des sables'],
    bg: L(`repeating-radial-gradient(circle at 50% 50%, ${W(0.5)} 0 3%, transparent 3% 9%)`, `repeating-conic-gradient(${K(0.18)} 0 12deg, transparent 12deg 40deg)`),
    css: 'box-shadow: inset 0 0 0 2px rgba(255,220,170,.6), 0 5px 10px rgba(0,0,0,.35);' },
  { id: 'w9-legend', set: 'w9', rarity: 'legendary', n: ['Golden Hour', 'Heure dorée'],
    bg: L(`linear-gradient(115deg, transparent 30%, rgba(255,215,120,.85) 45%, transparent 60%) 0 0/300% 100%`, `radial-gradient(circle at 50% 70%, rgba(255,190,90,.5), transparent 55%)`),
    css: 'animation: sk-sheen 2.4s linear infinite;' },

  // ── Monde 11 · Lagune d'orage ───────────────────────────────────────────
  { id: 'w10-rain', set: 'w10', rarity: 'common', n: ['Rain', 'Pluie'],
    bg: L(`repeating-linear-gradient(105deg, transparent 0 7%, ${W(0.4)} 7% 8.5%)`) },
  { id: 'w10-ripple', set: 'w10', rarity: 'common', n: ['Ripples', 'Ronds dans l’eau'],
    bg: L(`repeating-radial-gradient(circle at 40% 60%, transparent 0 8%, ${W(0.4)} 8% 10%)`) },
  { id: 'w10-cloud', set: 'w10', rarity: 'rare', n: ['Raincloud', 'Nuage'],
    bg: L(`radial-gradient(circle at 36% 42%, ${W(0.85)} 0 15%, transparent 16%)`, `radial-gradient(circle at 56% 36%, ${W(0.85)} 0 18%, transparent 19%)`, `radial-gradient(circle at 70% 46%, ${W(0.85)} 0 13%, transparent 14%)`, `linear-gradient(transparent 44%, ${W(0.85)} 44% 54%, transparent 54%) 50% 0/48% 100% no-repeat`) },
  { id: 'w10-bolt', set: 'w10', rarity: 'epic', n: ['Lightning', 'Éclair'],
    bg: [HL, `linear-gradient(115deg, transparent 47%, #fff6a0 47% 53%, transparent 53%) 40% 20%/40% 40% no-repeat`, `linear-gradient(65deg, transparent 44%, #fff6a0 44% 56%, transparent 56%) 52% 50%/28% 30% no-repeat`, `linear-gradient(115deg, transparent 47%, #fff6a0 47% 53%, transparent 53%) 58% 78%/36% 36% no-repeat`, `radial-gradient(circle at 40% 35%, var(--col), var(--cold) 55%, #141a33 95%)`].join(','),
    css: 'box-shadow: inset 0 0 0 3px var(--col), 0 5px 10px rgba(0,0,0,.35); animation: sk-flash 2.6s ease-in-out infinite;' },
  { id: 'w10-legend', set: 'w10', rarity: 'legendary', n: ['Eye of the Storm', 'Œil du cyclone'],
    before: `inset: 4%; border-radius: 50%; background: repeating-conic-gradient(from 0deg, ${W(0.55)} 0 14deg, transparent 14deg 45deg), radial-gradient(circle, transparent 0 18%, ${K(0.25)} 60%); -webkit-mask: radial-gradient(circle, transparent 0 16%, #000 18%); mask: radial-gradient(circle, transparent 0 16%, #000 18%); animation: sk-spin 3s linear infinite;`,
    after: `background: ${HL};` },

  // ── Monde 12 · Sommet étoilé ────────────────────────────────────────────
  { id: 'w11-stardust', set: 'w11', rarity: 'common', n: ['Stardust', 'Poussière d’étoiles'],
    bg: L(`radial-gradient(circle, #fff 0 4%, transparent 6%) 0 0/18% 18%`, `radial-gradient(circle, ${W(0.6)} 0 3%, transparent 5%) 9% 7%/23% 23%`) },
  { id: 'w11-moon', set: 'w11', rarity: 'common', n: ['Crescent', 'Croissant de lune'],
    bg: [HL, `radial-gradient(circle at 62% 42%, var(--col) 0 24%, transparent 25%)`, `radial-gradient(circle at 52% 48%, #fffbe0 0 26%, transparent 27%)`, SHADE, BASE].join(',') },
  { id: 'w11-constellation', set: 'w11', rarity: 'rare', n: ['Constellation', 'Constellation'],
    bg: [HL, `radial-gradient(circle at 26% 34%, #fff 0 4%, transparent 6%)`, `radial-gradient(circle at 52% 26%, #fff 0 5%, transparent 7%)`, `radial-gradient(circle at 70% 52%, #fff 0 4%, transparent 6%)`, `radial-gradient(circle at 42% 70%, #fff 0 5%, transparent 7%)`, `linear-gradient(-17deg, transparent 49%, ${W(0.5)} 49.5% 51%, transparent 51.5%) 26% 26%/28% 12% no-repeat`, `linear-gradient(54deg, transparent 48%, ${W(0.5)} 48.5% 51.5%, transparent 52%) 52% 26%/20% 28% no-repeat`, `radial-gradient(circle at 40% 35%, var(--col), var(--cold) 55%, #0b0d22)`].join(','),
    css: 'animation: sk-twinkle 2s ease-in-out infinite;' },
  { id: 'w11-nebula', set: 'w11', rarity: 'epic', n: ['Nebula', 'Nébuleuse'],
    bg: L(`radial-gradient(circle at 30% 60%, rgba(255,110,200,.55), transparent 40%)`, `radial-gradient(circle at 68% 38%, rgba(110,200,255,.55), transparent 42%)`, `radial-gradient(circle, #fff 0 3%, transparent 5%) 0 0/26% 26%`) ,
    css: 'animation: sk-glow 3s ease-in-out infinite;' },
  { id: 'w11-legend', set: 'w11', rarity: 'legendary', n: ['Supernova', 'Supernova'],
    bg: L(`radial-gradient(circle, #fff 0 12%, rgba(255,240,180,.8) 18%, transparent 34%)`, `repeating-conic-gradient(${W(0.6)} 0 3deg, transparent 3deg 20deg)`),
    css: 'animation: sk-pulse 1.4s ease-in-out infinite;' },

  // ── Monde 13 · Vallée des échos ─────────────────────────────────────────
  { id: 'w12-echo', set: 'w12', rarity: 'common', n: ['Echo', 'Écho'],
    bg: L(`repeating-radial-gradient(circle at 20% 50%, transparent 0 10%, ${W(0.35)} 10% 12%)`) },
  { id: 'w12-pebble', set: 'w12', rarity: 'common', n: ['River stone', 'Galet'],
    bg: L(`radial-gradient(ellipse 30% 20% at 35% 40%, ${W(0.4)} 0 60%, transparent 65%)`, `radial-gradient(circle, ${K(0.3)} 0 6%, transparent 8%) 0 0/24% 24%`, `radial-gradient(circle, ${W(0.45)} 0 5%, transparent 7%) 10% 12%/19% 19%`) },
  { id: 'w12-fern', set: 'w12', rarity: 'rare', n: ['Fern', 'Fougère'],
    bg: L(`linear-gradient(90deg, transparent 48%, ${W(0.8)} 48% 52%, transparent 52%)`, `repeating-linear-gradient(60deg, transparent 0 9%, ${W(0.55)} 9% 11%) 0 0/50% 100% no-repeat`, `repeating-linear-gradient(-60deg, transparent 0 9%, ${W(0.55)} 9% 11%) 100% 0/50% 100% no-repeat`) },
  { id: 'w12-wind', set: 'w12', rarity: 'epic', n: ['Valley wind', 'Vent de vallée'],
    bg: L(`repeating-radial-gradient(ellipse 120% 40% at 0 50%, transparent 0 14%, ${W(0.55)} 14% 17%, transparent 17% 24%) 0 0/200% 100%`),
    css: 'animation: sk-wind 2.2s linear infinite;' },
  { id: 'w12-legend', set: 'w12', rarity: 'legendary', n: ['Resonance', 'Résonance'],
    bg: L(`repeating-radial-gradient(circle, transparent 0 12%, ${W(0.55)} 12% 15%)`, `radial-gradient(circle, #fff 0 8%, transparent 12%)`),
    css: 'animation: sk-pulse 1.2s ease-in-out infinite;' },

  // ── Monde 14 · Îles flottantes ──────────────────────────────────────────
  { id: 'w13-sky', set: 'w13', rarity: 'common', n: ['Blue sky', 'Ciel bleu'],
    bg: L(`radial-gradient(circle at 30% 78%, ${W(0.8)} 0 16%, transparent 17%)`, `radial-gradient(circle at 55% 82%, ${W(0.8)} 0 20%, transparent 21%)`, `radial-gradient(circle at 78% 76%, ${W(0.8)} 0 14%, transparent 15%)`) },
  { id: 'w13-feather', set: 'w13', rarity: 'common', n: ['Feather', 'Plume'],
    bg: L(`linear-gradient(130deg, transparent 49%, ${W(0.8)} 49.5% 51%, transparent 51.5%)`, `repeating-linear-gradient(40deg, transparent 0 8%, ${W(0.35)} 8% 10%)`) },
  { id: 'w13-balloon', set: 'w13', rarity: 'rare', n: ['Hot-air balloon', 'Montgolfière'],
    bg: [HL, `repeating-linear-gradient(90deg, var(--col) 0 16%, #fff 16% 22%, var(--cold) 22% 38%, #ffd34d 38% 44%)`].join(','),
    css: 'box-shadow: inset 0 -6px 10px rgba(0,0,0,.25), 0 5px 10px rgba(0,0,0,.35);' },
  { id: 'w13-isle', set: 'w13', rarity: 'epic', n: ['Floating isle', 'Île volante'],
    bg: L(`radial-gradient(ellipse 34% 14% at 50% 52%, #7ad36a 0 70%, transparent 72%)`, `conic-gradient(from 150deg at 50% 86%, transparent 0, #8a5a3c 0 60deg, transparent 0) 0 0/100% 100%`, `radial-gradient(circle at 70% 26%, ${W(0.85)} 0 9%, transparent 10%)`),
    css: 'animation: sk-float 2.6s ease-in-out infinite;' },
  { id: 'w13-legend', set: 'w13', rarity: 'legendary', n: ['Skyward', 'Vers les nuages'],
    bg: L(`radial-gradient(circle, ${W(0.8)} 0 10%, transparent 11%) 0 0/34% 30%`, `radial-gradient(circle, ${W(0.5)} 0 7%, transparent 8%) 17% 15%/34% 30%`) ,
    css: 'animation: sk-rise 2.4s linear infinite;' },

  // ── Monde 15 · Cavernes mécaniques ──────────────────────────────────────
  { id: 'w14-rivet', set: 'w14', rarity: 'common', n: ['Rivets', 'Rivets'],
    bg: L(`radial-gradient(circle, transparent 0 58%, ${K(0.3)} 59% 63%, transparent 64%)`, `repeating-conic-gradient(from 0deg, transparent 0 18deg, ${W(0.85)} 18deg 24deg, transparent 24deg 45deg)`),
    css: '-webkit-mask: radial-gradient(circle, #000 70%, transparent 71%); mask: radial-gradient(circle, #000 70%, transparent 71%);' },
  { id: 'w14-brass', set: 'w14', rarity: 'common', n: ['Brass', 'Laiton'],
    bg: L(`repeating-linear-gradient(0deg, rgba(255,210,120,.35) 0 6%, transparent 6% 12%, ${K(0.12)} 12% 14%, transparent 14% 20%)`) },
  { id: 'w14-gear', set: 'w14', rarity: 'rare', n: ['Cog', 'Rouage'],
    before: `inset: 10%; border-radius: 50%; background: repeating-conic-gradient(${W(0.75)} 0 15deg, transparent 15deg 30deg); -webkit-mask: radial-gradient(circle, transparent 0 22%, #000 24% 70%, transparent 72%), radial-gradient(circle, #000 0 56%, transparent 58%); mask: radial-gradient(circle, transparent 0 22%, #000 24% 70%, transparent 72%); animation: sk-spin 7s linear infinite;`,
    after: `background: ${HL};` },
  { id: 'w14-clock', set: 'w14', rarity: 'epic', n: ['Pocket watch', 'Montre à gousset'],
    bg: [HL, `radial-gradient(circle, #2a2140 0 5%, transparent 6%)`, `repeating-conic-gradient(#2a2140 0 2deg, transparent 2deg 30deg)`, `radial-gradient(circle, transparent 60%, #2a2140 61% 64%, transparent 65%)`, `radial-gradient(circle, color-mix(in srgb, var(--col) 40%, #fff) 0 66%, var(--col) 67%)`].join(','),
    before: `inset: 20% 48.5% 50% 48.5%; background: #2a2140; border-radius: 2px; transform-origin: 50% 100%; animation: sk-spin 4s steps(12) infinite;`,
    css: 'box-shadow: inset 0 0 0 2px rgba(255,210,120,.8), 0 5px 10px rgba(0,0,0,.35);' },
  { id: 'w14-legend', set: 'w14', rarity: 'legendary', n: ['Perpetual Engine', 'Moteur perpétuel'],
    before: `inset: 4%; border-radius: 50%; background: repeating-conic-gradient(rgba(255,215,120,.9) 0 10deg, transparent 10deg 20deg); -webkit-mask: radial-gradient(circle, transparent 0 58%, #000 60% 72%, transparent 74%); mask: radial-gradient(circle, transparent 0 58%, #000 60% 72%, transparent 74%); animation: sk-spin 5s linear infinite;`,
    after: `background: ${HL}, radial-gradient(circle, rgba(255,230,160,.8) 0 14%, transparent 30%);`,
    css: 'animation: sk-glow 2s ease-in-out infinite;' },

  // ── Monde 16 · Faille arc-en-ciel ───────────────────────────────────────
  { id: 'w15-prism', set: 'w15', rarity: 'common', n: ['Prism', 'Prisme'],
    bg: L(`linear-gradient(120deg, transparent 30%, rgba(255,93,115,.35) 40%, rgba(255,194,61,.35) 50%, rgba(31,209,185,.35) 60%, transparent 70%)`) },
  { id: 'w15-candy', set: 'w15', rarity: 'common', n: ['Candy', 'Bonbon'],
    bg: L(`repeating-linear-gradient(45deg, ${W(0.6)} 0 8%, transparent 8% 18%)`) },
  { id: 'w15-lolly', set: 'w15', rarity: 'rare', n: ['Lollipop', 'Sucette'],
    before: `inset: 0; border-radius: 50%; background: repeating-conic-gradient(from 0deg, ${W(0.7)} 0 20deg, transparent 20deg 40deg); -webkit-mask: repeating-radial-gradient(circle, #000 0 12%, rgba(0,0,0,.4) 12% 24%); mask: repeating-radial-gradient(circle, #000 0 12%, rgba(0,0,0,.4) 12% 24%); animation: sk-spin 6s linear infinite;`,
    after: `background: ${HL};` },
  { id: 'w15-opal', set: 'w15', rarity: 'epic', n: ['Opal', 'Opale'],
    bg: L(`linear-gradient(120deg, rgba(255,120,200,.28), rgba(120,220,255,.28), rgba(180,255,150,.28), rgba(255,120,200,.28)) 0 0/300% 300%`, `radial-gradient(circle at 60% 60%, ${W(0.35)}, transparent 50%)`),
    css: 'animation: sk-holo 4s linear infinite;' },
  { id: 'w15-legend', set: 'w15', rarity: 'legendary', n: ['Rift Core', 'Cœur de la faille'],
    before: `inset: 0; border-radius: 50%; background: conic-gradient(#ff5d73, #ffc23d, #5ed36a, #1fd1b9, #4aa8ff, #9a7bff, #ff5d73); -webkit-mask: radial-gradient(circle, transparent 0 60%, #000 62% 70%, transparent 71%); mask: radial-gradient(circle, transparent 0 60%, #000 62% 70%, transparent 71%); animation: sk-spin 4s linear infinite;`,
    after: `background: ${HL}, radial-gradient(circle, ${W(0.8)} 0 8%, transparent 22%);`,
    css: 'animation: sk-pulse 1.6s ease-in-out infinite;' },

  // ── Mignonnes (milestones) ───────────────────────────────────────────────
  { id: 'cute-smile', set: 'cute', rarity: 'rare', n: ['Smiley', 'Souriante'], face: 'smile', req: 'reqPlayer5' },
  { id: 'cute-wink', set: 'cute', rarity: 'rare', n: ['Winky', 'Clin d’œil'], face: 'wink', req: 'reqTriple' },
  { id: 'cute-cool', set: 'cute', rarity: 'epic', n: ['Cool', 'Stylée'], face: 'cool', req: 'reqStreak7' },
  { id: 'cute-cat', set: 'cute', rarity: 'epic', n: ['Kitty', 'Chaton'], face: 'cat', req: 'reqChests25' },

  // ── Saison (season pass exclusives) ──────────────────────────────────────
  { id: 'season-comet', set: 'season', rarity: 'epic', n: ['Comet', 'Comète'], req: 'reqSeason',
    bg: L(`linear-gradient(135deg, transparent 35%, ${W(0.9)} 48%, transparent 52%)`, `radial-gradient(circle at 70% 30%, #fff 0 8%, transparent 14%)`, `radial-gradient(circle at 40% 70%, ${W(0.4)} 0 4%, transparent 6%)`),
    css: 'animation: sk-twinkle 1.4s ease-in-out infinite;' },
  { id: 'season-crown', set: 'season', rarity: 'legendary', n: ['Royal', 'Royale'], req: 'reqSeason',
    bg: L(`radial-gradient(circle, transparent 54%, #ffd34d 56% 62%, transparent 64%)`, `repeating-conic-gradient(#ffd34d 0 4deg, transparent 4deg 30deg)`),
    css: 'animation: sk-pulse 1.6s ease-in-out infinite;' },
  { id: 'season-rainbow', set: 'season', rarity: 'epic', n: ['Rainbow', 'Arc-en-ciel'], req: 'reqSeason',
    bg: [HL, `conic-gradient(from 90deg, #ff5d73, #ffc23d, #5ed36a, #1fd1b9, #4aa8ff, #9a7bff, #ff5d73)`].join(','),
    css: 'box-shadow: inset 0 0 0 3px var(--col), 0 5px 10px rgba(0,0,0,.35);' },
  { id: 'season-phoenix', set: 'season', rarity: 'legendary', n: ['Phoenix', 'Phénix'], req: 'reqSeason',
    bg: L(`radial-gradient(ellipse 30% 45% at 50% 60%, rgba(255,240,170,.95), rgba(255,140,60,.6) 50%, transparent 70%)`, `repeating-conic-gradient(from 200deg at 50% 70%, rgba(255,200,80,.5) 0 8deg, transparent 8deg 24deg)`),
    css: 'animation: sk-flame 1.1s ease-in-out infinite;' },
];
const BY_ID = new Map(SKINS.map((s) => [s.id, s]));
export const skinById = (id) => BY_ID.get(id);
// Spanish names (EN/FR live next to each skin above).
const NAMES_ES = {
  'classic': 'Clásica',
  'stripes': 'Rayas',
  'dots': 'Lunares',
  'glass': 'Cristal',
  'swirl': 'Remolino',
  'metal': 'Cromo',
  'galaxy': 'Galaxia',
  'neon': 'Neón',
  'gem': 'Diamante',
  'w0-sand': 'Arenosa',
  'w0-wave': 'Ola',
  'w0-shell': 'Concha',
  'w0-ball': 'Pelota de playa',
  'w0-legend': 'Perla de las mareas',
  'w1-strata': 'Arenisca',
  'w1-cactus': 'Cactus',
  'w1-sun': 'Sol radiante',
  'w1-scarab': 'Escarabajo',
  'w1-legend': 'Espejismo',
  'w2-ash': 'Ceniza',
  'w2-strata': 'Cañón',
  'w2-obsidian': 'Obsidiana',
  'w2-lava': 'Lava',
  'w2-legend': 'Corazón de brasa',
  'w3-scales': 'Escamas',
  'w3-bubbles': 'Burbujas',
  'w3-coral': 'Coral',
  'w3-jelly': 'Medusa',
  'w3-legend': 'Tesoro abisal',
  'w4-snow': 'Cima nevada',
  'w4-ridge': 'Crestas',
  'w4-amethyst': 'Amatista',
  'w4-aurora': 'Aurora',
  'w4-legend': 'Corona de las cumbres',
  'w5-frost': 'Escarcha',
  'w5-crack': 'Hielo agrietado',
  'w5-flake': 'Copo de nieve',
  'w5-glacier': 'Glaciar',
  'w5-legend': 'Estrella polar',
  'w6-grain': 'Madera',
  'w6-leaf': 'Hoja',
  'w6-shroom': 'Seta',
  'w6-firefly': 'Luciérnagas',
  'w6-legend': 'Espíritu del bosque',
  'w7-grid': 'Cuadrícula',
  'w7-pixel': 'Píxel',
  'w7-circuit': 'Circuito',
  'w7-pulse': 'Pulso',
  'w7-legend': 'Holograma',
  'w8-petal': 'Pétalos',
  'w8-hedge': 'Laberinto',
  'w8-arrow': 'Galón',
  'w8-tulip': 'Tulipán',
  'w8-legend': 'Rosa de los vientos',
  'w9-dusk': 'Crepúsculo',
  'w9-mesa': 'Meseta',
  'w9-sunset': 'Atardecer',
  'w9-rose': 'Rosa del desierto',
  'w9-legend': 'Hora dorada',
  'w10-rain': 'Lluvia',
  'w10-ripple': 'Ondas',
  'w10-cloud': 'Nube',
  'w10-bolt': 'Rayo',
  'w10-legend': 'Ojo del huracán',
  'w11-stardust': 'Polvo de estrellas',
  'w11-moon': 'Luna creciente',
  'w11-constellation': 'Constelación',
  'w11-nebula': 'Nebulosa',
  'w11-legend': 'Supernova',
  'w12-echo': 'Eco',
  'w12-pebble': 'Canto rodado',
  'w12-fern': 'Helecho',
  'w12-wind': 'Viento del valle',
  'w12-legend': 'Resonancia',
  'w13-sky': 'Cielo azul',
  'w13-feather': 'Pluma',
  'w13-balloon': 'Globo aerostático',
  'w13-isle': 'Isla flotante',
  'w13-legend': 'Hacia las nubes',
  'w14-rivet': 'Remaches',
  'w14-brass': 'Latón',
  'w14-gear': 'Rueda dentada',
  'w14-clock': 'Reloj de bolsillo',
  'w14-legend': 'Motor perpetuo',
  'w15-prism': 'Prisma',
  'w15-candy': 'Caramelo',
  'w15-lolly': 'Piruleta',
  'w15-opal': 'Ópalo',
  'w15-legend': 'Núcleo de la grieta',
  'cute-smile': 'Sonriente',
  'cute-wink': 'Guiño',
  'cute-cool': 'Molona',
  'cute-cat': 'Gatita',
  'season-comet': 'Cometa',
  'season-crown': 'Real',
  'season-rainbow': 'Arcoíris',
  'season-phoenix': 'Fénix',
};
export const skinName = (id) => {
  const s = BY_ID.get(id);
  if (!s) return id;
  if (LANG === 'es') return NAMES_ES[id] || s.n[0];
  return s.n[LANG === 'fr' ? 1 : 0];
};
export const setSkins = (setId) => SKINS.filter((s) => s.set === setId);

/** Milestones that unlock the cute series. */
export const CUTE_RULES = {
  'cute-smile': () => store.data.player.level >= 5,
  'cute-wink': () => (store.data.stats.maxCombo || 0) >= 3,
  'cute-cool': () => computeStats(dateKey()).best >= 7,
  'cute-cat': () => (store.data.stats.chestsOpened || 0) >= 25,
};

/* ---------- stylesheet generation ---------- */
const FACES = {
  smile: {
    before: `background: radial-gradient(circle at 36% 45%, #1d1b2e 0 7%, transparent 8%), radial-gradient(circle at 64% 45%, #1d1b2e 0 7%, transparent 8%), radial-gradient(circle at 25% 60%, rgba(255,120,150,.6) 0 8%, transparent 10%), radial-gradient(circle at 75% 60%, rgba(255,120,150,.6) 0 8%, transparent 10%);`,
    after: `inset: 52% 32% 22% 32%; border: 0 solid #1d1b2e; border-bottom-width: 3px; border-radius: 0 0 50% 50% / 0 0 100% 100%;`,
  },
  wink: {
    before: `background: radial-gradient(circle at 36% 45%, #1d1b2e 0 7%, transparent 8%), linear-gradient(#1d1b2e, #1d1b2e) 58% 46%/16% 6% no-repeat, radial-gradient(circle at 25% 60%, rgba(255,120,150,.6) 0 8%, transparent 10%);`,
    after: `inset: 54% 36% 24% 36%; border: 0 solid #1d1b2e; border-bottom-width: 3px; border-radius: 0 0 50% 50% / 0 0 100% 100%;`,
  },
  cool: {
    before: `inset: 32% 14% 46% 14%; border-radius: 6px 6px 40% 40%; background: linear-gradient(160deg, #3a3a4a, #0d0d14 60%); box-shadow: inset 0 2px 0 rgba(255,255,255,.35);`,
    after: `inset: 64% 36% 20% 36%; border: 0 solid #1d1b2e; border-bottom-width: 3px; border-radius: 0 0 50% 50% / 0 0 100% 100%;`,
  },
  cat: {
    before: `background: radial-gradient(ellipse 7% 10% at 36% 45%, #1d1b2e 70%, transparent 75%), radial-gradient(ellipse 7% 10% at 64% 45%, #1d1b2e 70%, transparent 75%), radial-gradient(circle at 50% 60%, #ff7b9c 0 5%, transparent 6%), linear-gradient(#1d1b2e,#1d1b2e) 6% 62%/22% 3% no-repeat, linear-gradient(#1d1b2e,#1d1b2e) 94% 62%/22% 3% no-repeat;`,
    after: `inset: 62% 42% 24% 42%; border: 0 solid #1d1b2e; border-bottom-width: 2.5px; border-radius: 0 0 50% 50% / 0 0 100% 100%;`,
  },
};

export function installSkinStyles() {
  if (typeof document === 'undefined' || document.getElementById('skin-styles')) return;
  let css = '';
  for (const s of SKINS) {
    const sel = `:where(.skin-${s.id}) .ball`;
    if (s.bg) css += `${sel}{background:${s.bg};${s.css || ''}}\n`;
    else if (s.css) css += `${sel}{${s.css}}\n`;
    if (s.before || s.after) {
      css += `${sel}{overflow:hidden}\n`;
      css += `${sel}::before,${sel}::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none}\n`;
      if (s.before) css += `${sel}::before{${s.before}}\n`;
      if (s.after) css += `${sel}::after{${s.after}}\n`;
    }
    if (s.face) {
      const f = FACES[s.face];
      css += `${sel}::before,${sel}::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none}\n`;
      css += `${sel}::before{${f.before}}\n${sel}::after{${f.after}}\n`;
    }
    if (s.rarity === 'legendary') css += `:where(.skin-${s.id}) .ball{box-shadow: 0 0 14px color-mix(in srgb, var(--col) 70%, #fff), 0 5px 10px rgba(0,0,0,.35);}\n`;
  }
  const el = document.createElement('style');
  el.id = 'skin-styles';
  el.textContent = css;
  document.head.appendChild(el);
}

/* ---------- ownership ---------- */
export const owned = () => store.data.skins.owned;
export const hasSkin = (id) => store.data.skins.owned.includes(id);
export const equipped = () => store.data.skins.equipped;
export const unseenCount = () => store.data.skins.owned.filter((id) => !store.data.skins.seen.includes(id)).length;
export const isSeen = (id) => store.data.skins.seen.includes(id);

export function markAllSeen() {
  store.data.skins.seen = [...store.data.skins.owned];
  save();
}

export function equip(id) {
  if (!hasSkin(id)) return false;
  store.data.skins.equipped = id;
  if (!isSeen(id)) store.data.skins.seen.push(id);
  save();
  return true;
}

/** Fired as `granted` ({ id }) and `setComplete` ({ set, legend }) on this target. */
export const skinEvents = typeof EventTarget !== 'undefined' ? new EventTarget() : null;
const emit = (type, detail) => skinEvents?.dispatchEvent(Object.assign(new Event(type), { detail }));

/** Give a skin; completing a world series also grants its legendary marble + coins. */
export function grantSkin(id) {
  if (hasSkin(id) || !BY_ID.has(id)) return false;
  store.data.skins.owned.push(id);
  save();
  emit('granted', { id });
  const s = BY_ID.get(id);
  if (s.set.startsWith('w') && s.rarity !== 'legendary') {
    const set = setSkins(s.set);
    const legend = set.find((x) => x.rarity === 'legendary');
    if (legend && !hasSkin(legend.id) && set.filter((x) => x !== legend).every((x) => hasSkin(x.id))) {
      store.data.skins.owned.push(legend.id);
      store.data.coins += LEGEND_BONUS;
      save();
      emit('setComplete', { set: s.set, legend: legend.id });
    }
  }
  return true;
}

/** Series the player can currently find: classics + every world reached so far. */
export function availableSets() {
  const w = worldOf(store.data.levels.unlocked);
  return ['classic', ...Array.from({ length: Math.min(w + 1, 16) }, (_, i) => `w${i}`)];
}

/**
 * Pick an unowned skin for a reward. Prefers the given world's series, then any series
 * the player has reached. Legendary and cute marbles are never dropped directly.
 */
export function pickSkin(rarities, world = null) {
  const droppable = (s) => !hasSkin(s.id) && s.rarity !== 'legendary' && s.set !== 'cute' && s.set !== 'season';
  const sets = availableSets();
  const tries = [];
  if (world != null && world >= 0 && world < 16) tries.push((s) => s.set === `w${world}` && rarities.includes(s.rarity));
  tries.push((s) => sets.includes(s.set) && rarities.includes(s.rarity));
  if (world != null && world >= 0 && world < 16) tries.push((s) => s.set === `w${world}`);
  tries.push((s) => sets.includes(s.set));
  for (const ok of tries) {
    const pool = SKINS.filter((s) => droppable(s) && ok(s));
    if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
  }
  return null;
}

/** Grant the cute marbles whose milestone has been reached. Returns the new ids. */
export function checkCuteUnlocks() {
  const got = [];
  for (const [id, rule] of Object.entries(CUTE_RULES)) if (!hasSkin(id) && rule() && grantSkin(id)) got.push(id);
  return got;
}

/** Markup for a preview marble with a given skin and colour index. */
export function marbleHTML(skin, color = 0, extra = '') {
  const r = BY_ID.get(skin)?.rarity;
  return `<span class="skin-${skin} marble-preview ${r === 'legendary' ? 'is-legend' : ''} ${extra}"><span class="ball c${color}"></span></span>`;
}
