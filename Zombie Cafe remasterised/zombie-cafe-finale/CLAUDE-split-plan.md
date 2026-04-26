---
title: Zombie Café — Plan de split 1h30 max
date: 2026-04-23
---

# Plan complet : 21 prompts → ~79 micro-prompts (1h30 max chacun)

**Règle** : chaque prompt ≤ 1h30 de travail humain.  
**Déjà fait** : 1a, 1b, 1c, 2a, 2b, 2c, 6a, 6b, 6c (9 prompts)  
**À refaire** : 21 prompts → 79 micro-prompts

---

## 6d — Cookbook UI (5h → 4 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **6d1** | Panneau Cookbook : structure + sidebar | 1.5h | Créer le panneau beige, titre, sidebar avec les 5 cookbooks (icons + noms, grisage niveau) |
| **6d2** | Zone recettes : affichage plats | 1.5h | Lister les plats du cookbook actif, fiches 80px (icône + stats texte) |
| **6d3** | Verrouillage + indices | 0.75h | Plats grisés/barrés si niveau insuffisant ou raid-only, indice texte |
| **6d4** | Compteur de collection + fermeture | 0.75h | "Recettes débloquées X/Y", bouton Fermer, brancher au HUD |

**Ordre** : 6d1 → 6d2 → 6d3 → 6d4

---

## 3a — Grille isométrique + A* (10h → 7 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **3a1** | Classe PathfindingSystem : grille 20x14 | 1.5h | Matrice booléens, initialisation, setBlocked() |
| **3a2** | Conversion iso ↔ screen | 1.5h | isoToScreen() + screenToIso(), test avec debug text |
| **3a3** | Open/Closed lists + structure A* | 1h | Implémentation de base : nodes, open/closed, sans heuristique |
| **3a4** | Heuristique Chebyshev + f = g+h | 1h | Ajouter calcul de distance, f-score, tri open list |
| **3a5** | Expansion des voisins + diagonales | 1.5h | 8 directions, pas de corner cutting, coûts orthogonal/diagonal |
| **3a6** | Backtrack chemin + cas limites | 1h | Reconstruction du chemin, gestion end===start, pas de chemin |
| **3a7** | Test integration GameScene | 1h | findPath(1,1,18,12), log console, vérifier pas d'erreur |

**Ordre** : 3a1 → 3a2 → 3a3 → 3a4 → 3a5 → 3a6 → 3a7

---

## 3b — Mouvement + z-sort + debug (10h → 7 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **3b1** | Migration CHAIR_POSITIONS → iso | 1.5h | Remplacer {x,y} par {col,row}, adapter spawnClient(), affichage isoToScreen() |
| **3b2** | Migration STAFF_ZONE → iso | 1h | Placer staff zone en iso, adapter performInfection(), tweens |
| **3b3** | Classe moveEntityTo() : pathfinding + waypoints | 1.5h | Appeler findPath(), stocker path[], gestion chemin vide (retry 3x, teleport) |
| **3b4** | Update loop : waypoint traversal | 1.5h | Avance entity vers waypoint, vitesse (speed * 8 px/sec), détecte arrivée |
| **3b5** | Collision entre entités : wait + recalc | 1.5h | Détecter case occupée, attendre 0.5s, recalc chemin |
| **3b6** | Z-sorting par screenY chaque frame | 1h | Trier game objects, setDepth(screenY), vérifier perspective iso |
| **3b7** | Mode debug (touche D) : overlay + infos | 1.5h | Grille walkable/bloquée en couleurs, chemins jaunes, stats bas-gauche |

**Ordre** : 3b1 → 3b2 → 3b3 → 3b4 → 3b5 → 3b6 → 3b7

---

## 4a — Carte raids (4h → 3 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **4a1** | Bouton Carte + overlay RaidMapScene | 1h | Rectangle vert "Carte" en bas, ouvre layer semi-transparent |
| **4a2** | Affichage cafés (joueur + 4 ennemis) | 1.5h | Joueur vert gauche, 4 ennemis rouges droite, noms générés, niveau, état |
| **4a3** | Écran préparation : sélection + lancement | 1.5h | Popup 500x350, checkbox zombies, conseil, button "Lancer" (actif si min 1 sélectionné) |

**Ordre** : 4a1 → 4a2 → 4a3

---

