// Level editor: paint a board, the solver checks it live (in a worker), then test or share it by link.
import { parseLevel, solve } from '../engine.js';
import { store, save } from '../storage.js';
import { sfx } from '../audio.js';
import { t } from '../i18n.js';
import { iris, replay } from '../fx.js';
import { $, S, buzz, els, openModal, closeModal, showView, toast } from './core.js';
import { startGame } from './game.js';
import { shareBase } from '../site.js';

const SIZES = [5, 6, 7];
const TOOLS = ['floor', 'wall', 'pit', 'sand', 'void', 'stone', 'marble', 'hole', 'gate', 'portal', 'arrow'];
const COLOR_TOOLS = new Set(['marble', 'hole', 'gate']);
const ARROWS = ['^', '>', ',', '<'];
const CHAR = { floor: '.', wall: '#', pit: 'O', sand: '~', void: '_', stone: 'S', portal: '@' };

const ed = {
  size: 6,
  cells: [],
  tool: 'wall',
  color: 0,
  par: null,
  solution: null,
  state: 'empty', // empty | invalid | solving | ok | impossible | complex
  msg: '',
  reqId: 0,
};

/* ---------- solver worker (with a synchronous fallback) ---------- */
let worker = null;
try {
  worker = new Worker(new URL('../solver-worker.js', import.meta.url), { type: 'module' });
} catch {
  worker = null;
}
const pending = new Map();
if (worker) {
  worker.onmessage = (e) => {
    const cb = pending.get(e.data.id);
    pending.delete(e.data.id);
    cb?.(e.data);
  };
}
/** Solve level rows off the main thread. Resolves { par, solution, capped } or { error }. */
export function solveRows(rows) {
  return new Promise((resolve) => {
    const id = ++ed.reqId;
    if (worker) {
      pending.set(id, resolve);
      worker.postMessage({ id, rows });
      return;
    }
    setTimeout(() => {
      try {
        const level = parseLevel(rows, { par: 0, solution: [] });
        const info = {};
        const sol = solve(level, level.start, { maxDepth: 30, maxStates: 150000, info });
        resolve({ id, par: sol ? sol.par : null, solution: sol ? sol.path : null, capped: !!info.capped });
      } catch (err) {
        resolve({ id, error: String(err.message || err) });
      }
    }, 0);
  });
}

/* ---------- model ---------- */
const rows = () => Array.from({ length: ed.size }, (_, y) => ed.cells.slice(y * ed.size, y * ed.size + ed.size).join(''));

function reset(size = ed.size) {
  ed.size = size;
  ed.cells = new Array(size * size).fill('.');
  // A tiny starter so the screen never looks empty.
  ed.cells[0] = 'A';
  ed.cells[size * size - 1] = 'a';
}

function loadRows(r) {
  ed.size = r.length;
  ed.cells = r.join('').split('');
}

function persistDraft() {
  store.data.edDraft = rows();
  save();
}

function paint(i, first) {
  const cur = ed.cells[i];
  let ch;
  if (ed.tool === 'arrow') {
    ch = ARROWS.includes(cur) && first ? ARROWS[(ARROWS.indexOf(cur) + 1) % 4] : ARROWS.includes(cur) ? cur : '^';
  } else if (ed.tool === 'marble') ch = String.fromCharCode(65 + ed.color);
  else if (ed.tool === 'hole') ch = String.fromCharCode(97 + ed.color);
  else if (ed.tool === 'gate') ch = String.fromCharCode(118 + ed.color);
  else ch = CHAR[ed.tool];
  if (ch === cur) return false;
  // One marble and one hole per colour; portals come in pairs (a third replaces the oldest).
  if (/[A-Da-d]/.test(ch)) ed.cells = ed.cells.map((c, k) => (c === ch && k !== i ? '.' : c));
  if (ch === '@') {
    const others = ed.cells.map((c, k) => (c === '@' && k !== i ? k : -1)).filter((k) => k >= 0);
    if (others.length >= 2) ed.cells[others[0]] = '.';
  }
  ed.cells[i] = ch;
  return true;
}

