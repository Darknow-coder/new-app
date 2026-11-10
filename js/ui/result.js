import { starsFor } from '../engine.js';
import { burst, iris, replay } from '../fx.js';
import { save, store } from '../storage.js';
import { adventureLevel, dailyReward, isBoss, levelReward, worldOf } from '../levels.js';
import { track, xpNeeded } from '../progress.js';
import { grantSkin, marbleHTML, pickSkin, skinName } from '../skins.js';
import { sfx } from '../audio.js';
import { TUTORIAL } from '../tutorial.js';
import { t } from '../i18n.js';
import { DAILY_ORDER } from '../daily.js';
import { burstConfetti } from '../confetti.js';
import { $, S, buzz, closeModal, dailyChestReady, els, openModal, showView, toast, updateCoins, worldHue } from './core.js';
import { shareChallenge, startChallenge, startDaily, startLevel, startTutorial, updateHud } from './game.js';
import { shareDay } from './settings.js';
import { handleProgress, openDailyChest } from './common.js';
import { openMap } from './mapview.js';
import { renderHome } from './home.js';

export function onSolved() {
  S.game.done = true;
  updateHud(false);
  const stars = starsFor(S.game.moves, S.game.level.par);
  S.game.stars = stars;
  S.game.reward = 0;
  S.game.bonus = 0;
  els.board.classList.remove('intro');
  replay(els.board, 'won');
  if (stars === 3) replay(els.board, 'par-flash');
  S.game.xpBefore = { ...store.data.player };
  buzz([20, 40, 20, 40, 60]);

  if (S.game.mode === 'daily' && !S.game.review) {
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
  } else if (S.game.mode === 'challenge') {
    if (S.game.moves <= S.game.target && !store.data.chWon?.[`${S.game.n}:${S.game.target}`]) {
      store.data.chWon = { ...(store.data.chWon || {}), [`${S.game.n}:${S.game.target}`]: 1 };
      S.game.reward = 30;
      store.addCoins(30);
    }
  } else if (S.game.mode === 'level') {
    const prev = store.recordLevel(S.game.n, stars);
    S.game.newBest = prev > 0 && stars > prev;
    if (prev === 0 && store.data.levels.unlocked === S.game.n + 1) S.pendingUnlock = S.game.n + 1;
    S.game.reward = levelReward(prev, stars);
    if (S.game.reward) store.addCoins(S.game.reward);
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

  if (S.game.mode === 'daily') {
    const nextDiff = DAILY_ORDER.find((d) => !store.dailyEntry(S.game.day, d)?.done);
    if (nextDiff && S.game.day === S.today) {
      actions.push({ label: t('home'), onClick: goHome });
      actions.push({ label: t('nextPuzzle'), primary: true, onClick: () => iris(() => startDaily(nextDiff)) });
    } else {
      if (store.dayComplete(S.game.day)) {
        sub = `${t('allDone')} ${t('allDoneSub')}`;
      }
      actions.push({ label: t('home'), onClick: goHome });
      actions.push({ label: t('share'), primary: true, icon: 'i-share', onClick: shareDay, keepOpen: true });
    }
    if (S.game.dayDone) {
      sub = t('dayBonus');
      const day = S.game.day;
      actions.push({ label: t('openChest'), primary: true, wide: true, icon: 'i-gift', onClick: () => openDailyChest(day).then(goHome) });
      actions.find((a) => a.icon === 'i-share').primary = false;
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
            { label: t('edEdit'), onClick: () => ed().then((m) => m.openEditor()) },
            { label: t('edShare'), primary: true, icon: 'i-share', keepOpen: true, onClick: () => ed().then((m) => m.shareLevel(g.rows, g.level.par)) },
          ]
        : [
            { label: t('customCreate'), onClick: () => ed().then((m) => iris(() => m.openEditor())) },
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
        { label: t('home'), onClick: goHome },
        ...(won ? [] : [{ label: t('retry'), onClick: () => iris(() => startChallenge(n, S.game.target)) }]),
        { label: t('chBack'), primary: true, icon: 'i-share', wide: true, keepOpen: true, onClick: () => shareChallenge(n, moves, stars) },
      ],
    });
    return;
  } else if (S.game.mode === 'level') {
    const n = S.game.n;
    actions.push({ label: t('challengeFriend'), icon: 'i-share', keepOpen: true, wide: true, onClick: () => shareChallenge(n, S.game.moves, stars) });
    actions.push({ label: t('map'), onClick: () => iris(openMap, worldHue(n)) });
    if (stars < 3) actions.push({ label: t('retry'), onClick: () => iris(() => startLevel(n), worldHue(n)) });
    actions.push({ label: t('nextLevel'), primary: true, icon: 'i-play', iconAfter: true, onClick: () => iris(() => startLevel(n + 1), worldHue(n + 1)), wide: true });
  }
  showResultCard({ stars, title, line, sub, actions, reward: (S.game.reward || 0) + (S.game.bonus || 0) });
}

