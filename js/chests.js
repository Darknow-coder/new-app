// Chests: definitions, reward rolls and the opening ceremony.
import { store, save } from './storage.js';
import { sfx, haptic } from './audio.js';
import { t } from './i18n.js';
import { burst, flyIcons, countTo, replay, reducedMotion } from './fx.js';
import { pickSkin, grantSkin, marbleHTML } from './skins.js';

export const TIERS = {
  wood: { body: '#9a5a2a', lid: '#b56d34', dark: '#6e3d19', metal: '#f0b240', glow: '#ffcf6b', gem: null },
  silver: { body: '#5864a8', lid: '#6b78c2', dark: '#3c4580', metal: '#e4e9ff', glow: '#bcd0ff', gem: '#4ad0ff' },
  gold: { body: '#e39a12', lid: '#f7b928', dark: '#a8650a', metal: '#fff3c4', glow: '#fff1a8', gem: '#ff3d6e' },
};
const NEXT_TIER = { wood: 'silver', silver: 'gold' };
// Chance that a chest upgrades itself while being shaken.
const UPGRADE_CHANCE = { wood: 0.18, silver: 0.12 };

// Three star chests per world, placed on the map path.
export const WORLD_CHESTS = [
  { k: 1, stars: 15, tier: 'wood', after: 7 },
  { k: 2, stars: 35, tier: 'silver', after: 14 },
  { k: 3, stars: 55, tier: 'gold', after: 20 },
];

export const chestId = (world, k) => `w${world}-${k}`;
export const isOpened = (id) => !!store.data.chests.opened[id];

/** What a chest tier can contain (used by the preview sheet and by the roll). */
export const ODDS = {
  wood: { coins: [40, 60], boosters: 1, skin: 0.1, rarities: ['common'] },
  silver: { coins: [90, 130], boosters: 2, skin: 0.35, rarities: ['common', 'rare'] },
  gold: { coins: [180, 250], boosters: 4, skin: 1, rarities: ['rare', 'epic'] },
};

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const round5 = (n) => Math.round(n / 5) * 5;

/** Roll the contents of a chest. */
export function rollChest(tier) {
  const o = ODDS[tier];
  const r = { coins: round5(rnd(o.coins[0], o.coins[1])), hint: 0, rewind: 0, skin: null, dupe: 0 };
  if (tier === 'gold') {
    r.hint = 2;
    r.rewind = 2;
  } else {
    for (let i = 0; i < o.boosters; i++) r[Math.random() < 0.45 || (tier === 'silver' && i === 0) ? 'hint' : 'rewind']++;
  }
  if (Math.random() < o.skin) {
    const s = pickSkin(o.rarities) || (tier === 'gold' ? pickSkin(['common', 'rare', 'epic']) : null);
    if (s) r.skin = s;
    else if (tier === 'gold') r.dupe = 100; // collection complete: convert into coins
  }
  return r;
}

/* ---------- artwork ---------- */
function sparkle(x, y, s, d) {
  return `<path class="chest-sparkle" style="animation-delay:${d}s" transform="translate(${x} ${y}) scale(${s})" d="M0-6L1.5-1.5 6 0 1.5 1.5 0 6-1.5 1.5-6 0-1.5-1.5z" fill="#fff"/>`;
}

