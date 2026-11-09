// Meta-progression: player XP & level, daily quests, achievements and the chest inbox.
// Everything is driven by `track(event, data)` calls from the game; this module never touches the DOM.
// It returns notifications ({ kind, ... }) that the UI decides how to show.
import { store, save, computeStats } from './storage.js';
import { hashString } from './engine.js';
import { dateKey } from './daily.js';

/* ---------- player level ---------- */
export const xpNeeded = (lvl) => 80 + 30 * (lvl - 1);

function p() {
  return store.data.player;
}

/** Add XP; returns the list of levels reached. Each level-up drops a chest in the inbox. */
function addXP(n) {
  const pl = p();
  pl.xp += n;
  const ups = [];
  while (pl.xp >= xpNeeded(pl.level)) {
    pl.xp -= xpNeeded(pl.level);
    pl.level++;
    ups.push(pl.level);
    const tier = pl.level % 10 === 0 ? 'gold' : pl.level % 5 === 0 ? 'silver' : 'wood';
    addToInbox({ id: `lvl-${pl.level}`, tier, reason: 'levelUp', n: pl.level });
  }
  return ups;
}

export function addToInbox(item) {
  if (store.data.chests.opened[item.id] || store.data.inbox.some((i) => i.id === item.id)) return;
  store.data.inbox.push(item);
}

export function takeFromInbox(id) {
  store.data.inbox = store.data.inbox.filter((i) => i.id !== id);
  save();
}

/* ---------- daily quests ---------- */
export const QUEST_TYPES = {
  wins: { targets: [3, 5], coins: 40, icon: 'i-flag' },
  perfect: { targets: [2, 3], coins: 50, icon: 'i-star' },
  dailies: { targets: [2, 3], coins: 40, icon: 'i-flame' },
  combo: { targets: [1, 1], coins: 60, icon: 'i-coin' },
  noBoost: { targets: [3, 4], coins: 45, icon: 'i-hint' },
  stars: { targets: [6, 10], coins: 50, icon: 'i-star' },
  chest: { targets: [1, 1], coins: 30, icon: 'i-gift' },
};
const QUEST_IDS = Object.keys(QUEST_TYPES);

/** Today's three quests (deterministic per day, so everybody gets the same set). */
export function quests(day = dateKey()) {
  const q = store.data.quests;
  if (q.day !== day) {
    let seed = hashString(`quests:${day}`);
    const pool = QUEST_IDS.slice();
    const list = [];
    while (list.length < 3) {
      const id = pool.splice(seed % pool.length, 1)[0];
      seed = hashString(String(seed));
      const tgt = QUEST_TYPES[id].targets[seed % 2];
      list.push({ id, target: tgt, progress: 0, claimed: false });
    }
    store.data.quests = { day, list, bonus: false };
    save();
  }
  return store.data.quests;
}

function bumpQuest(id, by = 1) {
  const out = [];
  for (const q of quests().list) {
    if (q.id !== id || q.progress >= q.target) continue;
    q.progress = Math.min(q.target, q.progress + by);
    if (q.progress >= q.target) out.push({ kind: 'quest', id: q.id, target: q.target });
  }
  return out;
}

export function claimQuest(i, day = dateKey()) {
  const q = quests(day).list[i];
  if (!q || q.claimed || q.progress < q.target) return null;
  q.claimed = true;
  const coins = QUEST_TYPES[q.id].coins;
  store.data.coins += coins;
  const result = { coins, xp: 25, ups: addXP(25), bonus: false };
  const all = quests(day);
  if (!all.bonus && all.list.every((x) => x.claimed)) {
    all.bonus = true;
    addToInbox({ id: `quests-${all.day}`, tier: 'silver', reason: 'quests' });
    result.bonus = true;
  }
  save();
  return result;
}

