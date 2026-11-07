import { tilt, isSolved, solve, starsFor, stateKey, DIRS } from './engine.js';
import { dateKey, puzzleNumber, msUntilTomorrow, dailyLevel, DAILY_ORDER, addDays } from './daily.js';
import { store, computeStats, save } from './storage.js';
import { sfx, haptic, setSoundEnabled, unlockAudio } from './audio.js';
import { t, LANG } from './i18n.js';
import { TUTORIAL } from './tutorial.js';
import { burstConfetti } from './confetti.js';
import {
  adventureLevel,
  worldOf,
  isBoss,
  LEVELS_PER_WORLD,
  WORLD_HUES,
  levelReward,
  dailyReward,
  SHOP,
  DAILY_GIFT,
} from './levels.js';
import { buildScenery, iris, countTo, flyIcons, floatText, replay, burst, reducedMotion } from './fx.js';
import { openChest, chestSVG, WORLD_CHESTS, chestId, isOpened } from './chests.js';

const $ = (sel) => document.querySelector(sel);
const DIFF_EMOJI = { easy: '🟢', medium: '🟡', hard: '🔴' };
const DIFF_TONE = { easy: 'c1', medium: 'c2', hard: 'c0' };

const els = {
  home: $('#view-home'),
  game: $('#view-game'),
  map: $('#view-map'),
  mapEl: $('#map'),
  rewind: $('#btn-rewind'),
  board: $('#board'),
  floor: $('#board-floor'),
  layer: $('#board-layer'),
  area: $('#board-area'),
  moves: $('#moves-num'),
  par: $('#par-num'),
  counter: $('#counter'),
  tip: $('#tip'),
  undo: $('#btn-undo'),
  restart: $('#btn-restart'),
  hint: $('#btn-hint'),
  hintArrow: $('#hint-arrow'),
  toast: $('#toast'),
  live: $('#sr-live'),
};

let today = dateKey();
const buzz = (p) => store.setting('haptics') && haptic(p);
let game = null;
let pendingUnlock = 0;
let animating = false;
let queued = null;

/* ==========================================================================
   Static i18n
   ========================================================================== */
function applyStaticText() {
  document.querySelectorAll('[data-i18n]').forEach((n) => (n.textContent = t(n.dataset.i18n)));
  document.querySelectorAll('[data-i18n-label]').forEach((n) => {
    n.setAttribute('aria-label', t(n.dataset.i18nLabel));
    n.title = t(n.dataset.i18nLabel);
  });
}

/* ==========================================================================
   Helpers
   ========================================================================== */
function starsHTML(n, total = 3) {
  let s = '';
  for (let i = 0; i < total; i++) s += `<svg class="${i < n ? 'on' : ''}"><use href="#i-star"/></svg>`;
  return `<span class="stars" aria-label="${n}/3">${s}</span>`;
}

let toastTimer = 0;
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

function announce(msg) {
  els.live.textContent = msg;
}

function showView(name) {
  for (const v of ['home', 'game', 'map']) {
    els[v].classList.toggle('is-active', name === v);
    els[v].inert = name !== v;
  }
  if (name === 'game') requestAnimationFrame(() => els.board.focus({ preventScroll: true }));
}

function openModal(id) {
  const m = document.getElementById(id);
  if (!m.open) m.showModal();
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m.open) m.close();
}
function anyModalOpen() {
  return !!document.querySelector('dialog[open]');
}

function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

let shownCoins = null;
function updateCoins(bump = false) {
  const target = store.data.coins;
  const from = shownCoins ?? target;
  shownCoins = target;
  document.querySelectorAll('[data-coins]').forEach((b) => {
    countTo(b, from, target, 650);
    if (bump) replay(b.parentElement, 'bump');
  });
}

const worldHue = (n) => WORLD_HUES[worldOf(n) % WORLD_HUES.length];

function worldStars(w) {
  let total = 0;
  const first = w * LEVELS_PER_WORLD + 1;
  for (let n = first; n < first + LEVELS_PER_WORLD; n++) total += store.levelStars(n);
  return total;
}

/** World chests that can be opened right now. */
function readyChests() {
  const out = [];
  const lastWorld = worldOf(store.data.levels.unlocked);
  for (let w = 0; w <= lastWorld; w++) {
    const stars = worldStars(w);
    for (const c of WORLD_CHESTS) if (stars >= c.stars && !isOpened(chestId(w, c.k))) out.push({ w, ...c });
  }
  return out;
}

function dailyChestTier(day) {
  const order = ['wood', 'silver', 'gold'];
  let stars = 0;
  for (const d of DAILY_ORDER) stars += store.dailyEntry(day, d)?.stars || 0;
  let i = stars === 9 ? 1 : 0;
  if (computeStats(today).current >= 7) i++;
  return order[Math.min(i, 2)];
}

function dailyChestReady(day = today) {
  return store.dayComplete(day) && !isOpened(`d-${day}`);
}

function openDailyChest(day = today) {
  return openChest({ id: `d-${day}`, tier: dailyChestTier(day), title: t('dailyChest') }).then(() => {
    shownCoins = null;
    renderHome();
  });
}

/* ==========================================================================
   Home
   ========================================================================== */
