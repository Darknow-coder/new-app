import { openChest } from '../chests.js';
import { track } from '../progress.js';
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
      notify('i-star', t('seasonTierUp', { n: n.tier }), t('seasonPass'), 'levelup');
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