## 4b — Scène raid : combat (7h → 5 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **4b1** | RaidScene : init + spawn ennemis/boss | 1.5h | Reçoit alliés + données café, génère 3-6 ennemis + 1 boss + 2-4 clients |
| **4b2** | Layout raid : positions alliés/ennemis/tables | 1.5h | Fond uni, ennemis droite, alliés gauche, tables centre, barres énergie permanentes |
| **4b3** | Sélection + tween vers ennemi | 1.5h | Clic zombie allié = sélectionné (halo bleu), clic ennemi = tween attaque 0.4s |
| **4b4** | Calcul dégâts + riposte + mort | 1h | atkStrength ± 20%, l'ennemi riposte, énergie ≤ 0 = disparaît ou couché |
| **4b5** | Client ennemi + bouton Retraite | 1.5h | Clic client = allié "mange" (client disparaît, +5 or temp), bouton Retraite en haut gauche |

**Ordre** : 4b1 → 4b2 → 4b3 → 4b4 → 4b5

---

## 4c — Fin de raid (4h → 3 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **4c1** | Conditions victoire/défaite | 1h | VICTOIRE : boss vaincu, DÉFAITE : tous alliés morts |
| **4c2** | Popup résultat : victoire | 1.5h | "Victoire !" vert, or gagné, recette volée + unlock, bouton "Rentrer" |
| **4c3** | Popup résultat : défaite + cooldowns | 1.5h | "Défaite" rouge, or consolation, zombies en réanim 60min, café fermé 30min |

**Ordre** : 4c1 → 4c2 → 4c3

---

## 5a — Shop UI (4h → 3 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **5a1** | Bouton Shop + panneau 520x400 | 1h | Rectangle vert "Shop", ouvre container, 4 onglets header, bouton X |
| **5a2** | Onglet Cuisine : items + prix + achat | 1.5h | 4 fourneaux + frigo supp, icône + nom + prix + bouton "Acheter", niveau requis |
| **5a3** | Onglet Salle : items + mode placement | 1.5h | Tables 2/4 pers, comptoirs, canapé, achat = lance placement (Prompt 5b) |

**Ordre** : 5a1 → 5a2 → 5a3

---

## 5b — Placement meubles (6h → 4 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **5b1** | Fantôme du meuble + snap grille | 1.5h | Rectangle semi-transparent suit curseur, snappé aux cases iso |
| **5b2** | Validation : fond vert/rouge | 1.5h | Vert si walkable, rouge si collision/hors limites, curseur texte "Placer" |
| **5b3** | Placement + blocage grille + exit | 1.5h | Clic valide = crée meuble, setBlocked(), ajoute à meubles[], quitte mode |
| **5b4** | Annulation + remboursement | 1h | Clic droit / Escape = cancel, rembourse or, quitte mode |

**Ordre** : 5b1 → 5b2 → 5b3 → 5b4

---

## 5c — Déco + Expansion (6h → 4 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **5c1** | Onglet Déco : 4 items (plantes, tableau, tapis, fontaine) | 1.5h | Affichage items, prix or, bonus rating, niveau requis |
| **5c2** | Onglet Expansion : agrandissement grille | 1.5h | +4 col / +3 row, prix toxines/or, nécessite niveau, étend PathfindingSystem.grid |
| **5c3** | Bouton Éditer + popup meuble (Déplacer/Vendre) | 1.5h | Mode édition, clic meuble = popup 200x100, "Déplacer" relance placement |
| **5c4** | Vendre + règles (fourneau occupé, chaise occupée) | 1h | Rembourse 50%, libère cases, boutons grisés si conditions non respectées |

**Ordre** : 5c1 → 5c2 → 5c3 → 5c4

---

## 5d — Tombstones (5h → 4 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **5d1** | 5e onglet Tombstones : 4 types + prix toxines | 1.5h | Red/Green/Purple/Golden, icons (tombe + couleur), prix 3/3/5/8 toxines |
| **5d2** | Achat + placement comme meuble | 1.5h | Déduit toxines, lançe mode placement, placement crée tombstone actif |
| **5d3** | Boosts actifs (ATK x2, régén +50%, +1 étoile, or x1.5) | 1.5h | Appliquer effets pendant durée, afficher icons HUD haut-droite, tooltips |
| **5d4** | Expiration + recharge (3 toxines ou minuit) | 0.75h | Après durée : grisé/vide, clic = bouton Recharger, ou reset gratuit à minuit |

