# Lancer Marbl : la checklist (14 novembre 2026)

## Les liens
| Quoi | Lien |
|---|---|
| **Le jeu** (à mettre en bio TikTok : il ouvre directement le jeu) | https://darknow-coder.github.io/new-app/ |
| La page de présentation | https://darknow-coder.github.io/new-app/site/ |
| Confidentialité (demandée par les stores) | https://darknow-coder.github.io/new-app/site/privacy.html |
| Tes statistiques | https://darknow-coder.github.io/new-app/site/stats.html |

## Ce qui est prêt
- **Le contenu** : 2 000 niveaux vérifiés dans 16 mondes (et la suite se génère toute seule),
  3 puzzles par jour, un événement chaque semaine, la roue de la chance, la saison, les coffres,
  97 billes à collectionner, les succès, l'éditeur de niveaux, le classement, les défis entre amis.
- **Le premier contact** : tutoriel → niveau 1 en moins d'une minute. Le jeu est jouable en
  ~2,5 s sur une 4G lente avec un téléphone moyen, puis instantané (hors ligne compris).
- **Les visiteurs venus de TikTok / Instagram** : le jeu marche dans leur navigateur intégré.
  Après le tutoriel, un bandeau leur propose de l'ouvrir dans leur vrai navigateur pour garder
  leur progression (et la sauvegarde en ligne les protège de toute façon).
- **La sauvegarde en ligne** sans compte (code de 12 caractères), automatique.
- **La fiche** : captures FR/EN (`store/`), couverture, zip pour itch.io, textes : `docs/PUBLIER.md`.
- **La surveillance** : niveaux joués / réussis, plantages (fichier + ligne), avis des joueurs.
- **Les tests** : 47 tests automatiques + 16 parcours complets rejoués à chaque modification.

## À faire par toi avant d'annoncer le jeu (≈ 1 h)
1. **Joue 10 minutes sur ton téléphone** en ouvrant le lien depuis ta bio TikTok (navigateur de
   TikTok), puis dans Chrome ou Safari. Au moindre souci : une capture d'écran et je corrige.
2. **Vérifie la sauvegarde en ligne en vrai** (mes tests n'ont pas le droit d'écrire dans ton
   vrai Firebase) : gagne 2 niveaux, attends une minute, ouvre Réglages → Sauvegarde en ligne.
   Il doit afficher « Sauvegardée il y a … » avec ton code. Dans la console Firebase → Firestore,
   une collection `saves` doit être apparue. Bonus : sur un 2e appareil, « Récupérer une partie »
   avec ce code.
3. **Fais tester 3 à 5 personnes** qui ne connaissent pas le jeu, sans les aider. Note où elles
   hésitent, ce qu'elles ne comprennent pas, quand elles posent le téléphone. Raconte-moi.
4. *(optionnel)* **Le nom** : vérifie que « Marbl » n'est pas une marque déposée (INPI, EUIPO)
   ni un jeu existant sur les stores.
5. *(optionnel)* **Un nom de domaine** (≈ 10 €/an, ex. `marbl.fun`) : plus facile à retenir et
   à taper depuis une vidéo que `darknow-coder.github.io/new-app`. Je fais le branchement.

## Si ça décolle : le quota gratuit de Firebase
- L'offre gratuite donne 50 000 lectures et 20 000 écritures par jour. Une partie coûte environ
  8 écritures et l'ouverture du classement ~60 lectures : **assez pour ~2 000 parties par jour**.
- Au-delà, **le jeu continue de marcher** : seuls le classement et la sauvegarde en ligne se
  mettent en pause jusqu'au lendemain vers 9 h (heure de Paris), puis tout repart (rien n'est perdu,
  les envois sont retentés). Aucun frais possible tant que tu restes sur l'offre gratuite.
- Pour ne plus avoir de pause : console Firebase → **passer à la formule Blaze** (carte bancaire,
  paiement à l'usage, le quota gratuit reste offert). Ordre de grandeur : quelques euros par mois
  pour des milliers de joueurs par jour. Mets tout de suite une **alerte de budget** (ex. 5 €).
- Où regarder : console Firebase → Firestore → onglet **Utilisation**.

## Le plan TikTok (simple et régulier)
- **Prépare 10 vidéos d'avance** : demande-moi un lot, la fabrique à vidéos (`docs/VIDEOS.md`)
  sort des clips verticaux prêts à poster (résolution, échec rageant, défi, boss).
- **Les formats qui marchent pour un puzzle** :
  - « Tu le fais en combien de coups ? » : le puzzle du jour, sans la solution.
  - La résolution satisfaisante : les billes qui tombent pile, *plop*.
  - L'échec rageant : tout se passe bien… et la dernière bille file dans le gouffre.
  - Le boss de fin de monde.
- **1 à 2 vidéos par jour**, à heure fixe. L'accroche dans la première seconde, « lien en bio »
  à la fin. Épingle un commentaire avec le défi du jour, réponds aux commentaires en vidéo.
- **Chaque lundi** : nouvel événement de la semaine, c'est un sujet de vidéo tout trouvé.

## Suivre les chiffres (page Statistiques)
- **Ouvertures, tutoriels terminés, niveaux commencés / réussis** : si beaucoup ouvrent mais peu
  finissent le tutoriel, le début est à revoir.
- **⚠️ Points de friction** : niveaux souvent commencés mais rarement réussis. Envoie-les-moi,
  je les ajuste.
- **Plantages** : normalement vide. Si une ligne apparaît, envoie-la-moi.
- **Avis des joueurs** : console Firebase → Firestore → collection `feedback`.

## Ensuite, quand il y a des joueurs
- **itch.io, CrazyGames** (gratuit) : tout est prêt, voir `docs/PUBLIER.md`.
- **Google Play** (25 $ une fois) : il faudra un nom d'éditeur et un e-mail de contact, et un test
  fermé (12 testeurs pendant 14 jours) pour un nouveau compte personnel.
- **Gagner de l'argent** : pubs volontaires et achats sont prêts à brancher
  (`docs/MONETISATION.md`), à activer à partir de quelques centaines de joueurs par jour.
- **Le rappel quotidien** (notification « ton puzzle du jour t'attend ») : demande un petit
  serveur d'envoi.
