export default class DeckManager {
    constructor(onPlayCard) {
        this.hand = [];
        this.onPlayCard = onPlayCard; // Callback fourni par Game.js
        this.selectedIndices = []; // Indices des cartes sélectionnées (max 2)
        this.multiplierUsed = false; // Un multiplicateur par mouvement
    }

    generateSingleCard() {
        let x = 0;
        let y = 0;
        while (x === 0 && y === 0) {
            x = Math.floor(Math.random() * 7) - 3;
            y = Math.floor(Math.random() * 7) - 3;
        }
        return { x, y };
    }

    generateHand(size = 5) {
        this.hand = [];
        for (let i = 0; i < size; i++) {
            this.hand.push(this.generateSingleCard());
        }
        console.log("Main générée :", this.hand);
        this.selectedIndices = [];
        this.multiplierUsed = false;
        this.renderHandDOM();
        this.setupExecuteButton();
        this.setupMultiplierButtons();
        return this.hand;
    }

    // --- d4 : Sélection & Combo ---

    toggleSelect(index) {
        const pos = this.selectedIndices.indexOf(index);
        if (pos !== -1) {
            // Désélectionner
            this.selectedIndices.splice(pos, 1);
        } else if (this.selectedIndices.length < 2) {
            // Sélectionner (max 2)
            this.selectedIndices.push(index);
        }
        this.updatePreview();
        this.renderHandDOM();
    }

    getResultantVector() {
        if (this.selectedIndices.length === 0) return null;
        let rx = 0;
        let ry = 0;
        for (const idx of this.selectedIndices) {
            rx += this.hand[idx].x;
            ry += this.hand[idx].y;
        }
        return { x: rx, y: ry };
    }

    updatePreview() {
        const preview = document.getElementById('result-preview');
        if (!preview) return;
        const r = this.getResultantVector();
        if (r) {
            preview.textContent = `Resultat : (${r.x}; ${r.y})`;
        } else {
            preview.textContent = '';
        }
    }

    executeCombo() {
        const r = this.getResultantVector();
        if (!r) return;

        if (this.onPlayCard && this.onPlayCard(r.x, r.y)) {
            // Mouvement valide : retirer les cartes utilisées et les remplacer
            // Trier les indices en ordre décroissant pour ne pas décaler
            const sorted = [...this.selectedIndices].sort((a, b) => b - a);
            for (const idx of sorted) {
                this.hand[idx] = this.generateSingleCard();
            }
            this.selectedIndices = [];
            this.multiplierUsed = false;
            this.updateMultiplierButtons();
            this.updatePreview();
            this.renderHandDOM();
        } else {
            // Mouvement invalide : shake toutes les cartes sélectionnées
            const btns = document.querySelectorAll('.btn-deck');
            for (const idx of this.selectedIndices) {
                if (btns[idx]) {
                    btns[idx].classList.remove('shake');
                    void btns[idx].offsetWidth;
                    btns[idx].classList.add('shake');
                }
            }
        }
    }

    setupExecuteButton() {
        const btn = document.getElementById('btn-execute');
        if (!btn) return;
        btn.onclick = () => this.executeCombo();
    }

    // --- d5 : Multiplicateurs scalaires ---

    applyMultiplier(factor) {
        if (this.multiplierUsed) return;
        if (this.selectedIndices.length !== 1) return;

        const idx = this.selectedIndices[0];
        const card = this.hand[idx];

        // x0.5 n'est cliquable que si les coordonnées sont paires
        if (factor === 0.5 && (card.x % 2 !== 0 || card.y % 2 !== 0)) return;

        card.x = Math.round(card.x * factor);
        card.y = Math.round(card.y * factor);

        this.multiplierUsed = true;
        this.updateMultiplierButtons();
        this.updatePreview();
        this.renderHandDOM();
    }

    setupMultiplierButtons() {
        const btnX2 = document.getElementById('btn-mult-x2');
        const btnHalf = document.getElementById('btn-mult-half');
        const btnInvert = document.getElementById('btn-mult-invert');

        if (btnX2) btnX2.onclick = () => this.applyMultiplier(2);
        if (btnHalf) btnHalf.onclick = () => this.applyMultiplier(0.5);
        if (btnInvert) btnInvert.onclick = () => this.applyMultiplier(-1);

        this.updateMultiplierButtons();
    }

    updateMultiplierButtons() {
        const btnX2 = document.getElementById('btn-mult-x2');
        const btnHalf = document.getElementById('btn-mult-half');
        const btnInvert = document.getElementById('btn-mult-invert');

        const disabled = this.multiplierUsed || this.selectedIndices.length !== 1;
        if (btnX2) btnX2.disabled = disabled;
        if (btnHalf) {
            let halfDisabled = disabled;
            if (!disabled) {
                const card = this.hand[this.selectedIndices[0]];
                if (card.x % 2 !== 0 || card.y % 2 !== 0) halfDisabled = true;
            }
            btnHalf.disabled = halfDisabled;
        }
        if (btnInvert) btnInvert.disabled = disabled;
    }

    // --- Rendu DOM ---

    renderHandDOM() {
        const deckArea = document.getElementById('deck-area');
        if (!deckArea) return;
        deckArea.innerHTML = '';

        this.hand.forEach((vector, index) => {
            const btn = document.createElement('button');
            btn.className = 'btn-deck';
            if (this.selectedIndices.includes(index)) {
                btn.classList.add('selected');
            }
            btn.innerHTML = `
                <span>(${vector.x}; ${vector.y})</span>
                <span style="font-size: 24px; margin-top: 5px;">&#10148;</span>
            `;
            // Rotation de la flèche selon le vecteur
            const angle = Math.atan2(vector.y, vector.x) * (180 / Math.PI);
            const arrow = btn.querySelector('span:nth-child(2)');
            arrow.style.display = 'inline-block';
            arrow.style.transform = `rotate(${angle}deg)`;

            btn.onclick = () => this.toggleSelect(index);

            deckArea.appendChild(btn);
        });

        this.updateMultiplierButtons();
    }
}
