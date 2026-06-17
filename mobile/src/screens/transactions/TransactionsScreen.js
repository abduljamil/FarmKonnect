import { COLORS } from '../../constants/colors';
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, Tag, CheckCircle, Clock, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getMyTransactions } from '../../services/transactionService';
import { AuthContext } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';
import SegmentedControl from '../../components/ui/SegmentedControl';

export default function TransactionsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();
  const socket = useContext(SocketContext);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Web-parity filtering: by order status AND by role (buying/selling). Done
  // client-side over the already-fetched list.
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all'); // all | buyer | seller

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

  const myId = (user?._id || user?.id)?.toString();
  const STATUS_FILTERS = [
    ['all', 'filterAll'],
    ['pending', 'statusPending'],
    ['confirmed', 'statusConfirmed'],
    ['delivered', 'statusDelivered'],
    ['completed', 'statusCompleted'],
    ['cancelled', 'statusCancelled'],
  ];
  const ROLE_FILTERS = [
    ['all', 'roleAll'],
    ['buyer', 'roleBuying'],
    ['seller', 'roleSelling'],
  ];

  const filtered = transactions.filter((trx) => {
    const isBuyer = (trx.buyer?._id || trx.buyer)?.toString() === myId;
    if (roleFilter === 'buyer' && !isBuyer) return false;
    if (roleFilter === 'seller' && isBuyer) return false;
    if (statusFilter !== 'all' && trx.orderStatus !== statusFilter) return false;
    return true;
  });

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <AnimatedBlobs />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('mobile.activity.title')}</Text>
      </View>

      {/* Role filter (Buying / Selling) — labelled so its "All" doesn't read as
          a duplicate of the status row's "All". */}
      <Text style={styles.filterLabel}>{t('mobile.activity.roleLabel')}</Text>
      <SegmentedControl
        style={styles.segmentedFilter}
        value={roleFilter}
        onChange={setRoleFilter}
        options={ROLE_FILTERS.map(([val, key]) => ({ value: val, label: t(`mobile.activity.${key}`) }))}
      />

      {/* Status filter — wraps to a second row instead of scrolling horizontally */}
      <Text style={styles.filterLabel}>{t('mobile.activity.statusLabel')}</Text>
      <View style={styles.statusBar}>
        {STATUS_FILTERS.map(([val, key]) => (
          <TouchableOpacity
            key={val}
            style={[styles.filterTab, statusFilter === val && styles.filterTabActive]}
            onPress={() => setStatusFilter(val)}
          >
            <Text style={[styles.filterText, statusFilter === val && styles.filterTextActive]}>{t(`mobile.activity.${key}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(trx, idx) => trx?._id || `tx-${idx}`}
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
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
                      <Text style={[styles.statusText, { color: trx.orderStatus === 'completed' ? COLORS.primary : COLORS.warning }]}>
                        {trx.orderStatus.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.dateText}>{new Date(trx.createdAt).toLocaleDateString()}</Text>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.itemIconBox}>
                    <Tag color={COLORS.primary} size={24} />
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
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 20, paddingTop: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.white },
  filterLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 20, marginBottom: 6 },
  segmentedFilter: { marginHorizontal: 20, marginBottom: 16 },
  filterBar: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginBottom: 14, gap: 8 },
  statusBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, paddingHorizontal: 20 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border },
  filterTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 13 },
  filterTextActive: { color: COLORS.white },
  container: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  card: { backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleText: { fontSize: 10, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  dateText: { color: COLORS.textFaint, fontSize: 12 },
  cardBody: { flexDirection: 'row', alignItems: 'center' },
  itemIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(22, 163, 74, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemInfo: { flex: 1 },
  itemTitle: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  itemMeta: { color: COLORS.textMuted, fontSize: 13 },
  priceInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceValue: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { color: '#4b5563', fontSize: 16, marginTop: 16 }
});
