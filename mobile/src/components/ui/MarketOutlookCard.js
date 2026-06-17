import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getForecast } from '../../services/priceService';
import { COLORS } from '../../constants/colors';

const COMMODITY = 'Wheat';

// Buy/Hold/Sell-style market outlook, mirroring web's MarketOutlookCard +
// forecastSignal: derive a rise/fall/stable signal from the 4-week-horizon
// forecast vs the anchor price (±2% thresholds). Taps through to PriceTrends.
function computeSignal(docs) {
  if (!docs || docs.length === 0) return null;
  const baseline = docs.find((d) => d.anchor_price != null)?.anchor_price || 0;
  const ordered = [...docs].sort((a, b) => (a.horizon_weeks || 0) - (b.horizon_weeks || 0));
  const signalDoc =
    ordered.find((d) => d.horizon_weeks === 12) ||
    ordered.find((d) => d.horizon_weeks === 4) ||
    ordered[ordered.length - 1];
  if (!signalDoc) return null;
  const pct = baseline ? ((signalDoc.predicted_price - baseline) / baseline) * 100 : 0;
  const trend = pct > 2 ? 'rise' : pct < -2 ? 'fall' : 'stable';
  const mape = signalDoc.expected_mape;
  const confKey = mape == null ? null : mape < 7 ? 'confHigh' : mape < 15 ? 'confMod' : 'confLow';
  return { pct, trend, weeks: signalDoc.horizon_weeks || 12, confKey };
}

export default function MarketOutlookCard({ navigation }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [sig, setSig] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getForecast({ commodity: COMMODITY });
        const docs = res.data?.data || [];
        if (cancelled) return;
        if (docs.length) {
          const latestAnchor = docs.reduce(
            (m, d) => (new Date(d.anchor_date) > new Date(m) ? d.anchor_date : m),
            docs[0].anchor_date
          );
          setSig(computeSignal(docs.filter((d) => d.anchor_date === latestAnchor)));
        }
      } catch {
        if (!cancelled) setSig(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const tone = sig?.trend === 'rise'
    ? { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', Icon: TrendingUp }
    : sig?.trend === 'fall'
      ? { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', Icon: TrendingDown }
      : { color: COLORS.textMuted, bg: 'rgba(156, 163, 175, 0.1)', border: 'rgba(156, 163, 175, 0.2)', Icon: Minus };
  const trendLabel = sig
    ? t(sig.trend === 'rise' ? 'mobile.outlook.rising' : sig.trend === 'fall' ? 'mobile.outlook.falling' : 'mobile.outlook.stable')
    : '';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation?.navigate('PriceTrends', { initialCommodity: COMMODITY })}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Sparkles color={COLORS.primary} size={16} />
          <Text style={styles.title}>{t('mobile.outlook.title')}</Text>
        </View>
        <ChevronRight color={COLORS.textFaint} size={18} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 12 }} />
      ) : !sig ? (
        <Text style={styles.unavailable}>{t('mobile.outlook.unavailable')}</Text>
      ) : (
        <View style={styles.contentRow}>
          <View style={[styles.iconBox, { backgroundColor: tone.bg, borderColor: tone.border }]}>
            <tone.Icon color={tone.color} size={28} strokeWidth={2.5} />
          </View>
          <View style={styles.signalDetails}>
            <View style={styles.commodityRow}>
              <Text style={styles.commodity}>{COMMODITY}</Text>
              {sig.confKey && (
                <View style={styles.confBadge}>
                  <Text style={styles.confText}>{t(`mobile.outlook.${sig.confKey}`)}</Text>
                </View>
              )}
            </View>
            <View style={styles.trendRow}>
              <Text style={[styles.trendLabel, { color: tone.color }]}>{trendLabel}</Text>
              <View style={[styles.pctBadge, { backgroundColor: tone.bg }]}>
                <Text style={[styles.pctText, { color: tone.color }]}>
                  {sig.pct >= 0 ? '+' : ''}{sig.pct.toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.weeksText}>
                {t('mobile.outlook.over', { weeks: sig.weeks })}
              </Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(26, 46, 29, 0.6)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    padding: 16,
    marginBottom: 20,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  contentRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
  },
  signalDetails: { flex: 1 },
  commodityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  commodity: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  confBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
  confText: { fontSize: 10, fontWeight: '600', color: COLORS.white, textTransform: 'uppercase' },
  trendRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  trendLabel: { fontSize: 14, fontWeight: '600' },
  pctBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  pctText: { fontSize: 12, fontWeight: 'bold' },
  weeksText: { color: COLORS.textMuted, fontSize: 12 },
  unavailable: { color: COLORS.textFaint, fontSize: 13, marginTop: 12 },
});
