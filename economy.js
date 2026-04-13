/**
 * economy.js — Système économique Scolaris (💶 Euro)
 * Import : import { getBalance, updateBalance, ... } from '../economy.js'
 */

const BALANCE_KEY  = 'scolaris_balance';
const INVENTORY_KEY = 'scolaris_inventory';
const DEFAULT_BALANCE = 1000;

/* ── Portefeuille ─────────────────────────── */

export function getBalance() {
  const v = localStorage.getItem(BALANCE_KEY);
  if (v === null) { setBalance(DEFAULT_BALANCE); return DEFAULT_BALANCE; }
  return parseInt(v, 10) || 0;
}

export function updateBalance(delta) {
  return setBalance(getBalance() + delta);
}

export function setBalance(amount) {
  const n = Math.max(0, Math.round(amount));
  localStorage.setItem(BALANCE_KEY, String(n));
  window.dispatchEvent(new CustomEvent('scolaris-balance', { detail: n }));
  return n;
}

/* ── Inventaire ───────────────────────────── */

export function getInventory() {
  try { return JSON.parse(localStorage.getItem(INVENTORY_KEY)) || {}; }
  catch { return {}; }
}

function _saveInv(inv) {
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv));
  window.dispatchEvent(new CustomEvent('scolaris-inventory', { detail: inv }));
}

export function addItem(id, qty = 1) {
  const inv = getInventory();
  inv[id] = (inv[id] || 0) + qty;
  _saveInv(inv);
  return inv;
}

export function useItem(id) {
  const inv = getInventory();
  if (!inv[id] || inv[id] <= 0) return false;
  inv[id]--;
  if (inv[id] <= 0) delete inv[id];
  _saveInv(inv);
  return true;
}

export function itemCount(id) {
  return getInventory()[id] || 0;
}

/* ── Catalogue Boutique ───────────────────── */

export const SHOP = [
  {
    id:    'vecthorreur_shield',
    name:  'Bouclier Spectral',
    desc:  'Absorbe le prochain coup du monstre dans Vecthorreur (1 utilisation).',
    price: 200,
    icon:  '🛡️',
    game:  'vecthorreur',
  }
];

export function buyItem(itemId) {
  const item = SHOP.find(i => i.id === itemId);
  if (!item) return { ok: false, msg: 'Item introuvable' };
  if (getBalance() < item.price) return { ok: false, msg: 'Fonds insuffisants' };
  updateBalance(-item.price);
  addItem(itemId);
  return { ok: true };
}
