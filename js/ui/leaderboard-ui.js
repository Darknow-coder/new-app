// Leaderboard screen: opt-in, random fun names, top 50 by levels completed (then stars).
import { LANG, t } from '../i18n.js';
import { store } from '../storage.js';
import { sfx } from '../audio.js';
import { join, joined, leave, me, onlineEnabled, push, rank, reroll, top } from '../leaderboard.js';
import { $, openModal, toast } from './core.js';

const ADJ = {
  en: ['Swift', 'Nimble', 'Calm', 'Clever', 'Wise', 'Brave', 'Red', 'Golden', 'Pink', 'Magic', 'Cosmic', 'Shy', 'Mystic', 'Electric', 'Giant', 'Tiny', 'Fantastic', 'Chill', 'Solar', 'Lunar', 'Polar', 'Wild', 'Famous', 'Turbo'],
  fr: ['Rapide', 'Agile', 'Calme', 'Habile', 'Sage', 'Brave', 'Rouge', 'Jaune', 'Rose', 'Magique', 'Cosmique', 'Timide', 'Mystique', 'Électrique', 'Énorme', 'Minuscule', 'Fantastique', 'Tranquille', 'Solaire', 'Lunaire', 'Polaire', 'Sauvage', 'Célèbre', 'Turbo'],
};
const ANIMAL = {
  en: ['Otter', 'Panda', 'Fox', 'Owl', 'Koala', 'Tiger', 'Penguin', 'Bunny', 'Dolphin', 'Llama', 'Hedgehog', 'Beaver', 'Seal', 'Kitten', 'Cub', 'Raccoon', 'Gecko', 'Octopus', 'Raven', 'Falcon', 'Lynx', 'Yak', 'Turtle', 'Whale'],
  fr: ['Loutre', 'Panda', 'Renard', 'Hibou', 'Koala', 'Tigre', 'Pingouin', 'Lapin', 'Dauphin', 'Lama', 'Hérisson', 'Castor', 'Phoque', 'Chaton', 'Ourson', 'Raton', 'Gecko', 'Poulpe', 'Corbeau', 'Faucon', 'Lynx', 'Yack', 'Tortue', 'Baleine'],
};

export function playerName({ a, b, n }) {
  const L = LANG.startsWith('fr') ? 'fr' : 'en';
  const adj = ADJ[L][a] || ADJ[L][0];
  const an = ANIMAL[L][b] || ANIMAL[L][0];
  return L === 'fr' ? `${an} ${adj} ${n}` : `${adj} ${an} ${n}`;
}

/** Levels completed (at least one star) and total adventure stars. */
export function myProgress() {
  const best = store.data.levels.best;
  let levels = 0;
  let stars = 0;
  for (const v of Object.values(best)) {
    if (v > 0) levels++;
    stars += v;
  }
  return { levels, stars };
}

/** Publish progress after a win (no-op unless the player joined). */
export function syncRank() {
  const p = myProgress();
  push(p.levels, p.stars);
}

export function renderRankCard() {
  const card = $('#btn-rank');
  if (!card) return;
  card.hidden = !onlineEnabled();
  if (card.hidden) return;
  const s = me();
  $('#rank-sub').textContent = joined() && s.rank ? t('rankLine', { r: s.rank, n: s.total }) : t('rankInvite');
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function rowHTML(p, i, mine) {
  const medal = i < 3 ? `<span class="lb-medal m${i}">${i + 1}</span>` : `<span class="lb-pos">${i + 1}</span>`;
  return `<li class="lb-row ${mine ? 'is-me' : ''}">${medal}<span class="lb-name">${esc(playerName(p))}${mine ? ` <em>${t('rankYou')}</em>` : ''}</span><span class="lb-score"><b>${p.levels}</b><small>★ ${p.stars}</small></span></li>`;
}

async function render() {
  const body = $('#lb-body');
  const p = myProgress();
  if (!joined()) {
    body.innerHTML = `
      <div class="lb-join">
        <div class="lb-trophy"><svg><use href="#i-trophy"/></svg></div>
        <p>${t('rankJoinText')}</p>
        <button class="btn btn-primary btn-wide" id="lb-join">${t('rankJoin')}</button>
        <small>${t('rankPrivacy')}</small>
      </div>`;
    $('#lb-join').addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try {
        await join(p.levels, p.stars);
        sfx.unlock();
        await render();
      } catch {
        toast(t('rankOffline'));
        e.currentTarget.disabled = false;
      }
    });
    return;
  }
  const s = me();
  body.innerHTML = `
    <div class="lb-me">
      <div class="lb-me-text"><small>${t('rankYourName')}</small><strong id="lb-myname">${esc(playerName(s))}</strong></div>
      <button class="icon-btn lb-dice" id="lb-reroll" aria-label="${t('rankReroll')}"><svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="8.5" cy="8.5" r="1.6" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg></button>
    </div>
    <div class="lb-stats"><span><b>${p.levels}</b>${t('rankLevels')}</span><span><b>★ ${p.stars}</b>${t('rankStars')}</span><span><b id="lb-rank">…</b>${t('rankPlace')}</span></div>
    <ol class="lb-list" id="lb-list"><li class="lb-loading">${t('rankLoading')}</li></ol>
    <button class="lb-leave" id="lb-leave">${t('rankLeave')}</button>`;
  $('#lb-reroll').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.classList.remove('roll');
    void btn.offsetWidth;
    btn.classList.add('roll');
    sfx.flip(2);
    try {
      await reroll(p.levels, p.stars);
      $('#lb-myname').textContent = playerName(me());
      fillList();
    } catch {
      toast(t('rankWait'));
    }
    setTimeout(() => (btn.disabled = false), 1500);
  });
  $('#lb-leave').addEventListener('click', async () => {
    if (!confirm(t('rankLeaveConfirm'))) return;
    try {
      await leave();
      render();
      renderRankCard();
    } catch {
      toast(t('rankOffline'));
    }
  });
  // Make sure the board shows the latest progress, then load it.
  syncRank();
  fillList();
}

async function fillList() {
  const list = $('#lb-list');
  const p = myProgress();
  try {
    const [rows, r] = await Promise.all([top(50), rank(p.levels, p.stars)]);
    const uid = me().uid;
    let html = rows.map((row, i) => rowHTML(row, i, row.uid === uid)).join('');
    if (!rows.some((row) => row.uid === uid)) {
      html += `<li class="lb-gap">⋯</li>${rowHTML({ ...me(), ...p }, r.rank - 1, true)}`;
    }
    list.innerHTML = html || `<li class="lb-loading">${t('rankEmpty')}</li>`;
    $('#lb-rank').textContent = `#${r.rank}`;
    list.querySelector('.is-me')?.scrollIntoView({ block: 'nearest' });
    renderRankCard();
  } catch {
    list.innerHTML = `<li class="lb-loading">${t('rankOffline')}</li>`;
  }
}

export function openLeaderboard() {
  if (!onlineEnabled()) return;
  sfx.tap();
  render();
  openModal('modal-rank');
}

$('#btn-rank')?.addEventListener('click', openLeaderboard);
