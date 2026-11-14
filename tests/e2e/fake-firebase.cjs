// In-memory stand-in for Firebase Auth + Firestore REST, for Playwright.
module.exports = async function fakeFirebase(ctx, seed = [], shared = null) {
  const docs = shared || new Map(seed.map((d, i) => [`seed${i}`, d]));
  let uid = 0;
  await ctx.route('**/js/online-config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const FIREBASE = { apiKey: 'test', projectId: 'demo' };" }));
  const json = (r, body) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  await ctx.route('https://identitytoolkit.googleapis.com/**', (r) => json(r, { idToken: 'tok', refreshToken: 'ref', localId: `u${++uid}`, expiresIn: '3600' }));
  await ctx.route('https://firestore.googleapis.com/**', async (r) => {
    const req = r.request();
    const url = req.url();
    const body = req.postDataJSON?.() || null;
    const num = (f) => Number(f.integerValue);
    if (req.method() === 'DELETE') {
      if (url.includes('/saves/')) delete docs.saves?.[url.split('/saves/')[1].split('?')[0]];
      else docs.delete(url.split('/players/')[1].split('?')[0]);
      return json(r, {});
    }
    if (url.includes(':commit')) {
      const u = body.writes[0].update;
      const f = u.fields;
      if (u.name.includes('/metrics/')) {
        docs.metrics = docs.metrics || {};
        for (const tr of body.writes[0].updateTransforms || []) docs.metrics[tr.fieldPath] = (docs.metrics[tr.fieldPath] || 0) + Number(tr.increment.integerValue);
        return json(r, {});
      }
      if (u.name.includes('/saves/')) {
        docs.saves = docs.saves || {};
        docs.saves[u.name.split('/').pop()] = { data: f.data.stringValue, levels: num(f.levels), updated: new Date().toISOString() };
        return json(r, {});
      }
      if (u.name.includes('/feedback/')) {
        docs.feedback = docs.feedback || [];
        docs.feedback.push({ rating: num(f.rating), text: f.text.stringValue, levels: num(f.levels) });
        return json(r, {});
      }
      const d = { a: num(f.a), b: num(f.b), n: num(f.n), levels: num(f.levels), stars: num(f.stars) };
      if (d.stars > d.levels * 3 || d.levels > 100000 || num(f.score) !== d.levels * 1000 + d.stars) return r.fulfill({ status: 403, body: '{"error":{"message":"PERMISSION_DENIED"}}' });
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
    if (req.method() === 'GET' && url.includes('/saves/')) {
      const sv = docs.saves?.[url.split('/saves/')[1].split('?')[0]];
      if (!sv) return r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":{"code":404,"message":"Document not found.","status":"NOT_FOUND"}}' });
      return json(r, { fields: { data: { stringValue: sv.data }, levels: { integerValue: String(sv.levels) }, updated: { timestampValue: sv.updated } } });
    }
    return r.fulfill({ status: 404, body: '{}' });
  });
  return docs;
};
