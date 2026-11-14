import { DAILY_ORDER, dailyLevel, dateKey, msUntilTomorrow, prefetchDaily, puzzleNumber } from '../daily.js';
import { LANG, t } from '../i18n.js';
import { computeStats, store } from '../storage.js';
import { buildScenery, iris } from '../fx.js';
import { LEVELS_PER_WORLD, WORLD_HUES, worldOf } from '../levels.js';
import { setMusicTheme } from '../audio.js';
import { ACHIEVEMENTS, achievementsReady, checkAchievements } from '../progress.js';
import { WORLD_CHESTS, chestId, chestSVG, isOpened } from '../chests.js';
import { worldEmblem } from '../map.js';
import { SKINS, checkCuteUnlocks, equipped, hasSkin, marbleHTML, skinName, unseenCount } from '../skins.js';
import { $, S, dailyChestReady, dailyChestTier, els, fmtCountdown, notify, readyChests, starsHTML, updateCoins, worldHue, worldName, worldStars } from './core.js';
import { startDaily, startLevel } from './game.js';
import { stageHTML } from './mapview.js';
import { sfx } from '../audio.js';
import { renderWheelTile } from './wheel.js';
import { renderPlayerStrip, renderQuests, renderSeasonCard } from './progressui.js';
import { giftToday } from './shop.js';
import { archiveTodo } from './archive.js';
import { renderRankCard, syncRank } from './leaderboard-ui.js';

export function renderHome() {
  S.today = dateKey();
  const n = puzzleNumber(S.today);
  const dateFmt = new Intl.DateTimeFormat(LANG, { weekday: 'long', month: 'long', day: 'numeric' });
  $('#home-date').textContent = dateFmt.format(new Date());
  $('#home-num').textContent = `#${n}`;

  const list = $('#daily-list');
  list.innerHTML = '';
  for (const diff of DAILY_ORDER) {
    const entry = store.dailyEntry(S.today, diff);
    const li = document.createElement('li');
    const done = entry?.done;
    const inProgress = entry && !done && entry.moves > 0;
    li.innerHTML = `
      <button class="daily-card ${done ? 'is-done' : ''}" data-diff="${diff}">
        <span class="dc-ball"></span>
        <span class="dc-text">
          <strong>${t(diff)}</strong>
          <small data-par>${done ? t('solvedIn', { m: entry.moves }) : '&nbsp;'}</small>
        </span>
        <span class="dc-side">
          ${done ? starsHTML(entry.stars) : `<span class="dc-play">${t(inProgress ? 'continue' : 'play')}</span>`}
        </span>
      </button>`;
    li.querySelector('button').addEventListener('click', () => iris(() => startDaily(diff)));
    list.appendChild(li);
  }
  // The three puzzles are built in a worker (and cached for the day): fill in their par when ready.
  const day = S.today;
  prefetchDaily(day).then(() => {
    if (day !== S.today) return;
    list.querySelectorAll('.daily-card').forEach((card) => {
      const diff = card.dataset.diff;
      const lvl = dailyLevel(S.today, diff);
      const small = card.querySelector('[data-par]');
      const entry = store.dailyEntry(S.today, diff);
      small.textContent = entry?.done
        ? `${t('solvedIn', { m: entry.moves })} · ${t('par', { n: lvl.par })}`
        : t('par', { n: lvl.par });
    });
  });

  const stats = computeStats(S.today);
  // Missed a day? A streak freeze saves the run (if the player has one).
  const usedFreeze = store.useStreakFreezes(S.today);
  if (usedFreeze) setTimeout(() => notify('i-freeze', t('freezeUsed'), t('freezeLeft', { n: store.booster('freeze') })), 900);
  const chip = $('#streak-chip');
  chip.classList.toggle('is-hot', stats.current > 0);
  $('#streak-text').textContent = stats.current > 0 ? t(stats.current === 1 ? 'streakOne' : 'streak', { n: stats.current }) : t('noStreak');
  const fz = store.booster('freeze');
  $('#streak-freeze').hidden = !fz || stats.current === 0;
  $('#streak-freeze').textContent = `❄️${fz}`;

  $('#share-row').hidden = !store.dayComplete(S.today);
  const lvl = store.data.levels.unlocked;
  renderStage(lvl);
  buildScenery($('#scenery-home'), 'home');
  setMusicTheme('home');
  renderPlayerStrip();
  renderQuests();
  renderSeasonCard();
  checkAchievements();
  const achReady = achievementsReady();
  const achDone = ACHIEVEMENTS.filter((a) => store.data.ach[a.id]).length;
  $('#ach-desc') && ($('#ach-desc').textContent = achReady ? t('achToClaim', { n: achReady }) : t('achDesc', { n: achDone, t: ACHIEVEMENTS.length }));
  $('#ach-badge').hidden = !achReady;
  $('#ach-badge').textContent = achReady;
  const inbox = store.data.inbox;
  $('#inbox-btn').hidden = !inbox.length;
  $('#inbox-btn').closest('.hud')?.classList.toggle('has-inbox', !!inbox.length);
  if (inbox.length) {
    $('#inbox-chest').innerHTML = chestSVG(inbox[0].tier);
    $('#inbox-count').textContent = inbox.length;
  }
  const dChip = $('#daily-chest-chip');
  dChip.hidden = !dailyChestReady();
  if (!dChip.hidden) $('#daily-chest-mini').innerHTML = chestSVG(dailyChestTier(S.today));
  const ready = readyChests().length;
  const advChests = $('#adv-chests');
  advChests.hidden = !ready;
  advChests.textContent = t('chestsReady', { n: ready });
  for (const id of checkCuteUnlocks()) setTimeout(() => notify('i-star', t('newMarble'), skinName(id)), 600);
  const unseen = unseenCount();
  $('#coll-badge').hidden = !unseen;
  $('#coll-badge').textContent = unseen;
  const ownedSkins = SKINS.filter((sk) => hasSkin(sk.id));
  $('#collection-desc') && ($('#collection-desc').textContent = t('collectionDesc', { n: ownedSkins.length, t: SKINS.length }));
  $('#collection-balls').innerHTML = ownedSkins
    .slice(-1)
    .map(() => marbleHTML(equipped(), 3))
    .join('');
  const giftChip = $('#gift-chip');
  giftChip.hidden = store.data.giftDay === S.today;
  const g = giftToday();
  $('#gift-text').textContent =
    g.reward === 'chest' ? t('giftDayChest', { d: g.day }) : t('giftDay', { d: g.day, n: g.reward });
  renderRankCard();
  syncRank();
  renderWheelTile();
  const todo = archiveTodo(S.today);
  $('#archive-count').hidden = !todo;
  $('#archive-count').textContent = todo;
  updateCoins();
  updateCountdown();
}

