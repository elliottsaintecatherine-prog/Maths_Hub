import React, { useState, useEffect, useRef, useCallback } from 'react'
import Menu from './components/Menu.jsx'
import GameCanvas from './components/GameCanvas.jsx'
import CommandPanel from './components/CommandPanel.jsx'
import { MAPS } from './data/maps.js'
import { applyVector, moveMonster, monsterCatchesPlayer, hunterCatchesFugitive, computeHunterAI } from './engine/GameLogic.js'
import { useMultiplayer } from './hooks/useMultiplayer.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function initGameState(map, gameMode, role = 'fugitive') {
  // Solo : player = fugitif, monster = chasseur IA
  // Multi host : player = chasseur (hunterPos), player2 = fugitif (fugitivePos)
  // Multi guest : player = fugitif, player2 = chasseur
  return {
    playerPos: { ...map.startPos },
    player2Pos: { x: map.startPos.x + 2, y: map.startPos.y },
    monsterPos: { ...map.monsterStartPos },
    health: 5,
    lastVector: { x: 0, y: 0 },
    trail: [],
    turn: 1,
    pulse: 0,
    gameMode,
    role,           // 'fugitive' | 'hunter'
    multiWinner: null,
    multiWinReason: null,
    myTurn: true,
  }
}

// Flash d'obstacle : retourne true temporairement
function useFlash(duration = 500) {
  const [flashing, setFlashing] = useState(false)
  const trigger = useCallback(() => {
    setFlashing(true)
    setTimeout(() => setFlashing(false), duration)
  }, [duration])
  return [flashing, trigger]
}

