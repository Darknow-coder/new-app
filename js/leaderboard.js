// Online leaderboard on Firebase (anonymous auth + Firestore), over plain REST:
// no SDK to download, nothing happens until the player opts in.
//
// A player document (players/{uid}) only holds numbers: a, b, n pick a random
// fun name from fixed word lists (so nobody can type anything rude), plus
// levels completed, stars and score = levels * 1000 + stars (one sortable field).
import { FIREBASE } from './online-config.js';

const KEY = 'marbl:online';
const MAX_LEVELS = 320;
export const NAME_ADJ = 24;
export const NAME_ANIMAL = 24;

export const onlineEnabled = () => !!(FIREBASE.apiKey && FIREBASE.projectId);

let session = load();
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* private mode */
  }
}

export const joined = () => !!session.joined;
/** The player left the board on purpose: never re-add them automatically. */
export const optedOut = () => !!session.optedOut;
export const me = () => session;

const DOCS = () => `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;

async function http(url, body, { method = 'POST', auth = false, form = false } = {}) {
  const headers = { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' };
  if (auth) headers.Authorization = `Bearer ${await token()}`;
  const res = await fetch(url, { method, headers, body: form ? body : body && JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data;
}

async function token() {
  const now = Date.now();
  if (session.idToken && session.exp > now + 60000) return session.idToken;
  if (session.refreshToken) {
    try {
      const r = await http(
        `https://securetoken.googleapis.com/v1/token?key=${FIREBASE.apiKey}`,
        `grant_type=refresh_token&refresh_token=${encodeURIComponent(session.refreshToken)}`,
        { form: true },
      );
      Object.assign(session, { idToken: r.id_token, refreshToken: r.refresh_token, uid: r.user_id, exp: now + Number(r.expires_in) * 1000 });
      persist();
      return session.idToken;
    } catch {
      /* refresh token revoked: sign up again below */
    }
  }
  const r = await http(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE.apiKey}`, { returnSecureToken: true });
  Object.assign(session, { idToken: r.idToken, refreshToken: r.refreshToken, uid: r.localId, exp: now + Number(r.expiresIn) * 1000 });
  persist();
  return session.idToken;
}

const int = (v) => ({ integerValue: String(v) });
const num = (f) => Number(f?.integerValue ?? f?.doubleValue ?? 0);

function randomName() {
  return { a: Math.floor(Math.random() * NAME_ADJ), b: Math.floor(Math.random() * NAME_ANIMAL), n: Math.floor(Math.random() * 100) };
}

/** Clamp to what the server rules accept. */
function clean(levels, stars) {
  const l = Math.max(0, Math.min(MAX_LEVELS, Math.floor(levels)));
  return { levels: l, stars: Math.max(0, Math.min(l * 3, Math.floor(stars))) };
}

async function write(levels, stars) {
  await token();
  const s = clean(levels, stars);
  await http(
    `${DOCS()}:commit?key=${FIREBASE.apiKey}`,
    {
      writes: [
        {
          update: {
            name: `projects/${FIREBASE.projectId}/databases/(default)/documents/players/${session.uid}`,
            fields: { a: int(session.a), b: int(session.b), n: int(session.n), levels: int(s.levels), stars: int(s.stars), score: int(s.levels * 1000 + s.stars) },
          },
          updateTransforms: [{ fieldPath: 'updated', setToServerValue: 'REQUEST_TIME' }],
        },
      ],
    },
    { auth: true },
  );
  session.last = s;
  session.lastPush = Date.now();
  persist();
  cache.top = null;
}

/** Opt in: get an anonymous account, a random name, and publish the current progress. */
export async function join(levels, stars) {
  if (session.a === undefined) Object.assign(session, randomName());
  await write(levels, stars);
  session.joined = true;
  session.optedOut = false;
  persist();
}

/** New random name. */
export async function reroll(levels, stars) {
  const prev = { a: session.a, b: session.b, n: session.n };
  Object.assign(session, randomName());
  try {
    await write(levels, stars);
  } catch (e) {
    Object.assign(session, prev);
    throw e;
  }
}

let pushing = null;
/** Publish progress if it changed (fire and forget; failures retry next time). */
export function push(levels, stars) {
  if (!onlineEnabled() || !session.joined || pushing) return;
  const s = clean(levels, stars);
  if (session.last && session.last.levels === s.levels && session.last.stars === s.stars) return;
  // The server rejects writes closer than a few seconds apart; try again later.
  if (Date.now() - (session.lastPush || 0) < 6000) return;
  pushing = write(s.levels, s.stars)
    .catch(() => {})
    .finally(() => (pushing = null));
}

/** Leave the board: delete the document. */
export async function leave() {
  if (session.uid) {
    await http(`${DOCS()}/players/${session.uid}?key=${FIREBASE.apiKey}`, null, { method: 'DELETE', auth: true });
  }
  session.joined = false;
  session.optedOut = true;
  session.last = null;
  persist();
  cache.top = null;
}

/** Send a player's feedback (rating 1-5 + optional text). Readable only in the Firebase console. */
export async function sendFeedback({ rating, text, levels, lang, version }) {
  await token();
  const id = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, '0')).join('');
  await http(
    `${DOCS()}:commit?key=${FIREBASE.apiKey}`,
    {
      writes: [
        {
          update: {
            name: `projects/${FIREBASE.projectId}/databases/(default)/documents/feedback/${id}`,
            fields: {
              rating: int(Math.max(1, Math.min(5, rating))),
              text: { stringValue: String(text || '').slice(0, 500) },
              levels: int(Math.max(0, Math.min(MAX_LEVELS, levels))),
              lang: { stringValue: String(lang).slice(0, 8) },
              version: { stringValue: String(version).slice(0, 20) },
            },
          },
          updateTransforms: [{ fieldPath: 'created', setToServerValue: 'REQUEST_TIME' }],
        },
      ],
    },
    { auth: true },
  );
}

/** Add anonymous counters to metrics/{day} (one write for a whole batch; no player id). */
export async function sendMetrics(day, counts) {
  await token();
  const updateTransforms = Object.entries(counts).map(([k, n]) => ({ fieldPath: k, increment: int(n) }));
  if (!updateTransforms.length) return;
  await http(
    `${DOCS()}:commit?key=${FIREBASE.apiKey}`,
    { writes: [{ update: { name: `projects/${FIREBASE.projectId}/databases/(default)/documents/metrics/${day}`, fields: {} }, updateMask: { fieldPaths: [] }, updateTransforms }] },
    { auth: true },
  );
}

const cache = { top: null, at: 0 };
/** Top players (cached for a minute to stay well inside the free quota). */
export async function top(limit = 50) {
  if (cache.top && Date.now() - cache.at < 60000) return cache.top;
  const rows = await http(`${DOCS()}:runQuery?key=${FIREBASE.apiKey}`, {
    structuredQuery: { from: [{ collectionId: 'players' }], orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }], limit },
  });
  cache.top = rows
    .filter((r) => r.document)
    .map((r) => {
      const f = r.document.fields || {};
      return { uid: r.document.name.split('/').pop(), a: num(f.a), b: num(f.b), n: num(f.n), levels: num(f.levels), stars: num(f.stars) };
    });
  cache.at = Date.now();
  return cache.top;
}

async function count(where) {
  const q = { from: [{ collectionId: 'players' }] };
  if (where) q.where = where;
  const r = await http(`${DOCS()}:runAggregationQuery?key=${FIREBASE.apiKey}`, {
    structuredAggregationQuery: { structuredQuery: q, aggregations: [{ alias: 'c', count: {} }] },
  });
  return num(r?.[0]?.result?.aggregateFields?.c);
}

/** { rank, total } for the given progress. */
export async function rank(levels, stars) {
  const s = clean(levels, stars);
  const [above, total] = await Promise.all([
    count({ fieldFilter: { field: { fieldPath: 'score' }, op: 'GREATER_THAN', value: int(s.levels * 1000 + s.stars) } }),
    count(null),
  ]);
  session.rank = above + 1;
  session.total = total;
  persist();
  return { rank: above + 1, total };
}
