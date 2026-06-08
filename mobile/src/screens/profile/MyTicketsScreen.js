import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, ChevronRight, Inbox } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getMyTickets } from '../../services/supportService';

// Lists the signed-in user's support tickets. Backend route:
// GET /api/support/tickets  (protected)
const STATUS_COLOR = {
  open:      { bg: 'rgba(251, 191, 36, 0.1)', fg: '#fbbf24' },
  in_progress: { bg: 'rgba(59, 130, 246, 0.1)', fg: '#60a5fa' },
  pending:   { bg: 'rgba(168, 85, 247, 0.1)', fg: '#a855f7' },
  resolved:  { bg: 'rgba(22, 163, 74, 0.1)', fg: '#16a34a' },
  closed:    { bg: 'rgba(107, 114, 128, 0.15)', fg: '#9ca3af' },
};

export default function MyTicketsScreen({ navigation }) {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const res = await getMyTickets();
      setTickets(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to load tickets', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetch();
  }, [fetch]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Tickets</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Support')}>
          <Plus color="#16a34a" size={24} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(t) => t._id}
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Inbox color="#3d3d3d" size={56} />
              <Text style={styles.emptyTitle}>No tickets yet</Text>
              <Text style={styles.emptySub}>Tap + to submit a support request.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const col = STATUS_COLOR[item.status] || STATUS_COLOR.open;
            const lastMsg = item.messages?.[item.messages.length - 1];
            const lastWhen = (item.lastResponseAt || item.updatedAt || item.createdAt);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('TicketDetail', { id: item._id })}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: col.bg }]}>
                    <Text style={[styles.statusText, { color: col.fg }]}>{(item.status || 'open').replace('_', ' ')}</Text>
                  </View>
                </View>
                {lastMsg?.content ? (
                  <Text style={styles.preview} numberOfLines={2}>
                    {lastMsg.sender === 'admin' ? '🛠 ' : ''}{lastMsg.content}
                  </Text>
                ) : null}
                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>
                    {lastWhen ? new Date(lastWhen).toLocaleDateString() : ''}
                  </Text>
                  <ChevronRight color="#4b5563" size={18} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  container: { padding: 20, paddingTop: 0 },
  card: { backgroundColor: 'rgba(26, 46, 29, 0.5)', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#224026' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subject: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1, marginRight: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  preview: { color: '#d4d4d4', fontSize: 13, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  dateText: { color: '#6b7280', fontSize: 12 },
  emptyWrap: { alignItems: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySub: { color: '#a3a3a3', fontSize: 14, marginTop: 8 },
});
