import { ODDS, chestSVG, isOpened } from '../chests.js';
import { t } from '../i18n.js';
import { WORLD_HUES } from '../levels.js';
import { LEGEND_BONUS, SETS, SKINS, availableSets, equip, equipped, hasSkin, isSeen, marbleHTML, markAllSeen, setSkins, skinById, skinEvents, skinName } from '../skins.js';
import { sfx } from '../audio.js';
import { burst, replay } from '../fx.js';
import { openChestFlow } from './common.js';
import { $, S, buzz, closeModal, notify, openModal, updateCoins, worldStars } from './core.js';
import { renderMap } from './mapview.js';
import { renderHome } from './home.js';

export function openMapChest(id, tier) {
  return openChestFlow({ id, tier }).then(() => {
    const sc = $('#map-scroll');
    const top = sc.scrollTop;
    S.shownCoins = null;
    renderMap();
    sc.scrollTop = top;
  });
}

export function showChestPreview(id, tier, need) {
  const w = Number(id.slice(1, id.indexOf('-')));
  const have = worldStars(w);
  const ready = have >= need && !isOpened(id);
  const o = ODDS[tier];
  $('#preview-chest').innerHTML = chestSVG(tier);
  $('#preview-chest').dataset.tier = tier;
  $('#preview-title').textContent = t(`chest_${tier}`);
  $('#preview-bar').style.width = `${Math.min(100, (have / need) * 100)}%`;
  $('#preview-count').innerHTML = `${Math.min(have, need)}/${need} <svg><use href="#i-star"/></svg>`;
  const rar = o.rarities.map((r) => t(`rarity_${r}`).toLowerCase()).join(' / ');
  const lines = [
    ['i-coin', t('oddsCoins', { a: o.coins[0], b: o.coins[1] })],
    ['i-hint', t('oddsBoosters', { n: o.boosters })],
    ['i-star', t('oddsSkin', { p: Math.round(o.skin * 100), r: rar })],
  ];
  if (tier !== 'gold') lines.push(['i-flame', t('oddsUpgrade')]);
  $('#preview-list').innerHTML = lines.map(([ic, txt]) => `<li><svg><use href="#${ic}"/></svg><span>${txt}</span></li>`).join('');
  const btn = $('#preview-action');
  btn.textContent = ready ? t('openChest') : t('needStars', { n: need - have });
  btn.classList.toggle('btn-primary', ready);
  btn.classList.toggle('btn-ghost', !ready);
  btn.onclick = () => {
    closeModal('modal-chest-preview');
    if (ready) openMapChest(id, tier);
  };
  openModal('modal-chest-preview');
}

export const setTitle = (set) =>
  set.id === 'classic' ? t('setClassic') : set.id === 'cute' ? t('setCute') : set.id === 'season' ? t('setSeason') : `${t('world', { n: set.world + 1 })} · ${t(`world${set.world}`)}`;

export const setHue = (set) => (set.world >= 0 ? WORLD_HUES[set.world] : set.id === 'cute' ? '#ff7bb0' : set.id === 'season' ? '#ffb02e' : '#9a7bff');

export function skinSource(sk) {
  if (sk.req) return t(sk.req);
  if (sk.rarity === 'legendary') return t('srcLegend');
  if (sk.set === 'classic') return t('srcClassic');
  return t('srcWorld', { n: Number(sk.set.slice(1)) + 1 });
}

export function renderCollection() {
  const eq = equipped();
  const avail = availableSets();
  const total = SKINS.length;
  const have = SKINS.filter((s) => hasSkin(s.id)).length;
  $('#album-count').textContent = t('collTotal', { n: have, t: total });
  $('#album-bar').style.width = `${(have / total) * 100}%`;
  let k = 0;
  $('#album').innerHTML = SETS.map((set) => {
    const list = setSkins(set.id);
    const n = list.filter((s) => hasSkin(s.id)).length;
    const reachable = set.world < 0 || avail.includes(set.id);
    const legend = list.find((s) => s.rarity === 'legendary');
    const tiles = list
      .map((sk) => {
        const own = hasSkin(sk.id);
        const fresh = own && !isSeen(sk.id);
        return `<button class="al-tile r-${sk.rarity} ${own ? '' : 'is-locked'} ${sk.id === eq ? 'is-equipped' : ''}" data-skin="${sk.id}" style="--i:${k++}">
          ${fresh ? `<em class="al-new">${t('newShort')}</em>` : ''}
          ${own ? marbleHTML(sk.id, (k + 1) % 4) : marbleHTML('classic', 0, 'silhouette')}
          <strong>${own ? skinName(sk.id) : '?'}</strong>
          ${sk.id === eq ? '<i class="al-eq">✓</i>' : ''}
        </button>`;
      })
      .join('');
    const note = !reachable
      ? `<p class="al-note"><svg><use href="#i-lock"/></svg>${t('srcLockedWorld', { n: set.world + 1 })}</p>`
      : legend && !hasSkin(legend.id)
        ? `<p class="al-note"><svg><use href="#i-gift"/></svg>${t('setReward', { n: LEGEND_BONUS })}</p>`
        : '';
    return `<section class="al-set ${reachable ? '' : 'is-far'} ${n === list.length ? 'is-done' : ''}" style="--hue:${setHue(set)}">
      <header class="al-head"><strong>${setTitle(set)}</strong><span class="al-count">${n === list.length ? '✓ ' : ''}${n}/${list.length}</span>
        <span class="al-bar"><i style="width:${(n / list.length) * 100}%"></i></span></header>
      <div class="al-grid">${tiles}</div>
      ${note}
    </section>`;
  }).join('');
}

