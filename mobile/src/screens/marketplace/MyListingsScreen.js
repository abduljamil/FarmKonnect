import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Edit2, Trash2 } from 'lucide-react-native';
import { getMyListings, deleteListing } from '../../services/listingService';

export default function MyListingsScreen({ navigation }) {
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
      Alert.alert('Error', 'Failed to fetch your listings');
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
              Alert.alert('Error', 'Failed to delete listing');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image 
        source={{ uri: item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/100' }} 
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
          >
            <Edit2 color="#16a34a" size={20} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { marginLeft: 12 }]}
            onPress={() => handleDelete(item._id)}
          >
            <Trash2 color="#ef4444" size={20} />
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
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 40 }} />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  createBtn: { backgroundColor: '#16a34a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  createBtnText: { color: '#fff', fontWeight: '600' },
  listContainer: { padding: 20, paddingTop: 0 },
  card: { flexDirection: 'row', backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#224026' },
  image: { width: 100, height: 100 },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  price: { color: '#4ade80', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  status: { color: '#a3a3a3', fontSize: 13, marginBottom: 8, textTransform: 'capitalize' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: -20 },
  actionBtn: { padding: 6, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#a3a3a3', fontSize: 16 }
});