function renderHome() {
  today = dateKey();
  const n = puzzleNumber(today);
  const dateFmt = new Intl.DateTimeFormat(LANG, { weekday: 'long', month: 'long', day: 'numeric' });
  $('#home-date').textContent = dateFmt.format(new Date());
  $('#home-num').textContent = `#${n}`;

  const list = $('#daily-list');
  list.innerHTML = '';
  for (const diff of DAILY_ORDER) {
    const entry = store.dailyEntry(today, diff);
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
      const lvl = dailyLevel(today, diff);
      const small = card.querySelector('[data-par]');
      const entry = store.dailyEntry(today, diff);
      small.textContent = entry?.done
        ? `${t('solvedIn', { m: entry.moves })} · ${t('par', { n: lvl.par })}`
        : t('par', { n: lvl.par });
    });
  }, 30);

  const stats = computeStats(today);
  const chip = $('#streak-chip');
  chip.classList.toggle('is-hot', stats.current > 0);
  $('#streak-text').textContent = stats.current > 0 ? t(stats.current === 1 ? 'streakOne' : 'streak', { n: stats.current }) : t('noStreak');

  $('#share-row').hidden = !store.dayComplete(today);
  const lvl = store.data.levels.unlocked;
  $('#adventure-desc').textContent = `${t('world', { n: worldOf(lvl) + 1 })} · ${t('adventureDesc', { n: lvl, s: stats.levelStars })}`;
  $('#adventure-bar').style.width = `${(((lvl - 1) % LEVELS_PER_WORLD) / LEVELS_PER_WORLD) * 100}%`;
  $('#btn-adventure').style.setProperty('--hue', WORLD_HUES[worldOf(lvl) % WORLD_HUES.length]);
  buildScenery($('#scenery-home'), 'home');
  const dChip = $('#daily-chest-chip');
  dChip.hidden = !dailyChestReady();
  if (!dChip.hidden) $('#daily-chest-mini').innerHTML = chestSVG(dailyChestTier(today));
  const ready = readyChests().length;
  const advChests = $('#adv-chests');
  advChests.hidden = !ready;
  advChests.textContent = t('chestsReady', { n: ready });
  const giftChip = $('#gift-chip');
  giftChip.hidden = store.data.giftDay === today;
  $('#gift-text').textContent = t('giftClaim', { n: DAILY_GIFT });
  updateCoins();
  updateCountdown();
}

function updateCountdown() {
  $('#countdown').textContent = t('nextIn', { t: fmtCountdown(msUntilTomorrow()) });
}

setInterval(() => {
  if (dateKey() !== today) {
    renderHome();
    return;
  }
  if (els.home.classList.contains('is-active')) updateCountdown();
}, 1000);

/* ==========================================================================
   Starting games
   ========================================================================== */
function startDaily(diff) {
  sfx.tap();
  const level = dailyLevel(today, diff);
  const entry = store.dailyEntry(today, diff);
  const review = !!entry?.done;
  startGame({
    mode: 'daily',
    diff,
    day: today,
    review,
    level,
    title: `${t(diff)} · #${puzzleNumber(today)}`,
    sub: review ? t('solvedIn', { m: entry.moves }) : '',
    restore: !review && entry ? entry : null,
  });
}

function startLevel(n) {
  sfx.tap();
  const level = adventureLevel(n);
  const best = store.levelStars(n);
  const world = t(`world${worldOf(n) % WORLD_HUES.length}`);
  startGame({
    mode: 'level',
    n,
    level,
    title: t('level', { n }),
    sub: isBoss(n) ? `${t('boss')} · ${world}` : best ? `${world} · ${starsText(best)}` : world,
  });
}

function startTutorial(i = 0) {
  const lesson = TUTORIAL[i];
  startGame({
    mode: 'tutorial',
    tut: i,
    level: lesson.level,
    title: t('tutorial'),
    sub: t('tutStep', { n: i + 1, t: TUTORIAL.length }),
    tip: t(`tut${i + 1}`),
  });
}

function starsText(n) {
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

function startGame(opts) {
  game = {
    ...opts,
    state: opts.level.start.slice(),
    history: [],
    path: [],
    moves: 0,
    hintUsed: false,
    done: false,
  };
  if (opts.restore) {
    for (const d of opts.restore.path || []) {
      game.history.push(game.state);
      game.state = tilt(game.level, game.state, d).state;
      game.path.push(d);
    }
    game.moves = opts.restore.moves || 0;
  }
  $('#game-title').textContent = opts.title;
  $('#game-sub').textContent = opts.sub || '';
  if (opts.tip) {
    els.tip.textContent = opts.tip;
    els.tip.hidden = false;
  } else {
    els.tip.hidden = true;
  }
  els.hint.hidden = opts.mode !== 'level';
  els.rewind.hidden = opts.mode !== 'level';
  els.restart.hidden = opts.mode === 'tutorial' && opts.tut === 0;
  animating = false;
  queued = null;
  if (opts.mode === 'level') buildScenery($('#scenery-game'), worldOf(opts.n) % WORLD_HUES.length, worldHue(opts.n));
  else buildScenery($('#scenery-game'), 'daily');
  buildBoard();
  updateHud(false);
  showView('game');
  const banner = $('#level-banner');
  banner.querySelector('strong').textContent = opts.title;
  banner.querySelector('small').textContent = t('par', { n: opts.level.par });
  if (opts.mode !== 'tutorial') replay(banner, 'show');
}

/* ==========================================================================
   Board rendering
   ========================================================================== */
function cellXY(c) {
  return { x: c % game.level.w, y: Math.floor(c / game.level.w) };
}

function setPos(el, c) {
  const { x, y } = cellXY(c);
  el.style.setProperty('--x', x);
  el.style.setProperty('--y', y);
}

function buildBoard() {
  const { level } = game;
  els.board.style.setProperty('--w', level.w);
  els.board.style.setProperty('--h', level.h);
  els.layer.innerHTML = '';
  els.hintArrow.hidden = true;
  game.holeEls = new Map();
  game.pieceEls = [];

  const frag = document.createDocumentFragment();
  for (let c = 0; c < level.w * level.h; c++) {
    if (level.walls[c]) {
      const w = document.createElement('div');
      w.className = 'cell wall';
      setPos(w, c);
      frag.appendChild(w);
    } else if (level.holes[c] >= 0) {
      const h = document.createElement('div');
      h.className = `cell hole c${level.holes[c]}`;
      setPos(h, c);
      game.holeEls.set(level.holes[c], h);
      frag.appendChild(h);
    }
  }
  level.pieces.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'cell piece';
    el.innerHTML = p.kind === 'marble' ? `<div class="ball c${p.color}"></div>` : '<div class="stone"></div>';
    frag.appendChild(el);
    game.pieceEls[i] = el;
  });
  els.layer.appendChild(frag);
  els.layer.querySelectorAll('.cell').forEach((el) => {
    const x = Number(el.style.getPropertyValue('--x')) || 0;
    const y = Number(el.style.getPropertyValue('--y')) || 0;
    el.style.setProperty('--d', `${120 + (x + y) * 32}ms`);
  });
  syncPieces(0);
  sizeBoard();
  els.board.classList.remove('won');
  replay(els.board, 'intro');
  clearTimeout(buildBoard.timer);
  buildBoard.timer = setTimeout(() => els.board.classList.remove('intro'), 1100);
}

