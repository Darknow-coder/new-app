import { LEVELS_PER_WORLD, WORLD_HUES, adventureLevel, introAt, isBoss, worldOf } from '../levels.js';
import { WORLD_CHESTS, chestId, chestSVG, isOpened } from '../chests.js';
import { t } from '../i18n.js';
import { hasSkin, marbleHTML, setSkins } from '../skins.js';
import { MAP_THEMES, ensureMapDefs, roadD, worldScene } from '../map.js';
import { store } from '../storage.js';
import { setMusicTheme, sfx } from '../audio.js';
import { burst, iris, reducedMotion, replay } from '../fx.js';
import { comboReachable } from '../engine.js';
import { $, S, buzz, closeModal, els, openModal, showView, starsHTML, toast, updateCoins, worldHue, worldName, worldStars } from './core.js';
import { showChestPreview } from './collection.js';
import { startLevel } from './game.js';

export const ROW = 92;

export function nodeX(n) {
  return 50 + 30 * Math.sin(n * 0.8);
}

export function worldBanner(w, ws, first, unlocked) {
  const max = LEVELS_PER_WORLD * 3;
  const marks = WORLD_CHESTS.map((c) => {
    const id = chestId(w, c.k);
    const state = isOpened(id) ? 'opened' : ws >= c.stars ? 'ready' : 'locked';
    return `<b class="wh-mark is-${state}" style="left:${(c.stars / max) * 100}%">${chestSVG(c.tier, state === 'opened' ? 'is-open' : '')}</b>`;
  }).join('');
  return `
    <header class="world-head">
      <span class="wh-badge"><span>${w + 1}</span></span>
      <span class="wh-text"><small>${t('world', { n: w + 1 })}</small><strong>${worldName(w)}</strong></span>
      <span class="world-stars"><svg><use href="#i-star"/></svg>${ws}/${max}</span>
      ${w < 8 ? (() => { const list = setSkins(`w${w}`); const got = list.filter((x) => hasSkin(x.id)); return `<span class="wh-set">${marbleHTML(got.length ? got[got.length - 1].id : 'classic', w % 4, got.length ? '' : 'silhouette')}${got.length}/${list.length}</span>`; })() : ''}
      <span class="wh-bar"><i style="width:${(ws / max) * 100}%"></i>${marks}</span>
    </header>`;
}

export let sceneIO = null;

export const hideUnlockWorld = (n) => (n ? worldOf(n) : -1);

