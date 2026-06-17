import { COLORS } from '../../constants/colors';
﻿import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Edit2, Trash2, Eye, EyeOff, CheckCircle } from 'lucide-react-native';
import { getMyListings, deleteListing, updateListingStatus } from '../../services/listingService';
import { useTranslation } from 'react-i18next';

export default function MyListingsScreen({ navigation }) {
  const { t } = useTranslation();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyListings = async () => {
    try {
      const response = await getMyListings();
      if (response.data && response.data.data) {
        setListings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch my listings', error);
      Alert.alert(t('common.error'), t('mobile.alerts.fetchListingsFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyListings();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyListings();
  }, []);

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteListing(id);
              setListings(prev => prev.filter(l => l._id !== id));
            } catch (error) {
              Alert.alert(t('common.error'), t('mobile.alerts.deleteListingFailed'));
            }
          }
        }
      ]
    );
  };

  // Toggles a listing between active / inactive. Web also supports "sold"
  // which we expose as a separate menu — keep this simple for the
  // single-tap hide/show UX.
  const toggleVisibility = async (item) => {
    const next = item.status === 'active' ? 'inactive' : 'active';
    try {
      await updateListingStatus(item._id, next);
      setListings(prev => prev.map(l => l._id === item._id ? { ...l, status: next } : l));
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('mobile.alerts.statusUpdateFailed'));
    }
  };

  const markSold = async (item) => {
    if (item.status === 'sold') return;
    Alert.alert(t('mobile.alerts.markSoldTitle'), t('mobile.alerts.markSoldMsg'), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Sold',
        onPress: async () => {
          try {
            await updateListingStatus(item._id, 'sold');
            setListings(prev => prev.map(l => l._id === item._id ? { ...l, status: 'sold' } : l));
          } catch (err) {
            Alert.alert(t('common.error'), err.response?.data?.message || t('mobile.alerts.markSoldFailed'));
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image
        source={item.images && item.images.length > 0 ? { uri: item.images[0] } : require('../../../assets/icon.png')}
        style={styles.image}
      />
      <View style={styles.cardBody}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.price}>₨ {item.price} {item.unit ? `/ ${item.unit}` : ''}</Text>
        <Text style={styles.status}>Status: {item.status}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('EditListing', { id: item._id })}
            accessibilityLabel="Edit listing"
          >
            <Edit2 color={COLORS.primary} size={20} />
          </TouchableOpacity>
          {item.status !== 'sold' && (
            <TouchableOpacity
              style={[styles.actionBtn, { marginLeft: 12 }]}
              onPress={() => toggleVisibility(item)}
              accessibilityLabel={item.status === 'active' ? 'Hide listing' : 'Show listing'}
            >
              {item.status === 'active'
                ? <EyeOff color={COLORS.warning} size={20} />
                : <Eye color={COLORS.textMuted} size={20} />}
            </TouchableOpacity>
          )}
          {item.status === 'active' && (
            <TouchableOpacity
              style={[styles.actionBtn, { marginLeft: 12 }]}
              onPress={() => markSold(item)}
              accessibilityLabel="Mark as sold"
            >
              <CheckCircle color={COLORS.info} size={20} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { marginLeft: 12 }]}
            onPress={() => handleDelete(item._id)}
            accessibilityLabel="Delete listing"
          >
            <Trash2 color={COLORS.danger} size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Listings</Text>
        <TouchableOpacity 
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateListing')}
        >
          <Text style={styles.createBtnText}>+ Create New</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : listings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>You haven't created any listings yet.</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  createBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  createBtnText: { color: COLORS.white, fontWeight: '600' },
  listContainer: { padding: 20, paddingTop: 0 },
  card: { flexDirection: 'row', backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  image: { width: 100, height: 100 },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center' },
  title: { color: COLORS.white, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  price: { color: COLORS.primaryLight, fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  status: { color: COLORS.textMuted, fontSize: 13, marginBottom: 8, textTransform: 'capitalize' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  actionBtn: { padding: 6, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 16 }
});
