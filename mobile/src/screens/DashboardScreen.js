import { COLORS } from '../constants/colors';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, StatusBar, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Droplets, Wind, MapPin, Bell, Home, User, MessageCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getPrices } from '../services/priceService';
import { getWeather, getWeatherForecast } from '../services/weatherService';
import { getPriceAlerts } from '../services/priceService';
import { getMyListings } from '../services/listingService';
import { getMyTransactions } from '../services/transactionService';
import { getUnreadCount } from '../services/chatService';
import * as Location from 'expo-location';
import AnimatedBlobs from '../components/ui/AnimatedBlobs';
import KisanFAB from '../components/ui/KisanFAB';
import MarketOutlookCard from '../components/ui/MarketOutlookCard';

// Pick a weather icon from the OpenWeatherMap condition string the backend
// returns. Falls back to Sun. Previously the dashboard always rendered Sun
// regardless of the real condition.
const conditionIcon = (condition, size = 40) => {
  const c = String(condition || '').toLowerCase();
  if (c.includes('thunder'))  return <CloudLightning color={COLORS.warning} size={size} />;
  if (c.includes('drizzle'))  return <CloudDrizzle color="#60a5fa" size={size} />;
  if (c.includes('rain'))     return <CloudRain color="#60a5fa" size={size} />;
  if (c.includes('snow'))     return <CloudSnow color="#bfdbfe" size={size} />;
  if (c.includes('cloud'))    return <Cloud color="#cbd5e1" size={size} />;
  return <Sun color="#facc15" size={size} />;
};

