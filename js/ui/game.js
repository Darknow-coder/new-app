import { setMusicTheme, sfx, unlockAudio } from '../audio.js';
import { dailyLevel, puzzleNumber } from '../daily.js';
import { save, store } from '../storage.js';
import { t } from '../i18n.js';
import { WORLD_HUES, adventureLevel, introAt, isBoss, worldOf, bossShape } from '../levels.js';
import { DIRS, comboReachable, isDead, isSolved, solve, stateKey, tilt } from '../engine.js';
import { TUTORIAL } from '../tutorial.js';
import { buildScenery, burst, reducedMotion, replay } from '../fx.js';
import { equipped } from '../skins.js';
import { track } from '../progress.js';
import { $, S, announce, buzz, els, openModal, showView, toast, worldHue, worldName } from './core.js';
import { onSolved } from './result.js';
import { handleProgress } from './common.js';
import { openShop } from './shop.js';

export function startDaily(diff) {
  sfx.tap();
  const level = dailyLevel(S.today, diff);
  const entry = store.dailyEntry(S.today, diff);
  const review = !!entry?.done;
  startGame({
    mode: 'daily',
    diff,
    day: S.today,
    review,
    level,
    title: `${t(diff)} · #${puzzleNumber(S.today)}`,
    sub: review ? t('solvedIn', { m: entry.moves }) : '',
    restore: !review && entry ? entry : null,
  });
}

export function startChallenge(n, target) {
  const level = adventureLevel(n);
  startGame({
    mode: 'challenge',
    n,
    target,
    level,
    title: t('chTitle'),
    sub: t('level', { n }),
    tip: t('chTip', { c: target }),
  });
}

export async function challengeImage(n, moves, stars) {
  const lvl = adventureLevel(n);
  const S = 720;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = 900;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 900);
  g.addColorStop(0, '#2a3070');
  g.addColorStop(1, '#11142b');
  x.fillStyle = g;
  x.fillRect(0, 0, S, 900);
  const font = (w, px) => `${w} ${px}px Fredoka, system-ui, sans-serif`;
  x.textAlign = 'center';
  x.fillStyle = '#fff';
  x.font = font(700, 64);
  x.fillText('marbl', S / 2, 90);
  x.font = font(600, 34);
  x.fillStyle = '#ffc23d';
  x.fillText(`${t('level', { n })} · ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, S / 2, 140);
  // board
  const pad = 70;
  const size = S - pad * 2;
  const cell = size / lvl.w;
  const top = 175;
  x.fillStyle = '#262b5c';
  x.beginPath();
  x.roundRect(pad - 16, top - 16, size + 32, cell * lvl.h + 32, 28);
  x.fill();
  const cols = ['#ff5d73', '#1fd1b9', '#ffc23d', '#9a7bff'];
  for (let i = 0; i < lvl.w * lvl.h; i++) {
    const cx = pad + (i % lvl.w) * cell;
    const cy = top + Math.floor(i / lvl.w) * cell;
    x.fillStyle = (i % lvl.w + Math.floor(i / lvl.w)) % 2 ? '#2d336b' : '#2a3065';
    x.fillRect(cx, cy, cell, cell);
    if (lvl.walls[i]) {
      x.fillStyle = '#4a5294';
      x.beginPath();
      x.roundRect(cx + 4, cy + 4, cell - 8, cell - 8, 10);
      x.fill();
    } else if (lvl.holes[i] >= 0) {
      x.fillStyle = '#05060f';
      x.strokeStyle = cols[lvl.holes[i]];
      x.lineWidth = 6;
      x.beginPath();
      x.arc(cx + cell / 2, cy + cell / 2, cell * 0.32, 0, 7);
      x.fill();
      x.stroke();
    }
  }
  lvl.pieces.forEach((p, i) => {
    const at = lvl.start[i];
    const cx = pad + (at % lvl.w) * cell + cell / 2;
    const cy = top + Math.floor(at / lvl.w) * cell + cell / 2;
    x.fillStyle = p.kind === 'stone' ? '#9ea3c2' : cols[p.color];
    x.beginPath();
    if (p.kind === 'stone') x.roundRect(cx - cell * 0.38, cy - cell * 0.38, cell * 0.76, cell * 0.76, 12);
    else x.arc(cx, cy, cell * 0.38, 0, 7);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,.7)';
    x.beginPath();
    x.arc(cx - cell * 0.12, cy - cell * 0.14, cell * 0.08, 0, 7);
    x.fill();
  });
  const by = top + cell * lvl.h + 80;
  x.fillStyle = '#fff';
  x.font = font(700, 46);
  x.fillText(t('chImgScore', { m: moves }), S / 2, by);
  x.fillStyle = '#a4a7cf';
  x.font = font(600, 32);
  x.fillText(t('chImgCta'), S / 2, by + 50);
  return new Promise((r) => c.toBlob(r, 'image/png'));
}

export async function shareChallenge(n, moves, stars) {
  const url = `${location.origin}${location.pathname.replace(/index\.html$/, '')}?defi=${n}&c=${moves}`;
  const text = t('chShareText', { n, m: moves });
  try {
    const blob = await challengeImage(n, moves, stars);
    const file = new File([blob], `marbl-${n}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ files: [file], text: `${text}\n${url}` });
      return;
    }
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ text, url });
      return;
    }
  } catch (e) {
    if (e?.name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast(t('chCopied'));
  } catch {
    toast(url);
  }
}

