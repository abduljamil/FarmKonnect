import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, StatusBar, Image, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Alert, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MessageCircle, MapPin, CheckCircle, Shield, Star, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getListingById } from '../../services/listingService';
import { startConversation } from '../../services/chatService';
import { getUserReviews } from '../../services/reviewService';
import { AuthContext } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen({ navigation, route }) {
  const { id } = route.params || {};
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);

  // Seller reviews modal — fetched on demand when the user taps the star
  // row. Matches web's ReviewsModal behavior.
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const openReviews = async () => {
    if (!listing?.createdBy?._id) return;
    setReviewsOpen(true);
    setReviewsLoading(true);
    try {
      const res = await getUserReviews(listing.createdBy._id);
      setReviews(res.data?.data || []);
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    const fetchListingDetail = async () => {
      try {
        if (id) {
          const response = await getListingById(id);
          if (response.data && response.data.data) {
            setListing(response.data.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch listing detail', error);
      } finally {
        setLoading(false);
      }
    };
    fetchListingDetail();
  }, [id]);

  const currentUserId = (user?._id || user?.id)?.toString();
  const sellerId = listing?.createdBy?._id?.toString();
  const isOwnListing = currentUserId && sellerId && currentUserId === sellerId;

  const handleStartChat = async () => {
    if (!listing?.createdBy?._id) return;
    if (isOwnListing) {
      Alert.alert(t('common.error'), t('listingDetails.cannotMessageSelf'));
      return;
    }
    try {
      const response = await startConversation(listing._id, listing.createdBy._id);
      const conversationId = response.data?.data?._id;
      if (conversationId) {
        navigation.navigate('ChatScreen', {
          conversationId,
          name: listing.createdBy.name,
          avatar: listing.createdBy.avatar || null,
          otherUserId: listing.createdBy._id,
        });
      }
    } catch (error) {
      console.error('Error starting chat', error);
      Alert.alert(t('common.error'), t('errors.somethingWrong'));
    }
  };

  const handleBuy = () => {
    if (isOwnListing) {
      Alert.alert(t('common.error'), t('listingDetails.cannotBuyOwn'));
      return;
    }
    if (listing.status !== 'active') {
      Alert.alert(t('common.error'),
        listing.status === 'sold' ? t('listingDetails.soldMessage') : t('listingDetails.inactiveMessage'));
      return;
    }
    navigation.navigate('CreateTransaction', { listingId: listing._id, listing });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#16a34a" />
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#fff' }}>{t('errors.notFound')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#16a34a' }}>{t('common.back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const sellerName = listing.createdBy?.name || t('common.unknown');
  const sellerJoined = new Date(listing.createdBy?.createdAt || Date.now()).getFullYear();
  const sellerRating = listing.createdBy?.rating || 0;
  const images = listing.images && listing.images.length > 0 ? listing.images : [];

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {images.length > 0 ? (
            <>
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  setImageIndex(Math.round(e.nativeEvent.contentOffset.x / width));
                }}
                keyExtractor={(uri, idx) => `${uri}-${idx}`}
                renderItem={({ item }) => (
                  <Image source={{ uri: item }} style={[styles.image, { width }]} />
                )}
              />
              {images.length > 1 && (
                <View style={styles.imageDots}>
                  {images.map((_, idx) => (
                    <View
                      key={idx}
                      style={[styles.imageDot, idx === imageIndex && styles.imageDotActive]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <Image source={require('../../../assets/icon.png')} style={styles.image} />
          )}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{listing.title}</Text>
            <Text style={styles.price}>₨ {listing.price} {listing.unit ? `/ ${listing.unit}` : ''}</Text>
            <View style={styles.locationRow}>
              <MapPin color="#16a34a" size={16} />
              <Text style={styles.locationText}>{listing.location}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.sellerCard} onPress={openReviews} activeOpacity={0.8}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{sellerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>
                {sellerName} {listing.createdBy?.isEmailVerified && <CheckCircle color="#16a34a" size={14} />}
              </Text>
              <Text style={styles.sellerMeta}>
                {t('profile.memberSince')} {sellerJoined} • ⭐ {sellerRating}
                {listing.createdBy?.rating?.count > 0 ? ` (${listing.createdBy.rating.count})` : ''}
              </Text>
            </View>
            <Text style={styles.reviewsLink}>{t('profile.reviews')} →</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('listingDetails.description')}</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.trustBadge}>
              <Shield color="#16a34a" size={24} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.trustTitle}>{t('landing.hero.securePayments')}</Text>
                <Text style={styles.trustDesc}>{t('landing.features.securePayments.description')}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Reviews modal */}
      <Modal visible={reviewsOpen} animationType="slide" transparent onRequestClose={() => setReviewsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{sellerName}'s reviews</Text>
              <TouchableOpacity onPress={() => setReviewsOpen(false)}>
                <X color="#a3a3a3" size={22} />
              </TouchableOpacity>
            </View>
            {reviewsLoading ? (
              <ActivityIndicator color="#16a34a" style={{ marginVertical: 24 }} />
            ) : reviews.length === 0 ? (
              <Text style={styles.emptyReview}>{t('listingDetails.noReviews')}</Text>
            ) : (
              <FlatList
                data={reviews}
                keyExtractor={(r) => r._id}
                style={{ maxHeight: 400 }}
                renderItem={({ item }) => (
                  <View style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewerName}>{item.reviewer?.name || 'User'}</Text>
                      <View style={styles.starRow}>
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} size={12} color={n <= item.rating ? '#fbbf24' : '#374151'} fill={n <= item.rating ? '#fbbf24' : 'none'} />
                        ))}
                      </View>
                    </View>
                    {item.comment ? <Text style={styles.reviewComment}>{item.comment}</Text> : null}
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        {isOwnListing ? (
          <TouchableOpacity
            style={[styles.buyBtn, { flex: 1, backgroundColor: 'rgba(26, 46, 29, 0.8)', borderWidth: 1, borderColor: '#224026' }]}
            onPress={() => navigation.navigate('EditListing', { id: listing._id })}
          >
            <Text style={styles.buyText}>{t('common.edit')}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.chatBtn} onPress={handleStartChat}>
              <MessageCircle color="#fff" size={20} />
              <Text style={styles.chatText}>{t('listingDetails.contactSeller')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buyBtn} onPress={handleBuy}>
              <Text style={styles.buyText}>{t('listingDetails.buyNow')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  imageContainer: { width: '100%', height: 300, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imageDots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  imageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  imageDotActive: { backgroundColor: '#fff', width: 16 },
  backBtn: { position: 'absolute', top: 40, left: 16, width: 40, height: 40, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  price: { fontSize: 22, fontWeight: 'bold', color: '#4ade80', marginBottom: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { color: '#a3a3a3', fontSize: 14 },
  sellerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 46, 29, 0.4)', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#224026' },
  reviewsLink: { color: '#16a34a', fontSize: 12, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#0f1a12', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#224026' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  emptyReview: { color: '#a3a3a3', textAlign: 'center', paddingVertical: 24 },
  reviewItem: { paddingVertical: 12, borderTopWidth: 1, borderColor: '#224026' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewerName: { color: '#fff', fontWeight: '600', fontSize: 14 },
  starRow: { flexDirection: 'row', gap: 2 },
  reviewComment: { color: '#d4d4d4', fontSize: 13, lineHeight: 18 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  sellerInfo: { marginLeft: 16, flex: 1 },
  sellerName: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  sellerMeta: { color: '#a3a3a3', fontSize: 13 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 },
  description: { color: '#d4d4d4', fontSize: 15, lineHeight: 24 },
  trustBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(22, 163, 74, 0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#16a34a' },
  trustTitle: { color: '#16a34a', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  trustDesc: { color: '#a3a3a3', fontSize: 13 },
  footer: { flexDirection: 'row', padding: 16, backgroundColor: '#0a110c', borderTopWidth: 1, borderColor: '#224026', paddingBottom: 32 },
  chatBtn: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(26, 46, 29, 0.8)', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#224026' },
  chatText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  buyBtn: { flex: 2, backgroundColor: '#16a34a', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  buyText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});
