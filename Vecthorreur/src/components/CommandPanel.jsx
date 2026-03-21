import React, { useState, useRef, useEffect } from 'react'

const S = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    fontFamily: "'Special Elite', serif",
    padding: '16px',
    overflow: 'auto',
  },
  panel: {
    background: 'linear-gradient(160deg, #2a1e0e 0%, #1e150a 60%, #261a0c 100%)',
    border: '2px solid #6b4a22',
    borderRadius: '4px',
    padding: '24px 28px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 0 40px rgba(0,0,0,0.8), inset 0 0 30px rgba(0,0,0,0.4)',
    position: 'relative',
  },
  bookTitle: {
    fontFamily: "'Creepster', cursive",
    fontSize: '22px',
    color: '#c8a050',
    textAlign: 'center',
    marginBottom: '4px',
    textShadow: '1px 2px 0 #3d2010',
    letterSpacing: '1px',
  },
  bookSubtitle: {
    fontFamily: "'IM Fell English', serif",
    fontStyle: 'italic',
    color: '#887040',
    fontSize: '12px',
    textAlign: 'center',
    marginBottom: '18px',
  },
  separator: {
    color: '#6b4a22',
    fontSize: '12px',
    textAlign: 'center',
    margin: '14px 0',
    letterSpacing: '3px',
  },
  chapter: {
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid #3d2010',
    borderRadius: '3px',
    padding: '12px 16px',
    marginBottom: '10px',
  },
  chapterTitle: {
    fontFamily: "'Creepster', cursive",
    color: '#a08040',
    fontSize: '14px',
    letterSpacing: '1.5px',
    marginBottom: '10px',
    textTransform: 'uppercase',
  },
  row: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  label: {
    color: '#a08040',
    fontSize: '13px',
    minWidth: '110px',
    fontFamily: "'Special Elite', serif",
  },
  input: {
    width: '60px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1.5px solid #c8a050',
    color: '#e8c878',
    fontFamily: "'Special Elite', serif",
    fontSize: '15px',
    padding: '3px 4px',
    outline: 'none',
    textAlign: 'center',
  },
  smallInput: {
    width: '50px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1.5px solid #7755aa',
    color: '#c8a0e0',
    fontFamily: "'Special Elite', serif",
    fontSize: '14px',
    padding: '3px 4px',
    outline: 'none',
    textAlign: 'center',
  },
  btn: {
    display: 'block',
    width: '100%',
    padding: '10px',
    background: 'linear-gradient(180deg, #3d2010 0%, #2a1508 100%)',
    border: '1.5px solid #c8a050',
    borderRadius: '2px',
    color: '#e8c878',
    fontFamily: "'Creepster', cursive",
    fontSize: '15px',
    letterSpacing: '1px',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'all 0.15s',
  },
  btnSecondary: {
    borderColor: '#7755aa',
    color: '#c8a0e0',
  },
  previewWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '8px',
  },
  backBtn: {
    display: 'block',
    width: '100%',
    padding: '8px',
    background: 'transparent',
    border: '1px solid #4a3520',
    borderRadius: '2px',
    color: '#887040',
    fontFamily: "'Creepster', cursive",
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '8px',
    letterSpacing: '1px',
  },
  turnInfo: {
    textAlign: 'center',
    color: '#887040',
    fontSize: '12px',
    marginBottom: '12px',
    fontStyle: 'italic',
  },
  posInfo: {
    textAlign: 'center',
    color: '#a08040',
    fontSize: '12px',
    marginBottom: '6px',
  }
}

