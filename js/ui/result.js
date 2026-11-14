import { starsFor } from '../engine.js';
import { burst, countTo, flyIcons, iris, reducedMotion, replay } from '../fx.js';
import { save, store } from '../storage.js';
import { ARCHIVE_DAY_BONUS, adventureLevel, archiveReward, dailyReward, isBoss, levelReward, perfectRunBonus, worldOf } from '../levels.js';
import { track, xpNeeded } from '../progress.js';
import { grantSkin, marbleHTML, pickSkin, skinName } from '../skins.js';
import { sfx } from '../audio.js';
import { TUTORIAL } from '../tutorial.js';
import { t } from '../i18n.js';
import { DAILY_ORDER } from '../daily.js';
import { burstConfetti } from '../confetti.js';
import { $, S, buzz, closeModal, dailyChestReady, els, openModal, showView, toast, updateCoins, worldHue, worldName, worldStars } from './core.js';
import { WORLD_CHESTS, chestId, chestSVG, isOpened } from '../chests.js';
import { shareChallenge, startChallenge, startDaily, startLevel, startTutorial, updateHud } from './game.js';
import { shareDay } from './settings.js';
import { handleProgress, openDailyChest } from './common.js';
import { openMap } from './mapview.js';
import { renderHome } from './home.js';
import { rewardedLeft, showRewarded } from '../monetization.js';
import { count } from '../metrics.js';
import { syncRank } from './leaderboard-ui.js';
import { eventWin, openEvent, openEventChest, startEventStage } from './eventui.js';
import { themeOf } from '../event.js';

export function onSolved() {
  S.game.done = true;
  updateHud(false);
  const stars = starsFor(S.game.moves, S.game.level.par);
  S.game.stars = stars;
  S.game.reward = 0;
  S.game.bonus = 0;
  els.board.classList.remove('intro');
  els.board.querySelectorAll('.hole.filled').forEach((h, i) => h.style.setProperty('--glow-delay', `${120 + i * 120}ms`));
  replay(els.board, 'won');
  if (stars === 3) replay(els.board, 'par-flash');
  S.game.xpBefore = { ...store.data.player };
  buzz([20, 40, 20, 40, 60]);

  if (S.game.mode === 'daily' && S.game.archive && !S.game.review) {
    store.setArchiveEntry(S.game.day, S.game.diff, { done: true, moves: S.game.moves, stars, par: S.game.level.par });
    S.game.reward = archiveReward(stars);
    S.game.archDayDone = DAILY_ORDER.every((d) => store.anyEntry(S.game.day, d)?.done);
    if (S.game.archDayDone) S.game.reward += ARCHIVE_DAY_BONUS;
    store.addCoins(S.game.reward);
    S.game.prog = track('archiveWin', { stars });
  } else if (S.game.mode === 'daily' && !S.game.review) {
    count('dw_', S.game.diff);
    store.setDailyEntry(S.game.day, S.game.diff, {
      done: true,
      moves: S.game.moves,
      stars,
      par: S.game.level.par,
      path: S.game.path.slice(),
    });
    S.game.reward = dailyReward(stars);
    S.game.dayDone = dailyChestReady(S.game.day);
    store.addCoins(S.game.reward);
    S.game.prog = track('dailyWin', { stars });
  } else if (S.game.mode === 'event') {
    const r = eventWin(S.game.stage, stars);
    S.game.reward = r.reward;
    S.game.eventResult = r;
    S.game.prog = track('archiveWin', { stars });
  } else if (S.game.mode === 'challenge') {
    if (S.game.moves <= S.game.target && !store.data.chWon?.[`${S.game.n}:${S.game.target}`]) {
      store.data.chWon = { ...(store.data.chWon || {}), [`${S.game.n}:${S.game.target}`]: 1 };
      S.game.reward = 30;
      store.addCoins(30);
    }
  } else if (S.game.mode === 'level') {
    const prev = store.recordLevel(S.game.n, stars);
    count('w', S.game.n);
    if (stars === 3) count('x', S.game.n);
    if (prev === 0 && S.game.n <= 2) import('./install.js').then((m) => m.persistStorage());
    syncRank();
    S.game.newBest = prev > 0 && stars > prev;
    S.game.prevStars = prev;
    if (prev === 0 && store.data.levels.unlocked === S.game.n + 1) S.pendingUnlock = S.game.n + 1;
    S.game.reward = levelReward(prev, stars);
    if (S.game.reward) store.addCoins(S.game.reward);
    // Perfect run: new levels won with 3★ in a row. Missing the 3★ puts the run on hold:
    // replaying that same level for 3★ saves it, moving on loses it.
    S.game.perfectRun = 0;
    S.game.perfectHold = 0;
    const pend = store.data.perfectPending;
    if (prev === 0 || (pend && pend.n === S.game.n)) {
      if (stars === 3) {
        const run = (pend && pend.n === S.game.n ? pend.run : store.data.perfectRun || 0) + 1;
        store.data.perfectRun = run;
        store.data.perfectPending = null;
        S.game.perfectRun = run;
        S.game.bonus = perfectRunBonus(run);
        if (S.game.bonus) store.addCoins(S.game.bonus);
      } else if (prev === 0) {
        const run = store.data.perfectRun || 0;
        store.data.perfectPending = run >= 2 ? { n: S.game.n, run } : null;
        store.data.perfectRun = 0;
        S.game.perfectHold = run >= 2 ? run : 0;
      }
      save();
    }
    S.game.prog = track('levelWin', { stars, first: prev === 0, newStars: Math.max(0, stars - prev), usedBooster: !!S.game.usedBooster });
    S.game.bossSkin = null;
    if (prev === 0 && isBoss(S.game.n)) {
      const sk = pickSkin(['rare', 'epic'], worldOf(S.game.n));
      if (sk && grantSkin(sk.id)) S.game.bossSkin = sk.id;
    }
    // Warm the cache so "Next level" opens instantly.
    setTimeout(() => adventureLevel(S.game.n + 1), 600);
  }

  setTimeout(() => {
    sfx.win();
    if (S.game.mode === 'tutorial') return onTutorialStep();
    showResult();
  }, 380);
}

