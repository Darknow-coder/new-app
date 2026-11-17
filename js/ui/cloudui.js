// Settings panel for the online save, and the "recover a game" window.
import { LANG, t } from '../i18n.js';
import { CODE_RE, cloudCode, cloudEnabled, cloudOff, deleteSave, enableCloud, fetchSave, formatCode, lastUpload, parseCode, restoreSave, upload } from '../cloud.js';
import { store } from '../storage.js';
import { $, notify, openModal, toast } from './core.js';
import { sfx } from '../audio.js';

const ago = (ms) => {
  const rtf = new Intl.RelativeTimeFormat(LANG, { numeric: 'auto' });
  const s = Math.round((ms - Date.now()) / 1000);
  if (Math.abs(s) < 60) return rtf.format(0, 'second');
  if (Math.abs(s) < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (Math.abs(s) < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  return rtf.format(Math.round(s / 86400), 'day');
};

export function renderCloud() {
  const box = $('#cloud-box');
  box.hidden = !cloudEnabled();
  if (box.hidden) return;
  const off = cloudOff();
  box.classList.toggle('is-off', off);
  $('#cloud-delete').textContent = off ? t('cloudEnable') : t('cloudDelete');
  if (off) {
    $('#cloud-status').textContent = t('cloudDisabled');
    return;
  }
  $('#cloud-code').textContent = formatCode(cloudCode());
  const at = lastUpload();
  $('#cloud-status').textContent = !navigator.onLine ? t('cloudOff') : at ? t('cloudOn', { t: ago(at) }) : store.data.levels.unlocked > 1 ? t('cloudPending') : t('cloudWait');
  // Opening the settings is a good moment to make sure the latest progress is up there.
  upload({ gap: 30000 })?.then(() => lastUpload() !== at && renderCloud());
}

$('#btn-settings').addEventListener('click', renderCloud);

$('#cloud-copy').addEventListener('click', async () => {
  const code = formatCode(cloudCode());
  try {
    await navigator.clipboard.writeText(code);
    toast(t('cloudCopied'));
  } catch {
    prompt(t('cloudTitle'), code);
  }
});

$('#cloud-delete').addEventListener('click', async () => {
  if (cloudOff()) {
    await enableCloud();
    renderCloud();
    return;
  }
  if (!confirm(t('cloudDeleteConfirm'))) return;
  try {
    await deleteSave();
    toast(t('cloudDeleted'));
  } catch {
    toast(t('restoreErr'));
  }
  renderCloud();
});

/* ---------- a game arriving from another browser (?r=CODE) ---------- */
/**
 * Pick up the save behind a handoff link. A device with nothing to lose takes it at once;
 * one that has played asks first, and only if the save is further along.
 * Resolves true when the page is about to reload with the recovered game.
 */
export async function offerHandoff(code) {
  if (!cloudEnabled() || !CODE_RE.test(code)) return false;
  let save = null;
  for (let i = 0; i < 2 && !save; i++) {
    try {
      save = await fetchSave(code);
    } catch {
      save = null;
    }
    if (!save) await new Promise((r) => setTimeout(r, 2500)); // the other browser may still be uploading
  }
  if (!save?.data) return false;
  const mine = store.data.levels.unlocked - 1;
  const fresh = !store.data.tutorialDone && mine <= 0;
  if (fresh) {
    if (!restoreSave(code, save)) return false;
    toast(t('restoreOk'));
    setTimeout(() => location.reload(), 700);
    return true;
  }
  if (save.levels <= mine) return false;
  // Same window as "Recover a game", already filled in and found.
  input.value = formatCode(code);
  resetRestore();
  found = { code, save };
  const d = save.updated ? new Intl.DateTimeFormat(LANG, { day: 'numeric', month: 'long' }).format(new Date(save.updated)) : '—';
  msg.textContent = t('restoreFound', { n: save.levels, d });
  msg.className = 'restore-msg is-ok';
  go.textContent = t('restoreLoad');
  openModal('modal-restore');
  return false;
}

/* ---------- recover a game ---------- */
let found = null;
const input = $('#restore-code');
const msg = $('#restore-msg');
const go = $('#restore-go');

function resetRestore() {
  found = null;
  msg.textContent = '';
  msg.className = 'restore-msg';
  go.textContent = t('restoreFind');
}

$('#cloud-restore').addEventListener('click', () => {
  input.value = '';
  resetRestore();
  openModal('modal-restore');
  setTimeout(() => input.focus(), 250);
});

// Show the code the way it is printed: XXXX-XXXX-XXXX.
input.addEventListener('input', () => {
  const raw = parseCode(input.value).slice(0, 12);
  input.value = formatCode(raw);
  if (found) resetRestore();
});

go.addEventListener('click', async () => {
  const code = parseCode(input.value);
  if (found) {
    if (!confirm(t('restoreConfirm'))) return;
    if (restoreSave(found.code, found.save)) {
      sfx.coin();
      toast(t('restoreOk'));
      setTimeout(() => location.reload(), 800);
    } else {
      msg.textContent = t('restoreNone');
      msg.className = 'restore-msg is-bad';
    }
    return;
  }
  if (!CODE_RE.test(code)) {
    msg.textContent = t('restoreBad');
    msg.className = 'restore-msg is-bad';
    return;
  }
  go.disabled = true;
  try {
    const save = await fetchSave(code);
    if (!save || !save.data) {
      msg.textContent = t('restoreNone');
      msg.className = 'restore-msg is-bad';
    } else {
      found = { code, save };
      const d = save.updated ? new Intl.DateTimeFormat(LANG, { day: 'numeric', month: 'long' }).format(new Date(save.updated)) : '—';
      msg.textContent = t('restoreFound', { n: save.levels, d });
      msg.className = 'restore-msg is-ok';
      go.textContent = t('restoreLoad');
    }
  } catch {
    msg.textContent = t('restoreErr');
    msg.className = 'restore-msg is-bad';
  } finally {
    go.disabled = false;
  }
});

// The very first backup: tell the player once where their code lives.
window.addEventListener('marbl:cloud-first', () => notify('i-cloud', t('cloudFirst'), t('cloudFirstSub')));
