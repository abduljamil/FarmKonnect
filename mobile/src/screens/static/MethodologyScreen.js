import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Database, Layers, Cpu, GitBranch, Activity, LineChart, RefreshCcw, Info, ArrowRight } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';

// Mobile version of the web /how-forecasts-work page. Explains how the price
// forecasts are produced. Content is English (like the other static content
// screens — AboutUs/Terms/etc.).
const STEPS = [
  { icon: Database, title: 'Collect mandi prices', desc: 'Daily commodity prices are scraped from official Pakistani mandi sources across major cities.' },
  { icon: Layers, title: 'Clean & normalise', desc: 'Prices are de-duplicated, outliers removed, and units/varieties standardised into a consistent series.' },
  { icon: Cpu, title: 'Engineer features', desc: 'Seasonality, recent trends, volatility and city-level signals are derived for each commodity.' },
  { icon: GitBranch, title: 'Train the model', desc: 'An ensemble forecasting model learns each commodity’s patterns from its historical series.' },
  { icon: Activity, title: 'Validate accuracy', desc: 'Forecasts are back-tested and an expected error (MAPE) is computed so you know how much to trust each one.' },
  { icon: LineChart, title: 'Publish forecasts', desc: 'Predictions are generated for 1, 2, 4 and 12-week horizons and shown on the Price Trends chart.' },
  { icon: RefreshCcw, title: 'Retrain weekly', desc: 'The pipeline re-runs as fresh prices arrive, so forecasts stay current.' },
];

const STATS = [
  { value: '1–12 wks', label: 'Forecast horizons' },
  { value: 'Weekly', label: 'Update cadence' },
  { value: 'Mandi data', label: 'Real price sources' },
  { value: 'Ensemble', label: 'Model type' },
];

const READ = [
  { title: 'The forecast line', desc: 'The dashed orange line is the predicted price path beyond today’s latest known price.' },
  { title: 'Confidence', desc: 'A lower expected error (MAPE) means higher confidence in that forecast.' },
  { title: 'Direction', desc: 'Compare the forecast to the current price to see whether prices are expected to rise, ease, or stay stable.' },
];

export default function MethodologyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How forecasts work</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.heroTitle}>From mandi prices to a forecast you can act on</Text>
        <Text style={styles.heroSubtitle}>
          FarmKonnect turns real Pakistani mandi price data into short-term price forecasts for staple commodities.
          Here’s the pipeline behind it.
        </Text>

        <Text style={styles.sectionTitle}>The pipeline</Text>
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <View key={i} style={styles.stepCard}>
              <View style={styles.stepIcon}><Icon color={COLORS.primary} size={20} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{String(i + 1).padStart(2, '0')}  {s.title}</Text>
                <Text style={styles.stepDesc}>{s.desc}</Text>
              </View>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>At a glance</Text>
        <View style={styles.statsGrid}>
          {STATS.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>How to read a forecast</Text>
        {READ.map((r, i) => (
          <View key={i} style={styles.readCard}>
            <Text style={styles.readTitle}>{r.title}</Text>
            <Text style={styles.readDesc}>{r.desc}</Text>
          </View>
        ))}

        <View style={styles.disclaimer}>
          <Info color={COLORS.warning} size={20} />
          <View style={{ flex: 1 }}>
            <Text style={styles.disclaimerTitle}>Forecasts are estimates</Text>
            <Text style={styles.disclaimerBody}>
              Predictions are statistical estimates, not guarantees. Markets can move unexpectedly — use forecasts
              as one input alongside your own judgement.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('PriceTrends')}>
          <Text style={styles.ctaText}>See price trends</Text>
          <ArrowRight color={COLORS.white} size={18} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  container: { padding: 20, paddingTop: 8, paddingBottom: 48 },
  heroTitle: { color: COLORS.white, fontSize: 24, fontWeight: 'bold', marginBottom: 10, lineHeight: 32 },
  heroSubtitle: { color: COLORS.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 28 },
  sectionTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 14 },
  stepCard: { flexDirection: 'row', gap: 14, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, marginBottom: 12 },
  stepIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(22, 163, 74, 0.12)', alignItems: 'center', justifyContent: 'center' },
  stepTitle: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  stepDesc: { color: COLORS.gray300, fontSize: 13, lineHeight: 19 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '47%', backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 16, alignItems: 'center' },
  statValue: { color: COLORS.primary, fontSize: 20, fontWeight: '900' },
  statLabel: { color: COLORS.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' },
  readCard: { backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, marginBottom: 12 },
  readTitle: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  readDesc: { color: COLORS.gray300, fontSize: 13, lineHeight: 19 },
  disclaimer: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(251, 191, 36, 0.1)', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.4)', borderRadius: 16, padding: 16, marginTop: 16, marginBottom: 24 },
  disclaimerTitle: { color: COLORS.warning, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  disclaimerBody: { color: '#fde68a', fontSize: 13, lineHeight: 19 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16 },
  ctaText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
});
