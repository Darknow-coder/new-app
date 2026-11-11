# Fabrique à vidéos (TikTok / Reels / Shorts)

Toutes les vidéos sortent en vertical 1080×1920, 30 i/s, dans `clips/` (non versionné).

| Commande | Ce que ça fait |
|---|---|
| `npm run clip -- solve --level 216` | résolution propre avec les bruitages du jeu + « lien en bio » à la fin |
| `npm run clip -- fail` | une partie qui part bien… puis la bille file dans un gouffre → « Perdu ! » |
| `npm run clip -- challenge --daily hard` | le puzzle du jour, sans la solution : « Tu le fais en combien ? » |
| `npm run clip -- edit --edit mon-edit.mp4` | jeu avec la musique de l'edit étouffée → **BAM** sur « Parfait ! » → l'edit, calé sur son son |
| `npm run clip -- batch --edits dossier/ --count 3` | chaque edit du dossier × 3 niveaux spectaculaires différents |

Options : `--level N`, `--daily easy|medium|hard`, `--text "accroche"`, `--caption "texte sur l'edit"` (ou `none`), `--lang fr|en|es`.

Les edits sur fond vert (« FOLLOW FOR MORE », « 4K »…) sont recadrés tout seuls, et l'écran noir / la carte
TikTok de la fin sont coupés. Sans `--level`, la fabrique choisit des niveaux à 3 billes avec un double
à la fin, dans des mondes différents.
