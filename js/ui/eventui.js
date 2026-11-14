// Weekly event: the home card, the event window (7 stages and the final chest),
// starting a stage, and what a win gives.
import { t } from '../i18n.js';
import { save, store } from '../storage.js';
import { sfx } from '../audio.js';
import { iris, replay } from '../fx.js';
import { chestSVG } from '../chests.js';
import { EVENT_STAGES, EVENT_UNLOCK, eventStages, mechanicsIn, msUntilNextWeek, themeOf, weekOf } from '../event.js';
import { $, S, closeModal, openModal, starsHTML } from './core.js';
import { showMechanic, startGame } from './game.js';
import { openChestFlow } from './common.js';
import { addToInbox, takeFromInbox } from '../progress.js';

/** This week's progress (reset when a new week starts). */
export function eventState() {
  const week = weekOf(S.today);
  if (store.data.event?.week !== week) {
    store.data.event = { week, stars: [], chest: false };
    save();
  }
  return store.data.event;
}
export const eventOpen = () => store.data.levels.unlocked >= EVENT_UNLOCK;
const nextStage = (ev) => Math.min(ev.stars.length, EVENT_STAGES - 1);

function endsIn() {
  const ms = msUntilNextWeek(S.today);
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d >= 1 ? t('evDays', { d, h }) : t('evHours', { h: Math.max(1, h) });
}

const dots = (ev) =>
  Array.from({ length: EVENT_STAGES }, (_, i) => `<i class="${i < ev.stars.length ? 'on' : i === ev.stars.length ? 'next' : ''}"></i>`).join('');

export function renderEventCard() {
  const card = $('#btn-event');
  card.hidden = !eventOpen();
  if (card.hidden) return;
  const ev = eventState();
  const th = themeOf(ev.week);
  card.style.setProperty('--ev', th.hue);
  card.classList.toggle('is-done', ev.stars.length >= EVENT_STAGES);
  $('#ev-badge').className = `ev-badge evi-${th.id}`;
  $('#ev-kicker').textContent = `${t('evTitle')} · ${endsIn()}`;
  $('#ev-name').textContent = t(`ev_${th.id}`);
  $('#ev-dots').innerHTML = dots(ev);
  $('#ev-chest').innerHTML = chestSVG('gold', ev.chest ? 'is-open' : '');
}

export function openEvent() {
  const ev = eventState();
  const th = themeOf(ev.week);
  const card = $('#modal-event .modal-card');
  card.style.setProperty('--ev', th.hue);
  $('#evm-badge').className = `ev-badge big evi-${th.id}`;
  $('#evm-name').textContent = t(`ev_${th.id}`);
  $('#evm-ends').textContent = t('evEnds', { t: endsIn() });
  const done = ev.stars.length >= EVENT_STAGES;
  let path = '';
  for (let i = 0; i < EVENT_STAGES; i++) {
    const state = i < ev.stars.length ? 'done' : i === ev.stars.length ? 'current' : 'locked';
    path += `<button class="evs is-${state}" data-s="${i}" style="--i:${i}" ${state === 'locked' ? 'disabled' : ''}>
      ${state === 'locked' ? '<svg><use href="#i-lock"/></svg>' : `<span>${i + 1}</span>`}
      ${state === 'done' ? `<span class="evs-stars">${starsHTML(ev.stars[i])}</span>` : ''}</button>`;
  }
  path += `<span class="evs-chest ${done ? 'is-won' : ''}">${chestSVG('gold', ev.chest ? 'is-open' : '')}</span>`;
  $('#evm-path').innerHTML = path;
  $('#evm-reward').textContent = done ? t('evComplete') : t('evReward');
  const play = $('#evm-play');
  play.hidden = done;
  play.textContent = t('evPlay', { n: nextStage(ev) + 1 });
  openModal('modal-event');
}

/** Play stage i of this week's event. */
export async function startEventStage(i) {
  const ev = eventState();
  const stages = await eventStages(ev.week, store.data.levels.unlocked);
  const level = stages[i];
  const th = themeOf(ev.week);
  startGame({
    mode: 'event',
    week: ev.week,
    stage: i,
    level,
    title: t('evStage', { n: i + 1, t: EVENT_STAGES }),
    sub: t(`ev_${th.id}`),
  });
  // A tile the player has never met (events can show them early): explain it first.
  const unseen = mechanicsIn(level).find((m) => !store.data.seenMech?.[m]);
  if (unseen) setTimeout(() => showMechanic(unseen), 500);
}

/** A stage was solved: record it, pay it, and the final chest on the last one. */
export function eventWin(stage, stars) {
  const ev = eventState();
  const first = stage >= ev.stars.length;
  if (first) ev.stars[stage] = stars;
  else ev.stars[stage] = Math.max(ev.stars[stage] || 0, stars);
  const reward = first ? 10 + 5 * stage : 0;
  if (reward) store.addCoins(reward);
  const finished = first && stage === EVENT_STAGES - 1 && !ev.chest;
  if (finished) {
    ev.chest = true;
    store.addCoins(50);
    store.data.eventsDone = (store.data.eventsDone || 0) + 1;
    // The gold chest waits in the inbox, so it is never lost if the player taps away.
    addToInbox({ id: `event-${ev.week}`, tier: 'gold', reason: 'event' });
  }
  save();
  return { reward: reward + (finished ? 50 : 0), finished, next: ev.stars.length < EVENT_STAGES ? ev.stars.length : -1 };
}

export const openEventChest = (week) => openChestFlow({ id: `event-${week}`, tier: 'gold', title: t('evFinal') }).then(() => takeFromInbox(`event-${week}`));

$('#btn-event').addEventListener('click', () => {
  sfx.tap();
  openEvent();
});
$('#evm-play').addEventListener('click', () => {
  const ev = eventState();
  closeModal('modal-event');
  sfx.tap();
  iris(() => startEventStage(nextStage(ev)));
});
$('#evm-path').addEventListener('click', (e) => {
  const b = e.target.closest('.evs');
  if (!b || b.disabled) {
    if (b) replay(b, 'deny');
    return;
  }
  closeModal('modal-event');
  sfx.tap();
  iris(() => startEventStage(Number(b.dataset.s)));
});