// Market prices come back with a redundant "Rs/..." unit (e.g. "Rs/40Kg (Maund)").
// The card already renders the ₨ price, so strip the "Rs/" prefix and tidy the
// label so it fits on one line instead of wrapping to "₨ 12,500/Rs/40Kg (Maund)".
const cleanUnit = (unit) => {
  if (!unit) return '';
  const u = String(unit).replace(/^Rs\s*\//i, '').replace('(Maund)', 'Maund').trim();
  return u ? `/ ${u}` : '';
};

const { width, height } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [forecast, setForecast] = useState([]);
  const [prices, setPrices] = useState([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [stats, setStats] = useState({ myListings: 0, unreadMessages: 0, activeAlerts: 0, transactions: 0 });

  // Greeting that actually changes with the time of day instead of being
  // hardcoded "Good Morning".
  const greetingKey = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'dashboard.greeting.morning';
    if (h < 17) return 'dashboard.greeting.afternoon';
    return 'dashboard.greeting.evening';
  })();

  // Hide the floating Kisan FAB while scrolling down; bring it back on scroll-up
  // so it never sits on top of the cards/forecast the user is reading.
  const fabAnim = useRef(new Animated.Value(0)).current; // 0 = shown, 1 = hidden
  const lastScrollY = useRef(0);
  const fabHidden = useRef(false);
  const onDashScroll = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - lastScrollY.current;
    lastScrollY.current = y;
    if (dy > 6 && !fabHidden.current && y > 60) {
      fabHidden.current = true;
      Animated.timing(fabAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else if (dy < -6 && fabHidden.current) {
      fabHidden.current = false;
      Animated.timing(fabAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  };
  const fabStyle = {
    opacity: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    // Translate far enough that the whole thing — button, pulsing ring, and the
    // green glow/shadow — clears the screen (it ends up behind the opaque tab
    // bar), so no part of the effect lingers when hidden.
    transform: [{ translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 220] }) }],
  };

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
        // Fetch Weather. The backend looks up coordinates from a hardcoded
        // Pakistan-city map and ignores raw lat/lon, so we reverse-geocode
        // the user's GPS to a city name first. If location permission is
        // denied we default to Lahore (the user's most likely city given
        // the app's audience).
        let city = 'Lahore';
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status === 'granted') {
          try {
            const loc = await Location.getCurrentPositionAsync({});
            const geo = await Location.reverseGeocodeAsync({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
            const guessed = geo?.[0]?.city || geo?.[0]?.subregion;
            if (guessed) city = guessed;
          } catch {
            // Stick with Lahore if reverse-geocode fails.
          }
        }
        const res = await getWeather(city);
        if (res.data?.success) setWeather(res.data.data);

        // 5-day forecast — non-fatal if it fails (current weather still shows).
        try {
          const fc = await getWeatherForecast(city);
          if (fc.data?.success) {
            // Backend returns `data.forecast: [{ date, day, temp, condition, icon, ... }, ...]`.
            const list = fc.data.data?.forecast || fc.data.data || [];
            setForecast(Array.isArray(list) ? list.slice(0, 5) : []);
          }
        } catch { /* non-fatal */ }
      } catch (err) {
        console.warn('Failed to fetch weather', err.message);
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchDashboardData();

    // Real notification badge count — was a hardcoded red dot. We count
    // alerts in 'triggered' status that the user hasn't marked seen yet.
    const fetchUnread = async () => {
      try {
        const res = await getPriceAlerts();
        const list = res.data?.data || [];
        const count = list.filter((a) => a.status === 'triggered' && !a.seen).length;
        setUnreadAlerts(count);
      } catch {
        setUnreadAlerts(0);
      }
    };
    fetchUnread();

    // Dashboard stats — match web's QuickStatsGrid (My Listings, Messages,
    // Active Alerts, Transactions). All four calls are best-effort; a 401
    // on any of them shouldn't blank out the others.
    const fetchStats = async () => {
      const next = { myListings: 0, unreadMessages: 0, activeAlerts: 0, transactions: 0 };
      try { const r = await getMyListings();      next.myListings      = (r.data?.data || []).length; } catch {}
      try { const r = await getUnreadCount();     next.unreadMessages  = r.data?.data?.count || 0;     } catch {}
      try { const r = await getPriceAlerts();     next.activeAlerts    = (r.data?.data || []).filter(a => a.status === 'active').length; } catch {}
      try { const r = await getMyTransactions();  next.transactions    = (r.data?.data || []).length; } catch {}
      setStats(next);
    };
    fetchStats();
  }, []);

  const formatDate = () => {
    // Match the active i18n language so dates render in Urdu where appropriate.
    const locale = i18n.language === 'ur' ? 'ur-PK' : 'en-US';
    return new Date().toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      {/* Background Blobs */}
      <AnimatedBlobs />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} onScroll={onDashScroll} scrollEventThrottle={16}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {t(greetingKey)}, {user?.name?.split(' ')[0] || t('common.unknown')}!
            </Text>
            <Text style={styles.date}>{formatDate()}</Text>
          </View>
          <TouchableOpacity style={styles.notificationBtn} onPress={() => navigation.navigate('Notifications')}>
            <Bell color={COLORS.primary} size={24} />
            {unreadAlerts > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadAlerts > 9 ? '9+' : String(unreadAlerts)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Attention strip — consolidates what the user should act on
            (unread messages + triggered price alerts), mirroring web. */}
        {(stats.unreadMessages > 0 || unreadAlerts > 0) && (
          <View style={styles.attentionStrip}>
            {stats.unreadMessages > 0 && (
              <TouchableOpacity style={styles.attentionChip} onPress={() => navigation.navigate('Conversations')}>
                <MessageCircle color="#60a5fa" size={16} />
                <Text style={styles.attentionChipText}>{t('mobile.attention.messages', { count: stats.unreadMessages })}</Text>
              </TouchableOpacity>
            )}
            {unreadAlerts > 0 && (
              <TouchableOpacity style={styles.attentionChip} onPress={() => navigation.navigate('Notifications')}>
                <Bell color={COLORS.warning} size={16} />
                <Text style={styles.attentionChipText}>{t('mobile.attention.alerts', { count: unreadAlerts })}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Weather Widget — backend returns:
              { location: "Lahore, Punjab",  // string
                current: { temp, feelsLike, humidity, wind, condition, description, icon } }
            Previously the dashboard tried to read .location.name (always undefined,
            yielded "Lahore, Punjab, " with trailing comma) and .current.precip_in
            (doesn't exist, hardcoded to "0 in"). Both fixed below. */}
        <View style={styles.weatherCard}>
          {weatherLoading ? (
             <ActivityIndicator size="small" color={COLORS.primary} />
          ) : weather ? (
            <>
              <View style={styles.weatherTop}>
                <View style={styles.weatherLocation}>
                  <MapPin color={COLORS.textMuted} size={16} />
                  <Text style={styles.locationText}>{weather.location || 'Lahore'}</Text>
                </View>
                {conditionIcon(weather.current?.condition || weather.current?.description, 40)}
              </View>
              <Text style={styles.tempText}>
                {Math.round(weather.current?.temp ?? weather.current?.feelsLike ?? 0)}°C
              </Text>
              <Text style={styles.weatherCondition}>
                {weather.current?.description || weather.current?.condition || ''}
              </Text>

              <View style={styles.weatherDetails}>
                <View style={styles.weatherDetailItem}>
                  <Wind color="#60a5fa" size={20} />
                  <Text style={styles.weatherDetailText}>{weather.current?.wind ?? 0} km/h</Text>
                </View>
                <View style={styles.weatherDetailItem}>
                  <Droplets color="#60a5fa" size={20} />
                  <Text style={styles.weatherDetailText}>{weather.current?.humidity ?? 0}% Humidity</Text>
                </View>
              </View>

              {weather.farmingTip ? (
                <Text style={styles.farmingTip} numberOfLines={2}>💡 {weather.farmingTip}</Text>
              ) : null}
            </>
          ) : (
            <Text style={{ color: COLORS.textMuted }}>{t('mobile.common.noData')}</Text>
          )}
        </View>

        {/* Market Outlook — Buy/Hold/Sell-style forecast signal (web parity) */}
        <MarketOutlookCard navigation={navigation} />

        {/* 5-day forecast strip — only renders when the backend returned a
            forecast array. Each chip shows the day label, condition icon
            picked from the same conditionIcon() helper as the main card,
            and the predicted temperature. */}
        {forecast.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.forecastLabel}>{t('mobile.weather.forecastTitle')}</Text>
            <View style={styles.forecastRow}>
              {forecast.map((d, i) => {
                // Backend returns { day, high, low, condition }. The old code read
                // d.temp/d.maxTemp (which don't exist) → every day showed 0°.
                const high = d.high ?? d.temp ?? d.maxTemp;
                const low = d.low ?? d.minTemp;
                return (
                  <View key={d.date || i} style={styles.forecastChip}>
                    <Text style={styles.forecastDay}>{d.day || (d.date ? new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' }) : '')}</Text>
                    <View style={{ marginVertical: 8 }}>{conditionIcon(d.condition || d.description, 24)}</View>
                    <View style={styles.forecastTempRow}>
                      <Text style={styles.forecastHigh}>{high != null ? `${Math.round(high)}°` : '—'}</Text>
                      {low != null && <Text style={styles.forecastLow}>{Math.round(low)}°</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Quick stats grid — mirrors web's QuickStatsGrid component on the
            dashboard (counts of My Listings / Messages / Alerts / Orders). */}
        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('MyListings')}>
            <Text style={styles.statValue}>{stats.myListings}</Text>
            <Text style={styles.statLabel}>{t('marketplace.myListings')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Conversations')}>
            <Text style={styles.statValue}>{stats.unreadMessages}</Text>
            <Text style={styles.statLabel}>{t('nav.messages')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('PriceAlerts')}>
            <Text style={styles.statValue}>{stats.activeAlerts}</Text>
            <Text style={styles.statLabel}>{t('nav.priceAlerts')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Transactions')}>
            <Text style={styles.statValue}>{stats.transactions}</Text>
            <Text style={styles.statLabel}>{t('nav.orders')}</Text>
          </TouchableOpacity>
        </View>

        {/* Market Insights - Quick Overview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('priceChart.title')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PriceTrends')}>
            <Text style={styles.seeAllText}>{t('mobile.common.viewAll')}</Text>
          </TouchableOpacity>
        </View>

        {pricesLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginBottom: 30 }} />
        ) : prices.length > 0 ? (
          <View style={styles.marketGrid}>
            {prices.map((p, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.marketCard}
                onPress={() => navigation.navigate('PriceTrends', { initialCommodity: p.commodity })}
              >
                <Text style={styles.marketItem} numberOfLines={1}>{p.commodity}</Text>
                <Text style={styles.marketPrice} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>₨ {p.price?.toLocaleString()}</Text>
                <Text style={styles.marketUnit} numberOfLines={1}>{cleanUnit(p.unit)}</Text>
                <View style={styles.trendRow}>
                  <Text style={[styles.trendUp, { fontSize: 14, color: p.change >= 0 ? COLORS.primary : COLORS.danger }]}>
                    {p.change !== undefined && p.change !== null ? (p.change >= 0 ? '▲' : '▼') + ` ${Math.abs(p.change)}%` : t('weather.today')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={{ color: COLORS.textMuted, marginBottom: 30 }}>{t('priceChart.noData')}</Text>
        )}

        {/* Action Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('dashboard.quickActions.title')}</Text>
        </View>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CreateListing')}>
            <Text style={styles.actionText}>{t('marketplace.addListing')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Transactions')}>
            <Text style={styles.actionText}>{t('nav.orders')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Conversations')}>
            <Text style={styles.actionText}>{t('nav.messages')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('PriceTrends')}>
            <Text style={styles.actionText}>{t('nav.priceTrends')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Marketplace')}>
            <Text style={styles.actionText}>{t('nav.marketplace')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <KisanFAB animatedStyle={fabStyle} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  // Extra bottom padding so the floating KisanFAB doesn't sit on top of the
  // last Quick Actions row on short screens.
  container: { padding: 20, paddingBottom: 96 },
  // gap keeps the greeting clear of the bell; headerText flexes so a long
  // greeting shrinks/ellipsises instead of colliding with the notification btn.
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12 },
  headerText: { flex: 1, minWidth: 0 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: COLORS.white },
  date: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  notificationBtn: { padding: 10, backgroundColor: '#1a2e1d', borderRadius: 12, position: 'relative', flexShrink: 0 },
  badge: { position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: 'bold' },
  attentionStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  attentionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(26, 46, 29, 0.6)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  attentionChipText: { color: COLORS.gray300, fontSize: 13, fontWeight: '600' },
  weatherCard: {
    padding: 24, borderRadius: 20, backgroundColor: 'rgba(26, 46, 29, 0.8)',
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 30, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20,
  },
  weatherTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weatherLocation: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { color: COLORS.textMuted, fontSize: 16, fontWeight: '500' },
  tempText: { fontSize: 48, fontWeight: '900', color: COLORS.white, marginVertical: 8 },
  weatherCondition: { color: COLORS.primary, fontSize: 16, fontWeight: '600', marginBottom: 16 },
  weatherDetails: { flexDirection: 'row', gap: 20, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 16 },
  weatherDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weatherDetailText: { color: '#e5e5e5', fontSize: 14, fontWeight: '500' },
  farmingTip: { color: '#a3e635', fontSize: 12, marginTop: 14, fontStyle: 'italic', lineHeight: 18 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '47%', backgroundColor: 'rgba(26, 46, 29, 0.6)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  statValue: { color: COLORS.primary, fontSize: 26, fontWeight: '900' },
  statLabel: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  forecastLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  forecastRow: { flexDirection: 'row', gap: 8 },
  forecastChip: { flex: 1, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 14, backgroundColor: 'rgba(26, 46, 29, 0.5)', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  forecastDay: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  forecastTempRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  forecastHigh: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  forecastLow: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  seeAllText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  marketRow: { flexDirection: 'row', gap: 16, marginBottom: 30 },
  marketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 30 },
  marketCard: { width: '47%', padding: 16, backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  marketItem: { color: COLORS.textMuted, fontSize: 14, fontWeight: '500', marginBottom: 8 },
  marketPrice: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  marketUnit: { color: COLORS.textFaint, fontSize: 12, marginTop: 2, marginBottom: 8 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendUp: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  actionBtn: { width: '47%', padding: 16, backgroundColor: '#1a2e1d', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  actionText: { color: COLORS.white, fontSize: 14, fontWeight: '600' }
});