export function onTutorialStep() {
  if (S.game.tut < TUTORIAL.length - 1) {
    toast('✓');
    setTimeout(() => startTutorial(S.game.tut + 1), 350);
    return;
  }
  store.data.tutorialDone = true;
  count('tut');
  save();
  showResultCard({
    stars: 3,
    title: t('tutDone'),
    line: '',
    sub: t('tutDoneSub'),
    actions: [
      {
        label: t('letsGo'),
        primary: true,
        onClick: () => iris(() => startLevel(store.data.levels.unlocked), worldHue(store.data.levels.unlocked)),
      },
    ],
  });
}

export function showResult() {
  const { stars, moves, level } = S.game;
  const title = stars === 3 ? t('perfect') : stars === 2 ? t('great') : t('solved');
  const line = t('resultLine', { m: moves, p: level.par });
  const actions = [];
  let sub = '';

  if (S.game.mode === 'daily' && S.game.archive) {
    const day = S.game.day;
    const nextDiff = DAILY_ORDER.find((d) => !store.anyEntry(day, d)?.done);
    if (S.game.archDayDone) sub = t('archDayDone', { n: ARCHIVE_DAY_BONUS });
    actions.push({ label: t('calendar'), icon: 'i-calendar', onClick: () => backToArchive(day) });
    if (nextDiff) actions.push({ label: t('nextPuzzle'), primary: true, onClick: () => iris(() => startDaily(nextDiff, day)) });
    else actions.push({ label: t('home'), primary: true, onClick: goHome });
  } else if (S.game.mode === 'daily') {
    const nextDiff = DAILY_ORDER.find((d) => !store.dailyEntry(S.game.day, d)?.done);
    if (nextDiff && S.game.day === S.today) {
      actions.push({ label: t('home'), icon: 'i-back', onClick: goHome });
      actions.push({ label: t('nextPuzzle'), primary: true, onClick: () => iris(() => startDaily(nextDiff)) });
    } else {
      if (store.dayComplete(S.game.day)) {
        sub = `${t('allDone')} ${t('allDoneSub')}`;
      }
      actions.push({ label: t('home'), icon: 'i-back', onClick: goHome });
      actions.push({ label: t('share'), primary: true, icon: 'i-share', onClick: shareDay, keepOpen: true });
    }
    if (S.game.dayDone) {
      sub = t('dayBonus');
      const day = S.game.day;
      actions.push({ label: t('openChest'), primary: true, wide: true, icon: 'i-gift', onClick: () => openDailyChest(day).then(goHome) });
      actions.find((a) => a.icon === 'i-share').primary = false;
    }
  } else if (S.game.mode === 'event') {
    const { week, stage, eventResult: r } = S.game;
    const toEvent = () => {
      goHome();
      openEvent();
    };
    if (r.finished) {
      sub = t('evComplete');
      actions.push({ label: t('evShort'), icon: 'i-trophy', onClick: toEvent });
      actions.push({ label: t('openChest'), primary: true, wide: true, icon: 'i-gift', onClick: () => openEventChest(week).then(toEvent) });
    } else {
      actions.push({ label: t('evShort'), icon: 'i-trophy', onClick: toEvent });
      if (stars < 3) actions.push({ label: t('retry'), icon: 'i-restart', onClick: () => iris(() => startEventStage(stage)) });
      if (r.next >= 0) actions.push({ label: t('evNext'), primary: true, icon: 'i-play', iconAfter: true, wide: true, onClick: () => iris(() => startEventStage(r.next)) });
      else actions.push({ label: t('home'), primary: true, wide: true, onClick: goHome });
    }
  } else if (S.game.mode === 'custom') {
    const g = S.game;
    const ed = () => import('./editor.js');
    showResultCard({
      stars,
      title,
      line,
      sub: '',
      actions: g.fromEditor
        ? [
            { label: t('edEdit'), icon: 'i-pencil', onClick: () => ed().then((m) => m.openEditor()) },
            { label: t('edShare'), primary: true, icon: 'i-share', keepOpen: true, onClick: () => ed().then((m) => m.shareLevel(g.rows, g.level.par)) },
          ]
        : [
            { label: t('customCreate'), icon: 'i-pencil', onClick: () => ed().then((m) => iris(() => m.openEditor())) },
            { label: t('customNext'), primary: true, icon: 'i-share', keepOpen: true, wide: true, onClick: () => ed().then((m) => m.shareLevel(g.rows, g.level.par)) },
          ],
    });
    return;
  } else if (S.game.mode === 'challenge') {
    const n = S.game.n;
    const won = moves <= S.game.target;
    showResultCard({
      stars,
      title: won ? t('chWon') : t('chLost'),
      line: t('chLine', { m: moves, c: S.game.target }),
      sub: won ? t('chWonSub') : t('chLostSub'),
      reward: S.game.reward || 0,
      actions: [
        { label: t('home'), icon: 'i-back', onClick: goHome },
        ...(won ? [] : [{ label: t('retry'), icon: 'i-restart', onClick: () => iris(() => startChallenge(n, S.game.target)) }]),
        { label: t('chBack'), primary: true, icon: 'i-share', wide: true, keepOpen: true, onClick: () => shareChallenge(n, moves, stars) },
      ],
    });
    return;
  } else if (S.game.mode === 'level') {
    const n = S.game.n;
    // Opt-in rewarded ad: double the coins of this win (only when ads are enabled).
    const won = S.game.reward || 0;
    if (won > 0 && rewardedLeft('double')) {
      actions.push({
        label: t('adDouble', { n: won }), icon: 'i-video', keepOpen: true, wide: true, cls: 'btn-ad',
        onClick: async (b) => {
          b.disabled = true;
          if (await showRewarded('double')) {
            store.addCoins(won);
            updateCoins(true);
            sfx.coinRain();
            b.querySelector('span').textContent = t('adDone', { n: won });
          } else b.disabled = false;
        },
      });
    }
    actions.push({ label: t('map'), icon: 'i-flag', onClick: () => iris(openMap, worldHue(n)) });
    if (stars < 3) actions.push({ label: t('retry'), icon: 'i-restart', onClick: () => iris(() => startLevel(n), worldHue(n)) });
    actions.push({ label: t('challengeFriend'), icon: 'i-share', keepOpen: true, onClick: () => shareChallenge(n, S.game.moves, stars) });
    const next = n + 1;
    actions.push({ label: isBoss(next) ? `BOSS · ${t('level', { n: next })}` : t('level', { n: next }), primary: true, icon: 'i-play', iconAfter: true, cls: isBoss(next) ? 'is-boss-next' : '', onClick: () => iris(() => startLevel(next), worldHue(next)), wide: true });
  }
  showResultCard({ stars, title, line, sub, actions, reward: (S.game.reward || 0) + (S.game.bonus || 0) });
}

