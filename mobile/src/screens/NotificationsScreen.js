import { COLORS } from '../constants/colors';
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, TrendingUp, MessageCircle, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { getPriceAlerts, markAllAlertsSeen } from '../services/priceService';
import { SocketContext } from '../contexts/SocketContext';

// Render real notifications instead of the hardcoded mock list.
// Sources today:
//   - Triggered price alerts via GET /api/alerts (filtered to status=triggered)
//   - Live `price_alert_triggered` socket events for instant updates
// Future: extend with order/escrow events once mobile gets a unified
// notifications API on the backend.

const getIcon = (type) => {
  switch (type) {
    case 'price_alert': return <TrendingUp color={COLORS.info} size={24} />;
    case 'message':     return <MessageCircle color="#a855f7" size={24} />;
    case 'escrow':      return <CheckCircle color={COLORS.primary} size={24} />;
    case 'system':      return <Bell color={COLORS.warning} size={24} />;
    default:            return <Bell color={COLORS.textMuted} size={24} />;
  }
};

const getBgColor = (type) => {
  switch (type) {
    case 'price_alert': return 'rgba(59, 130, 246, 0.1)';
    case 'message':     return 'rgba(168, 85, 247, 0.1)';
    case 'escrow':      return 'rgba(22, 163, 74, 0.1)';
    case 'system':      return 'rgba(251, 191, 36, 0.1)';
    default:            return 'rgba(255, 255, 255, 0.1)';
  }
};

const formatRelative = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days} day${days === 1 ? '' : 's'} ago`;
  return d.toLocaleDateString();
};

const alertToNotification = (alert) => ({
  id: alert._id,
  type: 'price_alert',
  title: 'Price Alert Triggered',
  text: `${alert.commodity}${alert.variety ? ` (${alert.variety})` : ''} is now ₨${(alert.currentPrice || 0).toLocaleString()}` +
        ` — ${alert.condition === 'above' ? 'rose above' : 'dropped below'} ₨${(alert.targetPrice || 0).toLocaleString()}` +
        (alert.city ? ` in ${alert.city}` : ''),
  time: formatRelative(alert.triggeredAt),
  read: !!alert.seen,
});

export default function NotificationsScreen({ navigation }) {
  const socket = useContext(SocketContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getPriceAlerts();
      if (res.data?.success) {
        const triggered = (res.data.data || []).filter((a) => a.status === 'triggered');
        triggered.sort((a, b) => new Date(b.triggeredAt || 0) - new Date(a.triggeredAt || 0));
        setNotifications(triggered.map(alertToNotification));
      }
    } catch (err) {
      console.warn('Failed to load notifications', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Auto-clear the unread badge on the Dashboard the moment the user
    // opens this screen — matches the web's "alerts are seen as soon as
    // viewed" behaviour. We don't await it; failure is non-fatal.
    markAllAlertsSeen().catch(() => {});
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;
    const onTriggered = (payload) => {
      // Prepend the new alert; backend sends the same shape as `getPriceAlerts`
      // wrapped in { alert, ... } — accept either.
      const alert = payload?.alert || payload;
      if (!alert?._id) return;
      setNotifications((prev) => [alertToNotification(alert), ...prev.filter((n) => n.id !== alert._id)]);
    };
    socket.on('price_alert_triggered', onTriggered);
    return () => { socket.off('price_alert_triggered', onTriggered); };
  }, [socket]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationPress = (notification) => {
    if (notification.type === 'price_alert') {
      navigation.navigate('Main', { screen: 'Dashboard' });
    } else if (notification.type === 'message') {
      navigation.navigate('Main', { screen: 'Chat' });
    } else if (notification.type === 'escrow') {
      navigation.navigate('Main', { screen: 'Transactions' });
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.cardUnread]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={[styles.iconBox, { backgroundColor: getBgColor(item.type) }]}>
        {getIcon(item.type)}
      </View>
      <View style={styles.textContent}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, !item.read && styles.titleUnread]}>{item.title}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>{item.text}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AlertTriangle color={COLORS.textFaint} size={48} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>
                You'll see alerts here when your price targets are hit or when there's activity on your account.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  container: { padding: 20, paddingTop: 0 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 46, 29, 0.4)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardUnread: { backgroundColor: 'rgba(26, 46, 29, 0.8)', borderColor: COLORS.primary },
  iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  textContent: { flex: 1, paddingRight: 8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { color: '#d4d4d4', fontSize: 16, fontWeight: '500' },
  titleUnread: { color: COLORS.white, fontWeight: 'bold' },
  time: { color: COLORS.textFaint, fontSize: 12 },
  message: { color: COLORS.textMuted, fontSize: 14, lineHeight: 20 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  empty: { alignItems: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySubtitle: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