export function showResultXP() {
  const box = $('#result-xp');
  const prog = S.game?.prog;
  box.hidden = !prog || !prog.xp;
  if (box.hidden) return;
  const before = S.game.xpBefore;
  const after = store.data.player;
  $('#result-xp-text').textContent = t('xpLine', { n: prog.xp });
  const fill = $('#result-xp-fill');
  fill.style.transition = 'none';
  fill.style.width = `${(before.xp / xpNeeded(before.level)) * 100}%`;
  const lvlUp = $('#result-levelup');
  lvlUp.hidden = true;
  setTimeout(() => {
    fill.style.transition = 'width 0.9s var(--ease-out)';
    if (after.level > before.level) {
      fill.style.width = '100%';
      setTimeout(() => {
        fill.style.transition = 'none';
        fill.style.width = '0%';
        void fill.offsetWidth;
        fill.style.transition = 'width 0.6s var(--ease-out)';
        fill.style.width = `${(after.xp / xpNeeded(after.level)) * 100}%`;
        lvlUp.textContent = t('playerLevel', { n: after.level });
        lvlUp.hidden = false;
        replay(lvlUp, 'pop-in');
      }, 950);
    } else {
      fill.style.width = `${(after.xp / xpNeeded(after.level)) * 100}%`;
    }
  }, 600);
  // Quest / achievement / level-up banners right after the stars land.
  setTimeout(() => handleProgress(prog), 1300);
}

export function showResultCard({ stars, title, line, sub, actions, reward = 0 }) {
  showResultXP();
  const rs = $('#result-skin');
  rs.hidden = !S.game?.bossSkin;
  if (S.game?.bossSkin) {
    rs.innerHTML = `${marbleHTML(S.game.bossSkin, 2)}<span><small>${t('newMarble')}</small><strong>${skinName(S.game.bossSkin)}</strong></span>`;
    setTimeout(() => sfx.epic(), 900);
  }
  $('#result-rays').classList.toggle('on', stars === 3);
  $('#new-best').hidden = !S.game?.newBest;
  const rewardEl = $('#result-reward');
  rewardEl.hidden = !reward;
  if (reward) {
    const span = rewardEl.querySelector('span');
    const start = performance.now();
    const tick = (now) => {
      const p = Math.max(0, Math.min(1, (now - start - 250) / 700));
      span.textContent = t('reward', { n: Math.max(0, Math.round(reward * p)) });
      if (p < 1) requestAnimationFrame(tick);
      else updateCoins(true);
    };
    span.textContent = t('reward', { n: 0 });
    requestAnimationFrame(tick);
    setTimeout(() => sfx.coin(), 950);
  }
  const starsEl = $('#result-stars');
  starsEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.innerHTML = '<svg><use href="#i-star"/></svg>';
    if (i < stars) {
      s.className = 'on';
      s.style.animationDelay = `${0.25 + i * 0.28}s`;
      setTimeout(() => {
        sfx.star(i);
        buzz(18);
        burst(s, 50, 50, { count: 12, colors: ['var(--accent)', '#fff'], dist: 60 });
        replay($('#modal-result .modal-card'), 'slam');
      }, 520 + i * 280);
    }
    starsEl.appendChild(s);
  }
  $('#result-title').textContent = title;
  $('#result-line').textContent = line;
  $('#result-sub').textContent = sub;
  const box = $('#result-actions');
  box.innerHTML = '';
  for (const a of actions) {
    const b = document.createElement('button');
    b.className = `btn ${a.primary ? 'btn-primary' : 'btn-ghost'} ${a.wide ? 'btn-full' : ''}`;
    b.innerHTML = a.iconAfter
      ? `<span>${a.label}</span><svg class="next-arrow"><use href="#${a.icon}"/></svg>`
      : (a.icon ? `<svg><use href="#${a.icon}"/></svg>` : '') + `<span>${a.label}</span>`;
    b.addEventListener('click', () => {
      if (!a.keepOpen) closeModal('modal-result');
      a.onClick();
    });
    box.appendChild(b);
  }
  openModal('modal-result');
  if (stars === 3) burstConfetti($('#confetti'));
  box.querySelector('.btn-primary')?.focus();
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
  else goHome();
}
