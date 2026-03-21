import React, { useState, useEffect } from 'react'
import { MAPS } from '../data/maps.js'

const styles = {
  overlay: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, #1a1005 0%, #0d0a08 100%)',
    fontFamily: "'Special Elite', serif",
    overflow: 'auto',
  },
  parchment: {
    background: 'linear-gradient(160deg, #2a1e0e 0%, #1e150a 40%, #261a0c 70%, #1a1208 100%)',
    border: '3px solid #6b4a22',
    borderRadius: '4px',
    padding: '40px 48px',
    maxWidth: '520px',
    width: '92%',
    boxShadow: '0 0 40px rgba(200,160,80,0.12), inset 0 0 60px rgba(0,0,0,0.5)',
    position: 'relative',
    textAlign: 'center',
  },
  cornerDecor: {
    position: 'absolute',
    color: '#6b4a22',
    fontSize: '22px',
    lineHeight: 1,
  },
  title: {
    fontFamily: "'Creepster', cursive",
    fontSize: '58px',
    color: '#c8a050',
    textShadow: '0 0 20px rgba(200,160,80,0.4), 2px 3px 0 #3d2010, -1px -1px 0 #2a1408',
    marginBottom: '4px',
    letterSpacing: '3px',
    lineHeight: 1.1,
  },
  subtitle: {
    fontFamily: "'IM Fell English', serif",
    fontStyle: 'italic',
    fontSize: '16px',
    color: '#a08040',
    marginBottom: '32px',
    letterSpacing: '1px',
  },
  separator: {
    color: '#6b4a22',
    fontSize: '14px',
    margin: '20px 0',
    letterSpacing: '4px',
    userSelect: 'none',
  },
  btn: {
    display: 'block',
    width: '100%',
    padding: '13px 20px',
    marginBottom: '12px',
    background: 'linear-gradient(180deg, #3d2010 0%, #2a1508 100%)',
    border: '2px solid #c8a050',
    borderRadius: '3px',
    color: '#e8c878',
    fontFamily: "'Creepster', cursive",
    fontSize: '18px',
    letterSpacing: '1.5px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    textAlign: 'center',
  },
  btnHover: {
    background: 'linear-gradient(180deg, #5a3018 0%, #3d2010 100%)',
    boxShadow: '0 0 14px rgba(200,160,80,0.35)',
    color: '#ffd878',
    transform: 'translateY(-1px)',
  },
  multiSection: {
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid #3d2010',
    borderRadius: '3px',
    padding: '16px 20px',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontFamily: "'Creepster', cursive",
    color: '#a08040',
    fontSize: '15px',
    letterSpacing: '2px',
    marginBottom: '12px',
    textTransform: 'uppercase',
  },
  inputWrap: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  },
  input: {
    flex: 1,
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid #6b4a22',
    borderBottom: '2px solid #c8a050',
    borderRadius: '2px',
    color: '#e8c878',
    fontFamily: "'Special Elite', serif",
    fontSize: '13px',
    padding: '8px 10px',
    outline: 'none',
  },
  idDisplay: {
    background: 'rgba(0,0,0,0.4)',
    border: '1px dashed #6b4a22',
    borderRadius: '2px',
    padding: '8px 12px',
    color: '#c8a050',
    fontFamily: 'monospace',
    fontSize: '13px',
    letterSpacing: '2px',
    marginTop: '8px',
    wordBreak: 'break-all',
  },
  mapSelector: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    marginTop: '8px',
    flexWrap: 'wrap',
  },
  mapBtn: {
    padding: '8px 14px',
    background: '#1e1208',
    border: '1.5px solid #3d2010',
    borderRadius: '2px',
    color: '#a08040',
    fontFamily: "'Creepster', cursive",
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  mapBtnActive: {
    border: '1.5px solid #c8a050',
    color: '#e8c878',
    background: '#2a1808',
    boxShadow: '0 0 8px rgba(200,160,80,0.2)',
  },
  statusText: {
    color: '#887040',
    fontSize: '12px',
    fontFamily: "'Special Elite', serif",
    marginTop: '8px',
    fontStyle: 'italic',
  }
}

