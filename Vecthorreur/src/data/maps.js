export const MAPS = [
  {
    id: 0,
    name: "Le Manoir de la Terreur",
    theme: "manoir",
    bgColor: "#1a1208",
    floorColor: "#2e1f0e",
    wallColor: "#3d2b1a",
    accentColor: "#c8a050",
    monsterSpeed: 0.5,
    startPos: { x: 0, y: -15 },
    monsterStartPos: { x: 0, y: 15 },
    exit: { x1: -4, y1: 17, x2: 4, y2: 20 },
    obstacles: [
      { x1: -16, y1: 2,  x2: -8,  y2: 8,  color: "#2a1e10", label: "BIBLIOTHÈQUE" },
      { x1: 8,   y1: -8, x2: 16,  y2: -2, color: "#2a1e10", label: "ARMOIRE GOTHIQUE" },
      { x1: -4,  y1: 3,  x2: 4,   y2: 9,  color: "#342510", label: "ESCALIER" },
      { x1: -8,  y1: 12, x2: -6,  y2: 16, color: "#2a1e10", label: "COLONNE" },
      { x1: 6,   y1: 12, x2: 8,   y2: 16, color: "#2a1e10", label: "COLONNE" },
      { x1: -2,  y1: -9, x2: 2,   y2: -5, color: "#3a2010", label: "CHEMINÉE" }
    ],
    deathZones: [
      { x1: -10, y1: -4, x2: -4, y2: -1, color: "#1a080555", label: "GOUFFRE" },
      { x1: 10,  y1: 9,  x2: 16, y2: 14, color: "#44150055", label: "GOUFFRE" }
    ],
    safeZones: [],
    palette: {
      player1: { body: '#c8a878', dark: '#6b4a22', head: '#d4b896', hair: '#3d2010', shirt: '#8b4513', pants: '#4a3520' },
      player2: { body: '#a8c8d8', dark: '#224466', head: '#b8d4e8', hair: '#1a1a2e', shirt: '#2244aa', pants: '#1a2a3a' },
      monster: '#c0ccd8', monsterGlow: '#7088a0', monsterEye: '#e8f4ff',
      trail: '200,160,80', vecOverlay: '#d4a050',
      torch: '#ff8c20'
    }
  },
  {
    id: 1,
    name: "La Cave aux Secrets",
    theme: "cave",
    bgColor: "#0d0a0e",
    floorColor: "#1e1a22",
    wallColor: "#2a2232",
    accentColor: "#7755aa",
    monsterSpeed: 0.65,
    startPos: { x: 0, y: -15 },
    monsterStartPos: { x: 0, y: 15 },
    exit: { x1: -3, y1: 17, x2: 3, y2: 20 },
    obstacles: [
      { x1: -14, y1: 0,  x2: -6, y2: 6,  color: "#1e1a22", label: "PILIER" },
      { x1: 6,   y1: -6, x2: 14, y2: 0,  color: "#1e1a22", label: "PILIER" },
      { x1: -3,  y1: 4,  x2: 3,  y2: 10, color: "#2a2030", label: "AUTEL" },
      { x1: -7,  y1: 11, x2: -5, y2: 15, color: "#1e1a22", label: "STALACTITE" },
      { x1: 5,   y1: 11, x2: 7,  y2: 15, color: "#1e1a22", label: "STALACTITE" }
    ],
    deathZones: [
      { x1: -12, y1: -6, x2: -6, y2: -2, color: "#1a080555", label: "GOUFFRE" },
      { x1: 6,   y1: 7,  x2: 12, y2: 12, color: "#44150055", label: "GOUFFRE" }
    ],
    safeZones: [],
    palette: {
      player1: { body: '#c8a878', dark: '#6b4a22', head: '#d4b896', hair: '#3d2010', shirt: '#8b4513', pants: '#4a3520' },
      player2: { body: '#a8c8d8', dark: '#224466', head: '#b8d4e8', hair: '#1a1a2e', shirt: '#2244aa', pants: '#1a2a3a' },
      monster: '#aa55cc', monsterGlow: '#7733aa', monsterEye: '#ffaaff',
      trail: '160,120,200', vecOverlay: '#9966cc',
      torch: '#aa44ff'
    }
  }
]