/** SVG chest. Lid, seam light and body are separate so they can be animated. */
export function chestSVG(tier, cls = '') {
  const c = TIERS[tier];
  const wood = tier === 'wood';
  const rivets = (y) =>
    [26.5, 93.5].map((x) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${c.dark}" opacity=".55"/>`).join('');
  return `
  <svg class="chest-svg tier-${tier} ${cls}" viewBox="0 0 120 112" aria-hidden="true">
    <ellipse class="chest-shadow" cx="60" cy="104" rx="46" ry="6" fill="rgba(0,0,0,.28)"/>
    <g class="chest-inner">
      <path d="M30 52 L14 -40 L106 -40 L90 52z" fill="${c.glow}" opacity=".28"/>
      <path d="M44 52 L36 -40 L84 -40 L76 52z" fill="#fff" opacity=".25"/>
      <ellipse cx="60" cy="52" rx="44" ry="10" fill="${c.glow}"/>
      <ellipse cx="60" cy="52" rx="26" ry="5" fill="#fff"/>
    </g>
    <g class="chest-body">
      <rect x="10" y="50" width="100" height="50" rx="9" fill="${c.body}"/>
      ${wood ? `<path d="M12 67h96M12 84h96" stroke="${c.dark}" stroke-width="1.6" opacity=".55"/>` : ''}
      <rect x="10" y="84" width="100" height="16" rx="8" fill="${c.dark}" opacity=".4"/>
      <rect x="10" y="50" width="100" height="9" fill="${c.metal}"/>
      <rect x="22" y="50" width="9" height="50" fill="${c.metal}" opacity=".92"/>
      <rect x="89" y="50" width="9" height="50" fill="${c.metal}" opacity=".92"/>
      ${rivets(66)}${rivets(90)}
      <rect x="49" y="55" width="22" height="25" rx="5" fill="${c.metal}"/>
      <rect x="49" y="55" width="22" height="25" rx="5" fill="none" stroke="${c.dark}" stroke-opacity=".35" stroke-width="1.5"/>
      <circle cx="60" cy="64" r="3.4" fill="${c.dark}"/>
      <rect x="58.6" y="65" width="2.8" height="7" rx="1.4" fill="${c.dark}"/>
    </g>
    <rect class="chest-seam" x="12" y="46" width="96" height="8" rx="4" fill="${c.glow}"/>
    <g class="chest-lid">
      <path d="M10 54V38c0-14 22-22 50-22s50 8 50 22v16z" fill="${c.lid}"/>
      ${wood ? `<path d="M11 40h98M14 29h92" stroke="${c.dark}" stroke-width="1.6" opacity=".45"/>` : ''}
      <path d="M10 54V46h100v8z" fill="${c.metal}"/>
      <path d="M22 54V22.5a60 30 0 019-3.2V54z" fill="${c.metal}" opacity=".92"/>
      <path d="M89 54V19.3a60 30 0 019 3.2V54z" fill="${c.metal}" opacity=".92"/>
      ${rivets(30)}${rivets(42)}
      ${c.gem ? `<path d="M60 24l7 7-7 9-7-9z" fill="${c.gem}" stroke="${c.metal}" stroke-width="2"/><path d="M57 29l3-3 2 2" stroke="#fff" stroke-width="1.4" fill="none" opacity=".8"/>` : ''}
      <path d="M24 30c10-6 22-8 36-8" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round" fill="none"/>
    </g>
    ${tier !== 'wood' ? `<g class="chest-sparkles">${sparkle(8, 40, 0.9, 0)}${sparkle(112, 30, 0.7, 0.6)}${sparkle(100, 88, 0.6, 1.1)}${tier === 'gold' ? sparkle(16, 92, 0.7, 0.3) + sparkle(60, 6, 0.8, 0.9) : ''}</g>` : ''}
  </svg>`;
}

/* ---------- opening ceremony ---------- */
const $ = (s) => document.querySelector(s);
const buzz = (p) => store.setting('haptics') && haptic(p);
const TAPS = 3;
let busy = false;

function setTier(stage, tier, title) {
  stage.dataset.tier = tier;
  stage.style.setProperty('--glow', TIERS[tier].glow);
  $('#chest-title').textContent = title || t(`chest_${tier}`);
}

/** Coins that pop out of the chest and rain down. */
function coinShower(layer, fromEl, count = 16) {
  if (reducedMotion() || !fromEl) return;
  const r = fromEl.getBoundingClientRect();
  const x0 = r.left + r.width / 2;
  const y0 = r.top + r.height * 0.42;
  for (let i = 0; i < count; i++) {
    const c = document.createElement('span');
    c.className = 'fly-icon coin-drop';
    c.innerHTML = '<svg><use href="#i-coin"/></svg>';
    c.style.left = `${x0}px`;
    c.style.top = `${y0}px`;
    layer.appendChild(c);
    const vx = (Math.random() - 0.5) * 320;
    const up = 180 + Math.random() * 160;
    const fall = window.innerHeight * 0.75;
    const frames = [];
    for (let k = 0; k <= 8; k++) {
      const p = k / 8;
      const y = -up * 4 * p * (1 - p) + fall * p * p; // parabola: rise then fall off-screen
      frames.push({
        transform: `translate(calc(-50% + ${vx * p}px), calc(-50% + ${y}px)) rotate(${p * 540 * Math.sign(vx)}deg) scale(${0.6 + 0.5 * Math.min(1, p * 3)})`,
        opacity: p > 0.85 ? 0 : 1,
      });
    }
    const a = c.animate(frames, { duration: 1100 + Math.random() * 500, delay: i * 30, easing: 'linear', fill: 'both' });
    a.onfinish = () => c.remove();
  }
}

/**
 * Open a chest: grants the rewards and plays the ceremony.
 * Resolves with the rewards when the player taps "Collect".
 */
export function openChest({ id, tier: startTier, title }) {
  if (busy || (id && isOpened(id))) return Promise.resolve(null);
  busy = true;
  let tier = startTier;
  if (id) {
    store.data.chests.opened[id] = true;
    save();
  }
  const before = store.data.coins;

  const dlg = $('#modal-chest');
  const stage = $('#chest-stage');
  setTier(stage, tier, title);
  stage.style.setProperty('--crack', 0);
  $('#chest-wrap').innerHTML = chestSVG(tier);
  $('#chest-rewards').innerHTML = '';
  $('#chest-balance').textContent = before;
  $('#chest-upgrade').classList.remove('show');
  const tapsLeft = $('#chest-taps');
  const collect = $('#chest-collect');
  collect.hidden = true;
  stage.dataset.stage = 'drop';
  dlg.showModal();
  sfx.whoosh();

  return new Promise((resolve) => {
    let taps = 0;
    let reward = null;
    let canTap = false;
    const renderTaps = () => {
      tapsLeft.innerHTML = Array.from({ length: TAPS }, (_, i) => `<i class="${i < taps ? 'on' : ''}"></i>`).join('');
    };
    renderTaps();
    const toIdle = setTimeout(
      () => {
        stage.dataset.stage = 'idle';
        canTap = true;
      },
      reducedMotion() ? 0 : 650,
    );
    // Dust puff and a little thud when the chest lands.
    setTimeout(() => {
      replay($('#chest-wrap'), 'landed');
      sfx.chestShake(0);
    }, reducedMotion() ? 0 : 430);

    const onTap = () => {
      if (!canTap || stage.dataset.stage === 'open' || stage.dataset.stage === 'done') return;
      clearTimeout(toIdle);
      taps++;
      renderTaps();
      stage.dataset.stage = 'idle';
      stage.style.setProperty('--crack', taps / TAPS);
      const wrap = $('#chest-wrap');
      wrap.style.setProperty('--amp', taps);
      replay(wrap, 'hit');
      sfx.chestShake(taps - 1);
      buzz(15 + taps * 15);
      burst(wrap, 50, 46, { count: 4 + taps * 3, colors: [TIERS[tier].glow, '#fff'], dist: 40 + taps * 25 });

      // A lucky shake can upgrade the chest before it opens.
      if (taps < TAPS && NEXT_TIER[tier] && Math.random() < UPGRADE_CHANCE[tier]) {
        canTap = false;
        setTimeout(() => {
          tier = NEXT_TIER[tier];
          setTier(stage, tier, title && tier !== startTier ? `${title} · ${t(`tier_${tier}`)}` : title);
          wrap.innerHTML = chestSVG(tier);
          replay($('#chest-flash'), 'flash');
          replay($('#chest-upgrade'), 'show');
          replay(wrap, 'upgraded');
          sfx.upgrade();
          buzz([30, 30, 60]);
          setTimeout(() => (canTap = true), 700);
        }, 280);
        return;
      }
      if (taps >= TAPS) {
        canTap = false;
        setTimeout(reveal, reducedMotion() ? 0 : 320);
      }
    };

    const reveal = () => {
      reward = rollChest(tier);
      store.data.coins += reward.coins + reward.dupe;
      store.data.boosters.hint += reward.hint;
      store.data.boosters.rewind += reward.rewind;
      if (reward.skin) grantSkin(reward.skin.id);
      save();

      stage.dataset.stage = 'open';
      replay($('#chest-flash'), 'flash');
      sfx.chestOpen();
      buzz([30, 40, 60]);
      const wrap = $('#chest-wrap');
      burst(wrap, 50, 45, { count: 28, colors: [TIERS[tier].glow, '#fff', 'var(--c2)', 'var(--c1)'], dist: 160 });
      coinShower(dlg, wrap, tier === 'gold' ? 24 : tier === 'silver' ? 18 : 12);
      setTimeout(() => sfx.coinRain(), 200);

      const items = [{ icon: 'i-coin', label: t('coins'), kind: 'coins', rarity: 'common', amount: reward.coins + reward.dupe }];
      if (reward.hint) items.push({ icon: 'i-hint', amount: reward.hint, label: t('hintName'), kind: 'hint', rarity: 'common' });
      if (reward.rewind) items.push({ icon: 'i-rewind', amount: reward.rewind, label: t('rewindName'), kind: 'rewind', rarity: 'common' });
      if (reward.skin) items.push({ kind: 'skin', skin: reward.skin.id, rarity: reward.skin.rarity, label: t(`skin_${reward.skin.id}`) });

      const box = $('#chest-rewards');
      const step = 420;
      items.forEach((it, i) => {
        setTimeout(() => {
          const card = document.createElement('div');
          card.className = `reward-card rc-${it.kind} r-${it.rarity}`;
          const face =
            it.kind === 'skin'
              ? `${marbleHTML(it.skin, (i + 1) % 4)}<b>${it.label}</b><small>${t(`rarity_${it.rarity}`)}</small><em class="rc-new">${t('newTag')}</em>`
              : `<svg><use href="#${it.icon}"/></svg><b>${it.kind === 'coins' ? '+0' : `×${it.amount}`}</b><small>${it.label}</small>`;
          card.innerHTML = `<div class="rc-inner"><div class="rc-back"><span>?</span></div><div class="rc-front">${face}</div></div>`;
          box.appendChild(card);
          sfx.pop(i);
          setTimeout(() => {
            card.classList.add('flipped');
            sfx.flip(i);
            buzz(12);
            if (it.kind === 'coins') countTo(card.querySelector('b'), 0, it.amount, 700, (v) => `+${v}`);
            if (it.kind === 'skin') {
              sfx.epic();
              buzz([20, 40, 20, 40, 80]);
              burst(card, 50, 40, { count: 22, colors: ['var(--c3)', 'var(--c2)', '#fff', 'var(--c1)'], dist: 110 });
            }
          }, 260);
        }, 500 + i * step);
      });
      setTimeout(
        () => {
          stage.dataset.stage = 'done';
          collect.hidden = false;
          collect.focus();
        },
        800 + items.length * step + (reward.skin ? 400 : 0),
      );
    };

    const onCollect = (e) => {
      e?.stopPropagation();
      collect.hidden = true;
      sfx.coin();
      const coinCard = $('#chest-rewards .rc-coins');
      const bal = $('#chest-balance');
      flyIcons(coinCard, bal.parentElement, {
        count: 10,
        layer: dlg,
        onArrive: (i) => {
          if (i === 0) countTo(bal, before, store.data.coins, 600);
          if (i % 2 === 0) sfx.tick();
          if (i === 9) replay(bal.parentElement, 'bump');
        },
      });
      setTimeout(finish, reducedMotion() ? 0 : 1150);
    };

    const finish = () => {
      stage.removeEventListener('click', onTap);
      collect.removeEventListener('click', onCollect);
      dlg.removeEventListener('cancel', onCancel);
      stage.dataset.stage = 'leaving';
      setTimeout(
        () => {
          dlg.close();
          busy = false;
          resolve(reward);
        },
        reducedMotion() ? 0 : 320,
      );
    };
    const onCancel = (e) => {
      e.preventDefault();
      if (stage.dataset.stage === 'done') onCollect();
      else onTap();
    };

    stage.addEventListener('click', onTap);
    collect.addEventListener('click', onCollect);
    dlg.addEventListener('cancel', onCancel);
  });
}

