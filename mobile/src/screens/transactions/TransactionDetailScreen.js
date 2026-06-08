import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, TextInput, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, Circle, Truck, CreditCard, Shield, AlertTriangle, X, Star, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { getTransaction, confirmDelivery, confirmOrder, markDelivered, completeTransaction, raiseDispute, confirmPayment, sellerConfirmPayment } from '../../services/transactionService';
import { createReview, canReviewTransaction } from '../../services/reviewService';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';

const DISPUTE_REASONS = [
  { value: 'payment_not_received', label: 'Payment not received' },
  { value: 'wrong_amount',         label: 'Wrong amount paid' },
  { value: 'product_issue',        label: 'Product quality issue' },
  { value: 'delivery_issue',       label: 'Delivery problem' },
  { value: 'item_not_received',    label: 'Item not received' },
  { value: 'item_not_as_described',label: 'Item not as described' },
  { value: 'other',                label: 'Other' },
];

export default function TransactionDetailScreen({ navigation, route }) {
  const { id } = route.params || {};
  const { user } = useContext(AuthContext);
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dispute modal state
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  // Review modal state — visible only after the order is completed and the
  // backend's can-review check confirms this user hasn't already reviewed.
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(false);

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

  // Check whether the buyer/seller can leave a review once the transaction
  // loads and is completed. Backend returns 200 + {canReview: bool}.
  useEffect(() => {
    if (!transaction || transaction.orderStatus !== 'completed' || !id) return;
    (async () => {
      try {
        const r = await canReviewTransaction(id);
        setCanReview(!!r.data?.canReview);
      } catch {
        setCanReview(false);
      }
    })();
  }, [transaction, id]);

  // Seller: mark delivered, optionally with proof images. The backend's
  // `markDelivered` accepts up to 5 image URLs in `deliveryProofImages`. We
  // let the seller skip uploads (just mark delivered) or attach via the
  // image picker. Web has the same flow under TransactionDetails.jsx.
  const handleMarkDelivered = () => {
    Alert.alert(
      'Mark as Delivered',
      'Would you like to attach delivery proof photos? (optional, helps build trust)',
      [
        { text: 'Skip — Just Mark Delivered', onPress: async () => {
          try {
            setLoading(true);
            await markDelivered(id, {});
            fetchTransaction();
          } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to mark delivered');
            setLoading(false);
          }
        } },
        { text: 'Attach Photos', onPress: () => pickAndSendDeliveryProof() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const pickAndSendDeliveryProof = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow photo library access to upload proof.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;

    setLoading(true);
    try {
      const fd = new FormData();
      result.assets.slice(0, 5).forEach((asset, i) => {
        fd.append('images', {
          uri: asset.uri,
          type: 'image/jpeg',
          name: `proof_${Date.now()}_${i}.jpg`,
        });
      });
      // Backend route for delivery proof uploads is separate from listing
      // image uploads (`/api/upload/delivery-proof`).
      const up = await api.post('/upload/delivery-proof', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const urls = up.data?.data?.images || [];
      await markDelivered(id, { deliveryProofImages: urls });
      fetchTransaction();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Upload failed');
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      Alert.alert('Error', 'Please pick a rating between 1 and 5 stars.');
      return;
    }
    setReviewSubmitting(true);
    try {
      const myId = (user?._id || user?.id)?.toString();
      const bId = (transaction.buyer?._id || transaction.buyer)?.toString();
      const amBuyer = myId === bId;
      const reviewedUser = amBuyer ? transaction.seller : transaction.buyer;
      const reviewedUserId = reviewedUser?._id || reviewedUser;
      const reviewType = amBuyer ? 'buyer_to_seller' : 'seller_to_buyer';
      await createReview({
        reviewedUser: reviewedUserId,
        transaction: id,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
        reviewType,
      });
      setReviewOpen(false);
      setReviewRating(0);
      setReviewComment('');
      setCanReview(false);
      Alert.alert('Thanks!', 'Your review has been submitted.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

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

  const handleSubmitDispute = async () => {
    if (!disputeReason) {
      Alert.alert('Error', 'Please pick a reason for the dispute.');
      return;
    }
    if (!disputeDescription.trim() || disputeDescription.trim().length < 10) {
      Alert.alert('Error', 'Please describe the issue in at least 10 characters.');
      return;
    }
    setDisputeSubmitting(true);
    try {
      await raiseDispute(id, {
        disputeReason,
        disputeDescription: disputeDescription.trim(),
      });
      setDisputeOpen(false);
      setDisputeReason('');
      setDisputeDescription('');
      Alert.alert('Submitted', 'Your dispute has been opened. An admin will review it shortly.');
      fetchTransaction();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to open dispute');
    } finally {
      setDisputeSubmitting(false);
    }
  };

  if (loading || !transaction) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#16a34a" />
      </SafeAreaView>
    );
  }

  const currentUserId = (user?._id || user?.id)?.toString();
  const buyerId = (transaction.buyer?._id || transaction.buyer)?.toString();
  const sellerId = (transaction.seller?._id || transaction.seller)?.toString();

  const isBuyer = currentUserId && buyerId === currentUserId;
  const isSeller = currentUserId && sellerId === currentUserId;

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
          <Truck color="#fbbf24" size={28} />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Status: {transaction.orderStatus}</Text>
            <Text style={styles.statusDesc}>
              {transaction.orderStatus === 'pending' ? 'Awaiting order confirmation.' : 
               transaction.orderStatus === 'confirmed' ? 'Order confirmed. Awaiting delivery.' :
               transaction.orderStatus === 'delivered' ? 'Order delivered. Awaiting final payment/completion.' :
               'Transaction ' + transaction.orderStatus}
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
            <Text style={[styles.value, { color: '#4ade80', fontWeight: 'bold' }]}>₨ {transaction.amount?.toLocaleString()}</Text>
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
            <Text style={styles.value}>{transaction.paymentMethod === 'cod' ? 'Cash on Delivery' : transaction.paymentMethod}</Text>
          </View>
        </View>

        {/* Delivery proof gallery — shown to both buyer and seller when the
            seller has attached photos via markDelivered. */}
        {transaction.deliveryProofImages?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Delivery Proof</Text>
            <FlatList
              data={transaction.deliveryProofImages}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(uri, idx) => `${uri}-${idx}`}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.proofThumb} />
              )}
            />
          </View>
        )}

        <View style={styles.escrowNotice}>
          <Shield color="#16a34a" size={20} />
          <Text style={styles.escrowNoticeText}>FarmKonnect holds your payment safely until you confirm delivery. You're 100% protected.</Text>
        </View>

        <View style={styles.actionGroup}>
          {isSeller && transaction.orderStatus === 'pending' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAction(confirmOrder, 'Confirm Order')}>
              <CheckCircle color="#fff" size={20} />
              <Text style={styles.primaryBtnText}>Confirm Order</Text>
            </TouchableOpacity>
          )}

          {isSeller && transaction.orderStatus === 'confirmed' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleMarkDelivered}>
              <CheckCircle color="#fff" size={20} />
              <Text style={styles.primaryBtnText}>Mark Delivered</Text>
            </TouchableOpacity>
          )}

          {isSeller && transaction.orderStatus === 'delivered' && transaction.paymentMethod === 'cod' && 
           transaction.buyerConfirmedPayment && !transaction.sellerConfirmedPayment && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAction(sellerConfirmPayment, 'Confirm Payment Received')}>
              <CheckCircle color="#fff" size={20} />
              <Text style={styles.primaryBtnText}>Confirm Payment Received</Text>
            </TouchableOpacity>
          )}

          {isBuyer && transaction.orderStatus === 'delivered' && (
            transaction.paymentMethod === 'cod' ? (
              <>
                {!transaction.buyerConfirmedDelivery && (
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAction(confirmDelivery, 'Confirm Delivery Received')}>
                    <CheckCircle color="#fff" size={20} />
                    <Text style={styles.primaryBtnText}>Confirm Received</Text>
                  </TouchableOpacity>
                )}
                {transaction.buyerConfirmedDelivery && !transaction.buyerConfirmedPayment && (
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAction(confirmPayment, 'Confirm Payment Made')}>
                    <CreditCard color="#fff" size={20} />
                    <Text style={styles.primaryBtnText}>I have Paid Seller</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAction(completeTransaction, 'Confirm Received & Complete')}>
                <CheckCircle color="#fff" size={20} />
                <Text style={styles.primaryBtnText}>Confirm Received</Text>
              </TouchableOpacity>
            )
          )}

          {/* Dispute Action for active orders */}
          {['pending', 'confirmed', 'delivered'].includes(transaction.orderStatus) && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setDisputeOpen(true)}>
              <AlertTriangle color="#fbbf24" size={20} />
              <Text style={styles.secondaryBtnText}>Raise Dispute</Text>
            </TouchableOpacity>
          )}

          {/* Review CTA — only after a successful completion and only if
              the user hasn't already left a review (backend enforces uniqueness). */}
          {transaction.orderStatus === 'completed' && canReview && (
            <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.5)' }]} onPress={() => setReviewOpen(true)}>
              <Star color="#3b82f6" size={20} />
              <Text style={[styles.secondaryBtnText, { color: '#3b82f6' }]}>Leave a Review</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Dispute modal — backend requires both `disputeReason` (enum) and
          `disputeDescription`. Previously raiseDispute was sent with no body,
          which 400'd on the server. */}
      <Modal visible={disputeOpen} animationType="slide" transparent onRequestClose={() => setDisputeOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Raise a Dispute</Text>
              <TouchableOpacity onPress={() => setDisputeOpen(false)}>
                <X color="#a3a3a3" size={22} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Reason</Text>
            <ScrollView style={{ maxHeight: 220 }}>
              {DISPUTE_REASONS.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.reasonRow, disputeReason === r.value && styles.reasonRowActive]}
                  onPress={() => setDisputeReason(r.value)}
                >
                  <Text style={[styles.reasonText, disputeReason === r.value && styles.reasonTextActive]}>
                    {r.label}
                  </Text>
                  {disputeReason === r.value && <CheckCircle color="#16a34a" size={18} />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>Description (min 10 chars)</Text>
            <TextInput
              style={styles.modalInput}
              value={disputeDescription}
              onChangeText={setDisputeDescription}
              placeholder="Describe what went wrong..."
              placeholderTextColor="#6b7280"
              multiline
              maxLength={1000}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setDisputeOpen(false)} disabled={disputeSubmitting}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleSubmitDispute} disabled={disputeSubmitting}>
                {disputeSubmitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.modalSubmitText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Review modal */}
      <Modal visible={reviewOpen} animationType="slide" transparent onRequestClose={() => setReviewOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Leave a Review</Text>
              <TouchableOpacity onPress={() => setReviewOpen(false)}>
                <X color="#a3a3a3" size={22} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Rating</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setReviewRating(n)}>
                  <Star
                    color={n <= reviewRating ? '#fbbf24' : '#374151'}
                    fill={n <= reviewRating ? '#fbbf24' : 'none'}
                    size={36}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>Comment (optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="How was the experience?"
              placeholderTextColor="#6b7280"
              multiline
              maxLength={500}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setReviewOpen(false)} disabled={reviewSubmitting}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleSubmitReview} disabled={reviewSubmitting}>
                {reviewSubmitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.modalSubmitText}>Submit</Text>}
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
  secondaryBtnText: { color: '#fbbf24', fontSize: 16, fontWeight: 'bold' },

  // Dispute modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#0f1a12', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#224026' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  modalLabel: { color: '#a3a3a3', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  reasonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, marginBottom: 6, borderRadius: 10, backgroundColor: 'rgba(26, 46, 29, 0.4)', borderWidth: 1, borderColor: '#224026' },
  reasonRowActive: { backgroundColor: 'rgba(22, 163, 74, 0.15)', borderColor: '#16a34a' },
  reasonText: { color: '#e5e7eb', fontSize: 14 },
  reasonTextActive: { color: '#16a34a', fontWeight: '600' },
  modalInput: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, borderWidth: 1, borderColor: '#374151', color: '#fff', padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancel: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelText: { color: '#a3a3a3', fontWeight: '600' },
  modalSubmit: { flex: 1, backgroundColor: '#16a34a', padding: 14, borderRadius: 12, alignItems: 'center' },
  modalSubmitText: { color: '#fff', fontWeight: 'bold' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  proofThumb: { width: 100, height: 100, borderRadius: 12, marginRight: 8, backgroundColor: '#1a2e1f' },
});
