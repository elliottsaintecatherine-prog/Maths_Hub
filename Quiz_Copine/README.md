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
- Chaque question est une **carte postale par avion** : la photo est au dos, la
  carte s'incline quand on bouge le doigt dessus (relief + ombre portée), et on
  **appuie dessus pour voir la photo en entier**.
- **Dernière carte** : le bouton « Oui » se téléporte à chaque tentative, il
  disparaît à la troisième, l'écran devient rouge avec un tampon « NON. », la
  réponse « Non » est validée automatiquement, puis on passe au score.
- Écran **Souvenir** : score sur 100, verdict tamponné, pluie de cœurs.

## Modifier les questions

Ouvre `index.html` dans un éditeur de texte, cherche `const BANQUE`. Chaque
question tient sur une ligne, avec ses quatre réponses et leurs points (0 à 10) :

```js
q("Le vrai test : qui doit absolument te valider ?",
  ["Moi. Évidemment.",10],["Sa mère.",5],["Ses potes.",2],["Personne, on est en 2026.",0]),
```

Tu peux en ajouter, en enlever, en réécrire : le score se recalcule tout seul
sur 100. Garde une réponse à 10 points par question pour que le maximum reste
atteignable.

Juste en dessous de la banque :

- `NB_CARTES` — combien de cartes on tire à chaque partie (10 par défaut).
- `FINALE` — la dernière question. Ne supprime pas son `finale:true` : c'est lui
  qui déclenche le bouton fuyard et l'écran rouge.
- `TAUNTS` — les trois piques quand elle essaie de cliquer sur « Oui ».
- `VERDICTS` — les verdicts de fin, avec le score minimum de chacun.

Si tu modifies les questions après avoir ajouté tes photos, réexporte le fichier
depuis le panneau **Mes photos** pour récupérer une version à jour.

## En ligne

Une fois la branche fusionnée dans `main`, le quiz est aussi accessible ici :
`https://elliottsaintecatherine-prog.github.io/maths_hub/Quiz_Copine/`

## Crédit typographique

L'écriture manuscrite est la police **Caveat** (licence SIL Open Font License),
intégrée directement dans le fichier pour que la page garde son style partout,
même hors ligne.
