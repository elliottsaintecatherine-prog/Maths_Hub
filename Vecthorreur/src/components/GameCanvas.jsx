import React, { useRef, useEffect, useCallback } from 'react'
import { CanvasRenderer } from '../engine/CanvasRenderer.js'
import { MAPS } from '../data/maps.js'

const OVERLAY_STYLES = {
  base: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Creepster', cursive",
    pointerEvents: 'none',
    zIndex: 5,
  },
  title: {
    fontSize: '64px',
    textShadow: '3px 4px 0 #2a0000',
    marginBottom: '16px',
  },
  subtitle: {
    fontFamily: "'IM Fell English', serif",
    fontStyle: 'italic',
    fontSize: '20px',
    marginBottom: '32px',
  },
  btn: {
    pointerEvents: 'all',
    padding: '14px 32px',
    background: 'linear-gradient(180deg,#3d2010,#2a1508)',
    border: '2px solid #c8a050',
    borderRadius: '3px',
    color: '#e8c878',
    fontFamily: "'Creepster', cursive",
    fontSize: '20px',
    cursor: 'pointer',
    letterSpacing: '1.5px',
  }
}

function GameOverOverlay({ onRestart }) {
  return (
    <div style={{ ...OVERLAY_STYLES.base, background: 'rgba(0,0,0,0.8)' }}>
      <div style={{ ...OVERLAY_STYLES.title, color: '#cc2200' }}>☠ GAME OVER ☠</div>
      <div style={{ ...OVERLAY_STYLES.subtitle, color: '#884422' }}>Slappy vous a rattrapé...</div>
      <button style={OVERLAY_STYLES.btn} onClick={onRestart}>
        🕯 Réessayer
      </button>
    </div>
  )
}

function WinOverlay({ onRestart }) {
  return (
    <div style={{ ...OVERLAY_STYLES.base, background: 'rgba(0,0,0,0.75)' }}>
      <div style={{ ...OVERLAY_STYLES.title, color: '#c8a050' }}>✦ VICTOIRE ✦</div>
      <div style={{ ...OVERLAY_STYLES.subtitle, color: '#a08040' }}>Vous avez fui le manoir !</div>
      <button style={OVERLAY_STYLES.btn} onClick={onRestart}>
        🏚 Rejouer
      </button>
    </div>
  )
}

function DeathZoneOverlay({ onRestart }) {
  return (
    <div style={{ ...OVERLAY_STYLES.base, background: 'rgba(0,0,0,0.8)' }}>
      <div style={{ ...OVERLAY_STYLES.title, color: '#cc2200' }}>💀 VOUS AVEZ CHUTÉ</div>
      <div style={{ ...OVERLAY_STYLES.subtitle, color: '#884422' }}>Le gouffre vous a englouti...</div>
      <button style={OVERLAY_STYLES.btn} onClick={onRestart}>
        🕯 Réessayer
      </button>
    </div>
  )
}

function MultiWinOverlay({ winner, winReason, playerRole, onRestart }) {
  const iWon = winner === 'me'
  let titleText, subText

  if (iWon) {
    if (winReason === 'exit') {
      titleText = '✦ FUGITIF VICTORIEUX ✦'
      subText = 'Vous avez fui le manoir !'
    } else if (winReason === 'caught') {
      titleText = '🗡 CHASSEUR VICTORIEUX'
      subText = 'Vous avez attrapé le fugitif !'
    } else if (winReason === 'opponent_death') {
      titleText = '✦ VICTOIRE ✦'
      subText = 'Votre adversaire a chuté dans le gouffre !'
    } else {
      titleText = '✦ VICTOIRE ✦'
      subText = 'Vous avez gagné !'
    }
  } else {
    if (winReason === 'exit') {
      titleText = '☠ FUGITIF ÉCHAPPÉ'
      subText = 'L\'adversaire a atteint la sortie...'
    } else if (winReason === 'caught') {
      titleText = '☠ VOUS AVEZ ÉTÉ ATTRAPÉ'
      subText = 'Le chasseur vous a eu...'
    } else if (winReason === 'opponent_death') {
      titleText = '☠ DÉFAITE ☠'
      subText = 'Votre adversaire a triomphé...'
    } else {
      titleText = '☠ DÉFAITE ☠'
      subText = "L'adversaire a gagné !"
    }
  }

  return (
    <div style={{ ...OVERLAY_STYLES.base, background: 'rgba(0,0,0,0.8)' }}>
      <div style={{ ...OVERLAY_STYLES.title, color: iWon ? '#c8a050' : '#cc2200' }}>
        {titleText}
      </div>
      <div style={{ ...OVERLAY_STYLES.subtitle, color: '#a08040' }}>
        {subText}
      </div>
      <button style={OVERLAY_STYLES.btn} onClick={onRestart}>
        🏚 Menu principal
      </button>
    </div>
  )
}

export default function GameCanvas({
  gameState,
  currentMap,
  onCanvasReady,
  phase,
  onRestart,
  onOpenCommand,
  roles,
}) {
  const canvasRef = useRef(null)
  const rendererRef = useRef(null)
  const rafRef = useRef(null)
  const stateRef = useRef(gameState)

  // Sync state ref pour la boucle RAF
  useEffect(() => {
    stateRef.current = gameState
  }, [gameState])

  const map = MAPS[currentMap] || MAPS[0]

  const rolesRef = useRef(roles)
  useEffect(() => { rolesRef.current = roles }, [roles])

  const startLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const loop = (ts) => {
      const renderer = rendererRef.current
      const state = stateRef.current
      if (!renderer || !state) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const skin1 = map.palette.player1
      const skin2 = map.palette.player2

      renderer.render(
        { ...state, timestamp: ts },
        map,
        skin1,
        state.gameMode === 'multi' ? skin2 : null,
        rolesRef.current
      )

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
  }, [map])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      canvas.width = W
      canvas.height = H
      rendererRef.current = new CanvasRenderer(canvas, W, H)
    }

    resize()
    onCanvasReady?.()
    startLoop()

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      observer.disconnect()
    }
  }, [startLoop, onCanvasReady])

  const containerStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
    cursor: phase === 'execute' ? 'default' : 'pointer',
  }

  return (
    <div style={containerStyle}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
        onClick={phase === 'execute' ? onOpenCommand : undefined}
      />

      {/* Bouton ouvrir le livre (phase execute/command) */}
      {phase === 'execute' && (
        <button
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 28px',
            background: 'linear-gradient(180deg,#3d2010,#2a1508)',
            border: '2px solid #c8a050',
            borderRadius: '3px',
            color: '#e8c878',
            fontFamily: "'Creepster', cursive",
            fontSize: '17px',
            cursor: 'pointer',
            letterSpacing: '1px',
            boxShadow: '0 0 20px rgba(200,160,80,0.2)',
            zIndex: 4,
          }}
          onClick={onOpenCommand}
        >
          📖 Ouvrir le Livre des Sorts
        </button>
      )}

      {/* Overlays de fin */}
      {phase === 'gameover' && <GameOverOverlay onRestart={onRestart} />}
      {phase === 'death' && <DeathZoneOverlay onRestart={onRestart} />}
      {phase === 'win' && <WinOverlay onRestart={onRestart} />}
      {phase === 'multiwin' && (
        <MultiWinOverlay
          winner={gameState.multiWinner}
          winReason={gameState.multiWinReason}
          playerRole={gameState.role}
          onRestart={onRestart}
        />
      )}
    </div>
  )
}
