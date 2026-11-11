// End-to-end smoke test: plays through the main flows in a real (headless) browser
// on a phone viewport and fails on any JS error or broken flow.
// Run with:  npm run e2e        (needs Playwright + Chromium installed)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fakeFirebase = require('./fake-firebase.cjs');

const ROOT = path.resolve(__dirname, '../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(ROOT, url === '/' ? 'index.html' : url);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, () => resolve(srv));
  });
}

const steps = [];
async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    steps.push(`✓ ${name} (${Date.now() - t}ms)`);
  } catch (e) {
    steps.push(`✗ ${name}: ${e.message.split('\n')[0]}`);
    throw e;
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(m);
};

(async () => {
  const srv = await serve();
  const base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'fr-FR' });
  // Never touch the real online leaderboard from tests: the feature stays off here
  // (the dedicated step below uses an in-memory fake instead).
  await ctx.route('**/js/online-config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const FIREBASE = { apiKey: '', projectId: '' };" }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const M = (fn, arg) => page.evaluate(fn, arg);
  const solve = async () => {
    for (const d of await M(() => window.__marbl.game.level.solution)) {
      await M((d) => window.__marbl.move(d), d);
      await page.waitForTimeout(450);
    }
    await page.waitForTimeout(1200);
  };
  let ok = true;
  try {
    await step('new player: tutorial', async () => {
      await page.goto(base);
      await page.waitForTimeout(1800);
      for (let i = 0; i < 4; i++) await solve();
      await page.click('#result-actions .btn-primary');
      await page.waitForTimeout(1500);
      assert((await M(() => window.__marbl.game?.n)) === 1, 'tutorial should lead to level 1');
    });
    await step('adventure: win level 1 and 2', async () => {
      await solve();
      assert(await M(() => window.__marbl.game.done), 'level 1 not solved');
      await page.click('#result-actions .btn-primary');
      await page.waitForTimeout(1500);
      await solve();
      assert((await M(() => window.__marbl.store.data.levels.unlocked)) === 3, 'level 3 should be unlocked');
    });
    await step('map renders with scenery', async () => {
      await M(() => window.__marbl.openMap());
      await page.waitForTimeout(1200);
      assert((await page.locator('.map-scene use').count()) > 5, 'no map props drawn');
      assert((await page.locator('.node').count()) >= 20, 'nodes missing');
    });
    await step('chest ceremony', async () => {
      await M(() => {
        window.__marbl.openChest({ tier: 'silver' });
      });
      await page.waitForTimeout(1300);
      await page.mouse.click(200, 450);
      await page.waitForTimeout(5200);
      await page.click('#chest-collect');
      await page.waitForTimeout(1800);
      assert(!(await M(() => document.querySelector('#modal-chest').open)), 'chest dialog stuck open');
    });
    await step('shop: buy a booster pack', async () => {
      await M(() => {
        window.__marbl.store.data.coins = 1000;
        window.__marbl.openShop('boost');
      });
      await page.waitForTimeout(800);
      const before = await M(() => window.__marbl.store.data.boosters.hint);
      await page.click('[data-buy="pack"]', { force: true });
      await page.waitForTimeout(1200);
      assert((await M(() => window.__marbl.store.data.boosters.hint)) === before + 3, 'pack not granted');
      await M(() => document.querySelector('#modal-shop').close());
    });
    await step('daily puzzle', async () => {
      await M(() => window.__marbl.renderHome());
      await page.evaluate(() => document.querySelector('.daily-card[data-diff=easy]').click());
      await page.waitForTimeout(1500);
      await solve();
      assert(await M(() => window.__marbl.game.done), 'daily not solved');
    });
    await step('season pass opens', async () => {
      await M(() => document.querySelector('#modal-result').close());
      await M(() => window.__marbl.openSeason());
      await page.waitForTimeout(600);
      assert((await page.locator('.sp-tier').count()) === 30, 'season tiers missing');
      await M(() => document.querySelector('#modal-season').close());
    });
    await step('challenge link', async () => {
      await page.goto(`${base}?defi=5&c=9`);
      await page.waitForTimeout(1800);
      assert((await M(() => window.__marbl.game?.mode)) === 'challenge', 'challenge mode not started');
      await solve();
      assert(await M(() => window.__marbl.game.done), 'challenge not solved');
    });
    await step('level editor: build, validate, test', async () => {
      await page.goto(base);
      await page.waitForTimeout(1800);
      await page.click('#btn-create');
      await page.waitForTimeout(1600);
      const st = await M(() => document.querySelector('#ed-status').dataset.state);
      assert(st === 'ok', `starter level should be solvable, got ${st}`);
      await page.click('#ed-test');
      await page.waitForTimeout(1500);
      assert((await M(() => window.__marbl.game?.mode)) === 'custom', 'test play did not start');
      await solve();
      assert(await M(() => window.__marbl.game.done), 'custom level not solved');
    });
    await step('shared level link', async () => {
      const rows = ['A....', '.....', '..#..', '.....', '....a'];
      const code = Buffer.from(`${rows.join('/')}|0`).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      await page.goto(`${base}?l=${code}`);
      await page.waitForTimeout(2200);
      assert((await M(() => window.__marbl.game?.mode)) === 'custom', 'shared level did not open');
      await solve();
      assert(await M(() => window.__marbl.game.done), 'shared level not solved');
    });
    await step('daily archives: replay a past day', async () => {
      await page.goto(base);
      await page.waitForTimeout(2200);
      await page.click('#btn-archive');
      await page.waitForTimeout(700);
      const key = await M(() => document.querySelector('.arch-day[data-key]:not(.is-today)')?.dataset.key);
      assert(key, 'no past day in calendar');
      await page.click(`.arch-day[data-key="${key}"]`);
      await page.click('.arch-row[data-diff=easy]');
      await page.waitForTimeout(1300);
      assert(await M(() => window.__marbl.game?.archive), 'archive game did not start');
      await solve();
      const saved = await M((k) => JSON.parse(localStorage.getItem('marbl:v1')).archive[k]?.easy?.done, key);
      assert(saved, 'archive result not saved');
    });
    await step('leaderboard + feedback (fake Firebase)', async () => {
      const ctx2 = await browser.newContext({ ...devices['Pixel 7'], locale: 'fr-FR' });
      const seed = Array.from({ length: 30 }, (_, i) => ({ a: i % 24, b: i % 24, n: i, levels: 10 + i * 3, stars: 20 + i * 6 }));
      const docs = await fakeFirebase(ctx2, seed);
      const p2 = await ctx2.newPage();
      p2.on('pageerror', (e) => errors.push(`lb: ${e}`));
      await p2.addInitScript(() => {
        if (!localStorage.getItem('marbl:v1')) localStorage.setItem('marbl:v1', JSON.stringify({ tutorialDone: true, levels: { unlocked: 31, best: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, 3])) } }));
      });
      await p2.goto(base);
      await p2.waitForTimeout(2200);
      assert(docs.size === 31, 'player not added automatically');
      await p2.click('#btn-rank');
      await p2.waitForTimeout(1000);
      assert((await p2.textContent('#lb-rank')) === '#24', `wrong rank ${await p2.textContent('#lb-rank')}`);
      assert((await p2.locator('.lb-row.is-me').count()) === 1, 'own row missing');
      // Feedback window, offered from Settings.
      await p2.click('#modal-rank .modal-close');
      await p2.waitForTimeout(500);
      await p2.click('#btn-settings');
      await p2.waitForTimeout(500);
      await p2.click('#btn-feedback');
      await p2.waitForTimeout(500);
      await p2.click('.fb-face[data-r="5"]');
      await p2.fill('#fb-text', 'Super jeu');
      await p2.click('#fb-send');
      await p2.waitForTimeout(800);
      assert(docs.feedback?.[0]?.rating === 5 && docs.feedback[0].text === 'Super jeu', 'feedback not sent');
      await p2.click('#btn-rank');
      await p2.waitForTimeout(800);
      p2.once('dialog', (d) => d.accept());
      await p2.click('#lb-leave');
      await p2.waitForTimeout(600);
      assert(docs.size === 30, 'leave did not delete');
      await p2.reload();
      await p2.waitForTimeout(2000);
      assert(docs.size === 30, 'player re-added after leaving');
      await ctx2.close();
    });
    await step('save export / import', async () => {
      const ok2 = await M(async () => {
        const s = await import('./js/storage.js');
        const code = s.exportProgress();
        return s.importProgress(code);
      });
      assert(ok2, 'round-trip failed');
    });
    assert(!errors.length, `JS errors: ${errors.join(' | ')}`);
  } catch {
    ok = false;
  }
  console.log(steps.join('\n'));
  if (errors.length) console.log('errors:', errors);
  await browser.close();
  srv.close();
  process.exit(ok ? 0 : 1);
})();
