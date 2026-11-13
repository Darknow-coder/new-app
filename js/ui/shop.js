import { t } from '../i18n.js';
import { DEALS, DEAL_OFF, GIFT_LADDER, SHOP, SHOP_CHESTS, SKIN_PRICES } from '../levels.js';
import { hashString } from '../engine.js';
import { save, store } from '../storage.js';
import { chestSVG } from '../chests.js';
import { addDays, msUntilTomorrow } from '../daily.js';
import { SKINS, availableSets, equip, equipped, grantSkin, hasSkin, marbleHTML, skinName } from '../skins.js';
import { sfx } from '../audio.js';
import { burst, floatText, flyIcons, reducedMotion, replay, stagger } from '../fx.js';
import { checkAchievements } from '../progress.js';
import { $, S, buzz, closeModal, fmtCountdown, openModal, toast, updateCoins } from './core.js';
import { renderHome } from './home.js';
import { handleProgress, openChestFlow, openDailyChest } from './common.js';
import { updateHud } from './game.js';
import { PLACEMENTS, iapEnabled, productsForSale, purchase, rewardedLeft, showRewarded } from '../monetization.js';

/** Opt-in rewarded offers at the top of the boosters tab (only when ads are enabled). */
function rewardedRows() {
  const rows = [];
  if (rewardedLeft('hint')) rows.push({ id: 'hint', icon: 'i-hint', name: t('adHint'), left: rewardedLeft('hint') });
  if (rewardedLeft('coins')) rows.push({ id: 'coins', icon: 'i-coin', name: t('adCoins', { n: PLACEMENTS.coins.coins }), left: rewardedLeft('coins') });
  return rows
    .map(
      (r, i) => `
      <div class="shop-cardlet is-ad" style="--i:${i}">
        <span class="shop-icon ${r.id === 'hint' ? 'hint' : ''}"><svg><use href="#${r.icon}"/></svg></span>
        <span class="shop-text"><strong>${r.name}</strong><small>${t('adLeft', { n: r.left })}</small></span>
        <button class="price price-ad" data-rewarded="${r.id}"><svg><use href="#i-video"/></svg>${t('adWatch')}</button>
      </div>`,
    )
    .join('');
}

/** Real-money packs (only when purchases are enabled). */
function packsPanel() {
  return productsForSale()
    .map(
      (p, i) => `
      <div class="shop-cardlet is-pack ${p.tag ? `tag-${p.tag}` : ''}" style="--i:${i}">
        ${p.tag ? `<span class="shop-tag">${t(`iapTag_${p.tag}`)}</span>` : ''}
        <span class="shop-icon pack"><svg><use href="#${p.grant.skin ? 'i-star' : p.grant.hint ? 'i-gift' : 'i-coin'}"/></svg></span>
        <span class="shop-text"><strong>${t(`iap_${p.id}`)}</strong><small>${t(`iapd_${p.id}`)}</small></span>
        <button class="price price-iap" data-iap="${p.id}">${p.price}</button>
      </div>`,
    )
    .join('');
}

export const itemsText = (items) =>
  Object.entries(items)
    .map(([b, q]) => `${t(`${b}Name`)} ×${q}`)
    .join(' + ');

export function todaysDeal() {
  const d = DEALS[hashString(`deal:${S.today}`) % DEALS.length];
  return { ...d, price: Math.round((d.base * (1 - DEAL_OFF)) / 5) * 5, bought: store.data.dealDay === S.today };
}

export const coinBtn = (price, attrs) =>
  `<button class="price ${store.data.coins >= price ? '' : 'is-short'}" ${attrs} data-price="${price}"><svg><use href="#i-coin"/></svg>${price}</button>`;

export function renderDeal() {
  const d = todaysDeal();
  const art = d.chest
    ? `<span class="deal-art">${chestSVG(d.chest)}</span>`
    : `<span class="deal-art deal-boost" data-icon="deal"><svg><use href="#i-${Object.keys(d.items)[0]}"/></svg></span>`;
  const name = d.chest ? t(`chest_${d.chest}`) : itemsText(d.items);
  $('#shop-deal').className = `shop-deal ${d.bought ? 'is-bought' : ''}`;
  $('#shop-deal').innerHTML = `
    <span class="deal-off">-${Math.round(DEAL_OFF * 100)}%</span>
    ${art}
    <span class="deal-text">
      <small>${t('dealTitle')}</small>
      <strong>${name}</strong>
      <em id="deal-timer">${d.bought ? t('dealDone') : t('dealEnds', { t: fmtCountdown(msUntilTomorrow()) })}</em>
    </span>
    ${d.bought ? '<span class="q-claimed">✓</span>' : `<span class="deal-price"><s>${d.base}</s>${coinBtn(d.price, 'data-buy="deal"')}</span>`}`;
}

export let shopTab = 'boost';

