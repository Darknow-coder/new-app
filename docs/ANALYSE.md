# Marbl : peut-il devenir un grand jeu ? (analyse du 13 novembre 2026)

## En une phrase
Le jeu a tout ce qu'il faut **dans le jeu** (concept clair, contenu, boucles de retour, partage) ;
ce qui manque est **autour du jeu** : être trouvé, garder la progression des joueurs d'un téléphone à
l'autre, les rappeler chaque jour, et mesurer ce qu'ils font.

## Ce qui peut le faire grandir
- **Un concept qui se comprend en une seconde**, en vidéo comme en jeu : on incline, tout roule, plop.
  La règle « tout bouge en même temps » donne de la profondeur sans écran d'explication.
- **Du contenu sans fin** : 320 niveaux en 16 mondes, et 3 puzzles du jour identiques pour tout le
  monde (le moteur des jeux comme Wordle).
- **Toutes les boucles de retour des jeux qui marchent** : série quotidienne + gel de série, saison
  gratuite de 4 semaines, quêtes du jour, coffres, collection de 97 billes, série parfaite 🔥,
  classement mondial.
- **Le partage est intégré** : résultat du jour en émojis, défis par lien, niveaux créés partageables,
  et la fabrique à vidéos pour TikTok / Reels / Shorts.
- **Coût zéro, partout** : navigateur, installable, hors ligne, 3 langues, rapide même sur petit
  téléphone (mode léger automatique), testé automatiquement.

## Les faiblesses et les risques (par ordre d'importance)
1. **Être trouvé.** Aujourd'hui, seulement par un lien. Pas de présence sur Google Play ni sur les
   portails de jeux. Toute la croissance repose sur TikTok.
2. **La progression vit dans le téléphone.** Si le joueur vide son navigateur, change de téléphone ou
   joue dans le navigateur de TikTok, il peut tout perdre. Le code de sauvegarde existe mais est
   manuel. C'est aussi un prérequis pour vendre quoi que ce soit : un achat doit survivre à tout.
3. **Pas de rappel quotidien.** Les jeux installés envoient « ton puzzle du jour t'attend ». Sans
   notification, beaucoup de joueurs oublient de revenir après 2 ou 3 jours.
4. **On ne mesure presque rien.** On voit le classement et les avis, mais pas où les joueurs
   abandonnent (quel niveau, quel écran). Sans ça, on améliore à l'aveugle.
5. **Des niveaux générés.** Ils sont justes et vérifiés, mais rarement mémorables. Les grands jeux de
   puzzle ont des niveaux « eurêka » faits à la main aux moments clés.
6. **La monétisation demande du trafic et des démarches.** Les régies de pubs pour jeux web
   (AdSense pour les jeux, CrazyGames, Poki) acceptent les jeux qui ont déjà des joueurs. Vendre
   des achats demande un moyen de paiement, des conditions de vente et un statut pour déclarer les
   revenus.

## Les priorités que je recommande
1. **Mesurer** : un compteur anonyme par niveau (combien le commencent, combien le finissent),
   dans Firebase, sans donnée personnelle. On verra tout de suite les niveaux qui font fuir.
2. **Sauvegarde dans le cloud** avec le compte anonyme Firebase déjà en place, plus un code de
   récupération : la progression suit le joueur, et les futurs achats sont protégés.
3. **Google Play** (25 $ une fois) via l'appli « coque » du site : présence dans le store, avis,
   et plus tard la facturation Google Play pour les achats.
4. **Le rappel quotidien** (notifications web) pour les joueurs qui ont installé le jeu.
5. **Des niveaux faits main** pour chaque introduction de mécanique et chaque boss, et un petit
   événement chaque semaine.
6. **La monétisation, dans cet ordre** : d'abord les pubs récompensées volontaires quand le
   trafic le permet (la couche technique est prête : `js/monetization.js`), ensuite les achats,
   une fois la sauvegarde cloud en place.

## Les règles à garder pour rester un jeu « juste »
- Une pub n'est jamais imposée : toujours un bouton 🎬 choisi par le joueur, jamais pendant un puzzle.
- Les puzzles du jour restent identiques et sans bonus payant pour tout le monde.
- Rien d'indispensable à acheter : les achats font gagner du temps ou des objets décoratifs.