export function showSkin(id) {
  const sk = skinById(id);
  const own = hasSkin(id);
  const card = $('#modal-skin .modal-card');
  const set = SETS.find((x) => x.id === sk.set);
  card.style.setProperty('--hue', setHue(set));
  card.dataset.rarity = sk.rarity;
  $('#sd-marble').innerHTML = own ? marbleHTML(id, 0) : marbleHTML('classic', 0, 'silhouette');
  $('#sd-rarity').textContent = t(`rarity_${sk.rarity}`);
  $('#sd-name').textContent = own ? skinName(id) : '???';
  $('#sd-set').textContent = setTitle(set);
  $('#sd-src').textContent = skinSource(sk);
  $('#sd-colors').innerHTML = own ? [0, 1, 2, 3].map((c) => `<button type="button" class="sd-color ${c === 0 ? 'is-on' : ''}" data-c="${c}">${marbleHTML(id, c)}</button>`).join('') : '';
  $('#sd-hint').hidden = !own;
  $('#modal-skin .sd-colors-title').hidden = !own;
  const btn = $('#sd-equip');
  btn.hidden = !own;
  btn.disabled = equipped() === id;
  btn.textContent = equipped() === id ? `✓ ${t('equipped')}` : t('equip');
  btn.onclick = () => {
    if (!equip(id)) return;
    sfx.pop(2);
    buzz(15);
    replay($('#sd-marble .marble-preview'), 'got');
    btn.disabled = true;
    btn.textContent = `✓ ${t('equipped')}`;
    renderCollection();
    renderHome();
  };
  openModal('modal-skin');
  if (own) {
    startSpinner();
    if (sk.rarity === 'legendary' || sk.rarity === 'epic') setTimeout(() => burst($('.sd-stage'), 50, 45, { count: sk.rarity === 'legendary' ? 18 : 10, colors: ['#fff', 'var(--hue)', '#ffd34d'], dist: 110 }), 250);
    setTimeout(() => sfx.pop(sk.rarity === 'legendary' ? 3 : 1), 200);
  }
}

/* ---------- big marble: spins by itself, and follows the finger ---------- */
let spin = 0;
let vel = 25; // degrees per second
let raf = 0;
let drag = null;
function ballEl() {
  return $('#sd-marble .ball');
}
function startSpinner() {
  cancelAnimationFrame(raf);
  spin = 0;
  vel = 25;
  let last = performance.now();
  const step = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!drag) {
      spin += vel * dt;
      // a flick slows down back to the gentle idle turn
      vel += (Math.sign(vel || 1) * 25 - vel) * Math.min(1, dt * 1.6);
    }
    const b = ballEl();
    if (b) {
      b.style.setProperty('--roll', '0ms');
      b.style.setProperty('--spin', `${spin}deg`);
    }
    if ($('#modal-skin').open) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}
const stage = $('#modal-skin .sd-stage');
stage.addEventListener('pointerdown', (e) => {
  if (!ballEl() || $('#sd-marble .silhouette')) return;
  drag = { x: e.clientX, spin, t: performance.now(), lastX: e.clientX };
  stage.setPointerCapture?.(e.pointerId);
  stage.classList.add('is-grab');
});
stage.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const now = performance.now();
  const dx = e.clientX - drag.lastX;
  const dt = Math.max(1, now - drag.t) / 1000;
  spin = drag.spin + (e.clientX - drag.x) * 1.6;
  vel = Math.max(-900, Math.min(900, (dx * 1.6) / dt));
  drag.lastX = e.clientX;
  drag.t = now;
});
const release = () => {
  if (!drag) return;
  drag = null;
  stage.classList.remove('is-grab');
  if (Math.abs(vel) > 200) sfx.flip(1);
};
stage.addEventListener('pointerup', release);
stage.addEventListener('pointercancel', release);
$('#sd-colors').addEventListener('click', (e) => {
  const b = e.target.closest('.sd-color');
  if (!b) return;
  const c = b.dataset.c;
  $('#sd-colors').querySelectorAll('.sd-color').forEach((x) => x.classList.toggle('is-on', x === b));
  const ball = ballEl();
  if (ball) ball.className = `ball c${c}`;
  replay($('#sd-marble .marble-preview'), 'got');
  sfx.pop(Number(c));
});

$('#album').addEventListener('click', (e) => {
  const tile = e.target.closest('.al-tile');
  if (!tile) return;
  sfx.tap();
  showSkin(tile.dataset.skin);
});

skinEvents?.addEventListener('setComplete', (e) => {
  setTimeout(() => {
    notify('i-gift', t('setDoneTitle'), `${skinName(e.detail.legend)} · +${LEGEND_BONUS}`, 'levelup');
    updateCoins(true);
  }, 1200);
});

$('#btn-collection').addEventListener('click', () => {
  sfx.tap();
  renderCollection();
  openModal('modal-collection');
  markAllSeen();
  renderHome();
});
