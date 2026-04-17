import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, Search, Filter, Home, User } from 'lucide-react-native';
// Note: Trending icons and RefreshCw are missing in 1.8.0, so we use text/emojis for now
import Svg, { Path, LinearGradient, Stop, Defs, Polyline } from 'react-native-svg';
import { getCommodities, getPriceHistory, getVarieties, getCitiesByFilters } from '../../services/priceService';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';

const { width } = Dimensions.get('window');

const TARGET_COMMODITIES = ["Wheat", "Rice", "Cotton", "Sugar", "Maize", "Flour"];

// Custom SVG Chart Component
const SimpleLineChart = ({ data, color = '#16a34a' }) => {
  if (!data || data.length < 2) return null;
  
  const chartHeight = 180;
  const chartWidth = width - 80;
  
  const validPrices = data.map(d => Number(d.price)).filter(p => !isNaN(p) && p !== null);
  const min = validPrices.length ? Math.min(...validPrices) : 0;
  const max = validPrices.length ? Math.max(...validPrices) : 0;
  
  const range = (max - min) || 1;
  const stepX = chartWidth / (data.length > 1 ? data.length - 1 : 1);

  const points = data.map((d, i) => {
    const price = Number(d.price) || 0;
    const x = i * stepX;
    const y = range === 0 ? chartHeight / 2 : chartHeight - ((price - min) / range) * chartHeight;
    // Safety check for NaN
    if (isNaN(x) || isNaN(y)) return '0,0';
    return `${x},${y}`;
  }).join(' ');

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
          d={`M ${points} L ${chartWidth},${chartHeight} L 0,${chartHeight} Z`}
          fill="url(#grad)"
        />
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="3"
        />
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedCommodity, setSelectedCommodity] = useState(initialCommodity);
  const [selectedVariety, setSelectedVariety] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [days, setDays] = useState(30);

  const showVarietyPicker = () => {
    if (varieties.length === 0) return;
    Alert.alert(
      'Select Variety',
      'Choose a variety to filter prices',
      varieties.map(v => ({ text: v, onPress: () => setSelectedVariety(v) })),
      { cancelable: true }
    );
  };

  const showCityPicker = () => {
    if (cities.length === 0) return;
    Alert.alert(
      'Select Market City',
      'Choose a city to filter prices',
      cities.slice(0, 10).map(c => ({ text: c, onPress: () => setSelectedCity(c) })),
      { cancelable: true }
    );
  };

  useEffect(() => {
    const init = async () => {
      try {
        const res = await getCommodities();
        if (res.data?.success) {
          const list = (res.data.data || []).filter(c => TARGET_COMMODITIES.includes(c));
          setCommodities(list);
          if (!selectedCommodity && list.length > 0) setSelectedCommodity(list[0]);
        }
      } catch (err) {
        console.error('Failed to init prices', err);
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
    if (!selectedCommodity || !selectedCity) return;
    setLoading(true);
    try {
      const params = { commodity: selectedCommodity, city: selectedCity, days };
      if (selectedVariety) params.variety = selectedVariety;
      const res = await getPriceHistory(params);
      if (res.data?.success) {
        setData(res.data.data || []);
        setError('');
      } else {
        setError('No data found');
      }
    } catch (err) {
      setError('Failed to fetch price history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedCommodity, selectedCity, selectedVariety, days]);

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

        {/* Chart View */}
        <View style={styles.chartContainer}>
           <View style={styles.chartHeader}>
             <Text style={styles.chartTitle}>Historical Trend (Last 30 Days)</Text>
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
           ) : (
             <View style={styles.chartSection}>
                <SimpleLineChart data={data} color={priceChange >= 0 ? '#16a34a' : '#dc2626'} />
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
    </SafeAreaView>
  );
}

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
  errorContainer: { height: 200, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#6b7280', marginTop: 10, textAlign: 'center' },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, padding: 16, backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 16, borderWidth: 1, borderColor: '#224026' },
  statLabel: { color: '#a3a3a3', fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  infoBox: { padding: 16, backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)' },
  infoText: { color: '#9ca3af', fontSize: 12, lineHeight: 18, textAlign: 'center' }
});
