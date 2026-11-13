// Monetization layer: opt-in rewarded ads and in-app purchases, behind one small API.
//
// Nothing is shown to players while both providers are 'none' (the default).
//   ?mz=demo   in the URL turns on a fake ad + fake purchases to try the flows (remembered;
//   ?mz=off    turns it off again).
//
// Wiring a real provider later only touches this file:
//   ads: 'h5games'  → Google Ad Placement API (AdSense for H5 games), needs an approved
//                     ca-pub id in H5_CLIENT below. adBreak({ type: 'reward' }) is used.
//   ads: 'crazygames' / 'poki' → their SDKs expose the same "rewarded" idea.
//   iap: 'playbilling' → Digital Goods API inside the Google Play (TWA) build.
//
// Rules we keep whatever the provider: ads are always the player's choice (a button with
// 🎬), never forced, never during a puzzle; daily caps per placement; the daily puzzles stay
// identical for everyone.
import { store, save } from './storage.js';
import { dateKey } from './daily.js';

export const CONFIG = { ads: 'none', iap: 'none' };
const H5_CLIENT = ''; // e.g. 'ca-pub-0000000000000000' once AdSense for games is approved

/** Rewarded placements and their daily caps. */
export const PLACEMENTS = {
  double: { cap: 5 }, // ×2 coins on a level result
  hint: { cap: 3 }, // a free hint
  coins: { cap: 5, coins: 25 }, // free coins in the shop
};

/** Future in-app products (prices are display strings; the store sets the real ones). */
export const PRODUCTS = [
  { id: 'starter', once: true, price: '1,99 €', grant: { coins: 1000, hint: 5, rewind: 5, freeze: 2 }, tag: 'starter' },
  { id: 'coins_s', price: '0,99 €', grant: { coins: 500 } },
  { id: 'coins_m', price: '2,99 €', grant: { coins: 1800 }, tag: 'popular' },
  { id: 'coins_l', price: '6,99 €', grant: { coins: 5000 }, tag: 'best' },
  { id: 'supporter', once: true, price: '2,99 €', grant: { coins: 500, skin: 'season-phoenix' }, tag: 'supporter' },
];

/* ---------- provider selection ---------- */
(() => {
  try {
    const q = new URLSearchParams(location.search).get('mz');
    if (q === 'demo') localStorage.setItem('marbl:mz', 'demo');
    if (q === 'off') localStorage.removeItem('marbl:mz');
    if (localStorage.getItem('marbl:mz') === 'demo') {
      CONFIG.ads = 'demo';
      CONFIG.iap = 'demo';
    }
  } catch {
    /* no storage: keep the defaults */
  }
})();

const mz = () => {
  const d = dateKey();
  if (!store.data.mz || store.data.mz.day !== d) store.data.mz = { day: d, n: {}, bought: store.data.mz?.bought || [] };
  return store.data.mz;
};

export const adsEnabled = () => CONFIG.ads !== 'none';
export const iapEnabled = () => CONFIG.iap !== 'none';

/** How many more times today this rewarded placement can be offered. */
export function rewardedLeft(placement) {
  if (!adsEnabled() || !PLACEMENTS[placement]) return 0;
  return Math.max(0, PLACEMENTS[placement].cap - (mz().n[placement] || 0));
}

/**
 * Play a rewarded ad. Resolves true only when the player watched it to the end
 * (then the caller gives the reward). Never throws.
 */
export async function showRewarded(placement) {
  if (!rewardedLeft(placement)) return false;
  let ok = false;
  try {
    if (CONFIG.ads === 'demo') ok = await demoAd();
    else if (CONFIG.ads === 'h5games') ok = await withDialogsHidden(() => h5Rewarded(placement));
  } catch {
    ok = false;
  }
  if (ok) {
    mz().n[placement] = (mz().n[placement] || 0) + 1;
    save();
  }
  return ok;
}

