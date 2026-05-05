/**
 * f1 — GameStateManager
 * Gère l'état de la partie : niveau courant, points de vie, score.
 * Singleton instancié une seule fois dans Game.
 */
export default class GameStateManager {
    constructor() {
        this.currentLevel = 0;
        this.health = 3;       // 3 PV par défaut
        this.score = 0;
        this.totalMoves = 0;   // Compteur de coups pour le récap de fin de salle
    }

    /**
     * Réinitialise la map courante (après mort du joueur).
     * Retourne true si le joueur a encore des PV, false si Game Over.
     */
    loseLife() {
        this.health--;
        console.log(`PV restants : ${this.health}`);
        if (this.health <= 0) {
            console.log('Game Over — Plus de PV');
            return false; // Game Over
        }
        return true; // Le joueur peut recommencer la salle
    }

    /**
     * Passe au niveau suivant.
     * Retourne le nouvel index de map.
     */
    nextLevel() {
        this.currentLevel++;
        this.totalMoves = 0;
        this.score += 100; // Bonus de base par niveau terminé
        console.log(`Passage au niveau ${this.currentLevel}`);
        return this.currentLevel;
    }

    /**
     * Enregistre un mouvement effectué par le joueur.
     */
    recordMove() {
        this.totalMoves++;
    }

    /**
     * Réinitialise entièrement la partie (retour au menu ou nouveau jeu).
     */
    reset() {
        this.currentLevel = 0;
        this.health = 3;
        this.score = 0;
        this.totalMoves = 0;
        this.updateHUD();
    }

    /**
     * f2 — Met à jour l'affichage du HUD (santé, salle, score).
     */
    updateHUD() {
        // Santé : crânes rouges
        const healthEl = document.getElementById('hud-health');
        if (healthEl) {
            healthEl.innerHTML = '';
            for (let i = 0; i < 3; i++) {
                const skull = document.createElement('span');
                skull.className = 'hud-skull';
                if (i >= this.health) {
                    skull.classList.add('lost');
                }
                // Crâne unicode
                skull.textContent = '\u{1F480}';
                healthEl.appendChild(skull);
            }
        }

        // Numéro de salle
        const roomEl = document.getElementById('hud-room');
        if (roomEl) {
            roomEl.textContent = `Salle ${this.currentLevel + 1}`;
        }

        // Score
        const scoreEl = document.getElementById('hud-score');
        if (scoreEl) {
            scoreEl.textContent = `Score : ${this.score}`;
        }
    }
}
