# Marbl — release notes for maintainers

- Launch checklist (French): [docs/LANCEMENT.md](docs/LANCEMENT.md)
- Publishing guide and store texts: [docs/PUBLIER.md](docs/PUBLIER.md)

## Before every release
- `npm test` and `npm run e2e` pass (the e2e run uses a fake Firebase: never point tests or
  scripts at the real project).
- Bump `VERSION` in `sw.js`.
- After visible UI changes: `npm run shots` (store and website screenshots) and
  `npm run package` (the zipped web build for itch.io and portals).

## Maintenance rules
- Never change `GENERATOR_VERSION` (daily puzzles) or `LEVEL_GENERATOR_VERSION` without a migration.
- After changing the level generator: `npm run build:levels`, then check `npm test` (levels 1–N must not drift
  for existing players unless intended).
- Firestore rules live in `docs/firestore.rules`; publish them in the Firebase console after any change.
