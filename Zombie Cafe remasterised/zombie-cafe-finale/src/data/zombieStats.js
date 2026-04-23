import { getRandomZombieName } from './zombieNames.js';

export function createZombieFromClient(clientType) {
  return {
    id: clientType.id,
    label: clientType.label,
    name: getRandomZombieName(),
    energy: clientType.energy,
    tipRating: clientType.tipRating,
    speed: clientType.speed,
    atkStrength: clientType.atkStrength,
    patience: clientType.patience,
    focus: clientType.focus,
    energyCurrent: clientType.energy,
    state: 'idle',
    reanimationEnd: null
  };
}

export function infectionCost(clientType) {
  const sum = clientType.energy + clientType.tipRating + clientType.speed
    + clientType.atkStrength + clientType.patience + clientType.focus;
  return Math.max(3, Math.min(80, Math.round((sum / 54) * 80)));
}
