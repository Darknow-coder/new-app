// Store / portal screenshots: `npm run shots` → store/{fr,en}/*.png (1080×1920 phone),
// store/desktop-*.png (1280×720) and store/cover-630x500.png (itch.io cover).
// The online leaderboard is served by an in-memory fake, never the real project.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const fakeFirebase = require('../tests/e2e/fake-firebase.cjs');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'store');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const serve = () =>
  new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(ROOT, url === '/' ? 'index.html' : url);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404), res.end();
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, () => resolve(srv));
  });

const pad = (n) => String(n).padStart(2, '0');
const d = new Date();
const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const best = Object.fromEntries(Array.from({ length: 57 }, (_, i) => [i + 1, i % 5 === 3 ? 2 : 3]));
const SAVE = {
  tutorialDone: true,
  giftDay: today,
  coins: 1240,
  levels: { unlocked: 58, best },
  boosters: { hint: 4, rewind: 6 },
  seenMech: { sand: true, gates: true, portals: true, pits: true, arrows: true },
  skins: { owned: ['classic', 'w0-ball', 'w1-sun', 'w2-ember', 'w3-coral', 'w0-shell'], equipped: 'w1-sun', seen: ['classic', 'w0-ball', 'w1-sun', 'w2-ember', 'w3-coral', 'w0-shell'] },
  daily: { [today]: { easy: { done: true, moves: 5, stars: 3, par: 5 } } },
  player: { level: 9, xp: 120 },
  settings2: { music: true, fbAsked: true },
  edDraft: ['A..#.b', '..~...', '.#..O.', '...B..', '.>..#.', 'a.....'],
};
const seed = Array.from({ length: 40 }, (_, i) => ({ a: (i * 5) % 24, b: (i * 7) % 24, n: (i * 37) % 100, levels: Math.max(3, 140 - i * 4 - (i % 3)), stars: Math.max(6, 400 - i * 11) }));

