const ZOMBIE_NAMES = [
  'Stoogey', 'Gorp', 'Zed', 'Mopey', 'Grunt', 'Brawny', 'Chomp', 'Dregs', 'Morto',
  'Gore', 'Creaky', 'Wail', 'Drool', 'Reeko', 'Munch', 'Slurp', 'Rotty', 'Snot',
  'Gimpy', 'Grool', 'Zonk', 'Mossy', 'Pus', 'Stench', 'Tumble'
];

export function getRandomZombieName() {
  return ZOMBIE_NAMES[Math.floor(Math.random() * ZOMBIE_NAMES.length)];
}

export default ZOMBIE_NAMES;