/** Snap (or quickly animate) every piece to the current state. */
function syncPieces(duration) {
  const { level, state } = game;
  level.pieces.forEach((p, i) => {
    const el = game.pieceEls[i];
    el.style.transition = duration ? `transform ${duration}ms var(--ease-out)` : 'none';
    el.classList.remove('sinking', 'impact-x', 'impact-y');
    if (state[i] === -1) {
      el.classList.add('gone');
      if (p.kind === 'marble') {
        setPos(el, holeCell(p.color));
        game.holeEls.get(p.color)?.classList.add('filled');
      }
    } else {
      if (el.classList.contains('gone')) {
        el.classList.remove('gone');
        el.style.transition = 'none';
        el.classList.remove('appear');
        void el.offsetWidth;
        el.classList.add('appear');
        if (p.kind === 'marble') game.holeEls.get(p.color)?.classList.remove('filled');
      }
      setPos(el, state[i]);
    }
  });
}

function holeCell(color) {
  return game.level.holes.findIndex((h) => h === color);
}

function sizeBoard() {
  if (!game) return;
  const rect = els.area.getBoundingClientRect();
  const { w, h } = game.level;
  const avW = rect.width;
  const avH = rect.height - 12;
  const size = Math.max(160, Math.min(avW / 1.08, (avH / 1.1) * (w / h), 520));
  els.board.style.setProperty('--size', `${Math.floor(size)}px`);
}
new ResizeObserver(sizeBoard).observe(els.area);

function updateHud(bump = true) {
  els.moves.textContent = game.moves;
  if (bump) {
    els.moves.classList.remove('bump');
    void els.moves.offsetWidth;
    els.moves.classList.add('bump');
  }
  els.par.textContent = t('par', { n: game.level.par });
  els.counter.classList.toggle('is-over', game.moves > game.level.par);
  els.undo.disabled = game.done || game.history.length === 0;
  els.restart.disabled = game.done || game.history.length === 0;
  els.hint.disabled = game.done;
  els.rewind.disabled = game.done || game.history.length === 0;
  for (const b of ['hint', 'rewind']) {
    const n = store.booster(b);
    const badge = $(`#${b}-count`);
    badge.textContent = n > 0 ? n : '+';
    badge.classList.toggle('is-empty', n === 0);
  }
}

/* ==========================================================================
   Moves
   ========================================================================== */
function rollMs(dist) {
  return Math.round(95 * Math.sqrt(dist) + 45);
}

function move(dir) {
  if (!game || game.done) return;
  if (animating) {
    queued = dir;
    return;
  }
  unlockAudio();
  const { state: next, moves } = tilt(game.level, game.state, dir);
  if (stateKey(next) === stateKey(game.state)) {
    els.board.classList.remove('shake');
    void els.board.offsetWidth;
    els.board.classList.add('shake');
    sfx.thud();
    buzz(15);
    announce(t('nothingMoved'));
    return;
  }

  els.hintArrow.hidden = true;
  game.history.push(game.state);
  game.path.push(dir);
  game.state = next;
  game.moves++;
  animating = true;
  updateHud();
  persistProgress();
  announce(t('moveAnnounce', { d: t(dir), m: game.moves }));

  els.board.dataset.tilt = dir;
  const axis = DIRS[dir].dx ? 'impact-x' : 'impact-y';
  let longest = 0;
  let dropIndex = 0;
  moves.forEach((m, i) => {
    if (!m || m.dist === 0) return;
    const el = game.pieceEls[i];
    const ms = rollMs(m.dist);
    longest = Math.max(longest, ms + (m.sunk ? 300 : 120));
    el.classList.remove('impact-x', 'impact-y', 'sinking');
    el.style.transition = `transform ${ms}ms cubic-bezier(0.45, 0, 0.9, 0.65)`;
    setPos(el, m.to);
    const piece = game.level.pieces[i];
    const order = dropIndex;
    setTimeout(() => {
      if (m.sunk) {
        el.classList.add('sinking');
        const hole = game.holeEls.get(piece.color);
        hole.classList.remove('pulse');
        void hole.offsetWidth;
        hole.classList.add('pulse', 'filled');
        sparks(m.to, piece.color);
        sfx.drop(order);
        buzz([10, 30, 20]);
        setTimeout(() => el.classList.add('gone'), 340);
      } else {
        el.classList.add(axis);
        sfx.clack(Math.min(1, m.dist / 5));
      }
    }, ms);
    if (m.sunk) dropIndex++;
  });
  const longestRoll = Math.max(...moves.filter((m) => m && m.dist).map((m) => rollMs(m.dist)));
  sfx.roll(longestRoll / 1000);
  buzz(8);

  setTimeout(() => {
    delete els.board.dataset.tilt;
  }, Math.min(longestRoll + 60, 360));

  setTimeout(() => {
    animating = false;
    if (isSolved(game.level, game.state)) {
      onSolved();
    } else if (queued) {
      const d = queued;
      queued = null;
      move(d);
    }
  }, Math.max(longest, 160));
}

