import { setMusicEnabled, setMusicVolume, setSfxVolume, setSoundEnabled, sfx, unlockAudio } from '../audio.js';
import { iris } from '../fx.js';
import { exportProgress, importProgress, save, store } from '../storage.js';
import { LANG_CHOICE, LANG_KEY, t } from '../i18n.js';
import { $, S, anyModalOpen, buzz, closeModal, els, openModal, toast, worldHue } from './core.js';
import { hint, move, restart, rewind, startTutorial, undo } from './game.js';
import { exitGame, goHome } from './result.js';
import { openMap } from './mapview.js';
import { renderStats, shareDay } from './settings.js';
import { renderHome } from './home.js';
import { openArchive } from './archive.js';

export let swipe = null;

els.area.addEventListener('pointerdown', (e) => {
  if (!S.game || anyModalOpen()) return;
  swipe = { x: e.clientX, y: e.clientY, id: e.pointerId, fired: false };
  unlockAudio();
});

window.addEventListener('pointermove', (e) => {
  if (!swipe || swipe.fired || e.pointerId !== swipe.id) return;
  const dx = e.clientX - swipe.x;
  const dy = e.clientY - swipe.y;
  const threshold = e.pointerType === 'mouse' ? 30 : 22;
  if (Math.hypot(dx, dy) < threshold) return;
  swipe.fired = true;
  move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
});

export const endSwipe = () => (swipe = null);

window.addEventListener('pointerup', endSwipe);

window.addEventListener('pointercancel', endSwipe);

export const KEYMAP = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right',
};

window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && $('#modal-result').open) {
    $('#result-actions .btn-primary')?.click();
    return;
  }
  if (anyModalOpen() || !els.game.classList.contains('is-active') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (KEYMAP[e.key]) {
    e.preventDefault();
    move(KEYMAP[e.key]);
  } else if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace' || e.key === 'u') {
    e.preventDefault();
    undo();
  } else if (e.key === 'r' || e.key === 'R') {
    restart();
  } else if (e.key === 'Escape') {
    exitGame();
  }
});

els.undo.addEventListener('click', undo);

els.restart.addEventListener('click', restart);

els.hint.addEventListener('click', hint);

els.rewind.addEventListener('click', rewind);

$('#btn-back').addEventListener('click', () => {
  sfx.tap();
  exitGame();
});

$('#btn-map-back').addEventListener('click', () => {
  sfx.tap();
  goHome();
});

$('#nav-play').addEventListener('click', () => {
  sfx.tap();
  iris(openMap, worldHue(store.data.levels.unlocked));
});

$('#btn-adventure').addEventListener('click', () => {
  sfx.tap();
  iris(openMap, worldHue(store.data.levels.unlocked));
});

$('#btn-share-day').addEventListener('click', shareDay);

$('#btn-help').addEventListener('click', () => openModal('modal-help'));

$('#btn-stats')?.addEventListener('click', () => {
  renderStats();
  openModal('modal-stats');
});

$('#streak-chip').addEventListener('click', () => {
  renderStats();
  openModal('modal-stats');
});

$('#btn-archive').addEventListener('click', () => {
  sfx.tap();
  openArchive();
});
$('#btn-stats-archive').addEventListener('click', () => {
  closeModal('modal-stats', true);
  openArchive();
});

$('#btn-settings').addEventListener('click', () => openModal('modal-settings'));

$('#btn-replay-tutorial').addEventListener('click', () => {
  closeModal('modal-help');
  startTutorial(0);
});

document.querySelectorAll('dialog').forEach((d) => {
  d.addEventListener('click', (e) => {
    if (e.target === d && d.id !== 'modal-result') closeModal(d);
  });
  d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeModal(d)));
  if (d.id !== 'modal-result' && d.id !== 'modal-chest') {
    d.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeModal(d);
    });
  }
});

// Escape on the result dialog behaves like "Home" so the player never ends up on a dead board.
$('#modal-result').addEventListener('cancel', (e) => {
  e.preventDefault();
  exitGame();
});

export const musicBox = $('#set-music');

musicBox.checked = store.data.settings2.music;

setMusicEnabled(musicBox.checked && store.setting('sound'));

musicBox.addEventListener('change', () => {
  store.data.settings2.music = musicBox.checked;
  save();
  unlockAudio();
  setMusicEnabled(musicBox.checked && store.setting('sound'));
});

// Any first tap anywhere unlocks audio (and starts the music if enabled).
window.addEventListener('pointerdown', () => unlockAudio(), { once: true });

