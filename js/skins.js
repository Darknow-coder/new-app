// Collectible marble skins. A skin only changes the *pattern*: every marble keeps its
// gameplay colour (var(--col)), so the puzzle stays readable whatever the skin.
import { store, save } from './storage.js';

export const SKINS = [
  { id: 'classic', rarity: 'common' },
  { id: 'stripes', rarity: 'common' },
  { id: 'dots', rarity: 'common' },
  { id: 'glass', rarity: 'rare' },
  { id: 'swirl', rarity: 'rare' },
  { id: 'metal', rarity: 'rare' },
  { id: 'galaxy', rarity: 'epic' },
  { id: 'neon', rarity: 'epic' },
  { id: 'gem', rarity: 'epic' },
];

export const owned = () => store.data.skins.owned;
export const hasSkin = (id) => store.data.skins.owned.includes(id);
export const equipped = () => store.data.skins.equipped;

export function equip(id) {
  if (!hasSkin(id)) return false;
  store.data.skins.equipped = id;
  save();
  return true;
}

export function grantSkin(id) {
  if (hasSkin(id)) return false;
  store.data.skins.owned.push(id);
  save();
  return true;
}

/** Pick an unowned skin among the allowed rarities, or null if all are owned. */
export function pickSkin(rarities) {
  const pool = SKINS.filter((s) => rarities.includes(s.rarity) && !hasSkin(s.id));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Markup for a preview marble with a given skin and colour index. */
export function marbleHTML(skin, color = 0, extra = '') {
  return `<span class="skin-${skin} marble-preview ${extra}"><span class="ball c${color}"></span></span>`;
}
