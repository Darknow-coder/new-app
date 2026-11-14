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
  upload()?.then(() => lastUpload() !== at && renderCloud());
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
