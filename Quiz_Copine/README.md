# Es-tu digne de Louis ? — le test officiel

Quiz interactif (10 questions), pensé pour le téléphone. Tout tient dans un seul
fichier : `index.html`. Pas d'installation, pas de dépendance.

## Ajouter tes photos

1. Mets tes images dans le dossier `photos/` (à côté de `index.html`).
2. Ouvre `index.html`, va tout en bas dans la partie `<script>`, et regarde le bloc `PHOTOS` :

```js
const PHOTOS = {
  intro : 'photos/louis.jpg',     // accueil
  result: 'photos/nous.jpg',      // écran du score
  final : 'photos/louis-moi.jpg'  // dernière question
};
```

3. Écris le nom exact de tes fichiers. C'est tout.

Tant qu'une photo n'existe pas, le quiz affiche un cadre pointillé avec le nom
du fichier attendu — rien ne casse, tu peux en ajouter au fur et à mesure.

Pour mettre une photo sur **une question précise**, remplis son champ `photo` :

```js
{
  q:"Il te fait écouter SA musique dans la voiture.",
  photo:'photos/voiture.jpg',   // ← ici
  a:[ ... ]
}
```

Conseils : format JPG, largeur ~1000 px, quelques centaines de Ko suffisent
(sinon la page met du temps à charger sur téléphone).

## Modifier les questions

Toujours dans le bloc `<script>`, la liste `QUESTIONS`. Chaque question a un
texte et ses réponses, avec les points de chacune (0 à 10) :

```js
{
  q:"Le vrai test : qui doit absolument te valider ?",
  photo:null,
  a:[
    ["Moi. Évidemment.",10],
    ["Sa mère.",5],
    ["Ses potes.",2],
    ["Personne, on est en 2026.",0]
  ]
}
```

Tu peux ajouter ou supprimer des questions : le score se recalcule
automatiquement sur 100.

⚠️ Ne touche pas au `type:"finale"` de la dernière question : c'est lui qui
déclenche le bouton « Oui » qui s'enfuit et l'écran rouge.

Les autres réglages faciles, juste en dessous :

- `TAUNTS` — les trois petites piques quand elle essaie de cliquer sur « Oui ».
- `VERDICTS` — les verdicts de fin, avec le score minimum de chacun.

## Comment ça marche, la dernière question

- Le bouton **Oui** se téléporte ailleurs à chaque tentative.
- Au bout de **3 tentatives**, il disparaît, l'écran devient rouge avec un
  « NON. » qui tremble, et la réponse « Non » est validée automatiquement.
- Puis transition vers l'écran du score, avec la pluie de cœurs.
- Si elle clique directement sur **Non**, tout se passe normalement.

## Mettre le quiz en ligne

Le dossier est déjà dans le dépôt : une fois la branche fusionnée dans `main`,
le quiz est accessible à l'adresse
`https://elliottsaintecatherine-prog.github.io/maths_hub/Quiz_Copine/`.

Pour tester en local, il suffit d'ouvrir `index.html` dans un navigateur.
