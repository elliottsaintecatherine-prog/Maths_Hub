/**
 * GameLogic.js — Logique pure du jeu VectHorreur
 * Pas de dépendance React, pas de state.
 */

/**
 * Vérifie si le point (x, y) est strictement dans un rectangle {x1,y1,x2,y2}
 */
export function pointInRect(x, y, rect) {
  const minX = Math.min(rect.x1, rect.x2)
  const maxX = Math.max(rect.x1, rect.x2)
  const minY = Math.min(rect.y1, rect.y2)
  const maxY = Math.max(rect.y1, rect.y2)
  return x > minX && x < maxX && y > minY && y < maxY
}

/**
 * Vérifie si un segment (from → to) intersecte un rectangle obstacle.
 * Utilise l'algorithme de Liang-Barsky simplifié.
 */
export function checkPathCollision(from, to, obstacles) {
  for (const obs of obstacles) {
    const minX = Math.min(obs.x1, obs.x2)
    const maxX = Math.max(obs.x1, obs.x2)
    const minY = Math.min(obs.y1, obs.y2)
    const maxY = Math.max(obs.y1, obs.y2)

    const dx = to.x - from.x
    const dy = to.y - from.y

    // On teste plusieurs points interpolés sur le segment
    const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 4 + 2
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const px = from.x + dx * t
      const py = from.y + dy * t
      if (px > minX && px < maxX && py > minY && py < maxY) {
        return true
      }
    }
  }
  return false
}

/**
 * Applique un vecteur au joueur.
 * Retourne { newPos, hitObstacle, hitDeath, reachedExit }
 */
export function applyVector(pos, vec, map) {
  const newPos = {
    x: pos.x + vec.x,
    y: pos.y + vec.y
  }

  // Vérifier les obstacles (point d'arrivée + chemin)
  const pathBlockedByObstacle = checkPathCollision(pos, newPos, map.obstacles)
  if (pathBlockedByObstacle || map.obstacles.some(obs => pointInRect(newPos.x, newPos.y, obs))) {
    return { newPos: pos, hitObstacle: true, hitDeath: false, reachedExit: false }
  }

  // Vérifier les zones de mort
  if (map.deathZones.some(dz => pointInRect(newPos.x, newPos.y, dz))) {
    return { newPos, hitObstacle: false, hitDeath: true, reachedExit: false }
  }

  // Vérifier la sortie
  const exit = map.exit
  if (pointInRect(newPos.x, newPos.y, exit)) {
    return { newPos, hitObstacle: false, hitDeath: false, reachedExit: true }
  }

  return { newPos, hitObstacle: false, hitDeath: false, reachedExit: false }
}

/**
 * Calcule le vecteur IA de Slappy : approche le joueur, magnitude max 3, arrondi à l'entier.
 */
export function computeAIVector(monsterPos, playerPos) {
  const dx = playerPos.x - monsterPos.x
  const dy = playerPos.y - monsterPos.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist < 0.01) return { x: 0, y: 0 }

  // Normaliser puis clamp à magnitude 3
  const maxMag = 3
  const scale = Math.min(dist, maxMag) / dist

  // Arrondir à l'entier le plus proche
  const vx = Math.round(dx * scale)
  const vy = Math.round(dy * scale)

  return { x: vx, y: vy }
}

/**
 * Vérifie si le chasseur a attrapé le fugitif (distance de Chebyshev ≤ 1).
 */
export function hunterCatchesFugitive(hunterPos, fugitivePos) {
  const dx = Math.abs(hunterPos.x - fugitivePos.x)
  const dy = Math.abs(hunterPos.y - fugitivePos.y)
  return Math.max(dx, dy) <= 1
}

/**
 * Calcule le vecteur IA du chasseur : approche le fugitif, magnitude max 2, arrondi à l'entier.
 */
export function computeHunterAI(hunterPos, fugitivePos) {
  const dx = fugitivePos.x - hunterPos.x
  const dy = fugitivePos.y - hunterPos.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist < 0.01) return { x: 0, y: 0 }

  // Normaliser puis clamp à magnitude 2
  const maxMag = 2
  const scale = Math.min(dist, maxMag) / dist

  // Arrondir à l'entier le plus proche
  const vx = Math.round(dx * scale)
  const vy = Math.round(dy * scale)

  return { x: vx, y: vy }
}

/**
 * Déplace le monstre vers le joueur en évitant les obstacles.
 * Retourne la nouvelle position du monstre.
 */
export function moveMonster(monsterPos, playerPos, map) {
  const aiVec = computeAIVector(monsterPos, playerPos)

  // Essai du vecteur plein
  const fullPos = { x: monsterPos.x + aiVec.x, y: monsterPos.y + aiVec.y }
  const blockedFull = checkPathCollision(monsterPos, fullPos, map.obstacles) ||
    map.obstacles.some(obs => pointInRect(fullPos.x, fullPos.y, obs))

  if (!blockedFull) return fullPos

  // Essai horizontal seul
  const hPos = { x: monsterPos.x + aiVec.x, y: monsterPos.y }
  const blockedH = checkPathCollision(monsterPos, hPos, map.obstacles) ||
    map.obstacles.some(obs => pointInRect(hPos.x, hPos.y, obs))
  if (!blockedH && aiVec.x !== 0) return hPos

  // Essai vertical seul
  const vPos = { x: monsterPos.x, y: monsterPos.y + aiVec.y }
  const blockedV = checkPathCollision(monsterPos, vPos, map.obstacles) ||
    map.obstacles.some(obs => pointInRect(vPos.x, vPos.y, obs))
  if (!blockedV && aiVec.y !== 0) return vPos

  // Bloqué de tous côtés — rester sur place
  return monsterPos
}

/**
 * Vérifie si le monstre a attrapé un joueur (distance < seuil).
 * Alias de hunterCatchesFugitive pour compatibilité.
 */
export function monsterCatchesPlayer(monsterPos, playerPos, threshold = 1.5) {
  return hunterCatchesFugitive(monsterPos, playerPos)
}
