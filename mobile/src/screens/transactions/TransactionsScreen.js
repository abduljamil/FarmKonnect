import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { ShoppingBag, Tag, CheckCircle, Clock, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { getMyTransactions } from '../../services/transactionService';
import { AuthContext } from '../../contexts/AuthContext';

const getStatusColor = (status) => {
  if (!status) return '#a3a3a3';
  switch(status.toLowerCase()) {
    case 'pending': return '#fbbf24'; // amber
    case 'confirmed': return '#3b82f6'; // blue
    case 'delivered': return '#a855f7'; // purple
    case 'completed': return '#22c55e'; // green
    case 'disputed': return '#ef4444'; // red
    case 'cancelled': return '#6b7280'; // gray
    default: return '#a3a3a3';
  }
};

const getStatusIcon = (status, color) => {
  if (!status) return <Clock size={14} color={color} />;
  switch(status.toLowerCase()) {
    case 'completed': return <CheckCircle size={14} color={color} />;
    case 'disputed': return <AlertTriangle size={14} color={color} />;
    default: return <Clock size={14} color={color} />;
  }
};

export default function TransactionsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState('buy');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = async () => {
    try {
      const res = await getMyTransactions();
      if (res.data && res.data.data) {
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, []);

  // Filter based on role: if tab is 'buy', user is the buyer. If 'sell', user is the seller.
  const filtered = transactions.filter(t => {
    if (!user) return false;
    const isBuyer = t.buyer && t.buyer._id === user._id;
    const isSeller = t.seller && t.seller._id === user._id;
    return tab === 'buy' ? isBuyer : isSeller;
  });

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabButton, tab === 'buy' && styles.tabActive]} onPress={() => setTab('buy')}>
          <ShoppingBag color={tab === 'buy' ? '#fff' : '#a3a3a3'} size={18} />
          <Text style={[styles.tabText, tab === 'buy' && styles.tabTextActive]}>Buying</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, tab === 'sell' && styles.tabActive]} onPress={() => setTab('sell')}>
          <Tag color={tab === 'sell' ? '#fff' : '#a3a3a3'} size={18} />
          <Text style={[styles.tabText, tab === 'sell' && styles.tabTextActive]}>Selling</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.listContainer} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
      >
        {loading ? (
          <ActivityIndicator color="#16a34a" size="large" style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <Text style={{ color: '#a3a3a3', textAlign: 'center', marginTop: 40 }}>No transactions found.</Text>
        ) : (
          filtered.map((trx) => (
            <TouchableOpacity 
              key={trx._id} 
              style={styles.card}
              onPress={() => navigation.navigate('TransactionDetail', { id: trx._id })}
            >
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.trxId}>{trx._id.substring(0, 8).toUpperCase()}</Text>
                  <Text style={styles.date}>{new Date(trx.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: getStatusColor(trx.status), backgroundColor: getStatusColor(trx.status) + '15' }]}>
                  {getStatusIcon(trx.status, getStatusColor(trx.status))}
                  <Text style={[styles.statusText, { color: getStatusColor(trx.status) }]}>{trx.status}</Text>
                </View>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.cardBottom}>
                <View style={styles.info}>
                  <Text style={styles.title}>{trx.listing?.title || 'Unknown Item'}</Text>
                  <Text style={styles.amount}>₨ {trx.totalAmount?.toLocaleString()}</Text>
                </View>
                <ChevronRight color="#6b7280" size={20} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  header: { padding: 20 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 12 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: 'rgba(26, 46, 29, 0.4)', borderRadius: 12, borderWidth: 1, borderColor: '#224026', gap: 8 },
  tabActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  tabText: { color: '#a3a3a3', fontSize: 16, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  listContainer: { padding: 20, paddingTop: 0 },
  card: { backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#224026' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  trxId: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  date: { color: '#a3a3a3', fontSize: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, gap: 6 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#224026', marginBottom: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  info: { flex: 1 },
  title: { color: '#e5e7eb', fontSize: 16, marginBottom: 4 },
  amount: { color: '#4ade80', fontSize: 16, fontWeight: 'bold' }
});