export function startLevel(n) {
  sfx.tap();
  const level = adventureLevel(n);
  const mech = introAt(n);
  const best = store.levelStars(n);
  const world = worldName(worldOf(n));
  startGame({
    mode: 'level',
    n,
    level,
    title: t('level', { n }),
    sub: isBoss(n) ? `BOSS · ${t(`bossName_${bossShape(n)}`)}` : best ? `${world} · ${starsText(best)}` : world,
    tip: mech ? t(`mech_${mech}_desc`) : null,
  });
  if (mech && !store.data.seenMech[mech]) setTimeout(() => showMechanic(mech), 500);
  // Let curious players know a combo is hiding in this level.
  setTimeout(() => {
    if (S.game?.level === level && comboReachable(level)) {
      const sub = $('#game-sub');
      sub.innerHTML = `${sub.textContent} <span class="combo-chip">✨ ${t('comboPossible')}</span>`;
    }
  }, 900);
}

export function showMechanic(mech) {
  store.data.seenMech[mech] = true;
  save();
  $('#mech-title').textContent = t(`mech_${mech}_title`);
  $('#mech-desc').textContent = t(`mech_${mech}_desc`);
  $('#mech-art').innerHTML = `<div class="mech-demo mech-${mech}"><i class="t1"></i><i class="t2"></i><i class="ball c1"></i></div>`;
  sfx.epic();
  openModal('modal-mech');
}