export function renderMap({ hideUnlock = 0 } = {}) {
  ensureMapDefs();
  const unlocked = store.data.levels.unlocked;
  const lastWorld = worldOf(unlocked) + 1; // show the next world as a locked preview
  const map = els.mapEl;
  map.innerHTML = '';
  let total = 0;
  const scenes = [];
  for (let w = 0; w <= lastWorld; w++) {
    const hue = WORLD_HUES[w % WORLD_HUES.length];
    const theme = w % WORLD_HUES.length;
    const mt = MAP_THEMES[theme];
    const first = w * LEVELS_PER_WORLD + 1;
    const ws = worldStars(w);
    total += ws;
    const locked = first > unlocked;

    const sec = document.createElement('section');
    sec.className = `world theme-${theme} ${locked ? 'is-locked' : ''} ${w === worldOf(unlocked) ? 'is-here' : ''}`;
    sec.dataset.world = w;
    sec.style.setProperty('--hue', hue);
    sec.style.setProperty('--g0', mt.g0);
    sec.style.setProperty('--g1', mt.g1);
    sec.style.setProperty('--prev', w ? MAP_THEMES[(w - 1) % MAP_THEMES.length].g1 : mt.g0);
    sec.style.setProperty('--road', mt.road);
    const height = LEVELS_PER_WORLD * ROW + 90;
    const pts = []; // [xPercent, y]
    let lit = 0; // how many of pts are on the lit part of the road
    let nodes = '';
    const avoid = [];
    for (let i = 0; i < LEVELS_PER_WORLD; i++) {
      const n = first + i;
      const x = nodeX(n);
      const y = i * ROW + 50;
      pts.push([x, y]);
      if (n <= unlocked && n !== hideUnlock) lit = pts.length;
      const stars = store.levelStars(n);
      let state = n < unlocked || stars ? 'done' : n === unlocked ? 'current' : 'locked';
      if (n === hideUnlock) state = 'locked';
      const inner = state === 'locked' ? '<svg><use href="#i-lock"/></svg>' : `<span>${n}</span>`;
      const starRow = state === 'done' ? `<span class="node-stars">${starsHTML(stars)}</span>` : '';
      const tag = isBoss(n) ? '<em>BOSS</em>' : introAt(n) ? `<em class="em-new">${t('newShort')}</em>` : '';
      nodes += `<button class="node is-${state} ${isBoss(n) ? 'is-boss' : ''}" data-n="${n}" data-i="${i}" style="left:${x}%;top:${y}px;--i:${i}" aria-label="${t('level', { n })}${stars ? `, ${stars}/3` : ''}">${inner}${starRow}${tag}</button>`;
      if (state === 'current') nodes += `<i class="you-are-here" style="left:${x}%;top:${y}px"></i>`;
    }
    // Star chests along the road.
    for (const c of WORLD_CHESTS) {
      const id = chestId(w, c.k);
      const opened = isOpened(id);
      const ready = !opened && ws >= c.stars;
      let x;
      let y;
      if (c.after >= LEVELS_PER_WORLD) {
        x = 50;
        y = LEVELS_PER_WORLD * ROW + 30;
        pts.push([x, y]);
        if (unlocked > first + LEVELS_PER_WORLD - 1) lit = pts.length;
      } else {
        const mid = (nodeX(first + c.after - 1) + nodeX(first + c.after)) / 2;
        x = mid > 50 ? 20 : 80;
        y = (c.after - 1) * ROW + 50 + ROW / 2;
      }
      avoid.push([x, y, 44]);
      const state = opened ? 'opened' : ready ? 'ready' : 'locked';
      const label = ready
        ? `<b class="chest-label">${t('chestReady')}</b>`
        : opened
          ? ''
          : `<b class="chest-label">${Math.min(ws, c.stars)}/${c.stars}<svg><use href="#i-star"/></svg></b>`;
      nodes += `<button class="chest-node is-${state}" data-chest="${id}" data-tier="${c.tier}" data-need="${c.stars}" style="left:${x}%;top:${y}px" aria-label="${t(`chest_${c.tier}`)}">${chestSVG(c.tier, opened ? 'is-open' : '')}${label}</button>`;
    }
    const fog = locked
      ? `<div class="world-fog"><span><svg><use href="#i-lock"/></svg>${t('worldLocked', { n: w })}</span></div>`
      : '';
    sec.innerHTML = `
      ${worldBanner(w, ws, first, unlocked)}
      <div class="world-path" style="height:${height}px">
        <svg class="map-scene" aria-hidden="true"></svg>
        ${nodes}
        ${fog}
      </div>`;
    sec.style.containIntrinsicSize = `auto ${height + 180}px`;
    map.appendChild(sec);
    scenes.push({ sec, w, height, pts, lit, avoid, lastWorld: w === lastWorld });
  }
  // Second pass, now that sizes are known: draw scenery and road in real pixels.
  // Read layout once (all sections share the same banner height), then only write.
  const firstPath = map.querySelector('.world-path');
  const W = firstPath?.clientWidth || 360;
  const top = firstPath?.offsetTop || 140; // road enters from the top of the section
  const draw = (sc) => {
    if (sc.drawn) return;
    sc.drawn = true;
    const path = sc.sec.querySelector('.world-path');
    const px = sc.pts.map(([x, y]) => [(x / 100) * W, y]);
    const road = [[W / 2, -top], ...px];
    if (!sc.lastWorld) road.push([W / 2, sc.height]);
    const litN = sc.lit ? sc.lit + 1 + (sc.lit === sc.pts.length && !sc.lastWorld ? 1 : 0) : 0;
    const avoid = sc.avoid.map(([x, y, r]) => [(x / 100) * W, y, r]);
    const svg = path.querySelector('.map-scene');
    svg.setAttribute('viewBox', `0 ${-top} ${W} ${sc.height + top}`);
    svg.style.top = `${-top}px`;
    svg.style.height = `${sc.height + top}px`;
    svg.dataset.road = JSON.stringify(road.map(([x, y]) => [Math.round(x), Math.round(y)]));
    svg.dataset.lit = litN;
    const d = roadD(road);
    const dLit = litN > 1 ? roadD(road.slice(0, litN)) : '';
    svg.innerHTML = `${worldScene(sc.w, W, sc.height, road, avoid, top)}
      <path class="road-edge" d="${d}"/><path class="road-fill" d="${d}"/>
      <path class="road-lit-edge" d="${dLit}"/><path class="road-lit" d="${dLit}"/><path class="road-dots" d="${dLit}"/>`;
  };
  // Draw the scenery of the current world now, the others when they come near the screen.
  const cur = worldOf(unlocked);
  scenes.filter((sc) => Math.abs(sc.w - cur) <= 0 || sc.w === hideUnlockWorld(hideUnlock)).forEach(draw);
  sceneIO?.disconnect();
  sceneIO = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && draw(scenes.find((x) => x.sec === e.target))),
    { root: $('#map-scroll'), rootMargin: '900px 0px' },
  );
  scenes.forEach((sc) => sceneIO.observe(sc.sec));
  $('#map-sub').textContent = `${total}★ · ${t('level', { n: unlocked })}`;
  updateCoins();
  observeWorlds();
  requestAnimationFrame(() => typeof updateRecenter === 'function' && updateRecenter());
}

