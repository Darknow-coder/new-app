import { tilt, isSolved, solve, generate, endlessParams, starsFor, stateKey, DIRS } from './engine.js';
import { dateKey, puzzleNumber, msUntilTomorrow, dailyLevel, DAILY_ORDER, addDays } from './daily.js';
import { store, computeStats, save } from './storage.js';
import { sfx, haptic, setSoundEnabled, unlockAudio } from './audio.js';
import { t, LANG } from './i18n.js';
import { TUTORIAL } from './tutorial.js';
import { burstConfetti } from './confetti.js';

const $ = (sel) => document.querySelector(sel);
const DIFF_EMOJI = { easy: '🟢', medium: '🟡', hard: '🔴' };
const DIFF_TONE = { easy: 'c1', medium: 'c2', hard: 'c0' };

const els = {
  home: $('#view-home'),
  game: $('#view-game'),
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
  els.home.classList.toggle('is-active', name === 'home');
  els.game.classList.toggle('is-active', name === 'game');
  els.home.inert = name !== 'home';
  els.game.inert = name !== 'game';
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
    li.querySelector('button').addEventListener('click', () => startDaily(diff));
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
  const lvl = store.data.endless.level;
  $('#endless-desc').textContent = t('endlessDesc', { n: lvl, s: stats.endlessStars });
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

function startEndless(n = store.data.endless.level) {
  sfx.tap();
  const level = generate(`marbl:endless:${n}`, endlessParams(n));
  const best = store.data.endless.best[n] || 0;
  startGame({ mode: 'endless', n, level, title: t('level', { n }), sub: best ? starsText(best) : t('endless') });
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
  els.hint.hidden = opts.mode !== 'endless';
  els.restart.hidden = opts.mode === 'tutorial' && opts.tut === 0;
  animating = false;
  queued = null;
  buildBoard();
  updateHud(false);
  showView('game');
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
  syncPieces(0);
  sizeBoard();
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

function hint() {
  if (!game || game.done || animating || game.mode !== 'endless') return;
  const sol = solve(game.level, game.state, { maxDepth: 30, maxStates: 400000 });
  if (!sol || !sol.path.length) return;
  if (!game.hintUsed) {
    game.hintUsed = true;
    toast(t('hintUsed'));
  }
  const rot = { up: 0, right: 90, down: 180, left: 270 }[sol.path[0]];
  els.hintArrow.style.setProperty('--rot', `${rot}deg`);
  els.hintArrow.hidden = false;
  sfx.tap();
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
  let stars = starsFor(game.moves, game.level.par);
  if (game.hintUsed) stars = Math.min(stars, 2);
  game.stars = stars;
  buzz([20, 40, 20, 40, 60]);

  if (game.mode === 'daily' && !game.review) {
    store.setDailyEntry(game.day, game.diff, {
      done: true,
      moves: game.moves,
      stars,
      par: game.level.par,
      path: game.path.slice(),
    });
  } else if (game.mode === 'endless') {
    const e = store.data.endless;
    e.best[game.n] = Math.max(e.best[game.n] || 0, stars);
    if (game.n >= e.level) e.level = game.n + 1;
    save();
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
      actions.push({ label: t('nextPuzzle'), primary: true, onClick: () => startDaily(nextDiff) });
    } else {
      if (store.dayComplete(game.day)) {
        sub = `${t('allDone')} ${t('allDoneSub')}`;
      }
      actions.push({ label: t('home'), onClick: goHome });
      actions.push({ label: t('share'), primary: true, icon: 'i-share', onClick: shareDay, keepOpen: true });
    }
  } else if (game.mode === 'endless') {
    if (stars < 3) actions.push({ label: t('retry'), onClick: () => startEndless(game.n) });
    else actions.push({ label: t('home'), onClick: goHome });
    actions.push({ label: t('nextLevel'), primary: true, onClick: () => startEndless(game.n + 1) });
  }
  showResultCard({ stars, title, line, sub, actions });
}

function showResultCard({ stars, title, line, sub, actions }) {
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
    b.className = `btn ${a.primary ? 'btn-primary' : 'btn-ghost'}`;
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
    [s.endlessLevel, 'statEndless'],
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
    goHome();
  }
});

els.undo.addEventListener('click', undo);
els.restart.addEventListener('click', restart);
els.hint.addEventListener('click', hint);
$('#btn-back').addEventListener('click', () => {
  sfx.tap();
  goHome();
});
$('#btn-endless').addEventListener('click', () => startEndless());
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
  goHome();

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
window.__marbl = { get game() { return game; }, move, undo, restart, shareText, store };