// ---------------------------------------------------------------------------
// App principal
// ---------------------------------------------------------------------------
export default function App() {
  const [phase, setPhase] = useState('menu')
  // 'menu' | 'execute' | 'command' | 'gameover' | 'death' | 'win' | 'multiwin'

  const [gameMode, setGameMode] = useState('solo')
  const [currentMap, setCurrentMap] = useState(0)
  const [gameState, setGameState] = useState(null)

  const [obstacleFlash, triggerFlash] = useFlash(400)

  const multiplayer = useMultiplayer()

  // Ref pour accéder à gameState courant depuis les callbacks PeerJS
  const gameStateRef = useRef(gameState)
  const phaseRef = useRef(phase)
  useEffect(() => { gameStateRef.current = gameState }, [gameState])
  useEffect(() => { phaseRef.current = phase }, [phase])

  // ---------------------------------------------------------------------------
  // Initialisation multijoueur (messages PeerJS)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    multiplayer.setOnMessage((msg) => {
      if (!msg || !msg.type) return

      if (msg.type === 'start') {
        // L'hôte lance la partie : le guest reçoit l'état initial
        // Guest = fugitif, Host = chasseur
        setCurrentMap(msg.mapId)
        const map = MAPS[msg.mapId]
        const state = initGameState(map, 'multi', 'fugitive')
        state.myTurn = false // guest attend son tour
        setGameState(state)
        setPhase('execute')
        setGameMode('multi')
      }

      if (msg.type === 'move') {
        // L'adversaire a joué — appliquer son mouvement sur player2
        const state = gameStateRef.current
        if (!state) return
        const map = MAPS[currentMapRef.current]
        const result = applyVector(state.player2Pos, msg.vec, map)

        if (result.hitDeath) {
          // Le joueur adverse est tombé dans un gouffre
          multiplayer.send({ type: 'death' })
          setGameState(prev => ({ ...prev, player2Pos: result.newPos }))
          setPhase('multiwin') // on gagne par défaut (l'autre est mort)
          setGameState(prev => ({ ...prev, multiWinner: 'me', multiWinReason: 'opponent_death' }))
          return
        }

        // Le fugitif (player2 côté host) a atteint la sortie → fugitif gagne
        if (result.reachedExit && state.role === 'hunter') {
          multiplayer.send({ type: 'win', reason: 'exit' })
          setGameState(prev => ({ ...prev, multiWinner: 'opponent', multiWinReason: 'exit', player2Pos: result.newPos }))
          setPhase('multiwin')
          return
        }

        // Le chasseur (player2 côté guest) a attrapé le fugitif → chasseur gagne
        if (state.role === 'fugitive' && hunterCatchesFugitive(result.newPos, state.playerPos)) {
          multiplayer.send({ type: 'win', reason: 'caught' })
          setGameState(prev => ({ ...prev, multiWinner: 'opponent', multiWinReason: 'caught', player2Pos: result.newPos }))
          setPhase('multiwin')
          return
        }

        setGameState(prev => ({
          ...prev,
          player2Pos: result.newPos,
          turn: prev.turn + 1,
          myTurn: true,
          lastVector: prev.lastVector,
        }))
        // Notifier l'adversaire que c'est maintenant à lui
        multiplayer.send({ type: 'moved', pos: result.newPos })
      }

      if (msg.type === 'moved') {
        // Confirmation que l'adversaire a traité notre coup
        setGameState(prev => prev ? ({ ...prev, myTurn: true }) : prev)
      }

      if (msg.type === 'win') {
        setGameState(prev => prev ? ({ ...prev, multiWinner: 'opponent', multiWinReason: msg.reason || null }) : prev)
        setPhase('multiwin')
      }

      if (msg.type === 'death') {
        // L'adversaire est mort dans un gouffre — on gagne
        setGameState(prev => prev ? ({ ...prev, multiWinner: 'me', multiWinReason: 'opponent_death' }) : prev)
        setPhase('multiwin')
      }
    })
  }, [multiplayer])

  // Ref pour le currentMap courant (utilisé dans les callbacks)
  const currentMapRef = useRef(currentMap)
  useEffect(() => { currentMapRef.current = currentMap }, [currentMap])

  // ---------------------------------------------------------------------------
  // Démarrer le jeu
  // ---------------------------------------------------------------------------
  const startSolo = useCallback(() => {
    const map = MAPS[currentMap]
    setGameState(initGameState(map, 'solo', 'fugitive'))
    setGameMode('solo')
    setPhase('execute')
  }, [currentMap])

  const startMultiHost = useCallback(() => {
    multiplayer.host()
  }, [multiplayer])

  // Quand l'hôte clique "jouer" (après connexion)
  const launchMultiGame = useCallback(() => {
    const map = MAPS[currentMap]
    // Host = chasseur, Guest = fugitif
    const state = initGameState(map, 'multi', 'hunter')
    state.myTurn = true
    setGameState(state)
    setGameMode('multi')
    setPhase('execute')
    // Envoyer le signal de départ au guest
    multiplayer.send({ type: 'start', mapId: currentMap })
  }, [currentMap, multiplayer])

  const joinMulti = useCallback((hostId) => {
    multiplayer.join(hostId)
  }, [multiplayer])

  // ---------------------------------------------------------------------------
  // Logique de tour solo
  // ---------------------------------------------------------------------------
  const handleVectorSubmit = useCallback((vec) => {
    const state = gameStateRef.current
    if (!state) return
    const map = MAPS[currentMapRef.current]

    // Clamp la magnitude max à 5 cases par composante
    const clampedVec = {
      x: Math.max(-5, Math.min(5, Math.round(vec.x))),
      y: Math.max(-5, Math.min(5, Math.round(vec.y))),
    }

    if (state.gameMode === 'solo') {
      // Le joueur est le FUGITIF — il se déplace
      const result = applyVector(state.playerPos, clampedVec, map)

      if (result.hitObstacle) {
        triggerFlash()
        setPhase('execute') // fermer le panneau, rester sur la scène
        return
      }

      if (result.hitDeath) {
        setGameState(prev => ({ ...prev, playerPos: result.newPos, lastVector: clampedVec }))
        setPhase('death')
        return
      }

      if (result.reachedExit) {
        // Fugitif atteint la sortie → victoire fugitif
        setGameState(prev => ({ ...prev, playerPos: result.newPos, lastVector: clampedVec }))
        setPhase('win')
        return
      }

      // Tour du chasseur IA (Slappy) : calcul du vecteur et déplacement
      const hunterAIVec = computeHunterAI(state.monsterPos, result.newPos)
      const newMonsterResult = applyVector(state.monsterPos, hunterAIVec, map)
      const newMonsterPos = newMonsterResult.hitObstacle ? state.monsterPos : newMonsterResult.newPos

      // Vérifier si le chasseur attrape le fugitif (distance Chebyshev ≤ 1)
      const caught = hunterCatchesFugitive(newMonsterPos, result.newPos)

      // Mise à jour de la traînée
      const newTrail = [
        ...state.trail.slice(-12),
        { x: state.playerPos.x, y: state.playerPos.y }
      ]

      if (caught) {
        setGameState(prev => ({
          ...prev,
          playerPos: result.newPos,
          monsterPos: newMonsterPos,
          lastVector: clampedVec,
          trail: newTrail,
          turn: prev.turn + 1,
        }))
        setPhase('gameover')
        return
      }

      setGameState(prev => ({
        ...prev,
        playerPos: result.newPos,
        monsterPos: newMonsterPos,
        lastVector: clampedVec,
        trail: newTrail,
        turn: prev.turn + 1,
        pulse: prev.pulse + 1,
      }))
      setPhase('execute')

    } else {
      // Mode multi : envoyer le mouvement
      if (!state.myTurn) return
      const result = applyVector(state.playerPos, clampedVec, map)

      if (result.hitObstacle) {
        triggerFlash()
        setPhase('execute')
        return
      }

      if (result.hitDeath) {
        // On est mort dans un gouffre — notifier l'adversaire
        multiplayer.send({ type: 'death' })
        setGameState(prev => ({ ...prev, playerPos: result.newPos, lastVector: clampedVec }))
        setPhase('death')
        return
      }

      // Fugitif atteint la sortie → victoire fugitif
      if (result.reachedExit && state.role === 'fugitive') {
        multiplayer.send({ type: 'win', reason: 'exit' })
        setGameState(prev => ({ ...prev, playerPos: result.newPos, multiWinner: 'me', multiWinReason: 'exit', lastVector: clampedVec }))
        setPhase('multiwin')
        return
      }

      // Chasseur attrape le fugitif → victoire chasseur
      if (state.role === 'hunter' && hunterCatchesFugitive(result.newPos, state.player2Pos)) {
        multiplayer.send({ type: 'win', reason: 'caught' })
        setGameState(prev => ({ ...prev, playerPos: result.newPos, multiWinner: 'me', multiWinReason: 'caught', lastVector: clampedVec }))
        setPhase('multiwin')
        return
      }

      const newTrail = [
        ...state.trail.slice(-12),
        { x: state.playerPos.x, y: state.playerPos.y }
      ]

      setGameState(prev => ({
        ...prev,
        playerPos: result.newPos,
        lastVector: clampedVec,
        trail: newTrail,
        myTurn: false,
      }))

      // Envoyer à l'adversaire
      multiplayer.send({ type: 'move', vec: clampedVec })
      setPhase('execute')
    }
  }, [triggerFlash, multiplayer])

  // ---------------------------------------------------------------------------
  // Restart
  // ---------------------------------------------------------------------------
  const handleRestart = useCallback(() => {
    multiplayer.disconnect()
    setGameState(null)
    setPhase('menu')
  }, [multiplayer])

  // ---------------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------------
  const map = MAPS[currentMap]

  // Flash obstacle : overlay rouge semi-transparent
  const flashOverlay = obstacleFlash ? (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(180,20,0,0.22)',
      pointerEvents: 'none',
      zIndex: 20,
      animation: 'none',
    }} />
  ) : null

  if (phase === 'menu') {
    return (
      <>
        {flashOverlay}
        <Menu
          onSolo={startSolo}
          onHost={startMultiHost}
          onJoin={joinMulti}
          peerState={{
            myId: multiplayer.myId,
            isConnected: multiplayer.isConnected,
            isHost: multiplayer.isHost,
          }}
          selectedMap={currentMap}
          onSelectMap={setCurrentMap}
        />
        {/* Bouton lancer multi si hôte connecté */}
        {multiplayer.isHost && multiplayer.isConnected && (
          <div style={{
            position: 'fixed',
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
          }}>
            <button
              style={{
                padding: '16px 36px',
                background: 'linear-gradient(180deg,#3d2010,#2a1508)',
                border: '2px solid #c8a050',
                borderRadius: '3px',
                color: '#e8c878',
                fontFamily: "'Creepster', cursive",
                fontSize: '22px',
                cursor: 'pointer',
                letterSpacing: '2px',
                boxShadow: '0 0 30px rgba(200,160,80,0.3)',
              }}
              onClick={launchMultiGame}
            >
              ⚡ LANCER LA PARTIE
            </button>
          </div>
        )}
      </>
    )
  }

  // Phase de jeu (execute, command, gameover, win, death, multiwin)
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {flashOverlay}

      {/* Canvas principal */}
      <GameCanvas
        gameState={gameState}
        currentMap={currentMap}
        phase={phase === 'command' ? 'execute' : phase}
        onRestart={handleRestart}
        onOpenCommand={() => {
          if (phase === 'execute') setPhase('command')
        }}
        roles={{
          player1: gameState?.role || 'fugitive',
          player2: gameState?.role === 'hunter' ? 'fugitive' : 'hunter',
        }}
      />

      {/* Panneau de commande (modal par-dessus le canvas) */}
      {phase === 'command' && gameState && (
        <CommandPanel
          playerPos={gameState.playerPos}
          turn={gameState.turn}
          myTurn={gameState.myTurn !== false}
          role={gameState.role || 'fugitive'}
          map={MAPS[currentMap]}
          onVectorSubmit={(vec) => {
            handleVectorSubmit(vec)
          }}
          onBack={() => setPhase('execute')}
        />
      )}
    </div>
  )
}
