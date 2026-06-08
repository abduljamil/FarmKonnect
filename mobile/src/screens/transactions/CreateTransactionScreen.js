import React, { useState, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, CheckCircle2, Circle, Truck, CreditCard, Shield, ShieldCheck, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { createTransaction, processPayment } from '../../services/transactionService';
import { AuthContext } from '../../contexts/AuthContext';
import LocationPicker from '../../components/ui/LocationPicker';

export default function CreateTransactionScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();
  // item is the fetched listing
  const { listingId, listing, offerAmount } = route.params || {};
  const item = listing || {
    title: 'Unknown Item',
    price: 0,
    unit: 'unit',
    location: 'Unknown',
    createdBy: { name: 'Unknown Seller' }
  };

  const [quantity, setQuantity] = useState('1');
  const [deliveryLocation, setDeliveryLocation] = useState({
    address: item.location || '',
    latitude: null,
    longitude: null,
  });
  const deliveryAddress = deliveryLocation.address;
  const setDeliveryAddress = (v) => setDeliveryLocation({ ...deliveryLocation, address: v });
  const [buyerPhone, setBuyerPhone] = useState(user?.phone || '');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  // Default to COD — JazzCash is gated by demo mode unless the deploy sets
  // JAZZCASH_DEMO_MODE=false, and EasyPaisa has zero backend integration.
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(false);

  // JazzCash modal state — collects the mobile number + CNIC the backend
  // /payments/transactions/:id/pay endpoint requires. Mobile was picking
  // JazzCash but had no UI to ever submit a payment, leaving the order
  // permanently in `paymentStatus: pending`.
  const [jcModalOpen, setJcModalOpen] = useState(false);
  const [jcMobile, setJcMobile] = useState(user?.phone || '');
  const [jcCnic, setJcCnic] = useState('');
  const [jcSubmitting, setJcSubmitting] = useState(false);
  const [pendingTxId, setPendingTxId] = useState(null);

  // Idempotency key generated once per screen mount so a buyer double-tapping
  // "Confirm Order" doesn't create two transactions (the backend dedupes by
  // this key; see paymentController.createTransaction).
  const idempotencyKey = useMemo(
    () => `${user?._id || user?.id || 'anon'}_${listingId || 'nil'}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    [user?._id, user?.id, listingId]
  );

  const qty = parseInt(quantity) || 1;
  const unitPrice = Number(offerAmount) > 0 ? Number(offerAmount) : (item.price || 0);
  const total = unitPrice * qty;
  // Note: the backend computes platform fee from the saved Transaction (default 0%);
  // do NOT add it client-side — that double-charged the buyer.

  const handleCheckout = async () => {
    if (qty < 1) {
      Alert.alert(t('common.error'), t('errors.requiredField'));
      return;
    }
    if (!listingId) {
      Alert.alert(t('common.error'), t('errors.somethingWrong'));
      return;
    }
    if (!deliveryAddress || deliveryAddress.trim().length < 10) {
      Alert.alert(t('common.error'), 'Please provide a delivery address of at least 10 characters');
      return;
    }
    const phoneRegex = /^03[0-9]{9}$/;
    if (!buyerPhone || !phoneRegex.test(buyerPhone)) {
      Alert.alert(t('common.error'), 'Please enter a valid Pakistani phone number (03XXXXXXXXX)');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        listingId,
        amount: total, // raw item-price * qty; backend applies platformFee
        quantity: qty,
        paymentMethod,
        deliveryAddress: deliveryAddress.trim(),
        buyerPhone: buyerPhone.trim(),
        deliveryNotes: deliveryNotes.trim(),
        idempotencyKey,
        // Pass lat/lng when the buyer used "Use current location" — backend
        // already accepts an optional `deliveryLocation { latitude, longitude, address }`.
        ...(deliveryLocation.latitude && deliveryLocation.longitude ? {
          deliveryLocation: {
            latitude: deliveryLocation.latitude,
            longitude: deliveryLocation.longitude,
            address: deliveryAddress.trim(),
          },
        } : {}),
      };

      const res = await createTransaction(payload);
      if (res.data && res.data.success) {
        const txId = res.data.data._id;
        // For JazzCash, immediately open the mobile/CNIC form so the buyer
        // can actually pay; otherwise (COD) just navigate to the order page.
        if (paymentMethod === 'jazzcash') {
          setPendingTxId(txId);
          setJcModalOpen(true);
        } else {
          Alert.alert(t('common.success'), 'Order placed.', [
            { text: t('common.ok'), onPress: () => navigation.replace('TransactionDetail', { id: txId }) }
          ]);
        }
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      Alert.alert(t('common.error'), error.response?.data?.message || t('errors.somethingWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleJazzCashSubmit = async () => {
    if (!/^03[0-9]{9}$/.test(jcMobile)) {
      Alert.alert(t('common.error'), 'JazzCash mobile must be 03XXXXXXXXX');
      return;
    }
    setJcSubmitting(true);
    try {
      await processPayment(pendingTxId, {
        mobileNumber: jcMobile.trim(),
        cnic: jcCnic.trim() || undefined,
        paymentIdempotencyKey: `pay_${pendingTxId}_${Date.now()}`,
      });
      setJcModalOpen(false);
      Alert.alert(t('common.success'), 'Payment processed successfully.', [
        { text: t('common.ok'), onPress: () => navigation.replace('TransactionDetail', { id: pendingTxId }) }
      ]);
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || 'Payment failed');
    } finally {
      setJcSubmitting(false);
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
            <LocationPicker
              label="Delivery Address *"
              placeholder="Full delivery address..."
              value={deliveryLocation}
              onChange={setDeliveryLocation}
            />

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
            <Text style={styles.sectionTitle}>{t('priceAlerts.form.commodity') /* placeholder, payment label */}</Text>

            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === 'cod' && styles.paymentActive]}
              onPress={() => setPaymentMethod('cod')}
            >
              <View style={styles.paymentLeft}>
                <Truck color={paymentMethod === 'cod' ? '#16a34a' : '#a3a3a3'} size={24} />
                <View>
                  <Text style={[styles.paymentText, paymentMethod === 'cod' && styles.paymentTextActive]}>Cash on Delivery</Text>
                  <Text style={styles.paymentSubtext}>Pay when the order arrives</Text>
                </View>
              </View>
              {paymentMethod === 'cod' ? <CheckCircle2 color="#16a34a" size={20} /> : <Circle color="#374151" size={20} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === 'jazzcash' && styles.paymentActive]}
              onPress={() => setPaymentMethod('jazzcash')}
            >
              <View style={styles.paymentLeft}>
                <CreditCard color={paymentMethod === 'jazzcash' ? '#16a34a' : '#a3a3a3'} size={24} />
                <View>
                  <Text style={[styles.paymentText, paymentMethod === 'jazzcash' && styles.paymentTextActive]}>JazzCash Escrow</Text>
                  <Text style={styles.paymentSubtext}>You'll be prompted for mobile + CNIC after order is placed</Text>
                </View>
              </View>
              {paymentMethod === 'jazzcash' ? <CheckCircle2 color="#16a34a" size={20} /> : <Circle color="#374151" size={20} />}
            </TouchableOpacity>

            {/* EasyPaisa removed — listed as a payment method in the backend
                schema but has no implementation. Re-enable when the backend
                gains an EasyPaisa service module. */}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('listingDetails.specifications') || 'Order Total'}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{item.title}</Text>
              <Text style={styles.priceValue}>₨ {unitPrice.toLocaleString()} × {qty}</Text>
            </View>
            <View style={styles.divider} />
            <View style={[styles.priceRow, { marginBottom: 0 }]}>
              <Text style={styles.totalLabel}>Total</Text>
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

      {/* JazzCash payment modal — only opens after a JazzCash order is created. */}
      <Modal visible={jcModalOpen} animationType="slide" transparent onRequestClose={() => setJcModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pay with JazzCash</Text>
              <TouchableOpacity onPress={() => setJcModalOpen(false)} disabled={jcSubmitting}>
                <X color="#a3a3a3" size={22} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHelper}>
              We'll charge ₨ {total.toLocaleString()} to your JazzCash mobile wallet.
            </Text>
            <Text style={styles.modalLabel}>JazzCash Mobile Number *</Text>
            <TextInput
              style={styles.modalInput}
              value={jcMobile}
              onChangeText={setJcMobile}
              keyboardType="phone-pad"
              maxLength={11}
              placeholder="03XXXXXXXXX"
              placeholderTextColor="#6b7280"
              editable={!jcSubmitting}
            />
            <Text style={styles.modalLabel}>Last 6 digits of CNIC (optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={jcCnic}
              onChangeText={setJcCnic}
              keyboardType="numeric"
              maxLength={6}
              placeholder="123456"
              placeholderTextColor="#6b7280"
              editable={!jcSubmitting}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setJcModalOpen(false)} disabled={jcSubmitting}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleJazzCashSubmit} disabled={jcSubmitting}>
                {jcSubmitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.modalSubmitText}>Pay ₨ {total.toLocaleString()}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  checkoutBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // JazzCash modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#0f1a12', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#224026' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  modalHelper: { color: '#a3a3a3', fontSize: 13, marginBottom: 16 },
  modalLabel: { color: '#a3a3a3', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  modalInput: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, borderWidth: 1, borderColor: '#374151', color: '#fff', padding: 12, fontSize: 14, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelText: { color: '#a3a3a3', fontWeight: '600' },
  modalSubmit: { flex: 1, backgroundColor: '#16a34a', padding: 14, borderRadius: 12, alignItems: 'center' },
  modalSubmitText: { color: '#fff', fontWeight: 'bold' },
});
