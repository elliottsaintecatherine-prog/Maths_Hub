# Carnet de bord — Es-tu digne de Louis ?

Quiz interactif façon cartes postales de voyage, pensé pour le téléphone.
**Tout tient dans un seul fichier : `index.html`.** Pas d'installation, pas de
dossier à traîner, pas besoin d'internet une fois le fichier enregistré.

## Comment on s'en sert

1. Ouvre `index.html` (double-clic, ou depuis l'appli Fichiers sur téléphone).
2. Bouton **📷 Mes photos** → choisis tes photos sur l'appareil.
3. Bouton **⬇︎ Enregistrer le quiz avec mes photos** → tu récupères un fichier
   `quiz-louis.html` **qui contient les photos à l'intérieur**.
4. Ce fichier-là s'envoie par WhatsApp, AirDrop ou mail : il s'ouvre tout seul
   sur n'importe quel téléphone ou ordinateur, sans internet et sans rien
   installer.

Les photos sont réduites automatiquement avant d'être intégrées (largeur max
1280 px), pour que le fichier reste léger. Elles ne quittent jamais l'appareil :
aucun envoi vers un serveur.

## Ce que fait le quiz

- **100 questions** dans la banque, **10 tirées au hasard** à chaque lancement,
  plus la dernière — la vraie. Les réponses sont mélangées elles aussi.
- Chaque question est une **carte postale par avion recto-verso** : une photo au
  recto derrière la question, une **autre photo au verso**. La carte s'incline
  quand on bouge le doigt dessus (relief + ombre portée) et **un appui la
  retourne** : l'angle est piloté image par image, la carte se soulève vers
  l'écran, un reflet glisse sur le papier glacé, la photo s'assombrit en se
  mettant sur la tranche et se décale dans son cadre comme une image sous
  vernis. **Un appui maintenu** (une demi-seconde) affiche la photo visible
  **en entier**, sans rognage, sur fond sombre ; elle se referme au
  relâchement. Ça marche aussi sur la carte d'accueil et celle du souvenir. Chaque face indique la photo affichée
  (`photo R3`, `photo V1`).
- Les photos vivent dans **deux listes**, *recto* et *verso*, gérées séparément
  dans « Mes photos » : chaque liste a son compteur, son bouton d'ajout et ses
  vignettes numérotées (R1, R2… / V1, V2…). **Chaque liste ne sert que sa face** :
  ce que tu mets au recto reste au recto, ce que tu mets au verso reste au verso,
  et une face dont la liste est vide reste en papier uni. Chaque carte pioche une
  photo au hasard dans chaque liste, et si une même photo se trouve dans les deux,
  elle n'apparaît jamais des deux côtés d'une même carte. Les ajouts et les
  suppressions sont pris en compte **immédiatement**, même en pleine partie. Les
  carnets enregistrés à l'ancien format (une seule liste) sont répartis
  automatiquement sur les deux faces au chargement.
- Les photos sont traitées **une par une et gardées au fur et à mesure** : si
  l'appareil abandonne au milieu d'un gros lot, celles d'avant sont déjà
  acquises. Le panneau affiche l'avancement (« photo 3 sur 8… »), puis le
  résultat : combien ont été ajoutées, combien l'appareil n'a pas su lire, et si
  la mémoire est pleine — dans ce cas les photos restent utilisables pour la
  partie, mais il faut **enregistrer le fichier** pour les garder.
- Elles sont ramenées à 1100 px de côté (~150 Ko chacune) : une trentaine
  tiennent dans la mémoire d'un téléphone. La réduction évite soigneusement de
  saturer la mémoire — une photo d'iPhone occupe près de 50 Mo une fois
  décodée, et Safari ferme la page au bout de deux ou trois si on ne rend pas
  la place au fur et à mesure. Deux chemins sont tentés (adresse d'objet, puis
  lecture classique) pour que ça marche aussi dans une page enfermée dans un
  cadre à règles strictes.
- **Correction après chaque réponse** : les bonnes réponses passent en vert,
  les mauvaises en rouge, chacune affiche ses points, la meilleure et celle que
  tu as choisie sont étiquetées. On reste sur la carte jusqu'à ce que tu appuies
  sur **Continuer**, n'importe où sur l'écran, ou sur Entrée. Le seuil est réglable
  avec `SEUIL_BON` (7 points sur 10 par défaut).
- **Dernière carte** : le bouton « Oui » ne se téléporte pas, il est un objet
  physique de 2 kg qui réagit en trois temps.
  1. **Premier appui** : il décroche et **tombe**, avec la vraie pesanteur
     (9,81 m/s²). Sur téléphone la pesanteur suit l'**inclinaison de l'appareil** :
     penche l'écran et il glisse, il rebondit un peu, puis se pose à plat.
     iOS demande l'autorisation d'accéder aux capteurs à ce moment-là ; si elle
     est refusée, il tombe simplement vers le bas.
  2. **Deuxième appui** : il devient un **palet de hockey** — plus de pesanteur,
     plus de frottement, il rebondit sur les bords **sans jamais s'arrêter**.
     Au bout de dix secondes il ralentit progressivement (jusqu'à 1,7 m/s) pour
     rester attrapable.
  3. **Troisième appui** : il part en **ricochet** et claque **cinq fois**
     contre les côtés de l'écran, sans rien perdre de sa vitesse (environ
     160 ms entre chaque claquement), puis le dernier rebond l'expédie
     dehors. Un
     **compte à rebours de 5 secondes** s'affiche, le bouton « Non » grossit
     légèrement et se met à respirer. On peut appuyer sur « Non » à tout moment ;
     sinon, à zéro, l'écran devient rouge avec un tampon « NON. » et la réponse
     est validée toute seule.

  Les réglages sont dans l'objet `PHYS` : masse, pesanteur, poussée du premier
  appui, vitesse du palet, force d'éjection, rebond et freinage au sol.