export function startTutorial(i = 0) {
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

export function starsText(n) {
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

export function startGame(opts) {
  S.game = {
    ...opts,
    state: opts.level.start.slice(),
    history: [],
    path: [],
    moves: 0,
    hintUsed: false,
    done: false,
    drops: 0,
  };
  if (opts.restore) {
    for (const d of opts.restore.path || []) {
      S.game.history.push(S.game.state);
      S.game.state = tilt(S.game.level, S.game.state, d).state;
      S.game.path.push(d);
    }
    S.game.moves = opts.restore.moves || 0;
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
  S.animating = false;
  S.queued = null;
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

export function cellXY(c) {
  return { x: c % S.game.level.w, y: Math.floor(c / S.game.level.w) };
}

export function setPos(el, c) {
  const { x, y } = cellXY(c);
  el.style.setProperty('--x', x);
  el.style.setProperty('--y', y);
}

export function buildBoard() {
  const { level } = S.game;
  els.board.className = els.board.className.replace(/\bskin-\S+/g, '').trim();
  els.board.classList.add(`skin-${equipped()}`);
  els.board.classList.toggle('shaped', !!level.outside);
  els.board.style.setProperty('--w', level.w);
  els.board.style.setProperty('--h', level.h);
  els.layer.innerHTML = '';
  els.hintArrow.hidden = true;
  S.game.holeEls = new Map();
  S.game.pieceEls = [];

  const frag = document.createDocumentFragment();
  const edges = [];
  const tiles = [];
  for (let c = 0; c < level.w * level.h; c++) {
    if (level.outside && !level.outside[c]) {
      // Shaped board: each playable cell gets its own tile so the board follows the silhouette.
      // Outlines go in one layer and floors in another drawn above, so borders never cross tiles.
      const xy = cellXY(c);
      const edge = document.createElement('div');
      edge.className = 'cell tile-edge';
      setPos(edge, c);
      edges.push(edge);
      const tile = document.createElement('div');
      tile.className = `cell tile ${(xy.x + xy.y) % 2 ? 'odd' : ''}`;
      setPos(tile, c);
      tiles.push(tile);
    }
    if (level.outside?.[c]) {
      continue;
    } else if (level.pits?.[c]) {
      const pit = document.createElement('div');
      pit.className = 'cell pit';
      setPos(pit, c);
      frag.appendChild(pit);
    } else if (level.walls[c]) {
      const w = document.createElement('div');
      w.className = 'cell wall';
      setPos(w, c);
      frag.appendChild(w);
    } else if (level.arrows && level.arrows[c] >= 0) {
      const a = document.createElement('div');
      a.className = 'cell arrow';
      a.dataset.c = c;
      a.style.setProperty('--rot', `${level.arrows[c] * 90}deg`);
      setPos(a, c);
      frag.appendChild(a);
    } else if (level.sand?.[c] || (level.portal && level.portal[c] >= 0) || (level.gates && level.gates[c] >= 0)) {
      const t = document.createElement('div');
      if (level.sand?.[c]) t.className = 'cell sand';
      else if (level.portal && level.portal[c] >= 0) t.className = 'cell portal';
      else {
        t.className = `cell gate c${level.gates[c]}`;
        t.innerHTML = `<i class="sym s${level.gates[c]}"></i>`;
      }
      setPos(t, c);
      frag.appendChild(t);
    } else if (level.holes[c] >= 0) {
      const h = document.createElement('div');
      h.className = `cell hole c${level.holes[c]}`;
      h.innerHTML = `<i class="sym s${level.holes[c]}"></i>`;
      setPos(h, c);
      S.game.holeEls.set(level.holes[c], h);
      frag.appendChild(h);
    }
  }
  level.pieces.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'cell piece';
    el.innerHTML = p.kind === 'marble' ? `<div class="ball c${p.color}"></div><i class="sym s${p.color}"></i>` : '<div class="stone"></div>';
    frag.appendChild(el);
    S.game.pieceEls[i] = el;
  });
  frag.prepend(...edges, ...tiles);
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

export function syncPieces(duration) {
  const { level, state } = S.game;
  level.pieces.forEach((p, i) => {
    const el = S.game.pieceEls[i];
    el.style.transition = duration ? `transform ${duration}ms var(--ease-out)` : 'none';
    el.classList.remove('sinking', 'impact-x', 'impact-y');
    if (state[i] === -1) {
      el.classList.add('gone');
      if (p.kind === 'marble') {
        setPos(el, holeCell(p.color));
        S.game.holeEls.get(p.color)?.classList.add('filled');
      }
    } else {
      if (el.classList.contains('gone')) {
        el.classList.remove('gone');
        el.style.transition = 'none';
        el.classList.remove('appear');
        void el.offsetWidth;
        el.classList.add('appear');
        if (p.kind === 'marble') S.game.holeEls.get(p.color)?.classList.remove('filled');
      }
      setPos(el, state[i]);
    }
  });
}

export function holeCell(color) {
  return S.game.level.holes.findIndex((h) => h === color);
}

export function sizeBoard() {
  if (!S.game) return;
  const rect = els.area.getBoundingClientRect();
  const { w, h } = S.game.level;
  const avW = rect.width;
  const avH = rect.height - 12;
  const size = Math.max(160, Math.min(avW / 1.08, (avH / 1.1) * (w / h), 520));
  els.board.style.setProperty('--size', `${Math.floor(size)}px`);
}

new ResizeObserver(sizeBoard).observe(els.area);

export function updateHud(bump = true) {
  els.moves.textContent = S.game.moves;
  if (bump) {
    els.moves.classList.remove('bump');
    void els.moves.offsetWidth;
    els.moves.classList.add('bump');
  }
  els.par.textContent = t('par', { n: S.game.level.par });
  els.counter.classList.toggle('is-over', S.game.moves > S.game.level.par);
  if (bump && S.game.moves === S.game.level.par + 1) replay(els.counter, 'over-shake');
  els.undo.disabled = S.game.done || S.game.history.length === 0;
  els.restart.disabled = S.game.done || S.game.history.length === 0;
  els.hint.disabled = S.game.done;
  // Gentle nudge towards the hint when a level clearly resists.
  els.hint.classList.toggle('nudge', S.game.mode === 'level' && !S.game.done && S.game.moves >= S.game.level.par * 2 + 2);
  els.rewind.disabled = S.game.done || S.game.history.length === 0;
  for (const b of ['hint', 'rewind']) {
    const n = store.booster(b);
    const badge = $(`#${b}-count`);
    badge.textContent = n > 0 ? n : '+';
    badge.classList.toggle('is-empty', n === 0);
  }
}

export function rollMs(dist) {
  return Math.round(95 * Math.sqrt(dist) + 45);
}

export function move(dir) {
  if (!S.game || S.game.done) return;
  if (S.animating) {
    S.queued = dir;
    return;
  }
  unlockAudio();
  const { state: next, moves } = tilt(S.game.level, S.game.state, dir);
  if (stateKey(next) === stateKey(S.game.state)) {
    els.board.classList.remove('shake');
    void els.board.offsetWidth;
    els.board.classList.add('shake');
    sfx.thud();
    buzz(15);
    announce(t('nothingMoved'));
    return;
  }

  els.hintArrow.hidden = true;
  S.game.history.push(S.game.state);
  S.game.path.push(dir);
  S.game.state = next;
  S.game.moves++;
  S.animating = true;
  updateHud();
  persistProgress();
  announce(t('moveAnnounce', { d: t(dir), m: S.game.moves }));

  els.board.dataset.tilt = dir;
  const axis = DIRS[dir].dx ? 'impact-x' : 'impact-y';
  let longest = 0;
  let dropIndex = 0;
  const sunkNow = moves.filter((m) => m && m.sunk);
  const WARP_GAP = 110;
  const moveMs = (m) => {
    const segs = m.segs || [m];
    return segs.reduce((acc, sg, k) => acc + (sg.dist ? rollMs(sg.dist) : 0) + (k > 0 && !segs[k - 1].turn ? WARP_GAP : 0), 0);
  };
  moves.forEach((m, i) => {
    if (!m || m.dist === 0) return;
    const el = S.game.pieceEls[i];
    const ms = moveMs(m);
    longest = Math.max(longest, ms + (m.sunk || m.fell ? 320 : 120));
    el.classList.remove('impact-x', 'impact-y', 'sinking', 'warp');
    // Each straight run is animated separately; between runs the piece warps through a portal.
    const segs = m.segs || [{ from: m.from, to: m.to, dist: m.dist }];
    let t = 0;
    segs.forEach((sg, k) => {
      const segMs = sg.dist ? rollMs(sg.dist) : 0;
      const warp = k > 0 && !segs[k - 1].turn;
      const run = () => {
        if (k > 0 && segs[k - 1].turn) {
          const ar = els.layer.querySelector(`.arrow[data-c="${sg.from}"]`);
          if (ar) replay(ar, 'pulse');
          sfx.tick();
        }
        if (warp) {
          el.style.transition = 'none';
          setPos(el, sg.from);
          void el.offsetWidth;
          replay(el, 'warp');
          els.layer.querySelectorAll('.portal').forEach((p) => replay(p, 'pulse'));
          sfx.warp();
          buzz(12);
        }
        el.style.transition = `transform ${segMs}ms ${k > 0 && segs[k - 1].turn ? 'linear' : 'cubic-bezier(0.45, 0, 0.9, 0.65)'}`;
        setPos(el, sg.to);
        if (sg.dist >= 2 && S.game.level.pieces[i].kind === 'marble') trail(sg, S.game.level.pieces[i].color, dir, segMs);
      };
      if (k === 0) run();
      else setTimeout(run, t + (warp ? WARP_GAP : 0));
      t += segMs + (warp ? WARP_GAP : 0);
    });
    const piece = S.game.level.pieces[i];
    const order = dropIndex;
    setTimeout(() => {
      if (m.fell) {
        el.classList.add('falling');
        sfx.fall();
        buzz([40, 20, 60]);
        setTimeout(() => el.classList.add('gone'), 360);
      } else if (m.sunk) {
        el.classList.add('sinking');
        const hole = S.game.holeEls.get(piece.color);
        hole.classList.remove('pulse');
        void hole.offsetWidth;
        hole.classList.add('pulse', 'filled');
        sparks(m.to, piece.color);
        S.game.drops = (S.game.drops || 0) + 1;
        sfx.drop(order + S.game.drops - 1);
        replay(els.board, 'jolt');
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
  if (sunkNow.length >= 2 && S.game.mode !== 'tutorial') {
    const lastDrop = Math.max(...sunkNow.map(moveMs));
    setTimeout(() => showCombo(sunkNow.length), lastDrop + 80);
  }
  sfx.roll(longestRoll / 1000);
  buzz(8);

  setTimeout(() => {
    delete els.board.dataset.tilt;
  }, Math.min(longestRoll + 60, 360));

  setTimeout(() => {
    S.animating = false;
    if (isDead(S.game.state)) {
      // A marble fell into a pit: the move is lost (still counted) and the board rewinds.
      S.queued = null;
      toast(t('marbleLost'));
      els.board.classList.remove('shake');
      void els.board.offsetWidth;
      els.board.classList.add('shake');
      S.animating = true;
      setTimeout(() => {
        S.game.state = S.game.history.pop();
        S.game.path.pop();
        syncPieces(240);
        updateHud(false);
        persistProgress();
        S.animating = false;
      }, 520);
      return;
    }
    if (isSolved(S.game.level, S.game.state)) {
      onSolved();
    } else if (S.queued) {
      const d = S.queued;
      S.queued = null;
      move(d);
    }
  }, Math.max(longest, 160));
}

export function trail(sg, color, dir, ms) {
  if (reducedMotion()) return;
  const a = cellXY(sg.from);
  const b = cellXY(sg.to);
  const { w, h } = S.game.level;
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

export function showCombo(count) {
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

export function sparks(cell, color) {
  const { x, y } = cellXY(cell);
  const { w, h } = S.game.level;
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

export function undo() {
  if (!S.game || S.game.done || S.animating || !S.game.history.length) return;
  sfx.undo();
  S.game.state = S.game.history.pop();
  S.game.path.pop();
  els.hintArrow.hidden = true;
  syncPieces(180);
  updateHud(false);
  persistProgress();
}

export function restart() {
  if (!S.game || S.game.done || S.animating || !S.game.history.length) return;
  sfx.undo();
  S.game.history = [];
  S.game.path = [];
  S.game.state = S.game.level.start.slice();
  els.hintArrow.hidden = true;
  syncPieces(260);
  updateHud(false);
  persistProgress();
}

export function useBooster(id) {
  if (store.booster(id) > 0) {
    store.booster(id, -1);
    if (S.game) S.game.usedBooster = true;
    return true;
  }
  toast(t('outOf', { b: t(`${id}Name`).toLowerCase() }));
  openShop('boost');
  return false;
}

export function hint() {
  if (!S.game || S.game.done || S.animating || S.game.mode !== 'level') return;
  const key = stateKey(S.game.state);
  if (S.game.hintKey === key && !els.hintArrow.hidden) return; // already showing for this position
  const sol = solve(S.game.level, S.game.state, { maxDepth: 30, maxStates: 400000 });
  if (!sol || !sol.path.length) return;
  if (!useBooster('hint')) return;
  S.game.hintKey = key;
  updateHud(false);
  const rot = { up: 0, right: 90, down: 180, left: 270 }[sol.path[0]];
  els.hintArrow.style.setProperty('--rot', `${rot}deg`);
  els.hintArrow.hidden = false;
  sfx.tap();
}

export function rewind() {
  if (!S.game || S.game.done || S.animating || S.game.mode !== 'level' || !S.game.history.length) return;
  if (!useBooster('rewind')) return;
  sfx.undo();
  S.game.state = S.game.history.pop();
  S.game.path.pop();
  S.game.moves = Math.max(0, S.game.moves - 1);
  els.hintArrow.hidden = true;
  syncPieces(180);
  updateHud(true);
}

export function persistProgress() {
  if (S.game.mode !== 'daily' || S.game.review) return;
  store.setDailyEntry(S.game.day, S.game.diff, { done: false, moves: S.game.moves, path: S.game.path.slice() });
}