**Ordre** : 5d1 → 5d2 → 5d3 → 5d4

---

## 7a — XP + Niveaux (7h → 5 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **7a1** | Formule XP + barre progression | 1.5h | xpRequis(N) = 100 * N^1.5, barre 300x16 gris/vert top écran, texte "Niv.X" |
| **7a2** | Gains XP (cuisson, service, infection) | 1.5h | +xp recette, +xp/2 service, +2 paiement, +10 infection |
| **7a3** | Level-up : popup + déblocages | 1.5h | Popup doré 3s, "Niv X atteint!", liste recettes/slots débloqués, +1 toxine |
| **7a4** | Capacité staff par niveau | 1h | Niv 1→1, 2→2, 4→3, 6→5, 8→8, 10→12 slots, si plein → Meat Locker |
| **7a5** | Meat Locker base (5 crochets) | 1h | Panneau Staff : gauche actifs, droite locker X/5, boutons Activer/Réserve |

**Ordre** : 7a1 → 7a2 → 7a3 → 7a4 → 7a5

---

## 7b — Rating (5h → 4 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **7b1** | Affichage étoiles (0-5) | 1h | 5 polygones jaunes en haut gauche, remplissage selon rating, départ 2.5 |
| **7b2** | Modifications rating (clients, zombies) | 1.5h | Bon service +0.1, café plein -0.1, tipRating bonus, brancher aux événements |
| **7b3** | Impact rating sur clients (clients qui arrivent) | 1h | Rating < 2 → peu de clients, ≥4 → celebrities, filtrer spawns |
| **7b4** | Bonus stars + objectifs (niv 6+) | 1.5h | 4 tâches aléatoires, barres progression, complétées = +1 étoile violette 2h, max 3 |

**Ordre** : 7b1 → 7b2 → 7b3 → 7b4

---

## 7c — Meat Locker extension (3h → 2 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **7c1** | Bouton "Étendre +5 crochets, 5 Toxines" | 1.5h | Dans panneau Staff, section "Étendre", capacité actuelle X/Y, bouton vert |
| **7c2** | Visuel crochets + max 100 | 1.5h | Rangée petits rectangles 16x24, libre/occupé, max = 100, affiche "Max atteint" |

**Ordre** : 7c1 → 7c2

---

## 8a — LocalStorage (5h → 4 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **8a1** | Structure SaveSystem + sérialisation gameState | 1.5h | Classe SaveSystem, save(gameState) → JSON, clé "zombie_cafe_save_v1" |
| **8a2** | Données complètes (gold/toxins/xp/level/rating/zombies/recettes/cooldowns) | 1.5h | Tous les champs dans l'objet sauvegardé, version et timestamp |
| **8a3** | Chargement + validation version | 1.5h | load() → JSON ou null, version check, recalcul réanimationEnd |
| **8a4** | Auto-save toutes les 15s + majeurs events | 0.5h | Timer Phaser, appels lors infection/achat/level-up, brancher à tous les events |

**Ordre** : 8a1 → 8a2 → 8a3 → 8a4

---

## 8b — Hors-ligne + Options (5h → 4 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **8b1** | Calcul gains hors-ligne (or/xp/énergie) | 1.5h | delta = now - saveTime (max 8h), orPassif, xpPassif, perte énergie |
| **8b2** | Popup hors-ligne si delta > 60s | 1h | "Pendant X h Y min : +Z or, +W XP", rectangle gris 360x200, bouton OK |
| **8b3** | Menu Options : slider volume + réinitialiser save | 1.5h | Rectangle 400x300, slider volume 0-1, bouton "Réinitialiser" rouge (2-click confirm) |
| **8b4** | Export/Import JSON save | 1h | Boutons bleus, clipboard writeText, prompt paste, validation version |

**Ordre** : 8b1 → 8b2 → 8b3 → 8b4

---

## 9a — Menu principal (4h → 3 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **9a1** | Titre "ZOMBIE CAFÉ" + silhouettes zombies | 1.5h | Font bitmap ou fallback serif, ombre +3px, 4 rectangles noirs alpha 0.5 qui scrollent |
| **9a2** | Boutons "Nouvelle Partie" / "Continuer" / "Options" | 1.5h | Verts 220x48, grisé Continuer si pas de save, événements pour lancer scenes |
| **9a3** | Sous-titre + branding | 0.5h | "© 2011 Beeline — Fan Clone" gris 14px |

