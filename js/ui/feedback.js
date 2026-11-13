// "Your opinion" window: a 1-5 smiley rating and an optional message, sent to Firebase.
// Offered once after level 6, and anytime from Settings.
import { LANG, t } from '../i18n.js';
import { save, store } from '../storage.js';
import { sfx } from '../audio.js';
import { onlineEnabled, sendFeedback } from '../leaderboard.js';
import { $, anyModalOpen, closeModal, openModal, toast } from './core.js';
import { APP_VERSION } from './input.js';
import { myProgress } from './leaderboard-ui.js';

const FACES = ['😞', '😕', '🙂', '😀', '🤩'];
let rating = 0;
let lastSent = 0;

export const AUTO_ASK_LEVEL = 6;

export function openFeedback() {
  if (!onlineEnabled()) return;
  rating = 0;
  $('#fb-faces').innerHTML = FACES.map((f, i) => `<button type="button" class="fb-face" data-r="${i + 1}" aria-label="${i + 1}/5">${f}</button>`).join('');
  $('#fb-text').value = '';
  $('#fb-send').disabled = true;
  $('#fb-faces').querySelectorAll('.fb-face').forEach((b) =>
    b.addEventListener('click', () => {
      rating = Number(b.dataset.r);
      sfx.pop(rating - 1);
      $('#fb-faces').querySelectorAll('.fb-face').forEach((x) => x.classList.toggle('is-on', x === b));
      $('#fb-send').disabled = false;
    }),
  );
  store.data.settings2.fbAsked = true;
  save();
  openModal('modal-feedback');
}

/** Called when the player gets back to the map: ask once, after a few levels. */
export function maybeAskFeedback() {
  if (!onlineEnabled() || store.data.settings2.fbAsked) return;
  if (myProgress().levels < AUTO_ASK_LEVEL) return;
  setTimeout(() => {
    if (anyModalOpen() || !document.querySelector('#view-map.is-active')) return;
    openFeedback();
  }, 1200);
}

$('#fb-send').addEventListener('click', async () => {
  if (!rating) return;
  if (Date.now() - lastSent < 30000) {
    toast(t('rankWait'));
    return;
  }
  const btn = $('#fb-send');
  btn.disabled = true;
  try {
    await sendFeedback({ rating, text: $('#fb-text').value.trim(), levels: myProgress().levels, lang: LANG, version: APP_VERSION });
    lastSent = Date.now();
    store.data.settings2.fbSent = (store.data.settings2.fbSent || 0) + 1;
    save();
    closeModal('modal-feedback');
    sfx.unlock();
    toast(t('fbThanks'));
  } catch {
    toast(t('rankOffline'));
    btn.disabled = false;
  }
});

const fbBtn = $('#btn-feedback');
fbBtn.hidden = !onlineEnabled();
fbBtn.addEventListener('click', () => {
  closeModal('modal-settings', true);
  openFeedback();
});