/* ---------- the victory card ---------- */
const later = (ms, fn) => setTimeout(fn, reducedMotion() ? Math.min(ms, 120) : ms);

/** "6 moves · par 6 ✓" as two pills (adventure and daily puzzles). */
function movesHTML(moves, par) {
  const ok = moves <= par;
  return `<span class="rm-pill"><svg><use href="#i-hint"/></svg>${t('rMoves', { n: moves })}</span><span class="rm-pill ${ok ? 'is-ok' : ''}"><svg><use href="#i-star"/></svg>${t('par', { n: par })}${ok ? ' ✓' : ''}</span>`;
}

/** Reward tiles: coins, XP (with the player level bar) and season points. */
function gainsHTML(coins, prog) {
  const tiles = [];
  if (coins) tiles.push(`<div class="gain gain-coins" style="--i:0"><span class="gain-ico"><svg><use href="#i-coin"/></svg></span><b class="gain-n" data-to="${coins}">+0</b><small>${t('rCoins')}</small></div>`);
  if (prog?.xp) {
    const pl = store.data.player;
    tiles.push(`<div class="gain gain-xp" style="--i:${tiles.length}"><span class="gain-ico"><i>XP</i></span><b class="gain-n" data-to="${prog.xp}">+0</b><span class="gain-bar"><i id="result-xp-fill"></i></span><em class="gain-lvl" id="result-levelup" hidden>${pl.level}</em></div>`);
  }
  const sp = prog?.sp || 0;
  if (sp) tiles.push(`<div class="gain gain-sp" style="--i:${tiles.length}"><span class="gain-ico"><svg><use href="#i-star"/></svg></span><b class="gain-n" data-to="${sp}">+0</b><small>${t('rSeason')}</small></div>`);
  return tiles.join('');
}

