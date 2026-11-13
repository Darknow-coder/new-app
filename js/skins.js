// Marble collection: 97 skins in 19 series (one per world) that follow the player through the game.
//
// A skin only changes the *drawing* inside a marble: every design sits on the gameplay
// colour (var(--col) / var(--cold)), so puzzles stay readable whatever the skin.
// The drawings live in skin-art.js and become a stylesheet at start-up.
import { store, save, computeStats } from './storage.js';
import { LANG } from './i18n.js';
import { worldOf } from './levels.js';
import { dateKey } from './daily.js';
import { ANIM, BODY, RIM, artURI } from './skin-art.js';

/* ---------- series ---------- */
export const SETS = [
  { id: 'classic', world: -1 },
  ...Array.from({ length: 16 }, (_, w) => ({ id: `w${w}`, world: w })),
  { id: 'cute', world: -2 },
  { id: 'season', world: -3 },
];
export const LEGEND_BONUS = 300;

/**
 * Skins (names, series, rarity). Their look is drawn in skin-art.js.
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
  { id: 'w0-sand', set: 'w0', rarity: 'common', n: ['Sandy', 'Sablée'] },
  { id: 'w0-wave', set: 'w0', rarity: 'common', n: ['Wave', 'Vague'] },
  { id: 'w0-shell', set: 'w0', rarity: 'rare', n: ['Seashell', 'Coquillage'] },
  { id: 'w0-ball', set: 'w0', rarity: 'epic', n: ['Beach ball', 'Ballon de plage'] },
  { id: 'w0-legend', set: 'w0', rarity: 'legendary', n: ['Tide Pearl', 'Perle des marées'] },

  // ── Monde 2 · Dunes dorées ───────────────────────────────────────────────
  { id: 'w1-strata', set: 'w1', rarity: 'common', n: ['Sandstone', 'Grès'] },
  { id: 'w1-cactus', set: 'w1', rarity: 'common', n: ['Cactus', 'Cactus'] },
  { id: 'w1-sun', set: 'w1', rarity: 'rare', n: ['Sunburst', 'Soleil'] },
  { id: 'w1-scarab', set: 'w1', rarity: 'epic', n: ['Scarab', 'Scarabée'] },
  { id: 'w1-legend', set: 'w1', rarity: 'legendary', n: ['Mirage', 'Mirage'] },

  // ── Monde 3 · Canyon de braise ───────────────────────────────────────────
  { id: 'w2-ash', set: 'w2', rarity: 'common', n: ['Ash', 'Cendre'] },
  { id: 'w2-strata', set: 'w2', rarity: 'common', n: ['Canyon', 'Canyon'] },
  { id: 'w2-obsidian', set: 'w2', rarity: 'rare', n: ['Obsidian', 'Obsidienne'] },
  { id: 'w2-lava', set: 'w2', rarity: 'epic', n: ['Lava', 'Lave'] },
  { id: 'w2-legend', set: 'w2', rarity: 'legendary', n: ['Ember Heart', 'Cœur de braise'] },

  // ── Monde 4 · Récif de corail ────────────────────────────────────────────
  { id: 'w3-scales', set: 'w3', rarity: 'common', n: ['Scales', 'Écailles'] },
  { id: 'w3-bubbles', set: 'w3', rarity: 'common', n: ['Bubbles', 'Bulles'] },
  { id: 'w3-coral', set: 'w3', rarity: 'rare', n: ['Coral', 'Corail'] },
  { id: 'w3-jelly', set: 'w3', rarity: 'epic', n: ['Jellyfish', 'Méduse'] },
  { id: 'w3-legend', set: 'w3', rarity: 'legendary', n: ['Abyss Treasure', 'Trésor des abysses'] },

  // ── Monde 5 · Pics violets ───────────────────────────────────────────────
  { id: 'w4-snow', set: 'w4', rarity: 'common', n: ['Snowcap', 'Sommet enneigé'] },
  { id: 'w4-ridge', set: 'w4', rarity: 'common', n: ['Ridges', 'Crêtes'] },
  { id: 'w4-amethyst', set: 'w4', rarity: 'rare', n: ['Amethyst', 'Améthyste'] },
  { id: 'w4-aurora', set: 'w4', rarity: 'epic', n: ['Aurora', 'Aurore'] },
  { id: 'w4-legend', set: 'w4', rarity: 'legendary', n: ['Peak Crown', 'Couronne des cimes'] },

  // ── Monde 6 · Baie des glaciers ──────────────────────────────────────────
  { id: 'w5-frost', set: 'w5', rarity: 'common', n: ['Frost', 'Givre'] },
  { id: 'w5-crack', set: 'w5', rarity: 'common', n: ['Cracked ice', 'Glace fêlée'] },
  { id: 'w5-flake', set: 'w5', rarity: 'rare', n: ['Snowflake', 'Flocon'] },
  { id: 'w5-glacier', set: 'w5', rarity: 'epic', n: ['Glacier', 'Glacier'] },
  { id: 'w5-legend', set: 'w5', rarity: 'legendary', n: ['North Star', 'Étoile polaire'] },

  // ── Monde 7 · Bois moussu ────────────────────────────────────────────────
  { id: 'w6-grain', set: 'w6', rarity: 'common', n: ['Wood grain', 'Bois'] },
  { id: 'w6-leaf', set: 'w6', rarity: 'common', n: ['Leaf', 'Feuille'] },
  { id: 'w6-shroom', set: 'w6', rarity: 'rare', n: ['Toadstool', 'Champignon'] },
  { id: 'w6-firefly', set: 'w6', rarity: 'epic', n: ['Fireflies', 'Lucioles'] },
  { id: 'w6-legend', set: 'w6', rarity: 'legendary', n: ['Forest Spirit', 'Esprit de la forêt'] },

  // ── Monde 8 · Ville néon ─────────────────────────────────────────────────
  { id: 'w7-grid', set: 'w7', rarity: 'common', n: ['Grid', 'Grille'] },
  { id: 'w7-pixel', set: 'w7', rarity: 'common', n: ['Pixel', 'Pixel'] },
  { id: 'w7-circuit', set: 'w7', rarity: 'rare', n: ['Circuit', 'Circuit'] },
  { id: 'w7-pulse', set: 'w7', rarity: 'epic', n: ['Pulse', 'Pulsation'] },
  { id: 'w7-legend', set: 'w7', rarity: 'legendary', n: ['Hologram', 'Hologramme'] },

  // ── Monde 9 · Jardins fléchés ───────────────────────────────────────────
  { id: 'w8-petal', set: 'w8', rarity: 'common', n: ['Petals', 'Pétales'] },
  { id: 'w8-hedge', set: 'w8', rarity: 'common', n: ['Hedge maze', 'Labyrinthe'] },
  { id: 'w8-arrow', set: 'w8', rarity: 'rare', n: ['Chevron', 'Chevron'] },
  { id: 'w8-tulip', set: 'w8', rarity: 'epic', n: ['Tulip', 'Tulipe'] },
  { id: 'w8-legend', set: 'w8', rarity: 'legendary', n: ['Compass Rose', 'Rose des vents'] },

  // ── Monde 10 · Mesa du couchant ─────────────────────────────────────────
  { id: 'w9-dusk', set: 'w9', rarity: 'common', n: ['Dusk', 'Crépuscule'] },
  { id: 'w9-mesa', set: 'w9', rarity: 'common', n: ['Mesa', 'Mesa'] },
  { id: 'w9-sunset', set: 'w9', rarity: 'rare', n: ['Sunset', 'Couchant'] },
  { id: 'w9-rose', set: 'w9', rarity: 'epic', n: ['Desert Rose', 'Rose des sables'] },
  { id: 'w9-legend', set: 'w9', rarity: 'legendary', n: ['Golden Hour', 'Heure dorée'] },

  // ── Monde 11 · Lagune d'orage ───────────────────────────────────────────
  { id: 'w10-rain', set: 'w10', rarity: 'common', n: ['Rain', 'Pluie'] },
  { id: 'w10-ripple', set: 'w10', rarity: 'common', n: ['Ripples', 'Ronds dans l’eau'] },
  { id: 'w10-cloud', set: 'w10', rarity: 'rare', n: ['Raincloud', 'Nuage'] },
  { id: 'w10-bolt', set: 'w10', rarity: 'epic', n: ['Lightning', 'Éclair'] },
  { id: 'w10-legend', set: 'w10', rarity: 'legendary', n: ['Eye of the Storm', 'Œil du cyclone'] },

  // ── Monde 12 · Sommet étoilé ────────────────────────────────────────────
  { id: 'w11-stardust', set: 'w11', rarity: 'common', n: ['Stardust', 'Poussière d’étoiles'] },
  { id: 'w11-moon', set: 'w11', rarity: 'common', n: ['Crescent', 'Croissant de lune'] },
  { id: 'w11-constellation', set: 'w11', rarity: 'rare', n: ['Constellation', 'Constellation'] },
  { id: 'w11-nebula', set: 'w11', rarity: 'epic', n: ['Nebula', 'Nébuleuse'] },
  { id: 'w11-legend', set: 'w11', rarity: 'legendary', n: ['Supernova', 'Supernova'] },

  // ── Monde 13 · Vallée des échos ─────────────────────────────────────────
  { id: 'w12-echo', set: 'w12', rarity: 'common', n: ['Echo', 'Écho'] },
  { id: 'w12-pebble', set: 'w12', rarity: 'common', n: ['River stone', 'Galet'] },
  { id: 'w12-fern', set: 'w12', rarity: 'rare', n: ['Fern', 'Fougère'] },
  { id: 'w12-wind', set: 'w12', rarity: 'epic', n: ['Valley wind', 'Vent de vallée'] },
  { id: 'w12-legend', set: 'w12', rarity: 'legendary', n: ['Resonance', 'Résonance'] },

  // ── Monde 14 · Îles flottantes ──────────────────────────────────────────
  { id: 'w13-sky', set: 'w13', rarity: 'common', n: ['Blue sky', 'Ciel bleu'] },
  { id: 'w13-feather', set: 'w13', rarity: 'common', n: ['Feather', 'Plume'] },
  { id: 'w13-balloon', set: 'w13', rarity: 'rare', n: ['Hot-air balloon', 'Montgolfière'] },
  { id: 'w13-isle', set: 'w13', rarity: 'epic', n: ['Floating isle', 'Île volante'] },
  { id: 'w13-legend', set: 'w13', rarity: 'legendary', n: ['Skyward', 'Vers les nuages'] },

  // ── Monde 15 · Cavernes mécaniques ──────────────────────────────────────
  { id: 'w14-rivet', set: 'w14', rarity: 'common', n: ['Rivets', 'Rivets'] },
  { id: 'w14-brass', set: 'w14', rarity: 'common', n: ['Brass', 'Laiton'] },
  { id: 'w14-gear', set: 'w14', rarity: 'rare', n: ['Cog', 'Rouage'] },
  { id: 'w14-clock', set: 'w14', rarity: 'epic', n: ['Pocket watch', 'Montre à gousset'] },
  { id: 'w14-legend', set: 'w14', rarity: 'legendary', n: ['Perpetual Engine', 'Moteur perpétuel'] },

  // ── Monde 16 · Faille arc-en-ciel ───────────────────────────────────────
  { id: 'w15-prism', set: 'w15', rarity: 'common', n: ['Prism', 'Prisme'] },
  { id: 'w15-candy', set: 'w15', rarity: 'common', n: ['Candy', 'Bonbon'] },
  { id: 'w15-lolly', set: 'w15', rarity: 'rare', n: ['Lollipop', 'Sucette'] },
  { id: 'w15-opal', set: 'w15', rarity: 'epic', n: ['Opal', 'Opale'] },
  { id: 'w15-legend', set: 'w15', rarity: 'legendary', n: ['Rift Core', 'Cœur de la faille'] },

  // ── Mignonnes (milestones) ───────────────────────────────────────────────
  { id: 'cute-smile', set: 'cute', rarity: 'rare', n: ['Smiley', 'Souriante'], req: 'reqPlayer5' },
  { id: 'cute-wink', set: 'cute', rarity: 'rare', n: ['Winky', 'Clin d’œil'], req: 'reqTriple' },
  { id: 'cute-cool', set: 'cute', rarity: 'epic', n: ['Cool', 'Stylée'], req: 'reqStreak7' },
  { id: 'cute-cat', set: 'cute', rarity: 'epic', n: ['Kitty', 'Chaton'], req: 'reqChests25' },

  // ── Saison (season pass exclusives) ──────────────────────────────────────
  { id: 'season-comet', set: 'season', rarity: 'epic', n: ['Comet', 'Comète'], req: 'reqSeason' },
  { id: 'season-crown', set: 'season', rarity: 'legendary', n: ['Royal', 'Royale'], req: 'reqSeason' },
  { id: 'season-rainbow', set: 'season', rarity: 'epic', n: ['Rainbow', 'Arc-en-ciel'], req: 'reqSeason' },
  { id: 'season-phoenix', set: 'season', rarity: 'legendary', n: ['Phoenix', 'Phénix'], req: 'reqSeason' },
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
export function installSkinStyles() {
  if (typeof document === 'undefined' || document.getElementById('skin-styles')) return;
  // Each skin = an illustration (--art) drawn inside the glass, an optional special body,
  // and an optional animation of the illustration. The glass gloss comes from .ball::after.
  let css = '';
  for (const s of SKINS) {
    const sel = `:where(.skin-${s.id}) .ball`;
    const art = artURI(s.id);
    if (art) css += `${sel}{--art:${art}}\n`;
    if (BODY[s.id]) css += `${sel}{background:${BODY[s.id]}}\n`;
    const glow = s.rarity === 'legendary' ? ', 0 0 14px color-mix(in srgb, var(--col) 70%, #fff)' : '';
    if (RIM.has(s.id)) css += `${sel}{box-shadow: inset 0 0 0 2.5px var(--col), 0 0 10px color-mix(in srgb, var(--col) 55%, transparent), 0 5px 10px rgba(0,0,0,.35)${glow}}\n`;
    else if (glow) css += `${sel}{box-shadow: 0 5px 10px rgba(0,0,0,.35)${glow}}\n`;
    if (ANIM[s.id]) css += `${sel}::before{animation:${ANIM[s.id]}}\n`;
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