function HoverBtn({ style, children, onClick, disabled }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      style={{
        ...styles.btn,
        ...style,
        ...(hovered && !disabled ? styles.btnHover : {}),
        ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </button>
  )
}

export default function Menu({ onSolo, onHost, onJoin, peerState, selectedMap, onSelectMap }) {
  const [joinInput, setJoinInput] = useState('')
  const [titleFlicker, setTitleFlicker] = useState(1)

  useEffect(() => {
    let raf
    let last = 0
    const flicker = (ts) => {
      if (ts - last > 80 + Math.random() * 200) {
        setTitleFlicker(0.85 + Math.random() * 0.15)
        last = ts
      }
      raf = requestAnimationFrame(flicker)
    }
    raf = requestAnimationFrame(flicker)
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleHost = () => {
    onHost()
  }

  const handleJoin = () => {
    if (joinInput.trim()) {
      onJoin(joinInput.trim())
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.parchment}>
        {/* Coins décoratifs */}
        <span style={{ ...styles.cornerDecor, top: 10, left: 14 }}>✦</span>
        <span style={{ ...styles.cornerDecor, top: 10, right: 14 }}>✦</span>
        <span style={{ ...styles.cornerDecor, bottom: 10, left: 14 }}>✦</span>
        <span style={{ ...styles.cornerDecor, bottom: 10, right: 14 }}>✦</span>

        {/* Titre animé */}
        <div style={{ ...styles.title, opacity: titleFlicker }}>
          VectHorreur
        </div>
        <div style={styles.subtitle}>🔦 Fuis... ou chasse.</div>

        {/* Description du concept */}
        <div style={{ color: '#887040', fontSize: '12px', fontStyle: 'italic', marginBottom: '18px', lineHeight: 1.5 }}>
          Solo : fuis Slappy dans le noir.<br />
          1v1 : Chasseur contre Fugitif.
        </div>

        {/* Bouton solo */}
        <HoverBtn onClick={onSolo}>
          🕯 JOUER SEUL (Fuir Slappy)
        </HoverBtn>

        {/* Séparateur */}
        <div style={styles.separator}>─── ✦ ───</div>

        {/* Sélecteur de map */}
        <div style={styles.sectionTitle}>Choisir le lieu maudit</div>
        <div style={styles.mapSelector}>
          {MAPS.map(m => (
            <button
              key={m.id}
              style={{
                ...styles.mapBtn,
                ...(selectedMap === m.id ? styles.mapBtnActive : {}),
              }}
              onClick={() => onSelectMap(m.id)}
            >
              {m.name}
            </button>
          ))}
        </div>

        {/* Séparateur */}
        <div style={styles.separator}>─── ✦ ───</div>

        {/* Section multijoueur */}
        <div style={styles.multiSection}>
          <div style={styles.sectionTitle}>⚔ Mode 1v1 — Chasseur vs Fugitif</div>

          <HoverBtn
            onClick={handleHost}
            disabled={!!peerState.myId}
            style={{ marginBottom: '8px' }}
          >
            🏚 HÉBERGER UNE PARTIE
          </HoverBtn>

          {/* Badge rôle hôte */}
          {peerState.myId && (
            <div>
              <div style={{
                display: 'inline-block',
                background: 'rgba(120,0,0,0.35)',
                border: '1px solid #882200',
                borderRadius: '3px',
                padding: '4px 12px',
                color: '#ff6644',
                fontSize: '13px',
                fontFamily: "'Creepster', cursive",
                letterSpacing: '1px',
                marginBottom: '8px',
              }}>
                🗡 Vous serez le CHASSEUR
              </div>
              <div style={styles.statusText}>Votre code d'invocation :</div>
              <div style={styles.idDisplay}>{peerState.myId}</div>
              {peerState.isConnected
                ? <div style={{ ...styles.statusText, color: '#88cc66' }}>✓ Un fugitif a rejoint les ténèbres</div>
                : <div style={styles.statusText}>En attente d'un fugitif...</div>
              }
            </div>
          )}

          <div style={{ ...styles.sectionTitle, marginTop: '16px' }}>👻 Rejoindre une partie</div>

          {/* Badge rôle guest */}
          {peerState.isConnected && !peerState.isHost && (
            <div style={{
              display: 'inline-block',
              background: 'rgba(0,60,0,0.35)',
              border: '1px solid #226622',
              borderRadius: '3px',
              padding: '4px 12px',
              color: '#66cc66',
              fontSize: '13px',
              fontFamily: "'Creepster', cursive",
              letterSpacing: '1px',
              marginBottom: '8px',
            }}>
              🏃 Vous serez le FUGITIF
            </div>
          )}

          <div style={styles.inputWrap}>
            <input
              style={styles.input}
              placeholder="Code du chasseur..."
              value={joinInput}
              onChange={e => setJoinInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <HoverBtn
              style={{ width: 'auto', padding: '8px 14px', marginBottom: 0, fontSize: '14px' }}
              onClick={handleJoin}
              disabled={!joinInput.trim()}
            >
              Entrer
            </HoverBtn>
          </div>
          {peerState.isConnected && !peerState.isHost && (
            <div style={{ ...styles.statusText, color: '#88cc66' }}>✓ Connecté — prêt à fuir !</div>
          )}
        </div>

        <div style={{ color: '#4a3520', fontSize: '11px', marginTop: '8px', fontStyle: 'italic' }}>
          "Nul ne ressort indemne du Manoir..."
        </div>
      </div>
    </div>
  )
}
