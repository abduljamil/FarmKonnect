import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, Image, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { ArrowLeft, MessageCircle, MapPin, CheckCircle, Shield } from 'lucide-react-native';
import { getListingById } from '../../services/listingService';
import { startConversation } from '../../services/chatService';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen({ navigation, route }) {
  const { id } = route.params || {};
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handleStartChat = async () => {
    if (!listing?.createdBy?._id) return;
    try {
      // Create or get existing conversation
      const response = await startConversation(listing._id, listing.createdBy._id);
      const conversationId = response.data?.data?._id;
      if (conversationId) {
        navigation.navigate('ChatScreen', { 
          conversationId, 
          name: listing.createdBy.name, 
          avatar: `https://ui-avatars.com/api/?name=${listing.createdBy.name}` 
        });
      }
    } catch (error) {
      console.error('Error starting chat', error);
      Alert.alert('Error', 'Failed to start chat conversation');
    }
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
        <Text style={{ color: '#fff' }}>Listing not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#16a34a' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const sellerName = listing.createdBy?.name || 'Unknown Seller';
  const sellerJoined = new Date(listing.createdBy?.createdAt || Date.now()).getFullYear();
  const sellerRating = listing.createdBy?.rating || 0;
  const imageUri = listing.images && listing.images.length > 0 ? listing.images[0] : 'https://via.placeholder.com/400';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} />
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

          <View style={styles.sellerCard}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{sellerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>
                {sellerName} {listing.createdBy?.isEmailVerified && <CheckCircle color="#16a34a" size={14} />}
              </Text>
              <Text style={styles.sellerMeta}>Member since {sellerJoined} • ⭐ {sellerRating}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>
          
          <View style={styles.section}>
            <View style={styles.trustBadge}>
              <Shield color="#16a34a" size={24} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.trustTitle}>Secure Transaction</Text>
                <Text style={styles.trustDesc}>Payments are held safely until you receive the item.</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.chatBtn} onPress={handleStartChat}>
          <MessageCircle color="#fff" size={20} />
          <Text style={styles.chatText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buyBtn} onPress={() => navigation.navigate('CreateTransaction', { listingId: listing._id, listing })}>
          <Text style={styles.buyText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  imageContainer: { width: '100%', height: 300, position: 'relative' },
  image: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 40, left: 16, width: 40, height: 40, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  price: { fontSize: 22, fontWeight: 'bold', color: '#4ade80', marginBottom: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { color: '#a3a3a3', fontSize: 14 },
  sellerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 46, 29, 0.4)', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#224026' },
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
