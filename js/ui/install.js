// Getting the game onto the home screen, and out of in-app browsers.
//
// - In-app browsers (TikTok, Instagram, Snapchat, Facebook…) can wipe saved progress and
//   can't install the game: we say so once per session and offer to copy the link.
// - After a few wins, a friendly "install" card: one tap on Android/desktop Chrome
//   (beforeinstallprompt), simple steps on iPhone Safari. Never more than 3 times.
import { t } from '../i18n.js';
import { save, store } from '../storage.js';
import { sfx } from '../audio.js';
import { shareBase } from '../site.js';
import { $, closeModal, openModal, toast } from './core.js';

let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvt = e;
  const b = $('#btn-install');
  if (b) b.hidden = false;
});
window.addEventListener('appinstalled', () => {
  installEvt = null;
  store.data.settings2.installed = true;
  save();
});

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const UA = navigator.userAgent || '';
export const inAppBrowser = () =>
  /(TikTok|musical_ly|Bytedance|BytedanceWebview|Instagram|FBAN|FBAV|FB_IAB|Snapchat|Twitter|Line\/|Pinterest)/i.test(UA) ? (UA.match(/TikTok|musical_ly|Bytedance/i) ? 'TikTok' : UA.match(/Instagram/i) ? 'Instagram' : UA.match(/Snapchat/i) ? 'Snapchat' : UA.match(/FBAN|FBAV|FB_IAB/i) ? 'Facebook' : 'app') : null;
const isIOS = () => /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Ask the browser to keep our storage (Chrome honours it; it's a no-op elsewhere). */
export function persistStorage() {
  try {
    navigator.storage?.persist?.();
  } catch {
    /* unsupported */
  }
}

/* ---------- in-app browser banner ---------- */
export function checkInAppBrowser() {
  const app = inAppBrowser();
  if (!app || sessionStorage.getItem('marbl:iab')) return;
  const bar = $('#iab-bar');
  $('#iab-text').textContent = t('iabText', { app: app === 'app' ? t('iabApp') : app });
  bar.hidden = false;
}
$('#iab-copy')?.addEventListener('click', async () => {
  const url = shareBase();
  try {
    await navigator.clipboard.writeText(url);
    toast(t('iabCopied'));
  } catch {
    prompt(t('iabCopyManual'), url);
  }
});
$('#iab-close')?.addEventListener('click', () => {
  $('#iab-bar').hidden = true;
  try {
    sessionStorage.setItem('marbl:iab', '1');
  } catch {
    /* ignore */
  }
});

/* ---------- install card ---------- */
const s2 = () => store.data.settings2;
function canOfferInstall() {
  if (isStandalone() || inAppBrowser() || s2().installed) return false;
  if ((s2().installAsked || 0) >= 3) return false;
  if (Date.now() - (s2().installAt || 0) < 3 * 864e5) return false; // at most every 3 days
  return !!installEvt || isIOS();
}

/** Called back on the map after a win: offer the install card from the 4th level on. */
export function maybeOfferInstall() {
  if ((store.data.stats.levelsWon || 0) < 4 || !canOfferInstall()) return false;
  s2().installAsked = (s2().installAsked || 0) + 1;
  s2().installAt = Date.now();
  save();
  $('#install-ios').hidden = !!installEvt || !isIOS();
  $('#install-go').hidden = !installEvt;
  setTimeout(() => {
    sfx.epic();
    openModal('modal-install');
  }, 900);
  return true;
}

async function promptInstall() {
  if (!installEvt) return;
  installEvt.prompt();
  const r = await installEvt.userChoice.catch(() => null);
  installEvt = null;
  $('#btn-install').hidden = true;
  if (r?.outcome === 'accepted') {
    s2().installed = true;
    save();
  }
}
$('#install-go')?.addEventListener('click', async () => {
  closeModal('modal-install');
  await promptInstall();
});
$('#btn-install')?.addEventListener('click', promptInstall);