- **Passage d'une carte à l'autre** : la carte et les réponses se fondent vers
  la gauche (200 ms) puis reviennent de la droite (300 ms), enchaînées dans la
  même image, sans que l'écran soit redessiné. Les photos de la carte suivante
  sont décodées à l'avance pour qu'aucune image ne saute au moment du
  remplacement.
- L'**avion** de la barre de progression ne saute plus d'une carte à l'autre : il
  glisse en 0,9 s avec une accélération et un freinage progressifs, en prenant un
  peu d'altitude et en s'inclinant dans le sens du vol.
- Écran **Souvenir** : score sur 100, verdict tamponné, pluie de cœurs.

## Trois langues

Un bouton en haut à droite fait tourner **français → anglais → vietnamien**.
Tout est traduit : les 100 questions, leurs 400 réponses, la dernière carte,
et toute l'interface — titres, boutons, cachets, timbres, verdicts, piques du
bouton « Oui », panneau des photos, jusqu'aux étiquettes « ton choix » et
« la meilleure » qui sont écrites en CSS.

Au premier lancement la langue du téléphone est utilisée si c'est l'une des
trois, sinon le français. Ton choix est ensuite mémorisé et **voyage avec le
fichier enregistré** : la personne qui l'ouvre retrouve la langue que tu avais
choisie. On peut aussi changer de langue en pleine partie, la carte affichée
se met à jour sans être perdue.

Les textes de l'interface sont regroupés dans l'objet `TEXTES`, un bloc par
langue avec les mêmes clés. Ceux des questions vivent dans la banque, à côté
du français (voir ci-dessous). En vietnamien la police manuscrite du carnet
est remplacée par une italique, faute de signes diacritiques dans la fonte
d'origine.

## Modifier les questions

Ouvre `index.html` dans un éditeur de texte, cherche `const BANQUE`. Chaque
texte s'écrit dans les trois langues, **toujours dans le même ordre : français,
anglais, vietnamien**. Le dernier nombre d'une réponse, ce sont ses points
(0 à 10) :

```js
q(["Le vrai test : qui doit absolument te valider ?",
   "The real test: whose approval do you absolutely need?",
   "Bài kiểm tra thật sự: ai nhất định phải gật đầu với bạn?"],
  ["Moi. Évidemment.",
   "Mine. Obviously.",
   "Tôi. Dĩ nhiên rồi.", 10],
  ["Sa mère.",
   "His mother's.",
   "Mẹ anh ấy.", 5],
  ...
),
```

**Si tu n'écris qu'un seul texte, il sert pour les trois langues** — pratique
pour ajouter une question à la va-vite :

```js
q("Une question écrite seulement en français",
  ["Une réponse", 10], ["Une autre", 4], ...),
```

Les points vont de **−5 à 10**. Les réponses négatives font vraiment perdre des
points : 22 d'entre elles en portent, réparties sur 22 questions — **−5** pour
les vrais drapeaux rouges (fouiller son téléphone, le géolocaliser, l'humilier
en story, se servir d'un secret dans une dispute) et **−2** pour les
mesquineries. Elles s'affichent en rouge appuyé à la correction, avec leur
compte en gras. Le score peut donc finir sous zéro : au pire, une partie de dix
cartes toutes ratées descend à −50.

Tu peux en ajouter, en enlever, en réécrire : le score se recalcule tout seul
sur 100. Garde une réponse à 10 points par question pour que le maximum reste
atteignable.

Juste en dessous de la banque :

- `NB_CARTES` — combien de cartes on tire à chaque partie (10 par défaut).
- `FINALE` — la dernière question. Ne supprime pas son `finale:true` : c'est lui
  qui déclenche le bouton fuyard et l'écran rouge.
- `SEUILS` — le score minimum de chacun des quatre verdicts.
- `TEXTES` — tous les textes de l'interface, langue par langue : les piques du
  bouton « Oui » (`taunts`), les verdicts (`verdicts`), et le reste.

Si tu modifies les questions après avoir ajouté tes photos, réexporte le fichier
depuis le panneau **Mes photos** pour récupérer une version à jour.

## En ligne

Une fois la branche fusionnée dans `main`, le quiz est aussi accessible ici :
`https://elliottsaintecatherine-prog.github.io/maths_hub/Quiz_Copine/`

## Crédit typographique

L'écriture manuscrite est la police **Caveat** (licence SIL Open Font License),
intégrée directement dans le fichier pour que la page garde son style partout,
même hors ligne.