export const soundBox = $('#set-sound');

export const hapticBox = $('#set-haptics');
// Colour-blind mode: a distinct symbol on every marble, hole and gate.
const cbBox = $('#set-cb');
const applyCb = () => document.body.classList.toggle('cb', !!store.data.settings2.cb);
cbBox.checked = !!store.data.settings2.cb;
applyCb();
cbBox.addEventListener('change', () => {
  store.data.settings2.cb = cbBox.checked;
  save();
  applyCb();
});

soundBox.checked = store.setting('sound');

hapticBox.checked = store.setting('haptics');

setSoundEnabled(soundBox.checked);

soundBox.addEventListener('change', () => {
  store.setting('sound', soundBox.checked);
  setSoundEnabled(soundBox.checked);
  setMusicEnabled(soundBox.checked && store.data.settings2.music);
  sfx.tap();
});

// Volume sliders: shown under their toggle while it is on.
const sfxVol = $('#set-sfx-vol');
const musicVol = $('#set-music-vol');
const vol = (k, d) => (typeof store.data.settings2[k] === 'number' ? store.data.settings2[k] : d);
sfxVol.value = Math.round(vol('sfxVol', 0.8) * 100);
musicVol.value = Math.round(vol('musicVol', 0.7) * 100);
setSfxVolume(sfxVol.value / 100);
setMusicVolume(musicVol.value / 100);
const paintVol = (el) => el.style.setProperty('--p', `${el.value}%`);
const syncVolRows = () => {
  $('#row-sfx-vol').hidden = !soundBox.checked;
  $('#row-music-vol').hidden = !soundBox.checked || !musicBox.checked;
  paintVol(sfxVol);
  paintVol(musicVol);
};
syncVolRows();
soundBox.addEventListener('change', syncVolRows);
musicBox.addEventListener('change', syncVolRows);
let volTest = 0;
sfxVol.addEventListener('input', () => {
  setSfxVolume(sfxVol.value / 100);
  paintVol(sfxVol);
  // Preview at the new level, but not on every pixel of the drag.
  clearTimeout(volTest);
  volTest = setTimeout(() => sfx.coin(), 80);
});
musicVol.addEventListener('input', () => {
  unlockAudio();
  setMusicVolume(musicVol.value / 100);
  paintVol(musicVol);
});
for (const [el, k] of [[sfxVol, 'sfxVol'], [musicVol, 'musicVol']]) {
  el.addEventListener('change', () => {
    store.data.settings2[k] = el.value / 100;
    save();
  });
}

hapticBox.addEventListener('change', () => {
  store.setting('haptics', hapticBox.checked);
  buzz(20);
});

export const APP_VERSION = '1.0.0-beta';

$('#btn-export').addEventListener('click', async () => {
  const code = exportProgress();
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ text: code });
    else {
      await navigator.clipboard.writeText(code);
      toast(t('exportDone'));
    }
  } catch (e) {
    if (e?.name !== 'AbortError') prompt(t('exportDone'), code);
  }
});

$('#btn-import').addEventListener('click', () => {
  const code = prompt(t('importAsk'));
  if (!code) return;
  if (!/^\s*MARBL1\./.test(code)) return toast(t('importBad'));
  if (!confirm(t('importConfirm'))) return;
  if (importProgress(code)) {
    toast(t('importOk'));
    setTimeout(() => location.reload(), 700);
  } else toast(t('importBad'));
});

// Language picker: applying a new language needs a reload (all text is built at start).
const langSeg = $('#set-lang');
langSeg.querySelectorAll('button').forEach((b) => {
  b.setAttribute('aria-checked', String(b.dataset.l === LANG_CHOICE));
  b.addEventListener('click', () => {
    if (b.dataset.l === LANG_CHOICE) return;
    try {
      if (b.dataset.l === 'auto') localStorage.removeItem(LANG_KEY);
      else localStorage.setItem(LANG_KEY, b.dataset.l);
    } catch {
      /* storage unavailable */
    }
    location.reload();
  });
});

$('#btn-about').addEventListener('click', () => {
  $('#about-ver').textContent = `v${APP_VERSION}`;
  openModal('modal-about');
});

$('#btn-reset').addEventListener('click', () => {
  if (confirm(t('resetConfirm'))) {
    store.reset();
    closeModal('modal-settings');
    renderHome();
  }
});

// The install button / card and in-app browser warning live in install.js.
