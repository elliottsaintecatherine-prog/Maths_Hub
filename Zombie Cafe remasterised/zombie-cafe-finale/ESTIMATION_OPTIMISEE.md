# Estimation optimisée Zombie Café — Répartition Haiku/Sonnet/Opus

**Base** : 28 prompts, ~3,27 M tokens, ~147h humain (d'après `wiki/games/zombie-cafe-estimation.md`)

---

## Stratégie de répartition

| Complexité | Modèle | Critères | Prompts cibles |
|---|---|---|---|
| ★★ (simple) | **Haiku 4.5** | UI static, pas d'algorithme complexe | 1c, 7c, 5a-variants |
| ★★-★★★ | **Sonnet 4.6** | Logique standard, intégration modérée | 1a, 1b, 2a–2c, 4a, 4c, 5a-base, 6a-base, 7b, 8a-base, 9a |
| ★★★★★ (heavy) | **Opus 4.7** | Algo complexe, gestion d'état lourd, contexts 150k+ | 3a, 3b, 6b, 6d, 4b, 5b–5d, 7a, 8b, 9b–9d |

---

## Répartition détaillée avec tokens

### Phase 1 — Fondations (73 k tokens total)

| ID | Titre | ★ | Tokens | Modèle | Raison |
|---|---|---|---|---|---|
| **1a** | Types clients + stats | ★★ | 16 k | **Sonnet** | Setup data simple, pas algo |
| **1b** | Infection + toxines + noms | ★★★ | 32 k | **Sonnet** | Logique infection standard, 1 popup |
| **1c** | Frigo stockage + compteur | ★ | 25 k | **Haiku** | Display/gestion triviale |
| **Phase 1 total** | | | **73 k** | **Sonnet 49k + Haiku 25k** | |

---

### Phase 2 — IA zombie (120 k tokens)

| ID | Titre | ★ | Tokens | Modèle | Raison |
|---|---|---|---|---|---|
| **2a** | Énergie perte/récup/barre | ★★★ | 37 k | **Sonnet** | Logique physique simple, pas état global |
| **2b** | Patience seuil + fuite | ★★★ | 40 k | **Sonnet** | Seuil + trigger, intégration claire |
| **2c** | Focus daydreaming + repos | ★★ | 43 k | **Sonnet** | Tween + bubble, pas d'algo complexe |
| **Phase 2 total** | | | **120 k** | **Sonnet 120k** | |

---

### Phase 6 — Cuisine & service (269 k tokens)

| ID | Titre | ★ | Tokens | Modèle | Raison |
|---|---|---|---|---|---|
| **6a** | Recettes + cuisson | ★★★★ | 60 k | **Sonnet** | Données + timers, pas d'algo |
| **6b** | Flux comptoir + tips | ★★★★★ | 68 k | **Opus** | Logique d'état complexe (client matching, zombie movement) |
| **6c** | Évier cycle assiettes | ★★★ | 67 k | **Sonnet** | File FIFO simple, pas contexte lourd |
| **6d** | Cookbook UI | ★★★ | 74 k | **Sonnet** | UI panels, scroll/filtrage, read-only |
| **Phase 6 total** | | | **269 k** | **Sonnet 201k + Opus 68k** | |

---

### Phase 3 — Pathfinding & isométrie (192 k tokens)

| ID | Titre | ★ | Tokens | Modèle | Raison |
|---|---|---|---|---|---|
| **3a** | Grille iso + A* | ★★★★★ | 87 k | **Opus** | A* complexe + conversion iso, beaucoup de contexte |
| **3b** | Mouvement + z-sort + debug | ★★★★★ | 105 k | **Opus** | Pathfinding collision + rendu iso, refactor CHAIR_POSITIONS |
| **Phase 3 total** | | | **192 k** | **Opus 192k** | |

---

### Phase 4 — Raids (319 k tokens)

| ID | Titre | ★ | Tokens | Modèle | Raison |
|---|---|---|---|---|---|
| **4a** | Carte raids + préparation | ★★★ | 97 k | **Sonnet** | UI + overlay simple, pas logique combat |
| **4b** | Scène raid combat | ★★★★ | 110 k | **Opus** | Logique combat manuel + tweens + état, beaucoup d'integrations |
| **4c** | Victoire/défaite + cooldowns | ★★★ | 112 k | **Sonnet** | Conditions simples + cooldowns, output straightforward |
| **Phase 4 total** | | | **319 k** | **Sonnet 209k + Opus 110k** | |

---

### Phase 5 — Shop & meubles (551 k tokens)

| ID | Titre | ★ | Tokens | Modèle | Raison |
|---|---|---|---|---|---|
| **5a** | Shop UI + onglets | ★★★ | 124 k | **Sonnet** | UI panels + state toggle, pas placement |
| **5b** | Placement meubles | ★★★★ | 133 k | **Opus** | Ghost mode + validation grille iso + setBlocked, logique complexe |
| **5c** | Déco + expansion + édition | ★★★★ | 141 k | **Opus** | Grille dynamique + visuel, 3 modes (déco/expan/édition) |
| **5d** | Tombstones (décos premium) | ★★★ | 153 k | **Sonnet** | Achat + placement-as-furniture, réutilise 5b |
| **Phase 5 total** | | | **551 k** | **Sonnet 277k + Opus 274k** | |

---

### Phase 7 — Progression (503 k tokens)

| ID | Titre | ★ | Tokens | Modèle | Raison |
|---|---|---|---|---|---|
| **7a** | XP + niveaux + Meat Locker | ★★★★ | 165 k | **Opus** | Formule XP + progression + déblocage multi-étapes |
| **7b** | Rating + bonus stars + objectifs | ★★★ | 170 k | **Sonnet** | Stars affichage + modifications simples, pas algo |
| **7c** | Meat Locker extensible | ★★ | 168 k | **Haiku** | Extension grille, no complexity |
| **Phase 7 total** | | | **503 k** | **Sonnet 170k + Opus 165k + Haiku 168k** | |

---

### Phase 8 — Persistence (380 k tokens)

| ID | Titre | ★ | Tokens | Modèle | Raison |
|---|---|---|---|---|---|
| **8a** | Sauvegarde localStorage | ★★★ | 184 k | **Sonnet** | Sérialisation JSON, validation simple |
| **8b** | Gains hors-ligne + Options | ★★★ | 196 k | **Opus** | Calcul hors-ligne (durée offline) + popup, gestion minutieuse |
| **Phase 8 total** | | | **380 k** | **Sonnet 184k + Opus 196k** | |

---

### Phase 9 — Finalisation (866 k tokens)

| ID | Titre | ★ | Tokens | Modèle | Raison |
|---|---|---|---|---|---|
| **9a** | Menu principal | ★★★ | 197 k | **Sonnet** | UI statique + transitions, pas logique gameplay |
| **9b** | Tutoriel Chef narrateur | ★★★★ | 217 k | **Opus** | Spotlight + steps + persistent state + narrative flow |
| **9c** | Audio Web Audio API | ★★★★ | 218 k | **Opus** | Web Audio complexe + event hooking + synth, Sonnet risk gaps |
| **9d** | HUD final + particules | ★★★★ | 234 k | **Opus** | 5 HUD zones + notifications + particles, beaucoup d'intégrations |
| **Phase 9 total** | | | **866 k** | **Sonnet 197k + Opus 669k** | |

---

## Totaux par modèle

| Modèle | Tokens | % | Prompts | Est. temps (interactif) | Coût brut |
|---|---|---|---|---|---|
| **Haiku 4.5** | 193 k | 6 % | 2–3 | 3–4 h @ 70 tok/s | $0.20 |
| **Sonnet 4.6** | 1,457 k | 45 % | 14–15 | 16–18 h @ 80 tok/s | $2.50 |
| **Opus 4.7** | 1,620 k | 49 % | 11–13 | 18–20 h @ 50 tok/s | $15–18 |
| **TOTAL** | **3,270 k** | 100 % | **28** | **37–42 h Claude** | **$17.70–20.70** |

*Avec prompt caching (80% input cached après 1er prompt par phase) : coût réel ≈ **$3–5**.*

---

## Calendrier réaliste (parallèle + séquentiel)

**Scénario 1 : Séquentiel (un prompt à la fois)**
- Haiku : 3–4 h (0,1 h par prompt)
- Sonnet : 16–18 h (1,1 h par prompt)
- Opus : 18–20 h (1,5–1,8 h par prompt)
- **Total : 37–42 h Claude** ≈ **5–6 jours calendrier** (8–10 h/jour supervision)

**Scénario 2 : Parallèle max (3 conversations, une par modèle)**
- Haiku : 3–4 h (exécution 100% parallèle)
- Sonnet : 16–18 h (exécution 100% parallèle)
- Opus : 18–20 h (exécution 100% parallèle)
- **Temps réel : 20–22 h horloge** (modèle slowest = Opus) ≈ **2–3 jours** (supervision ~1–2 h/jour par modèle)

**Scénario 3 : Hybride (Haiku/Sonnet en parallèle, Opus solo après)**
- Haiku + Sonnet en parallèle : 16–18 h (slowest = Sonnet)
- Opus + Phase 9 (9b–9d costliest) : 20 h après
- **Temps réel : 36–38 h horloge** ≈ **2 jours** (parallèle) **+ 1 jour** (Opus) = **3 jours totaux**

---

## Stratégie recommandée

**Approche mixte (coût ≈ **$5–8 avec cache**, **délai 4–5 jours**)** :

1. **Jour 1** (Haiku + Sonnet en parallèle, 6–8 h clock)
   - **Haiku** : Prompts 1c, 7c (2 prompts)
   - **Sonnet** : 1a, 1b, 2a–2c, 4a, 4c, 5a, 6a, 6c, 6d, 7b, 8a, 9a (12 prompts)
   - Opus idle, avance Phase 3 en parallèle si tu veux

2. **Jour 2–3** (Opus heavy lifting, 10–12 h clock)
   - **Opus** : 3a, 3b, 6b, 4b, 5b–5d, 7a, 8b, 9b–9d (11 prompts)
   - Sonnet/Haiku idle
   - Total Opus : ~650 k tokens

3. **Jour 4** (validations croisées, tests finaux)
   - Relecture, test integration GameScene

**Avantages** :
- Coût réel ~$5–8 (vs $78 pure Opus)
- Délai 4–5 jours (vs 10–12 jours pur Sonnet)
- Haiku absorbe les tâches triviales (1c 25k tokens en 20 min)
- Opus focus sur algo complexe où il excelle vraiment (A*, collision, audio)
- Prompt cache économise **80% coût input** après prompt 1 par phase

---

## Comparaison des approches

| Approche | Temps (h) | Coût brut | Coût avec cache | Délai calendrier |
|---|---|---|---|---|
| **Pure Opus 4.7** | 40 h | $78 | $15–20 | 5–6 jours |
| **Pure Sonnet 4.6** | 35 h | $16 | $3–4 | 5–6 jours (mais risque gaps) |
| **Pure Haiku 4.5** | 46 h+ | $5 | $1 | 8–10 jours (bugs probables) |
| **Haiku/Sonnet/Opus (mix)** ⭐ | 37–42 h | $18 | **$5–8** | **3–4 jours** |
| **Haiku/Sonnet parallel + Opus** ⭐⭐ | 38 h | $20 | **$6–9** | **4–5 jours** |

---

## Notes importantes

1. **Prompt caching**
   - Actif après le 1er prompt d'une phase (~90% input cache hit)
   - Réduit coût input ~8x (1 M tokens cached ≈ $0.03 vs $15)
   - Réel coût projet : **$3–5 finale**

2. **Complexité réelle vs estimation**
   - Prompts 3a, 3b, 6b ont historiquement dépassé de 30–50%
   - Buffer Opus absorbé (modèle + capable + contexte)
   - Sonnet peut pousser jusqu'à ★★★★ si focus spécifique

3. **Délai parallèle optimal**
   - 3 conversations (1 Haiku, 1 Sonnet, 1 Opus) = **2–3 jours horloge max**
   - Supervision ~1 h/jour (revue codes + copier PROCHAINE ACTION)
   - Dépend de ta disponibilité interruption

4. **Risques Haiku**
   - 1c (frigo) : OK (trivial)
   - 7c (Meat Locker extend) : **borderline**, possibles gaps logique grille iso
   - → recommande **Sonnet 7c** si doute

5. **Risques Sonnet seul**
   - 3a (A*) : **risque**, beaucoup de context, pas garantis correctness
   - 6b (flux service) : **OK** si spécifications ultra-claires
   - 9b–9d : possibles gaps narrative/audio sans Opus context-depth

---

## Conclusion

**Go avec Haiku + Sonnet + Opus en parallèle** :
- ✅ Coût final **$5–8** (vs $78 Opus pure)
- ✅ Délai **3–4 jours** (vs 5–6 jours Sonnet seul sans risque algo)
- ✅ Qualité garantie (Opus sur les 11 prompts ★★★★★)
- ✅ Supervision ~5–6 h total répartie sur 4 jours
