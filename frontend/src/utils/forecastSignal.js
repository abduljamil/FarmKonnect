/**
 * Shared Buy/Hold/Sell signal derived from price-forecast docs.
 *
 * Takes the set of forecast documents for a single anchor (typically one doc
 * per horizon: 1, 2, 4, 12 weeks) and returns the values used by both the
 * dashboard Market Outlook card and the full price chart's outlook panel, so
 * the thresholds and styling stay consistent in one place.
 */
export function computeForecastSignal(docs) {
  if (!docs || docs.length === 0) return null;

  const baseline = docs.find((d) => d.anchor_price != null)?.anchor_price || 0;
  const ordered = [...docs].sort((a, b) => a.horizon_weeks - b.horizon_weeks);
  const pctOf = (p) => (baseline ? ((p - baseline) / baseline) * 100 : 0);

  // Signal anchored on the 1-month (4wk) horizon, else the longest available.
  const signalDoc =
    ordered.find((d) => d.horizon_weeks === 4) ||
    ordered.find((d) => d.horizon_weeks === 12) ||
    ordered[ordered.length - 1];

  const pct = pctOf(signalDoc.predicted_price);
  const trend = pct > 2 ? "rise" : pct < -2 ? "fall" : "stable";
  const mape = signalDoc.expected_mape;
  const confKey =
    mape == null ? null : mape < 7 ? "confHigh" : mape < 15 ? "confMod" : "confLow";

  return { baseline, ordered, pctOf, signalDoc, pct, trend, mape, confKey };
}

// Tone styling per trend — shared so the card and panel look identical.
export const SIGNAL_TONE = {
  rise: {
    box: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40",
    iconBox: "bg-amber-100 dark:bg-amber-900/40",
    icon: "text-amber-600 dark:text-amber-400",
    title: "text-amber-800 dark:text-amber-300",
  },
  fall: {
    box: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40",
    iconBox: "bg-emerald-100 dark:bg-emerald-900/40",
    icon: "text-emerald-600 dark:text-emerald-400",
    title: "text-emerald-800 dark:text-emerald-300",
  },
  stable: {
    box: "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700",
    iconBox: "bg-gray-100 dark:bg-gray-700",
    icon: "text-gray-500 dark:text-gray-400",
    title: "text-gray-800 dark:text-gray-200",
  },
};