/* ---------- purchases ---------- */
export const owned = (id) => mz().bought.includes(id);
export const productsForSale = () => (iapEnabled() ? PRODUCTS.filter((p) => !(p.once && owned(p.id))) : []);

/** Buy a product. Resolves the product's grant (already applied) or null. */
export async function purchase(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p || !iapEnabled() || (p.once && owned(id))) return null;
  let ok = false;
  if (CONFIG.iap === 'demo') ok = await demoPurchase(p);
  if (!ok) return null;
  applyGrant(p.grant);
  mz().bought.push(id);
  save();
  return p.grant;
}

function applyGrant(g) {
  if (g.coins) store.data.coins += g.coins;
  for (const k of ['hint', 'rewind', 'freeze']) if (g[k]) store.data.boosters[k] = (store.data.boosters[k] || 0) + g[k];
  if (g.skin && !store.data.skins.owned.includes(g.skin)) store.data.skins.owned.push(g.skin);
}

/* ---------- demo provider (testing the flows, no real ads) ---------- */
function demoAd() {
  return new Promise((resolve) => {
    // A <dialog> opened last sits above every other open dialog (top layer).
    const el = document.createElement('dialog');
    el.className = 'mz-demo';
    el.innerHTML = `<div class="mz-demo-card"><b>🎬 Publicité (démo)</b><span class="mz-count">5</span><small>Aucune vraie pub : simulation pour tester.</small><button type="button" class="mz-skip" disabled>Fermer</button></div>`;
    document.body.appendChild(el);
    el.showModal();
    let n = 5;
    let done = false;
    const count = el.querySelector('.mz-count');
    const skip = el.querySelector('.mz-skip');
    const timer = setInterval(() => {
      n--;
      count.textContent = n > 0 ? n : '✓';
      if (n <= 0) {
        clearInterval(timer);
        done = true;
        skip.disabled = false;
        skip.textContent = 'Récupérer la récompense';
      }
    }, 1000);
    // Closing early (Escape) = no reward, like a real rewarded ad.
    el.addEventListener('close', () => {
      clearInterval(timer);
      el.remove();
      resolve(done);
    });
    skip.addEventListener('click', () => el.close());
  });
}

/**
 * Real ad SDKs draw a page overlay, which can't sit above an open <dialog> (top layer).
 * Step the open dialogs aside during the ad, then bring them back.
 */
async function withDialogsHidden(run) {
  const open = [...document.querySelectorAll('dialog[open]')];
  for (const d of open) d.style.visibility = 'hidden';
  const modal = open.filter((d) => d.matches(':modal'));
  for (const d of modal) d.close();
  try {
    return await run();
  } finally {
    for (const d of modal) d.showModal();
    for (const d of open) d.style.visibility = '';
  }
}

function demoPurchase(p) {
  return Promise.resolve(confirm(`Achat de démonstration (aucun paiement)\n\n${p.id} — ${p.price}`));
}

/* ---------- Google Ad Placement API (AdSense for H5 games) — template, not live ---------- */
let h5Ready = null;
function h5Load() {
  if (h5Ready) return h5Ready;
  h5Ready = new Promise((resolve) => {
    if (!H5_CLIENT) return resolve(false);
    window.adsbygoogle = window.adsbygoogle || [];
    window.adBreak = window.adConfig = (o) => window.adsbygoogle.push(o);
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${H5_CLIENT}`;
    s.crossOrigin = 'anonymous';
    s.dataset.adFrequencyHint = '30s';
    s.onload = () => {
      window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
      resolve(true);
    };
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  return h5Ready;
}
async function h5Rewarded(name) {
  if (!(await h5Load())) return false;
  return new Promise((resolve) => {
    let viewed = false;
    window.adBreak({
      type: 'reward',
      name,
      beforeReward: (showAdFn) => showAdFn(), // the player already chose by tapping the 🎬 button
      adViewed: () => (viewed = true),
      adDismissed: () => (viewed = false),
      adBreakDone: () => resolve(viewed),
    });
  });
}
