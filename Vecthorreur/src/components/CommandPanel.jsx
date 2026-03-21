import React, { useState, useRef, useEffect } from 'react'

/* ── Composant stepper tactile ────────────────────────────────────────────── */
function StepInput({ value, onChange, color = '#c8a050', min = -5, max = 5 }) {
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))

  const btnStyle = {
    width: 'clamp(36px, 9vw, 44px)',
    height: 'clamp(36px, 9vw, 44px)',
    background: 'rgba(0,0,0,0.35)',
    border: `1.5px solid ${color}44`,
    borderRadius: '3px',
    color,
    fontSize: 'clamp(18px, 4vw, 22px)',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  }

  const valStyle = {
    width: 'clamp(44px, 11vw, 56px)',
    textAlign: 'center',
    color: '#e8c878',
    fontFamily: "'Special Elite', serif",
    fontSize: 'clamp(18px, 4.5vw, 22px)',
    fontWeight: 'bold',
    background: 'transparent',
    border: 'none',
    borderBottom: `2px solid ${color}`,
    outline: 'none',
    padding: '2px 0',
    touchAction: 'manipulation',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <button style={btnStyle} onClick={dec} aria-label="diminuer">−</button>
      <input
        type="number"
        inputMode="numeric"
        style={valStyle}
        value={value}
        min={min} max={max}
        onChange={e => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)))
        }}
      />
      <button style={btnStyle} onClick={inc} aria-label="augmenter">+</button>
    </div>
  )
}

/* ── Mini-canvas d'aperçu ─────────────────────────────────────────────────── */
function Preview({ pos, vec }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#120d06'
    ctx.fillRect(0, 0, W, H)

    const cx = W / 2 - pos.x * 5, cy = H / 2 - pos.y * 5
    const scale = 5

    // Grille légère
    ctx.strokeStyle = '#3d2010'
    ctx.lineWidth = 0.5
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(cx + i * scale, 0); ctx.lineTo(cx + i * scale, H); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, cy + i * scale); ctx.lineTo(W, cy + i * scale); ctx.stroke()
    }

    // Position joueur
    const px = cx + pos.x * scale, py = cy + pos.y * scale
    ctx.fillStyle = '#c8a050'
    ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill()

    // Flèche vecteur
    if (vec.x !== 0 || vec.y !== 0) {
      const ex = px + vec.x * scale, ey = py + vec.y * scale
      ctx.strokeStyle = '#c8a050'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 3])
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke()
      ctx.setLineDash([])

      const dx = ex - px, dy = ey - py, len = Math.hypot(dx, dy)
      if (len > 0) {
        const ux = dx / len, uy = dy / len, h = 8
        ctx.fillStyle = '#c8a050'
        ctx.beginPath()
        ctx.moveTo(ex, ey)
        ctx.lineTo(ex - ux * h + uy * h * 0.4, ey - uy * h - ux * h * 0.4)
        ctx.lineTo(ex - ux * h - uy * h * 0.4, ey - uy * h + ux * h * 0.4)
        ctx.closePath(); ctx.fill()
      }

      // Destination
      ctx.fillStyle = '#88cc6688'
      ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.fill()
    }
  }, [pos, vec])

  return (
    <canvas
      ref={canvasRef}
      width={140} height={140}
      style={{
        display: 'block',
        margin: '0 auto',
        border: '1px solid #3d2010',
        borderRadius: '2px',
        background: '#120d06',
        width: 'clamp(100px, 30vw, 140px)',
        height: 'clamp(100px, 30vw, 140px)',
      }}
    />
  )
}

/* ── Bouton principal ─────────────────────────────────────────────────────── */
function CastBtn({ onClick, disabled, children, color = '#c8a050' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: 'clamp(10px, 2.5vw, 14px)',
        marginTop: '8px',
        background: disabled ? '#1a1208' : 'linear-gradient(180deg,#3d2010,#2a1508)',
        border: `2px solid ${disabled ? '#3d2010' : color}`,
        borderRadius: '3px',
        color: disabled ? '#5a4030' : '#e8c878',
        fontFamily: "'Creepster', cursive",
        fontSize: 'clamp(14px, 3.5vw, 18px)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        letterSpacing: '1px',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        minHeight: '44px',
      }}
    >
      {children}
    </button>
  )
}

