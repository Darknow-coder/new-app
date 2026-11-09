// Chests: definitions, reward rolls, artwork and the opening ceremony.
//
// The ceremony is one continuous, script-driven sequence (Web Animations API +
// a particle canvas). Only transform/opacity are animated, so it stays smooth
// on phones:  drop → idle float → [tap] → charge & shake → burst open →
// rewards fly out of the chest → [collect] → coins fly to the balance → fade out.
import { store, save } from './storage.js';
import { sfx, haptic } from './audio.js';
import { t } from './i18n.js';
import { flyIcons, countTo, reducedMotion } from './fx.js';
import { pickSkin, grantSkin, marbleHTML, skinName } from './skins.js';
import { worldOf } from './levels.js';

export const TIERS = {
  wood: { body: '#b5692f', bodyD: '#7a3f17', lid: '#d18646', lidD: '#94501f', metal: '#ffd46e', metalD: '#c98a1c', out: '#43200a', gem: null, glow: '#ffcf6b' },
  silver: { body: '#5d6fcc', bodyD: '#36428a', lid: '#7d8de6', lidD: '#4653a3', metal: '#f2f5ff', metalD: '#a3aed6', out: '#1f2656', gem: '#41d5ff', glow: '#bfe0ff' },
  gold: { body: '#f2a51a', bodyD: '#b8670a', lid: '#ffc845', lidD: '#d5850d', metal: '#fff7d6', metalD: '#e0ad48', out: '#5e3300', gem: '#ff3d6e', glow: '#fff0a0' },
};
const NEXT_TIER = { wood: 'silver', silver: 'gold' };
// Chance that a chest upgrades itself while it charges up.
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
export function rollChest(tier, world = null) {
  const o = ODDS[tier];
  const r = { coins: round5(rnd(o.coins[0], o.coins[1])), hint: 0, rewind: 0, skin: null, dupe: 0 };
  if (tier === 'gold') {
    r.hint = 2;
    r.rewind = 2;
  } else {
    for (let i = 0; i < o.boosters; i++) r[Math.random() < 0.45 || (tier === 'silver' && i === 0) ? 'hint' : 'rewind']++;
  }
  if (Math.random() < o.skin) {
    const s = pickSkin(o.rarities, world);
    if (s) r.skin = s;
    else if (tier === 'gold') r.dupe = 100; // collection complete: convert into coins
  }
  return r;
}

/* ==========================================================================
   Artwork — cartoon chest with outline, gradients, bands, rivets and gem.
   The lid is its own group (hinged at the bottom) so it can open.
   ========================================================================== */
let svgSeq = 0;
function sparkle(x, y, s, d) {
  return `<path class="chest-sparkle" style="animation-delay:${d}s" transform="translate(${x} ${y}) scale(${s})" d="M0-6L1.5-1.5 6 0 1.5 1.5 0 6-1.5 1.5-6 0-1.5-1.5z" fill="#fff"/>`;
}

