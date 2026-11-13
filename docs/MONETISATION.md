# Pubs volontaires et achats intégrés : ce qui est prêt, et comment l'activer

Tout passe par **`js/monetization.js`**. Aujourd'hui les deux fournisseurs sont sur `'none'` :
les joueurs ne voient **aucun** bouton de pub ni d'achat.

## Essayer sans rien activer
Ajoute **`?mz=demo`** à l'adresse du jeu (ex. `…/new-app/?mz=demo`). Sur cet appareil seulement :
- écran de victoire : bouton **« Double-les : +23 🎬 »** (fausse pub de 5 s, puis les pièces) ;
- boutique, onglet Bonus : **Indice gratuit 🎬** et **+25 pièces 🎬** (limites par jour) ;
- boutique, onglet **Packs** : les achats de démonstration (aucun paiement).

`?mz=off` remet le jeu normal.

## Les emplacements de pub prévus (toujours au choix du joueur)
| Emplacement | Récompense | Limite / jour |
|---|---|---|
| Écran de victoire | ×2 pièces du niveau | 5 |
| Boutique | 1 indice | 3 |
| Boutique | 25 pièces | 5 |

Jamais de pub imposée, jamais pendant un puzzle, rien sur les puzzles du jour.

## Les achats prévus (catalogue modifiable dans `PRODUCTS`)
Pack de départ (une fois), 3 sacs de pièces, pack soutien (bille Phénix exclusive).
Les prix affichés sont indicatifs : c'est le store qui fixe les vrais.

## Brancher une vraie régie de pubs
1. **AdSense pour les jeux H5 (Google)** : il faut un compte AdSense approuvé pour le site.
   Mets l'identifiant `ca-pub-…` dans `H5_CLIENT` et `CONFIG.ads = 'h5games'`.
   Le code d'appel est déjà écrit (non testé en conditions réelles).
2. **CrazyGames / Poki** : si le jeu est accepté sur leur portail, leur kit remplace l'adaptateur.

Pendant une vraie pub, les fenêtres du jeu se mettent de côté puis reviennent automatiquement.

## Brancher de vrais achats
- **Version Google Play** (appli « coque » du site) : facturation Google Play via l'API Digital Goods.
- **Version web** : un prestataire de paiement (ex. Stripe, Lemon Squeezy) et un petit serveur
  pour confirmer les paiements.

À prévoir avant de vendre : la **sauvegarde dans le cloud** (un achat ne doit jamais se perdre),
des **conditions de vente**, des **mentions légales**, et un **statut** pour déclarer les revenus.