export function renderShop() {
  updateCoins();
  renderDeal();
  document.querySelectorAll('.shop-tabs [data-tab]').forEach((b) => {
    b.classList.toggle('is-on', b.dataset.tab === shopTab);
    b.setAttribute('aria-selected', b.dataset.tab === shopTab);
  });
  const on = document.querySelector(`.shop-tabs [data-tab="${shopTab}"]`);
  const ink = $('#tab-ink');
  requestAnimationFrame(() => {
    ink.style.width = `${on.offsetWidth}px`;
    ink.style.transform = `translateX(${on.offsetLeft}px)`;
  });
  const panel = $('#shop-list');
  panel.dataset.tab = shopTab;
  if (shopTab === 'boost') {
    panel.innerHTML = rewardedRows() + SHOP.map((item, i) => {
      const kinds = Object.keys(item.items);
      const pack = kinds.length > 1;
      const icon = pack ? 'i-gift' : `i-${kinds[0]}`;
      const qty = pack ? 0 : item.items[kinds[0]];
      const owned = pack ? '' : `<small class="owned" data-owned="${kinds[0]}">${t('owned', { n: store.booster(kinds[0]) })}</small>`;
      return `
        <div class="shop-cardlet ${pack ? 'is-featured' : ''}" style="--i:${i}">
          ${item.tag ? `<span class="shop-tag">${pack ? t('bestValue') : item.tag}</span>` : ''}
          <span class="shop-icon ${pack ? 'pack' : kinds[0]}" data-icon="${item.id}"><svg><use href="#${icon}"/></svg>${qty > 1 ? `<b>×${qty}</b>` : ''}</span>
          <span class="shop-text">
            <strong>${pack ? t('packName') : itemsText(item.items)}</strong>
            <small>${pack ? t('packDesc') : t(`${kinds[0]}Desc`)}</small>
            ${owned}
          </span>
          ${coinBtn(item.price, `data-buy="${item.id}"`)}
        </div>`;
    }).join('');
  } else if (shopTab === 'packs') {
    panel.innerHTML = packsPanel();
  } else if (shopTab === 'chests') {
    panel.innerHTML = SHOP_CHESTS.map(
      (c, i) => `
        <div class="shop-cardlet chest-cardlet tier-${c.tier}" style="--i:${i}">
          <span class="shop-chest">${chestSVG(c.tier)}</span>
          <span class="shop-text">
            <strong>${t(`chest_${c.tier}`)}</strong>
            <small>${t(`chestShopDesc_${c.tier}`)}</small>
          </span>
          ${coinBtn(c.price, `data-buy="${c.id}"`)}
        </div>`,
    ).join('');
  } else {
    const eq = equipped();
    const avail = availableSets();
    panel.innerHTML = SKINS.filter((sk) => avail.includes(sk.set) && sk.rarity !== 'legendary').map((sk, i) => {
      const own = hasSkin(sk.id);
      const price = SKIN_PRICES[sk.rarity];
      const action = own
        ? sk.id === eq
          ? `<span class="skin-state is-eq">✓ ${t('equipped')}</span>`
          : `<button class="skin-state" data-equip="${sk.id}">${t('equip')}</button>`
        : coinBtn(price, `data-buy="skin:${sk.id}"`);
      return `
        <div class="shop-cardlet skin-cardlet r-${sk.rarity} ${own ? 'is-owned' : ''}" style="--i:${i}">
          <em class="skin-rarity">${t(`rarity_${sk.rarity}`)}</em>
          ${marbleHTML(sk.id, i % 4)}
          <strong>${skinName(sk.id)}</strong>
          ${action}
        </div>`;
    }).join('');
  }
}

export function refreshShop() {
  document.querySelectorAll('#shop-list [data-owned]').forEach((el) => {
    el.textContent = t('owned', { n: store.booster(el.dataset.owned) });
  });
  document.querySelectorAll('#modal-shop [data-buy]').forEach((b) => {
    b.classList.toggle('is-short', store.data.coins < Number(b.dataset.price));
  });
}

export function openShop(tab) {
  if (typeof tab === 'string') shopTab = tab;
  const packs = document.querySelector('.shop-tabs [data-tab="packs"]');
  packs.hidden = !iapEnabled();
  if (packs.hidden && shopTab === 'packs') shopTab = 'boost';
  renderShop();
  openModal('modal-shop');
}

document.querySelector('.shop-tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b || b.dataset.tab === shopTab) return;
  shopTab = b.dataset.tab;
  sfx.tap();
  renderShop();
  stagger($('#shop-list'), '.shop-cardlet', { step: 40 });
});

export function celebrateBuy(target, label) {
  const dlg = $('#modal-shop');
  flyIcons(dlg.querySelector('.shop-balance svg'), target, {
    count: 6,
    layer: dlg,
    onArrive: (i) => {
      sfx.tick();
      if (i === 5 || reducedMotion()) {
        replay(target, 'got');
        if (label) floatText(target, label, dlg);
        burst(target, 50, 50, { count: 12, colors: ['var(--accent)', '#fff'], dist: 44 });
        refreshShop();
      }
    },
  });
}