export function chestSVG(tier, cls = '') {
  const c = TIERS[tier];
  const u = `cx${++svgSeq}`;
  const wood = tier === 'wood';
  const rivet = (x, y) => `<circle cx="${x}" cy="${y}" r="2" fill="${c.metalD}" stroke="${c.out}" stroke-width="1"/>`;
  return `
  <svg class="chest-svg tier-${tier} ${cls}" viewBox="0 0 120 112" aria-hidden="true">
    <defs>
      <linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.body}"/><stop offset="1" stop-color="${c.bodyD}"/></linearGradient>
      <linearGradient id="${u}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.lid}"/><stop offset="1" stop-color="${c.lidD}"/></linearGradient>
      <linearGradient id="${u}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.metal}"/><stop offset="1" stop-color="${c.metalD}"/></linearGradient>
      <radialGradient id="${u}g" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#fff" stop-opacity=".95"/>
        <stop offset=".75" stop-color="${c.glow}" stop-opacity=".8"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse class="chest-shadow" cx="60" cy="104" rx="44" ry="6" fill="rgba(0,0,0,.3)"/>
    <g class="chest-inner"><ellipse cx="60" cy="53" rx="47" ry="11" fill="url(#${u}g)"/></g>
    <g class="chest-body">
      <path d="M12 54H108V92Q108 102 98 102H22Q12 102 12 92Z" fill="url(#${u}b)" stroke="${c.out}" stroke-width="3" stroke-linejoin="round"/>
      ${wood ? `<path d="M14 70H106M14 86H106" stroke="${c.bodyD}" stroke-width="2" opacity=".7"/>` : ''}
      <path d="M14 90V92Q14 100 22 100H98Q106 100 106 92V90Z" fill="#000" opacity=".14"/>
      <path d="M18 64V92" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".22"/>
      <rect x="24" y="54" width="10" height="47" fill="url(#${u}m)" stroke="${c.out}" stroke-width="2"/>
      <rect x="86" y="54" width="10" height="47" fill="url(#${u}m)" stroke="${c.out}" stroke-width="2"/>
      ${rivet(29, 72)}${rivet(29, 90)}${rivet(91, 72)}${rivet(91, 90)}
      <rect x="11" y="52" width="98" height="9" rx="3" fill="url(#${u}m)" stroke="${c.out}" stroke-width="2.5"/>
      <rect x="48" y="58" width="24" height="27" rx="7" fill="url(#${u}m)" stroke="${c.out}" stroke-width="2.5"/>
      <circle cx="60" cy="68" r="3.6" fill="${c.out}"/>
      <path d="M58.4 69H61.6L62.6 77H57.4Z" fill="${c.out}"/>
    </g>
    <rect class="chest-seam" x="13" y="49" width="94" height="6" rx="3" fill="${c.glow}"/>
    <g class="chest-lid">
      <path d="M11 54V40C11 22 33 13 60 13S109 22 109 40V54Z" fill="url(#${u}l)" stroke="${c.out}" stroke-width="3" stroke-linejoin="round"/>
      ${wood ? `<path d="M13 40H107M17 27H103" stroke="${c.lidD}" stroke-width="2" opacity=".75"/>` : ''}
      <path d="M24 54V20.6Q29 18.6 34 17.7V54Z" fill="url(#${u}m)" stroke="${c.out}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M86 54V17.7Q91 18.6 96 20.6V54Z" fill="url(#${u}m)" stroke="${c.out}" stroke-width="2" stroke-linejoin="round"/>
      ${rivet(29, 30)}${rivet(91, 30)}
      <rect x="11" y="46" width="98" height="9" rx="3" fill="url(#${u}m)" stroke="${c.out}" stroke-width="2.5"/>
      <path d="M22 33C32 24 46 20 60 20" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".4"/>
      ${c.gem ? `<path d="M60 21L69 30L60 41L51 30Z" fill="${c.gem}" stroke="${c.out}" stroke-width="2.2" stroke-linejoin="round"/><path d="M55 30L60 25L63 28" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".85"/>` : ''}
    </g>
    ${tier !== 'wood' ? `<g class="chest-sparkles">${sparkle(6, 38, 0.9, 0)}${sparkle(114, 28, 0.7, 0.6)}${sparkle(104, 90, 0.6, 1.1)}${tier === 'gold' ? sparkle(14, 92, 0.7, 0.3) + sparkle(60, 4, 0.8, 0.9) : ''}</g>` : ''}
  </svg>`;
}

/* ==========================================================================
   Particles (canvas): sparks, coins, dust and slow floating motes.
   ========================================================================== */