function sparks(cell, color) {
  const { x, y } = cellXY(cell);
  const { w, h } = game.level;
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('i');
    s.className = `spark c${color}`;
    const a = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
    const r = 30 + Math.random() * 30;
    s.style.left = `${((x + 0.5) / w) * 100}%`;
    s.style.top = `${((y + 0.5) / h) * 100}%`;
    s.style.setProperty('--sx', `${Math.cos(a) * r}px`);
    s.style.setProperty('--sy', `${Math.sin(a) * r}px`);
    els.layer.appendChild(s);
    setTimeout(() => s.remove(), 600);
  }
}

function undo() {
  if (!game || game.done || animating || !game.history.length) return;
  sfx.undo();
  game.state = game.history.pop();
  game.path.pop();
  els.hintArrow.hidden = true;
  syncPieces(180);
  updateHud(false);
  persistProgress();
}

function restart() {
  if (!game || game.done || animating || !game.history.length) return;
  sfx.undo();
  game.history = [];
  game.path = [];
  game.state = game.level.start.slice();
  els.hintArrow.hidden = true;
  syncPieces(260);
  updateHud(false);
  persistProgress();
}

/** Spend one booster, or send the player to the shop if they have none. */
function useBooster(id) {
  if (store.booster(id) > 0) {
    store.booster(id, -1);
    return true;
  }
  toast(t('outOf', { b: t(`${id}Name`).toLowerCase() }));
  openShop();
  return false;
}

function hint() {
  if (!game || game.done || animating || game.mode !== 'level') return;
  const key = stateKey(game.state);
  if (game.hintKey === key && !els.hintArrow.hidden) return; // already showing for this position
  const sol = solve(game.level, game.state, { maxDepth: 30, maxStates: 400000 });
  if (!sol || !sol.path.length) return;
  if (!useBooster('hint')) return;
  game.hintKey = key;
  updateHud(false);
  const rot = { up: 0, right: 90, down: 180, left: 270 }[sol.path[0]];
  els.hintArrow.style.setProperty('--rot', `${rot}deg`);
  els.hintArrow.hidden = false;
  sfx.tap();
}

function rewind() {
  if (!game || game.done || animating || game.mode !== 'level' || !game.history.length) return;
  if (!useBooster('rewind')) return;
  sfx.undo();
  game.state = game.history.pop();
  game.path.pop();
  game.moves = Math.max(0, game.moves - 1);
  els.hintArrow.hidden = true;
  syncPieces(180);
  updateHud(true);
}

function persistProgress() {
  if (game.mode !== 'daily' || game.review) return;
  store.setDailyEntry(game.day, game.diff, { done: false, moves: game.moves, path: game.path.slice() });
}

/* ==========================================================================
   Winning
   ========================================================================== */
function onSolved() {
  game.done = true;
  updateHud(false);
  const stars = starsFor(game.moves, game.level.par);
  game.stars = stars;
  game.reward = 0;
  game.bonus = 0;
  els.board.classList.remove('intro');
  replay(els.board, 'won');
  buzz([20, 40, 20, 40, 60]);

  if (game.mode === 'daily' && !game.review) {
    store.setDailyEntry(game.day, game.diff, {
      done: true,
      moves: game.moves,
      stars,
      par: game.level.par,
      path: game.path.slice(),
    });
    game.reward = dailyReward(stars);
    game.dayDone = dailyChestReady(game.day);
    store.addCoins(game.reward);
  } else if (game.mode === 'level') {
    const prev = store.recordLevel(game.n, stars);
    game.newBest = prev > 0 && stars > prev;
    if (prev === 0 && store.data.levels.unlocked === game.n + 1) pendingUnlock = game.n + 1;
    game.reward = levelReward(prev, stars);
    if (game.reward) store.addCoins(game.reward);
    // Warm the cache so "Next level" opens instantly.
    setTimeout(() => adventureLevel(game.n + 1), 600);
  }

  setTimeout(() => {
    sfx.win();
    if (game.mode === 'tutorial') return onTutorialStep();
    showResult();
  }, 380);
}

function onTutorialStep() {
  if (game.tut < TUTORIAL.length - 1) {
    toast('✓');
    setTimeout(() => startTutorial(game.tut + 1), 350);
    return;
  }
  store.data.tutorialDone = true;
  save();
  showResultCard({
    stars: 3,
    title: t('tutDone'),
    line: '',
    sub: t('tutDoneSub'),
    actions: [{ label: t('letsGo'), primary: true, onClick: goHome }],
  });
}

