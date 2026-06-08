import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Image, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, Search, Filter, Home, User, X, Check } from 'lucide-react-native';
// Note: Trending icons and RefreshCw are missing in 1.8.0, so we use text/emojis for now
import Svg, { Path, LinearGradient, Stop, Defs, Polyline } from 'react-native-svg';
import { getCommodities, getPriceHistory, getForecast, getVarieties, getCitiesByFilters } from '../../services/priceService';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';
import { TARGET_COMMODITIES } from '../../utils/commodities';

const { width } = Dimensions.get('window');

// Custom SVG Chart Component — supports an optional forecast tail rendered
// as a dashed orange polyline picking up from the last historical price.
const SimpleLineChart = ({ data, forecast = [], color = '#16a34a', forecastColor = '#f97316' }) => {
  if (!data || data.length < 2) return null;

  const chartHeight = 180;
  const chartWidth = width - 80;

  // Y-scale spans BOTH history and forecast so the future forecast doesn't
  // fall off the visible chart when it's significantly higher or lower than
  // the recent history.
  const histPrices = data.map(d => Number(d.price)).filter(p => !isNaN(p) && p !== null);
  const fcPrices = (forecast || []).map(d => Number(d.predicted_price)).filter(p => !isNaN(p));
  const allPrices = [...histPrices, ...fcPrices];
  const min = allPrices.length ? Math.min(...allPrices) : 0;
  const max = allPrices.length ? Math.max(...allPrices) : 0;
  const range = (max - min) || 1;

  // Total horizontal slots = history + forecast points. Each forecast point
  // gets its own slot to the right of the last history slot.
  const totalSlots = (data.length || 0) + (forecast ? forecast.length : 0);
  const stepX = chartWidth / (totalSlots > 1 ? totalSlots - 1 : 1);

  const histPoints = data.map((d, i) => {
    const price = Number(d.price) || 0;
    const x = i * stepX;
    const y = range === 0 ? chartHeight / 2 : chartHeight - ((price - min) / range) * chartHeight;
    if (isNaN(x) || isNaN(y)) return '0,0';
    return `${x},${y}`;
  }).join(' ');

  // Forecast polyline anchors on the last history point so the lines visually connect.
  let fcPoints = '';
  if (forecast && forecast.length > 0 && histPrices.length > 0) {
    const lastHistPrice = Number(data[data.length - 1].price) || 0;
    const anchorX = (data.length - 1) * stepX;
    const anchorY = range === 0 ? chartHeight / 2 : chartHeight - ((lastHistPrice - min) / range) * chartHeight;
    const future = forecast.map((d, i) => {
      const price = Number(d.predicted_price) || 0;
      const x = (data.length + i) * stepX;
      const y = range === 0 ? chartHeight / 2 : chartHeight - ((price - min) / range) * chartHeight;
      return `${x},${y}`;
    }).join(' ');
    fcPoints = `${anchorX},${anchorY} ${future}`;
  }

  return (
    <View style={{ height: chartHeight, width: chartWidth, alignSelf: 'center' }}>
      <Svg height={chartHeight} width={chartWidth}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.3" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path
          d={`M ${histPoints} L ${(data.length - 1) * stepX},${chartHeight} L 0,${chartHeight} Z`}
          fill="url(#grad)"
        />
        <Polyline
          points={histPoints}
          fill="none"
          stroke={color}
          strokeWidth="3"
        />
        {fcPoints ? (
          <Polyline
            points={fcPoints}
            fill="none"
            stroke={forecastColor}
            strokeWidth="3"
            strokeDasharray="6,4"
          />
        ) : null}
      </Svg>
    </View>
  );
};

