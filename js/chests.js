// Chests: definitions, reward rolls and the opening ceremony.
import { store, save } from './storage.js';
import { sfx, haptic } from './audio.js';
import { t } from './i18n.js';
import { burst, flyIcons, countTo, replay, reducedMotion } from './fx.js';

export const TIERS = {
  wood: { body: '#9a5a2a', lid: '#b56d34', dark: '#6e3d19', metal: '#f0b240', glow: '#ffcf6b' },
  silver: { body: '#5864a8', lid: '#6b78c2', dark: '#3c4580', metal: '#e4e9ff', glow: '#bcd0ff' },
  gold: { body: '#e39a12', lid: '#f7b928', dark: '#a8650a', metal: '#fff3c4', glow: '#fff1a8' },
};

// Three star chests per world, placed on the map path.
export const WORLD_CHESTS = [
  { k: 1, stars: 15, tier: 'wood', after: 7 },
  { k: 2, stars: 35, tier: 'silver', after: 14 },
  { k: 3, stars: 55, tier: 'gold', after: 20 },
];

export const chestId = (world, k) => `w${world}-${k}`;
export const isOpened = (id) => !!store.data.chests.opened[id];

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const round5 = (n) => Math.round(n / 5) * 5;

/** Roll the contents of a chest. */
export function rollChest(tier) {
  const pick = () => (Math.random() < 0.45 ? 'hint' : 'rewind');
  if (tier === 'gold') return { coins: round5(rnd(180, 250)), hint: 2, rewind: 2 };
  if (tier === 'silver') {
    const extra = pick();
    return { coins: round5(rnd(90, 130)), hint: 1 + (extra === 'hint' ? 1 : 0), rewind: extra === 'rewind' ? 1 : 0 };
  }
  const b = pick();
  return { coins: round5(rnd(40, 60)), hint: b === 'hint' ? 1 : 0, rewind: b === 'rewind' ? 1 : 0 };
}

/** SVG chest. The lid is a separate group so it can fly open. */
export function chestSVG(tier, cls = '') {
  const c = TIERS[tier];
  return `
  <svg class="chest-svg ${cls}" viewBox="0 0 120 112" aria-hidden="true">
    <ellipse class="chest-shadow" cx="60" cy="104" rx="46" ry="6" fill="rgba(0,0,0,.28)"/>
    <ellipse class="chest-inner" cx="60" cy="52" rx="44" ry="10" fill="${c.glow}"/>
    <g class="chest-body">
      <rect x="10" y="50" width="100" height="50" rx="9" fill="${c.body}"/>
      <rect x="10" y="84" width="100" height="16" rx="8" fill="${c.dark}" opacity=".45"/>
      <rect x="10" y="50" width="100" height="9" fill="${c.metal}"/>
      <rect x="22" y="50" width="9" height="50" fill="${c.metal}" opacity=".9"/>
      <rect x="89" y="50" width="9" height="50" fill="${c.metal}" opacity=".9"/>
      <rect x="50" y="55" width="20" height="24" rx="4" fill="${c.metal}"/>
      <circle cx="60" cy="64" r="3.4" fill="${c.dark}"/>
      <rect x="58.6" y="65" width="2.8" height="7" rx="1.4" fill="${c.dark}"/>
    </g>
    <g class="chest-lid">
      <path d="M10 54V38c0-14 22-22 50-22s50 8 50 22v16z" fill="${c.lid}"/>
      <path d="M10 54V46h100v8z" fill="${c.metal}"/>
      <path d="M22 54V22.5a60 30 0 019-3.2V54z" fill="${c.metal}" opacity=".9"/>
      <path d="M89 54V19.3a60 30 0 019 3.2V54z" fill="${c.metal}" opacity=".9"/>
      <path d="M24 30c10-6 22-8 36-8" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round" fill="none"/>
    </g>
  </svg>`;
}

/* ---------- opening ceremony ---------- */
const $ = (s) => document.querySelector(s);
const buzz = (p) => store.setting('haptics') && haptic(p);
let busy = false;

/**
 * Open a chest: grants the rewards and plays the ceremony.
 * Resolves when the player taps "Collect".
 */