function showResult() {
  const { stars, moves, level } = game;
  const title = stars === 3 ? t('perfect') : stars === 2 ? t('great') : t('solved');
  const line = t('resultLine', { m: moves, p: level.par });
  const actions = [];
  let sub = '';

  if (game.mode === 'daily') {
    const nextDiff = DAILY_ORDER.find((d) => !store.dailyEntry(game.day, d)?.done);
    if (nextDiff && game.day === today) {
      actions.push({ label: t('home'), onClick: goHome });
      actions.push({ label: t('nextPuzzle'), primary: true, onClick: () => iris(() => startDaily(nextDiff)) });
    } else {
      if (store.dayComplete(game.day)) {
        sub = `${t('allDone')} ${t('allDoneSub')}`;
      }
      actions.push({ label: t('home'), onClick: goHome });
      actions.push({ label: t('share'), primary: true, icon: 'i-share', onClick: shareDay, keepOpen: true });
    }
    if (game.dayDone) {
      sub = t('dayBonus');
      const day = game.day;
      actions.push({ label: t('openChest'), primary: true, wide: true, icon: 'i-gift', onClick: () => openDailyChest(day).then(goHome) });
      actions.find((a) => a.icon === 'i-share').primary = false;
    }
  } else if (game.mode === 'level') {
    const n = game.n;
    actions.push({ label: t('map'), onClick: () => iris(openMap, worldHue(n)) });
    if (stars < 3) actions.push({ label: t('retry'), onClick: () => iris(() => startLevel(n), worldHue(n)) });
    actions.push({ label: t('nextLevel'), primary: true, onClick: () => iris(() => startLevel(n + 1), worldHue(n + 1)), wide: true });
  }
  showResultCard({ stars, title, line, sub, actions, reward: (game.reward || 0) + (game.bonus || 0) });
}

