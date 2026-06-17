// Single source of truth for which commodity strings the mobile app shows.
//
// Mirrors frontend/src/utils/commodities.js. Mobile uses minimal styling so
// we only need the list + emoji + base-family helper here.

export const TARGET_COMMODITIES = [
  // Base / single-variety commodities
  'Wheat',
  'Maize',
  'Sugar',
  'Flour',
  'Rice',
  // Rice varieties (each is its own commodity in the DB, variety=null)
  'Rice (IRRI)',
  'Rice Basmati Super (New)',
  'Rice Basmati Super (Old)',
  'Rice Basmati (385)',
  'Rice Kainat (New)',
  'Paddy Basmati',
  'Paddy (IRRI)',
  'Paddy Kainat',
  // Seed cotton variant
  'Seed Cotton (Phutti)',
];

const ICONS = {
  Wheat: '🌾',
  Rice: '🍚',
  Cotton: '☁️',
  Sugar: '🍬',
  Maize: '🌽',
  Flour: '🥖',
};

export function getBaseCommodity(commodity) {
  if (!commodity) return null;
  const c = String(commodity);
  if (/paddy|rice/i.test(c))    return 'Rice';
  if (/cotton|phutti/i.test(c)) return 'Cotton';
  if (/wheat/i.test(c))         return 'Wheat';
  if (/maize/i.test(c))         return 'Maize';
  if (/sugar/i.test(c))         return 'Sugar';
  if (/flour/i.test(c))         return 'Flour';
  return null;
}

export function getCommodityIcon(commodity) {
  return ICONS[commodity] || ICONS[getBaseCommodity(commodity)] || '🌿';
}
