// In-memory stand-in for Firebase Auth + Firestore REST, for Playwright.
module.exports = async function fakeFirebase(ctx, seed = []) {
  const docs = new Map(seed.map((d, i) => [`seed${i}`, d]));
  let uid = 0;
  await ctx.route('**/js/online-config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const FIREBASE = { apiKey: 'test', projectId: 'demo' };" }));
  const json = (r, body) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  await ctx.route('https://identitytoolkit.googleapis.com/**', (r) => json(r, { idToken: 'tok', refreshToken: 'ref', localId: `u${++uid}`, expiresIn: '3600' }));
  await ctx.route('https://firestore.googleapis.com/**', async (r) => {
    const req = r.request();
    const url = req.url();
    const body = req.postDataJSON?.() || null;
    const num = (f) => Number(f.integerValue);
    if (req.method() === 'DELETE') { docs.delete(url.split('/players/')[1].split('?')[0]); return json(r, {}); }
    if (url.includes(':commit')) {
      const u = body.writes[0].update;
      const f = u.fields;
      const d = { a: num(f.a), b: num(f.b), n: num(f.n), levels: num(f.levels), stars: num(f.stars) };
      if (d.stars > d.levels * 3 || d.levels > 320 || num(f.score) !== d.levels * 1000 + d.stars) return r.fulfill({ status: 403, body: '{"error":{"message":"PERMISSION_DENIED"}}' });
      docs.set(u.name.split('/').pop(), d);
      return json(r, {});
    }
    const score = (d) => d.levels * 1000 + d.stars;
    const enc = (id, d) => ({ document: { name: `projects/demo/databases/(default)/documents/players/${id}`, fields: Object.fromEntries(Object.entries({ ...d, score: score(d) }).map(([k, v]) => [k, { integerValue: String(v) }])) } });
    if (url.includes(':runQuery')) {
      const rows = [...docs].sort((x, y) => score(y[1]) - score(x[1])).slice(0, body.structuredQuery.limit);
      return json(r, rows.map(([id, d]) => enc(id, d)));
    }
    if (url.includes(':runAggregationQuery')) {
      const w = body.structuredAggregationQuery.structuredQuery.where;
      const min = w ? Number(w.fieldFilter.value.integerValue) : -1;
      const c = [...docs.values()].filter((d) => score(d) > min).length;
      return json(r, [{ result: { aggregateFields: { c: { integerValue: String(c) } } } }]);
    }
    return r.fulfill({ status: 404, body: '{}' });
  });
  return docs;
};