$('#modal-shop').addEventListener('click', async (e) => {
  const ad = e.target.closest('[data-rewarded]');
  if (ad) {
    ad.disabled = true;
    if (await showRewarded(ad.dataset.rewarded)) {
      if (ad.dataset.rewarded === 'hint') {
        store.booster('hint', 1);
        toast(t('bought', { q: 1, b: t('hintName') }));
      } else {
        store.addCoins(PLACEMENTS.coins.coins);
        updateCoins(true);
      }
      sfx.coinRain();
      if (S.game) updateHud(false);
    }
    renderShop();
    return;
  }
  const iap = e.target.closest('[data-iap]');
  if (iap) {
    iap.disabled = true;
    const g = await purchase(iap.dataset.iap);
    if (g) {
      sfx.upgrade();
      toast(t('iapThanks'));
      updateCoins(true);
      renderHome();
    }
    renderShop();
    return;
  }
  const eqBtn = e.target.closest('[data-equip]');
  if (eqBtn) {
    equip(eqBtn.dataset.equip);
    sfx.pop(2);
    renderShop();
    renderHome();
    return;
  }
  const btn = e.target.closest('[data-buy]');
  if (!btn) return;
  const id = btn.dataset.buy;
  const price = Number(btn.dataset.price);
  if (!store.spendCoins(price)) {
    replay(btn, 'deny');
    sfx.thud();
    buzz([30, 40, 30]);
    toast(t('notEnough'));
    return;
  }
  replay(btn, 'pressed');
  updateCoins();
  sfx.coin();
  buzz(20);
  // Chests: close the shop, play the full ceremony, come back.
  const chestTier = id === 'deal' ? todaysDeal().chest : SHOP_CHESTS.find((c) => c.id === id)?.tier;
  if (id === 'deal') {
    store.data.dealDay = S.today;
    save();
  }
  if (chestTier) {
    closeModal('modal-shop');
    setTimeout(
      () =>
        openChestFlow({ tier: chestTier }).then(() => {
          S.shownCoins = null;
          openShop();
        }),
      260,
    );
    return;
  }
  if (id.startsWith('skin:')) {
    const skin = id.slice(5);
    grantSkin(skin);
    equip(skin);
    sfx.epic();
    const tile = btn.closest('.skin-cardlet');
    celebrateBuy(tile.querySelector('.marble-preview'), null);
    toast(t('skinBought', { s: skinName(skin) }));
    setTimeout(() => {
      renderShop();
      renderHome();
    }, 900);
    handleProgress({ notes: checkAchievements() });
    return;
  }
  const items = id === 'deal' ? todaysDeal().items : SHOP.find((i) => i.id === id).items;
  for (const [b, q] of Object.entries(items)) store.booster(b, q);
  const total = Object.values(items).reduce((a, b) => a + b, 0);
  const target = $(`#modal-shop [data-icon="${id}"]`) || btn;
  celebrateBuy(target, `+${total}`);
  if (id === 'deal') setTimeout(renderDeal, 900);
  if (S.game) updateHud(false);
});

document.querySelectorAll('[data-shop]').forEach((b) => b.addEventListener('click', openShop));

export function giftToday() {
  const last = store.data.giftDay;
  const prevCount = store.data.giftCount || 0;
  const continues = last && addDays(last, 1) === S.today;
  const count = last === S.today ? prevCount : continues ? prevCount + 1 : 1;
  const idx = (count - 1) % GIFT_LADDER.length;
  return { count, day: idx + 1, reward: GIFT_LADDER[idx] };
}

$('#gift-chip').addEventListener('click', () => {
  if (store.data.giftDay === S.today) return;
  const g = giftToday();
  store.data.giftDay = S.today;
  store.data.giftCount = g.count;
  const chip = $('#gift-chip');
  if (g.reward === 'chest') {
    save();
    chip.hidden = true;
    openChestFlow({ id: `gift-${S.today}`, tier: 'silver', title: t('giftDayChest', { d: g.day }) }).then(() => renderHome());
    return;
  }
  store.addCoins(g.reward);
  sfx.coin();
  buzz([20, 30, 20]);
  toast(t('giftToast', { n: g.reward }));
  flyIcons(chip, $('#view-home .coin-pill'), {
    count: 8,
    onArrive: (i) => {
      sfx.tick();
      if (i === 0) updateCoins(true);
    },
  });
  chip.classList.add('claimed');
  setTimeout(() => {
    chip.hidden = true;
    chip.classList.remove('claimed');
  }, 450);
});

$('#daily-chest-chip').addEventListener('click', () => openDailyChest());