class ParticleFX {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.parts = [];
    this.running = false;
    this.motes = false;
    this.color = '#fff';
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.c.width = this.w * dpr;
    this.c.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  start() {
    this.resize();
    this.parts = [];
    this.running = true;
    this.last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.step(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  stop() {
    this.running = false;
    this.motes = false;
    this.ctx.clearRect(0, 0, this.w, this.h);
  }
  burst(x, y, { sparks = 36, coins = 14, color = '#fff' } = {}) {
    if (reducedMotion()) return;
    for (let i = 0; i < sparks; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 220 + Math.random() * 420;
      this.parts.push({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: 0.7 + Math.random() * 0.5, age: 0, r: 2 + Math.random() * 3, col: Math.random() < 0.5 ? color : '#fff', g: 380, drag: 2.2 });
    }
    for (let i = 0; i < coins; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const v = 380 + Math.random() * 300;
      this.parts.push({ k: 'coin', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.6, age: 0, r: 9 + Math.random() * 4, spin: Math.random() * 6, g: 1100, drag: 0.4 });
    }
  }
  dust(x, y) {
    if (reducedMotion()) return;
    for (let i = 0; i < 18; i++) {
      const dir = i % 2 ? 1 : -1;
      this.parts.push({ k: 'dust', x: x + dir * Math.random() * 40, y, vx: dir * (60 + Math.random() * 160), vy: -20 - Math.random() * 50, life: 0.6 + Math.random() * 0.3, age: 0, r: 6 + Math.random() * 8, g: 60, drag: 3 });
    }
  }
  step(dt) {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    if (this.motes && !reducedMotion() && Math.random() < 0.35) {
      this.parts.push({ k: 'mote', x: Math.random() * this.w, y: this.h + 10, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 60, life: 6, age: 0, r: 1.5 + Math.random() * 2.5, g: 0, drag: 0 });
    }
    const keep = [];
    for (const p of this.parts) {
      p.age += dt;
      if (p.age >= p.life) continue;
      p.vx -= p.vx * p.drag * dt;
      p.vy += p.g * dt - p.vy * p.drag * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = 1 - p.age / p.life;
      if (p.k === 'spark') {
        ctx.globalAlpha = k;
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.4 + k * 0.6), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.k === 'coin') {
        p.spin += dt * 9;
        const sx = Math.abs(Math.cos(p.spin));
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(Math.max(0.15, sx), 1);
        ctx.fillStyle = '#d48a0c';
        ctx.beginPath();
        ctx.arc(0, 1.5, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffc23d';
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe7a3';
        ctx.beginPath();
        ctx.arc(-p.r * 0.3, -p.r * 0.3, p.r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.k === 'dust') {
        ctx.globalAlpha = k * 0.35;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1.6 - k * 0.6), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = Math.min(1, p.age * 2) * k * 0.8;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(p.age * 2 + p.r) * 8, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      keep.push(p);
    }
    ctx.globalAlpha = 1;
    this.parts = keep;
  }
}

/* ==========================================================================
   Ceremony
   ========================================================================== */
const $ = (s) => document.querySelector(s);
const buzz = (p) => store.setting('haptics') && haptic(p);
const wait = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? 0 : ms));
let fx = null;
let busy = false;

/** Animate with the Web Animations API; resolves when finished. Keeps the final frame. */
function anim(el, frames, opts) {
  if (!el) return Promise.resolve();
  const a = el.animate(frames, { fill: 'forwards', ...opts, duration: reducedMotion() ? 1 : opts.duration });
  return a.finished.catch(() => {});
}

/** Centre of the chest mouth (where the lid meets the body), in viewport pixels. */
function mouth() {
  const r = $('#chest-wrap').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height * (52 / 112) };
}

/** Escalating shake keyframes for the charge-up. */
function shakeFrames(steps, from, to) {
  const f = [];
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const amp = from + (to - from) * p;
    const dir = i % 2 ? 1 : -1;
    const sc = 1 + 0.12 * p;
    f.push({ transform: `translate(${dir * amp * 0.8}px, ${-amp * 0.3}px) rotate(${dir * amp}deg) scale(${sc}, ${sc * (1 - 0.04 * p)})` });
  }
  return f;
}

function rewardItems(reward) {
  const items = [{ kind: 'coins', icon: 'i-coin', amount: reward.coins + reward.dupe, label: t('coins'), rarity: 'common' }];
  if (reward.hint) items.push({ kind: 'hint', icon: 'i-hint', amount: reward.hint, label: t('hintName'), rarity: 'common' });
  if (reward.rewind) items.push({ kind: 'rewind', icon: 'i-rewind', amount: reward.rewind, label: t('rewindName'), rarity: 'common' });
  if (reward.skin) items.push({ kind: 'skin', skin: reward.skin.id, rarity: reward.skin.rarity, label: skinName(reward.skin.id) });
  return items;
}

