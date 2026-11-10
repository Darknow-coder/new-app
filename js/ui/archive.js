// Daily puzzle archives: a month calendar of every past puzzle since #1.
// Late solves live in `store.data.archive`, so they never repair a streak.
import { DAILY_ORDER, EPOCH, addDays, dailyLevel, dateKey, dayDiff, keyToDate, puzzleNumber } from '../daily.js';
import { LANG, t } from '../i18n.js';
import { store } from '../storage.js';
import { iris } from '../fx.js';
import { sfx } from '../audio.js';
import { $, S, closeModal, openModal } from './core.js';
import { startDaily } from './game.js';

const pad = (n) => String(n).padStart(2, '0');
const FIRST = `${EPOCH.y}-${pad(EPOCH.m)}-${pad(EPOCH.d)}`;
let view = null; // { y, m } month shown (m is 1-12)
let selected = null;

const monthIndex = (y, m) => y * 12 + (m - 1);

function dayInfo(key) {
  let solved = 0;
  let stars = 0;
  for (const d of DAILY_ORDER) {
    const e = store.anyEntry(key, d);
    if (e?.done) {
      solved++;
      stars += e.stars || 0;
    }
  }
  return { solved, stars };
}

/** Past days (before today) with at least one unsolved puzzle. */
export function archiveTodo(today = S.today) {
  let n = 0;
  for (let k = FIRST; dayDiff(k, today) > 0; k = addDays(k, 1)) if (dayInfo(k).solved < 3) n++;
  return n;
}

export function openArchive(focus) {
  const today = S.today || dateKey();
  let key = focus && dayDiff(FIRST, focus) >= 0 && dayDiff(focus, today) >= 0 ? focus : null;
  if (!key) {
    // Most recent unfinished past day, else today.
    key = today;
    for (let k = addDays(today, -1); dayDiff(FIRST, k) >= 0; k = addDays(k, -1)) {
      if (dayInfo(k).solved < 3) {
        key = k;
        break;
      }
    }
  }
  const [y, m] = key.split('-').map(Number);
  view = { y, m };
  selected = key;
  render();
  openModal('modal-archive');
}

