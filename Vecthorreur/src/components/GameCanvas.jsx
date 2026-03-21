import React, { useRef, useEffect, useCallback } from 'react'
import { CanvasRenderer } from '../engine/CanvasRenderer.js'
import { MAPS } from '../data/maps.js'

/* ── Styles responsifs ────────────────────────────────────────────────────── */
const OV = {
  base: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Creepster', cursive",
    pointerEvents: 'none', zIndex: 5,
    padding: '16px', textAlign: 'center',
  },
  title: {
    fontSize: 'clamp(28px, 8vw, 64px)',
    textShadow: '3px 4px 0 #2a0000',
    marginBottom: '12px', lineHeight: 1.1,
  },
  subtitle: {
    fontFamily: "'IM Fell English', serif",
    fontStyle: 'italic',
    fontSize: 'clamp(14px, 3.5vw, 20px)',
    marginBottom: '24px',
  },
  btn: {
    pointerEvents: 'all',
    padding: 'clamp(10px, 2.5vw, 14px) clamp(20px, 5vw, 32px)',
    background: 'linear-gradient(180deg,#3d2010,#2a1508)',
    border: '2px solid #c8a050', borderRadius: '3px',
    color: '#e8c878', fontFamily: "'Creepster', cursive",
    fontSize: 'clamp(16px, 4vw, 20px)',
    cursor: 'pointer', letterSpacing: '1.5px',
    minHeight: '48px', minWidth: '140px',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  }
}

function Overlay({ bg, title, titleColor, subtitle, btnLabel, onRestart }) {
  return (
    <div style={{ ...OV.base, background: bg }}>
      <div style={{ ...OV.title, color: titleColor }}>{title}</div>
      <div style={{ ...OV.subtitle, color: '#a08040' }}>{subtitle}</div>
      <button style={OV.btn} onClick={onRestart}>{btnLabel}</button>
    </div>
  )
}

function MultiWinOverlay({ winner, winReason, onRestart }) {
  const iWon = winner === 'me'
  const texts = {
    exit:           iWon ? ['✦ FUGITIF VICTORIEUX ✦', 'Vous avez fui le manoir !']
                         : ['☠ FUGITIF ÉCHAPPÉ',      "L'adversaire a atteint la sortie..."],
    caught:         iWon ? ['🗡 CHASSEUR VICTORIEUX', 'Vous avez attrapé le fugitif !']
                         : ['☠ VOUS AVEZ ÉTÉ ATTRAPÉ', 'Le chasseur vous a eu...'],
    opponent_death: iWon ? ['✦ VICTOIRE ✦', 'Votre adversaire a chuté !']
                         : ['☠ DÉFAITE ☠',  'Votre adversaire a triomphé...'],
  }
  const [title, sub] = texts[winReason] || (iWon ? ['✦ VICTOIRE ✦', 'Gagné !'] : ['☠ DÉFAITE ☠', 'Perdu...'])
  return (
    <div style={{ ...OV.base, background: 'rgba(0,0,0,0.82)' }}>
      <div style={{ ...OV.title, color: iWon ? '#c8a050' : '#cc2200' }}>{title}</div>
      <div style={{ ...OV.subtitle, color: '#a08040' }}>{sub}</div>
      <button style={OV.btn} onClick={onRestart}>🏚 Menu principal</button>
    </div>
  )
}

/* ── Bouton principal du canvas ───────────────────────────────────────────── */
function OpenBookBtn({ onClick }) {
  return (
    <button
      style={{
        position: 'absolute',
        bottom: 'clamp(12px, 3vh, 24px)',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: 'clamp(10px, 2.5vh, 14px) clamp(18px, 5vw, 28px)',
        background: 'linear-gradient(180deg,#3d2010,#2a1508)',
        border: '2px solid #c8a050', borderRadius: '3px',
        color: '#e8c878', fontFamily: "'Creepster', cursive",
        fontSize: 'clamp(14px, 3.5vw, 18px)',
        cursor: 'pointer', letterSpacing: '1px',
        boxShadow: '0 0 20px rgba(200,160,80,0.2)',
        zIndex: 4, minHeight: '48px',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        whiteSpace: 'nowrap',
      }}
      onClick={onClick}
    >
      📖 Ouvrir le Livre des Sorts
    </button>
  )
}

/* ── Canvas principal ─────────────────────────────────────────────────────── */
export default function GameCanvas({
  gameState, currentMap, onCanvasReady, phase, onRestart, onOpenCommand, roles,
}) {
  const canvasRef    = useRef(null)
  const rendererRef  = useRef(null)
  const rafRef       = useRef(null)
  const stateRef     = useRef(gameState)
  const rolesRef     = useRef(roles)

  useEffect(() => { stateRef.current  = gameState }, [gameState])
  useEffect(() => { rolesRef.current  = roles      }, [roles])

  const map = MAPS[currentMap] || MAPS[0]

  const startLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const loop = (ts) => {
      const renderer = rendererRef.current
      const state    = stateRef.current
      if (renderer && state) {
        renderer.render(
          { ...state, timestamp: ts },
          map,
          map.palette.player1,
          state.gameMode === 'multi' ? map.palette.player2 : null,
          rolesRef.current
        )
      }
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
      if (W === 0 || H === 0) return
      canvas.width  = W
      canvas.height = H
      rendererRef.current = new CanvasRenderer(canvas, W, H)
    }
    resize()
    onCanvasReady?.()
    startLoop()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); observer.disconnect() }
  }, [startLoop, onCanvasReady])

  /* Swipe vers le haut → ouvre le livre (mobile) */
  const touchStartY = useRef(null)
  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY }
  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return
    const dy = touchStartY.current - e.changedTouches[0].clientY
    if (dy > 40 && phase === 'execute') onOpenCommand?.()
    touchStartY.current = null
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', touchAction: 'none' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />

      {phase === 'execute' && <OpenBookBtn onClick={onOpenCommand} />}

      {phase === 'gameover' && (
        <Overlay bg="rgba(0,0,0,0.82)" title="☠ GAME OVER ☠" titleColor="#cc2200"
          subtitle="Slappy vous a rattrapé..." btnLabel="🕯 Réessayer" onRestart={onRestart} />
      )}
      {phase === 'death' && (
        <Overlay bg="rgba(0,0,0,0.82)" title="💀 VOUS AVEZ CHUTÉ" titleColor="#cc2200"
          subtitle="Le gouffre vous a englouti..." btnLabel="🕯 Réessayer" onRestart={onRestart} />
      )}
      {phase === 'win' && (
        <Overlay bg="rgba(0,0,0,0.78)" title="✦ VICTOIRE ✦" titleColor="#c8a050"
          subtitle="Vous avez fui le manoir !" btnLabel="🏚 Rejouer" onRestart={onRestart} />
      )}
      {phase === 'multiwin' && gameState && (
        <MultiWinOverlay winner={gameState.multiWinner} winReason={gameState.multiWinReason} onRestart={onRestart} />
      )}
    </div>
  )
}
