import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, Tag, CheckCircle, Clock, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getMyTransactions } from '../../services/transactionService';
import { AuthContext } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';

export default function TransactionsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();
  const socket = useContext(SocketContext);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, completed

  const fetchTransactions = async () => {
    try {
      const res = await getMyTransactions();
      if (res.data && res.data.success) {
        setTransactions(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Real-time order updates — was missing. Web subscribes to orderStatusUpdate
  // + newOrder; without this, sellers had to manually pull-to-refresh to see
  // a new order land.
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchTransactions();
    socket.on('orderStatusUpdate', refresh);
    socket.on('newOrder', refresh);
    return () => {
      socket.off('orderStatusUpdate', refresh);
      socket.off('newOrder', refresh);
    };
  }, [socket]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, []);

  const filtered = transactions.filter(trx => {
    if (filter === 'all') return true;
    if (filter === 'pending') return ['pending', 'confirmed'].includes(trx.orderStatus);
    if (filter === 'completed') return trx.orderStatus === 'completed';
    return true;
  });

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <AnimatedBlobs />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('mobile.activity.title')}</Text>
      </View>

      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>{t('mobile.activity.filterAll')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>{t('mobile.activity.filterActive')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>{t('mobile.activity.filterHistory')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(trx, idx) => trx?._id || `tx-${idx}`}
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package color="#3d3d3d" size={60} />
              <Text style={styles.emptyText}>{t('mobile.activity.empty')}</Text>
            </View>
          }
          renderItem={({ item: trx }) => {
            const isBuyer = (user?._id || user?.id)?.toString() === (trx.buyer?._id || trx.buyer)?.toString();
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('TransactionDetail', { id: trx._id })}
              >
                <View style={styles.cardTop}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.roleBadge, { backgroundColor: isBuyer ? 'rgba(59, 130, 246, 0.1)' : 'rgba(168, 85, 247, 0.1)' }]}>
                      <Text style={[styles.roleText, { color: isBuyer ? '#60a5fa' : '#a855f7' }]}>{isBuyer ? t('mobile.activity.buying') : t('mobile.activity.selling')}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: trx.orderStatus === 'completed' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(251, 191, 36, 0.1)' }]}>
                      <Text style={[styles.statusText, { color: trx.orderStatus === 'completed' ? '#16a34a' : '#fbbf24' }]}>
                        {trx.orderStatus.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.dateText}>{new Date(trx.createdAt).toLocaleDateString()}</Text>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.itemIconBox}>
                    <Tag color="#16a34a" size={24} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{trx.listing?.title || t('mobile.activity.marketItem')}</Text>
                    <Text style={styles.itemMeta}>{trx.quantity} {trx.listing?.unit || t('mobile.activity.units')} • {trx.paymentMethod.toUpperCase()}</Text>
                  </View>
                  <View style={styles.priceInfo}>
                    <Text style={styles.priceValue}>₨ {trx.amount?.toLocaleString()}</Text>
                    <ChevronRight color="#4b5563" size={20} />
                  </View>
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
  header: { padding: 20, paddingTop: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  filterBar: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 12 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(26, 46, 29, 0.6)', borderWidth: 1, borderColor: '#224026' },
  filterTabActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  filterText: { color: '#a3a3a3', fontWeight: '600', fontSize: 13 },
  filterTextActive: { color: '#fff' },
  container: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  card: { backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#224026' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#224026', paddingBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleText: { fontSize: 10, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  dateText: { color: '#6b7280', fontSize: 12 },
  cardBody: { flexDirection: 'row', alignItems: 'center' },
  itemIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(22, 163, 74, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemInfo: { flex: 1 },
  itemTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  itemMeta: { color: '#a3a3a3', fontSize: 13 },
  priceInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceValue: { color: '#16a34a', fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { color: '#4b5563', fontSize: 16, marginTop: 16 }
});