function render() {
  const today = S.today || dateKey();
  const [ty, tm] = today.split('-').map(Number);
  const fmt = new Intl.DateTimeFormat(LANG, { month: 'long', year: 'numeric' });
  $('#arch-month').textContent = fmt.format(new Date(view.y, view.m - 1, 1));
  const cur = monthIndex(view.y, view.m);
  $('#arch-prev').disabled = cur <= monthIndex(EPOCH.y, EPOCH.m);
  $('#arch-next').disabled = cur >= monthIndex(ty, tm);

  // Weekday header, Monday first.
  const wd = new Intl.DateTimeFormat(LANG, { weekday: 'narrow' });
  let html = '';
  for (let i = 0; i < 7; i++) html += `<b class="arch-wd">${wd.format(new Date(2024, 0, 1 + i))}</b>`;
  const first = new Date(view.y, view.m - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(view.y, view.m, 0).getDate();
  for (let i = 0; i < lead; i++) html += '<i class="arch-blank"></i>';
  // In the current month, stop after the week holding today: empty future rows only waste room.
  let lastDay = days;
  if (view.y === ty && view.m === tm) {
    const td = Number(today.slice(8));
    lastDay = Math.min(days, td + (6 - ((lead + td - 1) % 7)));
  }
  for (let d = 1; d <= lastDay; d++) {
    const key = `${view.y}-${pad(view.m)}-${pad(d)}`;
    const before = dayDiff(FIRST, key) < 0;
    const future = dayDiff(key, today) < 0;
    if (before || future) {
      html += `<span class="arch-day is-off">${d}</span>`;
      continue;
    }
    const { solved, stars } = dayInfo(key);
    const dots = DAILY_ORDER.map((diff) => {
      const e = store.anyEntry(key, diff);
      return `<i class="${e?.done ? (e.stars === 3 ? 'on gold' : 'on') : ''}"></i>`;
    }).join('');
    const cls = [
      'arch-day',
      key === today ? 'is-today' : '',
      key === selected ? 'is-sel' : '',
      solved === 3 ? 'is-full' : '',
      stars === 9 ? 'is-perfect' : '',
    ].join(' ');
    html += `<button type="button" class="${cls}" data-key="${key}" aria-label="#${puzzleNumber(key)}"><span>${d}</span><em>${dots}</em></button>`;
  }
  const grid = $('#arch-grid');
  grid.innerHTML = html;
  grid.querySelectorAll('[data-key]').forEach((b) =>
    b.addEventListener('click', () => {
      sfx.tap();
      selected = b.dataset.key;
      grid.querySelector('.is-sel')?.classList.remove('is-sel');
      b.classList.add('is-sel');
      renderDetail();
    }),
  );
  $('#arch-todo').textContent = archiveTodo(today) ? t('archTodo', { n: archiveTodo(today) }) : t('archAllDone');
  renderDetail();
}

function renderDetail() {
  const box = $('#arch-detail');
  const key = selected;
  const today = S.today || dateKey();
  if (!key) {
    box.innerHTML = '';
    return;
  }
  const df = new Intl.DateTimeFormat(LANG, { weekday: 'long', day: 'numeric', month: 'long' });
  const isToday = key === today;
  let rows = '';
  for (const diff of DAILY_ORDER) {
    const e = store.anyEntry(key, diff);
    const done = e?.done;
    const side = done
      ? `<span class="stars">${[0, 1, 2].map((i) => `<span class="${i < e.stars ? 'on' : ''}">★</span>`).join('')}</span>`
      : `<span class="dc-play">${t(e?.moves ? 'continue' : 'play')}</span>`;
    rows += `<li><button type="button" class="arch-row ${done ? 'is-done' : ''}" data-diff="${diff}">
      <span class="dc-ball"></span>
      <span class="dc-text"><strong>${t(diff)}</strong><small data-par>${done ? t('solvedIn', { m: e.moves }) : '&nbsp;'}</small></span>
      <span class="dc-side">${side}</span></button></li>`;
  }
  box.innerHTML = `<h3 class="arch-date">${df.format(keyToDate(key))} <small>#${puzzleNumber(key)}${isToday ? ` · ${t('archToday')}` : ''}</small></h3>
    <ol class="arch-rows">${rows}</ol>
    ${isToday ? '' : `<p class="arch-note">${t('archNote')}</p>`}`;
  box.querySelectorAll('.arch-row').forEach((b) =>
    b.addEventListener('click', () => {
      const diff = b.dataset.diff;
      closeModal('modal-archive', true);
      iris(() => startDaily(diff, key));
    }),
  );
  // Par needs the generator (a few ms per puzzle): fill it in after paint.
  setTimeout(() => {
    if (selected !== key) return;
    box.querySelectorAll('.arch-row').forEach((b) => {
      const e = store.anyEntry(key, b.dataset.diff);
      const par = dailyLevel(key, b.dataset.diff).par;
      b.querySelector('[data-par]').textContent = e?.done ? `${t('solvedIn', { m: e.moves })} · ${t('par', { n: par })}` : t('par', { n: par });
    });
  }, 30);
}

function shiftMonth(delta) {
  sfx.tap();
  let m = view.m + delta;
  let y = view.y;
  if (m < 1) {
    m = 12;
    y--;
  } else if (m > 12) {
    m = 1;
    y++;
  }
  view = { y, m };
  const today = S.today || dateKey();
  // Select the last playable day of that month.
  const last = new Date(y, m, 0).getDate();
  let key = `${y}-${pad(m)}-${pad(last)}`;
  if (dayDiff(key, today) < 0) key = today;
  if (dayDiff(FIRST, key) < 0) key = FIRST;
  selected = key;
  const grid = $('#arch-grid');
  grid.classList.remove('slide-l', 'slide-r');
  void grid.offsetWidth;
  grid.classList.add(delta < 0 ? 'slide-r' : 'slide-l');
  render();
}

$('#arch-prev').addEventListener('click', () => shiftMonth(-1));
$('#arch-next').addEventListener('click', () => shiftMonth(1));