export let worldIO = null;

export function observeWorlds() {
  worldIO?.disconnect();
  worldIO = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const w = Number(e.target.dataset.world);
        setMusicTheme(w % WORLD_HUES.length);
      }
    },
    { root: $('#map-scroll'), rootMargin: '-45% 0px -45% 0px' },
  );
  els.mapEl.querySelectorAll('.world').forEach((s) => worldIO.observe(s));
}

// Re-draw the map when the width changes (rotation, desktop resize).
export let mapW = 0;

new ResizeObserver(() => {
  const w = els.mapEl.clientWidth;
  if (!w || w === mapW) return;
  const first = mapW === 0;
  mapW = w;
  if (first || !els.map.classList.contains('is-active')) return;
  const sc = $('#map-scroll');
  const top = sc.scrollTop;
  renderMap();
  sc.scrollTop = top;
}).observe(els.mapEl);

export function scrollMapTo(node, smooth = false) {
  const sc = $('#map-scroll');
  if (!node) return;
  const delta = node.getBoundingClientRect().top - sc.getBoundingClientRect().top;
  sc.scrollTo({ top: sc.scrollTop + delta - sc.clientHeight / 2 + 35, behavior: smooth ? 'smooth' : 'auto' });
}

export function openMap() {
  closeModal('modal-result');
  S.game = null;
  const u = store.data.levels.unlocked;
  const animate = S.pendingUnlock === u && !reducedMotion();
  S.pendingUnlock = 0;
  renderMap({ hideUnlock: animate ? u : 0 });
  showView('map');
  requestAnimationFrame(() => {
    const target = els.mapEl.querySelector(animate ? `.node[data-n="${u}"]` : '.node.is-current');
    scrollMapTo(target);
    if (animate) setTimeout(() => playUnlock(u), 450);
  });
}

export function playUnlock(u) {
  const node = els.mapEl.querySelector(`.node[data-n="${u}"]`);
  const prev = els.mapEl.querySelector(`.node[data-n="${u - 1}"]`);
  if (!node) return;
  prev?.querySelector('.node-stars')?.classList.add('pop');
  const finish = () => {
    replay(node, 'unlocking');
    sfx.chestShake(1);
    setTimeout(() => {
      node.className = `node is-current ${isBoss(u) ? 'is-boss' : ''} just-unlocked`;
      node.innerHTML = `<span>${u}</span>${isBoss(u) ? '<em>BOSS</em>' : ''}`;
      const path = node.parentElement;
      const here = document.createElement('i');
      here.className = 'you-are-here arrive';
      here.style.left = node.style.left;
      here.style.top = node.style.top;
      path.appendChild(here);
      // Extend the lit road to the new level, drawing it in.
      const svg = path.querySelector('.map-scene');
      if (svg) {
        const road = JSON.parse(svg.dataset.road);
        const from = Number(svg.dataset.lit);
        const to = Number(node.dataset.i) + 2;
        const d = roadD(road.slice(0, to));
        const lits = svg.querySelectorAll('.road-lit-edge, .road-lit, .road-dots');
        lits.forEach((p) => p.setAttribute('d', d));
        const len = lits[1].getTotalLength();
        const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        tmp.setAttribute('d', roadD(road.slice(0, from)));
        svg.appendChild(tmp);
        const old = from > 1 ? tmp.getTotalLength() : 0;
        tmp.remove();
        [lits[0], lits[1]].forEach((p) =>
          p.animate([{ strokeDasharray: `${len} ${len}`, strokeDashoffset: len - old }, { strokeDasharray: `${len} ${len}`, strokeDashoffset: 0 }], { duration: 650, easing: 'ease-out' }),
        );
        svg.dataset.lit = to;
      }
      burst(path, parseFloat(node.style.left), (parseFloat(node.style.top) / path.clientHeight) * 100, {
        count: 18,
        colors: ['var(--accent)', '#fff', worldHue(u)],
        dist: 70,
      });
      sfx.unlock();
      buzz([15, 30, 25]);
      toast(t('levelUp', { n: u }));
    }, 380);
  };
  if (!prev || prev.parentElement !== node.parentElement) {
    finish();
    return;
  }
  const token = document.createElement('i');
  token.className = 'map-token';
  token.style.left = prev.style.left;
  token.style.top = prev.style.top;
  node.parentElement.appendChild(token);
  sfx.roll(0.7);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      token.style.left = node.style.left;
      token.style.top = node.style.top;
    }),
  );
  setTimeout(() => {
    token.classList.add('land');
    setTimeout(() => token.remove(), 300);
    finish();
  }, 760);
}