/* ---------- validation ---------- */
let checkTimer = 0;
function validate() {
  const c = ed.cells;
  const marbles = [0, 1, 2, 3].filter((k) => c.includes(String.fromCharCode(65 + k)));
  ed.par = null;
  ed.solution = null;
  if (!marbles.length) return setState('invalid', t('edNeedMarble'));
  if (marbles.some((k) => !c.includes(String.fromCharCode(97 + k)))) return setState('invalid', t('edNeedHole'));
  if (c.filter((x) => x === '@').length === 1) return setState('invalid', t('edPortals'));
  setState('solving', t('edSolving'));
  clearTimeout(checkTimer);
  checkTimer = setTimeout(async () => {
    const snapshot = rows().join('/');
    const res = await solveRows(rows());
    if (snapshot !== rows().join('/')) return; // edited meanwhile: a newer check is coming
    if (res.error) return setState('invalid', res.error);
    if (res.par == null) return setState(res.capped ? 'complex' : 'impossible', t(res.capped ? 'edComplex' : 'edImpossible'));
    ed.par = res.par;
    ed.solution = res.solution;
    setState('ok', t(res.par <= 1 ? 'edEasy' : 'edSolved', { n: res.par }));
  }, 220);
}

function setState(state, msg) {
  ed.state = state;
  ed.msg = msg;
  const el = $('#ed-status');
  el.textContent = msg;
  el.dataset.state = state;
  $('#ed-share').disabled = state !== 'ok';
  $('#ed-test').disabled = state !== 'ok';
  if (state === 'ok') replay(el, 'pop-in');
}

/* ---------- rendering ---------- */
function cellHTML(ch, i) {
  const x = i % ed.size;
  const y = Math.floor(i / ed.size);
  const pos = `style="--x:${x};--y:${y}"`;
  if (ch === '#') return `<div class="cell wall" ${pos}></div>`;
  if (ch === 'O') return `<div class="cell pit" ${pos}></div>`;
  if (ch === '~') return `<div class="cell sand" ${pos}></div>`;
  if (ch === '_') return `<div class="cell ed-void" ${pos}></div>`;
  if (ch === '@') return `<div class="cell portal" ${pos}></div>`;
  if (ch === 'S') return `<div class="cell piece" ${pos}><div class="stone"></div></div>`;
  if (/[a-d]/.test(ch)) {
    const k = ch.charCodeAt(0) - 97;
    return `<div class="cell hole c${k}" ${pos}><i class="sym s${k}"></i></div>`;
  }
  if (/[A-D]/.test(ch)) {
    const k = ch.charCodeAt(0) - 65;
    return `<div class="cell piece" ${pos}><div class="ball c${k}"></div><i class="sym s${k}"></i></div>`;
  }
  if (/[v-y]/.test(ch)) {
    const k = ch.charCodeAt(0) - 118;
    return `<div class="cell gate c${k}" ${pos}><i class="sym s${k}"></i></div>`;
  }
  if (ARROWS.includes(ch)) return `<div class="cell arrow" style="--x:${x};--y:${y};--rot:${ARROWS.indexOf(ch) * 90}deg"></div>`;
  return '';
}

function renderBoard() {
  const b = $('#ed-board');
  b.style.setProperty('--w', ed.size);
  b.style.setProperty('--h', ed.size);
  $('#ed-layer').innerHTML = ed.cells.map(cellHTML).join('');
  $('#ed-size-label').textContent = t('edSize', { n: ed.size });
  sizeEditor();
}

function sizeEditor() {
  const area = $('#ed-area').getBoundingClientRect();
  const size = Math.max(110, Math.min(area.width / 1.08, (area.height - 8) / 1.12, 460));
  $('#ed-board').style.setProperty('--size', `${Math.floor(size)}px`);
}

const TOOL_ICON = {
  floor: '<i class="ti ti-floor"></i>',
  wall: '<i class="ti ti-wall"></i>',
  pit: '<i class="ti ti-pit"></i>',
  sand: '<i class="ti ti-sand"></i>',
  void: '<i class="ti ti-void"></i>',
  stone: '<i class="ti ti-stone"></i>',
  marble: '<i class="ti ti-marble"></i>',
  hole: '<i class="ti ti-hole"></i>',
  gate: '<i class="ti ti-gate"></i>',
  portal: '<i class="ti ti-portal"></i>',
  arrow: '<i class="ti ti-arrow"></i>',
};

