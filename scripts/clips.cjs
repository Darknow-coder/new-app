#!/usr/bin/env node
// Marbl video factory: vertical 1080×1920 clips for TikTok / Reels / Shorts.
//
//   node scripts/clips.cjs solve     [--level 216 | --daily hard] [--text "…"]      satisfying solve + game sounds
//   node scripts/clips.cjs fail      [--level 36]  [--text "…"]                      a "smart" move straight into a pit
//   node scripts/clips.cjs challenge [--daily hard | --level 216] [--text "…"]       board only: "how many moves?"
//   node scripts/clips.cjs edit      --edit some-edit.mp4 [--level 216] [--text "…"] [--caption "…"]
//   node scripts/clips.cjs batch     --edits folder/ [--count 3] [--lang fr]         every edit × spectacular levels
//
// "edit" = gameplay with the edit's music muffled underneath, then BAM: the edit plays
// in full on the victory, in sync with its own sound. Green-screen templates ("FOLLOW FOR
// MORE / 4K" frames) are detected and cropped automatically; trailing black / end cards
// are cut. Output goes to clips/ (git-ignored). Needs Playwright + ffmpeg.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'clips');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'marbl-clips-'));
const W = 1080;
const H = 1920;

/* ---------- small helpers ---------- */
const args = (() => {
  const a = { _: [] };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    if (v[i].startsWith('--')) a[v[i].slice(2)] = v[i + 1] && !v[i + 1].startsWith('--') ? v[++i] : true;
    else a._.push(v[i]);
  }
  return a;
})();
const LANG = args.lang || 'fr';
const ff = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: ['ignore', 'ignore', 'inherit'] });
const probe = (f) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', f], { encoding: 'utf8' }));
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

const TXT = {
  fr: {
    solve: (p) => `Trouve la solution en ${p} coups 🧠`,
    fail: 'Quand tu crois avoir trouvé… 💀',
    challenge: (p) => `Tu le fais en combien ? (par ${p}) 🤔`,
    challengeEnd: 'Réponds en commentaire 👇',
    caption: (p) => `moi après l'avoir fini en ${p} coups 😌`,
    cta: 'marbl · gratuit · lien en bio',
  },
  en: {
    solve: (p) => `Solve it in ${p} moves 🧠`,
    fail: 'When you think you got it… 💀',
    challenge: (p) => `How many moves? (par ${p}) 🤔`,
    challengeEnd: 'Answer in the comments 👇',
    caption: (p) => `me after finishing it in ${p} moves 😌`,
    cta: 'marbl · free · link in bio',
  },
  es: {
    solve: (p) => `Resuélvelo en ${p} movimientos 🧠`,
    fail: 'Cuando crees que lo tienes… 💀',
    challenge: (p) => `¿En cuántos movimientos? (par ${p}) 🤔`,
    challengeEnd: 'Responde en los comentarios 👇',
    caption: (p) => `yo después de terminarlo en ${p} movimientos 😌`,
    cta: 'marbl · gratis · enlace en la bio',
  },
}[LANG];

/* ---------- static server ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(ROOT, url === '/' ? 'index.html' : url);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404), res.end();
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, () => resolve(srv));
  });
}

/* ---------- level picking (runs the game's own engine) ---------- */
async function engine() {
  const L = await import(path.join(ROOT, 'js/levels.js'));
  const E = await import(path.join(ROOT, 'js/engine.js'));
  return { L, E };
}

/** Par of an adventure level or of today's daily puzzle. */
async function parOf({ level, daily }) {
  if (daily) {
    const D = await import(path.join(ROOT, 'js/daily.js'));
    return D.dailyLevel(D.dateKey(), daily).par;
  }
  const { L } = await engine();
  return L.adventureLevel(level).par;
}