/** Progress toward the next chest of the world (adventure). */
function goalHTML() {
  const g = S.game;
  if (g?.mode !== 'level') return '';
  const w = worldOf(g.n);
  const ws = worldStars(w);
  const gained = Math.max(0, g.stars - (g.prevStars || 0));
  const before = ws - gained;
  const c = WORLD_CHESTS.find((x) => !isOpened(chestId(w, x.k)) && before < x.stars);
  if (!c) return '';
  const ready = ws >= c.stars;
  const from = Math.min(1, before / c.stars);
  const to = Math.min(1, ws / c.stars);
  return `<span class="goal-chest ${ready ? 'is-ready' : ''}">${chestSVG(c.tier)}</span>
    <span class="goal-body"><small>${ready ? t('goalReady') : t('goalNext')} · ${t(`chest_${c.tier}`)}</small>
    <span class="goal-bar"><i style="--from:${from};--to:${to}"></i><b>${Math.min(ws, c.stars)}/${c.stars} ★</b></span></span>`;
}

function animateGains(box, wallet, coinsBefore) {
  box.querySelectorAll('.gain').forEach((tile, i) => {
    const n = tile.querySelector('.gain-n');
    const to = Number(n.dataset.to);
    later(1250 + i * 220, () => {
      tile.classList.add('in');
      countTo(n, 0, to, 650, (v) => `+${v}`);
      sfx.tick();
    });
  });
  const coinsTile = box.querySelector('.gain-coins');
  if (coinsTile) {
    later(2050, () => {
      flyIcons(coinsTile.querySelector('.gain-ico'), wallet, {
        count: 7,
        layer: $('#modal-result'),
        onArrive: (i) => {
          sfx.tick();
          if (i === 0) {
            countTo(wallet.querySelector('b'), coinsBefore, store.data.coins, 600);
            replay(wallet, 'bump');
            sfx.coin();
            updateCoins();
          }
        },
      });
    });
  }
  // XP bar of the player level (with a level-up flourish).
  const fill = $('#result-xp-fill');
  if (fill && S.game?.xpBefore) {
    const before = S.game.xpBefore;
    const after = store.data.player;
    fill.style.width = `${(before.xp / xpNeeded(before.level)) * 100}%`;
    later(1700, () => {
      fill.style.transition = 'width 0.9s var(--ease-out)';
      if (after.level > before.level) {
        fill.style.width = '100%';
        later(950, () => {
          fill.style.transition = 'none';
          fill.style.width = '0%';
          void fill.offsetWidth;
          fill.style.transition = 'width 0.6s var(--ease-out)';
          fill.style.width = `${(after.xp / xpNeeded(after.level)) * 100}%`;
          const up = $('#result-levelup');
          up.hidden = false;
          replay(up, 'pop-in');
          sfx.star(2);
        });
      } else fill.style.width = `${(after.xp / xpNeeded(after.level)) * 100}%`;
    });
  }
}

