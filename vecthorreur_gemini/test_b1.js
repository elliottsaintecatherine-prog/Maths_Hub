import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Simulation de l'environnement pour charger v-data
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const vDataContent = fs.readFileSync(join(__dirname, 'v-data.js'), 'utf-8');
// Pour évaluer de façon basique:
eval(vDataContent + '\n\nglobal.MAPS = MAPS;');

import LevelManager from './src/systems/LevelManager.js';

const lm = new LevelManager();
lm.loadMap(0, global.MAPS);

console.log("Point 0,0 isWalkable ?", lm.isWalkable(0, 0)); // Devrait être true pour le manoir
console.log("Point -8,-10 isWalkable ?", lm.isWalkable(-8, -10)); // Devrait être false (wall: x1:-8, y1:-14, x2:-7, y2:-6)