/** Levels that look great solved: 3 marbles, a final double drop, mechanics, long-ish par. */
async function spectacularLevels(count, skip = []) {
  const { L, E } = await engine();
  const scored = [];
  for (let n = 40; n <= 320; n++) {
    if (skip.includes(n)) continue;
    const l = L.adventureLevel(n);
    const marbles = l.pieces.filter((p) => p.kind === 'marble').length;
    if (marbles < 3 || l.par < 8 || l.par > 13) continue;
    let st = l.start;
    let last = 0;
    let warps = 0;
    l.solution.forEach((d, i) => {
      const r = E.tilt(l, st, d);
      if (i === l.solution.length - 1) last = r.moves.filter((m) => m && m.sunk).length;
      warps += r.moves.filter((m) => m && m.segs && m.segs.length > 1).length;
      st = r.state;
    });
    const feats = ['sand', 'portal', 'gates', 'arrows', 'pits'].filter((k) => l[k] && [...l[k]].some((v) => (k === 'sand' || k === 'pits' ? v > 0 : v >= 0))).length;
    scored.push({ n, score: last * 10 + Math.min(warps, 8) + feats * 2 + (L.isBoss(n) ? 4 : 0) });
  }
  scored.sort((a, b) => b.score - a.score);
  // Spread the picks across worlds so a batch doesn't look the same.
  const picked = [];
  const worlds = new Set();
  for (const s of scored) {
    const w = L.worldOf(s.n);
    if (worlds.has(w)) continue;
    worlds.add(w);
    picked.push(s.n);
    if (picked.length >= count) break;
  }
  return picked;
}

/** A level and a move sequence that ends in a pit after a few "good" moves. */
async function failPlan(level) {
  const { L, E } = await engine();
  const tryLevel = (n) => {
    const l = L.adventureLevel(n);
    if (!l.pits) return null;
    let st = l.start;
    for (let k = 0; k < l.solution.length; k++) {
      if (k >= 3) for (const d of ['up', 'down', 'left', 'right']) if (d !== l.solution[k] && E.isDead(E.tilt(l, st, d).state)) return { n, moves: [...l.solution.slice(0, k), d] };
      st = E.tilt(l, st, l.solution[k]).state;
    }
    return null;
  };
  if (level) return tryLevel(level);
  const pool = [];
  for (let n = 60; n <= 320; n++) {
    const p = tryLevel(n);
    if (p && p.moves.length >= 5) pool.push(p);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ---------- caption images (Fredoka, like the game) ---------- */
async function captionPNG(browser, text, file, { size = 50, rotate = -2, wrap = false } = {}) {
  const font = (f) => fs.readFileSync(path.join(ROOT, 'fonts', f)).toString('base64');
  const p = await browser.newPage({ viewport: { width: 2000, height: 400 } });
  await p.setContent(`<style>@font-face{font-family:F;src:url(data:font/woff2;base64,${font('fredoka-latin.woff2')})}@font-face{font-family:F;src:url(data:font/woff2;base64,${font('fredoka-latin-ext.woff2')})}
    html,body{margin:0;background:transparent}
    div{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(${rotate}deg);${wrap ? 'max-width:960px;' : 'white-space:nowrap;'}text-align:center;background:#fff;color:#11142b;font:700 ${size}px/1.15 F,sans-serif;padding:18px 34px;border-radius:30px;box-shadow:0 12px 0 rgba(0,0,0,.25)}</style><div>${text}</div>`);
  await p.waitForTimeout(300);
  const png = await p.screenshot({ omitBackground: true });
  await p.close();
  // trim the transparent margin
  const tmp = path.join(TMP, `cap-${Date.now()}.png`);
  fs.writeFileSync(tmp, png);
  const bbox = await (async () => {
    const q = await browser.newPage();
    const r = await q.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
      for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 3] > 8) { x0 = Math.min(x0, xx); y0 = Math.min(y0, y); x1 = Math.max(x1, xx); y1 = Math.max(y1, y); }
      return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
    }, png.toString('base64'));
    await q.close();
    return r;
  })();
  ff('-i', tmp, '-vf', `crop=${bbox[2]}:${bbox[3]}:${bbox[0]}:${bbox[1]}`, file);
  return file;
}

/* ---------- recording the game ---------- */
const SKINS = ['w15-legend', 'w8-legend', 'w11-legend', 'w7-legend', 'w10-legend', 'w14-legend', 'w13-legend', 'w2-legend'];

/**
 * Record gameplay. plan = { level } | { daily: 'hard' }, moves = list or 'solution' or [].
 * Returns { mp4, webm, offset, duration, cut, par }.
 */
