/**
 * catalogue.js — Liste des chansons disponibles
 *
 * Pour ajouter une chanson :
 *   1. Copier le .mp3 instrumental dans  Karaoke/<fichier>.mp3
 *   2. Copier la piste voix dans          Parole/<fichier>.mp3
 *   3. Copier la pochette dans            Affiche/<titre>.jpg  (ou .png)
 *   4. Ajouter une entrée dans CATALOGUE ci-dessous
 *
 * Format du champ "draft" (paroles par défaut) :
 *   - Chaque ligne = une ligne affichée en karaoké
 *   - Espace entre les mots = une note MIDI par mot
 *   - "--" entre deux syllabes d'un même mot = deux notes, affiché sans tiret
 *       Ex : "chan--son" → 2 notes, affiché "chanson"
 *   - Les paroles peuvent être affinées dans le Mode Développeur
 *     et sont sauvegardées dans le navigateur (localStorage)
 */

const CATALOGUE = [
  {
    file:   "Weyes Blood - Andromeda.mp3",
    title:  "Andromeda",
    artist: "Weyes Blood",
    draft:
`Andromeda's a big wide open galaxy
Nothing in it for me except a heart that's lazy
Running from my own life now
I'm really turning some time
Looking up to the sky for something I may never find
Stop calling
It's time to let me be
If you think you can save me
I'd dare you to try
Left the heart from the depths it's fallen through
We all want something new
But it can't seem to follow through
Something's better than nothing
Or so that I thought
Now I know it's just one dream
All these others gonna tear me apart
Love is calling
It's time to let it through
Find a love that will make you
I dare you try
Crazy guy
Think this is deep
Think it's meant to be
More than anything I can think of
I'm ready to try
Treat me right
I'm still a good man's daughter
Let me in if I break
And be quiet if I shatter
Getting tired of looking
You know that I hate the game
Don't wanna waste any more time
You know I didn't hold it up
Love is calling
It's time to give to you
Something you can hold onto
I dare you try`
  },
{
    file:   "Chris Isaak - Wicked Game.mp3",
    title:  "Wicked Game",
    artist: "Chris Isaak",
    draft:
`The world was on fire and no one could save me but you
It's strange what desire will make foolish people do
I'd never dreamed that I'd meet somebody like you
And I'd never dreamed that I'd lose somebody like you
No, I don't wanna fall in love
(This world is only gonna break your heart)
No, I don't wanna fall in love
(This world is only gonna break your heart)
With you
With you
(This world is only gonna break your heart)
What a wicked game to play, to make me feel this way
What a wicked thing to do, to let me dream of you
What a wicked thing to say, you never felt this way
What a wicked thing to do, to make me dream of you
And I don't wanna fall in love
(This world is only gonna break your heart)
No, I don't wanna fall in love
(This world is only gonna break your heart)
With you
World was on fire, no one could save me but you
It's strange what desire will make foolish people do
I'd never dreamed that I'd love somebody like you
And I'd never dreamed that I'd lose somebody like you
No, I don't wanna fall in love
(This world is only gonna break your heart)
No, I don't wanna fall in love
(This world is only gonna break your heart)
With you
(This world is only gonna break your heart)
With you
(This world is only gonna break your heart)
No, I...
(This world is only gonna break your heart)
Nobody loves no one`
  },
{
    file:   "Cage the elephant - Cigarette Daydream.mp3",
    title:  "Cigarette Daydream",
    artist: "Cage the elephant ",
    draft:
`Did you stand there all alone?
Oh, I cannot explain what's goin' down
I can see you standin' next to me
In and out somewhere else right now
You sigh, look away
I can see it clear as day
Close your eyes, so afraid
Hide behind that baby face
Do-do-do
Do-do-do
You can drive all night
Lookin' for the answers in the pourin' rain
You wanna find peace of mind
Lookin' for the answer
Funny how it seems like yesterday
As I recall, you were lookin' out of place
Gathered up your things and slipped away
No time at all, I followed you into the hall
Cigarette daydream
You were only seventeen
Soft speak with a mean streak
Nearly brought me to my knees
Do-do-do
Do-do-do
You can drive all night
Lookin' for the answers in the pourin' rain
You wanna find peace of mind
Lookin' for the answer
If we can find a reason, a reason to change
Lookin' for the answers
If you can find a reason, a reason to stay
Standin' in the pourin' rain
Do-do, do, do, do
Do-do, do, do-do, do-do
Do-do, do, do, do
Do-do, do, do-do, do-do
You can drive all night
Lookin' for the answers in the pourin' rain
You wanna find peace of mind
Lookin' for the answer
If we can find a reason, a reason to change
Lookin' for the answer
If you can find a reason, a reason to stay
Standin' in the pourin' rain`
  },
];
