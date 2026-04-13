import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowLeft, Bell, TrendingUp, MessageCircle, AlertTriangle, CheckCircle } from 'lucide-react-native';

const notifications = [
  { id: '1', type: 'price_alert', title: 'Price Alert Triggered', text: 'Wheat has dropped to your target price of ₨ 4,000 / 40kg.', time: '10 mins ago', read: false },
  { id: '2', type: 'message', title: 'New Message', text: 'Ahmed Ali sent you a new message regarding your fertilizer order.', time: '1 hr ago', read: false },
  { id: '3', type: 'escrow', title: 'Escrow Released', text: 'Funds (₨ 9,600) have been released to your JazzCash account.', time: 'Yesterday', read: true },
  { id: '4', type: 'system', title: 'Welcome to FarmKonnect', text: 'Your account is ready! Complete your profile to start listing crops.', time: '2 days ago', read: true },
];

const getIcon = (type) => {
  switch (type) {
    case 'price_alert': return <TrendingUp color="#3b82f6" size={24} />;
    case 'message': return <MessageCircle color="#a855f7" size={24} />;
    case 'escrow': return <CheckCircle color="#16a34a" size={24} />;
    case 'system': return <Bell color="#fbbf24" size={24} />;
    default: return <Bell color="#a3a3a3" size={24} />;
  }
};

const getBgColor = (type) => {
  switch (type) {
    case 'price_alert': return 'rgba(59, 130, 246, 0.1)';
    case 'message': return 'rgba(168, 85, 247, 0.1)';
    case 'escrow': return 'rgba(22, 163, 74, 0.1)';
    case 'system': return 'rgba(251, 191, 36, 0.1)';
    default: return 'rgba(255, 255, 255, 0.1)';
  }
};

export default function NotificationsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {notifications.map((note) => (
          <TouchableOpacity key={note.id} style={[styles.card, !note.read && styles.cardUnread]}>
            <View style={[styles.iconBox, { backgroundColor: getBgColor(note.type) }]}>
              {getIcon(note.type)}
            </View>
            <View style={styles.textContent}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, !note.read && styles.titleUnread]}>{note.title}</Text>
                <Text style={styles.time}>{note.time}</Text>
              </View>
              <Text style={styles.message} numberOfLines={2}>{note.text}</Text>
            </View>
            {!note.read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  container: { padding: 20, paddingTop: 0 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 46, 29, 0.4)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#224026' },
  cardUnread: { backgroundColor: 'rgba(26, 46, 29, 0.8)', borderColor: '#16a34a' },
  iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  textContent: { flex: 1, paddingRight: 8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { color: '#d4d4d4', fontSize: 16, fontWeight: '500' },
  titleUnread: { color: '#fff', fontWeight: 'bold' },
  time: { color: '#6b7280', fontSize: 12 },
  message: { color: '#a3a3a3', fontSize: 14, lineHeight: 20 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a' }
});