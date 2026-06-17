/**
 * Shared Buy/Hold/Sell signal derived from price-forecast docs.
 */
export function computeForecastSignal(docs) {
  if (!docs || docs.length === 0) return null;

  const baseline = docs.find((d) => d.anchor_price != null)?.anchor_price || 0;
  const ordered = [...docs].sort((a, b) => (a.horizon_weeks || 0) - (b.horizon_weeks || 0));
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

// Tone styling per trend for React Native
export const SIGNAL_TONE = {
  rise: {
    box: { backgroundColor: 'rgba(217, 119, 6, 0.1)', borderColor: 'rgba(217, 119, 6, 0.3)', borderWidth: 1 }, // amber
    iconBox: { backgroundColor: 'rgba(217, 119, 6, 0.2)' },
    icon: '#d97706',
    title: '#b45309',
  },
  fall: {
    box: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', borderWidth: 1 }, // emerald
    iconBox: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
    icon: '#10b981',
    title: '#047857',
  },
  stable: {
    box: { backgroundColor: 'rgba(107, 114, 128, 0.1)', borderColor: 'rgba(107, 114, 128, 0.3)', borderWidth: 1 }, // gray
    iconBox: { backgroundColor: 'rgba(107, 114, 128, 0.2)' },
    icon: '#6b7280',
    title: '#374151',
  },
};
