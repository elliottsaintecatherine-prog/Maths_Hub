export const RECIPE_TYPES = {
  quick:     { cookTime: 60,   portions: 2,  pricePerPortion: 8,  xp: 5,  burnIn: 120 },
  veryQuick: { cookTime: 30,   portions: 1,  pricePerPortion: 5,  xp: 2,  burnIn: 60 },
  fresh:     { cookTime: 180,  portions: 4,  pricePerPortion: 15, xp: 12, burnIn: 300 },
  frozen:    { cookTime: 120,  portions: 6,  pricePerPortion: 10, xp: 8,  burnIn: Infinity },
  bulk:      { cookTime: 480,  portions: 12, pricePerPortion: 6,  xp: 10, burnIn: null },
  fancy:     { cookTime: 900,  portions: 3,  pricePerPortion: 40, xp: 30, minLevel: 3 },
  veryFancy: { cookTime: 1800, portions: 4,  pricePerPortion: 80, xp: 60, minLevel: 6 },
  spicy:     { cookTime: 300,  portions: 5,  pricePerPortion: 18, xp: 15, clientSatisfaction: 0.1 },
  verySpicy: { cookTime: 600,  portions: 8,  pricePerPortion: 25, xp: 22, minLevel: 4 }
};

export const COOKBOOKS = {
  standard: { label: 'Cuisine Standard', icon: 'brown' },
  tiki:     { label: 'Cuisine Tiki',     icon: 'green',  minLevel: 3 },
  raid:     { label: 'Livre des Raids',  icon: 'red',    raidOnly: true },
  feast:    { label: 'Grand Festin',     icon: 'gold',   minLevel: 5 },
  seasonal: { label: 'Spécial Saison',   icon: 'orange', minLevel: 4 }
};

export const COOKBOOK_COLORS = {
  brown:  0x8b5a2b,
  green:  0x22c55e,
  red:    0xef4444,
  gold:   0xffd700,
  orange: 0xfb923c
};

export const DISHES = [
  { id: 'brain_tartare',           label: 'Cerveau Tartare',             type: 'quick',     cookbook: 'standard', minLevel: 1 },
  { id: 'gloomy_soup',             label: 'Soupe Glauque',               type: 'frozen',    cookbook: 'standard', minLevel: 1 },
  { id: 'rib_jelly',               label: 'Côtes en Gelée',              type: 'fresh',     cookbook: 'standard', minLevel: 2 },
  { id: 'fried_fingers',           label: 'Doigts Frits',                type: 'veryQuick', cookbook: 'standard', minLevel: 2 },
  { id: 'nauseating_steak',        label: 'Steak Nauséabond',            type: 'spicy',     cookbook: 'standard', minLevel: 3 },
  { id: 'tiki_brain_skewer',       label: 'Brochette de Cerveau Tiki',   type: 'spicy',     cookbook: 'tiki',     minLevel: 3 },
  { id: 'coco_bones_drink',        label: 'Boisson Os-Coco',             type: 'veryQuick', cookbook: 'tiki',     minLevel: 3 },
  { id: 'putrid_lasagna',          label: 'Lasagnes Putrides',           type: 'bulk',      cookbook: 'seasonal', minLevel: 4 },
  { id: 'breaded_eyes',            label: 'Yeux Panés',                  type: 'verySpicy', cookbook: 'seasonal', minLevel: 4 },
  { id: 'zombified_foie_gras',     label: 'Foie Gras Zombifié',          type: 'fancy',     cookbook: 'feast',    minLevel: 5 },
  { id: 'macabre_feast',           label: 'Festin Macabre',              type: 'veryFancy', cookbook: 'feast',    minLevel: 6 },
  { id: 'raid_special_brain_stew', label: 'Ragoût de Cerveau Volé',      type: 'fancy',     cookbook: 'raid',     minLevel: null },
  { id: 'raid_special_rare',       label: 'Plat Rare Volé',              type: 'veryFancy', cookbook: 'raid',     minLevel: null }
];

export function getDishById(id) {
  return DISHES.find(d => d.id === id) || null;
}

export function isDishUnlocked(dish, playerLevel) {
  if (dish.minLevel === null || dish.minLevel === undefined) return false;
  const cookbook = COOKBOOKS[dish.cookbook];
  if (cookbook && cookbook.minLevel && playerLevel < cookbook.minLevel) return false;
  return dish.minLevel <= playerLevel;
}

export function getSelectableDishes(playerLevel) {
  return DISHES.filter(d => {
    const cb = COOKBOOKS[d.cookbook];
    return cb && !cb.raidOnly;
  });
}

export function getBurnIn(dish) {
  const type = RECIPE_TYPES[dish.type];
  if (!type) return null;
  return type.burnIn;
}
