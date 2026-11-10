import { store } from '../storage.js';
import { t } from '../i18n.js';
import { ACHIEVEMENTS, QUEST_TYPES, SEASON_TIERS, TIER_SP, checkAchievements, claimAchievement, claimQuest, claimTier, quests, season, seasonReady, takeFromInbox, tierReward, xpNeeded } from '../progress.js';
import { chestSVG } from '../chests.js';
import { sfx } from '../audio.js';
import { burst, floatText, flyIcons } from '../fx.js';
import { grantSkin, hasSkin, marbleHTML, setSkins, skinName } from '../skins.js';
import { $, S, buzz, closeModal, notify, openModal, toast, updateCoins } from './core.js';
import { handleProgress, openChestFlow } from './common.js';
import { renderHome } from './home.js';

export function renderPlayerStrip() {
  const pl = store.data.player;
  $('#player-level').textContent = pl.level;
  $('#player-title').textContent = t('playerLevel', { n: pl.level });
  $('#player-xp').textContent = `${pl.xp}/${xpNeeded(pl.level)} XP`;
  const pct = (pl.xp / xpNeeded(pl.level)) * 100;
  $('#xp-fill').style.width = `${pct}%`;
  $('#player-badge .player-badge').style.setProperty('--p', `${pct}%`);
}

export function renderQuests() {
  const q = quests(S.today);
  $('#quest-list').innerHTML = q.list
    .map((it, i) => {
      const def = QUEST_TYPES[it.id];
      const done = it.progress >= it.target;
      const action = it.claimed
        ? `<span class="q-claimed">✓</span>`
        : done
          ? `<button class="q-claim" data-q="${i}"><svg><use href="#i-coin"/></svg>${def.coins}</button>`
          : `<span class="q-reward"><svg><use href="#i-coin"/></svg>${def.coins}</span>`;
      return `<li class="quest ${done ? 'is-done' : ''} ${it.claimed ? 'is-claimed' : ''}">
        <span class="q-icon"><svg><use href="#${def.icon}"/></svg></span>
        <span class="q-body"><span class="q-text">${t(`quest_${it.id}`, { n: it.target })}</span>
          <span class="q-bar"><i style="width:${(it.progress / it.target) * 100}%"></i><b>${it.progress}/${it.target}</b></span></span>
        ${action}</li>`;
    })
    .join('');
  const claimedCount = q.list.filter((x) => x.claimed).length;
  $('#quests-bonus').innerHTML = q.bonus
    ? t('questsBonusDone')
    : `<span class="mini-chest">${chestSVG('silver')}</span>${claimedCount}/3`;
  $('#quests-bonus').title = t('questsBonus');
}

$('#quest-list').addEventListener('click', (e) => {
  const btn = e.target.closest('.q-claim');
  if (!btn) return;
  const res = claimQuest(Number(btn.dataset.q));
  if (!res) return;
  sfx.coin();
  buzz([15, 25]);
  flyIcons(btn, $('#view-home .coin-pill'), {
    count: 7,
    onArrive: (i) => {
      sfx.tick();
      if (i === 0) updateCoins(true);
    },
  });
  floatText(btn, `+${res.coins}`);
  if (res.bonus) setTimeout(() => notify('i-gift', t('questsBonusDone'), t('questChest')), 600);
  handleProgress({ ups: res.ups, notes: checkAchievements() });
  setTimeout(renderHome, 700);
});

export function renderAchievements() {
  const rank = (a) => {
    const st = store.data.ach[a.id];
    if (st === 'ready') return -1;
    if (st === 'claimed') return 2;
    return 1 - Math.min(a.value(), a.target) / a.target;
  };
  $('#ach-list').innerHTML = [...ACHIEVEMENTS].sort((x, y) => rank(x) - rank(y)).map((a) => {
    const state = store.data.ach[a.id];
    const v = Math.min(a.value(), a.target);
    const action =
      state === 'ready'
        ? `<button class="q-claim" data-ach="${a.id}"><svg><use href="#i-coin"/></svg>${a.coins}</button>`
        : state === 'claimed'
          ? '<span class="q-claimed">✓</span>'
          : `<span class="q-reward"><svg><use href="#i-coin"/></svg>${a.coins}</span>`;
    return `<li class="ach ${state ? `is-${state}` : ''}">
      <span class="ach-medal"><svg><use href="#i-star"/></svg></span>
      <span class="q-body"><strong>${t(`ach_${a.id}`)}</strong><small>${t(`achd_${a.id}`)}</small>
        <span class="q-bar"><i style="width:${(v / a.target) * 100}%"></i><b>${v}/${a.target}</b></span></span>
      ${action}</li>`;
  }).join('');
}

$('#ach-list').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-ach]');
  if (!btn) return;
  const res = claimAchievement(btn.dataset.ach);
  if (!res) return;
  sfx.coin();
  buzz([15, 25]);
  const dlg = $('#modal-achievements');
  floatText(btn, `+${res.coins}`, dlg);
  burst(btn, 50, 50, { count: 12, colors: ['var(--accent)', '#fff'], dist: 40 });
  updateCoins(true);
  renderAchievements();
  handleProgress({ ups: res.ups, notes: [] });
});

export const openAchievements = () => {
  sfx.tap();
  checkAchievements();
  renderAchievements();
  openModal('modal-achievements');
};

$('#btn-achievements').addEventListener('click', openAchievements);