export function openChest({ id, tier, title }) {
  if (busy || (id && isOpened(id))) return Promise.resolve(null);
  busy = true;
  const reward = rollChest(tier);
  const before = store.data.coins;
  // Grant immediately so nothing is lost if the app is closed mid-animation.
  if (id) store.data.chests.opened[id] = true;
  store.data.coins += reward.coins;
  store.data.boosters.hint += reward.hint;
  store.data.boosters.rewind += reward.rewind;
  save();

  const dlg = $('#modal-chest');
  const stage = $('#chest-stage');
  stage.dataset.tier = tier;
  stage.style.setProperty('--glow', TIERS[tier].glow);
  $('#chest-title').textContent = title || t(`chest_${tier}`);
  $('#chest-wrap').innerHTML = chestSVG(tier);
  $('#chest-rewards').innerHTML = '';
  $('#chest-balance').textContent = before;
  const collect = $('#chest-collect');
  collect.hidden = true;
  stage.dataset.stage = 'drop';
  dlg.showModal();
  sfx.whoosh();

  return new Promise((resolve) => {
    const toIdle = setTimeout(() => (stage.dataset.stage = 'idle'), reducedMotion() ? 0 : 650);
    let opened = false;

    const onTap = () => {
      if (opened || stage.dataset.stage === 'drop') return;
      opened = true;
      clearTimeout(toIdle);
      stage.dataset.stage = 'shake';
      sfx.chestShake(0);
      buzz(20);
      setTimeout(() => {
        sfx.chestShake(1);
        buzz(30);
      }, 330);
      setTimeout(() => {
        sfx.chestShake(2);
        buzz(40);
      }, 600);
      setTimeout(reveal, reducedMotion() ? 0 : 900);
    };

    const reveal = () => {
      stage.dataset.stage = 'open';
      replay($('#chest-flash'), 'flash');
      sfx.chestOpen();
      buzz([30, 40, 60]);
      burst($('#chest-wrap'), 50, 45, { count: 26, colors: [TIERS[tier].glow, '#fff', 'var(--c2)', 'var(--c1)'], dist: 150 });
      const items = [{ icon: 'i-coin', amount: reward.coins, label: t('coins'), kind: 'coins' }];
      if (reward.hint) items.push({ icon: 'i-hint', amount: reward.hint, label: t('hintName'), kind: 'hint' });
      if (reward.rewind) items.push({ icon: 'i-rewind', amount: reward.rewind, label: t('rewindName'), kind: 'rewind' });
      const box = $('#chest-rewards');
      items.forEach((it, i) => {
        setTimeout(() => {
          const card = document.createElement('div');
          card.className = `reward-card rc-${it.kind}`;
          card.innerHTML = `<svg><use href="#${it.icon}"/></svg><b>${it.kind === 'coins' ? '0' : `×${it.amount}`}</b><small>${it.label}</small>`;
          box.appendChild(card);
          sfx.pop(i);
          buzz(15);
          if (it.kind === 'coins') countTo(card.querySelector('b'), 0, it.amount, 700, (v) => `+${v}`);
        }, 350 + i * 380);
      });
      setTimeout(() => {
        stage.dataset.stage = 'done';
        collect.hidden = false;
        collect.focus();
      }, 450 + items.length * 380);
    };

    const onCollect = () => {
      collect.hidden = true;
      sfx.coin();
      const coinCard = $('#chest-rewards .rc-coins');
      const bal = $('#chest-balance');
      flyIcons(coinCard, bal.parentElement, {
        count: 8,
        layer: dlg,
        onArrive: (i) => {
          if (i === 0) countTo(bal, before, store.data.coins, 500);
          if (i % 2 === 0) sfx.tick();
        },
      });
      setTimeout(finish, reducedMotion() ? 0 : 1050);
    };

    const finish = () => {
      stage.removeEventListener('click', onTap);
      collect.removeEventListener('click', onCollect);
      dlg.removeEventListener('cancel', onCancel);
      dlg.close();
      busy = false;
      resolve(reward);
    };
    const onCancel = (e) => {
      e.preventDefault();
      if (stage.dataset.stage === 'done') onCollect();
      else if (!opened) onTap();
    };

    stage.addEventListener('click', onTap);
    collect.addEventListener('click', onCollect);
    dlg.addEventListener('cancel', onCancel);
  });
}
