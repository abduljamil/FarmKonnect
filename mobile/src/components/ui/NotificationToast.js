import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bell, Package, TrendingUp } from 'lucide-react-native';
import { SocketContext } from '../../contexts/SocketContext';
import { navigationRef } from '../../navigation/navigationRef';
import { COLORS } from '../../constants/colors';

// In-app real-time notification toast. Mirrors the web Navbar's notification
// dropdown by listening to the same socket events the backend emits
// (newOrder / orderStatusUpdate / price_alert_triggered) and surfacing a
// tappable banner. Push notifications cover the app-backgrounded case; this
// covers the in-foreground case the mobile app previously ignored.
const TOP_OFFSET = Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 24) + 8;

export default function NotificationToast() {
  const socket = useContext(SocketContext);
  const { t } = useTranslation();
  const [toast, setToast] = useState(null); // { title, body, icon, route, params }
  const slide = useRef(new Animated.Value(-160)).current;
  const hideTimer = useRef(null);

  const dismiss = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.timing(slide, { toValue: -160, duration: 200, useNativeDriver: true })
      .start(() => setToast(null));
  };

  useEffect(() => {
    if (!socket) return;

    const show = (next) => {
      setToast(next);
      Animated.timing(slide, { toValue: 0, duration: 250, useNativeDriver: true }).start();
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(dismiss, 4500);
    };

    const onNewOrder = (d) => show({
      title: t('mobile.notif.newOrder'),
      body: d?.listingTitle
        ? `${d.listingTitle}${d.amount ? ` — ₨ ${Number(d.amount).toLocaleString()}` : ''}`
        : '',
      icon: 'order',
      route: 'TransactionDetail',
      params: d?.transactionId ? { id: d.transactionId } : undefined,
    });
    const onOrderUpdate = (d) => show({
      title: t('mobile.notif.orderUpdate'),
      body: [d?.listingTitle, d?.newStatus].filter(Boolean).join(' — '),
      icon: 'order',
      route: 'TransactionDetail',
      params: d?.transactionId ? { id: d.transactionId } : undefined,
    });
    const onAlert = (d) => show({
      title: t('mobile.notif.priceAlert'),
      body: d?.commodity
        ? `${d.commodity}${d.targetPrice ? ` @ ₨ ${Number(d.targetPrice).toLocaleString()}` : ''}`
        : (d?.message || ''),
      icon: 'alert',
      route: 'Notifications',
    });

    socket.on('newOrder', onNewOrder);
    socket.on('orderStatusUpdate', onOrderUpdate);
    socket.on('price_alert_triggered', onAlert);
    return () => {
      socket.off('newOrder', onNewOrder);
      socket.off('orderStatusUpdate', onOrderUpdate);
      socket.off('price_alert_triggered', onAlert);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [socket]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePress = () => {
    if (toast?.route && navigationRef.isReady()) {
      try { navigationRef.navigate(toast.route, toast.params); } catch { /* ignore */ }
    }
    dismiss();
  };

  if (!toast) return null;

  const Icon = toast.icon === 'order' ? Package : toast.icon === 'alert' ? TrendingUp : Bell;

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY: slide }] }]} pointerEvents="box-none">
      <TouchableOpacity style={styles.toast} activeOpacity={0.92} onPress={handlePress}>
        <Icon color={COLORS.primary} size={22} />
        <Text style={styles.body} numberOfLines={1}>
          <Text style={styles.title}>{toast.title}</Text>
          {toast.body ? `  ${toast.body}` : ''}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: TOP_OFFSET,
    left: 12,
    right: 12,
    zIndex: 1000,
    elevation: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  title: { color: COLORS.white, fontWeight: 'bold' },
  body: { flex: 1, color: COLORS.gray300, fontSize: 14 },
});
