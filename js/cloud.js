// Cloud save: the whole progress is kept online under a short recovery code
// (like 7KQ2-X9TF-M4PA). Typing that code on another phone brings the game back.
// The code is the only key: documents are never listed, only fetched by their code.
// Uploads are automatic but rare (when progress changed, at most once a minute,
// and when the app goes to the background), to stay inside Firebase's free quota.
import { FIREBASE } from './online-config.js';
import { hashString } from './engine.js';
import { afterSave, exportProgress, importProgress, store } from './storage.js';
import { DOCS, http, onlineEnabled, token } from './leaderboard.js';

const KEY = 'marbl:cloud';
const ALPHA = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // no 0/O, 1/I/L: easy to read aloud and type
const MIN_GAP = 60000;
export const CODE_RE = /^[2-9A-HJKMNP-Z]{12}$/;

let st = load();
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(st));
  } catch {
    /* private mode */
  }
}

export const cloudEnabled = () => onlineEnabled();
/** Something worth keeping: the tutorial is done and at least one level was won. */
const worthSaving = () => store.data.tutorialDone && store.data.levels.unlocked > 1;

/** This player's recovery code (made on first use). */
export function cloudCode() {
  if (!st.code) {
    const r = crypto.getRandomValues(new Uint32Array(12));
    st.code = Array.from(r, (v) => ALPHA[v % ALPHA.length]).join('');
    persist();
  }
  return st.code;
}
export const formatCode = (c) => (c || '').match(/.{1,4}/g)?.join('-') || '';
/** Clean what the player typed: drop spaces and dashes, upper-case. */
export const parseCode = (s) =>
  String(s || '')
    .toUpperCase()
    .replace(/[\s-]/g, '');

export const lastUpload = () => st.at || 0;

const docName = (code) => `projects/${FIREBASE.projectId}/databases/(default)/documents/saves/${code}`;

let busy = null;
/** Upload now if the progress changed since the last upload (unless too soon). */
export function upload({ force = false } = {}) {
  if (!cloudEnabled() || !worthSaving() || busy) return busy;
  const data = exportProgress();
  const h = hashString(data);
  if (!force && (h === st.hash || Date.now() - (st.at || 0) < MIN_GAP)) return null;
  const code = cloudCode();
  busy = (async () => {
    await token();
    await http(
      `${DOCS()}:commit?key=${FIREBASE.apiKey}`,
      {
        writes: [
          {
            update: {
              name: docName(code),
              fields: { v: { integerValue: '1' }, data: { stringValue: data }, levels: { integerValue: String(store.data.levels.unlocked - 1) } },
            },
            updateTransforms: [{ fieldPath: 'updated', setToServerValue: 'REQUEST_TIME' }],
          },
        ],
      },
      { auth: true },
    );
    const first = !st.at;
    st.at = Date.now();
    st.hash = h;
    persist();
    if (first) window.dispatchEvent(new CustomEvent('marbl:cloud-first'));
  })()
    .catch(() => {})
    .finally(() => (busy = null));
  return busy;
}

/** Look up a save by code. Resolves { levels, updated, data } or null when there is none. */
export async function fetchSave(code) {
  await token();
  try {
    const d = await http(`${DOCS()}/saves/${code}?key=${FIREBASE.apiKey}`, null, { method: 'GET', auth: true });
    const f = d.fields || {};
    return { levels: Number(f.levels?.integerValue || 0), updated: f.updated?.timestampValue || '', data: f.data?.stringValue || '' };
  } catch (e) {
    if (/not found|404|NOT_FOUND/i.test(String(e?.message))) return null;
    throw e;
  }
}

/** Replace this device's progress with a cloud save, and keep syncing to that code. */
export function restoreSave(code, save) {
  if (!importProgress(save.data)) return false;
  st = { code, at: Date.now(), hash: hashString(save.data) };
  persist();
  return true;
}

// Automatic backup: a little after progress is saved, and when the app is put away.
let timer = 0;
afterSave.add(() => {
  if (timer || !cloudEnabled()) return;
  timer = setTimeout(() => {
    timer = 0;
    upload();
  }, 20000);
});
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') upload();
  });
}
