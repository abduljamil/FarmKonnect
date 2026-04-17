import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, Circle, Truck, CreditCard, Shield } from 'lucide-react-native';
import { createTransaction } from '../../services/transactionService';
import { AuthContext } from '../../contexts/AuthContext';

export default function CreateTransactionScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  // item is the fetched listing
  const { listingId, listing } = route.params || {};
  const item = listing || { 
    title: 'Unknown Item', 
    price: 0, 
    unit: 'unit', 
    location: 'Unknown', 
    createdBy: { name: 'Unknown Seller' } 
  };
  
  const [quantity, setQuantity] = useState('1');
  const [deliveryAddress, setDeliveryAddress] = useState(item.location || '');
  const [buyerPhone, setBuyerPhone] = useState(user?.phone || '');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('easypaisa'); // jazzcash, easypaisa, cod
  const [loading, setLoading] = useState(false);
  
  const qty = parseInt(quantity) || 1;
  const subtotal = (item.price || 0) * qty;
  const platformFee = Math.round(subtotal * 0.05); // 5% escrow fee
  const total = subtotal + platformFee;

  const handleCheckout = async () => {
    if (qty < 1) {
      Alert.alert('Error', 'Quantity must be at least 1');
      return;
    }
    if (!listingId) {
      Alert.alert('Error', 'Invalid listing');
      return;
    }

    if (!deliveryAddress || deliveryAddress.trim().length < 10) {
      Alert.alert('Error', 'Please provide a valid delivery address (min 10 characters)');
      return;
    }

    const phoneRegex = /^03[0-9]{9}$/;
    if (!buyerPhone || !phoneRegex.test(buyerPhone)) {
      Alert.alert('Error', 'Please provide a valid Pakistani phone number (03XXXXXXXXX)');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        listingId,
        amount: total, // Backend expects the calculated total amount
        quantity: qty,
        paymentMethod,
        deliveryAddress: deliveryAddress.trim(),
        buyerPhone: buyerPhone.trim(),
        deliveryNotes: deliveryNotes.trim()
      };
      
      const res = await createTransaction(payload);
      if (res.data && res.data.success) {
        Alert.alert('Success', 'Order placed effectively.', [
          { text: 'View Order', onPress: () => navigation.replace('TransactionDetail', { id: res.data.data._id }) }
        ]);
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : null}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Item Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.itemName}>{item.title}</Text>
              <Text style={styles.itemPrice}>₨ {item.price?.toLocaleString()}</Text>
            </View>
            <Text style={styles.itemMeta}>per {item.unit || 'unit'} • Sold by {item.createdBy?.name || 'Seller'}</Text>
            
            <View style={styles.qtyRow}>
              <Text style={styles.qtyLabel}>Quantity ({item.unit || 'units'})</Text>
              <View style={styles.qtyInputBox}>
                <TextInput 
                  style={styles.qtyInput} 
                  keyboardType="numeric" 
                  value={quantity} 
                  onChangeText={setQuantity} 
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Delivery Address*</Text>
              <TextInput 
                style={styles.textArea} 
                placeholder="Full delivery address..." 
                placeholderTextColor="#6b7280"
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number*</Text>
              <TextInput 
                style={styles.textInput} 
                placeholder="03XXXXXXXXX" 
                placeholderTextColor="#6b7280"
                keyboardType="phone-pad"
                value={buyerPhone}
                onChangeText={setBuyerPhone}
                maxLength={11}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Delivery Notes (Optional)</Text>
              <TextInput 
                style={styles.textInput} 
                placeholder="Special instructions for delivery..." 
                placeholderTextColor="#6b7280"
                value={deliveryNotes}
                onChangeText={setDeliveryNotes}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            
            <TouchableOpacity style={[styles.paymentOption, paymentMethod === 'easypaisa' && styles.paymentActive]} onPress={() => setPaymentMethod('easypaisa')}>
              <View style={styles.paymentLeft}>
                <CreditCard color={paymentMethod === 'easypaisa' ? '#16a34a' : '#a3a3a3'} size={24} />
                <Text style={[styles.paymentText, paymentMethod === 'easypaisa' && styles.paymentTextActive]}>EasyPaisa Escrow</Text>
              </View>
              {paymentMethod === 'easypaisa' ? <CheckCircle2 color="#16a34a" size={20} /> : <Circle color="#374151" size={20} />}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.paymentOption, paymentMethod === 'jazzcash' && styles.paymentActive]} onPress={() => setPaymentMethod('jazzcash')}>
              <View style={styles.paymentLeft}>
                <CreditCard color={paymentMethod === 'jazzcash' ? '#16a34a' : '#a3a3a3'} size={24} />
                <Text style={[styles.paymentText, paymentMethod === 'jazzcash' && styles.paymentTextActive]}>JazzCash Escrow</Text>
              </View>
              {paymentMethod === 'jazzcash' ? <CheckCircle2 color="#16a34a" size={20} /> : <Circle color="#374151" size={20} />}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.paymentOption, paymentMethod === 'cod' && styles.paymentActive]} onPress={() => setPaymentMethod('cod')}>
              <View style={styles.paymentLeft}>
                <Truck color={paymentMethod === 'cod' ? '#16a34a' : '#a3a3a3'} size={24} />
                <View>
                  <Text style={[styles.paymentText, paymentMethod === 'cod' && styles.paymentTextActive]}>Cash on Delivery</Text>
                  <Text style={styles.paymentSubtext}>Pay when crop arrives</Text>
                </View>
              </View>
              {paymentMethod === 'cod' ? <CheckCircle2 color="#16a34a" size={20} /> : <Circle color="#374151" size={20} />}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Order Total</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>₨ {subtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Escrow Protection Fee (5%)</Text>
              <Text style={styles.priceValue}>₨ {platformFee.toLocaleString()}</Text>
            </View>
            <View style={styles.divider} />
            <View style={[styles.priceRow, { marginBottom: 0 }]}>
              <Text style={styles.totalLabel}>Total Payment</Text>
              <Text style={styles.totalValue}>₨ {total.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.escrowNotice}>
            <ShieldCheck color="#16a34a" size={20} />
            <Text style={styles.escrowNoticeText}>FarmKonnect holds your payment safely until you confirm delivery. You're 100% protected.</Text>
          </View>

          <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.checkoutBtnText}>Confirm Order</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  container: { padding: 20, paddingTop: 0 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#a3a3a3', fontSize: 14, fontWeight: '600', marginBottom: 16, textTransform: 'uppercase' },
  card: { backgroundColor: 'rgba(26, 46, 29, 0.4)', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#224026' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: '#e5e7eb', fontSize: 14, fontWeight: '500', marginBottom: 8 },
  textInput: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, borderWidth: 1, borderColor: '#374151', color: '#fff', padding: 12, fontSize: 16 },
  textArea: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, borderWidth: 1, borderColor: '#374151', color: '#fff', padding: 12, fontSize: 16, textAlignVertical: 'top', minHeight: 80 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  itemPrice: { color: '#4ade80', fontSize: 16, fontWeight: 'bold' },
  itemMeta: { color: '#a3a3a3', fontSize: 13, marginBottom: 16 },
  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#224026', paddingTop: 16 },
  qtyLabel: { color: '#e5e7eb', fontSize: 15 },
  qtyInputBox: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, borderWidth: 1, borderColor: '#374151', width: 80, height: 40 },
  qtyInput: { color: '#fff', fontSize: 16, textAlign: 'center', flex: 1 },
  paymentOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(26, 46, 29, 0.8)', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#224026' },
  paymentActive: { borderColor: '#16a34a', backgroundColor: 'rgba(22, 163, 74, 0.1)' },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentText: { color: '#e5e7eb', fontSize: 16, fontWeight: '500' },
  paymentTextActive: { color: '#16a34a', fontWeight: 'bold' },
  paymentSubtext: { color: '#a3a3a3', fontSize: 12, marginTop: 2 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  priceLabel: { color: '#a3a3a3', fontSize: 14 },
  priceValue: { color: '#e5e7eb', fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#224026', marginVertical: 12 },
  totalLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  totalValue: { color: '#4ade80', fontSize: 18, fontWeight: 'bold' },
  escrowNotice: { flexDirection: 'row', backgroundColor: 'rgba(22, 163, 74, 0.1)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#16a34a', marginBottom: 24, gap: 12, alignItems: 'center' },
  escrowNoticeText: { color: '#16a34a', flex: 1, fontSize: 13, lineHeight: 20 },
  checkoutBtn: { backgroundColor: '#16a34a', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  checkoutBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