// Mini canvas d'aperçu du vecteur
function VectorPreview({ playerPos, vec }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = 150, H = 150

    ctx.fillStyle = '#1a1208'
    ctx.fillRect(0, 0, W, H)

    // Grille
    const cellPx = 12
    const cx = W / 2, cy = H / 2

    ctx.strokeStyle = 'rgba(100,80,40,0.3)'
    ctx.lineWidth = 0.5
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath()
      ctx.moveTo(cx + i * cellPx, 0)
      ctx.lineTo(cx + i * cellPx, H)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, cy + i * cellPx)
      ctx.lineTo(W, cy + i * cellPx)
      ctx.stroke()
    }

    // Axes
    ctx.strokeStyle = 'rgba(160,120,60,0.6)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, cy)
    ctx.lineTo(W, cy)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx, 0)
    ctx.lineTo(cx, H)
    ctx.stroke()

    // Labels axes
    ctx.font = '9px Special Elite, serif'
    ctx.fillStyle = 'rgba(160,120,60,0.8)'
    ctx.textAlign = 'center'
    ctx.fillText('x →', W - 10, cy - 4)
    ctx.textAlign = 'left'
    ctx.fillText('↑ y', cx + 4, 10)

    // Position joueur
    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#c8a050'
    ctx.fill()

    // Vecteur
    if (vec && (vec.x !== 0 || vec.y !== 0)) {
      const tx = cx + vec.x * cellPx
      const ty = cy - vec.y * cellPx  // y inversé pour affichage

      ctx.strokeStyle = '#d4a050'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(tx, ty)
      ctx.stroke()
      ctx.setLineDash([])

      // Pointe
      const angle = Math.atan2(ty - cy, tx - cx)
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(tx - 8 * Math.cos(angle - 0.4), ty - 8 * Math.sin(angle - 0.4))
      ctx.lineTo(tx - 8 * Math.cos(angle + 0.4), ty - 8 * Math.sin(angle + 0.4))
      ctx.closePath()
      ctx.fillStyle = '#d4a050'
      ctx.fill()

      // Point d'arrivée
      ctx.beginPath()
      ctx.arc(tx, ty, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#ffd878'
      ctx.fill()

      // Texte vecteur
      ctx.font = 'bold 10px Special Elite, serif'
      ctx.fillStyle = '#c8a050'
      ctx.textAlign = 'center'
      ctx.fillText(`(${vec.x}, ${vec.y})`, cx, H - 6)
    }
  }, [vec])

  return <canvas ref={canvasRef} width={150} height={150} style={{ border: '1px solid #3d2010', borderRadius: '2px' }} />
}

function NumInput({ value, onChange, color = '#c8a050', min = -5, max = 5 }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={e => {
        const v = parseInt(e.target.value) || 0
        onChange(Math.max(min, Math.min(max, v)))
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...S.input,
        borderBottomColor: focused ? '#ffd878' : color,
        boxShadow: focused ? `0 2px 8px rgba(200,160,80,0.2)` : 'none',
      }}
    />
  )
}