/* ---------- achievements ---------- */
const st = () => store.data.stats;
export const ACHIEVEMENTS = [
  { id: 'firstWin', coins: 20, target: 1, value: () => st().levelsWon },
  { id: 'win25', coins: 60, target: 25, value: () => st().levelsWon },
  { id: 'win100', coins: 150, target: 100, value: () => st().levelsWon },
  { id: 'win240', coins: 400, target: 240, value: () => st().levelsWon },
  { id: 'perfect10', coins: 60, target: 10, value: () => st().perfects },
  { id: 'perfect50', coins: 150, target: 50, value: () => st().perfects },
  { id: 'world2', coins: 50, target: 21, value: () => store.data.levels.unlocked },
  { id: 'world4', coins: 100, target: 61, value: () => store.data.levels.unlocked },
  { id: 'world8', coins: 250, target: 141, value: () => store.data.levels.unlocked },
  { id: 'combo', coins: 40, target: 1, value: () => st().combos },
  { id: 'triple', coins: 120, target: 3, value: () => st().maxCombo },
  { id: 'chests5', coins: 50, target: 5, value: () => st().chestsOpened },
  { id: 'chests25', coins: 150, target: 25, value: () => st().chestsOpened },
  { id: 'skins5', coins: 100, target: 5, value: () => store.data.skins.owned.length },
  { id: 'skins9', coins: 300, target: 25, value: () => store.data.skins.owned.length },
  { id: 'setDone', coins: 200, target: 1, value: () => store.data.skins.owned.filter((id) => id.endsWith('-legend')).length },
  { id: 'streak3', coins: 60, target: 3, value: () => computeStats(dateKey()).best },
  { id: 'streak7', coins: 200, target: 7, value: () => computeStats(dateKey()).best },
  { id: 'daily10', coins: 80, target: 10, value: () => st().dailySolved },
  { id: 'pure20', coins: 100, target: 20, value: () => st().boosterFree },
  { id: 'player10', coins: 150, target: 10, value: () => p().level },
];

/** Mark newly reached achievements as ready to claim; returns notifications. */
export function checkAchievements() {
  const out = [];
  for (const a of ACHIEVEMENTS) {
    if (store.data.ach[a.id]) continue;
    if (a.value() >= a.target) {
      store.data.ach[a.id] = 'ready';
      out.push({ kind: 'achievement', id: a.id });
    }
  }
  return out;
}

export function claimAchievement(id) {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a || store.data.ach[id] !== 'ready') return null;
  store.data.ach[id] = 'claimed';
  store.data.coins += a.coins;
  const ups = addXP(30);
  save();
  return { coins: a.coins, ups };
}

export const achievementsReady = () => ACHIEVEMENTS.filter((a) => store.data.ach[a.id] === 'ready').length;
export const questsReady = () => quests().list.filter((q) => !q.claimed && q.progress >= q.target).length;

/* ---------- event entry point ---------- */
/**
 * Record a game event. Returns { xp, ups, notes } — XP gained, player levels reached,
 * and notifications (quests completed, achievements unlocked).
 */
export function track(event, d = {}) {
  const s = st();
  let xp = 0;
  const notes = [];
  if (event === 'levelWin') {
    s.levelsWon += d.first ? 1 : 0;
    if (d.stars === 3) s.perfects++;
    if (!d.usedBooster) s.boosterFree++;
    xp = d.first ? 15 + 5 * d.stars : 5 + 5 * d.newStars;
    notes.push(...bumpQuest('wins'));
    if (d.stars === 3) notes.push(...bumpQuest('perfect'));
    if (!d.usedBooster) notes.push(...bumpQuest('noBoost'));
    if (d.newStars) notes.push(...bumpQuest('stars', d.newStars));
  } else if (event === 'dailyWin') {
    s.dailySolved++;
    if (d.stars === 3) s.perfects++;
    xp = 20 + 10 * d.stars;
    notes.push(...bumpQuest('dailies'));
    if (d.stars === 3) notes.push(...bumpQuest('perfect'));
    notes.push(...bumpQuest('stars', d.stars));
  } else if (event === 'combo') {
    s.combos++;
    s.maxCombo = Math.max(s.maxCombo, d.count);
    notes.push(...bumpQuest('combo'));
  } else if (event === 'chestOpened') {
    s.chestsOpened++;
    xp = 10;
    notes.push(...bumpQuest('chest'));
  }
  const ups = xp ? addXP(xp) : [];
  notes.push(...checkAchievements());
  save();
  return { xp, ups, notes };
}
