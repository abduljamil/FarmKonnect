import { COLORS } from '../../constants/colors';
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
      Alert.alert(t('common.error'), t('mobile.alerts.deliveryAddressMin'));
      return;
    }
    const phoneRegex = /^03[0-9]{9}$/;
    if (!buyerPhone || !phoneRegex.test(buyerPhone)) {
      Alert.alert(t('common.error'), t('mobile.alerts.validPhone'));
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
          Alert.alert(t('common.success'), t('mobile.alerts.orderPlaced'), [
            { text: t('common.ok'), onPress: () => navigation.replace('TransactionDetail', { id: txId }) }
          ]);
        }
      }
    } catch (error) {
      console.log('Failed to place order:', error);
      Alert.alert(t('common.error'), error.response?.data?.message || t('errors.somethingWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleJazzCashSubmit = async () => {
    if (!/^03[0-9]{9}$/.test(jcMobile)) {
      Alert.alert(t('common.error'), t('mobile.alerts.jazzcashMobileFormat'));
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
      Alert.alert(t('common.success'), t('mobile.alerts.paymentProcessed'), [
        { text: t('common.ok'), onPress: () => navigation.replace('TransactionDetail', { id: pendingTxId }) }
      ]);
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('mobile.alerts.paymentFailed'));
    } finally {
      setJcSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('mobile.checkout.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('mobile.checkout.itemSummary')}</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.itemName}>{item.title}</Text>
              <Text style={styles.itemPrice}>₨ {item.price?.toLocaleString()}</Text>
            </View>
            <Text style={styles.itemMeta}>{t('mobile.checkout.perUnitSoldBy', { unit: item.unit || 'unit', seller: item.createdBy?.name || 'Seller' })}</Text>
            
            <View style={styles.qtyRow}>
              <Text style={styles.qtyLabel}>{t('mobile.checkout.quantityLabel', { unit: item.unit || 'units' })}</Text>
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
            <Text style={styles.sectionTitle}>{t('mobile.checkout.deliveryInfo')}</Text>
            <LocationPicker
              label={t('mobile.checkout.deliveryAddress')}
              placeholder={t('mobile.checkout.deliveryAddressPlaceholder')}
              value={deliveryLocation}
              onChange={setDeliveryLocation}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('mobile.checkout.phoneNumber')}</Text>
              <TextInput 
                style={styles.textInput} 
                placeholder="03XXXXXXXXX" 
                placeholderTextColor={COLORS.textFaint}
                keyboardType="phone-pad"
                value={buyerPhone}
                onChangeText={setBuyerPhone}
                maxLength={11}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('mobile.checkout.deliveryNotes')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('mobile.checkout.deliveryNotesPlaceholder')}
                placeholderTextColor={COLORS.textFaint}
                value={deliveryNotes}
                onChangeText={setDeliveryNotes}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('mobile.checkout.paymentMethod')}</Text>

            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === 'cod' && styles.paymentActive]}
              onPress={() => setPaymentMethod('cod')}
            >
              <View style={styles.paymentLeft}>
                <Truck color={paymentMethod === 'cod' ? COLORS.primary : COLORS.textMuted} size={24} />
                <View>
                  <Text style={[styles.paymentText, paymentMethod === 'cod' && styles.paymentTextActive]}>{t('mobile.checkout.cod')}</Text>
                  <Text style={styles.paymentSubtext}>{t('mobile.checkout.codDesc')}</Text>
                </View>
              </View>
              {paymentMethod === 'cod' ? <CheckCircle2 color={COLORS.primary} size={20} /> : <Circle color={COLORS.inputBorder} size={20} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === 'jazzcash' && styles.paymentActive]}
              onPress={() => setPaymentMethod('jazzcash')}
            >
              <View style={styles.paymentLeft}>
                <CreditCard color={paymentMethod === 'jazzcash' ? COLORS.primary : COLORS.textMuted} size={24} />
                <View>
                  <Text style={[styles.paymentText, paymentMethod === 'jazzcash' && styles.paymentTextActive]}>{t('mobile.checkout.jazzcash')}</Text>
                  <Text style={styles.paymentSubtext}>{t('mobile.checkout.jazzcashDesc')}</Text>
                </View>
              </View>
              {paymentMethod === 'jazzcash' ? <CheckCircle2 color={COLORS.primary} size={20} /> : <Circle color={COLORS.inputBorder} size={20} />}
            </TouchableOpacity>

            {/* EasyPaisa removed — listed as a payment method in the backend
                schema but has no implementation. Re-enable when the backend
                gains an EasyPaisa service module. */}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('mobile.checkout.orderTotal')}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{item.title}</Text>
              <Text style={styles.priceValue}>₨ {unitPrice.toLocaleString()} × {qty}</Text>
            </View>
            <View style={styles.divider} />
            <View style={[styles.priceRow, { marginBottom: 0 }]}>
              <Text style={styles.totalLabel}>{t('mobile.checkout.total')}</Text>
              <Text style={styles.totalValue}>₨ {total.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.escrowNotice}>
            <ShieldCheck color={COLORS.primary} size={20} />
            <Text style={styles.escrowNoticeText}>{t('mobile.checkout.escrowNotice')}</Text>
          </View>

          <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.checkoutBtnText}>{t('mobile.checkout.confirmOrder')}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* JazzCash payment modal — only opens after a JazzCash order is created. */}
      <Modal visible={jcModalOpen} animationType="slide" transparent onRequestClose={() => setJcModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('mobile.checkout.payWithJazzcash')}</Text>
              <TouchableOpacity onPress={() => setJcModalOpen(false)} disabled={jcSubmitting}>
                <X color={COLORS.textMuted} size={22} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHelper}>
              {t('mobile.checkout.chargeNotice', { amount: total.toLocaleString() })}
            </Text>
            <Text style={styles.modalLabel}>{t('mobile.checkout.jazzcashMobile')}</Text>
            <TextInput
              style={styles.modalInput}
              value={jcMobile}
              onChangeText={setJcMobile}
              keyboardType="phone-pad"
              maxLength={11}
              placeholder="03XXXXXXXXX"
              placeholderTextColor={COLORS.textFaint}
              editable={!jcSubmitting}
            />
            <Text style={styles.modalLabel}>{t('mobile.checkout.cnicOptional')}</Text>
            <TextInput
              style={styles.modalInput}
              value={jcCnic}
              onChangeText={setJcCnic}
              keyboardType="numeric"
              maxLength={6}
              placeholder="123456"
              placeholderTextColor={COLORS.textFaint}
              editable={!jcSubmitting}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setJcModalOpen(false)} disabled={jcSubmitting}>
                <Text style={styles.modalCancelText}>{t('mobile.buttons.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleJazzCashSubmit} disabled={jcSubmitting}>
                {jcSubmitting
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.modalSubmitText}>{t('mobile.checkout.pay', { amount: total.toLocaleString() })}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  container: { padding: 20, paddingTop: 0 },
  section: { marginBottom: 24 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600', marginBottom: 16, textTransform: 'uppercase' },
  card: { backgroundColor: 'rgba(26, 46, 29, 0.4)', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: '#e5e7eb', fontSize: 14, fontWeight: '500', marginBottom: 8 },
  textInput: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, borderWidth: 1, borderColor: COLORS.inputBorder, color: COLORS.white, padding: 12, fontSize: 16 },
  textArea: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, borderWidth: 1, borderColor: COLORS.inputBorder, color: COLORS.white, padding: 12, fontSize: 16, textAlignVertical: 'top', minHeight: 80 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemName: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  itemPrice: { color: COLORS.primaryLight, fontSize: 16, fontWeight: 'bold' },
  itemMeta: { color: COLORS.textMuted, fontSize: 13, marginBottom: 16 },
  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: COLORS.border, paddingTop: 16 },
  qtyLabel: { color: '#e5e7eb', fontSize: 15 },
  qtyInputBox: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, borderWidth: 1, borderColor: COLORS.inputBorder, width: 80, height: 40 },
  qtyInput: { color: COLORS.white, fontSize: 16, textAlign: 'center', flex: 1 },
  paymentOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(26, 46, 29, 0.8)', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  paymentActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(22, 163, 74, 0.1)' },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentText: { color: '#e5e7eb', fontSize: 16, fontWeight: '500' },
  paymentTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  paymentSubtext: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  priceLabel: { color: COLORS.textMuted, fontSize: 14 },
  priceValue: { color: '#e5e7eb', fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  totalLabel: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  totalValue: { color: COLORS.primaryLight, fontSize: 18, fontWeight: 'bold' },
  escrowNotice: { flexDirection: 'row', backgroundColor: 'rgba(22, 163, 74, 0.1)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary, marginBottom: 24, gap: 12, alignItems: 'center' },
  escrowNoticeText: { color: COLORS.primary, flex: 1, fontSize: 13, lineHeight: 20 },
  checkoutBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  checkoutBtnText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },

  // JazzCash modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: COLORS.bg, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  modalHelper: { color: COLORS.textMuted, fontSize: 13, marginBottom: 16 },
  modalLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  modalInput: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, borderWidth: 1, borderColor: COLORS.inputBorder, color: COLORS.white, padding: 12, fontSize: 14, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelText: { color: COLORS.textMuted, fontWeight: '600' },
  modalSubmit: { flex: 1, backgroundColor: COLORS.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  modalSubmitText: { color: COLORS.white, fontWeight: 'bold' },
});
