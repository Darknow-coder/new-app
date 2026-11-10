# Activer le classement en ligne (gratuit, ~5 minutes)

Le classement utilise **Firebase** (Google), offre gratuite « Spark » : pas de carte bancaire.
Tant que `js/online-config.js` est vide, le classement est simplement caché dans le jeu.

1. Va sur https://console.firebase.google.com et clique **Créer un projet** (nom : `marbl`).
   Tu peux désactiver Google Analytics.
2. Menu **Créer → Authentication** → **Commencer** → onglet **Mode de connexion** →
   **Anonyme** → **Activer** → Enregistrer.
3. Menu **Créer → Firestore Database** → **Créer une base de données** →
   mode **production** → région en Europe (ex. `europe-west1`).
4. Dans Firestore, onglet **Règles** : remplace tout par le contenu de `docs/firestore.rules`,
   puis **Publier**. (Ces règles empêchent de tricher grossièrement et d'écrire autre chose
   que des nombres.)
5. Roue dentée **Paramètres du projet → Général → Vos applications** → icône **Web `</>`** →
   nom `marbl` → **Enregistrer**. Note `apiKey` et `projectId`.
6. Mets ces deux valeurs dans `js/online-config.js` (ou envoie-les à Claude).
   Elles ne sont pas secrètes : c'est normal qu'elles soient visibles dans le code d'un site.

## Limites de l'offre gratuite
- 50 000 lectures et 20 000 écritures par jour. Le jeu met le classement en cache une minute
  et n'écrit qu'après une victoire qui change ton score : largement assez pour des milliers
  de joueurs par jour.
- Optionnel : dans Google Cloud Console → Identifiants, restreins la clé API au domaine de
  ton site (référents HTTP).

## Vie privée
Opt-in : rien n'est envoyé tant que le joueur n'a pas cliqué « Rejoindre le classement ».
Les noms sont tirés au hasard dans une liste fixe (aucun texte libre, donc rien d'insultant).
« Quitter le classement » supprime la ligne du joueur.