async function record(browser, base, { level, daily, moves = 'solution', hook = '', skin, step = 780, look = 1300, tail = 2600, name, hideHookAt = 0 }) {
  const ctx = await browser.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, locale: { fr: 'fr-FR', en: 'en-US', es: 'es-ES' }[LANG], colorScheme: 'dark' });
  await ctx.route('**/js/online-config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const FIREBASE = { apiKey: '', projectId: '' };" }));
  const p = await ctx.newPage();
  const n = level || 1;
  skin = skin || SKINS[Math.floor(Math.random() * SKINS.length)];
  const best = Object.fromEntries(Array.from({ length: Math.max(0, n - 1) }, (_, i) => [i + 1, 3]));
  await p.addInitScript(([best, n, skin, lang]) => {
    localStorage.setItem('marbl:v1', JSON.stringify({ tutorialDone: true, giftDay: '2099-01-01', levels: { unlocked: n, best }, settings2: { fbAsked: true, music: false },
      seenMech: { sand: true, gates: true, portals: true, pits: true, arrows: true }, skins: { owned: ['classic', skin], equipped: skin, seen: ['classic', skin] } }));
    localStorage.setItem('marbl:lite', JSON.stringify({ lite: false, at: Date.now() }));
    localStorage.setItem('marbl:lang', lang);
    // Tee the game's sound into a recorder.
    const orig = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (t, ...rest) {
      if (t instanceof AudioDestinationNode && !window.__rec) {
        const dest = this.context.createMediaStreamDestination();
        orig.call(this, dest);
        const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 });
        window.__chunks = [];
        rec.ondataavailable = (e) => e.data.size && window.__chunks.push(e.data);
        window.__rec = rec;
      }
      return orig.call(this, t, ...rest);
    };
  }, [best, n, skin, LANG]);
  await p.goto(base);
  await p.waitForTimeout(3500);
  await p.evaluate(async () => (await import('./js/audio.js')).unlockAudio());
  await p.waitForTimeout(300);
  if (daily) await p.evaluate((d) => window.__marbl.startDaily(d), daily);
  else await p.evaluate((n) => window.__marbl.startLevel(n), n);
  await p.waitForTimeout(1800);
  await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  await p.addStyleTag({ content: '#notif{display:none!important}' });
  const par = await p.evaluate(() => window.__marbl.game.level.par);
  if (moves === 'solution') moves = await p.evaluate(() => window.__marbl.game.level.solution);
  if (hook) {
    await p.evaluate((h) => {
      const d = document.createElement('div');
      d.id = 'tt-hook';
      d.textContent = h;
      d.style.cssText = 'position:fixed;left:50%;top:15%;transform:translateX(-50%) rotate(-2deg);z-index:99999;background:#fff;color:#11142b;font:700 25px Fredoka,sans-serif;padding:10px 18px;border-radius:14px;box-shadow:0 6px 0 rgba(0,0,0,.25);white-space:nowrap;max-width:92vw;transition:opacity .3s';
      document.body.appendChild(d);
    }, hook);
  }
  await p.waitForTimeout(300);
  const cdp = await ctx.newCDPSession(p);
  const frames = [];
  cdp.on('Page.screencastFrame', (f) => {
    frames.push({ t: f.metadata.timestamp, data: f.data });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  const recStart = await p.evaluate(() => {
    window.__rec.start();
    return Date.now();
  });
  const t0 = Date.now();
  if (hideHookAt) await p.evaluate((ms) => setTimeout(() => document.getElementById('tt-hook') && (document.getElementById('tt-hook').style.opacity = 0), ms), hideHookAt);
  await p.waitForTimeout(look);
  let lastMove = Date.now();
  for (let i = 0; i < moves.length; i++) {
    if (i === 2 && hook && moves.length > 4) await p.evaluate(() => document.getElementById('tt-hook') && (document.getElementById('tt-hook').style.opacity = 0));
    lastMove = Date.now();
    await p.evaluate((d) => window.__marbl.move(d), moves[i]);
    await p.waitForTimeout(step);
  }
  await p.waitForTimeout(tail);
  await cdp.send('Page.stopScreencast');
  const audio = await p.evaluate(
    () =>
      new Promise((res) => {
        window.__rec.onstop = async () => {
          const buf = new Uint8Array(await new Blob(window.__chunks).arrayBuffer());
          let s = '';
          for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode(...buf.subarray(i, i + 32768));
          res(btoa(s));
        };
        window.__rec.stop();
      }),
  );
  await ctx.close();
  // Constant 30 fps from the timestamped frames.
  const dir = path.join(TMP, `${name}-frames`);
  fs.mkdirSync(dir, { recursive: true });
  const start = frames[0].t;
  const end = frames[frames.length - 1].t;
  let k = 0;
  for (let t = start, j = 0; t <= end; t += 1 / 30) {
    while (j + 1 < frames.length && frames[j + 1].t <= t) j++;
    fs.writeFileSync(path.join(dir, `${String(k++).padStart(5, '0')}.jpg`), Buffer.from(frames[j].data, 'base64'));
  }
  const mp4 = path.join(TMP, `${name}.mp4`);
  ff('-framerate', '30', '-i', path.join(dir, '%05d.jpg'), '-vf', `scale=${W}:${H}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', mp4);
  const webm = path.join(TMP, `${name}.webm`);
  fs.writeFileSync(webm, Buffer.from(audio, 'base64'));
  const first = start * 1000;
  return {
    mp4,
    webm,
    par,
    skip: Math.max(0, (first - recStart) / 1000), // seconds of audio before the first frame
    duration: k / 30,
    cut: Math.min(k / 30, (lastMove - t0) / 1000 + 2.2 + (t0 - first) / 1000), // victory card is up ~2.2 s after the last tilt
  };
}

/* ---------- edits: auto-crop green-screen templates ---------- */
function analyzeEdit(file) {
  const info = probe(file);
  const v = info.streams.find((s) => s.codec_type === 'video');
  const dur = Number(info.format.duration);
  // Is the border chroma green? Sample a frame and scan the middle row / column.
  const frame = path.join(TMP, `edit-${slug(path.basename(file))}.rgb`);
  ff('-ss', String(Math.min(2, dur / 3)), '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', frame);
  const px = fs.readFileSync(frame);
  const w = v.width;
  const h = v.height;
  const at = (x, y) => px.subarray((y * w + x) * 3, (y * w + x) * 3 + 3);
  const green = (c) => c[1] > 140 && c[0] < 130 && c[2] < 130;
  let crop = null;
  if (green(at(2, Math.floor(h / 2))) && green(at(w - 3, Math.floor(h / 2)))) {
    const run = (len, get) => {
      const c = Math.floor(len / 2);
      let a = c;
      let b = c;
      while (a > 0 && !green(get(a - 1))) a--;
      while (b < len - 1 && !green(get(b + 1))) b++;
      return [a, b];
    };
    const [x0, x1] = run(w, (x) => at(x, Math.floor(h / 2)));
    const [y0, y1] = run(h, (y) => at(Math.floor(w / 2), y));
    const m = 2;
    crop = { x: x0 + m, y: y0 + m, w: (x1 - x0 + 1 - 2 * m) & ~1, h: (y1 - y0 + 1 - 2 * m) & ~1 };
  }
  // Where does the real content end? (black screen, then often a TikTok end card)
  const area = crop ? `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},` : '';
  let end = dur;
  const log = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-vf', `${area}blackdetect=d=0.3:pix_th=0.08`, '-an', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
  const blacks = [...log.matchAll(/black_start:([\d.]+)/g)].map((x) => Number(x[1])).filter((t) => t > 2);
  if (blacks.length) end = blacks[0];
  const hasAudio = info.streams.some((s) => s.codec_type === 'audio');
  return { crop, end: Math.min(end, dur), hasAudio, w, h };
}

/* ---------- composing ---------- */
const VID = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart'];
const AUD = ['-c:a', 'aac', '-b:a', '192k'];

/** Gameplay + its own sounds + a CTA card at the end. */
function composePlain(g, out, cta, until = g.duration) {
  ff(
    '-i', g.mp4, '-i', g.webm, '-loop', '1', '-i', cta,
    '-filter_complex',
    `[0:v]trim=0:${until},setpts=PTS-STARTPTS,fps=30,setsar=1[gv];[2:v]scale='min(iw,${W - 120})':-1,format=rgba,fade=in:st=${Math.max(0, until - 1.6)}:d=0.3:alpha=1[c];` +
      `[gv][c]overlay=(W-w)/2:H-h-70:shortest=1,format=yuv420p[v];` +
      `[1:a]atrim=start=${g.skip},asetpts=PTS-STARTPTS,atrim=0:${until},volume=1.6,afade=t=out:st=${until - 0.4}:d=0.4,aresample=44100,aformat=channel_layouts=stereo,apad=whole_dur=${until}[a]`,
    '-map', '[v]', '-map', '[a]', ...VID, ...AUD, out,
  );
}

/** Gameplay (muffled edit music + game sounds + riser) → BAM → the edit, in sync with its sound. */
function composeEdit(g, editFile, ed, out, captionPng) {
  const cut = g.cut;
  const dur = ed.end;
  const crop = ed.crop ? `crop=${ed.crop.w}:${ed.crop.h}:${ed.crop.x}:${ed.crop.y},` : '';
  const steps = [0, 0.25, 0.5, 0.66, 0.75, 0.8, 0.85, 0.9, 0.94].map((f, i) => `${(cut * f).toFixed(2)} lowpass@lp f ${[260, 300, 360, 450, 560, 700, 900, 1200, 1700][i]}`).join(';');
  const music = ed.hasAudio ? '[2:a]' : `anullsrc=r=44100:cl=stereo,atrim=0:${dur + cut}`;
  const filter =
    `[0:v]trim=0:${cut},setpts=PTS-STARTPTS,fps=30,setsar=1,format=yuv420p[ga];` +
    `[2:v]trim=0:${dur},setpts=PTS-STARTPTS,${crop}setsar=1,fps=30,split[j1][j2];` +
    `[j1]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=30:3,eq=brightness=-0.12[bg];` +
    `[j2]scale=1040:-2:flags=lanczos,unsharp=5:5:0.6,scale='min(iw,${W})':'min(ih,${H - 200})':force_original_aspect_ratio=decrease[fg];` +
    `[bg][fg]overlay=(W-w)/2:(H-h)/2+60[jb];` +
    (captionPng ? `[3:v]scale='min(iw,960)':-1,format=rgba[cap];[jb][cap]overlay=(W-w)/2:300:shortest=1[jc];` : `[jb]null[jc];`) +
    `[jc]fade=in:st=0:d=0.3:color=white,setsar=1,format=yuv420p[jv];[ga][jv]concat=n=2:v=1:a=0[v];` +
    `${music}asplit[m1][m2];` +
    `[m1]atrim=0:${cut},asetpts=PTS-STARTPTS,asendcmd=c='${steps}',lowpass@lp=f=260,lowpass=f=2400,volume=0.42,afade=t=in:st=0:d=0.8,afade=t=out:st=${cut - 0.35}:d=0.3,aresample=44100,aformat=channel_layouts=stereo[intro];` +
    `anoisesrc=d=1.5:c=pink:a=0.35:r=44100,highpass=f=2500,afade=t=in:st=0:d=1.35:curve=exp,afade=t=out:st=1.35:d=0.12,aformat=channel_layouts=stereo,adelay=${Math.round((cut - 1.65) * 1000)}|${Math.round((cut - 1.65) * 1000)},apad=whole_dur=${cut},atrim=0:${cut}[riser];` +
    `[1:a]atrim=start=${g.skip},asetpts=PTS-STARTPTS,atrim=0:${cut},volume=1.5,aresample=44100,aformat=channel_layouts=stereo,apad=whole_dur=${cut}[sfx];` +
    `[intro][riser][sfx]amix=inputs=3:normalize=0:duration=first[aa];` +
    `[m2]atrim=0:${dur},asetpts=PTS-STARTPTS,afade=t=out:st=${Math.max(0, dur - 0.5)}:d=0.5,aresample=44100,aformat=channel_layouts=stereo[ja];` +
    `[aa][ja]concat=n=2:v=0:a=1,alimiter=limit=0.95[a]`;
  const inputs = ['-i', g.mp4, '-i', g.webm, '-i', editFile];
  if (captionPng) inputs.push('-loop', '1', '-i', captionPng);
  ff(...inputs, '-filter_complex', filter, '-map', '[v]', '-map', '[a]', ...VID, ...AUD, out);
}

/* ---------- commands ---------- */
async function main() {
  const cmd = args._[0];
  if (!cmd || args.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 15).join('\n'));
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const made = [];
  const stamp = new Date().toISOString().slice(0, 10);
  const cta = await captionPNG(browser, TXT.cta, path.join(TMP, 'cta.png'), { size: 52, rotate: 0 });
  try {
    if (cmd === 'solve' || cmd === 'challenge') {
      const level = args.level ? Number(args.level) : null;
      const daily = args.daily ? (args.daily === true ? 'hard' : args.daily) : null;
      const lv = level || (daily ? null : (await spectacularLevels(1))[0]);
      const name = `${cmd}-${daily ? `daily-${daily}` : `n${lv}`}`;
      const par = await parOf({ level: lv, daily });
      if (cmd === 'solve') {
        const g2 = await record(browser, base, { level: lv, daily, hook: args.text || TXT.solve(par), name });
        const out = path.join(OUT, `${stamp}-${name}.mp4`);
        composePlain(g2, out, cta, Math.min(g2.duration, g2.cut + 1.2));
        made.push(out);
      } else {
        const g2 = await record(browser, base, { level: lv, daily, moves: [], hook: args.text || TXT.challenge(par), look: 7000, tail: 0, name, hideHookAt: 3200 });
        const end = await captionPNG(browser, TXT.challengeEnd, path.join(TMP, 'chend.png'), { size: 60 });
        const out = path.join(OUT, `${stamp}-${name}.mp4`);
        ff('-i', g2.mp4, '-loop', '1', '-i', end, '-loop', '1', '-i', cta, '-filter_complex',
          `[0:v]fps=30,setsar=1[g];[1:v]scale='min(iw,${W - 120})':-1,format=rgba,fade=in:st=3.5:d=0.3:alpha=1[e];[2:v]scale='min(iw,${W - 120})':-1,format=rgba,fade=in:st=4:d=0.3:alpha=1[c];[g][e]overlay=(W-w)/2:250:shortest=1[x];[x][c]overlay=(W-w)/2:H-h-70:shortest=1,format=yuv420p[v];anullsrc=r=44100:cl=stereo[a]`,
          '-map', '[v]', '-map', '[a]', '-t', String(g2.duration), ...VID, ...AUD, out);
        made.push(out);
      }
    } else if (cmd === 'fail') {
      const plan = await failPlan(args.level ? Number(args.level) : null);
      if (!plan) throw new Error('no fail move found for this level (it needs pits)');
      const name = `fail-n${plan.n}`;
      const g = await record(browser, base, { level: plan.n, moves: plan.moves, hook: args.text || TXT.fail, step: 820, tail: 2200, name });
      const out = path.join(OUT, `${stamp}-${name}.mp4`);
      composePlain(g, out, cta, g.duration);
      made.push(out);
    } else if (cmd === 'edit' || cmd === 'batch') {
      const edits =
        cmd === 'edit'
          ? [args.edit]
          : fs.readdirSync(args.edits).filter((f) => /\.(mp4|mov|webm|m4v)$/i.test(f)).map((f) => path.join(args.edits, f));
      if (!edits.length || !edits[0]) throw new Error('give --edit file.mp4 (or --edits folder/ for batch)');
      const count = Number(args.count || 1);
      const levels = args.level ? [Number(args.level)] : await spectacularLevels(edits.length * count);
      let li = 0;
      for (const e of edits) {
        const ed = analyzeEdit(e);
        console.log(`edit ${path.basename(e)}: ${ed.crop ? `green screen, crop ${ed.crop.w}x${ed.crop.h}` : 'full frame'}, content 0-${ed.end.toFixed(2)}s${ed.hasAudio ? '' : ' (no sound)'}`);
        for (let i = 0; i < count; i++) {
          const n = levels[li++ % levels.length];
          const name = `edit-${slug(path.basename(e, path.extname(e)))}-n${n}`;
          const hook = args.text || TXT.solve(await parOf({ level: n }));
          const g = await record(browser, base, { level: n, hook, name });
          const cap = args.caption === 'none' ? null : await captionPNG(browser, args.caption || TXT.caption(g.par), path.join(TMP, `${name}-cap.png`));
          const out = path.join(OUT, `${stamp}-${name}.mp4`);
          composeEdit(g, e, ed, out, cap);
          made.push(out);
          console.log('  made', path.relative(ROOT, out));
        }
      }
    } else {
      throw new Error(`unknown command "${cmd}" (solve, fail, challenge, edit, batch)`);
    }
  } finally {
    await browser.close();
    srv.close();
    fs.rmSync(TMP, { recursive: true, force: true });
  }
  for (const f of made) {
    const d = Number(probe(f).format.duration).toFixed(1);
    console.log(`✓ ${path.relative(ROOT, f)}  (${d}s)`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