function showResultCard({ stars, title, line, sub, actions, reward = 0 }) {
  $('#result-rays').classList.toggle('on', stars === 3);
  $('#new-best').hidden = !game?.newBest;
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
      s.style.animationDelay = `${0.15 + i * 0.16}s`;
      setTimeout(() => sfx.star(i), 150 + i * 160);
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
    b.innerHTML = (a.icon ? `<svg><use href="#${a.icon}"/></svg>` : '') + `<span>${a.label}</span>`;
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

function goHome() {
  closeModal('modal-result');
  game = null;
  renderHome();
  showView('home');
}

/** Leave the current puzzle to wherever it came from. */
function exitGame() {
  if (game?.mode === 'level') openMap();
  else goHome();
}

/* ==========================================================================
   Adventure map
   ========================================================================== */
const ROW = 92;

function nodeX(n) {
  return 50 + 30 * Math.sin(n * 0.8);
}

function renderMap({ hideUnlock = 0 } = {}) {
  const unlocked = store.data.levels.unlocked;
  const lastWorld = worldOf(unlocked) + 1; // show the next world as a locked preview
  const map = els.mapEl;
  map.innerHTML = '';
  let total = 0;
  for (let w = 0; w <= lastWorld; w++) {
    const hue = WORLD_HUES[w % WORLD_HUES.length];
    const first = w * LEVELS_PER_WORLD + 1;
    const ws = worldStars(w);
    total += ws;

    const sec = document.createElement('section');
    sec.className = `world ${first > unlocked ? 'is-locked' : ''}`;
    sec.dataset.world = w;
    sec.style.setProperty('--hue', hue);
    const height = LEVELS_PER_WORLD * ROW + 30 + 90;
    const pts = [];
    let nodes = '';
    for (let i = 0; i < LEVELS_PER_WORLD; i++) {
      const n = first + i;
      const x = nodeX(n);
      const y = i * ROW + 50;
      pts.push(`${x},${y}`);
      const stars = store.levelStars(n);
      let state = n < unlocked || stars ? 'done' : n === unlocked ? 'current' : 'locked';
      if (n === hideUnlock) state = 'locked';
      const inner = state === 'locked' ? '<svg><use href="#i-lock"/></svg>' : `<span>${n}</span>`;
      const starRow = state === 'done' ? `<span class="node-stars">${starsHTML(stars)}</span>` : '';
      nodes += `<button class="node is-${state} ${isBoss(n) ? 'is-boss' : ''}" data-n="${n}" style="left:${x}%;top:${y}px;--i:${i}" aria-label="${t('level', { n })}${stars ? `, ${stars}/3` : ''}">${inner}${starRow}${isBoss(n) ? '<em>BOSS</em>' : ''}</button>`;
    }
    // Star chests along the path.
    for (const c of WORLD_CHESTS) {
      const id = chestId(w, c.k);
      const opened = isOpened(id);
      const ready = !opened && ws >= c.stars;
      let x;
      let y;
      if (c.after >= LEVELS_PER_WORLD) {
        x = 50;
        y = LEVELS_PER_WORLD * ROW + 40;
        pts.push(`${x},${y}`);
      } else {
        const mid = (nodeX(first + c.after - 1) + nodeX(first + c.after)) / 2;
        x = mid > 50 ? 20 : 80;
        y = (c.after - 1) * ROW + 50 + ROW / 2;
      }
      const state = opened ? 'opened' : ready ? 'ready' : 'locked';
      const label = ready
        ? `<b class="chest-label">${t('chestReady')}</b>`
        : opened
          ? ''
          : `<b class="chest-label">${Math.min(ws, c.stars)}/${c.stars}<svg><use href="#i-star"/></svg></b>`;
      nodes += `<button class="chest-node is-${state}" data-chest="${id}" data-tier="${c.tier}" data-need="${c.stars}" style="left:${x}%;top:${y}px" aria-label="${t(`chest_${c.tier}`)}">${chestSVG(c.tier, opened ? 'is-open' : '')}${label}</button>`;
    }
    sec.innerHTML = `
      <header class="world-head">
        <small>${t('world', { n: w + 1 })}</small>
        <strong>${t(`world${w % WORLD_HUES.length}`)}</strong>
        <span class="world-stars"><svg><use href="#i-star"/></svg>${ws}/${LEVELS_PER_WORLD * 3}</span>
      </header>
      <div class="world-path" style="height:${height}px">
        <svg class="path-svg" viewBox="0 0 100 ${height}" preserveAspectRatio="none" aria-hidden="true">
          <polyline points="${pts.join(' ')}" vector-effect="non-scaling-stroke"/>
        </svg>
        ${nodes}
      </div>`;
    map.appendChild(sec);
  }
  $('#map-sub').textContent = `${total}★ · ${t('level', { n: unlocked })}`;
  updateCoins();
  updateMapScenery();
}

/** The animated background follows the world you are scrolling through. */
function updateMapScenery() {
  const sc = $('#map-scroll');
  const mid = sc.getBoundingClientRect().top + sc.clientHeight * 0.4;
  let w = worldOf(store.data.levels.unlocked);
  for (const sec of els.mapEl.querySelectorAll('.world')) {
    if (sec.getBoundingClientRect().top <= mid) w = Number(sec.dataset.world);
  }
  buildScenery($('#scenery-map'), w % WORLD_HUES.length, WORLD_HUES[w % WORLD_HUES.length]);
}
let mapScrollRaf = 0;
$('#map-scroll').addEventListener('scroll', () => {
  cancelAnimationFrame(mapScrollRaf);
  mapScrollRaf = requestAnimationFrame(updateMapScenery);
});

function scrollMapTo(node, smooth = false) {
  const sc = $('#map-scroll');
  if (!node) return;
  const delta = node.getBoundingClientRect().top - sc.getBoundingClientRect().top;
  sc.scrollTo({ top: sc.scrollTop + delta - sc.clientHeight / 2 + 35, behavior: smooth ? 'smooth' : 'auto' });
}

function openMap() {
  closeModal('modal-result');
  game = null;
  const u = store.data.levels.unlocked;
  const animate = pendingUnlock === u && !reducedMotion();
  pendingUnlock = 0;
  renderMap({ hideUnlock: animate ? u : 0 });
  showView('map');
  requestAnimationFrame(() => {
    const target = els.mapEl.querySelector(animate ? `.node[data-n="${u}"]` : '.node.is-current');
    scrollMapTo(target);
    if (animate) setTimeout(() => playUnlock(u), 450);
  });
}

/** A marble rolls from the finished level to the next one and breaks its lock. */
function playUnlock(u) {
  const node = els.mapEl.querySelector(`.node[data-n="${u}"]`);
  const prev = els.mapEl.querySelector(`.node[data-n="${u - 1}"]`);
  if (!node) return;
  prev?.querySelector('.node-stars')?.classList.add('pop');
  const finish = () => {
    replay(node, 'unlocking');
    sfx.chestShake(1);
    setTimeout(() => {
      node.className = `node is-current ${isBoss(u) ? 'is-boss' : ''} just-unlocked`;
      node.innerHTML = `<span>${u}</span>${isBoss(u) ? '<em>BOSS</em>' : ''}`;
      const path = node.parentElement;
      burst(path, parseFloat(node.style.left), (parseFloat(node.style.top) / path.clientHeight) * 100, {
        count: 18,
        colors: ['var(--accent)', '#fff', worldHue(u)],
        dist: 70,
      });
      sfx.unlock();
      buzz([15, 30, 25]);
      toast(t('levelUp', { n: u }));
    }, 380);
  };
  if (!prev || prev.parentElement !== node.parentElement) {
    finish();
    return;
  }
  const token = document.createElement('i');
  token.className = 'map-token';
  token.style.left = prev.style.left;
  token.style.top = prev.style.top;
  node.parentElement.appendChild(token);
  sfx.roll(0.7);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      token.style.left = node.style.left;
      token.style.top = node.style.top;
    }),
  );
  setTimeout(() => {
    token.classList.add('land');
    setTimeout(() => token.remove(), 300);
    finish();
  }, 760);
}

els.mapEl.addEventListener('click', (e) => {
  const chest = e.target.closest('.chest-node');
  if (chest) {
    if (chest.classList.contains('is-ready')) {
      openChest({ id: chest.dataset.chest, tier: chest.dataset.tier }).then(() => {
        const sc = $('#map-scroll');
        const top = sc.scrollTop;
        shownCoins = null;
        renderMap();
        sc.scrollTop = top;
      });
    } else if (chest.classList.contains('is-locked')) {
      replay(chest, 'deny');
      sfx.thud();
      toast(t('chestNeed', { n: chest.dataset.need }));
    }
    return;
  }
  const node = e.target.closest('.node');
  if (!node) return;
  const n = Number(node.dataset.n);
  if (n > store.data.levels.unlocked) {
    replay(node, 'deny');
    sfx.thud();
    toast(t('lockedLevel', { n: store.data.levels.unlocked }));
    return;
  }
  sfx.tap();
  iris(() => startLevel(n), worldHue(n));
});