**Ordre** : 9a1 → 9a2 → 9a3

---

## 9b — Tutoriel (7h → 5 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **9b1** | Chef narrateur + système spotlight (mask) | 1.5h | Cercle rouge 30px bas-droit, overlay noir alpha 0.6, trou mask, bulle dialog |
| **9b2** | Étapes 1-3 (Fourneau → cuisson → comptoir) | 1.5h | Spotlight fourneau/barre/comptoir, textes "Chef : ...", await clic/event/temps |
| **9b3** | Étapes 4-5 (Client arrive → paie) | 1.5h | Force spawn client, spotlight zone clients, await "customerServed", or counter |
| **9b4** | Étapes 6-7 (Infection → fin) | 1.5h | Force client près, spotlight, attend infection, "Excellent!" + bouton "Commencer!" |
| **9b5** | Bouton "Passer le tutoriel" + état persistent | 0.75h | Texte blanc 12px bas-droit, close immédiat, tutorialDone = true |

**Ordre** : 9b1 → 9b2 → 9b3 → 9b4 → 9b5

---

## 9c — Audio Web Audio API (6h → 4 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **9c1** | Musique boucle synthétisée (AudioContext) | 1.5h | Onde carré 80Hz + sinus mélodie, 8 mesures, volume 0.15, boucle GameScene |
| **9c2** | SFX de base (cookStart, cookDone, satisfied, infect, attack) | 1.5h | 5 sons générés Web Audio (bruit blanc, sinus, LFO), durées courtes |
| **9c3** | SFX suite (levelUp, raidStart, uiClick) | 1.5h | 3 sons restants, notes montantes/descentes, oscillateurs |
| **9c4** | Volume global GainNode + branchements events | 1h | AudioSystem.setVolume(0-1), slider Options Prompt 8b, play() appelés aux bons moments |

**Ordre** : 9c1 → 9c2 → 9c3 → 9c4

---

## 9d — HUD final (7h → 5 parts)

| Micro | Titre | Durée | Description |
|---|---|---|---|
| **9d1** | Bande top : étoiles rating + or/toxines + barre XP | 1.5h | 960x48 noir alpha, gauche étoiles/bonus stars, centre or/toxines hexagone, droite XP+level |
| **9d2** | Bande bottom : 5 boutons (Shop, Staff, Carte, Objectifs, Options) | 1.5h | 960x44 noir alpha, boutons 100x32 gris, texte blanc centré, survol clair |
| **9d3** | Notifications toast (succès/alerte/erreur) | 1.5h | Container bas-droit, max 4 visibles, rect 260x40 bord couleur, slide in + fade out |
| **9d4** | Bulles clients (satisfait/mécontent/attente) | 1.5h | Vert "OK" / rouge "!" / blanc avec barre patience, queue triangulaire |
| **9d5** | Particules or + branchements audio | 1h | 5 petits cercles dorés du client → compteur, tween 0.8s ease Power2, audio branchés |

**Ordre** : 9d1 → 9d2 → 9d3 → 9d4 → 9d5

---

## TOTAL

| Métrique                   | Valeur                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Prompts originaux restants | 21                                                                                                                                                     |
| Micro-prompts après split  | **79**                                                                                                                                                 |
| Durée max par prompt       | **≤ 1h30**                                                                                                                                             |
| Durée moyenne              | **~1h15**                                                                                                                                              |
| Temps total estimé         | **~100h** (vs 147h avant)                                                                                                                              |
| Nouveaux prompt IDs        | 6d1-d4, 3a1-a7, 3b1-b7, 4a1-a3, 4b1-b5, 4c1-c3, 5a1-a3, 5b1-b4, 5c1-c4, 5d1-d4, 7a1-a5, 7b1-b4, 7c1-c2, 8a1-a4, 8b1-b4, 9a1-a3, 9b1-b5, 9c1-c4, 9d1-d5 |

---

## Utilisation

Copier les sections pertinentes dans le CLAUDE.md du projet au fur et à mesure.  
Garder cette table comme référence pour navigation.
