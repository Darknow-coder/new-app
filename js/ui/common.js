import { openChest } from '../chests.js';
import { tierReward, track } from '../progress.js';
import { t } from '../i18n.js';
import { S, dailyChestTier, els, notify } from './core.js';
import { renderHome } from './home.js';

export async function openChestFlow(opts) {
  const reward = await openChest(opts);
  if (reward) handleProgress(track('chestOpened'));
  return reward;
}

export function handleProgress(res) {
  if (!res) return;
  for (const n of res.notes || []) {
    if (n.kind === 'quest') {
      notify('i-flag', t('questDone'), t(`quest_${n.id}`, { n: n.target }));
    } else if (n.kind === 'season') {
      // Only tiers that hold a chest or a marble are announced; the others just light
      // up the season card, so the banner keeps meaning something.
      let worth = false;
      for (let k = n.tier - (n.gained || 1) + 1; k <= n.tier; k++) if (['chest', 'skin'].includes(tierReward(k).kind)) worth = true;
      if (worth) notify('i-star', t('seasonTierUp', { n: n.tier }), t('seasonPass'), 'levelup');
    } else if (n.kind === 'achievement') {
      notify('i-star', t('achUnlocked'), t(`ach_${n.id}`));
    }
  }
  for (const lvl of res.ups || []) notify('i-gift', t('levelUpTitle'), t('levelUpSub', { n: lvl }), 'levelup');
  if (els.home.classList.contains('is-active')) renderHome();
}

export function openDailyChest(day = S.today) {
  return openChestFlow({ id: `d-${day}`, tier: dailyChestTier(day), title: t('dailyChest') }).then(() => {
    S.shownCoins = null;
    renderHome();
  });
}
