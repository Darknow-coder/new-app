# marbl — the daily tilt puzzle

**Tilt. Roll. Drop.** Swipe to tilt the board: every marble and stone rolls until it hits something.
Roll each marble over the hole of its colour to drop it in. Three new puzzles every day
(Easy / Medium / Hard), the same for everyone, each with a computer-verified **par** —
the minimum possible number of moves. Match par for 3★, then share your day:

```
Marbl #7 🔥4
🟢 ⭐⭐⭐ 5/5
🟡 ⭐⭐▫️ 8/7
🔴 ⭐⭐⭐ 12/12
```

## Features

- **Daily trio** — deterministic puzzles generated from the date, identical worldwide, no server.
- **Provably fair par** — a breadth-first solver computes the true optimum of every puzzle.
- **Spoiler-free sharing** — emoji grid via the native share sheet or clipboard.
- **Streaks & stats** — current/best streak, perfect days, 7-day history.
- **Adventure map** — unlimited numbered levels on a winding path, in worlds of 20 with a sawtooth
  difficulty curve and a boss level at the end of each world.
- **Coins & shop** — coins for every *new* star, daily puzzles, a day-complete bonus and a daily gift;
  spend them on **Hints** (best next move) and **Rewinds** (undo + refund the move). Daily puzzles stay booster-free.
- **Chests** — wooden, silver and golden chests on the map (unlocked by stars per world) and a daily
  chest for finishing the trio, with a full opening ceremony (drop, shake, burst, rewards).
- **Living scenery** — each world has its own animated background (bubbles, embers, snow, leaves, neon…),
  iris transitions between screens, level intro/outro, and a marble that rolls to the next level on the map.
- **Interactive tutorial** — four 1–2 move lessons, one idea each; playing within 10 seconds.
- **Juice** — tilting 3D board, squash on impact, sparks, procedural WebAudio sound, haptics, confetti.
- **PWA** — installable, works fully offline, light & dark themes, English & French.
- **Accessible** — keyboard play (arrows/WASD, Z undo, R restart), screen-reader announcements, reduced-motion support.
- **Zero dependencies, zero build, zero cost** — plain HTML/CSS/ES modules, ~60 KB total.

## Run locally

```bash
npm start      # serves on http://localhost:8080 (python3 http.server)
npm test       # engine + generator tests (node --test), validates 60 days of dailies
```

## Publish for free

GitHub Pages (already wired): merge into `main`, then in the repo **Settings → Pages → Source: GitHub Actions**.
The workflow in `.github/workflows/pages.yml` runs the tests and deploys. Netlify, Cloudflare Pages or
Vercel also work as-is: it is a static folder with no build step.

After deploying, make `og:image` in `index.html` an absolute URL (e.g. `https://you.github.io/new-app/icons/og.png`)
so link previews show the image on every platform, and bump `VERSION` in `sw.js` on each release.

## Architecture

| File | Role |
| --- | --- |
| `js/engine.js` | Pure game logic: tilt physics, BFS solver, seeded generator, star rating. No DOM. |
| `js/levels.js` | Adventure difficulty curve, worlds, coin rewards and shop prices. |
| `js/daily.js` | Date → puzzle number / seed. `GENERATOR_VERSION` must not change for live players. |
| `js/storage.js` | localStorage persistence; stats derived from history so they never drift. |
| `js/main.js` | UI controller: rendering, input, animation, game flow, sharing. |
| `js/fx.js` | Scenery, iris transitions, flying coins, tweens and particle bursts. |
| `js/chests.js` | Chest tiers, reward rolls and the opening ceremony. |
| `js/audio.js` | Procedural sound effects (no audio assets) and haptics. |
| `js/i18n.js` | EN/FR strings, auto-detected from the browser language. |
| `js/tutorial.js` | Hand-made onboarding levels in an ASCII format. |
| `sw.js` | Offline-first service worker. |

All art (icons, marbles, board) is original CSS/SVG; sounds are synthesised at runtime. MIT licensed.
