import { tilt, isSolved, solve, starsFor, stateKey, DIRS, comboReachable } from './engine.js';
import { dateKey, puzzleNumber, msUntilTomorrow, dailyLevel, DAILY_ORDER, addDays } from './daily.js';
import { store, computeStats, save } from './storage.js';
import { sfx, haptic, setSoundEnabled, unlockAudio, setMusicEnabled, setMusicTheme } from './audio.js';
import { t, LANG } from './i18n.js';
import { TUTORIAL } from './tutorial.js';
import { burstConfetti } from './confetti.js';
import {
  adventureLevel,
  introAt,
  worldOf,
  isBoss,
  LEVELS_PER_WORLD,
  WORLD_HUES,
  levelReward,
  dailyReward,
  SHOP,
  GIFT_LADDER,
} from './levels.js';
import { buildScenery, iris, countTo, flyIcons, floatText, replay, burst, reducedMotion, stagger, installRipples } from './fx.js';
import { openChest, chestSVG, WORLD_CHESTS, chestId, isOpened, ODDS } from './chests.js';
import { SKINS, hasSkin, equipped, equip, marbleHTML } from './skins.js';
import {
  track,
  xpNeeded,
  quests,
  QUEST_TYPES,
  claimQuest,
  ACHIEVEMENTS,
  claimAchievement,
  achievementsReady,
  takeFromInbox,
  checkAchievements,
} from './progress.js';

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

// What rises in, and in which order, when each screen appears.
const ENTER = {
  home: '.view-home .topbar > *, .player-strip, .hero > *, .adventure-hero, .daily-list > li, .share-row, .countdown, .quests-card, .quest, .meta-tile, .footer-note',
  game: '.game-topbar > *, .tip, .controls > .ctrl',
  map: '.view-map .topbar > *, .world-head',
};

function showView(name) {
  for (const v of ['home', 'game', 'map']) {
    const was = els[v].classList.contains('is-active');
    els[v].classList.toggle('is-active', name === v);
    els[v].inert = name !== v;
    if (name === v && !was) {
      replay(els[v], 'entering');
      clearTimeout(els[v].enterTimer);
      els[v].enterTimer = setTimeout(() => els[v].classList.remove('entering'), 1400);
      stagger(els[v], ENTER[v], { step: v === 'home' ? 40 : 55, base: 60 });
    }
  }
  if (name === 'game') requestAnimationFrame(() => els.board.focus({ preventScroll: true }));
}

// Inside every window, these rise in one after another.
const MODAL_ENTER =
  '.modal-card > :not(.modal-close):not(.result-rays):not(.result-stars):not(.new-best):not(.confetti):not(#result-title):not(.result-reward):not(.mech-art):not(.mech-badge), .help-list > li, .stats-grid > .stat, .week > .day, .toggle, .ach-list > li, .preview-list > li';

function openModal(id) {
  const m = document.getElementById(id);
  clearTimeout(m.closeTimer);
  m.classList.remove('closing');
  if (!m.open) m.showModal();
  stagger(m, MODAL_ENTER, { step: 45, base: 90 });
}