els.mapEl.addEventListener('click', (e) => {
  const chest = e.target.closest('.chest-node');
  if (chest) {
    if (chest.classList.contains('is-opened')) {
      replay(chest, 'deny');
      return;
    }
    sfx.tap();
    showChestPreview(chest.dataset.chest, chest.dataset.tier, Number(chest.dataset.need));
    return;
  }
  const node = e.target.closest('.node');
  if (!node) return;
  const n = Number(node.dataset.n);
  if (n > store.data.levels.unlocked) {
    replay(node, 'deny');
    sfx.thud();
    toast(t('lockedLevel', { n: store.data.levels.unlocked }));
    return;
  }
  sfx.tap();
  showLevelPreview(n);
});

export function showLevelPreview(n) {
  const level = adventureLevel(n);
  const best = store.levelStars(n);
  const card = $('#modal-level .modal-card');
  card.style.setProperty('--hue', worldHue(n));
  $('#lp-world').textContent = `${t('world', { n: worldOf(n) + 1 })} · ${worldName(worldOf(n))}`;
  $('#lp-title').textContent = isBoss(n) ? `${t('level', { n })} · BOSS` : t('level', { n });
  $('#lp-stars').innerHTML = [0, 1, 2]
    .map((i) => `<span class="${i < best ? 'on' : ''}" style="--i:${i}"><svg><use href="#i-star"/></svg></span>`)
    .join('');
  const chips = [`<span class="lp-chip lp-par">${t('par', { n: level.par })}</span>`];
  const marbles = level.pieces.filter((p) => p.kind === 'marble').length;
  chips.push(`<span class="lp-chip"><i class="lp-ico ico-marble"></i>×${marbles}</span>`);
  if (level.pieces.some((p) => p.kind === 'stone')) chips.push(`<span class="lp-chip"><i class="lp-ico ico-stone"></i>${t('stones')}</span>`);
  if (level.sand) chips.push(`<span class="lp-chip"><i class="lp-ico ico-sand"></i>${t('mech_sand_title')}</span>`);
  if (level.gates) chips.push(`<span class="lp-chip"><i class="lp-ico ico-gate"></i>${t('mech_gates_title')}</span>`);
  if (level.portal) chips.push(`<span class="lp-chip"><i class="lp-ico ico-portal"></i>${t('mech_portals_title')}</span>`);
  if (level.arrows) chips.push(`<span class="lp-chip"><i class="lp-ico ico-arrow"></i>${t('mech_arrows_title')}</span>`);
  if (level.pits) chips.push(`<span class="lp-chip"><i class="lp-ico ico-pit"></i>${t('mech_pits_title')}</span>`);
  $('#lp-chips').innerHTML = chips.join('');
  $('#lp-best').textContent = best === 3 ? t('perfect') : best ? t('lpImprove', { n: 3 - best }) : t('lpGoal');
  $('#lp-play').onclick = () => {
    closeModal('modal-level');
    sfx.tap();
    iris(() => startLevel(n), worldHue(n));
  };
  openModal('modal-level');
  setTimeout(() => {
    if (comboReachable(level)) {
      $('#lp-chips').insertAdjacentHTML('beforeend', `<span class="lp-chip combo-chip">✨ ${t('comboPossible')}</span>`);
    }
  }, 120);
}

export const recenter = $('#map-recenter');

export function updateRecenter() {
  const cur = els.mapEl.querySelector('.node.is-current');
  const sc = $('#map-scroll');
  if (!cur) {
    recenter.hidden = true;
    return;
  }
  const r = cur.getBoundingClientRect();
  const v = sc.getBoundingClientRect();
  const off = r.bottom < v.top + 40 ? 'up' : r.top > v.bottom - 40 ? 'down' : '';
  recenter.hidden = !off;
  recenter.dataset.dir = off;
  $('#map-recenter-n').textContent = cur.dataset.n;
}

$('#map-scroll').addEventListener('scroll', () => requestAnimationFrame(updateRecenter), { passive: true });

recenter.addEventListener('click', () => {
  scrollMapTo(els.mapEl.querySelector('.node.is-current'), true);
});