export function showResultCard({ stars, title, line, sub, actions, reward = 0 }) {
  const g = S.game;
  const card = $('#modal-result .modal-card');
  card.dataset.stars = stars;
  card.style.setProperty('--hue', g?.mode === 'level' ? worldHue(g.n) : g?.mode === 'event' ? themeOf(g.week).hue : 'var(--c1)');
  // header: what was won, and a wallet that fills up
  $('#result-kicker').textContent =
    g?.mode === 'level'
      ? `${t('level', { n: g.n })} · ${worldName(worldOf(g.n))}`
      : g?.mode === 'daily'
        ? `${t('todayTitle')} · ${t(g.diff)}`
        : g?.mode === 'event'
          ? `${t(`ev_${themeOf(g.week).id}`)} · ${g.stage + 1}/7`
          : '';
  const wallet = $('#result-wallet');
  const coinsBefore = store.data.coins - reward;
  wallet.querySelector('b').textContent = coinsBefore;
  // boss marble
  const rs = $('#result-skin');
  rs.hidden = !g?.bossSkin;
  if (g?.bossSkin) {
    rs.innerHTML = `${marbleHTML(g.bossSkin, 2)}<span><small>${t('newMarble')}</small><strong>${skinName(g.bossSkin)}</strong></span>`;
    later(900, () => sfx.epic());
  }
  $('#result-rays').classList.toggle('on', stars >= 2);
  $('#result-rays').classList.toggle('gold', stars === 3);
  const pr = $('#result-streak');
  const run = g?.mode === 'level' ? g.perfectRun : 0;
  const hold = g?.mode === 'level' ? g.perfectHold : 0;
  pr.hidden = !(run >= 2 || hold);
  pr.classList.toggle('is-hold', !!hold);
  pr.classList.toggle('is-milestone', !!g?.bonus);
  if (run >= 2) pr.textContent = g.bonus ? `${t('perfectRun', { n: run })} · ${t('perfectBonus', { b: g.bonus })}` : t('perfectRun', { n: run });
  else if (hold) pr.textContent = t('perfectKeep', { n: hold });
  $('#new-best').hidden = !g?.newBest;
  // stars slam in one after another
  const starsEl = $('#result-stars');
  starsEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.innerHTML = '<svg><use href="#i-star"/></svg><i class="star-shine"></i>';
    if (i < stars) {
      s.className = 'on';
      s.style.animationDelay = `${0.25 + i * 0.28}s`;
      later(520 + i * 280, () => {
        sfx.star(i);
        buzz(18);
        burst(s, 50, 50, { count: 14, colors: ['#ffd84a', '#fff', 'var(--hue)'], dist: 70 });
        replay(card, 'slam');
      });
    }
    starsEl.appendChild(s);
  }
  const titleEl = $('#result-title');
  titleEl.textContent = title;
  titleEl.className = `rt-${stars}`;
  const lineEl = $('#result-line');
  if (g?.level && (g.mode === 'level' || g.mode === 'daily' || g.mode === 'event')) lineEl.innerHTML = movesHTML(g.moves, g.level.par);
  else lineEl.textContent = line;
  $('#result-sub').textContent = sub;
  // gains and next goal
  const gains = $('#result-gains');
  gains.innerHTML = gainsHTML(reward, g?.prog);
  gains.hidden = !gains.children.length;
  const goal = $('#result-goal');
  goal.innerHTML = goalHTML();
  goal.hidden = !goal.innerHTML;
  if (!goal.hidden) {
    later(2300, () => {
      goal.classList.add('fill');
      if (goal.querySelector('.goal-chest.is-ready')) later(700, () => sfx.chestShake?.(1));
    });
  }
  // actions: big primary button(s), the rest as round buttons
  const box = $('#result-actions');
  box.innerHTML = '';
  const round = document.createElement('div');
  round.className = 'ra-round';
  for (const a of actions) {
    const b = document.createElement('button');
    const isRound = !a.primary && a.icon && !a.cls?.includes('btn-ad');
    if (isRound) {
      b.className = 'ra-btn';
      b.innerHTML = `<span class="ra-ico"><svg><use href="#${a.icon}"/></svg></span><span>${a.label}</span>`;
    } else {
      b.className = `btn ${a.primary ? 'btn-primary' : 'btn-ghost'} ${a.wide ? 'btn-full' : ''} ${a.cls || ''}`;
      b.innerHTML = a.iconAfter
        ? `<span>${a.label}</span><svg class="next-arrow"><use href="#${a.icon}"/></svg>`
        : (a.icon ? `<svg><use href="#${a.icon}"/></svg>` : '') + `<span>${a.label}</span>`;
    }
    b.addEventListener('click', () => {
      if (!a.keepOpen) closeModal('modal-result');
      a.onClick(b);
    });
    (isRound ? round : box).appendChild(b);
  }
  if (round.children.length) box.prepend(round);
  openModal('modal-result');
  animateGains(gains, wallet, coinsBefore);
  // Quest / achievement / level-up banners once the rewards have landed.
  if (g?.prog) later(2600, () => handleProgress(g.prog));
  if (stars === 3) burstConfetti($('#confetti'));
  box.querySelector('.btn-primary')?.focus({ preventScroll: true });
  card.scrollTop = 0;
}

function backToArchive(day) {
  goHome();
  import('./archive.js').then((m) => m.openArchive(day));
}

export function goHome() {
  closeModal('modal-result');
  S.game = null;
  renderHome();
  showView('home');
}

export function exitGame() {
  if (S.game?.mode === 'custom' && S.game.fromEditor) {
    import('./editor.js').then((m) => m.openEditor());
    return;
  }
  if (S.game?.mode === 'level') openMap();
  else if (S.game?.mode === 'event') {
    goHome();
    openEvent();
  } else if (S.game?.mode === 'daily' && S.game.archive) backToArchive(S.game.day);
  else goHome();
}