/** Close a dialog with an exit animation (cards shrink away, backdrop fades). */
function closeModal(id, instant = false) {
  const m = typeof id === 'string' ? document.getElementById(id) : id;
  if (!m.open || m.classList.contains('closing')) return;
  if (instant || reducedMotion()) {
    m.close();
    return;
  }
  m.classList.add('closing');
  m.closeTimer = setTimeout(() => {
    m.classList.remove('closing');
    m.close();
  }, 210);
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

/* ---------- progression glue ---------- */
async function openChestFlow(opts) {
  const reward = await openChest(opts);
  if (reward) handleProgress(track('chestOpened'));
  return reward;
}

/** Show notifications produced by progress.track / claims. */
function handleProgress(res) {
  if (!res) return;
  for (const n of res.notes || []) {
    if (n.kind === 'quest') {
      notify('i-flag', t('questDone'), t(`quest_${n.id}`, { n: n.target }));
    } else if (n.kind === 'achievement') {
      notify('i-star', t('achUnlocked'), t(`ach_${n.id}`));
    }
  }
  for (const lvl of res.ups || []) notify('i-gift', t('levelUpTitle'), t('levelUpSub', { n: lvl }), 'levelup');
  if (els.home.classList.contains('is-active')) renderHome();
}

const notifQueue = [];
let notifBusy = false;
function notify(icon, title, sub, kind = '') {
  notifQueue.push({ icon, title, sub, kind });
  if (!notifBusy) nextNotif();
}
function nextNotif() {
  const n = notifQueue.shift();
  const el = $('#notif');
  if (!n) {
    notifBusy = false;
    return;
  }
  notifBusy = true;
  $('#notif-icon').innerHTML = `<svg><use href="#${n.icon}"/></svg>`;
  $('#notif-title').textContent = n.title;
  $('#notif-sub').textContent = n.sub;
  el.className = `notif ${n.kind}`;
  // Popovers live in the top layer, so the banner shows even above an open dialog.
  try {
    if (el.matches(':popover-open')) el.hidePopover();
    el.showPopover();
  } catch {
    /* no popover support: plain fixed banner */
  }
  replay(el, 'show');
  if (n.kind === 'levelup') sfx.upgrade();
  else sfx.star(2);
  buzz([15, 25, 15]);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(nextNotif, 350);
  }, 2400);
}

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
  return openChestFlow({ id: `d-${day}`, tier: dailyChestTier(day), title: t('dailyChest') }).then(() => {
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
  setMusicTheme('home');
  renderPlayerStrip();
  renderQuests();
  checkAchievements();
  const achReady = achievementsReady();
  const achDone = ACHIEVEMENTS.filter((a) => store.data.ach[a.id]).length;
  $('#ach-desc').textContent = achReady ? t('achToClaim', { n: achReady }) : t('achDesc', { n: achDone, t: ACHIEVEMENTS.length });
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
  if (!dChip.hidden) $('#daily-chest-mini').innerHTML = chestSVG(dailyChestTier(today));
  const ready = readyChests().length;
  const advChests = $('#adv-chests');
  advChests.hidden = !ready;
  advChests.textContent = t('chestsReady', { n: ready });
  const ownedSkins = SKINS.filter((sk) => hasSkin(sk.id));
  $('#collection-desc').textContent = t('collectionDesc', { n: ownedSkins.length, t: SKINS.length });
  $('#collection-balls').innerHTML = ownedSkins
    .slice(-3)
    .map((sk, i) => marbleHTML(sk.id, [1, 2, 0][i]))
    .join('');
  const giftChip = $('#gift-chip');
  giftChip.hidden = store.data.giftDay === today;
  const g = giftToday();
  $('#gift-text').textContent =
    g.reward === 'chest' ? t('giftDayChest', { d: g.day }) : t('giftDay', { d: g.day, n: g.reward });
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
  const mech = introAt(n);
  const best = store.levelStars(n);
  const world = t(`world${worldOf(n) % WORLD_HUES.length}`);
  startGame({
    mode: 'level',
    n,
    level,
    title: t('level', { n }),
    sub: isBoss(n) ? `${t('boss')} · ${world}` : best ? `${world} · ${starsText(best)}` : world,
    tip: mech ? t(`mech_${mech}_desc`) : null,
  });
  if (mech && !store.data.seenMech[mech]) setTimeout(() => showMechanic(mech), 500);
  // Let curious players know a combo is hiding in this level.
  setTimeout(() => {
    if (game?.level === level && comboReachable(level)) {
      const sub = $('#game-sub');
      sub.innerHTML = `${sub.textContent} <span class="combo-chip">✨ ${t('comboPossible')}</span>`;
    }
  }, 900);
}

/** "New!" card the first time a mechanic appears. */
function showMechanic(mech) {
  store.data.seenMech[mech] = true;
  save();
  $('#mech-title').textContent = t(`mech_${mech}_title`);
  $('#mech-desc').textContent = t(`mech_${mech}_desc`);
  $('#mech-art').innerHTML = `<div class="mech-demo mech-${mech}"><i class="t1"></i><i class="t2"></i><i class="ball c1"></i></div>`;
  sfx.epic();
  openModal('modal-mech');
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
    els.tip.classList.toggle('is-new', opts.mode === 'level');
    els.tip.hidden = false;
  } else {
    els.tip.hidden = true;
  }
  els.hint.hidden = opts.mode !== 'level';
  els.rewind.hidden = opts.mode !== 'level';
  els.restart.hidden = opts.mode === 'tutorial' && opts.tut === 0;
  animating = false;
  queued = null;
  if (opts.mode === 'level') {
    buildScenery($('#scenery-game'), worldOf(opts.n) % WORLD_HUES.length, worldHue(opts.n));
    setMusicTheme(worldOf(opts.n) % WORLD_HUES.length);
  } else {
    buildScenery($('#scenery-game'), 'daily');
    setMusicTheme('daily');
  }
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
  els.board.className = els.board.className.replace(/\bskin-\S+/g, '').trim();
  els.board.classList.add(`skin-${equipped()}`);
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
    } else if (level.sand?.[c] || (level.portal && level.portal[c] >= 0) || (level.gates && level.gates[c] >= 0)) {
      const t = document.createElement('div');
      if (level.sand?.[c]) t.className = 'cell sand';
      else if (level.portal && level.portal[c] >= 0) t.className = 'cell portal';
      else t.className = `cell gate c${level.gates[c]}`;
      setPos(t, c);
      frag.appendChild(t);
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
  if (bump && game.moves === game.level.par + 1) replay(els.counter, 'over-shake');
  els.undo.disabled = game.done || game.history.length === 0;
  els.restart.disabled = game.done || game.history.length === 0;
  els.hint.disabled = game.done;
  // Gentle nudge towards the hint when a level clearly resists.
  els.hint.classList.toggle('nudge', game.mode === 'level' && !game.done && game.moves >= game.level.par * 2 + 2);
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
  const sunkNow = moves.filter((m) => m && m.sunk);
  const WARP_GAP = 110;
  const moveMs = (m) => {
    const segs = m.segs || [m];
    return segs.reduce((acc, sg, k) => acc + (sg.dist ? rollMs(sg.dist) : 0) + (k > 0 ? WARP_GAP : 0), 0);
  };
  moves.forEach((m, i) => {
    if (!m || m.dist === 0) return;
    const el = game.pieceEls[i];
    const ms = moveMs(m);
    longest = Math.max(longest, ms + (m.sunk ? 300 : 120));
    el.classList.remove('impact-x', 'impact-y', 'sinking', 'warp');
    // Each straight run is animated separately; between runs the piece warps through a portal.
    const segs = m.segs || [{ from: m.from, to: m.to, dist: m.dist }];
    let t = 0;
    segs.forEach((sg, k) => {
      const segMs = sg.dist ? rollMs(sg.dist) : 0;
      const run = () => {
        if (k > 0) {
          el.style.transition = 'none';
          setPos(el, sg.from);
          void el.offsetWidth;
          replay(el, 'warp');
          els.layer.querySelectorAll('.portal').forEach((p) => replay(p, 'pulse'));
          sfx.warp();
          buzz(12);
        }
        el.style.transition = `transform ${segMs}ms cubic-bezier(0.45, 0, 0.9, 0.65)`;
        setPos(el, sg.to);
        if (sg.dist >= 2 && game.level.pieces[i].kind === 'marble') trail(sg, game.level.pieces[i].color, dir, segMs);
      };
      if (k === 0) run();
      else setTimeout(run, t + WARP_GAP);
      t += segMs + (k > 0 ? WARP_GAP : 0);
    });
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
  const longestRoll = Math.max(...moves.filter((m) => m && m.dist).map(moveMs));
  if (sunkNow.length >= 2 && game.mode !== 'tutorial') {
    const lastDrop = Math.max(...sunkNow.map(moveMs));
    setTimeout(() => showCombo(sunkNow.length), lastDrop + 80);
  }
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

/** A coloured streak that grows behind a rolling marble, then fades. */
function trail(sg, color, dir, ms) {
  if (reducedMotion()) return;
  const a = cellXY(sg.from);
  const b = cellXY(sg.to);
  const { w, h } = game.level;
  const tr = document.createElement('i');
  tr.className = `trail c${color} trail-${dir}`;
  tr.style.left = `${(Math.min(a.x, b.x) / w) * 100}%`;
  tr.style.top = `${(Math.min(a.y, b.y) / h) * 100}%`;
  tr.style.width = `${((Math.abs(a.x - b.x) + 1) / w) * 100}%`;
  tr.style.height = `${((Math.abs(a.y - b.y) + 1) / h) * 100}%`;
  tr.style.setProperty('--ms', `${ms}ms`);
  els.layer.appendChild(tr);
  setTimeout(() => tr.remove(), ms + 520);
}

/** "DOUBLE!" / "TRIPLE!" when several marbles drop in the same tilt. */
function showCombo(count) {
  const bonus = count >= 3 ? 25 : 10;
  store.addCoins(bonus);
  const el = $('#combo');
  el.querySelector('strong').textContent = t(count >= 3 ? 'comboTriple' : 'comboDouble');
  el.querySelector('small').textContent = `+${bonus}`;
  replay(el, 'show');
  replay(els.board, 'combo-hit');
  sfx.combo(count);
  buzz([20, 30, 20, 30, 40]);
  burst(els.layer, 50, 50, { count: 24, colors: ['var(--c0)', 'var(--c1)', 'var(--c2)', 'var(--c3)', '#fff'], dist: 160 });
  handleProgress(track('combo', { count }));
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
    if (game) game.usedBooster = true;
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
  game.xpBefore = { ...store.data.player };
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
    game.prog = track('dailyWin', { stars });
  } else if (game.mode === 'level') {
    const prev = store.recordLevel(game.n, stars);
    game.newBest = prev > 0 && stars > prev;
    if (prev === 0 && store.data.levels.unlocked === game.n + 1) pendingUnlock = game.n + 1;
    game.reward = levelReward(prev, stars);
    if (game.reward) store.addCoins(game.reward);
    game.prog = track('levelWin', { stars, first: prev === 0, newStars: Math.max(0, stars - prev), usedBooster: !!game.usedBooster });
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
    actions: [
      {
        label: t('letsGo'),
        primary: true,
        onClick: () => iris(() => startLevel(store.data.levels.unlocked), worldHue(store.data.levels.unlocked)),
      },
    ],
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

function showResultXP() {
  const box = $('#result-xp');
  const prog = game?.prog;
  box.hidden = !prog || !prog.xp;
  if (box.hidden) return;
  const before = game.xpBefore;
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

function showResultCard({ stars, title, line, sub, actions, reward = 0 }) {
  showResultXP();
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
      nodes += `<button class="node is-${state} ${isBoss(n) ? 'is-boss' : ''}" data-n="${n}" style="left:${x}%;top:${y}px;--i:${i}" aria-label="${t('level', { n })}${stars ? `, ${stars}/3` : ''}">${inner}${starRow}${isBoss(n) ? '<em>BOSS</em>' : introAt(n) ? `<em class="em-new">${t('newShort')}</em>` : ''}</button>`;
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
  setMusicTheme(w % WORLD_HUES.length);
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
    if (chest.classList.contains('is-opened')) {
      replay(chest, 'deny');
      return;
    }
    sfx.tap();
    showChestPreview(chest.dataset.chest, chest.dataset.tier, Number(chest.dataset.need));
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
   Player level, quests, achievements
   ========================================================================== */
function renderPlayerStrip() {
  const pl = store.data.player;
  $('#player-level').textContent = pl.level;
  $('#player-title').textContent = t('playerLevel', { n: pl.level });
  $('#player-xp').textContent = `${pl.xp}/${xpNeeded(pl.level)} XP`;
  const pct = (pl.xp / xpNeeded(pl.level)) * 100;
  $('#xp-fill').style.width = `${pct}%`;
  $('#player-badge').style.setProperty('--p', `${pct}%`);
}

function renderQuests() {
  const q = quests(today);
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

function renderAchievements() {
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

const openAchievements = () => {
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
    shownCoins = null;
    renderHome();
  });
});

/* ==========================================================================
   Chest preview & collection
   ========================================================================== */
function openMapChest(id, tier) {
  return openChestFlow({ id, tier }).then(() => {
    const sc = $('#map-scroll');
    const top = sc.scrollTop;
    shownCoins = null;
    renderMap();
    sc.scrollTop = top;
  });
}

function showChestPreview(id, tier, need) {
  const w = Number(id.slice(1, id.indexOf('-')));
  const have = worldStars(w);
  const ready = have >= need && !isOpened(id);
  const o = ODDS[tier];
  $('#preview-chest').innerHTML = chestSVG(tier);
  $('#preview-chest').dataset.tier = tier;
  $('#preview-title').textContent = t(`chest_${tier}`);
  $('#preview-bar').style.width = `${Math.min(100, (have / need) * 100)}%`;
  $('#preview-count').innerHTML = `${Math.min(have, need)}/${need} <svg><use href="#i-star"/></svg>`;
  const rar = o.rarities.map((r) => t(`rarity_${r}`).toLowerCase()).join(' / ');
  const lines = [
    ['i-coin', t('oddsCoins', { a: o.coins[0], b: o.coins[1] })],
    ['i-hint', t('oddsBoosters', { n: o.boosters })],
    ['i-star', t('oddsSkin', { p: Math.round(o.skin * 100), r: rar })],
  ];
  if (tier !== 'gold') lines.push(['i-flame', t('oddsUpgrade')]);
  $('#preview-list').innerHTML = lines.map(([ic, txt]) => `<li><svg><use href="#${ic}"/></svg><span>${txt}</span></li>`).join('');
  const btn = $('#preview-action');
  btn.textContent = ready ? t('openChest') : t('needStars', { n: need - have });
  btn.classList.toggle('btn-primary', ready);
  btn.classList.toggle('btn-ghost', !ready);
  btn.onclick = () => {
    closeModal('modal-chest-preview');
    if (ready) openMapChest(id, tier);
  };
  openModal('modal-chest-preview');
}

function renderCollection() {
  const eq = equipped();
  $('#skin-grid').innerHTML = SKINS.map((sk, i) => {
    const own = hasSkin(sk.id);
    return `
      <button class="skin-tile r-${sk.rarity} ${own ? '' : 'is-locked'} ${sk.id === eq ? 'is-equipped' : ''}" data-skin="${sk.id}" style="--i:${i}">
        ${marbleHTML(own ? sk.id : 'classic', i % 4, own ? '' : 'silhouette')}
        <strong>${own ? t(`skin_${sk.id}`) : '???'}</strong>
        <small>${own ? (sk.id === eq ? `✓ ${t('equipped')}` : t('equip')) : t('lockedSkin')}</small>
        <em>${t(`rarity_${sk.rarity}`)}</em>
      </button>`;
  }).join('');
}

$('#skin-grid').addEventListener('click', (e) => {
  const tile = e.target.closest('.skin-tile');
  if (!tile) return;
  if (tile.classList.contains('is-locked')) {
    replay(tile, 'deny');
    sfx.thud();
    return;
  }
  if (equip(tile.dataset.skin)) {
    sfx.pop(2);
    buzz(15);
    renderCollection();
    replay($(`.skin-tile[data-skin="${tile.dataset.skin}"]`), 'got');
    renderHome();
  }
});

$('#btn-collection').addEventListener('click', () => {
  sfx.tap();
  renderCollection();
  openModal('modal-collection');
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

/** Which step of the 7-day gift ladder today's visit is on (resets after a missed day). */
function giftToday() {
  const last = store.data.giftDay;
  const prevCount = store.data.giftCount || 0;
  const continues = last && addDays(last, 1) === today;
  const count = last === today ? prevCount : continues ? prevCount + 1 : 1;
  const idx = (count - 1) % GIFT_LADDER.length;
  return { count, day: idx + 1, reward: GIFT_LADDER[idx] };
}

$('#gift-chip').addEventListener('click', () => {
  if (store.data.giftDay === today) return;
  const g = giftToday();
  store.data.giftDay = today;
  store.data.giftCount = g.count;
  const chip = $('#gift-chip');
  if (g.reward === 'chest') {
    save();
    chip.hidden = true;
    openChestFlow({ id: `gift-${today}`, tier: 'silver', title: t('giftDayChest', { d: g.day }) }).then(() => renderHome());
    return;
  }
  store.addCoins(g.reward);
  sfx.coin();
  buzz([20, 30, 20]);
  toast(t('giftToast', { n: g.reward }));
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
    .map(([v, k]) => `<div class="stat"><b data-v="${v}">0</b><small>${t(k)}</small></div>`)
    .join('');
  setTimeout(() => {
    document.querySelectorAll('#stats-grid b').forEach((b, i) => setTimeout(() => countTo(b, 0, Number(b.dataset.v), 700), i * 60));
  }, 150);
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
    if (e.target === d && d.id !== 'modal-result') closeModal(d);
  });
  d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeModal(d)));
  if (d.id !== 'modal-result' && d.id !== 'modal-chest') {
    d.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeModal(d);
    });
  }
});
// Escape on the result dialog behaves like "Home" so the player never ends up on a dead board.
$('#modal-result').addEventListener('cancel', (e) => {
  e.preventDefault();
  exitGame();
});

const musicBox = $('#set-music');
musicBox.checked = store.data.settings2.music;
setMusicEnabled(musicBox.checked && store.setting('sound'));
musicBox.addEventListener('change', () => {
  store.data.settings2.music = musicBox.checked;
  save();
  unlockAudio();
  setMusicEnabled(musicBox.checked && store.setting('sound'));
});
// Any first tap anywhere unlocks audio (and starts the music if enabled).
window.addEventListener('pointerdown', () => unlockAudio(), { once: true });

const soundBox = $('#set-sound');
const hapticBox = $('#set-haptics');
soundBox.checked = store.setting('sound');
hapticBox.checked = store.setting('haptics');
setSoundEnabled(soundBox.checked);
soundBox.addEventListener('change', () => {
  store.setting('sound', soundBox.checked);
  setSoundEnabled(soundBox.checked);
  setMusicEnabled(soundBox.checked && store.data.settings2.music);
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
installRipples();
renderHome();
// Cold-start splash: marbles drop in, then it lifts away.
const splash = $('#splash');
if (splash) {
  if (reducedMotion()) splash.remove();
  else {
    const hold = store.data.tutorialDone ? 900 : 1250;
    setTimeout(() => splash.classList.add('out'), hold);
    setTimeout(() => splash.remove(), hold + 600);
  }
}
if (!store.data.tutorialDone) {
  startTutorial(0);
} else {
  showView('home');
}

if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/localhost|127\.0\.0\.1/.test(location.hostname)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Debug hook for automated tests (harmless in production).
window.__marbl = { track, handleProgress, notify, quests, get game() { return game; }, move, undo, restart, rewind, hint, shareText, store, startLevel, openMap, openShop, renderHome, openChest, setPendingUnlock: (n) => (pendingUnlock = n) };