function renderTools() {
  $('#ed-tools').innerHTML = TOOLS.map(
    (tool) => `<button class="ed-tool ${tool === ed.tool ? 'is-on' : ''}" data-tool="${tool}" style="--col:var(--c${ed.color});--cold:var(--c${ed.color}-d)">${TOOL_ICON[tool]}<span>${t(`tool_${tool}`)}</span></button>`,
  ).join('');
  $('#ed-colors').innerHTML = COLOR_TOOLS.has(ed.tool)
    ? [0, 1, 2, 3].map((k) => `<button class="ed-color c${k} ${k === ed.color ? 'is-on' : ''}" data-color="${k}" aria-label="${k}"><i class="sym s${k}"></i></button>`).join('')
    : `<small class="ed-hint">${t('edHint')}</small>`;
}

/* ---------- screen ---------- */
export function openEditor(r = null) {
  if (r) loadRows(r);
  else if (Array.isArray(store.data.edDraft) && store.data.edDraft.length) loadRows(store.data.edDraft);
  else reset(6);
  S.game = null;
  renderTools();
  showView('editor');
  requestAnimationFrame(() => {
    renderBoard();
    validate();
  });
}

let painting = null;
$('#ed-board').addEventListener('pointerdown', (e) => {
  painting = { last: -1, first: true, id: e.pointerId };
  $('#ed-board').setPointerCapture?.(e.pointerId);
  paintAt(e);
});
$('#ed-board').addEventListener('pointermove', (e) => painting && e.pointerId === painting.id && paintAt(e));
window.addEventListener('pointerup', () => {
  if (!painting) return;
  painting = null;
  persistDraft();
  validate();
});

function paintAt(e) {
  const r = $('#ed-layer').getBoundingClientRect();
  const x = Math.floor(((e.clientX - r.left) / r.width) * ed.size);
  const y = Math.floor(((e.clientY - r.top) / r.height) * ed.size);
  if (x < 0 || y < 0 || x >= ed.size || y >= ed.size) return;
  const i = y * ed.size + x;
  if (i === painting.last) return;
  const changed = paint(i, painting.first);
  painting.first = false;
  painting.last = i;
  if (changed) {
    sfx.tap();
    buzz(6);
    renderBoard();
  }
}

$('#ed-tools').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tool]');
  if (!b) return;
  ed.tool = b.dataset.tool;
  sfx.tap();
  renderTools();
});
$('#ed-colors').addEventListener('click', (e) => {
  const b = e.target.closest('[data-color]');
  if (!b) return;
  ed.color = Number(b.dataset.color);
  sfx.tap();
  renderTools();
});
$('#ed-size').addEventListener('click', () => {
  const next = SIZES[(SIZES.indexOf(ed.size) + 1) % SIZES.length];
  // Keep what fits in the new size.
  const old = rows();
  ed.size = next;
  ed.cells = [];
  for (let y = 0; y < next; y++) for (let x = 0; x < next; x++) ed.cells.push(old[y]?.[x] ?? '.');
  sfx.tap();
  renderBoard();
  persistDraft();
  validate();
});
$('#ed-clear').addEventListener('click', () => {
  reset(ed.size);
  sfx.undo();
  renderBoard();
  persistDraft();
  validate();
});
$('#btn-ed-back').addEventListener('click', () => {
  sfx.tap();
  import('./result.js').then((m) => m.goHome());
});
new ResizeObserver(() => els.editor?.classList.contains('is-active') && sizeEditor()).observe($('#ed-area'));

/* ---------- test & share ---------- */
export function playCustom(r, par, solution, { fromEditor = false } = {}) {
  const level = parseLevel(r, { par, solution });
  startGame({
    mode: 'custom',
    level,
    rows: r,
    fromEditor,
    title: t('customLevel'),
    sub: fromEditor ? t('edTest') : t('customBy'),
  });
}