$('#player-badge').addEventListener('click', openAchievements);

$('#inbox-btn').addEventListener('click', () => {
  const item = store.data.inbox[0];
  if (!item) return;
  const title = item.reason === 'levelUp' ? t('lvlChest', { n: item.n }) : item.reason === 'quests' ? t('questChest') : undefined;
  openChestFlow({ id: item.id, tier: item.tier, title }).then(() => {
    takeFromInbox(item.id);
    S.shownCoins = null;
    renderHome();
  });
});

export function renderSeasonCard() {
  const s = season(S.today);
  $('#season-tier').textContent = s.tier;
  $('#season-title').textContent = t('seasonTitle', { n: s.id });
  $('#season-sub').textContent = t('seasonSub', { t: s.tier, max: SEASON_TIERS, d: s.daysLeft });
  $('#season-bar').style.width = `${s.tier >= SEASON_TIERS ? 100 : (s.inTier / TIER_SP) * 100}%`;
  const ready = seasonReady();
  $('#season-ready').hidden = !ready;
  $('#season-ready').textContent = ready;
}

export function seasonSkinFor(k) {
  // Tier 15 gives the next epic season marble, tier 30 the next legendary one.
  const want = k === 30 ? 'legendary' : 'epic';
  return setSkins('season').find((x) => x.rarity === want && !hasSkin(x.id)) || null;
}

export function tierIcon(r, k) {
  if (r.kind === 'coins') return `<span class="sp-ico"><svg><use href="#i-coin"/></svg></span><b>${r.n}</b>`;
  if (r.kind === 'hint' || r.kind === 'rewind') return `<span class="sp-ico ${r.kind}"><svg><use href="#i-${r.kind}"/></svg></span><b>×${r.n}</b>`;
  if (r.kind === 'chest') return `<span class="sp-chest">${chestSVG(r.tier)}</span><b>${t(`chest_${r.tier}`)}</b>`;
  const sk = seasonSkinFor(k);
  return `<span class="sp-skin">${marbleHTML(sk ? sk.id : 'season-crown', k === 30 ? 2 : 3)}</span><b>${sk ? skinName(sk.id) : '+300'}</b>`;
}

export function renderSeason() {
  const s = season(S.today);
  $('#sp-title').textContent = t('seasonTitle', { n: s.id });
  $('#sp-end').textContent = t('seasonEnd', { d: s.daysLeft });
  $('#sp-tier').textContent = s.tier;
  $('#sp-bar').style.width = `${s.tier >= SEASON_TIERS ? 100 : (s.inTier / TIER_SP) * 100}%`;
  $('#sp-pts').textContent = s.tier >= SEASON_TIERS ? '★' : `${s.inTier}/${TIER_SP}`;
  let html = '';
  for (let k = 1; k <= SEASON_TIERS; k++) {
    const r = tierReward(k);
    const state = s.claimed.includes(k) ? 'claimed' : k <= s.tier ? 'ready' : k === s.tier + 1 ? 'next' : 'locked';
    const big = r.kind === 'skin' || (r.kind === 'chest' && r.tier === 'gold');
    html += `<li class="sp-tier is-${state} ${big ? 'is-big' : ''}" data-k="${k}" style="--i:${k}">
      <span class="sp-num">${k}</span>
      <span class="sp-reward">${tierIcon(r, k)}</span>
      ${state === 'ready' ? `<button class="q-claim sp-claim" data-k="${k}">${t('seasonClaimAll')}</button>` : state === 'claimed' ? '<span class="q-claimed">✓</span>' : '<span class="sp-lock"><svg><use href="#i-lock"/></svg></span>'}
    </li>`;
  }
  $('#sp-track').innerHTML = html;
}

export function openSeason() {
  sfx.tap();
  renderSeason();
  openModal('modal-season');
  requestAnimationFrame(() => {
    const s = season(S.today);
    const target = $(`#sp-track .sp-tier[data-k="${Math.max(1, Math.min(SEASON_TIERS, s.tier))}"]`);
    target?.scrollIntoView({ block: 'center' });
  });
}

$('#btn-season').addEventListener('click', openSeason);

$('#sp-track').addEventListener('click', (e) => {
  const btn = e.target.closest('.sp-claim');
  if (!btn) return;
  const k = Number(btn.dataset.k);
  const r = claimTier(k);
  if (!r) return;
  const row = btn.closest('.sp-tier');
  const dlg = $('#modal-season');
  if (r.kind === 'chest') {
    closeModal('modal-season');
    setTimeout(() => openChestFlow({ tier: r.tier, title: t('seasonTitle', { n: season(S.today).id }) }).then(() => {
      S.shownCoins = null;
      renderHome();
      openSeason();
    }), 260);
    return;
  }
  if (r.kind === 'skin') {
    const sk = seasonSkinFor(k);
    if (sk) {
      grantSkin(sk.id);
      notify('i-star', t('newMarble'), skinName(sk.id), 'levelup');
      sfx.epic();
    } else {
      store.addCoins(300);
      toast(t('seasonSkinDone'));
    }
  } else sfx.coin();
  buzz([15, 25]);
  burst(row, 50, 50, { count: 14, colors: ['var(--accent)', '#fff'], dist: 60 });
  floatText(btn, r.kind === 'coins' ? `+${r.n}` : '✓', dlg);
  updateCoins(true);
  setTimeout(() => {
    renderSeason();
    renderHome();
  }, 450);
});
