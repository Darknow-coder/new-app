# Publier Marbl gratuitement

Tout est prêt dans le dépôt :

| Quoi | Où | Comment le refaire |
|---|---|---|
| Jeu web en zip (pour itch.io, portails) | `store/marbl-web.zip` | `npm run package` |
| Captures téléphone 1080×1920 (FR et EN) | `store/fr/`, `store/en/` | `npm run shots` |
| Captures ordinateur 1280×720 | `store/desktop-*.png` | `npm run shots` |
| Image de couverture itch.io 630×500 | `store/cover-630x500.png` | `npm run shots` |

Le site officiel reste **https://darknow-coder.github.io/new-app/** : les liens de partage
(défis, niveaux créés, résultats du jour) pointent toujours là, même quand on joue sur itch.io.

## 1. itch.io (gratuit)
1. Crée un compte sur https://itch.io → **Upload new project**.
2. **Kind of project** : `HTML`. **Classification** : `Games`.
3. **Uploads** : envoie `store/marbl-web.zip` (sur GitHub : ouvre le fichier → bouton télécharger) et coche **This file will be played in the browser**.
4. **Embed options** :
   - Viewport : **420 × 800** (format téléphone)
   - coche **Mobile friendly** (orientation : portrait)
   - coche **Fullscreen button**
5. **Cover image** : `store/cover-630x500.png`. **Screenshots** : 3 à 5 images de `store/en/` ou `store/fr/`.
6. **Genre** : Puzzle. **Tags** : voir plus bas. **Pricing** : `No payments` (ou « Donations » si tu veux un bouton de don).
7. **Visibility** : commence en `Restricted` pour tester, puis `Public`.

## 2. CrazyGames / Poki (portails de jeux web)
- https://developer.crazygames.com : inscription gratuite, tu soumets le zip.
- https://developers.poki.com : plus sélectif.
- ⚠️ Ces portails ont leurs propres règles (souvent : intégrer leur SDK pour les pubs et les
  événements de jeu, pas de liens vers l'extérieur, jouable à la souris en paysage).
  Lis leurs exigences au moment de soumettre : je peux faire l'intégration du SDK si tu es accepté.

## 3. Google Play (plus tard, 25 $ une fois)
Paquet Android à générer avec PWABuilder (https://www.pwabuilder.com) à partir du site officiel.
Nouveau compte perso : test fermé obligatoire (≈ 12 testeurs pendant 14 jours) avant la sortie.

---

## Textes — Français

**Titre** : Marbl — puzzle d'inclinaison

**Phrase courte (80 caractères max)** :
Incline le plateau, fais rouler les billes et fais-les tomber dans leurs trous !

**Description** :
Incline le plateau, toutes les billes roulent en même temps… jusqu'à heurter un mur. À toi de
trouver l'ordre parfait pour faire tomber chaque bille dans le trou de sa couleur, en un
minimum de coups.

✦ 320 niveaux répartis dans 16 mondes illustrés, avec un boss à chaque fin de monde
✦ 3 nouveaux puzzles chaque jour (facile, moyen, difficile) + le calendrier des jours passés
✦ Des mécaniques qui se renouvellent : gouffres, sable, portes de cristal, portails, flèches
✦ Coffres, collection de 57 billes, saison gratuite, succès et quêtes du jour
✦ Éditeur de niveaux : crée tes propres puzzles et partage-les avec un simple lien
✦ Classement mondial et défis entre amis
✦ Jouable hors ligne, mode daltonien, aucune pub, aucun achat

Un coup de poignet, une idée, et *plop* : la bille tombe. Encore un niveau ?

## Texts — English

**Title**: Marbl — the tilt puzzle

**Short description (80 chars max)**:
Tilt the board, roll the marbles and drop each one into its matching hole!

**Description**:
Tilt the board and every marble rolls at once… until it hits a wall. Find the perfect order
to drop each marble into the hole of its colour, in as few moves as possible.

✦ 320 levels across 16 illustrated worlds, with a boss at the end of each one
✦ 3 fresh puzzles every day (easy, medium, hard) + a calendar of past days
✦ Mechanics that keep changing: pits, sand, crystal gates, portals, arrows
✦ Chests, a collection of 57 marbles, a free season pass, achievements and daily quests
✦ Level editor: build your own puzzles and share them with a simple link
✦ Global leaderboard and friend challenges
✦ Plays offline, colour-blind mode, no ads, no purchases

A flick of the wrist, an idea, and *plop*: the marble drops. One more level?

**Tags** : puzzle, casual, relaxing, logic, minimalist, mobile, singleplayer, colorful, daily, level-editor

**Catégorie / Category** : Puzzle