/** The adventure window at the top of the home screen. */
let stageW = 0;
function renderStage(lvl = store.data.levels.unlocked) {
  const w = worldOf(lvl);
  const stage = $('#btn-adventure');
  stage.style.setProperty('--hue', WORLD_HUES[w % WORLD_HUES.length]);
  $('#stage-emblem').innerHTML = worldEmblem(w);
  $('#stage-world-n').textContent = t('world', { n: w + 1 });
  $('#stage-world-name').textContent = worldName(w);
  const ws = worldStars(w);
  $('#stage-stars').textContent = `${ws}/${LEVELS_PER_WORLD * 3}`;
  $('#stage-play-text').textContent = t('level', { n: lvl });
  // Next goal: the next chest of this world still to earn.
  const next = WORLD_CHESTS.find((c) => !isOpened(chestId(w, c.k)) && ws < c.stars);
  $('#adventure-desc').innerHTML = next
    ? `<span class="goal-chest">${chestSVG(next.tier)}</span>${t('stageGoal', { c: t(`chest_${next.tier}`), s: ws, n: next.stars })}`
    : '';
  stageW = stage.clientWidth || Math.min(560, innerWidth) - 32;
  $('#stage-map').innerHTML = stageHTML(stageW, stage.clientHeight || 300);
}

$('#stage-play').addEventListener('click', (e) => {
  e.stopPropagation();
  sfx.tap();
  const n = store.data.levels.unlocked;
  iris(() => startLevel(n), worldHue(n));
});
$('#btn-adventure').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    e.currentTarget.click();
  }
});
new ResizeObserver(() => {
  const w = $('#btn-adventure').clientWidth;
  if (w && Math.abs(w - stageW) > 8 && els.home.classList.contains('is-active')) renderStage();
}).observe($('#btn-adventure'));

export function updateCountdown() {
  $('#countdown').textContent = t('nextIn', { t: fmtCountdown(msUntilTomorrow()) });
}

setInterval(() => {
  if (dateKey() !== S.today) {
    renderHome();
    return;
  }
  if (els.home.classList.contains('is-active')) updateCountdown();
  const dt = document.getElementById('deal-timer');
  if (dt && $('#modal-shop').open && store.data.dealDay !== S.today) dt.textContent = t('dealEnds', { t: fmtCountdown(msUntilTomorrow()) });
}, 1000);
