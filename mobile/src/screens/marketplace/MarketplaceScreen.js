import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, StatusBar, TextInput, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, MapPin, Heart } from 'lucide-react-native';
import { getListings } from '../../services/listingService';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';

const { width } = Dimensions.get('window');

const categoriesList = [
  { label: 'All Items', value: '' },
  { label: 'Crops', value: 'crops' },
  { label: 'Livestock', value: 'livestock' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Fertilizers', value: 'fertilizers' },
  { label: 'Seeds', value: 'seeds' },
  { label: 'Other', value: 'other' }
];

export default function MarketplaceScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchListings = async (pageNum = 1, shouldAppend = false) => {
    try {
      const params = { page: pageNum, limit: 12 };
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.category = selectedCategory;

      const response = await getListings(params);
      if (response.data && response.data.success) {
        const newListings = response.data.data;
        const pagination = response.data.pagination;
        
        if (shouldAppend) {
          setListings(prev => [...prev, ...newListings]);
        } else {
          setListings(newListings);
        }
        
        setHasMore(pagination.page < pagination.pages);
        setPage(pagination.page);
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const delayDebounce = setTimeout(() => {
      fetchListings(1, false);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchListings(1, false);
  }, [searchQuery, selectedCategory]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    fetchListings(page + 1, true);
  };

  const renderListing = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('ListingDetail', { id: item._id })}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/150' }} 
          style={styles.image} 
        />
        <TouchableOpacity style={styles.favoriteBtn}>
          <Heart color={'#fff'} fill={'none'} size={18} />
        </TouchableOpacity>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.price}>₨ {item.price} {item.unit ? `/ ${item.unit}` : ''}</Text>
        <View style={styles.locationRow}>
          <MapPin color="#16a34a" size={14} />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <AnimatedBlobs />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Search color="#a3a3a3" size={20} />
            <TextInput 
              placeholder="Search crops, seeds, tools..." 
              placeholderTextColor="#a3a3a3" 
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Filter color="#fff" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, paddingHorizontal: 20 }}>
          <View style={styles.categoriesRow}>
            {categoriesList.map((cat, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={[styles.categoryBtn, selectedCategory === cat.value && styles.categoryActive]}
                onPress={() => setSelectedCategory(cat.value)}
              >
                <Text style={[styles.categoryText, selectedCategory === cat.value && styles.categoryTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={listings}
          renderItem={renderListing}
          keyExtractor={(item) => item?._id || Math.random().toString()}
          numColumns={2}
          contentContainerStyle={styles.container}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: '#a3a3a3' }}>No listings found.</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#16a34a" style={{ marginVertical: 16 }} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  header: { padding: 20, paddingTop: 10, zIndex: 1 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  searchRow: { flexDirection: 'row', gap: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 12, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: '#224026' },
  searchInput: { flex: 1, marginLeft: 12, color: '#fff', fontSize: 16 },
  filterBtn: { width: 50, height: 50, backgroundColor: '#16a34a', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingTop: 0 },
  categoriesRow: { flexDirection: 'row', marginBottom: 24, paddingVertical: 4 },
  categoryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(26, 46, 29, 0.8)', marginRight: 12, borderWidth: 1, borderColor: '#224026' },
  categoryActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  categoryText: { color: '#a3a3a3', fontSize: 14, fontWeight: '600' },
  categoryTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: (width - 56) / 2, backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#224026' },
  imageContainer: { width: '100%', height: 140, position: 'relative' },
  image: { width: '100%', height: '100%' },
  favoriteBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: 20 },
  cardBody: { padding: 12 },
  title: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  price: { color: '#4ade80', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { color: '#a3a3a3', fontSize: 12, fontWeight: '500' },
  columnWrapper: { justifyContent: 'space-between' }
});
