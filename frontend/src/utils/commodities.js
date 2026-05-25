// Single source of truth for commodity display config in the frontend.
//
// The live AMIS scraper and the 2026 historical ingest BOTH write each
// rice / cotton variant as its own commodity string (with variety=null).
// So "Rice (IRRI)" is a separate commodity from "Rice", not a sub-row of
// Rice. This file lists every commodity we want to surface in the UI and
// maps each to display metadata (image, color, etc.) borrowed from the
// matching base commodity.

import wheatImg from "../assets/commodities/wheat.png";
import riceImg from "../assets/commodities/rice.png";
import cottonImg from "../assets/commodities/cotton.png";
import sugarImg from "../assets/commodities/sugar.png";
import maizeImg from "../assets/commodities/maize.png";
import flourImg from "../assets/commodities/flour.png";

// Base display blocks -- one per major commodity family.
const RICE_DISPLAY = {
  image: riceImg,
  emoji: "🍚",
  color: "text-sky-600 dark:text-sky-400",
  bg: "bg-sky-100 dark:bg-sky-900/40",
  gradient: "from-sky-500 to-sky-600",
};
const COTTON_DISPLAY = {
  image: cottonImg,
  emoji: "☁️",
  color: "text-slate-600 dark:text-slate-400",
  bg: "bg-slate-100 dark:bg-slate-800/60",
  gradient: "from-slate-500 to-slate-600",
};
const WHEAT_DISPLAY = {
  image: wheatImg,
  emoji: "🌾",
  color: "text-amber-600 dark:text-amber-400",
  bg: "bg-amber-100 dark:bg-amber-900/40",
  gradient: "from-amber-500 to-amber-600",
};
const SUGAR_DISPLAY = {
  image: sugarImg,
  emoji: "🍬",
  color: "text-pink-600 dark:text-pink-400",
  bg: "bg-pink-100 dark:bg-pink-900/40",
  gradient: "from-pink-500 to-pink-600",
};
const MAIZE_DISPLAY = {
  image: maizeImg,
  emoji: "🌽",
  color: "text-yellow-600 dark:text-yellow-400",
  bg: "bg-yellow-100 dark:bg-yellow-900/40",
  gradient: "from-yellow-500 to-yellow-600",
};
const FLOUR_DISPLAY = {
  image: flourImg,
  emoji: "🥖",
  color: "text-orange-600 dark:text-orange-400",
  bg: "bg-orange-100 dark:bg-orange-900/40",
  gradient: "from-orange-500 to-orange-600",
};

// Per-commodity config, keyed by the exact commodity string used in Mongo.
export const COMMODITY_CONFIG = {
  Wheat:  WHEAT_DISPLAY,
  Maize:  MAIZE_DISPLAY,
  Sugar:  SUGAR_DISPLAY,
  Flour:  FLOUR_DISPLAY,
  Cotton: COTTON_DISPLAY,
  Rice:   RICE_DISPLAY,

  // Rice variants -- each is its own commodity string in the DB
  "Rice (IRRI)":              RICE_DISPLAY,
  "Rice Basmati Super (New)": RICE_DISPLAY,
  "Rice Basmati Super (Old)": RICE_DISPLAY,
  "Rice Basmati (385)":       RICE_DISPLAY,
  "Rice Kainat (New)":        RICE_DISPLAY,
  "Paddy Basmati":            RICE_DISPLAY,
  "Paddy (IRRI)":             RICE_DISPLAY,
  "Paddy Kainat":             RICE_DISPLAY,

  // Cotton variant
  "Seed Cotton (Phutti)": COTTON_DISPLAY,
};

// Allow-list applied to /api/prices/commodities responses. Anything else
// (e.g. "Barley(جو)", "Wheat Straw", "Millet" that the live scraper writes
// but we don't surface) is filtered out.
export const TARGET_COMMODITIES = Object.keys(COMMODITY_CONFIG);

// Same list as a {value,label,icon} array for dropdowns / alert UIs.
export const COMMODITY_OPTIONS = TARGET_COMMODITIES.map((c) => ({
  value: c,
  label: c,
  icon: COMMODITY_CONFIG[c].emoji,
}));

// Detect the base family for any commodity string. Used as a fallback when
// a commodity arrives that isn't in COMMODITY_CONFIG (e.g. a new variant
// the scraper adds before we update this file).
export function getBaseCommodity(commodity) {
  if (!commodity) return null;
  const c = String(commodity);
  if (/paddy|rice/i.test(c))    return "Rice";
  if (/cotton|phutti/i.test(c)) return "Cotton";
  if (/wheat/i.test(c))         return "Wheat";
  if (/maize/i.test(c))         return "Maize";
  if (/sugar/i.test(c))         return "Sugar";
  if (/flour/i.test(c))         return "Flour";
  return null;
}

export function getCommodityConfig(commodity) {
  return (
    COMMODITY_CONFIG[commodity] ||
    COMMODITY_CONFIG[getBaseCommodity(commodity)] ||
    WHEAT_DISPLAY
  );
}

// UI grouping for the price chart. Each base "family" is shown as one top-level
// button; its members are the real commodity strings stored in Mongo. Because
// variety is unused (always null) and every variant is its own commodity,
// picking a "variety" in the UI actually selects that commodity for queries.
export const COMMODITY_FAMILIES = {
  Wheat: ["Wheat"],
  Rice: [
    "Rice (IRRI)",
    "Rice Basmati Super (New)",
    "Rice Basmati Super (Old)",
    "Rice Basmati (385)",
    "Rice Kainat (New)",
    "Paddy Basmati",
    "Paddy (IRRI)",
    "Paddy Kainat",
  ],
  Cotton: ["Cotton", "Seed Cotton (Phutti)"],
  Sugar: ["Sugar"],
  Maize: ["Maize"],
  Flour: ["Flour"],
};

// Order in which family buttons appear.
export const COMMODITY_FAMILY_ORDER = ["Wheat", "Rice", "Cotton", "Sugar", "Maize", "Flour"];

// Commodities shown as top-level buttons (in order). After the rice/paddy
// restructure, Rice & Paddy are single commodities whose types are picked via
// the variety dropdown (not separate buttons).
export const DISPLAY_COMMODITIES = [
  "Wheat", "Rice", "Paddy", "Seed Cotton (Phutti)", "Sugar", "Maize", "Flour",
];

// Given the commodity strings actually present in the DB, return the ordered
// families that have at least one member present, each with its present members
// (used to render the family buttons + the variety dropdown).
export function buildFamilies(availableCommodities) {
  const present = new Set(availableCommodities || []);
  const out = [];
  for (const fam of COMMODITY_FAMILY_ORDER) {
    const members = (COMMODITY_FAMILIES[fam] || []).filter((c) => present.has(c));
    if (members.length) out.push({ family: fam, members });
  }
  return out;
}

// Cities the live AMIS scraper refreshes most reliably. Used to pick a sensible
// default so the chart doesn't open on a stale, low-activity market (the
// alphabetically-first city often has no recent data).
export const PREFERRED_CITIES = [
  "Faisalabad", "Lahore", "Multan", "Rawalpindi", "Gujranwala", "Sargodha",
];

export function pickDefaultCity(cities) {
  if (!cities || !cities.length) return "";
  return PREFERRED_CITIES.find((c) => cities.includes(c)) || cities[0];
}