export default function CommandPanel({ playerPos, turn, myTurn, role, map, onVectorSubmit, onBack }) {
  const isHunter = role === 'hunter'
  // Chapitre I — vecteur simple
  const [vx, setVx] = useState(0)
  const [vy, setVy] = useState(0)

  // Chapitre II — combinaison u + v
  const [ux, setUx] = useState(0)
  const [uy, setUy] = useState(0)
  const [vx2, setVx2] = useState(0)
  const [vy2, setVy2] = useState(0)

  // Chapitre III — amplification k * u
  const [k, setK] = useState(1)
  const [kux, setKux] = useState(1)
  const [kuy, setKuy] = useState(0)

  const [activeChapter, setActiveChapter] = useState(1)

  const computedVec = (() => {
    if (activeChapter === 1) return { x: vx, y: vy }
    if (activeChapter === 2) return { x: ux + vx2, y: uy + vy2 }
    if (activeChapter === 3) return { x: Math.round(k * kux), y: Math.round(k * kuy) }
    return { x: 0, y: 0 }
  })()

  const handleSubmit = () => {
    if (!myTurn) return
    onVectorSubmit(computedVec)
  }

  if (!myTurn) {
    return (
      <div style={S.overlay}>
        <div style={S.panel}>
          <div style={S.bookTitle}>📖 Livre des Déplacements</div>
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#887040', fontStyle: 'italic' }}>
            L'adversaire médite sur son prochain sortilège...<br />
            <span style={{ fontSize: '28px', display: 'block', marginTop: '16px' }}>⏳</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.overlay}>
      <div style={S.panel}>
        <div style={S.bookTitle}>📖 Livre des Déplacements</div>
        <div style={S.bookSubtitle}>Invocations & Sortilèges de Mouvement</div>

        {/* Badge de rôle */}
        {role && (
          <div style={{
            display: 'inline-block',
            background: isHunter ? 'rgba(120,0,0,0.35)' : 'rgba(0,60,0,0.35)',
            border: `1px solid ${isHunter ? '#882200' : '#226622'}`,
            borderRadius: '3px',
            padding: '4px 14px',
            color: isHunter ? '#ff6644' : '#66cc66',
            fontSize: '13px',
            fontFamily: "'Creepster', cursive",
            letterSpacing: '1.5px',
            marginBottom: '10px',
          }}>
            {isHunter ? '🗡 CHASSEUR' : '🏃 FUGITIF'}
          </div>
        )}

        <div style={S.turnInfo}>Tour {turn} — Choisissez votre sort</div>
        <div style={S.posInfo}>Position actuelle : ({playerPos.x}, {playerPos.y})</div>

        {/* Indice de sortie pour le fugitif uniquement */}
        {!isHunter && map && map.exit && (
          <div style={{ color: '#c8a050', fontSize: '11px', textAlign: 'center', marginBottom: '8px', fontStyle: 'italic' }}>
            ✦ Sortie vers ({Math.round((map.exit.x1 + map.exit.x2) / 2)}, {Math.round((map.exit.y1 + map.exit.y2) / 2)})
          </div>
        )}

        {/* Sélecteur de chapitre */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {[1, 2, 3].map(ch => (
            <button
              key={ch}
              onClick={() => setActiveChapter(ch)}
              style={{
                flex: 1,
                padding: '6px 4px',
                background: activeChapter === ch ? '#3d2010' : 'transparent',
                border: `1.5px solid ${activeChapter === ch ? '#c8a050' : '#3d2010'}`,
                borderRadius: '2px',
                color: activeChapter === ch ? '#e8c878' : '#6b4a22',
                fontFamily: "'Creepster', cursive",
                fontSize: '12px',
                cursor: 'pointer',
                letterSpacing: '0.5px',
              }}
            >
              Chap. {ch}
            </button>
          ))}
        </div>

        {/* Chapitre I — Déplacement simple */}
        {activeChapter === 1 && (
          <div style={S.chapter}>
            <div style={S.chapterTitle}>⚗ Chapitre I — Déplacement Simple</div>
            <div style={S.row}>
              <span style={S.label}>Composante X :</span>
              <NumInput value={vx} onChange={setVx} />
            </div>
            <div style={S.row}>
              <span style={S.label}>Composante Y :</span>
              <NumInput value={vy} onChange={setVy} />
            </div>
            <div style={{ color: '#887040', fontSize: '11px', marginTop: '4px' }}>
              Vecteur résultant : ({vx}, {vy})
            </div>
          </div>
        )}

        {/* Chapitre II — Combinaison u + v */}
        {activeChapter === 2 && (
          <div style={S.chapter}>
            <div style={S.chapterTitle}>🔮 Chapitre II — Combiner (u⃗ + v⃗)</div>
            <div style={S.row}>
              <span style={{ ...S.label, minWidth: '60px' }}>u⃗ = (</span>
              <NumInput value={ux} onChange={setUx} color='#7755aa' />
              <span style={{ color: '#887040' }}>,</span>
              <NumInput value={uy} onChange={setUy} color='#7755aa' />
              <span style={{ color: '#887040' }}>)</span>
            </div>
            <div style={S.row}>
              <span style={{ ...S.label, minWidth: '60px' }}>v⃗ = (</span>
              <NumInput value={vx2} onChange={setVx2} color='#7755aa' />
              <span style={{ color: '#887040' }}>,</span>
              <NumInput value={vy2} onChange={setVy2} color='#7755aa' />
              <span style={{ color: '#887040' }}>)</span>
            </div>
            <div style={{ color: '#887040', fontSize: '11px', marginTop: '4px' }}>
              u⃗ + v⃗ = ({ux + vx2}, {uy + vy2})
            </div>
          </div>
        )}

        {/* Chapitre III — Amplification k × u */}
        {activeChapter === 3 && (
          <div style={S.chapter}>
            <div style={S.chapterTitle}>⚡ Chapitre III — Amplifier (k × u⃗)</div>
            <div style={S.row}>
              <span style={{ ...S.label, minWidth: '60px' }}>k =</span>
              <NumInput value={k} onChange={setK} min={-5} max={5} color='#cc8822' />
            </div>
            <div style={S.row}>
              <span style={{ ...S.label, minWidth: '60px' }}>u⃗ = (</span>
              <NumInput value={kux} onChange={setKux} color='#cc8822' />
              <span style={{ color: '#887040' }}>,</span>
              <NumInput value={kuy} onChange={setKuy} color='#cc8822' />
              <span style={{ color: '#887040' }}>)</span>
            </div>
            <div style={{ color: '#887040', fontSize: '11px', marginTop: '4px' }}>
              k × u⃗ = ({Math.round(k * kux)}, {Math.round(k * kuy)})
            </div>
          </div>
        )}

        {/* Aperçu du vecteur */}
        <div style={S.separator}>─── ✦ ───</div>
        <div style={S.previewWrap}>
          <VectorPreview playerPos={playerPos} vec={computedVec} />
        </div>

        {/* Bouton invoquer */}
        <button
          style={S.btn}
          onClick={handleSubmit}
          onMouseEnter={e => { e.target.style.background = 'linear-gradient(180deg,#5a3018,#3d2010)'; e.target.style.boxShadow = '0 0 14px rgba(200,160,80,0.3)' }}
          onMouseLeave={e => { e.target.style.background = 'linear-gradient(180deg,#3d2010,#2a1508)'; e.target.style.boxShadow = 'none' }}
        >
          ✨ Invoquer le Vecteur
        </button>

        {/* Bouton retour */}
        <button style={S.backBtn} onClick={onBack}>
          👁 Observer la scène
        </button>
      </div>
    </div>
  )
}
