// Anonymous play counters, to see where players get stuck (which levels are started,
// won, lost in a pit, need hints). Counts only: no player id, no device info.
// Batched locally and sent at most every couple of minutes, one write per day-batch.
import { dateKey } from './daily.js';
import { onlineEnabled } from './leaderboard.js';

const KEY = 'marbl:metrics';
let pending = load();
let timer = 0;
let sending = false;

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    /* ignore */
  }
}

/** Count an event, e.g. count('s', 216) → field "s216" for today. */
export function count(kind, id = '') {
  if (!onlineEnabled()) return;
  const day = dateKey();
  const k = `${kind}${id}`;
  pending[day] = pending[day] || {};
  pending[day][k] = (pending[day][k] || 0) + 1;
  persist();
  clearTimeout(timer);
  timer = setTimeout(flush, 120000);
}

export async function flush() {
  if (sending || !onlineEnabled()) return;
  const days = Object.keys(pending);
  if (!days.length) return;
  sending = true;
  try {
    const { sendMetrics } = await import('./leaderboard.js');
    for (const day of days) {
      const batch = pending[day];
      delete pending[day];
      persist();
      try {
        await sendMetrics(day, batch);
      } catch {
        // Offline / quota: put the counts back for next time.
        pending[day] = pending[day] || {};
        for (const [k, n] of Object.entries(batch)) pending[day][k] = (pending[day][k] || 0) + n;
        persist();
        break;
      }
    }
  } finally {
    sending = false;
  }
}

/* ---------- crash counters ----------
   A tiny script in index.html notes every uncaught error (file and line). Here they become
   counters like "err_v110_mapview_163" (version, file, line): enough to find the bug, and
   nothing about the player. Each place is counted once per session. */
const APP = 'v110';
const seenErr = new Set();
function drainErrors() {
  const list = typeof window !== 'undefined' ? window.__errs : null;
  if (!list?.length) return;
  for (const [src, line] of list.splice(0)) {
    let file = '';
    let ln = Number(line) || 0;
    const m = String(src).match(/([\w.-]+)\.js(?:\?[^:]*)?:(\d+)(?::\d+)?/);
    if (m) {
      file = m[1];
      ln = ln || Number(m[2]);
    } else if (/^https?:/.test(src) && String(src).startsWith(location.origin)) file = String(src).split('/').pop().replace(/\.js.*$/, '');
    // Ignore errors from other origins (scripts injected by in-app browsers, extensions...).
    if (/^https?:/.test(src) && !String(src).startsWith(location.origin)) continue;
    const key = `${APP}_${(file || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}_${ln}`;
    if (seenErr.has(key) || seenErr.size >= 8) continue;
    seenErr.add(key);
    count('err_', key);
  }
}

if (typeof document !== 'undefined') {
  setInterval(drainErrors, 5000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && (drainErrors(), flush()));
  // Leftovers from a previous session.
  setTimeout(flush, 15000);
}