/* ==========================================================================
   Shop & gift
   ========================================================================== */
function shopItemName(item) {
  if (item.id === 'pack') return t('packName');
  const [b, q] = Object.entries(item.items)[0];
  return `${t(`${b}Name`)}${q > 1 ? ` ×${q}` : ''}`;
}

function renderShop() {
  updateCoins();
  $('#shop-list').innerHTML = SHOP.map((item, i) => {
    const can = store.data.coins >= item.price;
    const kind = item.id === 'pack' ? 'pack' : Object.keys(item.items)[0];
    const icon = kind === 'pack' ? 'i-gift' : `i-${kind}`;
    const qty = kind === 'pack' ? 0 : item.items[kind];
    const desc = kind === 'pack' ? t('packDesc') : t(`${kind}Desc`);
    const owned = kind === 'pack' ? '' : `<small class="owned" data-owned="${kind}">${t('owned', { n: store.booster(kind) })}</small>`;
    return `
      <div class="shop-item ${kind === 'pack' ? 'is-featured' : ''}" style="--i:${i}">
        ${item.tag ? `<span class="shop-tag">${item.tag}</span>` : ''}
        <span class="shop-icon ${kind}" data-icon="${item.id}"><svg><use href="#${icon}"/></svg>${qty > 1 ? `<b>×${qty}</b>` : ''}</span>
        <span class="shop-text">
          <strong>${shopItemName(item)}</strong>
          <small>${desc}</small>
          ${owned}
        </span>
        <button class="price ${can ? '' : 'is-short'}" data-buy="${item.id}" data-price="${item.price}"><svg><use href="#i-coin"/></svg>${item.price}</button>
      </div>`;
  }).join('');
}

/** Refresh owned counts and affordability without re-running the entrance animation. */
function refreshShop() {
  document.querySelectorAll('#shop-list [data-owned]').forEach((el) => {
    el.textContent = t('owned', { n: store.booster(el.dataset.owned) });
  });
  document.querySelectorAll('#shop-list [data-buy]').forEach((b) => {
    b.classList.toggle('is-short', store.data.coins < Number(b.dataset.price));
  });
}

function openShop() {
  renderShop();
  openModal('modal-shop');
}

$('#shop-list').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-buy]');
  if (!btn) return;
  const item = SHOP.find((i) => i.id === btn.dataset.buy);
  if (!store.spendCoins(item.price)) {
    replay(btn, 'deny');
    sfx.thud();
    buzz([30, 40, 30]);
    toast(t('notEnough'));
    return;
  }
  for (const [b, q] of Object.entries(item.items)) store.booster(b, q);
  replay(btn, 'pressed');
  updateCoins();
  sfx.coin();
  buzz(20);
  const dlg = $('#modal-shop');
  const icon = dlg.querySelector(`[data-icon="${item.id}"]`);
  flyIcons(dlg.querySelector('.shop-balance svg'), icon, {
    count: 6,
    layer: dlg,
    onArrive: (i) => {
      sfx.tick();
      if (i === 5 || reducedMotion()) {
        replay(icon, 'got');
        const total = Object.values(item.items).reduce((a, b) => a + b, 0);
        floatText(icon, `+${total}`, dlg);
        burst(icon, 50, 50, { count: 10, colors: ['var(--accent)', '#fff'], dist: 40 });
        refreshShop();
      }
    },
  });
  if (game) updateHud(false);
});

document.querySelectorAll('[data-shop]').forEach((b) => b.addEventListener('click', openShop));

$('#gift-chip').addEventListener('click', () => {
  if (store.data.giftDay === today) return;
  store.data.giftDay = today;
  store.addCoins(DAILY_GIFT);
  const chip = $('#gift-chip');
  sfx.coin();
  buzz([20, 30, 20]);
  toast(t('giftToast', { n: DAILY_GIFT }));
  flyIcons(chip, $('#view-home .coin-pill'), {
    count: 8,
    onArrive: (i) => {
      sfx.tick();
      if (i === 0) updateCoins(true);
    },
  });
  chip.classList.add('claimed');
  setTimeout(() => {
    chip.hidden = true;
    chip.classList.remove('claimed');
  }, 450);
});

$('#daily-chest-chip').addEventListener('click', () => openDailyChest());

/* ==========================================================================
   Sharing
   ========================================================================== */
function shareText(key = today) {
  const stats = computeStats(today);
  const lines = [`Marbl #${puzzleNumber(key)}${stats.current > 1 ? ` 🔥${stats.current}` : ''}`];
  for (const d of DAILY_ORDER) {
    const e = store.dailyEntry(key, d);
    if (e?.done) {
      const par = e.par ?? dailyLevel(key, d).par;
      lines.push(`${DIFF_EMOJI[d]} ${'⭐'.repeat(e.stars)}${'▫️'.repeat(3 - e.stars)} ${e.moves}/${par}`);
    } else {
      lines.push(`${DIFF_EMOJI[d]} —`);
    }
  }
  lines.push(location.origin + location.pathname.replace(/index\.html$/, ''));
  return lines.join('\n');
}

async function shareDay() {
  const text = shareText();
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ text });
      return;
    }
  } catch (e) {
    if (e?.name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast(t('copied'));
  } catch {
    // Last-resort fallback for older browsers / insecure contexts.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand && document.execCommand('copy');
    ta.remove();
    toast(ok ? t('copied') : t('shareFailed'));
  }
}

