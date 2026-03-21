/**
 * CanvasRenderer.js — Rendu isométrique 2.5D thème Manoir de la Terreur
 * Aucun neon, aucun cyber. Brun, or vieilli, vert fantôme, violet sombre.
 */

const CELL = 28

export class CanvasRenderer {
  constructor(canvas, W, H) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.W = W
    this.H = H
    this.offsetY = H * 0.05
    this._bgPattern = null
  }

  // --- Projection isométrique ---
  isoX(wx, wy) {
    return (wx - wy) * CELL * 0.866 + this.W / 2
  }
  isoY(wx, wy) {
    return (wx + wy) * CELL * 0.5 + this.H / 2 - this.offsetY
  }

  // --- Rendu complet d'une frame ---
  // roles: { player1: 'fugitive'|'hunter', player2: 'fugitive'|'hunter' }
  render(state, map, skinConfig1, skinConfig2, roles) {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.W, this.H)

    const p1Role = (roles && roles.player1) || 'fugitive'
    const p2Role = (roles && roles.player2) || 'hunter'

    this.drawBackground(map)
    this.drawFloor(map)
    this.drawDeathZones(state, map)
    this.drawObstacles(map)
    // La sortie n'est visible que du fugitif
    if (p1Role === 'fugitive') {
      this.drawExit(map, state.pulse)
    }
    this.drawTrail(state.trail, map)
    this.drawVectorArrow(state.playerPos, state.lastVector, map)

    // Dessiner le joueur 2 en premier (derrière)
    if (skinConfig2 && state.player2Pos) {
      this.drawPlayer(state.player2Pos, skinConfig2, 2)
    }

    // En solo : dessiner Slappy (chasseur IA)
    if (state.gameMode !== 'multi') {
      this.drawMonster(state.monsterPos, state.timestamp, map)
    }

    this.drawPlayer(state.playerPos, skinConfig1, 1)
    this.drawTorchLight(state.playerPos, map, p1Role, state.monsterPos, state.gameMode)
    this.drawHUD(state, map, p1Role)
  }

  // --- Fond texturé ---
  drawBackground(map) {
    const ctx = this.ctx
    ctx.fillStyle = map.bgColor
    ctx.fillRect(0, 0, this.W, this.H)

    // Grain de texture
    ctx.save()
    ctx.globalAlpha = 0.04
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * this.W
      const y = Math.random() * this.H
      const s = Math.random() * 2
      ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000'
      ctx.fillRect(x, y, s, s)
    }
    ctx.restore()
  }

  // --- Parquet / dalles ---
  drawFloor(map) {
    const ctx = this.ctx
    const range = 22

    if (map.theme === 'cave') {
      this._drawStoneTiles(map, range)
    } else {
      this._drawWoodFloor(map, range)
    }
  }

  _drawWoodFloor(map, range) {
    const ctx = this.ctx
    const woodColors = ['#2e1f0e', '#2a1b0c', '#321f0e', '#261808', '#301d0d']

    for (let wy = -range; wy < range; wy++) {
      for (let wx = -range; wx < range; wx++) {
        const sx = this.isoX(wx, wy)
        const sy = this.isoY(wx, wy)
        const sx2 = this.isoX(wx + 1, wy)
        const sy2 = this.isoY(wx + 1, wy)
        const sx3 = this.isoX(wx + 1, wy + 1)
        const sy3 = this.isoY(wx + 1, wy + 1)
        const sx4 = this.isoX(wx, wy + 1)
        const sy4 = this.isoY(wx, wy + 1)

        const colorIdx = ((wx + wy * 3) % woodColors.length + woodColors.length) % woodColors.length
        ctx.fillStyle = woodColors[colorIdx]
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx2, sy2)
        ctx.lineTo(sx3, sy3)
        ctx.lineTo(sx4, sy4)
        ctx.closePath()
        ctx.fill()

        // Ligne de parquet
        if ((wx + wy) % 3 === 0) {
          ctx.strokeStyle = 'rgba(0,0,0,0.18)'
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }
  }

  _drawStoneTiles(map, range) {
    const ctx = this.ctx
    const stoneColors = ['#1e1a22', '#1a1620', '#221e26', '#1c1820']

    for (let wy = -range; wy < range; wy++) {
      for (let wx = -range; wx < range; wx++) {
        const sx = this.isoX(wx, wy)
        const sy = this.isoY(wx, wy)
        const sx2 = this.isoX(wx + 1, wy)
        const sy2 = this.isoY(wx + 1, wy)
        const sx3 = this.isoX(wx + 1, wy + 1)
        const sy3 = this.isoY(wx + 1, wy + 1)
        const sx4 = this.isoX(wx, wy + 1)
        const sy4 = this.isoY(wx, wy + 1)

        const colorIdx = ((wx * 7 + wy * 13) % stoneColors.length + stoneColors.length) % stoneColors.length
        ctx.fillStyle = stoneColors[colorIdx]
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx2, sy2)
        ctx.lineTo(sx3, sy3)
        ctx.lineTo(sx4, sy4)
        ctx.closePath()
        ctx.fill()

        // Joints des dalles
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'
        ctx.lineWidth = 0.8
        ctx.stroke()

        // Craquelures aléatoires
        if ((wx * 3 + wy * 7) % 11 === 0) {
          ctx.save()
          ctx.strokeStyle = 'rgba(0,0,0,0.25)'
          ctx.lineWidth = 0.4
          const cx = (sx + sx3) / 2
          const cy = (sy + sy3) / 2
          ctx.beginPath()
          ctx.moveTo(cx - 3, cy - 2)
          ctx.lineTo(cx + 2, cy + 3)
          ctx.stroke()
          ctx.restore()
        }
      }
    }
  }

  // --- Zones de mort ---
  drawDeathZones(state, map) {
    const ctx = this.ctx
    const ts = state.timestamp || 0

    for (const dz of map.deathZones) {
      const cx = (dz.x1 + dz.x2) / 2
      const cy = (dz.y1 + dz.y2) / 2
      const w = Math.abs(dz.x2 - dz.x1)
      const h = Math.abs(dz.y2 - dz.y1)

      // Dessiner le gouffre en iso
      const corners = [
        { x: dz.x1, y: dz.y1 },
        { x: dz.x2, y: dz.y1 },
        { x: dz.x2, y: dz.y2 },
        { x: dz.x1, y: dz.y2 }
      ]

      // Fond noir profond
      ctx.beginPath()
      ctx.moveTo(this.isoX(corners[0].x, corners[0].y), this.isoY(corners[0].x, corners[0].y))
      for (let i = 1; i < 4; i++) {
        ctx.lineTo(this.isoX(corners[i].x, corners[i].y), this.isoY(corners[i].x, corners[i].y))
      }
      ctx.closePath()
      ctx.fillStyle = '#000000'
      ctx.fill()

      // Gradient radial de profondeur
      const screenCx = this.isoX(cx, cy)
      const screenCy = this.isoY(cx, cy)
      const rad = (w + h) * CELL * 0.35

      const grad = ctx.createRadialGradient(screenCx, screenCy, 2, screenCx, screenCy, rad)
      grad.addColorStop(0, 'rgba(0,0,0,0.0)')
      grad.addColorStop(0.5, 'rgba(60,0,0,0.4)')
      grad.addColorStop(1, 'rgba(120,0,0,0.7)')

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(this.isoX(corners[0].x, corners[0].y), this.isoY(corners[0].x, corners[0].y))
      for (let i = 1; i < 4; i++) {
        ctx.lineTo(this.isoX(corners[i].x, corners[i].y), this.isoY(corners[i].x, corners[i].y))
      }
      ctx.closePath()
      ctx.clip()
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, this.W, this.H)

      // Cercles concentriques de profondeur
      for (let r = 1; r <= 3; r++) {
        ctx.beginPath()
        ctx.arc(screenCx, screenCy, rad * r / 4, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(80,0,0,${0.3 - r * 0.07})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      ctx.restore()

      // Contour rouge sang pulsant
      ctx.beginPath()
      ctx.moveTo(this.isoX(corners[0].x, corners[0].y), this.isoY(corners[0].x, corners[0].y))
      for (let i = 1; i < 4; i++) {
        ctx.lineTo(this.isoX(corners[i].x, corners[i].y), this.isoY(corners[i].x, corners[i].y))
      }
      ctx.closePath()
      const pulse = 0.6 + 0.4 * Math.sin(ts * 0.004)
      ctx.strokeStyle = `rgba(150,20,0,${pulse})`
      ctx.lineWidth = 2
      ctx.stroke()

      // Label
      ctx.save()
      ctx.font = '10px Creepster, serif'
      ctx.fillStyle = `rgba(180,40,0,${pulse})`
      ctx.textAlign = 'center'
      ctx.fillText(dz.label || 'GOUFFRE', screenCx, screenCy)
      ctx.restore()
    }
  }

  // --- Obstacles 3D isométriques ---
  drawObstacles(map) {
    const ctx = this.ctx
    const H_BOX = CELL * 1.2 // hauteur de la boîte en pixels

    for (const obs of map.obstacles) {
      const x1 = obs.x1, y1 = obs.y1, x2 = obs.x2, y2 = obs.y2

      // Coins du bas
      const btl = { sx: this.isoX(x1, y1), sy: this.isoY(x1, y1) }
      const btr = { sx: this.isoX(x2, y1), sy: this.isoY(x2, y1) }
      const bbr = { sx: this.isoX(x2, y2), sy: this.isoY(x2, y2) }
      const bbl = { sx: this.isoX(x1, y2), sy: this.isoY(x1, y2) }

      // Face du dessus (top) — légèrement plus claire
      const baseColor = obs.color || '#2a1e10'
      const topColor = this._lightenColor(baseColor, 40)
      const leftColor = this._darkenColor(baseColor, 20)
      const rightColor = this._darkenColor(baseColor, 35)

      // Face top
      ctx.beginPath()
      ctx.moveTo(btl.sx, btl.sy - H_BOX)
      ctx.lineTo(btr.sx, btr.sy - H_BOX)
      ctx.lineTo(bbr.sx, bbr.sy - H_BOX)
      ctx.lineTo(bbl.sx, bbl.sy - H_BOX)
      ctx.closePath()
      ctx.fillStyle = topColor
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.lineWidth = 0.8
      ctx.stroke()

      // Face gauche (btl → bbl → bbl-H → btl-H)
      ctx.beginPath()
      ctx.moveTo(btl.sx, btl.sy)
      ctx.lineTo(bbl.sx, bbl.sy)
      ctx.lineTo(bbl.sx, bbl.sy - H_BOX)
      ctx.lineTo(btl.sx, btl.sy - H_BOX)
      ctx.closePath()
      ctx.fillStyle = leftColor
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.lineWidth = 0.8
      ctx.stroke()

      // Face droite (btr → bbr → bbr-H → btr-H)
      ctx.beginPath()
      ctx.moveTo(btr.sx, btr.sy)
      ctx.lineTo(bbr.sx, bbr.sy)
      ctx.lineTo(bbr.sx, bbr.sy - H_BOX)
      ctx.lineTo(btr.sx, btr.sy - H_BOX)
      ctx.closePath()
      ctx.fillStyle = rightColor
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.lineWidth = 0.8
      ctx.stroke()

      // Label sur la face top
      if (obs.label) {
        const topCx = (btl.sx + btr.sx + bbr.sx + bbl.sx) / 4
        const topCy = (btl.sy + btr.sy + bbr.sy + bbl.sy) / 4 - H_BOX
        ctx.save()
        ctx.font = 'bold 9px Creepster, serif'
        ctx.fillStyle = map.accentColor || '#c8a050'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(obs.label, topCx, topCy)
        ctx.restore()
      }
    }
  }

  // --- Sortie (portail lumineux) ---
  drawExit(map, pulse = 0) {
    const ctx = this.ctx
    const ex = map.exit
    const cx = (ex.x1 + ex.x2) / 2
    const cy = (ex.y1 + ex.y2) / 2

    const corners = [
      { x: ex.x1, y: ex.y1 },
      { x: ex.x2, y: ex.y1 },
      { x: ex.x2, y: ex.y2 },
      { x: ex.x1, y: ex.y2 }
    ]

    const screenCx = this.isoX(cx, cy)
    const screenCy = this.isoY(cx, cy)

    const p = 0.5 + 0.5 * Math.sin(pulse * 0.05)

    // Halo doré
    const grad = ctx.createRadialGradient(screenCx, screenCy, 5, screenCx, screenCy, 60)
    grad.addColorStop(0, `rgba(200,160,50,${0.6 + 0.3 * p})`)
    grad.addColorStop(0.5, `rgba(150,100,20,${0.3 * p})`)
    grad.addColorStop(1, 'rgba(0,0,0,0)')

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(this.isoX(corners[0].x, corners[0].y), this.isoY(corners[0].x, corners[0].y))
    for (let i = 1; i < 4; i++) {
      ctx.lineTo(this.isoX(corners[i].x, corners[i].y), this.isoY(corners[i].x, corners[i].y))
    }
    ctx.closePath()
    ctx.fillStyle = `rgba(180,140,30,${0.4 + 0.2 * p})`
    ctx.fill()
    ctx.restore()

    // Anneau extérieur
    ctx.save()
    ctx.globalAlpha = 0.7 + 0.3 * p
    ctx.fillStyle = grad
    ctx.fillRect(screenCx - 70, screenCy - 70, 140, 140)
    ctx.restore()

    // Texte "SORTIE"
    ctx.save()
    ctx.font = `bold ${12 + 3 * p}px Creepster, serif`
    ctx.fillStyle = `rgba(255,215,80,${0.8 + 0.2 * p})`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = '#c8a050'
    ctx.shadowBlur = 10 * p
    ctx.fillText('✦ SORTIE ✦', screenCx, screenCy - 10)
    ctx.restore()
  }

  // --- Traînée du joueur ---
  drawTrail(trail, map) {
    if (!trail || trail.length === 0) return
    const ctx = this.ctx
    const rgb = map.palette.trail || '200,160,80'

    for (let i = 0; i < trail.length; i++) {
      const t = trail[i]
      const alpha = (i / trail.length) * 0.5
      const sx = this.isoX(t.x, t.y)
      const sy = this.isoY(t.x, t.y)
      ctx.beginPath()
      ctx.arc(sx, sy, 4 * (i / trail.length), 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${rgb},${alpha})`
      ctx.fill()
    }
  }

  // --- Flèche vecteur (style ectoplasme) ---
  drawVectorArrow(pos, vec, map) {
    if (!vec || (vec.x === 0 && vec.y === 0)) return
    const ctx = this.ctx
    const color = map.palette.vecOverlay || '#d4a050'

    const fromX = this.isoX(pos.x, pos.y)
    const fromY = this.isoY(pos.x, pos.y)
    const toX = this.isoX(pos.x + vec.x, pos.y + vec.y)
    const toY = this.isoY(pos.x + vec.x, pos.y + vec.y)

    // Ligne pointillée lumineuse
    ctx.save()
    ctx.setLineDash([6, 4])
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.shadowColor = color
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.stroke()

    // Particules étoilées le long du chemin
    ctx.setLineDash([])
    const steps = 5
    for (let i = 1; i < steps; i++) {
      const t = i / steps
      const px = fromX + (toX - fromX) * t
      const py = fromY + (toY - fromY) * t
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(Math.PI / 4)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.6
      ctx.fillRect(-2, -2, 4, 4)
      ctx.restore()
    }

    // Pointe de flèche
    const angle = Math.atan2(toY - fromY, toX - fromX)
    const arrowLen = 14
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(toX, toY)
    ctx.lineTo(toX - arrowLen * Math.cos(angle - 0.45), toY - arrowLen * Math.sin(angle - 0.45))
    ctx.moveTo(toX, toY)
    ctx.lineTo(toX - arrowLen * Math.cos(angle + 0.45), toY - arrowLen * Math.sin(angle + 0.45))
    ctx.stroke()

    ctx.restore()
  }

  // --- Avatar joueur style Roblox 2.5D ---
  drawPlayer(pos, skin, playerNum) {
    const ctx = this.ctx
    const sx = this.isoX(pos.x, pos.y)
    const sy = this.isoY(pos.x, pos.y)

    ctx.save()
    ctx.translate(sx, sy)

    const s = CELL * 0.55 // échelle

    // Ombre portée au sol
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(0, 2, s * 0.7, s * 0.25, 0, 0, Math.PI * 2)
    ctx.fill()

    // Jambes
    ctx.fillStyle = skin.pants
    ctx.fillRect(-s * 0.35, s * 0.5, s * 0.28, s * 0.55)  // jambe gauche
    ctx.fillRect(s * 0.07, s * 0.5, s * 0.28, s * 0.55)    // jambe droite

    // Corps
    ctx.fillStyle = skin.shirt
    ctx.fillRect(-s * 0.42, -s * 0.15, s * 0.84, s * 0.68)

    // Ombre corps
    ctx.fillStyle = `rgba(0,0,0,0.15)`
    ctx.fillRect(-s * 0.42, s * 0.25, s * 0.84, s * 0.28)

    // Bras gauche
    ctx.fillStyle = skin.body
    ctx.fillRect(-s * 0.7, -s * 0.1, s * 0.28, s * 0.6)

    // Bras droit
    ctx.fillStyle = skin.body
    ctx.fillRect(s * 0.42, -s * 0.1, s * 0.28, s * 0.6)

    // Sac à dos
    ctx.fillStyle = skin.dark
    ctx.fillRect(s * 0.3, -s * 0.12, s * 0.2, s * 0.42)

    // Tête
    ctx.fillStyle = skin.head
    ctx.fillRect(-s * 0.38, -s * 0.95, s * 0.76, s * 0.8)

    // Ombre tête
    ctx.fillStyle = `rgba(0,0,0,0.12)`
    ctx.fillRect(-s * 0.38, -s * 0.45, s * 0.76, s * 0.3)

    // Cheveux
    ctx.fillStyle = skin.hair
    ctx.fillRect(-s * 0.38, -s * 0.95, s * 0.76, s * 0.28)

    // Yeux (petits carrés noirs avec reflet)
    ctx.fillStyle = '#111'
    ctx.fillRect(-s * 0.22, -s * 0.58, s * 0.14, s * 0.14)
    ctx.fillRect(s * 0.08, -s * 0.58, s * 0.14, s * 0.14)
    // Reflets
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(-s * 0.18, -s * 0.57, s * 0.05, s * 0.05)
    ctx.fillRect(s * 0.12, -s * 0.57, s * 0.05, s * 0.05)

    // Oreilles
    ctx.fillStyle = skin.head
    ctx.fillRect(-s * 0.48, -s * 0.75, s * 0.12, s * 0.2)
    ctx.fillRect(s * 0.36, -s * 0.75, s * 0.12, s * 0.2)

    // Numéro joueur
    if (playerNum) {
      ctx.font = `bold ${Math.round(s * 0.55)}px Creepster, serif`
      ctx.fillStyle = map => playerNum === 1 ? '#c8a050' : '#88aaff'
      ctx.fillStyle = playerNum === 1 ? '#c8a050' : '#88aaff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`P${playerNum}`, 0, -s * 1.2)
    }

    ctx.restore()
  }

  // --- Monstre Slappy le Pantin ---
  drawMonster(pos, ts = 0, map) {
    const ctx = this.ctx
    const sx = this.isoX(pos.x, pos.y)
    const sy = this.isoY(pos.x, pos.y)
    const color = map.palette.monster || '#c0ccd8'
    const glow = map.palette.monsterGlow || '#7088a0'
    const eyeColor = map.palette.monsterEye || '#e8f4ff'

    // Animation de balancement
    const sway = Math.sin(ts * 0.006) * 6
    const bounce = Math.abs(Math.sin(ts * 0.008)) * 4

    ctx.save()
    ctx.translate(sx + sway * 0.5, sy - bounce)

    const s = CELL * 0.65

    // Ombre
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    ctx.ellipse(sway * 0.2, 2 + bounce, s * 0.55, s * 0.18, 0, 0, Math.PI * 2)
    ctx.fill()

    // Halo spectral
    ctx.save()
    const haloGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, s * 1.4)
    haloGrad.addColorStop(0, `${glow}44`)
    haloGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = haloGrad
    ctx.fillRect(-s * 1.5, -s * 2, s * 3, s * 3)
    ctx.restore()

    // Jambes articulées
    const legSwing = Math.sin(ts * 0.01) * 8
    ctx.fillStyle = this._darkenColor(color, 20)
    // Jambe gauche
    ctx.save()
    ctx.translate(-s * 0.2, s * 0.5)
    ctx.rotate(-legSwing * 0.04)
    ctx.fillRect(-s * 0.15, 0, s * 0.28, s * 0.55)
    ctx.restore()
    // Jambe droite
    ctx.save()
    ctx.translate(s * 0.2, s * 0.5)
    ctx.rotate(legSwing * 0.04)
    ctx.fillRect(-s * 0.13, 0, s * 0.28, s * 0.55)
    ctx.restore()

    // Corps (costume de pantin — rayures)
    ctx.fillStyle = color
    ctx.fillRect(-s * 0.38, -s * 0.1, s * 0.76, s * 0.63)

    // Rayures du costume
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-s * 0.38, -s * 0.1 + i * s * 0.22, s * 0.76, s * 0.1)
    }

    // Bras articulés
    const armSwing = Math.sin(ts * 0.01 + 1) * 10
    ctx.fillStyle = color
    // Bras gauche
    ctx.save()
    ctx.translate(-s * 0.38, -s * 0.05)
    ctx.rotate(-0.3 - armSwing * 0.04)
    ctx.fillRect(-s * 0.28, 0, s * 0.26, s * 0.55)
    ctx.restore()
    // Bras droit
    ctx.save()
    ctx.translate(s * 0.38, -s * 0.05)
    ctx.rotate(0.3 + armSwing * 0.04)
    ctx.fillRect(0, 0, s * 0.26, s * 0.55)
    ctx.restore()

    // Tête (un peu plus grande, carrée, Slappy)
    ctx.fillStyle = this._lightenColor(color, 20)
    ctx.fillRect(-s * 0.42, -s * 1.0, s * 0.84, s * 0.9)

    // Cheveux noirs (mèche)
    ctx.fillStyle = '#111'
    ctx.fillRect(-s * 0.38, -s * 1.0, s * 0.76, s * 0.22)
    ctx.fillRect(-s * 0.12, -s * 1.08, s * 0.22, s * 0.22)

    // Sourcils menaçants
    ctx.fillStyle = '#331100'
    ctx.fillRect(-s * 0.32, -s * 0.7, s * 0.24, s * 0.08)
    ctx.fillRect(s * 0.08, -s * 0.7, s * 0.24, s * 0.08)

    // Yeux jaunes luisants (effet de lueur)
    const eyePulse = 0.8 + 0.2 * Math.sin(ts * 0.007)
    ctx.save()
    ctx.shadowColor = eyeColor
    ctx.shadowBlur = 12 * eyePulse
    ctx.fillStyle = eyeColor
    ctx.fillRect(-s * 0.3, -s * 0.65, s * 0.18, s * 0.18)
    ctx.fillRect(s * 0.12, -s * 0.65, s * 0.18, s * 0.18)
    // Pupilles
    ctx.fillStyle = '#221100'
    ctx.fillRect(-s * 0.24, -s * 0.61, s * 0.08, s * 0.1)
    ctx.fillRect(s * 0.16, -s * 0.61, s * 0.08, s * 0.1)
    ctx.restore()

    // Bouche de ventriloque (lignes hachées)
    ctx.strokeStyle = '#441100'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-s * 0.22, -s * 0.4)
    ctx.lineTo(-s * 0.12, -s * 0.35)
    ctx.lineTo(0, -s * 0.37)
    ctx.lineTo(s * 0.12, -s * 0.35)
    ctx.lineTo(s * 0.22, -s * 0.4)
    ctx.stroke()

    // Articulations de pantin
    ctx.fillStyle = '#331100'
    ctx.beginPath()
    ctx.arc(-s * 0.38, -s * 0.05, s * 0.07, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(s * 0.38, -s * 0.05, s * 0.07, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  // --- Torche (effet lumière) ---
  // role: 'fugitive' (rayon 120px, voit peu) | 'hunter' (rayon 260px, voit loin)
  // monsterPos: position du chasseur IA (solo uniquement)
  // gameMode: 'solo' | 'multi'
  drawTorchLight(playerPos, map, role, monsterPos, gameMode) {
    const ctx = this.ctx
    const sx = this.isoX(playerPos.x, playerPos.y)
    const sy = this.isoY(playerPos.x, playerPos.y)
    const ts = Date.now()

    // Déterminer la couleur de torche selon le rôle et le thème
    let torchRGB
    if (map.theme === 'cave') {
      torchRGB = role === 'hunter' ? '180,80,255' : '120,40,200'
    } else {
      torchRGB = role === 'hunter' ? '255,160,40' : '200,110,20'
    }

    // Rayon de torche selon le rôle — fugitif voit peu, chasseur voit loin
    const baseRadius = role === 'hunter' ? 260 : 120
    // Vacillement basé sur timestamp
    const flickerRadius = baseRadius
      + (baseRadius * 0.09) * Math.sin(ts * 0.003)
      + (baseRadius * 0.04) * Math.sin(ts * 0.0071)

    // Overlay sombre sur tout l'écran
    const darkness = role === 'hunter' ? 0.60 : 0.80
    ctx.fillStyle = `rgba(0,0,0,${darkness})`
    ctx.fillRect(0, 0, this.W, this.H)

    // Halo de lumière douce
    const grad = ctx.createRadialGradient(sx, sy, 8, sx, sy, flickerRadius)
    grad.addColorStop(0, `rgba(${torchRGB}, 0.88)`)
    grad.addColorStop(0.4, `rgba(${torchRGB}, 0.38)`)
    grad.addColorStop(0.75, `rgba(${torchRGB}, 0.10)`)
    grad.addColorStop(1, 'rgba(0,0,0,0)')

    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, this.W, this.H)
    ctx.globalCompositeOperation = 'source-over'

    // En solo : afficher la silhouette rouge/sombre du chasseur (Slappy) même dans l'ombre
    if (gameMode !== 'multi' && monsterPos) {
      const mx = this.isoX(monsterPos.x, monsterPos.y)
      const my = this.isoY(monsterPos.x, monsterPos.y)
      const s = 28 * 0.65

      ctx.save()
      ctx.translate(mx, my)

      // Halo rouge menaçant autour du chasseur
      const threatGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, s * 2.5)
      threatGrad.addColorStop(0, 'rgba(180,0,0,0.45)')
      threatGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = threatGrad
      ctx.fillRect(-s * 3, -s * 3, s * 6, s * 6)

      // Silhouette sombre-rouge du chasseur visible même dans le noir
      ctx.globalAlpha = 0.75
      ctx.fillStyle = '#3a0000'
      // Corps
      ctx.fillRect(-s * 0.38, -s * 0.1, s * 0.76, s * 0.63)
      // Tête
      ctx.fillRect(-s * 0.42, -s * 1.0, s * 0.84, s * 0.9)
      // Jambes
      ctx.fillRect(-s * 0.35, s * 0.5, s * 0.28, s * 0.55)
      ctx.fillRect(s * 0.07, s * 0.5, s * 0.28, s * 0.55)
      // Bras
      ctx.fillRect(-s * 0.7, -s * 0.1, s * 0.28, s * 0.6)
      ctx.fillRect(s * 0.42, -s * 0.1, s * 0.28, s * 0.6)

      // Yeux rouges brillants
      ctx.globalAlpha = 1.0
      ctx.save()
      ctx.shadowColor = '#ff0000'
      ctx.shadowBlur = 14
      ctx.fillStyle = '#ff2200'
      ctx.fillRect(-s * 0.3, -s * 0.65, s * 0.18, s * 0.18)
      ctx.fillRect(s * 0.12, -s * 0.65, s * 0.18, s * 0.18)
      ctx.restore()

      ctx.restore()
    }
  }

  // --- HUD minimal ---
  drawHUD(state, map, role) {
    const ctx = this.ctx
    const health = state.health || 5
    const turn = state.turn || 1
    const effectiveRole = role || state.role || 'fugitive'
    const roleLabel = effectiveRole === 'hunter' ? '🗡 CHASSEUR' : '🏃 FUGITIF'
    const roleColor = effectiveRole === 'hunter' ? '#cc2200' : '#226622'
    const playerName = state.gameMode === 'multi'
      ? `${roleLabel}`
      : `${roleLabel}`

    // Fond HUD
    ctx.save()
    ctx.fillStyle = 'rgba(13,10,8,0.75)'
    ctx.strokeStyle = map.accentColor || '#c8a050'
    ctx.lineWidth = 1.5
    this._roundRect(ctx, 10, 10, 200, 70, 6)
    ctx.fill()
    ctx.stroke()

    // Nom du joueur / rôle
    ctx.font = 'bold 14px Creepster, serif'
    ctx.fillStyle = roleColor
    ctx.textAlign = 'left'
    ctx.fillText(playerName, 20, 32)

    // Tour
    ctx.font = '11px Special Elite, serif'
    ctx.fillStyle = '#a89060'
    ctx.fillText(`Tour ${turn}`, 20, 50)

    // Cœurs / Vie
    const heartX = 20
    const heartY = 62
    for (let i = 0; i < 5; i++) {
      ctx.font = '14px serif'
      ctx.fillStyle = i < health ? '#cc2200' : '#442200'
      ctx.fillText('♥', heartX + i * 20, heartY)
    }

    ctx.restore()

    // Nom de la map en haut au centre
    ctx.save()
    ctx.font = '13px Creepster, serif'
    ctx.fillStyle = 'rgba(200,160,80,0.7)'
    ctx.textAlign = 'center'
    ctx.fillText(map.name, this.W / 2, 22)
    ctx.restore()
  }

  // --- Utilitaires couleur ---
  _lightenColor(hex, amount) {
    return this._adjustColor(hex, amount)
  }
  _darkenColor(hex, amount) {
    return this._adjustColor(hex, -amount)
  }
  _adjustColor(hex, amount) {
    const h = hex.replace('#', '')
    if (h.length < 6) return hex
    const r = Math.max(0, Math.min(255, parseInt(h.substring(0, 2), 16) + amount))
    const g = Math.max(0, Math.min(255, parseInt(h.substring(2, 4), 16) + amount))
    const b = Math.max(0, Math.min(255, parseInt(h.substring(4, 6), 16) + amount))
    return `rgb(${r},${g},${b})`
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
}
