import { COLORS } from '../../constants/colors';
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, TextInput, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, Circle, Truck, CreditCard, Shield, AlertTriangle, X, XCircle, Star, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { getTransaction, confirmDelivery, confirmOrder, markDelivered, completeTransaction, raiseDispute, confirmPayment, sellerConfirmPayment, rejectDelivery, cancelTransaction } from '../../services/transactionService';
import { createReview, canReviewTransaction } from '../../services/reviewService';
import { AuthContext } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const DISPUTE_REASONS = [
  { value: 'payment_not_received', labelKey: 'mobile.dispute.paymentNotReceived' },
  { value: 'wrong_amount',         labelKey: 'mobile.dispute.wrongAmount' },
  { value: 'product_issue',        labelKey: 'mobile.dispute.productIssue' },
  { value: 'delivery_issue',       labelKey: 'mobile.dispute.deliveryIssue' },
  { value: 'item_not_received',    labelKey: 'mobile.dispute.itemNotReceived' },
  { value: 'item_not_as_described',labelKey: 'mobile.dispute.itemNotAsDescribed' },
  { value: 'other',                labelKey: 'mobile.dispute.other' },
];

export default function TransactionDetailScreen({ navigation, route }) {
  const { id } = route.params || {};
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dispute modal state
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  // Reject-delivery modal state (buyer says the delivered item is wrong/missing)
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

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
      Alert.alert(t('common.error'), t('mobile.alerts.loadTxFailed'));
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
      t('mobile.alerts.markDeliveredTitle'),
      t('mobile.alerts.markDeliveredMsg'),
      [
        { text: t('mobile.buttons.skipMarkDelivered'), onPress: async () => {
          try {
            setLoading(true);
            await markDelivered(id, {});
            fetchTransaction();
          } catch (e) {
            Alert.alert(t('common.error'), e.response?.data?.message || t('mobile.alerts.markDeliveredFailed'));
            setLoading(false);
          }
        } },
        { text: t('mobile.buttons.attachPhotos'), onPress: () => pickAndSendDeliveryProof() },
        { text: t('mobile.buttons.cancel'), style: 'cancel' },
      ]
    );
  };

  const pickAndSendDeliveryProof = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('mobile.alerts.permissionRequired'), t('mobile.alerts.allowPhotoProof'));
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
      Alert.alert(t('common.error'), e.response?.data?.message || t('mobile.alerts.uploadFailed'));
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      Alert.alert(t('common.error'), t('mobile.alerts.pickRating'));
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
      Alert.alert(t('mobile.alerts.thanks'), t('mobile.alerts.reviewSubmitted'));
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('mobile.alerts.reviewSubmitFailed'));
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleAction = async (actionFn, actionName) => {
    Alert.alert(t('mobile.confirm.title', { action: actionName }), t('mobile.confirm.message', { action: actionName }), [
      { text: t('mobile.buttons.cancel'), style: 'cancel' },
      {
        text: t('mobile.buttons.proceed'),
        onPress: async () => {
          setLoading(true);
          try {
            await actionFn(id);
            Alert.alert(t('common.success'), t('mobile.alerts.actionCompleted', { action: actionName }));
            fetchTransaction(); // refresh
          } catch (error) {
             Alert.alert(t('common.error'), error.response?.data?.message || t('mobile.alerts.actionFailed'));
             setLoading(false);
          }
        }
      }
    ]);
  };

  const handleSubmitReject = async () => {
    if (!rejectReason.trim() || rejectReason.trim().length < 10) {
      Alert.alert(t('common.error'), t('mobile.alerts.rejectReasonRequired'));
      return;
    }
    setRejectSubmitting(true);
    try {
      await rejectDelivery(id, { reason: rejectReason.trim() });
      setRejectOpen(false);
      setRejectReason('');
      Alert.alert(t('mobile.alerts.deliveryRejected'), t('mobile.alerts.deliveryRejectedMsg'));
      fetchTransaction();
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('mobile.alerts.rejectFailed'));
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleSubmitDispute = async () => {
    if (!disputeReason) {
      Alert.alert(t('common.error'), t('mobile.alerts.pickDisputeReason'));
      return;
    }
    if (!disputeDescription.trim() || disputeDescription.trim().length < 10) {
      Alert.alert(t('common.error'), t('mobile.alerts.describeIssue'));
      return;
    }
    setDisputeSubmitting(true);
    try {
      await raiseDispute(id, {
        reason: disputeReason,
        description: disputeDescription.trim(),
      });
      setDisputeOpen(false);
      setDisputeReason('');
      setDisputeDescription('');
      Alert.alert(t('mobile.alerts.submitted'), t('mobile.alerts.disputeOpened'));
      fetchTransaction();
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('mobile.alerts.disputeFailed'));
    } finally {
      setDisputeSubmitting(false);
    }
  };

  if (loading || !transaction) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('mobile.order.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.statusBanner}>
          <Truck color={COLORS.warning} size={28} />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>{t('mobile.order.statusLabel', { status: transaction.orderStatus })}</Text>
            <Text style={styles.statusDesc}>
              {transaction.orderStatus === 'pending' ? t('mobile.order.statusPending') :
               transaction.orderStatus === 'confirmed' ? t('mobile.order.statusConfirmed') :
               transaction.orderStatus === 'delivered' ? t('mobile.order.statusDelivered') :
               t('mobile.order.statusOther', { status: transaction.orderStatus })}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('mobile.order.orderInformation')}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t('mobile.order.transactionId')}</Text>
            <Text style={styles.value}>{transaction._id.substring(0, 8).toUpperCase()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('mobile.order.item')}</Text>
            <Text style={styles.value}>{transaction.listing?.title || 'Unknown'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('mobile.order.totalAmount')}</Text>
            <Text style={[styles.value, { color: COLORS.primaryLight, fontWeight: 'bold' }]}>₨ {transaction.amount?.toLocaleString()}</Text>
          </View>
          {isBuyer && (
            <View style={styles.row}>
              <Text style={styles.label}>{t('mobile.order.seller')}</Text>
              <Text style={styles.value}>{transaction.seller?.name}</Text>
            </View>
          )}
          {isSeller && (
            <View style={styles.row}>
              <Text style={styles.label}>{t('mobile.order.buyer')}</Text>
              <Text style={styles.value}>{transaction.buyer?.name}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>{t('mobile.order.paymentMethod')}</Text>
            <Text style={styles.value}>{transaction.paymentMethod === 'cod' ? t('mobile.order.cod') : transaction.paymentMethod}</Text>
          </View>
        </View>

        {/* Delivery proof gallery — shown to both buyer and seller when the
            seller has attached photos via markDelivered. */}
        {transaction.deliveryProofImages?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('mobile.order.deliveryProof')}</Text>
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

        <View style={styles.escrowBox}>
          <Shield color={COLORS.primary} size={24} />
          <View style={styles.escrowTextCol}>
            <Text style={styles.escrowDesc}>{t('mobile.checkout.escrowNotice')}</Text>
          </View>
        </View>

        <View style={styles.actionGroup}>
          {isSeller && transaction.orderStatus === 'pending' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAction(confirmOrder, t('mobile.actions.confirmOrder'))}>
              <CheckCircle color={COLORS.white} size={20} />
              <Text style={styles.primaryBtnText}>{t('mobile.actions.confirmOrder')}</Text>
            </TouchableOpacity>
          )}

          {isSeller && transaction.orderStatus === 'confirmed' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleMarkDelivered}>
              <CheckCircle color={COLORS.white} size={20} />
              <Text style={styles.primaryBtnText}>{t('mobile.order.markDeliveredBtn')}</Text>
            </TouchableOpacity>
          )}

          {isSeller && transaction.orderStatus === 'delivered' && transaction.paymentMethod === 'cod' && 
           transaction.buyerConfirmedPayment && !transaction.sellerConfirmedPayment && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAction(sellerConfirmPayment, t('mobile.actions.confirmPaymentReceived'))}>
              <CheckCircle color={COLORS.white} size={20} />
              <Text style={styles.primaryBtnText}>{t('mobile.actions.confirmPaymentReceived')}</Text>
            </TouchableOpacity>
          )}

          {isBuyer && transaction.orderStatus === 'delivered' && (
            transaction.paymentMethod === 'cod' ? (
              <>
                {!transaction.buyerConfirmedDelivery && (
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAction(confirmDelivery, t('mobile.actions.confirmDeliveryReceived'))}>
                    <CheckCircle color={COLORS.white} size={20} />
                    <Text style={styles.primaryBtnText}>{t('mobile.order.confirmReceivedBtn')}</Text>
                  </TouchableOpacity>
                )}
                {transaction.buyerConfirmedDelivery && !transaction.buyerConfirmedPayment && (
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAction(confirmPayment, t('mobile.actions.confirmPaymentMade'))}>
                    <CreditCard color={COLORS.white} size={20} />
                    <Text style={styles.primaryBtnText}>{t('mobile.order.paidSellerBtn')}</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAction(completeTransaction, t('mobile.actions.completeOrder'))}>
                <CheckCircle color={COLORS.white} size={20} />
                <Text style={styles.primaryBtnText}>{t('mobile.order.confirmReceivedBtn')}</Text>
              </TouchableOpacity>
            )
          )}

          {/* Buyer can reject a delivery they haven't accepted yet (wrong /
              missing / damaged item) before confirming receipt. */}
          {isBuyer && transaction.orderStatus === 'delivered' && !transaction.buyerConfirmedDelivery && (
            <TouchableOpacity style={styles.rejectBtn} onPress={() => setRejectOpen(true)}>
              <AlertTriangle color={COLORS.danger} size={20} />
              <Text style={styles.rejectBtnText}>{t('mobile.order.rejectDeliveryBtn')}</Text>
            </TouchableOpacity>
          )}

          {/* Dispute Action for active orders */}
          {['pending', 'confirmed', 'delivered'].includes(transaction.orderStatus) && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setDisputeOpen(true)}>
              <AlertTriangle color={COLORS.warning} size={20} />
              <Text style={styles.secondaryBtnText}>{t('mobile.order.raiseDisputeBtn')}</Text>
            </TouchableOpacity>
          )}

          {/* Cancel Action */}
          {['pending', 'confirmed'].includes(transaction.orderStatus) && (
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleAction(cancelTransaction, t('mobile.actions.cancelOrder'))}>
              <XCircle color={COLORS.danger} size={20} />
              <Text style={styles.rejectBtnText}>{t('mobile.actions.cancelOrder')}</Text>
            </TouchableOpacity>
          )}

          {/* Review CTA — only after a successful completion and only if
              the user hasn't already left a review (backend enforces uniqueness). */}
          {transaction.orderStatus === 'completed' && canReview && (
            <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.5)' }]} onPress={() => setReviewOpen(true)}>
              <Star color={COLORS.info} size={20} />
              <Text style={[styles.secondaryBtnText, { color: COLORS.info }]}>{t('mobile.order.leaveReviewBtn')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Dispute modal — backend requires both `disputeReason` (enum) and
          `disputeDescription`. Previously raiseDispute was sent with no body,
          which 400'd on the server. */}
      <Modal visible={disputeOpen} animationType="slide" transparent onRequestClose={() => setDisputeOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('mobile.order.raiseDisputeTitle')}</Text>
                <TouchableOpacity onPress={() => setDisputeOpen(false)}>
                  <X color={COLORS.textMuted} size={22} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>{t('mobile.order.reason')}</Text>
              <ScrollView style={{ maxHeight: 220 }}>
                {DISPUTE_REASONS.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.reasonRow, disputeReason === r.value && styles.reasonRowActive]}
                    onPress={() => setDisputeReason(r.value)}
                  >
                    <Text style={[styles.reasonText, disputeReason === r.value && styles.reasonTextActive]}>
                      {t(r.labelKey)}
                    </Text>
                    {disputeReason === r.value && <CheckCircle color={COLORS.primary} size={18} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.modalLabel, { marginTop: 16 }]}>{t('mobile.order.descriptionMin')}</Text>
              <TextInput
                style={styles.modalInput}
                value={disputeDescription}
                onChangeText={setDisputeDescription}
                placeholder={t('mobile.order.describePlaceholder')}
                placeholderTextColor={COLORS.textFaint}
                multiline
                maxLength={1000}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setDisputeOpen(false)} disabled={disputeSubmitting}>
                  <Text style={styles.modalCancelText}>{t('mobile.buttons.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmit} onPress={handleSubmitDispute} disabled={disputeSubmitting}>
                  {disputeSubmitting
                    ? <ActivityIndicator color={COLORS.white} />
                    : <Text style={styles.modalSubmitText}>{t('mobile.order.submit')}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reject-delivery modal */}
      <Modal visible={rejectOpen} animationType="slide" transparent onRequestClose={() => setRejectOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('mobile.order.rejectTitle')}</Text>
                <TouchableOpacity onPress={() => setRejectOpen(false)}>
                  <X color={COLORS.textMuted} size={22} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalLabel}>{t('mobile.order.rejectWhy')}</Text>
              <TextInput
                style={styles.modalInput}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder={t('mobile.order.rejectPlaceholder')}
                placeholderTextColor={COLORS.textFaint}
                multiline
                maxLength={1000}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setRejectOpen(false)} disabled={rejectSubmitting}>
                  <Text style={styles.modalCancelText}>{t('mobile.buttons.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalSubmit, { backgroundColor: COLORS.danger }]} onPress={handleSubmitReject} disabled={rejectSubmitting}>
                  {rejectSubmitting
                    ? <ActivityIndicator color={COLORS.white} />
                    : <Text style={styles.modalSubmitText}>{t('mobile.order.rejectDeliveryBtn')}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Review modal */}
      <Modal visible={reviewOpen} animationType="slide" transparent onRequestClose={() => setReviewOpen(false)}>

            <Text style={styles.modalLabel}>{t('mobile.order.rating')}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setReviewRating(n)}>
                  <Star
                    color={n <= reviewRating ? COLORS.warning : COLORS.inputBorder}
                    fill={n <= reviewRating ? COLORS.warning : 'none'}
                    size={36}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>{t('mobile.order.commentOptional')}</Text>
            <TextInput
              style={styles.modalInput}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder={t('mobile.order.commentPlaceholder')}
              placeholderTextColor={COLORS.textFaint}
              multiline
              maxLength={500}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setReviewOpen(false)} disabled={reviewSubmitting}>
                <Text style={styles.modalCancelText}>{t('mobile.buttons.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleSubmitReview} disabled={reviewSubmitting}>
                {reviewSubmitting
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.modalSubmitText}>{t('mobile.order.submit')}</Text>}
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
  statusBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.warning, marginBottom: 20 },
  statusTextContainer: { marginLeft: 16, flex: 1 },
  statusTitle: { color: COLORS.warning, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  statusDesc: { color: '#f3f4f6', fontSize: 13 },
  card: { backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600', marginBottom: 16, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { color: COLORS.textMuted, fontSize: 15 },
  value: { color: COLORS.white, fontSize: 15, fontWeight: '500' },
  escrowBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(22, 163, 74, 0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.primary, marginBottom: 20 },
  escrowTextCol: { marginLeft: 16, flex: 1 },
  escrowTitle: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  escrowDesc: { color: '#e5e7eb', fontSize: 13, lineHeight: 20 },
  timeline: { backgroundColor: 'rgba(26, 46, 29, 0.4)', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  timelineItem: { flexDirection: 'row', paddingBottom: 24, borderLeftWidth: 2, borderColor: COLORS.primary, paddingLeft: 20, position: 'relative' },
  dot: { position: 'absolute', left: -7, top: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  timelineText: { color: COLORS.white, fontSize: 14, fontWeight: '500', top: -3 },
  timelinePending: { borderColor: COLORS.inputBorder },
  dotPending: { backgroundColor: COLORS.inputBorder },
  timelineTextPending: { color: COLORS.textFaint, fontSize: 14, fontWeight: '500', top: -3 },
  actionGroup: { gap: 12, marginBottom: 40 },
  primaryBtn: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 12, gap: 8 },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  secondaryBtn: { backgroundColor: 'rgba(251, 191, 36, 0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.5)' },
  secondaryBtnText: { color: COLORS.warning, fontSize: 16, fontWeight: 'bold' },
  rejectBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.5)' },
  rejectBtnText: { color: COLORS.danger, fontSize: 16, fontWeight: 'bold' },

  // Dispute modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: COLORS.bg, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  modalLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  reasonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, marginBottom: 6, borderRadius: 10, backgroundColor: 'rgba(26, 46, 29, 0.4)', borderWidth: 1, borderColor: COLORS.border },
  reasonRowActive: { backgroundColor: 'rgba(22, 163, 74, 0.15)', borderColor: COLORS.primary },
  reasonText: { color: '#e5e7eb', fontSize: 14 },
  reasonTextActive: { color: COLORS.primary, fontWeight: '600' },
  modalInput: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, borderWidth: 1, borderColor: COLORS.inputBorder, color: COLORS.white, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancel: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelText: { color: COLORS.textMuted, fontWeight: '600' },
  modalSubmit: { flex: 1, backgroundColor: COLORS.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  modalSubmitText: { color: COLORS.white, fontWeight: 'bold' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  proofThumb: { width: 100, height: 100, borderRadius: 12, marginRight: 8, backgroundColor: COLORS.surface },
});