export default function PriceTrendsScreen({ navigation, route }) {
  const { initialCommodity = 'Wheat' } = route.params || {};
  
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

  // Replaced two Alert.alert pickers — Alert only supports ~3 buttons on
  // iOS in practice and was capped to the first 10 cities. These are real
  // scrollable modals now.
  const [showVarietyModal, setShowVarietyModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);

  const showVarietyPicker = () => {
    if (varieties.length === 0) {
      Alert.alert('No varieties', 'This commodity has no varieties to filter by.');
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
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <AnimatedBlobs />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Price Trends</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Commodity Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.commodityList}>
          {(commodities || []).map(c => (
            <TouchableOpacity 
              key={c} 
              style={[styles.commodityBtn, selectedCommodity === c && styles.commodityBtnActive]}
              onPress={() => setSelectedCommodity(c)}
            >
              <Text style={[styles.commodityText, selectedCommodity === c && styles.commodityTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filters Panel */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterBox} onPress={showVarietyPicker}>
             <Text style={styles.filterLabel}>Variety</Text>
             <View style={styles.pickerContainer}>
               <Text style={styles.pickerText} numberOfLines={1}>{selectedVariety || 'Default'}</Text>
               <ChevronDown color="#a3a3a3" size={16} />
             </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBox} onPress={showCityPicker}>
             <Text style={styles.filterLabel}>Market City</Text>
             <View style={styles.pickerContainer}>
               <Text style={styles.pickerText} numberOfLines={1}>{selectedCity || 'Select City'}</Text>
               <ChevronDown color="#a3a3a3" size={16} />
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
             <Text style={[styles.trendText, { color: priceChange >= 0 ? '#16a34a' : '#dc2626' }]}>
               {priceChange >= 0 ? '▲' : '▼'} {priceChange.toFixed(1)}%
             </Text>
          </View>
        </View>

        {/* Time-range picker (mirrors web's 1M / 3M / 6M / 1Y / 5Y / All) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {[
            { label: '1M',  value: 30   },
            { label: '3M',  value: 90   },
            { label: '6M',  value: 180  },
            { label: '1Y',  value: 365  },
            { label: '5Y',  value: 1825 },
            { label: 'All', value: 7300 },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={[styles.rangeBtn, days === opt.value && styles.rangeBtnActive]}
              onPress={() => setDays(opt.value)}
            >
              <Text style={[styles.rangeText, days === opt.value && styles.rangeTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Chart View */}
        <View style={styles.chartContainer}>
           <View style={styles.chartHeader}>
             <Text style={styles.chartTitle}>Historical Trend (Last {days} Days)</Text>
             <TouchableOpacity style={styles.refreshBtn} onPress={fetchHistory}>
                <Text style={{ color: '#16a34a', fontSize: 12 }}>REFRESH</Text>
             </TouchableOpacity>
           </View>
           
           {loading ? (
             <View style={{ height: 200, justifyContent: 'center' }}>
               <ActivityIndicator color="#16a34a" />
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
             <View style={styles.chartSection}>
                <SimpleLineChart
                  data={data}
                  forecast={forecastDocs}
                  color={priceChange >= 0 ? '#16a34a' : '#dc2626'}
                />
                {forecastDocs.length > 0 && (
                  <View style={styles.forecastLegend}>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: priceChange >= 0 ? '#16a34a' : '#dc2626' }]} />
                      <Text style={styles.legendText}>Actual</Text>
                      <View style={[styles.legendDot, { backgroundColor: '#f97316', marginLeft: 16 }]} />
                      <Text style={styles.legendText}>Forecast</Text>
                    </View>
                    {longestForecast && (
                      <Text style={styles.legendOutlook}>
                        12-week outlook: <Text style={{ color: '#f97316', fontWeight: '700' }}>
                          ₨ {Math.round(longestForecast.predicted_price).toLocaleString()}
                        </Text>
                        {longestForecast.expected_mape != null
                          ? ` ± ${longestForecast.expected_mape.toFixed(1)}%`
                          : ''}
                      </Text>
                    )}
                  </View>
                )}
             </View>
           )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Highest</Text>
            <Text style={[styles.statValue, { color: '#16a34a' }]}>₨ {highPrice.toLocaleString()}</Text>
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
        options={['', ...varieties]}
        selected={selectedVariety}
        getLabel={(v) => v || 'Default (no variety)'}
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
            <TouchableOpacity onPress={onClose}><X color="#a3a3a3" size={22} /></TouchableOpacity>
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
                {selected === item && <Check color="#16a34a" size={18} />}
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
  card: { backgroundColor: '#0f1a12', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 1, borderColor: '#224026' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, marginBottom: 6, borderRadius: 10, backgroundColor: 'rgba(26, 46, 29, 0.4)', borderWidth: 1, borderColor: '#224026' },
  rowActive: { backgroundColor: 'rgba(22, 163, 74, 0.15)', borderColor: '#16a34a' },
  rowText: { color: '#e5e7eb', fontSize: 14 },
  rowTextActive: { color: '#16a34a', fontWeight: '600' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  container: { padding: 20, paddingTop: 0 },
  commodityList: { marginBottom: 20 },
  commodityBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(26, 46, 29, 0.8)', marginRight: 10, borderWidth: 1, borderColor: '#224026' },
  commodityBtnActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  commodityText: { color: '#a3a3a3', fontSize: 14, fontWeight: '600' },
  commodityTextActive: { color: '#fff' },
  rangeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.25)', marginRight: 8, borderWidth: 1, borderColor: '#374151' },
  rangeBtnActive: { backgroundColor: 'rgba(22, 163, 74, 0.15)', borderColor: '#16a34a' },
  rangeText: { color: '#a3a3a3', fontSize: 12, fontWeight: '600' },
  rangeTextActive: { color: '#16a34a' },
  filterRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  filterBox: { flex: 1 },
  filterLabel: { color: '#a3a3a3', fontSize: 12, marginBottom: 6, marginLeft: 4 },
  pickerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 44, borderRadius: 12, backgroundColor: 'rgba(26, 46, 29, 0.8)', borderWidth: 1, borderColor: '#224026' },
  pickerText: { color: '#fff', fontSize: 14, fontWeight: '500', flex: 1 },
  heroCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 20, borderWidth: 1, borderColor: '#224026', marginBottom: 20 },
  priceLabel: { color: '#a3a3a3', fontSize: 12, marginBottom: 4 },
  priceValue: { color: '#fff', fontSize: 28, fontWeight: '900' },
  unitText: { color: '#6b7280', fontSize: 14, marginLeft: 6, marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  trendText: { fontSize: 14, fontWeight: 'bold' },
  chartContainer: { backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#224026', marginBottom: 20 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  chartTitle: { color: '#a3a3a3', fontSize: 14, fontWeight: '600' },
  chartSection: { paddingVertical: 10 },
  forecastLegend: { marginTop: 12, paddingHorizontal: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { color: '#9ca3af', fontSize: 12 },
  legendOutlook: { color: '#9ca3af', fontSize: 12 },
  errorContainer: { height: 200, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#6b7280', marginTop: 10, textAlign: 'center' },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, padding: 16, backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 16, borderWidth: 1, borderColor: '#224026' },
  statLabel: { color: '#a3a3a3', fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  infoBox: { padding: 16, backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)' },
  infoText: { color: '#9ca3af', fontSize: 12, lineHeight: 18, textAlign: 'center' }
});
