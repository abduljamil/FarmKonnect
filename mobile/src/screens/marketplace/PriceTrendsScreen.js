import { COLORS } from '../../constants/colors';
import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Image, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, Search, Filter, Home, User, X, Check } from 'lucide-react-native';
// Note: Trending icons and RefreshCw are missing in 1.8.0, so we use text/emojis for now
import { getCommodities, getPriceHistory, getForecast, getVarieties, getCitiesByFilters, getCoverage } from '../../services/priceService';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';
import PriceChart from '../../components/marketplace/PriceChart';
import ForecastOutlook from '../../components/marketplace/ForecastOutlook';
import SegmentedControl from '../../components/ui/SegmentedControl';
import { TARGET_COMMODITIES } from '../../utils/commodities';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

// Time-range options (mirrors web's PriceChart). We only render the ones that
// actually contain data for the selected series — see `availablePeriods`.
const TIME_PERIODS = [
  { label: '1M',  value: 30   },
  { label: '3M',  value: 90   },
  { label: '6M',  value: 180  },
  { label: '1Y',  value: 365  },
  { label: '5Y',  value: 1825 },
  { label: 'All', value: 7300 },
];

export default function PriceTrendsScreen({ navigation, route }) {
  const { initialCommodity = 'Wheat' } = route.params || {};
  const { t } = useTranslation();
  
  const [commodities, setCommodities] = useState([]);
  const [cities, setCities] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [data, setData] = useState([]);
  const [forecastDocs, setForecastDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedCommodity, setSelectedCommodity] = useState(initialCommodity);
  const [selectedVariety, setSelectedVariety] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  // Default to 180 days so the chart still shows something even when a
  // commodity/city combo hasn't been scraped in the last few weeks (was 30,
  // which silently produced an empty chart on stale series).
  const [days, setDays] = useState(180);
  const [coverage, setCoverage] = useState(null);
  // Measured inner width of the chart card so PriceChart fits exactly and the
  // forecast tail no longer overflows the card's right edge. Seeded with a
  // close estimate (screen minus the screen + card paddings) to avoid a flash.
  const [chartW, setChartW] = useState(width - 80);

  // Only offer time-ranges that actually contain data: a period of N days can
  // only show points if the latest datum falls within the last N days, so when
  // a series' newest data is months old we hide the shorter ranges (mirrors web).
  const daysSinceLatest = coverage?.maxDate
    ? Math.max(0, Math.floor((Date.now() - new Date(coverage.maxDate).getTime()) / 86400000))
    : 0;
  const availablePeriods =
    coverage && coverage.count > 0
      ? (TIME_PERIODS.filter((p) => p.value >= daysSinceLatest).length
          ? TIME_PERIODS.filter((p) => p.value >= daysSinceLatest)
          : [TIME_PERIODS[TIME_PERIODS.length - 1]])
      : TIME_PERIODS;

  // Replaced two Alert.alert pickers — Alert only supports ~3 buttons on
  // iOS in practice and was capped to the first 10 cities. These are real
  // scrollable modals now.
  const [showVarietyModal, setShowVarietyModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);

  const showVarietyPicker = () => {
    if (varieties.length === 0) {
      Alert.alert(t('mobile.alerts.noVarieties'), t('mobile.alerts.noVarietiesMsg'));
      return;
    }
    setShowVarietyModal(true);
  };

  const showCityPicker = () => {
    if (cities.length === 0) return;
    setShowCityModal(true);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const res = await getCommodities();
        if (res.data?.success) {
          const apiList = res.data.data || [];
          // Prefer the curated TARGET_COMMODITIES order, but fall back to
          // whatever the API returns if the filter would leave us empty (the
          // canonical commodity set on the backend can drift over time, e.g.
          // the "Paddy" key is in the DB but not in our curated list).
          const filtered = apiList.filter((c) => TARGET_COMMODITIES.includes(c));
          const list = filtered.length > 0 ? filtered : apiList;
          setCommodities(list);
          if (list.length > 0 && !list.includes(selectedCommodity)) {
            setSelectedCommodity(list[0]);
          }
        }
      } catch (err) {
        console.warn('Failed to init prices', err.message);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchVarieties = async () => {
      if (!selectedCommodity) return;
      try {
        const res = await getVarieties(selectedCommodity);
        if (res.data?.success) {
          const list = res.data.data || [];
          setVarieties(list);
          setSelectedVariety(list[0] || '');
        }
      } catch (err) {
        setVarieties([]);
        setSelectedVariety('');
      }
    };
    fetchVarieties();
  }, [selectedCommodity]);

  useEffect(() => {
    const fetchCities = async () => {
      if (!selectedCommodity) return;
      try {
        const params = { commodity: selectedCommodity };
        if (selectedVariety) params.variety = selectedVariety;
        const res = await getCitiesByFilters(params);
        if (res.data?.success) {
          const list = res.data.data || [];
          setCities(list);
          if (!list.includes(selectedCity)) setSelectedCity(list[0] || '');
        }
      } catch (err) {
        setCities([]);
        setSelectedCity('');
      }
    };
    fetchCities();
  }, [selectedCommodity, selectedVariety]);

  // Fetch date-range coverage for the selected series; drives which time-range
  // buttons are shown and snaps `days` to the shortest range that still has data.
  useEffect(() => {
    const fetchCoverage = async () => {
      if (!selectedCommodity || !selectedCity) { setCoverage(null); return; }
      try {
        const params = { commodity: selectedCommodity, city: selectedCity };
        if (selectedVariety) params.variety = selectedVariety;
        const res = await getCoverage(params);
        if (res.data?.success) {
          const cov = res.data.data || null;
          setCoverage(cov);
          if (cov && cov.count > 0 && cov.maxDate) {
            const dsl = Math.max(0, Math.floor((Date.now() - new Date(cov.maxDate).getTime()) / 86400000));
            const valid = TIME_PERIODS.filter((p) => p.value >= dsl);
            const list = valid.length ? valid : [TIME_PERIODS[TIME_PERIODS.length - 1]];
            setDays((d) => (list.some((p) => p.value === d) ? d : list[0].value));
          }
        }
      } catch {
        setCoverage(null);
      }
    };
    fetchCoverage();
  }, [selectedCommodity, selectedVariety, selectedCity]);

  const fetchHistory = async () => {
    if (!selectedCommodity || !selectedCity) {
      // No city selected yet — clear data so the empty state shows instead
      // of stale rows from a previous commodity.
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = { commodity: selectedCommodity, city: selectedCity, days };
      if (selectedVariety) params.variety = selectedVariety;
      const res = await getPriceHistory(params);
      if (res.data?.success) {
        setData(res.data.data || []);
        setError('');
      } else {
        setData([]);
        setError('No data found');
      }
    } catch (err) {
      setData([]);
      setError(err.response?.status === 401
        ? 'Please sign in to view price history.'
        : 'Failed to fetch price history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedCommodity, selectedCity, selectedVariety, days]);

  // Fetch model forecast for the selected (commodity, variety, city). Keep
  // only the rows from the most recent anchor — that's the one forward-
  // looking forecast curve users want to see.
  useEffect(() => {
    const fetchForecast = async () => {
      if (!selectedCommodity || !selectedCity) {
        setForecastDocs([]);
        return;
      }
      try {
        const params = { commodity: selectedCommodity, city: selectedCity };
        if (selectedVariety) params.variety = selectedVariety;
        const res = await getForecast(params);
        const docs = (res.data && res.data.data) || [];
        if (docs.length === 0) {
          setForecastDocs([]);
          return;
        }
        const latestAnchor = docs.reduce(
          (m, d) => (new Date(d.anchor_date) > new Date(m) ? d.anchor_date : m),
          docs[0].anchor_date
        );
        const latest = docs
          .filter(d => d.anchor_date === latestAnchor)
          .sort((a, b) => new Date(a.forecast_date) - new Date(b.forecast_date));
        setForecastDocs(latest);
      } catch (err) {
        setForecastDocs([]);
      }
    };
    fetchForecast();
  }, [selectedCommodity, selectedCity, selectedVariety]);

  const longestForecast = forecastDocs.find(d => d.horizon_weeks === 12);

  const prices = data.map(d => Number(d.price)).filter(p => !isNaN(p) && p > 0);
  const latestPrice = prices.length ? prices[prices.length - 1] : 0;
  const firstPrice = prices.length ? prices[0] : 0;
  const highPrice = prices.length ? Math.max(...prices) : 0;
  const lowPrice = prices.length ? Math.min(...prices) : 0;
  const priceChange = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice * 100) : 0;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <AnimatedBlobs />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Price Trends</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Commodity selector — wraps to multiple rows instead of scrolling
            horizontally, so every crop is visible at a glance on mobile. */}
        <View style={styles.commodityList}>
          {(commodities || []).map(c => (
            <TouchableOpacity 
              key={c} 
              style={[styles.commodityBtn, selectedCommodity === c && styles.commodityBtnActive]}
              onPress={() => setSelectedCommodity(c)}
            >
              <Text numberOfLines={2} style={[styles.commodityText, selectedCommodity === c && styles.commodityTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filters Panel — the Variety picker only appears when the selected
            commodity actually has varieties (mirrors web). Commodities with a
            single variety show just the City picker, full width. */}
        <View style={styles.filterRow}>
          {varieties.length > 0 && (
            <TouchableOpacity style={styles.filterBox} onPress={showVarietyPicker}>
               <Text style={styles.filterLabel}>Variety</Text>
               <View style={styles.pickerContainer}>
                 <Text style={styles.pickerText} numberOfLines={1}>{selectedVariety}</Text>
                 <ChevronDown color={COLORS.textMuted} size={16} />
               </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.filterBox} onPress={showCityPicker}>
             <Text style={styles.filterLabel}>Market City</Text>
             <View style={styles.pickerContainer}>
               <Text style={styles.pickerText} numberOfLines={1}>{selectedCity || 'Select City'}</Text>
               <ChevronDown color={COLORS.textMuted} size={16} />
             </View>
          </TouchableOpacity>
        </View>

        {/* Price Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.priceLabel}>{selectedCommodity} Price Today</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceValue}>₨ {(latestPrice || 0).toLocaleString()}</Text>
              <Text style={styles.unitText}>/ {selectedCommodity === 'Sugar' ? 'Kg' : '40kg'}</Text>
            </View>
          </View>
          <View style={[styles.trendBadge, { backgroundColor: priceChange >= 0 ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)' }]}>
             <Text style={[styles.trendText, { color: priceChange >= 0 ? COLORS.primary : '#dc2626' }]}>
               {priceChange >= 0 ? '▲' : '▼'} {priceChange.toFixed(1)}%
             </Text>
          </View>
        </View>

        {/* Time-range picker — only the ranges that actually contain data for
            this series are shown (e.g. 1M/3M hidden when the latest price is
            months old), mirroring web. */}
        <SegmentedControl
          style={{ marginBottom: 12 }}
          value={days}
          onChange={setDays}
          options={availablePeriods.map((opt) => ({ value: opt.value, label: opt.label }))}
        />

        {/* Chart View */}
        <View style={styles.chartContainer}>
           <View style={styles.chartHeader}>
             <Text style={styles.chartTitle}>Historical Trend (Last {days} Days)</Text>
             <TouchableOpacity style={styles.refreshBtn} onPress={fetchHistory}>
                <Text style={{ color: COLORS.primary, fontSize: 12 }}>REFRESH</Text>
             </TouchableOpacity>
           </View>
           
           {loading ? (
             <View style={{ height: 200, justifyContent: 'center' }}>
               <ActivityIndicator color={COLORS.primary} />
             </View>
           ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
           ) : data.length < 2 ? (
              // Was: SimpleLineChart silently returned null when data had
              // fewer than 2 points, so the user saw an empty container with
              // no indication of why. Now we show an explicit empty state
              // with the active filters so they know what to change.
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  No price history for {selectedCommodity}
                  {selectedVariety ? ` (${selectedVariety})` : ''}
                  {selectedCity ? ` in ${selectedCity}` : ''} in the last {days} days.
                </Text>
                <Text style={[styles.errorText, { fontSize: 11, marginTop: 8 }]}>
                  Try another city or variety.
                </Text>
              </View>
           ) : (
             <View
               style={styles.chartSection}
               onLayout={(e) => {
                 const w = Math.round(e.nativeEvent.layout.width);
                 if (w > 0 && w !== chartW) setChartW(w);
               }}
             >
                <PriceChart
                  history={data}
                  forecast={forecastDocs}
                  width={chartW}
                />
                {forecastDocs.length > 0 && (
                  <View style={styles.forecastLegend}>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: priceChange >= 0 ? COLORS.primary : '#dc2626' }]} />
                      <Text style={styles.legendText}>Actual</Text>
                      <View style={[styles.legendDot, { backgroundColor: '#f97316', marginLeft: 16 }]} />
                      <Text style={styles.legendText}>Forecast</Text>
                    </View>
                    <ForecastOutlook docs={forecastDocs} />
                  </View>
                )}
             </View>
           )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Highest</Text>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>₨ {highPrice.toLocaleString()}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Lowest</Text>
            <Text style={[styles.statValue, { color: '#dc2626' }]}>₨ {lowPrice.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
           <Text style={styles.infoText}>Market prices are updated hourly based on Mandi reports. Trends are indicative of auction prices.</Text>
        </View>

      </ScrollView>

      <PickerModal
        visible={showVarietyModal}
        title="Select Variety"
        options={varieties}
        selected={selectedVariety}
        getLabel={(v) => v}
        onSelect={(v) => { setSelectedVariety(v); setShowVarietyModal(false); }}
        onClose={() => setShowVarietyModal(false)}
      />
      <PickerModal
        visible={showCityModal}
        title="Select Market City"
        options={cities}
        selected={selectedCity}
        getLabel={(c) => c}
        onSelect={(c) => { setSelectedCity(c); setShowCityModal(false); }}
        onClose={() => setShowCityModal(false)}
      />
    </SafeAreaView>
  );
}

// Generic scrollable picker used by the variety + city pickers — replaces
// Alert.alert (which silently truncated to 3 options on iOS and showed only
// the first 10 on Android).
function PickerModal({ visible, title, options, selected, getLabel, onSelect, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={pickerStyles.backdrop}>
        <View style={pickerStyles.card}>
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}><X color={COLORS.textMuted} size={22} /></TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item, idx) => `${item}-${idx}`}
            style={{ maxHeight: 400 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[pickerStyles.row, selected === item && pickerStyles.rowActive]}
                onPress={() => onSelect(item)}
              >
                <Text style={[pickerStyles.rowText, selected === item && pickerStyles.rowTextActive]}>
                  {getLabel(item)}
                </Text>
                {selected === item && <Check color={COLORS.primary} size={18} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  card: { backgroundColor: COLORS.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 1, borderColor: COLORS.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, marginBottom: 6, borderRadius: 10, backgroundColor: 'rgba(26, 46, 29, 0.4)', borderWidth: 1, borderColor: COLORS.border },
  rowActive: { backgroundColor: 'rgba(22, 163, 74, 0.15)', borderColor: COLORS.primary },
  rowText: { color: '#e5e7eb', fontSize: 14 },
  rowTextActive: { color: COLORS.primary, fontWeight: '600' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backBtn: { padding: 4 },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  container: { padding: 20, paddingTop: 0 },
  commodityList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  // Equal-width 3-column grid so every row has the same count and the chips
  // line up; long names (e.g. "Seed Cotton (Phutti)") wrap inside the cell.
  commodityBtn: { width: '31%', minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border },
  commodityBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  commodityText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  commodityTextActive: { color: COLORS.white },
  rangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  rangeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 1, borderColor: COLORS.inputBorder },
  rangeBtnActive: { backgroundColor: 'rgba(22, 163, 74, 0.15)', borderColor: COLORS.primary },
  rangeText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  rangeTextActive: { color: COLORS.primary },
  filterRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  filterBox: { flex: 1 },
  filterLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6, marginLeft: 4 },
  pickerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 44, borderRadius: 12, backgroundColor: 'rgba(26, 46, 29, 0.8)', borderWidth: 1, borderColor: COLORS.border },
  pickerText: { color: COLORS.white, fontSize: 14, fontWeight: '500', flex: 1 },
  heroCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  priceLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  priceValue: { color: COLORS.white, fontSize: 28, fontWeight: '900' },
  unitText: { color: COLORS.textFaint, fontSize: 14, marginLeft: 6, marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  trendText: { fontSize: 14, fontWeight: 'bold' },
  chartContainer: { backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  chartTitle: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  chartSection: { paddingVertical: 10 },
  forecastLegend: { marginTop: 12, paddingHorizontal: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { color: COLORS.gray400, fontSize: 12 },
  legendOutlook: { color: COLORS.gray400, fontSize: 12 },
  errorContainer: { height: 200, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: COLORS.textFaint, marginTop: 10, textAlign: 'center' },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, padding: 16, backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  statLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  infoBox: { padding: 16, backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)' },
  infoText: { color: COLORS.gray400, fontSize: 12, lineHeight: 18, textAlign: 'center' }
});