/* ── Panneau principal ────────────────────────────────────────────────────── */
export default function CommandPanel({ playerPos, turn, myTurn, role, onVectorSubmit, onBack }) {
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)
  const [ux, setUx] = useState(1)
  const [uy, setUy] = useState(0)
  const [vx, setVx] = useState(0)
  const [vy, setVy] = useState(1)
  const [k, setK] = useState(2)
  const [kx, setKx] = useState(1)
  const [ky, setKy] = useState(0)

  const isHunter = role === 'hunter'
  const canPlay = myTurn !== false

  const labelStyle = {
    color: '#a08040',
    fontSize: 'clamp(12px, 3vw, 13px)',
    fontFamily: "'Special Elite', serif",
    minWidth: 'clamp(70px, 18vw, 110px)',
    flexShrink: 0,
  }

  const chapterStyle = {
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid #3d2010',
    borderRadius: '3px',
    padding: 'clamp(8px, 2vw, 12px) clamp(10px, 2.5vw, 16px)',
    marginBottom: '8px',
  }

  const chTitleStyle = {
    fontFamily: "'Creepster', cursive",
    color: '#a08040',
    fontSize: 'clamp(12px, 3vw, 14px)',
    letterSpacing: '1px',
    marginBottom: '8px',
    textTransform: 'uppercase',
  }

  const rowStyle = {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap',
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      fontFamily: "'Special Elite', serif",
      padding: 'clamp(8px, 2vw, 16px)',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{
        background: 'linear-gradient(160deg,#2a1e0e,#1e150a 60%,#261a0c)',
        border: '2px solid #6b4a22',
        borderRadius: '4px',
        padding: 'clamp(16px, 4vw, 24px) clamp(14px, 3.5vw, 28px)',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 0 40px rgba(0,0,0,0.8)',
        position: 'relative',
        maxHeight: '95dvh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>

        {/* Titre */}
        <div style={{
          fontFamily: "'Creepster', cursive",
          fontSize: 'clamp(18px, 5vw, 24px)',
          color: '#c8a050',
          textAlign: 'center',
          marginBottom: '2px',
          letterSpacing: '1px',
        }}>
          📖 Livre des Déplacements
        </div>
        <div style={{
          fontFamily: "'IM Fell English', serif",
          fontStyle: 'italic',
          color: '#887040',
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          textAlign: 'center',
          marginBottom: '12px',
        }}>
          Tour {turn} — pos. ({playerPos?.x ?? 0}, {playerPos?.y ?? 0})
        </div>

        {/* Badge rôle */}
        {role && (
          <div style={{
            textAlign: 'center',
            marginBottom: '10px',
          }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 14px',
              borderRadius: '3px',
              fontFamily: "'Creepster', cursive",
              fontSize: 'clamp(13px, 3.5vw, 15px)',
              letterSpacing: '1px',
              background: isHunter ? 'rgba(120,0,0,0.35)' : 'rgba(0,60,0,0.35)',
              border: `1px solid ${isHunter ? '#882200' : '#226622'}`,
              color: isHunter ? '#ff6644' : '#66cc66',
            }}>
              {isHunter ? '🗡 CHASSEUR' : '🏃 FUGITIF'}
            </span>
          </div>
        )}

        {!canPlay && (
          <div style={{
            textAlign: 'center',
            color: '#887040',
            fontStyle: 'italic',
            fontSize: 'clamp(12px, 3vw, 14px)',
            marginBottom: '10px',
          }}>
            ⌛ En attente de l'adversaire...
          </div>
        )}

        {/* Aperçu */}
        <Preview pos={playerPos ?? { x: 0, y: 0 }} vec={{ x, y }} />

        <div style={{ color: '#6b4a22', fontSize: '12px', textAlign: 'center', margin: '10px 0', letterSpacing: '3px' }}>
          ─── ✦ ───
        </div>

        {/* Chapitre I — déplacement simple */}
        <div style={chapterStyle}>
          <div style={chTitleStyle}>I — Invoquer le Vecteur</div>
          <div style={rowStyle}>
            <span style={labelStyle}>Composante X :</span>
            <StepInput value={x} onChange={setX} />
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Composante Y :</span>
            <StepInput value={y} onChange={setY} />
          </div>
          <CastBtn
            disabled={!canPlay || (x === 0 && y === 0)}
            onClick={() => onVectorSubmit({ x, y })}
          >
            ✨ Invoquer le Vecteur ({x} ; {y})
          </CastBtn>
        </div>

        {/* Chapitre II — combinaison u+v */}
        <div style={chapterStyle}>
          <div style={chTitleStyle}>II — Combiner (u⃗ + v⃗)</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ ...labelStyle, marginBottom: '4px' }}>u⃗</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ ...labelStyle, minWidth: '20px' }}>x</span>
                  <StepInput value={ux} onChange={setUx} color="#aa88cc" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ ...labelStyle, minWidth: '20px' }}>y</span>
                  <StepInput value={uy} onChange={setUy} color="#aa88cc" />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: '#6b4a22', fontSize: '22px', paddingTop: '16px' }}>+</div>
            <div>
              <div style={{ ...labelStyle, marginBottom: '4px' }}>v⃗</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ ...labelStyle, minWidth: '20px' }}>x</span>
                  <StepInput value={vx} onChange={setVx} color="#aa88cc" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ ...labelStyle, minWidth: '20px' }}>y</span>
                  <StepInput value={vy} onChange={setVy} color="#aa88cc" />
                </div>
              </div>
            </div>
          </div>
          <CastBtn
            disabled={!canPlay || (ux + vx === 0 && uy + vy === 0)}
            onClick={() => onVectorSubmit({ x: ux + vx, y: uy + vy })}
            color="#aa88cc"
          >
            🔮 Fusionner ({ux + vx} ; {uy + vy})
          </CastBtn>
        </div>

        {/* Chapitre III — amplification */}
        <div style={chapterStyle}>
          <div style={chTitleStyle}>III — Amplifier (k × u⃗)</div>
          <div style={rowStyle}>
            <span style={labelStyle}>Scalaire k :</span>
            <StepInput value={k} onChange={setK} min={-5} max={5} color="#cc8844" />
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>u⃗ x :</span>
            <StepInput value={kx} onChange={setKx} color="#cc8844" />
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>u⃗ y :</span>
            <StepInput value={ky} onChange={setKy} color="#cc8844" />
          </div>
          <CastBtn
            disabled={!canPlay || (k * kx === 0 && k * ky === 0)}
            onClick={() => onVectorSubmit({ x: k * kx, y: k * ky })}
            color="#cc8844"
          >
            ⚡ Amplifier ({k * kx} ; {k * ky})
          </CastBtn>
        </div>

        {/* Retour */}
        <button
          onClick={onBack}
          style={{
            width: '100%',
            marginTop: '6px',
            padding: 'clamp(8px, 2vw, 11px)',
            background: 'transparent',
            border: '1px solid #3d2010',
            borderRadius: '3px',
            color: '#6b4a22',
            fontFamily: "'Special Elite', serif",
            fontSize: 'clamp(12px, 3vw, 13px)',
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            minHeight: '44px',
          }}
        >
          👁 Observer la scène
        </button>
      </div>
    </div>
  )
}