$('#ed-test').addEventListener('click', () => {
  if (ed.state !== 'ok') return toast(t('edFixFirst'));
  sfx.tap();
  iris(() => playCustom(rows(), ed.par, ed.solution, { fromEditor: true }));
});

const b64url = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
export const fromB64url = (s) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

export function levelLink(r, par) {
  return `${shareBase()}?l=${b64url(`${r.join('/')}|${par}`)}`;
}

function remember(r, par) {
  const key = r.join('/');
  const list = store.data.myLevels;
  if (!list.some((l) => l.rows.join('/') === key)) {
    list.unshift({ id: Date.now().toString(36), rows: r, par, created: Date.now() });
    save();
  }
}

export async function shareLevel(r, par) {
  const url = levelLink(r, par);
  const text = t('edShareText', { n: par });
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ text, url });
      return;
    }
  } catch (e) {
    if (e?.name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast(t('edCopied'));
  } catch {
    prompt(t('edCopied'), url);
  }
}

$('#ed-share').addEventListener('click', () => {
  if (ed.state !== 'ok') return toast(t('edFixFirst'));
  remember(rows(), ed.par);
  sfx.coin();
  shareLevel(rows(), ed.par);
});

/* ---------- my levels ---------- */
function renderMine() {
  const list = store.data.myLevels;
  $('#mine-list').innerHTML = list.length
    ? list
        .map(
          (l, i) => `<li class="mine" style="--i:${i}">
        <span class="mine-mini" style="--n:${l.rows.length}">${l.rows
          .join('')
          .split('')
          .map((ch) => `<i class="mm-${/[A-D]/.test(ch) ? 'm' : /[a-d]/.test(ch) ? 'h' : ch === '#' ? 'w' : ch === 'O' ? 'p' : ch === '_' ? 'v' : 'f'}"></i>`)
          .join('')}</span>
        <span class="mine-text"><strong>${t('edSolved', { n: l.par }).replace('✓ ', '')}</strong><small>${new Date(l.created).toLocaleDateString()}</small></span>
        <span class="mine-actions">
          <button class="q-claim" data-act="play" data-i="${i}">${t('edPlay')}</button>
          <button class="icon-btn" data-act="share" data-i="${i}" aria-label="${t('edShare')}"><svg><use href="#i-share"/></svg></button>
          <button class="icon-btn" data-act="edit" data-i="${i}" aria-label="${t('edEdit')}"><svg><use href="#i-pencil"/></svg></button>
          <button class="icon-btn" data-act="del" data-i="${i}" aria-label="×"><svg><use href="#i-close"/></svg></button>
        </span></li>`,
        )
        .join('')
    : `<li class="mine-empty">${t('edEmptyMine')}</li>`;
}

$('#btn-ed-mine').addEventListener('click', () => {
  sfx.tap();
  renderMine();
  openModal('modal-mine');
});

$('#mine-list').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const l = store.data.myLevels[Number(b.dataset.i)];
  if (!l) return;
  const act = b.dataset.act;
  if (act === 'share') return shareLevel(l.rows, l.par);
  if (act === 'del') {
    if (!confirm(t('edDelete'))) return;
    store.data.myLevels.splice(Number(b.dataset.i), 1);
    save();
    return renderMine();
  }
  closeModal('modal-mine');
  if (act === 'edit') {
    loadRows(l.rows);
    persistDraft();
    renderBoard();
    validate();
  } else {
    const res = await solveRows(l.rows);
    if (res.par != null) iris(() => playCustom(l.rows, res.par, res.solution, { fromEditor: true }));
  }
});

$('#btn-create').addEventListener('click', () => {
  sfx.tap();
  iris(() => openEditor());
});

/** Open a level shared by link (?l=...). The par is always recomputed, never trusted. */
export async function openSharedLevel(code) {
  try {
    const [rowsStr] = fromB64url(code).split('|');
    const r = rowsStr.split('/');
    if (r.length < 3 || r.length > 8 || r.some((x) => x.length !== r.length)) throw new Error('shape');
    const res = await solveRows(r);
    if (res.par == null) throw new Error('unsolvable');
    playCustom(r, res.par, res.solution);
  } catch {
    toast(t('customBad'));
  }
}
