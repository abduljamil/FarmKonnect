import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { computeForecastSignal, SIGNAL_TONE } from '../../utils/forecastSignal';
import { useTranslation } from 'react-i18next';

const HORIZON_KEY = { 1: "h1", 2: "h2", 4: "h4", 12: "h12" };
const MODEL_LABELS = {
  persistence: "Trend baseline",
  lgbm_per_commodity: "LightGBM",
  lgbm_quantile: "LightGBM (quantile)",
  lgbm_quantile_median: "LightGBM (quantile)",
};
const friendlyModel = (m) => MODEL_LABELS[m] || (m ? m.replace(/_/g, " ") : "Model");

export default function ForecastOutlook({ docs }) {
  const { t } = useTranslation();
  const sig = computeForecastSignal(docs);
  if (!sig) return null;

  const { ordered, pctOf, signalDoc, trend, mape, confKey } = sig;
  const tone = SIGNAL_TONE[trend];
  const TrendIcon = trend === "rise" ? TrendingUp : trend === "fall" ? TrendingDown : Minus;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <Sparkles color={COLORS.primary} size={16} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>{t("forecast.outlookTitle")}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {t("forecast.outlookSubtitle")}
            </Text>
          </View>
        </View>
      </View>

      {/* Per-horizon outlook cards */}
      <View style={styles.horizonGrid}>
        {ordered.map((d) => {
          const p = pctOf(d.predicted_price);
          const up = p > 0.5;
          const down = p < -0.5;
          const hasBand = d.predicted_price_low != null && d.predicted_price_high != null;
          const moveColor = up ? '#d97706' : down ? '#10b981' : COLORS.textMuted;
          const MoveIcon = up ? TrendingUp : down ? TrendingDown : Minus;

          return (
            <View key={d.horizon_weeks} style={styles.horizonCard}>
              <Text style={styles.horizonLabel}>
                {t(`forecast.${HORIZON_KEY[d.horizon_weeks] || "h1"}`)}
              </Text>
              <Text style={styles.horizonPrice}>
                ₨{Math.round(d.predicted_price).toLocaleString()}
              </Text>
              <View style={styles.trendRow}>
                <MoveIcon color={moveColor} size={12} />
                <Text style={[styles.trendText, { color: moveColor }]}>
                  {p > 0 ? "+" : ""}{p.toFixed(1)}%
                </Text>
              </View>
              {hasBand && (
                <Text style={styles.bandText} numberOfLines={1}>
                  ₨{Math.round(d.predicted_price_low).toLocaleString()}–{Math.round(d.predicted_price_high).toLocaleString()}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Buy / Hold / Sell signal */}
      <View style={[styles.signalBox, tone.box]}>
        <View style={[styles.signalIconBox, tone.iconBox]}>
          <TrendIcon color={tone.icon} size={20} />
        </View>
        <View style={styles.signalContent}>
          <View style={styles.signalTitleRow}>
            <Text style={[styles.signalTitle, { color: tone.title }]}>
              {t(`forecast.signal_${trend}_title`)}
            </Text>
            {confKey && (
              <View style={styles.confBadge}>
                <Text style={styles.confBadgeText}>{t(`forecast.${confKey}`)}</Text>
              </View>
            )}
          </View>
          <Text style={styles.signalDesc}>
            {t(`forecast.signal_${trend}_buyer`)}
          </Text>
          <Text style={styles.signalDesc}>
            {t(`forecast.signal_${trend}_seller`)}
          </Text>
        </View>
      </View>

      {/* Credibility / disclaimer line */}
      <View style={styles.disclaimerRow}>
        <Info color={COLORS.textFaint} size={12} style={{ marginTop: 2, marginRight: 6 }} />
        <Text style={styles.disclaimerText}>
          {t("forecast.modelLine", {
            model: friendlyModel(signalDoc.model),
            error: mape != null ? mape.toFixed(1) : "—",
          })}
          {" — "}
          {t("forecast.disclaimer")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    padding: 6,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    borderRadius: 8,
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  horizonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  horizonCard: {
    width: '48%',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  horizonLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  horizonPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 2,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bandText: {
    fontSize: 10,
    color: COLORS.textFaint,
    marginTop: 4,
  },
  signalBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  signalIconBox: {
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  signalContent: {
    flex: 1,
  },
  signalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
    gap: 8,
  },
  signalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  confBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
  },
  confBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  signalDesc: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 2,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textFaint,
    lineHeight: 16,
  },
});
