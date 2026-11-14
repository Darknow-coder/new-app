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
  chest for finishing the trio. Three-tap opening with light leaking through the cracks, a chance to
  upgrade mid-shake, a coin shower and flip-over reward cards by rarity. Tap a chest on the map to preview its odds.
- **Collection** — 9 marble skins (common / rare / epic) found only in chests. Skins change the pattern,
  never the gameplay colour.
- **Content** — 2,000 pre-computed levels (16 illustrated worlds, then harder laps; `js/levels-more.js` holds 321+ and loads after start-up), each verified solvable with an optimal par by the
  test suite; the generator keeps going beyond that.
- **Mechanics** — sand traps (World 2), crystal gates (World 3), portals (World 4), arrows (World 9), pits from level 11 onwards, shaped boards from World 6; mirrors (321), springs (401) and one-way doors (481) in the second lap; then endless remixes. Each is
  introduced by a hand-made level and a discovery card; generated levels must genuinely need their tiles.
- **Progression** — player level & XP (level-up chests), 3 daily quests with a bonus chest, 20 achievements,
  a 7-day escalating login gift, combos (DOUBLE!/TRIPLE!) flagged on levels where one is reachable.
- **Season pass** — free 28-day pass: season points from stars, dailies and quests unlock 30 reward tiers.
- **Challenge a friend** — share a link with a level and the score to beat, plus a generated result image.
- **Feel** — marble trails, portal warps, procedural per-world ambient music (toggle in settings).
- **Living scenery** — each world has its own animated background (bubbles, embers, snow, leaves, neon…),
  iris transitions between screens, level intro/outro, and a marble that rolls to the next level on the map.
- **Interactive tutorial** — four 1–2 move lessons, one idea each; playing within 10 seconds.
- **Juice** — tilting 3D board, squash on impact, sparks, procedural WebAudio sound, haptics, confetti.
- **Painted adventure map** — every world is an illustrated scene baked once into a cached SVG picture
  (coasts, cliffs, forests, cities, floating isles…), with a road made of the world's material, level
  medallions on platforms, boss arenas, and the player's own marble on the current level.
- **Weekly event** — every Monday, 7 stages on a theme (portals, pits, mirrors…) picked from the
  ready-made levels and disguised (turned, mirrored, recoloured); a gold chest at the end.
- **Lucky wheel** — one free spin a day (coins, boosters, chests); optional rewarded bonus spin.
- **Online save** — progress backed up automatically to Firestore under a 12-character recovery code;
  "Recover a game" on another device. Can be deleted from the settings. See `docs/firestore.rules`.
- **PWA** — installable, works fully offline, light & dark themes, English, French & Spanish.
- **Accessible** — keyboard play (arrows/WASD, Z undo, R restart), screen-reader announcements, reduced-motion support.
- **Zero dependencies, zero build, zero cost** — plain HTML/CSS/ES modules, ~60 KB total.

## Run locally

```bash
npm start      # serves on http://localhost:8080 (python3 http.server)
npm test       # engine, levels, chests and progression tests (node --test)
npm run build:levels   # re-generate js/levels-data.js after changing the generator
npm run e2e            # end-to-end smoke test in a headless browser (needs Playwright)
npm run audit:levels   # difficulty audit of all levels
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
| `js/main.js` | Entry point: loads the UI modules and boots the app. |
| `js/ui/core.js` | Shared UI state (`S`), DOM refs, view/dialog helpers, notifications. |
| `js/ui/game.js` | Starting games, board rendering, tilting and animations. |
| `js/ui/result.js` | Win handling, rewards and the result card. |
| `js/ui/home.js`, `mapview.js`, `shop.js`, `collection.js`, `progressui.js`, `settings.js`, `input.js` | One module per screen / feature. |
| `js/fx.js` | Scenery, iris transitions, flying coins, tweens and particle bursts. |
| `js/progress.js` | XP, player level, daily quests, achievements, chest inbox. |
| `js/levels-data.js` | Pre-computed adventure levels (generated by `scripts/build-levels.mjs`). |
| `js/skins.js` | Collectible marble skins and ownership. |
| `js/chests.js` | Chest tiers, reward rolls and the opening ceremony. |
| `js/audio.js` | Procedural sound effects (no audio assets) and haptics. |
| `js/i18n.js` | EN/FR strings, auto-detected from the browser language. |
| `js/tutorial.js` | Hand-made onboarding levels in an ASCII format. |
| `sw.js` | Offline-first service worker. |

All art (icons, marbles, board) is original CSS/SVG; sounds are synthesised at runtime. MIT licensed.

See [RELEASE.md](RELEASE.md) for the release checklist.