(async () => {
  const srv = await serve();
  const base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  fs.mkdirSync(OUT, { recursive: true });

  for (const lang of ['fr', 'en']) {
    const dir = path.join(OUT, lang);
    fs.mkdirSync(dir, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: lang === 'fr' ? 'fr-FR' : 'en-US', colorScheme: 'dark' });
    await fakeFirebase(ctx, seed);
    const p = await ctx.newPage();
    await p.addInitScript((s) => {
      localStorage.setItem('marbl:v1', JSON.stringify(s));
      localStorage.setItem('marbl:online', JSON.stringify({ joined: true, optedOut: false, a: 9, b: 0, n: 7, uid: 'me', idToken: 'tok', refreshToken: 'ref', exp: Date.now() + 3.6e6 }));
    }, SAVE);
    const M = (fn, a) => p.evaluate(fn, a);
    const shot = async (name, wait = 1300) => {
      await p.waitForTimeout(wait);
      await p.screenshot({ path: path.join(dir, `${name}.png`) });
    };
    const closeAll = () => M(() => document.querySelectorAll('dialog[open]').forEach((x) => x.close()));
    await p.goto(base);
    await p.waitForTimeout(1500);
    await shot('01-home', 3800); // let the 'new marble' banner pass

    await M(() => window.__marbl.startLevel(58));
    await p.waitForTimeout(1600);
    const sol = await M(() => window.__marbl.game.level.solution);
    for (const dir2 of sol.slice(0, 2)) {
      await M((x) => window.__marbl.move(x), dir2);
      await p.waitForTimeout(700);
    }
    await shot('02-gameplay', 300);
    for (const dir2 of sol.slice(2)) {
      await M((x) => window.__marbl.move(x), dir2);
      await p.waitForTimeout(700);
    }
    await shot('03-victory', 2600);

    await closeAll();
    await M(() => {
      window.__marbl.setPendingUnlock(0);
      window.__marbl.openMap();
    });
    await shot('04-map', 3800);

    await M(() => window.__marbl.startLevel(40));
    await p.waitForTimeout(1600);
    await closeAll();
    await shot('05-boss', 400);

    await p.goto(base);
    await p.waitForTimeout(1500);
    await M(() => {
      window.__marbl.openChest({ tier: 'gold' });
    });
    await shot('06-chest', 3200);
    await p.mouse.click(180, 400);
    await p.waitForTimeout(400);
    await p.goto(base);
    await p.waitForTimeout(1500);

    await M(() => document.querySelector('#btn-collection').click());
    await shot('07-collection');
    await closeAll();

    await M(() => window.__marbl.openLeaderboard());
    await shot('08-leaderboard', 1600);
    await closeAll();

    await M(() => window.__marbl.openEditor());
    await shot('09-editor', 2200);

    await ctx.close();
  }

  // Desktop / landscape (CrazyGames, itch.io page)
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'en-US', colorScheme: 'dark' });
  await fakeFirebase(dctx, seed);
  const dp = await dctx.newPage();
  await dp.addInitScript((s) => localStorage.setItem('marbl:v1', JSON.stringify(s)), SAVE);
  await dp.goto(base);
  await dp.waitForTimeout(3800);
  await dp.screenshot({ path: path.join(OUT, 'desktop-home.png') });
  await dp.evaluate(() => window.__marbl.startLevel(58));
  await dp.waitForTimeout(1800);
  await dp.screenshot({ path: path.join(OUT, 'desktop-gameplay.png') });
  await dctx.close();

  // itch.io cover 630×500: logo + tagline + a gameplay shot in a phone frame.
  const img = fs.readFileSync(path.join(OUT, 'en', '02-gameplay.png')).toString('base64');
  const font = fs.readFileSync(path.join(ROOT, 'fonts', 'fredoka-latin.woff2')).toString('base64');
  const cp = await browser.newPage({ viewport: { width: 630, height: 500 }, deviceScaleFactor: 2 });
  await cp.setContent(`<style>
    @font-face{font-family:F;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:300 700}
    body{margin:0;width:630px;height:500px;overflow:hidden;font-family:F,sans-serif;color:#fff;
      background:radial-gradient(circle at 25% 30%,#3a3f9a,#11142b 70%)}
    .t{position:absolute;left:40px;top:120px;width:300px}
    h1{font-size:92px;margin:0;letter-spacing:-2px;text-shadow:0 6px 0 rgba(0,0,0,.3)}
    p{font-size:24px;font-weight:600;margin:10px 0 18px;color:#c9ccf5;line-height:1.25}
    .b{display:inline-block;background:#ffc23d;color:#3a2500;font-weight:700;padding:8px 16px;border-radius:999px;font-size:18px}
    .ph{position:absolute;right:36px;top:22px;width:250px;height:456px;border-radius:34px;overflow:hidden;
      border:6px solid #272c63;box-shadow:0 20px 50px rgba(0,0,0,.5);transform:rotate(4deg)}
    .ph img{width:100%;height:100%;object-fit:cover;object-position:top}
    i{position:absolute;border-radius:50%}
  </style>
  <i style="left:300px;top:40px;width:46px;height:46px;background:radial-gradient(circle at 35% 30%,#fff 0 8%,#ff5d73 30%,#a3203a)"></i>
  <i style="left:60px;top:400px;width:34px;height:34px;background:radial-gradient(circle at 35% 30%,#fff 0 8%,#1fd1b9 30%,#0d7566)"></i>
  <i style="left:320px;top:420px;width:26px;height:26px;background:radial-gradient(circle at 35% 30%,#fff 0 8%,#ffc23d 30%,#a36a00)"></i>
  <div class="t"><h1>marbl</h1><p>Tilt the board.<br>Drop every marble.</p><span class="b">320 levels · daily puzzles</span></div>
  <div class="ph"><img src="data:image/png;base64,${img}"></div>`);
  await cp.waitForTimeout(400);
  await cp.screenshot({ path: path.join(OUT, 'cover-630x500.png') });

  await browser.close();
  srv.close();
  console.log('screenshots written to store/');
})();