/* ==========================================================================
   Stats & settings
   ========================================================================== */
function renderStats() {
  const s = computeStats(today);
  const items = [
    [s.played, 'statPlayed'],
    [s.current, 'statStreak'],
    [s.best, 'statBest'],
    [s.perfectDays, 'statPerfect'],
    [s.stars, 'statStars'],
    [s.levelReached, 'statLevel'],
  ];
  $('#stats-grid').innerHTML = items
    .map(([v, k]) => `<div class="stat"><b>${v}</b><small>${t(k)}</small></div>`)
    .join('');
  const wd = new Intl.DateTimeFormat(LANG, { weekday: 'narrow' });
  let week = '';
  for (let i = 6; i >= 0; i--) {
    const k = addDays(today, -i);
    const solved = DAILY_ORDER.filter((d) => store.dailyEntry(k, d)?.done).length;
    const [y, m, d] = k.split('-').map(Number);
    week += `<div class="day d${solved} ${i === 0 ? 'today' : ''}" title="${k}"><i></i>${wd.format(new Date(y, m - 1, d))}</div>`;
  }
  $('#stats-week').innerHTML = week;
}

/* ==========================================================================
   Input
   ========================================================================== */
let swipe = null;
els.area.addEventListener('pointerdown', (e) => {
  if (!game || anyModalOpen()) return;
  swipe = { x: e.clientX, y: e.clientY, id: e.pointerId, fired: false };
  unlockAudio();
});
window.addEventListener('pointermove', (e) => {
  if (!swipe || swipe.fired || e.pointerId !== swipe.id) return;
  const dx = e.clientX - swipe.x;
  const dy = e.clientY - swipe.y;
  const threshold = e.pointerType === 'mouse' ? 30 : 22;
  if (Math.hypot(dx, dy) < threshold) return;
  swipe.fired = true;
  move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
});
const endSwipe = () => (swipe = null);
window.addEventListener('pointerup', endSwipe);
window.addEventListener('pointercancel', endSwipe);

const KEYMAP = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right',
};
window.addEventListener('keydown', (e) => {
  if (anyModalOpen() || !els.game.classList.contains('is-active') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (KEYMAP[e.key]) {
    e.preventDefault();
    move(KEYMAP[e.key]);
  } else if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace' || e.key === 'u') {
    e.preventDefault();
    undo();
  } else if (e.key === 'r' || e.key === 'R') {
    restart();
  } else if (e.key === 'Escape') {
    exitGame();
  }
});

els.undo.addEventListener('click', undo);
els.restart.addEventListener('click', restart);
els.hint.addEventListener('click', hint);
els.rewind.addEventListener('click', rewind);
$('#btn-back').addEventListener('click', () => {
  sfx.tap();
  exitGame();
});
$('#btn-map-back').addEventListener('click', () => {
  sfx.tap();
  goHome();
});
$('#btn-adventure').addEventListener('click', () => {
  sfx.tap();
  iris(openMap, worldHue(store.data.levels.unlocked));
});
$('#btn-share-day').addEventListener('click', shareDay);
$('#btn-help').addEventListener('click', () => openModal('modal-help'));
$('#btn-stats').addEventListener('click', () => {
  renderStats();
  openModal('modal-stats');
});
$('#streak-chip').addEventListener('click', () => {
  renderStats();
  openModal('modal-stats');
});
$('#btn-settings').addEventListener('click', () => openModal('modal-settings'));
$('#btn-replay-tutorial').addEventListener('click', () => {
  closeModal('modal-help');
  startTutorial(0);
});

document.querySelectorAll('dialog').forEach((d) => {
  d.addEventListener('click', (e) => {
    if (e.target === d && d.id !== 'modal-result') d.close();
  });
  d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => d.close()));
});
// Escape on the result dialog behaves like "Home" so the player never ends up on a dead board.
$('#modal-result').addEventListener('cancel', (e) => {
  e.preventDefault();
  exitGame();
});

const soundBox = $('#set-sound');
const hapticBox = $('#set-haptics');
soundBox.checked = store.setting('sound');
hapticBox.checked = store.setting('haptics');
setSoundEnabled(soundBox.checked);
soundBox.addEventListener('change', () => {
  store.setting('sound', soundBox.checked);
  setSoundEnabled(soundBox.checked);
  sfx.tap();
});
hapticBox.addEventListener('change', () => {
  store.setting('haptics', hapticBox.checked);
  buzz(20);
});
$('#btn-reset').addEventListener('click', () => {
  if (confirm(t('resetConfirm'))) {
    store.reset();
    closeModal('modal-settings');
    renderHome();
  }
});

// Optional PWA install button.
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvt = e;
  $('#btn-install').hidden = false;
});
$('#btn-install').addEventListener('click', async () => {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice.catch(() => {});
  installEvt = null;
  $('#btn-install').hidden = true;
});

/* ==========================================================================
   Boot
   ========================================================================== */
applyStaticText();
renderHome();
if (!store.data.tutorialDone) {
  startTutorial(0);
} else {
  showView('home');
}

if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/localhost|127\.0\.0\.1/.test(location.hostname)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Debug hook for automated tests (harmless in production).
window.__marbl = { get game() { return game; }, move, undo, restart, rewind, hint, shareText, store, startLevel, openMap, openShop, renderHome, setPendingUnlock: (n) => (pendingUnlock = n) };
