import { DAILY_ORDER, dailyLevel, dateKey, msUntilTomorrow, puzzleNumber } from '../daily.js';
import { LANG, t } from '../i18n.js';
import { computeStats, store } from '../storage.js';
import { buildScenery, iris } from '../fx.js';
import { LEVELS_PER_WORLD, WORLD_HUES, worldOf } from '../levels.js';
import { setMusicTheme } from '../audio.js';
import { ACHIEVEMENTS, achievementsReady, checkAchievements } from '../progress.js';
import { chestSVG } from '../chests.js';
import { SKINS, checkCuteUnlocks, equipped, hasSkin, marbleHTML, skinName, unseenCount } from '../skins.js';
import { $, S, dailyChestReady, dailyChestTier, els, fmtCountdown, notify, readyChests, starsHTML, updateCoins } from './core.js';
import { startDaily } from './game.js';
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
  // Generating the three levels takes a few dozen ms: do it after first paint.
  setTimeout(() => {
    list.querySelectorAll('.daily-card').forEach((card) => {
      const diff = card.dataset.diff;
      const lvl = dailyLevel(S.today, diff);
      const small = card.querySelector('[data-par]');
      const entry = store.dailyEntry(S.today, diff);
      small.textContent = entry?.done
        ? `${t('solvedIn', { m: entry.moves })} · ${t('par', { n: lvl.par })}`
        : t('par', { n: lvl.par });
    });
  }, 30);

  const stats = computeStats(S.today);
  const chip = $('#streak-chip');
  chip.classList.toggle('is-hot', stats.current > 0);
  $('#streak-text').textContent = stats.current > 0 ? t(stats.current === 1 ? 'streakOne' : 'streak', { n: stats.current }) : t('noStreak');

  $('#share-row').hidden = !store.dayComplete(S.today);
  const lvl = store.data.levels.unlocked;
  $('#adventure-desc').textContent = `${t('world', { n: worldOf(lvl) + 1 })} · ${t('adventureDesc', { n: lvl, s: stats.levelStars })}`;
  $('#adventure-bar').style.width = `${(((lvl - 1) % LEVELS_PER_WORLD) / LEVELS_PER_WORLD) * 100}%`;
  $('#btn-adventure').style.setProperty('--hue', WORLD_HUES[worldOf(lvl) % WORLD_HUES.length]);
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
  const todo = archiveTodo(S.today);
  $('#archive-count').hidden = !todo;
  $('#archive-count').textContent = todo;
  updateCoins();
  updateCountdown();
}

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
