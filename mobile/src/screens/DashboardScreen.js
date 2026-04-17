import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sun, CloudRain, Droplets, MapPin, Bell, Home, User, MessageCircle } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { getPrices } from '../services/priceService';
import { getWeather } from '../services/weatherService';
import * as Location from 'expo-location';
import AnimatedBlobs from '../components/ui/AnimatedBlobs';

const { width, height } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [prices, setPrices] = useState([]);
  const [pricesLoading, setPricesLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch Prices
        const priceRes = await getPrices();
        if (priceRes.data?.success) {
          setPrices(priceRes.data.data.slice(0, 4)); // Get top 4 prices
        }
      } catch (err) {
        console.error('Failed to fetch prices', err);
      } finally {
        setPricesLoading(false);
      }

      try {
        // Fetch Weather
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          // Default to a central location if denied
          const res = await getWeather(31.5204, 74.3587); // Lahore
          if (res.data?.success) setWeather(res.data.data);
        } else {
          let location = await Location.getCurrentPositionAsync({});
          const res = await getWeather(location.coords.latitude, location.coords.longitude);
          if (res.data?.success) setWeather(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch weather', err);
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      {/* Background Blobs */}
      <AnimatedBlobs />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning, {user?.name?.split(' ')[0] || 'Farmer'}!</Text>
            <Text style={styles.date}>{formatDate()}</Text>
          </View>
          <TouchableOpacity style={styles.notificationBtn} onPress={() => navigation.navigate('Notifications')}>
            <Bell color="#16a34a" size={24} />
            <View style={styles.badge} />
          </TouchableOpacity>
        </View>

        {/* Weather Widget */}
        <View style={styles.weatherCard}>
          {weatherLoading ? (
             <ActivityIndicator size="small" color="#16a34a" />
          ) : weather ? (
            <>
              <View style={styles.weatherTop}>
                <View style={styles.weatherLocation}>
                  <MapPin color="#a3a3a3" size={16} />
                  <Text style={styles.locationText}>{weather.location?.name || weather.location}, {weather.location?.country || ''}</Text>
                </View>
                <Sun color="#facc15" size={40} />
              </View>
              <Text style={styles.tempText}>{Math.round(weather.current?.temp || weather.current?.temp_c)}°C</Text>
              <Text style={styles.weatherCondition}>{weather.current?.condition?.text || weather.current?.condition}</Text>
              
              <View style={styles.weatherDetails}>
                <View style={styles.weatherDetailItem}>
                  <CloudRain color="#60a5fa" size={20} />
                  <Text style={styles.weatherDetailText}>{weather.current?.precip_in || 0} in</Text>
                </View>
                <View style={styles.weatherDetailItem}>
                  <Droplets color="#60a5fa" size={20} />
                  <Text style={styles.weatherDetailText}>{weather.current?.humidity}% Humidity</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={{ color: '#a3a3a3' }}>Weather data unavailable.</Text>
          )}
        </View>

        {/* Market Insights - Quick Overview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Market Insights</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PriceTrends')}>
            <Text style={styles.seeAllText}>View Trends</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 30 }} contentContainerStyle={{ gap: 16 }}>
          {pricesLoading ? (
             <ActivityIndicator size="small" color="#16a34a" />
          ) : prices.length > 0 ? (
            prices.map((p, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.marketCard}
                onPress={() => navigation.navigate('PriceTrends', { initialCommodity: p.commodity })}
              >
                <Text style={styles.marketItem}>{p.commodity}</Text>
                <Text style={styles.marketPrice}>₨ {p.price?.toLocaleString()}/{p.unit}</Text>
                <View style={styles.trendRow}>
                  <Text style={[styles.trendUp, { fontSize: 14, color: p.change >= 0 ? '#16a34a' : '#ef4444' }]}>
                    {p.change !== undefined && p.change !== null ? (p.change >= 0 ? '▲' : '▼') + ` ${Math.abs(p.change)}%` : 'Today'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{ color: '#a3a3a3' }}>No market insights available right now.</Text>
          )}
        </ScrollView>

        {/* Action Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CreateListing')}>
            <Text style={styles.actionText}>Add Listing</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Transactions')}>
            <Text style={styles.actionText}>View Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Conversations')}>
            <Text style={styles.actionText}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('PriceTrends')}>
            <Text style={styles.actionText}>Price Trends</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Marketplace')}>
            <Text style={styles.actionText}>Marketplace</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  container: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  date: { fontSize: 14, color: '#a3a3a3', marginTop: 4 },
  notificationBtn: { padding: 10, backgroundColor: '#1a2e1d', borderRadius: 12, position: 'relative' },
  badge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  weatherCard: {
    padding: 24, borderRadius: 20, backgroundColor: 'rgba(26, 46, 29, 0.8)',
    borderWidth: 1, borderColor: '#224026', marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20,
  },
  weatherTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weatherLocation: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { color: '#a3a3a3', fontSize: 16, fontWeight: '500' },
  tempText: { fontSize: 48, fontWeight: '900', color: '#fff', marginVertical: 8 },
  weatherCondition: { color: '#16a34a', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  weatherDetails: { flexDirection: 'row', gap: 20, borderTopWidth: 1, borderTopColor: '#224026', paddingTop: 16 },
  weatherDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weatherDetailText: { color: '#e5e5e5', fontSize: 14, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  seeAllText: { color: '#16a34a', fontSize: 14, fontWeight: '600' },
  marketRow: { flexDirection: 'row', gap: 16, marginBottom: 30 },
  marketCard: { width: 140, padding: 16, backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 16, borderWidth: 1, borderColor: '#224026' },
  marketItem: { color: '#a3a3a3', fontSize: 14, fontWeight: '500', marginBottom: 8 },
  marketPrice: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendUp: { color: '#16a34a', fontSize: 14, fontWeight: '600' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  actionBtn: { width: '47%', padding: 16, backgroundColor: '#1a2e1d', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#224026' },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});