/**
 * Open a chest: grants the rewards and plays the ceremony.
 * Resolves with the rewards once the player has collected them.
 */
export function openChest({ id, tier: startTier, title }) {
  if (busy || (id && isOpened(id))) return Promise.resolve(null);
  busy = true;
  if (id) {
    store.data.chests.opened[id] = true;
    save();
  }
  let tier = startTier;
  const before = store.data.coins;
  const dlg = $('#modal-chest');
  const root = $('#chest-stage');
  const chest = $('#chest-wrap');
  const stage = $('#cx-stage');
  const rays = $('#cx-rays');
  const glow = $('#cx-glow');
  const hint = $('#cx-hint');
  const collect = $('#chest-collect');
  const box = $('#chest-rewards');
  const setTier = (tr) => {
    root.className = `cx tier-${tr}`;
    root.style.setProperty('--glow', TIERS[tr].glow);
    $('#chest-title').textContent = title && tr === startTier ? title : t(`chest_${tr}`);
    chest.innerHTML = chestSVG(tr);
  };

  // Reset the scene.
  for (const el of [root, chest, stage, rays, glow, hint, collect, box, $('#chest-title'), $('#cx-flash'), $('#chest-upgrade')]) {
    el.getAnimations().forEach((a) => a.cancel());
  }
  setTier(tier);
  box.innerHTML = '';
  collect.hidden = true;
  $('#chest-balance').textContent = before;
  root.dataset.stage = 'drop';
  dlg.showModal();
  fx = fx || new ParticleFX($('#cx-fx'));
  fx.start();
  fx.color = TIERS[tier].glow;

  return new Promise((resolve) => {
    let onTap = null;
    let floatAnim = null;
    let glowAnim = null;

    const run = async () => {
      // 1. Entrance: backdrop, title, chest drop with squash & bounce.
      anim(root.querySelector('.cx-bg'), [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
      anim($('#chest-title'), [{ opacity: 0, transform: 'translateY(-20px) scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: 450, delay: 150, easing: 'cubic-bezier(.3,1.5,.5,1)' });
      sfx.whoosh();
      await anim(
        chest,
        [
          { transform: 'translateY(-110vh) scale(.7) rotate(-8deg)', easing: 'cubic-bezier(.55,0,1,.45)' },
          { transform: 'translateY(0) scale(1.14,.82)', offset: 0.62, easing: 'cubic-bezier(.2,.8,.3,1)' },
          { transform: 'translateY(-18px) scale(.95,1.06)', offset: 0.8, easing: 'cubic-bezier(.5,0,.8,.5)' },
          { transform: 'translateY(0) scale(1.03,.97)', offset: 0.92 },
          { transform: 'none' },
        ],
        { duration: 900 },
      );
      // Landing hits at 62% of the drop: play the thud a bit before the end.
      const m = mouth();
      fx.dust(m.x, m.y + chest.getBoundingClientRect().height * 0.45);
      sfx.land();
      buzz(25);

      // 2. Idle: gentle float + breathing glow, wait for the tap.
      root.dataset.stage = 'idle';
      floatAnim = chest.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }, { transform: 'translateY(0)' }],
        { duration: 1800, iterations: Infinity, easing: 'ease-in-out' },
      );
      glowAnim = glow.animate([{ opacity: 0.25, transform: 'scale(.7)' }, { opacity: 0.45, transform: 'scale(.8)' }, { opacity: 0.25, transform: 'scale(.7)' }], {
        duration: 1800,
        iterations: Infinity,
        easing: 'ease-in-out',
      });
      anim(hint, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 300 });
      await new Promise((r) => (onTap = r));
      onTap = null;

      // 3. Charge-up: escalating shake, growing glow, light leaking from the seam.
      root.dataset.stage = 'charge';
      anim(hint, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
      floatAnim.cancel();
      glowAnim.cancel();
      const seam = () => chest.querySelector('.chest-seam');
      const charge = async (ms, from, to) => {
        sfx.charge(ms / 1000);
        const steps = Math.max(8, Math.round(ms / 45));
        anim(seam(), [{ opacity: from / 10 }, { opacity: 1 }], { duration: ms });
        anim(glow, [{ opacity: 0.3 + from / 20, transform: `scale(${0.7 + from / 30})` }, { opacity: 0.85, transform: 'scale(1.1)' }], { duration: ms, easing: 'ease-in' });
        buzz(20);
        setTimeout(() => buzz(30), ms * 0.5);
        await anim(chest, shakeFrames(steps, from, to), { duration: ms, easing: 'linear' });
      };
      await charge(700, 1, 5);
      if (NEXT_TIER[tier] && Math.random() < UPGRADE_CHANCE[tier]) {
        // Lucky! Flash, swap to the next tier, banner, then charge a little more.
        anim($('#cx-flash'), [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }], { duration: 600 });
        await wait(140);
        tier = NEXT_TIER[tier];
        setTier(tier);
        fx.color = TIERS[tier].glow;
        sfx.upgrade();
        buzz([30, 30, 60]);
        anim(
          $('#chest-upgrade'),
          [
            { opacity: 0, transform: 'translate(-50%,0) scale(.4) rotate(-6deg)' },
            { opacity: 1, transform: 'translate(-50%,0) scale(1.15) rotate(-3deg)', offset: 0.2 },
            { opacity: 1, transform: 'translate(-50%,0) scale(1) rotate(-3deg)', offset: 0.75 },
            { opacity: 0, transform: 'translate(-50%,-30px) scale(.9) rotate(-3deg)' },
          ],
          { duration: 1500 },
        );
        await charge(600, 3, 7);
      } else {
        await charge(350, 5, 8);
      }

      // 4. Burst: the lid swings open on its hinge, flash, rays, sparks & coins.
      const world = id && /^w\d+-/.test(id) ? Number(id.slice(1, id.indexOf('-'))) : worldOf(store.data.levels.unlocked);
      const reward = rollChest(tier, world);
      store.data.coins += reward.coins + reward.dupe;
      store.data.boosters.hint += reward.hint;
      store.data.boosters.rewind += reward.rewind;
      if (reward.skin) grantSkin(reward.skin.id);
      save();

      root.dataset.stage = 'open';
      sfx.chestOpen();
      setTimeout(() => sfx.coinRain(), 220);
      buzz([40, 30, 80]);
      anim($('#cx-flash'), [{ opacity: 0 }, { opacity: 0.95, offset: 0.15 }, { opacity: 0 }], { duration: 650, easing: 'ease-out' });
      anim(chest, [{ transform: 'scale(1.12,.88)' }, { transform: 'scale(.94,1.08)', offset: 0.4 }, { transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.3,1.4,.5,1)' });
      anim(
        chest.querySelector('.chest-lid'),
        [
          { transform: 'none' },
          { transform: 'translateY(-22px) scaleY(1.06) rotate(-3deg)', offset: 0.35 },
          { transform: 'translateY(-11px) scaleY(.5)' },
        ],
        { duration: 520, easing: 'cubic-bezier(.2,1.2,.4,1)' },
      );
      anim(chest.querySelector('.chest-inner'), [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      anim(seam(), [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
      anim(glow, [{ opacity: 0.85, transform: 'scale(1.1)' }, { opacity: 1, transform: 'scale(1.5)' }], { duration: 500, easing: 'ease-out' }).then(() => {
        glowAnim = glow.animate([{ transform: 'scale(1.5)' }, { transform: 'scale(1.62)' }, { transform: 'scale(1.5)' }], { duration: 2400, iterations: Infinity, easing: 'ease-in-out' });
      });
      anim(rays, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 600, easing: 'cubic-bezier(.2,1.2,.4,1)' }).then(() => {
        rays.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 22000, iterations: Infinity });
      });
      const m2 = mouth();
      fx.burst(m2.x, m2.y, { color: TIERS[tier].glow, coins: tier === 'gold' ? 20 : tier === 'silver' ? 15 : 10 });
      fx.motes = true;

      // 5. The chest lifts up to make room; rewards fly out of it one by one.
      await wait(450);
      anim(stage, [{ transform: 'none' }, { transform: 'translateY(-24px) scale(.86)' }], { duration: 600, easing: 'cubic-bezier(.3,1.1,.4,1)' });
      await wait(250);
      const items = rewardItems(reward);
      box.innerHTML = items
        .map(
          (it) => `<div class="cx-reward rc-${it.kind} r-${it.rarity}">
            ${it.kind === 'skin' ? `<em class="cx-new">${t('newTag')}</em>${marbleHTML(it.skin, 3)}` : `<svg><use href="#${it.icon}"/></svg>`}
            <b>${it.kind === 'coins' ? '+0' : it.kind === 'skin' ? it.label : `×${it.amount}`}</b>
            <small>${it.kind === 'skin' ? t(`rarity_${it.rarity}`) : it.label}</small>
          </div>`,
        )
        .join('');
      const cards = [...box.children];
      cards.forEach((c) => (c.style.opacity = '0'));
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const it = items[i];
        const r = card.getBoundingClientRect();
        const m3 = mouth();
        const dx = m3.x - (r.left + r.width / 2);
        const dy = m3.y - (r.top + r.height / 2);
        card.style.opacity = '';
        sfx.pop(i);
        buzz(15);
        anim(
          card,
          [
            { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(.2)` },
            { opacity: 1, transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 90}px) scale(1.15)`, offset: 0.55 },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 620, easing: 'cubic-bezier(.3,.7,.4,1)' },
        ).then(() => {
          card.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], {
            duration: 2600,
            delay: i * 300,
            iterations: Infinity,
            easing: 'ease-in-out',
          });
          if (it.kind === 'coins') countTo(card.querySelector('b'), 0, it.amount, 700, (v) => `+${v}`);
          if (it.kind === 'skin') {
            sfx.epic();
            buzz([20, 40, 20, 40, 80]);
            const cr = card.getBoundingClientRect();
            fx.burst(cr.left + cr.width / 2, cr.top + cr.height / 2, { sparks: 30, coins: 0, color: '#c58bff' });
          }
        });
        await wait(it.kind === 'skin' ? 700 : 380);
      }
      await wait(450);

      // 6. Collect.
      root.dataset.stage = 'done';
      collect.hidden = false;
      anim(collect, [{ opacity: 0, transform: 'translateY(20px) scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: 'cubic-bezier(.3,1.5,.5,1)' });
      collect.focus();
      await new Promise((r) => (onTap = r));
      onTap = null;
      collect.hidden = true;
      sfx.coin();
      const coinCard = box.querySelector('.rc-coins');
      const pill = $('#cx-coins');
      flyIcons(coinCard, pill, {
        count: 10,
        layer: dlg,
        onArrive: (i) => {
          if (i === 0) countTo($('#chest-balance'), before, store.data.coins, 500);
          if (i % 2 === 0) sfx.tick();
          if (i === 9) anim(pill, [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 300 });
        },
      });
      cards.forEach((c, i) => anim(c, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-24px) scale(.7)' }], { duration: 350, delay: 250 + i * 60, easing: 'ease-in' }));
      await wait(1100);

      // 7. Exit.
      await anim(root, [{ opacity: 1 }, { opacity: 0, transform: 'scale(1.04)' }], { duration: 300, easing: 'ease-in' });
      fx.stop();
      dlg.close();
      root.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      busy = false;
      cleanup();
      resolve(reward);
    };

    const tap = (e) => {
      if (onTap && (root.dataset.stage === 'idle' || (root.dataset.stage === 'done' && e?.type !== 'click-stage'))) onTap();
    };
    const onStageClick = (e) => {
      if (root.dataset.stage === 'idle') tap(e);
    };
    const onCollect = (e) => {
      e.stopPropagation();
      if (root.dataset.stage === 'done') tap(e);
    };
    const onCancel = (e) => {
      e.preventDefault();
      tap(e);
    };
    const cleanup = () => {
      root.removeEventListener('click', onStageClick);
      collect.removeEventListener('click', onCollect);
      dlg.removeEventListener('cancel', onCancel);
    };
    root.addEventListener('click', onStageClick);
    collect.addEventListener('click', onCollect);
    dlg.addEventListener('cancel', onCancel);
    run();
  });
}
