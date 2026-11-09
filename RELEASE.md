# Marbl — release checklist

## Done (foundations)
- [x] 240 levels, all verified solvable with optimal par (`npm test`), difficulty audited (`npm run audit:levels`)
- [x] End-to-end smoke test of every main flow (`npm run e2e`)
- [x] Works offline (service worker), installable PWA, EN/FR, light/dark, reduced-motion support
- [x] Performance budget on a 6×-throttled CPU: gameplay ~60 fps, chest ~50 fps, map open < 0.1 s worst frame
- [x] Saves: daily backup copy, automatic repair of corrupted data, export/import code
- [x] Privacy statement (no data collected) and credits in Settings → About
- [x] Economy tuned (~500 coins/day for a regular player)

## Before a public launch
- [ ] **Real-device testing**: one recent iPhone (Safari), one mid-range and one old Android (Chrome)
- [ ] **Playtest with 5–10 people** who never saw the game; note where they get stuck or quit
- [ ] **Own domain** (≈10 €/year, optional) or keep `*.github.io`
- [ ] **Store screenshots and a short trailer** (can be made from the game itself)
- [ ] Decide the **name** after a trademark check (search "Marbl" in the EUIPO / INPI / app stores)

## Publishing options
| Where | Cost | How |
| --- | --- | --- |
| Web (GitHub Pages) | free | already live |
| itch.io / CrazyGames / Poki | free | upload the static folder |
| Google Play | 25 $ once | wrap the PWA with Bubblewrap (Trusted Web Activity) |
| Apple App Store | 99 $/year + a Mac | wrap with Capacitor |

## Maintenance rules
- Never change `GENERATOR_VERSION` (daily puzzles) or `LEVEL_GENERATOR_VERSION` without a migration.
- After changing the level generator: `npm run build:levels`, then check `npm test` (levels 1–N must not drift
  for existing players unless intended).
- Bump `VERSION` in `sw.js` on every release.
