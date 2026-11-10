import { DAILY_ORDER, dateKey } from '../daily.js';
import { computeStats, store } from '../storage.js';
import { haptic, sfx } from '../audio.js';
import { t } from '../i18n.js';
import { countTo, reducedMotion, replay, stagger } from '../fx.js';
import { LEVELS_PER_WORLD, WORLD_HUES, worldOf } from '../levels.js';
import { WORLD_CHESTS, chestId, isOpened } from '../chests.js';

/** Shared mutable UI state (one object so every module sees the same values). */
export const S = {
  today: dateKey(),
  game: null,
  pendingUnlock: 0,
  animating: false,
  queued: null,
  shownCoins: null,
};

export const $ = (sel) => document.querySelector(sel);

export const DIFF_EMOJI = { easy: '🟢', medium: '🟡', hard: '🔴' };

export const DIFF_TONE = { easy: 'c1', medium: 'c2', hard: 'c0' };

export const els = {
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

export const buzz = (p) => store.setting('haptics') && haptic(p);

export function applyStaticText() {
  document.querySelectorAll('[data-i18n]').forEach((n) => (n.textContent = t(n.dataset.i18n)));
  document.querySelectorAll('[data-i18n-label]').forEach((n) => {
    n.setAttribute('aria-label', t(n.dataset.i18nLabel));
    n.title = t(n.dataset.i18nLabel);
  });
}

export function starsHTML(n, total = 3) {
  let s = '';
  for (let i = 0; i < total; i++) s += `<svg class="${i < n ? 'on' : ''}"><use href="#i-star"/></svg>`;
  return `<span class="stars" aria-label="${n}/3">${s}</span>`;
}

export let toastTimer = 0;

export function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

export function announce(msg) {
  els.live.textContent = msg;
}

// What rises in, and in which order, when each screen appears.
export const ENTER = {
  home: '.view-home .topbar > *, .hero > *, .adventure-hero, .season-card, .daily-list > li, .share-row, .countdown, .quests-card, .quest, .footer-note, .bottom-nav > *',
  game: '.game-topbar > *, .tip, .controls > .ctrl',
  map: '.view-map .topbar > *, .world-head',
};

export function showView(name) {
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
export const MODAL_ENTER =
  '.modal-card > :not(.modal-close):not(.result-rays):not(.result-stars):not(.new-best):not(.confetti):not(#result-title):not(.result-reward):not(.mech-art):not(.mech-badge), .help-list > li, .stats-grid > .stat, .week > .day, .toggle, .ach-list > li, .preview-list > li';

export function openModal(id) {
  const m = document.getElementById(id);
  clearTimeout(m.closeTimer);
  m.classList.remove('closing');
  if (!m.open) m.showModal();
  stagger(m, MODAL_ENTER, { step: 45, base: 90 });
}

export function closeModal(id, instant = false) {
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

export function anyModalOpen() {
  return !!document.querySelector('dialog[open]');
}

export function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function updateCoins(bump = false) {
  const target = store.data.coins;
  const from = S.shownCoins ?? target;
  S.shownCoins = target;
  document.querySelectorAll('[data-coins]').forEach((b) => {
    countTo(b, from, target, 650);
    if (bump) replay(b.parentElement, 'bump');
  });
}

export const worldHue = (n) => WORLD_HUES[worldOf(n) % WORLD_HUES.length];

export const worldName = (w) => {
  const base = t(`world${w % 12}`);
  const lap = Math.floor(w / 12);
  return lap ? `${base} ${['II', 'III', 'IV', 'V'][Math.min(lap - 1, 3)]}` : base;
};

export const notifQueue = [];

export let notifBusy = false;

export function notify(icon, title, sub, kind = '') {
  notifQueue.push({ icon, title, sub, kind });
  if (!notifBusy) nextNotif();
}

export function nextNotif() {
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

export function worldStars(w) {
  let total = 0;
  const first = w * LEVELS_PER_WORLD + 1;
  for (let n = first; n < first + LEVELS_PER_WORLD; n++) total += store.levelStars(n);
  return total;
}

export function readyChests() {
  const out = [];
  const lastWorld = worldOf(store.data.levels.unlocked);
  for (let w = 0; w <= lastWorld; w++) {
    const stars = worldStars(w);
    for (const c of WORLD_CHESTS) if (stars >= c.stars && !isOpened(chestId(w, c.k))) out.push({ w, ...c });
  }
  return out;
}

export function dailyChestTier(day) {
  const order = ['wood', 'silver', 'gold'];
  let stars = 0;
  for (const d of DAILY_ORDER) stars += store.dailyEntry(day, d)?.stars || 0;
  let i = stars === 9 ? 1 : 0;
  if (computeStats(S.today).current >= 7) i++;
  return order[Math.min(i, 2)];
}

export function dailyChestReady(day = S.today) {
  return store.dayComplete(day) && !isOpened(`d-${day}`);
}
