import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { ArrowLeft, CheckCircle, ShieldAlert, PackageCheck, AlertTriangle } from 'lucide-react-native';
import { getTransaction, confirmDelivery, confirmOrder, markDelivered, completeTransaction, raiseDispute } from '../../services/transactionService';
import { AuthContext } from '../../contexts/AuthContext';

export default function TransactionDetailScreen({ navigation, route }) {
  const { id } = route.params || {};
  const { user } = useContext(AuthContext);
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTransaction = async () => {
    try {
      if (id) {
        const res = await getTransaction(id);
        if (res.data && res.data.data) {
          setTransaction(res.data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch transaction', error);
      Alert.alert('Error', 'Could not load transaction details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransaction();
  }, [id]);

  const handleAction = async (actionFn, actionName) => {
    Alert.alert(`Confirm ${actionName}`, `Are you sure you want to ${actionName.toLowerCase()}?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Proceed', 
        onPress: async () => {
          setLoading(true);
          try {
            await actionFn(id);
            Alert.alert('Success', `Action ${actionName} completed.`);
            fetchTransaction(); // refresh
          } catch (error) {
             Alert.alert('Error', error.response?.data?.message || 'Failed to complete action');
             setLoading(false);
          }
        }
      }
    ]);
  };

  if (loading || !transaction) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#16a34a" />
      </SafeAreaView>
    );
  }

  const isBuyer = user && transaction.buyer && transaction.buyer._id === user._id;
  const isSeller = user && transaction.seller && transaction.seller._id === user._id;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.statusBanner}>
          <PackageCheck color="#fbbf24" size={28} />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Status: {transaction.status}</Text>
            <Text style={styles.statusDesc}>
              {transaction.status === 'pending' ? 'Awaiting order confirmation.' : 
               transaction.status === 'confirmed' ? 'Order confirmed. Awaiting delivery.' :
               transaction.status === 'delivered' ? 'Order delivered. Awaiting final payment/completion.' :
               'Transaction ' + transaction.status}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Transaction ID</Text>
            <Text style={styles.value}>{transaction._id.substring(0, 8).toUpperCase()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Item</Text>
            <Text style={styles.value}>{transaction.listing?.title || 'Unknown'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Amount</Text>
            <Text style={[styles.value, { color: '#4ade80', fontWeight: 'bold' }]}>₨ {transaction.totalAmount?.toLocaleString()}</Text>
          </View>
          {isBuyer && (
            <View style={styles.row}>
              <Text style={styles.label}>Seller</Text>
              <Text style={styles.value}>{transaction.seller?.name}</Text>
            </View>
          )}
          {isSeller && (
            <View style={styles.row}>
              <Text style={styles.label}>Buyer</Text>
              <Text style={styles.value}>{transaction.buyer?.name}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.value}>{transaction.paymentMethod}</Text>
          </View>
        </View>

        <View style={styles.escrowBox}>
          <ShieldAlert color="#16a34a" size={24} />
          <View style={styles.escrowTextCol}>
            <Text style={styles.escrowTitle}>Escrow Protection Active</Text>
            <Text style={styles.escrowDesc}>Your funds/assets are securely tracked. Confirmations require both parties to proceed.</Text>
          </View>
        </View>

        <View style={styles.actionGroup}>
          {isSeller && transaction.status === 'pending' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAction(confirmOrder, 'Confirm Order')}>
              <CheckCircle color="#fff" size={20} />
              <Text style={styles.primaryBtnText}>Confirm Order</Text>
            </TouchableOpacity>
          )}

          {isSeller && transaction.status === 'confirmed' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAction(markDelivered, 'Mark Delivered')}>
              <CheckCircle color="#fff" size={20} />
              <Text style={styles.primaryBtnText}>Mark Delivered</Text>
            </TouchableOpacity>
          )}

          {isBuyer && transaction.status === 'delivered' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAction(confirmDelivery, 'Confirm Delivery')}>
              <CheckCircle color="#fff" size={20} />
              <Text style={styles.primaryBtnText}>Confirm Delivery</Text>
            </TouchableOpacity>
          )}

          {/* Dispute Action for active orders */}
          {['pending', 'confirmed', 'delivered'].includes(transaction.status) && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleAction(raiseDispute, 'Raise Dispute')}>
              <AlertTriangle color="#fbbf24" size={20} />
              <Text style={styles.secondaryBtnText}>Raise Dispute</Text>
            </TouchableOpacity>
          )}
        </View>
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
  statusBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#fbbf24', marginBottom: 20 },
  statusTextContainer: { marginLeft: 16, flex: 1 },
  statusTitle: { color: '#fbbf24', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  statusDesc: { color: '#f3f4f6', fontSize: 13 },
  card: { backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#224026' },
  sectionTitle: { color: '#a3a3a3', fontSize: 14, fontWeight: '600', marginBottom: 16, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { color: '#a3a3a3', fontSize: 15 },
  value: { color: '#fff', fontSize: 15, fontWeight: '500' },
  escrowBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(22, 163, 74, 0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#16a34a', marginBottom: 20 },
  escrowTextCol: { marginLeft: 16, flex: 1 },
  escrowTitle: { color: '#16a34a', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  escrowDesc: { color: '#e5e7eb', fontSize: 13, lineHeight: 20 },
  timeline: { backgroundColor: 'rgba(26, 46, 29, 0.4)', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#224026' },
  timelineItem: { flexDirection: 'row', paddingBottom: 24, borderLeftWidth: 2, borderColor: '#16a34a', paddingLeft: 20, position: 'relative' },
  dot: { position: 'absolute', left: -7, top: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#16a34a' },
  timelineText: { color: '#fff', fontSize: 14, fontWeight: '500', top: -3 },
  timelinePending: { borderColor: '#374151' },
  dotPending: { backgroundColor: '#374151' },
  timelineTextPending: { color: '#6b7280', fontSize: 14, fontWeight: '500', top: -3 },
  actionGroup: { gap: 12, marginBottom: 40 },
  primaryBtn: { backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 12, gap: 8 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryBtn: { backgroundColor: 'rgba(251, 191, 36, 0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.5)' },
  secondaryBtnText: { color: '#fbbf24', fontSize: 16, fontWeight: 'bold' }
});
